// ARENA FORGE · Sculpture Studio (V13, 08/11/2026): inspetor de esculturas GLB dentro do mesmo Arena Forge.
// Carrega os GLB gerados por arena-forge/sculpture-studio (Blender, local) ou um GLB importado do disco.
// Ferramentas reais: giro 360°, vistas ortográficas, wireframe, modos de material, artboard por cima,
// escala e pivô, troca de LOD, triângulos / draw calls / memória e captura de tela. Nada é publicado.
import * as THREE from './vendor/three-0.160.0.module.min.js';
import {OrbitControls} from './vendor/OrbitControls-0.160.0.js';
import {GLTFLoader} from './vendor/GLTFLoader-0.160.0.js';

const BASE = '../arena-forge/assets/poseidon-v13/';
const LODS = [['lod0', 'LOD0 · desktop (texturas 2048)'], ['lod1', 'LOD1 · médio'], ['lod2', 'LOD2 · distante'], ['mobile', 'Mobile (LOD1 + 512²)'],
  ['../poseidon-v14/guardian-tides-lod0', 'V14 · LOD0 (revisão)'], ['../poseidon-v14/guardian-tides-lod1', 'V14 · LOD1'], ['../poseidon-v14/guardian-tides-lod2', 'V14 · LOD2'], ['../poseidon-v14/guardian-tides-mobile', 'V14 · Mobile'],
  ['../poseidon-v14-1/guardian-tides-lod0', 'V14.1 · LOD0 (revisão)'], ['../poseidon-v14-1/guardian-tides-lod1', 'V14.1 · LOD1'], ['../poseidon-v14-1/guardian-tides-lod2', 'V14.1 · LOD2'], ['../poseidon-v14-1/guardian-tides-mobile', 'V14.1 · Mobile']];
const VIEWS = {frente: [0, 0, 1], costas: [0, 0, -1], esquerda: [1, 0, 0], direita: [-1, 0, 0], 'tres-quartos': [-0.7, 0.18, 1]};
const MODES = [['textura', 'Materiais'], ['argila', 'Argila'], ['normais', 'Normais'], ['base', 'Só cor base'], ['ao', 'Só AO']];
const PID = 'poseidon-palace';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const css = `
.ss { display: grid; grid-template-columns: 260px minmax(0, 1fr) 300px; gap: 14px; align-items: start; }
.ss-col { display: grid; gap: 10px; max-height: 84vh; overflow: auto; }
.ss fieldset { border: 1px solid #ffffff22; border-radius: 10px; padding: 8px 10px; display: grid; gap: 6px; min-width: 0; }
.ss legend { font-weight: 600; padding: 0 4px; }
.ss-stage { position: relative; aspect-ratio: 4 / 5; max-height: 84vh; background: radial-gradient(#1b2a3a, #05070d); border-radius: 10px; overflow: hidden; }
.ss-stage canvas { position: absolute; inset: 0; width: 100% !important; height: 100% !important; }
.ss-stage img.ss-ab { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.ss-row { display: flex; gap: 6px; flex-wrap: wrap; } .ss-row button[aria-pressed="true"] { border-color: #d6b574; color: #d6b574; }
.ss table { width: 100%; border-collapse: collapse; font-size: 12px; } .ss td, .ss th { padding: 3px 4px; border-bottom: 1px solid #ffffff14; text-align: left; }
.ss td.n { text-align: right; font-variant-numeric: tabular-nums; }
.ss-note { font-size: 12px; color: #f1d7a1; border: 1px solid #655b44; border-radius: 6px; padding: 8px; }
@media (max-width: 1250px) { .ss { grid-template-columns: 1fr; } .ss-stage { order: -1; max-height: 70vh; } .ss-col { max-height: none; } }
.ss-tex { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; } .ss-tex img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; background: #000; }
`;

let st = null;   // estado do inspetor (um por montagem)

export async function mountSculpture(host, ctx, nav) {
  if (!document.querySelector('#ss-style')) document.head.append(Object.assign(document.createElement('style'), {id: 'ss-style', textContent: css}));
  st?.dispose();
  host.innerHTML = `${nav}<section class="ss" aria-label="Sculpture Studio">
    <div class="ss-col">
      <fieldset><legend>Modelo</legend>
        <label>GLB do Sculpture Studio <select data-ss="lod">${LODS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
        <label>Importar GLB do disco <input type="file" accept=".glb,model/gltf-binary" data-ss="file"></label>
        <small data-ss="src" class="hint"></small>
      </fieldset>
      <fieldset><legend>Vista</legend>
        <div class="ss-row">${Object.keys(VIEWS).map(v => `<button class="secondary" data-view="${v}">${v === 'tres-quartos' ? '3/4' : v}</button>`).join('')}</div>
        <div class="ss-row"><button class="secondary" data-ss-act="spin" aria-pressed="false">Giro 360°</button>
          <button class="secondary" data-ss-act="ortho" aria-pressed="true">Ortográfica</button>
          <button class="secondary" data-ss-act="wire" aria-pressed="false">Wireframe</button></div>
        <label>Material <select data-ss="mode">${MODES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      </fieldset>
      <fieldset><legend>Escala e pivô</legend>
        <label>Escala <input type="number" step="0.05" min="0.05" value="1" data-ss="scale"></label>
        <label>Pivô Y (m) <input type="number" step="0.05" value="0" data-ss="pivot"></label>
        <small data-ss="dims" class="hint"></small>
      </fieldset>
      <fieldset><legend>Artboard por cima</legend>
        <select data-ss="ab"><option value="">Nenhum</option></select>
        <label>Opacidade <input type="range" min="0" max="1" step="0.05" value="0.5" data-ss="abop"></label>
      </fieldset>
      <fieldset><legend>Partes</legend><div data-ss="nodes" class="ss-row"></div></fieldset>
    </div>
    <div class="ss-stage" data-ss="stage"><img class="ss-ab" data-ss="abimg" alt="" hidden></div>
    <div class="ss-col">
      <fieldset><legend>Métricas</legend><table data-ss="metrics"></table></fieldset>
      <fieldset><legend>LODs</legend><table data-ss="lods"><tr><td>Carregando…</td></tr></table></fieldset>
      <fieldset><legend>Texturas</legend><div class="ss-tex" data-ss="tex"></div></fieldset>
      <fieldset><legend>Captura</legend><button data-ss-act="shot">Salvar PNG da vista</button></fieldset>
      <p class="ss-note">Escultura gerada por script no Blender (base anatômica CC0). Aprovação artística é do autor: este inspetor só mede e mostra.</p>
    </div></section>`;
  st = createInspector(host.querySelector('[data-ss="stage"]'), host);
  try {
    const proj = await ctx.api(`producao?id=${PID}`);
    host.querySelector('[data-ss="ab"]').insertAdjacentHTML('beforeend', proj.artboards.map(b => `<option value="${esc(b.arquivo)}">${esc(b.nome)} v${b.versao}</option>`).join(''));
  } catch { /* sem projeto de produção: o seletor fica só com "Nenhum" */ }
  await st.load(BASE + 'guardian-tides-lod0.glb', 'guardian-tides-lod0.glb');
  st.compareLods();
}

function createInspector(stage, root) {
  const $ = k => root.querySelector(`[data-ss="${k}"]`);
  const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a2016, 1.3));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6); key.position.set(-6, 12, 9); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fd8ff, 1.4); rim.position.set(7, 6, -9); scene.add(rim);
  const grid = new THREE.GridHelper(10, 10, 0x3b4c63, 0x1c2633); scene.add(grid);
  const persp = new THREE.PerspectiveCamera(30, 1, 0.05, 500), ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 500);
  let cam = ortho;
  const controls = new OrbitControls(persp, renderer.domElement); controls.enableDamping = true;
  const holder = new THREE.Group(); scene.add(holder);
  const clay = new THREE.MeshStandardMaterial({color: 0xd8d2c6, roughness: 0.75}), normals = new THREE.MeshNormalMaterial();
  let model = null, original = new Map(), info = {}, spin = false, raf = 0, wire = false, mode = 'textura', size = 10, center = new THREE.Vector3();
  const loader = new GLTFLoader();

  function resize() {
    const r = stage.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
    const a = r.width / r.height; persp.aspect = a; persp.updateProjectionMatrix();
    const h = size * 0.58; Object.assign(ortho, {left: -h * a, right: h * a, top: h, bottom: -h}); ortho.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(stage);

  function frame() {
    raf = requestAnimationFrame(frame);
    if (spin && model) holder.rotation.y += 0.01;
    controls.update();
    if (cam === ortho) { ortho.position.copy(persp.position); ortho.quaternion.copy(persp.quaternion); ortho.zoom = 1 / (persp.position.distanceTo(controls.target) / (size * 2.2)); ortho.updateProjectionMatrix(); }
    renderer.render(scene, cam);
    $('metrics') && metrics();
  }

  async function load(url, label, bytes) {
    $('src').textContent = 'Carregando ' + label + '…';
    let buf;
    try { buf = bytes || await (await fetch(url, {cache: 'no-store'})).arrayBuffer(); }
    catch (e) { $('src').textContent = 'Falhou: ' + e.message; return; }
    if (new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'glTF') { $('src').textContent = `${label}: não é GLB (ainda não gerado?)`; return; }
    const gltf = await new Promise((ok, ko) => loader.parse(buf, '', ok, ko)).catch(e => ($('src').textContent = 'GLB inválido: ' + e.message, null));
    if (!gltf) return;
    if (model) { holder.remove(model); dispose(model); }
    model = gltf.scene; holder.rotation.set(0, 0, 0); holder.add(model);
    original = new Map(); model.traverse(o => o.isMesh && original.set(o, o.material));
    info = {label, bytes: buf.byteLength};
    const box = new THREE.Box3().setFromObject(model), dim = box.getSize(new THREE.Vector3());
    size = Math.max(dim.x, dim.y, dim.z); center = box.getCenter(new THREE.Vector3());
    $('dims').textContent = `Caixa: ${dim.x.toFixed(2)} × ${dim.y.toFixed(2)} × ${dim.z.toFixed(2)} m · base em y = ${box.min.y.toFixed(2)}`;
    $('src').textContent = `${label} · ${(buf.byteLength / 1048576).toFixed(2)} MB`;
    applyScale(); applyMode(); view('frente'); nodes(); textures(); resize();
  }

  function applyScale() {
    if (!model) return;
    const s = Number($('scale').value) || 1, p = Number($('pivot').value) || 0;
    holder.scale.setScalar(s); holder.position.y = p * s;
  }
  function applyMode() {
    if (!model) return;
    model.traverse(o => {
      if (!o.isMesh) return;
      const m0 = original.get(o);
      let m = mode === 'argila' ? clay : mode === 'normais' ? normals : m0;
      if (mode === 'base' || mode === 'ao') {
        const t = mode === 'base' ? m0.map : m0.aoMap;
        m = new THREE.MeshBasicMaterial({map: t || null, color: t ? 0xffffff : 0xff00ff});
      }
      m.wireframe = wire; o.material = m;
    });
  }
  function view(v) {
    const d = new THREE.Vector3(...VIEWS[v]).normalize();
    controls.target.copy(center); persp.position.copy(center).addScaledVector(d, size * 2.2); persp.lookAt(center); controls.update();
  }
  function nodes() {
    const names = []; model.traverse(o => o.isMesh && o.name && names.push(o));
    $('nodes').innerHTML = names.map((o, i) => `<label style="font-size:12px"><input type="checkbox" checked data-node="${i}"> ${esc(o.name)}</label>`).join('');
    $('nodes').onchange = e => { const o = names[+e.target.dataset.node]; if (o) o.visible = e.target.checked; };
  }
  function textures() {
    const seen = new Set(), out = [];
    model.traverse(o => o.isMesh && ['map', 'normalMap', 'roughnessMap', 'aoMap'].forEach(k => {
      const t = original.get(o)?.[k]; if (!t?.image || seen.has(t)) return; seen.add(t);
      const c = document.createElement('canvas'); c.width = c.height = 96; c.getContext('2d').drawImage(t.image, 0, 0, 96, 96);
      out.push(`<figure style="margin:0"><img src="${c.toDataURL()}" alt=""><figcaption style="font-size:10px">${esc(original.get(o).name)} · ${k} · ${t.image.width}²</figcaption></figure>`);
    }));
    $('tex').innerHTML = out.join('') || '<small class="hint">Sem texturas.</small>';
  }
  function stats(root) {
    let tri = 0, meshes = 0, geo = 0; const tex = new Set(), mats = new Set();
    root.traverse(o => {
      if (!o.isMesh) return; meshes++; mats.add(original.get(o) || o.material);
      const g = o.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3;
      for (const a of Object.values(g.attributes)) geo += a.array.byteLength; if (g.index) geo += g.index.array.byteLength;
      const m = original.get(o) || o.material; ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach(k => m[k] && tex.add(m[k]));
    });
    let tmem = 0; tex.forEach(t => t.image && (tmem += t.image.width * t.image.height * 4 * 4 / 3));  // RGBA8 + mipmaps
    return {tri: Math.round(tri), meshes, mats: mats.size, geo, tmem, tex: tex.size};
  }
  function metrics() {
    if (!model) return;
    const s = stats(model), r = renderer.info.render;
    $('metrics').innerHTML = [['Triângulos (modelo)', s.tri.toLocaleString('pt-BR')], ['Triângulos desenhados', r.triangles.toLocaleString('pt-BR')],
      ['Draw calls', r.calls], ['Malhas / materiais', `${s.meshes} / ${s.mats}`], ['Texturas', s.tex],
      ['Memória de geometria', (s.geo / 1048576).toFixed(2) + ' MB'], ['Memória de textura (GPU, est.)', (s.tmem / 1048576).toFixed(1) + ' MB'],
      ['Arquivo GLB', (info.bytes / 1048576).toFixed(2) + ' MB']].map(([k, v]) => `<tr><td>${k}</td><td class="n">${v}</td></tr>`).join('');
  }
  async function compareLods() {
    const rows = [];
    for (const [k, l] of LODS) {
      try {
        const buf = await (await fetch(BASE + (k.startsWith('../') ? `${k}.glb` : `guardian-tides-${k}.glb`), {cache: 'no-store'})).arrayBuffer();
        if (new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'glTF') throw new Error('ausente');
        const g = await new Promise((ok, ko) => loader.parse(buf, '', ok, ko));
        const s = stats(g.scene); rows.push(`<tr><td>${l}</td><td class="n">${s.tri.toLocaleString('pt-BR')}</td><td class="n">${s.meshes}</td><td class="n">${(buf.byteLength / 1048576).toFixed(1)} MB</td></tr>`);
        dispose(g.scene);
      } catch { rows.push(`<tr><td>${l}</td><td colspan="3">não gerado</td></tr>`); }
    }
    $('lods').innerHTML = `<tr><th>LOD</th><th>Tri</th><th>Malhas</th><th>GLB</th></tr>${rows.join('')}`;
  }
  function shot() {
    renderer.render(scene, cam);
    const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png');
    a.download = `${(info.label || 'escultura').replace(/\.glb$/, '')}-${Date.now()}.png`; a.click();
  }
  function dispose(o) { o.traverse(x => { if (!x.isMesh) return; x.geometry.dispose(); [].concat(original.get(x) || x.material).forEach(m => { Object.values(m).forEach(v => v?.isTexture && v.dispose()); m.dispose(); }); }); }

  const onClick = e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    if (b.dataset.view) return view(b.dataset.view);
    const act = b.dataset.ssAct;
    if (act === 'spin') { spin = !spin; b.setAttribute('aria-pressed', spin); }
    if (act === 'ortho') { cam = cam === ortho ? persp : ortho; b.setAttribute('aria-pressed', cam === ortho); resize(); }
    if (act === 'wire') { wire = !wire; b.setAttribute('aria-pressed', wire); applyMode(); }
    if (act === 'shot') shot();
  };
  const onInput = async e => {
    const k = e.target.dataset.ss; if (!k || !root.contains(e.target)) return;
    if (e.type === 'input' && (k === 'lod' || k === 'file' || k === 'mode' || k === 'ab')) return;   // selects disparam input e change
    if (k === 'lod') { const v = e.target.value, f = v.startsWith('../') ? `${v}.glb` : `guardian-tides-${v}.glb`; load(BASE + f, f.split('/').pop()); }
    if (k === 'file' && e.target.files[0]) { const f = e.target.files[0]; load(null, f.name, await f.arrayBuffer()); }
    if (k === 'mode') { mode = e.target.value; applyMode(); }
    if (k === 'scale' || k === 'pivot') applyScale();
    if (k === 'ab' || k === 'abop') { const img = $('abimg'); img.hidden = !$('ab').value; if ($('ab').value) img.src = $('ab').value; img.style.opacity = $('abop').value; }
  };
  root.addEventListener('click', onClick); root.addEventListener('change', onInput); root.addEventListener('input', onInput);
  frame();
  const api = {load, compareLods, view, stats: () => model && stats(model), renderer,
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); root.removeEventListener('click', onClick); root.removeEventListener('change', onInput); root.removeEventListener('input', onInput); if (model) dispose(model); renderer.dispose(); controls.dispose(); }};
  window.__sculptureStudio = api;   // usado pelos testes (tools/test-sculpture-studio.py)
  return api;
}
addEventListener('hashchange', () => { if (location.hash !== '#arenas/escultura') { st?.dispose(); st = null; } });
