// Escolha de Base da IA (playtest/divine/ai.js), rebalanceamento de Cosmoble de 31/10/2026.
// node --test tools/test-divine-ai-base.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createAI} from '../playtest/divine/ai.js';

function pick(hand, bases = 0) {
  const info = Object.fromEntries(Object.entries(hand).map(([u, c]) => [u, c]));
  const s = {turn: 1, players: {A: {hand: Object.keys(hand), bases: Array(bases).fill({}), battlefield: []}}, order: ['A', 'B']};
  const ai = createAI({S: () => s, info: u => info[u], known: () => true, canBase: () => true, placeBase: () => {}});
  return ai.next('A').id.split('base:')[1];
}

test('IA põe como Base a cópia repetida antes de qualquer outra', () => {
  const twin = {kind: 'Devotee', cost: {amount: 2}};
  assert.ok(['a', 'b'].includes(pick({a: twin, b: twin, c: {kind: 'Spell', cost: {amount: 6}}})));
});

test('IA guarda a carta que cabe no próximo turno e põe como Base a que não cabe', () => {
  assert.equal(pick({curve: {kind: 'Spell', cost: {amount: 2}}, top: {kind: 'Devotee', cost: {amount: 6}}}, 1), 'top');
});

// Domains (rebalanceamento, 01/11/2026): a IA usa a Ressonância antes dos Strikes; a ativada de compra só com Soul de sobra.
test('IA usa a Ressonância do Domain e, com Soul baixo, não usa a ativada de compra', () => {
  const s = {turn: 3, divine: {A: {god: 'god-hades'}}, players: {A: {hand: [], bases: [], battlefield: [], soul: 8}}, order: ['A', 'B']};
  const calls = [];
  const ai = createAI({S: () => s, info: () => ({}), known: () => true, canBase: () => false, playableReason: () => 'x', STEPS: {},
    domainUses: () => ({res: true, general: {cost: 0}}), activate: (key, uid) => calls.push(uid)});
  const first = ai.next('A');
  first.run(); ai.refuse(first);
  assert.deepEqual(calls, ['domain:A:res']);
  assert.equal(ai.next('A'), null, 'compra com drawback de Soul: só com Soul acima de 12');
  s.players.A.soul = 20;
  ai.next('A').run();
  assert.deepEqual(calls, ['domain:A:res', 'domain:A']);
});
