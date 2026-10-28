// Protocolo de decisão pendente (Alpha 0.1). A engine pergunta de forma síncrona (`ctx.decide`) no meio de uma
// resolução; aqui a pergunta sem resposta suspende a ação em vez de travar o navegador (sem confirm/prompt).
// Continuação determinística por replay: a ação parte sempre do mesmo snapshot e recebe as respostas já dadas, na
// ordem em que a engine perguntou. Custos, gatilhos e efeitos anteriores à pergunta rodam de novo sobre o estado
// restaurado, então nunca são aplicados duas vezes. A engine continua validando cada resposta (só opções legais).
// Timeout (G3-027): opcional → TIMEOUT_DECLINED; obrigatória → TIMEOUT_AUTO_CHOICE pela G3-030, na hora da pergunta
// (opções revalidadas no replay).
import {emit, RuleError} from './core.js';
import {timeoutAutoChoice} from './clock.js';

export class PendingDecision extends Error {
  constructor(request) { super(`decisão pendente: ${request.ability}`); this.request = request; }
}

// Cópia profunda que preserva funções (gatilhos e onClose da cadeia), Set e Map.
function clone(v) {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Set) return new Set([...v].map(clone));
  if (v instanceof Map) return new Map([...v].map(([k, x]) => [clone(k), clone(x)]));
  if (Array.isArray(v)) return v.map(clone);
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
}
// Restaura no mesmo objeto: fechamentos que guardam `state` ou `ctx.attached` continuam apontando para o lugar certo.
function assignInPlace(target, source) {
  for (const k of Object.keys(target)) if (!(k in source)) delete target[k];
  Object.assign(target, clone(source));
}
export function snapshot(state, ctx) { return {state: clone(state), attached: clone(ctx.attached)}; }
export function restore(state, ctx, snap) { assignInPlace(state, snap.state); assignInPlace(ctx.attached, snap.attached); }

// Pergunta da engine → pedido para a interface. `kind`: 'optional' (sim/não) ou 'choice' (obrigatória, entre `options`).
export function describe(player, q) {
  if (q.options) return {player, kind: 'choice', ability: q.ability, choose: q.choose, decision: q.decision, for: q.for, options: [...q.options], count: q.count || 1, multiple: !!q.count};
  if (q.cards) return {player, kind: 'choice', ability: q.ability, choose: 'top', options: [...q.cards], count: 1, multiple: false};
  return {player, kind: 'optional', ability: q.ability, uid: q.uid ?? null, source: q.source ?? null, amount: q.amount ?? null, cost: q.cost ?? null, god: q.god ?? null};
}

// Resposta: {value} ou {timeout: true}. Fora das opções legais é erro (a interface não escolhe pelo jogador).
function answer(state, req, a) {
  if (a.timeout) {
    if (req.kind === 'optional') { emit(state, 'TIMEOUT_DECLINED', {player: req.player, ability: req.ability}); return false; }
    const picked = timeoutAutoChoice(state, {player: req.player, options: req.options, count: req.count});
    return req.multiple ? picked : picked[0];
  }
  if (req.kind === 'optional') return Boolean(a.value);
  const list = req.multiple ? a.value : [a.value];
  if (!Array.isArray(list) || list.length !== req.count || new Set(list).size !== list.length || !list.every(o => req.options.includes(o))) {
    throw new RuleError('alvo', `${req.player}: resposta fora das opções legais de ${req.ability}`);
  }
  return a.value;
}

// Roda `fn` com as respostas já dadas. Pergunta nova → {pending} e o estado fica parado no ponto da pergunta (o que já
// aconteceu pode ser mostrado), com `state.pending` para a reconexão. Para continuar, `resume` restaura o snapshot
// e roda de novo com a resposta nova. Sem pergunta pendente → {done: true}.
export function runDecisions(state, ctx, fn, answers = [], snap = snapshot(state, ctx)) {
  const previous = ctx.decide;
  let asked = 0;
  ctx.decide = (player, q) => {
    const req = describe(player, q);
    if (asked < answers.length) return answer(state, req, answers[asked++]);
    throw new PendingDecision({...req, index: asked});
  };
  try {
    fn();
    delete state.pending;
    return {done: true, snap};
  } catch (e) {
    if (!(e instanceof PendingDecision)) throw e;
    state.pending = {...e.request};
    return {pending: e.request, snap, answers: [...answers]};
  } finally {
    ctx.decide = previous;
  }
}
export function resume(state, ctx, fn, suspended, reply) {
  restore(state, ctx, suspended.snap);
  return runDecisions(state, ctx, fn, [...suspended.answers, reply], suspended.snap);
}
