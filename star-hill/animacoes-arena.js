// STAR HILL · Arena de testes: toca cada cenário na mesa real do jogo, com o rascunho ou com a versão publicada. Nunca grava nada.
import {allEffects, animsNow, studioNow} from '/shared/anim-picker.js?v=5';
import {renderLiveCard} from '/shared/live-card.js';
import {SHADERS} from '/shared/vfx/presets.js';
import {CENARIOS, abilityNames, differs, resolveCenario} from './arena-model.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const W = 1280, H = 720;
let cards = [], cardA = '', cardB = '', versao = 'rascunho', cenario = 'ataque', ability = '', quem = 'A', publicada = {anims: {}, studio: {}}, pubOk = null, tocando = false, setStudio = () => {};

const devotees = () => cards.filter(c => c.tipo === 'Devotee').sort((x, y) => x.id.localeCompare(y.id));
const byId = id => cards.find(c => c.id === id);
const nome = c => c?.nome_exibicao_pt || c?.nome_exibicao_en || c?.id || '';
const momentName = k => ({idle: 'Parada na mesa', inspecao: 'Inspeção', colecao: 'Holográfico', declarar: 'Declarar', carga: 'Carga', golpe: 'Golpe', impacto: 'Impacto', strike: 'Ao receber', entrada: 'Entrada', dano: 'Dano', escudo: 'Prevenido', impacto_deus: 'No Deus', habilidade: 'Habilidade', morte: 'Morte'}[k] || k);
const fxName = v => (v === false ? 'Desligado' : v == null ? 'Sem efeito' : allEffects().find(e => e.id === v)?.nome || SHADERS.find(s => s.id === v)?.nome || v);
const pair = () => {
  const [a, b] = quem === 'A' ? [byId(cardA), byId(cardB)] : [byId(cardB), byId(cardA)];
  return {a, b, ability};
};
const rowsOf = (id, version) => resolveCenario(id, {...pair(), ...(version === 'publicada' ? publicada : {anims: animsNow(), studio: studioNow()})});

function listaHtml() {
  const grupos = [...new Set(CENARIOS.map(c => c.grupo))];
  return grupos.map(g => `<h3>${esc(g)}</h3><ul class="ar-list">${CENARIOS.filter(c => c.grupo === g).map(c => {
    const draft = rowsOf(c.id, 'rascunho'), mudou = pubOk && differs(draft, rowsOf(c.id, 'publicada'));
    return `<li class="${c.id === cenario ? 'is-sel' : ''}"><button type="button" data-ar-play="${c.id}" aria-pressed="${c.id === cenario}" title="${esc(c.ajuda)}"><span>${esc(c.nome)}</span>${mudou ? '<em>difere da publicada</em>' : ''}</button></li>`;
  }).join('')}</ul>`).join('');
}
function detalheHtml() {
  const c = CENARIOS.find(x => x.id === cenario), draft = rowsOf(cenario, 'rascunho'), pub = pubOk ? rowsOf(cenario, 'publicada') : null;
  return `<h3>${esc(c.nome)}</h3><p class="hint">${esc(c.ajuda)} <button type="button" class="mo-link" data-aba-ir="momentos">Trocar animação e som</button></p>
    <table class="ar-table"><thead><tr><th scope="col">Momento</th><th scope="col">Rascunho</th><th scope="col">Publicada</th></tr></thead><tbody>${draft.map((r, i) => `<tr class="${pub && JSON.stringify(pub[i].valor) !== JSON.stringify(r.valor) ? 'is-diff' : ''}"><th scope="row">${esc(momentName(r.momento))}</th><td>${esc(fxName(r.valor))}${r.origem ? `<small>${esc(r.origem)}</small>` : ''}</td><td>${pub ? `${esc(fxName(pub[i].valor))}${pub[i].origem ? `<small>${esc(pub[i].origem)}</small>` : ''}` : '–'}</td></tr>`).join('')}</tbody></table>`;
}
const mesaSrc = () => `/playtest/divine/?demo=criador&a=${encodeURIComponent(cardA)}&b=${encodeURIComponent(cardB)}${versao === 'publicada' ? '&publicado=1' : ''}`;
export function arenaSection() {
  const opts = id => devotees().map(c => `<option value="${esc(c.id)}" ${c.id === id ? 'selected' : ''}>${esc(nome(c))} · ${esc(c.id)}</option>`).join('');
  const lines = abilityNames(pair().a);
  return `<section class="panel tl" id="arena"><div class="tl-head"><h2>Arena de testes</h2><span class="tag">Testar não grava nada</span></div>
    <div class="ar-grid"><aside class="ar-left" aria-label="Cenários">
      <div class="ar-version" role="group" aria-label="Versão testada">${[['rascunho', 'Rascunho'], ['publicada', 'Publicada']].map(([v, t]) => `<button type="button" data-ar-versao="${v}" aria-pressed="${v === versao}">${t}</button>`).join('')}</div>
      <label class="tl-field"><span>Minha carta</span><select data-ar="a">${opts(cardA)}</select></label>
      <label class="tl-field"><span>Carta do oponente</span><select data-ar="b">${opts(cardB)}</select></label>
      <label class="tl-field"><span>Quem age</span><select data-ar="quem"><option value="A" ${quem === 'A' ? 'selected' : ''}>Eu</option><option value="B" ${quem === 'B' ? 'selected' : ''}>Oponente</option></select></label>
      <label class="tl-field"><span>Linha da habilidade</span><select data-ar="ability" ${lines.length ? '' : 'disabled'}>${lines.length ? lines.map(l => `<option ${l === ability ? 'selected' : ''}>${esc(l)}</option>`).join('') : '<option>Esta carta não tem linha</option>'}</select></label>
      <div id="ar-list">${listaHtml()}</div></aside>
    <div class="ar-center"><output class="hint ar-status" id="ar-status" aria-live="polite"></output>
      <div class="ar-view" id="ar-view"><iframe id="ar-game" title="Mesa real do jogo" src="${esc(mesaSrc())}"></iframe><div class="ar-colecao" id="ar-colecao" hidden></div></div>
      <div id="ar-detail">${detalheHtml()}</div></div></div></section>`;
}
const $ = s => document.querySelector(s);
const say = t => { const o = $('#ar-status'); if (o) o.textContent = t; };
const game = () => $('#ar-game')?.contentWindow?.__divine?.criador;
function fit() {
  const view = $('#ar-view'), frame = $('#ar-game');
  if (!view || !frame) return;
  const k = view.clientWidth / W;
  frame.style.transform = `scale(${k})`;
  view.style.height = `${Math.ceil(H * k)}px`;
}
const paintInfo = () => { const l = $('#ar-list'), d = $('#ar-detail'); if (l) l.innerHTML = listaHtml(); if (d) d.innerHTML = detalheHtml(); };
function reload() { say('Abrindo a mesa…'); $('#ar-game').src = mesaSrc(); }
async function waitGame() {
  for (let i = 0; i < 150; i++) { if (game()) return game(); await new Promise(r => setTimeout(r, 100)); }
  return null;
}
function showCollection(on) {
  const box = $('#ar-colecao');
  $('#ar-game').hidden = on; box.hidden = !on;
  if (!on) { box.innerHTML = ''; setStudio(studioNow()); return; }
  const c = pair().a;
  setStudio(versao === 'publicada' ? publicada.studio : studioNow()); // o mesmo montador da coleção do jogo
  box.innerHTML = `<div class="cx-live">${renderLiveCard(c, {art: c.ilustracao ? `/card-forge/art-web/${c.ilustracao}` : undefined})}</div>`;
}
async function play(id) {
  if (tocando) return;
  cenario = id;
  paintInfo();
  const c = CENARIOS.find(x => x.id === id), rows = rowsOf(id, versao);
  showCollection(c.mesa === false);
  const vazio = rows.every(r => r.valor == null || r.valor === false), rotulo = versao === 'publicada' ? 'publicada' : 'rascunho';
  if (c.mesa === false) return say(vazio ? `Coleção (${rotulo}): sem holográfico nem inspeção; a carta fica estática.` : `Coleção (${rotulo}): passe o mouse sobre a carta.`);
  tocando = true;
  document.querySelectorAll('[data-ar-play]').forEach(b => { b.disabled = true; });
  say('Tocando…');
  try {
    const api = await waitGame();
    if (!api) throw Error('A mesa não abriu.');
    await api.cena(id, {de: quem, ability});
    say(vazio ? `${c.nome} (${rotulo}): nenhum efeito escolhido; viu-se só o que o jogo sempre mostra.` : `${c.nome} (${rotulo}) tocado na mesa real.`);
  } catch (error) { console.error(error); say(`Falhou: ${error.message}`); }
  tocando = false;
  paintInfo();
}
export function arenaMounted(list, {setStudioFx}) {
  cards = list;
  setStudio = setStudioFx;
  if (!$('#arena')) return;
  fit();
  new ResizeObserver(() => requestAnimationFrame(fit)).observe($('#ar-view')); // no quadro seguinte: fit muda a altura da caixa observada
  if (pubOk === null) {
    Promise.all(['card-animations', 'vfx-studio'].map(f => fetch(`/data/${f}.publicado.json`, {cache: 'no-store'}).then(r => (r.ok ? r.json() : Promise.reject()))))
      .then(([anims, studio]) => { publicada = {anims, studio}; pubOk = true; }).catch(() => { pubOk = false; say('Arquivos publicados não encontrados: só o rascunho pode ser comparado.'); }).then(paintInfo);
  }
}
export function arenaDefaults(list) {
  cards = list;
  const ds = devotees(), pick = (id, i) => (ds.some(c => c.id === id) ? id : ds[i]?.id || '');
  cardA = pick(cardA || 'athena-v6-001', 0); cardB = pick(cardB || 'poseidon-v6-091', 1);
  const lines = abilityNames(pair().a);
  if (!lines.includes(ability)) ability = lines[0] || '';
}
document.addEventListener('click', e => {
  const p = e.target.closest('[data-ar-play]');
  if (p) return void play(p.dataset.arPlay);
  const v = e.target.closest('[data-ar-versao]');
  if (v && v.dataset.arVersao !== versao) {
    versao = v.dataset.arVersao;
    document.querySelectorAll('[data-ar-versao]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.arVersao === versao)));
    if (versao === 'publicada' && !pubOk) say('Arquivos publicados não encontrados.');
    showCollection(false);
    reload();
  }
});
document.addEventListener('change', e => {
  const k = e.target.dataset.ar;
  if (!k) return;
  if (k === 'a') cardA = e.target.value;
  if (k === 'b') cardB = e.target.value;
  if (k === 'quem') quem = e.target.value;
  if (k === 'ability') ability = e.target.value;
  if (k === 'a' || k === 'b') { showCollection(false); reload(); }
  if (k !== 'ability') {
    const lines = abilityNames(pair().a), sel = $('[data-ar=ability]');
    if (!lines.includes(ability)) ability = lines[0] || '';
    if (sel) { sel.disabled = !lines.length; sel.innerHTML = lines.length ? lines.map(l => `<option ${l === ability ? 'selected' : ''}>${esc(l)}</option>`).join('') : '<option>Esta carta não tem linha</option>'; }
  }
  paintInfo();
});
