#!/usr/bin/env python3
"""Importa o PVFX Foundry (CC0, https://nerijs.itch.io/pvfx-foundry) para data/vfx-catalog.json.

Usa a versão "lit" em grade e confere o SHA-256 de cada sheet com o pack.json antes de importar.
Uso: python3 tools/vfx-import-pvfx.py <pasta do ZIP extraído>
"""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'card-forge'))
from PIL import Image
from vfx_import import add_effect, from_metadata, load_catalog, write_catalog

COLUMNS = 8  # IMPORTING.md do pacote
SOURCE = {'nome': 'PVFX Foundry', 'acesso': 'gratis', 'licenca': 'CC0-1.0', 'url': 'https://nerijs.itch.io/pvfx-foundry', 'estado': 'Ligada: sprite sheets locais da versão 1.0.0.'}
TYPES = {'arcane': 'magia', 'explosions': 'explosao', 'fire': 'fogo', 'holy': 'luz', 'ice': 'gelo', 'impacts': 'impacto', 'lightning': 'raio', 'melee': 'golpe', 'nature': 'clima', 'projectiles': 'projetil', 'shadow': 'trevas', 'smoke': 'clima', 'status': 'aura', 'ui': 'outro', 'water': 'clima', 'wind': 'clima'}
BY_NAME = (('poison', 'veneno'), ('venom', 'veneno'), ('heal', 'cura'), ('shield', 'escudo'), ('barrier', 'escudo'), ('slash', 'golpe'))


def type_of(effect):
    return next((kind for word, kind in BY_NAME if word in effect['id']), TYPES.get(effect['category'], 'outro'))


def main(folder):
    pack = json.loads((folder / 'pack.json').read_text(encoding='utf-8'))
    result = {'novos': 0, 'repetidos': 0}
    for effect in pack['effects']:
        artifact = effect['artifacts']['lit']['grid']
        path = folder / artifact['sheet']
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if f'sha256:{digest}' != artifact['sheet_sha256']:
            raise ValueError(f'Checksum diferente em {effect["id"]}.')
        width, height = effect['size']
        with Image.open(path) as image:
            frames, times = from_metadata(image.convert('RGBA'), {'frameWidth': width, 'frameHeight': height, 'columns': COLUMNS, 'frameCount': effect['frames'], 'frameDurationMs': effect['frame_ms']})
        info = {'nome': effect['name'], 'fonte': 'pvfx-foundry', 'licenca': 'CC0-1.0', 'acesso': 'gratis', 'autor': 'Pixel VFX Studio', 'origem': f'{SOURCE["url"]}#{pack["version"]}/{effect["id"]}', 'formato': 'png', 'tipo': type_of(effect), 'loop': effect['loop'], 'aparar': True}
        _, duplicate = add_effect(frames, times, info)
        result['repetidos' if duplicate else 'novos'] += 1
    catalog = load_catalog()
    catalog['fontes']['pvfx-foundry'] = SOURCE
    write_catalog(catalog)
    print(json.dumps({'pacote': pack['version'], 'efeitos': len(pack['effects']), **result}))


if __name__ == '__main__':
    main(Path(sys.argv[1]))
