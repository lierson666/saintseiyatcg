// Efeitos V6 das cartas neutras (neutral-v6-451..500). Ver ./registry.js.
// Texto: card-forge/art-web/cards.json (habilidades_en). Dúvidas: docs/v6-efeitos-pendencias.md ("Neutral").
// Só stats/keywords (tratados pela engine ou por preview-cards): bônus fixo de Equipment (465, 466, 467, 469, 492), Guardian (462).
// Interpretações provisórias (o autor confirma):
// - "blocks" = o Devotee é o alvo declarado de um Strike inimigo (defensor), como em poseidon.js.
// - "until end of turn" = duração 'this_round' (autor, 30/10/2026: vale até o fim do Round, nos dois turnos).
// - "once per turn" / "first … each turn" = uma vez por rodada (guia §64), via k.onceTurn.
// - Devotee entra Unprepared por padrão, então "enters exhausted" (459) não precisa de código.
// - Spells que escolhem alvo: a escolha fica numa função `target…` bem nomeada, fácil de mover para o cast.
import * as k from './kit.js';
import {spendBase, addSeal, hooks} from '../core.js';
import {shield, forbidStrike} from '../effects.js';
import {trigger, contextOf} from './registry.js';

const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
// "You may pay {N}{C}": pergunta só se dá para pagar; paga com Bases preparadas.
function pay(st, c, key, n, ability, uid) {
  if (ready(st, key) < n || !k.may(c, key, ability, {uid, cost: `${n} Cosmo`})) return false;
  spendBase(st, key, n);
  return true;
}
const live = (s, uid) => !!s.units[uid];
const foes = (s, c, key) => k.enemies(s, c, key);
const mine = (s, c, key) => k.devotees(s, c, key);
// loseSoul/draw lançam D52 depois da vitória: tudo que vem depois de perder Soul passa por aqui.
const lose = (st, key, n) => { if (!st.victory) k.loseSoulOf(st, key, n); };
const hitGod = (st, c, player, n) => { if (!st.victory) k.damage(st, c, k.godTarget(player), n); };
const draw = (st, key, n) => { if (!st.victory) k.draw(st, key, n); };
const loot = (st, c, key, ability) => { draw(st, key, 1); if (!st.victory) k.discard(st, c, key, 1, ability); };
const black = (c, u) => k.hasType(c, u, 'Black Saint');
const ghost = (c, u) => k.hasType(c, u, 'Ghost Saint');
const steel = (c, u) => k.hasType(c, u, 'Steel Saint');
const soldier = (c, u) => k.hasType(c, u, 'Soldier');
const isTechnique = (c, uid) => /Technique|Event|Miracle/.test(k.card(c, uid)?.type || '');
const controls = (s, c, key, cardId) => mine(s, c, key).some(u => k.id(c, u) === cardId);
const LEDA = 'neutral-v6-483', SPICA = 'neutral-v6-484';
const soldierToken = (st, c, key) => k.summonToken(st, c, key, {id: 'neutral-token-sanctuary-soldier', name: 'Sanctuary Soldier', atk: 1, hp: 1, type: 'Soldier'});
const steelToken = (st, c, key) => k.summonToken(st, c, key, {id: 'neutral-token-steel-recruit', name: 'Steel Recruit', atk: 1, hp: 1, type: 'Steel Recruit'});

// ---------- marcador -1/-1 (454, 473) ----------
// O objeto some do campo ao ser derrotado e leva os marcadores; o registro em s.v6Minus permite "enemy Devotee with a -1/-1 counter is defeated".
// shortcut: o registro não é limpo se o Devotee voltar do Tartarus (marcador fantasma); limpar na entrada se surgir caso real.
const putMinus = (s, uid) => { k.addCounter(s, uid, -1); (s.v6Minus ||= {})[uid] = true; };
const cursed = (s, uid) => !!s.v6Minus?.[uid] || (s.units[uid]?.training || 0) < 0;

// ---------- escolhas de alvo (um lugar por carta; mover para o cast quando houver alvo ao conjurar) ----------
const targetAnyDevotee = (s, c, key, ability, text = 'Choose target Devotee.') => k.choose(c, key, ability, k.allDevotees(s, c), {text});
const targetEnemy = (s, c, key, ability, text = 'Choose target enemy Devotee.') => k.choose(c, key, ability, foes(s, c, key), {text});
const targetOwn = (s, c, key, ability, text = 'Choose target Devotee you control.') => k.choose(c, key, ability, mine(s, c, key), {text});
const targetTartarusDevotees = (s, c, key, ability, count) => k.chooseUpTo(c, key, ability,
  s.players[key].tartarus.filter(u => c.objects[u].owner === key && k.card(c, u)?.kind === 'Devotee'), count, {text: 'Choose target Devotee card from your Tartarus.'});
const targetSpellOnChain = (s, c, key, ability, self) => k.choose(c, key, ability, s.chain.filter(i => i.spell && i.uid !== self).map(i => i.uid), {text: 'Choose target Moment or Technique.'});

// "Choose one" de habilidade ativada com dois modos: `choice.mode` ou o primeiro legal (sem pergunta, para o check e o run concordarem).
function modeOf(choice, legal, ability) {
  const mode = choice?.mode ?? legal[0];
  if (!legal.includes(mode)) throw new k.RuleError('modo', `${ability}: modo ilegal agora`);
  return mode;
}

// 2 de dano dividido entre até dois alvos inimigos (cada alvo recebe ao menos 1).
function distribute(s, c, key, ability, total) {
  const list = foes(s, c, key);
  const targets = list.length ? k.chooseUpTo(c, key, ability, list, Math.min(total, list.length), {text: 'Choose up to two target enemy Devotees.'}) : [];
  if (!targets.length) return;
  const dealt = Object.fromEntries(targets.map(t => [t, 1]));
  for (let i = targets.length; i < total; i++) dealt[targets.length === 1 ? targets[0] : k.choose(c, key, ability, targets, {text: 'Assign 1 damage to a target.'}) ?? targets[0]]++;
  for (const t of targets) k.damage(s, c, t, dealt[t]);
}

// "Cannot be defeated until the end of your next turn" (500): efeito 'save' re-armado a cada uso (mantém o `round` original).
// pendente: ao salvar, o dano fica em HP − 1 (convenção de Moonlight Protection); "until the end of your next round".
function immortal(s, c, uid) {
  k.addEffect(s, {kind: 'save', target: uid, anyDamage: true, duration: 'your_next_round', onSave: st => {
    if (st.units[uid]) st.units[uid].damage = Math.max(0, k.hpOf(st, c, uid) - 1);
    st.effects.push(eff);
  }});
  const eff = s.effects[s.effects.length - 1];
}

// ---------- observadores globais ----------
// 481 Frozen Discipline: "Whenever an enemy Devotee becomes Sealed" (hooks.sealed do core.js; não há gancho V6 próprio).
hooks.sealed.push((state, ctx, transitions) => {
  ctx = ctx || contextOf(state);
  const out = [];
  for (const key of state.order) for (const self of state.players[key].battlefield) {
    if (ctx.objects[self]?.cardId !== 'neutral-v6-481') continue;
    for (const t of transitions) if (t.controller && t.controller !== key) out.push(trigger(key, self, 'CRYSTAL SAINT · FROZEN DISCIPLINE', st => { if (live(st, self)) k.buff(st, self, 1, 1, 'this_round'); }));
  }
  return out;
});
// 499 Ultimate Sacrifice: "at the beginning of your next end step, sacrifice a Devotee" (registro em s.v6EndSac, lido no fim do turno).
hooks.turnEnd.push(state => {
  const ctx = contextOf(state), key = state.active, due = (state.v6EndSac || []).filter(e => e.key === key);
  if (!ctx || !due.length) return [];
  state.v6EndSac = state.v6EndSac.filter(e => e.key !== key);
  return due.map(e => trigger(key, e.uid, 'ULTIMATE SACRIFICE', st => {
    const t = targetOwn(st, ctx, key, 'ULTIMATE SACRIFICE', 'Sacrifice a Devotee you control.');
    if (t) k.sacrifice(st, ctx, t);
  }));
});

export default {
  // ---------- Black Saints ----------
  // Black Pegasus
  'neutral-v6-451': {
    combatDamage: (s, c, key) => st => hitGod(st, c, k.other(st, key), 1), // Black Meteor Fist
    declare: (s, c, key) => st => lose(st, key, 1), // Corrupted Cosmo
  },
  // Black Dragon
  'neutral-v6-452': {
    enter: (s, c, key, self) => st => { // Dark Dragon Fist
      const options = () => k.allDevotees(st, c).filter(u => k.hpOf(st, c, u) <= 3);
      if (st.players[key].soul < 2 || !options().length || !k.may(c, key, 'DARK DRAGON FIST', {uid: self, cost: '2 Soul'})) return;
      k.paySoul(st, key, 2);
      if (st.victory) return;
      const t = k.choose(c, key, 'DARK DRAGON FIST', options(), {text: 'Choose target Devotee with 3 or less HP.'});
      if (t) k.defeat(st, c, t);
    },
    killInCombat: (s, c, key) => st => lose(st, key, 1), // Cruel Strength
  },
  // Black Swan
  'neutral-v6-453': {
    enter: (s, c, key) => st => {
      const t = targetEnemy(st, c, key, 'BLACK BLIZZARD', 'Seal target enemy Devotee.'); // Black Blizzard
      if (t) addSeal(st, c, [t], 1, 'BLACK BLIZZARD');
      (st.skipDraw ||= {})[key] = true; // Frozen Sacrifice: lido no drawStep (core.startTurn)
    },
  },
  // Black Andromeda
  'neutral-v6-454': {
    combatDamage: (s, c, key, self, victim) => st => { if (live(st, victim)) putMinus(st, victim); }, // Black Fang Nebula
    watchDefeat: (s, c, key, self, dead, owner) => owner !== key && cursed(s, dead) && (st => { // Bloodthirsty Chains
      lose(st, owner, 1);
      if (!st.victory) k.gainSoul(st, key, 1);
    }),
    declare: (s, c, key) => st => lose(st, key, 1), // Dark Reflection
  },
  // Black Phoenix
  'neutral-v6-455': {
    defeated: (s, c, key, self) => st => { // False Rebirth
      if (ready(st, key) < 3 || st.players[key].hand.length < 2 || !st.players[key].tartarus.includes(self)) return;
      if (!k.may(c, key, 'FALSE REBIRTH', {uid: self, cost: '3 Cosmo, discard 2 cards, 2 Soul'})) return;
      spendBase(st, key, 3);
      k.discard(st, c, key, 2, 'FALSE REBIRTH');
      lose(st, key, 2);
      if (!st.victory) k.putOntoField(st, c, key, self, 'tartarus', {prepared: false});
    },
    declare: (s, c, key) => st => { // Shadow Flame
      for (const foe of foes(st, c, key)) k.damage(st, c, foe, 1);
      hitGod(st, c, key, 1);
    },
  },
  // Jango
  'neutral-v6-456': {
    enter: (s, c, key) => st => { // Death Queen Inferno
      const t = targetAnyDevotee(st, c, key, 'DEATH QUEEN INFERNO');
      if (t) k.damage(st, c, t, 3);
      hitGod(st, c, key, 2);
    },
    aura: (s, c, key, self, unit) => (unit !== self && k.controllerOf(s, unit) === key && black(c, unit) ? {atk: 1, hp: 0} : null), // Tyrant's Command
    endTurn: (s, c, key, self) => mine(s, c, key).some(u => u !== self && black(c, u)) && (st => { // Rule Through Fear
      const others = mine(st, c, key).filter(u => u !== self && black(c, u));
      if (!others.length) return;
      const pick = c.decide?.(key, {ability: 'RULE THROUGH FEAR', options: ['sacrifice', 'lose-soul'], choose: 'mode', text: 'Sacrifice another Black Saint or lose 3 Soul.'});
      const t = pick === 'sacrifice' ? k.choose(c, key, 'RULE THROUGH FEAR', others, {text: 'Choose another Black Saint to sacrifice.'}) : null;
      if (t) k.sacrifice(st, c, t);
      else lose(st, key, 3);
    }),
  },
  // 457–460: cartas genéricas que substituem as Black Saints (autor, 31/10/2026).
  // Sanctuary Sentry (457): só Guardian, que vem de keywords_en.
  // Mercenary Scout
  'neutral-v6-458': {defeated: (s, c, key) => st => draw(st, key, 1)}, // Last Report
  // Stone Colossus
  'neutral-v6-459': {
    declare: (s, c, key, self) => ready(s, key) >= 2 && foes(s, c, key).length > 0 && (st => { // Crushing Impact
      if (!pay(st, c, key, 2, 'CRUSHING IMPACT', self)) return;
      const t = targetEnemy(st, c, key, 'CRUSHING IMPACT');
      if (t) { k.buff(st, t, -2, -2, 'this_round'); k.checkDefeats(st, c); }
    }),
  },
  // War Charger: Impulse vem de keywords_en.
  'neutral-v6-460': {godDamage: (s, c, key) => st => draw(st, key, 1)}, // Trampling Charge

  // ---------- Steel Saints e Scientist ----------
  // Sho, Sky Steel Saint
  'neutral-v6-461': {
    // Sky Defender: Technique inimiga que mira outro Devotee seu; paga 2 e o alvo vira Sho (play.js lê s.v6Redirect na resolução).
    watchSpell: (s, c, key, self, caster, spellUid, targets = []) => {
      const from = caster !== key && isTechnique(c, spellUid) && targets.find(t => t !== self && mine(s, c, key).includes(t));
      return from && ready(s, key) >= 2 && (st => {
        if (k.spellOnChain(st, spellUid) && k.onField(st, key, self) && pay(st, c, key, 2, 'SKY DEFENDER', self)) (st.v6Redirect ||= {})[spellUid] = {from, to: self};
      });
    },
    watchAttach: (s, c, key, self, gear, bearer) => bearer === self && k.controllerOf(s, gear) === key && k.onceTurn(s, `mechanical:${self}`) && // Mechanical Precision
      (st => loot(st, c, key, 'MECHANICAL PRECISION')),
  },
  // Daichi, Land Steel Saint
  'neutral-v6-462': {
    mods: (s, c, key, self) => (k.gearOf(c, self).length ? [{hp: 2}] : []), // Steel Fortress (Guardian: engine)
    watchDeclare: (s, c, key, self, attacker, target) => target.kind === 'devotee' && target.uid === self && k.controllerOf(s, attacker) !== key && ready(s, key) >= 2 && // Earthquake Generator
      (st => { if (live(st, attacker) && pay(st, c, key, 2, 'EARTHQUAKE GENERATOR', self)) k.damage(st, c, attacker, 1); }),
  },
  // Ushio, Marine Steel Saint
  'neutral-v6-463': {
    enter: (s, c, key) => st => loot(st, c, key, 'SONIC WAVE'),
    watchAttach: (s, c, key, self, gear, bearer) => bearer === self && k.controllerOf(s, gear) === key && ready(s, key) >= 1 && (st => { // Resonance Engine
      const small = () => foes(st, c, key).filter(u => k.costOf(c, u) <= 2);
      if (!small().length || !pay(st, c, key, 1, 'RESONANCE ENGINE', self)) return;
      const t = k.choose(c, key, 'RESONANCE ENGINE', small(), {text: 'Return target enemy Devotee with Casting Cost 2 or less.'});
      if (t) k.toHand(st, c, t, 'battlefield', key);
    }),
  },
  // Dr. Asamori
  'neutral-v6-464': {
    costLess: (s, c, key, self, uid) => k.card(c, uid)?.kind === 'Equipment' && {n: 1, min: 1}, // Mechanical Engineering
    activate: {name: 'Steel Innovation', cost: 2, once: true, tap: true,
      run: (s, c, key) => { k.search(s, c, key, 'STEEL INNOVATION', card => card.kind === 'Equipment'); }},
  },
  // Sky Steel Cloth
  'neutral-v6-465': { // Aerial Interception; Steel Synchronization: custa 2 com Steel Saint
    watchSpell: (s, c, key, self, caster, spellUid, targets = []) => {
      const bearer = k.bearerOf(c, self), cost = bearer && steel(c, bearer) ? 2 : 3;
      return caster !== key && isTechnique(c, spellUid) && bearer && targets.includes(bearer) && ready(s, key) >= cost
        && (st => { if (k.spellOnChain(st, spellUid) && pay(st, c, key, cost, 'AERIAL INTERCEPTION', self)) k.counterSpell(st, c, spellUid); });
    },
  },
  // Land Steel Cloth
  'neutral-v6-466': {
    gearPrevent: (s, c, key, self, bearer, amount) => (amount > 0 && k.onceTurn(s, `seismic:${self}`) ? Math.min(1, amount) : 0), // Seismic Resistance
    aura: (s, c, key, self, unit) => (k.bearerOf(c, self) === unit && steel(c, unit) ? {atk: 1, hp: 1} : null), // Steel Synchronization
  },
  // Marine Steel Cloth
  'neutral-v6-467': {
    gearCombatDamage: (s, c, key, self, bearer, victim) => st => { if (live(st, victim)) k.buff(st, victim, -2, 0, 'this_round'); }, // Sonic Disruption
    gearKillInCombat: (s, c, key, self, bearer) => steel(c, bearer) && k.onceTurn(s, `marine-sync:${self}`) && (st => loot(st, c, key, 'STEEL SYNCHRONIZATION')),
  },
  // Steel Saint Recruit
  'neutral-v6-468': {mods: (s, c, key, self) => (k.gearOf(c, self).length ? [{atk: 1, hp: 1}] : [])}, // Mechanical Training
  // Steel Armor Prototype
  'neutral-v6-469': {
    gearDeclare: (s, c, key, self, bearer) => ready(s, key) >= 1 && (st => { // Unstable Mechanism
      if (live(st, bearer) && pay(st, c, key, 1, 'UNSTABLE MECHANISM', self)) k.buff(st, bearer, 1, 0, 'this_round');
    }),
  },
  // Graad Foundation Laboratory
  'neutral-v6-470': {
    activate: {name: 'Research Facility', cost: 2, once: true, tap: false, run: (s, c, key) => loot(s, c, key, 'RESEARCH FACILITY')},
    // Technological Advancement: "first … each turn" = uma vez por Round (§64).
    costLess: (s, c, key, self, uid) => k.card(c, uid)?.kind === 'Equipment' && !s.roundUses.has(`tech:${self}`) && {n: 1, min: 1, tag: `tech:${self}`},
    watchEquipCast: (s, c, key, self, gear) => { // Steel Production: o segundo Equipment conjurado no turno
      const casts = s.events.filter(e => e.type === 'card_played' && e.kind === 'Equipment' && e.player === key && e.turn === s.turn);
      return casts.length >= 2 && casts[1].uid === gear && (st => { steelToken(st, c, key); });
    },
  },

  // ---------- Ghost Saints ----------
  // Geist, Phantom Queen
  'neutral-v6-471': {
    enter: (s, c, key) => st => { // Phantom Illusion
      const t = targetEnemy(st, c, key, 'PHANTOM ILLUSION', "Return target enemy Devotee to its owner's hand.");
      if (t) k.toHand(st, c, t, 'battlefield', key);
    },
    aura: (s, c, key, self, unit) => (unit !== self && k.controllerOf(s, unit) === key && ghost(c, unit) ? {atk: 1, hp: 1} : null), // Ghost Command
    watchSpell: (s, c, key, self, caster, spellUid, targets = []) => caster !== key && isTechnique(c, spellUid) && targets.includes(self) // Deceptive Presence
      && mine(s, c, key).some(u => u !== self) && (st => {
        if (!k.spellOnChain(st, spellUid) || !k.may(c, key, 'DECEPTIVE PRESENCE', {uid: self, cost: 'sacrifice another Devotee'})) return;
        const v = k.choose(c, key, 'DECEPTIVE PRESENCE', mine(st, c, key).filter(u => u !== self), {text: 'Sacrifice another Devotee.'});
        if (v) { k.sacrifice(st, c, v); k.counterSpell(st, c, spellUid); }
      }),
  },
  // Dolphin Ghost Saint
  'neutral-v6-472': {
    enter: (s, c, key, self) => ready(s, key) >= 2 && foes(s, c, key).length > 0 && (st => { // Aquatic Ambush
      if (!pay(st, c, key, 2, 'AQUATIC AMBUSH', self)) return;
      const t = targetEnemy(st, c, key, 'AQUATIC AMBUSH', 'Exhaust target enemy Devotee.');
      if (t) k.exhaust(st, t);
    }),
    godDamage: (s, c, key, self) => st => { // Phantom Retreat
      if (live(st, self) && k.may(c, key, 'PHANTOM RETREAT', {uid: self})) k.toHand(st, c, self, 'battlefield');
    },
  },
  // Sea Serpent Ghost Saint
  'neutral-v6-473': {
    combatDamage: (s, c, key, self, victim) => st => { if (live(st, victim)) putMinus(st, victim); }, // Serpent's Grip
    watchDefeat: (s, c, key, self, dead, owner) => owner !== key && cursed(s, dead) && (st => lose(st, owner, 1)), // Venomous Waters
  },
  // Jellyfish Ghost Saint
  'neutral-v6-474': {
    combatDamage: (s, c, key, self, victim) => st => { if (live(st, victim)) addSeal(st, c, [victim], 1, 'PARALYZING TOUCH'); },
    watchDeclare: (s, c, key, self, attacker, target) => target.kind === 'devotee' && target.uid === self && k.controllerOf(s, attacker) !== key && // Toxic Defense
      (st => { if (live(st, attacker)) { k.buff(st, attacker, -1, -1, 'this_round'); k.checkDefeats(st, c); } }),
  },
  // Phantom Sea Ambush (Moment)
  'neutral-v6-475': {spell: {run: (s, c, key) => {
    const own = targetOwn(s, c, key, 'SPECTRAL ASSAULT', "Return target Devotee you control to its owner's hand.");
    if (own) k.toHand(s, c, own, 'battlefield');
    const foe = targetEnemy(s, c, key, 'SPECTRAL ASSAULT', "Return target enemy Devotee to its owner's hand.");
    if (foe) k.toHand(s, c, foe, 'battlefield', key);
    if (mine(s, c, key).some(u => ghost(c, u))) loot(s, c, key, 'GHOST TACTICS'); // avaliado depois dos retornos
  }}},

  // ---------- Spells, Equipment e Devotees gerais ----------
  // Cosmo Disruption (autor, 30/10/2026): Moment 3; custo adicional: descartar 1 carta. O alvo é a Spell na cadeia, escolhida na resolução.
  'neutral-v6-476': {spell: {
    check: (s, c, key) => {
      if (!s.chain.some(i => i.spell)) throw new k.RuleError('alvo', 'COSMO INTERRUPTION: não há Moment ou Technique na cadeia');
      if (s.players[key].hand.length < 2) throw new k.RuleError('custo', 'COSMO INTERRUPTION: precisa descartar 1 carta');
    },
    cost: (s, c, key) => k.discard(s, c, key, 1, 'COSMO INTERRUPTION'),
    run: (s, c, key, self) => {
      const t = targetSpellOnChain(s, c, key, 'COSMO INTERRUPTION', self);
      if (t) k.counterSpell(s, c, t);
      lose(s, key, 2); // Energy Backlash
    },
  }},
  // Desperate Resurrection
  'neutral-v6-477': {spell: {run: (s, c, key) => {
    const [t] = targetTartarusDevotees(s, c, key, 'FORBIDDEN RETURN', 1);
    if (t) k.putOntoField(s, c, key, t, 'tartarus', {prepared: false});
    lose(s, key, 3); // Soul Sacrifice
  }}},
  // Universal Cosmo Crystal: dois modos em `choice.mode`: 'amplify' ({T}, uma vez por Round) e 'overload' (sacrifício, só no seu turno).
  'neutral-v6-478': {
    activate: {name: 'Cosmo Crystal', cost: 0, once: false, tap: false,
      check: (s, c, key, self, choice) => { modeOf(choice, [!s.roundUses.has(`crystal:${self}`) && 'amplify', 'overload'].filter(Boolean), 'COSMO CRYSTAL'); },
      run: (s, c, key, self, choice) => {
        const mode = modeOf(choice, [!s.roundUses.has(`crystal:${self}`) && 'amplify', 'overload'].filter(Boolean), 'COSMO CRYSTAL');
        if (mode === 'amplify') { k.once(s, `crystal:${self}`); k.gainLatent(s, key, 1); } // Cosmo Amplification
        else { k.toTartarus(s, c, self, 'battlefield'); k.gainLatent(s, key, 2); } // Crystal Overload
      }},
  },
  // Forbidden Knowledge (Moment)
  'neutral-v6-479': {spell: {run: (s, c, key) => {
    draw(s, key, 3);
    if (s.victory) return;
    k.discard(s, c, key, 1, 'PRICE OF KNOWLEDGE');
    lose(s, key, 2);
  }}},
  // Divine Judgment
  'neutral-v6-480': {spell: {run: (s, c, key) => {
    const t = targetAnyDevotee(s, c, key, 'ABSOLUTE JUDGMENT');
    if (t) k.defeat(s, c, t);
    const own = targetOwn(s, c, key, 'COSMIC CONSEQUENCE', 'Sacrifice a Devotee you control.');
    if (own) k.sacrifice(s, c, own);
    else lose(s, key, 4);
  }}},
  // Crystal Saint (Frozen Discipline: hooks.sealed no topo do arquivo)
  'neutral-v6-481': {
    enter: (s, c, key, self) => ready(s, key) >= 2 && foes(s, c, key).length > 0 && (st => { // Freezing Coffin
      if (!pay(st, c, key, 2, 'FREEZING COFFIN', self)) return;
      const t = targetEnemy(st, c, key, 'FREEZING COFFIN', 'Seal target enemy Devotee.');
      if (t) addSeal(st, c, [t], 1, 'FREEZING COFFIN');
    }),
  },
  // Ohko, the Fallen Dragon
  'neutral-v6-482': {
    mustStrike: true, // Uncontrolled Rage (actions.js recusa o END TURN)
    declare: (s, c, key, self) => st => { // Tiger's Fury + Broken Discipline
      if (live(st, self)) k.buff(st, self, 2, 0, 'this_round');
      hitGod(st, c, key, 1);
    },
  },
  // Leda, Chain Warrior
  // pendente: "attacks alongside another Devotee" lido como "outro Devotee seu já declarou Strike neste turno" (Strikes são um de cada vez).
  'neutral-v6-483': {
    declare: (s, c, key, self) => mine(s, c, key).some(u => u !== self && s.strikes.get(u) === s.turn) && (st => { if (live(st, self)) k.buff(st, self, 1, 1, 'this_round'); }), // Twin Chains
    mods: (s, c, key) => (controls(s, c, key, SPICA) ? [{keywords: ['Guardian']}] : []), // Chain Coordination
  },
  // Spica, Chain Warrior
  'neutral-v6-484': {
    enter: (s, c, key, self) => ready(s, key) >= 2 && foes(s, c, key).length > 0 && (st => { // Binding Chains
      if (!pay(st, c, key, 2, 'BINDING CHAINS', self)) return;
      const t = targetEnemy(st, c, key, 'BINDING CHAINS', 'Exhaust target enemy Devotee.');
      if (t) k.exhaust(st, t);
    }),
    declare: (s, c, key) => controls(s, c, key, LEDA) && foes(s, c, key).length > 0 && (st => { // Twin Assault
      const t = targetEnemy(st, c, key, 'TWIN ASSAULT');
      if (t) k.buff(st, t, -2, 0, 'this_round');
    }),
  },
  // Shiva, Peacock Saint
  'neutral-v6-485': {
    enter: (s, c, key, self) => ready(s, key) >= 2 && foes(s, c, key).length > 0 && (st => { // Thousand Feather Strike
      if (pay(st, c, key, 2, 'THOUSAND FEATHER STRIKE', self)) distribute(st, c, key, 'THOUSAND FEATHER STRIKE', 2);
    }),
    watchSpell: (s, c, key, self, caster, spellUid) => caster === key && isTechnique(c, spellUid) && (st => { if (live(st, self)) k.buff(st, self, 1, 0, 'this_round'); }), // Mystic Meditation
  },
  // Agora, Lotus Saint
  'neutral-v6-486': {
    watchSpell: (s, c, key, self, caster, spellUid, targets = []) => { // Lotus Meditation: primeira Technique do turno
      // Spiritual Barrier: Technique inimiga que mira Agora — quem conjurou paga {2} a mais ou ela é contrariada.
      if (caster !== key && isTechnique(c, spellUid) && targets.includes(self)) return st => {
        if (!k.spellOnChain(st, spellUid)) return;
        if (!pay(st, c, caster, 2, 'SPIRITUAL BARRIER', self)) k.counterSpell(st, c, spellUid);
      };
      if (caster !== key || !isTechnique(c, spellUid) || ready(s, key) < 2) return;
      const first = s.events.find(e => e.type === 'card_played' && e.kind === 'Spell' && e.player === key && e.turn === s.turn && isTechnique(c, e.uid));
      return first?.uid === spellUid && (st => { if (pay(st, c, key, 2, 'LOTUS MEDITATION', self)) draw(st, key, 1); });
    },
  },
  // Arachne, Tarantula Saint
  // pendente: Venomous Trap só vê derrotas por dano (watchWouldBeDefeated grava se estava Exhausted); derrota direta por efeito não conta.
  'neutral-v6-487': {
    enter: (s, c, key) => st => { // Spider Web
      const t = targetEnemy(st, c, key, 'SPIDER WEB', 'Exhaust target enemy Devotee.');
      if (t) k.exhaust(st, t);
    },
    watchWouldBeDefeated: (s, c, key, self, victim) => { (s.v6WasExh ||= {})[victim] = s.units[victim]?.prepared === false; return false; },
    watchDefeat: (s, c, key, self, dead, owner) => owner !== key && s.v6WasExh?.[dead] && k.onceTurn(s, `trap:${self}`) &&
      (st => loot(st, c, key, 'VENOMOUS TRAP')),
  },
  // Gigas, Sanctuary Commander
  'neutral-v6-488': {
    enter: (s, c, key) => st => { soldierToken(st, c, key); }, // Sanctuary Orders
    activate: {name: 'Political Manipulation', cost: 3, once: true, tap: false, // custo: 3 Cosmo e sacrificar outro Devotee
      check: (s, c, key, self) => { if (!mine(s, c, key).some(u => u !== self)) throw new k.RuleError('alvo', 'sem outro Devotee seu para sacrificar'); },
      run: (s, c, key, self) => {
        const t = k.choose(c, key, 'POLITICAL MANIPULATION', mine(s, c, key).filter(u => u !== self), {text: 'Sacrifice another Devotee you control.'});
        if (!t) return;
        k.sacrifice(s, c, t);
        draw(s, key, 2);
      }},
  },
  // Phaeton, Sanctuary Officer
  'neutral-v6-489': {
    aura: (s, c, key, self, unit) => (unit !== self && k.controllerOf(s, unit) === key && soldier(c, unit) ? {atk: 1, hp: 0} : null), // Military Orders
    enter: (s, c, key, self) => ready(s, key) >= 2 && (st => { if (pay(st, c, key, 2, 'REINFORCEMENTS', self)) soldierToken(st, c, key); }),
  },
  // Sanctuary Mercenary
  'neutral-v6-490': {
    startTurn: (s, c, key, self) => st => { // Paid Loyalty
      if (live(st, self) && !pay(st, c, key, 1, 'PAID LOYALTY', self)) forbidStrike(st, self, 'this_round');
    },
  },
  // Cloth Repair Tools: dois modos em `choice.mode`: 'repair' ({2} + {T}, uma vez por Round) e 'salvage' (sacrifício).
  'neutral-v6-491': {
    activate: (() => {
      const legal = (s, c, key, self) => [!s.roundUses.has(`repair:${self}`) && ready(s, key) >= 2 && mine(s, c, key).concat(foes(s, c, key)).length > 0 && 'repair',
        s.players[key].tartarus.some(u => c.objects[u].owner === key && k.card(c, u)?.kind === 'Equipment') && 'salvage'].filter(Boolean);
      return {name: 'Cloth Repair Tools', cost: 0, once: false, tap: false,
        check: (s, c, key, self, choice) => { modeOf(choice, legal(s, c, key, self), 'CLOTH REPAIR TOOLS'); },
        run: (s, c, key, self, choice) => {
          if (modeOf(choice, legal(s, c, key, self), 'CLOTH REPAIR TOOLS') === 'repair') { // Emergency Repairs
            k.once(s, `repair:${self}`);
            spendBase(s, key, 2);
            const t = targetAnyDevotee(s, c, key, 'EMERGENCY REPAIRS', 'Remove up to 2 damage from target Devotee.');
            if (t) k.removeDamage(s, t, 2);
            return;
          }
          k.toTartarus(s, c, self, 'battlefield'); // Sacred Maintenance: o sacrifício é custo; depois escolhe o alvo
          const gear = s.players[key].tartarus.filter(u => c.objects[u].owner === key && k.card(c, u)?.kind === 'Equipment');
          const t = k.choose(c, key, 'SACRED MAINTENANCE', gear, {text: 'Return target Equipment card from your Tartarus to your hand.'});
          if (t) k.toHand(s, c, t, 'tartarus');
        }};
    })(),
  },
  // Death Queen Mask
  // Forbidden Power (autor, 30/10/2026): o dono do Devotee derrotado perde 2 Soul.
  'neutral-v6-492': {
    gearKillInCombat: (s, c, key, self, bearer, victim) => st => lose(st, c.objects[victim].owner, 2),
    gearWouldBeDefeated: (s, c, key, self, bearer) => { // Corrupted Protection
      if (!k.may(c, key, 'CORRUPTED PROTECTION', {uid: bearer, text: 'Sacrifice Death Queen Mask to prevent that defeat?'})) return false;
      k.toTartarus(s, c, self, 'battlefield');
      if (s.units[bearer]) k.removeDamage(s, bearer);
      return true;
    },
  },
  // Cosmo Converter
  // pendente: Overloaded Circuits ("does not ready during your next ready step"): Equipment usa {T} uma vez por Round; aproximado como
  // "não pode ser usado no seu próximo turno" (registro em s.v6Converter com o nº do turno próprio).
  'neutral-v6-493': {
    activate: {name: 'Energy Conversion', cost: 0, once: true, tap: false,
      check: (s, c, key, self) => {
        if (s.players[key].soul < 1) throw new k.RuleError('custo', 'sem Soul para pagar');
        const at = s.v6Converter?.[self];
        if (at != null && s.players[key].ownTurns < at + 2) throw new k.RuleError('Overloaded Circuits', 'não readied no próximo ready step');
      },
      run: (s, c, key, self) => {
        k.paySoul(s, key, 1);
        if (s.victory) return;
        k.gainLatent(s, key, 2);
        (s.v6Converter ||= {})[self] = s.players[key].ownTurns;
      }},
  },
  // Sanctuary Supply Chest
  'neutral-v6-494': {
    cast: (s, c, key) => st => loot(st, c, key, 'EMERGENCY SUPPLIES'),
    activate: {name: 'Last Reserves', cost: 3, once: false, tap: false, // custo: 3 Cosmo e sacrificar o Chest
      run: (s, c, key, self) => { k.toTartarus(s, c, self, 'battlefield'); draw(s, key, 2); }},
  },
  // Forced Exile
  'neutral-v6-495': {spell: {run: (s, c, key) => {
    const t = targetAnyDevotee(s, c, key, 'DIMENSIONAL BANISHMENT', 'Send target Devotee to the Void.');
    if (t) k.exile(s, c, t);
    const own = targetOwn(s, c, key, 'COSMIC INSTABILITY', "Return a Devotee you control to its owner's hand.");
    if (own) k.toHand(s, c, own, 'battlefield');
  }}},
  // Cosmo Extraction
  // pendente: o texto não diz se a Base entra Prepared; entra Unprepared (padrão de k.topToBase).
  'neutral-v6-496': {spell: {run: (s, c, key) => {
    k.topToBase(s, key, false);
    lose(s, key, 2);
    if (!s.victory) k.discard(s, c, key, 1, 'ENERGY DEBT');
  }}},
  // Last Moment Defense
  'neutral-v6-497': {spell: {run: (s, c, key) => {
    const t = targetAnyDevotee(s, c, key, 'DESPERATE PROTECTION');
    if (!t) return;
    shield(s, t, Infinity, {duration: 'this_round'}); // dano de combate = dano de Strike
    k.exhaust(s, t); // Exhaustion: não prepara no próximo Prepare do controlador (skipPrepare, core.js startTurn)
    s.units[t].skipPrepare = true;
  }}},
  // The Battle of Death Queen Island (Moment)
  'neutral-v6-498': {spell: {run: (s, c, key) => {
    for (const pk of [key, k.other(s, key)]) { // Dark Tournament: quem conjura primeiro
      const t = targetOwn(s, c, pk, 'DARK TOURNAMENT', 'Sacrifice a Devotee you control.');
      if (t) k.sacrifice(s, c, t);
    }
    if (mine(s, c, key).some(u => black(c, u))) { draw(s, key, 2); if (!s.victory) k.discard(s, c, key, 1, 'SURVIVAL OF THE CRUELEST'); }
  }}},
  // Humanity's Defiance (Moment)
  'neutral-v6-499': {spell: {run: (s, c, key, self) => {
    for (const u of mine(s, c, key)) k.buff(s, u, 2, 2, 'this_round', ['Pierce']); // Beyond Divine Power + Unbreakable Resolve
    (s.v6EndSac ||= []).push({key, uid: self}); // Ultimate Sacrifice: no próximo end step
  }}},
  // The Eighth Sense (Moment)
  'neutral-v6-500': {spell: {run: (s, c, key) => {
    for (const t of targetTartarusDevotees(s, c, key, 'ARAYASHIKI', 2)) {
      if (k.putOntoField(s, c, key, t, 'tartarus', {prepared: false})) immortal(s, c, t); // Transcend Mortality
    }
    lose(s, key, 5); // The Price of Awakening
  }}},
};
