"""ECONOMY FORGE: validação, leitura com volta aos padrões, salvar/publicar/rollback. Rode: python3.12 -m unittest test_economy_forge"""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import economy as E

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location('economy_forge', HERE.parent / 'card-forge/economy_forge.py')
F = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(F)


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


class EconomyTest(unittest.TestCase):
    def test_check(self):
        self.assertEqual(E.check(E.DEFAULTS), [])
        bad = json.loads(json.dumps(E.DEFAULTS))
        bad['bundles'][1]['qty'] = 1
        self.assertTrue(any('Pacotes' in e for e in E.check(bad)))
        bad = json.loads(json.dumps(E.DEFAULTS)) | {'booster_price': '1000'}
        self.assertTrue(E.check(bad))

    def test_load_falls_back(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'economy.json'
            self.assertEqual(E.load(p), E.normalized(E.DEFAULTS))
            p.write_text(json.dumps(E.DEFAULTS | {'booster_price': -5}))
            self.assertEqual(E.load(p)['booster_price'], 1000)
            p.write_text(json.dumps(E.DEFAULTS | {'booster_price': 1200}))
            self.assertEqual(E.load(p)['booster_price'], 1200)

    def test_forge_cycle(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            s = F.read(root)
            self.assertEqual(s['estado'], 'draft')
            s = F.publish(root, {'revisao': s['revisao']}, write)
            self.assertEqual((s['estado'], s['publicado']['version']), ('published', 1))
            with self.assertRaises(ValueError):
                F.save(root, {'revisao': 'velha', 'conteudo': E.DEFAULTS}, write)
            with self.assertRaises(ValueError):
                F.save(root, {'revisao': s['revisao'], 'conteudo': E.DEFAULTS | {'set_off': 99}}, write)
            s = F.save(root, {'revisao': s['revisao'], 'conteudo': E.DEFAULTS | {'booster_price': 1200}}, write)
            self.assertEqual([x['field'] for x in s['diff']], ['booster_price'])
            s = F.publish(root, {'revisao': s['revisao']}, write)
            self.assertEqual(E.load(root / F.PUBLISHED)['booster_price'], 1200)
            s = F.rollback(root, {'versao': 1}, write)
            self.assertEqual((s['publicado']['version'], s['publicado']['rollback_of'], s['estado']), (3, 1, 'published'))
            self.assertEqual(E.load(root / F.PUBLISHED)['booster_price'], 1000)
            self.assertEqual(len(list((root / F.HISTORY).glob('v*.json'))), 3)


if __name__ == '__main__':
    unittest.main()
