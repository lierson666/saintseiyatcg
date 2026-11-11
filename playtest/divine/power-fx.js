// Hover dos poderes do Deus (autor, 07/11/2026): partículas no tema de cada Deus, dentro do botão sob o mouse.
// Athena: poeira dourada subindo · Poseidon: bolhas · Hades: névoa violeta · Ares: brasas · Artemis: estrelas prateadas.
// Um canvas 2D por vez, criado no hover e apagado na saída; sem animação com movimento reduzido.
const THEMES = {
  athena: {rgb: '255, 226, 150', n: 26, spawn: (w, h) => ({x: Math.random() * w, y: h + 4, vx: (Math.random() - .5) * 6, vy: -(10 + Math.random() * 18), r: .6 + Math.random() * 1.6, life: 2.4 + Math.random() * 1.6})},
  poseidon: {rgb: '140, 220, 255', n: 18, ring: true, spawn: (w, h) => ({x: Math.random() * w, y: h + 6, vx: 0, vy: -(14 + Math.random() * 16), r: 1.2 + Math.random() * 2.6, life: 2.2 + Math.random() * 1.4, wob: Math.random() * 6.28})},
  hades: {rgb: '150, 100, 255', n: 12, smoke: true, spawn: (w, h) => ({x: Math.random() * w, y: h * (.5 + Math.random() * .6), vx: 6 + Math.random() * 8, vy: -(3 + Math.random() * 5), r: 14 + Math.random() * 22, life: 3 + Math.random() * 2})},
  ares: {rgb: '255, 110, 50', n: 30, ember: true, spawn: (w, h) => ({x: Math.random() * w, y: h + 2, vx: (Math.random() - .5) * 14, vy: -(26 + Math.random() * 30), r: .7 + Math.random() * 1.3, life: 1.2 + Math.random() * 1})},
  artemis: {rgb: '225, 235, 255', n: 22, star: true, spawn: (w, h) => ({x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0, r: .8 + Math.random() * 1.8, life: 1.6 + Math.random() * 1.8})},
};
export const themeOf = god => (THEMES[String(god || '').toLowerCase()] ? String(god).toLowerCase() : 'athena');

export function mountPowerFx(root, god, {selector = '[data-power]', reduceMotion = false} = {}) {
  const theme = THEMES[themeOf(god)];
  let cur = null;
  const stop = () => { if (!cur) return; const c = cur; cur = null; c.canvas.style.opacity = '0'; setTimeout(() => { cancelAnimationFrame(c.raf); c.canvas.remove(); }, 260); };
  root.addEventListener('pointermove', e => {
    const b = e.target.closest?.(selector);
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${e.clientX - r.left}px`); b.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
  root.addEventListener('pointerover', e => {
    const b = e.target.closest?.(selector);
    if (b === cur?.btn) return;
    stop();
    if (!b || reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas'), dpr = Math.min(devicePixelRatio || 1, 2), w = b.clientWidth, h = b.clientHeight;
    canvas.className = 'power-fx'; canvas.width = w * dpr; canvas.height = h * dpr; canvas.setAttribute('aria-hidden', 'true');
    b.prepend(canvas);
    requestAnimationFrame(() => { canvas.style.opacity = '1'; });
    const g = canvas.getContext('2d'); g.scale(dpr, dpr);
    const parts = Array.from({length: theme.n}, () => { const p = theme.spawn(w, h); p.age = Math.random() * p.life; return p; });
    let last = performance.now();
    const c = cur = {btn: b, canvas, raf: 0};
    const tick = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.age += dt;
        if (p.age > p.life || p.y < -30 || p.x > w + 40) Object.assign(p, theme.spawn(w, h), {age: 0});
        const t = p.age / p.life, fade = Math.sin(Math.PI * t);
        p.x += (p.vx + (theme.ring ? Math.sin(p.wob + p.age * 4) * 10 : 0)) * dt; p.y += p.vy * dt;
        if (theme.smoke) {
          const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (1 + t));
          grad.addColorStop(0, `rgba(${theme.rgb}, ${.16 * fade})`); grad.addColorStop(1, `rgba(${theme.rgb}, 0)`);
          g.fillStyle = grad; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + t), 0, 7); g.fill();
        } else if (theme.ring) {
          g.strokeStyle = `rgba(${theme.rgb}, ${.55 * fade})`; g.lineWidth = .8; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.stroke();
        } else if (theme.star) {
          const a = fade * (.5 + .5 * Math.sin(p.age * 9)), s = p.r * 2.6;
          g.strokeStyle = `rgba(${theme.rgb}, ${.8 * a})`; g.lineWidth = .7;
          g.beginPath(); g.moveTo(p.x - s, p.y); g.lineTo(p.x + s, p.y); g.moveTo(p.x, p.y - s); g.lineTo(p.x, p.y + s); g.stroke();
          g.fillStyle = `rgba(${theme.rgb}, ${a})`; g.beginPath(); g.arc(p.x, p.y, p.r * .6, 0, 7); g.fill();
        } else {
          const flick = theme.ember ? .6 + .4 * Math.sin(p.age * 30 + p.x) : 1, a = fade * flick;
          if (theme.ember) { g.strokeStyle = `rgba(${theme.rgb}, ${.5 * a})`; g.lineWidth = p.r; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .05, p.y - p.vy * .05); g.stroke(); }
          const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          grad.addColorStop(0, `rgba(${theme.rgb}, ${a})`); grad.addColorStop(1, `rgba(${theme.rgb}, 0)`);
          g.fillStyle = grad; g.beginPath(); g.arc(p.x, p.y, p.r * 4, 0, 7); g.fill();
        }
      }
      if (cur === c) c.raf = requestAnimationFrame(tick);
    };
    c.raf = requestAnimationFrame(tick);
  });
  root.addEventListener('pointerleave', stop);
}
