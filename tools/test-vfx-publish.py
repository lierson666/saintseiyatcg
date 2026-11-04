#!/usr/bin/env python3
"""Publicação segura das animações (card-forge/vfx_publish.py)."""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'card-forge'))
import vfx_publish as pub


def refused(fn, *args, **kw):
    try:
        fn(*args, **kw)
    except ValueError as error:
        return str(error)
    raise AssertionError(f'aceitou {args}')


with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    (root / 'data').mkdir()
    (root / 'shared/vfx').mkdir(parents=True)
    (root / 'shared/vfx/presets.js').write_text("export const SHADERS = [{id: 'water'}];")
    (root / 'folha.png').write_bytes(b'x')

    def put(rel, data):
        (root / rel).write_text(json.dumps(data))

    put('data/vfx-catalog.json', {'efeitos': [
        {'id': 'velho', 'nome': 'Velho', 'arquivo': 'folha.png'}, {'id': 'rasc', 'nome': 'Rasc', 'rascunho': True}, {'id': 'teste', 'nome': 'Teste', 'rascunho': True, 'estado': 'teste'},
        {'id': 'ok', 'nome': 'Ok', 'estado': 'aprovado'}, {'id': 'sumiu', 'nome': 'Sumiu', 'arquivo': 'nao.png'},
        {'id': 'cb', 'nome': 'Cb', 'estado': 'aprovado', 'coreografia': {'hit': 1, 'faixas': {'impact': {'efeito': 'rasc', 'inicio': 0}}}}]})
    put('data/vfx-studio.json', {'composicoes': {'c1': {'camadas': [{'shader': 'water'}]}}})
    builtin = ('slash',)

    # Sem versão, a trava do deploy recusa.
    assert pub.check(root, builtin)

    # Referência quebrada ou efeito não aprovado não publica, e a mensagem diz qual.
    for moment, word in (('nao-existe', 'não existe'), ('rasc', 'rascunho'), ('teste', 'teste'), ('sumiu', 'sumiu'), ('cb', 'rascunho'), ('comp:zzz', 'não existe'), ('shader:zzz', 'não existe')):
        put('data/card-animations.json', {'padrao': {'golpe': moment, 'linhas': []}})
        assert word in refused(pub.publish, 'nota', root, builtin), moment
    assert not (root / pub.PUB_ANIMS).exists(), 'tentativa recusada não pode gravar nada'

    # Publica: copia, registra e marca o aprovado.
    put('data/card-animations.json', {'padrao': {'golpe': 'ok', 'impacto': False, 'linhas': ['slash', None]}, 'athena': {'golpe': 'comp:c1', 'linhas': []}, 'css': {'x': {'ligado': False, 'velocidade': 1}}})
    refused(pub.publish, '', root, builtin)
    done = pub.publish('primeira', root, builtin)
    assert done['versao'] == 1 and not done['mudou']['animacoes'] and not pub.check(root, builtin)
    assert [e for e in json.loads((root / 'data/vfx-catalog.json').read_text())['efeitos'] if e['id'] == 'ok'][0]['estado'] == 'publicado'

    # Edição nova não muda o publicado, e o status mostra a diferença.
    put('data/card-animations.json', {'padrao': {'golpe': 'slash', 'linhas': []}})
    state = pub.status(root, builtin)
    assert 'padrao' in state['mudou']['animacoes'] and json.loads((root / pub.PUB_ANIMS).read_text())['padrao']['golpe'] == 'ok'
    assert pub.publish('segunda', root, builtin)['versao'] == 2

    # Voltar cria versão nova com o conteúdo antigo e não mexe na edição.
    back = pub.restore(1, root, builtin)
    assert back['versao'] == 3 and json.loads((root / pub.PUB_ANIMS).read_text())['padrao']['golpe'] == 'ok'
    assert json.loads((root / 'data/card-animations.json').read_text())['padrao']['golpe'] == 'slash'
    assert [h['versao'] for h in back['historico']] == [3, 2, 1]
    refused(pub.restore, 99, root, builtin)
    refused(pub.restore, True, root, builtin)

    # Editar o publicado à mão é pego.
    put(pub.PUB_ANIMS, {'padrao': {'golpe': 'slash', 'linhas': []}})
    assert any('à mão' in p for p in pub.check(root, builtin))
    refused(pub.handle, {'acao': 'x'}, root, builtin)
print('ok')
