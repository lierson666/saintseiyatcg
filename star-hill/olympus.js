// STAR HILL do Olympus Arena (autor, 29/10/2026): o painel cuida só do que o jogo novo lê —
// cartas do Card Forge (publicadas em card-forge/art-web/), decks iniciais de data/alpha-0.1/ e o guia de regras.
// Os módulos do jogo antigo (game-settings.json: áudio, HUD, telas, interações, cosméticos) ficam em star-hill.js, fora do menu.
import {loadCanon} from '../shared/canon-cards.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {canonIndex, validateDeck, colorErrors, DECK_SIZE, SPLASH_LIMIT} from '../shared/deck-v3.js';
import {loadTelas, mountTelas} from './telas-editor.js?v=20261102-som6';
import {EDITIONS, editionOf} from '../shared/editions.js?v=20261102-1';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const FACTIONS = ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis', 'Neutral'];
const DECK_FILES = ['../data/alpha-0.1/decks-proposta-d171.json', '../data/alpha-0.1/decks-preview.json', '../data/alpha-0.1/decks-competitivos.json'];
const PAGES = {
  visao: ['Visão geral', 'Olympus Arena, sob seu controle.'],
  cartas: ['Cartas · Card Forge', 'Cada carta, uma constelação.'],
  decks: ['Decks iniciais', 'Os decks prontos do jogo.'],
  telas: ['Telas e som', 'Telas, sons, músicas e animações do jogo.'],
  regras: ['Livro de regras', 'A fonte da verdade.'],
};
let forge = [], cards, decks = [], status = null, rules = null;

async function api(path, body) {
  const r = await fetch('/api/star-hill/' + path, body === undefined ? {} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.erro || 'Não foi possível concluir a operação.');
  return data;
}
const json = url => fetch(`${url}?t=${Date.now()}`, {cache: 'no-store'}).then(r => r.json());
function notice(text) { $('#notice').className = text ? 'notice' : ''; $('#notice').textContent = text || ''; }

// Mesmas fontes do lobby: D268 + cartas novas do export do Forge.
async function load() {
  const [canon, exported, ...files] = await Promise.all([json('../data/canon/d268.json'), json('../card-forge/art-web/cards.json'), ...DECK_FILES.map(u => json(u).catch(() => ({decks: []})))]);
  forge = (await json('../data/cards.json')).cartas;
  cards = loadCanon(canon);
  const index = canonIndex(canon);
  addPreviewCards(cards, index, exported.cartas);
  decks = files.flatMap(f => f.decks).map(d => ({...d, god: d.god || 'god-athena', errors: deckErrors(d, index)}));
  status = await api('jogo').catch(() => null);
}
const facOf = c => (c?.id || '').replace(/^god-/, '').split('-')[0];
function deckErrors(d, index) {
  return [...validateDeck(d, index), ...colorErrors(d, id => cards.get(id) && facOf(cards.get(id)))].map(e => e.code);
}
const count = d => d.main_deck.reduce((n, e) => n + e.quantity, 0);
const name = id => cards.get(id)?.name || id || '—';

// `compact`: uma linha só, na página Cartas, para o editor ganhar altura.
function publishBox(compact = false) {
  const when = status?.publicado_em ? new Date(status.publicado_em * 1000).toLocaleString('pt-BR') : 'nunca';
  const tag = status?.pendente ? '<span class="tag">Há mudanças não publicadas</span>' : '<span class="tag">Jogo em dia com o Forge</span>';
  if (compact) return `<section class="panel publish-bar" title="O jogo usa uma cópia leve das cartas do Card Forge. Publique depois de editar cartas, textos ou artes."><h2>Cartas no jogo</h2>${tag}<small>Última publicação: ${esc(when)}</small>
    <div class="actions"><button class="primary" data-action="publish">Publicar cartas no jogo</button><button data-action="publish-site" title="Envia cartas e artes ao saintseiyatcg.com (sem as artes -ref). A próxima partida online já usa a versão nova.">Publicar no site</button><a href="../playtest/" target="_blank" rel="noopener">Abrir jogo ↗</a></div></section>`;
  return `<section class="panel"><h2>Cartas no jogo</h2>
    <p class="hint">O jogo usa uma cópia leve das cartas do Card Forge. Depois de editar cartas, textos ou artes, publique para a próxima partida usar a versão nova.</p>
    <p>${status?.pendente ? '<span class="tag">Há mudanças não publicadas</span>' : '<span class="tag">Jogo em dia com o Forge</span>'} <small>Última publicação: ${esc(when)}</small></p>
    <div class="actions"><button class="primary" data-action="publish">Publicar cartas no jogo</button><button data-action="publish-site" title="Envia cartas e artes ao saintseiyatcg.com (sem as artes -ref). A próxima partida online já usa a versão nova.">Publicar no site</button><a href="../playtest/" target="_blank" rel="noopener">Abrir jogo ↗</a></div></section>`;
}
function overview() {
  const per = FACTIONS.map(f => [f, forge.filter(c => c.faccao === f).length]);
  const bad = decks.filter(d => d.errors.length).length;
  return `<div class="stats"><div class="stat"><b>${forge.length}</b><span>cartas no Card Forge</span></div>
    <div class="stat"><b>${decks.length}</b><span>decks iniciais${bad ? ` · ${bad} com erro` : ''}</span></div>
    <div class="stat"><b>${forge.filter(c => c.tipo === 'God').length}</b><span>Gods</span></div>
    <div class="stat"><b>${DECK_SIZE}</b><span>cartas por deck · até 3 cópias</span></div></div>
    <div class="grid">${publishBox()}<section class="panel"><h2>Cartas por facção</h2>
    <div class="table-wrap"><table><thead><tr><th>Facção</th><th>Cartas</th></tr></thead><tbody>${per.map(([f, n]) => `<tr><td>${f}</td><td>${n}</td></tr>`).join('')}</tbody></table></div>
    <div class="actions"><a href="#cartas">Editar cartas</a><a href="#decks">Ver decks</a><a href="#regras">Consultar regras</a></div></section></div>`;
}
// Lista de cartas com filtros de tipo e de facção, combináveis (autor, 31/10/2026), ao lado do Forge.
const CARD_TYPES = ['God', 'Devotee', 'Spell', 'Equipment', 'Domain'];
let cardFaction = '', cardType = '', cardCurrent = '', cardEdition = null;
const editionCards = edition => forge.filter(c => editionOf(c).code === edition.code);
const forgeUrl = () => `../card-forge/?edicao=${encodeURIComponent(cardEdition.code)}${cardCurrent ? `&card=${encodeURIComponent(cardCurrent)}` : ''}`;
// Entrar em outra edição limpa os filtros e abre a 1ª carta dela.
function openEdition(edition) {
  if (edition === cardEdition) return;
  cardEdition = edition;
  cardFaction = cardType = '';
  cardCurrent = edition ? editionCards(edition)[0]?.id || '' : '';
}
function editionsPage() {
  return `<section class="edition-picker" aria-label="Edições do jogo"><div class="edition-grid">${EDITIONS.map(e => {
    const list = editionCards(e);
    const tally = FACTIONS.map(f => [f, list.filter(c => c.faccao === f).length]).filter(([, n]) => n);
    return `<a class="edition-card" href="#cartas/${encodeURIComponent(e.code)}">
      <img src="../${esc(e.logo)}" alt="" width="900" height="300">
      <span class="edition-code">${esc(e.code)} · ${esc(e.language)} · ${e.year}</span>
      <h2>${esc(e.name)}</h2>
      <p class="edition-total"><b>${list.length}</b> cartas</p>
      <ul class="edition-tally">${tally.map(([f, n]) => `<li data-tone="${f}">${f} <b>${n}</b></li>`).join('')}</ul>
      <span class="edition-open">Abrir edição <span aria-hidden="true">→</span></span></a>`;
  }).join('')}</div></section>`;
}
function cardList() {
  const q = ($('#card-search')?.value || '').toLowerCase();
  const all = editionCards(cardEdition);
  const list = all.filter(c => (!cardType || c.tipo === cardType) && (!cardFaction || c.faccao === cardFaction) && `${c.nome_exibicao_en} ${c.id} ${c.faccao}`.toLowerCase().includes(q));
  const counter = $('#card-count');
  if (counter) counter.textContent = `${list.length} de ${all.length} cartas`;
  return list.length ? list.map(c => `<button class="card-row" data-action="edit-card" data-card="${esc(c.id)}" data-tone="${esc(c.faccao)}" aria-current="${c.id === cardCurrent}">
    <i aria-hidden="true"></i><span><b>${esc(c.nome_exibicao_en)}</b><small>${esc(c.id)}</small></span><em>${esc(c.tipo)}</em></button>`).join('') : '<p class="hint card-empty">Nenhuma carta encontrada.</p>';
}
function cardsPage() {
  // Tipo e facção em menus lado a lado (autor, 02/11/2026): os chips tomavam metade do painel e a lista ficava sem lugar.
  const filter = (id, label, all, options, on) => `<label class="card-filter ${on ? 'is-on' : ''}" ${FACTIONS.includes(on) ? `data-tone="${on}"` : ''}><small>${label}</small><select id="${id}"><option value="">${all}</option>${options.map(o => `<option ${o === on ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  return `${publishBox(true)}<div class="cards-workbench" style="margin-top:16px"><aside class="card-browser" aria-label="Catálogo de cartas"><div class="card-browser-head">
    <div class="edition-bar"><a href="#cartas" title="Trocar de edição"><span aria-hidden="true">←</span> Edições</a><b>${esc(cardEdition.name)}</b><span class="tag">${esc(cardEdition.code)}</span></div>
    <input class="search" id="card-search" placeholder="Buscar nome, ID ou facção" aria-label="Buscar carta">
    <div class="card-filters">${filter('card-type', 'Tipo', 'Todos', CARD_TYPES, cardType)}${filter('card-faction', 'Facção', 'Todas', FACTIONS, cardFaction)}</div>
    <small class="card-count" id="card-count"></small></div><div id="card-list" style="overflow:auto">${cardList()}</div></aside>
    <iframe class="forge-frame" id="forge" title="Card Forge — editor de cartas" src="${esc(forgeUrl())}"></iframe></div>`;
}
const ERR = {identity: 'carta fora das cores do God e do Domain', splash: `mais de ${SPLASH_LIMIT} cartas da facção do Domain`, copies: 'mais de 3 cópias', size: `deck sem ${DECK_SIZE} cartas`, domain: 'sem Domain', unknown: 'carta inexistente', outside: 'carta que não vai no deck', quantity: 'quantidade inválida'};
function decksPage() {
  return `<section class="panel"><h2>Decks prontos do Olympus Arena</h2>
    <p class="hint">Regra de montagem (guia §63): 1 God e 1 Domain; só cartas das cores do God, do Domain ou neutras; ${DECK_SIZE} cartas; até 3 cópias. Para montar ou alterar decks, use o deckbuilder do jogo.</p>
    <div class="table-wrap"><table><thead><tr><th>Deck</th><th>God</th><th>Domain</th><th>Cartas</th><th>Situação</th></tr></thead><tbody>
    ${decks.map(d => `<tr><td><b>${esc(d.alpha_nome || d.nome)}</b><small>${esc(d.id)}</small></td><td>${esc(name(d.god))}</td><td>${esc(name(d.domain_id))}</td><td>${count(d)}</td>
      <td>${d.errors.length ? `<span class="tag">Erro</span><small>${esc([...new Set(d.errors)].map(e => ERR[e] || e).join('; '))}</small>` : 'Válido'}</td></tr>`).join('')}
    </tbody></table></div><div class="actions"><a href="../playtest/" target="_blank" rel="noopener">Abrir deckbuilder do jogo ↗</a></div></section>`;
}
async function rulesPage() {
  rules ||= await api('regras');
  return `<section class="panel"><h2>Guia do jogo</h2><p class="hint">Texto oficial em docs/guia-do-jogo.md. Mudanças de regra passam pelo autor e entram no CHANGELOG-regras.md.</p>
    <textarea class="rule-editor" readonly aria-label="Guia do jogo">${esc(rules.conteudo)}</textarea></section>`;
}

async function render() {
  const [route, editionCode] = location.hash.slice(1).split('/');
  const id = PAGES[route] ? route : 'visao';
  const edition = id === 'cartas' && EDITIONS.find(e => e.code === decodeURIComponent(editionCode || '')) || null;
  openEdition(edition);
  $('#breadcrumb').textContent = edition ? `${PAGES[id][0]} / ${edition.name}` : PAGES[id][0];
  $('#page-title').textContent = id === 'cartas' && !edition ? 'Qual edição você vai abrir?' : PAGES[id][1];
  for (const a of document.querySelectorAll('.sidebar nav a')) a.toggleAttribute('aria-current', a.hash === '#' + id);
  if (id === 'telas') { await loadTelas(api); return mountTelas($('#content'), {api, notice}); }
  $('#content').innerHTML = id === 'cartas' ? (edition ? cardsPage() : editionsPage()) : id === 'decks' ? decksPage() : id === 'regras' ? await rulesPage() : overview();
  if (edition) $('#card-list').innerHTML = cardList(); // contador só existe depois do HTML
}
async function refresh() {
  try { notice(''); await load(); await render(); } catch (e) { notice(`Não foi possível carregar o projeto: ${e.message}`); }
}

function setMenu(closed) {
  const label = closed ? 'Abrir menu' : 'Recolher menu', toggle = $('#sidebarToggle');
  document.querySelector('.app-shell').classList.toggle('menu-closed', closed);
  toggle.setAttribute('aria-expanded', String(!closed));
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
}
try { setMenu(localStorage.getItem('starhill.menu') === 'closed'); } catch {}

document.addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'sidebarToggle') {
    const closed = !document.querySelector('.app-shell').classList.contains('menu-closed');
    setMenu(closed);
    try { localStorage.setItem('starhill.menu', closed ? 'closed' : 'open'); } catch {}
    return;
  }
  if (b.id === 'reload') return refresh();
  if (b.dataset.action === 'edit-card') {
    cardCurrent = b.dataset.card;
    const frame = $('#forge')?.contentWindow;
    // Forge já aberto: troca a carta sem recarregar; senão abre pelo ?card=.
    if (frame?.forge?.selectCard) frame.forge.selectCard(cardCurrent); else $('#forge').src = forgeUrl();
    document.querySelectorAll('.card-row').forEach(r => r.setAttribute('aria-current', String(r === b)));
  }
  if (b.dataset.action === 'publish') {
    b.disabled = true; b.textContent = 'Publicando…';
    try { const r = await api('publicar', {}); notice(`Publicado: ${r.mensagem}`); await load(); await render(); }
    catch (err) { notice(err.message); b.disabled = false; b.textContent = 'Publicar cartas no jogo'; }
  }
  if (b.dataset.action === 'publish-site') {
    b.disabled = true; b.textContent = 'Enviando ao site…';
    try { const r = await api('publicar-site', {}); notice(r.mensagem); await load(); await render(); }
    catch (err) { notice(err.message); b.disabled = false; b.textContent = 'Publicar no site'; }
  }
});
document.addEventListener('input', e => { if (e.target.id === 'card-search') $('#card-list').innerHTML = cardList(); });
document.addEventListener('change', e => {
  const {id, value} = e.target;
  if (id !== 'card-type' && id !== 'card-faction') return;
  if (id === 'card-type') cardType = value; else cardFaction = value;
  const label = e.target.closest('.card-filter');
  label.classList.toggle('is-on', !!value);
  if (id === 'card-faction') { if (value) label.dataset.tone = value; else delete label.dataset.tone; }
  $('#card-list').innerHTML = cardList();
});
window.addEventListener('hashchange', () => render().catch(e => notice(e.message)));
refresh();
