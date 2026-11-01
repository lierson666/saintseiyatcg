#!/usr/bin/env python3
"""Registro canônico (docs/platform-4.0.md): deriva cartas e regras de data/cards.json e docs/guia-do-jogo.md.

Nada aqui é fonte: o guia e o cards.json continuam mandando, e o motor continua sendo quem executa a regra.
Cada versão é imutável e endereçada pelo conteúdo (rules-<hash>.json, cards-<hash>.json); index.json aponta a atual.
  build-registry.py          grava a versão atual
  build-registry.py --check  falha se o registro não bate com as fontes
"""
import argparse, hashlib, json, re, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLICATION = {'design-ready': 'playtest', 'needs-review': 'review', 'cortado': 'cut'}
SECTION_RE = re.compile(r'^### ([0-9]+[A-Z]?(?:[–-][0-9]+)?)\. (.+)$')
UNRESOLVED_RE = re.compile(r'reservado|suspens|pendente', re.I)


def digest(obj):
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]


def card_record(c):
    # Só renomeia o que já existe: campo sem dado fica null, e notas internas (notas_pt) não saem daqui.
    return {
        'id': c['id'], 'number': c.get('numero_carta'), 'name': c.get('nome_exibicao_en'), 'name_pt': c.get('nome_exibicao_pt') or None,
        'tagline': c.get('tagline_en') or None, 'edition': c.get('edicao') or 'DOC', 'set': c.get('conjunto'), 'faction': c.get('faccao'), 'type': c.get('tipo'),
        'subtypes': c.get('subtipos') or [], 'rarity': c.get('raridade'), 'cost': c.get('custo'), 'cost_unit': c.get('unidade_custo'),
        'equip_cost': c.get('equipar_custo'), 'attack': c.get('power') if c.get('power') is not None else c.get('attack'),
        'hp': c.get('vida'), 'resistance': c.get('resistance'), 'soul': c.get('soul'), 'awaken': c.get('awaken'),
        'cosmoble': c.get('cosmoble'), 'keywords': c.get('keywords_en') or [], 'abilities': c.get('habilidades_en') or [],
        'abilities_pt': c.get('habilidades_pt') or [], 'awaken_text': c.get('habilidade_awaken_en') or None,
        'ultimate': c.get('ultimate_en') or None, 'flavour_pt': c.get('flavour_pt') or None,
        'publication': PUBLICATION.get(c.get('status'), 'review'), 'legality': None,
    }


def parse_rules(text):
    rules, chapter, current = [], None, None
    for line in text.splitlines():
        if line.startswith('## '):
            chapter, current = line[3:].strip(), None
            continue
        m = SECTION_RE.match(line)
        if m:
            current = {'id': 'R-' + m[1].replace('–', '-'), 'number': m[1], 'title': m[2].strip(), 'chapter': chapter, 'body': []}
            rules.append(current)
        elif line.startswith('### '):
            current = None
        elif current is not None:
            current['body'].append(line)
    for r in rules:
        r['body'] = '\n'.join(r['body']).strip()
        r['status'] = 'review' if UNRESOLVED_RE.search(r['title'] + ' ' + r['body'][:200]) else 'published'
    return rules


def link_rules_to_cards(rules, cards):
    for r in rules:
        title = r['title'].lower()
        r['cards'] = [c['id'] for c in cards if any(k.lower() == title for k in c['keywords'])]


def parse_glossary(text):
    rows = []
    for line in text.splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if line.startswith('|') and len(cells) >= 2 and cells[0] not in ('EN', '') and not set(cells[0]) <= set('- '):
            rows.append({'en': cells[0], 'pt': cells[1], 'note': cells[2] if len(cells) > 2 else ''})
    return rows


def build(cards_path, guide_path):
    source = json.loads(Path(cards_path).read_text())
    cards = [card_record(c) for c in source['cartas']]
    rules = parse_rules(Path(guide_path).read_text())
    link_rules_to_cards(rules, cards)
    return cards, rules, {'catalog_version': source.get('versao_catalogo'), 'set_name': source.get('nome_set')}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--cards', default=ROOT / 'data/cards.json')
    ap.add_argument('--guide', default=ROOT / 'docs/guia-do-jogo.md')
    ap.add_argument('--out', default=ROOT / 'data/registry')
    a = ap.parse_args()
    cards, rules, meta = build(a.cards, a.guide)
    current = {'rules': digest(rules), 'catalog': digest(cards), **meta}
    out, index_path = Path(a.out), Path(a.out) / 'index.json'
    index = json.loads(index_path.read_text()) if index_path.exists() else {'current': None, 'history': []}
    if a.check:
        ok = index['current'] and all(index['current'].get(k) == current[k] for k in ('rules', 'catalog'))
        if not ok or not (out / f'cards-{current["catalog"]}.json').exists() or not (out / f'rules-{current["rules"]}.json').exists():
            print(f'registro fora de sincronia: fontes {current["rules"]}/{current["catalog"]}', file=sys.stderr)
            sys.exit(1)
        print(f'registro em dia: regras {current["rules"]}, cartas {current["catalog"]}')
        return
    out.mkdir(parents=True, exist_ok=True)
    (out / 'glossary.json').write_text(json.dumps(parse_glossary((ROOT / 'docs/glossario-pt-br.md').read_text()), ensure_ascii=False, indent=0) + '\n')
    for name, payload in ((f'cards-{current["catalog"]}.json', cards), (f'rules-{current["rules"]}.json', rules)):
        if not (out / name).exists():  # versão publicada nunca é reescrita
            (out / name).write_text(json.dumps(payload, ensure_ascii=False, indent=0) + '\n')
    if not index['current'] or (index['current']['rules'], index['current']['catalog']) != (current['rules'], current['catalog']):
        index['history'].append({'rules': current['rules'], 'catalog': current['catalog'], 'at': int(time.time())})
    index['current'] = current
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
    print(f'registro: {len(rules)} regras {current["rules"]}, {len(cards)} cartas {current["catalog"]}')


if __name__ == '__main__':
    main()
