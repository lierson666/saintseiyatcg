// Placa de título (ACHIEVEMENTS FORGE V1.0, autor 11/11/2026): o mesmo desenho no STAR HILL, no lobby e no perfil.
// Efeitos reaproveitam os shaders do VFX Forge (shared/vfx/presets.js: id e cor); a placa desenha a versão leve em CSS.
// Movimento respeita prefers-reduced-motion e a classe tp--still. Estilo em shared/title-plate.css.
import {SHADERS} from './vfx/presets.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const RARITY_STYLE = {
  Common: {edge: '#9aa3b5', fill: '#141a28', ink: '#e8ecf4'},
  Uncommon: {edge: '#6fd3a8', fill: '#0f2421', ink: '#e6fff4'},
  Rare: {edge: '#6fb4ff', fill: '#0e1b33', ink: '#eaf4ff'},
  Epic: {edge: '#c08cff', fill: '#1d1233', ink: '#f6eeff'},
  Legendary: {edge: '#ffcf6b', fill: '#2a1d08', ink: '#fff6df'},
  Divine: {edge: '#fff1c4', fill: '#1a1430', ink: '#fffaf0'},
};
// Preset por raridade: o ponto de partida do Title Designer.
export const PRESETS = {Common: 'none', Uncommon: 'glow', Rare: 'energy-pulse', Epic: 'cosmic-aura', Legendary: 'divine-light', Divine: 'starfield'};
export const effectColor = id => SHADERS.find(s => s.id === id)?.cor || null;

const vars = t => {
  const r = RARITY_STYLE[t.rarity] || RARITY_STYLE.Common;
  return `--tp-edge:${r.edge};--tp-fill:${r.fill};--tp-ink:${r.ink};--tp-fx:${effectColor(t.effect) || r.edge}`;
};
// Arte pronta do autor (CONQUISTAS/*.zip, 11/11/2026): shared/title-art/ach-NNN.webp, com o nome em inglês desenhado.
// Só vale com o jogo em inglês; em PT a placa desenhada continua até chegarem as artes PT.
const ART = /^ach-0(0[1-9]|[1-4]\d|50)$/; // as 50 do catálogo inicial; conquista nova usa a placa desenhada até ter arte
export const artFor = (id, lang = globalThis.ssI18n?.lang) => ART.test(id || '') && lang !== 'pt' ? new URL(`./title-art/${id}.webp`, import.meta.url).href : null;

// t: {id, name, rarity, effect}. size: sm (barra do lobby), md (perfil), lg (prévia do editor). lang: força a língua (prévia do STAR HILL).
export const titlePlate = (t, {size = 'md', still = false, name, lang} = {}) => {
  if (!t) return '';
  const art = artFor(t.id, lang), label = esc(name ?? t.name);
  if (art) return `<img class="tp-art tp-art--${size}" src="${art}" alt="${label}" title="${label} · ${esc(t.rarity)}" draggable="false" loading="lazy">`;
  return `<span class="tp tp--${size}${still ? ' tp--still' : ''}" data-rarity="${esc(t.rarity)}" data-effect="${esc(t.effect || 'none')}" style="${vars(t)}" title="${esc(t.rarity)} title"><i aria-hidden="true">✦</i><b>${label}</b><i aria-hidden="true">✦</i></span>`;
};

// Exportar a placa (PNG/WebP) a partir do mesmo estilo: canvas parado, sem animação.
export function drawPlate(t, name, {scale = 2} = {}) {
  const r = RARITY_STYLE[t.rarity] || RARITY_STYLE.Common, fx = effectColor(t.effect);
  const c = document.createElement('canvas'), x = c.getContext('2d');
  const font = `600 ${22 * scale}px Cinzel, Georgia, serif`;
  x.font = font;
  const w = Math.ceil(x.measureText(name).width + 110 * scale), h = 56 * scale;
  c.width = w; c.height = h;
  const pad = 6 * scale;
  if (fx) { x.shadowColor = fx; x.shadowBlur = 18 * scale; }
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, r.fill); g.addColorStop(0.5, '#05070d'); g.addColorStop(1, r.fill);
  x.fillStyle = g;
  x.beginPath(); x.roundRect(pad, pad, w - pad * 2, h - pad * 2, 6 * scale); x.fill();
  x.shadowBlur = 0;
  x.strokeStyle = r.edge; x.lineWidth = 1.5 * scale; x.stroke();
  x.fillStyle = r.ink; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(name, w / 2, h / 2 + scale);
  x.fillStyle = fx || r.edge; x.font = `${14 * scale}px Georgia, serif`;
  x.fillText('✦', 28 * scale, h / 2); x.fillText('✦', w - 28 * scale, h / 2);
  return c;
}
