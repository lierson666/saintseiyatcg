// Pontos da engine 3.0 que chamam os efeitos V6 (registry.js). A engine importa só este arquivo.
import {hooks, pushTriggers} from '../core.js';
import {V6, entryOf, collect, trigger, contextOf, register} from './registry.js';
import {setDefeatedHooks, setEnteredHooks} from './kit.js';
import hades from './hades.js';
import poseidon from './poseidon.js';
import ares from './ares.js';
import artemis from './artemis.js';
import athena from './athena.js';
import athenaDevotees from './athena-devotees.js';
import athenaGear from './athena-gear.js';
import athenaSpells from './athena-spells.js';

register(hades); register(poseidon); register(ares); register(artemis); register(athena); register(athenaDevotees); register(athenaGear); register(athenaSpells);
export {V6, entryOf, bindContext, contextOf} from './registry.js';

const nameOf = (ctx, uid) => ctx.cards.get(ctx.objects[uid]?.cardId)?.name || uid;
const own = (state, ctx, key, uid, hook, args, label) => {
  const run = entryOf(ctx, uid)?.[hook]?.(state, ctx, key, uid, ...args);
  return run ? [trigger(key, uid, `${nameOf(ctx, uid)} · ${label}`, run)] : [];
};

// Entrou no campo (jogado da mão ou posto por efeito): "When X enters" + observadores "Whenever … enters".
export function v6Entered(state, ctx, key, uid) {
  pushTriggers(state, [...own(state, ctx, key, uid, 'enter', [], 'enters the battlefield'),
    ...collect(state, ctx, state.order, 'watchEnter', [uid], 'enters').filter(t => t.uid !== uid)]);
}
setEnteredHooks(v6Entered);
export function v6Cast(state, ctx, key, uid) {
  pushTriggers(state, own(state, ctx, key, uid, 'cast', [], 'When you cast'));
}

// Devotee derrotado (já no Tartarus). `gear`: Equipment que estavam presos a ele, capturados antes da derrota.
export function v6Defeated(state, ctx, key, uid, gear = []) {
  const owner = ctx.objects[uid].owner;
  pushTriggers(state, [
    ...own(state, ctx, owner, uid, 'defeated', [], 'is defeated'),
    ...gear.flatMap(g => own(state, ctx, ctx.objects[g].owner, g, 'bearerDefeated', [uid], 'equipped Devotee defeated')),
    ...collect(state, ctx, state.order, 'watchDefeat', [uid, owner], 'a Devotee is defeated'),
  ]);
}
setDefeatedHooks((state, ctx, owner, uid, gear) => v6Defeated(state, ctx, owner, uid, gear));

// Strike declarado: gatilhos entram na mesma janela do Strike (declareStrike recebe a lista).
export function v6Declare(state, ctx, key, attacker, target) {
  return [
    ...own(state, ctx, key, attacker, 'declare', [target], 'declares a Strike'),
    ...Object.keys(ctx.attached).filter(g => ctx.attached[g] === attacker).flatMap(g => own(state, ctx, key, g, 'gearDeclare', [attacker, target], 'equipped Devotee declares a Strike')),
    ...collect(state, ctx, state.order, 'watchDeclare', [attacker, target], 'a Strike is declared'),
  ];
}

// Depois do dano do Strike. `strike`: {attacker, target, player, dealt}; `before`: quem estava em campo antes.
export function v6AfterStrike(state, ctx, strike, gearBefore) {
  const {attacker, target, player} = strike, enemy = state.order.find(k => k !== player), out = [];
  const gear = uid => gearBefore[uid] || [];
  const side = (uid, key, victim, dealt, killed) => {
    if (dealt > 0) {
      out.push(...own(state, ctx, key, uid, 'combatDamage', [victim, dealt], 'deals Strike damage'));
      for (const g of gear(uid)) out.push(...own(state, ctx, ctx.objects[g].owner, g, 'gearCombatDamage', [uid, victim, dealt], 'equipped Devotee deals Strike damage'));
    }
    if (killed) {
      out.push(...own(state, ctx, key, uid, 'killInCombat', [victim], 'defeats a Devotee'));
      for (const g of gear(uid)) out.push(...own(state, ctx, ctx.objects[g].owner, g, 'gearKillInCombat', [uid, victim], 'equipped Devotee defeats a Devotee'));
      out.push(...collect(state, ctx, [key], 'watchKill', [uid, victim], 'defeats a Devotee'));
    }
  };
  if (target.kind === 'devotee') {
    const t = target.uid, gone = u => !state.order.some(k => state.players[k].battlefield.includes(u));
    side(attacker, player, t, strike.dealt || 0, gone(t));
    side(t, enemy, attacker, strike.dealtBack || 0, gone(attacker));
  } else if (strike.godDealt > 0) {
    out.push(...own(state, ctx, player, attacker, 'godDamage', [enemy, strike.godDealt], 'deals damage to a God'));
    for (const g of gear(attacker)) out.push(...own(state, ctx, ctx.objects[g].owner, g, 'gearGodDamage', [attacker, enemy, strike.godDealt], 'equipped Devotee damages a God'));
  }
  return out;
}

// Bônus estáticos: do próprio Devotee, marcadores +1/+1 e auras de outras fontes (inclui o Domain).
export function v6Mods(state, ctx, key, uid) {
  const list = [];
  const self = entryOf(ctx, uid)?.mods?.(state, ctx, key, uid);
  if (self) list.push(...self);
  const counters = state.units[uid]?.counters;
  if (counters) list.push({atk: counters, hp: counters});
  for (const k of state.order) {
    for (const src of state.players[k].battlefield) {
      const aura = src !== uid && V6[ctx.objects[src]?.cardId]?.aura?.(state, ctx, k, src, uid);
      if (aura) list.push(aura);
    }
    const domain = V6[state.domains?.[k]]?.aura?.(state, ctx, k, `domain:${k}`, uid);
    if (domain) list.push(domain);
  }
  return list;
}

// Início e fim do turno do controlador (core.js não tem ctx: usa o da partida, registry.bindContext).
const turnHook = hook => state => {
  const ctx = contextOf(state);
  return ctx ? collect(state, ctx, [state.active], hook, [], hook === 'startTurn' ? 'beginning of turn' : 'end of turn') : [];
};
hooks.turnStart.push(turnHook('startTurn'));
hooks.turnEnd.push(turnHook('endTurn'));

// Spell V6: categoria pelo subtipo impresso (Technique/Moment), não pela tabela D194 (números do D268).
export function v6Spell(ctx, uid) {
  const entry = entryOf(ctx, uid), card = ctx.cards.get(ctx.objects[uid]?.cardId);
  if (!entry?.spell) return null;
  // Event e Miracle jogam como Technique (guia §54, autor 29/10/2026).
  const category = /Technique|Event|Miracle/.test(card.type) ? 'Technique' : /Moment/.test(card.type) ? 'Moment' : null;
  return category && {entry, category};
}
