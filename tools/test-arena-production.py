"""Produção de arena (card-forge/arena_production.py) numa pasta temporária, sem servidor.

python3 tools/test-arena-production.py
Confere: semente com as 12 etapas e os assets reais do Palácio, validação (etapas, categorias, estados, dependências,
região do artboard, arquivo ausente), publicação bloqueada, upload de PNG/JPG/GLB com nome versionado pelo conteúdo,
recusa de formato falso e GLB truncado, artboard congelado imutável, manifesto, ZIP (pastas, project.json, arquivos)
e reimportação com ids estáveis, ZIP com path traversal recusado.
"""
import base64
import copy
import importlib.util
import io
import json
import struct
import tempfile
import zipfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('arena_production', ROOT / 'card-forge/arena_production.py')
ap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ap)
passed = []


def ok(name, cond):
    assert cond, name
    passed.append(name)
    print('ok  ', name)


def fails(name, fn, text=''):
    try:
        fn()
    except ValueError as e:
        ok(name, text in str(e))
        return
    raise AssertionError(name + ': não falhou')


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def png(w=6, h=4):
    raw = b''.join(b'\x00' + b'\x80\x80\x80' * w for _ in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


def glb():
    js = b'{"asset":{"version":"2.0"}}  '
    body = struct.pack('<II', len(js), 0x4E4F534A) + js
    return b'glTF' + struct.pack('<II', 2, 12 + len(body)) + body


url = lambda data, mime='image/png': f'data:{mime};base64,' + base64.b64encode(data).decode()

with tempfile.TemporaryDirectory() as tmp:
    R = Path(tmp)
    p = ap.read(R, 'poseidon-palace')
    ok('semente tem as 12 etapas', list(p['etapas']) == ap.STAGES)
    ids = {a['id'] for a in p['assets']}
    ok('semente tem os assets pedidos', {'main-portico', 'pediment', 'staircase', 'columns', 'main-pillar', 'ocean-ceiling', 'light-shafts', 'light-rim', 'circular-platform'} <= ids)
    ok('todas as categorias presentes', {a['categoria'] for a in p['assets']} == set(ap.CATEGORIES))
    ok('7 materiais Poseidon', len(p['materiais']) == 7 and all(m['id'].startswith('POSEIDON_') for m in p['materiais']))
    ok('semente é válida', ap.validate(R, copy.deepcopy(p)) is not None)

    r = ap.save(R, {'projeto': copy.deepcopy(p)}, atomic_write)
    ok('grava e devolve manifesto', r['ok'] and r['manifesto']['camera']['fov'] == 42 and (R / ap.DATA / 'poseidon-palace.json').is_file())

    bad = copy.deepcopy(p); bad['etapas'].pop('approval')
    fails('etapa faltando recusada', lambda: ap.validate(R, bad), '12 etapas')
    bad = copy.deepcopy(p); bad['etapas']['publication']['status'] = 'concluida'
    fails('publicação oficial bloqueada', lambda: ap.validate(R, bad), 'deploy')
    bad = copy.deepcopy(p); bad['assets'][0]['categoria'] = 'props'
    fails('categoria inválida', lambda: ap.validate(R, bad), 'categoria')
    bad = copy.deepcopy(p); bad['assets'][1]['dependencias'] = ['nao-existe']
    fails('dependência ausente', lambda: ap.validate(R, bad), 'dependência')
    bad = copy.deepcopy(p); bad['assets'][1]['referencia'] = {'x': .1, 'y': .2, 'w': 1.4, 'h': .2}
    fails('região fora do artboard', lambda: ap.validate(R, bad), 'região')
    bad = copy.deepcopy(p); bad['assets'][1]['id'] = bad['assets'][0]['id']
    fails('id repetido', lambda: ap.validate(R, bad), 'repetido')
    bad = copy.deepcopy(p); bad['assets'][0]['glb'] = '/playtest/assets/arena-production/poseidon-palace/assets/x.glb'
    fails('GLB que não existe', lambda: ap.validate(R, bad), 'não existe')

    up = ap.upload(R, {'id': 'poseidon-palace', 'tipo': 'artboard', 'nome': 'Concept V1.png', 'dados': url(png(6, 4))}, atomic_write)
    ok('upload PNG com tamanho lido', up['formato'] == 'png' and (up['largura'], up['altura']) == (6, 4) and 'concept-v1-' in up['caminho'])
    up2 = ap.upload(R, {'id': 'poseidon-palace', 'tipo': 'artboard', 'nome': 'Concept V1.png', 'dados': url(png(8, 4))}, atomic_write)
    ok('nova versão não sobrescreve', up2['caminho'] != up['caminho'] and (R / up['caminho'].lstrip('/')).is_file())
    fails('texto disfarçado de PNG', lambda: ap.upload(R, {'id': 'poseidon-palace', 'tipo': 'artboard', 'nome': 'x.png', 'dados': url(b'<html>hi</html>')}, atomic_write), 'PNG')
    fails('GLB como artboard recusado', lambda: ap.upload(R, {'id': 'poseidon-palace', 'tipo': 'artboard', 'nome': 'x.glb', 'dados': url(glb())}, atomic_write), 'PNG')
    g = ap.upload(R, {'id': 'poseidon-palace', 'tipo': 'asset', 'nome': 'Column.glb', 'dados': url(glb(), 'model/gltf-binary')}, atomic_write)
    ok('GLB 2.0 aceito', g['formato'] == 'glb')
    fails('GLB truncado recusado', lambda: ap.upload(R, {'id': 'poseidon-palace', 'tipo': 'asset', 'nome': 'c.glb', 'dados': url(glb()[:-4])}, atomic_write), 'GLB')
    fails('id com traversal', lambda: ap.upload(R, {'id': '../x', 'tipo': 'asset', 'nome': 'c.glb', 'dados': url(glb())}, atomic_write), 'inválido')

    p = ap.read(R, 'poseidon-palace')
    p['artboards'] = [{'id': 'ab-1', 'versao': 1, 'nome': 'Master V1', 'arquivo': up['caminho'], 'congelado': True, 'anotacoes': [{'x': .5, 'y': .2, 'texto': 'frontão'}]},
                      {'id': 'ab-2', 'versao': 2, 'nome': 'Master V2', 'arquivo': up2['caminho'], 'congelado': False, 'anotacoes': []}]
    col = next(a for a in p['assets'] if a['id'] == 'columns')
    col['glb'] = g['caminho']; col['referencia'] = {'x': .3, 'y': .1, 'w': .4, 'h': .3}
    ap.save(R, {'projeto': copy.deepcopy(p)}, atomic_write)
    bad = copy.deepcopy(p); bad['artboards'][0]['anotacoes'] = []
    fails('artboard congelado não muda', lambda: ap.save(R, {'projeto': bad}, atomic_write), 'congelado')
    bad = copy.deepcopy(p); bad['artboards'] = bad['artboards'][1:]
    fails('artboard congelado não é apagado', lambda: ap.save(R, {'projeto': bad}, atomic_write), 'congelado')
    m = ap.manifest(R, ap.read(R, 'poseidon-palace'))
    ok('manifesto aponta o artboard aprovado e o GLB', m['artboard']['id'] == 'ab-1' and g['caminho'] in m['dependencias'] and 'architecture' in m['grupos'])

    data = ap.export_zip(R, 'poseidon-palace')
    z = zipfile.ZipFile(io.BytesIO(data))
    names = set(z.namelist())
    ok('ZIP tem as 10 pastas', all(f'{d}/' in names for d in ap.PACKAGE_DIRS))
    ok('ZIP tem projeto, manifesto e arquivos', {'project.json', 'manifests/scene-manifest.json', 'reports/export-report.json'} <= names
       and any(n.startswith('artboards/concept-v1-') for n in names) and any(n.startswith('assets/column-') for n in names))

    with tempfile.TemporaryDirectory() as tmp2:
        R2 = Path(tmp2)
        res = ap.import_zip(R2, {'zip': base64.b64encode(data).decode()}, atomic_write)
        back = ap.read(R2, 'poseidon-palace')
        ok('reimportação mantém ids estáveis', [a['id'] for a in back['assets']] == [a['id'] for a in p['assets']] and back['artboards'][0]['id'] == 'ab-1')
        ok('arquivos voltam ao lugar', (R2 / up['caminho'].lstrip('/')).is_file() and (R2 / g['caminho'].lstrip('/')).is_file() and len(res['restaurados']) >= 3)
    evil = io.BytesIO()
    with zipfile.ZipFile(evil, 'w') as zz:
        zz.writestr('project.json', json.dumps(p)); zz.writestr('../../etc/x.png', png())
    fails('ZIP com traversal recusado', lambda: ap.import_zip(R, {'zip': base64.b64encode(evil.getvalue()).decode()}, atomic_write), 'não permitido')
    fails('ZIP corrompido', lambda: ap.import_zip(R, {'zip': base64.b64encode(b'nope').decode()}, atomic_write), 'inválido')

# Cinemática: a última chave é a câmera competitiva exata; limites de FOV, duração e VFX; arquivo lido pelo jogo.
with tempfile.TemporaryDirectory() as tmp:
    R = Path(tmp)
    comp = {'stage': 'GAMEPLAY START', 'pos': [0, 13.5, 13], 'look': [0, 0, -0.6], 'fov': 42, 'roll': 0, 'dur': 600, 'ease': 'easeOut', 'light': 1, 'vfx': None, 'sound': None, 'locked': True}
    k0 = {'stage': 'ESTABLISHING SHOT', 'pos': [36, 28, -4], 'look': [0, 18, -58], 'fov': 55, 'roll': 0, 'dur': 900, 'ease': 'linear', 'light': .55, 'vfx': None, 'sound': 'oceano'}
    r = ap.save_cinematic(R, {'arena': 'poseidon', 'keys': [k0, comp]}, atomic_write)
    ok('abertura gravada no arquivo do jogo', r['duracao_ms'] == 1500 and json.loads((R / 'arena-forge/cinematics/poseidon.json').read_text())['keys'][-1]['locked'])
    fails('última chave precisa ser a competitiva', lambda: ap.save_cinematic(R, {'arena': 'poseidon', 'keys': [k0, {**comp, 'fov': 50}]}, atomic_write), 'competitiva')
    fails('chave bloqueada só no fim', lambda: ap.save_cinematic(R, {'arena': 'poseidon', 'keys': [{**k0, 'locked': True}, comp]}, atomic_write), 'última')
    fails('FOV fora do limite', lambda: ap.save_cinematic(R, {'arena': 'poseidon', 'keys': [{**k0, 'fov': 170}, comp]}, atomic_write), 'fov')
    fails('VFX desconhecido', lambda: ap.save_cinematic(R, {'arena': 'poseidon', 'keys': [{**k0, 'vfx': 'nuke'}, comp]}, atomic_write), 'VFX')
    fails('abertura longa demais', lambda: ap.save_cinematic(R, {'arena': 'poseidon', 'keys': [{**k0, 'dur': 20000}, {**k0, 'dur': 15000}, comp]}, atomic_write), '30 s')
    fails('posição com texto', lambda: ap.save_cinematic(R, {'arena': 'poseidon', 'keys': [{**k0, 'pos': [1, 'x', 2]}, comp]}, atomic_write), 'pos')
    fails('arena com traversal', lambda: ap.save_cinematic(R, {'arena': '../x', 'keys': [k0, comp]}, atomic_write), 'inválida')
    pr = ap.read(R, 'poseidon-palace'); pr['artboards'] = [{'id': 'ab-x', 'tipo': 'poster', 'arquivo': None}]
    fails('tipo de artboard desconhecido', lambda: ap.validate(R, pr), 'tipo')
    ok('ZIP leva a abertura em animations/', 'animations/poseidon-cinematic.json' in zipfile.ZipFile(io.BytesIO(ap.export_zip(R, 'poseidon-palace'))).namelist())

print(f'\n{len(passed)} testes ok')
