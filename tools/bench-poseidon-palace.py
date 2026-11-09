"""Benchmark reproduzível do Palácio de Poseidon (V15, 08/11/2026).

Mede, nas mesmas condições, cada versão pedida em cada perfil e em cada vista:
- perfis: desktop alto (1600 × 900, DPR 2, gráfico High), desktop médio (o mesmo com Medium) e celular emulado
  (390 × 844, DPR 3, toque, perfil phone);
- vistas: chaves 0, 1 e 2 da cinemática e a partida (câmera competitiva, com as cartas da demo na mão);
- métricas: ms de GPU do mundo (scene.bench, que espera a GPU com readPixels), mediana e p95 de várias amostras;
  draw calls e triângulos contados no próprio contexto WebGL num quadro; texturas, geometrias e memória aproximada
  (atributos de geometria + texturas, só do grupo do palácio) e heap de JS.
- As versões rodam intercaladas (A, B, A, B...) para o ruído da máquina cair igual nas duas.

Uso: uv run -q --with playwright python tools/bench-poseidon-palace.py 8770 [--rodadas 2] [--amostras 12]
     [--versoes v11,v15] [--perfis alto,medio,celular] [--saida docs/perf/poseidon-palace-bench.json]
Versões: semFlags (sem esculturas), v11 (V14.1 + Profundezas V1.1), v15 (v11 + ?palaceV15=1, guardiões sempre LOD0 como na V15),
     v151 (V15.1: LOD dos guardiões pelo perfil gráfico), v152 (as mesmas flags; nome para comparar com a V15.1 servida
     de outra porta via --porta-v151, ex. uma cópia do commit 09341d7 por git archive; --porta-v152 faz o mesmo para uma
     árvore só com as mudanças da V15.2, para nenhuma alteração alheia da árvore de trabalho entrar na medida).
     --ciclo (V15.2): depois das vistas, mede troca de LOD em tempo real, descarte e reentrada pelo Sculpture Manager.
"""
import argparse, json, statistics, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('port', nargs='?', default='8770')
ap.add_argument('--rodadas', type=int, default=2)
ap.add_argument('--amostras', type=int, default=12)
ap.add_argument('--quadros', type=int, default=10, help='quadros por amostra de bench')
ap.add_argument('--versoes', default='v11')
ap.add_argument('--perfis', default='alto,medio,celular')  # também: baixo
ap.add_argument('--vistas', default='chave0,chave1,chave2,partida')
ap.add_argument('--porta-v151', default=None, help='porta que serve a árvore da V15.1 (a versão v151 usa essa porta)')
ap.add_argument('--porta-v152', default=None, help='porta que serve a árvore da V15.2 isolada (a versão v152 usa essa porta)')
ap.add_argument('--ciclo', action='store_true', help='mede troca de LOD, descarte e reentrada (só onde há Sculpture Manager)')
ap.add_argument('--saida', default='docs/perf/poseidon-palace-bench.json')
a = ap.parse_args()

GAME = f'http://127.0.0.1:{a.port}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1'
VERSOES = {'semFlags': '', 'v11': '&sculptV141=1&sculptDepthsV11=1', 'v15': '&sculptV141=1&sculptDepthsV11=1&palaceV15=1&sculptLod=lod0', 'v151': '&sculptV141=1&sculptDepthsV11=1&palaceV15=1',
           'v152': '&sculptV141=1&sculptDepthsV11=1&palaceV15=1'}
def game_url(versao):
    porta = {'v151': a.porta_v151, 'v152': a.porta_v152}.get(versao)
    return GAME.replace(f':{a.port}/', f':{porta}/') if porta else GAME
# V15.2: troca de LOD em tempo real (perfil → outro → volta), descarte de tudo e reentrada (pronto para a cinemática).
CICLO = r"""(async () => {
  const s = window.__divine.scene, env = s.environment, m = env.sculptures; if (!m || !m.diagnostics) return null;
  const out = {}, start = m.profile, D = () => m.diagnostics();
  for (const q of (start === 'phone' ? ['low', 'phone'] : start === 'high' ? ['medium', 'high'] : ['high', start])) {
    const t = performance.now(); await env.setQuality(q); out['troca_' + start + '_' + q + 'Ms'] = Math.round(performance.now() - t); }
  const t1 = performance.now(); m.release('cinematic'); m.release('battle'); out.descarteMs = +(performance.now() - t1).toFixed(2);
  out.descartePorItemMs = D().items.map(i => i.lastDispose?.ms); out.recursosDepoisDoDescarte = D().assets.length;
  const t2 = performance.now(); await env.prepareCinematic(); out.reentradaMs = Math.round(performance.now() - t2);
  out.estado = D().items.map(i => i.state + ':' + i.loaded); out.recursos = D().assets.length;
  return out; })()"""

PERFIS = {
    'alto': dict(viewport={'width': 1600, 'height': 900}, device_scale_factor=2, quality='high'),
    'medio': dict(viewport={'width': 1600, 'height': 900}, device_scale_factor=2, quality='medium'),
    'baixo': dict(viewport={'width': 1600, 'height': 900}, device_scale_factor=2, quality='low'),
    'celular': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, quality='phone'),
}
READY = ("(e => e && ['ready','unavailable'].includes(e.group.userData.guardianB) && e.group.userData.guardianV13 && e.group.userData.guardianV13 !== 'loading'"
         " && !['loading'].includes(e.group.userData.capitalV8) && !['loading'].includes(e.group.userData.portalV9))(window.__divine?.scene?.environment)")
READY_PLAIN = "(e => e && !['loading'].includes(e.group.userData.capitalV8) && !['loading'].includes(e.group.userData.portalV9))(window.__divine?.scene?.environment)"

# Conta draw calls e triângulos por contexto WebGL (só enquanto window.__glcOn).
HOOK = r"""
(() => {
  const wrap = (proto) => {
    if (!proto || proto.__glcWrapped) return; proto.__glcWrapped = true;
    const tri = (mode, n) => mode === 4 ? n / 3 : (mode === 5 || mode === 6) ? Math.max(0, n - 2) : 0;
    const hit = (gl, mode, n, inst = 1) => { if (!self.__glcOn) return; const c = gl.__c || (gl.__c = {calls: 0, tris: 0}); c.calls++; c.tris += tri(mode, n) * inst; };
    const de = proto.drawElements, da = proto.drawArrays, dei = proto.drawElementsInstanced, dai = proto.drawArraysInstanced;
    proto.drawElements = function (m, n, t, o) { hit(this, m, n); return de.call(this, m, n, t, o); };
    proto.drawArrays = function (m, f, n) { hit(this, m, n); return da.call(this, m, f, n); };
    if (dei) proto.drawElementsInstanced = function (m, n, t, o, i) { hit(this, m, n, i); return dei.call(this, m, n, t, o, i); };
    if (dai) proto.drawArraysInstanced = function (m, f, n, i) { hit(this, m, n, i); return dai.call(this, m, f, n, i); };
  };
  wrap(self.WebGL2RenderingContext?.prototype); wrap(self.WebGLRenderingContext?.prototype);
})();
"""

# Um quadro do mundo contado + memória aproximada do grupo do palácio.
PROBE = r"""
(() => {
  const s = window.__divine.scene, env = s.environment;
  const ctxs = [...document.querySelectorAll('canvas')].map(c => c.getContext('webgl2') || c.getContext('webgl')).filter(Boolean);
  ctxs.forEach(g => g.__c = {calls: 0, tris: 0});
  self.__glcOn = true; s.bench(1); self.__glcOn = false;
  const world = ctxs.map(g => g.__c).sort((x, y) => y.tris - x.tris)[0] || {calls: 0, tris: 0};
  let geo = 0, tex = 0; const seenG = new Set(), seenT = new Set();
  env.group.traverse(o => {
    const g = o.geometry; if (g && !seenG.has(g)) { seenG.add(g); for (const k in g.attributes) geo += g.attributes[k].array.byteLength; if (g.index) geo += g.index.array.byteLength; }
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) for (const k in m) { const t = m[k]; if (t && t.isTexture && !seenT.has(t.image)) { seenT.add(t.image); const im = t.image; const w = im?.width || 0, h = im?.height || 0; tex += w * h * 4 * (t.generateMipmaps === false ? 1 : 1.33); } }
    if (o.material?.uniforms) for (const k in o.material.uniforms) { const t = o.material.uniforms[k]?.value; if (t && t.isTexture && !seenT.has(t.image)) { seenT.add(t.image); const im = t.image; tex += (im?.width || 0) * (im?.height || 0) * 4 * 1.33; } }
  });
  let gtex = 0; const seenG2 = new Set();
  env.group.traverse(o => { if (!/^GUARDIAN_.*(GLB|DEV)$/.test(o.name)) return; o.traverse(n => { const m = n.material; if (!m) return; for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap']) { const t = m[k]; if (t && t.image && !seenG2.has(t.image)) { seenG2.add(t.image); gtex += t.image.width * t.image.height * 4 * 1.33; } } }); });
  const glbs = performance.getEntriesByType('resource').filter(r => /guardian-.*\.glb/.test(r.name)).map(r => ({glb: r.name.split('/').slice(-2).join('/'), ms: Math.round(r.duration), bytes: r.transferSize || r.encodedBodySize || r.decodedBodySize}));
  const st = s.stats();
  return {drawCalls: world.calls, triangulos: Math.round(world.tris), texturas: st.textures, geometrias: st.geometries, pixelRatio: st.pixelRatio, nivel: st.level,
    memGeoMB: +(geo / 1048576).toFixed(1), memTexMB: +(tex / 1048576).toFixed(1), memTexGuardioesMB: +(gtex / 1048576).toFixed(1), glbs, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null};
})()
"""


def game(page, cond):
    for _ in range(1800):
        for f in page.frames:
            try:
                if f.evaluate(cond):
                    return f
            except Exception:
                pass
        time.sleep(.1)
    raise RuntimeError('jogo não carregou: ' + cond)


def pct(xs, p):
    xs = sorted(xs); k = (len(xs) - 1) * p; i = int(k)
    return round(xs[i] + (xs[min(i + 1, len(xs) - 1)] - xs[i]) * (k - i), 2)


def run_page(br, perfil, versao, vistas, keys_cache):
    cfg = dict(PERFIS[perfil]); quality = cfg.pop('quality')
    ctx = br.new_context(**cfg)
    ctx.add_init_script(HOOK)
    ctx.add_init_script(f"try {{ const k='ssTcgOlympusArena', s=JSON.parse(localStorage.getItem(k)||'{{}}'); s.quality={json.dumps(quality)}; localStorage.setItem(k, JSON.stringify(s)); }} catch {{}}")
    p = ctx.new_page()
    errs = []
    p.on('pageerror', lambda e: errs.append(str(e)))
    t0 = time.time()
    p.goto(game_url(versao) + VERSOES[versao], wait_until='commit')
    f = game(p, READY if 'sculpt' in VERSOES[versao] else READY_PLAIN)
    carga = round(time.time() - t0, 1)
    p.wait_for_timeout(3000)
    keys = f.evaluate('window.__divine.scene.cinematicKeys')
    out = {}
    for v in vistas:
        key = None if v == 'partida' else keys[int(v[-1])]
        f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(key)})')
        p.wait_for_timeout(800)
        f.evaluate(f'window.__divine.scene.bench({a.quadros})')  # aquecimento
        amostras = [f.evaluate(f'window.__divine.scene.bench({a.quadros})')['world'] for _ in range(a.amostras)]
        probe = f.evaluate(PROBE)
        out[v] = {'amostras': amostras, **probe}
    f.evaluate('window.__divine.scene.poseCinematic(null)')
    if a.ciclo: out['_ciclo'] = f.evaluate(CICLO)
    ctx.close()
    return out, carga, errs


def main():
    versoes, perfis, vistas = a.versoes.split(','), a.perfis.split(','), a.vistas.split(',')
    res = {v: {p: {x: {'amostras': [], 'rodadas': []} for x in vistas} for p in perfis} for v in versoes}
    cargas, erros = {}, []
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu', '--enable-precise-memory-info'])
        for r in range(a.rodadas):
            for p in perfis:
                for v in versoes:  # intercalado: o ruído da máquina cai igual nas versões
                    out, carga, errs = run_page(br, p, v, vistas, None)
                    cargas.setdefault(f'{v}:{p}', []).append(carga)
                    erros += [f'{v}:{p}: {e}' for e in errs]
                    ciclo = out.pop('_ciclo', None)
                    if ciclo: res.setdefault('_ciclos', []).append({'versao': v, 'perfil': p, 'rodada': r + 1, **ciclo}); print('   ciclo', ciclo, flush=True)
                    for x, d in out.items():
                        slot = res[v][p][x]
                        slot['amostras'] += d['amostras']
                        slot['rodadas'].append(round(statistics.median(d['amostras']), 2))
                        slot.update({k: d[k] for k in d if k != 'amostras'})
                    print(f'rodada {r + 1} {p:8} {v:8} ' + ' '.join(f"{x}={statistics.median(out[x]['amostras']):.2f}ms" for x in vistas), flush=True)
        br.close()
    tabela = {}
    ciclos = res.pop('_ciclos', [])
    for v in versoes:
        for p in perfis:
            for x in vistas:
                s = res[v][p][x]; am = s.pop('amostras')
                s.update({'gpuMsMediana': pct(am, .5), 'gpuMsP95': pct(am, .95), 'gpuMsMin': min(am), 'gpuMsMax': max(am), 'n': len(am)})
                tabela[f'{v}|{p}|{x}'] = s
    doc = {'data': time.strftime('%Y-%m-%d %H:%M'), 'condicoes': {'navegador': 'Chrome (Playwright) --use-angle=metal', 'quadrosPorAmostra': a.quadros,
           'amostrasPorRodada': a.amostras, 'rodadas': a.rodadas, 'ordem': 'versões intercaladas em cada rodada e perfil', 'perfis': {k: {kk: vv for kk, vv in c.items()} for k, c in PERFIS.items() if k in perfis}},
           'resultados': tabela, 'ciclosV152': ciclos, 'cargaSegundos': cargas, 'errosDePagina': erros}
    out = ROOT / a.saida; out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, indent=1, ensure_ascii=False))
    print('\nversão|perfil|vista            mediana   p95   min   max  calls   tris     texMB  guardMB geoMB  rodadas')
    for k, s in tabela.items():
        print(f"{k:28} {s['gpuMsMediana']:6} {s['gpuMsP95']:6} {s['gpuMsMin']:5} {s['gpuMsMax']:5} {s['drawCalls']:5} {s['triangulos']:8} {s['memTexMB']:6} {s['memTexGuardioesMB']:7} {s['memGeoMB']:6}  {s['rodadas']}")
    print('erros de página:', len(erros), erros[:3])
    print('salvo em', out)


if __name__ == '__main__':
    main()
