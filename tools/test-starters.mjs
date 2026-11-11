// Starter Decks do Onboarding 2.0: legalidade, 1 carta de alto escalão e coleção inicial igual às listas. node tools/test-starters.mjs
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {catalog} from './simulate-v3.mjs';
import {validateDeck} from '../shared/deck-v3.js';

const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const {decks} = read('data/alpha-0.1/decks-starters.json'), {starter} = read('sanctuary-api/catalog.json');
const rarity = new Map(read('data/cards.json').cartas.map(c => [c.id, c.raridade])), {index} = catalog();
assert.deepEqual(decks.map(d => d.god).sort(), ['god-ares', 'god-artemis', 'god-athena', 'god-hades', 'god-poseidon']);
const need = {};
for (const d of decks) {
  assert.deepEqual(validateDeck(d, index), [], d.id);
  assert.equal(d.main_deck.reduce((n, e) => n + e.quantity, 0), 50, d.id);
  const high = d.main_deck.filter(e => ['Legendary', 'Divine'].includes(rarity.get(e.card_id)));
  assert.deepEqual(high.map(e => [e.card_id, e.quantity]), [[d.alto_escalao, 1]], d.id);
  for (const e of d.main_deck) need[e.card_id] = (need[e.card_id] || 0) + e.quantity;
}
assert.deepEqual(Object.fromEntries(Object.entries(starter).sort()), Object.fromEntries(Object.entries(need).sort()));
console.log('ok   5 starters legais, 1 alto escalão cada, coleção inicial igual às listas');
