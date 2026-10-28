// Strike 3.0 (ALPHA-P04 opção A, aprovada em 28/10/2026). node --test tools/test-engine-v3-strike.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, checkInvariants, RuleError, NotSpecified} from '../playtest/engine-v3/core.js';
import {declareStrike, resolveStrike} from '../playtest/engine-v3/strike.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

// Coloca no campo direto do deck: a entrada pela mão depende da ALPHA-P02 (estado de entrada).
function setup() {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, seed: 3});
  const ctx = {cards, objects: m.objects, attached: m.attached};
  const field = (key, id, prepared = true) => {
    const p = m.state.players[key], uid = p.deck.find(u => u.includes(`:${id}:`) && !p.battlefield.includes(u));
    p.deck.splice(p.deck.indexOf(uid), 1);
    p.battlefield.push(uid);
    m.state.units[uid] = {prepared, damage: 0};
    return uid;
  };
  startTurn(m.state);
  return {...m, ctx, field};
}
const strike = (s, attacker, target) => resolveStrike(s.state, s.ctx, declareStrike(s.state, s.ctx, attacker, target));

test('Devotee × Devotee: dano simultâneo, defensor destruído vai ao Tartarus do Owner, dano do atacante persiste', () => {
  const s = setup();
  const seiya = s.field('A', '001'), repairer = s.field('B', '042');
  strike(s, seiya, {kind: 'devotee', uid: repairer});
  assert.ok(s.state.players.B.tartarus.includes(repairer));
  assert.equal(s.state.units[seiya].damage, 1);
  assert.equal(s.state.units[seiya].prepared, false);
  endTurn(s.state); startTurn(s.state); endTurn(s.state); startTurn(s.state);
  assert.equal(s.state.units[seiya].damage, 1, 'o Cleanup não limpa dano');
  checkInvariants(s.state, s.objects);
});

test('dano persistente decide combate depois: os dois morrem na troca simultânea', () => {
  const s = setup();
  const jabu = s.field('A', '028'), acolyte = s.field('B', '043');
  s.state.units[jabu].damage = 1;
  strike(s, jabu, {kind: 'devotee', uid: acolyte});
  assert.ok(s.state.players.A.tartarus.includes(jabu) && s.state.players.B.tartarus.includes(acolyte));
});

test('Strike no God: Soul cai 1:1 e o God retalia com ATTACK; segunda troca destrói o atacante', () => {
  const s = setup();
  const seiya = s.field('A', '001');
  strike(s, seiya, {kind: 'god', player: 'B'});
  assert.equal(s.state.players.B.soul, 28);
  assert.equal(s.state.units[seiya].damage, 3); // Athena ATTACK 3
  endTurn(s.state); startTurn(s.state); endTurn(s.state); startTurn(s.state);
  s.state.units[seiya].prepared = true; // preparação do início do turno é a ALPHA-P02, ainda pendente
  strike(s, seiya, {kind: 'god', player: 'B'});
  assert.equal(s.state.players.B.soul, 26);
  assert.ok(s.state.players.A.tartarus.includes(seiya));
});

test('Soul 0 por Strike encerra a partida na hora (D52)', () => {
  const s = setup();
  const seiya = s.field('A', '001');
  s.state.players.B.soul = 2;
  assert.deepEqual(strike(s, seiya, {kind: 'god', player: 'B'}), {winner: 'A'});
  assert.throws(() => declareStrike(s.state, s.ctx, seiya, {kind: 'god', player: 'B'}), /D52/);
});

test('ilegais: Unprepared, segundo Strike no turno (D22), turno alheio, alvo aliado', () => {
  const s = setup();
  const seiya = s.field('A', '001'), jabu = s.field('A', '028', false), healer = s.field('B', '041');
  assert.throws(() => declareStrike(s.state, s.ctx, jabu, {kind: 'god', player: 'B'}), /Prepared/);
  assert.throws(() => declareStrike(s.state, s.ctx, seiya, {kind: 'devotee', uid: jabu}), /inimigo/);
  assert.throws(() => declareStrike(s.state, s.ctx, seiya, {kind: 'god', player: 'A'}), /inimigo/);
  assert.throws(() => declareStrike(s.state, s.ctx, healer, {kind: 'god', player: 'A'}), e => e instanceof RuleError && e.decision === 'D1');
  strike(s, seiya, {kind: 'devotee', uid: healer});
  s.state.units[seiya].prepared = true;
  assert.throws(() => declareStrike(s.state, s.ctx, seiya, {kind: 'god', player: 'B'}), /D22/);
});

test('Guardian em campo bloqueia de forma explícita até a ALPHA-P05', () => {
  const s = setup();
  const seiya = s.field('A', '001');
  s.field('B', '040'); // Sanctuary Guard: Guardian
  assert.throws(() => declareStrike(s.state, s.ctx, seiya, {kind: 'god', player: 'B'}), e => e instanceof NotSpecified && /P05.*Guardian/.test(e.message));
  assert.equal(s.state.units[seiya].prepared, true, 'declaração recusada não gasta nada');
});
