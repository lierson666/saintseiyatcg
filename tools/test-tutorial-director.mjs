// Fase 2 do Tutorial 001: o Director conduz a partida inteira no engine-v3 real. node tools/test-tutorial-director.mjs
// Alma é alterada só nos cenários de vitória e derrota precoce, dentro do teste, para chegar rápido ao fim.
import {readFileSync, existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {catalog} from './simulate-v3.mjs';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn} from '../playtest/engine-v3/core.js';
import {runDecisions, resume, snapshot, restore} from '../playtest/engine-v3/decision.js';
import {applyAction, advance} from '../playtest/engine-v3/actions.js';
import {createDirector, encodeSave, decodeSave, rivalRounds, tokenCards, restoreTokens} from '../playtest/divine/tutorial-director.js';

const url = p => new URL(`../${p}`, import.meta.url), read = p => JSON.parse(readFileSync(url(p)));
const T = read('data/tutorial/tutorial-001.json'), L = read('data/tutorial/tutorial-001.dialogues.json');
const all = ['decks-proposta-d171', 'decks-preview'].flatMap(f => read(`data/alpha-0.1/${f}.json`).decks), deck = id => all.find(d => d.id === id);
const {cards, index} = catalog();

function game(saved) {
  const match = createMatch({cards, canonIndex: index, decks: {A: deck(T.decks.A), B: deck(T.decks.B)}, gods: T.gods, seed: 1, first: 'A'});
  const s = match.state, ctx = {cards, objects: match.objects, attached: match.attached};
  for (const k of ['A', 'B']) { const p = s.players[k], {mao, compras} = T.preparo[k], rest = [...p.hand, ...p.deck].filter(u => !mao.includes(u) && !compras.includes(u)); p.hand = [...mao]; p.deck = [...compras, ...rest]; }
  s.setup = null;
  if (saved) restore(s, ctx, saved.match); else startTurn(s);
  const g = {match, s, ctx, entered: [], respondTo: false};
  g.d = createDirector({script: T, S: () => s, saved: saved?.director, onEnter: st => g.entered.push(st.id)});
  g.exec = action => {
    const run = () => { applyAction(match, ctx, action); advance(match, key => !(g.respondTo && key === 'A')); };
    let r = runDecisions(s, ctx, run);
    for (let i = 0; r.pending && i < 40; i++) { const q = r.pending.pending ?? r.pending, a = g.d.answer(q); r = resume(s, ctx, run, r, {value: a ?? (q.kind === 'optional' ? false : q.options?.[0])}); }
    assert(!r.pending, 'decisão sem resposta');
  };
  g.passAll = () => { for (let i = 0; s.window && !s.victory && i < 40; i++) g.exec({type: 'pass', key: s.window.priority}); };
  g.save = () => decodeSave(encodeSave({director: g.d.save(), match: snapshot(s, ctx)}));
  return g;
}
const fromLine = (key, a) => T.linha.flatMap(x => [x.a, x.resposta?.a]).find(x => x && x.key === key && x.type === a.type && (!a.uid || x.uid === a.uid) && (!a.target || x.choice?.target === a.target));
// Um passo do jogador ou do rival, sempre pelo Director e pela engine.
function step(g) {
  const {d, s} = g, st = d.step();
  if (st.done.next) return d.next();
  if (st.done.inspect) return d.inspected(st.done.inspect);
  if (st.done.exam) return exam(g);
  if (s.active === 'B' && !s.window) return rival(g);
  if (st.allow) {
    const a = st.allow[0], action = a.type === 'endTurn' ? {type: 'endTurn', key: 'A'} : fromLine('A', a);
    assert(d.allow(action), `${st.id} deveria aceitar ${JSON.stringify(action)}`);
    g.exec(action); if (st.id !== 'T001_TRICK' && st.id !== 'T001_DIVINE') g.passAll(); d.observe();
    if (st.id === 'T001_TRICK') { g.respondTo = false; g.passAll(); d.observe(); }
    return;
  }
  g.passAll(); d.observe();
}
function rival(g) {
  const {d, s} = g, a = d.rivalAction();
  if (!a) { g.exec({type: 'endTurn', key: 'B'}); g.passAll(); d.observe(); return; }
  g.respondTo = a.type === 'strike';
  g.exec(a); d.rivalDone(); if (!g.respondTo) g.passAll(); d.observe();
}
function exam(g) { // jogador sozinho: coloca Base se puder, golpeia e encerra
  const {d, s} = g;
  if (s.active === 'B') { g.exec({type: 'endTurn', key: 'B'}); g.passAll(); d.observe(); return; }
  const cosmable = s.players.A.hand[0];
  if (cosmable) { try { g.exec({type: 'base', key: 'A', uid: cosmable}); } catch { /* carta não vira Base */ } }
  const hit = s.players.A.battlefield.find(u => u === 'A:028:1');
  if (hit) { try { g.exec({type: 'strike', key: 'A', uid: hit, choice: {target: s.players.B.battlefield[0] || 'god:B'}}); g.passAll(); } catch { /* despreparado */ } }
  g.exec({type: 'endTurn', key: 'A'}); g.passAll(); d.observe();
}
function runUntil(g, stop = () => false, limit = 400) { let n = 0; g.d.start(); while (g.d.step() && !g.s.victory && !stop() && n++ < limit) step(g); assert(n < limit, `travou em ${g.d.step()?.id}`); }
const tests = {
  'dados válidos'() {
    const ids = T.steps.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
    for (const st of T.steps) {
      for (const k of st.say) assert(L[k]?.en && L[k]?.pt, `fala ${k}`);
      assert(T.poses[st.pose], `pose ${st.pose}`);
      assert(existsSync(url(`playtest/divine/assets/marin/${T.poses[st.pose]}.webp`)), `arquivo da pose ${st.pose}`);
      if (st.fallback) assert(ids.includes(st.fallback), `fallback ${st.fallback}`);
      assert(st.done.next || st.done.event || st.done.inspect || st.done.exam, `${st.id} sem conclusão`);
      for (const l of st.say) for (const lang of ['en', 'pt']) assert(L[l][lang].split(/[.!?](?:\s|$)/).filter(Boolean).length <= 2, `fala longa ${l}`);
    }
    assert.equal(rivalRounds(T.linha).flat().length, T.linha.filter(x => x.a.key === 'B' && x.a.type !== 'endTurn').length);
  },
  'partida inteira, cada etapa e passagem para o Livre'() {
    const g = game(), policies = new Set(), events = [];
    g.d.start();
    for (let n = 0; g.d.step() && n < 400; n++) { policies.add(g.d.policy()); events.push(g.s.events.length); step(g); }
    assert(!g.s.victory, 'a linha não deve acabar a partida');
    assert(g.d.finished, 'tutorial não concluído');
    assert.deepEqual(g.entered, T.steps.map(s => s.id), 'etapas fora de ordem');
    assert.equal(g.d.skipped.size, 0, `pendências: ${[...g.d.skipped]}`);
    assert.deepEqual([...policies], ['scripted', 'assisted']);
    assert.equal(g.d.policy(), 'normal');
    assert.deepEqual(events, [...events].sort((a, b) => a - b), 'o estado foi reiniciado');
    assert(g.s.events.some(e => e.type === 'divine_power' && e.ability === 'WATER PRISON'));
  },
  'ações inválidas'() {
    const g = game(); g.d.start();
    while (g.d.step().id !== 'T001_BASE_1') step(g);
    assert(!g.d.allow({type: 'base', key: 'A', uid: 'A:040:2'}), 'Base errada');
    assert(!g.d.allow({type: 'endTurn', key: 'A'}), 'encerrar antes');
    assert(!g.d.allow({type: 'play', key: 'A', uid: 'A:001:1'}), 'jogar outra carta');
    while (g.d.step().id !== 'T001_STRIKE_1') step(g);
    assert(!g.d.allow({type: 'strike', key: 'A', uid: 'A:027:1', choice: {target: 'god:B'}}), 'alvo errado');
    assert(g.d.allow({type: 'strike', key: 'A', uid: 'A:027:1', choice: {target: 'B:107:1'}}));
    while (g.d.step().id !== 'T001_TRICK') step(g);
    assert(!g.d.allow({type: 'pass', key: 'A'}), 'passar a resposta obrigatória');
  },
  'custo insuficiente e clique não concluem etapa'() {
    const g = game(); g.d.start();
    while (g.d.step().id !== 'T001_BASE_1') step(g);
    const before = g.s.events.length;
    try { g.exec({type: 'play', key: 'A', uid: 'A:001:1'}); } catch { /* engine recusa */ }
    assert(!g.s.players.A.battlefield.includes('A:001:1'), 'jogou sem Cosmo');
    g.d.next(); g.d.inspected('A:040:1'); g.d.observe();
    assert.equal(g.d.step().id, 'T001_BASE_1');
    assert(g.s.events.slice(before).every(e => e.type !== 'entered'));
  },
  'carta sem alvo vira pendência sem mexer na mesa'() {
    const g = game(); g.d.start();
    while (g.d.step().id !== 'T001_END_3') step(g);
    const bf = g.s.players.B;
    runUntil(g, () => g.d.step().id === 'T001_RIVAL_3');
    while (g.d.step().id === 'T001_RIVAL_3' && g.s.active === 'B') {
      if (g.d.rivalAction()?.uid === 'B:106:1') g.d.rivalDone(); else rival(g); // o Guardião não veio à mesa
    }
    g.d.observe();
    assert(!bf.battlefield.includes('B:106:1'));
    assert.equal(g.d.step().id, 'T001_END_4');
    assert(g.d.skipped.has('guardian'));
  },
  'combate com resultado diferente do plano'() {
    const g = game(); g.d.start();
    while (g.d.step().id !== 'T001_BASE_3') step(g);
    g.s.players.B.battlefield = g.s.players.B.battlefield.filter(u => u !== 'B:107:1'); g.s.players.B.tartarus.push('B:107:1');
    step(g);
    assert.equal(g.d.step().id, 'T001_SEIYA');
    assert(g.d.skipped.has('combat'));
  },
  'efeito opcional: IA recusa até a aula divina'() {
    const g = game(); g.d.start();
    assert.equal(g.d.answer({kind: 'optional', ability: 'WATER PRISON'}), false);
    assert.equal(g.d.answer({kind: 'optional', ability: 'OTHER'}), false);
    assert.equal(g.d.answer({kind: 'pick', options: ['x']}), undefined);
    while (g.d.step().id !== 'T001_DIVINE') step(g);
    assert.equal(g.d.answer({kind: 'optional', ability: 'WATER PRISON'}), true);
  },
  'salvar e retomar em cada etapa sem duplicar efeito'() {
    const clean = game(); runUntil(clean);
    const n = T.steps.length, target = [...clean.s.events.map(e => e.type)];
    for (let at = 1; at < n; at += 3) {
      const a = game(); a.d.start();
      while (a.entered.length <= at && a.d.step()) step(a);
      if (a.s.window) continue; // o jogo só grava sem janela aberta
      const b = game(a.save()); runUntil(b);
      assert(b.d.finished, `não terminou retomando em ${at}`);
      assert.deepEqual(b.s.events.map(e => e.type), target, `eventos divergem retomando em ${at}`);
      assert.equal(b.s.players.A.soul, clean.s.players.A.soul); assert.equal(b.s.players.B.soul, clean.s.players.B.soul);
    }
  },
  'retomada com fichas em campo conhece a carta delas'() {
    const g = game(); g.d.start();
    while (g.d.step().id !== 'T001_DIVINE') step(g);
    assert(g.s.players.A.battlefield.some(u => u.includes(':token:')), 'sem fichas no cenário');
    const save = decodeSave(encodeSave({match: snapshot(g.s, g.ctx), tokens: tokenCards(cards)}));
    const fresh = new Map([...cards].filter(([, c]) => !c.token));
    restoreTokens(save, fresh);
    for (const u of save.match.state.players.A.battlefield) assert(fresh.get(save.match.objects[u].cardId), `carta de ${u}`);
  },
  'vitória precoce respeita o resultado'() {
    const g = game(); g.d.start();
    while (g.d.step().id !== 'T001_DIVINE') step(g);
    g.s.players.B.soul = 1;
    const seiya = g.s.units['A:001:1'];
    g.d.answer = () => false; // a defesa do Deus não entra neste cenário
    g.exec({type: 'strike', key: 'A', uid: 'A:001:1', choice: {target: 'god:B'}}); g.passAll(); g.d.observe();
    assert(seiya && g.s.victory, 'sem vitória');
    assert.equal(g.d.result().winner, 'A');
    assert(g.d.result().pending.includes('exam'));
    assert(!g.d.finished);
  },
  'derrota precoce respeita o resultado'() {
    const g = game(); g.d.start();
    while (g.d.step().id !== 'T001_TRICK') step(g);
    g.exec({type: 'play', key: 'A', uid: 'A:054:1', choice: {target: 'A:028:1'}}); g.respondTo = false; g.passAll(); g.d.observe();
    g.s.players.A.soul = 1;
    while (g.s.active === 'B') { g.exec({type: 'endTurn', key: 'B'}); g.passAll(); }
    g.s.victory = {winner: 'B', cause: 'teste'}; g.d.observe();
    assert.equal(g.d.result().winner, 'B');
    assert(g.d.result().pending.length > 0);
  },
};
let failed = 0;
for (const [name, test] of Object.entries(tests)) {
  try { test(); console.log('ok  ', name); } catch (e) { failed++; console.log('FAIL', name, '\n    ', e.message.split('\n').slice(0, 6).join('\n     ')); }
}
process.exit(failed ? 1 : 0);
