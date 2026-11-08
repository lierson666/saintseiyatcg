"""Testes do Palácio de Poseidon V15 (Cinematic Environment Art Pass, 08/11/2026). Só desenvolvimento: ?palaceV15=1.

1. Sem a flag nada muda (palaceV15 'off', sem arte de material); com a flag o palácio V15 monta no mesmo WorldRoot.
2. Câmera competitiva intacta (FOV 42 em (0; 13,5; 13)), com e sem a V15.
3. GLBs dos guardiões, LODs e hashes intactos (SHA256SUMS da V14.1 e da Profundezas V1.1).
4. Peças da V15 presentes: dentículos, rochas instanciadas, colunas torneadas; sem erro de shader nem de página.
5. Arte de material: setArt muda os uniformes compartilhados e readArt devolve os valores.
6. Legibilidade das cartas: brilho e variação do piso sob as cartas (scene.audit) dentro da tolerância da base, nada por cima do campo.
7. Draw calls na partida não sobem; celular (390 × 844) carrega a V15 sem erros.
8. Arena Forge → Material Studio: o painel Material Art liga a V15 e mostra os 8 controles.
Uso: uv run -q --with playwright python tools/test-poseidon-palace-v15.py 8770 [8765]
"""
import hashlib, json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = sys.argv[1] if len(sys.argv) > 1 else '8770'
STUDIO = sys.argv[2] if len(sys.argv) > 2 else '8765'  # card-forge/serve.py: o Material Studio precisa da API de materiais
GAME = f'http://127.0.0.1:{PORT}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&demo=ultimate&noIntro=1&sculptV141=1&sculptDepthsV11=1'
READY = ("(e => e && ['ready','unavailable'].includes(e.group.userData.guardianB) && e.group.userData.guardianV13 && e.group.userData.guardianV13 !== 'loading'"
         " && e.group.userData.capitalV8 !== 'loading' && e.group.userData.portalV9 !== 'loading')(window.__divine?.scene?.environment)")
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


def sums_ok(folder):
    d = ROOT / 'arena-forge/assets' / folder
    for line in (d / 'SHA256SUMS').read_text().split('\n'):
        if line.strip():
            h, name = line.split()[:2]
            if hashlib.sha256((d / name.lstrip('*')).read_bytes()).hexdigest() != h:
                return False
    return True


def open_game(br, flags, **ctx):
    c = br.new_context(**({'viewport': {'width': 1600, 'height': 900}} | ctx))
    c.add_init_script("try { const k='ssTcgOlympusArena', s=JSON.parse(localStorage.getItem(k)||'{}'); s.quality=" + json.dumps('phone' if ctx.get('is_mobile') else 'high') + "; localStorage.setItem(k, JSON.stringify(s)); } catch {}")
    p = c.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(GAME + flags, wait_until='commit')
    f = game(p, READY); p.wait_for_timeout(2500)
    return c, p, f, errs


INFO = """(() => { const s = window.__divine.scene, e = s.environment, names = [];
  e.group.traverse(o => { if (o.name) names.push(o.name); });
  s.poseCinematic(null); s.bench(1);
  return {v15: e.group.userData.palaceV15, art: e.readArt ? e.readArt() : null, cam: s.composition().camera,
    dent: names.filter(n => n.startsWith('V15 · Dentículos')).length, rocks: names.filter(n => n.startsWith('V15 · Rochas')).length,
    audit: s.audit(), calls: s.stats().calls}; })()"""

with sync_playwright() as pw:
    br = pw.chromium.launch(channel='chrome', args=['--use-angle=metal', '--enable-gpu'])
    c0, p0, f0, e0 = open_game(br, '')
    base = f0.evaluate(INFO); c0.close()
    c1, p1, f1, e1 = open_game(br, '&palaceV15=1')
    v = f1.evaluate(INFO)

    ok('sem flag: palácio sem V15 e sem arte de material', base['v15'] == 'off' and base['art'] is None and base['dent'] == 0)
    ok('com ?palaceV15=1: V15 montada no mesmo WorldRoot', v['v15'] == 'on' and v['art'] is not None)
    cam_ok = lambda c: c['fov'] == 42 and c['position'] == [0, 13.5, 13]
    ok('câmera competitiva intacta com e sem V15', cam_ok(base['cam']) and cam_ok(v['cam']))
    ok('GLBs e hashes da V14.1 e da Profundezas V1.1 intactos', sums_ok('poseidon-v14-1') and sums_ok('poseidon-depths-v1-1'))
    ok(f"peças V15: dentículos e {v['rocks']} malhas de rocha instanciadas", v['dent'] == 1 and 4 <= v['rocks'] <= 8)
    ok('sem erro de shader nem de página', not v['audit']['shaderErrors'] and not e1 and not e0)
    after = f1.evaluate("(() => { const e = window.__divine.scene.environment; e.setArt({patina: .9, gold: 1.4}); const r = e.readArt(); e.setArt({patina: .45, gold: 1}); return r; })()")
    ok('arte de material: setArt muda e readArt devolve', abs(after['patina'] - .9) < 1e-6 and abs(after['gold'] - 1.4) < 1e-6)
    a0, a1 = base['audit'], v['audit']
    ok(f"legibilidade: piso sob as cartas luma {a0['luma']}→{a1['luma']}, variação {a0['busy']}→{a1['busy']}, nada por cima",
       abs(a1['luma'] - a0['luma']) <= .03 and a1['busy'] <= a0['busy'] + .02 and a1['zoneHits'] == a0['zoneHits'])
    ok(f"draw calls na partida {base['calls']}→{v['calls']} (não sobem)", v['calls'] <= base['calls'])
    c1.close()

    cm, pm, fm, em = open_game(br, '&palaceV15=1', viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    vm = fm.evaluate(INFO)
    ok('celular: V15 carrega sem erros', vm['v15'] == 'on' and not em and not vm['audit']['shaderErrors'])
    cm.close()

    cs = br.new_context(viewport={'width': 1700, 'height': 1050}); ps = cs.new_page(); es = []
    ps.on('pageerror', lambda e: es.append(str(e)))
    ps.add_init_script("localStorage.setItem('af.palaceV15', 'true')")
    ps.goto(f'http://127.0.0.1:{STUDIO}/star-hill/#arenas/estudio', wait_until='commit')
    ps.wait_for_selector('[data-ms-art="pigment"]', timeout=90000)
    n = ps.locator('input[type=range][data-ms-art]').count()
    ok(f'Material Studio: painel Material Art com {n} controles e a V15 ligada', n == 8 and ps.locator('[data-ms-art="v15"]').is_checked() and not es)
    cs.close(); br.close()
print(f'\n{len(passed)} ok')
