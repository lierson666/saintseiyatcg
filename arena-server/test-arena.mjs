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
const [rush, fortress] = read('../tools/fixtures/decks-proposta-d171.json').decks;
let clock = 1000;
const arena = createArena({cards, canonIndex: index, now: () => clock});
const tossed = () => arena.create({players: {A: 'Seiya', B: 'Shiryu'}, decks: {A: rush, B: fortress}, seed: 42});
const fresh = () => { const rec = tossed(), {winner} = rec.match.state.coin; arena.act(rec, winner, {type: 'chooseFirst', choice: {goFirst: true}}); return rec; };

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

test('relógio no servidor: tempo esgotado no turno encerra o turno e o relógio passa ao outro', () => {
  const rec = fresh(), s = rec.match.state, [first, second] = s.setup;
  arena.act(rec, first, {type: 'mulligan', choice: {uids: []}});
  arena.act(rec, second, {type: 'mulligan', choice: {uids: []}});
  assert.equal(arena.view(rec, first).clock.running, first);
  clock += 50; arena.heartbeat(rec, 'A'); arena.heartbeat(rec, 'B'); arena.sweep();
  assert.ok(!s.events.some(e => e.type === 'TIMEOUT_END_TURN'), 'ainda tem tempo');
  clock += 50; arena.heartbeat(rec, 'A'); arena.heartbeat(rec, 'B'); arena.sweep();
  assert.ok(s.events.some(e => e.type === 'TIMEOUT_END_TURN' && e.player === first));
  for (let i = 0; i < 10 && s.window; i++) arena.act(rec, s.window.priority, {type: 'pass'});
  assert.equal(s.active, second);
  assert.equal(arena.view(rec, second).clock.running, second);
  assert.equal(arena.view(rec, second).clock.players[second].reserve, 90, 'o outro recebe os 90 s cheios'); // 90 s por ação (01/11/2026)
});

test('§55: a moeda vem do servidor, igual para os dois; só o vencedor escolhe; as mãos só existem depois', () => {
  const rec = tossed(), s = rec.match.state, {winner} = s.coin, foe = winner === 'A' ? 'B' : 'A';
  const a = arena.view(rec, 'A').state, b = arena.view(rec, 'B').state;
  assert.deepEqual(a.coin, b.coin);
  assert.deepEqual([a.coin.first, a.players.A.hand.length, a.players.B.hand.length], [null, 0, 0]);
  assert.throws(() => arena.act(rec, foe, {type: 'chooseFirst', choice: {goFirst: true}}), e => e.decision === 'P01');
  assert.throws(() => arena.act(rec, winner, {type: 'mulligan', choice: {uids: []}}), e => e.decision === 'P01');
  arena.act(rec, winner, {type: 'chooseFirst', choice: {goFirst: false}});
  const view = arena.view(rec, foe).state;
  assert.deepEqual([view.coin.first, view.active, view.setup], [foe, foe, [foe, winner]]);
  assert.equal(view.players[foe].hand.length, 7);
});

test('§55: sem escolha em 30 s, quem venceu a moeda começa', () => {
  const rec = tossed(), s = rec.match.state, {winner} = s.coin;
  arena.heartbeat(rec, 'A'); arena.heartbeat(rec, 'B');
  clock += 29; arena.sweep();
  assert.equal(s.coin.first, null);
  arena.heartbeat(rec, 'A'); arena.heartbeat(rec, 'B');
  clock += 2; arena.sweep();
  assert.deepEqual([s.coin.first, s.active, s.setup[0]], [winner, winner, winner]);
});
