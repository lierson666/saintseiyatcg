// Meteoro de Pégaso: a barrage of bright blue light streaks hammering a card-sized target, hits landing one after another.
import { Particles, Lights, P, Rng, fit, sparkle, clamp, smooth, ease, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Meteoro de Pégaso",
  desc: "Blue light streaks hit the target in quick sequence, each ending in sparks. variant 1 rain, 2 fan, 3 sweeping volley.",
  tags: ["projectile", "light", "barrage", "blue", "target", "one-shot"],
  size: [176, 150],
  origin: [88, 75],
  duration: 0.8,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#021e2e", "#00506e", "#008cb4", "#52c8ec", "#94e3fe", "#ffffff"], variant: 1, seed: 7 },
};

const HW = 50, HH = 42; // half of the card area hit

export function create(o) {
  const C = fit(o.palette, 6), R = new Rng(o.seed), V = o.variant || 1;
  const ps = new Particles({ rng: R, ground: () => 999, sparks: [WHITE, C[4], C[3], C[2]] }), lights = new Lights();
  const shots = [];
  const N = V === 1 ? 34 : V === 2 ? 30 : 36;
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1);
    let s;
    if (V === 1) {
      // diagonal rain from upper left, random spots, staggered
      const tx = R.range(-HW, HW), ty = R.range(-HH, HH), ang = R.range(-0.95, -0.6), d = R.range(60, 78);
      s = { t0: 0.02 + k * 0.36 + R.range(-0.03, 0.03), tx, ty, fx: tx - Math.cos(ang) * d, fy: ty + Math.sin(ang) * d, tr: 0.09, len: 0.5, big: R.chance(0.2) };
    } else if (V === 2) {
      // fan from one far point, converging to the center, tightening as it goes
      const sp = 1 - k * 0.8, tx = R.range(-HW, HW) * sp * 0.6, ty = R.range(-HH, HH) * sp * 0.6;
      s = { t0: 0.02 + ease.inQuad(k) * 0.36 + R.range(0, 0.01), tx, ty, fx: -80, fy: -62 + R.range(-6, 6), tr: 0.1, len: 0.45, big: k > 0.82 };
    } else {
      // horizontal volley, rows sweep top to bottom then back, fast jabs
      const row = (i % 9) / 8, sweep = i < 18 ? row : 1 - row;
      const ty = -HH + sweep * HH * 2 + R.range(-3, 3), tx = R.range(-HW * 0.6, HW);
      s = { t0: 0.02 + k * 0.36 + R.range(0, 0.015), tx, ty, fx: -82, fy: ty + R.range(-14, 14) * 0.6 - 10, tr: 0.065, len: 0.6, big: i % 9 === 8 };
    }
    s.fx = Math.max(s.fx, -82); s.fy = clamp(s.fy, -68, 68);
    s.hit = false;
    shots.push(s);
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const s of shots) {
        if (!s.hit && t >= s.t0 + s.tr) {
          s.hit = true; s.th = t;
          const n = s.big ? 9 : 4;
          lights.add(s.tx, s.ty, s.big ? 30 : 16, C[3], 0.8, s.big ? 0.22 : 0.14);
          lights.add(s.tx, s.ty, 8, WHITE, 0.7, 0.07);
          for (let j = 0; j < n; j++) {
            const a = R.range(0, TAU), sp = R.range(60, s.big ? 190 : 140);
            ps.spawn(P.SPARK, s.tx, s.ty, Math.cos(a) * sp, Math.sin(a) * sp - 20, R.range(0.1, 0.28));
          }
          if (s.big) for (let j = 0; j < 3; j++) ps.spawn(P.STAR, s.tx + R.range(-6, 6), s.ty + R.range(-6, 6), 0, 0, R.range(0.15, 0.3), R.pick([C[4], WHITE]), R.range(0.8, 1.6));
        }
      }
      ps.update(dt); lights.update(dt);
    },
    draw(p) {
      for (const s of shots) {
        const u = (t - s.t0) / s.tr;
        if (u < 0) continue;
        if (u < 1.35) {
          const hu = Math.min(u, 1), tu = Math.max(0, hu - s.len * (u > 1 ? 1 - (u - 1) * 2.5 : 1));
          const hx = s.fx + (s.tx - s.fx) * hu, hy = s.fy + (s.ty - s.fy) * hu;
          const tx = s.fx + (s.tx - s.fx) * tu, ty = s.fy + (s.ty - s.fy) * tu;
          if (u <= 1 || tu < hu - 0.02) {
            p.line(tx, ty, hx, hy, (q) => (q > 0.85 ? WHITE : q > 0.55 ? C[4] : q > 0.25 ? C[3] : C[2]), 1);
            if (true) p.line(tx, ty + 1, hx, hy + 1, (q) => (q > 0.6 ? C[3] : C[1]), 0.8);
            p.glowLine(tx, ty, hx, hy, 3, C[3], 0.35);
            if (u <= 1) { p.px(Math.round(hx), Math.round(hy), WHITE); p.glow(hx, hy, 5, C[4], 0.6); }
          }
        }
        if (s.hit) {
          const a = t - s.th;
          if (a < 0.14) {
            const arm = (s.big ? 6 : 3) * (1 - a / 0.14);
            sparkle(p, s.tx, s.ty, arm, a < 0.04 ? WHITE : C[4], C[3], 0.5);
          }
        }
      }
      // soft pool of light on the target while the barrage lands
      const pool = smooth(clamp(t / 0.15, 0, 1)) * (1 - smooth(clamp((t - 0.5) / 0.3, 0, 1)));
      if (pool > 0) p.glow(0, 0, 58, C[2], 0.28 * pool);
      ps.draw(p); lights.draw(p);
    },
  };
}
