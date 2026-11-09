"""Poseidon V15.2 · ciclo de vida das esculturas (Sculpture Manager), com o Three.js real do jogo (08/11/2026).

A. Carregamento inicial pelo catálogo (os 4 perfis ficam no test-poseidon-v15-1-lod.py).
B. Troca dinâmica de perfil: High → Medium → phone → High, troca rápida (High → Low → High → phone), falha de rede na troca
   (a variante anterior fica visível e o erro é registrado) e nenhuma estátua duplicada durante as trocas.
C. Memória: um recurso por URL, referências certas, cada textura solta quando a última escultura sai (eventos dispose do Three.js).
   Os MB são estimativa (largura × altura × 4 × 1,33): o navegador não expõe a memória real da GPU.
D. Cinemática: chaves 0, 1 e 2 com os dois guardiões; fim da cinemática no celular solta os guardiões depois da folga;
   reentrada (scene.cinematic) recarrega antes de a câmera revelar o palácio (no primeiro quadro da cinemática já estão prontos).
E. Partida: câmera competitiva intacta, HUD e cartas presentes, sem erros de página.
Uso: uv run -q --with playwright python tools/test-poseidon-v15-2-lifecycle.py 8770
"""
import json, re, sys, time
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else '8770'
GAME = f'http://127.0.0.1:{PORT}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1&sculptV141=1&sculptDepthsV11=1&palaceV15=1'
READY = "(e => e && e.group.userData.guardianB === 'ready' && e.group.userData.guardianV13 === 'ready')(window.__divine?.scene?.environment)"
passed = []


def ok(name, cond):
    assert cond, name
    passed.append(name); print('ok  ', name)


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


D = "window.__divine.scene.environment.sculptures.diagnostics()"
ROOTS = "(() => { let n = 0; window.__divine.scene.environment.groups.landmark.children.forEach(o => { if (/^GUARDIAN_.*(GLB|DEV)$/.test(o.name)) n++; }); return n; })()"


def wait(f, js, timeout=60):
    t = time.time()
    while time.time() - t < timeout:
        if f.evaluate(js): return True
        time.sleep(.1)
    return False


def loaded(f):
    return {i['id']: (i['loaded'], i['state']) for i in f.evaluate(D)['items']}


with sync_playwright() as pw:
    br = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
    c = br.new_context(viewport={'width': 1600, 'height': 900})
    c.add_init_script("try { const k='ssTcgOlympusArena', s=JSON.parse(localStorage.getItem(k)||'{}'); s.quality='high'; localStorage.setItem(k, JSON.stringify(s)); } catch {}")
    p = c.new_page(); errs, reqs = [], []
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.on('request', lambda r: re.search(r'guardian-.*\.glb', r.url) and reqs.append(r.url.split('assets/')[1]))
    p.goto(GAME, wait_until='commit')
    f = game(p, READY); p.wait_for_timeout(1500)

    # A
    d = f.evaluate(D)
    ok('A: catálogo carregado e duas esculturas READY em lod0 (High)', f.evaluate("window.__divine.scene.environment.group.userData.sculptures") == 'catalog'
       and all(i['state'] == 'READY' and i['loaded'] == 'lod0' for i in d['items']) and len(d['items']) == 2)
    ok('A: um recurso por URL, uma referência cada', len(d['assets']) == 2 and all(a['refs'] == 1 for a in d['assets']))

    # B · trocas
    tex0 = f.evaluate("""(() => { const T = new Set(); window.__divine.scene.environment.groups.landmark.children.forEach(r => { if (/^GUARDIAN_.*(GLB|DEV)$/.test(r.name)) r.traverse(n => { if (n.material?.map) T.add(n.material.map); }); });
      window.__t0 = {disposed: 0, n: T.size}; T.forEach(t => t.addEventListener('dispose', () => window.__t0.disposed++)); return T.size; })()""")
    reqs.clear()
    f.evaluate("window.__divine.scene.setQuality('medium')")
    ok('B: High → Medium troca para lod1 (LOD1 da V14.1 vem da revisão r2)', wait(f, f"{D}.items.every(i => i.loaded === 'lod1' && i.state === 'READY')")
       and 'poseidon-v14-1-r2/guardian-tides-lod1.glb' in reqs and 'poseidon-depths-v1-1/guardian-depths-lod1.glb' in reqs)
    ok(f'C: texturas do lod0 soltas depois da troca ({f.evaluate("window.__t0.disposed")}/{tex0} mapas base)', wait(f, f"window.__t0.disposed >= window.__t0.n", 10))
    f.evaluate("window.__divine.scene.setQuality('phone')")
    ok('B: Medium → phone troca para mobile', wait(f, f"{D}.items.every(i => i.loaded === 'mobile' && i.state === 'READY')"))
    f.evaluate("window.__divine.scene.setQuality('high')")
    ok('B: phone → High volta ao lod0', wait(f, f"{D}.items.every(i => i.loaded === 'lod0' && i.state === 'READY')"))
    # troca rápida: High → Low → High → phone sem esperar; a última vence e nada duplica
    f.evaluate("window.__maxRoots = 0; window.__rootsIv = setInterval(() => { let n = 0; window.__divine.scene.environment.groups.landmark.children.forEach(o => { if (/^GUARDIAN_.*(GLB|DEV)$/.test(o.name)) n++; }); window.__maxRoots = Math.max(window.__maxRoots, n); }, 5)")
    f.evaluate("['low', 'high', 'phone'].forEach(q => window.__divine.scene.setQuality(q))")
    ok('B: troca rápida termina na escolha mais recente (mobile)', wait(f, f"{D}.items.every(i => i.loaded === 'mobile' && i.state === 'READY') && {D}.assets.every(a => a.ready)"))
    p.wait_for_timeout(1500)
    mx = f.evaluate("clearInterval(window.__rootsIv), window.__maxRoots")
    d = f.evaluate(D)
    ok(f'B: sem estátua duplicada (máximo de {mx} raízes durante as trocas) e sem recurso órfão ({len(d["assets"])} URLs)', mx <= 2 and f.evaluate(ROOTS) == 2 and len(d['assets']) == 2 and all(a['refs'] == 1 for a in d['assets']))
    # falha de rede: o LOD2 das Marés cai; ela fica no mobile visível, com erro; a Profundezas troca
    p.route('**/guardian-tides-lod2.glb', lambda r: r.abort())
    f.evaluate("window.__divine.scene.setQuality('low')")
    ok('B: falha de rede na troca mantém a variante anterior visível e registra o erro', wait(f, f"(d => d.items.find(i => i.id === 'guardian-tides').error && d.items.find(i => i.id === 'guardian-depths').loaded === 'lod2')({D})")
       and loaded(f)['guardian-tides'] == ('mobile', 'READY') and f.evaluate(ROOTS) == 2)
    p.unroute('**/guardian-tides-lod2.glb')
    f.evaluate("window.__divine.scene.setQuality('high')")
    ok('B: recupera depois da falha (nova troca chega ao lod0 e limpa o erro)', wait(f, f"{D}.items.every(i => i.loaded === 'lod0' && !i.error)"))

    # D · cinemática
    keys = f.evaluate('window.__divine.scene.cinematicKeys')
    vis = []
    for k in range(3):
        f.evaluate(f'window.__divine.scene.poseCinematic({json.dumps(keys[k])})'); p.wait_for_timeout(400)
        vis.append(f.evaluate(f"{D}.items.every(i => i.state === 'READY') && {ROOTS} === 2"))
    f.evaluate('window.__divine.scene.poseCinematic(null)')
    ok('D: chaves 0, 1 e 2 com os dois guardiões presentes', all(vis))
    # celular: termina uma cinemática → os guardiões saem depois da folga; reentrada recarrega antes de revelar
    f.evaluate("window.__divine.scene.setQuality('phone')")
    wait(f, f"{D}.items.every(i => i.loaded === 'mobile')")
    f.evaluate("const s = window.__divine.scene; s.cinematic(); const iv = setInterval(() => { if (s.cinematicPlaying) { s.skipCinematic(); clearInterval(iv); } }, 20)")
    ok('D: fim da cinemática no celular solta os guardiões (residência só da abertura)', wait(f, f"{D}.items.every(i => i.state === 'UNLOADED') && {D}.assets.length === 0", 10)
       and f.evaluate(ROOTS) == 0)
    t0 = time.time()
    f.evaluate("""window.__reveal = null; const s = window.__divine.scene; const D = () => s.environment.sculptures.diagnostics();
      const iv = setInterval(() => { if (s.cinematicPlaying && window.__reveal === null) { window.__revealAt = performance.now(); window.__reveal = D().items.every(i => i.state === 'READY'); clearInterval(iv); } }, 1);
      window.__reentry = performance.now(); s.cinematic().then(() => {}); """)
    ok('D: reentrada na cinemática recarrega antes de a câmera revelar (primeiro quadro já com os dois READY)', wait(f, "window.__reveal !== null", 30) and f.evaluate("window.__reveal") is True)
    reentry_ms = f.evaluate("Math.round(window.__revealAt - window.__reentry)")
    f.evaluate("window.__divine.scene.skipCinematic()")
    p.wait_for_timeout(800)
    # E · partida
    cam = f.evaluate('window.__divine.scene.composition().camera')
    hud = f.evaluate("!!document.querySelector('.dcard') && document.querySelectorAll('.dcard').length")
    ok(f'E: câmera competitiva intacta, {hud} cartas na tela, sem erros de página', cam['fov'] == 42 and cam['position'] == [0, 13.5, 13] and hud and not errs)
    print('reentrada no celular (ms do pedido até o primeiro quadro da cinemática, com os GLBs recarregados):', reentry_ms, '· eventos:', [e['ev'] for e in f.evaluate(D)['events']][-8:])
    c.close()

    # F · Sculpture Studio: catálogo (legado marcado, não elegível) e runtime pelo mesmo gerenciador, trocando LOD sem recarregar
    ps = br.new_page(viewport={'width': 1700, 'height': 1050}); es = []
    ps.on('pageerror', lambda e: es.append(str(e)))
    ps.goto(f'http://127.0.0.1:{PORT}/star-hill/#arenas/escultura', wait_until='commit')
    ps.wait_for_function("window.__sculptureStudio?.catalog && document.querySelector('[data-ss=cat]')?.textContent.includes('TECHNICALLY_VALIDATED')", timeout=90000)
    ps.select_option('[data-ss=lod]', '../poseidon-v14-1/guardian-tides-mobile')
    ps.wait_for_function("document.querySelector('[data-ss=cat]').textContent.includes('LEGACY_DEFECTIVE')", timeout=60000)
    cat_txt = ps.locator('[data-ss=cat]').text_content()
    lbl = ps.locator('[data-ss=lod] option[value="../poseidon-v14-1/guardian-tides-mobile"]').text_content()
    ok('F: mobile antigo aparece como LEGACY_DEFECTIVE, não elegível, com os mapas pretos listados', 'não elegível' in cat_txt and 'PRETO' in cat_txt and 'não elegível' in lbl)
    ps.select_option('[data-ss=rt-proj]', 'guardian-tides|v14-1')
    ps.click('[data-ss-rt=high]')
    ps.wait_for_function("document.querySelector('[data-ss=rt]').textContent.includes('READY') && document.querySelector('[data-ss=rt]').textContent.includes('lod0')", timeout=90000)
    ps.click('[data-ss-rt=phone]')
    ps.wait_for_function("(t => t.includes('READY') && /carregada\\s*mobile/.test(t))(document.querySelector('[data-ss=rt]').textContent)", timeout=90000)
    rt = ps.evaluate("window.__sculptureStudio.rt.diagnostics()")
    ok('F: runtime no Sculpture Studio troca lod0 → mobile sem recarregar (um recurso vivo, homologação na tabela)', rt['items'][0]['loaded'] == 'mobile' and len(rt['assets']) == 1
       and 'TECHNICALLY_VALIDATED' in ps.locator('[data-ss=rt]').text_content() and not es)
    ps.click('[data-ss-rt=off]')
    br.close()
print(f'\n{len(passed)} ok')
