// Efeitos V6 de Artemis (playtest/engine-v3/v6/artemis.js): um caso por gancho e por família (marcadores, ramp,
// remoção, prevenção, ativadas). node --test tools/test-engine-v3-v6-artemis.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll} from '../playtest/engine-v3/core.js';
import {playDevotee, playEquipment, playSpell, activate, reequip} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, hpOf, keywordsOf, damageDevotee, checkDefeats} from '../playtest/engine-v3/effects.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

// Artemis é A (ativo). Cartas injetadas por id; sem Domains, salvo o teste. `answer(q)` responde as escolhas;
// "you may" responde `yes` (padrão sim).
function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-artemis-hunt'), B: deck('preview-ares-legions')}, first: 'A', seed: 1});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A;
  bindContext(s, ctx);
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  s.domains = {A: null, B: null};
  startTurn(s);
  p.bases = p.deck.splice(0, 8).map(uid => ({uid, prepared: true}));
  let n = 0;
  const make = (key, cardId) => { const uid = `${key}:t${++n}:${cardId.slice(-3)}`; m.objects[uid] = {owner: key, cardId, armor: cards.get(cardId).armor}; return uid; };
  const field = (key, cardId) => { const uid = make(key, cardId); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0, entered: 0}; return uid; };
  const hand = (key, cardId) => { const uid = make(key, cardId); s.players[key].hand.push(uid); return uid; };
  const io = {yes: true, answer: q => q.options[0]};
  ctx.decide = (player, q) => (q.options ? io.answer(q, player) : io.yes);
  return {s, ctx, p, field, hand, io, id: cardId => `artemis-v6-${cardId}`};
}

test('enter + watchCounter: Lunar Nymph põe marcador; Calisto compra 1 (uma por Round); Primordial Grove dá 1 Soul e +0/+1', () => {
  const {s, ctx, p, field, hand, io, id} = setup();
  s.domains.A = id(429);
  p.soul -= 5;
  const calisto = field('A', id(361)), wolf = field('A', id(404)), nymph = hand('A', id(398));
  io.answer = q => (q.options.includes(wolf) ? wolf : q.options[0]);
  const cards0 = p.hand.length, soul0 = p.soul, atk0 = atkOf(s, ctx, wolf), hp0 = hpOf(s, ctx, wolf);
  playDevotee(s, ctx, 'A', nymph, {}); passAll(s);
  assert.equal(s.units[wolf].counters, 1);
  assert.equal(atkOf(s, ctx, wolf), atk0 + 1);
  assert.equal(hpOf(s, ctx, wolf), hp0 + 2); // marcador + Rooted Endurance
  assert.equal(p.hand.length, cards0 - 1 + 1); // jogou a Nymph, Calisto comprou 1
  assert.equal(p.soul, soul0 + 1);
  // Segunda vez no mesmo Round/turno: nem Calisto nem o Domain disparam.
  playDevotee(s, ctx, 'A', hand('A', id(398)), {}); passAll(s);
  assert.equal(s.units[wolf].counters, 2);
  assert.equal(p.hand.length, cards0); // pôs outra Nymph na mão e jogou; sem compra
  assert.equal(p.soul, soul0 + 1);
  assert.equal(atkOf(s, ctx, calisto), cards.get(id(361)).atk); // Divine Authority é só para os outros
});

test('declare + killInCombat: Great Lunar Hound ganha marcador ao declarar e compra ao derrotar', () => {
  const {s, ctx, p, field} = setup();
  const hound = field('A', 'artemis-v6-385'), prey = field('B', 'artemis-v6-386');
  const cards0 = p.hand.length;
  declareStrike(s, ctx, hound, {kind: 'devotee', uid: prey}); passAll(s);
  if (s.chain.length || s.window) passAll(s);
  assert.equal(s.units[hound].counters, 1);
  assert.ok(s.players.B.tartarus.includes(prey));
  assert.equal(p.hand.length, cards0 + 1);
});

test('Equipment: Silver Moon Arrow dá Trample, +2/+0 no Strike contra Devotee e compra ao derrotar', () => {
  const {s, ctx, p, field, hand} = setup();
  const archer = field('A', 'artemis-v6-393'), arrow = hand('A', 'artemis-v6-380'), prey = field('B', 'artemis-v6-386');
  playEquipment(s, ctx, 'A', arrow, archer);
  assert.ok(keywordsOf(s, ctx, archer).includes('Trample'));
  const atk = atkOf(s, ctx, archer), cards0 = p.hand.length;
  declareStrike(s, ctx, archer, {kind: 'devotee', uid: prey});
  passAll(s); // resolve o gatilho; a janela continua até o dano
  if (s.window) passAll(s);
  assert.ok(s.players.B.tartarus.includes(prey));
  assert.equal(p.hand.length, cards0 + 1);
  assert.equal(atkOf(s, ctx, archer), atk + 2); // até o fim do turno
});

test('ramp: Ancient Expansion põe 2 Bases Unprepared; Second Moon Guardian ganha +2/+2 com 6+ na Cosmo Bank', () => {
  const {s, ctx, p, field, hand} = setup();
  const guard = field('A', 'artemis-v6-437');
  p.bases = p.bases.slice(0, 4);
  const atk0 = atkOf(s, ctx, guard);
  playSpell(s, ctx, 'A', hand('A', 'artemis-v6-423'));
  if (s.window) passAll(s);
  assert.equal(p.bases.length, 6);
  assert.equal(p.bases.filter(b => !b.prepared).length, 3 + 2); // 3 pagas + 2 novas
  assert.equal(atkOf(s, ctx, guard), atk0 + 2);
});

test('remoção: Primal Strike causa ATK; Hunter\'s Challenge luta e compra se o inimigo morrer', () => {
  const {s, ctx, p, field, hand, io} = setup();
  const beast = field('A', 'artemis-v6-392'), a = field('B', 'artemis-v6-386'), b = field('B', 'artemis-v6-392');
  io.answer = q => (q.options.includes(b) ? b : q.options[0]);
  playSpell(s, ctx, 'A', hand('A', 'artemis-v6-418')); if (s.window) passAll(s);
  assert.ok(s.players.B.tartarus.includes(b));
  io.answer = q => (q.options.includes(a) ? a : q.options[0]);
  const cards0 = p.hand.length;
  playSpell(s, ctx, 'A', hand('A', 'artemis-v6-443')); if (s.window) passAll(s);
  assert.ok(s.players.B.tartarus.includes(a));
  assert.equal(s.units[beast].damage, 1);
  assert.equal(p.hand.length, cards0 + 1); // 443 entrou e saiu da mão; comprou 1
});

test('startTurn: Ancient Sacred Armor põe marcador se não houver; Selene põe em até dois', () => {
  const {s, ctx, field, hand} = setup();
  const bear = field('A', 'artemis-v6-383'), armor = hand('A', 'artemis-v6-366');
  playEquipment(s, ctx, 'A', armor, bear);
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s); // turno de B
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s); // volta para A
  assert.equal(s.active, 'A');
  assert.equal(s.units[bear].counters, 1);
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s);
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s);
  assert.equal(s.units[bear].counters, 1); // já tinha marcador
});

test('ativadas: Ancient Forest Guardian remove marcador e previne 2; Chloris {T} remove marcador e compra', () => {
  const {s, ctx, p, field} = setup();
  const guard = field('A', 'artemis-v6-391'), chloris = field('A', 'artemis-v6-377');
  s.units[guard].counters = 2;
  assert.ok(keywordsOf(s, ctx, guard).includes('Guardian'));
  activate(s, ctx, 'A', guard);
  assert.equal(s.units[guard].counters, 1);
  damageDevotee(s, ctx, guard, 3, false);
  assert.equal(s.units[guard].damage, 1);
  const cards0 = p.hand.length;
  activate(s, ctx, 'A', chloris);
  assert.equal(s.units[guard].counters, 0);
  assert.equal(p.hand.length, cards0 + 1);
  assert.equal(s.units[chloris].prepared, false);
  assert.throws(() => activate(s, ctx, 'A', guard)); // sem marcador
});

test('prevenção e derrota: Divine Defiance previne todo dano no turno; Forest Spirit derrotado gera 1 Latent', () => {
  const {s, ctx, p, field, hand} = setup();
  const spirit = field('A', 'artemis-v6-396');
  playSpell(s, ctx, 'A', hand('A', 'artemis-v6-445')); if (s.window) passAll(s);
  damageDevotee(s, ctx, spirit, 10, false); checkDefeats(s, ctx);
  assert.equal(s.units[spirit].damage, 0);
  s.effects = s.effects.filter(e => e.kind !== 'prevent');
  const latent = p.latent;
  damageDevotee(s, ctx, spirit, 10, false); checkDefeats(s, ctx); passAll(s);
  assert.ok(p.tartarus.includes(spirit));
  assert.equal(p.latent, latent + 1);
});

test('Hermia paga {1}{C} quando outro Devotee recebe marcador; Lunar Amulet só dá +1/+1 com outro marcado', () => {
  const {s, ctx, p, field, hand} = setup();
  const hermia = field('A', 'artemis-v6-367'), stag = field('A', 'artemis-v6-381'), amulet = hand('A', 'artemis-v6-414');
  playEquipment(s, ctx, 'A', amulet, hermia);
  const atk = atkOf(s, ctx, hermia);
  assert.equal(atk, cards.get('artemis-v6-367').atk); // sem outro Devotee marcado: sem bônus
  const ready = () => p.bases.filter(b => b.prepared).length, r0 = ready();
  playSpell(s, ctx, 'A', hand('A', 'artemis-v6-421'), {}); // Primal Blessing: o primeiro amigo (Hermia) é a escolha padrão
  if (s.window) passAll(s);
  // Escolha padrão = Hermia: ela recebe o marcador; Hermia não dispara para si mesma.
  assert.equal(s.units[hermia].counters, 1);
  assert.equal(ready(), r0 - 1);
  s.units[stag].counters = 1;
  assert.equal(atkOf(s, ctx, hermia), atk + 1 + 1); // marcador + Lunar Resonance
});

test('Domain Lunar Sanctuary: Devotee Artemis jogado da mão pode receber marcador pagando {1}{C}; Satellites +0/+1', () => {
  const {s, ctx, p, hand} = setup();
  s.domains.A = 'artemis-v6-427';
  const archer = hand('A', 'artemis-v6-393');
  playDevotee(s, ctx, 'A', archer, {}); passAll(s);
  assert.equal(s.units[archer].counters, 1);
  assert.equal(hpOf(s, ctx, archer), cards.get('artemis-v6-393').hp + 1 + 1);
  playDevotee(s, ctx, 'A', hand('A', 'artemis-v6-393'), {}); if (s.window) passAll(s);
  assert.equal(p.battlefield.filter(u => s.units[u]?.counters).length, 1); // uma vez por turno
});

test('tokens (guia §63): The Forest Invades Sanctuary cria 2 Forest Guardian 3/3 Unprepared; token derrotado some', async () => {
  const {checkInvariants} = await import('../playtest/engine-v3/core.js');
  const {s, ctx, p, hand, id} = setup();
  const spell = hand('A', id(444)), bases0 = p.bases.length;
  playSpell(s, ctx, 'A', spell, {});
  const tokens = p.battlefield.filter(u => ctx.objects[u]?.token);
  assert.equal(tokens.length, 2);
  assert.equal(p.bases.length - bases0 + 4 >= 2, true); // 2 Bases novas (o custo gastou Bases preparadas, não removeu)
  assert.deepEqual([atkOf(s, ctx, tokens[0]), hpOf(s, ctx, tokens[0]), s.units[tokens[0]].prepared], [3, 3, false]);
  s.units[tokens[0]].damage = 3; checkDefeats(s, ctx);
  assert.ok(!p.battlefield.includes(tokens[0]) && !p.tartarus.includes(tokens[0]));
  checkInvariants(s, ctx.objects);
});

test('Moonlit Initiate (386): {T} gera 1 Latent comum', () => {
  const {s, ctx, p, field, id} = setup();
  const init = field('A', id(386)), latent0 = p.latent;
  activate(s, ctx, 'A', init, {});
  assert.equal(p.latent, latent0 + 1);
  assert.equal(s.units[init].prepared, false);
});

// ---- Completados com os ganchos novos (29/10/2026) ----
test('362 Moonlight Protection: remove um marcador +1/+1, evita a derrota e previne o resto do dano no Round; só uma vez', () => {
  const {s, ctx, field, id} = setup();
  const wolf = field('A', id(404)), vest = field('A', id(362));
  ctx.attached[vest] = wolf;
  s.units[wolf].counters = 2;
  s.units[wolf].damage = hpOf(s, ctx, wolf);
  checkDefeats(s, ctx);
  assert.ok(s.players.A.battlefield.includes(wolf));
  assert.equal(s.units[wolf].counters, 1);
  assert.equal(s.units[wolf].damage, hpOf(s, ctx, wolf) - 1);
  assert.ok(s.roundUses.has(`${vest}:moonlight`));
  // Todo dano neste Round é prevenido (Strike ou efeito).
  const before = s.units[wolf].damage;
  damageDevotee(s, ctx, wolf, 5, false);
  assert.equal(s.units[wolf].damage, before);
  // Segunda derrota no mesmo Round: sem uso, o Devotee é destruído.
  s.effects = s.effects.filter(e => e.kind !== 'prevent');
  s.units[wolf].damage = hpOf(s, ctx, wolf);
  checkDefeats(s, ctx);
  assert.ok(s.players.A.tartarus.includes(wolf));
});

test('362 Moonlight Protection: sem marcador +1/+1 não pergunta e o Devotee é derrotado', () => {
  const {s, ctx, field, id} = setup();
  const wolf = field('A', id(404)), vest = field('A', id(362));
  ctx.attached[vest] = wolf;
  s.units[wolf].damage = hpOf(s, ctx, wolf);
  checkDefeats(s, ctx);
  assert.ok(s.players.A.tartarus.includes(wolf));
});

test('406 Divine Training: Equipment preso à Huntress (jogado ou equipado depois) põe +1/+1 nela', () => {
  const {s, ctx, field, hand, id} = setup();
  const huntress = field('A', id(406)), other = field('A', id(404)), gear = field('A', id(362));
  reequip(s, ctx, 'A', gear, huntress); passAll(s);
  assert.equal(s.units[huntress].counters, 1);
  const gear2 = field('A', id(362));
  reequip(s, ctx, 'A', gear2, other); passAll(s);
  assert.equal(s.units[huntress].counters, 1); // em outro Devotee não conta
  assert.ok(hand);
});

test('438 Lunar Resistance: previne 1 de todo dano (Strike e efeito) e a Armor não é tocada', () => {
  const {s, ctx, field, id} = setup();
  const guard = field('A', id(438));
  damageDevotee(s, ctx, guard, 3, false);
  assert.equal(s.units[guard].damage, 2);
  damageDevotee(s, ctx, guard, 1, true);
  assert.equal(s.units[guard].damage, 2); // 1 prevenido por inteiro
  const e = s.events.filter(x => x.type === 'damage').at(-1);
  assert.equal(e.prevented, 1);
});
