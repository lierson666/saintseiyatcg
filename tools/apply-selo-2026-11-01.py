#!/usr/bin/env python3
# Explica nas cartas que preparar um Devotee com Seal tira 1 marcador (§48, autor, 01/11/2026).
#   sem argumento: só gera docs/selo-2026-11-01/cards.diff.md
#   --write: grava em data/cards.json (só com o diff aprovado pelo autor)
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
ONE = (' (With a Seal counter, remove one instead.)', ' (Com marcador de Selo, tire um em vez disso.)')
MANY = (' (Each one with a Seal counter removes one instead.)', ' (Cada um com marcador de Selo tira um em vez disso.)')
# carta, campo do texto (índice ou ultimate), lembrete. Fora: 019 Kamui, congelada na D268.
ALVOS = [('athena-v6-002', 0, ONE), ('athena-v6-015', 2, ONE), ('athena-v6-023', 2, ONE), ('athena-v6-059', 1, ONE),
         ('athena-v6-074', 1, ONE), ('athena-v6-076', 1, ONE), ('ares-001', 0, ONE), ('ares-001', 'ultimate', MANY),
         ('poseidon-v6-108', 0, ONE), ('ares-v6-271', 2, ONE), ('ares-v6-276', 1, ONE), ('ares-v6-285', 2, ONE),
         ('ares-v6-329', 0, ONE), ('ares-v6-353', 1, MANY), ('artemis-v6-374', 1, ONE)]

def lembra(texto, palavra, nota):
    m = re.search(palavra, texto)
    assert m, (palavra, texto)
    fim = re.search(r'[.](?=\s|$)', texto[m.end():])
    i = m.end() + fim.end()
    return texto[:i] + nota + texto[i:]

path = ROOT / 'data/cards.json'
bruto = path.read_text()
data = json.loads(bruto)
cartas = {c['id']: c for c in data['cartas']}
linhas = ['# Diff das cartas: Prepare em Devotee com Seal (01/11/2026)', '', 'Gerado por `tools/apply-selo-2026-11-01.py`. Só acrescenta o lembrete; custo, ATQ e PV não mudam.', '']
for cid, campo, (en, pt) in ALVOS:
    c = cartas[cid]
    if campo == 'ultimate':
        pares = [('ultimate_en', None, r'Prepare', en), ('ultimate_pt', None, r'Prepare', pt)]
    else:
        pares = [('habilidades_en', campo, r'\bPrepare\b', en), ('habilidades_pt', campo, r'\bPrepar', pt)]
    linhas.append(f"## {cid} {c['nome_exibicao_en']}")
    for chave, i, palavra, nota in pares:
        velho = c[chave] if i is None else c[chave][i]
        novo = lembra(velho, palavra, nota)
        linhas += [f'- `{chave}` antes: {velho!r}', f'- `{chave}` depois: {novo!r}']
        if i is None: c[chave] = novo
        else: c[chave][i] = novo
        # Troca no texto cru: reescrever o JSON inteiro mudaria a formatação do arquivo.
        de, para = json.dumps(velho, ensure_ascii=False), json.dumps(novo, ensure_ascii=False)
        assert bruto.count(de) == 1, (cid, chave)
        bruto = bruto.replace(de, para)
    linhas.append('')
(ROOT / 'docs/selo-2026-11-01/cards.diff.md').write_text('\n'.join(linhas))
if '--write' in sys.argv:
    assert json.loads(bruto) == data
    path.write_text(bruto)
print(len(ALVOS), 'textos')
