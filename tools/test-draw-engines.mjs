// Draw engines de Ares, Athena e Artemis (autor, 01/11/2026; docs/draw-engines-2026-11-01/cards.diff.md).
// 026, 035, 043, 345, 425 e 515 têm teste em test-engine-v3-v6-athena-devotees, -triggers e -cheap-spells.
// node --test tools/test-draw-engines.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll} from '../playtest/engine-v3/core.js';
import {playDevotee, playSpell, playEquipment, reequip, activateAfterlife} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {keywordsOf} from '../playtest/engine-v3/effects.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';
import * as k from '../playtest/engine-v3/v6/kit.js';
import {guardDecide} from './engine-test-upto.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('./fixtures/decks-preview.json').decks;

function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached}), p = s.players.A;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0));
  s.setup = null; s.domains.A = null; s.domains.B = null;
  bindContext(s, ctx); // os gatilhos de turno usam este ctx, com `decide`
  startTurn(s);
  for (const pl of Object.values(s.players)) pl.bases = pl.deck.splice(0, 10).map(uid => ({uid, prepared: true}));
  ctx.decide = (player, q) => (q.options ? (q.options.find(o => String(o).startsWith('god:')) ?? q.options[0]) : player === 'A');
  let n = 0;
  const give = (key, id, zone = 'battlefield') => {
    const uid = `${key}:${id}:t${n++}`;
    m.objects[uid] = {owner: key, cardId: id, armor: cards.get(id).armor};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    return uid;
  };
  const devotee = (key, id) => { playDevotee(s, ctx, key, give(key, id, 'hand'), {}); passAll(s); };
  // Jogar não prende (§33); só Armor em Resonant já entra vestida. O resto paga o Equip depois.
  const equip = (key, id, bearer) => {
    const uid = give(key, id, 'hand');
    const armored = cards.get(id).armor && bearer && !bearer.includes('367');
    playEquipment(s, ctx, key, uid, armored ? bearer : undefined); passAll(s);
    if (bearer && !ctx.attached[uid]) { reequip(s, ctx, key, uid, bearer); passAll(s); }
    return uid;
  };
  return {s, ctx, p, give, devotee, equip, hand: () => p.hand.length};
}

test('311 Blood Oath Warrior: 2 de dano no God e compra, sem descartar', () => {
  const {p, devotee, hand} = setup(), h = hand(), soul = p.soul;
  devotee('A', 'ares-v6-311');
  assert.deepEqual([hand(), p.soul], [h + 1, soul - 2]);
});

test('312 Battlefield Scavenger: outro Berserker derrotado compra, uma vez por turno', () => {
  const {s, ctx, give, hand} = setup();
  give('A', 'ares-v6-312');
  const [a, b] = [give('A', 'ares-v6-293'), give('A', 'ares-v6-293')], h = hand();
  k.defeat(s, ctx, a); passAll(s);
  assert.equal(hand(), h + 1);
  k.defeat(s, ctx, b); passAll(s);
  assert.equal(hand(), h + 1);
});

test('307 Divine Flame Disciple: troca 2 cartas e cria token por Devotee descartado', () => {
  const {p, give, devotee} = setup();
  give('A', 'ares-v6-293', 'hand'); give('A', 'ares-v6-322', 'hand');
  const field = p.battlefield.length;
  devotee('A', 'ares-v6-307');
  assert.equal(p.hand.length, 2);
  assert.equal(p.battlefield.length, field + 2); // o Disciple e um token
});

test('319 War Drums (Rhythm of the Wild, 08/11/2026): os Devotees aliados têm Impulse', () => {
  const {s, ctx, give} = setup();
  give('A', 'ares-v6-319'); const host = give('A', 'ares-v6-293');
  assert.ok(keywordsOf(s, ctx, host).includes('Impulse'));
});

test('321 Chains of Fury: dano de combate no God compra', () => {
  const {s, ctx, give, equip, hand} = setup();
  const host = give('A', 'ares-v6-293');
  equip('A', 'ares-v6-321', host);
  const h = hand();
  declareStrike(s, ctx, host, {kind: 'god', player: 'B'}); passAll(s);
  assert.equal(hand(), h + 1);
});

test('330 Fuel the Rage: Afterlife compra e a carta vai ao Void', () => {
  const {s, ctx, p, give, hand} = setup();
  const uid = give('A', 'ares-v6-330', 'tartarus');
  p.latent = 3;
  const h = hand();
  activateAfterlife(s, ctx, 'A', uid); passAll(s);
  assert.equal(hand(), h + 1);
  assert.ok(p.void.includes(uid));
});

test('042 Jamir Cloth Repairer: compra também ao jogar Armor, uma vez por turno', () => {
  const {give, equip, hand} = setup();
  give('A', 'athena-v6-042');
  const seiya = give('A', 'athena-v6-001'), h = hand();
  equip('A', 'athena-v6-002', seiya); // Armor
  assert.equal(hand(), h + 1);
  equip('A', 'athena-v6-051', seiya);
  assert.equal(hand(), h + 1);
});

test('051 Sanctuary Torch: primeira Spell inimiga do turno compra', () => {
  const {s, ctx, give} = setup(), foe = s.players.B;
  const host = give('B', 'athena-v6-040'), torch = give('B', 'athena-v6-051');
  ctx.attached[torch] = host;
  const h = foe.hand.length;
  for (let i = 0; i < 2; i++) { playSpell(s, ctx, 'A', give('A', 'ares-v6-515', 'hand')); passAll(s); }
  assert.equal(foe.hand.length, h + 1);
});

test('387 Sacred Grove Keeper: 0/4 Guardian que compra ao entrar', () => {
  const {devotee, hand} = setup(), c = cards.get('artemis-v6-387'), h = hand();
  assert.deepEqual([c.atk, c.hp, c.keywords.includes('Guardian')], [0, 4, true]);
  devotee('A', 'artemis-v6-387');
  assert.equal(hand(), h + 1);
});

test('401 Huntress Apprentice: custa 2; Sacred Beast aliada compra, uma vez por turno', () => {
  const {give, devotee, hand} = setup();
  assert.equal(cards.get('artemis-v6-401').cost.amount, 2);
  give('A', 'artemis-v6-401');
  const h = hand();
  devotee('A', 'artemis-v6-403');
  assert.ok(hand() >= h + 1);
  const after = hand();
  devotee('A', 'artemis-v6-381');
  assert.equal(hand(), after);
});

test('414 Moonstone Amulet: no início do turno, perde 2 Soul e compra', () => {
  const {s, p, give, equip, hand} = setup();
  equip('A', 'artemis-v6-414', give('A', 'artemis-v6-367'));
  const h = hand(), soul = p.soul;
  endTurn(s); passAll(s); startTurn(s); passAll(s);
  endTurn(s); passAll(s); startTurn(s); passAll(s);
    assert.deepEqual([hand(), p.soul], [h + 2, soul - 2]); // a compra do turno e a do Amulet
});

test('416 Ancient Root Armor: Devotee aliado com ATK 4+ compra; menor não', () => {
  const {give, equip, devotee, hand} = setup();
  equip('A', 'artemis-v6-416', give('A', 'artemis-v6-367')); // Armor sem Resonant: entra sem portador e o Equip a veste
  let h = hand();
  devotee('A', 'ares-v6-293');
  assert.equal(hand(), h);
  h = hand();
  devotee('A', 'ares-v6-279');
  assert.equal(hand(), h + 1);
});

test('426 The Will of Artemis: compra por Devotee e 2 Soul por ATK 4+', () => {
  const {s, ctx, p, give, hand} = setup();
  give('A', 'ares-v6-293'); give('A', 'ares-v6-279');
  p.soul -= 6;
  const spell = give('A', 'artemis-v6-426', 'hand'), h = hand(), soul = p.soul;
  playSpell(s, ctx, 'A', spell); passAll(s);
  assert.deepEqual([hand(), p.soul], [h - 1 + 2, soul + 2]);
});
