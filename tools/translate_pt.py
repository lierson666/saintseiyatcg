#!/usr/bin/env python3
"""Tradução automática EN → PT-BR de uma carta (autor, 31/10/2026: o inglês é a base; o PT sai dele).

Usa a API da Claude com o glossário aprovado (docs/glossario-pt-br.md), os nomes da dublagem
(docs/traducao-pt/nomes-pt.json) e cartas de Athena já aprovadas como exemplo de estilo.
Chave: variável de ambiente ANTHROPIC_API_KEY (nunca gravada no projeto).

Uso pelo Card Forge: POST /api/translate {card} (card-forge/serve.py).
Uso direto:  ANTHROPIC_API_KEY=... python3 tools/translate_pt.py athena-v6-001
"""
import json, os, pathlib, re, sys, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL = 'claude-sonnet-5-5'
SYMBOL = re.compile(r'\{[^}]*\}')
KEYS = {'n': 'nome_exibicao_pt', 's': 'subtitulo_pt', 'h': 'habilidades_pt', 'a': 'habilidade_awaken_pt', 'u': 'ultimate_pt', 'f': 'flavour_pt'}


class TranslateError(Exception):
    pass


def names():
    return {k: v for k, v in json.loads((ROOT / 'docs/traducao-pt/nomes-pt.json').read_text()).items() if not k.startswith('_')}


def source(card):
    """Campos EN que viram PT (o subtítulo e o flavour podem vir do projeto visual do Forge)."""
    out = {'n': card.get('nome_exibicao_en'), 's': card.get('tagline_en') or card.get('subtitulo_en'),
           'h': card.get('habilidades_en') or [], 'a': card.get('habilidade_awaken_en'), 'u': card.get('ultimate_en'),
           'f': card.get('flavour_en') or card.get('flavour')}
    return {k: v for k, v in out.items() if v}


def examples():
    """Cartas de Athena aprovadas pelo autor: um Deus, um Devoto, um Equipamento com Ressonância e uma Técnica."""
    cards = [c for c in json.loads((ROOT / 'data/cards.json').read_text())['cartas'] if c['id'].startswith('athena') and c.get('habilidades_pt')]
    picks = [next((c for c in cards if test(c)), None) for test in (
        lambda c: c['tipo'] == 'God', lambda c: c['tipo'] == 'Devotee' and len(c.get('habilidades_en') or []) > 1,
        lambda c: c.get('auto_equip_en'), lambda c: c['tipo'] in ('Technique', 'Spell'))]
    def pt(c):
        return {k: c.get(v) for k, v in KEYS.items() if c.get(v)}
    return [{'en': source(c), 'pt': pt(c)} for c in picks if c]


def prompt(card):
    glossary = (ROOT / 'docs/glossario-pt-br.md').read_text()
    return f"""Você traduz cartas do Saint Seiya TCG do inglês para o português do Brasil, no estilo da dublagem clássica de "Os Cavaleiros do Zodíaco".

GLOSSÁRIO APROVADO (use exatamente estes termos):
{glossary}

NOMES DE PERSONAGENS (EN → PT):
{json.dumps(names(), ensure_ascii=False)}

EXEMPLOS APROVADOS (copie o estilo e as frases-padrão):
{json.dumps(examples(), ensure_ascii=False)}

REGRAS DURAS (o jogo lê o texto):
- Mantenha cada símbolo exatamente: {{1}}{{C}}, {{2}}{{L}}, {{1}}{{S}}, {{T}}, {{B}}, @ATK, @HP. Mantenha números e quebras de linha.
- Mantenha o @ antes de keyword traduzida: @Guardian vira @Guardião. Palavra sem @ continua sem @.
- Mantenha a estrutura "Nome da habilidade — texto" (travessão com espaços); traduza o nome da habilidade.
- "Resonance — Nome: texto" vira "Ressonância — <nome PT>: texto". "Cost:" vira "Custo:". "Divine Power" → "Poder Divino", "Awaken N" → "Despertar N", "Ultimate" → "Supremo".
- "+1 ATK / +2 HP" → "+1 ATQ / +2 PV"; "Equipped Devotee gets +X ATK / +Y HP." → "O Devoto equipado recebe +X ATQ / +Y PV."
- Linha que é só keyword vira só a keyword em PT. Nomes em MAIÚSCULAS continuam em MAIÚSCULAS.
- Não mude o sentido de jogo nem invente regra. "h" tem o mesmo número de itens do inglês.

Traduza a carta abaixo. Responda SÓ com um objeto JSON com as mesmas chaves do inglês (n, s, h, a, u, f) e mais "nomes": {{"<nome EN>": "<nome PT>"}} para cada personagem citado que não esteja na lista de nomes.

{json.dumps(source(card), ensure_ascii=False)}"""


def call(text, key):
    body = json.dumps({'model': MODEL, 'max_tokens': 4000, 'messages': [{'role': 'user', 'content': text}]}).encode()
    req = urllib.request.Request('https://api.anthropic.com/v1/messages', body, {
        'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        raise TranslateError(f'API da Claude respondeu {e.code}: {e.read().decode(errors="replace")[:300]}')
    except urllib.error.URLError as e:
        raise TranslateError(f'Sem conexão com a API da Claude: {e.reason}')
    out = ''.join(b.get('text', '') for b in data.get('content', []))
    m = re.search(r'\{.*\}', out, re.S)
    if not m:
        raise TranslateError('A resposta da IA não trouxe JSON.')
    return json.loads(m.group(0))


def check(en, pt):
    """Avisos para o autor revisar: símbolos e número de habilidades iguais ao inglês."""
    warn = []
    eh, ph = en.get('h') or [], pt.get('h') or []
    if len(eh) != len(ph):
        warn.append(f'Habilidades: {len(eh)} em EN, {len(ph)} em PT.')
    for k in ('h', 'a', 'u'):
        a, b = (v.get(k) or ([] if k == 'h' else '') for v in (en, pt))
        for i, (x, y) in enumerate(zip(a if k == 'h' else [a], b if k == 'h' else [b])):
            if SYMBOL.findall(x) != SYMBOL.findall(y):
                warn.append(f'Símbolos diferentes em {k}{i + 1 if k == "h" else ""}.')
    return warn


def translate(card, key=None):
    key = key or os.environ.get('ANTHROPIC_API_KEY')
    if not key:
        raise TranslateError('Falta a chave: inicie o Forge com ANTHROPIC_API_KEY=... python3 card-forge/serve.py')
    en = source(card)
    pt = call(prompt(card), key)
    fields = {KEYS[k]: pt[k] for k in KEYS if pt.get(k)}
    if 'subtitulo_pt' in fields:
        fields['tagline_pt'] = fields['subtitulo_pt']
    auto = card.get('auto_equip_en') or []
    if auto:
        known = {**names(), **(pt.get('nomes') or {})}
        fields['auto_equip_pt'] = [known.get(n, n) for n in auto]
    return {'campos': fields, 'nomes': pt.get('nomes') or {}, 'avisos': check(en, pt)}


if __name__ == '__main__':
    card = next(c for c in json.loads((ROOT / 'data/cards.json').read_text())['cartas'] if c['id'] == sys.argv[1])
    print(json.dumps(translate(card), ensure_ascii=False, indent=2))
