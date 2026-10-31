// Efeitos V6 de Ares, por id de carta (contrato em ./registry.js; kit em ./kit.js).
// Já tratados fora daqui: bônus fixo de Equipment (preview-cards.js), Impulse (play.js) e Harvest of the Fallen do
// Domain 335 (effects.js, harvestOfTheFallen).
// Interpretações (registrar em docs/v6-efeitos-pendencias.md; o autor confirma):
// - "the defending God"/"the opposing God" = God do adversário, mesmo quando o Strike mira um Devotee.
// - "gains Impulse until end of turn" = fica Prepared se entrou neste turno (a engine lê Impulse só da carta impressa).
// - "look at the top N … rest on the bottom in any order": o resto vai para o fundo na ordem atual.
// - "Pierce" impresso em Equipment (317) vale para o portador.
// - "Once per turn, … you may" marca o uso quando o gatilho nasce, mesmo se o jogador recusar.
import * as k from './kit.js';
// "Target enemy God": único alvo possível, guardado ao conjurar sem pergunta (v6/targets.js; reações como Poseidon 136 o enxergam).
const godOfFoe = (s, c, key) => [k.godTarget(k.other(s, key))];
import {hooks} from '../core.js';
import {contextOf, trigger} from './registry.js';

const foeGod = (s, key) => k.godTarget(k.other(s, key));
const ownGod = key => k.godTarget(key);
const alive = (s, uid) => !!uid && !!k.controllerOf(s, uid);
const berserker = (c, uid) => k.hasType(c, uid, 'Berserker');
// Resonance por personagem: compara o id da carta (o nome de exibição muda no Forge, ex.: "Ethon Alcmenes", 30/10/2026).
const CHARACTER = {'ALCMENES OF ETHON': 271, 'OFIR OF OUROBOROS': 273, 'LIOR OF LAMASSU': 275, 'LOTIS OF LAMIA': 277, 'ISEU OF PYTHON': 279,
  'CATREU OF AKEPHALOS': 281, 'ALCEU OF LAMASSU': 283, 'ARIONTE OF ANFISTA': 285, 'BASIL OF MANTICORE': 287, 'BERSERKER CHAMPION': 302};
const named = (c, uid, name) => !!uid && c.objects[uid]?.cardId === `ares-v6-${CHARACTER[name]}`;
const friends = (s, c, key, pred = () => true) => k.devotees(s, c, key).filter(u => berserker(c, u) && pred(u));
// loseSoul/draw lançam D52 depois da vitória: tudo que vem depois de um dano ao God passa por aqui.
const hit = (st, c, t, n) => { if (!st.victory && t && n > 0) k.damage(st, c, t, n); };
const draw = (st, key, n) => { if (!st.victory) k.draw(st, key, n); };
const loot = (st, c, key, ability) => { draw(st, key, 1); if (!st.victory) k.discard(st, c, key, 1, ability); };
const buff = (st, uid, atk, keywords = []) => { if (alive(st, uid)) k.buff(st, uid, atk, 0, 'this_round', keywords); };

// Histórico do turno (state.events): dano recebido, Strikes declarados, Devotees derrotados.
const thisTurn = (s, ...types) => s.events.filter(e => e.turn === s.turn && types.includes(e.type));
const damagedThisTurn = (s, uid) => thisTurn(s, 'damage').some(e => e.uid === uid && e.dealt > 0);
const defeatedThisTurn = (s, c) => thisTurn(s, 'destroyed', 'sacrificed').filter(e => k.isDevotee(c, e.uid));
const declaredBy = (s, c, key) => [...new Set(thisTurn(s, 'strike_declared').filter(e => e.player === key && berserker(c, e.attacker)).map(e => e.attacker))];
// "damaged by X this turn": dano de efeito marcado em roundUses; dano de Strike lido do strike_resolve entre os dois.
const markHit = (st, src, victim) => st.roundUses.add(`ares-hit:${src}:${victim}:${st.turn}`);
const hitBy = (s, src, victim) => s.roundUses.has(`ares-hit:${src}:${victim}:${s.turn}`)
  || thisTurn(s, 'strike_resolve').some(e => (e.attacker === src && e.target?.uid === victim) || (e.attacker === victim && e.target?.uid === src));

// ---------- perguntas (só na resolução) ----------
const enemyDevotee = (st, c, key, ability, filter = () => true) =>
  k.choose(c, key, ability, k.enemies(st, c, key).filter(filter), {text: 'Choose target enemy Devotee.'});
const enemyOrGod = (st, c, key, ability) =>
  k.choose(c, key, ability, [...k.enemies(st, c, key), foeGod(st, key)], {text: 'Choose target enemy Devotee or God.'});
const friendlyBerserker = (st, c, key, ability, filter = () => true) =>
  k.choose(c, key, ability, friends(st, c, key, filter), {text: 'Choose target friendly Berserker.'});
// "Look at the top N cards of your deck. Put one into your hand and the rest on the bottom."
function lookTop(st, c, key, n, ability) {
  const deck = st.players[key].deck, top = deck.slice(0, n);
  if (!top.length) return;
  const pick = top.length === 1 ? top[0] : c.decide?.(key, {ability, options: top, choose: 'search', text: 'Choose a card to put into your hand.'});
  deck.splice(0, top.length);
  deck.push(...top.filter(u => u !== pick));
  if (pick) { st.players[key].hand.push(pick); k.emit(st, 'revealed', {player: key, uid: pick}); }
}
// Dano simultâneo a vários Devotees; devolve os que saíram do campo nessa verificação ("defeated by this Moment").
function sweep(st, c, targets, n) {
  for (const u of targets) k.damageDevotee(st, c, u, n, false);
  const owners = Object.fromEntries(targets.map(u => [u, k.controllerOf(st, u)]));
  k.checkDefeats(st, c);
  return targets.filter(u => owners[u] && !alive(st, u)).map(u => ({uid: u, owner: owners[u]}));
}

// ---------- "at the end of your turn" de Spell ----------
// A Spell já saiu do campo: o pedido fica em roundUses (string: entra no snapshot e no sync) e um gancho de fim de turno
// o põe na cadeia. shortcut: Technique jogada como resposta no turno adversário só vale se o próximo turno seu
// for no mesmo Round (roundUses limpa no fim do Round); trocar por fila própria na engine se isso pesar.
const LATER = 'ares-eot:';
const later = (st, key, uid, ability, data) =>
  st.roundUses.add(LATER + JSON.stringify({key, uid, ability, n: st.roundUses.size, ...data}));
const LATER_RUN = {
  defeat: (st, c, d) => { if (k.controllerOf(st, d.target) === d.key) k.defeat(st, c, d.target); },
  selfDamage: (st, c, d) => hit(st, c, ownGod(d.key), d.amount),
  bloodOffering: (st, c, d) => hit(st, c, ownGod(d.key), declaredBy(st, c, d.key).length),
  march: (st, c, d) => { for (const u of declaredBy(st, c, d.key)) if (k.controllerOf(st, u) === d.key) k.defeat(st, c, u); },
};
hooks.turnEnd.push(state => {
  const c = contextOf(state);
  if (!c) return [];
  return [...state.roundUses].filter(t => t.startsWith(LATER)).map(t => [t, JSON.parse(t.slice(LATER.length))])
    .filter(([, d]) => d.key === state.active)
    .map(([tag, d]) => {
      state.roundUses.delete(tag);
      return trigger(d.key, d.uid, `${k.card(c, d.uid)?.name || 'Spell'} · ${d.ability}`, st => LATER_RUN[d.kind](st, c, d));
    });
});

// ---------- famílias ----------
// Sem alvo legal ao entrar, o gatilho não vai para a cadeia (não abre janela à toa; guia §56: sem alvo, sem efeito).
const enterDamage = (n, ability, filter) => ({
  enter: (s, c, key, self) => k.enemies(s, c, key).some(u => !filter || filter(s, u)) && (st => {
    const t = enemyDevotee(st, c, key, ability, filter && (u => filter(st, u)));
    if (t) { markHit(st, self, t); hit(st, c, t, n); }
  }),
});
// Rebalanceamento (autor, 30/10/2026): dano automático no God custa Soul — "you may pay N Soul. If you do, deal N…".
const taxed = (st, c, key, ability, n, uid) => !st.victory && st.players[key].soul >= n
  && k.may(c, key, ability, {uid, cost: `${n} Soul`}) && k.paySoul(st, key, n);
const declareGod = (n, ability) => ({declare: (s, c, key, self) => st => { if (taxed(st, c, key, ability, n, self)) hit(st, c, foeGod(st, key), n); }});
const deathGod = (n, ability) => ({defeated: (s, c, key, self) => st => { if (taxed(st, c, key, ability, n, self)) hit(st, c, foeGod(st, key), n); }});
const deathDevotee = (n, ability) => ({defeated: (s, c, key) => st => hit(st, c, enemyDevotee(st, c, key, ability), n)});
const deathAny = (n, ability) => ({defeated: (s, c, key, self) => st => { if (taxed(st, c, key, ability, n, self)) hit(st, c, enemyOrGod(st, c, key, ability), n); }});
const otherFriendlyBerserkerDied = (c, key, other, dead, owner) => owner === key && dead !== other && berserker(c, dead);
const friendlyBerserkerDeclared = (s, c, key, other, attacker) => attacker !== other && k.controllerOf(s, attacker) === key && berserker(c, attacker);
const gearDeclareDamage = (n, ability) => ({gearDeclare: (s, c, key) => st => hit(st, c, enemyDevotee(st, c, key, ability), n)});
const gearDeclareSelf = n => ({gearDeclare: (s, c, key, self, bearer) => st => buff(st, bearer, n)});
const gearDeclareOther = (n, ability) => ({
  gearDeclare: (s, c, key, self, bearer) => st => buff(st, friendlyBerserker(st, c, key, ability, u => u !== bearer), n),
});
const gearDeathGod = (n, ability) => ({bearerDefeated: (s, c, key, self) => st => { if (taxed(st, c, key, ability, n, self)) hit(st, c, foeGod(st, key), n); }});
const gearKillGodTaxed = (n, ability) => ({gearKillInCombat: (s, c, key, self) => st => { if (taxed(st, c, key, ability, n, self)) hit(st, c, foeGod(st, key), n); }});
// "That God's controller / target opponent discards a card[, then draws a card]."
const opponentDiscards = (st, c, key, ability, thenDraw = 0) => {
  const foe = k.other(st, key);
  k.discard(st, c, foe, 1, ability);
  if (thenDraw) draw(st, foe, thenDraw);
};
// Aura de Equipment: o portador ganha keywords se `cond(c, portador)`.
const gearKeywords = (keywords, cond = () => true) => ({
  aura: (s, c, key, self, unit) => (unit === k.bearerOf(c, self) && cond(c, unit) ? {keywords} : null),
});
const merge = (...parts) => Object.assign({}, ...parts);

export default {
  // The Altar of Slaughter (autor, 31/10/2026): Domain ativado; sacrifica um Devotee seu, perde 1 Soul e compra 1.
  'ares-v6-503': {
    activate: {name: 'BLOOD OFFERING', cost: 0, once: true, tap: false,
      check: (s, c, key) => { if (!k.devotees(s, c, key).length) throw new k.RuleError('BLOOD OFFERING', 'sem Devotee para sacrificar'); },
      run: (s, c, key) => {
        const t = k.choose(c, key, 'BLOOD OFFERING', k.devotees(s, c, key), {text: 'Choose a friendly Devotee to sacrifice.'});
        if (!t) return;
        k.sacrifice(s, c, t);
        k.loseSoulOf(s, key, 1);
        if (!s.victory) k.draw(s, key, 1);
      }},
  },
  // Alcmenes of Ethon
  'ares-v6-271': merge(enterDamage(3, 'CRIMSON ARRIVAL'), declareGod(2, 'PROMETHEAN FIRE'), {
    killInCombat: (s, c, key, self) => k.onceTurn(s, `${self}:inferno`) && (st => { if (alive(st, self)) k.prepare(st, self); }),
  }),
  // Ethon Warplate
  'ares-v6-272': merge(gearKeywords(['Pierce'], (c, b) => named(c, b, 'ALCMENES OF ETHON')), {
    gearCombatDamage: (s, c, key, self) => st => { if (taxed(st, c, key, 'SCORCHING IMPACT', 1, self)) hit(st, c, foeGod(st, key), 1); },
  }),
  // Ofir of Ouroboros
  'ares-v6-273': {
    enter: (s, c, key) => st => lookTop(st, c, key, 3, 'BATTLEFIELD INSIGHT'),
    watchDeclare: (s, c, key, self, attacker) => {
      if (friendlyBerserkerDeclared(s, c, key, self, attacker)) return st => buff(st, attacker, 1);
      if (k.controllerOf(s, attacker) !== key && k.onceTurn(s, `${self}:mind`)) return st => buff(st, friendlyBerserker(st, c, key, 'MIND READING'), 2);
    },
  },
  // Ouroboros Warplate
  'ares-v6-274': merge(gearDeclareOther(2, 'FLAME COORDINATION'), {
    watchKill: (s, c, key, self, killer) =>
      named(c, k.bearerOf(c, self), 'OFIR OF OUROBOROS') && berserker(c, killer) && (st => loot(st, c, key, 'OUROBOROS RESONANCE')),
  }),
  // Lior of Lamassu
  'ares-v6-275': {
    watchDefeat: (s, c, key, self, dead, owner) =>
      otherFriendlyBerserkerDied(c, key, self, dead, owner) && (st => { if (taxed(st, c, key, 'CRUEL ENTERTAINMENT', 1, self)) hit(st, c, enemyOrGod(st, c, key, 'CRUEL ENTERTAINMENT'), 1); }),
    activate: {
      name: 'SUICIDE ORDERS', cost: 0, tap: false,
      check: (s, c, key, self) => {
        if (s.roundUses.has(`${self}:suicide`)) throw new k.RuleError('once', 'Suicide Orders já foi usada nesta rodada');
        if (!friends(s, c, key, u => u !== self).length) throw new k.RuleError('alvo', 'sem outro Berserker amigo');
      },
      run: (s, c, key, self) => {
        const victim = friendlyBerserker(s, c, key, 'SUICIDE ORDERS', u => u !== self);
        if (!victim) return;
        k.onceTurn(s, `${self}:suicide`);
        k.defeat(s, c, victim);
        buff(s, self, 3, ['Pierce']);
      },
    },
  },
  // Lamassu Warplate
  'ares-v6-276': merge(gearDeclareDamage(1, 'RAZOR WINDS'), {
    watchDefeat: (s, c, key, self, dead, owner) => {
      const bearer = k.bearerOf(c, self);
      if (!named(c, bearer, 'LIOR OF LAMASSU') || !otherFriendlyBerserkerDied(c, key, bearer, dead, owner)) return;
      return st => { if (alive(st, bearer) && k.may(c, key, 'LAMASSU RESONANCE', {uid: bearer, text: 'Prepare Lior?'})) k.prepare(st, bearer); };
    },
  }),
  // Lotis of Lamia. Illusory Escape (gancho watchSpell: alvos escolhidos ao conjurar).
  // shortcut: só Spell inimiga (habilidade ativada não avisa alvo); "cancel the effect on Lotis" contraria a Spell só quando
  // Lotis é o único alvo — com vários alvos não há como tirar só a parte de Lotis.
  'ares-v6-277': {
    watchSpell: (s, c, key, self, caster, spellUid, targets = []) => caster !== key && targets.length === 1 && targets[0] === self
      && s.players[key].hand.length && !s.roundUses.has(`${self}:escape`) && (st => {
        if (!k.spellOnChain(st, spellUid) || !k.may(c, key, 'ILLUSORY ESCAPE', {uid: self, cost: 'discard a card'})) return;
        if (k.discard(st, c, key, 1, 'ILLUSORY ESCAPE').length) { k.once(st, `${self}:escape`); k.counterSpell(st, c, spellUid); }
      }),
    enter: (s, c, key) => st => opponentDiscards(st, c, key, 'NIGHTMARE MANIFESTATION'),
    godDamage: (s, c, key) => st => opponentDiscards(st, c, key, 'TORMENT'),
  },
  // Lamia Warplate
  'ares-v6-278': {
    gearGodDamage: (s, c, key) => st => opponentDiscards(st, c, key, 'HAUNTING PRESENCE'),
    watchDiscard: (s, c, key, self, player) =>
      player !== key && named(c, k.bearerOf(c, self), 'LOTIS OF LAMIA') && k.onceTurn(s, `${self}:lamia`) && (st => { if (taxed(st, c, key, 'LAMIA RESONANCE', 1, self)) hit(st, c, k.godTarget(player), 1); }),
  },
  // Iseu of Python
  'ares-v6-279': merge(enterDamage(1, "SERPENT'S AMBUSH"), {
    watchDefeat: (s, c, key, self, dead, owner) => otherFriendlyBerserkerDied(c, key, self, dead, owner) && (st => buff(st, self, 2)),
  }),
  // Python Warplate
  'ares-v6-280': {
    gearCombatDamage: (s, c, key, self, bearer, victim) => st => { if (st.units[victim]) st.units[victim].skipPrepare = true; },
    watchDefeat: (s, c, key, self, dead, owner) => {
      const bearer = k.bearerOf(c, self);
      return named(c, bearer, 'ISEU OF PYTHON') && otherFriendlyBerserkerDied(c, key, bearer, dead, owner)
        && (st => hit(st, c, enemyDevotee(st, c, key, 'PYTHON RESONANCE'), 1));
    },
  },
  // Catreu of Akephalos
  'ares-v6-281': merge(enterDamage(1, 'MERCILESS ARRIVAL'), deathGod(1, 'DEATH WITHOUT FEAR'), {
    watchDefeat: (s, c, key, self, dead, owner) => otherFriendlyBerserkerDied(c, key, self, dead, owner) && (st => buff(st, self, 1)),
  }),
  // Akephalos Warplate
  'ares-v6-282': merge(gearKillGodTaxed(1, 'RELENTLESS EXECUTION'), {
    bearerDefeated: (s, c, key, self, bearer) =>
      named(c, bearer, 'CATREU OF AKEPHALOS') && (st => { if (taxed(st, c, key, 'AKEPHALOS RESONANCE', 2, self)) hit(st, c, enemyOrGod(st, c, key, 'AKEPHALOS RESONANCE'), 2); }),
  }),
  // Alceu of Lamassu
  'ares-v6-283': {
    enter: (s, c, key, self) => st => {
      const picked = k.chooseUpTo(c, key, 'RAVAGING WINDS', k.enemies(st, c, key), 2, {text: 'Choose up to two target enemy Devotees.'});
      sweep(st, c, picked, 1);
    },
    declare: (s, c, key, self) => st => {
      const n = Math.min(3, defeatedThisTurn(st, c).filter(e => e.owner === key && e.uid !== self && berserker(c, e.uid)).length);
      if (n) buff(st, self, n);
    },
  },
  // Alceu's Warplate
  'ares-v6-284': merge(gearDeclareDamage(1, 'GALE ASSAULT'), {
    watchDefeat: (s, c, key, self, dead, owner) => {
      const bearer = k.bearerOf(c, self);
      return named(c, bearer, 'ALCEU OF LAMASSU') && otherFriendlyBerserkerDied(c, key, bearer, dead, owner) && (st => buff(st, bearer, 1));
    },
  }),
  // Arionte of Anfista
  'ares-v6-285': merge(enterDamage(1, "PREDATOR'S ARRIVAL", damagedThisTurn), {
    killInCombat: (s, c, key, self) => k.onceTurn(s, `${self}:pursuit`) && (st => { if (alive(st, self)) k.prepare(st, self); }),
  }),
  // Anfista Warplate. Blood Pursuit: o alvo precisa estar danificado quando o gatilho resolve (antes do dano do Strike).
  'ares-v6-286': {
    gearDeclare: (s, c, key, self, bearer, target) => target.kind === 'devotee'
      && (st => { if (st.units[target.uid]?.damage > 0 && alive(st, bearer)) k.buff(st, bearer, 2, 0, 'this_strike'); }),
    gearKillInCombat: (s, c, key, self, bearer) => named(c, bearer, 'ARIONTE OF ANFISTA') && (st => { if (taxed(st, c, key, 'ANFISTA RESONANCE', 1, self)) hit(st, c, foeGod(st, key), 1); }),
  },
  // Basil of Manticore
  'ares-v6-287': merge(enterDamage(1, 'VENOMOUS ARRIVAL'), {
    combatDamage: (s, c, key, self, victim) => st => buff(st, victim, -1),
    watchDefeat: (s, c, key, self, dead, owner) => owner !== key && hitBy(s, self, dead) && (st => hit(st, c, k.godTarget(owner), 1)),
  }),
  // Manticore Warplate
  'ares-v6-288': {
    gearCombatDamage: (s, c, key, self, bearer, victim) => st => buff(st, victim, -1),
    watchDefeat: (s, c, key, self, dead, owner) => {
      const bearer = k.bearerOf(c, self);
      return named(c, bearer, 'BASIL OF MANTICORE') && owner !== key && hitBy(s, bearer, dead) && (st => loot(st, c, key, 'MANTICORE RESONANCE'));
    },
  },
  // Enyo, Spear of Destruction
  'ares-v6-289': merge(gearDeclareDamage(3, 'FLAME OF ANNIHILATION'), gearKillGodTaxed(3, 'DIVINE DESTRUCTION'), gearKeywords(['Pierce'], berserker)),
  // 290 Shield of the War God. Warborn Defiance (gancho gearSurvive): o portador sobreviveu ao combate; 2 de dano ao Devotee inimigo
  // envolvido. Unyielding Fury (gancho gearTookDamage): ao tomar dano, +2 ATK até o fim do turno (aproximado por 'this_round', como o buff).
  'ares-v6-290': {
    gearSurvive: (s, c, key, self, bearer, role, foe) => !!foe && (st => { if (alive(st, foe)) hit(st, c, foe, 2); }),
    gearTookDamage: (s, c, key, self, bearer) => st => buff(st, bearer, 2),
  },
  'ares-v6-291': declareGod(1, 'BURNING ASSAULT'),
  'ares-v6-292': {watchDeclare: (s, c, key, self, attacker) => friendlyBerserkerDeclared(s, c, key, self, attacker) && (st => buff(st, self, 1))},
  'ares-v6-293': deathGod(1, 'GLORIOUS DEMISE'),
  'ares-v6-294': {godDamage: (s, c, key) => st => opponentDiscards(st, c, key, 'PSYCHOLOGICAL WARFARE')},
  'ares-v6-295': {
    declare: (s, c, key, self) => st => buff(st, self, 1),
    endTurn: (s, c, key, self) => s.strikes.get(self) === s.turn && (st => { if (alive(st, self)) k.defeat(st, c, self); }),
  },
  'ares-v6-296': {enter: (s, c, key) => st => buff(st, friendlyBerserker(st, c, key, 'WAR CRY'), 1)},
  'ares-v6-297': enterDamage(1, 'BURNING EXECUTION', damagedThisTurn),
  'ares-v6-298': {enter: (s, c, key, self) => st => buff(st, friendlyBerserker(st, c, key, 'TACTICAL OPENING', u => u !== self), 1)},
  'ares-v6-299': {godDamage: (s, c, key) => st => hit(st, c, enemyDevotee(st, c, key, 'SCORCHED EARTH'), 1)},
  'ares-v6-300': {
    enter: (s, c, key) => st => buff(st, enemyDevotee(st, c, key, 'CRIPPLING TERROR'), -1),
    godDamage: (s, c, key) => st => opponentDiscards(st, c, key, 'LINGERING NIGHTMARE', 1),
  },
  'ares-v6-301': deathDevotee(1, 'CATASTROPHIC END'),
  // Berserker Champion
  'ares-v6-302': {
    watchDeclare: (s, c, key, self, attacker) => friendlyBerserkerDeclared(s, c, key, self, attacker) && (st => buff(st, self, 1)),
    killInCombat: (s, c, key, self) => st => { if (taxed(st, c, key, 'UNQUENCHABLE FURY', 2, self)) hit(st, c, foeGod(st, key), 2); },
  },
  // 303 Bloodstained Gladiator: Bloodied Pride (gancho tookDamage), Strike ou efeito.
  'ares-v6-303': {tookDamage: (s, c, key) => st => hit(st, c, ownGod(key), 1)},
  'ares-v6-304': {
    declare: (s, c, key, self, target) =>
      target.kind === 'devotee' && k.keywordsOf(s, c, target.uid).includes('Guardian') && (st => buff(st, self, 2)),
  },
  'ares-v6-305': {declare: (s, c, key) => st => hit(st, c, ownGod(key), 1)},
  'ares-v6-306': {
    watchDeclare: (s, c, key, self, attacker) => friendlyBerserkerDeclared(s, c, key, self, attacker)
      && k.onceTurn(s, `${self}:drums`) && (st => buff(st, attacker, 1)),
  },
  // Divine Flame Disciple: {1}{C}, {T}, 2 cartas do Tartarus para o Void.
  'ares-v6-307': {
    activate: {
      name: 'WARFLAME', cost: 1,
      check: (s, c, key) => { if (s.players[key].tartarus.length < 2) throw new k.RuleError('custo', 'precisa de 2 cartas no Tartarus'); },
      run: (s, c, key) => {
        for (let i = 0; i < 2; i++) {
          const pile = s.players[key].tartarus;
          const uid = pile.length === 1 ? pile[0] : c.decide?.(key, {ability: 'WARFLAME', options: [...pile], choose: 'target', text: 'Choose a card to send to the Void.'});
          if (uid) k.exile(s, c, uid, 'tartarus');
        }
        const t = enemyOrGod(s, c, key, 'WARFLAME');
        hit(s, c, t, k.isGod(t) ? 1 : 2);
      },
    },
  },
  'ares-v6-308': {endTurn: (s, c, key, self) => s.strikes.get(self) !== s.turn && (st => hit(st, c, ownGod(key), 1))},
  // Ares' Royal Guard. War God's Protection (gancho watchTookDamage): outro Berserker amigo tomou dano; pode causar 1 a um Devotee inimigo.
  'ares-v6-309': {
    watchTookDamage: (s, c, key, self, unit) => unit !== self && k.controllerOf(s, unit) === key && berserker(c, unit) && (st => {
      if (!k.enemies(st, c, key).length || !k.may(c, key, "WAR GOD'S PROTECTION", {uid: self, text: 'Deal 1 damage to target enemy Devotee?'})) return;
      hit(st, c, enemyDevotee(st, c, key, "WAR GOD'S PROTECTION"), 1);
    }),
    mods: (s, c, key, self) => {
      const n = Math.min(3, declaredBy(s, c, key).filter(u => u !== self).length);
      return n ? [{atk: n}] : [];
    },
  },
  'ares-v6-310': {
    enter: (s, c, key, self) => st => {
      if (st.victory || !k.may(c, key, 'WARBOUND OATH', {uid: self, cost: '1 damage to your God'})) return;
      hit(st, c, ownGod(key), 1);
      if (!alive(st, self)) return;
      buff(st, self, 0, ['Impulse']);
      if (st.units[self].entered === st.turn) k.prepare(st, self);
    },
  },
  'ares-v6-311': {
    enter: (s, c, key, self) => st => {
      if (st.victory || !k.may(c, key, 'BLOOD COVENANT', {uid: self, cost: '2 damage to your God'})) return;
      hit(st, c, ownGod(key), 2);
      loot(st, c, key, 'BLOOD COVENANT');
    },
  },
  'ares-v6-312': {
    watchDefeat: (s, c, key, self, dead, owner) => otherFriendlyBerserkerDied(c, key, self, dead, owner) && k.onceTurn(s, `${self}:scavenger`)
      && (st => {
        if (!st.players[key].hand.length || !k.may(c, key, "SCAVENGER'S REWARD", {uid: self, text: 'Discard a card to draw a card?'})) return;
        if (k.discard(st, c, key, 1, "SCAVENGER'S REWARD").length) draw(st, key, 1);
      }),
  },
  'ares-v6-313': merge(deathAny(1, 'FINAL EXPLOSION'), {
    endTurn: (s, c, key, self) => st => { if (alive(st, self)) k.defeat(st, c, self); },
  }),
  'ares-v6-314': gearDeathGod(1, 'LAST PROTECTION'),
  'ares-v6-315': gearDeclareSelf(1),
  'ares-v6-316': gearKillGodTaxed(1, 'BLOOD HUNGER'),
  'ares-v6-317': merge(gearKeywords(['Pierce']), gearDeathGod(1, "DEATH'S TRIBUTE")),
  'ares-v6-318': {
    gearCombatDamage: (s, c, key, self, bearer, victim) => st => hit(st, c, enemyDevotee(st, c, key, 'SAVAGE CLEAVE', u => u !== victim), 1),
  },
  'ares-v6-319': gearDeclareOther(1, 'RHYTHM OF DESTRUCTION'),
  'ares-v6-320': gearDeclareDamage(1, 'FLAMING PROJECTILE'),
  'ares-v6-321': merge(gearDeclareSelf(2), {
    endTurn: (s, c, key, self) => {
      const bearer = k.bearerOf(c, self);
      return !!bearer && s.strikes.get(bearer) === s.turn && (st => hit(st, c, ownGod(key), 1));
    },
  }),

  // ---------- Spells ----------
  'ares-v6-322': {spell: {run: (s, c, key) => {
    const t = enemyDevotee(s, c, key, 'FIRST STRIKE');
    if (t) hit(s, c, t, damagedThisTurn(s, t) ? 2 : 3);
  }}},
  // Impulse até o fim do turno: ver interpretação no topo.
  'ares-v6-323': {spell: {run: (s, c, key) => {
    const t = friendlyBerserker(s, c, key, 'BATTLE CHARGE');
    if (!t) return;
    buff(s, t, 2, ['Impulse']);
    if (s.units[t].entered === s.turn) k.prepare(s, t);
  }}},
  'ares-v6-324': {spell: {run: (s, c, key, self) => {
    const t = k.choose(c, key, 'UNCONTROLLED POWER', k.devotees(s, c, key), {text: 'Choose target friendly Devotee.'});
    if (!t) return;
    buff(s, t, 4);
    later(s, key, self, 'UNCONTROLLED POWER', {kind: 'defeat', target: t});
  }}},
  'ares-v6-325': {spell: {run: (s, c, key) => buff(s, friendlyBerserker(s, c, key, 'MERCILESS STRIKE'), 2, ['Pierce'])}},
  'ares-v6-326': {spell: {run: (s, c, key) => {
    const mine = friendlyBerserker(s, c, key, 'BLOOD EXCHANGE');
    if (!mine) return;
    const atk = k.atkOf(s, c, mine); // ATK com que saiu do campo
    k.defeat(s, c, mine);
    hit(s, c, enemyDevotee(s, c, key, 'BLOOD EXCHANGE'), atk);
  }}},
  'ares-v6-327': {spell: {run: (s, c, key) =>
    sweep(s, c, k.chooseUpTo(c, key, 'SPEAR BARRAGE', k.enemies(s, c, key), 3, {text: 'Choose up to three target enemy Devotees.'}), 2)}},
  'ares-v6-328': {spell: {run: (s, c, key) => { sweep(s, c, k.enemies(s, c, key), 2); hit(s, c, ownGod(key), 1); }}},
  'ares-v6-329': {spell: {run: (s, c, key, self) => {
    const t = friendlyBerserker(s, c, key, 'RECKLESS MOMENTUM');
    if (t) { k.prepare(s, t); buff(s, t, 1); }
    later(s, key, self, 'RECKLESS MOMENTUM', {kind: 'selfDamage', amount: 2});
  }}},
  'ares-v6-330': {spell: {run: (s, c, key) => {
    let n = 0;
    for (let i = 0; i < 2 && s.players[key].hand.length && k.may(c, key, 'RAGING RENEWAL', {text: 'Discard a card?'}); i++) {
      n += k.discard(s, c, key, 1, 'RAGING RENEWAL').length;
    }
    draw(s, key, n + 1);
    hit(s, c, ownGod(key), 1);
  }}},
  'ares-v6-331': {spell: {run: (s, c, key, self) => {
    for (const u of friends(s, c, key)) buff(s, u, 2);
    later(s, key, self, 'BLOOD OFFERING', {kind: 'bloodOffering'});
  }}},

  // ---------- Domains (self = `domain:${key}`) ----------
  // Ares' War Temple
  'ares-v6-332': {
    aura: (s, c, key, self, unit) => (k.controllerOf(s, unit) === key && berserker(c, unit) ? {atk: 1} : null),
    watchKill: (s, c, key, self, killer) => berserker(c, killer) && k.onceTurn(s, `${self}:bloodshed`) && (st => { if (taxed(st, c, key, 'ETERNAL BLOODSHED', 2, self)) hit(st, c, foeGod(st, key), 2); }),
  },
  'ares-v6-333': {
    watchDeclare: (s, c, key, self, attacker) =>
      friendlyBerserkerDeclared(s, c, key, null, attacker) && k.onceTurn(s, `${self}:scorched`) && (st => { if (taxed(st, c, key, 'SCORCHED GROUND', 1, self)) hit(st, c, foeGod(st, key), 1); }),
    endTurn: (s, c, key) => defeatedThisTurn(s, c).some(e => e.owner !== key) && (st => hit(st, c, ownGod(key), 1)),
  },
  'ares-v6-334': {
    watchKill: (s, c, key, self, killer) => berserker(c, killer) && (st => buff(st, killer, 2)),
    watchDefeat: (s, c, key, self, dead, owner) =>
      otherFriendlyBerserkerDied(c, key, null, dead, owner) && k.onceTurn(s, `${self}:spectacle`) && (st => loot(st, c, key, 'BLOOD SPECTACLE')),
  },
  // The Fields of Carnage: Harvest of the Fallen fica em effects.js; aqui só Unending Slaughter.
  'ares-v6-335': {
    endTurn: (s, c, key) => defeatedThisTurn(s, c).length >= 3 && (st => loot(st, c, key, 'UNENDING SLAUGHTER')),
  },

  // ---------- Legion Warplates ----------
  'ares-v6-336': merge(gearKeywords(['Pierce'], (c, b) => berserker(c, b) && k.hasType(c, b, 'Red Fire Legion')), {
    gearDeclare: (s, c, key, self) => st => { if (taxed(st, c, key, 'BURNING STRIKE', 1, self)) hit(st, c, foeGod(st, key), 1); },
  }),
  // Flame Resonance (gancho watchSpell): portador Flame Legion Berserker e você conjura Moment ou Technique (Event/Miracle jogam
  // como Technique, §54): +1 ATK até o fim do turno. Só devolve gatilho quando vale (senão a Spell resolve sem janela).
  'ares-v6-337': merge(gearDeclareOther(1, 'CALCULATED STRIKE'), {
    watchSpell: (s, c, key, self, caster, spellUid) => {
      const bearer = k.bearerOf(c, self);
      return caster === key && !!bearer && berserker(c, bearer) && k.hasType(c, bearer, 'Flame Legion') &&
        /Moment|Technique|Event|Miracle/.test(k.card(c, spellUid)?.type || '') && (st => buff(st, bearer, 1));
    },
  }),
  'ares-v6-338': {
    bearerDefeated: (s, c, key, self, bearer) => st => {
      hit(st, c, enemyDevotee(st, c, key, 'LAST LAUGH'), 2);
      if (k.hasType(c, bearer, 'Disaster Legion') && taxed(st, c, key, 'DISASTER RESONANCE', 1, self)) hit(st, c, foeGod(st, key), 1);
    },
  },
  'ares-v6-339': {
    gearGodDamage: (s, c, key) => st => opponentDiscards(st, c, key, 'NIGHTMARE STRIKE', 1),
    watchDiscard: (s, c, key, self, player) => {
      const bearer = k.bearerOf(c, self);
      return player !== key && !!bearer && k.hasType(c, bearer, 'Fear Legion') && k.onceTurn(s, `${self}:fear`) && (st => buff(st, bearer, 1));
    },
  },
  'ares-v6-340': merge(gearKillGodTaxed(1, "CHAMPION'S FEROCITY"), {
    watchDeclare: (s, c, key, self, attacker) => {
      const bearer = k.bearerOf(c, self);
      return named(c, bearer, 'BERSERKER CHAMPION') && friendlyBerserkerDeclared(s, c, key, bearer, attacker) && (st => buff(st, bearer, 1));
    },
  }),
  // Crimson Fire Guardian. Crimson Retaliation (gancho tookDamage): dano de combate de Devotee inimigo, 2 de volta nele.
  'ares-v6-341': {
    tookDamage: (s, c, key, self, info) => info.combat && !!info.foe && (st => { if (alive(st, info.foe)) hit(st, c, info.foe, 2); }),
    killInCombat: (s, c, key, self) => st => { if (taxed(st, c, key, 'BURNING PRIDE', 2, self)) hit(st, c, foeGod(st, key), 2); }},
  'ares-v6-342': {
    enter: (s, c, key) => st => lookTop(st, c, key, 3, 'STRATEGIC DEPLOYMENT'),
    watchDeclare: (s, c, key, self, attacker) => friendlyBerserkerDeclared(s, c, key, self, attacker)
      && k.onceTurn(s, `${self}:calculated`) && (st => {
        if (!alive(st, attacker) || !st.players[key].hand.length || !k.may(c, key, 'CALCULATED ASSAULT', {uid: attacker, cost: 'Discard a card'})) return;
        if (k.discard(st, c, key, 1, 'CALCULATED ASSAULT').length) buff(st, attacker, 2, ['Pierce']);
      }),
  },
  'ares-v6-343': merge(deathAny(1, 'LAST BREATH OF THE STORM'), {
    declare: (s, c, key) => st => hit(st, c, enemyDevotee(st, c, key, 'RAZORWIND ASSAULT'), 1),
  }),
  'ares-v6-344': {
    enter: (s, c, key) => st => opponentDiscards(st, c, key, 'WHISPERS OF TERROR', 1),
    watchDiscard: (s, c, key, self, player) => player !== key && k.onceTurn(s, `${self}:feast`) && (st => buff(st, self, 1)),
    godDamage: (s, c, key) => st => hit(st, c, enemyDevotee(st, c, key, 'ILLUSORY TORMENT'), 1),
  },
  'ares-v6-345': {
    enter: (s, c, key, self) => st => { sweep(st, c, k.allDevotees(st, c).filter(u => u !== self), 1); },
    watchDefeat: (s, c, key, self, dead) => dead !== self && (st => buff(st, self, 1)),
  },
  'ares-v6-346': {spell: {run: (s, c, key, self) => {
    for (const u of friends(s, c, key)) buff(s, u, 2, ['Pierce']);
    later(s, key, self, 'MARCH TO OBLIVION', {kind: 'march'});
  }}},
  'ares-v6-347': {spell: {run: (s, c, key) => {
    const picked = k.chooseUpTo(c, key, 'DISPOSABLE SOLDIERS', friends(s, c, key), 2, {text: 'Choose up to two target friendly Berserkers.'});
    let n = 0;
    for (const u of picked) if (alive(s, u)) { k.defeat(s, c, u); n++; }
    if (n) hit(s, c, enemyOrGod(s, c, key, 'DISPOSABLE SOLDIERS'), 2 * n);
  }}},
  'ares-v6-348': {spell: {run: (s, c, key) => {
    const foe = k.other(s, key), n = k.discard(s, c, foe, 2, 'LIVING NIGHTMARE').length;
    hit(s, c, k.godTarget(foe), n);
  }}},
  'ares-v6-349': {spell: {run: (s, c, key) => {
    lookTop(s, c, key, 4, 'DIVINE INSIGHT');
    for (const u of k.chooseUpTo(c, key, 'FLAME COORDINATION', friends(s, c, key), 2, {text: 'Choose up to two target friendly Berserkers.'})) buff(s, u, 2);
  }}},
  'ares-v6-350': {spell: {run: (s, c, key) => {
    const t = enemyDevotee(s, c, key, 'PROMETHEAN INFERNO');
    if (!t) return;
    const owner = k.controllerOf(s, t);
    hit(s, c, t, 4);
    hit(s, c, k.godTarget(owner), 2);
  }}},
  'ares-v6-351': {spell: {run: (s, c, key) => hit(s, c, foeGod(s, key), sweep(s, c, k.enemies(s, c, key), 2).length)}},
  'ares-v6-352': {spell: {run: (s, c, key) => {
    const dead = sweep(s, c, k.allDevotees(s, c), 3);
    for (const p of s.order) hit(s, c, k.godTarget(p), dead.filter(d => d.owner === p).length);
  }}},
  'ares-v6-353': {spell: {run: (s, c, key) => {
    const mine = friends(s, c, key);
    for (const u of mine) buff(s, u, 2);
    const legions = ['Red Fire Legion', 'Flame Legion', 'Disaster Legion', 'Fear Legion'];
    if (!legions.every(l => mine.some(u => k.hasType(c, u, l)))) return;
    for (const u of mine) buff(s, u, 0, ['Pierce']);
    for (const u of k.chooseUpTo(c, key, 'FOURFOLD ASSAULT', mine, 4, {text: 'Choose up to four friendly Berserkers to Prepare.'})) k.prepare(s, u);
  }}},
  'ares-v6-354': {spell: {run: (s, c, key) => {
    const t = enemyDevotee(s, c, key, 'LEGENDARY DEFEAT');
    const [dead] = t ? sweep(s, c, [t], 5) : [];
    if (dead) hit(s, c, k.godTarget(dead.owner), 2);
  }}},
  'ares-v6-355': {spell: {run: (s, c, key, self) => {
    buff(s, friendlyBerserker(s, c, key, 'DIVINE RAGE'), 5, ['Pierce']);
    later(s, key, self, 'BLOOD PRICE', {kind: 'selfDamage', amount: 3});
  }}},
  'ares-v6-356': {spell: {run: (s, c, key) => {
    const t = enemyDevotee(s, c, key, 'SHATTERED SANCTUARY', u => k.keywordsOf(s, c, u).includes('Guardian'));
    const [dead] = t ? sweep(s, c, [t], 3) : [];
    if (dead) hit(s, c, k.godTarget(dead.owner), 2);
  }}},
  'ares-v6-357': {spell: {targets: godOfFoe, run: (s, c, key) => {
    const foe = k.other(s, key);
    k.loseSoulOf(s, foe, 3);
    if (!s.victory && s.players[foe].soul <= 10) loot(s, c, key, 'OPPORTUNITY FOR WAR');
  }}},
  'ares-v6-358': {spell: {run: (s, c, key) => {
    sweep(s, c, k.enemies(s, c, key), 4);
    for (const u of friends(s, c, key)) buff(s, u, 3, ['Pierce']);
  }}},
  'ares-v6-359': {spell: {run: (s, c, key) => {
    const dead = sweep(s, c, k.allDevotees(s, c), 5);
    const mine = dead.filter(d => d.owner === key && berserker(c, d.uid)).length, theirs = dead.filter(d => d.owner !== key).length;
    hit(s, c, foeGod(s, key), mine + theirs);
  }}},
  'ares-v6-360': {spell: {run: (s, c, key) => {
    const all = k.allDevotees(s, c);
    for (const u of all) k.defeat(s, c, u);
    hit(s, c, foeGod(s, key), all.filter(u => berserker(c, u)).length);
    draw(s, key, 3);
    if (!s.victory) k.discard(s, c, key, 2, 'UNENDING CONFLICT');
  }}},
};
