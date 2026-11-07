"""Captura o Palácio de Poseidon na partida real (câmera competitiva), para comparar antes/depois.

uv run -q --with playwright python tools/capture-poseidon-palace.py <rotulo> [base_url]
Grava docs/img/poseidon-beauty/<rotulo>-{cena,partida,golpe,celular}.png e imprime métricas (draw calls, ms de GPU, erros).
"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/img/poseidon-beauty'
label = sys.argv[1]
base = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8770'
URL = base + '/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1'


def frame_of(page):
    for _ in range(240):
        for f in page.frames:
            try:
                if f.evaluate('() => !!(window.__divine && window.__divine.scene)'):
                    return f
            except Exception:
                pass
        time.sleep(.25)
    raise SystemExit('a partida não abriu a cena 3D')


def shot(page, fr, name):
    data = fr.evaluate('() => window.__divine.scene.snapshot(1280)')
    import base64
    (OUT / f'{label}-{name}.png').write_bytes(base64.b64decode(data.split(',')[1]))


report = {}
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, channel='chrome', args=['--use-angle=metal', '--ignore-gpu-blocklist'])
    for name, vp, quality in (('desktop', (1280, 720), 'high'), ('celular', (812, 375), 'phone')):
        page = b.new_page(viewport={'width': vp[0], 'height': vp[1]})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
        page.add_init_script(f"localStorage.setItem('ssTcgOlympusArena', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('ssTcgOlympusArena')||'{{}}'), {{quality: '{quality}'}})))")
        page.goto(URL, wait_until='commit', timeout=60000)
        fr = frame_of(page)
        time.sleep(4)
        st = fr.evaluate('() => ({stats: window.__divine.scene.stats(), bench: window.__divine.scene.bench(20), comp: window.__divine.scene.composition ? window.__divine.scene.composition() : null})')
        if name == 'desktop':
            shot(page, fr, 'cena')
            page.screenshot(path=str(OUT / f'{label}-partida.png'))
            fr.evaluate('() => { const s = window.__divine.scene, x = innerWidth / 2, y = innerHeight / 2; s.fx.charge(x, y, {color: "#9fe8ff"}); setTimeout(() => { s.fx.burst(x, y, {color: "#dff8ff"}); s.fx.shockwave(x, y); }, 450); }')
            time.sleep(.75)
            page.screenshot(path=str(OUT / f'{label}-golpe.png'))
        else:
            page.screenshot(path=str(OUT / f'{label}-celular.png'))
        report[name] = {'stats': st['stats'], 'bench': st['bench'], 'comp': st['comp'], 'erros': errors[:5]}
        page.close()
    b.close()
print(json.dumps(report, ensure_ascii=False))
