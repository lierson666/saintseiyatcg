"""ARENA FORGE 5.0 no navegador real (Chrome headless), com servidor e biblioteca temporários.

uv run --with playwright python tools/test-arena-forge-ui.py
Partida: todas as arenas publicadas em 3 telas (render, câmera, zonas protegidas, draw calls), troca de arena,
?arena= imposta, reduzir movimento, manifesto ausente e corrompido (fallback). STAR HILL: validar, aprovar,
publicar e voltar versão gravando só na pasta temporária (ARENA_DATA_DIR). Não toca em data/ do projeto.
"""
import json
import os
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
VIEWS = [(1280, 720), (375, 812), (812, 375)]
results = []


def check(name, ok, detail=''):
    results.append({'teste': name, 'ok': bool(ok), 'detalhe': detail})
    print(('ok   ' if ok else 'FALHA ') + name + (f' — {detail}' if detail else ''))


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def game(page, url, errors):
    """Abre a partida e devolve o frame onde ela roda (no desktop o stage-fit a coloca num iframe)."""
    page.goto(url, wait_until='commit', timeout=60000)
    for _ in range(240):
        for f in page.frames:
            try:
                if f.evaluate('() => !!(window.__divine && window.__divine.scene)'):
                    return f
            except Exception:
                pass
        time.sleep(.25)
    raise AssertionError('a partida não abriu a cena 3D')


def main():
    tmp = Path(tempfile.mkdtemp())
    for f in ('data/arena-library.json', 'data/arenas-published.json'):
        (tmp / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT / f, tmp / f)
    port = free_port()
    server = subprocess.Popen(['/usr/bin/python3', 'card-forge/serve.py'], cwd=ROOT, env={**os.environ, 'PORT': str(port), 'ARENA_DATA_DIR': str(tmp)},
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f'http://localhost:{port}'
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(base + '/star-hill/', timeout=1)
                break
            except OSError:
                time.sleep(.2)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, channel='chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            for w, h in VIEWS:
                page = browser.new_page(viewport={'width': w, 'height': h})
                errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: m.type == 'error' and any(k in m.text for k in ('scene', 'arena', 'THREE', 'WebGL', 'shader')) and errors.append(m.text))
                fr = game(page, f'{base}/playtest/divine/?demo=ultimate', errors)
                report = fr.evaluate('''() => { const s = window.__divine.scene, out = {};
                  return import('/playtest/divine/scene.js?v=20261107-af5').then(m => {
                    for (const k of Object.keys(m.THEMES).filter(k => !k.startsWith('__'))) { s.setTheme(k); const a = s.audit(), st = s.stats(); out[k] = {calls: st.calls, hits: a.zoneHits, luma: a.luma, shader: a.shaderErrors}; }
                    return out; }); }''')
                bad = {k: v for k, v in report.items() if v['hits'] or v['calls'] > 16 or v['calls'] < 3 or v['shader']}
                check(f'{w}x{h}: {len(report)} arenas renderizam, câmera ok, campo livre, <=16 draw calls', not bad and len(report) >= 7, json.dumps(bad) if bad else '')
                frames = fr.evaluate('''async () => { const s = window.__divine.scene; s.reduceMotion = true; await new Promise(r => setTimeout(r, 300));
                  const f0 = s.frames(); await new Promise(r => setTimeout(r, 800)); const f1 = s.frames(); s.reduceMotion = false; return f1 - f0; }''')
                check(f'{w}x{h}: reduzir movimento para a arena', frames <= 1, f'{frames} quadros em 0,8 s')
                check(f'{w}x{h}: sem erro de cena no console', not errors, '; '.join(errors[:3]))
                page.close()

            page = browser.new_page(viewport={'width': 1280, 'height': 720})
            fr = game(page, f'{base}/playtest/divine/?demo=ultimate&arena=elysion', [])
            check('arena imposta pela partida (?arena=elysion)', fr.evaluate("() => document.querySelector('.stage').dataset.theme") == 'elysion')
            page.close()

            page = browser.new_page(viewport={'width': 1280, 'height': 720})
            page.route('**/arenas-published.json*', lambda r: r.fulfill(status=404, body='nope'))
            st = game(page, f'{base}/playtest/divine/?demo=ultimate', []).evaluate('() => window.__divine.scene.stats()')
            check('manifesto ausente: partida abre com os temas do código', st['calls'] >= 3, f"{st['calls']} draw calls")
            page.close()

            man = json.loads((ROOT / 'data/arenas-published.json').read_text())
            man['arenas'][1]['requer'] = 99
            page = browser.new_page(viewport={'width': 1280, 'height': 720})
            page.route('**/arenas-published.json*', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(man)))
            fb = game(page, f'{base}/playtest/divine/?demo=ultimate', []).evaluate("() => import('/playtest/divine/scene.js?v=20261107-af5').then(m => !!m.THEMES[" + json.dumps(man['arenas'][1]['id']) + "].fallback)")
            check('manifesto de versão futura: fallback visual para o tema do código', fb)
            page.close()

            # Arena do deck: o deck guarda `arena` e a partida local usa (prioridade deck > perfil).
            page = browser.new_page(viewport={'width': 1280, 'height': 720})
            page.goto(f'{base}/playtest/deck-store.js', wait_until='commit')
            page.evaluate('''() => fetch('/data/alpha-0.1/decks-proposta-d171.json').then(r => r.json()).then(d => {
              localStorage.setItem('sstcg.decks.v1', JSON.stringify([{...d.decks[0], id: 'my-arena-test', nome: 'Arena test', arena: 'artemis'}])); })''')
            fr = game(page, f'{base}/playtest/divine/?deckA=my-arena-test&deckB=my-arena-test&ai=B', [])
            check('arena escolhida no deck abre na partida', fr.evaluate("() => document.querySelector('.stage').dataset.theme") == 'artemis')
            page.close()

            # STAR HILL: validar -> aprovar -> publicar -> voltar versão (só na pasta temporária).
            page = browser.new_page(viewport={'width': 1440, 'height': 900})
            notes = iter(['teste automático'])
            page.on('dialog', lambda d: d.accept(next(notes, '')) if d.type == 'prompt' else d.accept())
            page.goto(f'{base}/star-hill/#arenas', wait_until='domcontentloaded')
            page.click('[data-af5-sel="hades"]')
            page.click('[data-af5-tab="pipeline"]')
            page.click('[data-af5="validate"]')
            page.wait_for_selector('.af5-gate li', timeout=60000)
            page.wait_for_function("() => document.querySelector('[data-af5=validate]') && !document.querySelector('[data-af5=validate]').disabled", timeout=60000)
            gate = page.eval_on_selector_all('.af5-gate li', 'ls => ls.map(l => l.dataset.n)')
            check('Star Hill: validação automática roda os 10 itens', len(gate) == 10 and 'erro' not in gate, ','.join(gate))
            page.click('[data-af5="move"][data-to="approved"]')
            page.click('[data-af5="publish"]')
            page.wait_for_function("() => document.querySelector('#notice').textContent.includes('publicada')", timeout=20000)
            man = json.loads((tmp / 'data/arenas-published.json').read_text())
            hades = next(a for a in man['arenas'] if a['id'] == 'hades')
            check('Star Hill: publicar grava manifesto com a nova versão e variantes', hades['versao'] == 2 and [v['id'] for v in hades['variantes']] == ['standard', 'eclipse'])
            thumbs = list((tmp / 'playtest/assets/arenas').glob('hades@2~*.webp'))
            check('Star Hill: miniaturas geradas por variante', len(thumbs) == 2, ', '.join(t.name for t in thumbs))
            page.click('[data-af5="rollback"][data-ver="1"]')
            page.wait_for_function("() => document.querySelector('#notice').textContent.includes('v1')", timeout=20000)
            man = json.loads((tmp / 'data/arenas-published.json').read_text())
            check('Star Hill: voltar versão faz o manifesto apontar para a v1', next(a for a in man['arenas'] if a['id'] == 'hades')['versao'] == 1)
            page.close()
            browser.close()
    finally:
        server.terminate()
    failed = [r for r in results if not r['ok']]
    print(json.dumps({'ok': not failed, 'total': len(results), 'falhas': len(failed)}))
    raise SystemExit(1 if failed else 0)


if __name__ == '__main__':
    main()
