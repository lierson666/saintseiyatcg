# Arena Forge (STAR HILL, autor 07/11/2026): ajustes visuais das arenas 3D da partida.
# Grava data/arenas.json; playtest/divine/scene.js mescla esses valores sobre THEMES ao abrir a partida.
# Só aceita os campos e faixas abaixo (mesma lista de star-hill/arena-forge.js).
import json
import re

ARENAS = 'data/arenas.json'
THEMES = {'olympus', 'athena', 'poseidon', 'hades', 'elysion', 'ares', 'artemis'}
COLORS = {'skyTop', 'skyBottom', 'floorA', 'floorB', 'line', 'column', 'cap', 'light', 'dust', 'fog', 'glow'}
NUMBERS = {'mask': (0, 4), 'pulse': (0, 4), 'metal': (0, 1), 'dustSize': (.3, 4)}
FLAGS = {'caustics', 'zodiac', 'broken', 'trees', 'fall', 'blink'}
ORB = {'size': (2, 30), 'x': (-30, 30)}
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')


def _number(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not low <= value <= high:
        raise ValueError(f'{name}: número entre {low} e {high}.')
    return value


def _color(value, name):
    if not isinstance(value, str) or not HEX.match(value):
        raise ValueError(f'{name}: cor no formato #rrggbb.')
    return value.lower()


def validate(value):
    if not isinstance(value, dict) or value.get('versao') != 1 or not isinstance(value.get('temas'), dict):
        raise ValueError('Formato esperado: {"versao": 1, "temas": {...}}.')
    out = {}
    for key, theme in value['temas'].items():
        if key not in THEMES or not isinstance(theme, dict):
            raise ValueError(f'Arena desconhecida: {key}.')
        clean = {}
        for field, v in theme.items():
            name = f'{key}.{field}'
            if field in COLORS:
                clean[field] = _color(v, name)
            elif field in NUMBERS:
                clean[field] = _number(v, *NUMBERS[field], name)
            elif field in FLAGS:
                clean[field] = 1 if _number(v, 0, 1, name) else 0
            elif field == 'orb':
                if v is None:
                    clean[field] = None
                    continue
                if not isinstance(v, dict) or set(v) != {'color', 'size', 'x'}:
                    raise ValueError(f'{name}: astro precisa de color, size e x.')
                clean[field] = {'color': _color(v['color'], name + '.color'),
                                **{k: _number(v[k], *ORB[k], f'{name}.{k}') for k in ORB}}
            else:
                raise ValueError(f'Campo desconhecido: {name}.')
        if clean:
            out[key] = clean
    return {'versao': 1, 'temas': out}


def read(root):
    try:
        return json.loads((root / ARENAS).read_text(encoding='utf-8'))
    except FileNotFoundError:
        return {'versao': 1, 'temas': {}}


def save(root, body, atomic_write):
    value = validate(body.get('conteudo'))
    atomic_write(root / ARENAS, (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    (root / ARENAS).chmod(0o644)  # o jogo lê este arquivo pelo servidor web; mkstemp cria 0600
    return {'ok': True, 'conteudo': value}


if __name__ == '__main__':  # autoteste: python3 card-forge/arena_forge.py
    ok = validate({'versao': 1, 'temas': {'hades': {'glow': '#FF0000', 'mask': 1, 'broken': 1, 'orb': {'color': '#ffffff', 'size': 9, 'x': 3}}}})
    assert ok['temas']['hades']['glow'] == '#ff0000' and ok['temas']['hades']['orb']['size'] == 9
    for bad in [{'versao': 1, 'temas': {'x': {}}}, {'versao': 1, 'temas': {'ares': {'glow': 'red'}}},
                {'versao': 1, 'temas': {'ares': {'pulse': 9}}}, {'versao': 1, 'temas': {'ares': {'evil': 1}}}]:
        try:
            validate(bad)
        except ValueError:
            continue
        raise AssertionError(bad)
    print('arena_forge ok')
