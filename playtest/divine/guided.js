// Interface do Tutorial 001: Marin, destaques, hotspots da carta, ajuda e salvamento. As decisões ficam em tutorial-director.js.
import {setStage} from '../first-run.js?v=20261110-dc1';
import {createDirector, encodeSave, decodeSave, tokenCards} from './tutorial-director.js?v=20261111-cc2';

const SAVE_KEY = 'sstcg.tutorial001.v1';
const load = async name => (await fetch(`../../data/tutorial/${name}?v=20261110-st1`)).json();
export const loadTutorial = async () => { const [script, lines] = await Promise.all([load('tutorial-001.json'), load('tutorial-001.dialogues.json')]); return {script, lines}; };
export const readSave = () => { try { const t = localStorage.getItem(SAVE_KEY); return t ? decodeSave(t) : null; } catch { return null; } };
export const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch { /* sem armazenamento */ } };

// Embaralhamento preparado: só reordena cartas que já são dos decks legais.
export function stackGuided(s, script) {
  for (const k of ['A', 'B']) {
    const p = s.players[k], {mao, compras} = script.preparo[k], rest = [...p.hand, ...p.deck].filter(u => !mao.includes(u) && !compras.includes(u));
    p.hand = [...mao]; p.deck = [...compras, ...rest];
  }
  s.setup = null;
}

export function createGuided({script, lines, cards, S, aiming, picking, busy, idle, snapshotMatch, closeCard, onPhase, savedDirector}) {
  const say = id => { const l = lines[id]; return l ? (document.documentElement.lang === 'pt-BR' ? l.pt : l.en) : id; };
  const pose = name => `./assets/marin/${script.poses[name] || script.poses.idle}.webp?v=1`;
  const el = (tag, className, html = '') => Object.assign(document.createElement(tag), {className, innerHTML: html});
  const root = el('aside', 'gd', `<div class="gd__side"><img class="gd__marin" alt="Marin"><button class="gd__skip gd__skip--side" data-gd="skip" translate="no">${say('UI_SKIP')}</button></div><div class="gd__bubble"><p class="gd__text" translate="no"></p><ul class="gd__goals" translate="no"></ul><div class="gd__actions" translate="no"></div></div>`);
  root.setAttribute('role', 'status');
  const ring = el('div', 'gd-ring'), glow = el('div', 'gd-glow'), help = el('button', 'gd-help', `<img src="${pose('idle')}" alt="">`);
  help.setAttribute('aria-label', say('UI_HELP')); help.setAttribute('translate', 'no');
  ring.hidden = true;
  let line = 0, shown = '', transient = null, transientTimer = 0, phase = savedDirector ? null : 'guided', helpOpen = false, seen = 0, ended = false;

  const director = createDirector({script, S, busy, saved: savedDirector,
    onEnter: st => {
      line = 0; shown = ''; helpOpen = false;
      if (st.closeCard) closeCard();
      document.body.classList.toggle('gd-phase-on', !!st.revealPhase);
      root.classList.toggle('gd--free-skip', st.phase !== 'guided');
      if (st.done.exam) st.enteredTurn = S().players.A.ownTurns;
      if (st.phase !== phase) { phase = st.phase; onPhase(st.ai); }
      if (idle() && !st.hotspot) try { localStorage.setItem(SAVE_KEY, encodeSave({director: director.save(), match: snapshotMatch(), tokens: tokenCards(cards)})); } catch { /* cheio: segue sem ponto de retomada */ }
      draw(); place();
    },
    onFinish: () => { document.body.classList.add('gd-phase-on'); setStage('done'); clearSave(); phase = 'free'; onPhase('normal'); root.hidden = true; ring.hidden = true; }});

  const lastLine = st => line >= st.say.length - 1;
  const sayNow = st => picking() && st.pickSay ? say(st.pickSay) : say(st.say[line]);
  // Janela aberta esperando o jogador, sem resposta a ensinar: Marin aponta o botão de passar.
  const waitingPass = st => S().window?.priority === 'A' && !st.blockPass && st.phase === 'guided' && !document.querySelector('.trigger-panel');
  function actionsHtml(st) {
    const more = !lastLine(st), click = st.done.next || st.final;
    return `${more || click ? `<button class="kv-button" data-gd="next">${say('UI_NEXT')}</button>` : ''}${st.say.length > 1 && !more ? `<button class="gd__skip" data-gd="repeat">${say('UI_REPEAT')}</button>` : ''}`;
  }
  function draw() {
    if (ended || helpOpen) return;
    const st = director.step();
    if (!st) return;
    const text = transient || (document.querySelector('[data-order-ok]') ? say('ORDER') : waitingPass(st) ? say('RESOLVE') : sayNow(st)), goals = st.done.exam ? director.goals() : null, key = `${st.id}|${line}|${text}|${JSON.stringify(goals)}`;
    if (key === shown) return;
    shown = key; root.hidden = false;
    root.querySelector('.gd__marin').src = pose(st.pose);
    root.querySelector('.gd__text').textContent = text;
    root.querySelector('.gd__goals').innerHTML = goals ? Object.entries(goals).map(([id, ok]) => `<li class="${ok ? 'is-done' : ''}">${ok ? '✓' : '○'} ${say(id)}</li>`).join('') : '';
    root.querySelector('.gd__actions').innerHTML = actionsHtml(st);
  }
  function hotspotRects(name) { // um item pode ter mais de um ponto: Cosmo e Vida ficam em cantos opostos
    const card = document.querySelector('#bigcard .dcard--big')?.getBoundingClientRect(), spot = script.hotspots[name];
    return card?.width ? (Array.isArray(spot[0]) ? spot : [spot]).map(([x, y, w, h]) => ({left: card.left + card.width * x / 100, top: card.top + card.height * y / 100, width: card.width * w / 100, height: card.height * h / 100})) : null;
  }
  const selector = name => {
    const [kind, ...rest] = name.split(':'), v = rest.join(':');
    return {hand: `.hand--me .dcard[data-uid="${v}"]`, field: `[data-field] .dcard[data-uid="${v}"]`, god: `[data-god="${v}"]`, domain: `[data-domain="${v}"]`, end: '[data-primary]', phase: innerWidth > 760 ? '.ctrl' : '.phasebar__turn', bank: `[data-bank="A"] .rail__row--${v === 'base' ? 'cosmo' : 'latent'}`, tartarus: `[data-pile="${v}:tartarus"]`}[kind];
  };
  // Celular: Marin nunca cobre mão, cartas em campo nem janela de resposta; fica na vaga livre com menos sobreposição.
  const PROTECT = '.hand--me .dcard, [data-field] .dcard, [data-god], .trigger-panel, #bigcard .dcard--big, .quick, [data-primary], .gd-help, .phasebar__turn';
  let docked = '';
  function dock() {
    if (root.hidden || ended || innerWidth > 760) return; // desktop: lugar fixo em guided.css
    const areas = [...document.querySelectorAll(PROTECT)].map(e => e.getBoundingClientRect()), key = `${shown}|${areas.map(a => Math.round(a.left + a.top)).join()}|${innerWidth}x${innerHeight}`;
    if (key === docked) return;
    docked = key;
    const {width: w, height: h} = root.getBoundingClientRect(), W = innerWidth, H = innerHeight, overlap = (x, y) => areas.reduce((sum, a) => sum + Math.max(0, Math.min(x + w, a.right) - Math.max(x, a.left)) * Math.max(0, Math.min(y + h, a.bottom) - Math.max(y, a.top)), 0);
    const spots = [.3, .12, .44, .02, .56].flatMap(y => [(W - w) / 2, 12, W - w - 12].map(x => [x, Math.min(H * y, H - h - 8)]));
    const [x, y] = spots.reduce((best, s) => overlap(...s) < overlap(...best) ? s : best);
    Object.assign(root.style, {left: `${x}px`, top: `${y}px`, transform: 'none'});
  }
  function place() {
    dock();
    const st = director.step();
    let r = null, spots = null;
    if (document.querySelector('.trigger-panel')) { ring.hidden = true; return; }
    if (st && waitingPass(st)) r = document.querySelector('[data-primary]')?.getBoundingClientRect();
    else if (st?.hotspot) { spots = hotspotRects(st.hotspot); r = spots?.[0]; }
    else if (st?.focus?.length) {
      const name = aiming() && st.aimFocus ? st.aimFocus : st.focus[0], found = document.querySelector(selector(name));
      r = found?.getBoundingClientRect();
    }
    if (!r?.width) { ring.hidden = true; return; }
    ring.hidden = false;
    ring.classList.toggle('is-spot', !!st.spot && !spots);
    ring.classList.toggle('is-glow', !!spots);
    if (spots) { // sem moldura: o fundo do item brilha e o resto da tela escurece aos poucos
      const at = s => `ellipse ${s.width * .8}px ${s.height * .95}px at ${s.left + s.width / 2}px ${s.top + s.height / 2}px`;
      Object.assign(ring.style, {left: 0, top: 0, width: '100%', height: '100%'});
      ring.style.setProperty('--holes', spots.map(s => `radial-gradient(${at(s)}, transparent 55%, #000 100%)`).join());
      glow.style.background = spots.map(s => `radial-gradient(${at(s)}, #ffe7a37a 0, #e6c36a4d 50%, transparent 100%)`).join();
      return;
    }
    Object.assign(ring.style, {left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px`});
  }
  function flash(id) { transient = say(id); clearTimeout(transientTimer); transientTimer = setTimeout(() => { transient = null; draw(); }, 3600); root.classList.remove('is-nudge'); void root.offsetWidth; root.classList.add('is-nudge'); draw(); }
  // Falas de situação: só leem eventos já ocorridos.
  function react() {
    const ev = S().events;
    for (; seen < ev.length; seen++) {
      const e = ev[seen];
      if (director.step()?.phase === 'guided') continue;
      if (e.type === 'destroyed' && e.owner === 'A') flash('FELL');
      if (e.type === 'soul_lost' && e.player === 'A' && e.soul <= 5) flash('LOW_SOUL');
    }
  }
  function finishScreen() {
    const r = director.result(), won = r.winner === 'A', unfinished = !director.finished && r.pending.length;
    ended = true; clearSave(); ring.hidden = true; help.hidden = true; root.hidden = false;
    setStage('done'); // o resultado conta como conclusão, mesmo com aulas pendentes
    root.classList.add('gd--end');
    root.querySelector('.gd__marin').src = pose(won ? 'cheer' : 'confident');
    root.querySelector('.gd__text').textContent = say(unfinished ? 'UNFINISHED' : won ? 'WIN' : 'LOSE');
    root.querySelector('.gd__goals').innerHTML = '';
    root.querySelector('.gd__actions').innerHTML = unfinished || !won ? `<button class="kv-button" data-gd="again">${say(unfinished ? 'UI_RESUME' : 'UI_RETRY')}</button>` : '';
  }
  function tick() {
    if (ended) return;
    director.observe(); react();
    if (director.result()) return finishScreen();
    draw(); place();
  }
  function toggleHelp() {
    helpOpen = !helpOpen;
    root.classList.toggle('gd--help', helpOpen);
    if (!helpOpen) { shown = ''; root.hidden = director.finished; return draw(); }
    const st = director.step();
    root.hidden = false;
    root.querySelector('.gd__marin').src = pose('tip');
    root.querySelector('.gd__text').textContent = st && !st.done.next ? say(st.say.at(-1)) : say('HINT');
    root.querySelector('.gd__goals').innerHTML = ['G_GUARDIAN', 'G_NIMBLE', 'G_IMPULSE', 'G_HIDDEN', 'G_TRAINING', 'G_SEAL'].map(id => `<li>${say(id)}</li>`).join('');
    root.querySelector('.gd__actions').innerHTML = `${director.step()?.phase === 'guided' ? `<button class="gd__skip" data-gd="skip">${say('UI_SKIP')}</button>` : ''}<button class="kv-button" data-gd="help-close">${say('UI_CLOSE')}</button>`;
  }
  root.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('[data-gd]')?.dataset.gd, st = director.step();
    if (b === 'next') { if (st && !lastLine(st)) { line++; draw(); } else director.next(); }
    if (b === 'repeat') { line = 0; shown = ''; draw(); }
    if (b === 'skip') { setStage('skipped'); clearSave(); location.assign('../'); }
    if (b === 'again') { clearSave(); location.reload(); }
    if (b === 'help-close') toggleHelp();
  });
  help.addEventListener('click', e => { e.stopPropagation(); toggleHelp(); });

  function cinematic(done) {
    const ids = ['CIN_1', 'CIN_2', 'CIN_3'], box = el('section', 'gd-cin', `<div class="gd-cin__art"></div><img class="gd-cin__marin" src="${pose('wave')}" alt="Marin"><div class="gd-cin__bubble"><p translate="no"></p><div class="gd__actions" translate="no"><button class="kv-button" data-c="next">${say('UI_NEXT')}</button><button class="gd__skip" data-c="skip">${say('UI_SKIP_INTRO')}</button></div></div>`);
    let n = 0; const show = () => { box.querySelector('p').textContent = say(ids[n]); }; show();
    box.addEventListener('click', e => { e.stopPropagation(); const c = e.target.closest('[data-c]')?.dataset.c; if (!c) return; if (c === 'next' && ++n < ids.length) return show(); box.remove(); done(); });
    document.body.append(box);
  }
  return {
    start(resumed) {
      document.body.classList.add('is-guided');
      seen = S().events.length;
      document.body.append(ring, glow, root, help);
      const go = () => { director.start(); setInterval(tick, 150); };
      if (resumed) go(); else { root.hidden = true; cinematic(go); }
    },
    allow(action) { const ok = director.allow(action); if (!ok) flash('NOT_NOW'); return ok; },
    inspected: uid => director.inspected(uid),
    // Motivo recusado pela engine vira fala; a regra continua sendo dela.
    onWarn(text) { if (director.finished) return; if (/\{\d+\}\{[CBL]\}|Needs/.test(text)) flash('NO_COSMO'); else if (/target|Guardian/i.test(text)) flash('BAD_TARGET'); },
    scripted: () => director.policy() === 'scripted',
    rivalAction: () => director.rivalAction(), rivalDone: () => director.rivalDone(), answer: req => director.answer(req),
    get director() { return director; },
  };
}
