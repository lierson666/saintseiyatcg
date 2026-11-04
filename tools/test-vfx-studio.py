#!/usr/bin/env python3
"""VFX Forge V3: o servidor só aceita vínculos válidos e nunca cria raridade. Roda numa pasta temporária."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('star_hill', ROOT / 'card-forge/star_hill.py')
star_hill = importlib.util.module_from_spec(spec)
spec.loader.exec_module(star_hill)


def write(path, data):
    path.write_bytes(data)


class VfxStudio(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / 'data').mkdir()
        (self.root / 'data/cards.json').write_text(json.dumps({'cartas': [{'id': 'a', 'raridade': 'Divine'}]}))
        self.save = lambda tipo, id_, valor: star_hill.save_vfx_studio({'tipo': tipo, 'id': id_, 'valor': valor}, write, self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def test_carta_salva_e_tira(self):
        self.assertEqual(self.save('carta', 'a', {'inspecao': 'water', 'forca': 0.5})['cartas']['a']['inspecao'], 'water')
        self.assertNotIn('a', self.save('carta', 'a', None)['cartas'])

    def test_carta_recusa_lixo(self):
        for bad in ({'idle': '<x>'}, {'forca': 9}, {'cor': 'red'}, {'outro': 1}, {'velocidade': True}):
            with self.assertRaises(ValueError):
                self.save('carta', 'a', bad)
        with self.assertRaises(ValueError):
            self.save('carta', '../x', {'idle': 'water'})

    def test_raridade_so_as_reais(self):
        self.assertEqual(self.save('raridade', 'Divine', 'divine-holo')['raridades']['Divine'], 'divine-holo')
        with self.assertRaises(ValueError):
            self.save('raridade', 'Mythic', 'divine-holo')

    def test_composicao(self):
        comp = {'nome': 'X', 'camadas': [{'tipo': 'carta', 'inicio': 0, 'duracao': 100, 'escala': 1.1}, {'tipo': 'audio', 'inicio': 0, 'duracao': 100, 'som': 'playtest/a.ogg'}]}
        self.assertIn('x', self.save('composicao', 'x', comp)['composicoes'])
        for layer in ({'tipo': 'script', 'inicio': 0, 'duracao': 1}, {'tipo': 'carta', 'inicio': 9999, 'duracao': 1}, {'tipo': 'carta', 'inicio': 0},
                      {'tipo': 'audio', 'inicio': 0, 'duracao': 1, 'som': 'https://x.com/a.ogg'}, {'tipo': 'ui', 'inicio': 0, 'duracao': 1, 'x-y': 1}):
            with self.assertRaises(ValueError):
                self.save('composicao', 'y', {'nome': 'Y', 'camadas': [layer]})

    def test_momento_aceita_novos_e_recusa_lixo(self):
        (self.root / 'data/card-animations.json').write_text('{}')
        data = star_hill.save_card_anim({'id': 'a', 'linhas': ['comp:great-flood'], 'entrada': 'shader:water'}, write, self.root)
        self.assertEqual(data['a']['entrada'], 'shader:water')
        with self.assertRaises(ValueError):
            star_hill.save_card_anim({'id': 'a', 'linhas': [], 'entrada': 'comp:A B'}, write, self.root)


if __name__ == '__main__':
    unittest.main()
