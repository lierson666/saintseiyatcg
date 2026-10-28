// Decisões complementares G3-029 (identidade de personagem), G3-030 (escolha obrigatória no timeout) e
// G3-031 (relógio fora do próprio turno). docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md.
// node --test tools/test-engine-v3-g3-complement.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {characterOf, IdentityGap, CHARACTER_IDENTITY} from '../shared/character-identity.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, openWindow} from '../playtest/engine-v3/core.js';
import {ultimateBlock} from '../playtest/engine-v3/gods.js';
import {createClock, clockStartTurn, clockEndTurn, clockRemaining, clockHandTo, clockPause, clockResume, clockIdle, clockExpired, timeoutAction, timeoutAutoChoice, stableOrder} from '../playtest/engine-v3/clock.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

// ---------- G3-029 ----------
// FIXTURE: 'fixture-pegasus-seiya-v1' é uma reimpressão fictícia de Seiya (arte/subtítulo diferentes), só para o teste.
const REPRINT = 'fixture-pegasus-seiya-v1';
const withReprint = new Map([...cards, [REPRINT, {...cards.get('athena-v6-001'), id: REPRINT, name: 'PEGASUS SEIYA, THE FIRST BATTLE'}]]);
function exclamation(ids, identities) {
  const m = createMatch({cards: withReprint, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, first: 'A', seed: 3});
  m.state.setup = null;
  const s = m.state, ctx = {cards: withReprint, objects: m.objects, attached: m.attached, identities};
  startTurn(s);
  s.players.A.bases.push(...Array.from({length: 14}, (_, i) => ({uid: `base:${i}`, prepared: true})));
  const saints = ids.map((cardId, i) => {
    const uid = `A:fx:${i}`;
    ctx.objects[uid] = {owner: 'A', cardId};
    s.players.A.battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0};
    return uid;
  });
  return ultimateBlock(s, ctx, 'A', saints);
}

test('G3-029: Seiya, Shiryu e Hyoga são identidades distintas; dois Seiya não', () => {
  assert.equal(exclamation(['athena-v6-001', 'athena-v6-003', 'athena-v6-005']), null);
  assert.equal(exclamation(['athena-v6-001', 'athena-v6-001', 'athena-v6-005']), 'saints');
});

test('G3-029: reimpressão (outro ID, outro nome impresso) mantém a identidade; sem mapeamento, é lacuna sinalizada', () => {
  assert.equal(characterOf(REPRINT, {[REPRINT]: 'seiya'}), characterOf('athena-v6-001'));
  assert.equal(exclamation(['athena-v6-001', REPRINT, 'athena-v6-005'], {[REPRINT]: 'seiya'}), 'saints', 'Seiya V1 + Seiya V2 = mesma identidade');
  assert.equal(exclamation(['athena-v6-001', REPRINT, 'athena-v6-005']), 'identity', 'sem mapeamento aprovado: lacuna, não palpite');
});

test('G3-029: personagens distintos não se fundem; genéricos e cartas fora da tabela são lacuna', () => {
  const named = Object.values(CHARACTER_IDENTITY).filter(Boolean);
  assert.equal(new Set(named).size, named.length, 'cada personagem aparece uma vez no catálogo V6');
  const devotees = canon.cards.filter(c => c.type.startsWith('Devotee')).map(c => c.id.toLowerCase());
  assert.deepEqual(Object.keys(CHARACTER_IDENTITY).sort(), devotees.sort(), 'a tabela cobre todos os Devotees do D268');
  assert.notEqual(characterOf('athena-v6-028'), characterOf('athena-v6-001'), 'Unicorn Jabu ≠ Pegasus Seiya');
  assert.throws(() => characterOf('athena-v6-040'), IdentityGap, 'Sanctuary Guard: genérico');
  assert.throws(() => characterOf('poseidon-v6-091'), IdentityGap, 'Kanon: carta PARCIAL, fora da tabela');
});

// ---------- G3-030 ----------
const fakeState = () => ({round: 1, turn: 1, events: []});

test('G3-030: escolhe o menor id estável (ordem natural) e é repetível com qualquer ordem de entrada', () => {
  const options = ['A:001:10', 'A:001:2', 'B:003:1', 'A:028:1'];
  const a = timeoutAutoChoice(fakeState(), {player: 'A', options});
  const b = timeoutAutoChoice(fakeState(), {player: 'A', options: [...options].reverse()});
  assert.deepEqual(a, ['A:001:2']);
  assert.deepEqual(a, b);
  assert.ok(stableOrder('A:001:2', 'A:001:10') < 0);
});

test('G3-030: escolha múltipla repete sobre as restantes revalidando a legalidade a cada passo', () => {
  // Legalidade que depende do já escolhido: no máximo uma carta de cada número.
  const legal = (o, picked) => !picked.some(p => p.split(':')[1] === o.split(':')[1]);
  const picked = timeoutAutoChoice(fakeState(), {player: 'A', options: ['A:001:1', 'A:001:2', 'A:003:1', 'A:005:1'], count: 3, legal});
  assert.deepEqual(picked, ['A:001:1', 'A:003:1', 'A:005:1']);
});

test('G3-030: objetos removidos e escolhas inválidas ficam de fora; faltando opção, escolhe só o que existe', () => {
  const zone = new Set(['A:003:1', 'A:009:1']); // A:001:1 saiu do campo
  const picked = timeoutAutoChoice(fakeState(), {player: 'A', options: ['A:001:1', 'A:003:1', 'A:009:1'], count: 3, legal: o => zone.has(o)});
  assert.deepEqual(picked, ['A:003:1', 'A:009:1']);
  assert.deepEqual(timeoutAutoChoice(fakeState(), {player: 'A', options: ['A:001:1'], legal: () => false}), []);
});

test('G3-030: registra TIMEOUT_AUTO_CHOICE com opções elegíveis, critério e resultado; replay dá o mesmo registro', () => {
  const run = () => { const s = fakeState(); timeoutAutoChoice(s, {player: 'B', options: ['B:010:1', 'B:002:1'], count: 1}); return s.events; };
  const [e] = run();
  assert.equal(e.type, 'TIMEOUT_AUTO_CHOICE');
  assert.deepEqual([e.player, e.eligible, e.result], ['B', ['B:002:1', 'B:010:1'], ['B:002:1']]);
  assert.match(e.criterion, /menor id estável/);
  assert.deepEqual(run(), run(), 'reconexão/replay: mesmo histórico, mesmo resultado');
  assert.equal(timeoutAction({window: null}, {optional: false}), 'TIMEOUT_AUTO_CHOICE');
});

// ---------- G3-031 ----------
test('G3-031: resposta no turno adversário gasta só a reserva; o básico do ativo não corre; o próximo básico vem cheio', () => {
  const c = createClock(['A', 'B']);
  clockStartTurn(c, 'A', 0);
  clockHandTo(c, 'B', 10); // B responde por 20 s
  clockHandTo(c, 'A', 30);
  assert.deepEqual(clockRemaining(c, 'B', 30), {basic: 0, reserve: 70, total: 70});
  assert.equal(clockRemaining(c, 'A', 30).basic, 50, 'A gastou só os 10 s em que decidia');
  clockEndTurn(c, 'A', 40);
  clockStartTurn(c, 'B', 40);
  assert.equal(clockRemaining(c, 'B', 40).basic, 60, 'responder antes não reduz o básico do turno seguinte');
});

test('G3-031: vários gatilhos na mesma janela gastam a reserva de forma acumulada', () => {
  const c = createClock(['A', 'B']);
  clockStartTurn(c, 'A', 0);
  for (const [from, to] of [[0, 15], [20, 45], [50, 60]]) { clockHandTo(c, 'B', from); clockHandTo(c, 'A', to); }
  assert.equal(clockRemaining(c, 'B', 60).reserve, 90 - 15 - 25 - 10);
});

test('G3-031: reserva esgotada fora do turno → timeout homologado (passar prioridade)', () => {
  const c = createClock(['A', 'B']), s = {window: null};
  clockStartTurn(c, 'A', 0);
  clockHandTo(c, 'B', 0);
  assert.equal(clockExpired(c, 89), null);
  assert.equal(clockExpired(c, 90), 'B');
  openWindow(Object.assign(s, {order: ['A', 'B'], active: 'A', events: [], round: 1, turn: 1}));
  assert.equal(timeoutAction(s), 'TIMEOUT_PASS_PRIORITY');
});

test('G3-031: sem decisão atribuída e em cinemática, ninguém gasta tempo; END TURN e virada de Round mantêm teto 180', () => {
  const c = createClock(['A', 'B']);
  clockStartTurn(c, 'A', 0);
  clockIdle(c, 5);
  assert.deepEqual(clockRemaining(c, 'A', 500).basic, 55);
  clockHandTo(c, 'A', 500);
  clockPause(c, 500); clockResume(c, 900); // cinemática
  assert.equal(clockRemaining(c, 'A', 900).basic, 55);
  c.players.A.reserve = 170;
  assert.equal(clockEndTurn(c, 'A', 900), 10, 'crédito limitado pelo teto');
  clockStartTurn(c, 'B', 900); clockEndTurn(c, 'B', 960);
  clockStartTurn(c, 'A', 960); // novo Round
  assert.deepEqual(clockRemaining(c, 'A', 960), {basic: 60, reserve: 180, total: 240});
});
