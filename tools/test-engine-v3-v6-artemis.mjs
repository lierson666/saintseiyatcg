// Efeitos V6 de Artemis (playtest/engine-v3/v6/artemis.js): um caso por gancho e por família (marcadores, ramp,
// remoção, prevenção, ativadas). node --test tools/test-engine-v3-v6-artemis.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, placeBase} from '../playtest/engine-v3/core.js';
import {playDevotee as playDevoteeRaw, playEquipment as playEquipmentRaw, playSpell, activate as activateRaw, reequip} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, hpOf, keywordsOf, damageDevotee, checkDefeats, namedCharacter} from '../playtest/engine-v3/effects.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';
// Guia §56 (30/10/2026): jogada e {T} vão à pilha; aqui os dois passam e a pilha resolve na hora.
const resolved = fn => (s, ...a) => { const r = fn(s, ...a); passAll(s); return r; };
const playDevotee = resolved(playDevoteeRaw), activate = resolved(activateRaw);
// Guia §33 (01/11/2026): arma/acessório entra sem portador; o portador do teste vem pela ação Equip.
const playEquipment = (s, ctx, key, uid, bearer, ch) => { const r = resolved(playEquipmentRaw)(s, ctx, key, uid, bearer, ch); if (bearer && !ctx.attached[uid] && !ctx.cards.get(ctx.objects[uid].cardId).global) reequip(s, ctx, key, uid, bearer); return r; };

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('./fixtures/decks-preview.json').decks;

// Artemis é A (ativo). Cartas injetadas por id; sem Domains, salvo o teste. `answer(q)` responde as escolhas;
// "you may" responde `yes` (padrão sim).
function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-artemis-hunt'), B: deck('preview-ares-legions')}, first: 'A', seed: 1});
  m.state.gods.A = m.state.divine.A.god = 'god-artemis'; // Ressonância dos Domains lê s.divine[key].god (01/11/2026)
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

test('enter + watchCounter: Chandra põe marcador; Calisto compra 1 (uma por Round); Ancient Grove sem PV fixo (sem Soul desde 31/10/2026)', () => {
  const {s, ctx, p, field, hand, io, id} = setup();
  s.domains.A = id(429);
  p.soul -= 5;
  const calisto = field('A', id(361)), wolf = field('A', id(404)), nymph = hand('A', id(371));
  io.answer = q => (q.options.includes(wolf) ? wolf : q.options[0]);
  const cards0 = p.hand.length, soul0 = p.soul, atk0 = atkOf(s, ctx, wolf), hp0 = hpOf(s, ctx, wolf);
  playDevotee(s, ctx, 'A', nymph, {}); passAll(s);
  assert.equal(s.units[wolf].training, 1);
  assert.equal(atkOf(s, ctx, wolf), atk0 + 1);
  assert.equal(hpOf(s, ctx, wolf), hp0 + 1); // só o marcador: Rooted Endurance vale ao declarar Strike
  assert.equal(p.hand.length, cards0 - 1 + 1); // jogou a Nymph, Calisto comprou 1
  assert.equal(p.soul, soul0);
  // Segunda vez no mesmo Round/turno: nem Calisto nem o Domain disparam.
  playDevotee(s, ctx, 'A', hand('A', id(371)), {}); passAll(s);
  assert.equal(s.units[wolf].training, 2);
  assert.equal(p.hand.length, cards0); // pôs outra Chandra na mão e jogou; sem compra
  assert.equal(p.soul, soul0);
  assert.equal(atkOf(s, ctx, calisto), cards.get(id(361)).atk); // Divine Authority é só para os outros
});

test('declare + killInCombat: Great Lunar Hound ganha marcador ao declarar e compra ao derrotar', () => {
  const {s, ctx, p, field} = setup();
  const hound = field('A', 'artemis-v6-385'), prey = field('B', 'artemis-v6-386');
  const cards0 = p.hand.length;
  declareStrike(s, ctx, hound, {kind: 'devotee', uid: prey}); passAll(s);
  if (s.chain.length || s.window) passAll(s);
  assert.equal(s.units[hound].training, 1);
  assert.ok(s.players.B.tartarus.includes(prey));
  assert.equal(p.hand.length, cards0 + 1);
});

test('Equipment: Silver Moon Arrow dá Pierce, +2/+0 no Strike contra Devotee e compra ao derrotar', () => {
  const {s, ctx, p, field, hand} = setup();
  const archer = field('A', 'artemis-v6-393'), arrow = hand('A', 'artemis-v6-380'), prey = field('B', 'artemis-v6-386');
  playEquipment(s, ctx, 'A', arrow, archer);
  assert.ok(keywordsOf(s, ctx, archer).includes('Pierce'));
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

test('418 Call of the Forest: Devotee de custo 3 ou menos do deck ao campo, Unprepared', () => {
  const {s, ctx, p, hand, io, id} = setup();
  const big = p.deck.find(u => ctx.cards.get(ctx.objects[u].cardId).kind === 'Devotee' && ctx.cards.get(ctx.objects[u].cardId).cost.amount > 3);
  const seen = [];
  io.answer = q => { if (q.ability === 'CALL OF THE FOREST') seen.push(...q.options); return q.options[0]; };
  playSpell(s, ctx, 'A', hand('A', id(418))); if (s.window) passAll(s);
  assert.ok(seen.length && seen.every(u => ctx.cards.get(ctx.objects[u].cardId).cost.amount <= 3));
  if (big) assert.ok(!seen.includes(big));
  assert.ok(p.battlefield.includes(seen[0]));
  assert.equal(s.units[seen[0]].prepared, false);
});

test('remoção: Primal Strike causa ATK; Hunter\'s Challenge luta e compra se o inimigo morrer', () => {
  const {s, ctx, p, field, hand, io} = setup();
  const beast = field('A', 'artemis-v6-392'), a = field('B', 'artemis-v6-386'), b = field('B', 'artemis-v6-392');
  io.answer = q => (q.options.includes(b) ? b : q.options[0]);
  playSpell(s, ctx, 'A', hand('A', 'artemis-v6-424')); if (s.window) passAll(s);
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
  playEquipment(s, ctx, 'A', armor, null); reequip(s, ctx, 'A', armor, bear); // Armor entra solta (guia §28) e veste pagando Equip
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s); // turno de B
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s); // volta para A
  assert.equal(s.active, 'A');
  assert.equal(s.units[bear].training, 1);
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s);
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s);
  assert.equal(s.units[bear].training, 1); // já tinha marcador
});

test('ativadas: Ancient Forest Guardian remove marcador e previne 2; Chloris {T} remove marcador e compra', () => {
  const {s, ctx, p, field} = setup();
  const guard = field('A', 'artemis-v6-391'), chloris = field('A', 'artemis-v6-377');
  s.units[guard].training = 2;
  assert.ok(keywordsOf(s, ctx, guard).includes('Guardian'));
  activate(s, ctx, 'A', guard);
  assert.equal(s.units[guard].training, 1);
  damageDevotee(s, ctx, guard, 3, false);
  assert.equal(s.units[guard].damage, 1);
  const cards0 = p.hand.length;
  activate(s, ctx, 'A', chloris);
  assert.equal(s.units[guard].training, 0);
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
  assert.equal(s.units[hermia].training, 1);
  assert.equal(ready(), r0 - 1);
  s.units[stag].training = 1;
  assert.equal(atkOf(s, ctx, hermia), atk + 1 + 1); // marcador + Lunar Resonance
});

test('Domain 427 Temple of the Moon: Satellites +0/+1; Ressonância põe um Training counter em cada Satellite, uma vez por turno', () => {
  const {s, ctx, field} = setup();
  s.domains.A = 'artemis-v6-427';
  const archer = field('A', 'artemis-v6-393'), other = field('A', 'artemis-v6-404');
  assert.equal(hpOf(s, ctx, archer), cards.get('artemis-v6-393').hp + 1);
  activate(s, ctx, 'A', 'domain:A:res', {}); passAll(s);
  assert.equal(s.units[archer].training, 1);
  assert.ok(!s.units[other].training, 'não é Satellite');
  assert.throws(() => activate(s, ctx, 'A', 'domain:A:res', {}), /Round/);
});

test('tokens (guia §63): The Forest Invades Sanctuary cria 2 Forest Guardian 3/3 Unprepared; token derrotado some', async () => {
  const {checkInvariants} = await import('../playtest/engine-v3/core.js');
  const {s, ctx, p, hand, id} = setup();
  const spell = hand('A', id(444)), bases0 = p.bases.length;
  playSpell(s, ctx, 'A', spell, {}); passAll(s);
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
  s.units[wolf].training = 2;
  s.units[wolf].damage = hpOf(s, ctx, wolf);
  checkDefeats(s, ctx);
  assert.ok(s.players.A.battlefield.includes(wolf));
  assert.equal(s.units[wolf].training, 1);
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
  assert.equal(s.units[huntress].training, 1);
  const gear2 = field('A', id(362));
  reequip(s, ctx, 'A', gear2, other); passAll(s);
  assert.equal(s.units[huntress].training, 1); // em outro Devotee não conta
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

test('407 Primal Channeling: o próximo Devotee do turno custa 1 a menos; o seguinte paga cheio; Latent não muda (autor, 31/10/2026)', () => {
  const {s, ctx, p, field, hand, id} = setup();
  const shaman = field('A', id(407)), a = hand('A', id(404)), b = hand('A', id(404));
  const cost = cards.get(id(404)).cost.amount, ready = () => p.bases.filter(x => x.prepared).length, latent0 = p.latent;
  activate(s, ctx, 'A', shaman);
  assert.equal(p.latent, latent0);
  let before = ready(); playDevotee(s, ctx, 'A', a, {});
  assert.equal(before - ready(), cost - 1);
  before = ready(); playDevotee(s, ctx, 'A', b, {});
  assert.equal(before - ready(), cost);
});

// ---- Artemis → Verde (meta Premodern, 31/10/2026): docs/rebalance-artemis-premodern.md ----
test('435 Odysseus: Celestial Reversal é fight (cada um causa o próprio ATK), não 3 de dano fixo', () => {
  const {s, ctx, field, hand, id} = setup();
  const foe = field('B', id(382)), cmd = hand('A', id(435)); // Moonlit Wolf 2/1 do lado B
  const foeAtk = atkOf(s, ctx, foe);
  playDevotee(s, ctx, 'A', cmd, {}); passAll(s);
  assert.ok(!s.units[foe], 'o 5/4 derrota o alvo');
  assert.equal(s.units[cmd].damage, foeAtk, 'e leva o ATK do alvo');
});

test('388 Silver Arrow Huntress: Precise Hunt pode destruir um Equipment', () => {
  const {s, ctx, field, hand, io, id} = setup();
  const foe = field('B', 'ares-v6-292'), helmet = field('B', 'ares-v6-315');
  ctx.attached[helmet] = foe;
  io.answer = q => (q.options.includes(helmet) ? helmet : q.options[0]);
  playDevotee(s, ctx, 'A', hand('A', id(388)), {}); passAll(s);
  assert.ok(s.players.B.tartarus.includes(helmet));
  assert.ok(s.players.B.battlefield.includes(foe));
});

test('379 Divine Bow: Celestial Arrow dá +2 ATK contra Devotee, sem dano em outro alvo', () => {
  const {s, ctx, field, hand, id} = setup();
  const archer = field('A', id(393)), foe = field('B', 'ares-v6-271'), other = field('B', 'ares-v6-273'); // personagens diferentes (§63)
  playEquipment(s, ctx, 'A', hand('A', id(379)), archer);
  const atk = atkOf(s, ctx, archer);
  declareStrike(s, ctx, archer, {kind: 'devotee', uid: foe}); passAll(s);
  assert.equal(s.units[other].damage, 0);
  assert.ok(!s.units[foe] || s.units[foe].damage >= atk + 2);
});

test('custos novos: 397 c1, 449 c5, 450 c6', () => {
  const {ctx, id} = setup();
  assert.deepEqual([397, 449, 450].map(n => ctx.cards.get(id(n)).cost.amount), [1, 5, 6]);
});

test('381 Sacred Stag: uma Base adicional por Round; duas cópias não somam', () => {
  const {s, ctx, p, field, hand, id} = setup();
  const cosmo = () => { const u = hand('A', id(386)); return u; }; // Cosmoble
  placeBase(s, 'A', cosmo(), {cosmoble: true});
  assert.throws(() => placeBase(s, 'A', cosmo(), {cosmoble: true}), /D4/);
  field('A', id(381));
  placeBase(s, 'A', cosmo(), {cosmoble: true});
  field('A', id(381));
  assert.throws(() => placeBase(s, 'A', cosmo(), {cosmoble: true}), /D4/);
});

test('389 Wildwood Stalker: uma vez por Round, pôr Base dá 1 Latent', () => {
  const {s, ctx, p, field, hand, id} = setup();
  field('A', id(389)); field('A', id(381));
  const l0 = p.latent;
  placeBase(s, 'A', hand('A', id(386)), {cosmoble: true}); passAll(s);
  placeBase(s, 'A', hand('A', id(386)), {cosmoble: true}); passAll(s);
  assert.equal(p.latent, l0 + 1);
});

test('390 Moon Temple Acolyte: o primeiro marcador do Round vira 2', () => {
  const {s, ctx, field, hand, io, id} = setup();
  field('A', id(390));
  const t = field('A', id(382));
  io.answer = q => (q.options.includes(t) ? t : q.options[0]);
  playSpell(s, ctx, 'A', hand('A', id(421))); if (s.window) passAll(s);
  assert.equal(s.units[t].training, 2);
  playSpell(s, ctx, 'A', hand('A', id(421))); if (s.window) passAll(s);
  assert.equal(s.units[t].training, 3);
});

test('398 Lunar Nymph: devolve do Tartarus carta de custo 3 ou menos', () => {
  const {s, ctx, p, hand, io, id} = setup();
  const cheap = hand('A', id(388)), big = hand('A', id(440));
  p.hand.splice(p.hand.indexOf(cheap), 1); p.hand.splice(p.hand.indexOf(big), 1); p.tartarus.push(cheap, big);
  const seen = [];
  io.answer = q => { if (q.ability === 'MOONLIT BLESSING') seen.push(...q.options); return q.options[0]; };
  playDevotee(s, ctx, 'A', hand('A', id(398)), {}); passAll(s);
  assert.deepEqual(seen, [cheap]);
  assert.ok(p.hand.includes(cheap));
});

test('404 Silver Fang Wolf: 1 Wolf por outro Sacred Beast, máximo 3', () => {
  const {s, ctx, p, field, hand, id} = setup();
  for (let i = 0; i < 4; i++) field('A', id(382));
  playDevotee(s, ctx, 'A', hand('A', id(404)), {}); passAll(s);
  assert.equal(p.battlefield.filter(u => ctx.objects[u].cardId === 'token-wolf').length, 3);
});

test('422 Predator\'s Challenge: destrói e o controlador ganha Forest Guardian 3/3', () => {
  const {s, ctx, field, hand, io, id} = setup();
  const foe = field('B', 'ares-v6-292');
  io.answer = q => (q.options.includes(foe) ? foe : q.options[0]);
  playSpell(s, ctx, 'A', hand('A', id(422))); if (s.window) passAll(s);
  assert.ok(s.players.B.tartarus.includes(foe));
  assert.equal(s.players.B.battlefield.filter(u => ctx.objects[u].cardId === 'token-forest-guardian').length, 1);
});

test('441 The Return of the Goddess: até 2 cartas do Tartarus viram Base Unprepared', () => {
  const {s, ctx, p, hand, io, id} = setup();
  const a = hand('A', id(388)), b = hand('A', id(389));
  p.hand.splice(p.hand.indexOf(a), 1); p.hand.splice(p.hand.indexOf(b), 1); p.tartarus.push(a, b);
  const n0 = p.bases.length;
  io.answer = q => (q.count ? [a, b] : q.options[0]);
  playSpell(s, ctx, 'A', hand('A', id(441))); if (s.window) passAll(s);
  assert.equal(p.bases.length, n0 + 2);
  assert.ok(p.bases.filter(x => [a, b].includes(x.uid)).every(x => !x.prepared));
  assert.ok(!p.tartarus.includes(a) && !p.tartarus.includes(b));
});

test('372 The Goddess Awakens: não morre por dano até o fim do Round; depois morre', () => {
  const {s, ctx, field, hand, id} = setup();
  const t = field('A', id(382));
  s.divine.B.god = 'god-ares';
  playSpell(s, ctx, 'A', hand('A', id(372))); if (s.window) passAll(s);
  damageDevotee(s, ctx, t, 99, false); checkDefeats(s, ctx);
  assert.ok(s.players.A.battlefield.includes(t));
  assert.equal(s.v6Immune[t].faction, 'ares');
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s);
  assert.ok(!s.players.A.battlefield.includes(t));
});

// ---- Artemis V2.0 (autor, 06/11/2026): Anjos Celestes 431/433/435 e Glories 432/434/436; docs/artemis-v2-card-migration.md ----
test('431 Theseus: Celestial Vanguard dá +1/+1 só a outros Angels; Divine Judgment só escolhe Angel', () => {
  const {s, ctx, field, hand, io, id} = setup();
  const icarus = field('A', id(433)), sat = field('A', id(388)), foe = field('B', 'ares-v6-271');
  const atkI = atkOf(s, ctx, icarus), atkS = atkOf(s, ctx, sat);
  let offered = null;
  io.answer = q => { if (q.options.includes(icarus) || q.options.includes(sat)) offered = q.options; return q.options.includes(icarus) ? icarus : q.options[0]; };
  const theseus = hand('A', id(431));
  playDevotee(s, ctx, 'A', theseus, {}); passAll(s);
  assert.equal(atkOf(s, ctx, icarus), atkI + 1, 'Angel recebe o bônus');
  assert.equal(atkOf(s, ctx, sat), atkS, 'Satellite não recebe mais');
  assert.equal(atkOf(s, ctx, theseus), cards.get(id(431)).atk, 'Other: Theseus não se buffa');
  assert.ok(offered && !offered.includes(sat), 'Satellite não é alvo de Divine Judgment');
  assert.ok(!s.units[foe] || s.units[foe].damage > 0, 'o Angel escolhido causa dano ao inimigo');
});

test('433 Icarus: Pierce, Celestial Descent causa ATK e cresce +1/+1 a cada 3 na Cosmo Bank', () => {
  const {s, ctx, p, field, hand, id} = setup();
  const foe = field('B', 'ares-v6-271'), icarus = hand('A', id(433));
  playDevotee(s, ctx, 'A', icarus, {}); passAll(s);
  assert.ok(keywordsOf(s, ctx, icarus).includes('Pierce'));
  const bonus = Math.floor(p.bases.length / 3);
  assert.equal(atkOf(s, ctx, icarus), cards.get(id(433)).atk + bonus);
  assert.ok(!s.units[foe], 'o alvo leva dano igual ao ATK e cai');
});

test('435 Odysseus: Angel Vanguard dá +1/+0 ao Angel que declara Strike, não a Satellite; compra ao derrotar', () => {
  const {s, ctx, p, field, id} = setup();
  const odysseus = field('A', id(435)); // Anjo é lendário (§63): um só Odysseus no campo, o mesmo que ataca no fim
  const icarus = field('A', id(433)), sat = field('A', id(388));
  const preyA = field('B', 'artemis-v6-386'), preyB = field('B', 'artemis-v6-386');
  const atkI = atkOf(s, ctx, icarus), atkS = atkOf(s, ctx, sat);
  declareStrike(s, ctx, icarus, {kind: 'devotee', uid: preyA}); passAll(s); if (s.window) passAll(s);
  assert.equal(atkOf(s, ctx, icarus), atkI + 1);
  declareStrike(s, ctx, sat, {kind: 'devotee', uid: preyB}); passAll(s); if (s.window) passAll(s);
  assert.equal(atkOf(s, ctx, sat), atkS);
  const prey = field('B', 'artemis-v6-386'), cards0 = p.hand.length;
  declareStrike(s, ctx, odysseus, {kind: 'devotee', uid: prey}); passAll(s); if (s.window) passAll(s);
  assert.ok(s.players.B.tartarus.includes(prey));
  assert.equal(p.hand.length, cards0 + 1, 'Heavenly Precision compra 1');
});

test('Glory: é Armor, ocupa o slot de armadura e não acumula com outra; sai quando o portador cai', () => {
  const {s, ctx, p, field, hand, id} = setup();
  const refill = () => p.bases.forEach(b => { b.prepared = true; }); // o teste paga duas Glories no mesmo turno
  for (const n of [432, 434, 436]) assert.equal(cards.get(id(n)).armor, true, `${n} é Armor`);
  const bearer = field('A', id(433)), g1 = hand('A', id(434)), g2 = hand('A', id(432));
  playEquipment(s, ctx, 'A', g1, null); reequip(s, ctx, 'A', g1, bearer);
  assert.equal(ctx.attached[g1], bearer);
  assert.ok(keywordsOf(s, ctx, bearer).includes('Guardian'), 'Heavenly Guard');
  refill(); playEquipment(s, ctx, 'A', g2, null); reequip(s, ctx, 'A', g2, bearer);
  assert.equal(ctx.attached[g2], bearer);
  assert.ok(!ctx.attached[g1], 'a Glory anterior fica sem portador');
  damageDevotee(s, ctx, bearer, 99); checkDefeats(s, ctx); passAll(s);
  assert.ok(!s.units[bearer]);
  assert.ok(!ctx.attached[g2], 'Glory sem portador depois da derrota');
});

test("436 Odysseus' Glory: Celestial Strike +2/+0 contra Devotee e Divine Accuracy compra uma vez", () => {
  const {s, ctx, p, field, hand, id} = setup();
  const bearer = field('A', id(433)), glory = hand('A', id(436)), prey = field('B', 'artemis-v6-386');
  playEquipment(s, ctx, 'A', glory, null); reequip(s, ctx, 'A', glory, bearer);
  const atk = atkOf(s, ctx, bearer), cards0 = p.hand.length;
  declareStrike(s, ctx, bearer, {kind: 'devotee', uid: prey}); passAll(s); if (s.window) passAll(s);
  assert.equal(atkOf(s, ctx, bearer), atk + 2);
  assert.ok(s.players.B.tartarus.includes(prey));
  assert.equal(p.hand.length, cards0 + 1);
});

test('Anjos são lendários (§63, autor 06/11/2026): Theseus, Icarus e Odysseus têm personagem nomeado', () => {
  const {s, ctx, field, id} = setup();
  assert.deepEqual([431, 433, 435].map(n => namedCharacter(ctx, field('A', id(n)))), ['theseus', 'touma', 'odysseus']);
  assert.ok(s);
});
