// Patches experimentais: propostas versionadas sobre uma CÓPIA do catálogo. Só o ambiente Developer as carrega.
// Fluxo do autor: Card Forge → Experimental Patch → Engine Tests → Developer Approval → Versioned Canonical Publication.
import {clean} from './normalize.js';

export const PATCH_FLOW = ['DRAFT', 'READY_FOR_TEST', 'TESTED', 'APPROVED', 'PUBLISHED'];
export const SCENARIOS = {A: {label: 'Catálogo atual', groups: []}, B: {label: 'Oito prioritárias (grupo A)', groups: ['A']}, C: {label: 'Doze propostas (grupos A e B)', groups: ['A', 'B']}};
export const NEEDS_REVIEW = 'NEEDS_REVIEW';
export const VALIDATED = 'VALIDATED';
const clone = o => JSON.parse(JSON.stringify(o));
const lines = v => (Array.isArray(v) ? v : [v]);
const devOnly = env => { if (env !== 'developer') throw new Error(`Patch experimental só carrega no ambiente Developer (pedido: ${env ?? 'nenhum'}).`); };

// Os seis passos pedidos pelo autor. Qualquer divergência vira NEEDS_REVIEW e a proposta não é aplicada: nada de improviso.
export function validateProposal(p, rawCards, engineIndex = {}) {
  const raw = rawCards.find(c => c.id === p.cardId), checks = [];
  const check = (name, ok, detail = '') => checks.push({name, ok: !!ok, detail});
  check('Carta localizada pelo id canônico', raw, p.cardId);
  if (raw) {
    check('Nome confere', raw.nome_exibicao_en === p.name, raw.nome_exibicao_en);
    check('Facção confere', raw.faccao === p.faction, raw.faccao);
    for (const c of p.changes) {
      if (c.field === 'custo') check(`Custo atual é ${c.from}`, raw.custo === c.from, String(raw.custo));
      else {
        const hits = lines(raw[c.field] || []).filter(t => t.includes(c.match)).length;
        check(`Texto a mudar existe em ${c.field}`, hits === 1, `"${c.match}": ${hits} linha(s)`);
      }
    }
    const text = clean((raw.habilidades_en || []).join(' '));
    for (const piece of p.mustContain || []) check(`Efeito citado existe: ${piece}`, text.includes(clean(piece)), piece);
    const entry = engineIndex.cards?.[p.cardId];
    if (engineIndex.cards) check(p.engine === 'override' ? 'Entrada V6 pode receber override de teste' : 'Engine lê o custo da carta', p.engine === 'override' ? entry?.source === 'v6' : true, entry?.source ?? 'sem entrada');
  }
  return {key: p.key, cardId: p.cardId, status: checks.every(c => c.ok) ? VALIDATED : NEEDS_REVIEW, checks, engineCompat: p.engine === 'cost' ? 'Custo: a Engine lê do catálogo; basta a cópia experimental.' : 'Valor no código da carta: só no override de teste (tools/cosmo-balance-overrides.mjs). Publicar exigiria mudar playtest/engine-v3.'};
}
export const validatePatch = (patch, rawCards, engineIndex) => patch.proposals.map(p => validateProposal(p, rawCards, engineIndex));

const applyChanges = (raw, p, patchId) => {
  const out = clone(raw);
  for (const c of p.changes) {
    if (c.field === 'custo') out.custo = c.to;
    else out[c.field] = lines(out[c.field]).map(t => t.replace(c.match, c.replace));
  }
  out._patchVersion = `${raw.id}@${patchId}#${p.key}`;
  return out;
};

// Catálogo experimental. O original não muda. Proposta sem validação não entra e fica em `skipped`.
export function applyPatch(rawCards, patch, {env, groups = ['A', 'B'], only = null, without = [], engineIndex = {}} = {}) {
  devOnly(env);
  const validations = validatePatch(patch, rawCards, engineIndex);
  const active = [], skipped = [], byId = new Map();
  for (const p of patch.proposals) {
    if (!groups.includes(p.group) || (only && !only.includes(p.key)) || without.includes(p.key)) continue;
    if (validations.find(v => v.key === p.key).status !== VALIDATED) { skipped.push(p.key); continue; }
    active.push(p.key);
    byId.set(p.cardId, applyChanges(rawCards.find(c => c.id === p.cardId), p, patch.id));
  }
  return {cards: rawCards.map(c => byId.get(c.id) || c), active, skipped, versions: [...byId.values()].map(c => c._patchVersion)};
}

// Reversão: desfaz cada mudança e devolve a carta exatamente como era.
export function revertPatch(patchedCards, patch) {
  return patchedCards.map(c => {
    if (!c._patchVersion) return c;
    const p = patch.proposals.find(x => x.cardId === c.id);
    const out = clone(c);
    delete out._patchVersion;
    for (const ch of p.changes) {
      if (ch.field === 'custo') out.custo = ch.from;
      else out[ch.field] = lines(out[ch.field]).map(t => t.replace(ch.replace, ch.match));
    }
    return out;
  });
}

// CURRENT / PROPOSED / DIFFERENCE, com o Power antes e depois contra a mesma linha de base.
export function compareProposal(engine, p, rawCards, result) {
  const raw = rawCards.find(c => c.id === p.cardId), before = result.cards.find(c => c.id === p.cardId);
  if (!raw || !before) return null;
  const after = engine.rescore(applyChanges(raw, p, 'preview'), result);
  const rows = p.changes.filter(c => c.field !== 'habilidades_pt').map(c => (c.field === 'custo'
    ? {label: 'Cost', current: c.from, proposed: c.to, difference: `${c.to - c.from > 0 ? '+' : ''}${c.to - c.from} Cosmo`}
    : {label: 'Texto', current: c.match, proposed: c.replace, difference: 'Texto'}));
  return {key: p.key, group: p.group, cardId: p.cardId, name: p.name, faction: p.faction, reason: p.reason, impact: p.impact, rows, before: {power: before.power, effective: before.effectiveTotal, relative: before.relativeDeviation, classification: before.classification}, after: {power: after.power, effective: after.effectiveTotal, relative: after.relativeDeviation, classification: after.classification}};
}

// Avança um passo do fluxo. Só o próximo status, ou voltar a DRAFT. PUBLISHED não existe nesta etapa.
export function transition(patch, to, {by, date, note = '', validations = null} = {}) {
  if (!PATCH_FLOW.includes(to)) throw new Error(`Status desconhecido: ${to}`);
  if (!by || !date) throw new Error('Toda mudança de status registra quem e quando.');
  if (to === 'PUBLISHED') throw new Error('Publicação versionada não existe nesta etapa: nada sai do ambiente Developer.');
  const next = PATCH_FLOW[PATCH_FLOW.indexOf(patch.status) + 1];
  if (to !== 'DRAFT' && to !== next) throw new Error(`De ${patch.status} só se vai a ${next} ou DRAFT.`);
  if (to === 'READY_FOR_TEST' && !validations?.length) throw new Error('READY_FOR_TEST exige validar as propostas.');
  if (to === 'READY_FOR_TEST' && validations.some(v => v.status !== VALIDATED)) throw new Error('Há proposta em NEEDS_REVIEW.');
  if (to === 'TESTED' && !patch.simulation?.runs?.length) throw new Error('TESTED exige resultado de simulação registrado.');
  if (to === 'APPROVED' && /claude|agente|bot/i.test(by)) throw new Error('APPROVED exige aprovação humana.');
  return {...patch, status: to, approval: to === 'APPROVED' ? {by, date, note} : to === 'DRAFT' ? null : patch.approval, history: [...patch.history, {status: to, by, date, note}]};
}
