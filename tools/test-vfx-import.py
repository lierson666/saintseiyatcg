#!/usr/bin/env python3
"""Importador do catálogo de efeitos: cada formato vira o mesmo sprite sheet, e o mesmo efeito não entra duas vezes."""
import base64, io, json, sys, tempfile, zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'card-forge'))
from PIL import Image
from vfx_import import add_effect, decode, edit_body, import_body, load_catalog, trimmed

W, H, N = 16, 12, 6
# Pixels totalmente opacos: GIF e WebP sem perda devolvem exatamente estas cores, então o hash pode ser comparado.
FRAMES = [Image.new('RGBA', (W, H), (255, 40 * i, 0, 255)) for i in range(N)]
INFO = {'nome': 'Teste', 'fonte': 'pixeldust', 'licenca': 'CC0-1.0'}


def encoded(fmt, **extra):
    out = io.BytesIO()
    FRAMES[0].save(out, fmt, save_all=True, append_images=FRAMES[1:], duration=50, **extra)
    return out.getvalue()


def grid(cols):
    sheet = Image.new('RGBA', (W * cols, H * (N // cols)))
    for i, f in enumerate(FRAMES):
        sheet.paste(f, ((i % cols) * W, (i // cols) * H))
    out = io.BytesIO()
    sheet.save(out, 'PNG')
    return out.getvalue()


def png(frame):
    out = io.BytesIO()
    frame.save(out, 'PNG')
    return out.getvalue()


def zipped(files):
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w') as z:
        for name, data in files.items():
            z.writestr(name, data)
    return out.getvalue()


PIXELDUST = {'image': 'x.png', 'frameWidth': W, 'frameHeight': H, 'frameCount': N, 'columns': 3, 'rows': 2, 'fps': 20, 'frameDurationMs': 50, 'frames': [{'index': i, 'x': (i % 3) * W, 'y': (i // 3) * H, 'w': W, 'h': H} for i in range(N)]}
ATLAS = {'frames': {f'f{i}': {'frame': {'x': (i % 3) * W, 'y': (i // 3) * H, 'w': W, 'h': H}, 'duration': 50} for i in range(N)}}

CASES = {
    'gif': lambda: decode('a.gif', encoded('GIF')),
    'webp': lambda: decode('a.webp', encoded('WEBP', lossless=True)),
    'apng': lambda: decode('a.png', encoded('PNG')),
    'sheet+grade': lambda: decode('a.png', grid(3), None, 3, 2),
    'sheet+pixeldust': lambda: decode('a.png', grid(3), PIXELDUST),
    'sheet+atlas': lambda: decode('a.png', grid(3), ATLAS),
    'zip png': lambda: decode('a.zip', zipped({f'f{i + 1}.png': png(f) for i, f in enumerate(FRAMES)})),
    'zip sheet+json': lambda: decode('a.zip', zipped({'s.png': grid(3), 's.json': json.dumps(PIXELDUST)})),
}

with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    ids = set()
    for name, case in CASES.items():
        frames, times = case()
        assert len(frames) == N, f'{name}: {len(frames)} quadros'
        effect, duplicate = add_effect(frames, times, {**INFO, 'formato': name}, root)
        assert duplicate == bool(ids), f'{name} não reconheceu o efeito repetido'
        ids.add(effect['id'])
    assert len(ids) == 1, ids
    catalog = load_catalog(root)
    assert len(catalog['efeitos']) == 1
    effect = catalog['efeitos'][0]
    assert (effect['w'], effect['h'], effect['quadros'], effect['fps']) == (W, H, N, 20), effect
    assert (root / effect['arquivo']).exists() and effect['licenca'] == 'CC0-1.0'

    body = {**INFO, 'nome': 'Outro', 'arquivo': {'nome': 'b.png', 'base64': base64.b64encode(grid(2)).decode()}, 'colunas': 2, 'linhas': 3, 'loop': True}
    assert import_body(body, root)['duplicado'] is True  # mesmo efeito em outra grade
    edited = edit_body({'id': effect['id'], 'tipo': 'fogo', 'faccoes': ['ares'], 'gatilhos': ['golpe']}, root)['efeito']
    assert edited['tipo'] == 'fogo' and edited['faccoes'] == ['ares'] and edited['hash'] == effect['hash']

    small = Image.new('RGBA', (20, 20))
    small.paste((255, 0, 0, 255), (5, 6, 8, 9))
    other = Image.new('RGBA', (20, 20))
    other.paste((255, 0, 0, 255), (10, 12, 12, 14))
    assert {f.size for f in trimmed([small, other])} == {(7, 8)}  # a mesma área em todos: o efeito não pula
    bad = [
        {**body, 'licenca': ''},
        {**body, 'acesso': 'pago'},
        {**body, 'fonte': '../x'},
        {**body, 'tipo': 'x'},
        {**body, 'colunas': 5},
        {**body, 'arquivo': {'nome': 'a.exe', 'base64': 'AAAA'}},
        {**body, 'arquivo': {'nome': 'a.png', 'base64': '***'}},
        {**body, 'arquivo': {'nome': 'a.png', 'base64': 'AAAA'}, 'colunas': None, 'linhas': None},
        {**body, 'json': '{"frameWidth":999,"frameHeight":999,"frameCount":2}', 'colunas': None, 'linhas': None},
    ]
    for wrong in bad:
        try:
            import_body(wrong, root)
        except ValueError:
            continue
        raise AssertionError(f'aceitou: {wrong.get("fonte")} {wrong.get("tipo")} {wrong.get("licenca")!r}')
    assert len(load_catalog(root)['efeitos']) == 1
print('ok')
