// Divine Arena · camada WebGL (Three.js). Só apresentação: arena, luz, partículas e VFX.
// Duas cenas no mesmo renderer: a arena em perspectiva (fundo) e os VFX em espaço de tela (pixels do DOM),
// para que golpes saiam exatamente das cartas HTML. createScene() devolve null sem WebGL ou sem a CDN.
// Three.js r160 enxuto, só as classes usadas aqui (auditoria de performance, fase 1). Classe nova: ver tools/three-slim.entry.js.
import {themesFromManifest} from '../../shared/arena-model.js?v=20261107-af5';
const THREE_URL = new URL('./vendor/three-0.160.0-slim.js?v=2', import.meta.url).href;

// Perfis de qualidade (PERFORMANCE_BUDGET.md). Partículas = poeira de Cosmo ambiente; vfx = teto do pool de VFX.
export const QUALITY = {
  phone: {pixelRatio: globalThis.innerWidth >= 500 ? 1 : 1.25, ambient: 0, vfx: 400, columns: 8, antialias: false, rays: false, calm: true},
  low: {pixelRatio: 1, ambient: 0, vfx: 600, columns: 8, antialias: false, rays: false, calm: true},
  medium: {pixelRatio: 1.25, ambient: 500, vfx: 1500, columns: 12, antialias: true, rays: true},
  high: {pixelRatio: 1.75, ambient: 1400, vfx: 3000, columns: 16, antialias: true, rays: true},
  ultra: {pixelRatio: 2, ambient: 2800, vfx: 5000, columns: 20, antialias: true, rays: true},
};

// Temas por alinhamento: cores do céu, chão, colunas, luz e poeira. Só Athena e Poseidon têm cena nesta fatia.
export const THEMES = {
  // Olympus Arena V1 (referência aprovada em docs/olympus-arena/): noite cósmica azul/violeta, piso zodiacal dourado.
  olympus: {label: 'Cosmo Arena', skyTop: '#02040f', skyBottom: '#1b2563', floorA: '#22306b', floorB: '#070b24', line: '#c9a45c',
    column: '#8d96bd', light: '#a9c0ff', dust: '#8fc4ff', fog: '#04071a', caustics: 0, zodiac: 1},
  athena: {label: "Athena's Sanctuary", skyTop: '#0b1030', skyBottom: '#d9a54a', floorA: '#f3ede1', floorB: '#b9ab92', line: '#e8c46a',
    column: '#efe6d4', light: '#ffdca0', dust: '#ffd77a', fog: '#1a1530', caustics: 0},
  poseidon: {label: "Poseidon's Undersea Temple", skyTop: '#02101f', skyBottom: '#0c5a7a', floorA: '#3d8fa6', floorB: '#0d3346', line: '#7fe3f0',
    column: '#9fd6d8', light: '#8be8ff', dust: '#bff6ff', fog: '#032033', caustics: 1},
  // Arenas novas (autor, 07/11/2026). Mesma cena, mesmos draw calls: só cor, desenho assado no chão (mask), forma das colunas,
  // direção da poeira e um astro no fundo. mask: 1 fendas, 2 flores, 3 placas, 4 manchas de luar. Brilho da mask = glow.
  hades: {label: "Hades' Underworld", skyTop: '#050106', skyBottom: '#3a0710', floorA: '#2a2226', floorB: '#060405', line: '#c2401c',
    column: '#3b3236', cap: '#6d1b1b', light: '#ff7a4a', dust: '#ff8a3a', fog: '#120205', mask: 1, glow: '#ff4a12', pulse: .9, broken: 1},
  elysion: {label: 'Elysion', skyTop: '#2a2350', skyBottom: '#f0d6ff', floorA: '#fbf7ff', floorB: '#cfc3dc', line: '#f3d98c',
    column: '#fbf8f2', light: '#fff1d6', dust: '#ffd6ec', fog: '#4a3d6e', mask: 2, glow: '#ff9fd0', pulse: .4, fall: 1, dustSize: 1.8,
    orb: {color: '#fff4d8', size: 9, x: 16}},
  ares: {label: "Ares' War Temple", skyTop: '#12040a', skyBottom: '#a8341c', floorA: '#8a5a2e', floorB: '#2c1a10', line: '#d08a3a',
    column: '#4a4648', cap: '#b8742e', metal: .7, light: '#ffb070', dust: '#ffc060', fog: '#2a0a08', mask: 3, glow: '#e05a14', pulse: 1.6,
    orb: {color: '#ff5a2a', size: 12, x: -14}},
  artemis: {label: "Artemis' Moonlit Grove", skyTop: '#01040c', skyBottom: '#1c3550', floorA: '#3d5a4a', floorB: '#0c1a16', line: '#cfe4ff',
    column: '#3a2a20', cap: '#163a2a', light: '#c8dcff', dust: '#d8ff9a', fog: '#030a12', mask: 4, glow: '#7a9cc8', pulse: .3, trees: 1, blink: 1,
    orb: {color: '#eef4ff', size: 10, x: 15}},
};

// ARENA FORGE 5.0: arenas publicadas (data/arenas-published.json, fonte única) entram como temas "id" e "id~variante".
// DEFAULT_THEMES guarda os temas do código: base das arenas e fallback visual quando o manifesto falha ou pede recurso que a cena não tem.
export const DEFAULT_THEMES = structuredClone(THEMES);
const MANIFEST_URL = new URL('../../data/arenas-published.json', import.meta.url).href;
let manifest;
export function applyManifest(m) { Object.assign(THEMES, themesFromManifest(m, DEFAULT_THEMES)); return m; }
export const loadArenas = () => manifest ||= fetch(MANIFEST_URL, {cache: 'no-cache'}).then(r => (r.ok ? r.json() : null)).then(applyManifest).catch(() => null);
// Área do campo na tela (0..1, y para baixo): nada da arena pode brilhar ou ficar por cima aqui (gate do Arena Forge).
export const FIELD_ZONE = {x0: .14, x1: .86, y0: .22, y1: .82};

const VERT_PASS = `varying vec2 vUv; varying vec3 vPos; void main(){ vUv = uv; vPos = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

// Chão: mármore procedural (fbm) assado uma vez numa textura por tema (eram 15 oitavas de ruído por pixel, a cada quadro, para um desenho que não muda).
const MARBLE_FRAG = `
uniform vec3 uA; uniform vec3 uB; uniform float uMask; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.03; a *= .5; } return v; }
void main(){
  vec2 p = (vUv - .5) * 2.;
  float vein = smoothstep(.45, .5, abs(fbm(p*3.5 + fbm(p*6.)) - .5));
  float m = 0.;
  if (uMask > .5 && uMask < 1.5) m = smoothstep(.014, .0, abs(fbm(p*3. + fbm(p*5.)*.6) - .5)) * (.4 + .6*fbm(p*9.));  // fendas de lava
  else if (uMask < 2.5 && uMask > 1.5) { vec2 g = floor(p*26.), f = fract(p*26.) - .5 - (vec2(h(g), h(g+7.)) - .5)*.4;  // flores
    m = step(h(g+3.), .3) * smoothstep(.2, .08, length(f)); }
  else if (uMask < 3.5 && uMask > 2.5) { vec2 g = abs(fract(p*4.5) - .5); m = smoothstep(.485, .5, max(g.x, g.y)) * .7; }  // placas de bronze
  else if (uMask > 3.5) m = smoothstep(.52, .72, fbm(p*4. + 3.));  // luar entre as folhas
  gl_FragColor = vec4(mix(uB, uA, .55 + .45*fbm(p*2.)) * (.82 + .18*vein) * (1. - m*.35*step(.5, uMask)*step(uMask, 1.5)), m);
}`;

// Anéis e linhas de constelação dourados sobre o mármore; cáusticas animadas no tema Poseidon.
const FLOOR_FRAG = `
uniform float uTime; uniform sampler2D uMarble; uniform vec3 uLine; uniform float uCaustics; uniform vec3 uGlow; uniform float uPulse; varying vec2 vUv;
uniform float uEdgeFade; uniform sampler2D uBrush; uniform float uPaint;
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p);
  vec4 mb = texture2D(uMarble, vUv); vec3 col = mb.rgb;
  col += uGlow * mb.a * (.45 + .3*sin(uTime*uPulse - r*5. + mb.a*2.));
  float ring = smoothstep(.012, .0, abs(r - .58)) + smoothstep(.008, .0, abs(r - .62)) + smoothstep(.01, .0, abs(r - .93));
  float spokes = smoothstep(.006, .0, abs(sin(atan(p.y, p.x) * 6.))) * step(.62, r) * step(r, .93);
  float pulse = .65 + .35*sin(uTime*.8 - r*6.);
  col += uLine * (ring + spokes*.6) * pulse * .9;
  if (uCaustics > .5) {
    vec2 q = p*7. + vec2(uTime*.15, uTime*.11);
    float c = pow(abs(sin(q.x + sin(q.y + uTime*.6)) * sin(q.y*1.3 + sin(q.x*.8 - uTime*.5))), 6.);
    col += vec3(.5,.9,1.) * c * .35;
  }
  col += uLine * .25 * smoothstep(.35, .0, r);
  col *= smoothstep(1.05, .55, r);
  if (uPaint > .5) { vec3 b = texture2D(uBrush, vUv * 7.).rgb - .5; col *= 1. + b.r * .3 + b.g * .12; } // solo pintado (prévia de arena)
  gl_FragColor = vec4(col, mix(1., smoothstep(1., .93, r), uEdgeFade)); // abre logo depois do anel de r=.62: as cartas ficam dentro // com cenário de fundo, a borda do piso se abre para ele
}`;

const SKY_FRAG = `uniform vec3 uTop; uniform vec3 uBottom; uniform float uTime; varying vec2 vUv; varying vec3 vPos;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){ vec3 d = normalize(vPos); float t = clamp(d.y*1.6 + .15, 0., 1.);
  vec3 col = mix(uBottom, uTop, t);
  vec2 g = floor(vUv * vec2(900., 450.)); float s = step(.9975, h(g)) * t * (.6 + .4*sin(uTime*2. + h(g)*40.));
  gl_FragColor = vec4(col + s, 1.); }`;

// Raio de luz volumétrico falso: cone aditivo que some no topo e na borda.
const RAY_FRAG = `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
void main(){ float a = (1. - vUv.y) * smoothstep(0., .5, vUv.y) * (.5 + .5*sin(vUv.x*40. + uTime*.7)) * .22; gl_FragColor = vec4(uColor, a); }`;

// uFall: 0 sobe (Cosmo, brasas), 1 cai (pétalas). uBlink: vaga-lumes que acendem e apagam e vagam mais.
const DUST_VERT = `attribute float aSeed; uniform float uTime; uniform float uPixel; uniform float uFall; uniform float uBlink; varying float vA;
void main(){ vec3 p = position; float t = mod(uTime*.25*(.4 + aSeed)*(1. - uBlink*.7) + aSeed*10., 1.);
  p.y += mix(t, 1. - t, uFall) * 7. * (1. - uBlink*.75); p.x += sin(uTime*.6 + aSeed*30.) * (.4 + uFall + uBlink*1.2); p.z += cos(uTime*.5 + aSeed*20.) * uBlink;
  vA = sin(t*3.14159) * mix(1., smoothstep(.2, 1., sin(uTime*2.5 + aSeed*60.)), uBlink);
  vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPixel * (1. + aSeed*2.) / -mv.z; }`;
const DUST_FRAG = `uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(uColor, smoothstep(.5, .0, d) * vA * .55); }`;

// VFX: pontos em pixels de tela, cor e tamanho por partícula, aditivos.
const FX_VERT = `attribute vec4 aColor; attribute float aSize; varying vec4 vColor;
void main(){ vColor = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_PointSize = aSize; }`;
const FX_FRAG = `varying vec4 vColor; void main(){ float d = length(gl_PointCoord - .5); float core = smoothstep(.5, .0, d); gl_FragColor = vec4(vColor.rgb * (1. + core), vColor.a * core); }`;

// Mostrador zodiacal do piso, em linhas douradas finas sobre transparente.
function zodiacCanvas() {
  const S = 1024, c = document.createElement('canvas'), g = c.getContext('2d'), m = S / 2;
  c.width = c.height = S;
  g.translate(m, m); g.strokeStyle = 'rgba(214,176,98,.85)'; g.fillStyle = 'rgba(224,188,112,.9)';
  const ring = (r, w = 2) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  [500, 486, 392, 300, 214, 120].forEach((r, i) => ring(r, i < 2 ? 3 : 2));
  for (let i = 0; i < 12; i++) { // divisões das 12 casas
    const a = i / 12 * Math.PI * 2; g.lineWidth = 2;
    g.beginPath(); g.moveTo(Math.cos(a) * 300, Math.sin(a) * 300); g.lineTo(Math.cos(a) * 486, Math.sin(a) * 486); g.stroke();
  }
  const signs = '♈♉♊♋♌♍♎♏♐♑♒♓';
  g.font = '70px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...signs].forEach((ch, i) => { const a = (i + .5) / 12 * Math.PI * 2; g.save(); g.translate(Math.cos(a) * 440, Math.sin(a) * 440); g.rotate(a + Math.PI / 2); g.fillText(ch + '\uFE0E', 0, 0); g.restore(); });
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, r1 = i % 6 ? 380 : 360; g.lineWidth = 1.5; g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * 392, Math.sin(a) * 392); g.stroke(); }
  // Estrela de 16 pontas no centro.
  g.beginPath();
  for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI * 2, r = i % 2 ? 40 : (i % 4 ? 150 : 210); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.lineWidth = 2; g.stroke(); g.globalAlpha = .18; g.fill(); g.globalAlpha = 1;
  return c;
}

export async function createScene(host, {quality = 'high', theme = 'athena', reduceFlashes = false, reduceMotion = false, environmentPreview = null} = {}) {
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return null;
  let THREE;
  try { [THREE] = await Promise.all([import(THREE_URL), loadArenas()]); } catch { return null; }

  let q = QUALITY[quality] || QUALITY.high;
  // Tela densa dispensa MSAA: ele suavizava só a borda das colunas, e a 1,75x o serrilhado já não aparece.
  const renderer = new THREE.WebGLRenderer({antialias: q.antialias && (window.devicePixelRatio || 1) < 1.5, alpha: false, powerPreference: q === QUALITY.phone ? 'default' : 'high-performance'});
  renderer.autoClear = false;
  let shaderErrors = 0;
  renderer.debug.onShaderError = () => { shaderErrors++; };
  renderer.setPixelRatio(Math.min(q.pixelRatio, window.devicePixelRatio || 1));
  renderer.domElement.className = 'arena-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  // Golpes por cima das cartas (autor, 28/10/2026): os efeitos vão num segundo canvas transparente acima do DOM.
  const fxRenderer = new THREE.WebGLRenderer({antialias: false, alpha: true, premultipliedAlpha: true}); // pontos e anéis suaves no shader: sem MSAA
  fxRenderer.setClearColor(0x000000, 0);
  fxRenderer.setPixelRatio(renderer.getPixelRatio());
  fxRenderer.domElement.className = 'fx-canvas';
  fxRenderer.domElement.style.visibility = 'hidden';
  fxRenderer.domElement.setAttribute('aria-hidden', 'true');
  // irmão do tabuleiro (não filho do #arena, que fica atrás do DOM); z-index em olympus.css
  host.parentElement.insertBefore(fxRenderer.domElement, host.parentElement.querySelector('#overlay-root'));

  // ---------- Arena em perspectiva ----------
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 200);
  const camHome = new THREE.Vector3(0, 13.5, 13), look = new THREE.Vector3(0, 0, -.6);
  camera.position.copy(camHome); camera.lookAt(look);
  const uniforms = {uTime: {value: 0}};
  const col = c => new THREE.Color(c);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, vertexShader: VERT_PASS, fragmentShader: SKY_FRAG,
    uniforms: {uTop: {value: col('#000')}, uBottom: {value: col('#000')}, uTime: uniforms.uTime}}));
  world.add(sky);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 96), new THREE.ShaderMaterial({
    vertexShader: VERT_PASS, fragmentShader: FLOOR_FRAG,
    uniforms: {uTime: uniforms.uTime, uMarble: {value: null}, uLine: {value: col('#fc0')}, uCaustics: {value: 0}, uGlow: {value: col('#000')}, uPulse: {value: 1}, uEdgeFade: {value: 0}, uBrush: {value: null}, uPaint: {value: 0}}}));
  floor.rotation.x = -Math.PI / 2;
  world.add(floor);
  // Environment-only development preview; never loaded for the published arena.
  // IMMERSIVE WORLD V1 (autor, 07/11/2026): o ambiente entra no MESMO mundo da partida, nas mesmas coordenadas.
  // Duas câmeras na mesma cena: a competitiva (camera, intocada) e a cinematográfica (cineCam), que só existe na abertura.
  let devEnvironment = null, cineCam = null, cine = null, cineKeys = null, cineLast = null;
  if (environmentPreview === 'poseidon-palace') {
    try {
      const mod = await import('../../arena-forge/poseidon-palace.js');
      devEnvironment = mod.createPoseidonPalace(THREE, {quality: Object.keys(QUALITY).find(k => QUALITY[k] === q), reduceMotion});
      world.add(devEnvironment.group);
      cineLast = mod.COMPETITIVE_KEY;
      cineKeys = await fetch(new URL('../../arena-forge/cinematics/poseidon.json', import.meta.url), {cache: 'no-cache'})
        .then(r => r.ok ? r.json() : null).then(j => Array.isArray(j?.keys) ? j.keys : null).catch(() => null) || mod.CINEMATIC_POSEIDON;
      cineCam = new THREE.PerspectiveCamera(42, 1, .1, 1200);
      // Céu oceânico: domo de verdade em volta do mundo (a cinemática olha para cima; a câmera competitiva nunca vê o céu).
      const dome = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.ShaderMaterial({fog: false, depthWrite: false, side: THREE.BackSide,
        uniforms: {uTime: uniforms.uTime, uBrush: devEnvironment.paint ? devEnvironment.paint.uBrush : {value: null}, uPaint: {value: devEnvironment.paint ? 1 : 0}},
        vertexShader: VERT_PASS,
        fragmentShader: `uniform float uTime; uniform sampler2D uBrush; uniform float uPaint; varying vec2 vUv;
          void main(){ float y = vUv.y; vec3 deep = vec3(.01,.05,.13), mid = vec3(.03,.24,.36), top = vec3(.1,.55,.66);
            vec3 c = mix(deep, mid, smoothstep(.45, .62, y)); c = mix(c, top, smoothstep(.62, .85, y));
            float rays = pow(max(0., sin(vUv.x * 120. + sin(vUv.x * 21.) * 2.)), 6.) * smoothstep(.55, .9, y) * .18;
            if (uPaint > .5) { vec3 b = texture2D(uBrush, vUv * vec2(18., 4.) + vec2(uTime * .002, 0.)).rgb - .5; c *= 1. + b.r * .5 + b.b * .3; }
            gl_FragColor = vec4(c + vec3(.5,.85,.95) * rays, 1.); }`}));
      dome.position.set(0, 0, -30); dome.renderOrder = -1; dome.name = 'DistantEnvironment · Céu oceânico'; devEnvironment.groups.distant.add(dome);
      sky.visible = false;
      // O campo se funde no leito marinho só na borda externa: a área das cartas continua inteira.
      floor.material.transparent = true; floor.material.uniforms.uEdgeFade.value = 1;
      if (devEnvironment.paint) { floor.material.uniforms.uBrush.value = devEnvironment.paint.uBrush.value; floor.material.uniforms.uPaint.value = 1; }
    } catch (err) {
      console.error('[Arena Forge] Could not load Poseidon Palace preview:', err);
      devEnvironment = cineCam = null;
    }
  }

  const marbleSize = q.calm ? 1024 : 2048;
  const marble = new THREE.WebGLRenderTarget(marbleSize, marbleSize, {depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter});
  marble.texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); // o chão é visto de lado
  floor.material.uniforms.uMarble.value = marble.texture;
  const marbleMat = new THREE.ShaderMaterial({vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`, fragmentShader: MARBLE_FRAG, depthTest: false, depthWrite: false,
    uniforms: {uA: {value: col('#fff')}, uB: {value: col('#888')}, uMask: {value: 0}}});
  const marbleQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), marbleMat), marbleScene = new THREE.Scene();
  marbleQuad.frustumCulled = false; marbleScene.add(marbleQuad);
  const bakeMarble = () => { renderer.setRenderTarget(marble); renderer.clear(); renderer.render(marbleScene, camera); renderer.setRenderTarget(null); };

  // Piso zodiacal (Olympus): textura desenhada uma vez em canvas — anéis, 12 casas, signos e rosa dos ventos.
  const zodiac = new THREE.Mesh(new THREE.CircleGeometry(11, 96), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(zodiacCanvas()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9}));
  zodiac.rotation.x = -Math.PI / 2; zodiac.position.y = .02;
  world.add(zodiac);

  const hemiTheme = new THREE.HemisphereLight('#ffffff', '#202030', .55);
  world.add(hemiTheme);
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(-6, 14, 6);
  world.add(sun);
  if (devEnvironment) hemiTheme.visible = sun.visible = false; // o ambiente traz o próprio LightingRig

  // Colunas instanciadas em anel: fuste, base e capitel numa só malha cada (3 draw calls).
  const colMat = new THREE.MeshStandardMaterial({color: '#eee', roughness: .55, metalness: .05});
  const goldMat = new THREE.MeshStandardMaterial({color: '#d9b25c', roughness: .3, metalness: .85});
  let columnMeshes = [], cur = THEMES.athena;
  // Hades: colunas quebradas em alturas diferentes. Artemis: troncos com copa em cone (pinheiros). Sempre 3 malhas instanciadas.
  function buildColumns(count) {
    for (const m of columnMeshes) { world.remove(m); m.geometry.dispose(); }
    const trees = !!cur.trees;
    const shaft = new THREE.InstancedMesh(trees ? new THREE.CylinderGeometry(.3, .45, 7, 8, 1, true) : new THREE.CylinderGeometry(.45, .52, 7, 20, 1, true), colMat, count);
    const base = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, .35, 1.3), colMat, count);
    const cap = new THREE.InstancedMesh(trees ? new THREE.ConeGeometry(2.1, 5.5, 7) : new THREE.BoxGeometry(1.35, .3, 1.35), goldMat, count);
    const m = new THREE.Matrix4(), rnd = i => { const v = Math.sin(i * 91.7) * 43758.5453; return v - Math.floor(v); };
    for (let i = 0; i < count; i++) {
      const a = Math.PI * (1.05 + i / (count - 1) * .9) , r = 15.5;  // arco atrás do campo
      const x = Math.cos(a) * r, z = Math.sin(a) * r * .75 - 2;
      const k = cur.broken ? .25 + rnd(i + 1) * .75 : trees ? .8 + rnd(i + 1) * .5 : 1, top = 7 * k;
      m.makeScale(1, k, 1).setPosition(x, top / 2, z); shaft.setMatrixAt(i, m);
      m.makeTranslation(x, .17, z); base.setMatrixAt(i, m);
      if (cur.broken && k < .7) m.makeScale(0, 0, 0); else m.makeTranslation(x, trees ? top + 1.6 : top + .1, z);
      cap.setMatrixAt(i, m);
    }
    columnMeshes = [shaft, base, cap];
    columnMeshes.forEach(x => { x.visible = !devEnvironment; world.add(x); }); // com ambiente, a moldura do campo é dele
  }

  const rays = [];
  const rayMat = new THREE.ShaderMaterial({vertexShader: VERT_PASS, fragmentShader: RAY_FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: {uColor: {value: col('#fff')}, uTime: uniforms.uTime}});
  for (const [x, z, tilt] of [[-7, -9, .25], [-1, -11, .05], [6, -9, -.22]]) {
    const ray = new THREE.Mesh(new THREE.ConeGeometry(3.2, 22, 24, 1, true), rayMat);
    ray.position.set(x, 9, z); ray.rotation.z = tilt; rays.push(ray); world.add(ray);
  }

  // Astro no fundo (lua de Artemis, sol de Ares e dos Elísios): um quadrado só, disco + halo no shader, sem textura.
  const orb = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({vertexShader: VERT_PASS, transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, uniforms: {uColor: {value: col('#fff')}},
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.;
      gl_FragColor = vec4(uColor, smoothstep(.36, .33, d) + .45 * pow(max(0., 1. - d), 2.5)); }`}));
  world.add(orb);

  let dust = null;
  const dustMat = new THREE.ShaderMaterial({vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, uniforms: {uTime: uniforms.uTime, uColor: {value: col('#fff')}, uPixel: {value: 1}, uFall: {value: 0}, uBlink: {value: 0}}});
  function buildDust(count) {
    if (dust) { world.remove(dust); dust.geometry.dispose(); dust = null; }
    if (!count) return;
    const g = new THREE.BufferGeometry(), pos = new Float32Array(count * 3), seed = new Float32Array(count);
    for (let i = 0; i < count; i++) { pos[i * 3] = (Math.random() - .5) * 30; pos[i * 3 + 1] = Math.random() * 2 - 1; pos[i * 3 + 2] = (Math.random() - .5) * 22; seed[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    dust = new THREE.Points(g, dustMat); world.add(dust);
  }

  function setTheme(name) {
    dirty = true; wake();
    const t = cur = THEMES[name] || THEMES.olympus;
    sky.material.uniforms.uTop.value.set(t.skyTop); sky.material.uniforms.uBottom.value.set(t.skyBottom);
    const f = floor.material.uniforms;
    marbleMat.uniforms.uA.value.set(t.floorA); marbleMat.uniforms.uB.value.set(t.floorB); marbleMat.uniforms.uMask.value = t.mask || 0; bakeMarble();
    f.uLine.value.set(devEnvironment ? '#d7ac63' : t.line); // mundo de Poseidon: anéis de ouro antigo (Bíblia Visual) f.uCaustics.value = t.caustics || 0; f.uGlow.value.set(t.mask ? t.glow : '#000'); f.uPulse.value = t.pulse || 1;
    colMat.color.set(t.column); colMat.metalness = t.metal || .05; goldMat.color.set(t.cap || '#d9b25c');
    sun.color.set(t.light); rayMat.uniforms.uColor.value.set(t.light); dustMat.uniforms.uColor.value.set(t.dust);
    dustMat.uniforms.uFall.value = t.fall || 0; dustMat.uniforms.uBlink.value = t.blink || 0; dustScale = t.dustSize || 1;
    world.fog = new THREE.Fog(t.fog, 26, devEnvironment ? 180 : 70);
    zodiac.visible = !!t.zodiac;
    orb.visible = !!t.orb && !devEnvironment;
    // no alto da tela, atrás do campo do oponente; virado para a câmera
    if (t.orb) { orb.material.uniforms.uColor.value.set(t.orb.color); orb.position.set(t.orb.x || 0, -14, -40); orb.scale.setScalar(t.orb.size * 2); orb.lookAt(camHome); }
    if (columnMeshes.length) buildColumns(q.columns);
    resize();
  }

  // ---------- VFX em espaço de tela ----------
  const fxScene = new THREE.Scene();
  const fxCam = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
  const CAP = 6000;
  const P = {pos: new Float32Array(CAP * 3), color: new Float32Array(CAP * 4), size: new Float32Array(CAP),
    vel: new Float32Array(CAP * 2), life: new Float32Array(CAP), max: new Float32Array(CAP), base: new Float32Array(CAP), drag: new Float32Array(CAP), grav: new Float32Array(CAP), n: 0};
  const fxGeo = new THREE.BufferGeometry();
  fxGeo.setAttribute('position', new THREE.BufferAttribute(P.pos, 3).setUsage(THREE.DynamicDrawUsage));
  fxGeo.setAttribute('aColor', new THREE.BufferAttribute(P.color, 4).setUsage(THREE.DynamicDrawUsage));
  fxGeo.setAttribute('aSize', new THREE.BufferAttribute(P.size, 1).setUsage(THREE.DynamicDrawUsage));
  const fxPoints = new THREE.Points(fxGeo, new THREE.ShaderMaterial({vertexShader: FX_VERT, fragmentShader: FX_FRAG, transparent: true,
    depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending}));
  fxPoints.frustumCulled = false;
  fxScene.add(fxPoints);

  // Spawn com pool fixo: sem alocação por frame; quando cheio, recicla a mais antiga (índice circular).
  let cursor = 0, alive = 0;
  const colors = new Map();
  // Orçamento global de efeitos: o pior caso não pode ser muito diferente do caso médio. Até metade do teto, densidade cheia;
  // de metade até o teto cai para 20%, e cai pela metade com o FPS abaixo da meta. Um golpe sozinho nunca chega a metade no High.
  const dense = n => Math.ceil(n * Math.max(.2, 1 - Math.max(0, alive / Math.min(CAP, q.vfx) - .5) * 1.6) * (rafRate < 45 ? .5 : 1));
  function spawn(x, y, vx, vy, {color = '#ffd77a', size = 10, life = .8, drag = 2, grav = 0, alpha = 1} = {}) {
    wake();
    const limit = Math.min(CAP, q.vfx), i = cursor % limit;
    cursor++; P.n = Math.max(P.n, i + 1);
    const c = colors.get(color) || colors.set(color, col(color)).get(color); // sem alocar nem interpretar a cor por partícula
    alive++;
    P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = 0;
    P.vel[i * 2] = vx; P.vel[i * 2 + 1] = vy;
    P.color[i * 4] = c.r; P.color[i * 4 + 1] = c.g; P.color[i * 4 + 2] = c.b; P.color[i * 4 + 3] = alpha;
    P.base[i] = size * renderer.getPixelRatio(); P.size[i] = P.base[i]; P.life[i] = life; P.max[i] = life; P.drag[i] = drag; P.grav[i] = grav;
  }
  function stepParticles(dt) {
    if (!P.n) return; // nada vivo: não reenvia os buffers à GPU a cada frame
    alive = 0;
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] <= 0) { P.size[i] = 0; continue; }
      alive++;
      P.life[i] -= dt;
      const k = Math.max(0, P.life[i] / P.max[i]), d = Math.exp(-P.drag[i] * dt);
      P.vel[i * 2] *= d; P.vel[i * 2 + 1] = P.vel[i * 2 + 1] * d + P.grav[i] * dt;
      P.pos[i * 3] += P.vel[i * 2] * dt; P.pos[i * 3 + 1] += P.vel[i * 2 + 1] * dt;
      P.size[i] = P.base[i] * (.35 + .65 * k);
      P.color[i * 4 + 3] = Math.min(1, k * 1.6);
    }
    // envia só o trecho em uso, não o pool inteiro (6000 partículas: 192 KB por quadro)
    for (const [name, size] of [['position', 3], ['aColor', 4], ['aSize', 1]]) { const a = fxGeo.attributes[name]; a.clearUpdateRanges(); a.addUpdateRange(0, P.n * size); a.needsUpdate = true; }
    fxGeo.setDrawRange(0, P.n);
    if (!alive) { P.n = 0; cursor = 0; }
  }

  // Formas efêmeras (anéis de choque, feixes, flash): malhas reaproveitadas por tipo.
  const live = [];
  const ringGeo = new THREE.RingGeometry(.82, 1, 64), quadGeo = new THREE.PlaneGeometry(1, 1);
  // Pool de malhas: descartar o último material liberava o shader e cada golpe recompilava (~150 ms de travada).
  const pool = [];
  const additive = color => new THREE.MeshBasicMaterial({color, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide}); // y para baixo inverte a face
  function shape(geo, color, update, duration) {
    if (live.length >= 32) return; // orçamento: formas a mais são tela cheia de brilho somado, ninguém distingue
    wake();
    const mesh = pool.pop() || new THREE.Mesh(geo, additive(color));
    mesh.geometry = geo; mesh.material.color.set(color); mesh.material.opacity = 1; mesh.rotation.set(0, 0, 0);
    fxScene.add(mesh);
    live.push({mesh, update, t: 0, duration});
  }
  { // aquece o shader na carga, para o primeiro golpe não travar
    const warm = new THREE.Mesh(quadGeo, additive('#fff')); warm.material.opacity = 0;
    fxScene.add(warm); fxRenderer.compile(fxScene, fxCam); fxScene.remove(warm); pool.push(warm);
  }
  function stepShapes(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const s = live[i]; s.t += dt;
      const k = Math.min(1, s.t / s.duration);
      s.update(s.mesh, k);
      if (k >= 1) { fxScene.remove(s.mesh); pool.push(s.mesh); live.splice(i, 1); }
    }
  }

  const fx = {
    // Explosão radial de partículas.
    burst(x, y, {color = '#ffd77a', count = 60, speed = 420, size = 12, life = .7, grav = 0} = {}) {
      count = dense(count);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (.3 + Math.random() * .7);
        spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, {color, size: size * (.5 + Math.random()), life: life * (.6 + Math.random() * .6), drag: 3, grav});
      }
    },
    // Concentração de Cosmo: partículas convergem para o ponto.
    charge(x, y, {color = '#ffd77a', count = 50, radius = 140, life = .45} = {}) {
      count = dense(count);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, r = radius * (.6 + Math.random() * .6);
        spawn(x + Math.cos(a) * r, y + Math.sin(a) * r, -Math.cos(a) * r / life, -Math.sin(a) * r / life, {color, size: 9, life, drag: 0});
      }
    },
    shockwave(x, y, {color = '#fff2c4', size = 220, duration = .45} = {}) {
      shape(ringGeo, color, (m, k) => { const s = 20 + size * k; m.position.set(x, y, 0); m.scale.set(s, s, 1); m.material.opacity = (1 - k) * .9; }, duration);
    },
    flash(intensity = .35) {
      if (reduceFlashes) intensity *= .25;
      shape(quadGeo, '#fff6d8', (m, k) => { m.position.set(fxCam.right / 2, fxCam.bottom / 2, 0); m.scale.set(fxCam.right, fxCam.bottom, 1); m.material.opacity = intensity * (1 - k); }, .22);
    },
    // Feixe reto entre dois pontos (golpe energético). Devolve uma Promise que resolve no impacto.
    beam(from, to, {color = '#9fdcff', width = 18, duration = .28} = {}) {
      const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      shape(quadGeo, color, (m, k) => {
        const grow = Math.min(1, k * 2.2), fade = k < .6 ? 1 : 1 - (k - .6) / .4;
        m.position.set(from.x + dx * grow / 2, from.y + dy * grow / 2, 0); m.rotation.z = ang;
        m.scale.set(len * grow, width * (1 - k * .5), 1); m.material.opacity = fade;
      }, duration);
      return wait(duration * 1000 * .45);
    },
    // Projétil com rastro de partículas (base dos golpes físicos e especiais).
    projectile(from, to, {color = '#ffd77a', duration = .3, size = 16, trail = 3, arc = 0} = {}) {
      // rAF para em aba oculta: o relógio de parede garante que a fila do orquestrador nunca trave.
      return Promise.race([wait(duration * 1000 + 150), new Promise(done => {
        const start = performance.now(), nx = -(to.y - from.y), ny = to.x - from.x, nl = Math.hypot(nx, ny) || 1;
        const tick = () => {
          const k = Math.min(1, (performance.now() - start) / (duration * 1000)), e = k * k * (3 - 2 * k), bend = Math.sin(k * Math.PI) * arc;
          const x = from.x + (to.x - from.x) * e + nx / nl * bend, y = from.y + (to.y - from.y) * e + ny / nl * bend;
          for (let i = dense(trail); i > 0; i--) spawn(x + (Math.random() - .5) * 6, y + (Math.random() - .5) * 6, (Math.random() - .5) * 40, (Math.random() - .5) * 40, {color, size: size * (.6 + Math.random() * .6), life: .35, drag: 4});
          if (k < 1) requestAnimationFrame(tick); else done();
        };
        tick();
      })]);
    },
  };

  // ---------- Câmera, tamanho, loop ----------
  let shakeAmp = 0, punch = 0;
  fx.shake = amp => { shakeAmp = Math.max(shakeAmp, amp); wake(); };
  fx.punch = amount => { punch = Math.max(punch, amount); wake(); }; // recuo curto da câmera no impacto

  function resize() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    renderer.setSize(w, h, false); fxRenderer.setSize(w, h, false);
    dirty = true; wake();
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (cineCam) { cineCam.aspect = w / h; cineCam.updateProjectionMatrix(); }
    fxCam.left = 0; fxCam.right = w; fxCam.top = 0; fxCam.bottom = h; fxCam.updateProjectionMatrix();
    dustMat.uniforms.uPixel.value = renderer.getPixelRatio() * h * .05 * dustScale;
  }
  const ro = new ResizeObserver(resize); ro.observe(host);

  // Teto de quadros (Mac superaquecendo, 31/10/2026): 60 fps com golpe na tela, 30 fps com a arena parada.
  // Telas de 120 Hz desenhavam os dois canvas no dobro, sem ganho visível no cenário lento.
  // CINEMATIC CAMERA (autor, 07/11/2026): keyframes com posição, ponto focal, FOV, roll, duração, easing, luz e eventos.
  // Caminho Catmull-Rom entre as chaves; a última é a câmera competitiva, então a troca para `camera` não dá salto.
  const EASE = {linear: k => k, easeIn: k => k * k * k, easeOut: k => 1 - Math.pow(1 - k, 3), easeInOut: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2};
  const v3 = a => new THREE.Vector3(...a), cr = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t;
    return .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
  const crv = (A, i, t) => { const g = j => A[Math.max(0, Math.min(A.length - 1, j))]; return new THREE.Vector3(...[0, 1, 2].map(k => cr(g(i - 2)[k], g(i - 1)[k], g(i)[k], g(i + 1)[k], t))); };
  // Chaves válidas: números finitos, FOV 10–100, duração ≥ 0; a última vira a competitiva exatamente.
  function cineNormalize(keys) {
    const num = (v, d) => Number.isFinite(+v) ? +v : d, vec = (v, d) => Array.isArray(v) && v.length === 3 ? v.map((x, i) => num(x, d[i])) : d;
    const K = (keys || []).filter(k => k && !k.locked).map(k => ({...k, pos: vec(k.pos, cineLast.pos), look: vec(k.look, cineLast.look),
      fov: Math.min(100, Math.max(10, num(k.fov, 42))), roll: num(k.roll, 0), dur: Math.max(0, num(k.dur, 1000)), light: Math.max(0, num(k.light, 1)), ease: EASE[k.ease] ? k.ease : 'easeInOut'}));
    const last = (keys || []).at(-1);
    K.push({...cineLast, dur: Math.max(0, num(last?.locked ? last.dur : cineLast.dur, cineLast.dur)), ease: last?.locked && EASE[last.ease] ? last.ease : cineLast.ease});
    return K;
  }
  function cinePose(k) {
    cineCam.position.set(...k.pos); cineCam.lookAt(...k.look); cineCam.rotateZ(k.roll * Math.PI / 180);
    if (cineCam.fov !== k.fov) { cineCam.fov = k.fov; cineCam.updateProjectionMatrix(); }
    devEnvironment?.setLight(k.light ?? 1);
  }
  function cineVfx(kind) {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    if (kind === 'shockwave') fx.shockwave(w / 2, h * .55, {color: '#9ff0ff', size: Math.min(w, h) * .6});
    if (kind === 'dust') fx.burst(w / 2, h * .6, {color: '#bff4ff', count: 70, speed: 260, size: 8, life: 1.1});
    if (kind === 'flash') fx.burst(w / 2, h * .45, {color: '#ffffff', count: 40, speed: 520, size: 16, life: .5});
  }
  function stepCine(now) {
    if (cine.static) return cinePose(cine.static);
    const K = cine.keys, T = []; K.reduce((acc, k, i) => (T[i] = acc + k.dur), 0);
    const t = now - cine.t0;
    K.forEach((k, i) => { if (t >= T[i] && !cine.fired.has(i)) { cine.fired.add(i); if (k.vfx) cineVfx(k.vfx); cine.onEvent?.(k, i); } });
    if (t >= T.at(-1)) { const done = cine.done; cine = null; devEnvironment?.setLight(1); done(true); return; }
    const i = Math.max(1, T.findIndex(x => x > t));
    if (t < T[0]) return cinePose(K[0]);
    const a = K[i - 1], b = K[i], u = EASE[b.ease]((t - T[i - 1]) / Math.max(1, b.dur));
    cinePose({pos: crv(K.map(k => k.pos), i, u).toArray(), look: crv(K.map(k => k.look), i, u).toArray(),
      fov: a.fov + (b.fov - a.fov) * u, roll: a.roll + (b.roll - a.roll) * u, light: a.light + (b.light - a.light) * u});
  }
  let still = reduceMotion, dustScale = 1, last = performance.now(), running = true, frames = 0, fpsClock = last, fps = 60, lost = false, fxDrawn = false, dirty = true, sleeping = false, slow = 0, worldDrawn = 0, rafCount = 0, rafClock = last, rafRate = 60;
  const wake = () => { if (sleeping) { sleeping = false; requestAnimationFrame(frame); } };
  // Uma cena só: durante a abertura desenha com a câmera cinematográfica; no jogo, com a competitiva.
  function drawWorld() {
    renderer.clear();
    renderer.render(world, cine ? cineCam : camera);
  }
  function frame(now) {
    if (!running) return;
    const moving = shakeAmp > .01 || punch > .01 || !!cine, busy = P.n || live.length || moving;
    // Celular e Low (autor, 01/11/2026, iPhone aquecendo): a arena é desenhada uma vez e fica parada. Sem efeito na tela o laço dorme; wake() o acorda.
    const calm = q.calm || still; // reduzir movimento: arena parada como no celular
    if (calm && !busy && !fxDrawn && !dirty) { sleeping = true; return; }
    requestAnimationFrame(frame);
    if (document.hidden || lost) { last = now; rafClock = now; rafCount = 0; return; }
    rafCount++;
    if (now - rafClock >= 1000) {
      rafRate = rafCount * 1000 / (now - rafClock); rafCount = 0; rafClock = now;
      // Máquina que não aguenta: 3 s seguidos abaixo de 40 fps tira um degrau nesta partida, sem mexer na opção salva. Mede o rAF, não o teto de 30 fps da arena parada.
      slow = rafRate < 40 && !q.calm ? slow + 1 : 0;
      if (slow >= 3) { slow = 0; shedLoad(); }
    }
    if (now - last < (busy && !calm ? 1000 / 62 : 1000 / 31)) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    uniforms.uTime.value += dt;
    frames++;
    if (now - fpsClock > 1000) {
      fps = frames * 1000 / (now - fpsClock); frames = 0; fpsClock = now;
    }
    shakeAmp *= Math.exp(-dt * 9); punch *= Math.exp(-dt * 7);
    // Sem balanço lateral: a linha central do chão (grade de Ares) fica no eixo exato dos dois deuses (autor, 07/11/2026).
    if (cine) { stepCine(now); dirty = true; }
    camera.position.set(camHome.x + (Math.random() - .5) * shakeAmp * .08, camHome.y - punch * .6 + (Math.random() - .5) * shakeAmp * .08, camHome.z - punch);
    camera.lookAt(look);
    stepParticles(dt); stepShapes(dt);
    if (devEnvironment && !still && !q.calm) devEnvironment.update(uniforms.uTime.value);
    // no celular a arena nem treme: o chão (5 oitavas de ruído por pixel) é o desenho mais caro da cena
    // No desktop a arena fica a 30 fps mesmo com golpe na tela: só os efeitos pedem 60. Tremor pede 60 porque move a câmera.
    if (dirty || (calm ? moving && q !== QUALITY.phone : moving || now - worldDrawn >= 1000 / 31)) { drawWorld(); dirty = false; worldDrawn = now; }
    // canvas de VFX vazio: desenha uma vez para limpar o último golpe e depois fica parado
    const fxLive = P.n || live.length;
    if (fxLive || fxDrawn) fxRenderer.render(fxScene, fxCam);
    // canvas vazio escondido: a tela inteira deixa de ser composta por cima das cartas
    if (fxDrawn !== !!fxLive) fxRenderer.domElement.style.visibility = fxLive ? 'visible' : 'hidden';
    fxDrawn = !!fxLive;
  }

  // Perda de contexto: para o desenho e avisa; a interface DOM continua jogável.
  const onLost = e => { e.preventDefault(); lost = true; host.classList.add('webgl-lost'); };
  const onRestored = () => { lost = false; host.classList.remove('webgl-lost'); bakeMarble(); dirty = true; wake(); };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);
  document.addEventListener('visibilitychange', () => { dirty = true; wake(); });

  // Degrau do ajuste automático: primeiro a resolução (até 1 pixel de CSS), depois o perfil de baixo.
  function shedLoad() {
    const ratio = Math.max(1, renderer.getPixelRatio() * .8);
    if (ratio < renderer.getPixelRatio()) { renderer.setPixelRatio(ratio); fxRenderer.setPixelRatio(ratio); return resize(); }
    setQuality({ultra: 'high', high: 'medium', medium: 'low'}[Object.keys(QUALITY).find(k => QUALITY[k] === q)] || 'low');
  }

  function setQuality(name) {
    q = QUALITY[name] || QUALITY.high;
    renderer.setPixelRatio(Math.min(q.pixelRatio, window.devicePixelRatio || 1)); fxRenderer.setPixelRatio(renderer.getPixelRatio());
    buildColumns(q.columns); buildDust(still ? 0 : q.ambient);
    rays.forEach(r => { r.visible = q.rays; });
    host.parentElement.classList.toggle('is-calm', !!q.calm); // Low e celular: as animações CSS das cartas também param (olympus.css)
    resize();
  }

  setTheme(theme); setQuality(quality);
  requestAnimationFrame(frame);

  return {
    fx, setTheme, setQuality, THREE,
    get fps() { return fps; },
    set reduceFlashes(v) { reduceFlashes = v; },
    set reduceMotion(v) { still = !!v; buildDust(still ? 0 : q.ambient); dirty = true; wake(); },
    // Gate do Arena Forge: o que fica por cima do campo (astro, topo das colunas) e brilho/variação do fundo sob as cartas.
    audit(zone = FIELD_ZONE) {
      drawWorld();
      const hits = [], inZone = p => { const v = p.clone().project(camera), x = (v.x + 1) / 2, y = (1 - v.y) / 2; return v.z < 1 && x > zone.x0 && x < zone.x1 && y > zone.y0 && y < zone.y1; };
      if (orb.visible && inZone(orb.position)) hits.push('astro');
      const m = new THREE.Matrix4(), p = new THREE.Vector3();
      for (let i = 0; i < columnMeshes[2]?.count; i++) { columnMeshes[2].getMatrixAt(i, m); p.setFromMatrixPosition(m); if (m.elements[0] && inZone(p)) { hits.push('colunas'); break; } }
      const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(4), L = [];
      for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) {
        const x = Math.round(W * (zone.x0 + (zone.x1 - zone.x0) * (i + .5) / 12)), y = Math.round(H * (1 - (zone.y0 + (zone.y1 - zone.y0) * (j + .5) / 8)));
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); L.push((.2126 * px[0] + .7152 * px[1] + .0722 * px[2]) / 255);
      }
      const mean = L.reduce((a, b) => a + b, 0) / L.length, sd = Math.sqrt(L.reduce((a, b) => a + (b - mean) ** 2, 0) / L.length);
      return {zoneHits: hits, luma: +mean.toFixed(3), busy: +sd.toFixed(3), shaderErrors};
    },
    frames: () => renderer.info.render.frame,
    // Miniatura da arena (Arena Forge): desenha e copia no mesmo quadro, antes do navegador limpar o buffer.
    snapshot(w = 320) {
      drawWorld();
      const src = renderer.domElement, c = Object.assign(document.createElement('canvas'), {width: w, height: Math.round(w * src.height / src.width)});
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/webp', .8);
    },
    // CINEMATIC CAMERA: toca as chaves (padrão: as da arena) e resolve quando chega na câmera competitiva.
    // Reduzir movimento: não roda (corte direto). skipCinematic() termina na hora, exatamente na posição competitiva.
    cinematic(keys = cineKeys, {onEvent} = {}) {
      if (!cineCam || still) return Promise.resolve(false);
      return new Promise(done => {
        cine?.done?.(false);
        cine = {keys: cineNormalize(keys), t0: performance.now(), fired: new Set(), onEvent, done};
        dirty = true; wake();
      });
    },
    skipCinematic() { if (cine && !cine.static) { cine.t0 = -1e9; dirty = true; wake(); } },
    // Editor: segura a câmera cinematográfica numa chave (null volta para a competitiva).
    poseCinematic(key) {
      if (!cineCam) return false;
      if (cine && !cine.static) cine.done(false);
      cine = key ? {static: cineNormalize([key, cineLast])[0]} : null;
      if (!key) devEnvironment?.setLight(1);
      dirty = true; wake(); return true;
    },
    get cinematicKeys() { return cineKeys && cineNormalize(cineKeys); },
    get cinematicPlaying() { return !!cine && !cine.static; },
    intro(opts) { return this.cinematic(undefined, opts); }, skipIntro() { this.skipCinematic(); }, get introPlaying() { return !!cine && !cine.static; },
    // Camera Composition Template: câmera competitiva (somente leitura) e o mundo carregado.
    composition() { return {camera: {fov: camera.fov, position: camHome.toArray(), lookAt: look.toArray(), aspect: +camera.aspect.toFixed(4)}, mundo: !!devEnvironment,
      grupos: devEnvironment ? Object.keys(devEnvironment.groups).length : 0}; },
    get environment() { return devEnvironment; },
    stats: () => ({fps: Math.round(fps), rafRate: Math.round(rafRate), pixelRatio: renderer.getPixelRatio(), level: Object.keys(QUALITY).find(k => QUALITY[k] === q), calls: renderer.info.render.calls, particles: P.n, alive, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures}),
    // QA: ms reais de GPU por quadro. readPixels espera a GPU terminar; o trace do navegador não enxerga isso com Metal.
    bench(n = 20) {
      const time = (r, draw) => { const gl = r.getContext(), px = new Uint8Array(4), t = performance.now(); for (let i = 0; i < n; i++) { draw(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return +((performance.now() - t) / n).toFixed(2); };
      return {world: time(renderer, () => { drawWorld(); }), fx: time(fxRenderer, () => fxRenderer.render(fxScene, fxCam)), px: [renderer.domElement.width, renderer.domElement.height]};
    },
    dispose() { running = false; ro.disconnect(); if (devEnvironment) { world.remove(devEnvironment.group); devEnvironment.dispose(); } renderer.dispose(); renderer.domElement.remove(); fxRenderer.dispose(); fxRenderer.domElement.remove(); },
  };
}

export const wait = ms => new Promise(r => setTimeout(r, ms));
