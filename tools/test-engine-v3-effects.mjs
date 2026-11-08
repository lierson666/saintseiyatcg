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
const [rush, fortress] = read('./fixtures/decks-proposta-d171.json').decks;

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

test('077 Shiryu\'s Sacrificed Sight: +2/+2 e Pierce em Shiryu; no fim do Round fica Unprepared e não prepara no próximo início', () => {
  const {s, ctx, field, cast, end} = setup({A: fortress, B: rush});
  const shiryu = field('A', '003');
  cast('A', '077', {target: shiryu});
  // HP 8 = 5 impresso + 2 da Spell + 1 do Domain 064 (Guardian) do deck de Shiryu.
  assert.deepEqual([atkOf(s, ctx, shiryu), hpOf(s, ctx, shiryu), keywordsOf(s, ctx, shiryu).includes('Pierce')], [4, 8, true]);
  end(); startTurn(s); end();
  assert.deepEqual([s.units[shiryu].prepared, atkOf(s, ctx, shiryu)], [false, 2]);
  startTurn(s);
  assert.equal(s.units[shiryu].prepared, false, 'não prepara neste início');
  end(); startTurn(s); end(); startTurn(s);
  assert.equal(s.units[shiryu].prepared, true);
});

// Ex-Miracle, agora Technique (guia, autor 31/10/2026): não responde ao Strike; no próprio turno, paga Base e protege o God.
test('081 The Testament of Aiolos: "both" só com Pegasus Seiya', () => {
  const {s, ctx, field, cast} = setup();
  const jabu = field('A', '028');
  assert.throws(() => cast('A', '081', {mode: 'both', target: jabu}), /Pegasus Seiya/);
  field('A', '001');
  cast('A', '081', {mode: 'both', target: jabu});
  assert.deepEqual([atkOf(s, ctx, jabu), hpOf(s, ctx, jabu), s.effects.find(e => e.target === 'god:A').amount], [4, 4, 5]);
});

test('088 The Eighth Sense: +3/+3 e salva de ser derrotado por Strike; não prepara mais (31/10/2026)', () => {
  const {s, ctx, field, cast, strike} = setup();
  const seiya = field('A', '001');
  s.units[seiya].prepared = false;
  s.players.A.soul = 10;
  cast('A', '088', {target: seiya, prepare: true});
  assert.deepEqual([atkOf(s, ctx, seiya), hpOf(s, ctx, seiya), s.units[seiya].prepared], [6, 7, false], '+1 do Miracle: Soul 10 < 20');
  s.units[seiya].prepared = true;
  s.units[seiya].damage = 6;
  strike(seiya, {kind: 'devotee', uid: field('B', '043')}); // retaliação 1 derrotaria Seiya (HP 7, dano 6)
  assert.deepEqual([s.players.A.battlefield.includes(seiya), s.units[seiya].damage], [true, 6], 'a retaliação que derrotaria foi prevenida');
  s.units[seiya].prepared = true;
  assert.throws(() => declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'}), /D22|outro Strike/);
});

test('054: salvamento (076 virou Ephemerate em 08/11/2026)', () => {
  const {s, ctx, field, cast, strike} = setup({A: rush, B: fortress}, (player, q) => q.prepare);
  const seiya = field('A', '001'), jabu = field('A', '028');
  cast('A', '054', {target: jabu});
  s.units[jabu].damage = 1;
  strike(jabu, {kind: 'devotee', uid: field('B', '043')}); // retaliação 1 derrotaria Jabu (HP 2, dano 1)
  assert.ok(s.players.A.battlefield.includes(jabu));
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

test('087 Divine Salvation (Teferi\'s Protection, 08/11/2026): Soul travado e Saints não derrotados até a sua próxima rodada', () => {
  const {s, ctx, field, cast, end, strike} = setup();
  const seiya = field('A', '001');
  s.players.A.soul = 5;
  cast('A', '087', {});
  s.units[seiya].damage = 99;
  end();
  const acolyte = field('B', '043');
  startTurn(s);
  strike(acolyte, {kind: 'god', player: 'A'});
  assert.equal(s.players.A.soul, 5, 'Soul travado na rodada do oponente');
  assert.ok(s.units[seiya], 'não é derrotado por dano');
});

test('estáticas: Seika com Seiya, Shunrei com Shiryu (Tatsumi virou Drannith Magistrate em 08/11/2026)', () => {
  const {s, ctx, field} = setup();
  const seika = field('A', '036');
  assert.equal(hpOf(s, ctx, seika), 2);
  field('A', '001');
  assert.equal(hpOf(s, ctx, seika), 4);
  const t = setup({A: fortress, B: rush});
  const shunrei = t.field('A', '037');
  assert.equal(hpOf(t.s, t.ctx, shunrei), 3);
  t.field('A', '003');
  assert.equal(hpOf(t.s, t.ctx, shunrei), 4);
});

test('Dragon Shield (003/004) previne 1 uma vez por Round e não acumula', () => {
  const {s, ctx, field, equip, strike, end} = setup({A: fortress, B: rush});
  const shiryu = field('A', '003');
  const cloth = equip('A', '004', shiryu); // Armor HP 5 (soma ao portador) com Dragon Shield
  const seiya = field('B', '001'); s.units[seiya].training = 1; // 3/5: retaliação 3 (God não retalia mais, 01/11/2026)
  strike(shiryu, {kind: 'devotee', uid: seiya});
  assert.deepEqual([s.units[cloth]?.damage ?? 0, s.units[shiryu].damage], [0, 2], 'retaliação 3 menos 1, toda no portador');
  assert.equal(s.units[cloth]?.damage ?? 0, 0, 'a Armor não tem dano próprio');
});

test('opcionais pagos: Prayer of Rozan (1 Latent), Crystal Wall (2 Latent, também no God); Cassios não previne mais (08/11/2026)', () => {
  const asked = [];
  const yes = (player, q) => { asked.push(q.ability); return true; };
  const {s, ctx, field, strike, end} = setup({A: rush, B: fortress}, yes);
  const marin = field('A', '021'); // Nimble: ignora Guardian (G3-038: Guardian protege mesmo Unprepared)
  const shunrei = field('B', '037'), mu = field('B', '011'), cassios = field('B', '027'), shiryu = field('B', '003');
  s.units[shunrei].prepared = s.units[mu].prepared = s.units[cassios].prepared = false;
  s.units[shiryu].prepared = false;
  s.players.B.latent = 3;
  strike(marin, {kind: 'god', player: 'B'});
  assert.deepEqual([s.players.B.soul, s.players.B.latent, asked], [20, 1, ['Crystal Wall']], 'Crystal Wall previne os 2 no God');
  const jabu = field('A', '028'); // ATK 2 + Unicorn Gallop 1 contra Shiryu: Dragon Shield 1, Prayer 1, o resto passa
  strike(jabu, {kind: 'devotee', uid: shiryu});
  assert.deepEqual(asked, ['Crystal Wall', 'Prayer of Rozan']);
  // Latent 1: Prayer gastou o último, e Shiryu (Athena Devotee) defendeu e sobreviveu: Cosmo of Hope do God Athena (D225).
  assert.deepEqual([s.units[shiryu].damage, s.players.B.latent, s.players.B.tartarus.includes(cassios)], [1, 1, false]);
  checkInvariants(s, ctx.objects);
});

test('Unicorn Gallop (028): +1 ATK só durante o Strike contra Devotee; Rising Dragon (003): +1 ATK ao sobreviver como defensor', () => {
  const {s, ctx, field, strike} = setup();
  const jabu = field('A', '028'), shiryu = field('B', '003');
  strike(jabu, {kind: 'devotee', uid: shiryu});
  assert.deepEqual([s.units[shiryu].damage, atkOf(s, ctx, jabu)], [2, 2], '3 de dano menos Dragon Shield 1');
  assert.equal(atkOf(s, ctx, shiryu), 3, 'Rising Dragon');
});

test('Domain 064 The Five Old Peaks: Saint amigo com Guardian ganha +0/+1; sem o Domain, não', () => {
  const {s, ctx, field} = setup({A: fortress, B: rush});
  const shiryu = field('A', '003');
  assert.equal(s.domains.A, 'athena-v6-064');
  assert.deepEqual([atkOf(s, ctx, shiryu), hpOf(s, ctx, shiryu)], [2, 6]);
  s.domains.A = 'athena-v6-062';
  assert.equal(hpOf(s, ctx, shiryu), 5);
});

test('Domain 062 Galaxian Wars Arena: Bronze Saint atacante derrota Devotee inimigo e ganha +1 ATK no Round, uma vez por Round', () => {
  const {s, ctx, field, strike} = setup({A: rush, B: fortress}, () => true);
  assert.equal(s.domains.A, 'athena-v6-062');
  const seiya = field('A', '001'), [one, two] = [field('B', '003'), field('B', '003')];
  for (const uid of [one, two]) s.units[uid].damage = hpOf(s, ctx, uid) - 1;
  const atk0 = atkOf(s, ctx, seiya), hand = s.players.A.hand.length;
  strike(seiya, {kind: 'devotee', uid: one}); passAll(s);
  assert.equal(s.units[one], undefined, 'alvo derrotado');
  assert.equal(atkOf(s, ctx, seiya), atk0 + 1, 'Tournament Spirit: +1 ATK');
  assert.equal(s.players.A.hand.length, hand, 'sem compra');
  const jabu = field('A', '028'), jabu0 = atkOf(s, ctx, jabu);
  strike(jabu, {kind: 'devotee', uid: two}); passAll(s); // outro Bronze (Jabu): nomes únicos no campo
  assert.equal(atkOf(s, ctx, jabu), jabu0, 'segunda derrota no mesmo Round não dispara');
});

test('Domain 062 Tournament Spirit: Bronze Saint defensor que derrota o atacante na retaliação também ganha +1 ATK (guia §63)', () => {
  const {s, ctx, field, strike} = setup({A: fortress, B: rush}, () => true);
  const shiryu = field('A', '003'), seiya = field('B', '001');
  s.units[shiryu].damage = hpOf(s, ctx, shiryu) - 1; // Seiya defende e derrota Shiryu na retaliação
  const atk0 = atkOf(s, ctx, seiya);
  strike(shiryu, {kind: 'devotee', uid: seiya}); passAll(s);
  assert.equal(s.units[shiryu], undefined, 'atacante derrotado');
  assert.equal(atkOf(s, ctx, seiya), atk0 + 1, 'retaliação ativa Tournament Spirit');
});
