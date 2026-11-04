// Relatório do CosmoBalanceEngine: lê o catálogo e escreve só em card-forge/out/cosmo-balance-report.json.
// node tools/cosmo-balance-report.mjs [--seed 1] [--top 12]
import {readFileSync, writeFileSync} from 'node:fs';
import {CosmoBalanceEngine, CLASS_ORDER} from '../card-forge/cosmo-balance/engine.js';
import {proposalsFor} from '../card-forge/cosmo-balance/proposals.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const catalog = read('data/cards.json');
const engine = new CosmoBalanceEngine({engineIndex: read('card-forge/cosmo-balance/engine-index.json'), seed: Number(arg('seed', 1))});
const result = engine.analyze(catalog.cartas, catalog);
const {ctx, ...publicResult} = result;
const flagged = result.cards.filter(c => c.classification !== 'Análise inconclusiva' && c.classification !== 'Balanceada');
const proposals = Object.fromEntries(flagged.map(c => [c.id, proposalsFor(engine, c, catalog.cartas, result)]));
writeFileSync(new URL('../card-forge/out/cosmo-balance-report.json', import.meta.url), `${JSON.stringify({...publicResult, proposals})}\n`);

const s = result.summary, top = Number(arg('top', 12));
console.log(`Cartas analisadas: ${s.total} (${s.cut} cortadas). Com frase UNRESOLVED: ${s.unresolvedCards} (${s.unresolvedSentences} frases). Sem Engine: ${s.noEngineCards}. Em tabela numérica/God: ${s.numericEngineCards}.`);
for (const k of CLASS_ORDER) console.log(`  ${k}: ${s.classes[k]}`);
console.log('Confiança:', JSON.stringify(s.confidence), '\nMediana do desvio por facção:', JSON.stringify(s.factionMedian));
console.log('Meta:', JSON.stringify({v: result.meta.engineVersion, catalog: result.meta.catalogVersion, catalogHash: result.meta.catalogHash, configHash: result.meta.configHash, index: result.meta.engineIndexHash, seed: result.meta.seed}));
const row = c => `${c.id} ${c.name} [${c.class} c${c.cost ?? '-'}] power ${c.power} / efetivo ${c.effectiveTotal} norm ${Math.round(c.normalizedDeviation * 100)}% conf ${c.confidenceLevel}`;
const known = result.cards.filter(c => c.normalizedDeviation != null && c.classification !== 'Análise inconclusiva').sort((a, b) => b.normalizedDeviation - a.normalizedDeviation);
console.log('\nMaiores desvios para cima:'); known.slice(0, top).forEach(c => console.log(' ', row(c)));
console.log('\nMaiores desvios para baixo:'); known.slice(-top).reverse().forEach(c => console.log(' ', row(c)));
