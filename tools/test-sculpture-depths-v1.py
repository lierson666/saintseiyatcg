"""QA do Guardião das Profundezas V1 (modelagem detalhada, só desenvolvimento).

uv run -q --with playwright python tools/test-sculpture-depths-v1.py [porta]
1. Inspetor (STAR HILL → Arena Forge → Sculpture Studio): escolhe "Profundezas V1 · LOD0", confere as 9 partes, o
   orçamento, a escala de mundo e captura as 5 vistas com material em docs/img/sculpture-studio/guardian-depths/v1-material-*.png.
2. Mundo: ?sculptV141=1&sculptDepthsV1=1 carrega as duas posições; posa as chaves 0, 1 e 2 da cinemática original e a
   partida. Confere a câmera competitiva (FOV 42 em (0, 13.5, 13)) e que sem ?sculptDepthsV1 o GLB V1 não carrega.
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
V1 = '../poseidon-depths-v1/guardian-depths-lod0'
VIEWS = ['frente', 'costas', 'esquerda', 'direita', 'tres-quartos']
passed, errors = [], []


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


try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
        page = b.new_page(viewport={'width': 1700, 'height': 1050})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{PORT}/star-hill/#arenas/escultura', wait_until='commit')
        page.wait_for_function("window.__sculptureStudio && window.__sculptureStudio.stats()", timeout=90000)
        page.select_option('[data-ss=lod]', V1)
        page.wait_for_function("document.querySelector('[data-ss=src]').textContent.includes('guardian-depths-lod0')", timeout=60000)
        page.wait_for_timeout(1500)
        names = page.evaluate("[...document.querySelectorAll('[data-ss=nodes] label')].map(l => l.textContent.trim())")
        ok('V1: as 9 partes nomeadas estão no GLB', all(p in names for p in PARTS))
        t0 = page.evaluate('window.__sculptureStudio.stats().tri')
        ok(f'V1 LOD0 até 30k triângulos ({t0})', 15000 <= t0 <= 30000)
        dims = page.locator('[data-ss=dims]').text_content()
        w, h, d, y0 = map(float, re.findall(r'-?\d+\.\d+', dims))
        ok(f'V1 escala de mundo: {dims}', 8.0 <= h <= 10.5 and abs(y0) < 0.05 and w < 5.6 and d < 4)   # largura: tridente na diagonal e braço estendido (silhueta aprovada)
        for v in VIEWS:
            page.click(f'[data-view="{v}"]'); page.wait_for_timeout(500)
            page.locator('[data-ss=stage]').screenshot(path=str(OUT / f'v1-material-{v}.png'))
        ok('V1 vistas com material capturadas', all((OUT / f'v1-material-{v}.png').stat().st_size > 20000 for v in VIEWS))

        g = b.new_page(viewport={'width': 1600, 'height': 900})
        g.on('pageerror', lambda e: errors.append(str(e)))
        g.goto(GAME + '&sculptV141=1&sculptDepthsV1=1', wait_until='commit')
        f = game(g, "(e => e && ['ready','unavailable'].includes(e.group.userData.guardianB) && e.group.userData.guardianV13 && e.group.userData.guardianV13 !== 'loading')(window.__divine?.scene?.environment)")
        st = f.evaluate("(u => [u.guardianV13, u.guardianB])(window.__divine.scene.environment.group.userData)")
        ok(f'com ?sculptDepthsV1=1 a V1 carrega na posição B, ao lado da V14.1 ({st})', st == ['ready', 'ready'])
        src = f.evaluate("(() => { const n = []; window.__divine.scene.environment.group.traverse(o => { if (o.name && o.name.startsWith('GUARDIAN_DEPTHS')) n.push(o.name); }); return n; })()")
        ok(f'a posição B usa o GLB V1, não a argila ({src})', 'GUARDIAN_DEPTHS_V1_DEV' in src and 'GUARDIAN_DEPTHS_CLAY_DEV' not in src)
        g.wait_for_timeout(2500)
        keys = f.evaluate('window.__divine.scene.cinematicKeys')
        shot = lambda name: (OUT / name).write_bytes(base64.b64decode(f.evaluate('window.__divine.scene.snapshot(1600)').split(',', 1)[1]))
        for k in (0, 1, 2):
            f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(keys[k])})'); g.wait_for_timeout(1500)
            shot(f'v1-mundo-chave{k}.png')
        f.evaluate('window.__divine.scene.poseCinematic(null)'); g.wait_for_timeout(1000)
        shot('v1-mundo-partida.png')
        ok('V1 chaves 0-2 e partida capturadas', all((OUT / n).stat().st_size > 20000 for n in ['v1-mundo-chave0.png', 'v1-mundo-chave1.png', 'v1-mundo-chave2.png', 'v1-mundo-partida.png']))
        c = f.evaluate('window.__divine.scene.composition()')
        ok('com a V1 a câmera competitiva continua a mesma', c['camera']['fov'] == 42 and c['camera']['position'] == [0, 13.5, 13])

        g.goto(GAME, wait_until='commit')
        f = game(g, "!!window.__divine?.scene?.environment?.group")
        g.wait_for_timeout(1500)
        st = f.evaluate("(u => [u.guardianV13 ?? null, u.guardianB ?? null])(window.__divine.scene.environment.group.userData)")
        ok('sem flags nenhuma escultura de desenvolvimento carrega', st == [None, None])
        b.close()
finally:
    real = [e for e in errors if 'presence' not in e and 'friends' not in e]
    print(f'\n{len(passed)} ok · erros de página: {real or "nenhum"}')
    if real: sys.exit(1)
