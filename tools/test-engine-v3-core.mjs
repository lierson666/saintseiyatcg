// Núcleo 3.0: só regras canônicas e confirmadas. node --test tools/test-engine-v3-core.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCore, startTurn, endTurn, draw, mill, placeBase, spendBase, gainLatent, loseSoul, recordStrike,
  useOncePerRound, addEffect, spellCategory, passAll, respond, RuleError, NotSpecified} from '../playtest/engine-v3/core.js';

const deck = n => Array.from({length: n}, (_, i) => `c${i}`);
const core = (size = 20) => createCore({soul: {A: 30, B: 30}, decks: {A: deck(size), B: deck(size)}});
const cosmoble = {cosmoble: true};
const end = (s, triggers) => { endTurn(s, triggers); return passAll(s); }; // os dois passam na End Phase

test('D170/D3: sem compra no 1º turno próprio; 2 cartas a partir do 2º', () => {
  const s = core();
  startTurn(s); assert.equal(s.players.A.hand.length, 0);
  end(s); startTurn(s); assert.equal(s.players.B.hand.length, 0);
  end(s); startTurn(s); assert.equal(s.players.A.hand.length, 2);
});

test('D191: Round = um turno de cada jogador, na ordem do jogador inicial', () => {
  const s = core();
  startTurn(s); assert.deepEqual([s.round, s.active], [1, 'A']);
  end(s); assert.deepEqual([s.round, s.active], [1, 'B']);
  startTurn(s); end(s); assert.deepEqual([s.round, s.active, s.turnInRound], [2, 'A', 0]);
});

test('D4: uma Base Cosmoble por turno, só no próprio turno; Bases preparam no início do turno', () => {
  const s = core();
  s.players.A.hand.push('x', 'y', 'z');
  startTurn(s);
  assert.throws(() => placeBase(s, 'A', 'x', {cosmoble: false}), e => e instanceof RuleError && e.decision === 'D4');
  placeBase(s, 'A', 'x', cosmoble);
  assert.throws(() => placeBase(s, 'A', 'y', cosmoble), /D4: já colocou/);
  assert.throws(() => placeBase(s, 'B', 'y', cosmoble), /D1/);
  assert.throws(() => spendBase(s, 'A', 1), /insuficientes/);
  end(s); startTurn(s); end(s); startTurn(s);
  assert.equal(s.players.A.bases[0].prepared, true);
  spendBase(s, 'A', 1);
  assert.equal(s.players.A.bases[0].prepared, false);
});

test('D5 + teto 3: Base não usada vira Latent ao fim do turno; gasta não converte', () => {
  const s = core();
  s.players.A.bases = [1, 2, 3, 4].map(uid => ({uid, prepared: false}));
  startTurn(s); spendBase(s, 'A', 2); end(s);
  assert.equal(s.players.A.latent, 2);
  assert.equal(gainLatent(s, 'A', 5), 1);
  assert.equal(s.players.A.latent, 3);
});

test('D233: Mill move min(N, K), sem obrigação pendente; Draw com deck curto não é inventado', () => {
  const s = core(3);
  assert.equal(mill(s, 'B', 5), 3);
  assert.deepEqual([s.players.B.deck.length, s.players.B.tartarus.length], [0, 3]);
  assert.throws(() => draw(s, 'B', 1), e => e instanceof NotSpecified && /Fatigue/.test(e.message));
});

test('D52 + D174: Soul 0 encerra na hora; os dois em 0 empatam; nada age depois', () => {
  const a = core();
  assert.deepEqual(loseSoul(a, {B: 30}), {winner: 'A'});
  assert.throws(() => startTurn(a), /D52/);
  assert.deepEqual(loseSoul(core(), {A: 30, B: 31}), {draw: true});
});

test('D204: gatilhos de fim de Round em APNAP e LIFO; Soul 0 corta os pendentes e o Cleanup', () => {
  const s = core(), log = [];
  const t = (controller, name, fn = () => {}) => ({controller, run: st => { log.push(name); fn(st); }});
  startTurn(s); end(s); startTurn(s); // turno de B, 2º do Round
  end(s, {endOfRound: [t('A', 'a1'), t('B', 'b1'), t('B', 'b2')]});
  // B (ativo) empilha primeiro e A por último: A resolve primeiro (LIFO)
  assert.deepEqual(log, ['a1', 'b2', 'b1']);
  assert.equal(s.round, 2);
  const k = core(); log.length = 0;
  startTurn(k); end(k); startTurn(k);
  assert.deepEqual(end(k, {endOfRound: [t('B', 'pending'), t('A', 'kill', st => loseSoul(st, {B: 30}))]}), {winner: 'A'});
  assert.deepEqual(log, ['kill']);
  assert.equal(k.round, 1);
});

test('D191: once each round e durações atravessam o turno adversário e expiram na fronteira certa', () => {
  const s = core();
  startTurn(s);
  assert.equal(useOncePerRound(s, 'cosmo-of-hope'), true);
  addEffect(s, {id: 'this', duration: 'this_round'});
  addEffect(s, {id: 'next', duration: 'next_round'});
  end(s); startTurn(s);
  assert.equal(useOncePerRound(s, 'cosmo-of-hope'), false, 'não renova no turno do 2º jogador');
  assert.deepEqual(s.effects.map(e => e.id), ['this', 'next']);
  end(s);
  assert.equal(useOncePerRound(s, 'cosmo-of-hope'), true, 'renova no Round seguinte');
  assert.deepEqual(s.effects.map(e => e.id), ['next']);
  startTurn(s); end(s); startTurn(s); end(s);
  assert.deepEqual(s.effects, []);
});

test('D22: um Strike por Devotee por turno próprio', () => {
  const s = core();
  startTurn(s);
  recordStrike(s, 'seiya');
  assert.throws(() => recordStrike(s, 'seiya'), /D22/);
  end(s); startTurn(s); end(s); startTurn(s);
  recordStrike(s, 'seiya');
});

test('D194: Moment usa Latent e Instant; Technique usa Base e Sorcery', () => {
  assert.deepEqual(spellCategory(54), {category: 'Moment', resource: 'latent', speed: 'instant'});
  assert.deepEqual(spellCategory(52), {category: 'Technique', resource: 'base', speed: 'sorcery'});
  assert.equal(spellCategory(1), null);
});


test('P03: 4 Bases não usadas com Latent 1 viram Latent 3 num só evento, antes dos efeitos de End Phase', () => {
  const s = core(), seen = [];
  s.players.A.bases = [1, 2, 3, 4].map(uid => ({uid, prepared: false}));
  s.players.A.latent = 1;
  startTurn(s);
  endTurn(s, {endOfTurn: [{controller: 'A', run: st => seen.push(st.players.A.latent)}]});
  assert.equal(s.players.A.latent, 3, 'o excesso de 2 se perde');
  respond(s, 'B', {speed: 'instant', run: st => seen.push(st.players.A.latent)});
  passAll(s);
  assert.deepEqual(seen, [3, 3], 'resposta e gatilho de End Phase já veem o Latent convertido');
});
