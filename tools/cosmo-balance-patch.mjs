// Status e validação de um patch experimental. Só escreve o JSON do próprio patch; nunca o catálogo.
// node tools/cosmo-balance-patch.mjs validate
// node tools/cosmo-balance-patch.mjs status READY_FOR_TEST --by "Lierson" --note "…"
// node tools/cosmo-balance-patch.mjs record-sim --by "Lierson"
import {readFileSync, writeFileSync} from 'node:fs';
import {validatePatch, transition} from '../card-forge/cosmo-balance/patches.js';

const url = p => new URL(`../${p}`, import.meta.url);
const read = p => JSON.parse(readFileSync(url(p)));
const FILE = 'card-forge/cosmo-balance/patches/balance-patch-001.json';
const arg = name => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const patch = read(FILE), catalog = read('data/cards.json'), index = read('card-forge/cosmo-balance/engine-index.json');
const validations = validatePatch(patch, catalog.cartas, index);
const save = next => writeFileSync(url(FILE), `${JSON.stringify(next, null, 2)}\n`);
const today = new Date().toISOString().slice(0, 10);
const [cmd, to] = process.argv.slice(2);

if (cmd === 'validate') {
  for (const v of validations) console.log(`${v.key} ${v.cardId} ${v.status}${v.status === 'VALIDATED' ? '' : ` :: ${v.checks.filter(c => !c.ok).map(c => `${c.name} (${c.detail})`).join('; ')}`}`);
} else if (cmd === 'status') {
  save(transition(patch, to, {by: arg('by'), date: today, note: arg('note') || '', validations}));
  console.log(`${patch.id}: ${patch.status} → ${to}`);
} else if (cmd === 'record-sim') {
  const sim = read('card-forge/out/cosmo-balance-sim.json');
  const run = {date: today, by: arg('by'), seed: sim.seed, games: sim.games, level: sim.level, matchesPerScenario: sim.matchesPerScenario, scenarios: Object.keys(sim.runs), simCatalogHash: sim.simCatalogHash, warning: sim.warning};
  if (!run.by) throw new Error('--by é obrigatório.');
  save({...patch, simulation: {runs: [...patch.simulation.runs, run]}});
  console.log(`Registrado: ${run.scenarios.join(', ')}.`);
} else {
  console.log('Comandos: validate | status <STATUS> --by <nome> [--note …] | record-sim --by <nome>');
}
