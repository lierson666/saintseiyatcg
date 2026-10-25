"""Persistência local de apresentação. Não grava cartas, regras nem configurações pessoais."""
import copy
import datetime
import json
import math
import re
import threading
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
LOCK = threading.RLock()
LEVELS = ['global', 'type', 'faction', 'rarity', 'card']
ID = re.compile(r'^[a-z0-9][a-z0-9-]{0,79}$')
COLORS = re.compile(r'^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$')


class Conflict(ValueError):
    pass


def asset(path, root):
    if not isinstance(path, str) or len(path) > 240 or re.search(r'[\\<>"\x00-\x1f]', path) or "'" in path or '..' in path or '%' in path:
        raise ValueError('Caminho de asset inválido.')
    allowed = ['CARD-TEMPLATE/', 'card-forge/art/', 'playtest/assets/', 'star-hill/assets/']
    if not any(path.startswith(p) for p in allowed) or Path(path).suffix.lower() not in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
        raise ValueError('Use uma imagem local da biblioteca.')
    resolved = (root / path).resolve()
    if not any(resolved.is_relative_to((root / p).resolve()) for p in allowed) or not resolved.is_file():
        raise ValueError('Imagem local não encontrada.')


def number(value, low, high):
    return type(value) in (int, float) and math.isfinite(value) and low <= value <= high


def condition(value, schema, depth=0):
    if not isinstance(value, dict) or depth > 4:
        raise ValueError('Condição inválida.')
    if 'all' in value or 'any' in value:
        k = 'all' if 'all' in value else 'any'
        if set(value) != {k} or not isinstance(value[k], list) or len(value[k]) > 20:
            raise ValueError('Grupo de condições inválido.')
        for child in value[k]:
            condition(child, schema, depth + 1)
    elif set(value) - {'binding', 'op', 'value'} or value.get('binding') not in schema['bindings'] or value.get('op') not in ['exists', 'eq', 'neq', 'gt', 'includes', 'truthy', 'falsy'] or 'value' in value and type(value['value']) not in (str, int, float, bool):
        raise ValueError('Binding ou operador não permitido.')


def validate(template, root=ROOT):
    schema = json.loads((root / 'data/card-layout-schema.json').read_text())
    keys = {'id', 'schemaVersion', 'name', 'scope', 'canvas', 'extends', 'elements', 'theme', 'revision', 'updatedAt', 'revisionNote'}
    if not isinstance(template, dict) or set(template) - keys or not isinstance(template.get('id'), str) or not ID.fullmatch(template['id']) or template.get('schemaVersion') != 1:
        raise ValueError('Schema ou identificador de template inválido.')
    if not isinstance(template.get('name'), str) or not 1 <= len(template['name'].strip()) <= 120:
        raise ValueError('Nome do template inválido.')
    scope = template.get('scope')
    if not isinstance(scope, dict) or set(scope) - {'level', 'value', 'subtype', 'surface'} or scope.get('level') not in LEVELS or scope.get('surface') not in ['card', 'inspector'] or not isinstance(scope.get('value'), str) or len(scope['value']) > 120 or scope.get('subtype') is not None and not isinstance(scope['subtype'], str):
        raise ValueError('Escopo inválido.')
    if template.get('extends') is not None and (not isinstance(template['extends'], str) or not ID.fullmatch(template['extends'])):
        raise ValueError('Herança inválida.')
    canvas = template.get('canvas', {})
    if not isinstance(canvas, dict) or set(canvas) - {'width', 'height', 'safe', 'bleed'} or any(not number(v, 100 if k in ['width', 'height'] else 0, 5000) for k, v in canvas.items()):
        raise ValueError('Medidas de canvas inválidas.')
    theme = template.get('theme', {})
    if not isinstance(theme, dict) or set(theme) - {'ink', 'accent', 'background', 'frames', 'symbol'}:
        raise ValueError('Tema inválido.')
    for k in ['ink', 'accent', 'background']:
        if k in theme and (not isinstance(theme[k], str) or not COLORS.fullmatch(theme[k])):
            raise ValueError('Cor do tema inválida.')
    if 'frames' in theme:
        if not isinstance(theme['frames'], list) or len(theme['frames']) > 12:
            raise ValueError('Lista de molduras inválida.')
        for value in theme['frames']:
            asset(value, root)
    if theme.get('symbol'):
        asset(theme['symbol'], root)
    if not isinstance(template.get('elements'), list) or len(template['elements']) > 100:
        raise ValueError('Limite de 100 layers.')
    seen = set()
    for layer in template['elements']:
        if not isinstance(layer, dict) or set(layer) - set(schema['layerKeys']) or not isinstance(layer.get('id'), str) or not ID.fullmatch(layer['id']) or layer['id'] in seen:
            raise ValueError('Layer inválida ou repetida.')
        seen.add(layer['id'])
        if layer.get('component') is not None and layer['component'] not in schema['components'] or layer.get('binding') and layer['binding'] not in schema['bindings']:
            raise ValueError('Componente ou binding não permitido.')
        for k in ['name', 'label', 'text']:
            if k in layer and (not isinstance(layer[k], str) or len(layer[k]) > (2000 if k == 'text' else 150)):
                raise ValueError('Texto visual inválido.')
        for k in ['x', 'y', 'width', 'height', 'rotation', 'zIndex', 'opacity']:
            if k in layer and not number(layer[k], .001 if k in ['width', 'height'] else 0 if k == 'opacity' else -10000, 1 if k == 'opacity' else 10000):
                raise ValueError('Coordenada inválida.')
        for k in ['visible', 'locked', 'removed']:
            if k in layer and type(layer[k]) is not bool:
                raise ValueError('Estado de layer inválido.')
        if layer.get('asset'):
            asset(layer['asset'], root)
        style = layer.get('style', {})
        if not isinstance(style, dict) or set(style) - set(schema['styleKeys']):
            raise ValueError('Estilo não permitido.')
        for k, value in style.items():
            if k in ['color', 'background', 'borderColor', 'stroke'] and (not isinstance(value, str) or not COLORS.fullmatch(value)):
                raise ValueError('Cor inválida.')
            if k in ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'borderWidth', 'borderRadius', 'shadow', 'glow', 'strokeWidth', 'padding', 'minFontSize'] and not number(value, 0, 1000):
                raise ValueError('Medida visual inválida.')
            if k == 'fontFamily' and value not in schema['fonts'] or k == 'align' and value not in ['left', 'center', 'right'] or k == 'overflow' and value not in ['visible', 'clip'] or k == 'imageFit' and value not in ['cover', 'contain']:
                raise ValueError('Opção de estilo inválida.')
            if k in ['autoFit', 'uppercase'] and type(value) is not bool:
                raise ValueError('Opção de texto inválida.')
        if 'conditions' in layer:
            condition(layer['conditions'], schema)
    return copy.deepcopy(template)


def read(root=ROOT):
    return json.loads((root / 'data/card-layouts.json').read_text())


def check_parent(template, templates):
    seen = set()
    child = template
    while child.get('extends'):
        if child['id'] in seen:
            raise ValueError('Ciclo de herança.')
        seen.add(child['id'])
        parent = templates.get(child['extends'])
        if not parent or parent['scope']['surface'] != child['scope']['surface'] or LEVELS.index(parent['scope']['level']) > LEVELS.index(child['scope']['level']):
            raise ValueError('Template pai ausente ou fora da hierarquia.')
        child = parent


def mutate(action, payload, writer, root=ROOT):
    with LOCK:
        library = read(root)
        if type(payload.get('expectedRevision')) is not int or payload['expectedRevision'] != library['revision']:
            raise Conflict('A biblioteca mudou em outra janela. Recarregue antes de salvar.')
        if action == 'draft':
            if set(payload) != {'template', 'expectedRevision'}:
                raise ValueError('Pedido de rascunho inválido.')
            template = validate(payload['template'], root)
            if template['id'] in {t['id'] for t in library['bases']}:
                raise ValueError('Bases são imutáveis; crie um override.')
            if template['id'] not in {t['id'] for t in library['drafts']} and len(library['drafts']) >= 200:
                raise ValueError('Limite de templates atingido.')
            check_parent(template, {t['id']: t for t in library['bases'] + library['published'] + library['drafts'] + [template]})
        else:
            if set(payload) - {'id', 'expectedRevision', 'version'} or not isinstance(payload.get('id'), str):
                raise ValueError('Pedido de publicação inválido.')
            template = next((t for t in library['drafts'] if t['id'] == payload['id']), None)
            if not template:
                raise ValueError('Rascunho não encontrado.')
            if action in ['restore', 'rollback']:
                if 'version' in payload:
                    event = next((e for e in library['history'] if e['version'] == payload['version'] and e['template']['id'] == payload['id'] and (action != 'rollback' or e['action'] in ['publish', 'rollback'])), None)
                    template = event['template'] if event else None
                else:
                    template = next((t for t in library['published'] if t['id'] == payload['id']), None)
                if not template:
                    raise ValueError('Versão anterior não encontrada.')
            validate(template, root)
            if action in ['publish', 'rollback']:
                check_parent(template, {t['id']: t for t in library['bases'] + library['published'] + [template]})
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        version = library['revision'] + 1
        template = dict(copy.deepcopy(template), revision=version, updatedAt=now)
        library['drafts'] = [t for t in library['drafts'] if t['id'] != template['id']] + [template]
        if action in ['publish', 'rollback']:
            library['published'] = [t for t in library['published'] if t['id'] != template['id']] + [copy.deepcopy(template)]
        library['history'] = (library['history'] + [{'version': version, 'action': action, 'at': now, 'template': copy.deepcopy(template)}])[-120:]
        library['revision'] = version
        original = (root / 'data/card-layouts.json').read_bytes()
        serialized = (json.dumps(library, ensure_ascii=False, indent=2) + '\n').encode()
        if len(serialized) > 24 * 1024 * 1024:
            raise ValueError('Biblioteca excede o limite de tamanho.')
        writer(root / f'card-forge/out/layout-studio/history-before-{version}.json', original)
        writer(root / 'data/card-layouts.json', serialized)
        return library


def assets(root=ROOT):
    result = []
    for folder in ['CARD-TEMPLATE', 'card-forge/art', 'playtest/assets', 'star-hill/assets']:
        base = root / folder
        if not base.exists():
            continue
        for path in sorted(base.rglob('*')):
            if path.is_file() and path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif'] and path.resolve().is_relative_to(base.resolve()):
                result.append({'path': path.relative_to(root).as_posix(), 'name': path.stem, 'group': folder})
                if len(result) >= 4000:
                    return result
    return result


def handle(handler, path, raw=None, writer=None, root=ROOT):
    try:
        if raw is None:
            if path == '/api/layout-studio':
                return handler.reply(200, read(root))
            if path == '/api/layout-studio/assets':
                return handler.reply(200, {'assets': assets(root)})
        else:
            if len(raw) > 3 * 1024 * 1024:
                return handler.reply(413, {'erro': 'Template grande demais.'})
            action = path.rsplit('/', 1)[-1]
            if action in ['draft', 'publish', 'restore', 'rollback']:
                payload = json.loads(raw)
                if not isinstance(payload, dict):
                    raise ValueError('Objeto JSON esperado.')
                return handler.reply(200, mutate(action, payload, writer, root))
        return handler.reply(404, {'erro': 'Rota de layout não encontrada.'})
    except Conflict as error:
        return handler.reply(409, {'erro': str(error)})
    except (ValueError, KeyError, TypeError) as error:
        return handler.reply(400, {'erro': str(error)})
    except OSError:
        return handler.reply(500, {'erro': 'Não foi possível gravar a biblioteca local.'})
