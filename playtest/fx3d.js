// WebGL effects layer (Three.js). Purely visual: app.js keeps state and input,
// this module only plays card flights, attack lunges, bursts and ambient cosmo.
// createFx() resolves to null when WebGL or the CDN is unavailable; app.js then keeps its CSS fallback.

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const EASE = (t) => 1 - Math.pow(1 - t, 3);

export async function createFx() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }
  const probe = document.createElement("canvas");
  if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
    return null;
  }

  const THREE = await import(THREE_URL);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.className = "fx3d-canvas";
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffe3a3, 1.4);
  sun.position.set(-300, 600, 900);
  scene.add(sun);

  // World units are CSS pixels on the z=0 plane, origin at the viewport centre.
  let width = 1;
  let height = 1;
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.position.set(0, 0, height / 2 / Math.tan((camera.fov * Math.PI) / 360));
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);
  const toWorld = (x, y) => new THREE.Vector3(x - width / 2, height / 2 - y, 0);
  const centerOf = (rect) => toWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);

  const textures = new Map();
  const loader = new THREE.TextureLoader();
  const textureFor = (src) => {
    if (!src) return null;
    if (!textures.has(src)) {
      const texture = loader.load(src);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.set(src, texture);
    }
    return textures.get(src);
  };

  const tweens = new Set();
  const tween = (duration, step) =>
    new Promise((resolve) => {
      tweens.add({ start: performance.now(), duration, step, resolve });
    });

  const makeCard = (rect, src) => {
    const map = textureFor(src);
    const material = new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : 0x1a1440, roughness: 0.45, metalness: 0.1, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rect.width, rect.height), material);
    mesh.position.copy(centerOf(rect));
    scene.add(mesh);
    return mesh;
  };
  const dispose = (mesh) => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  };

  // Ambient cosmo motes drifting upward.
  const moteCount = 140;
  const motePositions = new Float32Array(moteCount * 3);
  const resetMote = (i, anywhere) => {
    motePositions[i * 3] = (Math.random() - 0.5) * width;
    motePositions[i * 3 + 1] = anywhere ? (Math.random() - 0.5) * height : -height / 2 - 10;
    motePositions[i * 3 + 2] = Math.random() * 120;
  };
  for (let i = 0; i < moteCount; i += 1) resetMote(i, true);
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  const motes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({ color: 0x9fd8ff, size: 3, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(motes);

  const bursts = new Set();
  const burst = (x, y, color = 0xffc46b, count = 60) => {
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 380;
      velocities.push(Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 200);
      const origin = toWorld(x, y);
      positions.set([origin.x, origin.y, 20], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color, size: 6, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(points);
    bursts.add({ points, velocities, born: performance.now() });
  };

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    for (let i = 0; i < moteCount; i += 1) {
      motePositions[i * 3 + 1] += dt * (18 + (i % 7) * 4);
      if (motePositions[i * 3 + 1] > height / 2 + 10) resetMote(i, false);
    }
    moteGeometry.attributes.position.needsUpdate = true;

    bursts.forEach((entry) => {
      const age = (now - entry.born) / 1000;
      const position = entry.points.geometry.attributes.position;
      for (let i = 0; i < position.count; i += 1) {
        position.array[i * 3] += entry.velocities[i * 3] * dt;
        position.array[i * 3 + 1] += (entry.velocities[i * 3 + 1] - 400 * age) * dt;
        position.array[i * 3 + 2] += entry.velocities[i * 3 + 2] * dt;
      }
      position.needsUpdate = true;
      entry.points.material.opacity = Math.max(0, 1 - age / 0.8);
      if (age > 0.8) {
        scene.remove(entry.points);
        entry.points.geometry.dispose();
        entry.points.material.dispose();
        bursts.delete(entry);
      }
    });

    tweens.forEach((entry) => {
      const t = Math.min(1, (now - entry.start) / entry.duration);
      entry.step(t);
      if (t >= 1) {
        tweens.delete(entry);
        entry.resolve();
      }
    });

    renderer.render(scene, camera);
  });

  return {
    // Card arcs off the table toward the camera, flips upright and lands on its slot (450 ms).
    async flyCard(fromRect, toRect, src) {
      const card = makeCard(toRect, src);
      const from = centerOf(fromRect);
      const to = centerOf(toRect);
      const scaleFrom = fromRect.width / toRect.width;
      await tween(450, (t) => {
        const e = EASE(t);
        card.position.lerpVectors(from, to, e);
        card.position.z = Math.sin(e * Math.PI) * 260;
        card.rotation.x = (1 - e) * -0.9;
        card.rotation.z = (1 - e) * 0.25;
        card.scale.setScalar(scaleFrom + (1 - scaleFrom) * e);
      });
      burst(toRect.left + toRect.width / 2, toRect.top + toRect.height, 0xffd98a, 36);
      dispose(card);
    },

    // Attacker lunges to the target (300 ms), impact burst, then returns (200 ms).
    async lunge(fromRect, toRect, src) {
      const card = makeCard(fromRect, src);
      const from = centerOf(fromRect);
      const to = centerOf(toRect);
      const hit = from.clone().lerp(to, 0.82);
      await tween(300, (t) => {
        const e = t * t;
        card.position.lerpVectors(from, hit, e);
        card.position.z = Math.sin(e * Math.PI * 0.5) * 140;
        card.rotation.x = e * 0.35 * Math.sign(to.y - from.y || 1);
      });
      burst(toRect.left + toRect.width / 2, toRect.top + toRect.height / 2, 0xff6a3c, 80);
      await tween(200, (t) => {
        const e = EASE(t);
        card.position.lerpVectors(hit, from, e);
        card.position.z = (1 - e) * 140;
        card.rotation.x = (1 - e) * 0.35 * Math.sign(to.y - from.y || 1);
      });
      dispose(card);
    },

    burst
  };
}
