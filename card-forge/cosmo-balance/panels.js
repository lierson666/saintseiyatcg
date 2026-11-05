// Painéis do COSMO BALANCE. Só desenham: recebem a análise pronta e não gravam nada.
import {CLASSES, CLASS_ORDER, unresolvedLedger} from './engine.js';
import {compareProposal, validatePatch, applyPatch, PATCH_FLOW, SCENARIOS} from './patches.js';

export const escape = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const pct = v => (v == null ? '—' : `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`);
export const num = v => (v == null ? '—' : Number(v).toFixed(2));
const rate = v => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
const ci = c => (c ? `${Math.round(c[0] * 100)}–${Math.round(c[1] * 100)}%` : '—');
const median = list => { if (!list.length) return null; const s = [...list].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const scored = cards => cards.filter(c => c.relativeDeviation != null && c.status !== 'cortado' && c.type !== 'God');

const table = (headers, rows, cls = '') => `<div class="cb__wrap"><table class="cb__data ${cls}"><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
// Barra com linha de base: positivo à direita, negativo à esquerda. O número ao lado leva a informação; a cor só repete o sinal.
const signedBar = (label, value, max, text, tip) => {
  const w = max ? Math.min(50, Math.abs(value ?? 0) / max * 50) : 0;
  const style = (value ?? 0) >= 0 ? `left:50%;width:${w}%` : `right:50%;width:${w}%`;
  return `<div class="cb__row" title="${escape(tip || `${label}: ${text}`)}"><span class="cb__rowlabel">${escape(label)}</span><span class="cb__track"><span class="cb__zero"></span><span class="cb__fill ${(value ?? 0) >= 0 ? 'pos' : 'neg'}" style="${style}"></span></span><span class="cb__rowvalue">${escape(text)}</span></div>`;
};
const plainBar = (label, value, max, text, tip) => `<div class="cb__row" title="${escape(tip || `${label}: ${text}`)}"><span class="cb__rowlabel">${escape(label)}</span><span class="cb__track"><span class="cb__fill pos" style="left:0;width:${max ? value / max * 100 : 0}%"></span></span><span class="cb__rowvalue">${escape(text)}</span></div>`;

export function overview({result}) {
  const s = result.summary, cards = result.cards;
  const max = Math.max(...CLASS_ORDER.map(k => s.classes[k]));
  const strong = s.classes[CLASSES.ABOVE] + s.classes[CLASSES.BROKEN], weak = s.classes[CLASSES.BELOW] + s.classes[CLASSES.WEAK];
  const tile = (n, label) => `<div class="cb__tile"><b>${n}</b><small>${escape(label)}</small></div>`;
  return `<div class="cb__tiles">${tile(s.total, 'cartas no catálogo')}${tile(strong, 'fortes')}${tile(s.classes[CLASSES.OK], 'equilibradas')}${tile(weak, 'fracas')}${tile(s.classes[CLASSES.UNKNOWN], 'inconclusivas')}${tile(s.unresolvedCards + s.partialCards, 'com leitura pendente')}${tile(s.signConflicts, 'conflitos de sinal')}</div>
    <h3>Distribuição</h3><div class="cb__chart">${CLASS_ORDER.map(k => plainBar(k, s.classes[k], max, String(s.classes[k]))).join('')}</div>
    <h3>Por tipo</h3>${table(['Tipo', 'Cartas', 'Fortes', 'Equilibradas', 'Fracas', 'Inconclusivas', 'Mediana'], [...new Set(cards.map(c => c.class))].sort().map(k => {
      const list = cards.filter(c => c.class === k), count = (...cs) => list.filter(c => cs.includes(c.classification)).length;
      return [escape(k), list.length, count(CLASSES.ABOVE, CLASSES.BROKEN), count(CLASSES.OK), count(CLASSES.BELOW, CLASSES.WEAK), count(CLASSES.UNKNOWN), pct(median(scored(list).map(c => c.relativeDeviation)))];
    }))}
    <p class="cb__muted">Classe vem do desvio com sinal, Power contra custo efetivo. Mediana perto de zero em cada tipo é ajuste do catálogo (<code>effectScale</code>), não resultado de partida.</p>`;
}

export function factions({result, sim}) {
  const list = scored(result.cards), names = [...new Set(result.cards.map(c => c.faction))].sort();
  const rows = names.map(f => ({f, cards: list.filter(c => c.faction === f)})).map(({f, cards}) => ({f, cards, m: median(cards.map(c => c.relativeDeviation))}));
  const max = Math.max(...rows.map(r => Math.abs(r.m ?? 0)), 0.01);
  const gods = result.cards.filter(c => c.type === 'God');
  const axis = ['recursos', 'controle', 'ofensiva', 'defesa'];
  const simA = sim?.runs?.A?.byFaction;
  return `<h3>Mediana do desvio por facção</h3><div class="cb__chart">${rows.map(r => signedBar(r.f, r.m, max, pct(r.m), `${r.f}: ${r.cards.length} cartas com nota`)).join('')}</div>
    ${table(['Facção', 'Cartas', 'Fortes', 'Fracas', 'Win rate (A)', 'IC 95%'], rows.map(r => [escape(r.f), r.cards.length, r.cards.filter(c => [CLASSES.ABOVE, CLASSES.BROKEN].includes(c.classification)).length, r.cards.filter(c => [CLASSES.BELOW, CLASSES.WEAK].includes(c.classification)).length, simA?.[r.f.toLowerCase()] ? rate(simA[r.f.toLowerCase()].rate) : '—', simA?.[r.f.toLowerCase()] ? ci(simA[r.f.toLowerCase()].ci95) : '—']))}
    <h3>Gods: perfil, sem custo artificial</h3>${table(['God', 'Soul', 'Awaken em', ...axis, 'Ativadas / passivas', 'Cosmo nas ativadas'], gods.map(c => { const p = c.godProfile; return [escape(c.name), p.soul, p.awakenAtSoul, ...axis.map(a => num(p.axes[a])), `${p.activated} / ${p.passive}`, p.cosmo]; }))}
    <p class="cb__muted">Eixos em Cosmo estimado. Gods não têm Attack (§24) e não recebem proposta sem análise específica. Matchups vêm da simulação, com deck e IA do teste.</p>`;
}

export function curve({result}) {
  const list = scored(result.cards).filter(c => c.cost != null && c.type !== 'Domain');
  const costs = [...new Set(list.map(c => c.cost))].sort((a, b) => a - b).map(cost => { const cs = list.filter(c => c.cost === cost); return {cost, cs, m: median(cs.map(c => c.relativeDeviation))}; });
  const maxN = Math.max(...costs.map(c => c.cs.length)), maxM = Math.max(...costs.map(c => Math.abs(c.m ?? 0)), 0.01);
  return `<h3>Cartas por custo</h3><div class="cb__chart">${costs.map(c => plainBar(`Custo ${c.cost}`, c.cs.length, maxN, String(c.cs.length))).join('')}</div>
    <h3>Eficiência por custo (mediana do desvio)</h3><div class="cb__chart">${costs.map(c => signedBar(`Custo ${c.cost}`, c.m, maxM, pct(c.m))).join('')}</div>
    ${table(['Custo', 'Cartas', 'Power mediano', 'Efetivo mediano', 'Devotee', 'Moment', 'Technique', 'Equipment'], costs.map(c => { const cnt = k => c.cs.filter(x => x.class === k).length; return [c.cost, c.cs.length, num(median(c.cs.map(x => x.power))), num(median(c.cs.map(x => x.effectiveTotal))), cnt('Devotee'), cnt('Moment'), cnt('Technique'), cnt('Equipment')]; }))}`;
}

export function outliers({result}) {
  const list = scored(result.cards).filter(c => c.classification !== CLASSES.UNKNOWN).sort((a, b) => b.relativeDeviation - a.relativeDeviation || a.id.localeCompare(b.id));
  const rows = cs => cs.map(c => [`<button type="button" class="cb__link" data-open="${escape(c.id)}">${escape(c.name)}</button>`, escape(c.class), num(c.power), num(c.effectiveTotal), pct(c.relativeDeviation), `${escape(c.confidenceLevel)} ${num(c.confidence)}`, c.bandCrossesCurve ? 'depende de calibração' : '']);
  const head = ['Carta', 'Tipo', 'Power', 'Efetivo', 'Desvio', 'Confiança', 'Nota'];
  return `<h3>Maiores desvios para cima</h3>${table(head, rows(list.slice(0, 15)))}<h3>Maiores desvios para baixo</h3>${table(head, rows(list.slice(-15).reverse()))}`;
}

export function keywords({result}) {
  const devs = scored(result.cards).filter(c => c.type === 'Devotee');
  const names = ['Guardian', 'Nimble', 'Long Range', 'Pierce', 'Impulse'];
  const rows = names.map(k => {
    const has = devs.filter(c => c.keywords.includes(k)), not = devs.filter(c => !c.keywords.includes(k));
    const diff = has.length ? median(has.map(c => c.relativeDeviation)) - median(not.map(c => c.relativeDeviation)) : null;
    return {k, has, diff, atk: median(has.map(c => c.attack))};
  });
  const max = Math.max(...rows.map(r => Math.abs(r.diff ?? 0)), 0.01);
  const pairs = {};
  for (const c of result.cards) for (const i of c.interactions || []) { (pairs[i.label] ||= []).push(i.value); }
  return `<h3>Devotees com a keyword contra os sem ela</h3><div class="cb__chart">${rows.map(r => signedBar(r.k, r.diff, max, r.diff == null ? 'sem cartas' : pct(r.diff), `${r.k}: ${r.has.length} Devotees`)).join('')}</div>
    ${table(['Keyword', 'Devotees', 'Attack mediano', 'Valor mediano', 'Regra'], rows.map(r => [r.k, r.has.length, r.atk ?? '—', num(median(r.has.map(c => c.scores.KeywordScore))), {Guardian: '§12', Nimble: '§43', 'Long Range': '§25', Pierce: '§46', Impulse: '§47'}[r.k]]))}
    <h3>Interações registradas</h3>${table(['Interação', 'Cartas', 'Contribuição mediana'], Object.entries(pairs).sort().map(([k, v]) => [escape(k), v.length, num(median(v))]))}
    <p class="cb__muted">Diferença de mediana entre grupos, sem controlar custo nem facção. É correlação do modelo, não impacto medido em partida.</p>`;
}

export function patches({result, engine, catalog, patch, index, sim}) {
  const raw = catalog.cartas, validations = validatePatch(patch, raw, index);
  const compare = patch.proposals.map(p => ({p, v: validations.find(x => x.key === p.key), c: compareProposal(engine, p, raw, result)}));
  const step = PATCH_FLOW.map(s => `<li class="${s === patch.status ? 'is-on' : ''}">${s}</li>`).join('');
  const fields = [['ID', patch.id], ['Versão', patch.version], ['Ambiente', patch.environment], ['Autor', patch.author], ['Data', patch.date], ['Cartas', patch.proposals.length], ['Aprovação', patch.approval ? `${patch.approval.by}, ${patch.approval.date}` : 'nenhuma'], ['Simulações registradas', patch.simulation.runs.length]];
  const card = ({p, v, c}) => `<article class="cb__prop"><header><b>${p.key} · ${escape(p.name)}</b> <span class="cb__chip ${v.status === 'VALIDATED' ? '' : 'warn'}">${v.status}</span></header>
    <p class="cb__muted">${escape(p.faction)} · grupo ${p.group} · ${escape(p.cardId)}</p>
    ${table(['', 'Current', 'Proposed', 'Difference'], (c?.rows || []).map(r => [r.label, escape(r.current), escape(r.proposed), escape(r.difference)]).concat(c ? [['Power', num(c.before.power), num(c.after.power), num(c.after.power - c.before.power)], ['Efetivo', num(c.before.effective), num(c.after.effective), num(c.after.effective - c.before.effective)], ['Desvio', pct(c.before.relative), pct(c.after.relative), `${escape(c.before.classification)} → ${escape(c.after.classification)}`]] : []))}
    <p><b>Impact:</b> ${escape(p.impact)}</p><p class="cb__muted">${escape(p.reason)} ${escape(v.engineCompat)}</p>
    ${v.status === 'VALIDATED' ? '' : `<p class="cb__warn">${escape(v.checks.filter(x => !x.ok).map(x => `${x.name}: ${x.detail}`).join('; '))}</p>`}</article>`;
  const dist = Object.keys(SCENARIOS).map(name => {
    const {cards: copy} = applyPatch(raw, patch, {env: 'developer', groups: SCENARIOS[name].groups, engineIndex: index});
    const after = copy.map(c => (c._patchVersion ? engine.rescore(c, result).classification : result.cards.find(x => x.id === c.id).classification));
    return [`${name}: ${escape(SCENARIOS[name].label)}`, ...CLASS_ORDER.map(k => after.filter(x => x === k).length)];
  });
  return `<h3>${escape(patch.name)} · ${escape(patch.id)}</h3><ol class="cb__flow">${step}</ol>
    <dl class="cb__facts">${fields.map(([k, v]) => `<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl>
    <p class="cb__banner">Só propostas: as cartas originais seguem intactas e o jogo oficial não carrega este patch. Status muda por <code>node tools/cosmo-balance-patch.mjs status &lt;STATUS&gt; --by &lt;nome&gt;</code>; PUBLISHED está bloqueado nesta etapa. Reverter é desligar a proposta: o catálogo nunca foi tocado.</p>
    <h3>Efeito na classificação (Patch Comparison)</h3>${table(['Cenário', ...CLASS_ORDER], dist)}
    <h3>Grupo A: oito prioritárias</h3><div class="cb__props">${compare.filter(x => x.p.group === 'A').map(card).join('')}</div>
    <h3>Grupo B: testes separados</h3><div class="cb__props">${compare.filter(x => x.p.group === 'B').map(card).join('')}</div>
    <h3>Histórico</h3>${table(['Status', 'Por', 'Data', 'Nota'], patch.history.map(h => [h.status, escape(h.by), h.date, escape(h.note)]))}
    <p class="cb__muted">Resultados de simulação na aba Simulation Results${sim ? '' : ' (ainda não executada)'}.</p>`;
}

export function simulation({sim, patch}) {
  if (!sim) return `<p>Simulação não executada nesta máquina. Nenhum número aqui é estimado.</p><p><code>node tools/cosmo-balance-sim.mjs --games 20 --scenarios A,B,C</code></p>`;
  const main = ['A', 'B', 'C'].filter(n => sim.runs[n]), abl = Object.keys(sim.runs).filter(n => n.startsWith('A+'));
  const fac = [...new Set(main.flatMap(n => Object.keys(sim.runs[n].byFaction)))].sort();
  const base = sim.runs.A;
  const decks = base ? Object.keys(base.byDeck) : [];
  const matchups = base ? Object.entries(base.matchups).filter(([, m]) => m.n >= 10).sort((a, b) => b[1].rate - a[1].rate) : [];
  return `<p class="cb__banner"><b>${escape(sim.warning)}</b> ${sim.matchesPerScenario} partidas por cenário, ${sim.games} por lado de cada par, IA ${escape(sim.level)}, seed ${sim.seed}, ${sim.decks.length} decks. Patch ${escape(sim.patch.id)} ${escape(sim.patch.status)}.</p>
    <h3>Cenários</h3>${table(['Cenário', 'Mudanças ativas', 'Partidas', 'Quem começa vence', 'Round médio', 'Soul por partida', 'Soul por Cosmo', 'Erros'], main.map(n => { const r = sim.runs[n]; return [`${n}: ${escape(r.label)}`, r.active.join(', ') || 'nenhuma', r.matches, `${rate(r.firstPlayer)} (${ci(r.firstPlayerCi95)})`, num(r.victoryRoundMean), num(r.soulDamagePerMatch), num(r.soulDamagePerCosmo), Object.values(r.errors).reduce((a, b) => a + b, 0)]; }))}
    <h3>Win rate por facção (fora de espelho)</h3>${table(['Facção', ...main.map(n => `${n} (IC 95%)`)], fac.map(f => [escape(f), ...main.map(n => { const r = sim.runs[n].byFaction[f]; return r ? `${rate(r.rate)} (${ci(r.ci95)})` : '—'; })]))}
    <h3>Win rate por deck</h3>${table(['Deck', ...main.map(n => `${n} (IC 95%)`)], decks.map(d => [escape(d), ...main.map(n => { const r = sim.runs[n].byDeck[d]; return r ? `${rate(r.rate)} (${ci(r.ci95)})` : '—'; })]))}
    ${abl.length ? `<h3>Ablação: só uma mudança ligada, contra o cenário A</h3>${table(['Mudança', 'Carta', 'Facção', 'Win rate da facção', 'Diferença', 'Jogadas no A', 'Jogadas com a mudança'], abl.map(n => { const key = n.slice(2), p = patch.proposals.find(x => x.key === key), f = p.faction.toLowerCase(), r = sim.runs[n], a = r.byFaction[f]?.rate, b = base?.byFaction[f]?.rate; return [key, escape(p.name), escape(p.faction), a == null ? 'sem deck' : `${rate(a)} (${ci(r.byFaction[f].ci95)})`, a == null || b == null ? '—' : pct(a - b), base?.usage[p.cardId] ?? 0, r.usage[p.cardId] ?? 0]; }))}<p class="cb__muted">Carta que não aparece jogada não pode explicar diferença alguma; a variação ali é ruído de partidas divergentes. Aparecer em deck vencedor não prova causa.</p>` : ''}
    ${matchups.length ? `<h3>Matchups no cenário A</h3>${table(['Confronto', 'Partidas', 'Vitórias do primeiro', 'IC 95%'], matchups.map(([k, m]) => [escape(k), m.n, rate(m.rate), ci(m.ci95)]))}` : ''}
    <p class="cb__muted">Catálogo simulado ${escape(sim.simCatalogHash)}; ${sim.simCatalogDrift.length} carta(s) diferem de data/cards.json. Índice da Engine ${escape(sim.engineIndexHash)}.</p>`;
}

export function reviewQueue({result, index, patch, catalog}) {
  const ledger = unresolvedLedger(result.cards, index);
  const review = validatePatch(patch, catalog.cartas, index).filter(v => v.status !== 'VALIDATED');
  const noEngine = result.cards.filter(c => c.abilities.length && !c.engine.source);
  const gods = result.cards.filter(c => c.type === 'God');
  const inconclusive = result.cards.filter(c => c.classification === CLASSES.UNKNOWN && !c.unresolved.length && !c.partial.length && c.type !== 'God');
  return `<h3>Habilidades pendentes (${ledger.length})</h3>${table(['Carta', 'Estado', 'Texto', 'Engine 3.0', 'Motivo', 'Avaliação'], ledger.map(l => [`<button type="button" class="cb__link" data-open="${escape(l.id)}">${escape(l.name)}</button>`, l.state, escape(l.text), escape(l.engine), escape(l.reason), l.evaluation]), 'cb__wide')}
    <h3>Propostas em NEEDS_REVIEW (${review.length})</h3>${review.length ? table(['Proposta', 'Carta', 'Divergência'], review.map(v => [v.key, escape(v.cardId), escape(v.checks.filter(c => !c.ok).map(c => c.name).join('; '))])) : '<p class="cb__muted">Nenhuma.</p>'}
    <h3>Texto sem entrada na Engine (${noEngine.length})</h3><p class="cb__muted">${noEngine.map(c => escape(c.id)).join(', ')}</p>
    <h3>Gods aguardando análise específica (${gods.length})</h3><p class="cb__muted">${gods.map(c => escape(c.name)).join(', ')}. Sem proposta até haver decisão.</p>
    <h3>Outras inconclusivas (${inconclusive.length})</h3>${table(['Carta', 'Motivo'], inconclusive.map(c => [escape(c.id), escape(c.reasons.join('; '))]))}`;
}
