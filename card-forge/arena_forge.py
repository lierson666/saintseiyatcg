# ARENA FORGE 5.0 (STAR HILL, autor 07/11/2026): biblioteca de arenas e manifesto publicado.
# data/arena-library.json: trabalho (arenas, variantes, status, validação, histórico de versões publicadas).
# data/arenas-published.json: fonte única do que o jogo usa; o servidor o deriva do histórico, nunca do cliente.
# Regras de schema/pipeline: shared/arena-model.js. Aqui: validação na fronteira e versões publicadas imutáveis.
# ARENA_DATA_DIR troca a raiz nos testes. Nada aqui publica no servidor oficial: isso é deploy, com aprovação do autor.
import base64
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

LIBRARY = 'data/arena-library.json'
MANIFEST = 'data/arenas-published.json'
THUMBS = 'playtest/assets/arenas'
SCHEMA = 2
BASES = {'olympus', 'athena', 'poseidon', 'hades', 'elysion', 'ares', 'artemis'}
STATUS = {'draft', 'development', 'validation', 'approved', 'published', 'archived'}
VARIANTS = {'standard', 'day', 'night', 'sunset', 'storm', 'ruined', 'divine', 'legendary', 'seasonal'}
FACTIONS = {'Neutral', 'Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis'}
COLORS = {'skyTop', 'skyBottom', 'floorA', 'floorB', 'line', 'column', 'cap', 'light', 'dust', 'fog', 'glow'}
NUMBERS = {'mask': (0, 4), 'pulse': (0, 4), 'metal': (0, 1), 'dustSize': (.3, 4)}
FLAGS = {'caustics', 'zodiac', 'broken', 'trees', 'fall', 'blink'}
ORB = {'size': (2, 30), 'x': (-30, 30)}
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')
SLUG = re.compile(r'^[a-z][a-z0-9-]{1,39}$')
MAX_THUMB = 400_000


def root_of(default):
    return Path(os.environ['ARENA_DATA_DIR']) if os.environ.get('ARENA_DATA_DIR') else default


def _number(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not low <= value <= high:
        raise ValueError(f'{name}: número entre {low} e {high}.')


def params(p, where):
    if not isinstance(p, dict):
        raise ValueError(f'{where}: objeto esperado.')
    for field, v in p.items():
        name = f'{where}.{field}'
        if field in COLORS:
            if not isinstance(v, str) or not HEX.match(v):
                raise ValueError(f'{name}: cor no formato #rrggbb.')
        elif field in NUMBERS:
            _number(v, *NUMBERS[field], name)
        elif field in FLAGS:
            if v not in (0, 1) or isinstance(v, bool):
                raise ValueError(f'{name}: 0 ou 1.')
        elif field == 'orb':
            if v is None:
                continue
            if not isinstance(v, dict) or set(v) != {'color', 'size', 'x'} or not isinstance(v['color'], str) or not HEX.match(v['color']):
                raise ValueError(f'{name}: astro precisa de color #rrggbb, size e x.')
            for k, (lo, hi) in ORB.items():
                _number(v[k], lo, hi, f'{name}.{k}')
        elif field in {'label', 'caustics'}:
            continue
        else:
            raise ValueError(f'Campo desconhecido: {name}.')


def arena(a):
    if not isinstance(a, dict) or not SLUG.match(str(a.get('id', ''))):
        raise ValueError('Arena com id inválido (minúsculas, números e hífen).')
    i = a['id']
    if not str(a.get('nome', '')).strip() or a.get('faccao') not in FACTIONS or a.get('base') not in BASES:
        raise ValueError(f'{i}: nome, facção ou base inválidos.')
    if not isinstance(a.get('versao'), int) or a['versao'] < 1 or a.get('status') not in STATUS:
        raise ValueError(f'{i}: versão ou status inválidos.')
    params(a.get('params', {}), f'{i}.params')
    ids = [v.get('id') for v in a.get('variantes', [])]
    if 'standard' not in ids or len(ids) != len(set(ids)):
        raise ValueError(f'{i}: variantes precisam de standard e ids únicos.')
    for v in a['variantes']:
        if not SLUG.match(str(v.get('id', ''))) or v.get('tipo') not in VARIANTS or not str(v.get('nome', '')).strip():
            raise ValueError(f'{i}: variante {v.get("id")} inválida.')
        params(v.get('params', {}), f'{i}~{v["id"]}')
    for h in a.get('historico', []):
        snap = h.get('snapshot') or {}
        if snap.get('id') != i or snap.get('versao') != h.get('versao'):
            raise ValueError(f'{i}: histórico inconsistente na versão {h.get("versao")}.')
        for v in snap.get('variantes', []):
            params(v.get('params', {}), f'{i}@{h["versao"]}~{v.get("id")}')
    if a.get('publicado') is not None and not any(h['versao'] == a['publicado'] for h in a.get('historico', [])):
        raise ValueError(f'{i}: versão publicada {a["publicado"]} não está no histórico.')


def manifest_of(lib):
    out = []
    for a in lib['arenas']:
        if a.get('publicado') and a['status'] != 'archived':
            out.append(next(h for h in a['historico'] if h['versao'] == a['publicado'])['snapshot'])
    return {'schema': SCHEMA, 'gerado_em': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'arenas': out}


def read(root):
    root = root_of(root)
    try:
        lib = json.loads((root / LIBRARY).read_text(encoding='utf-8'))
    except FileNotFoundError:
        raise ValueError('Biblioteca ausente: rode node tools/arena-seed.mjs.')
    man = json.loads((root / MANIFEST).read_text(encoding='utf-8')) if (root / MANIFEST).exists() else manifest_of(lib)
    return {'biblioteca': lib, 'manifesto': man}


def save(root, body, atomic_write):
    root = root_of(root)
    lib = body.get('biblioteca')
    if not isinstance(lib, dict) or lib.get('schema') != SCHEMA or not isinstance(lib.get('arenas'), list):
        raise ValueError(f'Biblioteca precisa do schema {SCHEMA}.')
    ids = [a.get('id') for a in lib['arenas']]
    if len(ids) != len(set(ids)):
        raise ValueError('Ids de arena repetidos.')
    for a in lib['arenas']:
        arena(a)
    # Versão publicada é imutável: a arena publicada continua igual mesmo se o código ou a biblioteca mudarem depois.
    try:
        old = {a['id']: a for a in json.loads((root / LIBRARY).read_text(encoding='utf-8'))['arenas']}
    except FileNotFoundError:
        old = {}
    for a in lib['arenas']:
        before = {h['versao']: h for h in old.get(a['id'], {}).get('historico', [])}
        now = {h['versao']: h for h in a.get('historico', [])}
        for v, h in before.items():
            if now.get(v) != h:
                raise ValueError(f'{a["id"]}: a versão publicada {v} não pode mudar nem sumir.')
        for v in set(now) - set(before):
            if not (now[v].get('validacao') or {}).get('ok'):
                raise ValueError(f'{a["id"]}: versão {v} publicada sem validação aprovada.')
    man = manifest_of(lib)
    for path, value in ((LIBRARY, lib), (MANIFEST, man)):
        atomic_write(root / path, (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
        (root / path).chmod(0o644)  # o jogo lê pelo servidor web; mkstemp cria 0600
    return {'ok': True, 'biblioteca': lib, 'manifesto': man}


def thumb(root, body, atomic_write):
    root = root_of(root)
    name = f'{body.get("id")}@{body.get("versao")}~{body.get("variante")}'
    if not re.match(r'^[a-z][a-z0-9-]{1,39}@\d{1,4}~[a-z][a-z0-9-]{1,39}$', name):
        raise ValueError('Miniatura com nome inválido.')
    m = re.match(r'^data:image/(webp|png);base64,(.+)$', str(body.get('imagem', '')))
    if not m:
        raise ValueError('Miniatura precisa ser webp ou png em base64.')
    data = base64.b64decode(m.group(2), validate=True)
    if len(data) > MAX_THUMB:
        raise ValueError('Miniatura grande demais (máx. 400 KB).')
    path = root / THUMBS / f'{name}.{m.group(1)}'
    atomic_write(path, data)
    path.chmod(0o644)
    return {'ok': True, 'arquivo': f'/{THUMBS}/{path.name}'}
