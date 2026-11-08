"""QA do Sculpture Studio · projetos, homologação e posição B do palácio (só desenvolvimento).

uv run -q --with playwright python tools/test-sculpture-homologacao.py [porta]
1. STAR HILL → Arena Forge → Sculpture Studio → Projetos: os dois projetos aparecem com o estágio de produção.
2. Homologação do Guardião das Marés: estado técnico e artístico separados, arte nunca aprovada pela página,
   giro 360° ligado, GLB da versão atual carregado, LODs, verificações, testes e capturas por grupo.
3. Mundo com ?sculptV141=1&sculptDepthsClay=1: A (V14.1) e B (argila DEV) carregam; chaves 0-2 e partida capturadas em
   docs/img/sculpture-studio/guardian-depths/mundo-ab-*.png; câmera competitiva igual.
4. Mundo sem flags: nenhuma das duas carrega (versão oficial intacta).
"""
import base64
import json
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = sys.argv[1] if len(sys.argv) > 1 else '8770'
OUT = ROOT / 'docs/img/sculpture-studio/guardian-depths'
GAME = f'http://127.0.0.1:{PORT}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1'
passed, errors = [], []


def ok(name, cond):
    assert cond, name
    passed.append(name); print('ok  ', name)


def game(page, cond):
    for _ in range(1800):
        for f in page.frames:
            try:
                if f.evaluate(cond): return f
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
        page.click('[data-ss-tab="projetos"]')
        page.wait_for_selector('.ss-card[data-proj="guardian-depths"]', timeout=30000)
        cards = page.evaluate("[...document.querySelectorAll('.ss-card')].map(c => [c.dataset.proj, c.querySelector('.ss-pipe .now')?.textContent])")
        ok(f'Projetos: dois projetos com estágio ({cards})', dict(cards).get('guardian-tides') == 'ART_REVIEW' and dict(cards).get('guardian-depths') == 'MODELING')
        ok('Projetos: aprovação de silhueta registrada no Guardião das Profundezas', 'APPROVED' in page.locator('.ss-card[data-proj="guardian-depths"] [data-aprov="silhueta"]').text_content())
        ok('Projetos: o Guardião das Profundezas mostra a prévia em argila', page.locator('.ss-card[data-proj="guardian-depths"] .ss-gal img').count() >= 8)
        page.click('[data-open="guardian-tides"]')
        page.wait_for_selector('[data-ss="hom-checks"]', timeout=60000)
        ok('Homologação: o quadro de projetos some', not page.locator('[data-ss="proj"]').is_visible())
        page.wait_for_function("document.querySelector('[data-ss=src]').textContent.includes('guardian-tides-lod0')", timeout=60000)
        badges = page.locator('[data-ss="hom-status"]').text_content()
        hom = json.loads((ROOT / 'arena-forge/sculpture-studio/projects/guardian-tides/homologacao-v14-1.json').read_text())
        ok(f'Homologação: estados técnico e artístico separados ({" ".join(badges.split())})', 'Técnico: ' + hom['tecnico']['status'] in badges and 'Arte: ART_REVIEW_PENDING' in badges)
        ok('Homologação: a página não aprova arte', 'APPROVED' not in badges.replace('ART_REVIEW_PENDING', ''))
        page.wait_for_function("document.querySelector('[data-ss-act=spin]').getAttribute('aria-pressed') === 'true'", timeout=60000)   # liga quando o GLB termina de carregar
        ok('Homologação: giro 360° ligado', True)
        ok('Homologação: verificações, LODs e testes listados', page.locator('[data-ss="hom-checks"] tr').count() >= 25 and page.locator('.ss-hom table').count() >= 3)
        groups = page.evaluate("[...document.querySelectorAll('.ss-hom fieldset legend')].map(l => l.textContent)")
        ok('Homologação: capturas de rosto, cabelo, mãos, manto e ondas', all(g in groups for g in ['Rosto', 'Cabelo', 'Mãos', 'Manto', 'Ondas']))
        broken = page.evaluate("Promise.all([...document.querySelectorAll('.ss-hom .ss-gal img')].map(i => fetch(i.src, {method: 'HEAD'}).then(r => r.ok ? 0 : i.src, () => i.src)))")   # lazy: decode() não resolve fora da tela
        ok('Homologação: todas as capturas abrem', not [x for x in broken if x])
        page.click('[data-hom-glb$="poseidon-v14/guardian-tides-lod0.glb"]')
        page.wait_for_function("document.querySelector('[data-ss=hom-src]').textContent.includes('poseidon-v14/')", timeout=30000)
        ok('Homologação: comparação carrega a V14', True)
        page.screenshot(path=str(ROOT / 'docs/img/sculpture-studio/v14-1/homologacao-tela.png'))

        g = b.new_page(viewport={'width': 1600, 'height': 900})
        g.on('pageerror', lambda e: errors.append(str(e)))
        g.goto(GAME + '&sculptV141=1&sculptDepthsClay=1', wait_until='commit')
        f = game(g, "(e => e && ['ready','unavailable'].includes(e.group.userData.guardianB) && e.group.userData.guardianV13 && e.group.userData.guardianV13 !== 'loading')(window.__divine?.scene?.environment)")
        st = f.evaluate("(u => [u.guardianV13, u.guardianB])(window.__divine.scene.environment.group.userData)")
        ok(f'Mundo: A (V14.1) e B (argila DEV) carregam ({st})', st == ['ready', 'ready'])
        g.wait_for_timeout(2500)
        keys = f.evaluate('window.__divine.scene.cinematicKeys')
        shot = lambda name: (OUT / name).write_bytes(base64.b64decode(f.evaluate('window.__divine.scene.snapshot(1600)').split(',', 1)[1]))
        for k in (0, 1, 2):
            f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(keys[k])})'); g.wait_for_timeout(1500)
            shot(f'mundo-ab-chave{k}.png')
        f.evaluate('window.__divine.scene.poseCinematic(null)'); g.wait_for_timeout(1000)
        shot('mundo-ab-partida.png')
        ok('Mundo: chaves 0-2 e partida com A e B', all((OUT / f'mundo-ab-{n}.png').stat().st_size > 20000 for n in ['chave0', 'chave1', 'chave2', 'partida']))
        c = f.evaluate('window.__divine.scene.composition()')
        ok('Mundo: câmera competitiva igual', c['camera']['fov'] == 42 and c['camera']['position'] == [0, 13.5, 13])
        g.close()

        g = b.new_page(viewport={'width': 1200, 'height': 700})
        g.goto(GAME, wait_until='commit')
        f = game(g, "!!window.__divine?.scene?.environment")
        g.wait_for_timeout(2000)
        st = f.evaluate("(u => [u.guardianV13 ?? null, u.guardianB ?? null])(window.__divine.scene.environment.group.userData)")
        ok(f'Sem flags: nenhuma escultura carrega ({st})', st == [None, None])
        b.close()
finally:
    real = [e for e in errors if 'presence' not in e and 'friends' not in e]
    print(f'\n{len(passed)} ok · erros de página: {real or "nenhum"}')
    if real: sys.exit(1)
