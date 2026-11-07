"""QA do Cinematic Sequence Editor (Arena Forge → Produção → Cinemática), no STAR HILL local.

uv run -q --with playwright python tools/test-cinematic-editor.py [porta]
Abre a abertura de Poseidon, vê uma chave na câmera real, muda o FOV ao vivo, toca, pula, gera o storyboard e salva.
Devolve o projeto e o arquivo da abertura ao estado anterior. Screenshots em docs/img/arena-cinematic/editor-*.png.
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = sys.argv[1] if len(sys.argv) > 1 else '8770'
OUT = ROOT / 'docs/img/arena-cinematic'
CINE = ROOT / 'arena-forge/cinematics/poseidon.json'
PROJ = ROOT / 'data/arena-production/poseidon-palace.json'
keep = {p: p.read_bytes() if p.exists() else None for p in (CINE, PROJ)}
passed, errors = [], []


def ok(name, cond):
    assert cond, name
    passed.append(name); print('ok  ', name)


def game(page):
    f = page.frame_locator('#ap-game')
    return next(fr for fr in page.frames if 'playtest/divine' in fr.url)


try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
        page = b.new_page(viewport={'width': 1700, 'height': 1050})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('dialog', lambda d: d.accept())
        page.goto(f'http://127.0.0.1:{PORT}/star-hill/#arenas/producao', wait_until='commit')
        page.wait_for_selector('[data-mode="cinematica"]', timeout=30000)
        page.click('[data-mode="cinematica"]')
        page.wait_for_selector('.ap-keys tbody tr', timeout=90000)
        rows = page.locator('.ap-keys tbody tr').count()
        ok('tabela com as chaves e a competitiva bloqueada', rows >= 3 and page.locator('.ap-keys tbody tr').last.locator('input[data-kf="fov"]').is_disabled())
        page.click('[data-cine="pose"][data-k="1"]'); page.wait_for_timeout(700)
        sc = lambda js: game(page).evaluate(f'window.__divine.scene.{js}')
        ok('Ver mostra a chave na câmera cinematográfica', sc('cinematicPlaying') is False and game(page).evaluate('window.__divine.scene.composition().camera.fov') == 42)
        page.locator('input[data-kf="fov"][data-k="1"]').fill('62'); page.locator('input[data-kf="fov"][data-k="1"]').dispatch_event('change')
        page.wait_for_timeout(600)
        page.screenshot(path=str(OUT / 'editor-chave.png'))
        page.click('[data-cine="play"]'); page.wait_for_timeout(1500)
        ok('Tocar roda a abertura', sc('cinematicPlaying'))
        page.screenshot(path=str(OUT / 'editor-tocando.png'))
        page.click('[data-cine="skip"]'); page.wait_for_timeout(500)
        ok('Pular termina na câmera competitiva', not sc('cinematicPlaying') and sc('composition().camera.position') == [0, 13.5, 13])
        page.click('[data-cine="storyboard"]')
        page.wait_for_function("document.querySelector('#ap-left').textContent.includes('Storyboard Artboard V')", timeout=60000)
        p = json.loads(PROJ.read_text())
        st = [a for a in p['artboards'] if a.get('tipo') == 'storyboard']
        ok('storyboard vira artboard do tipo Storyboard', st and (ROOT / st[-1]['arquivo'].lstrip('/')).is_file())
        (OUT / 'editor-storyboard.png').write_bytes((ROOT / st[-1]['arquivo'].lstrip('/')).read_bytes())
        page.click('[data-cine="save"]'); page.wait_for_timeout(1200)
        k = json.loads(CINE.read_text())['keys']
        ok('salvar grava o FOV editado no arquivo do jogo', k[1]['fov'] == 62 and k[-1]['locked'] and k[-1]['fov'] == 42)
        b.close()
    ok('sem erros de página', not errors)
finally:
    for path, data in keep.items():
        if data is None:
            path.unlink(missing_ok=True)
        else:
            path.write_bytes(data)
print(f'\n{len(passed)} testes ok', errors[:3])
