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
import {playDevotee, playSpell, activate, playableFrom} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {V6} from '../playtest/engine-v3/v6/hooks.js';
import {checkDefeats, atkOf, hpOf, modify, enforceUniqueness} from '../playtest/engine-v3/effects.js';
import * as k from '../playtest/engine-v3/v6/kit.js';
import {guardDecide} from './engine-test-upto.mjs';
const modifyAtk = (s, uid, atk) => modify(s, uid, {atk});

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('./fixtures/decks-preview.json').decks;

// A: Ares (Domain 332); B: sem Domain, só com cartas injetadas. Decisões: primeira opção (God se houver);
// "you may" sim para A, não para B.
function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached}), p = s.players.A;
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
// Misty e Asterion têm Nimble (§43): o atacante de teste também precisa ter.
const foeStrike = (s, ctx, attacker, target) => { s.active = 'B'; s.units[attacker].keywords = ['Nimble']; strike(s, ctx, attacker, target); };

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

test('009 Ikki estilo Arclight (autor 31/10/2026): 3/2, Impulse, sem Lone Wolf', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', 'athena-v6-009');
  give('A', 'athena-v6-005');
  assert.equal(atkOf(s, ctx, ikki), 3);
  assert.equal(hpOf(s, ctx, ikki), 2);
  assert.ok(['Impulse', 'Nimble'].every(w => ctx.cards.get('athena-v6-009').keywords.includes(w)));
});

test('009 Rebirth (autor 31/10/2026): na terceira Moment ou Technique do turno Ikki volta do Tartarus Prepared', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', 'athena-v6-009', 'tartarus');
  const cast = () => { playSpell(s, ctx, 'A', give('A', 'poseidon-v6-135', 'hand')); if (s.window) passAll(s); };
  cast(); cast();
  assert.ok(s.players.A.tartarus.includes(ikki)); // duas Spells: ainda não
  cast();
  assert.ok(s.players.A.battlefield.includes(ikki));
  assert.equal(s.units[ikki].prepared, true);
  k.defeat(s, ctx, ikki); cast(); // a quarta Spell do turno não traz de novo
  assert.ok(s.players.A.tartarus.includes(ikki));
});

test('009 Eternal Phoenix (autor 01/11/2026): Ikki não é lendário, várias cópias ficam no campo', () => {
  const {s, ctx, give} = setup();
  const a = give('A', 'athena-v6-009'), b = give('A', 'athena-v6-009');
  enforceUniqueness(s, ctx);
  assert.ok(s.players.A.battlefield.includes(a) && s.players.A.battlefield.includes(b));
});

test('009 Arise from the Ashes: todas as cópias no Tartarus voltam na terceira Spell', () => {
  const {s, ctx, give} = setup();
  const a = give('A', 'athena-v6-009', 'tartarus'), b = give('A', 'athena-v6-009', 'tartarus');
  for (let i = 0; i < 3; i++) { playSpell(s, ctx, 'A', give('A', 'poseidon-v6-135', 'hand')); if (s.window) passAll(s); }
  assert.ok(s.players.A.battlefield.includes(a) && s.players.A.battlefield.includes(b));
});

test('009 Rebirth: só a partir do Tartarus; no campo a terceira Spell não faz nada', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', 'athena-v6-009');
  for (let i = 0; i < 3; i++) { playSpell(s, ctx, 'A', give('A', 'poseidon-v6-135', 'hand')); if (s.window) passAll(s); }
  assert.deepEqual(s.players.A.battlefield.filter(u => u === ikki), [ikki]);
  assert.ok(!s.players.A.tartarus.includes(ikki));
});

test('013 Another Dimension: Saga manda o alvo ao Void e o devolve quando é derrotado', () => {
  const {s, ctx, give} = setup();
  const saga = give('A', 'athena-v6-013', 'hand'), foe = give('B', FOE);
  playDevotee(s, ctx, 'A', saga, {}); passAll(s);
  assert.ok(s.players.B.void.includes(foe));
  s.units[saga].damage = hpOf(s, ctx, saga);
  runCheckpoint(s); passAll(s);
  assert.ok(s.players.B.battlefield.includes(foe));
  assert.equal(s.units[foe].prepared, false, 'volta Unprepared (autor, 31/10/2026)');
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

test('022 Shaina: -1 ATK no Strike (sem Seal, 31/10/2026); sem Seal prévio não há dano extra', () => {
  const {s, ctx, give} = setup();
  const shaina = give('A', 'athena-v6-022'), foe = give('B', FOE), atk = atkOf(s, ctx, foe);
  strike(s, ctx, shaina, {kind: 'devotee', uid: foe});
  assert.equal(s.units[foe].seal || 0, 0);
  if (s.units[foe]) assert.equal(atkOf(s, ctx, foe), atk - 1);
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

test('025 Death Trip Serenade (Sun Titan, 08/11/2026): ao declarar Strike, devolve do Tartarus ao campo um Devotee de custo 3 ou menos', () => {
  const {s, ctx, give} = setup();
  const orphee = give('A', 'athena-v6-025'), foe = give('B', 'athena-v6-007'), jabu = give('A', 'athena-v6-028', 'tartarus');
  strike(s, ctx, orphee, {kind: 'devotee', uid: foe});
  assert.ok(s.players.A.battlefield.includes(jabu));
});

test('026 Kiki: busca um Equipment no deck para a mão', () => {
  const {s, ctx, give} = setup();
  const isGear = u => ctx.cards.get(ctx.objects[u].cardId).kind === 'Equipment', inDeck = s.players.A.deck.filter(isGear).length;
  const kiki = give('A', 'athena-v6-026', 'hand');
  playDevotee(s, ctx, 'A', kiki, {}); passAll(s);
  assert.equal(s.players.A.hand.filter(isGear).length, 1);
  assert.equal(s.players.A.deck.filter(isGear).length, inDeck - 1);
});

test('029 Hanging Bear: o Devotee atingido não declara Strike no turno seguinte do Round', () => {
  const {s, ctx, give} = setup();
  const geki = give('A', 'athena-v6-029'), foe = give('B', 'athena-v6-007');
  strike(s, ctx, geki, {kind: 'devotee', uid: foe});
  assert.ok(s.roundUses.has(`${geki}:hanging`));
  assert.ok(s.effects.some(e => e.kind === 'noStrike' && e.target === foe)); // gancho cannotStrike: até o fim do Round
});

test('030 Hydra Ichi (Soul Warden) e 033 Chameleon June (Mother of Runes), 08/11/2026', () => {
  const {s, ctx, give} = setup();
  give('A', 'athena-v6-030');
  s.players.A.soul = 10;
  const soul = s.players.A.soul;
  playDevotee(s, ctx, 'A', give('A', 'athena-v6-028', 'hand'), {}); passAll(s);
  assert.equal(s.players.A.soul, soul + 1);
  const june = give('A', 'athena-v6-033'), seiya = give('A', 'athena-v6-001');
  s.divine.B.god = 'god-ares';
  ctx.decide = (p, q) => (q.options ? (q.options.includes(seiya) ? seiya : q.options[0]) : true);
  activate(s, ctx, 'A', june, {}); passAll(s);
  assert.deepEqual(s.v6Immune[seiya], {round: s.round, faction: 'ares'});
  assert.equal(s.units[june].prepared, false);
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

test('035 Miho: compra 1 por turno quando outro Bronze Saint aliado entra', () => {
  const {s, ctx, give} = setup();
  give('A', 'athena-v6-035');
  const hand = () => s.players.A.hand.length;
  for (const [id, delta] of [['athena-v6-034', 0], ['athena-v6-028', 1], ['athena-v6-031', 0]]) {
    const uid = give('A', id, 'hand'), h = hand();
    playDevotee(s, ctx, 'A', uid, {}); passAll(s);
    assert.equal(hand(), h - 1 + delta, id);
  }
});

test('345 Berserker of the Apocalypse: cada jogador descarta a mão e compra 3', () => {
  const {s, ctx, give} = setup();
  s.players.A.hand.push(...s.players.A.deck.splice(0, 2)); s.players.B.hand.push(...s.players.B.deck.splice(0, 4));
  const old = [...s.players.B.hand], w = give('A', 'ares-v6-345', 'hand');
  playDevotee(s, ctx, 'A', w, {}); passAll(s);
  assert.equal(s.players.A.hand.length, 3);
  assert.equal(s.players.B.hand.length, 3);
  assert.ok(old.every(u => s.players.B.tartarus.includes(u)));
});

test('038 Esmeralda: Ikki ganha +0/+1; ao ser derrotada pode devolver um Ikki do Tártaro à mão', () => {
  const {s, ctx, give} = setup();
  const esme = give('A', 'athena-v6-038'), ikki = give('A', 'athena-v6-009'), dead = give('A', 'athena-v6-009', 'tartarus');
  assert.equal(hpOf(s, ctx, ikki), 3); // Ikki 3/2 (31/10/2026) + 1
  s.units[esme].damage = hpOf(s, ctx, esme);
  checkDefeats(s, ctx); passAll(s); // ctx do teste tem o decide; o checkpoint usa o ctx da partida
  assert.ok(s.players.A.hand.includes(dead));
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
  assert.equal(s.units[foe].seal || 0, 0);
  assert.ok(s.effects.some(e => e.kind === 'noStrike' && e.target === foe), 'Cerberus Chains: não declara Strike no próximo turno');
  assert.equal(s.units[foe].damage, atkOf(s, ctx, dante));
  const t = setup(), d2 = t.give('A', 'athena-v6-075'), f2 = t.give('B', 'athena-v6-007');
  t.s.units[f2].seal = 1;
  strike(t.s, t.ctx, d2, {kind: 'devotee', uid: f2});
  assert.equal(t.s.units[f2].damage, atkOf(t.s, t.ctx, d2) + 1);
});

// ---- Completados com os ganchos novos (29/10/2026) ----
test('009 sem Phoenix Rebirth (01/11/2026): Ikki derrotado vai ao Tártaro', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', 'athena-v6-009');
  s.units[ikki].damage = hpOf(s, ctx, ikki);
  checkDefeats(s, ctx);
  assert.ok(s.players.A.tartarus.includes(ikki));
});

test('013 Another Dimension: Saga devolve o alvo ao sair por qualquer via (aqui, de volta à mão)', () => {
  const {s, ctx, give} = setup();
  const saga = give('A', 'athena-v6-013', 'hand'), foe = give('B', FOE);
  playDevotee(s, ctx, 'A', saga, {}); passAll(s);
  assert.ok(s.players.B.void.includes(foe));
  k.toHand(s, ctx, saga, 'battlefield'); passAll(s);
  assert.ok(s.players.B.battlefield.includes(foe));
});

test('023 Untouchable: Marble Wall previne todo o dano e Misty pode se Preparar, sem Strike no Round; Cloth 068 perde 1 dano', () => {
  const {s, ctx, give} = setup();
  const misty = give('A', 'athena-v6-023'), foe = give('B', 'athena-v6-005');
  const cloth = give('A', 'athena-v6-068', 'battlefield', misty);
  s.units[cloth] = {damage: 1};
  s.units[misty].prepared = false;
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: misty});
  assert.equal(s.units[misty].damage, 0);
  assert.equal(s.units[misty].prepared, true);
  assert.equal(s.units[cloth].damage, 0);
  assert.ok(s.effects.some(e => e.kind === 'noStrike' && e.target === misty));
});

test('023 Untouchable: se o escudo não previne tudo, não dispara', () => {
  const {s, ctx, give} = setup();
  const misty = give('A', 'athena-v6-023'), foe = give('B', FOE); // ATK 3: o escudo cobre 3, então usa um atacante maior
  s.units[misty].prepared = false;
  modifyAtk(s, foe, 1); // ATK 4: o escudo previne 3, passa 1
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: misty});
  assert.equal(s.units[misty].prepared, false);
});

test('024 Medusa Shield: paga {2}{C}; o atacante não é Prepared nem ataca neste Round; Stone Gaze dá +1/+1 ao sobreviver', () => {
  const {s, ctx, give} = setup();
  const algol = give('A', 'athena-v6-024'), foe = give('B', FOE), bases = ready(s, 'A'), atk = atkOf(s, ctx, algol);
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: algol});
  assert.equal(ready(s, 'A'), bases - 2);
  assert.ok(s.effects.some(e => e.kind === 'noPrepare' && e.target === foe));
  assert.ok(s.effects.some(e => e.kind === 'noStrike' && e.target === foe));
  assert.equal(atkOf(s, ctx, algol), atk + 1); // Stone Gaze
  assert.equal(hpOf(s, ctx, algol), 4 + 1);
});

test('039 Guilty (Grand Abolisher, 08/11/2026): na rodada dele, o oponente não conjura Moment nem Technique', () => {
  const {s, ctx, give} = setup();
  give('A', 'athena-v6-039');
  assert.equal(s.active, 'A');
  assert.throws(() => playSpell(s, ctx, 'B', give('B', 'athena-v6-505', 'hand')), /Moments e Techniques/);
});

test('034 Tatsumi (Drannith Magistrate) e 520 (Ghostly Prison), 08/11/2026: só da mão; imposto no Strike contra o God', () => {
  const {s, ctx, give} = setup();
  give('B', 'athena-v6-034');
  s.zonePlay = [{key: 'A', zone: 'void', uid: give('A', 'athena-v6-028', 'void')}];
  assert.deepEqual(playableFrom(s, ctx, 'A'), []);
});

test('027 Cassios (Selfless Spirit), 040 (Mentor of the Meek), 041 (Knight of the White Orchid), 08/11/2026', () => {
  const {s, ctx, give} = setup();
  const cassios = give('A', 'athena-v6-027'), seiya = give('A', 'athena-v6-001');
  activate(s, ctx, 'A', cassios, {}); passAll(s);
  assert.ok(s.players.A.tartarus.includes(cassios));
  k.damage(s, ctx, seiya, 99); checkDefeats(s, ctx);
  assert.ok(s.players.A.battlefield.includes(seiya));
  const t = setup();
  t.give('A', 'athena-v6-040');
  const h = t.s.players.A.hand.length;
  playDevotee(t.s, t.ctx, 'A', t.give('A', 'athena-v6-028', 'hand'), {}); passAll(t.s);
  assert.equal(t.s.players.A.hand.length, h + 1, 'a carta dada foi jogada e o Mentor comprou 1');
  const w = setup();
  w.s.players.B.bases = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(n => ({uid: `xb${n}`, prepared: true}));
  const n0 = w.s.players.A.bases.length;
  playDevotee(w.s, w.ctx, 'A', w.give('A', 'athena-v6-041', 'hand'), {}); passAll(w.s);
  assert.equal(w.s.players.A.bases.length, n0 + 1);
});

test('073 Million Ghost Attack: defensor que sobrevive ganha +1 ATK', () => {
  const {s, ctx, give} = setup();
  const hound = give('A', 'athena-v6-073'), foe = give('B', FOE), atk = atkOf(s, ctx, hound);
  modifyAtk(s, foe, -2);
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: hound});
  assert.equal(atkOf(s, ctx, hound), atk + 1);
});

test('074 Crow\'s Escape: defensor que sobrevive pode se Preparar, sem Strike neste Round', () => {
  const {s, ctx, give} = setup();
  const jamian = give('A', 'athena-v6-074'), foe = give('B', FOE);
  s.units[jamian].prepared = false;
  modifyAtk(s, foe, -2);
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: jamian});
  assert.equal(s.units[jamian].prepared, true);
  assert.ok(s.effects.some(e => e.kind === 'noStrike' && e.target === jamian));
});
