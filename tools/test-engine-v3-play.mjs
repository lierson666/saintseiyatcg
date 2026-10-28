// Início do turno e estado de entrada 3.0 (ALPHA-P02 opção A, aprovada em 28/10/2026). node --test tools/test-engine-v3-play.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, placeBase, spendBase, respond, checkInvariants, RuleError, NotSpecified} from '../playtest/engine-v3/core.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {playDevotee, playEquipment, playSpell} from '../playtest/engine-v3/play.js';
import {checkDefeats} from '../playtest/engine-v3/effects.js';
import {runDecisions, resume} from '../playtest/engine-v3/decision.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

function setup(cardsMap = cards) {
  const m = createMatch({cards: cardsMap, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, first: 'A', seed: 5});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null; // cenário isolado: sem mão inicial (P01)
  const ctx = {cards: cardsMap, objects: m.objects, attached: m.attached}, s = m.state;
  const take = (key, id) => { const p = s.players[key], uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); return uid; };
  const toHand = (key, id) => { const uid = take(key, id); s.players[key].hand.push(uid); return uid; };
  const bases = (key, n) => { for (let i = 0; i < n; i++) s.players[key].bases.push({uid: s.players[key].deck.shift(), prepared: false}); };
  const end = () => { endTurn(s); passAll(s); };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  return {s, ctx, objects: m.objects, toHand, bases, end, field};
}

test('Devotee jogado entra Unprepared, paga Base e não ataca no turno em que entra; no turno seguinte está Prepared', () => {
  const {s, ctx, objects, toHand, bases, end} = setup();
  const seiya = toHand('A', '001');
  const cost = cards.get('athena-v6-001').cost;
  bases('A', cost.amount);
  startTurn(s);
  playDevotee(s, ctx, 'A', seiya);
  assert.ok(s.players.A.battlefield.includes(seiya));
  assert.deepEqual(s.units[seiya], {prepared: false, damage: 0, entered: 1});
  assert.equal(s.players.A.bases.filter(b => b.prepared).length, 0, 'custo pago com Base');
  assert.throws(() => declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'}), /Prepared/);
  checkInvariants(s, objects);
  end(); startTurn(s); end(); startTurn(s);
  assert.equal(s.units[seiya].prepared, true);
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'});
  passAll(s);
  assert.equal(s.players.B.soul, 30 - cards.get('athena-v6-001').atk);
});

test('Impulse deixa declarar Strike no turno em que entra', () => {
  const withImpulse = new Map(cards);
  withImpulse.set('athena-v6-001', {...cards.get('athena-v6-001'), keywords: ['Impulse']}); // carta de teste, catálogo intacto
  const {s, ctx, toHand, bases} = setup(withImpulse);
  const seiya = toHand('A', '001');
  bases('A', cards.get('athena-v6-001').cost.amount);
  startTurn(s);
  playDevotee(s, ctx, 'A', seiya);
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'});
  passAll(s);
  assert.equal(s.players.B.soul, 28);
  assert.deepEqual(cards.get('athena-v6-001').keywords, []);
});

test('jogada ilegal não mexe no estado: sem Base suficiente, fora do turno, com janela aberta, carta que não é Devotee', () => {
  const {s, ctx, toHand, bases} = setup();
  const seiya = toHand('A', '001'), jabu = toHand('B', '028'), cloth = toHand('A', '002');
  startTurn(s);
  assert.throws(() => playDevotee(s, ctx, 'A', seiya), /insuficientes/);
  assert.ok(s.players.A.hand.includes(seiya));
  assert.throws(() => playDevotee(s, ctx, 'B', jabu), /D1/);
  assert.throws(() => playDevotee(s, ctx, 'A', cloth), /não é Devotee/);
  bases('A', 3); s.players.A.bases.forEach(b => { b.prepared = true; });
  respond(s, 'A', {speed: 'instant', run() {}});
  assert.throws(() => playDevotee(s, ctx, 'A', seiya), e => e instanceof RuleError && e.decision === 'P06');
});

test('G3-035: Base nova entra Prepared e paga no mesmo turno; Base não gasta converte em Latent no fim do turno', () => {
  const {s, toHand} = setup();
  const base = toHand('A', '053');
  startTurn(s);
  placeBase(s, 'A', base, cards.get('athena-v6-053'));
  assert.equal(s.players.A.bases.at(-1).prepared, true);
  spendBase(s, 'A', 1);
  assert.throws(() => spendBase(s, 'A', 1), /insuficientes/);
  endTurn(s); passAll(s);
  assert.equal(s.players.A.latent, 0, 'Base gasta não converte');
});

test('início do turno: prepara, depois gatilhos (APNAP/LIFO, com janela), depois compra', () => {
  const {s, end} = setup();
  const log = [];
  s.players.A.bases.push({uid: s.players.A.deck.shift(), prepared: false});
  startTurn(s); end(); startTurn(s); end();
  const seen = st => log.push(`base ${st.players.A.bases[0].prepared} mão ${st.players.A.hand.length}`);
  startTurn(s, [{controller: 'B', run: seen}, {controller: 'A', run: seen}]);
  assert.equal(s.players.A.hand.length, 0, 'compra espera os gatilhos');
  passAll(s);
  assert.deepEqual(log, ['base true mão 0', 'base true mão 0']);
  assert.equal(s.players.A.hand.length, 1, 'G3-037');
});

const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;

test('Equipment: Auto-Equip paga o Casting Cost; outro Devotee paga Equip {N} no lugar; sem janela', () => {
  const {s, ctx, objects, toHand, bases, field} = setup();
  const seiya = field('A', '001'), jabu = field('A', '028');
  const cloth = toHand('A', '002'), cloth2 = toHand('A', '002'); // Pegasus Cloth: 3 {B}, Auto-Equip Pegasus Seiya, Equip {5}
  bases('A', 7);
  startTurn(s);
  assert.deepEqual(playEquipment(s, ctx, 'A', cloth, seiya), {cost: {amount: 3, unit: 'base'}});
  assert.deepEqual([ctx.attached[cloth], ready(s, 'A'), s.window], [seiya, 4, null]);
  assert.throws(() => playEquipment(s, ctx, 'A', cloth2, jabu), /insuficientes \(4\/5\)/);
  assert.ok(s.players.A.hand.includes(cloth2), 'recusa não move a carta');
  checkInvariants(s, objects);
});

test('Equipment: "Any friendly Devotee" (044) paga Equip {N}; portador inimigo ou fora do campo é recusado', () => {
  const {s, ctx, toHand, bases, field} = setup();
  const seiya = field('A', '001'), enemy = field('B', '043'), cracked = toHand('A', '044'), inHand = toHand('A', '028');
  bases('A', 2);
  startTurn(s);
  assert.throws(() => playEquipment(s, ctx, 'A', cracked, enemy), /Devotee seu no campo/);
  assert.throws(() => playEquipment(s, ctx, 'A', cracked, inHand), /Devotee seu no campo/);
  playEquipment(s, ctx, 'A', cracked, seiya);
  assert.equal(ctx.attached[cracked], seiya);
  assert.equal(ready(s, 'A'), 0);
});

test('Technique (052): Sorcery, paga Base, resolve sem janela e vai para o Tartarus do Owner', () => {
  const {s, ctx, objects, toHand, bases} = setup();
  const wars = toHand('A', '052'), log = [];
  bases('A', 3);
  startTurn(s);
  assert.throws(() => playSpell(s, ctx, 'A', wars, {targets: ['x', 'y', 'z']}), /até dois/, 'escolha inválida recusa antes de pagar');
  assert.equal(ready(s, 'A'), 3, 'nada pago');
  playSpell(s, ctx, 'A', wars, () => log.push('efeito'));
  assert.deepEqual([log, s.window, ready(s, 'A')], [['efeito'], null, 0]);
  assert.ok(s.players.A.tartarus.includes(wars));
  checkInvariants(s, objects);
});

test('Technique fora do próprio turno ou com janela aberta é recusada', () => {
  const {s, ctx, toHand, bases} = setup();
  const own = toHand('A', '052'), enemy = toHand('B', '059');
  bases('A', 3);
  startTurn(s);
  assert.throws(() => playSpell(s, ctx, 'B', enemy, () => {}), /D1/);
  respond(s, 'A', {speed: 'instant', run() {}});
  assert.throws(() => playSpell(s, ctx, 'A', own, () => {}), e => e.decision === 'P06');
});

test('Moment (056) do defensor responde ao Strike, paga Latent, resolve antes do dano e vai para o Tartarus', () => {
  const {s, ctx, objects, toHand, field} = setup();
  const seiya = field('A', '001'), protect = toHand('B', '056'), log = [];
  s.players.B.latent = 2;
  startTurn(s);
  assert.throws(() => playSpell(s, ctx, 'B', protect, () => {}), /não pode jogar Instant/);
  assert.equal(s.players.B.latent, 2, 'nada pago');
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'});
  playSpell(s, ctx, 'B', protect, st => log.push(`soul ${st.players.B.soul}`));
  assert.deepEqual([s.players.B.latent, s.players.B.stack], [0, [protect]]);
  checkInvariants(s, objects);
  passAll(s);
  assert.deepEqual(log, ['soul 30']);
  assert.equal(s.players.B.soul, 28);
  assert.ok(s.players.B.tartarus.includes(protect));
  checkInvariants(s, objects);
});

test('Moment do ativo abre janela; 053 é Technique (autor, 28/10/2026)', () => {
  const {s, ctx, toHand, bases} = setup();
  const never = toHand('A', '054'), other = toHand('A', '053');
  bases('A', 2);
  s.players.A.latent = 3;
  startTurn(s);
  playSpell(s, ctx, 'A', never, () => {});
  assert.equal(s.window.priority, 'B');
  passAll(s);
  assert.ok(s.players.A.tartarus.includes(never));
  playSpell(s, ctx, 'A', other, () => {});
  assert.deepEqual([s.window, s.players.A.tartarus.includes(other)], [null, true], 'Sorcery: resolve sem janela');
});

test('Guia §63 (autor, 28/10/2026): segunda versão sai da mão, paga, entra e o controlador escolhe quem fica; genérico repete', () => {
  const {s, ctx, toHand, bases, field} = setup();
  const old = field('A', '021'); // Eagle Marin em campo
  const marin = toHand('A', '021'), guard = toHand('A', '040'), guard2 = toHand('A', '040');
  bases('A', 10);
  startTurn(s);
  const asked = [];
  ctx.decide = (player, q) => { asked.push(q); return marin; }; // fica a nova
  const ready = s.players.A.bases.filter(b => b.prepared).length;
  playDevotee(s, ctx, 'A', marin);
  assert.equal(s.players.A.bases.filter(b => b.prepared).length, ready - cards.get('athena-v6-021').cost.amount, 'pagou o custo');
  assert.deepEqual(asked.map(q => [q.decision, q.choose, q.options]), [['§63', 'keep', [old, marin]]]);
  assert.ok(s.players.A.battlefield.includes(marin) && !s.players.A.battlefield.includes(old));
  assert.ok(s.players.A.tartarus.includes(old));
  ctx.decide = () => { throw new Error('genérico não pergunta'); };
  playDevotee(s, ctx, 'A', guard); playDevotee(s, ctx, 'A', guard2); // Sanctuary Guard: genérico
  assert.equal(s.players.A.battlefield.filter(u => u.includes(':040:')).length, 2);
});

test('G3-040: personagem nomeado de classe baixa (Support) repete no campo; lendário só para guerreiros', () => {
  const {s, ctx, field} = setup();
  const a = field('A', '036'), b = field('A', '036'); // Seika: Devotee — Support
  ctx.decide = () => { throw new Error('classe baixa não pergunta'); };
  checkDefeats(s, ctx);
  assert.deepEqual(s.players.A.battlefield.filter(u => u === a || u === b).length, 2);
});

test('Guia §63: duplicata vinda de efeito — o controlador escolhe qual manter; a outra vai ao Tartarus sem ser destruição', () => {
  const {s, ctx, field} = setup();
  const first = field('A', '021'), second = field('A', '021'); // como se um efeito trouxesse outra Marin
  const asked = [];
  ctx.decide = (player, q) => { asked.push({player, ...q}); return second; };
  checkDefeats(s, ctx);
  assert.equal(asked.length, 1);
  assert.deepEqual([asked[0].player, asked[0].decision, asked[0].choose, asked[0].options], ['A', '§63', 'keep', [first, second]]);
  assert.deepEqual(s.players.A.battlefield, [second]);
  assert.ok(s.players.A.tartarus.includes(first));
  assert.ok(s.events.some(e => e.type === 'unique_removed' && e.uid === first));
  assert.ok(!s.events.some(e => e.type === 'destroyed'), 'não é destruição');
  ctx.decide = () => 'fora';
  field('A', '021');
  assert.throws(() => checkDefeats(s, ctx), e => e instanceof RuleError && e.decision === '§63', 'escolha fora das opções é recusada');
});

test('Guia §63: genéricos repetidos e personagens diferentes não pedem escolha', () => {
  const {s, ctx, field} = setup();
  field('A', '040'); field('A', '040'); field('A', '021'); field('A', '028');
  ctx.decide = () => { throw new Error('não devia perguntar'); };
  checkDefeats(s, ctx);
  assert.equal(s.players.A.battlefield.length, 4);
});

test('Guia §63 no protocolo de decisão: pergunta pendente ao controlador; timeout mantém o menor id estável (G3-030)', () => {
  const {s, ctx, field} = setup();
  const a = field('A', '021'), b = field('A', '021');
  const fn = () => checkDefeats(s, ctx);
  const r = runDecisions(s, ctx, fn);
  assert.equal(r.pending.player, 'A');
  assert.equal(r.pending.kind, 'choice');
  assert.deepEqual(r.pending.options, [a, b]);
  const done = resume(s, ctx, fn, r, {timeout: true});
  assert.ok(done.done);
  assert.deepEqual(s.players.A.battlefield, [[a, b].sort((x, y) => x.localeCompare(y, 'en', {numeric: true}))[0]]);
});
