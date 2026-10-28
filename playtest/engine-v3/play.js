// Jogar Devotee da mão (velocidade Sorcery, D173). Estado de entrada: ALPHA-P02 opção A, aprovada em 28/10/2026.
// `ctx`: {cards (loadCanon), objects (uid -> {owner, cardId})}.
import {RuleError, assertIdle, spendBase} from './core.js';

// Custo impresso: Base (D4) ou Latent. Valida tudo antes de mexer no estado.
export function payCost(state, key, cost) {
  if (!cost) return;
  const p = state.players[key];
  if (cost.unit === 'latent') {
    if (p.latent < cost.amount) throw new RuleError('custo', `Latent insuficiente (${p.latent}/${cost.amount})`);
    p.latent -= cost.amount;
  } else spendBase(state, key, cost.amount);
}

export function playDevotee(state, ctx, key, uid) {
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  if (key !== state.active) throw new RuleError('D1', 'só o jogador ativo joga Devotee, no próprio turno');
  assertIdle(state); // D173 + P06: Sorcery, sem janela
  const p = state.players[key], card = ctx.cards.get(ctx.objects[uid]?.cardId);
  if (!p.hand.includes(uid)) throw new RuleError('P02', 'a carta não está na mão');
  if (card.kind !== 'Devotee') throw new RuleError('P02', 'a carta não é Devotee');
  payCost(state, key, card.cost);
  p.hand.splice(p.hand.indexOf(uid), 1);
  p.battlefield.push(uid);
  state.units[uid] = {prepared: false, damage: 0, entered: state.turn}; // P02: entra Unprepared
}
