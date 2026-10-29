// STAR HILL do Olympus Arena (autor, 29/10/2026): o painel cuida só do que o jogo novo lê —
// cartas do Card Forge (publicadas em card-forge/art-web/), decks iniciais de data/alpha-0.1/ e o guia de regras.
// Os módulos do jogo antigo (game-settings.json: áudio, HUD, telas, interações, cosméticos) ficam em star-hill.js, fora do menu.
import {loadCanon} from '../shared/canon-cards.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {canonIndex, validateDeck, DECK_SIZE} from '../shared/deck-v3.js';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const FACTIONS = ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis', 'Neutral'];
const DECK_FILES = ['../data/alpha-0.1/decks-proposta-d171.json', '../data/alpha-0.1/decks-preview.json'];
const PAGES = {
  visao: ['Visão geral', 'Olympus Arena, sob seu controle.'],
  cartas: ['Cartas · Card Forge', 'Cada carta, uma constelação.'],
  decks: ['Decks iniciais', 'Os decks prontos do jogo.'],
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
  const [canon, exported, ...files] = await Promise.all([json('../data/canon/d268.json'), json('../card-forge/art-web/cards.json'), ...DECK_FILES.map(json)]);
  forge = (await json('../data/cards.json')).cartas;
  cards = loadCanon(canon);
  const index = canonIndex(canon);
  addPreviewCards(cards, index, exported.cartas);
  decks = files.flatMap(f => f.decks).map(d => ({...d, god: d.god || 'god-athena', errors: deckErrors(d, index)}));
  status = await api('jogo').catch(() => null);
}
const facOf = c => (c?.id || '').replace(/^god-/, '').split('-')[0];
function deckErrors(d, index) {
  const ok = new Set([facOf(cards.get(d.god || 'god-athena')), facOf(cards.get(d.domain_id)), 'neutral']);
  const off = d.main_deck.filter(e => cards.get(e.card_id) && !ok.has(facOf(cards.get(e.card_id))));
  return [...validateDeck(d, index).map(e => e.code), ...off.map(() => 'identity')];
}
const count = d => d.main_deck.reduce((n, e) => n + e.quantity, 0);
const name = id => cards.get(id)?.name || id || '—';

function publishBox() {
  const when = status?.publicado_em ? new Date(status.publicado_em * 1000).toLocaleString('pt-BR') : 'nunca';
  return `<section class="panel"><h2>Cartas no jogo</h2>
    <p class="hint">O jogo usa uma cópia leve das cartas do Card Forge. Depois de editar cartas, textos ou artes, publique para a próxima partida usar a versão nova.</p>
    <p>${status?.pendente ? '<span class="tag">Há mudanças não publicadas</span>' : '<span class="tag">Jogo em dia com o Forge</span>'} <small>Última publicação: ${esc(when)}</small></p>
    <div class="actions"><button class="primary" data-action="publish">Publicar cartas no jogo</button><a href="../playtest/" target="_blank" rel="noopener">Abrir jogo ↗</a></div></section>`;
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
// Lista de cartas com filtro de facção ao lado do Forge (mesmo visual do Star Hill anterior).
let cardFaction = '', cardCurrent = '';
function cardList() {
  const q = ($('#card-search')?.value || '').toLowerCase();
  const list = forge.filter(c => (!cardFaction || c.faccao === cardFaction) && `${c.nome_exibicao_en} ${c.id} ${c.faccao}`.toLowerCase().includes(q));
  const counter = $('#card-count');
  if (counter) counter.textContent = `${list.length} de ${forge.length} cartas`;
  return list.length ? list.map(c => `<button class="card-row" data-action="edit-card" data-card="${esc(c.id)}" data-tone="${esc(c.faccao)}" aria-current="${c.id === cardCurrent}">
    <i aria-hidden="true"></i><span><b>${esc(c.nome_exibicao_en)}</b><small>${esc(c.id)}</small></span><em>${esc(c.tipo)}</em></button>`).join('') : '<p class="hint card-empty">Nenhuma carta encontrada.</p>';
}
function cardsPage() {
  const chip = (f, label) => `<button class="chip" data-action="card-faction" data-faction="${f}" ${f ? `data-tone="${f}"` : ''} aria-pressed="${f === cardFaction}">${label}</button>`;
  return `${publishBox()}<div class="cards-workbench" style="margin-top:20px"><aside class="card-browser" aria-label="Catálogo de cartas"><div class="card-browser-head">
    <input class="search" id="card-search" placeholder="Buscar nome, ID ou facção" aria-label="Buscar carta">
    <div class="chips" role="group" aria-label="Filtrar por facção">${chip('', 'Todas')}${FACTIONS.map(f => chip(f, f)).join('')}</div>
    <small class="card-count" id="card-count"></small></div><div id="card-list" style="overflow:auto">${cardList()}</div></aside>
    <iframe class="forge-frame" id="forge" title="Card Forge — editor de cartas" src="../card-forge/${cardCurrent ? `?card=${encodeURIComponent(cardCurrent)}` : ''}"></iframe></div>`;
}
const ERR = {identity: 'carta fora das cores do God e do Domain', copies: 'mais de 3 cópias', size: `deck sem ${DECK_SIZE} cartas`, domain: 'sem Domain', unknown: 'carta inexistente', outside: 'carta que não vai no deck', quantity: 'quantidade inválida'};
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
  const id = PAGES[location.hash.slice(1)] ? location.hash.slice(1) : 'visao';
  $('#breadcrumb').textContent = PAGES[id][0];
  $('#page-title').textContent = PAGES[id][1];
  for (const a of document.querySelectorAll('.sidebar nav a')) a.toggleAttribute('aria-current', a.hash === '#' + id);
  $('#content').innerHTML = id === 'cartas' ? cardsPage() : id === 'decks' ? decksPage() : id === 'regras' ? await rulesPage() : overview();
  if (id === 'cartas') $('#card-list').innerHTML = cardList(); // contador só existe depois do HTML
}
async function refresh() {
  try { notice(''); await load(); await render(); } catch (e) { notice(`Não foi possível carregar o projeto: ${e.message}`); }
}

document.addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'reload') return refresh();
  if (b.dataset.action === 'card-faction') {
    cardFaction = b.dataset.faction;
    document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    $('#card-list').innerHTML = cardList();
  }
  if (b.dataset.action === 'edit-card') {
    cardCurrent = b.dataset.card;
    const frame = $('#forge')?.contentWindow;
    // Forge já aberto: troca a carta sem recarregar; senão abre pelo ?card=.
    if (frame?.forge?.selectCard) frame.forge.selectCard(cardCurrent); else $('#forge').src = `../card-forge/?card=${encodeURIComponent(cardCurrent)}`;
    document.querySelectorAll('.card-row').forEach(r => r.setAttribute('aria-current', String(r === b)));
  }
  if (b.dataset.action === 'publish') {
    b.disabled = true; b.textContent = 'Publicando…';
    try { const r = await api('publicar', {}); notice(`Publicado: ${r.mensagem}`); await load(); await render(); }
    catch (err) { notice(err.message); b.disabled = false; b.textContent = 'Publicar cartas no jogo'; }
  }
});
document.addEventListener('input', e => { if (e.target.id === 'card-search') $('#card-list').innerHTML = cardList(); });
window.addEventListener('hashchange', () => render().catch(e => notice(e.message)));
refresh();
