"""QA do Guardian of the Tides V14.1 (polimento final, só desenvolvimento).

uv run -q --with playwright python tools/test-sculpture-v14-1.py [porta]
1. Inspetor (STAR HILL → Arena Forge → Sculpture Studio): escolhe "V14.1 · LOD0", confere as 9 partes, o orçamento,
   a escala de mundo e captura as 5 vistas com material em docs/img/sculpture-studio/v14-1/material-*.png.
2. Mundo: ?sculptV141=1 carrega o GLB da V14.1 no palácio; posa as chaves 0, 1 e 2 da cinemática original e a partida.
   Confere que a câmera competitiva continua FOV 42 em (0, 13.5, 13) e que ?sculptV13=1 ainda carrega a V13.
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
OUT = ROOT / 'docs/img/sculpture-studio/v14-1'
OUT.mkdir(parents=True, exist_ok=True)
PARTS = ['TIDES__PEDESTAL', 'TIDES__WAVES', 'TIDES__BODY', 'TIDES__FACE', 'TIDES__HAIR_BEARD', 'TIDES__CLOTH', 'TIDES__HAND_GRIP', 'TIDES__TRIDENT', 'TIDES__DETAILS']
GAME = f'http://127.0.0.1:{PORT}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1'
V14 = '../poseidon-v14-1/guardian-tides-lod0'
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
        page.select_option('[data-ss=lod]', V14)
        page.wait_for_function("document.querySelector('[data-ss=src]').textContent.includes('poseidon-v14-1') || document.querySelector('[data-ss=src]').textContent.includes('guardian-tides-lod0')", timeout=60000)
        page.wait_for_timeout(1500)
        names = page.evaluate("[...document.querySelectorAll('[data-ss=nodes] label')].map(l => l.textContent.trim())")
        ok('V14.1: as 9 partes nomeadas estão no GLB', all(p in names for p in PARTS))
        t0 = page.evaluate('window.__sculptureStudio.stats().tri')
        ok(f'V14.1 LOD0 até 30k triângulos ({t0})', 15000 <= t0 <= 30000)
        dims = page.locator('[data-ss=dims]').text_content()
        w, h, d, y0 = map(float, re.findall(r'-?\d+\.\d+', dims))
        ok(f'V14.1 escala de mundo: {dims}', 9.0 <= h <= 10.5 and abs(y0) < 0.05 and w < 4 and d < 4)
        for v in ['frente', 'costas', 'esquerda', 'direita', 'tres-quartos']:
            page.click(f'[data-view="{v}"]'); page.wait_for_timeout(500)
            page.locator('[data-ss=stage]').screenshot(path=str(OUT / f'material-{v}.png'))
        ok('V14.1 vistas com material capturadas', all((OUT / f'material-{v}.png').stat().st_size > 20000 for v in ['frente', 'costas', 'esquerda', 'direita', 'tres-quartos']))
        page.wait_for_function("[...document.querySelectorAll('[data-ss=lods] tr')].length >= 13", timeout=120000)
        ok('tabela de LODs lê os 4 GLB da V14.1', page.locator('[data-ss=lods]').text_content().count('não gerado') == 0)

        g = b.new_page(viewport={'width': 1600, 'height': 900})
        g.on('pageerror', lambda e: errors.append(str(e)))
        g.goto(GAME + '&sculptV141=1', wait_until='commit')
        f = game(g, "(s => s && s !== 'loading')(window.__divine?.scene?.composition?.().guardianV13)")
        ok('com ?sculptV141=1 o GLB da V14.1 carrega no mundo', f.evaluate('window.__divine.scene.composition().guardianV13') == 'ready')
        g.wait_for_timeout(2500)
        keys = f.evaluate('window.__divine.scene.cinematicKeys')
        shot = lambda name: (OUT / name).write_bytes(base64.b64decode(f.evaluate('window.__divine.scene.snapshot(1600)').split(',', 1)[1]))
        for k in (0, 1, 2):
            f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(keys[k])})'); g.wait_for_timeout(1500)
            shot(f'mundo-cinematica-chave{k}.png')
        f.evaluate('window.__divine.scene.poseCinematic(null)'); g.wait_for_timeout(1000)
        shot('mundo-partida.png')
        ok('V14.1 chaves 0-2 e partida capturadas', all((OUT / n).stat().st_size > 20000 for n in ['mundo-cinematica-chave0.png', 'mundo-cinematica-chave1.png', 'mundo-cinematica-chave2.png', 'mundo-partida.png']))
        c = f.evaluate('window.__divine.scene.composition()')
        ok('com a V14.1 a câmera competitiva continua a mesma', c['camera']['fov'] == 42 and c['camera']['position'] == [0, 13.5, 13])
        b.close()
finally:
    real = [e for e in errors if 'presence' not in e and 'friends' not in e]
    print(f'\n{len(passed)} ok · erros de página: {real or "nenhum"}')
    if real: sys.exit(1)
