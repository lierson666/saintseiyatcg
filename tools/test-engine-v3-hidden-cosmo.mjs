// Hidden Cosmo {X} (guia §4A, autor 31/10/2026): jogar da Cosmo Base, playtest/engine-v3/play.js castHidden.
// node --test tools/test-engine-v3-hidden-cosmo.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll} from '../playtest/engine-v3/core.js';
import {castHidden} from '../playtest/engine-v3/play.js';
import {applyAction} from '../playtest/engine-v3/actions.js';
import {guardDecide} from './engine-test-upto.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

// A no próprio turno, mão vazia; `bases`: Bases Prepared além da carta com Hidden Cosmo.
function setup(id, bases) {
  const deck = d => ({...decks.find(x => x.id === d)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached}), p = s.players.A;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  startTurn(s);
  p.latent = 0;
  p.bases = p.deck.splice(0, bases).map(uid => ({uid, prepared: true}));
  ctx.decide = (player, q) => (q.options ? q.options[0] : false);
  const uid = 'A:hidden:t0';
  m.objects[uid] = {owner: 'A', cardId: id, armor: false};
  p.bases.push({uid, prepared: true});
  return {m, s, ctx, p, uid};
}

test('as 5 cartas têm Hidden Cosmo; Athena vem do Forge por cima do D268', () => {
  const x = {'athena-v6-009': 6, 'poseidon-v6-157': 5, 'hades-v6-209': 4, 'ares-v6-295': 3, 'artemis-v6-394': 3};
  for (const [id, n] of Object.entries(x)) assert.equal(cards.get(id).hiddenCosmo, n, id);
  assert.equal(cards.get('ares-v6-291').hiddenCosmo, null);
});

test('Bloodthirsty Berserker {3}: paga 1 de si e 2 Bases; o topo do deck vira Base Unprepared; entra com Impulse', () => {
  const {s, ctx, p, uid} = setup('ares-v6-295', 2);
  const top = p.deck[0];
  castHidden(s, ctx, 'A', uid);
  passAll(s);
  assert.ok(p.battlefield.includes(uid));
  assert.equal(s.units[uid].prepared, true, 'Impulse');
  assert.equal(p.bases.length, 3, 'o número de Bases não cai');
  assert.deepEqual(p.bases.find(b => b.uid === top), {uid: top, prepared: false});
  assert.equal(p.bases.filter(b => b.prepared).length, 0);
});

test('sem Cosmo suficiente nada muda: a carta continua na Base', () => {
  const {s, ctx, p, uid} = setup('artemis-v6-394', 1); // {3}: 1 de si + 1 Base não basta
  const deck = p.deck.length;
  assert.throws(() => castHidden(s, ctx, 'A', uid), /insuficientes|insuficiente/);
  assert.ok(p.bases.some(b => b.uid === uid));
  assert.equal(p.hand.includes(uid), false);
  assert.equal(p.deck.length, deck);
  assert.equal(s.hidden, undefined);
});

test('Base gasta não paga a si mesma', () => {
  const {s, ctx, p, uid} = setup('artemis-v6-394', 2);
  p.bases.find(b => b.uid === uid).prepared = false;
  assert.throws(() => castHidden(s, ctx, 'A', uid), /insuficientes/);
  p.bases.push(...p.deck.splice(0, 1).map(u => ({uid: u, prepared: true})));
  castHidden(s, ctx, 'A', uid); passAll(s);
  assert.ok(p.battlefield.includes(uid));
});

test('carta sem Hidden Cosmo e carta fora da Base não jogam; ação serializável `hidden`', () => {
  const {m, s, ctx, p} = setup('ares-v6-295', 3);
  const plain = p.bases[0].uid;
  assert.throws(() => castHidden(s, ctx, 'A', plain), /Hidden Cosmo/);
  const {uid} = setup('ares-v6-295', 3);
  const loose = 'A:hidden:loose';
  m.objects[loose] = {owner: 'A', cardId: 'ares-v6-295', armor: false};
  assert.throws(() => castHidden(s, ctx, 'A', loose), /Cosmo Bases/);
  const t = setup('ares-v6-295', 2);
  applyAction(t.m, t.ctx, {type: 'hidden', key: 'A', uid: t.uid});
  passAll(t.s);
  assert.ok(t.p.battlefield.includes(t.uid));
  assert.ok(uid);
});
