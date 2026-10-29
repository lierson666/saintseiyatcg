"""Testes do sanctuary-api: python3.12 -m unittest sanctuary-api/test_server.py (precisa de hashlib.scrypt; o Python do Xcode não tem)."""
import json, os, sys, tempfile, threading, unittest, urllib.request
from urllib.error import HTTPError

os.environ['SANCTUARY_INVITES'] = 'Saint@Example.com,a@example.com,b@example.com,c@example.com,d@example.com,e@example.com'
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
        st, _, _, _ = self.call('POST', '/api/auth/register', {'email': 'other@example.com', 'name': 'Other One', 'username': 'Other', 'country': 'BR', 'password': 'x' * 12, 'accept_terms': True})
        self.assertEqual(st, 403)  # sem convite
        st, _, _, _ = self.call('POST', '/api/auth/register', {'email': 'saint@example.com', 'name': 'Seiya Kido', 'username': 'Seiya', 'country': 'BR', 'password': 'short', 'accept_terms': True})
        self.assertEqual(st, 400)
        st, _, _, _ = self.call('POST', '/api/auth/register', {'email': 'saint@example.com'}, origin='https://evil.test')
        self.assertEqual(st, 403)  # origem errada
        st, body, _, _ = self.call('POST', '/api/auth/register', {'email': 'saint@example.com', 'name': 'Seiya', 'password': 'pegasus-ryu-sei'})
        self.assertEqual((st, body['error']), (400, server.OLD_FORM))
        full = {'email': 'SAINT@example.com', 'name': 'Seiya Kido', 'username': 'Pegasus_Seiya', 'country': 'BR', 'password': 'pegasus-ryu-sei', 'accept_terms': True}
        self.assertEqual(self.call('POST', '/api/auth/register', {**full, 'accept_terms': False})[0], 400)
        self.assertEqual(self.call('POST', '/api/auth/register', {**full, 'username': 'ab'})[0], 400)
        self.assertEqual(self.call('POST', '/api/auth/register', {**full, 'phone': 'call me'})[0], 400)
        st, body, cookie, _ = self.call('POST', '/api/auth/register', full)
        self.assertEqual((st, body['name'], body['username'], body['complete']), (201, 'Seiya Kido', 'Pegasus_Seiya', True))
        self.assertRegex(body['friend_code'], r'^Pegasus_Seiya#\d{4}$')
        self.assertTrue(cookie.startswith('sst_session='))
        self.assertEqual(self.call('POST', '/api/auth/register', full)[0], 409)
        self.assertFalse(self.call('GET', '/api/username-available?u=pegasus_SEIYA')[1]['available'])
        self.assertTrue(self.call('GET', '/api/username-available?u=Shun_Free')[1]['available'])
        st, body, _, _ = self.call('PATCH', '/api/me', {'phone': '+55 11 91234-5678', 'country': 'pt', 'username': 'Hacker'}, cookie=cookie)
        self.assertEqual((st, body['phone'], body['country'], body['username']), (200, '+55 11 91234-5678', 'PT', 'Pegasus_Seiya'))
        self.assertEqual(self.call('POST', '/api/me/password', {'current': 'wrong', 'new': 'x' * 12}, cookie=cookie)[0], 403)
        st, _, cookie, _ = self.call('POST', '/api/me/password', {'current': 'pegasus-ryu-sei', 'new': 'pegasus-ryu-sei'}, cookie=cookie)
        self.assertEqual(st, 200)

        self.assertEqual(self.call('GET', '/api/auth/check', cookie=cookie)[0], 204)
        st, _, _, h = self.call('GET', '/api/auth/check', headers={'X-Forwarded-Uri': '/playtest/?x=1'})
        self.assertEqual((st, h['Location']), (302, '/login/?v=3&next=/playtest/%3Fx%3D1'))

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
        self.assertEqual(self.call('DELETE', '/api/me', {'password': 'nope'}, cookie=cookie2)[0], 403)
        self.assertEqual(self.call('DELETE', '/api/me', {'password': 'pegasus-ryu-sei'}, cookie=cookie2)[0], 200)
        self.assertEqual(self.call('POST', '/api/auth/login', {'email': 'saint@example.com', 'password': 'pegasus-ryu-sei'})[0], 401)

    def test_limite_de_tentativas(self):
        for _ in range(server.LOGIN_LIMIT):
            st, body, _, _ = self.call('POST', '/api/auth/login', {'email': 'nobody@example.com', 'password': 'wrong-password'}, headers={'X-Forwarded-For': '10.9.9.9'})
            self.assertEqual((st, body['error']), (401, server.BAD_LOGIN))
        self.assertEqual(self.call('POST', '/api/auth/login', {'email': 'nobody@example.com', 'password': 'x'}, headers={'X-Forwarded-For': '10.9.9.9'})[0], 429)


    def new_player(self, letter, username):
        st, body, cookie, _ = self.call('POST', '/api/auth/register', {'email': f'{letter}@example.com', 'name': f'Player {letter}', 'username': username,
                                                                       'country': 'BR', 'password': 'cosmo-burn-123', 'accept_terms': True})
        self.assertEqual(st, 201)
        return body['friend_code'], cookie

    def test_amigos(self):
        code_a, a = self.new_player('a', 'Shiryu')
        code_b, b = self.new_player('b', 'Hyoga')
        code_c, c = self.new_player('c', 'Ikki')
        self.assertEqual(self.call('POST', '/api/friends/requests', {'code': 'Nobody#0000'}, cookie=a)[0], 404)
        self.assertEqual(self.call('POST', '/api/friends/requests', {'code': code_a}, cookie=a)[0], 400)
        self.assertEqual(self.call('POST', '/api/friends/requests', {'code': code_b.lower()}, cookie=a)[0], 201)
        incoming = self.call('GET', '/api/friends', cookie=b)[1]['incoming']
        self.assertEqual([r['username'] for r in incoming], ['Shiryu'])
        self.assertEqual(self.call('POST', f"/api/friends/requests/{incoming[0]['id']}/accept", cookie=a)[0], 404)  # só o destinatário aceita
        self.assertEqual(self.call('POST', f"/api/friends/requests/{incoming[0]['id']}/accept", cookie=b)[0], 200)
        self.assertEqual(self.call('POST', '/api/friends/requests', {'code': code_b}, cookie=a)[0], 409)
        friends = self.call('GET', '/api/friends', cookie=a)[1]['friends']
        self.assertEqual([(f['username'], f['status']) for f in friends], [('Hyoga', 'offline')])
        self.call('POST', '/api/presence', {'status': 'match'}, cookie=b)
        self.assertEqual(self.call('GET', '/api/friends', cookie=a)[1]['friends'][0]['status'], 'match')
        # pedidos cruzados viram amizade direto
        self.call('POST', '/api/friends/requests', {'code': code_a}, cookie=c)
        self.assertEqual(self.call('POST', '/api/friends/requests', {'code': code_c}, cookie=a)[1], {'friend': 'Ikki'})
        # bloqueio: desfaz amizade e o bloqueado não consegue pedir de novo
        self.assertEqual(self.call('POST', '/api/blocks', {'username': 'ikki'}, cookie=a)[0], 200)
        self.assertEqual([f['username'] for f in self.call('GET', '/api/friends', cookie=a)[1]['friends']], ['Hyoga'])
        st, body, _, _ = self.call('POST', '/api/friends/requests', {'code': code_a}, cookie=c)
        self.assertEqual((st, body['error']), (404, server.NO_PLAYER))
        self.assertEqual(self.call('DELETE', '/api/blocks/Ikki', cookie=a)[0], 200)
        self.assertEqual(self.call('DELETE', '/api/friends/Hyoga', cookie=a)[0], 200)
        self.assertEqual(self.call('GET', '/api/friends', cookie=b)[1]['friends'], [])


    def test_chat(self):
        code_d, d = self.new_player('d', 'Shun')
        code_e, e = self.new_player('e', 'June')
        self.assertEqual(self.call('POST', '/api/chat/June', {'body': 'hi'}, cookie=d)[0], 403)  # ainda não são amigos
        self.call('POST', '/api/friends/requests', {'code': code_e}, cookie=d)
        self.call('POST', '/api/friends/requests', {'code': code_d}, cookie=e)  # cruzado: amigos
        self.assertEqual(self.call('POST', '/api/chat/June', {'body': '   '}, cookie=d)[0], 400)
        self.assertEqual(self.call('POST', '/api/chat/June', {'body': 'x' * 501}, cookie=d)[0], 400)
        st, sent, _, _ = self.call('POST', '/api/chat/June', {'body': 'Nebula chain!'}, cookie=d)
        self.assertEqual((st, sent['body']), (201, 'Nebula chain!'))
        self.assertEqual(self.call('GET', '/api/friends', cookie=e)[1]['friends'][0]['unread'], 1)
        got = self.call('GET', '/api/chat/shun', cookie=e)[1]
        self.assertEqual([(m['body'], m['mine']) for m in got['messages']], [('Nebula chain!', False)])
        self.assertEqual(self.call('GET', '/api/friends', cookie=e)[1]['friends'][0]['unread'], 0)
        self.assertEqual(self.call('GET', '/api/chat/June', cookie=d)[1]['seen_up_to'], sent['id'])
        self.assertEqual(self.call('GET', f"/api/chat/June?after={sent['id']}", cookie=d)[1]['messages'], [])
        for i in range(server.MSG_PER_MIN - 1):
            self.call('POST', '/api/chat/June', {'body': f'm{i}'}, cookie=d)
        self.assertEqual(self.call('POST', '/api/chat/June', {'body': 'too many'}, cookie=d)[0], 429)
        self.assertEqual(self.call('POST', '/api/chat/Shun/report', cookie=e)[0], 201)
        self.call('POST', '/api/blocks', {'username': 'Shun'}, cookie=e)
        self.assertEqual(self.call('POST', '/api/chat/June', {'body': 'hello?'}, cookie=d)[0], 403)


if __name__ == '__main__':
    unittest.main()
