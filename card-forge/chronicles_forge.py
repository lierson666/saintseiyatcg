"""COSMO CHRONICLES FORGE (autor, 11/11/2026): o STAR HILL lê e grava as missões do modo história.

Só edita missões que já existem em data/chronicles/ (<id>.json e <id>.dialogues.json) e o título/pré-requisito
delas em saga-01.json. Toda gravação confere a revisão lida (não sobrescreve edição feita em outro lugar),
valida a estrutura e guarda a versão anterior em star-hill/historico/chronicles/.
"""
import hashlib
import json
import os
import re
import time
from pathlib import Path

DATA = 'data/chronicles'
SAGA = 'saga-01.json'
HISTORY = 'star-hill/historico/chronicles'
ID = re.compile(r'^\d+-\d+$')
POSES = {'idle', 'wave', 'point', 'explain', 'confident', 'tip', 'good', 'cheer'}
AI = {'easy', 'normal', 'hard'}
# O modo história ainda só existe no ambiente isolado. Um STAR HILL sem data/chronicles (ex.: olympus, que o app do Mac abre)
# edita a cópia isolada, para haver uma fonte só. SSTCG_CHRONICLES_ROOT troca a pasta; SSTCG_CHRONICLES_PREVIEW, a prévia.
ISOLATED = Path.home() / 'worktrees/sstcg-chronicles'


def data_root(root):
    env = os.environ.get('SSTCG_CHRONICLES_ROOT')
    if env:
        return Path(env)
    return root if (root / DATA / SAGA).exists() else ISOLATED


def preview(root):
    if os.environ.get('SSTCG_CHRONICLES_PREVIEW'):
        return os.environ['SSTCG_CHRONICLES_PREVIEW']
    return '../playtest/chronicles/' if data_root(root) == root else 'http://localhost:8061/playtest/chronicles/'


def _rev(*texts):
    return hashlib.sha256('\x00'.join(texts).encode()).hexdigest()


def _files(root, mid):
    if not ID.match(mid or ''):
        raise ValueError('Missão inválida.')
    base = root / DATA
    m, d = base / f'{mid}.json', base / f'{mid}.dialogues.json'
    if not m.exists() or not d.exists():
        raise ValueError(f'A missão {mid} ainda não tem arquivos.')
    return m, d


def read(root):
    base = root
    root = data_root(root)
    saga = json.loads((root / DATA / SAGA).read_text(encoding='utf-8'))
    out = {}
    for ch in saga['chapters']:
        for entry in ch['missions']:
            if entry.get('status') != 'ready':
                continue
            m, d = _files(root, entry['id'])
            mt, dt = m.read_text(encoding='utf-8'), d.read_text(encoding='utf-8')
            out[entry['id']] = {'mission': json.loads(mt), 'dialogues': json.loads(dt), 'revisao': _rev(mt, dt)}
    try:
        sagas = json.loads((root / DATA / 'sagas.json').read_text(encoding='utf-8'))['sagas']
    except (OSError, ValueError, KeyError):
        sagas = []
    return {'saga': saga, 'missoes': out, 'sagas': sagas, 'previa': preview(base), 'pasta': str(root)}


def _text(v, where):
    if not isinstance(v, dict) or not all(isinstance(v.get(k), str) and v[k].strip() for k in ('pt', 'en')):
        raise ValueError(f'{where}: preencha PT e EN.')


def validate(mission, dialogues, mid, known_cards=None):
    """Erros que impedem gravar. Avisos de estilo (ex.: mais de duas frases) ficam com a tela."""
    if not isinstance(mission, dict) or not isinstance(dialogues, dict) or not isinstance(dialogues.get('lines'), dict):
        raise ValueError('Missão ou falas em formato inválido.')
    if mission.get('id') != mid:
        raise ValueError('O ID da missão não pode mudar.')
    lines, chars = dialogues['lines'], mission.get('characters')
    for key, v in lines.items():
        _text(v, f'Fala {key}')
    for k in ('title', 'description'):
        _text(mission.get(k), k)
    for k in ('objective', 'challenge'):
        if k in mission:
            _text(mission[k], k)
    if not isinstance(chars, dict) or not chars:
        raise ValueError('A missão precisa de personagens.')
    for cid, c in chars.items():
        _text(c.get('name'), f'Nome de {cid}')
    scenes = mission.get('scenes') or {}
    for kind in ('intro', 'win', 'lose'):
        lst = scenes.get(kind)
        if not isinstance(lst, list) or not lst:
            raise ValueError(f'Cenas de {kind}: precisa de ao menos uma.')
        for i, s in enumerate(lst, 1):
            if s.get('who') not in chars:
                raise ValueError(f'Cena {kind} {i}: personagem desconhecido.')
            if s.get('line') not in lines:
                raise ValueError(f'Cena {kind} {i}: fala {s.get("line")} não existe.')
            if not isinstance(s.get('art'), str) or not s['art']:
                raise ValueError(f'Cena {kind} {i}: escolha uma arte.')
            if s.get('pose') and s['pose'] not in POSES:
                raise ValueError(f'Cena {kind} {i}: pose desconhecida.')
    prep = scenes.get('prep') or {}
    if prep.get('who') not in chars or prep.get('line') not in lines:
        raise ValueError('Preparação: escolha personagem e fala.')
    for h in mission.get('hints') or []:
        if h.get('id') not in lines:
            raise ValueError(f'Dica {h.get("id")}: falta o texto.')
        if h.get('pose') and h['pose'] not in POSES:
            raise ValueError(f'Dica {h["id"]}: pose desconhecida.')
        if not isinstance(h.get('when'), (list, dict)):
            raise ValueError(f'Dica {h["id"]}: gatilho inválido.')
    rival = mission.get('rival') or {}
    if rival.get('ai') not in AI:
        raise ValueError('IA do rival: easy, normal ou hard.')
    decks = mission.get('decks')
    if not isinstance(decks, list) or len(decks) < 2:
        raise ValueError('A missão precisa dos dois decks.')
    ids = set()
    for deck in decks:
        main = deck.get('main_deck')
        if not isinstance(main, list):
            raise ValueError(f'Deck {deck.get("id")}: lista inválida.')
        for c in main:
            q = c.get('quantity')
            if not isinstance(q, int) or isinstance(q, bool) or not 1 <= q <= 3 or not isinstance(c.get('card_id'), str):
                raise ValueError(f'Deck {deck.get("id")}: cada carta vai de 1 a 3 cópias.')
            if known_cards is not None and c['card_id'] not in known_cards:
                raise ValueError(f'Deck {deck.get("id")}: carta {c["card_id"]} não existe.')
        if sum(c['quantity'] for c in main) != 50:
            raise ValueError(f'Deck {deck.get("id")}: precisa de 50 cartas.')
        ids.add(deck.get('id'))
    if (mission.get('player') or {}).get('deck') not in ids or rival.get('deck') not in ids:
        raise ValueError('Jogador e rival precisam apontar para decks da missão.')
    if (mission.get('player') or {}).get('character') not in chars or rival.get('character') not in chars:
        raise ValueError('Jogador e rival precisam ser personagens da missão.')


def _cards(root):
    try:
        data = json.loads((root / 'data/cards.json').read_text(encoding='utf-8'))
    except OSError:
        return None
    items = data if isinstance(data, list) else data.get('cards') or data.get('cartas') or []
    return {str(c.get('id')).lower() for c in items if isinstance(c, dict) and c.get('id')} or None


def save(root, body, atomic_write):
    root = data_root(root)
    mid = body.get('id')
    m, d = _files(root, mid)
    mt, dt = m.read_text(encoding='utf-8'), d.read_text(encoding='utf-8')
    if body.get('revisao') != _rev(mt, dt):
        raise ValueError('A missão mudou desde que você abriu. Recarregue antes de gravar.')
    mission, dialogues = body.get('mission'), body.get('dialogues')
    known = _cards(root)
    validate(mission, dialogues, mid, {c.lower() for c in known} if known else None)
    stamp = time.strftime('%Y%m%d-%H%M%S') + f'{int(time.time() * 1000) % 1000:03d}'  # duas gravações no mesmo segundo não se sobrescrevem
    hist = root / HISTORY
    atomic_write(hist / f'{mid}-{stamp}.json', mt.encode())
    atomic_write(hist / f'{mid}-{stamp}.dialogues.json', dt.encode())
    nm = json.dumps(mission, ensure_ascii=False, indent=1) + '\n'
    nd = json.dumps(dialogues, ensure_ascii=False, indent=1) + '\n'
    atomic_write(m, nm.encode())
    atomic_write(d, nd.encode())
    saga_path = root / DATA / SAGA
    saga = json.loads(saga_path.read_text(encoding='utf-8'))
    for ch in saga['chapters']:
        for entry in ch['missions']:
            if entry['id'] == mid:
                entry['title'] = mission['title']
                entry['requires'] = list(mission.get('requires') or [])
    atomic_write(saga_path, (json.dumps(saga, ensure_ascii=False, indent=1) + '\n').encode())
    return {'revisao': _rev(nm, nd), 'historico': f'{HISTORY}/{mid}-{stamp}.json'}
