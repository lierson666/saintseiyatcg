"""Testes do sanctuary-api: python3.12 -m unittest sanctuary-api/test_server.py (precisa de hashlib.scrypt; o Python do Xcode não tem)."""
import json, os, sys, tempfile, threading, unittest, urllib.request
from urllib.error import HTTPError

os.environ['SANCTUARY_INVITES'] = 'Saint@Example.com'
os.environ['SANCTUARY_INSECURE_COOKIE'] = '1'
sys.path.insert(0, os.path.dirname(__file__))
import server  # noqa: E402

ORIGIN = server.ORIGIN


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


class Api(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        server.open_db(os.path.join(cls.tmp.name, 'test.db'))
        cls.httpd = server.make_server(0, '127.0.0.1')
        cls.base = f'http://127.0.0.1:{cls.httpd.server_address[1]}'
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        server.db.close()
        cls.tmp.cleanup()

    def call(self, method, path, body=None, cookie=None, origin=ORIGIN, headers=None):
        req = urllib.request.Request(self.base + path, method=method, data=None if body is None else json.dumps(body).encode())
        if origin:
            req.add_header('Origin', origin)
        if cookie:
            req.add_header('Cookie', cookie)
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        opener = urllib.request.build_opener(NoRedirect)
        try:
            r = opener.open(req)
        except HTTPError as e:
            r = e
        raw = r.read()
        set_cookie = r.headers.get('Set-Cookie') or ''
        return r.status, (json.loads(raw) if raw and r.headers.get('Content-Type') == 'application/json' else None), set_cookie.split(';')[0], r.headers

    def test_fluxo_completo(self):
        st, _, _, _ = self.call('POST', '/api/auth/register', {'email': 'other@example.com', 'name': 'X', 'password': 'x' * 12})
        self.assertEqual(st, 403)  # sem convite
        st, _, _, _ = self.call('POST', '/api/auth/register', {'email': 'saint@example.com', 'name': 'Seiya', 'password': 'short'})
        self.assertEqual(st, 400)
        st, _, _, _ = self.call('POST', '/api/auth/register', {'email': 'saint@example.com', 'name': 'Seiya', 'password': 'pegasus-ryu-sei'}, origin='https://evil.test')
        self.assertEqual(st, 403)  # origem errada
        st, body, cookie, _ = self.call('POST', '/api/auth/register', {'email': 'SAINT@example.com', 'name': 'Seiya', 'password': 'pegasus-ryu-sei'})
        self.assertEqual((st, body['name']), (201, 'Seiya'))
        self.assertTrue(cookie.startswith('sst_session='))
        st, _, _, _ = self.call('POST', '/api/auth/register', {'email': 'saint@example.com', 'name': 'Seiya', 'password': 'pegasus-ryu-sei'})
        self.assertEqual(st, 409)

        self.assertEqual(self.call('GET', '/api/auth/check', cookie=cookie)[0], 204)
        st, _, _, h = self.call('GET', '/api/auth/check', headers={'X-Forwarded-Uri': '/playtest/?x=1'})
        self.assertEqual((st, h['Location']), (302, '/login/?next=/playtest/%3Fx%3D1'))

        self.assertEqual(self.call('GET', '/api/me', cookie=cookie)[1]['email'], 'saint@example.com')
        st, body, _, _ = self.call('PUT', '/api/decks/deck-1', {'data': {'nome': 'A'}, 'revision': 0}, cookie=cookie)
        self.assertEqual((st, body['revision']), (200, 1))
        st, body, _, _ = self.call('PUT', '/api/decks/deck-1', {'data': {'nome': 'B'}, 'revision': 0}, cookie=cookie)
        self.assertEqual((st, body['server']['data']['nome']), (409, 'A'))
        self.assertEqual(len(self.call('GET', '/api/decks', cookie=cookie)[1]['decks']), 1)
        self.call('DELETE', '/api/decks/deck-1', cookie=cookie)
        self.assertEqual(self.call('GET', '/api/decks', cookie=cookie)[1]['decks'], [])
        self.assertEqual(self.call('POST', '/api/decks/deck-1/restore', cookie=cookie)[0], 200)

        self.call('POST', '/api/auth/logout', cookie=cookie)
        self.assertEqual(self.call('GET', '/api/me', cookie=cookie)[0], 401)
        st, _, cookie2, _ = self.call('POST', '/api/auth/login', {'email': 'saint@example.com', 'password': 'pegasus-ryu-sei'})
        self.assertEqual(st, 200)
        self.assertEqual(self.call('GET', '/api/auth/check', cookie=cookie2)[0], 204)

    def test_limite_de_tentativas(self):
        for _ in range(server.LOGIN_LIMIT):
            st, body, _, _ = self.call('POST', '/api/auth/login', {'email': 'nobody@example.com', 'password': 'wrong-password'}, headers={'X-Forwarded-For': '10.9.9.9'})
            self.assertEqual((st, body['error']), (401, server.BAD_LOGIN))
        self.assertEqual(self.call('POST', '/api/auth/login', {'email': 'nobody@example.com', 'password': 'x'}, headers={'X-Forwarded-For': '10.9.9.9'})[0], 429)


if __name__ == '__main__':
    unittest.main()
