// Catálogo D268 + decks aprovados + núcleo 3.0. node --test tools/test-engine-v3-match.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, placeBase, destroyDevotee, checkInvariants, NotSpecified} from '../playtest/engine-v3/core.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const index = canonIndex(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;
const match = (seed = 7) => createMatch({cards, canonIndex: index, decks: {A: rush, B: fortress}, seed});

test('parser lê os 95 registros sem alterar texto e com os números impressos', () => {
  assert.equal(cards.size, 95);
  for (const r of [...canon.cards, ...canon.gods]) assert.equal(cards.get(r.id.toLowerCase()).text, r.approved_current_text_as_of_d268);
  assert.deepEqual([...cards.values()].filter(c => c.kind === 'Devotee' && (c.atk == null || c.hp == null)), []);
  assert.equal(cards.get('athena-v6-019').cosmoble, false); // Kamui: Cosmoble No
  assert.deepEqual(['athena', 'poseidon', 'hades', 'artemis', 'ares'].map(g => cards.get(`god-${g}`).soul), [30, 27, 32, 24, 30]);
  for (const n of ['062', '063', '064', '065']) assert.equal(cards.get(`athena-v6-${n}`).cost, null, 'D196');
  assert.deepEqual(cards.get('athena-v6-054').cost, {amount: 3, unit: 'latent'});
});

test('partida Athena × Athena: 60 objetos por deck, God e Domain fora, Soul do God', () => {
  const {state, objects} = match();
  assert.equal(Object.keys(objects).length, 120);
  assert.deepEqual([state.players.A.deck.length, state.players.B.deck.length], [60, 60]);
  assert.deepEqual([state.players.A.soul, state.players.B.soul], [30, 30]);
  assert.deepEqual(state.domains, {A: 'athena-v6-062', B: 'athena-v6-064'});
  assert.ok(!state.players.A.deck.some(uid => /:06[2-5]:/.test(uid)));
  checkInvariants(state, objects);
});

test('mesma seed, mesma ordem; seed diferente, ordem diferente', () => {
  assert.deepEqual(match(7).state.players.A.deck, match(7).state.players.A.deck);
  assert.notDeepEqual(match(7).state.players.A.deck, match(8).state.players.A.deck);
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

test('simulação reproduzível: 31 turnos próprios de compra e Base até a Fatigue bloquear, sem perder objetos', () => {
  const {state, objects} = match(42);
  const log = [];
  let blocked = null;
  for (let turn = 0; turn < 80 && !blocked; turn++) {
    try { startTurn(state); } catch (e) { if (e instanceof NotSpecified) { blocked = e.topic; break; } throw e; }
    const p = state.players[state.active];
    const base = p.hand.find(uid => cards.get(objects[uid].cardId).cosmoble);
    if (base) placeBase(state, state.active, base, cards.get(objects[base].cardId));
    log.push(`R${state.round} ${state.active} mão ${p.hand.length} deck ${p.deck.length} bases ${p.bases.length} latent ${p.latent}`);
    endTurn(state);
    checkInvariants(state, objects);
  }
  // Sem mão inicial (P01): 1º turno de cada um sem compra (D170), depois 2 por turno (D3): 60 cartas = 30 turnos próprios.
  assert.match(blocked, /D174/);
  assert.equal(state.players.A.deck.length + state.players.B.deck.length, 0);
  assert.equal(log.length, 62);
  assert.match(log[0], /^R1 A mão 0 deck 60 bases 0/);
  assert.ok(state.players.A.latent <= 3 && state.players.B.latent <= 3);
});
