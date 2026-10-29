// Efeitos V6 de Athena (devotees) que a tabela por número (effects.js) não cobre. Ver ./athena.js.
// Texto: card-forge/art-web/cards.json (habilidades_en). Dúvidas: docs/v6-efeitos-pendencias.md ("Athena — Devotees").
import * as k from './kit.js';
import {spendBase, addSeal} from '../core.js';
import {shield, isSaint, isBronze} from '../effects.js';

const name = (c, uid) => k.card(c, uid)?.name || '';
const sealed = (s, uid) => (s.units[uid]?.seal || 0) > 0;
const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
const saints = (s, c, key) => k.devotees(s, c, key).filter(u => isSaint(c, u));
const hasName = (s, c, key, re) => k.devotees(s, c, key).some(u => re.test(name(c, u)));
const ikki = /Phoenix Ikki/i;

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
// "Cannot declare another Strike this round": a D22 já cobre o resto do turno de quem atacou; se o dono do alvo ainda tem
// turno neste Round (o ativo joga primeiro), o próximo turno (turn + 1) também fica barrado.
function lockStrike(s, uid) {
  const owner = k.controllerOf(s, uid);
  if (owner && owner !== s.active && s.turnInRound === 0) s.strikes.set(uid, s.turn + 1);
}
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
    watchDeclare: (s, c, key, self, attacker, target) => againstAlly(s, c, key, self, attacker, target) && s.units[self]?.prepared &&
      !s.roundUses.has(`${self}:nebula`) && (st => {
        if (!st.units[self]?.prepared || st.roundUses.has(`${self}:nebula`) || !k.may(c, key, 'NEBULA CHAIN', {uid: self})) return;
        k.once(st, `${self}:nebula`);
        k.exhaust(st, self);
        shield(st, target.kind === 'god' ? k.godTarget(key) : target.uid, Infinity, {duration: 'this_strike'});
        shield(st, attacker, Infinity, {duration: 'this_strike'});
      }),
    // Brotherhood
    aura: (s, c, key, self, unit) => unit !== self && k.controllerOf(s, unit) === key && isSaint(c, unit) ? {hp: 1} : null,
  },
  // Phoenix Ikki
  'athena-v6-009': {
    // pendente: Phoenix Rebirth ("would be defeated" para qualquer dano; sem gancho). O marcador 'Rebirth' (addMarker) já é lido por Esmeralda.
    mods: (s, c, key, self) => saints(s, c, key).every(u => u === self) ? [{atk: 2}] : [], // Lone Wolf
  },
  // Gemini Saga
  'athena-v6-013': {
    // Another Dimension: guarda o alvo em s.dimension[self] para devolver quando Saga for derrotado.
    enter: (s, c, key, self) => st => {
      const t = k.choose(c, key, 'ANOTHER DIMENSION', k.enemies(st, c, key), {text: 'Send target enemy Devotee to the Void.'});
      if (t && k.exile(st, c, t)) (st.dimension ||= {})[self] = [...(st.dimension[self] || []), t];
    },
    // pendente: "until Gemini Saga leaves the battlefield" só cobre derrota (sem gancho de saída genérica: devolver à mão, exílio…).
    defeated: (s, c, key, self) => s.dimension?.[self]?.length && (st => {
      for (const t of st.dimension[self]) {
        const owner = c.objects[t]?.owner;
        if (owner && st.players[owner].void.includes(t)) k.putOntoField(st, c, owner, t, 'void');
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
        if (constrict && st.units[victim] && k.once(st, `${self}:constriction`)) addSeal(st, c, [victim], 1, 'SERPENT CONSTRICTION');
      });
    },
  },
  // Lizard Misty
  'athena-v6-023': {
    // Marble Wall: o escudo nasce na declaração do Strike (padrão de poseidon.js). pendente: Untouchable (precisa saber que o escudo preveniu tudo).
    watchDeclare: (s, c, key, self, attacker, target) => {
      const tag = `${self}:marble`;
      if (!inStrike(attacker, target, self) || s.roundUses.has(tag) || ready(s, key) < 1) return;
      return st => {
        if (!st.units[self] || st.roundUses.has(tag) || !pay(st, c, key, 1, 'MARBLE WALL', self)) return;
        k.once(st, tag);
        shield(st, self, 3, {duration: 'this_strike'});
      };
    },
  },
  // Perseus Algol
  // pendente: Medusa Shield ("cannot be Prepared this round" não tem marca na engine) e Stone Gaze (sobreviver a Strike como defensor).
  'athena-v6-024': {},
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
  'athena-v6-035': {
    activate: {name: 'KINDNESS', cost: 1, run: (s, c, key) => {
      const t = k.choose(c, key, 'KINDNESS', k.devotees(s, c, key), {text: 'Remove 1 damage from target friendly Devotee.'});
      if (t) k.removeDamage(s, t, 1);
    }},
  },
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
  // pendente: Guilty (Training Through Pain: sobreviver a Strike).
  'athena-v6-039': {},
  // Centaur Babel: Flame Whip
  'athena-v6-071': {combatDamage: onHit('flame', (st, c, key, self, victim) => k.damage(st, c, victim, 1))},
  // Whale Moses
  'athena-v6-072': {
    declare: boostOnDeclare('might', (s, c, self, foe) => k.atkOf(s, c, foe) < k.atkOf(s, c, self)), // Whale's Might
    // Oceanic Endurance: escudo de 1 no primeiro Strike do Round em que ele toma parte (padrão de poseidon.js).
    watchDeclare: (s, c, key, self, attacker, target) => inStrike(attacker, target, self) && !s.roundUses.has(`${self}:endurance`) &&
      k.once(s, `${self}:endurance`) && (st => { if (st.units[self]) shield(st, self, 1, {duration: 'this_strike'}); }),
  },
  // Hound Asterion: Mind Reading. pendente: Million Ghost Attack (sobreviver como defensor).
  'athena-v6-073': {watchDeclare: payShade('mind', 'MIND READING', 1, 2)},
  // Crow Jamian
  'athena-v6-074': {
    // Black Wing Formation: Jamian ataca um Devotee inimigo; o defensor perde 1 ATK no Strike. pendente: Crow's Escape (sobreviver como defensor).
    declare: (s, c, key, self, target) => target.kind === 'devotee' && !s.roundUses.has(`${self}:wing`) && ready(s, key) >= 1 && (st => {
      if (!st.units[target.uid] || st.roundUses.has(`${self}:wing`) || !pay(st, c, key, 1, 'BLACK WING FORMATION', self)) return;
      k.once(st, `${self}:wing`);
      k.buff(st, target.uid, -1, 0, 'this_strike');
    }),
  },
  // Cerberus Dante
  'athena-v6-075': {
    combatDamage: seal('chains', 'CERBERUS CHAINS'),
    // Three-Headed Assault: sem limite por Round.
    declare: (s, c, key, self, target) => target.kind === 'devotee' && sealed(s, target.uid) && (st => k.buff(st, self, 1, 0, 'this_strike')),
  },
};
