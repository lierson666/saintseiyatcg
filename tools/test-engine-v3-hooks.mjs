// Ganchos novos do registro V6 (29/10/2026): survive, damagePrevented, wouldBeDefeated, cannotStrike, cannotPrepare,
// leaves, watchSpell (+ contra-mágica), activate de Domain e attach. Usa cartas de teste registradas no V6.
// node --test tools/test-engine-v3-hooks.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll, runCheckpoint, prepareUnit, endTurn} from '../playtest/engine-v3/core.js';
import {playSpell, activate, reequip} from '../playtest/engine-v3/play.js';
import {declareStrike, checkStrike} from '../playtest/engine-v3/strike.js';
import '../playtest/engine-v3/v6/hooks.js';
import {register} from '../playtest/engine-v3/v6/registry.js';
import {shield, save, forbidStrike, forbidPrepare, checkDefeats} from '../playtest/engine-v3/effects.js';
import * as k from '../playtest/engine-v3/v6/kit.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

// Cartas de teste: Devotee 3/4, Equipment (Armor) e duas Techniques.
const dev = (id, extra = {}) => cards.set(id, {id, name: id, kind: 'Devotee', type: 'Devotee — Warrior', cost: {amount: 1, unit: 'base'}, atk: 3, hp: 4, keywords: [], ...extra});
dev('t-dev'); dev('t-obs'); dev('t-obs2');
cards.set('t-gear', {id: 't-gear', name: 't-gear', kind: 'Equipment', type: 'Equipment — Armor', armor: true, cost: {amount: 1, unit: 'base'}, atk: 0, hp: 5, keywords: [], autoEquip: [], equip: {amount: 0}});
const tech = id => cards.set(id, {id, name: id, kind: 'Spell', type: 'Spell — Technique', cost: {amount: 1, unit: 'base'}, atk: 0, hp: 0, keywords: []});
tech('t-spell'); tech('t-spell2');

const log = [];
register({
  't-dev': {
    survive: (s, c, key, self, role, foe) => { log.push(['survive', self, role, foe]); },
    damagePrevented: (s, c, key, self, info) => { log.push(['prevented', self, info.prevented, info.full, info.role]); },
    leaves: (s, c, key, self, where) => st => { log.push(['leaves', self, where]); },
  },
  't-obs': {
    watchSurvive: (s, c, key, self, unit, role) => { log.push(['watchSurvive', unit, role]); },
    watchDamagePrevented: (s, c, key, self, unit, info) => { log.push(['watchPrevented', unit, info.prevented]); },
    watchLeaves: (s, c, key, self, left, where) => st => { log.push(['watchLeaves', left, where]); },
    // st === s: o ensaio do §56 (gatilho sem efeito não dispara) roda o corpo numa cópia; o log é só da resolução real.
    watchSpell: (s, c, key, self, caster, spellUid) => caster !== key && (st => { if (k.counterSpell(st, c, spellUid) && st === s) log.push(['countered', spellUid]); }),
  },
  // `seen`: o gatilho precisa ter efeito para disparar (§56); o log só na resolução real.
  't-obs2': {watchSpell: (s, c, key, self, caster, spellUid) => st => { st.seen = (st.seen || 0) + 1; if (st === s) log.push(['sawSpell', spellUid, k.spellOnChain(st, spellUid)]); }},
  't-gear': {
    gearSurvive: (s, c, key, self, bearer, role) => { log.push(['gearSurvive', bearer, role]); },
    gearDamagePrevented: (s, c, key, self, bearer, info) => { log.push(['gearPrevented', bearer, info.prevented]); },
    gearWouldBeDefeated: (s, c, key, self, bearer) => { if (!log.includes('gear-no')) { k.removeDamage(s, bearer); log.push(['gearSaved', bearer]); return true; } return false; },
    attach: (s, c, key, self, bearer) => st => { log.push(['attach', self, bearer]); },
  },
  't-spell': {spell: {targets: () => [], /* run com efeito fora do estado: sem ensaio */ run: () => { log.push(['spellRan']); }}},
  't-spell2': {spell: {targets: () => [], run: () => { log.push(['spell2Ran']); }}},
  't-domain': {activate: {name: 'Test Domain Power', cost: 1, once: true, tap: false, run: (s, c, key) => { log.push(['domainActivated', key]); }}},
});

function setup() {
  log.length = 0;
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  s.domains = {A: null, B: null};
  startTurn(s);
  p.bases = p.deck.splice(0, 10).map(uid => ({uid, prepared: true}));
  s.players.B.bases = s.players.B.deck.splice(0, 10).map(uid => ({uid, prepared: true}));
  ctx.decide = (player, q) => (q.options ? q.options[0] : true);
  let n = 0;
  const give = (key, id, zone = 'battlefield', bearer) => {
    const uid = `${key}:${id}:t${n++}`;
    m.objects[uid] = {owner: key, cardId: id, armor: id === 't-gear'};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    if (bearer) ctx.attached[uid] = bearer;
    return uid;
  };
  return {s, ctx, give};
}
const strike = (s, ctx, attacker, target) => { declareStrike(s, ctx, attacker, target); passAll(s); };
const has = name => log.filter(e => e[0] === name);

test('survive: atacante e defensor que continuam em campo, com papel e adversário; Equipment e observador', () => {
  const {s, ctx, give} = setup();
  const a = give('A', 't-dev'), b = give('B', 't-dev'), obs = give('A', 't-obs');
  give('A', 't-gear', 'battlefield', a);
  strike(s, ctx, a, {kind: 'devotee', uid: b});
  const sv = has('survive');
  assert.deepEqual(sv.find(e => e[1] === a), ['survive', a, 'attacker', b]);
  assert.deepEqual(sv.find(e => e[1] === b), ['survive', b, 'defender', a]);
  assert.deepEqual(has('gearSurvive'), [['gearSurvive', a, 'attacker']]);
  assert.equal(has('watchSurvive').length, 2);
  assert.ok(obs);
});

test('survive: quem morre no Strike não sobrevive; contra o God só o atacante sobrevive', () => {
  const {s, ctx, give} = setup();
  const a = give('A', 't-dev'), b = give('B', 't-dev');
  s.units[b].damage = 3; // 3 de ATK mata
  strike(s, ctx, a, {kind: 'devotee', uid: b});
  assert.deepEqual(has('survive').map(e => e[1]), [a]);
  const {s: s2, ctx: c2, give: g2} = setup();
  const a2 = g2('A', 't-dev');
  strike(s2, c2, a2, {kind: 'god', player: 'B'});
  assert.deepEqual(has('survive').map(e => [e[1], e[2], e[3]]), [[a2, 'attacker', null]]);
});

test('damagePrevented: escudo parcial e total, com info, Equipment e observador', () => {
  const {s, ctx, give} = setup();
  const a = give('A', 't-dev'), b = give('B', 't-dev'), obs = give('B', 't-obs');
  give('B', 't-gear', 'battlefield', b);
  shield(s, b, 2);
  strike(s, ctx, a, {kind: 'devotee', uid: b});
  assert.deepEqual(has('prevented'), [['prevented', b, 2, false, 'defender']]);
  assert.deepEqual(has('gearPrevented'), [['gearPrevented', b, 2]]);
  assert.deepEqual(has('watchPrevented'), [['watchPrevented', b, 2]]);
  assert.ok(obs);
  const {s: s2, ctx: c2, give: g2} = setup();
  const a2 = g2('A', 't-dev'), b2 = g2('B', 't-dev');
  shield(s2, b2, Infinity);
  strike(s2, c2, a2, {kind: 'devotee', uid: b2});
  assert.equal(has('prevented')[0][3], true);
  assert.equal(s2.units[b2].damage, 0);
});

test('damagePrevented: sem prevenção não dispara (Armor que absorve não é prevenção)', () => {
  const {s, ctx, give} = setup();
  const a = give('A', 't-dev'), b = give('B', 't-dev');
  strike(s, ctx, a, {kind: 'devotee', uid: b});
  assert.equal(has('prevented').length, 0);
});

test('wouldBeDefeated: gancho do Equipment substitui a derrota; sem ele o Devotee é destruído', () => {
  const {s, ctx, give} = setup();
  const b = give('B', 't-dev');
  const g = give('B', 't-gear', 'battlefield', b);
  s.units[b].damage = 9; // HP 4 + 5 da Armor (HP impresso soma ao portador)
  checkDefeats(s, ctx);
  assert.ok(s.players.B.battlefield.includes(b));
  assert.equal(s.units[b].damage, 0);
  assert.deepEqual(has('gearSaved'), [['gearSaved', b]]);
  log.push('gear-no'); // desliga o Equipment
  s.units[b].damage = 9; // HP 4 + 5 da Armor (HP impresso soma ao portador)
  checkDefeats(s, ctx);
  assert.ok(s.players.B.tartarus.includes(b));
  assert.ok(g);
});

test('wouldBeDefeated: save({anyDamage}) de Spell vale para dano que não é de Strike e é consumido', () => {
  const {s, ctx, give} = setup();
  const b = give('B', 't-dev');
  save(s, b, st => { st.units[b].damage = 3; }, {anyDamage: true});
  s.units[b].damage = 5;
  checkDefeats(s, ctx);
  assert.ok(s.players.B.battlefield.includes(b));
  assert.equal(s.units[b].damage, 3);
  s.units[b].damage = 5;
  checkDefeats(s, ctx);
  assert.ok(s.players.B.tartarus.includes(b)); // segundo uso: já foi consumido
});

test('cannotStrike: checkStrike recusa e a marca expira no fim do Round', () => {
  const {s, ctx, give} = setup();
  const a = give('A', 't-dev');
  forbidStrike(s, a);
  assert.throws(() => checkStrike(s, ctx, a, {kind: 'god', player: 'B'}), /não pode declarar Strike/);
  endTurn(s); passAll(s); // fim do 1º turno do Round
  s.active = 'B'; s.turnInRound = 1; endTurn(s); passAll(s); // fim do Round
  assert.equal(s.effects.some(e => e.kind === 'noStrike'), false);
});

test('cannotPrepare: prepareUnit não prepara (e não gasta Seal) enquanto a marca vale', () => {
  const {s, ctx, give} = setup();
  const a = give('A', 't-dev');
  s.units[a].prepared = false; s.units[a].seal = 1;
  forbidPrepare(s, a);
  assert.equal(prepareUnit(s, a), false);
  assert.equal(s.units[a].prepared, false);
  assert.equal(s.units[a].seal, 1);
  s.effects = s.effects.filter(e => e.kind !== 'noPrepare');
  assert.equal(prepareUnit(s, a), false); // agora o Seal é gasto
  assert.equal(s.units[a].seal, 0);
  assert.equal(prepareUnit(s, a), true);
});

test('leaves: destruição, retorno à mão e exílio disparam o gancho com o destino', () => {
  const {s, ctx, give} = setup();
  const d = give('A', 't-dev'), h = give('A', 't-dev'), x = give('B', 't-dev'), obs = give('A', 't-obs');
  s.units[d].damage = 4; checkDefeats(s, ctx); passAll(s);
  k.toHand(s, ctx, h, 'battlefield'); passAll(s);
  k.exile(s, ctx, x); passAll(s);
  assert.deepEqual(has('leaves').map(e => [e[1], e[2]]), [[d, 'tartarus'], [h, 'hand'], [x, 'void']]);
  assert.deepEqual(has('watchLeaves').map(e => e[2]), ['tartarus', 'hand', 'void']);
  assert.ok(obs);
});

test('leaves: sacrifício conta como saída', () => {
  const {s, ctx, give} = setup();
  const d = give('A', 't-dev');
  k.sacrifice(s, ctx, d); passAll(s);
  assert.deepEqual(has('leaves').map(e => e[2]), ['tartarus']);
});

test('watchSpell: sem observador a Technique resolve após os passes; com contra-mágica sai da cadeia sem efeito', () => {
  const { s, ctx, give } = setup();
  const sp = give('A', 't-spell', 'hand');
  playSpell(s, ctx, 'A', sp);
  assert.ok(s.window);
  passAll(s);
  assert.equal(has('spellRan').length, 1);
  assert.equal(s.window, null);
  const {s: s2, ctx: c2, give: g2} = setup();
  g2('B', 't-obs');
  const sp2 = g2('A', 't-spell', 'hand');
  playSpell(s2, c2, 'A', sp2);
  assert.equal(has('spellRan').length, 0); // na cadeia, esperando resposta
  assert.ok(s2.chain.some(i => i.uid === sp2));
  assert.ok(k.spellOnChain(s2, sp2));
  passAll(s2); // o gatilho do observador resolve primeiro e contraria
  assert.equal(has('spellRan').length, 0);
  assert.deepEqual(has('countered'), [['countered', sp2]]);
  assert.ok(s2.players.A.tartarus.includes(sp2));
  assert.equal(s2.players.A.stack.length, 0);
  assert.equal(s2.window, null);
});

test('watchSpell: observador que não contraria deixa a Spell resolver depois dos gatilhos', () => {
  const {s, ctx, give} = setup();
  give('A', 't-obs2'); // reage a qualquer Spell, inclusive a própria ("when you cast")
  const sp = give('A', 't-spell2', 'hand');
  playSpell(s, ctx, 'A', sp);
  assert.equal(has('spell2Ran').length, 0);
  passAll(s);
  assert.deepEqual(has('sawSpell'), [['sawSpell', sp, true]]); // o gatilho resolve antes, com a Spell ainda na cadeia
  assert.equal(has('spell2Ran').length, 1);
  assert.ok(s.players.A.tartarus.includes(sp));
});

test('Domain: activate em domain:${key} usa a habilidade do Domain, uma vez por Round', () => {
  const {s, ctx} = setup();
  s.domains.A = 't-domain';
  const before = s.players.A.bases.filter(b => b.prepared).length;
  activate(s, ctx, 'A', 'domain:A'); passAll(s); // guia §56: resolve a pilha
  assert.deepEqual(has('domainActivated'), [['domainActivated', 'A']]);
  assert.equal(s.players.A.bases.filter(b => b.prepared).length, before - 1);
  assert.throws(() => activate(s, ctx, 'A', 'domain:A'), /já foi usada/);
  assert.throws(() => activate(s, ctx, 'A', 'domain:B'), /Domain/);
});

test('attach: Equipment equipado depois (reequip) dispara o gancho com o portador', () => {
  const {s, ctx, give} = setup();
  const b = give('A', 't-dev'), g = give('A', 't-gear');
  reequip(s, ctx, 'A', g, b); passAll(s);
  assert.deepEqual(has('attach'), [['attach', g, b]]);
});
