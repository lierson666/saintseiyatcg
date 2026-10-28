// Início do turno e estado de entrada 3.0 (ALPHA-P02 opção A, aprovada em 28/10/2026). node --test tools/test-engine-v3-play.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, placeBase, spendBase, respond, checkInvariants, RuleError} from '../playtest/engine-v3/core.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {playDevotee} from '../playtest/engine-v3/play.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

function setup(cardsMap = cards) {
  const m = createMatch({cards: cardsMap, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, seed: 5});
  const ctx = {cards: cardsMap, objects: m.objects, attached: m.attached}, s = m.state;
  const take = (key, id) => { const p = s.players[key], uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); return uid; };
  const toHand = (key, id) => { const uid = take(key, id); s.players[key].hand.push(uid); return uid; };
  const bases = (key, n) => { for (let i = 0; i < n; i++) s.players[key].bases.push({uid: s.players[key].deck.shift(), prepared: false}); };
  const end = () => { endTurn(s); passAll(s); };
  return {s, ctx, objects: m.objects, toHand, bases, end};
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

test('Base nova entra Unprepared: não gera Cosmo nem converte em Latent no turno em que entra', () => {
  const {s, toHand} = setup();
  const base = toHand('A', '053');
  startTurn(s);
  placeBase(s, 'A', base, cards.get('athena-v6-053'));
  assert.throws(() => spendBase(s, 'A', 1), /insuficientes/);
  endTurn(s); passAll(s);
  assert.equal(s.players.A.latent, 0);
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
  assert.equal(s.players.A.hand.length, 2);
});
