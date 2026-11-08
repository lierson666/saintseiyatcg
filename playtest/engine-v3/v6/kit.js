// Kit das cartas V6: ações comuns de texto de carta sobre a engine 3.0. Toda escolha é uma pergunta da engine
// (`ctx.decide`), respondida no modal de decisão da arena, pela IA ou pelo jogador remoto. Sem `decide`, recusa.
import {RuleError, destroyDevotee, draw, emit, gainLatent, loseSoul, mill, prepareUnit, useOncePerRound, addEffect, restoreMoon, spendBase} from '../core.js';
import {card, controllerOf, modify, damageDevotee, checkDefeats, atkOf, hpOf, keywordsOf, blockedNow} from '../effects.js';
import {gainSoul} from '../gods.js';
import {collect, resonanceTag} from './registry.js';

export {card, controllerOf, modify, damageDevotee, checkDefeats, atkOf, hpOf, keywordsOf, gainSoul, loseSoul, draw, mill, gainLatent, emit, RuleError, addEffect};
export const other = (s, key) => s.order.find(k => k !== key);
export const id = (c, uid) => c.objects[uid]?.cardId;
export const isDevotee = (c, uid) => card(c, uid)?.kind === 'Devotee';
// Subtipo na linha de tipo ("Devotee — Specter"): Specter, Skeleton, Berserker, Marina, Hunter…
export const hasType = (c, uid, type) => new RegExp(`\\b${type}`, 'i').test(card(c, uid)?.type || '');
export const devotees = (s, c, key) => s.players[key].battlefield.filter(u => isDevotee(c, u));
export const enemies = (s, c, key) => devotees(s, c, other(s, key)).filter(u => !blockedNow(s, u)); // §43A Imune
// Equipment em campo dos dois jogadores (respostas a Equipment de Athena 057, Artemis 418 e Ares 324; autor, 06/11/2026).
export const allEquipment = (s, c) => Object.values(s.players).flatMap(p => p.battlefield).filter(u => card(c, u)?.kind === 'Equipment');
export const allDevotees = (s, c) => s.order.flatMap(k => devotees(s, c, k));
export const onField = (s, key, uid) => !!uid && controllerOf(s, uid) === key;
export const costOf = (c, uid) => card(c, uid)?.cost?.amount ?? 0;
export const bearerOf = (c, gear) => c.attached[gear] || null;
export const gearOf = (c, uid) => Object.keys(c.attached).filter(e => c.attached[e] === uid);
// "Once each round" de uma fonte: marca na hora em que o gatilho é gerado (o segundo evento do Round não gera).
export const once = (s, tag) => (s.roundUses.has(tag) ? false : (useOncePerRound(s, tag), true));
// Guia §64: turno e Round são a mesma coisa (autor, 04/11/2026).
export const onceTurn = (s, tag) => once(s, tag);
// Ressonância dos Domains (autor, 01/11/2026): só com God da facção; "once each turn" de verdade (tag com o turno).
export {domainResonant} from './registry.js';
export const resTag = (s, key, name) => resonanceTag(s, key, name);
// {N}{C} de gatilho opcional ("you may pay {N}{C}"): Base preparada primeiro, depois Latent (como play.payCost misto).
export const canPayCosmo = (s, key, n) => s.players[key].bases.filter(b => b.prepared).length + s.players[key].latent >= n;
// Gatilho da Ressonância "once each turn, when …, you may pay {N}{C}. If you do, …": o uso do turno é gasto ao pagar.
export const resPay = (s, c, key, name, n, ability, run, extra = {}) => !s.roundUses.has(resTag(s, key, name)) && canPayCosmo(s, key, n) && (st => {
  const tag = resTag(st, key, name);
  if (st.roundUses.has(tag) || !canPayCosmo(st, key, n) || !may(c, key, ability, {uid: `domain:${key}`, cost: `${n} Cosmo`, ...extra})) return;
  payCosmo(st, key, n);
  useOncePerRound(st, tag);
  run(st);
});
export function payCosmo(s, key, n) {
  if (!canPayCosmo(s, key, n)) return false;
  const fromBase = Math.min(n, s.players[key].bases.filter(b => b.prepared).length);
  if (fromBase) spendBase(s, key, fromBase);
  if (n - fromBase) payLatent(s, key, n - fromBase);
  return true;
}

// ---------- perguntas ----------
// "You may …": sim/não. `cost` aparece no modal (ex.: '1 Soul').
// Spell com alvo obrigatório só pode ser conjurada com ao menos um alvo legal (como 509 Tidal Veto): `spell.check`.
export const needTarget = (list, text = 'sem alvo legal') => (s, c, key) => { if (!list(s, c, key).length) throw new RuleError('alvo', text); };
export const may = (c, key, ability, extra = {}) => Boolean(c.decide?.(key, {ability, ...extra}));
// Escolha de alvo entre `options` (uids). Sem opção: null. `optional`: inclui recusar (null). `text`: frase do modal.
// `shown`: cartas à vista sem serem escolhíveis (mão revelada: o jogador vê a mão inteira, autor 08/11/2026).
export function choose(c, key, ability, options, {optional = false, text, shown} = {}) {
  const list = [...new Set(options.filter(Boolean))];
  if (!list.length) return null;
  if (optional && !may(c, key, ability, {text: text || 'Use this ability?', part: 'target'})) return null; // `part`: v6/targets.js guarda esta resposta como parte do alvo
  return c.decide?.(key, {ability, options: list, choose: 'target', text, ...(shown ? {shown: [...shown]} : {})}) ?? null;
}
// Até `count` alvos diferentes: sempre numa pergunta só, todos de uma vez (autor, 31/10/2026).
export const chooseUpTo = (c, key, ability, options, count, opts) => pickUpTo(c, key, ability, options, count, opts);
// "Up to N" numa pergunta só (autor, 31/10/2026: Great Eclipse em uma tela): escolhe de 0 a N de uma vez.
export function pickUpTo(c, key, ability, options, count, {text} = {}) {
  const list = [...new Set(options.filter(Boolean))];
  if (!list.length) return [];
  return c.decide?.(key, {ability, options: list, choose: 'target', count: Math.min(count, list.length), min: 0, text}) ?? [];
}
// Alvo entre Devotees e Gods: devolve uid ou 'god:A'/'god:B'.
export const godTarget = player => `god:${player}`;
export const isGod = t => typeof t === 'string' && t.startsWith('god:');

// ---------- efeitos ----------
// Dano que não é de Strike (passa pela Armor; prevenções "Strike damage" não valem). Checa derrotas depois.
export function damage(s, c, target, amount) {
  if (!target || amount <= 0) return;
  if (isGod(target)) return loseSoul(s, {[target.slice(4)]: amount}, 'damage');
  if (!controllerOf(s, target)) return;
  const mark = s.events.length, key = controllerOf(s, target);
  damageDevotee(s, c, target, amount, false);
  const hit = s.events.slice(mark).find(e => e.type === 'damage' && e.uid === target);
  if (hit?.dealt > 0) damagedHooks(s, c, key, target, {dealt: hit.dealt, foe: null, combat: false}); // gancho tookDamage
  checkDefeats(s, c);
}
export const loseSoulOf = (s, key, n) => loseSoul(s, {[key]: n}, 'loss');
// "Pay N Soul": custo. Não paga se não tiver Soul suficiente (devolve false).
export function paySoul(s, key, n) {
  if (s.players[key].soul < n) return false;
  loseSoul(s, {[key]: n}, 'payment');
  return true;
}
export function payLatent(s, key, n) {
  const p = s.players[key];
  if (p.latent < n) return false;
  p.latent -= n;
  emit(s, 'cosmo_spent', {player: key, unit: 'latent', amount: n});
  return true;
}
export function defeat(s, c, uid, event = 'destroyed') {
  if (!controllerOf(s, uid) || blockedNow(s, uid)) return;
  const owner = c.objects[uid].owner, gear = gearOf(c, uid); // antes da derrota: gatilhos "equipped Devotee is defeated"
  destroyDevotee(s, uid, c.objects, c.attached, event);
  emit(s, 'v6_defeat', {uid, owner});
  defeatedHooks(s, c, owner, uid, gear);
}
// "Sacrifice": o controlador derrota o próprio Devotee (conta como derrotado para os gatilhos).
export const sacrifice = (s, c, uid) => defeat(s, c, uid, 'sacrificed');
// Gatilhos de derrota fora de checkDefeats (derrota direta por efeito).
let defeatedHooks = () => {};
// Gancho leaves: saída do campo sem derrota (mão, exílio, Tartarus por efeito). Ligado em hooks.js.
let leavesHooks = () => {};
let damagedHooks = () => {};
export const setDamagedHooks = fn => { damagedHooks = fn; };
export const setLeavesHooks = fn => { leavesHooks = fn; };
export const setDefeatedHooks = fn => { defeatedHooks = fn; };

export function exhaust(s, uid) { if (s.units[uid] && !blockedNow(s, uid)) { s.units[uid].prepared = false; emit(s, 'exhausted', {uid}); } }
export const prepare = (s, uid) => { if (s.units[uid]) prepareUnit(s, uid); };
export function removeDamage(s, uid, n = Infinity) { if (s.units[uid]) s.units[uid].damage = Math.max(0, s.units[uid].damage - n); }
// Marcadores +1/+1 (e -1/-1): ficam no objeto enquanto ele estiver em campo; somados em mods() (effects.js).
export function addCounter(s, uid, n = 1) {
  if (!s.units[uid] || blockedNow(s, uid)) return;
  s.units[uid].training = (s.units[uid].training || 0) + n; // §48A: um campo só; negativo = marcador -1/-1 (neutras)
  emit(s, 'counter', {uid, amount: n});
}
// Marcadores com nome (Rebirth, etc.): só contagem, sem bônus.
export function addMarker(s, uid, name, n = 1) {
  if (!s.units[uid] || blockedNow(s, uid)) return;
  const m = (s.units[uid].markers ||= {});
  m[name] = Math.max(0, (m[name] || 0) + n);
}
export const markers = (s, uid, name) => s.units[uid]?.markers?.[name] || 0;
export const buff = (s, uid, atk, hp, duration = 'this_round', keywords = []) => { if (s.units[uid] && !blockedNow(s, uid)) modify(s, uid, {atk, hp, keywords}, duration); };

// Zonas. `from` 'tartarus' | 'hand' | 'deck' | 'battlefield'.
function take(s, c, uid, from) {
  const p = s.players[c.objects[uid].owner];
  if (from === 'battlefield') {
    restoreMoon(c.objects, uid);
    for (const pl of Object.values(s.players)) pl.battlefield = pl.battlefield.filter(x => x !== uid);
    delete s.units[uid];
    s.effects = s.effects.filter(e => e.target !== uid);
    for (const g of gearOf(c, uid)) delete c.attached[g];
    delete c.attached[uid];
    return true;
  }
  if (!p[from].includes(uid)) return false;
  p[from].splice(p[from].indexOf(uid), 1);
  return true;
}
// Token (guia §63): ao sair do campo deixa de existir.
const vanish = (c, uid) => (c.objects[uid]?.token ? (delete c.objects[uid], true) : false);
// `by`: jogador cujo efeito devolve (Unshaken Loyalty, Poseidon 176: efeito 'noBounce' barra retorno por efeito inimigo).
export function toHand(s, c, uid, from = 'tartarus', by = null) {
  if (from === 'battlefield' && (!controllerOf(s, uid) || blockedNow(s, uid))) return false;
  if (from === 'battlefield' && by && by !== controllerOf(s, uid) && s.effects.some(e => e.kind === 'noBounce' && e.target === uid)) return false;
  const was = from === 'battlefield' ? controllerOf(s, uid) : null; // gancho leaves (Devotee ou Equipment)
  if (!take(s, c, uid, from)) return false;
  if (was) leavesHooks(s, c, was, uid, 'hand');
  if (vanish(c, uid)) return true;
  s.players[c.objects[uid].owner].hand.push(uid);
  emit(s, 'returned_to_hand', {player: c.objects[uid].owner, uid, from});
  // Observadores `watchRecall(s, c, key, self, player, uid)`: carta voltou do Tartarus para a mão do dono (Domain 243).
  if (from === 'tartarus') watchers(s, c, 'watchRecall', [c.objects[uid].owner, uid], 'returned from the Tartarus');
  return true;
}
export function toTartarus(s, c, uid, from = 'hand') {
  if (from === 'battlefield' && (!controllerOf(s, uid) || blockedNow(s, uid))) return false;
  const was = from === 'battlefield' ? controllerOf(s, uid) : null; // gancho leaves (Devotee ou Equipment)
  if (!take(s, c, uid, from)) return false;
  if (was) leavesHooks(s, c, was, uid, 'tartarus');
  if (vanish(c, uid)) return true;
  s.players[c.objects[uid].owner].tartarus.push(uid);
  return true;
}
// Destrói um Equipment em campo: vai ao Tartarus do dono e avisa 'destroyed' (como Hades 262).
export function destroyEquipment(s, c, uid) {
  if (!toTartarus(s, c, uid, 'battlefield')) return false;
  emit(s, 'destroyed', {uid, owner: c.objects[uid].owner});
  return true;
}
// Ciclo das espadas Rare (autor, 07/11/2026): Imune a 2 facções; quando o portador causa dano de Golpe a um God,
// um efeito de cada facção barrada, na ordem do texto.
const SWORD_FX = {
  athena: (st, c, key) => gainSoul(st, key, 2),
  poseidon: (st, c, key) => draw(st, key, 1),
  hades: (st, c, key, ability) => discard(st, c, other(st, key), 1, ability),
  ares: (st, c, key, ability) => { const t = choose(c, key, ability, enemies(st, c, key), {text: 'Choose target enemy Devotee.'}); if (t) damage(st, c, t, 2); },
  artemis: (st, c, key) => { for (const b of st.players[key].bases.filter(x => !x.prepared).slice(0, 2)) b.prepared = true; },
};
export const sword = (ability, a, b) => ({
  immune: src => new RegExp(`^(god-)?(${a}|${b})`).test(src.cardId || ''),
  gearGodDamage: (s, c, key) => st => { SWORD_FX[a](st, c, key, ability); SWORD_FX[b](st, c, key, ability); },
});
export function exile(s, c, uid, from = 'battlefield') {
  if (from === 'battlefield' && (!controllerOf(s, uid) || blockedNow(s, uid))) return false;
  const was = from === 'battlefield' ? controllerOf(s, uid) : null; // gancho leaves (Devotee ou Equipment)
  if (!take(s, c, uid, from)) return false;
  if (was) leavesHooks(s, c, was, uid, 'void');
  if (vanish(c, uid)) return true;
  s.players[c.objects[uid].owner].void.push(uid);
  emit(s, 'exiled', {uid});
  return true;
}
// Põe um Devotee no campo sem pagar (retorno do Tartarus, busca no deck). Guia §62: volta Prepared, sem dano,
// salvo texto ("exhausted"/"Unprepared" → prepared false). Limite de 1 retorno do Tartarus por carta física/rodada.
export function putOntoField(s, c, key, uid, from, {prepared = true} = {}) {
  if (from === 'tartarus') {
    const tag = `return:${uid}`;
    if (s.roundUses.has(tag)) return false;
    useOncePerRound(s, tag);
  }
  if (!take(s, c, uid, from)) return false;
  s.players[key].battlefield.push(uid);
  s.units[uid] = {prepared, damage: 0, entered: s.turn};
  emit(s, 'card_played', {player: key, uid, kind: 'Devotee', from});
  enteredHooks(s, c, key, uid);
  return true;
}
// Token: Devotee sem carta (guia §63). Entra Unprepared; o uid vem de um contador do estado (o replay das decisões
// recria o mesmo uid). `spec`: {id, name, atk, hp, type}.
export function summonToken(s, c, key, spec) {
  if (!c.cards.has(spec.id)) c.cards.set(spec.id, {id: spec.id, name: spec.name, kind: 'Devotee', type: `Devotee — ${spec.type || 'Token'}`,
    cost: {amount: 0, unit: 'base'}, atk: spec.atk, hp: spec.hp, keywords: [], token: true});
  s.tokenSeq = (s.tokenSeq || 0) + 1;
  const uid = `${key}:token:${s.tokenSeq}`;
  c.objects[uid] = {owner: key, cardId: spec.id, armor: false, token: true};
  s.players[key].battlefield.push(uid);
  s.units[uid] = {prepared: false, damage: 0, entered: s.turn};
  emit(s, 'card_played', {player: key, uid, kind: 'Devotee', token: true});
  enteredHooks(s, c, key, uid);
  return uid;
}
let enteredHooks = () => {};
export const setEnteredHooks = fn => { enteredHooks = fn; };

// Descarte escolhido pelo próprio jogador; dispara observadores de descarte.
export function discard(s, c, key, n = 1, ability = 'Discard') {
  const out = [];
  for (let i = 0; i < n && s.players[key].hand.length; i++) {
    const uid = s.players[key].hand.length === 1 ? s.players[key].hand[0] : c.decide?.(key, {ability, options: [...s.players[key].hand], choose: 'discard-one', text: 'Choose a card to discard.'});
    if (!uid || !toTartarus(s, c, uid, 'hand')) break;
    emit(s, 'discarded', {player: key, uid});
    out.push(uid);
  }
  if (out.length) watchers(s, c, 'watchDiscard', [key, out[0]], 'Discard');
  return out;
}
export function discardRandom(s, c, key, n = 1, random = Math.random) {
  const out = [];
  for (let i = 0; i < n && s.players[key].hand.length; i++) {
    const uid = s.players[key].hand[Math.floor(random() * s.players[key].hand.length)];
    toTartarus(s, c, uid, 'hand');
    emit(s, 'discarded', {player: key, uid});
    out.push(uid);
  }
  if (out.length) watchers(s, c, 'watchDiscard', [key, out[0]], 'Discard');
  return out;
}
// Busca no deck: escolhe uma carta que satisfaz `filter`, revela, põe na mão e embaralha (sem embaralhador: mantém).
export function search(s, c, key, ability, filter) {
  const options = s.players[key].deck.filter(u => filter(card(c, u), u));
  const pick = options.length ? c.decide?.(key, {ability, options, choose: 'search', text: 'Choose a card to put into your hand.'}) : null;
  if (pick && take(s, c, pick, 'deck')) { s.players[key].hand.push(pick); emit(s, 'revealed', {player: key, uid: pick}); }
  return pick || null;
}
// Embaralha o deck de `key` (determinístico pelo estado: o replay das decisões repete a ordem).
export function shuffleDeck(st, key) {
  const deck = st.players[key].deck;
  let seed = (st.events.length * 2654435761 + st.turn * 40503 + deck.length) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  emit(st, 'shuffle', {player: key});
}
// Carta do topo do deck para a reserva de Cosmo (Base) — "put … into your Cosmo Bank face down as an unprepared Cosmo Base".
export function topToBase(s, key, prepared = false) {
  const uid = s.players[key].deck.shift();
  if (!uid) return null;
  s.players[key].bases.push({uid, prepared});
  emit(s, 'base_added', {player: key, prepared});
  return uid;
}

// Observadores (Domains e cartas em campo) — gatilhos na cadeia.
import {pushTriggers} from '../core.js';
export function watchers(s, c, hook, args, label) {
  pushTriggers(s, collect(s, c, s.order, hook, args, label));
}

// Contra-mágica (gancho watchSpell): tira a Spell `spellUid` da cadeia antes de resolver; vai para o Tartarus do Owner
// sem efeito. Devolve false se ela já não está na cadeia.
export function counterSpell(s, c, spellUid) {
  const at = s.chain.findIndex(i => (i.spell || i.card) && i.uid === spellUid); // Spell, Devotee ou Equipment na pilha (§56)
  if (at < 0) return false;
  const [item] = s.chain.splice(at, 1);
  for (const p of Object.values(s.players)) if (p.stack.includes(spellUid)) p.stack.splice(p.stack.indexOf(spellUid), 1);
  s.players[c.objects[spellUid].owner].tartarus.push(spellUid);
  emit(s, 'spell_countered', {player: item.controller, uid: spellUid});
  return true;
}
// Spell conjurada na cadeia agora (para `watchSpell` saber se ainda dá para contrariar).
export const spellOnChain = (s, spellUid) => s.chain.some(i => i.spell && i.uid === spellUid);

// ---------- alvos de Spell na cadeia (guia §54: alvos escolhidos ao conjurar) ----------
// Alvos que a Spell `item` guardou ao ser conjurada (uids, 'god:X' ou uid de Spell na cadeia).
export const itemTargets = item => item?.targets || (item?.target ? [item.target] : []);
export const spellTargets = (s, spellUid) => itemTargets(s.chain.find(i => i.spell && i.uid === spellUid));
// Alvo ainda legal agora: God sempre; Spell se segue na cadeia; Devotee/Equipment se segue em campo.
export const stillTarget = (s, t) => (isGod(t) ? true : spellOnChain(s, t) || !!controllerOf(s, t));
// A Spell mira o God de `key` ou um Devotee dele? (`only`: filtro extra sobre o Devotee, ex.: Marina)
export const targetsMine = (s, c, key, values, only = () => true) =>
  values.some(t => t === godTarget(key) || (isDevotee(c, t) && controllerOf(s, t) === key && only(t)));
