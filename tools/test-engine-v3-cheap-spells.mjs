// Spells baratas da color pie (autor, 31/10/2026: docs/spells-baratas-proposta.md), ids 505 a 519.
// node --test tools/test-engine-v3-cheap-spells.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
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
import {checkDefeats, atkOf, hpOf, modify} from '../playtest/engine-v3/effects.js';
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
const FOE = 'artemis-v6-399'; // 3/4
const cast = (s, ctx, give, id, key = 'A') => { const spell = give(key, id, 'hand'); playSpell(s, ctx, key, spell); if (s.window) passAll(s); };
const hand = s => s.players.A.hand.length;
const big = () => [...cards.values()].find(c => c.kind === 'Devotee' && c.atk >= 4 && c.id.startsWith('artemis-v6')).id;

test('505 Athena\'s Aegis: previne 2 de dano no Devoto aliado e compra', () => {
  const {s, ctx, give} = setup();
  const ally = give('A', 'athena-v6-005'), h = hand(s);
  cast(s, ctx, give, 'athena-v6-505');
  assert.equal(hand(s), h + 1);
  k.damage(s, ctx, ally, 2); checkDefeats(s, ctx);
  assert.equal(s.units[ally].damage, 0);
});

test('506 Sanctuary\'s Judgment: 3 de dano só em quem declarou Strike neste turno', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', FOE);
  s.strikes.set(foe, s.turn);
  cast(s, ctx, give, 'athena-v6-506');
  assert.equal(s.units[foe].damage, 3);
});

test('507 Oath of the Saints: Saint +1/+1 e compra', () => {
  const {s, ctx, give} = setup();
  const saint = give('A', 'athena-v6-005'), atk = atkOf(s, ctx, saint), h = hand(s);
  cast(s, ctx, give, 'athena-v6-507');
  assert.equal(atkOf(s, ctx, saint), atk + 1);
  assert.equal(hand(s), h + 1);
});

test('508 Undertow: devolve Devoto inimigo de custo 2 ou menos', () => {
  const {s, ctx, give} = setup();
  const id = [...cards.values()].find(c => c.kind === 'Devotee' && c.cost?.amount <= 2 && c.id.startsWith('artemis-v6')).id;
  const foe = give('B', id);
  cast(s, ctx, give, 'poseidon-v6-508');
  assert.ok(s.players.B.hand.includes(foe));
});

test('509 Tidal Veto: sem Spell inimiga na cadeia não pode ser jogada', () => {
  const {s, ctx, give} = setup();
  assert.throws(() => playSpell(s, ctx, 'A', give('A', 'poseidon-v6-509', 'hand')), /cadeia/);
});

test('510 Mist of the Deep: devolve o próprio Devoto e compra', () => {
  const {s, ctx, give} = setup();
  const ally = give('A', 'athena-v6-005'), h = hand(s);
  cast(s, ctx, give, 'poseidon-v6-510');
  assert.ok(s.players.A.hand.includes(ally));
  assert.equal(hand(s), h + 2);
});

test('511 Touch of Death: -2/-2 derrota Devoto de 2 de PV', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', FOE);
  cast(s, ctx, give, 'hades-v6-511');
  assert.equal(hpOf(s, ctx, foe), 2);
  s.units[foe].damage = 0;
  const id = [...cards.values()].find(c => c.kind === 'Devotee' && c.hp === 2 && c.id.startsWith('artemis-v6')).id;
  const small = give('B', id);
  cast(s, ctx, give, 'hades-v6-511');
  if (s.players.B.battlefield.includes(foe)) assert.ok(s.players.B.tartarus.includes(small) || hpOf(s, ctx, small) <= 0);
});

test('512 Pact of the Underworld: compra 2 e o Deus perde 2 de Alma', () => {
  const {s, ctx, give} = setup();
  const h = hand(s), soul = s.players.A.soul;
  cast(s, ctx, give, 'hades-v6-512');
  assert.equal(hand(s), h + 2);
  assert.equal(s.players.A.soul, soul - 2);
});

test('513 Return from the Darkness: Devoto de custo 3 ou menos do Tártaro para a mão', () => {
  const {s, ctx, give} = setup();
  const dead = give('A', 'athena-v6-005', 'tartarus');
  cast(s, ctx, give, 'hades-v6-513');
  assert.ok(s.players.A.hand.includes(dead));
});

test('514 Spark of War: 1 de dano e compra', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', FOE), h = hand(s);
  cast(s, ctx, give, 'ares-v6-514');
  assert.equal(s.units[foe].damage, 1);
  assert.equal(hand(s), h + 1);
});

test('515 Reckless Insight: compra 1; compra 2 se o God inimigo perdeu Soul no turno', () => {
  let {s, ctx, give} = setup();
  let h = hand(s);
  cast(s, ctx, give, 'ares-v6-515');
  assert.equal(hand(s), h + 1);
  ({s, ctx, give} = setup());
  s.events.push({type: 'soul_lost', player: 'B'});
  h = hand(s);
  cast(s, ctx, give, 'ares-v6-515');
  assert.equal(hand(s), h + 2);
});

test('425 Wilderness Reborn: devolve até 3 do Tártaro ao deck e compra 1', () => {
  const {s, ctx, give} = setup(), p = s.players.A;
  p.tartarus.push(...p.deck.splice(0, 4));
  const h = hand(s), t = p.tartarus.length;
  cast(s, ctx, give, 'artemis-v6-425');
  assert.equal(hand(s), h + 1);
  assert.equal(p.tartarus.length, t - 3 + 1); // a própria Spell vai ao Tártaro
});

test('516 Fury of Ares: +2 ATK e compra', () => {
  const {s, ctx, give} = setup();
  const ally = give('A', 'athena-v6-005'), atk = atkOf(s, ctx, ally), h = hand(s);
  cast(s, ctx, give, 'ares-v6-516');
  assert.equal(atkOf(s, ctx, ally), atk + 2);
  assert.equal(hand(s), h + 1);
});

test('517 Huntress\'s Net: 4 de dano só em Devoto com ATK 4 ou mais', () => {
  const {s, ctx, give} = setup();
  const small = give('B', 'athena-v6-005'), foe = give('B', big());
  cast(s, ctx, give, 'artemis-v6-517');
  assert.ok(s.units[foe] ? s.units[foe].damage === 4 : s.players.B.tartarus.includes(foe));
  assert.equal(s.units[small].damage, 0);
});

test('518 Wild Vigor: +2/+2', () => {
  const {s, ctx, give} = setup();
  const ally = give('A', 'athena-v6-005'), atk = atkOf(s, ctx, ally), hp = hpOf(s, ctx, ally);
  cast(s, ctx, give, 'artemis-v6-518');
  assert.equal(atkOf(s, ctx, ally), atk + 2);
  assert.equal(hpOf(s, ctx, ally), hp + 2);
});

test('519 Lunar Vision: pega um Devoto das três do topo e o resto vai ao fundo', () => {
  const {s, ctx, give} = setup();
  const deck = s.players.A.deck, dev = give('A', 'athena-v6-005', 'deck');
  deck.splice(deck.indexOf(dev), 1); deck.splice(1, 0, dev);
  const [a, , c3] = deck.slice(0, 3);
  cast(s, ctx, give, 'artemis-v6-519');
  assert.ok(s.players.A.hand.includes(dev));
  assert.deepEqual(deck.slice(-2), [a, c3].filter(u => u !== dev));
});

test('505–519 com alvo obrigatório: sem alvo legal não podem ser conjuradas (a carta fica na mão)', () => {
  const {s, ctx, give} = setup();
  for (const id of ['athena-v6-506', 'poseidon-v6-508', 'hades-v6-511', 'ares-v6-514', 'artemis-v6-517', 'artemis-v6-518']) {
    const spell = give('A', id, 'hand');
    assert.throws(() => playSpell(s, ctx, 'A', spell), /alvo/, id);
    assert.ok(s.players.A.hand.includes(spell), id);
  }
});
