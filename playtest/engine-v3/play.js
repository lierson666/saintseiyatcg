// Jogar cartas da mão na engine 3.0.
// Devotee: Sorcery (D173), entra Unprepared (ALPHA-P02 A). Equipment: custo alternativo, Spell: Tartarus do Owner
// (as duas aprovadas pelo autor em 28/10/2026). Moment/Technique: D194. Janela: ALPHA-P06 A.
// `ctx`: {cards (loadCanon), objects (uid -> {owner, cardId}), attached (uid do Equipment -> uid do portador)}.
import {RuleError, NotSpecified, assertIdle, spendBase, spellCategory, respond, emit, openWindow, pushTriggers, useOncePerRound, loseSoul} from './core.js';
import {SPELLS, ABILITIES, onEnter, onCastEquipment, checkDefeats, namedCharacter, enforceUniqueness, silenced} from './effects.js';
import {v6Spell, entryOf, V6, v6Attach} from './v6/hooks.js';
import {collect, sources, domainEntry, domainResonant, resonanceTag} from './v6/registry.js';
import {AFTERLIFE} from './v6/afterlife.js';
import {exile} from './v6/kit.js';
import {aim, withTargets} from './v6/targets.js';
import {resonates} from '../../shared/canon-cards.js';

// Guia §5: Moment como AÇÃO, Technique, Equipment que não é Armor, Equip e habilidades comuns pagam em Base e/ou Latent.
// Devotee, Armor e Ultimate: só Base; Moment como resposta: só Latent no turno do adversário, Base e/ou Latent no próprio.
export const mixed = cost => cost && {...cost, unit: 'mixed'};
const responseCost = (state, key, cost) => (state.active === key ? mixed(cost) : {amount: cost.amount, unit: 'latent'});

// Custo impresso: Base (D4), Latent ou misto. Valida tudo antes de mexer no estado.
// shortcut: no misto gasta Base primeiro e completa com Latent (o jogador não escolhe a divisão); Latent persiste, Base renova.
export function payCost(state, key, cost) {
  if (!cost) return;
  const p = state.players[key];
  if (cost.unit === 'mixed') {
    const bases = p.bases.filter(b => b.prepared).length, fromBase = Math.min(bases, cost.amount), rest = cost.amount - fromBase;
    if (rest > p.latent) throw new RuleError('custo', `Cosmo insuficiente (${bases} Base + ${p.latent} Latent / ${cost.amount})`);
    spendBase(state, key, fromBase);
    if (rest) { p.latent -= rest; emit(state, 'cosmo_spent', {player: key, unit: 'latent', amount: rest}); }
    return;
  }
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

// Redução de custo V6 (gancho costLess): cada fonte do jogador devolve {n, min, tag}; `min` é o piso do texto
// ("to a minimum of 1"), `tag` marca "the first … each round" e só é gasta quando o custo é pago.
function discount(state, ctx, key, uid, cost) {
  if (cost && state.hidden?.uid === uid) cost = {...cost, amount: state.hidden.amount}; // Hidden Cosmo (§4A): {X} no lugar do impresso
  let n = 0, min = 0;
  const tags = [];
  for (const {self, entry} of cost ? sources(state, ctx, key) : []) {
    const r = entry.costLess?.(state, ctx, key, self, uid);
    if (!r) continue;
    n += r.n; min = Math.max(min, r.min ?? 0);
    if (r.tag) tags.push(r.tag);
  }
  return {cost: n ? {...cost, amount: Math.max(Math.min(min, cost.amount), cost.amount - n)} : cost, tags};
}
// Custo de conjurar `uid` agora, com reduções (a interface usa para saber se dá para pagar).
export const castCost = (state, ctx, key, uid, cost) => discount(state, ctx, key, uid, cost).cost;
function payCast(state, ctx, key, uid, cost) {
  const d = discount(state, ctx, key, uid, cost);
  payCost(state, key, d.cost);
  d.tags.forEach(tag => useOncePerRound(state, tag));
  return d.cost;
}

// Guia §56 (autor, 30/10/2026): tudo vai à pilha, como no Magic. A carta paga, sai da mão, vai ao `stack` do jogador e
// espera na cadeia com janela de resposta (só Moment responde); `resolve(st)` roda quando os dois passam. Contrariada
// (kit.counterSpell acha o item por `card: true`), vai ao Tartarus do dono. `st`: o snapshot da decisão troca os objetos.
function castToStack(state, key, uid, announce, resolve) {
  state.players[key].stack.push(uid);
  emit(state, 'card_played', {player: key, uid, ...announce});
  openWindow(state);
  state.chain.push({controller: key, uid, speed: 'instant', card: true, run: st => {
    const at = st.players[key].stack.indexOf(uid);
    if (at >= 0) st.players[key].stack.splice(at, 1);
    resolve(st);
  }});
  emit(state, 'chain_add', {player: key, uid});
}

export function playDevotee(state, ctx, key, uid, choice = {}) {
  const card = sorceryFromHand(state, ctx, key, uid, 'Devotee');
  payCast(state, ctx, key, uid, card.cost);
  leaveHand(state, key, uid);
  castToStack(state, key, uid, {kind: 'Devotee'}, st => {
    st.players[key].battlefield.push(uid);
    // P02: entra Unprepared; com Impulse entra Prepared, pronto para o Strike (autor, 29/10/2026).
    st.units[uid] = {prepared: card.keywords.includes('Impulse'), damage: 0, entered: st.turn};
    emit(st, 'entered', {player: key, uid, kind: 'Devotee'});
    onEnter(st, ctx, key, uid, choice);
    enforceUniqueness(st, ctx); // §63 (autor, 28/10/2026): pode jogar a segunda versão; o controlador escolhe quem fica
  });
}

// Equipment (guia §28/§33, 02/11/2026): paga o custo impresso, só Base; entra preso só num Resonant seu (`bearer`, sem Equip),
// senão sem portador; prender depois é outra ação (`reequip`, Equip impresso).
// Vai à pilha (guia §56, 30/10/2026); ao resolver, entra em campo. Se o portador saiu antes de resolver, entra sem portador.
// `choice.target`: alvo do gatilho "When you cast" (019).
// Item global ("Equip: None — Global"): paga o Casting Cost e fica no campo sem portador; `bearer` é ignorado.
export function playEquipment(state, ctx, key, uid, bearer, choice = {}) {
  const card = sorceryFromHand(state, ctx, key, uid, 'Equipment');
  if (!card.armor && !(bearer && resonant(state, ctx, key, card, bearer))) bearer = null; // global e arma/acessório sem Resonant: sem portador (§33)
  // Guia §28 (30/10/2026): Armor paga só o custo impresso; entra vestida apenas num Resonant seu (sem Equip), senão sem portador.
  if (card.armor && bearer && !resonant(state, ctx, key, card, bearer)) throw new RuleError('Resonance', `${card.name} só entra vestida num Devotee Resonant; senão entra sem portador`);
  const cost = payCast(state, ctx, key, uid, card.global ? mixed(card.cost) : card.cost); // jogar: só Base (guia §5, §33)
  leaveHand(state, key, uid);
  castToStack(state, key, uid, {kind: 'Equipment', bearer}, st => {
    const holder = bearer && st.players[key].battlefield.includes(bearer) ? bearer : null;
    st.players[key].battlefield.push(uid);
    if (holder) { if (card.armor) dropArmor(ctx, holder, uid); ctx.attached[uid] = holder; }
    emit(st, 'entered', {player: key, uid, kind: 'Equipment', bearer: holder});
    onCastEquipment(st, ctx, key, uid, choice);
    if (holder) v6Attach(st, ctx, key, uid, holder); // gancho attach
  });
  pushTriggers(state, collect(state, ctx, [key], 'watchEquipCast', [uid], 'an Equipment is cast')); // "when you cast": acima do item na pilha
  return {cost};
}

// Habilidade ativada com {T} de um Devotee seu (ABILITIES em effects.js).
// Afterlife (guia §40, autor 01/11/2026): do Tartarus, no próprio turno com a pilha vazia ou como resposta (só Latent).
// Devolve o motivo do bloqueio ou null. Motivos: 'none', 'zone', 'chain', 'timing', 'cost', 'target'.
export function afterlifeBlock(state, ctx, key, uid) {
  const ability = AFTERLIFE[ctx.objects[uid]?.cardId], p = state.players[key];
  if (!ability) return 'none';
  if (!p.tartarus.includes(uid)) return 'zone';
  if (state.chain.some(item => item.afterlife === uid)) return 'chain';
  const response = Boolean(state.window);
  if (state.victory || state.setup || (response ? state.window.priority !== key : key !== state.active || state.chain.length)) return 'timing';
  if ((response ? p.latent : p.bases.filter(b => b.prepared).length + p.latent) < ability.cost) return 'cost';
  try { ability.check?.(state, ctx, key, uid); } catch (e) { if (e instanceof RuleError) return 'target'; throw e; }
  return null;
}

export function activateAfterlife(state, ctx, key, uid) {
  const block = afterlifeBlock(state, ctx, key, uid);
  if (block) throw new RuleError('§40', `Afterlife indisponível: ${block}`);
  const ability = AFTERLIFE[ctx.objects[uid].cardId], cost = {amount: ability.cost, unit: 'base'};
  payCost(state, key, state.window ? {amount: ability.cost, unit: 'latent'} : mixed(cost));
  emit(state, 'ability', {player: key, uid, name: ability.name});
  respond(state, key, {speed: 'instant', uid, ability: ability.name, afterlife: uid, run: st => {
    ability.run(st, ctx, key, uid);
    if (st.players[key].tartarus.includes(uid)) exile(st, ctx, uid, 'tartarus');
    checkDefeats(st, ctx);
  }});
}

export function activate(state, ctx, key, uid, choice = {}) {
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  // Guia §56 (autor, 03/11/2026): `speed: 'moment'` responde numa janela em que o jogador tem prioridade e paga como Moment.
  const answering = entryOf(ctx, uid)?.activate?.speed === 'moment' && Boolean(state.window);
  if (answering) { if (state.window.priority !== key) throw new RuleError('P06', `${key} não tem prioridade`); } else {
    if (key !== state.active) throw new RuleError('D1', 'só o jogador ativo age, no próprio turno');
    assertIdle(state); // D173: Sorcery
  }
  // Domain (`domain:${key}`): ativada da linha geral do Domain do próprio jogador (vale com qualquer God); não é objeto de deck nem tem {T}.
  // `domain:${key}:res`: Ressonância (rebalanceamento dos Domains, autor 01/11/2026): só com God da facção do Domain, uma vez por turno.
  const domain = String(uid).startsWith('domain:'), res = uid === `domain:${key}:res`, dom = domain && domainEntry(state, key);
  if (res && !domainResonant(state, key) && V6[state.domains?.[key]]?.res) throw new RuleError('§63', 'Ressonância: o seu God não é da facção do Domain');
  if (domain && !(res ? dom?.res : uid === `domain:${key}` && dom?.activate)) throw new RuleError('{T}', 'sem habilidade ativada de Domain');
  const resTag = res && resonanceTag(state, key, 'activate');
  if (res && state.roundUses.has(resTag)) throw new RuleError('§63', 'a Ressonância já foi usada neste turno');
  const v6 = domain ? (res ? dom.res : dom.activate) : entryOf(ctx, uid)?.activate;
  const ability = v6 ? {...v6, ...(domain && {tap: false}), check: (s, c, k, ch) => v6.check?.(s, c, k, uid, ch), run: (s, c, k, ch) => v6.run(s, c, k, uid, ch)}
    : ABILITIES[ctx.objects[uid]?.cardId.slice(-3)];
  if (!ability || (!domain && !state.players[key].battlefield.includes(uid))) throw new RuleError('{T}', 'sem habilidade ativada implementada');
  if (!domain && silenced(state, uid)) throw new RuleError('V6', 'este Devotee perdeu as habilidades ativadas neste Round');
  if (ability.tap !== false && state.units[uid]?.prepared !== true) throw new RuleError('D192', 'o Devotee precisa estar Prepared para {T}');
  const once = typeof ability.once === 'function' ? ability.once(state, ctx, key, uid) : ability.once; // ex.: 016 com Ikki não tem limite
  if (once && state.roundUses.has(`ability:${uid}`)) throw new RuleError('D191', `${ability.name} já foi usada neste Round`);
  ability.check(state, ctx, key, choice);
  const printed = {amount: ability.cost || 0, unit: 'base'};
  payCost(state, key, answering ? responseCost(state, key, printed) : mixed(printed)); // {N}{C}: Base e/ou Latent (guia §5)
  if (res) state.roundUses.add(resTag);
  if (once) state.roundUses.add(`ability:${uid}`);
  if (ability.tap !== false) state.units[uid].prepared = false;
  const src = res ? `domain:${key}` : uid; // a interface acha o Domain por `domain:${key}`
  emit(state, 'ability', {player: key, uid: src, name: ability.name, target: choice.target});
  // Guia §56 (30/10/2026): a habilidade ativada vai à pilha com janela de resposta; custo e {T} já foram pagos.
  const item = {uid: src, speed: 'instant', ability: ability.name, target: choice.target ?? null, run: st => { ability.run(st, ctx, key, choice); checkDefeats(st, ctx); }};
  if (answering) return void respond(state, key, item);
  openWindow(state);
  state.chain.push({controller: key, ...item});
  emit(state, 'chain_add', {player: key, uid: src});
}

// Equipment solto no campo (não-Armor recém-jogado ou cujo portador saiu) se prende a um Devotee seu pagando Equip {N},
// inclusive o Resonant (guia §33, 02/11/2026). Sorcery.
// Armor (guia §28, 30/10/2026): sem portador ou tirada de outro Devotee seu; AÇÃO + Equip impresso para qualquer um, inclusive o Resonant.
export function reequip(state, ctx, key, uid, bearer) {
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  if (key !== state.active) throw new RuleError('D1', 'só o jogador ativo age, no próprio turno');
  assertIdle(state);
  const card = ctx.cards.get(ctx.objects[uid]?.cardId);
  if (!state.players[key].battlefield.includes(uid) || card?.kind !== 'Equipment' || (ctx.attached[uid] && !card.armor)) {
    throw new RuleError('Equip', 'só Equipment seu, solto no campo, pode ser reequipado');
  }
  if (card.armor && ctx.attached[uid] === bearer) throw new RuleError('Equip', `${card.name} já está nesse Devotee`);
  const cost = card.armor ? armorEquipCost(state, ctx, key, card, bearer) : equipCost(state, ctx, key, card, bearer);
  payCost(state, key, mixed(cost)); // Equip e transferência: Base e/ou Latent (guia §5, §28)
  if (card.armor) dropArmor(ctx, bearer, uid);
  ctx.attached[uid] = bearer;
  emit(state, 'equipped', {player: key, uid, bearer});
  v6Attach(state, ctx, key, uid, bearer); // gancho attach: Equipment/Armor equipado depois da conjuração
  return {cost};
}

// Devotee seu no campo cujo nome está na Resonance da Armor (auto_equip_en; Owner/Auto-Equip antigos valem como Resonance).
export function resonant(state, ctx, key, card, bearer) {
  const target = ctx.cards.get(ctx.objects[bearer]?.cardId);
  return state.players[key].battlefield.includes(bearer) && target?.kind === 'Devotee'
    && resonates(card, target);
}
function armorEquipCost(state, ctx, key, card, bearer) {
  const target = ctx.cards.get(ctx.objects[bearer]?.cardId);
  if (!state.players[key].battlefield.includes(bearer) || target?.kind !== 'Devotee') throw new RuleError('Equip', 'o portador precisa ser um Devotee seu no campo');
  if (!card.equip) throw new NotSpecified(`${card.id}: Armor sem Equip {N} impresso`);
  return {amount: card.equip.amount, unit: 'base'}; // reequip paga como misto (Base e/ou Latent)
}
// Um slot de Armor (§26): a Armor que o novo portador vestia fica no campo sem portador.
export function dropArmor(ctx, bearer, keep) {
  for (const e of Object.keys(ctx.attached)) if (e !== keep && ctx.attached[e] === bearer && ctx.objects[e].armor) delete ctx.attached[e];
}

function equipCost(state, ctx, key, card, bearer) {
  const target = ctx.cards.get(ctx.objects[bearer]?.cardId);
  if (!state.players[key].battlefield.includes(bearer) || target?.kind !== 'Devotee') {
    throw new RuleError('Equip', 'o portador precisa ser um Devotee seu no campo');
  }
  if (card.equip) return {amount: card.equip.amount, unit: card.cost.unit};
  if (resonates(card, target)) return card.cost; // carta nomeada sem Equip impresso
  if (card.global) throw new RuleError('Equip', `${card.name} é global e não se prende a um Devotee`);
  if (!card.autoEquip.length) throw new NotSpecified(`${card.id}: Equipment sem Resonance nem Equip {N}`);
  throw new RuleError('Equip', `${card.name} só equipa ${card.autoEquip.join(' ou ')}`);
}

// Spell: Technique é Sorcery e paga Base; Moment é Instant e paga Latent (D194). A carta fica em `stack`
// enquanto está na cadeia e vai para o Tartarus do Owner depois de resolver (autor, 28/10/2026).
// `choice`: escolhas da carta ({target, targets, mode, prepare}); o efeito vem de SPELLS (effects.js).
// Uma função no lugar de `choice` substitui o efeito (testes de procedimento).
export function playSpell(state, ctx, key, uid, choice = {}) {
  if (typeof choice !== 'function' && v6Spell(ctx, uid)) return playSpellV6(state, ctx, key, uid, choice);
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
    payCost(state, key, mixed(card.cost));
    leaveHand(state, key, uid);
    p.stack.push(uid);
    emit(state, 'card_played', {player: key, uid, kind: 'Spell', category: category.category});
    // Toda Spell abre janela de resposta antes de resolver (autor, 29/10/2026; substitui P06 para Spells).
    openWindow(state);
    state.chain.push({controller: key, uid, speed: 'instant', run: finish, target: typeof choice === 'object' ? choice.target ?? null : null, spell: true});
    emit(state, 'chain_add', {player: key, uid});
    return;
  }
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  const card = fromHand(state, ctx, key, uid, 'Spell');
  // Instant: fora de janela só o ativo; dentro, quem tem prioridade (P06). Checa antes de pagar.
  if (state.window ? state.window.priority !== key : key !== state.active) throw new RuleError('P06', `${key} não pode jogar Instant agora`);
  payCost(state, key, state.window ? responseCost(state, key, card.cost) : mixed(card.cost)); // guia §5
  leaveHand(state, key, uid);
  p.stack.push(uid);
  emit(state, 'card_played', {player: key, uid, kind: 'Spell', category: category.category});
  // `target` só informa a interface (seta do alvo); a resolução usa `choice`.
  respond(state, key, {speed: 'instant', uid, run: finish, target: typeof choice === 'object' ? choice.target ?? null : null}); // Moment jogado abre ou continua a janela
}

// Spell V6 (guia §54, autor 29/10/2026): Technique exige AÇÃO (própria vez, cadeia vazia) e paga o custo impresso em Base e/ou Latent;
// Moment joga como AÇÃO (Base e/ou Latent) ou como resposta numa janela em que tem prioridade, pagando só Latent (guia §5).
// Alvos (e modos) são escolhidos AO CONJURAR, antes de pagar e de abrir a janela (v6/targets.js); ficam em `item.targets`
// e no evento `spell_targets`. Na resolução, alvo que já não é legal faz a parte dele não acontecer. Demais escolhas
// ("you may", descarte, busca) continuam sendo perguntas da resolução. `choice` é repassado a spell.check/run.
function playSpellV6(state, ctx, key, uid, choice) {
  const {entry, category} = v6Spell(ctx, uid);
  const response = category === 'Moment' && state.window;
  let aimed = {records: [], values: []};
  // `finish` usa `st` (o snapshot da decisão troca os objetos do estado) e as respostas de alvo guardadas ao conjurar.
  const finish = st => {
    emit(st, 'spell_resolved', {player: key, uid});
    // Redirecionamento (Sky Defender 461): troca o alvo `from` por `to` nas respostas guardadas; alvo ilegal vira null.
    const swap = st.v6Redirect?.[uid], to = v => (swap && v === swap.from ? swap.to : v);
    const records = aimed.records && aimed.records.map(r => ({...r, value: to(r.value)}));
    withTargets(ctx, key, records, () => entry.spell.run(st, ctx, key, uid, choice, aimed.values.map(to)));
    st.players[key].stack.splice(st.players[key].stack.indexOf(uid), 1);
    st.players[ctx.objects[uid].owner].tartarus.push(uid);
    checkDefeats(st, ctx);
  };
  const announce = () => emit(state, 'card_played', {player: key, uid, kind: 'Spell', category, targets: aimed.values});
  const item = () => ({speed: 'instant', uid, run: finish, target: aimed.values[0] ?? null, targets: aimed.values, spell: true});
  if (!response) {
    const card = sorceryFromHand(state, ctx, key, uid, 'Spell');
    entry.spell.check?.(state, ctx, key, choice);
    aimed = aim(state, ctx, key, uid, entry, choice); // pergunta os alvos antes de pagar (pode restaurar o estado: nada capturado antes)
    payCast(state, ctx, key, uid, mixed(card.cost)); // Technique e Moment como AÇÃO: Base e/ou Latent (guia §5)
    leaveHand(state, key, uid);
    entry.spell.cost?.(state, ctx, key, uid); // custo adicional (ex.: descarte do 476), pago ao conjurar
    state.players[key].stack.push(uid);
    announce();
    // Toda Spell espera na cadeia e abre janela de resposta (autor, 29/10/2026); watchSpell (contra-mágica) entra junto.
    const watchers = collect(state, ctx, state.order, 'watchSpell', [key, uid, aimed.values], 'a Moment or Technique is cast');
    openWindow(state);
    state.chain.push({controller: key, ...item()});
    emit(state, 'chain_add', {player: key, uid});
    pushTriggers(state, watchers);
    return;
  }
  if (state.victory) throw new RuleError('D52', 'a partida já terminou');
  const card = fromHand(state, ctx, key, uid, 'Spell');
  if (state.window.priority !== key) throw new RuleError('P06', `${key} não tem prioridade`);
  entry.spell.check?.(state, ctx, key, choice);
  aimed = aim(state, ctx, key, uid, entry, choice);
  payCast(state, ctx, key, uid, responseCost(state, key, card.cost)); // guia §5
  leaveHand(state, key, uid);
  entry.spell.cost?.(state, ctx, key, uid);
  state.players[key].stack.push(uid);
  announce();
  respond(state, key, item());
  pushTriggers(state, collect(state, ctx, state.order, 'watchSpell', [key, uid, aimed.values], 'a Moment or Technique is cast')); // gancho watchSpell (resposta)
}

// Guia §4A Hidden Cosmo {X} (autor, 31/10/2026): joga `uid` da própria Cosmo Base pagando X no lugar do custo impresso,
// com o momento e a forma de pagar da carta (playDevotee/playSpell). Prepared e com Base valendo (não na resposta), a carta
// paga 1 de si mesma. Depois de jogada, o topo do deck entra no lugar como Base Unprepared. Erro antes de pagar desfaz tudo.
export function castHidden(state, ctx, key, uid, choice = {}) {
  const card = ctx.cards.get(ctx.objects[uid]?.cardId), p = state.players[key];
  if (!card?.hiddenCosmo) throw new RuleError('§4A', 'a carta não tem Hidden Cosmo');
  const at = p.bases.findIndex(b => b.uid === uid);
  if (at < 0) throw new RuleError('§4A', 'a carta não está nas suas Cosmo Bases');
  if (!['Devotee', 'Spell'].includes(card.kind)) throw new NotSpecified('Hidden Cosmo em Equipment');
  const base = p.bases[at], response = Boolean(state.window), self = base.prepared && !response ? 1 : 0;
  p.bases.splice(at, 1);
  p.hand.push(uid);
  state.hidden = {uid, amount: Math.max(0, card.hiddenCosmo - self)};
  try {
    if (card.kind === 'Devotee') playDevotee(state, ctx, key, uid, choice); else playSpell(state, ctx, key, uid, choice);
  } catch (e) {
    const h = p.hand.indexOf(uid);
    if (h >= 0) { p.hand.splice(h, 1); p.bases.splice(at, 0, base); }
    throw e;
  } finally { delete state.hidden; }
  if (p.pool) p.pool = p.pool.filter(u => u !== uid); // pool visual da interface
  const top = p.deck.shift();
  if (top) p.bases.push({uid: top, prepared: false});
  emit(state, 'hidden_cosmo', {player: key, uid, paid: card.hiddenCosmo, self, replacement: Boolean(top)});
}
