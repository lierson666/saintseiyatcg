#!/usr/bin/env python3
"""Transcreve na própria máquina as falas PT da biblioteca que ainda não têm texto; pode parar e continuar.

Uso: uv run --no-project --with mlx-whisper python tools/rea-ps3/transcrever-sons.py [--falas MUSIC/fx/ps3-voz-falas.json] [--limite N]
Saída: <biblioteca>/falas-pt.json (banco -> fala -> texto) e transcricao-falhas.json. Nenhum áudio sai do computador.
Gritos com menos de 1 s ficam de fora: dizem pouco e o modelo inventa texto para eles.
"""
import argparse, json, os, re, sys, time

ORDEM = ['voz-golpe', 'voz-batalha', 'voz-narracao', 'voz-historia']
MODELO = 'mlx-community/whisper-large-v3-turbo'
DICA = 'Seiya, Shiryu, Hyoga, Shun, Ikki, Athena, Pégaso, Dragão, Cisne, Andrômeda, Fênix, cavaleiro de ouro, armadura, cosmo, Santuário, Poseidon, Hades, Saga, Shaka, Aiolia, Camus, Milo.'


def limpar(result):
    """Texto aproveitável de um resultado do Whisper, ou None para silêncio e alucinação."""
    segs = result.get('segments') or []
    text = re.sub(r'\s+', ' ', result.get('text') or '').strip()
    if not text or not segs or not re.search(r'[A-Za-zÀ-ÿ]', text):
        return None
    if all(s.get('no_speech_prob', 0) > .8 for s in segs) or any(s.get('compression_ratio', 0) > 2.4 for s in segs):
        return None
    if re.search(r'[぀-ヿ㐀-鿿]', text) or text.lower() in DICA.lower():  # outro idioma ou eco da dica
        return None
    return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--biblioteca', default=os.path.expanduser('~/worktrees/sstcg-biblioteca-sons'))
    ap.add_argument('--falas', help='texto já pronto, que não é refeito')
    ap.add_argument('--limite', type=int)
    args = ap.parse_args()
    out, bad = os.path.join(args.biblioteca, 'falas-pt.json'), os.path.join(args.biblioteca, 'transcricao-falhas.json')
    falas = json.load(open(args.falas, encoding='utf-8')) if args.falas and os.path.exists(args.falas) else {}
    if os.path.exists(out):
        for bank, lines in json.load(open(out, encoding='utf-8')).items():
            falas.setdefault(bank, {}).update(lines)
    falhas = json.load(open(bad, encoding='utf-8')) if os.path.exists(bad) else {}
    sons = json.load(open(os.path.join(args.biblioteca, 'indice.json'), encoding='utf-8'))['sons']
    todo = []
    for sec in ORDEM:
        for id_, secao, _, _, _, secs, langs, _ in sons:
            bank, fala = id_.split('/')
            if secao == sec and secs >= 1 and 'pt' in langs and fala not in falas.get(bank, {}) and id_ not in falhas:
                todo.append(id_)
    todo = todo[:args.limite]
    print(f'{len(todo)} falas a transcrever', flush=True)

    import mlx_whisper  # só aqui: o resto do arquivo roda sem o pacote (tools/test-biblioteca-sons.py)

    def save():
        for path, data in ((out, falas), (bad, falhas)):
            with open(path + '.tmp', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)
            os.replace(path + '.tmp', path)

    start = time.time()
    for n, id_ in enumerate(todo, 1):
        bank, fala = id_.split('/')
        try:
            text = limpar(mlx_whisper.transcribe(os.path.join(args.biblioteca, 'pt', f'{id_}.mp3'), path_or_hf_repo=MODELO, language='pt',
                                                 initial_prompt=DICA, condition_on_previous_text=False, temperature=0))
        except Exception as error:
            falhas[id_] = repr(error)[:200]
            continue
        if text:
            falas.setdefault(bank, {})[fala] = text
        else:
            falhas[id_] = 'sem fala reconhecida'
        if n % 50 == 0 or n == len(todo):
            save()
            print(f'{n}/{len(todo)} · {(time.time() - start) / n:.2f} s por fala · {len(falhas)} sem texto', flush=True)
    save()
    print(f'fim: {sum(len(v) for v in falas.values())} falas com texto, {len(falhas)} sem texto')


if __name__ == '__main__':
    sys.exit(main())
