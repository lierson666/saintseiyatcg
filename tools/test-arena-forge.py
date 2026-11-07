"""ARENA FORGE 5.0: gravação no servidor local (card-forge/arena_forge.py) numa pasta temporária.

python3 tools/test-arena-forge.py
Confere: schema na fronteira, manifesto derivado do histórico, versão publicada imutável,
publicação sem validação recusada, rollback, miniatura e falha de arquivo ausente.
"""
import base64
import copy
import importlib.util
import json
import os
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('arena_forge', ROOT / 'card-forge/arena_forge.py')
af = importlib.util.module_from_spec(spec)
spec.loader.exec_module(af)


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def seed():
    js = "import {build} from './tools/arena-seed.mjs'; console.log(JSON.stringify(build(null)))"
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def refused(fn, *args):
    try:
        fn(*args)
    except ValueError as error:
        return str(error)
    raise AssertionError(f'deveria recusar: {args[1:]}')


def main():
    tmp = Path(tempfile.mkdtemp())
    os.environ['ARENA_DATA_DIR'] = str(tmp)
    assert 'Biblioteca ausente' in refused(af.read, ROOT)

    lib = seed()
    r = af.save(ROOT, {'biblioteca': lib}, write)
    assert len(r['manifesto']['arenas']) == 7
    assert oct((tmp / af.MANIFEST).stat().st_mode)[-3:] == '644'
    stored = af.read(ROOT)
    assert stored['biblioteca'] == lib and stored['manifesto']['arenas'] == r['manifesto']['arenas']

    # Schema na fronteira.
    for patch in ({'params': {'glow': 'red'}}, {'params': {'pulse': 9}}, {'params': {'evil': 1}}, {'base': 'x'}, {'faccao': 'Zeus'}, {'id': 'Bad'}):
        bad = copy.deepcopy(lib)
        bad['arenas'][0].update(patch)
        refused(af.save, ROOT, {'biblioteca': bad}, write)
    refused(af.save, ROOT, {'biblioteca': {'schema': 1, 'arenas': []}}, write)

    # Versão publicada não muda nem some.
    bad = copy.deepcopy(lib)
    bad['arenas'][0]['historico'][0]['snapshot']['variantes'][0]['params']['skyTop'] = '#ffffff'
    assert 'não pode mudar' in refused(af.save, ROOT, {'biblioteca': bad}, write)
    bad = copy.deepcopy(lib)
    bad['arenas'][0]['historico'] = []
    bad['arenas'][0]['publicado'] = None
    assert 'não pode mudar' in refused(af.save, ROOT, {'biblioteca': bad}, write)

    # Nova versão no histórico sem validação aprovada é recusada; com validação, entra e vira o manifesto.
    athena = next(a for a in lib['arenas'] if a['id'] == 'athena')
    snap = copy.deepcopy(athena['historico'][0]['snapshot'])
    snap['versao'] = 2
    pub = copy.deepcopy(lib)
    a = next(x for x in pub['arenas'] if x['id'] == 'athena')
    entry = {'versao': 2, 'em': 't', 'por': 'autor', 'nota': '', 'validacao': {'ok': False, 'itens': []}, 'snapshot': snap}
    a.update(status='published', publicado=2, historico=a['historico'] + [entry])
    assert 'sem validação' in refused(af.save, ROOT, {'biblioteca': pub}, write)
    entry['validacao']['ok'] = True
    man = af.save(ROOT, {'biblioteca': pub}, write)['manifesto']
    assert next(x for x in man['arenas'] if x['id'] == 'athena')['versao'] == 2

    # Rollback: aponta para a v1 e o manifesto acompanha; versão fora do histórico é recusada.
    a['publicado'] = 1
    man = af.save(ROOT, {'biblioteca': pub}, write)['manifesto']
    assert next(x for x in man['arenas'] if x['id'] == 'athena')['versao'] == 1
    a['publicado'] = 7
    refused(af.save, ROOT, {'biblioteca': pub}, write)

    # Arquivada sai do manifesto.
    a['publicado'] = 1
    a['status'] = 'archived'
    man = af.save(ROOT, {'biblioteca': pub}, write)['manifesto']
    assert not any(x['id'] == 'athena' for x in man['arenas'])

    # Miniatura: nome e formato na fronteira.
    img = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG fake').decode()
    out = af.thumb(ROOT, {'id': 'athena', 'versao': 2, 'variante': 'golden-hour', 'imagem': img}, write)
    assert (tmp / out['arquivo'].lstrip('/')).exists() and out['arquivo'].endswith('athena@2~golden-hour.png')
    refused(af.thumb, ROOT, {'id': '../x', 'versao': 1, 'variante': 'a', 'imagem': img}, write)
    refused(af.thumb, ROOT, {'id': 'athena', 'versao': 1, 'variante': 'standard', 'imagem': 'data:text/html;base64,AA=='}, write)
    big = 'data:image/png;base64,' + base64.b64encode(b'0' * (af.MAX_THUMB + 1)).decode()
    refused(af.thumb, ROOT, {'id': 'athena', 'versao': 1, 'variante': 'standard', 'imagem': big}, write)
    print(json.dumps({'ok': True, 'pasta': str(tmp)}))


if __name__ == '__main__':
    main()
