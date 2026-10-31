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
import {playDevotee, playEquipment, reequip} from '../playtest/engine-v3/play.js';
import {strikeTargets, checkStrike} from '../playtest/engine-v3/strike.js';
import {checkDefeats} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  m.state.gods.A = 'god-ares'; // Domain da mesma facção do God (guia §63)
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  startTurn(s);
  p.bases = p.deck.splice(0, 8).map(uid => ({uid, prepared: true}));
  const play = n => { const uid = p.deck.find(u => u.includes(`:${n}:`)); p.deck.splice(p.deck.indexOf(uid), 1); p.hand.push(uid); playDevotee(s, ctx, 'A', uid, {}); passAll(s); return uid; }; // guia §56: resolve a pilha
  return {s, ctx, play};
}

test('Devotee com Impulse entra Prepared e ataca no turno; sem Impulse, não', () => {
  const {s, ctx, play} = setup();
  const raider = play('299'), plain = play('279'); // Red Fire Legion Raider (Impulse); Disaster Legion sem Impulse
  assert.equal(s.units[raider].prepared, true);
  checkStrike(s, ctx, raider, {kind: 'god', player: 'B'}); // §47 (30/10/2026): na entrada, pode mirar o God
  assert.equal(s.units[plain].prepared, false);
  assert.equal(strikeTargets(s, ctx, plain).length, 0);
});

test('Fields of Carnage: Berserker amigo derrotado; pagando 1 Soul tira 1 do God inimigo, uma vez por turno', () => {
  const {s, ctx, play} = setup();
  ctx.decide = (player, q) => q.ability === 'HARVEST OF THE FALLEN'; // rebalanceamento 30/10/2026: custa 1 Soul
  s.domains.A = 'ares-v6-335';
  const a = play('299'), b = play('279'), soul = s.players.B.soul, own = s.players.A.soul;
  s.units[a].damage = 99; checkDefeats(s, ctx); passAll(s);
  assert.equal(s.players.B.soul, soul - 1);
  assert.equal(s.players.A.soul, own - 1);
  s.units[b].damage = 99; checkDefeats(s, ctx); if (s.chain.length) passAll(s);
  assert.equal(s.players.B.soul, soul - 1);
});

// Hades V6 (texto do autor, 28/10/2026): Armor entra sem portador (guia §XII); "When … is defeated, you may pay 1 Soul".
function hades() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-hades-108'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  m.state.gods.A = 'god-hades'; // Domain da mesma facção do God (guia §63)
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  startTurn(s);
  p.bases = p.deck.splice(0, 8).map(uid => ({uid, prepared: true}));
  const take = id => { const uid = p.deck.find(u => m.objects[u].cardId === id); p.deck.splice(p.deck.indexOf(uid), 1); p.hand.push(uid); return uid; };
  return {s, ctx, p, take};
}

test('Skeleton Armor entra sem portador pagando só 2; depois equipa pagando Equip', () => {
  const {s, ctx, p, take} = hades();
  const armor = take('hades-v6-225');
  const ready = () => p.bases.filter(b => b.prepared).length, before = ready();
  playEquipment(s, ctx, 'A', armor, null); passAll(s);
  assert.equal(before - ready(), 2);
  assert.ok(p.battlefield.includes(armor));
  assert.equal(ctx.attached[armor], undefined);
  const dev = take('hades-v6-218'); playDevotee(s, ctx, 'A', dev, {}); passAll(s);
  reequip(s, ctx, 'A', armor, dev);
  assert.equal(ctx.attached[armor], dev);
});

test('Rise Again e Bone Reclamation: pagar 1 Soul devolve o Devotee à mão; a Armor fica solta no campo', () => {
  const {s, ctx, p, take} = hades();
  const dev = take('hades-v6-218'), armor = take('hades-v6-225');
  playDevotee(s, ctx, 'A', dev, {}); passAll(s); playEquipment(s, ctx, 'A', armor, null); passAll(s); reequip(s, ctx, 'A', armor, dev);
  const soul = p.soul;
  ctx.decide = (player, q) => q.ability === 'RISE AGAIN';
  s.units[dev].damage = 99; checkDefeats(s, ctx); passAll(s);
  assert.ok(p.hand.includes(dev));
  assert.ok(p.battlefield.includes(armor) && !ctx.attached[armor], 'Armor fica no campo, sem portador (guia §32)');
  assert.equal(p.soul, soul - 1);
});
