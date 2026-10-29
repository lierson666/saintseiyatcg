// Efeitos V6 de Athena (spells e domains) que a tabela por número (effects.js) não cobre. Ver ./athena.js.
// Texto: card-forge/art-web/cards.json (habilidades_en). Dúvidas: docs/v6-efeitos-pendencias.md ("Athena — Spells e Domains").
// Event e Miracle jogam como Technique (v6Spell em hooks.js, guia §54): 055, 079, 080, 083, 086, 089 e 090 são jogáveis.
import * as k from './kit.js';
import {addSeal} from '../core.js';
import {shield, forbidStrike} from '../effects.js';
import {spendBase} from '../core.js';

const isSaint = (c, u) => k.hasType(c, u, 'Saint');
const saints = (s, c, key, type = 'Saint') => k.devotees(s, c, key).filter(u => k.hasType(c, u, type));
const named = (c, u, name) => k.card(c, u)?.name === name;
const controls = (s, c, key, ...ids) => k.devotees(s, c, key).some(u => ids.includes(k.id(c, u)));
const sealOf = (s, u) => s.units[u]?.seal || 0;
const foe = (s, c, key, ability) => k.choose(c, key, ability, k.enemies(s, c, key), {text: 'Choose target enemy Devotee.'});
const friendlySaint = (s, c, key, ability, type) => k.choose(c, key, ability, saints(s, c, key, type), {text: 'Choose target friendly Saint.'});
const alive = (s, key, u) => k.onField(s, key, u);
// "At the end of the round": gatilho atrasado, resolvido no checkpoint de fim de Round (core.js `delayed`).
const atRoundEnd = (s, key, self, ability, run) => s.delayed.push({controller: key, uid: self, ability, run});

export default {
  // ---------- Spells ----------
  // The Masked Saint's Oath
  'athena-v6-055': {spell: {run: (s, c, key) => {
    const t = friendlySaint(s, c, key, "THE MASKED SAINT'S OATH", 'Silver Saint');
    if (!t) return;
    k.buff(s, t, 1, 2);
    if (named(c, t, 'EAGLE MARIN') || named(c, t, 'OPHIUCHUS SHAINA')) k.draw(s, key, 1);
  }}},
  // Kiki's Telekinesis
  'athena-v6-057': {spell: {run: (s, c, key) => {
    const gear = s.players[key].battlefield.filter(u => k.card(c, u)?.kind === 'Equipment');
    const t = k.choose(c, key, "KIKI'S TELEKINESIS", gear, {text: 'Choose target friendly Equipment.'});
    if (t) k.toHand(s, c, t, 'battlefield'); // alvo ilegal: só o retorno não acontece
    if (controls(s, c, key, 'athena-v6-026')) k.draw(s, key, 1);
  }}},
  // Freezing Coffin
  'athena-v6-078': {spell: {run: (s, c, key) => {
    const t = foe(s, c, key, 'FREEZING COFFIN');
    if (!t) return;
    const had = sealOf(s, t) > 0;
    addSeal(s, c, [t], controls(s, c, key, 'athena-v6-017', 'athena-v6-005') ? 3 : 2, 'FREEZING COFFIN');
    if (had) k.damage(s, c, t, 2); // Absolute Zero: já tinha Seal antes desta Spell
  }}},
  // Shun's Embrace
  'athena-v6-079': {spell: {run: (s, c, key) => {
    const t = friendlySaint(s, c, key, "SHUN'S EMBRACE");
    if (!t) return;
    shield(s, t, 4);
    if (named(c, t, 'ANDROMEDA SHUN') && k.may(c, key, "SHUN'S EMBRACE", {text: 'Also prevent the next 2 Strike damage to your God?'})) shield(s, k.godTarget(key), 2);
  }}},
  // The Return of the Phoenix: o Saint devolvido não declara Strike neste Round (gancho cannotStrike).
  'athena-v6-080': {spell: {run: (s, c, key) => {
    const dead = s.players[key].tartarus.filter(u => k.hasType(c, u, 'Bronze Saint') && c.objects[u].owner === key);
    const t = k.choose(c, key, 'THE RETURN OF THE PHOENIX', dead, {text: 'Choose target defeated friendly Bronze Saint.'});
    if (!t || !k.putOntoField(s, c, key, t, 'tartarus', {prepared: false})) return; // Exhausted
    forbidStrike(s, t);
    if (named(c, t, 'PHOENIX IKKI')) { k.removeDamage(s, t); k.addMarker(s, t, 'Rebirth', 1); }
  }}},
  // The Twelve Flames
  'athena-v6-083': {spell: {run: (s, c, key, self) => {
    const picked = k.chooseUpTo(c, key, 'THE TWELVE FLAMES', saints(s, c, key), 3, {text: 'Choose up to three target friendly Saints.'});
    for (const t of picked) { k.addMarker(s, t, 'Flame', 1); k.buff(s, t, 1, 0); } // Burning Determination: +1 ATK nos que ganharam Flame
    // Final Hour: remove os Flame desta Spell; por contador removido pode curar 1 de dano.
    if (picked.length) atRoundEnd(s, key, self, 'FINAL HOUR', st => {
      for (const t of picked) {
        if (!st.units[t] || !k.markers(st, t, 'Flame')) continue;
        k.addMarker(st, t, 'Flame', -1);
        if (k.may(c, key, 'FINAL HOUR', {uid: t, text: 'Remove 1 damage from that Saint?'})) k.removeDamage(st, t, 1);
      }
    });
  }}},
  // Hyoga's Absolute Zero
  'athena-v6-084': {spell: {run: (s, c, key) => {
    const t = foe(s, c, key, "HYOGA'S ABSOLUTE ZERO");
    if (!t) return;
    k.damage(s, c, t, sealOf(s, t) > 0 ? 5 : 3);
    if (s.units[t] && controls(s, c, key, 'athena-v6-005')) addSeal(s, c, [t], 1, 'ABSOLUTE ZERO'); // depois de resolver
  }}},
  // Deprived of Senses
  'athena-v6-086': {spell: {run: (s, c, key, self) => {
    const t = friendlySaint(s, c, key, 'DEPRIVED OF SENSES');
    if (!t) return;
    k.buff(s, t, 3, 3, 'this_round', named(c, t, 'PHOENIX IKKI') ? ['Pierce'] : []); // Beyond the Sixth Sense
    atRoundEnd(s, key, self, 'THE ULTIMATE SACRIFICE', st => { if (alive(st, key, t)) k.defeat(st, c, t); });
  }}},
  // The Wall of Lamentation
  'athena-v6-089': {spell: {run: (s, c, key) => {
    const victims = k.chooseUpTo(c, key, 'THE FINAL SACRIFICE', saints(s, c, key), 3, {text: 'Defeat up to three friendly Saints.'});
    const gold = victims.some(u => k.hasType(c, u, 'Gold Saint'));
    for (const u of victims) k.defeat(s, c, u);
    for (let i = 0; i < victims.length; i++) {
      const modes = ['Deal 3 damage', 'Prevent 3 damage to your God', 'Draw two cards'];
      const m = c.decide?.(key, {ability: 'THE FINAL SACRIFICE', options: modes, choose: 'mode', text: 'Choose one.'});
      if (m === modes[0]) k.damage(s, c, foe(s, c, key, 'THE FINAL SACRIFICE'), 3);
      else if (m === modes[1]) shield(s, k.godTarget(key), 3);
      else if (m === modes[2]) k.draw(s, key, 2);
    }
    if (gold) for (const u of saints(s, c, key)) k.buff(s, u, 2, 2); // The Light of the Twelve
  }}},
  // The Will of Athena: o Saint devolvido (Miracle of Hope) não declara Strike neste Round (gancho cannotStrike).
  'athena-v6-090': {spell: {run: (s, c, key) => {
    for (const t of k.chooseUpTo(c, key, 'DIVINE WILL', saints(s, c, key), 3, {text: 'Choose up to three friendly Saints.'})) k.buff(s, t, 3, 3);
    shield(s, k.godTarget(key), Infinity); // Athena's Protection
    if (s.players[key].soul > 5) return;
    const dead = s.players[key].tartarus.filter(u => isSaint(c, u) && k.isDevotee(c, u) && c.objects[u].owner === key);
    const t = k.choose(c, key, 'THE MIRACLE OF HOPE', dead, {text: 'Choose target defeated friendly Saint.'});
    if (t && k.putOntoField(s, c, key, t, 'tartarus', {prepared: true})) forbidStrike(s, t);
  }}},

  // ---------- Domains ----------
  // Jamir Tower: ativada pelo play.activate com uid `domain:${key}`. O {T} do Domain vale uma vez por Round (como o Equipment, §61).
  'athena-v6-063': {
    activate: {
      name: 'CLOTH RESTORATION', cost: 2, once: true, tap: false,
      check: (s, c, key) => { if (!s.players[key].battlefield.some(u => k.card(c, u)?.armor)) throw new k.RuleError('alvo', 'sem Armor amiga'); },
      run: (s, c, key) => {
        const armor = k.choose(c, key, 'CLOTH RESTORATION', s.players[key].battlefield.filter(u => k.card(c, u)?.armor), {text: 'Choose target friendly Armor.'});
        if (armor) k.removeDamage(s, armor, 1);
      },
    },
  },
  // The Stairway to the Twelve Temples — Twelve Temples (gancho watchSurvive): uma vez por Round, um Saint amigo sobreviveu a um
  // Strike; pode pagar {1}{C} para ele ganhar +1 ATK até o fim do Round.
  'athena-v6-065': {
    watchSurvive: (s, c, key, self, unit) => k.controllerOf(s, unit) === key && isSaint(c, unit) && !s.roundUses.has('twelve-temples:' + key) && (st => {
      const tag = 'twelve-temples:' + key;
      if (!st.units[unit] || st.roundUses.has(tag) || st.players[key].bases.filter(b => b.prepared).length < 1
        || !k.may(c, key, 'TWELVE TEMPLES', {uid: unit, cost: '1 Cosmo', text: 'Pay {1}{C}: that Saint gets +1 ATK?'})) return;
      spendBase(st, key, 1);
      k.once(st, tag);
      k.buff(st, unit, 1, 0);
    }),
  },
};
