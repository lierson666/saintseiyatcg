"""QA do Sculpture Studio (Arena Forge → Sculpture Studio) e do Guardian of the Tides no mundo (só dev).

uv run -q --with playwright python tools/test-sculpture-studio.py [porta]
1. Inspetor: carrega o GLB LOD0, confere partes nomeadas, orçamento de triângulos, vistas, wireframe, modos de
   material, troca de LOD, escala e captura. Screenshots em docs/img/sculpture-studio/inspector-*.png.
2. Mundo: abre o palácio com ?sculptV13=1, confere que o GLB carregou em LandmarkArchitecture e posa as chaves
   0, 1 e 2 da cinemática original. Sem a flag, confere que o guardião NÃO carrega e a câmera competitiva é a de sempre.
Não grava nada no projeto.
"""
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = sys.argv[1] if len(sys.argv) > 1 else '8770'
OUT = ROOT / 'docs/img/sculpture-studio'
OUT.mkdir(parents=True, exist_ok=True)
PARTS = ['TIDES__PEDESTAL', 'TIDES__WAVES', 'TIDES__BODY', 'TIDES__FACE', 'TIDES__HAIR_BEARD', 'TIDES__CLOTH', 'TIDES__HAND_GRIP', 'TIDES__TRIDENT', 'TIDES__DETAILS']
GAME = f'http://127.0.0.1:{PORT}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1'
passed, errors = [], []


def ok(name, cond):
    assert cond, name
    passed.append(name); print('ok  ', name)


def game(page, cond="!!window.__divine?.scene"):
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


def tris(page):
    return page.evaluate('window.__sculptureStudio.stats().tri')


try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
        page = b.new_page(viewport={'width': 1700, 'height': 1050})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{PORT}/star-hill/#arenas/escultura', wait_until='commit')
        page.wait_for_function("window.__sculptureStudio && window.__sculptureStudio.stats()", timeout=90000)
        page.wait_for_timeout(800)
        names = page.evaluate("[...document.querySelectorAll('[data-ss=nodes] label')].map(l => l.textContent.trim())")
        ok('as 9 partes nomeadas do V12 estão no GLB', all(p in names for p in PARTS))
        t0 = tris(page)
        ok(f'LOD0 entre 15k e 30k triângulos ({t0})', 15000 <= t0 <= 30000)
        dims = page.locator('[data-ss=dims]').text_content()
        import re
        w, h, d, y0 = map(float, re.findall(r'-?\d+\.\d+', dims))
        ok(f'escala de mundo: {dims}', 9.0 <= h <= 10.5 and abs(y0) < 0.05 and w < 4 and d < 4)   # tridente ~10 m, pivô na base
        calls = int(page.evaluate("[...document.querySelectorAll('[data-ss=metrics] tr')].find(r => r.textContent.startsWith('Draw calls')).cells[1].textContent"))
        ok(f'draw calls medidos ({calls})', 0 < calls <= 40)
        for v in ['frente', 'costas', 'esquerda', 'direita', 'tres-quartos']:
            page.click(f'[data-view="{v}"]'); page.wait_for_timeout(500)
            page.locator('[data-ss=stage]').screenshot(path=str(OUT / f'inspector-{v}.png'))
        ok('vistas frente/costas/laterais/3-4 capturadas', all((OUT / f'inspector-{v}.png').stat().st_size > 20000 for v in ['frente', 'costas', 'esquerda', 'direita', 'tres-quartos']))
        page.click('[data-ss-act="wire"]'); page.wait_for_timeout(300)
        ok('wireframe liga', page.get_attribute('[data-ss-act=wire]', 'aria-pressed') == 'true')
        page.locator('[data-ss=stage]').screenshot(path=str(OUT / 'inspector-wireframe.png'))
        page.click('[data-ss-act="wire"]')
        page.select_option('[data-ss=mode]', 'argila'); page.wait_for_timeout(400)
        page.locator('[data-ss=stage]').screenshot(path=str(OUT / 'inspector-argila.png'))
        page.select_option('[data-ss=mode]', 'textura')
        page.fill('[data-ss=scale]', '0.5'); page.dispatch_event('[data-ss=scale]', 'input'); page.wait_for_timeout(200)
        page.fill('[data-ss=scale]', '1'); page.dispatch_event('[data-ss=scale]', 'input')
        page.wait_for_function("[...document.querySelectorAll('[data-ss=lods] tr')].length >= 5", timeout=90000)
        lods = page.locator('[data-ss=lods]').text_content()
        ok('tabela compara os 4 GLB', 'não gerado' not in lods)
        page.select_option('[data-ss=lod]', 'lod2')
        page.wait_for_function("document.querySelector('[data-ss=src]').textContent.includes('lod2')", timeout=60000); page.wait_for_timeout(500)
        t2 = tris(page)
        ok(f'LOD2 ≤ 3000 triângulos ({t2})', t2 <= 3000)
        page.select_option('[data-ss=lod]', 'lod1')
        page.wait_for_function("document.querySelector('[data-ss=src]').textContent.includes('lod1')", timeout=60000); page.wait_for_timeout(500)
        t1 = tris(page)
        ok(f'LOD1 entre 5k e 10k ({t1})', 5000 <= t1 <= 10000)
        with page.expect_download() as d:
            page.click('[data-ss-act="shot"]')
        ok('captura gera PNG', d.value.suggested_filename.endswith('.png'))
        page.screenshot(path=str(OUT / 'inspector-tela.png'))

        # mundo: sem a flag o guardião não entra
        g = b.new_page(viewport={'width': 1600, 'height': 900})
        g.on('pageerror', lambda e: errors.append(str(e)))
        g.goto(GAME, wait_until='commit')
        f = game(g, "!!window.__divine?.scene?.composition?.().mundo")
        g.wait_for_timeout(3000)
        c = f.evaluate('window.__divine.scene.composition()')
        ok('sem ?sculptV13=1 nada é carregado', c.get('guardianV13') is None)
        ok('câmera competitiva intocada (FOV 42, (0,13.5,13))', c['camera']['fov'] == 42 and c['camera']['position'] == [0, 13.5, 13])
        g.goto(GAME + '&sculptV13=1', wait_until='commit')
        f = game(g, "(s => s && s !== 'loading')(window.__divine?.scene?.composition?.().guardianV13)")
        ok('com ?sculptV13=1 o GLB carrega no mundo', f.evaluate('window.__divine.scene.composition().guardianV13') == 'ready')
        g.wait_for_timeout(2500)
        import base64, json
        keys = f.evaluate('window.__divine.scene.cinematicKeys')
        shot = lambda name: (OUT / name).write_bytes(base64.b64decode(f.evaluate('window.__divine.scene.snapshot(1600)').split(',', 1)[1]))
        for k in (0, 1, 2):   # chaves originais da cinemática: o guardião aparece na câmera cinematográfica, sem HUD
            f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(keys[k])})'); g.wait_for_timeout(1500)
            shot(f'mundo-cinematica-chave{k}.png')
        f.evaluate('window.__divine.scene.poseCinematic(null)'); g.wait_for_timeout(1000)
        shot('mundo-partida.png')
        ok('chaves 0-2 e partida capturadas', all((OUT / n).stat().st_size > 20000 for n in ['mundo-cinematica-chave0.png', 'mundo-cinematica-chave1.png', 'mundo-cinematica-chave2.png', 'mundo-partida.png']))
        c = f.evaluate('window.__divine.scene.composition()')
        ok('com o guardião a câmera competitiva continua a mesma', c['camera']['fov'] == 42 and c['camera']['position'] == [0, 13.5, 13])
        b.close()
finally:
    real = [e for e in errors if 'presence' not in e and 'friends' not in e]
    print(f'\n{len(passed)} ok · erros de página: {real or "nenhum"}')
    if real: sys.exit(1)
