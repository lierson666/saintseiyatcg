// Catálogo D268 + decks aprovados + núcleo 3.0. node --test tools/test-engine-v3-match.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch, mulligan} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, RuleError, placeBase, destroyDevotee, checkInvariants, NotSpecified} from '../playtest/engine-v3/core.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const index = canonIndex(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;
const match = (seed = 7, first = 'A') => createMatch({cards, canonIndex: index, decks: {A: rush, B: fortress}, seed, first});
const keepAll = m => m.state.order.forEach(k => mulligan(m, k, []));

test('parser lê os 95 registros sem alterar texto e com os números impressos', () => {
  assert.equal(cards.size, 95);
  for (const r of [...canon.cards, ...canon.gods]) assert.equal(cards.get(r.id.toLowerCase()).text, r.approved_current_text_as_of_d268);
  assert.deepEqual([...cards.values()].filter(c => c.kind === 'Devotee' && (c.atk == null || c.hp == null)), []);
  assert.equal(cards.get('athena-v6-019').cosmoble, false); // Kamui: Cosmoble No
  assert.deepEqual(['athena', 'poseidon', 'hades', 'artemis', 'ares'].map(g => cards.get(`god-${g}`).soul), [30, 27, 32, 24, 30]);
  for (const n of ['062', '063', '064', '065']) assert.equal(cards.get(`athena-v6-${n}`).cost, null, 'D196');
  assert.deepEqual(cards.get('athena-v6-054').cost, {amount: 3, unit: 'latent'});
  assert.deepEqual(cards.get('athena-v6-014').autoEquip, ['Gemini Saga', 'Dragon Shiryu']);
  assert.deepEqual([cards.get('athena-v6-044').autoEquip, cards.get('athena-v6-044').equip], [[], {amount: 2, who: 'any'}]);
  assert.deepEqual(cards.get('athena-v6-019').equip, {amount: 6, who: 'other'});
});

test('partida Athena × Athena: 60 objetos por deck, God e Domain fora, Soul do God', () => {
  const {state, objects} = match();
  assert.equal(Object.keys(objects).length, 120);
  assert.deepEqual([state.players.A.deck.length, state.players.B.deck.length, state.players.A.hand.length, state.players.B.hand.length], [53, 53, 7, 7]); // P01: mão de 7
  assert.deepEqual([state.players.A.soul, state.players.B.soul], [30, 30]);
  assert.deepEqual(state.domains, {A: 'athena-v6-062', B: 'athena-v6-064'});
  assert.ok(![...state.players.A.deck, ...state.players.A.hand].some(uid => /:06[2-5]:/.test(uid)));
  checkInvariants(state, objects);
});

test('mesma seed, mesma ordem; seed diferente, ordem diferente', () => {
  assert.deepEqual(match(7).state.players.A.hand, match(7).state.players.A.hand);
  assert.notDeepEqual(match(7).state.players.A.hand, match(8).state.players.A.hand);
});

test('deck inválido é recusado ao montar a partida', () => {
  const bad = {...rush, main_deck: [...rush.main_deck, {card_id: 'athena-v6-001', quantity: 1}]};
  assert.throws(() => createMatch({cards, canonIndex: index, decks: {A: bad, B: fortress}}), /Deck A inválido/);
});

test('Destroy leva Devotee e Armor para o Tartarus do Owner; Equipment não-Armor fica bloqueado', () => {
  const {state, objects, attached} = match();
  const take = id => { const p = state.players.A, uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); p.battlefield.push(uid); return uid; };
  const seiya = take('001'), cloth = take('002');
  attached[cloth] = seiya;
  destroyDevotee(state, seiya, objects, attached);
  assert.deepEqual(state.players.A.tartarus, [seiya, cloth]);
  assert.deepEqual(attached, {});
  checkInvariants(state, objects);
  const {state: s2, objects: o2, attached: a2} = createMatch({cards, canonIndex: index, decks: {A: fortress, B: rush}});
  const p = s2.players.A, shiryu = p.deck.find(u => u.includes(':003:')), shield = p.deck.find(u => u.includes(':045:'));
  for (const u of [shiryu, shield]) { p.deck.splice(p.deck.indexOf(u), 1); p.battlefield.push(u); }
  a2[shield] = shiryu;
  assert.throws(() => destroyDevotee(s2, shiryu, o2, a2), NotSpecified);
});

test('simulação reproduzível de compra e Base até a Fatigue (P07) encerrar a partida, sem perder objetos', () => {
  const m = match(42), {state, objects} = m;
  keepAll(m);
  const log = [];
  for (let turn = 0; turn < 80 && !state.victory; turn++) {
    startTurn(state);
    if (state.victory) break;
    const p = state.players[state.active];
    const base = p.hand.find(uid => cards.get(objects[uid].cardId).cosmoble);
    if (base) placeBase(state, state.active, base, cards.get(objects[base].cardId));
    log.push(`R${state.round} ${state.active} mão ${p.hand.length} deck ${p.deck.length} bases ${p.bases.length} latent ${p.latent} soul ${p.soul}`);
    endTurn(state); passAll(state);
    checkInvariants(state, objects);
  }
  // P01: deck 53; D170 + D3: 26 compras completas deixam 1 carta. A partir do 28º turno próprio, cada compra falha
  // tira 1, 2, 3… (P07). A, inicial, chega à 8ª falha (1+…+8 = 36 ≥ 30) no 32º turno, um antes de B.
  assert.deepEqual(state.victory, {winner: 'B'});
  assert.equal(log.length, 62);
  assert.match(log[0], /^R1 A mão 6 deck 53 bases 1/);
  assert.match(log.at(-1), /^R31 B .* soul 2$/);
  assert.ok(state.players.A.latent <= 3 && state.players.B.latent <= 3);
});

test('P01: quem começa é sorteado pela seed; o inicial faz o mulligan primeiro; só um por jogador', () => {
  const firsts = new Set(Array.from({length: 20}, (_, seed) => createMatch({cards, canonIndex: index, decks: {A: rush, B: fortress}, seed}).state.active));
  assert.deepEqual([...firsts].sort(), ['A', 'B']);
  const m = match(9, 'B');
  assert.deepEqual([m.state.active, m.state.setup], ['B', ['B', 'A']]);
  assert.throws(() => mulligan(m, 'A', []), e => e instanceof RuleError && e.decision === 'P01');
  assert.throws(() => startTurn(m.state), /mulligan pendente/);
  mulligan(m, 'B', []);
  assert.throws(() => mulligan(m, 'B', []), /vez/);
});

test('P01: mulligan parcial devolve N, embaralha e compra N; mão fica com 7 e nada se perde', () => {
  const m = match(11), {state, objects} = m, p = state.players.A;
  const back = p.hand.slice(0, 3), kept = p.hand.slice(3);
  assert.throws(() => mulligan(m, 'A', [state.players.B.hand[0]]), /fora da mão/);
  assert.throws(() => mulligan(m, 'A', [back[0], back[0]]), /fora da mão/);
  mulligan(m, 'A', back);
  assert.equal(p.hand.length, 7);
  assert.deepEqual(p.hand.slice(0, 4), kept);
  assert.equal(p.deck.length, 53);
  mulligan(m, 'B', []);
  assert.equal(state.setup, null);
  checkInvariants(state, objects);
  startTurn(state);
  assert.equal(p.hand.length, 7, 'D170: sem compra no 1º turno');
});
