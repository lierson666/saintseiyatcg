// Protocolo de decisão pendente (decision.js) e timeouts reais (G3-027/030/031) na engine 3.0, sem confirm/prompt.
// FIXTURE: God Poseidon (canônico, D268) pilota o deck Dragon Fortress de Athena V6; não há carta Poseidon V6 canônica.
// node --test tools/test-engine-v3-decisions.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, pass, passAll, checkInvariants, RuleError} from '../playtest/engine-v3/core.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {refreshAwaken, announceGreatFlood} from '../playtest/engine-v3/gods.js';
import {createClock, clockStartTurn, clockHandTo, clockExpired, clockRemaining, clockEndTurn, applyTimeout} from '../playtest/engine-v3/clock.js';
import {runDecisions, resume, PendingDecision} from '../playtest/engine-v3/decision.js';
import {resumeFor} from '../playtest/engine-v3/sync.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

function setup() {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, gods: {A: 'god-athena', B: 'god-poseidon'}, first: 'A', seed: 5});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null;
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached};
  const take = (key, id) => { const p = s.players[key], uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); return uid; };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  const bases = (key, n) => { s.players[key].bases.push(...s.players[key].deck.splice(-n).map(uid => ({uid, prepared: true}))); };
  startTurn(s);
  return {m, s, ctx, take, field, bases};
}
const count = (s, type, ability) => s.events.filter(e => e.type === type && (!ability || e.ability === ability)).length;
const types = s => s.events.map(e => e.type);
// Water Prison: Strike de A com Poseidon (B) em Awaken e 3 Latent; tudo dentro do protocolo.
function waterPrison() {
  const t = setup();
  t.s.players.B.soul = 4; t.s.players.B.latent = 3; refreshAwaken(t.s);
  const seiya = t.field('A', '001');
  const run = () => { declareStrike(t.s, t.ctx, seiya, {kind: 'god', player: 'B'}); passAll(t.s); };
  return {...t, seiya, run};
}

test('decisão pendente: Water Prison suspende sem travar, mostra o ponto da pergunta e não paga nada ainda', () => {
  const {s, ctx, seiya, run} = waterPrison();
  const r = runDecisions(s, ctx, run);
  assert.ok(r.pending, 'a engine pediu uma decisão');
  assert.deepEqual({player: r.pending.player, kind: r.pending.kind, ability: r.pending.ability, uid: r.pending.uid}, {player: 'B', kind: 'optional', ability: 'WATER PRISON', uid: seiya});
  assert.equal(s.pending.ability, 'WATER PRISON', 'estado guarda a pendência para a reconexão');
  assert.ok(types(s).includes('strike_declared'), 'o que aconteceu antes da pergunta já aparece');
  assert.equal(s.players.B.latent, 3, 'nada pago antes da resposta');
  assert.equal(ctx.decide, undefined, 'o protocolo não deixa `decide` pendurado no ctx');
});

test('decisão pendente: pagar continua do snapshot; custo, uso do Round e Seal acontecem uma vez só', () => {
  const {s, ctx, m, seiya, run} = waterPrison();
  const r = runDecisions(s, ctx, run);
  const prefix = s.events.slice(0, s.events.length).map(e => e.type);
  const done = resume(s, ctx, run, r, {value: true});
  assert.ok(done.done);
  assert.deepEqual(s.events.slice(0, prefix.length).map(e => e.type), prefix, 'replay reproduz o prefixo idêntico (continuação determinística)');
  assert.equal(s.players.B.latent, 1, 'pagou 2 Latent uma vez');
  assert.equal(count(s, 'divine_power', 'WATER PRISON'), 1);
  assert.equal(count(s, 'strike_declared'), 1, 'Strike declarado uma vez');
  assert.equal(s.units[seiya].seal, 1, 'G3-032: 1 marcador');
  assert.ok(s.roundUses.has('god:B:water-prison'));
  assert.equal(s.pending, undefined);
  checkInvariants(s, m.objects);
});

test('decisão pendente: recusar não paga, não sela e não gasta o uso do Round', () => {
  const {s, ctx, seiya, run} = waterPrison();
  const done = resume(s, ctx, run, runDecisions(s, ctx, run), {value: false});
  assert.ok(done.done);
  assert.equal(s.players.B.latent, 3);
  assert.equal(s.units[seiya]?.seal ?? 0, 0);
  assert.equal(s.roundUses.has('god:B:water-prison'), false);
  assert.equal(count(s, 'divine_power_declined', 'WATER PRISON'), 1);
});

test('G3-027: timeout em escolha opcional pendente = TIMEOUT_DECLINED (registrado), sem pagamento', () => {
  const {s, ctx, run} = waterPrison();
  resume(s, ctx, run, runDecisions(s, ctx, run), {timeout: true});
  assert.equal(count(s, 'TIMEOUT_DECLINED'), 1);
  assert.equal(s.events.find(e => e.type === 'TIMEOUT_DECLINED').player, 'B');
  assert.equal(s.players.B.latent, 3);
  assert.equal(count(s, 'divine_power', 'WATER PRISON'), 0);
});

// Great Flood com A tendo 2 Devotees em campo: 2 escolhas de Base (dono dos Devotees, D231) e depois o descarte (G3-034).
function flood() {
  const t = setup();
  const sa = t.field('A', '001'), sb = t.field('A', '028');
  t.bases('A', 3);
  endTurn(t.s); passAll(t.s); startTurn(t.s); // turno de B
  t.bases('B', 8);
  for (let i = 0; i < 3; i++) t.s.players.A.hand.push(t.s.players.A.deck.shift());
  const run = () => { announceGreatFlood(t.s, t.ctx, 'B'); passAll(t.s); };
  return {...t, sa, sb, run};
}

test('decisão pendente: Great Flood pede Base duas vezes e o descarte, cada uma de quem decide, só com opções legais', () => {
  const {s, ctx, m, run} = flood();
  const baseA = s.players.A.bases.map(b => b.uid);
  let r = runDecisions(s, ctx, run);
  assert.equal(r.pending.choose, 'base'); assert.equal(r.pending.player, 'A');
  assert.deepEqual(r.pending.options, baseA);
  r = resume(s, ctx, run, r, {value: baseA[2]});
  assert.equal(r.pending.choose, 'base'); assert.equal(r.pending.index, 1);
  assert.deepEqual(r.pending.options, baseA.slice(0, 2), 'a Base já devolvida não é mais opção');
  r = resume(s, ctx, run, r, {value: baseA[0]});
  assert.equal(r.pending.choose, 'discard'); assert.equal(r.pending.player, 'A');
  const hand = r.pending.options, need = Math.ceil(hand.length / 2);
  assert.equal(r.pending.count, need);
  assert.equal(hand.length, 3 + 2 + 2, '3 da mão + 2 Devotees + 2 Bases devolvidos');
  const chosen = hand.slice(-need);
  const done = resume(s, ctx, run, r, {value: chosen});
  assert.ok(done.done);
  assert.equal(count(s, 'ultimate_announced', 'GREAT FLOOD'), 1, 'anúncio e custo de 8 Bases uma vez');
  assert.equal(s.events.filter(e => e.type === 'cosmo_spent' && e.player === 'B' && e.amount === 8).length, 1);
  assert.equal(count(s, 'base_returned'), 2);
  assert.ok(chosen.every(u => s.players.A.tartarus.includes(u)), 'descartou exatamente o que A escolheu');
  checkInvariants(s, m.objects);
});

test('decisão pendente: resposta fora das opções legais é recusada pela engine; a pendência continua', () => {
  const {s, ctx, run} = flood();
  const r = runDecisions(s, ctx, run);
  assert.throws(() => resume(s, ctx, run, r, {value: 'A:999:1'}), RuleError);
  assert.throws(() => resume(s, ctx, run, r, {value: [r.pending.options[0]]}), RuleError, 'escolha simples não aceita lista');
  const again = resume(s, ctx, run, {...r, answers: r.answers}, {value: r.pending.options[0]});
  assert.ok(again.pending, 'depois do erro, a mesma ação continua do snapshot normalmente');
});

test('G3-027/G3-030: timeout nas escolhas obrigatórias do Great Flood = menor id estável, revalidado, com TIMEOUT_AUTO_CHOICE', () => {
  const {s, ctx, run} = flood();
  let r = runDecisions(s, ctx, run);
  const opts = [...r.pending.options].sort((a, b) => a.localeCompare(b, 'en', {numeric: true}));
  r = resume(s, ctx, run, r, {timeout: true});
  r = resume(s, ctx, run, r, {timeout: true});
  const hand = [...r.pending.options], need = r.pending.count;
  const done = resume(s, ctx, run, r, {timeout: true});
  assert.ok(done.done);
  const auto = s.events.filter(e => e.type === 'TIMEOUT_AUTO_CHOICE');
  assert.equal(auto.length, 3);
  assert.deepEqual(auto[0].result, [opts[0]]);
  assert.ok(!auto[1].eligible.includes(opts[0]), 'segunda escolha revalidada sem a Base já devolvida');
  assert.deepEqual(auto[2].result, hand.sort((a, b) => a.localeCompare(b, 'en', {numeric: true})).slice(0, need));
});

test('reconexão com decisão pendente: quem decide recebe a pergunta; o outro não vê as opções (informação oculta)', () => {
  const {s, ctx, run} = flood();
  let r = runDecisions(s, ctx, run);
  r = resume(s, ctx, run, r, {value: r.pending.options[0]});
  r = resume(s, ctx, run, r, {value: r.pending.options[0]});
  const mine = resumeFor(s, 'A'), theirs = resumeFor(s, 'B');
  assert.equal(mine.pending.choose, 'discard');
  assert.deepEqual(mine.pending.options, r.pending.options);
  assert.deepEqual(Object.keys(theirs.pending).sort(), ['ability', 'count', 'kind', 'player']);
  assert.equal(typeof theirs.players.A.hand, 'number');
  // Depois da reconexão a autoridade continua do mesmo ponto, sem repetir nada.
  const done = resume(s, ctx, run, r, {value: r.pending.options.slice(0, r.pending.count)});
  assert.ok(done.done);
  assert.equal(resumeFor(s, 'A').pending, null);
});

test('G3-027: applyTimeout passa a prioridade na janela e encerra o turno fora dela; só para quem decide', () => {
  const {s} = setup();
  assert.throws(() => applyTimeout(s, 'B'), RuleError, 'B não decide no turno de A');
  assert.equal(applyTimeout(s, 'A'), 'TIMEOUT_END_TURN');
  assert.ok(s.window, 'End Phase abriu a janela');
  const who = s.window.priority;
  assert.equal(applyTimeout(s, who), 'TIMEOUT_PASS_PRIORITY');
  assert.equal(count(s, 'TIMEOUT_END_TURN'), 1);
  assert.equal(count(s, 'TIMEOUT_PASS_PRIORITY'), 1);
  assert.equal(s.events.filter(e => e.type === 'pass').length, 1);
});

test('relógio + decisão: Water Prison no turno de A gasta só a reserva de B; reserva zerada → TIMEOUT_DECLINED', () => {
  const {s, ctx, run} = waterPrison();
  const clock = createClock(s.order);
  clockStartTurn(clock, 'A', 0);
  const r = runDecisions(s, ctx, run);
  clockHandTo(clock, r.pending.player, 10); // G3-026: a decisão usa o relógio de quem decide
  assert.equal(clockRemaining(clock, 'B', 10).basic, 0, 'fora do turno próprio não há básico');
  assert.equal(clockExpired(clock, 99), null);
  assert.equal(clockExpired(clock, 100), 'B', '90 s de reserva inicial');
  assert.equal(clockRemaining(clock, 'A', 100).basic, 50, 'o básico de A parou enquanto B decidia');
  resume(s, ctx, run, r, {timeout: true});
  assert.equal(count(s, 'TIMEOUT_DECLINED'), 1);
});

test('G3-024: 60 s básicos, 90 de reserva, 50% do básico não usado vira reserva, teto 180', () => {
  const clock = createClock(['A', 'B']);
  clockStartTurn(clock, 'A', 0);
  assert.equal(clockEndTurn(clock, 'A', 20), 20, '40 s não usados → +20');
  assert.equal(clockRemaining(clock, 'A', 20).reserve, 110);
  for (let i = 0; i < 4; i++) { clockStartTurn(clock, 'A', 100 * i + 100); clockEndTurn(clock, 'A', 100 * i + 100); }
  assert.equal(clockRemaining(clock, 'A', 1000).reserve, 180, 'teto');
});

test('PendingDecision não escapa do protocolo e erros comuns da ação passam sem mexer no snapshot', () => {
  const {s, ctx} = setup();
  assert.throws(() => runDecisions(s, ctx, () => { throw new RuleError('D1', 'teste'); }), RuleError);
  const r = runDecisions(s, ctx, () => ctx.decide('A', {ability: 'Divine Protection'}));
  assert.ok(r.pending && !(r instanceof PendingDecision));
  assert.equal(r.pending.kind, 'optional');
});
