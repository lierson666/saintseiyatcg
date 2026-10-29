// Testes do núcleo do duelo online: node --test arena-server/test-arena.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createArena} from './arena.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon), index = canonIndex(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;
let clock = 1000;
const arena = createArena({cards, canonIndex: index, now: () => clock});
const fresh = () => arena.create({players: {A: 'Seiya', B: 'Shiryu'}, decks: {A: rush, B: fortress}, seed: 42});

test('a visão de um jogador não revela a mão, o deck nem as Bases do adversário', () => {
  const rec = fresh(), s = rec.match.state;
  const v = arena.view(rec, 'A'), json = JSON.stringify(v);
  for (const uid of s.players.B.hand) {
    assert.equal(v.objects[uid], undefined, 'mão de B sem carta para A');
    assert.ok(!uid.includes(':0') || !/:\d{3}:/.test(uid), 'uid opaco');
  }
  for (const uid of [...s.players.A.deck, ...s.players.B.deck]) assert.equal(v.objects[uid], undefined, 'deck escondido');
  for (const uid of s.players.A.hand) assert.ok(v.objects[uid].cardId, 'a própria mão aparece');
  assert.ok(!/"onClose"|"resolve"/.test(json), 'sem funções na visão');
  assert.equal(v.you, 'A');
});

test('cada um só age por si; ação recusada não muda nada; o turno anda pelo servidor', () => {
  const rec = fresh(), s = rec.match.state, first = s.setup[0], second = s.setup[1];
  assert.throws(() => arena.act(rec, second, {type: 'mulligan', choice: {uids: []}}), /mulligan|P01/);
  arena.act(rec, first, {type: 'mulligan', key: second, choice: {uids: []}}); // a chave enviada é ignorada
  arena.act(rec, second, {type: 'mulligan', choice: {uids: []}});
  assert.equal(s.setup, null);
  assert.equal(s.turn, 1);
  const before = JSON.stringify(arena.view(rec, first).state.players);
  assert.throws(() => arena.act(rec, second, {type: 'endTurn'}), /D1|turno/);
  assert.equal(JSON.stringify(arena.view(rec, first).state.players), before);
  arena.act(rec, first, {type: 'endTurn'});
  for (let i = 0; i < 10 && s.window; i++) arena.act(rec, s.window.priority, {type: 'pass'});
  assert.equal(s.active, second, 'o turno passou para o outro jogador');
});

test('desistir e abandono (90 s sem conexão) encerram a partida', () => {
  const a = fresh();
  arena.concede(a, 'A');
  assert.deepEqual(a.match.state.victory, {winner: 'B', reason: 'concede'});
  assert.ok(a.match.state.victory);
  const b = fresh();
  arena.heartbeat(b, 'A');
  clock += 91; arena.heartbeat(b, 'A');
  arena.sweep();
  assert.ok(b.match.state.victory, 'B sumiu e perdeu');
});
