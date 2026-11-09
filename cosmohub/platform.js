// Cosmo Hub (docs/platform-4.0.md). Cartas e regras vêm só do registro canônico; permissão é sempre decidida pelo servidor.
import {renderLiveCard} from '/shared/live-card.js';
import {mountKV} from '/shared/kv-sky.js';
import {decklistIndex, deckToText, textToDeck} from '/shared/decklist-text.js?v=20261108-1';
import {validateDeck, colorErrors, DECK_SIZE, COPY_LIMIT, SPLASH_LIMIT} from '/shared/deck-v3.js';
import {readFilters, filtersQuery, filterCatalog, filterCollection, describe, sortCards} from './codex-filter.js?v=20261109-cx1';

const API = '/api/platform';
// Sem a API da plataforma no servidor, Codex e home seguem funcionando; o resto diz que abre em breve em vez de dar erro.
const apiUp = await fetch(`${API}/health`).then(r => r.ok).catch(() => false);
const NEEDS_API = new Set(['article', 'decks', 'deck', 'player', 'guilds', 'guild', 'tournaments', 'tournament', 'notifications', 'console', 'staff', 'collection', 'build']);
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
const TITLES = {player: 'Players', decks: 'Decks', guilds: 'Guilds', tournaments: 'Tournaments', notifications: 'Notifications', console: 'Console', staff: 'Staff', collection: 'Collection', build: 'Deck builder', article: 'Nexus', deck: 'Decks', guild: 'Guilds', tournament: 'Tournaments'};
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
const isPT = () => globalThis.ssI18n?.lang === 'pt';
const cardName = c => (isPT() && c?.name_pt) || c?.name || '';
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
  return id;
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
// Splash: o Deus do deck primeiro, depois as outras facções de Deus que aparecem nas cartas (neutras não contam).
function deckGods(god, ids) {
  const out = [godName(god).toLowerCase()];
  if (registry) { const tools = listTools(registry); for (const id of ids) { const f = String(tools.card(id)?.faction || '').toLowerCase(); if (GODS.includes(f) && !out.includes(f)) out.push(f); } }
  return out;
}
const godsLabel = (god, ids) => deckGods(god, ids).map(g => `<span class="hub-godname">${godSymbol(g)}${esc(godName(g))}</span>`).join('<span class="hub-slash" aria-hidden="true"> / </span>');
const deckCount = d => (d.main || []).reduce((n, [, q]) => n + q, 0);
// Card de deck (Deck Nexus V2): arte da carta-chave, Deus, autor, arquétipo, desempenho online real e data.
const deckTile = d => {
  const key = keyCard(d), g = godName(d.god).toLowerCase(), fac = GODS.includes(g) ? g : 'athena', s = d.stats || {};
  const art = key ? artImg(key.id, '') : '';
  const stat = (v, l) => `<span class="nx-stat"><b>${v}</b><small>${l}</small></span>`;
  return `<a class="nx-card" href="#/deck/${esc(d.id)}" style="--fac:${FACTION_COLORS[fac]}"><span class="nx-card__art">${art || `<img class="nx-card__ph" src="/CARD-TEMPLATE/symbols/${fac}.xs.webp" alt="">`}<img class="nx-card__sym" src="/CARD-TEMPLATE/symbols/${fac}.xs.webp" alt="" width="30" height="30"></span>
    <span class="nx-card__body"><b class="nx-card__name">${esc(d.name)}</b><span class="nx-card__gods">${godsLabel(d.god, (d.main || []).map(([id]) => id))}</span>
      ${d.archetype ? `<span class="nx-tag">${esc(d.archetype)}</span>` : ''}
      <span class="nx-card__stats">${s.matches ? `${stat(pct(s.win_rate), 'Win rate')}${stat(s.matches, s.matches === 1 ? 'Online duel' : 'Online duels')}${s.sample_ok ? '' : '<small class="nx-card__note">Small sample</small>'}` : '<small class="nx-card__note">No online duels yet</small>'}</span>
      <span class="nx-card__foot"><span>${esc(d.author || '')}</span><span>${when(d.updated_at)}</span></span></span></a>`;
};
const deckTiles = (list, none) => list.length ? `<div class="nx-grid">${list.map(deckTile).join('')}</div>` : empty(none);
const eventTile = t => `<a class="hub-tile" href="#/tournament/${esc(t.id)}"><b>${esc(t.name)}</b><small>${esc(t.format)} · ${esc(t.category)} · ${esc(t.status)}</small></a>`;

// Arte provisória (-ref) nunca aparece no Hub público (o Caddy bloqueia para quem não entrou).
const artOf = id => { const f = artCards?.get(id)?.ilustracao; return f && !/-ref\./i.test(f) ? f : undefined; };
const thumb = id => {
  const file = artOf(id);
  return file ? `/card-forge/art-web/webp/${esc(file.replace(/\.[a-z]+$/i, '.webp'))}` : '';
};
const fallbackArt = id => `/card-forge/art-web/${esc(artOf(id) || '')}`;
const artImg = (id, alt = '', eager = false) => artOf(id) ? `<img src="${thumb(id)}" data-fallback="${fallbackArt(id)}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}">` : '';
const loadArt = async () => { artCards ??= await call('/card-forge/art-web/cards.json').then(d => new Map(d.cartas.map(x => [x.id, x]))).catch(() => new Map()); };

// ---------- Início: portal do jogo (artigos em destaque, meta, balanceamento, torneios, decks) ----------
const siteLang = () => (isPT() ? 'pt' : 'en');
const KIND_LABEL = {news: 'News', guide: 'Guide', lesson: 'Lesson', balance: 'Balance', ruling: 'Ruling'};
// Capa: a carta escolhida no artigo; sem ela, a arte de um Deus (sempre a mesma para o mesmo artigo).
const FALLBACK_COVERS = ['athena-001', 'poseidon-001', 'hades-001', 'ares-001', 'artemis-001'];
const coverOf = a => { const id = a.meta?.cover || a.meta?.card_refs?.[0]; if (id && artOf(id)) return thumb(id);
  const fb = FALLBACK_COVERS[[...String(a.slug || '')].reduce((n, ch) => n + ch.charCodeAt(0), 0) % FALLBACK_COVERS.length]; return artOf(fb) ? thumb(fb) : ''; };
const excerpt = (text, n = 170) => { const t = String(text || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n).replace(/\s\S*$/, '')}…` : t; };
const articleCard = (a, big = false) => `<a class="hub-article ${big ? 'is-big' : ''}" href="#/article/${esc(a.slug)}"><i>${coverOf(a) ? `<img src="${coverOf(a)}" alt="" loading="${big ? 'eager' : 'lazy'}">` : ''}</i>
  <span><em class="hub-tag hub-tag--${esc(a.kind)}">${esc(a.category || KIND_LABEL[a.kind] || a.kind)}</em><b>${esc(a.title)}</b>${big ? `<p>${esc(excerpt(a.body, 220))}</p>` : ''}<small>${esc(a.author || '')}${a.author ? ' · ' : ''}${when(a.publish_at)}</small></span></a>`;
const articleGrid = (list, none) => list.length ? `<div class="hub-articles">${list.map(a => articleCard(a)).join('')}</div>` : empty(none);
function metaBars(m, n = 5) {
  if (!m?.gods?.length) return empty('No online duels yet. The meta report starts with the first ranked duels.');
  return `<ol class="hub-metabars">${m.gods.slice(0, n).map(g => { const name = godName(g.god).toLowerCase(); return `<li><a href="#/decks?g=${esc(name)}">${godSymbol(g.god)}<b>${esc(godName(g.god))}</b><span class="hub-metabar" aria-hidden="true"><i style="width:${Math.round(g.share * 100)}%"></i></span><small>${pct(g.share)} of the meta${g.sample_ok ? ` · ${pct(g.win_rate)} win rate` : ''}</small></a></li>`; }).join('')}</ol>
    <p class="hub-muted">${m.matches} online duels. ${m.matches < m.min_sample ? `Win rates appear after ${m.min_sample} duels per God.` : ''}</p>`;
}
const balanceRow = a => { const dir = String(a.meta?.change || a.meta?.direction || '').toLowerCase(); const tag = dir === 'nerf' ? 'Nerf' : dir === 'buff' ? 'Buff' : 'Change';
  return `<a class="hub-balance" href="#/article/${esc(a.slug)}"><i>${coverOf(a) ? `<img src="${coverOf(a)}" alt="" loading="lazy">` : ''}</i><span><em class="hub-tag hub-tag--${tag.toLowerCase()}">${tag}</em><b>${esc(a.title)}</b><small>${when(a.publish_at)}</small></span></a>`; };
async function home() {
  const [reg, f, meta, top] = await Promise.all([loadRegistry(), apiUp ? api(`/home?lang=${siteLang()}`).catch(() => null) : null, apiUp ? api('/meta').catch(() => null) : null, apiUp ? api('/decks?sort=winrate&limit=4').catch(() => null) : null, loadArt()]);
  const live = reg.cards.filter(c => c.publication !== 'cut');
  const gods = live.filter(c => c.type === 'God');
  const articles = [...(f?.news || []), ...(f?.guides || [])].sort((a, b) => Number(b.featured) - Number(a.featured) || b.publish_at - a.publish_at);
  const [lead, ...rest] = articles;
  const search = `<form class="hub-search hub-search--home" id="home-search" role="search" aria-label="Search the Codex"><div class="hub-searchbar"><input name="q" type="search" placeholder="Search ${live.length} cards… e.g. f:athena c>=5" aria-label="Search cards" autocomplete="off"><button class="kv-button">Search</button></div></form>`;
  const hero = lead ? `<section class="hub-front">${articleCard(lead, true)}
      <aside class="hub-front__side"><div class="hub-panel"><p class="kv-stamp kv-stamp--gold">Meta report</p>${metaBars(meta, 3)}<a class="hub-more-link" href="#/nexus/meta">Full meta report<span aria-hidden="true"> →</span></a></div>
        <div class="hub-panel hub-panel--play"><p class="kv-stamp">The Holy War awaits</p><b>Build a deck and duel online.</b><div class="hub-cta"><a class="kv-button" href="/playtest/">Play now</a><a class="kv-ghost" href="#/decks">Decks</a></div></div></aside></section>`
    : `<section class="hub-hero"><div><p class="kv-stamp kv-stamp--gold">The official portal of the game</p><h1><span class="kv-lyric">Enter the</span><span class="kv-cosmo">Sanctuary</span></h1>
        <p class="hub-lead">Every card, every rule, every deck and every battle of the Holy War, in one place.</p><div class="hub-cta"><a class="kv-button" href="/playtest/">Play now</a><a class="kv-ghost" href="#/codex">Open the Codex</a></div></div>
        <div class="hub-fan">${gods.slice(0, 5).map(g => `<a href="#/card/${esc(g.id)}" aria-label="${esc(g.name)}">${artImg(g.id, g.name, true)}</a>`).join('')}</div></section>`;
  const head = (title, href, label) => `<div class="hub-sechead"><h2>${title}</h2>${href ? `<a class="hub-more-link" href="${href}">${label}<span aria-hidden="true"> →</span></a>` : ''}</div>`;
  return `${hero}${search}
    ${f ? `${head('Latest articles', '#/nexus', 'All articles')}${articleGrid(lead ? rest.slice(0, 6) : articles.slice(0, 6), 'Nothing published yet.')}` : ''}
    <div class="hub-split"><section>${head('Meta report', '#/nexus/meta', 'Meta Hub')}<div class="hub-panel">${metaBars(meta)}</div>
        ${top?.decks?.length ? `<h3 class="hub-subhead">Top decks online</h3>${deckTiles(top.decks, '')}` : ''}</section>
      <section>${head('Balance: nerfs and buffs', '#/nexus/balance', 'Balance Center')}${f?.balance?.length ? `<div class="hub-balances">${f.balance.map(balanceRow).join('')}</div>` : empty('No balance changes yet. Every nerf and buff will be listed here with the reason.')}
        ${head('Tournaments', '#/tournaments', 'All events')}${tiles(f?.tournaments || [], eventTile, 'No events open right now. Create one in Tournaments.')}</section></div>
    ${f?.decks?.length ? `${head('Community decks', '#/decks', 'Deck library')}${deckTiles(f.decks, '')}` : ''}
    ${head('The Gods', '#/codex', 'Codex')}<div class="hub-gods">${gods.map(g => `<a class="hub-god" href="#/codex/cards?f=${q(g.faction)}">${artImg(g.id, '')}<span>${esc(g.name)}</span></a>`).join('')}</div>
    <dl class="hub-numbers"><div><dd>${live.length}</dd><dt>Cards</dt></div><div><dd>${reg.rules.length}</dd><dt>Rules</dt></div><div><dd>${gods.length}</dd><dt>Gods</dt></div><div><dd>${reg.glossary.length}</dd><dt>Terms</dt></div></dl>`;
}

async function article(slug) {
  const a = await api(`/content/${q(slug)}`);
  return `${articleBody(a)}
    ${a.status === 'published' ? await discussion(`content:${a.slug}`) : ''}`;
}
const articleBody = a => `${coverOf(a) ? `<div class="hub-cover"><img src="${coverOf(a)}" alt=""></div>` : ''}<p class="kv-stamp kv-stamp--gold">${esc(a.category || KIND_LABEL[a.kind] || a.kind || '')}</p><h1>${esc(a.title)}</h1><p class="hub-muted">${esc(a.author || '')} · ${when(a.publish_at)}${a.revision ? ` · revision ${a.revision}` : ''}</p>
  <div class="hub-rule">${esc(a.body)}</div>${a.kind === 'balance' ? balanceDetails(a.meta || {}) : ''}`;
const balanceDetails = m => `<h2>Change</h2><div class="hub-scroll"><table class="hub-table"><tbody>${['affected', 'previous', 'new', 'release', 'effective', 'reason', 'tests'].map(k => `<tr><th>${k}</th><td>${esc(typeof m[k] === 'string' ? m[k] : JSON.stringify(m[k]))}</td></tr>`).join('')}</tbody></table></div>`;

// ---------- Codex ----------
const codexTabs = cur => `<nav class="hub-tabs">${[['cards', 'Card Database'], ['rules', 'Official Rules'], ['glossary', 'Glossary'], ['rulings', 'Rulings'], ['academy', 'Academy']].map(([k, l]) => `<a href="#/codex/${k}" ${cur === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;

async function codex(tab = 'cards', faction = '') {
  const reg = await loadRegistry();
  await loadArt();
  const head = `<h1>Codex</h1><p class="hub-lead">Every card and every rule of the game, always in sync with what the game plays.</p>${codexTabs(tab)}`;
  if (tab === 'rules') return `${head}<div class="hub-row"><input id="rule-q" type="search" placeholder="Search" aria-label="Search rules"></div><div id="rule-list"></div>`;
  if (tab === 'glossary') return `${head}<div class="hub-scroll"><table class="hub-table"><thead><tr><th>EN</th><th>PT-BR</th><th>Note</th></tr></thead><tbody>${reg.glossary.map(g => `<tr><td translate="no" lang="en">${esc(g.en)}</td><td translate="no" lang="pt-BR">${esc(g.pt)}</td><td>${esc(g.note)}</td></tr>`).join('')}</tbody></table></div>`;
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
  const sel = (name, label, list, chosen) => `<select name="${name}" aria-label="${label}">${list.map(([v, l]) => `<option value="${v}" ${v === (chosen || '') ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const adv = [f.type, f.rarity, f.cost, f.keyword].some(Boolean);
  // Como o Scryfall: uma caixa de busca com sintaxe, barra "como / ordenado por" e filtros avançados recolhidos.
  return `<form id="card-filters" class="hub-search" role="search" aria-label="Search cards">
    <div class="hub-searchbar"><input id="card-q" name="q" type="search" placeholder="Search cards… e.g. f:athena c>=5 k:guardian" aria-label="Search cards" value="${esc(f.q)}" autocomplete="off" spellcheck="false">
      <button type="button" class="kv-ghost" data-syntax aria-expanded="false" aria-controls="hub-syntax">Syntax</button><button type="button" class="kv-ghost" data-random>Random</button></div>
    <div class="hub-syntax" id="hub-syntax" hidden><p><b>f:</b>athena · <b>t:</b>devotee · <b>r:</b>legendary · <b>c</b>&gt;=5 · <b>atk</b>&gt;=3 · <b>hp</b>&lt;=2 · <b>k:</b>guardian · <b>o:</b>"cosmo base" · <b>n:</b>seiya · <b>is:</b>cosmoble</p>
      <p class="hub-muted">Combine terms with spaces. Put "-" in front to exclude (-r:common). Portuguese works too: faccao:, tipo:, custo:, atq:, vida:, texto:.</p></div>
    <div class="hub-chips" role="group" aria-label="Faction"><button type="button" class="hub-chip" data-faction="" aria-pressed="${!f.faction}">All</button>${factions.map(chip).join('')}</div>
    <div class="hub-row hub-viewbar"><span class="hub-muted">Cards as</span>${sel('view', 'View', [['', 'Images'], ['checklist', 'Checklist'], ['text', 'Text only']], f.view)}<span class="hub-muted">sorted by</span>${sel('sort', 'Sort', [['', 'Name'], ['cost', 'Cost'], ['atk', 'ATK'], ['hp', 'HP'], ['rarity', 'Rarity'], ['number', 'Number']], f.sort)}${sel('dir', 'Order', [['', 'Ascending'], ['desc', 'Descending']], f.dir)}${extra}
      <button type="button" class="kv-ghost hub-clear" data-clear>Clear</button></div>
    <details class="hub-adv" ${adv ? 'open' : ''}><summary>Advanced filters</summary><div class="hub-row hub-filters">
      <select id="card-type" name="type" aria-label="Type"><option value="">All types</option>${opts(distinct('type'), f.type)}</select>
      <select id="card-rarity" name="rarity" aria-label="Rarity"><option value="">All rarities</option>${opts(distinct('rarity'), f.rarity)}</select>
      <select id="card-cost" name="cost" aria-label="Cost"><option value="">Any cost</option>${opts(['0', '1', '2', '3', '4', '5', '6', '7+'], f.cost)}</select>
      <select id="card-keyword" name="keyword" aria-label="Keyword"><option value="">All keywords</option>${opts(keywords, f.keyword)}</select></div></details>
    <input type="hidden" name="faction" value="${esc(f.faction)}"></form>
    <div id="card-list" aria-live="polite"></div>`;
}

// Arte ainda sem versão leve cai no JPG original.
function armFallback(img) {
  img.addEventListener('error', () => { if (img.getAttribute('src') !== img.dataset.fallback) img.src = img.dataset.fallback; }, {once: true});
}

// Lista completa em páginas de 60: rolar até o fim (ou o botão) carrega mais. Filtros vão para a URL sem recarregar a tela.
const PAGE = 60;
let shownCards = PAGE, moreObserver = null, lastFound = [];
let owning = null; // {pool: Set, qty: id => n} só na página da Coleção
const cardThumb = c => `<a class="hub-thumb${owning && !owning.qty(c.id) ? ' is-missing' : ''}" href="#/card/${esc(c.id)}">${owning ? `<em class="hub-qty">${owning.qty(c.id)}/${owning.limit}</em>` : ''}<i>${artImg(c.id, cardName(c)) || '<span class="hub-noart" aria-hidden="true"></span>'}</i><b>${esc(cardName(c))}</b><small>${esc(c.faction)} · ${esc(c.type)}${c.cost != null ? ` · ${c.cost}` : ''}</small></a>`;
function cardFilters() {
  const form = document.getElementById('card-filters');
  return form ? Object.fromEntries(new FormData(form)) : null;
}
function filterCards(reset = true) {
  const list = document.getElementById('card-list'), f = cardFilters();
  if (!list || !f) return;
  if (reset) shownCards = PAGE;
  const found = sortCards(owning ? filterCollection(registry.cards, f, owning.pool, owning.qty) : filterCatalog(registry.cards, f), f.sort, f.dir, cardName);
  lastFound = found;
  const qs = filtersQuery(f), path = location.hash.split('?')[0].replace(/^#\/codex\/?$/, '#/codex/cards');
  history.replaceState(null, '', path + (qs ? `?${qs}` : ''));
  document.querySelectorAll('.hub-chip[data-faction]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.faction === f.faction)));
  const more = found.length > shownCards;
  const shown = found.slice(0, shownCards);
  const body = f.view === 'checklist' ? `<div class="hub-scroll"><table class="hub-table hub-checklist"><thead><tr><th>#</th><th>Name</th><th>Faction</th><th>Type</th><th>Cost</th><th>ATK</th><th>HP</th><th>Rarity</th></tr></thead><tbody>${shown.map(c => `<tr><td>${esc(c.number ?? '')}</td><td><a href="#/card/${esc(c.id)}">${esc(cardName(c))}</a></td><td>${esc(c.faction)}</td><td>${esc(c.type)}</td><td>${c.cost ?? '—'}</td><td>${c.attack ?? '—'}</td><td>${c.hp ?? '—'}</td><td>${esc(c.rarity || '—')}</td></tr>`).join('')}</tbody></table></div>`
    : f.view === 'text' ? `<div class="hub-textcards">${shown.map(c => `<article class="hub-textcard"><h3><a href="#/card/${esc(c.id)}">${esc(cardName(c))}</a><span>${c.cost ?? ''}</span></h3><p class="hub-muted">${esc(c.faction)} · ${esc(c.type)}${c.subtypes?.length ? ` — ${esc(c.subtypes.join(', '))}` : ''} · ${esc(c.rarity || '')}</p>${(isPT() && c.abilities_pt?.length ? c.abilities_pt : c.abilities || []).map(a => `<p>${esc(a)}</p>`).join('')}${c.attack != null ? `<p class="hub-stats">${c.attack} / ${c.hp ?? '—'}</p>` : ''}</article>`).join('')}</div>`
    : `<div class="hub-cards">${shown.map(cardThumb).join('')}</div>`;
  // Frase já no idioma do site (fica fora do dicionário: muda a cada busca).
  const pt = isPT(), what = f.q ? ` ${pt ? 'onde' : 'where'} ${describe(f.q, siteLang())}` : '';
  list.innerHTML = `<p class="hub-resultline" translate="no">${found.length ? `1 – ${shown.length}` : 0} ${pt ? 'de' : 'of'} ${found.length} ${pt ? 'cartas' : 'cards'}${esc(what)}</p>` + (found.length
    ? `${body}${more ? `<button type="button" class="kv-ghost hub-more" id="card-more">Show more (${found.length - shownCards})</button>` : ''}`
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
    picture = art ? renderLiveCard(art, {art: artOf(art.id) ? `/card-forge/art-web/${artOf(art.id)}` : null}) : '';
  } catch { picture = ''; }
  const {items} = apiUp ? await api('/content?kind=ruling') : {items: []};
  const rulings = items.filter(r => (r.meta.card_refs || []).includes(id));
  const rules = reg.rules.filter(r => r.cards.includes(id));
  const stat = (k, v) => v == null || v === '' ? '' : `<tr><th>${k}</th><td>${esc(v)}</td></tr>`;
  return `<h1>${esc(cardName(c))}</h1><div class="hub-card"><div>${picture || empty('No artwork yet.')}</div><div>
    <div class="hub-scroll"><table class="hub-table"><tbody>${stat('Number', c.number)}${stat('Edition', c.edition)}${stat('Faction', c.faction)}${stat('Type', c.type)}${stat('Subtype', c.subtypes.join(', '))}${stat('Rarity', c.rarity)}${stat('Cost', c.cost)}${stat('Equip cost', c.equip_cost)}${stat('ATK', c.attack)}${stat('HP', c.hp)}${stat('Soul', c.soul)}${stat('Publication', c.publication)}</tbody></table></div>
    <h2>Abilities</h2>${c.abilities.length ? (isPT() && c.abilities_pt?.length ? c.abilities_pt : c.abilities).map(a => `<p>${esc(a)}</p>`).join('') : empty('No abilities.')}
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
// Avatar como no jogo: Deus usa o rosto do HUD (Card Forge, hud_rosto); personagem usa a arte com o rosto no topo.
function avatarStyle(id) {
  const g = /^god-(\w+)$/.exec(id || ''), forge = artCards?.get(g ? `${g[1]}-001` : id);
  if (g && forge?.hud_rosto) { const h = forge.hud_rosto; return `background-image:url('/card-forge/art-web/${esc(h.imagem)}');background-size:${h.zoom}% auto;background-position:${h.x}% ${h.y}%`; }
  return forge ? `background-image:url('${thumb(forge.id)}');background-size:cover;background-position:50% 18%` : '';
}
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const rankName = r => (r.tier === 'Kamui' ? 'Kamui' : r.tier ? `${r.tier} ${ROMAN[r.division] || ''}`.trim() : 'Unranked');
const rankEmblem = r => (r.tier ? `<img class="pf-emblem" src="./assets/rank/${r.tier === 'Kamui' ? 'kamui' : `${esc(r.tier.toLowerCase())}-emblem`}.webp" alt="" width="96" height="96">` : '');
async function playerPage(username) {
  const [p, decksOf] = await Promise.all([call(`/api/players/${q(username)}`), api(`/decks?author=${q(username)}&limit=24`), loadArt(), loadRegistry()]);
  const fav = p.favorite_god ? String(p.favorite_god).replace(/^god-/, '').toLowerCase() : '';
  const r = p.rank || {}, st = p.stats || {};
  const done = p.achievements.filter(a => a.done).length, total = p.achievements.length;
  const banner = fav && artOf(`${fav}-001`) ? ` style="--pf-bg:url('${thumb(`${fav}-001`)}')"` : '';
  const pips = r.tier && r.tier !== 'Kamui' ? `<span class="pf-pips" aria-label="${r.pips || 0} of 6 pips">${Array.from({length: 6}, (_, i) => `<i class="${i < (r.pips || 0) ? 'on' : ''}"></i>`).join('')}</span>` : '';
  const stat = (label, value, extra = '') => `<div class="pf-stat"><b>${value}</b><small>${label}</small>${extra}</div>`;
  const result = {win: ['Win', 'is-win'], loss: ['Loss', 'is-loss'], draw: ['Draw', 'is-draw']};
  const side = g => g ? `${godSymbol(g)}${esc(godName(g))}` : '<span class="hub-muted">—</span>';
  const ach = [...p.achievements].sort((a, b) => Number(b.done) - Number(a.done));
  return `<section class="pf-hero"${banner}>
      <div class="pf-id"><span class="pf-avatar" role="img" aria-label="${esc(p.username)}" style="${avatarStyle(p.avatar_card || p.favorite_god || 'god-athena')}"></span>
        <div><h1 class="pf-name">${esc(p.username)}</h1><p class="pf-meta">Joined ${when(p.joined)}${fav ? `<span class="pf-dot" aria-hidden="true">·</span><span>Favorite God</span> <span class="hub-godname">${godSymbol(fav)}${esc(godName(fav))}</span>` : ''}</p></div></div>
      <div class="pf-rank">${rankEmblem(r)}<div><b>${esc(rankName(r))}</b><small>${r.tier === 'Kamui' ? `${r.points || 0} pts · ` : ''}Level ${esc(r.level ?? 1)}${r.title ? ` · ${esc(r.title)}` : ''}</small>${pips}</div></div>
    </section>
    <div class="pf-stats">${stat('Win rate', st.played ? `${st.winrate}%` : '—', st.played ? `<span class="pf-bar" aria-hidden="true"><i style="width:${st.winrate}%"></i></span>` : '')}${stat('Online duels', st.played || 0)}${stat('Wins', st.wins || 0)}${stat('Losses', st.losses || 0)}${stat('Achievements', `${done}/${total}`, `<span class="pf-bar" aria-hidden="true"><i style="width:${total ? 100 * done / total : 0}%"></i></span>`)}</div>
    <h2>Public decks <span class="hub-count">${decksOf.total ?? decksOf.decks.length}</span></h2>${deckTiles(decksOf.decks, 'No public decks yet.')}
    <section><h2>Recent online duels</h2>${p.recent.length ? `<ol class="pf-duels">${p.recent.map(d => { const [label, cls] = result[d.result] || ['—', '']; return `<li><span class="pf-result ${cls}">${label}</span><span class="pf-vs">${side(d.god)}<span class="hub-muted"> vs </span>${side(d.opponent_god)}</span><time class="hub-muted">${when(d.date)}</time></li>`; }).join('')}</ol>` : empty('No online duels yet.')}</section>
      <section><h2>Achievements <span class="hub-count">${done}/${total}</span></h2><ul class="pf-ach">${ach.map(a => `<li class="${a.done ? 'is-done' : 'is-locked'}"><span class="pf-ach__icon" aria-hidden="true">${a.done ? '★' : '☆'}</span><span><b>${esc(a.name)}</b><small>${esc(a.description)}</small></span><span class="hub-sr">${a.done ? 'Unlocked' : 'Locked'}</span></li>`).join('')}</ul></section>`;
}

async function rulePage(id) {
  const reg = await loadRegistry();
  const r = reg.rules.find(x => x.id === id);
  if (!r) return empty('Rule not found.');
  const cards = reg.cards.filter(c => r.cards.includes(c.id)).slice(0, 24);
  return `<h1>${esc(r.number)}. ${esc(r.title)}</h1><p class="hub-muted">${esc(r.chapter || '')} · ${esc(r.id)} · version ${esc(reg.index.current.rules)}${r.status === 'review' ? ' · under review' : ''}</p>
    <div class="hub-rule">${esc(r.body)}</div>${cards.length ? `<h2>Related cards</h2>${tiles(cards, c => `<a class="hub-tile" href="#/card/${esc(c.id)}"><b>${esc(cardName(c))}</b></a>`, '')}` : ''}
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
  const {items} = await api(`/content?kind=${tab === 'balance' ? 'balance' : 'news,guide,lesson'}&lang=${siteLang()}`);
  return nav + (tab === 'balance' ? (items.length ? `<div class="hub-balances">${items.map(balanceRow).join('')}</div>` : empty('No balance changes yet.')) : articleGrid(items, 'Nothing published yet.'));
}

// ---------- Decks ----------
const signedOut = e => e.status === 401 ? null : Promise.reject(e);

// Biblioteca: filtro por God, ordenação e página ficam na URL (#/decks?g=hades&s=winrate&p=2).
const GODS = ['athena', 'poseidon', 'hades', 'ares', 'artemis'];
// ---------- Deck Nexus (V2, autor 09/11/2026) ----------
// Busca, Deus, arquétipo e ordenação ficam na URL; mudar um filtro só redesenha a lista (o campo de busca não perde o foco).
// Ordenações de desempenho ficam desligadas enquanto não há duelo online suficiente (nada de número inventado).
const SORTS = [['recent', 'Most recent'], ['popular', 'Most favorited'], ['winrate', 'Best online win rate'], ['matches', 'Most played online'], ['rating', 'Best rated']];
const NX_KEYS = ['q', 'g', 'a', 's', 'v', 'p'];
let nx = null, nxSeq = 0, nxTimer;
function nxState() {
  const p = new URLSearchParams(query());
  return {q: (p.get('q') || '').slice(0, 80), g: GODS.includes(p.get('g')) ? p.get('g') : '', a: (p.get('a') || '').slice(0, 60),
    s: SORTS.some(([k]) => k === p.get('s')) ? p.get('s') : 'recent', v: p.get('v') === 'table' ? 'table' : '', p: Math.max(1, Number(p.get('p')) || 1)};
}
const nxHash = st => { const n = new URLSearchParams(); for (const k of NX_KEYS) if (st[k] && !(k === 's' && st[k] === 'recent') && !(k === 'p' && st[k] === 1)) n.set(k, st[k]); return `#/decks${String(n) ? `?${n}` : ''}`; };
// Nome de carta na busca: o Hub resolve para ids (EN e PT) e a API acha os decks que usam a carta.
function nxCards(text) {
  const t = text.trim().toLowerCase();
  if (t.length < 3 || !registry) return [];
  return registry.cards.filter(c => c.publication !== 'cut' && [c.name, c.name_pt].some(n => n && n.toLowerCase().includes(t))).slice(0, 40).map(gameId);
}
function nxFetch(st) {
  const cards = nxCards(st.q), p = new URLSearchParams({sort: st.s, page: st.p, limit: 24});
  if (st.g) p.set('god', `god-${st.g}`);
  if (st.a) p.set('archetype', st.a);
  if (st.q) p.set('q', st.q);
  if (cards.length) p.set('cards', cards.join(','));
  return api(`/decks?${p}`);
}
const nxTable = list => `<div class="hub-scroll"><table class="hub-table hub-decktable"><thead><tr><th>Deck</th><th>God</th><th>Author</th><th>Archetype</th><th>Win rate</th><th>Duels</th><th>Updated</th></tr></thead><tbody>${list.map(d => `<tr>
    <td><a href="#/deck/${esc(d.id)}">${esc(d.name)}</a></td><td>${godsLabel(d.god, (d.main || []).map(([id]) => id))}</td><td>${playerLink(d.author)}</td><td>${esc(d.archetype || '—')}</td><td>${d.stats?.matches ? pct(d.stats.win_rate) : '—'}</td><td>${d.stats?.matches || 0}</td><td>${when(d.updated_at)}</td></tr>`).join('')}</tbody></table></div>`;
function nxResults(lib, st) {
  const filtered = st.q || st.g || st.a;
  const head = `<p class="nx-found" role="status">${filtered ? `${lib.total} of ${lib.facets?.total ?? lib.total} decks` : `${lib.total} decks`}</p>`;
  if (!lib.decks.length) return `${head}<div class="nx-empty"><p>${filtered ? 'No public deck matches this search.' : 'Nothing published yet. Mark a deck Public in the game to share it.'}</p>${filtered ? '<button type="button" data-nx="reset">Clear filters</button>' : ''}</div>`;
  const pager = lib.pages > 1 ? `<nav class="nx-pager" aria-label="Pages"><button type="button" data-nx-page="${lib.page - 1}" ${lib.page > 1 ? '' : 'disabled'}>← Previous</button><span>Page ${lib.page} of ${lib.pages}</span><button type="button" data-nx-page="${lib.page + 1}" ${lib.page < lib.pages ? '' : 'disabled'}>Next →</button></nav>` : '';
  return `${head}${st.v === 'table' ? nxTable(lib.decks) : `<div class="nx-grid">${lib.decks.map(deckTile).join('')}</div>`}${pager}`;
}
function nxFilters(st, facets, meta) {
  const share = Object.fromEntries((meta?.gods || []).map(g => [godName(g.god).toLowerCase(), g]));
  const chip = (g, label) => `<button type="button" class="nx-god" data-nx-god="${g}" aria-pressed="${st.g === g}" style="--fac:${FACTION_COLORS[g] || 'var(--kv-gold)'}">${g ? `<img src="/CARD-TEMPLATE/symbols/${g}.xs.webp" alt="" width="22" height="22">` : ''}<span>${esc(label)}</span>${g && share[g] ? `<small>${pct(share[g].share)} meta</small>` : ''}</button>`;
  const arch = facets?.archetypes || [];
  const off = (k, ok) => (ok ? '' : ` disabled title="Needs more online duels"`);
  return `<div class="nx-gods" role="group" aria-label="God">${chip('', 'All Gods')}${GODS.map(g => chip(g, godName(g))).join('')}</div>
    <div class="nx-selects"><label>Archetype<select id="nx-a" ${arch.length ? '' : 'disabled'}><option value="">${arch.length ? 'All archetypes' : 'No archetypes yet'}</option>${arch.map(a => `<option ${a === st.a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
      <label>Sort by<select id="nx-s">${SORTS.map(([k, l]) => `<option value="${k}" ${k === st.s ? 'selected' : ''}${k === 'winrate' ? off(k, facets?.stats) : k === 'matches' ? off(k, facets?.played) : ''}>${l}</option>`).join('')}</select></label>
      <div class="nx-view" role="group" aria-label="View"><button type="button" data-nx-view="" aria-pressed="${st.v !== 'table'}">Tiles</button><button type="button" data-nx-view="table" aria-pressed="${st.v === 'table'}">Table</button></div></div>`;
}
async function decks() {
  await loadRegistry();
  const st = nxState();
  const [lib, mine, account, meta] = await Promise.all([nxFetch(st), api('/decks?mine=1').catch(signedOut), call('/api/decks').catch(signedOut), api('/meta').catch(() => null), loadArt()]);
  nx = {st, meta, facets: lib.facets};
  const signIn = next => `/login/?next=${q(`/cosmohub/${next}`)}`;
  const share = account ? `<h2>Share a deck</h2><form class="hub-form" data-do="share-deck">
      <label>Deck<select name="deck_id" required>${account.decks.map(d => `<option value="${esc(d.id)}">${esc(d.data?.alpha_nome || d.data?.nome || d.data?.name || d.id)}</option>`).join('')}</select></label>
      <label>Visibility<select name="visibility"><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></label>
      <label>Archetype<input name="archetype" maxlength="60"></label><label>Strategy<textarea name="strategy" maxlength="4000" rows="3"></textarea></label><button>Share</button></form>` : '';
  const importForm = account ? `<h2>Import a deck list</h2><form class="hub-form" data-do="import-list"><label>Deck list<textarea name="list" rows="8" required placeholder="Name: My deck&#10;God&#10;1 Athena (god-athena)&#10;Domain&#10;1 Jamir Tower (athena-v6-063)&#10;Deck&#10;3 Gemini Saga (athena-v6-013)"></textarea></label><button>Add to my decks</button></form>` : '';
  const yours = account ? `<section class="nx-mine" id="nx-mine" tabindex="-1"><h2>My decks</h2>
      <div class="hub-row"><a class="kv-ghost" href="#/build">New deck</a>${account.decks.length ? `<label class="hub-inline">Edit a deck <select data-nav="edit"><option value="" disabled selected>Choose…</option>${account.decks.map(d => `<option value="#/build/${esc(d.id)}">${esc(d.data?.alpha_nome || d.data?.nome || d.data?.name || d.id)}</option>`).join('')}</select></label>` : ''}</div>
      <h3 class="hub-subhead">Shared on the Hub</h3>${deckTiles(mine?.decks || [], 'You have not shared a deck yet. Mark a deck Public in the game.')}${importForm}${share}</section>`
    : `<p class="hub-muted"><a href="${signIn('#/decks')}">Sign in</a> to build, import and copy decks to your account.</p>`;
  return `<section class="nx-hero"><div class="nx-hero__text"><p class="kv-stamp kv-stamp--gold">Cosmo Hub</p><h1>Deck Nexus</h1><p class="hub-lead">Explore, build and share strategies.</p>
      <div class="nx-hero__cta"><a class="kv-button" href="${account ? '#/build' : signIn('#/build')}">Create deck</a>${account ? '<button type="button" class="kv-ghost" data-nx="mine">My decks</button>' : `<a class="kv-ghost" href="${signIn('#/decks')}">My decks</a>`}</div></div>
      ${lib.facets?.total != null ? `<p class="nx-hero__count"><b>${lib.facets.total}</b><span>public decks</span></p>` : ''}</section>
    <div class="nx-bar"><form class="nx-search" role="search" onsubmit="return false"><input id="nx-q" type="search" value="${esc(st.q)}" placeholder="Search decks, players, cards or Gods…" aria-label="Search decks" autocomplete="off" enterkeyhint="search">
      <button type="button" class="nx-clear" data-nx="clear" aria-label="Clear search" ${st.q ? '' : 'hidden'}>×</button></form>
      <button type="button" class="nx-toggle" data-nx="filters" aria-expanded="false" aria-controls="nx-filters">Filters</button></div>
    <div class="nx-filters" id="nx-filters">${nxFilters(st, lib.facets, meta)}</div>
    <div id="nx-results" aria-live="polite">${nxResults(lib, st)}</div>${yours}`;
}
async function nxUpdate(changes) {
  if (!nx) return;
  Object.assign(nx.st, changes);
  history.replaceState(null, '', nxHash(nx.st));
  const box = document.getElementById('nx-results'), seq = ++nxSeq;
  box.setAttribute('aria-busy', 'true');
  try {
    const lib = await nxFetch(nx.st);
    if (seq !== nxSeq) return; // resposta velha: o jogador já mudou o filtro
    box.innerHTML = nxResults(lib, nx.st);
    box.querySelectorAll('img[data-fallback]').forEach(armFallback);
    document.getElementById('nx-filters').innerHTML = nxFilters(nx.st, lib.facets, nx.meta);
    document.querySelector('.nx-clear').hidden = !nx.st.q;
  } catch (e) {
    if (seq === nxSeq) box.innerHTML = `<div class="hub-error" role="alert"><p>${esc(e.message || 'Something went wrong.')}</p><button type="button" data-nx="retry">Try again</button></div>`;
  } finally {
    if (seq === nxSeq) box.removeAttribute('aria-busy');
  }
}
document.addEventListener('input', e => {
  if (e.target.id !== 'nx-q') return;
  document.querySelector('.nx-clear').hidden = !e.target.value;
  clearTimeout(nxTimer);
  nxTimer = setTimeout(() => nxUpdate({q: e.target.value.trim().slice(0, 80), p: 1}), 250);
});
document.addEventListener('change', e => {
  if (e.target.id === 'nx-a') nxUpdate({a: e.target.value, p: 1});
  if (e.target.id === 'nx-s') nxUpdate({s: e.target.value, p: 1});
});
document.addEventListener('click', e => {
  if (!nx || !e.target.closest('.nx-hero, .nx-bar, .nx-filters, #nx-results')) return;
  const god = e.target.closest('[data-nx-god]'), view = e.target.closest('[data-nx-view]'), page = e.target.closest('[data-nx-page]'), act = e.target.closest('[data-nx]')?.dataset.nx;
  if (god) nxUpdate({g: nx.st.g === god.dataset.nxGod ? '' : god.dataset.nxGod, p: 1});
  if (view) nxUpdate({v: view.dataset.nxView});
  if (page) { nxUpdate({p: Number(page.dataset.nxPage)}); document.getElementById('nx-results').scrollIntoView({behavior: 'smooth', block: 'start'}); }
  if (act === 'clear') { const box = document.getElementById('nx-q'); box.value = ''; box.focus(); nxUpdate({q: '', p: 1}); }
  if (act === 'reset') { document.getElementById('nx-q').value = ''; nxUpdate({q: '', g: '', a: '', p: 1}); }
  if (act === 'retry') nxUpdate({});
  if (act === 'mine') { const m = document.getElementById('nx-mine'); m.scrollIntoView({behavior: 'smooth'}); m.focus({preventScroll: true}); }
  if (act === 'filters') { const open = document.getElementById('nx-filters').classList.toggle('is-open'); e.target.closest('[data-nx]').setAttribute('aria-expanded', String(open)); }
});

// Curva de Cosmo (custo 0–7+) e tipos, lidas do registro canônico.
function curveHtml(main, tools) {
  const curve = Array(8).fill(0);
  for (const e of main) {
    const c = tools.card(e.card_id), n = e.quantity || 1;
    if (!c) continue;
    curve[Math.min(7, Math.max(0, Number(c.cost) || 0))] += n;
  }
  const peak = Math.max(1, ...curve);
  return `<h2>Cosmo curve</h2><div class="hub-curve" role="img" aria-label="Cosmo curve: ${curve.map((n, i) => `${n} at cost ${i === 7 ? '7+' : i}`).join(', ')}">${curve.map((n, i) => `<span style="--h:${n / peak}"><i>${n || ''}</i><b>${i === 7 ? '7+' : i}</b></span>`).join('')}</div>`;
}

// Carta do campo, igual à mesa do duelo (playtest/divine/board.css): arte no enquadramento do Forge, nome em cima,
// ATK e HP nas gemas da facção (Athena usa gem_resistance). Fora Devoto, só arte e nome. Passar o mouse mostra a carta inteira.
const FACS = new Set(['athena', 'poseidon', 'hades', 'ares', 'artemis']);
function boardToken(c, cid) {
  const forge = c && artCards?.get(c.id), file = c && artOf(c.id), fr = forge?.ilustracao_enquadramento;
  const fac = FACS.has(String(c?.faction).toLowerCase()) ? String(c.faction).toLowerCase() : 'athena';
  const style = file ? `--art:url('${thumb(c.id)}');${fr?.w ? `--fx:${fr.x / 1488};--fy:${(fr.y - 160) / 1488};--fw:${fr.w / 1488};` : ''}`
    : FACS.has(String(c?.faction).toLowerCase()) ? `--art:url('/CARD-TEMPLATE/symbols/${fac}.xs.webp');` : `--art:url('/LOGO/logo-web.webp');--noart-w:70%;`;
  const gem = (kind, v) => `<b class="btok__stat btok__stat--${kind}" style="--gem:url('/CARD-TEMPLATE/${fac}/gem_${kind === 'atk' ? 'power' : fac === 'athena' ? 'resistance' : 'soul'}.sm.webp')">${esc(v)}</b>`;
  const stats = c?.type === 'Devotee' && c.attack != null ? gem('atk', c.attack) + gem('hp', c.hp ?? '') : '';
  return `<span class="hub-board"><span class="btok ${!file ? 'is-noart' : fr?.w ? 'is-framed' : ''}" style="${style}"><span class="btok__name">${esc(cardName(c) || cid)}</span>${stats}</span></span>`;
}
// Nome que não cabe na carta do campo: primeiro diminui a fonte (até 75%); se ainda cortar, passa devagar em loop.
// Com "reduzir movimento" no sistema fica a reticência.
const NAME_MIN = .75, MARQUEE_SPEED = 28; // px por segundo
function fitNames(root = document) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const el of root.querySelectorAll('.btok__name')) {
    const text = el.dataset.name ?? (el.dataset.name = el.textContent);
    el.classList.remove('is-marquee');
    el.style.removeProperty('--fit');
    el.textContent = text;
    const box = el.clientWidth;
    if (!box || el.scrollWidth <= box) continue;
    el.style.setProperty('--fit', Math.max(NAME_MIN, box / el.scrollWidth).toFixed(3));
    if (el.scrollWidth <= box || still) continue;
    el.classList.add('is-marquee');
    el.innerHTML = `<span class="btok__run" aria-hidden="true"><span>${esc(text)}</span><span>${esc(text)}</span></span><span class="hub-sr">${esc(text)}</span>`;
    const run = el.firstElementChild;
    run.style.animationDuration = `${(run.scrollWidth / 2 / MARQUEE_SPEED).toFixed(1)}s`;
  }
}
let fitTimer = 0, qTimer = 0;
addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => fitNames(), 150); });
const TYPE_ORDER = [['Devotee', 'Devotees'], ['Spell', 'Spells'], ['Equipment', 'Equipment']];
function deckSections(d, tools, visual) {
  const entry = (cid, n) => ({c: tools.card(cid), cid, n});
  const sort = (a, b) => (Number(a.c?.cost) || 0) - (Number(b.c?.cost) || 0) || cardName(a.c).localeCompare(cardName(b.c));
  const main = (d.data.main_deck || []).map(e => entry(e.card_id, e.quantity || 1));
  const groups = [['God and Domain', [entry(d.data.god || 'god-athena', 1), ...(d.data.domain_id ? [entry(d.data.domain_id, 1)] : [])]],
    ...TYPE_ORDER.map(([t, label]) => [label, main.filter(x => x.c?.type === t).sort(sort)]),
    ['Other', main.filter(x => !TYPE_ORDER.some(([t]) => x.c?.type === t)).sort(sort)]].filter(([, list]) => list.length);
  const total = list => list.reduce((n, x) => n + x.n, 0);
  const href = x => `#/card/${esc(x.c?.id || x.cid)}`;
  // Visual: a carta inteira como no campo do jogo (carta viva), pequena; sem carta viva cai na arte com o nome.
  const mini = x => `<a class="hub-mini" href="${href(x)}" aria-label="${x.n} × ${esc(cardName(x.c) || x.cid)}"><em class="hub-qty">${x.n}×</em>${boardToken(x.c, x.cid)}</a>`;
  if (visual) return groups.map(([label, list]) => `<h3>${esc(label)} <span>(${total(list)})</span></h3><div class="hub-minis">${list.map(mini).join('')}</div>`).join('');
  return groups.map(([label, list]) => `<table class="hub-table hub-list"><thead><tr><th colspan="2">${esc(label)} <span>(${total(list)})</span></th><th>Cost</th><th>Rarity</th></tr></thead><tbody>${list.map(x => `<tr><td class="hub-n">${x.n}</td><td><a href="${href(x)}">${esc(cardName(x.c) || x.cid)}</a></td><td>${x.c?.cost ?? '—'}</td><td>${esc(x.c?.rarity || '—')}</td></tr>`).join('')}</tbody></table>`).join('');
}
// Análise do deck igual à do construtor do jogo (playtest/lobby.js, deckStats): mesmos números e cores.
const FACTION_COLORS = {athena: '#b0872a', poseidon: '#2f86d6', ares: '#d9533e', hades: '#8f5fe0', artemis: '#35a56b', neutral: '#99a2b1'};
const KIND_COLORS = {Devotee: '#b0872a', Equipment: '#1f98ba', Technique: '#d0587a', Moment: '#7a80e8'};
function donut(title, rows, total) { // legenda com número e %, para a cor nunca ser o único sinal
  let at = 0;
  const gap = rows.length > 1 ? 1 : 0, pc = n => Math.round(n / total * 100);
  return `<section class="hub-statcard"><h3>${title}</h3><div class="hub-donut"><div class="hub-donut__ring" role="img" aria-label="${esc(title)}: ${rows.map(r => `${esc(r.label)} ${r.n}`).join(', ')}">
      <svg viewBox="0 0 42 42" aria-hidden="true"><g transform="rotate(-90 21 21)">${rows.map(r => { const p = r.n / total * 100, w = Math.max(p - gap, .5), c = `<circle cx="21" cy="21" r="15.915" fill="none" stroke="${r.color}" stroke-width="6.5" stroke-dasharray="${w} ${100 - w}" stroke-dashoffset="${-at}"><title>${esc(r.label)}: ${r.n} (${pc(r.n)}%)</title></circle>`; at += p; return c; }).join('')}</g></svg>
      <span><b>${total}</b></span></div>
    <ul class="hub-legend">${rows.map(r => `<li><i style="background:${r.color}"></i>${r.icon || ''}<span>${esc(r.label)}</span><b>${r.n}</b><small>${pc(r.n)}%</small></li>`).join('')}</ul></div></section>`;
}
function deckAnalysis(main, tools) {
  const list = main.map(e => ({card: tools.card(e.card_id), n: e.quantity || 1})).filter(e => e.card);
  const size = list.reduce((s, e) => s + e.n, 0);
  if (!size) return '';
  const sum = (arr, f) => arr.reduce((s, e) => s + f(e.card) * e.n, 0), tally = (arr, key) => arr.reduce((m, e) => m.set(key(e.card), (m.get(key(e.card)) || 0) + e.n), new Map());
  const devs = list.filter(e => e.card.type === 'Devotee'), nDevs = sum(devs, () => 1), costed = list.filter(e => e.card.cost != null);
  const avg = sum(costed, c => c.cost) / Math.max(1, sum(costed, () => 1)), cosmo = sum(list, c => (c.cosmoble ? 1 : 0)), early = sum(costed, c => (c.cost <= 2 ? 1 : 0));
  const kinds = tally(list, c => (c.type === 'Spell' ? c.subtypes?.[0] || 'Technique' : c.type)), facs = tally(list, c => String(c.faction || 'neutral').toLowerCase());
  const tile = (value, label, note = '') => `<div class="hub-stat"><b>${value}</b><span>${label}</span>${note ? `<small>${note}</small>` : ''}</div>`;
  return `<div class="hub-stats">${tile(avg.toFixed(1), 'Average cost')}${tile(`${Math.round(cosmo / size * 100)}%`, 'Cosmoble', `${cosmo} / ${size}`)}
      ${tile(nDevs, 'Devotees', nDevs ? `${(sum(devs, c => c.attack || 0) / nDevs).toFixed(1)} ATK · ${(sum(devs, c => c.hp || 0) / nDevs).toFixed(1)} HP` : '')}${tile(early, 'Early plays', 'Cost 2 or less')}</div>
    ${donut('Card type', Object.keys(KIND_COLORS).filter(k => kinds.get(k)).map(k => ({label: k, n: kinds.get(k), color: KIND_COLORS[k]})), size)}
    ${donut('Faction', Object.keys(FACTION_COLORS).filter(f => facs.get(f)).map(f => ({label: f === 'neutral' ? 'Neutral' : f[0].toUpperCase() + f.slice(1), n: facs.get(f), color: FACTION_COLORS[f], icon: f === 'neutral' ? '' : `<img src="/CARD-TEMPLATE/symbols/${f}.xs.webp" alt="">`})), size)}`;
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
  const key = keyCard({...d, main: main.map(e => [e.card_id, e.quantity || 1])}), g = godName(d.god).toLowerCase(), fac = GODS.includes(g) ? g : 'athena';
  const count = main.reduce((n, e) => n + (e.quantity || 1), 0);
  const stat = (v, l, note = '') => `<div class="nx-stat nx-stat--big"><b>${v}</b><small>${l}</small>${note ? `<small class="nx-card__note">${note}</small>` : ''}</div>`;
  // Só número de duelo online real; sem duelo, o lugar diz isso em vez de 0%.
  const stats = s.matches ? `${stat(pct(s.win_rate), 'Win rate', s.sample_ok ? '' : 'Small sample')}${stat(s.matches, s.matches === 1 ? 'Online duel' : 'Online duels')}${stat(now_.matches ? pct(now_.win_rate) : '—', `This version (v${d.version})`, now_.matches ? `${now_.matches} duels` : 'No duels yet')}`
    : '<p class="nx-card__note">No online duels yet. Win rate appears after the first online duels with this deck.</p>';
  const copy = d.mine ? `<button type="button" class="nx-primary" data-do="fork-deck" data-id="${esc(id)}">Copy to my decks</button>` : `<a class="kv-button" href="/login/?next=${q(`/cosmohub/#/deck/${id}`)}">Sign in to copy</a>`;
  const owner = d.mine?.owner;
  return `<section class="nx-dhero" style="--fac:${FACTION_COLORS[fac]}">${key && artOf(key.id) ? `<img class="nx-dhero__art" src="${thumb(key.id)}" alt="">` : ''}
      <div class="nx-dhero__text"><a class="nx-back" href="#/decks">← Deck Nexus</a><p class="nx-dhero__gods">${godsLabel(d.god, main.map(e => e.card_id))}</p><h1>${esc(d.name)}</h1>
        <p class="nx-dhero__by">${d.author ? `<span>Created by</span> ${playerLink(d.author)} · ` : ''}v${d.version} · ${when(d.versions[0]?.at)}${d.archetype ? ` <span class="nx-tag">${esc(d.archetype)}</span>` : ''}${owner && d.visibility !== 'public' ? ` <span class="nx-tag">${d.visibility === 'private' ? 'Private' : 'Unlisted'}</span>` : ''}</p>
        <div class="nx-dhero__stats">${stats}${d.rating ? stat(`★ ${d.rating}`, `${d.ratings} ratings`) : ''}${d.favorites ? stat(d.favorites, 'Favorites') : ''}</div>
        <div class="nx-dhero__cta">${copy}<button type="button" data-do="copy-link" data-id="${esc(id)}">Copy link</button><button type="button" data-do="copy-list" data-id="${esc(id)}">Copy list</button>
          ${owner && d.data.id ? `<a class="kv-ghost" href="#/build/${esc(d.data.id)}">Edit deck</a>` : ''}
          ${d.mine ? `<button type="button" data-do="favorite-deck" data-id="${esc(id)}" aria-pressed="${!!d.mine.favorite}">${d.mine.favorite ? 'Remove favorite' : 'Favorite'}</button>` : ''}
          ${d.mine && !owner ? `<label class="hub-inline">Rate <select data-change="rate-deck" data-id="${esc(id)}"><option value="">—</option>${[1, 2, 3, 4, 5].map(st => `<option ${d.mine.stars === st ? 'selected' : ''}>${st}</option>`).join('')}</select></label>` : ''}
          ${owner ? `<label class="hub-inline">Visibility <select data-change="deck-visibility" data-id="${esc(id)}">${[['private', 'Private'], ['unlisted', 'Unlisted'], ['public', 'Public']].map(([v, l]) => `<option value="${v}" ${d.visibility === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}</div></div></section>
    ${d.strategy ? `<section class="nx-strategy"><h2>Strategy</h2><div class="hub-rule">${esc(d.strategy)}</div></section>` : ''}
    <div class="hub-deckpage"><section aria-label="Deck list"><div class="hub-row"><nav class="hub-seg" aria-label="View"><a href="#/deck/${esc(id)}" ${visual ? 'aria-current="true"' : ''}>Visual</a><a href="#/deck/${esc(id)}?v=text" ${visual ? '' : 'aria-current="true"'}>Text</a></nav><span class="hub-muted">${count} cards</span><span class="hub-muted">Grouped by type, sorted by cost</span></div>
      ${deckSections(d, tools, visual)}</section>
    <aside class="hub-side"><h2>Analysis</h2>${deckAnalysis(main, tools)}${curveHtml(main, tools)}${breakdown(main, tools)}
    <h2>Version history</h2><p class="hub-muted">${d.versions.map(v => `v${v.version} (${when(v.at)})`).join(' · ')}</p></aside></div>
    ${d.visibility === 'private' ? '' : await discussion(`deck:${id}`)}`;
}

// ---------- Editor de decks (autor, 09/11/2026) ----------
// Mesmas regras do construtor do jogo (shared/deck-v3.js): 50 cartas, 3 cópias, cores do Deus + Domínio + neutras, splash até 15.
// Salva nos decks da conta (PUT /api/decks, com revisão); incompleto pode salvar, acima de 50 não, como no jogo.
let bld = null;
const facOf = c => String(c?.faction || 'neutral').toLowerCase();
const bldQty = id => bld.data.main_deck.find(e => e.card_id === id)?.quantity || 0;
async function builderPage(deckId) {
  const [reg, account] = await Promise.all([loadRegistry(), call('/api/decks'), loadArt()]);
  const tools = listTools(reg), saved = deckId && account.decks.find(d => d.id === deckId);
  if (deckId && !saved) throw new Error('This deck is not in your account.');
  const data = saved ? structuredClone(saved.data) : {god: 'god-athena', domain_id: '', main_deck: []};
  data.main_deck = (data.main_deck || []).filter(e => tools.card(e.card_id));
  bld = {id: saved?.id || null, revision: saved?.revision || 0, data, tools, reg, dirty: false};
  const domains = reg.cards.filter(c => c.type === 'Domain' && c.publication !== 'cut');
  const god = facOf(tools.card(data.god));
  const opts = `<option value="">Choose a Domain</option>${GODS.map(g => `<optgroup label="${esc(godName(g))}">${domains.filter(c => facOf(c) === g).map(c => `<option value="${esc(c.id)}" ${c.id === data.domain_id ? 'selected' : ''}>${esc(cardName(c))}</option>`).join('')}</optgroup>`).join('')}`;
  return `<h1>${saved ? 'Edit deck' : 'New deck'}</h1>
    <div class="hub-bld">
      <section class="hub-bld__pool" aria-label="Cards">
        <div class="hub-searchbar"><input id="bld-q" type="search" placeholder="Search cards… e.g. c<=2 t:devotee" aria-label="Search cards" autocomplete="off">
          <label class="hub-inline"><input type="checkbox" id="bld-all"> All factions</label></div>
        <p class="hub-muted" id="bld-found"></p><div id="bld-pool" class="hub-bld__grid"></div>
      </section>
      <aside class="hub-bld__deck" aria-label="Your deck">
        <label>Name<input id="bld-name" maxlength="60" value="${esc(data.alpha_nome || data.nome || 'New deck')}"></label>
        <div class="hub-bld__pick"><label>God<select id="bld-god">${GODS.map(g => `<option value="god-${g}" ${g === god ? 'selected' : ''}>${esc(godName(g))}</option>`).join('')}</select></label>
          <label>Domain<select id="bld-domain">${opts}</select></label></div>
        <div id="bld-deck"></div>
        <div class="hub-bld__actions"><button type="button" class="kv-ghost hub-bld__jump" data-bld="jump">Deck <span id="bld-n">0</span> / ${DECK_SIZE}</button><a class="kv-ghost" href="#/decks">Cancel</a><button type="button" class="kv-ghost" data-bld="copy">Copy list</button><button type="button" class="hub-bld__save" data-bld="save">Save</button></div>
      </aside>
    </div>`;
}
function paintPool() {
  const box = document.getElementById('bld-pool');
  if (!box || !bld) return;
  const all = document.getElementById('bld-all').checked, god = facOf(bld.tools.card(bld.data.god)), dom = facOf(bld.tools.card(bld.data.domain_id));
  const found = sortCards(filterCatalog(bld.reg.cards, {q: document.getElementById('bld-q').value}).filter(c => !['God', 'Domain'].includes(c.type)
    && (all || [god, dom, 'neutral'].includes(facOf(c)))), 'cost', '', cardName);
  document.getElementById('bld-found').textContent = `${found.length} cards`;
  box.innerHTML = found.slice(0, 240).map(c => { const n = bldQty(c.id); return `<div class="hub-bld__card${n ? ' is-in' : ''}">
    <button type="button" data-add="${esc(c.id)}" aria-label="Add ${esc(cardName(c))}"><i>${artImg(c.id, '') || '<span class="hub-noart" aria-hidden="true"></span>'}</i><b>${esc(cardName(c))}</b><small>${c.cost ?? '—'} · ${esc(c.type === 'Spell' ? c.subtypes?.[0] || c.type : c.type)}</small></button>
    ${n ? `<em>${n}</em><button type="button" class="hub-bld__minus" data-sub="${esc(c.id)}" aria-label="Remove one ${esc(cardName(c))}">−</button>` : ''}</div>`; }).join('') || empty('No cards match this search.');
  box.querySelectorAll('img[data-fallback]').forEach(armFallback);
}
function bldErrors() {
  const {tools, data} = bld, index = new Map(bld.reg.cards.map(c => [gameId(c), c])), factionOf = id => tools.card(id) && facOf(tools.card(id));
  const name = id => cardName(tools.card(id)) || id;
  return [...validateDeck(data, index), ...colorErrors(data, factionOf)].filter(e => e.code !== 'size').map(e => ({
    size: `${e.total} / ${DECK_SIZE} cards.`, domain: 'Choose a Domain.', copies: `${name(e.card_id)}: at most ${COPY_LIMIT} copies.`,
    identity: `${name(e.card_id)} is outside the colors of your God and Domain.`, splash: `${e.count} splash cards (at most ${SPLASH_LIMIT}).`,
  }[e.code] || `${name(e.card_id)}: ${e.code}`));
}
function paintDeck() {
  const box = document.getElementById('bld-deck');
  if (!box || !bld) return;
  const {tools, data} = bld, size = data.main_deck.reduce((n, e) => n + e.quantity, 0), errors = bldErrors();
  const order = ['Devotee', 'Equipment', 'Technique', 'Moment'], kind = c => (c.type === 'Spell' ? c.subtypes?.[0] || 'Technique' : c.type);
  const rows = data.main_deck.map(e => ({...e, c: tools.card(e.card_id)})).sort((a, b) => (Number(a.c.cost) || 0) - (Number(b.c.cost) || 0) || cardName(a.c).localeCompare(cardName(b.c)));
  const groups = order.map(k => [k, rows.filter(r => kind(r.c) === k)]).filter(([, r]) => r.length);
  document.getElementById('bld-n').textContent = size;
  box.innerHTML = `<p class="hub-bld__count"><b class="${size === DECK_SIZE ? 'is-ok' : size > DECK_SIZE ? 'is-over' : ''}">${size}</b> / ${DECK_SIZE}</p>
    ${errors.length ? `<ul class="hub-bld__errors" role="status">${errors.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : (size === DECK_SIZE ? '<p class="hub-bld__ok" role="status">Ready to play.</p>' : '')}
    ${groups.map(([k, list]) => `<h3><span>${esc(k)}</span> (${list.reduce((n, r) => n + r.quantity, 0)})</h3><ul class="hub-bld__list">${list.map(r => `<li>
      <button type="button" data-sub="${esc(r.card_id)}" aria-label="Remove one">−</button><b>${r.quantity}</b><a href="#/card/${esc(r.c.id)}" target="_blank" rel="noopener">${esc(cardName(r.c))}</a><small>${r.c.cost ?? ''}</small>
      <button type="button" data-add="${esc(r.card_id)}" aria-label="Add one" ${r.quantity >= COPY_LIMIT ? 'disabled' : ''}>+</button></li>`).join('')}</ul>`).join('') || empty('Click a card to add it.')}
    ${size ? `<h2>Analysis</h2>${deckAnalysis(data.main_deck, tools)}${curveHtml(data.main_deck, tools)}` : ''}`;
}
function bldChange(id, delta) {
  const list = bld.data.main_deck, entry = list.find(e => e.card_id === id), n = (entry?.quantity || 0) + delta;
  if (n > COPY_LIMIT) return alertBox(`At most ${COPY_LIMIT} copies of a card.`, true);
  if (!entry && n > 0) list.push({card_id: id, quantity: n});
  else if (entry && n <= 0) list.splice(list.indexOf(entry), 1);
  else if (entry) entry.quantity = n;
  bld.dirty = true;
  paintDeck(); paintPool();
}
async function bldSave() {
  const size = bld.data.main_deck.reduce((n, e) => n + e.quantity, 0);
  if (size > DECK_SIZE) return alertBox(`Decks can have at most ${DECK_SIZE} cards. Remove ${size - DECK_SIZE} to save.`, true);
  const id = bld.id || `my-${Date.now().toString(36)}`, name = document.getElementById('bld-name').value.trim() || 'New deck';
  const data = {...bld.data, id, nome: name, alpha_nome: undefined};
  try {
    const r = await call(`/api/decks/${encodeURIComponent(id)}`, 'PUT', {data, revision: bld.revision});
    Object.assign(bld, {id, revision: r.revision, dirty: false});
    alertBox(`"${name}" saved. It is in your decks in the game.`);
    if (location.hash !== `#/build/${id}`) history.replaceState(null, '', `#/build/${id}`);
  } catch (e) {
    alertBox(e.status === 409 ? 'This deck changed on another device. Reload the page to see that version.' : e.status === 401 ? 'Sign in to save.' : e.message, true);
  }
}
document.addEventListener('click', e => {
  if (!bld || !e.target.closest('.hub-bld')) return;
  const add = e.target.closest('[data-add]'), sub = e.target.closest('[data-sub]'), act = e.target.closest('[data-bld]')?.dataset.bld;
  if (add) bldChange(add.dataset.add, 1);
  if (sub) bldChange(sub.dataset.sub, -1);
  if (act === 'save') bldSave();
  if (act === 'jump') document.getElementById('bld-deck').scrollIntoView({behavior: 'smooth'});
  if (act === 'copy') navigator.clipboard.writeText(deckToText({...bld.data, nome: document.getElementById('bld-name').value}, bld.tools.nameOf)).then(() => alertBox('Deck list copied.'));
});
document.addEventListener('change', e => {
  if (!bld || !e.target.closest('.hub-bld')) return;
  if (e.target.id === 'bld-god') { bld.data.god = e.target.value; bld.dirty = true; }
  if (e.target.id === 'bld-domain') { bld.data.domain_id = e.target.value; bld.dirty = true; }
  if (['bld-god', 'bld-domain', 'bld-all'].includes(e.target.id)) { paintDeck(); paintPool(); }
});
let bldTimer;
document.addEventListener('input', e => {
  if (e.target.id === 'bld-q') { clearTimeout(bldTimer); bldTimer = setTimeout(paintPool, 150); }
  if (e.target.id === 'bld-name' && bld) bld.dirty = true;
});
addEventListener('beforeunload', e => { if (bld?.dirty && document.querySelector('.hub-bld')) e.preventDefault(); });

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
    location.hash = `#/build/${await addToAccount(data, `${data.alpha_nome || data.nome || data.name || 'Deck'} (copy)`)}`; // a cópia abre no editor
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
  const syn = e.target.closest('[data-syntax]');
  if (syn) { const box = document.getElementById('hub-syntax'); box.hidden = !box.hidden; syn.setAttribute('aria-expanded', String(!box.hidden)); }
  if (e.target.closest('[data-random]') && lastFound.length) location.hash = `#/card/${lastFound[Math.floor(Math.random() * lastFound.length)].id}`;
  if (e.target.closest('[data-clear]')) { document.querySelectorAll('#card-filters input, #card-filters select').forEach(el => { el.value = ''; }); filterCards(); }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'card-filters') e.preventDefault();
  if (e.target.id === 'home-search') { e.preventDefault(); const v = new FormData(e.target).get('q'); location.hash = `#/codex/cards${v ? `?q=${q(v)}` : ''}`; }
});
document.addEventListener('input', e => {
  if (e.target.closest('#card-filters') && e.target.name !== 'q') filterCards();
  if (e.target.id === 'card-q') { clearTimeout(qTimer); qTimer = setTimeout(filterCards, 180); } // digitar a sintaxe não redesenha a cada tecla
  if (e.target.id === 'rule-q') filterRules();
  if (e.target.closest('#ed-form')) previewArticle(e.target.closest('#ed-form'));
});

// ---------- Prévia da carta no hover (como no MTGGoldfish): nome da carta em texto mostra a carta inteira ----------
const peekCache = new Map();
function peekHtml(id) {
  if (!peekCache.has(id)) {
    const art = artCards?.get(id);
    let html = '';
    try { html = art ? renderLiveCard(art, {art: artOf(art.id) ? `/card-forge/art-web/${artOf(art.id)}` : null}) : ''; } catch { html = ''; }
    peekCache.set(id, html);
  }
  return peekCache.get(id);
}
const peek = document.createElement('div');
peek.id = 'hub-peek';
peek.setAttribute('aria-hidden', 'true');
peek.hidden = true;
document.body.append(peek);
let peekLink = null;
function placePeek(x, y) {
  const w = peek.offsetWidth, h = peek.offsetHeight, gap = 18;
  const left = x + gap + w > innerWidth ? Math.max(8, x - gap - w) : x + gap;
  peek.style.left = `${left}px`;
  peek.style.top = `${Math.min(Math.max(8, y - h / 2), innerHeight - h - 8)}px`;
}
const hoverable = matchMedia('(hover: hover)');
document.addEventListener('mouseover', e => {
  const link = hoverable.matches && e.target.closest('a[href^="#/card/"]:not(.hub-thumb)');
  if (link === peekLink) return;
  peekLink = link;
  if (link && !artCards) loadArt(); // página sem arte carregada: a prévia aparece no próximo hover
  const html = link && artCards ? peekHtml(decodeURIComponent(link.getAttribute('href').slice(7).split('?')[0])) : '';
  peek.hidden = !html;
  if (!html) return;
  peek.innerHTML = html;
  placePeek(e.clientX, e.clientY);
});
document.addEventListener('mousemove', e => { if (!peek.hidden) placePeek(e.clientX, e.clientY); });
addEventListener('ss-lang', () => { peekCache.clear(); render(); });
addEventListener('hashchange', () => { peek.hidden = true; peekLink = null; document.getElementById('hub-user').open = false; });
// Menu da conta fecha ao clicar fora ou com Esc.
document.addEventListener('click', e => { const m = document.getElementById('hub-user'); if (m.open && !m.contains(e.target)) m.open = false; });
document.addEventListener('keydown', e => { const m = document.getElementById('hub-user'); if (e.key === 'Escape' && m.open) { m.open = false; m.querySelector('summary').focus(); } });

// ---------- Rotas ----------
const ROUTES = {'': home, codex, card: cardPage, player: playerPage, rule: rulePage, nexus, article, decks, deck: deckPage, guilds, guild: guildPage, tournaments, tournament: tournamentPage, notifications: inbox, console: consolePage, staff: staffPage, collection: collectionPage, build: builderPage};

// Rota = #/secao/arg/arg2?filtros. query() devolve só os filtros.
const query = () => location.hash.split('?')[1] || '';
const skeleton = () => `<div class="hub-skeleton" aria-hidden="true"><i class="hub-sk-title"></i><i class="hub-sk-line"></i><div class="hub-cards">${'<i class="hub-sk-card"></i>'.repeat(8)}</div></div><p class="hub-sr">Loading…</p>`;
async function render() {
  const [, name = '', arg, arg2] = location.hash.split('?')[0].split('/');
  const section = {player: 'decks', card: 'codex', rule: 'codex', article: 'nexus', deck: 'decks', build: 'decks', guild: 'guilds', tournament: 'tournaments'}[name] || name;
  document.querySelectorAll('.hub-nav a, .hub-user__menu a[data-section]').forEach(a => (a.dataset.section === section ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  const view = ROUTES[name];
  owning = null;
  const slow = setTimeout(() => { root.innerHTML = skeleton(); }, 120); // só aparece se a seção demorar
  try {
    root.innerHTML = !view ? empty('Page not found.') : !apiUp && NEEDS_API.has(name) ? `<h1>${TITLES[name]}</h1>${soon()}` : await view(arg && decodeURIComponent(arg), arg2 && decodeURIComponent(arg2));
    root.querySelectorAll('img[data-fallback]').forEach(armFallback);
    document.fonts?.ready.then(() => fitNames(root)); // mede com a fonte final
    filterCards();
    filterRules();
    if (name === 'build') { paintDeck(); paintPool(); } else bld = null;
    if (name !== 'decks') nx = null;
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
  document.getElementById('hub-user').hidden = !me;
  document.getElementById('hub-collection').hidden = !me;
  document.getElementById('hub-signin').hidden = !!me;
  const user = me && await call('/api/me').catch(() => null); // mesma conta do jogo: o perfil público usa o username
  const link = document.getElementById('hub-me');
  link.hidden = !user?.username;
  if (user) { await loadArt(); document.getElementById('hub-user-av').style.cssText = avatarStyle(user.avatar_card || 'god-athena'); }
  if (user?.username) link.href = `#/player/${encodeURIComponent(user.username)}`; // o Hub é público; o login libera comentar, avaliar e copiar decks
}

mountKV();
addEventListener('hashchange', () => { scrollTo(0, 0); render(); });
refreshMe(); // antes do render: a discussão espera saber se é moderador
render();
