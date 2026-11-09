#!/usr/bin/env python3
"""Sculpture Studio · homologação de uma versão de escultura (genérico: lê o projeto em JSON).

  python3 tools/sculpture-homologate.py guardian-tides [--versao v14-1] [--testes 8770]
  python3 tools/sculpture-homologate.py --quadro          (só refaz o quadro de produção)

Grava arena-forge/sculpture-studio/projects/<projeto>/homologacao-<versao>.json e refaz, a partir de todos os
projetos, o índice projects/index.json e o quadro docs/art-bible/SCULPTURE_PRODUCTION_BOARD.md.

A aprovação técnica sai das medições. A artística NUNCA sai daqui: fica ART_REVIEW_PENDING até o autor
registrar a revisão (campo artistico do projeto). Sem --testes, os testes ficam "não executados" e a
versão não é validada.
"""
import argparse
import datetime
import hashlib
import json
import math
import re
import struct
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sculpture_catalog import map_integrity  # V15.2: mapas vazios, pretos ou divergentes reprovam a variante

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / 'arena-forge/sculpture-studio/projects'
BOARD = ROOT / 'docs/art-bible/SCULPTURE_PRODUCTION_BOARD.md'
STAGES = ['CONCEPT', 'MODELING', 'TECHNICAL_QA', 'ART_REVIEW', 'APPROVED', 'PUBLISHED']
LODS = ['lod0', 'lod1', 'lod2', 'mobile']


def read_glb(path):
    raw = path.read_bytes()
    if raw[:4] != b'glTF': raise ValueError('não é GLB')
    n = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + n].decode('utf8').rstrip(' \0'))
    bin_off = 20 + n + 8
    return g, raw[bin_off:]


def image_size(data):
    """Largura × altura de PNG ou JPEG embutido (sem dependências)."""
    if data[:8] == b'\x89PNG\r\n\x1a\n': return struct.unpack('>II', data[16:24])
    i = 2
    while i < len(data) - 9:
        if data[i] != 0xFF: i += 1; continue
        m = data[i + 1]
        if m in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', data[i + 5:i + 9]); return w, h
        i += 2 + struct.unpack('>H', data[i + 2:i + 4])[0]
    return 0, 0


def glb_facts(path):
    g, binc = read_glb(path)
    acc, views = g['accessors'], g['bufferViews']
    lo, hi, tri, boxes = [math.inf] * 3, [-math.inf] * 3, 0, {}
    for nd in g['nodes']:          # os GLB do Sculpture Studio saem sem transformação nos nós
        if 'mesh' not in nd: continue
        blo, bhi = [math.inf] * 3, [-math.inf] * 3
        for p in g['meshes'][nd['mesh']]['primitives']:
            a = acc[p['attributes']['POSITION']]
            blo = [min(x, y) for x, y in zip(blo, a['min'])]; bhi = [max(x, y) for x, y in zip(bhi, a['max'])]
            tri += (acc[p['indices']]['count'] if 'indices' in p else a['count']) // 3
        boxes[nd.get('name')] = (blo, bhi)
        lo = [min(x, y) for x, y in zip(lo, blo)]; hi = [max(x, y) for x, y in zip(hi, bhi)]
    imgs = []
    for im in g.get('images', []):
        v = views[im['bufferView']]; off = v.get('byteOffset', 0)
        imgs.append(image_size(binc[off:off + v['byteLength']]))
    return {
        'tri': tri, 'nos': [n.get('name') for n in g['nodes']], 'materiais': [m.get('name') for m in g['materials']],
        'texturas': imgs, 'caixas': boxes, 'min': [round(x, 3) for x in lo], 'max': [round(x, 3) for x in hi],
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size,
    }


def audit(path):
    out = subprocess.run([sys.executable, str(ROOT / 'tools/poseidon-v13-audit-glb.py'), str(path)], capture_output=True, text=True)
    try: return json.loads(out.stdout)
    except json.JSONDecodeError: return {'geometricGate': 'AUDIT_FAILED', 'warnings': [out.stderr.strip()[-300:]]}


def sums_ok(folder):
    f = folder / 'SHA256SUMS'
    if not f.exists(): return None
    bad = [name for h, name in (l.split() for l in f.read_text().splitlines() if l.strip())
           if not (folder / name).exists() or hashlib.sha256((folder / name).read_bytes()).hexdigest() != h]
    return bad


def run_tests(proj, port):
    res = []
    for t in proj.get('testes', []):
        p = subprocess.run(['uv', 'run', '-q', '--with', 'playwright', 'python', str(ROOT / t['script']), str(port)],
                           cwd=ROOT, capture_output=True, text=True, timeout=900)
        m = re.search(r'(\d+) ok · erros de página: (.+)', p.stdout)
        passed = int(m.group(1)) if m else 0
        res.append({'nome': t['nome'], 'script': t['script'], 'passou': passed, 'esperado': t['esperado'],
                    'errosDePagina': m.group(2).strip() if m else 'saída não reconhecida',
                    'ok': p.returncode == 0 and passed == t['esperado'] and m and m.group(2).strip() == 'nenhum'})
    return res


def homologate(proj, versao, port):
    v = next(x for x in proj['versoes'] if x['id'] == versao)
    folder = ROOT / v['pasta']
    checks, lods = [], []

    def check(cid, nome, ok, detalhe=''):
        checks.append({'id': cid, 'nome': nome, 'ok': bool(ok), 'detalhe': detalhe})

    # V15.2: as variantes do projeto (podem vir de revisões em outra pasta, ex. LOD1 r2) mandam; sem elas, o padrão antigo
    files = {l: ROOT / v['variantes'][l] for l in LODS} if v.get('variantes') else {l: folder / proj['glb'].format(lod=l) for l in LODS}
    missing = [l for l, f in files.items() if not f.exists()]
    check('arquivos', 'Os 4 GLB existem (LOD0, LOD1, LOD2, Mobile)', not missing, ', '.join(missing) or 'ok')
    if missing: return checks, lods
    bad = []
    for d in sorted({f.parent for f in files.values()} | {folder}):
        r = sums_ok(d); bad += [f'{d.name}: sem SHA256SUMS'] if r is None else [f'{d.name}/{x}' for x in r]
    check('hashes', 'SHA-256 dos GLB batem com SHA256SUMS', bad == [], ', '.join(bad) or 'ok')
    b = proj['orcamento']
    for l, f in files.items():
        a, fa = audit(f), glb_facts(f)
        h = fa['max'][1] - fa['min'][1]; w = fa['max'][0] - fa['min'][0]; d = fa['max'][2] - fa['min'][2]
        lods.append({'lod': l, 'arquivo': str(f.relative_to(ROOT)), 'tri': fa['tri'], 'malhas': len([n for n in fa['nos'] if n and n.startswith(proj['prefixoPartes'])]),
                     'materiais': len(fa['materiais']), 'texturaMax': max((max(s) for s in fa['texturas']), default=0),
                     'altura': round(h, 2), 'largura': round(w, 2), 'profundidade': round(d, 2), 'pivoY': fa['min'][1],
                     'sha256': fa['sha256'], 'bytes': fa['bytes'], 'gate': a.get('geometricGate')})
        lo, hi = b[l]
        check(f'{l}-estrutura', f'{l}: auditoria estrutural limpa', a.get('geometricGate') == 'STRUCTURE_VALID_ART_REVIEW_PENDING' and not a.get('warnings') and not a.get('requiredExtensions'),
              a.get('geometricGate', '?') + ('; ' + '; '.join(a.get('warnings', [])) if a.get('warnings') else ''))
        check(f'{l}-orcamento', f'{l}: triângulos entre {lo} e {hi}', lo <= fa['tri'] <= hi, str(fa['tri']))
        partes = [proj['prefixoPartes'] + p for p in proj['partes']]
        falta = [p for p in partes if p not in fa['nos']]
        check(f'{l}-partes', f'{l}: as {len(partes)} partes nomeadas', not falta, ', '.join(falta) or 'ok')
        mats = [m.split('__')[0] for m in fa['materiais']]
        check(f'{l}-materiais', f'{l}: materiais {", ".join(proj["materiais"])}', sorted(mats) == sorted(proj['materiais']), ', '.join(fa['materiais']))
        lw = b.get('largura', b['base'])   # figura mais larga que a base (tridente na diagonal): limite próprio no projeto
        check(f'{l}-escala', f'{l}: altura {b["altura"][0]}–{b["altura"][1]} m, largura até {lw} m, profundidade até {b["base"]} m, pivô no chão',
              b['altura'][0] <= h <= b['altura'][1] and w <= lw and d <= b['base'] and abs(fa['min'][1]) < 0.05,
              f'{w:.2f} × {h:.2f} × {d:.2f} m, pivô y {fa["min"][1]:.3f}')
        if l == 'lod0': ref = fa['caixas']
        else:   # silhueta: a caixa de cada peça não pode encolher em relação ao LOD0 (ponta do tridente, cabelo, base)
            tol = b.get('silhuetaLod', 0.10)
            dev = {n: max(max(abs(x - y) for x, y in zip(fa['caixas'][n][0], ref[n][0])), max(abs(x - y) for x, y in zip(fa['caixas'][n][1], ref[n][1])))
                   for n in ref if n in fa['caixas']}
            pior = max(dev, key=dev.get)
            check(f'{l}-silhueta', f'{l}: caixa de cada peça a até {int(tol * 100)} cm da do LOD0', dev[pior] <= tol, f'pior: {pior} {dev[pior]:.2f} m')
        probs = map_integrity(f, files['lod0'] if l != 'lod0' else None, proj.get('build', {}).get('pretoIntencional', []))
        check(f'{l}-mapas', f'{l}: nenhum mapa vazio, preto ou divergente do LOD0', not probs, ', '.join(f"{x['imagem']} {x['tipo']}" for x in probs) or 'ok')
        if l == 'mobile':
            check('mobile-texturas', f'mobile: texturas até {b["texturaMobile"]}²', lods[-1]['texturaMax'] <= b['texturaMobile'], f'{lods[-1]["texturaMax"]} px')
    cap = proj['capturas']
    falta = [f for g in cap['grupos'].values() for f in g if not (ROOT / cap['pasta'] / f).exists()]
    check('capturas', 'Capturas de revisão presentes (rosto, cabelo, mãos, manto, ondas, materiais, mundo)', not falta, ', '.join(falta) or 'ok')
    for other in proj['versoes']:
        if other['id'] == versao: continue
        bad = sums_ok(ROOT / other['pasta'])
        check(f'preserva-{other["id"]}', f'{other["nome"]} preservada (hashes iguais)', bad == [], 'sem SHA256SUMS' if bad is None else (', '.join(bad) or 'ok'))
    return checks, lods


def board():
    rows, ids = [], []
    for f in sorted(PROJECTS.glob('*.json')):
        if f.name == 'index.json': continue
        ids.append(f.stem)
        p = json.loads(f.read_text())
        st = p['estagio']; i = STAGES.index(st)
        hom = PROJECTS / p['id'] / f'homologacao-{p.get("atual", "")}.json'
        h = json.loads(hom.read_text()) if hom.exists() else None
        pipe = ' → '.join(f'**{s}**' if k == i else (f'~~{s}~~' if k < i else s) for k, s in enumerate(STAGES))
        rows.append(f'| {p["nome"]} (`{p["assetId"]}`) | {p.get("atual") or "—"} | {pipe} | '
                    f'{h["status"] if h else "sem homologação"} | {p.get("proximo", "")} |')
    (PROJECTS / 'index.json').write_text(json.dumps({'projetos': ids}, ensure_ascii=False, indent=2) + '\n')
    BOARD.write_text('# Sculpture Studio · quadro de produção\n\n'
                     f'Gerado por `tools/sculpture-homologate.py --quadro` em {datetime.date.today().isoformat()}. '
                     'Fonte: `arena-forge/sculpture-studio/projects/*.json`.\n\n'
                     'Estágios: CONCEPT → MODELING → TECHNICAL_QA → ART_REVIEW → APPROVED → PUBLISHED. '
                     'O estágio atual está em negrito; os concluídos, riscados. APPROVED só com revisão do autor; PUBLISHED só com publicação oficial.\n\n'
                     '| Asset | Versão | Estágio | Homologação | Próximo passo |\n| --- | --- | --- | --- | --- |\n' + '\n'.join(rows) + '\n')
    print('quadro em', BOARD.relative_to(ROOT))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('projeto', nargs='?'); ap.add_argument('--versao'); ap.add_argument('--testes'); ap.add_argument('--quadro', action='store_true')
    a = ap.parse_args()
    if a.projeto:
        proj = json.loads((PROJECTS / f'{a.projeto}.json').read_text())
        versao = a.versao or proj['atual']
        checks, lods = homologate(proj, versao, a.testes)
        testes = run_tests(proj, a.testes) if a.testes else []
        tec_ok = all(c['ok'] for c in checks) and testes and all(t['ok'] for t in testes)
        art = proj.get('artistico', {}).get(versao, {'status': 'ART_REVIEW_PENDING', 'revisor': None, 'data': None, 'notas': ''})
        tec = 'TECHNICALLY_VALIDATED' if tec_ok else ('TECHNICAL_QA_INCOMPLETE' if not testes else 'TECHNICAL_QA_FAILED')
        anterior = next((x for x in proj['versoes'] if x['id'] == proj.get('anterior')), None)
        comp = []
        if anterior and versao == proj['atual']:
            for l in LODS:
                f = ROOT / anterior['pasta'] / proj['glb'].format(lod=l)
                if f.exists(): comp.append({'lod': l, 'tri': glb_facts(f)['tri']})
        out = {'projeto': proj['id'], 'assetId': proj['assetId'], 'versao': versao, 'data': datetime.datetime.now().isoformat(timespec='seconds'),
               'status': f'{tec} / {art["status"]}', 'tecnico': {'status': tec, 'checks': checks}, 'artistico': art,
               'criteriosArte': [{'criterio': c, 'estado': 'pendente'} for c in proj.get('criteriosArte', [])],
               'lods': lods, 'comparacao': {'versao': proj.get('anterior'), 'lods': comp}, 'testes': testes, 'capturas': proj['capturas']}
        dst = PROJECTS / proj['id'] / f'homologacao-{versao}.json'
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
        falhas = [c for c in checks if not c['ok']] + [t for t in testes if not t['ok']]
        print(out['status'], f'· {len(checks)} verificações, {len(testes)} testes, {len(falhas)} falhas')
        for x in falhas: print('  falhou:', x.get('nome'), x.get('detalhe', x.get('errosDePagina', '')))
        print('gravado', dst.relative_to(ROOT))
    if a.quadro or a.projeto: board()


if __name__ == '__main__':
    main()
