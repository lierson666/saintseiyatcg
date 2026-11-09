// SSTCG · Sculpture Manager (V15.2, 08/11/2026): ciclo de vida das esculturas GLB no mundo. Reutilizável por qualquer arena.
// Cada escultura registrada tem id estável, projeto, versão, variantes de LOD (lod0, lod1, lod2, mobile → URL), transformação
// e estado: UNLOADED → LOADING → READY ⇄ SWAPPING; ERROR (nada carregado e a última carga falhou); DISPOSING (soltando).
// - Perfil gráfico → variante: Ultra/High = lod0, Medium = lod1, Low = lod2, phone = mobile. Troca em tempo real (setProfile).
// - Troca atômica: a variante nova carrega com a antiga visível; ao ficar pronta, entra na mesma transformação e visibilidade e
//   a antiga sai no mesmo quadro. Falhou: a antiga continua e o erro fica registrado.
// - Concorrência: cada pedido leva uma geração; resposta de geração velha é descartada (High → Low → High → phone termina em phone).
// - Recursos: um GLB por URL, contado por referência. Duas esculturas na mesma URL compartilham geometria, material e textura
//   (cada uma recebe um clone dos nós); a URL só é solta (geometria, material, textura, ImageBitmap) quando a última sai.
// - Residência: cada escultura fica carregada enquanto houver um motivo (require/release: 'cinematic', 'battle', 'editor'...).
// Usa o leitor de GLB do Sculpture Studio (parseGuardianGLB), que roda no Three.js enxuto da partida e no completo do editor.
import {parseGuardianGLB} from './poseidon-v13-guardian.js';

export const STATE = Object.freeze({UNLOADED: 'UNLOADED', LOADING: 'LOADING', READY: 'READY', SWAPPING: 'SWAPPING', ERROR: 'ERROR', DISPOSING: 'DISPOSING'});
export const PROFILE_LOD = Object.freeze({ultra: 'lod0', high: 'lod0', medium: 'lod1', low: 'lod2', phone: 'mobile'});
const FALLBACK = {lod0: ['lod0'], lod1: ['lod1', 'lod0'], lod2: ['lod2', 'lod1', 'lod0'], mobile: ['mobile', 'lod1', 'lod0']};

// Memória estimada das texturas de um nó (largura × altura × 4 × 1,33 de mipmaps, cada imagem uma vez). Estimativa, não GPU real.
export function textureMB(root) {
  const seen = new Set(); let b = 0;
  root.traverse(o => { const m = o.material; if (!m) return; for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) { const im = m[k]?.image; if (im && !seen.has(im)) { seen.add(im); b += im.width * im.height * 4 * 1.33; } } });
  return +(b / 1048576).toFixed(1);
}

export function createSculptureManager(THREE, {parent, baseUrl, profile = 'high', lodOverride = null, fetchImpl = (...a) => fetch(...a), now = () => performance.now(), onChange = null} = {}) {
  const assets = new Map();   // url → {url, refs, promise, glb, bytes, ms, texMB}
  const items = new Map();
  const events = [];           // histórico curto para o diagnóstico
  const note = (id, ev, extra = {}) => { events.push({t: Math.round(now()), id, ev, ...extra}); if (events.length > 80) events.shift(); onChange?.(id, ev); };
  let disposed = false;

  function acquire(url) {
    let a = assets.get(url);
    if (!a) {
      a = {url, refs: 0, glb: null, bytes: 0, ms: 0, texMB: 0};
      assets.set(url, a);
      const t0 = now();
      a.promise = (async () => {
        const res = await fetchImpl(new URL(url, baseUrl).href, {cache: 'no-store'});
        if (!res.ok) throw Error(`HTTP ${res.status} em ${url}`);
        const buf = await res.arrayBuffer();
        a.bytes = buf.byteLength;
        a.glb = await parseGuardianGLB(THREE, buf);
        a.ms = Math.round(now() - t0); a.texMB = textureMB(a.glb.root);
        return a;
      })();
    }
    a.refs++;
    return a.promise.then(() => a, err => { if (--a.refs <= 0 && assets.get(url) === a) assets.delete(url); throw err; });
  }
  function releaseAsset(url) {
    const a = assets.get(url); if (!a) return;
    if (--a.refs > 0) return;
    assets.delete(url);
    a.glb?.dispose();   // solta geometria, material, cada textura uma vez e os ImageBitmap
  }

  const lodFor = it => lodOverride || PROFILE_LOD[profile] || 'lod0';
  function urlFor(it, lod) { for (const l of FALLBACK[lod] || [lod]) if (it.variants[l]) return [l, it.variants[l]]; return [null, null]; }

  function place(it, inst) {
    inst.position.fromArray(it.position); inst.rotation.y = (it.yaw || 0) * Math.PI / 180;
    inst.visible = it.visible; inst.name = it.name;
  }

  // Pede a variante do perfil atual. Devolve a promessa do pedido (resolve com o estado final do item).
  function ensure(it) {
    const [lod, url] = urlFor(it, lodFor(it));
    if (!url) { it.state = STATE.ERROR; it.error = {msg: 'sem variante', lod: lodFor(it)}; return Promise.resolve(it.state); }
    if (it.url === url && it.root) { it.requested = lod; return it.pending || Promise.resolve(it.state); }
    if (it.pendingUrl === url) return it.pending;
    const gen = ++it.gen;
    it.requested = lod; it.pendingUrl = url;
    it.state = it.root ? STATE.SWAPPING : STATE.LOADING;
    note(it.id, it.root ? 'swap' : 'load', {lod, url});
    const t0 = now();
    it.pending = acquire(url).then(a => {
      if (gen !== it.gen || disposed || !it.registered) { releaseAsset(url); return it.state; }   // pedido velho: descarta
      const inst = a.glb.root.clone();
      place(it, inst);
      parent.add(inst);
      const old = it.root, oldUrl = it.url;
      if (old) parent.remove(old);                     // troca atômica: entra a nova e sai a velha no mesmo quadro
      it.root = inst; it.url = url; it.loaded = lod; it.pendingUrl = null; it.pending = null;
      it.state = STATE.READY; it.error = null;
      it.lastLoad = {lod, url, ms: Math.round(now() - t0), bytes: a.bytes, texMB: a.texMB, shared: a.refs > 1};
      if (oldUrl) releaseAsset(oldUrl);
      note(it.id, 'ready', {lod, ms: it.lastLoad.ms});
      return it.state;
    }, err => {
      if (gen !== it.gen) return it.state;
      it.pendingUrl = null; it.pending = null;
      it.error = {msg: String(err?.message || err), lod, url};
      it.state = it.root ? STATE.READY : STATE.ERROR;   // a variante anterior continua visível
      note(it.id, 'error', {lod, msg: it.error.msg});
      console.warn('[Sculpture Manager]', it.id, err);
      return it.state;
    });
    return it.pending;
  }

  function unload(it) {
    it.gen++;   // cancela pedido em voo
    it.pendingUrl = null; it.pending = null;
    if (!it.root) { it.state = it.error ? STATE.ERROR : STATE.UNLOADED; return; }
    const t0 = now();
    it.state = STATE.DISPOSING;
    parent.remove(it.root); releaseAsset(it.url);
    it.root = null; it.url = null; it.loaded = null; it.requested = null;
    it.state = STATE.UNLOADED;
    it.lastDispose = {ms: +(now() - t0).toFixed(2)};
    note(it.id, 'unload');
  }

  return {
    STATE,
    /** Registra uma escultura. variants: {lod0, lod1, lod2, mobile} → URL relativa a baseUrl. Não carrega nada sozinho. */
    register({id, project, version, variants, position = [0, 0, 0], yaw = 0, name = id, visible = true}) {
      if (items.has(id)) throw Error('escultura já registrada: ' + id);
      const it = {id, project, version, variants, position, yaw, name, visible, registered: true, state: STATE.UNLOADED, gen: 0, reasons: new Set(),
        root: null, url: null, loaded: null, requested: null, pending: null, pendingUrl: null, error: null, lastLoad: null, lastDispose: null};
      items.set(id, it);
      return it;
    },
    unregister(id) { const it = items.get(id); if (!it) return; unload(it); it.registered = false; items.delete(id); },
    /** Motivo para manter residente (ex. 'cinematic', 'battle', 'editor'). Sem id: todas. Resolve quando as variantes chegarem. */
    require(reason, id) { const list = id ? [items.get(id)].filter(Boolean) : [...items.values()]; return Promise.all(list.map(it => { it.reasons.add(reason); return ensure(it); })); },
    release(reason, id) { for (const it of id ? [items.get(id)].filter(Boolean) : items.values()) { it.reasons.delete(reason); if (!it.reasons.size) unload(it); } },
    /** Muda o perfil gráfico: cada escultura residente troca para a variante do perfil, sem sumir durante a troca. */
    setProfile(p) { profile = p; return Promise.all([...items.values()].filter(it => it.reasons.size).map(ensure)); },
    get profile() { return profile; },
    setVisible(id, v) { const it = items.get(id); if (!it) return; it.visible = v; if (it.root) it.root.visible = v; },
    ready() { return Promise.all([...items.values()].map(it => it.pending || Promise.resolve(it.state))); },
    get(id) { return items.get(id); },
    diagnostics() {
      return {profile, lodOverride, assets: [...assets.values()].map(a => ({url: a.url, refs: a.refs, bytes: a.bytes, ms: a.ms, texMB: a.texMB, ready: !!a.glb})),
        items: [...items.values()].map(it => ({id: it.id, project: it.project, version: it.version, state: it.state, requested: it.requested, loaded: it.loaded,
          url: it.url, refs: it.url ? assets.get(it.url)?.refs ?? 0 : 0, texMB: it.url ? assets.get(it.url)?.texMB ?? 0 : 0, reasons: [...it.reasons],
          lastLoad: it.lastLoad, lastDispose: it.lastDispose, error: it.error, gen: it.gen})),
        events: events.slice(-20)};
    },
    dispose() { disposed = true; for (const it of [...items.values()]) { unload(it); it.registered = false; } items.clear(); },
  };
}
