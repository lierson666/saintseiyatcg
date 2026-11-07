"""QA da Produção de arena no STAR HILL real (servidor local, porta 8770 por padrão).

uv run -q --with playwright python tools/test-arena-production-ui.py [porta]
Mede o Camera Composition Template no jogo, importa um artboard de teste, anota, marca a região de um asset, recorta a
miniatura, aprova e congela, captura o render 3D da câmera competitiva, compara (lado a lado, sobrepor, diferença),
exporta o ZIP e confere as pastas. No fim devolve o projeto ao estado anterior (o artboard de teste não fica salvo).
Screenshots em docs/img/arena-production/.
"""
import io
import json
import shutil
import sys
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = sys.argv[1] if len(sys.argv) > 1 else '8770'
BASE = f'http://127.0.0.1:{PORT}'
OUT = ROOT / 'docs/img/arena-production'
DATA = ROOT / 'data/arena-production/poseidon-palace.json'
BACKUP = DATA.with_suffix('.qa-backup')
ART = ROOT / 'docs/img/poseidon-beauty/painterly-jogo-heroi.png'  # imagem de teste no lugar do concept do autor
OUT.mkdir(parents=True, exist_ok=True)
had = DATA.exists()
if had:
    shutil.copy(DATA, BACKUP)
errors, passed = [], []


def ok(name, cond):
    assert cond, name
    passed.append(name)
    print('ok  ', name)


try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
        page = b.new_page(viewport={'width': 1700, 'height': 1000})
        page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
        page.on('response', lambda r: r.status >= 400 and errors.append(f'{r.status} {r.url}'))
        page.on('pageerror', lambda e: errors.append(str(e)))
        notes = iter(['Frontão precisa de mais ouro', 'x'])
        page.on('dialog', lambda d: d.accept(next(notes, 'ok')) if d.type == 'prompt' else d.accept())
        page.goto(f'{BASE}/star-hill/#arenas/producao', wait_until='commit')
        page.wait_for_selector('#ap-left fieldset', timeout=30000)
        ok('tela abre com as 12 etapas', page.locator('[data-stage]').count() == 12)
        ok('aba no menu do Arena Forge', page.locator('.ms-tabs a[href="#arenas/producao"]').count() == 1)

        page.click('[data-act="template"]')
        page.wait_for_function("document.querySelector('#ap-left').textContent.includes('Medido em')", timeout=90000)
        t = json.loads(DATA.read_text())['template']
        ok('template medido no jogo', t['camera']['fov'] == 42 and len(t['zonas']) >= 4 and {z['tipo'] for z in t['zonas']} >= {'protegida'})
        ok('template PNG 3840×2160 salvo', (ROOT / t['arquivo'].lstrip('/')).is_file())
        page.click('[data-mode="jogo"]'); page.wait_for_timeout(1500)
        page.screenshot(path=str(OUT / 'jogo-com-template.png'))

        page.set_input_files('[data-up="artboard"]', str(ART))
        page.wait_for_selector('.ap-layers img[alt^="Artboard"]', timeout=20000)
        ok('artboard importado e versionado', 'Master Artboard V' in page.locator('#ap-left').inner_text())

        stage = page.locator('#ap-stage').bounding_box()
        page.click('[data-tool="nota"]')
        page.mouse.click(stage['x'] + stage['width'] * .5, stage['y'] + stage['height'] * .2)
        page.wait_for_selector('.ap-pin')
        ok('anotação no artboard', 'Frontão' in page.locator('.ap-pin').first.inner_text())

        page.click('[data-asset="pediment"]'); page.click('[data-tool="regiao"]')
        x0, y0 = stage['x'] + stage['width'] * .38, stage['y'] + stage['height'] * .12
        page.mouse.move(x0, y0); page.mouse.down(); page.mouse.move(x0 + stage['width'] * .24, y0 + stage['height'] * .12, steps=6); page.mouse.up()
        page.wait_for_selector('.ap-reg[data-on="1"]')
        page.click('[data-act="thumb"]'); page.wait_for_selector('#ap-right img.ap-thumb', timeout=15000)
        page.click('[data-act="save"]'); page.wait_for_timeout(800)
        a = next(x for x in json.loads(DATA.read_text())['assets'] if x['id'] == 'pediment')
        ok('região e miniatura gravadas no asset', a['referencia'] and a['referencia']['w'] > .1 and a['thumb'] and (ROOT / a['thumb'].lstrip('/')).is_file())
        page.screenshot(path=str(OUT / 'artboard-regioes.png'))

        page.click('[data-act="approve"]'); page.wait_for_timeout(800)
        p = json.loads(DATA.read_text())
        ok('artboard aprovado e congelado', p['artboards'][-1]['congelado'] and p['etapas']['master-artboard']['status'] == 'aprovada')
        ok('anotar bloqueado no congelado', page.locator('[data-tool="nota"]').is_disabled())

        page.click('[data-act="render"]'); page.wait_for_selector('.ap-render', timeout=60000)
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / 'match-lado-a-lado.png'))
        page.click('[data-mode="diferenca"]'); page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / 'match-diferenca.png'))
        page.click('[data-mode="overlay"]'); page.wait_for_timeout(300)
        ok('render 3D capturado do jogo', page.locator('.ap-render').count() == 1)

        page.click('[data-act="manifest"]'); page.wait_for_selector('#ap-left pre')
        m = json.loads(page.locator('#ap-left pre').inner_text())
        ok('manifesto com artboard aprovado', m['artboard'] and m['camera']['somenteLeitura'] and 'battlefield' in m['grupos'])

        r = page.request.get(f'{BASE}/api/star-hill/producao/exportar?id=poseidon-palace')
        z = zipfile.ZipFile(io.BytesIO(r.body()))
        names = z.namelist()
        ok('ZIP com pastas e arquivos', r.ok and all(f'{d}/' in names for d in ['artboards', 'references', 'assets', 'materials', 'textures', 'shaders', 'animations', 'thumbnails', 'manifests', 'reports'])
           and any(n.startswith('thumbnails/') and n.endswith('.png') for n in names) and 'shaders/painterly.js' in names)
        (OUT / 'pacote-qa.txt').write_text('\n'.join(sorted(names)) + '\n')

        page.set_viewport_size({'width': 900, 'height': 1000}); page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / 'estreito.png'))
        b.close()
    real = [e for e in errors if 'favicon' not in e and not e.startswith('Failed to load resource') and '/api/presence' not in e and '/api/friends' not in e]
    print('erros:', real[:6])
    ok('sem erros no console', not real)
finally:
    if had:
        shutil.move(BACKUP, DATA)
    elif DATA.exists():
        DATA.unlink()
print(f'\n{len(passed)} testes ok', errors[:5])
