#!/usr/bin/env python3
"""Copia o que foi aprovado no Star Hill de MUSIC/fx para playtest/divine/assets, que fica atrás do login.
--tudo copia todas as vozes e efeitos ps3-* (autor, 02/11/2026)."""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
audio = json.loads((ROOT / 'data/olympus-telas.json').read_text(encoding='utf-8'))['audio']
fx, dest = ROOT / 'MUSIC/fx', ROOT / 'playtest/divine/assets'
pairs = []
for v in audio.get('vozes', []):
    for fala in sorted(set(v['golpe'] + v['ultimate'])):
        for lang in ('jp', 'pt', 'es'):
            pairs.append((fx / f"ps3-voz-{v['codigo']}-{lang}/{fala}.mp3", dest / f"vozes/{lang}/{v['codigo']}/{fala}.mp3"))
voices = ROOT / 'data/card-voices.json'
for card in (json.loads(voices.read_text(encoding='utf-8')) if voices.exists() else {}).values():
    for line in filter(None, [*(card.get(k) for k in ('cast', 'entrada', 'declarar', 'golpe', 'strike', 'morte', 'retorno', 'habilidade', 'ultimate', 'carga', 'impacto', 'impacto_deus', 'poder_divino', 'poder_dominio', 'awaken')), *card['linhas']]):
        code, fala = line.split('/')
        for lang in ('jp', 'pt', 'es'):
            pairs.append((fx / f'ps3-voz-{code}-{lang}/{fala}.mp3', dest / f'vozes/{lang}/{line}.mp3'))
for path in filter(None, audio['efeitos'].values()):
    if path.startswith('MUSIC/fx/ps3-'):
        pairs.append((ROOT / path, dest / 'sons' / Path(path).relative_to('MUSIC/fx')))
if '--tudo' in sys.argv:
    for src in fx.glob('ps3-*/*.mp3'):
        kind, code, *lang = src.parent.name.split('-')[1:]
        pairs.append((src, dest / f'vozes/{lang[0]}/{code}/{src.name}' if kind == 'voz' else dest / 'sons' / src.parent.name / src.name))
for src, out in pairs:
    if not src.exists() and out.exists():  # som da biblioteca: o Card Forge já instalou ao salvar a escolha
        continue
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, out)
print(len(pairs), 'arquivos copiados')
