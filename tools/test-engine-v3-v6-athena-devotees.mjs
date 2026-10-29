// Efeitos V6 dos Devotees de Athena (playtest/engine-v3/v6/athena-devotees.js).
// node --test tools/test-engine-v3-v6-athena-devotees.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, runCheckpoint} from '../playtest/engine-v3/core.js';
import {playDevotee, playSpell, activate} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {V6} from '../playtest/engine-v3/v6/hooks.js';
import {checkDefeats, atkOf, hpOf} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

// A: Ares (Domain 332); B: sem Domain, só com cartas injetadas. Decisões: primeira opção (God se houver);
// "you may" sim para A, não para B.
function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  s.domains.B = null;
  startTurn(s);
  p.bases = p.deck.splice(0, 10).map(uid => ({uid, prepared: true}));
  ctx.decide = (player, q) => (q.options ? (q.options.find(o => String(o).startsWith('god:')) ?? q.options[0]) : player === 'A');
  let n = 0;
  // Cria a carta na zona pedida; no campo entra Prepared e sem dano.
  const give = (key, id, zone = 'battlefield', bearer) => {
    const uid = `${key}:${id}:t${n++}`;
    m.objects[uid] = {owner: key, cardId: id, armor: false};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    if (bearer) ctx.attached[uid] = bearer;
    return uid;
  };
  return {s, ctx, give};
}
const strike = (s, ctx, attacker, target) => { declareStrike(s, ctx, attacker, target); passAll(s); };
const god = {kind: 'god', player: 'B'};



const FOE = 'artemis-v6-399'; // 3/4
const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
// B declara Strike (turno de B) contra o alvo de A.
const foeStrike = (s, ctx, attacker, target) => { s.active = 'B'; strike(s, ctx, attacker, target); };

test('007 Nebula Chain: Shun se cansa e o Strike inimigo contra o God não causa dano', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', 'athena-v6-007'), foe = give('B', FOE), soul = s.players.A.soul;
  foeStrike(s, ctx, foe, {kind: 'god', player: 'A'});
  assert.equal(s.players.A.soul, soul);
  assert.equal(s.units[shun].prepared, false);
  assert.equal(s.units[foe].damage, 0); // sem retaliação do God
  assert.ok(s.roundUses.has(`${shun}:nebula`));
});

test('007 Nebula Chain: protege outro Saint; não protege o próprio Shun', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', 'athena-v6-007'), ally = give('A', 'athena-v6-005'), foe = give('B', FOE);
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: ally});
  assert.equal(s.units[ally].damage, 0);
  const {s: s2, ctx: ctx2, give: give2} = setup();
  const shun2 = give2('A', 'athena-v6-007'), foe2 = give2('B', FOE);
  foeStrike(s2, ctx2, foe2, {kind: 'devotee', uid: shun2});
  assert.ok(s2.units[shun2].damage > 0);
});

test('007 Brotherhood: outros Saints amigos ganham +1 HP', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', 'athena-v6-007'), ally = give('A', 'athena-v6-005'), foe = give('B', 'athena-v6-005');
  assert.equal(hpOf(s, ctx, ally), 5);
  assert.equal(hpOf(s, ctx, shun), 5);
  assert.equal(hpOf(s, ctx, foe), 4);
});

test('009 Lone Wolf: +2 ATK só sem outros Saints amigos', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', 'athena-v6-009');
  assert.equal(atkOf(s, ctx, ikki), 5);
  give('A', 'athena-v6-005');
  assert.equal(atkOf(s, ctx, ikki), 3);
});

test('013 Another Dimension: Saga manda o alvo ao Void e o devolve quando é derrotado', () => {
  const {s, ctx, give} = setup();
  const saga = give('A', 'athena-v6-013', 'hand'), foe = give('B', FOE);
  playDevotee(s, ctx, 'A', saga, {}); passAll(s);
  assert.ok(s.players.B.void.includes(foe));
  s.units[saga].damage = hpOf(s, ctx, saga);
  runCheckpoint(s); passAll(s);
  assert.ok(s.players.B.battlefield.includes(foe));
});

test('013 Duality: +1 ATK com mais Soul, +1 HP com menos', () => {
  const {s, ctx, give} = setup();
  const saga = give('A', 'athena-v6-013'), base = [atkOf(s, ctx, saga), hpOf(s, ctx, saga)];
  s.players.A.soul = s.players.B.soul + 1;
  assert.deepEqual([atkOf(s, ctx, saga), hpOf(s, ctx, saga)], [base[0] + 1, base[1]]);
  s.players.A.soul = s.players.B.soul - 1;
  assert.deepEqual([atkOf(s, ctx, saga), hpOf(s, ctx, saga)], [base[0], base[1] + 1]);
});

// Long Range (Aiolia) ainda não tem regra de Strike na engine (ALPHA-P05): os ganchos são chamados direto.
test('015 Lightning Speed: +1 ATK durante o Strike, uma vez por rodada', () => {
  const {s, ctx, give} = setup();
  const leo = give('A', 'athena-v6-015'), foe = give('B', FOE), target = {kind: 'devotee', uid: foe}, base = atkOf(s, ctx, leo);
  const run = V6['athena-v6-015'].declare(s, ctx, 'A', leo, target);
  run(s);
  assert.equal(atkOf(s, ctx, leo), base + 1);
  assert.equal(V6['athena-v6-015'].declare(s, ctx, 'A', leo, target), false); // gasto na rodada
});

test('015 Lion\'s Pride: após derrotar um inimigo, pode Preparar Aiolia', () => {
  const {s, ctx, give} = setup();
  const leo = give('A', 'athena-v6-015');
  s.units[leo].prepared = false;
  V6['athena-v6-015'].killInCombat(s, ctx, 'A', leo, 'B:x')(s);
  assert.equal(s.units[leo].prepared, true);
});

test('022 Shaina: Seal no Strike; sem Seal prévio não há dano extra', () => {
  const {s, ctx, give} = setup();
  const shaina = give('A', 'athena-v6-022'), foe = give('B', FOE);
  strike(s, ctx, shaina, {kind: 'devotee', uid: foe});
  assert.equal(s.units[foe].seal, 1);
  assert.equal(s.units[foe].damage, atkOf(s, ctx, shaina));
});

test('022 Thunder Claw: Seal prévio soma 2 de dano', () => {
  const {s, ctx, give} = setup();
  const shaina = give('A', 'athena-v6-022'), foe = give('B', 'athena-v6-007'); // HP 5 = 3 + 2
  s.units[foe].seal = 1;
  strike(s, ctx, shaina, {kind: 'devotee', uid: foe});
  assert.ok(s.players.B.tartarus.includes(foe));
});

test('023 Marble Wall: paga {1}{C} e previne até 3 do Strike', () => {
  const {s, ctx, give} = setup();
  const misty = give('A', 'athena-v6-023'), foe = give('B', FOE), bases = ready(s, 'A');
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: misty});
  assert.equal(s.units[misty].damage, 0); // ATK 3 inteiro prevenido
  assert.equal(ready(s, 'A'), bases - 1);
  assert.ok(s.roundUses.has(`${misty}:marble`));
});

test('025 String Nocturne: até dois Saints ganham +0/+2', () => {
  const {s, ctx, give} = setup();
  const orphee = give('A', 'athena-v6-025'), ally = give('A', 'athena-v6-005');
  const hp = hpOf(s, ctx, ally), oh = hpOf(s, ctx, orphee);
  activate(s, ctx, 'A', orphee); passAll(s);
  assert.equal(hpOf(s, ctx, ally), hp + 2);
  assert.equal(hpOf(s, ctx, orphee), oh + 2); // escolha: primeira opção, depois a segunda
});

test('025 Death Trip Serenade: atacante inimigo perde 2 ATK durante o Strike contra o God', () => {
  const {s, ctx, give} = setup();
  const orphee = give('A', 'athena-v6-025'), foe = give('B', FOE), soul = s.players.A.soul;
  foeStrike(s, ctx, foe, {kind: 'god', player: 'A'});
  assert.equal(s.players.A.soul, soul - (atkOf(s, ctx, foe) - 2));
  assert.ok(s.roundUses.has(`${orphee}:serenade`));
});

test('026 Kiki: devolve Equipment amigo à mão', () => {
  const {s, ctx, give} = setup();
  const kiki = give('A', 'athena-v6-026', 'hand'), host = give('A', 'athena-v6-005'), gear = give('A', 'athena-v6-002', 'battlefield', host);
  playDevotee(s, ctx, 'A', kiki, {}); passAll(s);
  assert.ok(s.players.A.hand.includes(gear));
  assert.ok(!s.players.A.battlefield.includes(gear));
});

test('029 Hanging Bear: o Devotee atingido não declara Strike no turno seguinte do Round', () => {
  const {s, ctx, give} = setup();
  const geki = give('A', 'athena-v6-029'), foe = give('B', 'athena-v6-007');
  strike(s, ctx, geki, {kind: 'devotee', uid: foe});
  assert.ok(s.roundUses.has(`${geki}:hanging`));
  assert.equal(s.strikes.get(foe), s.turn + 1);
});

test('030 Poisonous Claws e 033 Chameleon Whip: atingido perde 1 ATK até o fim da rodada', () => {
  for (const id of ['athena-v6-030', 'athena-v6-033']) {
    const {s, ctx, give} = setup();
    const me = give('A', id), foe = give('B', 'athena-v6-007'), before = atkOf(s, ctx, foe);
    strike(s, ctx, me, {kind: 'devotee', uid: foe});
    assert.equal(atkOf(s, ctx, foe), before - 1);
  }
});

test('031 Wolf Pack: +1/+1 com dois outros Bronze Saints', () => {
  const {s, ctx, give} = setup();
  const nachi = give('A', 'athena-v6-031'), base = [atkOf(s, ctx, nachi), hpOf(s, ctx, nachi)];
  give('A', 'athena-v6-005');
  assert.equal(atkOf(s, ctx, nachi), base[0]);
  give('A', 'athena-v6-007');
  assert.deepEqual([atkOf(s, ctx, nachi), hpOf(s, ctx, nachi)], [base[0] + 1, base[1] + 2]); // +1 HP de Brotherhood (Shun)
});

test('032 Lionet Bomber: +1 ATK contra Devotee com ATK maior', () => {
  const {s, ctx, give} = setup();
  const ban = give('A', 'athena-v6-032'), foe = give('B', FOE), weak = give('B', 'athena-v6-007'), base = atkOf(s, ctx, ban);
  assert.equal(V6['athena-v6-032'].declare(s, ctx, 'A', ban, {kind: 'devotee', uid: weak}), false);
  V6['athena-v6-032'].declare(s, ctx, 'A', ban, {kind: 'devotee', uid: foe})(s);
  assert.equal(atkOf(s, ctx, ban), base + 1);
});

test('033 Resonance: +0/+1 enquanto controla Andromeda Shun', () => {
  const {s, ctx, give} = setup();
  const june = give('A', 'athena-v6-033'), hp = hpOf(s, ctx, june);
  give('A', 'athena-v6-007');
  assert.equal(hpOf(s, ctx, june), hp + 2); // +1 de Resonance e +1 de Brotherhood (Shun)
});

test('035 Kindness: remove 1 de dano de Devotee amigo', () => {
  const {s, ctx, give} = setup();
  const miho = give('A', 'athena-v6-035');
  s.units[miho].damage = 1;
  activate(s, ctx, 'A', miho); passAll(s);
  assert.equal(s.units[miho].damage, 0);
});

test('038 Esmeralda: Ikki ganha +0/+1; ao ser derrotada remove 1 Rebirth de Ikki', () => {
  const {s, ctx, give} = setup();
  const esme = give('A', 'athena-v6-038'), ikki = give('A', 'athena-v6-009');
  assert.equal(hpOf(s, ctx, ikki), 4);
  s.units[ikki].markers = {Rebirth: 1};
  s.units[esme].damage = hpOf(s, ctx, esme);
  checkDefeats(s, ctx); passAll(s); // ctx do teste tem o decide; o checkpoint usa o ctx da partida
  assert.equal(s.units[ikki].markers.Rebirth, 0);
});

test('071 Flame Whip: 1 de dano adicional', () => {
  const {s, ctx, give} = setup();
  const babel = give('A', 'athena-v6-071'), foe = give('B', 'athena-v6-007');
  strike(s, ctx, babel, {kind: 'devotee', uid: foe});
  assert.equal(s.units[foe].damage, atkOf(s, ctx, babel) + 1);
});

test('072 Whale Moses: +1 ATK contra ATK menor; previne 1 do primeiro Strike que recebe', () => {
  const {s, ctx, give} = setup();
  const moses = give('A', 'athena-v6-072'), foe = give('B', 'athena-v6-007'); // ATK 1 < 4
  strike(s, ctx, moses, {kind: 'devotee', uid: foe});
  assert.equal(s.units[foe].damage, atkOf(s, ctx, moses) + 1);
  assert.equal(s.units[moses].damage, 0); // ATK 1 do Shun, 1 prevenido
});

test('073 Mind Reading: -2 ATK do atacante durante o Strike', () => {
  const {s, ctx, give} = setup();
  const hound = give('A', 'athena-v6-073'), foe = give('B', FOE);
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: hound});
  assert.equal(s.units[hound].damage, atkOf(s, ctx, foe) - 2);
});

test('074 Black Wing Formation: defensor perde 1 ATK durante o Strike', () => {
  const {s, ctx, give} = setup();
  const crow = give('A', 'athena-v6-074'), foe = give('B', FOE), bases = ready(s, 'A');
  strike(s, ctx, crow, {kind: 'devotee', uid: foe});
  assert.equal(s.units[crow].damage, atkOf(s, ctx, foe) - 1);
  assert.equal(ready(s, 'A'), bases - 1);
});

test('075 Cerberus Chains e Three-Headed Assault', () => {
  const {s, ctx, give} = setup();
  const dante = give('A', 'athena-v6-075'), foe = give('B', 'athena-v6-007');
  strike(s, ctx, dante, {kind: 'devotee', uid: foe});
  assert.equal(s.units[foe].seal, 1);
  assert.equal(s.units[foe].damage, atkOf(s, ctx, dante));
  const t = setup(), d2 = t.give('A', 'athena-v6-075'), f2 = t.give('B', 'athena-v6-007');
  t.s.units[f2].seal = 1;
  strike(t.s, t.ctx, d2, {kind: 'devotee', uid: f2});
  assert.equal(t.s.units[f2].damage, atkOf(t.s, t.ctx, d2) + 1);
});
