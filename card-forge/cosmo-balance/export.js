// Planilha do Cosmo Balance: as cartas da tela, na ordem da tela, com notas e propostas. Só leitura.
import {rowsToXlsx} from '../cards-xlsx.js?v=20261104-balance1';
import {proposalsFor} from './proposals.js';

const n2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const pct = (v) => (v == null ? null : Math.round(v * 100));
const SCORES = ['Body', 'Keyword', 'Effect', 'Synergy', 'Timing', 'Interaction', 'Restriction', 'Consistency'];
const COLUMNS = [
  ['ID', (c) => c.id, 18], ['Carta', (c) => c.name, 32], ['Nome PT', (c) => c.namePt, 32], ['Tipo', (c) => c.class, 12], ['Facção', (c) => c.faction, 10],
  ['Raridade', (c) => c.rarity, 11], ['Status', (c) => c.status, 13], ['Custo', (c) => c.cost, 7], ['Power', (c) => n2(c.power), 8], ['Efetivo', (c) => n2(c.effectiveTotal), 8],
  ['Desvio absoluto', (c) => n2(c.absoluteDeviation), 9], ['Desvio %', (c) => pct(c.relativeDeviation), 9], ['Relativo ao grupo %', (c) => pct(c.normalizedDeviation), 9], ['Estado', (c) => c.state, 11], ['Versão', (c) => c.cardVersion, 24], ['Classe', (c) => c.classification, 22],
  ['Confiança', (c) => c.confidenceLevel, 10], ['Confiança (nota)', (c) => n2(c.confidence), 10], ['Grupo', (c) => c.group, 18],
  ...SCORES.map((k) => [k, (c) => n2(c.scores[`${k}Score`]), 9]),
  ['Leitura do texto %', (c) => pct(c.coverage), 9], ['Engine', (c) => c.engine.source ?? 'sem entrada', 10],
  ['UNRESOLVED', (c) => c.unresolved.join('\n'), 40], ['Inconclusiva por', (c) => c.reasons.join('; '), 30], ['Habilidades', (c) => c.abilities.map((a) => a.raw).join('\n\n'), 70],
  ['Diagnóstico', (c, p) => p?.diagnosis, 50], ['Componentes', (c, p) => p?.components.join(', '), 30],
  ['Correções (não aplicadas)', (c, p) => p?.corrections.map((x) => `${x.change}: ${pct(x.deviationBefore)}% → ${pct(x.deviationAfter)}% (${x.classificationAfter})`).join('\n'), 50],
  ['Impacto estratégico', (c, p) => p?.strategicImpact, 40], ['Semelhantes', (c, p) => p?.similar.map((s) => s.name).join(', '), 40],
];

const needsProposal = (c) => c.classification !== 'Balanceada' && c.classification !== 'Análise inconclusiva';

export function balanceToXlsx(engine, cards, rawCards, result) {
  const rows = cards.map((c) => ({c, p: needsProposal(c) ? proposalsFor(engine, c, rawCards, result) : null}));
  return rowsToXlsx(COLUMNS.map(([t, get, w]) => [t, ({c, p}) => get(c, p), w]), rows);
}
