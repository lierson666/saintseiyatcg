"""Texture Library / Material Studio: servidor local (card-forge/material_studio.py) sem rede, numa pasta temporária.

python3 tools/test-material-studio.py
Troca http_get por respostas falsas com o formato real das APIs (Poly Haven /assets e /files, ambientCG v3 + zip)
e confere: busca PT/EN, filtros, paginação, falha de rede, instalação com ARM, sem normal map, md5 corrompido,
zip corrompido, arquivo que não é imagem, cancelamento, cache e duplicidade, 8K explícito, host não confiável,
id com path traversal, remoção protegida, preset e projeto com material ausente, importação manual e licença.
"""
import base64
import importlib.util
import io
import json
import os
import struct
import tempfile
import threading
import time
import zipfile
import zlib
from hashlib import md5
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('material_studio', ROOT / 'card-forge/material_studio.py')
ms = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ms)
REAL_GET = ms.http_get
passed = []


def ok(name, cond):
    assert cond, name
    passed.append(name)
    print('ok  ', name)


def png(w=4, h=4):
    raw = b''.join(b'\x00' + b'\x80\x80\x80' * w for _ in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


IMG = png()
PH_ASSETS = {f'marble_{i:02d}': {'name': f'Marble {i:02d}', 'tags': ['marble', 'white'], 'categories': ['floor'], 'max_resolution': [8192, 4096], 'download_count': 100 - i}
             for i in range(1, 31)}
PH_ASSETS['rusty_gold'] = {'name': 'Rusty Gold', 'tags': ['gold', 'metal'], 'categories': ['metal'], 'max_resolution': [4096, 2048], 'download_count': 5}
PH_ASSETS['bark_01'] = {'name': 'Bark', 'tags': ['wood'], 'categories': ['natural'], 'max_resolution': [2048, 1024], 'download_count': 1}
mode = {'net': True, 'md5': True, 'slow': False}


def ph_file(name):
    return {'url': f'https://dl.polyhaven.org/file/{name}.png', 'size': len(IMG), 'md5': md5(IMG).hexdigest() if mode['md5'] else '0' * 32}


def acg_zip(maps):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        for m in maps:
            z.writestr(f'Rock001_1K-JPG_{m}.png', IMG)
        z.writestr('Rock001_1K-JPG.blend', b'BLENDER-not-run')
        z.writestr('../../evil_Color.png.sh', b'#!/bin/sh')
        z.writestr('Rock001_1K-JPG_NormalDX.png', IMG)
    return buf.getvalue()


ZIPS = {'Rock001': acg_zip(['Color', 'NormalGL', 'Roughness', 'Displacement']), 'Flat001': acg_zip(['Color', 'Roughness']),
        'Broken001': b'PK\x03\x04 isto nao e um zip', 'Fake001': None}


def fake_get(url, limit=ms.FILE_LIMIT, cancel=None, progress=None):
    if not mode['net']:
        raise OSError('rede fora do ar')
    if url.startswith('https://api.polyhaven.com/assets'):
        return json.dumps(PH_ASSETS).encode(), 'application/json'
    if url.startswith('https://api.polyhaven.com/files/'):
        pid = url.rsplit('/', 1)[1]
        files = {'Diffuse': {'1k': {'png': ph_file('diff')}}, 'nor_gl': {'1k': {'png': ph_file('nor')}}, 'nor_dx': {'1k': {'png': ph_file('dx')}},
                 'Rough': {'1k': {'png': ph_file('rough')}}, 'Displacement': {'1k': {'png': ph_file('disp')}}, 'blend': {'1k': {'blend': {'url': 'x'}}}}
        if pid != 'bark_01':
            files['arm'] = {'1k': {'png': ph_file('arm')}}
            files['AO'] = {'1k': {'png': ph_file('ao')}}
        return json.dumps(files).encode(), 'application/json'
    if url.startswith('https://dl.polyhaven.org/'):
        for _ in range(20):
            if mode['slow']:
                time.sleep(.05)
            if cancel is not None and cancel.is_set():
                raise ms.Cancelled()
        progress and progress(len(IMG))
        return IMG, 'image/png'
    if url.startswith('https://ambientcg.com/api/v3/assets'):
        from urllib.parse import parse_qs, urlsplit
        q = parse_qs(urlsplit(url).query)
        if 'id' in q:
            pid = q['id'][0]
            return json.dumps({'assets': [{'id': pid, 'title': pid, 'tags': ['rock'], 'downloads': [
                {'attributes': '1K-JPG', 'extension': 'zip', 'url': f'https://ambientcg.com/get?file={pid}_1K-JPG.zip', 'size': 1000}]}]}).encode(), 'application/json'
        off, lim = int(q['offset'][0]), int(q['limit'][0])
        allx = [{'id': f'Rock{i:03d}', 'title': f'Rock {i:03d}', 'tags': ['rock'], 'previews': [
            {'type': 'pbr-one-material-maps', 'url': f'https://ambientcg.com/x?texture_url=https://f003.backblazeb2.com/a/Rock{i:03d}_Color.jpg,https://f003.backblazeb2.com/b.jpg'}],
            'downloads': [{'attributes': '1K-JPG'}, {'attributes': '2K-JPG'}, {'attributes': '2K-PNG'}]} for i in range(1, 51)]
        return json.dumps({'totalResults': len(allx), 'assets': allx[off:off + lim]}).encode(), 'application/json'
    if url.startswith('https://ambientcg.com/get?file='):
        pid = url.split('=')[1].split('_')[0]
        data = ZIPS[pid]
        if data is None:
            return b'<html>login</html>', 'text/html'
        return data, 'application/zip'
    raise AssertionError(f'URL inesperada no teste: {url}')


def wait(job):
    for _ in range(400):
        st = ms.status(job['id']) if job.get('id') else job
        if st['estado'] != 'baixando':
            return st
        time.sleep(.02)
    raise AssertionError('instalação não terminou')


def install(**body):
    r = ms.start_install(ROOT, {'resolucao': '1k', 'tipo': 'material', **body}, write)
    return r if r.get('cache') else wait(r)


def main():
    tmp = Path(tempfile.mkdtemp())
    os.environ['MATERIAL_DATA_DIR'] = str(tmp)
    ms.http_get = fake_get
    lib_file = tmp / ms.LIBRARY

    # 1. Busca: termos em português viram inglês; resultado vem da API; paginação e filtros.
    r = ms.search(ROOT, {'q': 'mármore branco', 'fonte': 'polyhaven', 'limit': 10})
    ok('busca PT: "mármore branco" vira marble/white', r['termos'] == ['marble', 'white'] and r['resultados'][0]['id'] == 'marble_01')
    r2 = ms.search(ROOT, {'q': 'marble', 'fonte': 'polyhaven', 'limit': 10, 'offset': 10})
    ok('paginação: 30 resultados, segunda página começa no 11º', r['totais']['polyhaven'] == 30 and r2['resultados'][0]['id'] == 'marble_11')
    r = ms.search(ROOT, {'filtro': 'gold', 'fonte': 'polyhaven'})
    ok('filtro Gold só traz ouro', [x['id'] for x in r['resultados']] == ['rusty_gold'])
    r = ms.search(ROOT, {'q': 'rocha', 'fonte': 'ambientcg', 'limit': 24, 'offset': 24})
    ok('ambientCG: total real, paginação, só JPG, miniatura de host confiável',
       r['totais']['ambientcg'] == 50 and r['resultados'][0]['id'] == 'Rock025' and r['resultados'][0]['resolucoes'] == ['1k', '2k']
       and r['resultados'][0]['thumb'].startswith('https://f003.backblazeb2.com/'))
    r = ms.search(ROOT, {'q': 'marble', 'tipo': 'hdri', 'fonte': 'todas'})
    ok('HDRI: ambientCG fica de fora (só materiais)', 'ambientcg' not in r['totais'])
    mode['net'] = False
    ms._ph_cache.clear()
    r = ms.search(ROOT, {'q': 'marble', 'fonte': 'todas'})
    ok('falha de rede: busca devolve erro por provedor, sem quebrar', set(r['erros']) == {'polyhaven', 'ambientcg'} and r['resultados'] == [])
    st = install(fonte='polyhaven', id='marble_01')
    ok('falha de rede na instalação: erro e nada instalado', st['estado'] == 'erro' and not lib_file.exists())
    mode['net'] = True

    # 2. Instalação Poly Haven: ARM no lugar de rugosidade/metal/AO separados; normal OpenGL; arquivos conferidos no disco.
    st = install(fonte='polyhaven', id='marble_01')
    m = st['material']
    ok('Poly Haven: instala com ARM, normal GL, altura e cor', st['estado'] == 'pronto' and m['mapas'] == ['arm', 'color', 'height', 'normal'])
    ok('arquivos no disco conferem com sha256 e licença CC0', ms.intact(ROOT, m) and m['licenca']['tipo'] == 'CC0-1.0'
       and (tmp / m['arquivos']['color']['caminho'].lstrip('/')).stat().st_mode & 0o777 == 0o644 and m['arquivos']['color']['largura'] == 4)
    st = install(fonte='polyhaven', id='bark_01')
    ok('sem ARM: usa rugosidade e AO separados', st['material']['mapas'] == ['color', 'height', 'normal', 'roughness'])

    # 3. Cache e duplicidade.
    again = install(fonte='polyhaven', id='marble_01')
    lib = ms.read(ROOT)
    ok('duplicado: devolve do cache, sem baixar de novo nem duplicar', again.get('cache') and sum(x['id'] == m['id'] for x in lib['materiais']) == 1)
    (tmp / m['arquivos']['color']['caminho'].lstrip('/')).write_bytes(b'estragado')
    st = install(fonte='polyhaven', id='marble_01')
    ok('cache corrompido: reinstala', not st.get('cache') and ms.intact(ROOT, st['material']))

    # 4. Arquivo corrompido (md5) e cancelamento.
    mode['md5'] = False
    st = install(fonte='polyhaven', id='marble_05')
    ok('md5 não confere: erro, nada instalado', st['estado'] == 'erro' and 'md5' in st['erro'] and not ms.installed(ms.read(ROOT), 'polyhaven', 'marble_05', '1k'))
    mode['md5'] = True
    mode['slow'] = True
    job = ms.start_install(ROOT, {'fonte': 'polyhaven', 'id': 'marble_06', 'resolucao': '1k'}, write)
    ms.cancel(job['id'])
    st = wait(job)
    mode['slow'] = False
    ok('cancelar: estado cancelado e nada instalado', st['estado'] == 'cancelado' and not ms.installed(ms.read(ROOT), 'polyhaven', 'marble_06', '1k'))

    # 5. ambientCG: zip lido em memória; só mapas conhecidos; NormalGL; .blend e nomes estranhos ignorados.
    st = install(fonte='ambientcg', id='Rock001')
    m = st['material']
    files = sorted(p.relative_to(tmp).as_posix() for p in (tmp / ms.ASSETS).rglob('*') if p.is_file() and 'Rock001' in p.as_posix())
    ok('ambientCG: zip vira mapas semânticos (NormalGL), sem .blend nem script', m['mapas'] == ['color', 'height', 'normal', 'roughness']
       and all(f.endswith('.png') for f in files) and len(files) == 4)
    st = install(fonte='ambientcg', id='Flat001')
    ok('material sem normal map instala e declara os mapas que tem', st['estado'] == 'pronto' and 'normal' not in st['material']['mapas'])
    st = install(fonte='ambientcg', id='Broken001')
    ok('zip corrompido: erro', st['estado'] == 'erro' and 'orrompido' in st['erro'])
    st = install(fonte='ambientcg', id='Fake001')
    ok('resposta que não é zip (MIME): erro', st['estado'] == 'erro' and 'zip' in st['erro'])

    # 6. Fronteira: 8K explícito, id inválido, host não confiável.
    for body, msg in (({'fonte': 'polyhaven', 'id': 'marble_01', 'resolucao': '8k'}, '8K'), ({'fonte': 'polyhaven', 'id': '../etc', 'resolucao': '1k'}, 'inválidos'),
                      ({'fonte': 'cgtrader', 'id': 'x', 'resolucao': '1k'}, 'inválidos')):
        try:
            ms.start_install(ROOT, body, write)
            raise AssertionError(body)
        except ValueError as e:
            assert msg in str(e), e
    ok('8K só com confirmação; id com ../ e fonte desconhecida recusados', True)
    for url in ('https://evil.example.com/a.jpg', 'http://dl.polyhaven.org/a.jpg', 'file:///etc/passwd'):
        try:
            REAL_GET(url)
            raise AssertionError(url)
        except ValueError:
            pass
    ok('download só de https em hosts dos provedores', True)
    ok('arquivo que não é imagem é recusado', ms.kind_of(b'<html>') is None and ms.kind_of(IMG) == 'png')

    # 7. Biblioteca: presets e projetos só com material instalado; remoção protegida; arquivos e pastas apagados.
    lib = ms.read(ROOT)
    pm = 'polyhaven-marble_01-1k'
    good = {'presets': {'Athena': [{'nome': 'Mármore', 'material': pm, 'params': {}}, {'nome': 'Obsidiana', 'material': None, 'substituto': pm, 'pendencia': 'sem resultado'}]},
            'projetos': {'poseidon-palace-pbr-v1': {'slots': {'Paredes': {'material': pm, 'params': {'repeatX': 2}}}, 'objetos': {'3': {'material': 'ambientcg-rock001-1k', 'params': {}}}}}}
    ms.save_lib(ROOT, {'biblioteca': good}, write)
    for bad in ({'presets': {'Ares': [{'nome': 'x', 'material': 'nao-existe'}]}},
                {'projetos': {'poseidon-palace-pbr-v1': {'objetos': {'1': {'material': 'nao-existe'}}}}},
                {'projetos': {'../x': {}}}):
        try:
            ms.save_lib(ROOT, {'biblioteca': bad}, write)
            raise AssertionError(bad)
        except ValueError:
            pass
    ok('preset e projeto com material ausente são recusados', True)
    ok('salvar não deixa o cliente inventar material instalado', len(ms.save_lib(ROOT, {'biblioteca': {**good, 'materiais': []}}, write)['biblioteca']['materiais']) == len(lib['materiais']))
    try:
        ms.remove(ROOT, {'id': 'ambientcg-rock001-1k'}, write)
        raise AssertionError('removeu em uso')
    except ValueError as e:
        ok('remover material usado por objeto do projeto é recusado', 'Em uso' in str(e))
    ms.save_lib(ROOT, {'biblioteca': {**good, 'projetos': {}}}, write)
    rock = ms.installed(ms.read(ROOT), 'ambientcg', 'Rock001', '1k')
    ms.remove(ROOT, {'id': rock['id']}, write)
    ok('remover apaga arquivos e pastas vazias', not (tmp / ms.ASSETS / 'ambientcg/Rock001').exists() and not ms.installed(ms.read(ROOT), 'ambientcg', 'Rock001', '1k'))

    # 8. Importação manual: licença e origem obrigatórias.
    data = 'data:image/png;base64,' + base64.b64encode(IMG).decode()
    for body in ({'nome': 'X', 'url_origem': 'https://cgbookcase.com/x', 'licenca': 'Proprietária', 'mapas': {'color': data}},
                 {'nome': 'X', 'url_origem': 'https://cgbookcase.com/x', 'licenca': 'CC-BY-4.0', 'mapas': {'color': data}},
                 {'nome': 'X', 'url_origem': 'https://cgbookcase.com/x', 'licenca': 'CC0-1.0', 'mapas': {'color': 'data:text/html;base64,PGh0bWw+'}}):
        try:
            ms.manual_import(ROOT, body, write)
            raise AssertionError(body)
        except ValueError:
            pass
    r = ms.manual_import(ROOT, {'nome': 'Pedra cgbookcase', 'url_origem': 'https://www.cgbookcase.com/textures/x', 'licenca': 'CC0-1.0', 'mapas': {'color': data, 'normal': data}}, write)
    ok('importação manual: exige licença permitida, atribuição em CC BY e imagem real', r['material']['mapas'] == ['color', 'normal'] and ms.intact(ROOT, r['material']))
    print(json.dumps({'ok': True, 'testes': len(passed), 'pasta': str(tmp)}))


if __name__ == '__main__':
    main()
