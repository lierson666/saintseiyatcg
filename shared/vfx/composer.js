// Animation Composer: toca uma composição (camadas numa linha do tempo) no palco. Só apresentação: nunca segura a fila
// do director nem muda a partida; o resultado da habilidade continua vindo da Engine 3.0.
import {LOTTIES, asComposition, isNewFx, planLayers, profileFor, MAX_COMPOSITION_MS} from './presets.js';

const SHADERS = () => import(new URL('./shader-fx.js?v=20261104-vfx1', import.meta.url).href);
let dotLottie = null;
const loadLottie = async () => {
  if (dotLottie) return dotLottie;
  const mod = await import(new URL('../vendor/dotlottie/dotlottie.js', import.meta.url).href);
  mod.DotLottie.setWasmUrl(new URL('../vendor/dotlottie/dotlottie-player.wasm', import.meta.url).href);
  return (dotLottie = mod.DotLottie);
};

// `pixel`: o createPixelFx existente (Sprite Fusion e catálogo). `stage`: o palco, para câmera e camadas. Falha de uma camada não derruba as outras.
export function createComposer({stage, pixel, studio, quality = () => 'high', reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches, volume = () => 1, targetOf = rect => {
  if (!rect) return null;
  return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('[data-live-card], .dcard') || null;
}}) {
  const live = new Set(); // o que precisa ser limpo: timers, canvas, animações
  const overlay = (rect, alvo) => {
    const s = stage.getBoundingClientRect(), r = alvo === 'mesa' || !rect ? s : rect;
    const el = document.createElement('div');
    el.className = 'vfx-overlay';
    el.style.cssText = `position:absolute;z-index:40;pointer-events:none;left:${r.left - s.left}px;top:${r.top - s.top}px;width:${r.width}px;height:${r.height}px`;
    stage.append(el);
    return el;
  };
  const after = (ms, fn) => { const id = setTimeout(() => { live.delete(stop); fn(); }, ms); const stop = () => clearTimeout(id); live.add(stop); };

  const runners = {
    carta(l, rect) {
      const el = targetOf(rect);
      if (!el) return;
      const dx = l.x ?? 0, dy = l.y ?? 0, sc = l.escala ?? 1, rot = l.rotacao ?? 0;
      const a = el.animate([{transform: 'none', opacity: 1}, {transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(${rot}deg)`, opacity: l.opacidade ?? 1, offset: .5}, {transform: 'none', opacity: 1}], {duration: l.duracao, easing: l.easing || 'ease-in-out'});
      live.add(() => a.cancel());
      a.onfinish = () => a.cancel();
    },
    camera(l) {
      const a = stage.animate([{transform: 'none'}, {transform: `translate(${l.x ?? 0}px,${l.y ?? 0}px) scale(${l.escala ?? 1.08})`, offset: .5}, {transform: 'none'}], {duration: l.duracao, easing: l.easing || 'ease-in-out'});
      live.add(() => a.cancel());
      a.onfinish = () => a.cancel();
    },
    async shader(l, rect, profile) {
      const box = overlay(rect, l.alvo);
      const r = box.getBoundingClientRect(), width = Math.min(profile.largura, Math.max(64, Math.round(r.width))), height = Math.max(64, Math.round(width * (r.height / (r.width || 1))));
      let layer = null, raf = 0, done = false;
      const clean = () => { done = true; cancelAnimationFrame(raf); layer?.dispose(); box.remove(); live.delete(clean); };
      live.add(clean);
      after(l.duracao, clean);
      try {
        const {createShaderLayer} = await SHADERS();
        layer = await createShaderLayer({shader: l.shader, width, height, forca: l.forca ?? .7, velocidade: l.velocidade ?? 1, cor: l.cor, profile});
        if (done) return layer.dispose();
        layer.canvas.style.cssText = 'width:100%;height:100%;display:block;mix-blend-mode:screen';
        box.append(layer.canvas);
        const frame = () => { if (done) return; layer.draw(); raf = requestAnimationFrame(frame); };
        frame();
      } catch (error) { console.debug('VFX: camada de shader ignorada.', error); clean(); }
    },
    particulas(l, rect) { pixel?.play(l.efeito, rect, {color: l.cor, strength: l.escala ?? 1, power: .5}); },
    async lottie(l, rect) {
      const def = LOTTIES.find(x => x.id === l.lottie);
      if (!def) return;
      const box = overlay(rect, l.alvo), canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      canvas.style.cssText = 'width:100%;height:100%;display:block;object-fit:contain';
      box.append(canvas);
      let player = null;
      const clean = () => { player?.destroy(); box.remove(); live.delete(clean); };
      live.add(clean);
      after(l.duracao, clean);
      try {
        const DotLottie = await loadLottie();
        player = new DotLottie({canvas, src: new URL(`/${def.arquivo}`, location.href).href, loop: l.loop ?? true, autoplay: true, speed: l.velocidade ?? 1});
      } catch (error) { console.debug('VFX: camada Lottie ignorada.', error); clean(); }
    },
    audio(l) {
      if (!l.som) return;
      const a = new Audio(new URL(`/${l.som}`, location.href).href);
      a.volume = Math.min(1, (l.volume ?? 1) * volume());
      a.play().catch(() => {}); // navegador sem gesto do usuário: segue em silêncio
      live.add(() => a.pause());
    },
    ui(l, rect) {
      const box = overlay(rect, l.alvo);
      box.style.background = l.cor || '#ffffff';
      const a = box.animate([{opacity: 0}, {opacity: l.opacidade ?? .35, offset: .3}, {opacity: 0}], {duration: l.duracao, easing: 'ease-out'});
      const clean = () => { a.cancel(); box.remove(); live.delete(clean); };
      a.onfinish = clean;
      live.add(clean);
    },
  };

  function stop() { for (const fn of [...live]) fn(); live.clear(); }
  // `value`: 'comp:x', 'shader:x', 'lottie:x' ou a própria composição (prévia antes de salvar). Devolve a duração, 0 se nada tocou.
  function play(value, rect, {plan = null} = {}) {
    const comp = typeof value === 'object' ? value : asComposition(value, studio());
    if (!comp) return 0;
    const isReduced = reduced(), profile = profileFor(quality(), {reduced: isReduced});
    const layers = plan || planLayers(comp, profile, {reduced: isReduced});
    for (const l of layers) after(l.inicio, () => { Promise.resolve(runners[l.tipo]?.(l, rect, profile)).catch(error => console.debug(error)); });
    return layers.length ? Math.min(MAX_COMPOSITION_MS, Math.max(...layers.map(l => l.inicio + l.duracao))) : 0;
  }
  return {play, stop};
}

// Mesmo jeito do createPixelFx para o director: valor novo vai para o Composer, o resto segue para o Sprite Fusion como antes.
export function withCompositions(pixel, composer) {
  return new Proxy(pixel, {get(target, key) {
    if (key === 'play') return (value, rect, opts) => (isNewFx(value) ? composer().play(value, rect) : target.play(value, rect, opts));
    if (key === 'clear') return () => { composer().stop(); return target.clear?.(); };
    return target[key];
  }});
}
