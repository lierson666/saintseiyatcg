#!/usr/bin/env python3
"""Sculpture Studio · catálogo de variantes e verificação de mapas (V15.2, 08/11/2026).

  python3 tools/sculpture_catalog.py            grava arena-forge/assets/sculpture-catalog.json
  python3 tools/sculpture_catalog.py --check    só confere (sai com erro se uma variante elegível tiver mapa ruim)

Fonte da verdade: as versões dos projetos (arena-forge/sculpture-studio/projects/*.json), campo `variantes`
(lod0, lod1, lod2, mobile → arquivo) e `legado` (arquivos preservados por histórico, nunca elegíveis).
Tudo é medido no próprio GLB: triângulos, texturas, memória estimada (largura × altura × 4 × 1,33 de mipmaps),
SHA-256 (conferido com o SHA256SUMS da pasta) e integridade de cada mapa.

Integridade dos mapas (map_integrity): distingue mapa vazio ou preto por defeito de mapa escuro de propósito.
- imagem constante (desvio < 1,5 em todos os canais): normal (128, 128, 255) é um normal plano válido; constante preta
  é PRETO e qualquer outra constante é VAZIO;
- imagem preta (média de todos os canais < 8): PRETO, a não ser que o projeto declare o mapa em
  build.pretoIntencional;
- divergência: se a mesma imagem (mesmo nome sem _512) existe no LOD0 com luminância > 25 e esta tem menos de
  30 % dela, é DIVERGENTE (pega um export que escureceu o mapa mesmo sem zerar).
Um mapa escuro com textura (desvio alto) passa: escuro de propósito tem variação; defeito não tem.
"""
import hashlib
import io
import json
import struct
import sys
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / 'arena-forge/sculpture-studio/projects'
OUT = ROOT / 'arena-forge/assets/sculpture-catalog.json'
TEX_MAX = {'lod0': 2048, 'lod1': 1024, 'lod2': 1024, 'mobile': 512}


def read_glb(path):
    raw = Path(path).read_bytes()
    if raw[:4] != b'glTF': raise ValueError('não é GLB')
    n = struct.unpack_from('<I', raw, 12)[0]
    return json.loads(raw[20:20 + n]), raw[28 + n:], raw


def images(g, binc):
    out = []
    for im in g.get('images', []):
        v = g['bufferViews'][im['bufferView']]; o = v.get('byteOffset', 0)
        out.append((im.get('name', ''), Image.open(io.BytesIO(binc[o:o + v['byteLength']])).convert('RGB')))
    return out


def kind(name):
    n = name.lower()
    return 'normal' if 'normal' in n else 'orm' if 'orm' in n else 'base' if 'base' in n else 'outro'


def stats(img):
    s = ImageStat.Stat(img.resize((64, 64)))
    return s.mean, s.stddev


def map_integrity(path, ref=None, intencional=()):
    """Lista de problemas dos mapas do GLB. ref: GLB de referência (LOD0) para a divergência."""
    g, b, _ = read_glb(path)
    refs = {}
    if ref and Path(ref).exists():
        gr, br, _ = read_glb(ref)
        refs = {n: stats(i)[0] for n, i in images(gr, br)}
    probs = []
    for name, img in images(g, b):
        mean, sd = stats(img)
        base = name.removesuffix('_512')
        if name in intencional or base in intencional: continue
        if max(sd) < 1.5:
            flat_normal = kind(name) == 'normal' and abs(mean[0] - 128) < 12 and abs(mean[1] - 128) < 12 and mean[2] > 230
            if not flat_normal: probs.append({'imagem': name, 'tipo': 'PRETO' if max(mean) < 8 else 'VAZIO', 'media': [round(x, 1) for x in mean]})
            continue
        if max(mean) < 8:
            probs.append({'imagem': name, 'tipo': 'PRETO', 'media': [round(x, 1) for x in mean]}); continue
        r = refs.get(base)
        if r and sum(r) / 3 > 25 and sum(mean) / 3 < .3 * sum(r) / 3:
            probs.append({'imagem': name, 'tipo': 'DIVERGENTE', 'media': [round(x, 1) for x in mean], 'referencia': [round(x, 1) for x in r]})
    return probs


def facts(path):
    g, b, raw = read_glb(path)
    tri = sum(g['accessors'][p['indices']]['count'] // 3 for m in g.get('meshes', []) for p in m['primitives'])
    sizes = [i.size for _, i in images(g, b)]
    mem = sum(w * h * 4 * 1.33 for w, h in sizes)
    return {'tri': tri, 'texturas': len(sizes), 'texturaMax': max((max(s) for s in sizes), default=0),
            'memoriaTexturaMB': round(mem / 1048576, 1), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def sums(folder):
    f = folder / 'SHA256SUMS'
    if not f.exists(): return {}
    return {l.split()[1].lstrip('*'): l.split()[0] for l in f.read_text().splitlines() if l.strip()}


def art_state(proj):
    return {'APPROVED': 'ART_APPROVED', 'PUBLISHED': 'PUBLISHED'}.get(proj.get('estagio'), 'ART_REVIEW_PENDING')


def entry(proj, ver, lod, rel, legacy=None):
    path = ROOT / rel
    if not path.exists():
        return {'projeto': proj['id'], 'versao': ver['id'], 'lod': lod, 'arquivo': rel, 'estado': 'REJECTED', 'elegivel': False, 'erro': 'arquivo ausente'}
    fa = facts(path)
    ref = ROOT / ver['variantes']['lod0'] if lod != 'lod0' else None
    probs = map_integrity(path, ref, proj.get('build', {}).get('pretoIntencional', []))
    expected = sums(path.parent).get(path.name)
    lo, hi = proj['orcamento'][lod]
    tex_ok = fa['texturaMax'] <= TEX_MAX[lod]
    tech = not probs and expected == fa['sha256'] and lo <= fa['tri'] <= hi and tex_ok
    e = {'projeto': proj['id'], 'nome': proj['nome'], 'versao': ver['id'], 'lod': lod, 'arquivo': rel, **fa,
         'hashOk': expected == fa['sha256'], 'orcamentoTri': [lo, hi], 'orcamentoOk': lo <= fa['tri'] <= hi, 'texturaOk': tex_ok,
         'mapas': {'ok': not probs, 'problemas': probs}}
    if legacy:
        e.update(estado='LEGACY_DEFECTIVE' if probs else 'LEGACY', elegivel=False, motivo=legacy.get('motivo', ''))
    else:
        e.update(estado='TECHNICALLY_VALIDATED' if tech else 'REJECTED', elegivel=tech, artistico=art_state(proj))
    return e


def build():
    cat = {'gerado': 'tools/sculpture_catalog.py', 'esculturas': {}}
    for pf in sorted(PROJECTS.glob('*.json')):
        if pf.name == 'index.json': continue
        proj = json.loads(pf.read_text())
        if 'versoes' not in proj: continue
        sc = cat['esculturas'][proj['id']] = {'nome': proj['nome'], 'atual': proj.get('atual'), 'posicao': proj.get('posicao'), 'versoes': {}}
        for ver in proj['versoes']:
            if 'variantes' not in ver: continue
            vs = sc['versoes'][ver['id']] = {'flag': ver.get('flag'), 'variantes': {}, 'legado': []}
            for lod, rel in ver['variantes'].items():
                vs['variantes'][lod] = entry(proj, ver, lod, rel)
            for lg in ver.get('legado', []):
                vs['legado'].append(entry(proj, ver, lg['lod'], lg['arquivo'], legacy=lg))
    return cat


if __name__ == '__main__':
    cat = build()
    bad = [(p, v, l, e['estado'], e.get('mapas', {}).get('problemas'), e.get('erro')) for p, s in cat['esculturas'].items() for v, x in s['versoes'].items()
           for l, e in x['variantes'].items() if not e['elegivel']]
    for p, s in cat['esculturas'].items():
        for v, x in s['versoes'].items():
            row = ' '.join(f"{l}:{e['tri']}t/{e['texturaMax']}px/{e['memoriaTexturaMB']}MB/{'ok' if e['elegivel'] else e['estado']}" for l, e in x['variantes'].items())
            leg = ' '.join(f"[{e['lod']} {e['estado']} {len(e['mapas']['problemas'])} mapas]" for e in x['legado'])
            print(f'{p:16} {v:5} {row} {leg}')
    if '--check' not in sys.argv:
        OUT.write_text(json.dumps(cat, indent=1, ensure_ascii=False) + '\n'); print('gravado', OUT.relative_to(ROOT))
    if bad:
        print('NÃO ELEGÍVEIS:', bad); sys.exit(1)
