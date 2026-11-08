// Efeitos V6 de Hades (playtest/engine-v3/v6/hades.js): um caso por gancho e por família (retorno, sacrifício, Soul, Domain).
// node --test tools/test-engine-v3-v6-hades.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll, prepareUnit, runCheckpoint, draw} from '../playtest/engine-v3/core.js';
import {playDevotee, playSpell, activate} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {checkDefeats, atkOf, hpOf, keywordsOf, damageDevotee} from '../playtest/engine-v3/effects.js';
import {toHand, toTartarus} from '../playtest/engine-v3/v6/kit.js';
import {bindContext} from '../playtest/engine-v3/v6/hooks.js';
import {guardDecide} from './engine-test-upto.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('./fixtures/decks-preview.json').decks;

// A joga Hades (Domain Hades Castle, do deck); B, Artemis. Cartas fora do deck entram por `add`.
function hades() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-hades-108'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  m.state.gods.A = 'god-hades'; // Domain da mesma facção do God (guia §63)
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached}), p = s.players.A, b = s.players.B;
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

test('Harpy Valentine (Gray Merchant, 08/11/2026): drena X = Specters seus, até 4', () => {
  const {s, p, b, add, play} = hades();
  add('hades-v6-219', 'A', 'battlefield'); // outro Specter
  play('hades-v6-201'); done(s);
  assert.deepEqual([b.soul, p.soul], [8, 12], 'X = 2 (Royal Guard + Valentine)');
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
  assert.equal(b.soul, 9); assert.equal(p.soul, 8, '10 − 3 (taxa) + 1 (Judge)');
  kill(y); done(s);
  assert.equal(b.soul, 9, 'once each round');
});

test('watchDefeat de Domain: Hades Castle tira 1 Soul do inimigo quando um Specter amigo é derrotado (sem ganho, 30/10/2026)', () => {
  const {s, p, b, add, kill} = hades();
  assert.equal(s.domains.A, 'hades-v6-242');
  const spec = add('hades-v6-219', 'A', 'battlefield'); // Royal Guard também drena 2 ao morrer
  kill(spec); done(s);
  assert.equal(b.soul, 7); assert.equal(p.soul, 12, 'só o dreno da Royal Guard dá Soul a Hades');
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

test('edito (Golem Rock, 08/11/2026) + Giganto: o oponente escolhe qual sacrifica; Feast of Death ganha 1 Soul', () => {
  const {s, p, b, add, play, answers} = hades();
  add('hades-v6-208', 'A', 'battlefield');
  const fodder = add('hades-v6-218', 'A', 'battlefield'), big = add('hades-v6-191', 'B', 'battlefield'), small = add('hades-v6-206', 'B', 'battlefield');
  answers({'ROLLING BOMBER STONE': (pl, q) => (!q.options ? true : pl === 'A' ? fodder : small)});
  play('hades-v6-210'); done(s);
  assert.ok(p.tartarus.includes(fodder));
  assert.ok(b.tartarus.includes(small) && b.battlefield.includes(big), 'B escolheu o pequeno');
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

test('Minos (Massacre Wurm, 08/11/2026): paga 2, cada Devotee inimigo -1/-1; os seus não', () => {
  const {s, ctx, p, b, add, play, answers} = hades();
  const foe = add('hades-v6-191', 'B', 'battlefield'), weak = add('hades-v6-218', 'B', 'battlefield'), mine = add('hades-v6-219', 'A', 'battlefield');
  const [atk, life, myLife] = [atkOf(s, ctx, foe), hpOf(s, ctx, foe), hpOf(s, ctx, mine)];
  answers({'COSMIC MARIONATION': yes});
  play('hades-v6-183'); done(s);
  assert.deepEqual([atkOf(s, ctx, foe), hpOf(s, ctx, foe), hpOf(s, ctx, mine)], [atk - 1, life - 1, myLife]);
  assert.ok(b.tartarus.includes(weak), '1/1 morre');
  assert.equal(b.soul, 9, 'Puppet Master: morreu no seu turno');
  assert.equal(p.soul, 8);
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
  assert.equal(s.units[foe].prepared, false, 'volta Unprepared (autor, 30/10/2026)');
  assert.equal(s.units[foe].damage, 0);
});

test('Will of Hades: modo escolhido; perde 1 Soul', () => {
  const {s, ctx, p, b, add, cast, answers} = hades();
  const foe = add('hades-v6-183', 'B', 'battlefield'); // Griffon Minos: HP 6
  answers({'THE WILL OF HADES': (pl, q) => (q.choose === 'mode' ? 'weaken' : foe)});
  add('hades-v6-218', 'A', 'tartarus');
  cast('hades-v6-241'); done(s);
  assert.equal(hpOf(s, ctx, foe), 3, 'Griffon Minos HP 6 − 3');
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

// pendente: revisão de carta (Armor sem dano próprio, 30/10/2026) — Broken Offering depende de Armor quebrada por dano.
test('224 Cracked Surplice — Broken Offering: portador derrotado, paga 1 Soul e devolve um Devotee de custo 1', () => {
  const {s, ctx, p, add, kill, answers} = hades();
  const dev = add('hades-v6-218', 'A', 'battlefield'), surplice = add('hades-v6-224', 'A', 'battlefield');
  ctx.attached[surplice] = dev;
  const cheap = add('hades-v6-220', 'A', 'tartarus'), soul = p.soul;
  assert.ok(cards.get('hades-v6-220').cost.amount <= 1, 'carta de teste com custo 1');
  answers({'BROKEN OFFERING': (pl, q) => (q.options ? q.options[0] : true)});
  kill(dev); done(s);
  assert.ok(p.tartarus.includes(dev) && p.battlefield.includes(surplice), 'a Armor fica em campo sem portador (§32)');
  assert.ok(p.hand.includes(cheap));
  assert.equal(p.soul, soul - 1);
});

test('231 Torch of the Underworld — Guiding Light: ao ir para o Tartarus, 2 cartas do deck vão junto', () => {
  const {s, ctx, p, add} = hades();
  const torch = add('hades-v6-231', 'A', 'battlefield'), deck = p.deck.length;
  toTartarus(s, ctx, torch, 'battlefield'); done(s);
  assert.equal(p.deck.length, deck - 2);
});

test('Puppet Master (183) e Aurora Execution (254, Midnight Reaper 08/11/2026): perde 1 e compra 1, uma vez por Round', () => {
  const {s, p, b, add, kill, answers} = hades();
  answers({'AURORA EXECUTION': true});
  add('hades-v6-183', 'A', 'battlefield'); add('hades-v6-254', 'A', 'battlefield');
  const foe = add('hades-v6-218', 'B', 'battlefield'), other = add('hades-v6-218', 'B', 'battlefield'), hand = p.hand.length;
  kill(foe); done(s);
  assert.deepEqual([b.soul, p.soul, p.hand.length], [9, 9, hand + 1]);
  kill(other); done(s);
  assert.deepEqual([b.soul, p.soul, p.hand.length], [8, 9, hand + 1], 'Aurora só uma vez por Round');
});

test('Eternal Slumber (191): paga 2 Soul e derrota o Devotee que perdeu o último Seal', () => {
  const {s, ctx, p, b, add, answers} = hades();
  bindContext(s, ctx); // observadores do checkpoint perguntam pelo ctx da partida
  answers({'ETERNAL SLUMBER': true});
  add('hades-v6-191', 'A', 'battlefield');
  const foe = add('hades-v6-218', 'B', 'battlefield');
  Object.assign(s.units[foe], {prepared: false, seal: 1});
  prepareUnit(s, foe); runCheckpoint(s); done(s);
  assert.ok(b.tartarus.includes(foe));
  assert.equal(p.soul, 8);
});

test('Sphinx Pharaoh (Phyrexian Arena, 08/11/2026): no início do seu turno perde 1 Soul e compra 1', () => {
  const {s, ctx, p, add, answers} = hades();
  bindContext(s, ctx);
  answers({'BALANCE OF CURSE': true});
  add('hades-v6-187', 'A', 'battlefield');
  const hand = p.hand.length, soul = p.soul;
  s.active = 'B'; startTurn(s); done(s);
  assert.deepEqual([p.soul, p.hand.length], [soul, hand], 'turno do oponente: nada');
  s.active = 'A'; startTurn(s); done(s);
  assert.equal(p.soul, soul - 1);
  assert.ok(p.hand.length >= hand + 1);
});

test('265 The Possession of Shun (31/10/2026): reanima do Tartarus do oponente, sob o seu controle, Unprepared; Hades perde 3', () => {
  const {s, ctx, p, b, add, cast} = hades();
  const foe = add('hades-v6-218', 'B', 'tartarus');
  const soul = p.soul;
  cast('hades-v6-265', {}); done(s);
  assert.ok(p.battlefield.includes(foe) && !b.tartarus.includes(foe));
  assert.equal(s.units[foe].prepared, false);
  assert.equal(p.soul, soul - 3);
  assert.equal(ctx.objects[foe].owner, 'B', 'o dono não muda');
});

test('240 The Return from Death (Animate Dead, 31/10/2026): qualquer custo, Unprepared, sem Strike neste Round; Hades perde 3', () => {
  const {s, p, add, cast} = hades();
  const big = add('hades-v6-193', 'A', 'tartarus'); // Thanatos, c7
  const soul = p.soul;
  cast('hades-v6-240', {}); done(s);
  assert.ok(p.battlefield.includes(big));
  assert.equal(s.units[big].prepared, false);
  assert.equal(s.strikes.get(big), s.turn, 'não declara Strike neste Round');
  assert.equal(p.soul, soul - 3);
});

test('Gorgon Ox (216, 31/10/2026): Petrifying Gaze impede o Strike do alvo no próximo turno dele, sem Seal', () => {
  const {s, add, play, answers} = hades();
  const foe = add('hades-v6-191', 'B', 'battlefield');
  answers({'PETRIFYING GAZE': yes});
  play('hades-v6-216'); done(s);
  assert.equal(s.units[foe].seal ?? 0, 0);
  assert.ok(s.effects.some(e => e.kind === 'noStrike' && e.target === foe));
});

test('Guia §63 (lendário): segundo Acheron Charon obriga a escolher um; Specter genérico repete', () => {
  const {s, ctx, p, add} = hades();
  const first = add('hades-v6-189', 'A', 'battlefield'), second = add('hades-v6-189', 'A', 'battlefield');
  const g1 = add('hades-v6-219', 'A', 'battlefield'), g2 = add('hades-v6-219', 'A', 'battlefield'); // HADES' ROYAL GUARD, genérico
  const asked = [];
  ctx.decide = (player, q) => { if (q.decision === '§63') asked.push(q.options); return q.options ? q.options.at(-1) : false; };
  checkDefeats(s, ctx);
  assert.deepEqual(asked, [[first, second]]);
  assert.ok(p.battlefield.includes(second) && !p.battlefield.includes(first));
  assert.ok(p.tartarus.includes(first));
  assert.ok(p.battlefield.includes(g1) && p.battlefield.includes(g2));
});

test('Whispers of Pandora: a mão inteira vem em `shown`; só não-Devotee é escolhível (autor, 08/11/2026)', () => {
  const {s, b, add, cast, answers} = hades();
  const dev = add('hades-v6-218', 'B'), spell = add('hades-v6-257', 'B');
  let seen;
  answers({'THE WHISPERS OF PANDORA': (pl, q) => { seen = q; return q.options[0]; }});
  cast('hades-v6-239'); done(s);
  assert.deepEqual(seen.shown, [dev, spell]);
  assert.deepEqual(seen.options, [spell]);
  assert.ok(b.tartarus.includes(spell) && b.hand.includes(dev));
});

test('Deep Niobe (Toxic Deluge, 08/11/2026): paga X, cada outro Devotee recebe -X/-X, os seus também', () => {
  const {s, ctx, p, b, add, play, answers} = hades();
  const foe = add('hades-v6-191', 'B', 'battlefield'), mine = add('hades-v6-218', 'A', 'battlefield'), life = hpOf(s, ctx, foe);
  answers({'DEEP FRAGRANCE': (pl, q) => (q.options ? '2' : true)});
  play('hades-v6-204'); done(s);
  assert.equal(hpOf(s, ctx, foe), life - 2);
  assert.ok(p.tartarus.includes(mine), 'o seu 1/1 também morre');
  assert.equal(p.soul, 8);
});

test('Basilisk Sylphid (toque mortal, 08/11/2026): dano de Strike derrota o Devotee inimigo', () => {
  const {s, ctx, b, add} = hades();
  const basil = add('hades-v6-205', 'A', 'battlefield'), foe = add('hades-v6-191', 'B', 'battlefield');
  declareStrike(s, ctx, basil, {kind: 'devotee', uid: foe}); done(s);
  assert.ok(b.tartarus.includes(foe));
});

test('Lycaon Phlegyas (Bog + Dauthi, 08/11/2026): 3 cartas do Tartarus inimigo ao Void; derrotado vai ao Void e ainda conta', () => {
  const {s, b, add, play, kill, answers} = hades();
  add('hades-v6-252', 'A', 'battlefield'); // não interfere
  const dead = [1, 2, 3, 4].map(() => add('hades-v6-218', 'B', 'tartarus'));
  answers({'HOWLING INFERNO': (pl, q) => q.options.slice(0, 3)});
  play('hades-v6-213'); done(s);
  assert.equal(b.void.filter(u => dead.includes(u)).length, 3);
  add('hades-v6-215', 'A', 'battlefield'); // Alraune: Feed on Life (+1 Soul por inimigo derrotado)
  const soul = s.players.A.soul, foe = add('hades-v6-218', 'B', 'battlefield');
  kill(foe); done(s);
  assert.ok(b.void.includes(foe) && !b.tartarus.includes(foe));
  assert.equal(s.players.A.soul, soul + 1, 'conta como derrotado');
});

test('Cancer Deathmask (Victimize, 08/11/2026): sacrifica um aliado e reanima do Tartarus inimigo; ao morrer, vai ao dono', () => {
  const {s, p, b, add, play, kill, answers} = hades();
  const fodder = add('hades-v6-218', 'A', 'battlefield'), theirs = add('hades-v6-216', 'B', 'tartarus');
  answers({'SEKI SHIKI MEIKAI HA': (pl, q) => (!q.options ? true : q.options.includes(theirs) ? theirs : fodder)});
  play('hades-v6-251'); done(s);
  assert.ok(p.tartarus.includes(fodder));
  assert.ok(p.battlefield.includes(theirs) && s.units[theirs].prepared === false);
  kill(theirs); done(s);
  assert.ok(b.tartarus.includes(theirs), 'Tartarus do dono');
});

test('Pisces Aphrodite (Sheoldred, 08/11/2026): oponente perde 1 Soul por compra além da primeira do turno dele', () => {
  const {s, ctx, b, add} = hades();
  bindContext(s, ctx);
  add('hades-v6-252', 'A', 'battlefield');
  s.active = 'B'; startTurn(s); done(s); runCheckpoint(s); done(s);
  const soul = b.soul;
  draw(s, 'B', 2); runCheckpoint(s); done(s);
  assert.equal(b.soul, soul - 2, 'compras extras no turno dele');
});

test('Thanatos (Grave Pact, 08/11/2026) e Dullahan (Blood Artist): aliado derrotado, oponente sacrifica e Dullahan drena 1', () => {
  const {s, p, b, add, kill} = hades();
  add('hades-v6-193', 'A', 'battlefield'); add('hades-v6-217', 'A', 'battlefield');
  const mine = add('hades-v6-218', 'A', 'battlefield'), foe = add('hades-v6-206', 'B', 'battlefield');
  kill(mine); done(s);
  assert.ok(b.tartarus.includes(foe));
  assert.deepEqual([b.soul, p.soul], [9, 11]);
});

test('Troll Iwan (08/11/2026): 4/4; Bloodthirst põe Training counter (+1/+1 permanente)', () => {
  const {s, ctx, add, kill} = hades();
  const troll = add('hades-v6-211', 'A', 'battlefield'), mine = add('hades-v6-218', 'A', 'battlefield');
  assert.deepEqual([atkOf(s, ctx, troll), hpOf(s, ctx, troll)], [4, 4]);
  kill(mine); done(s);
  assert.deepEqual([atkOf(s, ctx, troll), hpOf(s, ctx, troll), s.units[troll].training], [5, 5, 1]);
});

test('Worm Raimi (Mind Rot, 08/11/2026): paga 1, o oponente descarta à escolha dele', () => {
  const {s, p, b, add, play, answers} = hades();
  const keep = add('hades-v6-191', 'B', 'hand'), toss = add('hades-v6-218', 'B', 'hand');
  s.players.B.hand = [keep, toss];
  answers({"WORM'S BIND": (pl, q) => (q.options ? (pl === 'B' ? toss : q.options[0]) : true)});
  play('hades-v6-209'); done(s);
  assert.ok(b.tartarus.includes(toss) && b.hand.includes(keep));
  assert.equal(p.soul, 9);
});
