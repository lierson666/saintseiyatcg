#!/usr/bin/env python3
"""Lista final de keywords (guia Cap. IX, autor 01/11/2026): gera o diff das cartas e, com --apply, grava.
Sem argumento: só escreve docs/keywords-2026-11-01/cards.diff.md. data/cards.json exige diff aprovado (CLAUDE.md)."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

NIMBLE = ['athena-v6-073', 'athena-v6-023', 'hades-v6-207', 'hades-v6-203', 'ares-v6-344', 'ares-v6-343', 'neutral-v6-471', 'neutral-v6-472']
LONG_RANGE = ['artemis-v6-393', 'artemis-v6-388', 'artemis-v6-406', 'artemis-v6-435']
AFTERLIFE = {
    'hades-v6-220': ('{1}{C}', 'Your God gains {1}{S}.', 'Seu Deus ganha {1}{S}.'),
    'hades-v6-217': ('{2}{C}', 'Target enemy God loses {1}{S}.', 'O Deus inimigo alvo perde {1}{S}.'),
    'hades-v6-215': ('{2}{C}', 'Target enemy Devotee gets -2 ATK until the end of the round.', 'O Devoto inimigo alvo recebe -2 ATQ até o fim da rodada.'),
    'hades-v6-216': ('{2}{C}', 'Target enemy Devotee becomes Unprepared.', 'O Devoto inimigo alvo fica Despreparado.'),
    'hades-v6-214': ('{3}{C}', 'Deal 2 damage to target enemy Devotee.', 'Cause 2 de dano ao Devoto inimigo alvo.'),
    'hades-v6-221': ('{3}{C}', 'Return another target Devotee with cost 2 or less from your Tartarus to your hand.', 'Devolva outro Devoto alvo de custo 2 ou menos do seu Tártaro para a sua mão.'),
    'ares-v6-293': ('{1}{C}', 'Deal 1 damage to target enemy Devotee.', 'Cause 1 de dano ao Devoto inimigo alvo.'),
    'ares-v6-301': ('{2}{C}', 'Deal 2 damage to target enemy Devotee.', 'Cause 2 de dano ao Devoto inimigo alvo.'),
    'ares-v6-303': ('{2}{C}', 'Target friendly Devotee gets +2 ATK until the end of the round.', 'O Devoto aliado alvo recebe +2 ATQ até o fim da rodada.'),
}
PT = {'Nimble': 'Ágil', 'Long Range': 'Longo Alcance'}

def main():
    path = ROOT / 'data/cards.json'
    raw = path.read_text(encoding='utf8')
    data = json.loads(raw)
    cards = data if isinstance(data, list) else data.get('cards', data.get('cartas'))
    by = {c['id']: c for c in cards}
    lines = ['# Diff das cartas: lista final de keywords (01/11/2026)', '', 'Gerado por `tools/apply-keywords-2026-11-01.py`. Nada muda em custo, ATQ ou PV.', '']
    def show(c, en, pt):
        lines.extend([f"- **{c['id']} {c.get('nome_exibicao_en')}** (custo {c.get('custo')}, {c.get('power')}/{c.get('vida')}): + `{en}` | PT: `{pt}`"])
    for title, ids, kw in (('Ganham Nimble (Ágil)', NIMBLE, 'Nimble'), ('Ganham Long Range', LONG_RANGE, 'Long Range')):
        lines += [f'## {title}', '']
        for i in ids:
            c = by[i]; assert kw not in (c.get('keywords_en') or []), i
            c['keywords_en'] = [kw, *(c.get('keywords_en') or [])]
            c['habilidades_en'] = [kw, *(c.get('habilidades_en') or [])]
            if c.get('habilidades_pt') is not None: c['habilidades_pt'] = [PT[kw], *c['habilidades_pt']]
            show(c, kw, PT[kw])
        lines.append('')
    lines += ['## Ganham Afterlife', '']
    for i, (cost, en, pt) in AFTERLIFE.items():
        c = by[i]
        l_en, l_pt = f'Afterlife {cost}: {en}', f'Além-Túmulo {cost}: {pt}'
        c['habilidades_en'] = [*(c.get('habilidades_en') or []), l_en]
        if c.get('habilidades_pt') is not None: c['habilidades_pt'] = [*c['habilidades_pt'], l_pt]
        show(c, l_en, l_pt)
    god = by['athena-v6-019']
    god['habilidades_en'] = [h.replace('Cheater', 'Nimble') for h in god['habilidades_en']]
    if god.get('habilidades_pt'): god['habilidades_pt'] = [h.replace('Trapaceiro', 'Ágil') for h in god['habilidades_pt']]
    lines += ['', '## Troca de texto', '', '- **athena-v6-019 PEGASUS GOD CLOTH (KAMUI)**: `Equipped Devotee has Cheater.` vira `Equipped Devotee has Nimble.`. O D268 fica congelado; `shared/canon-cards.js` lê o bônus como Nimble.', '']
    out = ROOT / 'docs/keywords-2026-11-01/cards.diff.md'
    out.write_text('\n'.join(lines), encoding='utf8')
    if '--apply' not in sys.argv:
        print(f'diff em {out}; nada gravado'); return
    sys.path.insert(0, str(ROOT / 'card-forge'))
    from serve import upsert_card  # mesmo formatador do Forge: só o bloco de cada carta muda
    text = raw
    for i in [*NIMBLE, *LONG_RANGE, *AFTERLIFE, 'athena-v6-019']:
        text = upsert_card(text, by[i])
    path.write_text(text, encoding='utf8')
    print('gravado: data/cards.json')

main()
