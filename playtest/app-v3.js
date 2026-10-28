// Mesa mínima da engine 3.0 (Alpha 0.1): dois jogadores locais, decks D171, catálogo D268.
// Só produz interface: toda regra vem de engine-v3/. Texto visível em inglês; código em português.
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch, mulligan} from './engine-v3/match.js';
import {startTurn, endTurn, pass, placeBase, spellCategory} from './engine-v3/core.js';
import {declareStrike} from './engine-v3/strike.js';
import {playDevotee, playEquipment, playSpell, activate, reequip} from './engine-v3/play.js';
import {atkOf, hpOf, keywordsOf, gearOf, isSaint, isBronze, ABILITIES} from './engine-v3/effects.js';

const root = document.querySelector('#root'), notice = document.querySelector('#notice');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let canon, cards, decks, match, ctx, log = [], pending = null, ending = false, marked = new Set(), noticeTimer;

const S = () => match.state;
const num = uid => ctx.objects[uid].cardId.slice(-3);
const info = uid => cards.get(ctx.objects[uid].cardId);
const other = key => S().order.find(k => k !== key);
const deckName = key => (key === 'A' ? decks.A : decks.B).nome || (key === 'A' ? 'Pegasus Rush' : 'Dragon Fortress');
const say = text => { log.push(`R${S().round} · ${text}`); };
function warn(text) { notice.textContent = text; notice.classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.classList.remove('show'), 5000); }

// Perguntas "you may" da engine: confirmação síncrona.
function decide(player, q) {
  if (q.cards) return confirm(`Player ${player} · ${q.ability}: keep ${info(q.cards[0]).name} on top? (Cancel keeps ${info(q.cards[1]).name})`) ? q.cards[0] : q.cards[1];
  return confirm(`Player ${player} · ${q.ability}${q.uid ? ` for ${info(q.uid).name}` : ''}${q.amount ? ` (${q.amount} damage incoming)` : ''}?`);
}

// Escolhas de cada carta, em ordem. pick: conjunto de candidatos; multi: até N; optional: pode pular.
const SAINT = {key: 'target', pick: 'saint', label: 'Choose a friendly Saint'};
const STEPS = {
  '052': [{key: 'targets', pick: 'bronze', multi: 2, optional: true, label: 'Choose up to two friendly Bronze Saints'}],
  '053': [SAINT], '054': [SAINT], '058': [SAINT], '076': [SAINT], '077': [SAINT],
  '059': [SAINT, {key: 'prepare', confirm: 'Also Prepare that Saint (needs Shunrei)?'}],
  '060': [{key: 'target', pick: 'bronze', label: 'Choose a friendly Bronze Saint'}],
  '061': [{key: 'mode', options: {atk: '+2 ATK to a friendly Saint', god: 'Prevent the next 3 Strike damage to your God'}},
    {...SAINT, when: c => c.mode === 'atk'}],
  '081': [{key: 'mode', options: {atk: '+2/+2 to a friendly Bronze Saint', god: 'Prevent the next 5 Strike damage to your God', both: 'Both (needs Pegasus Seiya)'}},
    {key: 'target', pick: 'bronze', label: 'Choose a friendly Bronze Saint', when: c => c.mode !== 'god'}],
  '082': [{key: 'target', pick: 'enemy', label: 'Choose an enemy Devotee'}, {key: 'heal', pick: 'saint', optional: true, label: 'If it is defeated, remove 1 damage from which friendly Saint?'}],
  '085': [{key: 'source', pick: 'saint', label: 'Choose the friendly Saint'}, {key: 'target', pick: 'enemy', label: 'Choose an enemy Devotee'}],
  '087': [{key: 'prepare', pick: 'saint', multi: 2, optional: true, label: 'If your God has 5 or less Soul, Prepare up to two friendly Saints'}],
  '088': [SAINT, {key: 'prepare', confirm: 'Prepare that Saint if your God is behind?'}],
  '021': [{key: 'target', pick: 'bronze', optional: true, label: 'Training counter on which friendly Bronze Saint?'}],
  '041': [{key: 'target', pick: 'devotee', label: 'Remove up to 2 damage from which friendly Devotee?'}],
  '042': [{key: 'target', pick: 'armor', label: 'Shield which friendly Armor?'}],
  '011': [{key: 'target', pick: 'armor', label: 'Shield which friendly Armor?'}],
};

function candidates(pick, key) {
  const field = S().players[key].battlefield, devs = field.filter(u => info(u).kind === 'Devotee');
  if (pick === 'saint') return devs.filter(u => isSaint(ctx, u));
  if (pick === 'bronze') return devs.filter(u => isBronze(ctx, u));
  if (pick === 'devotee') return devs;
  if (pick === 'armor') return field.filter(u => info(u).armor && ctx.attached[u]);
  if (pick === 'enemy') return S().players[other(key)].battlefield.filter(u => info(u).kind === 'Devotee');
  if (pick === 'strike') return [...S().players[other(key)].battlefield.filter(u => info(u).kind === 'Devotee'), `god:${other(key)}`];
  return [];
}

// Avança pelas escolhas pendentes; quando acabam, executa a ação.
function advance() {
  while (pending && pending.i < pending.steps.length) {
    const step = pending.steps[pending.i];
    if (step.when && !step.when(pending.choice)) { pending.i++; continue; }
    if (step.confirm) { pending.choice[step.key] = confirm(step.confirm); pending.i++; continue; }
    return render(); // mode ou pick: espera clique
  }
  if (!pending) return render();
  const {run} = pending;
  pending = null;
  act(run);
}

function act(fn) {
  try { fn(); } catch (e) { warn(e.message); }
  // Fim de turno: quando a janela da End Phase fecha, começa o turno do próximo jogador.
  try {
    while (ending && !S().window && !S().victory) { ending = false; startTurn(S()); say(`Player ${S().active} begins turn ${S().players[S().active].ownTurns}.`); }
  } catch (e) { warn(e.message); }
  render();
}

function begin(kind, key, uid, steps, run) {
  pending = {kind, key, uid, steps, i: 0, choice: {}, picked: [], run: () => run(pending0.choice)};
  const pending0 = pending;
  advance();
}

const playable = (key, uid) => {
  const c = info(uid), s = S(), idle = !s.window && !s.chain.length && s.active === key;
  if (s.victory || s.setup) return false;
  if (c.kind === 'Spell') {
    const cat = spellCategory(Number(num(uid)));
    if (cat?.speed === 'instant') return s.window ? s.window.priority === key : s.active === key;
    return idle;
  }
  return idle;
};

function playFromHand(key, uid) {
  const c = info(uid), n = num(uid);
  if (c.kind === 'Devotee') return begin('play', key, uid, STEPS[n] || [], ch => { playDevotee(S(), ctx, key, uid, ch); say(`${key} plays ${c.name}.`); });
  if (c.kind === 'Equipment') {
    const steps = [{key: 'bearer', pick: 'devotee', label: `Equip ${c.name} to which friendly Devotee?`}];
    if (n === '019') steps.push({key: 'target', pick: 'devotee', optional: true, label: 'When cast (your God behind): which friendly Devotee gets +3/+3?'});
    return begin('play', key, uid, steps, ch => { playEquipment(S(), ctx, key, uid, ch.bearer, ch); say(`${key} equips ${c.name}.`); });
  }
  return begin('play', key, uid, STEPS[n] || [], ch => { playSpell(S(), ctx, key, uid, ch); say(`${key} casts ${c.name}.`); });
}

// ---------- Render ----------

function cardBox(uid, {owner, field} = {}) {
  const c = info(uid), s = S(), unit = s.units[uid];
  const isPick = pending && pending.options?.includes(uid);
  const stats = c.kind === 'Devotee' && field ? `ATK ${atkOf(s, ctx, uid)} · HP ${hpOf(s, ctx, uid)} · damage ${unit?.damage ?? 0}`
    : c.kind === 'Devotee' ? `ATK ${c.atk} · HP ${c.hp}` : c.armor ? `Armor · HP ${c.hp}${unit?.damage ? ` · damage ${unit.damage}` : ''}` : '';
  const cost = c.cost ? `${c.cost.amount} ${c.cost.unit === 'base' ? 'Base' : 'Latent'}` : '';
  const kw = field && c.kind === 'Devotee' ? keywordsOf(s, ctx, uid) : c.keywords;
  const gear = field && c.kind === 'Devotee' ? gearOf(ctx, uid).map(g => info(g).name).join(', ') : '';
  const extra = unit?.training ? ` · Training ${unit.training}` : '';
  const cls = ['card', field && c.kind === 'Devotee' && !unit?.prepared ? 'unprepared' : '', isPick ? 'pick' : ''].join(' ');
  const cat = c.kind === 'Spell' && spellCategory(Number(num(uid)));
  const type = cat ? `Spell — ${cat.category} (${cat.speed === 'instant' ? 'Instant' : 'Sorcery'})` : c.type;
  return `<div class="${cls}"><span class="name">${esc(c.name)}</span><span class="meta">${esc(type)}${cost ? ` · ${cost}` : ''}</span>
    ${stats ? `<span class="meta">${stats}${extra}${field && c.kind === 'Devotee' ? (unit?.prepared ? ' · Prepared' : ' · Unprepared') : ''}</span>` : ''}
    ${kw?.length ? `<span class="meta">${esc([...new Set(kw)].join(', '))}</span>` : ''}${gear ? `<span class="gear">Wears: ${esc(gear)}</span>` : ''}
    <details><summary>Text</summary><p>${esc(c.text.split('\n').slice(2).join('\n'))}</p></details>
    <div class="row">${buttonsFor(uid, owner, field)}</div></div>`;
}

function buttonsFor(uid, owner, field) {
  const s = S(), c = info(uid), b = [];
  if (pending?.options?.includes(uid)) return `<button class="primary" data-pick="${uid}">Choose</button>`;
  if (pending || s.victory || s.setup) return '';
  const idle = !s.window && !s.chain.length && s.active === owner;
  if (!field) {
    if (playable(owner, uid)) b.push(`<button data-play="${uid}">Play</button>`);
    if (idle && c.cosmoble && s.players[owner].baseTurn !== s.turn) b.push(`<button data-base="${uid}">Place as Base</button>`);
  } else if (idle && c.kind === 'Devotee') {
    if (s.units[uid]?.prepared && s.strikes.get(uid) !== s.turn) b.push(`<button data-strike="${uid}">Strike</button>`);
    if (ABILITIES[num(uid)] && s.units[uid]?.prepared) b.push(`<button data-activate="${uid}">${esc(ABILITIES[num(uid)].name)}</button>`);
  } else if (idle && c.kind === 'Equipment' && !ctx.attached[uid]) b.push(`<button data-reequip="${uid}">Re-equip</button>`);
  return b.join('');
}

function playerPanel(key) {
  const s = S(), p = s.players[key], god = cards.get(s.gods[key]);
  const ready = p.bases.filter(b => b.prepared).length;
  const godPick = pending?.options?.includes(`god:${key}`) ? ` <button class="primary" data-pick="god:${key}">Choose God</button>` : '';
  const hand = s.setup ? p.hand.map(u => `<label class="card"><span class="name">${esc(info(u).name)}</span><span class="meta">${esc(info(u).type)}</span>${s.setup[0] === key ? `<span><input type="checkbox" data-mull="${u}" ${marked.has(u) ? 'checked' : ''}> return to deck</span>` : ''}</label>`).join('')
    : p.hand.map(u => cardBox(u, {owner: key})).join('');
  return `<section class="player ${s.active === key ? 'active' : ''}">
    <h2>Player ${key} · ${esc(deckName(key))} <span>${esc(god.name)} · Soul ${p.soul}${godPick}</span><span>Latent ${p.latent}/3</span><span>Bases ${ready}/${p.bases.length} prepared</span>
      <span>Deck ${p.deck.length} · Hand ${p.hand.length} · Tartarus ${p.tartarus.length}${p.fatigue ? ` · Fatigue ${p.fatigue}` : ''}</span></h2>
    <div class="zone"><b>Battlefield</b><div class="cards">${p.battlefield.filter(u => !ctx.attached[u]).map(u => cardBox(u, {owner: key, field: true})).join('') || '<span class="meta">Empty</span>'}</div></div>
    <div class="zone"><b>Hand</b><div class="cards">${hand || '<span class="meta">Empty</span>'}</div></div>
  </section>`;
}

function statusBar() {
  const s = S();
  if (s.victory) return `<div class="status"><strong>${s.victory.draw ? 'Draw — both Gods fell.' : `Player ${s.victory.winner} wins.`}</strong> <button data-new>New match</button></div>`;
  if (s.setup) return `<div class="status"><strong>Mulligan · Player ${s.setup[0]}</strong> — mark cards to return, then confirm. Player ${s.order[0]} goes first. <button class="primary" data-mulligan>Confirm</button></div>`;
  if (pending) {
    const step = pending.steps[pending.i];
    const modes = step.options ? Object.entries(step.options).map(([v, l]) => `<button data-mode="${v}">${esc(l)}</button>`).join('') : '';
    const done = step.multi ? `<button class="primary" data-done>Done (${pending.picked.length}/${step.multi})</button>` : step.optional ? '<button data-skip>Skip</button>' : '';
    return `<div class="status"><strong>${esc(info(pending.uid)?.name || 'Strike')}</strong> — ${esc(step.label || 'Choose a mode')} <span class="row">${modes}${done}<button data-cancel>Cancel</button></span></div>`;
  }
  const chain = s.chain.length ? ` · Chain: ${s.chain.map((c, i) => `${i + 1}. ${c.controller}`).join(' ')}` : '';
  if (s.window) return `<div class="status"><strong>Priority: Player ${s.window.priority}</strong> — respond with a Moment or pass${chain}. <button class="primary" data-pass>Pass</button></div>`;
  return `<div class="status"><strong>Round ${s.round} · Player ${s.active}'s turn</strong> — play cards, place a Base, Strike, or end the turn. <button class="primary" data-end>End turn</button></div>`;
}

function render() {
  if (pending) {
    const step = pending.steps[pending.i];
    pending.options = step?.pick ? candidates(step.pick, pending.key).filter(u => !pending.picked.includes(u)) : [];
  }
  const first = S().order[0];
  root.innerHTML = `${statusBar()}${playerPanel(other(first))}${playerPanel(first)}
    <div class="log" aria-label="Match log">${log.slice(-80).reverse().map(l => `<div>${esc(l)}</div>`).join('') || 'The match log appears here.'}</div>
    <p class="meta"><label>Seed <input id="seed" type="number" value="${match.seed}"></label> <button data-new>New match</button></p>`;
}

// ---------- Eventos ----------

root.addEventListener('change', e => {
  const uid = e.target.dataset.mull;
  if (uid) e.target.checked ? marked.add(uid) : marked.delete(uid);
});

root.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  const s = S(), d = t.dataset;
  if ('new' in d) return newMatch(Number(document.querySelector('#seed')?.value) || Date.now() % 100000);
  if ('mulligan' in d) {
    const key = s.setup[0], back = [...marked];
    marked = new Set();
    return act(() => {
      mulligan(match, key, back);
      say(`${key} mulligans ${back.length}.`);
      if (!s.setup) { startTurn(s); say(`Player ${s.active} begins the first turn.`); }
    });
  }
  if ('cancel' in d) { pending = null; return render(); }
  if ('mode' in d) { pending.choice[pending.steps[pending.i].key] = d.mode; pending.i++; return advance(); }
  if ('skip' in d) { pending.i++; return advance(); }
  if ('done' in d) { pending.choice[pending.steps[pending.i].key] = [...pending.picked]; pending.picked = []; pending.i++; return advance(); }
  if (d.pick) {
    const step = pending.steps[pending.i];
    if (step.multi) {
      pending.picked.push(d.pick);
      if (pending.picked.length < step.multi) return render();
      pending.choice[step.key] = [...pending.picked]; pending.picked = [];
    } else pending.choice[step.key] = d.pick;
    pending.i++;
    return advance();
  }
  if ('pass' in d) return act(() => { const who = s.window.priority; pass(s, who); say(`${who} passes.`); });
  if ('end' in d) return act(() => { ending = true; say(`${s.active} ends the turn.`); endTurn(s); });
  if (d.play) return playFromHand(ctx.objects[d.play].owner, d.play);
  if (d.base) return act(() => { placeBase(s, s.active, d.base, info(d.base)); say(`${s.active} places a Base.`); });
  if (d.strike) {
    const key = s.active, attacker = d.strike;
    return begin('strike', key, attacker, [{key: 'target', pick: 'strike', label: `Choose the target for ${info(attacker).name}`}], ch => {
      const target = ch.target.startsWith('god:') ? {kind: 'god', player: ch.target.slice(4)} : {kind: 'devotee', uid: ch.target};
      declareStrike(s, ctx, attacker, target);
      say(`${key}: ${info(attacker).name} strikes ${target.kind === 'god' ? `God ${target.player}` : info(target.uid).name}.`);
    });
  }
  if (d.activate) return begin('activate', s.active, d.activate, STEPS[num(d.activate)] || [], ch => { activate(s, ctx, s.active, d.activate, ch); say(`${s.active} uses ${ABILITIES[num(d.activate)].name}.`); });
  if (d.reequip) return begin('reequip', s.active, d.reequip, [{key: 'bearer', pick: 'devotee', label: 'Re-equip to which friendly Devotee?'}], ch => { reequip(s, ctx, s.active, d.reequip, ch.bearer); say(`${s.active} re-equips ${info(d.reequip).name}.`); });
});

function newMatch(seed) {
  match = createMatch({cards, canonIndex: canonIndex(canon), decks, seed});
  match.seed = seed;
  ctx = {cards, objects: match.objects, attached: match.attached, decide};
  log = [`Seed ${seed}. Player ${match.state.order[0]} goes first (drawn at random).`];
  pending = null; ending = false; marked = new Set();
  render();
}

async function init() {
  const [canonData, deckData] = await Promise.all(['../data/canon/d268.json', '../data/alpha-0.1/decks-proposta-d171.json'].map(u => fetch(u).then(r => {
    if (!r.ok) throw Error(`Missing ${u}`);
    return r.json();
  })));
  canon = canonData;
  cards = loadCanon(canon);
  const [rush, fortress] = deckData.decks;
  decks = {A: rush, B: fortress};
  newMatch(Date.now() % 100000);
}
init().catch(e => { root.innerHTML = `<p>${esc(e.message)}</p>`; });
