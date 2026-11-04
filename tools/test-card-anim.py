#!/usr/bin/env python3
"""Gravação de data/card-animations.json: aceita efeito, false e herança; recusa o resto; não apaga outras entradas."""
import json, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'card-forge'))
from star_hill import save_card_anim


def write(path, data):
    path.write_bytes(data)


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / 'data').mkdir()
    (root / 'data/card-animations.json').write_text(json.dumps({'padrao': {'golpe': 'slash', 'linhas': []}}))
    doc = save_card_anim({'id': 'athena-v6-005', 'golpe': 'ice', 'morte': False, 'cast': None, 'linhas': ['fire', None, None]}, write, root)
    assert doc['athena-v6-005'] == {'golpe': 'ice', 'morte': False, 'linhas': ['fire']}, doc
    assert doc['padrao']['golpe'] == 'slash'
    doc = save_card_anim({'id': 'athena-v6-005', 'linhas': []}, write, root)
    assert 'athena-v6-005' not in doc, 'entrada vazia sai do arquivo'
    doc = save_card_anim({'id': 'efeitos', 'efeitos': {'fire': {'ligado': False, 'tamanho': 1.5, 'velocidade': 0.5, 'cor': '#ff0000'}}}, write, root)
    assert doc['efeitos']['fire']['ligado'] is False
    for bad in ({'id': 'x', 'golpe': 'agua', 'linhas': []}, {'id': 'x', 'outra': 'fire', 'linhas': []}, {'id': 'x', 'golpe': 'fire'}, {'id': '../x', 'linhas': []}, {'id': 'x', 'linhas': ['nope']},
                {'id': 'efeitos', 'efeitos': {'agua': {}}}, {'id': 'efeitos', 'efeitos': {'fire': {'ligado': True, 'tamanho': 9, 'velocidade': 1, 'cor': None}}}, {'id': 'efeitos', 'efeitos': {'fire': {'ligado': True, 'tamanho': 1, 'velocidade': 1, 'cor': 'red'}}}):
        try:
            save_card_anim(bad, write, root)
        except ValueError:
            continue
        raise AssertionError(f'aceitou {bad}')
print('ok')
