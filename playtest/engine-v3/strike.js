// Strike da engine 3.0: ALPHA-P04 opção A, aprovada pelo autor em 28/10/2026.
// Declaração → janela de reação (P06 A) → dano simultâneo → verificação de destruição.
// `ctx`: {cards (loadCanon), objects (uid -> {owner, cardId}), attached}. Estado de unidade em state.units[uid] = {prepared, damage}.
import {RuleError, NotSpecified, recordStrike, loseSoul, destroyDevotee, assertIdle, openWindow, pushTriggers} from './core.js';

const PENDING_KEYWORDS = ['Long Range']; // fora da P05: sem definição 3.0

// Equipment presos ao Devotee, na ordem em que foram equipados.
export const gearOf = (ctx, uid) => Object.keys(ctx.attached).filter(e => ctx.attached[e] === uid);
const bonuses = (ctx, uid) => gearOf(ctx, uid).map(e => card(ctx, e).equipped).filter(Boolean);
// Valores em jogo: impresso + bônus fixo do texto do Equipment ("Equipped Devotee gets …").
export const atkOf = (ctx, uid) => card(ctx, uid).atk + bonuses(ctx, uid).reduce((n, b) => n + b.atk, 0);
export const hpOf = (ctx, uid) => card(ctx, uid).hp + bonuses(ctx, uid).reduce((n, b) => n + b.hp, 0);
// Keywords impressas + dadas por Equipment + concedidas por efeito (`state.units[uid].keywords`).
export const keywordsOf = (state, ctx, uid) => [...card(ctx, uid).keywords, ...bonuses(ctx, uid).flatMap(b => b.keywords),
  ...(state.units[uid]?.keywords || [])];

// Dano de Strike num Devotee (autor, 28/10/2026): passa primeiro pelas Armor, na ordem em que foram equipadas;
// Armor com dano >= HP vai para o Tartarus do Owner e o resto segue. O dano na Armor persiste (D34: sem reparo).
// Devolve o dano que passou do HP restante do Devotee (base do Pierce).
function damageDevotee(state, ctx, uid, amount) {
  for (const armor of gearOf(ctx, uid).filter(e => card(ctx, e).armor)) {
    const unit = state.units[armor] ??= {damage: 0}, absorbed = Math.min(amount, card(ctx, armor).hp - unit.damage);
    unit.damage += absorbed;
    amount -= absorbed;
    if (unit.damage >= card(ctx, armor).hp) {
      state.players[ctx.objects[armor].owner].battlefield = state.players[ctx.objects[armor].owner].battlefield.filter(x => x !== armor);
      state.players[ctx.objects[armor].owner].tartarus.push(armor);
      delete ctx.attached[armor];
      delete state.units[armor];
    }
  }
  const room = Math.max(0, hpOf(ctx, uid) - state.units[uid].damage);
  state.units[uid].damage += amount;
  return Math.max(0, amount - room);
}

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
  const atk = atkOf(ctx, attacker), pierce = keywordsOf(state, ctx, attacker).includes('Pierce'); // lidos antes do dano
  if (target.kind === 'devotee') {
    const back = atkOf(ctx, target.uid);
    const excess = damageDevotee(state, ctx, target.uid, atk);
    damageDevotee(state, ctx, attacker, back);
    // P05 A: Pierce leva o dano acima do HP restante do alvo ao Soul do God dele.
    if (pierce && excess > 0 && loseSoul(state, {[enemy]: excess})) return state.victory;
  } else {
    damageDevotee(state, ctx, attacker, ctx.cards.get(state.gods[enemy]).atk);
    if (loseSoul(state, {[enemy]: atk})) return state.victory; // D52: encerra na hora
  }
  for (const uid of [attacker, target.uid].filter(Boolean)) {
    if (state.units[uid].damage >= hpOf(ctx, uid)) destroyDevotee(state, uid, ctx.objects, ctx.attached);
  }
  return null;
}
