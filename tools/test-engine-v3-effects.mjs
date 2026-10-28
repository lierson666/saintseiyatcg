// Modificadores com duração e prevenção de dano de Strike das cartas dos decks D171. node --test tools/test-engine-v3-effects.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, checkInvariants, RuleError} from '../playtest/engine-v3/core.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {playSpell} from '../playtest/engine-v3/play.js';
import {atkOf, hpOf, keywordsOf} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

function setup(decks = {A: rush, B: fortress}, decide) {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks, first: 'A', seed: 3});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null; // cenário isolado
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached, decide};
  const take = (key, id) => { const p = s.players[key], uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); return uid; };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  const equip = (key, id, bearer) => { const uid = take(key, id); s.players[key].battlefield.push(uid); ctx.attached[uid] = bearer; return uid; };
  // Dá o recurso exato e joga a Spell da mão.
  const cast = (key, id, choice) => {
    const uid = take(key, id), cost = cards.get(`athena-v6-${id}`).cost, p = s.players[key];
    p.hand.push(uid);
    if (cost.unit === 'latent') p.latent = cost.amount;
    else p.bases = p.deck.splice(0, cost.amount).map(b => ({uid: b, prepared: true}));
    const open = s.window;
    playSpell(s, ctx, key, uid, choice);
    if (!open) passAll(s); // Moment do ativo abriu a janela: os dois passam
    return uid;
  };
  const strike = (attacker, target) => { declareStrike(s, ctx, attacker, target); return passAll(s); };
  const end = () => { endTurn(s); passAll(s); };
  startTurn(s);
  return {s, ctx, objects: m.objects, field, equip, cast, strike, end};
}

test('052 The Galaxian Wars: +1 ATK em até dois Bronze Saints até o fim do Round; compra com três Bronze Saints', () => {
  const {s, ctx, field, cast, end} = setup();
  const seiya = field('A', '001'), jabu = field('A', '028'), marin = field('A', '021');
  assert.throws(() => cast('A', '052', {targets: [seiya, marin]}), /Bronze Saint/, 'Marin é Silver');
  const hand = s.players.A.hand.length;
  cast('A', '052', {targets: [seiya, jabu]});
  assert.deepEqual([atkOf(s, ctx, seiya), atkOf(s, ctx, jabu), s.players.A.hand.length - hand], [3, 3, 0], 'só dois Bronze: sem compra');
  end(); startTurn(s);
  assert.equal(atkOf(s, ctx, seiya), 3, 'atravessa o turno adversário');
  end();
  assert.equal(atkOf(s, ctx, seiya), 2, 'expira no Cleanup do Round');
});

test('077 Shiryu\'s Sacrificed Sight: +2/+2 e Pierce em Shiryu; no fim do Round fica Unprepared e não prepara no próximo início', () => {
  const {s, ctx, field, cast, end} = setup({A: fortress, B: rush});
  const shiryu = field('A', '003');
  cast('A', '077', {target: shiryu});
  assert.deepEqual([atkOf(s, ctx, shiryu), hpOf(s, ctx, shiryu), keywordsOf(s, ctx, shiryu).includes('Pierce')], [4, 7, true]);
  end(); startTurn(s); end();
  assert.deepEqual([s.units[shiryu].prepared, atkOf(s, ctx, shiryu)], [false, 2]);
  startTurn(s);
  assert.equal(s.units[shiryu].prepared, false, 'não prepara neste início');
  end(); startTurn(s); end(); startTurn(s);
  assert.equal(s.units[shiryu].prepared, true);
});

test('061 The Call of Athena (God) em resposta ao Strike previne 3 de dano ao God', () => {
  const {s, ctx, field, cast} = setup();
  const seiya = field('A', '001');
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'});
  cast('B', '061', {mode: 'god'});
  passAll(s);
  assert.equal(s.players.B.soul, 30);
  assert.equal(s.effects.find(e => e.target === 'god:B').amount, 1, 'sobra 1 do escudo');
});

test('081 The Testament of Aiolos: "both" só com Pegasus Seiya', () => {
  const {s, ctx, field, cast} = setup();
  const jabu = field('A', '028');
  assert.throws(() => cast('A', '081', {mode: 'both', target: jabu}), /Pegasus Seiya/);
  field('A', '001');
  cast('A', '081', {mode: 'both', target: jabu});
  assert.deepEqual([atkOf(s, ctx, jabu), hpOf(s, ctx, jabu), s.effects.find(e => e.target === 'god:A').amount], [4, 4, 5]);
});

test('088 The Eighth Sense: +3/+3, salva de ser derrotado por Strike e prepara se o seu God tem menos Soul', () => {
  const {s, ctx, field, cast, strike} = setup();
  const seiya = field('A', '001');
  s.units[seiya].prepared = false;
  s.players.A.soul = 20;
  cast('A', '088', {target: seiya, prepare: true});
  assert.deepEqual([atkOf(s, ctx, seiya), hpOf(s, ctx, seiya), s.units[seiya].prepared], [5, 7, true]);
  s.units[seiya].damage = 6;
  strike(seiya, {kind: 'god', player: 'B'});
  assert.deepEqual([s.players.B.soul, s.units[seiya].damage], [25, 6], 'retaliação 3 que derrotaria foi prevenida');
  s.units[seiya].prepared = true;
  assert.throws(() => declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'}), /D22|outro Strike/);
});

test('054 e 076: salvamento; 076 em Pegasus Seiya pode Preparar (escolha do jogador)', () => {
  const {s, ctx, field, cast, strike} = setup({A: rush, B: fortress}, (player, q) => q.prepare);
  const seiya = field('A', '001'), jabu = field('A', '028');
  cast('A', '054', {target: jabu});
  s.units[jabu].damage = 1;
  strike(jabu, {kind: 'god', player: 'B'});
  assert.ok(s.players.A.battlefield.includes(jabu));
  cast('A', '076', {target: seiya});
  s.units[seiya].damage = 3;
  strike(seiya, {kind: 'god', player: 'B'});
  assert.deepEqual([s.units[seiya].damage, s.units[seiya].prepared], [3, true]);
});

test('056 Protect Saori: 3, ou 5 se você controla um Saint com Guardian', () => {
  const a = setup({A: fortress, B: rush});
  a.cast('A', '056', {});
  assert.equal(a.s.effects.find(e => e.target === 'god:A').amount, 3);
  const b = setup({A: fortress, B: rush});
  b.field('A', '003');
  b.cast('A', '056', {});
  assert.equal(b.s.effects.find(e => e.target === 'god:A').amount, 5);
  const c = setup({A: fortress, B: rush});
  c.field('A', '040'); // Guardian, mas Warrior: não é Saint
  c.cast('A', '056', {});
  assert.equal(c.s.effects.find(e => e.target === 'god:A').amount, 3);
});

test('087 Seiya Raises Athena\'s Shield: God sem dano no Round; remove 3 de cada Saint com Seiya; prepara até dois com Soul ≤ 5', () => {
  const {s, ctx, field, cast, end, strike} = setup();
  const seiya = field('A', '001'), jabu = field('A', '028');
  s.units[seiya].damage = 3; s.units[jabu].damage = 1; s.units[jabu].prepared = false;
  s.players.A.soul = 5;
  cast('A', '087', {prepare: [jabu]});
  assert.deepEqual([s.units[seiya].damage, s.units[jabu].damage, s.units[jabu].prepared], [0, 0, true]);
  end();
  const acolyte = field('B', '043');
  startTurn(s);
  strike(acolyte, {kind: 'god', player: 'A'});
  assert.equal(s.players.A.soul, 5, 'prevenido até o fim do Round');
});

test('estáticas: Tatsumi com Soul ≤ 5, Seika com Seiya, Shunrei com Shiryu', () => {
  const {s, ctx, field} = setup();
  const tatsumi = field('A', '034'), seika = field('A', '036');
  assert.deepEqual([hpOf(s, ctx, tatsumi), hpOf(s, ctx, seika)], [3, 2]);
  s.players.A.soul = 5; field('A', '001');
  assert.deepEqual([hpOf(s, ctx, tatsumi), hpOf(s, ctx, seika)], [5, 4]);
  const t = setup({A: fortress, B: rush});
  const shunrei = t.field('A', '037');
  assert.equal(hpOf(t.s, t.ctx, shunrei), 3);
  t.field('A', '003');
  assert.equal(hpOf(t.s, t.ctx, shunrei), 4);
});

test('Dragon Shield (003/004) previne 1 uma vez por Round e não acumula; Libra Defense previne 2 em Shiryu', () => {
  const {s, ctx, field, equip, strike, end} = setup({A: fortress, B: rush});
  const shiryu = field('A', '003');
  const cloth = equip('A', '004', shiryu); // Armor HP 5 com Dragon Shield
  strike(shiryu, {kind: 'god', player: 'B'});
  assert.deepEqual([s.units[cloth].damage, s.units[shiryu].damage], [2, 0], 'retaliação 3 menos 1');
  end(); startTurn(s); end(); startTurn(s);
  equip('A', '049', shiryu);
  strike(shiryu, {kind: 'god', player: 'B'});
  assert.equal(s.units[cloth].damage, 2, 'Dragon Shield 1 + Libra 2 previnem os 3');
});

test('Dragon\'s Guard (045) em Shiryu: previne 1 e põe escudo de 1 na Armor dele até o fim do Round seguinte', () => {
  const {s, ctx, field, equip, strike} = setup({A: fortress, B: rush});
  const shiryu = field('A', '003'), cloth = equip('A', '004', shiryu);
  equip('A', '045', shiryu);
  strike(shiryu, {kind: 'god', player: 'B'});
  assert.equal(s.units[cloth].damage, 0, '3 - Dragon Shield 1 - Dragon\'s Guard 1 - escudo da Armor 1');
});

test('opcionais pagos: Prayer of Rozan (1 Latent), Crystal Wall (2 Latent, também no God), Final Sacrifice (derrota Cassios)', () => {
  const asked = [];
  const yes = (player, q) => { asked.push(q.ability); return true; };
  const {s, ctx, field, strike, end} = setup({A: rush, B: fortress}, yes);
  const seiya = field('A', '001');
  const shunrei = field('B', '037'), mu = field('B', '011'), cassios = field('B', '027'), shiryu = field('B', '003');
  s.units[shunrei].prepared = s.units[mu].prepared = s.units[cassios].prepared = false;
  s.units[shiryu].prepared = false; // Guardian Unprepared não protege
  s.players.B.latent = 3;
  strike(seiya, {kind: 'god', player: 'B'});
  assert.deepEqual([s.players.B.soul, s.players.B.latent, asked], [30, 1, ['Crystal Wall']], 'Crystal Wall previne os 2 no God');
  const jabu = field('A', '028'); // ATK 2 + Unicorn Gallop 1 contra Shiryu: Dragon Shield 1, Prayer 1, Final Sacrifice o resto
  strike(jabu, {kind: 'devotee', uid: shiryu});
  assert.deepEqual(asked, ['Crystal Wall', 'Prayer of Rozan', 'Final Sacrifice']);
  assert.deepEqual([s.units[shiryu].damage, s.players.B.latent, s.players.B.tartarus.includes(cassios)], [0, 0, true]);
  checkInvariants(s, ctx.objects);
});

test('Unicorn Gallop (028): +1 ATK só durante o Strike contra Devotee; Rising Dragon (003): +1 ATK ao sobreviver como defensor', () => {
  const {s, ctx, field, strike} = setup();
  const jabu = field('A', '028'), shiryu = field('B', '003');
  strike(jabu, {kind: 'devotee', uid: shiryu});
  assert.deepEqual([s.units[shiryu].damage, atkOf(s, ctx, jabu)], [2, 2], '3 de dano menos Dragon Shield 1');
  assert.equal(atkOf(s, ctx, shiryu), 3, 'Rising Dragon');
});
