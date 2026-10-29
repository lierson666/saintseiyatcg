// KV oficial do Saint Seiya TCG (autor, 29/10/2026): céu de estrelas com as constelações dos Cavaleiros de Bronze
// e o ponteiro com cosmo. Vale para a home, o login e todas as telas fora da partida (ver docs/kv-oficial.md).
// Uso: import {mountKV} from '/shared/kv-sky.js'; const kv = mountKV({anchor: 'h1 .cosmo'}); kv.warm(); kv.burst(el);
const TEXT_FIELDS = 'input[type=text], input[type=email], input[type=password], input[type=search], textarea';
const POINTER = `<svg class="kv-pointer" aria-hidden="true" width="34" height="38" viewBox="0 0 34 38">
  <defs><linearGradient id="kv-pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#e6c36a"/><stop offset="1" stop-color="#ff8a2b"/></linearGradient></defs>
  <path d="M5 4 L5 31 L12.5 23.5 L28 25.5 Z" fill="#02040ca6" stroke="url(#kv-pg)" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M7.4 9 L7.4 14" stroke="#fffbe8" stroke-width="1.4" stroke-linecap="round" opacity=".85"/></svg>`;

export function mountKV({anchor: anchorSelector = null} = {}) {
  // Céu próprio, inspirado no estilo dos apps de astronomia (autor, 29/10/2026; nada copiado de app nenhum):
  // degradê noturno até um horizonte que brilha, Via Láctea, estrelas com cor e as constelações dos Cavaleiros de Bronze
  // em traço fino com nome. O cosmo (partículas douradas/brasa) segue o ponteiro, acende a constelação mais próxima,
  // cresce ao digitar e explode ao cadastrar. Com prefers-reduced-motion, só o céu parado.
  const layer = cls => Object.assign(document.createElement('canvas'), {className: cls, ariaHidden: 'true'});
  const sky = layer('kv-sky'), trail = layer('kv-trail'), g = sky.getContext('2d'), tg = trail.getContext('2d');
  document.body.prepend(sky); document.body.append(trail);
  document.body.insertAdjacentHTML('beforeend', POINTER);
  const pointer = document.body.lastElementChild;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Constelações simplificadas: pontos num quadro 0..1 e ligações por índice; `at` = centro em fração da tela, `s` = tamanho.
  const FIGURES = [
    {name: 'Pegasus', at: [.78, .26], s: .30, p: [[.30,.55],[.30,.25],[.65,.25],[.65,.55],[.15,.62],[.05,.72],[0,.86],[.14,.16],[.02,.08]], l: [[0,1],[1,2],[2,3],[3,0],[0,4],[4,5],[5,6],[1,7],[7,8]]},
    {name: 'Andromeda', at: [.94, .56], s: .24, p: [[0,.15],[.3,.32],[.55,.45],[.85,.68],[.42,.62],[.2,.8]], l: [[0,1],[1,2],[2,3],[1,4],[4,5]]},
    {name: 'Cygnus', at: [.16, .2], s: .26, p: [[.5,0],[.5,.42],[.5,1],[.16,.46],[0,.58],[.84,.36],[1,.3]], l: [[0,1],[1,2],[1,3],[3,4],[1,5],[5,6]]},
    {name: 'Draco', at: [.5, .12], s: .30, p: [[.86,.1],[.96,.22],[.88,.32],[.78,.22],[.68,.4],[.55,.55],[.44,.42],[.3,.58],[.2,.78],[.05,.88]], l: [[0,1],[1,2],[2,3],[3,0],[2,4],[4,5],[5,6],[6,7],[7,8],[8,9]]},
    {name: 'Phoenix', at: [.12, .78], s: .24, p: [[.5,0],[.32,.36],[.68,.36],[.15,.74],[.85,.74],[.5,.56]], l: [[0,1],[0,2],[1,3],[2,4],[1,5],[2,5]]},
  ];
  const TINTS = ['#cfe0ff', '#ffffff', '#fff3d6', '#ffd29a', '#ffb27a', '#a9c8ff'];
  let W = 0, H = 0, dpr = 1, stars = [], sparks = [], figures = [], milky = null, heat = 0, t = 0;
  const me = {x: innerWidth * .7, y: innerHeight * .5, tx: innerWidth * .7, ty: innerHeight * .5, active: false};
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    sky.width = W * dpr; sky.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    trail.width = W * dpr; trail.height = H * dpr; tg.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(W * H / 2200);
    stars = Array.from({length: n}, () => ({x: Math.random() * W, y: Math.random() * H, z: Math.random() ** 3, tw: Math.random() * 6.28, c: TINTS[Math.random() * TINTS.length | 0]}));
    const unit = Math.min(W, H * 1.4);
    figures = FIGURES.map(f => ({...f, pts: f.p.map(([x, y]) => [f.at[0] * W + (x - .5) * f.s * unit, f.at[1] * H + (y - .5) * f.s * unit]), glow: 0}));
    milky = paintMilkyWay();
  }
  // Via Láctea: faixa diagonal pintada uma vez num canvas fora da tela (nuvem + poeira de estrelas).
  function paintMilkyWay() {
    const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr;
    const m = c.getContext('2d'); m.setTransform(dpr, 0, 0, dpr, 0, 0);
    m.translate(W / 2, H / 2); m.rotate(-.42); const len = Math.hypot(W, H);
    for (let i = 0; i < 70; i++) {
      const x = (Math.random() - .5) * len, y = (Math.random() - .5) * H * .22, r = 40 + Math.random() * 140;
      const cloud = m.createRadialGradient(x, y, 0, x, y, r);
      cloud.addColorStop(0, `rgba(${150 + Math.random() * 60 | 0},${150 + Math.random() * 40 | 0},255,${.035 + Math.random() * .04})`); cloud.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = cloud; m.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < W * H / 260; i++) {
      const y = (Math.random() + Math.random() + Math.random() - 1.5) * H * .16;
      m.fillStyle = `rgba(230,236,255,${Math.random() * .5})`; m.fillRect((Math.random() - .5) * len, y, .7, .7);
    }
    return c;
  }
  function anchor() { // sem ponteiro: o céu se orienta pelo elemento-âncora (ex.: a palavra COSMO) ou pelo centro
    const r = document.querySelector(anchorSelector)?.getBoundingClientRect();
    return r ? {x: r.left + r.width / 2, y: r.top + r.height / 2} : {x: W * .6, y: H * .45};
  }
  // Ponteiro com cosmo (autor, 29/10/2026): seta dourada em SVG acima de tudo e um rastro fino de brasas saindo da ponta.
  // Só com mouse; no toque fica o cursor do sistema. Digitar aquece o brilho; cadastrar solta um anel de brasas.
  const fine = matchMedia('(pointer: fine)').matches;
  let tip = null, lastTip = null;
  if (fine && !still) document.documentElement.classList.add('cosmo-pointer');
  function spawn(x, y, burst = 0) {
    const a = Math.random() * 6.28, v = burst ? 1.5 + Math.random() * 3.5 : Math.random() * .5;
    sparks.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (burst ? 0 : .35), life: 1, decay: burst ? .018 + Math.random() * .02 : .03 + Math.random() * .03,
      r: burst ? .8 + Math.random() * 1.6 : .5 + Math.random() * 1.1, hue: 28 + Math.random() * 22});
  }
  function paintTrail() {
    tg.clearRect(0, 0, W, H);
    if (tip && lastTip) { // brasas só quando o ponteiro anda
      const steps = Math.min(6, Math.hypot(tip.x - lastTip.x, tip.y - lastTip.y) / 6 | 0);
      for (let i = 0; i < steps + (heat > .2 ? 1 : 0); i++) spawn(lastTip.x + (tip.x - lastTip.x) * i / Math.max(steps, 1), lastTip.y + (tip.y - lastTip.y) * i / Math.max(steps, 1));
    }
    lastTip = tip && {...tip};
    tg.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx; p.y += p.vy; p.vx *= .95; p.vy = p.vy * .95 - .015; p.life -= p.decay;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      tg.fillStyle = `hsla(${p.hue},100%,${60 + p.life * 25}%,${p.life})`;
      tg.beginPath(); tg.arc(p.x, p.y, p.r * p.life + .3, 0, 6.28); tg.fill();
    }
    tg.globalCompositeOperation = 'source-over';
    if (sparks.length > 400) sparks.splice(0, sparks.length - 400);
    pointer.style.filter = `drop-shadow(0 0 ${4 + heat * 6}px #ff8a2bcc) drop-shadow(0 0 ${12 + heat * 14 + Math.sin(t * .06) * 3}px #e6c36a88)`;
  }
  function paintSky(ox, oy) {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#02040c'); bg.addColorStop(.45, '#071433'); bg.addColorStop(.82, '#0d2350'); bg.addColorStop(1, '#1d2f5e');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const horizon = g.createRadialGradient(W * .5, H * 1.15, 0, W * .5, H * 1.15, H * .75);
    horizon.addColorStop(0, 'rgba(255,150,80,.32)'); horizon.addColorStop(.4, 'rgba(120,90,200,.16)'); horizon.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = horizon; g.fillRect(0, 0, W, H);
    g.globalAlpha = .9; g.drawImage(milky, ox * .4, oy * .4, W, H); g.globalAlpha = 1;
    for (const s of stars) {
      const x = s.x - ox * s.z, y = s.y - oy * s.z, size = .5 + s.z * 2.2;
      g.globalAlpha = (.35 + .65 * Math.abs(Math.sin(t * .015 + s.tw))) * (.45 + s.z * .55);
      g.fillStyle = s.c; g.beginPath(); g.arc(x, y, size * .6, 0, 6.28); g.fill();
      if (s.z > .55) { g.globalAlpha *= .25; g.beginPath(); g.arc(x, y, size * 2.2, 0, 6.28); g.fill(); }
    }
    g.globalAlpha = 1;
  }
  function paintFigures(ox, oy) {
    g.font = '500 11px Jost, sans-serif'; g.textAlign = 'center';
    if ('letterSpacing' in g) g.letterSpacing = '4px';
    for (const f of figures) {
      const cx = f.at[0] * W - ox, cy = f.at[1] * H - oy, near = Math.hypot(me.x - cx, me.y - cy) < Math.min(W, H) * .22;
      f.glow += ((near ? 1 : 0) - f.glow) * .06;
      const pts = f.pts.map(([x, y]) => [x - ox, y - oy]);
      g.lineWidth = 1 + f.glow; g.strokeStyle = `rgba(${150 + f.glow * 100 | 0},${185 + f.glow * 10 | 0},${255 - f.glow * 150 | 0},${.28 + f.glow * .5})`;
      g.beginPath(); for (const [a, b] of f.l) { g.moveTo(...pts[a]); g.lineTo(...pts[b]); } g.stroke();
      for (const [x, y] of pts) {
        g.fillStyle = f.glow > .3 ? '#ffe7a3' : '#e8f0ff'; g.beginPath(); g.arc(x, y, 1.6 + f.glow * 1.4, 0, 6.28); g.fill();
        g.fillStyle = `rgba(200,220,255,${.12 + f.glow * .2})`; g.beginPath(); g.arc(x, y, 5 + f.glow * 4, 0, 6.28); g.fill();
      }
      const low = pts.reduce((m, p) => Math.max(m, p[1]), -Infinity);
      g.fillStyle = `rgba(${190 + f.glow * 60 | 0},${205 + f.glow * 20 | 0},255,${.45 + f.glow * .5})`;
      g.fillText(f.name.toUpperCase(), cx, low + 22);
    }
    if ('letterSpacing' in g) g.letterSpacing = '0px';
  }
  function frame() {
    t += 1;
    const target = me.active ? me : anchor();
    me.x += ((me.active ? me.tx : target.x) - me.x) * .08; me.y += ((me.active ? me.ty : target.y) - me.y) * .08;
    heat *= .985;
    const ox = (me.x / W - .5) * 26, oy = (me.y / H - .5) * 18;
    paintSky(ox, oy);
    paintFigures(ox * .6, oy * .6);
    paintTrail();
    if (!still && !document.hidden) requestAnimationFrame(frame);
  }
  function paintStill() { paintSky(0, 0); paintFigures(0, 0); } // movimento reduzido: céu e constelações parados
  const move = (x, y) => { me.tx = x; me.ty = y; me.active = true; };
  addEventListener('pointermove', e => {
    move(e.clientX, e.clientY);
    if (!fine || still || e.pointerType !== 'mouse') return;
    tip = {x: e.clientX + 5, y: e.clientY + 4}; // ponta da seta
    pointer.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    pointer.style.opacity = e.target.closest(TEXT_FIELDS) ? '0' : '1';
  }, {passive: true});
  addEventListener('pointerdown', e => { move(e.clientX, e.clientY); heat = Math.min(1, heat + .3); }, {passive: true});
  document.documentElement.addEventListener('pointerleave', () => { me.active = false; tip = lastTip = null; pointer.style.opacity = '0'; });
  addEventListener('resize', () => { resize(); if (still) paintStill(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !still) requestAnimationFrame(frame); });
  resize();
  if (still) paintStill(); else requestAnimationFrame(frame);


  return {
    warm(step = .08) { heat = Math.min(1, heat + step); }, // digitar acende o cosmo
    burst(el) { // anel de brasas a partir de um elemento (ex.: botão de envio)
      if (still) return;
      const r = el.getBoundingClientRect();
      for (let i = 0; i < 120; i++) spawn(r.left + r.width / 2, r.top + r.height / 2, 1);
      heat = 1;
    },
  };
}
