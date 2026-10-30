// Efeitos V6 de Hades (playtest/engine-v3/v6/hades.js): um caso por gancho e por família (retorno, sacrifício, Soul, Domain).
// node --test tools/test-engine-v3-v6-hades.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll} from '../playtest/engine-v3/core.js';
import {playDevotee, playSpell, activate} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {checkDefeats, atkOf, hpOf, keywordsOf, damageDevotee} from '../playtest/engine-v3/effects.js';
import {toHand, toTartarus} from '../playtest/engine-v3/v6/kit.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

// A joga Hades (Domain Hades Castle, do deck); B, Artemis. Cartas fora do deck entram por `add`.
function hades() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-hades-108'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A, b = s.players.B;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  startTurn(s);
  p.bases = p.deck.splice(0, 12).map(uid => ({uid, prepared: true}));
  p.soul = b.soul = 10; // abaixo do máximo: ganhos de Soul aparecem
  let n = 0;
  const add = (id, key = 'A', zone = 'hand') => {
    const uid = `${key}:t${++n}:${id.slice(-3)}`;
    m.objects[uid] = {owner: key, cardId: id, armor: cards.get(id).armor};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    return uid;
  };
  const play = id => { const uid = add(id); playDevotee(s, ctx, 'A', uid, {}); return uid; };
  const cast = (id, choice) => { const uid = add(id); playSpell(s, ctx, 'A', uid, choice); return uid; };
  const kill = uid => { s.units[uid].damage = 99; checkDefeats(s, ctx); };
  // Respostas: por habilidade; função (player, q) => valor. Sem entrada: recusa/primeira opção.
  const answers = map => { ctx.decide = (player, q) => { const a = map[q.ability]; return typeof a === 'function' ? a(player, q) : a ?? (q.options ? q.options[0] : false); }; };
  answers({});
  return {s, ctx, p, b, add, play, cast, kill, answers};
}
const done = s => { while (s.window) passAll(s); };
// Aceita pagar a taxa de Soul do ETB (rebalanceamento de 30/10/2026) e escolhe a primeira opção de alvo.
const yes = (pl, q) => (q.options ? q.options[0] : true);

test('enter + drain (Harpy Valentine): paga 1 Soul; enemy God perde 2, o seu ganha 2', () => {
  const {s, p, b, play, answers} = hades();
  answers({'GREED THE LIFE': yes});
  play('hades-v6-201'); done(s);
  assert.equal(b.soul, 8);
  assert.equal(p.soul, 11, '10 − 1 (taxa) + 2');
});

test('Taxa de Soul recusada: o ETB não acontece (Deep Niobe)', () => {
  const {s, p, b, add, play} = hades();
  const foe = add('hades-v6-218', 'B', 'battlefield');
  play('hades-v6-204'); done(s);
  assert.ok(b.battlefield.includes(foe));
  assert.equal(p.soul, 10);
});

test('Rhadamanthys: enter derrota o alvo; Judge\'s Authority drena 1 uma vez por Round', () => {
  const {s, p, b, add, play, kill, answers} = hades();
  const x = add('hades-v6-218', 'B', 'battlefield'), y = add('hades-v6-206', 'B', 'battlefield');
  answers({'GREATEST CAUTION': (pl, q) => (q.options ? x : true)});
  play('hades-v6-181'); done(s);
  assert.ok(b.tartarus.includes(x));
  assert.equal(b.soul, 9); assert.equal(p.soul, 9, '10 − 2 (taxa) + 1 (Judge)');
  kill(y); done(s);
  assert.equal(b.soul, 9, 'once each round');
});

test('watchDefeat de Domain: Hades Castle drena 1 quando um Specter amigo é derrotado', () => {
  const {s, p, b, add, kill} = hades();
  assert.equal(s.domains.A, 'hades-v6-242');
  const spec = add('hades-v6-219', 'A', 'battlefield'); // Royal Guard também drena 2 ao morrer
  kill(spec); done(s);
  assert.equal(b.soul, 7); assert.equal(p.soul, 13);
});

test('Guardian impresso em texto (Royal Guard) vira keyword', () => {
  const {s, ctx, add} = hades();
  assert.ok(keywordsOf(s, ctx, add('hades-v6-219', 'A', 'battlefield')).includes('Guardian'));
});

test('retorno ao campo (Shion): volta Unprepared e Stardust Revolution drena 2', () => {
  const {s, p, b, add, play, answers} = hades();
  const dead = add('hades-v6-210', 'A', 'tartarus');
  answers({'RETURN FROM THE DEAD': () => dead});
  play('hades-v6-197'); done(s);
  assert.ok(p.battlefield.includes(dead));
  assert.equal(s.units[dead].prepared, false);
  assert.equal(b.soul, 8); assert.equal(p.soul, 12);
});

test('sacrifício (Golem Rock + Giganto): derrota inimigo com HP ≤ 3; Feast of Death ganha 1 Soul', () => {
  const {s, p, b, add, play, answers} = hades();
  add('hades-v6-208', 'A', 'battlefield');
  const fodder = add('hades-v6-218', 'A', 'battlefield'), foe = add('hades-v6-206', 'B', 'battlefield');
  answers({'ROLLING BOMBER STONE': (pl, q) => (q.options ? (q.options.includes(fodder) ? fodder : foe) : true)});
  play('hades-v6-210'); done(s);
  assert.ok(p.tartarus.includes(fodder));
  assert.ok(b.tartarus.includes(foe));
  assert.equal(p.soul, 11);
});

test('Spell: Souls of the Damned drena 3; The Oath devolve 2 Specters e perde 1 Soul por carta', () => {
  const {s, p, b, add, cast, answers} = hades();
  answers({'THE OATH OF THE 108 STARS': (pl, q) => (q.options ? q.options[0] : true)});
  cast('hades-v6-238'); done(s);
  assert.equal(b.soul, 7); assert.equal(p.soul, 13);
  const a = add('hades-v6-219', 'A', 'tartarus'), c = add('hades-v6-201', 'A', 'tartarus');
  cast('hades-v6-235'); done(s);
  assert.ok(p.hand.includes(a) && p.hand.includes(c));
  assert.equal(p.soul, 11);
});

test('Awakening of the Specters: volta Unprepared e não declara Strike no turno', () => {
  const {s, ctx, p, add, cast} = hades();
  const dead = add('hades-v6-219', 'A', 'tartarus');
  cast('hades-v6-232'); done(s);
  assert.ok(p.battlefield.includes(dead));
  assert.equal(s.strikes.get(dead), s.turn);
});

test('Seal (Minos): 2 marcadores no alvo inimigo', () => {
  const {s, add, play, answers} = hades();
  const foe = add('hades-v6-206', 'B', 'battlefield');
  answers({'COSMIC MARIONATION': yes});
  play('hades-v6-183'); done(s);
  assert.equal(s.units[foe].seal, 2);
});

test('descarte (Balron Lune): escolhe Moment/Technique da mão; Fire Whip drena 1', () => {
  const {s, p, b, add, play} = hades();
  const spell = add('hades-v6-238', 'B', 'hand'), dev = add('hades-v6-218', 'B', 'hand');
  play('hades-v6-202'); done(s);
  assert.ok(b.tartarus.includes(spell));
  assert.ok(b.hand.includes(dev));
  assert.equal(b.soul, 9); assert.equal(p.soul, 11);
});

test('ativada (Wandering Soul): sacrifica e ganha 1 Soul, uma vez por Round', () => {
  const {s, ctx, p, add} = hades();
  const soul = add('hades-v6-220', 'A', 'battlefield');
  activate(s, ctx, 'A', soul); done(s);
  assert.ok(p.tartarus.includes(soul));
  assert.equal(p.soul, 11);
});

test('Debuff até o fim do Round derrota quem fica com HP ≤ dano (Deep Niobe)', () => {
  const {s, b, add, play, answers} = hades();
  const foe = add('hades-v6-218', 'B', 'battlefield');
  answers({'DEEP FRAGRANCE': yes});
  play('hades-v6-204'); done(s);
  assert.ok(b.tartarus.includes(foe));
});

test('bearerDefeated (Funeral Shroud): pagar 2 Soul devolve o portador à mão', () => {
  const {s, ctx, p, add, kill, answers} = hades();
  const dev = add('hades-v6-219', 'A', 'battlefield'), shroud = add('hades-v6-230', 'A', 'battlefield');
  ctx.attached[shroud] = dev;
  answers({"DEATH'S EMBRACE": true});
  kill(dev); done(s);
  assert.ok(p.hand.includes(dev));
});

test('gearGodDamage (Hades\' Sword): o God atingido perde 3 a mais', () => {
  const {s, ctx, b, add} = hades();
  const dev = add('hades-v6-218', 'A', 'battlefield'), sword = add('hades-v6-199', 'A', 'battlefield');
  ctx.attached[sword] = dev;
  const hit = atkOf(s, ctx, dev);
  declareStrike(s, ctx, dev, {kind: 'god', player: 'B'}); done(s);
  assert.equal(b.soul, 10 - hit - 3);
});

test('Gemini Saga: exila até Saga sair; derrota de Saga devolve o exilado ao dono', () => {
  const {s, p, b, add, play, kill, answers} = hades();
  const foe = add('hades-v6-206', 'B', 'battlefield');
  answers({'ANOTHER DIMENSION': yes});
  const saga = play('hades-v6-255'); done(s);
  assert.ok(b.void.includes(foe));
  kill(saga); done(s);
  assert.ok(b.battlefield.includes(foe));
});

test('Will of Hades: modo escolhido; perde 1 Soul', () => {
  const {s, ctx, p, b, add, cast, answers} = hades();
  const foe = add('hades-v6-219', 'B', 'battlefield');
  answers({'THE WILL OF HADES': (pl, q) => (q.choose === 'mode' ? 'weaken' : foe)});
  add('hades-v6-218', 'A', 'tartarus');
  cast('hades-v6-241'); done(s);
  assert.equal(hpOf(s, ctx, foe), 1, 'Royal Guard HP 4 (30/10/2026) − 3');
  assert.equal(p.soul, 9);
});

// ---- Completados com os ganchos novos (29/10/2026) ----
test('Gemini Saga: devolvida à mão (sai do campo por outra via), também devolve o exilado', () => {
  const {s, ctx, b, add, play, answers} = hades();
  const foe = add('hades-v6-206', 'B', 'battlefield');
  answers({'ANOTHER DIMENSION': yes});
  const saga = play('hades-v6-255'); done(s);
  assert.ok(b.void.includes(foe));
  toHand(s, ctx, saga, 'battlefield'); done(s);
  assert.ok(b.battlefield.includes(foe));
});

test('200 Pandora\'s Box — The Last Hope: ao sair do campo, God ganha 3 Soul e compra 1', () => {
  const {s, ctx, p, add} = hades();
  const box = add('hades-v6-200', 'A', 'battlefield');
  const hand = p.hand.length, soul = p.soul;
  toHand(s, ctx, box, 'battlefield'); done(s);
  assert.equal(p.soul, soul + 3);
  assert.equal(p.hand.length, hand + 1 + 1); // a própria Box volta à mão e compra 1
});

test('224 Cracked Surplice — Broken Offering: Armor quebrada por dano (portador vivo) paga 1 Soul e devolve um Devotee de custo 1', () => {
  const {s, ctx, p, add, answers} = hades();
  const dev = add('hades-v6-218', 'A', 'battlefield'), surplice = add('hades-v6-224', 'A', 'battlefield');
  ctx.attached[surplice] = dev;
  s.units[surplice] = {damage: 0};
  s.effects.push({kind: 'mod', target: dev, atk: 0, hp: 20, keywords: [], duration: 'this_round'});
  const cheap = add('hades-v6-220', 'A', 'tartarus'), soul = p.soul;
  assert.ok(cards.get('hades-v6-220').cost.amount <= 1, 'carta de teste com custo 1');
  answers({'BROKEN OFFERING': (pl, q) => (q.options ? q.options[0] : true)});
  damageDevotee(s, ctx, dev, 10, false); done(s);
  assert.ok(p.tartarus.includes(surplice) && p.battlefield.includes(dev));
  assert.ok(p.hand.includes(cheap));
  assert.equal(p.soul, soul - 1);
});

test('231 Torch of the Underworld — Guiding Light: ao ir para o Tartarus, 2 cartas do deck vão junto', () => {
  const {s, ctx, p, add} = hades();
  const torch = add('hades-v6-231', 'A', 'battlefield'), deck = p.deck.length;
  toTartarus(s, ctx, torch, 'battlefield'); done(s);
  assert.equal(p.deck.length, deck - 2);
});
