// Efeitos V6 de Athena (spells e domains) que a tabela por número (effects.js) não cobre. Ver ./athena.js.
// Texto: card-forge/art-web/cards.json (habilidades_en). Dúvidas: docs/v6-efeitos-pendencias.md ("Athena — Spells e Domains").
// Event e Miracle jogam como Technique (v6Spell em hooks.js, guia §54): 055, 079, 080, 083, 086, 089 e 090 são jogáveis.
import * as k from './kit.js';
import {addSeal} from '../core.js';
import {shield, forbidStrike, isBronze, keywordsOf} from '../effects.js';
import {spendBase} from '../core.js';

const isSaint = (c, u) => k.hasType(c, u, 'Saint');
const saints = (s, c, key, type = 'Saint') => k.devotees(s, c, key).filter(u => k.hasType(c, u, type));
const named = (c, u, name) => k.card(c, u)?.name === name;
const controls = (s, c, key, ...ids) => k.devotees(s, c, key).some(u => ids.includes(k.id(c, u)));
const sealOf = (s, u) => s.units[u]?.seal || 0;
const foe = (s, c, key, ability) => k.choose(c, key, ability, k.enemies(s, c, key), {text: 'Choose target enemy Devotee.'});
const friendlySaint = (s, c, key, ability, type) => k.choose(c, key, ability, saints(s, c, key, type), {text: 'Choose target friendly Saint.'});
const alive = (s, key, u) => k.onField(s, key, u);
const struck = (s, c, key) => k.enemies(s, c, key).filter(u => s.strikes.get(u) === s.turn); // 506
// "At the end of the round": gatilho atrasado, resolvido no checkpoint de fim de Round (core.js `delayed`).
const atRoundEnd = (s, key, self, ability, run) => s.delayed.push({controller: key, uid: self, ability, run});

// Devotees seus que vestem uma Armor (alvo do Cloth Restoration, 30/10/2026).
const armored = (s, c, key) => s.players[key].battlefield.filter(u => k.card(c, u)?.kind === 'Devotee' && Object.keys(c.attached).some(e => c.attached[e] === u && k.card(c, e)?.armor));
const enemyMT = (s, c, key) => s.chain.filter(i => i.spell && i.controller !== key && /Moment|Technique|Event|Miracle/.test(k.card(c, i.uid)?.type || '')).map(i => i.uid);
const godFaction = (s, key) => s.divine?.[k.other(s, key)]?.god?.replace(/^god-/, '');

export default {
  // Spells baratas da color pie (autor, 31/10/2026: docs/spells-baratas-proposta.md).
  'athena-v6-505': {spell: {check: k.needTarget(k.devotees, 'sem Devotee aliado'), run: (s, c, key) => { // Athena's Aegis
    const t = k.choose(c, key, "ATHENA'S AEGIS", k.devotees(s, c, key), {text: 'Choose target friendly Devotee.'});
    if (t) shield(s, t, 2, {strikeOnly: false});
    k.draw(s, key, 1);
  }}},
  'athena-v6-506': {spell: {check: k.needTarget(struck, 'sem Devotee inimigo que declarou Strike neste Round'), run: (s, c, key) => { // Sanctuary's Judgment
    const t = k.choose(c, key, "SANCTUARY'S JUDGMENT", struck(s, c, key), {text: 'Choose target enemy Devotee that declared a Strike this round.'});
    if (t) k.damage(s, c, t, 3);
  }}},
  'athena-v6-507': {spell: {check: k.needTarget((s, c, key) => saints(s, c, key), 'sem Saint aliado'), run: (s, c, key) => { // Oath of the Saints
    const t = friendlySaint(s, c, key, 'OATH OF THE SAINTS');
    if (t) k.buff(s, t, 1, 1);
    k.draw(s, key, 1);
  }}},
  // ---------- Spells ----------
  // The Masked Saint's Oath
  'athena-v6-055': {spell: {run: (s, c, key) => {
    const t = friendlySaint(s, c, key, "THE MASKED SAINT'S OATH", 'Silver Saint');
    if (!t) return;
    k.buff(s, t, 1, 2);
    if (named(c, t, 'EAGLE MARIN') || named(c, t, 'OPHIUCHUS SHAINA')) k.draw(s, key, 1);
  }}},
  // Kiki's Telekinesis (autor, 06/11/2026): manda ao Vazio qualquer Equipment em campo.
  'athena-v6-057': {spell: {run: (s, c, key) => {
    const t = k.choose(c, key, "KIKI'S TELEKINESIS", k.allEquipment(s, c), {text: 'Choose target Equipment.'});
    if (t) k.exile(s, c, t, 'battlefield'); // alvo ilegal: só o exílio não acontece
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
  // The Golden Arrow (Swords to Plowshares; texto do autor, 01/11/2026, sem a condição de Strike): Devotee inimigo alvo vai
  // ao Void; o God do controlador ganha Soul igual ao ATK dele. Substitui SPELLS '082' de effects.js.
  'athena-v6-082': {spell: {run: (s, c, key, self, choice) => {
    const legal = k.enemies(s, c, key);
    const t = legal.includes(choice?.target) ? choice.target
      : k.choose(c, key, 'THE GOLDEN ARROW', legal, {text: 'Choose target enemy Devotee.'});
    if (!t) return;
    const atk = k.atkOf(s, c, t), owner = k.controllerOf(s, t);
    k.exile(s, c, t);
    k.gainSoul(s, owner, Math.max(0, atk));
  }}},
  // The Return of the Phoenix: o Saint devolvido não declara Strike neste Round (gancho cannotStrike).
  'athena-v6-080': {spell: {run: (s, c, key) => {
    const dead = s.players[key].tartarus.filter(u => k.hasType(c, u, 'Bronze Saint') && c.objects[u].owner === key);
    const t = k.choose(c, key, 'THE RETURN OF THE PHOENIX', dead, {text: 'Choose target defeated friendly Bronze Saint.'});
    if (!t || !k.putOntoField(s, c, key, t, 'tartarus', {prepared: false})) return; // Exhausted
    forbidStrike(s, t);
    // 01/11/2026: alvo Phoenix Ikki traz também cada outro Phoenix Ikki do seu Tártaro, Unprepared.
    if (named(c, t, 'PHOENIX IKKI')) for (const u of s.players[key].tartarus.filter(u => named(c, u, 'PHOENIX IKKI') && c.objects[u].owner === key)) { if (k.putOntoField(s, c, key, u, 'tartarus', {prepared: false})) forbidStrike(s, u); }
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
  // Athena's Final Decree — Austere Command (08/11/2026): escolha dois de três modos.
  'athena-v6-084': {spell: {run: (s, c, key) => {
    const modes = ['Cost 3 or less', 'Cost 4 or more', 'All Equipment'];
    let picked = k.chooseUpTo(c, key, "ATHENA'S FINAL DECREE", modes, 2, {text: 'Choose two.'}).filter(m => modes.includes(m)).slice(0, 2);
    if (picked.length < 2) picked = [...picked, ...modes.filter(m => !picked.includes(m))].slice(0, 2);
    const dev = k.allDevotees(s, c).filter(u => (picked.includes('Cost 3 or less') && k.costOf(c, u) <= 3) || (picked.includes('Cost 4 or more') && k.costOf(c, u) >= 4));
    const gear = picked.includes('All Equipment') ? k.allEquipment(s, c) : [];
    for (const u of dev) if (s.units[u]) k.defeat(s, c, u);
    for (const u of gear) if (k.controllerOf(s, u)) k.destroyEquipment(s, c, u);
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
    const victims = k.chooseUpTo(c, key, 'THE FINAL SACRIFICE', saints(s, c, key), 2, {text: 'Defeat up to two friendly Saints.'});
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
    for (const t of k.chooseUpTo(c, key, 'DIVINE WILL', saints(s, c, key), 3, {text: 'Choose up to three friendly Saints.'})) k.buff(s, t, 2, 2);
    shield(s, k.godTarget(key), Infinity); // Athena's Protection
    if (s.players[key].soul > 5) return;
    const dead = s.players[key].tartarus.filter(u => isSaint(c, u) && k.isDevotee(c, u) && c.objects[u].owner === key);
    const t = k.choose(c, key, 'THE MIRACLE OF HOPE', dead, {text: 'Choose target defeated friendly Saint.'});
    if (t && k.putOntoField(s, c, key, t, 'tartarus', {prepared: true})) forbidStrike(s, t);
  }}},

  // ---------- Domains (rebalanceamento aprovado pelo autor em 01/11/2026, docs/domains-rebalance-proposta.md) ----------
  // Linha geral (qualquer God): ganchos e `activate` (uid `domain:${key}`). Ressonância — Athena (só com God Athena):
  // `res` (ativada, uid `domain:${key}:res`, uma vez por turno, registry.js) e `resonance` (gatilhos).
  // 062 Galaxian Wars Arena: Tournament Spirit (linha geral) fica em effects.js (afterStrike).
  'athena-v6-062': {res: {name: 'RESONANCE', cost: 2, check: k.needTarget((s, c, key) => saints(s, c, key, 'Bronze Saint'), 'sem Bronze Saint aliado'),
    run: (s, c, key) => { const t = friendlySaint(s, c, key, 'RESONANCE', 'Bronze Saint'); if (t) k.buff(s, t, 2, 2); }}},
  // 064 The Five Old Peaks: Ancient Discipline (estática, linha geral) fica em effects.js (mods).
  'athena-v6-064': {res: {name: 'RESONANCE', cost: 1, check: k.needTarget((s, c, key) => saints(s, c, key), 'sem Saint aliado'),
    run: (s, c, key) => {
      const t = friendlySaint(s, c, key, 'RESONANCE');
      if (t) { k.buff(s, t, 0, 0, 'until_next_turn', ['Guardian']); k.removeDamage(s, t, 1); }
    }}},
  // Jamir Tower: Cloth Restoration, once each round, {1}{C}, sem {T}; "target friendly Devotee equipped with an Armor".
  'athena-v6-063': {
    activate: {
      name: 'CLOTH RESTORATION', cost: 1, once: true, tap: false,
      check: (s, c, key) => { if (!armored(s, c, key).length) throw new k.RuleError('alvo', 'sem Devotee seu com Armor'); },
      run: (s, c, key) => {
        const t = k.choose(c, key, 'CLOTH RESTORATION', armored(s, c, key), {text: 'Choose target friendly Devotee equipped with an Armor.'});
        if (t) k.removeDamage(s, t, 1);
      },
    },
    res: {name: 'RESONANCE', cost: 2, check: k.needTarget((s, c, key) => s.players[key].tartarus.filter(u => k.card(c, u)?.armor), 'sem Armor no seu Tartarus'),
      run: (s, c, key) => {
        const t = k.choose(c, key, 'RESONANCE', s.players[key].tartarus.filter(u => k.card(c, u)?.armor), {text: 'Choose target Armor card in your Tartarus.'});
        if (t) k.toHand(s, c, t, 'tartarus');
      }},
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
    res: {name: 'RESONANCE', cost: 3, run: (s, c, key) => saints(s, c, key).forEach(u => k.buff(s, u, 1, 0))},
  },
  // Athena's Statue — Saint's Offering (compra da facção): ativada opcional no seu turno, uma vez por Round; sem carta na mão
  // ou sem {2}{S} o custo não é pago inteiro e a ativada não pode ser usada.
  'athena-v6-501': {
    activate: {name: "SAINT'S OFFERING", cost: 0, once: true, tap: false,
      check: (s, c, key) => {
        if (!s.players[key].hand.length) throw new k.RuleError("SAINT'S OFFERING", 'sem carta na mão para pôr no Void');
        if (s.players[key].soul < 2) throw new k.RuleError("SAINT'S OFFERING", 'Soul insuficiente para perder {2}{S}');
      },
      run: (s, c, key) => {
        const p = s.players[key];
        const t = p.hand.length === 1 ? p.hand[0] : c.decide?.(key, {ability: "SAINT'S OFFERING", options: [...p.hand], choose: 'discard-one', text: 'Choose a card to put into the Void.'});
        if (!t || p.soul < 2 || !k.exile(s, c, t, 'hand')) return;
        k.loseSoulOf(s, key, 2);
        if (!s.victory) k.draw(s, key, 1);
      }},
    resonance: {watchSurvive: (s, c, key, self, unit) => k.controllerOf(s, unit) === key && isSaint(c, unit)
      && k.resPay(s, c, key, 'survive', 1, 'RESONANCE', st => k.gainSoul(st, key, 2), {text: 'Pay {1}{C}: your God gains {2}{S}?'})},
  },
  // The Sanctuary Gates — Ghostly Prison (08/11/2026, §58): Strike contra o seu God custa {1}{C} por Devotee; soma com outros impostos.
  'athena-v6-520': {
    strikeTax: () => 1,
    res: {name: 'RESONANCE', cost: 2, run: (s, c, key) => shield(s, k.godTarget(key), 3, {duration: 'until_next_turn', owner: key})},
  },
  // Staples do branco (autor, 08/11/2026: docs/proposta-athena-staples-branco.md).
  // Blood of the Dragon — Reprieve: o Moment/Technique inimigo na pilha volta à mão do dono; compre 1.
  'athena-v6-058': {spell: {
    check: (s, c, key) => { if (!enemyMT(s, c, key).length) throw new k.RuleError('alvo', 'sem Moment ou Technique inimigo na cadeia'); },
    run: (s, c, key) => {
      const t = k.choose(c, key, 'BLOOD OF THE DRAGON', enemyMT(s, c, key), {text: 'Choose target enemy Moment or Technique.'});
      if (t && k.counterSpell(s, c, t)) { const o = s.players[c.objects[t].owner]; for (const z of ['tartarus', 'void']) if (o[z].includes(t)) o[z].splice(o[z].indexOf(t), 1); o.hand.push(t); }
      k.draw(s, key, 1);
    }}},
  // The Galaxian Wars — Elspeth: 2 Sanctuary Soldier 1/1; com 3 Bronze Saints, compre 1.
  'athena-v6-052': {spell: {run: (s, c, key) => {
    for (let i = 0; i < 2; i++) k.summonToken(s, c, key, {id: 'neutral-token-sanctuary-soldier', name: 'Sanctuary Soldier', atk: 1, hp: 1, type: 'Soldier'});
    if (k.devotees(s, c, key).filter(u => isBronze(c, u)).length >= 3) k.draw(s, key, 1);
  }}},
  // Cassios's Sacrifice — Ephemerate: blink de um Devotee aliado (§58).
  'athena-v6-076': {spell: {
    check: k.needTarget((s, c, key) => k.devotees(s, c, key), 'sem Devotee aliado'),
    run: (s, c, key) => { const t = k.choose(c, key, "CASSIOS'S SACRIFICE", k.devotees(s, c, key), {text: 'Choose target friendly Devotee.'}); if (t) k.blink(s, c, t); },
  }},
  // The Call of Athena — Akroma's Will: +2 ATK e Nimble no time; com Gold Saint, @Immune à facção do God inimigo.
  'athena-v6-061': {spell: {run: (s, c, key) => {
    const gold = k.devotees(s, c, key).some(u => k.hasType(c, u, 'Gold Saint')), f = godFaction(s, key);
    for (const u of k.devotees(s, c, key)) {
      k.buff(s, u, 2, 0, 'this_round', ['Nimble']);
      if (gold && f) (s.v6Immune ||= {})[u] = {round: s.round, faction: f};
    }
  }}},
};
