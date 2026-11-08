// Efeitos V6 de Athena (Equipment) que a tabela por número (effects.js) não cobre. Ver ./athena.js.
// Texto: card-forge/art-web/cards.json (habilidades_en). Dúvidas de regra: docs/v6-efeitos-pendencias.md ("Athena — Equipment").
// Os bônus fixos impressos ("Equipped Devotee gets +N ATK / +M HP") já vêm de `card.equipped` (shared/preview-cards.js / canon):
// não são repetidos aqui. {T} em Equipment = uma vez por Round (guia §61), por isso `once: true, tap: false`.
import * as k from './kit.js';
import {spendBase, addSeal} from '../core.js';
import {shield, isBronze} from '../effects.js';
import {gainSoul} from '../gods.js';

const name = (c, uid) => k.card(c, uid)?.name || '';
const isSaint = (c, uid) => k.isDevotee(c, uid) && /Saint/.test(k.card(c, uid).type);
const sealed = (s, uid) => (s.units[uid]?.seal || 0) > 0;
const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
const named = re => (c, uid) => !!uid && re.test(name(c, uid));
const MARIN = named(/Eagle Marin/i), HYOGA = named(/Hyoga/i), SHUN = named(/\bShun\b/i), IKKI = named(/Ikki/i), MU = named(/\bMu\b/i), SAGA = named(/Saga/i),
  AIOLIA = named(/Aiolia/i), CAMUS = named(/Camus/i), SHAINA = named(/Shaina/i), ORPHEE = named(/Orphee/i);

// "You may pay {N}{C}": Bases preparadas (só pergunta se dá para pagar).
function pay(st, c, key, n, ability, uid) {
  if (ready(st, key) < n || !k.may(c, key, ability, {uid, cost: `${n} Cosmo`})) return false;
  if (n) spendBase(st, key, n);
  return true;
}
// "Choose one": um modo só não pergunta.
const mode = (c, key, ability, list) => (list.length <= 1 ? list[0] ?? null : c.decide?.(key, {ability, options: list, choose: 'mode', text: 'Choose one.'}) ?? null);

// Seal que o Devotee tinha quando o Strike COMEÇOU (declaração). Não há gancho próprio: o Equipment que precisa disso
// grava o estado no watchDeclare (efeito colateral na hora do evento, sem resolução). Vale para o último Strike declarado.
function snapshotSeal(s, attacker, target) {
  s.sealAtStrike = {[attacker]: sealed(s, attacker), ...(target.kind === 'devotee' && {[target.uid]: sealed(s, target.uid)})};
}
const hadSeal = (s, uid) => !!s.sealAtStrike?.[uid];

// "Quando X receberia dano de Strike, previna N": não há gancho "would take damage". O escudo nasce na declaração do Strike
// em que X participa e vale só nesse Strike (mesma aproximação de v6/poseidon.js). `unit`: uid do escudo ('god:A' = God).
// shortcut: Strike anulado deixa o escudo 'this_strike' até o próximo Strike que limpe.
// `latent`: o custo sai só do Latent (Santuário Divino do Escudo, {3}{L}; autor, 07/11/2026).
const payLatent = (st, c, key, n, ability, uid) => st.players[key].latent >= n && k.may(c, key, ability, {uid, cost: `${n} Latent`}) && k.payLatent(st, key, n);
function ward({tag, ability, cost, amount, unit, applies, latent = false}) {
  return (s, c, key, self, attacker, target) => {
    const t = `${tag}:${self}`, uid = unit(s, c, key, self);
    if (!uid || s.roundUses.has(t) || !applies(s, c, key, self, attacker, target, uid)) return;
    return st => {
      if (st.roundUses.has(t) || (!uid.startsWith('god:') && !st.units[uid]) || !(latent ? payLatent : pay)(st, c, key, cost, ability, self)) return;
      k.once(st, t);
      shield(st, uid, amount, {duration: 'this_strike'});
    };
  };
}
const inStrike = (attacker, target, uid) => attacker === uid || (target.kind === 'devotee' && target.uid === uid);

// ---------- alvos ----------
const enemyTarget = (s, c, key, ability, choice, text = 'Choose target enemy Devotee.') =>
  (k.enemies(s, c, key).includes(choice?.target) ? choice.target : k.choose(c, key, ability, k.enemies(s, c, key), {text}));
const needEnemy = (s, c, key) => { if (!k.enemies(s, c, key).length) throw new k.RuleError('alvo', 'sem Devotee inimigo válido'); };
const friendlySaints = (s, c, key) => k.devotees(s, c, key).filter(u => isSaint(c, u));
// Distribui `total` de dano entre alvos escolhidos (cada alvo recebe ao menos 1; o resto, ponto a ponto).
function distribute(s, c, key, ability, total) {
  const foes = k.enemies(s, c, key);
  const targets = foes.length ? k.chooseUpTo(c, key, ability, foes, Math.min(total, foes.length), {text: 'Choose target enemy Devotees.'}) : [];
  if (!targets.length) return;
  const dealt = Object.fromEntries(targets.map(t => [t, 1]));
  for (let i = targets.length; i < total; i++) {
    const t = targets.length === 1 ? targets[0] : k.choose(c, key, ability, targets, {text: 'Assign 1 damage to a target.'}) ?? targets[0];
    dealt[t]++;
  }
  for (const t of targets) k.damage(s, c, t, dealt[t]);
}

// Devotees seus que vestem uma Armor (alvo do Repair, 30/10/2026).
const armored = (s, c, key) => s.players[key].battlefield.filter(u => k.card(c, u)?.kind === 'Devotee' && Object.keys(c.attached).some(e => c.attached[e] === u && k.card(c, e)?.armor));
export default {
  // Cygnus Cloth V2 (+1 ATK: genérico)
  'athena-v6-006': {
    // Freezing Aura: uma vez por Round, dano de Strike a Devotee inimigo: Seal nele; ou, se tinha Seal no início, compra.
    gearCombatDamage: (s, c, key, self, bearer, victim) => !s.roundUses.has(`freezing:${self}`) && (st => {
      if (st.roundUses.has(`freezing:${self}`)) return;
      const pick = mode(c, key, 'FREEZING AURA', [st.units[victim] && 'seal', hadSeal(st, victim) && 'draw'].filter(Boolean));
      if (!pick) return;
      k.once(st, `freezing:${self}`);
      if (pick === 'seal') addSeal(st, c, [victim], 1, 'FREEZING AURA');
      else k.draw(st, key, 1);
    }),
    // Resonance — Cygnus Hyoga: defensor com Seal quando o Strike começa: +2 ATK durante o Strike.
    gearDeclare: (s, c, key, self, bearer, target) => HYOGA(c, bearer) && target.kind === 'devotee' && sealed(s, target.uid) &&
      (st => k.buff(st, bearer, 2, 0, 'this_strike')),
    watchDeclare: (s, c, key, self, attacker, target) => { snapshotSeal(s, attacker, target); },
  },

  // Andromeda Cloth V2 (+1 ATK: genérico)
  // Resonance — Andromeda Shun, Counterattack (gancho watchDamagePrevented): o Nebula Chain do Shun (`nebulaOpen`) preveniu
  // dano ao seu God ou a outro Saint amigo; causa metade do prevenido (arredondado para baixo) ao atacante.
  'athena-v6-008': {
    watchDamagePrevented: (s, c, key, self, unit, info) => {
      const shun = k.bearerOf(c, self);
      const mine = unit === `god:${key}` || (unit !== shun && k.controllerOf(s, unit) === key && isSaint(c, unit)); // só o prevenido do lado do Shun
      if (!SHUN(c, shun) || !s.units[shun]?.nebulaOpen || !info.foe || !mine) return;
      const half = Math.floor(info.prevented / 2);
      return half > 0 && (st => { if (st.units[info.foe]) k.damage(st, c, info.foe, half); });
    },
  },

  // Phoenix Cloth V2 (+2 ATK: genérico)
  'athena-v6-010': {
    // Burning Spirit: +1 ATK enquanto o portador tem dano marcado.
    aura: (s, c, key, self, unit) => (k.bearerOf(c, self) === unit && (s.units[unit]?.damage || 0) > 0 ? {atk: 1, hp: 0} : null),
    // Resonance — Phoenix Ikki (01/11/2026): quando o Ikki equipado é derrotado, compre 1 carta.
    bearerDefeated: (s, c, key, self, unit) => IKKI(c, unit) && (st => { k.draw(st, key, 1); }),
  },

  // Aries Gold Cloth (+1 ATK: genérico)
  'athena-v6-012': {
    activate: {name: 'Stardust Revolution', cost: 3, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key, self, choice) => {
        const t = enemyTarget(s, c, key, 'STARDUST REVOLUTION', choice);
        if (!t) return;
        k.damage(s, c, t, 3);
        // Resonance — Aries Mu: 1 de dano em cada Devotee inimigo, inclusive o alvo (se ainda estiver em campo).
        if (MU(c, k.bearerOf(c, self))) for (const foe of k.enemies(s, c, key)) k.damage(s, c, foe, 1);
      }},
  },

  // Gemini Gold Cloth (+2 ATK: genérico)
  'athena-v6-014': {
    activate: {name: 'Galaxian Explosion', cost: 4, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      // Resonance — Gemini Saga: 7 em vez de 5.
      run: (s, c, key, self) => distribute(s, c, key, 'GALAXIAN EXPLOSION', SAGA(c, k.bearerOf(c, self)) ? 7 : 5)},
  },

  // Leo Gold Cloth (+2 ATK: genérico)
  // Resonance — Phoenix Ikki (autor, 30/10/2026): Ikki ativa sem {T}, ou seja, sem o limite de uma vez por Round do Equipment.
  'athena-v6-016': {
    // Resonance — Phoenix Ikki (01/11/2026): sempre que um Phoenix Ikki seu volta do Tártaro, 1 de dano em Devotee inimigo alvo.
    // shortcut: vale com esta Cloth solta ou presa a um Ikki (o Ikki que volta pode puxá-la, §28); presa a outro Devotee, não.
    watchEnter: (s, c, key, self, entered) => k.controllerOf(s, entered) === key && IKKI(c, entered)
      && s.events.findLast(e => e.type === 'card_played' && e.uid === entered)?.from === 'tartarus'
      && (!k.bearerOf(c, self) || IKKI(c, k.bearerOf(c, self))) && k.enemies(s, c, key).length
      && (st => { k.damage(st, c, k.choose(c, key, 'RESONANCE — PHOENIX IKKI', k.enemies(st, c, key), {text: 'Deal 1 damage to target enemy Devotee.'}), 1); }),
    activate: {name: 'Lightning Plasma', cost: 3, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key, self) => {
        const extra = AIOLIA(c, k.bearerOf(c, self)) ? 1 : 0; // Resonance — Leo Aiolia: +1 em cada alvo
        for (const t of k.chooseUpTo(c, key, 'LIGHTNING PLASMA', k.enemies(s, c, key), 2, {text: 'Choose up to two target enemy Devotees.'})) k.damage(s, c, t, 2 + extra);
      }},
  },

  // Aquarius Gold Cloth (+1 ATK: genérico)
  'athena-v6-018': {
    activate: {name: 'Aurora Execution', cost: 3, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key, self, choice) => {
        const t = enemyTarget(s, c, key, 'AURORA EXECUTION', choice);
        if (!t) return;
        if (HYOGA(c, k.bearerOf(c, self))) addSeal(s, c, [t], 1, 'RESONANCE — CYGNUS HYOGA'); // Seal antes do dano (autor, 30/10/2026)
        k.damage(s, c, t, sealed(s, t) ? 5 : 3); // 3, +2 se o alvo tem Seal
        // Resonance — Aquarius Camus: remove todos os Seals do alvo e causa 1 a mais por Seal removido (até 3).
        const n = s.units[t]?.seal || 0;
        if (CAMUS(c, k.bearerOf(c, self)) && n > 0) {
          s.units[t].seal = 0;
          k.emit(s, 'seal_removed', {uid: t, counters: 0});
          k.damage(s, c, t, Math.min(n, 3));
        }
      }},
  },

  // Athena's Shield (global; sem bônus fixo)
  'athena-v6-020': {
    // Divine Aegis (+1/+1) e Miracle (+2/+2 a mais com 5 ou menos Soul): Devotees de Athena amigos (autor, 06/11/2026).
    aura: (s, c, key, self, unit) => {
      if (k.controllerOf(s, unit) !== key || !k.isDevotee(c, unit) || !/^athena-/.test(c.objects[unit]?.cardId || '')) return null;
      const n = s.players[key].soul <= 5 ? 3 : 1;
      return {atk: n, hp: n};
    },
    // Divine Sanctuary — {3}{C}: uma vez por Round, quando seu God receberia dano de Strike, previne até 3.
    watchDeclare: ward({tag: 'sanctuary', ability: 'DIVINE SANCTUARY', cost: 3, latent: true, amount: 3, unit: (s, c, key) => k.godTarget(key),
      applies: (s, c, key, self, attacker, target) => target.kind === 'god' && target.player === key}),
  },

  // Andromeda Chain
  'athena-v6-046': {
    // Chain Defense: uma vez por Round, Devotee inimigo declara Strike contra seu God ou outro Saint amigo: pode pagar {1}{C};
    // o atacante tem -1 ATK no Strike (-2 se equipada em Andromeda Shun).
    watchDeclare: (s, c, key, self, attacker, target) => {
      const bearer = k.bearerOf(c, self), tag = `chain:${self}`;
      if (s.roundUses.has(tag) || !attacker || k.controllerOf(s, attacker) === key) return;
      const mine = target.kind === 'god' ? target.player === key
        : k.controllerOf(s, target.uid) === key && isSaint(c, target.uid) && target.uid !== bearer;
      if (!mine) return;
      return st => {
        if (st.roundUses.has(tag) || !st.units[attacker] || !pay(st, c, key, 1, 'CHAIN DEFENSE', attacker)) return;
        k.once(st, tag);
        k.buff(st, attacker, SHUN(c, bearer) ? -2 : -1, 0, 'this_strike');
      };
    },
  },

  // Phoenix Feather
  'athena-v6-047': {
    // Resonance — Phoenix Ikki (gancho gearSurvive): uma vez por Round, ao sobreviver a um Strike, pode remover 1 dano dele.
    gearSurvive: (s, c, key, self, bearer) => IKKI(c, bearer) && !s.roundUses.has(`feather:${self}`) && (st => {
      if (!st.units[bearer] || st.roundUses.has(`feather:${self}`) || !k.may(c, key, 'RESONANCE — PHOENIX IKKI', {uid: bearer, text: 'Remove 1 damage from Phoenix Ikki?'})) return;
      k.once(st, `feather:${self}`);
      k.removeDamage(st, bearer, 1);
    }),
    // Burning Will: +1 ATK enquanto o portador tem dano marcado.
    aura: (s, c, key, self, unit) => (k.bearerOf(c, self) === unit && (s.units[unit]?.damage || 0) > 0 ? {atk: 1, hp: 0} : null),
  },

  // Jamir Repair Tools
  // Armas de Libra (autor, 02/11/2026): molde das espadas de duas cores do Magic. Sem limite por rodada.
  // shortcut: dano de Pierce que passa por um Devotee não dispara (gancho gearGodDamage só no Strike direto ao God).
  'athena-v6-048': {
    immune: src => src.card?.kind === 'Devotee' && src.card.cost?.amount <= 3,
    gearGodDamage: (s, c, key) => st => {
      k.discard(st, c, k.other(st, key), 1, 'LIBRA SWORD');
      for (const base of st.players[key].bases) base.prepared = true;
    },
  },
  'athena-v6-049': k.sword('LIBRA SHIELD', 'hades', 'ares'),
  'athena-v6-050': {
    activate: {name: 'Repair Tools', cost: 1, once: true, tap: false,
      // Texto de 30/10/2026: "target friendly Devotee equipped with an Armor" (Armor não tem dano próprio).
      check: (s, c, key) => { if (!armored(s, c, key).length) throw new k.RuleError('alvo', 'sem Devotee seu com Armor'); },
      run: (s, c, key, self, choice) => {
        const armors = armored(s, c, key);
        const t = armors.includes(choice?.target) ? choice.target : k.choose(c, key, 'REPAIR TOOLS', armors, {text: 'Choose target friendly Devotee equipped with an Armor.'});
        if (t) k.removeDamage(s, t, MU(c, k.bearerOf(c, self)) ? 2 : 1); // Resonance — Aries Mu: até 2
      }},
  },

  // Sanctuary Torch
  'athena-v6-051': {
    // Sacred Watch (autor, 01/11/2026): compra na primeira Spell inimiga do turno.
    watchSpell: (s, c, key, self, caster) => caster !== key && k.onceTurn(s, `${self}:torch`) && (st => k.draw(st, key, 1)),
  },

  // Eagle Silver Cloth (+1 ATK: genérico)
  'athena-v6-066': {
    // Resonance — Eagle Marin (gancho gearSurvive): uma vez por Round, ao sobreviver a um Strike, 1 Training em outro Bronze Saint amigo.
    gearSurvive: (s, c, key, self, bearer) => MARIN(c, bearer) && !s.roundUses.has(`aerial:${self}`) && (st => {
      const others = st.players[key].battlefield.filter(u => u !== bearer && isBronze(c, u));
      if (!st.units[bearer] || st.roundUses.has(`aerial:${self}`) || !others.length) return;
      const t = k.choose(c, key, 'RESONANCE — EAGLE MARIN', others, {optional: true, text: 'Put 1 Training counter on another friendly Bronze Saint?'});
      if (!t) return;
      k.once(st, `aerial:${self}`);
      st.units[t].training = (st.units[t].training || 0) + 1;
    }),
    // Aerial Grace: o portador ganha Nimble.
    aura: (s, c, key, self, unit) => (k.bearerOf(c, self) === unit ? {atk: 0, hp: 0, keywords: ['Nimble']} : null),
  },

  // Ophiuchus Silver Cloth (+1 ATK: genérico)
  'athena-v6-067': {
    gearCombatDamage: (s, c, key, self, bearer, victim) => {
      const fang = !s.roundUses.has(`fang:${self}`), extra = SHAINA(c, bearer) && hadSeal(s, victim);
      if (!fang && !extra) return;
      return st => {
        if (!st.units[victim]) return;
        // Serpent's Fang: uma vez por Round, o Devotee atingido tem -1 ATK até o fim do Round.
        if (fang && k.once(st, `fang:${self}`)) k.buff(st, victim, -1, 0, 'this_round');
        // Resonance — Ophiuchus Shaina: alvo que tinha Seal no início do Strike sofre 1 a mais.
        if (extra) k.damage(st, c, victim, 1);
      };
    },
    watchDeclare: (s, c, key, self, attacker, target) => { snapshotSeal(s, attacker, target); },
  },

  // Lizard Silver Cloth (+0/+1: genérico)
  // Resonance — Lizard Misty: implementada no damagePrevented de Misty (athena-devotees.js, athena-v6-023).
  'athena-v6-068': {
    // Air Barrier: uma vez por Round, o portador receberia dano de Strike: pode pagar {1}{C} e prevenir 1.
    watchDeclare: ward({tag: 'air', ability: 'AIR BARRIER', cost: 1, amount: 1, unit: (s, c, key, self) => k.bearerOf(c, self),
      applies: (s, c, key, self, attacker, target, uid) => inStrike(attacker, target, uid)}),
  },

  // Perseus Silver Cloth (+0/+1: genérico)
  // Resonance — Perseus Algol (Medusa Shield dá -1 ATK ao atacante): implementada no watchDeclare do Algol (athena-v6-024).
  'athena-v6-069': {
    // Medusa's Curse (gancho gearSurvive): uma vez por Round, o portador sobreviveu como defensor: o atacante -1 ATK até o fim
    // do Round (31/10/2026: Seal só nos Saints do gelo).
    gearSurvive: (s, c, key, self, bearer, role, foe) => role === 'defender' && foe && !s.roundUses.has(`curse:${self}`) && k.once(s, `curse:${self}`) && (st => {
      if (st.units[foe]) k.buff(st, foe, -1, 0);
    }),
  },

  // Lyra Silver Cloth (+0/+1: genérico)
  'athena-v6-070': {
    activate: {name: 'Healing Melody', cost: 1, once: true, tap: false,
      check: (s, c, key) => { if (!friendlySaints(s, c, key).length) throw new k.RuleError('alvo', 'sem Saint seu em campo'); },
      run: (s, c, key, self, choice) => {
        const saints = friendlySaints(s, c, key);
        const t = saints.includes(choice?.target) ? choice.target : k.choose(c, key, 'HEALING MELODY', saints, {text: 'Choose target friendly Saint.'});
        if (!t) return;
        k.removeDamage(s, t, 1);
        // Resonance — Lyra Orphee: pode remover 1 de dano de outro Saint amigo.
        if (!ORPHEE(c, k.bearerOf(c, self))) return;
        const other = k.choose(c, key, 'RESONANCE — LYRA ORPHEE', saints.filter(u => u !== t), {optional: true, text: 'Remove 1 damage from another target friendly Saint?'});
        if (other) k.removeDamage(s, other, 1);
      }},
  },
  // Dragon Shield — Smothering Tithe (08/11/2026): por carta que o oponente compra, ganhe {1}{L}, a menos que ele pague {1}{C}.
  // Gancho watchDraw (v6/hades.js): um gatilho por evento 'draw'.
  'athena-v6-045': {watchDraw: (s, c, key, self, e) => e.player !== key && (st => {
    if (k.canPayCosmo(st, e.player, 1) && k.may(c, e.player, "DRAGON'S TITHE", {cost: '{1}{C}', text: 'Pay {1}{C} so your opponent does not gain {1}{L}?'})) k.payCosmo(st, e.player, 1);
    else k.gainLatent(st, key, 1);
  })},
};
