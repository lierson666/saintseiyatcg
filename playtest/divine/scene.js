// Divine Arena · camada WebGL (Three.js). Só apresentação: arena, luz, partículas e VFX.
// Duas cenas no mesmo renderer: a arena em perspectiva (fundo) e os VFX em espaço de tela (pixels do DOM),
// para que golpes saiam exatamente das cartas HTML. createScene() devolve null sem WebGL ou sem a CDN.
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Perfis de qualidade (PERFORMANCE_BUDGET.md). Partículas = poeira de Cosmo ambiente; vfx = teto do pool de VFX.
export const QUALITY = {
  low: {pixelRatio: 1, ambient: 0, vfx: 600, columns: 8, antialias: false, rays: false},
  medium: {pixelRatio: 1.25, ambient: 500, vfx: 1500, columns: 12, antialias: true, rays: true},
  high: {pixelRatio: 1.75, ambient: 1400, vfx: 3000, columns: 16, antialias: true, rays: true},
  ultra: {pixelRatio: 2, ambient: 2800, vfx: 5000, columns: 20, antialias: true, rays: true},
};

// Temas por alinhamento: cores do céu, chão, colunas, luz e poeira. Só Athena e Poseidon têm cena nesta fatia.
export const THEMES = {
  // Olympus Arena V1 (referência aprovada em docs/olympus-arena/): noite cósmica azul/violeta, piso zodiacal dourado.
  olympus: {label: 'Olympus Arena', skyTop: '#02040f', skyBottom: '#1b2563', floorA: '#22306b', floorB: '#070b24', line: '#c9a45c',
    column: '#8d96bd', light: '#a9c0ff', dust: '#8fc4ff', fog: '#04071a', caustics: 0, zodiac: 1},
  athena: {label: "Athena's Sanctuary", skyTop: '#0b1030', skyBottom: '#d9a54a', floorA: '#f3ede1', floorB: '#b9ab92', line: '#e8c46a',
    column: '#efe6d4', light: '#ffdca0', dust: '#ffd77a', fog: '#1a1530', caustics: 0},
  poseidon: {label: "Poseidon's Undersea Temple", skyTop: '#02101f', skyBottom: '#0c5a7a', floorA: '#3d8fa6', floorB: '#0d3346', line: '#7fe3f0',
    column: '#9fd6d8', light: '#8be8ff', dust: '#bff6ff', fog: '#032033', caustics: 1},
};

const VERT_PASS = `varying vec2 vUv; varying vec3 vPos; void main(){ vUv = uv; vPos = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

// Chão: mármore procedural (fbm), anéis e linhas de constelação dourados; cáusticas animadas no tema Poseidon.
const FLOOR_FRAG = `
uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uLine; uniform float uCaustics; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.03; a *= .5; } return v; }
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p);
  float vein = smoothstep(.45, .5, abs(fbm(p*3.5 + fbm(p*6.)) - .5));
  vec3 col = mix(uB, uA, .55 + .45*fbm(p*2.)) * (.82 + .18*vein);
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
  gl_FragColor = vec4(col, 1.);
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

const DUST_VERT = `attribute float aSeed; uniform float uTime; uniform float uPixel; varying float vA;
void main(){ vec3 p = position; float t = mod(uTime*.25*(.4 + aSeed) + aSeed*10., 1.);
  p.y += t * 7.; p.x += sin(uTime*.6 + aSeed*30.) * .4; vA = sin(t*3.14159);
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

export async function createScene(host, {quality = 'high', theme = 'athena', reduceFlashes = false} = {}) {
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return null;
  let THREE;
  try { THREE = await import(THREE_URL); } catch { return null; }

  let q = QUALITY[quality] || QUALITY.high;
  const renderer = new THREE.WebGLRenderer({antialias: q.antialias, alpha: false, powerPreference: 'high-performance'});
  renderer.autoClear = false;
  renderer.setPixelRatio(Math.min(q.pixelRatio, window.devicePixelRatio || 1));
  renderer.domElement.className = 'arena-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  // Golpes por cima das cartas (autor, 28/10/2026): os efeitos vão num segundo canvas transparente acima do DOM.
  const fxRenderer = new THREE.WebGLRenderer({antialias: q.antialias, alpha: true, premultipliedAlpha: true});
  fxRenderer.setClearColor(0x000000, 0);
  fxRenderer.setPixelRatio(renderer.getPixelRatio());
  fxRenderer.domElement.className = 'fx-canvas';
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
    uniforms: {uTime: uniforms.uTime, uA: {value: col('#fff')}, uB: {value: col('#888')}, uLine: {value: col('#fc0')}, uCaustics: {value: 0}}}));
  floor.rotation.x = -Math.PI / 2;
  world.add(floor);

  // Piso zodiacal (Olympus): textura desenhada uma vez em canvas — anéis, 12 casas, signos e rosa dos ventos.
  const zodiac = new THREE.Mesh(new THREE.CircleGeometry(11, 96), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(zodiacCanvas()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9}));
  zodiac.rotation.x = -Math.PI / 2; zodiac.position.y = .02;
  world.add(zodiac);

  world.add(new THREE.HemisphereLight('#ffffff', '#202030', .55));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(-6, 14, 6);
  world.add(sun);

  // Colunas instanciadas em anel: fuste, base e capitel numa só malha cada (3 draw calls).
  const colMat = new THREE.MeshStandardMaterial({color: '#eee', roughness: .55, metalness: .05});
  const goldMat = new THREE.MeshStandardMaterial({color: '#d9b25c', roughness: .3, metalness: .85});
  let columnMeshes = [];
  function buildColumns(count) {
    for (const m of columnMeshes) { world.remove(m); m.geometry.dispose(); }
    const shaft = new THREE.InstancedMesh(new THREE.CylinderGeometry(.45, .52, 7, 20, 1, true), colMat, count);
    const base = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, .35, 1.3), colMat, count);
    const cap = new THREE.InstancedMesh(new THREE.BoxGeometry(1.35, .3, 1.35), goldMat, count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const a = Math.PI * (1.05 + i / (count - 1) * .9) , r = 15.5;  // arco atrás do campo
      const x = Math.cos(a) * r, z = Math.sin(a) * r * .75 - 2;
      m.makeTranslation(x, 3.5, z); shaft.setMatrixAt(i, m);
      m.makeTranslation(x, .17, z); base.setMatrixAt(i, m);
      m.makeTranslation(x, 7.1, z); cap.setMatrixAt(i, m);
    }
    columnMeshes = [shaft, base, cap];
    columnMeshes.forEach(x => world.add(x));
  }

  const rays = [];
  const rayMat = new THREE.ShaderMaterial({vertexShader: VERT_PASS, fragmentShader: RAY_FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: {uColor: {value: col('#fff')}, uTime: uniforms.uTime}});
  for (const [x, z, tilt] of [[-7, -9, .25], [-1, -11, .05], [6, -9, -.22]]) {
    const ray = new THREE.Mesh(new THREE.ConeGeometry(3.2, 22, 24, 1, true), rayMat);
    ray.position.set(x, 9, z); ray.rotation.z = tilt; rays.push(ray); world.add(ray);
  }

  let dust = null;
  const dustMat = new THREE.ShaderMaterial({vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, uniforms: {uTime: uniforms.uTime, uColor: {value: col('#fff')}, uPixel: {value: 1}}});
  function buildDust(count) {
    if (dust) { world.remove(dust); dust.geometry.dispose(); dust = null; }
    if (!count) return;
    const g = new THREE.BufferGeometry(), pos = new Float32Array(count * 3), seed = new Float32Array(count);
    for (let i = 0; i < count; i++) { pos[i * 3] = (Math.random() - .5) * 30; pos[i * 3 + 1] = Math.random() * 2 - 1; pos[i * 3 + 2] = (Math.random() - .5) * 22; seed[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    dust = new THREE.Points(g, dustMat); world.add(dust);
  }

  function setTheme(name) {
    const t = THEMES[name] || THEMES.athena;
    sky.material.uniforms.uTop.value.set(t.skyTop); sky.material.uniforms.uBottom.value.set(t.skyBottom);
    const f = floor.material.uniforms;
    f.uA.value.set(t.floorA); f.uB.value.set(t.floorB); f.uLine.value.set(t.line); f.uCaustics.value = t.caustics;
    colMat.color.set(t.column); sun.color.set(t.light); rayMat.uniforms.uColor.value.set(t.light); dustMat.uniforms.uColor.value.set(t.dust);
    world.fog = new THREE.Fog(t.fog, 26, 70);
    zodiac.visible = !!t.zodiac;
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
  let cursor = 0;
  function spawn(x, y, vx, vy, {color = '#ffd77a', size = 10, life = .8, drag = 2, grav = 0, alpha = 1} = {}) {
    const limit = Math.min(CAP, q.vfx), i = cursor % limit;
    cursor++; P.n = Math.max(P.n, i + 1);
    const c = col(color);
    P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = 0;
    P.vel[i * 2] = vx; P.vel[i * 2 + 1] = vy;
    P.color[i * 4] = c.r; P.color[i * 4 + 1] = c.g; P.color[i * 4 + 2] = c.b; P.color[i * 4 + 3] = alpha;
    P.base[i] = size * renderer.getPixelRatio(); P.size[i] = P.base[i]; P.life[i] = life; P.max[i] = life; P.drag[i] = drag; P.grav[i] = grav;
  }
  function stepParticles(dt) {
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] <= 0) { P.size[i] = 0; continue; }
      P.life[i] -= dt;
      const k = Math.max(0, P.life[i] / P.max[i]), d = Math.exp(-P.drag[i] * dt);
      P.vel[i * 2] *= d; P.vel[i * 2 + 1] = P.vel[i * 2 + 1] * d + P.grav[i] * dt;
      P.pos[i * 3] += P.vel[i * 2] * dt; P.pos[i * 3 + 1] += P.vel[i * 2 + 1] * dt;
      P.size[i] = P.base[i] * (.35 + .65 * k);
      P.color[i * 4 + 3] = Math.min(1, k * 1.6);
    }
    fxGeo.attributes.position.needsUpdate = true; fxGeo.attributes.aColor.needsUpdate = true; fxGeo.attributes.aSize.needsUpdate = true;
    fxGeo.setDrawRange(0, P.n);
  }

  // Formas efêmeras (anéis de choque, feixes, flash): malhas reaproveitadas por tipo.
  const live = [];
  const ringGeo = new THREE.RingGeometry(.82, 1, 64), quadGeo = new THREE.PlaneGeometry(1, 1);
  const additive = color => { const m = new THREE.MeshBasicMaterial({color, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide}); return m; }; // y para baixo inverte a face
  function shape(geo, color, update, duration) {
    const mesh = new THREE.Mesh(geo, additive(color));
    fxScene.add(mesh);
    live.push({mesh, update, t: 0, duration});
  }
  function stepShapes(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const s = live[i]; s.t += dt;
      const k = Math.min(1, s.t / s.duration);
      s.update(s.mesh, k);
      if (k >= 1) { fxScene.remove(s.mesh); s.mesh.material.dispose(); live.splice(i, 1); }
    }
  }

  const fx = {
    // Explosão radial de partículas.
    burst(x, y, {color = '#ffd77a', count = 60, speed = 420, size = 12, life = .7, grav = 0} = {}) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (.3 + Math.random() * .7);
        spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, {color, size: size * (.5 + Math.random()), life: life * (.6 + Math.random() * .6), drag: 3, grav});
      }
    },
    // Concentração de Cosmo: partículas convergem para o ponto.
    charge(x, y, {color = '#ffd77a', count = 50, radius = 140, life = .45} = {}) {
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
          for (let i = 0; i < trail; i++) spawn(x + (Math.random() - .5) * 6, y + (Math.random() - .5) * 6, (Math.random() - .5) * 40, (Math.random() - .5) * 40, {color, size: size * (.6 + Math.random() * .6), life: .35, drag: 4});
          if (k < 1) requestAnimationFrame(tick); else done();
        };
        tick();
      })]);
    },
  };

  // ---------- Câmera, tamanho, loop ----------
  let shakeAmp = 0, punch = 0;
  fx.shake = amp => { shakeAmp = Math.max(shakeAmp, amp); };
  fx.punch = amount => { punch = Math.max(punch, amount); }; // recuo curto da câmera no impacto

  function resize() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    renderer.setSize(w, h, false); fxRenderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    fxCam.left = 0; fxCam.right = w; fxCam.top = 0; fxCam.bottom = h; fxCam.updateProjectionMatrix();
    dustMat.uniforms.uPixel.value = renderer.getPixelRatio() * h * .05;
  }
  const ro = new ResizeObserver(resize); ro.observe(host);

  let last = performance.now(), running = true, frames = 0, fpsClock = last, fps = 60, lost = false;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden || lost) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    uniforms.uTime.value += dt;
    frames++; if (now - fpsClock > 1000) { fps = frames * 1000 / (now - fpsClock); frames = 0; fpsClock = now; }
    shakeAmp *= Math.exp(-dt * 9); punch *= Math.exp(-dt * 7);
    const drift = Math.sin(uniforms.uTime.value * .15) * .35;
    camera.position.set(camHome.x + drift + (Math.random() - .5) * shakeAmp * .08, camHome.y - punch * .6 + (Math.random() - .5) * shakeAmp * .08, camHome.z - punch);
    camera.lookAt(look);
    stepParticles(dt); stepShapes(dt);
    renderer.clear();
    renderer.render(world, camera);
    fxRenderer.render(fxScene, fxCam);
  }

  // Perda de contexto: para o desenho e avisa; a interface DOM continua jogável.
  const onLost = e => { e.preventDefault(); lost = true; host.classList.add('webgl-lost'); };
  const onRestored = () => { lost = false; host.classList.remove('webgl-lost'); };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);

  function setQuality(name) {
    q = QUALITY[name] || QUALITY.high;
    renderer.setPixelRatio(Math.min(q.pixelRatio, window.devicePixelRatio || 1)); fxRenderer.setPixelRatio(renderer.getPixelRatio());
    buildColumns(q.columns); buildDust(q.ambient);
    rays.forEach(r => { r.visible = q.rays; });
    resize();
  }

  setTheme(theme); setQuality(quality);
  requestAnimationFrame(frame);

  return {
    fx, setTheme, setQuality, THREE,
    get fps() { return fps; },
    set reduceFlashes(v) { reduceFlashes = v; },
    stats: () => ({fps: Math.round(fps), calls: renderer.info.render.calls, particles: P.n, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures}),
    dispose() { running = false; ro.disconnect(); renderer.dispose(); renderer.domElement.remove(); fxRenderer.dispose(); fxRenderer.domElement.remove(); },
  };
}

export const wait = ms => new Promise(r => setTimeout(r, ms));
