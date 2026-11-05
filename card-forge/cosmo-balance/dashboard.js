// Dashboard CARD FORGE > COSMO BALANCE. Roda no navegador, sobre as cartas carregadas; não envia nem grava nada.
import {CosmoBalanceEngine, CLASS_ORDER} from './engine.js';
import {proposalsFor} from './proposals.js';
import {overview, factions, curve, outliers, keywords, patches, simulation, reviewQueue} from './panels.js?v=20261105-balance11';
import {balanceToXlsx} from './export.js?v=20261104-balance1';

const $ = id => document.getElementById(id);
const escape = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const TABS = [['overview', 'Overview', overview], ['factions', 'Faction Balance', factions], ['curve', 'Cosmo Curve', curve], ['outliers', 'Power Outliers', outliers], ['keywords', 'Keyword Efficiency', keywords], ['patches', 'Balance Patches', patches], ['simulation', 'Simulation Results', simulation], ['review', 'Review Queue', reviewQueue], ['cards', 'Cartas', null]];
const pct = v => (v == null ? '—' : `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`);
const num = v => (v == null ? '—' : Number(v).toFixed(2));
const DIMENSIONS = ['BodyScore', 'KeywordScore', 'EffectScore', 'SynergyScore', 'TimingScore', 'InteractionScore', 'RestrictionScore'];
const COLUMNS = [
  ['Carta', c => c.name, c => escape(c.name)], ['Tipo', c => c.class, c => escape(c.class), 't'], ['Facção', c => c.faction, c => escape(c.faction), 't'], ['Custo', c => c.cost ?? -1, c => c.cost ?? '—'],
  ['Power', c => c.power ?? -99, c => num(c.power)], ['Efetivo', c => c.effectiveTotal ?? -99, c => num(c.effectiveTotal)], ['Desvio', c => c.relativeDeviation ?? -99, c => pct(c.relativeDeviation)],
  ['Classe', c => c.classification, c => escape(c.classification), 't'], ['Confiança', c => c.confidence ?? 0, c => `${escape(c.confidenceLevel)} ${num(c.confidence)}`, 't'],
];
const S = {catalog: null, index: null, patch: null, sim: null, engine: null, result: null, sort: 6, dir: -1, klass: '', id: null, tab: 'overview'};
function renderTab() {
  $('tabs').innerHTML = TABS.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${S.tab === id}">${label}</button>`).join('');
  const tab = TABS.find(t => t[0] === S.tab);
  $('cardsTab').hidden = !!tab[2];
  $('panel').hidden = !tab[2];
  if (tab[2]) $('panel').innerHTML = tab[2]({result: S.result, engine: S.engine, catalog: S.catalog, patch: S.patch, sim: S.sim, index: S.index});
}

// Só em máquina local ou no ambiente de desenvolvimento: o jogo oficial não mostra esta tela.
const developer = () => /^(localhost|127\.|\[::1\]|.*\.localhost$|.*\.test$)/.test(location.hostname) || /(^|\.)dev\./.test(location.hostname);

function compute() {
  let over = {};
  try { over = JSON.parse($('config').value || '{}'); $('status').textContent = ''; } catch (e) { $('status').textContent = `JSON inválido: ${e.message}`; return; }
  S.engine = new CosmoBalanceEngine({config: over, engineIndex: S.index});
  S.result = S.engine.analyze(S.catalog.cartas, S.catalog);
  fillSelect('fType', [...new Set(S.result.cards.map(c => c.class))].sort());
  fillSelect('fFaction', [...new Set(S.result.cards.map(c => c.faction))].sort());
  const m = S.result.meta;
  $('meta').textContent = `${m.engine} ${m.engineVersion} · catálogo ${m.catalogVersion} (${m.catalogHash}) · parâmetros ${m.configHash} · índice da Engine ${m.engineIndexHash} · seed ${m.seed} · Soul: ${Object.entries(m.souls).map(([k, v]) => `${k} ${v}`).join(', ')}`;
  renderStats(); renderRows(); renderDetail(); renderTab();
}
function fillSelect(id, options) {
  const el = $(id), value = el.value;
  el.innerHTML = `<option value="">Todos</option>${options.map(o => `<option>${escape(o)}</option>`).join('')}`;
  el.value = options.includes(value) ? value : '';
}
function renderStats() {
  const s = S.result.summary;
  const stat = (label, n, klass) => `<button type="button" class="cb__stat" data-class="${escape(klass)}" aria-pressed="${S.klass === klass}"><b>${n}</b><small>${escape(label)}</small></button>`;
  $('stats').innerHTML = stat('Todas as cartas', s.total, '') + CLASS_ORDER.map(k => stat(k, s.classes[k], k)).join('') + `<span class="cb__stat" style="cursor:default"><b>${s.unresolvedCards}</b><small>com UNRESOLVED</small></span><span class="cb__stat" style="cursor:default"><b>${s.noEngineCards}</b><small>sem Engine</small></span>`;
}
function visible() {
  const q = $('q').value.trim().toLowerCase(), type = $('fType').value, faction = $('fFaction').value, conf = $('fConf').value, unres = $('fUnres').checked;
  const col = COLUMNS[S.sort];
  return S.result.cards.filter(c =>
    (!q || c.name.toLowerCase().includes(q) || c.id.includes(q) || (c.namePt || '').toLowerCase().includes(q)) && (!type || c.class === type) && (!faction || c.faction === faction) &&
    (!conf || c.confidenceLevel === conf) && (!S.klass || c.classification === S.klass) && (!unres || c.unresolved.length),
  ).sort((a, b) => {
    const x = col[1](a), y = col[1](b);
    return (x > y ? 1 : x < y ? -1 : a.id.localeCompare(b.id)) * S.dir;
  });
}
function renderRows() {
  $('head').innerHTML = `<tr>${COLUMNS.map(([label], i) => `<th scope="col" data-col="${i}" aria-sort="${S.sort === i ? (S.dir > 0 ? 'ascending' : 'descending') : 'none'}">${label}</th>`).join('')}</tr>`;
  $('rows').innerHTML = visible().map(c => `<tr data-id="${escape(c.id)}" tabindex="0" class="${c.id === S.id ? 'is-on' : ''}">${COLUMNS.map(col => `<td class="${col[3] || ''}">${col[2](c)}</td>`).join('')}</tr>`).join('');
}
function renderDetail() {
  const c = S.result.cards.find(x => x.id === S.id);
  if (!c) { $('detail').innerHTML = '<p class="cb__muted">Escolha uma carta.</p>'; return; }
  const max = Math.max(1, ...DIMENSIONS.map(k => Math.abs(c.scores[k] ?? 0)));
  const bars = DIMENSIONS.map(k => { const v = c.scores[k] ?? 0; return `<span>${k.replace('Score', '')}</span><span><span class="cb__bar ${k === 'RestrictionScore' ? 'neg' : ''}" style="display:block;width:${Math.round(Math.abs(v) / max * 100)}%"></span></span><span style="text-align:right">${k === 'RestrictionScore' && v ? '−' : ''}${num(v)}</span>`; }).join('');
  const p = c.classification === 'Balanceada' || c.classification === 'Análise inconclusiva' ? null : proposalsFor(S.engine, c, S.catalog.cartas, S.result);
  const eff = c.effectiveCost;
  $('detail').innerHTML = `
    <h2>${escape(c.name)}</h2>
    <p class="cb__muted">${escape(c.id)}${c.version ? ` · ${escape(c.version)}` : ''} · ${escape(c.faction)} · ${escape(c.type)}${c.subtypes.length ? ` — ${escape(c.subtypes.join(', '))}` : ''} · ${escape(c.rarity)} (não pontua) · ${escape(c.status)}</p>
    <p><b>${escape(c.classification)}</b> · grupo ${escape(c.group)} · desvio ${pct(c.relativeDeviation)} (${num(c.absoluteDeviation)} Cosmo; ${pct(c.normalizedDeviation)} no grupo) · ${escape(c.state)} · confiança ${escape(c.confidenceLevel)} ${num(c.confidence)}</p>
    ${c.bandCrossesCurve ? '<p class="cb__warn">A incerteza do modelo cobre a curva: depende de calibração.</p>' : ''}
    ${c.reasons.length ? `<p class="cb__warn">Inconclusiva: ${escape(c.reasons.join('; '))}.</p>` : ''}
    <h3>Power Score ${num(c.power)}</h3><div class="cb__bars">${bars}</div>
    <p class="cb__muted">Consistência ${num(c.scores.ConsistencyScore)} (fora da soma). ${c.type === 'God' ? 'Sem custo: perfil em Faction Balance.' : c.type === 'Domain' && eff ? `Custo efetivo ${num(eff.total)} = entrada ${eff.entry} (§63) + adicional ${eff.additional} + oportunidade do slot ${num(eff.slotOpportunity)}. Linha geral ${num(c.domainProfile.general)}, Ressonância ${num(c.domainProfile.resonance)}.` : eff ? `Custo efetivo ${num(eff.total)} = impresso ${eff.printed} + oportunidade ${eff.opportunity} + adicional ${eff.additional} + Equip esperado ${eff.equip}.` : ''} Leitura do texto ${Math.round(c.coverage * 100)}%; Engine: ${escape(c.engine.source ?? 'sem entrada')}${c.engine.source === 'v6' ? ` (${c.engine.confirmed}/${c.engine.effects} efeitos confirmados)` : ''}.</p>
    ${c.interactions.length ? `<p class="cb__muted">Interações: ${c.interactions.map(i => `${escape(i.label)} ${num(i.value)}`).join('; ')}.</p>` : ''}
    ${c.bodyContext ? `<p class="cb__muted">Corpo contra o catálogo: elimina ${Math.round(c.bodyContext.killShare * 100)}% dos Devotees, sobrevive a ${Math.round(c.bodyContext.surviveShare * 100)}%, ${num(c.bodyContext.soulPressure)} de pressão na Soul.</p>` : ''}
    <p class="cb__muted">Versão: ${escape(c.cardVersion)}.</p>
    <h3>Habilidades</h3>${c.abilities.length ? c.abilities.map(a => `<div class="cb__ability"><p>${escape(a.raw)}</p><p class="cb__muted">${escape(a.kind)}${a.trigger ? ` · ${escape(a.trigger)}` : ''}${a.frequency ? ` · ${escape(a.frequency)}` : ''} · ${a.uses} uso(s) · p ${a.probability} · valor ${a.value}${a.penalty ? ` · penalidade ${a.penalty}` : ''}</p><p class="cb__muted">${a.effects.map(f => `${escape(f.kind)}${f.amount != null ? ` ${f.amount}` : ''} (${f.perUse}${f.estimated ? ', estimado' : ''}${f.evidence === 'confirmado' ? '' : `, ${escape(f.evidence)}`})`).join(' · ') || 'sem efeito próprio'}</p>${a.unresolved.map(u => `<p class="cb__warn">UNRESOLVED: ${escape(u)}</p>`).join('')}${a.partial.map(u => `<p class="cb__warn">PARTIAL: ${escape(u.text)}</p>`).join('')}</div>`).join('') : '<p class="cb__muted">Sem habilidades.</p>'}
    ${p ? `<h3>Proposta (não aplicada)</h3><p>${escape(p.diagnosis)}</p><p class="cb__muted">Componentes: ${escape(p.components.join(', '))}. ${escape(p.strategicImpact)}</p>
      <ul>${p.corrections.map(x => `<li><b>${escape(x.change)}</b>: ${pct(x.deviationBefore)} → ${pct(x.deviationAfter)} (${escape(x.classificationAfter)}). ${escape(x.otherDecks)}</li>`).join('') || '<li>Sem correção mínima que aproxime da curva.</li>'}</ul>
      <p class="cb__muted">Semelhantes: ${p.similar.map(s => `${escape(s.name)} (${escape(s.faction)}, custo ${s.cost ?? '—'}, ${pct(s.deviation)})`).join('; ') || 'nenhuma'}.</p>` : ''}`;
}

$('stats').addEventListener('click', e => { const b = e.target.closest('[data-class]'); if (b) { S.klass = b.dataset.class; renderStats(); renderRows(); } });
$('head').addEventListener('click', e => { const th = e.target.closest('[data-col]'); if (!th) return; const i = Number(th.dataset.col); S.dir = S.sort === i ? -S.dir : -1; S.sort = i; renderRows(); });
const open = row => { S.id = row.dataset.id; renderRows(); renderDetail(); };
$('rows').addEventListener('click', e => { const row = e.target.closest('[data-id]'); if (row) open(row); });
$('rows').addEventListener('keydown', e => { const row = e.target.closest('[data-id]'); if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(row); } });
for (const id of ['q', 'fType', 'fFaction', 'fConf', 'fUnres']) $(id).addEventListener('input', renderRows);
$('apply').addEventListener('click', compute);
$('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { S.tab = b.dataset.tab; renderTab(); } });
$('panel').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) { S.id = b.dataset.open; S.tab = 'cards'; renderRows(); renderDetail(); renderTab(); } });
$('exportXlsx').addEventListener('click', () => {
  const cards = visible();
  const blob = new Blob([balanceToXlsx(S.engine, cards, S.catalog.cartas, S.result)], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(blob), download: `cosmo-balance-1.1-${new Date().toISOString().slice(0, 10)}.xlsx`});
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('status').textContent = `Excel com ${cards.length} cartas exportado.`;
});

if (!developer()) {
  $('main').innerHTML = '<p class="cb__banner">Cosmo Balance só abre no ambiente Developer.</p>';
} else {
  $('status').textContent = 'Carregando…';
  const load = url => fetch(url).then(r => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); });
  Promise.all([load('../data/cards.json'), load('cosmo-balance/engine-index.json'), load('cosmo-balance/patches/balance-patch-001.json'), fetch('out/cosmo-balance-sim.json').then(r => (r.ok ? r.json() : null)).catch(() => null)]).then(([catalog, index, patch, sim]) => {
    S.catalog = catalog; S.index = index; S.patch = patch; S.sim = sim; $('status').textContent = ''; compute();
  }).catch(e => { $('status').textContent = `Falha ao carregar: ${e.message}`; });
}
