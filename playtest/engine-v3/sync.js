// Reconexão e replay pelo fluxo de eventos (G3-020/021). Cada evento tem `seq` estável; o cliente guarda o último
// que aplicou e pede só o que veio depois. Receber o mesmo lote duas vezes não repete nada.
import {eventsFor} from './core.js';

export function createCursor() {
  let last = 0;
  return {
    get last() { return last; },
    // Devolve só os eventos novos, em ordem; duplicados e antigos são ignorados.
    accept(events) {
      const fresh = events.filter(e => e.seq > last).sort((a, b) => a.seq - b.seq);
      if (fresh.length) last = fresh.at(-1).seq;
      return fresh;
    },
  };
}

// Decisão pendente na reconexão: quem decide recebe a pergunta inteira; o outro só sabe quem decide e o quê
// (as opções podem ser cartas da mão ou do topo do deck, informação oculta).
function pendingFor(pending, viewer) {
  if (!pending) return null;
  if (pending.player === viewer) return {...pending, options: pending.options ? [...pending.options] : undefined};
  return {player: pending.player, kind: pending.kind, ability: pending.ability, count: pending.count};
}

// O que um jogador recebe ao reconectar: eventos depois de `lastSeq`, já filtrados pela visibilidade dele,
// mais o resumo do estado oficial que a tela precisa para se redesenhar (sem mão nem deck do adversário).
export function resumeFor(state, viewer, lastSeq = 0) {
  const view = Object.fromEntries(state.order.map(k => {
    const p = state.players[k], d = state.divine?.[k];
    return [k, {soul: p.soul, latent: p.latent, bases: p.bases.map(b => b.prepared), deck: p.deck.length, hand: k === viewer ? [...p.hand] : p.hand.length,
      battlefield: [...p.battlefield], tartarus: [...p.tartarus], awaken: d?.awaken ?? false, ultimateUsed: d?.ultimateUsed ?? false, judgment: d?.judgment ? {...d.judgment} : null}];
  }));
  return {round: state.round, turn: state.turn, active: state.active, victory: state.victory, window: state.window ? {priority: state.window.priority} : null,
    pending: pendingFor(state.pending, viewer),
    chain: state.chain.map(c => ({controller: c.controller, uid: c.uid ?? null, ability: c.ability ?? null, target: c.target ?? null, source: c.source ?? null})), roundUses: [...state.roundUses], players: view,
    events: eventsFor(state, viewer, lastSeq).filter(e => e.seq > lastSeq)};
}
