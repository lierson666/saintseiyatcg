// Strike da engine 3.0: ALPHA-P04 opção A, aprovada pelo autor em 28/10/2026.
// Declaração → janela de reação (P06 A) → dano simultâneo → verificação de destruição.
// `ctx`: {cards (loadCanon), objects (uid -> {owner, cardId}), attached}. Estado de unidade em state.units[uid] = {prepared, damage}.
import {RuleError, NotSpecified, recordStrike, loseSoul, destroyDevotee, assertIdle, openWindow, pushTriggers} from './core.js';

const PENDING_KEYWORDS = ['Guardian', 'Cheater', 'Nimble', 'Pierce', 'Long Range']; // P05

const card = (ctx, uid) => ctx.cards.get(ctx.objects[uid].cardId);
const onField = (state, key, uid) => state.players[key].battlefield.includes(uid);

// Abre a janela (P06): gatilhos de declaração (D202) entram na cadeia; o dano roda quando a janela fecha.
export function declareStrike(state, ctx, attacker, target, triggers = []) {
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  const key = ctx.objects[attacker]?.owner, enemy = state.order.find(k => k !== key);
  if (key !== state.active) throw new RuleError('D1', 'só o jogador ativo declara Strike no próprio turno');
  assertIdle(state);
  if (!onField(state, key, attacker) || card(ctx, attacker).kind !== 'Devotee') throw new RuleError('P04', 'o atacante precisa ser um Devotee seu no campo');
  // P02: entra Unprepared; Impulse deixa declarar Strike no turno em que entrou.
  const unit = state.units[attacker], impulse = unit?.entered === state.turn && card(ctx, attacker).keywords.includes('Impulse');
  if (unit?.prepared !== true && !impulse) throw new RuleError('P04', 'o atacante precisa estar Prepared');
  const legal = target.kind === 'god' ? target.player === enemy
    : target.kind === 'devotee' && onField(state, enemy, target.uid) && card(ctx, target.uid).kind === 'Devotee';
  if (!legal) throw new RuleError('P04', 'alvo precisa ser o God inimigo ou um Devotee inimigo');
  // Legalidade de alvo com keywords depende da P05; não presumir.
  const involved = [attacker, ...state.players[enemy].battlefield].filter(uid => card(ctx, uid).kind === 'Devotee');
  const keyword = involved.flatMap(uid => card(ctx, uid).keywords).find(k => PENDING_KEYWORDS.includes(k));
  if (keyword) throw new NotSpecified(`ALPHA-P05: efeito de ${keyword} na declaração e no dano do Strike`);
  recordStrike(state, attacker); // D22
  state.units[attacker].prepared = false;
  const strike = {attacker, target, player: key};
  openWindow(state, () => resolveStrike(state, ctx, strike));
  pushTriggers(state, triggers);
  return strike;
}

// Dano simultâneo; God perde Soul 1:1 e retalia com ATTACK; dano persiste (sem limpeza no Cleanup).
export function resolveStrike(state, ctx, strike) {
  const {attacker, target, player} = strike, enemy = state.order.find(k => k !== player);
  if (!onField(state, player, attacker) || (target.kind === 'devotee' && !onField(state, enemy, target.uid))) {
    throw new NotSpecified('Strike cujo atacante ou alvo saiu do campo antes do dano (nem P04 nem P06 definem)');
  }
  const atk = card(ctx, attacker).atk;
  if (target.kind === 'devotee') {
    const back = card(ctx, target.uid).atk;
    state.units[target.uid].damage += atk;
    state.units[attacker].damage += back;
  } else {
    state.units[attacker].damage += ctx.cards.get(state.gods[enemy]).atk;
    if (loseSoul(state, {[enemy]: atk})) return state.victory; // D52: encerra na hora
  }
  for (const uid of [attacker, target.uid].filter(Boolean)) {
    if (state.units[uid].damage >= card(ctx, uid).hp) { destroyDevotee(state, uid, ctx.objects, ctx.attached); delete state.units[uid]; }
  }
  return null;
}
