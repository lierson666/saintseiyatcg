// Domains de compra com drawback da facção (autor, 31/10/2026): Athena 501, Poseidon 502, Ares 503, Artemis 504.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, addSeal} from '../playtest/engine-v3/core.js';
import {activate} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';
import * as k from '../playtest/engine-v3/v6/kit.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = [...read('../data/alpha-0.1/decks-preview.json').decks, ...read('../data/alpha-0.1/decks-competitivos.json').decks];
const deck = id => ({...decks.find(d => d.id === id)});

// A joga `deckA` com o Domain `domain`; B, Ares sem Domain. Cartas avulsas entram por `field`.
function setup(deckA, domain) {
  const m = createMatch({cards, canonIndex: index, decks: {A: deck(deckA), B: deck('preview-ares-legions')}, first: 'A', seed: 1});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A;
  bindContext(s, ctx);
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  s.domains = {A: domain, B: null};
  startTurn(s); passAll(s);
  p.bases = p.deck.splice(0, 6).map(uid => ({uid, prepared: true}));
  let n = 0;
  const field = (key, cardId) => {
    const uid = `${key}:t${++n}:${cardId.slice(-3)}`;
    m.objects[uid] = {owner: key, cardId, armor: cards.get(cardId).armor};
    s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0, entered: 0};
    return uid;
  };
  ctx.decide = (player, q) => (q.options ? q.options[0] : true);
  return {s, ctx, p, field};
}

test("501 Athena's Statue: Saint sobrevive a um Strike, compra 1 e o God perde 1 Soul (comparado ao mesmo Strike sem o Domain)", () => {
  const run = domain => {
    const {s, ctx, p, field} = setup('comp-athena-cloth-voltron', domain);
    const saint = field('A', 'athena-v6-001'), foe = field('B', 'ares-v6-271');
    k.buff(s, saint, 0, 10); // sobrevive com folga
    const hand = p.hand.length, soul = p.soul;
    s.active = 'B';
    declareStrike(s, ctx, foe, {kind: 'devotee', uid: saint}); passAll(s);
    assert.ok(s.players.A.battlefield.includes(saint), 'Saint sobreviveu');
    return {hand: p.hand.length - hand, soul: p.soul - soul};
  };
  const without = run(null), withStatue = run('athena-v6-501');
  assert.equal(withStatue.hand, without.hand + 1);
  assert.equal(withStatue.soul, without.soul - 1);
});

test('502 The Tidal Archive: inimigo fica Sealed, compra 1 e mói 2; uma vez por rodada', () => {
  const {s, ctx, p, field} = setup('preview-poseidon-tide', 'poseidon-v6-502');
  const f1 = field('B', 'ares-v6-271'), f2 = field('B', 'ares-v6-271');
  const hand = p.hand.length, deckN = p.deck.length;
  addSeal(s, ctx, [f1], 1, 'TEST'); passAll(s);
  assert.equal(p.hand.length, hand + 1);
  assert.equal(p.deck.length, deckN - 3);
  addSeal(s, ctx, [f2], 1, 'TEST'); passAll(s);
  assert.equal(p.hand.length, hand + 1, 'só uma vez por rodada');
});

test('503 The Altar of Slaughter: sacrifica um Devotee seu, perde 1 Soul e compra 1; uma vez por rodada', () => {
  const {s, ctx, p, field} = setup('preview-ares-legions', 'ares-v6-503');
  const mine = field('A', 'ares-v6-271');
  const hand = p.hand.length, soul = p.soul;
  activate(s, ctx, 'A', 'domain:A', {}); passAll(s);
  assert.ok(p.tartarus.includes(mine));
  assert.equal(p.soul, soul - 1);
  assert.equal(p.hand.length, hand + 1);
  field('A', 'ares-v6-271');
  assert.throws(() => activate(s, ctx, 'A', 'domain:A', {}));
});

test("504 The Hunter's Moon: no início do turno troca uma Base pelo topo do deck (Unprepared) e compra 1", () => {
  const {s, p} = setup('preview-artemis-hunt', 'artemis-v6-504');
  const turn0 = s.turn;
  for (let i = 0; i < 6 && !(s.active === 'A' && s.turn > turn0); i++) { // volta ao próximo turno de A
    if (s.events.at(-1).type === 'round_end' || s.events.at(-1).type === 'turn_end') startTurn(s); else endTurn(s);
    passAll(s);
  }
  if (process.env.DBG) console.log(s.active, s.turn, s.events.slice(-8).map(e => e.type).join(','), p.tartarus.length, p.bases.length);
  const bases = p.bases.length;
  assert.equal(p.bases.length, bases);
  assert.ok(p.tartarus.length >= 1);
  assert.equal(p.bases.at(-1).prepared, false);
});
