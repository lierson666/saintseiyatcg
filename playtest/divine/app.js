// Divine Arena · interface do vertical slice (engine 3.0). HTML para tudo que se lê e se clica; WebGL atrás.
// Fluxo de cada ação: engine muda o estado e registra eventos -> orquestrador dramatiza com o DOM anterior ->
// render() mostra o estado final. Entrada travada durante a animação (Espaço pula).
import {loadCanon} from '../../shared/canon-cards.js';
import {canonIndex} from '../../shared/deck-v3.js';
import {addPreviewCards} from '../../shared/preview-cards.js';
import {abilityText, displayCard} from '../../shared/card-i18n.js';
import {createMatch, mulligan} from '../engine-v3/match.js';
import {createCoin3D, COIN_TOSS_MS} from './coin3d.js';
import {startTurn, endTurn, pass, placeBase, spellCategory, runCheckpoint, ownBatch, loseGame} from '../engine-v3/core.js';
import {inlineMarkup} from '../../shared/card-text.js?v=20261031-kw1';
import {declareStrike, strikeTargets, mustStrike} from '../engine-v3/strike.js';
import {playDevotee, playEquipment, playSpell, activate, reequip, duplicateCharacter, resonant, castCost, mixed, castHidden, afterlifeBlock, activateAfterlife} from '../engine-v3/play.js';
import {AFTERLIFE} from '../engine-v3/v6/afterlife.js';
import {atkOf, hpOf, keywordsOf, gearOf, isSaint, isBronze, ABILITIES, modsOf} from '../engine-v3/effects.js';
import {v6Spell, entryOf, V6} from '../engine-v3/v6/hooks.js';
import {domainEntry, resonanceTag} from '../engine-v3/v6/registry.js';
import {STEPS, ABILITY_STEPS} from '../choices-v3.js?v=3';
import {createScene, THEMES} from './scene.js?v=20261101-tab1';
import {soulMax, ultimateBlock, announceExclamation, exclamationCost, removeJudgment, greatFloodBlock, announceGreatFlood, GREAT_FLOOD_COST,
  greatEclipseBlock, GREAT_ECLIPSE_COST, obliterationBlock, OBLITERATION_COST, bloodlustBlock, BLOODLUST_COST, commandBlock, commandTargets, activateCommand, COMMANDS, moonHarvestBlock, moonAwakeningBlock, MOON_AWAKENING_COST} from '../engine-v3/gods.js';
import {createClock, clockStartTurn, clockEndTurn, clockHandTo, clockPause, clockResume, clockRemaining, clockExpired, torchesLit, applyTimeout, clockBonus} from '../engine-v3/clock.js';
import {runDecisions, resume, restore, PendingDecision} from '../engine-v3/decision.js';
import {applyAction, advance as advanceMatch} from '../engine-v3/actions.js';
import {createDirector} from './director.js?v=20';
import {createAI} from './ai.js?v=14';
import {findDeck} from '../deck-store.js';
import {rankAfterMatch, mountNameplates} from '../rank.js?v=20261031-face3';
import {unlock, playMusic} from '../audio.js?v=20261030-telas';
import {telas, anim, sound, imageUrl, applyColors, applyTexts} from '../telas.js?v=20261030-1';
import {renderLiveCard, renderCardText} from '../../shared/live-card.js?v=20261101-tab1';
import {armorBonusText, printedEquipmentBonuses} from '../../shared/card-visual-values.js?v=20261031-kw1';
import {lightArt} from '../../shared/light-art.js';
import {useGodPortraits} from '../avatar-face.js?v=20261031-3';
import {mountChatDock} from '../chat-dock.js?v=20261101-notch1';
import {Idiomorph} from './vendor/idiomorph-0.7.4.esm.js';

const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const stage = $('#stage'), boardRoot = $('#board-root'), overlayRoot = $('#overlay-root'), notice = $('#notice');

const GOD_ART = {'god-athena': '../../CARDS/ATHENA/ATHENA.png', 'god-poseidon': '../../CARDS/POSEIDON/POSEIDON.png'};

// Mensagens da engine (internas, em português) viram texto curto para o jogador.
const WHY = {'G3-005': 'Athena Exclamation needs three Prepared Saints with different identities and enough prepared Bases.', D206: 'Sacrifice exactly three of your Devotees, on your turn.', D1: "It's not your turn.", D4: 'Not enough prepared Cosmo Bases.', custo: 'Not enough Latent Cosmo.', P06: 'Wait for the response window to close.',
  P05: 'A Guardian must be your target.', D22: 'This Devotee already struck this turn.', P04: 'Only a Prepared Devotee can Strike.',
  D52: 'The match is over.', '§63': 'Choose which version of that character to keep.', P01: 'Finish the mulligan first.', D192: 'It must be Prepared to use {T}.', D191: 'Already used this round.', Equip: 'That Devotee cannot wear it.', alvo: 'Choose a legal target.'};
const why = e => WHY[e.decision] || (e.topic ? `Not in Alpha 0.1: ${e.topic}` : "That can't be done right now.");

const SETTINGS_KEY = 'ssTcgOlympusArena';
const settings = {quality: 'high', theme: 'olympus', godB: 'god-athena', timeouts: false, speed: 'normal', skipDraws: false, reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  reduceFlashes: false, shake: 1, hideOpponent: true, showActivity: true, autoPass: true, castGrace: true, phaseTips: true, ai: 'B', aiLevel: 'normal', cardText: '1.0', cardSize: '1.0'};
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* sem armazenamento */ }
if (matchMedia('(pointer: coarse)').matches) settings.quality = 'phone'; // toque: cena leve, sempre
settings.timeouts = true; // relógio do Arena sempre vale (autor, 31/10/2026); só ?timeouts=0 desliga, para QA
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* sem armazenamento */ } };

let canon, cards, index, decks, match, ctx, scene = null, director, clock;
let mode = null;           // escolha em andamento: {kind, key, uid, steps, i, choice, picked, options, run}
let pending = null;        // decisão pedida pela engine no meio da resolução (decision.js): {pending, snap, answers, run, shown, picked, peek}
let marked = new Set(), logLines = [], logOpen = false, settingsOpen = false, toolsOpen = false, inspectTimer, seenEvents = 0, drag = null;
let casting = null;        // carta jogada da mão que ainda espera alvo (fica travada no slot de conjuração)

const S = () => match.state;
// Carta escondida (duelo online: mão e Bases do adversário, decks): o servidor não manda qual é.
const HIDDEN_CARD = {name: 'a face-down card', kind: 'Hidden', type: 'Hidden', keywords: []};
const info = uid => (ctx.objects[uid] ? cards.get(ctx.objects[uid].cardId) : HIDDEN_CARD);
const num = uid => ctx.objects[uid]?.cardId.slice(-3) || '000';
const other = key => S().order.find(k => k !== key);
const owner = uid => ctx.objects[uid]?.owner || String(uid).split(':')[0];
// Quem está à frente da tela: o jogador que precisa agir agora (hot-seat local).
// A IA está decidindo agora (setup, janela ou turno dela).
const aiControls = () => { const s = S(); return settings.ai !== 'none' && (pending ? pending.pending.player : s.setup ? s.setup[0] : s.window ? s.window.priority : s.active) === settings.ai; };
const human = () => S().order.find(k => k !== settings.ai);
const viewer = () => { const s = S(); if (settings.ai !== 'none') return human(); return pending ? pending.pending.player : s.setup ? s.setup[0] : s.window ? s.window.priority : s.active; };
const say = text => { logLines.push({round: S().round, text}); if (logLines.length > 400) logLines.shift(); };
let noticeTimer;
function warn(text) { notice.textContent = text; notice.classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.classList.remove('show'), 3200); }

// ---------- Legalidade para a interface (a engine continua decidindo ao executar) ----------

const readyBases = key => S().players[key].bases.filter(b => b.prepared).length;
function affordable(key, cost) {
  if (!cost) return true;
  const latent = S().players[key].latent;
  return cost.unit === 'latent' ? latent >= cost.amount : cost.unit === 'mixed' ? readyBases(key) + latent >= cost.amount : readyBases(key) >= cost.amount;
}
const idleFor = key => { const s = S(); return !pending && !s.victory && !s.setup && !s.window && !s.chain.length && s.active === key; };
// Primeira escolha obrigatória sem candidato (ex.: Spell que pede um Saint aliado sem nenhum em campo).
const PICK_NEED = {saint: 'a friendly Saint', 'ready-saint': 'a Prepared friendly Saint', bronze: 'a friendly Bronze Saint', devotee: 'a friendly Devotee', armor: 'a friendly Armor', enemy: 'an enemy Devotee'};
function missingTarget(key, uid) {
  const step = (STEPS[num(uid)] || []).find(st => st.pick && !st.when);
  if (step && !step.optional && !candidates(step, key).length) return `Needs ${PICK_NEED[step.pick] || 'a legal target'}.`;
  // Spells V6 com alvo obrigatório (`spell.check`, ex.: 505–519): sem alvo legal, a carta não acende.
  try { entryOf(ctx, uid)?.spell?.check?.(S(), ctx, key, {}); } catch { return 'Needs a legal target.'; }
  return null;
}
function playableReason(key, uid) {
  const s = S(), c0 = info(uid), c = {...c0, cost: castCost(s, ctx, key, uid, c0.cost)}; // custo com reduções V6 (costLess)
  if (s.victory || s.setup) return 'The match is not running.';
  if (pending) return 'Answer the pending decision first.';
  if (c.kind === 'Spell') {
    const cat = spellCat(uid);
    if (!cat) return 'This Technique or Moment is not playable yet.';
    if (cat.speed === 'instant' ? !(s.window ? s.window.priority === key : s.active === key && !s.chain.length) : !idleFor(key)) return cat.speed === 'instant' ? 'You need priority to cast a Moment.' : 'Techniques are cast on your turn, with no response pending.';
    const cost = s.window ? castCost(s, ctx, key, uid, {amount: c0.cost.amount, unit: 'latent'}) : mixed(c.cost); // guia §5: resposta só Latent; como AÇÃO, Base e/ou Latent
    return affordable(key, cost) ? missingTarget(key, uid) : `Needs ${cost.amount} ${cost.unit === 'latent' ? 'Latent' : 'Cosmo (Base and/or Latent)'}.`;
  }
  if (!idleFor(key)) return s.active !== key ? "It's not your turn." : 'Wait for the response window to close.';
  if (c.kind === 'Equipment' && c.global) return affordable(key, mixed(c.cost)) ? null : `Needs ${c.cost.amount} Cosmo (Base and/or Latent).`;
  // Arma/acessório e Armor sem Resonant entram sem portador, pagando só o custo em Base (guia §28, §33).
  return affordable(key, c.cost) ? null : `Needs ${c.cost.amount} prepared Base Cosmo.`;
}
// D4: uma Base Cosmoble por turno, no próprio turno, com a janela fechada. Motivo em texto para o jogador.
function baseReason(key, uid) {
  if (!info(uid).cosmoble) return 'This card is not Cosmoble: it cannot become a Cosmo Base.';
  if (!idleFor(key)) return S().active !== key ? "It's not your turn." : 'Wait for the response window to close.';
  if (S().players[key].baseTurn === S().turn) return 'You already placed a Cosmo Base this turn.';
  return null;
}
const canBase = (key, uid) => !baseReason(key, uid);
// Hidden Cosmo {X} (guia §4A, 31/10/2026): jogar da própria Base. Prepared e com Base valendo, a carta paga 1 de si mesma.
function hiddenReason(key, uid) {
  const s = S(), c = info(uid), x = c.hiddenCosmo, base = s.players[key].bases.find(b => b.uid === uid);
  if (!x || !base) return 'This card has no Hidden Cosmo.';
  if (s.victory || s.setup) return 'The match is not running.';
  if (pending) return 'Answer the pending decision first.';
  const moment = c.kind === 'Spell' && spellCat(uid)?.speed === 'instant', response = !!s.window;
  if (moment ? !(response ? s.window.priority === key : idleFor(key)) : !idleFor(key)) return moment ? 'You need priority to cast a Moment.' : s.active !== key ? "It's not your turn." : 'Wait for the response window to close.';
  const self = base.prepared && !response ? 1 : 0, others = readyBases(key) - self, latent = s.players[key].latent, need = x - self;
  const ok = response ? latent >= x : c.kind === 'Devotee' ? others >= need : others + latent >= need;
  return ok ? null : `Needs ${x} ${response ? 'Latent' : c.kind === 'Devotee' ? 'Base Cosmo' : 'Cosmo (Base and/or Latent)'}${self ? ', this Base pays 1' : ''}.`;
}
function castFromBase(key, uid) {
  const reason = hiddenReason(key, uid);
  if (reason) return warn(reason);
  closeBigCard();
  casting = uid;
  begin('play', key, uid, STEPS[num(uid)] || [], choice => ({type: 'hidden', key, uid, choice}));
}
// A Base nova entra Unprepared (D4: Bases preparam no início do turno); o aviso explica por que o hexágono não sobe agora.
function placeAsBase(key, uid) {
  const reason = baseReason(key, uid);
  if (reason) return warn(reason);
  act({type: 'base', key, uid});
  warn('Cosmo Base placed. It is ready to pay costs now.');
}
// Há resposta possível? (Auto-pass só passa quando não há nenhum Moment jogável na mão.)
// Categoria da Spell: V6 pelo subtipo impresso (Moment = ação ou resposta; Technique = ação, guia §54); D268 pela D194.
const spellCat = uid => {
  const v6 = ctx.objects[uid] && v6Spell(ctx, uid);
  if (v6) return {category: v6.category, speed: v6.category === 'Moment' ? 'instant' : 'sorcery', v6: true};
  return spellCategory(Number(num(uid)));
};
// Gatilhos simultâneos seus (2+) ainda sem ordem confirmada seguram o auto-pass (§56, 31/10/2026).
const ordered = new Set();
const batchKey = key => `${S().lastBatch?.id}:${key}`;
const mustOrder = key => key !== settings.ai && ownBatch(S(), key).length > 1 && !ordered.has(batchKey(key));
const hasResponse = key => mustOrder(key) || S().players[key].hand.some(u => info(u).kind === 'Spell' && spellCat(u)?.speed === 'instant' && !playableReason(key, u))
  || S().players[key].tartarus.some(u => !afterlifeBlock(S(), ctx, key, u));

// ---------- Execução de ações ----------

// A ação e os avanços automáticos rodam dentro do protocolo de decisão: pergunta da engine sem resposta suspende tudo
// no ponto da pergunta (modal), e a resposta continua do mesmo snapshot (decision.js), sem repetir custo nem gatilho.
// `action`: ação serializável (engine-v3/actions.js), a mesma que o duelo online manda ao servidor; a IA local ainda passa função.
async function act(action) {
  if (online) return typeof action === 'function' ? undefined : sendOnline('action', {action});
  if (director.busy || pending) return;
  const s = S(), from = s.events.length, wasEnding = match.ending;
  const run = () => {
    match.ending = wasEnding;
    if (typeof action === 'function') action(); else applyAction(match, ctx, action);
    try { autoAdvance(); } catch (e) { if (e instanceof PendingDecision) throw e; if (!aiControls()) warn(why(e)); else console.debug(e); }
  };
  let r;
  const actor = clock?.running?.key; // quem decidia: ganha o bônus de ação do relógio (como no MTG Arena)
  try { r = runDecisions(s, ctx, run); } catch (e) { match.ending = wasEnding; if (!aiControls()) warn(why(e)); console.debug(e); render(); return; }
  if (actor && action?.type !== 'timeout') clockBonus(clock, actor, now());
  return present(r, run, from);
}
// Avança o que não precisa de escolha: início do turno seguinte e passes automáticos.
const autoAdvance = () => advanceMatch(match, key => settings.autoPass && !hasResponse(key));
// Mostra só os eventos ainda não animados (o replay repete o prefixo já visto, idêntico) e, se houver pergunta, abre o modal.
async function present(r, run, from) {
  const s = S(), shown = pending && pending.shown <= s.events.length ? pending.shown : from;
  pending = r.pending ? {...r, run, shown: s.events.length, picked: [], peek: true} : null;
  if (!pending) casting = null;
  const events = s.events.slice(shown);
  seenEvents = s.events.length;
  syncClock(events);
  render.lock = true;
  clockPause(clock, now()); // G3-025: animação não gasta tempo de decisão
  try { await director.play(events); } catch (err) { console.error(err); } // animação quebrada não pode travar a partida
  clockResume(clock, now());
  render.lock = false;
  rankHook(events);
  lookedHook(events);
  if (pending) clockHandTo(clock, pending.pending.player, now()); // G3-026: a decisão usa o relógio de quem decide
  render();
  focusDecision();
}
// Resposta à decisão pendente: {value} ou {timeout: true}. Resposta recusada pela engine volta ao ponto da pergunta.
function reply(answer) {
  if (online) return pending && !director.busy ? sendOnline('answer', {answer}) : undefined;
  if (!pending || director.busy) return;
  const p = pending, s = S();
  $$('.pick-modal, .pick-veil').forEach(el => el.remove()); // respondeu: o popup sai já, sem esperar a animação da resolução
  let r;
  const actor = p.pending.player;
  try { r = resume(s, ctx, p.run, p, answer); if (!answer.timeout) clockBonus(clock, actor, now()); } catch (e) {
    warn(why(e)); console.debug(e);
    restore(s, ctx, p.snap);
    runDecisions(s, ctx, p.run, p.answers, p.snap);
    return render();
  }
  return present(r, p.run, p.shown);
}

function begin(kind, key, uid, steps, run) {
  mode = {kind, key, uid, steps, i: 0, choice: {}, picked: [], run};
  advance();
}
function advance() {
  while (mode && mode.i < mode.steps.length) {
    const step = mode.steps[mode.i];
    if (step.when && !step.when(mode.choice)) { mode.i++; continue; }
    // Escolha obrigatória sem nenhum candidato: avisa e cancela em vez de travar a barra de escolha.
    if (step.pick && !step.optional && !mode.picked.length && !candidates(step, mode.key).length) {
      mode = null; casting = null;
      warn('No legal choice for that right now.');
      return render();
    }
    if (step.confirm) return render(); // pergunta sim/não na barra de escolha
    return render();
  }
  if (!mode) return render();
  const {run, choice, kind, uid} = mode;
  mode = null;
  $$('.choice, .pickable').forEach(el => (el.classList.contains('choice') ? el.remove() : el.classList.remove('pickable')));
  if (kind === 'play' && settings.castGrace) return startGrace(uid, run(choice));
  act(run(choice));
}
// Tempinho para voltar atrás no cast, como no Arena (autor, 01/11/2026): a ação só vai à engine depois dos 3 s ou do OK;
// cancelar não muda a regra nem o estado, vale também online.
let grace = null;
function startGrace(uid, action) {
  dropHeld(); // a cópia solta do arraste não fica sobre a carta grande
  const el = document.createElement('div');
  el.className = 'cast-grace'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="cast-grace__card">${cardFace(uid, {size: 'dcard--lg'}).replace('tabindex="0"', 'tabindex="-1"')}</div><i class="cast-grace__bar" aria-hidden="true"></i>
    <div class="cast-grace__row"><button class="ghost" data-grace="cancel">Cancel</button><button class="primary-action" data-grace="ok">OK</button></div>`;
  const finish = send => { clearTimeout(grace.timer); el.remove(); grace = null; if (send) return act(action); casting = null; render(); };
  el.addEventListener('click', e => { e.stopPropagation(); const a = e.target.closest('[data-grace]')?.dataset.grace; if (a) finish(a === 'ok'); });
  document.body.append(el);
  grace = {cancel: () => finish(false), timer: setTimeout(() => finish(true), 3000)};
}
const concede = () => (online ? concedeOnline() : askSure('Concede this duel?', 'Concede', () => act(() => loseGame(S(), viewer(), 'concede'))));
// Sair, desistir: sempre com "tem certeza?" (autor, 01/11/2026).
function askSure(text, yes, onYes) {
  const box = document.createElement('div');
  box.className = 'sure'; box.setAttribute('role', 'alertdialog');
  box.innerHTML = `<div class="sure__box"><p>${esc(text)}</p><div class="sure__row"><button class="ghost" data-sure="no">Cancel</button><button class="primary-action" data-sure="yes">${esc(yes)}</button></div></div>`;
  box.addEventListener('click', e => { e.stopPropagation(); const a = e.target.closest('[data-sure]')?.dataset.sure; if (!a) return; box.remove(); if (a === 'yes') onYes(); });
  document.body.append(box);
}

function candidates(step, key) {
  const s = S(), field = s.players[key].battlefield, devs = field.filter(u => info(u).kind === 'Devotee');
  switch (step.pick) {
    case 'saint': return devs.filter(u => isSaint(ctx, u));
    case 'ready-saint': return devs.filter(u => isSaint(ctx, u) && s.units[u]?.prepared);
    case 'bronze': return devs.filter(u => isBronze(ctx, u));
    case 'devotee': return devs;
    case 'armor': return devs.filter(u => Object.keys(ctx.attached).some(g => ctx.attached[g] === u && info(g).armor)); // Devotee seu que veste Armor
    case 'resonant': return devs.filter(u => resonant(s, ctx, key, info(step.armor), u));
    case 'wearer': return devs.filter(u => ctx.attached[step.armor] !== u);
    case 'enemy': return s.players[other(key)].battlefield.filter(u => info(u).kind === 'Devotee');
    case 'command': return commandTargets(s, ctx, key); // Divine Command (§63): o lado e o filtro vêm do God
    case 'strike': return strikeTargets(s, ctx, mode.uid).map(t => (t.kind === 'god' ? `god:${t.player}` : t.uid));
    default: return [];
  }
}

// Alvo no tabuleiro (autor, 30/10/2026): a carta conjurada fica travada no slot de conjuração, fora do campo, e o
// jogador puxa a seta dela até o alvo, como no Strike (clique no alvo também vale). Cobre a escolha da interface ao
// jogar da mão (`mode`, ex.: portador da Cloth) e a pergunta de alvo da engine (Spell V6 mira ao conjurar) quando
// todas as opções estão no tabuleiro; as demais perguntas seguem no modal.
const onBoard = ref => String(ref).startsWith('god:') || S().order.some(k => S().players[k].battlefield.includes(ref));
const targetReq = req => !!req && req.kind === 'choice' && req.count === 1 && req.choose !== 'mode' && req.player !== settings.ai
  && req.options.length > 0 && req.options.every(onBoard);
// Painel lateral estilo Arena (autor, 30/10/2026): gatilho opcional e alvo no tabuleiro aparecem com a carta de origem
// em zoom ao lado do campo, o texto do efeito e uma seta até quem é afetado, sem cobrir o campo. Esc abre o modal clássico.
const sideReq = req => !!req && req.player !== settings.ai && (req.kind === 'optional' || targetReq(req));
function boardPick() {
  // Escolha com carta de origem (jogar, equipar, ativar): painel de conjuração à direita, como as outras (autor, 01/11/2026).
  if (mode?.uid && ctx.objects[mode.uid]) return {uid: mode.uid, refs: mode.options || [], pick: choose};
  // Poder do Deus: o mesmo painel, com a carta do Deus; a seta sai dela ou do retrato (autor, 01/11/2026).
  if (mode && !mode.uid) return {uid: null, god: mode.key, refs: mode.options || [], pick: choose};
  if (!pending?.peek || !targetReq(pending.pending)) return null;
  const req = pending.pending, src = [casting, req.uid, req.source].find(u => u && ctx.objects[u]);
  return {uid: src || null, refs: req.options, pick: v => reply({value: req.multiple ? [v] : v})};
}

function playFromHand(key, uid) {
  const c = info(uid), n = num(uid), reason = playableReason(key, uid);
  if (reason) return warn(reason);
  casting = uid;
  if (c.kind === 'Devotee') {
    if (duplicateCharacter(S(), ctx, key, uid)) warn(`You already control ${c.name.split(',')[0]}: after it enters, choose which version stays.`);
    return begin('play', key, uid, STEPS[n] || [], choice => ({type: 'play', key, uid, choice}));
  }
  if (c.kind === 'Equipment') {
    // Armor (guia §28, 30/10/2026): só entra vestida num Resonant seu, sem Equip; senão entra sem portador.
    const armorPick = c.armor && candidates({pick: 'resonant', armor: uid}, key).length;
    // Arma/acessório (§33, 01/11/2026): entra sem portador; prender é a ação Equip no campo.
    const steps = armorPick ? [{key: 'bearer', pick: 'resonant', armor: uid, optional: true, label: `Choose who wears ${c.name}`}] : [];
    if (n === '019') steps.push({key: 'target', pick: 'devotee', optional: true, label: 'Pegasus God Cloth: which Devotee gets +3/+3 (if your God is behind)?'});
    return begin('play', key, uid, steps, choice => ({type: 'play', key, uid, choice}));
  }
  return begin('play', key, uid, STEPS[n] || [], choice => ({type: 'play', key, uid, choice}));
}

function startStrike(uid) {
  const targets = strikeTargets(S(), ctx, uid);
  if (!targets.length) return warn('No legal target for this Devotee right now.');
  begin('strike', S().active, uid, [{key: 'target', pick: 'strike', label: `Choose a target for ${info(uid).name}`}], choice => ({type: 'strike', key: S().active, uid, choice}));
}

function primary() {
  const s = S();
  if (director.busy) return director.skip();
  if (grace) return;
  if (pending) return focusDecision();
  if (mode) {
    const step = mode.steps[mode.i];
    if (step?.multi || step?.optional) return choose(null);
    return;
  }
  if (s.victory) return;
  if (aiControls()) return; // vez da IA: o botão não age por ela
  if (s.setup) return confirmMulligan();
  if (s.window) return act({type: 'pass', key: s.window.priority});
  act({type: 'endTurn', key: s.active});
}

function choose(value) {
  const step = mode.steps[mode.i];
  if (step.multi) {
    if (value) { mode.picked.push(value); if (mode.picked.length < step.multi) return render(); }
    mode.choice[step.key] = [...mode.picked]; mode.picked = [];
  } else if (value !== null) mode.choice[step.key] = value;
  mode.i++;
  advance();
}

function confirmMulligan() {
  if (coinStage) return; // a moeda ainda está na tela
  const s = S(), key = s.setup[0], back = [...marked];
  marked = new Set();
  act({type: 'mulligan', key, choice: {uids: back}});
}

// ---------- Poderes divinos ----------

// Ações divinas do jogador agora: Ultimate (pronto ou o motivo do bloqueio) e remover Divine Judgment.
function godActions(key) {
  const s = S(), d = s.divine[key], mine = key === viewer() && !s.victory && !s.setup;
  // Ultimate por God: bloqueio (motivo) e ação.
  const ULT = {
    'god-poseidon': [() => greatFloodBlock(s, key), () => act({type: 'greatFlood', key}), `Great Flood needs ${GREAT_FLOOD_COST} prepared Bases.`],
    'god-hades': [() => greatEclipseBlock(s, key), () => act({type: 'greatEclipse', key}), `Great Eclipse needs ${GREAT_ECLIPSE_COST} prepared Bases.`],
    'god-ares': [() => obliterationBlock(s, key), () => act({type: 'obliteration', key}), `Obliteration needs ${OBLITERATION_COST} prepared Bases.`],
    'god-artemis': [() => moonAwakeningBlock(s, key), () => act({type: 'moonAwakening', key}), `Moon Awakening needs ${MOON_AWAKENING_COST} prepared Bases.`],
  }[d.god] || [() => ultimateBlock(s, ctx, key), () => startExclamation(key), ''];
  const block = ULT[0](), run = ULT[1];
  const why = {used: 'Ultimate already used this match.', sorcery: 'Ultimate: your turn, with no response pending.', cost: ULT[2] || 'Not enough prepared Bases.', 'only-athena': 'No Ultimate available.', pendente: 'This Ultimate is not available in the playtest yet.'}[block] || (block ? 'Not available now.' : '');
  // Bloodlust (Ares): Divine Power ativado, escolhe o Devotee na barra de escolha.
  const blood = d.god === 'god-ares' && mine ? bloodlustBlock(s, ctx, key) : 'only-ares';
  // Divine Command (guia §63, 01/11/2026): {1}{C}, no próprio turno, uma vez por turno; alvo na barra de escolha.
  const cmd = COMMANDS[d.god], cmdWhy = mine ? commandBlock(s, ctx, key) : 'owner';
  return {
    command: !cmd ? null : {ok: mine && !cmdWhy, why: {sorcery: 'Divine Command: your turn, with no response pending.', used: 'Divine Command already used this turn.', cost: 'Divine Command costs 1 Cosmo (prepared Base or Latent).', target: 'No legal target.', owner: "Only the God's controller uses it."}[cmdWhy] || 'Not available now.',
      run: () => begin('command', key, null, [{key: 'uid', pick: 'command', label: `${godPowers(cards.get(s.gods[key])).find(pw => pw.kind === 'command')?.label || cmd.ability}: choose ${cmd.side === 'friendly' ? 'a Devotee you control' : 'an enemy Devotee'}`}], choice => ({type: 'command', key, choice}))},
    bloodlust: d.god !== 'god-ares' ? null : {ok: mine && !blood, why: {sorcery: 'Bloodlust: your turn, with no response pending.', used: 'Bloodlust already used this round.', cost: `Bloodlust costs ${BLOODLUST_COST} Cosmo (prepared Base or Latent).`, target: 'You control no Devotee.'}[blood] || 'Not available now.',
      run: () => begin('bloodlust', key, null, [{key: 'uid', pick: 'devotee', label: 'Bloodlust: choose a Devotee you control (Prepare it, +1 ATK this round)'}], choice => ({type: 'bloodlust', key, choice}))},
    ultimate: {ok: mine && !block, why: mine ? why : "Only the God's controller uses it.", run},
    judgment: mine && d.judgment && idleFor(key) ? () => begin('judgment', key, null,
      [{key: 'devotees', pick: 'devotee', multi: 3, label: 'Sacrifice exactly three Devotees you control'}], choice => ({type: 'judgment', key, choice})) : null,
  };
}

function startExclamation(key) {
  begin('ultimate', key, null, [{key: 'saints', pick: 'ready-saint', multi: 3, label: 'Choose three Prepared Saints with different identities (cost 5 +3 Bronze +2 Silver)'}], choice => ({type: 'exclamation', key, choice}));
  if (mode) mode.title = 'ATHENA EXCLAMATION'; // sem escolha legal, begin não abre modo (já avisou)
  render();
}

// ---------- Relógio competitivo (G3-024..028) ----------

const now = () => performance.now() / 1000;
// Fim da partida: XP contra a IA, rank e XP online (docs/ranking-xp.md). Hot-seat não conta.
const rankHook = events => { const v = events.find(e => e.type === 'victory'); if (v) rankAfterMatch({victory: v, online: !!online, me: online ? online.key : settings.ai === 'A' ? 'B' : settings.ai === 'B' ? 'A' : null}); };
function syncClock(events) {
  const s = S();
  for (const e of events) {
    if (e.type === 'end_phase') clockEndTurn(clock, e.player, now());
    if (e.type === 'turn_start') clockStartTurn(clock, e.player, now());
  }
  // Quem decide agora tem o relógio correndo, inclusive na janela da End Phase depois do END TURN (G3-026/031).
  if (s.victory || s.setup || !s.turn) return;
  clockHandTo(clock, s.window ? s.window.priority : s.active, now());
}
function updateClock() {
  const box = $('[data-clock]');
  if (!box || !clock) return;
  const key = clock.running?.key, r = key ? clockRemaining(clock, key, now()) : {total: 0, basic: 0};
  const lit = torchesLit(r.total);
  $$('.torch', box).forEach((t, i) => t.classList.toggle('lit', i < lit));
  box.classList.toggle('urgent', !!key && r.total <= 20);
  const t = Math.max(0, Math.ceil(r.total)), time = $('[data-clock-time]'), label = $('[data-clock-label]');
  if (time) time.textContent = key ? `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` : '--:--';
  if (label) label.textContent = !key ? 'Clock' : r.basic > 0 ? `Turn · ${key}` : `Reserve · ${key}`;
  const dc = $('[data-decision-clock]');
  if (dc && key) { dc.textContent = `${t}s left`; dc.classList.toggle('urgent', r.total <= 20); }
}
// Timeout (sempre ligado; ?timeouts=0 desliga para QA; online quem aplica é o arena-server). G3-027: escolha opcional pendente →
// TIMEOUT_DECLINED; obrigatória → TIMEOUT_AUTO_CHOICE (G3-030, na engine); janela → TIMEOUT_PASS_PRIORITY; fase de
// ações → TIMEOUT_END_TURN. Uma escolha de alvo começada pela interface (mode) não é decisão da engine: é cancelada e
// o timeout da janela ou do turno vale. Fechar o modal (View board) não é timeout.
function tickClock() {
  updateClock();
  if (online) return; // online o servidor tem o relógio e aplica o timeout (arena-server/arena.mjs)
  const s = S(), key = clock && !clock.paused && clockExpired(clock, now());
  if (!settings.timeouts || !key || director.busy || s.victory || s.setup) return;
  if (pending) { if (pending.pending.player === key) reply({timeout: true}); return; }
  if (mode) { mode = null; closeQuick(); }
  act({type: 'timeout', key});
}

// ---------- Render ----------

// Cartas do Card Forge como dados (tools/forge-art-web.sh): shared/live-card.js desenha moldura, textos e números no DOM; a arte é só fundo.
const FORGE_ART = '../../card-forge/art-web/';
const forgeArt = file => lightArt(FORGE_ART + file);
// Mesa no estilo Arena (só arte, nome, ATK e HP); ?board=classic volta à carta inteira para comparar.
const BOARD_TOKENS = new URLSearchParams(location.search).get('board') !== 'classic';
const CARD_FACTIONS = new Set(['athena', 'poseidon', 'hades', 'ares', 'artemis']);
const FORGE = new Map((await fetch(`${FORGE_ART}cards.json`).then(r => (r.ok ? r.json() : {cartas: []})).catch(() => ({cartas: []}))).cartas.map(c => [c.id, c]));
useGodPortraits(FORGE.values()); // avatar do Deus nas placas = rosto da placa do God (rank.js)
// Item da cadeia em texto de jogador: carta de origem, nome da habilidade, a linha impressa dela e o alvo.
// `c.source` (número da carta) quando o texto vem de outra carta (gatilho atrasado de Spell); sem carta no jogo, o God do controlador.
// Dados de um item da pilha para o hover: carta de origem, habilidade e alvos.
const srcAttrs = c => `data-src="${esc(c.uid || '')}" data-ability="${esc(chainLabel(c).sub || c.ability || '')}" data-targets="${esc((c.targets?.length ? c.targets : [c.target]).filter(Boolean).join(' '))}"`;
let hoverItem = null; // item da pilha sob o mouse: desenha a seta da origem até os alvos
function chainLabel(c) {
  const card = c.source ? [...cards.values()].find(x => x.id.endsWith(`-${c.source}`))
    : c.uid && ctx.objects[c.uid] ? info(c.uid) : cards.get(S().gods[c.controller]);
  // Gatilhos V6 chegam como "NOME · enters the battlefield": tira o nome da carta para não repetir no título.
  const raw = c.ability || '', prefix = `${card?.name || ''} · `.toUpperCase();
  const ability = raw.toUpperCase().startsWith(prefix) ? raw.slice(prefix.length) : raw, named = /^[A-Z]/.test(ability) && !/^When /.test(ability);
  // Linha que começa com a habilidade ("NOME — efeito"); se depois do nome só há a etiqueta (Divine Power, Ultimate), o efeito
  // está na linha seguinte (pula "Cost:"). Sem linha própria (gatilho sem nome), a primeira linha que cita a frase.
  const lines = card?.text.split('\n').map(l => l.trim()) || [], low = ability.toLowerCase();
  let i = ability ? lines.findIndex(l => l.toLowerCase().startsWith(low)) : -1, text = '';
  if (i >= 0) {
    text = named ? lines[i].slice(ability.length).replace(/^\s*[—:-]\s*/, '') : lines[i];
    if (text.length < 25) text = lines.slice(i + 1).find(l => l && !/^Cost:/.test(l)) || text;
  } else if (ability) text = lines.find(l => l.toLowerCase().includes(low)) || '';
  // Texto do Forge no idioma da tela (autor, 01/11/2026): o `card.text` de Athena é o D268 congelado, sempre em inglês.
  const forge = c.uid && ctx.objects[c.uid] ? FORGE.get(ctx.objects[c.uid].cardId) : card && FORGE.get(`${card.name.toLowerCase()}-001`);
  text = abilityText(forge, ability) ?? text;
  const sub = ability && ability.toUpperCase() !== card?.name?.toUpperCase() ? ability[0].toUpperCase() + ability.slice(1) : '';
  const title = [card?.name, sub].filter(Boolean).join(' · ') || 'Triggered ability';
  return {title, name: card?.name || 'Triggered ability', sub, text, target: (c.targets?.length ? c.targets : [c.target]).filter(Boolean).map(u => (String(u).startsWith('god:') ? `God ${u.slice(4)}` : ctx.objects[u] ? info(u).name : '')).filter(Boolean).join(', ')}; // alvos escolhidos ao conjurar (item.targets)
}
// Arte do token de mesa: enquadramento do Forge; sem arte, o símbolo da facção ou o logo.
function tokenArt(forge) {
  const fr = forge.ilustracao_enquadramento, fac = String(forge.faccao).toLowerCase();
  return forge.ilustracao ? `--art:url('${forgeArt(forge.ilustracao)}');${fr?.w ? `--fx:${fr.x / 1488};--fy:${(fr.y - 160) / 1488};--fw:${fr.w / 1488};` : ''}`
    : CARD_FACTIONS.has(fac) ? `--art:url('../../CARD-TEMPLATE/symbols/${fac}.png');` : `--art:url('../../LOGO/logo-web.webp');--noart-w:70%;`;
}
// Bônus impresso de qualquer Equipment (Armor: bonus_poder/bonus_vida; armas: linha "Equipped Devotee gets").
const printedBonusFields = f => { const b = printedEquipmentBonuses(f); return {bonus_poder: b.power || 0, bonus_vida: b.hp || 0}; };
// Sleeve (cosmético da loja, 31/10/2026): verso das cartas de cada jogador, visto pelos dois (como no Arena).
const GEAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const sleeves = {};
const sleeveVar = key => { const id = sleeves[key], f = id && FORGE.get(id.replace(/^god-(.+)$/, '$1-001')); return f?.ilustracao ? `--sleeve:url('${forgeArt(f.ilustracao)}');` : ''; };
const coins = {}; // moeda do cara ou coroa: cosmético de cada jogador (coin3d.js)
const coinArt = key => { const id = coins[key], f = id && FORGE.get(id.replace(/^god-(.+)$/, '$1-001')); return f?.ilustracao ? forgeArt(f.ilustracao) : null; };
const useSleeves = (r, me) => {
  if (!r) return;
  const foe = me === 'A' ? 'B' : 'A';
  sleeves[me] = r.me?.sleeve; sleeves[foe] = r.foe?.sleeve;
  coins[me] = r.me?.coin; coins[foe] = r.foe?.coin;
  for (const k of [me, foe]) coin3d?.setFace(k, coinArt(k));
  render();
};
function cardFace(uid, {field = false, hidden = false, size = ''} = {}) {
  if (hidden || !ctx.objects[uid]) return `<div class="dcard dcard--back ${size}" data-uid="${uid}" aria-label="Face-down card"><span></span></div>`;
  const s = S(), c = info(uid), n = num(uid), unit = s.units[uid];
  const cat = c.kind === 'Spell' && ctx.objects[uid] ? spellCat(uid) : null;
  const subtype = cat ? cat.category : (c.type.split(' — ')[1] || c.kind);
  const forge = FORGE.get(ctx.objects[uid].cardId), forge0 = forge;
  const atk = field ? atkOf(s, ctx, uid) : c.atk, hp = field ? hpOf(s, ctx, uid) : c.hp;
  const kws = [...new Set(field && c.kind === 'Devotee' ? keywordsOf(s, ctx, uid) : c.keywords)];
  const dmg = unit?.damage || 0;
  const cls = ['dcard', size, forge ? 'art-full' : '', `kind-${c.kind.toLowerCase()}`, `rarity-${(c.rarity || 'common').toLowerCase()}`, c.armor ? 'is-armor' : '', cat ? `cat-${cat.category.toLowerCase()}` : '',
    field && c.kind === 'Devotee' && !unit?.prepared ? 'unprepared' : '', field && !size && c.kind === 'Devotee' && unit?.prepared ? 'is-prepared' : '', kws.includes('Guardian') && field ? 'guarding' : '',
    // Aura de Cosmo (autor, 30/10/2026): Devotee seu que pode atacar agora queima Cosmo atrás, na cor da facção.
    field && !size && c.kind === 'Devotee' && owner(uid) === viewer() && idleFor(owner(uid)) && strikeTargets(s, ctx, uid).length ? 'can-strike' : ''].join(' ');
  const facAttr = ` data-fac="${CARD_FACTIONS.has(String(forge?.faccao).toLowerCase()) ? String(forge.faccao).toLowerCase() : 'neutral'}"`;
  const statBuffed = (v, base) => (v > base ? 'up' : v < base ? 'down' : '');
  // Dano não tem marcador: o HP impresso já mostra a vida restante, em vermelho.
  const marks = unit?.training || unit?.seal ? `<span class="dcard__tokens">${unit?.training ? token('training', unit.training, `Training|${unit.training} counter${unit.training > 1 ? 's' : ''}: +1 ATK / +1 HP each.`) : ''}${unit?.seal
    ? token('seal', unit.seal, `Seal|At the start of its owner's turn, it removes one counter and does not Prepare.`) : ''}</span>` : '';
  // Equipamento solto na mesa (Armor sem portador, arma caída): token compacto com arte, nome, bônus e selo EQUIP (autor, 30/10/2026).
  if (forge && field && !size && c.kind === 'Equipment' && BOARD_TOKENS) {
    const bonus = armorBonusText({...forge, ...printedBonusFields(forge)}), equip = forge.equipar_custo_outros ?? forge.equipar_custo;
    return `<div class="${cls} dcard--board dcard--gear"${facAttr} data-uid="${uid}" tabindex="0" aria-label="${esc(c.name)}, no bearer${bonus ? `, ${bonus}` : ''}">
      <div class="btok ${!forge.ilustracao ? 'is-noart' : ''}" style="${tokenArt(forge)}"><span class="btok__name">${esc(c.name)}</span>
        ${bonus ? `<span class="btok__band">${esc(bonus)}</span>` : ''}${equip != null && !c.global ? `<b class="btok__equip" title="Equip ${equip}"><small>EQUIP</small>${equip}</b>` : ''}</div></div>`;
  }
  // Token (Moon Spirit, Forest Guardian…): sem projeto no Forge; entra no mesmo formato de mesa, com o símbolo da facção do God
  // de quem controla (autor, 31/10/2026).
  const tok = !forge && field && !size && c.kind === 'Devotee' && BOARD_TOKENS ? {faccao: cards.get(S().gods[owner(uid)])?.name || 'neutral', ilustracao: null} : null;
  if ((forge || tok) && field && !size && c.kind === 'Devotee' && BOARD_TOKENS) { // só na mesa: inspetor (size xl) mostra a carta inteira
    const forge = forge0 || tok, facAttr = ` data-fac="${CARD_FACTIONS.has(String(forge.faccao).toLowerCase()) ? String(forge.faccao).toLowerCase() : 'neutral'}"${tok ? ' data-token' : ''}`;
    // Carta na mesa no estilo MTG Arena (teste local, autor 30/10/2026): só arte, nome, ATK e HP.
    // A arte segue o enquadramento do Forge, recortada da altura do rosto; o texto inteiro fica no inspetor.
    const fr = forge.ilustracao_enquadramento, fac = CARD_FACTIONS.has(String(forge.faccao).toLowerCase()) ? String(forge.faccao).toLowerCase() : 'athena';
    // Sem arte (ex.: artes provisórias -ref não vão ao site): o símbolo da facção no centro, sem recorte.
    const art = forge.ilustracao ? `--art:url('${forgeArt(forge.ilustracao)}');${fr?.w ? `--fx:${fr.x / 1488};--fy:${(fr.y - 160) / 1488};--fw:${fr.w / 1488};` : ''}`
      : CARD_FACTIONS.has(String(forge.faccao).toLowerCase()) ? `--art:url('../../CARD-TEMPLATE/symbols/${fac}.png');` : `--art:url('../../LOGO/logo-web.webp');--noart-w:70%;`;
    // HP: Athena tem gem_resistance; as outras facções usam gem_soul (CARD-TEMPLATE/pieces.json).
    const gem = (kind, v, trend) => `<b class="btok__stat btok__stat--${kind}" data-trend="${trend}" style="--gem:url('../../CARD-TEMPLATE/${fac}/gem_${kind === 'atk' ? 'power' : fac === 'athena' ? 'resistance' : 'soul'}.png')">${v}</b>`;
    return `<div class="${cls} dcard--board"${facAttr} data-uid="${uid}" tabindex="0" aria-label="${esc(c.name)}, ATK ${atk}, HP ${hp - dmg} of ${hp}">
      <div class="btok ${!forge.ilustracao ? 'is-noart' : fr?.w ? 'is-framed' : ''}" style="${art}"><span class="btok__name">${esc(c.name)}</span>
        ${gem('atk', atk, statBuffed(atk, c.atk))}${gem('hp', hp - dmg, dmg ? 'down' : statBuffed(hp, c.hp))}</div>${marks}</div>`;
  }
  if (forge) {
    // ATK e HP ao vivo no próprio número impresso: verde com bônus, vermelho com dano ou redução.
    const live = renderLiveCard(forge, {stats: {power: atk ?? null, hp: hp == null ? null : hp - dmg, damage: dmg, keywords: kws}, art: forge.ilustracao && forgeArt(forge.ilustracao)})
      .replace('data-stat="power"', `data-stat="power" data-trend="${statBuffed(atk, c.atk)}"`)
      .replace('data-stat="hp"', `data-stat="hp" data-trend="${dmg ? 'down' : statBuffed(hp, c.hp)}"`);
    return `<div class="${cls}"${facAttr} data-uid="${uid}" tabindex="0" aria-label="${esc(c.name)}${c.kind === 'Devotee' ? `, ATK ${atk}, HP ${hp - dmg} of ${hp}` : ''}">${live}${marks}</div>`;
  }
  return `<div class="${cls}" data-uid="${uid}" tabindex="0" aria-label="${esc(c.name)}">
    <div class="dcard__art"><span class="dcard__glyph">${esc(c.name.split(/[ ,’']/)[0].slice(0, 2))}</span></div>
    ${c.cost ? `<b class="dcard__cost ${c.cost.unit}" title="${c.cost.amount} ${c.cost.unit === 'base' ? 'Base' : 'Latent'} Cosmo">${c.cost.amount}</b>` : ''}
    <div class="dcard__plate"><strong>${esc(c.name)}</strong><small>${esc(subtype)}${kws.length ? ` · ${esc(kws.join(' · '))}` : ''}</small></div>
    ${c.kind === 'Devotee' ? `<div class="dcard__stats"><b class="atk ${statBuffed(atk, c.atk)}" title="ATK ${atk}">${atk}</b><b class="hp ${dmg ? 'hurt' : statBuffed(hp, c.hp)}" title="HP ${hp - dmg} of ${hp}">${hp - dmg}</b></div>` : ''}
    ${c.armor && field && c.hp ? `<div class="dcard__stats"><b class="hp" title="+${c.hp} HP to the wearer">+${c.hp}</b></div>` : ''}
    ${marks}
  </div>`;
}


// Retrato do God (cantos esquerdos da referência): nome, Soul com coração, escudo de Awaken, barra de Soul,
// selos de Ultimate e Divine Judgment. O seu abre o menu dos poderes divinos.
// HUD do God no layout do autor (arte de referência de 28/10/2026), desenhado em SVG para escalar sem perder nitidez:
// medalhão com anel dourado, tridente no topo e asas douradas; faixa com o nome entre louros; placa com Soul (coração),
// ATTACK (espadas), asas prateadas nas pontas e medalhão Ω com ponta embaixo.
const GOLD = id => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".35" stop-color="#f0cc6e"/><stop offset=".7" stop-color="#a8741f"/><stop offset="1" stop-color="#f6d98c"/></linearGradient>`;
const PLATE = (gid, sid) => `<svg class="gh-plate__bg" viewBox="0 0 600 150" preserveAspectRatio="none" aria-hidden="true"><defs>${GOLD(gid)}
  <linearGradient id="${sid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2358"/><stop offset="1" stop-color="#0a0a22"/></linearGradient></defs>
  <path d="M44 12 H556 Q588 12 598 56 Q588 100 556 100 H44 Q12 100 2 56 Q12 12 44 12Z" fill="url(#${sid})" stroke="url(#${gid})" stroke-width="5"/>
  <path d="M50 22 H550 Q576 22 584 56 Q576 90 550 90 H50 Q24 90 16 56 Q24 22 50 22Z" fill="none" stroke="url(#${gid})" stroke-opacity=".55" stroke-width="1.5"/>
  <path d="M300 0 L311 12 L300 24 L289 12Z" fill="url(#${gid})"/><path d="M300 148 L291 116 L309 116Z" fill="url(#${gid})"/>
</svg>`;
// Moldura central de cada God (arte do autor, 28/10/2026): buraco do retrato e placa do nome em % da imagem [x, y, largura, altura].
const FRAMES = {
  athena: {ratio: .9655, hole: [23.5, 20.9, 55.7, 52.4], plate: [26.2, 75, 49.9, 10.7]},
  poseidon: {ratio: 1.0078, hole: [21.8, 20.4, 56.8, 53.6], plate: [25, 75.7, 50.3, 10.1]},
  hades: {ratio: .9703, hole: [20, 17.4, 60.8, 56.6], plate: [24.3, 76, 52, 10.9]},
  artemis: {ratio: 1.1324, hole: [24.3, 12.2, 50.8, 56.3], plate: [26, 70.6, 48.2, 12]},
  ares: {ratio: 1.1607, hole: [26.5, 20, 46, 51.8], plate: [28.4, 73.6, 42.2, 12.1]},
};
const box = ([x, y, w, h]) => `left:${x}%;top:${y}%;width:${w}%;height:${h}%`;
// Marcador como moeda (autor, 28/10/2026): dourada para Training, prata e azul para Seal, dourada com balança para Divine Judgment.
const token = (kind, n, tip) => `<i class="token token--${kind}" data-tip="${esc(tip)}"><b>${n}</b></i>`;
// Rosto escolhido no Card Forge (card-forge/god-hud.js): mesma conta da prévia de lá; sem escolha, a arte da carta.
function godFace(key) {
  const id = S().gods[key], f = FORGE.get(`${cards.get(id).name.toLowerCase()}-001`), h = f?.hud_rosto;
  if (h) return `background-image:url('${forgeArt(h.imagem)}');background-size:${h.zoom}% auto;background-position:${h.x}% ${h.y}%`;
  return `background-image:url('${f?.ilustracao ? forgeArt(f.ilustracao) : GOD_ART[id] || ''}')`;
}
function godHud(key, side) {
  const s = S(), p = s.players[key], d = s.divine[key], god = cards.get(s.gods[key]);
  const pick = (mode?.options || boardPick()?.refs)?.includes(`god:${key}`), max = soulMax(s, key);
  const low = p.soul <= Math.max(d.awakenAt, Math.ceil(max / 4)), k = `gh${key}`;
  const face = godFace(key);
  const frame = FRAMES[god.name.toLowerCase()] ? god.name.toLowerCase() : 'athena', fr = FRAMES[frame];
  return `<section class="godhud godhud--${side} ${pick ? 'pickable' : ''} ${s.active === key ? 'is-active' : ''} ${d.awaken ? 'is-awaken' : ''} ${low ? 'is-low' : ''}" data-god="${key}" style="--glow:${GOD_GLOW[d.god] || GOD_GLOW['god-athena']}"
      ${pick ? `data-pick="god:${key}"` : ''} role="button" tabindex="0" aria-label="${esc(god.name)}, Soul ${p.soul} of ${max}${d.awaken ? ', Awaken' : ''}">
    <div class="gh-frame" style="aspect-ratio:${fr.ratio}" data-tip="${esc(`God|${god.name}, Player ${key}. Devotees can Strike it.`)}">
      <div class="gh-hole godhud__portrait" style="${box(fr.hole)};${face}"></div>
      <img class="gh-frame__img gh-frame__img--${frame}" src="./assets/god-frames/${frame}.webp" alt="">
      <span class="gh-name" style="${box(fr.plate)}">${esc(god.name)}</span>
      ${d.judgment ? `<span class="godhud__judgment">${token('judgment', `R${d.judgment.deadline}`, `Divine Judgment|This God loses at the end of Round ${d.judgment.deadline} unless the counter is removed.`)}</span>` : ''}
    </div>
    <div class="gh-plate">
      ${PLATE(`${k}p`, `${k}q`)}
      <div class="gh-cells">
        <span class="gh-cell gh-cell--soul godhud__soul" data-soul="${key}" data-tip="Soul|${p.soul} of ${max}. When a God's Soul reaches 0, its player loses."><i class="gh-soulicon" aria-hidden="true"></i><b>${p.soul}</b><i class="gh-soulbar" aria-hidden="true" style="--pct:${Math.max(0, Math.min(100, Math.round(p.soul / max * 100)))}%"><u></u></i></span>
      </div>
    </div></section>`;
}
// Trilho do jogador (autor, 28/10/2026): lista com nome escrito, pesada pelas regras. Cosmo pronto e Latent primeiro
// (decidem o que se joga), depois Deck, mão, Tartarus e Void; o Domain é um selo que abre a carta. Tudo com dica no hover.
function sanctum(key, side) {
  const s = S(), p = s.players[key], id = s.domains[key], dom = cards.get(id), f = FORGE.get(id), ready = readyBases(key), n = p.deck.length;
  const pooled = (p.pool || []).filter(u => p.bases.some(b => b.uid === u && b.prepared)).length;
  const burn = Math.min(1, p.bases.length / 10).toFixed(2); // o Cosmo arde mais conforme as Bases crescem (0 a 1 em 10 Bases)
  const pips = p.bases.map(b => `<i class="orb orb--base ${b.prepared ? 'ready' : 'spent'}"></i>`).join('');
  const flames = [0, 1, 2].map(i => `<i class="orb orb--latent flame ${i < p.latent ? 'ready' : 'empty'}"></i>`).join('');
  const row = (cls, icon, label, value, tip, attrs = '') => `<div class="rail__row ${cls}" ${attrs} data-tip="${esc(tip)}"><span class="rail__ico">${icon}</span><span class="rail__label">${label}</span><b>${value}</b><span class="rail__cap">${label.replace(/<.*$/, '').replace('Cosmo ', '')}</span></div>`;
  const plural = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  return `<section class="sanctum sanctum--${side}" style="--god:${GOD_GLOW[s.divine?.[key]?.god] || GOD_GLOW['god-athena']}" aria-label="${side === 'me' ? 'Your' : 'Opponent'} resources">
    <header class="rail__who">${side === 'me' ? 'You' : 'Opponent'} <small>Player ${key}</small></header>
    <button class="sanctum__domain ${key === viewer() && phoneUp() && domainUses(key).some(u => !u.why) ? 'is-usable' : ''}" data-domain="${key}" style="--art:url('${f?.ilustracao ? forgeArt(f.ilustracao) : ''}')" data-tip="${esc(`Domain|${dom?.name || '—'}. Click to view the card.`)}">
      <small>Domain</small><strong>${esc(dom?.name || '—')}</strong></button>
    <div class="cosmo" data-bank="${key}" style="--burn:${burn}">
      ${row(`rail__row--cosmo ${ready ? '' : 'is-zero'}`, `<i class="rail__sym rail__sym--base"></i><img class="cosmo__sigil" src="../../CARD-TEMPLATE/athena/gem_cost.png" alt="">`, `Cosmo Base${pooled ? `<em class="rail__pool">Pool ${pooled}</em>` : ''}`, `${ready}<small>/${p.bases.length}</small><span class="cosmo__pips">${pips}</span>`,
        `Cosmo Base|${ready} of ${p.bases.length} prepared${pooled ? `, ${pooled} burning in your pool` : ''}. Prepared Bases pay card and ability costs. Click a Base on the field to burn it into your pool. Once per round you may place a Cosmoble card as a Base.`, 'data-bank-unit="base"')}
      ${row(`rail__row--latent ${p.latent ? '' : 'is-zero'}`, `<i class="rail__sym rail__sym--latent"></i>${flames}`, 'Latent', `${p.latent}<small>/3</small>`, `Latent Cosmo|${p.latent} of 3 stored. At round end, unused Bases can be stored here.`, 'data-bank-unit="latent"')}
    </div>
    ${row(`zdeck ${n ? '' : 'is-empty'}`, '<i class="zdeck__back"></i>', 'Deck', n, `Deck|${plural(n, 'card')} left. Each player draws 2 cards per turn.`, `data-deck="${key}" style="${sleeveVar(key)}"`)}
    ${row('rail__row--hand', '<i class="rail__hand"></i>', 'Hand', p.hand.length, `Hand|${plural(p.hand.length, 'card')}.`)}
    ${row('zpile zpile--tartarus', '<img class="zicon" src="./assets/tartarus.png" alt="">', 'Tartarus', p.tartarus.length, `Tartarus|${plural(p.tartarus.length, 'card')}. Destroyed Devotees go here. Afterlife abilities work from here. Click to view.`, `data-pile="${key}:tartarus"`)}
    ${row('zpile zpile--void', '<img class="zicon" src="./assets/void.png" alt="">', 'Void', p.void.length, `Void|${plural(p.void.length, 'card')}. Exiled cards go here. Click to view.`, `data-pile="${key}:void"`)}
  </section>`;
}
// Ativadas do Domain e o motivo de não poder agora; a engine valida de novo no activate.
// "Resonance — Athena: …" vira título "Ressonância: Athena" (autor, 01/11/2026).
const resonanceTitle = a => { const m = /^(?:resonance|ressonância)$/i.test(a.name) && a.text.match(/^([^:]{2,24}):\s*/); return m ? {name: `${a.name}: ${m[1]}`, text: a.text.slice(m[0].length)} : a; };
function domainUses(key) {
  const s = S(), dom = domainEntry(s, key), mine = key === viewer(), idle = mine && idleFor(key);
  const use = (v6, uid, res) => {
    let why = !mine ? 'Opponent\u2019s ability.' : !idle ? "Wait for your turn's main phase."
      : res ? (s.roundUses.has(resonanceTag(s, key, 'activate')) ? 'Already used this turn.' : '') : v6.once && s.roundUses.has(`ability:${uid}`) ? 'Already used this round.' : '';
    if (!why && !affordable(key, mixed({amount: v6.cost || 0, unit: 'base'}))) why = `Needs ${v6.cost} Cosmo (Base and/or Latent).`;
    if (!why) try { v6.check?.(s, ctx, key, uid, {}); } catch { why = 'Needs a legal target.'; }
    return {uid, res, name: v6.name, cost: v6.cost || 0, why};
  };
  return [dom?.activate && use(dom.activate, `domain:${key}`, false), dom?.res && use(dom.res, `domain:${key}:res`, true)].filter(Boolean);
}
// Em pé, tocar no Domain (autor, 01/11/2026): habilidades no mesmo formato dos atalhos do Deus; o que dá para usar fica aceso.
function showDomainSheet(key) {
  const f = FORGE.get(S().domains[key]);
  if (!f) return;
  closeBigCard(); hideInspect();
  const uses = domainUses(key), parse = t => { const [name, ...rest] = t.split(' — '); return {name, text: rest.join(' — ')}; };
  const shown = displayCard(f).habilidades_en || [];
  const rows = (f.habilidades_en || []).map((t, i) => {
    const en = parse(t), pt = resonanceTitle(parse(shown[i] || t)), u = uses.find(a => (/^resonance/i.test(en.name) ? a.res : !a.res && a.name.toLowerCase() === en.name.toLowerCase()));
    const off = /^resonance/i.test(en.name) && !u; // Ressonância com Deus de outra facção
    return {u, order: u ? u.cost : off ? 90 : 99, html: `<button class="gs-act ${u ? (u.why ? 'is-locked' : 'is-ready') : off ? 'is-locked' : 'is-active'}" ${u && !u.why ? `data-gs="${u.uid}"` : 'aria-disabled="true"'}>
      <span class="gs-act__cost">${u ? u.cost : '✦'}</span><span class="gs-act__txt"><strong>${esc(pt.name)}</strong><small>${esc(u ? u.why || 'Ready · click to use' : off ? 'Only with a God of this faction.' : 'Always on')}</small><span class="gs-act__rule card-text">${inlineMarkup(pt.text)}</span></span></button>`};
  }).sort((a, b) => a.order - b.order);
  const box = document.createElement('div');
  box.id = 'bigcard'; box.className = 'bigcard god-sheet';
  box.innerHTML = `<section class="gs" role="dialog" aria-label="${esc(displayCard(f).nome_exibicao_en || f.nome_exibicao_en || '')}">
    <header class="gs__head"><div class="gs__face gs__face--domain" style="background-image:url('${f.ilustracao ? forgeArt(f.ilustracao) : ''}')"></div><div class="gs__who"><small class="gs__kind">Domain</small><h2>${esc(displayCard(f).nome_exibicao_en || f.nome_exibicao_en || '')}</h2></div></header>
    <div class="gs__acts">${rows.map(r => r.html).join('')}</div>
    <div class="gs__foot"><button class="ghost" data-gs="full">See full card</button><button class="ghost" data-gs="close">Close</button></div></section>`;
  box.addEventListener('pointerdown', e => { if (e.target === box) { swallowClickUntil = Date.now() + 400; closeBigCard(); } });
  box.addEventListener('click', e => {
    const g = e.target.closest('[data-gs]')?.dataset.gs;
    if (g === undefined) return;
    if (g === 'close') return closeBigCard();
    if (g === 'full') return showDomainCard(key);
    closeBigCard();
    act({type: 'activate', key, uid: g, choice: {}});
  });
  document.body.append(box);
}
function showDomainCard(key) {
  const f = FORGE.get(S().domains[key]);
  if (!f) return;
  closeBigCard(); hideInspect();
  const box = document.createElement('div');
  box.id = 'bigcard'; box.className = 'bigcard';
  // Domain: botão da ativada da linha geral e da Ressonância (rebalanceamento, autor 01/11/2026), no seu turno e com a mesa parada.
  // Com God de outra facção, domainEntry tira a Ressonância; o texto das duas linhas vem da carta (renderLiveCard).
  const dom = domainEntry(S(), key), idle = key === viewer() && idleFor(key);
  const uses = [dom?.activate && [`domain:${key}`, dom.activate.name], dom?.res && [`domain:${key}:res`, 'Resonance']].filter(Boolean);
  box.innerHTML = `<div class="dcard dcard--big art-full">${renderLiveCard(f, {art: f.ilustracao && forgeArt(f.ilustracao)})}</div>
    ${idle ? uses.map(([uid, name]) => `<button class="primary-action bigcard__use" data-domain-use="${uid}">Use ${esc(name)}</button>`).join('') : ''}`;
  box.querySelectorAll('[data-domain-use]').forEach(b => b.addEventListener('pointerdown', e => { e.stopPropagation(); closeBigCard(); act({type: 'activate', key, uid: b.dataset.domainUse, choice: {}}); }));
  box.addEventListener('pointerdown', closeBigCard);
  box.addEventListener('contextmenu', e => { e.preventDefault(); closeBigCard(); });
  document.body.append(box);
}


// Bases de Cosmo como terrenos: cartas viradas numa faixa do lado do dono; Base gasta fica deitada (tapped)
// e levanta quando prepara. O pagamento escolhe as Bases sozinho (são equivalentes); a animação mostra quais viraram.
const laneSeen = new Map(); // uid da Base -> prepared no último render (para animar só a mudança)
function cosmoLane(key, side) {
  const bases = S().players[key].bases, pool = new Set(S().players[key].pool || []);
  const slots = bases.map(b => {
    const was = laneSeen.get(b.uid), anim = was === undefined ? 'is-new' : was !== b.prepared ? (b.prepared ? 'is-untapping' : 'is-tapping') : '';
    laneSeen.set(b.uid, b.prepared);
    // Base fica virada (autor, 28/10/2026): o verso para todos; o dono consulta passando o mouse (data-base).
    const face = `<div class="dcard dcard--back dcard--land" ${ctx.objects[b.uid] ? `data-base="${b.uid}"` : ''}><span></span></div>`;
    const pooled = b.prepared && pool.has(b.uid), mine = key === viewer();
    const tip = !b.prepared ? 'Cosmo Base|Used. Readies at the start of your turn.' : pooled ? 'Cosmo Base|Burning in your pool: your next cost uses it first. Click to take it back.'
      : mine ? 'Cosmo Base|Prepared. Click to burn its Cosmo into your pool.' : 'Cosmo Base|Prepared.';
    // Cosmo Oculto (§4A): o dono joga a carta direto da Base pelo selo; brilha quando dá para jogar agora.
    const x = mine && ctx.objects[b.uid] && info(b.uid).hiddenCosmo, why = x && hiddenReason(key, b.uid);
    const hidden = x ? `<button class="lane__hidden ${why ? '' : 'is-ready'}" data-hidden-lane="${b.uid}" data-tip="Hidden Cosmo {${x}}|${esc(why || 'Cast this card from your Cosmo Base.')}">✦${x}</button>` : '';
    return `<div class="lane__base ${b.prepared ? '' : 'tapped'} ${pooled ? 'pooled' : ''} ${anim}" data-slot="${b.uid}" data-tip="${tip}">${face}${hidden}</div>`;
  }).join('');
  return `<section class="lane lane--${side}" data-lane="${key}" style="--n:${bases.length};${sleeveVar(key)}" aria-label="Player ${key} Cosmo Bases">${slots || '<p class="lane__empty">Cosmo Bases</p>'}</section>`;
}
// Faixa do God (autor, 28/10/2026): Bases à esquerda do God; equipamento solto continua no campo.
function fieldRow(key) {
  const s = S(), p = s.players[key];
  const units = p.battlefield.filter(u => !ctx.attached[u]).map(u => {
    // Equipamento preso: mini-token com arte, nome e bônus, ligado ao portador (clique abre o inspetor da carta).
    const gear = gearOf(ctx, u).map(g => {
      const f = FORGE.get(ctx.objects[g].cardId), bonus = f && armorBonusText({...f, ...printedBonusFields(f)});
      return `<div class="gear ${info(g).armor ? 'gear--armor' : ''}" data-uid="${g}" tabindex="0" aria-label="${esc(info(g).name)}${bonus ? ` · ${esc(bonus)}` : ''}"${f ? ` style="${tokenArt(f)}"` : ''}><span>${esc(info(g).name)}</span>${bonus ? `<b>${esc(bonus)}</b>` : ''}</div>`;
    }).join('');
    return `<div class="slot">${cardFace(u, {field: true})}${gear ? `<div class="gears">${gear}</div>` : ''}</div>`;
  }).join('');
  return `<section class="field field--${key === viewer() ? 'me' : 'opp'}" data-field="${key}" aria-label="Player ${key} battlefield">${units || '<p class="field__empty">No Devotees</p>'}</section>`;
}

function handRow(key, hidden) {
  const hand = S().players[key].hand, n = hand.length;
  return `<div class="hand hand--${hidden ? 'opp' : 'me'}" data-hand="${key}" style="--n:${n};${sleeveVar(key)}">${hand.map((u, i) => {
    const playable = !hidden && !playableReason(key, u), base = !hidden && canBase(key, u);
    return `<div class="hand__slot ${playable ? 'playable' : ''} ${base ? 'baseable' : ''}" style="--i:${i}">${cardFace(u, {hidden, size: hidden ? 'dcard--sm' : ''})}</div>`;
  }).join('')}</div>`;
}

function phaseText() {
  const s = S();
  if (s.victory) return 'Match over';
  if (s.setup) return `Mulligan · Player ${s.setup[0]}`;
  if (s.window) return `${s.chain.length ? `Chain of ${s.chain.length} · ` : ''}Response window · Player ${s.window.priority} to act`;
  return `Round ${s.round} · Player ${s.active} · Main`;
}

// Faixa de fases acima do End Turn (padrão de cliente digital de TCG): de quem é o turno, as fases do turno com a
// atual acesa e, quando há, a janela de resposta. Prepare e Draw são automáticas; End = janela aberta pela End Phase.
const PHASES = ['Prepare', 'Draw', 'Main', 'End']; // Strike é ação da Main, não fase
function currentPhase(s) {
  for (let i = s.events.length - 1; i >= 0; i--) {
    const t = s.events[i].type;
    if (t === 'turn_start') break;
    if (t === 'end_phase') return 'End';
  }
  return 'Main';
}
function phaseBar() {
  const s = S(), v = viewer();
  if (s.victory || s.setup) return `<div class="phasebar"><div class="phasebar__turn">${esc(phaseText())}</div></div>`;
  const now = PHASES.indexOf(currentPhase(s)), mine = s.active === v;
  return `<div class="phasebar ${mine ? 'is-mine' : 'is-theirs'}" aria-label="${esc(phaseText())}">
    <div class="phasebar__turn"><strong>${mine ? 'Your turn' : `Opponent's turn`}</strong><small>Round ${s.round} · Player ${s.active}</small></div>
    <ol class="phasebar__steps">${PHASES.map((p, i) => `<li class="${i < now ? 'done' : i === now ? 'on' : ''}">${p}</li>`).join('')}</ol>
    ${s.window ? `<div class="phasebar__window">${s.chain.length ? `Chain of ${s.chain.length} · ` : ''}Response · Player ${s.window.priority} to act</div>` : ''}
  </div>`;
}

// Arte de cada item da cadeia (autor, 30/10/2026): carta de origem; Domain pelo catálogo; God pelo projeto do Forge.
// Cor do brilho do lado de quem joga o turno, pelo God (autor, 31/10/2026): r, g, b.
// Área de conjuração na cor e no tema do God de quem conjura (autor, 31/10/2026).
const godFx = key => { const g = S().divine?.[key]?.god || 'god-athena'; return `data-godfx="${g.slice(4)}" style="--glow:${GOD_GLOW[g] || GOD_GLOW['god-athena']}"`; };
const GOD_GLOW = {'god-athena': '255, 205, 100', 'god-poseidon': '90, 180, 255', 'god-hades': '170, 100, 255', 'god-ares': '255, 90, 70', 'god-artemis': '170, 240, 210'};
// Morte do God (autor, 31/10/2026): quem perdeu (os dois no empate); a metade dele da arena vira ruína com o tema do deus.
const losers = s => (!s.victory ? [] : s.victory.draw ? s.order : s.order.filter(k => k !== s.victory.winner));
const ruin = (key, done) => { const g = S().divine?.[key]?.god || 'god-athena'; return `<div class="ruin ruin--${key === viewer() ? 'me' : 'opp'} ruin--${g.slice(4)} ${done ? 'is-done' : ''}" style="--glow:${GOD_GLOW[g] || GOD_GLOW['god-athena']}" aria-hidden="true"></div>`; };
function chainArt(c) {
  const s = S(), uid = String(c.uid || '');
  const id = ctx.objects[uid]?.cardId || (uid.startsWith('domain:') ? s.domains?.[uid.slice(7)] : null);
  const f = (id && FORGE.get(id)) || FORGE.get(`${cards.get(s.gods[c.controller])?.name.toLowerCase()}-001`);
  return f?.ilustracao ? forgeArt(f.ilustracao) : '';
}

// Comando (canto inferior direito): relógio das Doze Casas acima do botão de ações.
function command() {
  const s = S(), v = viewer();
  // Botão único estilo Arena (autor, 31/10/2026): o texto diz a próxima ação; azul quando é a sua vez de responder.
  let label = 'End Turn', state = 'end';
  if (s.victory) { label = 'Match over'; state = 'wait'; }
  else if (aiControls()) { label = s.active === v ? 'Opponent thinking…' : "Opponent's turn"; state = 'wait'; }
  else if (s.setup) label = marked.size ? `Return ${marked.size}` : 'Keep Hand';
  else if (s.window) { label = s.chain.length ? 'Resolve' : 'Pass'; state = 'respond'; }
  return `<aside class="command" aria-label="Turn actions">
    <div class="command__clock">${clockMarkup()}</div>
    ${phaseBar()}
    <button class="action-btn" data-primary data-state="${state}" ${s.victory || aiControls() ? 'disabled' : ''}><span>${esc(label)}</span><i aria-hidden="true">›</i></button>
    <button class="command__full" data-full-control aria-pressed="${!settings.autoPass}" title="Full control: stop at every priority window, even with no possible response">Full control</button>
    <button class="command__more" data-toggle-tools aria-expanded="${toolsOpen}" aria-label="Options">${GEAR_SVG}</button>
    <div class="command__tools${toolsOpen ? ' is-open' : ''}"><button data-toggle-log aria-pressed="${logOpen}">Log</button><button data-toggle-settings>Settings</button>${match && !s.victory ? '<button class="tools__concede" data-concede>Concede</button>' : ''}<button data-leave>Leave</button></div>
  </aside>`;
}

// Painel de controle entre os trilhos (autor, 31/10/2026): a dica da fase lista só o que dá para fazer agora (clicar acende
// as cartas), a pilha fica aqui (topo primeiro, LIFO D186; APNAP §56) e, com decisão, o painel de trigger ocupa o mesmo lugar.
let ctrlOpen = false, hintRefs = {};
const HINTS = {
  base: ['PLACE A COSMO BASE', 'Once per turn: turn a card from your hand into a Cosmo Base.'],
  devotee: ['PLAY A DEVOTEE', 'Pay its cost with your ready Cosmo Bases.'],
  equip: ['EQUIP', 'Attach an Equipment or Cloth to one of your Devotees.'],
  technique: ['CAST A TECHNIQUE', 'Only on your turn, with the chain empty.'],
  moment: ['CAST A MOMENT', 'Now, or later as a response.'],
  strike: ['STRIKE', 'A Prepared Devotee Strikes an enemy Devotee or God.'],
  ability: ['USE AN ABILITY', '{T} and Cosmo abilities on your cards.'],
  ultimate: ['ULTIMATE', "Your God's once-per-match power is ready."],
  end: ['END TURN', "When you're done."],
};
function phaseHints() {
  const s = S(), v = viewer(), p = s.players[v], phase = currentPhase(s);
  const hand = (test) => p.hand.filter(u => !playableReason(v, u) && test(info(u), u)).map(u => `.hand [data-uid="${u}"]`);
  const moments = hand((c, u) => c.kind === 'Spell' && spellCat(u)?.category === 'Moment');
  if (s.setup) return {title: 'OPENING HAND', note: 'Send any cards to the bottom and draw that many. Once.', refs: {}};
  if (s.window && s.window.priority === v) return {title: 'RESPOND', note: 'Play a Moment, paid with Latent Cosmo, or Pass. When both players pass, the top of the chain resolves.', refs: {moment: moments}};
  if (s.active !== v) return {title: `OPPONENT'S ${phase.toUpperCase()} PHASE`, note: moments.length ? 'You can respond with a Moment when you get priority.' : '', refs: {}};
  if (phase !== 'Main') return {title: `${phase.toUpperCase()} PHASE`, note: {Prepare: 'Your Cosmo Bases and Devotees become Prepared.', Draw: 'You draw 2 cards.', End: 'End-of-turn effects resolve.'}[phase], refs: {}};
  const field = p.battlefield.filter(u => ctx.objects[u]);
  return {title: 'MAIN PHASE', note: '', refs: {
    base: p.hand.filter(u => canBase(v, u)).map(u => `.hand [data-uid="${u}"]`),
    devotee: hand(c => c.kind === 'Devotee'),
    equip: hand(c => c.kind === 'Equipment'),
    technique: hand((c, u) => c.kind === 'Spell' && spellCat(u)?.category !== 'Moment'),
    moment: moments,
    strike: idleFor(v) ? field.filter(u => info(u).kind === 'Devotee' && strikeTargets(s, ctx, u).length).map(u => `.field [data-uid="${u}"]`) : [],
    ability: field.filter(u => cardAbilities(u).some(a => !a.why)).map(u => `.field [data-uid="${u}"]`),
    ultimate: godActions(v).ultimate.ok ? [`[data-god="${v}"] .godhud__portrait`] : [],
    end: idleFor(v) ? ['[data-primary]'] : [],
  }};
}
function controlPanel() {
  const s = S();
  if (s.victory) return '';
  const busy = false; // painel de trigger e carta em conjuração ficam na coluna da direita (autor, 31/10/2026)
  const h = phaseHints();
  hintRefs = h.refs;
  const items = Object.entries(h.refs).filter(([, r]) => r.length).map(([id, r]) => `<li><button class="ctrl__hint" data-hint="${id}" aria-label="${esc(HINTS[id][0])}: highlight ${r.length}"><strong>${esc(HINTS[id][0])}</strong><span>${inlineMarkup(HINTS[id][1])}</span></button></li>`).join('');
  const tips = settings.phaseTips;
  if (!tips && !s.window) return '';
  // Com pilha, ela ocupa o box e a dica encolhe numa linha.
  return `<section class="ctrl ${busy ? 'is-busy' : ''} ${ctrlOpen ? 'is-open' : ''} ${s.window ? 'has-chain' : ''}" aria-label="Control panel">
    ${tips ? `<button class="ctrl__head" data-ctrl-toggle aria-expanded="${ctrlOpen}"><small>${s.active === viewer() ? 'Your turn' : `Player ${s.active}'s turn`}</small><strong>${esc(h.title)}</strong></button>
      ${h.note ? `<p class="ctrl__note">${inlineMarkup(h.note)}</p>` : ''}${items && !s.window ? `<ul class="ctrl__hints">${items}</ul>` : ''}` : ''}
    ${s.window ? `<div class="priority ctrl__chain"><small>Priority</small><strong>${s.window.priority === viewer() ? 'You' : settings.ai !== 'none' ? 'AI' : `Player ${s.window.priority}`}</strong></div>` : ''}
  </section>`;
}
// Clique numa dica: acende por 2,5 s as cartas e botões que fazem aquela ação.
function flashHint(id) {
  if (ctrlOpen) { ctrlOpen = false; render(); } // celular: fecha o box para a mesa aparecer
  const els = (hintRefs[id] || []).flatMap(sel => $$(sel));
  els.forEach(el => { el.classList.remove('hint-glow'); void el.offsetWidth; el.classList.add('hint-glow'); });
  setTimeout(() => els.forEach(el => el.classList.remove('hint-glow')), 2500);
}

// Relógio das Doze Casas: 12 tochas de 15 s (3 minutos); acesas = tempo restante de quem decide (mapeamento G3-028).
const SIGNS = '♈♉♊♋♌♍♎♏♐♑♒♓';
function clockMarkup() {
  const torches = Array.from({length: 12}, (_, i) => {
    const a = (i / 12) * 360 - 90;
    return `<i class="torch" data-torch="${i}" style="--a:${a}deg"><span></span></i>`;
  }).join('');
  const glyphs = [...SIGNS].map((g, i) => `<b style="--a:${(i + .5) / 12 * 360 - 90}deg">${g}&#xFE0E;</b>`).join('');
  // Tempo no centro do mostrador, dentro do anel de signos e chamas.
  return `<div class="zclock" data-clock role="timer" aria-live="off"><div class="zclock__dial">${glyphs}</div>${torches}
    <div class="zclock__time"><b data-clock-time>--:--</b><small data-clock-label>Turn</small></div></div>`;
}

// Slot de conjuração: a carta jogada fica aqui, fora do campo, até o alvo ser escolhido; dela sai a seta.
function castSlot() {
  const bp = mode && boardPick();
  if (!bp?.uid && !bp?.god) return '';
  const by = bp.god ? cards.get(S().gods[bp.god])?.name : info(bp.uid).name;
  return `<div class="cast-slot" ${godFx(bp.god || owner(bp.uid))} role="dialog" aria-label="Casting ${esc(by)}"><i class="cast-aura" aria-hidden="true"></i>${bp.god ? zoomFace({uid: '', controller: bp.god}) : cardFace(bp.uid, {size: 'dcard--lg'})}
    <div class="cast-prompt">${choicePrompt(false)}${bp.refs.length ? '<small class="cast-prompt__how">Click a glowing target or drag the card to it</small>' : ''}</div></div>`;
}

// Instrução da escolha. Com carta sendo conjurada, vai presa a ela (castSlot), fora do campo; senão, barra no topo da mesa.
function choicePrompt(withName = true) {
  const step = mode.steps[mode.i];
  const name = mode.title || (mode.uid ? info(mode.uid).name : '');
  let controls = '';
  if (step.options) controls = Object.entries(step.options).map(([v, l]) => `<button data-mode="${v}">${esc(l)}</button>`).join('');
  else if (step.confirm) controls = '<button data-confirm="yes">Yes</button><button data-confirm="no">No</button>';
  else if (step.multi) controls = `<button data-done>Done (${mode.picked.length}/${step.multi})</button>`;
  else if (step.optional) controls = '<button data-done>OK</button>';
  const steps = mode.steps.length > 1 ? `<small class="choice__step">Step ${mode.i + 1} of ${mode.steps.length}</small>` : '';
  return `${withName ? `<strong>${esc(name)}</strong>` : ''}${steps}<span class="choice__label"><i class="choice__reticle" aria-hidden="true"></i>${esc(step.label || step.confirm || 'Choose one')}</span><div class="choice__actions">${controls}<button class="ghost" data-cancel>Cancel <kbd>Esc</kbd></button></div>`;
}
function choiceBar() {
  const bp = mode && boardPick();
  if (!mode || bp?.uid || bp?.god) return '';
  return `<div class="choice" role="dialog" aria-label="Choose">${choicePrompt()}</div>`;
}

// ---------- Cara ou coroa (§55) ----------
// Fora do overlayRoot: lá cada render troca o innerHTML e reiniciaria a animação. 'flip' → 'landed' → null (aí vem a mão inicial).
const COIN_TOLD = 1800;
const coinRoot = Object.assign(document.createElement('div'), {className: 'overlay coin', hidden: true});
overlayRoot.after(coinRoot);
let coinStage = null, coinTimer = null, coin3d = null, coinRun = 0;
coinRoot.addEventListener('click', e => {
  const go = e.target.closest('[data-coin]')?.dataset.coin, c = S().coin;
  if (go && coinStage === 'landed' && !c.first) act({type: 'chooseFirst', key: c.winner, choice: {goFirst: go === 'first'}});
});
async function startCoin() {
  const run = ++coinRun, c = S().coin, still = settings.reduceMotion;
  clearTimeout(coinTimer); coinTimer = null;
  coin3d?.dispose(); coin3d = null;
  coinRoot.textContent = '';
  coinStage = c ? 'flip' : null;
  if (!c) return;
  coinRoot.innerHTML = '<div class="coin__air" aria-hidden="true"></div><div class="coin__text" role="status"></div>';
  const air = coinRoot.firstChild, wait = ms => new Promise(done => setTimeout(done, ms));
  const made = await createCoin3D(air, {winner: c.winner, faces: {A: coinArt('A'), B: coinArt('B')}, still});
  if (run !== coinRun) return made?.dispose();
  coin3d = made;
  if (made) await Promise.race([made.toss(), wait(COIN_TOSS_MS + 1000)]); // aba escondida não anda o rAF; a partida não espera por ela
  else { // sem WebGL: moeda em CSS
    air.innerHTML = `<div class="coin__disc" style="--coin-end:${c.winner === 'A' ? 1800 : 1980}deg"><b class="coin__face">Heads</b><b class="coin__face coin__face--tails">Tails</b></div>`;
    if (!still) await wait(COIN_TOSS_MS);
  }
  if (run !== coinRun) return;
  coinStage = 'landed';
  render();
}
function coinText(c) {
  const hot = !online && settings.ai === 'none', mine = online ? online.key : hot ? c.winner : human();
  const who = k => (hot ? `Player ${k}` : k === mine ? 'You' : 'Opponent');
  const faces = `<p class="coin__sides"><span>Heads</span> <span>${who('A')}</span> · <span>Tails</span> <span>${who('B')}</span></p>`;
  if (coinStage === 'flip') return `<h2>Coin toss</h2>${faces}`;
  if (c.first) return `<h2>${hot ? `Player ${c.first} goes first` : c.first === mine ? 'You go first' : 'Opponent goes first'}</h2>${faces}`;
  if (c.winner !== mine) return `<h2>Opponent won the toss</h2><p>Your opponent is choosing…</p>`;
  return `<h2>${hot ? `Player ${c.winner} won the toss` : 'You won the toss'}</h2><p>Choose who goes first.</p>${online ? "<p>If you don't choose in time, you go first.</p>" : ''}
    <div class="row"><button class="primary-action" data-coin="first">Go first</button><button class="ghost" data-coin="second">Go second</button></div>`;
}
function paintCoin() {
  const c = S().coin;
  coinRoot.hidden = !coinStage || !c;
  document.body.classList.toggle('is-coin-toss', !coinRoot.hidden);
  if (coinRoot.hidden) { coin3d?.dispose(); coin3d = null; return; }
  if (coinStage === 'landed' && c.first && !coinTimer) {
    say(`Player ${c.winner} wins the toss. Player ${c.first} goes first.`);
    coinTimer = setTimeout(() => { coinTimer = null; coinStage = null; render(); focusDecision(); }, COIN_TOLD);
  }
  const text = coinRoot.querySelector('.coin__text'), html = coinText(c);
  if (text.dataset.html !== html) { text.dataset.html = html; text.innerHTML = html; text.querySelector('button')?.focus(); }
}

function overlays() {
  const s = S();
  let html = '';
  // Só a mão de quem está olhando: contra a IA ou online, a mão inicial do adversário nunca aparece (hot-seat mostra a de quem decide).
  if (s.setup && !coinStage && s.setup[0] === (online ? online.key : viewer())) {
    const key = s.setup[0];
    html += `<div class="overlay mulligan"><h2>Player ${key} · Opening hand</h2><p>${phoneUp() ? 'Tap the cards you want to swap. Hold to read. Once.' : 'Send any number of cards to the bottom of your deck, shuffle and draw that many. Once.'}</p>
      <div class="mulligan__cards">${s.players[key].hand.map(u => `<button class="mull ${marked.has(u) ? 'marked' : ''}" data-mull="${u}">${cardFace(u, {size: 'dcard--lg'})}</button>`).join('')}</div>
      <button class="primary-action" data-primary>${marked.size ? `Return ${marked.size} and draw` : 'Keep hand'}</button></div>`;
  }
  if (s.victory) {
    html += `<div class="overlay victory"><h2>${s.victory.draw ? 'Draw' : `Player ${s.victory.winner} wins`}</h2>${s.victory.reason === 'deck_out' ? '<p><span>Empty deck</span></p>' : ''}<p>Round ${s.round} · Soul ${s.order.map(k => `${k} ${s.players[k].soul}`).join(' · ')}</p>
      <div class="row"><button class="primary-action" data-new>New match</button><a class="ghost" href="../">Main menu</a></div></div>`;
  }
  if (pending && !s.victory && pending.pending.player !== settings.ai) html += decisionModal();
  else html += orderPanel();
  if (logOpen) html += `<div class="drawer log" aria-label="Match log"><h3>Match log</h3><button class="drawer__x" data-toggle-log aria-label="Close log">×</button>${logLines.slice(-150).reverse().map(l => `<p><small>R${l.round}</small> ${esc(l.text)}</p>`).join('')}</div>`;
  // Engrenagem de opções sempre visível no canto superior direito, como no MTG Arena (autor, 31/10/2026).
  html += `<button class="gear-btn" data-toggle-settings aria-label="Options" aria-expanded="${settingsOpen}">${GEAR_SVG}</button>`;
  if (settingsOpen) {
    const sel = (key, opts) => `<select data-setting="${key}">${Object.entries(opts).map(([v, l]) => `<option value="${v}" ${settings[key] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const chk = (key, l) => `<label class="set"><span>${l}</span><input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''}></label>`;
    html += `<div class="drawer settings" role="dialog" aria-label="Settings"><h3>Settings</h3><button class="drawer__x" data-toggle-settings aria-label="Close settings">×</button>
      <label class="set"><span>Full screen</span><input type="checkbox" data-fullscreen ${document.fullscreenElement ? 'checked' : ''}></label>
      ${window.ssI18n ? `<label class="set"><span>Language</span><select data-setting="lang">${Object.entries(window.ssI18n.LANGS).map(([v, l]) => `<option value="${v}" ${window.ssI18n.lang === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
      ${window.ssStage?.desktop ? `<label class="set"><span>Resolution</span><select data-setting="resolution">${Object.entries(window.ssStage.LIST).map(([v, l]) => `<option value="${v}" ${window.ssStage.get() === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
      <label class="set"><span>Graphics</span>${sel('quality', {low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra'})}</label>
      <label class="set"><span>Arena</span>${sel('theme', Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.label])))}</label>
      <label class="set"><span>God of Player B (new match)</span>${sel('godB', {'god-athena': 'Athena', 'god-poseidon': 'Poseidon · fixture deck'})}</label>
      <label class="set"><span>Opponent (new match)</span>${sel('ai', {B: 'AI plays Player B', none: 'Hot-seat (two humans)'})}</label>
      <label class="set"><span>AI difficulty</span>${sel('aiLevel', {easy: 'Easy', normal: 'Normal', hard: 'Hard'})}</label>
      <label class="set"><span>Animation speed</span>${sel('speed', {fast: 'Fast', normal: 'Normal', cinematic: 'Cinematic'})}</label>
      ${chk('phaseTips', 'Phase tips (control panel)')}${chk('autoPass', 'Auto-pass when you have no response (off = Full control)')}${chk('castGrace', 'Time to cancel a cast (3 s)')}${chk('skipDraws', 'Skip draw animations')}${chk('showActivity', 'Show opponent activity')}${window.ssStage ? `<label class="set"><span>Card text size</span>${sel('cardText', window.ssStage.SIZES)}</label><label class="set"><span>Card size (hand and previews)</span>${sel('cardSize', window.ssStage.CARD)}</label>` : ''}${chk('reduceMotion', 'Reduce motion')}${chk('reduceFlashes', 'Reduce flashes')}${chk('hideOpponent', 'Hide the other hand (hot-seat)')}${chk('timeouts', 'Apply clock timeouts')}
      <label class="set"><span>Screen shake</span><input type="range" min="0" max="1.5" step=".25" value="${settings.shake}" data-setting="shake"></label>
      <p class="stats" data-stats>${scene ? 'WebGL on' : 'WebGL off · 2D fallback'}</p>
      <div class="settings__end">${match && !S().victory ? '<button class="settings__concede" data-concede>Concede</button>' : ''}<button data-toggle-settings>Close</button></div></div>`;
  }
  return html;
}

// Último lugar visto da carta que sai da mão ou do slot de conjuração: o render seguinte já a tirou de lá, e é dali
// que ela voa para a direita (slot ou pilha), como no Arena.
const seenAt = new Map();
const keepRect = n => { const r = n?.getBoundingClientRect(); if (r?.width) seenAt.set(n.dataset.uid, {r, t: performance.now()}); };
const seenRect = uid => { const v = seenAt.get(uid); return v && performance.now() - v.t < 20000 ? v.r : null; };
addEventListener('pointerdown', e => keepRect(e.target.closest?.('.hand .dcard[data-uid]')), true);
// PADRÃO DO JOGO (autor, 31/10/2026): toda carta que entra no ponto da pilha (cast seu ou do oponente, gatilho, gatilho
// com decisão) usa este mesmo voo, igual ao MTG Arena. Não criar animação de entrada paralela.
const flyFrom = (node, a, pause = 0) => {
  const b = node?.getBoundingClientRect();
  if (!a?.width || !b?.width || settings.reduceMotion) return;
  const start = `translate(${a.left + a.width / 2 - b.left - b.width / 2}px, ${a.top + a.height / 2 - b.top - b.height / 2}px) scale(${a.width / b.width}) rotate(-4deg)`;
  const ms = 560 + pause, p = pause / ms;
  node.animate([
    {transform: start, filter: 'brightness(1.3)'}, ...(pause ? [{transform: start, filter: 'brightness(1.3)', offset: p}] : []),
    {transform: 'translate(0, -6px) scale(1.04) rotate(1deg)', filter: 'brightness(1.2)', offset: p + (1 - p) * .75},
    {transform: 'none', filter: 'brightness(1)'}], {duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)'});
};
// Cast estilo Arena (autor, 31/10/2026): a carta solta pelo arraste fica parada onde caiu até a pilha (ou o slot de
// conjuração) aparecer; então voa dali, sem sumir no meio. Se nada a reclamar em 4s (jogada recusada), some.
let held = null;
const holdCast = (uid, ghost) => {
  dropHeld();
  ghost.classList.add('cast-hold');
  held = {uid, el: ghost, at: performance.now(), timer: setTimeout(dropHeld, 4000)};
};
function dropHeld() { if (held) { clearTimeout(held.timer); held.el.remove(); held = null; } }
const takeHeld = uid => {
  if (held?.uid !== uid) return null;
  const r = held.el.getBoundingClientRect();
  r.pause = Math.max(0, 250 - (performance.now() - held.at)); // parada curta no ponto de soltura, como no Arena
  dropHeld();
  return r;
};
// Pouso no campo: a carta da mesa só aparece quando a que voa da pilha chega (sem carta dupla).
const landing = new Set();
let slotUid = null;

let lifted = null;
function render() {
  if (!aim) $('.aim-follow')?.remove(); // a seta de mira volta no próximo movimento do mouse, se ainda houver alvo
  if (render.lock) return;
  keepRect($('.cast-slot .dcard[data-uid]'));
  syncZoom();
  document.body.classList.toggle("reduce-motion", !!settings.reduceMotion);
  const s = S(), me = viewer(), them = other(me);
  if (mode) { const step = mode.steps[mode.i]; mode.options = step?.pick ? candidates(step, mode.key).filter(u => !mode.picked.includes(u)) : []; }
  // Morph em vez de innerHTML: só o que mudou é trocado; imagens, animações CSS e camadas da GPU sobrevivem ao render (medição de 31/10/2026).
  Idiomorph.morph(boardRoot, `
    <div class="olympus ${mode ? 'is-choosing' : ''} ${pending ? 'is-deciding' : ''} ${losers(s).map(k => `fallen-${k === me ? 'me' : 'opp'}`).join(' ')}" ${pending && !pending.peek ? 'data-locked' : ''}>
      ${handRow(them, settings.hideOpponent || settings.ai === them)}
      <main class="arena-field">${fieldRow(them)}<div class="midline"></div>${fieldRow(me)}</main>
      <div class="band band--opp">${cosmoLane(them, 'opp')}</div>
      <div class="band band--me">${cosmoLane(me, 'me')}</div>
      <aside class="rail">${sanctum(them, 'opp')}${controlPanel()}${sanctum(me, 'me')}</aside>
      ${godHud(them, 'opp')}${godHud(me, 'me')}
      ${handRow(me, false)}
      ${command()}
      ${!s.setup && !s.victory ? `<div class="turn-glow turn-glow--${s.active === me ? 'me' : 'opp'}" style="--glow:${GOD_GLOW[s.divine?.[s.active]?.god] || GOD_GLOW['god-athena']}" aria-hidden="true"></div>` : ''}
      ${s.window && !s.victory ? `<div class="priority-glow priority-glow--${s.window.priority === me ? 'me' : 'opp'}" aria-hidden="true"></div>` : ''}
      ${castSlot()}
      ${losers(s).map(k => ruin(k, true)).join('')}
    </div>${choiceBar()}`, {morphStyle: 'innerHTML'});
  if (drag?.ghost) showDragZones(drag.uid); // re-render no meio do arraste não apaga as zonas
  const focused = document.activeElement?.closest?.('.decision [data-focus]')?.dataset.focus;
  overlayRoot.innerHTML = overlays();
  paintCoin();
  if (focused) $(`.decision [data-focus="${CSS.escape(focused)}"]`)?.focus();
  for (const uid of mode?.options || []) $$(`[data-uid="${uid}"]`).forEach(el => el.classList.add('pickable'));
  const bp = boardPick();
  if (bp?.uid) $$(`.hand .dcard[data-uid="${bp.uid}"]`).forEach(el => el.classList.add('is-casting'));
  for (const uid of landing) $$(`.field [data-uid="${uid}"]`).forEach(n => n.classList.add('is-landing'));
  const slot = $('.cast-slot .dcard[data-uid]');
  if (slot && slot.dataset.uid !== slotUid) { const h = takeHeld(slot.dataset.uid); flyFrom(slot, h || seenRect(slot.dataset.uid), h?.pause || 0); }
  slotUid = slot?.dataset.uid || null;
  if (bp && !mode) for (const ref of bp.refs) if (!ref.startsWith('god:')) $$(`.field .dcard[data-uid="${ref}"]`).forEach(el => el.classList.add('pickable'));
  if (mode) $$('.dcard').forEach(el => { if (!el.classList.contains('pickable') && el.closest('.field')) el.classList.add('dimmed'); });
  if (scene) { const st = $('[data-stats]'); if (st) st.textContent = `WebGL on · ${JSON.stringify(scene.stats())}`; }
  const cmd = $('.command')?.getBoundingClientRect();
  document.body.style.setProperty('--stack-right', cmd?.width && innerWidth > 760 ? `${Math.round(innerWidth - cmd.left + 14)}px` : '');
  updateClock();
  animateTrigger();
  drawIntents();
  drawActivity();
  if (lifted) { const slot = $(`.hand--me .dcard[data-uid="${lifted}"]`)?.closest('.hand__slot'); if (slot) slot.classList.add('is-lifted'); else closeQuick(); } // o redesenho não abaixa a carta escolhida
}

// Zoom da pilha (autor, 31/10/2026): toda carta ou habilidade que entra na pilha, dos dois lados, aparece em zoom no canto
// superior direito na hora (pelos eventos da animação: o render espera a fila) e fica até resolver + 1s. Topo grande,
// as de baixo em leque atrás, na ordem em que resolvem. O render sincroniza com a pilha real.
let zoomItems = [], zoomResolving = null, zoomTimer = 0, lastTop = null;
const czRect = new Map(); // último lugar visível de cada item: uma escolha que abre junto esconde a pilha antes do voo
function zoomFace(it) {
  if (ctx.objects[it.uid]) return cardFace(it.uid, {size: 'dcard--lg'}).replace('tabindex="0"', 'tabindex="-1"');
  const uid = String(it.uid || ''), id = uid.startsWith('domain:') ? S().domains?.[uid.slice(7)] : null;
  const f = (id && FORGE.get(id)) || FORGE.get(`${cards.get(S().gods[it.controller])?.name.toLowerCase()}-001`);
  return f ? `<div class="dcard dcard--lg art-full">${renderLiveCard(f, {art: f.ilustracao && forgeArt(f.ilustracao)})}</div>` : '';
}
// Cartinha de habilidade (estilo Arena): gatilho ou ativação na pilha, com a arte da origem, a habilidade e o texto dela.
function abilityCard(it) {
  const t = chainLabel(it);
  return `<div class="ability-card ${t.text ? '' : 'no-text'}"><span class="ability-card__art" style="background-image:url('${chainArt(it)}')"></span>
    <small>${esc(t.name)}</small><strong>${esc(t.sub || 'Triggered ability')}</strong>${t.text ? `<p>${inlineMarkup(t.text)}</p>` : ''}</div>`;
}
const stackFace = it => (it.ability ? abilityCard(it) : zoomFace(it));
// Pilha em cascata (autor, 31/10/2026, igual ao Arena): à esquerda da coluna de comando, na altura do meio; o topo inteiro,
// os de baixo aparecendo pela borda de cima. Até 5 itens; o hover amplia e mostra a seta de cada um.
function drawZoom() {
  let el = document.getElementById('chain-zoom');
  if (!el) { el = document.createElement('div'); el.id = 'chain-zoom'; el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  const top = zoomItems.at(-1), key = zoomItems.map(it => it.uid).join('|') + `#${zoomResolving}`;
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  clearTimeout(zoomTimer);
  [...el.querySelectorAll('.cz-item')].filter(n => !zoomItems.some(it => it.uid === n.dataset.src)).forEach(flyResolved);
  if (!top) { el.className = ''; el.innerHTML = ''; document.body.classList.remove('has-chain-zoom'); drawIntents(); return; }
  const me = online ? online.key : viewer(), who = it => it.controller === me ? 'You' : settings.ai !== 'none' ? 'AI' : `Player ${it.controller}`;
  const t = chainLabel(top), shown = zoomItems.slice(-5);
  el.className = 'chain-zoom is-on';
  el.dataset.side = top.controller === me ? 'me' : 'opp';
  document.body.classList.add('has-chain-zoom');
  el.innerHTML = `<div class="cz-stack" style="--n:${shown.length - 1}">${shown.map((it, i) => {
    const depth = shown.length - 1 - i, g = S().divine?.[it.controller]?.god || 'god-athena';
    return `<div class="cz-item ${depth ? '' : 'is-top'} is-${it.controller === me ? 'me' : 'opp'} ${it.ability ? 'is-ability' : ''}" style="--d:${depth};--glow:${GOD_GLOW[g] || GOD_GLOW['god-athena']}" data-controller="${esc(it.controller)}" ${srcAttrs(it)}>${depth ? '' : '<i class="cast-aura" aria-hidden="true"></i>'}${stackFace(it)}</div>`;
  }).join('')}</div>
    <small class="chain-zoom__label">${zoomResolving === top.uid ? 'Resolving' : 'Resolves next'} · ${esc(who(top))} · ${esc(t.sub || t.name)}${zoomItems.length > 5 ? ` <b>+${zoomItems.length - 5}</b>` : ''}</small>`;
  const topEl = el.querySelector('.cz-item.is-top');
  topEl.dataset.godfx = (S().divine?.[top.controller]?.god || 'god-athena').slice(4);
  // Entrada estilo Arena: o item novo sai da carta de origem (campo ou mão) e voa até o topo da pilha. A carta revelada do
  // oponente já chega voando pela revelação.
  el.querySelectorAll('.cz-item').forEach(n => { const r = n.getBoundingClientRect(); if (r.width) czRect.set(n.dataset.src, r); });
  const fresh = top.uid !== lastTop;
  lastTop = top.uid;
  if (fresh) {
    const h = takeHeld(top.uid);
    flyFrom(topEl.lastElementChild, h || (elOf(top.uid) || $(`.hand .dcard[data-uid="${top.uid}"]`))?.getBoundingClientRect() || seenRect(top.uid)
      || $(`[data-god="${top.controller}"] .godhud__portrait`)?.getBoundingClientRect(), h?.pause || 0);
    if (top.controller !== me) sound('gatilho');
  }
  drawIntents();
}
// Resolução estilo Arena: o item brilha e voa para onde a carta foi (campo, Tartarus, Void); gatilho se desfaz em luz.
function flyResolved(node) {
  // Resolução estilo Arena (autor, 31/10/2026): a carta se desfaz em Cosmo no ponto da pilha e depois reaparece no
  // destino (campo); feitiço e habilidade só se desfazem. Um passo de cada vez, sem voo paralelo.
  const seen = node.getBoundingClientRect(), r = seen.width ? seen : czRect.get(node.dataset.src);
  czRect.delete(node.dataset.src);
  if (!r?.width || settings.reduceMotion) return;
  const uid = node.dataset.src, k = node.dataset.controller, ability = node.classList.contains('is-ability');
  const ghost = node.cloneNode(true);
  const land = () => { landing.delete(uid); $$(`.field [data-uid="${uid}"]`).forEach(n => n.classList.remove('is-landing')); };
  if (!ability) landing.add(uid); // esconde já no render que põe a carta na mesa
  ghost.classList.add('cz-ghost');
  setTimeout(() => { ghost.remove(); land(); }, 1600); // nunca fica cópia parada nem carta escondida, mesmo se a animação não rodar
  Object.assign(ghost.style, {left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`});
  document.body.append(ghost);
  const f = scene?.fx, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  setTimeout(() => f?.burst(cx, cy, {color: '#9fd8ff', count: 60, speed: 240}), 220);
  ghost.animate([{transform: 'none', filter: 'brightness(1)', opacity: 1}, {transform: 'scale(1.05)', filter: 'brightness(2.2)', opacity: 1, offset: .45},
    {transform: 'scale(.9)', filter: 'brightness(3) blur(8px)', opacity: 0}], {duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'})
    .finished.then(() => {
      ghost.remove();
      const dest = (!ability && S().players[k]?.battlefield?.includes(uid) && elOf(uid)) || null;
      land();
      const d = dest?.getBoundingClientRect();
      if (!d?.width) return;
      f?.burst(d.left + d.width / 2, d.top + d.height / 2, {color: '#ffe7a8', count: 45, speed: 260});
      f?.shockwave(d.left + d.width / 2, d.top + d.height / 2, {size: 140});
      dest.animate([{opacity: 0, transform: 'scale(.86)', filter: 'brightness(2.4)'}, {opacity: 1, transform: 'none', filter: 'brightness(1)'}],
        {duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)'});
    }, () => {});
}
// Pilha estilo Arena (autor, 31/10/2026): toda carta jogada e todo gatilho, dos dois lados, vão direto para o ponto da
// pilha (drawZoom), sem revelação no centro.
function zoomEvent(e) {
  const push = it => { if (it.uid && !zoomItems.some(x => x.uid === it.uid)) zoomItems.push(it); };
  if (e.type === 'trigger') push({uid: e.uid, controller: e.player, ability: e.ability});
  else if (e.type === 'ability') push({uid: e.uid, controller: e.player, ability: e.name, target: e.target});
  else if (e.type === 'chain_add' || (e.type === 'card_played' && !e.from && !e.token)) push({uid: e.uid, controller: e.player});
  else if (e.type === 'resolve') {
    if (zoomResolving) zoomItems = zoomItems.filter(x => x.uid !== zoomResolving);
    push({uid: e.uid, controller: e.player, ability: e.ability});
    zoomResolving = e.uid;
  } else if (e.type === 'fizzled') zoomItems = zoomItems.filter(x => x.uid !== e.uid);
  else return;
  drawZoom();
}
function syncZoom() {
  const s = S();
  // Decisão no meio da resolução: a carta fica na pilha, a menos que já tenha entrado no campo (aí voa, como no Arena:
  // pousa primeiro e a escolha vem depois).
  const resolving = pending && zoomItems.find(x => x.uid === zoomResolving && !s.players[x.controller]?.battlefield?.includes(x.uid));
  zoomItems = s.victory ? [] : s.chain.map(c => ({uid: c.uid, controller: c.controller, ability: c.ability, source: c.source, target: c.target, targets: c.targets}));
  if (resolving && !zoomItems.some(x => x.uid === resolving.uid)) zoomItems.push(resolving);
  zoomResolving = resolving ? resolving.uid : null;
  drawZoom();
}

// ---------- Adaptador do DOM para o orquestrador ----------

const rectOf = el => (el ? el.getBoundingClientRect() : null);
const ui = {
  onEvent: zoomEvent,
  number: num, type: uid => info(uid).type, enemyOf: key => other(key),
  // Cor do God de quem controla o Devotee (golpes básicos no tema do deus, autor 31/10/2026).
  godColor: uid => { const k = S().order.find(k => S().players[k].battlefield.includes(uid)); return k && `rgb(${GOD_GLOW[S().divine?.[k]?.god] || GOD_GLOW['god-athena']})`; },
  cinematic(on) { stage.classList.toggle('cinematic', on); },
  isViewer: key => key === viewer(),
  // Morte do God: avatar com animação do tema (die-<deus>), cartas e Bases dele caem, ruína por cima da metade dele.
  godDeath(e) {
    const s = S(), root = $('.olympus');
    return losers({...s, victory: e}).map(key => {
      const god = (s.divine?.[key]?.god || 'god-athena').slice(4);
      $(`[data-god="${key}"]`)?.classList.add('is-dying', `die-${god}`);
      $$(`[data-field="${key}"] .dcard, [data-lane="${key}"] .lane__base`).forEach((el, i) => { el.style.setProperty('--fall', i); el.classList.add('is-falling'); });
      root?.insertAdjacentHTML('beforeend', ruin(key));
      return {key, god};
    });
  },
  rect: uid => rectOf($(`[data-uid="${uid}"]`)),
  godRect: key => rectOf($(`[data-god="${key}"]`)),
  domainRect: key => rectOf($(`[data-domain="${key}"]`)),
  deckRect: key => rectOf($(`[data-deck="${key}"]`)),
  handRect: key => rectOf($(`[data-hand="${key}"]`)),
  fieldRect: key => rectOf($(`[data-field="${key}"]`)),
  bankRect: (key, unit) => rectOf($(`[data-bank="${key}"] [data-bank-unit="${unit}"]`)),
  // Sem a faixa de Bases (celular, mobile.css), o Cosmo sai do contador.
  baseRects: uids => { const r = uids.map(u => rectOf($(`[data-slot="${u}"]`))).filter(b => b?.width); return r.length ? r : [ui.bankRect(uids.length && owner(uids[0]), 'base')]; },
  clearPool: () => { for (const k of ['A', 'B']) delete S().players[k].pool; },
  readyBaseRects: (key, n) => { const r = $$(`[data-lane="${key}"] .lane__base:not(.tapped)`).slice(0, n).map(rectOf).filter(b => b?.width); return r.length ? r : [ui.bankRect(key, 'base')]; }, // o motor usa as primeiras Bases prontas
  bankPulse(key) { const el = $(`[data-bank="${key}"]`); if (!el) return; el.classList.remove('is-pulse'); void el.offsetWidth; el.classList.add('is-pulse'); },
  center: r => (r ? {x: r.left + r.width / 2, y: r.top + r.height / 2} : null),
  float(at, text, cls) {
    if (!at) return;
    const el = document.createElement('div');
    el.className = `float ${cls}`; el.textContent = text;
    el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
    document.body.append(el);
    setTimeout(() => el.remove(), 1300);
  },
  refRect: ref => { const r = String(ref || ''); return r.startsWith('god:') || r.startsWith('ultimate:') ? ui.godRect(r.split(':')[1]) : r.startsWith('domain:') ? ui.domainRect(r.slice(7)) : ui.rect(r); },
  pulse(uid, cls, on) { $$(String(uid).startsWith('domain:') ? `[data-domain="${String(uid).slice(7)}"]` : `[data-uid="${uid}"]`).forEach(el => { if (on === false) el.classList.remove(cls); else { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); } }); },
  aim(attacker, target) {
    $$('.aimed').forEach(el => el.classList.remove('aimed'));
    if (!attacker) return;
    const el = target.kind === 'god' ? $(`[data-god="${target.player}"]`) : $(`[data-uid="${target.uid}"]`);
    el?.classList.add('aimed');
  },
  setSoul(key, soul) { const el = $(`[data-soul="${key}"] b`); if (el) { el.textContent = soul; el.parentElement.classList.remove('hit'); void el.offsetWidth; el.parentElement.classList.add('hit'); } },
  spendOrbs(key, unit, amount) { $$(`[data-bank="${key}"] [data-bank-unit="${unit}"] .orb.ready`).slice(-amount).forEach(o => { o.classList.remove('ready'); o.classList.add('spending'); }); },
  shake(amp) { if (!amp || settings.reduceMotion) return; stage.style.setProperty('--shake', `${Math.min(22, amp)}px`); stage.style.setProperty('--shake-t', `${Math.min(.9, .25 + amp * .03)}s`); stage.classList.remove('shaking'); void stage.offsetWidth; stage.classList.add('shaking'); },
  async banner(text, key, ms) {
    if (!ms) return;
    const el = document.createElement('div');
    el.className = `banner ${key === viewer() ? 'mine' : ''}`; el.innerHTML = `<span>${esc(text)}</span>`;
    stage.append(el);
    await new Promise(r => setTimeout(r, ms));
    el.remove();
  },
  async callout(text, key, ms) {
    if (!ms) return;
    const el = document.createElement('div');
    el.className = 'callout'; el.innerHTML = `<span>${esc(text)}</span>`;
    stage.append(el);
    await new Promise(r => setTimeout(r, ms));
    el.remove();
  },
  // Carta voando entre dois retângulos (clone do DOM; o estado final aparece no render seguinte).
  async flyCard(uid, from, to, ms, hidden, land) {
    if (!from || !to || !ms || settings.reduceMotion) return;
    const ghost = document.createElement('div');
    ghost.className = 'ghost-card';
    ghost.innerHTML = cardFace(uid, {hidden});
    const w = 120, h = 168;
    Object.assign(ghost.style, {left: `${from.left + from.width / 2 - w / 2}px`, top: `${from.top + from.height / 2 - h / 2}px`});
    document.body.append(ghost);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const anim = ghost.animate([{transform: 'translate(0,0) scale(.9) rotateX(0deg)', opacity: 1},
      {transform: `translate(${dx * .55}px, ${dy * .55 - 40}px) scale(1.12) rotateX(12deg)`, opacity: 1, offset: .6},
      {transform: `translate(${dx}px, ${dy}px) scale(${land ? 1 : .8}) rotateX(0deg)`, opacity: land ? 1 : .2}],
    {duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)'});
    // Aba oculta congela a animação: o relógio de parede garante que a fila não trave.
    await Promise.race([anim.finished.catch(() => {}), new Promise(r => setTimeout(r, ms + 150))]);
    ghost.remove();
  },
  log(e) {
    const n = uid => (uid ? info(uid).name : '');
    const t = {card_played: `${e.player} plays ${n(e.uid)}${e.bearer ? ` on ${n(e.bearer)}` : ''}.`, spell_resolved: `${n(e.uid)} resolves.`, ability: `${e.player} uses ${e.name}.`,
      strike_declared: `${e.player}: ${n(e.attacker)} strikes ${e.target?.kind === 'god' ? `God ${e.target.player}` : n(e.target?.uid)}${e.bypass ? ` past Guardian (${e.bypass} ignores Guardian)` : ''}.`, strike_fizzled: `${n(e.attacker)}'s Strike fizzles: attacker or target left the battlefield.`, destroyed: `${n(e.uid)} is destroyed.`, unique_removed: `${n(e.uid)} goes to the Tartarus: only one version of a character (not destroyed).`,
      pass: `${e.player} passes.`, end_phase: `${e.player} ends the turn.`, equipped: `${n(e.uid)} equipped to ${n(e.bearer)}.`,
      returned_to_hand: `${n(e.uid)} returns to ${e.player}'s hand (${e.ability}).`,
      trigger: `${e.player}: ${chainLabel({uid: e.uid, controller: e.player, ability: e.ability}).title} triggers.`,
      resolved: `${chainLabel({uid: e.uid, controller: e.player, ability: e.ability}).title}: ${(e.results || []).map(r => `${r.text} on ${String(r.ref).startsWith('god:') ? `God ${r.ref.slice(4)}` : n(r.ref)}`).join(', ')}.`}[e.type];
    if (t) say(t);
  },
};

// Eventos que não passam por log() acima também viram linhas (dano, Soul, turno, compra).
// "Olhe o topo" (Thetis, Lunar Vision…): o dono vê as cartas; o adversário recebe `uids: null` (core.js PRIVATE).
function lookedText(e) {
  const n = uid => (uid && ctx.objects[uid] ? info(uid).name : '?');
  if (!e.uids) return `${e.player} looks at the top of the deck (${e.ability}).`;
  return `${e.ability}: looked at ${e.uids.map(n).join(', ')}${e.kept ? `; ${n(e.kept)} goes to hand` : '; none could be taken'}. The rest go to the bottom.`;
}
function lookedHook(events) {
  const me = online ? online.key : viewer();
  for (const e of events) if (e.type === 'looked' && e.uids && e.player === me) warn(lookedText(e));
}
function logEvent(e) {
  const n = uid => (uid && ctx.objects[uid] ? info(uid).name : '');
  const t = {turn_start: `Player ${e.player} begins a turn.`, damage: e.dealt || e.prevented || e.absorbed ? `${n(e.uid)}: ${e.dealt} damage${e.prevented ? `, ${e.prevented} prevented` : ''}${e.absorbed ? `, ${e.absorbed} to Armor` : ''}.` : '',
    soul_lost: `God ${e.player} loses ${e.amount} Soul (${e.soul}).`, base_placed: `${e.player} places a Cosmo Base.`, latent_gained: `${e.player} gains ${e.amount} Latent.`,
    awaken_changed: `God ${e.player} ${e.awaken ? 'AWAKENS' : 'leaves Awaken'} (Soul ${e.soul}).`, divine_power: `God ${e.player}: ${e.ability}.`,
    defeat_prevented: `${n(e.uid)} survives with 1 HP (${e.ability}).`, ultimate_announced: `${e.player} announces ${e.ability} (paid ${e.cost} Base).`,
    moon_awakened: `${n(e.uid)} awakens as a Moon Spirit.`, moon_reverted: `A Moon Spirit returns to being a Cosmo Base.`, control_changed: `${e.player} gains control of ${n(e.uid)}.`, entered: `${n(e.uid)} enters the battlefield.`, fizzled: `${n(e.uid)} fizzles: its bearer is gone.`,
    ultimate_resolved: e.loss === undefined ? `${e.ability} resolves.` : `${e.ability}: God loses ${e.loss} Soul.`, ultimate_failed: `${e.ability} fails: a chosen Saint is no longer valid. Cost not refunded.`,
    judgment_placed: `Divine Judgment on God ${e.player}: loses at the end of Round ${e.deadline}.`, judgment_removed: `Divine Judgment removed from God ${e.player}.`,
    soul_gained: `God ${e.player} recovers ${e.amount} Soul.`,
    seal_added: `${n(e.uid)} gets ${e.added} Seal (${e.counters} total).`, seal_removed: `${n(e.uid)} stays Unprepared: 1 Seal removed (${e.counters} left).`,
    seal_failed: `${e.source}: paid, but the Devotee is gone. No Seal.`, divine_power_declined: `God ${e.player} declines ${e.ability}.`,
    mill: `${e.player} mills ${e.moved}${e.moved < e.requested ? ` of ${e.requested}` : ''}.`, discarded: `${e.player} discards ${e.uids ? `${e.uids.length} card${e.uids.length === 1 ? '' : 's'}` : n(e.uid)}.`,
    looked: lookedText(e), revealed: `${e.player} reveals ${n(e.uid)}.`,
    base_returned: `${e.player}: a Cosmo Base returns to hand.`, returned_to_hand: e.uids ? `${e.ability}: ${e.uids.length} cards return to their owners' hands.` : `${n(e.uid)} returns to its owner's hand.`,
    TIMEOUT_AUTO_CHOICE: `TIMEOUT_AUTO_CHOICE (Player ${e.player}): ${e.result?.map(n).join(', ') || 'nothing'}.`, TIMEOUT_DECLINED: `TIMEOUT_DECLINED (Player ${e.player}): ${e.ability}.`,
    TIMEOUT_PASS_PRIORITY: `TIMEOUT_PASS_PRIORITY (Player ${e.player}).`, TIMEOUT_END_TURN: `TIMEOUT_END_TURN (Player ${e.player}).`, mulligan: `${e.player} mulligans ${e.count}.`, victory: e.draw ? 'Draw.' : `Player ${e.winner} wins.`}[e.type];
  if (t) say(t);
}

// ---------- Entrada ----------

boardRoot.addEventListener('click', e => {
  if (e.target.closest('[data-concede]')) { toolsOpen = false; render(); return concede(); }
  if (e.target.closest('[data-leave]')) { toolsOpen = false; render(); return askSure('Leave this duel and go back to the menu?', 'Leave', () => location.assign('../')); }
  if (Date.now() < noClickUntil) return; // fim de uma seta de ataque, não um clique
  if (director.busy) return director.skip();
  const bp = pending && boardPick();
  if (bp) { const el = e.target.closest('.pickable'); return el && bp.pick(el.dataset.pick || el.dataset.uid); }
  if (pending) return focusDecision();
  const s = S(), t = e.target;
  const btn = t.closest('button');
  if (btn?.dataset.primary !== undefined) return primary();
  if (btn?.dataset.cancel !== undefined) { mode = null; casting = null; return render(); }
  if (btn?.dataset.mode) { mode.choice[mode.steps[mode.i].key] = btn.dataset.mode; mode.i++; return advance(); }
  if (btn?.dataset.confirm) { mode.choice[mode.steps[mode.i].key] = btn.dataset.confirm === 'yes'; mode.i++; return advance(); }
  if (btn?.dataset.done !== undefined) return choose(null);
  if (btn?.dataset.toggleTools !== undefined) { toolsOpen = !toolsOpen; return render(); }
  if (btn?.dataset.hint) return flashHint(btn.dataset.hint);
  if (btn?.dataset.ctrlToggle !== undefined) { ctrlOpen = !ctrlOpen; return render(); }
  if (btn?.dataset.fullControl !== undefined) { settings.autoPass = !settings.autoPass; saveSettings(); return render(); }
  if (btn?.dataset.toggleLog !== undefined) { logOpen = !logOpen; toolsOpen = false; return render(); }
  if (btn?.dataset.toggleSettings !== undefined) { settingsOpen = !settingsOpen; toolsOpen = false; return render(); }
  const pile = t.closest('[data-pile]');
  if (pile) return showPile(...pile.dataset.pile.split(':'));
  const bank = t.closest('[data-bank]');
  if (bank && !mode) return showBases(bank.dataset.bank);
  const hiddenLane = t.closest('[data-hidden-lane]');
  if (hiddenLane && !mode) return castFromBase(viewer(), hiddenLane.dataset.hiddenLane);
  const slot = t.closest('.lane__base[data-slot]');
  if (slot) return togglePool(slot);
  const pickEl = t.closest('[data-pick], .pickable');
  if (mode && pickEl) return choose(pickEl.dataset.pick || pickEl.dataset.uid);
  if (mode) return;
  const godEl = t.closest('[data-god]');
  if (godEl) return sheetUp() ? showGodSheet(godEl.dataset.god) : showGodPanel(godEl.dataset.god);
  const domEl = t.closest('[data-domain]');
  if (domEl) return sheetUp() ? showDomainSheet(domEl.dataset.domain) : showDomainCard(domEl.dataset.domain);
  const cardEl = t.closest('.dcard[data-uid]');
  if (!cardEl || cardEl.classList.contains('dcard--back')) return;
  const uid = cardEl.dataset.uid, key = owner(uid), me = viewer();
  if (key !== me) return;
  if (s.players[key].hand.includes(uid)) return handMenu(uid, cardEl);
  if (s.players[key].battlefield.includes(uid)) return fieldMenu(uid, cardEl);
});

// Menu curto quando a carta tem mais de um uso (jogar ou virar Base; Strike ou habilidade).
function quickMenu(anchor, items, {always = false} = {}) {
  closeQuick();
  if (items.length === 1 && !always) return items[0][1]();
  const r = anchor.getBoundingClientRect(), menu = document.createElement('div');
  menu.className = 'quick'; menu.style.left = `${r.left + r.width / 2}px`; menu.style.top = `${r.top - 8}px`;
  menu.innerHTML = items.map(([label], i) => `<button data-q="${i}">${esc(label)}</button>`).join('');
  menu.addEventListener('click', ev => { const i = ev.target.closest('[data-q]')?.dataset.q; if (i !== undefined) { closeQuick(); items[i][1](); } });
  document.body.append(menu);
  if (phoneUp()) return menu.querySelector('button')?.focus();
  // Deitado e no desktop: as ações ficam coladas em cima da carta, na largura dela (autor, 01/11/2026); a medida espera a carta terminar de subir.
  menu.classList.add('quick--glued'); menu.style.visibility = 'hidden';
  requestAnimationFrame(() => Promise.allSettled((anchor.closest('.hand__slot') || anchor).getAnimations().map(a => a.finished)).then(() => {
    const r = anchor.getBoundingClientRect(), w = Math.max(r.width, 120);
    menu.style.width = `${w}px`; menu.style.top = `${r.top - 2}px`;
    menu.style.left = `${Math.max(w / 2 + 4, Math.min(innerWidth - w / 2 - 4, r.left + r.width / 2))}px`;
    menu.style.visibility = ''; menu.querySelector('button')?.focus();
  }));
}
const phoneUp = () => matchMedia('(orientation: portrait) and (max-width: 600px)').matches;
const sheetUp = () => phoneUp() || matchMedia('(pointer: coarse)').matches; // toque: Deus e Domínio abrem a folha pequena
const closeQuick = () => { lifted = null; $$('.hand__slot.is-lifted').forEach(s => s.classList.remove('is-lifted')); $$('.quick').forEach(m => m.remove()); };

function handMenu(uid, el) {
  if (lifted === uid) return closeQuick(); // tocar de novo abaixa a carta
  const key = owner(uid), items = [];
  const reason = playableReason(key, uid);
  if (!reason) items.push(['Play', () => playFromHand(key, uid)]);
  if (canBase(key, uid)) items.push(['Place as Cosmo Base', () => placeAsBase(key, uid)]);
  // Moon Harvest (Artemis): carta não Cosmoble vira Base, uma vez por rodada, perdendo 2 Soul.
  if (!info(uid).cosmoble && S().divine?.[key]?.god === 'god-artemis' && !moonHarvestBlock(S(), ctx, key, uid) && idleFor(key) && S().players[key].baseTurn !== S().turn)
    items.push(['Moon Harvest: place as Cosmo Base (lose 2 Soul)', () => act({type: 'moonHarvest', key, uid})]);
  closeQuick();
  if (items.length) quickMenu(el, items, {always: true}); // carta da mão nunca sai sem o jogador escolher o que fazer
  else warn(reason || 'Not playable now.');
  lifted = uid; el.closest('.hand__slot')?.classList.add('is-lifted'); // estilo Arena: a carta sobe e as ações ficam acima dela
}
// Área de Cosmo do jogador (hexágono e chamas) como alvo de soltar.
const bankAt = (key, x, y) => document.elementsFromPoint(x, y).some(d => d.closest?.(`[data-bank="${key}"], [data-lane="${key}"]`));
function markBank(key, uid, x, y) {
  const bank = $(`[data-bank="${key}"]`);
  if (!bank) return;
  bank.classList.toggle('drop-target', canBase(key, uid));
  bank.classList.toggle('drop-hover', canBase(key, uid) && bankAt(key, x, y));
}
// Habilidades ativadas da carta, com se dá para usar agora e por quê não. Usado pelo menu da carta e pela carta grande.
function cardAbilities(uid) {
  const s = S(), key = owner(uid), c = info(uid), out = [], idle = idleFor(key);
  const ab = c.kind === 'Devotee' && ABILITIES[num(uid)];
  if (ab) out.push({name: ab.name, label: `${ab.name} ({T}, ${ab.cost} Base)`, cost: `{T} · ${ab.cost} Base`,
    why: !idle ? "Wait for your turn's main phase." : !s.units[uid]?.prepared ? 'Unprepared: it readies at the start of your turn.' : '',
    run: () => begin('activate', key, uid, ABILITY_STEPS[num(uid)] || [], choice => ({type: 'activate', key, uid, choice}))});
  const v6a = entryOf(ctx, uid)?.activate; // habilidade ativada V6 (Devotee ou Equipment)
  if (v6a) out.push({name: v6a.name, label: `${v6a.name}${v6a.tap === false ? '' : ' ({T}'}${v6a.cost ? `${v6a.tap === false ? ' (' : ', '}${v6a.cost} Base)` : v6a.tap === false ? '' : ')'}`,
    cost: [v6a.tap === false ? '' : '{T}', v6a.cost ? `${v6a.cost} Base` : ''].filter(Boolean).join(' · '),
    why: !idle ? "Wait for your turn's main phase." : v6a.tap !== false && !s.units[uid]?.prepared ? 'Unprepared: it readies at the start of your turn.'
      : v6a.once && s.roundUses.has(`ability:${uid}`) ? 'Already used this round.' : '',
    run: () => act({type: 'activate', key, uid, choice: {}})});
  return out;
}
function fieldMenu(uid, el) {
  const s = S(), key = owner(uid), c = info(uid), items = [];
  if (!idleFor(key)) return warn("Wait for your turn's main phase.");
  if (c.kind === 'Devotee' && strikeTargets(s, ctx, uid).length) items.push(['Strike', () => startStrike(uid)]);
  for (const a of cardAbilities(uid)) if (!a.why) items.push([a.label, a.run]);
  if (c.kind === 'Equipment' && !c.global && !ctx.attached[uid]) items.push([`Equip (${c.equip?.amount ?? c.cost.amount})`, () => begin('reequip', key, uid, [{key: 'bearer', pick: c.armor ? 'wearer' : 'devotee', armor: uid, label: `Equip ${c.name} to which Devotee?`}], choice => ({type: 'reequip', key, uid, choice}))]);
  // Armor vestida pode passar a outro Devotee seu: AÇÃO + Equip impresso (guia §28).
  else if (c.armor && ctx.attached[uid] && c.equip) items.push([`Move (Equip ${c.equip.amount})`, () => begin('reequip', key, uid, [{key: 'bearer', pick: 'wearer', armor: uid, label: `Move ${c.name} to which Devotee?`}], choice => ({type: 'reequip', key, uid, choice}))]);
  if (!items.length) return warn(s.units[uid]?.prepared === false ? 'Unprepared: it readies at the start of your turn.' : 'No action available for this card.');
  quickMenu(el, items);
}

overlayRoot.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.orderOk !== undefined) return confirmOrder();
  if (btn.dataset.orderPick) return pickOrder(+btn.dataset.orderPick);
  if (btn.dataset.peek !== undefined) return void document.body.classList.toggle('is-peeking');
  if (btn.closest('.decision, .decision-pill, .trigger-panel, .pick-modal')) { document.body.classList.remove('is-peeking'); return decisionClick(btn); }
  if (btn.dataset.mull) { marked.has(btn.dataset.mull) ? marked.delete(btn.dataset.mull) : marked.add(btn.dataset.mull); return render(); }
  if (btn.dataset.primary !== undefined) return primary();
  if (btn.dataset.new !== undefined) return online ? concedeOnline() : newMatch();
  // Concede nas opções, como no MTG Arena (autor, 31/10/2026): online avisa o servidor; local, quem está jogando perde.
  if (btn.dataset.concede !== undefined) { settingsOpen = false; concede(); return render(); }
  if (btn.dataset.toggleSettings !== undefined) { settingsOpen = !settingsOpen; toolsOpen = false; return render(); }
  if (btn.dataset.toggleLog !== undefined) { logOpen = false; return render(); }
});
document.addEventListener('fullscreenchange', () => { if (settingsOpen) render(); });
overlayRoot.addEventListener('change', e => {
  if (e.target.dataset.fullscreen !== undefined) return void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {});
  const key = e.target.dataset.setting;
  if (!key) return;
  settings[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? Number(e.target.value) : e.target.value;
  saveSettings();
  if (key === 'resolution') window.ssStage?.set(settings.resolution); // palco 16:9 (shared/stage-fit.js)
  if (key === 'cardText' || key === 'cardSize') window.ssStage?.a11y(); // acessibilidade das cartas (shared/stage-fit.js)
  if (key === 'lang') window.ssI18n?.set(settings.lang); // idioma PT-BR/EN (shared/i18n.js)
  if (key === 'quality') scene?.setQuality(settings.quality);
  if (key === 'theme') { scene?.setTheme(settings.theme); stage.dataset.theme = settings.theme; }
  if (key === 'reduceFlashes' && scene) scene.reduceFlashes = settings.reduceFlashes;
  if (key === 'godB' || key === 'ai') { settingsOpen = false; return newMatch(); }
  render();
});

// Mesa travada durante uma decisão (antes era inert): clique e arraste não passam, mas passar o mouse (preview à
// esquerda) e o clique direito (zoom) seguem funcionando, como no Arena.
for (const type of ['click', 'pointerdown']) boardRoot.addEventListener(type, e => {
  if (e.button === 0 && e.target.closest?.('.olympus[data-locked]')) { e.stopPropagation(); e.preventDefault(); }
}, {capture: true});
// Inspeção: passar o mouse 300 ms sobre uma carta aberta mostra a versão grande com o texto completo.
document.addEventListener('pointerover', e => {
  if (e.pointerType === 'touch') return; // no toque, a inspeção é segurar o dedo (abaixo)
  const base = e.target.closest?.('.dcard[data-base]');
  if (base && owner(base.dataset.base) === viewer()) { clearTimeout(inspectTimer); inspectTimer = setTimeout(() => showInspect(base.dataset.base), 300); return; } // só o dono vê a própria Base
  const item = e.target.closest?.('[data-src]');
  if (item !== hoverItem?.el) setHoverItem(item);
  if (item) { clearTimeout(inspectTimer); const src = item.dataset.src; if (ctx.objects[src]) inspectTimer = setTimeout(() => showInspect(src, item.dataset.ability, item.closest('.trigger-panel, .ctrl')), 200); else hideInspect(); return; }
  const el = e.target.closest?.('.dcard[data-uid]:not(.dcard--back), .gear[data-uid]'); // faixa do equipamento também abre a carta
  clearTimeout(inspectTimer);
  if (!el || mode) return hideInspect(); // mirando: sem preview por cima da mesa e da instrução
  inspectTimer = setTimeout(() => showInspect(el.dataset.uid, '', el.closest('.mulligan') ? el : null), 300); // mulligan: ao lado da carta, sem cobri-la
  previewCost(el.dataset.uid);
});
// Toque (celular): segurar 500 ms numa carta abre a versão grande, que fica aberta até tocar em Fechar (autor, 01/11/2026).
// Item de pilha ou habilidade segue com a espiada de 450 ms; soltar fecha sem acionar o clique.
let press = null, swallowClickUntil = 0;
addEventListener('click', ev => { if (Date.now() < swallowClickUntil) { ev.stopPropagation(); ev.preventDefault(); } }, {capture: true});
addEventListener('contextmenu', ev => { if (press) ev.preventDefault(); }); // sem menu do sistema ao segurar a carta
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' || e.target.closest?.('#bigcard, .cast-grace') || (phoneUp() && e.target.closest?.('#chain-zoom'))) return;
  const deck = e.target.closest?.('[data-deck]');
  if (deck) {
    press = {x: e.clientX, y: e.clientY, shown: false, sheet: true};
    press.timer = setTimeout(() => { press.shown = true; showSleeve(deck.dataset.deck); }, 500);
    return;
  }
  const el = e.target.closest?.('.dcard[data-uid]:not(.dcard--back), .dcard[data-base], .gear[data-uid], [data-src]'), uid = el?.dataset.uid || el?.dataset.base || el?.dataset.src;
  if (el?.dataset.src !== undefined && !ctx.objects[uid]) return;
  if (!uid || (el.dataset.base && owner(uid) !== viewer())) return;
  press = {x: e.clientX, y: e.clientY, shown: false};
  const peek = el.dataset.src !== undefined;
  press.sheet = !peek;
  press.timer = setTimeout(() => {
    press.shown = true;
    if (!peek) { drag = null; aim = null; closeQuick(); return showBigCard(uid, {sheet: true}); }
    showInspect(uid, el.dataset.ability || ''); setHoverItem(el);
  }, peek ? 450 : 500);
});
document.addEventListener('pointermove', e => { if (press && !press.shown && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { clearTimeout(press.timer); press = null; } });
const endPress = () => {
  if (!press) return;
  clearTimeout(press.timer);
  if (press.shown) { if (!press.sheet) { hideInspect(); setHoverItem(null); } swallowClickUntil = Date.now() + 400; }
  press = null;
};
document.addEventListener('pointerup', endPress);
document.addEventListener('pointercancel', endPress);
function showInspect(uid, ability = '', beside = null) {
  const c = info(uid), box = $('#inspector');
  // Aberto a partir de um painel (pilha, ordem): fica ao lado dele, sem cobrir a lista.
  const lines = c.text.split('\n').slice(2).filter(l => !/^\s*(Rarity|Type|Casting Cost|ATK|HP|Cosmoble)/.test(l));
  const forgeOf = FORGE.get(ctx.objects[uid].cardId); // texto com as regras da carta impressa (autor, 31/10/2026)
  box.innerHTML = `${cardFace(uid, {size: 'dcard--xl', field: S().players[owner(uid)].battlefield.includes(uid)})}<div class="inspector__text"><strong>${esc(c.name)}</strong><small>${esc(c.type.replace(/^Spell\s*—\s*/, ''))}${c.cost ? ` · ${c.cost.amount} ${c.cost.unit === 'base' ? 'Base' : 'Latent'}` : ''}</small>${forgeOf ? renderCardText(forgeOf) : lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`;
  if (ability) { const want = ability.toUpperCase(); $$('.rule-block', box).find(b => b.querySelector('.rule-heading')?.textContent.toUpperCase().includes(want))?.classList.add('is-hot'); }
  box.classList.add('show');
  // À direita se couber; senão à esquerda (mulligan: a carta da ponta direita não fica coberta).
  const r = beside?.getBoundingClientRect(), w = box.offsetWidth;
  box.style.left = !r ? '' : r.right + 12 + w < innerWidth ? `${Math.round(r.right + 12)}px` : r.left - 12 - w >= 0 ? `${Math.round(r.left - 12 - w)}px` : '';
}
// Clique direito no retrato do God: status base e atuais (Soul, Attack, Awaken, Ultimate) e o texto completo.
// Painel do God (clique ou clique direito no retrato): a carta do God, os status atuais e cada poder num bloco.
// Ultimate pronto é clicável e dispara o poder; passivos mostram se estão ativos. Fecha com clique fora ou Esc.
// Poderes do Deus vêm da carta (data/cards.json), no idioma do jogador; name fica em EN porque a lógica do painel o usa.
function godPowers(god) {
  const forge = FORGE.get(`${god.name.toLowerCase()}-001`);
  const blocks = c => [...(c.habilidades_en || []), c.habilidade_awaken_en, c.ultimate_en].filter(Boolean);
  const parse = t => { const [head, ...rest] = t.split('\n'), [, name, tag, inline] = head.match(/^(.+?) — (\S+(?: \S+)?(?: \d+)?)(?:\s+([A-Z].*))?$/) || [, head, '']; return {name, tag, text: [inline, ...rest].filter(Boolean)}; };
  const en = blocks(forge).map(parse), shown = blocks(displayCard(forge)).map(parse);
  return en.map((pw, i) => ({...pw, ...shown[i], name: pw.name, label: shown[i]?.name || pw.name, kind: /Command/.test(pw.tag) ? 'command' : /Awaken/.test(pw.tag) ? 'awaken' : /Ultimate/.test(pw.tag) ? 'ultimate' : 'divine'}));
}
function powerState(d, acts, pw) {
  return pw.kind === 'command' && acts.command ? (acts.command.ok ? ['ready', 'Ready · click to use'] : ['locked', acts.command.why])
    : pw.name === 'BLOODLUST' && acts.bloodlust ? (acts.bloodlust.ok ? ['ready', 'Ready · click to use'] : ['locked', acts.bloodlust.why])
    : pw.kind === 'ultimate' ? (d.ultimateUsed ? ['used', 'Used'] : acts.ultimate.ok ? ['ready', 'Ready · click to use'] : ['locked', acts.ultimate.why])
    : pw.kind === 'awaken' ? (d.awaken ? ['active', 'Active'] : ['locked', `Awakens at Soul ≤ ${d.awakenAt}`]) : ['active', 'Always on'];
}
function usePower(d, acts, pw) {
  if (pw.kind === 'command' && acts.command) { if (!acts.command.ok) return warn(acts.command.why); closeBigCard(); return acts.command.run(); }
  if (pw.name === 'BLOODLUST' && acts.bloodlust) { if (!acts.bloodlust.ok) return warn(acts.bloodlust.why); closeBigCard(); return acts.bloodlust.run(); }
  if (pw.kind !== 'ultimate') return warn(`${pw.label}: ${powerState(d, acts, pw)[1]}. It works automatically.`);
  if (!acts.ultimate.ok) return warn(acts.ultimate.why);
  closeBigCard();
  acts.ultimate.run();
}
// Em pé, tocar no Deus (autor, 01/11/2026): situação em uma olhada e atalhos das ações, do menor custo ao maior; a carta inteira fica um toque adiante.
function showGodSheet(key) {
  closeBigCard(); hideInspect();
  const s = S(), p = s.players[key], d = s.divine[key], god = cards.get(s.gods[key]), max = soulMax(s, key), acts = godActions(key), mine = key === viewer();
  const costOf = pw => +(pw.text.join(' ').match(/(?:Cost|Custo)\D{0,4}(\d+)/i)?.[1] ?? Infinity);
  const powers = godPowers(god), list = !mine ? [] : powers.map((pw, i) => ({pw, i, cost: costOf(pw)})).filter(({pw}) => pw.kind === 'command' || pw.kind === 'ultimate' || pw.name === 'BLOODLUST').sort((a, b) => a.cost - b.cost);
  const rows = list.map(({pw, i, cost}) => {
    const [st, label] = powerState(d, acts, pw);
    return `<button class="gs-act is-${st}" data-gs="${i}" ${st === 'ready' ? '' : 'aria-disabled="true"'}><span class="gs-act__cost">${Number.isFinite(cost) ? cost : '✦'}</span><span class="gs-act__txt"><strong>${esc(pw.label)}</strong><small>${esc(label)}</small></span></button>`;
  });
  if (mine && acts.judgment) rows.push(`<button class="gs-act is-ready" data-gs="judgment"><span class="gs-act__cost">⚖</span><span class="gs-act__txt"><strong>REMOVE DIVINE JUDGMENT</strong><small>Sacrifice three Devotees</small></span></button>`);
  const box = document.createElement('div');
  box.id = 'bigcard'; box.className = 'bigcard god-sheet';
  box.innerHTML = `<section class="gs" role="dialog" aria-label="${esc(god.name)}">
    <header class="gs__head"><div class="gs__face" style="${godFace(key)}"></div><div class="gs__who"><h2>${esc(god.name)}</h2><div class="gs__soul"><b>${p.soul}</b><span>/${max}</span><i><u style="width:${Math.round(p.soul / max * 100)}%"></u></i></div></div></header>
    <div class="gs__stats"><span><small>Awaken</small><b>${d.awaken ? 'Active' : `at Soul ≤ ${d.awakenAt}`}</b></span><span><small>Ultimate</small><b>${d.ultimateUsed ? 'Used' : 'Ready'}</b></span><span><small>Latent</small><b>${p.latent}/3</b></span></div>
    ${rows.length ? `<div class="gs__acts">${rows.join('')}</div>` : ''}
    <div class="gs__foot"><button class="ghost" data-gs="full">See full card</button><button class="ghost" data-gs="close">Close</button></div></section>`;
  box.addEventListener('pointerdown', e => { if (e.target === box) { swallowClickUntil = Date.now() + 400; closeBigCard(); } });
  box.addEventListener('click', e => {
    const g = e.target.closest('[data-gs]')?.dataset.gs;
    if (g === undefined) return;
    if (g === 'close') return closeBigCard();
    if (g === 'full') return showGodPanel(key);
    if (g === 'judgment') { closeBigCard(); return acts.judgment(); }
    usePower(d, acts, powers[g]);
  });
  document.body.append(box);
}
function showGodPanel(key) {
  closeBigCard();
  hideInspect();
  const s = S(), p = s.players[key], d = s.divine[key], god = cards.get(s.gods[key]), max = soulMax(s, key), acts = godActions(key);
  const forge = FORGE.get(`${god.name.toLowerCase()}-001`);
  const art = forge?.ilustracao ? renderLiveCard(forge, {art: forgeArt(forge.ilustracao)}) : `<div class="godpanel__portrait" style="background-image:url('${GOD_ART[s.gods[key]] || ''}')"></div>`;
  const state = pw => powerState(d, acts, pw);
  const icon = {divine: '✦', command: '⚔', awaken: '☀', ultimate: '⚡'};
  const powers = godPowers(god).map((pw, i) => {
    const [st, label] = state(pw), click = (pw.kind === 'ultimate' || pw.kind === 'command' || pw.name === 'BLOODLUST') && st === 'ready';
    return `<button class="power power--${pw.kind} is-${st}" data-power="${i}" ${click ? '' : 'aria-disabled="true"'} title="${esc(label)}">
      <span class="power__icon" aria-hidden="true">${icon[pw.kind]}</span>
      <span class="power__head"><strong>${esc(pw.label)}</strong><small>${esc(pw.tag)}</small></span>
      <em class="power__state">${esc(label)}</em>
      <span class="power__text">${pw.text.map(t => `<span>${inlineMarkup(t)}</span>`).join('')}</span>
    </button>`;
  });
  if (acts.judgment) powers.push(`<button class="power power--judgment is-ready" data-power="judgment"><span class="power__icon" aria-hidden="true">⚖</span><span class="power__head"><strong>REMOVE DIVINE JUDGMENT</strong><small>Action</small></span><em class="power__state">Sacrifice three Devotees</em></button>`);
  const box = document.createElement('div');
  box.id = 'bigcard';
  box.className = 'bigcard godpanel-wrap';
  box.innerHTML = `<section class="godpanel godpanel--${god.name.toLowerCase()} ${d.awaken ? 'is-awaken' : ''}" role="dialog" aria-label="${esc(god.name)}, Player ${key}">
    <div class="godpanel__card">${art}</div>
    <div class="godpanel__info">
      <header><h2>${esc(god.name)}</h2><small>${esc(displayCard(forge)?.tagline_en || god.text.split('\n')[1] || '')} · Player ${key}</small></header>
      <div class="godpanel__stats">
        <div class="gstat gstat--soul"><small>Soul</small><b>${p.soul}<span>/${max}</span></b><i><u style="width:${Math.round(p.soul / max * 100)}%"></u></i></div>
        <div class="gstat ${d.awaken ? 'is-on' : ''}"><small>Awaken</small><b>${d.awakenAt}</b><em>${d.awaken ? 'active' : `at Soul ≤ ${d.awakenAt}`}</em></div>
        <div class="gstat ${d.ultimateUsed ? '' : 'is-on'}"><small>Ultimate</small><b>${d.ultimateUsed ? 'Used' : 'Ready'}</b><em>once per match</em></div>
      </div>
      <div class="godpanel__powers">${powers.join('')}</div>
    </div>
    <button class="godpanel__close" aria-label="Close">×</button>
  </section>`;
  box.addEventListener('pointerdown', e => { if (e.target === box || e.target.closest('.godpanel__close')) closeBigCard(); });
  box.addEventListener('contextmenu', e => { e.preventDefault(); closeBigCard(); });
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-power]');
    if (!b) return;
    if (b.dataset.power === 'judgment') { closeBigCard(); return acts.judgment(); }
    const pw = godPowers(god)[b.dataset.power];
    usePower(d, acts, pw);
  });
  document.body.append(box);
}
document.addEventListener('contextmenu', e => {
  const god = e.target.closest?.('[data-god]');
  if (god) { e.preventDefault(); return showGodPanel(god.dataset.god); }
  const dom = e.target.closest?.('[data-domain]');
  if (dom) { e.preventDefault(); return showDomainCard(dom.dataset.domain); }
  // Clique direito numa carta aberta (ou na própria Base): a carta real grande no centro da tela.
  const base = e.target.closest?.('.dcard[data-base]'), el = e.target.closest?.('.dcard[data-uid]:not(.dcard--back)');
  const uid = base && owner(base.dataset.base) === viewer() ? base.dataset.base : el?.dataset.uid;
  if (!uid) return;
  e.preventDefault();
  showBigCard(uid);
});
// Pool de Cosmo só visual (autor, 28/10/2026): clicar numa Base pronta queima o Cosmo dela para a pool; clicar de novo devolve.
// A Base só vira quando um custo é pago (spendBase usa primeiro as da pool); o que sobrar volta no começo do próximo turno.
function togglePool(el) {
  const key = viewer(), p = S().players[key], uid = el.dataset.slot, b = p.bases.find(x => x.uid === uid);
  if (!b?.prepared || aiControls()) return; // só Bases prontas do próprio jogador
  const adding = !p.pool?.includes(uid);
  p.pool = adding ? [...(p.pool || []), uid] : p.pool.filter(u => u !== uid);
  const f = settings.reduceMotion ? null : scene?.fx, a = ui.center(rectOf(el)), z = ui.center(ui.bankRect(key, 'base'));
  if (f && a && z) { adding ? f.beam(a, z, {color: '#7fc8ff', width: 12, duration: .34}) : f.beam(z, a, {color: '#5a7bb8', width: 8, duration: .25}); }
  render();
}
// Clique direito num Devotee em campo (autor, 28/10/2026): tudo que ele tem equipado e os status somados,
// separando o impresso, o bônus de cada Equipment/Cloth e o resto (Awaken, Training, efeitos).
// Rastreio (autor, 01/11/2026): cada status da carta com a fonte, a habilidade e até quando vale. Tocar abre a carta de origem.
const parseAbility = t => String(t).split(' — ')[0].trim();
function trailSource(uid, name, self) {
  const k = String(uid || '').match(/^(?:god|domain|ultimate):([AB])/)?.[1], domain = String(uid).startsWith('domain:');
  const id = k ? (domain ? S().domains[k] : S().gods[k]) : ctx.objects[uid]?.cardId, f = id && FORGE.get(id);
  const who = !id ? 'Card effect' : f ? displayCard(f).nome_exibicao_en || f.nome_exibicao_en : cards.get(id)?.name || 'Card effect';
  // Nome da habilidade traduzido: mesma posição na lista da carta, se o nome impresso bater.
  const i = (f?.habilidades_en || []).findIndex(t => parseAbility(t).toLowerCase() === String(name || '').toLowerCase());
  const label = i >= 0 ? resonanceTitle((([n, ...r]) => ({name: n, text: r.join(' — ')}))(String(displayCard(f).habilidades_en?.[i] || f.habilidades_en[i]).split(' — '))).name : name;
  return {who, label: label && label.toLowerCase() !== String(who).toLowerCase() ? label : '', open: ctx.objects[uid] && uid !== self ? uid : ''};
}
const TRAIL_TIME = {this_round: 'Until end of round', next_round: 'Until end of next round', this_strike: 'This Strike', until_next_turn: 'Until your next turn'};
const TRAIL_STATUS = {noStrike: "Can't Strike", noGodStrike: "Can't Strike a God", noPrepare: "Doesn't prepare", noAbilities: 'No activated abilities', save: 'Survives the next defeat'};
function statTrail(uid) {
  const s = S(), sign = n => (n ? (n > 0 ? `+${n}` : `${n}`) : '');
  const row = (m, status) => {
    const src = trailSource(m.from?.uid, m.from?.ability, uid), down = (m.atk || 0) + (m.hp || 0) < 0;
    const when = TRAIL_TIME[m.duration] || (ctx.attached[m.from?.uid] === uid ? 'While equipped' : 'While active');
    return `<li class="is-src ${down ? 'is-down' : m.atk || m.hp ? 'is-up' : ''}" ${src.open ? `data-open-card="${src.open}"` : ''}><span><strong>${esc(src.who)}</strong>${src.label ? `<small>${esc(src.label)}</small>` : ''}${status || (m.keywords || []).map(w => `<em>${esc(w)}</em>`).join('')}<small>${when}</small></span><b>${sign(m.atk)}</b><b>${sign(m.hp)}</b></li>`;
  };
  const mods = modsOf(s, ctx, uid).filter(m => m.atk || m.hp || m.keywords?.length).map(m => row(m));
  const status = s.effects.filter(e => e.target === uid && (TRAIL_STATUS[e.kind] || e.kind === 'prevent')).map(e =>
    row(e, `<em>${e.kind === 'prevent' ? (e.amount === Infinity ? 'Prevents all damage' : `Prevents the next ${e.amount} damage`) : TRAIL_STATUS[e.kind]}</em>`));
  const extra = (s.units[uid]?.keywords || []).map(w => row({keywords: [w]}));
  return [...mods, ...status, ...extra].join('');
}
function loadout(uid) {
  const s = S(), c = info(uid), gear = gearOf(ctx, uid), atk = atkOf(s, ctx, uid), hp = hpOf(s, ctx, uid), dmg = s.units[uid]?.damage || 0;
  const line = (label, a, h, cls = '') => `<li class="${cls}"><span>${label}</span><b>${a}</b><b>${h}</b></li>`;
  return `<aside class="loadout" aria-label="${esc(c.name)} loadout">
    <h3>${esc(c.name)}</h3>
    <ul class="loadout__stats"><li class="loadout__head"><span></span><b>ATK</b><b>HP</b></li>
      ${line('Printed', c.atk, c.hp)}
      ${statTrail(uid)}
      ${dmg ? line('Damage taken', '', `-${dmg}`, 'is-src is-down') : ''}
      ${line('Total', atk, dmg ? `${hp - dmg}<small>/${hp}</small>` : hp, 'is-total')}</ul>
    ${gear.length ? `<h4>Equipped</h4><div class="loadout__gear">${gear.map(g => `<button class="loadout__card" data-open-card="${g}" data-tip="${esc(`${info(g).name}|Click to view this card.`)}">${cardFace(g, {field: true, size: 'dcard--sm'})}</button>`).join('')}</div>` : '<p class="loadout__none">Nothing equipped.</p>'}
  </aside>`;
}
function showBigCard(uid, {sheet = false} = {}) {
  closeBigCard();
  hideInspect();
  const box = document.createElement('div');
  box.id = 'bigcard';
  box.className = `bigcard ${sheet ? 'bigcard--sheet' : ''}`;
  const field = S().players[owner(uid)].battlefield.includes(uid);
  const bearer = ctx.attached[uid];
  box.innerHTML = cardFace(uid, {size: 'dcard--big', field}) + (field && info(uid).kind === 'Devotee' ? loadout(uid)
    : bearer ? `<aside class="loadout"><h3>${esc(info(uid).name)}</h3><h4>Equipped on</h4><div class="loadout__gear"><button class="loadout__card" data-open-card="${bearer}" data-tip="${esc(`${info(bearer).name}|Click to view the bearer.`)}">${cardFace(bearer, {size: 'dcard--sm', field: true})}</button></div></aside>` : '');
  // Habilidade ativada no próprio texto da carta (autor, 30/10/2026): passar o mouse destaca e mostra "Use"
  // (no toque fica sempre visível); se não dá para usar agora, o botão vem apagado com o motivo.
  const abilities = field && owner(uid) === viewer() ? cardAbilities(uid) : [];
  abilities.forEach((a, i) => {
    const block = [...box.querySelectorAll('.rule-block')].find(b => b.textContent.trim().toLowerCase().startsWith(a.name.toLowerCase()));
    if (!block) return;
    block.classList.add('rule-block--usable');
    block.insertAdjacentHTML('beforeend', `<button class="rule-use" data-use="${i}" ${a.why ? 'aria-disabled="true"' : ''} data-tip="${esc(`${a.name}|${a.why || `Use now: ${a.cost || 'free'}.`}`)}">${a.why ? 'Not now' : 'Use'}<small>${esc(a.cost)}</small></button>`);
  });
  if (sheet) box.insertAdjacentHTML('beforeend', '<button class="bigcard__close">Close</button>');
  // Cartas do painel abrem grandes (equipamento a partir do portador e vice-versa); clicar no painel não fecha; fora dele, fecha.
  box.addEventListener('pointerdown', e => {
    const use = e.target.closest('[data-use]');
    if (use) { e.preventDefault(); const a = abilities[+use.dataset.use]; if (a.why) return warn(a.why); closeBigCard(); return a.run(); }
    const open = e.target.closest('[data-open-card]');
    if (open) return showBigCard(open.dataset.openCard, {sheet});
    if (sheet && e.target.closest('.dcard--big')) return; // preview pelo toque: tocar na carta não fecha
    if (!e.target.closest('.loadout')) { if (sheet) swallowClickUntil = Date.now() + 400; closeBigCard(); }
  });
  box.addEventListener('contextmenu', e => { e.preventDefault(); if (!sheet) closeBigCard(); });
  document.body.append(box);
}
// iPhone instalado: a altura com --st passa da tela e corta o rodapé (mão, 59px no 15 Pro Max); o palco nunca passa de screen.height.
function fitStage() {
  const stage = $('.stage');
  if (!stage) return;
  stage.style.height = '';
  if (phoneUp() && stage.offsetHeight > screen.height) stage.style.height = `${screen.height}px`;
}
addEventListener('resize', fitStage);
addEventListener('orientationchange', fitStage);
queueMicrotask(fitStage);
function closeBigCard() { $('#bigcard')?.remove(); }
// Segurar um deck mostra o sleeve do jogador (autor, 01/11/2026).
function showSleeve(key) {
  closeBigCard(); hideInspect();
  const box = document.createElement('div');
  box.id = 'bigcard'; box.className = 'bigcard bigcard--sheet sleeve-view'; box.style.cssText = sleeveVar(key);
  box.innerHTML = `<small class="gs__kind">${key === viewer() ? 'Your sleeve' : 'Opponent\u2019s sleeve'}</small><div class="dcard dcard--back dcard--big" aria-label="Sleeve"><span></span></div><button class="bigcard__close">Close</button>`;
  box.addEventListener('pointerdown', e => { if (e.target.closest('.dcard')) return; swallowClickUntil = Date.now() + 400; closeBigCard(); });
  document.body.append(box);
}
// Em pé, tocar ou segurar um item da pilha abre o texto inteiro, até tocar em Fechar (autor, 01/11/2026).
function showStackSheet(it) {
  if (!it.ability && ctx.objects[it.uid]) return showBigCard(it.uid, {sheet: true});
  closeBigCard(); hideInspect();
  const box = document.createElement('div');
  box.id = 'bigcard'; box.className = 'bigcard bigcard--sheet';
  box.innerHTML = `${stackFace(it)}<button class="bigcard__close">Close</button>`;
  box.addEventListener('pointerdown', e => { if (e.target.closest('.ability-card, .dcard')) return; swallowClickUntil = Date.now() + 400; closeBigCard(); });
  box.addEventListener('contextmenu', e => e.preventDefault());
  document.body.append(box);
}
document.addEventListener('pointerdown', e => {
  if (!phoneUp()) return;
  const src = e.target.closest?.('#chain-zoom .cz-item')?.dataset.src, it = src && zoomItems.find(i => i.uid === src);
  if (it) showStackSheet(it);
});
// Tartarus e Void são públicos (autor, 28/10/2026): clicar na linha do trilho abre a pilha; clicar numa carta a mostra grande.
// Bases do jogador (autor, 30/10/2026): tocar no contador de Cosmo mostra as cartas que viraram Base, viradas para cima
// só para o dono, marcando as usadas; do oponente, só a contagem (Bases são secretas).
function showBases(key) {
  closeBigCard();
  const p = S().players[key], mine = key === viewer(), ready = p.bases.filter(b => b.prepared).length;
  const box = document.createElement('div');
  box.id = 'bigcard';
  box.className = 'bigcard pile';
  box.innerHTML = `<section class="pile__box" role="dialog" aria-label="Cosmo Bases of Player ${key}">
    <header><h3>Cosmo Bases</h3><small>Player ${key} · ${ready} prepared of ${p.bases.length} · Latent ${p.latent}/3</small></header>
    ${!mine ? '<p class="pile__empty">Your opponent\'s Bases are face down.</p>' : p.bases.length ? `<div class="pile__grid">${p.bases.map(b => `<div class="pile__slot"><button class="pile__card ${b.prepared ? '' : 'is-used'}" data-pile-card="${b.uid}" aria-label="${b.prepared ? 'Prepared' : 'Used'} Base">${cardFace(b.uid)}<small>${b.prepared ? 'Prepared' : 'Used'}</small></button>${info(b.uid).hiddenCosmo ? `<button class="pile__hidden" data-hidden="${b.uid}" ${hiddenReason(key, b.uid) ? `aria-disabled="true" title="${esc(hiddenReason(key, b.uid))}"` : ''}>Cast · Hidden Cosmo ${info(b.uid).hiddenCosmo}</button>` : ''}</div>`).join('')}</div>` : '<p class="pile__empty">No Cosmo Bases yet.</p>'}</section>`;
  box.addEventListener('click', e => {
    const hidden = e.target.closest('[data-hidden]');
    if (hidden) return castFromBase(key, hidden.dataset.hidden);
    const card = e.target.closest('[data-pile-card]');
    if (card) return showBigCard(card.dataset.pileCard);
    if (!e.target.closest('.pile__box')) closeBigCard();
  });
  box.addEventListener('contextmenu', e => { e.preventDefault(); closeBigCard(); });
  document.body.append(box);
}
function showPile(key, zone) {
  closeBigCard();
  const uids = [...S().players[key][zone]].reverse(), name = zone === 'tartarus' ? 'Tartarus' : 'Void';
  const box = document.createElement('div');
  box.id = 'bigcard';
  box.className = 'bigcard pile';
  box.innerHTML = `<section class="pile__box" role="dialog" aria-label="${name} of Player ${key}">
    <header><h3>${name}</h3><small>Player ${key} · ${uids.length} card${uids.length === 1 ? '' : 's'} · newest first</small></header>
    ${uids.length ? `<div class="pile__grid">${uids.map(u => `<div class="pile__slot"><button class="pile__card" data-pile-card="${u}">${cardFace(u)}</button>${afterlifeButton(key, zone, u)}</div>`).join('')}</div>` : `<p class="pile__empty">No cards in the ${name}.</p>`}</section>`;
  box.addEventListener('click', e => {
    const after = e.target.closest('[data-afterlife]');
    if (after) { closeBigCard(); return act({type: 'afterlife', key, uid: after.dataset.afterlife}); }
    const card = e.target.closest('[data-pile-card]');
    if (card) return showBigCard(card.dataset.pileCard);
    if (!e.target.closest('.pile__box')) closeBigCard();
  });
  box.addEventListener('contextmenu', e => { e.preventDefault(); closeBigCard(); });
  document.body.append(box);
}
// §40: botão de Afterlife na carta do seu Tartarus. Desabilitado mostra o motivo.
const AFTERLIFE_WHY = {chain: 'Already on the stack.', timing: 'You need priority or an empty stack on your turn.', cost: 'Not enough Cosmo. In response, pay with Latent only.', target: 'No legal target.'};
function afterlifeButton(key, zone, uid) {
  const ability = zone === 'tartarus' && key === viewer() && AFTERLIFE[ctx.objects[uid]?.cardId];
  if (!ability) return '';
  const block = pending ? 'timing' : afterlifeBlock(S(), ctx, key, uid);
  return `<button class="pile__hidden" data-afterlife="${uid}" ${block ? `disabled title="${AFTERLIFE_WHY[block] || ''}"` : ''}>Afterlife {${ability.cost}}</button>`;
}
function hideInspect() { $('#inspector').classList.remove('show'); $$('.orb.preview').forEach(o => o.classList.remove('preview')); }
// O zoom (#inspector, #chain-zoom) não recebe o mouse; a roda rola o texto que transborda, como no MTG Arena (autor, 31/10/2026).
addEventListener('wheel', e => {
  const zoom = $('#bigcard:not(.pile)') || $('#inspector.show') || $('#chain-zoom.is-on .cz-item.is-top');
  const box = zoom && [...zoom.querySelectorAll('.lc-rules, .inspector__text')].find(b => b.scrollHeight > b.clientHeight + 1);
  if (!box) return;
  e.preventDefault();
  box.scrollTop += e.deltaY;
}, {passive: false});
// Prévia de pagamento: as esferas que esta carta gastaria piscam antes do clique.
function previewCost(uid) {
  $$('.orb.preview').forEach(o => o.classList.remove('preview'));
  const key = owner(uid), c = info(uid);
  if (!S().players[key].hand.includes(uid) || !c.cost || playableReason(key, uid)) return;
  $$(`[data-bank="${key}"] [data-bank-unit="${c.cost.unit}"] .orb.ready`).slice(-c.cost.amount).forEach(o => o.classList.add('preview'));
}

// Durante o arraste: CAST cobre a minha metade do campo inteira (autor, 28/10/2026); COSMO BASE acende na linha inteira do God.
// A zona só acende se a ação for possível agora; a engine ainda decide ao soltar.
function showDragZones(uid) {
  const key = owner(uid), field = $('.arena-field');
  if (!field) return;
  const cast = !playableReason(key, uid), cosmo = canBase(key, uid);
  field.insertAdjacentHTML('beforeend', `<div class="drag-zones" aria-hidden="true">
    <div class="drag-zone drag-zone--cast ${cast ? '' : 'is-off'}" ${godFx(key)}><strong>CAST</strong><small>${cast ? 'Release to cast as Devotee, Armor or effect' : esc(playableReason(key, uid))}</small></div></div>`);
  $('.band--me')?.insertAdjacentHTML('beforeend', `<div class="drag-zone drag-zone--cosmo drag-zone--band ${cosmo ? '' : 'is-off'}" aria-hidden="true"><strong><span>Cosmo Base ✦ Cosmo Base ✦&nbsp;</span><span>Cosmo Base ✦ Cosmo Base ✦&nbsp;</span></strong><small>${cosmo ? 'Release to set as Cosmo Base' : esc(baseReason(key, uid))}</small></div>`);
  $('.olympus')?.classList.add('is-dragging');
}
function hideDragZones() {
  $('.drag-zones')?.remove(); $('.drag-zone--band')?.remove();
  $('.olympus')?.classList.remove('is-dragging', 'is-over-cast', 'is-over-cosmo');
}
// Zona sob o cursor: 'cast', 'cosmo' ou null (fora do campo ou ação impossível).
function dragZoneAt(uid, x, y) {
  const r = $('.arena-field')?.getBoundingClientRect(), key = owner(uid), b = $('.band--me')?.getBoundingClientRect();
  if (b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) return canBase(key, uid) ? 'cosmo' : null; // linha inteira do God
  if (!r || x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  if (y < r.top + r.height / 2) return null; // CAST só na minha metade do campo
  return playableReason(key, uid) ? null : 'cast';
}
// Arrastar da mão: soltar no campo joga (o alvo, se houver, sai da seta do slot de conjuração); soltar na área de Cosmo vira Base.
document.addEventListener('pointerdown', e => {
  if (director.busy) return;
  const slot = e.target.closest('.cast-slot .dcard, .trigger-panel.is-targeting .trigger-panel__card .dcard');
  if (slot) return startCastAim(slot, e);
  const hud = mode && !mode.uid && e.target.closest(`[data-god="${mode.key}"]`);
  if (hud) return startCastAim($('.godhud__portrait', hud) || hud, e);
  if (mode) return;
  const unit = e.target.closest('.field--me .dcard[data-uid]');
  if (unit) return startAim(unit, e);
  const el = e.target.closest('.hand--me .dcard[data-uid]');
  if (!el) return;
  drag = {uid: el.dataset.uid, x: e.clientX, y: e.clientY, el, ghost: null};
});

// Ataque por seta (estilo Hearthstone): segurar um Devotee seu Prepared, puxar a seta e soltar no alvo declara o
// Strike. Os alvos legais vêm de strikeTargets (a engine valida de novo no declareStrike). Clique sem puxar abre o menu.
// A mesma seta sai do slot de conjuração para escolher o alvo da carta jogada. Alvos como ref: uid ou 'god:X'.
let aim = null, noClickUntil = 0;
const refOf = tg => (tg.kind === 'god' ? `god:${tg.player}` : tg.uid);
function startAim(el, e) {
  const uid = el.dataset.uid, key = owner(uid);
  if (!idleFor(key) || info(uid).kind !== 'Devotee' || !S().units[uid]?.prepared) return;
  const targets = strikeTargets(S(), ctx, uid);
  if (!targets.length) return;
  aim = {uid, el, x: e.clientX, y: e.clientY, on: false, refs: targets.map(refOf), svg: null,
    done: ref => act({type: 'strike', key, uid, choice: {target: ref}})}; // ação serializável: vale também no duelo online
}
function startCastAim(el, e) {
  const bp = boardPick();
  if (!bp?.refs.length) return;
  e.preventDefault();
  aim = {uid: bp.uid, el, x: e.clientX, y: e.clientY, on: false, refs: bp.refs, svg: null, cast: true, done: bp.pick};
}
const refEls = ref => (ref.startsWith('god:') ? $$(`[data-god="${ref.slice(4)}"]`) : $$(`.field .dcard[data-uid="${ref}"]`));
const aimEls = () => aim.refs.flatMap(refEls);
function aimTargetAt(x, y) {
  const els = document.elementsFromPoint(x, y);
  return aim.refs.find(ref => els.some(d => d.closest?.(ref.startsWith('god:') ? `[data-god="${ref.slice(4)}"]` : `.field .dcard[data-uid="${ref}"]`))) || null;
}
function moveAim(e) {
  if (!aim.on) {
    if (Math.hypot(e.clientX - aim.x, e.clientY - aim.y) < 10) return;
    aim.on = true; closeQuick();
    aim.el.classList.add('aiming');
    aimEls().forEach(el => el.classList.add('pickable'));
    aim.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    aim.svg.setAttribute('class', `aim-arrow ${aim.cast ? 'aim-follow' : ''}`);
    if (aim.cast) aim.svg.style.cssText = aim.el.closest('[data-godfx], .godhud')?.style.cssText || '';
    aim.svg.innerHTML = '<defs><marker id="aim-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs><path class="aim-arrow__glow"/><path class="aim-arrow__line" marker-end="url(#aim-head)"/><circle class="aim-arrow__reticle" r="16"/>';
    document.body.append(aim.svg);
  }
  const r = aim.el.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2, x1 = e.clientX, y1 = e.clientY;
  const d = `M${x0},${y0} Q${(x0 + x1) / 2},${Math.min(y0, y1) - 80} ${x1},${y1}`; // arco para cima, como uma flecha lançada
  $$('path:not([d^="M0"])', aim.svg).forEach(path => path.setAttribute('d', d));
  const reticle = $('.aim-arrow__reticle', aim.svg);
  reticle.setAttribute('cx', x1); reticle.setAttribute('cy', y1);
  const ref = aimTargetAt(x1, y1);
  aim.svg.classList.toggle('is-locked', !!ref);
  $$('.aim-hover').forEach(el => el.classList.remove('aim-hover'));
  if (ref) refEls(ref).forEach(el => el.classList.add('aim-hover'));
  if (online) sendActivity({aim: ref, src: aim.el.closest('.field') ? aim.uid : null});
}
function endAim(e) {
  const a = aim, ref = a.on && e ? aimTargetAt(e.clientX, e.clientY) : null;
  aim = null;
  if (online) sendActivity({aim: null, src: null});
  if (!a.on) return; // clique simples: o menu do campo segue normal
  noClickUntil = Date.now() + 400;
  a.svg?.remove(); a.el.classList.remove('aiming');
  $$('.aim-hover').forEach(el => el.classList.remove('aim-hover'));
  $$('.pickable').forEach(el => el.classList.remove('pickable'));
  if (ref) a.done(ref);
  else if (a.cast) render(); // seta solta fora: a carta segue no slot, alvos acesos de novo
}
document.addEventListener('pointermove', e => { if (aim) moveAim(e); else followAim(e); });
// Mirando sem arrastar (autor, 31/10/2026): a seta sai da carta em conjuração e segue o cursor, na cor do God; trava no alvo válido.
function followAim(e) {
  const card = $('.cast-slot .dcard, .trigger-panel.is-targeting .trigger-panel__card .dcard'), bp = card && boardPick();
  let svg = $('.aim-follow');
  if (!bp?.refs.length || e.pointerType === 'touch') { if (svg && online) sendActivity({aim: null}); return svg?.remove(); }
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'aim-arrow aim-follow');
    svg.innerHTML = '<defs><marker id="aim-follow-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs><path class="aim-arrow__glow"/><path class="aim-arrow__line" marker-end="url(#aim-follow-head)"/><circle class="aim-arrow__reticle" r="16"/>';
    document.body.append(svg);
  }
  svg.style.cssText = card.closest('[data-godfx]')?.style.cssText || '';
  const r = card.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2, x1 = e.clientX, y1 = e.clientY;
  const d = `M${x0},${y0} Q${(x0 + x1) / 2},${Math.min(y0, y1) - 80} ${x1},${y1}`;
  $$('path:not([d^="M0"])', svg).forEach(path => path.setAttribute('d', d));
  const ret = $('.aim-arrow__reticle', svg); ret.setAttribute('cx', x1); ret.setAttribute('cy', y1);
  const els = document.elementsFromPoint(x1, y1);
  const locked = bp.refs.find(ref => els.some(d => d.closest?.(ref.startsWith('god:') ? `[data-god="${ref.slice(4)}"]` : `.field .dcard[data-uid="${ref}"]`))) || null;
  svg.classList.toggle('is-locked', !!locked);
  if (online) sendActivity({aim: locked});
}
document.addEventListener('pointerup', e => { if (aim) endAim(e); });
document.addEventListener('pointercancel', () => { if (aim) endAim(null); });
window.addEventListener('blur', () => { if (aim) endAim(null); });
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10) return;
  if (!drag.ghost) { drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('dragging'); document.body.append(drag.ghost); drag.el.classList.add('drag-source'); closeQuick(); showDragZones(drag.uid); }
  drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`;
  markBank(owner(drag.uid), drag.uid, e.clientX, e.clientY);
  const zone = dragZoneAt(drag.uid, e.clientX, e.clientY), board = $('.olympus');
  board?.classList.toggle('is-over-cast', zone === 'cast');
  board?.classList.toggle('is-over-cosmo', zone === 'cosmo');
});
// Cancela o arraste sem ação (Esc, pointercancel do navegador, janela perde o foco): a carta volta para a mão.
function cancelDrag() {
  if (!drag) return;
  drag.ghost?.remove(); drag.el.classList.remove('drag-source');
  $$('.cosmo.drop-target, .cosmo.drop-hover').forEach(b => b.classList.remove('drop-target', 'drop-hover'));
  drag = null;
  hideDragZones();
}
document.addEventListener('pointercancel', cancelDrag);
window.addEventListener('blur', cancelDrag);
document.addEventListener('dragstart', e => { if (e.target.closest?.('.hand--me')) e.preventDefault(); }); // sem arraste nativo de texto/imagem
document.addEventListener('pointerup', e => {
  if (!drag) return;
  const {uid, ghost, el} = drag;
  drag = null;
  if (!ghost) return;
  el.classList.remove('drag-source');
  $$('.cosmo.drop-target, .cosmo.drop-hover').forEach(b => b.classList.remove('drop-target', 'drop-hover'));
  const zone = dragZoneAt(uid, e.clientX, e.clientY);
  hideDragZones();
  const key = owner(uid), drop = document.elementsFromPoint(e.clientX, e.clientY);
  const onUnit = drop.find(d => d.dataset?.uid && S().players[key].battlefield.includes(d.dataset.uid));
  // Área de Cosmo ou metade COSMO vira Base; sobre um Devotee seu com a carta jogável, vale o portador/alvo.
  if (bankAt(key, e.clientX, e.clientY) || (zone === 'cosmo' && !(onUnit && !playableReason(key, uid)))) { ghost.remove(); return placeAsBase(key, uid); }
  const onField = zone === 'cast' || drop.some(d => d.dataset?.field === key);
  if (!onField && !onUnit) return ghost.remove();
  const reason = playableReason(key, uid);
  if (reason) { ghost.remove(); return warn(reason); }
  holdCast(uid, ghost);
  playFromHand(key, uid); // nada é escolhido pelo ponto onde a carta caiu: o alvo sai da seta do slot (autor, 30/10/2026)
});

document.addEventListener('keydown', e => {
  if (e.target.matches?.('input, select, textarea')) return;
  if (e.code === 'Escape' && grace) return grace.cancel();
  if (e.code === 'Escape' && $('#bigcard')) return closeBigCard();
  if (pending && !director.busy) return decisionKey(e);
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); return primary(); }
  if (e.code === 'Escape') { closeQuick(); cancelDrag(); if (aim) endAim(null); if (mode) { mode = null; casting = null; render(); } else if (settingsOpen || logOpen) { settingsOpen = logOpen = false; render(); } }
  if (e.key === 'l' || e.key === 'L') { logOpen = !logOpen; render(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.quick') && !e.target.closest('.dcard')) closeQuick(); });

// ---------- Setas de intenção (quem mira quem) ----------
// Setas translúcidas e fixas enquanto algo espera resolver: Strike declarado (atacante → alvo) e cada item da cadeia
// (número na lista de prioridade → alvo, ou → carta de origem do gatilho). Só leitura do estado; não decide nada.
const elOf = ref => (!ref ? null : ref.startsWith?.('god:') ? $(`[data-god="${ref.slice(4)}"] .godhud__portrait`) : $(`.field .dcard[data-uid="${ref}"], .lane .dcard[data-uid="${ref}"]`));
const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
function pendingStrike(s) {
  if (!s.window) return null;
  for (let i = s.events.length - 1; i >= 0; i--) {
    const e = s.events[i];
    if (['strike_resolve', 'strike_fizzled', 'turn_start'].includes(e.type)) return null;
    if (e.type === 'strike_declared') return e;
  }
  return null;
}
function drawIntents() {
  $('.intent-arrows')?.remove();
  if (!match || S().victory) return;
  const s = S(), arrows = [];
  const strike = pendingStrike(s);
  if (strike) arrows.push({from: elOf(strike.attacker), to: elOf(strike.target.kind === 'god' ? `god:${strike.target.player}` : strike.target.uid), kind: 'strike', label: 'STRIKE'});
  // Pilha (autor, 31/10/2026): sem setas paradas; a origem leva o selo com a ordem de resolução e a seta só aparece no hover do item.
  $$('.chain-badge').forEach(b => b.remove());
  s.chain.forEach((c, i) => { const el = elOf(c.uid); if (el && !el.querySelector('.chain-badge')) el.insertAdjacentHTML('beforeend', `<span class="chain-badge" aria-label="Chain ${s.chain.length - i}">${s.chain.length - i}</span>`); });
  const fromItem = h => (h.el.closest('#chain-zoom') ? h.el : elOf(h.src));
  if (hoverItem) for (const target of hoverItem.targets) arrows.push({from: fromItem(hoverItem), to: elOf(target), kind: 'hover', label: ''});
  const czTop = $('#chain-zoom.is-on .cz-item.is-top'), chainTop = s.chain.at(-1);
  if (czTop && chainTop && hoverItem?.el !== czTop) for (const target of (chainTop.targets?.length ? chainTop.targets : [chainTop.target]).filter(u => u && (ctx.objects[u] || String(u).startsWith('god:')))) arrows.push({from: czTop, to: elOf(target), kind: 'spell', label: ''});
  if (pending?.peek && pending.pending.uid && !targetReq(pending.pending) && (!$('.trigger-comic') || document.body.classList.contains('is-peeking'))) arrows.push({from: $('.trigger-panel__card .dcard'), to: elOf(pending.pending.uid), kind: 'spell', label: '?'});
  const live = arrows.filter(a => a.from && a.to);
  if (!live.length) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'intent-arrows');
  svg.innerHTML = '<defs>' + ['strike', 'spell', 'source', 'hover'].map(k => `<marker id="ih-${k}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path class="ih ih--${k}" d="M0,0 L10,5 L0,10 z"/></marker>`).join('') + '</defs>' +
    live.map(a => {
      const [x0, y0] = center(a.from), [x1, y1] = center(a.to), mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - Math.min(120, Math.hypot(x1 - x0, y1 - y0) * .25);
      return `<g class="intent intent--${a.kind}"><path d="M${x0},${y0} Q${mx},${my} ${x1},${y1}" marker-end="url(#ih-${a.kind})"/><circle cx="${x1}" cy="${y1}" r="22"/><text x="${mx}" y="${my + 4}">${esc(a.label)}</text></g>`;
    }).join('');
  document.body.append(svg);
}
addEventListener('resize', () => { drawIntents(); drawActivity(); });
function setHoverItem(el) {
  $$('.is-triggering').forEach(x => x.classList.remove('is-triggering'));
  hoverItem = el ? {el, src: el.dataset.src, targets: (el.dataset.targets || '').split(' ').filter(u => u && (ctx.objects[u] || u.startsWith('god:')))} : null;
  if (hoverItem) (elOf(hoverItem.src) || (hoverItem.src.startsWith('domain:') ? $(`[data-domain="${hoverItem.src.slice(7)}"]`) : null))?.classList.add('is-triggering');
  drawIntents();
}
// ---------- Atividade do adversário (docs/atividade-adversario.md, autor 01/11/2026) ----------
// Sinais estilo Arena: carta virada da mão sobe, mira no alvo, God "pensando" e contorno na carta que ele inspeciona.
// Contra a IA o jogo encena (aiStage); online o outro cliente manda {hand, aim, focus, src} e o arena-server só repassa.
// Morph do render apaga as classes: drawActivity reaplica depois de cada render.
const oppAct = {hand: null, aim: null, focus: null, src: null};
const validRef = ref => typeof ref === 'string' && (/^god:[AB]$/.test(ref) || !!ctx.objects[ref]);
function drawActivity() {
  $$('.is-opp-thinking, .is-opp-peek, .is-opp-focus, .is-opp-aimed').forEach(el => el.classList.remove('is-opp-thinking', 'is-opp-peek', 'is-opp-focus', 'is-opp-aimed'));
  $('.opp-aim')?.remove();
  const them = settings.ai;
  if (!match || them === 'none' || !settings.showActivity || S().victory) return;
  const s = S(), waiting = pending ? pending.pending.player : s.setup ? s.setup[0] : s.window ? s.window.priority : s.active;
  if (waiting === them) $(`[data-god="${them}"]`)?.classList.add('is-opp-thinking');
  const slot = Number.isInteger(oppAct.hand) ? $$(`[data-hand="${them}"] .hand__slot`)[oppAct.hand] : null;
  slot?.classList.add('is-opp-peek');
  if (validRef(oppAct.focus)) elOf(oppAct.focus)?.classList.add('is-opp-focus');
  const to = validRef(oppAct.aim) && elOf(oppAct.aim), from = (validRef(oppAct.src) && elOf(oppAct.src)) || slot || $(`[data-god="${them}"] .godhud__portrait`);
  if (!to || !from) return;
  to.classList.add('is-opp-aimed');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'aim-arrow opp-aim is-locked');
  const [x0, y0] = center(from), [x1, y1] = center(to);
  const d = `M${x0},${y0} Q${(x0 + x1) / 2},${Math.max(y0, y1) + 80} ${x1},${y1}`; // arco para baixo: vem do lado de lá da mesa
  svg.innerHTML = `<defs><marker id="opp-aim-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs><path class="aim-arrow__glow" d="${d}"/><path class="aim-arrow__line" marker-end="url(#opp-aim-head)" d="${d}"/><circle class="aim-arrow__reticle" r="26" cx="${x1}" cy="${y1}"/>`;
  document.body.append(svg);
}
function setOppAct(patch) { Object.assign(oppAct, patch); drawActivity(); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
// IA: pausa de 0,5 a 1,5 s antes da jogada, a mão se mexe e a mira aparece antes do alvo. "Skip draw animations": sem pausa.
async function aiStage(key, {src, aim} = {}) {
  if (settings.skipDraws) return;
  const total = 500 + Math.random() * 1000, hand = S().players[key].hand, at = hand.indexOf(src);
  if (hand.length) { setOppAct({hand: Math.floor(Math.random() * hand.length)}); await sleep(total * .35); }
  setOppAct({hand: at >= 0 ? at : null, src: at >= 0 ? null : src || null});
  await sleep(total * (aim ? .3 : .65));
  if (aim) { setOppAct({aim}); await sleep(total * .35); }
}
// Online: o próprio hover/mira vai ao outro jogador, no máximo 10 vezes por segundo e só quando muda. Da mão, só a posição.
const myAct = {hand: null, aim: null, focus: null, src: null};
let actSent = '', actTimer = null;
function sendActivity(patch) {
  if (!online?.key) return;
  Object.assign(myAct, patch);
  if (actTimer) return;
  actTimer = setTimeout(() => {
    actTimer = null;
    const body = JSON.stringify(myAct);
    if (body === actSent) return;
    actSent = body;
    fetch(`/arena/matches/${online.id}/activity`, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body}).catch(() => {});
  }, 100);
}
document.addEventListener('pointerover', e => {
  if (!online || e.pointerType === 'touch') return;
  const slot = e.target.closest?.('.hand--me .hand__slot'), hand = slot ? $$('.hand--me .hand__slot').indexOf(slot) : -1;
  sendActivity({hand: hand >= 0 ? hand : null, focus: e.target.closest?.('.field .dcard[data-uid]')?.dataset.uid || null});
});
// Música de batalha (playlist de ../audio.js); só toca depois do primeiro gesto do jogador (política dos navegadores).
addEventListener('pointerdown', () => { unlock(); playMusic('battle'); }, {once: true});

// ---------- Partida ----------

function newMatch(seed = Date.now() % 100000, first, coin = true) {
  // Poseidon V6 não tem cartas canônicas: o God Poseidon pilota o deck Athena V6 do jogador B, como FIXTURE rotulada.
  match = createMatch({cards, canonIndex: index, decks, gods: {A: decks.A.god || 'god-athena', B: settings.godB}, seed, first, coin});
  ctx = {cards, objects: match.objects, attached: match.attached}; // ctx.decide vem do protocolo de decisão (act)
  logLines = []; mode = null; pending = null; marked = new Set(); seenEvents = 0;
  clock = createClock(match.state.order);
  say(`Seed ${seed}.`);
  startCoin();
  $('.fixture-tag')?.remove();
  if (settings.godB === 'god-poseidon') {
    const tag = document.createElement('div');
    tag.className = 'demo-tag fixture-tag'; tag.textContent = 'Fixture · Poseidon with an Athena V6 deck — not an official deck';
    stage.append(tag);
    say('FIXTURE: God Poseidon (canonical) pilots the Dragon Fortress Athena V6 deck. Poseidon V6 has no canonical cards yet.');
  }
  render();
}
// Fixture de demonstração (?demo=ultimate), identificada na tela: partida avançada com cartas do catálogo validado,
// sem tocar em regra — só posiciona objetos que uma partida real poderia ter (Round 7, 13 Bases, três Saints Prepared).
// ?demo=water-prison / ?demo=great-flood: mesma ideia com God Poseidon (Awaken, 3 Latent, 8 Bases) no lado B.
function applyDemo(kind) {
  if (kind === 'water-prison' || kind === 'great-flood') return poseidonDemo(kind);
  if (kind !== 'ultimate') return;
  const s = S();
  s.setup = null;
  const take = (key, id) => { const p = s.players[key], uid = [...p.deck, ...p.hand].find(u => u.includes(`:${id}:`)); for (const z of ['deck', 'hand']) { const i = p[z].indexOf(uid); if (i >= 0) p[z].splice(i, 1); } return uid; };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0, entered: 0}; return uid; };
  startTurn(s);
  ['001', '028', '021'].forEach(id => field('A', id));
  ['003', '040', '011'].forEach(id => field('B', id));
  for (const key of ['A', 'B']) {
    const p = s.players[key], n = key === 'A' ? 13 : 8;
    p.bases = p.deck.splice(-n).map(uid => ({uid, prepared: true}));
    while (p.hand.length < 5) p.hand.push(p.deck.shift());
  }
  s.players.A.soul = 5; s.players.B.soul = 21; s.players.A.latent = 3;
  s.round = 7; s.turn = 13; s.players.A.ownTurns = 7; s.players.B.ownTurns = 6;
  runCheckpoint(s);
  clockStartTurn(clock, s.active, now());
  const tag = document.createElement('div');
  tag.className = 'demo-tag'; tag.textContent = 'Demo fixture · Round 7';
  stage.append(tag);
  say('DEMO FIXTURE: Round 7, Player A with 13 prepared Bases and Seiya, Jabu and Marin. Click your God to announce Athena Exclamation.');
}

function poseidonDemo(kind) {
  const s = S();
  if (s.gods.B !== 'god-poseidon') return;
  s.setup = null;
  const take = (key, id) => { const p = s.players[key], uid = [...p.deck, ...p.hand].find(u => u.includes(`:${id}:`)); for (const z of ['deck', 'hand']) { const i = p[z].indexOf(uid); if (i >= 0) p[z].splice(i, 1); } return uid; };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0, entered: 0}; return uid; };
  ['001', '028', '021'].forEach(id => field('A', id));
  ['003', '040'].forEach(id => field('B', id));
  for (const key of ['A', 'B']) {
    const p = s.players[key];
    p.bases = p.deck.splice(-8).map(uid => ({uid, prepared: true}));
    while (p.hand.length < 5) p.hand.push(p.deck.shift());
  }
  s.players.B.soul = 4; s.players.B.latent = 3; s.players.A.soul = 18;
  // startTurn conta o turno e o turno próprio de quem começa: Round 6, A no 11º turno ou B no 12º.
  const flood = kind === 'great-flood';
  s.round = 6; s.turn = flood ? 11 : 10; s.players.A.ownTurns = flood ? 6 : 5; s.players.B.ownTurns = 5;
  if (flood) { s.active = 'B'; s.turnInRound = 1; }
  startTurn(s);
  runCheckpoint(s);
  clockStartTurn(clock, s.active, now());
  const tag = document.createElement('div');
  tag.className = 'demo-tag'; tag.textContent = `Demo fixture · ${kind === 'great-flood' ? 'Great Flood' : 'Water Prison'}`;
  stage.append(tag);
  say(kind === 'great-flood' ? 'DEMO FIXTURE: Poseidon (Awaken) has 8 prepared Bases. Click your God to announce Great Flood.'
    : 'DEMO FIXTURE: Poseidon (Awaken, 3 Latent). Strike with Player A to trigger Water Prison and Pressure of the Deep.');
}

// ---------- Decisão pendente (modal do Olympus Arena; substitui confirm/prompt) ----------
// Pergunta da engine no meio da resolução: quem decide fica à frente da tela (viewer), só as opções legais que a engine
// mandou aparecem, e a resposta volta para a engine validar (decision.js). "View board" só esconde o modal.

function decisionText(req) {
  const n = uid => (uid && ctx.objects[uid] ? info(uid).name : '');
  const p = S().players[req.player], god = cards.get(S().gods[req.player]).name;
  const who = `Player ${req.player} · ${god[0] + god.slice(1).toLowerCase()}`;
  if (req.ability === 'WATER PRISON') return {who, title: 'Water Prison', kicker: 'Divine Power · once each Round',
    body: `${n(req.uid)} declared a Strike. Pay 2 Latent Cosmo to Seal it? It gets 1 Seal counter; the Strike still happens. Declining keeps this Round's use.`,
    note: `You have ${p.latent} Latent Cosmo.`, yes: 'Pay 2 Latent · Seal', no: 'Decline'};
  if (req.ability === 'TOURNAMENT SPIRIT') return {who, title: 'Tournament Spirit', kicker: 'Domain · once each Round',
    body: 'Your Bronze Saint defeated an enemy Devotee with a Strike. Draw a card?', yes: 'Draw a card', no: 'Decline'};
  if (['RISE AGAIN', 'ETERNAL DEFENDER', 'BONE RECLAMATION'].includes(req.ability)) return {who, title: req.ability, kicker: 'Optional ability',
    body: `${n(req.uid)} can return to your hand. Pay ${req.cost}?`, note: `Your God has ${p.soul} Soul.`, yes: `Pay ${req.cost} · Return`, no: 'Decline'};
  if (req.kind === 'choice') {
    const title = req.ability === 'GREAT FLOOD' ? 'Great Flood' : req.ability;
    if (req.choose === 'base') return {who, title, kicker: 'Mandatory choice', body: `${n(req.for)} returned to its owner's hand. Choose 1 Cosmo Base you control to return to your hand.`};
    if (req.choose === 'discard') return {who, title, kicker: 'Mandatory choice', body: `Discard half of your hand, rounded up: choose ${req.count} card${req.count > 1 ? 's' : ''}. Each discarded card mills 3.`};
    if (req.choose === 'keep') return {who, title: 'ONE PER CHARACTER', kicker: 'Mandatory choice', body: `You control two versions of ${info(req.options[0]).name.split(",")[0]}. Choose the one to keep; the other goes to the Tartarus (it is not destroyed).`};
    if (req.choose === 'top') return {who, title, kicker: 'Mandatory choice', body: 'Choose the card to keep on top of your deck. The other goes to the bottom.'};
    return {who, title, kicker: req.min === 0 ? `Choose up to ${req.count}` : 'Mandatory choice', body: req.text || `Choose ${req.count}.`};
  }
  const parts = [req.source && n(req.source) ? `Source: ${n(req.source)}.` : '', req.uid && n(req.uid) ? `Affects: ${n(req.uid)}.` : '',
    req.amount ? `${req.amount} damage incoming.` : '', req.cost ? `Cost: ${typeof req.cost === 'string' ? req.cost : req.cost.soul ? `${req.cost.soul} Soul` : `${req.cost.latent} Latent`}.` : ''].filter(Boolean);
  return {who, title: req.ability, kicker: 'Optional ability', body: req.text || `${parts.join(' ')} Use it?`.trim(), yes: 'Use', no: 'Decline'};
}

// Texto impresso da habilidade que fez a pergunta ("NOME — efeito" numa carta em jogo), para o jogador ver o que vai
// acontecer antes de escolher. Spell (Technique/Event/Miracle) resolve inteira: mostra também as linhas seguintes.
function abilityEffect(name) {
  if (!name) return null;
  const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+—\\s+`, 'i');
  const ids = new Set([...Object.values(ctx.objects).map(o => o.cardId), ...Object.values(S().gods), ...Object.values(S().domains || {}).filter(Boolean)]);
  for (const id of ids) {
    const card = cards.get(id), lines = (card?.text || '').split('\n');
    const at = lines.findIndex(l => re.test(l));
    if (at < 0) continue;
    // Texto do jogador: a habilidade da carta do Forge no idioma da tela; card.text é só inglês e traz linhas de catálogo.
    const forge = FORGE.get(id), i = forge?.habilidades_en?.findIndex?.(h => re.test(h)) ?? -1;
    if (i >= 0) { const shown = displayCard(forge); return {id, source: shown.nome_exibicao_en || card.name, lines: [shown.habilidades_en[i].replace(/^[^—]+—\s+/, '')]}; }
    const spell = /Technique|Event|Miracle/.test(card.type || '');
    // Linhas de continuação (sem "NOME — ") pertencem à mesma habilidade.
    let end = at + 1;
    while (end < lines.length && (spell || !/^[^—]{2,40} — /.test(lines[end]))) end++;
    return {id, source: card.name, lines: [lines[at].replace(re, ''), ...lines.slice(at + 1, end)].filter(Boolean)};
  }
  return null;
}
// Opção de decisão: uid de carta ou God ('god:A', alvo de dano das cartas V6).
const optName = uid => (String(uid).startsWith('god:') ? `${cards.get(S().gods[uid.slice(4)]).name} (Player ${uid.slice(4)})` : pending?.pending.choose === 'mode' ? String(uid) : info(uid).name);
function decisionModal() {
  const req = pending.pending, t = decisionText(req), fx = abilityEffect(req.ability);
  return sidePanel(req, t, fx); // painel lateral único (autor, 31/10/2026); o modal abaixo ficou sem uso
  if (pending.peek) return `<button class="decision-pill" data-dec="peek" data-focus="peek">Back to decision · ${esc(t.title)} <kbd>Esc</kbd></button>`;
  const timeout = settings.timeouts ? `<small class="decision__timeout">On timeout: ${req.kind === 'optional' ? 'declined' : 'automatic choice, lowest stable ID'}</small>` : '';
  let body;
  if (req.kind === 'optional') {
    body = `<div class="decision__actions"><button class="primary-action" data-dec="yes" data-focus="yes">${esc(t.yes)}</button><button class="ghost" data-dec="no" data-focus="no">${esc(t.no)}</button></div>`;
  } else {
    const picked = pending.picked;
    const opts = req.options.map((uid, i) => `<button class="decision__opt ${picked.includes(uid) ? 'picked' : ''}" data-dec="opt" data-opt="${esc(uid)}" data-focus="opt:${esc(uid)}" aria-pressed="${picked.includes(uid)}" aria-label="${esc(optName(uid))}${i < 9 ? `, key ${i + 1}` : ''}">${String(uid).startsWith('god:') || req.choose === 'mode' ? `<span class="dcard decision__god">${esc(optName(uid))}</span>` : cardFace(uid).replace('tabindex="0"', 'tabindex="-1"')}${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</button>`).join('');
    body = `<div class="decision__opts" role="group" aria-label="Options">${opts}</div>
      <div class="decision__actions"><button class="primary-action" data-dec="confirm" data-focus="confirm" ${pickedOk(req, picked) ? '' : 'disabled'}>Confirm · ${picked.length}/${req.count}</button></div>`;
  }
  return `<div class="decision-veil"></div><section class="decision decision--${req.kind}" role="dialog" aria-modal="true" aria-labelledby="decision-title" aria-describedby="decision-body">
    <header class="decision__head"><span class="decision__who">${esc(t.who)} decides</span><span class="decision__clock" data-decision-clock></span></header>
    <small class="decision__kicker">${esc(t.kicker)}</small><h2 id="decision-title">${esc(t.title)}</h2>
    ${fx ? `<div class="decision__effect"><small>${esc(fx.source)}</small>${fx.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>` : ''}
    <p id="decision-body">${esc(t.body)}</p>${t.note ? `<p class="decision__note">${esc(t.note)}</p>` : ''}${body}
    <footer class="decision__foot">${timeout}<button class="ghost" data-dec="peek" data-focus="peek">View board <kbd>Esc</kbd></button></footer></section>`;
}

// Carta de origem do painel: a que está sendo conjurada, a fonte informada pela engine ou a carta em jogo dona do texto;
// sem objeto (ex.: Domain), a carta do catálogo pelo id achado no texto.
// Carta que este jogador pode ver no painel: nunca o deck nem a mão do outro.
function canShowPanel(u) {
  const s = S(), me = viewer();
  return !s.order.some(k => s.players[k].deck.includes(u) || (k !== me && s.players[k].hand.includes(u)));
}
function sourceUid(req, fx) {
  const s = S(), live = u => s.order.some(k => s.players[k].battlefield.includes(u) || s.players[k].stack.includes(u) || s.players[k].hand.includes(u));
  return [casting, req.source].find(u => u && ctx.objects[u])
    || (fx && Object.keys(ctx.objects).find(u => ctx.objects[u].cardId === fx.id && live(u) && u !== req.uid)) || null;
}
// Elemento da fonte no tabuleiro (carta em campo, Domain ou God), para piscar e de onde a carta voa até o painel.
function boardSourceEl(req, fx) {
  const s = S(), src = sourceUid(req, fx);
  if (src) return $(`.field .dcard[data-uid="${src}"]`);
  const dom = fx && s.order.find(k => s.domains?.[k] === fx.id);
  if (dom) return $(`[data-domain="${dom}"]`);
  const god = fx && s.order.find(k => s.gods[k] === fx.id);
  return god ? $(`[data-god="${god}"] .godhud__portrait`) : null;
}
// Gatilho estilo Arena: a fonte no campo pisca e a carta voa dela até o zoom do painel (só na primeira vez da pergunta).
function animateTrigger() {
  const card = $('.trigger-panel__card .dcard');
  if (!pending?.peek || !card) return;
  const req = pending.pending, fx = abilityEffect(req.ability), from = boardSourceEl(req, fx);
  from?.classList.add('is-triggering');
  const key = `${req.ability}|${req.uid}|${pending.answers?.length}`;
  const a0 = anim('gatilho');
  if (pending.flown === key || settings.reduceMotion || !a0.ligada) return;
  pending.flown = key;
  sound('gatilho');
  // Mesmo voo do cast (padrão do jogo): da carta de origem no campo, ou do God de quem decide, até o ponto da pilha.
  flyFrom(card, (from || $(`[data-god="${req.player}"] .godhud__portrait`))?.getBoundingClientRect());
}
function sidePanel(req, t, fx) {
  // Sempre há arte ao lado (autor, 30/10/2026): carta em jogo; senão a do catálogo (Domain); God pelo projeto do Forge
  // (`hades-001`, como o godHud); por último a carta afetada ou o God de quem decide.
  const forgeGod = id => cards.get(id) && FORGE.get(`${cards.get(id).name.toLowerCase()}-001`);
  const godOf = fx && Object.values(S().gods).includes(fx.id) ? fx.id : null;
  // "Olhe a carta do topo" (scry, 135 e afins): quem decide vê a carta do próprio deck, não a Spell (autor, 01/11/2026).
  const look = req.uid && ctx.objects[req.uid]?.cardId && S().players[req.player].deck.includes(req.uid) && !(online && req.player !== online.key) ? req.uid : null;
  const src = !look && sourceUid(req, fx), f = !look && !src && fx && (FORGE.get(fx.id) || (godOf && forgeGod(godOf)));
  const alt = look || (!src && !f && (req.uid && ctx.objects[req.uid] ? req.uid : null)), g = !src && !f && !alt && forgeGod(S().gods[req.player]);
  const live = c => `<div class="dcard dcard--lg art-full">${renderLiveCard(c, {art: c.ilustracao && forgeArt(c.ilustracao)})}</div>`;
  const face = src ? cardFace(src, {size: 'dcard--lg'}) : f ? live(f) : alt ? cardFace(alt, {size: 'dcard--lg'}) : g ? live(g) : '';
  const target = targetReq(req), waiting = online && req.player !== online.key;
  const cancel = casting && !online ? '<button class="ghost" data-dec="cancel">Cancel</button>' : '';
  const picked = pending.picked;
  // Escolha fora do tabuleiro (descartar, manter, modo…): as opções em lista dentro do painel.
  // Busca no deck, Tartarus ou mão (tutor): popup no meio da tela com as cartas grandes, como no Arena (autor, 31/10/2026).
  const offBoard = req.kind === 'choice' && !target && req.choose !== 'mode' && req.options.every(u => ctx.objects[u] && !S().order.some(k => S().players[k].battlefield.includes(u)));
  const size = offBoard ? 'dcard--lg' : 'dcard--sm';
  const opts = req.kind === 'choice' && !target ? `<div class="decision__opts trigger-panel__opts" role="group" aria-label="Options">${req.options.map((uid, i) => `<button class="decision__opt ${picked.includes(uid) ? 'picked' : ''}" data-dec="opt" data-opt="${esc(uid)}" data-focus="opt:${esc(uid)}" aria-pressed="${picked.includes(uid)}" aria-label="${esc(optName(uid))}${i < 9 ? `, key ${i + 1}` : ''}">${String(uid).startsWith('god:') || req.choose === 'mode' || !ctx.objects[uid] ? `<span class="dcard decision__god">${esc(optName(uid))}</span>` : cardFace(uid, {size}).replace('tabindex="0"', 'tabindex="-1"')}${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</button>`).join('')}</div>` : '';
  const actions = waiting ? `<p class="decision__note">Waiting for Player ${req.player}…</p>`
    : req.kind === 'optional' ? `<button class="primary-action" data-dec="yes" data-focus="yes">${esc(t.yes)}</button><button class="ghost" data-dec="no" data-focus="no">${esc(t.no)}</button>`
    : opts ? `<button class="primary-action" data-dec="confirm" data-focus="confirm" ${pickedOk(req, picked) ? '' : 'disabled'}>Confirm · ${picked.length}/${req.count}</button>${cancel}` : cancel;
  // Fila: o item que está resolvendo e os que vêm depois (topo da cadeia primeiro).
  const next = [...S().chain].reverse(), queue = next.length ? `<div class="trigger-queue"><small>Trigger 1 of ${next.length + 1}</small><ol>${next.slice(0, 4).map(c => `<li ${srcAttrs(c)}>${esc(chainLabel(c).title)}</li>`).join('')}${next.length > 4 ? `<li>+${next.length - 4} more</li>` : ''}</ol></div>` : '';
  if (offBoard && !waiting) return `<div class="pick-veil" aria-hidden="true"></div><section class="pick-modal" role="dialog" aria-modal="true" aria-labelledby="trigger-title" ${godFx(req.player)}>
    <header class="pick-modal__head"><span class="decision__who">${esc(t.who)} decides</span><span class="decision__clock" data-decision-clock></span></header>
    <small class="decision__kicker">${esc(t.kicker)}</small><h3 id="trigger-title">${esc(t.title)}</h3>
    ${fx ? `<div class="decision__effect card-text">${fx.lines.map(l => `<p>${inlineMarkup(l)}</p>`).join('')}</div>` : ''}
    <p class="pick-modal__ask">${inlineMarkup(t.body)}</p>${opts}<div class="trigger-panel__actions">${actions}</div></section>`;
  // Decisão estilo Arena (autor, 31/10/2026): bloco central (carta grande + opções) sobre a mesa escurecida; "View board" espia a mesa.
  const peek = target ? '' : '<button class="ghost decision__peek" data-peek>View board</button>';
  const mainUid = src || alt || null, others = u => u && ctx.objects[u] && u !== mainUid && canShowPanel(u);
  const uniq = list => [...new Set(list)];
  // Em pé (autor, 01/11/2026): as cartas ligadas pelo gatilho em leitura de gibi, da causa para o efeito; até 4.
  const before = !phoneUp() || target || !face ? [] : uniq(S().chain.map(c => (ctx.objects[c.uid] ? c.uid : c.source)).filter(others));
  const after = !phoneUp() || target || !face ? [] : uniq([req.for, req.uid, ...(req.targets || [])].filter(others)).filter(u => !before.includes(u));
  const main = `<div class="trigger-panel__card" ${godFx(req.player)}><i class="cast-aura" aria-hidden="true"></i>${face}${target && face ? '<small>Drag to a target</small>' : ''}</div>`;
  const cell = u => `<div class="comic__cell">${cardFace(u, {size: 'dcard--lg'}).replace('tabindex="0"', 'tabindex="-1"')}</div>`;
  const panels = [...before.map(cell), `<div class="comic__cell">${main}</div>`, ...after.map(cell)].slice(0, 4);
  return `${target ? '' : '<div class="decision-veil decision-veil--center" aria-hidden="true"></div><button class="peek-return" data-peek>Back to decision</button>'}<aside class="trigger-panel ${target ? 'is-targeting' : 'is-center'} ${opts ? 'has-opts' : ''}" role="dialog" aria-labelledby="trigger-title">
    ${!face ? '' : panels.length > 1 ? `<div class="trigger-comic" style="--rows:${Math.ceil(panels.length / 2)}">${panels.join('')}</div>` : main}
    <div class="trigger-panel__box"><span class="decision__who">${esc(t.who)} decides</span><span class="decision__clock" data-decision-clock></span>
      <small class="decision__kicker">${esc(t.kicker)}</small><h3 id="trigger-title">${esc(t.title)}</h3>
      ${fx ? `<div class="decision__effect card-text">${fx.lines.map(l => `<p>${inlineMarkup(l)}</p>`).join('')}</div>` : ''}
      <p>${inlineMarkup(t.body)}</p>${t.note ? `<p class="decision__note">${esc(t.note)}</p>` : ''}
      ${opts}<div class="trigger-panel__actions">${actions}${peek}</div>${queue}</div></aside>`;
}

// Gatilhos simultâneos do jogador (2+): ele arrasta (ou usa ↑↓) para escolher a ordem antes de passar (§56, APNAP).
let orderDraft = null;
function orderPanel() {
  const s = S(), key = s.window && !s.victory && !pending ? [s.window.priority, ...s.order].find(mustOrder) : null;
  if (!key) { orderDraft = null; return ''; }
  const items = ownBatch(s, key);
  if (orderDraft?.batch !== batchKey(key)) orderDraft = {batch: batchKey(key), key, order: items.map((_, i) => i)};
  // Ordem por clique (grill do autor, 31/10/2026): blocos compactos no ponto da pilha, já numerados na ordem padrão;
  // clicar na sequência em que devem resolver renumera. Sem arrastar (WCAG 2.2, movimento de arraste).
  const nums = orderDraft.picks || orderDraft.order;
  const tile = (it, i) => { const t = chainLabel(it), at = nums.indexOf(i), num = at < 0 ? '' : at + 1;
    return `<li><button class="order-tile ${num ? 'is-set' : ''}" data-order-pick="${i}" aria-pressed="${!!num}" ${srcAttrs(it)}
      aria-label="${esc(t.sub || t.name)}${num ? `, resolves ${num}` : ', not ordered yet'}" title="${esc(t.text || '')}">
      <i class="order-tile__art" style="background-image:url('${chainArt(it)}')" aria-hidden="true"></i><span class="order-tile__num" aria-hidden="true">${num}</span>
      <span class="order-tile__body"><b>${esc(t.sub || t.name)}</b><small>${esc(t.name)}</small>${t.text ? `<em>${inlineMarkup(t.text)}</em>` : ''}</span></button></li>`; };
  return `<aside class="trigger-panel trigger-panel--order" role="dialog" aria-labelledby="order-title">
    <ol class="order-tiles">${items.map(tile).join('')}</ol>
    <div class="trigger-panel__box"><h3 id="order-title">Order your triggers</h3><p>${orderDraft.picks ? `Pick #${orderDraft.picks.length + 1}` : 'Click them in the order they resolve.'}</p>
      <div class="trigger-panel__actions"><button class="primary-action" data-order-ok data-focus="order" ${orderDraft.picks ? 'disabled' : ''}>Confirm order</button></div></div></aside>`;
}
// Clicar em ordem: o primeiro clique recomeça a numeração; clicar num numerado o desmarca; o último entra sozinho.
function pickOrder(i) {
  const d = orderDraft, n = d.order.length;
  let picks = d.picks ? (d.picks.includes(i) ? d.picks.filter(x => x !== i) : [...d.picks, i]) : [i];
  if (picks.length === n - 1) picks.push(d.order.find(x => !picks.includes(x)));
  if (picks.length === n) { d.order = picks; d.picks = null; } else d.picks = picks;
  render();
}
function confirmOrder() {
  const {key, order} = orderDraft;
  ordered.add(orderDraft.batch);
  orderDraft = null;
  if (order.some((v, i) => v !== i)) return act({type: 'orderTriggers', key, choice: {order}});
  if (!online) return act(() => {}); // ordem mantida: só segue o auto-pass
  render();
}

// Confirm libera com a quantidade exata ou, em "up to N" (min), de min até N.
const pickedOk = (req, picked) => picked.length <= req.count && picked.length >= (req.min ?? req.count);
function togglePick(uid) {
  const req = pending.pending, picked = pending.picked;
  if (!req.options.includes(uid)) return;
  if (picked.includes(uid)) picked.splice(picked.indexOf(uid), 1);
  else if (req.count === 1) picked.splice(0, picked.length, uid);
  else if (picked.length < req.count) picked.push(uid);
  render();
}
function decisionClick(btn) {
  if (!pending || director.busy) return;
  const req = pending.pending, a = btn.dataset.dec;
  if (a === 'peek') { pending.peek = !pending.peek; render(); return focusDecision(); }
  // Desistir da conjuração enquanto escolhe o alvo: nada foi pago ainda (os alvos são perguntados antes do custo).
  if (a === 'cancel' && casting && !online) { restore(S(), ctx, pending.snap); pending = casting = null; seenEvents = S().events.length; return render(); }
  if (a === 'yes' || a === 'no') return reply({value: a === 'yes'});
  if (a === 'opt') return togglePick(btn.dataset.opt);
  if (a === 'confirm' && pickedOk(req, pending.picked)) return reply({value: req.multiple ? [...pending.picked] : pending.picked[0]});
}
// Teclado: 1–9 marcam opções; setas andam entre opções; Tab fica preso no modal.
function decisionKey(e) {
  if (e.key === 'l' || e.key === 'L') { logOpen = !logOpen; return render(); }
  const box = $('.decision, .pick-modal, .trigger-panel'), focusables = box ? $$('button:not([disabled])', box) : [];
  if (/^[1-9]$/.test(e.key) && pending.pending.options) { const uid = pending.pending.options[Number(e.key) - 1]; if (uid) { e.preventDefault(); togglePick(uid); $(`.decision [data-focus="opt:${CSS.escape(uid)}"]`)?.focus(); } return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const opts = $$('.decision__opt', box), i = opts.indexOf(document.activeElement);
    if (opts.length) { e.preventDefault(); opts[(i + (e.key === 'ArrowRight' ? 1 : -1) + opts.length) % opts.length].focus(); }
    return;
  }
  if (e.key === 'Tab' && focusables.length) {
    const i = focusables.indexOf(document.activeElement);
    if (e.shiftKey ? i <= 0 : i === focusables.length - 1) { e.preventDefault(); focusables[e.shiftKey ? focusables.length - 1 : 0].focus(); }
    return;
  }
  // Espaço/Enter fora de um botão do modal não passam o turno: devolvem o foco à decisão.
  if ((e.code === 'Space' || e.code === 'Enter') && !document.activeElement?.closest?.('.decision, .decision-pill, .trigger-panel, .pick-modal')) { e.preventDefault(); focusDecision(); }
}
function focusDecision() {
  if (!pending || document.activeElement?.closest?.('.decision, .decision-pill, .trigger-panel, .pick-modal')) return;
  $('.decision [data-focus="yes"], .decision .decision__opt, .decision-pill, .pick-modal .decision__opt, .trigger-panel [data-focus]')?.focus();
}
// O log também acompanha eventos que o orquestrador não descreve.
function watchEvents() {
  if (!match) return setTimeout(watchEvents, 120); // online: espera a primeira visão do servidor
  const s = S();
  const fresh = s.events.slice(watchEvents.seen || 0);
  for (const e of fresh) logEvent(e);
  watchEvents.seen = s.events.length;
  if (fresh.length && logOpen && !render.lock) render(); // o log aberto mostra as linhas novas
  setTimeout(watchEvents, 120);
}


// ---------- Duelo online (?match=ID; docs/duelo-online.md) ----------
// O arena-server tem a partida; a tela recebe a visão do jogador (sem mão nem deck do adversário) por Server-Sent
// Events e manda ações serializáveis. O adversário ocupa o lugar da "IA" na tela (settings.ai), sem a IA jogar.
const MATCH_ID = new URLSearchParams(location.search).get('match');
let online = null; // {id, key, queue}
const revive = v => {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(revive);
  if ('$set' in v) return new Set(v.$set.map(revive));
  if ('$map' in v) return new Map(v.$map.map(([k, x]) => [revive(k), revive(x)]));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
};
async function sendOnline(verb, data = {}) {
  if (director.busy) return;
  const r = await fetch(`/arena/matches/${online.id}/${verb}`, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}).catch(() => null);
  if (!r) return warn('Connection lost. Reconnecting…');
  if (!r.ok) { const e = await r.json().catch(() => ({})); warn(e.decision ? why(e) : e.error || "That can't be done right now."); render(); }
}
function concedeOnline() {
  if (S().victory) return location.assign('../');
  askSure('Concede this duel?', 'Concede', () => sendOnline('concede'));
}
// Visão nova do servidor: troca o estado e anima só os eventos que ainda não passaram na tela.
async function applyView(view) {
  const first = !match, from = first ? 0 : S().events.length;
  online.key = view.you;
  settings.ai = view.state.order.find(k => k !== view.you); settings.hideOpponent = true;
  match = {state: revive(view.state), objects: view.objects, attached: revive(view.attached), ending: view.ending};
  ctx = {cards, objects: match.objects, attached: match.attached};
  const s = S(), req = s.pending;
  pending = req ? {pending: req, picked: [], peek: true, shown: s.events.length} : null;
  mode = null;
  if (first) { mountNameplates({online: true, players: view.players, you: view.you}).then(r => useSleeves(r, view.you)); clock = createClock(s.order); serverClock(view.clock); seenEvents = s.events.length; watchEvents.seen = 0; if (s.setup?.length === s.order.length || (s.coin && !s.coin.first)) startCoin(); return render(); } // reconexão depois do 1º mulligan não repete a moeda
  const events = s.events.slice(from);
  seenEvents = s.events.length;
  syncClock(events);
  render.lock = true;
  try { await director.play(events); } catch (err) { console.error(err); }
  render.lock = false;
  rankHook(events);
  lookedHook(events);
  serverClock(view.clock);
  render();
  focusDecision();
  // Auto-pass do lado do jogador: sem resposta possível, passa a prioridade sozinho.
  if (s.window && !s.victory && !pending && s.window.priority === view.you && settings.autoPass && !hasResponse(view.you)) sendOnline('action', {action: {type: 'pass'}});
}
// Relógio online: o do servidor manda; entre uma visão e outra a tela só conta para mostrar.
function serverClock(c) {
  if (!c) return;
  for (const [k, r] of Object.entries(c.players)) Object.assign(clock.players[k], {basic: r.basic, reserve: r.reserve});
  clock.running = c.running ? {key: c.running, since: now()} : null;
  clock.paused = false;
}
function connectOnline() {
  online = {id: MATCH_ID, key: null, queue: Promise.resolve()};
  const es = new EventSource(`/arena/matches/${encodeURIComponent(MATCH_ID)}/stream`);
  es.addEventListener('activity', e => { const a = JSON.parse(e.data); setOppAct({hand: Number.isInteger(a.hand) ? a.hand : null, aim: a.aim || null, focus: a.focus || null, src: a.src || null}); });
  es.addEventListener('view', e => { const view = JSON.parse(e.data); online.queue = online.queue.then(() => applyView(view)).catch(err => console.error(err)); });
  es.onerror = () => { if (!match) { es.close(); boardRoot.innerHTML = '<p class="fatal">This duel is not available. <a href="../">Back to the lobby</a></p>'; } else warn('Connection lost. Reconnecting…'); };
}

// ---------- Oponente IA (settings.ai: 'B' ou 'none') ----------
// A IA só escolhe; cada ação passa pela engine 3.0 como a do humano (mesmo act/reply, mesmas regras e animações).
const ai = createAI({
  level: () => settings.aiLevel, ctx: () => ctx, mustStrike: key => mustStrike(S(), ctx, key),
  S, info, num, known: uid => !!ctx.objects[uid], resonant: (key, armor, uid) => resonant(S(), ctx, key, armor, uid), duplicate: (key, uid) => !!duplicateCharacter(S(), ctx, key, uid), candidates, playableReason, canBase, STEPS,
  hp: uid => hpOf(S(), ctx, uid) - (S().units[uid]?.damage || 0), atk: uid => atkOf(S(), ctx, uid), isSaint: uid => isSaint(ctx, uid),
  strikeTargets: uid => strikeTargets(S(), ctx, uid), ultimateBlock: (key, trio) => ultimateBlock(S(), ctx, key, trio), greatFloodBlock: key => greatFloodBlock(S(), key),
  commandBlock: key => commandBlock(S(), ctx, key), commandTargets: key => commandTargets(S(), ctx, key), activateCommand: (key, uid) => activateCommand(S(), ctx, key, uid),
  placeBase, playDevotee: (key, uid, ch) => playDevotee(S(), ctx, key, uid, ch), playEquipment: (key, uid, bearer, ch) => playEquipment(S(), ctx, key, uid, bearer, ch),
  reequip: (key, uid, bearer) => reequip(S(), ctx, key, uid, bearer), attached: uid => ctx.attached[uid],
  domainUses: key => { const d = domainEntry(S(), key); return {res: !!d?.res, general: d?.activate || null}; }, activate: (key, uid) => activate(S(), ctx, key, uid, {}),
  playSpell: (key, uid, ch) => playSpell(S(), ctx, key, uid, ch), declareStrike: (uid, target) => declareStrike(S(), ctx, uid, target),
  hiddenReason, castHidden: (key, uid, ch) => castHidden(S(), ctx, key, uid, ch),
  afterlifeBlock: (key, uid) => afterlifeBlock(S(), ctx, key, uid), activateAfterlife: (key, uid) => activateAfterlife(S(), ctx, key, uid),
  announceExclamation: (key, trio) => announceExclamation(S(), ctx, key, trio), announceGreatFlood: key => announceGreatFlood(S(), ctx, key),
});
let aiBusy = false, aiRefused = null; // pergunta cuja resposta da IA a engine recusou: na próxima vez responde por timeout
async function aiTick() {
  const key = settings.ai;
  if (online || key === 'none' || aiBusy || !match || director.busy || mode || S().victory) return;
  const s = S();
  aiBusy = true;
  try {
    if (pending) {
      const p = pending.pending;
      if (p.player !== key) return;
      const value = aiRefused === p ? null : ai.answer(p);
      await aiStage(key, {aim: typeof value === 'string' && p.choose === 'target' ? value : null});
      if (pending?.pending !== p) return;
      await reply(aiRefused === p ? {timeout: true} : {value});
      if (pending?.pending === p) aiRefused = p;
      return;
    }
    if (coinStage) { if (coinStage === 'landed' && !s.coin.first && s.coin.winner === key) { await aiStage(key); await act({type: 'chooseFirst', key, choice: {goFirst: true}}); } return; } // §55: a IA sempre começa
    if (s.setup) { if (s.setup[0] === key) { await aiStage(key); await act({type: 'mulligan', key, choice: {uids: ai.mulligan(key)}}); } return; }
    if (s.window) {
      if (s.window.priority !== key) return;
      const a = ai.respond(key), before = s.events.length;
      if (!a) { await act({type: 'pass', key}); return; }
      await aiStage(key, a);
      if (S().events.length !== before || pending || mode || director.busy) return;
      await act(a.run);
      if (S().events.length === before && !pending) ai.refuse(a); // a engine recusou: passa na próxima vez
      return;
    }
    if (!idleFor(key)) return;
    const a = ai.next(key), before = s.events.length;
    await aiStage(key, a || {});
    if (S().events.length !== before || pending || mode || director.busy) return; // a mesa mudou durante a pausa: decide de novo
    if (!a) { await act({type: 'endTurn', key: s.active}); return; }
    setOppAct({hand: null});
    await act(a.run);
    if (S().events.length === before && !pending) ai.refuse(a); // a engine recusou: não tenta de novo neste turno
  } finally { aiBusy = false; if (oppAct.hand !== null || oppAct.aim || oppAct.src) setOppAct({hand: null, aim: null, src: null}); }
}

async function init() {
  stage.dataset.theme = settings.theme;
  const [canonData, deckData] = await Promise.all(['../../data/canon/d268.json', '../../data/alpha-0.1/decks-proposta-d171.json'].map(u => fetch(u).then(r => {
    if (!r.ok) throw Error(`Missing ${u}`);
    return r.json();
  })));
  const previewDecks = await fetch('../../data/alpha-0.1/decks-preview.json').then(r => (r.ok ? r.json() : {decks: []})).catch(() => ({decks: []}));
  const compDecks = await fetch('../../data/alpha-0.1/decks-competitivos.json').then(r => (r.ok ? r.json() : {decks: []})).catch(() => ({decks: []}));
  canon = canonData; cards = loadCanon(canon); index = canonIndex(canon);
  addPreviewCards(cards, index, [...FORGE.values()]); // etapa 1: Poseidon, Hades, Ares, Artemis e neutras (shared/preview-cards.js)
  const presets = [...deckData.decks, ...previewDecks.decks, ...compDecks.decks];
  const [rush] = deckData.decks, fortress = previewDecks.decks[0] || rush, deckOf = id => findDeck(id, presets); // presets D171 e de prévia, ou decks do criador (../deck-store.js); B padrão: starter de Poseidon (deck de 50, 01/11/2026)
  const query = new URLSearchParams(location.search);
  decks = {A: deckOf(query.get('deckA')) || rush, B: deckOf(query.get('deckB')) || fortress}; // ?deckA=&deckB= vindos da seleção do menu
  director = createDirector({ui, getFx: () => scene?.fx, settings});
  // Star Hill (data/olympus-telas.json): cores, textos e imagem de fundo do duelo, por cima do cenário 3D.
  applyColors('duelo'); applyTexts(stage);
  if (telas.fundos?.duelo) $('#arena').insertAdjacentHTML('afterend', `<div class="tela-fundo" aria-hidden="true" style="background-image:url('${imageUrl(telas.fundos.duelo, id => { const f = FORGE.get(id); return f?.ilustracao ? forgeArt(f.ilustracao) : ''; })}');opacity:${Number(telas.fundos.duelo_opacidade ?? .35)}"></div>`);
  const params = new URLSearchParams(location.search);
  if (params.get('godB')) settings.godB = `god-${params.get('godB')}`; // ?godB=poseidon
  if (params.get('ai')) settings.ai = params.get('ai'); // ?ai=B (padrão) ou ?ai=none (hot-seat)
  if (['easy', 'normal', 'hard'].includes(params.get('level'))) settings.aiLevel = params.get('level'); // ?level=hard (QA)
  if (params.get('timeouts')) settings.timeouts = params.get('timeouts') === '1'; // ?timeouts=1 (QA)
  if (MATCH_ID) connectOnline(); // duelo online: a partida vem do servidor (a primeira visão chama render)
  else {
    newMatch(Number(params.get('seed')) || undefined, params.get('demo') ? 'A' : ['A', 'B'].includes(params.get('first')) ? params.get('first') : undefined, !params.get('demo'));
    applyDemo(params.get('demo'));
    render();
    if (settings.ai !== 'none') mountNameplates({online: false}).then(r => useSleeves(r, settings.ai === 'A' ? 'B' : 'A')); // hot-seat não tem dono de conta em cada lado
  }
  // Chat dos amigos na partida (autor, 31/10/2026): só amigos, janelas minimizadas, toasts sem som; oponente que não é amigo fica só nos emotes.
  mountChatDock({inMatch: true, play: id => location.assign(`/playtest/divine/?match=${encodeURIComponent(id)}`),
    avatarOf: id => { const f = FORGE.get(String(id || 'god-athena').replace(/^god-(.+)$/, '$1-001')); return f?.ilustracao ? forgeArt(f.ilustracao) : ''; },
    api: (path, method = 'GET', body) => fetch(path, {method, credentials: 'same-origin', headers: body ? {'Content-Type': 'application/json'} : {}, body: body && JSON.stringify(body)})
      .then(async r => { const data = await r.json().catch(() => ({})); if (!r.ok) throw Error(data.error || 'Something went wrong. Please try again.'); return data; })});
  requestAnimationFrame(watchEvents);
  setInterval(tickClock, 250);
  setInterval(aiTick, 700);
  scene = await createScene($('#arena'), {quality: settings.quality, theme: settings.theme, reduceFlashes: settings.reduceFlashes});
  stage.classList.toggle('no-webgl', !scene);
  window.__divine = {get state() { return S(); }, get ctx() { return ctx; }, get scene() { return scene; }, get clock() { return clock; }, present: (from) => present({}, null, from), settings}; // inspeção no QA
}
// Celular: no primeiro toque, tela cheia onde o navegador deixa (Android). Joga em pé (portrait.css) ou deitado (mobile.css), sem travar.
if (matchMedia('(pointer: coarse)').matches) addEventListener('pointerdown', () => {
  document.documentElement.requestFullscreen?.({navigationUI: 'hide'})?.catch?.(() => {});
}, {once: true});
// Dica flutuante (autor, 28/10/2026): tudo com data-tip="Título|texto" explica o que é ao passar o mouse ou focar.
const tip = document.body.appendChild(Object.assign(document.createElement('div'), {className: 'tip', role: 'tooltip'}));
function showTip(e) {
  const t = e.target.closest?.('[data-tip]');
  if (!t || drag) return tip.classList.remove('on');
  const [title, body] = t.dataset.tip.split('|');
  tip.innerHTML = body ? `<strong>${esc(title)}</strong>${esc(body)}` : esc(title);
  const r = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, room = r.right + 12 + w < innerWidth;
  tip.style.left = `${room ? r.right + 12 : Math.max(8, r.left - 12 - w)}px`;
  tip.style.top = `${Math.min(innerHeight - h - 8, Math.max(8, r.top + r.height / 2 - h / 2))}px`;
  tip.classList.add('on');
}
document.addEventListener('pointerover', showTip);
document.addEventListener('focusin', showTip);
document.addEventListener('pointerdown', () => tip.classList.remove('on'));
init().catch(e => { boardRoot.innerHTML = `<p class="fatal">${esc(e.message)}</p>`; console.error(e); });
