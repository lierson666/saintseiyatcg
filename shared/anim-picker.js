// Seletor de animação do Star Hill e do Card Forge, no mesmo jeito do seletor de sons: abre, testa, usa.
// Fonte: data/card-animations.json. A carta passa por cima da facção, e a facção por cima do padrão do jogo.
import {createPixelFx, catalogIndex, EFFECTS, ANIM_MOMENTS, ELEMENT_COLOR} from '/playtest/divine/pixel-vfx.js?v=20261106-centro1';
import {SHADERS, LOTTIES, HOLO, FACTION_PRESETS} from './vfx/presets.js';
import {createComposer} from './vfx/composer.js';
export {EFFECTS, ANIM_MOMENTS, ELEMENT_COLOR};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let anims = {}, dialog = null, preview = null, opts = {}, catalog = {fontes: {}, efeitos: []}, sheets = {}, studio = {cartas: {}, raridades: {}, composicoes: {}}, previewQuality = 'high';
const useCatalog = c => { catalog = c; sheets = catalogIndex(c); return c; };
// Todas as fontes num catálogo só: os efeitos em código (Sprite Fusion), os importados (data/vfx-catalog.json) e os do VFX Forge V3 (shared/vfx/).
const BUILT_IN = EFFECTS.map(([id, nome]) => ({id, nome, fonte: 'sprite-fusion', licenca: 'MIT', acesso: 'gratis', categoria: 'particle', tamanho: 'Código no jogo', compat: 'Desktop e mobile'}));
const NEW_TYPES = [
  ...SHADERS.map(s => ({id: `shader:${s.id}`, nome: s.nome, fonte: 'pixi-filters', licenca: 'MIT', acesso: 'gratis', categoria: 'shader', tamanho: 'Pixi: 182 KB comprimido, uma vez', compat: s.modo != null ? 'Desktop e mobile (LOW: quadro parado)' : 'Desktop; LOW: quadro parado'})),
  ...LOTTIES.map(l => ({id: `lottie:${l.id}`, nome: l.nome, fonte: 'dotlottie', licenca: 'MIT', acesso: 'gratis', categoria: 'vector', tamanho: 'Runtime: 1,3 MB, só ao tocar', compat: 'Desktop e mobile; fora do LOW', aplicacao: l.aplicacao})),
  // Só no catálogo: holográfico e Living Card se escolhem por carta ou raridade, não por momento.
  ...HOLO.map(h => ({id: `shader:${h.shader}`, nome: h.nome, fonte: 'pixi-filters', licenca: 'MIT', acesso: 'gratis', categoria: 'holo', soCatalogo: true, tamanho: 'Pixi: 182 KB comprimido, uma vez', compat: 'Só com cursor ou toque; LOW: quadro parado'})),
  ...Object.values(FACTION_PRESETS).map(p => ({id: `shader:${p.shader}`, nome: p.nome, fonte: 'pixi-filters', licenca: 'MIT', acesso: 'gratis', categoria: 'living', soCatalogo: true, tamanho: 'Pixi: 182 KB comprimido, uma vez', compat: 'Até 6 cartas vivas; LOW: quadro parado'})),
];
const compositions = () => Object.entries(studio.composicoes || {}).map(([id, c]) => ({id: `comp:${id}`, nome: c.nome, fonte: 'composer', licenca: 'Projeto', acesso: 'gratis', categoria: c.camadas.every(l => l.tipo === 'carta') ? 'motion' : 'cinematic', tamanho: `${c.camadas.length} camadas`, compat: 'LOW corta shader, câmera e Lottie'}));
export const categoryOf = e => e.categoria || (e.fonte === 'particlr' ? 'particle' : 'sprite');
export const allEffects = () => [...BUILT_IN, ...catalog.efeitos, ...NEW_TYPES, ...compositions()];
export const catalogNow = () => catalog;
export const effectName = id => allEffects().find(e => e.id === id)?.nome || id;
export const loadAnims = () => Promise.all([
  fetch('/data/card-animations.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(d => (anims = d)),
  fetch('/data/vfx-catalog.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : catalog)).catch(() => catalog).then(useCatalog),
  fetch('/data/vfx-studio.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : studio)).catch(() => studio).then(d => (studio = d)),
]).then(([d]) => d);
export const animsNow = () => anims;
export const studioNow = () => studio;
export const setPreviewQuality = q => { previewQuality = q; };
// Grava uma alteração do VFX Forge V3. O servidor devolve o arquivo inteiro.
export async function saveStudio(tipo, id, valor) {
  const r = await fetch('/api/star-hill/vfx-studio', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({tipo, id, valor})});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.erro || 'Não foi salvo. Feche e abra o STAR HILL ou o Card Forge para atualizar o servidor.');
  return (studio = data.studio);
}
async function post(path, body) {
  const r = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.erro || 'Não foi salvo. Feche e abra o STAR HILL ou o Card Forge para atualizar o servidor.');
  useCatalog(data.catalogo);
  return data;
}
export const importVfx = body => post('/api/star-hill/vfx-import', body);
export const editVfx = body => post('/api/star-hill/vfx-meta', body);

// Grava uma entrada (carta, faccao-<nome> ou padrao) ou os ajustes (id "efeitos"). O servidor devolve o arquivo inteiro.
export async function saveAnim(id, entry) {
  const r = await fetch('/api/star-hill/card-anim', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, ...entry})});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.erro || 'A animação não foi salva. Feche e abra o STAR HILL ou o Card Forge para atualizar o servidor.');
  return (anims = data.animacoes);
}

// Toca um efeito numa carta de exemplo, a partir de uma segunda carta (golpes como Energia e Veneno saem dela).
export function mountPreview(box) {
  box.classList.add('ap-stage');
  box.innerHTML = '<span class="ap-card ap-card--from"></span><span class="ap-card ap-card--to"></span>';
  const fx = createPixelFx(box, {tuning: () => anims.efeitos, catalog: () => sheets});
  const composer = createComposer({stage: box, pixel: fx, studio: studioNow, quality: () => previewQuality, targetOf: () => box.querySelector('.ap-card--to')});
  const run = id => {
    fx.clear();
    composer.stop();
    const a = box.querySelector('.ap-card--from').getBoundingClientRect(), to = box.querySelector('.ap-card--to').getBoundingClientRect();
    if (typeof id === 'object' || /^(shader|lottie|comp):/.test(id)) return composer.play(id, to); // objeto: composição ainda não salva
    return fx.play(id, to, {from: {x: a.left + a.width / 2, y: a.top + a.height / 2}, color: ELEMENT_COLOR[id] || '#e0bb62', power: .4, strength: 1.2});
  };
  run.stop = () => { fx.clear(); composer.stop(); fx.hold(0); };
  run.pause = () => { composer.pause(); fx.hold(1e9); }; // hold congela os efeitos que já estão na tela
  run.resume = () => { fx.hold(0); composer.resume(); };
  return run;
}

function css() {
  if (document.querySelector('link[data-anim-picker]')) return;
  const l = Object.assign(document.createElement('link'), {rel: 'stylesheet', href: '/shared/anim-picker.css?v=2'});
  l.dataset.animPicker = '1';
  document.head.append(l);
}
function build() {
  css();
  dialog = document.createElement('dialog');
  dialog.className = 'ap';
  dialog.setAttribute('aria-label', 'Escolher animação');
  dialog.innerHTML = `<header class="ap-head"><div><h2></h2><small class="ap-target"></small></div>
      <button type="button" data-ap="inherit"></button><button type="button" data-ap="none">Sem animação</button><button type="button" data-ap="close" aria-label="Fechar">✕</button></header>
    <div class="ap-body"><div class="ap-preview"></div><div class="ap-side"><div class="ap-tools"><input type="search" class="ap-search" placeholder="Buscar efeito" aria-label="Buscar efeito"><select class="ap-source" aria-label="Fonte"></select></div><ul class="ap-list"></ul></div></div>`;
  document.body.append(dialog);
  preview = mountPreview(dialog.querySelector('.ap-preview'));
  dialog.querySelector('.ap-search').addEventListener('input', paintList);
  dialog.querySelector('.ap-source').addEventListener('change', paintList);
  dialog.addEventListener('click', e => {
    if (e.target === dialog) return dialog.close();
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ap === 'close') return dialog.close();
    if (b.dataset.ap === 'inherit') { opts.onPick(null); return dialog.close(); }
    if (b.dataset.ap === 'none') { opts.onPick(false); return dialog.close(); }
    if (b.dataset.test) return preview(b.dataset.test);
    if (b.dataset.use) { opts.onPick(b.dataset.use); dialog.close(); }
  });
}
function paintList() {
  const q = dialog.querySelector('.ap-search').value.trim().toLowerCase(), source = dialog.querySelector('.ap-source').value;
  const list = allEffects().filter(e => !e.soCatalogo && !e.rascunho && (!source || e.fonte === source) && (!q || e.nome.toLowerCase().includes(q)));
  dialog.querySelector('.ap-list').innerHTML = list.map(({id, nome, fonte}) => `<li class="${id === opts.value ? 'is-current' : ''}"><button type="button" class="ap-test" data-test="${esc(id)}" aria-label="Testar ${esc(nome)}">▶</button><b>${esc(nome)}<small>${esc(catalog.fontes?.[fonte]?.nome || fonte)}</small></b><button type="button" class="ap-use" data-use="${esc(id)}">${id === opts.value ? 'Em uso' : 'Usar'}</button></li>`).join('') || '<li>Nenhum efeito.</li>';
}
export function openAnimPicker(options) {
  opts = options;
  if (!dialog) build();
  dialog.querySelector('h2').textContent = options.title || 'Escolher animação';
  dialog.querySelector('.ap-target').textContent = options.alvo || '';
  const inherit = dialog.querySelector('[data-ap=inherit]');
  inherit.textContent = options.herda || 'Usar o padrão';
  inherit.hidden = options.herda === '';
  const sources = [...new Set(allEffects().filter(e => !e.soCatalogo).map(e => e.fonte))];
  dialog.querySelector('.ap-source').innerHTML = `<option value="">Todas as fontes</option>${sources.map(f => `<option value="${esc(f)}">${esc(catalog.fontes?.[f]?.nome || f)}</option>`).join('')}`;
  dialog.querySelector('.ap-search').value = '';
  paintList();
  dialog.showModal();
  if (options.value) preview(options.value);
}
// ▶ de cada linha: pop-up que toca o efeito ao abrir e repete quando pedir (autor, 04/11/2026).
let previewDialog = null, replay = null, shown = null;
export function openAnimPreview(id, alvo = '') {
  css();
  if (!previewDialog) {
    previewDialog = document.createElement('dialog');
    previewDialog.className = 'ap ap--preview';
    previewDialog.innerHTML = '<header class="ap-head"><div><h2></h2><small class="ap-target"></small></div><button type="button" data-ap="again">▶ De novo</button><button type="button" data-ap="close" aria-label="Fechar">✕</button></header><div class="ap-preview"></div>';
    document.body.append(previewDialog);
    replay = mountPreview(previewDialog.querySelector('.ap-preview'));
    previewDialog.addEventListener('click', e => {
      if (e.target === previewDialog || e.target.closest('[data-ap=close]')) return previewDialog.close();
      if (e.target.closest('[data-ap=again]')) replay(shown);
    });
  }
  shown = id;
  previewDialog.querySelector('h2').textContent = effectName(id);
  previewDialog.querySelector('.ap-target').textContent = alvo;
  previewDialog.showModal();
  replay(id);
}
// Texto do botão de cada linha: o efeito, "sem animação" ou de onde herda.
export const animLabel = (value, herda = 'padrão') => value === false ? '— sem animação —' : value ? effectName(value) : `— ${herda} —`;
