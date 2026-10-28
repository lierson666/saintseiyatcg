// Jogar cartas da mão na engine 3.0.
// Devotee: Sorcery (D173), entra Unprepared (ALPHA-P02 A). Equipment: custo alternativo, Spell: Tartarus do Owner
// (as duas aprovadas pelo autor em 28/10/2026). Moment/Technique: D194. Janela: ALPHA-P06 A.
// `ctx`: {cards (loadCanon), objects (uid -> {owner, cardId}), attached (uid do Equipment -> uid do portador)}.
import {RuleError, NotSpecified, assertIdle, spendBase, spellCategory, respond, emit} from './core.js';
import {SPELLS, ABILITIES, onEnter, onCastEquipment, checkDefeats, namedCharacter, enforceUniqueness} from './effects.js';

// Custo impresso: Base (D4) ou Latent. Valida tudo antes de mexer no estado.
export function payCost(state, key, cost) {
  if (!cost) return;
  const p = state.players[key];
  if (cost.unit === 'latent') {
    if (p.latent < cost.amount) throw new RuleError('custo', `Latent insuficiente (${p.latent}/${cost.amount})`);
    p.latent -= cost.amount;
    emit(state, 'cosmo_spent', {player: key, unit: 'latent', amount: cost.amount});
  } else spendBase(state, key, cost.amount);
}

// Sorcery: jogador ativo, partida em curso, janela fechada (D1, D173, P06). Devolve a carta da mão.
function sorceryFromHand(state, ctx, key, uid, kind) {
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  if (key !== state.active) throw new RuleError('D1', 'só o jogador ativo age, no próprio turno');
  assertIdle(state);
  return fromHand(state, ctx, key, uid, kind);
}
function fromHand(state, ctx, key, uid, kind) {
  const card = ctx.cards.get(ctx.objects[uid]?.cardId);
  if (!state.players[key].hand.includes(uid)) throw new RuleError('mão', 'a carta não está na mão');
  if (card.kind !== kind) throw new RuleError('mão', `a carta não é ${kind}`);
  return card;
}
const leaveHand = (state, key, uid) => { const hand = state.players[key].hand; hand.splice(hand.indexOf(uid), 1); };

// `choice.target`: alvo do gatilho de entrada (Eagle Marin).
// Personagem nomeado de `uid` que `key` já controla (§63), ou null: jogar essa carta vai pedir a escolha de quem fica.
export function duplicateCharacter(state, ctx, key, uid) {
  const who = namedCharacter(ctx, uid);
  return who && state.players[key].battlefield.some(u => u !== uid && ctx.cards.get(ctx.objects[u].cardId).kind === 'Devotee' && namedCharacter(ctx, u) === who) ? who : null;
}

export function playDevotee(state, ctx, key, uid, choice = {}) {
  const card = sorceryFromHand(state, ctx, key, uid, 'Devotee');
  payCost(state, key, card.cost);
  leaveHand(state, key, uid);
  state.players[key].battlefield.push(uid);
  state.units[uid] = {prepared: false, damage: 0, entered: state.turn}; // P02: entra Unprepared
  emit(state, 'card_played', {player: key, uid, kind: 'Devotee'});
  onEnter(state, ctx, key, uid, choice);
  enforceUniqueness(state, ctx); // §63 (autor, 28/10/2026): pode jogar a segunda versão; o controlador escolhe quem fica
}

// Equipment (custo alternativo, autor 28/10/2026): no Devotee nomeado em Auto-Equip, paga o Casting Cost;
// em outro Devotee permitido por "Equip {N}", paga N em vez do Casting Cost. Sem portador legal, não joga.
// Ação comum: não abre janela (P06).
// `choice.target`: alvo do gatilho "When you cast" (019).
export function playEquipment(state, ctx, key, uid, bearer, choice = {}) {
  const card = sorceryFromHand(state, ctx, key, uid, 'Equipment');
  const cost = equipCost(state, ctx, key, card, bearer);
  payCost(state, key, cost);
  leaveHand(state, key, uid);
  state.players[key].battlefield.push(uid);
  ctx.attached[uid] = bearer;
  emit(state, 'card_played', {player: key, uid, kind: 'Equipment', bearer});
  onCastEquipment(state, ctx, key, uid, choice);
  return {cost};
}

// Habilidade ativada com {T} de um Devotee seu (ABILITIES em effects.js).
export function activate(state, ctx, key, uid, choice = {}) {
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  if (key !== state.active) throw new RuleError('D1', 'só o jogador ativo age, no próprio turno');
  assertIdle(state); // D173: Sorcery
  const ability = ABILITIES[ctx.objects[uid]?.cardId.slice(-3)];
  if (!ability || !state.players[key].battlefield.includes(uid)) throw new RuleError('{T}', 'sem habilidade ativada implementada');
  if (state.units[uid]?.prepared !== true) throw new RuleError('D192', 'o Devotee precisa estar Prepared para {T}');
  if (ability.once && state.roundUses.has(`ability:${uid}`)) throw new RuleError('D191', `${ability.name} já foi usada neste Round`);
  ability.check(state, ctx, key, choice);
  spendBase(state, key, ability.cost); // {N}{C}: Base preparada (autor, 28/10/2026)
  if (ability.once) state.roundUses.add(`ability:${uid}`);
  state.units[uid].prepared = false;
  emit(state, 'ability', {player: key, uid, name: ability.name, target: choice.target});
  ability.run(state, ctx, key, choice);
  checkDefeats(state, ctx);
}

// Equipment solto no campo (não-Armor cujo portador saiu) volta a um Devotee seu pagando Equip {N}
// (autor, 28/10/2026); no Devotee nomeado em Auto-Equip vale o Casting Cost, como ao jogar. Sorcery.
export function reequip(state, ctx, key, uid, bearer) {
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  if (key !== state.active) throw new RuleError('D1', 'só o jogador ativo age, no próprio turno');
  assertIdle(state);
  const card = ctx.cards.get(ctx.objects[uid]?.cardId);
  if (!state.players[key].battlefield.includes(uid) || card?.kind !== 'Equipment' || ctx.attached[uid]) {
    throw new RuleError('Equip', 'só Equipment seu, solto no campo, pode ser reequipado');
  }
  const cost = equipCost(state, ctx, key, card, bearer);
  payCost(state, key, cost);
  ctx.attached[uid] = bearer;
  emit(state, 'equipped', {player: key, uid, bearer});
  return {cost};
}

function equipCost(state, ctx, key, card, bearer) {
  const target = ctx.cards.get(ctx.objects[bearer]?.cardId);
  if (!state.players[key].battlefield.includes(bearer) || target?.kind !== 'Devotee') {
    throw new RuleError('Equip', 'o portador precisa ser um Devotee seu no campo');
  }
  if (card.autoEquip.some(name => name.toUpperCase() === target.name.toUpperCase())) return card.cost;
  if (card.equip) return {amount: card.equip.amount, unit: card.cost.unit}; // "Other" e "Any" cobrem quem não é nomeado
  if (!card.autoEquip.length) throw new NotSpecified(`${card.id}: Equipment sem Auto-Equip nem Equip {N}`);
  throw new RuleError('Equip', `${card.name} só equipa ${card.autoEquip.join(' ou ')}`);
}

// Spell: Technique é Sorcery e paga Base; Moment é Instant e paga Latent (D194). A carta fica em `stack`
// enquanto está na cadeia e vai para o Tartarus do Owner depois de resolver (autor, 28/10/2026).
// `choice`: escolhas da carta ({target, targets, mode, prepare}); o efeito vem de SPELLS (effects.js).
// Uma função no lugar de `choice` substitui o efeito (testes de procedimento).
export function playSpell(state, ctx, key, uid, choice = {}) {
  const number = Number(ctx.objects[uid]?.cardId.slice(-3)), category = spellCategory(number);
  if (!category) throw new NotSpecified(`categoria de Spell da carta ${number} (D194 cobre 18 cartas)`);
  const spell = SPELLS[ctx.objects[uid].cardId.slice(-3)];
  if (typeof choice !== 'function' && !spell) throw new NotSpecified(`efeito da carta ${number} ainda não implementado na engine 3.0`);
  if (typeof choice !== 'function') spell.check(state, ctx, key, choice); // alvo e modo antes de pagar
  const effect = typeof choice === 'function' ? choice : st => spell.run(st, ctx, key, choice);
  const p = state.players[key];
  const finish = st => { emit(st, 'spell_resolved', {player: key, uid}); effect(st); st.players[key].stack.splice(st.players[key].stack.indexOf(uid), 1); st.players[ctx.objects[uid].owner].tartarus.push(uid); checkDefeats(st, ctx); }; // `st`, não o estado capturado: o snapshot da decisão troca os objetos
  if (category.speed === 'sorcery') {
    const card = sorceryFromHand(state, ctx, key, uid, 'Spell');
    payCost(state, key, card.cost);
    leaveHand(state, key, uid);
    p.stack.push(uid);
    emit(state, 'card_played', {player: key, uid, kind: 'Spell', category: category.category});
    finish(state); // Sorcery não abre janela (P06): resolve na hora
    return;
  }
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  const card = fromHand(state, ctx, key, uid, 'Spell');
  // Instant: fora de janela só o ativo; dentro, quem tem prioridade (P06). Checa antes de pagar.
  if (state.window ? state.window.priority !== key : key !== state.active) throw new RuleError('P06', `${key} não pode jogar Instant agora`);
  payCost(state, key, card.cost);
  leaveHand(state, key, uid);
  p.stack.push(uid);
  emit(state, 'card_played', {player: key, uid, kind: 'Spell', category: category.category});
  // `target` só informa a interface (seta do alvo); a resolução usa `choice`.
  respond(state, key, {speed: 'instant', uid, run: finish, target: typeof choice === 'object' ? choice.target ?? null : null}); // Moment jogado abre ou continua a janela
}
