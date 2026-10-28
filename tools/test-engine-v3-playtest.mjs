// Playtest de ponta a ponta na engine 3.0: partidas inteiras Athena × Poseidon, do mulligan à vitória, por um bot
// determinístico que só usa ações públicas da engine (jogar, Base, Strike, Moment em resposta, Ultimate, passar).
// Todas as perguntas da engine passam pelo protocolo de decisão (decision.js), com relógio virtual (G3-024..031),
// timeouts reais, reconexão por resumeFor/cursor e invariantes de zona a cada ação.
// FIXTURE: God Poseidon (canônico, D268) pilota o deck Dragon Fortress de Athena V6 — não há carta Poseidon V6 canônica.
// Regra sem texto (NotSpecified, ex.: D269) não é preenchida: a ação é abandonada e a lacuna fica registrada.
// node --test tools/test-engine-v3-playtest.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {STEPS} from '../playtest/choices-v3.js';
import {createMatch, mulligan, seeded} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, pass, placeBase, spellCategory, checkInvariants, NotSpecified, RuleError} from '../playtest/engine-v3/core.js';
import {declareStrike, strikeTargets, keywordsOf} from '../playtest/engine-v3/strike.js';
import {playDevotee, playEquipment, playSpell, duplicateCharacter} from '../playtest/engine-v3/play.js';
import {isSaint, isBronze} from '../playtest/engine-v3/effects.js';
import {ultimateBlock, announceExclamation, greatFloodBlock, announceGreatFlood} from '../playtest/engine-v3/gods.js';
import {createClock, clockStartTurn, clockEndTurn, clockHandTo, clockExpired, clockPause, clockResume, applyTimeout} from '../playtest/engine-v3/clock.js';
import {runDecisions, resume, PendingDecision} from '../playtest/engine-v3/decision.js';
import {resumeFor, createCursor} from '../playtest/engine-v3/sync.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;
const card = (g, uid) => cards.get(g.ctx.objects[uid].cardId);
const other = (s, k) => s.order.find(x => x !== k);

// ---------- Bot ----------
// `slow`: jogador que pensa devagar (gasta relógio até o timeout). `pay`: aceita Water Prison e "you may".
function game(seed, {slow = null, think = 4} = {}) {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, gods: {A: 'god-athena', B: 'god-poseidon'}, seed});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached};
  const g = {m, s, ctx, seed, rand: seeded(seed * 7 + 3), clock: createClock(s.order), t: 0, seen: 0, gaps: new Set(), cov: new Set(), ending: false,
    slow, think, lifo: 0, cursors: {A: createCursor(), B: createCursor()}, waterSeals: 0};
  return g;
}
const mark = (g, k) => g.cov.add(k);

// Relógio: turno e fim de turno pelos eventos (como a interface), tempo de quem decide corre a cada decisão.
function syncClock(g) {
  for (const e of g.s.events.slice(g.seen)) {
    if (e.type === 'end_phase') clockEndTurn(g.clock, e.player, g.t);
    if (e.type === 'turn_start') clockStartTurn(g.clock, e.player, g.t);
  }
  g.seen = g.s.events.length;
}
function spend(g, key) {
  clockHandTo(g.clock, key, g.t);
  g.t += key === g.slow ? 31 : g.think;
  // Cinemática depois da decisão não gasta relógio (G3-025): pausa, "anima" 3 s, retoma.
  clockPause(g.clock, g.t); g.t += 3; clockResume(g.clock, g.t);
  return clockExpired(g.clock, g.t) === key;
}

// Resposta do bot às perguntas da engine. Escolha obrigatória: a opção de maior id (o oposto do critério de timeout).
function answer(g, req) {
  if (spend(g, req.player)) { mark(g, req.kind === 'optional' ? 'timeout-declined' : 'timeout-auto'); return {timeout: true}; }
  if (req.kind === 'optional') return {value: true};
  const sorted = [...req.options].sort((a, b) => b.localeCompare(a, 'en', {numeric: true}));
  return {value: req.multiple ? sorted.slice(0, req.count) : sorted[0]};
}

// Toda ação passa pelo protocolo: perguntas suspendem, o bot responde, a ação continua do snapshot.
function act(g, fn) {
  const {s, ctx} = g;
  const before = s.events.length;
  let r;
  try { r = runDecisions(s, ctx, fn); } catch (e) {
    if (e instanceof NotSpecified) { g.gaps.add(e.topic); return false; }
    if (e instanceof RuleError) return false;
    throw e;
  }
  while (r.pending) {
    const req = r.pending;
    // Reconexão no meio da decisão: quem decide vê as opções; o outro, não (informação oculta).
    const mine = resumeFor(s, req.player), theirs = resumeFor(s, other(s, req.player));
    assert.equal(mine.pending.ability, req.ability);
    assert.equal(theirs.pending.options, undefined);
    mark(g, 'reconnect-pending');
    if (req.ability === 'WATER PRISON') mark(g, 'water-prison-asked');
    if (req.choose === 'discard') mark(g, 'flood-discard-choice');
    if (req.choose === 'base') mark(g, 'flood-base-choice');
    r = resume(s, ctx, fn, r, answer(g, req));
  }
  checkInvariants(s, g.m.objects);
  assert.equal(s.pending, undefined);
  for (const k of s.order) assert.ok(s.players[k].latent >= 0 && s.players[k].latent <= 3);
  // Reconexão comum: o cursor nunca repete evento, mesmo recebendo o lote duas vezes.
  for (const k of s.order) {
    const view = resumeFor(s, k, g.cursors[k].last);
    const fresh = g.cursors[k].accept(view.events);
    assert.equal(g.cursors[k].accept(view.events).length, 0);
    for (const e of fresh) if (e.type === 'draw' && e.player !== k) assert.equal(e.uid, null, 'compra do adversário fica oculta');
    assert.equal(typeof view.players[other(s, k)].hand, 'number');
  }
  mark(g, 'reconnect');
  syncClock(g);
  return s.events.length > before;
}

// Candidatos de cada passo de escolha (mesma leitura de choices-v3 que a interface usa).
function candidates(g, key, step) {
  const s = g.s, devs = s.players[key].battlefield.filter(u => card(g, u).kind === 'Devotee');
  switch (step.pick) {
    case 'saint': return devs.filter(u => isSaint(g.ctx, u));
    case 'bronze': return devs.filter(u => isBronze(g.ctx, u));
    case 'devotee': return devs;
    case 'armor': return s.players[key].battlefield.filter(u => card(g, u).armor && g.ctx.attached[u]);
    case 'enemy': return s.players[other(s, key)].battlefield.filter(u => card(g, u).kind === 'Devotee');
    default: return [];
  }
}
function choiceFor(g, key, uid) {
  const choice = {};
  for (const step of STEPS[uid.split(':')[1]] || []) {
    if (step.when && !step.when(choice)) continue;
    if (step.options) { choice[step.key] = Object.keys(step.options)[0]; continue; }
    if (step.confirm) { choice[step.key] = true; continue; }
    const list = candidates(g, key, step);
    if (step.multi) choice[step.key] = list.slice(0, step.multi);
    else if (list.length) choice[step.key] = list[0];
    else if (!step.optional) return null;
  }
  return choice;
}

const ready = (g, key) => g.s.players[key].bases.filter(b => b.prepared).length;

// Um turno inteiro do ativo. Devolve false se a partida acabou.
function turn(g) {
  const {s, ctx} = g, key = s.active, p = s.players[key];
  // Cada ação do turno é uma decisão: o relógio de quem age corre; esgotado, TIMEOUT_END_TURN (ou passa na janela).
  const out = () => {
    if (!spend(g, key)) return false;
    if (s.window) windowLoop(g);
    if (!s.victory && !s.window && s.active === key && act(g, () => applyTimeout(s, key))) g.ending = true;
    return true;
  };
  if (out()) return;
  // Cosmoble: uma Base por turno, com a carta mais cara que não dá para pagar.
  const cosmo = p.hand.filter(u => card(g, u).cosmoble);
  if (cosmo.length && p.hand.length > 1 && act(g, () => placeBase(s, key, cosmo.at(-1), card(g, cosmo.at(-1))))) mark(g, 'cosmoble');
  // Ultimates: Great Flood com Devotees inimigos em campo; Athena Exclamation com três Saints válidos.
  if (out()) return;
  if (s.divine[key].god === 'god-poseidon') {
    if (!greatFloodBlock(s, key) && s.players[other(s, key)].battlefield.length >= 2 && act(g, () => announceGreatFlood(s, ctx, key))) mark(g, 'great-flood');
    if (s.divine[key].ultimateUsed && greatFloodBlock(s, key) === 'used') mark(g, 'ultimate-blocked-after-use');
  } else {
    const saints = p.battlefield.filter(u => isSaint(ctx, u) && s.units[u]?.prepared);
    outer: for (let i = 0; i < saints.length; i++) for (let j = i + 1; j < saints.length; j++) for (let k = j + 1; k < saints.length; k++) {
      const trio = [saints[i], saints[j], saints[k]];
      let block; try { block = ultimateBlock(s, ctx, key, trio); } catch (e) { if (e instanceof NotSpecified) { g.gaps.add(e.topic); break outer; } throw e; }
      if (!block && act(g, () => announceExclamation(s, ctx, key, trio))) { mark(g, 'exclamation'); break outer; }
    }
    if (s.divine[key].ultimateUsed && ultimateBlock(s, ctx, key) === 'used') mark(g, 'ultimate-blocked-after-use');
  }
  if (s.victory) return;
  // Mão: Devotees, Equipment e Techniques que der para pagar.
  for (const uid of [...p.hand]) {
    if (s.victory || !p.hand.includes(uid)) continue;
    if (out()) return;
    const c = card(g, uid), choice = choiceFor(g, key, uid);
    if (!choice) continue;
    // Bot não troca um personagem por ele mesmo (§63 permitiria; seria só desperdício de Cosmo).
    if (c.kind === 'Devotee' && !duplicateCharacter(s, ctx, key, uid) && act(g, () => playDevotee(s, ctx, key, uid, choice))) mark(g, 'devotee-played');
    else if (c.kind === 'Equipment') { for (const bearer of p.battlefield.filter(u => card(g, u).kind === 'Devotee')) if (act(g, () => playEquipment(s, ctx, key, uid, bearer, choice))) { mark(g, 'equipment'); break; } }
    else if (c.kind === 'Spell' && spellCategory(Number(uid.split(':')[1]))?.speed === 'sorcery' && act(g, () => playSpell(s, ctx, key, uid, choice))) mark(g, 'technique');
    if (s.window) windowLoop(g);
  }
  // Strikes: God se puder, senão o primeiro alvo legal (Guardian obriga, P05).
  for (const uid of [...p.battlefield]) {
    if (s.victory || !p.battlefield.includes(uid) || card(g, uid).kind !== 'Devotee' || s.window) continue;
    const targets = strikeTargets(s, ctx, uid);
    if (!targets.length) continue;
    // Guardian fica em casa para proteger (só ataca às vezes); Sealed e Prepared tentaria a D269 (fica NotSpecified).
    if (keywordsOf(s, ctx, uid).includes('Guardian') && g.rand() < 0.7) continue;
    if (out()) return;
    const enemy = other(s, key), guards = s.players[enemy].battlefield.filter(u => s.units[u]?.prepared && keywordsOf(s, ctx, u).includes('Guardian'));
    if (guards.length && !targets.some(t => t.kind === 'god')) mark(g, 'guardian-forced');
    for (const kw of keywordsOf(s, ctx, uid)) mark(g, `kw:${kw}`);
    const devTarget = targets.find(t => t.kind === 'devotee');
    const target = devTarget && g.rand() < 0.35 ? devTarget : targets.find(t => t.kind === 'god') || targets[0];
    if (act(g, () => declareStrike(s, ctx, uid, target))) mark(g, target.kind === 'god' ? 'strike-god' : 'strike-devotee');
    windowLoop(g);
  }
  if (s.victory || out()) return;
  if (act(g, () => endTurn(s))) g.ending = true;
}

// Janela de prioridade: quem tem prioridade responde com um Moment às vezes, senão passa; timeout passa.
function windowLoop(g) {
  const {s, ctx} = g;
  for (let guard = 0; s.window && !s.victory && guard < 200; guard++) {
    const key = s.window.priority, p = s.players[key];
    if (spend(g, key)) { act(g, () => applyTimeout(s, key)); continue; }
    const moment = p.hand.find(u => card(g, u).kind === 'Spell' && spellCategory(Number(u.split(':')[1]))?.speed === 'instant' && p.latent >= (card(g, u).cost?.amount ?? 0));
    if (moment && g.rand() < 0.5) {
      const choice = choiceFor(g, key, moment);
      if (choice && act(g, () => playSpell(s, ctx, key, moment, choice))) { mark(g, 'moment-response'); continue; }
    }
    const top = s.chain.at(-1), depth = s.chain.length, controllers = new Set(s.chain.map(c => c.controller));
    const before = s.events.length;
    act(g, () => pass(s, key));
    const resolved = s.events.slice(before).find(e => e.type === 'resolve');
    if (resolved && top) {
      assert.equal(resolved.uid, top.uid, 'LIFO: resolve o último colocado');
      if (depth >= 2) { mark(g, 'chain-lifo'); g.lifo++; }
      if (depth >= 2 && controllers.size === 2) mark(g, 'chain-both-players');
    }
  }
}

function play(g, maxTurns = 120) {
  const {s, m} = g;
  // Mulligan (P01): o bot devolve as cartas sem custo pagável no começo (custo ≥ 4), no máximo 2.
  while (s.setup) {
    const key = s.setup[0], back = s.players[key].hand.filter(u => (card(g, u).cost?.amount ?? 0) >= 4).slice(0, 2);
    mulligan(m, key, back);
    if (back.length) mark(g, 'mulligan');
  }
  act(g, () => startTurn(s));
  mark(g, 'start');
  while (!s.victory && s.turn < maxTurns) {
    turn(g);
    if (s.window) windowLoop(g);
    if (s.victory) break;
    if (g.ending && !s.window) { g.ending = false; act(g, () => startTurn(s)); if (s.window) windowLoop(g); }
  }
  // Cobertura vinda dos eventos.
  const ev = s.events, has = (t, f = () => true) => ev.some(e => e.type === t && f(e));
  if (has('draw')) mark(g, 'draw');
  if (has('seal_added', e => e.counters >= 2)) mark(g, 'seal-accumulated');
  if (has('seal_removed')) mark(g, 'prepare-with-seal');
  if (has('divine_power', e => e.ability === 'WATER PRISON')) mark(g, 'water-prison');
  if (has('divine_power', e => e.ability === 'PRESSURE OF THE DEEP')) mark(g, 'pressure');
  if (has('ultimate_resolved', e => e.ability === 'GREAT FLOOD')) mark(g, 'great-flood-resolved');
  if (has('discarded', e => e.uids?.length)) mark(g, 'discard');
  if (has('mill', e => e.moved > 0)) mark(g, 'mill');
  if (has('awaken_changed', e => e.awaken)) mark(g, 'awaken-on');
  if (has('awaken_changed', e => !e.awaken)) mark(g, 'awaken-off');
  for (const t of ['TIMEOUT_PASS_PRIORITY', 'TIMEOUT_END_TURN', 'TIMEOUT_DECLINED', 'TIMEOUT_AUTO_CHOICE']) if (has(t)) mark(g, t);
  for (const k of s.order) assert.ok(ev.filter(e => e.type === 'ultimate_announced' && e.player === k).length <= 1, 'Ultimate uma vez por partida');
  if (s.victory?.winner) {
    const loser = other(s, s.victory.winner);
    if (s.players[loser].soul === 0) mark(g, 'victory-soul-zero');
    const milled = ev.filter(e => e.type === 'mill' && e.player === loser).reduce((n, e) => n + e.moved, 0);
    if (s.players[loser].deck.length === 0 && milled > 0 && has('fatigue', e => e.player === loser)) mark(g, 'victory-by-mill');
  }
  if (s.victory?.reason === 'divine_judgment') mark(g, 'victory-judgment');
  return g;
}

// ---------- Partidas ----------

const SEEDS = Array.from({length: 24}, (_, i) => i + 1);
const results = SEEDS.map(seed => play(game(seed)));

test('playtest: 24 partidas Athena × Poseidon terminam com vencedor, sem objeto perdido e reproduzíveis pela seed', () => {
  for (const g of results) assert.ok(g.s.victory, `seed ${g.seed} terminou (turno ${g.s.turn})`);
  const again = play(game(results[0].seed));
  assert.deepEqual(again.s.events.map(e => e.type), results[0].s.events.map(e => e.type), 'mesma seed, mesma partida');
  assert.deepEqual(again.s.victory, results[0].s.victory);
});

let slowCoverage = [];
const covered = new Set(results.flatMap(g => [...g.cov]));
const REQUIRED = {
  '1 mulligan e início': ['mulligan', 'start'], '2 compra e Cosmoble': ['draw', 'cosmoble'], '4 Devotees': ['devotee-played'],
  '5 Strike e alvos': ['strike-god', 'strike-devotee'], '6 Guardian': ['guardian-forced'], '7 Water Prison': ['water-prison-asked', 'water-prison'],
 '9 Prepare com Seal': ['prepare-with-seal'], '10 Pressure of the Deep': ['pressure'],
  '11 Great Flood': ['great-flood', 'great-flood-resolved', 'flood-base-choice', 'flood-discard-choice'], '12 descarte e Mill': ['discard', 'mill'],
  '13 Awaken liga': ['awaken-on'], '14 Ultimate uma vez': ['ultimate-blocked-after-use'], '15 resposta e LIFO': ['moment-response', 'chain-lifo'],
  '17 timeouts': [], '18 reconexão': ['reconnect', 'reconnect-pending'], '19 Soul zero': ['victory-soul-zero'],
};
for (const [label, keys] of Object.entries(REQUIRED)) {
  test(`playtest cobre ${label} em partida inteira`, () => {
    for (const k of keys) assert.ok(covered.has(k), `${k} não aconteceu em nenhuma das ${SEEDS.length} partidas`);
  });
}

// Seal acumulado não é alcançável em partida real com as cartas canônicas: a única fonte é Water Prison, que sela o
// atacante já Unprepared pela declaração; o Prepare seguinte remove o marcador. Um segundo Seal exigiria Water Prison
// num Devotee já Sealed, que é a D269 (não aprovada, NotSpecified). Acúmulo coberto por fixture em test-engine-v3-poseidon.
test('playtest: Seal nunca passa de 1 marcador em partida real e nenhuma partida tocou a D269', () => {
  for (const g of results) {
    assert.ok(g.s.events.filter(e => e.type === 'seal_added').every(e => e.counters === 1), `seed ${g.seed}`);
    assert.ok(![...g.gaps].some(t => /D269/.test(t)), `seed ${g.seed} chegou na D269`);
  }
});

// Timeouts reais em partida inteira: B pensa 31 s por decisão e estoura a reserva; o jogo segue com os códigos homologados.
test('playtest com jogador lento: timeouts homologados em partida inteira, e a partida termina', () => {
  const runs = [3, 8, 13].flatMap(seed => [play(game(seed, {slow: 'B'})), play(game(seed, {slow: 'A'}))]);
  const cov = new Set(runs.flatMap(g => [...g.cov]));
  for (const k of ['TIMEOUT_PASS_PRIORITY', 'TIMEOUT_END_TURN']) assert.ok(cov.has(k), `${k} aconteceu`);
  for (const g of runs) {
    assert.ok(g.s.victory, `seed ${g.seed} terminou`);
    for (const e of g.s.events.filter(e => e.type.startsWith('TIMEOUT_'))) assert.equal(e.player, g.slow, 'só quem estourou o relógio sofre timeout');
    if (g.cov.has('timeout-declined')) assert.ok(g.cov.has('TIMEOUT_DECLINED'), 'opcional pendente sem tempo → TIMEOUT_DECLINED');
    if (g.cov.has('timeout-auto')) assert.ok(g.cov.has('TIMEOUT_AUTO_CHOICE'), 'obrigatória pendente sem tempo → TIMEOUT_AUTO_CHOICE');
  }
  slowCoverage = [...cov].filter(k => k.startsWith('TIMEOUT_') || k.startsWith('timeout-'));
});

// Relatório da cobertura e das lacunas normativas encontradas (sem preencher regra).
test('playtest: relatório de cobertura e lacunas (NotSpecified) — informativo', () => {
  const gaps = [...new Set(results.flatMap(g => [...g.gaps]))].sort();
  const optional = ['awaken-off', 'chain-both-players', 'victory-by-mill', 'exclamation', 'equipment', 'technique', 'TIMEOUT_DECLINED', 'TIMEOUT_AUTO_CHOICE'];
  const turns = results.map(g => g.s.turn), winners = results.map(g => g.s.victory.winner || 'draw');
  console.log(JSON.stringify({matches: results.length, turns: {min: Math.min(...turns), max: Math.max(...turns)}, wins: {A: winners.filter(w => w === 'A').length, B: winners.filter(w => w === 'B').length},
    lifoResolutions: results.reduce((n, g) => n + g.lifo, 0), slowCoverage, alsoSeen: optional.filter(k => covered.has(k)), notSeen: optional.filter(k => !covered.has(k)), gaps}));
  assert.ok(true);
});
