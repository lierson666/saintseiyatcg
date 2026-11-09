"""Poseidon V15.1: LOD das esculturas pelo perfil gráfico (08/11/2026).

Para cada perfil (High, Medium, Low e celular/phone) abre o palácio V15 com os dois guardiões e confere, pelas
requisições reais da página, qual GLB foi baixado: High = LOD0, Medium = LOD1, Low = LOD2, celular = mobile-r2 (512², o -mobile.glb tem texturas pretas).
Também confere: uma requisição por guardião (sem duplicata nem LOD0 antes), texturas dos guardiões no tamanho do perfil,
os dois guardiões prontos, câmera competitiva intacta, sem erros de página, o override de QA ?sculptLod=lod0 e o
descarte (dispose fecha as texturas e solta a geometria dos dois).
Uso: uv run -q --with playwright python tools/test-poseidon-v15-1-lod.py 8770
"""
import json, re, sys, time
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else '8770'
GAME = f'http://127.0.0.1:{PORT}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1&sculptV141=1&sculptDepthsV11=1&palaceV15=1'
READY = "(e => e && e.group.userData.guardianB === 'ready' && e.group.userData.guardianV13 === 'ready')(window.__divine?.scene?.environment)"
PERFIS = {
    'high': ({'viewport': {'width': 1600, 'height': 900}}, 'lod0', 2048),
    'medium': ({'viewport': {'width': 1600, 'height': 900}}, 'lod1', 1024),
    'low': ({'viewport': {'width': 1600, 'height': 900}}, 'lod2', 1024),
    'phone': ({'viewport': {'width': 390, 'height': 844}, 'device_scale_factor': 3, 'is_mobile': True, 'has_touch': True}, 'mobile-r2', 512),
}
passed = []


def ok(name, cond):
    assert cond, name
    passed.append(name); print('ok  ', name)


def game(page, cond):
    for _ in range(1800):
        for f in page.frames:
            try:
                if f.evaluate(cond):
                    return f
            except Exception:
                pass
        time.sleep(.1)
    raise RuntimeError('jogo não carregou')


PROBE = """(() => { const s = window.__divine.scene, e = s.environment; let maxTex = 0;
  e.group.traverse(o => { if (!/^GUARDIAN_.*(GLB|DEV)$/.test(o.name)) return; o.traverse(n => { const m = n.material; if (m) for (const k of ['map','normalMap','roughnessMap']) if (m[k]?.image) maxTex = Math.max(maxTex, m[k].image.width); }); });
  const c = Object.assign(document.createElement('canvas'), {width: 16, height: 16}), g = c.getContext('2d'); let luma = 1e9;
  e.group.traverse(o => { if (!/^GUARDIAN_.*(GLB|DEV)$/.test(o.name)) return; o.traverse(n => { const im = n.material?.map?.image; if (!im || !/IVORY/.test(n.material.name)) return;
    g.drawImage(im, 0, 0, 16, 16); const d = g.getImageData(0, 0, 16, 16).data; let t = 0; for (let i = 0; i < d.length; i += 4) t += (d[i] + d[i + 1] + d[i + 2]) / 3; luma = Math.min(luma, t / 256); }); });
  return {maxTex, ivoryLuma: Math.round(luma), level: s.stats().level, cam: s.composition().camera, a: e.group.userData.guardianV13Url, b: e.group.userData.guardianBUrl}; })()"""


def run(br, perfil, extra=''):
    ctx_args, lod, tex = PERFIS[perfil]
    c = br.new_context(**ctx_args)
    if perfil != 'phone':
        c.add_init_script("try { const k='ssTcgOlympusArena', s=JSON.parse(localStorage.getItem(k)||'{}'); s.quality=" + json.dumps(perfil) + "; localStorage.setItem(k, JSON.stringify(s)); } catch {}")
    p = c.new_page(); reqs, errs = [], []
    p.on('request', lambda r: re.search(r'guardian-.*\.glb', r.url) and reqs.append(r.url.split('/')[-2] + '/' + r.url.split('/')[-1].split('?')[0]))
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(GAME + extra, wait_until='commit')
    f = game(p, READY); p.wait_for_timeout(1500)
    return c, p, f, reqs, errs, lod, tex


with sync_playwright() as pw:
    br = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
    for perfil in PERFIS:
        c, p, f, reqs, errs, lod, tex = run(br, perfil)
        info = f.evaluate(PROBE)
        # V15.2: variantes do catálogo — LOD1 e mobile da V14.1 vêm da revisão r2 (coroa protegida)
        tides = {'lod1': 'poseidon-v14-1-r2/guardian-tides-lod1.glb', 'mobile-r2': 'poseidon-v14-1-r2/guardian-tides-mobile.glb'}.get(lod, f'poseidon-v14-1/guardian-tides-{lod}.glb')
        want = {tides, f'poseidon-depths-v1-1/guardian-depths-{lod}.glb'}
        ok(f'{perfil}: baixa só {sorted(want)} ({len(reqs)} requisições)', sorted(reqs) == sorted(want))
        ok(f'{perfil}: textura máxima dos guardiões {info["maxTex"]}² (esperado {tex}²), perfil da cena {info["level"]}', info['maxTex'] == tex and info['level'] == perfil)
        ok(f"{perfil}: textura de marfim dos guardiões não está preta (luma média {info['ivoryLuma']})", 60 < info['ivoryLuma'] < 1e9)
        ok(f'{perfil}: câmera competitiva intacta e sem erros', info['cam']['fov'] == 42 and info['cam']['position'] == [0, 13.5, 13] and not errs)
        if perfil == 'phone':
            d = f.evaluate("""(() => { const e = window.__divine.scene.environment; const T = new Set(), G = new Set();
              e.group.traverse(o => { if (!/^GUARDIAN_.*(GLB|DEV)$/.test(o.name)) return; o.traverse(n => { if (n.geometry) G.add(n.geometry); const m = n.material; if (m) for (const k of ['map','normalMap','roughnessMap']) if (m[k]) T.add(m[k]); }); });
              let disposedT = 0, disposedG = 0; T.forEach(t => t.addEventListener('dispose', () => disposedT++)); G.forEach(g => g.addEventListener('dispose', () => disposedG++));
              e.dispose(); return {t: T.size, g: G.size, disposedT, disposedG}; })()""")
            ok(f"descarte: {d['disposedT']}/{d['t']} texturas e {d['disposedG']}/{d['g']} geometrias dos guardiões soltas", d['t'] > 0 and d['disposedT'] == d['t'] and d['disposedG'] == d['g'])
        c.close()
    c, p, f, reqs, errs, *_ = run(br, 'phone', '&sculptLod=lod0')
    ok('QA ?sculptLod=lod0 força o LOD0 no celular (reproduz a V15)', all(r.endswith('-lod0.glb') for r in reqs) and len(reqs) == 2)
    c.close(); br.close()
print(f'\n{len(passed)} ok')
