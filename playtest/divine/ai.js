// Oponente IA do Olympus Arena (Alpha 0.1). É um jogador, não regra: escolhe ações e a engine 3.0 valida cada uma.
// Heurística simples e determinística (sem sorteio): Base → Ultimate → Devotees → Equipment → Spells → Strikes → End Turn.
// `h`: ajudantes da mesa (S, ctx, info, num, candidates, playableReason, canBase, STEPS) e as ações da engine.

const COMBO = (list, k) => (k === 0 ? [[]] : list.flatMap((x, i) => COMBO(list.slice(i + 1), k - 1).map(c => [x, ...c])));

export function createAI(h) {
  const tried = new Set(); // ações que a engine recusou neste turno: não repete
  const cost = uid => (h.known(uid) ? h.info(uid).cost?.amount ?? 0 : 0);
  const devotees = key => h.S().players[key].battlefield.filter(u => h.info(u).kind === 'Devotee');
  const enemyOf = key => h.S().order.find(k => k !== key);

  // Escolhas de uma carta (STEPS): primeiro candidato; opcional com candidato é usado; confirmação = sim.
  function choicesFor(key, steps) {
    const choice = {};
    for (const step of steps) {
      if (step.when && !step.when(choice)) continue;
      if (step.options) choice[step.key] = Object.keys(step.options)[0];
      else if (step.confirm) choice[step.key] = true;
      else if (step.pick) {
        const opts = h.candidates(step, key);
        if (step.multi) { if (opts.length) choice[step.key] = opts.slice(0, step.multi); }
        else if (opts.length) choice[step.key] = step.pick === 'enemy' ? weakest(opts) : opts[0];
        else if (!step.optional) return null;
      }
    }
    return choice;
  }
  const weakest = uids => [...uids].sort((a, b) => h.hp(a) - h.hp(b))[0];

  // Próxima ação no próprio turno: {id, run} ou null (End Turn).
  function next(key) {
    const s = h.S(), p = s.players[key], id = a => `${s.turn}:${a}`;
    const fresh = a => !tried.has(id(a));
    const hand = [...p.hand];
    // 1. Base: até 8, a carta Cosmoble menos útil agora (Spell/Equipment antes de Devotee; a mais cara primeiro).
    if (p.bases.length < 8) {
      const pick = hand.filter(u => h.canBase(key, u)).sort((a, b) => (h.info(a).kind === 'Devotee') - (h.info(b).kind === 'Devotee') || cost(b) - cost(a))[0];
      if (pick && fresh(`base:${pick}`)) return {id: id(`base:${pick}`), run: () => h.placeBase(s, key, pick, h.info(pick))};
    }
    // 2. Ultimate: Athena Exclamation se for letal ou do Round 6 em diante; Great Flood com 2+ Devotees inimigos.
    const god = s.divine[key].god;
    if (god === 'god-athena' && !s.divine[key].ultimateUsed) {
      const saints = devotees(key).filter(u => h.isSaint(u) && s.units[u]?.prepared);
      const trio = COMBO(saints, 3).find(t => !h.ultimateBlock(key, t));
      const loss = trio && trio.reduce((n, u) => n + h.atk(u) + (/Gold Saint/.test(h.info(u).type) ? 3 : 0), 0);
      if (trio && (loss >= s.players[enemyOf(key)].soul || s.round >= 6) && fresh('ultimate')) return {id: id('ultimate'), run: () => h.announceExclamation(key, trio)};
    }
    if (god === 'god-poseidon' && !h.greatFloodBlock(key) && devotees(enemyOf(key)).length >= 2 && fresh('flood')) return {id: id('flood'), run: () => h.announceGreatFlood(key)};
    // 3–5. Cartas da mão jogáveis, da mais cara para a mais barata: Devotee, Equipment, Spell.
    const order = {Devotee: 0, Equipment: 1, Spell: 2};
    for (const uid of hand.filter(u => !h.playableReason(key, u) && !(h.info(u).kind === 'Devotee' && h.duplicate(key, u))).sort((a, b) => order[h.info(a).kind] - order[h.info(b).kind] || cost(b) - cost(a))) {
      if (!fresh(`play:${uid}`)) continue;
      const c = h.info(uid);
      if (c.kind === 'Equipment') {
        const mine = devotees(key), named = mine.find(d => c.autoEquip.some(n => n.toUpperCase() === h.info(d).name.toUpperCase()));
        const bearer = named || mine[0];
        if (bearer) return {id: id(`play:${uid}`), run: () => h.playEquipment(key, uid, bearer, {})};
        continue;
      }
      const ch = choicesFor(key, h.STEPS[h.num(uid)] || []);
      if (!ch) continue;
      return {id: id(`play:${uid}`), run: () => (c.kind === 'Devotee' ? h.playDevotee(key, uid, ch) : h.playSpell(key, uid, ch))};
    }
    // 6. Strikes: no God se puder; senão no Devotee alvo de menor HP restante.
    for (const uid of devotees(key)) {
      if (!s.units[uid]?.prepared || !fresh(`strike:${uid}`)) continue;
      const targets = h.strikeTargets(uid);
      if (!targets.length) continue;
      const target = targets.find(t => t.kind === 'god') || {kind: 'devotee', uid: weakest(targets.map(t => t.uid))};
      return {id: id(`strike:${uid}`), run: () => h.declareStrike(uid, target)};
    }
    return null;
  }

  // Pergunta da engine para a IA: "you may" = sim; escolha obrigatória = as cartas mais baratas (descarte, Base a devolver).
  function answer(req) {
    if (req.kind === 'optional') return true;
    const sorted = [...req.options].sort((a, b) => cost(a) - cost(b));
    if (req.choose === 'keep') return [...req.options].sort((a, b) => h.hp(b) - h.hp(a))[0]; // §63: mantém a versão mais inteira
    if (req.choose === 'top') return [...req.options].sort((a, b) => cost(b) - cost(a))[0];
    const picked = sorted.slice(0, req.count);
    return req.multiple ? picked : picked[0];
  }

  return {next, answer, refuse: a => tried.add(a.id)};
}
