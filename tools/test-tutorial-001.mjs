// Fase 1 do Tutorial 001: roda a linha didática (data/tutorial/tutorial-001.json) no engine-v3 real, com as decklists sem alteração.
// Toda ação passa por applyAction; nenhuma carta, Soul ou Cosmo é criado. node tools/test-tutorial-001.mjs [-v]
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {catalog} from './simulate-v3.mjs';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn} from '../playtest/engine-v3/core.js';
import {runDecisions, resume} from '../playtest/engine-v3/decision.js';
import {applyAction, advance} from '../playtest/engine-v3/actions.js';
import {atkOf, hpOf} from '../playtest/engine-v3/effects.js';

const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const verbose = process.argv.includes('-v'), T = read('data/tutorial/tutorial-001.json');
const all = ['decks-proposta-d171', 'decks-preview'].flatMap(f => read(`data/alpha-0.1/${f}.json`).decks), deck = id => all.find(d => d.id === id);
const {cards, index} = catalog();
const match = createMatch({cards, canonIndex: index, decks: {A: deck(T.decks.A), B: deck(T.decks.B)}, gods: T.gods, seed: 1, first: 'A'});
const s = match.state, ctx = {cards, objects: match.objects, attached: match.attached};

for (const k of ['A', 'B']) {  // embaralhamento preparado: só reordena as cartas que já são do deck
  const p = s.players[k], {mao, compras} = T.preparo[k], pile = [...p.hand, ...p.deck], before = [...pile].sort();
  for (const u of [...mao, ...compras]) assert(pile.includes(u), `${u} não está no deck legal`);
  p.hand = [...mao]; p.deck = [...compras, ...pile.filter(u => !mao.includes(u) && !compras.includes(u))];
  assert.deepEqual([...p.hand, ...p.deck].sort(), before);
}
s.setup = null; startTurn(s);

let waterPrison = false, respond = null;
const answer = q => {
  if (verbose) console.log('   ? ', JSON.stringify({...q, options: q.options?.slice(0, 5)}).slice(0, 220));
  if (q.ability === 'WATER PRISON') return waterPrison;
  if (q.kind === 'optional') return false;
  return q.options?.[0];
};
function exec(action) {
  const run = () => { applyAction(match, ctx, action); advance(match, key => !(respond && respond.key === key)); };
  let r = runDecisions(s, ctx, run);
  for (let i = 0; r.pending && i < 40; i++) r = resume(s, ctx, run, r, {value: answer(r.pending.pending ?? r.pending)});
  assert(!r.pending, 'decisão sem resposta');
}
const passAll = () => { for (let i = 0; s.window && !s.victory && i < 40; i++) exec({type: 'pass', key: s.window.priority}); };
const line = st => `R${s.turn} ativo ${s.active} | A alma ${s.players.A.soul} bases ${s.players.A.bases.length} lat ${s.players.A.latent} mão ${s.players.A.hand.length} | B alma ${s.players.B.soul} bases ${s.players.B.bases.length} lat ${s.players.B.latent} | campo ${['A', 'B'].map(k => s.players[k].battlefield.map(u => `${u}(${atkOf(s, ctx, u)}/${hpOf(s, ctx, u)} d${s.units[u]?.damage})`).join(' ')).join(' || ')}`;

const done = [];
for (const step of T.linha) {
  waterPrison = !!step.waterPrison; respond = step.resposta?.a || null;
  exec(step.a);
  if (step.resposta) {
    for (let i = 0; s.window?.priority !== respond.key && s.window && i < 10; i++) exec({type: 'pass', key: s.window.priority});
    assert.equal(s.window?.priority, respond.key, 'jogador sem prioridade para responder');
    const r = respond; respond = null; exec(r); done.push(step.resposta.licao);
  }
  respond = null; passAll();
  assert(!s.victory, `partida terminou cedo: ${JSON.stringify(s.victory)}`);
  if (step.licao) done.push(step.licao);
  if (verbose) console.log(JSON.stringify(step.a).slice(0, 80), '\n  ', line());
}
const P = s.players, seiya = 'A:001:1';
assert(P.A.battlefield.includes(seiya), 'Seiya precisa sobreviver até a prova');
assert(!P.B.battlefield.includes('B:107:1') && P.B.tartarus.includes('B:107:1'), 'combate: Spearman derrotado');
assert(P.B.tartarus.includes('B:106:1'), 'Technique + Strike derrotam o Guardian');
assert(P.A.battlefield.includes('A:028:1'), 'truque de combate salva Jabu');
assert.equal(s.units['B:108:1'].damage, 2, 'Jabu revida Vanguard');
for (const u of ['A:027:1', 'A:001:1', 'A:028:1']) assert(P.A.battlefield.includes(u), `${u} deve seguir em campo`);
assert(s.events.some(e => e.type === 'divine_power' && e.ability === 'WATER PRISON'), 'Water Prison operacional');
assert(s.units[seiya].seals > 0 || s.events.some(e => e.type === 'sealed' || e.type === 'seal_added'), 'Seiya selado');
console.log('ok', done.join(', '), '\n', line());
if (process.argv.includes('--events')) { const seen = new Set(); for (const e of s.events) if (!seen.has(e.type)) { seen.add(e.type); console.log(JSON.stringify(e).slice(0, 170)); } const bad = []; const walk = (v, p) => { if (typeof v === 'function') bad.push(p); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v instanceof Map ? Object.fromEntries(v) : v instanceof Set ? {...[...v]} : v)) walk(x, `${p}.${k}`); }; walk(s, 's'); walk(ctx.attached, 'att'); walk(ctx.objects, 'obj'); console.log('funcoes', bad.slice(0, 12), JSON.stringify(s.events).length); }
