// Relógio do Live Preview (star-hill/criador.html): pausa, avança quadro a quadro e desacelera a mesa inteira,
// sem o jogo saber: timers, rAF, performance.now e animações CSS passam a andar neste tempo. Só existe no teste; a partida nunca instala.
// shortcut: setInterval e o som seguem no tempo real, porque só o relógio do turno e os áudios usam; se um efeito visual usar setInterval, incluir aqui.
export const FRAME_MS = 1000 / 60;

export function installClock(win = window) {
  if (win.__previewClock) return win.__previewClock;
  const real = {setTimeout: win.setTimeout.bind(win), clearTimeout: win.clearTimeout.bind(win), raf: win.requestAnimationFrame.bind(win), cancel: win.cancelAnimationFrame.bind(win), now: win.performance.now.bind(win.performance), setInterval: win.setInterval.bind(win)};
  let time = real.now(), lastReal = time, rate = 1, paused = false, nextId = 1e6, frames = 0, worst = 0, windowStart = time, lastTick = time, shown = {fps: 0, piorMs: 0};
  const timers = new Map(), rafs = new Map(), held = new Set();

  // Animações CSS e Web Animations têm relógio próprio: seguem o mesmo estado a cada passo.
  function syncCss(stepMs = 0) {
    if (!win.document?.getAnimations || (rate === 1 && !paused && !held.size)) return;
    for (const a of win.document.getAnimations()) {
      if (typeof a.currentTime !== 'number') continue; // ligada à rolagem, não ao tempo
      if (paused) {
        if (a.playState === 'running') { a.pause(); held.add(a); }
        if (stepMs && held.has(a)) a.currentTime = (a.currentTime ?? 0) + stepMs;
      } else if (a.playbackRate !== rate) a.playbackRate = rate;
    }
    if (!paused) { for (const a of held) if (a.playState === 'paused') a.play(); held.clear(); }
  }
  function advance(ms) {
    time += ms;
    for (const [id, t] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
      if (t.at > time) break;
      if (timers.delete(id)) t.fn(...t.args);
    }
    const due = [...rafs.values()];
    rafs.clear();
    for (const fn of due) fn(time);
  }
  function pump() {
    const at = real.now(), dt = at - lastReal;
    if (dt <= 0) return;
    lastReal = at;
    frames++; worst = Math.max(worst, at - lastTick); lastTick = at;
    if (at - windowStart >= 500) { shown = {fps: Math.round(frames * 1000 / (at - windowStart)), piorMs: Math.round(worst)}; frames = 0; worst = 0; windowStart = at; }
    if (!paused) advance(dt * rate);
    syncCss();
  }
  const frame = () => { pump(); real.raf(frame); };
  real.raf(frame);
  real.setInterval(pump, 250); // pane escondido não anda o rAF: o teste não pode ficar parado por isso

  win.setTimeout = (fn, ms = 0, ...args) => { const id = ++nextId; timers.set(id, {at: time + Number(ms || 0), fn, args}); return id; };
  win.clearTimeout = id => { if (!timers.delete(id)) real.clearTimeout(id); };
  win.requestAnimationFrame = fn => { const id = ++nextId; rafs.set(id, fn); return id; };
  win.cancelAnimationFrame = id => { if (!rafs.delete(id)) real.cancel(id); };
  win.performance.now = () => time;

  return (win.__previewClock = {
    get paused() { return paused; },
    get rate() { return rate; },
    pause(on = true) { paused = on; syncCss(); },
    setRate(k) { rate = k; syncCss(); },
    step(ms = FRAME_MS) { if (!paused) return; advance(ms); syncCss(ms); },
    stats: () => shown,
    realTime(fn) { const fake = win.performance.now; win.performance.now = real.now; try { return fn(); } finally { win.performance.now = fake; } }, // medir render precisa do relógio de verdade
  });
}
