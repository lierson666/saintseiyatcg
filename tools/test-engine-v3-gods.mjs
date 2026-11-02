// Gods 3.0 (G3-xxx, docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md): Awaken, Soul, Ultimate, Divine Judgment, relógio e reconexão.
// node --test tools/test-engine-v3-gods.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, pass, loseSoul, checkInvariants, eventsFor, RuleError, NotSpecified} from '../playtest/engine-v3/core.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, hpOf, damageDevotee, checkDefeats} from '../playtest/engine-v3/effects.js';
import {announceExclamation, exclamationCost, ultimateBlock, removeJudgment, computeSoulMax, soulMax, addSoulMaxEffect, gainSoul, payMixed, refreshAwaken} from '../playtest/engine-v3/gods.js';
import {createClock, clockStartTurn, clockEndTurn, clockRemaining, clockHandTo, clockPause, clockResume, clockExpired, torchesLit, timeoutAction, ALPHA_CLOCK, clockBonus} from '../playtest/engine-v3/clock.js';
import {createCursor, resumeFor} from '../playtest/engine-v3/sync.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('./fixtures/decks-proposta-d171.json').decks;

function setup(decide) {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, first: 'A', seed: 3});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null;
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached, decide};
  const take = (key, id) => { const p = s.players[key], uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); return uid; };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  const bases = (key, n) => { s.players[key].bases.push(...s.players[key].deck.splice(-n).map(uid => ({uid, prepared: true}))); };
  const strike = (attacker, target) => { declareStrike(s, ctx, attacker, target); return passAll(s); };
  startTurn(s);
  return {s, ctx, field, bases, strike};
}
const types = s => s.events.map(e => e.type);

test('G3-004: Awaken liga com Soul ≤ 5, desliga acima e religa sozinho; sem custo; +1/+1 só enquanto ativo', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001');
  assert.equal(s.divine.A.awaken, false);
  loseSoul(s, {A: 15}); refreshAwaken(s);
  const on = [atkOf(s, ctx, seiya), hpOf(s, ctx, seiya)];
  gainSoul(s, 'A', 1); refreshAwaken(s);
  assert.equal(s.divine.A.awaken, false);
  assert.deepEqual([on[0] - atkOf(s, ctx, seiya), on[1] - hpOf(s, ctx, seiya)], [1, 1], 'Divine Protection: +1/+1 só com Awaken');
  loseSoul(s, {A: 1}); refreshAwaken(s);
  assert.equal(s.divine.A.awaken, true);
  assert.equal(types(s).filter(t => t === 'awaken_changed').length, 3);
});

test('G3-003: Awaken muda só no checkpoint, não no meio de uma resolução', () => {
  const {s, ctx, field, strike} = setup();
  const jabu = field('A', '028');
  s.players.B.soul = 7; // Jabu 2 ATK no God B → 5: Awaken só depois que a resolução termina
  strike(jabu, {kind: 'god', player: 'B'});
  const seq = types(s), lost = seq.lastIndexOf('soul_lost'), on = seq.lastIndexOf('awaken_changed');
  assert.ok(on > lost && s.divine.B.awaken, 'awaken_changed vem depois do soul_lost, no checkpoint');
});

test('Cosmo of Hope (D225): Athena Devotee que sobrevive a um Strike dá 1 Latent, uma vez por Round', () => {
  const {s, field, strike} = setup();
  const seiya = field('A', '001'), jabu = field('A', '028');
  strike(seiya, {kind: 'god', player: 'B'});
  assert.equal(s.players.A.latent, 1);
  strike(jabu, {kind: 'god', player: 'B'});
  assert.equal(s.players.A.latent, 1, 'segundo Strike no mesmo Round não dá de novo');
  assert.equal(types(s).filter(t => t === 'divine_power').length, 1);
});

test('Divine Protection (D200): Defeat prevenível de Athena Devotee com Awaken; pagar 3 Latent deixa 1 HP; recusar destrói', () => {
  for (const answer of [true, false]) {
    const {s, ctx, field} = setup(() => answer);
    const seiya = field('A', '001');
    loseSoul(s, {A: 25}); refreshAwaken(s);
    s.players.A.latent = 3;
    damageDevotee(s, ctx, seiya, 10, false);
    checkDefeats(s, ctx);
    if (answer) assert.deepEqual([s.players.A.latent, hpOf(s, ctx, seiya) - s.units[seiya].damage], [0, 1]);
    else assert.deepEqual([s.players.A.latent, s.players.A.tartarus.includes(seiya)], [3, true]);
  }
});

function exclamationSetup(decide) {
  const t = setup(decide);
  const saints = [t.field('A', '001'), t.field('A', '028'), t.field('A', '021')];
  return {...t, saints};
}

test('Athena Exclamation (D229, autor 02/11/2026): 5 em Base + 3 Soul por Bronze + 2 Soul por Silver; Sorcery; uso consumido no anúncio', () => {
  const {s, ctx, bases, saints} = exclamationSetup();
  assert.deepEqual(exclamationCost(ctx, saints), {base: 5, soul: 8});
  const soul = s.players.A.soul;
  bases('A', 4);
  assert.throws(() => announceExclamation(s, ctx, 'A', saints), RuleError, 'falta 1 Base');
  assert.deepEqual([s.divine.A.ultimateUsed, s.players.A.bases.filter(b => b.prepared).length, s.players.A.soul], [false, 4, soul], 'anúncio ilegal não gasta nem consome');
  bases('A', 1);
  s.players.A.soul = 7;
  assert.throws(() => announceExclamation(s, ctx, 'A', saints), RuleError, 'falta 1 Soul');
  s.players.A.soul = soul;
  assert.throws(() => announceExclamation(s, ctx, 'A', [saints[0], saints[0], saints[1]]), RuleError, '3 objetos distintos');
  announceExclamation(s, ctx, 'A', saints);
  assert.deepEqual([s.divine.A.ultimateUsed, s.players.A.bases.filter(b => b.prepared).length, s.players.A.soul, !!s.window], [true, 0, soul - 8, true]);
  assert.equal(ultimateBlock(s, ctx, 'A'), 'used');
});

test('Athena Exclamation (D228/D230/D205): ATTACK fotografado antes da Defeat; Soul perdido = soma; Divine Judgment se sobreviver', () => {
  const {s, ctx, bases, saints} = exclamationSetup();
  bases('A', 13);
  announceExclamation(s, ctx, 'A', saints);
  const atk = saints.reduce((n, u) => n + atkOf(s, ctx, u), 0); // depois de pagar: Soul menor pode dar bônus a Seiya
  passAll(s);
  assert.ok(saints.every(u => s.players.A.tartarus.includes(u)), 'Defeat que não pode ser prevenida');
  assert.deepEqual([s.players.B.soul, s.divine.B.judgment?.deadline], [20 - atk, s.round + 1]);
  const lost = s.events.find(e => e.type === 'soul_lost' && e.player === 'B');
  assert.equal(lost.cause, 'loss', 'Lose Soul, não dano (G3-013)');
  checkInvariants(s, ctx.objects);
});

test('G3-006/D230: Saint escolhido que sai antes da resolução → Ultimate sem efeito, uso e custo não voltam', () => {
  const {s, ctx, bases, saints} = exclamationSetup();
  bases('A', 5);
  announceExclamation(s, ctx, 'A', saints);
  s.units[saints[2]].prepared = false; // deixou de ser Prepared antes da resolução
  passAll(s);
  assert.deepEqual([s.players.B.soul, s.divine.A.ultimateUsed, s.players.A.bases.filter(b => b.prepared).length, types(s).includes('ultimate_failed')], [20, true, 0, true]);
});

test('G3-005: Ultimate independe de Awaken e só no próprio turno com cadeia vazia', () => {
  const {s, ctx, bases, saints} = exclamationSetup();
  bases('A', 13);
  s.divine.A.awakenAt = 12; loseSoul(s, {A: 10}); refreshAwaken(s); // sobra Soul para a taxa de 8
  assert.equal(s.divine.A.awaken, true);
  assert.equal(ultimateBlock(s, ctx, 'A', saints), null, 'Awaken ativo não impede');
  endTurn(s);
  assert.equal(ultimateBlock(s, ctx, 'A', saints), 'sorcery', 'janela aberta');
});

test('Divine Judgment (D218/D206): vence no fim do Round seguinte; remover com 3 sacrifícios cancela só aquele contador', () => {
  const run = remove => {
    const {s, ctx, bases, saints, field} = exclamationSetup();
    bases('A', 13);
    announceExclamation(s, ctx, 'A', saints); passAll(s);
    const deadline = s.divine.B.judgment.deadline;
    endTurn(s); passAll(s); startTurn(s); // turno de B no Round 1
    if (remove) {
      const three = [field('B', '040'), field('B', '041'), field('B', '042')];
      removeJudgment(s, ctx, 'B', three); passAll(s);
      assert.equal(s.divine.B.judgment, null);
    }
    endTurn(s); passAll(s); // fim do Round 1
    for (let r = s.round; r <= deadline && !s.victory; r = s.round) { startTurn(s); endTurn(s); passAll(s); if (s.victory) break; startTurn(s); endTurn(s); passAll(s); }
    return s;
  };
  const kept = run(false);
  assert.deepEqual(kept.victory, {winner: 'A', reason: 'divine_judgment'});
  const removed = run(true);
  assert.equal(removed.victory, null);
});

test('G3-009/010/011: Soul máximo em camadas, mínimo 1; recuperação para no máximo; redução ajusta sem ser dano', () => {
  assert.equal(computeSoulMax(30, [{add: -5}, {set: 20, order: 1}, {add: 2}]), 17);
  assert.equal(computeSoulMax(30, [{add: -99}]), 1);
  assert.throws(() => computeSoulMax(30, [{set: 10}, {set: 12}]), NotSpecified, 'dois fixos sem precedência: lacuna');
  const {s} = setup();
  assert.equal(gainSoul(s, 'A', 5), 0, 'já está no máximo');
  addSoulMaxEffect(s, 'A', {add: -4});
  assert.deepEqual([soulMax(s, 'A'), s.players.A.soul, types(s).includes('soul_lost')], [16, 16, false]);
  addSoulMaxEffect(s, 'A', {add: 4});
  assert.equal(s.players.A.soul, 16, 'aumentar o máximo não devolve Soul');
});

test('G3-012/014: custo misto atômico; Soul letal pode ser pago e encerra a partida; Soul nunca negativo', () => {
  const {s, bases} = setup();
  bases('A', 1); s.players.A.latent = 1;
  assert.throws(() => payMixed(s, 'A', {base: 2, latent: 1}), RuleError);
  assert.deepEqual([s.players.A.bases.filter(b => b.prepared).length, s.players.A.latent], [1, 1], 'nada gasto');
  s.players.A.soul = 2;
  assert.equal(payMixed(s, 'A', {base: 1, soul: 2}), false);
  assert.deepEqual([s.players.A.soul, s.victory], [0, {winner: 'B'}]);
  const {s: t} = setup();
  loseSoul(t, {B: 99}, 'damage');
  assert.deepEqual([t.players.B.soul, t.events.find(e => e.type === 'soul_lost').amount], [0, 99]);
});

test('G3-015: Soul 0 encerra na hora; gatilho pendente não resolve depois', () => {
  const {s, field, strike} = setup();
  const seiya = field('A', '001');
  s.players.B.soul = 2;
  strike(seiya, {kind: 'god', player: 'B'});
  assert.deepEqual([s.victory, s.chain.length, s.players.A.latent], [{winner: 'A'}, 0, 0], 'Cosmo of Hope não chega a resolver');
});

// Valores de 4 minutos (antes dos 90 s por ação): o teste confere a lógica de básico e reserva, não os números do ALPHA_CLOCK.
const CLOCK_4MIN = {basic: 60, reserveStart: 180, reserveMax: 240, carry: 0.5, actionBonus: 5};
test('Relógio Alpha: 90 s por ação; voltam cheios a cada ação, a cada decisão recebida e depois de um timeout', () => {
  const c = createClock(['A', 'B']);
  clockStartTurn(c, 'A', 0);
  assert.equal(clockRemaining(c, 'A', 0).total, 90);
  assert.equal(clockExpired(c, 89), null);
  clockBonus(c, 'A', 80);
  assert.equal(clockRemaining(c, 'A', 80).total, 90, 'a ação devolve o tempo cheio');
  clockHandTo(c, 'A', 80);
  assert.equal(clockRemaining(c, 'A', 100).total, 70, 'continuar decidindo não reinicia sem ação');
  clockHandTo(c, 'B', 100);
  assert.equal(clockRemaining(c, 'B', 100).total, 90);
  clockHandTo(c, 'A', 130);
  assert.equal(clockRemaining(c, 'A', 130).total, 90, 'a decisão de volta vem com tempo cheio');
  assert.equal(clockExpired(c, 220), 'A', 'esgotados os 90 s sem agir, o timeout vale');
  clockHandTo(c, 'A', 220);
  assert.equal(clockRemaining(c, 'A', 220).total, 90, 'o timeout não derruba a decisão seguinte');
  assert.equal(clockEndTurn(c, 'A', 230), 0, 'sem sobra guardada');
  assert.deepEqual([torchesLit(90), torchesLit(85), torchesLit(7.5), torchesLit(1), torchesLit(0), torchesLit(9999)], [12, 12, 1, 1, 0, 12]);
});

test('Relógio com básico e reserva: 50% do básico não usado vira reserva; animação pausa', () => {
  const c = createClock(['A', 'B'], CLOCK_4MIN);
  clockStartTurn(c, 'A', 0);
  assert.equal(clockEndTurn(c, 'A', 35), 12.5);
  assert.equal(clockRemaining(c, 'A', 35).reserve, 192.5);
  clockStartTurn(c, 'B', 100); clockPause(c, 110); clockResume(c, 140);
  assert.equal(clockRemaining(c, 'B', 150).basic, 40, '30 s de animação não contam');
  clockHandTo(c, 'A', 150); // A responde numa janela: só a reserva dele corre
  assert.deepEqual(clockRemaining(c, 'A', 160), {basic: 0, reserve: 182.5, total: 182.5});
  const full = createClock(['A'], CLOCK_4MIN); full.players.A.reserve = 239; clockStartTurn(full, 'A', 0);
  assert.equal(clockEndTurn(full, 'A', 0), 1, 'teto 240');
  const out = createClock(['A'], CLOCK_4MIN); clockStartTurn(out, 'A', 0);
  assert.equal(clockExpired(out, CLOCK_4MIN.basic + CLOCK_4MIN.reserveStart), 'A');
  const bonus = createClock(['A'], CLOCK_4MIN); bonus.players.A.reserve = 237; clockBonus(bonus, 'A', 0);
  assert.equal(bonus.players.A.reserve, 240, '+5 por ação, até o teto');
});

test('Timeouts: janela passa prioridade; fase de ações encerra o turno; opcional recusa', () => {
  const {s, field} = setup();
  assert.equal(timeoutAction(s), 'TIMEOUT_END_TURN');
  endTurn(s);
  assert.equal(timeoutAction(s), 'TIMEOUT_PASS_PRIORITY');
  assert.equal(timeoutAction(s, {optional: true}), 'TIMEOUT_DECLINED');
  pass(s, s.window.priority);
});

test('G3-019/020: reconexão não repete eventos; adversário não vê a carta comprada', () => {
  const {s} = setup();
  const cursor = createCursor();
  const first = cursor.accept(eventsFor(s, 'A'));
  assert.equal(cursor.accept(eventsFor(s, 'A')).length, 0, 'mesmo lote de novo: nada novo');
  endTurn(s); passAll(s); startTurn(s); // B compra 0 no 1º turno; A compra no próximo
  endTurn(s); passAll(s); startTurn(s);
  const resume = resumeFor(s, 'B', cursor.last);
  const draws = resume.events.filter(e => e.type === 'draw' && e.player === 'A');
  assert.ok(draws.length && draws.every(e => e.uid === null), 'B não vê o que A comprou');
  assert.ok(Array.isArray(resume.players.B.hand) && typeof resume.players.A.hand === 'number');
  assert.ok(first.length > 0 && cursor.accept(resume.events).every(e => e.seq > first.at(-1).seq));
});
