// Golpes em pixel art (Sprite Fusion, MIT: vendor/sprite-fusion). Só apresentação, como scene.js: nunca muda estado nem
// segura a fila do director. Dois canvas sobre os VFX WebGL: cor e luz (somada à tela). Sem efeito vivo, ficam ocultos e nada roda.
const load = name => import(`./vendor/sprite-fusion/${name}.js`);
const WORLD_PX = 2; // nos efeitos, 1 pixel de arte = 2 unidades de mundo
export const MAX_LIFE = 3; // efeito que passar disso sai da tela: a mesa não pode ficar coberta
const FADE = .6; // os de clima (chuva, neve...) nunca terminam sozinhos: saem aos poucos no fim do tempo

// Efeitos à escolha no Star Hill e no Card Forge (data/card-animations.json).
export const EFFECTS = [['slash', 'Corte'], ['impact', 'Impacto'], ['ice', 'Gelo'], ['fire', 'Fogo'], ['lightning', 'Raio'], ['poison', 'Veneno'], ['light', 'Luz'], ['dark', 'Trevas'], ['explosion', 'Explosão'], ['energy', 'Energia'], ['shield', 'Escudo'], ['heal', 'Cura'], ['power', 'Aura'],
  ['muzzle', 'Disparo'], ['blood', 'Sangue'], ['pickup', 'Coleta'], ['dash', 'Investida'], ['blink', 'Teleporte'], ['sparkle', 'Brilho'], ['rain', 'Chuva'], ['snow', 'Neve'], ['fog', 'Névoa'], ['embers', 'Brasas'], ['fireflies', 'Vaga-lumes'], ['leaves', 'Folhas'], ['bubbles', 'Bolhas']];
// Momentos da carta, com as mesmas chaves dos sons quando existem. O texto vai no Star Hill e no Card Forge.
export const ANIM_MOMENTS = [['golpe', 'Golpe do Strike', 'O Strike resolveu'], ['impacto', 'Impacto em Devotee', 'Strike acertou um Devotee'], ['impacto_deus', 'Impacto no Deus', 'Strike acertou o Deus'], ['strike', 'Ao receber Strike', 'Foi atingido por um Strike'],
  ['carga', 'Carga do golpe', 'Cosmo sobe antes do impacto'], ['declarar', 'Ao declarar ataque', 'Devotee declarou o Strike'], ['cast', 'Ao conjurar', 'A carta foi jogada'], ['entrada', 'Entrada no campo', 'Devotee ou Equipment entrou no campo'], ['retorno', 'Volta do Tartarus', 'Voltou ao campo ou à mão'],
  ['morte', 'Ao morrer', 'Foi derrotado'], ['dano', 'Dano em Devotee', 'Devotee perdeu HP'], ['soul', 'Dano no Soul', 'O Deus perdeu Soul'], ['escudo', 'Dano prevenido', 'Dano foi prevenido'], ['cura', 'Ganho de Soul', 'O Deus ganhou Soul'],
  ['habilidade', 'Habilidade', 'Gatilho ou habilidade resolveu'], ['ultimate', 'Ultimate', 'A Ultimate resolveu'], ['poder_divino', 'Poder Divino', 'God usou o Poder Divino'], ['poder_dominio', 'Poder do Domain', 'Domain usou o poder'], ['awaken', 'Awaken', 'God despertou']];
// Quem manda: linha da habilidade, carta, facção e o padrão do jogo; false é "sem animação" de propósito. `own`: ignora o padrão do jogo.
export function animFor(data, kind, {id, faction, line = null, own = false} = {}) {
  const layers = [data?.[id], faction && data?.[`faccao-${faction}`], !own && data?.padrao];
  if (kind === 'habilidade' && line != null) { const v = layers[0]?.linhas?.[line]; if (v != null) return v; }
  for (const layer of layers) { const v = layer?.[kind]; if (v != null) return v; }
  return null;
}
export const ELEMENT_COLOR = {ice: '#a6ecff', fire: '#ff8a2a', lightning: '#ffe26b', poison: '#9be36b', light: '#ffe7a3', dark: '#a064ff', explosion: '#ffb15a', pickup: '#8cff7a', dash: '#5eb0ff', blink: '#a064ff'};

// Cor do tema ('#rrggbb' ou 'rgb(r, g, b)') → tons do mais claro ao mais escuro, no formato dos efeitos (RGBA em Uint32).
const channels = color => {
  const m = /^#([\da-f]{6})$/i.exec(color), parts = m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : String(color).match(/\d+/g)?.slice(0, 3).map(Number);
  return parts?.length === 3 ? parts : [255, 224, 160];
};
const TONES = [1, .7, .4, 0, -.3, -.55, -.75, -.88];
const toned = (color, k) => channels(color).map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
export const rampOf = (color, n = 7) => TONES.slice(0, n).map(k => { const [r, g, b] = toned(color, k); return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; });
const paletteOf = (color, n = 8) => TONES.slice(0, n).map(k => `#${toned(color, k).map(v => v.toString(16).padStart(2, '0')).join('')}`);

const around = g => ({x: g.x - g.w * .9, y: g.top - g.h * .2, w: g.w * 1.8, h: g.h * 1.2}); // clima: em volta da carta, nunca a mesa inteira
// Efeito + opções, em coordenadas de mundo. `g`: {x, y, top, bottom, w, h, from: [x, y], s (escala), color, power, seed}. Puro, para o teste rodar sem navegador.
export const RECIPES = {
  slash: g => ['slash', {x: g.x, y: g.y, facing: g.from && g.from[0] > g.x ? -1 : 1, size: g.s * 1.1 * (1 + g.power * .5), sparks: 10 + Math.round(g.power * 14), ramp: rampOf(g.color), sparkRamp: rampOf(g.color).slice(1, 5)}],
  impact: g => ['impact', {x: g.x, y: g.y, angle: g.from ? Math.atan2(g.y - g.from[1], g.x - g.from[0]) : -Math.PI / 2, size: g.s * 1.2 * (g.strength ?? 1), ramp: rampOf(g.color, 6)}],
  ice: g => ['ice', {kind: 'nova', x: g.x, ground: g.bottom, size: g.s * .7, reach: 150 * g.s, charge: .08, hold: .12}],
  // As chamas sobem da borda de cima da silhueta: usar a metade de baixo da carta faz o fogo passar por cima da arte.
  fire: g => { const w = Math.round(g.w / WORLD_PX), h = Math.round(g.h / 2 / WORLD_PX), data = new Uint32Array(w * h).fill(0xffffffff), x = Math.round((g.x - g.w / 2) / WORLD_PX), y = Math.round(g.y / WORLD_PX);
    return ['fire', {actor: {feet: () => [g.x, g.bottom], silhouette: () => ({x, y, w, h, data})}, size: g.s, duration: .8}]; },
  lightning: g => ['lightning', {kind: 'impact', x: g.x, y: g.y, size: g.s * .9}],
  poison: g => ['poison', {kind: 'cloud', x: g.x, ground: g.bottom, from: g.from || undefined, size: g.s * .7}], // o frasco voa do atacante
  light: g => ['holy-light', {x: g.x, ground: g.bottom, hold: .25, width: 13 * g.s * .8}],
  dark: g => ['black-hole', {x: g.x, y: g.y, radius: 20 * g.s, life: .45, pull: .4}],
  explosion: g => ['explosion', {x: g.x, ground: g.bottom, size: g.s * .55, chunks: 6}],
  energy: g => ['energy', {kind: 'beam', x: g.from?.[0] ?? g.x, y: g.from?.[1] ?? g.y, to: [g.x, g.y], charge: .02, hold: .22, width: 5 * g.s * (1 + g.power * .8), colors: rampOf(g.color, 7)}],
  shield: g => ['shield', {x: g.x, y: g.bottom, radius: 38 * g.s, hold: .7, colors: paletteOf(g.color, 7)}],
  heal: g => ['heal', {x: g.x, y: g.bottom, count: 8}],
  power: g => ['power-up', {x: g.x, y: g.bottom, size: g.s * .8, palette: paletteOf(g.color, 7)}],
  muzzle: g => { const [x, y] = g.from || [g.x - g.w, g.y]; return ['muzzle-flash', {x, y, angle: Math.atan2(g.y - y, g.x - x), size: g.s, casing: false, ground: g.bottom}]; },
  blood: g => ['blood', {x: g.x, y: g.y, angle: g.from ? Math.atan2(g.y - g.from[1], g.x - g.from[0]) : undefined, size: g.s * .8, stainLife: .6, ground: g.bottom}],
  pickup: g => ['pickup', {x: g.x, y: g.y, item: 'orb', palette: paletteOf(g.color, 6), wait: .7, ground: g.bottom}],
  dash: g => { const x = g.from?.[0] ?? g.x - g.w; return ['movement', {kind: 'dash', x, y: g.bottom, ground: g.bottom, facing: g.x < x ? -1 : 1, distance: Math.max(g.w, Math.abs(g.x - x)), colors: rampOf(g.color, 7)}]; },
  blink: g => ['movement', {kind: 'blink', x: g.from?.[0] ?? g.x - g.w, y: g.bottom, to: g.x, ground: g.bottom, colors: rampOf(g.color, 7)}],
  sparkle: g => ['sparkle', {x: g.x, y: g.y, size: g.s * .9}],
  rain: g => ['rain', {area: around(g), ground: g.bottom}],
  snow: g => ['snow', {area: around(g), ground: g.bottom}],
  fog: g => ['fog', {area: around(g), density: 2}],
  embers: g => ['embers', {area: around(g), density: 6, heat: false}],
  fireflies: g => ['fireflies', {area: around(g), ground: g.bottom, density: 3, grass: false}],
  leaves: g => ['falling-leaves', {area: around(g), ground: g.bottom, leaves: 20, litter: false}],
  bubbles: g => ['bubbles', {area: around(g), ground: g.bottom, density: 3, surface: false, caustics: false, tint: false}],
};
// Tipos de combate do gerador: cada um é uma composição das receitas acima, com o código real do Sprite Fusion.
// `cor`: a receita aceita a cor escolhida. `noAlvo`: ignora o atacante. `vida`: corta em segundos o que deixa fumaça. `opts`: opções do próprio efeito (ver vendor/sprite-fusion).
export const COMBAT = {
  'physical-hit': {nome: 'Physical Hit', tipo: 'impacto', camadas: [{base: 'impact', cor: true}]},
  'energy-hit': {nome: 'Energy Hit', tipo: 'energia', camadas: [{base: 'impact', cor: true}, {base: 'lightning', escala: .8, atraso: 30, vida: .9}]},
  slash: {nome: 'Slash', tipo: 'golpe', camadas: [{base: 'slash', cor: true}]},
  projectile: {nome: 'Projectile', tipo: 'projetil', camadas: [{base: 'energy', cor: true, opts: {kind: 'bolt'}}, {base: 'impact', cor: true, atraso: 260}]},
  explosion: {nome: 'Explosion', tipo: 'explosao', camadas: [{base: 'explosion', vida: 1.4}]},
  shockwave: {nome: 'Shockwave', tipo: 'impacto', camadas: [{base: 'explosion', vida: .7, opts: {fire: 0, earth: 0, chunks: 0, scorch: 0, shockwave: 170}}, {base: 'impact', cor: true, escala: .7}]},
  'cosmo-burst': {nome: 'Cosmo Burst', tipo: 'energia', camadas: [{base: 'power', cor: true, vida: 1.4}, {base: 'impact', cor: true, escala: .8, atraso: 140}]},
  aura: {nome: 'Aura', tipo: 'aura', camadas: [{base: 'energy', cor: true, noAlvo: true, opts: {kind: 'charge', hold: .5}}]},
  shield: {nome: 'Shield', tipo: 'escudo', camadas: [{base: 'shield', cor: true}]},
  block: {nome: 'Block', tipo: 'escudo', camadas: [{base: 'shield', cor: true, opts: {hold: .25}}, {base: 'impact', cor: true, escala: .8, opts: {kind: 'ricochet'}}]},
  dodge: {nome: 'Dodge', tipo: 'outro', camadas: [{base: 'dash', cor: true, noAlvo: true}]},
  pierce: {nome: 'Pierce', tipo: 'golpe', camadas: [{base: 'energy', cor: true, opts: {hold: .08, width: 2}}, {base: 'impact', cor: true, atraso: 60}]},
  defeat: {nome: 'Defeat', tipo: 'trevas', camadas: [{base: 'dark', vida: 1.3}, {base: 'explosion', escala: .7, atraso: 280, vida: 1}]},
  'divine-impact': {nome: 'Divine Impact', tipo: 'luz', camadas: [{base: 'light', vida: 1.3}, {base: 'impact', cor: true, escala: 1.4, atraso: 60}]},
};
// Receita salva → efeitos a tocar. `at(k)`: geometria na escala k. Puro, para o teste rodar sem navegador.
export function combatLayers(r, at) {
  return COMBAT[r.tipo].camadas.flatMap((c, i) => {
    const own = r.camadas?.[i] ?? {};
    if (own.ligada === false) return [];
    let g = at((c.escala ?? 1) * (r.escala ?? 1));
    if (r.ancora === 'origem' && g.from) { const dx = g.from[0] - g.x, dy = g.from[1] - g.y; g = {...g, x: g.from[0], y: g.from[1], top: g.top + dy, bottom: g.bottom + dy, from: [g.x, g.y], dx}; }
    if (c.noAlvo) g = {...g, from: null};
    const [file, options] = RECIPES[c.base](g);
    return [{file, options: {...options, ...c.opts}, atraso: own.atraso ?? c.atraso ?? 0, vida: c.vida ?? MAX_LIFE}];
  });
}
// Duração real da receita, rodando o efeito sem desenhar. O jogo corta em MAX_LIFE.
export async function measureCombat(r) {
  const at = k => ({x: 300, y: 300, top: 200, bottom: 400, w: 200, h: 200, from: [100, 100], s: k, size: k, color: r.cor || '#ffe7a3', power: 0});
  let longest = 0;
  for (const {file, options, atraso, vida} of combatLayers(r, at)) {
    const m = await load(file), fx = m.default({...options, seed: 1});
    let t = 0;
    while (t < vida && !fx.done()) { fx.update(1 / 60); t += 1 / 60; }
    longest = Math.max(longest, atraso / 1000 + t);
  }
  return Math.round(longest / (r.velocidade || 1) * 1000);
}

// Efeito importado (data/vfx-catalog.json): sprite sheet desenhado na mesma camada dos outros. `s`: {px, sw, w, h, cols, quadros, fps, loop}.
// g.ancora (ajuste do Criador): sem valor, no alvo; "origem", sai do atacante; "viagem", vai do atacante ao alvo apontando para ele (a folha olha para a direita);
// "ambos", sai do atacante apontando para o alvo, chega nele nos primeiros 40% da folha e o resto (a explosão) acontece no alvo.
const ARRIVE = .4;
export function sheetFx(s, g) {
  const scale = g.h / WORLD_PX * 1.35 * (g.size || 1) / Math.max(s.w, s.h), dw = Math.max(1, Math.round(s.w * scale)), dh = Math.max(1, Math.round(s.h * scale)), span = s.quadros / s.fps;
  const from = g.from && ['origem', 'viagem', 'ambos'].includes(g.ancora) ? g.from : null, travel = from && g.ancora !== 'origem';
  const angle = travel ? Math.atan2(g.y - from[1], g.x - from[0]) : 0, cos = Math.cos(angle), sin = Math.sin(angle), reach = Math.ceil(Math.hypot(dw, dh) / 2);
  let t = 0;
  const put = (f, at, v) => {
    const a = v >>> 24;
    if (!a) return;
    const d = f.color[at];
    if (a === 255 || !d) { f.color[at] = v; return; }
    const da = d >>> 24, oa = a + da * (255 - a) / 255, mix = (sh) => Math.round((((v >>> sh) & 255) * a + ((d >>> sh) & 255) * da * (255 - a) / 255) / oa);
    f.color[at] = ((Math.round(oa) << 24) | (mix(16) << 16) | (mix(8) << 8) | mix(0)) >>> 0;
  };
  return {
    update(dt) { t += dt; },
    done: () => !s.loop && t >= span,
    draw(f, layer) {
      if (layer !== 'front' || (!s.loop && t >= span)) return;
      const n = Math.floor(t * s.fps) % s.quadros, cx = (n % s.cols) * s.w, cy = Math.floor(n / s.cols) * s.h, k = travel ? Math.min(1, t / (span * (g.ancora === 'ambos' ? ARRIVE : 1))) : 0;
      const wx = (from ? from[0] + (g.x - from[0]) * k : g.x) / WORLD_PX, wy = (from ? from[1] + (g.y - from[1]) * k : g.y) / WORLD_PX, ox = f.ox || 0, oy = f.oy || 0;
      if (travel) {
        const mx = Math.round(wx) - ox, my = Math.round(wy) - oy;
        for (let y = Math.max(0, my - reach), yEnd = Math.min(f.h, my + reach); y < yEnd; y++) for (let x = Math.max(0, mx - reach), xEnd = Math.min(f.w, mx + reach); x < xEnd; x++) {
          const u = Math.floor(cos * (x - mx) + sin * (y - my) + dw / 2), v = Math.floor(-sin * (x - mx) + cos * (y - my) + dh / 2);
          if (u >= 0 && v >= 0 && u < dw && v < dh) put(f, y * f.w + x, s.px[(cy + Math.floor(v * s.h / dh)) * s.sw + cx + Math.floor(u * s.w / dw)]);
        }
        return;
      }
      const x0 = Math.round(wx - dw / 2), y0 = Math.round(wy - dh / 2);
      for (let y = Math.max(0, y0 - oy), yEnd = Math.min(f.h, y0 - oy + dh); y < yEnd; y++) {
        const sy = cy + Math.floor((y + oy - y0) * s.h / dh);
        for (let x = Math.max(0, x0 - ox), xEnd = Math.min(f.w, x0 - ox + dw); x < xEnd; x++) put(f, y * f.w + x, s.px[sy * s.sw + cx + Math.floor((x + ox - x0) * s.w / dw)]);
      }
    },
  };
}
const sheets = new Map();
const loadSheet = entry => {
  if (!sheets.has(entry.id)) sheets.set(entry.id, new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d', {willReadFrequently: true}); x.drawImage(img, 0, 0);
      resolve({...entry, sw: img.width, px: new Uint32Array(x.getImageData(0, 0, img.width, img.height).data.buffer)}); };
    img.onerror = reject;
    img.src = new URL(`./vfx/${entry.arquivo.split('/').pop()}`, import.meta.url).href;
  }));
  return sheets.get(entry.id);
};
export const catalogIndex = catalog => Object.fromEntries((catalog?.efeitos || []).map(e => [e.id, e]));

const FILES = [...new Set(Object.values(RECIPES).map(r => r({x: 0, y: 0, top: 0, bottom: 0, w: 1, h: 1, s: 1, power: 0, color: '#fff'})[0]))];
export const effectFiles = () => FILES;

export function createPixelFx(stage, {flashes = () => true, tuning = () => ({}), catalog = () => ({})} = {}) {
  let cColor, cLight, color, light, art = 0, frame, imgColor, imgLight, live = [], raf = 0, last = 0, heldUntil = 0;

  function mount() {
    const layer = z => { const c = document.createElement('canvas'); c.className = 'pixel-fx'; c.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;visibility:hidden;z-index:${z}`; c.setAttribute('aria-hidden', 'true'); stage.append(c); return c; };
    color = layer(41); light = layer(42); light.style.mixBlendMode = 'plus-lighter';
    cColor = color.getContext('2d'); cLight = light.getContext('2d');
  }
  function size() {
    if (!color) mount();
    const r = stage.getBoundingClientRect();
    art = r.width < 900 ? 2 : 3; // tela pequena: pixel menor, para o golpe caber na carta
    const w = Math.max(1, Math.ceil(r.width / art)), h = Math.max(1, Math.ceil(r.height / art));
    if (frame?.w === w && frame?.h === h) return;
    for (const c of [color, light]) { c.width = w; c.height = h; }
    imgColor = cColor.createImageData(w, h); imgLight = cLight.createImageData(w, h);
    frame = {w, h, ox: 0, oy: 0, color: new Uint32Array(imgColor.data.buffer), light: new Uint32Array(imgLight.data.buffer)};
  }
  const show = on => { for (const c of [color, light]) c.style.visibility = on ? 'visible' : 'hidden'; };
  // Celular e Low (is-calm) e "reduzir clarões" ficam sem a camada de luz: somar uma tela inteira é o que mais pesa.
  const glow = () => flashes() && !stage.classList.contains('is-calm');

  function tick(now) {
    raf = 0;
    const dt = now < heldUntil ? 0 : Math.min(.05, (now - last) / 1000); last = now; // hit stop congela
    frame.color.fill(0);
    const lit = glow();
    if (lit) frame.light.fill(0);
    for (const item of live) { const step = dt * item.speed; item.age += step; item.fx.update(step); item.fx.draw(frame, 'back'); item.fx.draw(frame, 'front'); }
    cColor.putImageData(imgColor, 0, 0);
    if (lit) cLight.putImageData(imgLight, 0, 0); else cLight.clearRect(0, 0, frame.w, frame.h);
    live = live.filter(item => item.age < (item.vida ?? MAX_LIFE) && !item.fx.done());
    if (live.length) {
      color.style.opacity = light.style.opacity = Math.min(1, Math.max(...live.map(item => (item.vida ?? MAX_LIFE) - item.age)) / FADE);
      raf = requestAnimationFrame(tick);
    } else show(false);
  }
  // Retângulo do DOM → geometria em mundo. O tamanho acompanha a carta: 190 px de largura = 1,5 no pixel 3.
  function geometry(rect, {from, color: c = '#ffe0a0', power = 0, strength, size: k0 = 1} = {}) {
    size();
    const s = stage.getBoundingClientRect(), k = WORLD_PX / art, w = rect.width || 110, h = rect.height || 150;
    const left = (rect.left ?? rect.x - w / 2) - s.left, top = (rect.top ?? rect.y - h / 2) - s.top;
    return {x: (left + w / 2) * k, y: (top + h / 2) * k, top: top * k, bottom: (top + h) * k, w: w * k, h: h * k,
      from: from ? [(from.x - s.left) * k, (from.y - s.top) * k] : null, s: Math.max(.55, w / 190 * 1.5 * 3 / art) * k0, size: k0, color: c, power, strength};
  }
  // Ajustes do gestor (Star Hill): ligado, tamanho, velocidade e cor de cada efeito.
  function play(recipe, rect, opts = {}) {
    const tune = tuning()?.[recipe] || {};
    const sheet = catalog()?.[recipe];
    if ((!RECIPES[recipe] && !sheet) || tune.ligado === false) return Promise.resolve();
    if (sheet?.coreografia) { const b = sheet.coreografia.faixas.impact?.efeito; return b ? play(b, rect, opts) : Promise.resolve(); } // fora do Strike não há fases: toca o impacto
    const start = (fx, speed = 1, vida = MAX_LIFE) => {
      live.push({fx, age: 0, vida, speed: (tune.velocidade || 1) * speed * (opts.ritmo || 1)});
      show(true);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    if (sheet?.receita) {
      const r = sheet.receita, speed = r.velocidade || 1;
      const at = k => geometry(rect, {...opts, color: r.cor || tune.cor || opts.color || '#ffe7a3', size: (tune.tamanho || 1) * k});
      return Promise.all(combatLayers(r, at).map(({file, options, atraso, vida}) => load(file).then(m => new Promise(done => setTimeout(done, atraso / speed / (tune.velocidade || 1))).then(() => start(m.default({...options, seed: 1 + Math.floor(Math.random() * 1e6)}), speed, vida))))).catch(err => console.debug(err));
    }
    if (sheet) { const g = geometry(rect, {...opts, size: tune.tamanho || 1}); return loadSheet(sheet).then(s => start(sheetFx(s, {...g, ancora: opts.ancora ?? tune.ancora}))).catch(err => console.debug(err)); }
    const [file, options] = RECIPES[recipe](geometry(rect, {...opts, color: tune.cor || opts.color || ELEMENT_COLOR[recipe], size: tune.tamanho || 1}));
    return load(file).then(m => start(m.default({...options, seed: 1 + Math.floor(Math.random() * 1e6)}))).catch(err => console.debug(err)); // efeito que não carrega não pode travar a partida
  }
  return {
    play,
    preload() { for (const f of FILES) load(f).catch(() => {}); }, // o primeiro golpe não espera a rede
    clear() { live = []; },
    hold(ms) { heldUntil = performance.now() + ms; },
    live: () => live.length,
  };
}
