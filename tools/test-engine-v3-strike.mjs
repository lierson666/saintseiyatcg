// Strike 3.0 (ALPHA-P04 opção A, aprovada em 28/10/2026). node --test tools/test-engine-v3-strike.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, checkInvariants, destroyDevotee, RuleError, NotSpecified} from '../playtest/engine-v3/core.js';
import {declareStrike, strikeTargets} from '../playtest/engine-v3/strike.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

// Coloca no campo direto do deck: a entrada pela mão depende da ALPHA-P02 (estado de entrada).
function setup() {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, first: 'A', seed: 3});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null; // cenário isolado: sem mão inicial (P01)
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
const strike = (s, attacker, target) => { declareStrike(s.state, s.ctx, attacker, target); return passAll(s.state); }; // os dois passam
const end = s => { endTurn(s.state); passAll(s.state); };

test('Devotee × Devotee: dano simultâneo, defensor destruído vai ao Tartarus do Owner, dano do atacante persiste', () => {
  const s = setup();
  const seiya = s.field('A', '001'), repairer = s.field('B', '042');
  strike(s, seiya, {kind: 'devotee', uid: repairer});
  assert.ok(s.state.players.B.tartarus.includes(repairer));
  assert.equal(s.state.units[seiya].damage, 1);
  assert.equal(s.state.units[seiya].prepared, false);
  end(s); startTurn(s.state); end(s); startTurn(s.state);
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
  end(s); startTurn(s.state); end(s); startTurn(s.state);
  assert.equal(s.state.units[seiya].prepared, true, 'P02: prepara no início do turno');
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

test('P05 Guardian: com Guardian em campo, Strike no God ou em Devotee sem Guardian é recusado e nada é gasto', () => {
  const s = setup();
  const seiya = s.field('A', '001'), acolyte = s.field('B', '043'), guard = s.field('B', '040'); // 040: Guardian
  for (const target of [{kind: 'god', player: 'B'}, {kind: 'devotee', uid: acolyte}]) {
    assert.throws(() => declareStrike(s.state, s.ctx, seiya, target), e => e instanceof RuleError && e.decision === 'P05');
  }
  assert.equal(s.state.units[seiya].prepared, true, 'declaração recusada não gasta nada');
  assert.deepEqual(strikeTargets(s.state, s.ctx, seiya), [{kind: 'devotee', uid: guard}], 'a interface só destaca o Guardian');
  strike(s, seiya, {kind: 'devotee', uid: guard});
  assert.deepEqual(strikeTargets(s.state, s.ctx, seiya), [], 'D22: já atacou');
  assert.equal(s.state.units[guard].damage, 2);
});

test('G3-038: Guardian Unprepared também protege (o Strike precisa mirá-lo)', () => {
  const s = setup();
  const seiya = s.field('A', '001');
  const guard = s.field('B', '040', false);
  assert.throws(() => declareStrike(s.state, s.ctx, seiya, {kind: 'god', player: 'B'}), e => e instanceof RuleError && e.decision === 'P05');
  assert.deepEqual(strikeTargets(s.state, s.ctx, seiya), [{kind: 'devotee', uid: guard}]);
});

test('P05 Nimble (021) ignora Guardian; Cheater ignora só contra God', () => {
  const s = setup();
  const marin = s.field('A', '021'), seiya = s.field('A', '001'), acolyte = s.field('B', '043');
  s.field('B', '040');
  strike(s, marin, {kind: 'devotee', uid: acolyte});
  assert.ok(s.state.players.B.tartarus.includes(acolyte));
  s.state.units[seiya].keywords = ['Cheater']; // concedido por efeito (ex.: 019 equipada); a carta não muda
  const enemyDevotee = s.field('B', '042');
  assert.throws(() => declareStrike(s.state, s.ctx, seiya, {kind: 'devotee', uid: enemyDevotee}), /P05/);
  strike(s, seiya, {kind: 'god', player: 'B'});
  assert.equal(s.state.players.B.soul, 28);
});

test('P05 Pierce: dano acima do HP restante do alvo vai para o Soul do God dele', () => {
  const s = setup();
  const seiya = s.field('A', '001'), repairer = s.field('B', '042'); // ATK 2 contra HP 2 com 1 de dano: excesso 1
  s.state.units[repairer].damage = 1;
  s.state.units[seiya].keywords = ['Pierce'];
  strike(s, seiya, {kind: 'devotee', uid: repairer});
  assert.equal(s.state.players.B.soul, 29);
  assert.ok(s.state.players.B.tartarus.includes(repairer));
  const t = setup();
  const jabu = t.field('A', '028'), shunrei = t.field('B', '037'); // sem Pierce: excesso não passa
  t.state.units[shunrei].damage = 2;
  strike(t, jabu, {kind: 'devotee', uid: shunrei});
  assert.equal(t.state.players.B.soul, 30);
});

test('G3-036: atacante ou alvo que sai do campo antes do dano anula o Strike (sem dano nem retaliação; Strike usado)', () => {
  for (const gone of ['attacker', 'target']) {
    const s = setup();
    const seiya = s.field('A', '001'), repairer = s.field('B', '042');
    declareStrike(s.state, s.ctx, seiya, {kind: 'devotee', uid: repairer});
    destroyDevotee(s.state, gone === 'attacker' ? seiya : repairer, s.objects, s.attached); // como um Moment na janela de resposta
    passAll(s.state);
    assert.ok(s.state.events.some(e => e.type === 'strike_fizzled'), gone);
    assert.ok(!s.state.events.some(e => e.type === 'strike_resolve'), gone);
    const left = gone === 'attacker' ? repairer : seiya;
    assert.equal(s.state.units[left].damage, 0, `${gone}: sem dano no que ficou`);
    checkInvariants(s.state, s.objects);
  }
});

test('Strike que passa por Guardian registra o motivo (Nimble) para a interface', () => {
  const s = setup();
  const marin = s.field('A', '021');
  s.field('B', '040'); // 040: Guardian
  declareStrike(s.state, s.ctx, marin, {kind: 'god', player: 'B'});
  assert.equal(s.state.events.findLast(e => e.type === 'strike_declared').bypass, 'Nimble');
});
