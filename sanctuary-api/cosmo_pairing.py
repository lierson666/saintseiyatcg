"""Pareamento e classificação de torneios: funções puras e determinísticas, sem banco nem motor de jogo.

POLICY é proposta: nenhuma política de pareamento ou desempate foi aprovada pelo autor ainda; a API devolve o status junto das standings.
Partida = {'a': id, 'b': id ou None (bye), 'a_score': n, 'b_score': n}; só partidas confirmadas entram aqui.
"""
import math

POLICY = {'id': 'proposal-v1', 'status': 'awaiting-author-approval',
          'points': {'win': 3, 'draw': 1, 'loss': 0, 'bye': 3},
          'tiebreaks': ['opponent match win %', 'game win %', 'opponent game win %'], 'floor': 1 / 3}


def swiss_rounds(n):
    return max(1, math.ceil(math.log2(n))) if n > 1 else 1


def _tally(players, matches):
    t = {p: {'player': p, 'points': 0, 'wins': 0, 'draws': 0, 'losses': 0, 'byes': 0, 'games_won': 0, 'games': 0, 'opponents': []} for p in players}
    pts = POLICY['points']
    for m in matches:
        a, b = m['a'], m.get('b')
        if a not in t and b not in t:
            continue
        if b is None:
            t[a]['points'] += pts['bye']
            t[a]['byes'] += 1
            continue
        sa, sb = m['a_score'], m['b_score']
        for me, other, won, lost in ((a, b, sa, sb), (b, a, sb, sa)):
            if me not in t:
                continue
            row = t[me]
            row['opponents'].append(other)
            row['games_won'] += won
            row['games'] += won + lost
            key = 'wins' if won > lost else 'losses' if won < lost else 'draws'
            row[key] += 1
            row['points'] += pts[{'wins': 'win', 'draws': 'draw', 'losses': 'loss'}[key]]
    return t


def standings(players, matches):
    """Classificação com desempates; empate total cai na ordem de players (a semente), nunca em sorte."""
    t = _tally(players, matches)
    floor, pts = POLICY['floor'], POLICY['points']

    def mwp(p):
        r = t.get(p)
        played = (r['wins'] + r['draws'] + r['losses']) if r else 0
        return max(floor, (r['wins'] * pts['win'] + r['draws'] * pts['draw']) / (played * pts['win'])) if played else floor

    def gwp(p):
        r = t.get(p)
        return max(floor, r['games_won'] / r['games']) if r and r['games'] else floor

    def avg(fn, opps):
        return sum(fn(o) for o in opps) / len(opps) if opps else 0
    rows = []
    for seed, p in enumerate(players):
        r = t[p]
        rows.append({**{k: v for k, v in r.items() if k != 'opponents'}, 'seed': seed,
                     'omw': round(avg(mwp, r['opponents']), 4), 'gw': round(gwp(p), 4), 'ogw': round(avg(gwp, r['opponents']), 4)})
    rows.sort(key=lambda r: (-r['points'], -r['omw'], -r['gw'], -r['ogw'], r['seed']))
    for i, r in enumerate(rows):
        r['rank'] = i + 1
    return rows


def swiss_pairings(players, matches):
    """Próxima rodada: mesma pontuação primeiro, sem revanche, bye para o último colocado que ainda não teve.
    Busca com volta atrás; se nenhuma rodada sem revanche existir, devolve None e o organizador decide (nunca sorteia)."""
    table = standings(players, matches)
    order = [r['player'] for r in table]
    played = {frozenset((m['a'], m['b'])) for m in matches if m.get('b') is not None}
    had_bye = {m['a'] for m in matches if m.get('b') is None}
    byes = [None]
    if len(order) % 2:
        byes = [p for p in reversed(order) if p not in had_bye] or list(reversed(order))

    def pair(pool):
        if not pool:
            return []
        first, rest = pool[0], pool[1:]
        for other in rest:
            if frozenset((first, other)) in played:
                continue
            tail = pair([p for p in rest if p != other])
            if tail is not None:
                return [(first, other)] + tail
        return None
    for bye in byes:
        pairs = pair([p for p in order if p != bye])
        if pairs is not None:
            return pairs + ([(bye, None)] if bye is not None else [])
    return None


def round_robin_schedule(players):
    """Método do círculo: lista de rodadas; com número ímpar, cada um folga (bye) uma vez."""
    ring = list(players) + ([None] if len(players) % 2 else [])
    rounds = []
    for _ in range(len(ring) - 1):
        pairs = []
        for i in range(len(ring) // 2):
            a, b = ring[i], ring[-1 - i]
            if a is None:
                a, b = b, None
            pairs.append((a, b))
        rounds.append(pairs)
        ring = [ring[0], ring[-1]] + ring[1:-1]
    return rounds


def elimination_first_round(players):
    """Chave por semente: 1 x último; o melhor da semente recebe bye até completar potência de 2."""
    size = 1
    while size < len(players):
        size *= 2
    slots = [1]
    while len(slots) < size:
        slots = [s for x in slots for s in (x, 2 * len(slots) + 1 - x)]
    seeded = [players[s - 1] if s <= len(players) else None for s in slots]
    pairs = []
    for i in range(0, size, 2):
        a, b = seeded[i], seeded[i + 1]
        if a is None:
            a, b = b, None
        pairs.append((a, b))
    return pairs


def elimination_next_round(previous):
    """previous: partidas confirmadas da rodada, na ordem da chave. Empate não avança: o organizador resolve antes."""
    winners = []
    for m in previous:
        if m.get('b') is None:
            winners.append(m['a'])
        elif m['a_score'] == m['b_score']:
            raise ValueError('empate em eliminação')
        else:
            winners.append(m['a'] if m['a_score'] > m['b_score'] else m['b'])
    if len(winners) < 2:
        return []
    return [(winners[i], winners[i + 1]) for i in range(0, len(winners), 2)]
