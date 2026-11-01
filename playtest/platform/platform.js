// Cosmo Hub (docs/platform-4.0.md). Cartas e regras vêm só do registro canônico; permissão é sempre decidida pelo servidor.
import {renderLiveCard} from '/shared/live-card.js';

const API = '/api/platform';
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
const empty = text => `<p class="hub-empty">${esc(text)}</p>`;
const tiles = (items, html, none) => items.length ? `<div class="hub-grid">${items.map(html).join('')}</div>` : empty(none);
const formData = form => {
  const out = {};
  for (const [k, v] of new FormData(form)) out[k] = v;
  form.querySelectorAll('input[type=checkbox]').forEach(c => { out[c.name] = c.checked; });
  return out;
};

// ---------- Registro canônico ----------
let registry = null;
async function loadRegistry() {
  if (registry) return registry;
  const index = await call('/data/registry/index.json');
  const [cards, rules, glossary] = await Promise.all([`cards-${index.current.catalog}`, `rules-${index.current.rules}`, 'glossary'].map(f => call(`/data/registry/${f}.json`)));
  registry = {index, cards, rules, glossary};
  return registry;
}

// ---------- Início ----------
const newsTile = n => `<a class="hub-tile" href="#/article/${esc(n.slug)}"><b>${esc(n.title)}</b><small>${esc(n.category || n.kind)} · ${when(n.publish_at)}</small></a>`;
const deckTile = d => `<a class="hub-tile" href="#/deck/${esc(d.id)}"><b>${esc(d.name)}</b><small>${esc(d.god || '')}${d.archetype ? ` · ${esc(d.archetype)}` : ''} · ${esc(d.author || '')}${d.rating ? ` · ★ ${d.rating}` : ''}</small></a>`;
const eventTile = t => `<a class="hub-tile" href="#/tournament/${esc(t.id)}"><b>${esc(t.name)}</b><small>${esc(t.format)} · ${esc(t.category)} · ${esc(t.status)}</small></a>`;

async function home() {
  const f = await api('/home');
  return `<h1>Cosmo Hub</h1>
    <h2>Latest News</h2>${tiles(f.news, newsTile, 'Nothing published yet.')}
    <h2>Featured Decks</h2>${tiles(f.decks, deckTile, 'Nothing published yet.')}
    <h2>Balance Updates</h2>${tiles(f.balance, newsTile, 'Nothing published yet.')}
    <h2>Tournament Highlights</h2>${tiles(f.tournaments, eventTile, 'Nothing published yet.')}`;
}

async function article(slug) {
  const a = await api(`/content/${q(slug)}`);
  return `<h1>${esc(a.title)}</h1><p class="hub-muted">${esc(a.author || '')} · ${when(a.publish_at)} · revision ${a.revision}</p>
    <div class="hub-rule">${esc(a.body)}</div>${a.kind === 'balance' ? balanceDetails(a.meta) : ''}
    ${a.status === 'published' ? await discussion(`content:${a.slug}`) : ''}`;
}
const balanceDetails = m => `<h2>Change</h2><div class="hub-scroll"><table class="hub-table"><tbody>${['affected', 'previous', 'new', 'release', 'effective', 'reason', 'tests'].map(k => `<tr><th>${k}</th><td>${esc(typeof m[k] === 'string' ? m[k] : JSON.stringify(m[k]))}</td></tr>`).join('')}</tbody></table></div>`;

// ---------- Codex ----------
const codexTabs = cur => `<nav class="hub-tabs">${[['cards', 'Card Database'], ['rules', 'Official Rules'], ['glossary', 'Glossary'], ['rulings', 'Rulings'], ['academy', 'Academy']].map(([k, l]) => `<a href="#/codex/${k}" ${cur === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;

async function codex(tab = 'cards') {
  const reg = await loadRegistry();
  const head = `<h1>Codex</h1><p class="hub-muted">Rules ${esc(reg.index.current.rules)} · Catalog ${esc(reg.index.current.catalog)} · ${esc(reg.index.current.set_name || '')}</p>${codexTabs(tab)}`;
  if (tab === 'rules') return `${head}<div class="hub-row"><input id="rule-q" type="search" placeholder="Search" aria-label="Search rules"></div><div id="rule-list"></div>`;
  if (tab === 'glossary') return `${head}<div class="hub-scroll"><table class="hub-table"><thead><tr><th>EN</th><th>PT-BR</th><th>Note</th></tr></thead><tbody>${reg.glossary.map(g => `<tr><td>${esc(g.en)}</td><td>${esc(g.pt)}</td><td>${esc(g.note)}</td></tr>`).join('')}</tbody></table></div>`;
  if (tab === 'rulings' || tab === 'academy') {
    const kind = tab === 'rulings' ? 'ruling' : 'lesson';
    const {items} = await api(`/content?kind=${kind}`);
    return `${head}${tiles(items, newsTile, 'Nothing published yet.')}`;
  }
  const opts = (key) => [...new Set(reg.cards.map(c => c[key]).filter(Boolean))].sort().map(v => `<option>${esc(v)}</option>`).join('');
  return `${head}<div class="hub-row"><input id="card-q" type="search" placeholder="Search" aria-label="Search cards">
    <select id="card-faction" aria-label="Faction"><option value="">All factions</option>${opts('faction')}</select>
    <select id="card-type" aria-label="Type"><option value="">All types</option>${opts('type')}</select>
    <select id="card-rarity" aria-label="Rarity"><option value="">All rarities</option>${opts('rarity')}</select>
    <input id="card-cost" type="number" min="0" placeholder="Cost" aria-label="Cost"></div><div id="card-list"></div>`;
}

function filterCards() {
  const list = document.getElementById('card-list');
  if (!list) return;
  const val = id => document.getElementById(id).value;
  const term = val('card-q').toLowerCase();
  const found = registry.cards.filter(c => c.publication !== 'cut'
    && (!term || [c.name, c.name_pt, ...c.abilities, ...c.keywords].join(' ').toLowerCase().includes(term))
    && (!val('card-faction') || c.faction === val('card-faction')) && (!val('card-type') || c.type === val('card-type'))
    && (!val('card-rarity') || c.rarity === val('card-rarity')) && (val('card-cost') === '' || c.cost === Number(val('card-cost'))));
  list.innerHTML = `<p class="hub-muted">${found.length} cards</p>` + tiles(found.slice(0, 120), c => `<a class="hub-tile" href="#/card/${esc(c.id)}"><b>${esc(c.name)}</b><small>${esc(c.faction)} · ${esc(c.type)} · ${esc(c.rarity || '')}${c.cost != null ? ` · ${c.cost}` : ''}</small></a>`, 'No cards match.');
}

function filterRules() {
  const list = document.getElementById('rule-list');
  if (!list) return;
  const term = document.getElementById('rule-q').value.toLowerCase();
  const found = registry.rules.filter(r => !term || (r.title + ' ' + r.body).toLowerCase().includes(term));
  list.innerHTML = tiles(found, r => `<a class="hub-tile" href="#/rule/${esc(r.id)}"><b>${esc(r.number)}. ${esc(r.title)}</b><small>${esc(r.chapter || '')}${r.status === 'review' ? ' · under review' : ''}</small></a>`, 'No rules match.');
}

let artCards = null;
async function cardPage(id) {
  const reg = await loadRegistry();
  const c = reg.cards.find(x => x.id === id);
  if (!c) return empty('Card not found.');
  artCards ??= await call('/card-forge/art-web/cards.json').then(d => new Map(d.cartas.map(x => [x.id, x]))).catch(() => new Map());
  const art = artCards.get(id);
  let picture = '';
  try {
    picture = art ? renderLiveCard(art, {art: art.ilustracao ? `/card-forge/art-web/${art.ilustracao}` : null}) : '';
  } catch { picture = ''; }
  const {items} = await api('/content?kind=ruling');
  const rulings = items.filter(r => (r.meta.card_refs || []).includes(id));
  const rules = reg.rules.filter(r => r.cards.includes(id));
  const stat = (k, v) => v == null || v === '' ? '' : `<tr><th>${k}</th><td>${esc(v)}</td></tr>`;
  return `<h1>${esc(c.name)}</h1><div class="hub-card"><div>${picture || empty('No artwork yet.')}</div><div>
    <div class="hub-scroll"><table class="hub-table"><tbody>${stat('Number', c.number)}${stat('Edition', c.edition)}${stat('Faction', c.faction)}${stat('Type', c.type)}${stat('Subtype', c.subtypes.join(', '))}${stat('Rarity', c.rarity)}${stat('Cost', c.cost)}${stat('Equip cost', c.equip_cost)}${stat('ATK', c.attack)}${stat('HP', c.hp)}${stat('Soul', c.soul)}${stat('Publication', c.publication)}</tbody></table></div>
    <h2>Abilities</h2>${c.abilities.length ? c.abilities.map(a => `<p>${esc(a)}</p>`).join('') : empty('No abilities.')}
    ${c.awaken_text ? `<h2>Awaken</h2><p>${esc(c.awaken_text)}</p>` : ''}${c.ultimate ? `<h2>Ultimate</h2><p>${esc(c.ultimate)}</p>` : ''}
    ${rules.length ? `<h2>Rules</h2>${rules.map(r => `<p><a href="#/rule/${esc(r.id)}">${esc(r.number)}. ${esc(r.title)}</a></p>`).join('')}` : ''}
    <h2>Rulings</h2>${tiles(rulings, newsTile, 'Nothing published yet.')}</div></div>`;
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

async function decks() {
  const [{decks: open}, mine, account] = await Promise.all([api('/decks'), api('/decks?mine=1').catch(signedOut), call('/api/decks').catch(signedOut)]);
  const share = account ? `<h2>Share a deck</h2><form class="hub-form" data-do="share-deck">
      <label>Deck<select name="deck_id" required>${account.decks.map(d => `<option value="${esc(d.id)}">${esc(d.data?.name || d.id)}</option>`).join('')}</select></label>
      <label>Visibility<select name="visibility"><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></label>
      <label>Archetype<input name="archetype" maxlength="60"></label><label>Strategy<textarea name="strategy" maxlength="4000" rows="3"></textarea></label><button>Share</button></form>` : '';
  return `<h1>Decks</h1><h2>Public decks</h2>${tiles(open, deckTile, 'Nothing published yet.')}
    ${mine ? `<h2>My decks</h2>${tiles(mine.decks, d => deckTile(d), 'You have not shared a deck yet.')}` : ''}${share}`;
}

async function deckPage(id) {
  const d = await api(`/decks/${q(id)}`);
  const cards = d.data.main_deck || [];
  const counts = cards.reduce((m, c) => { const k = typeof c === 'string' ? c : c.id; m[k] = (m[k] || 0) + (c.qty || 1); return m; }, {});
  const reg = await loadRegistry();
  const name = cid => reg.cards.find(c => c.id === cid)?.name || cid;
  return `<h1>${esc(d.name)}</h1><p class="hub-muted">${esc(d.author || '')} · ${esc(d.god || '')} · v${d.version} · ${esc(d.visibility)}${d.rating ? ` · ★ ${d.rating} (${d.ratings})` : ''} · ${d.favorites} favorites</p>
    ${d.strategy ? `<div class="hub-rule">${esc(d.strategy)}</div>` : ''}
    <div class="hub-row">${d.mine && !d.mine.owner ? `<label>Rate <select data-change="rate-deck" data-id="${esc(id)}"><option value="">—</option>${[1, 2, 3, 4, 5].map(s => `<option ${d.mine.stars === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>` : ''}
      ${d.mine ? `<button data-do="favorite-deck" data-id="${esc(id)}">${d.mine.favorite ? 'Remove favorite' : 'Favorite'}</button><button data-do="fork-deck" data-id="${esc(id)}">Copy to my decks</button>` : ''}
      ${d.mine?.owner ? `<select data-change="deck-visibility" data-id="${esc(id)}" aria-label="Visibility">${['private', 'unlisted', 'public'].map(v => `<option ${d.visibility === v ? 'selected' : ''}>${v}</option>`).join('')}</select>` : ''}</div>
    <h2>Cards</h2>${tiles(Object.entries(counts), ([cid, n]) => `<a class="hub-tile" href="#/card/${esc(cid)}"><b>${n} × ${esc(name(cid))}</b></a>`, 'This deck has no cards.')}
    <h2>Version history</h2><p class="hub-muted">${d.versions.map(v => `v${v.version} (${when(v.at)})`).join(' · ')}</p>
    ${d.visibility === 'private' ? '' : await discussion(`deck:${id}`)}`;
}

// ---------- Discussões ----------
async function discussion(target) {
  const {comments} = await api(`/comments?target=${q(target)}&sort=top`);
  const kids = {};
  for (const c of comments) (kids[c.parent_id ?? 0] ||= []).push(c);
  const node = c => `<div class="hub-comment"><small class="hub-muted">${esc(c.author || 'removed')} · ${when(c.at)} · ${c.score}</small><p>${c.removed ? '<em>Removed</em>' : esc(c.body)}</p>
    ${c.removed ? '' : `<div class="hub-row"><button data-do="vote" data-id="${c.id}" data-value="1" aria-label="Upvote">▲</button><button data-do="vote" data-id="${c.id}" data-value="-1" aria-label="Downvote">▼</button><button data-do="reply" data-id="${c.id}" data-target="${esc(target)}">Reply</button><button data-do="report-comment" data-id="${c.id}">Report</button></div>`}
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
    <div class="hub-row">${t.status === 'open' ? `${account ? `<select id="reg-deck" aria-label="Deck">${account.decks.map(d => `<option value="${esc(d.id)}">${esc(d.data?.name || d.id)}</option>`).join('')}</select>` : ''}<button data-do="t-register" data-id="${esc(id)}">Register</button><button data-do="t-simple" data-verb="checkin" data-id="${esc(id)}">Check in</button>` : ''}
      <button data-do="t-simple" data-verb="drop" data-id="${esc(id)}">Drop</button>
      ${t.can_run && t.status === 'open' ? `<button data-do="t-simple" data-verb="start" data-id="${esc(id)}">Start event</button>` : ''}
      ${t.can_run && t.status === 'running' ? `<button data-do="t-simple" data-verb="next-round" data-id="${esc(id)}">Next round</button><button data-do="t-simple" data-verb="close" data-id="${esc(id)}">Close event</button>` : ''}</div>
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
    <h2>Content</h2>${tiles(drafts.items, d => `<div class="hub-tile"><b>${esc(d.title)}</b><small>${esc(d.kind)} · ${esc(d.status)}</small><div class="hub-row">${d.status === 'published' ? `<button data-do="unpublish" data-id="${d.id}">Unpublish</button>` : `<button data-do="publish" data-id="${d.id}">Publish</button>`}</div></div>`, 'No content yet.')}
    <form class="hub-form" data-do="create-content"><label>Kind<select name="kind">${['news', 'guide', 'lesson', 'ruling', 'balance'].map(k => `<option>${k}</option>`).join('')}</select></label><label>Slug<input name="slug" pattern="[a-z0-9][a-z0-9-]+" required></label><label>Title<input name="title" maxlength="120" required></label><label>Body<textarea name="body" rows="4" required></textarea></label><label>Meta (JSON: rule_refs, card_refs, balance fields)<textarea name="meta" rows="2">{}</textarea></label><button>Save draft</button></form>
    <h2>Roles</h2><form class="hub-form" data-do="grant-role"><label>Player<input name="username" required></label><label>Role<select name="role"><option>publisher</option><option>moderator</option><option>judge</option></select></label><button>Grant</button></form>
    <h2>Audit log</h2><div class="hub-scroll"><table class="hub-table"><tbody>${audit.entries.slice(0, 50).map(e => `<tr><td>${when(e.at)}</td><td>${esc(e.actor_name)}</td><td>${esc(e.action)}</td><td>${esc(e.target)}</td></tr>`).join('') || '<tr><td>No entries.</td></tr>'}</tbody></table></div>`;
}

// ---------- Ações ----------
const ACTIONS = {
  'share-deck': async (_, data) => { const r = await api('/decks', 'POST', data); location.hash = `#/deck/${r.id}`; },
  'favorite-deck': el => api(`/decks/${q(el.dataset.id)}/favorite`, 'POST', {}),
  'fork-deck': async el => {
    const {data} = await api(`/decks/${q(el.dataset.id)}/fork`, 'POST', {});
    await call(`/api/decks/fork-${crypto.randomUUID().slice(0, 12)}`, 'PUT', {data: {...data, name: `${data.name || 'Deck'} (copy)`}, revision: 0});
    alertBox('Copied to your decks.');
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
  'create-content': (_, data) => {
    let meta;
    try { meta = JSON.parse(data.meta || '{}'); } catch { throw new Error('Meta must be valid JSON.'); }
    return api('/content', 'POST', {...data, meta});
  },
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
  const fn = CHANGES[e.target.dataset?.change];
  if (fn) run(fn, e.target);
});
document.addEventListener('input', e => {
  if (e.target.closest('.hub-row')?.querySelector('#card-q')) filterCards();
  if (e.target.id === 'rule-q') filterRules();
});

// ---------- Rotas ----------
const ROUTES = {'': home, codex, card: cardPage, rule: rulePage, nexus, article, decks, deck: deckPage, guilds, guild: guildPage, tournaments, tournament: tournamentPage, notifications: inbox, console: consolePage};

async function render() {
  const [, name = '', arg] = location.hash.split('/');
  const view = ROUTES[name];
  try {
    root.innerHTML = view ? await view(arg && decodeURIComponent(arg)) : empty('Page not found.');
    filterCards();
    filterRules();
  } catch (e) {
    root.innerHTML = `<p class="hub-error" role="alert">${esc(e.status === 401 ? 'Sign in to continue.' : e.status === 403 ? 'You do not have permission to see this.' : e.message)}</p>`;
  }
}

async function refreshMe() {
  const me = await api('/me').catch(() => null);
  document.getElementById('hub-unread').textContent = me?.unread || '';
  document.getElementById('hub-console').hidden = !me?.developer;
}

addEventListener('hashchange', render);
render();
refreshMe();
