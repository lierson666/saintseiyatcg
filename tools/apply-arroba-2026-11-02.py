#!/usr/bin/env python3
"""Marca com @ as keywords e os atributos citados no texto das cartas (autor, 02/11/2026).

Só @ puxa keyword e símbolo; sem @ é texto comum. Sem --write só gera o relatório.
Fica sem @: nome de habilidade no título, nome de carta, linha só de keywords e termo com outra palavra em maiúscula ao lado ("Lunar Guardian").
Uso: python3 tools/apply-arroba-2026-11-02.py RELATORIO.md [--write]
"""
import collections, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CARDS = ROOT / 'data/cards.json'
WORDS = ['Long Range', 'Longo Alcance', 'Hidden Cosmo', 'Cosmo Oculto', 'Guardian', 'Guardião', 'Nimble', 'Ágil', 'Pierce', 'Perfurar', 'Impulse', 'Impulso',
         'Sealed', 'Selado', 'Seal', 'Selo', 'Afterlife', 'Além-Túmulo', 'Training', 'Treinamento', 'Immune', 'Imune']
LETTER = r'[^\W\d_]'
KEYWORD = re.compile(rf'(?<!{LETTER})(?<!@)({"|".join(WORDS)})(?!{LETTER})', re.I)
STAT = re.compile(rf'(?<!{LETTER})(?<!@)(ATK|ATQ|HP|PV)(?!{LETTER})|(?<=\d )(Power|Poder)(?!{LETTER})')
ONLY_KEYWORDS = re.compile(r'(?:(?:Long Range|Longo Alcance|Guardian|Guardião|Nimble|Ágil|Pierce|Perfurar|Impulse|Impulso)[,.\s]*)+', re.I)
HEADING = re.compile(r'^[^.:—\n]{1,50}?(?:\s—\s|:)')
TEXT_FIELD = re.compile(r'^(habilidades?|habilidade_awaken|ultimate)_(en|pt)$')
NOT_A_NAME = {'Devotee', 'Devotees', 'Devoto', 'Devotos', 'Strike', 'Golpe', 'God', 'Deus', 'ATK', 'HP', 'ATQ', 'PV'}


def reason(text, start, end, names):
    heading = HEADING.match(text)
    if heading and end <= heading.end():
        return 'título de habilidade'
    if any(a <= start and end <= b for a, b in names):
        return 'nome de carta'
    if text[start].islower():
        return 'minúscula'
    before, after = text[:start].rstrip(), text[end:]
    if after.startswith(' ') and after[1:2].isupper() and not re.match(r' (?:When|If|Once)\b', after):
        return 'parte de um nome'
    word = re.search(rf'({LETTER}+)[\s’\']*$', text[:start])
    if word and before and before[-1] not in '.:;!?(—\n' and word[1][0].isupper() and word[1] not in NOT_A_NAME:
        return 'parte de um nome'
    return None


def mark(text, names_re, skipped):
    if ONLY_KEYWORDS.fullmatch(text.strip()) or re.match(r'^(Hidden Cosmo|Cosmo Oculto)\s*\{[^}]*\}\s*$', text):
        return text
    names = [m.span() for m in names_re.finditer(text)]
    spots = []
    for m in KEYWORD.finditer(text):
        why = reason(text, *m.span(), names)
        if why:
            skipped[why][text[max(0, m.start() - 30):m.end() + 24].replace('\n', ' / ')] += 1
        else:
            spots.append(m.start())
    spots += [m.start() for m in STAT.finditer(text)]
    for at in sorted(spots, reverse=True):
        text = f'{text[:at]}@{text[at:]}'
    return text


def walk(node, names_re, skipped, changes, card):
    for key, value in (node.items() if isinstance(node, dict) else enumerate(node)):
        if isinstance(key, str) and TEXT_FIELD.match(key) and value:
            texts = value if isinstance(value, list) else [value]
            new = [mark(t, names_re, skipped) for t in texts]
            for old, now in zip(texts, new):
                if old != now:
                    changes.append((card, key, old, now))
            node[key] = new if isinstance(value, list) else new[0]
        elif isinstance(value, (dict, list)):
            walk(value, names_re, skipped, changes, card)


def main():
    raw = CARDS.read_text(encoding='utf8')
    data = json.loads(raw)
    names = sorted({c[k] for c in data['cartas'] for k in ('nome_exibicao_en', 'nome_exibicao_pt') if c.get(k)}, key=len, reverse=True)
    names_re = re.compile('|'.join(map(re.escape, names)), re.I)
    skipped, changes = collections.defaultdict(collections.Counter), []
    for card in data['cartas']:
        walk(card, names_re, skipped, changes, card['id'])
    out = raw
    for old, now in {(c[2], c[3]) for c in changes}:
        encoded = json.dumps(old, ensure_ascii=False)
        assert encoded in out, old
        out = out.replace(encoded, json.dumps(now, ensure_ascii=False))
    assert json.loads(out) == data, 'a troca no texto bruto não bate com os dados'
    lines = [f'# Diff de @ em cards.json', '', f'{len(changes)} textos em {len({c[0] for c in changes})} cartas.', '', '## Ficou sem @']
    for why, found in skipped.items():
        lines += ['', f'### {why} ({sum(found.values())})', *[f'- `{c}`' for c in found]]
    lines += ['', '## Trocas']
    for card, key, old, now in changes:
        lines += ['', f'**{card}** `{key}`', f'- antes: {old}', f'- depois: {now}']
    pathlib.Path(sys.argv[1]).write_text('\n'.join(lines) + '\n', encoding='utf8')
    pathlib.Path(sys.argv[1]).with_suffix('.json').write_text(out, encoding='utf8')
    if '--write' in sys.argv:
        CARDS.write_text(out, encoding='utf8')
    print(len(changes), 'textos', len({c[0] for c in changes}), 'cartas', {k: sum(v.values()) for k, v in skipped.items()})


if __name__ == '__main__':
    main()
