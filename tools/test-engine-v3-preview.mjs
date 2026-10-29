// Cartas novas em partida (autor, 29/10/2026): Impulse entra Prepared; Fields of Carnage (335) pune o God inimigo.
// node --test tools/test-engine-v3-preview.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll} from '../playtest/engine-v3/core.js';
import {playDevotee} from '../playtest/engine-v3/play.js';
import {strikeTargets} from '../playtest/engine-v3/strike.js';
import {checkDefeats} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  startTurn(s);
  p.bases = p.deck.splice(0, 8).map(uid => ({uid, prepared: true}));
  const play = n => { const uid = p.deck.find(u => u.includes(`:${n}:`)); p.deck.splice(p.deck.indexOf(uid), 1); p.hand.push(uid); playDevotee(s, ctx, 'A', uid, {}); return uid; };
  return {s, ctx, play};
}

test('Devotee com Impulse entra Prepared e ataca no turno; sem Impulse, não', () => {
  const {s, ctx, play} = setup();
  const raider = play('299'), plain = play('279'); // Red Fire Legion Raider (Impulse); Disaster Legion sem Impulse
  assert.equal(s.units[raider].prepared, true);
  assert.ok(strikeTargets(s, ctx, raider).length);
  assert.equal(s.units[plain].prepared, false);
  assert.equal(strikeTargets(s, ctx, plain).length, 0);
});

test('Fields of Carnage: Berserker amigo derrotado tira 1 do God inimigo, uma vez por turno', () => {
  const {s, ctx, play} = setup();
  s.domains.A = 'ares-v6-335';
  const a = play('299'), b = play('279'), soul = s.players.B.soul;
  s.units[a].damage = 99; checkDefeats(s, ctx); passAll(s);
  assert.equal(s.players.B.soul, soul - 1);
  s.units[b].damage = 99; checkDefeats(s, ctx); if (s.chain.length) passAll(s);
  assert.equal(s.players.B.soul, soul - 1);
});
