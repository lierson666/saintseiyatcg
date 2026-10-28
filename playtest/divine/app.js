// Divine Arena · interface do vertical slice (engine 3.0). HTML para tudo que se lê e se clica; WebGL atrás.
// Fluxo de cada ação: engine muda o estado e registra eventos -> orquestrador dramatiza com o DOM anterior ->
// render() mostra o estado final. Entrada travada durante a animação (Espaço pula).
import {loadCanon} from '../../shared/canon-cards.js';
import {canonIndex} from '../../shared/deck-v3.js';
import {createMatch, mulligan} from '../engine-v3/match.js';
import {startTurn, endTurn, pass, placeBase, spellCategory} from '../engine-v3/core.js';
import {declareStrike, strikeTargets} from '../engine-v3/strike.js';
import {playDevotee, playEquipment, playSpell, activate, reequip} from '../engine-v3/play.js';
import {atkOf, hpOf, keywordsOf, gearOf, isSaint, isBronze, ABILITIES} from '../engine-v3/effects.js';
import {STEPS} from '../choices-v3.js';
import {createScene, THEMES} from './scene.js?v=20261028-3';
import {createDirector} from './director.js';

const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const stage = $('#stage'), boardRoot = $('#board-root'), overlayRoot = $('#overlay-root'), notice = $('#notice');

// Arte disponível no repositório; o resto usa placeholder com a cor do tipo (contrato em AAA_VISUAL_DIRECTION.md).
const ART_ROOT = '../../CARDS/ATHENA/';
const ART = {'001': 'BRONZE/PEGASUSV1.png', '003': 'BRONZE/DRAGONv1.png', '021': 'SILVER/MARIN.png', '040': 'COMMON/SANCTUARY-GUARD.png',
  '041': 'COMMON/SANCTUMHEALER.png', '042': 'COMMON/CLOTHREPAIRER.png', '043': 'COMMON/STARHILLMONK.png', '048': 'UNCOMMON/LIBRA-SWORD.png', '049': 'UNCOMMON/LIBRA-SHIELD.png'};
const GOD_ART = {'god-athena': '../../CARDS/ATHENA/ATHENA.png', 'god-poseidon': '../../CARDS/POSEIDON/POSEIDON.png'};

// Mensagens da engine (internas, em português) viram texto curto para o jogador.
const WHY = {D1: "It's not your turn.", D4: 'Not enough prepared Cosmo Bases.', custo: 'Not enough Latent Cosmo.', P06: 'Wait for the response window to close.',
  P05: 'A Prepared Guardian must be your target.', D22: 'This Devotee already struck this turn.', P04: 'Only a Prepared Devotee can Strike.',
  D52: 'The match is over.', P01: 'Finish the mulligan first.', D192: 'It must be Prepared to use {T}.', D191: 'Already used this round.', Equip: 'That Devotee cannot wear it.', alvo: 'Choose a legal target.'};
const why = e => WHY[e.decision] || (e.topic ? `Not in Alpha 0.1: ${e.topic}` : "That can't be done right now.");

const SETTINGS_KEY = 'ssTcgDivineArena';
const settings = {quality: 'high', theme: 'athena', speed: 'normal', skipDraws: false, reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  reduceFlashes: false, shake: 1, hideOpponent: true, autoPass: true};
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* sem armazenamento */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* sem armazenamento */ } };

let canon, cards, decks, match, ctx, scene = null, director;
let mode = null;           // escolha em andamento: {kind, key, uid, steps, i, choice, picked, options, run}
let marked = new Set(), logLines = [], logOpen = false, settingsOpen = false, ending = false, inspectTimer, seenEvents = 0, drag = null;

const S = () => match.state;
const info = uid => cards.get(ctx.objects[uid].cardId);
const num = uid => ctx.objects[uid].cardId.slice(-3);
const other = key => S().order.find(k => k !== key);
const owner = uid => ctx.objects[uid].owner;
// Quem está à frente da tela: o jogador que precisa agir agora (hot-seat local).
const viewer = () => { const s = S(); return s.setup ? s.setup[0] : s.window ? s.window.priority : s.active; };
const say = text => { logLines.push({round: S().round, text}); if (logLines.length > 400) logLines.shift(); };
let noticeTimer;
function warn(text) { notice.textContent = text; notice.classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.classList.remove('show'), 3200); }

// ---------- Legalidade para a interface (a engine continua decidindo ao executar) ----------

const readyBases = key => S().players[key].bases.filter(b => b.prepared).length;
function affordable(key, cost) {
  if (!cost) return true;
  return cost.unit === 'latent' ? S().players[key].latent >= cost.amount : readyBases(key) >= cost.amount;
}
const idleFor = key => { const s = S(); return !s.victory && !s.setup && !s.window && !s.chain.length && s.active === key; };
function playableReason(key, uid) {
  const s = S(), c = info(uid);
  if (s.victory || s.setup) return 'The match is not running.';
  if (c.kind === 'Spell') {
    const cat = spellCategory(Number(num(uid)));
    if (!cat) return 'This Spell has no approved speed yet.';
    if (cat.speed === 'instant' ? !(s.window ? s.window.priority === key : s.active === key && !s.chain.length) : !idleFor(key)) return cat.speed === 'instant' ? 'You need priority to cast a Moment.' : 'Techniques are cast on your turn, with no response pending.';
    return affordable(key, c.cost) ? null : `Needs ${c.cost.amount} ${c.cost.unit === 'base' ? 'prepared Base' : 'Latent'} Cosmo.`;
  }
  if (!idleFor(key)) return s.active !== key ? "It's not your turn." : 'Wait for the response window to close.';
  if (c.kind === 'Equipment') {
    const devs = s.players[key].battlefield.filter(u => info(u).kind === 'Devotee');
    if (!devs.length) return 'You need a Devotee to equip.';
    const cheapest = Math.min(...devs.map(d => c.autoEquip.some(n => n.toUpperCase() === info(d).name.toUpperCase()) ? c.cost.amount : c.equip ? c.equip.amount : Infinity));
    return readyBases(key) >= cheapest ? null : `Needs ${cheapest === Infinity ? '—' : cheapest} prepared Base Cosmo.`;
  }
  return affordable(key, c.cost) ? null : `Needs ${c.cost.amount} prepared Base Cosmo.`;
}
const canBase = (key, uid) => idleFor(key) && info(uid).cosmoble && S().players[key].baseTurn !== S().turn;
// Há resposta possível? (Auto-pass só passa quando não há nenhum Moment jogável na mão.)
const hasResponse = key => S().players[key].hand.some(u => info(u).kind === 'Spell' && spellCategory(Number(num(u)))?.speed === 'instant' && !playableReason(key, u));

// ---------- Execução de ações ----------

async function act(fn) {
  if (director.busy) return;
  const s = S(), from = s.events.length;
  try { fn(); } catch (e) { warn(why(e)); console.debug(e); render(); return; }
  try {
    // Avança o que não precisa de escolha: início do turno seguinte e passes automáticos.
    for (let guard = 0; guard < 60; guard++) {
      if (ending && !s.window && !s.victory) { ending = false; startTurn(s); continue; }
      if (settings.autoPass && s.window && !s.victory && !hasResponse(s.window.priority)) { pass(s, s.window.priority); continue; }
      break;
    }
  } catch (e) { warn(why(e)); }
  const events = s.events.slice(from);
  seenEvents = s.events.length;
  render.lock = true;
  await director.play(events);
  render.lock = false;
  render();
}

function begin(kind, key, uid, steps, run) {
  mode = {kind, key, uid, steps, i: 0, choice: {}, picked: [], run};
  advance();
}
function advance() {
  while (mode && mode.i < mode.steps.length) {
    const step = mode.steps[mode.i];
    if (step.when && !step.when(mode.choice)) { mode.i++; continue; }
    if (step.confirm) return render(); // pergunta sim/não na barra de escolha
    return render();
  }
  if (!mode) return render();
  const {run, choice} = mode;
  mode = null;
  act(() => run(choice));
}

function candidates(step, key) {
  const s = S(), field = s.players[key].battlefield, devs = field.filter(u => info(u).kind === 'Devotee');
  switch (step.pick) {
    case 'saint': return devs.filter(u => isSaint(ctx, u));
    case 'bronze': return devs.filter(u => isBronze(ctx, u));
    case 'devotee': return devs;
    case 'armor': return field.filter(u => info(u).armor && ctx.attached[u]);
    case 'enemy': return s.players[other(key)].battlefield.filter(u => info(u).kind === 'Devotee');
    case 'strike': return strikeTargets(s, ctx, mode.uid).map(t => (t.kind === 'god' ? `god:${t.player}` : t.uid));
    default: return [];
  }
}

function playFromHand(key, uid) {
  const c = info(uid), n = num(uid), reason = playableReason(key, uid);
  if (reason) return warn(reason);
  if (c.kind === 'Devotee') return begin('play', key, uid, STEPS[n] || [], ch => playDevotee(S(), ctx, key, uid, ch));
  if (c.kind === 'Equipment') {
    const steps = [{key: 'bearer', pick: 'devotee', label: `Choose who wears ${c.name}`}];
    if (n === '019') steps.push({key: 'target', pick: 'devotee', optional: true, label: 'Pegasus God Cloth: which Devotee gets +3/+3 (if your God is behind)?'});
    return begin('play', key, uid, steps, ch => playEquipment(S(), ctx, key, uid, ch.bearer, ch));
  }
  return begin('play', key, uid, STEPS[n] || [], ch => playSpell(S(), ctx, key, uid, ch));
}

function startStrike(uid) {
  const targets = strikeTargets(S(), ctx, uid);
  if (!targets.length) return warn('No legal target for this Devotee right now.');
  begin('strike', S().active, uid, [{key: 'target', pick: 'strike', label: `Choose a target for ${info(uid).name}`}], ch => {
    const target = ch.target.startsWith('god:') ? {kind: 'god', player: ch.target.slice(4)} : {kind: 'devotee', uid: ch.target};
    declareStrike(S(), ctx, uid, target);
  });
}

function primary() {
  const s = S();
  if (director.busy) return director.skip();
  if (mode) {
    const step = mode.steps[mode.i];
    if (step?.multi || step?.optional) return choose(null);
    return;
  }
  if (s.victory) return;
  if (s.setup) return confirmMulligan();
  if (s.window) return act(() => pass(s, s.window.priority));
  act(() => { ending = true; endTurn(s); });
}

function choose(value) {
  const step = mode.steps[mode.i];
  if (step.multi) {
    if (value) { mode.picked.push(value); if (mode.picked.length < step.multi) return render(); }
    mode.choice[step.key] = [...mode.picked]; mode.picked = [];
  } else if (value !== null) mode.choice[step.key] = value;
  mode.i++;
  advance();
}

function confirmMulligan() {
  const s = S(), key = s.setup[0], back = [...marked];
  marked = new Set();
  act(() => { mulligan(match, key, back); if (!s.setup) startTurn(s); });
}

// ---------- Render ----------

function cardFace(uid, {field = false, hidden = false, size = ''} = {}) {
  if (hidden) return `<div class="dcard dcard--back ${size}" data-uid="${uid}" aria-label="Face-down card"><span></span></div>`;
  const s = S(), c = info(uid), n = num(uid), unit = s.units[uid];
  const cat = c.kind === 'Spell' ? spellCategory(Number(n)) : null;
  const subtype = cat ? cat.category : (c.type.split(' — ')[1] || c.kind);
  const art = ART[n] ? `style="background-image:url('${ART_ROOT}${ART[n]}')"` : '';
  const atk = field ? atkOf(s, ctx, uid) : c.atk, hp = field ? hpOf(s, ctx, uid) : c.hp;
  const kws = [...new Set(field && c.kind === 'Devotee' ? keywordsOf(s, ctx, uid) : c.keywords)];
  const dmg = unit?.damage || 0;
  const cls = ['dcard', size, `kind-${c.kind.toLowerCase()}`, `rarity-${(c.rarity || 'common').toLowerCase()}`, c.armor ? 'is-armor' : '', cat ? `cat-${cat.category.toLowerCase()}` : '',
    field && c.kind === 'Devotee' && !unit?.prepared ? 'unprepared' : '', kws.includes('Guardian') && field && unit?.prepared ? 'guarding' : ''].join(' ');
  const statBuffed = (v, base) => (v > base ? 'up' : v < base ? 'down' : '');
  return `<div class="${cls}" data-uid="${uid}" tabindex="0" aria-label="${esc(c.name)}">
    <div class="dcard__art" ${art}><span class="dcard__glyph">${esc(c.name.split(/[ ,’']/)[0].slice(0, 2))}</span></div>
    ${c.cost ? `<b class="dcard__cost ${c.cost.unit}" title="${c.cost.amount} ${c.cost.unit === 'base' ? 'Base' : 'Latent'} Cosmo">${c.cost.amount}</b>` : ''}
    <div class="dcard__plate"><strong>${esc(c.name)}</strong><small>${esc(subtype)}${kws.length ? ` · ${esc(kws.join(' · '))}` : ''}</small></div>
    ${c.kind === 'Devotee' ? `<div class="dcard__stats"><b class="atk ${statBuffed(atk, c.atk)}">${atk}</b><b class="hp ${statBuffed(hp, c.hp)}">${hp - dmg}</b></div>` : ''}
    ${c.armor && field ? `<div class="dcard__stats"><b class="hp">${c.hp - dmg}</b></div>` : ''}
    ${dmg && field ? `<i class="dcard__damage" title="${dmg} damage">${dmg}</i>` : ''}
    ${unit?.training ? `<i class="dcard__counter" title="Training counter">✦${unit.training}</i>` : ''}
  </div>`;
}

function bank(key) {
  const p = S().players[key];
  const base = p.bases.map(b => `<i class="orb orb--base ${b.prepared ? 'ready' : 'spent'}" title="Cosmo Base ${b.prepared ? '(prepared)' : '(spent)'}"></i>`).join('');
  const latent = [0, 1, 2].map(i => `<i class="orb orb--latent ${i < p.latent ? 'ready' : 'empty'}" title="Latent Cosmo"></i>`).join('');
  return `<div class="bank" data-bank="${key}" aria-label="Cosmo: ${readyBases(key)} of ${p.bases.length} Base prepared, ${p.latent} of 3 Latent">
    <div class="bank__row" data-bank-unit="base"><span>Base</span>${base || '<em>none</em>'}<b>${readyBases(key)}/${p.bases.length}</b></div>
    <div class="bank__row" data-bank-unit="latent"><span>Latent</span>${latent}<b>${p.latent}/3</b></div></div>`;
}

function godPlaque(key) {
  const s = S(), p = s.players[key], god = cards.get(s.gods[key]);
  const pick = mode?.options?.includes(`god:${key}`);
  return `<div class="god ${pick ? 'pickable' : ''} ${s.active === key ? 'is-active' : ''}" data-god="${key}" ${pick ? `data-pick="god:${key}" role="button" tabindex="0"` : ''}>
    <div class="god__portrait" style="background-image:url('${GOD_ART[s.gods[key]] || ''}')"></div>
    <div class="god__info"><small>Player ${key} · ${esc(key === 'A' ? decks.A.nome : decks.B.nome)}</small><strong>${esc(god.name)}</strong>
      <span class="god__soul" data-soul="${key}"><b>${p.soul}</b> Soul</span>
      <span class="god__meta" title="Awaken, Divine Power and Ultimate are not in Alpha 0.1">Attack ${god.atk} · Awaken ${god.awaken ?? '—'} <em>locked</em></span></div></div>`;
}

function piles(key) {
  const p = S().players[key];
  return `<div class="piles"><span class="pile" data-deck="${key}" title="Deck">${p.deck.length}<small>Deck</small></span><span class="pile pile--tartarus" title="Tartarus">${p.tartarus.length}<small>Tartarus</small></span>${p.fatigue ? `<span class="pile pile--fatigue" title="Fatigue">${p.fatigue}<small>Fatigue</small></span>` : ''}</div>`;
}

function fieldRow(key) {
  const s = S(), p = s.players[key];
  const units = p.battlefield.filter(u => !ctx.attached[u]).map(u => {
    const gear = gearOf(ctx, u).map(g => `<div class="gear" data-uid="${g}" title="${esc(info(g).name)}">${esc(info(g).name)}${s.units[g]?.damage ? ` · ${s.units[g].damage} dmg` : ''}</div>`).join('');
    return `<div class="slot">${cardFace(u, {field: true})}${gear ? `<div class="gears">${gear}</div>` : ''}</div>`;
  }).join('');
  return `<section class="field field--${key === viewer() ? 'me' : 'opp'}" data-field="${key}" aria-label="Player ${key} battlefield">${units || '<p class="field__empty">No Devotees</p>'}</section>`;
}

function handRow(key, hidden) {
  const hand = S().players[key].hand, n = hand.length;
  return `<div class="hand hand--${hidden ? 'opp' : 'me'}" data-hand="${key}" style="--n:${n}">${hand.map((u, i) => {
    const playable = !hidden && !playableReason(key, u), base = !hidden && canBase(key, u);
    return `<div class="hand__slot ${playable ? 'playable' : ''} ${base ? 'baseable' : ''}" style="--i:${i}">${cardFace(u, {hidden, size: hidden ? 'dcard--sm' : ''})}</div>`;
  }).join('')}</div>`;
}

function phaseText() {
  const s = S();
  if (s.victory) return 'Match over';
  if (s.setup) return `Mulligan · Player ${s.setup[0]}`;
  if (s.window) return `${s.chain.length ? `Chain of ${s.chain.length} · ` : ''}Response window · Player ${s.window.priority} to act`;
  return `Round ${s.round} · Player ${s.active} · Main`;
}

function actionPanel() {
  const s = S(), v = viewer();
  let label = 'End turn', hint = 'Play cards, place a Base or Strike.';
  if (s.victory) { label = '—'; hint = ''; }
  else if (s.setup) { label = marked.size ? `Return ${marked.size} and draw` : 'Keep hand'; hint = 'Click cards to send them back.'; }
  else if (s.window) { label = s.chain.length ? 'Pass · resolve' : 'Pass'; hint = hasResponse(v) ? 'You can answer with a Moment.' : 'No response available.'; }
  const chain = s.chain.length ? `<ol class="chain">${s.chain.map(c => `<li>${esc(c.uid ? info(c.uid).name : 'Triggered ability')} <small>${c.controller}</small></li>`).reverse().join('')}</ol>` : '';
  return `<aside class="actions" aria-label="Turn actions">
    <div class="priority ${s.window ? 'is-window' : ''}"><small>${s.window ? 'Priority' : 'Turn'}</small><strong>Player ${v}</strong></div>
    ${chain}
    <button class="primary-action" data-primary ${s.victory ? 'disabled' : ''}>${esc(label)} <kbd>Space</kbd></button>
    <p class="actions__hint">${esc(hint)}</p>
    <div class="actions__tools"><button data-toggle-log aria-pressed="${logOpen}">Log</button><button data-toggle-settings>Settings</button><a href="../alpha3.html">Debug table</a></div>
  </aside>`;
}

function choiceBar() {
  if (!mode) return '';
  const step = mode.steps[mode.i];
  const name = mode.uid ? info(mode.uid).name : '';
  let controls = '';
  if (step.options) controls = Object.entries(step.options).map(([v, l]) => `<button data-mode="${v}">${esc(l)}</button>`).join('');
  else if (step.confirm) controls = '<button data-confirm="yes">Yes</button><button data-confirm="no">No</button>';
  else if (step.multi) controls = `<button data-done>Done (${mode.picked.length}/${step.multi})</button>`;
  else if (step.optional) controls = '<button data-done>Skip</button>';
  return `<div class="choice" role="dialog" aria-label="Choose"><strong>${esc(name)}</strong><span>${esc(step.label || step.confirm || 'Choose one')}</span>${controls}<button class="ghost" data-cancel>Cancel <kbd>Esc</kbd></button></div>`;
}

function overlays() {
  const s = S();
  let html = '';
  if (s.setup) {
    const key = s.setup[0];
    html += `<div class="overlay mulligan"><h2>Player ${key} · Opening hand</h2><p>Send any number of cards to the bottom of your deck, shuffle and draw that many. Once.</p>
      <div class="mulligan__cards">${s.players[key].hand.map(u => `<button class="mull ${marked.has(u) ? 'marked' : ''}" data-mull="${u}">${cardFace(u, {size: 'dcard--lg'})}</button>`).join('')}</div>
      <button class="primary-action" data-primary>${marked.size ? `Return ${marked.size} and draw` : 'Keep hand'} <kbd>Space</kbd></button></div>`;
  }
  if (s.victory) {
    html += `<div class="overlay victory"><h2>${s.victory.draw ? 'Draw' : `Player ${s.victory.winner} wins`}</h2><p>Round ${s.round} · Soul ${s.order.map(k => `${k} ${s.players[k].soul}`).join(' · ')}</p>
      <div class="row"><button class="primary-action" data-new>New match</button><a class="ghost" href="../">Main menu</a></div></div>`;
  }
  if (logOpen) html += `<div class="drawer log" aria-label="Match log"><h3>Match log</h3>${logLines.slice(-150).reverse().map(l => `<p><small>R${l.round}</small> ${esc(l.text)}</p>`).join('')}</div>`;
  if (settingsOpen) {
    const sel = (key, opts) => `<select data-setting="${key}">${Object.entries(opts).map(([v, l]) => `<option value="${v}" ${settings[key] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const chk = (key, l) => `<label class="set"><span>${l}</span><input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''}></label>`;
    html += `<div class="drawer settings" role="dialog" aria-label="Settings"><h3>Settings</h3>
      <label class="set"><span>Graphics</span>${sel('quality', {low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra'})}</label>
      <label class="set"><span>Arena</span>${sel('theme', Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.label])))}</label>
      <label class="set"><span>Animation speed</span>${sel('speed', {fast: 'Fast', normal: 'Normal', cinematic: 'Cinematic'})}</label>
      ${chk('autoPass', 'Auto-pass when you have no response')}${chk('skipDraws', 'Skip draw animations')}${chk('reduceMotion', 'Reduce motion')}${chk('reduceFlashes', 'Reduce flashes')}${chk('hideOpponent', 'Hide the other hand (hot-seat)')}
      <label class="set"><span>Screen shake</span><input type="range" min="0" max="1.5" step=".25" value="${settings.shake}" data-setting="shake"></label>
      <p class="stats" data-stats>${scene ? 'WebGL on' : 'WebGL off · 2D fallback'}</p>
      <button data-toggle-settings>Close</button></div>`;
  }
  return html;
}

function render() {
  if (render.lock) return;
  document.body.classList.toggle("reduce-motion", !!settings.reduceMotion);
  const s = S(), me = viewer(), them = other(me);
  if (mode) { const step = mode.steps[mode.i]; mode.options = step?.pick ? candidates(step, mode.key).filter(u => !mode.picked.includes(u)) : []; }
  boardRoot.innerHTML = `
    <div class="board ${mode ? 'is-choosing' : ''}">
      <header class="rail rail--top">${godPlaque(them)}${bank(them)}${piles(them)}</header>
      ${handRow(them, settings.hideOpponent)}
      ${fieldRow(them)}
      <div class="midline"><span>${esc(phaseText())}</span></div>
      ${fieldRow(me)}
      <footer class="rail rail--bottom">${godPlaque(me)}${bank(me)}${piles(me)}</footer>
      ${handRow(me, false)}
    </div>
    ${actionPanel()}${choiceBar()}`;
  overlayRoot.innerHTML = overlays();
  for (const uid of mode?.options || []) $$(`[data-uid="${uid}"]`).forEach(el => el.classList.add('pickable'));
  if (mode) $$('.dcard').forEach(el => { if (!el.classList.contains('pickable') && el.closest('.field')) el.classList.add('dimmed'); });
  if (scene) { const st = $('[data-stats]'); if (st) st.textContent = `WebGL on · ${JSON.stringify(scene.stats())}`; }
}

// ---------- Adaptador do DOM para o orquestrador ----------

const rectOf = el => (el ? el.getBoundingClientRect() : null);
const ui = {
  number: num, type: uid => info(uid).type,
  isViewer: key => key === viewer(),
  rect: uid => rectOf($(`[data-uid="${uid}"]`)),
  godRect: key => rectOf($(`[data-god="${key}"]`)),
  deckRect: key => rectOf($(`[data-deck="${key}"]`)),
  handRect: key => rectOf($(`[data-hand="${key}"]`)),
  fieldRect: key => rectOf($(`[data-field="${key}"]`)),
  bankRect: (key, unit) => rectOf($(`[data-bank="${key}"] [data-bank-unit="${unit}"]`)),
  center: r => (r ? {x: r.left + r.width / 2, y: r.top + r.height / 2} : null),
  float(at, text, cls) {
    if (!at) return;
    const el = document.createElement('div');
    el.className = `float ${cls}`; el.textContent = text;
    el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
    document.body.append(el);
    setTimeout(() => el.remove(), 1300);
  },
  pulse(uid, cls, on) { $$(`[data-uid="${uid}"]`).forEach(el => { if (on === false) el.classList.remove(cls); else { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); } }); },
  aim(attacker, target) {
    $$('.aimed').forEach(el => el.classList.remove('aimed'));
    if (!attacker) return;
    const el = target.kind === 'god' ? $(`[data-god="${target.player}"]`) : $(`[data-uid="${target.uid}"]`);
    el?.classList.add('aimed');
  },
  setSoul(key, soul) { const el = $(`[data-soul="${key}"] b`); if (el) { el.textContent = soul; el.parentElement.classList.remove('hit'); void el.offsetWidth; el.parentElement.classList.add('hit'); } },
  spendOrbs(key, unit, amount) { $$(`[data-bank="${key}"] [data-bank-unit="${unit}"] .orb.ready`).slice(-amount).forEach(o => { o.classList.remove('ready'); o.classList.add('spending'); }); },
  shake(amp) { if (!amp || settings.reduceMotion) return; stage.style.setProperty('--shake', `${Math.min(10, amp)}px`); stage.classList.remove('shaking'); void stage.offsetWidth; stage.classList.add('shaking'); },
  async banner(text, key, ms) {
    if (!ms) return;
    const el = document.createElement('div');
    el.className = `banner ${key === viewer() ? 'mine' : ''}`; el.innerHTML = `<span>${esc(text)}</span>`;
    stage.append(el);
    await new Promise(r => setTimeout(r, ms));
    el.remove();
  },
  async callout(text, key, ms) {
    if (!ms) return;
    const el = document.createElement('div');
    el.className = 'callout'; el.innerHTML = `<span>${esc(text)}</span>`;
    stage.append(el);
    await new Promise(r => setTimeout(r, ms));
    el.remove();
  },
  // Carta voando entre dois retângulos (clone do DOM; o estado final aparece no render seguinte).
  async flyCard(uid, from, to, ms, hidden, land) {
    if (!from || !to || !ms || settings.reduceMotion) return;
    const ghost = document.createElement('div');
    ghost.className = 'ghost-card';
    ghost.innerHTML = cardFace(uid, {hidden});
    const w = 120, h = 168;
    Object.assign(ghost.style, {left: `${from.left + from.width / 2 - w / 2}px`, top: `${from.top + from.height / 2 - h / 2}px`});
    document.body.append(ghost);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const anim = ghost.animate([{transform: 'translate(0,0) scale(.9) rotateX(0deg)', opacity: 1},
      {transform: `translate(${dx * .55}px, ${dy * .55 - 40}px) scale(1.12) rotateX(12deg)`, opacity: 1, offset: .6},
      {transform: `translate(${dx}px, ${dy}px) scale(${land ? 1 : .8}) rotateX(0deg)`, opacity: land ? 1 : .2}],
    {duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)'});
    // Aba oculta congela a animação: o relógio de parede garante que a fila não trave.
    await Promise.race([anim.finished.catch(() => {}), new Promise(r => setTimeout(r, ms + 150))]);
    ghost.remove();
  },
  log(e) {
    const n = uid => (uid ? info(uid).name : '');
    const t = {card_played: `${e.player} plays ${n(e.uid)}${e.bearer ? ` on ${n(e.bearer)}` : ''}.`, spell_resolved: `${n(e.uid)} resolves.`, ability: `${e.player} uses ${e.name}.`,
      strike_declared: `${e.player}: ${n(e.attacker)} strikes ${e.target?.kind === 'god' ? `God ${e.target.player}` : n(e.target?.uid)}.`, destroyed: `${n(e.uid)} is destroyed.`,
      pass: `${e.player} passes.`, end_phase: `${e.player} ends the turn.`, equipped: `${n(e.uid)} equipped to ${n(e.bearer)}.`}[e.type];
    if (t) say(t);
  },
};

// Eventos que não passam por log() acima também viram linhas (dano, Soul, turno, compra).
function logEvent(e) {
  const n = uid => (uid && ctx.objects[uid] ? info(uid).name : '');
  const t = {turn_start: `Player ${e.player} begins a turn.`, damage: e.dealt || e.prevented || e.absorbed ? `${n(e.uid)}: ${e.dealt} damage${e.prevented ? `, ${e.prevented} prevented` : ''}${e.absorbed ? `, ${e.absorbed} to Armor` : ''}.` : '',
    soul_lost: `God ${e.player} loses ${e.amount} Soul (${e.soul}).`, base_placed: `${e.player} places a Cosmo Base.`, latent_gained: `${e.player} gains ${e.amount} Latent.`,
    fatigue: `${e.player} suffers Fatigue ${e.amount}.`, mulligan: `${e.player} mulligans ${e.count}.`, victory: e.draw ? 'Draw.' : `Player ${e.winner} wins.`}[e.type];
  if (t) say(t);
}

// ---------- Entrada ----------

boardRoot.addEventListener('click', e => {
  if (director.busy) return director.skip();
  const s = S(), t = e.target;
  const btn = t.closest('button');
  if (btn?.dataset.primary !== undefined) return primary();
  if (btn?.dataset.cancel !== undefined) { mode = null; return render(); }
  if (btn?.dataset.mode) { mode.choice[mode.steps[mode.i].key] = btn.dataset.mode; mode.i++; return advance(); }
  if (btn?.dataset.confirm) { mode.choice[mode.steps[mode.i].key] = btn.dataset.confirm === 'yes'; mode.i++; return advance(); }
  if (btn?.dataset.done !== undefined) return choose(null);
  if (btn?.dataset.toggleLog !== undefined) { logOpen = !logOpen; return render(); }
  if (btn?.dataset.toggleSettings !== undefined) { settingsOpen = !settingsOpen; return render(); }
  const pickEl = t.closest('[data-pick], .pickable');
  if (mode && pickEl) return choose(pickEl.dataset.pick || pickEl.dataset.uid);
  if (mode) return;
  const cardEl = t.closest('.dcard[data-uid]');
  if (!cardEl || cardEl.classList.contains('dcard--back')) return;
  const uid = cardEl.dataset.uid, key = owner(uid), me = viewer();
  if (key !== me) return;
  if (s.players[key].hand.includes(uid)) return handMenu(uid, cardEl);
  if (s.players[key].battlefield.includes(uid)) return fieldMenu(uid, cardEl);
});

// Menu curto quando a carta tem mais de um uso (jogar ou virar Base; Strike ou habilidade).
function quickMenu(anchor, items) {
  closeQuick();
  if (items.length === 1) return items[0][1]();
  const r = anchor.getBoundingClientRect(), menu = document.createElement('div');
  menu.className = 'quick'; menu.style.left = `${r.left + r.width / 2}px`; menu.style.top = `${r.top - 8}px`;
  menu.innerHTML = items.map(([label], i) => `<button data-q="${i}">${esc(label)}</button>`).join('');
  menu.addEventListener('click', ev => { const i = ev.target.closest('[data-q]')?.dataset.q; if (i !== undefined) { closeQuick(); items[i][1](); } });
  document.body.append(menu);
  menu.querySelector('button')?.focus();
}
const closeQuick = () => $$('.quick').forEach(m => m.remove());

function handMenu(uid, el) {
  const key = owner(uid), items = [];
  const reason = playableReason(key, uid);
  if (!reason) items.push([`Play ${info(uid).name}`, () => playFromHand(key, uid)]);
  if (canBase(key, uid)) items.push(['Place as Cosmo Base', () => act(() => placeBase(S(), key, uid, info(uid)))]);
  if (!items.length) return warn(reason || 'Not playable now.');
  quickMenu(el, items);
}
function fieldMenu(uid, el) {
  const s = S(), key = owner(uid), c = info(uid), items = [];
  if (!idleFor(key)) return warn("Wait for your turn's main phase.");
  if (c.kind === 'Devotee') {
    if (strikeTargets(s, ctx, uid).length) items.push(['Strike', () => startStrike(uid)]);
    const ab = ABILITIES[num(uid)];
    if (ab && s.units[uid]?.prepared) items.push([`${ab.name} ({T}, ${ab.cost} Base)`, () => begin('activate', key, uid, STEPS[num(uid)] || [], ch => activate(S(), ctx, key, uid, ch))]);
  } else if (c.kind === 'Equipment' && !ctx.attached[uid]) items.push(['Re-equip', () => begin('reequip', key, uid, [{key: 'bearer', pick: 'devotee', label: 'Re-equip to which Devotee?'}], ch => reequip(S(), ctx, key, uid, ch.bearer))]);
  if (!items.length) return warn(s.units[uid]?.prepared === false ? 'Unprepared: it readies at the start of your turn.' : 'No action available for this card.');
  quickMenu(el, items);
}

overlayRoot.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.mull) { marked.has(btn.dataset.mull) ? marked.delete(btn.dataset.mull) : marked.add(btn.dataset.mull); return render(); }
  if (btn.dataset.primary !== undefined) return primary();
  if (btn.dataset.new !== undefined) return newMatch();
  if (btn.dataset.toggleSettings !== undefined) { settingsOpen = false; return render(); }
});
overlayRoot.addEventListener('change', e => {
  const key = e.target.dataset.setting;
  if (!key) return;
  settings[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? Number(e.target.value) : e.target.value;
  saveSettings();
  if (key === 'quality') scene?.setQuality(settings.quality);
  if (key === 'theme') { scene?.setTheme(settings.theme); stage.dataset.theme = settings.theme; }
  if (key === 'reduceFlashes' && scene) scene.reduceFlashes = settings.reduceFlashes;
  render();
});

// Inspeção: passar o mouse 300 ms sobre uma carta aberta mostra a versão grande com o texto completo.
document.addEventListener('pointerover', e => {
  const el = e.target.closest?.('.dcard[data-uid]:not(.dcard--back)');
  clearTimeout(inspectTimer);
  if (!el) return hideInspect();
  inspectTimer = setTimeout(() => showInspect(el.dataset.uid), 300);
  previewCost(el.dataset.uid);
});
function showInspect(uid) {
  const c = info(uid), box = $('#inspector');
  const lines = c.text.split('\n').slice(2).filter(l => !/^\s*(Rarity|Type|Casting Cost|ATK|HP|Cosmoble)/.test(l));
  box.innerHTML = `${cardFace(uid, {size: 'dcard--xl', field: S().players[owner(uid)].battlefield.includes(uid)})}<div class="inspector__text"><strong>${esc(c.name)}</strong><small>${esc(c.type)}${c.cost ? ` · ${c.cost.amount} ${c.cost.unit === 'base' ? 'Base' : 'Latent'}` : ''}</small>${lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`;
  box.classList.add('show');
}
function hideInspect() { $('#inspector').classList.remove('show'); $$('.orb.preview').forEach(o => o.classList.remove('preview')); }
// Prévia de pagamento: as esferas que esta carta gastaria piscam antes do clique.
function previewCost(uid) {
  $$('.orb.preview').forEach(o => o.classList.remove('preview'));
  const key = owner(uid), c = info(uid);
  if (!S().players[key].hand.includes(uid) || !c.cost || playableReason(key, uid)) return;
  $$(`[data-bank="${key}"] [data-bank-unit="${c.cost.unit}"] .orb.ready`).slice(-c.cost.amount).forEach(o => o.classList.add('preview'));
}

// Arrastar da mão: soltar no campo joga; soltar num Devotee seu escolhe o portador/alvo.
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.hand--me .dcard[data-uid]');
  if (!el || director.busy || mode) return;
  drag = {uid: el.dataset.uid, x: e.clientX, y: e.clientY, el, ghost: null};
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10) return;
  if (!drag.ghost) { drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('dragging'); document.body.append(drag.ghost); drag.el.classList.add('drag-source'); }
  drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`;
});
document.addEventListener('pointerup', e => {
  if (!drag) return;
  const {uid, ghost, el} = drag;
  drag = null;
  if (!ghost) return;
  ghost.remove(); el.classList.remove('drag-source');
  const key = owner(uid), drop = document.elementsFromPoint(e.clientX, e.clientY);
  const onField = drop.some(d => d.dataset?.field === key), onUnit = drop.find(d => d.dataset?.uid && S().players[key].battlefield.includes(d.dataset.uid));
  if (!onField && !onUnit) return;
  const reason = playableReason(key, uid);
  if (reason) return warn(reason);
  playFromHand(key, uid);
  // Se a primeira escolha é um Devotee seu e a carta caiu sobre um, já escolhe.
  if (mode && onUnit && mode.options?.includes(onUnit.dataset.uid)) choose(onUnit.dataset.uid);
});

document.addEventListener('keydown', e => {
  if (e.target.matches?.('input, select, textarea')) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); return primary(); }
  if (e.code === 'Escape') { closeQuick(); if (mode) { mode = null; render(); } else if (settingsOpen || logOpen) { settingsOpen = logOpen = false; render(); } }
  if (e.key === 'l' || e.key === 'L') { logOpen = !logOpen; render(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.quick') && !e.target.closest('.dcard')) closeQuick(); });

// ---------- Partida ----------

function newMatch(seed = Date.now() % 100000) {
  match = createMatch({cards, canonIndex: canonIndex(canon), decks, seed});
  ctx = {cards, objects: match.objects, attached: match.attached, decide};
  logLines = []; mode = null; marked = new Set(); ending = false; seenEvents = 0;
  say(`Seed ${seed}. Player ${match.state.order[0]} goes first.`);
  render();
}
// Perguntas "you may" da engine, síncronas: diálogo do navegador nesta fatia (UX final em GAMEPLAY_UX_SPEC.md).
function decide(player, q) {
  if (q.cards) return confirm(`Player ${player} · Sacred Knowledge\nKeep ${info(q.cards[0]).name} on top?\n(Cancel keeps ${info(q.cards[1]).name} on top.)`) ? q.cards[0] : q.cards[1];
  return confirm(`Player ${player} · ${q.ability}${q.uid ? `\n${info(q.uid).name}` : ''}${q.amount ? ` · ${q.amount} damage incoming` : ''}\nUse it?`);
}

// O log também acompanha eventos que o orquestrador não descreve.
function watchEvents() {
  const s = S();
  for (const e of s.events.slice(watchEvents.seen || 0)) logEvent(e);
  watchEvents.seen = s.events.length;
  requestAnimationFrame(watchEvents);
}

async function init() {
  stage.dataset.theme = settings.theme;
  const [canonData, deckData] = await Promise.all(['../../data/canon/d268.json', '../../data/alpha-0.1/decks-proposta-d171.json'].map(u => fetch(u).then(r => {
    if (!r.ok) throw Error(`Missing ${u}`);
    return r.json();
  })));
  canon = canonData; cards = loadCanon(canon);
  const [rush, fortress] = deckData.decks;
  decks = {A: rush, B: fortress};
  director = createDirector({ui, getFx: () => scene?.fx, settings});
  newMatch(Number(new URLSearchParams(location.search).get("seed")) || undefined);
  requestAnimationFrame(watchEvents);
  scene = await createScene($('#arena'), {quality: settings.quality, theme: settings.theme, reduceFlashes: settings.reduceFlashes});
  stage.classList.toggle('no-webgl', !scene);
  window.__divine = {get state() { return S(); }, get ctx() { return ctx; }, get scene() { return scene; }, settings}; // inspeção no QA
}
init().catch(e => { boardRoot.innerHTML = `<p class="fatal">${esc(e.message)}</p>`; console.error(e); });
