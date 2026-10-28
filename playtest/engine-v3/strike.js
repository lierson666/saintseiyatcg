// Strike da engine 3.0: ALPHA-P04 opção A, aprovada pelo autor em 28/10/2026.
// Declaração → janela de reação (P06 A) → dano simultâneo → verificação de destruição.
// `ctx`: {cards (loadCanon), objects (uid -> {owner, cardId}), attached}. Estado de unidade em state.units[uid] = {prepared, damage}.
import {RuleError, NotSpecified, recordStrike, loseSoul, destroyDevotee, assertIdle, openWindow, pushTriggers, emit, hooks} from './core.js';
import {atkOf, keywordsOf, damageDevotee, preventGod, onDeclare, afterStrike, checkDefeats} from './effects.js';

export {atkOf, hpOf, keywordsOf, gearOf} from './effects.js';

const PENDING_KEYWORDS = ['Long Range']; // fora da P05: sem definição 3.0

const card = (ctx, uid) => ctx.cards.get(ctx.objects[uid].cardId);
const onField = (state, key, uid) => state.players[key].battlefield.includes(uid);

// Legalidade da declaração, sem mexer no estado (a interface usa para destacar alvos legais).
export function checkStrike(state, ctx, attacker, target) {
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
  const defenders = state.players[enemy].battlefield.filter(uid => card(ctx, uid).kind === 'Devotee');
  const keyword = [attacker, ...defenders].flatMap(uid => keywordsOf(state, ctx, uid)).find(k => PENDING_KEYWORDS.includes(k));
  if (keyword) throw new NotSpecified(`efeito de ${keyword} no Strike (fora da ALPHA-P05)`);
  // P05 A: Guardian Prepared obriga a mirar um Guardian; Nimble ignora sempre; Cheater ignora contra God.
  const own = keywordsOf(state, ctx, attacker), isGuardian = uid => keywordsOf(state, ctx, uid).includes('Guardian');
  const guarded = defenders.some(uid => isGuardian(uid) && state.units[uid]?.prepared);
  const ignores = own.includes('Nimble') || (own.includes('Cheater') && target.kind === 'god');
  if (guarded && !ignores && !(target.kind === 'devotee' && isGuardian(target.uid))) {
    throw new RuleError('P05', 'há Guardian Prepared: o Strike precisa mirar um Devotee com Guardian');
  }
  if (state.strikes.get(attacker) === state.turn) throw new RuleError('D22', 'este Devotee já declarou Strike neste turno');
  return {key, enemy};
}

// Alvos legais de um atacante agora: [] se ele não pode declarar Strike.
export function strikeTargets(state, ctx, attacker) {
  const key = ctx.objects[attacker]?.owner, enemy = state.order.find(k => k !== key);
  const all = [{kind: 'god', player: enemy}, ...state.players[enemy].battlefield.filter(uid => card(ctx, uid).kind === 'Devotee').map(uid => ({kind: 'devotee', uid}))];
  return all.filter(target => { try { checkStrike(state, ctx, attacker, target); return true; } catch { return false; } });
}

// Abre a janela (P06): gatilhos de declaração (D202) entram na cadeia; o dano roda quando a janela fecha.
export function declareStrike(state, ctx, attacker, target, triggers = []) {
  const {key} = checkStrike(state, ctx, attacker, target);
  // Gatilhos "when an enemy Devotee declares a Strike" (Water Prison): montados antes de mudar o estado.
  const declared = hooks.strikeDeclared.flatMap(fn => fn(state, ctx, attacker, key));
  recordStrike(state, attacker); // D22
  state.units[attacker].prepared = false;
  emit(state, 'strike_declared', {player: key, attacker, target});
  onDeclare(state, ctx, attacker, target);
  const strike = {attacker, target, player: key};
  openWindow(state, () => resolveStrike(state, ctx, strike));
  pushTriggers(state, [...triggers, ...declared]);
  return strike;
}

// Dano simultâneo; God perde Soul 1:1 e retalia com ATTACK; dano persiste (sem limpeza no Cleanup).
export function resolveStrike(state, ctx, strike) {
  const {attacker, target, player} = strike, enemy = state.order.find(k => k !== player);
  if (!onField(state, player, attacker) || (target.kind === 'devotee' && !onField(state, enemy, target.uid))) {
    // G3-036 (autor, 28/10/2026): Strike anulado — sem dano nem retaliação; o Strike continua contado como usado.
    emit(state, 'strike_fizzled', {player, attacker, target});
    return null;
  }
  const atk = atkOf(state, ctx, attacker), pierce = keywordsOf(state, ctx, attacker).includes('Pierce'); // lidos antes do dano
  strike.atks = {[attacker]: atk};
  emit(state, 'strike_resolve', {player, attacker, target, atk});
  if (target.kind === 'devotee') {
    const back = atkOf(state, ctx, target.uid), before = state.units[target.uid].damage;
    strike.atks[target.uid] = back;
    const excess = damageDevotee(state, ctx, target.uid, atk);
    strike.dealt = (state.units[target.uid]?.damage ?? Infinity) - before; // dano que chegou ao Devotee (Libra Sword)
    damageDevotee(state, ctx, attacker, back);
    // P05 A: Pierce leva o dano acima do HP restante do alvo ao Soul do God dele (prevenível como dano de Strike ao God).
    const toGod = pierce && excess > 0 ? preventGod(state, ctx, enemy, excess) : 0;
    if (toGod > 0 && loseSoul(state, {[enemy]: toGod}, 'damage')) return state.victory;
  } else {
    damageDevotee(state, ctx, attacker, ctx.cards.get(state.gods[enemy]).atk);
    const toGod = preventGod(state, ctx, enemy, atk);
    emit(state, 'god_damage', {player: enemy, incoming: atk, dealt: toGod});
    if (toGod > 0 && loseSoul(state, {[enemy]: toGod}, 'damage')) return state.victory; // D52: encerra na hora
  }
  checkDefeats(state, ctx);
  afterStrike(state, ctx, strike);
  return null;
}
