// Round-robin dos decks no engine-v3 com a IA do playtest nos dois lados, sem navegador.
// node tools/simulate-v3.mjs [--games 100] [--out arquivo.json] [--file decks-ultra.json,decks-competitivos.json] [--level hard|normal]
// Espelha o aiTick de playtest/divine/app.js. A legalidade (playableReason etc.) vive dentro do app.js, que depende de DOM.
// shortcut: cópia da legalidade do app.js; extrair para um módulo se ela divergir.
import {readFileSync, writeFileSync} from 'node:fs';
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {placeBase, RuleError} from '../playtest/engine-v3/core.js';
import {declareStrike, strikeTargets, mustStrike} from '../playtest/engine-v3/strike.js';
import {playDevotee, playEquipment, playSpell, activate, reequip, duplicateCharacter, resonant, castCost, mixed, castHidden, afterlifeBlock, activateAfterlife} from '../playtest/engine-v3/play.js';
import {atkOf, hpOf, isSaint, isBronze} from '../playtest/engine-v3/effects.js';
import {v6Spell, entryOf} from '../playtest/engine-v3/v6/hooks.js';
import {domainEntry} from '../playtest/engine-v3/v6/registry.js';
import {spellCategory} from '../playtest/engine-v3/core.js';
import {STEPS} from '../playtest/choices-v3.js';
import {ultimateBlock, announceExclamation, greatFloodBlock, announceGreatFlood, commandBlock, commandTargets, activateCommand} from '../playtest/engine-v3/gods.js';
import {runDecisions, resume, restore, snapshot, PendingDecision} from '../playtest/engine-v3/decision.js';
import {applyAction, advance} from '../playtest/engine-v3/actions.js';
import {createAI} from '../playtest/divine/ai.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const MAX_ROUNDS = 160, MAX_STEPS = 20000;

export function loadDecks(files) {
  if (files) return files.split(',').flatMap(f => read(`../data/alpha-0.1/${f}`).decks.map(d => ({...d, grupo: f.replace(/^decks-|\.json$/g, '')})));
  const starters = [...read('../data/alpha-0.1/decks-proposta-d171.json').decks, ...read('../data/alpha-0.1/decks-preview.json').decks];
  const competitive = read('../data/alpha-0.1/decks-competitivos.json').decks;
  return [...starters.map(d => ({...d, grupo: 'starter'})), ...competitive.map(d => ({...d, grupo: 'competitivo'}))];
}

export function catalog() {
  const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
  addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
  return {cards, index};
}

export function playMatch({cards, index}, deckA, deckB, seed, first, trace = false, levels = {A: 'hard', B: 'hard'}, {tweak, domainUse} = {}) {
  const match = createMatch({cards, canonIndex: index, decks: {A: deckA, B: deckB}, gods: {A: deckA.god || 'god-athena', B: deckB.god || 'god-athena'}, seed, first});
  const ctx = {cards, objects: match.objects, attached: match.attached}, s = match.state;
  tweak?.(match);
  const errors = {};
  const note = e => { if (!(e instanceof RuleError) && !e.decision) { const k = `${e.name}: ${e.message}`.slice(0, 120); errors[k] = (errors[k] || 0) + 1; } };
  const S = () => s, info = uid => cards.get(ctx.objects[uid].cardId), num = uid => ctx.objects[uid]?.cardId.slice(-3) || '000';
  const other = key => s.order.find(k => k !== key);
  const readyBases = key => s.players[key].bases.filter(b => b.prepared).length;
  const affordable = (key, cost) => {
    if (!cost) return true;
    const latent = s.players[key].latent;
    return cost.unit === 'latent' ? latent >= cost.amount : cost.unit === 'mixed' ? readyBases(key) + latent >= cost.amount : readyBases(key) >= cost.amount;
  };
  const idleFor = key => !s.victory && !s.setup && !s.window && !s.chain.length && s.active === key;
  const spellCat = uid => {
    const v6 = ctx.objects[uid] && v6Spell(ctx, uid);
    return v6 ? {category: v6.category, speed: v6.category === 'Moment' ? 'instant' : 'sorcery'} : spellCategory(Number(num(uid)));
  };
  const candidates = (step, key) => {
    const field = s.players[key].battlefield, devs = field.filter(u => info(u).kind === 'Devotee');
    switch (step.pick) {
      case 'saint': return devs.filter(u => isSaint(ctx, u));
      case 'ready-saint': return devs.filter(u => isSaint(ctx, u));
      case 'bronze': return devs.filter(u => isBronze(ctx, u));
      case 'devotee': return devs;
      case 'armor': return devs.filter(u => Object.keys(ctx.attached).some(g => ctx.attached[g] === u && info(g).armor));
      case 'resonant': return devs.filter(u => resonant(s, ctx, key, info(step.armor), u));
      case 'wearer': return devs.filter(u => ctx.attached[step.armor] !== u);
      case 'enemy': return s.players[other(key)].battlefield.filter(u => info(u).kind === 'Devotee');
      case 'command': return commandTargets(s, ctx, key);
      default: return [];
    }
  };
  const missingTarget = (key, uid) => {
    const step = (STEPS[num(uid)] || []).find(st => st.pick && !st.when);
    if (step && !step.optional && !candidates(step, key).length) return 'alvo';
    try { entryOf(ctx, uid)?.spell?.check?.(s, ctx, key, {}); } catch { return 'alvo'; }
    return null;
  };
  const playableReason = (key, uid) => {
    const c0 = info(uid), c = {...c0, cost: castCost(s, ctx, key, uid, c0.cost)};
    if (s.victory || s.setup) return 'parada';
    if (c.kind === 'Spell') {
      const cat = spellCat(uid);
      if (!cat) return 'sem categoria';
      if (cat.speed === 'instant' ? !(s.window ? s.window.priority === key : s.active === key && !s.chain.length) : !idleFor(key)) return 'momento';
      const cost = s.window ? castCost(s, ctx, key, uid, {amount: c0.cost.amount, unit: 'latent'}) : mixed(c.cost);
      return affordable(key, cost) ? missingTarget(key, uid) : 'custo';
    }
    if (!idleFor(key)) return 'momento';
    if (c.kind === 'Equipment' && c.global) return affordable(key, mixed(c.cost)) ? null : 'custo';
    return affordable(key, c.cost) ? null : 'custo';
  };
  const canBase = (key, uid) => !!info(uid).cosmoble && idleFor(key) && s.players[key].baseTurn !== s.turn;
  const hiddenReason = (key, uid) => {
    const c = info(uid), x = c.hiddenCosmo, base = s.players[key].bases.find(b => b.uid === uid);
    if (!x || !base) return 'sem Hidden';
    if (s.victory || s.setup) return 'parada';
    const moment = c.kind === 'Spell' && spellCat(uid)?.speed === 'instant', response = !!s.window;
    if (moment ? !(response ? s.window.priority === key : idleFor(key)) : !idleFor(key)) return 'momento';
    const self = base.prepared && !response ? 1 : 0, others = readyBases(key) - self, latent = s.players[key].latent, need = x - self;
    const ok = response ? latent >= x : c.kind === 'Devotee' ? others >= need : others + latent >= need;
    return ok ? null : 'custo';
  };
  const brain = key => createAI({
    level: () => levels[key], ctx: () => ctx, mustStrike: k => mustStrike(s, ctx, k),
    S, info, num, known: uid => !!ctx.objects[uid], resonant: (key, armor, uid) => resonant(s, ctx, key, armor, uid), duplicate: (key, uid) => !!duplicateCharacter(s, ctx, key, uid), candidates, playableReason, canBase, STEPS,
    hp: uid => hpOf(s, ctx, uid) - (s.units[uid]?.damage || 0), atk: uid => atkOf(s, ctx, uid), isSaint: uid => isSaint(ctx, uid),
    strikeTargets: uid => strikeTargets(s, ctx, uid), ultimateBlock: (key, trio) => ultimateBlock(s, ctx, key, trio), greatFloodBlock: key => greatFloodBlock(s, key),
    commandBlock: key => commandBlock(s, ctx, key), commandTargets: key => commandTargets(s, ctx, key), activateCommand: (key, uid) => activateCommand(s, ctx, key, uid),
    placeBase, playDevotee: (key, uid, ch) => playDevotee(s, ctx, key, uid, ch), playEquipment: (key, uid, bearer, ch) => playEquipment(s, ctx, key, uid, bearer, ch),
    reequip: (key, uid, bearer) => reequip(s, ctx, key, uid, bearer), attached: uid => ctx.attached[uid],
    domainUses: key => { const d = domainEntry(s, key), general = domainUse === 'never' ? null : domainUse === 'always' && d?.activate ? {...d.activate, cost: d.activate.cost || 1} : d?.activate || null; return {res: !!d?.res, general}; }, activate: (key, uid) => activate(s, ctx, key, uid, {}),
    playSpell: (key, uid, ch) => playSpell(s, ctx, key, uid, ch), declareStrike: (uid, target) => declareStrike(s, ctx, uid, target),
    hiddenReason, castHidden: (key, uid, ch) => castHidden(s, ctx, key, uid, ch),
    afterlifeBlock: (key, uid) => afterlifeBlock(s, ctx, key, uid), activateAfterlife: (key, uid) => activateAfterlife(s, ctx, key, uid),
    announceExclamation: (key, trio) => announceExclamation(s, ctx, key, trio), announceGreatFlood: key => announceGreatFlood(s, ctx, key),
  });

  const ais = {A: brain('A'), B: brain('B')};
  const hasMoment = k => levels[k] !== 'easy' && s.players[k].hand.some(u => info(u).kind === 'Spell' && spellCat(u)?.speed === 'instant');
  // Mesmo protocolo do act/reply da tela: resposta recusada volta ao ponto da pergunta e sai por timeout.
  function act(action) {
    const wasEnding = match.ending, snap = snapshot(s, ctx);
    const run = () => {
      match.ending = wasEnding;
      if (typeof action === 'function') action(); else applyAction(match, ctx, action);
      advance(match, k => !hasMoment(k));
    };
    try {
      let r = runDecisions(s, ctx, run, [], snap);
      for (let guard = 0; r.pending; guard++) {
        if (guard > 200) throw Error('perguntas sem fim');
        const value = ais[r.pending.player].answer(r.pending);
        try { r = resume(s, ctx, run, r, {value}); } catch (e) {
          if (e instanceof PendingDecision) throw e;
          note(e);
          r = resume(s, ctx, run, r, {timeout: true});
        }
      }
      return true;
    } catch (e) {
      note(e);
      match.ending = wasEnding;
      restore(s, ctx, snap);
      delete s.pending;
      return false;
    }
  }

  let end = null;
  for (let step = 0; !s.victory && !end; step++) {
    if (step > MAX_STEPS) end = 'passos';
    else if (s.round > MAX_ROUNDS) end = 'rounds';
    else if (s.setup) { if (!act({type: 'mulligan', key: s.setup[0], choice: {uids: ais[s.setup[0]].mulligan(s.setup[0])}})) end = 'mulligan'; }
    else if (s.window) {
      const key = s.window.priority, a = ais[key].respond(key), before = s.events.length;
      if (a) { if (!act(a.run) || s.events.length === before) ais[key].refuse(a); continue; }
      if (!act({type: 'pass', key})) end = 'janela';
    }
    else if (match.ending) { if (!act(() => {})) end = 'virada'; }
    else {
      const key = s.active, ai = ais[key], a = ai.next(key);
      if (!a) { if (!act({type: 'endTurn', key})) end = 'endTurn'; continue; }
      const before = s.events.length;
      if (!act(a.run) || s.events.length === before) ai.refuse(a);
    }
  }
  const v = s.victory;
  const reason = end || (v?.draw ? 'empate' : v?.reason || 'soul');
  return {winner: v?.draw || !v ? null : v.winner, reason, round: s.round, turn: s.turn, errors, soul: {A: s.players.A.soul, B: s.players.B.soul}, ...(trace ? {events: s.events, state: s, objects: ctx.objects} : {})};
}

if (!isMainThread && workerData?.jobs) {
  const {jobs, decks, level} = workerData, cat = catalog();
  const results = jobs.map(j => {
    try {
      const r = playMatch(cat, decks[j.a], decks[j.b], j.seed, j.first, false, {A: level, B: level});
      return {...j, ...r};
    } catch (e) {
      return {...j, winner: null, reason: 'erro', round: 0, turn: 0, errors: {[String(e.message).slice(0, 120)]: 1}};
    }
  });
  parentPort.postMessage(results);
} else if (isMainThread && process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
  const games = Number(arg('games', 100)), out = arg('out', null), level = arg('level', 'hard'), decks = loadDecks(arg('file', null));
  const jobs = [];
  decks.forEach((_, a) => decks.forEach((_, b) => {
    if (a >= b) return;
    for (let g = 0; g < games; g++) jobs.push({a, b, seed: (a + 1) * 100000 + (b + 1) * 1000 + g, first: g % 2 ? 'B' : 'A'});
  }));
  const N = 8, shards = Array.from({length: N}, (_, i) => jobs.filter((_, j) => j % N === i));
  const t0 = Date.now();
  const parts = await Promise.all(shards.map(sh => new Promise((ok, no) => {
    const w = new Worker(new URL(import.meta.url), {workerData: {jobs: sh, decks, level}});
    w.once('message', ok); w.once('error', no);
  })));
  const results = parts.flat();
  const stats = decks.map(d => ({id: d.id, grupo: d.grupo, win: 0, loss: 0, draw: 0, vs: {}}));
  const reasons = {}, errors = {}, rounds = [];
  for (const r of results) {
    reasons[r.reason] = (reasons[r.reason] || 0) + 1; rounds.push(r.round);
    for (const [k, n] of Object.entries(r.errors)) errors[k] = (errors[k] || 0) + n;
    const A = stats[r.a], B = stats[r.b];
    (A.vs[B.id] ||= {win: 0, n: 0}).n++; (B.vs[A.id] ||= {win: 0, n: 0}).n++;
    if (!r.winner) { A.draw++; B.draw++; continue; }
    const w = r.winner === 'A' ? A : B, l = r.winner === 'A' ? B : A;
    w.win++; l.loss++; w.vs[l.id].win++;
  }
  const firstWins = results.filter(r => r.winner === r.first).length, decided = results.filter(r => r.winner).length;
  const pct = (w, n) => (n ? (100 * w / n).toFixed(1) : '-');
  const group = (st, g) => { // % só contra decks do mesmo grupo (metas separadas)
    let w = 0, n = 0;
    for (const o of stats) if (o.grupo === g && o !== st) { w += st.vs[o.id].win; n += st.vs[o.id].n; }
    return pct(w, n);
  };
  rounds.sort((a, b) => a - b);
  console.log(`${results.length} partidas em ${((Date.now() - t0) / 1000).toFixed(0)}s; rounds mediana ${rounds[rounds.length >> 1]}, p95 ${rounds[Math.floor(rounds.length * 0.95)]}; primeiro jogador vence ${pct(firstWins, decided)}%`);
  console.log('fim:', JSON.stringify(reasons));
  if (Object.keys(errors).length) console.log('erros:', JSON.stringify(errors, null, 1));
  for (const st of stats) console.log(`${st.grupo.padEnd(11)} ${st.id.padEnd(34)} grupo ${group(st, st.grupo).padStart(5)}%  geral ${pct(st.win, st.win + st.loss + st.draw).padStart(5)}%`);
  if (out) writeFileSync(out, JSON.stringify({stats, reasons, errors, rounds: {mediana: rounds[rounds.length >> 1]}, primeiro: pct(firstWins, decided)}, null, 1));
}
