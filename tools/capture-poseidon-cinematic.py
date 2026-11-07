"""Capturas da cinemática de Poseidon e da partida (IMMERSIVE WORLD V1).

uv run -q --with playwright python tools/capture-poseidon-cinematic.py <rótulo> [porta]
Gera docs/img/arena-cinematic/<rótulo>-chave-<n>.png (pose fixa de cada chave, sem HUD),
<rótulo>-tempo-{inicio,meio,fim}.png (a abertura rodando de verdade), <rótulo>-partida.png e <rótulo>-celular.png,
e confere: câmera competitiva intacta ao fim, skip, reduzir movimento e custo de GPU.
"""
import json
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'atual'
PORT = sys.argv[2] if len(sys.argv) > 2 else '8770'
OUT = ROOT / 'docs/img/arena-cinematic'
OUT.mkdir(parents=True, exist_ok=True)
BASE = f'http://127.0.0.1:{PORT}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate'
report = {}


def game(page, cond="!!window.__divine?.scene"):
    for _ in range(400):
        for f in page.frames:
            try:
                if f.evaluate(cond):
                    return f
            except Exception:
                pass
        time.sleep(.1)
    raise RuntimeError('jogo não carregou')


with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
    page = b.new_page(viewport={'width': 1600, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # 1. Abertura de verdade, em tempo real
    page.goto(BASE, wait_until='commit')
    f = game(page, "!!window.__divine?.scene?.cinematicPlaying")
    t0 = time.time()
    for name, at in [('inicio', .4), ('meio', 4.2), ('fim', 7.6)]:
        time.sleep(max(0, at - (time.time() - t0)))
        page.screenshot(path=str(OUT / f'{LABEL}-tempo-{name}.png'))
    for _ in range(200):
        if not f.evaluate("window.__divine.scene.cinematicPlaying"):
            break
        time.sleep(.1)
    report['duracao_s'] = round(time.time() - t0, 1)
    time.sleep(3)
    page.screenshot(path=str(OUT / f'{LABEL}-depois-moeda.png'))
    # 2. Pose de cada chave (sem HUD, só o mundo)
    keys = f.evaluate("window.__divine.scene.cinematicKeys")
    report['chaves'] = [k['stage'] for k in keys]
    for i, k in enumerate(keys):
        f.evaluate(f"window.__divine.scene.poseCinematic({json.dumps(k)})")
        time.sleep(.5)
        data = f.evaluate("window.__divine.scene.snapshot(1600)")
        import base64
        (OUT / f'{LABEL}-chave-{i}.webp').write_bytes(base64.b64decode(data.split(',')[1]))
    f.evaluate("window.__divine.scene.poseCinematic(null)")
    # 3. Skip: começa de novo e pula; precisa terminar na câmera competitiva
    f.evaluate("window.__cineEnd = null; window.__divine.scene.cinematic().then(v => window.__cineEnd = v)")
    time.sleep(1.2)
    f.evaluate("window.__divine.scene.skipCinematic()")
    time.sleep(.4)
    report['skip_terminou'] = f.evaluate("window.__cineEnd === true && !window.__divine.scene.cinematicPlaying")
    report['camera_competitiva'] = f.evaluate("window.__divine.scene.composition().camera")
    report['bench'] = f.evaluate("window.__divine.scene.bench(20)")
    report['stats'] = f.evaluate("(({calls, level}) => ({calls, level}))(window.__divine.scene.stats())")
    # 4. Partida sem abertura (mesmo mundo, câmera competitiva)
    page.goto(BASE + '&noIntro=1', wait_until='commit')
    f = game(page, "!!window.__divine?.scene && !!document.querySelector('.field')")
    time.sleep(2.5)
    page.screenshot(path=str(OUT / f'{LABEL}-partida.png'))
    data = f.evaluate("window.__divine.scene.snapshot(1600)")
    import base64
    (OUT / f'{LABEL}-partida-mundo.webp').write_bytes(base64.b64decode(data.split(',')[1]))
    # 5. Reduzir movimento: corte direto (sem cinemática)
    r = b.new_page(viewport={'width': 1600, 'height': 900}, reduced_motion='reduce')
    r.goto(BASE, wait_until='commit')
    f = game(r, "!!window.__divine?.scene && !!document.querySelector('.field')")
    time.sleep(1.5)
    report['reduzir_movimento_sem_cinematica'] = not f.evaluate("window.__divine.scene.cinematicPlaying")
    # 6. Celular
    m = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
    m.goto(BASE + '&noIntro=1&quality=phone', wait_until='commit')
    fm = game(m, "!!window.__divine?.scene && !!document.querySelector('.field')")
    time.sleep(2.5)
    m.screenshot(path=str(OUT / f'{LABEL}-celular.png'))
    report['celular'] = fm.evaluate("(({calls, level, fps}) => ({calls, level, fps}))(window.__divine.scene.stats())")
    report['erros'] = errors[:5]
    b.close()
print(json.dumps(report, ensure_ascii=False, indent=1))
