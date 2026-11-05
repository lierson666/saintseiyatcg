// Cenários do BALANCE-PATCH-001 na simulação headless real (tools/simulate-v3.mjs, playtest/engine-v3).
// A: catálogo atual. B: 8 prioritárias. C: 12 propostas. Mesmos decks, sementes e iniciativa espelhada (§65) em todo cenário.
// NÃO é metagame: os dois lados usam a IA heurística do playtest, sem aprendizado nem deckbuilding, e decks de teste.
// node tools/cosmo-balance-sim.mjs --dry-run
// node tools/cosmo-balance-sim.mjs --games 20 --scenarios A,B,C --ablations 001,006 --seed 1
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {catalog, loadDecks, playMatch} from './simulate-v3.mjs';
import {applyCostOverlay, applyEngineOverrides} from './cosmo-balance-overrides.mjs';
import {stableHash} from '../card-forge/cosmo-balance/config.js';
import {SCENARIOS} from '../card-forge/cosmo-balance/patches.js';

const readJson = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const PATCH_FILE = 'card-forge/cosmo-balance/patches/balance-patch-001.json';

// Intervalo de Wilson a 95%: com poucas partidas a faixa larga mostra que o número ainda não prova nada.
export function wilson(wins, n, z = 1.96) {
  if (!n) return [0, 1];
  const p = wins / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [(c - m) / d, (c + m) / d];
}

// Sementes determinísticas: mesma semente, mesmo plano. Cada par joga as duas iniciativas com a mesma semente.
export function plan(decks, perSide, base) {
  const jobs = [];
  decks.forEach((_, a) => decks.forEach((_, b) => {
    if (a >= b) return;
    for (let g = 0; g < perSide; g++) for (const first of ['A', 'B']) jobs.push({a, b, first, seed: base * 1000000 + (a + 1) * 10000 + (b + 1) * 100 + g});
  }));
  return jobs;
}

export function scenarioKeys(patch, name) {
  if (SCENARIOS[name]) return patch.proposals.filter(p => SCENARIOS[name].groups.includes(p.group)).map(p => p.key);
  if (name.startsWith('A+')) return [name.slice(2)];
  if (name.startsWith('C-')) return patch.proposals.map(p => p.key).filter(k => k !== name.slice(2));
  throw new Error(`Cenário desconhecido: ${name}`);
}

// Resumo de uma partida: só fatos dos eventos da Engine; o trace inteiro não sai do worker.
function digest(r, job) {
  const soulLost = {A: 0, B: 0}, spent = {A: 0, B: 0}, played = {};
  for (const e of r.events || []) {
    if (e.type === 'soul_lost') soulLost[e.player] += e.amount || 0;
    if (e.type === 'cosmo_spent') spent[e.player] += e.amount || 0;
    if (e.type === 'card_played') { const id = r.objects?.[e.uid]?.cardId; if (id) played[id] = (played[id] || 0) + 1; }
  }
  return {...job, winner: r.winner, reason: r.reason, round: r.round, soulLost, spent, played, errors: r.errors};
}

if (!isMainThread && workerData?.sim) {
  const {jobs, decks, level, keys} = workerData.sim;
  const cat = catalog();
  const {V6} = await import('../playtest/engine-v3/v6/registry.js');
  applyCostOverlay(cat.cards, readJson(PATCH_FILE), keys);
  applyEngineOverrides(V6, keys);
  parentPort.postMessage(jobs.map(j => {
    try { return digest(playMatch(cat, decks[j.a], decks[j.b], j.seed, j.first, true, {A: level, B: level}), j); }
    catch (e) { return {...j, winner: null, reason: 'erro', round: 0, soulLost: {A: 0, B: 0}, spent: {A: 0, B: 0}, played: {}, errors: {[String(e.message).slice(0, 120)]: 1}}; }
  }));
} else if (isMainThread && process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
  const games = Number(arg('games', 2)), limit = Number(arg('decks', 0)), level = arg('level', 'hard'), seed = Number(arg('seed', 1));
  const patch = readJson(PATCH_FILE);
  const ablations = arg('ablations', '').split(',').filter(Boolean).map(k => `A+${k}`);
  const names = [...arg('scenarios', 'A,B,C').split(','), ...ablations];
  const all = loadDecks(arg('file', null)), decks = limit ? all.slice(0, limit) : all;
  const jobs = plan(decks, games, seed);
  const forge = readJson('card-forge/art-web/cards.json').cartas, canon = readJson('data/cards.json').cartas;
  const byId = new Map(canon.map(c => [c.id, c]));
  const FIELDS = ['custo', 'power', 'vida', 'habilidades_en'];
  const drift = forge.filter(c => FIELDS.some(f => JSON.stringify(c[f]) !== JSON.stringify(byId.get(c.id)?.[f]))).map(c => c.id);
  const meta = {
    warning: 'Agentes heurísticos e decks de teste: sinal para calibragem, não metagame.', agentsCompetitive: false, level, seed, games, decks: decks.map(d => d.id), matchesPerScenario: jobs.length,
    decksHash: stableHash(decks), simCatalogHash: stableHash(forge), canonHash: stableHash(canon), simCatalogDrift: drift, engineIndexHash: readJson('card-forge/cosmo-balance/engine-index.json').sourceHash, patch: {id: patch.id, version: patch.version, status: patch.status},
  };
  if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({...meta, scenarios: names.map(n => ({name: n, active: scenarioKeys(patch, n)}))}, null, 1)); process.exit(0); }

  const factionOf = d => String(d.god || 'god-athena').replace('god-', '');
  const empty = () => ({win: 0, loss: 0, draw: 0, n: 0});
  const WORKERS = 8, t0 = Date.now(), runs = {};
  for (const name of names) {
    const keys = scenarioKeys(patch, name);
    const shards = Array.from({length: WORKERS}, (_, i) => jobs.filter((_, j) => j % WORKERS === i));
    const parts = await Promise.all(shards.map(sh => new Promise((ok, no) => {
      const w = new Worker(new URL(import.meta.url), {workerData: {sim: {jobs: sh, decks, level, keys}}});
      w.once('message', ok); w.once('error', no);
    })));
    const results = parts.flat();
    const byFaction = {}, byDeck = {}, matchups = {}, errors = {}, usage = {}, reasons = {}, rounds = [];
    let firstWins = 0, decided = 0, soulLost = 0, spent = 0;
    for (const r of results) {
      const da = decks[r.a], db = decks[r.b], fa = factionOf(da), fb = factionOf(db);
      reasons[r.reason] = (reasons[r.reason] || 0) + 1;
      for (const [k, n] of Object.entries(r.errors || {})) errors[k] = (errors[k] || 0) + n;
      for (const [k, n] of Object.entries(r.played)) usage[k] = (usage[k] || 0) + n;
      soulLost += r.soulLost.A + r.soulLost.B; spent += r.spent.A + r.spent.B;
      if (r.round) rounds.push(r.round);
      const tally = (table, key, won, draw) => { const t = (table[key] ||= empty()); t.n++; if (draw) t.draw++; else if (won) t.win++; else t.loss++; };
      const draw = !r.winner;
      if (!draw) { decided++; if (r.winner === r.first) firstWins++; }
      tally(byDeck, da.id, r.winner === 'A', draw); tally(byDeck, db.id, r.winner === 'B', draw);
      if (fa !== fb) { // Espelho de facção não diz nada sobre a facção.
        tally(byFaction, fa, r.winner === 'A', draw); tally(byFaction, fb, r.winner === 'B', draw);
        tally(matchups, `${fa} x ${fb}`, r.winner === 'A', draw); tally(matchups, `${fb} x ${fa}`, r.winner === 'B', draw);
      }
    }
    const rate = t => ({...t, rate: t.n ? t.win / t.n : null, ci95: wilson(t.win, t.n)});
    const mapRate = o => Object.fromEntries(Object.entries(o).sort().map(([k, v]) => [k, rate(v)]));
    rounds.sort((a, b) => a - b);
    runs[name] = {
      label: SCENARIOS[name]?.label ?? `Ablação: ${name}`, active: keys, versions: keys.map(k => `${patch.proposals.find(p => p.key === k).cardId}@${patch.id}#${k}`), overrides: keys.filter(k => patch.proposals.find(p => p.key === k).engine === 'override'),
      matches: results.length, decided, firstPlayer: decided ? firstWins / decided : null, firstPlayerCi95: wilson(firstWins, decided), victoryRoundMean: rounds.length ? rounds.reduce((a, b) => a + b, 0) / rounds.length : null, victoryRoundMedian: rounds[rounds.length >> 1] ?? null,
      soulDamagePerMatch: results.length ? soulLost / results.length : null, soulDamagePerCosmo: spent ? soulLost / spent : null, cosmoPerMatch: results.length ? spent / results.length : null,
      byFaction: mapRate(byFaction), byDeck: mapRate(byDeck), matchups: mapRate(matchups), reasons, errors, usage: Object.fromEntries(Object.entries(usage).filter(([id]) => patch.proposals.some(p => p.cardId === id)).sort()),
    };
    console.log(`${name}: ${results.length} partidas, erros ${Object.keys(errors).length}, ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  const out = {...meta, runs};
  mkdirSync(new URL('../card-forge/out/', import.meta.url), {recursive: true});
  writeFileSync(new URL('../card-forge/out/cosmo-balance-sim.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
  console.log(`${meta.warning} Saída: card-forge/out/cosmo-balance-sim.json. Catálogo da simulação difere de data/cards.json em ${drift.length} carta(s).`);
}
