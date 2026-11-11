"""ACHIEVEMENTS FORGE V1.0 (autor, 11/11/2026): o STAR HILL edita, publica e volta versões do catálogo de conquistas.

- Rascunho: data/achievements.json (Draft). Só o STAR HILL grava; confere a revisão lida.
- Publicado: sanctuary-api/achievements.json (Published), o que o servidor do jogo usa. Vai junto no Docker.
- Versões: star-hill/historico/achievements/v<N>.json, uma por publicação, nunca reescritas. Rollback publica uma cópia
  da versão escolhida como versão nova (o histórico só cresce).
Validação e diff vêm de sanctuary-api/achievements.py: uma regra só para o editor e para o servidor.
"""
import hashlib
import importlib.util
import json
import time
from pathlib import Path

DRAFT = 'data/achievements.json'
PUBLISHED = 'sanctuary-api/achievements.json'
HISTORY = 'star-hill/historico/achievements'

_spec = importlib.util.spec_from_file_location('sanctuary_achievements', Path(__file__).resolve().parent.parent / 'sanctuary-api/achievements.py')
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)


def _rev(text):
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _load(path):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else None


def _dump(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def versions(root):
    folder = root / HISTORY
    out = []
    for p in sorted(folder.glob('v*.json'), key=lambda p: int(p.stem[1:]) if p.stem[1:].isdigit() else 0, reverse=True):
        v = _load(p)
        out.append({k: v.get(k) for k in ('version', 'published_at', 'fingerprint', 'rollback_of')} | {'count': len(v.get('achievements', []))})
    return out


def read(root):
    text = (root / DRAFT).read_text(encoding='utf-8')
    draft, live = json.loads(text), _load(root / PUBLISHED)
    same = bool(live) and A.fingerprint(A.normalized(draft)) == live.get('fingerprint')
    return {'rascunho': draft, 'revisao': _rev(text), 'estado': 'published' if same else 'draft',
            'publicado': live and {k: live.get(k) for k in ('version', 'published_at', 'fingerprint', 'rollback_of')},
            'erros': A.check(draft, live), 'diff': A.diff(live, draft), 'versoes': versions(root),
            'metricas': {m: {'tracking': t, 'info': info} for m, (t, info) in A.METRICS.items()},
            'raridades': list(A.RARITIES), 'categorias': list(A.CATEGORIES), 'efeitos': list(A.EFFECTS), 'top': list(A.TOP_PLACES)}


def _same_revision(root, body):
    if body.get('revisao') != _rev((root / DRAFT).read_text(encoding='utf-8')):
        raise ValueError('O catálogo mudou desde que você abriu. Recarregue antes de gravar.')


def save(root, body, atomic_write):
    _same_revision(root, body)
    draft = body.get('conteudo')
    errors = A.check(draft, _load(root / PUBLISHED))
    if errors:
        raise ValueError('Corrija antes de salvar: ' + ' '.join(errors[:5]))
    draft = A.normalized(draft) | {'status': 'draft'}
    atomic_write(root / DRAFT, _dump(draft))
    return read(root)


def _publish(root, catalog, atomic_write, rollback_of=None):
    live = _load(root / PUBLISHED)
    errors = A.check(catalog, live)
    if errors:
        raise ValueError('Não dá para publicar: ' + ' '.join(errors[:5]))
    clean = A.normalized(catalog)
    fp = A.fingerprint(clean)
    if live and live.get('fingerprint') == fp:
        raise ValueError('Nada mudou desde a última publicação.')
    version = (live or {}).get('version', 0) + 1
    out = {'schema_version': 2, 'version': version, 'published_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'fingerprint': fp,
           'rollback_of': rollback_of, 'anti_farm': clean.get('anti_farm', {'max_wins_per_opponent_day': 3}), 'achievements': clean['achievements']}
    hist = root / HISTORY / f'v{version}.json'
    if hist.exists():
        raise ValueError(f'A versão {version} já existe no histórico; nada foi publicado.')
    hist.parent.mkdir(parents=True, exist_ok=True)
    atomic_write(hist, _dump(out))
    atomic_write(root / PUBLISHED, _dump(out))
    return out


def publish(root, body, atomic_write):
    _same_revision(root, body)
    _publish(root, _load(root / DRAFT), atomic_write)
    return read(root)


def rollback(root, body, atomic_write):
    n = body.get('versao')
    if type(n) is not int or n < 1:
        raise ValueError('Versão inválida.')
    old = _load(root / HISTORY / f'v{n}.json')
    if not old:
        raise ValueError(f'A versão {n} não existe.')
    draft = _load(root / DRAFT) or {}
    catalog = {k: v for k, v in draft.items() if k != 'achievements'} | {'anti_farm': old.get('anti_farm'), 'achievements': old['achievements']}
    _publish(root, catalog, atomic_write, rollback_of=n)
    atomic_write(root / DRAFT, _dump(A.normalized(catalog) | {'status': 'draft'}))  # o rascunho passa a ser o que está no ar
    return read(root)
