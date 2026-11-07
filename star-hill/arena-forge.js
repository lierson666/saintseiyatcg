// ARENA FORGE (autor, 07/11/2026): edita cada arena 3D da partida com prévia ao vivo, usando a mesma cena do jogo
// (playtest/divine/scene.js). Grava só o que difere do código em data/arenas.json (card-forge/arena_forge.py valida os mesmos campos).
import {createScene, THEMES, DEFAULT_THEMES, applyArenas} from '../playtest/divine/scene.js?v=20261107-arenas1';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const NAMES = {olympus: 'Cosmo Arena', athena: 'Santuário de Athena', poseidon: 'Templo de Poseidon', hades: 'Inferno de Hades', elysion: 'Elísios', ares: 'Templo de Ares', artemis: 'Bosque de Ártemis'};
const MASKS = {0: 'Liso (só mármore)', 1: 'Fendas de lava', 2: 'Flores', 3: 'Placas de bronze', 4: 'Manchas de luar'};
const FALLBACK = {cap: '#d9b25c', glow: '#000000'}; // cor que a cena usa quando o tema não define
// [campo, rótulo, tipo, min, max, passo]
const GROUPS = [
  ['Céu e névoa', [['skyTop', 'Céu (alto)', 'color'], ['skyBottom', 'Céu (horizonte)', 'color'], ['fog', 'Névoa', 'color']]],
  ['Chão', [['floorA', 'Mármore claro', 'color'], ['floorB', 'Mármore escuro', 'color'], ['line', 'Anéis e linhas', 'color'],
    ['mask', 'Desenho', 'mask'], ['glow', 'Brilho do desenho', 'color'], ['pulse', 'Pulso do brilho', 'range', 0, 4, .1],
    ['zodiac', 'Mostrador zodiacal', 'flag'], ['caustics', 'Cáusticas (água)', 'flag']]],
  ['Colunas', [['column', 'Fuste e base', 'color'], ['cap', 'Capitel / copa', 'color'], ['metal', 'Metal', 'range', 0, 1, .05],
    ['broken', 'Quebradas', 'flag'], ['trees', 'Árvores (pinheiros)', 'flag']]],
  ['Luz e partículas', [['light', 'Luz e raios', 'color'], ['dust', 'Partículas', 'color'], ['dustSize', 'Tamanho', 'range', .3, 4, .1],
    ['fall', 'Caem (pétalas)', 'flag'], ['blink', 'Piscam (vaga-lumes)', 'flag']]],
];
const FIELDS = [...GROUPS.flatMap(([, f]) => f.map(x => x[0])), 'orb'];
const VIEWS = {desktop: ['Desktop', 16 / 9], tablet: ['Tablet', 4 / 3], deitado: ['Celular deitado', 19.5 / 9], empe: ['Celular em pé', 9 / 19.5]};

let ctx, scene, key = 'olympus', view = 'desktop', quality = 'high', still = false, dirty = new Set();

const css = `
.af { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
.af-tabs { display: flex; flex-wrap: wrap; gap: 6px; grid-column: 1 / -1; }
.af-tabs button[aria-pressed="true"] { outline: 2px solid currentColor; }
.af-tabs button.is-dirty::after { content: ' •'; }
.af-stage { display: grid; place-items: center; background: #05060f; border-radius: 12px; padding: 12px; min-height: 420px; }
.af-frame { position: relative; width: 100%; max-height: 70vh; overflow: hidden; border-radius: 8px; }
.af-frame .arena-host { position: absolute; inset: 0; }
.af-frame canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.af-frame .fx-canvas { pointer-events: none; }
.af-cards { position: absolute; inset: 0; display: grid; grid-template-rows: 1fr 1fr; padding: 14% 18%; gap: 6%; pointer-events: none; }
.af-cards div { display: flex; justify-content: center; gap: 4%; }
.af-cards span { aspect-ratio: 5 / 7; height: 100%; border-radius: 6px; background: linear-gradient(160deg, #3b4a7a, #12182e); border: 1px solid #e3c27a88; box-shadow: 0 4px 14px #0008; }
.af-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: center; }
.af-side { display: grid; gap: 10px; max-height: 78vh; overflow: auto; }
.af-side fieldset { border: 1px solid #ffffff22; border-radius: 10px; padding: 8px 10px; display: grid; gap: 6px; }
.af-side legend { font-weight: 600; padding: 0 4px; }
.af-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; font-size: 13px; }
.af-row input[type=range] { width: 120px; }
.af-row output { font-variant-numeric: tabular-nums; min-width: 3ch; display: inline-block; text-align: right; }
.af-actions { display: flex; gap: 8px; flex-wrap: wrap; position: sticky; bottom: 0; padding-top: 6px; background: inherit; }
@media (max-width: 900px) { .af { grid-template-columns: 1fr; } .af-side { max-height: none; } }`;

const val = (t, f) => t[f] ?? FALLBACK[f] ?? (f === 'mask' || f === 'pulse' || f === 'metal' ? 0 : f === 'dustSize' ? 1 : 0);
function row([f, label, type, min, max, step], t) {
  const v = val(t, f);
  const input = type === 'color' ? `<input type="color" data-af="${f}" value="${esc(v)}">`
    : type === 'flag' ? `<input type="checkbox" data-af="${f}" ${v ? 'checked' : ''}>`
    : type === 'mask' ? `<select data-af="${f}">${Object.entries(MASKS).map(([k, l]) => `<option value="${k}" ${+k === +v ? 'selected' : ''}>${l}</option>`).join('')}</select>`
    : `<span><input type="range" data-af="${f}" min="${min}" max="${max}" step="${step}" value="${v}"> <output>${v}</output></span>`;
  return `<label class="af-row"><span>${label}</span>${input}</label>`;
}
function side() {
  const t = THEMES[key], o = t.orb;
  return `${GROUPS.map(([title, fields]) => `<fieldset><legend>${title}</legend>${fields.map(f => row(f, t)).join('')}</fieldset>`).join('')}
    <fieldset><legend>Astro no fundo</legend>
      <label class="af-row"><span>Mostrar (sol / lua)</span><input type="checkbox" data-orb="on" ${o ? 'checked' : ''}></label>
      ${o ? `<label class="af-row"><span>Cor</span><input type="color" data-orb="color" value="${esc(o.color)}"></label>
      <label class="af-row"><span>Tamanho</span><span><input type="range" data-orb="size" min="2" max="30" step="1" value="${o.size}"> <output>${o.size}</output></span></label>
      <label class="af-row"><span>Posição</span><span><input type="range" data-orb="x" min="-30" max="30" step="1" value="${o.x}"> <output>${o.x}</output></span></label>` : ''}
    </fieldset>
    <div class="af-actions"><button class="primary" data-af-act="save" ${dirty.size ? '' : 'disabled'}>Salvar arenas</button>
      <button class="secondary" data-af-act="reset">Voltar ao padrão desta arena</button></div>`;
}
function frameStyle() {
  const r = VIEWS[view][1];
  return r < 1 ? `aspect-ratio: ${r}; height: 70vh; width: auto;` : `aspect-ratio: ${r};`;
}
function paint() {
  const host = document.querySelector('#arena-forge');
  host.innerHTML = `<div class="af-tabs" role="toolbar" aria-label="Arenas">${Object.keys(THEMES).map(k =>
    `<button class="secondary ${dirty.has(k) ? 'is-dirty' : ''}" data-af-theme="${k}" aria-pressed="${k === key}">${esc(NAMES[k] || k)}</button>`).join('')}</div>
    <div><div class="af-stage"><div class="af-frame" style="${frameStyle()}"><div class="arena-host"></div>
      <div class="af-cards" aria-hidden="true"><div><span></span><span></span><span></span></div><div><span></span><span></span><span></span></div></div></div></div>
      <div class="af-bar">
        <label>Tela <select data-af-view>${Object.entries(VIEWS).map(([k, [l]]) => `<option value="${k}" ${k === view ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Gráficos <select data-af-quality>${['phone', 'low', 'medium', 'high', 'ultra'].map(q => `<option ${q === quality ? 'selected' : ''} value="${q}">${q === 'phone' ? 'celular' : q}</option>`).join('')}</select></label>
        <label><input type="checkbox" data-af-still ${still ? 'checked' : ''}> Reduzir movimento</label>
        <button class="secondary" data-af-act="hit">Testar golpe</button>
        <small class="hint" id="af-stats"></small>
      </div></div>
    <div class="af-side panel">${side()}</div>`;
  mountScene();
}
async function mountScene() {
  scene?.dispose();
  const host = document.querySelector('#arena-forge .arena-host');
  scene = await createScene(host, {quality, theme: key, reduceMotion: still});
  if (!scene) { host.innerHTML = '<p class="hint" style="padding:16px">Sem WebGL neste navegador: a partida usa o fundo em gradiente.</p>'; return; }
  setTimeout(() => { const s = scene?.stats(); if (s) document.querySelector('#af-stats').textContent = `${s.calls} draw calls · ${s.pixelRatio}x · ${s.level}`; }, 600);
}
const refreshSide = () => { document.querySelector('#arena-forge .af-side').innerHTML = side(); document.querySelector(`[data-af-theme="${key}"]`)?.classList.toggle('is-dirty', dirty.has(key)); };
function changed() {
  dirty.add(key); scene?.setTheme(key);
  const save = document.querySelector('[data-af-act="save"]'); if (save) save.disabled = false;
  document.querySelector(`[data-af-theme="${key}"]`)?.classList.add('is-dirty');
}

// Só o que difere do código vai para o arquivo; tema sem diferença sai do arquivo.
function payload() {
  const temas = {};
  for (const k of Object.keys(THEMES)) {
    const d = {};
    for (const f of FIELDS) if (JSON.stringify(THEMES[k][f] ?? null) !== JSON.stringify(DEFAULT_THEMES[k][f] ?? null)) d[f] = THEMES[k][f] ?? (f === 'orb' ? null : 0);
    if (Object.keys(d).length) temas[k] = d;
  }
  return {versao: 1, temas};
}

function onInput(e) {
  const el = e.target, t = THEMES[key];
  if (el.dataset.af) {
    const f = el.dataset.af;
    t[f] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.type === 'color' ? el.value : Number(el.value);
    if (el.nextElementSibling?.tagName === 'OUTPUT') el.nextElementSibling.textContent = el.value;
    if (f === 'mask' && t.mask && !t.glow) t.glow = '#ffffff';
    return changed();
  }
  if (el.dataset.orb) {
    const o = el.dataset.orb;
    if (o === 'on') { t.orb = el.checked ? {color: '#fff4d8', size: 10, x: 15} : null; changed(); return refreshSide(); }
    t.orb = {...t.orb, [o]: o === 'color' ? el.value : Number(el.value)};
    if (el.nextElementSibling?.tagName === 'OUTPUT') el.nextElementSibling.textContent = el.value;
    return changed();
  }
  if (el.matches('[data-af-view]')) { view = el.value; return paint(); }
  if (el.matches('[data-af-quality]')) { quality = el.value; scene?.setQuality(quality); return; }
  if (el.matches('[data-af-still]')) { still = el.checked; if (scene) scene.reduceMotion = still; }
}
async function onClick(e) {
  const b = e.target.closest('button');
  if (!b || !b.closest('#arena-forge')) return;
  if (b.dataset.afTheme) { key = b.dataset.afTheme; scene?.setTheme(key); document.querySelectorAll('[data-af-theme]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return refreshSide(); }
  const act = b.dataset.afAct;
  if (act === 'hit' && scene) {
    const c = document.querySelector('#arena-forge .af-frame').getBoundingClientRect(), x = c.width / 2, y = c.height / 2;
    scene.fx.charge(x, y, {color: THEMES[key].dust}); setTimeout(() => { scene.fx.burst(x, y, {color: THEMES[key].light}); scene.fx.shockwave(x, y); scene.fx.shake(6); }, 450);
  }
  if (act === 'reset') { THEMES[key] = structuredClone(DEFAULT_THEMES[key]); changed(); return refreshSide(); }
  if (act === 'save') {
    b.disabled = true; b.textContent = 'Salvando…';
    try { await ctx.api('arenas', {conteudo: payload()}); dirty.clear(); ctx.notice('Arenas salvas em data/arenas.json. A partida usa na próxima abertura.', true); }
    catch (err) { ctx.notice(err.message); }
    refreshSide(); document.querySelectorAll('[data-af-theme]').forEach(x => x.classList.remove('is-dirty'));
  }
}

export async function mountArenaForge(host, context) {
  ctx = context;
  if (!document.querySelector('#af-style')) document.head.append(Object.assign(document.createElement('style'), {id: 'af-style', textContent: css}));
  host.innerHTML = '<section id="arena-forge" class="af" aria-label="Arena Forge"><p class="hint">Carregando arenas…</p></section>';
  try { applyArenas(await ctx.api('arenas')); } catch (e) { ctx.notice(`Não foi possível ler data/arenas.json: ${e.message}`); }
  dirty.clear();
  paint();
}
// Sair da página para a cena (o laço e os dois contextos WebGL).
addEventListener('hashchange', () => { if (!location.hash.startsWith('#arenas')) { scene?.dispose(); scene = null; } });
document.addEventListener('input', e => e.target.closest('#arena-forge') && onInput(e));
document.addEventListener('click', onClick);
