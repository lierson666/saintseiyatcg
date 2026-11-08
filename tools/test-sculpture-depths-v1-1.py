"""QA do Guardião das Profundezas V1.1 (passada escultórica, só desenvolvimento).

uv run -q --with playwright python tools/test-sculpture-depths-v1-1.py [porta]
1. Inspetor (STAR HILL → Arena Forge → Sculpture Studio): os 4 GLB da V1.1 (LOD0, LOD1, LOD2, Mobile) com as 9 partes,
   orçamento e escala; modos argila, material e wireframe; 5 vistas com material em v1-1-material-*.png.
2. Mundo: ?sculptV141=1&sculptDepthsV11=1 carrega as duas esculturas no mesmo grupo do palácio. Captura as chaves 0, 1 e 2,
   um close de cada guardião, a visão das duas, a partida com cartas e o celular (390 × 844).
3. Métricas reais: ms de GPU por quadro (scene.bench), draw calls e texturas, sem flags × V14.1 + V1 × V14.1 + V1.1, e o
   tempo de carga do GLB. Grava docs/img/sculpture-studio/guardian-depths/v1-1-metricas.json.
4. Câmera competitiva igual (FOV 42 em (0, 13.5, 13)); sem flags nenhuma escultura carrega; ?sculptDepthsV1=1 continua V1.
"""
import base64
import json
import re
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = sys.argv[1] if len(sys.argv) > 1 else '8770'
OUT = ROOT / 'docs/img/sculpture-studio/guardian-depths'
OUT.mkdir(parents=True, exist_ok=True)
PARTS = ['DEPTHS__PEDESTAL', 'DEPTHS__WAVES', 'DEPTHS__BODY', 'DEPTHS__FACE', 'DEPTHS__HAIR', 'DEPTHS__CLOTH', 'DEPTHS__HAND_GRIP', 'DEPTHS__TRIDENT', 'DEPTHS__DETAILS']
GAME = f'http://127.0.0.1:{PORT}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1'
V11 = '../poseidon-depths-v1-1/guardian-depths-'
VIEWS = ['frente', 'costas', 'esquerda', 'direita', 'tres-quartos']
BUDGET = {'lod0': (15000, 30000), 'lod1': (5000, 10000), 'lod2': (500, 3000), 'mobile': (5000, 10000)}
# closes e visão geral (câmeras de revisão; a câmera competitiva não muda)
A, B = [-10.8, 4.41, -34.8], [10.8, 4.41, -34.8]
CLOSE = {'v1-1-mundo-close-profundezas.png': {'pos': [B[0] - 2.5, B[1] + 6.5, B[2] + 13], 'look': [B[0], B[1] + 4.6, B[2]], 'fov': 34},
         'v1-1-mundo-close-mares.png': {'pos': [A[0] + 2.5, A[1] + 6.5, A[2] + 13], 'look': [A[0], A[1] + 4.6, A[2]], 'fov': 34},
         'v1-1-mundo-duas.png': {'pos': [0, 11, -12], 'look': [0, 8.5, -34.8], 'fov': 58}}
passed, errors = [], []
metrics = {}


def ok(name, cond):
    assert cond, name
    passed.append(name); print('ok  ', name)


def game(page, cond):
    """O jogo roda dentro de um frame da página: procura o frame onde a condição vale."""
    for _ in range(1800):
        for f in page.frames:
            try:
                if f.evaluate(cond):
                    return f
            except Exception:
                pass
        time.sleep(.1)
    raise RuntimeError('jogo não carregou: ' + cond)


READY = "(e => e && ['ready','unavailable'].includes(e.group.userData.guardianB) && e.group.userData.guardianV13 && e.group.userData.guardianV13 !== 'loading')(window.__divine?.scene?.environment)"


def measure(g, url, label, key=None):
    g.goto(url, wait_until='commit')
    f = game(g, READY if 'sculpt' in url else "!!window.__divine?.scene?.environment?.group")
    g.wait_for_timeout(2500)
    f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(key)})' if key else 'window.__divine.scene.poseCinematic(null)')
    g.wait_for_timeout(1200)
    b = [f.evaluate('window.__divine.scene.bench(30)') for _ in range(3)]
    st = f.evaluate('window.__divine.scene.stats()')
    load = f.evaluate("performance.getEntriesByType('resource').filter(r => r.name.includes('guardian-')).map(r => [r.name.split('/').slice(-2).join('/'), Math.round(r.duration), r.transferSize || r.encodedBodySize])")
    metrics[label] = {'gpuMsMundo': sorted(x['world'] for x in b)[1], 'px': b[0]['px'], 'drawCalls': st['calls'], 'texturas': st['textures'], 'geometrias': st['geometries'], 'fps': st['fps'], 'cargaGlb': load}
    return f


try:
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
        page = br.new_page(viewport={'width': 1700, 'height': 1050})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{PORT}/star-hill/#arenas/escultura', wait_until='commit')
        page.wait_for_function("window.__sculptureStudio && window.__sculptureStudio.stats()", timeout=90000)
        tris = {}
        for lod in ['lod2', 'lod1', 'mobile', 'lod0']:
            page.select_option('[data-ss=lod]', V11 + lod)
            page.wait_for_function(f"document.querySelector('[data-ss=src]').textContent.includes('guardian-depths-{lod}')", timeout=60000)
            page.wait_for_timeout(1200)
            names = page.evaluate("[...document.querySelectorAll('[data-ss=nodes] label')].map(l => l.textContent.trim())")
            assert all(p in names for p in PARTS), (lod, names)
            tris[lod] = page.evaluate('window.__sculptureStudio.stats().tri')
        ok(f'V1.1: os 4 GLB com as 9 partes e no orçamento {tris}', all(BUDGET[l][0] <= t <= BUDGET[l][1] for l, t in tris.items()))
        dims = page.locator('[data-ss=dims]').text_content()
        w, h, d, y0 = map(float, re.findall(r'-?\d+\.\d+', dims))
        ok(f'V1.1 escala de mundo: {dims}', 8.0 <= h <= 10.5 and abs(y0) < 0.05 and w < 5.6 and d < 4)
        for mode in ['argila', 'textura']:
            page.select_option('[data-ss=mode]', mode); page.wait_for_timeout(400)
            page.click('[data-view="tres-quartos"]'); page.wait_for_timeout(400)
            page.locator('[data-ss=stage]').screenshot(path=str(OUT / f'v1-1-inspetor-{mode}.png'))
        page.click('[data-ss-act="wire"]'); page.wait_for_timeout(400)
        page.locator('[data-ss=stage]').screenshot(path=str(OUT / 'v1-1-inspetor-wireframe.png'))
        ok('inspetor: wireframe liga', page.get_attribute('[data-ss-act="wire"]', 'aria-pressed') == 'true')
        page.click('[data-ss-act="wire"]'); page.wait_for_timeout(300)
        for v in VIEWS:
            page.click(f'[data-view="{v}"]'); page.wait_for_timeout(500)
            page.locator('[data-ss=stage]').screenshot(path=str(OUT / f'v1-1-material-{v}.png'))
        ok('V1.1 vistas com material, argila e wireframe capturadas', all((OUT / f'v1-1-material-{v}.png').stat().st_size > 20000 for v in VIEWS)
           and all((OUT / f'v1-1-inspetor-{m}.png').stat().st_size > 20000 for m in ['argila', 'textura', 'wireframe']))

        g = br.new_page(viewport={'width': 1600, 'height': 900})
        g.on('pageerror', lambda e: errors.append(str(e)))
        g.goto(GAME + '&sculptV141=1&sculptDepthsV11=1', wait_until='commit')
        f = game(g, READY)
        st = f.evaluate("(u => [u.guardianV13, u.guardianB])(window.__divine.scene.environment.group.userData)")
        ok(f'com ?sculptDepthsV11=1 a V1.1 carrega na posição B, ao lado da V14.1 ({st})', st == ['ready', 'ready'])
        same = f.evaluate("""(() => { const g = window.__divine.scene.environment.group, n = {};
            g.traverse(o => { if (o.name === 'GUARDIAN_DEPTHS_V11_DEV' || o.name === 'GUARDIAN_TIDES') { let p = o; while (p && p !== g) p = p.parent; n[o.name] = p === g; } });
            return n; })()""")
        ok(f'as duas esculturas estão no mesmo grupo do palácio ({same})', same.get('GUARDIAN_DEPTHS_V11_DEV') and same.get('GUARDIAN_TIDES'))
        g.wait_for_timeout(2500)
        keys = f.evaluate('window.__divine.scene.cinematicKeys')
        shot = lambda name: (OUT / name).write_bytes(base64.b64decode(f.evaluate('window.__divine.scene.snapshot(1600)').split(',', 1)[1]))
        for k in (0, 1, 2):
            f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(keys[k])})'); g.wait_for_timeout(1500)
            shot(f'v1-1-mundo-chave{k}.png')
        for name, key in CLOSE.items():
            f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(key)})'); g.wait_for_timeout(1500)
            shot(name)
        f.evaluate('window.__divine.scene.poseCinematic(null)'); g.wait_for_timeout(1500)
        shot('v1-1-mundo-partida.png')
        g.screenshot(path=str(OUT / 'v1-1-partida-cartas.png'))
        names = ['v1-1-mundo-chave0.png', 'v1-1-mundo-chave1.png', 'v1-1-mundo-chave2.png', 'v1-1-mundo-partida.png', 'v1-1-partida-cartas.png', *CLOSE]
        ok('V1.1 chaves 0-2, closes, visão das duas e partida com cartas capturadas', all((OUT / n).stat().st_size > 20000 for n in names))
        c = f.evaluate('window.__divine.scene.composition()')
        ok('com a V1.1 a câmera competitiva continua a mesma', c['camera']['fov'] == 42 and c['camera']['position'] == [0, 13.5, 13])

        m = br.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
        m.on('pageerror', lambda e: errors.append(str(e)))
        m.goto(GAME + '&sculptV141=1&sculptDepthsV11=1', wait_until='commit')
        fm = game(m, READY)
        m.wait_for_timeout(3000)
        m.screenshot(path=str(OUT / 'v1-1-celular.png'))
        ok('celular: as duas carregam e a partida é capturada', fm.evaluate("window.__divine.scene.environment.group.userData.guardianB") == 'ready' and (OUT / 'v1-1-celular.png').stat().st_size > 20000)
        m.close()

        # métricas reais (mesma página, mesma resolução): chave 1 da cinemática e a partida
        k1 = keys[1]
        for label, url in [('semFlags', GAME), ('v141+v1', GAME + '&sculptV141=1&sculptDepthsV1=1'), ('v141+v11', GAME + '&sculptV141=1&sculptDepthsV11=1')]:
            measure(g, url, label + ':chave1', k1)
            measure(g, url, label + ':partida')
        (OUT / 'v1-1-metricas.json').write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + '\n')
        d1, d0 = metrics['v141+v11:partida']['gpuMsMundo'], metrics['semFlags:partida']['gpuMsMundo']
        ok(f"métricas medidas: GPU na partida {d0} ms sem esculturas, {d1} ms com as duas", d1 > 0 and d0 > 0)

        g.goto(GAME + '&sculptDepthsV1=1', wait_until='commit')
        f = game(g, "(e => e && ['ready','unavailable'].includes(e.group.userData.guardianB))(window.__divine?.scene?.environment)")
        src = f.evaluate("(() => { const n = []; window.__divine.scene.environment.group.traverse(o => { if (o.name && o.name.startsWith('GUARDIAN_DEPTHS_')) n.push(o.name); }); return n; })()")
        ok(f'?sculptDepthsV1=1 continua carregando a V1 ({src})', 'GUARDIAN_DEPTHS_V1_DEV' in src and 'GUARDIAN_DEPTHS_V11_DEV' not in src)
        g.goto(GAME, wait_until='commit')
        f = game(g, "!!window.__divine?.scene?.environment?.group")
        g.wait_for_timeout(1500)
        st = f.evaluate("(u => [u.guardianV13 ?? null, u.guardianB ?? null])(window.__divine.scene.environment.group.userData)")
        ok('sem flags nenhuma escultura de desenvolvimento carrega', st == [None, None])
        br.close()
finally:
    real = [e for e in errors if 'presence' not in e and 'friends' not in e]
    print(f'\n{len(passed)} ok · erros de página: {real or "nenhum"}')
    if real: sys.exit(1)
