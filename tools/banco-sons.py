#!/usr/bin/env python3
"""Banco de sons de terceiros, separado dos sons do Saint Seiya: converte para MP3 e organiza por tema e tipo.

Uso: tools/banco-sons.py [--so-listar] [--originais PASTA] [--biblioteca PASTA]
Saída: <biblioteca>/banco/SNS/NNNN.mp3, banco/indice.json (seletor) e banco/mapa.json (origem -> id, mantém os ids entre execuções).
Licença da Sonniss: uso no jogo liberado, sem crédito; não distribuir como pacote. Por isso a pasta fica fora do repositório.
"""
import argparse, concurrent.futures, json, os, re, subprocess, sys
from pathlib import Path

FFMPEG = os.path.expanduser('~/.local/bin/ffmpeg')
LIMITE_S = 120  # ambiente de vários minutos não vira efeito de jogo
# A primeira regra que casa decide. Vozes vêm antes: "Warrior" em Anime Fight Voices não é som de guerra.
SECOES = [
    ('vozes', r'^VOX|^HMN|^CRWD|Walla|Crowds|Announcer|AAA Game Character|Anime Fight Voices|Human Effort|Dinosaurs|Dog Vocal|Vox Bestiae|Fake Advertisements'),
    ('hades', r'Haunting|Ghostly|Sinister|Death Whistle|Halloween|Humanoid Creatures|Moaning Metal|\b(horror|evil|demon|ghost|skull|bones?|creepy|vampire|hell|crypt|sinister|macabre|undead)\b|^GORE|^CREAEthr'),
    ('poseidon', r'^WATRImpt|^WATRMisc|Rocky Coast|\b(water(?! polo)|ocean|sea|waves?|splash\w*|underwater|bubbles?|submerge|drown|tide|liquid|river|lake)\b'),
    ('athena', r'Church Bells|Music Boxes|^MAGAngl|\b(holy|angel\w*|heaven\w*|divine|sacred|choir|celestial|bells?|chimes?|shimmer\w*|sparkle\w*|magic light|bright)\b'),
    ('ares', r'Historical Weapons|Melee Weapons|Colossal Impacts|Trailer Booms|Trailer Alarms|Horn Braams|Cinematic Fight|Fireworks|^WEAP|^EXPL|\b(explosions?|sword\w*|blades?|shield|weapons?|cannon|gunshot|blast|boom|battle|war|armor|armour)\b'),
    ('artemis', r'Synthesized Nature|Highlands|Extreme Winds|Chimney Wind|Storms Lakes|^ANML|^AMBTrop|^WIND|\b(forest|birds?|nature|jungle|wolf|owl|crickets|moon|leaves|arrow|bow|night)\b'),
    ('interface', r'\bUI\b|Interface|Hybrid Game|Board Game|Casino Cards|^BEEP|^UI'),
    ('whoosh', r'^WHSH|\b(whoosh\w*|swish|swoosh|transitions?|risers?|sweep)\b|Air Designed'),
    ('impactos', r'Cartoon Impacts|Bass Drops|Ultra Transitions|^FGHT|\b(impacts?|hits?|punch\w*|slam|thud|stomp|crash)\b'),
    ('magia', r'^MAG|Elemental|Emotion and Magic|Fantasy Game|Tower Defense|Designed Ice|Rich Glitch|Anime Game|\b(magic|spell|energy|ice|glitch|arc)\b'),
    ('ambiente', r'^AMB|Ambienc|Ambient|Storm|City Rain|Urban Life|Public Spaces|Drones|\b(rain|thunder|drone|loop)\b'),
]
TIPOS = [
    ('Explosão', r'explosion|blast|boom|firework'), ('Impacto', r'impact|\bhit|punch|slam|thud|stomp|crash|braam'), ('Whoosh', r'whoosh|swish|swoosh|riser|transition|sweep'),
    ('Arma e metal', r'sword|blade|shield|weapon|armor|armour|metal|gun'), ('Água', r'water|splash|bubble|underwater|ocean|wave|liquid|ship'), ('Gelo', r'\bice\b|freeze'), ('Fogo', r'fire|flame|campfire|bonfire'),
    ('Vento', r'wind|storm|thunder|rain'), ('Magia', r'magic|spell|energy|enchant|potion|skill'), ('Voz', r'^vox|voice|^hmn|walla|crowd'), ('Criatura', r'^crea|creature|monster|dinosaur|dog|^anml'),
    ('Interface', r'\bui\b|button|click|beep|interface|menu'), ('Sino', r'bell|chime'), ('Drone', r'drone|hum|tone|texture'), ('Ambiente', r'^amb|ambience|ambient|loop'),
]


def classificar(pasta, arquivo):
    """(seção, tipo) pelo nome da biblioteca e do arquivo."""
    nome = re.sub(r'\.wav$', '', arquivo, flags=re.I)
    secao = next((s for s, r in SECOES if re.search(r, nome, re.I) or re.search(r, pasta, re.I)), 'outros')
    tipo = next((t for t, r in TIPOS if re.search(r, arquivo, re.I)), 'Outros')
    return secao, tipo


def titulo(arquivo):
    """Nome legível: sem o código UCS do começo nem o fornecedor do fim."""
    nome = re.sub(r'\.wav$', '', arquivo, flags=re.I)
    partes = nome.split('_')
    if len(partes) > 1 and re.fullmatch(r'[A-Z]{3,}[A-Za-z]*', partes[0]):
        partes = partes[1:]
    if len(partes) > 1 and re.search(r'344 Audio|ESM|InMotionAudio|SNDBTS|KSL|The Noisery|CB Sounddesign|IMA', '_'.join(partes[1:])):
        partes = partes[:next(i for i, p in enumerate(partes) if i and re.search(r'344 Audio|ESM|InMotionAudio|SNDBTS|KSL|The Noisery|CB Sounddesign|IMA', p))]
    return re.sub(r'\s+', ' ', ' '.join(partes)).strip(' ,')


def duracao(path):
    saida = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True, text=True).stderr
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', saida)
    return round(int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]), 2) if m else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--originais', default=os.path.expanduser('~/worktrees/sstcg-sonniss/originais'))
    ap.add_argument('--biblioteca', default=os.path.expanduser('~/worktrees/sstcg-biblioteca-sons'))
    ap.add_argument('--so-listar', action='store_true')
    args = ap.parse_args()
    raiz, banco = Path(args.originais), Path(args.biblioteca) / 'banco'
    wavs = sorted(p for p in raiz.rglob('*') if p.suffix.lower() == '.wav')
    if args.so_listar:
        por = {}
        for p in wavs:
            por.setdefault(classificar(p.parent.name, p.name)[0], []).append(p)
        for s, ps in por.items():
            print(f'{s}: {len(ps)}')
            for p in ps:
                print(f'   {classificar(p.parent.name, p.name)[1]:12} {titulo(p.name)[:70]}  [{p.parent.name[:30]}]')
        return
    (banco / 'SNS').mkdir(parents=True, exist_ok=True)
    mapa_path = banco / 'mapa.json'
    mapa = json.loads(mapa_path.read_text(encoding='utf-8')) if mapa_path.exists() else {}
    for p in wavs:
        mapa.setdefault(str(p.relative_to(raiz)), f'SNS/{len(mapa) + 1:04d}')

    def converter(p):
        id_ = mapa[str(p.relative_to(raiz))]
        out = banco / f'{id_}.mp3'
        if not out.exists():
            tmp = out.with_suffix('.tmp.mp3')
            subprocess.run([FFMPEG, '-y', '-v', 'error', '-i', str(p), '-t', str(LIMITE_S), '-map_metadata', '-1', '-vn', '-ac', '2', '-ar', '44100', '-b:a', '160k', str(tmp)], check=True)
            os.replace(tmp, out)
        secao, tipo = classificar(p.parent.name, p.name)
        return [id_, secao, p.parent.name, tipo, titulo(p.name), duracao(out), [], '']

    with concurrent.futures.ThreadPoolExecutor(6) as pool:
        sons = list(pool.map(converter, wavs))
    mapa_path.write_text(json.dumps(mapa, ensure_ascii=False, indent=1), encoding='utf-8')
    (banco / 'indice.json').write_text(json.dumps({'fontes': {'SNS': 'Sonniss GDC 2026'}, 'sons': sons}, ensure_ascii=False), encoding='utf-8')
    print(f'{len(sons)} sons em {banco}')


if __name__ == '__main__':
    sys.exit(main())
