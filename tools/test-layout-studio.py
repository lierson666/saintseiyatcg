"""Regressões do armazenamento visual em pasta temporária, sem tocar no catálogo."""
import copy
import importlib.util
import json
import struct
import tempfile
import threading
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('layout_studio', ROOT / 'card-forge/layout_studio.py')
studio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(studio)


class LayoutStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'data').mkdir()
        for name in ['card-layouts.json', 'card-layout-schema.json']:
            (self.root / 'data' / name).write_bytes((ROOT / 'data' / name).read_bytes())
        (self.root / 'data/cards.json').write_text('CANÁRIO: NUNCA GRAVAR')
        self.draft = copy.deepcopy(studio.read(self.root)['drafts'][0])

    def write(self, path, raw):
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix('.tmp')
        temp.write_bytes(raw)
        temp.replace(path)

    def change(self, action, **payload):
        return studio.mutate(action, dict(expectedRevision=studio.read(self.root)['revision'], **payload), self.write, self.root)

    def test_draft_publish_restore_rollback(self):
        self.draft['elements'] = [{'id': 'name', 'x': 100}]
        saved = self.change('draft', template=self.draft)
        self.assertEqual(saved['published'], [])
        first = self.change('publish', id=self.draft['id'])
        version = first['history'][-1]['version']
        self.draft['elements'][0]['x'] = 200
        self.change('draft', template=self.draft)
        self.change('publish', id=self.draft['id'])
        reverted = self.change('rollback', id=self.draft['id'], version=version)
        self.assertEqual(reverted['published'][0]['elements'][0]['x'], 100)
        self.assertEqual((self.root / 'data/cards.json').read_text(), 'CANÁRIO: NUNCA GRAVAR')
        self.assertTrue(list((self.root / 'card-forge/out/layout-studio').glob('*.json')))

    def test_conflict_does_not_overwrite(self):
        self.change('draft', template=self.draft)
        before = (self.root / 'data/card-layouts.json').read_bytes()
        with self.assertRaises(studio.Conflict):
            studio.mutate('draft', {'expectedRevision': 0, 'template': self.draft}, self.write, self.root)
        self.assertEqual((self.root / 'data/card-layouts.json').read_bytes(), before)

    def test_invalid_templates_and_assets(self):
        attacks = [{'id': 'name', 'binding': 'window.alert(1)'}, {'id': 'name', 'style': {'color': 'url(javascript:x)'}}, {'id': 'name', 'onclick': 'x'}, {'id': 'name', 'component': 'script'}, {'id': 'name', 'opacity': 4}, {'id': 'name', 'conditions': {'binding': 'card.name', 'op': 'eval'}}]
        for layer in attacks:
            with self.subTest(layer=layer), self.assertRaises(ValueError):
                studio.validate(dict(self.draft, elements=[layer]), self.root)
        for path in ['CARD-TEMPLATE/../data/cards.png', 'CARD-TEMPLATE/%2e%2e/cards.png', 'https://evil.test/a.png', 'CARD-TEMPLATE/no.png']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                studio.asset(path, self.root)

    def test_immutable_bases_and_parent_cycles(self):
        base = studio.read(self.root)['bases'][0]
        with self.assertRaises(ValueError):
            self.change('draft', template=base)
        self.draft['extends'] = self.draft['id']
        with self.assertRaises(ValueError):
            self.change('draft', template=self.draft)

    def test_failed_write_preserves_old_library(self):
        before = (self.root / 'data/card-layouts.json').read_bytes()
        def fail(path, raw):
            if path.name == 'card-layouts.json':
                raise OSError('falha simulada')
            self.write(path, raw)
        with self.assertRaises(OSError):
            studio.mutate('draft', dict(expectedRevision=0, template=self.draft), fail, self.root)
        self.assertEqual((self.root / 'data/card-layouts.json').read_bytes(), before)

    def test_restore_draft_does_not_publish(self):
        saved = self.change('draft', template=self.draft)
        restored = self.change('restore', id=self.draft['id'], version=saved['revision'])
        self.assertEqual(restored['published'], [])

    def test_project_crop_is_read_only_and_uses_image_dimensions(self):
        folder = self.root / 'card-forge/projects'
        folder.mkdir(parents=True)
        art = self.root / 'card-forge/art'
        art.mkdir()
        (art / 'sample.png').write_bytes(b'\x89PNG\r\n\x1a\n' + b'\x00\x00\x00\rIHDR' + struct.pack('>II', 100, 200))
        path = folder / 'example.json'
        path.write_text(json.dumps({'subtitle': 'Visual only', 'art': {'src': 'art/sample.png', 'w': 150, 'x': -10, 'y': -20}}))
        before = path.read_bytes()
        result = studio.project_artwork(self.root)
        self.assertEqual(result['example']['art']['h'], 300)
        self.assertEqual(result['example']['art']['src'], 'card-forge/art/sample.png')
        self.assertEqual(path.read_bytes(), before)


class LayoutHTTPTests(unittest.TestCase):
    def test_host_origin_conflict_and_bad_binding(self):
        qa_spec = importlib.util.spec_from_file_location('studio_qa', ROOT / 'tools/serve-layout-studio-qa.py')
        qa = importlib.util.module_from_spec(qa_spec)
        qa_spec.loader.exec_module(qa)
        server = qa.make_server()
        threading.Thread(target=server.serve_forever, daemon=True).start()
        import http.client
        host = f'127.0.0.1:{server.server_port}'
        def request(method, headers, value=None):
            conn = http.client.HTTPConnection('127.0.0.1', server.server_port)
            conn.request(method, '/api/layout-studio/draft' if method == 'POST' else '/api/layout-studio', body=json.dumps(value) if value is not None else None, headers=headers)
            response = conn.getresponse()
            result = response.status, json.loads(response.read())
            conn.close()
            return result
        try:
            self.assertEqual(request('GET', {'Host': 'evil.example'})[0], 403)
            code, lib = request('GET', {'Host': host})
            self.assertEqual(code, 200)
            payload = {'template': lib['drafts'][0], 'expectedRevision': lib['revision']}
            headers = {'Host': host, 'Origin': 'http://' + host, 'Content-Type': 'application/json'}
            self.assertEqual(request('POST', {'Host': host}, payload)[0], 403)
            self.assertEqual(request('POST', dict(headers, Origin='https://evil.example'), payload)[0], 403)
            self.assertEqual(request('POST', headers, payload)[0], 200)
            self.assertEqual(request('POST', headers, payload)[0], 409)
            payload['expectedRevision'] += 1
            payload['template']['elements'] = [{'id': 'name', 'binding': 'window.alert(1)'}]
            self.assertEqual(request('POST', headers, payload)[0], 400)
        finally:
            server.shutdown()
            server.server_close()
            server.qa_temp.cleanup()


if __name__ == '__main__':
    unittest.main()
