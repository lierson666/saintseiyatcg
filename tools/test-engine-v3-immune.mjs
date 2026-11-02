// Keyword Imune a X (guia §43A, autor 02/11/2026) e armas de Libra.
// node --test tools/test-engine-v3-immune.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll, addSeal} from '../playtest/engine-v3/core.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';
import {atkOf, hpOf, keywordsOf, damageDevotee} from '../playtest/engine-v3/effects.js';
import {commandTargets} from '../playtest/engine-v3/gods.js';
import {strikeTargets, declareStrike} from '../playtest/engine-v3/strike.js';
import * as k from '../playtest/engine-v3/v6/kit.js';
import {guardDecide} from './engine-test-upto.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const [rush, fortress] = read('./fixtures/decks-proposta-d171.json').decks;

// A joga Athena; B joga `god`. Cartas entram em campo direto, pelo id.
function setup(god = 'god-hades') {
  const m = createMatch({cards, canonIndex: index, decks: {A: rush, B: fortress}, gods: {A: 'god-athena', B: god}, first: 'A', seed: 3});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null;
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached, decide: (p, q) => (q.options ? q.options[0] : true)});
  bindContext(s, ctx);
  let n = 0;
  const make = (key, cardId) => { const uid = `t${n++}`; ctx.objects[uid] = {cardId, owner: key}; return uid; };
  const field = (key, cardId) => { const uid = make(key, cardId); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0, entered: 0}; return uid; };
  const equip = (key, cardId, bearer) => { const uid = make(key, cardId); s.players[key].battlefield.push(uid); ctx.attached[uid] = bearer; return uid; };
  startTurn(s);
  return {s, ctx, field, equip, A: s.players.A, B: s.players.B};
}
const SWORD = 'athena-v6-048', SHIELD = 'athena-v6-049';
const cheap = 'artemis-v6-398', big = 'artemis-v6-383'; // Lunar Nymph custo 2; Silver Moon Bear custo 4
const resolving = (s, controller, uid, fn) => { s.resolving = {uid, controller}; try { return fn(); } finally { delete s.resolving; } };

test('as armas custam 3 e Equip 5, dão +2/+2, e a Espada dá Nimble', () => {
  for (const id of [SWORD, SHIELD]) assert.equal(cards.get(id).cost.amount, 3);
  assert.deepEqual(cards.get(SWORD).equipped, {atk: 2, hp: 2, keywords: ['Nimble']});
  assert.deepEqual(cards.get(SHIELD).equipped, {atk: 2, hp: 2, keywords: []});
  const {s, ctx, field, equip} = setup(), bearer = field('A', cheap), atk = atkOf(s, ctx, bearer), hp = hpOf(s, ctx, bearer);
  equip('A', SWORD, bearer);
  assert.deepEqual([atkOf(s, ctx, bearer), hpOf(s, ctx, bearer)], [atk + 2, hp + 2]);
  assert.ok(keywordsOf(s, ctx, bearer).includes('Nimble'));
});

test('Espada: Devotee de custo 3 ou menos não mira o portador, e o de custo 4 só com Nimble', () => {
  const {s, ctx, field, equip} = setup(), bearer = field('A', cheap);
  equip('A', SWORD, bearer);
  s.active = 'B';
  const has = uid => strikeTargets(s, ctx, uid).some(t => t.uid === bearer);
  assert.equal(has(field('B', cheap)), false);
  assert.equal(has(field('B', big)), false, 'custo 4 sem Nimble não alcança o portador com Nimble');
});

test('Imune: Guardian Imune não obriga o atacante X', () => {
  const {s, ctx, field, equip} = setup(), keeper = field('A', 'artemis-v6-395'); // Moon Temple Sentinel, Guardian
  equip('A', SHIELD, keeper);
  s.active = 'B';
  const attacker = field('B', cheap);
  assert.deepEqual(strikeTargets(s, ctx, attacker).map(t => t.uid ?? t.kind), [keeper], 'fonte fora de X segue obrigada');
  const shade = field('B', 'hades-v6-211');
  const list = strikeTargets(s, ctx, shade);
  assert.ok(!list.some(t => t.uid === keeper) && list.some(t => t.kind === 'god'), 'Hades ignora o Guardian Imune e vai ao God');
});

test('Imune: dano, Seal, buff, marcador, derrota e área de X não afetam; aliado e fonte de fora afetam', () => {
  const {s, ctx, field, equip} = setup(), bearer = field('A', cheap), ally = field('A', cheap);
  equip('A', SHIELD, bearer);
  const src = field('B', 'hades-v6-211'), atk = atkOf(s, ctx, bearer);
  resolving(s, 'B', src, () => {
    assert.deepEqual(k.enemies(s, ctx, 'B'), [ally]);
    damageDevotee(s, ctx, bearer, 3, false);
    addSeal(s, ctx, [bearer], 1, 'teste');
    k.buff(s, bearer, -1, -1);
    k.addCounter(s, bearer, -1);
    k.defeat(s, ctx, bearer);
  });
  assert.equal(s.units[bearer].damage, 0);
  assert.ok(!s.units[bearer].seal);
  assert.equal(atkOf(s, ctx, bearer), atk);
  assert.ok(s.players.A.battlefield.includes(bearer));
  resolving(s, 'B', field('B', cheap), () => damageDevotee(s, ctx, bearer, 1, false));
  assert.equal(s.units[bearer].damage, 1, 'Artemis não é X');
  resolving(s, 'A', ally, () => k.buff(s, bearer, 1, 1));
  assert.equal(atkOf(s, ctx, bearer), atk + 1, 'fonte aliada afeta');
});

test('Imune: poder de God de X também não pega, e efeito já aplicado continua', () => {
  const {s, ctx, field, equip} = setup('god-hades'), bearer = field('A', cheap);
  k.buff(s, bearer, -1, 0);
  const atk = atkOf(s, ctx, bearer);
  equip('A', SHIELD, bearer);
  assert.equal(atkOf(s, ctx, bearer), atk + 2, 'o -1 anterior continua');
  assert.ok(!commandTargets(s, ctx, 'B').includes(bearer));
  resolving(s, 'B', `command:${bearer}`, () => k.buff(s, bearer, -1, -1));
  assert.equal(atkOf(s, ctx, bearer), atk + 2);
});

test('Strike: portador da Espada não sofre retaliação de custo 3 ou menos', () => {
  const {s, ctx, field, equip} = setup(), bearer = field('A', cheap), foe = field('B', cheap);
  equip('A', SWORD, bearer);
  declareStrike(s, ctx, bearer, {kind: 'devotee', uid: foe}); passAll(s);
  assert.equal(s.units[bearer].damage, 0);
});

test('Espada acerta o God: inimigo descarta 1 e as Bases preparam, sem limite', () => {
  const {s, ctx, field, equip, A, B} = setup(), bearer = field('A', cheap);
  equip('A', SWORD, bearer);
  A.bases = A.deck.splice(0, 3).map(uid => ({uid, prepared: false}));
  B.hand.push(B.deck.shift(), B.deck.shift());
  const hand = B.hand.length, soul = B.soul;
  declareStrike(s, ctx, bearer, {kind: 'god', player: 'B'}); passAll(s); passAll(s);
  assert.ok(B.soul < soul);
  assert.equal(B.hand.length, hand - 1);
  assert.ok(A.bases.every(b => b.prepared));
});

test('Escudo acerta o God: ganha 2 Soul e compra 1', () => {
  const {s, ctx, field, equip, A, B} = setup(), bearer = field('A', cheap);
  equip('A', SHIELD, bearer);
  A.soul = 10;
  const hand = A.hand.length;
  declareStrike(s, ctx, bearer, {kind: 'god', player: 'B'}); passAll(s); passAll(s);
  assert.deepEqual([A.soul, A.hand.length], [12, hand + 1]);
});

test('Ninfa Lunar e Chandra não miram a si mesmas', () => {
  for (const line of ['artemis-v6-398', 'artemis-v6-371']) {
    assert.match(cards.get(line).text || JSON.stringify(cards.get(line)), /another target friendly Devotee/);
  }
});
