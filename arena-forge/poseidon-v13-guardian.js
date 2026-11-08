// SSTCG Poseidon V13 — Guardian of the Tides no mundo (SÓ DESENVOLVIMENTO).
// Liga apenas com ?sculptV13=1 na URL (ou opção devGuardian). Sem a flag nada é carregado e a cena fica idêntica.
// O build enxuto do Three.js do jogo não tem GLTFLoader; este leitor cobre o perfil exportado pelo Sculpture Studio:
// vários nós/malhas, triângulos indexados, POSITION/NORMAL/TEXCOORD_0, materiais PBR com baseColor, normal e
// metallicRoughness/occlusion (ORM) em imagens embutidas (JPEG/PNG). Qualquer coisa fora disso é recusada.
// Inclui o apoio arquitetônico sob o pedestal: o pódio vai só até x = ±9,2; o guardião fica em x = -10,8.
export const GUARDIAN_TIDES = {position: [-10.8, 4.41, -34.8], url: './assets/poseidon-v13/guardian-tides-lod0.glb', yaw: 0};   // o giro de ~10° para o templo já está na pose (raiz do rig)
// Posição B (direita do mundo): Guardião das Profundezas. Só a prévia em argila existe (DEV), atrás de ?sculptDepthsClay=1.
export const GUARDIAN_DEPTHS = {position: [10.8, 4.41, -34.8], url: './assets/poseidon-depths-clay/guardian-depths-clay.glb', yaw: 0, dev: true};
export function depthsClayFlag() {
  try { const q = new URLSearchParams(location.search); return ['sculptDepthsClay', 'sculptDepthsV1', 'sculptDepthsV11'].some(k => q.get(k) === '1'); } catch { return false; }
}
// V1.1 com ?sculptDepthsV11=1, V1 com ?sculptDepthsV1=1; senão a prévia em argila.
export function depthsUrl() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('sculptDepthsV11') === '1') return './assets/poseidon-depths-v1-1/guardian-depths-lod0.glb';
    if (q.get('sculptDepthsV1') === '1') return './assets/poseidon-depths-v1/guardian-depths-lod0.glb';
  } catch {}
  return GUARDIAN_DEPTHS.url;
}

const COMP = {5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array};
const SIZE = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4};

export function guardianFlag() {
  try { const q = new URLSearchParams(location.search); return ['sculptV13', 'sculptV14', 'sculptV141'].some(k => q.get(k) === '1'); } catch { return false; }
}

// Revisões de escultura com o mesmo leitor: ?sculptV141=1 carrega a V14.1, ?sculptV14=1 a V14; ?sculptV13=1 continua a V13.
export function guardianUrl() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('sculptV141') === '1') return './assets/poseidon-v14-1/guardian-tides-lod0.glb';
    if (q.get('sculptV14') === '1') return './assets/poseidon-v14/guardian-tides-lod0.glb';
  } catch {}
  return GUARDIAN_TIDES.url;
}

export async function parseGuardianGLB(THREE, raw) {
  const dv = new DataView(raw), u8 = new Uint8Array(raw);
  if (dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2 || dv.getUint32(8, true) !== raw.byteLength) throw Error('GLB 2.0 inválido');
  let off = 12, json = null, bin = null;
  while (off < raw.byteLength) {
    const n = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), b = off + 8, e = b + n;
    if (e > raw.byteLength) throw Error('chunk GLB estourado');
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(u8.subarray(b, e)));
    if (type === 0x004e4942) bin = u8.subarray(b, e);
    off = e;
  }
  if (!json || !bin || json.asset?.version !== '2.0') throw Error('GLB sem JSON ou binário');
  if ((json.extensionsRequired || []).length) throw Error('extensões obrigatórias não suportadas');
  const view = i => { const v = json.bufferViews[i]; if (!v || v.buffer !== 0 || v.byteOffset + v.byteLength > bin.length || v.byteStride) throw Error('bufferView inválido'); return bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); };
  const accessor = i => {
    const a = json.accessors[i], T = COMP[a?.componentType], k = SIZE[a?.type];
    if (!a || !T || !k || a.sparse) throw Error('accessor não suportado');
    const src = view(a.bufferView), start = a.byteOffset || 0, bytes = a.count * k * T.BYTES_PER_ELEMENT;
    if (start + bytes > src.byteLength) throw Error('accessor além do buffer');
    return {array: new T(src.slice(start, start + bytes).buffer), k, normalized: !!a.normalized};
  };
  const images = await Promise.all((json.images || []).map(async im => {
    if (im.uri) throw Error('textura externa recusada');
    const blob = new Blob([view(im.bufferView)], {type: im.mimeType});
    const bmp = await createImageBitmap(blob, {imageOrientation: 'none'});
    return bmp;
  }));
  const tex = (info, srgb) => {
    if (!info) return null;
    // o build enxuto exporta só CanvasTexture (subclasse de Texture; aceita ImageBitmap) e não exporta as constantes
    const t = new (THREE.Texture || THREE.CanvasTexture)(images[json.textures[info.index].source]);
    t.flipY = false; t.colorSpace = srgb ? (THREE.SRGBColorSpace ?? 'srgb') : (THREE.NoColorSpace ?? ''); t.wrapS = t.wrapT = THREE.RepeatWrapping ?? 1000; t.needsUpdate = true;
    return t;
  };
  const owned = [];
  const mats = (json.materials || []).map(m => {
    const p = m.pbrMetallicRoughness || {};
    const orm = tex(p.metallicRoughnessTexture, false);
    const mat = new THREE.MeshStandardMaterial({
      name: m.name, map: tex(p.baseColorTexture, true), normalMap: tex(m.normalTexture, false),
      roughnessMap: orm, metalnessMap: orm, aoMap: m.occlusionTexture ? (orm && m.occlusionTexture.index === p.metallicRoughnessTexture?.index ? orm : tex(m.occlusionTexture, false)) : null,
      roughness: p.roughnessFactor ?? 1, metalness: p.metallicFactor ?? 1,
      color: new THREE.Color().fromArray((p.baseColorFactor || [1, 1, 1, 1]).slice(0, 3)),
    });
    owned.push(mat); return mat;
  });
  const meshes = (json.meshes || []).map(m => m.primitives.map(pr => {
    if ((pr.mode ?? 4) !== 4 || pr.indices === undefined) throw Error('primitiva não suportada');
    const g = new THREE.BufferGeometry();
    for (const [name, attr] of [['POSITION', 'position'], ['NORMAL', 'normal'], ['TEXCOORD_0', 'uv']]) {
      if (pr.attributes[name] === undefined) { if (name === 'POSITION') throw Error('sem POSITION'); continue; }
      const a = accessor(pr.attributes[name]); g.setAttribute(attr, new THREE.BufferAttribute(a.array, a.k, a.normalized));
    }
    if (g.attributes.uv) g.setAttribute('uv2', g.attributes.uv);      // aoMap usa o mesmo UV
    const ix = accessor(pr.indices); g.setIndex(new THREE.BufferAttribute(ix.array, 1));
    owned.push(g);
    return {g, mat: mats[pr.material] || new THREE.MeshStandardMaterial()};
  }));
  const build = i => {
    const n = json.nodes[i];
    const parts = n.mesh !== undefined ? meshes[n.mesh] : [];
    // o build enxuto não tem Group: nós sem malha viram Mesh invisível vazia (mesmo padrão do palácio)
    const o = parts.length === 1 ? new THREE.Mesh(parts[0].g, parts[0].mat) : new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({visible: false}));
    if (parts.length > 1) parts.forEach(p => o.add(new THREE.Mesh(p.g, p.mat)));
    o.name = n.name || '';
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    (n.children || []).forEach(c => o.add(build(c)));
    return o;
  };
  const scene = json.scenes[json.scene || 0];
  const root = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({visible: false}));
  root.name = 'GUARDIAN_TIDES_GLB';
  scene.nodes.forEach(i => root.add(build(i)));
  return {root, dispose() { owned.forEach(x => { if (x.isMaterial) Object.values(x).forEach(v => v?.isTexture && v.dispose()); x.dispose(); }); images.forEach(b => b.close?.()); }};
}

/** Apoio sob o pedestal: bloco de mármore do chão (y = 0) até o topo do pódio (4,41), ligado à lateral do pódio. */
export function guardianSupport(THREE, material, [x, y, z]) {
  const owned = [];
  const add = (parent, w, h, d, px, py, pz, m = material) => {
    const g = new THREE.BoxGeometry(w, h, d); owned.push(g);
    const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); parent.add(o); return o;
  };
  const root = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({visible: false}));
  root.name = 'GUARDIAN_TIDES_SUPPORT';
  // o bloco avança 1,15 m para dentro do canto do pódio (x ≤ -8,9; z ≤ -36,35): fica preso à arquitetura, não flutua
  add(root, 3.8, y, 4.4, x, y / 2, z - 0.5);                   // bloco sob a base 3,0 × 2,6 m
  add(root, 4.2, 0.22, 4.8, x, y - 0.11, z - 0.5);             // laje de coroamento
  add(root, 4.3, 0.4, 4.9, x, 0.2, z - 0.5);                   // sapata
  return {root, dispose() { owned.forEach(g => g.dispose()); }};
}

export async function loadGuardianTides(THREE, {parent, material, baseUrl, url = GUARDIAN_TIDES.url, position = GUARDIAN_TIDES.position, yaw = GUARDIAN_TIDES.yaw} = {}) {
  const res = await fetch(new URL(url, baseUrl).href, {cache: 'no-store'});
  if (!res.ok) throw Error('Guardian GLB HTTP ' + res.status);
  const glb = await parseGuardianGLB(THREE, await res.arrayBuffer());
  const support = guardianSupport(THREE, material, position);
  glb.root.position.fromArray(position);
  glb.root.rotation.y = yaw * Math.PI / 180;
  parent.add(support.root); parent.add(glb.root);
  return {root: glb.root, support: support.root, dispose() { parent.remove(glb.root); parent.remove(support.root); glb.dispose(); support.dispose(); }};
}
