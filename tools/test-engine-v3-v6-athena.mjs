// Efeitos V6 de Athena (playtest/engine-v3/v6/athena.js) e checagem de derrota no checkpoint.
// node --test tools/test-engine-v3-v6-athena.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
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
import {checkDefeats, atkOf, keywordsOf, hpOf} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('./fixtures/decks-preview.json').decks;

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


test('Diamond Dust: Hyoga põe 1 Seal no Devotee inimigo que sobrevive; uma vez por rodada', () => {
  const {s, ctx, give} = setup();
  const hyoga = give('A', 'athena-v6-005'), foe = give('B', 'artemis-v6-399');
  strike(s, ctx, hyoga, {kind: 'devotee', uid: foe});
  assert.equal(s.units[foe].seal, 1);
  assert.ok(s.roundUses.has(`${hyoga}:diamond-dust`));
});

test('Absolute Zero: Hyoga não recebe retaliação de Devotee já Sealed', () => {
  const {s, ctx, give} = setup();
  const hyoga = give('A', 'athena-v6-005'), foe = give('B', 'artemis-v6-399');
  s.units[foe].seal = 1;
  strike(s, ctx, hyoga, {kind: 'devotee', uid: foe});
  assert.equal(s.units[hyoga].damage, 0);
});

test('Absolute Zero: Camus causa 2 a mais em Devotee Sealed', () => {
  const {s, ctx, give} = setup();
  const camus = give('A', 'athena-v6-017'), foe = give('B', 'artemis-v6-399'), clean = give('B', 'artemis-v6-399');
  s.units[foe].seal = 1;
  const hp = hpOf(s, ctx, foe), atk = atkOf(s, ctx, camus);
  strike(s, ctx, camus, {kind: 'devotee', uid: foe});
  if (atk + 2 >= hp) assert.ok(s.players.B.tartarus.includes(foe)); else assert.equal(s.units[foe].damage, atk + 2);
  assert.equal(s.units[clean].damage, 0);
});

test('checkpoint: Devotee com dano ≥ HP fora de Strike é derrotado', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', 'artemis-v6-399');
  s.units[foe].damage = hpOf(s, ctx, foe);
  runCheckpoint(s);
  assert.ok(s.players.B.tartarus.includes(foe));
});
