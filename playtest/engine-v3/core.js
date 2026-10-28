// Núcleo da engine 3.0 (Alpha 0.1): turno livre, Round e recursos.
// Implementa só regras com texto canônico (D191–D268) ou confirmadas pelo autor em 28/10/2026
// (resumos do doc 05: D1–D5, D170, D171, D174). O que não tem texto lança NotSpecified;
// nada aqui vem da engine 2.2. Fonte da matriz: docs/alpha-0.1/MATRIZ-BLOQUEIOS-ENGINE-3.0.md.

export const LATENT_CAP = 3; // D198, D226
export const DRAWS_PER_TURN = 2; // D3
// D194: classificação Moment/Technique pelo número da carta Athena V6.
const MOMENTS = new Set([54, 56, 58, 61, 76, 79]);
const TECHNIQUES = new Set([52, 55, 59, 77, 80, 81, 83, 86, 87, 88, 89, 90]);

export class RuleError extends Error {
  constructor(decision, message) { super(`${decision}: ${message}`); this.decision = decision; }
}
export class NotSpecified extends Error {
  constructor(topic) { super(`Regra não especificada: ${topic}`); this.topic = topic; }
}

export function createCore({first = 'A', second = 'B', soul, decks}) {
  const player = key => ({soul: soul[key], latent: 0, deck: [...decks[key]], hand: [], battlefield: [], tartarus: [], void: [], bases: [], ownTurns: 0, baseTurn: 0});
  return {round: 1, turn: 0, turnInRound: 0, order: [first, second], active: first, victory: null,
    players: {[first]: player(first), [second]: player(second)}, roundUses: new Set(), strikes: new Map(), effects: [], chain: [], window: null};
}

const alive = state => { if (state.victory) throw new RuleError('D52', 'a partida já terminou'); };
const other = (state, key) => state.order.find(k => k !== key);

// D1: só o jogador ativo age no próprio turno; D170 e D3: sem compra no 1º turno próprio, 2 depois; D4: Bases preparadas.
export function startTurn(state) {
  alive(state);
  const p = state.players[state.active];
  state.turn++;
  p.ownTurns++;
  for (const base of p.bases) base.prepared = true;
  if (p.ownTurns > 1) draw(state, state.active, DRAWS_PER_TURN);
}

// D2 (preparação automática) foi confirmada sem dizer o que prepara além das Bases (D4).
export function prepareDevotees() { throw new NotSpecified('D2: o que a preparação automática prepara e em que ordem'); }
export function openingHand() { throw new NotSpecified('mão inicial e mulligan da 3.0'); }

export function draw(state, key, n) {
  alive(state);
  const p = state.players[key];
  // D174: deck vazio causa Fatigue, sem derrota automática; valor e progressão não têm texto.
  if (p.deck.length < n) throw new NotSpecified('D174: valor e progressão da Fatigue');
  p.hand.push(...p.deck.splice(0, n));
}

// D233: move min(N, K) do topo para o Tartarus do dono; sem obrigação pendente e sem Fatigue.
export function mill(state, key, requested) {
  const p = state.players[key], moved = p.deck.splice(0, Math.min(Math.max(0, requested), p.deck.length));
  p.tartarus.push(...moved);
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
  // Leitura literal: só a D4 prepara Bases, no início do turno. Confirmar se a Base nova entra preparada.
  p.bases.push({uid, prepared: false});
  p.baseTurn = state.turn;
}

export function spendBase(state, key, n) {
  const ready = state.players[key].bases.filter(b => b.prepared);
  if (ready.length < n) throw new RuleError('D4', `Bases preparadas insuficientes (${ready.length}/${n})`);
  ready.slice(0, n).forEach(b => { b.prepared = false; });
}

// Teto 3 (D198/D226); um ganho de N é um único evento. Devolve quanto entrou.
export function gainLatent(state, key, n) {
  const p = state.players[key], gained = Math.max(0, Math.min(n, LATENT_CAP - p.latent));
  p.latent += gained;
  return gained;
}

// D52 + D174: Soul 0 encerra na hora; os dois Gods em 0 ao mesmo tempo empatam.
export function loseSoul(state, losses) {
  alive(state);
  for (const [key, n] of Object.entries(losses)) state.players[key].soul -= n;
  const dead = state.order.filter(k => state.players[k].soul <= 0);
  if (dead.length === 2) state.victory = {draw: true};
  else if (dead.length === 1) state.victory = {winner: other(state, dead[0])};
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
// `objects`: uid -> {owner, armor}; `attached`: uid do Equipment -> uid do Devotee.
export function destroyDevotee(state, uid, objects, attached) {
  const zone = Object.values(state.players).find(p => p.battlefield.includes(uid));
  if (!zone) throw new RuleError('D197', `${uid} não está no campo`);
  const gear = Object.keys(attached).filter(e => attached[e] === uid);
  // shortcut: só Armor tem destino canônico ao sair o portador; outro Equipment espera regra.
  if (gear.some(e => !objects[e].armor)) throw new NotSpecified('destino de Equipment não-Armor quando o portador sai (D40/D90 cobrem só Armor)');
  for (const moved of [uid, ...gear]) {
    for (const p of Object.values(state.players)) p.battlefield = p.battlefield.filter(x => x !== moved);
    state.players[objects[moved].owner].tartarus.push(moved);
    delete attached[moved];
  }
}

// Invariante: cada objeto de deck está em exatamente uma zona; Latent dentro do teto.
export function checkInvariants(state, objects) {
  const seen = new Map();
  for (const [key, p] of Object.entries(state.players)) {
    for (const zone of ['deck', 'hand', 'battlefield', 'tartarus', 'void']) for (const uid of p[zone]) seen.set(uid, (seen.get(uid) || 0) + 1);
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
  state.window.passes = 0;
  state.window.priority = other(state, key);
}

export function pass(state, key) {
  alive(state);
  const w = state.window;
  if (!w || w.priority !== key) throw new RuleError('P06', `${key} não tem prioridade para passar`);
  w.priority = other(state, key);
  if (++w.passes < 2) return undefined;
  if (state.chain.length) {
    state.chain.pop().run(state);
    if (state.victory) { state.window = null; state.chain = []; return state.victory; } // D52
    if (state.chain.length) { reopen(state); return undefined; }
  }
  state.window = null;
  return w.onClose(state);
}

// Os dois passam até não haver janela; devolve o resultado do último passo (vitória ou retorno do onClose).
export function passAll(state) {
  let result;
  while (state.window && !state.victory) result = pass(state, state.window.priority);
  return result;
}

// End Phase (P06 item 5, no lugar de D60–D63):
// 1. D5: Cosmo de Base não usado vira Latent (teto 3), 1 por Base preparada (detalhe na P03);
// 2. gatilhos "at end of turn", com janela (a End Phase sempre abre uma);
// 3. no 2º turno do Round, checkpoint da D204;
// 4. Cleanup.
// `triggers`: {endOfTurn: [...], endOfRound: [...]}, cada um [{controller, run(state)}].
export function endTurn(state, {endOfTurn = [], endOfRound = []} = {}) {
  alive(state);
  assertIdle(state);
  const key = state.active;
  gainLatent(state, key, state.players[key].bases.filter(b => b.prepared).length);
  openWindow(state, () => roundCheckpoint(state, endOfRound));
  pushTriggers(state, endOfTurn);
}

// D204: gatilhos de fim de Round depois dos de fim de turno e antes do Cleanup.
function roundCheckpoint(state, triggers) {
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
  state.round++;
  state.turnInRound = 0;
  state.active = state.order[0];
}
