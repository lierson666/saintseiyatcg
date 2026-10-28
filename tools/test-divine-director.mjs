// Orquestrador da Divine Arena: toca a fila inteira sem WebGL, mostra só números dos eventos e respeita o skip.
// node --test tools/test-divine-director.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch, mulligan} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll} from '../playtest/engine-v3/core.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {playDevotee} from '../playtest/engine-v3/play.js';
import {createDirector, SIGNATURES} from '../playtest/divine/director.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

// Mesma partida do teste de eventos: Seiya (001, assinatura) bate no God B.
function scriptedMatch() {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, first: 'A', seed: 3});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached};
  mulligan(m, 'A', []); mulligan(m, 'B', []);
  startTurn(s);
  const seiya = Object.keys(m.objects).find(u => u.startsWith('A:001:'));
  for (const p of Object.values(s.players)) for (const z of ['deck', 'hand']) { const i = p[z].indexOf(seiya); if (i >= 0) p[z].splice(i, 1); }
  s.players.A.hand.push(seiya);
  s.players.A.bases = s.players.A.deck.splice(0, 3).map(uid => ({uid, prepared: true}));
  playDevotee(s, ctx, 'A', seiya);
  for (let i = 0; i < 2; i++) { endTurn(s); passAll(s); startTurn(s); }
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'});
  passAll(s);
  return {m, s};
}

function fakeUi(m) {
  const calls = [], rect = {left: 0, top: 0, width: 10, height: 10};
  const log = name => (...args) => { calls.push([name, ...args]); };
  return {calls, ui: {
    number: uid => m.objects[uid].cardId.slice(-3), type: uid => cards.get(m.objects[uid].cardId).type, isViewer: () => true,
    rect: () => rect, godRect: () => rect, deckRect: () => rect, handRect: () => rect, fieldRect: () => rect, bankRect: () => rect,
    center: r => (r ? {x: 5, y: 5} : null),
    float: log('float'), setSoul: log('setSoul'), spendOrbs: log('spendOrbs'), pulse: log('pulse'), aim: log('aim'), shake: log('shake'), log: log('log'),
    banner: async (...a) => { calls.push(['banner', ...a]); }, callout: async (...a) => { calls.push(['callout', ...a]); },
    flyCard: async (...a) => { calls.push(['flyCard', ...a]); },
  }};
}

test('toca todos os eventos sem WebGL; Soul e dano exibidos vêm dos eventos', async () => {
  const {m, s} = scriptedMatch(), {ui, calls} = fakeUi(m);
  const director = createDirector({ui, getFx: () => null, settings: {speed: 'fast', shake: 1, reduceMotion: false, skipDraws: true}});
  director.skip(); // tempos zerados: o teste mede a fila, não o relógio
  await director.play(s.events);
  assert.equal(director.busy, false);
  const soul = s.events.filter(e => e.type === 'soul_lost');
  assert.ok(soul.length, 'a partida roteirizada perde Soul');
  assert.deepEqual(calls.filter(c => c[0] === 'setSoul').map(c => [c[1], c[2]]), soul.map(e => [e.player, e.soul]));
  assert.ok(calls.some(c => c[0] === 'float' && c[2] === `-${soul[0].amount} Soul`));
});

test('assinatura de Pegasus (001) mostra o callout com o nome do golpe, só visual', async () => {
  const {m, s} = scriptedMatch(), {ui, calls} = fakeUi(m);
  const director = createDirector({ui, getFx: () => null, settings: {speed: 'normal', shake: 0, reduceMotion: true, skipDraws: true}});
  const strike = s.events.filter(e => e.type === 'strike_resolve');
  const t0 = Date.now();
  await director.play(strike);
  assert.ok(calls.some(c => c[0] === 'callout' && c[1] === SIGNATURES['001'].name));
  assert.ok(Date.now() - t0 < 3000, 'sem WebGL a fila não espera por VFX');
});

test('skip durante a fila termina tudo e libera a entrada', async () => {
  const {m, s} = scriptedMatch(), {ui} = fakeUi(m);
  const director = createDirector({ui, getFx: () => null, settings: {speed: 'cinematic', shake: 1, reduceMotion: false, skipDraws: false}});
  const done = director.play(s.events);
  assert.equal(director.busy, true);
  director.skip();
  await done;
  assert.equal(director.busy, false);
});
