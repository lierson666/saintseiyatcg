"""V15.1 (08/11/2026): gera guardian-*-mobile-r2.glb com as texturas certas.

Os GLBs -mobile.glb saíram do build com as 6 texturas redimensionadas para 512² (marfim e mármore) TODAS PRETAS:
o build fazia image.copy() de imagens assadas só em memória, e o Blender recria a cópia vazia. O ouro já era 512² e não
foi copiado, por isso está certo. O -mobile.glb fica intacto (hash preservado); este script cria o -mobile-r2.glb:
a mesma malha, UVs e materiais do mobile, com cada imagem preta trocada pela imagem equivalente do -lod1.glb
(mesma malha e UV do mobile) reduzida a 512² (Lanczos, JPEG 90). Determinístico: rodar de novo dá o mesmo arquivo.

Uso: uv run -q --with pillow --with numpy python tools/fix-mobile-glb-textures.py
"""
import hashlib, io, json, struct
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent / 'arena-forge/assets'
SETS = [('poseidon-v13', 'guardian-tides'), ('poseidon-v14', 'guardian-tides'), ('poseidon-v14-1', 'guardian-tides'),
        ('poseidon-depths-v1', 'guardian-depths'), ('poseidon-depths-v1-1', 'guardian-depths')]


def read(path):
    b = path.read_bytes()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    m = struct.unpack('<I', b[20 + n:24 + n])[0]
    return j, b[28 + n:28 + n + m]


def view(j, bn, i):
    v = j['bufferViews'][i]; o = v.get('byteOffset', 0)
    return bn[o:o + v['byteLength']]


def write(path, j, views):
    """Reempacota: cada bufferView na ordem, alinhado a 4 bytes."""
    out = bytearray()
    for i, data in enumerate(views):
        while len(out) % 4: out.append(0)
        j['bufferViews'][i]['byteOffset'] = len(out); j['bufferViews'][i]['byteLength'] = len(data)
        out += data
    while len(out) % 4: out.append(0)
    j['buffers'][0]['byteLength'] = len(out)
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
    path.write_bytes(glb)


for folder, stem in SETS:
    d = ROOT / folder
    jm, bm = read(d / f'{stem}-mobile.glb')
    j1, b1 = read(d / f'{stem}-lod1.glb')
    views = [view(jm, bm, i) for i in range(len(jm['bufferViews']))]
    fixed = 0
    for k, im in enumerate(jm['images']):
        px = np.asarray(Image.open(io.BytesIO(views[im['bufferView']])).convert('RGB'))
        if px.max() > 8: continue  # imagem boa: fica como está
        src = Image.open(io.BytesIO(view(j1, b1, j1['images'][k]['bufferView']))).convert('RGB')
        assert j1['images'][k]['name'] == im['name'].removesuffix('_512'), (im['name'], j1['images'][k]['name'])
        buf = io.BytesIO(); src.resize((512, 512), Image.LANCZOS).save(buf, 'JPEG', quality=90, optimize=True)
        views[im['bufferView']] = buf.getvalue(); fixed += 1
    out = d / f'{stem}-mobile-r2.glb'
    write(out, jm, views)
    # conferência: tudo legível, 512², nada preto, mesma malha
    j2, b2 = read(out)
    for im in j2['images']:
        a = np.asarray(Image.open(io.BytesIO(view(j2, b2, im['bufferView']))).convert('RGB'))
        assert a.shape[:2] == (512, 512) and a.max() > 8, im['name']
    assert j2['meshes'] == jm['meshes'] and j2['accessors'] == jm['accessors']
    h = hashlib.sha256(out.read_bytes()).hexdigest()
    sums = d / 'SHA256SUMS'
    lines = [l for l in sums.read_text().splitlines() if l.strip() and not l.endswith(f'{stem}-mobile-r2.glb')]
    sums.write_text('\n'.join(lines + [f'{h}  {stem}-mobile-r2.glb']) + '\n')
    print(f'{folder:22} {fixed} texturas trocadas  {out.stat().st_size / 1e6:.2f} MB  {h[:12]}')
