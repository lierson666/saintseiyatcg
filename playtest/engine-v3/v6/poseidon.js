// Efeitos V6 de poseidon, por id de carta (contrato em ./registry.js; kit em ./kit.js).
// Cláusulas sem base na engine ficam como `// pendente:`; interpretações vão para docs/v6-efeitos-pendencias.md.
import * as k from './kit.js';
import {hooks, spendBase, addSeal} from '../core.js';
import {shield, silence} from '../effects.js';
import {collect} from './registry.js';

// ---------- leitura ----------
const name = (c, uid) => k.card(c, uid)?.name || '';
const KANON = /Kanon/i, SORRENTO = /Sorrento/i, BAIAN = /Baian/i, ISAAC = /Isaac/i, HYOGA = /Hyoga/i, THETIS = /Thetis/i;
const controls = (s, c, key, re) => k.devotees(s, c, key).some(u => re.test(name(c, u)));
const isMarina = (c, uid) => !k.isGod(uid) && k.isDevotee(c, uid) && k.hasType(c, uid, 'Marina'); // alvo 'god:X' não tem objeto
const isGeneral = (c, uid) => k.isDevotee(c, uid) && k.hasType(c, uid, 'Marina General');
const isScale = (c, uid) => /Scale/.test(k.card(c, uid)?.type || '');
const generals = (s, c, key) => k.devotees(s, c, key).filter(u => isGeneral(c, u)).length;
const sealed = (s, uid) => (s.units[uid]?.seal || 0) > 0;
const poseidon = (s, key) => s.divine?.[key]?.god === 'god-poseidon';
const awakened = (s, key) => poseidon(s, key) && !!s.divine[key].awaken;
const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
// Resonance de Equipment só vale equipado no Devotee nomeado (autor, 28/10/2026).
const wears = (c, gear, re) => { const b = k.bearerOf(c, gear); return b && re.test(name(c, b)) ? b : null; };
const opponents = (s, key) => s.order.filter(p => p !== key);

// ---------- ações ----------
// "You may pay {N}{C}": Bases preparadas, como as habilidades ativadas (autor, 28/10/2026). Só pergunta se dá para pagar.
function pay(st, c, key, n, ability, uid) {
  if (ready(st, key) < n || !k.may(c, key, ability, {uid, cost: `${n} Cosmo`})) return false;
  if (n) spendBase(st, key, n);
  return true;
}
// "Cast a Moment or Technique" (gancho watchSpell): Event e Miracle jogam como Technique (guia §54).
const castMT = (c, spellUid) => /Moment|Technique|Event|Miracle/.test(k.card(c, spellUid)?.type || '');
// Observador "once each round, when you cast a Moment or Technique, you may pay {n}{C}. If you do, <run>". O uso do Round é
// marcado no evento (convenção deste arquivo); só devolve gatilho (e portanto abre a janela da Spell) quando vale.
const onCast = (tag, ability, cost, run) => (s, c, key, self, caster, spellUid) => caster === key && castMT(c, spellUid) &&
  !s.roundUses.has(`${tag}:${self}`) && ready(s, key) >= cost && k.once(s, `${tag}:${self}`) && (st => {
    if (pay(st, c, key, cost, ability, self)) run(st, c, key, self);
  });
// Remove 1 Seal (Frozen Brotherhood): o contador sai sem passar por Prepare.
const unseal = (st, uid) => { const u = st.units[uid]; if (u?.seal) { u.seal--; k.emit(st, 'seal_removed', {uid, counters: u.seal}); } };
const loot = (st, c, key, ability) => { k.draw(st, key, 1); k.discard(st, c, key, 1, ability); };
const mayLoot = (st, c, key, ability) => { if (k.may(c, key, ability, {text: 'Draw a card, then discard a card?'})) loot(st, c, key, ability); };
// "Look at the top card of your deck. You may put that card on the bottom of your deck."
function scry(st, c, key, ability) {
  const deck = st.players[key].deck;
  if (deck.length && k.may(c, key, ability, {uid: deck[0], text: 'Put the top card of your deck on the bottom?'})) deck.push(deck.shift());
}
// Põe `n` cartas de `from` (mão ou cartas olhadas) no topo do deck, uma a uma: a primeira escolhida fica por cima,
// como "in any order". Sem escolha (ou recusa), vai a primeira da lista.
function putBack(st, c, key, from, n, ability, text) {
  const deck = st.players[key].deck, chosen = [];
  for (let i = 0; i < n && from.length; i++) {
    const pick = (from.length > 1 && k.choose(c, key, ability, from, {text})) || from[0];
    from.splice(from.indexOf(pick), 1);
    chosen.push(pick);
  }
  deck.unshift(...chosen);
}
// Embaralha o deck com sorteio determinístico pelo estado (a decisão é refeita do snapshot e precisa dar o mesmo deck).
function shuffleDeck(st, key) {
  const deck = st.players[key].deck;
  let seed = (st.events.length * 2654435761 + st.turn * 40503 + deck.length) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  k.emit(st, 'shuffle', {player: key});
}
// "Look at the top N … put one into your hand … the rest on the bottom".
// shortcut: o resto vai ao fundo na ordem atual, sem perguntar a ordem; perguntar quando a UI tiver escolha de ordem.
function lookTop(st, c, key, n, ability, {filter = () => true, optional = false} = {}) {
  const deck = st.players[key].deck, look = deck.slice(0, n);
  const pick = k.choose(c, key, ability, look.filter(filter), {optional, text: 'Choose a card to put into your hand.'});
  deck.splice(0, look.length);
  if (pick) { st.players[key].hand.push(pick); k.emit(st, 'revealed', {player: key, uid: pick}); }
  deck.push(...look.filter(u => u !== pick));
  return pick;
}
// Mill de carta Poseidon avisa "whenever an opponent mills" (watchMill).
// shortcut: Mill de outras fontes (God Poseidon, outras facções) não avisa; precisa de gancho na engine.
function mill(st, c, player, n) {
  const moved = k.mill(st, player, n);
  if (moved > 0) k.watchers(st, c, 'watchMill', [player, moved], 'mills');
  return moved;
}
// Devolve à mão do Owner e avisa watchBounce. Marcadores Seal somem com o objeto: `hadSeal` é lido antes.
// shortcut: retorno à mão por outras fontes (Great Flood, outras facções) não avisa watchBounce.
function bounce(st, c, by, uid) {
  const ctrl = uid && k.controllerOf(st, uid), hadSeal = sealed(st, uid);
  if (!ctrl || !k.toHand(st, c, uid, 'battlefield', by)) return null;
  k.watchers(st, c, 'watchBounce', [uid, ctrl, by], 'returned to hand');
  return {uid, ctrl, hadSeal};
}
const seal = (st, c, uids, n, source) => addSeal(st, c, uids.filter(u => u && st.units[u]), n, source);
const enemy = (st, c, key, ability, text = 'Choose target enemy Devotee.', filter = () => true) =>
  k.choose(c, key, ability, k.enemies(st, c, key).filter(filter), {text});
const enemies = (st, c, key, ability, n, text = 'Choose target enemy Devotees.') => k.chooseUpTo(c, key, ability, k.enemies(st, c, key), n, {text});
const debuff = (st, uid, n, duration = 'this_round') => { if (uid && st.units[uid]) k.buff(st, uid, -n, 0, duration); };
// "Choose one": pergunta entre os modos implementados (um só: sem pergunta).
const mode = (c, key, ability, list) => (list.length === 1 ? list[0] : list.length ? c.decide?.(key, {ability, options: list, choose: 'mode', text: 'Choose one.'}) ?? null : null);
// "Target player" (self-mill do Reanimator, 31/10/2026): pergunta 'self' ou 'opponent'; sem resposta, o oponente.
const targetPlayer = (st, c, key, ability) => (mode(c, key, ability, ['opponent', 'self']) === 'self' ? key : k.other(st, key));
const needEnemy = (s, c, key, filter = () => true) => { if (!k.enemies(s, c, key).some(filter)) throw new k.RuleError('alvo', 'sem Devotee inimigo válido'); };

// ---------- contra-mágica (alvos de Spell escolhidos ao conjurar: guia §54) ----------
// "Enemy Moment or Technique" na cadeia (Event e Miracle contam como Technique, §54). `only(item)` filtra os itens
// (ex.: "that targets your God or a friendly Devotee", lido nos alvos que a Spell guardou ao ser conjurada).
const counterable = (s, c, key, only = () => true) => s.chain.filter(i => i.spell && i.controller !== key && castMT(c, i.uid) && only(i)).map(i => i.uid);
const aimsAtMe = (s, c, key) => item => k.targetsMine(s, c, key, k.itemTargets(item));
const needCounter = only => (s, c, key) => { if (!counterable(s, c, key, only?.(s, c, key)).length) throw new k.RuleError('alvo', 'sem Moment ou Technique inimigo na cadeia'); };
const counterTarget = (c, s, key, ability, only) => k.choose(c, key, ability, counterable(s, c, key, only), {text: 'Choose target enemy Moment or Technique.'});
// Contra-mágica; `unless` > 0: "unless its controller pays {N}{C}" (o controlador responde na hora). Devolve true se anulou.
function counter(st, c, uid, ability, unless = 0) {
  const item = st.chain.find(i => i.spell && i.uid === uid);
  if (!item) return false; // alvo já resolveu ou saiu da cadeia: a parte que dependia dele não acontece
  if (unless && ready(st, item.controller) >= unless && k.may(c, item.controller, ability, {cost: `${unless} Cosmo`, text: `Pay {${unless}}{C} to keep your Spell from being countered?`})) { spendBase(st, item.controller, unless); return false; }
  return k.counterSpell(st, c, uid);
}

// Counter por alcance (autor, 31/10/2026): tudo vai à pilha (§56), então o counter cancela a jogada inimiga do tipo que
// a carta nomeia. Habilidade cancelada sai da cadeia sem efeito; a fonte fica no campo.
const DEVOTEE_ON_STACK = c => i => !!i.card && k.card(c, i.uid)?.kind === 'Devotee';
const EQUIPMENT_ON_STACK = c => i => !!i.card && k.card(c, i.uid)?.kind === 'Equipment';
const ANY_ON_STACK = () => i => !!(i.spell || i.card || i.ability);
const onStack = (s, c, key, only) => s.chain.filter(i => i.controller !== key && only(i));
const needOnStack = (only, what) => (s, c, key) => { if (!onStack(s, c, key, only(c)).length) throw new k.RuleError('alvo', `sem ${what} inimigo na pilha`); };
function cancelOnStack(st, c, key, ability, only, text) {
  const items = onStack(st, c, key, only(c));
  const uid = k.choose(c, key, ability, [...new Set(items.map(i => i.uid))], {text});
  const item = uid && items.find(i => i.uid === uid);
  if (!item) return false;
  if (!item.ability) return k.counterSpell(st, c, uid);
  st.chain.splice(st.chain.indexOf(item), 1);
  k.emit(st, 'ability_countered', {player: item.controller, uid, ability: item.ability});
  return true;
}

// ---------- gancho "becomes Sealed" ----------
// core.addSeal chama hooks.sealed com as transições 0 → ≥1 (D211); cartas V6 observam por `watchSealed(s, c, key, self, transitions)`.
// shortcut: registrado aqui por falta do gancho em v6/hooks.js; mover para lá quando existir.
hooks.sealed.push((state, ctx, transitions) => collect(state, ctx, state.order, 'watchSealed', [transitions], 'an enemy Devotee becomes Sealed'));
const enemySealed = (key, transitions) => transitions.filter(t => t.controller && t.controller !== key);

// "Once each round, when an enemy Devotee becomes Sealed, you may …": uso gasto só quando a opção é aceita (run ≠ false).
const onSealed = (tagName, run) => (s, c, key, self, transitions) => {
  const hit = enemySealed(key, transitions)[0], tag = `${tagName}:${self}`;
  if (!hit || s.roundUses.has(tag)) return;
  return st => { if (!st.roundUses.has(tag) && run(st, c, key, self, hit.uid, hit.controller) !== false) k.once(st, tag); };
};

// ---------- prevenção de dano de Strike ----------
// "When X would take Strike damage, prevent N": não há gancho "would take damage". O escudo nasce na declaração do Strike em
// que X é atacante ou defensor e vale só nesse Strike ('this_strike'). Uso do Round gasto na declaração (obrigatória) ou no
// pagamento (opcional). shortcut: Strike anulado deixa o escudo 'this_strike' até o próximo Strike que limpe.
const inStrike = (attacker, target) => [attacker, target.kind === 'devotee' ? target.uid : null].filter(Boolean);
function ward({unit, amount = () => 1, ability, cost = null, after}) {
  return (s, c, key, self, attacker, target) => {
    const uid = unit(s, c, key, self, attacker, target), tag = `ward:${self}`;
    if (!uid || !inStrike(attacker, target).includes(uid) || s.roundUses.has(tag)) return;
    if (cost == null) k.once(s, tag);
    return st => {
      if (!st.units[uid]) return;
      if (cost != null && (st.roundUses.has(tag) || !pay(st, c, key, cost, ability, uid))) return;
      if (cost != null) k.once(st, tag);
      shield(st, uid, amount(st, c, key, self, uid), {duration: 'this_strike'});
      after?.(st, c, key, self, uid, attacker);
    };
  };
}
const bearerWard = opts => ward({unit: (s, c, key, self) => k.bearerOf(c, self), ...opts});
const selfWard = opts => ward({unit: (s, c, key, self) => self, ...opts});
// Mermaid Scale (100), Resonance: Thetis preveniu com Ocean's Blessing ou Devotion to Poseidon → pode comprar e descartar, 1×/Round.
function thetisResonance(st, c, key, thetis) {
  const scale = k.gearOf(c, thetis).find(g => k.id(c, g) === 'poseidon-v6-100');
  if (scale && k.once(st, `resonance:${scale}`)) mayLoot(st, c, key, 'RESONANCE — MERMAID THETIS');
}

// "+N/-N ATK during that Strike": duração 'this_strike'.
const strikeBuff = (st, uid, n) => { if (n && st.units[uid]) k.buff(st, uid, n, 0, 'this_strike'); };

export default {
  // Spells baratas da color pie (autor, 31/10/2026: docs/spells-baratas-proposta.md).
  'poseidon-v6-508': {spell: {run: (s, c, key) => { bounce(s, c, key, enemy(s, c, key, 'UNDERTOW', 'Choose target enemy Devotee with cost 2 or less.', u => k.costOf(c, u) <= 2)); }}},
  'poseidon-v6-509': {spell: {check: needCounter(), run: (s, c, key) => { const t = counterTarget(c, s, key, 'TIDAL VETO'); if (t) counter(s, c, t, 'TIDAL VETO', 1); }}},
  'poseidon-v6-510': {spell: {run: (s, c, key) => { // Mist of the Deep
    bounce(s, c, key, k.choose(c, key, 'MIST OF THE DEEP', k.devotees(s, c, key), {text: 'Choose target friendly Devotee.'}));
    k.draw(s, key, 1);
  }}},
  // The Tidal Archive (rebalanceamento dos Domains, 31/10/2026): Drowned Knowledge olha o topo; a compra fica na Once per game.
  'poseidon-v6-502': {
    watchSealed: (s, c, key, self, transitions) => enemySealed(key, transitions).length > 0 && k.once(s, `${self}:drowned`)
      && (st => scry(st, c, key, 'DROWNED KNOWLEDGE')),
    opg: {name: 'TIDAL RECALL', cost: 2, run: (s, c, key) => { k.draw(s, key, 2); if (!s.victory) mill(s, c, key, 2); }},
  },
  // Sea Dragon Kanon
  'poseidon-v6-091': {
    enter: (s, c, key) => st => {
      const t = k.choose(c, key, 'SEA DRAGON KANON', k.allDevotees(st, c), {text: 'Return target Devotee to its owner\'s hand.'});
      if (t) bounce(st, c, key, t);
    },
    activate: {name: 'Golden Triangle', cost: 2, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key) => { const r = bounce(s, c, key, enemy(s, c, key, 'GOLDEN TRIANGLE')); if (r?.hadSeal) mill(s, c, r.ctrl, 2); }},
    combatDamage: (s, c, key, self, victim) => {
      const shadow = `shadow:${self}`;
      if (s.roundUses.has(shadow)) return;
      return st => {
        if (st.roundUses.has(shadow)) return;
        const t = k.choose(c, key, 'EMPEROR\'S SHADOW', k.enemies(st, c, key).filter(u => u !== victim), {optional: true, text: 'Put 1 Seal counter on another target enemy Devotee?'});
        if (t) { k.once(st, shadow); seal(st, c, [t], 1, 'EMPEROR\'S SHADOW'); }
      };
    },
  },
  // Sea Dragon Scale. {T} de Equipment = uma vez por Round (Equipment não tem Prepared na engine).
  'poseidon-v6-092': {
    activate: {name: 'Golden Triangle', cost: 3, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key, self) => {
        bounce(s, c, key, enemy(s, c, key, 'GOLDEN TRIANGLE'));
        if (!wears(c, self, KANON)) return;
        const t = k.choose(c, key, 'RESONANCE — SEA DRAGON KANON', k.enemies(s, c, key), {optional: true, text: 'Put 1 Seal counter on another target enemy Devotee?'});
        if (t) seal(s, c, [t], 1, 'RESONANCE — SEA DRAGON KANON');
      }},
  },
  // Siren Sorrento
  'poseidon-v6-093': {
    declare: (s, c, key, self, target) => {
      if (target.kind !== 'devotee' || !k.once(s, `symphony:${self}`)) return;
      return st => strikeBuff(st, target.uid, -2);
    },
    // Poseidon → Azul (31/10/2026): o discard virou mill.
    godDamage: (s, c, key, self, player) => st => { mill(st, c, player, 2); },
  },
  'poseidon-v6-094': {
    gearDeclare: (s, c, key, self, bearer, target) => {
      if (target.kind !== 'devotee' || !k.once(s, `melody:${self}`)) return;
      return st => strikeBuff(st, target.uid, -1);
    },
    gearGodDamage: (s, c, key, self, bearer, player) => (SORRENTO.test(name(c, bearer)) ? st => { mill(st, c, player, 2); } : undefined),
  },
  // Seahorse Baian (Long Range ainda é NotSpecified no Strike da engine 3.0).
  'poseidon-v6-095': {
    declare: (s, c, key, self, target) => {
      if (target.kind !== 'devotee' || !k.once(s, `god-breath:${self}`)) return;
      return st => strikeBuff(st, target.uid, -1);
    },
    combatDamage: (s, c, key, self, victim) => st => {
      if (st.units[victim] && pay(st, c, key, 2, 'RISING BILLOWS', victim)) bounce(st, c, key, victim);
    },
  },
  'poseidon-v6-096': {
    watchDeclare: bearerWard({amount: () => 2, ability: 'WALL OF AIR',
      // Resonance — Seahorse Baian: "attacking Devotee" = Baian defendendo; conta como prevenção se o atacante tem ATK > 0.
      after: (st, c, key, self, uid, attacker) => {
        if (attacker === uid || !BAIAN.test(name(c, uid)) || k.atkOf(st, c, attacker) <= 0) return;
        if (pay(st, c, key, 1, 'RESONANCE — SEAHORSE BAIAN', attacker)) seal(st, c, [attacker], 1, 'RESONANCE — SEAHORSE BAIAN');
      }}),
  },
  // Kraken Isaac
  'poseidon-v6-097': {
    combatDamage: (s, c, key, self, victim) => {
      if (!k.once(s, `aurora:${self}`)) return;
      return st => seal(st, c, [victim], 1, 'AURORA BOREALIS');
    },
    declare: (s, c, key, self, target) => {
      const t = target.uid;
      if (!t) return;
      const frozen = sealed(s, t), brother = HYOGA.test(name(c, t));
      if (!frozen && !brother) return;
      return st => {
        strikeBuff(st, self, (frozen ? 2 : 0) + (brother ? 2 : 0));
        if (brother) strikeBuff(st, t, 2);
      };
    },
    // Frozen Brotherhood (cláusula final, ganchos survive/defeated): Strike contra Hyoga em que algum dos dois sobrevive tira
    // 1 Seal de cada sobrevivente. Isaac sobrevive: ele e Hyoga (se ainda em campo); Isaac cai e Hyoga sobrevive: só Hyoga.
    survive: (s, c, key, self, role, foe) => role === 'attacker' && !!foe && HYOGA.test(name(c, foe)) && (st => { unseal(st, self); unseal(st, foe); }),
    defeated: (s, c, key, self) => {
      const last = s.events.findLast(e => e.type === 'strike_resolve' && e.attacker === self);
      const foe = last?.target?.uid;
      return !!foe && last.turn === s.turn && HYOGA.test(name(c, foe)) && k.controllerOf(s, foe) && (st => unseal(st, foe));
    },
  },
  'poseidon-v6-098': {
    activate: {name: 'Aurora Borealis', cost: 2, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key) => seal(s, c, [enemy(s, c, key, 'AURORA BOREALIS')], 1, 'AURORA BOREALIS')},
    gearDeclare: (s, c, key, self, bearer, target) => {
      if (!ISAAC.test(name(c, bearer)) || target.kind !== 'devotee' || !sealed(s, target.uid)) return;
      return st => strikeBuff(st, target.uid, -1);
    },
    gearCombatDamage: (s, c, key, self, bearer, victim) => {
      if (!HYOGA.test(name(c, bearer))) return;
      return st => { if (st.units[victim] && pay(st, c, key, 1, 'RESONANCE — CYGNUS HYOGA', victim)) seal(st, c, [victim], 1, 'RESONANCE — CYGNUS HYOGA'); };
    },
  },
  // Mermaid Thetis
  'poseidon-v6-099': {
    enter: (s, c, key) => st => lookTop(st, c, key, 3, 'OCEAN\'S HERALD', {optional: true, filter: u => isGeneral(c, u) || isScale(c, u)}),
    // Devotion to Poseidon: escudo no God criado na declaração do Strike contra ele.
    watchDeclare: (s, c, key, self, attacker, target) => {
      const tag = `devotion:${self}`;
      if (target.kind !== 'god' || target.player !== key || s.roundUses.has(tag)) return;
      return st => {
        if (st.roundUses.has(tag) || !st.units[self]?.prepared || !pay(st, c, key, 1, 'DEVOTION TO POSEIDON', self)) return;
        k.once(st, tag);
        k.exhaust(st, self);
        shield(st, k.godTarget(key), 2, {duration: 'this_strike'});
        thetisResonance(st, c, key, self);
      };
    },
    mods: (s, c, key) => (poseidon(s, key) ? [{atk: 0, hp: 1}] : []),
  },
  'poseidon-v6-100': {
    watchDeclare: bearerWard({amount: () => 2, cost: 1, ability: 'OCEAN\'S BLESSING',
      after: (st, c, key, self, uid) => { if (THETIS.test(name(c, uid))) thetisResonance(st, c, key, uid); }}),
  },
  // Julian Solo
  'poseidon-v6-101': {
    enter: (s, c, key) => st => {
      const t = k.choose(c, key, 'DIVINE AWAKENING', k.enemies(st, c, key), {optional: true, text: 'Put 1 Seal counter on target enemy Devotee?'});
      if (t) seal(st, c, [t], 1, 'DIVINE AWAKENING');
    },
    mods: (s, c, key) => (awakened(s, key) ? [{atk: 2, hp: 1}] : []),
    // Poseidon → Azul (31/10/2026): o ganho de Soul virou loot.
    watchSealed: onSealed('emperors-will', (st, c, key, self) => (pay(st, c, key, 1, 'THE EMPEROR\'S WILL', self) ? (loot(st, c, key, 'THE EMPEROR\'S WILL'), true) : false)),
  },
  'poseidon-v6-102': {
    activate: {name: 'Abyssal Ritual', cost: 1, check: (s, c, key) => needEnemy(s, c, key, u => sealed(s, u)),
      run: (s, c, key) => debuff(s, enemy(s, c, key, 'ABYSSAL RITUAL', undefined, u => sealed(s, u)), 1)},
    watchSealed: onSealed('whispers', (st, c, key) => scry(st, c, key, 'WHISPERS BELOW')),
  },
  'poseidon-v6-103': {
    // Lord of Atlantis (31/10/2026): outras Marinas +1/+1; Royal Summons saiu.
    aura: (s, c, key, self, unit) => (unit !== self && k.controllerOf(s, unit) === key && isMarina(c, unit) ? {atk: 1, hp: 1} : null),
  },
  'poseidon-v6-104': {
    mods: (s, c, key, self) => (k.devotees(s, c, key).some(u => u !== self && isMarina(c, u)) ? [{atk: 0, hp: 1}] : []),
    watchDeclare: selfWard({ability: 'OCEANIC DEFENSE'}),
  },
  // 105 Atlantean Sentinel — Ancient Vigil (gancho survive): sobreviveu como defensor; pode pagar {1}{C} e pôr 1 Seal no atacante.
  'poseidon-v6-105': {
    survive: (s, c, key, self, role, foe) => role === 'defender' && !!foe && ready(s, key) >= 1 && (st => {
      if (st.units[foe] && pay(st, c, key, 1, 'ANCIENT VIGIL', self)) seal(st, c, [foe], 1, 'ANCIENT VIGIL');
    }),
  },
  'poseidon-v6-106': {
    mods: (s, c, key) => (s.domains?.[key] ? [{atk: 0, hp: 1}] : []),
  },
  'poseidon-v6-107': {
    declare: (s, c, key, self, target) => {
      if (target.kind !== 'devotee' || !sealed(s, target.uid) || !k.once(s, `thrust:${self}`)) return;
      return st => strikeBuff(st, self, 1);
    },
  },
  // Marina Vanguard: o limite de um Strike por Devotee por turno (D22) já cobre "cannot declare another Strike this round".
  'poseidon-v6-108': {
    killInCombat: (s, c, key, self) => {
      if (s.roundUses.has(`advance:${self}`)) return;
      return st => {
        if (st.units[self] && !st.roundUses.has(`advance:${self}`) && k.may(c, key, 'RELENTLESS ADVANCE', {uid: self, text: 'Prepare Marina Vanguard?'})) {
          k.once(st, `advance:${self}`); k.prepare(st, self);
        }
      };
    },
  },
  'poseidon-v6-109': {
    enter: (s, c, key) => st => mill(st, c, targetPlayer(st, c, key, 'EYES OF THE ABYSS'), 2),
  },
  'poseidon-v6-110': {
    watchDeclare: selfWard({ability: 'CORAL ARMOR'}),
  },
  'poseidon-v6-111': {
    declare: (s, c, key, self, target) => {
      const tag = `wave:${self}`;
      if (target.kind !== 'devotee' || s.roundUses.has(tag)) return;
      return st => { if (!st.roundUses.has(tag) && st.units[target.uid] && pay(st, c, key, 1, 'CRASHING WAVE', target.uid)) { k.once(st, tag); strikeBuff(st, target.uid, -1); } };
    },
  },
  'poseidon-v6-112': {
    enter: (s, c, key) => st => loot(st, c, key, 'HUNTER\'S INSTINCT'),
    declare: (s, c, key, self, target) => (target.kind === 'devotee' && sealed(s, target.uid) ? st => strikeBuff(st, self, 1) : undefined),
  },
  'poseidon-v6-113': {
    enter: (s, c, key) => st => k.draw(st, key, 1),
    activate: {name: 'Forbidden Study', cost: 2, run: (s, c, key) => loot(s, c, key, 'FORBIDDEN STUDY')},
  },
  'poseidon-v6-114': {
    watchSealed: onSealed('insight', (st, c, key, self) => (pay(st, c, key, 1, 'OCEANIC INSIGHT', self) ? (loot(st, c, key, 'OCEANIC INSIGHT'), true) : false)),
    activate: {name: 'Sacred Waters', cost: 1,
      run: (s, c, key) => { const t = k.choose(c, key, 'SACRED WATERS', k.devotees(s, c, key), {text: 'Remove 1 damage from target friendly Devotee.'}); if (t) k.removeDamage(s, t, 1); }},
  },
  'poseidon-v6-115': {
    enter: (s, c, key) => st => lookTop(st, c, key, 3, 'CURRENT READING'),
    // Tidal Escape (watchSpell + alvos guardados ao conjurar): uma vez por Round, devolve-se à mão; o uso só gasta se aceitar.
    watchSpell: (s, c, key, self, caster, spellUid, targets) => {
      if (caster === key || !castMT(c, spellUid) || !targets.includes(self) || s.roundUses.has(`escape:${self}`)) return;
      return st => {
        if (!st.units[self] || st.roundUses.has(`escape:${self}`) || !k.may(c, key, 'TIDAL ESCAPE', {uid: self, text: 'Return Ocean Current Scout to its owner\'s hand?'})) return;
        k.once(st, `escape:${self}`);
        bounce(st, c, key, self);
      };
    },
  },
  'poseidon-v6-116': {
    // Pearl Divination (gancho watchSpell): paga {1}{C}, compra 1 e descarta 1.
    watchSpell: onCast('pearldiv', 'PEARL DIVINATION', 1, (st, c, key) => loot(st, c, key, 'PEARL DIVINATION')),
    watchDiscard: (s, c, key, self, player) => {
      if (player !== key || !k.once(s, `pearl:${self}`)) return;
      return st => {
        if (!k.devotees(st, c, key).length || !pay(st, c, key, 1, 'PEARL OF PROTECTION', self)) return;
        const t = k.choose(c, key, 'PEARL OF PROTECTION', k.devotees(st, c, key), {text: 'Prevent the next 1 Strike damage to target friendly Devotee this round.'});
        if (t) shield(st, t, 1, {duration: 'this_round'});
      };
    },
  },
  // 117 Ancient Sea Guardian — Tidal Rejection (watchSpell): Moment/Technique inimigo que mira o seu God ou um Devotee seu (alvos
  // guardados ao conjurar); pague {2}{C} e Exhaust nele (Prepared) para anular. Uso do Round marcado no evento (como o 119).
  'poseidon-v6-117': {
    watchSpell: (s, c, key, self, caster, spellUid, targets) => caster !== key && castMT(c, spellUid) && k.targetsMine(s, c, key, targets) &&
      s.units[self]?.prepared && ready(s, key) >= 2 && !s.roundUses.has(`rejection:${self}`) && k.once(s, `rejection:${self}`) && (st => {
        if (!st.units[self]?.prepared || !k.spellOnChain(st, spellUid) || !pay(st, c, key, 2, 'TIDAL REJECTION', self)) return;
        k.exhaust(st, self);
        k.counterSpell(st, c, spellUid);
      }),
  },
  'poseidon-v6-118': {
    enter: (s, c, key, self) => st => { if (k.devotees(st, c, key).some(u => u !== self && isMarina(c, u))) k.draw(st, key, 1); },
    // Banner of the Emperor (31/10/2026): outras Marinas +1 ATK, sempre.
    aura: (s, c, key, self, unit) => (unit !== self && k.controllerOf(s, unit) === key && isMarina(c, unit) ? {atk: 1, hp: 0} : null),
  },
  // 119 Trident Temple Warden — Sacred Interdiction (gancho watchSpell + kit.counterSpell): Moment/Technique inimigo; pague {2}{C} e
  // Exhaust nele (precisa estar Prepared); a Spell é anulada a menos que o controlador pague {2}{C}. Uso do Round marcado no evento.
  'poseidon-v6-119': {
    watchSpell: (s, c, key, self, caster, spellUid) => caster !== key && castMT(c, spellUid) && s.units[self]?.prepared && ready(s, key) >= 2 &&
      !s.roundUses.has(`interdiction:${self}`) && k.once(s, `interdiction:${self}`) && (st => {
        if (!st.units[self]?.prepared || !k.spellOnChain(st, spellUid) || !pay(st, c, key, 2, 'SACRED INTERDICTION', self)) return;
        k.exhaust(st, self);
        if (ready(st, caster) >= 2 && k.may(c, caster, 'SACRED INTERDICTION', {cost: '2 Cosmo', text: 'Pay {2}{C} to keep your Spell from being countered?'})) { spendBase(st, caster, 2); return; }
        k.counterSpell(st, c, spellUid);
      }),
  },
  'poseidon-v6-120': {
    watchMill: (s, c, key, self, player) => {
      const tag = `prophecy:${self}`;
      if (player === key || s.roundUses.has(tag)) return;
      return st => { if (!st.roundUses.has(tag) && pay(st, c, key, 1, 'PROPHECY OF THE ABYSS', self)) { k.once(st, tag); k.draw(st, key, 1); } };
    },
    enter: (s, c, key) => st => mill(st, c, targetPlayer(st, c, key, 'DARK REVELATION'), 2),
  },
  'poseidon-v6-121': {
    // Countercurrent (watchSpell): Moment/Technique inimigo que mira um Marina seu (alvos guardados ao conjurar); paga {1}{C}, devolve
    // esse Marina à mão e, se a Spell ficou sem alvo legal, anula. Uso do Round marcado no evento.
    watchSpell: (s, c, key, self, caster, spellUid, targets) => {
      if (caster === key || !castMT(c, spellUid) || ready(s, key) < 1 || s.roundUses.has(`countercurrent:${self}`)) return;
      const marinas = targets.filter(t => isMarina(c, t) && k.controllerOf(s, t) === key);
      if (!marinas.length || !k.once(s, `countercurrent:${self}`)) return;
      return st => {
        const t = marinas.length === 1 ? marinas[0] : k.choose(c, key, 'COUNTERCURRENT', marinas.filter(u => k.controllerOf(st, u) === key), {text: 'Choose the Marina Devotee to return.'});
        if (!t || !k.spellOnChain(st, spellUid) || !pay(st, c, key, 1, 'COUNTERCURRENT', self)) return;
        bounce(st, c, key, t);
        if (!targets.some(u => k.stillTarget(st, u))) k.counterSpell(st, c, spellUid); // sem alvo legal restante
      };
    },
    watchBounce: (s, c, key, self, uid, ctrl) => {
      if (ctrl !== key || !isMarina(c, uid) || !k.once(s, `retreat:${self}`)) return;
      return st => { if (pay(st, c, key, 1, 'TACTICAL RETREAT', self)) loot(st, c, key, 'TACTICAL RETREAT'); };
    },
  },
  'poseidon-v6-122': {
    watchDeclare: bearerWard({ability: 'LAST PROTECTION'}),
  },
  'poseidon-v6-123': {
    gearCombatDamage: (s, c, key, self, bearer) => {
      const tag = `oceanic-thrust:${self}`;
      if (s.roundUses.has(tag)) return;
      return st => {
        if (st.roundUses.has(tag) || !pay(st, c, key, isMarina(c, bearer) ? 0 : 1, 'OCEANIC THRUST', bearer)) return; // Resonance — Marina: {0}
        k.once(st, tag);
        loot(st, c, key, 'OCEANIC THRUST');
      };
    },
  },
  // 124 Coral Barrier — Living Reef (watchSpell): o portador é alvo de Moment/Technique inimigo; paga {2}{C} e a Spell é anulada a
  // menos que o controlador pague {2}{C}. O +0/+1 já vem do Equipment. Uso do Round marcado no evento.
  'poseidon-v6-124': {
    watchSpell: (s, c, key, self, caster, spellUid, targets) => {
      const bearer = k.bearerOf(c, self);
      return caster !== key && bearer && castMT(c, spellUid) && targets.includes(bearer) && ready(s, key) >= 2 &&
        !s.roundUses.has(`reef:${self}`) && k.once(s, `reef:${self}`) && (st => {
          if (!k.spellOnChain(st, spellUid) || !pay(st, c, key, 2, 'LIVING REEF', self)) return;
          counter(st, c, spellUid, 'LIVING REEF', 2);
        });
    },
  },
  'poseidon-v6-125': {
    gearDeclare: (s, c, key, self, bearer, target) => {
      if (target.kind !== 'devotee' || !sealed(s, target.uid) || !k.once(s, `piercing:${self}`)) return;
      return st => strikeBuff(st, bearer, 1);
    },
  },
  'poseidon-v6-126': {
    activate: {name: 'Deep Restraint', cost: 2, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key, self) => {
        const done = seal(s, c, [enemy(s, c, key, 'DEEP RESTRAINT')], 1, 'DEEP RESTRAINT');
        const bearer = k.bearerOf(c, self);
        if (done.length && bearer && isMarina(c, bearer)) mayLoot(s, c, key, 'RESONANCE — MARINA');
      }},
  },
  'poseidon-v6-127': {
    cast: (s, c, key) => st => loot(st, c, key, 'HIDDEN KNOWLEDGE'),
    activate: {name: 'Oceanic Insight', cost: 2, once: true, tap: false,
      run: (s, c, key) => {
        const deck = s.players[key].deck, look = deck.slice(0, 2);
        if (look.length < 2) return;
        const top = c.decide?.(key, {ability: 'OCEANIC INSIGHT', options: look, choose: 'top', text: 'Choose the card to keep on top.'});
        const keep = look.includes(top) ? top : look[0];
        deck.splice(0, 2, keep);
        deck.push(look.find(u => u !== keep));
      }},
  },
  'poseidon-v6-128': {
    activate: {name: 'Scale Restoration', cost: 1, once: true, tap: false,
      run: (s, c, key, self) => {
        // Texto de 30/10/2026: "target friendly Devotee equipped with a Scale" (Armor não tem dano próprio).
        const wearers = s.players[key].battlefield.filter(u => k.card(c, u)?.kind === 'Devotee' && Object.keys(c.attached).some(e => c.attached[e] === u && isScale(c, e)));
        const t = k.choose(c, key, 'SCALE RESTORATION', wearers, {text: 'Remove damage from target friendly Devotee equipped with a Scale.'});
        const bearer = k.bearerOf(c, self);
        if (t) k.removeDamage(s, t, bearer && isMarina(c, bearer) ? 2 : 1); // Resonance — Marina: até 2
      }},
  },
  'poseidon-v6-129': {
    gearCombatDamage: (s, c, key, self, bearer, victim) => {
      if (!k.once(s, `venom:${self}`)) return;
      return st => debuff(st, victim, 1);
    },
  },
  // 130 Battle Awareness (gancho gearSurvive): portador sobreviveu como defensor; uma vez por Round, olha o topo do deck e pode pô-lo no fundo.
  'poseidon-v6-130': {
    gearSurvive: (s, c, key, self, bearer, role) => role === 'defender' && !s.roundUses.has(`awareness:${self}`) && k.once(s, `awareness:${self}`) && (st => scry(st, c, key, 'BATTLE AWARENESS')),
  },
  'poseidon-v6-131': {
    watchDeclare: bearerWard({ability: 'SACRED DEFENSE', amount: (st, c, key, self, uid) => (isMarina(c, uid) ? 2 : 1)}),
  },
  'poseidon-v6-132': {
    spell: {run: (s, c, key) => { const r = bounce(s, c, key, enemy(s, c, key, 'RETURN')); if (r?.hadSeal) loot(s, c, key, 'OCEAN\'S WISDOM'); }},
  },
  // 133 Call of the Ocean: Moment em resposta (guia §54) contra Moment/Technique inimigo na cadeia; o alvo é escolhido ao conjurar.
  'poseidon-v6-133': {
    spell: {check: needCounter(), run: (s, c, key) => { const t = counterTarget(c, s, key, 'CALL OF THE OCEAN'); if (t) counter(s, c, t, 'CALL OF THE OCEAN', 2); }},
  },
  'poseidon-v6-134': {
    spell: {run: (s, c, key) => {
      const r = bounce(s, c, key, enemy(s, c, key, 'RETURN', 'Return target enemy Devotee with ATK 3 or less.', u => k.atkOf(s, c, u) <= 3));
      if (r) mill(s, c, r.ctrl, 1);
    }},
  },
  // Cantrips de Poseidon (autor, 31/10/2026): 135 Opt, 138 Brainstorm, 139 Ponder, 158 Accumulated Knowledge.
  'poseidon-v6-135': {
    spell: {run: (s, c, key) => { scry(s, c, key, 'BENEATH THE SURFACE'); k.draw(s, key, 1); }},
  },
  // 136 The Sea Never Forgives: só contra Spell que mira o seu God ou um Devotee seu (alvos guardados ao conjurar).
  'poseidon-v6-136': {
    spell: {check: needCounter(aimsAtMe), run: (s, c, key) => { const t = counterTarget(c, s, key, 'THE SEA NEVER FORGIVES', aimsAtMe(s, c, key)); if (t) k.counterSpell(s, c, t); }},
  },
  'poseidon-v6-137': {
    spell: {run: (s, c, key) => { const t = enemy(s, c, key, 'ABYSSAL WEIGHT'); if (t) seal(s, c, [t], sealed(s, t) ? 2 : 1, 'ABYSSAL WEIGHT'); }},
  },
  'poseidon-v6-138': {
    spell: {run: (s, c, key) => {
      k.draw(s, key, 3);
      putBack(s, c, key, s.players[key].hand, 2, 'THE OCEAN\'S EMBRACE', 'Choose a card from your hand to put on top of your deck (the first one goes on top).');
    }},
  },
  'poseidon-v6-139': {
    spell: {run: (s, c, key) => {
      const deck = s.players[key].deck, look = deck.slice(0, 3);
      if (look.length && k.may(c, key, 'WHISPERS FROM THE ABYSS', {text: 'Shuffle your deck? (No: put the cards back in the order you choose)'})) shuffleDeck(s, key);
      else if (look.length) { deck.splice(0, look.length); putBack(s, c, key, look, look.length, 'WHISPERS FROM THE ABYSS', 'Choose the card to put on top of your deck (then the next one below it).'); }
      k.draw(s, key, 1);
    }},
  },
  'poseidon-v6-140': {
    spell: {run: (s, c, key) => {
      const pick = mode(c, key, 'LOYALTY OR DISCIPLINE', ['Loyalty', 'Discipline']);
      const t = pick && k.choose(c, key, pick.toUpperCase(), k.devotees(s, c, key).filter(u => isMarina(c, u)), {text: 'Choose target friendly Marina Devotee.'});
      if (t && pick === 'Loyalty') k.buff(s, t, 0, 2);
      if (t && pick === 'Discipline') bounce(s, c, key, t);
      if (generals(s, c, key)) loot(s, c, key, 'OCEAN\'S REWARD');
    }},
  },
  'poseidon-v6-141': {
    spell: {run: (s, c, key) => {
      for (const t of enemies(s, c, key, 'GATHERING STORM', 2)) { const r = bounce(s, c, key, t); if (r?.hadSeal) mill(s, c, r.ctrl, 1); }
    }},
  },
  // ---------- Domains (rebalanceamento, autor 31/10/2026): linha 1 simples; linha 2 `opg` (Once per game, guia §63) ----------
  'poseidon-v6-142': {
    watchSpell: (s, c, key, self, caster, spellUid) => caster === key && castMT(c, spellUid) && k.once(s, `oceanic:${self}`)
      && (st => k.gainSoul(st, key, 1)), // Oceanic Dominion
    opg: {name: 'DIVINE TERRITORY', cost: 2, run: (s, c, key) => { k.draw(s, key, 2); if (!s.victory) k.discard(s, c, key, 1, 'DIVINE TERRITORY'); }},
  },
  'poseidon-v6-143': {
    // Dimensional Currents: o controlador do Devotee devolvido moe 1.
    watchBounce: (s, c, key, self, uid, ctrl, by) => by === key && ctrl !== key && k.once(s, `currents:${self}`) && (st => mill(st, c, ctrl, 1)),
    opg: {name: 'GOLDEN TRIANGLE', cost: 3, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key) => { bounce(s, c, key, enemy(s, c, key, 'GOLDEN TRIANGLE')); k.draw(s, key, 1); }},
  },
  'poseidon-v6-144': {
    watchDeclare: (s, c, key, self, attacker) => {
      const tag = `silent:${self}`;
      if (k.controllerOf(s, attacker) === key || s.roundUses.has(tag)) return;
      return st => { if (!st.roundUses.has(tag) && st.units[attacker] && pay(st, c, key, 1, 'SILENT SYMPHONY', attacker)) { k.once(st, tag); strikeBuff(st, attacker, -1); } };
    },
    opg: {name: 'DEAD END SYMPHONY', cost: 2, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key) => { const t = enemy(s, c, key, 'DEAD END SYMPHONY'); if (t) seal(s, c, [t], 1, 'DEAD END SYMPHONY'); }},
  },
  'poseidon-v6-145': {
    watchDeclare: ward({cost: 1, ability: 'WALL OF THE PACIFIC',
      unit: (s, c, key, self, attacker, target) => inStrike(attacker, target).find(u => k.controllerOf(s, u) === key)}),
    opg: {name: 'RISING BILLOWS', cost: 3, run: (s, c, key) => k.devotees(s, c, key).forEach(u => shield(s, u, Infinity))},
  },
  'poseidon-v6-146': {
    watchSealed: (s, c, key, self, transitions) => {
      const hit = enemySealed(key, transitions)[0];
      if (!hit || !k.once(s, `frozen-waters:${self}`)) return;
      return st => mill(st, c, hit.controller, 1);
    },
    opg: {name: 'AURORA BOREALIS', cost: 2, run: (s, c, key) => k.draw(s, key, Math.min(3, k.enemies(s, c, key).filter(u => sealed(s, u)).length))},
  },
  'poseidon-v6-147': {
    // Lost in the Reef: o primeiro Devotee inimigo que declara Strike contra o seu God em cada Round, -1 ATK nesse Strike.
    watchDeclare: (s, c, key, self, attacker, target) => target.kind === 'god' && target.player === key && k.once(s, `reef:${self}`)
      && (st => strikeBuff(st, attacker, -1)),
    opg: {name: 'THE ENDLESS REEF', cost: 3, run: (s, c, key) => {
      const pool = k.enemies(s, c, key).filter(u => k.costOf(c, u) <= 3);
      for (const t of k.chooseUpTo(c, key, 'THE ENDLESS REEF', pool, 2, {text: 'Choose up to two enemy Devotees with Casting Cost 3 or less.'})) bounce(s, c, key, t);
    }},
  },
  'poseidon-v6-148': {
    watchSpell: (s, c, key, self, caster, spellUid) => caster === key && castMT(c, spellUid) && k.once(s, `secrets:${self}`)
      && (st => scry(st, c, key, 'ANCIENT SECRETS')),
    opg: {name: 'FORGOTTEN KNOWLEDGE', cost: 2, run: (s, c, key) => { k.draw(s, key, 3); if (!s.victory) k.discard(s, c, key, 2, 'FORGOTTEN KNOWLEDGE'); }},
  },
  'poseidon-v6-149': {
    watchSealed: onSealed('crushing', (st, c, key, self, uid) => (st.units[uid] && pay(st, c, key, 1, 'CRUSHING DEPTHS', uid) ? (debuff(st, uid, 1), true) : false)),
    opg: {name: 'ECHOES OF THE ABYSS', cost: 3, run: (s, c, key) => mill(s, c, k.other(s, key), 4)},
  },
  'poseidon-v6-150': {
    spell: {run: (s, c, key) => {
      const r = bounce(s, c, key, enemy(s, c, key, 'RETURN'));
      if (controls(s, c, key, BAIAN)) shield(s, k.godTarget(key), 3, {duration: 'this_round'});
      if (r?.hadSeal) mill(s, c, r.ctrl, 2);
    }},
  },
  'poseidon-v6-151': {
    spell: {run: (s, c, key) => {
      const picked = enemies(s, c, key, 'SIREN\'S MELODY', 2);
      for (const t of picked) debuff(s, t, 2);
      let done = [];
      if (controls(s, c, key, SORRENTO) && picked.length) {
        const t = picked.length === 1 ? picked[0] : k.choose(c, key, 'SIREN\'S MELODY', picked, {text: 'Put 1 Seal counter on one of those Devotees.'});
        done = seal(s, c, [t], 1, 'SIREN\'S MELODY');
      }
      k.draw(s, key, 1);
      if (done.length) k.discard(s, c, key, 1, 'FINAL NOTE');
    }},
  },
  'poseidon-v6-152': {
    spell: {run: (s, c, key) => {
      bounce(s, c, key, enemy(s, c, key, 'RETURN'));
      if (!generals(s, c, key)) return;
      const t = k.choose(c, key, 'RISING CURRENT', k.devotees(s, c, key), {optional: true, text: 'Return target friendly Devotee to its owner\'s hand?'});
      if (t && bounce(s, c, key, t)) loot(s, c, key, 'OCEAN\'S REWARD');
    }},
  },
  'poseidon-v6-153': {
    spell: {run: (s, c, key) => {
      const t = enemy(s, c, key, 'FROZEN VENGEANCE');
      if (t) seal(s, c, [t], 2, 'FROZEN VENGEANCE');
      if (t && controls(s, c, key, ISAAC)) debuff(s, t, 2);
      if (controls(s, c, key, HYOGA)) loot(s, c, key, 'FROZEN BROTHERHOOD');
    }},
  },
  'poseidon-v6-154': {
    // Choose one (ao conjurar): Reversal precisa de Devotee inimigo; Interdiction, de Moment/Technique inimigo na cadeia.
    spell: {run: (s, c, key) => {
      const modes = [k.enemies(s, c, key).length && 'Dimensional Reversal', counterable(s, c, key).length && 'Royal Interdiction'].filter(Boolean);
      const pick = mode(c, key, 'THE SEA DRAGON\'S COMMAND', modes);
      if (pick === 'Dimensional Reversal') bounce(s, c, key, enemy(s, c, key, 'DIMENSIONAL REVERSAL'));
      if (pick === 'Royal Interdiction') { const t = counterTarget(c, s, key, 'ROYAL INTERDICTION'); if (t) counter(s, c, t, 'ROYAL INTERDICTION', 3); }
      if (controls(s, c, key, KANON)) loot(s, c, key, 'KANON\'S STRATEGY');
    }},
  },
  'poseidon-v6-155': {
    spell: {run: (s, c, key) => {
      const t = enemy(s, c, key, 'ENCHANTED MELODY');
      if (t) { debuff(s, t, 2); if (sealed(s, t)) mill(s, c, k.controllerOf(s, t), 2); }
      if (controls(s, c, key, SORRENTO)) loot(s, c, key, 'SORROWFUL ECHO');
    }},
  },
  // 156 Wall of Ocean Currents (31/10/2026): counter de Equipment na pilha.
  'poseidon-v6-156': {
    spell: {check: needOnStack(EQUIPMENT_ON_STACK, 'Equipment'), run: (s, c, key) => {
      cancelOnStack(s, c, key, 'WALL OF OCEAN CURRENTS', EQUIPMENT_ON_STACK, 'Choose target enemy Equipment on the stack.');
    }},
  },
  'poseidon-v6-157': {
    spell: {run: (s, c, key) => {
      const picked = enemies(s, c, key, 'ARCTIC SILENCE', 2);
      seal(s, c, picked, 1, 'ARCTIC SILENCE');
      if (!picked.length || !controls(s, c, key, ISAAC)) return;
      debuff(s, picked.length === 1 ? picked[0] : k.choose(c, key, 'ARCTIC SILENCE', picked, {text: 'Choose one of those Devotees to get -2 ATK.'}), 2);
    }},
  },
  'poseidon-v6-158': {
    spell: {run: (s, c, key) => {
      const copies = s.players[key].tartarus.filter(u => c.objects[u]?.cardId === 'poseidon-v6-158').length; // a própria ainda está na pilha
      k.draw(s, key, 1 + copies);
    }},
  },
  // 159 (31/10/2026): Denial anula Devotee inimigo na pilha; ou Reversal. O modo e o alvo são escolhidos ao conjurar.
  'poseidon-v6-159': {
    spell: {run: (s, c, key) => {
      const gear = s.players[k.other(s, key)].battlefield.filter(u => k.card(c, u)?.kind === 'Equipment');
      const pick = mode(c, key, 'THE SEVEN SEAS ANSWER', [onStack(s, c, key, DEVOTEE_ON_STACK(c)).length && 'Denial', gear.length && 'Reversal'].filter(Boolean));
      if (pick === 'Denial') cancelOnStack(s, c, key, 'DENIAL', DEVOTEE_ON_STACK, 'Choose target enemy Devotee on the stack.');
      if (pick === 'Reversal') {
        const t = k.choose(c, key, 'REVERSAL', gear, {text: 'Return target enemy Equipment to its owner\'s hand.'});
        if (t) k.toHand(s, c, t, 'battlefield', key);
      }
    }},
  },
  'poseidon-v6-160': {
    spell: {run: (s, c, key) => {
      const t = enemy(s, c, key, 'ABYSSAL SILENCE');
      if (t) silence(s, t);
      if (t && sealed(s, t)) debuff(s, t, 1);
    }},
  },
  'poseidon-v6-161': {
    spell: {run: (s, c, key) => {
      const r = bounce(s, c, key, k.choose(c, key, 'RETURN', k.devotees(s, c, key), {text: 'Return target friendly Devotee to its owner\'s hand.'}));
      k.draw(s, key, 1);
      if (!r || !isMarina(c, r.uid)) return;
      const t = k.choose(c, key, 'ENDLESS CURRENT', k.devotees(s, c, key), {optional: true, text: 'Remove up to 2 damage from another target friendly Devotee?'});
      if (t) k.removeDamage(s, t, 2);
    }},
  },
  'poseidon-v6-162': {
    spell: {run: (s, c, key) => {
      const r = bounce(s, c, key, enemy(s, c, key, 'RETURN'));
      if (!r) return;
      k.draw(s, key, 1); // Illusionary Control (31/10/2026): o discard virou compra
      if (controls(s, c, key, KANON)) mill(s, c, r.ctrl, 2);
    }},
  },
  'poseidon-v6-163': {
    spell: {run: (s, c, key) => {
      for (const t of enemies(s, c, key, 'SIREN\'S REQUIEM', 2)) debuff(s, t, 3);
      for (const p of opponents(s, key)) mill(s, c, p, 2); // Siren's Requiem (31/10/2026): discard → mill
      if (controls(s, c, key, SORRENTO)) loot(s, c, key, 'RESONANCE — SIREN SORRENTO');
    }},
  },
  'poseidon-v6-164': {
    spell: {run: (s, c, key) => {
      for (const t of enemies(s, c, key, 'CRASHING FORCE', 2)) { const r = bounce(s, c, key, t); if (r) mill(s, c, r.ctrl, 1); }
      if (controls(s, c, key, BAIAN)) shield(s, k.godTarget(key), 3, {duration: 'this_round'});
    }},
  },
  'poseidon-v6-165': {
    spell: {run: (s, c, key) => {
      // Azul não destrói direto (31/10/2026): Seal e -2 ATK; com Kraken Isaac, 1 Seal a mais.
      const t = enemy(s, c, key, 'VIKING TIGER CLAW');
      if (!t) return;
      seal(s, c, [t], controls(s, c, key, ISAAC) ? 2 : 1, 'VIKING TIGER CLAW');
      debuff(s, t, 2);
    }},
  },
  'poseidon-v6-166': {
    spell: {run: (s, c, key) => {
      const foe = k.other(s, key), options = s.players[foe].battlefield.filter(u => ['Devotee', 'Equipment'].includes(k.card(c, u)?.kind));
      const t = k.choose(c, key, 'RETURN', options, {text: 'Return target enemy Devotee or Equipment to its owner\'s hand.'});
      if (t) { // alvo ilegal: o retorno e o Dimensional Distortion não acontecem; o draw de Kanon não depende dele
        if (k.isDevotee(c, t)) bounce(s, c, key, t); else k.toHand(s, c, t, 'battlefield', key);
        const hand = s.players[foe].hand, top = hand.length ? c.decide?.(foe, {ability: 'DIMENSIONAL DISTORTION', options: [...hand], choose: 'top', text: 'Put a card from your hand on top of your deck.'}) : null;
        const put = hand.includes(top) ? top : hand[0];
        if (put) { hand.splice(hand.indexOf(put), 1); s.players[foe].deck.unshift(put); }
      }
      if (controls(s, c, key, KANON)) k.draw(s, key, 1);
    }},
  },
  // 167 Song of the Last Siren (Force of Will, 31/10/2026): anula qualquer carta ou habilidade inimiga na pilha.
  // Custo adicional ao conjurar: o God perde {3}{S} e você descarta 1 carta.
  'poseidon-v6-167': {
    spell: {
      check: (s, c, key) => {
        needOnStack(ANY_ON_STACK, 'carta ou habilidade')(s, c, key);
        if (s.players[key].hand.length < 2) throw new k.RuleError('custo', 'SONG OF THE LAST SIREN: precisa descartar 1 carta');
      },
      cost: (s, c, key) => { k.loseSoul(s, {[key]: 3}, 'cost'); k.discard(s, c, key, 1, 'SONG OF THE LAST SIREN'); },
      run: (s, c, key) => { cancelOnStack(s, c, key, 'SONG OF THE LAST SIREN', ANY_ON_STACK, 'Choose target enemy card or ability on the stack.'); },
    },
  },
  'poseidon-v6-168': {
    spell: {run: (s, c, key) => {
      const done = seal(s, c, enemies(s, c, key, 'FROZEN DOMINION', 3), 1, 'FROZEN DOMINION');
      for (const p of opponents(s, key)) { const n = done.filter(u => k.controllerOf(s, u) === p).length; if (n) mill(s, c, p, 2 * n); }
    }},
  },
  'poseidon-v6-169': {
    spell: {run: (s, c, key) => {
      const t = enemy(s, c, key, 'ABSOLUTE CONFINEMENT');
      if (t) seal(s, c, [t], 3, 'ABSOLUTE CONFINEMENT');
      if (t) silence(s, t); // Absolute Confinement
      if (controls(s, c, key, ISAAC) || controls(s, c, key, HYOGA)) k.draw(s, key, 1);
    }},
  },
  // 170 Atlantean Royal Scepter — Royal Knowledge (gancho watchSpell); Emperor's Authority (gancho costLess).
  'poseidon-v6-170': {
    costLess: (s, c, key, self, uid) => k.card(c, uid)?.kind === 'Spell' && !s.roundUses.has(`authority:${self}`) && {n: 1, min: 1, tag: `authority:${self}`},
    watchSpell: onCast('royal', 'ROYAL KNOWLEDGE', 1, (st, c, key) => loot(st, c, key, 'ROYAL KNOWLEDGE')),
  },
  'poseidon-v6-171': {
    spell: {run: (s, c, key) => {
      // Choose two (ao conjurar): Submission e Silence só se há alvo (Devotee inimigo / Moment ou Technique inimigo na cadeia).
      const modes = [k.enemies(s, c, key).length && 'Submission', counterable(s, c, key).length && 'Silence', 'Oppression', 'Dominion'].filter(Boolean);
      const first = mode(c, key, 'CHOOSE TWO', modes);
      const second = first && mode(c, key, 'CHOOSE TWO', modes.filter(m => m !== first));
      for (const m of modes.filter(m => m === first || m === second)) {
        if (m === 'Submission') bounce(s, c, key, enemy(s, c, key, 'SUBMISSION'));
        if (m === 'Silence') { const t = counterTarget(c, s, key, 'SILENCE'); if (t) k.counterSpell(s, c, t); }
        if (m === 'Oppression') mill(s, c, k.other(s, key), 4);
        if (m === 'Dominion') { k.draw(s, key, 2); k.discard(s, c, key, 1, 'DOMINION'); }
      }
    }},
  },
  'poseidon-v6-172': {
    spell: {run: (s, c, key) => {
      const picked = enemies(s, c, key, 'DIVINE PRESENCE', 2), already = picked.filter(u => sealed(s, u));
      seal(s, c, picked, 1, 'DIVINE PRESENCE');
      for (const u of already) { const ctrl = k.controllerOf(s, u); if (ctrl) mill(s, c, ctrl, 2); }
      if (poseidon(s, key)) k.draw(s, key, 1);
    }},
  },
  'poseidon-v6-173': {
    spell: {run: (s, c, key) => {
      for (const t of enemies(s, c, key, 'SUNKEN EMPIRE', 2)) { const r = bounce(s, c, key, t); if (r) mill(s, c, r.ctrl, 2); }
      if (s.domains?.[key]) k.draw(s, key, 1); // Lost Beneath the Waves (31/10/2026): discard → compra
    }},
  },
  'poseidon-v6-174': {
    spell: {run: (s, c, key) => {
      // Sleep (31/10/2026): 1 Seal em cada Devotee inimigo; com dois Marina Generals, compra 1.
      seal(s, c, k.enemies(s, c, key), 1, 'OCEANIC FURY');
      if (generals(s, c, key) >= 2) k.draw(s, key, 1);
    }},
  },
  'poseidon-v6-175': {
    spell: {run: (s, c, key) => {
      // 31/10/2026: Rising Pressure moe 2 a mais (era discard); The Deep Remembers compra 1.
      for (const p of opponents(s, key)) mill(s, c, p, 4 + (k.devotees(s, c, p).filter(u => sealed(s, u)).length >= 2 ? 2 : 0));
      k.draw(s, key, 1);
    }},
  },
  'poseidon-v6-176': {
    spell: {run: (s, c, key) => {
      for (const t of k.chooseUpTo(c, key, 'SOVEREIGN POWER', k.devotees(s, c, key), 2, {text: 'Choose target friendly Devotees.'})) {
        k.buff(s, t, 2, 2);
        if (isGeneral(c, t)) k.removeDamage(s, t, 2);
      }
      for (const t of k.devotees(s, c, key).filter(u => isGeneral(c, u))) k.addEffect(s, {kind: 'noBounce', target: t, duration: 'this_round'}); // Unshaken Loyalty
    }},
  },
  'poseidon-v6-177': {
    spell: {run: (s, c, key) => {
      const general = k.choose(c, key, 'CALL OF THE EMPEROR', s.players[key].tartarus.filter(u => isGeneral(c, u)), {text: 'Return target Marina General from your Tartarus to the Battlefield.'});
      // Entra Exhausted; o próximo turno do controlador já é outro Round, então "cannot declare a Strike this round" vale por si.
      if (general) k.putOntoField(s, c, key, general, 'tartarus', {prepared: false});
      const scale = k.choose(c, key, 'OCEANIC RESTORATION', s.players[key].tartarus.filter(u => isScale(c, u)), {optional: true, text: 'Return target Scale from your Tartarus to your hand?'});
      if (scale) k.toHand(s, c, scale, 'tartarus');
      // The Seven Seas Endure: sem efeito — o retorno do Tartarus já entra sem dano (guia §62).
    }},
  },
  'poseidon-v6-178': {
    // Divine Sovereignty (gancho watchSpell): paga {1}{C} e compra 1. Emperor's Dominion (gancho costLess), sem piso no texto.
    costLess: (s, c, key, self, uid) => awakened(s, key) && k.card(c, uid)?.kind === 'Spell' && !s.roundUses.has(`dominion:${self}`) && {n: 1, tag: `dominion:${self}`},
    watchSpell: onCast('sovereignty', 'DIVINE SOVEREIGNTY', 1, (st, c, key) => k.draw(st, key, 1)),
    activate: {name: 'Oceanic Judgment', cost: 3, once: true, tap: false, check: (s, c, key) => needEnemy(s, c, key),
      run: (s, c, key) => seal(s, c, [enemy(s, c, key, 'OCEANIC JUDGMENT')], 1, 'OCEANIC JUDGMENT')},
  },
  'poseidon-v6-179': {
    spell: {run: (s, c, key) => {
      shield(s, k.godTarget(key), Infinity, {duration: 'this_round'});
      const back = enemies(s, c, key, 'UNBREAKABLE FOUNDATION', 2).map(t => bounce(s, c, key, t)).filter(Boolean);
      if (poseidon(s, key)) k.draw(s, key, Math.min(2, back.length));
    }},
  },
  'poseidon-v6-180': {
    spell: {run: (s, c, key) => {
      const back = k.enemies(s, c, key).map(t => bounce(s, c, key, t)).filter(Boolean);
      for (const p of opponents(s, key)) { const n = back.filter(r => r.ctrl === p).length; if (n) mill(s, c, p, Math.min(12, 3 * n)); }
      if (awakened(s, key)) k.draw(s, key, 2); // The Emperor's Wrath (31/10/2026): discard → compra
    }},
  },
};
