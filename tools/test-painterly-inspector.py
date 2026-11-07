"""QA do Painterly Material Inspector (Material Studio, STAR HILL local).

uv run -q --with playwright python tools/test-painterly-inspector.py [porta]
Troca preset, mexe num slider, desliga e liga o estilo, salva o projeto e confere data/material-library.json.
Screenshots em docs/img/arena-production/painterly-{on,off,hades}.png. Restaura a biblioteca no fim.
"""
import json
import shutil
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = sys.argv[1] if len(sys.argv) > 1 else '8770'
LIB = ROOT / 'data/material-library.json'
OUT = ROOT / 'docs/img/arena-production'
bak = LIB.read_bytes()
passed, errors = [], []


def ok(name, cond):
    assert cond, name
    passed.append(name); print('ok  ', name)


try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
        page = b.new_page(viewport={'width': 1700, 'height': 1000})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{PORT}/star-hill/#arenas/estudio', wait_until='commit')
        page.wait_for_selector('[data-ms-paint="preset"]', timeout=60000)
        page.wait_for_timeout(1500)
        stage = page.locator('#ms-stage')
        stage.screenshot(path=str(OUT / 'painterly-on.png'))
        u = lambda k: page.evaluate(f"window.__materialStudio.st.palace.paint['{k}'].value")
        page.uncheck('[data-ms-paint="on"]'); page.wait_for_timeout(500)
        ok('desliga o estilo', u('uPaintOn') == 0)
        stage.screenshot(path=str(OUT / 'painterly-off.png'))
        page.check('[data-ms-paint="on"]')
        page.select_option('[data-ms-paint="preset"]', 'hades'); page.wait_for_timeout(500)
        ok('preset Hades aplicado', abs(u('uP_brushStrength') - .42) < 1e-6)
        page.locator('[data-ms-paint="brushStrength"]').fill('0.8'); page.wait_for_timeout(400)
        ok('slider mexe no uniforme', abs(u('uP_brushStrength') - .8) < 1e-6)
        stage.screenshot(path=str(OUT / 'painterly-hades.png'))
        page.click('[data-ms="save-project"]'); page.wait_for_timeout(1200)
        pp = json.loads(LIB.read_text())['projetos']['poseidon-palace-pbr-v1']['painterly']
        ok('salvo no projeto', pp['preset'] == 'hades' and pp['on'] and abs(pp['params']['brushStrength'] - .8) < 1e-6)
        page.reload(wait_until='commit'); page.wait_for_selector('[data-ms-paint="preset"]', timeout=60000); page.wait_for_timeout(800)
        ok('volta ao abrir de novo', abs(u('uP_brushStrength') - .8) < 1e-6 and page.locator('[data-ms-paint="preset"]').input_value() == 'hades')
        b.close()
    ok('sem erros de página', not errors)
finally:
    LIB.write_bytes(bak)
print(f'\n{len(passed)} testes ok', errors[:3])
