// Cartas novas de 08/11/2026 (docs/proposta-cartas-novas.md, ids 525–605): as 45 com habilidade.
// As vanillas não têm entrada. Regras novas no guia §58: Pariah (godRedirect), Worship (soulFloor), rodada extra
// (state.extraRounds), jogar do topo pagando Soul (zonePlay soulInstead), Doubling Season (doubles), imposto de alvo (targetTax).
import * as k from './kit.js';

const MT = /Moment|Technique|Event|Miracle/;
const isMT = (c, uid) => k.card(c, uid)?.kind === 'Spell' && MT.test(k.card(c, uid)?.type || '');
const isMoment = (c, uid) => /Moment/.test(k.card(c, uid)?.type || '');
const isToken = (c, uid) => !!c.objects[uid]?.token;
const enemyGod = (s, key) => k.godTarget(k.other(s, key));
const bothGods = s => s.order.map(k.godTarget);
const enemyGear = (s, c, key) => s.players[k.other(s, key)].battlefield.filter(u => k.card(c, u)?.kind === 'Equipment');
const alive = (s, uid) => !!s.units[uid];
// Conjurado (não veio de efeito nem é token): último card_played do uid.
const wasCast = (s, uid) => { const e = s.events.findLast(x => x.type === 'card_played' && x.uid === uid); return !!e && !e.from && !e.token; };
const soldier = {id: 'neutral-token-sanctuary-soldier', name: 'Sanctuary Soldier', atk: 1, hp: 1, type: 'Soldier'};
const mode = (c, key, ability, options, text = 'Choose one.') =>
  (options.length <= 1 ? options[0] ?? null : c.decide?.(key, {ability, options, choose: 'mode', text}) ?? options[0]);
function scry(st, c, key, ability) {
  const deck = st.players[key].deck;
  if (deck.length && k.may(c, key, ability, {uid: deck[0], text: 'Put the top card of your deck on the bottom?'})) deck.push(deck.shift());
}
// Custo adicional "sacrifique um Devotee [que passe em `filter`]" (§58: pago ao conjurar, depois do custo principal).
const sacrificeCost = (ability, filter = () => true) => ({
  check: (s, c, key) => { if (!k.devotees(s, c, key).some(u => filter(c, u))) throw new k.RuleError('custo', 'sem Devotee para sacrificar'); },
  cost: (st, c, key) => {
    const list = k.devotees(st, c, key).filter(u => filter(c, u));
    const pick = k.choose(c, key, ability, list, {text: 'Sacrifice a Devotee.'}) || list[0];
    if (pick) k.sacrifice(st, c, pick);
  },
});

export default {
  // ---------- Athena ----------
  // Saint's Burden (Pariah): o dano que iria ao seu God vai ao Devotee equipado.
  'athena-v6-531': {godRedirect: (s, c, key, self) => { const b = k.bearerOf(c, self); return b && k.onField(s, key, b) ? b : null; }},
  // Exile to Star Hill (Path to Exile).
  'athena-v6-532': {spell: {
    check: k.needTarget((s, c, key) => k.enemies(s, c, key)),
    run: (st, c, key) => {
      const t = k.choose(c, key, 'EXILE TO STAR HILL', k.enemies(st, c, key), {text: 'Send target enemy Devotee to the Void.'});
      const owner = t && k.controllerOf(st, t);
      if (owner && k.exile(st, c, t)) k.topToBase(st, owner, false);
    }}},
  // Raised Banner (Intangible Virtue): tokens aliados +1/+1.
  'athena-v6-533': {aura: (s, c, key, self, unit) => (unit !== self && k.controllerOf(s, unit) === key && isToken(c, unit) ? {atk: 1, hp: 1} : null)},
  // Hymn of the Saints (Cathars' Crusade).
  'athena-v6-534': {watchEnter: (s, c, key, self, entered) => k.controllerOf(s, entered) === key && k.isDevotee(c, entered)
    && (st => { for (const u of k.devotees(st, c, key)) k.addCounter(st, u, 1); })},
  // Unbreakable Formation: Guardian na rodada; com Gold Saint, também não são derrotados por dano.
  'athena-v6-535': {spell: {run: (st, c, key) => {
    const mine = k.devotees(st, c, key), gold = mine.some(u => k.hasType(c, u, 'Gold Saint'));
    for (const u of mine) {
      k.buff(st, u, 0, 0, 'this_round', ['Guardian']);
      if (gold) (st.v6Unbreakable ||= {})[u] = st.round;
    }
  }}},
  // Temple Gate: Strike inimigo contra o seu God leva 2 de dano.
  'athena-v6-536': {watchDeclare: (s, c, key, self, attacker, target) => target?.kind === 'god' && target.player === key
    && k.controllerOf(s, attacker) !== key && (st => { if (alive(st, self) && alive(st, attacker)) k.damage(st, c, attacker, 2); })},
  // Rallying Volley (Adeline): token ao declarar Strike.
  'athena-v6-537': {declare: (s, c, key) => st => { k.summonToken(st, c, key, soldier); }},
  // Elder's Blessing (Elesh Norn).
  'athena-v6-538': {aura: (s, c, key, self, unit) => {
    if (unit === self || !k.isDevotee(c, unit)) return null;
    return k.controllerOf(s, unit) === key ? {atk: 1, hp: 1} : {atk: -1, hp: -1};
  }},
  // Victory's Promise (Worship): com um Devotee seu, o Soul do seu God não cai abaixo de 1.
  'athena-v6-539': {soulFloor: (s, c, key) => k.devotees(s, c, key).length > 0},

  // ---------- Poseidon ----------
  'poseidon-v6-546': {enter: (s, c, key) => st => k.draw(st, key, 2)}, // Mulldrifter
  // Rapid Hybridization.
  'poseidon-v6-547': {spell: {
    check: k.needTarget((s, c) => k.allDevotees(s, c)),
    run: (st, c, key) => {
      const t = k.choose(c, key, 'SEA CHANGE', k.allDevotees(st, c), {text: 'Defeat target Devotee.'});
      const owner = t && k.controllerOf(st, t);
      if (!owner) return;
      k.defeat(st, c, t);
      k.summonToken(st, c, owner, {id: 'token-sea-beast', name: 'Sea Beast', atk: 3, hp: 3, type: 'Sea Beast'});
    }}},
  // Spell Pierce: contraria a Technique inimiga, salvo se o controlador pagar {2}{C}.
  'poseidon-v6-548': {spell: {
    check: k.needTarget((s, c, key) => enemyTechniques(s, c, key), 'sem Technique inimiga na cadeia'),
    run: (st, c, key) => {
      const t = k.choose(c, key, 'UNDERTOW PIERCE', enemyTechniques(st, c, key), {text: 'Counter target enemy Technique.'});
      if (!t || !k.spellOnChain(st, t)) return;
      const foe = c.objects[t].owner;
      if (k.canPayCosmo(st, foe, 2) && k.may(c, foe, 'UNDERTOW PIERCE', {uid: t, cost: '{2}{C}', text: 'Pay {2}{C} so your Technique is not countered?'})) k.payCosmo(st, foe, 2);
      else k.counterSpell(st, c, t);
    }}},
  // Aqueous Form: ignora Guardian; ao declarar Strike, scry 1.
  'poseidon-v6-549': {bearerIgnoresGuardian: true, gearDeclare: (s, c, key) => st => scry(st, c, key, 'AQUEOUS FORM')},
  // Dig Through Time (delve, §58): olha 4, fica com 2, o resto ao Tartarus.
  'poseidon-v6-550': {
    selfCostLess: (s, c, key) => (s.players[key].tartarus.length ? {n: s.players[key].tartarus.length} : null),
    spell: {
      cost: (st, c, key, uid) => {
        const p = st.players[key], n = Math.min(p.tartarus.length, k.costOf(c, uid));
        let pick = k.chooseUpTo(c, key, 'DELVE', [...p.tartarus], n, {text: `Choose ${n} cards to send to the Void.`}).filter(u => p.tartarus.includes(u)).slice(0, n);
        if (pick.length < n) pick = [...pick, ...p.tartarus.filter(u => !pick.includes(u))].slice(0, n);
        for (const u of pick) k.exile(st, c, u, 'tartarus');
      },
      run: (st, c, key) => {
        const p = st.players[key], look = p.deck.slice(0, 4);
        let keep = k.pickUpTo(c, key, 'DIG THROUGH TIME', look, 2, {text: 'Choose two cards to put into your hand.'}).filter(u => look.includes(u)).slice(0, 2);
        if (keep.length < Math.min(2, look.length)) keep = [...keep, ...look.filter(u => !keep.includes(u))].slice(0, Math.min(2, look.length));
        p.deck.splice(0, look.length);
        p.hand.push(...keep);
        p.tartarus.push(...look.filter(u => !keep.includes(u)));
        if (look.length) k.emit(st, 'looked', {player: key, ability: 'DIG THROUGH TIME', uids: [...look], kept: keep[0] || null});
      },
    },
  },
  // Undertow (Hullbreaker-lite): uma vez por rodada, ao conjurar um Moment, devolve até 1 Devotee ou Equipment inimigo.
  'poseidon-v6-551': {watchSpell: (s, c, key, self, caster, spellUid) => caster === key && isMoment(c, spellUid) && k.once(s, `${self}:six-beasts`)
    && (st => {
      const foe = k.other(st, key), list = [...k.enemies(st, c, key), ...enemyGear(st, c, key)];
      const [t] = k.pickUpTo(c, key, 'UNDERTOW', list, 1, {text: 'Return up to one target enemy Devotee or Equipment to its owner\'s hand.'});
      if (t && k.controllerOf(st, t) === foe) k.toHand(st, c, t, 'battlefield', key);
    })},
  // Runes of the Deep (Archmage of Runes).
  'poseidon-v6-552': {
    costLess: (s, c, key, self, uid) => (isMT(c, uid) ? {n: 1, min: 1} : null),
    watchSpell: (s, c, key, self, caster, spellUid) => caster === key && isMT(c, spellUid) && (st => k.draw(st, key, 1)),
  },
  // Endless Knowledge (Consecrated Sphinx): 7º argumento do watchDraw = compras do jogador nesta rodada.
  'poseidon-v6-553': {watchDraw: (s, c, key, self, e, extra, n) => e.player !== key && n === 2 && (st => k.draw(st, key, 2))},
  // The Endless Tide: rodada extra; a carta vai ao Void.
  'poseidon-v6-554': {spell: {run: (st, c, key, self) => {
    (st.extraRounds ||= {})[key] = (st.extraRounds[key] || 0) + 1;
    (st.afterVoid ||= []).push(self);
  }}},

  // ---------- Hades ----------
  'hades-v6-561': {spell: {...sacrificeCost('VILLAGE RITES'), run: (st, c, key) => k.draw(st, key, 2)}},
  'hades-v6-562': {startTurn: (s, c, key) => st => { k.draw(st, key, 1); k.loseSoulOf(st, key, 1); }}, // Phyrexian Arena
  // Price of Souls (Gray Merchant): Specters que você controla, máximo 5.
  'hades-v6-563': {enter: (s, c, key) => st => {
    const n = Math.min(5, k.devotees(st, c, key).filter(u => k.hasType(c, u, 'Specter')).length);
    if (!n) return;
    k.loseSoulOf(st, k.other(st, key), n);
    if (!st.victory) k.gainSoul(st, key, n);
  }},
  // Bitter Triumph: custo adicional descartar uma carta ou pagar {3}{S}.
  'hades-v6-564': {spell: {
    check: (s, c, key) => {
      if (!k.allDevotees(s, c).length) throw new k.RuleError('alvo', 'sem Devotee');
      if (s.players[key].hand.length < 2 && s.players[key].soul <= 3) throw new k.RuleError('custo', 'sem carta para descartar nem Soul para pagar');
    },
    cost: (st, c, key) => {
      const opts = [...(st.players[key].hand.length ? ['Discard a card'] : []), ...(st.players[key].soul > 3 ? ['Pay {3}{S}'] : [])];
      const m = mode(c, key, 'BITTER JUDGMENT', opts, 'Choose the additional cost.');
      if (m === 'Pay {3}{S}') k.paySoul(st, key, 3); else k.discard(st, c, key, 1, 'BITTER JUDGMENT');
    },
    run: (st, c, key) => {
      const t = k.choose(c, key, 'BITTER JUDGMENT', k.allDevotees(st, c), {text: 'Defeat target Devotee.'});
      if (t) k.defeat(st, c, t);
    }}},
  // Feed the Swarm (para Equipment): seu God perde Soul igual ao custo dele.
  'hades-v6-565': {spell: {
    check: k.needTarget((s, c) => k.allEquipment(s, c), 'sem Equipment'),
    run: (st, c, key) => {
      const t = k.choose(c, key, 'TOLL OF CHARON', k.allEquipment(st, c), {text: 'Destroy target Equipment.'});
      if (!t) return;
      const n = k.costOf(c, t);
      k.destroyEquipment(st, c, t);
      if (n) k.loseSoulOf(st, key, n);
    }}},
  // Three Hungry Heads: −2/−2 nos inimigos e, nesta rodada, cada Devotee inimigo derrotado custa 1 Soul ao controlador.
  // shortcut: o "this round" vale enquanto Cerberus estiver em campo (observador watchDefeat); fora do campo não observa.
  'hades-v6-566': {
    enter: (s, c, key, self) => st => {
      (st.v6Cerberus ||= {})[self] = st.round;
      for (const u of k.enemies(st, c, key)) k.buff(st, u, -2, -2, 'this_round');
      k.checkDefeats(st, c);
    },
    watchDefeat: (s, c, key, self, dead, owner) => s.v6Cerberus?.[self] === s.round && owner && owner !== key && (st => k.loseSoulOf(st, owner, 1)),
  },
  'hades-v6-567': {spell: {run: (st, c, key) => { k.search(st, c, key, "PANDORA'S CONTRACT", () => true); k.shuffleDeck(st, key); }}}, // Demonic Tutor
  // River Lethe: custo adicional X Soul (não pode zerar o Soul); todos os Devotees −X/−X.
  'hades-v6-568': {spell: {
    cost: (st, c, key, uid) => {
      const max = Math.max(0, st.players[key].soul - 1), opts = [...Array(max + 1).keys()];
      const x = Number(mode(c, key, 'RIVER LETHE', opts, 'Choose X (Soul to pay).')) || 0;
      if (x && k.paySoul(st, key, x)) (st.v6X ||= {})[uid] = x;
    },
    run: (st, c, key, self) => {
      const x = st.v6X?.[self] || 0;
      delete st.v6X?.[self];
      if (x) for (const u of k.allDevotees(st, c)) k.buff(st, u, -x, -x, 'this_round');
    }}},
  // Gate of Elysion: joga o topo do deck pagando Soul igual ao custo (§58). Ver o topo a qualquer hora é da interface.
  'hades-v6-569': {zonePlay: (s, c, key) => {
    const top = s.players[key].deck[0];
    return top ? [{uid: top, zone: 'deck', extraSoul: k.costOf(c, top), soulInstead: true}] : [];
  }},

  // ---------- Ares ----------
  'ares-v6-576': {spell: {run: (st, c, key) => { // Lightning Bolt
    const t = k.choose(c, key, 'WAR SPARK', [...k.allDevotees(st, c), ...bothGods(st)], {text: 'Deal 3 damage to target Devotee or God.'});
    if (t) k.damage(st, c, t, 3);
  }}},
  // Fiery Confluence: escolha três (pode repetir).
  'ares-v6-577': {spell: {run: (st, c, key) => {
    const A = 'Deal 1 damage to each enemy Devotee', B = 'Deal 2 damage to the enemy God', D = 'Destroy target Equipment';
    for (let i = 0; i < 3 && !st.victory; i++) {
      const m = mode(c, key, 'CONFLUENCE OF FLAMES', [A, B, ...(k.allEquipment(st, c).length ? [D] : [])], `Choose a mode (${i + 1} of 3).`);
      if (m === A) for (const u of k.enemies(st, c, key)) k.damage(st, c, u, 1);
      else if (m === B) k.damage(st, c, enemyGod(st, key), 2);
      else if (m === D) { const t = k.choose(c, key, 'CONFLUENCE OF FLAMES', k.allEquipment(st, c), {text: 'Destroy target Equipment.'}); if (t) k.destroyEquipment(st, c, t); }
    }
  }}},
  // Jeska's Will: Latent pela mão do oponente (máx. 3); 3 do topo ao Void, jogáveis até o fim desta rodada.
  'ares-v6-578': {spell: {run: (st, c, key, self) => {
    k.gainLatent(st, key, Math.min(3, st.players[k.other(st, key)].hand.length));
    const p = st.players[key];
    for (const uid of p.deck.slice(0, 3)) if (k.exile(st, c, uid, 'deck')) (st.zonePlay ||= []).push({uid, key, zone: 'void', round: st.round, source: self});
  }}},
  // Stomp: alvo de Moment/Technique inimigo → 2 de dano no God de quem conjurou.
  'ares-v6-579': {watchSpell: (s, c, key, self, caster, spellUid, targets) => caster !== key && (targets || []).includes(self)
    && (st => k.damage(st, c, k.godTarget(caster), 2))},
  // Riding Charge (Hellrider).
  'ares-v6-580': {watchDeclare: (s, c, key, self, attacker) => k.controllerOf(s, attacker) === key && (st => k.damage(st, c, enemyGod(st, key), 1))},
  // Drakon: imposto de {3}{C} nas Spells inimigas que o miram; Dragonfire ao entrar outro Devotee aliado.
  'ares-v6-581': {
    targetTax: () => 3,
    watchEnter: (s, c, key, self, entered) => entered !== self && k.controllerOf(s, entered) === key && k.isDevotee(c, entered) && (st => {
      if (!alive(st, self)) return;
      const n = alive(st, entered) ? k.atkOf(st, c, entered) : 0;
      const t = n > 0 && k.choose(c, key, 'DRAGONFIRE', [...k.enemies(st, c, key), enemyGod(st, key)], {text: `Deal ${n} damage to target enemy Devotee or God.`});
      if (t) k.damage(st, c, t, n);
    }),
  },
  // Burning Furnace (Inferno Titan): 3 de dano divididos entre até três alvos (um ponto por escolha).
  'ares-v6-582': {enter: (s, c, key, self) => st => furnace(st, c, key), declare: (s, c, key) => st => furnace(st, c, key)},
  // Spoils of War (Dockside): {1}{L} por Equipment e Domain dos oponentes, máximo 3.
  'ares-v6-583': {enter: (s, c, key) => st => {
    const foe = k.other(st, key), n = Math.min(3, enemyGear(st, c, key).length + (st.domains?.[foe] ? 1 : 0));
    if (n) k.gainLatent(st, key, n);
  }},
  // Insurrection: controle de todos os Devotees inimigos até o fim desta rodada; Prepared e com Impulse.
  'ares-v6-584': {spell: {run: (st, c, key) => {
    const foe = k.other(st, key);
    for (const u of k.devotees(st, c, foe)) {
      const from = st.players[foe].battlefield;
      from.splice(from.indexOf(u), 1);
      st.players[key].battlefield.push(u);
      (st.v6Borrowed ||= []).push({uid: u, from: foe, round: st.round});
      k.emit(st, 'control_changed', {uid: u, player: key, from: foe});
      k.prepare(st, u);
      k.buff(st, u, 0, 0, 'this_round', ['Impulse']);
    }
  }}},

  // ---------- Artemis ----------
  // Endless Trail (Tireless Tracker).
  'artemis-v6-591': {watchBase: (s, c, key, self, player) => player === key && k.once(s, `${self}:trail`) && (st => {
    if (!alive(st, self)) return;
    k.addCounter(st, self, 1);
    if (k.canPayCosmo(st, key, 1) && k.may(c, key, 'ENDLESS TRAIL', {uid: self, cost: '{1}{C}', text: 'Pay {1}{C} to draw a card?'}) && k.payCosmo(st, key, 1)) k.draw(st, key, 1);
  })},
  // Nature's Claim.
  'artemis-v6-592': {spell: {
    check: k.needTarget((s, c) => k.allEquipment(s, c), 'sem Equipment'),
    run: (st, c, key) => {
      const t = k.choose(c, key, "NATURE'S CLAIM", k.allEquipment(st, c), {text: 'Destroy target Equipment.'});
      const owner = t && k.controllerOf(st, t);
      if (!owner) return;
      k.destroyEquipment(st, c, t);
      k.gainSoul(st, owner, 4);
    }}},
  // Worldly Tutor: busca um Devotee, embaralha e põe no topo.
  'artemis-v6-593': {spell: {run: (st, c, key) => {
    const pick = k.search(st, c, key, 'WORLDLY TUTOR', card => card?.kind === 'Devotee');
    k.shuffleDeck(st, key);
    const p = st.players[key];
    if (pick && p.hand.includes(pick)) { p.hand.splice(p.hand.indexOf(pick), 1); p.deck.unshift(pick); }
  }}},
  'artemis-v6-594': {watchBase: (s, c, key, self, player) => player === key && (st => k.gainSoul(st, key, 1))}, // Blessing of the Grove
  // Night Bloom (Zendikar Resurgent, autor 08/11/2026: troca o Seedborn, inútil sem jogar na rodada do oponente).
  'artemis-v6-595': {
    watchBase: (s, c, key, self, player) => player === key && (st => k.gainLatent(st, key, 1)),
    watchEnter: (s, c, key, self, entered) => entered !== self && k.controllerOf(s, entered) === key && k.isDevotee(c, entered) && wasCast(s, entered)
      && k.once(s, `${self}:night-bloom`) && (st => k.draw(st, key, 1)),
  },
  'artemis-v6-596': {doubles: true}, // Endless Growth (Doubling Season, §58): hooks.tokenCount / setCounterBonus
  // Natural Order: sacrifica um Sacred Beast; um Devotee do deck ao campo.
  'artemis-v6-597': {spell: {...sacrificeCost('NATURAL ORDER', (c, u) => k.hasType(c, u, 'Sacred Beast')), run: (st, c, key) => {
    const list = st.players[key].deck.filter(u => k.card(c, u)?.kind === 'Devotee');
    const pick = list.length ? c.decide?.(key, {ability: 'NATURAL ORDER', options: list, choose: 'search', text: 'Choose a Devotee to put onto the Battlefield.'}) : null;
    if (pick && list.includes(pick)) k.putOntoField(st, c, key, pick, 'deck');
    k.shuffleDeck(st, key);
  }}},
  // Many Heads: entra com 1 Training counter por Cosmo Base (máximo 3).
  'artemis-v6-598': {enter: (s, c, key, self) => st => { const n = Math.min(3, st.players[key].bases.length); if (n && alive(st, self)) k.addCounter(st, self, n); }},
  // Genesis Wave: revela 7; Devotees e Equipment de custo 7 ou menos vão ao campo; o resto ao Tartarus.
  // shortcut: Equipment entra sem portador (como um Equipment jogado sem Resonant, §33).
  'artemis-v6-599': {spell: {run: (st, c, key) => {
    const p = st.players[key], look = p.deck.slice(0, 7);
    k.emit(st, 'revealed_many', {player: key, uids: [...look]});
    const fits = u => ['Devotee', 'Equipment'].includes(k.card(c, u)?.kind) && k.costOf(c, u) <= 7;
    for (const u of look.filter(fits)) {
      if (k.card(c, u).kind === 'Devotee') { k.putOntoField(st, c, key, u, 'deck'); continue; }
      p.deck.splice(p.deck.indexOf(u), 1);
      p.battlefield.push(u);
      k.emit(st, 'entered', {player: key, uid: u, kind: 'Equipment', bearer: null});
    }
    for (const u of look.filter(u => !fits(u) && p.deck.includes(u))) { p.deck.splice(p.deck.indexOf(u), 1); p.tartarus.push(u); }
  }}},
};

const enemyTechniques = (s, c, key) => s.chain.filter(i => i.spell && i.controller !== key && /Technique|Event|Miracle/.test(k.card(c, i.uid)?.type || '')).map(i => i.uid);
function furnace(st, c, key) {
  for (let i = 0; i < 3 && !st.victory; i++) {
    const t = k.choose(c, key, 'BURNING FURNACE', [...k.allDevotees(st, c), ...bothGods(st)], {text: `Deal 1 damage (${i + 1} of 3) to a target.`});
    if (t) k.damage(st, c, t, 1);
  }
}
