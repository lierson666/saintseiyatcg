// Cosmo Hub (docs/platform-4.0.md). Cartas e regras vêm só do registro canônico; permissão é sempre decidida pelo servidor.
import {renderLiveCard} from '/shared/live-card.js';
import {mountKV} from '/shared/kv-sky.js';
import {decklistIndex, deckToText, textToDeck} from '/shared/decklist-text.js?v=20261108-1';
import {readFilters, filtersQuery, filterCatalog, filterCollection} from './codex-filter.js?v=20261109-p4';

const API = '/api/platform';
// Sem a API da plataforma no servidor, Codex e home seguem funcionando; o resto diz que abre em breve em vez de dar erro.
const apiUp = await fetch(`${API}/health`).then(r => r.ok).catch(() => false);
const NEEDS_API = new Set(['article', 'decks', 'deck', 'player', 'guilds', 'guild', 'tournaments', 'tournament', 'notifications', 'console', 'staff', 'collection']);
const root = document.getElementById('hub');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const when = t => t ? new Date(t * 1000).toLocaleDateString() : '';
const q = encodeURIComponent;

async function call(path, method = 'GET', body) {
  const r = await fetch(path, {method, credentials: 'same-origin', headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
  const data = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(data?.error || `Request failed (${r.status}).`), {status: r.status});
  return data;
}
const api = (path, method, body) => call(API + path, method, body);
const soon = () => `<section class="kv-card hub-soon"><p class="kv-stamp kv-stamp--gold">Opening soon</p><p>This part of the Sanctuary is being prepared. The Codex is already open.</p><div class="hub-cta"><a class="kv-ghost" href="#/codex">Open the Codex</a></div></section>`;
const TITLES = {player: 'Players', decks: 'Decks', guilds: 'Guilds', tournaments: 'Tournaments', notifications: 'Notifications', console: 'Console', staff: 'Staff', collection: 'Collection', article: 'Nexus', deck: 'Decks', guild: 'Guilds', tournament: 'Tournaments'};
const empty = text => `<p class="hub-empty">${esc(text)}</p>`;
const tiles = (items, html, none) => items.length ? `<div class="hub-grid">${items.map(html).join('')}</div>` : empty(none);
const formData = form => {
  const out = {};
  for (const [k, v] of new FormData(form)) out[k] = v;
  form.querySelectorAll('input[type=checkbox]').forEach(c => { out[c.name] = c.checked; });
  return out;
};

// ---------- Registro canônico ----------
let registry = null, artCards = null;
async function loadRegistry() {
  if (registry) return registry;
  const index = await call('/data/registry/index.json');
  const [cards, rules, glossary] = await Promise.all([`cards-${index.current.catalog}`, `rules-${index.current.rules}`, 'glossary'].map(f => call(`/data/registry/${f}.json`)));
  registry = {index, cards, rules, glossary};
  return registry;
}
// Decklist em texto (shared/decklist-text.js): no jogo o God é god-<facção>; no registro, <facção>-001.
const gameId = c => (c.type === 'God' ? `god-${c.faction.toLowerCase()}` : c.id);
const godName = god => String(god || '').replace(/^god-/, '').replace(/^\w/, ch => ch.toUpperCase());
const listTools = reg => {
  const byGame = new Map(reg.cards.map(c => [gameId(c), c]));
  return {index: decklistIndex(reg.cards.map(c => ({id: gameId(c), kind: c.type, names: [c.name, c.name_pt]}))), nameOf: id => byGame.get(id)?.name || id, card: id => byGame.get(id)};
};
// Grava na conta como deck novo (PUT /api/decks): aparece no jogo na próxima abertura. Cópia nunca nasce pública.
async function addToAccount(data, name) {
  const id = `my-${Date.now().toString(36)}`;
  await call(`/api/decks/${id}`, 'PUT', {data: {...data, id, nome: name, alpha_nome: undefined, public: false}, revision: 0});
  alertBox(`"${name}" is in your decks. Open Play to use it.`);
}

// ---------- Início ----------
const newsTile = n => `<a class="hub-tile" href="#/article/${esc(n.slug)}"><b>${esc(n.title)}</b><small>${esc(n.category || n.kind)} · ${when(n.publish_at)}</small></a>`;
const pct = r => `${Math.round(r * 100)}%`;
// Winrate só de duelos online (autor, 08/11/2026); abaixo da amostra mínima mostra a taxa com a contagem ao lado.
const winText = s => s?.matches ? `${pct(s.win_rate)} in ${s.matches} online duel${s.matches === 1 ? '' : 's'}` : 'No online duels yet';
const RARITY_RANK = {Divine: 4, Legendary: 3, Uncommon: 2, Common: 1};
const godSymbol = god => { const g = godName(god).toLowerCase(); return GODS.includes(g) ? `<img class="hub-sym" src="/CARD-TEMPLATE/symbols/${g}.xs.webp" alt="" width="20" height="20">` : ''; };
// Carta-chave (como a arte do arquétipo no MTGGoldfish): a de maior raridade com arte; empate vai para mais cópias e maior custo.
function keyCard(d) {
  if (!registry) return null;
  const tools = listTools(registry);
  const pick = (d.main || []).map(([id, n]) => ({c: tools.card(id), n})).filter(x => x.c && artOf(x.c.id))
    .sort((a, b) => (RARITY_RANK[b.c.rarity] || 0) - (RARITY_RANK[a.c.rarity] || 0) || b.n - a.n || (Number(b.c.cost) || 0) - (Number(a.c.cost) || 0))[0];
  return pick?.c || tools.card(d.god);
}
const deckCount = d => (d.main || []).reduce((n, [, q]) => n + q, 0);
const deckTile = d => {
  const key = keyCard(d);
  const g = godName(d.god).toLowerCase(), art = key ? artImg(key.id, key.name) : '';
  return `<a class="hub-deck" href="#/deck/${esc(d.id)}"><i>${art || (GODS.includes(g) ? `<img class="hub-deck-sym" src="/CARD-TEMPLATE/symbols/${g}.xs.webp" alt="">` : '')}</i><span><b>${esc(d.name)}</b>
    <small>${godSymbol(d.god)}${esc(godName(d.god))}${d.archetype ? ` · ${esc(d.archetype)}` : ''}</small>
    <small>${esc(d.author || '')}${d.main ? ` · ${deckCount(d)} cards` : ''}${d.rating ? ` · ★ ${d.rating}` : ''}</small><small class="hub-win">${winText(d.stats)}</small></span></a>`;
};
const deckTiles = (list, none) => list.length ? `<div class="hub-decks">${list.map(deckTile).join('')}</div>` : empty(none);
const eventTile = t => `<a class="hub-tile" href="#/tournament/${esc(t.id)}"><b>${esc(t.name)}</b><small>${esc(t.format)} · ${esc(t.category)} · ${esc(t.status)}</small></a>`;

const artOf = id => artCards?.get(id)?.ilustracao;
const thumb = id => {
  const file = artOf(id);
  return file ? `/card-forge/art-web/webp/${esc(file.replace(/\.[a-z]+$/i, '.webp'))}` : '';
};
const fallbackArt = id => `/card-forge/art-web/${esc(artOf(id) || '')}`;
const artImg = (id, alt = '', eager = false) => artOf(id) ? `<img src="${thumb(id)}" data-fallback="${fallbackArt(id)}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}">` : '';
const loadArt = async () => { artCards ??= await call('/card-forge/art-web/cards.json').then(d => new Map(d.cartas.map(x => [x.id, x]))).catch(() => new Map()); };

async function home() {
  const [reg, f] = await Promise.all([loadRegistry(), apiUp ? api('/home').catch(() => null) : null, loadArt()]);
  const live = reg.cards.filter(c => c.publication !== 'cut');
  const gods = live.filter(c => c.type === 'God');
  const module = (href, stamp, title, text, wide, art) => `<a class="kv-card hub-module ${wide ? 'hub-module--wide' : ''}" href="${href}">${art ? artImg(art) : ''}<p class="kv-stamp">${stamp}</p><b>${title}</b><span>${text}</span></a>`;
  return `<section class="hub-hero">
      <div><p class="kv-stamp kv-stamp--gold">The official portal of the game</p>
        <h1><span class="kv-lyric">Enter the</span><span class="kv-cosmo">Sanctuary</span></h1>
        <p class="hub-lead">Every card, every rule, every deck and every battle of the Holy War, in one place.</p>
        <div class="hub-cta"><a class="kv-button" href="/playtest/">Play now</a><a class="kv-ghost" href="#/codex">Open the Codex</a></div></div>
      <div class="hub-fan">${gods.slice(0, 5).map(g => `<a href="#/card/${esc(g.id)}" aria-label="${esc(g.name)}">${artImg(g.id, g.name, true)}</a>`).join('')}</div>
    </section>
    <dl class="hub-numbers"><div><dd>${live.length}</dd><dt>Cards</dt></div><div><dd>${reg.rules.length}</dd><dt>Rules</dt></div><div><dd>${gods.length}</dd><dt>Gods</dt></div><div><dd>${reg.glossary.length}</dd><dt>Terms</dt></div></dl>
    <h2>Explore</h2><div class="hub-bento">
      ${module('#/codex', 'Codex', 'Every card and every rule', 'Search every card and the official rulebook.', true, gods[0]?.id)}
      ${module('#/nexus', 'Nexus', 'News and the meta', 'Newsroom, Meta Hub and the balance archive.', true, gods[1]?.id)}
      ${module('#/decks', 'Decks', 'Share your deck', 'Public lists, versions and discussion.')}
      ${module('#/guilds', 'Guilds', 'Find your order', 'Members, teams and announcements.')}
      ${module('#/tournaments', 'Tournaments', 'Prove your Cosmo', 'Community events, online and in person.')}
    </div>
    <h2>The Gods</h2><div class="hub-gods">${gods.map(g => `<a class="hub-god" href="#/codex/cards/${q(g.faction)}">${artImg(g.id, '')}<span>${esc(g.name)}</span></a>`).join('')}</div>
    ${f ? `<h2>Latest News</h2>${tiles(f.news, newsTile, 'Nothing published yet.')}
    <h2>Featured Decks</h2>${deckTiles(f.decks, 'Nothing published yet.')}
    <h2>Balance Updates</h2>${tiles(f.balance, newsTile, 'Nothing published yet.')}
    <h2>Tournament Highlights</h2>${tiles(f.tournaments, eventTile, 'Nothing published yet.')}` : ''}`;
}

async function article(slug) {
  const a = await api(`/content/${q(slug)}`);
  return `${articleBody(a)}
    ${a.status === 'published' ? await discussion(`content:${a.slug}`) : ''}`;
}
const articleBody = a => `<h1>${esc(a.title)}</h1><p class="hub-muted">${esc(a.author || '')} · ${when(a.publish_at)}${a.revision ? ` · revision ${a.revision}` : ''}</p>
  <div class="hub-rule">${esc(a.body)}</div>${a.kind === 'balance' ? balanceDetails(a.meta || {}) : ''}`;
const balanceDetails = m => `<h2>Change</h2><div class="hub-scroll"><table class="hub-table"><tbody>${['affected', 'previous', 'new', 'release', 'effective', 'reason', 'tests'].map(k => `<tr><th>${k}</th><td>${esc(typeof m[k] === 'string' ? m[k] : JSON.stringify(m[k]))}</td></tr>`).join('')}</tbody></table></div>`;

// ---------- Codex ----------
const codexTabs = cur => `<nav class="hub-tabs">${[['cards', 'Card Database'], ['rules', 'Official Rules'], ['glossary', 'Glossary'], ['rulings', 'Rulings'], ['academy', 'Academy']].map(([k, l]) => `<a href="#/codex/${k}" ${cur === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;

async function codex(tab = 'cards', faction = '') {
  const reg = await loadRegistry();
  await loadArt();
  const head = `<h1>Codex</h1><p class="hub-lead">Every card and every rule of the game, always in sync with what the game plays.</p>${codexTabs(tab)}`;
  if (tab === 'rules') return `${head}<div class="hub-row"><input id="rule-q" type="search" placeholder="Search" aria-label="Search rules"></div><div id="rule-list"></div>`;
  if (tab === 'glossary') return `${head}<div class="hub-scroll"><table class="hub-table"><thead><tr><th>EN</th><th>PT-BR</th><th>Note</th></tr></thead><tbody>${reg.glossary.map(g => `<tr><td>${esc(g.en)}</td><td>${esc(g.pt)}</td><td>${esc(g.note)}</td></tr>`).join('')}</tbody></table></div>`;
  if (tab === 'rulings' || tab === 'academy') {
    if (!apiUp) return head + soon();
    const kind = tab === 'rulings' ? 'ruling' : 'lesson';
    const {items} = await api(`/content?kind=${kind}`);
    return `${head}${tiles(items, newsTile, 'Nothing published yet.')}`;
  }
  const f = readFilters(query());
  if (faction && !f.faction) f.faction = faction; // link antigo #/codex/cards/Athena
  return head + cardFilterForm(reg, f);
}
const opts = (values, chosen) => values.map(v => `<option ${v === chosen ? 'selected' : ''}>${esc(v)}</option>`).join('');
function cardFilterForm(reg, f, extra = '') {
  const opts = (values, chosen) => values.map(v => `<option ${v === chosen ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const distinct = key => [...new Set(reg.cards.map(c => c[key]).filter(Boolean))].sort();
  const counts = reg.cards.flatMap(c => c.keywords || []).reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
  const keywords = [...counts].filter(([, n]) => n > 1).map(([k]) => k).sort(); // texto solto de uma carta só não vira filtro
  const factions = distinct('faction');
  const chip = v => `<button type="button" class="hub-chip" data-faction="${esc(v)}" aria-pressed="${f.faction === v}">${v === 'Neutral' ? '' : `<img src="/CARD-TEMPLATE/symbols/${esc(v.toLowerCase())}.xs.webp" alt="" width="20" height="20">`}${esc(v)}</button>`;
  return `<div class="hub-chips" role="group" aria-label="Faction"><button type="button" class="hub-chip" data-faction="" aria-pressed="${!f.faction}">All</button>${factions.map(chip).join('')}</div>
    <form class="hub-row hub-filters" id="card-filters" role="search" aria-label="Filter cards"><input id="card-q" name="q" type="search" placeholder="Search name, ability or id" aria-label="Search cards" value="${esc(f.q)}">
    <select id="card-type" name="type" aria-label="Type"><option value="">All types</option>${opts(distinct('type'), f.type)}</select>
    <select id="card-rarity" name="rarity" aria-label="Rarity"><option value="">All rarities</option>${opts(distinct('rarity'), f.rarity)}</select>
    <select id="card-cost" name="cost" aria-label="Cost"><option value="">Any cost</option>${opts(['0', '1', '2', '3', '4', '5', '6', '7+'], f.cost)}</select>
    <select id="card-keyword" name="keyword" aria-label="Keyword"><option value="">All keywords</option>${opts(keywords, f.keyword)}</select>${extra}
    <input type="hidden" name="faction" value="${esc(f.faction)}"><button type="button" class="kv-ghost hub-clear" data-clear>Clear</button></form>
    <div id="card-list" aria-live="polite"></div>`;
}

// Arte ainda sem versão leve cai no JPG original.
function armFallback(img) {
  img.addEventListener('error', () => { if (img.getAttribute('src') !== img.dataset.fallback) img.src = img.dataset.fallback; }, {once: true});
}

// Lista completa em páginas de 60: rolar até o fim (ou o botão) carrega mais. Filtros vão para a URL sem recarregar a tela.
const PAGE = 60;
let shownCards = PAGE, moreObserver = null;
let owning = null; // {pool: Set, qty: id => n} só na página da Coleção
const cardThumb = c => `<a class="hub-thumb${owning && !owning.qty(c.id) ? ' is-missing' : ''}" href="#/card/${esc(c.id)}">${owning ? `<em class="hub-qty">${owning.qty(c.id)}/${owning.limit}</em>` : ''}<i>${artImg(c.id, c.name) || '<span class="hub-noart" aria-hidden="true"></span>'}</i><b>${esc(c.name)}</b><small>${esc(c.faction)} · ${esc(c.type)}${c.cost != null ? ` · ${c.cost}` : ''}</small></a>`;
function cardFilters() {
  const form = document.getElementById('card-filters');
  return form ? Object.fromEntries(new FormData(form)) : null;
}
function filterCards(reset = true) {
  const list = document.getElementById('card-list'), f = cardFilters();
  if (!list || !f) return;
  if (reset) shownCards = PAGE;
  const found = owning ? filterCollection(registry.cards, f, owning.pool, owning.qty) : filterCatalog(registry.cards, f);
  const qs = filtersQuery(f), path = location.hash.split('?')[0].replace(/^#\/codex\/?$/, '#/codex/cards');
  history.replaceState(null, '', path + (qs ? `?${qs}` : ''));
  document.querySelectorAll('.hub-chip[data-faction]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.faction === f.faction)));
  const more = found.length > shownCards;
  list.innerHTML = `<p class="hub-muted">${found.length} cards</p>` + (found.length
    ? `<div class="hub-cards">${found.slice(0, shownCards).map(cardThumb).join('')}</div>${more ? `<button type="button" class="kv-ghost hub-more" id="card-more">Show more (${found.length - shownCards})</button>` : ''}`
    : empty('No cards match these filters.'));
  list.querySelectorAll('img[data-fallback]').forEach(armFallback);
  moreObserver?.disconnect();
  const btn = document.getElementById('card-more');
  if (btn && 'IntersectionObserver' in window) {
    moreObserver = new IntersectionObserver(e => { if (e[0].isIntersecting) { shownCards += PAGE; filterCards(false); } }, {rootMargin: '600px'});
    moreObserver.observe(btn);
  }
}

function filterRules() {
  const list = document.getElementById('rule-list');
  if (!list) return;
  const term = document.getElementById('rule-q').value.toLowerCase();
  const found = registry.rules.filter(r => !term || (r.title + ' ' + r.body).toLowerCase().includes(term));
  list.innerHTML = tiles(found, r => `<a class="hub-tile" href="#/rule/${esc(r.id)}"><b>${esc(r.number)}. ${esc(r.title)}</b><small>${esc(r.chapter || '')}${r.status === 'review' ? ' · under review' : ''}</small></a>`, 'No rules match.');
}

async function cardPage(id) {
  const reg = await loadRegistry();
  const c = reg.cards.find(x => x.id === id);
  if (!c) return empty('Card not found.');
  await loadArt();
  const art = artCards.get(id);
  let picture = '';
  try {
    picture = art ? renderLiveCard(art, {art: art.ilustracao ? `/card-forge/art-web/${art.ilustracao}` : null}) : '';
  } catch { picture = ''; }
  const {items} = apiUp ? await api('/content?kind=ruling') : {items: []};
  const rulings = items.filter(r => (r.meta.card_refs || []).includes(id));
  const rules = reg.rules.filter(r => r.cards.includes(id));
  const stat = (k, v) => v == null || v === '' ? '' : `<tr><th>${k}</th><td>${esc(v)}</td></tr>`;
  return `<h1>${esc(c.name)}</h1><div class="hub-card"><div>${picture || empty('No artwork yet.')}</div><div>
    <div class="hub-scroll"><table class="hub-table"><tbody>${stat('Number', c.number)}${stat('Edition', c.edition)}${stat('Faction', c.faction)}${stat('Type', c.type)}${stat('Subtype', c.subtypes.join(', '))}${stat('Rarity', c.rarity)}${stat('Cost', c.cost)}${stat('Equip cost', c.equip_cost)}${stat('ATK', c.attack)}${stat('HP', c.hp)}${stat('Soul', c.soul)}${stat('Publication', c.publication)}</tbody></table></div>
    <h2>Abilities</h2>${c.abilities.length ? c.abilities.map(a => `<p>${esc(a)}</p>`).join('') : empty('No abilities.')}
    ${c.awaken_text ? `<h2>Awaken</h2><p>${esc(c.awaken_text)}</p>` : ''}${c.ultimate ? `<h2>Ultimate</h2><p>${esc(c.ultimate)}</p>` : ''}
    ${rules.length ? `<h2>Rules</h2>${rules.map(r => `<p><a href="#/rule/${esc(r.id)}">${esc(r.number)}. ${esc(r.title)}</a></p>`).join('')}` : ''}
    <h2>Rulings</h2>${tiles(rulings, newsTile, 'Nothing published yet.')}</div></div>
    ${apiUp ? await cardDecks(c) : ''}${apiUp ? await discussion(`card:${id}`) : ''}`;
}

// Página da carta: decks públicos cuja versão atual usa a carta (God e Domain contam), melhores primeiro.
async function cardDecks(c) {
  const {decks: list, total} = await api(`/decks?card=${q(gameId(c))}&sort=winrate&limit=12`).catch(() => ({decks: [], total: 0}));
  return `<h2>Public decks with this card${total ? ` (${total})` : ''}</h2>${deckTiles(list, 'No public deck uses this card yet.')}`;
}

// ---------- Perfil público (Cosmo Hub 2.0, P2): mesma conta do jogo, só dados públicos (servidor: /api/players/<user>) ----------
const playerLink = name => name ? `<a href="#/player/${esc(String(name).toLowerCase())}">${esc(name)}</a>` : '';
async function playerPage(username) {
  const [p, decksOf] = await Promise.all([call(`/api/players/${q(username)}`), api(`/decks?author=${q(username)}&limit=24`), loadArt(), loadRegistry()]);
  const god = p.favorite_god ? String(p.favorite_god).replace(/^god-/, '').toLowerCase() : '';
  const r = p.rank || {}, st = p.stats || {};
  const done = p.achievements.filter(a => a.done).length;
  const result = {win: 'Win', loss: 'Loss', draw: 'Draw'};
  return `<div class="hub-profile"><div class="hub-avatar">${artImg(p.avatar_card || (god && `${god}-001`) || '', p.username, true)}</div><div>
      <h1>${esc(p.username)}</h1><p class="hub-muted">Joined ${when(p.joined)}${god ? ` · Favorite God <img class="hub-sym" src="/CARD-TEMPLATE/symbols/${esc(god)}.xs.webp" alt="" width="20" height="20"> ${esc(godName(god))}` : ''}</p>
      <div class="hub-grid"><div class="hub-tile"><b>${esc(r.tier || 'Unranked')}${r.division ? ` ${esc(r.division)}` : ''}</b><small>Level ${esc(r.level ?? 1)}${r.title ? ` · ${esc(r.title)}` : ''}</small></div>
        <div class="hub-tile"><b>${st.played ? `${st.winrate}%` : '—'}</b><small>${st.played || 0} online duels · ${st.wins || 0} wins · ${st.losses || 0} losses</small></div>
        <div class="hub-tile"><b>${done} / ${p.achievements.length}</b><small>Achievements</small></div></div></div></div>
    <h2>Achievements</h2><div class="hub-grid">${p.achievements.map(a => `<div class="hub-tile ${a.done ? 'is-done' : 'is-locked'}"><b>${a.done ? '★ ' : ''}${esc(a.name)}</b><small>${esc(a.description)}</small></div>`).join('')}</div>
    <h2>Public decks</h2>${deckTiles(decksOf.decks, 'No public decks yet.')}
    <h2>Recent online duels</h2>${p.recent.length ? `<div class="hub-scroll"><table class="hub-table"><tbody>${p.recent.map(d => `<tr><td>${when(d.date)}</td><td>${result[d.result] || ''}</td><td>${esc(godName(d.god))} vs ${esc(godName(d.opponent_god))}</td></tr>`).join('')}</tbody></table></div>` : empty('No online duels yet.')}`;
}

async function rulePage(id) {
  const reg = await loadRegistry();
  const r = reg.rules.find(x => x.id === id);
  if (!r) return empty('Rule not found.');
  const cards = reg.cards.filter(c => r.cards.includes(c.id)).slice(0, 24);
  return `<h1>${esc(r.number)}. ${esc(r.title)}</h1><p class="hub-muted">${esc(r.chapter || '')} · ${esc(r.id)} · version ${esc(reg.index.current.rules)}${r.status === 'review' ? ' · under review' : ''}</p>
    <div class="hub-rule">${esc(r.body)}</div>${cards.length ? `<h2>Related cards</h2>${tiles(cards, c => `<a class="hub-tile" href="#/card/${esc(c.id)}"><b>${esc(c.name)}</b></a>`, '')}` : ''}
    <h2>Rules history</h2>${tiles(reg.index.history.slice().reverse(), h => `<div class="hub-tile"><b>${esc(h.rules)}</b><small>${when(h.at)}</small></div>`, 'No history.')}`;
}

// ---------- Nexus ----------
async function nexus(tab = 'news') {
  const nav = `<h1>Nexus</h1><nav class="hub-tabs">${[['news', 'Newsroom'], ['meta', 'Meta Hub'], ['balance', 'Balance Center']].map(([k, l]) => `<a href="#/nexus/${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  if (!apiUp) return nav + soon();
  if (tab === 'meta') {
    const m = await api('/meta');
    return `${nav}<p class="hub-muted">${m.matches} online duels in ${esc(m.environment)}. Win rates need at least ${m.min_sample} matches. Excluded: ${esc(m.excluded.join(', '))}. These are not Official statistics.</p>
      ${m.gods.length ? `<div class="hub-scroll"><table class="hub-table"><thead><tr><th>God</th><th>Matches</th><th>Share</th><th>Win rate</th></tr></thead><tbody>${m.gods.map(g => `<tr><td>${esc(g.god)}</td><td>${g.matches}</td><td>${(g.share * 100).toFixed(1)}%</td><td>${g.sample_ok ? `${(g.win_rate * 100).toFixed(1)}%` : 'Sample too small'}</td></tr>`).join('')}</tbody></table></div>` : empty('No eligible matches yet.')}`;
  }
  const {items} = await api(`/content?kind=${tab === 'balance' ? 'balance' : 'news'}`);
  return nav + tiles(items, newsTile, 'Nothing published yet.');
}

// ---------- Decks ----------
const signedOut = e => e.status === 401 ? null : Promise.reject(e);

// Biblioteca: filtro por God, ordenação e página ficam na URL (#/decks?g=hades&s=winrate&p=2).
const GODS = ['athena', 'poseidon', 'hades', 'ares', 'artemis'];
const SORTS = [['recent', 'Most recent'], ['winrate', 'Best online win rate'], ['rating', 'Best rated'], ['popular', 'Most favorited']];
async function decks() {
  const p = new URLSearchParams(query()), god = GODS.includes(p.get('g')) ? p.get('g') : '', sort = SORTS.some(([k]) => k === p.get('s')) ? p.get('s') : 'recent', page = Math.max(1, Number(p.get('p')) || 1);
  const link = changes => { const n = new URLSearchParams({g: god, s: sort, p: page, v: p.get('v') === 'table' ? 'table' : '', ...changes}); [...n].forEach(([k, v]) => { if (!v || (k === 's' && v === 'recent') || (k === 'p' && v === '1')) n.delete(k); }); return `#/decks${String(n) ? `?${n}` : ''}`; };
  const view = p.get('v') === 'table' ? 'table' : 'tiles';
  const [lib, mine, account, meta] = await Promise.all([api(`/decks?sort=${sort}&page=${page}&limit=24${god ? `&god=god-${god}` : ''}`), api('/decks?mine=1').catch(signedOut), call('/api/decks').catch(signedOut), api('/meta').catch(() => null), loadRegistry(), loadArt()]);
  const open = lib.decks;
  // Metagame (como o MTGGoldfish): cada Deus com fatia dos duelos online e winrate; clicar filtra a lista.
  const godMeta = Object.fromEntries((meta?.gods || []).map(g => [godName(g.god).toLowerCase(), g]));
  const metaTile = g => { const m = godMeta[g]; return `<a class="hub-meta" href="${link({g: god === g ? '' : g, p: 1})}" ${god === g ? 'aria-current="true"' : ''}><img src="/CARD-TEMPLATE/symbols/${g}.xs.webp" alt="" width="36" height="36"><b>${esc(godName(g))}</b>
    <small>${m ? `${pct(m.share)} of the meta` : 'No online duels yet'}</small><small class="hub-win">${m?.sample_ok ? `${pct(m.win_rate)} win rate` : m ? `${m.matches} duels (small sample)` : ''}</small></a>`; };
  const tools = `<h2>Metagame</h2><p class="hub-muted">${meta ? `${meta.matches} online duels. ` : ''}Pick a God to filter the decks.</p><div class="hub-metas">${GODS.map(metaTile).join('')}</div>
    <h2>Public decks</h2><div class="hub-row"><label class="hub-inline">Sort <select data-nav="sort">${SORTS.map(([k, l]) => `<option value="${link({s: k, p: 1})}" ${k === sort ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <nav class="hub-seg" aria-label="View"><a href="${link({v: ''})}" ${view === 'tiles' ? 'aria-current="true"' : ''}>Tiles</a><a href="${link({v: 'table'})}" ${view === 'table' ? 'aria-current="true"' : ''}>Table</a></nav><span class="hub-muted">${lib.total} decks${god ? ` · ${esc(godName(god))}` : ''}</span></div>`;
  const table = list => list.length ? `<div class="hub-scroll"><table class="hub-table hub-decktable"><thead><tr><th>Deck</th><th>God</th><th>Author</th><th>Win rate</th><th>Duels</th><th>Cards</th><th>Rating</th><th>Updated</th></tr></thead><tbody>${list.map(d => `<tr>
    <td><a href="#/deck/${esc(d.id)}">${esc(d.name)}</a></td><td>${godSymbol(d.god)}${esc(godName(d.god))}</td><td>${playerLink(d.author)}</td><td>${d.stats?.matches ? pct(d.stats.win_rate) : '—'}</td><td>${d.stats?.matches || 0}</td><td>${deckCount(d)}</td><td>${d.rating ? `★ ${d.rating}` : '—'}</td><td>${when(d.updated_at)}</td></tr>`).join('')}</tbody></table></div>` : empty(god ? 'No public decks for this God yet.' : 'Nothing published yet.');
  const pager = lib.pages > 1 ? `<nav class="hub-row hub-pager" aria-label="Pages">${page > 1 ? `<a class="kv-ghost" href="${link({p: page - 1})}">← Previous</a>` : ''}<span class="hub-muted">Page ${lib.page} of ${lib.pages}</span>${page < lib.pages ? `<a class="kv-ghost" href="${link({p: page + 1})}">Next →</a>` : ''}</nav>` : '';
  const share = account ? `<h2>Share a deck</h2><form class="hub-form" data-do="share-deck">
      <label>Deck<select name="deck_id" required>${account.decks.map(d => `<option value="${esc(d.id)}">${esc(d.data?.alpha_nome || d.data?.nome || d.data?.name || d.id)}</option>`).join('')}</select></label>
      <label>Visibility<select name="visibility"><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></label>
      <label>Archetype<input name="archetype" maxlength="60"></label><label>Strategy<textarea name="strategy" maxlength="4000" rows="3"></textarea></label><button>Share</button></form>` : '';
  const importForm = account ? `<h2>Import a deck list</h2><form class="hub-form" data-do="import-list"><label>Deck list<textarea name="list" rows="8" required placeholder="Name: My deck&#10;God&#10;1 Athena (god-athena)&#10;Domain&#10;1 Jamir Tower (athena-v6-063)&#10;Deck&#10;3 Gemini Saga (athena-v6-013)"></textarea></label><button>Add to my decks</button></form>`
    : `<p class="hub-muted"><a href="/login/?next=${q('/cosmohub/#/decks')}">Sign in</a> to import deck lists and copy decks to your account.</p>`;
  return `<h1>Decks</h1><p class="hub-lead">Decks marked Public in the game show up here, with comments and online win rate.</p>${tools}${view === 'table' ? table(open) : deckTiles(open, god ? 'No public decks for this God yet.' : 'Nothing published yet.')}${pager}
    ${mine ? `<h2>My decks</h2>${deckTiles(mine.decks, 'You have not shared a deck yet. Mark a deck Public in the game.')}` : ''}${importForm}${share}`;
}

// Curva de Cosmo (custo 0–7+) e tipos, lidas do registro canônico.
function curveHtml(main, tools) {
  const curve = Array(8).fill(0), types = {};
  for (const e of main) {
    const c = tools.card(e.card_id), n = e.quantity || 1;
    if (!c) continue;
    curve[Math.min(7, Math.max(0, Number(c.cost) || 0))] += n;
    types[c.type] = (types[c.type] || 0) + n;
  }
  const peak = Math.max(1, ...curve);
  return `<h2>Cosmo curve</h2><div class="hub-curve" role="img" aria-label="Cosmo curve: ${curve.map((n, i) => `${n} at cost ${i === 7 ? '7+' : i}`).join(', ')}">${curve.map((n, i) => `<span style="--h:${n / peak}"><i>${n || ''}</i><b>${i === 7 ? '7+' : i}</b></span>`).join('')}</div>
    <p class="hub-muted">${Object.entries(types).map(([t, n]) => `${n} ${esc(t)}`).join(' · ')}</p>`;
}

const TYPE_ORDER = [['Devotee', 'Devotees'], ['Spell', 'Spells'], ['Equipment', 'Equipment']];
function deckSections(d, tools, visual) {
  const entry = (cid, n) => ({c: tools.card(cid), cid, n});
  const sort = (a, b) => (Number(a.c?.cost) || 0) - (Number(b.c?.cost) || 0) || String(a.c?.name).localeCompare(String(b.c?.name));
  const main = (d.data.main_deck || []).map(e => entry(e.card_id, e.quantity || 1));
  const groups = [['God and Domain', [entry(d.data.god || 'god-athena', 1), ...(d.data.domain_id ? [entry(d.data.domain_id, 1)] : [])]],
    ...TYPE_ORDER.map(([t, label]) => [label, main.filter(x => x.c?.type === t).sort(sort)]),
    ['Other', main.filter(x => !TYPE_ORDER.some(([t]) => x.c?.type === t)).sort(sort)]].filter(([, list]) => list.length);
  const total = list => list.reduce((n, x) => n + x.n, 0);
  const href = x => `#/card/${esc(x.c?.id || x.cid)}`;
  if (visual) return groups.map(([label, list]) => `<h3>${esc(label)} <span>(${total(list)})</span></h3><div class="hub-cards">${list.map(x => `<a class="hub-thumb" href="${href(x)}"><em class="hub-qty">${x.n}×</em><i>${x.c && artImg(x.c.id, x.c.name) || '<span class="hub-noart" aria-hidden="true"></span>'}</i><b>${esc(x.c?.name || x.cid)}</b></a>`).join('')}</div>`).join('');
  return groups.map(([label, list]) => `<table class="hub-table hub-list"><thead><tr><th colspan="2">${esc(label)} <span>(${total(list)})</span></th><th>Cost</th><th>Rarity</th></tr></thead><tbody>${list.map(x => `<tr><td class="hub-n">${x.n}</td><td><a href="${href(x)}">${esc(x.c?.name || x.cid)}</a></td><td>${x.c?.cost ?? '—'}</td><td>${esc(x.c?.rarity || '—')}</td></tr>`).join('')}</tbody></table>`).join('');
}
function breakdown(main, tools) {
  const by = {};
  for (const e of main) { const r = tools.card(e.card_id)?.rarity; if (r) by[r] = (by[r] || 0) + (e.quantity || 1); }
  return `<p class="hub-muted">${Object.keys(RARITY_RANK).filter(r => by[r]).map(r => `${by[r]} ${esc(r)}`).join(' · ')}</p>`;
}
async function deckPage(id) {
  const [d, reg] = await Promise.all([api(`/decks/${q(id)}`), loadRegistry(), loadArt()]);
  const tools = listTools(reg), main = d.data.main_deck || [];
  const visual = new URLSearchParams(query()).get('v') !== 'text';
  const s = d.stats || {}, now_ = s.current_version || {};
  const small = s.matches && !s.sample_ok ? ' <small class="hub-muted">(small sample)</small>' : '';
  const add = d.mine ? `<button data-do="fork-deck" data-id="${esc(id)}">Add to my decks</button>` : `<a class="kv-ghost" href="/login/?next=${q(`/cosmohub/#/deck/${id}`)}">Sign in to add to your decks</a>`;
  const count = main.reduce((n, e) => n + (e.quantity || 1), 0);
  return `<h1>${esc(d.name)}</h1><p class="hub-muted">${godSymbol(d.god)}${esc(godName(d.god))}${d.archetype ? ` · ${esc(d.archetype)}` : ''} · ${playerLink(d.author)} · v${d.version} · ${when(d.versions[0]?.at)} · ${esc(d.visibility)}${d.rating ? ` · ★ ${d.rating} (${d.ratings})` : ''} · ${d.favorites} favorites</p>
    <div class="hub-deckpage"><section aria-label="Deck list"><div class="hub-row"><nav class="hub-seg" aria-label="View"><a href="#/deck/${esc(id)}" ${visual ? 'aria-current="true"' : ''}>Visual</a><a href="#/deck/${esc(id)}?v=text" ${visual ? '' : 'aria-current="true"'}>Text</a></nav><span class="hub-muted">${count} cards</span></div>
      ${deckSections(d, tools, visual)}</section>
    <aside class="hub-side"><div class="hub-tile"><b>Win rate ${s.matches ? pct(s.win_rate) : '—'}${small}</b><small>${s.matches || 0} online duels · ${s.wins || 0} wins · all versions</small></div>
      <div class="hub-tile"><b>This version ${now_.matches ? pct(now_.win_rate) : '—'}</b><small>${now_.matches || 0} online duels with v${d.version}</small></div>
    <div class="hub-row">${add}<button data-do="copy-list" data-id="${esc(id)}">Copy list</button><button data-do="copy-link" data-id="${esc(id)}">Copy link</button>
      ${d.mine && !d.mine.owner ? `<label>Rate <select data-change="rate-deck" data-id="${esc(id)}"><option value="">—</option>${[1, 2, 3, 4, 5].map(st => `<option ${d.mine.stars === st ? 'selected' : ''}>${st}</option>`).join('')}</select></label>` : ''}
      ${d.mine ? `<button data-do="favorite-deck" data-id="${esc(id)}">${d.mine.favorite ? 'Remove favorite' : 'Favorite'}</button>` : ''}
      ${d.mine?.owner ? `<select data-change="deck-visibility" data-id="${esc(id)}" aria-label="Visibility">${['private', 'unlisted', 'public'].map(v => `<option ${d.visibility === v ? 'selected' : ''}>${v}</option>`).join('')}</select>` : ''}</div>
    ${curveHtml(main, tools)}${breakdown(main, tools)}
    <h2>Version history</h2><p class="hub-muted">${d.versions.map(v => `v${v.version} (${when(v.at)})`).join(' · ')}</p></aside></div>
    ${d.strategy ? `<h2>Strategy</h2><div class="hub-rule">${esc(d.strategy)}</div>` : ''}
    ${d.visibility === 'private' ? '' : await discussion(`deck:${id}`)}`;
}

// ---------- Discussões ----------
async function discussion(target) {
  const [{comments}] = await Promise.all([api(`/comments?target=${q(target)}&sort=top`), meReady]);
  const kids = {};
  for (const c of comments) (kids[c.parent_id ?? 0] ||= []).push(c);
  const node = c => `<div class="hub-comment"><small class="hub-muted">${c.author ? playerLink(c.author) : 'removed'} · ${when(c.at)} · ${c.score}</small><p>${c.removed ? '<em>Removed</em>' : esc(c.body)}</p>
    ${c.removed ? '' : `<div class="hub-row"><button data-do="vote" data-id="${c.id}" data-value="1" aria-label="Upvote">▲</button><button data-do="vote" data-id="${c.id}" data-value="-1" aria-label="Downvote">▼</button><button data-do="reply" data-id="${c.id}" data-target="${esc(target)}">Reply</button><button data-do="report-comment" data-id="${c.id}">Report</button>${staff.mod ? `<button data-do="hide-comment" data-id="${c.id}">Hide</button>` : ''}</div>`}
    ${(kids[c.id] || []).map(node).join('')}</div>`;
  return `<h2>Discussion</h2><form class="hub-form" data-do="comment" data-target="${esc(target)}"><label>Comment<textarea name="body" maxlength="2000" rows="2" required></textarea></label><button>Post</button></form>
    ${(kids[0] || []).map(node).join('') || empty('No comments yet.')}`;
}

// ---------- Guildas ----------
async function guilds() {
  const {guilds: all} = await api('/guilds');
  return `<h1>Guilds</h1>${tiles(all, g => `<a class="hub-tile" href="#/guild/${esc(g.id)}"><b>[${esc(g.tag)}] ${esc(g.name)}</b><small>${g.members} members · ${g.xp} XP</small></a>`, 'No guilds yet.')}
    <h2>Create guild</h2><form class="hub-form" data-do="create-guild"><label>Name<input name="name" maxlength="40" required></label><label>Tag<input name="tag" maxlength="5" required></label>
    <label>Description<textarea name="description" maxlength="2000" rows="2"></textarea></label><label>Discoverability<select name="visibility"><option value="public">Public</option><option value="private">Private</option></select></label><button>Create guild</button></form>`;
}

async function guildPage(id) {
  const g = await api(`/guilds/${q(id)}`);
  const staff = g.my_role === 'leader' || g.my_role === 'officer';
  return `<h1>[${esc(g.tag)}] ${esc(g.name)}</h1><p class="hub-muted">${g.xp} guild XP · ${esc(g.visibility)}</p><div class="hub-rule">${esc(g.description)}</div>
    <div class="hub-row">${g.my_role ? `<button data-do="leave-guild" data-id="${esc(id)}">Leave guild</button>` : `<button data-do="apply-guild" data-id="${esc(id)}">Apply</button>`}</div>
    <h2>Roster</h2><div class="hub-scroll"><table class="hub-table"><tbody>${g.members.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.role)}</td><td>${g.my_role === 'leader' && m.role !== 'leader' ? `<select data-change="guild-role" data-id="${esc(id)}" data-name="${esc(m.name)}" aria-label="Role">${['member', 'officer', 'leader'].map(r => `<option ${m.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>` : ''}</td></tr>`).join('')}</tbody></table></div>
    <h2>Teams</h2>${tiles(g.teams, t => `<div class="hub-tile"><b>${esc(t.name)}</b><small>Captain ${esc(t.captain)} · ${t.roster.map(esc).join(', ')}</small></div>`, 'No teams yet.')}
    ${g.my_role ? `<h2>Announcements</h2>${tiles(g.announcements, p => `<div class="hub-tile"><b>${esc(p.body)}</b><small>${esc(p.author)} · ${when(p.at)}</small></div>`, 'No announcements yet.')}` : ''}
    ${staff ? `<h2>Requests</h2>${tiles(g.requests, r => `<div class="hub-tile"><b>${esc(r.player)}</b><small>${esc(r.kind)} ${esc(r.message || '')}</small>${r.kind === 'apply' ? `<div class="hub-row"><button data-do="guild-request" data-id="${r.id}" data-verb="accept">Accept</button><button data-do="guild-request" data-id="${r.id}" data-verb="decline">Decline</button></div>` : ''}</div>`, 'No pending requests.')}
      <form class="hub-form" data-do="guild-invite" data-id="${esc(id)}"><label>Invite player<input name="username" required></label><button>Invite</button></form>
      <form class="hub-form" data-do="guild-post" data-id="${esc(id)}"><label>New announcement<textarea name="body" rows="2" required></textarea></label><button>Post</button></form>
      <form class="hub-form" data-do="guild-team" data-id="${esc(id)}"><label>Team name<input name="name" required></label><label>Captain (username)<input name="captain" required></label><button>Create team</button></form>` : ''}`;
}

// ---------- Torneios ----------
async function tournaments() {
  const {tournaments: all} = await api('/tournaments');
  return `<h1>Tournaments</h1><p class="hub-muted">Community events are not officially sanctioned and give no ranking points.</p>${tiles(all, t => eventTile(t), 'No events yet.')}
    <h2>Create tournament</h2><form class="hub-form" data-do="create-tournament"><label>Name<input name="name" maxlength="80" required></label>
    <label>Format<select name="format"><option value="swiss">Swiss</option><option value="round_robin">Round Robin</option><option value="single_elimination">Single Elimination</option></select></label>
    <label>Mode<select name="mode"><option value="digital">Digital</option><option value="physical">Physical</option></select></label>
    <label>Location (physical)<input name="location" maxlength="200"></label><label><span><input type="checkbox" name="deck_required" style="width:auto;min-height:0"> Deck registration required</span></label><button>Create tournament</button></form>`;
}

async function tournamentPage(id) {
  const t = await api(`/tournaments/${q(id)}`);
  const account = t.deck_required ? await call('/api/decks').catch(signedOut) : null;
  const round = Math.max(0, ...t.matches.map(m => m.round));
  const match = m => `<tr><td>${m.round}</td><td>${esc(m.a)}</td><td>${m.b ? esc(m.b) : 'Bye'}</td><td>${m.a_score ?? '–'} : ${m.b_score ?? '–'}</td><td>${esc(m.status)}</td>
    <td>${t.status === 'running' && m.b && m.status !== 'confirmed' ? `<form class="hub-row" data-do="${t.can_run ? 'resolve-match' : 'report-match'}" data-id="${m.id}"><input name="a_score" type="number" min="0" max="99" required aria-label="${esc(m.a)} score"><input name="b_score" type="number" min="0" max="99" required aria-label="${esc(m.b)} score"><button>${t.can_run ? 'Resolve' : 'Report'}</button></form>` : ''}</td></tr>`;
  return `<h1>${esc(t.name)}</h1><p class="hub-muted">${esc(t.format)} · ${esc(t.mode)} · ${esc(t.category)} · ${esc(t.status)}${t.sanctioned ? ' · sanctioned' : ' · not sanctioned'}${t.location ? ` · ${esc(t.location)}` : ''} · Organizer ${esc(t.organizer)}</p>
    <div class="hub-row">${t.status === 'open' ? `${account ? `<select id="reg-deck" aria-label="Deck">${account.decks.map(d => `<option value="${esc(d.id)}">${esc(d.data?.alpha_nome || d.data?.nome || d.data?.name || d.id)}</option>`).join('')}</select>` : ''}<button data-do="t-register" data-id="${esc(id)}">Register</button><button data-do="t-simple" data-verb="checkin" data-id="${esc(id)}">Check in</button>` : ''}
      <button data-do="t-simple" data-verb="drop" data-id="${esc(id)}">Drop</button>
      ${t.can_run && t.status === 'open' ? `<button data-do="t-simple" data-verb="start" data-id="${esc(id)}">Start event</button>` : ''}
      ${t.can_run && t.status === 'running' ? `<button data-do="t-simple" data-verb="next-round" data-id="${esc(id)}">Next round</button><button data-do="t-simple" data-verb="close" data-id="${esc(id)}">Close event</button>` : ''}</div>
    ${t.mode === 'digital' ? '<p class="hub-muted">Digital event: an online duel between paired players records the result by itself (best of one). The organizer can still correct it.</p>' : ''}
    <h2>Standings</h2><p class="hub-muted">Tiebreak policy ${esc(t.policy.id)}: ${esc(t.policy.status)}.</p>
    <div class="hub-scroll"><table class="hub-table"><thead><tr><th>#</th><th>Player</th><th>Pts</th><th>W-D-L</th><th>OMW</th><th>GW</th><th>OGW</th></tr></thead><tbody>${t.standings.map(r => `<tr><td>${r.rank}</td><td>${esc(r.name)}</td><td>${r.points}</td><td>${r.wins}-${r.draws}-${r.losses}</td><td>${r.omw}</td><td>${r.gw}</td><td>${r.ogw}</td></tr>`).join('') || '<tr><td colspan="7">No players yet.</td></tr>'}</tbody></table></div>
    <h2>Pairings${round ? ` · Round ${round} of ${t.total_rounds}` : ''}</h2>${t.matches.length ? `<div class="hub-scroll"><table class="hub-table"><thead><tr><th>Rd</th><th>A</th><th>B</th><th>Score</th><th>Status</th><th></th></tr></thead><tbody>${t.matches.map(match).join('')}</tbody></table></div>` : empty('The event has not started.')}
    <h2>Participants</h2>${tiles(t.participants, p => `<div class="hub-tile"><b>${esc(p.name)}</b><small>${esc(p.status)}${p.checked_in ? ' · checked in' : ''}${p.deck_hash ? ` · deck ${esc(p.deck_hash.slice(0, 8))}` : ''}</small></div>`, 'No players yet.')}`;
}

// ---------- Notificações ----------
async function inbox() {
  const {notifications: list} = await api('/notifications');
  api('/notifications/read', 'POST', {}).then(refreshMe).catch(() => {});
  return `<h1>Notifications</h1>${tiles(list, n => `<div class="hub-tile"><b>${esc(n.text)}</b><small>${when(n.at)}</small></div>`, 'No notifications.')}`;
}

// ---------- Console ----------
async function consolePage() {
  const [c, audit, build, releases, reg, drafts] = await Promise.all([api('/console'), api('/audit'), call('/playtest/build.json').catch(() => null), call('/data/releases/index.json').catch(() => ({releases: []})), loadRegistry(), api('/content?all=1')]);
  const row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v ?? 'unknown')}</td></tr>`;
  return `<h1>Console</h1><div class="hub-grid">
      <div class="hub-tile"><b>Official</b><small>${esc(c.official.status)} · promotion ${esc(c.official.promotion)}</small></div>
      <div class="hub-tile"><b>Playtest ${esc(build?.version || '')}</b><small>${esc(build?.commit?.slice(0, 8) || 'no build stamp')}${build?.dirty ? ' · dirty tree' : ''}</small></div>
      <div class="hub-tile"><b>Database ${esc(c.database)}</b><small>Schema ${c.schema} · ${c.open_reports} open reports</small></div></div>
    <h2>Versions</h2><div class="hub-scroll"><table class="hub-table"><tbody>${row('Rules', reg.index.current.rules)}${row('Catalog', reg.index.current.catalog)}${row('Engine', build?.engine)}${row('Commit', build?.commit)}</tbody></table></div>
    <h2>Releases</h2>${tiles(releases.releases.slice().reverse(), r => `<div class="hub-tile"><b>${esc(r.id)}</b><small>${esc(r.version)} · ${esc(r.channel)} · ready ${r.ready} · approval ${esc(r.approval)}</small></div>`, 'No release candidates yet.')}
    <h2>Content</h2>${tiles(drafts.items, d => `<a class="hub-tile" href="#/staff/edit/${esc(d.slug)}"><b>${esc(d.title)}</b><small>${esc(d.kind)} · ${esc(d.status)}</small></a>`, 'No content yet.')}
    <div class="hub-cta"><a class="kv-ghost" href="#/staff/content">Open the editor</a></div>
    <h2>Roles</h2><form class="hub-form" data-do="grant-role"><label>Player<input name="username" required></label><label>Role<select name="role"><option>publisher</option><option>moderator</option><option>judge</option></select></label><button>Grant</button></form>
    <h2>Audit log</h2><div class="hub-scroll"><table class="hub-table"><tbody>${audit.entries.slice(0, 50).map(e => `<tr><td>${when(e.at)}</td><td>${esc(e.actor_name)}</td><td>${esc(e.action)}</td><td>${esc(e.target)}</td></tr>`).join('') || '<tr><td>No entries.</td></tr>'}</tbody></table></div>`;
}

// ---------- Coleção (P4): só leitura; abrir booster e criar carta continuam no jogo ----------
const RARITIES = ['Common', 'Uncommon', 'Legendary', 'Divine'];
async function collectionPage() {
  const [c, reg] = await Promise.all([api('/collection'), loadRegistry(), loadArt()]);
  const all = new Set(Object.values(c.pool).flat());
  const qty = id => (c.full_access ? c.copy_limit : Math.min(c.collection[id] || 0, c.copy_limit));
  owning = {pool: all, qty, limit: c.copy_limit};
  const have = ids => ids.filter(id => qty(id) > 0).length;
  const nameOf = id => reg.cards.find(x => x.id === id)?.name || (id.startsWith('god-') ? id.slice(4).replace(/^./, m => m.toUpperCase()) : id);
  const f = readFilters(query());
  const cosmetic = item => { const [kind, id] = item.split(':'); return `<div class="hub-tile"><b>${esc(nameOf(id))}</b><small>${esc({avatar: 'Avatar', sleeve: 'Sleeve', coin: 'Coin'}[kind] || kind)}</small></div>`; };
  return `<h1>Collection</h1><p class="hub-lead">Your game collection, read only. Open boosters and craft cards in the game.</p>
    ${c.full_access ? '<p class="hub-empty">Full access: every card is unlocked in this account.</p>' : !Object.keys(c.collection).length ? '<p class="hub-empty">Open the game once to receive your starter collection and welcome boosters.</p>' : ''}
    <div class="hub-grid"><div class="hub-tile"><b>${have([...all])} / ${all.size}</b><small>Cards</small></div>
      ${RARITIES.filter(r => c.pool[r]).map(r => `<div class="hub-tile"><b>${have(c.pool[r])} / ${c.pool[r].length}</b><small>${esc(r)}${c.wildcards[r] ? ` · ${c.wildcards[r]} wildcards` : ''}</small></div>`).join('')}
      <div class="hub-tile"><b>${c.boosters}</b><small>Unopened boosters</small></div></div>
    <div class="hub-cta"><a class="kv-ghost" href="/playtest/">Open the game</a></div>
    <h2>Cards</h2>${cardFilterForm(reg, f, `<select name="own" aria-label="Owned"><option value="">All cards</option><option value="owned" ${f.own === 'owned' ? 'selected' : ''}>Owned</option><option value="missing" ${f.own === 'missing' ? 'selected' : ''}>Missing</option></select>`)}
    <div id="card-list" aria-live="polite"></div>
    <h2>Cosmetics</h2>${tiles(c.cosmetics, cosmetic, 'No cosmetics bought yet. God avatars are free.')}`;
}

// ---------- Staff: editor do Nexus e fila de moderação (permissão decidida no servidor) ----------
const KINDS = ['news', 'guide', 'lesson', 'ruling', 'balance'];
const targetLink = t => { const [kind, ...rest] = String(t).split(':'); const id = rest.join(':'); return `#/${kind === 'content' ? 'article' : kind}/${q(id)}`; };
async function staffPage(tab = 'content', slug) {
  const nav = `<h1>Staff</h1><nav class="hub-tabs">${[['content', 'Content'], ['reports', 'Reports']].map(([k, l]) => `<a href="#/staff/${k}" ${tab === k || (tab === 'edit' && k === 'content') ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  if (tab === 'reports') {
    const {reports} = await api('/reports');
    return nav + tiles(reports, r => `<div class="hub-tile"><b>${esc(r.body)}</b><small>${r.author ? esc(r.author) : 'removed'} · ${when(r.at)}${r.reason ? ` · ${esc(r.reason)}` : ''}</small>
      <div class="hub-row"><a class="kv-ghost" href="${targetLink(r.target)}">Open</a><button data-do="hide-comment" data-id="${r.comment_id}">Hide comment</button><button data-do="dismiss-report" data-id="${r.id}">Keep comment</button></div></div>`, 'No open reports.');
  }
  if (tab === 'edit') return nav + await editor(slug);
  const {items} = await api('/content?all=1');
  return `${nav}<div class="hub-cta"><a class="kv-ghost" href="#/staff/edit">New article</a></div>
    ${tiles(items, d => `<a class="hub-tile" href="#/staff/edit/${esc(d.slug)}"><b>${esc(d.title)}</b><small>${esc(d.kind)} · ${esc(d.status)} · revision ${d.revision}</small></a>`, 'No content yet.')}`;
}
async function editor(slug) {
  const a = slug ? await api(`/content/${q(slug)}`) : {kind: 'news', title: '', body: '', meta: {}, lang: 'en'};
  const opt = (v, cur) => `<option ${v === cur ? 'selected' : ''}>${v}</option>`;
  return `<div class="hub-editor"><form class="hub-form" id="ed-form" data-do="save-content" data-id="${a.id || ''}">
      <label>Kind<select name="kind" ${a.id ? 'disabled' : ''}>${KINDS.map(k => opt(k, a.kind)).join('')}</select></label>
      <label>Slug<input name="slug" value="${esc(a.slug || '')}" pattern="[a-z0-9][a-z0-9-]+" required ${a.id ? 'readonly' : ''}></label>
      <label>Title<input name="title" value="${esc(a.title)}" maxlength="120" required></label>
      <label>Category<input name="category" value="${esc(a.category || '')}" maxlength="40"></label>
      <label>Language<select name="lang">${['en', 'pt'].map(k => opt(k, a.lang)).join('')}</select></label>
      <label><span><input type="checkbox" name="featured" ${a.featured ? 'checked' : ''} style="width:auto;min-height:0"> Featured</span></label>
      <label>Body<textarea name="body" rows="14" required>${esc(a.body)}</textarea></label>
      <label>Meta (JSON: rule_refs, card_refs, balance fields)<textarea name="meta" rows="3">${esc(JSON.stringify(a.meta || {}))}</textarea></label>
      <div class="hub-row"><button>Save draft</button>${a.id ? (a.status === 'published' ? `<button type="button" data-do="unpublish" data-id="${a.id}">Unpublish</button><a class="kv-ghost" href="#/article/${esc(a.slug)}">Open</a>` : `<button type="button" data-do="publish" data-id="${a.id}">Publish</button>`) : ''}</div>
      ${a.revisions?.length ? `<p class="hub-muted">${esc(a.status)} · ${a.revisions.length} revisions · last ${when(a.revisions[0].at)}</p>` : ''}
    </form><section class="hub-preview" aria-label="Preview"><p class="kv-stamp">Preview</p><div id="ed-preview">${articleBody({...a, author: a.author || 'You'})}</div></section></div>`;
}
function previewArticle(form) {
  const d = formData(form);
  let meta = {};
  try { meta = JSON.parse(d.meta || '{}'); } catch { /* prévia ignora meta inválida; salvar avisa */ }
  form.ownerDocument.getElementById('ed-preview').innerHTML = articleBody({...d, kind: d.kind || form.querySelector('[name=kind]').value, meta, author: 'You'});
}

// ---------- Ações ----------
const ACTIONS = {
  'share-deck': async (_, data) => { const r = await api('/decks', 'POST', data); location.hash = `#/deck/${r.id}`; },
  'favorite-deck': el => api(`/decks/${q(el.dataset.id)}/favorite`, 'POST', {}),
  'fork-deck': async el => {
    const {data} = await api(`/decks/${q(el.dataset.id)}/fork`, 'POST', {});
    await addToAccount(data, `${data.alpha_nome || data.nome || data.name || 'Deck'} (copy)`);
  },
  'copy-list': async el => {
    const [d, reg] = await Promise.all([api(`/decks/${q(el.dataset.id)}`), loadRegistry()]);
    await navigator.clipboard.writeText(deckToText({...d.data, nome: d.name}, listTools(reg).nameOf));
    alertBox('Deck list copied. Paste it in the game: Play › Choose your deck › Import list.');
  },
  'copy-link': async el => {
    await navigator.clipboard.writeText(`${location.origin}/cosmohub/#/deck/${el.dataset.id}`);
    alertBox('Link copied.');
  },
  'import-list': async (_, data) => {
    const {deck, errors} = textToDeck(data.list, listTools(await loadRegistry()).index);
    if (!deck.main_deck.length) throw new Error(errors.length ? `No cards found. Line ${errors[0].line}: ${errors[0].text}` : 'No cards found in this list.');
    await addToAccount({god: deck.god || 'god-athena', domain_id: deck.domain_id, main_deck: deck.main_deck}, deck.nome || 'Imported deck');
    if (errors.length) alertBox(`Added without ${errors.length} line${errors.length === 1 ? '' : 's'} we did not recognize: ${errors.map(e => `${e.line} (${e.text})`).join(', ')}`, true);
  },
  comment: (el, data) => api('/comments', 'POST', {target: el.dataset.target, body: data.body}),
  reply: async el => { const body = prompt('Reply'); if (body) await api('/comments', 'POST', {target: el.dataset.target, parent_id: Number(el.dataset.id), body}); },
  vote: el => api(`/comments/${el.dataset.id}/vote`, 'POST', {value: Number(el.dataset.value)}),
  'report-comment': async el => { await api(`/comments/${el.dataset.id}/report`, 'POST', {reason: ''}); alertBox('Reported.'); },
  'create-guild': async (_, data) => { const r = await api('/guilds', 'POST', data); location.hash = `#/guild/${r.id}`; },
  'apply-guild': async el => { await api(`/guilds/${q(el.dataset.id)}/apply`, 'POST', {}); alertBox('Request sent.'); },
  'leave-guild': el => api(`/guilds/${q(el.dataset.id)}/leave`, 'POST', {}),
  'guild-request': el => api(`/guilds/requests/${el.dataset.id}/${el.dataset.verb}`, 'POST', {}),
  'guild-invite': (el, data) => api(`/guilds/${q(el.dataset.id)}/invites`, 'POST', data),
  'guild-post': (el, data) => api(`/guilds/${q(el.dataset.id)}/announcements`, 'POST', data),
  'guild-team': (el, data) => api(`/guilds/${q(el.dataset.id)}/teams`, 'POST', data),
  'create-tournament': async (_, data) => { const r = await api('/tournaments', 'POST', data); location.hash = `#/tournament/${r.id}`; },
  't-register': el => api(`/tournaments/${q(el.dataset.id)}/register`, 'POST', {deck_id: document.getElementById('reg-deck')?.value}),
  't-simple': el => api(`/tournaments/${q(el.dataset.id)}/${el.dataset.verb}`, 'POST', {}),
  'report-match': (el, data) => api(`/matches/${el.dataset.id}/report`, 'POST', {a_score: Number(data.a_score), b_score: Number(data.b_score)}),
  'resolve-match': (el, data) => api(`/matches/${el.dataset.id}/resolve`, 'POST', {a_score: Number(data.a_score), b_score: Number(data.b_score)}),
  publish: el => api(`/content/${el.dataset.id}/publish`, 'POST', {}),
  unpublish: el => api(`/content/${el.dataset.id}/unpublish`, 'POST', {}),
  'save-content': async (el, data) => {
    let meta;
    try { meta = JSON.parse(data.meta || '{}'); } catch { throw new Error('Meta must be valid JSON.'); }
    if (el.dataset.id) await api(`/content/${el.dataset.id}`, 'PATCH', {title: data.title, body: data.body, category: data.category || null, featured: data.featured, meta});
    else { await api('/content', 'POST', {...data, meta}); location.hash = `#/staff/edit/${data.slug}`; }
    alertBox('Draft saved.');
  },
  'hide-comment': async el => { await api(`/comments/${el.dataset.id}`, 'DELETE'); alertBox('Comment hidden.'); },
  'dismiss-report': el => api(`/reports/${el.dataset.id}/dismiss`, 'POST', {}),
  'grant-role': (_, data) => api('/roles', 'POST', data),
};
const CHANGES = {
  'rate-deck': el => el.value && api(`/decks/${q(el.dataset.id)}/rate`, 'POST', {stars: Number(el.value)}),
  'deck-visibility': el => api(`/decks/${q(el.dataset.id)}`, 'PATCH', {visibility: el.value}),
  'guild-role': el => api(`/guilds/${q(el.dataset.id)}/members/${q(el.dataset.name)}/role`, 'POST', {role: el.value}),
};

function alertBox(text, error = false) {
  document.getElementById('hub-alert')?.remove();
  const box = document.createElement('p');
  box.id = 'hub-alert';
  box.setAttribute('role', error ? 'alert' : 'status');
  box.className = error ? 'hub-error' : 'hub-empty';
  box.textContent = text;
  root.prepend(box);
}

async function run(fn, ...args) {
  try {
    await fn(...args);
    const note = document.getElementById('hub-alert')?.textContent;
    await render();
    if (note) alertBox(note);
  } catch (e) {
    alertBox(e.status === 401 ? 'Sign in to continue.' : e.message, true);
  }
}

document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-do]');
  if (!form) return;
  e.preventDefault();
  run(ACTIONS[form.dataset.do], form, formData(form));
});
document.addEventListener('click', e => {
  const el = e.target.closest('button[data-do]');
  if (el) run(ACTIONS[el.dataset.do], el);
});
document.addEventListener('change', e => {
  if (e.target.dataset?.nav) { location.hash = e.target.value; return; }
  const fn = CHANGES[e.target.dataset?.change];
  if (fn) run(fn, e.target);
});
document.addEventListener('click', e => {
  const chip = e.target.closest('.hub-chip[data-faction]');
  if (chip) { document.querySelector('#card-filters [name=faction]').value = chip.dataset.faction; filterCards(); }
  if (e.target.closest('#card-more')) { shownCards += PAGE; filterCards(false); }
  if (e.target.closest('[data-retry]')) render();
  if (e.target.closest('[data-clear]')) { document.querySelectorAll('#card-filters input, #card-filters select').forEach(el => { el.value = ''; }); filterCards(); }
});
document.addEventListener('submit', e => { if (e.target.id === 'card-filters') e.preventDefault(); });
document.addEventListener('input', e => {
  if (e.target.closest('#card-filters')) filterCards();
  if (e.target.id === 'rule-q') filterRules();
  if (e.target.closest('#ed-form')) previewArticle(e.target.closest('#ed-form'));
});

// ---------- Rotas ----------
const ROUTES = {'': home, codex, card: cardPage, player: playerPage, rule: rulePage, nexus, article, decks, deck: deckPage, guilds, guild: guildPage, tournaments, tournament: tournamentPage, notifications: inbox, console: consolePage, staff: staffPage, collection: collectionPage};

// Rota = #/secao/arg/arg2?filtros. query() devolve só os filtros.
const query = () => location.hash.split('?')[1] || '';
const skeleton = () => `<div class="hub-skeleton" aria-hidden="true"><i class="hub-sk-title"></i><i class="hub-sk-line"></i><div class="hub-cards">${'<i class="hub-sk-card"></i>'.repeat(8)}</div></div><p class="hub-sr">Loading…</p>`;
async function render() {
  const [, name = '', arg, arg2] = location.hash.split('?')[0].split('/');
  const section = {player: 'decks', card: 'codex', rule: 'codex', article: 'nexus', deck: 'decks', guild: 'guilds', tournament: 'tournaments'}[name] || name;
  document.querySelectorAll('.hub-nav a').forEach(a => (a.dataset.section === section ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  const view = ROUTES[name];
  owning = null;
  const slow = setTimeout(() => { root.innerHTML = skeleton(); }, 120); // só aparece se a seção demorar
  try {
    root.innerHTML = !view ? empty('Page not found.') : !apiUp && NEEDS_API.has(name) ? `<h1>${TITLES[name]}</h1>${soon()}` : await view(arg && decodeURIComponent(arg), arg2 && decodeURIComponent(arg2));
    root.querySelectorAll('img[data-fallback]').forEach(armFallback);
    filterCards();
    filterRules();
  } catch (e) {
    root.innerHTML = `<div class="hub-error" role="alert"><p>${esc(e.status === 401 ? 'Sign in to continue.' : e.status === 403 ? 'You do not have permission to see this.' : e.message || 'Something went wrong. Please try again.')}</p>
      ${e.status === 401 ? `<a class="kv-ghost" href="/login/?next=${q('/cosmohub/' + location.hash)}">Sign in</a>` : '<button type="button" class="kv-ghost" data-retry>Try again</button>'}</div>`;
  } finally {
    clearTimeout(slow);
  }
}

const staff = {mod: false};
let meReady = Promise.resolve();
async function refreshMe() {
  const me = await (meReady = api('/me').catch(() => null));
  staff.mod = !!(me?.developer || me?.roles?.includes('moderator'));
  document.getElementById('hub-staff').hidden = !(staff.mod || me?.roles?.includes('publisher'));
  document.getElementById('hub-unread').textContent = me?.unread || '';
  document.getElementById('hub-console').hidden = !me?.developer;
  document.getElementById('hub-inbox').hidden = !me;
  document.getElementById('hub-collection').hidden = !me;
  document.getElementById('hub-signin').hidden = !!me;
  const user = me && await call('/api/me').catch(() => null); // mesma conta do jogo: o perfil público usa o username
  const link = document.getElementById('hub-me');
  link.hidden = !user?.username;
  if (user?.username) link.href = `#/player/${encodeURIComponent(user.username)}`; // o Hub é público; o login libera comentar, avaliar e copiar decks
}

mountKV();
addEventListener('hashchange', () => { scrollTo(0, 0); render(); });
refreshMe(); // antes do render: a discussão espera saber se é moderador
render();
