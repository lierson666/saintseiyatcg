// Efeitos V6 de Poseidon (playtest/engine-v3/v6/poseidon.js) em partida: um caso por gancho e por família de carta.
// node --test tools/test-engine-v3-v6-poseidon.mjs  (precisa de card-forge/art-web/cards.json)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll, addSeal, RuleError} from '../playtest/engine-v3/core.js';
import {playDevotee, playSpell, activate} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, hpOf} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;
const P = n => `poseidon-v6-${n}`;

// A: Poseidon (Tide of the Seven Seas, Domain 142); B: Hades. `answers[ability]`: resposta fixa ou função da pergunta;
// sem resposta, escolhe a primeira opção ou diz sim.
function poseidon(answers = {}) {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-poseidon-tide'), B: deck('preview-hades-108')}, gods: {A: 'god-poseidon', B: 'god-athena'}, first: 'A', seed: 1});
  const s = m.state, asked = [];
  const decide = (player, q) => {
    asked.push({player, ...q});
    const a = answers[q.ability];
    if (a !== undefined) return typeof a === 'function' ? a(q) : a;
    return q.options ? q.options[0] : true;
  };
  const ctx = {cards, objects: m.objects, attached: m.attached, decide}, A = s.players.A, B = s.players.B;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  startTurn(s);
  A.bases = A.deck.splice(-12).map(uid => ({uid, prepared: true}));
  let n = 0;
  // Carta (do deck ou nova) na zona pedida; no campo entra Prepared, sem dano.
  const put = (key, cardId, zone = 'hand') => {
    const p = s.players[key];
    let uid = p.deck.find(u => m.objects[u].cardId === cardId);
    if (uid) p.deck.splice(p.deck.indexOf(uid), 1);
    else { uid = `${key}:x${n++}:${cardId}`; m.objects[uid] = {owner: key, cardId, armor: cards.get(cardId).armor}; }
    p[zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    return uid;
  };
  return {s, ctx, A, B, put, asked};
}
const ready = p => p.bases.filter(b => b.prepared).length;

test('enter + bounce: Sea Dragon Kanon devolve o Devotee inimigo à mão do Owner', () => {
  const {s, ctx, B, put} = poseidon({'SEA DRAGON KANON': q => q.options.find(u => u.startsWith('B'))});
  const foe = put('B', 'hades-v6-211', 'battlefield'), kanon = put('A', P('091'));
  playDevotee(s, ctx, 'A', kanon, {}); passAll(s);
  assert.ok(B.hand.includes(foe));
  assert.equal(s.units[foe], undefined);
});

test('spell + watchSealed: Abyssal Weight põe 1 Seal, ou 2 se já tinha; Whispers Below observa 1×/Round', () => {
  const {s, ctx, A, put, asked} = poseidon();
  put('A', P('102'), 'battlefield');
  const foe = put('B', 'hades-v6-211', 'battlefield'), spell = put('A', P('137')), top = A.deck[0];
  playSpell(s, ctx, 'A', spell, {}); passAll(s);
  assert.equal(s.units[foe].seal, 1);
  assert.equal(asked.filter(q => q.ability === 'WHISPERS BELOW').length, 1);
  assert.equal(A.deck.at(-1), top, 'Whispers Below mandou o topo para o fundo');
  playSpell(s, ctx, 'A', put('A', P('137')), {}); passAll(s);
  assert.equal(s.units[foe].seal, 3, 'já Sealed: +2');
});

test('watchDeclare (prevenção): Royal Trident Guard previne 1 do dano de Strike, uma vez por Round', () => {
  const {s, ctx, put} = poseidon();
  const guard = put('A', P('104'), 'battlefield'), foe = put('B', 'hades-v6-211', 'battlefield'); // Troll Iwan: ATK 4
  declareStrike(s, ctx, guard, {kind: 'devotee', uid: foe}); passAll(s);
  assert.equal(s.units[guard].damage, 3);
});

test('declare: Marina Spearman ganha +1 ATK contra inimigo Sealed, só durante o Strike', () => {
  const {s, ctx, put} = poseidon();
  const spear = put('A', P('107'), 'battlefield'), foe = put('B', 'hades-v6-212', 'battlefield'); // Beetle: 4/5
  addSeal(s, ctx, [foe], 1, 'teste'); passAll(s);
  declareStrike(s, ctx, spear, {kind: 'devotee', uid: foe}); passAll(s);
  assert.equal(s.units[foe].damage, 3);
  assert.equal(atkOf(s, ctx, spear), 2, 'o bônus some depois do Strike');
});

test('godDamage: Siren Sorrento faz o God inimigo descartar', () => {
  const {s, ctx, B, put} = poseidon();
  const siren = put('A', P('093'), 'battlefield');
  B.hand.push(...B.deck.splice(0, 2));
  declareStrike(s, ctx, siren, {kind: 'god', player: 'B'}); passAll(s);
  assert.equal(B.hand.length, 1);
  assert.equal(B.tartarus.length, 1);
});

test('activate em Equipment: Kraken Scale sela um inimigo, uma vez por Round, pagando {2}', () => {
  const {s, ctx, A, put} = poseidon();
  const isaac = put('A', P('097'), 'battlefield'), scale = put('A', P('098'), 'battlefield');
  ctx.attached[scale] = isaac;
  const foe = put('B', 'hades-v6-211', 'battlefield'), before = ready(A);
  activate(s, ctx, 'A', scale, {}); passAll(s);
  assert.equal(s.units[foe].seal, 1);
  assert.equal(before - ready(A), 2);
  assert.throws(() => activate(s, ctx, 'A', scale, {}), RuleError);
});

test('mods e aura: Herald dá +0/+1 aos Marina; Ocean Temple Guard +0/+1 com Domain', () => {
  const {s, ctx, put} = poseidon();
  const temple = put('A', P('106'), 'battlefield'), base = hpOf(s, ctx, temple);
  assert.equal(base, 4, '3 impresso + 1 do Domain');
  put('A', P('103'), 'battlefield');
  assert.equal(hpOf(s, ctx, temple), 5);
  s.domains.A = null;
  assert.equal(hpOf(s, ctx, temple), 4);
});

test('enter + watchMill: Drowned Prophet faz o oponente moer 2 e Prophecy of the Abyss compra pagando {1}', () => {
  const {s, ctx, A, B, put} = poseidon();
  const prophet = put('A', P('120')), deckB = B.deck.length;
  playDevotee(s, ctx, 'A', prophet, {}); passAll(s);
  assert.equal(B.deck.length, deckB - 2);
  assert.ok(A.hand.length >= 1, 'comprou 1');
});

test('modo: Marina\'s Oath em Loyalty dá +0/+2 até o fim do Round', () => {
  const {s, ctx, put} = poseidon({'LOYALTY OR DISCIPLINE': 'Loyalty'});
  const spear = put('A', P('107'), 'battlefield');
  playSpell(s, ctx, 'A', put('A', P('140')), {}); passAll(s);
  assert.equal(hpOf(s, ctx, spear), 4);
});

test('dano dividido: Wrath of the Seven Seas reparte 5 entre os alvos escolhidos', () => {
  let i = 0;
  const {s, ctx, put} = poseidon({'OCEANIC FURY': q => (q.choose === 'target' && q.text?.startsWith('Assign') ? q.options[i++ % 2] : q.options ? q.options[0] : true)});
  const a = put('B', 'hades-v6-219', 'battlefield'), b = put('B', 'hades-v6-212', 'battlefield');
  playSpell(s, ctx, 'A', put('A', P('174')), {}); passAll(s);
  assert.equal(s.units[a].damage + s.units[b].damage, 5);
  assert.ok(s.units[a].damage > 0 && s.units[b].damage > 0);
});
