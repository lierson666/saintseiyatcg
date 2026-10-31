// Gods da engine 3.0: Soul, Soul máximo, Awaken dinâmico, Ultimate e Divine Judgment.
// Regras: textos D268 dos Gods, D200, D204, D205, D206, D218, D225, D228–D230 e o suplemento
// docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md (G3-xxx). Nada aqui vem da engine 2.2.
// Habilidades da Athena que mexem em Devotees (Divine Protection, Cosmo of Hope) ficam em effects.js e leem `state.divine`.
import {RuleError, NotSpecified, emit, hooks, assertIdle, pushTriggers, loseSoul, loseGame, destroyDevotee, spendBase, gainLatent, placeBase, addSeal, mill, draw, useOncePerRound} from './core.js';
import {card, controllerOf, isSaint, atkOf, forbidGodStrike} from './effects.js';
import {characterOf, IdentityGap} from '../../shared/character-identity.js';
import * as k from './v6/kit.js'; // ciclo gods↔kit é seguro: kit só usa gainSoul dentro de funções
import {contextOf} from './v6/registry.js';

const other = (state, key) => state.order.find(k => k !== key);

// Estado de cada God. `soulMax`: efeitos de Soul máximo em camadas (G3-009); `awakenAt` é independente dele (G3-008).
export function initGods(state, ctx) {
  state.divine = {};
  for (const key of state.order) {
    const god = ctx.cards.get(state.gods[key]);
    state.divine[key] = {god: state.gods[key], printedSoul: god.soul, maxEffects: [], awakenAt: god.awaken, awaken: false, ultimateUsed: false, judgment: null};
  }
  refreshAwaken(state);
}

// G3-009: valor impresso → efeitos que fixam valor (na ordem de criação) → somas → mínimo 1.
// Dois efeitos fixos sem precedência definida: lacuna, não um critério inventado.
export function computeSoulMax(printed, effects = []) {
  const fixed = effects.filter(e => e.set !== undefined);
  if (fixed.length > 1 && !fixed.every(e => Number.isInteger(e.order))) throw new NotSpecified('Soul máximo: dois efeitos fixos sem precedência');
  const base = fixed.length ? [...fixed].sort((a, b) => a.order - b.order).at(-1).set : printed;
  return Math.max(1, base + effects.reduce((n, e) => n + (e.add || 0), 0));
}
export const soulMax = (state, key) => computeSoulMax(state.divine[key].printedSoul, state.divine[key].maxEffects);

// G3-010: muda o Soul máximo; se o atual passar do novo máximo, desce junto, sem contar como dano nem perda.
export function addSoulMaxEffect(state, key, effect) {
  state.divine[key].maxEffects.push(effect);
  const max = soulMax(state, key), p = state.players[key];
  if (p.soul > max) { p.soul = max; emit(state, 'soul_adjusted', {player: key, soul: max, max}); }
  emit(state, 'soul_max_changed', {player: key, max});
}

// G3-011: recuperação para no máximo efetivo; o excedente se perde.
export function gainSoul(state, key, n) {
  const p = state.players[key], gained = Math.max(0, Math.min(n, soulMax(state, key) - p.soul));
  p.soul += gained;
  emit(state, 'soul_gained', {player: key, amount: gained, requested: n, soul: p.soul});
  return gained;
}

// G3-004: Awaken liga com Soul ≤ limite e desliga acima dele, sem custo nem ação. Reavaliado só em checkpoints
// (entre resoluções completas e nas passagens de turno), nunca no meio de uma resolução.
export function refreshAwaken(state) {
  for (const key of state.order) {
    const d = state.divine?.[key];
    if (!d || d.awakenAt == null) continue;
    const now = state.players[key].soul <= d.awakenAt;
    if (now !== d.awaken) { d.awaken = now; emit(state, 'awaken_changed', {player: key, awaken: now, soul: state.players[key].soul, at: d.awakenAt}); }
  }
}
hooks.checkpoint.push(refreshAwaken);

// G3-014: custo misto (Base preparada, Latent, Soul) validado inteiro antes de pagar; pagamento atômico.
// Soul pode ser pago mesmo se for letal; Soul 0 encerra a partida na hora (D52).
export function payMixed(state, key, {base = 0, latent = 0, soul = 0}) {
  const p = state.players[key];
  if (p.bases.filter(b => b.prepared).length < base) throw new RuleError('custo', `Bases preparadas insuficientes (${base})`);
  if (p.latent < latent) throw new RuleError('custo', `Latent insuficiente (${latent})`);
  if (soul > p.soul) throw new RuleError('custo', `Soul insuficiente (${soul})`);
  spendBase(state, key, base);
  if (latent) { p.latent -= latent; emit(state, 'cosmo_spent', {player: key, unit: 'latent', amount: latent}); }
  if (soul) loseSoul(state, {[key]: soul}, 'payment');
  return !state.victory;
}

// ---------- Athena Exclamation (Ultimate) ----------
// Identidade de personagem (G3-029): personagem canônico pela tabela explícita, não o nome nem o ID da carta.
// `ctx.identities`: tabela extra (reimpressão aprovada ou fixture rotulada). Sem identidade confirmada: IdentityGap.
const identity = (ctx, uid) => characterOf(ctx.objects[uid].cardId, ctx.identities);
const saintClass = (ctx, uid) => (/Gold Saint/.test(card(ctx, uid).type) ? 'Gold' : /Silver Saint/.test(card(ctx, uid).type) ? 'Silver' : /Bronze Saint/.test(card(ctx, uid).type) ? 'Bronze' : null);
const EXTRA = {Bronze: 3, Silver: 2, Gold: 0}; // D229

function validSaints(state, ctx, key, saints) {
  return saints.length === 3 && new Set(saints).size === 3
    && saints.every(uid => controllerOf(state, uid) === key && isSaint(ctx, uid) && state.units[uid]?.prepared)
    && new Set(saints.map(uid => identity(ctx, uid))).size === 3;
}
export const exclamationCost = (ctx, saints) => 5 + saints.reduce((n, uid) => n + (EXTRA[saintClass(ctx, uid)] ?? 0), 0);

// Pode anunciar? Devolve null ou o motivo (para a interface). Não gasta nada.
export function ultimateBlock(state, ctx, key, saints) {
  const d = state.divine[key];
  if (state.victory) return 'D52';
  if (d.god !== 'god-athena') return 'only-athena';
  if (d.ultimateUsed) return 'used';
  if (state.active !== key || state.window || state.chain.length) return 'sorcery';
  if (saints) {
    try { if (!validSaints(state, ctx, key, saints)) return 'saints'; } catch (e) { if (e instanceof IdentityGap) return 'identity'; throw e; }
  }
  if (saints && state.players[key].bases.filter(b => b.prepared).length < exclamationCost(ctx, saints)) return 'cost';
  return null;
}

// G3-005/006 + D229: anúncio na fase de ações do próprio turno, cadeia vazia; escolhe os 3 Saints e paga tudo
// (Base preparada, decisão do autor de 28/10/2026). Anúncio ilegal não gasta nada nem consome o uso.
// O uso é consumido no anúncio legal; anulação ou falha depois não devolve uso nem custo.
export function announceExclamation(state, ctx, key, saints) {
  const why = ultimateBlock(state, ctx, key, saints);
  if (why) throw new RuleError('G3-005', `Athena Exclamation indisponível: ${why}`);
  assertIdle(state);
  const cost = exclamationCost(ctx, saints);
  spendBase(state, key, cost);
  state.divine[key].ultimateUsed = true;
  emit(state, 'ultimate_announced', {player: key, ability: 'ATHENA EXCLAMATION', cost, saints: [...saints]});
  pushTriggers(state, [{controller: key, uid: `ultimate:${key}`, ability: 'ATHENA EXCLAMATION', run: st => resolveExclamation(st, ctx, key, saints)}]);
}

function resolveExclamation(state, ctx, key, saints) {
  const enemy = other(state, key);
  // D230: os mesmos 3 objetos, ainda Saints Prepared do jogador e com identidades distintas; senão nada acontece.
  if (!validSaints(state, ctx, key, saints)) { emit(state, 'ultimate_failed', {player: key, ability: 'ATHENA EXCLAMATION'}); return; }
  // D228: ATTACK efetivo de todos, no mesmo instante, logo antes da Defeat.
  const snapshot = saints.map(uid => ({uid, atk: atkOf(state, ctx, uid), gold: saintClass(ctx, uid) === 'Gold'}));
  for (const {uid} of snapshot) destroyDevotee(state, uid, ctx.objects, ctx.attached); // D205: Defeat que não pode ser prevenida
  const loss = snapshot.reduce((n, s) => n + s.atk + (s.gold ? 3 : 0), 0);
  emit(state, 'ultimate_resolved', {player: key, ability: 'ATHENA EXCLAMATION', snapshot, loss});
  if (loseSoul(state, {[enemy]: loss}, 'loss')) return;
  placeJudgment(state, key, enemy);
}

// D218: no máximo um contador por God; sem renovar prazo. Prazo: checkpoint de fim do Round seguinte (D204).
function placeJudgment(state, source, target) {
  const d = state.divine[target];
  if (d.judgment) return;
  d.judgment = {id: `dj-${state.events.length + 1}`, source, deadline: state.round + 1};
  emit(state, 'judgment_placed', {player: target, source, deadline: d.judgment.deadline, id: d.judgment.id});
}

// Prazo vencido vira gatilho do checkpoint de fim de Round; só o mesmo contador ainda presente derrota (D218).
hooks.roundEnd.push(state => state.order.flatMap(key => {
  const j = state.divine?.[key]?.judgment;
  if (!j || j.deadline !== state.round) return [];
  return [{controller: j.source, uid: `judgment:${j.id}`, ability: 'DIVINE JUDGMENT', run: st => {
    if (st.divine[key].judgment?.id === j.id) loseGame(st, key, 'divine_judgment');
  }}];
}));

// D206: ação de velocidade Sorcery do controlador do God marcado; custo: sacrificar exatamente 3 Devotees seus ao mesmo
// tempo. Entra na cadeia; se o mesmo contador ainda estiver lá na resolução, sai. Sem reembolso.
export function removeJudgment(state, ctx, key, devotees) {
  const j = state.divine[key].judgment;
  if (!j) throw new RuleError('D206', 'não há Divine Judgment neste God');
  if (state.active !== key) throw new RuleError('D206', 'só no próprio turno');
  assertIdle(state);
  if (devotees.length !== 3 || new Set(devotees).size !== 3 || !devotees.every(uid => controllerOf(state, uid) === key && card(ctx, uid).kind === 'Devotee')) {
    throw new RuleError('D206', 'sacrifique exatamente 3 Devotees seus');
  }
  for (const uid of devotees) destroyDevotee(state, uid, ctx.objects, ctx.attached);
  emit(state, 'judgment_removal', {player: key, sacrificed: [...devotees], id: j.id});
  pushTriggers(state, [{controller: key, uid: `judgment-removal:${j.id}`, ability: 'DIVINE JUDGMENT', run: st => {
    if (st.divine[key].judgment?.id === j.id) { st.divine[key].judgment = null; emit(st, 'judgment_removed', {player: key, id: j.id}); }
  }}]);
}

// ---------- Poseidon ----------
// Textos D268 (correntes D198): Water Prison, Pressure of the Deep (Awaken 4), Great Flood (Ultimate, 8 Cosmo).
// G3-032: "Seal that Devotee" põe exatamente 1 marcador Seal; aplicações sucessivas acumulam (D211).
export const SEAL_THAT_DEVOTEE = 1;
const poseidons = state => state.order.filter(k => state.divine?.[k]?.god === 'god-poseidon');
const ask = (ctx, player, question) => Boolean(ctx.decide?.(player, question));

// Water Prison (D198, D212, D263, D268): Strike legal declarado por Devotee inimigo (inimigo na declaração, D263) gera a
// oportunidade enquanto o uso do Round estiver livre. Recusar não paga, não sela e não gasta o uso; pagar 2 Latent
// gasta o uso mesmo se o Seal não acontecer. O Seal não cancela o Strike (D212).
hooks.strikeDeclared.push((state, ctx, attacker, controller) => poseidons(state)
  .filter(key => key !== controller && !state.roundUses.has(`god:${key}:water-prison`))
  .map(key => {
    // Water Prison sobre atacante já Sealed: soma +1 Seal (autor, 30/10/2026).
    return {controller: key, uid: `water-prison:${attacker}`, ability: 'WATER PRISON', run: st => {
      const once = `god:${key}:water-prison`;
      if (st.roundUses.has(once) || st.players[key].latent < 2) return;
      if (!ask(ctx, key, {ability: 'WATER PRISON', uid: attacker, cost: {latent: 2}})) {
        emit(st, 'divine_power_declined', {player: key, ability: 'WATER PRISON', uid: attacker});
        return;
      }
      st.players[key].latent -= 2;
      emit(st, 'cosmo_spent', {player: key, unit: 'latent', amount: 2});
      useOncePerRound(st, once);
      emit(st, 'divine_power', {player: key, ability: 'WATER PRISON', uid: attacker});
      if (!st.units[attacker]) { emit(st, 'seal_failed', {uid: attacker, source: 'WATER PRISON'}); return; }
      addSeal(st, ctx, [attacker], SEAL_THAT_DEVOTEE, 'WATER PRISON');
    }};
  }));

// Pressure of the Deep (D211, D233, D234, D264–D267): um gatilho por Devotee que passou de 0 para ≥1 Seal e era inimigo
// de Poseidon nesse instante, com Awaken ativo. Grava quem controlava o Devotee (quem faz o Mill 2, D265); o gatilho
// continua se o Devotee sair do campo (D266). Mill = min(2, deck) sem Fatigue (D233); a compra independe do Mill (D234).
hooks.sealed.push((state, ctx, transitions) => poseidons(state)
  .filter(key => state.divine[key].awaken)
  .flatMap(key => transitions.filter(t => t.controller && t.controller !== key).map(({uid, controller}) => (
    {controller: key, uid: `pressure:${uid}`, ability: 'PRESSURE OF THE DEEP', millPlayer: controller, run: st => {
      emit(st, 'divine_power', {player: key, ability: 'PRESSURE OF THE DEEP', uid, millPlayer: controller});
      mill(st, controller, 2);
      draw(st, key, 1);
    }}))));

// Great Flood (Ultimate): G3-005/006 (Sorcery, uma por partida, uso gasto no anúncio legal); custo 8 em Base preparada (G3-023).
export const GREAT_FLOOD_COST = 8;
export function greatFloodBlock(state, key) {
  const d = state.divine[key];
  if (state.victory) return 'D52';
  if (d.god !== 'god-poseidon') return 'only-poseidon';
  if (d.ultimateUsed) return 'used';
  if (state.active !== key || state.window || state.chain.length) return 'sorcery';
  if (state.players[key].bases.filter(b => b.prepared).length < GREAT_FLOOD_COST) return 'cost';
  return null;
}
export function announceGreatFlood(state, ctx, key) {
  const why = greatFloodBlock(state, key);
  if (why) throw new RuleError('G3-005', `Great Flood indisponível: ${why}`);
  spendBase(state, key, GREAT_FLOOD_COST);
  state.divine[key].ultimateUsed = true;
  emit(state, 'ultimate_announced', {player: key, ability: 'GREAT FLOOD', cost: GREAT_FLOOD_COST});
  pushTriggers(state, [{controller: key, uid: `ultimate:${key}`, ability: 'GREAT FLOOD', run: st => resolveGreatFlood(st, ctx, key)}]);
}

// Escolha de quem decide (D231; descarte pela G3-034): `ctx.decide` devolve a escolha; fora das opções legais é erro,
// não palpite. No timeout, a interface responde com `timeoutAutoChoice` (G3-030).
function choose(ctx, player, question, options, count) {
  const picked = count === 1 ? [ctx.decide?.(player, {...question, options})] : ctx.decide?.(player, {...question, options, count});
  if (!Array.isArray(picked) || picked.length !== count || new Set(picked).size !== count || !picked.every(o => options.includes(o))) {
    throw new RuleError(question.decision, `${player} precisa escolher ${count} entre ${options.length}`);
  }
  return picked;
}

function resolveGreatFlood(state, ctx, key) {
  for (const enemy of state.order.filter(k => k !== key)) {
    const p = state.players[enemy];
    // D207: Devotees e Equipment inimigos (inclusive Armor presa) voltam juntos, cada um para a mão do Owner.
    const moving = p.battlefield.filter(uid => ['Devotee', 'Equipment'].includes(card(ctx, uid).kind));
    const returnedDevotees = moving.filter(uid => card(ctx, uid).kind === 'Devotee');
    for (const uid of moving) {
      p.battlefield = p.battlefield.filter(x => x !== uid);
      state.players[ctx.objects[uid].owner].hand.push(uid);
      delete state.units[uid];
      delete ctx.attached[uid];
      state.effects = state.effects.filter(e => e.target !== uid);
    }
    for (const e of Object.keys(ctx.attached)) if (moving.includes(ctx.attached[e])) delete ctx.attached[e];
    emit(state, 'returned_to_hand', {ability: 'GREAT FLOOD', uids: [...moving]});
    // D207/D231/D253: para cada Devotee devolvido, uma Base controlada pelo Owner dele, escolhida por quem a controla.
    for (const uid of returnedDevotees) {
      const owner = ctx.objects[uid].owner, bases = state.players[owner].bases.map(b => b.uid);
      if (!bases.length) continue;
      const [base] = choose(ctx, owner, {ability: 'GREAT FLOOD', decision: 'D231', choose: 'base', for: uid}, bases, 1);
      state.players[owner].bases = state.players[owner].bases.filter(b => b.uid !== base);
      state.players[ctx.objects[base].owner].hand.push(base);
      emit(state, 'base_returned', {player: owner, uid: base});
    }
    // D232: metade da mão atual, para cima; Mill 3 por carta descartada de fato. G3-034: quem descarta escolhe.
    const need = Math.ceil(p.hand.length / 2);
    const discarded = need ? choose(ctx, enemy, {ability: 'GREAT FLOOD', decision: 'D232', choose: 'discard', player: enemy}, [...p.hand], need) : [];
    p.hand = p.hand.filter(uid => !discarded.includes(uid));
    p.tartarus.push(...discarded);
    emit(state, 'discarded', {player: enemy, uids: discarded});
    mill(state, enemy, 3 * discarded.length);
  }
  emit(state, 'ultimate_resolved', {player: key, ability: 'GREAT FLOOD'});
}

// ========== Hades, Ares, Artemis ==========
// Textos D268 (God cards do canon; card-forge/art-web/cards.json diverge em pontos: ver docs/v6-efeitos-pendencias.md).
// A engine não tem ganchos globais de "Devotee destruído", "retorno do Tartarus", "kill em Strike" nem "ganho de Latent".
// Em vez de editar core/effects, o `scanGods` lê o log de eventos no checkpoint (depois de cada resolução completa)
// e cria os gatilhos na cadeia. // pendente: ganchos nativos no instante exato do evento (hoje o gatilho nasce no checkpoint).
const byGod = (state, god) => state.order.filter(key => state.divine?.[key]?.god === god);
const isDevoteeUid = (ctx, uid) => ctx.cards.get(ctx.objects[uid]?.cardId)?.kind === 'Devotee';
const baseCost = (state, key, n) => state.players[key].bases.filter(b => b.prepared).length >= n;

// Ultimate comum: Sorcery do dono, uma por partida, custo em Base preparada (G3-005/006/023), uso gasto no anúncio legal.
function ultimateBlockOf(state, key, god, cost) {
  const d = state.divine[key];
  if (state.victory) return 'D52';
  if (d.god !== god) return `only-${god.slice(4)}`;
  if (d.ultimateUsed) return 'used';
  if (state.active !== key || state.window || state.chain.length) return 'sorcery';
  if (!baseCost(state, key, cost)) return 'cost';
  return null;
}
function announceUltimate(state, ctx, key, god, ability, cost, resolve) {
  const why = ultimateBlockOf(state, key, god, cost);
  if (why) throw new RuleError('G3-005', `${ability} indisponível: ${why}`);
  spendBase(state, key, cost);
  state.divine[key].ultimateUsed = true;
  emit(state, 'ultimate_announced', {player: key, ability, cost});
  pushTriggers(state, [{controller: key, uid: `ultimate:${key}`, ability, run: st => resolve(st, ctx, key)}]);
}

// ---------- Hades ----------
export const GREAT_ECLIPSE_COST = 7;
export const greatEclipseBlock = (state, key) => ultimateBlockOf(state, key, 'god-hades', GREAT_ECLIPSE_COST);
export const announceGreatEclipse = (state, ctx, key) => announceUltimate(state, ctx, key, 'god-hades', 'GREAT ECLIPSE', GREAT_ECLIPSE_COST, resolveGreatEclipse);

function resolveGreatEclipse(state, ctx, key) {
  const enemy = other(state, key);
  const options = state.players[key].tartarus.filter(uid => ctx.objects[uid]?.owner === key && isDevoteeUid(ctx, uid));
  const picked = k.chooseUpTo(ctx, key, 'GREAT ECLIPSE', options, 3, {text: 'Choose up to three Devotees from your Tartarus.'});
  // Entram Unprepared e perdem Impulse (`entered` nulo: o Strike só vale com Impulse no turno de entrada).
  const returned = picked.filter(uid => k.putOntoField(state, ctx, key, uid, 'tartarus', {prepared: false}));
  for (const uid of returned) if (state.units[uid]) state.units[uid].entered = null;
  let lost = 0;
  if (returned.length) {
    const before = state.players[enemy].soul;
    if (loseSoul(state, {[enemy]: 2 * returned.length}, 'loss')) return;
    lost = before - state.players[enemy].soul; // Soul realmente perdido (nunca abaixo de 0)
    gainSoul(state, key, Math.ceil(lost / 2));
  }
  emit(state, 'ultimate_resolved', {player: key, ability: 'GREAT ECLIPSE', returned, lost});
}

// ---------- Ares ----------
export const BLOODLUST_COST = 3, OBLITERATION_COST = 6;
export const obliterationBlock = (state, key) => ultimateBlockOf(state, key, 'god-ares', OBLITERATION_COST);
export const announceObliteration = (state, ctx, key) => announceUltimate(state, ctx, key, 'god-ares', 'OBLITERATION', OBLITERATION_COST, resolveObliteration);

function resolveObliteration(state, ctx, key) {
  const mine = k.devotees(state, ctx, key);
  for (const uid of mine) {
    k.prepare(state, uid);
    k.buff(state, uid, 3, 0, 'this_round', ['Pierce', 'Long Range', 'Impulse']);
  }
  state.divine[key].obliteration = state.round; // vale no Round do anúncio; ver gatilho "completes a Strike" em scanGods
  emit(state, 'ultimate_resolved', {player: key, ability: 'OBLITERATION', devotees: [...mine]});
}

// Bloodlust: Divine Power ativado (Sorcery). "Cost: 3 Cosmo" = Base preparada ou Latent (autor, 29/10/2026);
// paga primeiro com Base preparada e completa com Latent. Uma vez por Round.
const bloodlustSplit = (state, key) => { const base = Math.min(BLOODLUST_COST, state.players[key].bases.filter(b => b.prepared).length); return {base, latent: BLOODLUST_COST - base}; };
export function bloodlustBlock(state, ctx, key, uid) {
  if (state.victory) return 'D52';
  if (state.divine[key].god !== 'god-ares') return 'only-ares';
  if (state.active !== key || state.window || state.chain.length) return 'sorcery';
  if (state.roundUses.has(`god:${key}:bloodlust`)) return 'used';
  if (state.players[key].latent < bloodlustSplit(state, key).latent) return 'cost';
  if (uid !== undefined && !(k.onField(state, key, uid) && isDevoteeUid(ctx, uid))) return 'target';
  if (uid === undefined && !k.devotees(state, ctx, key).length) return 'target';
  return null;
}
export function activateBloodlust(state, ctx, key, uid) {
  const why = bloodlustBlock(state, ctx, key, uid);
  if (why) throw new RuleError('G3-005', `Bloodlust indisponível: ${why}`);
  payMixed(state, key, bloodlustSplit(state, key));
  useOncePerRound(state, `god:${key}:bloodlust`);
  emit(state, 'divine_power', {player: key, ability: 'BLOODLUST', uid});
  pushTriggers(state, [{controller: key, uid: `bloodlust:${uid}`, ability: 'BLOODLUST', run: st => {
    if (!k.onField(st, key, uid)) return;
    k.prepare(st, uid);
    k.buff(st, uid, 1, 0, 'this_round');
    forbidGodStrike(st, uid); // autor, 29/10/2026: não pode mirar God nesta rodada
  }}]);
}

// ---------- Artemis ----------
// Moon Harvest: no lugar do `placeBase` normal para carta não Cosmoble. Uma vez por Round; perde 2 Soul se usar.
export function moonHarvestBlock(state, ctx, key, uid) {
  if (state.victory) return 'D52';
  if (state.divine[key].god !== 'god-artemis') return 'only-artemis';
  if (state.roundUses.has(`god:${key}:moon-harvest`)) return 'used';
  if (!state.players[key].hand.includes(uid)) return 'hand';
  if (card(ctx, uid).cosmoble) return 'cosmoble'; // já é Cosmoble: use placeBase normal, sem custo
  return null;
}
export function placeBaseMoonHarvest(state, ctx, key, uid) {
  const why = moonHarvestBlock(state, ctx, key, uid);
  if (why) throw new RuleError('G3-005', `Moon Harvest indisponível: ${why}`);
  placeBase(state, key, uid, {...card(ctx, uid), cosmoble: true}); // valida turno, cadeia vazia e 1 Base por turno antes de gastar o uso
  useOncePerRound(state, `god:${key}:moon-harvest`);
  emit(state, 'divine_power', {player: key, ability: 'MOON HARVEST', uid});
  loseSoul(state, {[key]: 2}, 'loss');
}
// Moon Awakening (Ultimate, custo 9; D209, D214–D216, D223; autor 30/10/2026: implementar como o D268).
// Na resolução escolhe até 5 Bases suas; viram Moon Spirit 3/3 com Impulse, Long Range e Pierce até o fim do Round
// (saem de `bases`, não geram Cosmo, entram Prepared — autor, 30/10/2026, desvio do D268; objects[uid].moon guarda a carta real).
// Strike: God não causa dano de retaliação a Moon Spirit; dano dela ao God inimigo tira +2 Soul (strike.js).
// Derrotada vai ao Tartarus do dono como a carta real (D209); no fim do Round, a que segue em campo volta a ser Base Unprepared.
export const MOON_AWAKENING_COST = 9, MOON_SPIRIT = 'artemis-token-moon-spirit';
export const moonAwakeningBlock = (state, key) => ultimateBlockOf(state, key, 'god-artemis', MOON_AWAKENING_COST);
export const announceMoonAwakening = (state, ctx, key) => announceUltimate(state, ctx, key, 'god-artemis', 'MOON AWAKENING', MOON_AWAKENING_COST, resolveMoonAwakening);
function resolveMoonAwakening(state, ctx, key) {
  const p = state.players[key];
  if (!ctx.cards.has(MOON_SPIRIT)) ctx.cards.set(MOON_SPIRIT, {id: MOON_SPIRIT, name: 'Moon Spirit', kind: 'Devotee', type: 'Devotee — Moon Spirit',
    cost: {amount: 0, unit: 'base'}, atk: 3, hp: 3, keywords: ['Impulse', 'Long Range', 'Pierce']});
  const picked = k.chooseUpTo(ctx, key, 'MOON AWAKENING', p.bases.map(b => b.uid), 5, {text: 'Choose up to five Cosmo Bases to awaken as Moon Spirits.'});
  for (const uid of picked) {
    const base = p.bases.find(b => b.uid === uid);
    if (!base) continue;
    p.bases.splice(p.bases.indexOf(base), 1);
    ctx.objects[uid].moon = {cardId: ctx.objects[uid].cardId, round: state.round};
    ctx.objects[uid].cardId = MOON_SPIRIT;
    p.battlefield.push(uid);
    state.units[uid] = {prepared: true, damage: 0, entered: state.turn};
    emit(state, 'moon_awakened', {player: key, uid});
  }
}
hooks.roundEnd.push(state => {
  const ctx = contextOf(state);
  if (!ctx) return [];
  for (const key of state.order) for (const uid of [...state.players[key].battlefield]) {
    const moon = ctx.objects[uid]?.moon;
    if (!moon) continue;
    const p = state.players[key];
    p.battlefield.splice(p.battlefield.indexOf(uid), 1);
    for (const g of Object.keys(ctx.attached)) if (ctx.attached[g] === uid) delete ctx.attached[g];
    delete state.units[uid];
    state.effects = state.effects.filter(e => e.target !== uid);
    ctx.objects[uid].cardId = moon.cardId;
    delete ctx.objects[uid].moon;
    state.players[ctx.objects[uid].owner].bases.push({uid, prepared: false});
    emit(state, 'moon_reverted', {player: key, uid});
  }
  return [];
});

// ---------- Leitura do log: gatilhos dos três Gods ----------
function scanGods(state) {
  const ctx = contextOf(state);
  if (!ctx || state.victory) return;
  const events = state.events.slice(state.godScan ?? 0);
  state.godScan = state.events.length;
  if (!events.length) return;
  const triggers = [];
  const gone = events.filter(e => (e.type === 'destroyed' || e.type === 'sacrificed') && ctx.objects[e.uid] && isDevoteeUid(ctx, e.uid));

  // Offering of Life: um gatilho por Devotee SEU derrotado (autor, 30/10/2026); o uso é do Round; recusar não gasta.
  for (const key of byGod(state, 'god-hades')) {
    const mine = gone.filter(e => ctx.objects[e.uid].owner === key); // shortcut: dono, não controlador; trocar quando houver troca de controle
    const once = `god:${key}:offering`;
    for (const {uid: first} of mine) {
      triggers.push({controller: key, uid: `offering:${first}`, ability: 'OFFERING OF LIFE', run: st => {
        if (st.victory || st.roundUses.has(once) || st.players[key].soul < 1) return;
        if (!ask(ctx, key, {ability: 'OFFERING OF LIFE', uid: first, cost: {soul: 2}})) { emit(st, 'divine_power_declined', {player: key, ability: 'OFFERING OF LIFE', uid: first}); return; }
        useOncePerRound(st, once);
        emit(st, 'divine_power', {player: key, ability: 'OFFERING OF LIFE', uid: first});
        if (loseSoul(st, {[key]: 2}, 'loss')) return;
        draw(st, key, 1);
        gainLatent(st, key, 1);
      }});
    }
    // King of Tartarus (Awaken): um gatilho por Devotee que voltou do próprio Tartarus.
    if (state.divine[key].awaken) for (const e of events.filter(e => e.type === 'card_played' && e.from === 'tartarus' && e.player === key && e.kind === 'Devotee')) {
      triggers.push({controller: key, uid: `king:${e.uid}`, ability: 'KING OF TARTARUS', run: st => {
        if (st.victory) return;
        emit(st, 'divine_power', {player: key, ability: 'KING OF TARTARUS', uid: e.uid});
        if (loseSoul(st, {[other(st, key)]: 1}, 'loss')) return;
        gainSoul(st, key, 1);
      }});
    }
  }

  // Ares: Butchery (kill em Strike) e Obliteration (destruir quem completa Strike).
  const ares = byGod(state, 'god-ares');
  if (ares.length) {
    let strike = null;
    for (const e of events) {
      if (['window_close', 'resolve', 'chain_add', 'end_phase'].includes(e.type)) strike = null;
      else if (e.type === 'strike_resolve') {
        strike = e;
        const key = e.player;
        if (ares.includes(key) && state.divine[key].obliteration === e.round) {
          triggers.push({controller: key, uid: `obliteration:${e.attacker}`, ability: 'OBLITERATION', run: st => {
            if (st.victory || !k.onField(st, key, e.attacker)) return;
            k.defeat(st, ctx, e.attacker); // D205: derrota que não pode ser prevenida (k.defeat ignora prevenção)
          }});
        }
      } else if (strike && e.type === 'destroyed' && strike.target?.kind === 'devotee' && (e.uid === strike.target.uid || e.uid === strike.attacker) && isDevoteeUid(ctx, e.uid)) {
        const killerSide = e.uid === strike.target.uid ? strike.player : other(state, strike.player);
        if (ares.includes(killerSide) && state.divine[killerSide].awaken) {
          triggers.push({controller: killerSide, uid: `butchery:${e.uid}`, ability: 'BUTCHERY', run: st => {
            if (st.victory) return;
            emit(st, 'divine_power', {player: killerSide, ability: 'BUTCHERY', uid: e.uid});
            loseSoul(st, {[other(st, killerSide)]: 1}, 'loss');
          }});
        }
      }
    }
  }

  // Artemis, Moonlight Blessing (Awaken): +1 Latent no primeiro ganho do Round (imediato, é substituição; teto 3 em gainLatent).
  for (const key of byGod(state, 'god-artemis')) {
    if (!state.divine[key].awaken || state.roundUses.has(`god:${key}:moonlight`)) continue;
    if (events.some(e => e.type === 'latent_gained' && e.player === key)) {
      useOncePerRound(state, `god:${key}:moonlight`);
      emit(state, 'divine_power', {player: key, ability: 'MOONLIGHT BLESSING'});
      gainLatent(state, key, 1);
    }
  }
  pushTriggers(state, triggers);
}
hooks.checkpoint.push(scanGods);
