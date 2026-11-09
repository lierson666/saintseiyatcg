"""Capturas idênticas do Palácio de Poseidon para a auditoria e o gate da V15 (08/11/2026).

Mesma página, mesma resolução e as mesmas câmeras para as duas versões:
- chaves 0, 1 e 2 da cinemática (arena-forge/cinematics/poseidon.json);
- 8 câmeras de auditoria (fachada e frontão, colunas, escadaria, pedestais, Grande Pilar, oceano, rochas e borda, piso);
- a partida com as cartas (câmera competitiva, captura da página inteira com a HUD).
Saída: docs/img/poseidon-v15/<tag>-<vista>.jpg (mundo sem HUD em 1600 px de largura).

Uso: uv run -q --with playwright python tools/capture-poseidon-v15.py 8770 base
     uv run -q --with playwright python tools/capture-poseidon-v15.py 8770 v15 --flags '&palaceV15=1'
     uv run -q --with playwright python tools/capture-poseidon-v15.py 8770 v151m --flags '&palaceV15=1' --mobile
"""
import base64, json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT, TAG = sys.argv[1], sys.argv[2]
FLAGS = sys.argv[sys.argv.index('--flags') + 1] if '--flags' in sys.argv else ''
MOBILE = '--mobile' in sys.argv  # V15.1: celular emulado (390 × 844, toque, perfil phone); só chaves e partida
OUT = ROOT / 'docs/img/poseidon-v15'
OUT.mkdir(parents=True, exist_ok=True)
GAME = f'http://127.0.0.1:{PORT}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1&sculptV141=1&sculptDepthsV11=1'
# Câmeras de auditoria (coordenadas da partida): pos, look, fov.
AUDIT = {
    'fachada': {'pos': [0, 15.5, -15], 'look': [0, 17.5, -40], 'fov': 46},
    'colunas': {'pos': [-13.5, 9, -25], 'look': [-6.5, 10, -38], 'fov': 44},
    'escadaria': {'pos': [9, 4.5, -11], 'look': [0, 3, -28], 'fov': 46},
    'pedestais': {'pos': [-2, 7.5, -22], 'look': [-10.8, 6.5, -34.8], 'fov': 44},
    'pilar': {'pos': [0, 22, -30], 'look': [0, 30, -74], 'fov': 50},
    'oceano': {'pos': [0, 9, -8], 'look': [0, 37, -60], 'fov': 62},
    'rochas': {'pos': [21, 6, 4], 'look': [27, 1, -18], 'fov': 50},
    'piso': {'pos': [0, 9, 9], 'look': [0, 0, -4], 'fov': 50},
}
READY = ("(e => e && ['ready','unavailable'].includes(e.group.userData.guardianB) && e.group.userData.guardianV13 && e.group.userData.guardianV13 !== 'loading'"
         " && e.group.userData.capitalV8 !== 'loading' && e.group.userData.portalV9 !== 'loading')(window.__divine?.scene?.environment)")


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


def save(f, name):
    url = f.evaluate('window.__divine.scene.snapshot(1600)')
    from io import BytesIO
    from PIL import Image
    Image.open(BytesIO(base64.b64decode(url.split(',', 1)[1]))).convert('RGB').save(OUT / f'{TAG}-{name}.jpg', quality=86)


with sync_playwright() as pw:
    br = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True) if MOBILE else br.new_context(viewport={'width': 1600, 'height': 900}, device_scale_factor=1)
    if not MOBILE: ctx.add_init_script("try { const k='ssTcgOlympusArena', s=JSON.parse(localStorage.getItem(k)||'{}'); s.quality='high'; localStorage.setItem(k, JSON.stringify(s)); } catch {}")
    p = ctx.new_page()
    errs = []
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(GAME + FLAGS, wait_until='commit')
    f = game(p, READY)
    p.wait_for_timeout(3000)
    keys = f.evaluate('window.__divine.scene.cinematicKeys')
    for i in range(3):
        f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(keys[i])})'); p.wait_for_timeout(700); save(f, f'chave{i}')
    for k, cam in ({'pedestais': AUDIT['pedestais']} if MOBILE else AUDIT).items():
        f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(cam)})'); p.wait_for_timeout(700); save(f, k)
    f.evaluate('window.__divine.scene.poseCinematic(null)'); p.wait_for_timeout(1500)
    save(f, 'partida')
    p.screenshot(path=str(OUT / f'{TAG}-partida-cartas.jpg'), quality=86)
    audit = f.evaluate('window.__divine.scene.environment && JSON.stringify(window.__divine.scene.composition())')
    print('composição:', audit)
    print('erros de página:', errs)
    br.close()
print('ok', TAG, len(list(OUT.glob(f'{TAG}-*.jpg'))), 'imagens')
