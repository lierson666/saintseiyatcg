"""Publicação segura das animações: rascunho, teste, aprovado e publicado.

O Star Hill edita data/card-animations.json e data/vfx-studio.json. O jogo online só lê as cópias *.publicado.json, feitas aqui,
depois de validar as referências. Cada versão fica em data/vfx-historico; voltar a uma versão antiga cria uma versão nova.
Publicar aqui não põe nada no ar: isso continua sendo o deploy do site, com a palavra do autor.
"""
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANIMS, STUDIO = 'data/card-animations.json', 'data/vfx-studio.json'
PUB_ANIMS, PUB_STUDIO = 'data/card-animations.publicado.json', 'data/vfx-studio.publicado.json'
INDEX, HISTORY, CATALOG = 'data/vfx-publicacao.json', 'data/vfx-historico', 'data/vfx-catalog.json'
SETTINGS = {'efeitos', 'particulas', 'css', 'ceu', 'moeda'}  # ajustes; o resto de card-animations é momento por carta, facção ou padrão
STATES = ('rascunho', 'teste', 'aprovado', 'publicado')


def state_of(effect):
    return effect.get('estado') or ('rascunho' if effect.get('rascunho') else 'publicado')


def _read(root, rel, fallback=None):
    path = Path(root) / rel
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else fallback


def _write(root, rel, data):
    path = Path(root) / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temp = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    with os.fdopen(handle, 'w', encoding='utf-8') as out:
        out.write(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + '\n')
    os.replace(temp, path)


def references(anims, studio):
    """Todo efeito citado: {id: onde}. False é "sem animação" de propósito."""
    found = {}
    for key, entry in anims.items():
        if key in SETTINGS or not isinstance(entry, dict):
            continue
        for moment, value in entry.items():
            for item in (value if moment == 'linhas' and isinstance(value, list) else [value]):
                if isinstance(item, str):
                    found.setdefault(item, f'{key} · {moment}')
    for rid in anims.get('efeitos', {}):
        found.setdefault(rid, 'ajuste de efeito')
    for name, comp in (studio or {}).get('composicoes', {}).items():
        for layer in comp.get('camadas', []):
            for field, prefix in (('efeito', ''), ('shader', 'shader:')):
                if layer.get(field):
                    found.setdefault(prefix + layer[field], f'composição {name}')
    return found


def problems(anims, studio, root=ROOT, builtin=()):
    """O que impede publicar: efeito que não existe, arquivo ausente ou efeito ainda não aprovado."""
    catalog = {e['id']: e for e in _read(root, CATALOG, {'efeitos': []})['efeitos']}
    presets = (Path(root) / 'shared/vfx/presets.js').read_text(encoding='utf-8') if (Path(root) / 'shared/vfx/presets.js').exists() else ''
    comps = (studio or {}).get('composicoes', {})
    out, queue, seen = [], list(references(anims, studio).items()), set()
    while queue:
        rid, where = queue.pop()
        if rid in seen:
            continue
        seen.add(rid)
        if rid in builtin:
            continue
        kind, _, name = rid.partition(':')
        if kind == 'comp' and name:
            if name not in comps:
                out.append(f'{rid} não existe ({where}).')
            continue
        if kind in ('shader', 'lottie') and name:
            if f"'{name}'" not in presets:
                out.append(f'{rid} não existe ({where}).')
            continue
        effect = catalog.get(rid)
        if not effect:
            out.append(f'{rid} não existe ({where}).')
            continue
        if state_of(effect) in ('rascunho', 'teste'):
            out.append(f'{effect["nome"]} ainda está em {state_of(effect)} ({where}).')
        if effect.get('arquivo') and not (Path(root) / effect['arquivo']).exists():
            out.append(f'{effect["nome"]}: arquivo {effect["arquivo"]} sumiu ({where}).')
        for track, block in (effect.get('coreografia') or {}).get('faixas', {}).items():
            if block.get('efeito'):
                queue.append((block['efeito'], f'{effect["nome"]} · {track}'))
    return sorted(out)


def _changed(working, published):
    return sorted(k for k in {*working, *published} if working.get(k) != published.get(k))


def status(root=ROOT, builtin=()):
    anims, studio = _read(root, ANIMS, {}), _read(root, STUDIO, {})
    index = _read(root, INDEX, {'versao': 0, 'historico': []})
    effects = _read(root, CATALOG, {'efeitos': []})['efeitos']
    new = [e for e in effects if e.get('estado') or e.get('rascunho')]
    return {'versao': index['versao'], 'historico': index['historico'][::-1], 'problemas': problems(anims, studio, root, builtin),
            'mudou': {'animacoes': _changed(anims, _read(root, PUB_ANIMS, {})), 'estudio': _changed(studio, _read(root, PUB_STUDIO, {}))},
            'estados': {s: sum(state_of(e) == s for e in effects) for s in STATES},
            'efeitos': [{'id': e['id'], 'nome': e['nome'], 'estado': state_of(e), 'tipo': e.get('tipo'), 'fonte': e.get('fonte')} for e in new]}


def _release(anims, studio, nota, root, builtin):
    found = problems(anims, studio, root, builtin)
    if found:
        raise ValueError('Não dá para publicar: ' + ' '.join(found[:6]))
    index = _read(root, INDEX, {'versao': 0, 'historico': []})
    version = index['versao'] + 1
    when = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    _write(root, f'{HISTORY}/v{version}.json', {'versao': version, 'em': when, 'nota': nota, 'animacoes': anims, 'estudio': studio})
    _write(root, PUB_ANIMS, anims)
    _write(root, PUB_STUDIO, studio)
    used = references(anims, studio)
    catalog = _read(root, CATALOG)
    if catalog:
        touched = False
        for effect in catalog['efeitos']:
            if effect['id'] in used and effect.get('estado') == 'aprovado':
                effect['estado'] = 'publicado'
                touched = True
        if touched:
            _write(root, CATALOG, catalog)
    index['versao'] = version
    index['historico'].append({'versao': version, 'em': when, 'nota': nota})
    _write(root, INDEX, index)
    return status(root, builtin)


def publish(nota, root=ROOT, builtin=()):
    nota = str(nota or '').strip()
    if not nota or len(nota) > 200:
        raise ValueError('Escreva o que mudou nesta versão.')
    return _release(_read(root, ANIMS, {}), _read(root, STUDIO, {}), nota, root, builtin)


def restore(version, root=ROOT, builtin=()):
    """Volta o que é publicado a uma versão antiga, como versão nova. A edição em andamento não muda."""
    if not isinstance(version, int) or isinstance(version, bool):
        raise ValueError('Versão inválida.')
    snapshot = _read(root, f'{HISTORY}/v{version}.json')
    if not snapshot:
        raise ValueError('Versão não encontrada.')
    return _release(snapshot['animacoes'], snapshot['estudio'], f'Volta para a versão {version}', root, builtin)


def handle(body, root=ROOT, builtin=()):
    action = body.get('acao') if isinstance(body, dict) else None
    if action == 'publicar':
        return publish(body.get('nota'), root, builtin)
    if action == 'restaurar':
        return restore(body.get('versao'), root, builtin)
    raise ValueError('Pedido inválido.')


def check(root=ROOT, builtin=()):
    """Trava do deploy: o que vai ao ar precisa existir e estar aprovado, e o índice precisa bater com o histórico."""
    index = _read(root, INDEX)
    if not index:
        return ['Sem versão publicada: data/vfx-publicacao.json não existe.']
    anims, studio = _read(root, PUB_ANIMS), _read(root, PUB_STUDIO)
    if anims is None or studio is None:
        return ['Arquivos *.publicado.json ausentes.']
    out = problems(anims, studio, root, builtin)
    snapshot = _read(root, f'{HISTORY}/v{index["versao"]}.json')
    if not snapshot:
        out.append(f'Histórico da versão {index["versao"]} ausente.')
    elif snapshot['animacoes'] != anims or snapshot['estudio'] != studio:
        out.append('Arquivos publicados não batem com o histórico: alguém editou à mão.')
    return out
