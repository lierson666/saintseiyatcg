// §55 (autor, 01/11/2026): compra de 2 por turno e limite de 9 cartas na mão na End Phase.
// node --test tools/test-engine-v3-hand-limit.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll} from '../playtest/engine-v3/core.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';
import {applyAction, advance} from '../playtest/engine-v3/actions.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('./fixtures/decks-proposta-d171.json').decks;

function setup() {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, gods: {A: 'god-athena', B: 'god-athena'}, first: 'A', seed: 3});
  m.state.setup = null;
  const asked = [], ctx = {cards, objects: m.objects, attached: m.attached, decide: (key, q) => { asked.push(q); return q.options?.[0] ?? true; }};
  bindContext(m.state, ctx);
  startTurn(m.state);
  return {m, s: m.state, ctx, asked, A: m.state.players.A, B: m.state.players.B};
}
const end = ({m, ctx}, key = 'A') => applyAction(m, ctx, {type: 'endTurn', key});

test('compra 2 por turno; só quem começa não compra no 1º turno', () => {
  const t = setup(), first = t.A.hand.length, second = t.B.hand.length;
  assert.equal(t.A.hand.length, first);
  end(t); passAll(t.s); advance(t.m);
  assert.equal(t.s.active, 'B');
  assert.equal(t.B.hand.length, second + 2, 'B compra já no primeiro turno');
  end(t, 'B'); passAll(t.s); advance(t.m); // novo Round
  const key = t.s.active, own = t.s.players[key];
  assert.equal(own.ownTurns, 2);
  assert.equal(own.hand.length, (key === 'A' ? first : second) + 2);
});

test('END TURN com 12 cartas: escolhe 3, vão ao Tartarus e fica com 9', () => {
  const t = setup();
  while (t.A.hand.length < 12) t.A.hand.push(t.A.deck.shift());
  const excess = t.A.hand.slice(0, 3), tartarus = t.A.tartarus.length;
  end(t);
  assert.equal(t.A.hand.length, 9);
  assert.equal(t.A.tartarus.length, tartarus + 3);
  assert.ok(excess.every(uid => t.A.tartarus.includes(uid)));
  assert.equal(t.asked.filter(q => q.ability === 'Hand limit').length, 3);
});

test('com 9 cartas ou menos não há descarte', () => {
  const t = setup();
  while (t.A.hand.length < 9) t.A.hand.push(t.A.deck.shift());
  end(t);
  assert.equal(t.A.hand.length, 9);
  assert.equal(t.asked.length, 0);
});
