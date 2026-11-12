"""ECONOMY FORGE (autor, 11/11/2026): preços, recompensas e chances da economia, editados pelo STAR HILL.

O servidor lê economy.json (versão publicada, ao lado deste arquivo) ao iniciar. Sem arquivo, ou com arquivo inválido,
usa DEFAULTS: os valores aprovados em docs/economia.md. Uma regra só (check) para o editor e para o servidor.
"""
import hashlib
import json
from pathlib import Path

RARITIES = ('Common', 'Uncommon', 'Legendary', 'Divine')

DEFAULTS = {
    'booster_price': 1000,
    'bundles': [{'qty': 1, 'off': 0}, {'qty': 3, 'off': 5}, {'qty': 10, 'off': 10}, {'qty': 25, 'off': 20}],
    'welcome_boosters': 3,
    'cosmetics': {'avatar': 500, 'sleeve': 1500, 'coin': 1000},
    'god_multiplier': 2,
    'set_off': 20,
    'duplicate_coins': {'Common': 25, 'Uncommon': 50, 'Legendary': 200, 'Divine': 500},
    'craft_coins': {'Common': 15, 'Uncommon': 250, 'Legendary': 1750, 'Divine': 2500},
    'win_coins': [250, 100, 100, 100, 100],
    'chronicle_coins': 250,
    'chronicle_boosters': 1,
    'chronicle_boss_boosters': 3,
    'divine_odds': 8,
    'wildcard_odds': {'Common': 3, 'Uncommon': 5, 'Legendary': 24, 'Divine': 60},
    # Pacotes de Cosmo Coins com dinheiro real (Identity & Payment Forge V1.0, autor 11/11/2026). Preço em centavos de real.
    'coin_packs': [{'id': 'bronze', 'name': 'Bronze', 'price_cents': 499, 'coins': 1250},
                   {'id': 'silver', 'name': 'Silver', 'price_cents': 999, 'coins': 2750},
                   {'id': 'gold', 'name': 'Gold', 'price_cents': 1999, 'coins': 6000},
                   {'id': 'saint', 'name': 'Saint', 'price_cents': 3999, 'coins': 13000},
                   {'id': 'divine', 'name': 'Divine', 'price_cents': 7999, 'coins': 28000},
                   {'id': 'olympus', 'name': 'Olympus', 'price_cents': 14999, 'coins': 55000}],
    'coins_per_brl': 250,  # só referência para o autor (R$ ao lado dos preços); o servidor não usa
    'brl_per_usd_cents': 550,  # cotação para o PayPal (autor, 12/11/2026): preço em US$ = preço em R$ convertido; R$5,50 = 550
}

# (grupo, [(caminho, rótulo, mínimo, máximo)]): a tela do Forge e a validação saem daqui.
GROUPS = [
    ('Loja · boosters', [('booster_price', 'Preço do booster', 1, 100000), ('welcome_boosters', 'Boosters de boas-vindas', 0, 50)]
     + [(f'bundles.{i}.{k}', f'Pacote {i + 1} · {"quantidade" if k == "qty" else "desconto %"}', 1 if k == 'qty' else 0, 100 if k == 'qty' else 90)
        for i in range(4) for k in ('qty', 'off')]),
    ('Loja · cosméticos', [('cosmetics.avatar', 'Avatar', 0, 100000), ('cosmetics.sleeve', 'Sleeve', 0, 100000), ('cosmetics.coin', 'Moeda (cara ou coroa)', 0, 100000),
                           ('god_multiplier', 'Multiplicador de Deus', 1, 10), ('set_off', 'Desconto do set avatar + sleeve %', 0, 90)]),
    ('Criar carta com coins', [(f'craft_coins.{r}', r, 1, 100000) for r in RARITIES]),
    ('Cópia extra vira coins', [(f'duplicate_coins.{r}', r, 0, 100000) for r in RARITIES]),
    ('Vitórias online do dia', [(f'win_coins.{i}', f'{i + 1}ª vitória', 0, 10000) for i in range(5)]),
    ('Cosmo Chronicles (1ª vitória da missão)', [('chronicle_coins', 'Coins por missão', 0, 10000), ('chronicle_boosters', 'Boosters por missão', 0, 20),
                                                 ('chronicle_boss_boosters', 'Boosters por missão de chefe', 0, 20)]),
    ('Booster · chances (1 em N pacotes)', [('divine_odds', 'Legendary vira Divine', 1, 1000)]
     + [(f'wildcard_odds.{r}', f'Curinga {r}', 1, 1000) for r in RARITIES]),
    ('Pacotes de Cosmo Coins (dinheiro real; preço em centavos)', [(f'coin_packs.{i}.{k}', f'{n} · {"preço (centavos)" if k == "price_cents" else "coins"}',
                                                                    100 if k == 'price_cents' else 1, 100000 if k == 'price_cents' else 1000000)
                                                                   for i, n in enumerate(('Bronze', 'Silver', 'Gold', 'Saint', 'Divine', 'Olympus')) for k in ('price_cents', 'coins')]),
    ('Referência', [('coins_per_brl', 'Coins por R$1 (só para comparar)', 1, 100000),
                    ('brl_per_usd_cents', 'Cotação do dólar para o PayPal (centavos de R$ por US$1)', 100, 5000)]),
]
FIELDS = [f for _, fields in GROUPS for f in fields]


def get(cfg, path):
    for part in path.split('.'):
        cfg = cfg[int(part)] if isinstance(cfg, list) else cfg[part]
    return cfg


def normalized(cfg):
    """Só as chaves conhecidas, na forma de DEFAULTS (o resto é descartado; o que faltar vem de DEFAULTS)."""
    out = json.loads(json.dumps(DEFAULTS))
    for path, *_ in FIELDS:
        parts, node = path.split('.'), out
        for part in parts[:-1]:
            node = node[int(part)] if isinstance(node, list) else node[part]
        last = parts[-1]
        try:
            node[int(last) if isinstance(node, list) else last] = get(cfg, path)
        except (KeyError, IndexError, TypeError, ValueError):
            pass  # campo novo que a versão publicada ainda não tem: vale o padrão
    return out


def check(cfg):
    errors = []
    if not isinstance(cfg, dict):
        return ['O arquivo de economia não é um objeto.']
    cfg = normalized(cfg)  # campo ausente vale o padrão; só valores presentes e errados contam como erro
    for path, label, lo, hi in FIELDS:
        try:
            v = get(cfg, path)
        except (KeyError, IndexError, TypeError, ValueError):
            errors.append(f'Falta {label} ({path}).')
            continue
        if type(v) is not int or not lo <= v <= hi:
            errors.append(f'{label}: use um número inteiro de {lo} a {hi}.')
    if not errors:
        qty = [b['qty'] for b in cfg['bundles']]
        if qty[0] != 1 or qty != sorted(set(qty)):
            errors.append('Pacotes: o primeiro é de 1 booster e as quantidades crescem sem repetir.')
    return errors


def fingerprint(cfg):
    return hashlib.sha256(json.dumps(normalized(cfg), sort_keys=True).encode()).hexdigest()[:16]


def diff(live, draft):
    if not live:
        return [{'field': p, 'label': label, 'before': None, 'after': get(draft, p)} for p, label, *_ in FIELDS]
    out = []
    for path, label, *_ in FIELDS:
        try:
            before = get(live, path)
        except (KeyError, IndexError, TypeError, ValueError):
            before = None
        try:
            after = get(draft, path)
        except (KeyError, IndexError, TypeError, ValueError):
            after = None
        if before != after:
            out.append({'field': path, 'label': label, 'before': before, 'after': after})
    return out


def load(path):
    """Valores que o servidor usa: o publicado se for válido; senão DEFAULTS."""
    try:
        cfg = json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return normalized(DEFAULTS)
    return normalized(cfg) if not check(cfg) else normalized(DEFAULTS)
