#!/usr/bin/env python3
"""Importa efeitos para o catálogo do gestor de animações (data/vfx-catalog.json).

Aceita PNG, sprite sheet com JSON, GIF, WebP, APNG, ZIP ou pasta de PNGs numerados. Tudo vira um sprite sheet PNG em
playtest/divine/vfx/, que pixel-vfx.js toca sem serviço externo. O hash é do conteúdo dos quadros: o mesmo efeito em outro
formato não entra duas vezes. Só apresentação: não toca em data/cards.json nem em regras.

Uso: python3 card-forge/vfx_import.py <arquivo ou pasta> --nome "Fogo" --fonte pixeldust --licenca CC0-1.0 --tipo fogo
"""
import argparse
import base64
import binascii
import hashlib
import io
import json
import math
import re
import zipfile
from datetime import date
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
CATALOG = 'data/vfx-catalog.json'
SHEETS = 'playtest/divine/vfx'
ACCESS = ('gratis', 'limitado')  # só animações gratuitas (autor, 04/11/2026): efeito pago não entra no catálogo
TYPES = ('golpe', 'impacto', 'explosao', 'fogo', 'gelo', 'raio', 'veneno', 'luz', 'trevas', 'cura', 'aura', 'escudo', 'energia', 'magia', 'projetil', 'clima', 'outro')
FACTIONS = ('athena', 'poseidon', 'hades', 'ares', 'artemis', 'neutral')
TRIGGERS = ('golpe', 'impacto', 'impacto_deus', 'strike', 'carga', 'declarar', 'cast', 'entrada', 'retorno', 'morte', 'dano', 'soul', 'escudo', 'cura', 'habilidade', 'ultimate', 'poder_divino', 'poder_dominio', 'awaken')  # star_hill.ANIM_MOMENTS
MAX_FILE = 28 * 1024 * 1024
MAX_FRAMES = 120
MAX_CELL = 256  # o jogo desenha em pixels grandes: mais do que isso só pesa no download
MAX_PIXELS = 64_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS  # imagem maior que isso é recusada antes de abrir na memória


def _open(data):
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except Exception as error:
        raise ValueError('Imagem inválida ou grande demais.') from error
    return image


def _ms(image, fallback=100):
    return image.info.get('duration') or fallback


def _animated(image):
    """GIF, WebP e APNG: o Pillow lê os três quadro a quadro."""
    frames, times = [], []
    for frame in ImageSequence.Iterator(image):
        if len(frames) >= MAX_FRAMES:
            raise ValueError(f'Mais de {MAX_FRAMES} quadros.')
        frames.append(frame.convert('RGBA'))
        times.append(_ms(frame))
    return frames, times


def _cut(sheet, boxes):
    if not boxes or len(boxes) > MAX_FRAMES:
        raise ValueError(f'O sprite sheet precisa ter de 1 a {MAX_FRAMES} quadros.')
    for x, y, w, h in boxes:
        if w <= 0 or h <= 0 or x < 0 or y < 0 or x + w > sheet.width or y + h > sheet.height:
            raise ValueError('O JSON aponta para fora do sprite sheet.')
    return [sheet.crop((x, y, x + w, y + h)) for x, y, w, h in boxes]


def _number(meta, *names):
    for name in names:
        value = meta.get(name)
        if isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0:
            return value
    return None


def from_metadata(sheet, meta):
    """Quadros descritos em JSON: PixelDust (frameWidth, columns) e TexturePacker/Aseprite (frames com frame:{x,y,w,h})."""
    fps = _number(meta, 'fps')
    raw = meta.get('frames')
    if isinstance(raw, dict):
        raw = list(raw.values())
    width = _number(meta, 'frameWidth', 'frame_width', 'cellWidth', 'cell_width', 'width', 'w')
    height = _number(meta, 'frameHeight', 'frame_height', 'cellHeight', 'cell_height', 'height', 'h')
    if isinstance(raw, list) and raw and isinstance(raw[0], dict) and ('frame' in raw[0] or 'x' in raw[0]):
        frames, times = [], []
        for item in raw[:MAX_FRAMES + 1]:
            box = item.get('frame', item)
            try:
                frame = _cut(sheet, [(int(box['x']), int(box['y']), int(box['w']), int(box['h']))])[0]
            except (KeyError, TypeError) as error:
                raise ValueError('JSON de quadros inválido.') from error
            source, place = item.get('sourceSize'), item.get('spriteSourceSize')
            if item.get('trimmed') and source and place:  # atlas aparado: volta ao tamanho original para não pular
                canvas = Image.new('RGBA', (int(source['w']), int(source['h'])))
                canvas.paste(frame, (int(place['x']), int(place['y'])))
                frame = canvas
            frames.append(frame)
            times.append(_number(item, 'duration', 'durationMs', 'duration_ms') or (1000 / fps if fps else 100))
        if len(frames) > MAX_FRAMES:
            raise ValueError(f'Mais de {MAX_FRAMES} quadros.')
        return frames, times
    if width and height:
        width, height = int(width), int(height)
        cols = int(_number(meta, 'columns', 'cols') or sheet.width // width)
        count = int(_number(meta, 'frameCount', 'frame_count', 'count') or cols * (sheet.height // height))
        if cols <= 0:
            raise ValueError('O quadro do JSON é maior que o sprite sheet.')
        boxes = [((i % cols) * width, (i // cols) * height, width, height) for i in range(count)]
        duration = _number(meta, 'frameDurationMs', 'frame_duration_ms') or (1000 / fps if fps else 100)
        return _cut(sheet, boxes), [duration] * count
    raise ValueError('JSON de sprite sheet não reconhecido. Informe colunas e linhas.')


def from_grid(sheet, cols, rows, count=None):
    if cols <= 0 or rows <= 0 or sheet.width % cols or sheet.height % rows:
        raise ValueError('Colunas e linhas não dividem a imagem em quadros inteiros.')
    width, height = sheet.width // cols, sheet.height // rows
    boxes = [(c * width, r * height, width, height) for r in range(rows) for c in range(cols)]
    return _cut(sheet, boxes[:count] if count else boxes)


def _ordered(names):
    return sorted(names, key=lambda n: [int(p) if p.isdigit() else p.lower() for p in re.split(r'(\d+)', n)])


def from_sequence(files):
    """Sequência de PNGs numerados, de um ZIP ou de uma pasta. `files`: {nome: bytes}."""
    names = _ordered(n for n in files if n.lower().endswith('.png') and not Path(n).name.startswith('.'))
    if not names or len(names) > MAX_FRAMES:
        raise ValueError(f'A sequência precisa ter de 1 a {MAX_FRAMES} PNGs.')
    frames = [_open(files[n]).convert('RGBA') for n in names]
    if len({f.size for f in frames}) > 1:
        raise ValueError('Os PNGs da sequência têm tamanhos diferentes.')
    return frames, [100] * len(frames)


def _read_zip(data):
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as error:
        raise ValueError('ZIP inválido.') from error
    infos = [i for i in archive.infolist() if not i.is_dir() and '__MACOSX' not in i.filename]
    if sum(i.file_size for i in infos) > MAX_PIXELS:
        raise ValueError('ZIP grande demais.')
    return {i.filename: archive.read(i) for i in infos}


def decode(name, data, meta=None, cols=None, rows=None, count=None):
    """Bytes de um arquivo → (quadros RGBA, duração de cada um em ms)."""
    if len(data) > MAX_FILE:
        raise ValueError('Arquivo grande demais.')
    suffix = Path(name).suffix.lower()
    if suffix == '.zip':
        files = _read_zip(data)
        jsons = [n for n in files if n.lower().endswith('.json')]
        pngs = [n for n in files if n.lower().endswith('.png')]
        if len(pngs) == 1 and len(jsons) == 1:  # sprite sheet + metadados no mesmo ZIP
            return from_metadata(_open(files[pngs[0]]).convert('RGBA'), json.loads(files[jsons[0]]))
        return from_sequence(files)
    if suffix not in ('.png', '.apng', '.gif', '.webp'):
        raise ValueError('Formato não aceito: use PNG, APNG, GIF, WebP ou ZIP.')
    image = _open(data)
    if meta is not None:
        return from_metadata(image.convert('RGBA'), meta)
    if cols and rows:
        frames = from_grid(image.convert('RGBA'), cols, rows, count)
        return frames, [100] * len(frames)
    return _animated(image)


def trimmed(frames):
    """Corta o vazio em volta do efeito, igual em todos os quadros: sem saltos, e o efeito preenche a carta."""
    boxes = [box for box in (f.getchannel('A').getbbox() for f in frames) if box]
    if not boxes:
        raise ValueError('O efeito está vazio.')
    area = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    return [f.crop(area) for f in frames]


def sheet_of(frames):
    """Quadros → sprite sheet em grade. Reduz só o que passar de MAX_CELL."""
    width, height = frames[0].size
    if any(f.size != (width, height) for f in frames):
        raise ValueError('Os quadros têm tamanhos diferentes.')
    scale = min(1, MAX_CELL / max(width, height))
    if scale < 1:
        width, height = max(1, round(width * scale)), max(1, round(height * scale))
        frames = [f.resize((width, height), Image.Resampling.LANCZOS) for f in frames]
    cols = math.ceil(math.sqrt(len(frames)))
    rows = math.ceil(len(frames) / cols)
    sheet = Image.new('RGBA', (cols * width, rows * height))
    for i, frame in enumerate(frames):
        sheet.paste(frame, ((i % cols) * width, (i // cols) * height))
    return sheet, width, height, cols


def _pixel_hash(sheet):
    clean = Image.new('RGBA', sheet.size)
    clean.paste(sheet, (0, 0), sheet)  # pixel transparente pode guardar qualquer cor: não diferencia dois efeitos
    return hashlib.sha256(clean.tobytes() + repr(sheet.size).encode()).hexdigest()


def load_catalog(root=ROOT):
    path = root / CATALOG
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'fontes': {}, 'efeitos': []}


def write_catalog(catalog, root=ROOT):
    path = root / CATALOG
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    temp.replace(path)


def _labels(values, allowed, what):
    values = values or []
    if not isinstance(values, list) or set(values) - set(allowed):
        raise ValueError(f'{what} inválido.')
    return sorted(set(values))


def add_effect(frames, times, info, root=ROOT):
    """Grava o efeito e os dados de origem. Devolve (efeito, duplicado). Sem fonte e licença não entra."""
    nome, fonte, licenca = (str(info.get(k) or '').strip() for k in ('nome', 'fonte', 'licenca'))
    if not nome or len(nome) > 60:
        raise ValueError('Dê um nome ao efeito.')
    if not re.fullmatch(r'[a-z0-9-]{1,40}', fonte):
        raise ValueError('Informe de que fonte veio o efeito.')
    if not licenca or len(licenca) > 200:
        raise ValueError('Informe a licença do efeito.')
    acesso = info.get('acesso') or 'gratis'
    if acesso not in ACCESS:
        raise ValueError('O catálogo só aceita efeitos gratuitos.')
    tipo = info.get('tipo') or 'outro'
    if tipo not in TYPES:
        raise ValueError('Tipo inválido.')
    faccoes, gatilhos = _labels(info.get('faccoes'), FACTIONS, 'Facção'), _labels(info.get('gatilhos'), TRIGGERS, 'Gatilho')
    sheet, width, height, cols = sheet_of(trimmed(frames) if info.get('aparar') else frames)
    digest = _pixel_hash(sheet)
    catalog = load_catalog(root)
    same = next((e for e in catalog['efeitos'] if e['hash'] == digest), None)
    if same:
        return same, True
    target = root / SHEETS / f'vx-{digest[:12]}.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target, optimize=True)
    fps = max(1, min(60, round(1000 * len(times) / max(1, sum(times)))))
    effect = {'id': f'vx-{digest[:12]}', 'nome': nome, 'fonte': fonte, 'licenca': licenca, 'acesso': acesso, 'origem': str(info.get('origem') or ''), 'autor': str(info.get('autor') or ''),
              'formato': str(info.get('formato') or ''), 'hash': digest, 'arquivo': f'{SHEETS}/{target.name}', 'w': width, 'h': height, 'cols': cols, 'quadros': len(frames), 'fps': fps,
              'loop': bool(info.get('loop')), 'tipo': tipo, 'faccoes': faccoes, 'gatilhos': gatilhos, 'importado': date.today().isoformat()}
    catalog['efeitos'].append(effect)
    write_catalog(catalog, root)
    return effect, False


def import_body(body, root=ROOT):
    """POST /api/star-hill/vfx-import: {arquivo: {nome, base64}, nome, fonte, licenca, ...}."""
    upload = body.get('arquivo')
    if not isinstance(upload, dict) or not isinstance(upload.get('nome'), str) or not isinstance(upload.get('base64'), str):
        raise ValueError('Escolha um arquivo.')
    try:
        data = base64.b64decode(upload['base64'], validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError('Arquivo inválido.') from error
    meta = body.get('json')
    if meta is not None:
        try:
            meta = json.loads(meta)
        except (TypeError, ValueError) as error:
            raise ValueError('JSON de metadados inválido.') from error
        if not isinstance(meta, dict):
            raise ValueError('JSON de metadados inválido.')
    grid = [body.get('colunas'), body.get('linhas')]
    if any(g is not None and (not isinstance(g, int) or isinstance(g, bool) or g <= 0) for g in grid):
        raise ValueError('Colunas e linhas inválidas.')
    frames, times = decode(upload['nome'], data, meta, *grid)
    if isinstance(body.get('fps'), (int, float)) and not isinstance(body.get('fps'), bool) and 0 < body['fps'] <= 60:
        times = [1000 / body['fps']] * len(frames)
    effect, duplicate = add_effect(frames, times, {**body, 'formato': Path(upload['nome']).suffix.lstrip('.').lower()}, root)
    return {'efeito': effect, 'duplicado': duplicate, 'catalogo': load_catalog(root)}


def edit_body(body, root=ROOT):
    """POST /api/star-hill/vfx-meta: renomeia e categoriza. Origem, licença e hash não mudam por aqui."""
    catalog = load_catalog(root)
    effect = next((e for e in catalog['efeitos'] if e['id'] == body.get('id')), None)
    if not effect:
        raise ValueError('Efeito não encontrado.')
    if 'nome' in body:
        nome = str(body['nome']).strip()
        if not nome or len(nome) > 60:
            raise ValueError('Nome inválido.')
        effect['nome'] = nome
    if 'tipo' in body:
        if body['tipo'] not in TYPES:
            raise ValueError('Tipo inválido.')
        effect['tipo'] = body['tipo']
    if 'faccoes' in body:
        effect['faccoes'] = _labels(body['faccoes'], FACTIONS, 'Facção')
    if 'gatilhos' in body:
        effect['gatilhos'] = _labels(body['gatilhos'], TRIGGERS, 'Gatilho')
    write_catalog(catalog, root)
    return {'efeito': effect, 'catalogo': catalog}


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('caminho', type=Path)
    for name in ('nome', 'fonte', 'licenca'):
        parser.add_argument(f'--{name}', required=True)
    for name in ('origem', 'autor', 'json'):
        parser.add_argument(f'--{name}', default='')
    parser.add_argument('--acesso', default='gratis', choices=ACCESS)
    parser.add_argument('--tipo', default='outro', choices=TYPES)
    parser.add_argument('--colunas', type=int)
    parser.add_argument('--linhas', type=int)
    parser.add_argument('--fps', type=float)
    parser.add_argument('--loop', action='store_true')
    parser.add_argument('--aparar', action='store_true')
    parser.add_argument('--gatilhos', type=lambda v: v.split(','), default=[])
    args = parser.parse_args()
    if args.caminho.is_dir():
        frames, times = from_sequence({p.name: p.read_bytes() for p in args.caminho.iterdir() if p.is_file()})
    else:
        meta = json.loads(Path(args.json).read_text(encoding='utf-8')) if args.json else None
        frames, times = decode(args.caminho.name, args.caminho.read_bytes(), meta, args.colunas, args.linhas)
    if args.fps:
        times = [1000 / args.fps] * len(frames)
    info = vars(args)
    effect, duplicate = add_effect(frames, times, {**info, 'formato': 'png' if args.caminho.is_dir() else args.caminho.suffix.lstrip('.').lower()})
    print(json.dumps({'id': effect['id'], 'quadros': effect['quadros'], 'duplicado': duplicate}))


if __name__ == '__main__':
    main()
