"""ACHIEVEMENTS FORGE V1.0 (autor, 11/11/2026): métricas, validação do catálogo e motor de conquistas.

Uma fonte só. O sanctuary-api usa para medir e desbloquear; o STAR HILL (card-forge/achievements_forge.py) usa para
validar, comparar e publicar. Só biblioteca padrão: o arquivo vai junto no Docker do sanctuary-api.

Rastreio de cada métrica (METRICS):
- server: o próprio servidor registra o fato (duelo online, coleção, ranking, boosters abertos, premiação da temporada).
- client_reported: o servidor guarda, mas o fato vem do navegador (partida contra a IA, Descubra seu Cosmo, Cosmo Chronicles).
  Desbloqueia, mas nunca paga Cosmo Coins.
- pending: ainda não há telemetria confiável. Aparece no catálogo e nunca desbloqueia. Não inventar métrica.
"""
import hashlib
import json
import re

RARITIES = ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Divine')
CATEGORIES = ('progression', 'competitive', 'collection', 'season')
# Efeitos do título: ids e cores dos shaders do VFX Forge (shared/vfx/presets.js, SHADERS). A placa desenha uma versão em CSS.
EFFECTS = ('none', 'glow', 'energy-pulse', 'cosmic-aura', 'divine-light', 'starfield', 'holo-foil')
GODS = ('athena', 'poseidon', 'hades', 'ares', 'artemis')
TOP_PLACES = (1, 3, 10, 20, 50, 100)
ID_RE = re.compile(r'^ach-\d{3}$')
TITLE_MAX, TEXT_MAX, TARGET_MAX, COINS_MAX, CATALOG_MAX = 40, 200, 1_000_000, 2000, 500

METRICS = {
    'played': ('server', 'Online duels played'),
    'wins': ('server', 'Online duel wins (anti-farm: same opponent counts up to 3 wins a day)'),
    'win_streak': ('server', 'Longest online win streak'),
    **{f'{g}_wins': ('server', f'Online wins with god-{g}') for g in GODS},
    'faction_wins_each': ('server', 'Online wins with each of the five Gods (the lowest of the five)'),
    'winning_decks': ('server', 'Different decklists with at least one online win'),
    'decks_created': ('server', 'Decks saved to the account'),
    'new_cards': ('server', 'Different cards in the Collection beyond the starter collection'),
    'boosters_opened': ('server', 'Boosters opened (counted since Achievements V1.0)'),
    'gold_i': ('server', 'Reached Gold I or higher in a season (1 = yes)'),
    'season_gold_i': ('server', 'Seasons that reached Gold I or higher'),
    'kamui': ('server', 'Reached Kamui in a season (1 = yes)'),
    'season_kamui': ('server', 'Seasons that reached Kamui'),
    'season_top': ('server', 'Best certified Season Awards place (target = TOP N)'),
    'ai_wins': ('client_reported', 'Wins against the AI that gave XP (daily cap)'),
    'cosmo_discovered': ('client_reported', 'Finished Discover your Cosmo (1 = yes)'),
    'chronicles_missions': ('client_reported', 'Cosmo Chronicles missions completed'),
    'tutorial': ('pending', "Marin's tutorial is not recorded on the server yet"),
    'strikes': ('pending', 'Strikes declared: the duel server does not report match events yet'),
    'cosmo_spent': ('pending', 'Cosmo spent: no match telemetry yet'),
    'ranked_cosmo_spent': ('pending', 'Cosmo spent in ranked duels: no match telemetry yet'),
    'wins_soul_1': ('pending', 'Wins with exactly 1 Soul: no match telemetry yet'),
    'low_soul_wins': ('pending', 'Wins with low Soul: no match telemetry yet'),
    'equipments_played': ('pending', 'Equipments played: no match telemetry yet'),
    'devotees_defeated': ('pending', 'Devotees defeated: no match telemetry yet'),
    'mill_wins': ('pending', 'Wins by empty deck: the duel server does not report the win reason yet'),
    'equal_rank_wins': ('pending', 'Wins against the same rank: rank at match time is not stored yet'),
}


def tracking(metric):
    return METRICS.get(metric, ('pending',))[0]


def check(catalog, published=None):
    """Erros que impedem gravar ou publicar. published: catálogo no ar, para não sumir com ID que jogador já tem."""
    errors = []
    items = catalog.get('achievements') if isinstance(catalog, dict) else None
    if not isinstance(items, list) or not 1 <= len(items) <= CATALOG_MAX:
        return [f'O catálogo precisa de 1 a {CATALOG_MAX} conquistas.']
    seen, titles = set(), {}
    for n, a in enumerate(items, 1):
        where = a.get('id') if isinstance(a, dict) and isinstance(a.get('id'), str) else f'#{n}'
        if not isinstance(a, dict) or not ID_RE.match(str(a.get('id', ''))):
            errors.append(f'{where}: ID precisa ser ach-000.')
            continue
        if a['id'] in seen:
            errors.append(f'{where}: ID repetido.')
        seen.add(a['id'])
        for field, limit in (('title', TITLE_MAX), ('title_pt', TITLE_MAX), ('description', TEXT_MAX), ('description_pt', TEXT_MAX)):
            v = a.get(field)
            if not isinstance(v, str) or not v.strip() or len(v) > limit or v != v.strip():
                errors.append(f'{where}: {field} precisa ter de 1 a {limit} caracteres, sem espaço nas pontas.')
        if isinstance(a.get('title'), str):
            other = titles.setdefault(a['title'].lower(), a['id'])
            if other != a['id']:
                errors.append(f'{where}: título igual ao de {other}.')
        if a.get('rarity') not in RARITIES:
            errors.append(f'{where}: raridade desconhecida.')
        if a.get('category') not in CATEGORIES:
            errors.append(f'{where}: categoria desconhecida.')
        if a.get('metric') not in METRICS:
            errors.append(f'{where}: métrica desconhecida.')
        target = a.get('target')
        if type(target) is not int or not 1 <= target <= TARGET_MAX:
            errors.append(f'{where}: objetivo precisa ser inteiro de 1 a {TARGET_MAX}.')
        elif a.get('metric') == 'season_top' and target not in TOP_PLACES:
            errors.append(f'{where}: TOP precisa ser um de {", ".join(map(str, TOP_PLACES))}.')
        elif a.get('metric') in ('gold_i', 'kamui', 'cosmo_discovered') and target != 1:
            errors.append(f'{where}: esta métrica é sim/não; objetivo 1.')
        if type(a.get('enabled')) is not bool:
            errors.append(f'{where}: enabled precisa ser true ou false.')
        reward = a.get('reward')
        coins = reward.get('coins') if isinstance(reward, dict) else None
        if type(coins) is not int or not 0 <= coins <= COINS_MAX:
            errors.append(f'{where}: Cosmo Coins de 0 a {COINS_MAX}.')
        elif coins and tracking(a.get('metric')) != 'server':
            errors.append(f'{where}: só métrica registrada pelo servidor pode pagar Cosmo Coins.')
        visual = a.get('visual')
        if not isinstance(visual, dict) or visual.get('effect') not in EFFECTS:
            errors.append(f'{where}: efeito visual desconhecido.')
    if published:
        gone = sorted({a['id'] for a in published.get('achievements', [])} - seen)
        if gone:
            errors.append(f'Conquista publicada não pode sumir (desative em vez de apagar): {", ".join(gone)}.')
    return errors


def normalized(catalog):
    """Cópia com o rastreio vindo do registro (o catálogo nunca decide sozinho se a métrica é confiável)."""
    out = json.loads(json.dumps(catalog))
    for a in out['achievements']:
        a['tracking'] = tracking(a['metric'])
    return out


def fingerprint(catalog):
    return hashlib.sha256(json.dumps(catalog.get('achievements', []), sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def diff(old, new):
    """Mudanças campo a campo entre dois catálogos: [{id, change: added|removed|changed, field, before, after}]."""
    flat = lambda a: {k: (json.dumps(v, sort_keys=True, ensure_ascii=False) if isinstance(v, (dict, list)) else v) for k, v in a.items() if k != 'tracking'}
    before = {a['id']: flat(a) for a in (old or {}).get('achievements', [])}
    after = {a['id']: flat(a) for a in (new or {}).get('achievements', [])}
    out = []
    for i in sorted(before.keys() | after.keys()):
        if i not in before:
            out.append({'id': i, 'change': 'added'})
        elif i not in after:
            out.append({'id': i, 'change': 'removed'})
        else:
            out += [{'id': i, 'change': 'changed', 'field': k, 'before': before[i].get(k), 'after': after[i].get(k)}
                    for k in sorted(before[i].keys() | after[i].keys()) if before[i].get(k) != after[i].get(k)]
    return out


# ---------- motor ----------
# values: {métrica: {'value': int, 'times': [ts...] ordenado ou None, 'at': ts ou None}}.
# times[i] = quando a contagem chegou a i + 1: a data do desbloqueio sai daí; sem times, a data fica vazia (nunca inventada).

def reached(a, v):
    """(feito, quando). season_top: vale o melhor lugar (menor), feito se 1 <= lugar <= TOP."""
    if not v:
        return False, None
    if a['metric'] == 'season_top':
        return 0 < v['value'] <= a['target'], v.get('at')
    if v['value'] < a['target']:
        return False, None
    times = v.get('times')
    return True, times[a['target'] - 1] if times and len(times) >= a['target'] else None


def unlockable(catalog, values):
    for a in catalog.get('achievements', []):
        if a.get('enabled') and tracking(a['metric']) != 'pending':
            done, at = reached(a, values.get(a['metric']))
            if done:
                yield a, at


def progress(catalog, values, unlocked):
    """Lista para o jogador: o que tem, quanto falta e o que ainda espera telemetria. unlocked: {id: unlocked_at}."""
    out = []
    for a in catalog.get('achievements', []):
        if not a.get('enabled') and a['id'] not in unlocked:
            continue
        v = values.get(a['metric']) or {'value': 0}
        out.append({'id': a['id'], 'name': a['title'], 'name_pt': a['title_pt'], 'description': a['description'],
                    'description_pt': a['description_pt'], 'rarity': a['rarity'], 'category': a['category'],
                    'effect': a['visual']['effect'], 'metric': a['metric'], 'target': a['target'], 'value': v['value'],
                    'tracking': tracking(a['metric']), 'pending': tracking(a['metric']) == 'pending',
                    'done': a['id'] in unlocked, 'unlocked_at': unlocked.get(a['id'])})
    return out


def title_of(catalog, ach_id):
    """Título equipável: só conquista publicada e ativa. Devolve o que a placa precisa, ou None."""
    a = next((x for x in catalog.get('achievements', []) if x['id'] == ach_id and x.get('enabled')), None)
    return a and {'id': a['id'], 'name': a['title'], 'name_pt': a['title_pt'], 'rarity': a['rarity'], 'effect': a['visual']['effect']}


def award_order(rows):
    """Season Awards: ordem determinística. rows: [{user_id, key: (tier, -division, pips+points), wins}].
    Desempate: rank maior, depois mais vitórias na temporada, depois o ID de conta mais antigo."""
    return sorted(rows, key=lambda r: (tuple(-k for k in r['key']), -r['wins'], r['user_id']))
