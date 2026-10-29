// Ações serializáveis da partida (docs/duelo-online.md, passo 1). A tela local e o arena-server aplicam a mesma ação
// com a mesma função da engine: a tela manda dados ({type, key, uid, choice…}), nunca uma função.
import {startTurn, endTurn, pass, placeBase, RuleError} from './core.js';
import {declareStrike} from './strike.js';
import {playDevotee, playEquipment, playSpell, activate, reequip} from './play.js';
import {announceExclamation, removeJudgment, announceGreatFlood} from './gods.js';
import {mulligan} from './match.js';
import {applyTimeout} from './clock.js';

// Aplica `action` em `match` ({state, objects, attached, …}). `ctx` = {cards, objects, attached} da partida.
// endTurn liga match.ending: o turno seguinte começa em advance(), quando a janela da End Phase fecha.
export function applyAction(match, ctx, action) {
  const s = match.state, {type, key, uid, choice = {}} = action;
  const card = () => ctx.cards.get(ctx.objects[uid]?.cardId);
  switch (type) {
    case 'play': {
      const kind = card()?.kind;
      if (kind === 'Devotee') return playDevotee(s, ctx, key, uid, choice);
      if (kind === 'Equipment') return playEquipment(s, ctx, key, uid, choice.bearer, choice);
      if (kind === 'Spell') return playSpell(s, ctx, key, uid, choice);
      throw new RuleError('alvo', 'carta desconhecida');
    }
    case 'base': return placeBase(s, key, uid, card());
    case 'strike': {
      if (s.active !== key) throw new RuleError('D1', 'Strike fora do próprio turno');
      const t = String(choice.target || '');
      return declareStrike(s, ctx, uid, t.startsWith('god:') ? {kind: 'god', player: t.slice(4)} : {kind: 'devotee', uid: t});
    }
    case 'activate': return activate(s, ctx, key, uid, choice);
    case 'reequip': return reequip(s, ctx, key, uid, choice.bearer);
    case 'pass': return pass(s, key);
    case 'endTurn':
      if (s.active !== key) throw new RuleError('D1', 'END TURN fora do próprio turno');
      match.ending = true;
      return endTurn(s);
    case 'mulligan':
      mulligan(match, key, choice.uids || []);
      if (!s.setup) startTurn(s);
      return;
    case 'exclamation':
      if ((choice.saints || []).length !== 3) throw Object.assign(new Error('saints'), {decision: 'G3-005'});
      return announceExclamation(s, ctx, key, choice.saints);
    case 'greatFlood': return announceGreatFlood(s, ctx, key);
    case 'judgment': return removeJudgment(s, ctx, key, choice.devotees);
    case 'timeout': if (applyTimeout(s, key) === 'TIMEOUT_END_TURN') match.ending = true; return;
    default: throw new RuleError('alvo', `ação desconhecida: ${type}`);
  }
}

// Avanço sem escolha: depois do END TURN, o turno seguinte começa quando a janela da End Phase fecha.
// `autoPass(key)`: true quando quem tem prioridade não tem resposta (decisão da tela local; o servidor não usa).
export function advance(match, autoPass = () => false) {
  const s = match.state;
  for (let guard = 0; guard < 60; guard++) {
    if (match.ending && !s.window && !s.victory) { match.ending = false; startTurn(s); continue; }
    if (s.window && !s.victory && autoPass(s.window.priority)) { pass(s, s.window.priority); continue; }
    break;
  }
}

// De quem é a vez de agir agora (decisão pendente, mulligan, janela de resposta ou turno).
export const actorOf = (state, pendingPlayer = null) => pendingPlayer || (state.setup ? state.setup[0] : state.window ? state.window.priority : state.active);
