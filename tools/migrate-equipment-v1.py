#!/usr/bin/env python3
"""Equipment System V1: migra subtipos e patente em data/cards.json a partir de uma tabela explícita.

Nunca deduz pelo nome. Sem --apply só mostra o diff. Só mexe nas linhas "subtipos" e "patente_armadura"
das cartas da tabela, mantendo o resto do arquivo byte a byte. Rodar de novo não muda nada.

  python3 tools/migrate-equipment-v1.py                  # diff das propostas firmes
  python3 tools/migrate-equipment-v1.py --apply          # grava só as firmes
  python3 tools/migrate-equipment-v1.py --apply --incluir-revisao
  python3 tools/migrate-equipment-v1.py --reverter       # volta ao "antes" da tabela
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / 'data' / 'cards.json'
TABLE = ROOT / 'tools' / 'equipment-migration-v1.json'


def card_span(text, card_id):
    start = text.index(f'"id": "{card_id}"')
    next_card = text.find('\n    },', start)
    return start, next_card if next_card > 0 else len(text)


def set_fields(text, card_id, subtipos, patente):
    start, end = card_span(text, card_id)
    body = text[start:end]
    new_list = json.dumps(subtipos, ensure_ascii=False)
    body, n = re.subn(r'"subtipos": \[[^\]]*\]', lambda _: f'"subtipos": {new_list}', body, count=1)
    if n != 1:
        raise SystemExit(f'{card_id}: campo subtipos não encontrado')
    body = re.sub(r'\n\s*"patente_armadura": "[^"]*",', '', body)
    if patente:
        body = re.sub(r'(\n(\s*)"subtipos": \[[^\]]*\],)', lambda m: f'{m.group(1)}\n{m.group(2)}"patente_armadura": "{patente}",', body, count=1)
    return text[:start] + body + text[end:]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--incluir-revisao', action='store_true')
    parser.add_argument('--reverter', action='store_true')
    args = parser.parse_args()
    table = json.loads(TABLE.read_text(encoding='utf-8'))
    text = CARDS.read_text(encoding='utf-8')
    cards = {c['id']: c for c in json.loads(text)['cartas']}
    changes, skipped, conflicts = [], [], []
    for card_id, row in table['cartas'].items():
        card = cards[card_id]
        if args.reverter:
            target, rank = row['antes'], None
        elif row.get('revisao') and not args.incluir_revisao:
            skipped.append(card_id)
            continue
        else:
            target, rank = row['subtipos'], row.get('patente')
        current = card['subtipos']
        if current != row['antes'] and current != row['subtipos']:
            conflicts.append(f"{card_id}: esperava {row['antes']}, está {current}")
            continue
        if current != target or card.get('patente_armadura') != rank:
            changes.append((card_id, current, target, rank))
            text = set_fields(text, card_id, target, rank)
    for card_id, before, after, rank in changes:
        print(f"{card_id}: {before} -> {after}{f' | patente {rank}' if rank else ''}")
    print(f'{len(changes)} a mudar · {len(skipped)} em revisão fora · {len(conflicts)} em conflito')
    for line in conflicts:
        print('CONFLITO', line)
    if conflicts and args.apply:
        raise SystemExit('Nada gravado: resolva os conflitos antes.')
    json.loads(text)  # o texto editado continua sendo JSON válido
    if args.apply or args.reverter:
        CARDS.write_text(text, encoding='utf-8')
        print('gravado em data/cards.json')


if __name__ == '__main__':
    main()
