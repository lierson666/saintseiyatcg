// Efeitos V6 de Hades, por id de carta (contrato em ./registry.js; kit em ./kit.js).
// Interpretações e cláusulas sem gancho: comentários "Interpretação:" e "pendente:" nas entradas.
import * as k from './kit.js';
// "Target enemy God": único alvo possível, guardado ao conjurar sem pergunta (v6/targets.js; reações como Poseidon 136 o enxergam).
const godOfFoe = (s, c, key) => [k.godTarget(k.other(s, key))];
import {addSeal, hooks, pushTriggers} from '../core.js';
import {collect, contextOf} from './registry.js';
import {forbidStrike} from '../effects.js';

// ---------- ajudantes locais ----------
const name = (c, uid) => k.card(c, uid)?.name || '';
const cost = cd => cd.cost?.amount ?? 0;
const wears = (c, uid, gearId) => k.gearOf(c, uid).find(g => k.id(c, g) === gearId) || null;
const controls = (s, c, key, cardId) => s.players[key].battlefield.some(u => k.id(c, u) === cardId);
const room = (s, c, uid) => k.hpOf(s, c, uid) - (s.units[uid]?.damage || 0); // HP restante ("with N HP or less")
const friendly = (s, key, uid) => k.controllerOf(s, uid) === key;
const devCost = max => cd => cd.kind === 'Devotee' && cost(cd) <= max;
const specter = (max = Infinity) => cd => /Specter/.test(cd.type) && cost(cd) <= max;
const goldSaint = cd => cd.kind === 'Devotee' && /Gold Saint/.test(cd.type);

// Soul: "loses" sem custo; drain = perde o inimigo, ganha o seu God. Depois da vitória nada mais muda (D52).
const lose = (s, who, n) => { if (!s.victory && n > 0) k.loseSoulOf(s, who, n); };
const gain = (s, key, n) => { if (!s.victory && n > 0) k.gainSoul(s, key, n); };
const drain = (s, key, n, loser = k.other(s, key)) => { lose(s, loser, n); gain(s, key, n); };
// Soul pago por habilidade: evento `soul_paid` (uid = fonte, quando conhecida) para 187 Dead End Symphony e 228 Pandora's Harp.
const pay = (s, c, key, ability, n, uid) => s.players[key].soul >= n && k.may(c, key, ability, {uid, cost: `${n} Soul`}) && k.paySoul(s, key, n)
  && (k.emit(s, 'soul_paid', {player: key, amount: n, uid: uid ?? null, ability}), true);

// Observadores por evento, lidos no checkpoint (como scanGods): watchSealRemoved(e) e watchSoulPaid(e).
// shortcut: o gatilho nasce no checkpoint seguinte, não no instante da remoção/pagamento.
hooks.checkpoint.push(state => {
  const ctx = contextOf(state);
  if (!ctx || state.victory) return;
  const events = state.events.slice(state.hadesScan ?? 0);
  state.hadesScan = state.events.length;
  const out = [];
  for (const e of events) {
    if (e.type === 'seal_removed' && ctx.objects[e.uid]) out.push(...collect(state, ctx, state.order, 'watchSealRemoved', [e], 'a Seal counter is removed'));
    if (e.type === 'soul_paid') out.push(...collect(state, ctx, state.order, 'watchSoulPaid', [e], 'Soul is paid'));
  }
  if (out.length) pushTriggers(state, out);
});
const sealOwner = (s, c, e) => k.controllerOf(s, e.uid) ?? c.objects[e.uid].owner; // Seal tirado na saída: o dono
const enemySeal = (s, c, key, e) => k.isDevotee(c, e.uid) && sealOwner(s, c, e) !== key;

const seal = (s, c, uids, n, source) => { const list = uids.filter(u => s.units[u]); if (list.length) addSeal(s, c, list, n, source); };
// -X/-Y até o fim do Round; HP máximo ≤ dano derrota na hora (verificação de estado).
const weaken = (s, c, uid, atk, hp) => { if (!s.units[uid]) return; k.buff(s, uid, -atk, -hp); k.checkDefeats(s, c); };
const enemy = (s, c, key, ability, test = () => true, opts) => k.choose(c, key, ability, k.enemies(s, c, key).filter(u => test(u)), opts);

// Sacrifício escolhido por `who` (o próprio controlador). `exclude`: "another".
function sacrificeOne(s, c, who, ability, exclude, optional = false) {
  const pick = k.choose(c, who, ability, k.devotees(s, c, who).filter(u => u !== exclude), {optional, text: 'Choose a Devotee to sacrifice.'});
  if (pick) k.sacrifice(s, c, pick);
  return pick;
}
// Saída por sacrifício (kit.sacrifice) e não por destruição comum: o último evento de saída do uid diz.
const sacrificed = (s, uid) => s.events.findLast(e => e.uid === uid && ['destroyed', 'sacrificed', 'unique_removed'].includes(e.type))?.type === 'sacrificed';
// Entrou vindo do Tartarus (kit.putOntoField marca `from` no card_played).
const fromTartarus = (s, uid) => s.events.findLast(e => e.type === 'card_played' && e.uid === uid)?.from === 'tartarus';

// ---------- Tartarus ----------
const inTartarus = (s, c, key, test) => s.players[key].tartarus.filter(u => test(k.card(c, u), u));
const needIn = (s, c, key, test, text) => { if (!inTartarus(s, c, key, test).length) throw new k.RuleError('alvo', text); };
// Tartarus → mão (o kit avisa watchRecall: Ressonância da The River Acheron, 243).
const recall = (s, c, key, uid) => k.toHand(s, c, uid, 'tartarus');
function toHandFrom(s, c, key, ability, test, {optional = false, exclude} = {}) {
  const uid = k.choose(c, key, ability, inTartarus(s, c, key, (cd, u) => u !== exclude && test(cd)), {optional, text: 'Choose a card in your Tartarus to return to your hand.'});
  return uid && recall(s, c, key, uid) ? uid : null;
}
// Tartarus → campo, Unprepared (todos os textos de Hades). Limite de 1 retorno por carta/Round fica no kit.
const returnable = (s, c, key, test) => inTartarus(s, c, key, (cd, u) => cd.kind === 'Devotee' && test(cd) && !s.roundUses.has(`return:${u}`));
const raise = (s, c, key, uid) => k.putOntoField(s, c, key, uid, 'tartarus', {prepared: false});
function toFieldFrom(s, c, key, ability, test, {optional = false} = {}) {
  const uid = k.choose(c, key, ability, returnable(s, c, key, test), {optional, text: 'Choose a Devotee in your Tartarus to return to the battlefield.'});
  return uid && raise(s, c, key, uid) ? uid : null;
}
// "cannot Strike this round": volta Unprepared e só o ativo prepara no início do turno; isto barra o Strike deste turno
// (Impulse incluso, D22). shortcut: um efeito que prepare de novo no turno seguinte do mesmo Round não é barrado.
const noStrike = (s, uid) => { if (uid) s.strikes.set(uid, s.turn); };

// Mão do oponente revelada; `key` escolhe uma carta que passa em `test` e o oponente a descarta.
function strip(s, c, key, ability, test) {
  const opp = k.other(s, key), hand = s.players[opp].hand;
  k.emit(s, 'hand_revealed', {player: opp, uids: [...hand]});
  const pick = k.choose(c, key, ability, hand.filter(u => test(k.card(c, u))), {text: 'Choose a card to discard.'});
  if (!pick || !k.toTartarus(s, c, pick, 'hand')) return null;
  k.emit(s, 'discarded', {player: opp, uid: pick});
  k.watchers(s, c, 'watchDiscard', [opp, pick], 'Discard');
  return pick;
}

// Resonance ligada a outra carta: a Surplice precisa estar no Devotee nomeado. "Once each round" por Surplice.
const resonance = (s, c, bearer, gearId) => { const g = wears(c, bearer, gearId); return g && k.once(s, `${g}:resonance`); };

// "When X is defeated, you may pay N Soul. If you do, return it from your Tartarus to your hand."
const riseFromTartarus = (soul, ability) => ({
  defeated: (s, c, key, self) => st => {
    if (st.players[key].tartarus.includes(self) && pay(st, c, key, ability, soul, self)) recall(st, c, key, self);
  },
});
// "When X enters the battlefield, target enemy God loses N Soul and your God gains N Soul."
const drainOnEnter = (n, after) => ({enter: (s, c, key, self) => st => { drain(st, key, n); after?.(st, c, key, self); }});
// "When X enters …, target enemy Devotee gets -A ATK / -H HP until the end of the round."
const curse = (atk, hp, ability) => (s, c, key) => st => { const t = enemy(st, c, key, ability); if (t) weaken(st, c, t, atk, hp); };
// "When X enters …, put N Seal counters on target enemy Devotee."
const sealOnEnter = (n, ability) => (s, c, key) => st => seal(st, c, [enemy(st, c, key, ability)], n, ability);
// Hades → Preto (31/10/2026): o Seal ficou só em Hypnos; o resto vira −X/−X ou "can't declare a Strike".
const weakenOnEnter = (n, ability) => (s, c, key) => st => { const t = enemy(st, c, key, ability); if (t) weaken(st, c, t, n, n); };
// "Can't declare a Strike during its controller's next round".
const lockNextTurn = (st, key, uid) => { if (uid && st.units[uid]) forbidStrike(st, uid, 'next_round'); };
const lockOnEnter = ability => (s, c, key) => st => lockNextTurn(st, key, enemy(st, c, key, ability));
// "When X enters …, you may sacrifice another friendly Devotee. If you do, <effect>." `ready`: há alvo para o efeito.
const offering = (ability, ready, effect) => (s, c, key, self) => st => {
  if (ready(st, c, key) && sacrificeOne(st, c, key, ability, self, true)) effect(st, c, key, self);
};
// Rebalanceamento de Hades (autor, 30/10/2026): ETB de remoção/dreno vira "you may pay N Soul. If you do, …".
// `ready`: só pergunta quando o efeito tem alvo (sem inimigo, nada a pagar). Padrão: há Devotee inimigo.
const hasEnemy = (st, c, key) => k.enemies(st, c, key).length > 0;
const taxed = (n, ability, enter, ready = hasEnemy) => (s, c, key, self) => {
  const run = enter(s, c, key, self);
  return run && (st => { if (ready(st, c, key) && pay(st, c, key, ability, n, self)) run(st); });
};
const always = () => true;

// Defeat enemy Devotee com HP restante ≤ n.
const execute = (ability, n) => [
  (st, c, key) => k.enemies(st, c, key).some(u => room(st, c, u) <= n),
  (st, c, key) => { const t = enemy(st, c, key, ability, u => room(st, c, u) <= n); if (t) k.defeat(st, c, t); },
];
// Observador de derrota: `who` 'enemy' | 'friend' | 'other' (outro amigo); `limit`: tag de "once each round".
const onDefeat = (who, run, limit) => (s, c, key, self, dead, owner) => {
  const ok = who === 'enemy' ? owner !== key : owner === key && (who !== 'other' || dead !== self);
  if (!ok || (limit && !k.once(s, `${self}:${limit}`))) return;
  return st => run(st, c, key, self, dead, owner);
};
// "you may pay N Soul. If you do, draw M cards."
const payDraw = (st, c, key, ability, soul, cards) => { if (pay(st, c, key, ability, soul)) k.draw(st, key, cards); };
// Retorno do Tartarus ao campo de um Devotee amigo (Shion, Torch, Gates). `other`: exclui a própria carta.
const onReturn = (other, run, limit) => (s, c, key, self, entered) => {
  if (!friendly(s, key, entered) || (other && entered === self) || !fromTartarus(s, entered) || (limit && !k.once(s, `${self}:${limit}`))) return;
  return st => run(st, c, key, self, entered);
};

// Niobe: Deep Surplice (249) drena 2 quando a habilidade dela leva o HP do alvo a 0 ou menos (uma vez por Round).
const niobe = (atk, hp, ability) => (s, c, key, self) => st => {
  const t = enemy(st, c, key, ability);
  if (!t) return;
  const res = k.hpOf(st, c, t) - hp <= 0 && resonance(st, c, self, 'hades-v6-249');
  weaken(st, c, t, atk, hp);
  if (res) drain(st, key, 2);
};
// Aiacos: retorno ao campo com Garuda Surplice (186) dá +1 ATK ao retornado.
const aiacosReturn = (st, c, key, self) => {
  const u = toFieldFrom(st, c, key, 'GALACTICA ILLUSION', devCost(2), {optional: true});
  if (u && resonance(st, c, self, 'hades-v6-186')) k.buff(st, u, 1, 0);
};
// Myu: com Papillon Surplice (248), depois de devolver um Devotee à mão, pode pagar 1 Soul por outro de custo ≤ 2.
const myuReturn = (st, c, key, self) => {
  const u = toHandFrom(st, c, key, 'FAIRY THRONGING', devCost(2), {optional: true});
  if (u && inTartarus(st, c, key, devCost(2)).length && resonance(st, c, self, 'hades-v6-248')
    && pay(st, c, key, 'PAPILLON SURPLICE', 1)) toHandFrom(st, c, key, 'PAPILLON SURPLICE', devCost(2), {exclude: u});
};
// Charon: põe cartas do deck no Tartarus; com Acheron Surplice (190), pode devolver um Devotee de custo ≤ 2 à mão.
const charonMill = (st, c, key, self, n) => {
  if (k.mill(st, key, n) && resonance(st, c, self, 'hades-v6-190')) toHandFrom(st, c, key, 'ACHERON SURPLICE', devCost(2), {optional: true});
};
// Pandora pagou Soul por habilidade: Pandora's Trident (196) dá 1 Latent.
const trident = (st, c, key, self) => { if (resonance(st, c, self, 'hades-v6-196')) k.gainLatent(st, key, 1); };

// Saga, Another Dimension: exílio até Gemini Saga sair do campo. `st.hadesExile[saga] = uid exilado`.
// shortcut: só a derrota de Saga devolve; saída por mão/exílio precisa de gancho "leaves the battlefield".
const exiledBy = s => (s.hadesExile ||= {});

// O oponente sacrifica N Devotees (ele escolhe); `each(uid)` depois de cada um.
const oppSacrifices = (st, c, key, ability, n, each) => {
  for (let i = 0; i < n; i++) { const v = sacrificeOne(st, c, k.other(st, key), ability, null); if (!v) break; each?.(v); }
};

export default {
  // Spells baratas da color pie (autor, 31/10/2026: docs/spells-baratas-proposta.md).
  'hades-v6-511': {spell: {check: k.needTarget(k.enemies, 'sem Devotee inimigo'), run: (s, c, key) => { // Touch of Death
    const t = k.choose(c, key, 'TOUCH OF DEATH', k.enemies(s, c, key), {text: 'Choose target enemy Devotee.'});
    if (t) k.buff(s, t, -2, -2);
  }}},
  'hades-v6-512': {spell: {run: (s, c, key) => { k.draw(s, key, 2); lose(s, key, 2); }}}, // Pact of the Underworld
  'hades-v6-513': {spell: {check: k.needTarget((s, c, key) => s.players[key].tartarus.filter(u => k.isDevotee(c, u) && k.costOf(c, u) <= 3), 'sem Devotee de custo 3 ou menos no Tartarus'),
    run: (s, c, key) => { // Return from the Darkness
    const t = k.choose(c, key, 'RETURN FROM THE DARKNESS', s.players[key].tartarus.filter(u => k.isDevotee(c, u) && k.costOf(c, u) <= 3), {text: 'Choose target Devotee card with cost 3 or less in your Tartarus.'});
    if (t) k.toHand(s, c, t, 'tartarus');
  }}},
  // Wyvern Rhadamanthys. Interpretação: "target Devotee" inclui os seus (e ele mesmo), leitura literal.
  'hades-v6-181': {
    enter: taxed(3, 'GREATEST CAUTION', (s, c, key) => st => { const t = k.choose(c, key, 'GREATEST CAUTION', k.allDevotees(st, c)); if (t) k.defeat(st, c, t); },
      (st, c) => k.allDevotees(st, c).length > 0),
    watchDefeat: onDefeat('enemy', (st, c, key, self, dead, owner) => drain(st, key, 1, owner), 'judge'),
  },
  'hades-v6-182': { // Wyvern Surplice: "destroys … in combat" = derrota no Strike, atacando ou retaliando
    gearKillInCombat: (s, c, key, self, bearer, victim) => /RHADAMANTHYS/i.test(name(c, bearer)) && (st => drain(st, key, 2, c.objects[victim].owner)),
  },
  'hades-v6-183': { // Griffon Minos
    enter: taxed(1, 'COSMIC MARIONATION', weakenOnEnter(2, 'COSMIC MARIONATION')),
    watchDefeat: (s, c, key, self, dead, owner) => owner !== key && s.active === key && (st => lose(st, owner, 1)), // Puppet Master
  },
  'hades-v6-184': { // Griffon Surplice
    gearDeclare: (s, c, key, self, bearer) => /MINOS/i.test(name(c, bearer)) && k.once(s, `${self}:resonance`)
      && (st => { const t = enemy(st, c, key, 'GRIFFON SURPLICE'); if (t) weaken(st, c, t, 1, 1); }),
  },
  'hades-v6-185': { // Garuda Aiacos
    enter: (s, c, key) => st => toHandFrom(st, c, key, 'GARUDA FLAP', devCost(3), {optional: true}),
    killInCombat: (s, c, key, self) => st => aiacosReturn(st, c, key, self),
  },
  // 186 Garuda Surplice: dentro de Galactica Illusion (185), único retorno ao campo feito por Aiacos.
  'hades-v6-187': {enter: taxed(1, 'BALANCE OF CURSE', drainOnEnter(2, (st, c, key, self) => { // Sphinx Pharaoh + Sphinx Surplice (188)
    if (resonance(st, c, self, 'hades-v6-188') && pay(st, c, key, 'SPHINX SURPLICE', 2)) k.draw(st, key, 1);
  }).enter, always),
    // Dead End Symphony. Interpretação: todo Soul pago por habilidade (os "you may pay N Soul" de Hades); o próprio pagamento extra não reabre.
    watchSoulPaid: (s, c, key, self, e) => e.player === key && e.ability !== 'DEAD END SYMPHONY' && !s.roundUses.has(`${self}:symphony`)
      && (st => { if (k.onField(st, key, self) && pay(st, c, key, 'DEAD END SYMPHONY', 1, self)) { k.once(st, `${self}:symphony`); k.draw(st, key, 1); } }),
  },
  'hades-v6-189': { // Acheron Charon
    enter: (s, c, key) => st => { if (pay(st, c, key, "THE FERRYMAN'S PRICE", 2)) k.search(st, c, key, "THE FERRYMAN'S PRICE", devCost(3)); },
    watchDefeat: onDefeat('other', (st, c, key, self) => { if (pay(st, c, key, 'PASSAGE TO THE UNDERWORLD', 1)) charonMill(st, c, key, self, 1); }, 'passage'),
  },
  // 190 Acheron Surplice: dentro de Passage to the Underworld (189).
  'hades-v6-191': { // Hypnos
    enter: taxed(2, 'ETERNAL DROWSINESS', (s, c, key) => st => seal(st, c, k.enemies(st, c, key), 2, 'ETERNAL DROWSINESS')),
    // Eternal Slumber: uso do Round só gasto se pagar.
    watchSealRemoved: (s, c, key, self, e) => e.counters === 0 && enemySeal(s, c, key, e) && !s.roundUses.has(`${self}:slumber`) && (st => {
      if (k.onField(st, key, self) && k.controllerOf(st, e.uid) && pay(st, c, key, 'ETERNAL SLUMBER', 2, self)) { k.once(st, `${self}:slumber`); k.defeat(st, c, e.uid); }
    }),
  },
  'hades-v6-192': {spell: {run: (s, c, key) => { // Eternal Slumber
    const t = k.choose(c, key, 'ETERNAL SLUMBER', k.allDevotees(s, c));
    if (t) seal(s, c, [t], 3, 'ETERNAL SLUMBER'); // alvo ilegal: só o Seal não acontece
    k.draw(s, key, 1);
  }}},
  'hades-v6-193': { // Thanatos
    enter: taxed(3, 'TERRIBLE PROVIDENCE', (s, c, key) => st => { const t = enemy(st, c, key, 'TERRIBLE PROVIDENCE'); if (t) k.defeat(st, c, t); }),
    watchDefeat: onDefeat('enemy', (st, c, key, self, dead, owner) => drain(st, key, 2, owner), 'execution'),
  },
  'hades-v6-194': {spell: {run: (s, c, key) => { // Divine Touch of Death
    const t = k.choose(c, key, 'DIVINE TOUCH OF DEATH', k.allDevotees(s, c));
    if (!t) return;
    const ctl = k.controllerOf(s, t);
    k.defeat(s, c, t);
    lose(s, ctl, 2);
    if (controls(s, c, key, 'hades-v6-193')) gain(s, key, 2);
  }}},
  'hades-v6-195': { // Pandora + Pandora's Trident (196)
    enter: (s, c, key, self) => st => {
      if (!pay(st, c, key, "PANDORA'S COMMAND", 3)) return;
      trident(st, c, key, self);
      k.search(st, c, key, "PANDORA'S COMMAND", specter());
    },
    watchDefeat: onDefeat('other', (st, c, key, self) => {
      if (pay(st, c, key, 'QUEEN OF THE UNDERWORLD', 2)) { trident(st, c, key, self); k.draw(st, key, 2); }
    }, 'queen'),
  },
  'hades-v6-197': { // Aries Shion + Aries Surplice (198)
    enter: (s, c, key, self) => st => {
      if (toFieldFrom(st, c, key, 'RETURN FROM THE DEAD', devCost(4)) && resonance(st, c, self, 'hades-v6-198')) k.draw(st, key, 1);
    },
    watchEnter: onReturn(true, (st, c, key) => drain(st, key, 2), 'stardust'),
  },
  'hades-v6-199': { // Hades' Sword
    gearGodDamage: (s, c, key, self, bearer, player) => st => lose(st, player, 3),
    gearKillInCombat: (s, c, key, self, bearer, victim) => st => drain(st, key, 3, c.objects[victim].owner),
  },
  'hades-v6-200': { // Pandora's Box
    cast: (s, c, key) => st => oppSacrifices(st, c, key, 'FORBIDDEN SEAL', 1),
    // {3}{C} = 3 Base (kit). Interpretação: {T} em Equipment (sem estado Prepared na engine) vira "uma vez por Round".
    activate: {name: 'OPEN THE BOX', cost: 3, once: true, tap: false,
      check: (s, c, key) => { if (s.players[key].soul < 3) throw new k.RuleError('custo', 'Soul insuficiente (3)'); },
      run: (s, c, key) => { k.paySoul(s, key, 3); k.search(s, c, key, 'OPEN THE BOX', cd => cd.kind === 'Devotee'); }},
    // The Last Hope (gancho leaves): saiu do campo por qualquer via; seu God ganha 3 Soul e você compra 1.
    leaves: (s, c, key) => st => { gain(st, key, 3); k.draw(st, key, 1); },
  },
  'hades-v6-201': { // Harpy Valentine + Harpy Surplice (246)
    enter: taxed(1, 'GREED THE LIFE', drainOnEnter(2, (st, c, key, self) => { if (resonance(st, c, self, 'hades-v6-246')) gain(st, key, 1); }).enter, always),
    watchDefeat: (s, c, key, self, dead, owner) => owner === key && k.hasType(c, dead, 'Judge Specter') && (st => {
      if (!k.onField(st, key, self) || !st.players[key].tartarus.includes(dead) || !k.may(c, key, 'LOYAL SERVANT', {uid: dead, text: 'Sacrifice Harpy Valentine?'})) return;
      k.sacrifice(st, c, self);
      recall(st, c, key, dead);
    }),
  },
  'hades-v6-202': { // Balron Lune + Balron Surplice (247)
    enter: (s, c, key, self) => st => {
      if (strip(st, c, key, 'REINCARNATION', cd => cd.kind === 'Spell' && /Moment|Technique/.test(cd.type)) && resonance(st, c, self, 'hades-v6-247')) {
        k.draw(st, key, 1); lose(st, key, 1);
      }
    },
    watchDiscard: (s, c, key, self, player) => player !== key && k.once(s, `${self}:whip`) && (st => drain(st, key, 1, player)),
  },
  'hades-v6-203': { // Papillon Myu + Papillon Surplice (248)
    enter: (s, c, key) => st => payDraw(st, c, key, 'METAMORPHOSIS', 2, 2),
    godDamage: (s, c, key, self) => st => myuReturn(st, c, key, self),
  },
  'hades-v6-204': {enter: taxed(2, 'DEEP FRAGRANCE', niobe(3, 3, 'DEEP FRAGRANCE')), defeated: niobe(2, 2, 'POISONOUS DEATH')}, // Deep Niobe (+249)
  'hades-v6-205': { // Basilisk Sylphid
    combatDamage: (s, c, key, self, victim) => st => weaken(st, c, victim, 2, 2),
    watchDefeat: (s, c, key, self, dead, owner) => owner !== key && s.active === key && (st => k.buff(st, self, 2, 0)),
  },
  'hades-v6-206': { // Skeleton Markino
    enter: (s, c, key) => st => k.mill(st, key, 2),
    defeated: (s, c, key) => st => payDraw(st, c, key, 'EXPENDABLE SERVANT', 1, 1),
  },
  'hades-v6-207': { // Frog Zeros
    // Coward's Escape (gancho watchSpell; shortcut: só Spell inimiga, habilidade ativada não avisa alvo). Uso gasto só se pagar.
    watchSpell: (s, c, key, self, caster, spellUid, targets = []) => caster !== key && targets.includes(self) && !s.roundUses.has(`${self}:escape`)
      && (st => { if (k.onField(st, key, self) && pay(st, c, key, "COWARD'S ESCAPE", 2, self)) { k.once(st, `${self}:escape`); k.toHand(st, c, self, 'battlefield', key); } }),
    watchDefeat: onDefeat('other', (st, c, key) => lose(st, k.other(st, key), 1)),
  },
  'hades-v6-208': { // Cyclops Giganto. "attacks" = declara Strike.
    declare: (s, c, key, self) => st => { if (k.onField(st, key, self) && sacrificeOne(st, c, key, 'BRUTAL STRENGTH', self, true)) k.buff(st, self, 2, 0); },
    watchDefeat: (s, c, key, self, dead, owner) => owner === key && sacrificed(s, dead) && (st => gain(st, key, 1)),
  },
  'hades-v6-209': { // Worm Raimi
    enter: taxed(1, "WORM'S BIND", weakenOnEnter(1, "WORM'S BIND")),
    declare: (s, c, key, self, target) => target.kind === 'devotee' && s.units[target.uid]?.damage > 0 && (st => k.buff(st, self, 2, 0)),
  },
  'hades-v6-210': { // Golem Rock
    enter: offering('ROLLING BOMBER STONE', ...execute('ROLLING BOMBER STONE', 3)),
    watchDefeat: onDefeat('other', (st, c, key, self) => k.buff(st, self, 1, 0)),
  },
  'hades-v6-211': { // Troll Iwan
    enter: offering('GREATER AXE CRUSHER', (st, c, key) => k.enemies(st, c, key).length > 0, (st, c, key) => curse(3, 3, 'GREATER AXE CRUSHER')(st, c, key)(st)),
    watchDefeat: onDefeat('other', (st, c, key, self) => k.buff(st, self, 1, 0)),
  },
  // Guardian: o parser do texto V6 não lê "X has Guardian" como keyword impressa.
  'hades-v6-212': {...riseFromTartarus(2, 'ETERNAL DEFENDER'), mods: () => [{keywords: ['Guardian']}]},
  'hades-v6-213': { // Lycaon Phlegyas
    enter: taxed(1, 'HOWLING INFERNO', curse(2, 2, 'HOWLING INFERNO')),
    killInCombat: (s, c, key) => st => gain(st, key, 2),
  },
  'hades-v6-214': { // Minotaur Gordon. Interpretação: Executioner ("defeats") lido como derrota no Strike (killInCombat).
    combatDamage: (s, c, key, self, victim) => st => weaken(st, c, victim, 0, 2),
    killInCombat: (s, c, key) => st => lose(st, k.other(st, key), 1),
  },
  'hades-v6-215': { // Alraune Queen
    enter: (s, c, key) => st => { const [ready, kill] = execute('BLOOD FLOWER SCISSORS', 2); if (ready(st, c, key) && pay(st, c, key, 'BLOOD FLOWER SCISSORS', 2)) kill(st, c, key); },
    watchDefeat: onDefeat('enemy', (st, c, key) => gain(st, key, 1)),
  },
  'hades-v6-216': { // Gorgon Ox
    enter: taxed(1, 'PETRIFYING GAZE', lockOnEnter('PETRIFYING GAZE')),
    // Stone Curse: −2 ATK "during that Strike" aplicado até o fim do Round (como o 216 fazia antes).
    declare: (s, c, key, self, target) => target.kind === 'devotee' && k.once(s, `${self}:stone`) && (st => k.buff(st, target.uid, -2, 0)),
  },
  'hades-v6-217': { // Dullahan Cube
    ...drainOnEnter(1),
    defeated: (s, c, key, self) => st => toHandFrom(st, c, key, 'LAST BREATH', devCost(1), {optional: true, exclude: self}),
  },
  'hades-v6-218': riseFromTartarus(1, 'RISE AGAIN'),
  'hades-v6-219': {defeated: (s, c, key) => st => drain(st, key, 2), mods: () => [{keywords: ['Guardian']}]}, // Hades' Royal Guard
  'hades-v6-220': { // Wandering Soul
    enter: (s, c, key) => st => k.mill(st, key, 1),
    activate: {name: 'SOUL OFFERING', cost: 0, once: true, tap: false, run: (s, c, key, self) => { k.sacrifice(s, c, self); gain(s, key, 1); }},
  },
  'hades-v6-221': { // Styx Soul Herder (era River Styx Ferryman até 30/10/2026)
    enter: (s, c, key) => st => {
      if (inTartarus(st, c, key, devCost(2)).length && pay(st, c, key, 'GATHER THE LOST', 1)) toHandFrom(st, c, key, 'GATHER THE LOST', devCost(2));
    },
    defeated: (s, c, key) => st => k.mill(st, key, 2),
  },
  'hades-v6-222': { // Underworld Executioner
    enter: offering('FINAL SENTENCE', ...execute('FINAL SENTENCE', 3)),
    watchDefeat: (s, c, key, self, dead, owner) => owner === key && dead !== self && sacrificed(s, dead) && k.once(s, `${self}:tribute`) && (st => drain(st, key, 1)),
  },
  'hades-v6-223': { // Elysium Servant
    enter: (s, c, key) => st => gain(st, key, 2),
    activate: {name: "SERVANT'S SACRIFICE", cost: 0, once: true, tap: false, run: (s, c, key, self) => { k.sacrifice(s, c, self); k.draw(s, key, 1); }},
  },
  'hades-v6-224': { // Cracked Surplice — Broken Offering (autor, 30/10/2026): "When equipped Devotee is defeated".
    bearerDefeated: (s, c, key, self) => st => {
      if (inTartarus(st, c, key, devCost(1)).length && pay(st, c, key, 'BROKEN OFFERING', 1, self)) toHandFrom(st, c, key, 'BROKEN OFFERING', devCost(1));
    },
  },
  // Bone Reclamation: volta à mão de onde estiver (campo sem portador ou Tartarus).
  'hades-v6-225': {
    bearerDefeated: (s, c, key, self) => st => {
      const p = st.players[c.objects[self].owner], zone = ['battlefield', 'tartarus'].find(z => p[z].includes(self));
      if (!zone || (zone === 'battlefield' && c.attached[self]) || st.players[key].soul < 1) return;
      if (k.may(c, key, 'BONE RECLAMATION', {uid: self, cost: '1 Soul'}) && k.paySoul(st, key, 1)) k.toHand(st, c, self, zone);
    },
  },
  'hades-v6-226': {gearGodDamage: (s, c, key, self, bearer, player) => st => drain(st, key, 1, player)}, // Chain of the Damned
  'hades-v6-227': { // Coin of the Dead. {T} em Equipment: ver 200. Last Payment resolve junto (só esta habilidade sacrifica a Coin).
    activate: {name: 'PAY THE FERRYMAN', cost: 1, tap: false, run: (s, c, key, self) => {
      k.toTartarus(s, c, self, 'battlefield');
      k.emit(s, 'sacrificed', {uid: self, owner: c.objects[self].owner});
      toHandFrom(s, c, key, 'PAY THE FERRYMAN', devCost(2));
      lose(s, key, 1);
      if (!s.victory) k.draw(s, key, 1);
    }},
  },
  'hades-v6-228': { // Pandora's Harp — Sorrowful Melody: Soul pago por habilidade do portador (evento soul_paid com uid do portador).
    watchSoulPaid: (s, c, key, self, e) => e.player === key && e.uid && e.uid === k.bearerOf(c, self) && k.once(s, `${self}:melody`) && (st => lose(st, k.other(st, key), 1)),
  },
  'hades-v6-229': { // Underworld Shackles
    cast: (s, c, key) => st => { const t = enemy(st, c, key, 'ETERNAL BINDING'); if (t) weaken(st, c, t, 1, 1); },
    gearKillInCombat: (s, c, key, self, bearer, victim) => st => { const t = enemy(st, c, key, 'CURSED CHAINS', u => u !== victim); if (t) weaken(st, c, t, 1, 1); },
  },
  'hades-v6-230': { // Funeral Shroud
    bearerDefeated: (s, c, key, self, bearer) => st => {
      const owner = c.objects[bearer].owner;
      if (st.players[owner].tartarus.includes(bearer) && pay(st, c, key, "DEATH'S EMBRACE", 2, bearer)) recall(st, c, owner, bearer);
    },
  },
  'hades-v6-231': { // Torch of the Underworld
    watchEnter: onReturn(false, (st, c, key) => gain(st, key, 1), 'flame'),
    // Guiding Light (gancho leaves): "destroyed" = foi do campo para o Tartarus.
    leaves: (s, c, key, self, where) => where === 'tartarus' && (st => k.mill(st, key, 2)),
  },
  'hades-v6-232': {spell: {run: (s, c, key) => noStrike(s, toFieldFrom(s, c, key, 'THE AWAKENING OF THE SPECTERS', specter(3)))}},
  'hades-v6-233': {spell: {run: (s, c, key) => { k.search(s, c, key, 'THE CALL OF THE UNDERWORLD', specter(3)); lose(s, key, 2); }}},
  'hades-v6-234': {spell: {run: (s, c, key) => { // Death Is Only the Beginning
    sacrificeOne(s, c, key, 'DEATH IS ONLY THE BEGINNING', null);
    k.draw(s, key, 2); k.gainLatent(s, key, 1);
  }}},
  'hades-v6-235': {spell: {run: (s, c, key) => { // The Oath of the 108 Stars
    const picks = k.chooseUpTo(c, key, 'THE OATH OF THE 108 STARS', inTartarus(s, c, key, specter()), 2, {text: 'Choose Specter cards to return to your hand.'});
    lose(s, key, picks.filter(u => recall(s, c, key, u)).length);
  }}},
  'hades-v6-236': {spell: {run: (s, c, key) => { // Serve the Lord of Darkness
    const t = k.choose(c, key, 'SERVE THE LORD OF DARKNESS', k.devotees(s, c, key));
    if (!t) return;
    k.buff(s, t, 2, 1);
    if (pay(s, c, key, 'SERVE THE LORD OF DARKNESS', 2, t)) k.buff(s, t, 0, 0, 'this_round', ['Pierce']);
  }}},
  'hades-v6-237': {spell: {run: (s, c, key) => { // The Ferryman's Price
    oppSacrifices(s, c, key, "THE FERRYMAN'S PRICE", 1);
    payDraw(s, c, key, "THE FERRYMAN'S PRICE", 2, 1);
  }}},
  'hades-v6-238': {spell: {targets: godOfFoe, run: (s, c, key) => drain(s, key, 3)}}, // Souls of the Damned
  'hades-v6-239': {spell: {run: (s, c, key) => { strip(s, c, key, 'THE WHISPERS OF PANDORA', cd => cd.kind !== 'Devotee'); lose(s, key, 1); }}},
  // Animate Dead (31/10/2026): qualquer Devotee do seu Tartarus, sem teto de custo; não declara Strike neste Round.
  'hades-v6-240': {spell: {run: (s, c, key) => { const u = toFieldFrom(s, c, key, 'THE RETURN FROM DEATH', always); if (u) { noStrike(s, u); lose(s, key, 3); } }}},
  // The Will of Hades. Interpretação: "Your God loses 1 Soul" vale para os dois modos (linha separada).
  'hades-v6-241': {spell: {run: (s, c, key) => {
    const modes = [k.enemies(s, c, key).length && 'weaken', inTartarus(s, c, key, specter(2)).length && 'recall'].filter(Boolean);
    const mode = modes.length > 1 ? c.decide?.(key, {ability: 'THE WILL OF HADES', options: modes, choose: 'mode', text: 'Choose one.'}) : modes[0];
    let done = false;
    if (mode === 'weaken') { const t = enemy(s, c, key, 'THE WILL OF HADES'); if (t) { weaken(s, c, t, 3, 3); done = true; } }
    if (mode === 'recall') done = !!toHandFrom(s, c, key, 'THE WILL OF HADES', specter(2));
    if (done) lose(s, key, 1);
  }}},
  // ---------- Domains (rebalanceamento aprovado pelo autor em 01/11/2026, docs/domains-rebalance-proposta.md) ----------
  // Linha geral (qualquer God): ganchos e `activate`. Ressonância — Hades (só com God Hades): `res` (ativada, uid
  // `domain:${key}:res`, uma vez por turno) e `resonance` (gatilhos). Ver registry.js.
  'hades-v6-242': { // Hades Castle
    // Dark Authority: Specter amigo derrotado, o God inimigo perde 1 Soul (uma vez por Round).
    watchDefeat: (s, c, key, self, dead, owner) => owner === key && k.hasType(c, dead, 'Specter') && k.once(s, `${self}:dark`) && (st => lose(st, k.other(st, key), 1)),
    res: {name: 'RESONANCE', cost: 2, check: (s, c, key) => needIn(s, c, key, specter(3), 'sem Specter de custo 3 ou menos no seu Tartarus'),
      run: (s, c, key) => { toHandFrom(s, c, key, 'RESONANCE', specter(3)); }},
  },
  'hades-v6-243': { // The River Acheron — Charon's Toll (compra da facção): perde {3}{S} inteiro ou não compra.
    activate: {name: "CHARON'S TOLL", cost: 0, once: true, tap: false,
      check: (s, c, key) => { if (s.players[key].soul < 3) throw new k.RuleError("CHARON'S TOLL", 'Soul insuficiente para perder {3}{S}'); },
      run: (s, c, key) => { if (s.players[key].soul < 3) return; lose(s, key, 3); if (!s.victory) k.draw(s, key, 1); }},
    resonance: {watchRecall: (s, c, key, self, player, uid) => player === key && k.isDevotee(c, uid)
      && k.resPay(s, c, key, 'recall', 1, 'RESONANCE', st => gain(st, key, 2), {text: 'Pay {1}{C}: your God gains {2}{S}?'})},
  },
  'hades-v6-244': { // The First Prison
    watchDiscard: (s, c, key, self, player) => player !== key && k.once(s, `${self}:judgment`) && (st => lose(st, player, 1)),
    res: {name: 'RESONANCE', cost: 3, run: (s, c, key) => k.discard(s, c, k.other(s, key), 1, 'RESONANCE')},
  },
  'hades-v6-245': { // The Gates of the Underworld
    // Interpretação: "enters with +1 ATK" vira gatilho de entrada (+1 ATK até o fim do Round), não substituição.
    watchEnter: onReturn(false, (st, c, key, self, entered) => k.buff(st, entered, 1, 0), 'rise'),
    res: {name: 'RESONANCE', cost: 3, check: (s, c, key) => { if (!returnable(s, c, key, specter(2)).length) throw new k.RuleError('alvo', 'sem Specter de custo 2 ou menos no seu Tartarus'); },
      run: (s, c, key) => { toFieldFrom(s, c, key, 'RESONANCE', specter(2)); }},
  },
  'hades-v6-521': { // Cocytus — Frozen Lament: Devotee amigo derrotado, alvo inimigo -1 ATK até o fim do Round.
    watchDefeat: (s, c, key, self, dead, owner) => owner === key && k.enemies(s, c, key).length > 0 && k.once(s, `${self}:lament`)
      && (st => { const t = enemy(st, c, key, 'FROZEN LAMENT', () => true, {text: 'Choose target enemy Devotee.'}); if (t) k.buff(st, t, -1, 0); }),
    // shortcut: o sacrifício do custo acontece na resolução (o motor não tem custo de sacrifício ao declarar), como 503.
    res: {name: 'RESONANCE', cost: 3,
      check: (s, c, key) => {
        if (!k.devotees(s, c, key).length) throw new k.RuleError('RESONANCE', 'sem Devotee para sacrificar');
        if (!k.enemies(s, c, key).some(u => k.costOf(c, u) <= 3)) throw new k.RuleError('alvo', 'sem Devotee inimigo de custo 3 ou menos');
      },
      run: (s, c, key) => {
        if (!sacrificeOne(s, c, key, 'RESONANCE', null)) return;
        const t = enemy(s, c, key, 'RESONANCE', u => k.costOf(c, u) <= 3, {text: 'Choose target enemy Devotee with cost 3 or less.'});
        if (t) k.defeat(s, c, t);
      }},
  },
  'hades-v6-522': { // Elysion — Fields of the Blessed: Specters amigos +1 ATK com o seu God em 12 Soul ou menos.
    aura: (s, c, key, self, unit) => (friendly(s, key, unit) && k.hasType(c, unit, 'Specter') && s.players[key].soul <= 12 ? {atk: 1} : null),
    res: {name: 'RESONANCE', cost: 2, check: (s, c, key) => { if (!k.enemies(s, c, key).length) throw new k.RuleError('alvo', 'sem Devotee inimigo'); },
      run: (s, c, key) => { const t = enemy(s, c, key, 'RESONANCE', () => true, {text: 'Choose target enemy Devotee.'}); if (t) weaken(s, c, t, 2, 2); }},
  },
  // 246–249: Resonances dentro das habilidades de Valentine (201), Lune (202), Myu (203) e Niobe (204).
  'hades-v6-250': { // Basilisk Surplice
    gearKillInCombat: (s, c, key, self, bearer) => /SYLPHID/i.test(name(c, bearer)) && (st => toHandFrom(st, c, key, 'BASILISK SURPLICE', specter(2), {optional: true})),
  },
  'hades-v6-251': { // Cancer Deathmask
    enter: taxed(2, 'SEKI SHIKI MEIKAI HA', curse(3, 3, 'SEKI SHIKI MEIKAI HA')),
    watchDefeat: onDefeat('enemy', (st, c, key) => { if (pay(st, c, key, 'GATEWAY TO YOMOTSU', 1)) k.mill(st, key, 2); }, 'yomotsu'),
  },
  'hades-v6-252': { // Pisces Aphrodite
    enter: taxed(1, 'BLOODY ROSE', curse(2, 2, 'BLOODY ROSE')),
    watchDefeat: onDefeat('enemy', (st, c, key, self, dead, owner) => drain(st, key, 1, owner), 'rose'),
  },
  'hades-v6-253': { // Capricorn Shura
    enter: taxed(3, 'EXCALIBUR', (s, c, key) => st => execute('EXCALIBUR', 3)[1](st, c, key), execute('EXCALIBUR', 3)[0]),
    killInCombat: (s, c, key, self) => st => { if (sacrificeOne(st, c, key, 'BLADE OF SACRIFICE', self, true)) k.draw(st, key, 2); },
  },
  'hades-v6-254': { // Aquarius Camus
    enter: taxed(1, 'DIAMOND DUST', lockOnEnter('DIAMOND DUST')),
    watchDefeat: (s, c, key, self, dead, owner) => owner !== key && k.once(s, `${self}:aurora`) && (st => drain(st, key, 1, owner)), // Aurora Execution
  },
  'hades-v6-255': { // Gemini Saga
    enter: taxed(3, 'ANOTHER DIMENSION', (s, c, key, self) => st => {
      const t = enemy(st, c, key, 'ANOTHER DIMENSION');
      if (t && k.onField(st, key, self) && k.exile(st, c, t)) exiledBy(st)[self] = t;
    }),
    leaves: (s, c, key, self) => s.hadesExile?.[self] && (st => { // gancho leaves: "until Gemini Saga leaves the battlefield" por qualquer via
      const t = exiledBy(st)[self], owner = c.objects[t].owner;
      delete exiledBy(st)[self];
      if (st.players[owner].void.includes(t)) k.putOntoField(st, c, owner, t, 'void', {prepared: false}); // volta Unprepared e sem dano (autor, 30/10/2026)
    }),
    watchDefeat: onDefeat('other', (st, c, key) => lose(st, k.other(st, key), 2), 'galaxian'),
  },
  'hades-v6-256': {spell: {run: (s, c, key) => { // The Betrayal of the Gold Saints
    const picks = k.chooseUpTo(c, key, 'THE BETRAYAL OF THE GOLD SAINTS', inTartarus(s, c, key, goldSaint), 2, {text: 'Choose Gold Saint cards to return to your hand.'});
    lose(s, key, 2 * picks.filter(u => recall(s, c, key, u)).length);
    if (!s.victory) k.draw(s, key, 1);
  }}},
  'hades-v6-257': {spell: {run: (s, c, key) => { strip(s, c, key, 'THE TRIAL OF THE DEAD', () => true); lose(s, key, 2); }}},
  'hades-v6-258': {spell: {run: (s, c, key) => { // The Judgment of Minos
    const t = enemy(s, c, key, 'THE JUDGMENT OF MINOS');
    if (t) { // alvo que saiu do campo: só as partes dele não acontecem; o "Draw 1" não depende dele
      const n = k.devotees(s, c, key).some(u => k.hasType(c, u, 'Judge Specter')) ? 4 : 2; // 31/10/2026: sem Seal
      weaken(s, c, t, n, n);
    }
    k.draw(s, key, 1);
  }}},
  'hades-v6-259': {spell: {run: (s, c, key) => { // The Specters Invade Sanctuary
    const picks = k.chooseUpTo(c, key, 'THE SPECTERS INVADE SANCTUARY', returnable(s, c, key, specter(3)), 2, {text: 'Choose Specters to return to the battlefield.'});
    for (const u of picks) if (raise(s, c, key, u)) noStrike(s, u);
    lose(s, key, 3);
  }}},
  'hades-v6-260': {spell: {run: (s, c, key) => { // The Resurrection of the Fallen
    const u = toFieldFrom(s, c, key, 'THE RESURRECTION OF THE FALLEN', devCost(5));
    if (u && sacrificeOne(s, c, key, 'THE RESURRECTION OF THE FALLEN', u, true)) k.buff(s, u, 2, 2);
  }}},
  'hades-v6-261': {spell: {run: (s, c, key) => { // The Death of Pandora
    const v = sacrificeOne(s, c, key, 'THE DEATH OF PANDORA', null);
    k.draw(s, key, 3);
    lose(s, key, 3);
    if (v && !s.victory && /PANDORA, QUEEN/i.test(name(c, v))) k.search(s, c, key, 'THE DEATH OF PANDORA', () => true);
  }}},
  // The Destruction of the Gold Cloths. Interpretação: conta todo Equipment preso, inclusive Armor que já foi ao
  // Tartarus junto com o portador derrotado.
  'hades-v6-262': {spell: {run: (s, c, key) => {
    const t = enemy(s, c, key, 'THE DESTRUCTION OF THE GOLD CLOTHS');
    if (!t) return;
    const gear = k.gearOf(c, t), ctl = k.controllerOf(s, t);
    k.defeat(s, c, t);
    for (const g of gear) if (k.toTartarus(s, c, g, 'battlefield')) k.emit(s, 'destroyed', {uid: g, owner: c.objects[g].owner});
    lose(s, ctl, 2 * gear.length);
  }}},
  'hades-v6-263': {spell: {run: (s, c, key) => { // The Three Judges of Hell
    const judge = cd => /Judge Specter/.test(cd.type);
    if (k.search(s, c, key, 'THE THREE JUDGES OF HELL', judge)) k.search(s, c, key, 'THE THREE JUDGES OF HELL', judge);
    lose(s, key, 3);
    if (!s.victory && k.devotees(s, c, key).some(u => k.hasType(c, u, 'Judge Specter'))) k.draw(s, key, 1);
  }}},
  'hades-v6-264': {spell: {run: (s, c, key) => oppSacrifices(s, c, key, 'THE CURSE OF THE UNDERWORLD', 2, v => drain(s, key, 1, c.objects[v].owner))}},
  // The Possession of Shun (autor, 30/10/2026): troca de controle até o fim do Round = o Devotee muda de `battlefield`
  // (o controlador é quem tem o uid no campo; o dono continua em objects). No fim do Round, quem controla o sacrifica.
  // 31/10/2026: deixou de ser Threaten; reanima do Tartarus do oponente, sob o seu controle, Unprepared.
  'hades-v6-265': {spell: {run: (s, c, key) => {
    const foe = k.other(s, key), dead = s.players[foe].tartarus.filter(u => k.isDevotee(c, u) && !s.roundUses.has(`return:${u}`));
    const t = k.choose(c, key, 'THE POSSESSION OF SHUN', dead, {text: "Choose a Devotee in an opponent's Tartarus to return under your control."});
    if (t) raise(s, c, key, t);
    lose(s, key, 3);
  }}},
  'hades-v6-266': {spell: {run: (s, c, key) => { // The Fall of the Sanctuary
    const all = k.allDevotees(s, c), mine = all.filter(u => friendly(s, key, u)).length, theirs = all.length - mine;
    for (const u of all) k.defeat(s, c, u);
    lose(s, k.other(s, key), theirs);
    gain(s, key, mine);
  }}},
  'hades-v6-267': {spell: {targets: godOfFoe, run: (s, c, key) => { // The Sword That Pierces Athena
    lose(s, k.other(s, key), 5 + (controls(s, c, key, 'hades-v6-199') ? 3 : 0));
    if (!s.victory) payDraw(s, c, key, 'THE SWORD THAT PIERCES ATHENA', 3, 2);
  }}},
  'hades-v6-268': {spell: {run: (s, c, key) => { // The Eternal Sleep
    seal(s, c, k.enemies(s, c, key), 3, 'THE ETERNAL SLEEP');
    if (controls(s, c, key, 'hades-v6-191')) {
      const sealed = k.enemies(s, c, key).filter(u => s.units[u]?.seal > 0);
      for (const u of k.chooseUpTo(c, key, 'THE ETERNAL SLEEP', sealed, 2, {text: 'Choose Sealed enemy Devotees to defeat.'})) k.defeat(s, c, u);
    }
    k.draw(s, key, 2);
  }}},
  'hades-v6-269': {spell: {run: (s, c, key) => { // The Death of Thanatos
    for (const u of k.enemies(s, c, key)) { const owner = c.objects[u].owner; k.defeat(s, c, u); drain(s, key, 2, owner); }
    lose(s, key, 4);
  }}},
  'hades-v6-270': {spell: {run: (s, c, key) => { // The Greatest Eclipse
    const picks = k.chooseUpTo(c, key, 'THE GREATEST ECLIPSE', returnable(s, c, key, () => true), 3, {text: 'Choose Devotees to return to the battlefield.'});
    for (const u of picks) if (raise(s, c, key, u)) { noStrike(s, u); drain(s, key, 3); } // 31/10/2026: sem o sacrifício final
  }}},
};
