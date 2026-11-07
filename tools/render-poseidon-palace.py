"""Renderiza o Palácio de Poseidon na prévia fixa (tools/poseidon-palace-preview.html) e grava PNGs para comparar.

uv run -q --with playwright python tools/render-poseidon-palace.py <rotulo> [orig_js_url] [base]
"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / 'docs/img/poseidon-beauty'
OUT.mkdir(parents=True, exist_ok=True)
label = sys.argv[1]
orig = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '-' else ''
base = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8770'
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, channel='chrome', args=['--use-angle=metal', '--ignore-gpu-blocklist'])
    page = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    page.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    page.on('pageerror', lambda e: errs.append(str(e)))
    for luz, cam in (('jogo', 'heroi'), ('jogo', 'frontao'), ('jogo', 'lado'), ('estudio', 'heroi')):
        url = f'{base}/tools/poseidon-palace-preview.html?luz={luz}&cam={cam}' + (f'&orig={orig}' if orig else '')
        page.goto(url)
        page.wait_for_function('() => window.done', timeout=60000)
        page.locator('canvas').screenshot(path=str(OUT / f'{label}-{luz}-{cam}.png'))
        res[f'{luz}-{cam}'] = page.evaluate('() => window.result')
    b.close()
print(json.dumps({'res': res, 'erros': errs[:5]}, ensure_ascii=False))
