// VFX Forge V3: põe o efeito sobre a arte das cartas vivas, sem tocar em shared/live-card.js nem no arquivo da arte.
// A carta é desenhada normalmente; o canvas entra logo acima da <image>, abaixo da moldura e dos textos. Se algo falhar, fica a arte original.
import {cardFxFor, profileFor, stepDown} from './presets.js';

const LOAD_SHADERS = () => import(new URL('./shader-fx.js?v=20261104-vfx1', import.meta.url).href);
const SVG = 'http://www.w3.org/2000/svg';
const mounts = new Map(); // elemento da carta → montagem
let tick = 0, last = 0, frames = 0, windowStart = 0, fps = 0, slow = 0, profile = profileFor('high'), studio = {}, findCard = () => null, contextOf = () => null;
let pointer = null, visible = new WeakSet(), io = null, watcher = null;

// Onde está a arte: <image> da carta publicada (SVG) ou <img> do layout antigo. Peças da moldura ficam em CARD-TEMPLATE.
function artOf(card) {
  if (card.dataset.vfxCard) return card; // peça da mesa: a arte é fundo de CSS
  const legacy = card.querySelector(':scope > .live-card__illustration img');
  if (legacy) return legacy;
  return [...card.querySelectorAll('image')].find(i => !/CARD-TEMPLATE|LOGO\//.test(i.getAttribute('href') || '')) || null;
}
const urlOf = art => new URL(art.getAttribute('href') || art.getAttribute('src'), location.href).href.replace(/\.(sm|xs)\.webp/, '.webp');

function place(art, canvas) {
  if (art.dataset.vfxCard) { // sem cópia da arte, nada desalinha do enquadramento da peça: o efeito soma luz por cima
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:screen;border-radius:inherit;pointer-events:none';
    art.prepend(canvas);
    return canvas;
  }
  if (art.tagName.toLowerCase() === 'img') {
    canvas.style.cssText = `${art.getAttribute('style') || 'position:absolute;inset:0;width:100%;height:100%'};pointer-events:none`;
    art.after(canvas);
    return canvas;
  }
  const box = document.createElementNS(SVG, 'foreignObject');
  for (const k of ['x', 'y', 'width', 'height']) box.setAttribute(k, art.getAttribute(k));
  box.setAttribute('pointer-events', 'none');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  box.append(canvas);
  art.after(box);
  return box;
}

async function mount(card, fx) {
  const art = artOf(card);
  if (!art) return;
  const token = !!art.dataset.vfxCard;
  const entry = {fx, url: token ? null : urlOf(art), art, layer: null, node: null, dead: false, pointer: null};
  mounts.set(card, entry);
  try {
    const {createShaderLayer, available} = await LOAD_SHADERS();
    if (!available()) return;
    const box = art.getBoundingClientRect(), ratio = box.width && box.height ? box.height / box.width : 1.4;
    const width = Math.min(token ? 256 : profile.largura, Math.max(120, Math.round(box.width * (devicePixelRatio || 1)) || profile.largura));
    const layer = await createShaderLayer({...fx, art: entry.url, width, height: Math.round(width * ratio), profile});
    if (entry.dead) return layer.dispose();
    entry.layer = layer;
    layer.draw();
    entry.node = place(art, layer.canvas);
    io?.observe(card);
  } catch (error) {
    console.debug('VFX: fica a arte original.', error);
  }
}
function unmount(card) {
  const entry = mounts.get(card);
  if (!entry) return;
  entry.dead = true;
  entry.layer?.dispose();
  entry.node?.remove();
  mounts.delete(card);
  io?.unobserve(card);
}

// Passa por todas as cartas na página. O morph do jogo pode reescrever a carta: montagem cuja arte mudou é refeita.
function scan() {
  for (const [card, entry] of mounts) {
    const fx = wanted(card);
    if (!card.isConnected || !fx || fx.shader !== entry.fx.shader || !entry.art.isConnected) unmount(card);
    else if (entry.layer && !entry.node.isConnected) entry.node = place(entry.art, entry.layer.canvas);
  }
  for (const card of document.querySelectorAll('[data-live-card], [data-vfx-card]')) {
    if (mounts.has(card) || card.closest('[aria-hidden=true]#overflowProbe, #overflowProbe')) continue;
    const fx = wanted(card);
    if (fx && !fx.reage) mount(card, fx); // holográfico só monta com o cursor ou o toque em cima: a coleção tem centenas de cartas
  }
}
function wanted(card) {
  const context = contextOf(card);
  if (!context) return null;
  const data = findCard(card.dataset.liveCard || card.dataset.vfxCard);
  return data ? card.vfxOverride ?? cardFxFor(studio, data, context) : null;
}

function loop(now) {
  tick = requestAnimationFrame(loop);
  frames++;
  if (now - windowStart >= 2000) {
    fps = Math.round(frames * 1000 / (now - windowStart));
    frames = 0; windowStart = now;
    slow = fps < 22 ? slow + 1 : 0;
    if (slow >= 2 && profile.id !== 'low') { profile = stepDown(profile); slow = 0; } // aparelho não aguenta: desce um perfil, sem pedir
  }
  if (!profile.fps || now - last < 1000 / profile.fps) return;
  last = now;
  let live = 0;
  for (const [card, entry] of mounts) {
    if (!entry.layer || !entry.layer.animated || !visible.has(card) || document.hidden) continue;
    if (entry.fx.reage && !entry.pointer) continue; // holográfico: só com o cursor ou o toque em cima
    if (++live > profile.vivas) break;
    try { entry.layer.draw(entry.pointer); } catch (error) { console.debug(error); unmount(card); }
  }
}
function onPointer(e) {
  const card = e.target.closest?.('[data-live-card]');
  if (card && !mounts.has(card)) { const fx = wanted(card); if (fx?.reage) mount(card, fx); }
  const entry = card && mounts.get(card);
  if (pointer && pointer !== entry) {
    pointer.pointer = null;
    const old = [...mounts].find(([, m]) => m === pointer)?.[0];
    if (old && pointer.fx.reage) unmount(old);
  }
  pointer = entry || null;
  if (!entry) return;
  const r = card.getBoundingClientRect();
  entry.pointer = {x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height};
}

// `context(cardEl)`: 'idle', 'inspecao', 'colecao' ou null (sem efeito aqui). Nada é baixado enquanto nenhuma carta pedir efeito.
export function startCardFx({quality, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, data, card, context}) {
  profile = profileFor(quality, {reduced}); studio = data; findCard = card; contextOf = context;
  io = new IntersectionObserver(items => { for (const i of items) if (i.isIntersecting) visible.add(i.target); else visible.delete(i.target); });
  let queued = false;
  watcher = new MutationObserver(() => { if (queued) return; queued = true; setTimeout(() => { queued = false; scan(); }, 150); });
  watcher.observe(document.body, {childList: true, subtree: true});
  addEventListener('pointermove', onPointer, {passive: true});
  addEventListener('pointerdown', onPointer, {passive: true});
  tick = requestAnimationFrame(loop);
  scan();
  return {
    rescan: scan,
    setQuality(q) { profile = profileFor(q, {reduced}); },
    setData(next) { studio = next; for (const c of [...mounts.keys()]) unmount(c); scan(); },
    stats: () => ({perfil: profile.id, fps, montagens: mounts.size, memoriaMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null}),
    stop() { cancelAnimationFrame(tick); watcher.disconnect(); io.disconnect(); removeEventListener('pointermove', onPointer); removeEventListener('pointerdown', onPointer); for (const c of [...mounts.keys()]) unmount(c); },
  };
}
