// Divine Command dos 5 Gods (autor, 01/11/2026; guia §63) e God sem retaliação (§24).
// node --test tools/test-engine-v3-divine-command.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll, endTurn, RuleError} from '../playtest/engine-v3/core.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';
import {atkOf, hpOf} from '../playtest/engine-v3/effects.js';
import {refreshAwaken, activateCommand, commandBlock} from '../playtest/engine-v3/gods.js';
import {costOf} from '../playtest/engine-v3/v6/kit.js';
import {guardDecide} from './engine-test-upto.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('./fixtures/decks-proposta-d171.json').decks;

// A joga o God `god`; B é Athena. A tem 1 Latent para pagar {1}{C}.
function setup(god) {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, gods: {A: god, B: 'god-athena'}, first: 'A', seed: 3});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null;
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached, decide: () => true});
  bindContext(s, ctx);
  const put = (key, uid) => { const p = s.players[key]; p.deck.splice(p.deck.indexOf(uid), 1); p.battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  const devotee = (key, test = () => true) => put(key, s.players[key].deck.find(u => cards.get(m.objects[u].cardId).kind === 'Devotee' && test(u)));
  startTurn(s);
  s.players.A.latent = 1;
  const awaken = () => { s.players.A.soul = s.divine.A.awakenAt; refreshAwaken(s); };
  return {s, ctx, devotee, awaken, A: s.players.A, B: s.players.B};
}
const use = (s, ctx, uid) => { activateCommand(s, ctx, 'A', uid); passAll(s); };

test('Athena HEALING LIGHT: remove 1 dano; Awakened remove 2 e ganha 1 Soul', () => {
  const {s, ctx, devotee} = setup('god-athena'), hurt = devotee('A');
  s.units[hurt].damage = 3;
  use(s, ctx, hurt);
  assert.equal(s.units[hurt].damage, 2);
  const t = setup('god-athena'); t.awaken();
  const ally = t.devotee('A'); t.s.units[ally].damage = 3;
  const soul = t.A.soul;
  use(t.s, t.ctx, ally);
  assert.deepEqual([t.s.units[ally].damage, t.A.soul], [1, soul + 1]);
});

test('Poseidon BINDING TIDE: Seal só em custo 2 ou menos; Awakened qualquer custo', () => {
  const t = setup('god-poseidon');
  const cheap = t.devotee('B', u => costOf(t.ctx, u) <= 2), big = t.devotee('B', u => costOf(t.ctx, u) > 2);
  assert.equal(commandBlock(t.s, t.ctx, 'A', big), 'target');
  use(t.s, t.ctx, cheap);
  assert.equal(t.s.units[cheap].seal, 1);
  const w = setup('god-poseidon'); w.awaken();
  const big2 = w.devotee('B', u => costOf(w.ctx, u) > 2);
  use(w.s, w.ctx, big2);
  assert.equal(w.s.units[big2].seal, 1);
});

test('Hades DARK TOUCH: -1/-1 até o fim da rodada; Awakened -2/-2', () => {
  const t = setup('god-hades'), foe = t.devotee('B', u => hpOf(t.s, t.ctx, u) >= 4);
  const [atk, hp] = [atkOf(t.s, t.ctx, foe), hpOf(t.s, t.ctx, foe)];
  use(t.s, t.ctx, foe);
  assert.deepEqual([atkOf(t.s, t.ctx, foe), hpOf(t.s, t.ctx, foe)], [Math.max(0, atk - 1), hp - 1]);
  const w = setup('god-hades'); w.awaken();
  const foe2 = w.devotee('B', u => hpOf(w.s, w.ctx, u) >= 4), hp2 = hpOf(w.s, w.ctx, foe2);
  use(w.s, w.ctx, foe2);
  assert.equal(hpOf(w.s, w.ctx, foe2), hp2 - 2);
});

test('Ares BLOOD TOLL: 1 dano no Devotee inimigo e Ares perde 1 Soul, mesmo Awakened', () => {
  const t = setup('god-ares'), foe = t.devotee('B', u => hpOf(t.s, t.ctx, u) >= 2), soul = t.A.soul;
  use(t.s, t.ctx, foe);
  assert.deepEqual([t.s.units[foe].damage, t.A.soul], [1, soul - 1]);
});

test('Artemis HUNTRESS TRAINING: 1 Training counter; Awakened 2', () => {
  const t = setup('god-artemis'), ally = t.devotee('A');
  use(t.s, t.ctx, ally);
  assert.equal(t.s.units[ally].training, 1);
  const w = setup('god-artemis'); w.awaken();
  const ally2 = w.devotee('A');
  use(w.s, w.ctx, ally2);
  assert.equal(w.s.units[ally2].training, 2);
});

test('Divine Command: custa {1}{C}, uma vez por turno, só no próprio turno com a pilha vazia', () => {
  const t = setup('god-ares'), foe = t.devotee('B', u => hpOf(t.s, t.ctx, u) >= 3);
  t.A.latent = 0;
  assert.equal(commandBlock(t.s, t.ctx, 'A', foe), 'cost');
  t.A.latent = 2;
  use(t.s, t.ctx, foe);
  assert.equal(t.A.latent, 1);
  assert.throws(() => activateCommand(t.s, t.ctx, 'A', foe), RuleError);
  endTurn(t.s); passAll(t.s);
  assert.equal(commandBlock(t.s, t.ctx, 'A', foe), 'sorcery', 'turno do oponente');
});
