// Lobby do Saint Seiya TCG no estilo do MTG Arena: barra superior (Home, Decks, Options), botão Play com gaveta de modo e deck,
// tela de decks e criador de decks. A partida é o Olympus Arena (./divine/), que recebe os decks pela URL.
import {loadCanon} from '../shared/canon-cards.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {canonIndex, validateDeck, DECK_SIZE, COPY_LIMIT} from '../shared/deck-v3.js';
import {spellCategory} from './engine-v3/core.js';
import {renderLiveCard} from '../shared/live-card.js?v=20261029-forge';
import {unlock, playMusic, setVolume, volume} from './audio.js';
import {loadMyDecks, saveMyDecks, findDeck} from './deck-store.js';
import {mountKV} from '../shared/kv-sky.js?v=20261029-2';
import {countryOptions, countryName} from '../shared/countries.js?v=20261029-1';
import {startPresence} from '../shared/presence.js?v=20261029-1';
import {mountSocial} from './social.js?v=20261029-3';

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
const ui = {screen: 'home', play: false, mode: 'ai', deckA: null, deckB: null, first: 'random', big: null, notice: null, picker: null, builder: null};
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
  if (d.thumb && artOf(d.thumb)) return artOf(d.thumb); // capa escolhida no deckbuilder
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
    <nav class="lb-tabs">${tab('home', 'Home')}${tab('decks', 'Decks')}${tab('profile', 'Profile')}${tab('options', 'Options')}</nav>
    <span class="lb-top__tag">Alpha 0.1 · Engine 3.0</span>
    ${ui.user?.complete ? `<button class="lb-socialbtn" data-act="friends" aria-label="Friends">Friends ${socialBadge()}</button>` : ''}
    ${ui.user ? `<span class="lb-user"><i class="kv-dot" aria-hidden="true"></i>${esc(ui.user.username || ui.user.name)}<button class="kv-ghost" data-act="signout">Sign out</button></span>` : ''}
  </header>`;
}

// Contador do botão Friends: amigos online e pedidos pendentes (atualizado pelo painel sem redesenhar o lobby).
let social = null;
const socialBadge = () => `<span class="lb-socialbtn__count">${ui.online || 0}</span>${ui.requests ? `<span class="lb-socialbtn__req" aria-label="${ui.requests} friend requests">${ui.requests}</span>` : ''}`;
function startSocial() {
  if (social || !ui.user?.complete) return;
  startPresence('online');
  social = mountSocial({api, avatarOf: id => artOf(id || 'god-athena'), onCount: (online, requests) => {
    ui.online = online; ui.requests = requests;
    const b = root.querySelector('.lb-socialbtn'); if (b) b.innerHTML = `Friends ${socialBadge()}`;
  }});
}

// Carrossel da home (KV oficial): um God por slide, com a arte do Forge ao fundo.
const SLIDES = [
  {god: 'god-athena', stamp: 'Olympus Arena', lyric: 'Let your', word: 'Cosmo burn', text: 'Build a deck around your God and take it to the arena.'},
  {god: 'god-poseidon', stamp: 'The seas rise', lyric: 'Lord of the', word: 'Seven Seas', text: 'Poseidon calls his Marina Generals to war.'},
  {god: 'god-hades', stamp: 'The underworld wakes', lyric: 'The armies of', word: 'Hades', text: 'Specters march from the Underworld.'},
  {god: 'god-ares', stamp: 'Blood and fury', lyric: 'The war god', word: 'Ares', text: 'Berserkers feed on every fallen Saint.'},
  {god: 'god-artemis', stamp: 'Moonlight hunt', lyric: 'The silver bow of', word: 'Artemis', text: 'Her Angels strike from the night sky.'},
];

function home() {
  const deck = findDeck(ui.deckA, presets);
  const n = SLIDES.length, i = ((ui.slide || 0) % n + n) % n, slide = SLIDES[i];
  return `<section class="lb-home">
    <div class="lb-hero kv-card" style="--hero:url('${artOf(slide.god) || ''}')">
      <div class="lb-hero__copy"><p class="kv-stamp kv-stamp--gold">${slide.stamp}</p>
        <h1><span class="kv-lyric">${slide.lyric}</span><span class="kv-cosmo">${slide.word}</span></h1>
        <span>${slide.text}</span></div>
      <button class="lb-hero__arrow is-prev" data-act="slide" data-step="-1" aria-label="Previous">‹</button>
      <button class="lb-hero__arrow is-next" data-act="slide" data-step="1" aria-label="Next">›</button>
      <div class="lb-hero__dots">${SLIDES.map((_, j) => `<i class="${j === i ? 'is-on' : ''}"></i>`).join('')}</div>
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

// ---------- Perfil (docs/contas-amigos-chat.md, etapa 1) ----------
// Avatar: arte de um God (por ora); o código de amigo é o que os amigos usam para adicionar.
const AVATARS = ['god-athena', 'god-poseidon', 'god-hades', 'god-ares', 'god-artemis'];
const api = (path, method = 'GET', body) => fetch(path, {method, credentials: 'same-origin', headers: body ? {'Content-Type': 'application/json'} : {}, body: body && JSON.stringify(body)})
  .then(async r => { const data = await r.json().catch(() => ({})); if (!r.ok) throw Error(data.error || 'Something went wrong. Please try again.'); return data; });
function profileScreen() {
  const u = ui.user, msg = k => ui.profileMsg?.[k] ? `<p class="kv-status ${ui.profileMsg[k].kind}" role="status">${esc(ui.profileMsg[k].text)}</p>` : '<p class="kv-status" role="status"></p>';
  if (!u) return `<section class="lb-page"><header class="lb-page__head"><h1>Profile</h1><p>Sign in to see your profile.</p></header><a class="kv-button lb-linkbtn" href="/login/?v=3&next=/playtest/">Sign in</a></section>`;
  if (!u.complete) return `<section class="lb-page lb-profile"><header class="lb-page__head"><h1>Complete your profile</h1><p>Choose the username your friends will see.</p></header>
    <form class="kv-card lb-form" data-form="complete">
      <label class="kv-field"><span class="kv-stamp">Username</span><input class="kv-input" name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" spellcheck="false"></label>
      <label class="kv-field"><span class="kv-stamp">Country</span><select class="kv-input" name="country">${countryOptions(u.country || 'BR')}</select></label>
      <label class="lb-consent"><input type="checkbox" name="accept_terms" required> I agree to the <a href="/privacy/" target="_blank" rel="noopener">privacy terms</a>.</label>
      <button class="kv-button">Save</button>${msg('complete')}</form></section>`;
  const avatar = u.avatar_card || 'god-athena';
  return `<section class="lb-page lb-profile">
    <header class="lb-profile__head kv-card">
      <span class="lb-avatar" style="background-image:url('${artOf(avatar) || ''}')"></span>
      <div><p class="kv-stamp kv-stamp--gold">${esc(countryName(u.country))}</p><h1>${esc(u.username)}</h1>
        <p class="lb-code"><span class="kv-stamp">Friend code</span><b>${esc(u.friend_code)}</b><button class="kv-ghost" data-act="copy-code">${ui.copied ? 'Copied' : 'Copy'}</button></p></div>
    </header>
    <div class="lb-profile__grid">
      <form class="kv-card lb-form" data-form="me">
        <h2>Account</h2>
        <div class="lb-avatars" role="radiogroup" aria-label="Avatar">${AVATARS.map(id => `<button type="button" role="radio" aria-checked="${id === avatar}" class="lb-avatar lb-avatar--pick ${id === avatar ? 'is-on' : ''}" data-act="avatar" data-id="${id}" style="background-image:url('${artOf(id) || ''}')" aria-label="${esc(cards.get(id)?.name || id)}"></button>`).join('')}</div>
        <label class="kv-field"><span class="kv-stamp">Full name</span><input class="kv-input" name="name" value="${esc(u.name)}" required maxlength="80" autocomplete="name"></label>
        <label class="kv-field"><span class="kv-stamp">Email</span><input class="kv-input" value="${esc(u.email)}" disabled></label>
        <label class="kv-field"><span class="kv-stamp">Country</span><select class="kv-input" name="country">${countryOptions(u.country)}</select></label>
        <label class="kv-field"><span class="kv-stamp">Phone · optional</span><input class="kv-input" name="phone" type="tel" value="${esc(u.phone || '')}" maxlength="20" autocomplete="tel"></label>
        <button class="kv-button">Save</button>${msg('me')}
      </form>
      <div class="lb-profile__side">
        <form class="kv-card lb-form" data-form="password">
          <h2>Password</h2>
          <label class="kv-field"><span class="kv-stamp">Current password</span><input class="kv-input" name="current" type="password" required autocomplete="current-password"></label>
          <label class="kv-field"><span class="kv-stamp">New password</span><input class="kv-input" name="new" type="password" required minlength="10" autocomplete="new-password"></label>
          <button class="kv-ghost">Change password</button>${msg('password')}
        </form>
        <form class="kv-card lb-form lb-danger" data-form="delete">
          <h2>Delete account</h2><p>This removes your account, sessions and decks. It cannot be undone.</p>
          <label class="kv-field"><span class="kv-stamp">Password</span><input class="kv-input" name="password" type="password" required autocomplete="current-password"></label>
          <button class="kv-ghost">Delete my account</button>${msg('delete')}
        </form>
      </div>
    </div></section>`;
}
async function submitProfile(form) {
  const kind = form.dataset.form, f = Object.fromEntries(new FormData(form));
  const say = (text, k) => { ui.profileMsg = {[kind]: {text, kind: k}}; render(); };
  try {
    if (kind === 'complete') { ui.user = await api('/api/me', 'PATCH', {username: f.username, country: f.country, accept_terms: 'accept_terms' in f}); startSocial(); }
    if (kind === 'me') { ui.user = await api('/api/me', 'PATCH', {name: f.name, country: f.country, phone: f.phone}); return say('Saved.', 'ok'); }
    if (kind === 'password') { await api('/api/me/password', 'POST', {current: f.current, new: f.new}); return say('Password changed. Other devices were signed out.', 'ok'); }
    if (kind === 'delete') {
      if (!confirm('Delete your account forever?')) return;
      await api('/api/me', 'DELETE', {password: f.password}); location.replace('/');
      return;
    }
    say('', '');
  } catch (e) { say(e.message, 'err'); }
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
      <div class="lb-cover" style="background-image:url('${deckCover(d) || ''}')"><span>${[...deckFactions(d)].filter(f => f !== 'neutral').map(f => `<img src="${symbol(f)}" alt="">`).join('')}${esc(cards.get(d.god)?.name || '')}</span>
        <small>${domain ? esc(domain.name) : 'No Domain yet'}</small></div>
      <div class="lb-picks">${[['god', 'God', d.god], ['domain', 'Domain', d.domain_id], ['thumb', 'Cover', d.thumb || d.god]].map(([k, label, id]) =>
        `<button class="lb-pick" data-act="open-picker" data-pick="${k}" aria-label="Choose ${label}">${id && cards.get(id) ? face(id, 'lb-card--mini') : '<span class="lb-pick__empty">+</span>'}<small>${label}</small></button>`).join('')}</div>
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
// Seletor visual (como o comandante do MTG Arena): God, Domain ou a carta de capa do deck.
function pickerOptions(kind, d) {
  if (kind === 'god') return gods.map(g => g.id);
  const domains = [...cards.values()].filter(c => c.kind === 'Domain').sort((a, b) => (faction(b) === faction(cards.get(d.god))) - (faction(a) === faction(cards.get(d.god))) || PICKS.indexOf(faction(a)) - PICKS.indexOf(faction(b)) || a.name.localeCompare(b.name));
  if (kind === 'domain') return domains.map(c => c.id);
  return [...new Set([d.god, d.domain_id, ...d.main_deck.map(e => e.card_id)].filter(id => id && cards.get(id)))];
}
function picker() {
  const kind = ui.picker, d = ui.builder?.deck;
  if (!kind || !d) return '';
  const current = {god: d.god, domain: d.domain_id, thumb: d.thumb || d.god}[kind];
  const title = {god: 'Choose your God', domain: 'Choose your Domain', thumb: 'Choose the deck cover'}[kind];
  return `<div class="lb-picker" role="dialog" aria-modal="true" aria-label="${title}"><div class="lb-picker__box"><header><h2>${title}</h2>
    <button class="lb-play lb-play--small" data-act="close-picker">Close</button></header>
    <div class="lb-picker__grid">${pickerOptions(kind, d).map(id => `<button class="lb-slot ${id === current ? 'is-in' : ''}" data-act="picked" data-id="${id}" aria-label="${esc(cards.get(id).name)}">${face(id)}</button>`).join('')}</div></div></div>`;
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
  const body = {home, decks: decksScreen, profile: profileScreen, options, builder}[ui.screen]();
  root.innerHTML = `${topBar()}<div class="lb-body lb-body--${ui.screen}">${body}</div>${bigCard()}${picker()}${notice()}`;
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
  avatar: async t => { try { ui.user = await api('/api/me', 'PATCH', {avatar_card: t.dataset.id}); } catch (e) { ui.profileMsg = {me: {text: e.message, kind: 'err'}}; } render(); },
  friends: () => social?.toggle(),
  'copy-code': async () => { await navigator.clipboard?.writeText(ui.user.friend_code).catch(() => {}); ui.copied = true; setTimeout(() => { ui.copied = false; render(); }, 1500); },
  slide: t => { ui.slide = (ui.slide || 0) + Number(t.dataset.step); },
  signout: async () => {
    await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'}).catch(() => {});
    location.replace('/login/?v=3');
  },
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
  'open-picker': t => { ui.picker = t.dataset.pick; },
  'close-picker': () => { ui.picker = null; },
  picked: t => {
    const b = ui.builder, id = t.dataset.id;
    if (ui.picker === 'god') { b.deck.god = id; b.show = [...new Set([...b.show, faction(cards.get(id))])]; }
    if (ui.picker === 'domain') { b.deck.domain_id = id; b.show = [...new Set([...b.show, faction(cards.get(id))])]; }
    if (ui.picker === 'thumb') b.deck.thumb = id;
    b.dirty = true; ui.picker = null;
  },
};

root.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t || !actions[t.dataset.act] || t.disabled) return;
  if (t.dataset.act === 'go' && ui.screen === 'builder' && ui.builder.dirty && !confirm('Leave without saving this deck?')) return;
  actions[t.dataset.act](t);
  render();
});
// Botão direito mostra a carta grande, como no jogo.
root.addEventListener('submit', e => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault(); submitProfile(form);
});
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
addEventListener('keydown', e => { if (e.key === 'Escape' && (ui.big || ui.play || ui.notice || ui.picker)) { ui.big = null; ui.play = false; ui.notice = null; ui.picker = null; render(); } });
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
  // Conta do sanctuary-api (login no /login/). Sem API (dev local), o lobby segue sem o nome no topo.
  fetch('/api/me', {credentials: 'same-origin'}).then(r => r.ok ? r.json() : null).then(u => { if (u) { ui.user = u; if (!u.complete) ui.screen = 'profile'; render(); startSocial(); } }).catch(() => {});
}
mountKV();
init().catch(e => { root.innerHTML = `<p class="lb-loading">${esc(e.message)}</p>`; console.error(e); });
