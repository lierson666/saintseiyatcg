// ARENA FORGE · Texture Library + Material Studio (autor, 07/11/2026). Parte do Arena Forge do STAR HILL (editor canônico).
// Busca real no Poly Haven e no ambientCG pelo servidor local (card-forge/material_studio.py), instalação com progresso,
// prévia PBR com os mapas verdadeiros e aplicação direta nos objetos do Palácio de Poseidon (estudo em arena-forge/poseidon-palace.js,
// usado só para leitura; o original fica intacto e a versão com materiais é o projeto "poseidon-palace-pbr-v1").
// Editor local: usa o Three.js completo (star-hill/vendor). A partida continua com o Three.js enxuto e não baixa nada durante o duelo.
import * as THREE from './vendor/three-0.160.0.module.min.js';
import {OrbitControls} from './vendor/OrbitControls-0.160.0.js';
import {RGBELoader} from './vendor/RGBELoader-0.160.0.js';
import {PAINTERLY_PRESETS, PAINTERLY_PARAMS, applyPainterly, readPainterly} from '../shared/painterly.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const FILTERS = [['marble', 'Marble'], ['stone', 'Stone'], ['rock', 'Rock'], ['metal', 'Metal'], ['gold', 'Gold'], ['concrete', 'Concrete'], ['wood', 'Wood'],
  ['ground', 'Ground'], ['tiles', 'Tiles'], ['sand', 'Sand'], ['fabric', 'Fabric'], ['ancient', 'Ancient'], ['ruins', 'Ruins'], ['organic', 'Organic'], ['fantasy', 'Fantasy-compatible']];
const FACTIONS = ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis'];
const PROFILE_RES = {mobile: '1k', low: '1k', medium: '2k', high: '2k', ultra: '4k'};
export const PROJECT = 'poseidon-palace-pbr-v1';
// Peças do palácio pelo material original (cor do arena-forge/poseidon-palace.js). Água e brilho são efeitos: ficam bloqueados.
export const SLOTS = {dfe5e8: 'Paredes', f3f3ef: 'Colunas', b7c7d2: 'Escadaria e terraços', bd9c4e: 'Tridente e frisos de ouro', '172e46': 'Recessos escuros',
  '4f7080': 'Rochas submarinas', '839ca1': 'Rochas claras'};
const DEFAULT_PARAMS = {tint: '#ffffff', roughness: 1, metalness: 1, normal: 1, ao: 1, height: .02, emissive: '#000000', emissiveIntensity: 0, opacity: 1,
  repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0, rotation: 0, doubleSide: false, envIntensity: 1};

let ctx, lib, host, tab = 'library';
const ui = {fontes: {polyhaven: true, ambientcg: true}, tipo: 'material', q: '', filtro: '', offset: 0, results: null, busy: false, sel: null, res: '2k', job: null,
  geometry: 'sphere', view: 'lit', bg: 'dark', autorotate: true, light: 1.6, hdri: '', profile: 'high', params: {...DEFAULT_PARAMS}};
const store = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
let history = store('af.mat.history', []), favorites = new Set(store('af.mat.fav', []));

// ---------------- Texturas e materiais (cache compartilhado, nada criado por quadro) ----------------
const loader = new THREE.TextureLoader(), cache = new Map(), matCache = new Map();
const COLOR_MAPS = new Set(['color', 'emissive']);
export function textureFor(url, sem) {
  let e = cache.get(url);
  if (!e) {
    const tex = loader.load(url);
    tex.colorSpace = COLOR_MAPS.has(sem) ? THREE.SRGBColorSpace : THREE.NoColorSpace; // cor em sRGB; normal, rugosidade, AO, ARM e altura são dados lineares
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    e = {tex, refs: 0, t0: performance.now()};
    cache.set(url, e);
  }
  e.refs++;
  return e.tex;
}
function release(url) { const e = cache.get(url); if (e && --e.refs <= 0) { e.tex.dispose(); cache.delete(url); } }

// Material PBR a partir dos mapas instalados. Mapa ausente: usa o valor padrão do material, sem fabricar arquivo.
// ARM/ORM: R = oclusão, G = rugosidade, B = metal, igual à convenção do MeshStandardMaterial. Normal no padrão OpenGL (nor_gl / NormalGL).
export function buildMaterial(entry, params = {}, {subdivided = false} = {}) {
  const p = {...DEFAULT_PARAMS, ...params}, key = `${entry.id}|${JSON.stringify(p)}|${subdivided}`;
  if (matCache.has(key)) return matCache.get(key);
  const f = entry.arquivos, urls = [];
  const tex = sem => { if (!f[sem]) return null; urls.push(f[sem].caminho); const t = textureFor(f[sem].caminho, sem).clone(); t.repeat.set(p.repeatX, p.repeatY); t.offset.set(p.offsetX, p.offsetY); t.rotation = p.rotation * Math.PI / 180; t.center.set(.5, .5); return t; };
  const arm = tex('arm');
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(p.tint), map: tex('color'), normalMap: tex('normal'), normalScale: new THREE.Vector2(p.normal, p.normal),
    roughnessMap: arm || tex('roughness'), metalnessMap: arm || tex('metalness'), aoMap: arm || tex('ao'), aoMapIntensity: p.ao,
    roughness: f.roughness || arm ? p.roughness : Math.min(1, .8 * p.roughness), metalness: f.metalness || arm ? p.metalness : 0,
    emissive: new THREE.Color(p.emissive), emissiveIntensity: p.emissiveIntensity, emissiveMap: tex('emissive'),
    alphaMap: tex('opacity'), transparent: p.opacity < 1 || !!f.opacity, opacity: p.opacity, side: p.doubleSide ? THREE.DoubleSide : THREE.FrontSide, envMapIntensity: p.envIntensity,
  });
  if (f.height) { const h = tex('height'); if (subdivided) { m.displacementMap = h; m.displacementScale = p.height; } else { m.bumpMap = h; m.bumpScale = p.height * 20; } } // deslocamento só em malha subdividida
  m.userData = {material: entry.id, urls};
  matCache.set(key, m);
  return m;
}
function texStats() {
  let bytes = 0, n = 0;
  for (const {tex} of cache.values()) { const i = tex.image; if (i?.width) { bytes += i.width * i.height * 4 * 1.33; n++; } }
  return {n, mb: +(bytes / 1048576).toFixed(1)};
}

// ---------------- Página ----------------
const css = `
.ms-tabs { display: flex; gap: 6px; margin-bottom: 12px; } .ms-tabs a { padding: 6px 12px; border-radius: 99px; border: 1px solid #ffffff2a; color: inherit; text-decoration: none; }
.ms-tabs a[aria-current="page"] { border-color: currentColor; background: #ffffff12; }
.ms { display: grid; grid-template-columns: 240px minmax(0, 1fr) 360px; gap: 14px; align-items: start; }
.ms-col { display: grid; gap: 10px; max-height: 82vh; overflow: auto; }
.ms-col fieldset { border: 1px solid #ffffff22; border-radius: 10px; padding: 8px 10px; display: grid; gap: 6px; }
.ms-col legend { font-weight: 600; padding: 0 4px; }
.ms-chips { display: flex; flex-wrap: wrap; gap: 4px; } .ms-chips button { font-size: 12px; padding: 3px 8px; border-radius: 99px; }
.ms-chips button[aria-pressed="true"] { outline: 2px solid currentColor; }
.ms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.ms-card { display: grid; gap: 4px; text-align: left; padding: 6px; border-radius: 10px; border: 1px solid #ffffff1c; background: #0b0d1a; color: inherit; cursor: pointer; }
.ms-card[aria-current="true"] { border-color: #e3c27a; } .ms-card img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; background: #1a1d2c; }
.ms-card small { opacity: .75; } .ms-badge { font-size: 11px; padding: 1px 6px; border-radius: 99px; border: 1px solid #6fd38f; color: #9ff0b8; justify-self: start; }
.ms-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; font-size: 13px; }
.ms-row input[type=range] { width: 120px; }
.ms-prev { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: #05060f; }
.ms-prev canvas, .ms-stage canvas { display: block; width: 100%; height: 100%; }
.ms-bar { height: 8px; border-radius: 99px; background: #ffffff1a; overflow: hidden; } .ms-bar i { display: block; height: 100%; background: #e3c27a; }
.ms-pager { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
.ms-err { color: #ff9a8a; font-size: 13px; }
.ms-inst { display: grid; grid-template-columns: 34px 1fr; gap: 6px; align-items: center; font-size: 12px; padding: 3px; border-radius: 6px; cursor: grab; }
.ms-inst img { width: 34px; height: 34px; object-fit: cover; border-radius: 4px; } .ms-inst[aria-current="true"] { outline: 1px solid #e3c27a; }
.ms-stage { position: relative; height: 70vh; border-radius: 12px; overflow: hidden; background: #02060d; }
.ms-hud { position: absolute; left: 8px; bottom: 8px; font: 12px/1.3 ui-monospace, monospace; background: #000a; padding: 4px 8px; border-radius: 6px; pointer-events: none; }
@media (max-width: 1200px) { .ms { grid-template-columns: 1fr; } .ms-col { max-height: none; } }`;

const thumbOf = m => (m.arquivos.color ? m.arquivos.color.caminho : '');
// Abas do Arena Forge (também usadas pela Produção de arena).
export function arenaNav() {
  if (!document.querySelector('#ms-style')) document.head.append(Object.assign(document.createElement('style'), {id: 'ms-style', textContent: css}));
  return tabs();
}
function tabs() {
  return `<nav class="ms-tabs" aria-label="Arena Forge">${[['#arenas', 'Arenas'], ['#arenas/materiais', 'Texture Library'], ['#arenas/estudio', 'Material Studio · Palácio de Poseidon'], ['#arenas/producao', 'Produção · Artboard'], ['#arenas/escultura', 'Sculpture Studio']]
    .map(([h, l]) => `<a href="${h}" ${location.hash === h ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
}

function installedList(drag = false) {
  return lib.materiais.filter(m => m.tipo !== 'hdri').map(m => `<div class="ms-inst" ${drag ? 'draggable="true"' : ''} data-mat="${esc(m.id)}" aria-current="${ui.sel?.lib === m.id}" title="${esc(m.nome)} · ${esc(m.fonte)} · ${m.resolucao}">
    <img src="${esc(thumbOf(m))}" alt="" loading="lazy"><span><b>${esc(m.nome)}</b><br><small>${esc(m.fonte)} · ${m.resolucao} · ${(m.tamanho / 1048576).toFixed(1)} MB</small></span></div>`).join('') || '<p class="hint">Nada instalado ainda.</p>';
}

function left() {
  return `<fieldset><legend>Provedores</legend>
      <label class="ms-row"><span>Poly Haven <small>(CC0, API oficial)</small></span><input type="checkbox" data-ms-src="polyhaven" ${ui.fontes.polyhaven ? 'checked' : ''}></label>
      <label class="ms-row"><span>ambientCG <small>(CC0, API v3)</small></span><input type="checkbox" data-ms-src="ambientcg" ${ui.fontes.ambientcg ? 'checked' : ''}></label>
      <label class="ms-row"><span>Tipo</span><select data-ms-tipo><option value="material" ${ui.tipo === 'material' ? 'selected' : ''}>Materiais PBR</option><option value="hdri" ${ui.tipo === 'hdri' ? 'selected' : ''}>HDRIs (Poly Haven)</option></select></label>
      <p class="hint">cgbookcase, TextureCan e 3DTextures.me: importação manual (sem API autorizada para download automático).</p>
    </fieldset>
    <fieldset><legend>Busca (PT ou EN)</legend><input type="search" data-ms-q value="${esc(ui.q)}" placeholder="mármore branco, gold, basalt…">
      <div class="ms-chips">${FILTERS.map(([k, l]) => `<button class="secondary" data-ms-filter="${k}" aria-pressed="${ui.filtro === k}">${l}</button>`).join('')}</div>
      <button class="primary" data-ms="search">Buscar</button></fieldset>
    <fieldset><legend>Histórico</legend><div class="ms-chips">${history.map(h => `<button class="secondary" data-ms-hist="${esc(h)}">${esc(h)}</button>`).join('') || '<small class="hint">Vazio.</small>'}</div></fieldset>
    <fieldset><legend>Favoritos</legend><div class="ms-chips">${[...favorites].map(f => `<button class="secondary" data-ms-fav="${esc(f)}">★ ${esc(f.split(':')[1])}</button>`).join('') || '<small class="hint">Marque com ★ no inspetor.</small>'}</div></fieldset>
    <fieldset><legend>Instalados (${lib.materiais.length})</legend>${installedList()}<button class="secondary" data-ms="import">Importar manualmente…</button></fieldset>`;
}

function center() {
  const r = ui.results;
  if (ui.busy) return '<p class="hint">Buscando nas APIs…</p>';
  if (!r) return '<p class="hint">Busque um material (ex.: "mármore", "gold", "basalt") ou escolha um filtro.</p>';
  const max = Math.max(0, ...Object.values(r.totais || {}));
  return `${Object.values(r.erros || {}).map(e => `<p class="ms-err">${esc(e)}</p>`).join('')}
    <p class="hint">Termos: ${esc(r.termos.join(', ') || 'todos')} · ${Object.entries(r.totais).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
    <div class="ms-grid">${r.resultados.map(x => {
      const key = `${x.fonte}:${x.id}`;
      return `<button class="ms-card" data-ms-pick="${esc(key)}" aria-current="${ui.sel?.key === key}">${x.thumb ? `<img src="${esc(x.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<img alt="">'}
        <b>${esc(x.nome)}</b><small>${esc(x.fonte)} · ${x.tipo} · ${esc(x.resolucoes.join('/').toUpperCase())}</small>${x.instalado ? '<span class="ms-badge">instalado</span>' : ''}</button>`;
    }).join('') || '<p class="hint">Nenhum resultado nas fontes escolhidas.</p>'}</div>
    <div class="ms-pager"><button class="secondary" data-ms="prev" ${ui.offset ? '' : 'disabled'}>Anterior</button><span>${ui.offset + 1}–${ui.offset + r.limit}</span>
      <button class="secondary" data-ms="next" ${ui.offset + r.limit < max ? '' : 'disabled'}>Próxima</button></div>`;
}

const range = (k, label, min, max, step) => `<label class="ms-row"><span>${label}</span><span><input type="range" data-ms-p="${k}" min="${min}" max="${max}" step="${step}" value="${ui.params[k]}"> <output>${ui.params[k]}</output></span></label>`;
function right() {
  const s = ui.sel;
  if (!s) return '<p class="hint">Escolha um material na grade ou nos instalados.</p>';
  const m = s.lib && lib.materiais.find(x => x.id === s.lib), r = s.result, job = ui.job;
  const head = `<fieldset><legend>${esc(m?.nome || r?.nome)}</legend>
      <div class="ms-row"><span>${esc(m?.fonte || r?.fonte)} · <a href="${esc(m?.url_origem || r?.pagina)}" target="_blank" rel="noopener">página</a></span><button class="secondary" data-ms="fav">${favorites.has(s.key) ? '★' : '☆'}</button></div>
      <small>Licença: <a href="${esc(m?.licenca?.url || '')}" target="_blank" rel="noopener">${esc(m?.licenca?.tipo || r?.licenca)}</a>${m?.licenca?.atribuicao ? ` · ${esc(m.licenca.atribuicao)}` : ''}</small>
      ${m ? `<small>Mapas: ${m.mapas.join(', ')} · ${m.resolucao} · ${(m.tamanho / 1048576).toFixed(1)} MB${Object.values(m.arquivos)[0]?.largura ? ` · ${Object.values(m.arquivos)[0].largura}px` : ''}</small>` : `<small>${esc((r?.tags || []).join(', '))}</small>`}
      ${r ? `<label class="ms-row"><span>Resolução</span><select data-ms-res>${r.resolucoes.map(x => `<option value="${x}" ${x === ui.res ? 'selected' : ''}>${x.toUpperCase()}</option>`).join('')}</select></label>
      ${job && job.estado === 'baixando' ? `<div class="ms-bar"><i style="width:${job.total ? Math.min(100, job.bytes / job.total * 100) : 5}%"></i></div><small>${(job.bytes / 1048576).toFixed(1)} de ${(job.total / 1048576).toFixed(1)} MB</small><button class="secondary" data-ms="cancel">Cancelar</button>`
        : `<button class="primary" data-ms="install">${installedRes(r).includes(ui.res) ? 'Reinstalar' : 'Baixar e instalar'} ${ui.res.toUpperCase()}</button>`}
      ${job?.estado === 'erro' ? `<p class="ms-err">${esc(job.erro)}</p><button class="secondary" data-ms="install">Tentar de novo</button>` : ''}${job?.estado === 'cancelado' ? '<p class="hint">Download cancelado. Nada foi instalado.</p>' : ''}` : ''}
      ${m ? `<button class="secondary" data-ms="remove">Remover da biblioteca</button>` : ''}
    </fieldset>`;
  if (!m || m.tipo === 'hdri') return head + (m?.tipo === 'hdri' ? '<p class="hint">HDRI instalado: escolha-o na iluminação da prévia de um material.</p>' : '');
  const hdris = lib.materiais.filter(x => x.tipo === 'hdri');
  return `${head}
    <div class="ms-prev" id="ms-prev"></div><small class="hint" id="ms-stats"></small>
    <fieldset><legend>Prévia</legend>
      <div class="ms-chips">${[['sphere', 'Esfera'], ['cube', 'Cubo'], ['plane', 'Plano'], ['column', 'Coluna'], ['floor', 'Piso']].map(([k, l]) => `<button class="secondary" data-ms-geo="${k}" aria-pressed="${ui.geometry === k}">${l}</button>`).join('')}</div>
      <div class="ms-chips">${[['lit', 'Material'], ['normal', 'Normal'], ['roughness', 'Rugosidade'], ['metalness', 'Metal']].map(([k, l]) => `<button class="secondary" data-ms-view="${k}" aria-pressed="${ui.view === k}">${l}</button>`).join('')}</div>
      <label class="ms-row"><span>Girar sozinho</span><input type="checkbox" data-ms-auto ${ui.autorotate ? 'checked' : ''}></label>
      <label class="ms-row"><span>Fundo claro</span><input type="checkbox" data-ms-bg ${ui.bg === 'light' ? 'checked' : ''}></label>
      <label class="ms-row"><span>Luz</span><input type="range" data-ms-light min="0" max="4" step=".1" value="${ui.light}"></label>
      <label class="ms-row"><span>HDRI</span><select data-ms-hdri><option value="">Estúdio neutro (sem arquivo)</option>${hdris.map(h => `<option value="${esc(h.id)}" ${ui.hdri === h.id ? 'selected' : ''}>${esc(h.nome)}</option>`).join('')}</select></label>
    </fieldset>
    <fieldset><legend>Material Inspector</legend>
      <label class="ms-row"><span>Cor base (tinta)</span><input type="color" data-ms-p="tint" value="${ui.params.tint}"></label>
      ${range('roughness', 'Roughness', 0, 2, .05)}${range('metalness', 'Metalness', 0, 1, .05)}${range('normal', 'Normal strength', 0, 3, .05)}${range('ao', 'AO intensity', 0, 2, .05)}
      ${range('height', 'Bump / displacement', 0, .2, .005)}
      <label class="ms-row"><span>Emissive</span><input type="color" data-ms-p="emissive" value="${ui.params.emissive}"></label>${range('emissiveIntensity', 'Emissive intensity', 0, 3, .05)}
      ${range('opacity', 'Opacity', 0, 1, .05)}${range('repeatX', 'Repeat X', .25, 16, .25)}${range('repeatY', 'Repeat Y', .25, 16, .25)}
      ${range('offsetX', 'Offset X', 0, 1, .01)}${range('offsetY', 'Offset Y', 0, 1, .01)}${range('rotation', 'UV rotation (°)', 0, 360, 1)}${range('envIntensity', 'Environment', 0, 3, .05)}
      <label class="ms-row"><span>Double sided</span><input type="checkbox" data-ms-p="doubleSide" ${ui.params.doubleSide ? 'checked' : ''}></label>
      <div class="ms-row"><select data-ms-faction>${FACTIONS.map(f => `<option>${f}</option>`).join('')}</select><button class="primary" data-ms="preset">Salvar preset</button></div>
    </fieldset>`;
}
const installedRes = r => lib.materiais.filter(m => m.fonte === r.fonte && m.provider_id === r.id).map(m => m.resolucao);

// ---------------- Prévia 3D ----------------
let prev = null;
function geometryFor(k) {
  return {sphere: () => new THREE.SphereGeometry(1, 128, 64), cube: () => new THREE.BoxGeometry(1.4, 1.4, 1.4, 64, 64, 64), plane: () => new THREE.PlaneGeometry(2.4, 2.4, 256, 256),
    column: () => new THREE.CylinderGeometry(.45, .55, 2.6, 64, 64), floor: () => new THREE.PlaneGeometry(4, 4, 256, 256)}[k]();
}
function debugMaterial(m, view) {
  if (view === 'normal') return new THREE.MeshNormalMaterial({normalMap: m.normalMap, normalScale: m.normalScale});
  const map = view === 'roughness' ? m.roughnessMap : m.metalnessMap, ch = view === 'roughness' ? 'g' : 'b';
  if (!map) return new THREE.MeshBasicMaterial({color: new THREE.Color().setScalar(view === 'roughness' ? m.roughness : m.metalness)});
  map.updateMatrix();
  const isPacked = map === m.aoMap; // ARM: rugosidade no G, metal no B; mapa separado: canal R
  return new THREE.ShaderMaterial({uniforms: {t: {value: map}, uvT: {value: map.matrix}},
    vertexShader: 'uniform mat3 uvT; varying vec2 v; void main(){ v = (uvT * vec3(uv, 1.)).xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform sampler2D t; varying vec2 v; void main(){ float x = texture2D(t, v).${isPacked ? ch : 'r'}; gl_FragColor = vec4(vec3(x), 1.); }`});
}
function mountPreview() {
  prev?.dispose(); prev = null;
  const el = document.querySelector('#ms-prev'), m = ui.sel?.lib && lib.materiais.find(x => x.id === ui.sel.lib);
  if (!el || !m) return;
  const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  el.append(renderer.domElement);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, .05, 100);
  cam.position.set(0, .6, 3.6);
  const controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true; controls.minDistance = 1.2; controls.maxDistance = 8;
  const key = new THREE.DirectionalLight(0xffffff, ui.light); key.position.set(3, 4, 2); scene.add(key, new THREE.AmbientLight(0xffffff, .15));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = () => { // ambiente neutro gerado no código: duas luzes de área em uma sala cinza
    const s = new THREE.Scene(); s.background = new THREE.Color(0x6b6f78);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshBasicMaterial({color: 0xffffff})); l.position.set(0, 3, 2); l.lookAt(0, 0, 0); s.add(l);
    const r = l.clone(); r.position.set(-3, 1, -2); r.lookAt(0, 0, 0); s.add(r);
    return pmrem.fromScene(s, .04).texture;
  };
  let envTex = studio();
  const hdri = ui.hdri && lib.materiais.find(x => x.id === ui.hdri);
  if (hdri) new RGBELoader().load(hdri.arquivos.hdri.caminho, t => { t.mapping = THREE.EquirectangularReflectionMapping; envTex = pmrem.fromEquirectangular(t).texture; scene.environment = envTex; t.dispose(); });
  scene.environment = envTex;
  scene.background = new THREE.Color(ui.bg === 'light' ? 0xd9dce3 : 0x05060f);
  const geo = geometryFor(ui.geometry), flat = ui.geometry === 'plane' || ui.geometry === 'floor';
  const mat = buildMaterial(m, ui.params, {subdivided: true}), shown = ui.view === 'lit' ? mat : debugMaterial(mat, ui.view);
  const mesh = new THREE.Mesh(geo, shown);
  if (flat) mesh.rotation.x = ui.geometry === 'floor' ? -Math.PI / 2.4 : 0;
  scene.add(mesh);
  const t0 = performance.now();
  let frames = 0, fpsT = t0, fps = 0, live = true;
  const size = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(size); ro.observe(el); size();
  const loop = now => {
    if (!live) return;
    requestAnimationFrame(loop);
    if (document.hidden) return;
    if (ui.autorotate && !flat) mesh.rotation.y += .004;
    controls.update(); renderer.render(scene, cam); frames++;
    if (now - fpsT > 1000) {
      fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now;
      const st = texStats(), out = document.querySelector('#ms-stats');
      if (out) out.textContent = `${fps} fps · ${renderer.info.render.calls} draw call · ${st.n} texturas · ~${st.mb} MB de GPU · carregado em ${Math.round(performance.now() - t0)} ms`;
    }
  };
  requestAnimationFrame(loop);
  prev = {renderer, mesh, mat, dispose() { live = false; ro.disconnect(); controls.dispose(); geo.dispose(); if (shown !== mat) shown.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); }};
}

function paint() {
  if (tab === 'studio') return studioPaint();
  host.innerHTML = `${tabs()}<section class="ms" aria-label="Texture Library"><aside class="ms-col panel">${left()}</aside><div id="ms-center">${center()}</div><aside class="ms-col panel" id="ms-right">${right()}</aside></section>`;
  mountPreview();
}
const paintCenter = () => { const c = document.querySelector('#ms-center'); if (c) c.innerHTML = center(); };
const paintRight = () => { const r = document.querySelector('#ms-right'); if (r) { r.innerHTML = right(); mountPreview(); } };

async function search() {
  const fontes = Object.keys(ui.fontes).filter(k => ui.fontes[k]);
  if (!fontes.length) return ctx.notice('Escolha pelo menos um provedor.');
  if (ui.q.trim()) { history = [ui.q.trim(), ...history.filter(h => h !== ui.q.trim())].slice(0, 8); keep('af.mat.history', history); }
  ui.busy = true; paintCenter();
  try {
    const q = new URLSearchParams({q: ui.q, filtro: ui.filtro, offset: ui.offset, limit: 24, tipo: ui.tipo, fonte: fontes.length === 2 ? 'todas' : fontes[0]});
    ui.results = await ctx.api(`materiais/busca?${q}`);
  } catch (e) { ui.results = {resultados: [], totais: {}, erros: {rede: e.message}, termos: [], limit: 24}; }
  ui.busy = false; paint();
}

async function install() {
  const r = ui.sel.result;
  if (ui.res === '8k' && !confirm('8K pesa centenas de MB. Baixar mesmo assim?')) return;
  try {
    let job = await ctx.api('materiais/instalar', {fonte: r.fonte, id: r.id, resolucao: ui.res, tipo: r.tipo, nome: r.nome, tags: r.tags, confirmar_8k: ui.res === '8k'});
    ui.job = job; paintRight();
    while (job.estado === 'baixando') { await new Promise(s => setTimeout(s, 400)); job = await ctx.api(`materiais/trabalhos/${job.id}`); ui.job = job; paintRight(); }
    if (job.estado === 'pronto') {
      lib = await ctx.api('materiais');
      ui.sel.lib = job.material.id; ui.job = null; r.instalado = true;
      ctx.notice(job.cache ? 'Já estava instalado e íntegro: reaproveitado do cache.' : `${job.material.nome} instalado (${job.material.mapas.join(', ')}).`, true);
      paint();
    }
  } catch (e) { ui.job = {estado: 'erro', erro: e.message}; paintRight(); }
}

// ---------------- Material Studio: Palácio de Poseidon ----------------
let st = null; // {renderer, scene, cam, controls, meshes, slotsOf, originals, project, undo, redo, selected, palace}
const proj = () => (lib.projetos[PROJECT] ||= {nome: 'POSEIDON PALACE — PBR V1', base: 'arena-forge/poseidon-palace.js (poseidon-palace-canonical-v1)', slots: {}, objetos: {}});
function studioPaint() {
  host.innerHTML = `${tabs()}<section class="ms" aria-label="Material Studio">
    <aside class="ms-col panel"><fieldset><legend>Materiais instalados</legend><small class="hint">Arraste para um objeto da cena ou escolha e clique em Aplicar.</small>${installedList(true)}</fieldset>
      <fieldset><legend>Presets por facção</legend>${FACTIONS.map(f => `<details><summary>${f}</summary>${(lib.presets[f] || []).map(p => `<div class="ms-row"><span>${esc(p.nome)}</span>${p.material ? `<button class="secondary" data-ms-usepreset="${esc(p.material)}">usar</button>` : `<small class="ms-err" title="${esc(p.pendencia || '')}">pendente</small>`}</div>`).join('') || '<small class="hint">Vazio.</small>'}</details>`).join('')}</fieldset></aside>
    <div><div class="ms-stage" id="ms-stage"><div class="ms-hud" id="ms-hud">Carregando o palácio…</div></div>
      <div class="ms-pager"><label>Perfil <select data-ms-profile>${Object.keys(PROFILE_RES).map(k => `<option ${k === ui.profile ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <button class="secondary" data-ms="undo">Desfazer</button><button class="secondary" data-ms="redo">Refazer</button>
        <button class="secondary" data-ms="original">Ver original</button><button class="primary" data-ms="save-project">Salvar projeto</button>
        <button class="secondary" data-ms="export">Exportar</button><label class="secondary">Reimportar <input type="file" accept="application/json" data-ms-import hidden></label></div></div>
    <aside class="ms-col panel" id="ms-sel"></aside></section>`;
  mountStudio();
}
function selPanel() {
  const el = document.querySelector('#ms-sel');
  if (!el || !st) return;
  const sel = [...st.selected], slots = [...new Set(sel.map(m => st.slotOf.get(m)))];
  const p = proj();
  el.innerHTML = `<fieldset><legend>Seleção (${sel.length})</legend>${sel.length ? `<small>${esc(slots.join(', '))}</small>` : '<small class="hint">Clique num objeto do palácio (Shift soma). O piso do campo e a água são bloqueados.</small>'}
      <label class="ms-row"><span>Material</span><select data-ms-applymat>${lib.materiais.filter(m => m.tipo !== 'hdri').map(m => `<option value="${esc(m.id)}" ${ui.sel?.lib === m.id ? 'selected' : ''}>${esc(m.nome)} (${m.resolucao})</option>`).join('')}</select></label>
      <div class="ms-chips"><button class="primary" data-ms-apply="object" ${sel.length ? '' : 'disabled'}>Aplicar na seleção</button><button class="secondary" data-ms-apply="slot" ${sel.length ? '' : 'disabled'}>Em todos do mesmo tipo</button>
        <button class="secondary" data-ms-apply="revert" ${sel.length ? '' : 'disabled'}>Reverter</button><button class="secondary" data-ms="select-same" ${sel.length ? '' : 'disabled'}>Selecionar mesmo tipo</button></div>
      ${range('repeatX', 'Repeat X', .25, 16, .25)}${range('repeatY', 'Repeat Y', .25, 16, .25)}${range('normal', 'Normal strength', 0, 3, .05)}${range('roughness', 'Roughness', 0, 2, .05)}${range('metalness', 'Metalness', 0, 1, .05)}
    </fieldset>
    <fieldset><legend>Projeto ${esc(p.nome)}</legend>${Object.entries(p.slots).map(([s, a]) => `<div class="ms-row"><span>${esc(s)}</span><small>${esc(lib.materiais.find(m => m.id === a.material)?.nome || `ausente: ${a.material}`)}</small></div>`).join('') || '<small class="hint">Sem materiais aplicados (visual original).</small>'}
      <small class="hint">${Object.keys(p.objetos).length} objeto(s) com material próprio. O original (arena-forge/poseidon-palace.js) não é alterado.</small></fieldset>
    ${paintPanel()}`;
}
// Painterly Material Inspector: mexe nos uniformes compartilhados do palácio (todos os materiais pintados de uma vez).
function paintPanel() {
  const u = st.palace.paint; if (!u) return '';
  const v = readPainterly(u), pp = proj().painterly || {};
  return `<fieldset><legend>Painterly Material Inspector</legend>
    <label class="ms-row"><span>Estilo pintado</span><input type="checkbox" data-ms-paint="on" ${u.uPaintOn.value > .5 ? 'checked' : ''}></label>
    <label class="ms-row"><span>Preset</span><select data-ms-paint="preset">${Object.entries(PAINTERLY_PRESETS).map(([k, x]) => `<option value="${k}" ${k === (pp.preset || 'poseidon') ? 'selected' : ''}>${x.nome}</option>`).join('')}</select></label>
    ${PAINTERLY_PARAMS.map(([k, l, min, max, step]) => `<label class="ms-row"><span>${l}</span><span><input type="range" data-ms-paint="${k}" min="${min}" max="${max}" step="${step}" value="${v[k]}"> <output>${v[k]}</output></span></label>`).join('')}
    ${['shadow', 'high', 'rim'].map(k => `<label class="ms-row"><span>${{shadow: 'Cor da sombra', high: 'Cor da luz alta', rim: 'Cor da borda'}[k]}</span><input type="color" data-ms-paint="${k}" value="${v[k]}"></label>`).join('')}
    <small class="hint">Vale para os materiais originais do palácio; materiais PBR aplicados aqui ficam sem o tratamento pintado. Salvo no projeto.</small></fieldset>`;
}
function savePaint() {
  const u = st.palace.paint, pp = proj().painterly ||= {preset: 'poseidon'};
  pp.on = u.uPaintOn.value > .5; pp.params = readPainterly(u);
}
function snapshot() { return JSON.stringify(proj()); }
function pushUndo() { st.undo.push(snapshot()); st.redo = []; if (st.undo.length > 60) st.undo.shift(); }
function applyProject(showOriginal = false) {
  const pp = proj().painterly, pu = st?.palace.paint; // estilo pintado salvo no projeto (também volta no desfazer)
  if (pu) { applyPainterly(pu, {...PAINTERLY_PRESETS[pp?.preset || 'poseidon'], ...(pp?.params || {})}); pu.uPaintOn.value = pp?.on === false ? 0 : 1; }
  const p = proj(), byId = id => lib.materiais.find(m => m.id === id), missing = new Set();
  const pick = id => { // perfil de qualidade: usa a resolução instalada mais próxima do teto do perfil
    const m = byId(id); if (!m) { missing.add(id); return null; }
    const fam = lib.materiais.filter(x => x.fonte === m.fonte && x.provider_id === m.provider_id), cap = parseInt(PROFILE_RES[ui.profile]);
    return fam.filter(x => parseInt(x.resolucao) <= cap).sort((a, b) => parseInt(b.resolucao) - parseInt(a.resolucao))[0] || m;
  };
  st.meshes.forEach((mesh, i) => {
    const own = p.objetos[i], slot = p.slots[st.slotOf.get(mesh)], ap = showOriginal ? null : own || slot;
    const m = ap && pick(ap.material);
    mesh.material = m ? buildMaterial(m, ap.params) : st.originals.get(mesh);
  });
  return [...missing];
}
function mountStudio() {
  st?.dispose?.();
  const el = document.querySelector('#ms-stage');
  import('../arena-forge/poseidon-palace.js').then(({createPoseidonPalace}) => {
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(42, 1, .1, 400);
    cam.position.set(0, 13.5, 13); // mesma câmera da partida; a órbita é só para inspecionar
    const controls = new OrbitControls(cam, renderer.domElement); controls.target.set(0, 4, -30); controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xaaccff, 0x273045, 1.2)); const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(-8, 20, 10); scene.add(sun);
    const pmrem = new THREE.PMREMGenerator(renderer), env = new THREE.Scene(); env.background = new THREE.Color(0x5a7d96);
    scene.environment = pmrem.fromScene(env, .04).texture; scene.background = new THREE.Color(0x07172c); scene.fog = new THREE.Fog(0x07172c, 60, 160);
    // Piso do campo: protegido (não recebe material). Mesmo raio da arena da partida.
    const field = new THREE.Mesh(new THREE.CircleGeometry(16, 96), new THREE.MeshStandardMaterial({color: 0x28334f, roughness: .7, metalness: .28}));
    field.rotation.x = -Math.PI / 2; field.userData.locked = 'Campo de batalha (zona competitiva protegida)'; scene.add(field);
    const palace = createPoseidonPalace(THREE); scene.add(palace.group);
    const meshes = [], slotOf = new Map(), originals = new Map();
    palace.group.traverse(n => {
      if (!n.isMesh || !n.material?.isMeshStandardMaterial || n.geometry.parameters?.width === .001) return;
      const hex = n.material.color.getHexString();
      slotOf.set(n, n.material.name || SLOTS[hex] || `Material #${hex}`); originals.set(n, n.material); meshes.push(n);
    });
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), box = new THREE.Group(); scene.add(box);
    const hit = (x, y) => {
      const r = renderer.domElement.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam);
      const h = ray.intersectObjects([field, ...meshes], false)[0];
      return h?.object;
    };
    const selected = new Set();
    const outline = () => { box.clear(); selected.forEach(m => box.add(new THREE.BoxHelper(m, 0xe3c27a))); selPanel(); };
    let down = null;
    renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return; // arrastar a câmera não seleciona
      const o = hit(e.clientX, e.clientY);
      if (o?.userData.locked) { ctx.notice(`${o.userData.locked}: bloqueado.`); return; }
      if (!e.shiftKey) selected.clear();
      if (o) selected.has(o) && e.shiftKey ? selected.delete(o) : selected.add(o);
      outline();
    });
    renderer.domElement.addEventListener('dragover', e => e.preventDefault());
    renderer.domElement.addEventListener('drop', e => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/material-id'), o = hit(e.clientX, e.clientY);
      if (!id || !o) return;
      if (o.userData.locked) return ctx.notice(`${o.userData.locked}: bloqueado.`);
      selected.clear(); selected.add(o); assign('object', id); outline();
    });
    const size = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    const ro = new ResizeObserver(size); ro.observe(el); size();
    let live = true, frames = 0, t = performance.now();
    const loop = now => {
      if (!live) return; requestAnimationFrame(loop);
      if (document.hidden) return;
      controls.update(); palace.update?.(now / 1000); renderer.render(scene, cam); frames++;
      if (now - t > 1000) { const s = texStats(), hud = document.querySelector('#ms-hud'); if (hud) hud.textContent = `${Math.round(frames * 1000 / (now - t))} fps · ${renderer.info.render.calls} draw calls · ${s.n} texturas · ~${s.mb} MB GPU · perfil ${ui.profile}`; frames = 0; t = now; }
    };
    requestAnimationFrame(loop);
    st = {renderer, scene, cam, meshes, slotOf, originals, selected, undo: [], redo: [], palace, outline,
      dispose() { live = false; ro.disconnect(); controls.dispose(); meshes.forEach(m => { m.material = originals.get(m); }); palace.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); st = null; }};
    const missing = applyProject();
    if (missing.length) ctx.notice(`Materiais ausentes no projeto (usando o original): ${missing.join(', ')}`);
    window.__materialStudio = {st, assign, applyProject, proj, buildMaterial}; // QA
    selPanel();
  }).catch(e => { el.innerHTML = `<p class="hint" style="padding:16px">Não foi possível abrir o estudo do palácio (arena-forge/poseidon-palace.js): ${esc(e.message)}</p>`; });
}
function assign(mode, materialId = document.querySelector('[data-ms-applymat]')?.value) {
  if (!st || !st.selected.size) return;
  pushUndo();
  const p = proj(), params = {repeatX: ui.params.repeatX, repeatY: ui.params.repeatY, normal: ui.params.normal, roughness: ui.params.roughness, metalness: ui.params.metalness};
  for (const mesh of st.selected) {
    const i = st.meshes.indexOf(mesh), slot = st.slotOf.get(mesh);
    if (mode === 'revert') { delete p.objetos[i]; delete p.slots[slot]; continue; }
    if (mode === 'slot') { p.slots[slot] = {material: materialId, params}; Object.keys(p.objetos).forEach(k => { if (st.slotOf.get(st.meshes[k]) === slot) delete p.objetos[k]; }); }
    else p.objetos[i] = {material: materialId, params};
  }
  applyProject(); selPanel();
}

// ---------------- Eventos ----------------
async function onClick(e) {
  const b = e.target.closest('button, .ms-inst');
  if (!b || !b.closest('#material-studio')) return;
  try {
    if (b.dataset.msFilter !== undefined) { ui.filtro = ui.filtro === b.dataset.msFilter ? '' : b.dataset.msFilter; ui.offset = 0; return search(); }
    if (b.dataset.msHist) { ui.q = b.dataset.msHist; ui.offset = 0; return search(); }
    if (b.dataset.msFav) { ui.q = b.dataset.msFav.split(':')[1]; ui.offset = 0; return search(); }
    if (b.dataset.msPick) { const x = ui.results.resultados.find(r => `${r.fonte}:${r.id}` === b.dataset.msPick); const m = lib.materiais.filter(y => y.fonte === x.fonte && y.provider_id === x.id).sort((a, c) => parseInt(c.resolucao) - parseInt(a.resolucao))[0];
      ui.sel = {key: b.dataset.msPick, result: x, lib: m?.id}; ui.res = x.resolucoes.includes('2k') ? '2k' : x.resolucoes[0]; ui.job = null; ui.params = {...DEFAULT_PARAMS};
      document.querySelectorAll('.ms-card').forEach(c => c.setAttribute('aria-current', String(c === b))); return paintRight(); }
    if (b.dataset.mat && tab === 'studio') { const s = document.querySelector('[data-ms-applymat]'); if (s) s.value = b.dataset.mat; return; }
    if (b.dataset.mat && tab === 'library') { const m = lib.materiais.find(x => x.id === b.dataset.mat); ui.sel = {key: `${m.fonte}:${m.provider_id}`, lib: m.id, result: null}; ui.params = {...DEFAULT_PARAMS}; return paint(); }
    if (b.dataset.msGeo) { ui.geometry = b.dataset.msGeo; return paintRight(); }
    if (b.dataset.msView) { ui.view = b.dataset.msView; return paintRight(); }
    if (b.dataset.msApply) return assign(b.dataset.msApply);
    if (b.dataset.msUsepreset) { const s = document.querySelector('[data-ms-applymat]'); if (s) s.value = b.dataset.msUsepreset; return assign('object', b.dataset.msUsepreset); }
    const act = b.dataset.ms;
    if (act === 'search') { ui.offset = 0; return search(); }
    if (act === 'next' || act === 'prev') { ui.offset = Math.max(0, ui.offset + (act === 'next' ? 24 : -24)); return search(); }
    if (act === 'install') return install();
    if (act === 'cancel' && ui.job?.id) { ui.job = await ctx.api('materiais/cancelar', {trabalho: ui.job.id}); return paintRight(); }
    if (act === 'fav') { favorites.has(ui.sel.key) ? favorites.delete(ui.sel.key) : favorites.add(ui.sel.key); keep('af.mat.fav', [...favorites]); return paint(); }
    if (act === 'remove') { if (!confirm('Remover este material e apagar os arquivos baixados?')) return; lib = (await ctx.api('materiais/remover', {id: ui.sel.lib})).biblioteca; ui.sel.lib = null; return paint(); }
    if (act === 'preset') {
      const f = document.querySelector('[data-ms-faction]').value, nome = prompt(`Nome do preset de ${f}:`, lib.materiais.find(m => m.id === ui.sel.lib)?.nome); if (!nome) return;
      (lib.presets[f] ||= []).push({nome, material: ui.sel.lib, params: {...ui.params}});
      lib = (await ctx.api('materiais', {biblioteca: lib})).biblioteca; return ctx.notice(`Preset ${nome} salvo em ${f}.`, true);
    }
    if (act === 'import') return manualImport();
    if (act === 'undo' && st?.undo.length) { st.redo.push(snapshot()); lib.projetos[PROJECT] = JSON.parse(st.undo.pop()); applyProject(); return selPanel(); }
    if (act === 'redo' && st?.redo.length) { st.undo.push(snapshot()); lib.projetos[PROJECT] = JSON.parse(st.redo.pop()); applyProject(); return selPanel(); }
    if (act === 'original' && st) { const on = b.textContent === 'Ver original'; applyProject(on); b.textContent = on ? 'Ver com materiais' : 'Ver original'; return; }
    if (act === 'select-same' && st) { const slots = new Set([...st.selected].map(m => st.slotOf.get(m))); st.meshes.forEach(m => slots.has(st.slotOf.get(m)) && st.selected.add(m)); return st.outline(); }
    if (act === 'save-project') { lib = (await ctx.api('materiais', {biblioteca: lib})).biblioteca; selPanel(); return ctx.notice('Projeto POSEIDON PALACE — PBR V1 salvo em data/material-library.json.', true); }
    if (act === 'export') {
      const blob = new Blob([JSON.stringify({formato: 'sstcg-material-project', versao: 1, projeto: PROJECT, dados: proj(), materiais: [...new Set([...Object.values(proj().slots), ...Object.values(proj().objetos)].map(a => a.material))]}, null, 2)], {type: 'application/json'});
      const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(blob), download: `${PROJECT}.json`}); a.click(); URL.revokeObjectURL(a.href);
    }
  } catch (err) { ctx.notice(err.message); }
}
function onInput(e) {
  const el = e.target;
  if (!el.closest('#material-studio')) return;
  if (el.matches('[data-ms-q]')) { ui.q = el.value; if (e.type === 'change') { ui.offset = 0; search(); } return; }
  if (el.matches('[data-ms-src]')) { ui.fontes[el.dataset.msSrc] = el.checked; return; }
  if (el.matches('[data-ms-tipo]')) { ui.tipo = el.value; ui.offset = 0; return search(); }
  if (el.matches('[data-ms-res]')) { ui.res = el.value; return paintRight(); }
  if (el.matches('[data-ms-auto]')) { ui.autorotate = el.checked; return; }
  if (el.matches('[data-ms-bg]')) { ui.bg = el.checked ? 'light' : 'dark'; return mountPreview(); }
  if (el.matches('[data-ms-light]')) { ui.light = +el.value; return mountPreview(); }
  if (el.matches('[data-ms-hdri]')) { ui.hdri = el.value; return mountPreview(); }
  if (el.matches('[data-ms-profile]')) { ui.profile = el.value; return applyProject(); }
  if (el.dataset.msPaint && st?.palace.paint) {
    const k = el.dataset.msPaint, u = st.palace.paint;
    if (e.type === 'change' && k !== 'on' && k !== 'preset') pushUndo();
    if (k === 'on') u.uPaintOn.value = el.checked ? 1 : 0;
    else if (k === 'preset') { pushUndo(); applyPainterly(u, PAINTERLY_PRESETS[el.value]); (proj().painterly ||= {}).preset = el.value; savePaint(); return selPanel(); }
    else applyPainterly(u, {[k]: el.type === 'color' ? el.value : +el.value});
    const out = el.parentElement.querySelector('output'); if (out) out.textContent = el.value;
    return savePaint();
  }
  if (el.matches('[data-ms-import]') && el.files[0]) return reimport(el.files[0]);
  if (el.dataset.msP) {
    const k = el.dataset.msP;
    ui.params[k] = el.type === 'checkbox' ? el.checked : el.type === 'color' ? el.value : +el.value;
    if (el.nextElementSibling?.tagName === 'OUTPUT') el.nextElementSibling.textContent = el.value;
    if (e.type === 'change' || el.type !== 'range') { if (tab === 'library') mountPreview(); }
  }
}
async function reimport(file) {
  try {
    const d = JSON.parse(await file.text());
    if (d.formato !== 'sstcg-material-project' || d.projeto !== PROJECT || !d.dados?.slots) throw Error('Arquivo não é um projeto de material do Arena Forge.');
    const missing = d.materiais.filter(id => !lib.materiais.some(m => m.id === id));
    pushUndo(); lib.projetos[PROJECT] = d.dados; applyProject(); selPanel();
    ctx.notice(missing.length ? `Reimportado. Materiais ausentes (instale-os ou o original é usado): ${missing.join(', ')}` : 'Projeto reimportado.', !missing.length);
  } catch (e) { ctx.notice(e.message); }
}
function manualImport() {
  const form = document.createElement('dialog');
  form.innerHTML = `<form method="dialog" style="display:grid;gap:8px;min-width:340px"><h3>Importar material (manual)</h3>
    <label>Nome <input name="nome" required></label><label>Página de origem (https) <input name="url" type="url" required></label>
    <label>Licença <select name="lic"><option>CC0-1.0</option><option>CC-BY-4.0</option></select></label><label>Atribuição (CC BY) <input name="attr"></label>
    ${['color', 'normal', 'roughness', 'metalness', 'ao', 'arm', 'height', 'opacity', 'emissive'].map(s => `<label>${s} <input type="file" name="${s}" accept="image/jpeg,image/png"></label>`).join('')}
    <p class="hint">Use para cgbookcase, TextureCan, 3DTextures.me e outros sem API: baixe pelo site do provedor e confira a licença.</p>
    <menu><button value="cancel" class="secondary">Cancelar</button><button value="ok" class="primary">Importar</button></menu></form>`;
  document.body.append(form); form.showModal();
  form.addEventListener('close', async () => {
    const f = form.querySelector('form');
    if (form.returnValue === 'ok') try {
      const mapas = {};
      for (const s of ['color', 'normal', 'roughness', 'metalness', 'ao', 'arm', 'height', 'opacity', 'emissive']) {
        const file = f[s].files[0]; if (file) mapas[s] = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
      }
      await ctx.api('materiais/importar', {nome: f.nome.value, url_origem: f.url.value, licenca: f.lic.value, atribuicao: f.attr.value, mapas});
      lib = await ctx.api('materiais'); ctx.notice('Material importado.', true); paint();
    } catch (e) { ctx.notice(e.message); }
    form.remove();
  });
}

export async function mountMaterials(target, context, sub) {
  ctx = context; host = target; tab = sub === 'estudio' ? 'studio' : 'library';
  prev?.dispose(); prev = null; st?.dispose();
  if (!document.querySelector('#ms-style')) document.head.append(Object.assign(document.createElement('style'), {id: 'ms-style', textContent: css}));
  host.innerHTML = '<section id="material-studio"><p class="hint">Carregando biblioteca de materiais…</p></section>';
  host = host.querySelector('#material-studio');
  try { lib = await ctx.api('materiais'); } catch (e) { host.innerHTML = `<p class="ms-err">${esc(e.message)}</p>`; return; }
  lib.presets ||= {}; lib.projetos ||= {};
  paint();
}
addEventListener('hashchange', () => { if (!location.hash.startsWith('#arenas/')) { prev?.dispose(); prev = null; st?.dispose(); } });
document.addEventListener('click', onClick);
document.addEventListener('input', onInput);
document.addEventListener('change', onInput);
document.addEventListener('dragstart', e => { const m = e.target.closest?.('.ms-inst[data-mat]'); if (m) e.dataTransfer.setData('text/material-id', m.dataset.mat); });
