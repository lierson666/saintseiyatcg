// Moeda 3D do cara ou coroa (§55): um cilindro de metal lançado no ar. Só mostra o resultado que a engine já decidiu.
// Cara é a face do jogador A; Coroa, a do jogador B. Cada face leva o cosmético do dono (arte do personagem) ou o desenho padrão.
const THREE_URL = new URL('./vendor/three-0.160.0-slim.js', import.meta.url).href;
export const COIN_TOSS_MS = 2100;
const SIZE = 512, SPINS = 6;
const METAL = {A: ['#fff1b8', '#e6c36a', '#9a7322', '#5a3f10'], B: ['#f4f6ff', '#b9c2d8', '#69738d', '#2c3347']};

function star(g, r) {
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8 - Math.PI / 2, d = i % 4 === 0 ? r : i % 2 === 0 ? r * .42 : r * .2;
    g.lineTo(SIZE / 2 + Math.cos(a) * d, SIZE / 2 + Math.sin(a) * d);
  }
  g.closePath(); g.fill();
}
function moon(g, r) {
  g.beginPath();
  g.arc(SIZE / 2, SIZE / 2, r, Math.PI * .3, Math.PI * 1.7);
  g.arc(SIZE / 2 + r * .42, SIZE / 2, r * .8, Math.PI * 1.62, Math.PI * .38, true);
  g.closePath(); g.fill();
}
// Desenha a face no canvas: aro de metal e, no miolo, a arte do cosmético (recorte alto, onde fica o rosto) ou o símbolo.
function paintFace(canvas, key, img) {
  const g = canvas.getContext('2d'), c = SIZE / 2, [hi, mid, low, dark] = METAL[key];
  const metal = g.createRadialGradient(c * .7, c * .6, 10, c, c, c);
  metal.addColorStop(0, hi); metal.addColorStop(.5, mid); metal.addColorStop(1, low);
  g.fillStyle = metal; g.fillRect(0, 0, SIZE, SIZE);
  g.strokeStyle = dark; g.lineWidth = 5;
  g.beginPath(); g.arc(c, c, c - 34, 0, Math.PI * 2); g.stroke();
  g.fillStyle = hi;
  for (let i = 0; i < 40; i++) { const a = i * Math.PI / 20; g.beginPath(); g.arc(c + Math.cos(a) * (c - 17), c + Math.sin(a) * (c - 17), 4.5, 0, Math.PI * 2); g.fill(); }
  if (img) {
    const side = Math.min(img.width, img.height), sy = (img.height - side) * .22;
    g.save(); g.beginPath(); g.arc(c, c, c - 37, 0, Math.PI * 2); g.clip();
    g.drawImage(img, (img.width - side) / 2, sy, side, side, 37, 37, SIZE - 74, SIZE - 74);
    g.restore();
  } else {
    g.fillStyle = dark;
    (key === 'A' ? star : moon)(g, c * .56);
  }
}
const edgeTexture = (THREE) => {
  const canvas = Object.assign(document.createElement('canvas'), {width: 256, height: 16}), g = canvas.getContext('2d');
  for (let x = 0; x < 256; x += 4) { g.fillStyle = x % 8 ? '#6e5320' : '#e6c36a'; g.fillRect(x, 0, 4, 16); }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = 1000; t.repeat.x = 6; // 1000 = RepeatWrapping (fora do Three enxuto) t.colorSpace = 'srgb';
  return t;
};

// Devolve null sem WebGL (a tela usa a moeda em CSS). `winner`: 'A' cai em Cara; 'B', em Coroa. `still`: reduced motion, sem lançamento.
export async function createCoin3D(host, {winner, faces = {}, still = false}) {
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return null;
  let THREE, renderer;
  try { THREE = await import(THREE_URL); } catch { return null; }
  try { renderer = new THREE.WebGLRenderer({antialias: true, alpha: true}); } catch { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.domElement.className = 'coin__canvas';
  host.append(renderer.domElement);

  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  camera.position.z = 7;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a60, 1.6));
  const key = new THREE.DirectionalLight(0xfff1d0, 2.4); key.position.set(-2, 3, 5); scene.add(key);
  const glint = new THREE.DirectionalLight(0xffe2a0, 1.5); glint.position.set(2, -1, 3); scene.add(glint);

  const faceOf = k => {
    const canvas = Object.assign(document.createElement('canvas'), {width: SIZE, height: SIZE});
    paintFace(canvas, k, null);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = 'srgb'; map.anisotropy = 4; map.center.set(.5, .5);
    map.rotation = k === 'A' ? Math.PI / 2 : -Math.PI / 2; // tampas do cilindro: deixa as duas faces de pé ao cair
    return {canvas, map, material: new THREE.MeshStandardMaterial({map, metalness: .55, roughness: .38, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .32})};
  };
  const heads = faceOf('A'), tails = faceOf('B'), rim = edgeTexture(THREE);
  const edge = new THREE.MeshStandardMaterial({map: rim, metalness: .8, roughness: .3, emissive: 0x4a3510, emissiveIntensity: .6});
  const geometry = new THREE.CylinderGeometry(1, 1, .13, 96);
  geometry.rotateX(Math.PI / 2); // a tampa de cima (Cara) olha para a câmera
  const pivot = new THREE.Mesh(geometry, [edge, heads.material, tails.material]);
  scene.add(pivot);

  const draw = () => renderer.render(scene, camera);
  const fit = () => {
    const w = host.clientWidth || 300, h = host.clientHeight || 300;
    renderer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    draw();
  };
  const watcher = new ResizeObserver(fit);
  watcher.observe(host);
  fit();

  const end = SPINS * Math.PI * 2 + (winner === 'A' ? 0 : Math.PI);
  const pose = t => {
    const air = Math.min(1, t / .86), bounce = t > .86 ? Math.sin((t - .86) / .14 * Math.PI) * .12 : 0;
    pivot.position.y = .55 * 4 * air * (1 - air) + bounce;
    pivot.position.z = .9 * Math.sin(Math.PI * air);
    pivot.rotation.x = end * (1 - (1 - air) ** 2.2);
    pivot.rotation.z = .3 * Math.sin(air * Math.PI * 3) * (1 - air);
    glint.position.x = 2.4 * Math.cos(t * 9);
    glint.intensity = t > .84 ? 1.5 + 3 * Math.max(0, 1 - (t - .84) / .16) : 1.5;
  };
  let frame = 0, gone = false;
  pose(still ? 1 : 0);
  draw();

  const setFace = (k, url) => {
    if (!url || gone) return;
    const img = new Image(), face = k === 'A' ? heads : tails;
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (gone) return; paintFace(face.canvas, k, img); face.map.needsUpdate = true; draw(); };
    img.src = url;
  };
  setFace('A', faces.A); setFace('B', faces.B);

  return {
    setFace,
    toss: () => (still ? Promise.resolve() : new Promise(done => {
      const from = performance.now();
      const step = at => {
        if (gone) return done();
        const t = Math.min(1, (at - from) / COIN_TOSS_MS);
        pose(t); draw();
        if (t < 1) frame = requestAnimationFrame(step); else done();
      };
      frame = requestAnimationFrame(step);
    })),
    dispose() {
      if (gone) return;
      gone = true;
      cancelAnimationFrame(frame);
      watcher.disconnect();
      geometry.dispose(); rim.dispose(); edge.dispose();
      for (const f of [heads, tails]) { f.map.dispose(); f.material.dispose(); }
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    },
  };
}
