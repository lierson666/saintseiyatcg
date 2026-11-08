// Strike da engine 3.0: ALPHA-P04 opção A, aprovada pelo autor em 28/10/2026.
// Declaração → janela de reação (P06 A) → dano simultâneo → verificação de destruição.
// `ctx`: {cards (loadCanon), objects (uid -> {owner, cardId}), attached}. Estado de unidade em state.units[uid] = {prepared, damage}.
import {RuleError, NotSpecified, recordStrike, loseSoul, destroyDevotee, assertIdle, openWindow, pushTriggers, emit, hooks} from './core.js';
import {atkOf, keywordsOf, damageDevotee, preventGod, onDeclare, afterStrike, checkDefeats, gearOf, cannotStrike, cannotStrikeGod, controllerOf, immuneFrom, cardSource} from './effects.js';
import {v6Declare} from './v6/hooks.js';
import {entryOf} from './v6/registry.js';

export {atkOf, hpOf, keywordsOf, gearOf} from './effects.js';

const card = (ctx, uid) => ctx.cards.get(ctx.objects[uid].cardId);
const onField = (state, key, uid) => state.players[key].battlefield.includes(uid);

// Legalidade da declaração, sem mexer no estado (a interface usa para destacar alvos legais).
export function checkStrike(state, ctx, attacker, target) {
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  const key = controllerOf(state, attacker) ?? ctx.objects[attacker]?.owner, enemy = state.order.find(k => k !== key); // controlador (265 troca controle)
  if (key !== state.active) throw new RuleError('D1', 'só o jogador ativo declara Strike no próprio Round');
  assertIdle(state);
  if (!onField(state, key, attacker) || card(ctx, attacker).kind !== 'Devotee') throw new RuleError('P04', 'o atacante precisa ser um Devotee seu no campo');
  // P02: entra Unprepared; Impulse deixa declarar Strike no turno em que entrou.
  const unit = state.units[attacker], impulse = unit?.entered === state.turn && (keywordsOf(state, ctx, attacker).includes('Impulse') || state.impulseAll?.[controllerOf(state, attacker)] === state.turn); // inclui Impulse dado por efeito (V6)
  if (unit?.prepared !== true && !impulse) throw new RuleError('P04', 'o atacante precisa estar Prepared');
  if (cannotStrike(state, attacker)) throw new RuleError('V6', 'este Devotee não pode declarar Strike neste Round'); // gancho cannotStrike
  // §47 (autor, 30/10/2026): o Strike de Impulse na rodada de entrada pode mirar o God (restrição de 29/10 revertida).
  if (target.kind === 'god' && cannotStrikeGod(state, attacker)) throw new RuleError('V6', 'este Devotee não pode mirar um God nesta rodada');
  const legal = target.kind === 'god' ? target.player === enemy
    : target.kind === 'devotee' && onField(state, enemy, target.uid) && card(ctx, target.uid).kind === 'Devotee';
  if (!legal) throw new RuleError('P04', 'alvo precisa ser o God inimigo ou um Devotee inimigo');
  // §43 (autor, 01/11/2026): Nimble é o "voar": só outro Nimble mira um Devotee com Nimble.
  const own = keywordsOf(state, ctx, attacker), has = (uid, kw) => keywordsOf(state, ctx, uid).includes(kw);
  const src = cardSource(state, ctx, attacker), shielded = uid => immuneFrom(state, ctx, uid, src); // §43A
  if (target.kind === 'devotee' && shielded(target.uid)) throw new RuleError('P04', 'o alvo é Imune a este Devotee');
  const flies = own.includes('Nimble'), reachable = uid => (!has(uid, 'Nimble') || flies) && !shielded(uid);
  if (target.kind === 'devotee' && !reachable(target.uid)) throw new RuleError('P04', 'só um Devotee com Nimble pode mirar um Devotee com Nimble');
  const defenders = state.players[enemy].battlefield.filter(uid => card(ctx, uid).kind === 'Devotee');
  // P05 A + G3-038 (autor, 28/10/2026): qualquer Guardian em campo, Prepared ou não, obriga a mirar um Guardian;
  // §12 (01/11/2026): Nimble ignora Guardian sem Nimble; Guardian com Nimble não obriga quem não pode mirá-lo.
  const isGuardian = uid => has(uid, 'Guardian');
  const guards = defenders.filter(uid => isGuardian(uid) && reachable(uid)), guarded = guards.length > 0;
  // La Scoumoune (363, autor 30/10/2026): mira Devotee inimigo Unprepared ignorando Guardian (gancho ignoresGuardian).
  const hunts = target.kind === 'devotee' && !!entryOf(ctx, attacker)?.ignoresGuardian?.(state, ctx, attacker, target.uid);
  const ignores = (flies && !guards.some(uid => has(uid, 'Nimble'))) || hunts;
  if (guarded && !ignores && !(target.kind === 'devotee' && isGuardian(target.uid))) {
    throw new RuleError('P05', 'há Guardian em campo: o Strike precisa mirar um Devotee com Guardian');
  }
  if (state.strikes.get(attacker) === state.turn) throw new RuleError('D22', 'este Devotee já declarou Strike neste Round');
  // Para a UI explicar quando um Strike passa por Guardian.
  const bypass = guarded && !(target.kind === 'devotee' && isGuardian(target.uid)) ? (flies ? 'Nimble' : 'Hunter\'s Instinct') : null;
  return {key, enemy, bypass};
}

// "Must attack each turn if able" (Ohko 482, gancho mustStrike; autor 30/10/2026): Devotees de `key` que ainda devem declarar
// Strike neste turno e têm alvo legal. O END TURN é recusado enquanto houver algum (actions.js).
export const mustStrike = (state, ctx, key) => state.players[key].battlefield.filter(uid => entryOf(ctx, uid)?.mustStrike
  && state.strikes.get(uid) !== state.turn && strikeTargets(state, ctx, uid).length);

// Alvos legais de um atacante agora: [] se ele não pode declarar Strike.
export function strikeTargets(state, ctx, attacker) {
  const key = controllerOf(state, attacker) ?? ctx.objects[attacker]?.owner, enemy = state.order.find(k => k !== key); // controlador (265 troca controle)
  const all = [{kind: 'god', player: enemy}, ...state.players[enemy].battlefield.filter(uid => card(ctx, uid).kind === 'Devotee').map(uid => ({kind: 'devotee', uid}))];
  return all.filter(target => { try { checkStrike(state, ctx, attacker, target); return true; } catch { return false; } });
}

// Abre a janela (P06): gatilhos de declaração (D202) entram na cadeia; o dano roda quando a janela fecha.
export function declareStrike(state, ctx, attacker, target, triggers = []) {
  const {key, bypass} = checkStrike(state, ctx, attacker, target);
  // Gatilhos "when an enemy Devotee declares a Strike" (Water Prison): montados antes de mudar o estado.
  const declared = [...hooks.strikeDeclared.flatMap(fn => fn(state, ctx, attacker, key)),
    ...v6Declare(state, ctx, key, attacker, target)]; // cartas V6: "Whenever … declares a Strike"
  recordStrike(state, attacker); // D22
  state.units[attacker].prepared = false;
  emit(state, 'strike_declared', {player: key, attacker, target, ...(bypass && {bypass})});
  onDeclare(state, ctx, attacker, target);
  const strike = {attacker, target, player: key};
  openWindow(state, () => resolveStrike(state, ctx, strike));
  pushTriggers(state, [...triggers, ...declared]);
  return strike;
}

// Último evento 'damage' do Devotee (emitido por damageDevotee): {incoming, prevented, absorbed, dealt}.
const lastHit = (state, uid, from) => {
  const e = state.events.slice(from).find(x => x.type === 'damage' && x.uid === uid);
  return e && {incoming: e.incoming, prevented: e.prevented, absorbed: e.absorbed, dealt: e.dealt};
};

// Dano simultâneo entre Devotees; God perde Soul 1:1 e não retalia (§24); dano persiste (sem limpeza no Cleanup).
export function resolveStrike(state, ctx, strike) {
  const {attacker, target, player} = strike, enemy = state.order.find(k => k !== player);
  if (!onField(state, player, attacker) || (target.kind === 'devotee' && !onField(state, enemy, target.uid))) {
    // G3-036 (autor, 28/10/2026): Strike anulado — sem dano nem retaliação; o Strike continua contado como usado.
    emit(state, 'strike_fizzled', {player, attacker, target});
    state.effects = state.effects.filter(e => e.duration !== 'this_strike'); // escudos/bônus do Strike anulado não sobram
    return null;
  }
  const atk = atkOf(state, ctx, attacker), own = keywordsOf(state, ctx, attacker), pierce = own.includes('Pierce'); // lido antes do dano
  // §25/§45: Long Range de quem inicia causa o dano primeiro; derrota verificada antes da retaliação.
  const first = own.includes('Long Range');
  strike.longRange = first;
  strike.atks = {[attacker]: atk};
  // Equipment presos antes do dano: gatilhos V6 "equipped Devotee …" valem mesmo se o portador morrer no Strike.
  strike.gearBefore = Object.fromEntries([attacker, target.uid].filter(Boolean).map(u => [u, gearOf(ctx, u)]));
  emit(state, 'strike_resolve', {player, attacker, target, atk});
  const mark = state.events.length;
  if (target.kind === 'devotee') {
    // Black Phoenix Shadow (458, autor 30/10/2026): "cannot retaliate" (gancho noRetaliate).
    const back = entryOf(ctx, target.uid)?.noRetaliate || immuneFrom(state, ctx, attacker, cardSource(state, ctx, target.uid)) ? 0 : atkOf(state, ctx, target.uid), before = state.units[target.uid].damage;
    strike.atks[target.uid] = back;
    const excess = damageDevotee(state, ctx, target.uid, immuneFrom(state, ctx, target.uid, cardSource(state, ctx, attacker)) ? 0 : atk);
    strike.hits = {[target.uid]: lastHit(state, target.uid, mark)}; // gancho damagePrevented: o que a prevenção/Armor tirou de cada lado
    strike.dealt = (state.units[target.uid]?.damage ?? Infinity) - before; // dano que chegou ao Devotee (Libra Sword)
    if (first) checkDefeats(state, ctx); // alvo derrotado não retalia
    const backBefore = state.units[attacker].damage;
    if (!first || onField(state, enemy, target.uid)) damageDevotee(state, ctx, attacker, back);
    strike.hits[attacker] = lastHit(state, attacker, mark);
    strike.dealtBack = (state.units[attacker]?.damage ?? Infinity) - backBefore;
    // P05 A: Pierce leva o dano acima do HP restante do alvo ao Soul do God dele (prevenível como dano de Strike ao God).
    const toGod = pierce && excess > 0 ? preventGod(state, ctx, enemy, excess) : 0;
    if (toGod > 0 && loseSoul(state, {[enemy]: toGod}, 'damage')) return state.victory;
  } else {
    // §24 (autor, 01/11/2026): Gods não retaliam.
    const toGod = preventGod(state, ctx, enemy, atk);
    emit(state, 'god_damage', {player: enemy, incoming: atk, dealt: toGod});
    strike.godDealt = toGod;
    strike.godHit = {incoming: atk, prevented: atk - toGod, absorbed: 0, dealt: toGod}; // gancho damagePrevented (observadores)
    if (toGod > 0 && loseSoul(state, {[enemy]: toGod}, 'damage')) return state.victory; // D52
  }
  checkDefeats(state, ctx);
  afterStrike(state, ctx, strike);
  return null;
}
