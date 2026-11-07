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
    assert 'fire' not in save_card_anim({'id': 'efeitos', 'efeitos': {}}, write, root)['efeitos']  # restaurar o original
    doc = save_card_anim({'id': 'efeitos', 'efeitos': {'fire': {'ligado': False, 'tamanho': 1.5, 'velocidade': 0.5, 'cor': '#ff0000'}}}, write, root)
    doc = save_card_anim({'id': 'particulas', 'particulas': {'impact': {'ligado': True, 'quantidade': 2, 'tamanho': 1, 'duracao': 0.5, 'cor': '#112233'}}}, write, root)
    assert doc['particulas']['impact']['quantidade'] == 2 and doc['padrao']['golpe'] == 'slash'
    for wrong in ({'impact': {'ligado': True}}, {'impact': {'ligado': True, 'quantidade': 9, 'tamanho': 1, 'duracao': 1, 'cor': None}}, {'a b': {}}):
        try:
            save_card_anim({'id': 'particulas', 'particulas': wrong}, write, root)
        except ValueError:
            continue
        raise AssertionError(wrong)
    doc = save_card_anim({'id': 'css', 'css': {'cz-in': {'ligado': False, 'velocidade': 0.5}}}, write, root)
    assert doc['css']['cz-in'] == {'ligado': False, 'velocidade': 0.5} and doc['padrao']['golpe'] == 'slash'
    for wrong in ({'cz-in': {'ligado': 1, 'velocidade': 1}}, {'cz-in': {'ligado': True, 'velocidade': 9}}, {'cz-in': {'ligado': True}}, {'a b': {'ligado': True, 'velocidade': 1}}, []):
        try:
            save_card_anim({'id': 'css', 'css': wrong}, write, root)
        except ValueError:
            continue
        raise AssertionError(f'aceitou {wrong!r}')
    assert 'css' not in save_card_anim({'id': 'css', 'css': {}}, write, root)
    doc = save_card_anim({'id': 'moeda', 'moeda': {'ligado': True, 'duracao': 1.5, 'giros': 8}}, write, root)
    assert doc['moeda']['giros'] == 8
    doc = save_card_anim({'id': 'ceu', 'ceu': {'ligado': False, 'estrelas': 0.5}}, write, root)
    assert doc['ceu']['estrelas'] == 0.5 and doc['padrao']['golpe'] == 'slash'
    for kind, wrong in (('moeda', {'ligado': True, 'duracao': 1, 'giros': 6.5}), ('moeda', {'ligado': True, 'duracao': 9, 'giros': 6}), ('moeda', {'ligado': True}), ('ceu', {'ligado': True, 'estrelas': 3}), ('ceu', {'ligado': 1, 'estrelas': 1}), ('ceu', [])):
        try:
            save_card_anim({'id': kind, kind: wrong}, write, root)
        except ValueError:
            continue
        raise AssertionError(f'aceitou {kind} {wrong!r}')
    assert 'moeda' not in save_card_anim({'id': 'moeda', 'moeda': None}, write, root)
    assert 'ceu' not in save_card_anim({'id': 'ceu', 'ceu': None}, write, root)
    for bad in ({'id': 'x', 'golpe': 'agua', 'linhas': []}, {'id': 'x', 'outra': 'fire', 'linhas': []}, {'id': 'x', 'golpe': 'fire'}, {'id': '../x', 'linhas': []}, {'id': 'x', 'linhas': ['nope']},
                {'id': 'efeitos', 'efeitos': {'agua': {}}}, {'id': 'efeitos', 'efeitos': {'fire': {'ligado': True, 'tamanho': 9, 'velocidade': 1, 'cor': None}}}, {'id': 'efeitos', 'efeitos': {'fire': {'ligado': True, 'tamanho': 1, 'velocidade': 1, 'cor': 'red'}}}):
        try:
            save_card_anim(bad, write, root)
        except ValueError:
            continue
        raise AssertionError(f'aceitou {bad}')
print('ok')

# Só personagem lendário tem animação própria; o resto usa a da facção (autor, 06/11/2026).
import json as _json
from star_hill import ROOT as _ROOT, plain_devotees as _plain
_plain_ids = _plain(_ROOT)
assert 'athena-v6-009' in _plain_ids and 'athena-v6-013' not in _plain_ids and 'ares-v6-291' in _plain_ids
assert not _plain_ids & set(_json.loads((_ROOT / 'data/card-animations.json').read_text(encoding='utf-8'))), 'Devotee não lendário com animação própria'
print('ok lendários')
