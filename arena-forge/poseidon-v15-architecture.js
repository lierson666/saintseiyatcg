// POSEIDON PALACE V15 — Cinematic Environment Art Pass (08/11/2026). Só desenvolvimento: ?palaceV15=1.
// Geometria monumental feita aqui, com BufferGeometry (o Three.js enxuto da partida não tem Lathe, Extrude nem Icosaedro,
// e o vendor compartilhado não é modificado). O palácio usa estas peças no MESMO WorldRoot, nas mesmas coordenadas:
// troca as primitivas, não constrói outra fachada. Arte de material (pigmento, pátina, veios, rugosidade, relevo,
// cavidade, ouro e desgaste de quina) num bloco GLSL só, com uniformes ajustáveis no Arena Forge (Material Studio).

export function palaceV15Flag() {
  try { return new URLSearchParams(location.search).get('palaceV15') === '1'; } catch { return false; }
}

// ---------------- Arte de material ----------------
export const ART_PARAMS = [
  ['pigment', 'Pigmentação', 0, 1, .01], ['patina', 'Pátina marinha', 0, 1, .01], ['veins', 'Veios', 0, 2, .01],
  ['roughness', 'Rugosidade (desvio)', -.4, .4, .01], ['normal', 'Intensidade do relevo', 0, 2, .01], ['cavity', 'Contraste de cavidade', 0, 1, .01],
  ['gold', 'Intensidade do ouro', 0, 2, .01], ['edge', 'Desgaste de quina', 0, 1, .01],
];
export const ART_DEFAULTS = {pigment: .55, patina: .45, veins: 1.15, roughness: .04, normal: .35, cavity: .55, gold: 1, edge: .45};

export function artUniforms(values = {}) {
  const u = {};
  for (const [k] of ART_PARAMS) u[`uA_${k}`] = {value: values[k] ?? ART_DEFAULTS[k]};
  return u;
}
export function applyArt(u, p) { for (const [k] of ART_PARAMS) if (p[k] !== undefined && u[`uA_${k}`]) u[`uA_${k}`].value = +p[k]; }
export function readArt(u) { const p = {}; for (const [k] of ART_PARAMS) p[k] = +u[`uA_${k}`].value.toFixed(3); return p; }

export const ART_UNIFORMS_GLSL = `uniform float uA_pigment, uA_patina, uA_veins, uA_roughness, uA_normal, uA_cavity, uA_gold, uA_edge, uA_isGold;`;
// Cor: manchas de pigmento largas (marfim quente/frio), pátina teal nas partes baixas e voltadas para baixo,
// cavidade (escurece perto do chão de cada peça e nos sulcos do ruído) e desgaste claro nas quinas (curvatura da normal).
export const ART_COLOR_GLSL = `{
    float aBig = msN(vWP * .045 + 3.1);
    vec3 warm = vec3(1.04, 1.0, .9), cool = vec3(.9, .97, 1.05);
    diffuseColor.rgb *= mix(vec3(1.), mix(cool, warm, smoothstep(.35, .65, aBig)), uA_pigment * (1. - uA_isGold));
    float low = 1. - smoothstep(0., 2.6, vWP.y - floor(vWP.y / 40.) * 0.);
    float down = clamp(-vWN.y, 0., 1.);
    float pat = clamp((low * .6 + down * .5) * smoothstep(.38, .7, msN(vWP * .38 + 11.)), 0., 1.) * uA_patina * (1. - uA_isGold * .7);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.55, .82, .8), pat * .75);
    float groove = smoothstep(.62, .3, msN(vWP * 1.7 + 5.));
    diffuseColor.rgb *= 1. - uA_cavity * (.22 * low * (1. - vWN.y * .5) + .1 * groove);
    float curv = clamp(length(fwidth(vWN)) * 6., 0., 1.);
    float wear = curv * smoothstep(.35, .6, msN(vWP * 2.3 + 1.)) * uA_edge;
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb, vec3(1.), .35) * 1.08, wear * (1. - uA_isGold * .5));
    diffuseColor.rgb *= mix(1., .7 + .3 * uA_gold, uA_isGold);
  }`;
export const ART_ROUGH_GLSL = `roughnessFactor = clamp(roughnessFactor + uA_roughness, .05, 1.);`;
// Custo: só ruído de uma oitava (msN) aqui; o fBm (msF) de 4 oitavas dobrava o tempo de GPU da cinemática (benchmark V15).
// Relevo: gradiente de um ruído de pedra (perturbação de normal pela derivada de tela, como o bump do Three.js).
export const ART_NORMAL_GLSL = `{
    float aH = msN(vWP * .8) * .75 + msN(vWP * 2.4) * .25;
    vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
    float hx = dFdx(aH), hy = dFdy(aH);
    vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (hx * r1 + hy * r2);
    normal = normalize(abs(det) * normal - uA_normal * .35 * grad);
  }`;
export const ART_EMISSIVE_GLSL = `totalEmissiveRadiance *= mix(1., uA_gold, uA_isGold);`;

// ---------------- Geometria ----------------
// Torno: perfil [[raio, y], ...] de baixo para cima; normais analíticas do perfil (sem costura), UV = (ângulo, altura).
export function lathe(THREE, prof, segs = 24) {
  const n = prof.length, pos = [], nor = [], uv = [], idx = [];
  const pn = prof.map((p, i) => {
    const a = prof[Math.max(0, i - 1)], b = prof[Math.min(n - 1, i + 1)];
    const dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1;
    return [dy / l, -dr / l];
  });
  for (let s = 0; s <= segs; s++) {
    const t = s / segs * Math.PI * 2, c = Math.cos(t), si = Math.sin(t);
    for (let i = 0; i < n; i++) {
      const [r, y] = prof[i], [nr, ny] = pn[i];
      pos.push(r * c, y, r * si); nor.push(nr * c, ny, nr * si); uv.push(s / segs * 3, y);
    }
  }
  for (let s = 0; s < segs; s++) for (let i = 0; i < n - 1; i++) {
    const a = s * n + i, b = (s + 1) * n + i;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx); return g;
}

// Fuste com êntase e caneluras de verdade (sulcos côncavos que morrem em curva perto do topo e da base). Altura 0..1.
export function flutedShaft(THREE, {segs = 40, flutes = 20, depth = .05, top = .86, rows = [0, .05, .35, .7, .95, 1]} = {}) {
  const pos = [], uv = [], idx = [], R = rows.length;
  for (let s = 0; s < segs; s++) {
    const t = s / segs * Math.PI * 2, c = Math.cos(t), si = Math.sin(t);
    const groove = flutes ? Math.pow(.5 + .5 * Math.cos(t * flutes), .7) : 0;
    for (const y of rows) {
      const ent = 1 - (1 - top) * Math.pow(y, 1.4) + .012 * Math.sin(Math.PI * y); // êntase: leve barriga no terço baixo
      const end = Math.min(1, y / .06, (1 - y) / .06), cut = depth * groove * Math.sqrt(Math.max(0, end));
      const r = ent * (1 - cut);
      pos.push(r * c, y, r * si); uv.push(s / segs * 3, y * 6);
    }
  }
  for (let s = 0; s < segs; s++) for (let i = 0; i < R - 1; i++) {
    const a = s * R + i, b = ((s + 1) % segs) * R + i;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// Perfis clássicos (raio da coluna = 1).
export const ATTIC_BASE = [[0, 0], [1.43, 0], [1.45, .03], [1.44, .07], [1.38, .11], [1.24, .125], [1.16, .15], [1.13, .185], [1.16, .215],
  [1.21, .225], [1.23, .255], [1.2, .295], [1.11, .32], [1.03, .332], [1, .34], [0, .34]];
// Coxim (equino) com astrágalo e anéis: do topo do fuste (0,86) até a face de baixo do ábaco (0,43 acima).
export const ECHINUS = [[0, 0], [.86, 0], [.9, .015], [.92, .035], [.9, .055], [.865, .065], [.875, .085], [.93, .11], [1.02, .16], [1.13, .22],
  [1.24, .29], [1.32, .35], [1.36, .4], [1.37, .43], [0, .43]];
// Balaústre em vaso (altura 1).
export const BALUSTER = [[0, 0], [.24, 0], [.24, .06], [.16, .09], [.14, .14], [.21, .3], [.25, .42], [.21, .56], [.12, .7], [.095, .76],
  [.14, .8], [.18, .86], [.18, .93], [.22, .95], [.22, 1], [0, 1]];
// Braseiro: pé, haste com nós e taça larga (altura 3).
export const BRAZIER = [[0, 0], [.55, 0], [.55, .12], [.32, .2], [.16, .32], [.13, .9], [.2, 1], [.13, 1.1], [.12, 1.8], [.22, 1.92], [.14, 2.02],
  [.3, 2.15], [.62, 2.32], [.86, 2.5], [.92, 2.62], [.82, 2.66], [.5, 2.5], [0, 2.46]];

// Varredura de um perfil (y crescente, z = avanço) ao longo de x, de -L/2 a L/2. Faces planas com tampas: cornijas e molduras.
export function sweep(THREE, prof, L = 1, back = null) {
  const pos = [], h = L / 2, zb = back ?? Math.min(...prof.map(p => p[1]));
  const q = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < prof.length - 1; i++) {
    const [y0, z0] = prof[i], [y1, z1] = prof[i + 1];
    q([-h, y0, z0], [h, y0, z0], [h, y1, z1], [-h, y1, z1]);            // face moldada
    q([h, y0, zb], [h, y0, z0], [h, y1, z1], [h, y1, zb]);              // tampa direita (faixa até o fundo)
    q([-h, y0, z0], [-h, y0, zb], [-h, y1, zb], [-h, y1, z1]);          // tampa esquerda
  }
  const yT = prof[prof.length - 1][0], zT = prof[prof.length - 1][1], y0 = prof[0][0], z0 = prof[0][1];
  q([-h, yT, zT], [h, yT, zT], [h, yT, zb], [-h, yT, zb]);              // topo
  q([-h, y0, zb], [h, y0, zb], [h, y0, z0], [-h, y0, z0]);              // base
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(pos), uv = new Float32Array(p.length / 3 * 2);
  for (let i = 0; i < p.length / 3; i++) { uv[i * 2] = p[i * 3] * .5; uv[i * 2 + 1] = p[i * 3 + 1] + p[i * 3 + 2]; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}
// Cornija (geison + sima): [altura, avanço]. Fundo em z = 0, avanço até 0,62.
export const CORNICE = [[0, 0], [0, .08], [.06, .1], [.07, .3], [.12, .34], [.13, .5], [.2, .52], [.26, .55], [.3, .6], [.34, .62], [.38, .6], [.42, .52], [.46, .5], [.48, .5], [.48, 0]];

// Polígono extrudado com chanfro: relevos do tímpano, palmetas. Contorno anti-horário [[x, y], ...].
function earcut(pts) {
  const idx = pts.map((_, i) => i), tris = [];
  const area = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  const inside = (p, a, b, c) => area(a, b, p) >= 0 && area(b, c, p) >= 0 && area(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 5000) {
    let cut = false;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
      const a = pts[i0], b = pts[i1], c = pts[i2];
      if (area(a, b, c) <= 1e-9) continue;
      if (idx.some(j => j !== i0 && j !== i1 && j !== i2 && inside(pts[j], a, b, c))) continue;
      tris.push(i0, i1, i2); idx.splice(k, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) tris.push(...idx);
  return tris;
}
export function extrudePoly(THREE, outline, depth = .2, bevel = .05) {
  const n = outline.length;
  const off = outline.map((p, i) => { // recuo do chanfro pela bissetriz (miter limitado)
    const a = outline[(i + n - 1) % n], b = outline[(i + 1) % n];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1;
    const n1 = [-e1[1] / l1, e1[0] / l1], n2 = [-e2[1] / l2, e2[0] / l2];
    let m = [n1[0] + n2[0], n1[1] + n2[1]]; const ml = Math.hypot(...m) || 1; m = [m[0] / ml, m[1] / ml];
    const k = Math.min(2.5, 1 / Math.max(.2, m[0] * n1[0] + m[1] * n1[1]));
    return [p[0] + m[0] * bevel * k, p[1] + m[1] * bevel * k];
  });
  const pos = [], tri = earcut(outline), zb = depth - bevel;
  for (let i = 0; i < tri.length; i += 3) for (const j of [tri[i], tri[i + 1], tri[i + 2]]) pos.push(off[j][0], off[j][1], depth);
  const q = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = outline[i], b = outline[j];
    q([a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], zb], [a[0], a[1], zb]);
    q([a[0], a[1], zb], [b[0], b[1], zb], [off[j][0], off[j][1], depth], [off[i][0], off[i][1], depth]);
  }
  const g = new THREE.BufferGeometry(), p = new Float32Array(pos), uv = new Float32Array(p.length / 3 * 2);
  for (let i = 0; i < p.length / 3; i++) { uv[i * 2] = p[i * 3] * .5; uv[i * 2 + 1] = p[i * 3 + 1] * .5; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}
// Junta várias geometrias não indexadas (com uv) numa só: um draw call por material.
export function merge(THREE, parts) {
  const P = [], U = [];
  for (const [g, m] of parts) { // m: matriz [px, py, pz, sx, sy, sz, rotZ]
    const p = g.index ? g.toNonIndexed() : g, a = p.attributes.position.array, uv = p.attributes.uv?.array;
    const [px, py, pz, sx = 1, sy = 1, sz = 1, rz = 0] = m, c = Math.cos(rz), s = Math.sin(rz);
    for (let i = 0; i < a.length; i += 3) {
      const x = a[i] * sx, y = a[i + 1] * sy;
      P.push(x * c - y * s + px, x * s + y * c + py, a[i + 2] * sz + pz);
      U.push(uv ? uv[i / 3 * 2] : 0, uv ? uv[i / 3 * 2 + 1] : 0);
    }
    if (p !== g) p.dispose(); g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(U), 2));
  g.computeVertexNormals(); return g;
}

// Onda que enrola (relevo do tímpano): crista em espiral que nasce de uma base horizontal. Origem na base, altura ~1.
export function waveOutline(turns = .85, n = 30) {
  const outer = [], inner = [], cx = .55, cy = .55;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = -Math.PI / 4 + Math.PI * 2 * turns * t, r = .5 * Math.exp(-1.15 * t), w = .2 * (1 - t) + .04;
    outer.push([cx + Math.cos(a) * (r + w / 2), cy + Math.sin(a) * (r + w / 2)]);
    inner.push([cx + Math.cos(a) * (r - w / 2), cy + Math.sin(a) * (r - w / 2)]);
  }
  return [[-.15, 0], [1.25, 0], ...outer, ...inner.reverse()];
}

// Rocha facetada: esfera deformada por ruído (determinístico pela semente), achatada na base e sem índice (faces planas).
export function rockGeo(THREE, seed = 1, w = 10, h = 8) {
  const g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position;
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.3) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, z) => { // ruído de valor suave
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    const sm = t => t * t * (3 - 2 * t), u = sm(fx), v = sm(fy), w2 = sm(fz), L = (a, b, t) => a + (b - a) * t;
    const H = (a, b, c) => hash(ix + a, iy + b, iz + c);
    return L(L(L(H(0, 0, 0), H(1, 0, 0), u), L(H(0, 1, 0), H(1, 1, 0), u), v), L(L(H(0, 0, 1), H(1, 0, 1), u), L(H(0, 1, 1), H(1, 1, 1), u), v), w2);
  };
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = .72 + .38 * vn(x * 1.6 + 3, y * 1.6, z * 1.6) + .16 * vn(x * 4, y * 4 + 7, z * 4);
    x *= d; y *= d * .82; z *= d;
    if (y < -.25) y = -.25 - (y + .25) * .15; // base assentada no leito
    // planos de clivagem: achata faces de cima para leitura de pedra quebrada
    if (y > .55) y = .55 + (y - .55) * .35;
    p.setXYZ(i, x, y, z);
  }
  const f = g.toNonIndexed(); g.dispose(); f.computeVertexNormals(); return f;
}

// Chama pintada: dois planos cruzados com shader de gota (núcleo claro, borda teal, tremor por ruído). Base em y = 0, altura 1.
export function flameGeo(THREE) {
  const q = [[-.5, 0, 0], [.5, 0, 0], [.5, 1, 0], [-.5, 1, 0], [0, 0, -.5], [0, 0, .5], [0, 1, .5], [0, 1, -.5]];
  const uv = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(q.flat()), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]); return g;
}
export const FLAME_FRAG = `uniform float uTime; varying vec2 vUv;
  void main(){
    float y = vUv.y, sway = sin(y * 5. + uTime * 3.1) * .06 * y + sin(y * 11. - uTime * 5.3) * .025 * y;
    float x = (vUv.x - .5 - sway) * 2.;
    float w = .78 * pow(1. - y, .55) * smoothstep(0., .14, y);   // gota: larga embaixo, ponta fina
    float a = smoothstep(w, w * .35, abs(x));
    float core = smoothstep(w * .55, 0., abs(x)) * (1. - smoothstep(.2, .75, y));
    vec3 col = mix(vec3(.08, .55, .7), vec3(.55, .95, 1.), a) + vec3(.9, 1., 1.) * core * .7;
    a *= .8 * (1. - smoothstep(.55, 1., y) * .6);
    gl_FragColor = vec4(col * a, a);
  }`;
