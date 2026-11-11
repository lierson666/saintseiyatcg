// Tutorial Director (Tutorial 001): só observa eventos da engine e decide qual etapa mostrar. Sem DOM e sem regra própria:
// quem julga cada ação é a engine. Etapas e falas ficam em data/tutorial/.
const ME = 'A', FOE = 'B', ALWAYS = ['pass', 'orderTriggers', 'timeout'];
export const matches = (e, want) => e.type === want.event && Object.entries(want).every(([k, v]) => k === 'event' || e[k] === v);

// Set e Map não sobrevivem ao JSON: o salvamento marca os dois.
export const encodeSave = v => JSON.stringify(v, (_, x) => x instanceof Set ? {__set: [...x]} : x instanceof Map ? {__map: [...x]} : x);
export const decodeSave = text => JSON.parse(text, (_, x) => x?.__set ? new Set(x.__set) : x?.__map ? new Map(x.__map) : x);

// Fichas criadas em jogo existem só no catálogo da sessão: o salvamento leva a carta delas junto.
export const tokenCards = cards => [...cards.values()].filter(c => c.token);
export const restoreTokens = (save, cards) => { for (const c of save.tokens ?? []) cards.set(c.id, c); };

// Rodadas do rival a partir da linha didática: cada grupo termina no endTurn dele.
export function rivalRounds(linha) {
  const rounds = [[]];
  for (const {a} of linha) {
    if (a.key !== FOE) continue;
    if (a.type === 'endTurn') rounds.push([]); else rounds.at(-1).push(a);
  }
  return rounds;
}

export function createDirector({script, S, busy = () => false, saved = null, onEnter = () => {}, onFinish = () => {}}) {
  const {steps} = script, index = id => steps.findIndex(s => s.id === id), rounds = rivalRounds(script.linha);
  let i = saved?.i ?? -1, since = saved?.since ?? 0, cursor = saved?.cursor ?? {}, finished = saved?.finished ?? false, result = null;
  const completed = new Set(saved?.completed), skipped = new Set(saved?.skipped);
  const step = () => steps[i] ?? null;
  const goals = () => {
    const ev = S().events.slice(since), mine = e => e.player === ME;
    return {GOAL_COSMO: ev.some(e => mine(e) && ['cosmo_spent', 'base_placed'].includes(e.type)),
      GOAL_CLASH: ev.some(e => (e.type === 'strike_resolve' || e.type === 'spell_resolved') && mine(e)),
      GOAL_ROUND: ev.some(e => e.type === 'end_phase' && mine(e))};
  };
  const met = req => {
    const p = S().players;
    if (req?.hand && !p[ME].hand.includes(req.hand)) return false;
    return !req?.field || req.field.every(u => p[u[0]].battlefield.includes(u));
  };
  function enter(n) {
    i = n;
    if (!step()) return;
    if (!met(step().requires)) { skipped.add(step().lesson); return enter(step().fallback ? index(step().fallback) : i + 1); } // cena impossível: vira pendência do glossário, sem mexer na mesa
    if (step().done.exam) since = S().events.length; // a prova só conta o que vier depois dela
    onEnter(step());
  }
  function complete(nextIndex = i + 1) {
    completed.add(step().lesson);
    if (step().final) { finished = true; i = steps.length; onFinish(); return; }
    enter(nextIndex);
  }
  const find = want => { const ev = S().events; for (let j = since; j < ev.length; j++) if (matches(ev[j], want)) return j; return -1; };

  return {
    step, goals, completed, skipped, result: () => result,
    get finished() { return finished; },
    start() { if (i < 0) enter(0); else if (step()) onEnter(step()); },
    next() { if (step()?.done.next) complete(); },
    inspected(uid) { if (step()?.done.inspect === uid) complete(); },
    // Avança só com ação resolvida: clique e animação não contam.
    observe() {
      const s = S();
      if (s.victory && !result) result = {winner: s.victory.winner ?? null, draw: !!s.victory.draw, pending: finished ? [...skipped] : [...new Set([...skipped, ...steps.slice(Math.max(i, 0)).map(x => x.lesson)])]};
      const st = step();
      if (!st || s.victory || busy()) return;
      if (st.done.exam) { if (Object.values(goals()).every(Boolean) || s.players[ME].ownTurns >= (st.enteredTurn ?? s.players[ME].ownTurns) + 3) { since = s.events.length; complete(); } return; }
      if (st.done.event) {
        const j = find(st.done);
        if (j >= 0) { since = j + 1; return complete(); }
        const k = st.abort ? find(st.abort) : -1;
        if (k >= 0) { since = k; skipped.add(st.lesson); enter(st.fallback ? index(st.fallback) : i + 1); }
      }
    },
    allow(action) {
      const st = step();
      if (!st || st.phase !== 'guided') return true;
      if (ALWAYS.includes(action.type)) return !(st.blockPass && action.type === 'pass');
      return !!st.allow?.some(a => a.type === action.type && (!a.uid || a.uid === action.uid) && (!a.target || a.target === action.choice?.target));
    },
    policy: () => step()?.ai ?? 'normal',
    // A próxima jogada preparada do rival; a engine ainda decide se ela é legal.
    rivalAction() {
      const r = S().players[FOE].ownTurns - 1, n = cursor[r] ?? 0;
      return rounds[r]?.[n] ?? null;
    },
    rivalDone() { const r = S().players[FOE].ownTurns - 1; cursor[r] = (cursor[r] ?? 0) + 1; },
    answer(req) {
      if (this.policy() !== 'scripted') return undefined;
      if (req.ability === 'WATER PRISON') return !!step()?.waterPrison;
      return req.kind === 'optional' ? false : undefined;
    },
    save: () => ({i, since, cursor, finished, completed: [...completed], skipped: [...skipped]}),
  };
}
