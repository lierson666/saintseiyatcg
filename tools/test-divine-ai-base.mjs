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

// Divine Judgment: a IA dispara a Exclamation mesmo no hard e paga o contador só no último Round do prazo.
function divine({god = 'god-athena', mine = ['g1', 'g2', 'g3'], foes = [], round = 3, soul = 25, judgment = null, level = 'hard'}) {
  const type = {g1: 'Devotee — Gold Saint', g2: 'Devotee — Gold Saint', g3: 'Devotee — Silver Saint'};
  const s = {turn: round * 2, round, active: 'A', order: ['A', 'B'], units: Object.fromEntries(mine.map(u => [u, {prepared: true}])), divine: {A: {god, judgment, ultimateUsed: false}, B: {}},
    players: {A: {hand: [], bases: Array(9).fill({}), battlefield: mine, tartarus: [], soul: 20, latent: 0}, B: {hand: [], battlefield: foes, soul, latent: 0}}};
  const shots = [];
  const ai = createAI({level: () => level, S: () => s, ctx: () => ({}), info: u => ({kind: 'Devotee', type: type[u] || 'Devotee — Warrior', cost: {amount: u === 'g3' ? 1 : 5}}), known: () => true, canBase: () => false, playableReason: () => 'x', STEPS: {},
    isSaint: u => /Saint/.test(type[u] || ''), atk: () => 3, hp: () => 3, ultimateBlock: () => null, announceExclamation: (k, t) => shots.push(t), strikeTargets: () => []});
  return {ai, shots};
}

test('Exclamation: só dispara se for letal ou no Round 6', () => {
  const fires = o => { const {ai, shots} = divine(o); ai.next('A')?.run(); return shots.length === 1; };
  assert.equal(fires({foes: ['x', 'y', 'z']}), false);
  assert.equal(fires({foes: ['x', 'y', 'z'], soul: 9}), true); // 3 + 3 + 3
  assert.equal(fires({foes: ['x', 'y', 'z'], round: 6}), true);
});

test('Judgment: a IA espera o último Round do prazo e easy não paga', () => {
  const asks = o => divine({god: 'god-hades', judgment: {deadline: 4}, ...o}).ai.next('A')?.id.endsWith(':judgment') ?? false;
  assert.equal(asks({round: 3}), false);
  assert.equal(asks({round: 4}), true);
  assert.equal(asks({round: 4, level: 'easy'}), false);
  assert.equal(asks({round: 4, mine: ['g1', 'g2']}), false);
});


// Domains (rebalanceamento, 01/11/2026): a IA usa a Ressonância antes dos Strikes; a ativada de compra só com Soul de sobra.
test('IA usa a Ressonância do Domain e, com Soul baixo, não usa a ativada de compra', () => {
  const s = {turn: 3, divine: {A: {god: 'god-hades'}}, players: {A: {hand: [], bases: [], battlefield: [], soul: 8, deck: Array(30)}}, order: ['A', 'B']};
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

// Dificuldade (autor, 01/11/2026): só easy deixa de responder; com deck curto, a IA não usa a compra que mói (deck vazio perde, §55).
test('Moment de contra-mágica: easy passa, normal responde à Spell inimiga', () => {
  const s = {turn: 4, active: 'B', events: [], chain: [{controller: 'B', uid: 'B:1', spell: true}], window: {priority: 'A'},
    players: {A: {hand: ['A:9'], soul: 20}, B: {battlefield: []}}, order: ['A', 'B']};
  const cards = {'A:9': {kind: 'Spell', text: 'Counter target enemy Moment or Technique.', cost: {amount: 2}}, 'B:1': {kind: 'Spell', cost: {amount: 3}}};
  const make = level => createAI({level: () => level, S: () => s, info: u => cards[u], known: () => true, num: () => '133', STEPS: {}, playableReason: () => null, playSpell: () => {}});
  assert.equal(make('easy').respond('A'), null);
  assert.equal(make('normal').respond('A').src, 'A:9');
});
test('Compra que mói: com deck curto a IA não ativa', () => {
  const s = {turn: 3, divine: {A: {god: 'god-hades'}}, players: {A: {hand: [], bases: [], battlefield: [], soul: 20, deck: Array(20)}}, order: ['A', 'B']};
  const ai = createAI({S: () => s, info: () => ({}), known: () => true, canBase: () => false, playableReason: () => 'x', STEPS: {}, domainUses: () => ({res: false, general: {cost: 0}}), activate: () => {}});
  assert.equal(ai.next('A'), null);
});
