#!/usr/bin/env python3
"""Aplica o rascunho PT-BR (docs/traducao-pt/<facção>.json) nos campos *_pt das cartas.

Uso:
  tools/apply-pt.py                 mostra o diff para data/cards.json (não grava)
  tools/apply-pt.py --write         grava em data/cards.json (só depois da aprovação do autor; CLAUDE.md)
  tools/apply-pt.py --art-web       grava só em card-forge/art-web/cards.json (prévia local, fora do git)
Chaves do rascunho: n nome, s subtítulo, t tagline (= s se ausente), h habilidades, a Awaken, u Ultimate, f flavour.
auto_equip_pt sai de docs/traducao-pt/nomes-pt.json a partir de auto_equip_en.
"""
import difflib, importlib.util, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DRAFTS = sorted(p for p in (ROOT / 'docs/traducao-pt').glob('*.json') if p.name != 'nomes-pt.json')
NAMES = {k: v for k, v in json.loads((ROOT / 'docs/traducao-pt/nomes-pt.json').read_text()).items() if not k.startswith('_')}
KEYS = {'n': 'nome_exibicao_pt', 's': 'subtitulo_pt', 't': 'tagline_pt', 'h': 'habilidades_pt', 'a': 'habilidade_awaken_pt', 'u': 'ultimate_pt', 'f': 'flavour_pt'}


def fields(entry):
    out = {KEYS[k]: v for k, v in entry.items() if k in KEYS}
    if 's' in entry and 't' not in entry:
        out['tagline_pt'] = entry['s']
    return out


def apply(cards):
    draft = {}
    for p in DRAFTS:
        draft.update({k: v for k, v in json.loads(p.read_text()).items() if not k.startswith('_')})
    seen = set()
    for c in cards:
        if c['id'] in draft:
            c.update(fields(draft[c['id']]))
            seen.add(c['id'])
            auto = c.get('auto_equip_en')
            names = auto if isinstance(auto, list) else [auto] if auto else []
            if names:
                c['auto_equip_pt'] = [NAMES.get(n, n) for n in names]
    missing = sorted(set(draft) - seen)
    if missing:
        sys.exit(f'ids do rascunho sem carta: {missing}')
    return len(seen)


def forge():
    spec = importlib.util.spec_from_file_location('forge_serve', ROOT / 'card-forge/serve.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    art = '--art-web' in sys.argv
    target = ROOT / ('card-forge/art-web/cards.json' if art else 'data/cards.json')
    before = target.read_text()
    data = json.loads(before)
    n = apply(data['cartas'])
    if art:  # export compacto (tools/forge-art-web.sh)
        after = json.dumps(data, ensure_ascii=False)
    else:  # mesmo formatador do Card Forge: só o bloco de cada carta muda
        upsert, after = forge().upsert_card, before
        for c in data['cartas']:
            if any(k.endswith('_pt') and k not in ('nome_interno_pt', 'notas_pt') for k in c):
                after = upsert(after, c)
    if '--write' in sys.argv or '--art-web' in sys.argv:
        target.write_text(after)
        print(f'{target.relative_to(ROOT)}: {n} cartas com campos *_pt')
    else:
        sys.stdout.writelines(difflib.unified_diff(before.splitlines(True), after.splitlines(True), 'a/data/cards.json', 'b/data/cards.json', n=1))
        print(f'\n# {n} cartas; nada gravado (use --write depois da aprovação)', file=sys.stderr)


if __name__ == '__main__':
    main()
