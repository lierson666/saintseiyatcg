// Relatório do CosmoBalanceEngine: lê o catálogo e escreve só em card-forge/out/ (fora do git).
// node tools/cosmo-balance-report.mjs [--seed 1] [--top 12] [--calibrate]
// --calibrate imprime o effectScale que zera a mediana de cada classe. Não grava: mudar config.js é decisão de quem revisa.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {CosmoBalanceEngine, CLASS_ORDER, unresolvedLedger} from '../card-forge/cosmo-balance/engine.js';
import {proposalsFor} from '../card-forge/cosmo-balance/proposals.js';
import {validatePatch} from '../card-forge/cosmo-balance/patches.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const out = name => new URL(`../card-forge/out/${name}`, import.meta.url);
const catalog = read('data/cards.json'), index = read('card-forge/cosmo-balance/engine-index.json'), patch = read('card-forge/cosmo-balance/patches/balance-patch-001.json');
const engine = new CosmoBalanceEngine({engineIndex: index, seed: Number(arg('seed', 1))});
const result = engine.analyze(catalog.cartas, catalog);

if (process.argv.includes('--calibrate')) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  const medianOf = (scale, klass) => med(new CosmoBalanceEngine({engineIndex: index, config: {effectScale: scale}}).analyze(catalog.cartas, catalog).cards.filter(c => c.class === klass && c.relativeDeviation != null && c.status !== 'cortado').map(c => c.relativeDeviation));
  const scale = {...engine.config.effectScale};
  for (const k of ['Devotee', 'Equipment', 'Moment', 'Technique', 'SpellOther']) {
    let lo = 0.2, hi = 5;
    for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (medianOf({...scale, [k]: mid}, k) > 0) hi = mid; else lo = mid; }
    scale[k] = Math.round((lo + hi) * 50) / 100;
  }
  console.log(JSON.stringify(scale));
  process.exit(0);
}

const {ctx, ...publicResult} = result;
const flagged = result.cards.filter(c => c.classification !== 'Análise inconclusiva' && c.classification !== 'Balanceada');
const proposals = Object.fromEntries(flagged.map(c => [c.id, proposalsFor(engine, c, catalog.cartas, result)]));
const ledger = unresolvedLedger(result.cards, index), validations = validatePatch(patch, catalog.cartas, index);
mkdirSync(out(''), {recursive: true});
writeFileSync(out('cosmo-balance-report.json'), `${JSON.stringify({...publicResult, proposals, ledger, validations})}\n`);
const COLS = [['id', c => c.id], ['versao', c => c.cardVersion], ['carta', c => c.name], ['faccao', c => c.faction], ['tipo', c => c.class], ['raridade', c => c.rarity], ['status', c => c.status], ['custo', c => c.cost], ['attack', c => c.attack], ['hp', c => c.hp], ['soul', c => c.soul],
  ['body', c => c.scores.BodyScore], ['keyword', c => c.scores.KeywordScore], ['effect', c => c.scores.EffectScore], ['synergy', c => c.scores.SynergyScore], ['timing', c => c.scores.TimingScore], ['interaction', c => c.scores.InteractionScore], ['restriction', c => c.scores.RestrictionScore], ['consistency', c => c.scores.ConsistencyScore],
  ['power', c => c.power], ['custo_efetivo', c => c.effectiveTotal], ['desvio_absoluto', c => c.absoluteDeviation], ['desvio_relativo', c => c.relativeDeviation], ['relativo_ao_grupo', c => c.normalizedDeviation], ['classificacao', c => c.classification], ['estado', c => c.state], ['confianca', c => c.confidence], ['nivel_confianca', c => c.confidenceLevel], ['engine', c => c.engine.source ?? 'sem entrada'], ['motivos', c => c.reasons.join('; ')]];
const csv = v => (v == null ? '' : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync(out('cosmo-balance-1.1.csv'), `${[COLS.map(c => c[0]).join(','), ...result.cards.map(c => COLS.map(([, get]) => csv(get(c))).join(','))].join('\n')}\n`);

const s = result.summary, top = Number(arg('top', 12));
console.log(`Catálogo: ${s.total} cartas (${s.cut} cortadas). UNRESOLVED: ${s.unresolvedCards} cartas (${s.unresolvedSentences} frases). PARTIAL: ${s.partialCards} cartas (${s.partialSentences} frases). Sem Engine: ${s.noEngineCards}. Conflitos de sinal: ${s.signConflicts}.`);
for (const k of CLASS_ORDER) console.log(`  ${k}: ${s.classes[k]}`);
console.log('Confiança:', JSON.stringify(s.confidence), '\nMediana do desvio por facção:', JSON.stringify(s.factionMedian));
console.log('Propostas:', validations.map(v => `${v.key}:${v.status}`).join(' '));
console.log('Meta:', JSON.stringify({v: result.meta.engineVersion, catalog: result.meta.catalogVersion, catalogHash: result.meta.catalogHash, configHash: result.meta.configHash, index: result.meta.engineIndexHash, seed: result.meta.seed}));
const row = c => `${c.id} ${c.name} [${c.class} c${c.cost ?? '-'}] power ${c.power} / efetivo ${c.effectiveTotal} rel ${Math.round(c.relativeDeviation * 100)}% conf ${c.confidenceLevel}`;
const known = result.cards.filter(c => c.relativeDeviation != null && c.classification !== 'Análise inconclusiva').sort((a, b) => b.relativeDeviation - a.relativeDeviation);
console.log('\nMaiores desvios para cima:'); known.slice(0, top).forEach(c => console.log(' ', row(c)));
console.log('\nMaiores desvios para baixo:'); known.slice(-top).reverse().forEach(c => console.log(' ', row(c)));
