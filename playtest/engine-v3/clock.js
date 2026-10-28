// Relógio competitivo do Alpha 0.1 (parâmetros aprovados, G3-024). Puro: o tempo entra como `now` em segundos,
// então o mesmo histórico dá o mesmo resultado (replay). Animações pausam o relógio (G3-025).
// O relógio de um jogador = tempo básico do próprio turno + reserva. Quem está decidindo gasta o próprio relógio:
// no turno próprio, básico e depois reserva; fora dele (janela de resposta), só a reserva (G3-026, G3-031).
// G3-031: o básico só existe no turno próprio (zera no END TURN e volta cheio no próximo turno próprio); responder no
// turno adversário nunca reduz o básico seguinte; reserva no teto 180; sem decisão atribuída, nenhum relógio corre.
import {emit} from './core.js';

export const ALPHA_CLOCK = Object.freeze({basic: 60, reserveStart: 90, reserveMax: 180, carry: 0.5});

export function createClock(order, cfg = ALPHA_CLOCK) {
  return {cfg, players: Object.fromEntries(order.map(k => [k, {basic: 0, reserve: cfg.reserveStart}])), running: null, paused: false};
}

function settle(clock, now) {
  const r = clock.running;
  if (!r || clock.paused) { if (r) r.since = now; return; }
  let spent = Math.max(0, now - r.since);
  const p = clock.players[r.key], fromBasic = Math.min(p.basic, spent);
  p.basic -= fromBasic; spent -= fromBasic;
  p.reserve = Math.max(0, p.reserve - spent);
  r.since = now;
}

// Início do turno próprio: tempo básico cheio; o relógio dele corre.
export function clockStartTurn(clock, key, now) {
  settle(clock, now);
  clock.players[key].basic = clock.cfg.basic;
  clock.running = {key, since: now};
}
// Quem decide agora (prioridade numa janela, escolha pendente, ou o ativo de volta).
export function clockHandTo(clock, key, now) { settle(clock, now); clock.running = {key, since: now}; }
export function clockPause(clock, now) { settle(clock, now); clock.paused = true; }
export function clockResume(clock, now) { if (clock.running) clock.running.since = now; clock.paused = false; }
// Nenhuma decisão atribuída (G3-031): o relógio de ninguém corre até o próximo `clockHandTo`/`clockStartTurn`.
export function clockIdle(clock, now) { settle(clock, now); clock.running = null; }

// Fim do turno próprio: 50% do básico não usado vira reserva, até o teto (35 s usados → +12,5 s).
export function clockEndTurn(clock, key, now) {
  settle(clock, now);
  const p = clock.players[key], credit = Math.min(clock.cfg.reserveMax - p.reserve, p.basic * clock.cfg.carry);
  p.reserve += Math.max(0, credit);
  p.basic = 0;
  clock.running = null;
  return Math.max(0, credit);
}

export function clockRemaining(clock, key, now) {
  settle(clock, now);
  const p = clock.players[key];
  return {basic: p.basic, reserve: p.reserve, total: p.basic + p.reserve};
}
// Jogador sem tempo agora (o que está correndo e zerou), ou null.
export function clockExpired(clock, now) {
  const r = clock.running;
  return r && clockRemaining(clock, r.key, now).total <= 0 ? r.key : null;
}

// Mapeamento aprovado pelo autor (28/10/2026): 1 tocha acesa por 60 s restantes, arredondando para cima, teto 12.
export const torchesLit = seconds => Math.max(0, Math.min(12, Math.ceil(seconds / 60)));

// O que o timeout faz (G3-027). Escolha obrigatória: `timeoutAutoChoice` (G3-030).
export function timeoutAction(state, pending = null) {
  if (pending?.optional) return 'TIMEOUT_DECLINED';
  if (pending) return 'TIMEOUT_AUTO_CHOICE';
  if (state.window) return 'TIMEOUT_PASS_PRIORITY';
  return 'TIMEOUT_END_TURN';
}

// G3-030: timeout numa escolha obrigatória. Lê as opções legais agora, ordena pelo id estável do objeto (ordem natural:
// 'A:001:2' < 'A:001:10') e pega o menor; em escolha múltipla, repete sobre as restantes revalidando a legalidade a cada
// passo. Sem avaliação estratégica. `pending`: {player, options, count = 1, legal(id, escolhidos) = () => true}.
// Registra TIMEOUT_AUTO_CHOICE com as opções elegíveis, o critério e o resultado.
export const stableOrder = (a, b) => String(a).localeCompare(String(b), 'en', {numeric: true});
export function timeoutAutoChoice(state, {player, options, count = 1, legal = () => true}) {
  const eligible = [...new Set(options)].filter(o => legal(o, [])).sort(stableOrder), picked = [];
  for (let i = 0; i < count; i++) {
    const next = eligible.find(o => !picked.includes(o) && legal(o, picked));
    if (next === undefined) break;
    picked.push(next);
  }
  emit(state, 'TIMEOUT_AUTO_CHOICE', {player, eligible, criterion: 'menor id estável (ordem natural), revalidando a cada escolha', count, result: picked});
  return picked;
}
