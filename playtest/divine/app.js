// Divine Arena · interface do vertical slice (engine 3.0). HTML para tudo que se lê e se clica; WebGL atrás.
// Fluxo de cada ação: engine muda o estado e registra eventos -> orquestrador dramatiza com o DOM anterior ->
// render() mostra o estado final. Entrada travada durante a animação (Espaço pula).
import {loadCanon} from '../../shared/canon-cards.js';
import {canonIndex} from '../../shared/deck-v3.js';
import {createMatch, mulligan} from '../engine-v3/match.js';
import {startTurn, endTurn, pass, placeBase, spellCategory, runCheckpoint} from '../engine-v3/core.js';
import {declareStrike, strikeTargets} from '../engine-v3/strike.js';
import {playDevotee, playEquipment, playSpell, activate, reequip, duplicateCharacter} from '../engine-v3/play.js';
import {atkOf, hpOf, keywordsOf, gearOf, isSaint, isBronze, ABILITIES} from '../engine-v3/effects.js';
import {STEPS, ABILITY_STEPS} from '../choices-v3.js?v=2';
import {createScene, THEMES} from './scene.js?v=20261028-4';
import {soulMax, ultimateBlock, announceExclamation, exclamationCost, removeJudgment, greatFloodBlock, announceGreatFlood, GREAT_FLOOD_COST} from '../engine-v3/gods.js';
import {createClock, clockStartTurn, clockEndTurn, clockHandTo, clockPause, clockResume, clockRemaining, clockExpired, torchesLit, applyTimeout} from '../engine-v3/clock.js';
import {runDecisions, resume, restore, PendingDecision} from '../engine-v3/decision.js';
import {createDirector} from './director.js?v=3';
import {createAI} from './ai.js?v=1';

const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const stage = $('#stage'), boardRoot = $('#board-root'), overlayRoot = $('#overlay-root'), notice = $('#notice');

// Arte disponível no repositório; o resto usa placeholder com a cor do tipo (contrato em AAA_VISUAL_DIRECTION.md).
const ART_ROOT = '../../CARDS/ATHENA/';
const ART = {'001': 'BRONZE/PEGASUSV1.png', '003': 'BRONZE/DRAGONv1.png', '021': 'SILVER/MARIN.png', '040': 'COMMON/SANCTUARY-GUARD.png',
  '041': 'COMMON/SANCTUMHEALER.png', '042': 'COMMON/CLOTHREPAIRER.png', '043': 'COMMON/STARHILLMONK.png', '048': 'UNCOMMON/LIBRA-SWORD.png', '049': 'UNCOMMON/LIBRA-SHIELD.png'};
const GOD_ART = {'god-athena': '../../CARDS/ATHENA/ATHENA.png', 'god-poseidon': '../../CARDS/POSEIDON/POSEIDON.png'};

// Mensagens da engine (internas, em português) viram texto curto para o jogador.
const WHY = {'G3-005': 'Athena Exclamation needs three Prepared Saints with different identities and enough prepared Bases.', D206: 'Sacrifice exactly three of your Devotees, on your turn.', D1: "It's not your turn.", D4: 'Not enough prepared Cosmo Bases.', custo: 'Not enough Latent Cosmo.', P06: 'Wait for the response window to close.',
  P05: 'A Prepared Guardian must be your target.', D22: 'This Devotee already struck this turn.', P04: 'Only a Prepared Devotee can Strike.',
  D52: 'The match is over.', '§63': 'You already control that character: one Devotee per named character.', P01: 'Finish the mulligan first.', D192: 'It must be Prepared to use {T}.', D191: 'Already used this round.', Equip: 'That Devotee cannot wear it.', alvo: 'Choose a legal target.'};
const why = e => WHY[e.decision] || (e.topic ? `Not in Alpha 0.1: ${e.topic}` : "That can't be done right now.");

const SETTINGS_KEY = 'ssTcgOlympusArena';
const settings = {quality: 'high', theme: 'olympus', godB: 'god-athena', timeouts: false, speed: 'normal', skipDraws: false, reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  reduceFlashes: false, shake: 1, hideOpponent: true, autoPass: true, ai: 'B'};
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* sem armazenamento */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* sem armazenamento */ } };

let canon, cards, decks, match, ctx, scene = null, director, clock;
let mode = null;           // escolha em andamento: {kind, key, uid, steps, i, choice, picked, options, run}
let pending = null;        // decisão pedida pela engine no meio da resolução (decision.js): {pending, snap, answers, run, shown, picked, peek}
let marked = new Set(), logLines = [], logOpen = false, settingsOpen = false, ending = false, inspectTimer, seenEvents = 0, drag = null;

const S = () => match.state;
const info = uid => cards.get(ctx.objects[uid].cardId);
const num = uid => ctx.objects[uid].cardId.slice(-3);
const other = key => S().order.find(k => k !== key);
const owner = uid => ctx.objects[uid].owner;
// Quem está à frente da tela: o jogador que precisa agir agora (hot-seat local).
// A IA está decidindo agora (setup, janela ou turno dela).
const aiControls = () => { const s = S(); return settings.ai !== 'none' && (pending ? pending.pending.player : s.setup ? s.setup[0] : s.window ? s.window.priority : s.active) === settings.ai; };
const human = () => S().order.find(k => k !== settings.ai);
const viewer = () => { const s = S(); if (settings.ai !== 'none') return human(); return pending ? pending.pending.player : s.setup ? s.setup[0] : s.window ? s.window.priority : s.active; };
const say = text => { logLines.push({round: S().round, text}); if (logLines.length > 400) logLines.shift(); };
let noticeTimer;
function warn(text) { notice.textContent = text; notice.classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.classList.remove('show'), 3200); }

// ---------- Legalidade para a interface (a engine continua decidindo ao executar) ----------

const readyBases = key => S().players[key].bases.filter(b => b.prepared).length;
function affordable(key, cost) {
  if (!cost) return true;
  return cost.unit === 'latent' ? S().players[key].latent >= cost.amount : readyBases(key) >= cost.amount;
}
const idleFor = key => { const s = S(); return !pending && !s.victory && !s.setup && !s.window && !s.chain.length && s.active === key; };
// Primeira escolha obrigatória sem candidato (ex.: Spell que pede um Saint aliado sem nenhum em campo).
const PICK_NEED = {saint: 'a friendly Saint', 'ready-saint': 'a Prepared friendly Saint', bronze: 'a friendly Bronze Saint', devotee: 'a friendly Devotee', armor: 'a friendly Armor', enemy: 'an enemy Devotee'};
function missingTarget(key, uid) {
  const step = (STEPS[num(uid)] || []).find(st => st.pick && !st.when);
  return step && !step.optional && !candidates(step, key).length ? `Needs ${PICK_NEED[step.pick] || 'a legal target'}.` : null;
}
function playableReason(key, uid) {
  const s = S(), c = info(uid);
  if (s.victory || s.setup) return 'The match is not running.';
  if (pending) return 'Answer the pending decision first.';
  if (c.kind === 'Spell') {
    const cat = spellCategory(Number(num(uid)));
    if (!cat) return 'This Spell has no approved speed yet.';
    if (cat.speed === 'instant' ? !(s.window ? s.window.priority === key : s.active === key && !s.chain.length) : !idleFor(key)) return cat.speed === 'instant' ? 'You need priority to cast a Moment.' : 'Techniques are cast on your turn, with no response pending.';
    return affordable(key, c.cost) ? missingTarget(key, uid) : `Needs ${c.cost.amount} ${c.cost.unit === 'base' ? 'prepared Base' : 'Latent'} Cosmo.`;
  }
  if (!idleFor(key)) return s.active !== key ? "It's not your turn." : 'Wait for the response window to close.';
  if (c.kind === 'Equipment') {
    const devs = s.players[key].battlefield.filter(u => info(u).kind === 'Devotee');
    if (!devs.length) return 'You need a Devotee to equip.';
    const cheapest = Math.min(...devs.map(d => c.autoEquip.some(n => n.toUpperCase() === info(d).name.toUpperCase()) ? c.cost.amount : c.equip ? c.equip.amount : Infinity));
    return readyBases(key) >= cheapest ? null : `Needs ${cheapest === Infinity ? '—' : cheapest} prepared Base Cosmo.`;
  }
  if (c.kind === 'Devotee' && duplicateCharacter(S(), ctx, key, uid)) return `You already control ${c.name.split(',')[0]}: one Devotee per named character.`;
  return affordable(key, c.cost) ? null : `Needs ${c.cost.amount} prepared Base Cosmo.`;
}
// D4: uma Base Cosmoble por turno, no próprio turno, com a janela fechada. Motivo em texto para o jogador.
function baseReason(key, uid) {
  if (!info(uid).cosmoble) return 'This card is not Cosmoble: it cannot become a Cosmo Base.';
  if (!idleFor(key)) return S().active !== key ? "It's not your turn." : 'Wait for the response window to close.';
  if (S().players[key].baseTurn === S().turn) return 'You already placed a Cosmo Base this turn.';
  return null;
}
const canBase = (key, uid) => !baseReason(key, uid);
// A Base nova entra Unprepared (D4: Bases preparam no início do turno); o aviso explica por que o hexágono não sobe agora.
function placeAsBase(key, uid) {
  const reason = baseReason(key, uid);
  if (reason) return warn(reason);
  act(() => placeBase(S(), key, uid, info(uid)));
  warn('Cosmo Base placed. It is ready to pay costs now.');
}
// Há resposta possível? (Auto-pass só passa quando não há nenhum Moment jogável na mão.)
const hasResponse = key => S().players[key].hand.some(u => info(u).kind === 'Spell' && spellCategory(Number(num(u)))?.speed === 'instant' && !playableReason(key, u));

// ---------- Execução de ações ----------

// A ação e os avanços automáticos rodam dentro do protocolo de decisão: pergunta da engine sem resposta suspende tudo
// no ponto da pergunta (modal), e a resposta continua do mesmo snapshot (decision.js), sem repetir custo nem gatilho.
async function act(fn) {
  if (director.busy || pending) return;
  const s = S(), from = s.events.length, wasEnding = ending;
  const run = () => {
    ending = wasEnding;
    fn();
    try { autoAdvance(); } catch (e) { if (e instanceof PendingDecision) throw e; warn(why(e)); }
  };
  let r;
  try { r = runDecisions(s, ctx, run); } catch (e) { ending = wasEnding; warn(why(e)); console.debug(e); render(); return; }
  return present(r, run, from);
}
// Avança o que não precisa de escolha: início do turno seguinte e passes automáticos.
function autoAdvance() {
  const s = S();
  for (let guard = 0; guard < 60; guard++) {
    if (ending && !s.window && !s.victory) { ending = false; startTurn(s); continue; }
    if (settings.autoPass && s.window && !s.victory && !hasResponse(s.window.priority)) { pass(s, s.window.priority); continue; }
    break;
  }
}
// Mostra só os eventos ainda não animados (o replay repete o prefixo já visto, idêntico) e, se houver pergunta, abre o modal.
async function present(r, run, from) {
  const s = S(), shown = pending && pending.shown <= s.events.length ? pending.shown : from;
  pending = r.pending ? {...r, run, shown: s.events.length, picked: [], peek: false} : null;
  const events = s.events.slice(shown);
  seenEvents = s.events.length;
  syncClock(events);
  render.lock = true;
  clockPause(clock, now()); // G3-025: animação não gasta tempo de decisão
  await director.play(events);
  clockResume(clock, now());
  render.lock = false;
  if (pending) clockHandTo(clock, pending.pending.player, now()); // G3-026: a decisão usa o relógio de quem decide
  render();
  focusDecision();
}
// Resposta à decisão pendente: {value} ou {timeout: true}. Resposta recusada pela engine volta ao ponto da pergunta.
function reply(answer) {
  if (!pending || director.busy) return;
  const p = pending, s = S();
  let r;
  try { r = resume(s, ctx, p.run, p, answer); } catch (e) {
    warn(why(e)); console.debug(e);
    restore(s, ctx, p.snap);
    runDecisions(s, ctx, p.run, p.answers, p.snap);
    return render();
  }
  return present(r, p.run, p.shown);
}

function begin(kind, key, uid, steps, run) {
  mode = {kind, key, uid, steps, i: 0, choice: {}, picked: [], run};
  advance();
}
function advance() {
  while (mode && mode.i < mode.steps.length) {
    const step = mode.steps[mode.i];
    if (step.when && !step.when(mode.choice)) { mode.i++; continue; }
    // Escolha obrigatória sem nenhum candidato: avisa e cancela em vez de travar a barra de escolha.
    if (step.pick && !step.optional && !mode.picked.length && !candidates(step, mode.key).length) {
      mode = null;
      warn('No legal choice for that right now.');
      return render();
    }
    if (step.confirm) return render(); // pergunta sim/não na barra de escolha
    return render();
  }
  if (!mode) return render();
  const {run, choice} = mode;
  mode = null;
  $$('.choice, .pickable').forEach(el => (el.classList.contains('choice') ? el.remove() : el.classList.remove('pickable')));
  act(() => run(choice));
}

function candidates(step, key) {
  const s = S(), field = s.players[key].battlefield, devs = field.filter(u => info(u).kind === 'Devotee');
  switch (step.pick) {
    case 'saint': return devs.filter(u => isSaint(ctx, u));
    case 'ready-saint': return devs.filter(u => isSaint(ctx, u) && s.units[u]?.prepared);
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
  if (pending) return focusDecision();
  if (mode) {
    const step = mode.steps[mode.i];
    if (step?.multi || step?.optional) return choose(null);
    return;
  }
  if (s.victory) return;
  if (aiControls()) return; // vez da IA: o botão não age por ela
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

// ---------- Poderes divinos ----------

function godMenu(key, el) {
  const s = S(), d = s.divine[key], items = [];
  if (key !== viewer() || s.victory || s.setup) return;
  if (!ultimateBlock(s, ctx, key)) items.push(['Athena Exclamation · Ultimate', () => startExclamation(key)]);
  if (!greatFloodBlock(s, key)) items.push([`Great Flood · Ultimate (${GREAT_FLOOD_COST} Base)`, () => act(() => announceGreatFlood(S(), ctx, key))]);
  if (d.judgment && idleFor(key)) items.push(['Remove Divine Judgment (sacrifice 3)', () => begin('judgment', key, null,
    [{key: 'devotees', pick: 'devotee', multi: 3, label: 'Sacrifice exactly three Devotees you control'}], ch => removeJudgment(S(), ctx, key, ch.devotees))]);
  if (!items.length) {
    const block = d.god === 'god-poseidon' ? greatFloodBlock(s, key) : ultimateBlock(s, ctx, key);
    const why = {used: 'Ultimate already used this match.', sorcery: 'Ultimate: your turn, with no response pending.', cost: `Great Flood needs ${GREAT_FLOOD_COST} prepared Bases.`, 'only-athena': 'No Ultimate available.'}[block];
    return warn(why || 'No divine action available now.');
  }
  quickMenu(el, items);
}

function startExclamation(key) {
  begin('ultimate', key, null, [{key: 'saints', pick: 'ready-saint', multi: 3, label: 'Choose three Prepared Saints with different identities (cost 5 +3 Bronze +2 Silver)'}], ch => {
    if ((ch.saints || []).length !== 3) throw Object.assign(new Error('saints'), {decision: 'G3-005'});
    announceExclamation(S(), ctx, key, ch.saints);
  });
  mode.title = 'ATHENA EXCLAMATION';
  render();
}

// ---------- Relógio competitivo (G3-024..028) ----------

const now = () => performance.now() / 1000;
function syncClock(events) {
  const s = S();
  for (const e of events) {
    if (e.type === 'end_phase') clockEndTurn(clock, e.player, now());
    if (e.type === 'turn_start') clockStartTurn(clock, e.player, now());
  }
  // Quem decide agora tem o relógio correndo, inclusive na janela da End Phase depois do END TURN (G3-026/031).
  if (s.victory || s.setup || !s.turn) return;
  clockHandTo(clock, s.window ? s.window.priority : s.active, now());
}
function updateClock() {
  const box = $('[data-clock]');
  if (!box || !clock) return;
  const key = clock.running?.key, r = key ? clockRemaining(clock, key, now()) : {total: 0, basic: 0};
  const lit = torchesLit(r.total);
  $$('.torch', box).forEach((t, i) => t.classList.toggle('lit', i < lit));
  box.classList.toggle('urgent', !!key && r.total <= 20);
  const t = Math.max(0, Math.ceil(r.total)), time = $('[data-clock-time]'), label = $('[data-clock-label]');
  if (time) time.textContent = key ? `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` : '--:--';
  if (label) label.textContent = !key ? 'Clock' : r.basic > 0 ? `Turn · ${key}` : `Reserve · ${key}`;
  const dc = $('[data-decision-clock]');
  if (dc && key) { dc.textContent = `${t}s left`; dc.classList.toggle('urgent', r.total <= 20); }
}
// Timeout (desligado por padrão no playtest local; Settings ou ?timeouts=1 ligam). G3-027: escolha opcional pendente →
// TIMEOUT_DECLINED; obrigatória → TIMEOUT_AUTO_CHOICE (G3-030, na engine); janela → TIMEOUT_PASS_PRIORITY; fase de
// ações → TIMEOUT_END_TURN. Uma escolha de alvo começada pela interface (mode) não é decisão da engine: é cancelada e
// o timeout da janela ou do turno vale. Fechar o modal (View board) não é timeout.
function tickClock() {
  updateClock();
  const s = S(), key = clock && !clock.paused && clockExpired(clock, now());
  if (!settings.timeouts || !key || director.busy || s.victory || s.setup) return;
  if (pending) { if (pending.pending.player === key) reply({timeout: true}); return; }
  if (mode) { mode = null; closeQuick(); }
  act(() => { if (applyTimeout(S(), key) === 'TIMEOUT_END_TURN') ending = true; });
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
    ${unit?.seal ? `<i class="dcard__seal" title="${unit.seal} Seal counter${unit.seal > 1 ? 's' : ''}: each Prepare removes one instead">◈${unit.seal}</i>` : ''}
  </div>`;
}

// Medidor de Cosmo (coluna esquerda da referência): hexágono com Bases preparadas, pips de Base e chamas de Latent.
function cosmoGauge(key, side) {
  const p = S().players[key], ready = readyBases(key);
  const base = p.bases.map(b => `<i class="orb orb--base ${b.prepared ? 'ready' : 'spent'}"></i>`).join('');
  const latent = [0, 1, 2].map(i => `<i class="orb orb--latent flame ${i < p.latent ? 'ready' : 'empty'}"></i>`).join('');
  return `<div class="cosmo cosmo--${side}" data-bank="${key}" aria-label="Player ${key} Cosmo: ${ready} of ${p.bases.length} Base prepared, ${p.latent} of 3 Latent">
    <div class="cosmo__hex" data-bank-unit="base" title="Prepared Cosmo Base / total"><b>${ready}</b><small>/${p.bases.length}</small><span class="cosmo__pips">${base}</span></div>
    <div class="cosmo__flames" data-bank-unit="latent" title="Latent Cosmo (max 3)">${latent}</div></div>`;
}

// Retrato do God (cantos esquerdos da referência): nome, Soul com coração, escudo de Awaken, barra de Soul,
// selos de Ultimate e Divine Judgment. O seu abre o menu dos poderes divinos.
function godHud(key, side) {
  const s = S(), p = s.players[key], d = s.divine[key], god = cards.get(s.gods[key]);
  const pick = mode?.options?.includes(`god:${key}`), max = soulMax(s, key);
  const ult = d.ultimateUsed ? 'used' : ['god-athena', 'god-poseidon'].includes(d.god) ? 'ready' : 'none';
  return `<section class="godhud godhud--${side} ${pick ? 'pickable' : ''} ${s.active === key ? 'is-active' : ''} ${d.awaken ? 'is-awaken' : ''}" data-god="${key}"
      ${pick ? `data-pick="god:${key}"` : ''} role="button" tabindex="0" aria-label="${esc(god.name)}, Soul ${p.soul} of ${max}${d.awaken ? ', Awaken' : ''}">
    <div class="godhud__portrait" style="background-image:url('${GOD_ART[s.gods[key]] || ''}')"></div>
    <div class="godhud__body">
      <strong class="godhud__name">${esc(god.name[0] + god.name.slice(1).toLowerCase())}</strong>
      <div class="godhud__row">
        <span class="godhud__soul" data-soul="${key}"><i class="heart" aria-hidden="true"></i><b>${p.soul}</b></span>
        <span class="godhud__awaken" title="Awaken ${d.awakenAt}: active while Soul ≤ ${d.awakenAt}">${d.awakenAt}</span>
        ${ult !== 'none' ? `<span class="godhud__ult ${ult}" title="Ultimate ${ult === 'used' ? 'used' : 'available once per match'}">U</span>` : ''}
        ${d.judgment ? `<span class="godhud__judgment" title="Divine Judgment: loses at the end of Round ${d.judgment.deadline}">⚖ R${d.judgment.deadline}</span>` : ''}
      </div>
      <span class="godhud__bar"><i style="width:${Math.round(p.soul / max * 100)}%"></i></span>
    </div></section>`;
}

function piles(key, side) {
  const p = S().players[key];
  return `<div class="piles piles--${side}"><span class="pile" data-deck="${key}" title="Deck"><i class="ico-deck"></i>${p.deck.length}</span><span class="pile" title="Tartarus"><i class="ico-tartarus"></i>${p.tartarus.length}</span>${p.fatigue ? `<span class="pile pile--fatigue" title="Fatigue">F${p.fatigue}</span>` : ''}</div>`;
}

// Bases de Cosmo como terrenos: cartas de face para cima numa faixa do lado do dono; Base gasta fica deitada (tapped)
// e levanta quando prepara. O pagamento escolhe as Bases sozinho (são equivalentes); a animação mostra quais viraram.
const laneSeen = new Map(); // uid da Base -> prepared no último render (para animar só a mudança)
function cosmoLane(key, side) {
  const bases = S().players[key].bases;
  const slots = bases.map(b => {
    const was = laneSeen.get(b.uid), anim = was === undefined ? 'is-new' : was !== b.prepared ? (b.prepared ? 'is-untapping' : 'is-tapping') : '';
    laneSeen.set(b.uid, b.prepared);
    const face = ctx.objects[b.uid] ? cardFace(b.uid, {size: 'dcard--land'}) : '<div class="dcard dcard--back dcard--land"><span></span></div>';
    return `<div class="lane__base ${b.prepared ? '' : 'tapped'} ${anim}" title="${b.prepared ? 'Prepared Cosmo Base: taps to pay a cost' : 'Tapped Cosmo Base: readies at the start of your turn'}">${face}</div>`;
  }).join('');
  return `<section class="lane lane--${side}" data-lane="${key}" style="--n:${bases.length}" aria-label="Player ${key} Cosmo Bases">${slots || '<p class="lane__empty">Cosmo Bases</p>'}</section>`;
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

// Comando (canto inferior direito): relógio das Doze Casas acima do botão de ações.
function command() {
  const s = S(), v = viewer();
  let label = 'End Turn';
  if (s.victory) label = 'Match over';
  else if (aiControls()) label = 'Opponent thinking…';
  else if (s.setup) label = marked.size ? `Return ${marked.size}` : 'Keep Hand';
  else if (s.window) label = s.chain.length ? 'Pass · Resolve' : 'Pass';
  // Cadeia de cima para baixo: o topo resolve primeiro (LIFO, D186); gatilhos simultâneos entram em APNAP (D187).
  // A ordem entre gatilhos simultâneos do mesmo jogador ainda não é escolha dele (GODS-3.0-SUPPLEMENT, pendência 5).
  const chain = s.chain.length ? `<ol class="chain" aria-label="Chain, top resolves first">${s.chain.map((c, i) => `<li><b>${i + 1}</b> ${esc(c.ability || (c.uid && ctx.objects[c.uid] ? info(c.uid).name : 'Triggered ability'))} <small>Player ${c.controller}</small></li>`).reverse().join('')}</ol>
    <small class="chain__hint">${s.chain.length > 1 ? 'Top resolves first' : 'Resolves when both pass'}</small>` : '';
  return `<aside class="command" aria-label="Turn actions">
    ${s.window ? `<div class="priority"><small>Priority</small><strong>Player ${s.window.priority}</strong>${chain}</div>` : ''}
    <div class="command__clock">${clockMarkup()}</div>
    <button class="action-btn" data-primary ${s.victory || aiControls() ? 'disabled' : ''}><span>${esc(label)}</span><i aria-hidden="true">›</i></button>
    <div class="command__tools"><button data-toggle-log aria-pressed="${logOpen}">Log</button><button data-toggle-settings>Settings</button><a href="../alpha3.html">Debug</a></div>
  </aside>`;
}

// Relógio das Doze Casas: 12 tochas de 60 s; acesas = tempo restante de quem decide (mapeamento G3-028).
const SIGNS = '♈♉♊♋♌♍♎♏♐♑♒♓';
function clockMarkup() {
  const torches = Array.from({length: 12}, (_, i) => {
    const a = (i / 12) * 360 - 90;
    return `<i class="torch" data-torch="${i}" style="--a:${a}deg"><span></span></i>`;
  }).join('');
  const glyphs = [...SIGNS].map((g, i) => `<b style="--a:${(i + .5) / 12 * 360 - 90}deg">${g}&#xFE0E;</b>`).join('');
  return `<div class="zclock" data-clock role="timer" aria-live="off"><div class="zclock__dial">${glyphs}</div>${torches}</div>
    <div class="zclock__time"><b data-clock-time>--:--</b><small data-clock-label>Turn</small></div>`;
}

function choiceBar() {
  if (!mode) return '';
  const step = mode.steps[mode.i];
  const name = mode.title || (mode.uid ? info(mode.uid).name : '');
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
  if (pending && !s.victory && pending.pending.player !== settings.ai) html += decisionModal();
  if (logOpen) html += `<div class="drawer log" aria-label="Match log"><h3>Match log</h3>${logLines.slice(-150).reverse().map(l => `<p><small>R${l.round}</small> ${esc(l.text)}</p>`).join('')}</div>`;
  if (settingsOpen) {
    const sel = (key, opts) => `<select data-setting="${key}">${Object.entries(opts).map(([v, l]) => `<option value="${v}" ${settings[key] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const chk = (key, l) => `<label class="set"><span>${l}</span><input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''}></label>`;
    html += `<div class="drawer settings" role="dialog" aria-label="Settings"><h3>Settings</h3>
      <label class="set"><span>Graphics</span>${sel('quality', {low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra'})}</label>
      <label class="set"><span>Arena</span>${sel('theme', Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.label])))}</label>
      <label class="set"><span>God of Player B (new match)</span>${sel('godB', {'god-athena': 'Athena', 'god-poseidon': 'Poseidon · fixture deck'})}</label>
      <label class="set"><span>Opponent (new match)</span>${sel('ai', {B: 'AI plays Player B', none: 'Hot-seat (two humans)'})}</label>
      <label class="set"><span>Animation speed</span>${sel('speed', {fast: 'Fast', normal: 'Normal', cinematic: 'Cinematic'})}</label>
      ${chk('autoPass', 'Auto-pass when you have no response')}${chk('skipDraws', 'Skip draw animations')}${chk('reduceMotion', 'Reduce motion')}${chk('reduceFlashes', 'Reduce flashes')}${chk('hideOpponent', 'Hide the other hand (hot-seat)')}${chk('timeouts', 'Apply clock timeouts')}
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
    <div class="olympus ${mode ? 'is-choosing' : ''} ${pending ? 'is-deciding' : ''}" ${pending && !pending.peek ? 'inert' : ''}>
      ${godHud(them, 'opp')}${cosmoGauge(them, 'opp')}${piles(them, 'opp')}
      ${handRow(them, settings.hideOpponent || settings.ai === them)}
      <main class="arena-field">${cosmoLane(them, 'opp')}${fieldRow(them)}<div class="midline"><span>${esc(phaseText())}</span></div>${fieldRow(me)}${cosmoLane(me, 'me')}</main>
      ${cosmoGauge(me, 'me')}${godHud(me, 'me')}${piles(me, 'me')}
      ${handRow(me, false)}
      ${command()}
    </div>${choiceBar()}`;
  if (drag?.ghost) showDragZones(drag.uid); // re-render no meio do arraste não apaga as zonas
  const focused = document.activeElement?.closest?.('.decision [data-focus]')?.dataset.focus;
  overlayRoot.innerHTML = overlays();
  if (focused) $(`.decision [data-focus="${CSS.escape(focused)}"]`)?.focus();
  for (const uid of mode?.options || []) $$(`[data-uid="${uid}"]`).forEach(el => el.classList.add('pickable'));
  if (mode) $$('.dcard').forEach(el => { if (!el.classList.contains('pickable') && el.closest('.field')) el.classList.add('dimmed'); });
  if (scene) { const st = $('[data-stats]'); if (st) st.textContent = `WebGL on · ${JSON.stringify(scene.stats())}`; }
  updateClock();
}

// ---------- Adaptador do DOM para o orquestrador ----------

const rectOf = el => (el ? el.getBoundingClientRect() : null);
const ui = {
  number: num, type: uid => info(uid).type, enemyOf: key => other(key),
  cinematic(on) { stage.classList.toggle('cinematic', on); },
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
      strike_declared: `${e.player}: ${n(e.attacker)} strikes ${e.target?.kind === 'god' ? `God ${e.target.player}` : n(e.target?.uid)}.`, strike_fizzled: `${n(e.attacker)}'s Strike fizzles: attacker or target left the battlefield.`, destroyed: `${n(e.uid)} is destroyed.`, unique_removed: `${n(e.uid)} goes to the Tartarus: only one version of a character (not destroyed).`,
      pass: `${e.player} passes.`, end_phase: `${e.player} ends the turn.`, equipped: `${n(e.uid)} equipped to ${n(e.bearer)}.`}[e.type];
    if (t) say(t);
  },
};

// Eventos que não passam por log() acima também viram linhas (dano, Soul, turno, compra).
function logEvent(e) {
  const n = uid => (uid && ctx.objects[uid] ? info(uid).name : '');
  const t = {turn_start: `Player ${e.player} begins a turn.`, damage: e.dealt || e.prevented || e.absorbed ? `${n(e.uid)}: ${e.dealt} damage${e.prevented ? `, ${e.prevented} prevented` : ''}${e.absorbed ? `, ${e.absorbed} to Armor` : ''}.` : '',
    soul_lost: `God ${e.player} loses ${e.amount} Soul (${e.soul}).`, base_placed: `${e.player} places a Cosmo Base.`, latent_gained: `${e.player} gains ${e.amount} Latent.`,
    fatigue: `${e.player} suffers Fatigue ${e.amount}.`,
    awaken_changed: `God ${e.player} ${e.awaken ? 'AWAKENS' : 'leaves Awaken'} (Soul ${e.soul}).`, divine_power: `God ${e.player}: ${e.ability}.`,
    defeat_prevented: `${n(e.uid)} survives with 1 HP (${e.ability}).`, ultimate_announced: `${e.player} announces ${e.ability} (paid ${e.cost} Base).`,
    ultimate_resolved: e.loss === undefined ? `${e.ability} resolves.` : `${e.ability}: God loses ${e.loss} Soul.`, ultimate_failed: `${e.ability} fails: a chosen Saint is no longer valid. Cost not refunded.`,
    judgment_placed: `Divine Judgment on God ${e.player}: loses at the end of Round ${e.deadline}.`, judgment_removed: `Divine Judgment removed from God ${e.player}.`,
    soul_gained: `God ${e.player} recovers ${e.amount} Soul.`,
    seal_added: `${n(e.uid)} gets ${e.added} Seal (${e.counters} total).`, seal_removed: `${n(e.uid)} stays Unprepared: 1 Seal removed (${e.counters} left).`,
    seal_failed: `${e.source}: paid, but the Devotee is gone. No Seal.`, divine_power_declined: `God ${e.player} declines ${e.ability}.`,
    mill: `${e.player} mills ${e.moved}${e.moved < e.requested ? ` of ${e.requested}` : ''}.`, discarded: `${e.player} discards ${e.uids?.length}.`,
    base_returned: `${e.player}: a Cosmo Base returns to hand.`, returned_to_hand: `${e.ability}: ${e.uids?.length} cards return to their owners' hands.`,
    TIMEOUT_AUTO_CHOICE: `TIMEOUT_AUTO_CHOICE (Player ${e.player}): ${e.result?.map(n).join(', ') || 'nothing'}.`, TIMEOUT_DECLINED: `TIMEOUT_DECLINED (Player ${e.player}): ${e.ability}.`,
    TIMEOUT_PASS_PRIORITY: `TIMEOUT_PASS_PRIORITY (Player ${e.player}).`, TIMEOUT_END_TURN: `TIMEOUT_END_TURN (Player ${e.player}).`, mulligan: `${e.player} mulligans ${e.count}.`, victory: e.draw ? 'Draw.' : `Player ${e.winner} wins.`}[e.type];
  if (t) say(t);
}

// ---------- Entrada ----------

boardRoot.addEventListener('click', e => {
  if (director.busy) return director.skip();
  if (pending) return focusDecision();
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
  const godEl = t.closest('[data-god]');
  if (godEl) return godMenu(godEl.dataset.god, godEl);
  const cardEl = t.closest('.dcard[data-uid]');
  if (!cardEl || cardEl.classList.contains('dcard--back')) return;
  const uid = cardEl.dataset.uid, key = owner(uid), me = viewer();
  if (key !== me) return;
  if (s.players[key].hand.includes(uid)) return handMenu(uid, cardEl);
  if (s.players[key].battlefield.includes(uid)) return fieldMenu(uid, cardEl);
});

// Menu curto quando a carta tem mais de um uso (jogar ou virar Base; Strike ou habilidade).
function quickMenu(anchor, items, {always = false} = {}) {
  closeQuick();
  if (items.length === 1 && !always) return items[0][1]();
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
  if (canBase(key, uid)) items.push(['Place as Cosmo Base', () => placeAsBase(key, uid)]);
  if (!items.length) return warn(reason || 'Not playable now.');
  quickMenu(el, items, {always: true}); // carta da mão nunca sai sem o jogador escolher o que fazer
}
// Área de Cosmo do jogador (hexágono e chamas) como alvo de soltar.
const bankAt = (key, x, y) => document.elementsFromPoint(x, y).some(d => d.closest?.(`[data-bank="${key}"], [data-lane="${key}"]`));
function markBank(key, uid, x, y) {
  const bank = $(`[data-bank="${key}"]`);
  if (!bank) return;
  bank.classList.toggle('drop-target', canBase(key, uid));
  bank.classList.toggle('drop-hover', canBase(key, uid) && bankAt(key, x, y));
}
function fieldMenu(uid, el) {
  const s = S(), key = owner(uid), c = info(uid), items = [];
  if (!idleFor(key)) return warn("Wait for your turn's main phase.");
  if (c.kind === 'Devotee') {
    if (strikeTargets(s, ctx, uid).length) items.push(['Strike', () => startStrike(uid)]);
    const ab = ABILITIES[num(uid)];
    if (ab && s.units[uid]?.prepared) items.push([`${ab.name} ({T}, ${ab.cost} Base)`, () => begin('activate', key, uid, ABILITY_STEPS[num(uid)] || [], ch => activate(S(), ctx, key, uid, ch))]);
  } else if (c.kind === 'Equipment' && !ctx.attached[uid]) items.push(['Re-equip', () => begin('reequip', key, uid, [{key: 'bearer', pick: 'devotee', label: 'Re-equip to which Devotee?'}], ch => reequip(S(), ctx, key, uid, ch.bearer))]);
  if (!items.length) return warn(s.units[uid]?.prepared === false ? 'Unprepared: it readies at the start of your turn.' : 'No action available for this card.');
  quickMenu(el, items);
}

overlayRoot.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.closest('.decision, .decision-pill')) return decisionClick(btn);
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
  if (key === 'godB' || key === 'ai') { settingsOpen = false; return newMatch(); }
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

// Campo dividido durante o arraste (como no sistema anterior): metade de cima CAST (jogar), metade de baixo COSMO BASE.
// A zona só acende se a ação for possível agora; a engine ainda decide ao soltar.
function showDragZones(uid) {
  const key = owner(uid), field = $('.arena-field');
  if (!field) return;
  const cast = !playableReason(key, uid), cosmo = canBase(key, uid);
  field.insertAdjacentHTML('beforeend', `<div class="drag-zones" aria-hidden="true">
    <div class="drag-zone drag-zone--cast ${cast ? '' : 'is-off'}"><strong>CAST</strong><small>${cast ? 'Release to cast as Devotee, Armor or effect' : esc(playableReason(key, uid))}</small></div>
    <div class="drag-zone drag-zone--cosmo ${cosmo ? '' : 'is-off'}"><strong>COSMO BASE</strong><small>${cosmo ? 'Release to set as Cosmo Base' : esc(baseReason(key, uid))}</small></div></div>`);
  $('.olympus')?.classList.add('is-dragging');
}
function hideDragZones() {
  $('.drag-zones')?.remove();
  $('.olympus')?.classList.remove('is-dragging', 'is-over-cast', 'is-over-cosmo');
}
// Zona sob o cursor: 'cast', 'cosmo' ou null (fora do campo ou ação impossível).
function dragZoneAt(uid, x, y) {
  const r = $('.arena-field')?.getBoundingClientRect(), key = owner(uid);
  if (!r || x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  const overUnit = document.elementsFromPoint(x, y).some(d => d.dataset?.uid && S().players[key].battlefield.includes(d.dataset.uid));
  if (y < r.top + r.height / 2 || overUnit) return playableReason(key, uid) ? (overUnit && canBase(key, uid) ? 'cosmo' : null) : 'cast';
  return canBase(key, uid) ? 'cosmo' : null;
}
// Arrastar da mão: soltar no campo joga; soltar num Devotee seu escolhe o portador/alvo; soltar na área de Cosmo vira Base.
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.hand--me .dcard[data-uid]');
  if (!el || director.busy || mode) return;
  drag = {uid: el.dataset.uid, x: e.clientX, y: e.clientY, el, ghost: null};
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10) return;
  if (!drag.ghost) { drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('dragging'); document.body.append(drag.ghost); drag.el.classList.add('drag-source'); showDragZones(drag.uid); }
  drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`;
  markBank(owner(drag.uid), drag.uid, e.clientX, e.clientY);
  const zone = dragZoneAt(drag.uid, e.clientX, e.clientY), board = $('.olympus');
  board?.classList.toggle('is-over-cast', zone === 'cast');
  board?.classList.toggle('is-over-cosmo', zone === 'cosmo');
});
// Cancela o arraste sem ação (Esc, pointercancel do navegador, janela perde o foco): a carta volta para a mão.
function cancelDrag() {
  if (!drag) return;
  drag.ghost?.remove(); drag.el.classList.remove('drag-source');
  $$('.cosmo.drop-target, .cosmo.drop-hover').forEach(b => b.classList.remove('drop-target', 'drop-hover'));
  drag = null;
  hideDragZones();
}
document.addEventListener('pointercancel', cancelDrag);
window.addEventListener('blur', cancelDrag);
document.addEventListener('dragstart', e => { if (e.target.closest?.('.hand--me')) e.preventDefault(); }); // sem arraste nativo de texto/imagem
document.addEventListener('pointerup', e => {
  if (!drag) return;
  const {uid, ghost, el} = drag;
  drag = null;
  if (!ghost) return;
  ghost.remove(); el.classList.remove('drag-source');
  $$('.cosmo.drop-target, .cosmo.drop-hover').forEach(b => b.classList.remove('drop-target', 'drop-hover'));
  const zone = dragZoneAt(uid, e.clientX, e.clientY);
  hideDragZones();
  const key = owner(uid), drop = document.elementsFromPoint(e.clientX, e.clientY);
  const onUnit = drop.find(d => d.dataset?.uid && S().players[key].battlefield.includes(d.dataset.uid));
  // Área de Cosmo ou metade COSMO vira Base; sobre um Devotee seu com a carta jogável, vale o portador/alvo.
  if (bankAt(key, e.clientX, e.clientY) || (zone === 'cosmo' && !(onUnit && !playableReason(key, uid)))) return placeAsBase(key, uid);
  const onField = zone === 'cast' || drop.some(d => d.dataset?.field === key);
  if (!onField && !onUnit) return;
  const reason = playableReason(key, uid);
  if (reason) return warn(reason);
  playFromHand(key, uid);
  // Se a primeira escolha é um Devotee seu e a carta caiu sobre um, já escolhe.
  if (mode && onUnit && mode.options?.includes(onUnit.dataset.uid)) choose(onUnit.dataset.uid);
});

document.addEventListener('keydown', e => {
  if (e.target.matches?.('input, select, textarea')) return;
  if (pending && !director.busy) return decisionKey(e);
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); return primary(); }
  if (e.code === 'Escape') { closeQuick(); cancelDrag(); if (mode) { mode = null; render(); } else if (settingsOpen || logOpen) { settingsOpen = logOpen = false; render(); } }
  if (e.key === 'l' || e.key === 'L') { logOpen = !logOpen; render(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.quick') && !e.target.closest('.dcard')) closeQuick(); });

// ---------- Partida ----------

function newMatch(seed = Date.now() % 100000, first) {
  // Poseidon V6 não tem cartas canônicas: o God Poseidon pilota o deck Athena V6 do jogador B, como FIXTURE rotulada.
  match = createMatch({cards, canonIndex: canonIndex(canon), decks, gods: {A: 'god-athena', B: settings.godB}, seed, first});
  ctx = {cards, objects: match.objects, attached: match.attached}; // ctx.decide vem do protocolo de decisão (act)
  logLines = []; mode = null; pending = null; marked = new Set(); ending = false; seenEvents = 0;
  clock = createClock(match.state.order);
  say(`Seed ${seed}. Player ${match.state.order[0]} goes first.`);
  $('.fixture-tag')?.remove();
  if (settings.godB === 'god-poseidon') {
    const tag = document.createElement('div');
    tag.className = 'demo-tag fixture-tag'; tag.textContent = 'Fixture · Poseidon with an Athena V6 deck — not an official deck';
    stage.append(tag);
    say('FIXTURE: God Poseidon (canonical) pilots the Dragon Fortress Athena V6 deck. Poseidon V6 has no canonical cards yet.');
  }
  render();
}
// Fixture de demonstração (?demo=ultimate), identificada na tela: partida avançada com cartas do catálogo validado,
// sem tocar em regra — só posiciona objetos que uma partida real poderia ter (Round 7, 13 Bases, três Saints Prepared).
// ?demo=water-prison / ?demo=great-flood: mesma ideia com God Poseidon (Awaken, 3 Latent, 8 Bases) no lado B.
function applyDemo(kind) {
  if (kind === 'water-prison' || kind === 'great-flood') return poseidonDemo(kind);
  if (kind !== 'ultimate') return;
  const s = S();
  s.setup = null;
  const take = (key, id) => { const p = s.players[key], uid = [...p.deck, ...p.hand].find(u => u.includes(`:${id}:`)); for (const z of ['deck', 'hand']) { const i = p[z].indexOf(uid); if (i >= 0) p[z].splice(i, 1); } return uid; };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0, entered: 0}; return uid; };
  startTurn(s);
  ['001', '028', '021'].forEach(id => field('A', id));
  ['003', '040', '011'].forEach(id => field('B', id));
  for (const key of ['A', 'B']) {
    const p = s.players[key], n = key === 'A' ? 13 : 8;
    p.bases = p.deck.splice(-n).map(uid => ({uid, prepared: true}));
    while (p.hand.length < 5) p.hand.push(p.deck.shift());
  }
  s.players.A.soul = 5; s.players.B.soul = 21; s.players.A.latent = 3;
  s.round = 7; s.turn = 13; s.players.A.ownTurns = 7; s.players.B.ownTurns = 6;
  runCheckpoint(s);
  clockStartTurn(clock, s.active, now());
  const tag = document.createElement('div');
  tag.className = 'demo-tag'; tag.textContent = 'Demo fixture · Round 7';
  stage.append(tag);
  say('DEMO FIXTURE: Round 7, Player A with 13 prepared Bases and Seiya, Jabu and Marin. Click your God to announce Athena Exclamation.');
}

function poseidonDemo(kind) {
  const s = S();
  if (s.gods.B !== 'god-poseidon') return;
  s.setup = null;
  const take = (key, id) => { const p = s.players[key], uid = [...p.deck, ...p.hand].find(u => u.includes(`:${id}:`)); for (const z of ['deck', 'hand']) { const i = p[z].indexOf(uid); if (i >= 0) p[z].splice(i, 1); } return uid; };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0, entered: 0}; return uid; };
  ['001', '028', '021'].forEach(id => field('A', id));
  ['003', '040'].forEach(id => field('B', id));
  for (const key of ['A', 'B']) {
    const p = s.players[key];
    p.bases = p.deck.splice(-8).map(uid => ({uid, prepared: true}));
    while (p.hand.length < 5) p.hand.push(p.deck.shift());
  }
  s.players.B.soul = 4; s.players.B.latent = 3; s.players.A.soul = 18;
  // startTurn conta o turno e o turno próprio de quem começa: Round 6, A no 11º turno ou B no 12º.
  const flood = kind === 'great-flood';
  s.round = 6; s.turn = flood ? 11 : 10; s.players.A.ownTurns = flood ? 6 : 5; s.players.B.ownTurns = 5;
  if (flood) { s.active = 'B'; s.turnInRound = 1; }
  startTurn(s);
  runCheckpoint(s);
  clockStartTurn(clock, s.active, now());
  const tag = document.createElement('div');
  tag.className = 'demo-tag'; tag.textContent = `Demo fixture · ${kind === 'great-flood' ? 'Great Flood' : 'Water Prison'}`;
  stage.append(tag);
  say(kind === 'great-flood' ? 'DEMO FIXTURE: Poseidon (Awaken) has 8 prepared Bases. Click your God to announce Great Flood.'
    : 'DEMO FIXTURE: Poseidon (Awaken, 3 Latent). Strike with Player A to trigger Water Prison and Pressure of the Deep.');
}

// ---------- Decisão pendente (modal do Olympus Arena; substitui confirm/prompt) ----------
// Pergunta da engine no meio da resolução: quem decide fica à frente da tela (viewer), só as opções legais que a engine
// mandou aparecem, e a resposta volta para a engine validar (decision.js). "View board" só esconde o modal.

function decisionText(req) {
  const n = uid => (uid && ctx.objects[uid] ? info(uid).name : '');
  const p = S().players[req.player], god = cards.get(S().gods[req.player]).name;
  const who = `Player ${req.player} · ${god[0] + god.slice(1).toLowerCase()}`;
  if (req.ability === 'WATER PRISON') return {who, title: 'Water Prison', kicker: 'Divine Power · once each Round',
    body: `${n(req.uid)} declared a Strike. Pay 2 Latent Cosmo to Seal it? It gets 1 Seal counter; the Strike still happens. Declining keeps this Round's use.`,
    note: `You have ${p.latent} Latent Cosmo.`, yes: 'Pay 2 Latent · Seal', no: 'Decline'};
  if (req.kind === 'choice') {
    const title = req.ability === 'GREAT FLOOD' ? 'Great Flood' : req.ability;
    if (req.choose === 'base') return {who, title, kicker: 'Mandatory choice', body: `${n(req.for)} returned to its owner's hand. Choose 1 Cosmo Base you control to return to your hand.`};
    if (req.choose === 'discard') return {who, title, kicker: 'Mandatory choice', body: `Discard half of your hand, rounded up: choose ${req.count} card${req.count > 1 ? 's' : ''}. Each discarded card mills 3.`};
    if (req.choose === 'keep') return {who, title: 'ONE PER CHARACTER', kicker: 'Mandatory choice', body: `You control two versions of ${info(req.options[0]).name.split(",")[0]}. Choose the one to keep; the other goes to the Tartarus (it is not destroyed).`};
    if (req.choose === 'top') return {who, title, kicker: 'Mandatory choice', body: 'Choose the card to keep on top of your deck. The other goes to the bottom.'};
    return {who, title, kicker: 'Mandatory choice', body: `Choose ${req.count}.`};
  }
  const parts = [req.source && n(req.source) ? `Source: ${n(req.source)}.` : '', req.uid && n(req.uid) ? `Affects: ${n(req.uid)}.` : '',
    req.amount ? `${req.amount} damage incoming.` : '', req.cost ? `Cost: ${typeof req.cost === 'string' ? req.cost : `${req.cost.latent} Latent`}.` : ''].filter(Boolean);
  return {who, title: req.ability, kicker: 'Optional ability', body: `${parts.join(' ')} Use it?`.trim(), yes: 'Use', no: 'Decline'};
}

function decisionModal() {
  const req = pending.pending, t = decisionText(req);
  if (pending.peek) return `<button class="decision-pill" data-dec="peek" data-focus="peek">Back to decision · ${esc(t.title)} <kbd>Esc</kbd></button>`;
  const timeout = settings.timeouts ? `<small class="decision__timeout">On timeout: ${req.kind === 'optional' ? 'declined' : 'automatic choice, lowest stable ID'}</small>` : '';
  let body;
  if (req.kind === 'optional') {
    body = `<div class="decision__actions"><button class="primary-action" data-dec="yes" data-focus="yes">${esc(t.yes)}</button><button class="ghost" data-dec="no" data-focus="no">${esc(t.no)}</button></div>`;
  } else {
    const picked = pending.picked;
    const opts = req.options.map((uid, i) => `<button class="decision__opt ${picked.includes(uid) ? 'picked' : ''}" data-dec="opt" data-opt="${esc(uid)}" data-focus="opt:${esc(uid)}" aria-pressed="${picked.includes(uid)}" aria-label="${esc(info(uid).name)}${i < 9 ? `, key ${i + 1}` : ''}">${cardFace(uid).replace('tabindex="0"', 'tabindex="-1"')}${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</button>`).join('');
    body = `<div class="decision__opts" role="group" aria-label="Options">${opts}</div>
      <div class="decision__actions"><button class="primary-action" data-dec="confirm" data-focus="confirm" ${picked.length === req.count ? '' : 'disabled'}>Confirm · ${picked.length}/${req.count}</button></div>`;
  }
  return `<div class="decision-veil"></div><section class="decision decision--${req.kind}" role="dialog" aria-modal="true" aria-labelledby="decision-title" aria-describedby="decision-body">
    <header class="decision__head"><span class="decision__who">${esc(t.who)} decides</span><span class="decision__clock" data-decision-clock></span></header>
    <small class="decision__kicker">${esc(t.kicker)}</small><h2 id="decision-title">${esc(t.title)}</h2>
    <p id="decision-body">${esc(t.body)}</p>${t.note ? `<p class="decision__note">${esc(t.note)}</p>` : ''}${body}
    <footer class="decision__foot">${timeout}<button class="ghost" data-dec="peek" data-focus="peek">View board <kbd>Esc</kbd></button></footer></section>`;
}

function togglePick(uid) {
  const req = pending.pending, picked = pending.picked;
  if (!req.options.includes(uid)) return;
  if (picked.includes(uid)) picked.splice(picked.indexOf(uid), 1);
  else if (req.count === 1) picked.splice(0, picked.length, uid);
  else if (picked.length < req.count) picked.push(uid);
  render();
}
function decisionClick(btn) {
  if (!pending || director.busy) return;
  const req = pending.pending, a = btn.dataset.dec;
  if (a === 'peek') { pending.peek = !pending.peek; render(); return focusDecision(); }
  if (a === 'yes' || a === 'no') return reply({value: a === 'yes'});
  if (a === 'opt') return togglePick(btn.dataset.opt);
  if (a === 'confirm' && pending.picked.length === req.count) return reply({value: req.multiple ? [...pending.picked] : pending.picked[0]});
}
// Teclado: Esc alterna View board; 1–9 marcam opções; setas andam entre opções; Tab fica preso no modal.
function decisionKey(e) {
  if (e.code === 'Escape') { e.preventDefault(); pending.peek = !pending.peek; render(); return focusDecision(); }
  if (e.key === 'l' || e.key === 'L') { logOpen = !logOpen; return render(); }
  if (pending.peek) return;
  const box = $('.decision'), focusables = box ? $$('button:not([disabled])', box) : [];
  if (/^[1-9]$/.test(e.key) && pending.pending.options) { const uid = pending.pending.options[Number(e.key) - 1]; if (uid) { e.preventDefault(); togglePick(uid); $(`.decision [data-focus="opt:${CSS.escape(uid)}"]`)?.focus(); } return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const opts = $$('.decision__opt', box), i = opts.indexOf(document.activeElement);
    if (opts.length) { e.preventDefault(); opts[(i + (e.key === 'ArrowRight' ? 1 : -1) + opts.length) % opts.length].focus(); }
    return;
  }
  if (e.key === 'Tab' && focusables.length) {
    const i = focusables.indexOf(document.activeElement);
    if (e.shiftKey ? i <= 0 : i === focusables.length - 1) { e.preventDefault(); focusables[e.shiftKey ? focusables.length - 1 : 0].focus(); }
    return;
  }
  // Espaço/Enter fora de um botão do modal não passam o turno: devolvem o foco à decisão.
  if ((e.code === 'Space' || e.code === 'Enter') && !document.activeElement?.closest?.('.decision, .decision-pill')) { e.preventDefault(); focusDecision(); }
}
function focusDecision() {
  if (!pending || document.activeElement?.closest?.('.decision, .decision-pill')) return;
  $('.decision [data-focus="yes"], .decision .decision__opt, .decision-pill')?.focus();
}
// O log também acompanha eventos que o orquestrador não descreve.
function watchEvents() {
  const s = S();
  const fresh = s.events.slice(watchEvents.seen || 0);
  for (const e of fresh) logEvent(e);
  watchEvents.seen = s.events.length;
  if (fresh.length && logOpen && !render.lock) render(); // o log aberto mostra as linhas novas
  requestAnimationFrame(watchEvents);
}


// ---------- Oponente IA (settings.ai: 'B' ou 'none') ----------
// A IA só escolhe; cada ação passa pela engine 3.0 como a do humano (mesmo act/reply, mesmas regras e animações).
const ai = createAI({
  S, info, num, known: uid => !!ctx.objects[uid], candidates, playableReason, canBase, STEPS,
  hp: uid => hpOf(S(), ctx, uid) - (S().units[uid]?.damage || 0), atk: uid => atkOf(S(), ctx, uid), isSaint: uid => isSaint(ctx, uid),
  strikeTargets: uid => strikeTargets(S(), ctx, uid), ultimateBlock: (key, trio) => ultimateBlock(S(), ctx, key, trio), greatFloodBlock: key => greatFloodBlock(S(), key),
  placeBase, playDevotee: (key, uid, ch) => playDevotee(S(), ctx, key, uid, ch), playEquipment: (key, uid, bearer, ch) => playEquipment(S(), ctx, key, uid, bearer, ch),
  playSpell: (key, uid, ch) => playSpell(S(), ctx, key, uid, ch), declareStrike: (uid, target) => declareStrike(S(), ctx, uid, target),
  announceExclamation: (key, trio) => announceExclamation(S(), ctx, key, trio), announceGreatFlood: key => announceGreatFlood(S(), ctx, key),
});
let aiBusy = false;
async function aiTick() {
  const key = settings.ai;
  if (key === 'none' || aiBusy || !match || director.busy || mode || S().victory) return;
  const s = S();
  aiBusy = true;
  try {
    if (pending) { if (pending.pending.player === key) await reply({value: ai.answer(pending.pending)}); return; }
    if (s.setup) { if (s.setup[0] === key) await act(() => { mulligan(match, key, []); if (!s.setup) startTurn(s); }); return; }
    if (s.window) { if (s.window.priority === key) await act(() => pass(s, key)); return; }
    if (!idleFor(key)) return;
    const a = ai.next(key);
    if (!a) { await act(() => { ending = true; endTurn(s); }); return; }
    const before = s.events.length;
    await act(a.run);
    if (S().events.length === before && !pending) ai.refuse(a); // a engine recusou: não tenta de novo neste turno
  } finally { aiBusy = false; }
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
  const params = new URLSearchParams(location.search);
  if (params.get('godB')) settings.godB = `god-${params.get('godB')}`; // ?godB=poseidon
  if (params.get('ai')) settings.ai = params.get('ai'); // ?ai=B (padrão) ou ?ai=none (hot-seat)
  if (params.get('timeouts')) settings.timeouts = params.get('timeouts') === '1'; // ?timeouts=1 (QA)
  newMatch(Number(params.get('seed')) || undefined, params.get('demo') ? 'A' : undefined);
  applyDemo(params.get('demo'));
  render();
  requestAnimationFrame(watchEvents);
  setInterval(tickClock, 250);
  setInterval(aiTick, 700);
  scene = await createScene($('#arena'), {quality: settings.quality, theme: settings.theme, reduceFlashes: settings.reduceFlashes});
  stage.classList.toggle('no-webgl', !scene);
  window.__divine = {get state() { return S(); }, get ctx() { return ctx; }, get scene() { return scene; }, get clock() { return clock; }, settings}; // inspeção no QA
}
init().catch(e => { boardRoot.innerHTML = `<p class="fatal">${esc(e.message)}</p>`; console.error(e); });
