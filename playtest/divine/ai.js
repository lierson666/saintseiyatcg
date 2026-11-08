// Oponente IA do Olympus Arena (Alpha 0.1). É um jogador, não regra: escolhe ações e a engine 3.0 valida cada uma.
// Heurística simples e determinística (sem sorteio): Base → Ultimate → Devotees → Equipment → Spells → Strikes → End Turn.
// `h`: ajudantes da mesa (S, ctx, info, num, candidates, playableReason, canBase, STEPS) e as ações da engine.
// Dificuldade (`h.level()`, autor, 01/11/2026). easy: pula jogadas e nunca responde. normal: joga as cartas no momento
// certo e responde a Strike e Spell. hard: também testa cada jogada na engine (snapshot) e fica com a que deixa a mesa melhor.

import {runDecisions, resume, restore, snapshot} from '../engine-v3/decision.js';
import {passAll} from '../engine-v3/core.js';
import {removeJudgment} from '../engine-v3/gods.js';

const COMBO = (list, k) => (k === 0 ? [[]] : list.flatMap((x, i) => COMBO(list.slice(i + 1), k - 1).map(c => [x, ...c])));

// O que a carta faz, lido do texto impresso: serve para qualquer deck, inclusive os de jogador.
const roles = c => {
  const t = c.text || '';
  return {counter: /\bCounter target\b/.test(t), protect: /\bprevent\b/i.test(t), trick: /\+[1-9]\d* ATK/.test(t) && /\b(target|chosen|friendly)\b/i.test(t),
    removal: /Deal \d+ damage to target enemy|Return (up to \w+ )?target enemy|Send target enemy|target enemy Devotee gets -\d+/i.test(t),
    enemyOnly: /target enemy Devotee/i.test(t) && !/enemy God|Choose one/i.test(t), draw: /\bdraw (a|\w+) cards?\b/i.test(t), reanimate: /from your Tartarus/i.test(t),
    sacrifice: /^Sacrifice a friendly|Sacrifice a friendly Devotee\./.test(t), soul: Number(/Your God loses \{(\d+)\}\{S\}/.exec(t)?.[1] || 0)};
};
const hash = text => [...text].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

export function createAI(h) {
  const level = () => h.level?.() || 'normal';
  let focus = null; // alvo que a resposta escolheu: as perguntas seguintes da mesma carta miram nele
  const tried = new Set(); // ações que a engine recusou neste turno: não repete
  const cost = uid => (h.known(uid) ? h.info(uid).cost?.amount ?? 0 : 0);
  const devotees = key => h.S().players[key].battlefield.filter(u => h.info(u).kind === 'Devotee');
  const enemyOf = key => h.S().order.find(k => k !== key);

  // Escolhas de uma carta (STEPS): primeiro candidato; opcional com candidato é usado; confirmação = sim.
  function choicesFor(key, steps) {
    const choice = {};
    for (const step of steps) {
      if (step.when && !step.when(choice)) continue;
      if (step.options) { const opts = Object.keys(step.options); choice[step.key] = (focus && opts.find(o => /prevent|protect|god/i.test(`${o} ${step.options[o]}`))) || opts[0]; }
      else if (step.confirm) choice[step.key] = true;
      else if (step.pick) {
        const opts = h.candidates(step, key);
        if (focus && opts.includes(focus)) { choice[step.key] = step.multi ? [focus] : focus; continue; }
        if (step.multi) { if (opts.length) choice[step.key] = opts.slice(0, step.multi); }
        else if (opts.length) choice[step.key] = step.pick === 'enemy' ? weakest(opts) : opts[0];
        else if (!step.optional) return null;
      }
    }
    return choice;
  }
  // Alvo encenado antes da jogada (docs/atividade-adversario.md): o primeiro uid/God escolhido.
  const aimOf = ch => Object.values(ch || {}).flat().find(v => typeof v === 'string' && (v.startsWith('god:') || h.known(v))) || null;
  const weakest = uids => [...uids].sort((a, b) => h.hp(a) - h.hp(b))[0];

  // Mesa do ponto de vista de `key`: Soul, Devotees, mão e Latent.
  function evaluate(key) {
    const s = h.S(), foe = enemyOf(key), me = s.players[key], him = s.players[foe];
    if (s.victory) return s.victory.winner === key ? 1000 : s.victory.winner ? -1000 : 0;
    const board = k => devotees(k).reduce((n, u) => n + h.atk(u) + 0.6 * Math.max(h.hp(u), 0), 0);
    return 1.2 * (me.soul - him.soul) + board(key) - board(foe) + 0.6 * (me.hand.length - him.hand.length) + 0.2 * (me.latent - him.latent);
  }
  // Roda a jogada de verdade com todas as respostas passadas, mede a mesa e desfaz tudo. Espia o topo do deck, como quem compra.
  function tryOut(key, a) {
    const s = h.S(), c = h.ctx(), snap = snapshot(s, c), saved = focus;
    focus = a.focus ?? null;
    const run = () => { a.run(); passAll(s); };
    let score = null;
    try {
      let r = runDecisions(s, c, run, [], snap);
      for (let i = 0; r.pending && i < 30; i++) r = resume(s, c, run, r, {value: answer(r.pending)});
      if (!r.pending) score = evaluate(key);
    } catch { score = null; }
    restore(s, c, snap);
    delete s.pending;
    focus = saved;
    return score;
  }
  // Toda jogada legal do turno, com variante por alvo inimigo, Strike por alvo e o portador de cada Equipment.
  function allPlays(key) {
    const s = h.S(), p = s.players[key], id = a => `${s.turn}:${a}`, list = [], foes = devotees(enemyOf(key));
    const add = (name, extra) => { if (!tried.has(id(name))) list.push({id: id(name), ...extra}); };
    for (const uid of p.hand.filter(u => !h.playableReason(key, u) && !(h.info(u).kind === 'Devotee' && h.duplicate(key, u)) && worthPlaying(key, u))) {
      const c = h.info(uid);
      if (c.kind === 'Equipment') {
        const bearer = devotees(key).find(d => h.resonant(key, c, d)) || null;
        add(`play:${uid}`, {src: uid, aim: bearer, run: () => h.playEquipment(key, uid, bearer, {})});
        continue;
      }
      for (const aim of c.kind === 'Spell' && foes.length ? foes : [null]) {
        focus = aim;
        const ch = choicesFor(key, h.STEPS[h.num(uid)] || []);
        focus = null;
        if (ch) add(`play:${uid}${aim ? `>${aim}` : ''}`, {src: uid, aim: aim || aimOf(ch), focus: aim, run: () => (c.kind === 'Devotee' ? h.playDevotee(key, uid, ch) : h.playSpell(key, uid, ch))});
      }
    }
    for (const uid of p.battlefield.filter(u => h.info(u).kind === 'Equipment' && !h.info(u).global && !h.attached(u)))
      for (const bearer of devotees(key).filter(d => !h.info(uid).armor || h.resonant(key, h.info(uid), d)))
        add(`equip:${uid}>${bearer}`, {src: uid, aim: bearer, run: () => h.reequip(key, uid, bearer)});
    for (const uid of h.hiddenReason ? p.bases.map(b => b.uid).filter(u => !h.hiddenReason(key, u)) : []) {
      const ch = choicesFor(key, h.STEPS[h.num(uid)] || []);
      if (ch) add(`hidden:${uid}`, {src: uid, aim: aimOf(ch), run: () => h.castHidden(key, uid, ch)});
    }
    for (const uid of h.zonePlays ? h.zonePlays(key) : []) { // §58: do Void (impulse draw) ou do Tartarus (Ofir)
      const ch = choicesFor(key, h.STEPS[h.num(uid)] || []);
      if (ch) add(`zone:${uid}`, {src: uid, aim: aimOf(ch), run: () => h.castFromZone(key, uid, ch)});
    }
    for (const uid of p.tartarus.filter(u => h.afterlifeBlock && !h.afterlifeBlock(key, u))) add(`afterlife:${uid}`, {src: uid, run: () => h.activateAfterlife(key, uid)});
    if (h.commandBlock && !h.commandBlock(key)) for (const uid of h.commandTargets(key)) add(`command:${uid}`, {aim: uid, run: () => h.activateCommand(key, uid)});
    const dom = h.domainUses?.(key);
    if (dom?.res) add('domain-res', {run: () => h.activate(key, `domain:${key}:res`)});
    if (dom?.general && (dom.general.cost || p.deck.length > 25)) add('domain', {run: () => h.activate(key, `domain:${key}`)});
    for (const uid of devotees(key).filter(u => s.units[u]?.prepared))
      for (const t of h.strikeTargets(uid)) add(`strike:${uid}>${t.uid || 'god'}`, {src: uid, aim: t.kind === 'god' ? `god:${t.player}` : t.uid, run: () => h.declareStrike(uid, t)});
    return list;
  }
  // hard: a Base vem antes (a IA simples já escolhe); depois, a jogada que mais melhora a mesa, ou End Turn se nenhuma melhorar.
  function next(key) {
    const simple = nextSimple(key);
    if (level() !== 'hard' || !h.ctx || simple?.base || simple?.must) return simple; // `must`: a avaliação não enxerga o Judgment
    const stay = evaluate(key);
    let best = null, top = stay + 0.01;
    for (const a of simple ? [simple, ...allPlays(key)] : allPlays(key)) {
      const score = tryOut(key, a);
      if (score != null && score > top) { top = score; best = a; }
    }
    return best;
  }

  // Athena Exclamation: o trio de maior dano, se for letal ou do Round 6 em diante.
  function exclamation(key) {
    const s = h.S(), id = `${s.turn}:ultimate`;
    if (s.divine[key].god !== 'god-athena' || s.divine[key].ultimateUsed || tried.has(id)) return null;
    const loss = trio => trio.reduce((n, u) => n + h.atk(u), 0);
    const saints = devotees(key).filter(u => h.isSaint(u));
    // A taxa de Bronze/Silver sai do Soul próprio (autor, 02/11/2026): nunca paga com Soul letal.
    const tax = trio => trio.reduce((n, u) => n + (/Bronze Saint/.test(h.info(u).type) ? 3 : /Silver Saint/.test(h.info(u).type) ? 2 : 0), 0);
    const trio = COMBO(saints, 3).filter(t => !h.ultimateBlock(key, t) && tax(t) < s.players[key].soul).sort((a, b) => loss(b) - loss(a))[0];
    const foe = enemyOf(key);
    if (!trio || !(loss(trio) >= s.players[foe].soul || s.round >= 12)) return null;
    return {id, must: true, run: () => h.announceExclamation(key, trio)};
  }
  // Divine Judgment (D206): no último Round do prazo, paga com os 3 Devotees mais baratos. easy não se defende.
  function judgmentDefense(key) {
    const s = h.S(), j = s.divine?.[key]?.judgment, id = `${s.turn}:judgment`, mine = devotees(key);
    if (!j || level() === 'easy' || s.round < j.deadline || mine.length < 3 || tried.has(id)) return null;
    const trio = [...mine].sort((a, b) => cost(a) - cost(b)).slice(0, 3);
    return {id, must: true, run: () => removeJudgment(s, h.ctx(), key, trio)};
  }

  // Próxima ação no próprio turno: {id, run} ou null (End Turn).
  function nextSimple(key) {
    const s = h.S(), p = s.players[key], id = a => `${s.turn}:${a}`;
    const fresh = a => !tried.has(id(a));
    const hand = [...p.hand];
    // 1. Base: até 8, a carta Cosmoble menos útil para a curva (rebalanceamento de Cosmoble, 31/10/2026): cópia repetida
    // na mão; depois a que não cabe no próximo turno; depois Spell/Equipment antes de Devotee; a mais cara primeiro.
    // Depois de 5 Bases, só põe Base se ainda sobrarem 2+ cartas na mão (stall de 01/11/2026: IA ficava sem jogada).
    if (p.bases.length < 5 || (p.bases.length < 8 && hand.length >= 3)) {
      const dup = u => hand.some(o => o !== u && h.info(o) === h.info(u)), late = u => cost(u) > p.bases.length + 2;
      // easy entrega Spells e Equipment primeiro. Os outros guardam o que dá para jogar: Devotee com pouco campo, Armor com portador.
      const keep = u => {
        const c = h.info(u);
        if (c.kind === 'Devotee') return devotees(key).length < 3 ? 2 : 0;
        if (c.armor) return devotees(key).some(d => h.resonant(key, c, d)) ? 2 : 0;
        return 1;
      };
      const pick = hand.filter(u => h.canBase(key, u)).sort(level() === 'easy'
        ? (a, b) => dup(b) - dup(a) || late(b) - late(a) || (h.info(a).kind === 'Devotee') - (h.info(b).kind === 'Devotee') || cost(b) - cost(a)
        : (a, b) => dup(b) - dup(a) || late(b) - late(a) || keep(a) - keep(b) || cost(b) - cost(a))[0];
      if (pick && fresh(`base:${pick}`)) return {id: id(`base:${pick}`), src: pick, base: true, run: () => h.placeBase(s, key, pick, h.info(pick))};
    }
    const defense = judgmentDefense(key);
    if (defense) return defense;
    // 2. Ultimate: Athena Exclamation (regra em `exclamation`); Great Flood com 2+ Devotees inimigos.
    const god = s.divine[key].god, ult = exclamation(key);
    if (ult) return ult;
    if (god === 'god-poseidon' && !h.greatFloodBlock(key) && devotees(enemyOf(key)).length >= 2 && fresh('flood')) return {id: id('flood'), run: () => h.announceGreatFlood(key)};
    // 2b. Equip (§33), antes da mão: arma/acessório solto no campo se prende ao nomeado na Resonance, senão ao Devotee de maior ATK.
    for (const uid of p.battlefield.filter(u => h.info(u).kind === 'Equipment' && !h.info(u).global && (level() !== 'easy' || !h.info(u).armor) && !h.attached(u))) {
      const mine = devotees(key), c = h.info(uid);
      const bearer = mine.find(d => h.resonant(key, c, d)) || (c.armor ? null : [...mine].sort((a, b) => h.atk(b) - h.atk(a))[0]);
      if (bearer && fresh(`equip:${uid}`)) return {id: id(`equip:${uid}`), src: uid, aim: bearer, run: () => h.reequip(key, uid, bearer)};
    }
    // 3–5. Cartas da mão jogáveis, da mais cara para a mais barata: Devotee, Equipment, Spell.
    const order = {Devotee: 0, Equipment: 1, Spell: 2};
    for (const uid of hand.filter(u => !h.playableReason(key, u) && !(h.info(u).kind === 'Devotee' && h.duplicate(key, u))).sort((a, b) => order[h.info(a).kind] - order[h.info(b).kind] || cost(b) - cost(a))) {
      if (!fresh(`play:${uid}`) || !worthPlaying(key, uid)) continue;
      const c = h.info(uid);
      if (c.kind === 'Equipment') {
        // Entra presa só no Resonant, sem Equip (guia §28, §33); senão entra sem portador e se prende depois.
        const bearer = devotees(key).find(d => h.resonant(key, c, d)) || null;
        return {id: id(`play:${uid}`), src: uid, aim: bearer, run: () => h.playEquipment(key, uid, bearer, {})};
      }
      const ch = choicesFor(key, h.STEPS[h.num(uid)] || []);
      if (!ch) continue;
      return {id: id(`play:${uid}`), src: uid, aim: aimOf(ch), run: () => (c.kind === 'Devotee' ? h.playDevotee(key, uid, ch) : h.playSpell(key, uid, ch))};
    }
    // 5b. Hidden Cosmo (guia §4A, 31/10/2026): carta jogável da própria Base, depois da mão (a Base volta pelo topo do deck).
    for (const uid of h.hiddenReason ? p.bases.map(b => b.uid).filter(u => !h.hiddenReason(key, u)) : []) {
      const ch = fresh(`hidden:${uid}`) && choicesFor(key, h.STEPS[h.num(uid)] || []);
      if (ch) return {id: id(`hidden:${uid}`), src: uid, aim: aimOf(ch), run: () => h.castHidden(key, uid, ch)};
    }
    // 5b1. De outra zona (§58, 08/11/2026): impulse draw do Void e Moment do Tartarus (Ofir).
    for (const uid of h.zonePlays ? h.zonePlays(key) : []) {
      const ch = fresh(`zone:${uid}`) && choicesFor(key, h.STEPS[h.num(uid)] || []);
      if (ch) return {id: id(`zone:${uid}`), src: uid, aim: aimOf(ch), run: () => h.castFromZone(key, uid, ch)};
    }
    // 5b2. Afterlife (§40, 01/11/2026): o que sobrou de Cosmo, depois da mão.
    for (const uid of h.afterlifeBlock ? p.tartarus.filter(u => !h.afterlifeBlock(key, u)) : []) {
      if (fresh(`afterlife:${uid}`) && p.hand.every(u => h.playableReason(key, u))) return {id: id(`afterlife:${uid}`), src: uid, run: () => h.activateAfterlife(key, uid)};
    }
    // 5c. Divine Command (§63, 01/11/2026): antes dos Strikes. Inimigo: o de menor HP restante; Athena: o aliado mais ferido
    // (só se houver dano); Artemis: o aliado de maior ATK.
    if (h.commandBlock && !h.commandBlock(key) && fresh('command') && !(level() === 'easy' && hash(`${s.turn}`) % 2)) {
      const opts = h.commandTargets(key), friendly = god === 'god-athena' || god === 'god-artemis';
      const uid = !friendly ? weakest(opts) : god === 'god-athena' ? opts.filter(u => s.units[u]?.damage).sort((a, b) => s.units[b].damage - s.units[a].damage)[0]
        : [...opts].sort((a, b) => h.atk(b) - h.atk(a))[0];
      if (uid) return {id: id('command'), aim: uid, run: () => h.activateCommand(key, uid)};
    }
    // 5d. Domain (rebalanceamento, 01/11/2026): Ressonância quando a engine aceitar (alvos pelas perguntas, em `answer`);
    // ativada da linha geral: as de compra (custo 0, com drawback de Soul/cartas) só com Soul e deck de sobra (deck vazio perde, §55).
    const dom = h.domainUses?.(key);
    if (dom?.res && fresh('domain-res')) return {id: id('domain-res'), run: () => h.activate(key, `domain:${key}:res`)};
    if (dom?.general && (dom.general.cost || (p.soul > 12 && p.deck.length > 25)) && fresh('domain')) return {id: id('domain'), run: () => h.activate(key, `domain:${key}`)};
    // 6. Strikes: no God se puder; senão no Devotee alvo de menor HP restante.
    for (const uid of devotees(key)) {
      if (!s.units[uid]?.prepared || !fresh(`strike:${uid}`)) continue;
      const targets = h.strikeTargets(uid);
      if (!targets.length) continue;
      const god = targets.find(t => t.kind === 'god');
      const target = god || (level() === 'easy' ? {kind: 'devotee', uid: weakest(targets.map(t => t.uid))} : bestTrade(key, uid, targets));
      if (!target) continue; // Strike que só perde o atacante: fica de fora
      return {id: id(`strike:${uid}`), src: uid, aim: target.kind === 'god' ? `god:${target.player}` : target.uid, run: () => h.declareStrike(uid, target)};
    }
    return null;
  }

  // Vale gastar a carta agora? easy pula 1 em cada 3 jogadas; os outros guardam resposta e evitam carta sem efeito.
  function worthPlaying(key, uid) {
    const s = h.S(), p = s.players[key], c = h.info(uid);
    if (level() === 'easy') return hash(`${s.turn}:${uid}`) % 3 !== 0;
    const mine = devotees(key);
    if (c.kind !== 'Spell') return true;
    const r = roles(c);
    if (r.counter || (r.protect && !r.draw)) return false; // só serve na janela de resposta
    if (r.soul && p.soul <= r.soul + 6) return false;
    if (r.sacrifice && mine.length < 2) return false;
    if (r.enemyOnly && !devotees(enemyOf(key)).length) return false;
    if (r.reanimate && !p.tartarus.length) return false;
    if (r.draw && p.deck.length <= 8) return false; // deck vazio perde (§55)
    if (r.trick && !r.removal && !mine.some(u => s.units[u]?.prepared)) return false;
    return true;
  }
  // Strike em Devotee: mata e sobrevive > mata > sobrevive. Só perder o atacante não vale, salvo se ele for obrigado a atacar.
  function bestTrade(key, uid, targets) {
    const atk = h.atk(uid), hp = h.hp(uid);
    const value = t => (h.hp(t.uid) <= atk ? 2 : 0) + (h.atk(t.uid) < hp ? 1 : 0);
    const best = [...targets].sort((a, b) => value(b) - value(a) || cost(b.uid) - cost(a.uid))[0];
    return value(best) > 0 || h.mustStrike?.(key).includes(uid) ? {kind: 'devotee', uid: best.uid} : null;
  }
  // Strike em curso: o aberto mais recente, se o atacante ainda está em campo.
  function currentStrike() {
    const s = h.S();
    for (let i = s.events.length - 1, n = 0; i >= 0 && n < 60; i--, n++) {
      const e = s.events[i];
      if (e.type === 'strike_resolve') return null;
      if (e.type === 'strike_declared') return s.players[e.player].battlefield.includes(e.attacker) ? e : null;
    }
    return null;
  }
  // Janela de resposta com prioridade: {id, run} ou null (passa). easy nunca responde.
  function respond(key) {
    if (level() === 'easy') return null;
    const s = h.S(), p = s.players[key], top = s.chain[s.chain.length - 1], strike = currentStrike(), hard = level() === 'hard';
    const onMe = strike && strike.player !== key, target = strike?.target;
    for (const uid of p.hand.filter(u => h.info(u).kind === 'Spell' && !h.playableReason(key, u)).sort((a, b) => cost(b) - cost(a))) {
      if (!tried.has(`${s.turn}:resp:${uid}`) && p.soul > roles(h.info(uid)).soul + 3) {
        const r = roles(h.info(uid));
        let aim = null;
        if (r.counter && top && top.controller !== key && (top.spell || top.card) && (hard || cost(top.uid) >= 2)) aim = top.uid;
        else if (r.protect && onMe && target.kind === 'god' && (h.atk(strike.attacker) >= 3 || p.soul <= h.atk(strike.attacker) + 3)) aim = `god:${key}`;
        else if (r.protect && onMe && target.kind === 'devotee' && h.atk(strike.attacker) >= h.hp(target.uid)) aim = target.uid;
        else if (r.removal && onMe) aim = strike.attacker;
        else if (hard && r.trick && !r.removal && strike && !onMe && target.kind === 'devotee' && h.hp(target.uid) > h.atk(strike.attacker)) aim = strike.attacker;
        else if (!top && !strike && s.active !== key && (r.removal ? devotees(enemyOf(key)).length : hard && r.draw && p.deck.length > 8)) aim = 'end'; // fim do turno dele
        if (!aim) continue;
        focus = aim === 'end' ? null : aim;
        const ch = choicesFor(key, h.STEPS[h.num(uid)] || []);
        if (ch) return {id: `${s.turn}:resp:${uid}`, src: uid, aim: focus, run: () => h.playSpell(key, uid, ch)};
      }
    }
    focus = null;
    return null;
  }
  // Mão sem Devotee barato volta em parte; easy fica com o que veio.
  function mulligan(key) {
    if (level() === 'easy') return [];
    const hand = h.S().players[key].hand;
    if (hand.some(u => h.info(u).kind === 'Devotee' && cost(u) <= 3)) return [];
    return [...hand].sort((a, b) => cost(b) - cost(a)).slice(0, 3);
  }

  // Pergunta da engine para a IA: "you may" = sim; escolha obrigatória = as cartas mais baratas (descarte, Base a devolver).
  function answer(req) {
    // Custo em Soul (taxa de Ares, Rise Again…): só paga com folga, para não se matar por 1 de dano.
    // Resonance ao entrar: não tira a carta de quem já a usa, porque quem entra vem Unprepared.
    if (req.kind === 'optional' && req.ability === 'Resonance' && h.attached(req.uid)) return false;
    if (req.kind === 'optional') return !(req.cost?.soul || /Soul/.test(String(req.cost ?? ''))) || h.S().players[req.player].soul > 6;
    // Alvo de carta V6: God inimigo primeiro; senão o Devotee inimigo mais caro; senão o próprio mais caro.
    if (req.choose === 'mode') return (focus && req.options.find(o => /prevent|protect/i.test(String(o)))) || req.options[0]; // modo escrito: o primeiro, ou o de proteção na resposta
    if (req.choose === 'target') {
      if (focus && req.options.includes(focus)) return req.multiple ? [focus] : focus;
      const god = req.options.filter(o => String(o).startsWith('god:') && o !== `god:${req.player}`);
      const real = req.options.filter(o => !String(o).startsWith('god:'));
      const foes = real.filter(o => !String(o).startsWith(`${req.player}:`)).sort((a, b) => cost(b) - cost(a));
      const rest = req.options.filter(o => !god.includes(o) && !foes.includes(o)).sort((a, b) => cost(b) - cost(a));
      // "Up to N" (multiple): lista; inimigos primeiro e só completa com os próprios até o mínimo.
      if (req.multiple) { const enemy = [...god, ...foes].slice(0, req.count); return [...enemy, ...rest.slice(0, Math.max(0, (req.min ?? req.count) - enemy.length))]; }
      return god[0] ?? foes[0] ?? rest[0];
    }
    const sorted = [...req.options].sort((a, b) => cost(a) - cost(b));
    if (req.choose === 'keep') return [...req.options].sort((a, b) => h.hp(b) - h.hp(a))[0]; // §63: mantém a versão mais inteira
    if (req.choose === 'top') return [...req.options].sort((a, b) => cost(b) - cost(a))[0];
    const picked = sorted.slice(0, req.count);
    return req.multiple ? picked : picked[0];
  }

  return {next, answer, respond, mulligan, refuse: a => tried.add(a.id)};
}
