// PAINTERLY ARENA SYSTEM V1 (autor, 07/11/2026): tratamento pictórico 3D reutilizável no Arena Forge.
// Identidade própria do Saint Seiya TCG (nenhum asset de terceiros): pinceladas pintadas num canvas (mapa de pintura),
// projeção triplanar em espaço de mundo, variação de pigmento, sombra estilizada em faixas suaves, acento de borda,
// grading por facção e realce suave. Funciona com o Three.js enxuto da partida (CanvasTexture + onBeforeCompile).

// Presets por facção. Só Poseidon está aplicado a uma arena nesta etapa; os outros ficam prontos no Material Studio.
export const PAINTERLY_PRESETS = {
  athena: {nome: 'PAINTERLY ATHENA', brushStrength: .32, brushScale: .55, brushDirection: 20, pigment: .35, shadowStyle: .55, edge: .35, detail: .7, grade: .6, highlightSoft: .55,
    shadow: '#5a4a7a', high: '#fff4dc', rim: '#ffd98a', sky: ['#2a2350', '#d9b46a']},
  poseidon: {nome: 'PAINTERLY POSEIDON', brushStrength: .38, brushScale: .5, brushDirection: -25, pigment: .45, shadowStyle: .6, edge: .45, detail: .65, grade: .7, highlightSoft: .6,
    shadow: '#33306e', high: '#fff6e4', rim: '#7fe9ff', sky: ['#021226', '#0f6f8f']},
  hades: {nome: 'PAINTERLY HADES', brushStrength: .42, brushScale: .45, brushDirection: 55, pigment: .5, shadowStyle: .7, edge: .4, detail: .6, grade: .75, highlightSoft: .5,
    shadow: '#2a0f3a', high: '#ffd2b0', rim: '#ff6a3a', sky: ['#07020c', '#3a0d2a']},
  ares: {nome: 'PAINTERLY ARES', brushStrength: .45, brushScale: .6, brushDirection: 10, pigment: .5, shadowStyle: .65, edge: .45, detail: .7, grade: .7, highlightSoft: .45,
    shadow: '#3a1418', high: '#ffd9a8', rim: '#ff8a3a', sky: ['#12040a', '#a8341c']},
  artemis: {nome: 'PAINTERLY ARTEMIS', brushStrength: .35, brushScale: .5, brushDirection: -40, pigment: .4, shadowStyle: .55, edge: .5, detail: .6, grade: .65, highlightSoft: .65,
    shadow: '#14264a', high: '#eef4ff', rim: '#bcd8ff', sky: ['#01040c', '#1c3550']},
};
export const PAINTERLY_PARAMS = [
  ['brushStrength', 'Brush Strength', 0, 1, .01], ['brushScale', 'Brush Scale', .1, 2, .01], ['brushDirection', 'Brush Direction (°)', -90, 90, 1],
  ['pigment', 'Pigment Variation', 0, 1, .01], ['shadowStyle', 'Shadow Stylization', 0, 1, .01], ['edge', 'Edge Accents', 0, 1, .01],
  ['detail', 'Texture Detail', 0, 1, .01], ['grade', 'Color Grading', 0, 1, .01], ['highlightSoft', 'Highlight Softness', 0, 1, .01],
];

// Mapa de pintura: pinceladas direcionais desenhadas uma vez num canvas que repete sem emenda (cada traço perto da borda é
// desenhado também do outro lado). R = pinceladas largas, G = traços finos de detalhe, B = manchas de pigmento.
export function brushCanvas(size = 512, seed = 7) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, size, size);
  const wrap = draw => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.save(); g.translate(dx, dy); draw(); g.restore(); } };
  g.lineCap = 'round';
  const layer = (channel, count, len, width, alpha, spread) => {
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < count; i++) {
      const x = rnd() * size, y = rnd() * size, a = (rnd() - .5) * spread, l = len[0] + rnd() * (len[1] - len[0]), w = width[0] + rnd() * (width[1] - width[0]);
      const v = Math.round(70 + rnd() * 116), col = channel === 0 ? `rgba(${v},128,128,${alpha})` : channel === 1 ? `rgba(128,${v},128,${alpha})` : `rgba(128,128,${v},${alpha})`;
      const bx = (rnd() - .5) * w * 3, by = (rnd() - .5) * w * 3; // curva do traço (a mesma nas cópias da emenda)
      wrap(() => {
        g.strokeStyle = col; g.lineWidth = w;
        g.beginPath(); g.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2);
        g.quadraticCurveTo(x + bx, y + by, x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); g.stroke();
      });
    }
  };
  // Cada canal num canvas próprio para não misturar (o canvas 2D não escreve só um canal).
  const chans = [0, 1, 2].map(ch => {
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, size, size);
    if (ch === 0) layer(0, 700, [size * .06, size * .16], [size * .012, size * .03], .35, .5);
    if (ch === 1) layer(1, 1800, [size * .02, size * .06], [size * .003, size * .008], .45, .7);
    if (ch === 2) { for (let i = 0; i < 160; i++) { const x = rnd() * size, y = rnd() * size, r = size * (.03 + rnd() * .09), v = Math.round(90 + rnd() * 76);
      wrap(() => { const grd = g.createRadialGradient(x, y, 0, x, y, r); grd.addColorStop(0, `rgba(128,128,${v},.55)`); grd.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2); }); } }
    return g.getImageData(0, 0, size, size).data.slice();
  });
  const out = g.createImageData(size, size);
  for (let i = 0; i < out.data.length; i += 4) { out.data[i] = chans[0][i]; out.data[i + 1] = chans[1][i + 1]; out.data[i + 2] = chans[2][i + 2]; out.data[i + 3] = 255; }
  g.putImageData(out, 0, 0);
  return c;
}

const cache = new WeakMap();
// Uniformes compartilhados de um conjunto de materiais pintados (a arena inteira usa um só: o inspetor mexe em todos de uma vez).
export function painterlyUniforms(THREE, preset = 'poseidon') {
  let tex = cache.get(THREE);
  if (!tex) {
    tex = new THREE.CanvasTexture(brushCanvas());
    tex.wrapS = tex.wrapT = 1000; // RepeatWrapping (o build enxuto não exporta a constante)
    cache.set(THREE, tex);
  }
  const u = {uBrush: {value: tex}, uPaintOn: {value: 1}};
  for (const [k] of PAINTERLY_PARAMS) u[`uP_${k}`] = {value: 0};
  for (const k of ['shadow', 'high', 'rim']) u[`uP_${k}`] = {value: new THREE.Color()};
  applyPainterly(u, PAINTERLY_PRESETS[preset] || PAINTERLY_PRESETS.poseidon);
  return u;
}
export function applyPainterly(u, p) {
  for (const [k] of PAINTERLY_PARAMS) if (p[k] !== undefined) u[`uP_${k}`].value = k === 'brushDirection' ? p[k] * Math.PI / 180 : p[k];
  for (const k of ['shadow', 'high', 'rim']) if (p[k]) u[`uP_${k}`].value.set(p[k]);
}
export function readPainterly(u) {
  const p = {};
  for (const [k] of PAINTERLY_PARAMS) p[k] = k === 'brushDirection' ? Math.round(u[`uP_${k}`].value * 180 / Math.PI) : +u[`uP_${k}`].value.toFixed(3);
  for (const k of ['shadow', 'high', 'rim']) p[k] = `#${u[`uP_${k}`].value.getHexString()}`;
  return p;
}

// Trechos GLSL para onBeforeCompile de MeshStandardMaterial. Precisa de vWP (posição no mundo) e vWN (normal no mundo).
export const PAINT_UNIFORMS_GLSL = `uniform sampler2D uBrush; uniform float uPaintOn, uP_brushStrength, uP_brushScale, uP_brushDirection, uP_pigment,
  uP_shadowStyle, uP_edge, uP_detail, uP_grade, uP_highlightSoft; uniform vec3 uP_shadow, uP_high, uP_rim;
  vec3 paintSample(vec3 wp, vec3 wn){
    vec3 bw = pow(abs(wn), vec3(4.)); bw /= bw.x + bw.y + bw.z;
    float c = cos(uP_brushDirection), s = sin(uP_brushDirection); mat2 R = mat2(c, -s, s, c);
    float k = uP_brushScale * .18;
    return texture2D(uBrush, R * wp.zy * k).rgb * bw.x + texture2D(uBrush, R * wp.xz * k).rgb * bw.y + texture2D(uBrush, R * wp.xy * k).rgb * bw.z;
  }`;
// Cor-base: pinceladas largas, traços finos (detalhe) e manchas de pigmento (frio/quente) sobre a cor do material.
export const PAINT_COLOR_GLSL = `if (uPaintOn > .5) {
    vec3 ps = paintSample(vWP, vWN) - .5;
    diffuseColor.rgb *= 1. + ps.r * uP_brushStrength * 2.6 + ps.g * uP_detail * 1.1;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * mix(vec3(.9, .95, 1.1), vec3(1.08, 1.0, .9), step(0., ps.b)), clamp(abs(ps.b) * 4.5 * uP_pigment, 0., 1.));
  }`;
// Saída: sombra em faixas suaves, grading (sombras violeta-azuladas, altas em marfim), acento de borda e realce suave.
export const PAINT_OUTPUT_GLSL = `if (uPaintOn > .5) {
    float lum = dot(outgoingLight, vec3(.299, .587, .114));
    float bands = floor(lum * 4. + .5) / 4.;
    float soft = mix(lum, bands, .75);
    float ls = mix(lum, soft, uP_shadowStyle);
    outgoingLight *= ls / max(lum, 1e-3);
    float sh = 1. - smoothstep(.0, .42, ls);
    outgoingLight = mix(outgoingLight, outgoingLight * .45 + uP_shadow * (ls + .04) * 1.4, sh * uP_grade);
    outgoingLight = mix(outgoingLight, uP_high * ls, smoothstep(.62, 1.15, ls) * uP_grade * .45);
    float fr = pow(1. - abs(dot(normalize(vViewPosition), normal)), 3.);
    outgoingLight += uP_rim * fr * uP_edge * .9;
    outgoingLight = mix(outgoingLight, outgoingLight / (1. + max(outgoingLight - .75, 0.)), uP_highlightSoft);
  }`;
