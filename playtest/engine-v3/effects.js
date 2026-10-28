// Efeitos de carta da engine 3.0: valores em jogo, modificadores com duração e prevenção de dano de Strike.
// Texto das cartas: snapshot D268, sem alteração. Durações: D191 ('this_round', 'next_round') e 'this_strike'.
// Prevenção checada antes do evento (D199). Escolhas opcionais ("you may") vêm de `ctx.decide(player, pergunta)`;
// sem `decide`, o jogador recusa.
// Ordem de aplicação numa mesma porção de dano (confirmada pelo autor em 28/10/2026):
// 1. prevenções obrigatórias de carta; 2. escudos criados por Spell; 3. prevenções opcionais pagas; 4. "would be defeated".
// Decisões do autor em 28/10/2026 para esta parte: {C} se paga com Base preparada; Resonance de Equipment só vale
// equipado no Devotee nomeado; dano que não é de Strike também passa pela Armor (prevenções "Strike damage" não valem);
// dano redirecionado pela Resonance da 004 é dano de Strike em Shiryu.
import {CHARACTER_IDENTITY, characterOf} from '../../shared/character-identity.js';
import {RuleError, useOncePerRound, addEffect, destroyDevotee, draw, spendBase, pushTriggers, emit, gainLatent, prepareUnit} from './core.js';

export const card = (ctx, uid) => ctx.cards.get(ctx.objects[uid].cardId);
const id = (ctx, uid) => ctx.objects[uid].cardId.slice(-3);
export const controllerOf = (state, uid) => state.order.find(k => state.players[k].battlefield.includes(uid));
const devotees = (state, ctx, key) => state.players[key].battlefield.filter(uid => card(ctx, uid).kind === 'Devotee');
const controls = (state, ctx, key, number) => devotees(state, ctx, key).some(uid => id(ctx, uid) === number);
export const isSaint = (ctx, uid) => card(ctx, uid).kind === 'Devotee' && /Saint/.test(card(ctx, uid).type);
export const isBronze = (ctx, uid) => isSaint(ctx, uid) && /Bronze Saint/.test(card(ctx, uid).type);
const other = (state, key) => state.order.find(k => k !== key);
const ask = (ctx, player, question) => Boolean(ctx.decide?.(player, question));
// Athena Devotee de um jogador cujo God Athena está Awaken (estado do último checkpoint, G3-004).
const isAthenaDevotee = (ctx, uid) => ctx.objects[uid].cardId.startsWith('athena-') && card(ctx, uid).kind === 'Devotee';
const athenaAwaken = (state, ctx, key, uid) => state.divine?.[key]?.god === 'god-athena' && state.divine[key].awaken && isAthenaDevotee(ctx, uid);
const behind = (state, key) => state.players[key].soul < state.players[other(state, key)].soul;
// {N}{C}: N Bases preparadas. Devolve false se não dá para pagar (nada é gasto).
const payC = (state, key, n) => {
  if (state.players[key].bases.filter(b => b.prepared).length < n) return false;
  spendBase(state, key, n);
  return true;
};

// Equipment presos ao Devotee, na ordem em que foram equipados.
export const gearOf = (ctx, uid) => Object.keys(ctx.attached).filter(e => ctx.attached[e] === uid);
// Equipment `number` preso ao Devotee; com `named`, só se ele for o nomeado da Resonance.
const wears = (ctx, uid, number) => gearOf(ctx, uid).find(e => id(ctx, e) === number);

// Bônus que valem agora: fixo do Equipment, habilidades "While …" das cartas dos decks e efeitos com duração.
function mods(state, ctx, uid) {
  const list = gearOf(ctx, uid).map(e => card(ctx, e).equipped).filter(Boolean);
  const key = controllerOf(state, uid);
  if (key) {
    const n = id(ctx, uid);
    if (n === '034' && state.players[key].soul <= 5) list.push({atk: 0, hp: 2}); // Loyal Servant
    if (n === '036' && controls(state, ctx, key, '001')) list.push({atk: 0, hp: 2}); // Sibling Bond
    if (n === '037' && controls(state, ctx, key, '003')) list.push({atk: 0, hp: 1}); // Dragon's Promise
    if (n === '001' && behind(state, key)) list.push({atk: 1, hp: 0}); // Miracle
    if (athenaAwaken(state, ctx, key, uid)) list.push({atk: 1, hp: 1}); // God Athena, Divine Protection (Awaken 5)
    if (n === '001' && wears(ctx, uid, '019') && behind(state, key)) list.push({atk: 2, hp: 2}); // 019 Resonance
    // G3-039: cada Training counter é +1/+1 por si (acumula). Master's Guidance soma +1/+1 por Eagle Marin.
    if (state.units[uid]?.training) list.push({atk: state.units[uid].training, hp: state.units[uid].training});
    if (state.units[uid]?.training && isBronze(ctx, uid)) {
      for (const m of devotees(state, ctx, key).filter(u => id(ctx, u) === '021')) list.push({atk: 1, hp: 1, source: m});
    }
  }
  return [...list, ...state.effects.filter(e => e.target === uid && e.kind === 'mod')];
}
const sum = (list, field) => list.reduce((n, m) => n + (m[field] || 0), 0);
export const atkOf = (state, ctx, uid) => card(ctx, uid).atk + sum(mods(state, ctx, uid), 'atk');
export const hpOf = (state, ctx, uid) => card(ctx, uid).hp + sum(mods(state, ctx, uid), 'hp');
export const keywordsOf = (state, ctx, uid) => [...card(ctx, uid).keywords, ...mods(state, ctx, uid).flatMap(m => m.keywords || []),
  ...(state.units[uid]?.keywords || [])];

export const modify = (state, target, {atk = 0, hp = 0, keywords = []}, duration = 'this_round') =>
  addEffect(state, {kind: 'mod', target, atk, hp, keywords, duration});
// Escudo "prevent the next N [Strike] damage": `target` é um uid ou 'god:A'; amount Infinity = todo o dano.
export const shield = (state, target, amount, {strikeOnly = true, duration = 'this_round'} = {}) =>
  addEffect(state, {kind: 'prevent', target, amount, strikeOnly, duration});
// "When target … would be defeated by Strike damage this round, prevent that damage instead."
export const save = (state, target, onSave) => addEffect(state, {kind: 'save', target, onSave, duration: 'this_round'});

function useShields(state, target, amount, strike) {
  for (const e of state.effects.filter(x => x.kind === 'prevent' && x.target === target && (strike || !x.strikeOnly))) {
    const used = Math.min(e.amount, amount);
    amount -= used;
    e.amount -= used;
  }
  state.effects = state.effects.filter(e => !(e.kind === 'prevent' && e.amount <= 0));
  return amount;
}

// Prevenção de dano num Devotee. Fora de Strike só valem escudos de "damage" sem "Strike". Devolve o dano que sobra.
function preventDevotee(state, ctx, uid, amount, strike) {
  if (amount <= 0) return 0;
  if (!strike) return useShields(state, uid, amount, false);
  const key = controllerOf(state, uid), gear = gearOf(ctx, uid), shiryu = id(ctx, uid) === '003';
  // 1. Obrigatórias. Dragon Shield (003 e 004) não acumula: uma vez por Round por Devotee.
  if ((shiryu || gear.some(e => id(ctx, e) === '004')) && useOncePerRound(state, `dragon-shield:${uid}`)) amount -= 1;
  for (const e of gear) {
    const n = id(ctx, e);
    if (amount <= 0) break;
    if ((n === '044' || n === '045' || n === '049') && useOncePerRound(state, `prevent:${e}`)) {
      const before = amount;
      amount = Math.max(0, amount - (n === '049' && shiryu ? 2 : 1)); // Libra Defense: 2 em Dragon Shiryu
      // Dragon's Guard, Resonance: ao prevenir dano em Dragon Shiryu, 1 de escudo numa Armor dele até o fim do Round seguinte.
      const armor = gear.find(g => card(ctx, g).armor);
      if (n === '045' && shiryu && before > amount && armor) shield(state, armor, 1, {strikeOnly: false, duration: 'next_round'});
    }
  }
  amount = Math.max(0, amount);
  // 2. Escudos de Spell.
  amount = useShields(state, uid, amount, true);
  // 3. Opcionais, só para Saint.
  if (amount > 0 && isSaint(ctx, uid)) amount = optionalPrevention(state, ctx, key, uid, amount);
  // 4. "Would be defeated": conta a Armor que ainda absorve. Primeiro salvamento de Spell, depois Divine Protection (019).
  const armorRoom = gear.filter(e => card(ctx, e).armor).reduce((n, e) => n + card(ctx, e).hp - (state.units[e]?.damage || 0), 0);
  if (amount <= 0 || state.units[uid].damage + amount < hpOf(state, ctx, uid) + armorRoom) return amount;
  const saver = state.effects.find(e => e.kind === 'save' && e.target === uid);
  if (saver) {
    state.effects = state.effects.filter(e => e !== saver);
    saver.onSave?.(state, ctx);
    return 0;
  }
  const kamui = wears(ctx, uid, '019'), once = kamui && `ability:${kamui}`;
  if (kamui && behind(state, key) && !state.roundUses.has(once) && state.players[key].bases.filter(b => b.prepared).length >= 2
    && ask(ctx, key, {ability: 'Divine Protection', source: kamui, uid, amount})) {
    useOncePerRound(state, once); spendBase(state, key, 2);
    return 0;
  }
  return amount;
}

function optionalPrevention(state, ctx, key, uid, amount) {
  const p = state.players[key];
  for (const source of devotees(state, ctx, key)) {
    if (amount <= 0) break;
    const n = id(ctx, source), once = `ability:${source}`;
    // Prayer of Rozan: pay {1}{L}, prevent 1.
    if (n === '037' && p.latent >= 1 && !state.roundUses.has(once) && ask(ctx, key, {ability: 'Prayer of Rozan', source, uid, amount})) {
      useOncePerRound(state, once); p.latent -= 1; amount -= 1;
    }
    // Crystal Wall: another friendly Saint; pay {2}{L}, prevent up to 3.
    if (n === '011' && source !== uid && p.latent >= 2 && !state.roundUses.has(once) && ask(ctx, key, {ability: 'Crystal Wall', source, uid, amount})) {
      useOncePerRound(state, once); p.latent -= 2; amount -= Math.min(3, amount);
    }
    // Dragon Cloth (004), Resonance: equipada em Shiryu, redireciona até 2 de outro Saint para ele, como dano de Strike.
    const cloth = n === '003' && source !== uid && wears(ctx, source, '004'), redirect = cloth && `resonance:${cloth}`;
    if (cloth && !state.roundUses.has(redirect) && ask(ctx, key, {ability: 'Dragon Cloth Resonance', source, uid, amount})) {
      useOncePerRound(state, redirect);
      const moved = Math.min(2, amount);
      amount -= moved;
      damageDevotee(state, ctx, source, moved, true);
    }
    // Final Sacrifice: another friendly Saint; defeat Cassios, prevent up to 3 (sem limite por Round).
    if (n === '027' && source !== uid && ask(ctx, key, {ability: 'Final Sacrifice', source, uid, amount})) {
      destroyDevotee(state, source, ctx.objects, ctx.attached); amount -= Math.min(3, amount);
    }
  }
  return amount;
}

// Prevenção de dano a um God. `strike`: se o dano vem de Strike. Crystal Wall também protege o God.
export function preventGod(state, ctx, key, amount, strike = true) {
  amount = useShields(state, `god:${key}`, amount, strike);
  if (strike && amount > 0) {
    const mu = devotees(state, ctx, key).find(uid => id(ctx, uid) === '011'), once = mu && `ability:${mu}`;
    if (mu && state.players[key].latent >= 2 && !state.roundUses.has(once) && ask(ctx, key, {ability: 'Crystal Wall', source: mu, god: key, amount})) {
      useOncePerRound(state, once); state.players[key].latent -= 2; amount -= Math.min(3, amount);
    }
  }
  return amount;
}

// Dano num Devotee (`strike`: se é dano de Strike): prevenção, depois Armor na ordem de equipar, depois o Devotee.
// Devolve o dano que passou do HP restante do Devotee (base do Pierce).
export function damageDevotee(state, ctx, uid, amount, strike = true) {
  if (!state.units[uid]) return 0; // já saiu (ex.: Final Sacrifice)
  const incoming = amount;
  amount = preventDevotee(state, ctx, uid, amount, strike);
  const afterPrevention = amount;
  for (const armor of gearOf(ctx, uid).filter(e => card(ctx, e).armor)) {
    const unit = state.units[armor] ??= {damage: 0};
    const hit = useShields(state, armor, amount, strike), absorbed = Math.min(hit, card(ctx, armor).hp - unit.damage);
    unit.damage += absorbed;
    amount = hit - absorbed;
    if (unit.damage >= card(ctx, armor).hp) {
      const owner = state.players[ctx.objects[armor].owner];
      owner.battlefield = owner.battlefield.filter(x => x !== armor);
      owner.tartarus.push(armor);
      delete ctx.attached[armor];
      delete state.units[armor];
      state.effects = state.effects.filter(e => e.target !== armor);
      emit(state, 'destroyed', {uid: armor, owner: ctx.objects[armor].owner});
    }
  }
  const room = Math.max(0, hpOf(state, ctx, uid) - state.units[uid].damage);
  state.units[uid].damage += amount;
  emit(state, 'damage', {uid, strike, incoming, prevented: incoming - afterPrevention, absorbed: afterPrevention - amount, dealt: amount});
  return Math.max(0, amount - room);
}

// "Prepare it. It cannot declare another Strike this round.": o limite já vem da D22 (um Strike por Devotee por turno,
// e o Round seguinte é outro turno); preparar só deixa o Devotee em guarda.
const prepareNoStrike = (state, uid) => { prepareUnit(state, uid); };
const removeDamage = (state, uid, n) => { state.units[uid].damage = Math.max(0, state.units[uid].damage - n); };

// Verificação de estado: todo Devotee com dano >= HP é derrotado (D197), depois de cada Strike, Spell ou habilidade.
// Guia §63: personagem nomeado (identidade estável da G3-029); `null` = genérico, sem exclusividade.
// Carta fora da tabela lança IdentityGap (lacuna, não palpite).
// G3-040: só as classes de guerreiros são lendárias (um por personagem); Warrior, Support e sem classe repetem.
const LEGENDARY = /\b(Saint|Marines?|Marinas?|Satellites?|Spect(?:er|re)s?|Berserk(?:er)?s?)\b/i;
export function namedCharacter(ctx, uid) {
  const id = ctx.objects[uid].cardId.toLowerCase();
  if (!LEGENDARY.test(ctx.cards.get(ctx.objects[uid].cardId)?.type || '')) return null;
  if (!(ctx.identities && Object.hasOwn(ctx.identities, id)) && CHARACTER_IDENTITY[id] === null) return null;
  return characterOf(id, ctx.identities);
}
// Guia §63: se um efeito deixar um jogador com duas versões do mesmo personagem, ele escolhe uma para manter e as
// outras vão ao Tartarus sem ser destruição (evento `unique_removed`, sem gatilho de destruição).
export function enforceUniqueness(state, ctx) {
  for (const key of state.order) {
    for (;;) {
      const groups = new Map();
      for (const uid of devotees(state, ctx, key)) { const who = namedCharacter(ctx, uid); if (who) groups.set(who, [...(groups.get(who) || []), uid]); }
      const copies = [...groups.values()].find(g => g.length > 1);
      if (!copies) break;
      const keep = ctx.decide?.(key, {ability: 'ONE PER CHARACTER', decision: '§63', choose: 'keep', options: [...copies]});
      if (!copies.includes(keep)) throw new RuleError('§63', `${key} precisa escolher qual versão manter`);
      for (const uid of copies.filter(u => u !== keep)) destroyDevotee(state, uid, ctx.objects, ctx.attached, 'unique_removed');
    }
  }
}

export function checkDefeats(state, ctx) {
  for (const key of state.order) {
    for (const uid of devotees(state, ctx, key)) {
      if (!state.units[uid] || state.units[uid].damage < hpOf(state, ctx, uid)) continue;
      // God Athena, Divine Protection (D200): Defeat prevenível de Athena Devotee; pode pagar 3 Latent, fica com 1 HP.
      const p = state.players[key];
      if (athenaAwaken(state, ctx, key, uid) && p.latent >= 3 && ask(ctx, key, {ability: 'Divine Protection', god: true, uid, cost: '3 Latent'})) {
        p.latent -= 3;
        emit(state, 'cosmo_spent', {player: key, unit: 'latent', amount: 3});
        state.units[uid].damage = hpOf(state, ctx, uid) - 1;
        emit(state, 'defeat_prevented', {uid, player: key, ability: 'DIVINE PROTECTION'});
        continue;
      }
      destroyDevotee(state, uid, ctx.objects, ctx.attached);
    }
  }
  enforceUniqueness(state, ctx);
}
const enemyDevotee = (state, ctx, key, uid) => {
  if (!uid || controllerOf(state, uid) !== other(state, key) || card(ctx, uid).kind !== 'Devotee') {
    throw new RuleError('alvo', 'alvo precisa ser um Devotee inimigo no campo');
  }
};

// Spells com efeito implementado, por número. `check` roda antes de pagar; `run` na resolução.
// Alvo que saiu do campo antes da resolução: a parte que depende dele não faz nada (confirmado pelo autor, 28/10/2026).
const friendlySaint = (state, ctx, key, uid, bronze = false) => {
  if (!uid || controllerOf(state, uid) !== key || !(bronze ? isBronze(ctx, uid) : isSaint(ctx, uid))) {
    throw new RuleError('alvo', `alvo precisa ser um ${bronze ? 'Bronze Saint' : 'Saint'} seu no campo`);
  }
};
const alive = (state, key, uid) => uid && controllerOf(state, uid) === key;

export const SPELLS = {
  // The First Burn of Cosmo: +2 ATK; Bronze Saint também +1 HP. (Sem categoria na D194: playSpell ainda recusa.)
  '053': {
    check: (s, c, k, {target}) => friendlySaint(s, c, k, target),
    run: (s, c, k, {target}) => { if (alive(s, k, target)) modify(s, target, {atk: 2, hp: isBronze(c, target) ? 1 : 0}); },
  },
  // A Promise to Shunrei: remove até 2 de dano de um Saint seu; com Shunrei, pode Preparar.
  '059': {
    check: (s, c, k, {target}) => friendlySaint(s, c, k, target),
    run: (s, c, k, {target, prepare}) => {
      if (!alive(s, k, target)) return;
      removeDamage(s, target, 2);
      if (prepare && controls(s, c, k, '037')) prepareNoStrike(s, target);
    },
  },
  // The Training of Pegasus: 1 Training counter num Bronze Saint seu; compra 1 se for Pegasus Seiya. (Sem categoria na D194.)
  '060': {
    check: (s, c, k, {target}) => friendlySaint(s, c, k, target, true),
    run: (s, c, k, {target}) => {
      if (!alive(s, k, target)) return;
      s.units[target].training = (s.units[target].training || 0) + 1;
      if (id(c, target) === '001') draw(s, k, 1);
    },
  },
  // The Golden Arrow: 4 de dano (6 com Pegasus Seiya) num Devotee inimigo; se derrotar, pode remover 1 de dano de um Saint seu.
  // (Sem categoria na D194.)
  '082': {
    check: (s, c, k, {target, heal}) => { enemyDevotee(s, c, k, target); if (heal) friendlySaint(s, c, k, heal); },
    run: (s, c, k, {target, heal}) => {
      if (!alive(s, other(s, k), target)) return;
      damageDevotee(s, c, target, controls(s, c, k, '001') ? 6 : 4, false);
      checkDefeats(s, c);
      if (!s.units[target] && heal && alive(s, k, heal)) removeDamage(s, heal, 1);
    },
  },
  // Shiryu's Last Dragon: o Saint causa ATK + 3 (+2 se for Shiryu) ao Devotee inimigo; depois é derrotado. (Sem categoria na D194.)
  '085': {
    check: (s, c, k, {source, target}) => { friendlySaint(s, c, k, source); enemyDevotee(s, c, k, target); },
    run: (s, c, k, {source, target}) => {
      if (!alive(s, k, source)) return;
      if (alive(s, other(s, k), target)) damageDevotee(s, c, target, atkOf(s, c, source) + 3 + (id(c, source) === '003' ? 2 : 0), false);
      destroyDevotee(s, source, c.objects, c.attached);
      checkDefeats(s, c);
    },
  },
  // The Galaxian Wars: até dois Bronze Saints seus, +1 ATK; compra 1 se você controla ao menos três Bronze Saints.
  '052': {
    check: (s, c, k, {targets = []}) => {
      if (targets.length > 2 || new Set(targets).size !== targets.length) throw new RuleError('alvo', 'até dois Bronze Saints distintos');
      targets.forEach(t => friendlySaint(s, c, k, t, true));
    },
    run: (s, c, k, {targets = []}) => {
      targets.filter(t => alive(s, k, t)).forEach(t => modify(s, t, {atk: 1}));
      if (devotees(s, c, k).filter(u => isBronze(c, u)).length >= 3) draw(s, k, 1);
    },
  },
  // Blood of the Dragon: +0/+2; em Dragon Shiryu, escudo de 2 contra Strike.
  '058': {
    check: (s, c, k, {target}) => friendlySaint(s, c, k, target),
    run: (s, c, k, {target}) => {
      if (!alive(s, k, target)) return;
      modify(s, target, {hp: 2});
      if (id(c, target) === '003') shield(s, target, 2);
    },
  },
  // The Call of Athena: escolha um — +2 ATK num Saint seu, ou escudo de 3 no seu God.
  '061': {
    check: (s, c, k, {mode, target}) => {
      if (mode === 'atk') friendlySaint(s, c, k, target);
      else if (mode !== 'god') throw new RuleError('modo', "escolha 'atk' ou 'god'");
    },
    run: (s, c, k, {mode, target}) => {
      if (mode === 'god') shield(s, `god:${k}`, 3);
      else if (alive(s, k, target)) modify(s, target, {atk: 2});
    },
  },
  // Shiryu's Sacrificed Sight: +2/+2; Pierce em Dragon Shiryu; no fim do Round, Unprepare e não prepara no próximo início.
  '077': {
    check: (s, c, k, {target}) => friendlySaint(s, c, k, target),
    run: (s, c, k, {target}) => {
      if (!alive(s, k, target)) return;
      modify(s, target, {atk: 2, hp: 2, keywords: id(c, target) === '003' ? ['Pierce'] : []});
      s.delayed.push({controller: k, uid: target, ability: 'Sacrifice', source: '077', run: st => {
        if (!st.units[target] || controllerOf(st, target) !== k) return;
        st.units[target].prepared = false;
        st.units[target].skipPrepare = true;
      }});
    },
  },
  // The Testament of Aiolos: +2/+2 num Bronze Saint seu, ou escudo de 5 no seu God; os dois se você controla Pegasus Seiya.
  '081': {
    check: (s, c, k, {mode, target}) => {
      if (!['atk', 'god', 'both'].includes(mode)) throw new RuleError('modo', "escolha 'atk', 'god' ou 'both'");
      if (mode === 'both' && !controls(s, c, k, '001')) throw new RuleError('modo', "'both' exige Pegasus Seiya");
      if (mode !== 'god') friendlySaint(s, c, k, target, true);
    },
    run: (s, c, k, {mode, target}) => {
      if (mode !== 'god' && alive(s, k, target)) modify(s, target, {atk: 2, hp: 2});
      if (mode !== 'atk') shield(s, `god:${k}`, 5);
    },
  },
  // The Eighth Sense: +3/+3 e salvamento neste Round; se seu God tem menos Soul, pode Preparar (sem outro Strike).
  '088': {
    check: (s, c, k, {target}) => friendlySaint(s, c, k, target),
    run: (s, c, k, {target, prepare}) => {
      if (!alive(s, k, target)) return;
      modify(s, target, {atk: 3, hp: 3});
      save(s, target);
      if (prepare && s.players[k].soul < s.players[other(s, k)].soul) prepareNoStrike(s, target);
    },
  },
  // A Saint Never Surrenders: salvamento neste Round.
  '054': {check: (s, c, k, {target}) => friendlySaint(s, c, k, target), run: (s, c, k, {target}) => { if (alive(s, k, target)) save(s, target); }},
  // Protect Saori: escudo de 3 no God (5 se você controla um Saint com Guardian, na resolução).
  '056': {
    check: () => {},
    run: (s, c, k) => shield(s, `god:${k}`, devotees(s, c, k).some(u => isSaint(c, u) && keywordsOf(s, c, u).includes('Guardian')) ? 5 : 3),
  },
  // Cassios's Sacrifice: salvamento; em Pegasus Seiya, ao salvar, pode Preparar (sem outro Strike).
  '076': {
    check: (s, c, k, {target}) => friendlySaint(s, c, k, target),
    run: (s, c, k, {target}) => {
      if (!alive(s, k, target)) return;
      save(s, target, (st, cx) => {
        if (id(cx, target) === '001' && ask(cx, k, {ability: "Cassios's Sacrifice", uid: target, prepare: true})) prepareNoStrike(st, target);
      });
    },
  },
  // Seiya Raises Athena's Shield: todo dano ao seu God neste Round é prevenido; com Pegasus Seiya, remove até 3 de dano
  // de cada Saint seu; com Soul ≤ 5, pode Preparar até dois Saints seus (sem outro Strike).
  '087': {
    check: (s, c, k, {prepare = []}) => {
      if (prepare.length > 2) throw new RuleError('alvo', 'até dois Saints');
      prepare.forEach(t => friendlySaint(s, c, k, t));
    },
    run: (s, c, k, {prepare = []}) => {
      shield(s, `god:${k}`, Infinity, {strikeOnly: false});
      if (controls(s, c, k, '001')) devotees(s, c, k).filter(u => isSaint(c, u)).forEach(u => removeDamage(s, u, 3));
      if (s.players[k].soul <= 5) prepare.filter(t => alive(s, k, t)).forEach(t => prepareNoStrike(s, t));
    },
  },
};

// Gatilhos de entrada (P06: gatilho na cadeia abre janela). `choice.target` é escolhido ao jogar.
export function onEnter(state, ctx, key, uid, {target} = {}) {
  const n = id(ctx, uid);
  // Eagle Marin: 1 Training counter noutro Bronze Saint seu (sem alvo legal, não faz nada).
  if (n === '021' && target && target !== uid && alive(state, key, target) && isBronze(ctx, target)) {
    pushTriggers(state, [{controller: key, uid, ability: 'enters the Battlefield', target, run: st => { if (alive(st, key, target)) st.units[target].training = (st.units[target].training || 0) + 1; }}]);
  }
  // Star Hill Acolyte: olha as 2 do topo; uma fica no topo, a outra vai para o fundo. `decide` devolve a que fica no topo.
  if (n === '043') {
    pushTriggers(state, [{controller: key, uid, ability: 'Sacred Knowledge', run: st => {
      const deck = st.players[key].deck, look = deck.splice(0, 2);
      const pick = look.length === 2 ? ctx.decide?.(key, {ability: 'Sacred Knowledge', cards: look}) : look[0];
      const top = look.includes(pick) ? pick : look[0]; // resposta fora das 2 cartas = sem escolha (não cria objeto)
      if (top) deck.unshift(top);
      deck.push(...look.filter(u => u !== top));
    }}]);
  }
}

// Pegasus God Cloth (019), ao ser jogada: se seu God tem menos Soul, um Devotee seu ganha +3/+3 até o fim do Round e prepara.
export function onCastEquipment(state, ctx, key, uid, {target} = {}) {
  if (id(ctx, uid) !== '019' || !behind(state, key) || !target || !alive(state, key, target)) return;
  pushTriggers(state, [{controller: key, uid, ability: 'When you cast', target, run: st => {
    if (!alive(st, key, target)) return;
    modify(st, target, {atk: 3, hp: 3});
    prepareUnit(st, target);
  }}]);
}

// Habilidades ativadas com {T} (D192/D24): Sorcery (D173), o Devotee precisa estar Prepared e vira Unprepared;
// {N}{C} paga N Bases preparadas. `choice.target`: o alvo.
export const ABILITIES = {
  '041': {name: 'Sacred Recovery', cost: 1,
    check: (s, c, k, {target}) => { if (!alive(s, k, target) || card(c, target).kind !== 'Devotee') throw new RuleError('alvo', 'Devotee seu'); },
    run: (s, c, k, {target}) => { if (alive(s, k, target)) removeDamage(s, target, 2); }},
  '042': {name: 'Armor Ward', cost: 1,
    check: (s, c, k, {target}) => { if (!alive(s, k, target) || !card(c, target).armor) throw new RuleError('alvo', 'Armor sua'); },
    run: (s, c, k, {target}) => { if (alive(s, k, target)) shield(s, target, 1, {strikeOnly: false, duration: 'next_round'}); }},
  '011': {name: 'Cloth Restoration', cost: 2, once: true,
    check: (s, c, k, {target}) => { if (!alive(s, k, target) || !card(c, target).armor) throw new RuleError('alvo', 'Armor sua'); },
    run: (s, c, k, {target}) => { if (alive(s, k, target)) shield(s, target, 2, {strikeOnly: false, duration: 'next_round'}); }},
};

// Strike declarado: Unicorn Gallop (028) e Divine Cosmo (019: pague {3}{C}, +2 ATK durante o Strike).
export function onDeclare(state, ctx, attacker, target) {
  const key = controllerOf(state, attacker);
  if (id(ctx, attacker) === '028' && target.kind === 'devotee' && useOncePerRound(state, `ability:${attacker}`)) {
    modify(state, attacker, {atk: 1}, 'this_strike');
  }
  const kamui = wears(ctx, attacker, '019'), once = kamui && `cosmo:${kamui}`;
  if (kamui && !state.roundUses.has(once) && state.players[key].bases.filter(b => b.prepared).length >= 3
    && ask(ctx, key, {ability: 'Divine Cosmo', source: kamui, uid: attacker}) && payC(state, key, 3)) {
    useOncePerRound(state, once);
    modify(state, attacker, {atk: 2}, 'this_strike');
  }
}

// Depois do dano de um Strike: gatilhos de sobreviver e de causar dano, na cadeia (APNAP, com janela).
// `strike.dealt`: dano de Strike efetivamente causado ao Devotee alvo; `strike.atks`: ATK de cada lado antes do dano.
export function afterStrike(state, ctx, strike) {
  state.effects = state.effects.filter(e => e.duration !== 'this_strike');
  const triggers = [], {attacker, target} = strike, t = target.uid;
  const survived = uid => uid && state.units[uid];
  const add = (controller, run, meta) => triggers.push({controller, run, ...meta}); // meta: origem (uid), habilidade e alvo, para a cadeia na UI
  for (const uid of [attacker, t].filter(survived)) {
    const key = controllerOf(state, uid), foe = uid === attacker ? t : attacker;
    if (id(ctx, uid) !== '001') continue;
    // Seventh Sense: sobreviveu a um Strike contra Devotee inimigo de ATK maior: +1 ATK permanente.
    if (foe && strike.atks[foe] > strike.atks[uid] && useOncePerRound(state, `seventh-sense:${uid}`)) {
      add(key, st => { if (st.units[uid]) modify(st, uid, {atk: 1}, 'permanent'); }, {uid, ability: 'Seventh Sense'});
    }
    // Pegasus Cloth (002), Resonance: pode Preparar Seiya.
    const cloth = wears(ctx, uid, '002');
    if (cloth && !state.roundUses.has(`resonance:${cloth}`)) {
      add(key, st => {
        if (st.units[uid] && !st.roundUses.has(`resonance:${cloth}`) && ask(ctx, key, {ability: 'Pegasus Cloth Resonance', uid, prepare: true})) {
          useOncePerRound(st, `resonance:${cloth}`); prepareNoStrike(st, uid);
        }
      }, {uid: cloth, ability: 'Resonance', target: uid});
    }
    // Seika, Hope of Reunion: pode remover 1 de dano de Seiya.
    for (const seika of devotees(state, ctx, key).filter(u => id(ctx, u) === '036' && !state.roundUses.has(`ability:${u}`))) {
      add(key, st => {
        if (st.units[uid] && !st.roundUses.has(`ability:${seika}`) && ask(ctx, key, {ability: 'Hope of Reunion', source: seika, uid})) {
          useOncePerRound(st, `ability:${seika}`); removeDamage(st, uid, 1);
        }
      }, {uid: seika, ability: 'Hope of Reunion', target: uid});
    }
  }
  // God Athena, Cosmo of Hope (D225): Athena Devotee que atacou ou defendeu e continua no campo do mesmo controlador;
  // uma vez por Round; ganha 1 Latent (teto 3). O uso só conta na resolução.
  for (const key of state.order) {
    const once = `god:${key}:cosmo-of-hope`;
    if (state.divine?.[key]?.god !== 'god-athena' || state.roundUses.has(once)) continue;
    if (![attacker, t].some(uid => survived(uid) && controllerOf(state, uid) === key && isAthenaDevotee(ctx, uid))) continue;
    add(key, st => { if (useOncePerRound(st, once)) { emit(st, 'divine_power', {player: key, ability: 'COSMO OF HOPE'}); gainLatent(st, key, 1); } }, {uid: `god:${key}`, ability: 'COSMO OF HOPE'});
  }
  // Rising Dragon (003): sobreviveu como defensor, +1 ATK até o fim do Round.
  if (survived(t) && id(ctx, t) === '003' && useOncePerRound(state, `rising-dragon:${t}`)) {
    add(controllerOf(state, t), st => { if (st.units[t]) modify(st, t, {atk: 1}); }, {uid: t, ability: 'Rising Dragon'});
  }
  // Libra Sword (048), Resonance: Shiryu causou dano de Strike a Devotee inimigo; pode causar mais 1 a ele.
  const sword = wears(ctx, attacker, '048') && id(ctx, attacker) === '003' ? wears(ctx, attacker, '048') : null;
  if (sword && t && strike.dealt > 0 && !state.roundUses.has(`resonance:${sword}`)) {
    const key = strike.player;
    add(key, st => {
      if (survived(t) && !st.roundUses.has(`resonance:${sword}`) && ask(ctx, key, {ability: 'Libra Sword Resonance', uid: t})) {
        useOncePerRound(st, `resonance:${sword}`); damageDevotee(st, ctx, t, 1, false); checkDefeats(st, ctx);
      }
    }, {uid: sword, ability: 'Resonance', target: t});
  }
  pushTriggers(state, triggers);
}
