// Efeitos V6 de Athena (devotees) que a tabela por número (effects.js) não cobre. Ver ./athena.js.
// Texto: card-forge/art-web/cards.json (habilidades_en). Dúvidas: docs/v6-efeitos-pendencias.md ("Athena — Devotees").
import * as k from './kit.js';
import {spendBase, addSeal} from '../core.js';
import {shield, isSaint, isBronze, forbidStrike, forbidPrepare} from '../effects.js';

const name = (c, uid) => k.card(c, uid)?.name || '';
const sealed = (s, uid) => (s.units[uid]?.seal || 0) > 0;
const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
const saints = (s, c, key) => k.devotees(s, c, key).filter(u => isSaint(c, u));
const hasName = (s, c, key, re) => k.devotees(s, c, key).some(u => re.test(name(c, u)));
const ikki = /Phoenix Ikki/i;
// Moment ou Technique (Event e Miracle jogam como Technique, guia §54).
const isMT = (c, uid) => /Moment|Technique|Event|Miracle/.test(k.card(c, uid)?.type || '');

// "You may pay {N}{C}": Bases preparadas (mesma convenção de poseidon.js).
function pay(st, c, key, n, ability, uid) {
  if (ready(st, key) < n || !k.may(c, key, ability, {uid, cost: `${n} Cosmo`})) return false;
  spendBase(st, key, n);
  return true;
}
const inStrike = (attacker, target, uid) => attacker === uid || (target.kind === 'devotee' && target.uid === uid);
// "Strike contra o seu God ou outro Saint amigo", declarado por um Devotee inimigo.
const againstAlly = (s, c, key, self, attacker, target) => k.controllerOf(s, attacker) !== key && (
  (target.kind === 'god' && target.player === key) ||
  (target.kind === 'devotee' && target.uid !== self && k.controllerOf(s, target.uid) === key && isSaint(c, target.uid)));
// "Cannot declare another Strike this round" (gancho cannotStrike): marca exata, vale até o fim do Round nos dois turnos.
const lockStrike = (s, uid) => { if (s.units[uid]) forbidStrike(s, uid); };
// "Choose one: Remove N damage from target friendly Devotee; or your God gains {S}{S}" (Miho 035, Healer 041; 31/10/2026).
// `choice` ({target} ou {mode: 'soul'}) vem de play.activate; sem ele, pergunta. Sem Devotee ferido, só resta o Soul.
function healOrSoul(s, c, key, ability, heal, soul, choice = {}) {
  const modes = [`Remove ${heal} damage`, `Gain ${soul} Soul`];
  const damaged = k.devotees(s, c, key).filter(u => s.units[u]?.damage > 0);
  let t = choice.mode === 'soul' ? null : damaged.includes(choice.target) ? choice.target : undefined;
  if (t === undefined) {
    const m = !damaged.length ? modes[1] : c.decide ? c.decide(key, {ability, options: modes, choose: 'mode', text: 'Choose one.'}) : modes[0];
    t = m === modes[0] ? k.choose(c, key, ability, damaged, {text: `Remove ${heal} damage from target friendly Devotee.`}) : null;
  }
  if (t) k.removeDamage(s, t, heal);
  else k.gainSoul(s, key, soul);
}
const enchantress = (s, c, key, self, gear) => !k.card(c, gear)?.armor && k.once(s, `${self}:enchant`) && (st => k.draw(st, key, 1));
// "Once each round, when X deals Strike damage to an enemy Devotee, <efeito>": uso gasto ao resolver (se o alvo ainda existir).
const onHit = (tag, run) => (s, c, key, self, victim) => !s.roundUses.has(`${self}:${tag}`) && (st => {
  if (st.units[victim] && k.controllerOf(st, victim) !== key && k.once(st, `${self}:${tag}`)) run(st, c, key, self, victim);
});
const weaken = tag => onHit(tag, (st, c, key, self, victim) => k.buff(st, victim, -1, 0));
const seal = (tag, label) => onHit(tag, (st, c, key, self, victim) => addSeal(st, c, [victim], 1, label));
// "Once each round, when X declares a Strike [against …], he gets +1 ATK during that Strike" (obrigatório, vale já na declaração).
const boostOnDeclare = (tag, cond) => (s, c, key, self, target) => target.kind === 'devotee' && cond(s, c, self, target.uid) &&
  !s.roundUses.has(`${self}:${tag}`) && k.once(s, `${self}:${tag}`) && (st => k.buff(st, self, 1, 0, 'this_strike'));
// "Once each round, when an enemy Devotee declares a Strike against X, you may pay {N}{C}. If you do, that Devotee gets -N ATK."
const payShade = (tag, ability, cost, amount) => (s, c, key, self, attacker, target) => {
  if (target.kind !== 'devotee' || target.uid !== self || k.controllerOf(s, attacker) === key || s.roundUses.has(`${self}:${tag}`) || ready(s, key) < cost) return;
  return st => {
    if (!st.units[attacker] || st.roundUses.has(`${self}:${tag}`) || !pay(st, c, key, cost, ability, self)) return;
    k.once(st, `${self}:${tag}`);
    k.buff(st, attacker, -amount, 0, 'this_strike');
  };
};

export default {
  // Andromeda Shun
  'athena-v6-007': {
    // Nebula Chain: Exhaust (precisa estar Prepared) e o Strike não causa dano nenhum (nem retaliação).
    // `nebulaOpen`: o Nebula Chain é deste Strike (lido pela Resonance da Andromeda Cloth V2, 008); a próxima declaração apaga.
    watchDeclare: (s, c, key, self, attacker, target) => {
      if (s.units[self]) s.units[self].nebulaOpen = false;
      return againstAlly(s, c, key, self, attacker, target) && s.units[self]?.prepared && !s.roundUses.has(`${self}:nebula`) && (st => {
        if (!st.units[self]?.prepared || st.roundUses.has(`${self}:nebula`) || !k.may(c, key, 'NEBULA CHAIN', {uid: self})) return;
        k.once(st, `${self}:nebula`);
        st.units[self].nebulaOpen = true;
        k.exhaust(st, self);
        shield(st, target.kind === 'god' ? k.godTarget(key) : target.uid, Infinity, {duration: 'this_strike'});
        shield(st, attacker, Infinity, {duration: 'this_strike'});
      });
    },
    // Brotherhood
    aura: (s, c, key, self, unit) => unit !== self && k.controllerOf(s, unit) === key && isSaint(c, unit) ? {hp: 1} : null,
  },
  // Phoenix Ikki
  'athena-v6-009': {
    // Phoenix Rebirth (gancho wouldBeDefeated): sem Rebirth, em vez de ser derrotado tira todo o dano, fica Exhausted,
    // ganha 1 Rebirth e não declara Strike neste Round. O marcador 'Rebirth' (addMarker) é lido por Esmeralda.
    wouldBeDefeated: (s, c, key, self) => {
      if (k.markers(s, self, 'Rebirth') > 0) return false;
      k.removeDamage(s, self);
      k.exhaust(s, self);
      k.addMarker(s, self, 'Rebirth', 1);
      lockStrike(s, self);
      return true;
    },
    // Rebirth (estilo Arclight Phoenix, autor 31/10/2026): gatilho obrigatório do Tártaro quando o dono conjura a terceira
    // Moment ou Technique do turno; Ikki volta ao campo Prepared (Impulse deixa golpear na hora).
    tartarus: {
      watchSpell: (s, c, key, self, caster, spellUid) => caster === key && isMT(c, spellUid)
        && s.events.filter(e => e.type === 'card_played' && e.kind === 'Spell' && e.player === key && e.turn === s.turn && isMT(c, e.uid)).length === 3
        && (st => { if (st.players[key].tartarus.includes(self)) k.putOntoField(st, c, key, self, 'tartarus', {prepared: true}); }),
    },
  },
  // Gemini Saga
  'athena-v6-013': {
    // Another Dimension: guarda o alvo em s.dimension[self] para devolver quando Saga for derrotado.
    enter: (s, c, key, self) => st => {
      const t = k.choose(c, key, 'ANOTHER DIMENSION', k.enemies(st, c, key), {text: 'Send target enemy Devotee to the Void.'});
      if (t && k.exile(st, c, t)) (st.dimension ||= {})[self] = [...(st.dimension[self] || []), t];
    },
    // "Until Gemini Saga leaves the battlefield" (gancho leaves): derrota, mão, exílio… devolvem o alvo.
    leaves: (s, c, key, self) => s.dimension?.[self]?.length && (st => {
      for (const t of st.dimension[self]) {
        const owner = c.objects[t]?.owner;
        if (owner && st.players[owner].void.includes(t)) k.putOntoField(st, c, owner, t, 'void', {prepared: false}); // volta Unprepared; ETB normal (autor, 31/10/2026)
      }
      delete st.dimension[self];
    }),
    // Duality
    mods: (s, c, key, self) => {
      const mine = s.players[key].soul, theirs = s.players[k.other(s, key)].soul;
      return [{atk: mine > theirs ? 1 : 0, hp: mine < theirs ? 1 : 0}];
    },
  },
  // Leo Aiolia
  'athena-v6-015': {
    // Lightning Speed
    declare: boostOnDeclare('lightning', () => true),
    // Lion's Pride: "cannot declare another Strike this round" já vem da D22 (preparar não renova).
    killInCombat: (s, c, key, self) => st => { if (st.units[self] && k.may(c, key, "LION'S PRIDE", {uid: self})) k.prepare(st, self); },
  },
  // Ophiuchus Shaina
  'athena-v6-022': {
    // Serpent Constriction + Thunder Claw (o Seal "de antes do Strike" é lido no evento, antes de Constriction resolver).
    combatDamage: (s, c, key, self, victim) => {
      const had = sealed(s, victim), constrict = !s.roundUses.has(`${self}:constriction`);
      return (had || constrict) && (st => {
        if (!st.units[victim] || k.controllerOf(st, victim) === key) return;
        if (had) k.damage(st, c, victim, 2);
        // Athena → Branco (31/10/2026): Seal só nos Saints do gelo; aqui vira -1 ATK.
        if (constrict && st.units[victim] && k.once(st, `${self}:constriction`)) k.buff(st, victim, -1, 0);
      });
    },
  },
  // Lizard Misty
  'athena-v6-023': {
    // Marble Wall: o escudo nasce na declaração do Strike (atalho do padrão de poseidon.js; a prevenção em si já é exata).
    // `marbleOpen` marca que o escudo é deste Strike; a próxima declaração qualquer o apaga.
    watchDeclare: (s, c, key, self, attacker, target) => {
      const tag = `${self}:marble`;
      if (s.units[self]) s.units[self].marbleOpen = false;
      if (!inStrike(attacker, target, self) || s.roundUses.has(tag) || ready(s, key) < 1) return;
      return st => {
        if (!st.units[self] || st.roundUses.has(tag) || !pay(st, c, key, 1, 'MARBLE WALL', self)) return;
        k.once(st, tag);
        shield(st, self, 3, {duration: 'this_strike'});
        st.units[self].marbleOpen = true;
      };
    },
    // Untouchable (gancho damagePrevented): o Marble Wall deste Strike preveniu todo o dano que Misty receberia; pode se
    // Preparar (sem Strike neste Round). Resonance (Lizard Silver Cloth 068): remove 1 dano da Cloth a cada vez (mandatório).
    damagePrevented: (s, c, key, self, info) => {
      if (!s.units[self]?.marbleOpen) return;
      s.units[self].marbleOpen = false;
      if (!info.full) return;
      return st => {
        const cloth = k.gearOf(c, self).find(g => c.objects[g].cardId === 'athena-v6-068');
        if (cloth) k.removeDamage(st, cloth, 1);
        if (!st.units[self] || st.roundUses.has(`${self}:untouchable`) || !k.may(c, key, 'UNTOUCHABLE', {uid: self, text: 'Prepare Lizard Misty?'})) return;
        k.once(st, `${self}:untouchable`);
        k.prepare(st, self);
        lockStrike(st, self);
      };
    },
  },
  // Perseus Algol
  'athena-v6-024': {
    // Medusa Shield: Devotee inimigo declara Strike contra Algol; pague {2}{C} e ele não é Prepared nem declara Strike
    // neste Round (ganchos cannotPrepare/cannotStrike). Resonance (Perseus Silver Cloth 069): -1 ATK dele durante o Strike.
    watchDeclare: (s, c, key, self, attacker, target) => {
      const tag = `${self}:medusa`;
      if (target.kind !== 'devotee' || target.uid !== self || k.controllerOf(s, attacker) === key || s.roundUses.has(tag) || ready(s, key) < 2) return;
      return st => {
        if (!st.units[attacker] || st.roundUses.has(tag) || !pay(st, c, key, 2, 'MEDUSA SHIELD', self)) return;
        k.once(st, tag);
        forbidPrepare(st, attacker);
        forbidStrike(st, attacker);
        if (k.gearOf(c, self).some(g => c.objects[g].cardId === 'athena-v6-069')) k.buff(st, attacker, -1, 0, 'this_strike');
      };
    },
    // Stone Gaze (gancho survive): sobreviveu como defensor, +1/+1 até o fim do Round.
    survive: (s, c, key, self, role) => role === 'defender' && (st => { if (st.units[self]) k.buff(st, self, 1, 1); }),
  },
  // Lyra Orphee
  'athena-v6-025': {
    activate: {name: 'STRING NOCTURNE', cost: 2, run: (s, c, key) => {
      for (const u of k.chooseUpTo(c, key, 'STRING NOCTURNE', saints(s, c, key), 2, {text: 'Choose up to two friendly Saints.'})) k.buff(s, u, 0, 2);
    }},
    // Death Trip Serenade
    watchDeclare: (s, c, key, self, attacker, target) => {
      const tag = `${self}:serenade`;
      if (!againstAlly(s, c, key, self, attacker, target) || s.roundUses.has(tag) || ready(s, key) < 2) return;
      return st => {
        if (!st.units[attacker] || st.roundUses.has(tag) || !pay(st, c, key, 2, 'DEATH TRIP SERENADE', self)) return;
        k.once(st, tag);
        k.buff(st, attacker, -2, 0, 'this_strike');
      };
    },
  },
  // Kiki
  'athena-v6-026': {
    enter: (s, c, key) => st => {
      const gear = st.players[key].battlefield.filter(u => k.card(c, u)?.kind === 'Equipment');
      const t = k.choose(c, key, 'KIKI', gear, {text: "Return target friendly Equipment to its owner's hand."});
      if (t) k.toHand(st, c, t, 'battlefield');
    },
  },
  // Bear Geki: Hanging Bear
  'athena-v6-029': {combatDamage: onHit('hanging', (st, c, key, self, victim) => lockStrike(st, victim))},
  // Hydra Ichi: Poisonous Claws
  'athena-v6-030': {combatDamage: weaken('claws')},
  // Wolf Nachi: Wolf Pack
  'athena-v6-031': {
    mods: (s, c, key, self) => k.devotees(s, c, key).filter(u => u !== self && isBronze(c, u)).length >= 2 ? [{atk: 1, hp: 1}] : [],
  },
  // Lionet Ban: Lionet Bomber
  'athena-v6-032': {declare: boostOnDeclare('bomber', (s, c, self, foe) => k.atkOf(s, c, foe) > k.atkOf(s, c, self))},
  // Chameleon June
  'athena-v6-033': {
    combatDamage: weaken('whip'), // Chameleon Whip
    mods: (s, c, key) => hasName(s, c, key, /Andromeda Shun/i) ? [{hp: 1}] : [], // Resonance — Andromeda Shun
  },
  // Miho: Kindness
  'athena-v6-035': {activate: {name: 'KINDNESS', cost: 1, run: (s, c, key, self, ch) => healOrSoul(s, c, key, 'KINDNESS', 1, 1, ch)}},
  // Sanctuary Healer: Sacred Recovery (substitui ABILITIES '041' de effects.js)
  'athena-v6-041': {activate: {name: 'SACRED RECOVERY', cost: 1, run: (s, c, key, self, ch) => healOrSoul(s, c, key, 'SACRED RECOVERY', 2, 2, ch)}},
  // Motor Enchantress (31/10/2026): "Whenever you play a non-Armor Equipment, draw a card." Uma vez por Round (§64).
  'athena-v6-042': {watchEquipCast: enchantress},
  'athena-v6-043': {watchEquipCast: enchantress},
  // Esmeralda
  'athena-v6-038': {
    // A Gentle Memory
    aura: (s, c, key, self, unit) => k.controllerOf(s, unit) === key && ikki.test(name(c, unit)) ? {hp: 1} : null,
    // Unforgotten Love
    defeated: (s, c, key) => st => {
      const t = k.choose(c, key, 'UNFORGOTTEN LOVE', k.devotees(st, c, key).filter(u => ikki.test(name(c, u)) && k.markers(st, u, 'Rebirth') > 0),
        {optional: true, text: 'Remove 1 Rebirth counter from Phoenix Ikki?'});
      if (t) k.addMarker(st, t, 'Rebirth', -1);
    },
  },
  // Guilty — Training Through Pain (gancho watchSurvive): outro Saint amigo sobreviveu a um Strike; uma vez por Round,
  // pode causar 1 de dano a ele; se causar, +1 ATK até o fim do Round.
  'athena-v6-039': {
    watchSurvive: (s, c, key, self, unit) => unit !== self && k.controllerOf(s, unit) === key && isSaint(c, unit) && !s.roundUses.has(`${self}:training`) && (st => {
      if (!st.units[unit] || st.roundUses.has(`${self}:training`) || !k.may(c, key, 'TRAINING THROUGH PAIN', {uid: unit, text: 'Deal 1 damage to that Saint? It gets +1 ATK.'})) return;
      k.once(st, `${self}:training`);
      k.damage(st, c, unit, 1);
      if (st.units[unit]) k.buff(st, unit, 1, 0);
    }),
  },
  // Centaur Babel: Flame Whip
  'athena-v6-071': {combatDamage: onHit('flame', (st, c, key, self, victim) => k.damage(st, c, victim, 1))},
  // Whale Moses
  'athena-v6-072': {
    declare: boostOnDeclare('might', (s, c, self, foe) => k.atkOf(s, c, foe) < k.atkOf(s, c, self)), // Whale's Might
    // Oceanic Endurance: escudo de 1 no primeiro Strike do Round em que ele toma parte (padrão de poseidon.js).
    watchDeclare: (s, c, key, self, attacker, target) => inStrike(attacker, target, self) && !s.roundUses.has(`${self}:endurance`) &&
      k.once(s, `${self}:endurance`) && (st => { if (st.units[self]) shield(st, self, 1, {duration: 'this_strike'}); }),
  },
  // Hound Asterion: Mind Reading; Million Ghost Attack (gancho survive): sobreviveu como defensor, +1 ATK até o fim do Round.
  'athena-v6-073': {
    watchDeclare: payShade('mind', 'MIND READING', 1, 2),
    survive: (s, c, key, self, role) => role === 'defender' && (st => { if (st.units[self]) k.buff(st, self, 1, 0); }),
  },
  // Crow Jamian
  'athena-v6-074': {
    // Black Wing Formation: Jamian ataca um Devotee inimigo; o defensor perde 1 ATK no Strike.
    declare: (s, c, key, self, target) => target.kind === 'devotee' && !s.roundUses.has(`${self}:wing`) && ready(s, key) >= 1 && (st => {
      if (!st.units[target.uid] || st.roundUses.has(`${self}:wing`) || !pay(st, c, key, 1, 'BLACK WING FORMATION', self)) return;
      k.once(st, `${self}:wing`);
      k.buff(st, target.uid, -1, 0, 'this_strike');
    }),
    // Crow's Escape (gancho survive): uma vez por Round, sobreviveu como defensor: pode se Preparar; não declara Strike neste Round.
    survive: (s, c, key, self, role) => role === 'defender' && !s.roundUses.has(`${self}:escape`) && (st => {
      if (!st.units[self] || st.roundUses.has(`${self}:escape`) || !k.may(c, key, "CROW'S ESCAPE", {uid: self, text: 'Prepare Crow Jamian?'})) return;
      k.once(st, `${self}:escape`);
      k.prepare(st, self);
      lockStrike(st, self);
    }),
  },
  // Cerberus Dante
  'athena-v6-075': {
    // Cerberus Chains (31/10/2026): "can't declare a Strike during its controller's next turn". O próximo turno do dono do alvo
    // ainda é neste Round só se agora é o seu turno e você é o primeiro jogador (§7); senão é no Round seguinte.
    combatDamage: onHit('chains', (st, c, key, self, victim) =>
      forbidStrike(st, victim, st.active === key && st.order[0] === key ? 'this_round' : 'next_round')),
    // Three-Headed Assault: sem limite por Round.
    declare: (s, c, key, self, target) => target.kind === 'devotee' && sealed(s, target.uid) && (st => k.buff(st, self, 1, 0, 'this_strike')),
  },
};
