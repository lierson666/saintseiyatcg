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
  const player = key => ({soul: soul[key], latent: 0, deck: [...decks[key]], hand: [], tartarus: [], bases: [], ownTurns: 0, baseTurn: 0});
  return {round: 1, turn: 0, turnInRound: 0, order: [first, second], active: first, victory: null,
    players: {[first]: player(first), [second]: player(second)}, roundUses: new Set(), strikes: new Map(), effects: []};
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

// D191: 'this_round' cobre os dois turnos; 'next_round' termina no fim do Round seguinte ao da criação.
export function addEffect(state, effect) { state.effects.push({...effect, round: state.round}); }

export function spellCategory(number) {
  if (MOMENTS.has(number)) return {category: 'Moment', resource: 'latent', speed: 'instant'};
  if (TECHNIQUES.has(number)) return {category: 'Technique', resource: 'base', speed: 'sorcery'};
  return null;
}

// D5: Cosmo de Base não usado vira Latent ao encerrar o turno (teto 3), 1 por Base preparada.
// Posição exata em relação à End Phase (D60–D63) não tem texto; fica antes do checkpoint. Depois troca o ativo
// ou, no 2º turno do Round, roda o checkpoint da D204.
// `endOfRoundTriggers`: [{controller, run(state)}], na ordem que cada controlador escolheu.
export function endTurn(state, endOfRoundTriggers = []) {
  alive(state);
  const key = state.active;
  gainLatent(state, key, state.players[key].bases.filter(b => b.prepared).length);
  if (state.turnInRound === 0) {
    state.turnInRound = 1;
    state.active = state.order[1];
    return [];
  }
  return endOfRound(state, endOfRoundTriggers);
}

// D204: gatilhos de fim de Round entram em APNAP (ativo primeiro) e resolvem em LIFO; depois o Cleanup.
// Respostas aos gatilhos dependem da D186, ainda sem texto: aqui só ordem e resolução.
function endOfRound(state, triggers) {
  const apnap = [state.active, other(state, state.active)];
  const stack = apnap.flatMap(k => triggers.filter(t => t.controller === k));
  const resolved = [];
  while (stack.length) {
    const trigger = stack.pop();
    trigger.run(state);
    resolved.push(trigger);
    if (state.victory) return resolved; // D52: encerra antes dos pendentes
  }
  state.effects = state.effects.filter(e => !(e.duration === 'this_round' || (e.duration === 'next_round' && e.round < state.round)));
  state.roundUses.clear();
  state.round++;
  state.turnInRound = 0;
  state.active = state.order[0];
  return resolved;
}
