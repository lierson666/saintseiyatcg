"""ECONOMY FORGE (autor, 11/11/2026): o STAR HILL edita, publica e volta versões dos números da economia.

- Rascunho: data/economy.json. Só o STAR HILL grava; confere a revisão lida.
- Publicado: sanctuary-api/economy.json, que o servidor do jogo lê ao iniciar. Vai junto no Docker.
- Versões: star-hill/historico/economy/v<N>.json, uma por publicação, nunca reescritas. Rollback publica uma cópia
  da versão escolhida como versão nova.
Validação e diff vêm de sanctuary-api/economy.py: uma regra só para o editor e para o servidor.
"""
import hashlib
import importlib.util
import json
import time
from pathlib import Path

DRAFT = 'data/economy.json'
PUBLISHED = 'sanctuary-api/economy.json'
HISTORY = 'star-hill/historico/economy'

_spec = importlib.util.spec_from_file_location('sanctuary_economy', Path(__file__).resolve().parent.parent / 'sanctuary-api/economy.py')
E = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(E)
META = ('version', 'published_at', 'fingerprint', 'rollback_of')


def _rev(text):
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _load(path):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else None


def _dump(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def _draft_text(root):
    path = root / DRAFT
    return path.read_text(encoding='utf-8') if path.exists() else _dump(E.DEFAULTS).decode()


def versions(root):
    out = []
    for p in sorted((root / HISTORY).glob('v*.json'), key=lambda p: int(p.stem[1:]) if p.stem[1:].isdigit() else 0, reverse=True):
        v = _load(p)
        out.append({k: v.get(k) for k in META})
    return out


def read(root):
    text = _draft_text(root)
    draft, live = json.loads(text), _load(root / PUBLISHED)
    errors = E.check(draft)
    same = bool(live) and not errors and E.fingerprint(draft) == live.get('fingerprint')
    return {'rascunho': draft, 'revisao': _rev(text), 'estado': 'published' if same else 'draft',
            'publicado': live and {k: live.get(k) for k in META}, 'erros': errors,
            'diff': E.diff(live, draft) if not errors else [], 'versoes': versions(root),
            'grupos': [{'nome': name, 'campos': [{'path': p, 'label': label, 'min': lo, 'max': hi} for p, label, lo, hi in fields]} for name, fields in E.GROUPS]}


def _same_revision(root, body):
    if body.get('revisao') != _rev(_draft_text(root)):
        raise ValueError('A economia mudou desde que você abriu. Recarregue antes de gravar.')


def save(root, body, atomic_write):
    _same_revision(root, body)
    draft = body.get('conteudo')
    errors = E.check(draft)
    if errors:
        raise ValueError('Corrija antes de salvar: ' + ' '.join(errors[:5]))
    atomic_write(root / DRAFT, _dump(E.normalized(draft)))
    return read(root)


def _publish(root, cfg, atomic_write, rollback_of=None):
    errors = E.check(cfg)
    if errors:
        raise ValueError('Não dá para publicar: ' + ' '.join(errors[:5]))
    live = _load(root / PUBLISHED)
    fp = E.fingerprint(cfg)
    if live and live.get('fingerprint') == fp:
        raise ValueError('Nada mudou desde a última publicação.')
    version = (live or {}).get('version', 0) + 1
    out = {'schema_version': 1, 'version': version, 'published_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
           'fingerprint': fp, 'rollback_of': rollback_of} | E.normalized(cfg)
    hist = root / HISTORY / f'v{version}.json'
    if hist.exists():
        raise ValueError(f'A versão {version} já existe no histórico; nada foi publicado.')
    hist.parent.mkdir(parents=True, exist_ok=True)
    atomic_write(hist, _dump(out))
    atomic_write(root / PUBLISHED, _dump(out))


def publish(root, body, atomic_write):
    _same_revision(root, body)
    _publish(root, json.loads(_draft_text(root)), atomic_write)
    return read(root)


def rollback(root, body, atomic_write):
    n = body.get('versao')
    if type(n) is not int or n < 1:
        raise ValueError('Versão inválida.')
    old = _load(root / HISTORY / f'v{n}.json')
    if not old:
        raise ValueError(f'A versão {n} não existe.')
    _publish(root, old, atomic_write, rollback_of=n)
    atomic_write(root / DRAFT, _dump(E.normalized(old)))  # o rascunho passa a ser o que está no ar
    return read(root)
