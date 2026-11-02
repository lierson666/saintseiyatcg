#!/usr/bin/env python3
"""Biblioteca de sons: classificação, AWB em CPK e gravação da voz por carta. Uso: python3 tools/test-biblioteca-sons.py"""
import importlib.util, json, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'tools/rea-ps3'), str(ROOT / 'card-forge')]
spec = importlib.util.spec_from_file_location('biblioteca', ROOT / 'tools/rea-ps3/biblioteca-sons.py')
bib = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bib)
import star_hill

assert bib.classificar('BBA_SEY_PSK_VC', 'x', 5) == ('voz-golpe', 'SEY', 'Golpe PSK')
banco_spec = importlib.util.spec_from_file_location('banco', Path(__file__).parent / 'banco-sons.py')
banco = importlib.util.module_from_spec(banco_spec)
banco_spec.loader.exec_module(banco)
assert banco.classificar('344 Audio - Anime Fight Voices Vol. 1', "VOXMale_Warrior Opponent Attack_344 Audio_Anime.wav")[0] == 'vozes'  # guerreiro falando não é som de guerra
assert banco.classificar('Ivo Vicic - Church Bells', '04 Church Bells.wav') == ('athena', 'Sino')
assert banco.classificar('x', 'WATRImpt_Impact Water Deep_ESM_EMWI.wav') == ('poseidon', 'Impacto')
assert banco.classificar('InMotionAudio - Velcro', 'VelcroRip29.wav')[0] == 'outros'
assert banco.titulo('WATRImpt_Impact Water Deep_ESM_EMWI.wav') == 'Impact Water Deep'
assert bib.classificar('BBA_SEY_PSK', 'x', 5) == ('fx-golpe', 'SEY', 'Golpe PSK')
assert bib.classificar('SEY', 'B_SEY_01', .3) == ('voz-batalha', 'SEY', 'Grito')
assert bib.classificar('SEY', 'SEY_win00_01', 2) == ('voz-batalha', 'SEY', 'Vitória')
assert bib.classificar('EVE_0_00_0_ARA', 'EV010_S000', 2) == ('voz-historia', 'ARA', 'Evento 0-00-0')
assert bib.classificar('BT_SYS_SE', 'hit', 1)[0] == 'fx-sistema'
assert bib.classificar('AMB_01', 'AMB_01', 9)[0] == 'fx-ambiente'
assert bib.classificar('ANNOUNCER_VC', 'GWM_400', 2)[0] == 'voz-narracao'

with tempfile.TemporaryDirectory() as tmp:
    root, lib = Path(tmp) / 'r', Path(tmp) / 'lib'
    (lib / 'jp/BT_SEY_SE').mkdir(parents=True)
    (lib / 'jp/BT_SEY_SE/5000.mp3').write_bytes(b'som')
    (root / 'data').mkdir(parents=True)
    star_hill.LIBRARY = lib
    write = lambda path, raw: path.write_bytes(raw)
    body = {'id': 'athena-v6-001', 'cast': 'BT_SEY_SE/5000', 'golpe': None, 'ultimate': None, 'linhas': []}
    saved = star_hill.save_card_voice(body, write, root)
    assert saved['athena-v6-001']['cast'] == 'BT_SEY_SE/5000'
    for lang in ('jp', 'pt', 'es'):  # FX só existe em um idioma: o duelo pede pelo idioma da partida
        assert (root / f'playtest/divine/assets/vozes/{lang}/BT_SEY_SE/5000.mp3').read_bytes() == b'som'
    for bad in ('../x/5000', 'BT_SEY_SE/abc'):
        try:
            star_hill.save_card_voice({**body, 'cast': bad}, write, root)
        except ValueError:
            continue
        raise AssertionError(bad)
    try:
        star_hill.save_card_voice({**body, 'cast': 'NADA/5000'}, write, root)
        raise AssertionError('som inexistente aceito')
    except ValueError:
        pass
    god = star_hill.save_card_voice({'id': 'faccao-athena', 'morte': 'BT_SEY_SE/5000', 'linhas': []}, write, root)['faccao-athena']
    assert god['morte'] and god['cast'] is None  # padrão por facção usa o mesmo formato
    keep = star_hill.save_card_voice({'id': 'faccao-athena', 'impacto_deus': 'BT_SEY_SE/5000', 'linhas': []}, write, root)['faccao-athena']
    assert keep['morte'] and keep['impacto_deus']  # momento ausente no corpo não apaga o que já estava salvo
    try:
        star_hill.save_card_voice({'id': 'faccao-athena', 'inventado': 'BT_SEY_SE/5000', 'linhas': []}, write, root)
        raise AssertionError('momento inexistente aceito')
    except ValueError:
        pass
    assert star_hill.save_card_voice({'id': 'athena-v6-009', 'linhas': [False, None]}, write, root)['athena-v6-009']['linhas'] == [False, None]  # Sem som fica guardado
    out = star_hill.import_library_sound({'id': 'BT_SEY_SE/5000', 'lang': 'pt', 'tipo': 'se'}, root)
    assert out['arquivo'] == 'MUSIC/fx/ps3-se-BT_SEY_SE-pt/5000.mp3' and (root / out['arquivo']).exists()
    assert json.loads((root / 'data/card-voices.json').read_text())['athena-v6-001']['cast']
print('ok')
