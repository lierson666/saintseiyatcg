// Efeitos V6 de Artemis, por id de carta (contrato em ./registry.js; kit em ./kit.js).
// Gancho próprio deste arquivo: `watchCounter(s, c, key, self, target, n, by)` — disparado por `grow` (abaixo) quando
// um efeito de `by` põe N marcadores +1/+1 em `target`. shortcut: k.addCounter direto (outras facções) não dispara;
// mover o disparo para o kit quando ele ganhar o evento.
import * as k from './kit.js';
import {spendBase} from '../core.js';
import {shield} from '../effects.js';

const counters = (s, uid) => s.units[uid]?.training || 0;
const isArtemis = (c, uid) => k.isDevotee(c, uid) && k.id(c, uid).startsWith('artemis-');
const named = (c, uid, name) => k.card(c, uid)?.name === name;
const bank = (s, key) => s.players[key].bases.length; // Cosmo Bank = Bases (como em k.topToBase)
const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
// {N}{C}: N Bases preparadas (como payC em effects.js). Não paga parcial.
const payC = (s, key, n) => ready(s, key) >= n && (spendBase(s, key, n), true);
// Devotee foi jogado da mão ("cast"), não posto no campo por efeito (putOntoField marca `from`).
const wasCast = (s, uid) => { const e = s.events.findLast(x => x.type === 'card_played' && x.uid === uid); return !!e && !e.from; };

// Marcadores +1/+1 postos por um efeito de `by`; avisa os observadores `watchCounter`.
function grow(s, c, by, uid, n = 1) {
  if (!s.units[uid] || n <= 0) return;
  k.addCounter(s, uid, n);
  k.watchers(s, c, 'watchCounter', [uid, n, by], 'Training counter');
}
const growEach = (s, c, by, uids, n = 1) => uids.forEach(u => grow(s, c, by, u, n));
const pickFriend = (s, c, key, ability, {optional = false, not} = {}) =>
  k.choose(c, key, ability, k.devotees(s, c, key).filter(u => u !== not), {optional, text: 'Choose a friendly Devotee.'});
const pickEnemy = (s, c, key, ability) => k.choose(c, key, ability, k.enemies(s, c, key), {text: 'Choose an enemy Devotee.'});
// "Deals damage equal to its ATTACK" (não é Strike).
const blast = (s, c, src, target, extra = 0) => { if (src && s.units[src] && target) k.damage(s, c, target, k.atkOf(s, c, src) + extra); };
// "Fights": cada um causa ATK ao outro, ao mesmo tempo, sem ser Strike (interpretação decidida).
function fight(s, c, a, b) {
  if (!s.units[a] || !s.units[b]) return;
  const atkA = k.atkOf(s, c, a), atkB = k.atkOf(s, c, b);
  if (atkA > 0) k.damageDevotee(s, c, b, atkA, false);
  if (atkB > 0) k.damageDevotee(s, c, a, atkB, false);
  k.checkDefeats(s, c);
}
// Carta específica do deck para a Cosmo Bank, como Base Unprepared.
function toBase(s, key, uid) {
  const deck = s.players[key].deck;
  if (!deck.includes(uid)) return;
  deck.splice(deck.indexOf(uid), 1);
  s.players[key].bases.push({uid, prepared: false});
  k.emit(s, 'base_added', {player: key, prepared: false});
}
// "Look at the top N … you may reveal X and put it into your hand; the rest on the bottom".
// shortcut: o resto vai para o fundo na ordem atual ("any order" sem pergunta).
function lookTop(s, c, key, ability, n, filter) {
  const deck = s.players[key].deck, look = deck.splice(0, n);
  const pick = k.choose(c, key, ability, look.filter(filter), {optional: true, text: 'Reveal a card and put it into your hand?'});
  if (pick) { s.players[key].hand.push(pick); k.emit(s, 'revealed', {player: key, uid: pick}); }
  deck.push(...look.filter(u => u !== pick));
}
const maybeTopToBase = (s, c, key, ability) => {
  const top = s.players[key].deck[0];
  if (top && k.may(c, key, ability, {uid: top, text: 'Put the top card of your deck into your Cosmo Bank?'})) k.topToBase(s, key);
};

// Fábricas de gatilho (resolução sem condição no evento).
const run = fn => (s, c, key, self, ...a) => st => fn(st, c, key, self, ...a);
const bearer = (s, c, key, self) => { const b = c.attached[self]; return b && k.onField(s, key, b) ? b : null; };
const vsDevotee = target => target?.kind === 'devotee';
const buffSelf = (atk, hp, kw = []) => run((st, c, key, self) => k.buff(st, self, atk, hp, 'this_round', kw));
const buffBearer = (atk, hp, kw = []) => (s, c, key, self, b, target) => vsDevotee(target) && (st => k.buff(st, b, atk, hp, 'this_round', kw));
const growSelf = (n = 1) => run((st, c, key, self) => grow(st, c, key, self, n));
const drawOne = run((st, c, key) => k.draw(st, key, 1));
const growBearer = run((st, c, key, self, b) => grow(st, c, key, b, 1));
// "Other friendly <tipo> get +A/+H" (aura).
const lord = (test, atk, hp) => (s, c, key, self, unit) =>
  unit !== self && k.controllerOf(s, unit) === key && k.isDevotee(c, unit) && test(c, unit) ? {atk, hp} : null;
const gearAura = (test, bonus) => (s, c, key, self, unit) => (c.attached[self] === unit && test(s, c, key, unit) ? bonus : null);
const perBank = (s, c, key) => { const n = Math.floor(bank(s, key) / 3); return n ? [{atk: n, hp: n}] : []; };
const search = (st, c, key, ability, filter) => k.search(st, c, key, ability, (card, uid) => card.kind === 'Devotee' && filter(card, uid));

export default {
  // Spells baratas da color pie (autor, 31/10/2026: docs/spells-baratas-proposta.md).
  'artemis-v6-517': {spell: {check: k.needTarget((s, c, key) => k.enemies(s, c, key).filter(u => k.atkOf(s, c, u) >= 4), 'sem Devotee inimigo com ATK 4 ou mais'), run: (s, c, key) => { // Huntress's Net
    k.damage(s, c, k.choose(c, key, "HUNTRESS'S NET", k.enemies(s, c, key).filter(u => k.atkOf(s, c, u) >= 4), {text: 'Choose target enemy Devotee with ATK 4 or more.'}), 4);
  }}},
  'artemis-v6-518': {spell: {check: k.needTarget(k.devotees, 'sem Devotee aliado'), run: (s, c, key) => { // Wild Vigor
    const t = k.choose(c, key, 'WILD VIGOR', k.devotees(s, c, key), {text: 'Choose target friendly Devotee.'});
    if (t) k.buff(s, t, 2, 2);
  }}},
  'artemis-v6-519': {spell: {run: (s, c, key) => { // Lunar Vision
    // shortcut: o resto vai ao fundo na ordem em que estava ("in any order" sem pergunta); perguntar a ordem se fizer diferença.
    const deck = s.players[key].deck, top = deck.slice(0, 3), devs = top.filter(u => k.isDevotee(c, u));
    const pick = devs.length ? k.choose(c, key, 'LUNAR VISION', devs, {optional: true, text: 'You may reveal a Devotee card and put it into your hand.'}) : null;
    if (pick) { k.toHand(s, c, pick, 'deck'); k.emit(s, 'revealed', {player: key, uid: pick}); }
    if (top.length) k.emit(s, 'looked', {player: key, ability: 'LUNAR VISION', uids: [...top], kept: pick || null});
    const rest = top.filter(u => u !== pick && deck.includes(u));
    for (const u of rest) deck.splice(deck.indexOf(u), 1);
    deck.push(...rest);
  }}},
  // The Hunter's Moon — Moonlit Sacrifice (compra da facção): perde todo o Latent e devolve uma Base sua à mão; sem Base, não compra.
  'artemis-v6-504': {
    activate: {name: 'MOONLIT SACRIFICE', cost: 0, once: true, tap: false,
      check: (s, c, key) => { if (!s.players[key].bases.length) throw new k.RuleError('MOONLIT SACRIFICE', 'sem Cosmo Base para devolver à mão'); },
      run: (st, c, key) => {
        const p = st.players[key];
        const b = p.bases.length === 1 ? p.bases[0].uid : k.choose(c, key, 'MOONLIT SACRIFICE', p.bases.map(x => x.uid), {text: 'Choose a Cosmo Base to return to your hand.'});
        if (!b) return;
        if (p.latent) k.payLatent(st, key, p.latent);
        p.bases = p.bases.filter(x => x.uid !== b);
        p.hand.push(b);
        k.emit(st, 'returned_to_hand', {player: key, uid: b, from: 'bank'});
        k.draw(st, key, 1);
      }},
    res: {name: 'RESONANCE', cost: 3, run: (st, c, key) => {
      k.search(st, c, key, 'RESONANCE', cd => cd?.kind === 'Devotee' && (cd.cost?.amount ?? 0) >= 5);
      k.shuffleDeck(st, key); // "Shuffle your deck" vale mesmo sem achar
    }},
  },
  // CALISTO
  'artemis-v6-361': {
    aura: lord(isArtemis, 1, 1),
    watchCounter: (s, c, key, self, target, n, by) => by === key && k.controllerOf(s, target) === key && k.once(s, `${self}:lunar-command`)
      && (st => k.draw(st, key, 1)),
  },
  // 362 Callisto's Lunar Vestment — Moonlight Protection (gancho gearWouldBeDefeated): uma vez por Round, o portador seria derrotado;
  // pode tirar um marcador +1/+1 dele para evitar a derrota (fica com 1 de HP) e prevenir todo dano a ele neste Round.
  'artemis-v6-362': {
    gearWouldBeDefeated: (s, c, key, self, bearer) => {
      if (s.roundUses.has(`${self}:moonlight`) || !counters(s, bearer)
        || !k.may(c, key, 'MOONLIGHT PROTECTION', {uid: bearer, text: 'Remove a Training counter to prevent that defeat?'})) return false;
      k.once(s, `${self}:moonlight`);
      k.addCounter(s, bearer, -1);
      s.units[bearer].damage = Math.max(0, Math.min(s.units[bearer].damage, k.hpOf(s, c, bearer) - 1));
      shield(s, bearer, Infinity, {strikeOnly: false});
      return true;
    },
  },
  // LA SCOUMOUNE. Hunter's Instinct: sem efeito (Engage/disengaged removido do jogo); Guardian já vale.
  'artemis-v6-363': {
    declare: (s, c, key, self, target) => vsDevotee(target) && (st => grow(st, c, key, self, 1)),
    ignoresGuardian: (s, c, self, target) => s.units[target]?.prepared === false, // Hunter's Instinct
  },
  'artemis-v6-364': {gearKillInCombat: growBearer},
  // DAPHNE. Interpretação: "becomes engaged" = Strike entre Daphne e um Devotee inimigo, atacando ou sendo alvo.
  'artemis-v6-365': {
    declare: (s, c, key, self, target) => vsDevotee(target) && (st => grow(st, c, key, self, 1)),
    watchDeclare: (s, c, key, self, attacker, target) => target?.uid === self && k.controllerOf(s, attacker) !== key && (st => grow(st, c, key, self, 1)),
  },
  'artemis-v6-366': {startTurn: (s, c, key, self) => { const b = bearer(s, c, key, self); return b && !counters(s, b) && (st => grow(st, c, key, b, 1)); }},
  // HERMIA
  'artemis-v6-367': {
    watchCounter: (s, c, key, self, target) => target !== self && k.controllerOf(s, target) === key && ready(s, key) >= 1 && (st => {
      if (st.units[self] && k.may(c, key, 'LUNAR HARMONY', {uid: self, cost: '{1}{C}'}) && payC(st, key, 1)) grow(st, c, key, self, 1);
    }),
    mods: (s, c, key) => (k.devotees(s, c, key).some(u => named(c, u, 'DAPHNE')) ? [{atk: 2, hp: 2}] : []),
  },
  'artemis-v6-368': {gearDeclare: (s, c, key, self, b) => counters(s, b) > 0 && (st => k.buff(st, b, 1, 1, 'this_round'))},
  // SATYR
  'artemis-v6-369': {
    killInCombat: growSelf(2),
    mods: (s, c, key, self) => { const n = k.gearOf(c, self).length; return n ? [{atk: n, hp: n}] : []; },
  },
  // Primordial Power: "gains Pierce" não vem do parse do bônus. Primordial Awakening: só ao ser jogada já presa.
  'artemis-v6-370': {
    aura: gearAura(() => true, {keywords: ['Pierce']}),
    cast: (s, c, key, self) => bearer(s, c, key, self) && (st => { const b = bearer(st, c, key, self); if (b) grow(st, c, key, b, 2); }),
  },
  // CHANDRA
  'artemis-v6-371': {
    enter: run((st, c, key, self) => { const t = pickFriend(st, c, key, 'DIVINE AWAKENING', {not: self}); if (t) grow(st, c, key, t, 1); }),
    watchCounter: (s, c, key, self, target, n, by) => by === key && target !== self && k.controllerOf(s, target) === key
      && k.onceTurn(s, `${self}:communion`) && (st => { if (k.may(c, key, 'MOONLIT COMMUNION', {uid: self})) k.gainLatent(st, key, 1); }),
  },
  // Divine Emergence (autor, 08/11/2026; Heroic Intervention): até o fim do Round, Imune à facção do God inimigo e não morrem por dano.
  'artemis-v6-372': {spell: {run: (st, c, key) => {
    const faction = st.divine?.[k.other(st, key)]?.god?.replace(/^god-/, '');
    for (const u of k.devotees(st, c, key)) {
      if (faction) (st.v6Immune ||= {})[u] = {round: st.round, faction};
      (st.v6Unbreakable ||= {})[u] = st.round;
    }
    k.emit(st, 'divine_power', {player: key, ability: 'DIVINE EMERGENCE'});
  }}},
  'artemis-v6-373': {
    aura: lord(isArtemis, 1, 1),
    startTurn: run((st, c, key) => growEach(st, c, key, k.chooseUpTo(c, key, 'ETERNAL MOONLIGHT', k.devotees(st, c, key), 2))),
    declare: (s, c, key, self) => ready(s, key) >= 2 && (st => {
      if (k.may(c, key, 'CELESTIAL RADIANCE', {uid: self, cost: '{2}{C}'}) && payC(st, key, 2)) k.buff(st, self, 0, 0, 'this_round', ['Pierce']);
    }),
  },
  'artemis-v6-374': {spell: {run: (st, c, key) => {
    const t = pickFriend(st, c, key, 'SILVER RADIANCE');
    if (t) { grow(st, c, key, t, 2); k.prepare(st, t); }
  }}},
  // THE FIRST MOON GUARDIAN
  'artemis-v6-375': {
    watchDeclare: (s, c, key, self, attacker, target) => k.controllerOf(s, attacker) !== key && vsDevotee(target) && k.controllerOf(s, target.uid) === key
      && k.onceTurn(s, `${self}:vigil`) && (st => grow(st, c, key, self, 1)),
    aura: (s, c, key, self, unit) => (unit !== self && k.controllerOf(s, unit) === key && counters(s, unit) > 0 ? {atk: 0, hp: 1} : null),
  },
  'artemis-v6-376': {spell: {run: (st, c, key) => {
    growEach(st, c, key, k.chooseUpTo(c, key, 'SACRED COVENANT', k.devotees(st, c, key).filter(u => isArtemis(c, u)), 3));
    if (k.devotees(st, c, key).filter(u => isArtemis(c, u)).length >= 3) k.draw(st, key, 1);
  }}},
  // CHLORIS
  'artemis-v6-377': {
    watchEnter: (s, c, key, self, entered) => k.controllerOf(s, entered) === key && k.isDevotee(c, entered) && k.onceTurn(s, `${self}:blooming`)
      && (st => grow(st, c, key, entered, 1)),
    activate: {name: "SPRING'S RENEWAL", cost: 0,
      check: (s, c, key) => { if (!k.devotees(s, c, key).some(u => counters(s, u))) throw new k.RuleError('alvo', 'nenhum Devotee seu com marcador +1/+1'); },
      run: (st, c, key) => {
        const t = k.choose(c, key, "SPRING'S RENEWAL", k.devotees(st, c, key).filter(u => counters(st, u)), {text: 'Remove a Training counter from which Devotee?'});
        if (t) { k.addCounter(st, t, -1); k.draw(st, key, 1); }
      }},
  },
  'artemis-v6-378': {
    startTurn: (s, c, key, self) => bearer(s, c, key, self) && (st => { const b = bearer(st, c, key, self); if (b) grow(st, c, key, b, 1); }),
    bearerDefeated: (s, c, key, self, dead) => st => {
      const options = st.players[key].tartarus.filter(u => u !== dead && k.isDevotee(c, u) && k.costOf(c, u) <= 2);
      const t = k.choose(c, key, "NATURE'S REBIRTH", options, {optional: true, text: 'Return a Devotee with Casting Cost 2 or less to your hand?'});
      if (t) k.toHand(st, c, t, 'tartarus');
    },
  },
  'artemis-v6-379': {
    gearDeclare: buffBearer(2, 0), // Celestial Arrow (31/10/2026): +2 ATK contra Devotee; o dano fixo saiu (papel de Ares)
    gearKillInCombat: (s, c, key, self, b) => (k.hasType(c, b, 'Satellite') || k.hasType(c, b, 'Lunar Guardian')) && (st => grow(st, c, key, b, 1)),
  },
  'artemis-v6-380': {
    aura: gearAura(() => true, {keywords: ['Pierce']}),
    gearDeclare: buffBearer(2, 0),
    gearKillInCombat: (s, c, key, self) => k.onceTurn(s, `${self}:aim`) && (st => { if (k.may(c, key, 'UNERRING AIM', {uid: self})) k.draw(st, key, 1); }),
  },
  // Forest Blessing (Exploration): Base de Cosmo adicional por Round (§58).
  'artemis-v6-381': {extraBase: true},
  'artemis-v6-382': {mods: (s, c, key, self) => (k.devotees(s, c, key).some(u => u !== self && k.hasType(c, u, 'Sacred Beast')) ? [{atk: 1, hp: 0}] : [])},
  'artemis-v6-383': {killInCombat: growSelf(1)},
  'artemis-v6-384': {
    mods: (s, c, key, self) => {
      const n = Math.min(3, k.devotees(s, c, key).filter(u => u !== self && k.hasType(c, u, 'Sacred Beast')).length);
      return n ? [{atk: n, hp: n}] : [];
    },
    // Crushing Coils (autor, 31/10/2026): "may have it Strike target enemy Devotee with ATK 3 or less. It ignores Guardian."
    // shortcut: Strike resolvido aqui (dano simultâneo pelo ATK, sem gastar o Strike nem disparar gatilhos de Strike); usar o
    // declareStrike quando ele aceitar um Strike fora da fase, sem Prepared.
    enter: run((st, c, key, self) => {
      const t = k.choose(c, key, 'CRUSHING COILS', k.enemies(st, c, key).filter(u => k.atkOf(st, c, u) <= 3), {optional: true, text: 'Strike an enemy Devotee with ATK 3 or less (ignores Guardian)?'});
      if (!t || !k.onField(st, key, self)) return;
      const mine = k.atkOf(st, c, self), theirs = k.atkOf(st, c, t);
      k.damage(st, c, t, mine);
      k.damage(st, c, self, theirs);
    }),
  },
  'artemis-v6-385': {declare: growSelf(1), killInCombat: drawOne},
  // 386 Lunar Offering: Cosmo gerado vira Latent comum, sem a restrição de uso (guia §63, autor 29/10/2026).
  'artemis-v6-386': {activate: {name: 'LUNAR OFFERING', cost: 0, run: (st, c, key) => k.gainLatent(st, key, 1)}},
  'artemis-v6-387': {watchCounter: (s, c, key, self, target, n, by) => by === key && target !== self && k.controllerOf(s, target) === key
    && (st => k.buff(st, self, 1, 1, 'this_round'))},
  // Precise Hunt (Reclamation Sage).
  'artemis-v6-388': {enter: (s, c, key) => k.allEquipment(s, c).length > 0 && (st => {
    const t = k.choose(c, key, 'PRECISE HUNT', k.allEquipment(st, c), {optional: true, text: 'Destroy target Equipment?'});
    if (t) k.destroyEquipment(st, c, t);
  })},
  // Ferocious Instinct (Lotus Cobra): Base posta pelo jogador.
  'artemis-v6-389': {watchBase: (s, c, key, self, player) => player === key && k.once(s, `${self}:cobra`) && (st => k.gainLatent(st, key, 1))},
  // Celestial Cultivation (Hardened Scales): substituição, uma vez por Round por Acólito.
  'artemis-v6-390': {counterBonus: (s, c, key, self, uid, n) =>
    (k.controllerOf(s, uid) === key && k.isDevotee(c, uid) && k.once(s, `${self}:scales`) ? n + 1 : n)},
  'artemis-v6-391': {
    activate: {name: 'ANCIENT RESILIENCE', cost: 0, tap: false,
      check: (s, c, key, self) => { if (!counters(s, self)) throw new k.RuleError('custo', 'sem marcador +1/+1'); },
      run: (st, c, key, self) => { k.addCounter(st, self, -1); shield(st, self, 2, {strikeOnly: false, duration: 'this_round'}); }},
    mods: (s, c, key, self) => (counters(s, self) ? [{keywords: ['Guardian']}] : []),
  },
  'artemis-v6-392': {mods: (s, c, key, self) => (counters(s, self) ? [{keywords: ['Pierce']}] : [])},
  'artemis-v6-393': {mods: (s, c, key, self) => (k.devotees(s, c, key).some(u => u !== self && k.hasType(c, u, 'Satellite')) ? [{atk: 1, hp: 0}] : [])},
  'artemis-v6-394': {enter: buffSelf(1, 0)},
  'artemis-v6-395': {watchCounter: (s, c, key, self, target) => target === self && (st => k.gainSoul(st, key, 1))},
  'artemis-v6-396': {defeated: run((st, c, key) => k.gainLatent(st, key, 1))},
  // 397 Living Roots: pendente: a engine não rastreia a origem do Cosmo gasto.
  'artemis-v6-397': {
    activate: {name: 'VERDANT CHANNELING', cost: 0, run: (st, c, key, self) => { k.gainLatent(st, key, 1); (st.v6Dryad ||= {})[self] = st.turn; }},
    // Living Roots (autor, 30/10/2026): se a Dryad gerou Cosmo neste turno, o primeiro Devotee conjurado no turno entra com +1/+1.
    watchEnter: (s, c, key, self, entered) => s.v6Dryad?.[self] === s.turn && wasCast(s, entered) && k.controllerOf(s, entered) === key
      && s.events.find(e => e.type === 'card_played' && e.kind === 'Devotee' && !e.from && e.player === key && e.turn === s.turn)?.uid === entered
      && (st => grow(st, c, key, entered, 1)),
  },
  // Moonlit Blessing (Eternal Witness).
  'artemis-v6-398': {enter: run((st, c, key) => {
    const t = k.choose(c, key, 'MOONLIT BLESSING', st.players[key].tartarus.filter(u => k.costOf(c, u) <= 3), {text: 'Return a card with cost 3 or less from your Tartarus.'});
    if (t) k.toHand(st, c, t, 'tartarus');
  })},
  'artemis-v6-399': {mods: (s, c, key, self) => (k.devotees(s, c, key).some(u => u !== self && k.hasType(c, u, 'Forest Guardian')) ? [{atk: 1, hp: 1}] : [])},
  // PRIMAL FOREST GUARDIAN
  'artemis-v6-400': {
    watchCounter: (s, c, key, self, target) => target !== self && k.controllerOf(s, target) === key && k.onceTurn(s, `${self}:growth`)
      && (st => grow(st, c, key, self, 1)),
    aura: (s, c, key, self, unit) => (unit !== self && k.controllerOf(s, unit) === key && counters(s, self) >= 3 ? {keywords: ['Pierce']} : null),
  },
  'artemis-v6-401': {watchCounter: (s, c, key, self, target) => target === self && (st => k.buff(st, self, 1, 0, 'this_round'))},
  'artemis-v6-402': {enter: run((st, c, key) => lookTop(st, c, key, 'LUNAR GUIDANCE', 3, u => k.isDevotee(c, u)))},
  'artemis-v6-403': {enter: run((st, c, key) => {
    const deck = st.players[key].deck, top = deck[0];
    if (top && k.may(c, key, 'FOREST FORAGING', {uid: top, text: 'Put the top card of your deck on the bottom?'})) deck.push(deck.shift());
  })},
  'artemis-v6-404': {
    aura: lord((c, u) => k.hasType(c, u, 'Sacred Beast'), 1, 0),
    // Call the Pack (Scute Swarm): 1 Wolf por outro Sacred Beast seu, máximo 3.
    enter: run((st, c, key, self) => {
      const n = Math.min(3, k.devotees(st, c, key).filter(u => u !== self && k.hasType(c, u, 'Sacred Beast')).length);
      for (let i = 0; i < n; i++) k.summonToken(st, c, key, {id: 'token-wolf', name: 'Wolf', atk: 1, hp: 1, type: 'Sacred Beast Wolf'});
    }),
  },
  'artemis-v6-405': {
    enter: run((st, c, key, self) => growEach(st, c, key, k.chooseUpTo(c, key, 'ANCIENT GROWTH', k.devotees(st, c, key).filter(u => u !== self), 2))),
    mods: (s, c, key, self) => {
      const n = Math.min(3, k.devotees(s, c, key).filter(u => u !== self && counters(s, u)).length);
      return n ? [{atk: n, hp: n}] : [];
    },
  },
  // 406 Divine Training (gancho watchAttach): Equipment preso à Huntress (jogado já equipado ou equipado depois) põe +1/+1 nela.
  'artemis-v6-406': {
    declare: (s, c, key, self, target) => vsDevotee(target) && (st => k.buff(st, self, 1, 1, 'this_round')),
    watchAttach: (s, c, key, self, gear, bearer) => bearer === self && k.controllerOf(s, self) === key && (st => grow(st, c, key, self, 1)),
  },
  // Primal Channeling (autor, 31/10/2026: Latent não paga Devotee): "{T}: The next Devotee you cast this turn costs 1 less."
  // Ativações no mesmo turno somam até o próximo Devotee; a `tag` é gasta quando o custo é pago (play.js, costLess).
  // shortcut: o desconto vem da Shaman em campo (gancho costLess); se ela sair antes do cast, o desconto some.
  'artemis-v6-407': {
    activate: {name: 'PRIMAL CHANNELING', cost: 0, run: (st, c, key) => {
      const p = st.primal?.[key];
      if (p && p.turn === st.turn && !st.roundUses.has(p.tag)) p.n += 1;
      else (st.primal ||= {})[key] = {turn: st.turn, n: 1, tag: `primal:${key}:${st.turn}:${st.primalSeq = (st.primalSeq || 0) + 1}`};
    }},
    costLess: (s, c, key, self, uid) => {
      const p = s.primal?.[key], first = k.devotees(s, c, key).find(u => c.objects[u]?.cardId === 'artemis-v6-407');
      return self === first && k.isDevotee(c, uid) && p?.turn === s.turn && !s.roundUses.has(p.tag) && {n: p.n, tag: p.tag};
    },
    watchEnter: (s, c, key, self, entered) => k.controllerOf(s, entered) === key && k.isDevotee(c, entered) && wasCast(s, entered) && k.costOf(c, entered) >= 5
      && k.onceTurn(s, `${self}:wisdom`) && (st => { if (k.may(c, key, "NATURE'S WISDOM", {uid: self})) k.draw(st, key, 1); }),
  },
  'artemis-v6-408': {enter: run((st, c, key) => k.gainSoul(st, key, 2))},
  'artemis-v6-409': {gearDeclare: buffBearer(1, 0)},
  'artemis-v6-410': {gearKillInCombat: (s, c, key, self) => k.onceTurn(s, `${self}:supply`) && (st => {
    if (k.may(c, key, "HUNTER'S SUPPLY", {uid: self})) { k.draw(st, key, 1); k.discard(st, c, key, 1, "HUNTER'S SUPPLY"); }
  })},
  'artemis-v6-411': k.sword('SILVERWOOD SPEAR', 'poseidon', 'hades'),
  // Remover marcador do portador é custo de habilidade ativada: AÇÃO (guia §56).
  'artemis-v6-412': {activate: {name: 'LUNAR SHELTER', cost: 0, tap: false,
    check: (s, c, key, self) => { const b = bearer(s, c, key, self); if (!b || !counters(s, b)) throw new k.RuleError('custo', 'portador sem marcador +1/+1'); },
    run: (st, c, key, self) => { const b = bearer(st, c, key, self); k.addCounter(st, b, -1); shield(st, b, 2, {strikeOnly: false, duration: 'this_round'}); }}},
  'artemis-v6-413': {gearKillInCombat: growBearer},
  // {T} de Equipment: a engine não prepara Equipment; `once` (1 por Round) equivale a virar e renovar no seu turno.
  // shortcut: "only to cast a Devotee" não é aplicado. Lunar Resonance: o parse do preview aplica +1/+1 sempre; a aura
  // desconta quando a condição não vale.
  'artemis-v6-414': {
    activate: {name: 'VERDANT CHANNELING', cost: 0, tap: false, once: true, run: (st, c, key) => k.gainLatent(st, key, 1)},
    aura: gearAura((s, c, key, unit) => !k.devotees(s, c, key).some(u => u !== unit && counters(s, u)), {atk: -1, hp: -1}),
  },
  'artemis-v6-415': {aura: gearAura((s, c, key, unit) => counters(s, unit) > 0, {keywords: ['Guardian']})},
  'artemis-v6-416': {watchEnter: (s, c, key, self, entered) => {
    const b = bearer(s, c, key, self);
    return b && entered !== b && k.controllerOf(s, entered) === key && k.isDevotee(c, entered) && k.onceTurn(s, `${self}:growth`) && (st => {
      if (bearer(st, c, key, self) === b && k.may(c, key, 'ANCIENT GROWTH', {uid: b})) grow(st, c, key, b, 1);
    });
  }},
  'artemis-v6-417': {spell: {run: (st, c, key) => k.topToBase(st, key)}},
  // The Forest Answers (autor, 06/11/2026): escolha um, Primal Strike ou Overgrowth (destrói Equipment).
  // Call of the Forest (Green Sun's Zenith): Devotee de custo 3 ou menos do deck ao campo, Unprepared.
  'artemis-v6-418': {spell: {run: (st, c, key) => {
    const options = st.players[key].deck.filter(u => k.isDevotee(c, u) && k.costOf(c, u) <= 3);
    const pick = options.length ? c.decide?.(key, {ability: 'CALL OF THE FOREST', options, choose: 'search', text: 'Choose a Devotee to put onto the Battlefield.'}) : null;
    if (pick) k.putOntoField(st, c, key, pick, 'deck', {prepared: false});
    k.shuffleDeck(st, key);
  }}},
  'artemis-v6-419': {spell: {run: (st, c, key) => { const t = pickFriend(st, c, key, 'WILD STRENGTH'); if (t) k.buff(st, t, 3, 3, 'this_round', ['Pierce']); }}},
  'artemis-v6-420': {spell: {run: (st, c, key) => {
    const deck = st.players[key].deck, look = deck.slice(0, 3);
    const pick = k.choose(c, key, 'LUNAR PROSPERITY', look, {text: 'Choose a card to put into your Cosmo Bank.'});
    if (pick) toBase(st, key, pick);
    const rest = look.filter(u => u !== pick);
    rest.forEach(u => deck.splice(deck.indexOf(u), 1));
    deck.push(...rest);
  }}},
  'artemis-v6-421': {spell: {run: (st, c, key) => {
    const t = pickFriend(st, c, key, 'PRIMAL BLESSING');
    if (!t) return;
    grow(st, c, key, t, 1);
    if (st.units[t] && k.atkOf(st, c, t) >= 4) maybeTopToBase(st, c, key, 'NATURAL EXPANSION');
  }}},
  // Predator's Challenge (Beast Within): destrói Devotee ou Equipment; o controlador cria um Forest Guardian 3/3.
  'artemis-v6-422': {spell: {
    check: k.needTarget((s, c) => [...k.allDevotees(s, c), ...k.allEquipment(s, c)], 'sem Devotee ou Equipment'),
    run: (st, c, key) => {
      const t = k.choose(c, key, "PREDATOR'S CHALLENGE", [...k.allDevotees(st, c), ...k.allEquipment(st, c)], {text: 'Destroy target Devotee or Equipment.'});
      const owner = t && k.controllerOf(st, t);
      if (!owner) return;
      if (k.isDevotee(c, t)) k.defeat(st, c, t); else k.destroyEquipment(st, c, t);
      k.summonToken(st, c, owner, {id: 'token-forest-guardian', name: 'Forest Guardian', atk: 3, hp: 3, type: 'Forest Guardian'});
    }}},
  'artemis-v6-423': {spell: {run: (st, c, key) => { k.topToBase(st, key); k.topToBase(st, key); }}},
  'artemis-v6-424': {spell: {run: (st, c, key) => {
    const src = pickFriend(st, c, key, 'MOONLIT EXECUTION');
    blast(st, c, src, src && pickEnemy(st, c, key, 'MOONLIT EXECUTION'), src && k.hasType(c, src, 'Satellite') ? 1 : 0);
  }}},
  'artemis-v6-425': {spell: {run: (st, c, key) => {
    const t = k.choose(c, key, 'NATURAL RENEWAL', st.players[key].tartarus.filter(u => k.isDevotee(c, u)), {text: 'Return a Devotee from your Tartarus.'});
    if (t && k.toHand(st, c, t, 'tartarus') && k.costOf(c, t) >= 4) k.gainSoul(st, key, 2);
  }}},
  'artemis-v6-426': {spell: {run: (st, c, key) => {
    growEach(st, c, key, k.devotees(st, c, key), 2);
    k.devotees(st, c, key).filter(u => k.atkOf(st, c, u) >= 5).forEach(u => k.buff(st, u, 0, 0, 'this_round', ['Pierce']));
  }}},

  // ---------- Draw engines (autor, 01/11/2026; docs/draw-engines-2026-11-01/cards.diff.md): vencem as chaves acima ----------
  'artemis-v6-387': {enter: (s, c, key) => st => k.draw(st, key, 1)},
  'artemis-v6-401': {watchEnter: (s, c, key, self, entered) => entered !== self && k.controllerOf(s, entered) === key && /Sacred Beast/.test(k.card(c, entered)?.type || '') && k.onceTurn(s, `${self}:call`) && (st => k.draw(st, key, 1))},
  'artemis-v6-426': {spell: {run: (st, c, key) => {
    const mine = k.devotees(st, c, key), big = mine.filter(u => k.atkOf(st, c, u) >= 4).length;
    k.draw(st, key, mine.length);
    if (!st.victory && big) k.gainSoul(st, key, 2 * big);
  }}},
  'artemis-v6-425': {spell: {run: (st, c, key) => {
    const p = st.players[key];
    for (let i = 0; i < 3 && p.tartarus.length; i++) {
      const t = k.choose(c, key, 'NATURAL RENEWAL', [...p.tartarus], {optional: true, text: 'Shuffle a card from your Tartarus into your deck?'});
      if (!t) break;
      p.tartarus.splice(p.tartarus.indexOf(t), 1); p.deck.push(t);
    }
    k.shuffleDeck(st, key);
    k.draw(st, key, 1);
  }}},
  'artemis-v6-416': {watchEnter: (s, c, key, self, entered) => {
    const b = bearer(s, c, key, self);
    return b && entered !== b && k.controllerOf(s, entered) === key && k.isDevotee(c, entered) && k.atkOf(s, c, entered) >= 4 && (st => k.draw(st, key, 1));
  }},
  'artemis-v6-414': {aura: gearAura((s, c, key, unit) => !k.devotees(s, c, key).some(u => u !== unit && counters(s, u)), {atk: -1, hp: -1}), startTurn: (s, c, key, self) => bearer(s, c, key, self) && (st => {
    if (st.players[key].soul > 2 && k.may(c, key, 'ANCIENT RHYTHM', {uid: self, text: 'Lose 2 Soul to draw a card?'})) { k.loseSoulOf(st, key, 2); if (!st.victory) k.draw(st, key, 1); }
  })},
  // ---------- Domains (rebalanceamento aprovado pelo autor em 01/11/2026, docs/domains-rebalance-proposta.md) ----------
  // Linha geral (qualquer God): ganchos e `activate`. Ressonância — Artemis (só com God Artemis): `res` (ativada, uid
  // `domain:${key}:res`, uma vez por turno) e `resonance` (gatilhos). Training counter = marcador +1/+1 (grow).
  'artemis-v6-427': {
    aura: (s, c, key, self, unit) => (k.controllerOf(s, unit) === key && k.hasType(c, unit, 'Satellite') ? {atk: 0, hp: 1} : null),
    res: {name: 'RESONANCE', cost: 3, run: (s, c, key) => growEach(s, c, key, k.devotees(s, c, key).filter(u => k.hasType(c, u, 'Satellite')), 1)},
  },
  'artemis-v6-428': {
    watchEnter: (s, c, key, self, entered) => k.controllerOf(s, entered) === key && k.isDevotee(c, entered) && k.costOf(c, entered) >= 4
      && k.once(s, `${self}:forest`) && (st => k.gainSoul(st, key, 1)), // Forest Blessing
    res: {name: 'RESONANCE', cost: 2, run: (s, c, key) => { k.topToBase(s, key, false); }},
  },
  'artemis-v6-429': {
    // Nerf (autor, 02/11/2026): o +1 PV deixou de ser fixo; vale só para quem declara Strike, até o fim do turno.
    watchDeclare: (s, c, key, self, attacker) => k.controllerOf(s, attacker) === key && counters(s, attacker) > 0
      && (st => k.buff(st, attacker, 0, 1, 'this_turn')),
    resonance: {watchSurvive: (s, c, key, self, unit) => k.controllerOf(s, unit) === key && counters(s, unit) > 0
      && k.resPay(s, c, key, 'survive', 2, 'RESONANCE', st => grow(st, c, key, unit, 1), {text: 'Pay {2}{C}: put a Training counter on it?'})},
  },
  'artemis-v6-430': {
    watchDeclare: (s, c, key, self, attacker, target) => k.controllerOf(s, attacker) === key && vsDevotee(target) && k.atkOf(s, c, attacker) >= 4
      && k.once(s, `${self}:hunter`) && (st => k.buff(st, attacker, 1, 0, 'this_strike')),
    res: {name: 'RESONANCE', cost: 2, check: k.needTarget((s, c, key) => k.devotees(s, c, key).filter(u => k.atkOf(s, c, u) >= 4), 'sem Devotee aliado com ATK 4 ou mais'),
      run: (s, c, key) => {
        const t = k.choose(c, key, 'RESONANCE', k.devotees(s, c, key).filter(u => k.atkOf(s, c, u) >= 4), {text: 'Choose target friendly Devotee with ATK 4 or greater.'});
        if (t) k.buff(s, t, 0, 0, 'this_round', ['Pierce']);
      }},
  },
  // The Night Vale — Night Hunt: você põe uma Base (placeBase), alvo amigo +1 ATK até o fim do Round (uma vez por Round).
  'artemis-v6-524': {
    watchBase: (s, c, key, self, player) => player === key && k.devotees(s, c, key).length > 0 && k.once(s, `${self}:night`)
      && (st => { const t = pickFriend(st, c, key, 'NIGHT HUNT'); if (t) k.buff(st, t, 1, 0); }),
    res: {name: 'RESONANCE', cost: 2, check: k.needTarget(k.devotees, 'sem Devotee aliado'),
      run: (s, c, key) => { const t = pickFriend(s, c, key, 'RESONANCE'); if (t) k.buff(s, t, 2, 2); }},
  },
  // Artemis V2.0 (autor, 06/11/2026): 431–436 são os Anjos Celestes e suas Glories; a sinergia de Satellite virou Angel.
  'artemis-v6-431': {
    aura: lord((c, u) => k.hasType(c, u, 'Angel'), 1, 1),
    enter: run((st, c, key) => {
      const src = k.choose(c, key, 'DIVINE JUDGMENT', k.devotees(st, c, key).filter(u => k.hasType(c, u, 'Angel')), {text: 'Choose a friendly Angel.'});
      blast(st, c, src, src && pickEnemy(st, c, key, 'DIVINE JUDGMENT'));
    }),
  },
  'artemis-v6-432': {gearKillInCombat: run((st, c, key, self, b) =>
    growEach(st, c, key, k.chooseUpTo(c, key, 'HEAVENLY ASCENDANCY', k.devotees(st, c, key).filter(u => u !== b), 2)))},
  'artemis-v6-433': {
    enter: run((st, c, key, self) => blast(st, c, self, pickEnemy(st, c, key, 'CELESTIAL DESCENT'))),
    mods: perBank,
  },
  // Heavenly Guard ("gains Guardian") não vem do parse do bônus.
  'artemis-v6-434': {
    aura: gearAura(() => true, {keywords: ['Guardian']}),
    startTurn: (s, c, key, self) => bearer(s, c, key, self) && bank(s, key) >= 6 && (st => { const b = bearer(st, c, key, self); if (b) grow(st, c, key, b, 1); }),
  },
  'artemis-v6-435': {
    // Celestial Reversal (ex-Precise Execution, 31/10/2026): fight opcional no lugar dos 3 de dano.
    enter: run((st, c, key, self) => {
      if (!k.enemies(st, c, key).length || !k.may(c, key, 'CELESTIAL REVERSAL', {uid: self, text: 'Fight target enemy Devotee?'})) return;
      fight(st, c, self, pickEnemy(st, c, key, 'CELESTIAL REVERSAL'));
    }),
    watchDeclare: (s, c, key, self, attacker, target) => k.controllerOf(s, attacker) === key && k.hasType(c, attacker, 'Angel') && vsDevotee(target)
      && (st => k.buff(st, attacker, 1, 0, 'this_round')),
    killInCombat: drawOne,
  },
  'artemis-v6-436': {
    gearDeclare: buffBearer(2, 0),
    gearKillInCombat: (s, c, key, self) => k.onceTurn(s, `${self}:accuracy`) && (st => k.draw(st, key, 1)),
  },
  'artemis-v6-437': {
    enter: run((st, c, key) => k.topToBase(st, key)),
    mods: (s, c, key) => (bank(s, key) >= 6 ? [{atk: 2, hp: 2}] : []),
  },
  // 438 Lunar Resistance (gancho prevent): previne 1 de todo dano que receber (Strike ou efeito).
  'artemis-v6-438': {prevent: (s, c, key, self, amount) => Math.min(1, amount), watchCounter: (s, c, key, self, target, n, by) => target === self && by === key && k.onceTurn(s, `${self}:blessing`)
    && (st => k.gainSoul(st, key, 2))},
  'artemis-v6-439': {
    declare: (s, c, key, self, target) => vsDevotee(target) && (st => k.buff(st, self, 2, 0, 'this_round')),
    killInCombat: run((st, c, key) => k.topToBase(st, key)),
  },
  'artemis-v6-440': {
    mods: perBank,
    enter: run((st, c, key, self) => blast(st, c, self, pickEnemy(st, c, key, 'LUNAR DEVASTATION'))),
    killInCombat: run((st, c, key, self) => growEach(st, c, key, k.devotees(st, c, key).filter(u => u !== self))),
  },
  // Divine Return (Splendid Reclamation): até 2 cartas do Tartarus viram Base Unprepared.
  'artemis-v6-441': {spell: {run: (st, c, key) => {
    const p = st.players[key];
    for (const u of k.chooseUpTo(c, key, 'DIVINE RETURN', [...p.tartarus], 2, {text: 'Choose up to two cards to put into your Cosmo Bank.'})) {
      p.tartarus.splice(p.tartarus.indexOf(u), 1);
      p.bases.push({uid: u, prepared: false});
      k.emit(st, 'base_added', {player: key, prepared: false});
    }
  }}},
  'artemis-v6-442': {spell: {run: (st, c, key) => {
    search(st, c, key, 'SACRED GATHERING', card => /Lunar Guardian/.test(card.type));
    const mine = k.devotees(st, c, key).filter(u => isArtemis(c, u));
    if (mine.length >= 3) growEach(st, c, key, mine);
  }}},
  'artemis-v6-443': {spell: {run: (st, c, key) => {
    const a = pickFriend(st, c, key, "HUNTER'S CHALLENGE"), b = a && pickEnemy(st, c, key, "HUNTER'S CHALLENGE");
    if (!b) return;
    fight(st, c, a, b);
    if (!k.controllerOf(st, b)) k.draw(st, key, 1);
  }}},
  // Nature's Army: dois tokens Forest Guardian 3/3 (guia §63, autor 29/10/2026).
  'artemis-v6-444': {spell: {run: (st, c, key) => {
    k.topToBase(st, key); k.topToBase(st, key);
    for (let i = 0; i < 2; i++) k.summonToken(st, c, key, {id: 'token-forest-guardian', name: 'Forest Guardian', atk: 3, hp: 3, type: 'Forest Guardian'});
  }}},
  'artemis-v6-445': {spell: {run: (st, c, key) => {
    const t = pickFriend(st, c, key, 'DIVINE DEFIANCE');
    if (!t) return;
    k.buff(st, t, 3, 3, 'this_round');
    shield(st, t, Infinity, {strikeOnly: false, duration: 'this_round'});
  }}},
  'artemis-v6-446': {spell: {run: (st, c, key) => {
    search(st, c, key, 'DIVINE TRANSFORMATION', (card, uid) => isArtemis(c, uid) && card.cost.amount <= 5);
    const t = pickFriend(st, c, key, "MOON GODDESS' GIFT");
    if (t) grow(st, c, key, t, 2);
  }}},
  'artemis-v6-447': {spell: {run: (st, c, key) => {
    const t = pickFriend(st, c, key, 'SACRED SACRIFICE', {optional: true});
    if (!t) return;
    const guardian = k.hasType(c, t, 'Lunar Guardian');
    k.defeat(st, c, t);
    k.draw(st, key, 2);
    k.topToBase(st, key);
    if (guardian) growEach(st, c, key, k.devotees(st, c, key));
  }}},
  // Alvos e ATK lidos antes do dano (simultâneo); derrotas checadas no fim.
  'artemis-v6-448': {spell: {run: (st, c, key) => {
    const src = pickFriend(st, c, key, 'NATURAL SELECTION');
    const atk = src ? k.atkOf(st, c, src) : 0;
    if (atk <= 0) return;
    for (const u of k.enemies(st, c, key).filter(e => k.atkOf(st, c, e) < atk)) k.damageDevotee(st, c, u, atk, false);
    k.checkDefeats(st, c);
  }}},
  'artemis-v6-449': {spell: {run: (st, c, key) => k.devotees(st, c, key).forEach(u => k.buff(st, u, 3, 3, 'this_round', ['Pierce']))}},
  'artemis-v6-450': {spell: {run: (st, c, key) => {
    for (let i = 0; i < 3; i++) k.topToBase(st, key);
    growEach(st, c, key, k.devotees(st, c, key), 2);
    k.draw(st, key, Math.min(3, k.devotees(st, c, key).filter(u => k.atkOf(st, c, u) >= 6).length));
  }}},
};
