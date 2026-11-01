"""Testes do sanctuary-api: python3.12 -m unittest sanctuary-api/test_server.py (precisa de hashlib.scrypt; o Python do Xcode não tem)."""
import json, os, sys, tempfile, threading, unittest, urllib.request
from urllib.error import HTTPError

os.environ['SANCTUARY_INVITES'] = 'Saint@Example.com,a@example.com,b@example.com,c@example.com,d@example.com,e@example.com,adm@example.com,f@example.com,g@example.com,h@example.com'
os.environ['SANCTUARY_INSECURE_COOKIE'] = '1'
os.environ['SANCTUARY_ADMINS'] = 'adm@example.com'
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

    def test_painel_admin(self):
        reg = lambda email, user: self.call('POST', '/api/auth/register', {'email': email, 'name': user + ' Name', 'username': user, 'country': 'BR', 'password': 'x' * 12, 'accept_terms': True})[2]
        admin, player = reg('adm@example.com', 'Athena_Adm'), reg('f@example.com', 'Ikki_Player')
        self.assertTrue(self.call('GET', '/api/me', cookie=admin)[1]['admin'])
        self.assertEqual(self.call('GET', '/api/admin/overview', cookie=player)[0], 403)
        # pedido de acesso pela home vira convite e libera o cadastro
        self.assertEqual(self.call('POST', '/api/access-requests', {'name': 'Hyoga', 'email': 'Hyoga@example.com', 'news': True})[0], 201)
        self.assertEqual(self.call('POST', '/api/access-requests', {'name': 'Hyoga', 'email': 'hyoga@example.com'})[0], 201)
        st, view, _, _ = self.call('GET', '/api/admin/overview', cookie=admin)
        req = [r for r in view['requests'] if r['email'] == 'hyoga@example.com']
        self.assertEqual(len(req), 1)
        self.assertEqual(self.call('POST', f"/api/admin/requests/{req[0]['id']}/approve", cookie=admin)[0], 200)
        self.assertTrue(reg('hyoga@example.com', 'Cygnus_Hyoga'))
        # suspensão derruba a sessão e bloqueia o login
        self.assertEqual(self.call('POST', '/api/admin/users/Ikki_Player/suspend', cookie=admin)[0], 200)
        self.assertEqual(self.call('GET', '/api/me', cookie=player)[0], 401)
        st, body, _, _ = self.call('POST', '/api/auth/login', {'email': 'f@example.com', 'password': 'x' * 12})
        self.assertEqual((st, body['error']), (403, server.SUSPENDED))
        self.assertEqual(self.call('POST', '/api/admin/users/Ikki_Player/restore', cookie=admin)[0], 200)
        self.assertEqual(self.call('POST', '/api/auth/login', {'email': 'f@example.com', 'password': 'x' * 12})[0], 200)
        self.assertEqual(self.call('POST', '/api/admin/users/Athena_Adm/suspend', cookie=admin)[0], 400)

    def test_desafio(self):
        import http.server
        created, results = [], {}
        class Arena(http.server.BaseHTTPRequestHandler):  # arena-server falso
            def log_message(self, *a): pass
            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                created.append((self.headers.get('X-Arena-Secret'), body['players']))
                self.send_response(201); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(b'{"id": "match12345"}')
            def do_GET(self):
                self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers()
                self.wfile.write(json.dumps({'victory': results.get('v')}).encode())
        fake = http.server.HTTPServer(('127.0.0.1', 0), Arena)
        threading.Thread(target=fake.serve_forever, daemon=True).start()
        server.ARENA_URL, server.ARENA_SECRET = f'http://127.0.0.1:{fake.server_address[1]}', 's3cret'
        reg = lambda email, user: self.call('POST', '/api/auth/register', {'email': email, 'name': user + ' Name', 'username': user, 'country': 'BR', 'password': 'x' * 12, 'accept_terms': True})[2]
        a, b = reg('g@example.com', 'Aiolos_G'), reg('h@example.com', 'Aiolia_H')
        code = self.call('GET', '/api/me', cookie=b)[1]['friend_code']
        self.call('POST', '/api/friends/requests', {'code': code}, cookie=a)
        rid = self.call('GET', '/api/friends', cookie=b)[1]['incoming'][0]['id']
        self.call('POST', f'/api/friends/requests/{rid}/accept', cookie=b)
        deck = {'god': 'god-ares', 'main_deck': [{'card_id': 'x', 'quantity': 1}]}
        self.assertEqual(self.call('POST', '/api/challenges', {'to': 'Aiolia_H', 'deck': deck}, cookie=a)[0], 409)  # offline
        self.call('POST', '/api/presence', {}, cookie=b)
        st, ch, _, _ = self.call('POST', '/api/challenges', {'to': 'Aiolia_H', 'deck': deck}, cookie=a)
        self.assertEqual(st, 201)
        pend = self.call('GET', '/api/challenges/pending', cookie=b)[1]['challenges']
        self.assertEqual((pend[0]['id'], pend[0]['from']), (ch['id'], 'Aiolos_G'))
        msgs = self.call('GET', '/api/chat/Aiolos_G', cookie=b)[1]['messages']
        self.assertEqual(msgs[-1]['challenge']['status'], 'pending')
        self.assertEqual(self.call('POST', f"/api/challenges/{ch['id']}/accept", {'deck': deck}, cookie=a)[0], 404)  # quem desafiou não aceita
        st, acc, _, _ = self.call('POST', f"/api/challenges/{ch['id']}/accept", {'deck': deck}, cookie=b)
        self.assertEqual((st, acc['match']), (200, 'match12345'))
        self.assertEqual(created[0], ('s3cret', {'A': 'Aiolos_G', 'B': 'Aiolia_H'}))
        mine = self.call('GET', '/api/challenges/pending', cookie=a)[1]['challenges']
        self.assertEqual((mine[0]['status'], mine[0]['match']), ('accepted', 'match12345'))
        results['v'] = {'winner': 'B', 'reason': 'soul'}
        msgs = self.call('GET', '/api/chat/Aiolia_H', cookie=a)[1]['messages']
        self.assertEqual((msgs[-1]['kind'], msgs[-1]['body']), ('result', '🏆 Aiolia_H won the duel.'))
        self.assertEqual(self.call('POST', f"/api/challenges/{ch['id']}/decline", cookie=b)[0], 409)
        self.call('GET', '/api/chat/Aiolia_H', cookie=a)  # reler o chat não duplica o duelo
        # perfil: contagem única, adversário, God e data
        st, p, _, _ = self.call('GET', '/api/profile/aiolia_h', cookie=a)
        self.assertEqual((st, p['username'], p['stats']), (200, 'Aiolia_H', {'played': 1, 'wins': 1, 'losses': 0, 'winrate': 100}))
        self.assertEqual((p['recent'][0]['opponent'], p['recent'][0]['result'], p['recent'][0]['god']), ('Aiolos_G', 'win', 'god-ares'))
        self.assertEqual(self.call('GET', '/api/profile/Aiolos_G', cookie=b)[1]['stats']['losses'], 1)
        self.assertEqual(self.call('GET', '/api/profile/Aiolia_H')[0], 401)  # só logado
        r = self.call('GET', '/api/rank', cookie=b)[1]
        self.assertEqual((r['tier'], r['division'], r['pips'], r['xp']), ('Steel', 4, 2, 100))  # vitória online: +2 pips no Steel, 100 XP
        self.assertEqual(self.call('GET', '/api/profile/Nobody_X', cookie=a)[0], 404)
        # bloqueado: o perfil some
        self.call('POST', '/api/blocks', {'username': 'Aiolia_H'}, cookie=a)
        self.assertEqual(self.call('GET', '/api/profile/Aiolia_H', cookie=a)[0], 404)
        # apagar a conta de A: tira os dados dele e anonimiza A no histórico de B
        server.db.execute("insert into login_attempts values ('g@example.com', '1.1.1.1', ?)", (2 * 10**9,))
        server.db.execute("insert into access_requests (email, name, news, ip, created_at) values ('g@example.com', 'G', 0, '1.1.1.1', 1)")
        self.assertEqual(self.call('DELETE', '/api/me', {'password': 'x' * 12}, cookie=a)[0], 200)
        q = lambda t, w: server.db.execute(f'select count(*) from {t} where {w}').fetchone()[0]
        self.assertEqual((q('challenges', '1=1'), q('login_attempts', "email = 'g@example.com'"), q('access_requests', "email = 'g@example.com'")), (0, 0, 0))
        p = self.call('GET', '/api/profile/Aiolia_H', cookie=b)[1]
        self.assertEqual((p['stats']['played'], p['recent'][0]['opponent']), (1, 'Deleted player'))
        fake.shutdown()

    def test_climb(self):
        now = 1793491200 + 10 * 86400  # 11/11/2026: temporada 2026-11
        c = lambda rs: server.climb([(now - 60, r) for r in rs], now)
        self.assertEqual({k: c([])[k] for k in ('tier', 'division', 'pips', 'season')}, {'tier': 'Steel', 'division': 4, 'pips': 0, 'season': '2026-11'})
        self.assertEqual(c(['loss', 'loss'])['pips'], 0)  # Steel não perde pip
        r = c(['win'] * 3)
        self.assertEqual((r['tier'], r['division'], r['pips']), ('Steel', 3, 0))  # +2 por vitória, 6 pips sobem a divisão
        r = c(['win'] * 12 + ['win'] * 2 + ['loss'])  # Iron IV: +1 vitória, -1 derrota
        self.assertEqual((r['tier'], r['division'], r['pips']), ('Iron', 4, 1))
        r = c(['win'] * 12 + ['loss'] * 5)
        self.assertEqual((r['tier'], r['division'], r['pips']), ('Iron', 4, 0))  # proteção de tier
        r = c(['win'] * 12 + ['win'] * 6 + ['loss'])
        self.assertEqual((r['tier'], r['division'], r['pips']), ('Iron', 4, 5))  # perde a divisão, volta com 5 pips
        r = c(['win'] * (12 + 24 * 4) + ['win', 'win', 'loss', 'loss', 'loss'])
        self.assertEqual((r['tier'], r['division'], r['points']), ('Kamui', None, 0))  # Kamui: pontos, mínimo 0, sem queda
        old = server.climb([(now - 40 * 86400, 'win')] * (12 + 24 * 4) + [(now - 60, 'draw')], now)
        self.assertEqual((old['tier'], old['division'], old['last_season']), ('Gold', 4, {'tier': 'Kamui', 'division': None}))  # virada: um tier abaixo
        fixed = server.climb([(now - 40 * 86400, 'loss'), (now - 60, 'loss')], now, floor=server.KAMUI)
        self.assertEqual((fixed['tier'], fixed['division'], fixed['points']), ('Kamui', None, 0))  # conta fixada: não cai de Kamui
        self.assertEqual(server.level_of(5200), {'xp': 5200, 'level': 6, 'xp_in_level': 200, 'xp_level_size': 1000, 'title': 'Trainee'})

    def test_rank_api(self):
        server.db.execute("insert or ignore into invites values ('rank@example.com', 1)")
        c = self.call('POST', '/api/auth/register', {'email': 'rank@example.com', 'name': 'R Name', 'username': 'Mu_Rank', 'country': 'BR', 'password': 'x' * 12, 'accept_terms': True})[2]
        self.assertEqual(self.call('GET', '/api/rank')[0], 401)
        st, r, _, _ = self.call('GET', '/api/rank', cookie=c)
        self.assertEqual((st, r['tier'], r['level'], r['xp'], r['ai_xp_cap']), (200, 'Steel', 1, 0, 500))
        self.assertEqual(self.call('POST', '/api/xp/ai', {'result': 'cheat'}, cookie=c)[0], 400)
        gains = [self.call('POST', '/api/xp/ai', {'result': 'win'}, cookie=c)[1]['gained'] for _ in range(11)]
        self.assertEqual((sum(gains), gains[-1]), (500, 0))  # teto diário contra a IA
        r = self.call('GET', '/api/rank', cookie=c)[1]
        self.assertEqual((r['xp'], r['tier'], r['pips'], r['ai_xp_today']), (500, 'Steel', 0, 500))  # IA não mexe no rank
        p = self.call('GET', '/api/profile/Mu_Rank', cookie=c)[1]
        self.assertEqual(p['rank']['tier'], 'Steel')
        done = {a['id'] for a in p['achievements'] if a['done']}
        self.assertEqual(done, {'ai-1', 'ai-10'})  # 10 vitórias com XP contra a IA (a 11ª bateu no teto e não conta)

    def test_economia(self):
        reg = lambda email, user: self.call('POST', '/api/auth/register', {'email': email, 'name': user + ' Name', 'username': user, 'country': 'BR', 'password': 'x' * 12, 'accept_terms': True})[2]
        server.ADMINS.add('econ-adm@example.com')
        for e in ('econ@example.com', 'econ-adm@example.com'):
            server.db.execute('insert or ignore into invites values (?, 1)', (e,))
        c, adm = reg('econ@example.com', 'Seiya_Econ'), reg('econ-adm@example.com', 'Saga_Adm')
        self.assertEqual(self.call('GET', '/api/economy')[0], 401)
        e = self.call('GET', '/api/economy', cookie=c)[1]
        self.assertEqual((e['coins'], e['boosters'], e['full_access'], sum(e['collection'].values())), (0, 3, False, 300))  # boas-vindas
        self.assertEqual(self.call('GET', '/api/economy', cookie=c)[1]['boosters'], 3)  # boas-vindas uma vez só
        self.assertEqual(self.call('POST', '/api/store/buy', {'item': 'booster'}, cookie=c)[0], 400)  # sem coins
        st, o, _, _ = self.call('POST', '/api/boosters/open', cookie=c)
        rar = [x['rarity'] for x in o['cards']]
        self.assertEqual((st, len(rar), rar.count('Common'), rar.count('Uncommon'), o['boosters']), (200, 14, 10, 3, 2))
        self.assertIn(rar[-1], ('Legendary', 'Divine'))
        self.assertTrue(all(n <= 3 for n in o['collection'].values()))
        self.assertEqual(o['coins'], sum(x['coins'] for x in o['cards']))  # repetidas acima de 3 viram coins
        # Star Hill: dar coins exige motivo; acesso total; boosters
        self.assertEqual(self.call('POST', '/api/admin/users/Seiya_Econ/economy', {'coins': 1000}, cookie=c)[0], 403)
        self.assertEqual(self.call('POST', '/api/admin/users/Seiya_Econ/economy', {'coins': 1000}, cookie=adm)[0], 400)
        st, r, _, _ = self.call('POST', '/api/admin/users/Seiya_Econ/economy', {'coins': 1000, 'reason': 'test', 'full_access': True, 'boosters': -9}, cookie=adm)
        self.assertEqual((st, r['coins'] - o['coins'], r['full_access'], r['boosters']), (200, 1000, True, 0))
        b = self.call('POST', '/api/store/buy', {'item': 'booster'}, cookie=c)[1]
        self.assertEqual((b['coins'], b['boosters']), (r['coins'] - 1000, 1))
        users = {u['username']: u for u in self.call('GET', '/api/admin/overview', cookie=adm)[1]['users']}
        self.assertEqual((users['Seiya_Econ']['boosters'], users['Seiya_Econ']['full_access']), (1, True))
        # pacotes com desconto (1/3/10/25: 0/5/10/20%) e abrir até 10 de uma vez
        self.assertEqual([(x['qty'], x['price']) for x in b['prices']['bundles']], [(1, 1000), (3, 2850), (10, 9000), (25, 20000)])
        self.assertEqual(self.call('POST', '/api/store/buy', {'item': 'booster', 'qty': 7}, cookie=c)[0], 400)
        self.call('POST', '/api/admin/users/Seiya_Econ/economy', {'coins': 20000, 'reason': 'test'}, cookie=adm)
        before = self.call('GET', '/api/economy', cookie=c)[1]['coins']
        b = self.call('POST', '/api/store/buy', {'item': 'booster', 'qty': 25}, cookie=c)[1]
        self.assertEqual((before - b['coins'], b['boosters']), (20000, 26))
        self.assertEqual(self.call('POST', '/api/boosters/open', {'count': 11}, cookie=c)[0], 400)
        o = self.call('POST', '/api/boosters/open', {'count': 10}, cookie=c)[1]
        self.assertEqual((len(o['packs']), len(o['cards']), o['boosters']), (10, 140, 16))
        self.call('POST', '/api/admin/users/Seiya_Econ/economy', {'boosters': -14}, cookie=adm)
        o = self.call('POST', '/api/boosters/open', {'count': 10}, cookie=c)[1]  # "Open all (2)"
        self.assertEqual((len(o['packs']), o['boosters']), (2, 0))
        # cosméticos: avatar e sleeve por personagem, set com -20%; usar só o que tem
        cos = {i['id']: i for g in o['cosmetics'] for i in g['items']}
        self.assertEqual((cos['god-hades']['avatar']['price'], cos['god-hades']['sleeve']['price'], cos['athena-v6-001']['set']), (0, 3000, 1600))
        self.assertTrue(cos['god-hades']['avatar']['owned'])
        self.assertTrue(all('-ref' not in i for i in cos))
        server.db.execute("update users set full_access = 0 where username = 'seiya_econ'")
        self.assertEqual(self.call('PATCH', '/api/me', {'sleeve': 'athena-v6-001'}, cookie=c)[0], 400)  # ainda não comprou
        self.assertEqual(self.call('POST', '/api/store/buy', {'item': 'sleeve', 'id': 'nope'}, cookie=c)[0], 400)
        self.call('POST', '/api/admin/users/Seiya_Econ/economy', {'coins': 10000, 'reason': 'test'}, cookie=adm)
        before = self.call('GET', '/api/economy', cookie=c)[1]['coins']
        e = self.call('POST', '/api/store/buy', {'item': 'avatar', 'id': 'athena-v6-001'}, cookie=c)[1]
        self.assertEqual(before - e['coins'], 500)
        self.assertEqual(self.call('POST', '/api/store/buy', {'item': 'avatar', 'id': 'athena-v6-001'}, cookie=c)[0], 400)  # já tem
        e = self.call('POST', '/api/store/buy', {'item': 'set', 'id': 'athena-v6-001'}, cookie=c)[1]  # set: paga só o que falta
        self.assertEqual(before - e['coins'], 2000)
        st, me, _, _ = self.call('PATCH', '/api/me', {'sleeve': 'athena-v6-001', 'avatar_card': 'athena-v6-001'}, cookie=c)
        self.assertEqual((st, me['sleeve'], me['avatar_card']), (200, 'athena-v6-001', 'athena-v6-001'))
        self.assertEqual(self.call('POST', '/api/store/buy', {'item': 'set', 'id': 'god-ares'}, cookie=c)[0], 400)  # Deus: avatar grátis, sem set
        # moeda do cara ou coroa: cosmético à parte, fora do set; só equipa quem tem; o oponente vê no perfil
        self.assertEqual(self.call('PATCH', '/api/me', {'coin': 'athena-v6-001'}, cookie=c)[0], 400)
        have = self.call('GET', '/api/economy', cookie=c)[1]['coins']
        e = self.call('POST', '/api/store/buy', {'item': 'coin', 'id': 'athena-v6-001'}, cookie=c)[1]
        self.assertEqual(have - e['coins'], 1000)
        self.assertEqual(self.call('PATCH', '/api/me', {'coin': 'athena-v6-001'}, cookie=c)[1]['coin'], 'athena-v6-001')
        self.assertEqual(self.call('GET', '/api/profile/Seiya_Econ', cookie=c)[1]['coin'], 'athena-v6-001')
        self.assertEqual(self.call('GET', '/api/profile/Saga_Adm', cookie=c)[0], 200)
        # duelo online: deck com carta que não tem é recusado; acesso total libera
        rare = next(cid for cid in server.CATALOG['booster']['Divine'] if cid not in server.CATALOG['starter'])
        with server.lock:
            other = server.db.execute("select id from users where username = 'saga_adm'").fetchone()[0]
            self.assertEqual(server.missing_cards(other, {'main_deck': [{'card_id': rare, 'quantity': 3}]}), [rare])
            self.assertEqual(server.missing_cards(other, {'main_deck': [{'card_id': 'athena-v6-001', 'quantity': 3}]}), [])
        # mil pacotes: Divine perto de 1 em 8, nunca God nem Domain
        uid = server.db.execute("select id from users where username = 'seiya_econ'").fetchone()[0]
        with server.lock:
            tops = [server.open_pack(uid)[-1]['rarity'] for _ in range(800)]
        self.assertTrue(60 < tops.count('Divine') < 150, tops.count('Divine'))

    def test_decks_limites(self):
        server.db.execute("insert or ignore into invites values ('decks@example.com', 1)")
        c = self.call('POST', '/api/auth/register', {'email': 'decks@example.com', 'name': 'F Name', 'username': 'Shura_F', 'country': 'BR', 'password': 'x' * 12, 'accept_terms': True})[2]
        self.assertEqual(self.call('PUT', '/api/decks/d1', {'data': {'main_deck': 'x'}, 'revision': 0}, cookie=c)[0], 400)
        self.assertEqual(self.call('PUT', '/api/decks/d1', {'data': {'main_deck': []}, 'revision': 0}, cookie=c)[0], 200)
        server.MAX_DECKS = 1
        try:
            self.assertEqual(self.call('PUT', '/api/decks/d2', {'data': {'main_deck': []}, 'revision': 0}, cookie=c)[0], 400)
            self.assertEqual(self.call('PUT', '/api/decks/d1', {'data': {'main_deck': []}, 'revision': 1}, cookie=c)[0], 200)  # editar não conta
        finally:
            server.MAX_DECKS = 100


if __name__ == '__main__':
    unittest.main()
