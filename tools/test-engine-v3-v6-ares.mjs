// Efeitos V6 de Ares (playtest/engine-v3/v6/ares.js): um caso por gancho e por família.
// node --test tools/test-engine-v3-v6-ares.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll} from '../playtest/engine-v3/core.js';
import {playDevotee, playSpell, activate} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {checkDefeats, atkOf, keywordsOf} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

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
    m.objects[uid] = {owner: key, cardId: `ares-v6-${id}`, armor: false};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    if (bearer) ctx.attached[uid] = bearer;
    return uid;
  };
  return {s, ctx, give};
}
const strike = (s, ctx, attacker, target) => { declareStrike(s, ctx, attacker, target); passAll(s); };
const god = {kind: 'god', player: 'B'};

test('enter: Alcmenes causa 3 a um Devotee inimigo', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', '304'), alc = give('A', '271', 'hand');
  playDevotee(s, ctx, 'A', alc, {}); passAll(s);
  assert.ok(s.players.B.tartarus.includes(foe));
});

test('declare + watchDeclare: Burning Assault tira 1 do God; Coordinated Assault dá +1 ao outro Berserker', () => {
  const {s, ctx, give} = setup();
  const a = give('A', '291'), b = give('A', '292');
  const soul = s.players.B.soul, atk = atkOf(s, ctx, a), before = atkOf(s, ctx, b);
  strike(s, ctx, a, god);
  assert.equal(s.players.B.soul, soul - 1 - atk);
  assert.equal(atkOf(s, ctx, b), before + 1);
});

test('Berserker morto: Glorious Demise, Cruel Entertainment (God) e Lethal Opportunist (+2)', () => {
  const {s, ctx, give} = setup();
  const dead = give('A', '293'); give('A', '275'); const iseu = give('A', '279');
  const soul = s.players.B.soul, atk = atkOf(s, ctx, iseu);
  s.units[dead].damage = 99; checkDefeats(s, ctx); passAll(s);
  assert.equal(s.players.B.soul, soul - 2);
  assert.equal(atkOf(s, ctx, iseu), atk + 2);
});

test('Warplate: Razor Winds no Strike; Resonance e Enyo dão Pierce só ao portador certo', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', '302'), iseu = give('A', '279'), alc = give('A', '271'), gal = give('A', '310');
  give('A', '276', 'battlefield', iseu);
  give('A', '272', 'battlefield', alc);
  give('A', '272', 'battlefield', gal);
  strike(s, ctx, iseu, {kind: 'devotee', uid: foe});
  assert.ok(s.events.some(e => e.type === 'damage' && e.uid === foe && !e.strike && e.dealt === 1));
  assert.ok(keywordsOf(s, ctx, alc).includes('Pierce'));
  assert.ok(!keywordsOf(s, ctx, gal).includes('Pierce'));
  give('A', '289', 'battlefield', gal);
  assert.ok(keywordsOf(s, ctx, gal).includes('Pierce'));
});

test('activate: Suicide Orders derrota outro Berserker e dá +3/Pierce a Lior; uma vez por turno', () => {
  const {s, ctx, give} = setup();
  const lior = give('A', '275'), dead = give('A', '293'); give('A', '291');
  const soul = s.players.B.soul, atk = atkOf(s, ctx, lior);
  activate(s, ctx, 'A', lior); passAll(s);
  assert.ok(s.players.A.tartarus.includes(dead));
  assert.equal(atkOf(s, ctx, lior), atk + 3);
  assert.ok(keywordsOf(s, ctx, lior).includes('Pierce'));
  assert.equal(s.players.B.soul, soul - 2); // Glorious Demise + Cruel Entertainment
  assert.throws(() => activate(s, ctx, 'A', lior));
});

test('Moment em área: Azure Plague derrota um e tira 1 do God por derrotado', () => {
  const {s, ctx, give} = setup();
  const small = give('B', '304'), big = give('B', '302'), spell = give('A', '351', 'hand');
  const soul = s.players.B.soul;
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  assert.ok(s.players.B.tartarus.includes(small));
  assert.equal(s.units[big].damage, 2);
  assert.equal(s.players.B.soul, soul - 1);
});

test('Moment em área: Eternal Bloodshed derrota todos, 1 por Berserker ao God, compra 3 e descarta 2', () => {
  const {s, ctx, give} = setup();
  give('B', '304'); give('A', '291');
  const spell = give('A', '360', 'hand'), soul = s.players.B.soul, hand = s.players.A.hand.length - 1;
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  assert.equal(s.players.B.battlefield.length + s.players.A.battlefield.filter(u => ctx.cards.get(ctx.objects[u].cardId).kind === 'Devotee').length, 0);
  assert.equal(s.players.B.soul, soul - 2);
  assert.equal(s.players.A.hand.length, hand + 1);
});

test('fim do turno: Reckless Bloodlust e Uncontrolled Power derrotam no fim do turno', () => {
  const {s, ctx, give} = setup();
  const reckless = give('A', '295'), other = give('A', '292'), spell = give('A', '324', 'hand');
  ctx.decide = (player, q) => (q.options ? (q.options.includes(other) ? other : q.options[0]) : player === 'A');
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  strike(s, ctx, reckless, god);
  endTurn(s); passAll(s);
  assert.ok(s.players.A.tartarus.includes(reckless));
  assert.ok(s.players.A.tartarus.includes(other));
});

test('mods: Royal Guard ganha +1 por outro Berserker que declarou Strike no turno', () => {
  const {s, ctx, give} = setup();
  const guard = give('A', '309'), a = give('A', '291'), b = give('A', '304');
  const base = atkOf(s, ctx, guard);
  strike(s, ctx, a, god); strike(s, ctx, b, god);
  assert.equal(atkOf(s, ctx, guard), base + 2);
});

test('godDamage: Psychological Warfare faz o dono do God descartar', () => {
  const {s, ctx, give} = setup();
  const card = give('B', '291', 'hand'), fear = give('A', '294');
  strike(s, ctx, fear, god);
  assert.ok(s.players.B.tartarus.includes(card));
});

test('Basil: inimigo que levou dano dele no turno e morre tira 1 do God', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', '304'), basil = give('A', '287', 'hand'); // Venomous Arrival: 1 de dano
  playDevotee(s, ctx, 'A', basil, {}); passAll(s);
  const soul = s.players.B.soul;
  s.units[foe].damage = 99; checkDefeats(s, ctx); passAll(s);
  assert.equal(s.players.B.soul, soul - 1);
});
