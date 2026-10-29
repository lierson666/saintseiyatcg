// Lobby do Saint Seiya TCG no estilo do MTG Arena: barra superior (Home, Decks, Options), botão Play com gaveta de modo e deck,
// tela de decks e criador de decks. A partida é o Olympus Arena (./divine/), que recebe os decks pela URL.
import {loadCanon} from '../shared/canon-cards.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {canonIndex, validateDeck, DECK_SIZE, COPY_LIMIT} from '../shared/deck-v3.js';
import {spellCategory} from './engine-v3/core.js';
import {renderLiveCard} from '../shared/live-card.js?v=20261028-5';
import {unlock, playMusic, setVolume, volume} from './audio.js';
import {loadMyDecks, saveMyDecks, findDeck} from './deck-store.js';

const root = document.getElementById('lobby');
const ART = '../card-forge/art-web/';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const KINDS = ['All', 'Devotee', 'Equipment', 'Technique', 'Moment', 'Domain'];
const COSTS = ['All', '1', '2', '3', '4', '5', '6', '7+'];
const FACTIONS = ['athena', 'poseidon', 'hades', 'ares', 'artemis'];
const symbol = f => `../CARD-TEMPLATE/symbols/${f}.png`;
// Filtro da coleção: os 5 Gods e as neutras (sem símbolo; botão cinza claro como o frame).
const PICKS = [...FACTIONS, 'neutral'];
const cap = f => f[0].toUpperCase() + f.slice(1);

let cards, index, forge, presets = [], gods = [];
const ui = {screen: 'home', play: false, mode: 'ai', deckA: null, deckB: null, first: 'random', big: null, notice: null, builder: null};
try { Object.assign(ui, JSON.parse(localStorage.getItem('sstcg.lobby.v1')) || {}, {screen: 'home', play: false, big: null, builder: null}); } catch { /* sem preferências salvas */ }
const remember = () => { try { localStorage.setItem('sstcg.lobby.v1', JSON.stringify({mode: ui.mode, deckA: ui.deckA, deckB: ui.deckB, first: ui.first})); } catch { /* idem */ } };

// ---------- Cartas ----------
const faction = card => (forge.get(card.id)?.faccao || card.id.replace(/^god-/, '').split('-')[0]).toLowerCase();
const godForge = godId => forge.get(`${godId.replace(/^god-/, '')}-001`);
const artOf = id => { const f = id.startsWith('god-') ? godForge(id) : forge.get(id); return f?.ilustracao ? ART + f.ilustracao : null; };
// Spell não existe para o jogador: é Technique ou Moment (tipo impresso; Athena Event/Miracle pela D194, core.js).
// Linha de tipo para o jogador: sem "Spell —", como na face da carta (live-card.js).
const typeText = c => c.type.replace(/^Spell\s*—\s*/, '');
const kindOf = c => c.kind === 'Divine Artifact' ? 'Equipment' : c.kind !== 'Spell' ? c.kind
  : c.type.match(/Moment|Technique/)?.[0] || spellCategory(Number(c.id.slice(-3)))?.category || 'Technique';
const sortCards = (a, b) => (a.kind === 'Domain') - (b.kind === 'Domain') || (a.cost?.amount ?? 0) - (b.cost?.amount ?? 0) || a.name.localeCompare(b.name);

function face(id, cls = '') {
  const c = cards.get(id), f = id.startsWith('god-') ? godForge(id) : forge.get(id);
  if (f) return `<div class="lb-card ${cls}" data-card="${id}">${renderLiveCard(f, {art: artOf(id)})}</div>`;
  return `<div class="lb-card lb-card--plain ${cls}" data-card="${id}"><b>${c.cost?.amount ?? ''}</b><strong>${esc(c.name)}</strong><small>${esc(typeText(c))}</small>
    ${c.atk != null ? `<em>${c.atk} / ${c.hp}</em>` : ''}</div>`;
}

// ---------- Decks ----------
const allDecks = () => [...presets.map(d => ({...d, preset: true})), ...loadMyDecks()];
const deckGod = d => d.god || 'god-athena';
const deckSize = d => d.main_deck.reduce((n, e) => n + e.quantity, 0);
// Identidade de cores (guia §63): facção do God, facção do Domain e neutras.
const deckFactions = d => new Set([faction(cards.get(deckGod(d))), d.domain_id && cards.get(d.domain_id) && faction(cards.get(d.domain_id)), 'neutral'].filter(Boolean));
function deckErrors(d) {
  const ok = deckFactions(d);
  return [...validateDeck(d, index), ...d.main_deck.filter(e => cards.get(e.card_id) && !ok.has(faction(cards.get(e.card_id))))
    .map(e => ({code: 'identity', card_id: e.card_id}))];
}
const deckValid = d => !deckErrors(d).length;
function deckCover(d) {
  const first = d.main_deck.map(e => e.card_id).find(id => artOf(id));
  return artOf(first || deckGod(d));
}
function deckBox(d, act) {
  const ok = deckValid(d), art = deckCover(d);
  return `<button class="lb-deck ${ok ? '' : 'is-incomplete'} ${ui.deckA === d.id && act === 'pick-a' ? 'is-picked' : ''} ${ui.deckB === d.id && act === 'pick-b' ? 'is-picked' : ''}"
    data-act="${act}" data-deck="${esc(d.id)}">
    <span class="lb-deck__art" style="${art ? `background-image:url('${art}')` : ''}"></span>
    <span class="lb-deck__name"><strong>${esc(d.alpha_nome || d.nome)}</strong>
      <small>${esc(cards.get(deckGod(d))?.name || '')} · ${ok ? `${deckSize(d)} cards` : `Incomplete · ${deckSize(d)}/${DECK_SIZE}`}${d.preset ? ' · Starter' : ''}</small></span>
  </button>`;
}

// ---------- Telas ----------
function topBar() {
  const tab = (s, label) => `<button class="lb-tab ${ui.screen === s ? 'is-active' : ''}" data-act="go" data-screen="${s}">${label}</button>`;
  return `<header class="lb-top">
    <img class="lb-top__logo" src="../LOGO/logo-web.webp" alt="Saint Seiya TCG">
    <nav class="lb-tabs">${tab('home', 'Home')}${tab('decks', 'Decks')}${tab('options', 'Options')}</nav>
    <span class="lb-top__tag">Alpha 0.1 · Engine 3.0</span>
  </header>`;
}

function home() {
  const deck = findDeck(ui.deckA, presets);
  return `<section class="lb-home">
    <div class="lb-hero" style="--hero:url('${artOf('god-athena') || ''}')">
      <div class="lb-hero__copy"><p>Olympus Arena</p><h1>Let your Cosmo burn.</h1>
        <span>Build a deck around your God and take it to the arena.</span></div>
    </div>
    <div class="lb-news">
      <button class="lb-news__tile" data-act="go" data-screen="decks" style="--tile:url('${artOf('athena-v6-001') || ''}')"><small>Decks</small><strong>Build your deck</strong></button>
      <button class="lb-news__tile" data-act="play" style="--tile:url('${artOf('athena-v6-003') || ''}')"><small>Battle</small><strong>Challenge the AI</strong></button>
      <button class="lb-news__tile" data-act="go" data-screen="decks" style="--tile:url('${artOf('god-poseidon') || ''}')"><small>New</small><strong>Poseidon, Hades, Ares and Artemis</strong></button>
    </div>
    <div class="lb-dock" ${ui.play ? 'hidden' : ''}>
      ${deck ? `<button class="lb-dock__deck" data-act="play"><span style="background-image:url('${deckCover(deck) || ''}')"></span><strong>${esc(deck.alpha_nome || deck.nome)}</strong></button>` : ''}
      <button class="lb-play" data-act="play">Play</button>
    </div>
    ${ui.play ? playPanel() : ''}
  </section>`;
}

function playPanel() {
  const decks = allDecks(), mode = (m, label) => `<button class="lb-mode ${ui.mode === m ? 'is-active' : ''}" data-act="mode" data-mode="${m}">${label}</button>`;
  const ready = [ui.deckA, ui.deckB].every(id => { const d = findDeck(id, presets); return d && deckValid(d); });
  return `<aside class="lb-panel" aria-label="Play">
    <header><h2>Play</h2><button class="lb-x" data-act="close-play" aria-label="Close">×</button></header>
    <div class="lb-modes">${mode('ai', 'Battle vs AI')}${mode('local', 'Local battle')}</div>
    <h3>${ui.mode === 'ai' ? 'Your deck' : 'Player A deck'}</h3><div class="lb-panel__decks">${decks.map(d => deckBox(d, 'pick-a')).join('')}</div>
    <h3>${ui.mode === 'ai' ? 'Rival deck · AI' : 'Player B deck'}</h3><div class="lb-panel__decks">${decks.map(d => deckBox(d, 'pick-b')).join('')}</div>
    <label class="lb-field">Opening initiative<select data-act="first">${[['random', 'Random'], ['A', ui.mode === 'ai' ? 'You' : 'Player A'], ['B', ui.mode === 'ai' ? 'AI' : 'Player B']]
      .map(([v, l]) => `<option value="${v}" ${ui.first === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <button class="lb-play lb-play--wide" data-act="start" ${ready ? '' : 'disabled'}>${ready ? 'Play' : 'Pick two complete decks'}</button>
  </aside>`;
}

function decksScreen() {
  return `<section class="lb-page"><header class="lb-page__head"><h1>Decks</h1><p>Starter decks are read-only. Open one to save your own copy.</p></header>
    <div class="lb-deckgrid"><button class="lb-deck lb-deck--new" data-act="new-deck"><span class="lb-deck__art"></span><span class="lb-deck__name"><strong>+ New deck</strong><small>Choose a God and start building</small></span></button>
    ${allDecks().map(d => deckBox(d, 'edit-deck')).join('')}</div></section>`;
}

function options() {
  const row = (k, label) => `<label class="lb-field lb-volume">${label}<input type="range" min="0" max="100" value="${Math.round(volume[k] * 100)}" data-act="volume" data-kind="${k}"><output>${Math.round(volume[k] * 100)}%</output></label>`;
  return `<section class="lb-page lb-options"><header class="lb-page__head"><h1>Options</h1><p>Match settings (speed, quality, timers) live in the arena's Settings button.</p></header>
    ${row('music', 'Music')}${row('sfx', 'Sound effects')}</section>`;
}

// ---------- Criador de decks ----------
function openBuilder(deck) {
  const base = deck ? structuredClone(deck) : {id: null, nome: 'New deck', god: 'god-athena', domain_id: null, main_deck: []};
  if (deck?.preset) { base.id = null; base.nome = `${deck.alpha_nome || deck.nome} (copy)`; delete base.preset; }
  base.god ||= 'god-athena';
  // show: facções visíveis na coleção (símbolos dos Gods, várias ao mesmo tempo); começa nas cores do deck.
  ui.builder = {deck: base, q: '', cost: 'All', kind: 'All', dirty: false, show: [...deckFactions(base)]};
  ui.screen = 'builder';
}
const count = (b, id) => b.deck.main_deck.find(e => e.card_id === id)?.quantity || 0;
function pool(b) {
  const factions = new Set(b.show.length ? b.show : PICKS);
  const q = b.q.trim().toLowerCase();
  // A coleção mostra os Gods marcados; a identidade do deck (God + Domain + neutras) é validada em deckErrors.
  return [...cards.values()].filter(c => c.kind !== 'God' && factions.has(faction(c))
    && (b.kind === 'All' || kindOf(c) === b.kind)
    && (b.cost === 'All' || (b.cost === '7+' ? (c.cost?.amount ?? 0) >= 7 : c.cost?.amount === Number(b.cost)))
    && (!q || `${c.name} ${c.text}`.toLowerCase().includes(q))).sort(sortCards);
}
function errorText(e) {
  const name = id => esc(cards.get(id)?.name || id);
  return {domain: 'Choose a Domain from the collection.', size: `${e.total} / ${DECK_SIZE} cards.`, copies: `${name(e.card_id)}: ${e.count} copies (max ${COPY_LIMIT}).`,
    unknown: `${name(e.card_id)} is not in the card pool.`, outside: `${name(e.card_id)} can't go in the main deck.`, identity: `${name(e.card_id)} is outside this deck's colors (God, Domain and neutral).`, quantity: `${name(e.card_id)}: invalid quantity.`}[e.code] || e.code;
}
function builder() {
  const b = ui.builder, d = b.deck, list = d.main_deck.map(e => ({...e, card: cards.get(e.card_id)})).filter(e => e.card).sort((x, y) => sortCards(x.card, y.card));
  const errors = deckErrors(d), size = deckSize(d), curve = [1, 2, 3, 4, 5, 6, 7].map(n => list.filter(e => (n === 7 ? (e.card.cost?.amount ?? 0) >= 7 : e.card.cost?.amount === n)).reduce((s, e) => s + e.quantity, 0));
  const peak = Math.max(1, ...curve), cards_ = pool(b);
  const pill = (key, v) => `<button class="lb-pill ${b[key] === v ? 'is-active' : ''}" data-act="filter" data-key="${key}" data-value="${v}">${v}</button>`;
  const domain = d.domain_id && cards.get(d.domain_id);
  return `<section class="lb-builder">
    <div class="lb-pool">
      <div class="lb-filters"><input type="search" placeholder="Search name or text" value="${esc(b.q)}" data-act="search" aria-label="Search cards">
        <div class="lb-pills" aria-label="Cost">${COSTS.map(v => pill('cost', v)).join('')}</div>
        <div class="lb-pills" aria-label="Type">${KINDS.map(v => pill('kind', v)).join('')}</div>
        <div class="lb-gods" role="group" aria-label="Show cards of">${PICKS.map(f => `<button class="lb-godpick ${b.show.includes(f) ? 'is-active' : ''}"
          data-act="show-god" data-faction="${f}" aria-pressed="${b.show.includes(f)}" title="${cards.get(`god-${f}`)?.name || 'Neutral'}">${f === 'neutral'
          ? '<span class="lb-godpick__neutral" aria-hidden="true"></span><span class="lb-sr">Neutral</span>' : `<img src="${symbol(f)}" alt="${f}">`}</button>`).join('')}</div></div>
      <div class="lb-grid">${cards_.map(c => {
        const n = count(b, c.id), isDomain = c.kind === 'Domain', on = isDomain ? d.domain_id === c.id : n > 0;
        return `<button class="lb-slot ${on ? 'is-in' : ''} ${!isDomain && n >= COPY_LIMIT ? 'is-max' : ''}" data-act="${isDomain ? 'set-domain' : 'add'}" data-id="${c.id}" aria-label="${esc(c.name)}">
          ${face(c.id)}<i class="lb-slot__count">${isDomain ? (on ? 'Domain' : 'Set Domain') : `${n} / ${COPY_LIMIT}`}</i></button>`;
      }).join('') || '<p class="lb-empty">No cards for this God yet.</p>'}</div>
    </div>
    <aside class="lb-list">
      <input class="lb-list__name" value="${esc(d.nome)}" data-act="rename" aria-label="Deck name">
      <label class="lb-field">God<select data-act="god">${gods.map(g => `<option value="${g.id}" ${d.god === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
      <label class="lb-field">Domain<select data-act="domain"><option value="">Choose a Domain</option>${FACTIONS.map(f => {
        const list = [...cards.values()].filter(c => c.kind === 'Domain' && faction(c) === f).sort(sortCards);
        return list.length ? `<optgroup label="${esc(cards.get(`god-${f}`)?.name || f)}">${list.map(c => `<option value="${c.id}" ${d.domain_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>` : '';
      }).join('')}</select></label>
      <div class="lb-list__god" style="background-image:url('${artOf(d.god) || ''}')"><span>${[...deckFactions(d)].filter(f => f !== 'neutral').map(f => `<img src="${symbol(f)}" alt="">`).join('')}${esc(cards.get(d.god)?.name || '')}</span>
        <small>${domain ? esc(domain.name) : 'No Domain yet'}</small></div>
      <div class="lb-list__count ${size === DECK_SIZE ? 'is-full' : ''}"><strong>${size}</strong> / ${DECK_SIZE}</div>
      <div class="lb-curve" aria-label="Cost curve">${curve.map((n, i) => `<span style="--h:${n / peak}"><i>${n || ''}</i><b>${i === 6 ? '7+' : i + 1}</b></span>`).join('')}</div>
      <ol class="lb-strips">${list.map(e => `<li><button class="lb-strip" data-act="remove" data-id="${e.card_id}" data-card="${e.card_id}" style="--art:url('${artOf(e.card_id) || ''}')">
        <b class="lb-gem ${e.card.cost?.unit || ''}">${e.card.cost?.amount ?? '–'}</b><span>${esc(e.card.name)}</span><em>×${e.quantity}</em></button></li>`).join('')
        || '<li class="lb-empty">Click cards in the collection to add them.</li>'}</ol>
      ${errors.length ? `<ul class="lb-errors">${errors.slice(0, 4).map(e => `<li>${errorText(e)}</li>`).join('')}</ul>` : '<p class="lb-ok">Deck ready to play.</p>'}
      <div class="lb-list__actions">${d.id ? '<button class="lb-ghost" data-act="delete-deck">Delete</button>' : ''}
        <button class="lb-ghost" data-act="go" data-screen="decks">Cancel</button><button class="lb-play lb-play--small" data-act="save-deck">Done</button></div>
    </aside>
  </section>`;
}

// Carta grande (botão direito): a carta e, ao lado, o texto canônico do D268 em tamanho de leitura.
// Linhas de cabeçalho viram fichas (custo, tipo, ATK/HP...); o resto são habilidades, com o nome em destaque.
const HEADER = /^(\d{3} — |Rarity:|Type:|Casting Cost:|ATK:|HP:|Cosmoble:|Auto-Equip|Equip \{|SOUL \d|God — )/;
function cardInfo(id) {
  const c = cards.get(id), f = id.startsWith('god-') ? godForge(id) : forge.get(id);
  const lines = c.text.split('\n').map(l => l.trim()).filter(Boolean);
  const subtitle = lines[1] && !HEADER.test(lines[1]) ? lines[1] : '';
  const rules = lines.slice(subtitle ? 2 : 1).filter(l => !HEADER.test(l)).map(l => {
    const m = l.match(/^([A-Z][^—:.]{1,38}) — (.*)$/);
    return `<p>${m ? `<b>${esc(m[1])}</b> — ${esc(m[2])}` : esc(l)}</p>`;
  }).join('');
  const chip = (label, value, cls = '') => (value == null || value === '' ? '' : `<span class="lb-chip ${cls}"><small>${label}</small>${esc(value)}</span>`);
  const equip = c.text.match(/Equip \{(\d+)\} — (.+)/), auto = c.autoEquip.join(' / ');
  const n = ui.screen === 'builder' && !['God', 'Domain'].includes(c.kind) ? count(ui.builder, id) : null;
  return `<section class="lb-info" data-act="stay" aria-label="${esc(c.name)} details">
    <button class="lb-x lb-info__close" data-act="close-big" aria-label="Close">×</button>
    <p class="lb-info__type">${esc(typeText(c))}</p>
    <h2>${esc(c.name)}</h2>${subtitle ? `<p class="lb-info__sub">${esc(subtitle)}</p>` : ''}
    <div class="lb-chips">${chip('Cost', c.cost ? `${c.cost.amount} ${c.cost.unit === 'base' ? 'Base' : 'Latent'}` : null, 'is-cost')}
      ${chip('ATK', c.atk, 'is-atk')}${chip('HP', c.hp, 'is-hp')}${chip('Soul', c.soul)}${chip('Awaken', c.awaken)}
      ${chip('Rarity', c.rarity)}${chip('Cosmoble', c.cosmoble == null ? null : c.cosmoble ? 'Yes' : 'No')}
      ${chip('Auto-Equip', auto)}${chip('Equip', equip ? `${equip[1]} · ${equip[2]}` : null)}</div>
    ${c.keywords.length ? `<div class="lb-kws">${c.keywords.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
    <div class="lb-info__rules">${rules}</div>
    ${f?.flavour_en ? `<p class="lb-info__flavour">${esc(f.flavour_en)}</p>` : ''}
    ${n == null ? '' : `<div class="lb-info__deck"><span>In deck <b>${n}</b> / ${COPY_LIMIT}</span>
      <button class="lb-ghost" data-act="remove" data-id="${id}" ${n ? '' : 'disabled'} aria-label="Remove one">−</button>
      <button class="lb-play lb-play--small" data-act="add" data-id="${id}" ${n >= COPY_LIMIT || deckSize(ui.builder.deck) >= DECK_SIZE ? 'disabled' : ''}>Add</button></div>`}
  </section>`;
}
// Aviso modal (carta fora da identidade de cor do deck).
function notice() {
  return ui.notice ? `<div class="lb-notice" role="alertdialog" aria-modal="true" aria-labelledby="lb-notice-t"><div class="lb-notice__box">
    <h3 id="lb-notice-t">${esc(ui.notice.title)}</h3><p>${esc(ui.notice.text)}</p>
    <button class="lb-play lb-play--small" data-act="close-notice" autofocus>OK</button></div></div>` : '';
}
function bigCard() {
  return ui.big ? `<div class="lb-big" data-act="close-big" role="dialog" aria-label="Card">${face(ui.big, 'lb-card--big')}${cardInfo(ui.big)}</div>` : '';
}

// Redesenha tudo; guarda a rolagem das colunas para o clique não voltar a lista ao topo.
const SCROLLERS = ['.lb-body', '.lb-grid', '.lb-list', '.lb-panel'];
function render() {
  const keep = SCROLLERS.map(sel => root.querySelector(sel)?.scrollTop || 0), screen = root.dataset.screen;
  const body = {home, decks: decksScreen, options, builder}[ui.screen]();
  root.innerHTML = `${topBar()}<div class="lb-body lb-body--${ui.screen}">${body}</div>${bigCard()}${notice()}`;
  if (screen === ui.screen) SCROLLERS.forEach((sel, i) => { const el = root.querySelector(sel); if (el) el.scrollTop = keep[i]; });
  root.dataset.screen = ui.screen;
}

// ---------- Ações ----------
function setCount(id, delta) {
  const list = ui.builder.deck.main_deck, entry = list.find(e => e.card_id === id), n = (entry?.quantity || 0) + delta;
  // Identidade de cor (guia §63): só cartas do God, do Domain ou neutras entram.
  const card = cards.get(id), ok = deckFactions(ui.builder.deck);
  if (delta > 0 && card && !ok.has(faction(card))) {
    const names = [...ok].map(f => f === 'neutral' ? 'neutral' : cap(f)), f = cap(faction(card));
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
    ui.big = null;
    ui.notice = {title: 'Outside this deck\'s colors', text: `${card.name} is ${/^[AEIOU]/.test(f) ? 'an' : 'a'} ${f} card. This deck can only use ${list} cards. Change the God or the Domain to add it.`};
    return;
  }
  if (n > COPY_LIMIT || (delta > 0 && deckSize(ui.builder.deck) >= DECK_SIZE)) return;
  if (!entry) list.push({card_id: id, quantity: n});
  else if (n <= 0) list.splice(list.indexOf(entry), 1);
  else entry.quantity = n;
  ui.builder.dirty = true;
}
function saveDeck() {
  const d = ui.builder.deck, mine = loadMyDecks();
  d.id ||= `my-${Date.now().toString(36)}`;
  const at = mine.findIndex(x => x.id === d.id);
  if (at >= 0) mine[at] = d; else mine.push(d);
  saveMyDecks(mine);
  if (!ui.deckA) ui.deckA = d.id;
  remember();
}
function startMatch() {
  const a = findDeck(ui.deckA, presets), b = findDeck(ui.deckB, presets);
  const q = new URLSearchParams({deckA: a.id, deckB: b.id, ai: ui.mode === 'ai' ? 'B' : 'none', godB: deckGod(b).replace(/^god-/, '')});
  if (ui.first !== 'random') q.set('first', ui.first);
  location.href = `./divine/?${q}`;
}

const actions = {
  go: t => { ui.screen = t.dataset.screen; ui.play = false; },
  play: () => { ui.screen = 'home'; ui.play = true; },
  'close-play': () => { ui.play = false; },
  mode: t => { ui.mode = t.dataset.mode; remember(); },
  'pick-a': t => { ui.deckA = t.dataset.deck; remember(); },
  'pick-b': t => { ui.deckB = t.dataset.deck; remember(); },
  start: startMatch,
  'new-deck': () => openBuilder(null),
  'edit-deck': t => openBuilder(allDecks().find(d => d.id === t.dataset.deck)),
  filter: t => { ui.builder[t.dataset.key] = t.dataset.value; },
  add: t => setCount(t.dataset.id, 1),
  remove: t => setCount(t.dataset.id, -1),
  'set-domain': t => { ui.builder.deck.domain_id = t.dataset.id; ui.builder.dirty = true; },
  'show-god': t => { const s = ui.builder.show, f = t.dataset.faction; ui.builder.show = s.includes(f) ? s.filter(x => x !== f) : [...s, f]; },
  'save-deck': () => { saveDeck(); ui.screen = 'decks'; },
  'delete-deck': () => {
    if (!confirm(`Delete "${ui.builder.deck.nome}"?`)) return;
    saveMyDecks(loadMyDecks().filter(d => d.id !== ui.builder.deck.id));
    ui.screen = 'decks';
  },
  'close-big': () => { ui.big = null; },
  'close-notice': () => { ui.notice = null; },
};

root.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t || !actions[t.dataset.act] || t.disabled) return;
  if (t.dataset.act === 'go' && ui.screen === 'builder' && ui.builder.dirty && !confirm('Leave without saving this deck?')) return;
  actions[t.dataset.act](t);
  render();
});
// Botão direito mostra a carta grande, como no jogo.
root.addEventListener('contextmenu', e => {
  const t = e.target.closest('[data-card]');
  if (!t) return;
  e.preventDefault();
  ui.big = t.dataset.card;
  render();
});
root.addEventListener('change', e => {
  const t = e.target, act = t.dataset.act;
  if (act === 'first') { ui.first = t.value; remember(); }
  else if (act === 'god') { ui.builder.deck.god = t.value; ui.builder.dirty = true; ui.builder.show = [...new Set([...ui.builder.show, faction(cards.get(t.value))])]; }
  else if (act === 'domain') { ui.builder.deck.domain_id = t.value || null; ui.builder.dirty = true; }
  else if (act === 'rename') { ui.builder.deck.nome = t.value.trim() || 'New deck'; ui.builder.dirty = true; }
  else return;
  render();
});
root.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.act === 'volume') { setVolume(t.dataset.kind, t.value / 100); t.nextElementSibling.value = `${t.value}%`; }
  if (t.dataset.act === 'search') {
    ui.builder.q = t.value;
    const at = t.selectionStart;
    render();
    const input = root.querySelector('[data-act="search"]');
    input.focus(); input.setSelectionRange(at, at);
  }
});
addEventListener('keydown', e => { if (e.key === 'Escape' && (ui.big || ui.play || ui.notice)) { ui.big = null; ui.play = false; ui.notice = null; render(); } });
// Áudio só começa após o primeiro gesto do jogador (política dos navegadores).
addEventListener('pointerdown', () => { unlock(); playMusic('menu'); }, {once: true});

async function init() {
  const get = u => fetch(u).then(r => { if (!r.ok) throw Error(`Missing ${u}`); return r.json(); });
  const [canon, deckData, art, previewDecks] = await Promise.all([get('../data/canon/d268.json'), get('../data/alpha-0.1/decks-proposta-d171.json'),
    get(`${ART}cards.json`).catch(() => ({cartas: []})), get('../data/alpha-0.1/decks-preview.json').catch(() => ({decks: []}))]);
  cards = loadCanon(canon); index = canonIndex(canon);
  forge = new Map(art.cartas.map(c => [c.id, c]));
  addPreviewCards(cards, index, art.cartas);
  presets = [...deckData.decks, ...previewDecks.decks];
  gods = canon.gods.map(g => cards.get(g.id.toLowerCase()));
  if (!findDeck(ui.deckA, presets)) ui.deckA = presets[0]?.id;
  if (!findDeck(ui.deckB, presets)) ui.deckB = presets[1]?.id || presets[0]?.id;
  render();
}
init().catch(e => { root.innerHTML = `<p class="lb-loading">${esc(e.message)}</p>`; console.error(e); });
