// Jogar cartas da mão na engine 3.0.
// Devotee: Sorcery (D173), entra Unprepared (ALPHA-P02 A). Equipment: custo alternativo, Spell: Tartarus do Owner
// (as duas aprovadas pelo autor em 28/10/2026). Moment/Technique: D194. Janela: ALPHA-P06 A.
// `ctx`: {cards (loadCanon), objects (uid -> {owner, cardId}), attached (uid do Equipment -> uid do portador)}.
import {RuleError, NotSpecified, assertIdle, spendBase, spellCategory, respond} from './core.js';

// Custo impresso: Base (D4) ou Latent. Valida tudo antes de mexer no estado.
export function payCost(state, key, cost) {
  if (!cost) return;
  const p = state.players[key];
  if (cost.unit === 'latent') {
    if (p.latent < cost.amount) throw new RuleError('custo', `Latent insuficiente (${p.latent}/${cost.amount})`);
    p.latent -= cost.amount;
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

export function playDevotee(state, ctx, key, uid) {
  const card = sorceryFromHand(state, ctx, key, uid, 'Devotee');
  payCost(state, key, card.cost);
  leaveHand(state, key, uid);
  state.players[key].battlefield.push(uid);
  state.units[uid] = {prepared: false, damage: 0, entered: state.turn}; // P02: entra Unprepared
}

// Equipment (custo alternativo, autor 28/10/2026): no Devotee nomeado em Auto-Equip, paga o Casting Cost;
// em outro Devotee permitido por "Equip {N}", paga N em vez do Casting Cost. Sem portador legal, não joga.
// Ação comum: não abre janela (P06).
export function playEquipment(state, ctx, key, uid, bearer) {
  const card = sorceryFromHand(state, ctx, key, uid, 'Equipment');
  const target = ctx.cards.get(ctx.objects[bearer]?.cardId);
  if (!state.players[key].battlefield.includes(bearer) || target?.kind !== 'Devotee') {
    throw new RuleError('Equip', 'o portador precisa ser um Devotee seu no campo');
  }
  const named = card.autoEquip.some(name => name.toUpperCase() === target.name.toUpperCase());
  let cost;
  if (named) cost = card.cost;
  else if (card.equip) cost = {amount: card.equip.amount, unit: card.cost.unit}; // "Other" e "Any" cobrem quem não é nomeado
  else if (!card.autoEquip.length) throw new NotSpecified(`${card.id}: Equipment sem Auto-Equip nem Equip {N}`);
  else throw new RuleError('Equip', `${card.name} só equipa ${card.autoEquip.join(' ou ')}`);
  payCost(state, key, cost);
  leaveHand(state, key, uid);
  state.players[key].battlefield.push(uid);
  ctx.attached[uid] = bearer;
  return {cost};
}

// Spell: Technique é Sorcery e paga Base; Moment é Instant e paga Latent (D194). A carta fica em `stack`
// enquanto está na cadeia e vai para o Tartarus do Owner depois de resolver (autor, 28/10/2026).
// `effect(state)`: o efeito da carta; os efeitos ainda não estão na engine, então quem chama fornece.
export function playSpell(state, ctx, key, uid, effect) {
  const number = Number(ctx.objects[uid]?.cardId.slice(-3)), category = spellCategory(number);
  if (!category) throw new NotSpecified(`categoria de Spell da carta ${number} (D194 cobre 18 cartas)`);
  if (typeof effect !== 'function') throw new NotSpecified(`efeito da carta ${number} ainda não implementado na engine 3.0`);
  const p = state.players[key], owner = state.players[ctx.objects[uid].owner];
  const finish = st => { effect(st); st.players[key].stack.splice(st.players[key].stack.indexOf(uid), 1); owner.tartarus.push(uid); };
  if (category.speed === 'sorcery') {
    const card = sorceryFromHand(state, ctx, key, uid, 'Spell');
    payCost(state, key, card.cost);
    leaveHand(state, key, uid);
    p.stack.push(uid);
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
  respond(state, key, {speed: 'instant', run: finish}); // Moment jogado abre ou continua a janela
}
