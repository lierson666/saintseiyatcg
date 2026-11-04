// Ponte PREPARADA entre o CosmoBalanceEngine e a simulação headless real (tools/simulate-v3.mjs, playtest/engine-v3).
// Roda partidas espelhadas com iniciativa invertida (§65) e grava insumo para a futura calibragem.
// NÃO é metagame: os dois lados usam a IA heurística do playtest, sem aprendizado nem deckbuilding, e decks de teste.
// node tools/cosmo-balance-sim.mjs --dry-run
// node tools/cosmo-balance-sim.mjs --games 2 --decks 2 --level hard --seed 1
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {catalog, loadDecks, playMatch} from './simulate-v3.mjs';
import {stableHash} from '../card-forge/cosmo-balance/config.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const games = Number(arg('games', 2)), limit = Number(arg('decks', 0)), level = arg('level', 'hard'), seed = Number(arg('seed', 1));
const dryRun = process.argv.includes('--dry-run');

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

const all = loadDecks(arg('file', null)), decks = limit ? all.slice(0, limit) : all;
const jobs = plan(decks, games, seed);
const meta = {
  warning: 'Agentes heurísticos, decks de teste: sinal para calibragem, não metagame.', agentsCompetitive: false, level, seed, games, decks: decks.length,
  decksHash: stableHash(decks), engineIndexHash: JSON.parse(readFileSync(new URL('../card-forge/cosmo-balance/engine-index.json', import.meta.url))).sourceHash,
};
if (dryRun) { console.log(JSON.stringify({...meta, partidas: jobs.length}, null, 1)); process.exit(0); }

const cat = catalog(), stats = decks.map(d => ({id: d.id, win: 0, loss: 0, draw: 0})), errors = {};
let firstWins = 0, decided = 0;
for (const job of jobs) {
  try {
    const r = playMatch(cat, decks[job.a], decks[job.b], job.seed, job.first, false, {A: level, B: level});
    for (const [k, n] of Object.entries(r.errors || {})) errors[k] = (errors[k] || 0) + n;
    if (!r.winner) { stats[job.a].draw++; stats[job.b].draw++; continue; }
    decided++;
    if (r.winner === job.first) firstWins++;
    stats[r.winner === 'A' ? job.a : job.b].win++; stats[r.winner === 'A' ? job.b : job.a].loss++;
  } catch (e) { const k = String(e.message).slice(0, 120); errors[k] = (errors[k] || 0) + 1; }
}
const out = {
  ...meta, partidas: jobs.length, primeiroJogador: decided ? firstWins / decided : null, errors,
  stats: stats.map(s => { const n = s.win + s.loss + s.draw; return {...s, n, taxa: n ? s.win / n : null, ic95: wilson(s.win, n)}; }),
};
mkdirSync(new URL('../card-forge/out/', import.meta.url), {recursive: true});
writeFileSync(new URL('../card-forge/out/cosmo-balance-sim.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
console.log(`${jobs.length} partidas. ${meta.warning} Erros: ${Object.keys(errors).length}. Saída: card-forge/out/cosmo-balance-sim.json`);
