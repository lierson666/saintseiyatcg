// Pontos da engine 3.0 que chamam os efeitos V6 (registry.js). A engine importa só este arquivo.
import {hooks, pushTriggers, emit} from '../core.js';
import {resonates} from '../../../shared/canon-cards.js';
import {V6, entryOf, collect, trigger, contextOf, bindContext, register, sources, domainEntry} from './registry.js';
import {clone} from '../decision.js';
import {setDefeatedHooks, setEnteredHooks, setLeavesHooks, setDamagedHooks} from './kit.js';
import hades from './hades.js';
import poseidon from './poseidon.js';
import ares from './ares.js';
import artemis from './artemis.js';
import athena from './athena.js';
import athenaDevotees from './athena-devotees.js';
import athenaGear from './athena-gear.js';
import athenaSpells from './athena-spells.js';
import neutral from './neutral.js';

register(hades); register(poseidon); register(ares); register(artemis); register(athena); register(athenaDevotees); register(athenaGear); register(athenaSpells); register(neutral);
export {V6, entryOf, bindContext, contextOf} from './registry.js';

const nameOf = (ctx, uid) => ctx.cards.get(ctx.objects[uid]?.cardId)?.name || uid;
const own = (state, ctx, key, uid, hook, args, label) => {
  const used = state.roundUses.size, run = entryOf(ctx, uid)?.[hook]?.(state, ctx, key, uid, ...args);
  return run ? [{...trigger(key, uid, `${nameOf(ctx, uid)} · ${label}`, run), ctx, uses: [...state.roundUses].slice(used)}] : [];
};

// Guia §56 (autor, 31/10/2026): o gatilho resolveria sem efeito agora? Ensaio do `run` numa cópia do estado, com o ctx
// do gatilho (`t.ctx`, o que os fechamentos guardam) apontado para cópias. Pergunta ao jogador ou erro no ensaio: dispara.
// shortcut: fechamento que mexa no `state` de fora (em vez do `st` recebido) escaparia do ensaio; nenhum faz isso hoje.
const ASKED = Symbol('asked');
const plain = (_, v) => (v instanceof Set || v instanceof Map ? [...v] : v);
hooks.idleTrigger.push((state, t) => {
  const c = t.ctx;
  if (!c) return false;
  const saved = {objects: c.objects, attached: c.attached, cards: c.cards, decide: c.decide}, s2 = clone(state);
  Object.assign(c, {objects: clone(c.objects), attached: clone(c.attached), cards: new Map(c.cards), decide: () => { throw ASKED; }});
  bindContext(s2, c);
  const look = () => JSON.stringify([s2, c.objects, c.attached], plain), before = look();
  try { t.run(s2); return look() === before; } catch { return false; } finally { Object.assign(c, saved); }
});

// Entrou no campo (jogado da mão ou posto por efeito): "When X enters" + observadores "Whenever … enters".
export function v6Entered(state, ctx, key, uid) {
  pushTriggers(state, [...resonanceOnEnter(state, ctx, key, uid), ...own(state, ctx, key, uid, 'enter', [], 'enters the battlefield'),
    ...collect(state, ctx, state.order, 'watchEnter', [uid], 'enters').filter(t => t.uid !== uid)]);
}
// Guia §28.3/§33 (02/11/2026): Devotee Resonant que entra pode prender, sem Equip, uma Armor, arma ou acessório seu dele — solto ou com outro Devotee seu.
function resonanceOnEnter(state, ctx, key, uid) {
  const dev = ctx.cards.get(ctx.objects[uid]?.cardId);
  if (dev?.kind !== 'Devotee') return [];
  const mine = a => state.players[key].battlefield.includes(a) && ctx.attached[a] !== uid;
  const armors = state.players[key].battlefield.filter(a => {
    const c = ctx.cards.get(ctx.objects[a]?.cardId);
    return c?.kind === 'Equipment' && c.autoEquip?.length && resonates(c, dev);
  });
  return armors.map(armor => trigger(key, armor, `${nameOf(ctx, armor)} · Resonance`, st => {
    if (!mine(armor) || !st.players[key].battlefield.includes(uid) || !ctx.decide?.(key, {ability: 'Resonance', uid: armor, source: uid, text: `Equip ${nameOf(ctx, armor)} on ${nameOf(ctx, uid)} for free?`})) return;
    if (ctx.objects[armor].armor) for (const e of Object.keys(ctx.attached)) if (e !== armor && ctx.attached[e] === uid && ctx.objects[e].armor) delete ctx.attached[e];
    ctx.attached[armor] = uid;
    emit(st, 'equipped', {player: key, uid: armor, bearer: uid});
    v6Attach(st, ctx, key, armor, uid);
  }));
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
    ...v6Leaves(state, ctx, key, uid, 'tartarus'),
  ]);
}
setDefeatedHooks((state, ctx, owner, uid, gear) => v6Defeated(state, ctx, owner, uid, gear));

// Gancho leaves: Devotee saiu do campo por qualquer via (destruído, devolvido à mão, exilado, removido por §63).
// `where`: 'tartarus' | 'hand' | 'void'. `key`: controlador de quando saiu. Devolve gatilhos (quem chama põe na cadeia).
export function v6Leaves(state, ctx, key, uid, where) {
  return [
    ...own(state, ctx, key, uid, 'leaves', [where], 'leaves the battlefield'),
    ...collect(state, ctx, state.order, 'watchLeaves', [uid, where, key], 'a Devotee leaves the battlefield'),
  ];
}
setLeavesHooks((state, ctx, key, uid, where) => pushTriggers(state, v6Leaves(state, ctx, key, uid, where)));

// Gancho wouldBeDefeated: substituição ANTES de destroyDevotee (effects.checkDefeats). Cada gancho pode perguntar (kit)
// e devolve true se tomou o lugar da derrota; ele mesmo corrige o dano (ex.: remove dano) ou tira o Devotee do campo.
// Para no primeiro que substituir. Ordem: o próprio Devotee, seus Equipment, observadores.
export function v6WouldBeDefeated(state, ctx, key, uid) {
  if (entryOf(ctx, uid)?.wouldBeDefeated?.(state, ctx, key, uid)) return true;
  for (const g of Object.keys(ctx.attached).filter(e => ctx.attached[e] === uid)) {
    if (entryOf(ctx, g)?.gearWouldBeDefeated?.(state, ctx, ctx.objects[g].owner, g, uid)) return true;
  }
  for (const k of state.order) for (const {self, entry} of sources(state, ctx, k)) {
    if (self !== uid && entry.watchWouldBeDefeated?.(state, ctx, k, self, uid, key)) return true;
  }
  return false;
}

// Gancho attach: Equipment ficou preso a um portador (jogado já equipado ou equipado depois: reequip).
export function v6Attach(state, ctx, key, uid, bearer) {
  pushTriggers(state, [...own(state, ctx, key, uid, 'attach', [bearer], 'becomes attached'),
    ...collect(state, ctx, state.order, 'watchAttach', [uid, bearer], 'Equipment becomes attached')]);
}

// Gancho prevent: prevenção OBRIGATÓRIA de dano a um Devotee (antes dos escudos). `prevent(s, c, key, self, amount, strike)` do
// próprio Devotee e `gearPrevent(s, c, key, self, bearer, amount, strike)` do Equipment devolvem quanto previnem (<= amount).
export function v6Prevent(state, ctx, key, uid, amount, strike) {
  let left = amount;
  const take = n => { left -= Math.max(0, Math.min(left, n || 0)); };
  take(entryOf(ctx, uid)?.prevent?.(state, ctx, key, uid, left, strike));
  for (const g of Object.keys(ctx.attached).filter(e => ctx.attached[e] === uid)) {
    if (left > 0) take(entryOf(ctx, g)?.gearPrevent?.(state, ctx, ctx.objects[g].owner, g, uid, left, strike));
  }
  return amount - left;
}

// Gancho tookDamage: Devotee foi atingido por dano (Strike ou efeito) que de fato chegou a ele. Devolve gatilhos.
// info: {dealt, foe (Devotee que causou, ou null), combat (dano de Strike)}. Também gearTookDamage / watchTookDamage.
export function tookDamage(state, ctx, key, uid, info, gearList) {
  const gear = gearList || Object.keys(ctx.attached).filter(g => ctx.attached[g] === uid);
  return [
    ...own(state, ctx, key, uid, 'tookDamage', [info], 'is dealt damage'),
    ...gear.flatMap(g => own(state, ctx, ctx.objects[g].owner, g, 'gearTookDamage', [uid, info], 'equipped Devotee is dealt damage')),
    ...collect(state, ctx, state.order, 'watchTookDamage', [uid, info], 'a Devotee is dealt damage'),
  ];
}
setDamagedHooks((state, ctx, key, uid, info) => pushTriggers(state, tookDamage(state, ctx, key, uid, info)));

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
  // Ganchos damagePrevented (Strike prevenido total/parcialmente) e survive (continuou em campo depois do Strike).
  const onBattlefield = u => state.order.some(k => state.players[k].battlefield.includes(u));
  const gearNow = u => Object.keys(ctx.attached).filter(g => ctx.attached[g] === u);
  const prevented = (uid, key, foe, role) => {
    const h = strike.hits?.[uid];
    if (!h || h.prevented <= 0) return;
    const info = {...h, full: h.prevented >= h.incoming, role, foe};
    out.push(...own(state, ctx, key, uid, 'damagePrevented', [info], 'damage is prevented'));
    for (const g of gear(uid)) out.push(...own(state, ctx, ctx.objects[g].owner, g, 'gearDamagePrevented', [uid, info], 'equipped Devotee damage is prevented'));
    out.push(...collect(state, ctx, state.order, 'watchDamagePrevented', [uid, info], 'Strike damage is prevented'));
  };
  const survived = (uid, key, foe, role) => {
    if (!onBattlefield(uid)) return;
    out.push(...own(state, ctx, key, uid, 'survive', [role, foe], 'survives a Strike'));
    for (const g of gearNow(uid)) out.push(...own(state, ctx, ctx.objects[g].owner, g, 'gearSurvive', [uid, role, foe], 'equipped Devotee survives a Strike'));
    out.push(...collect(state, ctx, state.order, 'watchSurvive', [uid, role, foe], 'a Devotee survives a Strike'));
  };
  // Dano ao God prevenido: só observadores (watchDamagePrevented com unit = 'god:X').
  if (target.kind === 'god' && strike.godHit?.prevented > 0) {
    out.push(...collect(state, ctx, state.order, 'watchDamagePrevented', [`god:${enemy}`, {...strike.godHit, full: strike.godHit.dealt === 0, role: 'defender', foe: attacker, god: true}], 'Strike damage is prevented'));
  }
  // Gancho tookDamage: dano de Strike efetivamente causado (info.dealt > 0) a cada lado; info.combat = true.
  const hurt = (uid, key, foe) => {
    const h = strike.hits?.[uid];
    if (h?.dealt > 0) out.push(...tookDamage(state, ctx, key, uid, {dealt: h.dealt, foe, combat: true}, gear(uid)));
  };
  hurt(attacker, player, target.uid || null);
  if (target.kind === 'devotee') hurt(target.uid, enemy, attacker);
  prevented(attacker, player, target.uid || null, 'attacker');
  if (target.kind === 'devotee') prevented(target.uid, enemy, attacker, 'defender');
  survived(attacker, player, target.uid || null, 'attacker');
  if (target.kind === 'devotee') survived(target.uid, enemy, attacker, 'defender');
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
  if (self) list.push(...self.map(m => ({...m, from: {uid}})));
  for (const k of state.order) {
    for (const src of state.players[k].battlefield) {
      const aura = src !== uid && V6[ctx.objects[src]?.cardId]?.aura?.(state, ctx, k, src, uid);
      if (aura) list.push({...aura, from: {uid: src}});
    }
    const domain = domainEntry(state, k)?.aura?.(state, ctx, k, `domain:${k}`, uid); // linha geral: vale com qualquer God
    if (domain) list.push({...domain, from: {uid: `domain:${k}`}});
  }
  return list;
}

// Início e fim do turno do controlador (core.js não tem ctx: usa o da partida, registry.bindContext).
const turnHook = hook => state => {
  const ctx = contextOf(state);
  return ctx ? collect(state, ctx, [state.active], hook, [], hook === 'startTurn' ? 'beginning of turn' : 'end of turn') : [];
};
hooks.turnStart.push(turnHook('startTurn'));
// Base de Cosmo posta pelo jogador (core.placeBase): observadores `watchBase(s, c, key, self, player, uid)`.
hooks.basePlaced.push((state, player, uid) => {
  const ctx = contextOf(state);
  if (ctx) pushTriggers(state, collect(state, ctx, state.order, 'watchBase', [player, uid], 'a Cosmo Base is placed'));
});
hooks.turnEnd.push(turnHook('endTurn'));

// Spell V6: categoria pelo subtipo impresso (Technique/Moment), não pela tabela D194 (números do D268).
export function v6Spell(ctx, uid) {
  const entry = entryOf(ctx, uid), card = ctx.cards.get(ctx.objects[uid]?.cardId);
  if (!entry?.spell) return null;
  // Event e Miracle jogam como Technique (guia §54, autor 29/10/2026).
  const category = /Technique|Event|Miracle/.test(card.type) ? 'Technique' : /Moment/.test(card.type) ? 'Moment' : null;
  return category && {entry, category};
}
