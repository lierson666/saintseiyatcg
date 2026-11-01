// Afterlife (guia §40, autor 01/11/2026): ativada do Tartarus; próprio turno ou resposta só com Latent; depois vai para o Void.
// node --test tools/test-engine-v3-afterlife.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, RuleError} from '../playtest/engine-v3/core.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';
import {afterlifeBlock, activateAfterlife} from '../playtest/engine-v3/play.js';
import {AFTERLIFE} from '../playtest/engine-v3/v6/afterlife.js';
import {guardDecide} from './engine-test-upto.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const [rush, fortress] = read('./fixtures/decks-proposta-d171.json').decks;

function setup(cardId) {
  const m = createMatch({cards, canonIndex: index, decks: {A: rush, B: fortress}, gods: {A: 'god-hades', B: 'god-athena'}, first: 'A', seed: 5});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0));
  m.state.setup = null;
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached, decide: (key, q) => q.options?.[0] ?? true});
  bindContext(s, ctx);
  const uid = 'test-afterlife';
  ctx.objects[uid] = {cardId, owner: 'A'};
  s.players.A.tartarus.push(uid);
  startTurn(s);
  s.players.A.latent = 3;
  const foe = s.players.B.deck.find(u => cards.get(m.objects[u].cardId).kind === 'Devotee');
  s.players.B.deck.splice(s.players.B.deck.indexOf(foe), 1);
  s.players.B.battlefield.push(foe);
  s.units[foe] = {prepared: true, damage: 0};
  return {s, ctx, uid, foe, A: s.players.A, B: s.players.B};
}

test('todas as 9 cartas da tabela existem no catálogo', () => {
  assert.equal(Object.keys(AFTERLIFE).length, 9);
  for (const id of Object.keys(AFTERLIFE)) assert.ok(cards.get(id), id);
});

test('no próprio turno: paga, resolve o efeito e vai para o Void', () => {
  const {s, ctx, uid, A, B} = setup('hades-v6-217'), soul = B.soul, latent = A.latent;
  activateAfterlife(s, ctx, 'A', uid);
  assert.ok(A.tartarus.includes(uid), 'só vai para o Void depois de resolver');
  assert.equal(afterlifeBlock(s, ctx, 'B', uid), 'zone');
  passAll(s);
  assert.equal(B.soul, soul - 1);
  assert.equal(A.latent, latent - 2);
  assert.ok(!A.tartarus.includes(uid) && A.void.includes(uid));
});

test('alvo: sem Devotee inimigo fica bloqueada; com alvo causa o dano', () => {
  const t = setup('hades-v6-214');
  activateAfterlife(t.s, t.ctx, 'A', t.uid); passAll(t.s);
  assert.equal(t.s.units[t.foe].damage, 2);
  const u = setup('hades-v6-214');
  u.B.battlefield.length = 0;
  assert.equal(afterlifeBlock(u.s, u.ctx, 'A', u.uid), 'target');
});

test('como resposta: exige prioridade e paga só com Latent', () => {
  const {s, ctx, uid, A} = setup('hades-v6-220');
  endTurn(s); // janela da End Phase: B tem prioridade primeiro
  assert.equal(afterlifeBlock(s, ctx, 'A', uid), 'timing');
  s.window.priority = 'A';
  A.latent = 0;
  assert.equal(afterlifeBlock(s, ctx, 'A', uid), 'cost', 'Base não paga resposta');
  A.latent = 1;
  A.soul -= 5; // Soul não passa do inicial
  const soul = A.soul;
  activateAfterlife(s, ctx, 'A', uid);
  assert.equal(A.latent, 0);
  assert.throws(() => activateAfterlife(s, ctx, 'A', uid), RuleError, 'não ativa duas vezes');
  passAll(s);
  assert.equal(A.soul, soul + 1);
  assert.ok(A.void.includes(uid));
});

test('fora do turno e sem resposta aberta: bloqueada; carta sem Afterlife: bloqueada', () => {
  const {s, ctx, uid} = setup('hades-v6-220');
  assert.equal(afterlifeBlock(s, ctx, 'B', uid), 'zone');
  ctx.objects.other = {cardId: 'hades-v6-212', owner: 'A'};
  s.players.A.tartarus.push('other');
  assert.equal(afterlifeBlock(s, ctx, 'A', 'other'), 'none');
});
