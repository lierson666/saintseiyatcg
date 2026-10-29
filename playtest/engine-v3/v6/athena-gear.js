// Efeitos V6 de Athena (Equipment) que a tabela por número (effects.js) não cobre. Ver ./athena.js.
// Texto: card-forge/art-web/cards.json (habilidades_en). Dúvidas de regra: docs/v6-efeitos-pendencias.md ("Athena — Equipment").
// Os bônus fixos impressos ("Equipped Devotee gets +N ATK / +M HP") já vêm de `card.equipped` (shared/preview-cards.js / canon):
// não são repetidos aqui. {T} em Equipment = uma vez por Round (guia §61), por isso `once: true, tap: false`.
import * as k from './kit.js';
import {spendBase, addSeal} from '../core.js';
import {shield} from '../effects.js';

const name = (c, uid) => k.card(c, uid)?.name || '';
const isSaint = (c, uid) => k.isDevotee(c, uid) && /Saint/.test(k.card(c, uid).type);
const sealed = (s, uid) => (s.units[uid]?.seal || 0) > 0;
const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
const named = re => (c, uid) => !!uid && re.test(name(c, uid));
const HYOGA = named(/Hyoga/i), SHUN = named(/\bShun\b/i), IKKI = named(/Ikki/i), MU = named(/\bMu\b/i), SAGA = named(/Saga/i),
  AIOLIA = named(/Aiolia/i), CAMUS = named(/Camus/i), SHAINA = named(/Shaina/i), ORPHEE = named(/Orphee/i);

// "You may pay {N}{C}": Bases preparadas (só pergunta se dá para pagar).
function pay(st, c, key, n, ability, uid) {
  if (ready(st, key) < n || !k.may(c, key, ability, {uid, cost: `${n} Cosmo`})) return false;
  if (n) spendBase(st, key, n);
  return true;
}
// "Once per game" por jogador. shortcut: guardado em state.v6Game (objeto simples); a engine não tem campo próprio.
const game = (s, key, tag) => !(s.v6Game ||= {})[`${key}:${tag}`];
const useGame = (s, key, tag) => { (s.v6Game ||= {})[`${key}:${tag}`] = true; };
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
function ward({tag, ability, cost, amount, unit, applies}) {
  return (s, c, key, self, attacker, target) => {
    const t = `${tag}:${self}`, uid = unit(s, c, key, self);
    if (!uid || s.roundUses.has(t) || !applies(s, c, key, self, attacker, target, uid)) return;
    return st => {
      if (st.roundUses.has(t) || (!uid.startsWith('god:') && !st.units[uid]) || !pay(st, c, key, cost, ability, self)) return;
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
  // pendente: Resonance — Andromeda Shun (Counterattack: "whenever Shun prevents damage to your God or another friendly Saint
  //   with Nebula Chain, deal damage equal to half the prevented, rounded down") — efeito do Shun/Nebula Chain, precisa de
  //   gancho "prevented damage".
  'athena-v6-008': {},

  // Phoenix Cloth V2 (+2 ATK: genérico)
  'athena-v6-010': {
    // Burning Spirit: +1 ATK enquanto o portador tem dano marcado.
    aura: (s, c, key, self, unit) => (k.bearerOf(c, self) === unit && (s.units[unit]?.damage || 0) > 0 ? {atk: 1, hp: 0} : null),
    // Resonance — Phoenix Ikki: uma vez por jogo, ao ficar equipada em Ikki, pode remover todos os Rebirth dele.
    // pendente: só vale ao ser jogada já equipada em Ikki (cast); equipar depois (reequip) não tem gancho.
    cast: (s, c, key, self) => {
      const b = k.bearerOf(c, self);
      if (!IKKI(c, b) || !game(s, key, 'phoenix-cloth-v2') || !k.markers(s, b, 'Rebirth')) return;
      return st => {
        const n = k.markers(st, b, 'Rebirth');
        if (!st.units[b] || !n || !game(st, key, 'phoenix-cloth-v2') || !k.may(c, key, 'RESONANCE — PHOENIX IKKI', {uid: b, text: 'Remove all Rebirth counters from Phoenix Ikki?'})) return;
        useGame(st, key, 'phoenix-cloth-v2');
        k.addMarker(st, b, 'Rebirth', -n);
      };
    },
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
  // pendente: Resonance — Dragon Shiryu ("Pending design and approval" no próprio texto da carta).
  'athena-v6-014': {
    activate: {name: 'Galaxian Explosion', cost: 4, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      // Resonance — Gemini Saga: 7 em vez de 5.
      run: (s, c, key, self) => distribute(s, c, key, 'GALAXIAN EXPLOSION', SAGA(c, k.bearerOf(c, self)) ? 7 : 5)},
  },

  // Leo Gold Cloth (+2 ATK: genérico)
  // pendente: Resonance — Phoenix Ikki ("Pending design and approval" no próprio texto da carta).
  'athena-v6-016': {
    activate: {name: 'Lightning Plasma', cost: 3, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key, self) => {
        const extra = AIOLIA(c, k.bearerOf(c, self)) ? 1 : 0; // Resonance — Leo Aiolia: +1 em cada alvo
        for (const t of k.chooseUpTo(c, key, 'LIGHTNING PLASMA', k.enemies(s, c, key), 2, {text: 'Choose up to two target enemy Devotees.'})) k.damage(s, c, t, 2 + extra);
      }},
  },

  // Aquarius Gold Cloth (+1 ATK: genérico)
  // pendente: Resonance — Cygnus Hyoga ("Pending design and approval" no próprio texto da carta).
  'athena-v6-018': {
    activate: {name: 'Aurora Execution', cost: 3, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key, self, choice) => {
        const t = enemyTarget(s, c, key, 'AURORA EXECUTION', choice);
        if (!t) return;
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
    // Divine Aegis (+0/+1) e Miracle (+1/+1 a mais com 5 ou menos Soul): Saints amigos.
    aura: (s, c, key, self, unit) => {
      if (k.controllerOf(s, unit) !== key || !isSaint(c, unit)) return null;
      const low = s.players[key].soul <= 5;
      return {atk: low ? 1 : 0, hp: low ? 2 : 1};
    },
    // The Last Miracle: uma vez por jogo, ao jogar, com 5 ou menos Soul: previne todo dano ao God e aos Saints amigos até o fim do Round.
    // pendente: vale para os Saints em campo na resolução; os que entrarem depois não são cobertos.
    cast: (s, c, key) => (s.players[key].soul <= 5 && game(s, key, 'last-miracle') ? st => {
      if (st.players[key].soul > 5 || !game(st, key, 'last-miracle')) return;
      useGame(st, key, 'last-miracle');
      for (const t of [k.godTarget(key), ...friendlySaints(st, c, key)]) shield(st, t, Infinity, {strikeOnly: false, duration: 'this_round'});
    } : undefined),
    // Divine Sanctuary — {3}{C}: uma vez por Round, quando seu God receberia dano de Strike, previne até 3.
    watchDeclare: ward({tag: 'sanctuary', ability: 'DIVINE SANCTUARY', cost: 3, amount: 3, unit: (s, c, key) => k.godTarget(key),
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
  // pendente: Resonance — Phoenix Ikki ("when Ikki survives a Strike, you may remove 1 damage") — sem gancho "survives a Strike".
  'athena-v6-047': {
    // Burning Will: +1 ATK enquanto o portador tem dano marcado.
    aura: (s, c, key, self, unit) => (k.bearerOf(c, self) === unit && (s.units[unit]?.damage || 0) > 0 ? {atk: 1, hp: 0} : null),
  },

  // Jamir Repair Tools
  'athena-v6-050': {
    activate: {name: 'Repair Tools', cost: 1, once: true, tap: false,
      check: (s, c, key) => { if (!s.players[key].battlefield.some(u => k.card(c, u)?.armor)) throw new k.RuleError('alvo', 'sem Armor sua em campo'); },
      run: (s, c, key, self, choice) => {
        const armors = s.players[key].battlefield.filter(u => k.card(c, u)?.armor);
        const t = armors.includes(choice?.target) ? choice.target : k.choose(c, key, 'REPAIR TOOLS', armors, {text: 'Choose target friendly Armor.'});
        if (t) k.removeDamage(s, t, MU(c, k.bearerOf(c, self)) ? 2 : 1); // Resonance — Aries Mu: até 2
      }},
  },

  // Sanctuary Torch
  'athena-v6-051': {
    // Sacred Flame: +1 ATK ao portador enquanto seu God tem menos Soul que o God oposto.
    aura: (s, c, key, self, unit) => (k.bearerOf(c, self) === unit && s.players[key].soul < s.players[k.other(s, key)].soul ? {atk: 1, hp: 0} : null),
  },

  // Eagle Silver Cloth (+1 ATK: genérico)
  // pendente: Resonance — Eagle Marin (sobrevive a um Strike: Training em outro Bronze Saint) — sem gancho "survives a Strike".
  'athena-v6-066': {
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
  // pendente: Resonance — Lizard Misty (Marble Wall previne todo o dano: remove 1 dano da Cloth) — efeito do Misty, sem gancho de prevenção.
  'athena-v6-068': {
    // Air Barrier: uma vez por Round, o portador receberia dano de Strike: pode pagar {1}{C} e prevenir 1.
    watchDeclare: ward({tag: 'air', ability: 'AIR BARRIER', cost: 1, amount: 1, unit: (s, c, key, self) => k.bearerOf(c, self),
      applies: (s, c, key, self, attacker, target, uid) => inStrike(attacker, target, uid)}),
  },

  // Perseus Silver Cloth (+0/+1: genérico)
  // pendente: Medusa's Curse ("survives a Strike as a defender": Seal no atacante) — sem gancho "survives a Strike".
  // pendente: Resonance — Perseus Algol (Medusa Shield dá -1 ATK ao atacante) — efeito do Algol.
  'athena-v6-069': {},

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
};
