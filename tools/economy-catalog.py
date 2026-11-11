"""Gera sanctuary-api/catalog.json para a economia (docs/economia.md): cartas do booster por raridade e coleção inicial.
Rodar de novo quando cartas jogáveis, raridades ou decks iniciais mudarem:  python3 tools/economy-catalog.py
Cartas jogáveis = as do Olympus Arena (canon D268 + prévias do Card Forge); raridade vem de data/cards.json.
Gods e Domains não vêm no booster (autor, 31/10/2026): ficam de fora do catálogo e são de todos."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
load = lambda p: json.loads((ROOT / p).read_text())
PREVIEW = re.compile(r'^(poseidon|hades|ares|artemis|neutral)-v6-')

rarity = {c['id']: (c['raridade'], c['tipo']) for c in load('data/cards.json')['cartas']}
pool = [r['id'].lower() for r in load('data/canon/d268.json')['cards']]
pool += [c['id'] for c in load('card-forge/art-web/cards.json')['cartas'] if PREVIEW.match(c['id'])]
booster = {}
for cid in pool:
    r, tipo = rarity[cid]
    if tipo not in ('God', 'Domain'):
        booster.setdefault(r, []).append(cid)

starters = load('data/alpha-0.1/decks-starters.json')['decks']
starter = {}
for deck in starters:
    for e in deck['main_deck']:
        starter[e['card_id']] = min(3, starter.get(e['card_id'], 0) + e['quantity'])
assert all(cid in sum(booster.values(), []) for cid in starter), 'deck inicial com carta fora do catálogo'

out = {'booster': {k: sorted(v) for k, v in sorted(booster.items())}, 'starter': dict(sorted(starter.items()))}
(ROOT / 'sanctuary-api/catalog.json').write_text(json.dumps(out, indent=1) + '\n')
print({k: len(v) for k, v in out['booster'].items()}, 'starter', len(starter), 'cartas,', sum(starter.values()), 'cópias')
