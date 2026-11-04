#!/usr/bin/env python3
"""Geração interna de animação (card-forge/vfx_generate.py), com um falso comando claude no lugar do real."""
import json
import stat
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'card-forge'))
import vfx_generate as gen


def wait(limit=8):
    end = time.time() + limit
    while gen.status()['estado'] == 'rodando' and time.time() < end:
        time.sleep(.05)
    return gen.status()


FAKE = """#!/usr/bin/env python3
import json, sys, time
sys.stdin.read()
print(json.dumps({'type': 'assistant', 'message': {'content': [{'type': 'tool_use', 'name': 'Bash', 'input': {'command': 'node tools/vfx-criar.mjs x'}}]}}), flush=True)
time.sleep(float(sys.argv[1]))
c = json.load(open('data/vfx-catalog.json'))
c['efeitos'].append({'id': 'vx-novo', 'hash': 'b', 'rascunho': True})
json.dump(c, open('data/vfx-catalog.json', 'w'))
print(json.dumps({'type': 'result', 'is_error': False, 'result': 'Entreguei.'}), flush=True)
"""
with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    (root / 'data').mkdir()
    catalog = root / 'data/vfx-catalog.json'
    catalog.write_text(json.dumps({'efeitos': [{'id': 'vx-velho', 'hash': 'a', 'rascunho': True}, {'id': 'vx-banco', 'hash': 'c'}]}))
    script = root / 'falso.py'
    script.write_text(FAKE)
    script.chmod(script.stat().st_mode | stat.S_IEXEC)

    for bad in ({}, {'pedido': ''}, {'pedido': 'x' * 9000}, []):
        try:
            gen.start(bad, root, [str(script), '0'])
        except ValueError:
            continue
        raise AssertionError(bad)

    # Só o rascunho novo aparece, e não dá para gerar dois ao mesmo tempo.
    gen.start({'pedido': 'um efeito'}, root, [str(script), '.4'])
    try:
        gen.start({'pedido': 'outro'}, root, [str(script), '0'])
    except ValueError:
        pass
    else:
        raise AssertionError('dois trabalhos ao mesmo tempo')
    done = wait()
    assert done['estado'] == 'pronto' and done['efeitos'] == ['vx-novo'] and done['mensagem'] == 'Entreguei.', done

    # Cancelar mata o processo e não inventa resultado.
    catalog.write_text(json.dumps({'efeitos': []}))
    gen.start({'pedido': 'um efeito'}, root, [str(script), '30'])
    time.sleep(.3)
    gen.cancel()
    done = wait()
    assert done['estado'] == 'cancelado' and not done['efeitos'], done

    # Saiu sem entregar nada: é erro, não sucesso.
    empty = root / 'vazio.py'
    empty.write_text('#!/usr/bin/env python3\nimport sys\nsys.stdin.read()\n')
    empty.chmod(empty.stat().st_mode | stat.S_IEXEC)
    gen.start({'pedido': 'um efeito'}, root, [str(empty)])
    assert wait()['estado'] == 'erro'

    # Referência: só https público, e só imagem de verdade.
    for url in ('http://example.com/a.jpg', 'https://127.0.0.1/a.jpg', 'https://localhost/a.jpg', 'https://169.254.169.254/a.jpg'):
        assert not gen._public_https(url), url
    saved, failed = gen.fetch_references('veja https://127.0.0.1/a.jpg', folder)
    assert not saved and failed

# O Claude real só escreve na pasta de efeitos e só entrega pelo vfx-criar.
command = gen._command('/tmp/x')
allowed = command[command.index('--allowedTools') + 1:command.index('--add-dir')]
assert not any(tool in ('Write', 'Edit', 'Bash') for tool in allowed), allowed
assert [t for t in allowed if t.startswith(('Write', 'Edit'))] == ['Edit(/tools/vfx-criador/fx/**)']
assert command[command.index('--permission-mode') + 1] == 'dontAsk'
print('ok')
