// Derrota épica do God (autor, 06/11/2026), como no Arena: o retrato racha e explode com a moldura em poeira estelar,
// e tudo o que o derrotado tem na mesa (mão, campo e Bases) explode e vira poeira, enquanto um degradê escuro
// toma a metade dele até o meio do board. Só apresentação: a engine já decidiu a partida.
// Movimento em CSS (death.css) e efeitos do Sprite Fusion (pixel-vfx).
const THEME = {
  athena: {glow: '255, 214, 120', star: '#ffe8b0', crack: 'light', burst: 'explosion'},
  poseidon: {glow: '90, 180, 255', star: '#bfe6ff', crack: 'ice', burst: 'bubbles'},
  hades: {glow: '170, 100, 255', star: '#d8c0ff', crack: 'dark', burst: 'dark'},
  ares: {glow: '255, 110, 50', star: '#ffc890', crack: 'fire', burst: 'explosion'},
  artemis: {glow: '200, 255, 235', star: '#e8fff6', crack: 'sparkle', burst: 'light'},
};
const SHARDS = 14;
const center = r => ({x: r.left + r.width / 2, y: r.top + r.height / 2});
const box = el => el?.getBoundingClientRect();

// Rachaduras do retrato, partindo do centro em zigue-zague.
function cracks() {
  const lines = Array.from({length: 9}, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + (i % 2) * .3;
    let d = 'M50 50';
    for (let s = 1; s <= 4; s++) { const r = s * 12, j = s % 2 ? .35 : -.3; d += ` L${(50 + Math.cos(a + j) * r).toFixed(1)} ${(50 + Math.sin(a + j) * r).toFixed(1)}`; }
    return `<path d="${d}" style="--i:${i}"/>`;
  });
  return `<svg class="death-cracks" viewBox="0 0 100 100" aria-hidden="true">${lines.join('')}</svg>`;
}

// Cacos do retrato: fatias em leque do mesmo fundo, voando para fora girando.
function shatter(portrait, layer) {
  const r = box(portrait), cs = getComputedStyle(portrait), wrap = document.createElement('div');
  wrap.className = 'death-shards';
  Object.assign(wrap.style, {left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`});
  for (let i = 0; i < SHARDS; i++) {
    const a0 = (i / SHARDS) * 360, a1 = ((i + 1) / SHARDS) * 360, mid = ((a0 + a1) / 2) * Math.PI / 180;
    const pt = a => { const t = a * Math.PI / 180; return `${(50 + Math.cos(t) * 75).toFixed(1)}% ${(50 + Math.sin(t) * 75).toFixed(1)}%`; };
    const s = document.createElement('i'), far = r.width * (1.6 + (i % 3) * .5);
    s.className = 'death-shard';
    Object.assign(s.style, {backgroundImage: cs.backgroundImage, backgroundSize: cs.backgroundSize, backgroundPosition: cs.backgroundPosition,
      clipPath: `polygon(${(50 + Math.cos(mid) * 12).toFixed(1)}% ${(50 + Math.sin(mid) * 12).toFixed(1)}%, ${pt(a0)}, ${pt(a1)})`});
    s.style.setProperty('--dx', `${(Math.cos(mid) * far).toFixed(0)}px`);
    s.style.setProperty('--dy', `${(Math.sin(mid) * far + r.width * .6).toFixed(0)}px`);
    s.style.setProperty('--rot', `${(i % 2 ? 1 : -1) * (120 + i * 23)}deg`);
    s.style.setProperty('--k', i % 4);
    wrap.append(s);
  }
  layer.append(wrap);
}

// Um elemento da mesa explode: clarão, some em poeira subindo e solta estrelas do tamanho dele.
function stardust(el, i, {fx, pixel, theme}) {
  const r = box(el);
  if (!r?.width) return;
  el.style.setProperty('--k', i);
  el.classList.add('death-dust');
  const c = center(r), delay = 120 + i * 55;
  setTimeout(() => {
    fx?.burst(c.x, c.y, {color: theme.star, count: Math.round(18 + r.width * .35), speed: 140, grav: -60, life: 1.9, size: 5});
    fx?.burst(c.x, c.y, {color: '#ffffff', count: 10, speed: 220, life: .7, size: 3});
    pixel('sparkle', r, {color: theme.star});
  }, delay);
}

// `fx`: partículas da arena (falta com VFX desligado); `pixel(recipe, rect, opts)`: Sprite Fusion; `wait(ms)` já escala pela velocidade.
// `ruin()`: põe o degradê escuro sobre a metade do derrotado.
export async function epicDeath({god, root, godEl, cards, bases, hand, ruin, fx, pixel, wait, shake, steps}) {
  const theme = THEME[god] || THEME.athena, portrait = godEl?.querySelector('.godhud__portrait') || godEl;
  const pr = box(portrait), at = pr && center(pr), color = `rgb(${theme.glow})`;
  ruin?.(); // o escuro começa a tomar conta já no primeiro tempo
  if (!root || !pr) return;
  const layer = document.createElement('div');
  layer.className = `death-layer death--${god}`;
  layer.style.setProperty('--dglow', theme.glow);
  layer.style.setProperty('--hx', `${at.x}px`); layer.style.setProperty('--hy', `${at.y}px`);
  document.body.append(layer);

  // 1. O retrato treme e racha em luz do deus.
  godEl.classList.add('death-crack');
  godEl.style.setProperty('--dglow', theme.glow);
  portrait.insertAdjacentHTML('beforeend', cracks());
  shake(4);
  if (fx) steps?.[0]?.(fx, at);
  pixel(theme.crack, pr, {color});
  await wait(950);

  // 2. Retrato e moldura explodem: clarão, cacos e a moldura inteira em poeira estelar.
  shatter(portrait, layer);
  godEl.classList.add('death-gone');
  stardust(godEl, 0, {fx, pixel, theme});
  layer.insertAdjacentHTML('beforeend', '<div class="death-flash"></div>');
  pixel(theme.burst, {left: pr.left - pr.width, top: pr.top - pr.height, width: pr.width * 3, height: pr.height * 3}, {color, strength: 1.6});
  if (fx) steps?.[1]?.(fx, at);
  fx?.shockwave(at.x, at.y, {color, size: 420});
  shake(18);
  await wait(380);

  // 3. Tudo do derrotado explode em poeira estelar, do mais perto do God para longe.
  const all = [...cards, ...bases, ...hand].filter(el => box(el)?.width).map(el => ({el, d: dist(el, at)})).sort((a, b) => a.d - b.d);
  all.forEach(({el}, i) => stardust(el, i + 1, {fx, pixel, theme}));
  await wait(900 + Math.min(all.length, 16) * 55);

  shake(6);
  await wait(700);
  layer.classList.add('is-ending');
  setTimeout(() => layer.remove(), 1000);
}
const dist = (el, at) => { const c = center(box(el)); return Math.hypot(c.x - at.x, c.y - at.y); };
