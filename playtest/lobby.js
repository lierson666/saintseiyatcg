// Lobby do Saint Seiya TCG no estilo do MTG Arena: barra superior (Home, Decks, Options), botão Play com gaveta de modo e deck,
// tela de decks e criador de decks. A partida é o Olympus Arena (./divine/), que recebe os decks pela URL.
import {loadCanon} from '../shared/canon-cards.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {canonIndex, validateDeck, colorErrors, splashCount, DECK_SIZE, COPY_LIMIT, SPLASH_LIMIT} from '../shared/deck-v3.js';
import {spellCategory} from './engine-v3/core.js';
import {ARMOR_FAMILY, EQUIPMENT_SUBTYPES, belongsToEquipmentGroup, hasSubtype} from '../shared/equipment-types.js?v=20261102-escala1';
import {renderLiveCard, renderCardText, fullSizePieces} from '../shared/live-card.js?v=20261102-escala1';
import {startCardFx} from '../shared/vfx/card-mount.js?v=20261104-vfx1';
import {printedEquipmentBonuses, signedBonus} from '../shared/card-visual-values.js';
import {displayCard, typeWord} from '../shared/card-i18n.js?v=20261031-kw1';
import {unlock, playMusic, setVolume, volume} from './audio.js?v=20261106-menu1';
import {loadMyDecks, saveMyDecks, findDeck, syncDecks, onDeckStatus, deckCovers, setDeckCover, adoptAccountDeck, setDeckUser} from './deck-store.js?v=20261109-hub2';
import {mountKV} from '../shared/kv-sky.js?v=20261104-pub1';
import {animFile} from '../shared/anim-data.js?v=1';
import {countryOptions, countryName} from '../shared/countries.js?v=20261031-i18n1';
import {startPresence} from '../shared/presence.js?v=20261029-1';
import {mountSocial} from './social.js?v=20261101-notch1';
import {telas, imageUrl, sound, applyColors, applyTexts} from './telas.js?v=20261107-deus1';
import {loadEconomy, ownedLimit, missingCards, coinBadge, storeScreen, collectionScreen, openBooster, buyBooster, buyCosmetic} from './economy.js?v=20261106-reveal2';
import {lightArt} from '../shared/light-art.js';
import {faceStyle, useGodPortraits} from './avatar-face.js?v=20261031-3';
import {progressTrack} from './home-features.js?v=20261031-face3';
import {loadRank, rankBadge, rankName, rankSummary, openRankPanel, playerName} from './rank.js?v=20261031-face3';

const root = document.getElementById('lobby');
const ART = '../card-forge/art-web/';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const KINDS = ['Devotee', 'Equipment', 'Technique', 'Moment', 'Domain'];
const COSTS = ['1', '2', '3', '4', '5', '6', '7+'];
const FACTIONS = ['athena', 'poseidon', 'hades', 'ares', 'artemis'];
const symbol = f => `../CARD-TEMPLATE/symbols/${f}.png`;
// Filtro da coleção: os 5 Gods e as neutras (sem símbolo; botão cinza claro como o frame).
const PICKS = [...FACTIONS, 'neutral'];
const cap = f => f[0].toUpperCase() + f.slice(1);

let cards, index, forge, presets = [], gods = [];
const ui = {screen: 'home', play: false, mode: 'ai', deckA: null, deckB: null, first: 'random', big: null, notice: null, picker: null, builder: null};
try { Object.assign(ui, JSON.parse(localStorage.getItem('sstcg.lobby.v1')) || {}, {screen: 'home', play: false, big: null, builder: null}); } catch { /* sem preferências salvas */ }
const remember = () => { try { localStorage.setItem('sstcg.lobby.v1', JSON.stringify({mode: ui.mode, deckA: ui.deckA, deckB: ui.deckB, first: ui.first, cardSize: ui.cardSize, poolView: ui.poolView, rivalRandom: ui.rivalRandom})); } catch { /* idem */ } };

// ---------- Cartas ----------
const faction = card => (forge.get(card.id)?.faccao || card.id.replace(/^god-/, '').split('-')[0]).toLowerCase();
const godForge = godId => forge.get(`${godId.replace(/^god-/, '')}-001`);
const artOf = (id, size) => { const f = id.startsWith('god-') ? godForge(id) : forge.get(id); return f?.ilustracao ? lightArt(ART + f.ilustracao, size) : null; };
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
const factionOf = id => cards.get(id) && faction(cards.get(id));
const deckErrors = d => [...validateDeck(d, index), ...colorErrors({...d, god: deckGod(d)}, factionOf)];
const deckValid = d => !deckErrors(d).length;
const thumbOf = d => d.thumb || deckCovers()[d.id] || null; // deck do jogador: no deck; Starter: neste aparelho
function deckCover(d) {
  if (thumbOf(d) && artOf(thumbOf(d))) return artOf(thumbOf(d)); // capa escolhida pelo jogador
  const first = d.main_deck.map(e => e.card_id).find(id => artOf(id));
  return artOf(first || deckGod(d));
}
function deckBox(d, act) {
  const box = deckButton(d, act);
  // Tela Decks: botão de capa em qualquer deck, inclusive Starter (autor, 30/10/2026).
  return act === 'edit-deck' ? `<div class="lb-deckwrap">${box}<button class="lb-deck__cover" data-act="cover" data-deck="${esc(d.id)}" aria-label="Choose the cover of ${esc(d.alpha_nome || d.nome)}">Cover</button>${deckMenu(d)}</div>` : box;
}
// Botão direito num deck da tela Decks (autor, 31/10/2026): duplicar, trocar capa, excluir (Starter não exclui).
function deckMenu(d) {
  const m = ui.deckMenu;
  if (!m || m.id !== d.id) return ''; // deck sem id (cache antigo) não abre menu nem quebra a tela
  const own = loadMyDecks().some(x => x.id === d.id);
  return `<div class="lb-ctx" role="menu" style="left:${m.x}px;top:${m.y}px">
    <button role="menuitem" data-act="deck-dup" data-deck="${esc(d.id)}">Duplicate</button>
    <button role="menuitem" data-act="cover" data-deck="${esc(d.id)}">Change cover</button>
    <button role="menuitem" data-act="deck-del" data-deck="${esc(d.id)}" ${own ? '' : 'disabled title="Starter decks are read-only"'}>Delete</button></div>`;
}
function deckButton(d, act) {
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
    <nav class="lb-tabs">${tab('home', 'Home')}${tab('decks', 'Decks')}${tab('collection', 'Collection')}${tab('store', 'Store')}${tab('profile', 'Profile')}${tab('options', 'Options')}</nav>
    <button class="lb-gear ${ui.screen === 'options' ? 'is-active' : ''}" data-act="go" data-screen="options" aria-label="Options">⚙&#xFE0E;</button>
    <a class="lb-tab" href="./platform/" target="_top" style="text-decoration:none;white-space:nowrap">Cosmo Hub</a>
    <span class="lb-top__tag">Alpha 0.1 · Engine 3.0</span>
    ${ui.user?.complete ? `<button class="lb-socialbtn" data-act="friends" aria-label="Friends">Friends ${socialBadge()}</button>` : ''}
    ${ui.econ ? coinBadge(ui.econ) : ''}
    ${ui.rank ? rankBadge(ui.rank) : ''}
    ${ui.user ? `<span class="lb-user"><i class="kv-dot" aria-hidden="true"></i>${ui.user.complete ? `<button class="kv-ghost" data-act="my-profile" aria-label="My player profile">${playerName(ui.user.username)}</button>` : esc(ui.user.name)}<button class="kv-ghost" data-act="signout">Sign out</button></span>` : ''}
  </header>`;
}

// Contador do botão Friends: amigos online e pedidos pendentes (atualizado pelo painel sem redesenhar o lobby).
let social = null;
const socialBadge = () => `<span class="lb-socialbtn__count">${ui.online || 0}</span>${ui.requests ? `<span class="lb-socialbtn__req" aria-label="${ui.requests} friend requests">${ui.requests}</span>` : ''}`;
function startSocial() {
  if (social || !ui.user?.complete) return;
  startPresence('online');
  social = mountSocial({api, onProfile: openProfile, avatarOf: id => artOf(id || 'god-athena', 'thumb'),
    decks: () => allDecks().filter(deckValid).map(d => ({id: d.id, name: d.alpha_nome || d.nome, deck: d})), onCount: (online, requests) => {
    ui.online = online; ui.requests = requests;
    const b = root.querySelector('.lb-socialbtn'); if (b) b.innerHTML = `Friends ${socialBadge()}`;
    const list = root.querySelector('.ds-friends'); if (list && ui.play && ui.mode === 'online') list.outerHTML = friendsBar(); // status dos amigos ao vivo
    const count = root.querySelector('.ds-path__count'); if (count) count.textContent = onlineCount();
  }});
}

// Carrossel e blocos da home: editados no Star Hill (data/olympus-telas.json, playtest/telas.js).
const HOME = telas.home || {slides: [{imagem: 'card:god-athena', carimbo: 'Cosmo System', linha1: 'Let your', linha2: 'Cosmo burn', texto: 'Build a deck around your God and take it to the arena.'}],
  blocos: [], botao_play: 'Play'};
const SLIDES = HOME.slides;
const img = v => imageUrl(v, artOf);

function home() {
  const deck = findDeck(ui.deckA, presets);
  const n = SLIDES.length, i = ((ui.slide || 0) % n + n) % n, slide = SLIDES[i];
  return `<section class="lb-home">
    <div class="lb-hero kv-card" style="--hero:url('${img(slide.imagem)}')">
      <div class="lb-hero__copy"><p class="kv-stamp kv-stamp--gold">${esc(slide.carimbo)}</p>
        <h1><span class="kv-lyric">${esc(slide.linha1)}</span><span class="kv-cosmo">${esc(slide.linha2)}</span></h1>
        <span>${esc(slide.texto)}</span></div>
      <button class="lb-hero__arrow is-prev" data-act="slide" data-step="-1" aria-label="Previous">‹</button>
      <button class="lb-hero__arrow is-next" data-act="slide" data-step="1" aria-label="Next">›</button>
      <div class="lb-hero__dots">${SLIDES.map((_, j) => `<i class="${j === i ? 'is-on' : ''}"></i>`).join('')}</div>
    </div>
    <div class="lb-news">
      ${HOME.blocos.map(b => `<button class="lb-news__tile" ${b.destino === 'play' ? 'data-act="play"' : `data-act="go" data-screen="${esc(b.destino)}"`} style="--tile:url('${img(b.imagem)}')"><small>${esc(b.rotulo)}</small><strong>${esc(b.titulo)}</strong></button>`).join('')}
    </div>
    <div class="lb-dock" ${ui.play ? 'hidden' : ''}>
      ${deck ? `<button class="lb-dock__deck" data-act="play"><span style="background-image:url('${deckCover(deck) || ''}')"></span><strong>${esc(deck.alpha_nome || deck.nome)}</strong></button>` : ''}
      <button class="lb-play" data-act="play">${esc(HOME.botao_play || 'Play')}</button>
    </div>
    ${progressTrack({user: ui.user, econ: ui.econ, rank: ui.rank})}
    ${ui.play ? playPanel() : ''}
  </section>`;
}

const deckKind = d => !d.preset ? 'mine' : d.arquetipo ? 'competitive' : 'starter';
const KIND_LABEL = {mine: 'My decks', starter: 'Starters', competitive: 'Competitive'};
// Jogar em dois passos (autor, 01/11/2026): primeiro os caminhos (Amigos, Ranqueada, IA, História) e o confronto;
// a grade de decks, em tela cheia como no MTG Arena, só abre ao trocar de deck. Contra a IA o rival é sorteado, a não ser que o jogador o escolha.
function playPanel() {
  const opening = ui.playOpening; ui.playOpening = false; // anima só ao abrir, não a cada clique
  return `<section class="ds ${ui.deckStep ? '' : 'ds--hub'} ${opening ? 'is-opening' : ''}" role="dialog" aria-modal="true" aria-label="Play">${ui.deckStep ? deckStep() : playHub()}</section>`;
}
const onlineCount = () => !ui.user?.complete ? 'Sign in to play online.' : ui.online ? `${ui.online} online` : 'None online';
function playHub() {
  const path = (m, label, text, god, extra = '') => `<button class="ds-path ${ui.mode === m ? 'is-active' : ''}" data-act="mode" data-mode="${m}" aria-pressed="${ui.mode === m}" style="--art:url('${artOf(god) || ''}')"><strong>${label}</strong><small>${text}</small>${extra}</button>`;
  const soon = (label, text, god) => `<button class="ds-path is-soon" aria-disabled="true" style="--art:url('${artOf(god) || ''}')"><span class="ds-path__soon kv-stamp">Soon</span><strong>${label}</strong><small>${text}</small></button>`;
  return `<header class="ds-head"><h2 tabindex="-1">Play</h2><button class="lb-x" data-act="close-play" aria-label="Close">×</button></header>
    <div class="ds-body">
      <nav class="ds-paths" aria-label="Mode">
        ${path('online', 'Friends online', 'Challenge a friend to a duel', 'god-artemis', `<span class="ds-path__count">${onlineCount()}</span>`)}
        ${soon('Ladder', 'Ranked matches', 'god-ares')}
        ${path('ai', 'Battle vs AI', 'Choose your deck and the difficulty', 'god-hades')}
        ${soon('Story', "The anime's story, single player", 'god-athena')}
      </nav>
      <button class="ds-local ${ui.mode === 'local' ? 'is-active' : ''}" data-act="mode" data-mode="local" aria-pressed="${ui.mode === 'local'}"><strong>Local battle</strong><small>Two players on this device</small></button>
    </div>
    ${ui.mode === 'online' ? `<footer class="ds-bar ds-bar--online"><div class="ds-matchup">${slotChip('a')}</div>${friendsBar()}</footer>` : matchBar()}`;
}
function matchBar() {
  const first = [['random', 'Random'], ['A', ui.mode === 'ai' ? 'You' : 'Player A'], ['B', ui.mode === 'ai' ? 'AI' : 'Player B']];
  const randomRival = ui.mode === 'ai' && ui.rivalRandom !== false;
  const valid = id => { const d = findDeck(id, presets); return d && deckValid(d); };
  const missing = !valid(ui.deckA) ? 'a' : !randomRival && !valid(ui.deckB) ? 'b' : null; // sem deck, o botão leva direto à escolha
  return `<footer class="ds-bar">
      <div class="ds-matchup">${slotChip('a')}<span class="ds-vs" aria-hidden="true">VS</span>${randomRival
        ? `<button class="ds-slot ds-slot--random" data-act="choose-rival"><span class="ds-slot__art" aria-hidden="true">?</span><span><small>AI rival</small><strong>Random deck</strong><em>Choose rival</em></span></button>`
        : `${slotChip('b')}${ui.mode === 'ai' ? '<button class="lb-chip" data-act="random-rival">Random</button>' : ''}`}</div>
      <div class="lb-first" role="group" aria-label="Who starts">${first.map(([v, l]) => `<button class="lb-chip ${ui.first === v ? 'is-on' : ''}" data-act="first-pick" data-value="${v}" aria-pressed="${ui.first === v}">${l}</button>`).join('')}<span>starts</span></div>
      ${ui.mode === 'ai' ? `<label class="lb-first"><span>AI difficulty</span><select class="kv-input" style="width:auto;min-width:112px" data-act="match-set" data-key="aiLevel">${[['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']].map(([v, l]) => `<option value="${v}" ${matchSettings().aiLevel === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
      ${missing ? `<button class="lb-play ds-play" data-act="slot" data-slot="${missing}">Pick a deck</button>` : '<button class="lb-play ds-play" data-act="start">Play</button>'}
    </footer>`;
}
function deckStep() {
  const side = ui.slot || 'a', act = side === 'a' ? 'pick-a' : 'pick-b', current = side === 'a' ? ui.deckA : ui.deckB;
  const god = ui.deckGodFilter || 'all', q = (ui.deckQ || '').toLowerCase();
  const decks = allDecks().filter(d => (god === 'all' || deckGod(d) === `god-${god}`) && (d.alpha_nome || d.nome).toLowerCase().includes(q));
  const groups = ['mine', 'starter', 'competitive'].map(k => [k, decks.filter(d => deckKind(d) === k)]).filter(([, l]) => l.length);
  const chip = (v, label, html) => `<button class="lb-chip ${god === v ? 'is-on' : ''}" data-act="deck-filter" data-key="deckGodFilter" data-value="${v}" aria-pressed="${god === v}" title="${esc(label)}">${html}</button>`;
  const choosing = side === 'a' ? (ui.mode !== 'local' ? 'Choose your deck' : 'Player A deck') : (ui.mode === 'ai' ? 'Choose the AI deck' : 'Player B deck');
  return `<header class="ds-head">
      <button class="kv-ghost ds-back" data-act="deck-back">‹ Back</button>
      <h2 tabindex="-1">${choosing}</h2>
      <button class="lb-x" data-act="close-play" aria-label="Close">×</button>
    </header>
    <div class="ds-tools">
      <div class="lb-chips">${chip('all', 'All Gods', 'All')}${FACTIONS.map(f => chip(f, cap(f), `<img src="${symbol(f)}" alt="">`)).join('')}</div>
      <input class="ds-search" type="search" placeholder="Search decks" value="${esc(ui.deckQ || '')}" data-act="deck-search" aria-label="Search decks">
    </div>
    <div class="ds-grid">${groups.length ? groups.map(([k, l]) => `<h3>${KIND_LABEL[k]} <span>${l.length}</span></h3>
      <div class="ds-row">${l.map(d => deckTile(d, act, d.id === current)).join('')}</div>`).join('') : '<p class="lb-empty">No deck matches these filters.</p>'}</div>`;
}
// Online contra amigo (autor, 01/11/2026): o desafio é o mesmo do chat (/api/challenges); aceito, a partida abre sozinha.
function friendsBar() {
  const deck = findDeck(ui.deckA, presets), ok = deck && deckValid(deck);
  const list = (social?.friends() || []).filter(f => f.status !== 'offline');
  const sent = ui.challengeSent ? `<p class="ds-friends__note" role="status">${esc(ui.challengeSent)}</p>` : '';
  if (!ui.user?.complete) return `<div class="ds-friends"><p class="ds-friends__note">Sign in to play online.</p><a class="lb-chip is-on" href="/login/?v=3&next=/playtest/">Sign in</a></div>`;
  if (!list.length) return `<div class="ds-friends"><p class="ds-friends__note">No friends online right now. Add friends in Friends.</p><button class="lb-chip is-on" data-act="friends">Open Friends</button>${sent}</div>`;
  return `<div class="ds-friends" role="list" aria-label="Friends online">${list.map(f => `<div class="ds-friend" role="listitem"><i class="kv-dot ${f.status === 'online' ? '' : 'is-busy'}" aria-hidden="true"></i><span translate="no">${esc(f.username)}</span>${f.status === 'online' ? '' : '<small>In a match</small>'}
    <button class="lb-chip is-on" data-act="challenge" data-user="${esc(f.username)}" ${ok && f.status === 'online' ? '' : 'disabled'} title="${!ok ? 'Pick a complete deck first' : f.status !== 'online' ? 'Your friend is busy' : 'Challenge to a duel'}">Challenge</button></div>`).join('')}${sent}</div>`;
}
function slotChip(side) {
  const d = findDeck(side === 'a' ? ui.deckA : ui.deckB, presets), art = d && deckCover(d);
  const who = side === 'a' ? (ui.mode !== 'local' ? 'You' : 'Player A') : (ui.mode === 'ai' ? 'AI rival' : 'Player B');
  return `<button class="ds-slot ${d ? '' : 'is-active'}" data-act="slot" data-slot="${side}">
    <span class="ds-slot__art" style="${art ? `background-image:url('${art}')` : ''}"></span>
    <span><small>${who}</small><strong>${d ? esc(d.alpha_nome || d.nome) : 'Choose a deck'}</strong><em>${d ? 'Change deck' : 'Choose a deck'}</em></span></button>`;
}
function deckTile(d, act, picked) {
  const ok = deckValid(d), art = deckCover(d), god = deckGod(d).replace(/^god-/, ''), name = d.alpha_nome || d.nome;
  return `<button class="ds-deck ${picked ? 'is-picked' : ''} ${ok ? '' : 'is-incomplete'}" data-act="${act}" data-deck="${esc(d.id)}" data-name="${esc(name.toLowerCase())}"
    aria-pressed="${picked}" ${ok ? '' : 'aria-disabled="true"'}>
    <span class="ds-deck__art" style="${art ? `background-image:url('${art}')` : ''}"></span>
    <img class="ds-deck__god" src="${symbol(god)}" alt="${esc(cap(god))}">
    <span class="ds-deck__name"><strong>${esc(name)}</strong><small>${esc(ok ? (d.tema || d.arquetipo || `${deckSize(d)} cards`) : `Incomplete · ${deckSize(d)}/${DECK_SIZE}`)}</small></span>
  </button>`;
}

function decksScreen() {
  return `<section class="lb-page"><header class="lb-page__head"><h1>Decks</h1><p>Starter decks are read-only. Open one to save your own copy.</p></header>
    <div class="lb-deckgrid"><button class="lb-deck lb-deck--new" data-act="new-deck"><span class="lb-deck__art"></span><span class="lb-deck__name"><strong>+ New deck</strong><small>Choose a God and start building</small></span></button>
    ${allDecks().map(d => deckBox(d, 'edit-deck')).join('')}</div></section>`;
}

// Opções (autor, 31/10/2026): as mesmas do duelo (mesma chave do localStorage de playtest/divine/app.js) + tela cheia.
const MATCH_KEY = 'ssTcgOlympusArena';
const MATCH_DEFAULTS = {quality: 'high', theme: 'olympus', speed: 'normal', skipDraws: false, reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  reduceFlashes: false, shake: 1, autoPass: true, phaseTips: true, aiLevel: 'normal', cardText: '1.0', cardSize: '1.0'};
const matchSettings = () => { try { return {...MATCH_DEFAULTS, ...JSON.parse(localStorage.getItem(MATCH_KEY) || '{}')}; } catch { return {...MATCH_DEFAULTS}; } };
const setMatch = (key, value) => { try { localStorage.setItem(MATCH_KEY, JSON.stringify({...matchSettings(), [key]: value})); } catch { /* sem armazenamento */ } };
// Arenas publicadas (data/arenas-published.json, Arena Forge 5.0): [chave, nome]; variantes entram como "id~variante".
let arenaList = [];
const THEME_LABELS = {olympus: 'Cosmo Arena', athena: "Athena's Sanctuary", poseidon: "Poseidon's Undersea Temple", hades: "Hades' Underworld", elysion: 'Elysion', ares: "Ares' War Temple", artemis: "Artemis' Moonlit Grove"}; // = THEMES de divine/scene.js
export const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {});
function options() {
  const m = {...matchSettings(), lang: window.ssI18n?.lang}; // idioma: o efetivo (salvo ou do navegador), shared/i18n.js
  const row = (k, label) => `<label class="lb-field lb-volume">${label}<input type="range" min="0" max="100" value="${Math.round(volume[k] * 100)}" data-act="volume" data-kind="${k}"><output>${Math.round(volume[k] * 100)}%</output></label>`;
  const sel = (k, label, opts) => `<label class="lb-set"><span>${label}</span><select class="kv-input" data-act="match-set" data-key="${k}">${Object.entries(opts).map(([v, l]) => `<option value="${v}" ${m[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
  const chk = (k, label) => `<label class="lb-set"><span>${label}</span><input type="checkbox" data-act="match-set" data-key="${k}" ${m[k] ? 'checked' : ''}></label>`;
  return `<section class="lb-page lb-options"><header class="lb-page__head"><h1>Options</h1><p>Saved on this device. The same options open from the gear during a match.</p></header>
    <h2 class="lb-options__h">Display</h2>
    ${window.ssI18n ? sel('lang', 'Language', window.ssI18n.LANGS) : ''}
    <label class="lb-set"><span>Full screen</span><input type="checkbox" data-act="fullscreen" ${document.fullscreenElement ? 'checked' : ''}></label>
    ${window.ssStage?.desktop ? sel('resolution', 'Resolution', window.ssStage.LIST) : ''}
    ${sel('quality', 'Graphics', {low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra'})}${sel('theme', 'Arena', {...THEME_LABELS, ...Object.fromEntries(arenaList)})}
    <h2 class="lb-options__h">Sound</h2>${row('music', 'Music')}${row('sfx', 'Sound effects')}
    <h2 class="lb-options__h">Gameplay</h2>
    ${sel('aiLevel', 'AI difficulty', {easy: 'Easy', normal: 'Normal', hard: 'Hard'})}
    ${sel('speed', 'Animation speed', {fast: 'Fast', normal: 'Normal', cinematic: 'Cinematic'})}
    ${chk('phaseTips', 'Phase tips (control panel)')}${chk('autoPass', 'Auto-pass when you have no response')}${chk('skipDraws', 'Skip draw animations')}
    <h2 class="lb-options__h">Accessibility</h2>
    ${window.ssStage ? `${sel('cardText', 'Card text size', window.ssStage.SIZES)}${sel('cardSize', 'Card size (hand and previews)', window.ssStage.CARD)}` : ''}
    ${chk('reduceMotion', 'Reduce motion')}${chk('reduceFlashes', 'Reduce flashes')}
    <label class="lb-set"><span>Screen shake</span><input type="range" min="0" max="1.5" step=".25" value="${m.shake}" data-act="match-set" data-key="shake"></label>
    ${installBox()}
    <div class="lb-phone-only"><h2 class="lb-options__h">Account</h2><div class="lb-phone-links"><a class="kv-ghost" href="./platform/" target="_top">Cosmo Hub</a>${ui.user ? '<button class="kv-ghost" data-act="signout">Sign out</button>' : ''}</div></div></section>`;
}
document.addEventListener('fullscreenchange', () => { if (ui.screen === 'options') render(); });

// Web app (autor, 30/10/2026): Android instala pelo pedido do navegador; iPhone só pelo Compartilhar › Adicionar à Tela de Início.
let installPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (ui.screen === 'options') render(); });
const standalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installBox() {
  const body = standalone() ? '<p>Installed. You are playing in the app.</p>'
    : installPrompt ? '<button class="lb-play lb-play--small" data-act="install">Install app</button>'
    : isIOS() ? '<p>In Safari, tap <b>Share</b> and then <b>Add to Home Screen</b>.</p>'
    : '<p>Open this page in Chrome on your phone and use <b>Install app</b> from the browser menu.</p>';
  return `<section class="lb-install"><h2>Play as an app</h2><p>Full screen, from your home screen.</p>${body}</section>`;
}

// ---------- Perfil do jogador (modal): estatísticas e últimos duelos online ----------
const when = t => new Date(t * 1000).toLocaleDateString('en', {day: 'numeric', month: 'short', year: 'numeric'});
const RESULT = {win: 'Won', loss: 'Lost', draw: 'Draw'};
async function openProfile(username) {
  const opener = document.activeElement;
  const dlg = document.createElement('dialog');
  dlg.className = 'lb-pmodal kv-card'; dlg.setAttribute('aria-label', `${username} · player profile`);
  dlg.innerHTML = '<p class="kv-status" role="status">Loading…</p>';
  document.body.append(dlg); dlg.showModal();
  dlg.addEventListener('close', () => { dlg.remove(); opener?.focus?.(); });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-pclose]')) dlg.close(); });
  try {
    const p = await api(`/api/profile/${encodeURIComponent(username)}`), s = p.stats;
    const god = id => esc(cards.get(id)?.name || (id || '').replace(/^god-/, '') || '—');
    dlg.innerHTML = `<header class="lb-pmodal__head"><span class="lb-avatar" style="background-image:url('${artOf(p.avatar_card || 'god-athena') || ''}');${faceStyle(p.avatar_card || 'god-athena')}"></span>
        <div><p class="kv-stamp kv-stamp--gold">${esc(countryName(p.country))} · Joined ${when(p.joined)}</p><h2>${playerName(p.username)}</h2></div>
        <button class="kv-ghost" data-pclose autofocus>Close</button></header>
      <dl class="lb-pstats"><div><dt class="kv-stamp">Played</dt><dd>${s.played}</dd></div><div><dt class="kv-stamp">Wins</dt><dd>${s.wins}</dd></div>
        <div><dt class="kv-stamp">Losses</dt><dd>${s.losses}</dd></div><div><dt class="kv-stamp">Win rate</dt><dd>${s.winrate}%</dd></div></dl>
      ${p.rank ? rankSummary(p.rank) : ''}
      ${p.achievements ? `<h3 class="kv-stamp">Achievements · ${p.achievements.filter(a => a.done).length}/${p.achievements.length}</h3>
        <ul class="lb-achievements">${p.achievements.map(a => `<li class="${a.done ? 'is-done' : ''}"><b>${esc(a.name)}</b><small>${esc(a.description)}</small></li>`).join('')}</ul>` : ''}
      <h3 class="kv-stamp">Recent duels</h3>
      ${p.recent.length ? `<ol class="lb-precent">${p.recent.map(r => `<li class="is-${r.result}"><b>${RESULT[r.result]}</b> vs ${esc(r.opponent)}<small>${god(r.god)} · ${when(r.date)}</small></li>`).join('')}</ol>` : '<p class="kv-status">No online duels yet.</p>'}`;
    dlg.querySelector('[data-pclose]').focus();
  } catch (e) {
    dlg.innerHTML = `<p class="kv-status err" role="status">${esc(e.message)}</p><button class="kv-ghost" data-pclose>Close</button>`;
  }
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
  const avatars = ui.econ?.cosmetics ? ui.econ.cosmetics.flatMap(g => g.items).filter(c => c.avatar.owned).map(c => c.id) : AVATARS; // as da loja que o jogador tem
  return `<section class="lb-page lb-profile">
    <header class="lb-profile__head kv-card">
      <span class="lb-avatar" style="background-image:url('${artOf(avatar) || ''}');${faceStyle(avatar)}"></span>
      <div><p class="kv-stamp kv-stamp--gold">${esc(countryName(u.country))}</p><h1>${playerName(u.username)}</h1>
        <p class="lb-code"><span class="kv-stamp">Friend code</span><b>${esc(u.friend_code)}</b><button class="kv-ghost" data-act="copy-code">${ui.copied ? 'Copied' : 'Copy'}</button></p></div>
    </header>
    <div class="lb-profile__grid">
      <form class="kv-card lb-form" data-form="me">
        <h2>Account</h2>
        <div class="lb-avatars" role="radiogroup" aria-label="Avatar">${avatars.map(id => `<button type="button" role="radio" aria-checked="${id === avatar}" class="lb-avatar lb-avatar--pick ${id === avatar ? 'is-on' : ''}" data-act="avatar" data-id="${id}" style="background-image:url('${artOf(id) || ''}');${faceStyle(id)}" aria-label="${esc(cards.get(id)?.name || id)}"></button>`).join('')}</div>
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
// Cosmo Hub (autor, 09/11/2026): o editor do Hub é este mesmo construtor, embutido (?builder=new|<id>&embed=1).
// Embutido, sem o menu do jogo; ao sair do construtor avisa o Hub, depois de o deck chegar à conta.
const HUB = new URLSearchParams(location.search), EMBED = HUB.get('embed') === '1' && parent !== window;
let embedOpen = false, embedSaved = false;
if (EMBED) document.documentElement.classList.add('lb-embed');
async function embedOpenFromHub() {
  const want = HUB.get('builder');
  if (!EMBED || embedOpen || !want) return;
  // Direto da conta, sem o syncDecks completo (que regrava o cache inteiro): o Hub edita um deck por vez.
  const [me, list] = await Promise.all(['/api/me', '/api/decks'].map(u => fetch(u, {credentials: 'same-origin'}).then(r => (r.ok ? r.json() : null)).catch(() => null)));
  setDeckUser(me?.username);
  let deck = null;
  if (want !== 'new') {
    const found = list?.decks?.find(d => d.id === want);
    if (!found) return parent.postMessage({type: 'sstcg-builder-close', error: 'not-found'}, location.origin);
    deck = {...found.data, id: found.id}; // o id vale o da conta (dados antigos podem vir sem id)
    adoptAccountDeck(me?.username, deck, found.revision);
  }
  openBuilder(deck); embedOpen = true; render();
}
function embedClose() {
  const post = () => parent.postMessage({type: 'sstcg-builder-close', saved: embedSaved, id: ui.builder?.deck?.id || null}, location.origin);
  embedOpen = false;
  if (!embedSaved) return post();
  const wait = setTimeout(post, 6000); // sem resposta do servidor: o deck já está no cache e sincroniza depois
  embedWaiting = () => { clearTimeout(wait); embedWaiting = null; post(); };
}
let embedWaiting = null;
function openBuilder(deck) {
  const base = deck ? structuredClone(deck) : {id: null, nome: 'New deck', god: 'god-athena', domain_id: null, main_deck: []};
  if (deck?.preset) { base.id = null; base.nome = `${deck.alpha_nome || deck.nome} (copy)`; delete base.preset; }
  base.god ||= 'god-athena';
  // show: facções visíveis na coleção (símbolos dos Gods, várias ao mesmo tempo); começa nas cores do deck.
  ui.builder = {deck: base, q: '', cost: [], kind: [], subtype: [], dirty: false, show: [...deckFactions(base)]};
  ui.screen = 'builder';
}
const count = (b, id) => b.deck.main_deck.find(e => e.card_id === id)?.quantity || 0;
function pool(b) {
  const factions = new Set(b.show.length ? b.show : PICKS);
  const q = b.q.trim().toLowerCase();
  // A coleção mostra os Gods marcados; a identidade do deck (God + Domain + neutras) é validada em deckErrors.
  return [...cards.values()].filter(c => c.kind !== 'God' && factions.has(faction(c))
    && (!b.kind.length || b.kind.includes(kindOf(c)))
    && (!b.subtype?.length || b.subtype.some(v => (v === ARMOR_FAMILY ? belongsToEquipmentGroup(forge.get(c.id) || c, v) : hasSubtype(forge.get(c.id) || c, v))))
    && (!b.cost.length || b.cost.some(v => (v === '7+' ? (c.cost?.amount ?? 0) >= 7 : c.cost?.amount === Number(v))))
    && (!q || `${c.name} ${c.text}`.toLowerCase().includes(q))).sort(sortCards);
}
function errorText(e) {
  const name = id => esc(cards.get(id)?.name || id);
  return {domain: 'Choose a Domain from the collection.', size: `${e.total} / ${DECK_SIZE} cards.`, copies: `${name(e.card_id)}: ${e.count} copies (max ${COPY_LIMIT}).`,
    unknown: `${name(e.card_id)} is not in the card pool.`, outside: `${name(e.card_id)} can't go in the main deck.`, identity: `${name(e.card_id)} is outside this deck's colors (God, Domain and neutral).`, quantity: `${name(e.card_id)}: invalid quantity.`, splash: `${e.count} cards from the Domain's faction (max ${SPLASH_LIMIT}).`}[e.code] || e.code;
}
const SUBTYPE_FILTERS = [{value: ARMOR_FAMILY, label: 'Any armor'}, ...EQUIPMENT_SUBTYPES.filter(t => t.status === 'approved').map(t => ({value: t.name, label: t.name}))];
const CARD_SIZES = {S: 130, M: 180, L: 250, XL: 330};
// Barra de filtros do pool (editor de decks e Coleção): busca e dropdowns de várias escolhas (autor, 02/11/2026).
const filterState = () => (ui.screen === 'collection' ? (ui.colPool ||= {q: '', cost: [], kind: [], subtype: [], show: []}) : ui.builder);
function filterDrop(key, label, options, picked) {
  const open = ui.filterOpen === key, names = options.filter(o => picked.includes(o.value)).map(o => o.label);
  return `<div class="lb-drop ${open ? 'is-open' : ''}"><button class="lb-drop__btn ${picked.length ? 'is-on' : ''}" data-act="filter-open" data-key="${key}" aria-expanded="${open}" aria-haspopup="true">
      <small>${label}</small><b>${!names.length ? 'All' : names.length > 2 ? names.length : esc(names.join(', '))}</b><i aria-hidden="true"></i></button>
    ${open ? `<div class="lb-drop__menu" role="group" aria-label="${label}">${options.map(o => `<button class="lb-drop__opt ${picked.includes(o.value) ? 'is-on' : ''}" role="checkbox" aria-checked="${picked.includes(o.value)}" data-act="filter-toggle" data-key="${key}" data-value="${o.value}">
        <span class="lb-drop__box" aria-hidden="true"></span>${o.icon || ''}<span>${esc(o.label)}</span></button>`).join('')}
      <button class="lb-drop__clear" data-act="filter-clear" data-key="${key}" ${picked.length ? '' : 'disabled'}>Clear</button></div>` : ''}</div>`;
}
function filterBar(b) {
  const size = ui.cardSize || 'M', sizes = Object.keys(CARD_SIZES), view = ui.screen === 'builder' ? ui.poolView || 'card' : 'card';
  const gods = PICKS.map(f => ({value: f, label: cards.get(`god-${f}`)?.name || 'Neutral', icon: f === 'neutral' ? '<span class="lb-godpick__neutral" aria-hidden="true"></span>' : `<img src="${symbol(f)}" alt="">`}));
  return `<div class="lb-filters"><input type="search" placeholder="Search name or text" value="${esc(b.q)}" data-act="search" aria-label="Search cards">
        <div class="lb-drops">${filterDrop('cost', 'Cost', COSTS.map(v => ({value: v, label: v})), b.cost)}${filterDrop('kind', 'Type', KINDS.map(v => ({value: v, label: v})), b.kind)}${filterDrop('subtype', 'Equipment', SUBTYPE_FILTERS, b.subtype || [])}${filterDrop('show', 'God', gods, b.show)}</div>
        <div class="lb-viewbar">${ui.screen === 'builder' ? `<div class="lb-seg" role="group" aria-label="View">${POOL_VIEWS.map(([v, label]) => `<button class="${view === v ? 'is-active' : ''}" data-act="pool-view" data-view="${v}" aria-pressed="${view === v}">${label}</button>`).join('')}</div>` : ''}
          ${view === 'list' ? '' : `<div class="lb-zoom" role="group" aria-label="Card size"><button data-act="card-zoom" data-dir="-1" ${size === sizes[0] ? 'disabled' : ''} aria-label="Smaller cards">−</button><b>${size}</b><button data-act="card-zoom" data-dir="1" ${size === sizes.at(-1) ? 'disabled' : ''} aria-label="Bigger cards">+</button></div>`}</div></div>`;
}
const POOL_VIEWS = [['card', 'Cards'], ['list', 'List'], ['field', 'Battlefield']];
// Linha com arte e − n + no canto direito (lista do deck e visão Lista do pool). Tocar abre a carta.
function cardRow(c, b, tag = 'div') {
  const d = b.deck, n = count(b, c.id), max = ownedLimit(ui.econ, c.id, c.kind), isDomain = c.kind === 'Domain', on = isDomain && d.domain_id === c.id;
  return `<${tag} class="lb-crow ${n || on ? 'is-in' : ''}"><button class="lb-strip" data-act="show-card" data-id="${c.id}" data-card="${c.id}" style="--art:url('${artOf(c.id) || ''}')">
    <b class="lb-gem ${c.cost?.unit || ''}">${c.cost?.amount ?? '–'}</b><span>${esc(c.name)}</span></button>
    ${isDomain ? `<button class="lb-rowset" data-act="set-domain" data-id="${c.id}" aria-pressed="${on}">${on ? 'Domain' : 'Set Domain'}</button>`
    : `<div class="lb-rowstep" role="group" aria-label="${esc(c.name)}"><button data-act="remove" data-id="${c.id}" ${n ? '' : 'disabled'} aria-label="Remove one">−</button><b>${n}</b><button data-act="add" data-id="${c.id}" ${n >= max ? 'disabled' : ''} aria-label="Add one">+</button></div>`}</${tag}>`;
}
// Carta menor, igual à do campo no duelo (playtest/divine/board.css): arte, nome e gemas.
function fieldFace(c) {
  const f = forge.get(c.id), art = artOf(c.id, 'thumb'), fr = f?.ilustracao_enquadramento;
  const style = art ? `--art:url('${art}');${fr?.w ? `--fx:${fr.x / 1488};--fy:${(fr.y - 160) / 1488};--fw:${fr.w / 1488};` : ''}` : `--art:url('../LOGO/logo-web.webp');--noart-w:70%;`;
  // Barra de baixo (autor, 02/11/2026): custo com o símbolo de Cosmoble ou o quadrado, depois ATK e vida.
  const stat = (kind, v, icon) => `<span class="lb-fstat lb-fstat--${kind}"><i style="--ico:url('../CARD-TEMPLATE/${icon}')"></i>${v}</span>`;
  const gear = f && c.kind === 'Equipment' ? printedEquipmentBonuses(f) : {};
  const bar = (c.cost ? stat(c.cosmoble ? 'cost' : 'cost lb-fstat--flat', c.cost.amount, c.cosmoble ? 'athena/gem_cost.sm.webp' : 'icons/base-mini.svg') : '') + (c.kind === 'Devotee' ? stat('atk', c.atk, 'icons/atk-mini.svg') + stat('hp', c.hp, 'icons/soul.sm.webp') : '')
    + (gear.power ? stat('atk', signedBonus(gear.power), 'icons/atk-mini.svg') : '') + (gear.hp ? stat('hp', signedBonus(gear.hp), 'icons/soul.sm.webp') : '');
  return `<div class="lb-fcard" data-card="${c.id}"><div class="btok ${!art ? 'is-noart' : fr?.w ? 'is-framed' : ''}" style="${style}"><span class="btok__name">${esc(c.name)}</span>
    ${bar ? `<div class="lb-fbar ${gear.power || gear.hp ? 'lb-fbar--gear' : ''}">${bar}</div>` : ''}</div></div>`;
}
// Cosmoble (rebalanceamento de 31/10/2026): só aviso, sem regra; abaixo de 60% do deck a mana tende a travar.
function cosmoLine(list, size) {
  const n = list.filter(e => e.card.cosmoble).reduce((s, e) => s + e.quantity, 0), low = size > 0 && n < size * 0.6;
  return `<div class="lb-list__cosmo ${low ? 'is-low' : ''}">Cosmoble <strong>${n}</strong> / ${size}${low ? '<small>Few cards can become a Cosmo Base. Most decks want about 40.</small>' : ''}</div>`;
}

// Análise do deck (autor, 02/11/2026). Paletas conferidas com o validador do skill dataviz, contra #0b0c16; o cinza do Neutro é proposital.
const FACTION_COLORS = {athena: '#b0872a', poseidon: '#2f86d6', ares: '#d9533e', hades: '#8f5fe0', artemis: '#35a56b', neutral: '#99a2b1'};
const KIND_COLORS = {Devotee: '#b0872a', Equipment: '#1f98ba', Technique: '#d0587a', Moment: '#7a80e8'};
const tally = (list, keyOf) => { const m = new Map(); for (const e of list) for (const k of [keyOf(e.card)].flat()) if (k) m.set(k, (m.get(k) || 0) + e.quantity); return m; };
function donut(title, rows, total) { // rows: {label, n, color, icon}; legenda com número e %, para a cor nunca ser o único sinal
  let at = 0;
  const gap = rows.length > 1 ? 1 : 0, pct = n => Math.round(n / total * 100);
  return `<section class="lb-statcard"><h3>${title}</h3><div class="lb-donut"><div class="lb-donut__ring" role="img" aria-label="${esc(title)}: ${rows.map(r => `${esc(r.label)} ${r.n}`).join(', ')}">
      <svg viewBox="0 0 42 42" aria-hidden="true"><g transform="rotate(-90 21 21)">${rows.map(r => { const p = r.n / total * 100, s = `<circle cx="21" cy="21" r="15.915" fill="none" stroke="${r.color}" stroke-width="6.5" stroke-dasharray="${Math.max(p - gap, .5)} ${100 - Math.max(p - gap, .5)}" stroke-dashoffset="${-at}"><title>${esc(r.label)}: ${r.n} (${pct(r.n)}%)</title></circle>`; at += p; return s; }).join('')}</g></svg>
      <span><b>${total}</b></span></div>
    <ul class="lb-legend">${rows.map(r => `<li><i style="background:${r.color}"></i>${r.icon || ''}<span>${esc(r.label)}</span><b>${r.n}</b><small>${pct(r.n)}%</small></li>`).join('')}</ul></div></section>`;
}
function statBars(title, map, limit = 6) {
  const all = [...map].sort((a, b) => b[1] - a[1]), rest = all.slice(limit).reduce((s, [, n]) => s + n, 0), rows = rest ? [...all.slice(0, limit), ['Other', rest]] : all;
  if (!rows.length) return '';
  const peak = rows[0][1];
  return `<section class="lb-statcard"><h3>${title}</h3><ul class="lb-bars">${rows.map(([k, n]) => `<li><span>${esc(typeWord(k))}</span><i><u style="width:${n / peak * 100}%"></u></i><b>${n}</b></li>`).join('')}</ul></section>`;
}
function deckStats(d, list, size, curveHtml) {
  if (!size) return '<p class="lb-empty">Add cards to see the deck analysis.</p>';
  const sum = (arr, f) => arr.reduce((s, e) => s + f(e) * e.quantity, 0), devs = list.filter(e => e.card.kind === 'Devotee'), nDevs = sum(devs, () => 1);
  const costed = list.filter(e => e.card.cost), avg = sum(costed, e => e.card.cost.amount) / Math.max(1, sum(costed, () => 1));
  const cosmo = sum(list, e => (e.card.cosmoble ? 1 : 0)), early = sum(costed, e => (e.card.cost.amount <= 2 ? 1 : 0));
  const kinds = tally(list, kindOf), factions = tally(list, faction);
  const tile = (value, label, note = '') => `<div class="lb-tile"><b>${value}</b><span>${label}</span>${note ? `<small>${note}</small>` : ''}</div>`;
  return `<div class="lb-tiles">${tile(avg.toFixed(1), 'Average cost')}${tile(`${Math.round(cosmo / size * 100)}%`, 'Cosmoble', `${cosmo} / ${size}`)}
      ${tile(nDevs, 'Devotees', nDevs ? `${(sum(devs, e => e.card.atk || 0) / nDevs).toFixed(1)} ATK · ${(sum(devs, e => e.card.hp || 0) / nDevs).toFixed(1)} HP` : '')}${tile(early, 'Early plays', 'Cost 2 or less')}</div>
    ${donut('Card type', Object.keys(KIND_COLORS).filter(k => kinds.get(k)).map(k => ({label: k, n: kinds.get(k), color: KIND_COLORS[k]})), size)}
    ${donut('Faction', Object.keys(FACTION_COLORS).filter(f => factions.get(f)).map(f => ({label: cards.get(`god-${f}`)?.name || 'Neutral', n: factions.get(f), color: FACTION_COLORS[f], icon: f === 'neutral' ? '' : `<img src="${symbol(f)}" alt="">`})), size)}
    <section class="lb-statcard"><h3>Cost curve</h3>${curveHtml}</section>
    ${statBars('Devotee class', tally(devs, c => forge.get(c.id)?.subtipos?.[0] || c.type.split(' — ')[1]))}
    ${statBars('Keywords', tally(devs, c => c.keywords))}
    ${statBars('Equipment', tally(list.filter(e => e.card.kind === 'Equipment'), c => forge.get(c.id)?.categoria_equipamento || (c.armor ? 'Armor' : 'Artifact')))}
    ${statBars('Rarity', tally(list, c => forge.get(c.id)?.raridade || c.rarity))}`;
}

function builder() {
  const b = ui.builder, d = b.deck, list = d.main_deck.map(e => ({...e, card: cards.get(e.card_id)})).filter(e => e.card).sort((x, y) => sortCards(x.card, y.card));
  const errors = deckErrors(d), size = deckSize(d), curve = [1, 2, 3, 4, 5, 6, 7].map(n => list.filter(e => (n === 7 ? (e.card.cost?.amount ?? 0) >= 7 : e.card.cost?.amount === n)).reduce((s, e) => s + e.quantity, 0));
  const peak = Math.max(1, ...curve), cards_ = pool(b);
  const domain = d.domain_id && cards.get(d.domain_id);
  const curveHtml = `<div class="lb-curve" aria-label="Cost curve">${curve.map((n, i) => `<span style="--h:${n / peak}"><i>${n || ''}</i><b>${i === 6 ? '7+' : i + 1}</b></span>`).join('')}</div>`;
  // Duas cópias: no fim da lista no desktop; no celular, barra fixa nas duas abas (autor, 02/11/2026).
  const actions_ = `<div class="lb-list__actions">${d.id ? '<button class="lb-ghost" data-act="delete-deck">Delete</button>' : ''}
        <button class="lb-ghost" data-act="go" data-screen="decks">Cancel</button><button class="lb-play lb-play--small" data-act="save-deck">Done</button></div>`;
  // No celular a coleção e a lista do deck viram duas abas (Cards | Deck); no desktop ficam lado a lado.
  return `<section class="lb-builder is-${b.view || 'pool'}">
    <div class="lb-bview" role="group" aria-label="Builder view">${[['pool', 'Cards'], ['list', `Deck ${size}/${DECK_SIZE}`], ['stats', 'Analysis']].map(([v, label]) =>
      `<button class="lb-pill ${(b.view || 'pool') === v ? 'is-active' : ''}" data-act="builder-view" data-view="${v}" aria-pressed="${(b.view || 'pool') === v}">${label}</button>`).join('')}</div>
    <div class="lb-pool">
      ${filterBar(b)}
      ${(ui.poolView || 'card') === 'list' ? `<div class="lb-grid lb-grid--list">${cards_.map(c => cardRow(c, b)).join('') || '<p class="lb-empty">No cards for this God yet.</p>'}</div>` : `<div class="lb-grid ${ui.poolView === 'field' ? 'lb-grid--field' : ''}" style="--slot:${(CARD_SIZES[ui.cardSize] || CARD_SIZES.M) * (ui.poolView === 'field' ? .72 : 1)}px">${cards_.map(c => {
        const n = count(b, c.id), isDomain = c.kind === 'Domain', on = isDomain ? d.domain_id === c.id : n > 0, max = ownedLimit(ui.econ, c.id, c.kind);
        return `<div class="lb-cell"><button class="lb-slot ${on ? 'is-in' : ''} ${!isDomain && n >= max ? 'is-max' : ''} ${!isDomain && !max ? 'is-unowned' : ''}" data-act="${isDomain ? 'set-domain' : 'slot-tap'}" data-id="${c.id}" aria-label="${esc(c.name)}">
          ${ui.poolView === 'field' ? fieldFace(c) : face(c.id)}<i class="lb-slot__count">${isDomain ? (on ? 'Domain' : 'Set Domain') : `${n} / ${max}`}</i></button>
          ${isDomain ? '' : `<div class="lb-step ${n ? 'is-in' : ''}" role="group" aria-label="${esc(c.name)}"><button data-act="remove" data-id="${c.id}" ${n ? '' : 'disabled'} aria-label="Remove one">−</button><b>${n} / ${max}</b><button data-act="add" data-id="${c.id}" ${n >= max ? 'disabled' : ''} aria-label="Add one">+</button></div>`}</div>`;
      }).join('') || '<p class="lb-empty">No cards for this God yet.</p>'}</div>`}
    </div>
    <aside class="lb-list">
      <div class="lb-seg lb-aseg" role="group" aria-label="Deck panel">${[['list', 'Deck'], ['stats', 'Analysis']].map(([v, label]) => `<button class="${(b.view === 'stats') === (v === 'stats') ? 'is-active' : ''}" data-act="builder-view" data-view="${v}" aria-pressed="${(b.view === 'stats') === (v === 'stats')}">${label}</button>`).join('')}</div>
      <div class="lb-stats">${deckStats(d, list, size, curveHtml)}</div>
      <input class="lb-list__name" value="${esc(d.nome)}" data-act="rename" aria-label="Deck name">
      <div class="lb-cover" style="background-image:url('${deckCover(d) || ''}')"><span>${[...deckFactions(d)].filter(f => f !== 'neutral').map(f => `<img src="${symbol(f)}" alt="">`).join('')}${esc(cards.get(d.god)?.name || '')}</span>
        <small>${domain ? esc(domain.name) : 'No Domain yet'}</small></div>
      <div class="lb-picks">${[['god', 'God', d.god], ['domain', 'Domain', d.domain_id], ['thumb', 'Cover', d.thumb || d.god]].map(([k, label, id]) =>
        `<button class="lb-pick" data-act="open-picker" data-pick="${k}" aria-label="Choose ${label}">${id && cards.get(id) ? face(id, 'lb-card--mini') : '<span class="lb-pick__empty">+</span>'}<small>${label}</small></button>`).join('')}</div>
      <label class="lb-set lb-deck-arena"><span>Arena</span><select class="kv-input" data-act="deck-arena" aria-label="Arena for this deck"><option value="">Same as Options</option>${arenaList.map(([k, n]) => `<option value="${esc(k)}" ${d.arena === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <div class="lb-list__count ${size === DECK_SIZE ? 'is-full' : size > DECK_SIZE ? 'is-over' : ''}"><strong>${size}</strong> / ${DECK_SIZE}</div>
      ${cosmoLine(list, size)}
      ${curveHtml}
      <ol class="lb-strips">${list.map(e => cardRow(e.card, b, 'li')).join('')
        || '<li class="lb-empty">Click cards in the collection to add them.</li>'}</ol>
      ${errors.length ? `<ul class="lb-errors">${errors.slice(0, 4).map(e => `<li>${errorText(e)}</li>`).join('')}</ul>` : '<p class="lb-ok">Deck ready to play.</p>'}
      ${actions_}
    </aside>
    ${actions_}
  </section>`;
}

// Carta grande (botão direito): a carta e, ao lado, o texto canônico do D268 em tamanho de leitura.
// Linhas de cabeçalho viram fichas (custo, tipo, ATK/HP...); o resto são habilidades, com o nome em destaque.
const HEADER = /^(\d{3} — |Rarity:|Type:|Casting Cost:|ATK:|HP:|Cosmoble:|Auto-Equip|Equip \{|SOUL \d|God — )/;
function cardInfo(id) {
  const c = cards.get(id), f = displayCard(id.startsWith('god-') ? godForge(id) : forge.get(id));
  const lines = c.text.split('\n').map(l => l.trim()).filter(Boolean);
  // Em PT (campos *_pt), nome e subtítulo vêm da carta traduzida; o texto do D268 segue em inglês.
  const subtitle = (f?.__pt && f.subtitulo_en) || (lines[1] && !HEADER.test(lines[1]) ? lines[1] : '');
  const name = (f?.__pt && f.nome_exibicao_en) || c.name;
  // Armor (30/10/2026): o bônus vai para a ficha "Bonus", não para o texto.
  const rules = lines.slice(subtitle ? 2 : 1).filter(l => !HEADER.test(l) && !(c.armor && /^Equipped Devotee gets /.test(l))).map(l => {
    const m = l.match(/^([A-Z][^—:.]{1,38}) — (.*)$/);
    return `<p>${m ? `<b>${esc(m[1])}</b> — ${esc(m[2])}` : esc(l)}</p>`;
  }).join('');
  const chip = (label, value, cls = '') => (value == null || value === '' ? '' : `<span class="lb-chip ${cls}"><small>${label}</small>${esc(value)}</span>`);
  const equip = c.text.match(/Equip \{(\d+)\} — (.+)/), auto = c.autoEquip.join(' / ');
  const n = ui.screen === 'builder' && !['God', 'Domain'].includes(c.kind) ? count(ui.builder, id) : null;
  return `<section class="lb-info" data-act="stay" aria-label="${esc(name)} details">
    <button class="lb-x lb-info__close" data-act="close-big" aria-label="Close">×</button>
    <p class="lb-info__type">${esc(typeText(c))}</p>
    <h2>${esc(name)}</h2>${subtitle ? `<p class="lb-info__sub">${esc(subtitle)}</p>` : ''}
    <div class="lb-chips">${chip('Cost', c.cost ? `${c.cost.amount} ${c.cost.unit === 'base' ? 'Base' : 'Latent'}` : null, 'is-cost')}
      ${c.armor ? chip('Bonus', [c.equipped?.atk ? `+${c.equipped.atk} ATK` : '', c.equipped?.hp ? `+${c.equipped.hp} HP` : ''].filter(Boolean).join(' / ')) : `${chip('ATK', c.atk, 'is-atk')}${chip('HP', c.hp, 'is-hp')}`}${chip('Soul', c.soul)}${chip('Awaken', c.awaken)}
      ${chip('Rarity', c.rarity)}${chip('Cosmoble', c.cosmoble == null ? null : c.cosmoble ? 'Yes' : 'No')}
      ${chip('Resonance', auto)}${chip('Equip', equip ? (c.armor || auto ? equip[1] : `${equip[1]} · ${equip[2]}`) : null)}</div>
    ${c.keywords.length ? `<div class="lb-kws">${c.keywords.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
    <div class="lb-info__rules">${f ? renderCardText(f) : `${c.armor && c.equipped?.keywords?.length ? `<p>Equipped Devotee has ${esc(c.equipped.keywords.join(' and '))}.</p>` : ''}${rules}`}</div>
    ${f?.flavour_en ? `<p class="lb-info__flavour">${esc(f.flavour_en)}</p>` : ''}
    ${n == null ? '' : `<div class="lb-info__deck"><span>In deck <b>${n}</b> / ${COPY_LIMIT}</span>
      <button class="lb-ghost" data-act="remove" data-id="${id}" ${n ? '' : 'disabled'} aria-label="Remove one">−</button>
      <button class="lb-play lb-play--small" data-act="add" data-id="${id}" ${n >= COPY_LIMIT ? 'disabled' : ''}>Add</button></div>`}
  </section>`;
}
// Seletor visual (como o comandante do MTG Arena): God, Domain ou a carta de capa do deck.
function pickerOptions(kind, d) {
  if (kind === 'god') return gods.map(g => g.id);
  const domains = [...cards.values()].filter(c => c.kind === 'Domain').sort((a, b) => (faction(b) === faction(cards.get(d.god))) - (faction(a) === faction(cards.get(d.god))) || PICKS.indexOf(faction(a)) - PICKS.indexOf(faction(b)) || a.name.localeCompare(b.name));
  if (kind === 'domain') return domains.map(c => c.id);
  return [...new Set([d.god, d.domain_id, ...d.main_deck.map(e => e.card_id)].filter(id => id && cards.get(id) && artOf(id)))]; // capa: só carta com arte
}
function picker() {
  const kind = ui.picker, d = ui.coverFor ? findDeck(ui.coverFor, presets) : ui.builder?.deck;
  if (!kind || !d) return '';
  const current = {god: d.god, domain: d.domain_id, thumb: thumbOf(d) || d.god}[kind];
  const title = {god: 'Choose your God', domain: 'Choose your Domain', thumb: 'Choose the deck cover'}[kind];
  return `<div class="lb-picker" role="dialog" aria-modal="true" aria-label="${title}"><div class="lb-picker__box"><header><h2>${title}</h2>
    <button class="lb-play lb-play--small" data-act="close-picker">Close</button></header>
    <div class="lb-picker__grid">${pickerOptions(kind, d).map(id => `<button class="lb-slot ${id === current ? 'is-in' : ''}" data-act="${kind === 'domain' ? 'show-card' : 'picked'}" data-id="${id}" aria-label="${esc(cards.get(id).name)}">${face(id)}</button>`).join('')}</div></div></div>`;
}

// Aviso modal (carta fora da identidade de cor do deck).
function notice() {
  return ui.notice ? `<div class="lb-notice" role="alertdialog" aria-modal="true" aria-labelledby="lb-notice-t"><div class="lb-notice__box">
    <h3 id="lb-notice-t">${esc(ui.notice.title)}</h3><p>${esc(ui.notice.text)}</p>
    <button class="lb-play lb-play--small" data-act="close-notice" autofocus>OK</button></div></div>` : '';
}
// Cosmo na cor do Deus atrás da carta do zoom (autor, 31/10/2026).
const COSMO = {Athena: '#ffd66e', Poseidon: '#3fa9ff', Hades: '#a35cff', Ares: '#ff4b3a', Artemis: '#6fe39a', Neutral: '#cfd8e6'};
// No seletor de Domain o clique abre o zoom; é este botão que escolhe (autor, 05/11/2026).
function useDomain() {
  if (ui.picker !== 'domain' || cards.get(ui.big)?.kind !== 'Domain') return '';
  const inUse = ui.builder?.deck.domain_id === ui.big;
  return `<button class="lb-play lb-big__use" data-act="picked" data-id="${ui.big}" ${inUse ? 'disabled' : ''}>${inUse ? 'Domain in use' : 'Use Domain'}</button>`;
}
function bigCard() {
  const f = ui.big && (ui.big.startsWith('god-') ? godForge(ui.big) : forge.get(ui.big)), cosmo = COSMO[f?.faccao] || COSMO.Neutral;
  return ui.big ? `<div class="lb-big" data-act="close-big" role="dialog" aria-label="Card" style="--cosmo: ${cosmo}">${fullSizePieces(face(ui.big, 'lb-card--big'))}${useDomain() ? `<div class="lb-big__side">${cardInfo(ui.big)}${useDomain()}</div>` : cardInfo(ui.big)}</div>` : '';
}

// Redesenha tudo; guarda a rolagem das colunas para o clique não voltar a lista ao topo.
const SCROLLERS = ['.lb-body', '.lb-grid', '.lb-list', '.lb-panel'];
function render() {
  const keep = SCROLLERS.map(sel => root.querySelector(sel)?.scrollTop || 0), screen = root.dataset.screen;
  const body = {home, decks: decksScreen, profile: profileScreen, options, builder,
    collection: () => collectionScreen(ui.econ, pool(filterState()), face, ui.colFilter, {bar: filterBar(filterState()), slot: CARD_SIZES[ui.cardSize] || CARD_SIZES.M}),
    store: () => storeScreen(ui.econ, (id, size) => artOf(id, size), ui.user, {tab: ui.storeTab, group: ui.storeGroup, pick: ui.cosPick})}[ui.screen]();
  const html = `${topBar()}<div class="lb-body lb-body--${ui.screen}">${body}</div>${bigCard()}${picker()}${notice()}`;
  if (screen === ui.screen) { const next = document.createElement('div'); next.innerHTML = html; morphKids(root, next, 0); } // mesma tela: só o que mudou
  else root.innerHTML = html;
  root.querySelectorAll('.lb-grid > *').forEach(c => { c.__html ??= c.outerHTML; });
  if (ui.big) upgradeArt(root.querySelector('.lb-big'));
  if (screen === ui.screen) SCROLLERS.forEach((sel, i) => { const el = root.querySelector(sel); if (el) el.scrollTop = keep[i]; });
  root.dataset.screen = ui.screen;
  if (embedOpen && ui.screen !== 'builder') embedClose();
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
  // Guia §63: até SPLASH_LIMIT cartas da facção de um Domain de outra cor; neutras não contam.
  const deck = {...ui.builder.deck, god: deckGod(ui.builder.deck)};
// Atualiza `el` para ficar igual a `to` mexendo só no que mudou, para não recarregar as artes (autor, 06/11/2026: a tela subia
// e descia a cada carta adicionada ou tirada do deck). `__html`: o HTML de quando a carta da grade foi desenhada, para comparar rápido.
const same = (o, n, html) => (o.__html ?? o.outerHTML) === html;
// O texto na tela já pode estar traduzido (shared/i18n.js traduz depois): igual à tradução do novo também conta como igual.
const sameText = (cur, en) => cur === en || cur === window.ssI18n?.t(en);
function morphKids(el, to, depth) {
  const a = [...el.childNodes], b = [...to.childNodes];
  if (depth > 14) return el.replaceChildren(...b);
  b.forEach((n, i) => {
    const o = a[i];
    if (!o) return el.append(n);
    if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) return o.replaceWith(n);
    if (n.nodeType !== 1) { if (!sameText(o.nodeValue, n.nodeValue)) o.nodeValue = n.nodeValue; return; }
    if (!same(o, n, n.outerHTML)) morph(o, n, depth + 1);
  });
  a.slice(b.length).forEach(o => o.remove());
}
function morph(el, to, depth = 0) {
  for (const {name} of [...el.attributes]) if (!to.hasAttribute(name)) el.removeAttribute(name);
  for (const {name, value} of [...to.attributes]) if (!sameText(el.getAttribute(name), value)) el.setAttribute(name, value);
  delete el.__html;
  morphKids(el, to, depth);
}
  if (delta > 0 && card && ![factionOf(deck.god), 'neutral'].includes(faction(card)) && splashCount(deck, factionOf) >= SPLASH_LIMIT) {
    ui.big = null;
    ui.notice = {title: 'Splash limit reached', text: `This deck already has ${SPLASH_LIMIT} cards from its Domain's faction. Cards from your God's faction and neutral cards have no limit.`};
    return;
  }
  if (delta > 0 && n > ownedLimit(ui.econ, id, card?.kind)) {  // coleção (docs/economia.md): só entram as cópias que o jogador tem
    if (n <= COPY_LIMIT) { ui.big = null; ui.notice = {title: 'Not in your collection', text: `You own ${ownedLimit(ui.econ, id, card?.kind)} of ${card?.name || 'this card'}. Open boosters in the Store to get more.`}; }
    return;
  }
  if (n > COPY_LIMIT) return; // passar de DECK_SIZE pode na montagem; salvar não (autor, 06/11/2026)
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
  if (EMBED) embedSaved = true;
  if (!ui.deckA) ui.deckA = d.id;
  remember();
}
function startMatch() {
  if (ui.mode === 'ai' && ui.rivalRandom !== false) actions['random-b']();
  const a = findDeck(ui.deckA, presets), b = findDeck(ui.deckB, presets);
  // Contra a IA o deck precisa estar na coleção; hot-seat (mesma tela) usa todas as cartas, para teste.
  const missing = ui.mode === 'ai' ? missingCards(ui.econ, a, id => cards.get(id)?.kind) : [];
  if (missing.length) {
    ui.notice = {title: 'Missing cards', text: `This deck uses cards you don't own yet: ${missing.slice(0, 4).map(m => `${cards.get(m.card_id)?.name || m.card_id} (${m.have}/${m.need})`).join(', ')}${missing.length > 4 ? ` and ${missing.length - 4} more` : ''}. Open boosters in the Store or edit the deck.`};
    return render();
  }
  const q = new URLSearchParams({deckA: a.id, deckB: b.id, ai: ui.mode === 'ai' ? 'B' : 'none', godB: deckGod(b).replace(/^god-/, '')});
  if (ui.first !== 'random') q.set('first', ui.first);
  location.href = `./divine/?${q}`;
}

const actions = {
  go: t => { ui.screen = t.dataset.screen; ui.play = false; },
  install: async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice.catch(() => null); installPrompt = null; render(); },
  play: () => { ui.screen = 'home'; ui.playOpening = !ui.play; ui.play = true; ui.slot = 'a'; ui.deckStep = false; ui.challengeSent = null; },
  'close-play': () => { ui.play = false; },
  avatar: async t => { try { ui.user = await api('/api/me', 'PATCH', {avatar_card: t.dataset.id}); } catch (e) { ui.profileMsg = {me: {text: e.message, kind: 'err'}}; } render(); },
  friends: () => social?.toggle(),
  'my-profile': () => openProfile(ui.user.username),
  rank: t => openRankPanel(ui.rank, t),
  'copy-code': async () => { await navigator.clipboard?.writeText(ui.user.friend_code).catch(() => {}); ui.copied = true; setTimeout(() => { ui.copied = false; render(); }, 1500); },
  slide: t => { ui.slide = (ui.slide || 0) + Number(t.dataset.step); },
  signout: async () => {
    if (!confirm('Sign out of your account?')) return;
    await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'}).catch(() => {});
    location.replace('/login/?v=3');
  },
  mode: t => { ui.mode = t.dataset.mode; ui.slot = 'a'; ui.challengeSent = null; remember(); },
  'deck-back': () => { ui.deckStep = false; },
  // Deck incompleto não entra; escolhido o deck, volta aos caminhos.
  // Contra a IA o rival é sorteado; no Local, sem deck B ainda, o passo continua para o B.
  'pick-a': t => { const d = findDeck(t.dataset.deck, presets); if (!d || !deckValid(d)) return; ui.deckA = t.dataset.deck; if (ui.mode === 'local' && !findDeck(ui.deckB, presets)) ui.slot = 'b'; else ui.deckStep = false; remember(); },
  'pick-b': t => { const d = findDeck(t.dataset.deck, presets); if (!d || !deckValid(d)) return; ui.deckB = t.dataset.deck; ui.slot = 'a'; ui.deckStep = false; remember(); },
  'choose-rival': () => { ui.rivalRandom = false; ui.slot = 'b'; ui.deckStep = true; remember(); },
  'random-rival': () => { ui.rivalRandom = true; ui.slot = 'a'; ui.deckStep = false; remember(); },
  slot: t => { ui.slot = t.dataset.slot; ui.deckStep = true; },
  'deck-filter': t => { ui[t.dataset.key] = t.dataset.value; },
  'first-pick': t => { ui.first = t.dataset.value; remember(); },
  'random-b': () => { const ok = allDecks().filter(d => deckValid(d) && d.id !== ui.deckA); if (ok.length) ui.deckB = ok[Math.floor(Math.random() * ok.length)].id; remember(); },
  start: startMatch,
  challenge: async t => {
    const d = findDeck(ui.deckA, presets);
    if (!d || !deckValid(d) || !social) return;
    try { await social.challenge(t.dataset.user, d); ui.challengeSent = `Challenge sent to ${t.dataset.user}. The duel starts when they accept.`; }
    catch (e) { ui.challengeSent = e.message; }
    render();
  },
  'collection-filter': t => { ui.colFilter = t.dataset.value; render(); },
  'buy-booster': async t => { try { ui.econ = await buyBooster(+t.dataset.qty || 1); } catch (e) { ui.notice = {title: 'Store', text: e.message}; } render(); },
  'open-booster': t => openBooster(face, r => { ui.econ = r; render(); }, ui.econ?.boosters, +t.dataset.count || 1),
  'new-deck': () => openBuilder(null),
  'edit-deck': t => openBuilder(allDecks().find(d => d.id === t.dataset.deck)),
  'filter-open': t => { ui.filterOpen = ui.filterOpen === t.dataset.key ? null : t.dataset.key; },
  'filter-toggle': t => { const b = filterState(), k = t.dataset.key, v = t.dataset.value; b[k] = b[k].includes(v) ? b[k].filter(x => x !== v) : [...b[k], v]; },
  'filter-clear': t => { filterState()[t.dataset.key] = []; },
  'pool-view': t => { ui.poolView = t.dataset.view; remember(); },
  'card-zoom': t => { const s = Object.keys(CARD_SIZES), i = s.indexOf(ui.cardSize || 'M') + Number(t.dataset.dir); ui.cardSize = s[Math.max(0, Math.min(s.length - 1, i))]; remember(); },
  'show-card': t => { ui.big = t.dataset.id; },
  add: t => setCount(t.dataset.id, 1),
  // Com toque, a carta abre para leitura e o + e o − montam o deck (no iOS não há contextmenu); com mouse, o clique adiciona.
  'slot-tap': t => { if (matchMedia('(max-width: 760px), (pointer: coarse)').matches) ui.big = t.dataset.id; else setCount(t.dataset.id, 1); },
  remove: t => setCount(t.dataset.id, -1),
  'set-domain': t => { ui.builder.deck.domain_id = t.dataset.id; ui.builder.dirty = true; },
  'builder-view': t => { ui.builder.view = t.dataset.view; },
  'save-deck': () => {
    const over = deckSize(ui.builder.deck) - DECK_SIZE;
    if (over > 0) { ui.notice = {title: 'Too many cards', text: `Decks can have at most ${DECK_SIZE} cards. Remove ${over} to save.`}; return; }
    saveDeck(); ui.screen = 'decks';
  },
  'delete-deck': () => {
    if (!confirm(`Delete "${ui.builder.deck.nome}"?`)) return;
    saveMyDecks(loadMyDecks().filter(d => d.id !== ui.builder.deck.id));
    ui.screen = 'decks';
  },
  'close-big': () => { ui.big = null; },
  'close-notice': () => { ui.notice = null; },
  'open-picker': t => { ui.picker = t.dataset.pick; },
  'close-picker': () => { ui.picker = null; ui.coverFor = null; },
  cover: t => { ui.coverFor = t.dataset.deck; ui.picker = 'thumb'; },
  'deck-dup': t => {
    const d = findDeck(t.dataset.deck, presets);
    if (!d) return;
    const copy = {...structuredClone(d), id: `my-${Date.now().toString(36)}`, nome: `${d.alpha_nome || d.nome} (copy)`, thumb: thumbOf(d) || undefined};
    delete copy.alpha_nome;
    saveMyDecks([...loadMyDecks(), copy]);
  },
  'deck-del': t => {
    const d = loadMyDecks().find(x => x.id === t.dataset.deck);
    if (!d || !confirm(`Delete "${d.nome}"?`)) return;
    saveMyDecks(loadMyDecks().filter(x => x.id !== d.id));
    if (ui.deckA === d.id) ui.deckA = null;
    remember();
  },
  'store-tab': t => { ui.storeTab = t.dataset.value; ui.cosPick = null; },
  'store-group': t => { ui.storeGroup = t.dataset.value; },
  'cos-pick': t => { ui.cosPick = {kind: t.dataset.kind, id: t.dataset.id}; },
  'cos-close': () => { ui.cosPick = null; },
  'buy-cos': async t => { try { ui.econ = await buyCosmetic(t.dataset.kind, t.dataset.id); } catch (e) { ui.notice = {title: 'Store', text: e.message}; } render(); },
  'use-cos': async t => {
    try { ui.user = await api('/api/me', 'PATCH', {[t.dataset.kind === 'avatar' ? 'avatar_card' : t.dataset.kind]: t.dataset.id}); } catch (e) { ui.notice = {title: 'Store', text: e.message}; }
    render();
  },
  picked: t => {
    const b = ui.builder, id = t.dataset.id;
    if (ui.coverFor) { // capa escolhida direto na tela Decks
      const own = loadMyDecks(), mine = own.find(x => x.id === ui.coverFor);
      if (mine) saveMyDecks(own.map(x => (x === mine ? {...x, thumb: id} : x))); else setDeckCover(ui.coverFor, id);
      ui.coverFor = null; ui.picker = null;
      return;
    }
    if (ui.picker === 'god') { b.deck.god = id; b.show = [...new Set([...b.show, faction(cards.get(id))])]; }
    if (ui.picker === 'domain') { b.deck.domain_id = id; b.show = [...new Set([...b.show, faction(cards.get(id))])]; }
    if (ui.picker === 'thumb') b.deck.thumb = id;
    b.dirty = true; ui.picker = null; ui.big = null;
  },
};

// render() troca o HTML e o foco se perde: no Jogar, volta ao mesmo controle ou ao título do passo novo.
function refocusPlay(t) {
  if (!ui.play) return;
  const same = ['act', 'mode', 'slot', 'value', 'user'].map(k => t?.dataset[k] ? `[data-${k}="${CSS.escape(t.dataset[k])}"]` : '').join('');
  (same && root.querySelector(`.ds ${same}`) || root.querySelector('.ds-head h2'))?.focus({preventScroll: true});
}
root.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (ui.deckMenu && !t?.disabled) { ui.deckMenu = null; if (!t || !actions[t.dataset.act]) return render(); }
  if (ui.filterOpen && !e.target.closest('.lb-drop')) { // tocar fora fecha o dropdown
    ui.filterOpen = null;
    if (!t || !actions[t.dataset.act]) { render(); if (t?.dataset.act === 'search') root.querySelector('[data-act="search"]')?.focus(); return; }
  }
  if (!t || !actions[t.dataset.act] || t.disabled) return;
  if (t.dataset.act === 'go' && ui.screen === 'builder' && ui.builder.dirty && !confirm('Leave without saving this deck?')) return;
  sound(t.dataset.act === 'play' ? 'play' : 'clique');
  actions[t.dataset.act](t);
  render();
  refocusPlay(t);
});
// Botão direito mostra a carta grande, como no jogo.
root.addEventListener('submit', e => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault(); submitProfile(form);
});
// Segurar a carta abre o preview (autor, 02/11/2026). No iOS não há contextmenu, e o toque na linha do deck remove uma cópia.
let holdTimer = null, holdFrom = null, held = false;
const cancelHold = () => { clearTimeout(holdTimer); holdFrom = null; };
root.addEventListener('pointerdown', e => {
  held = false; // gesto novo: o clique que sobra de um segurar só vem antes do próximo toque
  cancelHold();
  const t = e.target.closest('[data-card]');
  if (!t || e.pointerType === 'mouse') return;
  holdFrom = {x: e.clientX, y: e.clientY};
  holdTimer = setTimeout(() => { held = true; ui.big = t.dataset.card; render(); }, 450);
});
root.addEventListener('pointermove', e => { if (holdFrom && Math.hypot(e.clientX - holdFrom.x, e.clientY - holdFrom.y) > 10) cancelHold(); });
root.addEventListener('dragstart', e => { if (e.target.closest('[data-card]')) e.preventDefault(); }); // arrastar a imagem cancelaria o toque no iOS
addEventListener('pointerup', cancelHold);
addEventListener('pointercancel', cancelHold);
root.addEventListener('click', e => { if (held) { held = false; e.preventDefault(); e.stopPropagation(); } }, true);
root.addEventListener('contextmenu', e => {
  const wrap = e.target.closest('.lb-deckwrap'), deck = wrap?.querySelector('[data-act="edit-deck"]');
  if (deck) { // posição dentro do deck, já descontada a escala da tela (stage-fit)
    e.preventDefault();
    const r = wrap.getBoundingClientRect(), k = wrap.offsetWidth / r.width;
    ui.deckMenu = {id: deck.dataset.deck, x: Math.round((e.clientX - r.left) * k), y: Math.round((e.clientY - r.top) * k)};
    return render();
  }
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
  else if (act === 'deck-arena') { if (t.value) ui.builder.deck.arena = t.value; else delete ui.builder.deck.arena; ui.builder.dirty = true; } // cosmético, só neste deck
  else return;
  render();
});
root.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.act === 'volume') { setVolume(t.dataset.kind, t.value / 100); t.nextElementSibling.value = `${t.value}%`; }
  if (t.dataset.act === 'match-set') setMatch(t.dataset.key, t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value);
  if (t.dataset.act === 'match-set' && t.dataset.key === 'resolution') window.ssStage?.set(t.value); // palco 16:9 (shared/stage-fit.js)
  if (t.dataset.act === 'match-set' && /^card(Text|Size)$/.test(t.dataset.key)) window.ssStage?.a11y(); // acessibilidade das cartas
  if (t.dataset.act === 'match-set' && t.dataset.key === 'lang') { window.ssI18n?.set(t.value); render(); } // idioma PT-BR/EN (shared/i18n.js)
  if (t.dataset.act === 'fullscreen') toggleFullscreen();
  if (t.dataset.act === 'deck-search') {
    ui.deckQ = t.value; const q = t.value.toLowerCase();
    root.querySelectorAll('.ds-deck').forEach(el => { el.hidden = !el.dataset.name.includes(q); });
    root.querySelectorAll('.ds-row').forEach(row => { row.hidden = row.previousElementSibling.hidden = !row.querySelector('.ds-deck:not([hidden])'); });
  }
  if (t.dataset.act === 'search') {
    filterState().q = t.value;
    const at = t.selectionStart;
    render();
    const input = root.querySelector('[data-act="search"]');
    input.focus(); input.setSelectionRange(at, at);
  }
});
addEventListener('keydown', e => { if (e.key === 'Escape' && ui.filterOpen) { ui.filterOpen = null; render(); return; }
  if (e.key === 'Escape' && ui.play && ui.deckStep && !ui.big && !ui.notice && !ui.picker && !ui.cosPick) { ui.deckStep = false; render(); refocusPlay(); return; }
  if (e.key === 'Escape' && (ui.big || ui.play || ui.notice || ui.picker || ui.cosPick)) { ui.big = null; ui.play = false; ui.notice = null; ui.picker = null; ui.cosPick = null; render(); } });
// Áudio só começa após o primeiro gesto do jogador (política dos navegadores).
addEventListener('pointerdown', () => { unlock(); playMusic('menu'); }, {once: true});
// iPhone: fechar o teclado pode deixar a página deslocada, com o conteúdo sob o notch e sem a barra de cima.
addEventListener('focusout', () => { if (scrollY) scrollTo(0, 0); });

async function init() {
  const get = u => fetch(u).then(r => { if (!r.ok) throw Error(`Missing ${u}`); return r.json(); });
  const [canon, deckData, art, previewDecks, compDecks, ultraDecks, hiperDecks] = await Promise.all([get('../data/canon/d268.json'), get('../data/alpha-0.1/decks-proposta-d171.json'),
    get(`${ART}cards.json`).catch(() => ({cartas: []})), get('../data/alpha-0.1/decks-preview.json').catch(() => ({decks: []})), get('../data/alpha-0.1/decks-competitivos.json').catch(() => ({decks: []})), get('../data/alpha-0.1/decks-ultra.json').catch(() => ({decks: []})), get('../data/alpha-0.1/decks-hiper.json').catch(() => ({decks: []}))]);
  cards = loadCanon(canon); index = canonIndex(canon);
  fetch('../data/arenas-published.json', {cache: 'no-cache'}).then(r => (r.ok ? r.json() : null)).then(m => {
    arenaList = (m?.arenas || []).flatMap(a => a.variantes.map(v => [v.id === 'standard' ? a.id : `${a.id}~${v.id}`, v.id === 'standard' ? a.nome : `${a.nome} — ${v.nome}`]));
  }).catch(() => {}); // sem manifesto: só as arenas do código
  forge = new Map(art.cartas.map(c => [c.id, c]));
  // Coleção: holográfico da raridade com o cursor ou o toque em cima (VFX Forge V3). Só apresentação.
  fetch(`../${animFile('data/vfx-studio.json')}`, {cache: 'no-cache'}).then(r => (r.ok ? r.json() : null)).then(studio => { if (studio) startCardFx({quality: matchMedia('(pointer: coarse)').matches ? 'medium' : 'high', data: studio, card: id => forge.get(id), context: el => (el.closest('.lb-big') ? 'inspecao' : el.closest('.lb-card') ? 'colecao' : null)}); }).catch(() => {});
  useGodPortraits(art.cartas);
  addPreviewCards(cards, index, art.cartas);
  presets = [...deckData.decks, ...previewDecks.decks, ...compDecks.decks, ...ultraDecks.decks, ...hiperDecks.decks];
  gods = canon.gods.map(g => cards.get(g.id.toLowerCase()));
  if (!findDeck(ui.deckA, presets)) ui.deckA = presets[0]?.id;
  if (!findDeck(ui.deckB, presets)) ui.deckB = presets[1]?.id || presets[0]?.id;
  render();
  embedOpenFromHub(); // Cosmo Hub: abre o construtor (deck novo ou da conta)
  // Conta do sanctuary-api (login no /login/). Sem API (dev local), o lobby segue sem o nome no topo.
  fetch('/api/me', {credentials: 'same-origin'}).then(r => r.ok ? r.json() : null).then(u => { if (u) { ui.user = u; if (!u.complete) ui.screen = 'profile'; render(); startSocial(); loadRank().then(r => { ui.rank = r; if (r && ui.screen !== 'builder') render(); }); loadEconomy().then(e => { ui.econ = e; if (e && ui.screen !== 'builder') render(); }); if (u.username && !EMBED) syncDecks(u.username, () => { if (ui.screen !== 'builder') render(); }); } }).catch(() => {});
}
// Aviso discreto do salvamento dos decks (conta ou só este aparelho); não bloqueia nada.
let deckNote = null, deckNoteTimer = 0;
onDeckStatus(({text, kind}) => {
  if (embedWaiting && !/device only/.test(text)) embedWaiting();
  if (!deckNote) { deckNote = document.createElement('p'); deckNote.className = 'kv-status lb-deckstatus'; deckNote.setAttribute('role', 'status'); document.body.append(deckNote); }
  deckNote.className = `kv-status lb-deckstatus ${kind === 'warn' ? '' : kind}`; deckNote.textContent = text; deckNote.hidden = false;
  clearTimeout(deckNoteTimer); deckNoteTimer = setTimeout(() => { deckNote.hidden = true; }, 5000);
});
mountKV();
applyColors('lobby');
applyTexts(document.body);
if (telas.fundos?.lobby) root.style.setProperty('--lobby-fundo', `url('${img(telas.fundos.lobby)}')`);
init().catch(e => { root.innerHTML = `<p class="lb-loading">${esc(e.message)}</p>`; console.error(e); });
