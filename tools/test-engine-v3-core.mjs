// Núcleo 3.0: só regras canônicas e confirmadas. node --test tools/test-engine-v3-core.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCore, startTurn, endTurn, draw, mill, placeBase, spendBase, gainLatent, loseSoul, recordStrike,
  useOncePerRound, addEffect, spellCategory, passAll, respond, RuleError, NotSpecified} from '../playtest/engine-v3/core.js';

const deck = n => Array.from({length: n}, (_, i) => `c${i}`);
const core = (size = 20) => createCore({soul: {A: 30, B: 30}, decks: {A: deck(size), B: deck(size)}});
const cosmoble = {cosmoble: true};
const end = (s, triggers) => { endTurn(s, triggers); return passAll(s); }; // os dois passam na End Phase

test('§55: só quem começa não compra no 1º turno; o outro já compra 2', () => {
  const s = core();
  startTurn(s); assert.equal(s.players.A.hand.length, 0);
  end(s); startTurn(s); assert.equal(s.players.B.hand.length, 2);
  end(s); startTurn(s); assert.equal(s.players.A.hand.length, 2, '§55: 2 cartas por turno (autor, 01/11/2026)');
});

test('D191: Round = um turno de cada jogador, na ordem do jogador inicial', () => {
  const s = core();
  startTurn(s); assert.deepEqual([s.round, s.active], [1, 'A']);
  end(s); assert.deepEqual([s.round, s.active], [1, 'B']);
  startTurn(s); end(s); assert.deepEqual([s.round, s.active, s.turnInRound], [2, 'A', 0]);
});

test('D4/G3-035: uma Base Cosmoble por turno, só no próprio turno; a Base nova entra Prepared e paga no mesmo turno', () => {
  const s = core();
  s.players.A.hand.push('x', 'y', 'z');
  startTurn(s);
  assert.throws(() => placeBase(s, 'A', 'x', {cosmoble: false}), e => e instanceof RuleError && e.decision === 'D4');
  placeBase(s, 'A', 'x', cosmoble);
  assert.throws(() => placeBase(s, 'A', 'y', cosmoble), /D4: já colocou/);
  assert.throws(() => placeBase(s, 'B', 'y', cosmoble), /D1/);
  assert.equal(s.players.A.bases[0].prepared, true, 'G3-035');
  spendBase(s, 'A', 1);
  assert.equal(s.players.A.bases[0].prepared, false);
  assert.throws(() => spendBase(s, 'A', 1), /insuficientes/);
  end(s); startTurn(s); end(s); startTurn(s);
  assert.equal(s.players.A.bases[0].prepared, true, 'D4: prepara no início do turno');
});

test('D5 + teto 3: Base não usada vira Latent ao fim do turno; gasta não converte', () => {
  const s = core();
  s.players.A.bases = [1, 2, 3, 4].map(uid => ({uid, prepared: false}));
  startTurn(s); spendBase(s, 'A', 2); end(s);
  assert.equal(s.players.A.latent, 2);
  assert.equal(gainLatent(s, 'A', 5), 1);
  assert.equal(s.players.A.latent, 3);
});

test('D233: Mill move min(N, K), sem obrigação pendente; deck 0 não derrota antes da compra', () => {
  const s = core(3);
  assert.equal(mill(s, 'B', 5), 3);
  assert.deepEqual([s.players.B.deck.length, s.players.B.tartarus.length], [0, 3]);
  assert.deepEqual([s.players.B.soul, s.victory], [30, null]);
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
  // Athena → Branco (autor, 31/10/2026): os truques defensivos e The Golden Arrow são Moment (instant, Latent em resposta).
  for (const n of [54, 56, 58, 61, 76, 79, 81, 82]) assert.deepEqual(spellCategory(n), {category: 'Moment', resource: 'latent', speed: 'instant'});
  assert.deepEqual(spellCategory(52), {category: 'Moment', resource: 'latent', speed: 'instant'}); // ex-Event (autor, 31/10/2026)
  assert.deepEqual(spellCategory(53), {category: 'Technique', resource: 'base', speed: 'sorcery'});
  assert.equal(spellCategory(1), null);
  for (const n of [53, 60, 85]) assert.equal(spellCategory(n).category, 'Technique', 'autor, 28/10/2026');
  assert.equal(spellCategory(57), null, 'fora dos decks, sem categoria');
});


test('P03: 4 Bases não usadas com Latent 1 viram Latent 3 num só evento, antes dos efeitos de End Phase', () => {
  const s = core(), seen = [];
  s.players.A.bases = [1, 2, 3, 4].map(uid => ({uid, prepared: false}));
  s.players.A.latent = 1;
  startTurn(s);
  endTurn(s, {endOfTurn: [{controller: 'A', run: st => seen.push(st.players.A.latent)}]});
  assert.equal(s.players.A.latent, 3, 'o excesso de 2 se perde');
  assert.deepEqual(s.players.A.bases.map(b => b.prepared), [false, false, true, true], '§5: só as 2 Bases convertidas giram');
  respond(s, 'B', {speed: 'instant', run: st => seen.push(st.players.A.latent)});
  passAll(s);
  assert.deepEqual(seen, [3, 3], 'resposta e gatilho de End Phase já veem o Latent convertido');
});

test('§55: comprar com o deck vazio perde na hora; sem Fatigue; Mill sozinho não derrota', () => {
  const s = core(3);
  mill(s, 'A', 2);
  assert.equal(s.victory, null, 'deck com 1 carta segue vivo');
  draw(s, 'A', 3);
  assert.deepEqual([s.players.A.hand.length, s.players.A.soul, s.victory], [1, 30, {winner: 'B', reason: 'deck_out'}], 'para na compra que falhou');
  assert.ok(!s.events.some(e => e.type === 'fatigue'));
});

test('Pool visual: spendBase paga primeiro as Bases separadas na pool e as tira dela', () => {
  const s = core();
  s.players.A.bases = [{uid: 'b1', prepared: true}, {uid: 'b2', prepared: true}, {uid: 'b3', prepared: true}];
  s.players.A.pool = ['b3'];
  spendBase(s, 'A', 2);
  assert.deepEqual(s.players.A.bases.map(b => b.prepared), [false, true, false], 'b3 (pool) e depois b1');
  assert.deepEqual(s.players.A.pool, []);
  assert.deepEqual(s.events.at(-1).uids, ['b3', 'b1']);
});
