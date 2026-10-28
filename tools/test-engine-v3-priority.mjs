// Prioridade e End Phase 3.0 (ALPHA-P06 opção A, aprovada em 28/10/2026). node --test tools/test-engine-v3-priority.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {createCore, startTurn, endTurn, placeBase, addEffect, pushTriggers, respond, pass, passAll, RuleError} from '../playtest/engine-v3/core.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';

const core = () => createCore({soul: {A: 30, B: 30}, decks: {A: ['a1'], B: ['b1']}});
const instant = (log, name, fn = () => {}) => ({speed: 'instant', run: st => { log.push(name); fn(st); }});

test('ação comum não abre janela; com janela aberta, ação comum e Sorcery são recusadas', () => {
  const s = core();
  s.players.A.hand.push('x', 'y');
  startTurn(s);
  placeBase(s, 'A', 'x', {cosmoble: true});
  assert.equal(s.window, null);
  respond(s, 'A', instant([], 'moment'));
  assert.throws(() => placeBase(s, 'A', 'y', {cosmoble: true}), e => e instanceof RuleError && e.decision === 'P06');
  assert.throws(() => respond(s, 'B', {speed: 'sorcery', run() {}}), /só Instant/);
});

test('Moment jogado pelo ativo abre janela; não ativo fala primeiro; dois passes resolvem e fecham', () => {
  const s = core(), log = [];
  startTurn(s);
  assert.throws(() => respond(s, 'B', instant(log, 'fora')), /D1/);
  respond(s, 'A', instant(log, 'moment'));
  assert.equal(s.window.priority, 'B');
  assert.throws(() => pass(s, 'A'), /prioridade/);
  pass(s, 'B');
  assert.deepEqual(log, [], 'um passe só não resolve');
  pass(s, 'A');
  assert.deepEqual(log, ['moment']);
  assert.equal(s.window, null);
});

test('resposta zera os passes e resolve em LIFO; cadeia restante abre nova rodada com o não ativo', () => {
  const s = core(), log = [];
  startTurn(s);
  respond(s, 'A', instant(log, 'A1'));
  respond(s, 'B', instant(log, 'B1'));
  pass(s, 'A'); pass(s, 'B');
  assert.deepEqual(log, ['B1']);
  assert.deepEqual([s.window.priority, s.window.passes], ['B', 0]);
  passAll(s);
  assert.deepEqual(log, ['B1', 'A1']);
});

test('três gatilhos simultâneos: APNAP + LIFO (o não ativo resolve primeiro)', () => {
  const s = core(), log = [];
  startTurn(s);
  const t = (controller, name) => ({controller, run: () => log.push(name)});
  pushTriggers(s, [t('A', 'a1'), t('B', 'b1'), t('A', 'a2')]);
  assert.equal(s.window.priority, 'B');
  passAll(s);
  assert.deepEqual(log, ['b1', 'a2', 'a1']);
});

test('End Phase: gatilhos de fim de turno antes do checkpoint D204; Cleanup expira this_turn sempre e this_round só no 2º turno', () => {
  const s = core(), log = [];
  const t = (controller, name) => ({controller, run: () => log.push(name)});
  startTurn(s);
  addEffect(s, {id: 'turn', duration: 'this_turn'});
  addEffect(s, {id: 'round', duration: 'this_round'});
  endTurn(s);
  assert.equal(s.active, 'A', 'End Phase abre janela mesmo sem gatilhos');
  respond(s, 'B', instant(log, 'resposta na End Phase'));
  passAll(s);
  assert.deepEqual([s.active, s.effects.map(e => e.id)], ['B', ['round']]);
  startTurn(s);
  endTurn(s, {endOfTurn: [t('B', 'fim do turno')], endOfRound: [t('A', 'fim do Round')]});
  passAll(s);
  assert.deepEqual(log, ['resposta na End Phase', 'fim do turno', 'fim do Round']);
  assert.deepEqual([s.round, s.active, s.effects], [2, 'A', []]);
});

test('Strike declarado abre janela; Moment do defensor resolve antes do dano', () => {
  const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
  const canon = read('../data/canon/d268.json'), cards = loadCanon(canon);
  const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, seed: 3});
  const ctx = {cards, objects: m.objects, attached: m.attached}, s = m.state, log = [];
  const p = s.players.A, seiya = p.deck.find(u => u.includes(':001:'));
  p.deck.splice(p.deck.indexOf(seiya), 1); p.battlefield.push(seiya);
  s.units[seiya] = {prepared: true, damage: 0};
  startTurn(s);
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'});
  assert.equal(s.window.priority, 'B');
  assert.equal(s.players.B.soul, 30, 'dano só depois da janela');
  respond(s, 'B', instant(log, 'moment', st => log.push(`soul ${st.players.B.soul}`)));
  passAll(s);
  assert.deepEqual(log, ['moment', 'soul 30']);
  assert.equal(s.players.B.soul, 28);
  assert.equal(s.window, null);
});
