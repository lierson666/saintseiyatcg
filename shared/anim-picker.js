// Seletor de animação do Star Hill e do Card Forge, no mesmo jeito do seletor de sons: abre, testa, usa.
// Fonte: data/card-animations.json. A carta passa por cima da facção, e a facção por cima do padrão do jogo.
import {createPixelFx, EFFECTS, ANIM_MOMENTS, ELEMENT_COLOR} from '/playtest/divine/pixel-vfx.js?v=20261104-anim2';
export {EFFECTS, ANIM_MOMENTS, ELEMENT_COLOR};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const NAME = Object.fromEntries(EFFECTS);
export const effectName = id => NAME[id] || id;

let anims = {}, dialog = null, preview = null, opts = {};
export const loadAnims = () => fetch('/data/card-animations.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(d => (anims = d));
export const animsNow = () => anims;

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
  const fx = createPixelFx(box, {tuning: () => anims.efeitos});
  return id => {
    fx.clear();
    const a = box.querySelector('.ap-card--from').getBoundingClientRect(), to = box.querySelector('.ap-card--to').getBoundingClientRect();
    return fx.play(id, to, {from: {x: a.left + a.width / 2, y: a.top + a.height / 2}, color: ELEMENT_COLOR[id] || '#e0bb62', power: .4, strength: 1.2});
  };
}

function css() {
  if (document.querySelector('link[data-anim-picker]')) return;
  const l = Object.assign(document.createElement('link'), {rel: 'stylesheet', href: '/shared/anim-picker.css?v=1'});
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
    <div class="ap-body"><div class="ap-preview"></div><ul class="ap-list"></ul></div>`;
  document.body.append(dialog);
  preview = mountPreview(dialog.querySelector('.ap-preview'));
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
export function openAnimPicker(options) {
  opts = options;
  if (!dialog) build();
  dialog.querySelector('h2').textContent = options.title || 'Escolher animação';
  dialog.querySelector('.ap-target').textContent = options.alvo || '';
  const inherit = dialog.querySelector('[data-ap=inherit]');
  inherit.textContent = options.herda || 'Usar o padrão';
  inherit.hidden = options.herda === '';
  dialog.querySelector('.ap-list').innerHTML = EFFECTS.map(([id, nome]) => `<li class="${id === options.value ? 'is-current' : ''}"><button type="button" class="ap-test" data-test="${id}" aria-label="Testar ${esc(nome)}">▶</button><b>${esc(nome)}</b><button type="button" class="ap-use" data-use="${id}">${id === options.value ? 'Em uso' : 'Usar'}</button></li>`).join('');
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
