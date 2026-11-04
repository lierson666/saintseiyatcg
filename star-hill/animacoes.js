// STAR HILL · Gestor de animações: efeitos, padrões do jogo, facções e cartas, em data/card-animations.json (playtest/divine/pixel-vfx.js toca).
// A carta passa por cima da facção, e a facção por cima do padrão, como nos sons. A linha de cada habilidade também se escolhe no Card Forge, aba Som.
import {EFFECTS, ANIM_MOMENTS, ELEMENT_COLOR, loadAnims, animsNow, saveAnim, openAnimPreview, openAnimPicker, animLabel} from '/shared/anim-picker.js?v=2';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const FACCOES = ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis', 'Neutral'];
let root = null, hooks = null, cards = [], faccao = 'Athena', cardId = '', busca = '';

const entryOf = id => ({linhas: [], ...animsNow()[id]});
const tune = id => ({ligado: true, tamanho: 1, velocidade: 1, cor: null, ...animsNow().efeitos?.[id]});
async function save(id, patch) {
  try { await saveAnim(id, patch); draw(); hooks.notice('Animação salva. Use Publicar no site para levar ao jogo online.', true); } catch (e) { hooks.notice(e.message); }
}
const chooser = (id, key, value, herda) => `<div class="tl-chooser${value == null ? ' is-empty' : ''}"><button type="button" class="tl-chooser__pick" data-an="pick" data-id="${esc(id)}" data-k="${key}" data-herda="${esc(herda)}">${esc(animLabel(value, herda))}</button>
  <button type="button" data-an="test" data-fx="${value || ''}" aria-label="Testar" title="Testar" ${value ? '' : 'disabled'}>▶</button><button type="button" data-an="clear" data-id="${esc(id)}" data-k="${key}" aria-label="Tirar" title="Tirar" ${value == null ? 'disabled' : ''}>✕</button></div>`;
const moments = (id, herda) => { const v = animsNow()[id] || {}; return ANIM_MOMENTS.map(([k, nome, quando]) => `<div class="tl-anim tl-anim--faccao"><div class="tl-anim__what"><span>${esc(nome)}<small>${esc(quando)}</small></span></div>${chooser(id, k, v[k], herda)}</div>`).join(''); };

function efeitos() {
  return `<section class="panel tl"><div class="tl-head"><h2>Efeitos</h2><span class="tag">${EFFECTS.length} efeitos</span></div><p class="hint">Vale para todo o jogo. Efeito desligado não aparece em nenhum momento.</p>
    ${EFFECTS.map(([id, nome]) => { const t = tune(id); return `<div class="an-row${t.ligado ? '' : ' is-off'}"><input type="checkbox" class="tl-switch" role="switch" aria-label="Ligar ${esc(nome)}" data-tune="${id}" data-field="ligado" ${t.ligado ? 'checked' : ''}><b>${esc(nome)}</b>
      <button type="button" data-an="test" data-fx="${id}">▶ Testar</button>
      <label class="tl-speed">Tamanho <input type="range" min="0.5" max="2" step="0.1" data-tune="${id}" data-field="tamanho" value="${t.tamanho}"><b>${t.tamanho}×</b></label>
      <label class="tl-speed">Velocidade <input type="range" min="0.25" max="2" step="0.25" data-tune="${id}" data-field="velocidade" value="${t.velocidade}"><b>${t.velocidade}×</b></label>
      <label class="tl-speed">Cor <input type="color" data-tune="${id}" data-field="cor" value="${esc(t.cor || ELEMENT_COLOR[id] || '#e0bb62')}">${t.cor ? `<button type="button" data-an="cor-reset" data-fx="${id}">padrão</button>` : ''}</label></div>`; }).join('')}</section>`;
}
function porCarta() {
  const q = busca.trim().toLowerCase(), v = animsNow();
  const list = cards.filter(c => !q ? v[c.id] : `${c.nome_exibicao_en} ${c.id}`.toLowerCase().includes(q)).slice(0, 60), card = cards.find(c => c.id === cardId);
  const lines = card?.habilidades_pt?.length ? card.habilidades_pt : card?.habilidades_en || [], own = card && (v[card.id]?.linhas || []);
  return `<section class="panel tl"><div class="tl-head"><h2>Por carta</h2><span class="tag">A carta passa por cima da facção</span></div>
    <label class="tl-field"><span>Buscar carta (vazio: as que já têm animação)</span><input id="an-busca" type="search" value="${esc(busca)}" placeholder="Nome ou código"></label>
    <div class="an-cards">${list.map(c => `<button type="button" data-an="card" data-id="${c.id}" aria-pressed="${c.id === cardId}">${esc(c.nome_exibicao_en)}</button>`).join('') || '<p class="hint">Nenhuma carta.</p>'}</div>
    ${card ? `<h3>${esc(card.nome_exibicao_en)} · habilidades</h3>${lines.map((t, i) => `<div class="tl-anim tl-anim--faccao"><div class="tl-anim__what"><span>${esc(String(t).split(/ — |\n/)[0].slice(0, 60))}</span></div>${chooser(card.id, `linha:${i}`, own[i], 'habilidade da carta')}</div>`).join('') || '<p class="hint">Esta carta não tem habilidades.</p>'}
      <h3>Momentos</h3>${moments(card.id, 'facção')}` : ''}</section>`;
}
function page() {
  return `<section class="panel tl"><div class="tl-head"><h2>Padrões do jogo</h2><span class="tag">Vale para toda carta sem escolha própria</span></div>${moments('padrao', 'sem animação nova')}</section>
    <section class="panel tl"><div class="tl-head"><h2>Por facção</h2><span class="tag">Passa por cima do padrão</span></div>
      <div class="tl-faccao-tabs" role="group" aria-label="Facção">${FACCOES.map(f => `<button type="button" data-an="faccao" data-f="${f}" aria-pressed="${f === faccao}">${f}</button>`).join('')}</div>${moments(`faccao-${faccao.toLowerCase()}`, 'padrão')}</section>
    ${porCarta()}${efeitos()}`;
}
function draw() {
  const y = scrollY;
  root.innerHTML = page();
  scrollTo(0, y);
}
export async function mountAnimacoes(el, {notice}) {
  root = el; hooks = {notice};
  if (!document.querySelector('link[data-anim-picker]')) document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: '/shared/anim-picker.css?v=1'}));
  const [, exported] = await Promise.all([loadAnims(), fetch(`../card-forge/art-web/cards.json?t=${Date.now()}`, {cache: 'no-store'}).then(r => r.json())]);
  cards = exported.cartas;
  draw();
}
function setChoice(id, key, value) {
  const entry = entryOf(id);
  if (key.startsWith('linha:')) { const i = Number(key.slice(6)), l = [...entry.linhas]; l[i] = value; for (let j = 0; j < l.length; j++) l[j] ??= null; return save(id, {...entry, linhas: l}); }
  return save(id, {...entry, [key]: value});
}
const saveTune = (id, patch) => save('efeitos', {efeitos: {...animsNow().efeitos, [id]: {...tune(id), ...patch}}});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-an]');
  if (!b || !root?.contains(b)) return;
  const act = b.dataset.an, {id, k} = b.dataset;
  if (act === 'test') return openAnimPreview(b.dataset.fx, b.closest('.tl-anim')?.querySelector('span')?.firstChild?.textContent || '');
  if (act === 'faccao') { faccao = b.dataset.f; return draw(); }
  if (act === 'card') { cardId = id; return draw(); }
  if (act === 'clear') return setChoice(id, k, null);
  if (act === 'cor-reset') return saveTune(b.dataset.fx, {cor: null});
  if (act === 'pick') {
    const entry = animsNow()[id] || {}, value = k.startsWith('linha:') ? entry.linhas?.[Number(k.slice(6))] : entry[k];
    const what = k.startsWith('linha:') ? b.closest('.tl-anim').querySelector('span').textContent : ANIM_MOMENTS.find(([m]) => m === k)?.[1];
    openAnimPicker({title: 'Escolher animação', alvo: `${id === 'padrao' ? 'Todas as cartas' : id.startsWith('faccao-') ? `Facção ${faccao}` : cards.find(c => c.id === id)?.nome_exibicao_en || id} · ${what}`, value, herda: `Usar: ${b.dataset.herda}`, onPick: v => setChoice(id, k, v)});
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (!root?.contains(t)) return;
  if (t.id === 'an-busca') { busca = t.value; const at = t.selectionEnd; draw(); const n = root.querySelector('#an-busca'); n.focus(); n.setSelectionRange(at, at); return; }
  if (t.dataset.tune && t.type === 'range') { const b = t.closest('label').querySelector('b'); if (b) b.textContent = `${t.value}×`; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (!root?.contains(t) || !t.dataset.tune) return;
  saveTune(t.dataset.tune, {[t.dataset.field]: t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value});
});
