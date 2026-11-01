// Domains (guia §63, autor 31/10/2026): linha 1 simples, linha 2 Once per game, e Domain fora da cor do God.
// Domains 501–504 + regra geral (Once per game uma vez; fora da cor: estática off, sem Once per game, {1}{S} nos gatilhos).
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
const decks = [...read('./fixtures/decks-preview.json').decks, ...read('./fixtures/decks-competitivos.json').decks];
const deck = id => ({...decks.find(d => d.id === id)});

// A joga `deckA` com o Domain `domain`; B, Ares sem Domain. Cartas avulsas entram por `field`.
function setup(deckA, domain) {
  const m = createMatch({cards, canonIndex: index, decks: {A: deck(deckA), B: deck('preview-ares-legions')}, gods: {A: deck(deckA).god, B: 'god-ares'}, first: 'A', seed: 1});
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

test("501 Athena's Statue: Saint sobrevive a um Strike e o God ganha 1 Soul, sem comprar", () => {
  const run = domain => {
    const {s, ctx, p, field} = setup('comp-athena-cloth-voltron', domain);
    const saint = field('A', 'athena-v6-001'), foe = field('B', 'ares-v6-271');
    k.buff(s, saint, 0, 10); // sobrevive com folga
    p.soul -= 5; // abaixo do máximo, para o ganho aparecer
    const hand = p.hand.length, soul = p.soul;
    s.active = 'B';
    declareStrike(s, ctx, foe, {kind: 'devotee', uid: saint}); passAll(s);
    assert.ok(s.players.A.battlefield.includes(saint), 'Saint sobreviveu');
    return {hand: p.hand.length - hand, soul: p.soul - soul};
  };
  const without = run(null), withStatue = run('athena-v6-501');
  assert.equal(withStatue.hand, without.hand);
  assert.equal(withStatue.soul, without.soul + 1);
});

test('502 The Tidal Archive: Sealed só olha o topo; Once per game compra 2 e mói 2, uma vez na partida', () => {
  const {s, ctx, p, field} = setup('preview-poseidon-tide', 'poseidon-v6-502');
  const f1 = field('B', 'ares-v6-271');
  const hand = p.hand.length, deckN = p.deck.length, top = p.deck[0];
  addSeal(s, ctx, [f1], 1, 'TEST'); passAll(s);
  assert.equal(p.hand.length, hand, 'linha 1 não compra');
  assert.equal(p.deck.length, deckN);
  assert.equal(p.deck.at(-1), top, 'topo foi para o fundo');
  activate(s, ctx, 'A', 'domain:A:opg', {}); passAll(s);
  assert.equal(p.hand.length, hand + 2);
  assert.equal(p.deck.length, deckN - 4);
  assert.equal(s.domainUsed.A, true);
  assert.throws(() => activate(s, ctx, 'A', 'domain:A:opg', {}), /Once per game/);
});

test('503 The Altar of Slaughter: linha 1 sacrifica e causa 1 de dano; Once per game sacrifica e compra 3', () => {
  const {s, ctx, p, field} = setup('preview-ares-legions', 'ares-v6-503');
  const mine = field('A', 'ares-v6-271'), foe = field('B', 'ares-v6-271');
  const soul = p.soul;
  activate(s, ctx, 'A', 'domain:A', {}); passAll(s);
  assert.ok(p.tartarus.includes(mine));
  assert.equal(s.units[foe].damage, 1);
  assert.equal(p.soul, soul, 'mesma cor: sem custo de Soul');
  field('A', 'ares-v6-271');
  assert.throws(() => activate(s, ctx, 'A', 'domain:A', {}), /Round/);
  const hand = p.hand.length;
  activate(s, ctx, 'A', 'domain:A:opg', {}); passAll(s);
  assert.equal(p.hand.length, hand + 3);
});

test("504 The Hunter's Moon: Once per game troca uma Base por 2 cartas e o topo vira Base Unprepared", () => {
  const {s, ctx, p} = setup('preview-artemis-hunt', 'artemis-v6-504');
  const hand = p.hand.length, bases = p.bases.length;
  activate(s, ctx, 'A', 'domain:A:opg', {}); passAll(s);
  assert.equal(p.hand.length, hand + 2);
  assert.equal(p.bases.length, bases);
  assert.equal(p.bases.at(-1).prepared, false);
  assert.equal(p.tartarus.length, 1);
});

test('Domain fora da cor: sem Once per game, ativada custa {1}{S} a mais', () => {
  const {s, ctx, p, field} = setup('comp-athena-cloth-voltron', 'ares-v6-503'); // God Athena + Domain Ares
  field('A', 'athena-v6-001'); field('B', 'ares-v6-271');
  assert.throws(() => activate(s, ctx, 'A', 'domain:A:opg', {}));
  const soul = p.soul;
  activate(s, ctx, 'A', 'domain:A', {}); passAll(s);
  assert.equal(p.soul, soul - 1);
});

test('Domain fora da cor: estática desligada (332 War Temple com God Athena)', () => {
  const atk = (deckA, domain) => {
    const {s, ctx, field} = setup(deckA, domain);
    return k.atkOf(s, ctx, field('A', 'ares-v6-293'));
  };
  const base = atk('comp-athena-cloth-voltron', null);
  assert.equal(atk('preview-ares-legions', 'ares-v6-332'), base + 1, 'mesma cor: +1 ATK');
  assert.equal(atk('comp-athena-cloth-voltron', 'ares-v6-332'), base, 'fora da cor: sem bônus');
});

test('Domain fora da cor: gatilho pede {1}{S}; recusar cancela (502 com God Athena)', () => {
  for (const pay of [true, false]) {
    const {s, ctx, p, field} = setup('comp-athena-cloth-voltron', 'poseidon-v6-502');
    ctx.decide = (player, q) => (q.options ? q.options[0] : q.cost === '1 Soul' ? pay : true);
    const soul = p.soul, top = p.deck[0];
    addSeal(s, ctx, [field('B', 'ares-v6-271')], 1, 'TEST'); passAll(s);
    assert.equal(p.soul, soul - (pay ? 1 : 0));
    assert.equal(p.deck.at(-1) === top, pay, pay ? 'pagou: olhou o topo' : 'recusou: nada');
  }
});
