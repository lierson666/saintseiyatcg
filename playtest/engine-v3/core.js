// Núcleo da engine 3.0 (Alpha 0.1): turno livre, Round e recursos.
// Implementa só regras com texto canônico (D191–D268) ou confirmadas pelo autor em 28/10/2026
// (resumos do doc 05: D1–D5, D170, D171, D174). O que não tem texto lança NotSpecified;
// nada aqui vem da engine 2.2. Fonte da matriz: docs/alpha-0.1/MATRIZ-BLOQUEIOS-ENGINE-3.0.md.

export const LATENT_CAP = 3; // D198, D226
export const DRAWS_PER_TURN = 2; // D3
// D194: classificação Moment/Technique pelo número da carta Athena V6.
const MOMENTS = new Set([54, 56, 58, 61, 76, 79]);
// 53, 60, 82 e 85: Technique por decisão do autor em 28/10/2026 (custo {B}), fora da lista da D194.
const TECHNIQUES = new Set([52, 53, 55, 59, 60, 77, 80, 81, 82, 83, 85, 86, 87, 88, 89, 90]);

export class RuleError extends Error {
  constructor(decision, message) { super(`${decision}: ${message}`); this.decision = decision; }
}
export class NotSpecified extends Error {
  constructor(topic) { super(`Regra não especificada: ${topic}`); this.topic = topic; }
}

export function createCore({first = 'A', second = 'B', soul, decks}) {
  const player = key => ({soul: soul[key], latent: 0, deck: [...decks[key]], hand: [], battlefield: [], tartarus: [], void: [], stack: [], bases: [], ownTurns: 0, baseTurn: 0, fatigue: 0});
  return {round: 1, turn: 0, turnInRound: 0, order: [first, second], active: first, victory: null,
    players: {[first]: player(first), [second]: player(second)}, roundUses: new Set(), strikes: new Map(), effects: [], chain: [], window: null, units: {}, delayed: [], events: []};
}

// Fluxo de eventos para a apresentação (Divine Arena): só registra o que a regra já fez; nunca decide nada.
// `seq` dá a ordem total; a apresentação lê `state.events` a partir do último seq que consumiu.
export function emit(state, type, data = {}) {
  state.events.push({seq: state.events.length + 1, type, round: state.round, turn: state.turn, ...data});
}

// Ganchos dos Gods (gods.js), sem import circular. `checkpoint`: entre resoluções completas da cadeia e nas
// passagens de turno (G3-003); `roundEnd`: gatilhos extras do checkpoint de fim de Round (D204), ex.: Divine Judgment;
// `strikeDeclared(state, ctx, attacker, controller)` e `sealed(state, ctx, transitions)` devolvem gatilhos (ex.: Poseidon).
export const hooks = {checkpoint: [], roundEnd: [], strikeDeclared: [], sealed: []};
export function runCheckpoint(state) { if (!state.victory) for (const fn of hooks.checkpoint) fn(state); }

// Visibilidade (G3-019): o adversário não vê qual carta foi comprada nem qual voltou no mulligan.
const PRIVATE = {draw: 'uid'};
export function eventsFor(state, viewer, from = 0) {
  return state.events.slice(from).map(e => (PRIVATE[e.type] && e.player !== viewer ? {...e, [PRIVATE[e.type]]: null} : e));
}

const alive = state => { if (state.victory) throw new RuleError('D52', 'a partida já terminou'); };
const other = (state, key) => state.order.find(k => k !== key);

// Início do turno (ALPHA-P02 opção A, aprovada em 28/10/2026; D2, D4):
// 1. o ativo prepara todos os seus Devotees, Equipment e Bases;
// 2. gatilhos de início de turno, em APNAP e LIFO, com janela (P06);
// 3. compra (D170 e D3: nada no 1º turno próprio, 2 depois).
// `state.units[uid]` guarda {prepared, damage, entered} de cada objeto em campo.
export function startTurn(state, startOfTurn = []) {
  alive(state);
  assertIdle(state);
  if (state.setup) throw new RuleError('P01', `mulligan pendente: ${state.setup.join(', ')}`);
  const key = state.active, p = state.players[key];
  state.turn++;
  p.ownTurns++;
  for (const base of p.bases) base.prepared = true;
  for (const uid of p.battlefield) {
    const unit = state.units[uid];
    if (!unit) continue;
    if (unit.skipPrepare) unit.skipPrepare = false; // "cannot be Prepared during your next Prepare Phase" (077)
    else prepareUnit(state, uid);
  }
  emit(state, 'turn_start', {player: key});
  const drawStep = () => { if (p.ownTurns > 1) draw(state, key, DRAWS_PER_TURN); runCheckpoint(state); };
  if (startOfTurn.length) pushTriggers(state, startOfTurn, drawStep);
  else drawStep();
}

// ---------- Seal (D211, D212) ----------
// Seal são marcadores num Devotee. "Sealed" = 1 ou mais marcadores; "becomes Sealed" = passagem de 0 para ≥1 (D211).
// Única consequência canônica: cada evento que prepararia o Devotee remove 1 marcador em vez de prepará-lo;
// N marcadores atrasam N desses eventos (D211, D212). Seal não é stun, não cancela Strike declarado (D212) e não
// proíbe ações: um Devotee Sealed e Prepared pode agir. Marcadores ficam no objeto; se ele sai do campo, somem.
// Devolve os uids que passaram de 0 para ≥1 e põe os gatilhos de `hooks.sealed` na cadeia (D267: um por Devotee).
export function addSeal(state, ctx, uids, n, source) {
  if (!Number.isInteger(n) || n < 1) throw new NotSpecified('número de marcadores Seal do efeito');
  const transitions = [];
  for (const uid of uids) {
    const unit = state.units[uid];
    if (!unit) continue;
    const before = unit.seal || 0;
    unit.seal = before + n;
    emit(state, 'seal_added', {uid, added: n, counters: unit.seal, source});
    if (before === 0) transitions.push({uid, controller: state.order.find(k => state.players[k].battlefield.includes(uid))});
  }
  if (transitions.length) pushTriggers(state, hooks.sealed.flatMap(fn => fn(state, ctx, transitions)));
  return transitions.map(t => t.uid);
}

// Todo evento que prepara um Devotee passa por aqui. Com Seal, remove 1 marcador em vez de preparar (D211).
// G3-033: Prepare redundante em Devotee já Prepared não remove marcadores.
export function prepareUnit(state, uid) {
  const unit = state.units[uid];
  if (unit.prepared || !unit.seal) { unit.prepared = true; return true; }
  unit.seal--;
  emit(state, 'seal_removed', {uid, counters: unit.seal});
  return false;
}

export function draw(state, key, n) {
  alive(state);
  const p = state.players[key];
  // D174 + ALPHA-P07 opção A (aprovada em 28/10/2026): cada compra com deck vazio tira Soul igual ao total
  // de compras falhas do jogador na partida (1, 2, 3…); o contador nunca zera. Soul 0 encerra na hora (D52).
  for (let i = 0; i < n && !state.victory; i++) {
    if (p.deck.length) { const uid = p.deck.shift(); p.hand.push(uid); emit(state, 'draw', {player: key, uid}); }
    else { emit(state, 'fatigue', {player: key, amount: p.fatigue + 1}); loseSoul(state, {[key]: ++p.fatigue}); }
  }
}

// D233: move min(N, K) do topo para o Tartarus do dono; sem obrigação pendente e sem Fatigue.
export function mill(state, key, requested) {
  const p = state.players[key], moved = p.deck.splice(0, Math.min(Math.max(0, requested), p.deck.length));
  p.tartarus.push(...moved);
  emit(state, 'mill', {player: key, requested, moved: moved.length});
  return moved.length;
}

// D4: uma Base Cosmoble por turno, no turno do próprio jogador.
export function placeBase(state, key, uid, card) {
  alive(state);
  const p = state.players[key];
  if (key !== state.active) throw new RuleError('D1', 'só o jogador ativo age no turno');
  assertIdle(state);
  if (!card.cosmoble) throw new RuleError('D4', 'a carta não é Cosmoble');
  if (p.baseTurn === state.turn) throw new RuleError('D4', 'já colocou uma Base neste turno');
  const at = p.hand.indexOf(uid);
  if (at < 0) throw new RuleError('D4', 'a carta não está na mão');
  p.hand.splice(at, 1);
  // G3-035 (autor, 28/10/2026): a Base nova entra Prepared e já paga custo no mesmo turno.
  p.bases.push({uid, prepared: true});
  p.baseTurn = state.turn;
  emit(state, 'base_placed', {player: key, uid});
}

export function spendBase(state, key, n) {
  const ready = state.players[key].bases.filter(b => b.prepared);
  if (ready.length < n) throw new RuleError('D4', `Bases preparadas insuficientes (${ready.length}/${n})`);
  ready.slice(0, n).forEach(b => { b.prepared = false; });
  if (n > 0) emit(state, 'cosmo_spent', {player: key, unit: 'base', amount: n});
}

// Teto 3 (D198/D226); um ganho de N é um único evento. Devolve quanto entrou.
export function gainLatent(state, key, n) {
  const p = state.players[key], gained = Math.max(0, Math.min(n, LATENT_CAP - p.latent));
  p.latent += gained;
  if (gained) emit(state, 'latent_gained', {player: key, amount: gained});
  return gained;
}

// D52 + D174: Soul 0 encerra na hora; os dois Gods em 0 ao mesmo tempo empatam.
// `cause` (G3-013): 'damage' (dano, depois de prevenção), 'loss' (Lose Soul direto) ou 'payment' (custo pago).
// Soul atual nunca fica negativo; `amount` registra o valor integral (G3-012).
export function loseSoul(state, losses, cause = 'loss') {
  alive(state);
  for (const [key, n] of Object.entries(losses)) {
    const p = state.players[key];
    p.soul = Math.max(0, p.soul - n);
    emit(state, 'soul_lost', {player: key, amount: n, soul: p.soul, cause});
  }
  const dead = state.order.filter(k => state.players[k].soul <= 0);
  if (dead.length === 2) state.victory = {draw: true};
  else if (dead.length === 1) state.victory = {winner: other(state, dead[0])};
  if (state.victory) emit(state, 'victory', state.victory);
  return state.victory;
}

// Derrota por efeito (ex.: Divine Judgment vencido): o jogador `key` perde a partida na hora (D52).
export function loseGame(state, key, reason) {
  alive(state);
  state.victory = {winner: other(state, key), reason};
  emit(state, 'victory', state.victory);
  return state.victory;
}

// D22: um Strike por Devotee por turno próprio; preparar de novo não renova.
export function recordStrike(state, uid) {
  alive(state);
  if (state.strikes.get(uid) === state.turn) throw new RuleError('D22', 'este Devotee já declarou Strike neste turno');
  state.strikes.set(uid, state.turn);
}

// D191: "once each round" vale para o Round inteiro e renova só no Round seguinte.
export function useOncePerRound(state, id) {
  if (state.roundUses.has(id)) return false;
  state.roundUses.add(id);
  return true;
}

// 'this_turn' ("until end of turn") expira em todo Cleanup (P06); D191: 'this_round' cobre os dois turnos;
// 'next_round' termina no fim do Round seguinte ao da criação.
export function addEffect(state, effect) { state.effects.push({...effect, round: state.round}); }

// Destroy (D197) de um Devotee: vai para o Tartarus do Owner, e a Armor presa a ele também (D40/D90).
// `event`: 'unique_removed' para a saída do guia §63, que move igual mas não é destruição.
// Equipment que não é Armor fica no campo, solto, e pode ser reequipado (autor, 28/10/2026).
// `objects`: uid -> {owner, armor}; `attached`: uid do Equipment -> uid do Devotee.
export function destroyDevotee(state, uid, objects, attached, event = 'destroyed') {
  const zone = Object.values(state.players).find(p => p.battlefield.includes(uid));
  if (!zone) throw new RuleError('D197', `${uid} não está no campo`);
  const gear = Object.keys(attached).filter(e => attached[e] === uid);
  for (const loose of gear.filter(e => !objects[e].armor)) delete attached[loose];
  for (const moved of [uid, ...gear.filter(e => objects[e].armor)]) {
    for (const p of Object.values(state.players)) p.battlefield = p.battlefield.filter(x => x !== moved);
    state.players[objects[moved].owner].tartarus.push(moved);
    delete attached[moved];
    delete state.units[moved];
    state.effects = state.effects.filter(e => e.target !== moved); // objeto novo se voltar
    emit(state, event, {uid: moved, owner: objects[moved].owner});
  }
}

// Invariante: cada objeto de deck está em exatamente uma zona; Latent dentro do teto.
export function checkInvariants(state, objects) {
  const seen = new Map();
  for (const [key, p] of Object.entries(state.players)) {
    for (const zone of ['deck', 'hand', 'battlefield', 'tartarus', 'void', 'stack']) for (const uid of p[zone]) seen.set(uid, (seen.get(uid) || 0) + 1);
    for (const base of p.bases) seen.set(base.uid, (seen.get(base.uid) || 0) + 1);
    if (p.latent < 0 || p.latent > LATENT_CAP) throw new Error(`Latent fora do teto: ${key}=${p.latent}`);
  }
  const missing = Object.keys(objects).filter(uid => seen.get(uid) !== 1);
  if (missing.length || seen.size !== Object.keys(objects).length) throw new Error(`objetos fora de zona única: ${missing.slice(0, 5)}`);
}

export function spellCategory(number) {
  if (MOMENTS.has(number)) return {category: 'Moment', resource: 'latent', speed: 'instant'};
  if (TECHNIQUES.has(number)) return {category: 'Technique', resource: 'base', speed: 'sorcery'};
  return null;
}

// ALPHA-P06 opção A (aprovada em 28/10/2026): janelas mínimas de prioridade.
// Ação comum não abre janela. Abre: gatilho na cadeia, Strike declarado, Moment jogado e End Phase.
// O não ativo fala primeiro; dois passes seguidos resolvem o topo (LIFO, D186); cadeia vazia fecha a janela
// e roda `onClose` (o passo seguinte: dano do Strike, checkpoint, Cleanup).
export function openWindow(state, onClose = () => null) {
  if (state.window) throw new RuleError('P06', 'já há uma janela aberta');
  state.window = {priority: other(state, state.active), passes: 0, onClose};
  emit(state, 'window_open', {priority: state.window.priority});
}
const reopen = state => { state.window.passes = 0; state.window.priority = other(state, state.active); };

export function assertIdle(state) {
  if (state.window || state.chain.length) throw new RuleError('P06', 'ação comum só com a janela fechada e a cadeia vazia');
}

// D187: gatilhos simultâneos entram em APNAP (ativo primeiro), então o não ativo resolve primeiro.
// `triggers`: [{controller, run(state)}], na ordem que cada controlador escolheu.
export function pushTriggers(state, triggers, onClose) {
  if (!triggers.length) return;
  for (const key of [state.active, other(state, state.active)]) state.chain.push(...triggers.filter(t => t.controller === key));
  if (state.window) reopen(state); else openWindow(state, onClose);
}

// Instant ou habilidade reativa (`speed: 'instant'`). Fora de janela, só o ativo, e isso abre a janela (Moment jogado).
export function respond(state, key, item) {
  alive(state);
  if (item.speed !== 'instant') throw new RuleError('P06', 'em janela só Instant e habilidades reativas');
  if (!state.window) {
    if (key !== state.active) throw new RuleError('D1', 'fora de janela só o jogador ativo age');
    openWindow(state);
  } else if (state.window.priority !== key) throw new RuleError('P06', `${key} não tem prioridade`);
  state.chain.push({...item, controller: key});
  emit(state, 'chain_add', {player: key, uid: item.uid});
  state.window.passes = 0;
  state.window.priority = other(state, key);
}

export function pass(state, key) {
  alive(state);
  const w = state.window;
  if (!w || w.priority !== key) throw new RuleError('P06', `${key} não tem prioridade para passar`);
  w.priority = other(state, key);
  emit(state, 'pass', {player: key});
  if (++w.passes < 2) return undefined;
  if (state.chain.length) {
    const top = state.chain.pop();
    emit(state, 'resolve', {player: top.controller, uid: top.uid});
    top.run(state);
    if (state.victory) { state.window = null; state.chain = []; return state.victory; } // D52
    runCheckpoint(state);
    if (state.chain.length) { reopen(state); return undefined; }
  }
  state.window = null;
  emit(state, 'window_close', {});
  const result = w.onClose(state);
  runCheckpoint(state);
  return result;
}

// Os dois passam até não haver janela; devolve o resultado do último passo (vitória ou retorno do onClose).
export function passAll(state) {
  let result;
  while (state.window && !state.victory) result = pass(state, state.window.priority);
  return result;
}

// End Phase (P06 item 5, no lugar de D60–D63):
// 1. D5 + ALPHA-P03 opção A (aprovada em 28/10/2026): 1 Latent por Base ainda Prepared, num único evento de ganho
//    (D226), antes de qualquer efeito de End Phase; o excesso acima de 3 se perde;
// 2. gatilhos "at end of turn", com janela (a End Phase sempre abre uma);
// 3. no 2º turno do Round, checkpoint da D204;
// 4. Cleanup.
// `triggers`: {endOfTurn: [...], endOfRound: [...]}, cada um [{controller, run(state)}].
export function endTurn(state, {endOfTurn = [], endOfRound = []} = {}) {
  alive(state);
  assertIdle(state);
  const key = state.active;
  emit(state, 'end_phase', {player: key});
  gainLatent(state, key, state.players[key].bases.filter(b => b.prepared).length);
  openWindow(state, () => roundCheckpoint(state, endOfRound));
  pushTriggers(state, endOfTurn);
}

// D204: gatilhos de fim de Round depois dos de fim de turno e antes do Cleanup.
// Gatilhos atrasados de carta ("at the end of the round", em `state.delayed`) entram aqui também.
function roundCheckpoint(state, triggers) {
  if (state.turnInRound === 1) triggers = [...triggers, ...state.delayed.splice(0), ...hooks.roundEnd.flatMap(fn => fn(state))];
  if (state.turnInRound === 1 && triggers.length) pushTriggers(state, triggers, () => cleanup(state));
  else cleanup(state);
}

// Cleanup: expira "until end of turn"; no 2º turno, também "this round" e "next round" vencidos, e renova
// o "once each round" (D191). O dano marcado não sai (P04). Depois passa o turno ou o Round.
function cleanup(state) {
  const last = state.turnInRound === 1;
  state.effects = state.effects.filter(e => !(e.duration === 'this_turn'
    || (last && (e.duration === 'this_round' || (e.duration === 'next_round' && e.round < state.round)))));
  if (!last) {
    state.turnInRound = 1;
    state.active = state.order[1];
    return;
  }
  state.roundUses.clear();
  emit(state, 'round_end', {});
  state.round++;
  state.turnInRound = 0;
  state.active = state.order[0];
}
