"""Testes da plataforma 4.0: python3.12 -m unittest sanctuary-api/test_cosmo.py (critérios de aceite em docs/platform-4.0.md)."""
import hashlib, json, os, shutil, sqlite3, subprocess, sys, tempfile, threading, unittest, urllib.request
from pathlib import Path
from urllib.error import HTTPError

os.environ.setdefault('SANCTUARY_INSECURE_COOKIE', '1')
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import cosmo, cosmo_pairing as pairing, server  # noqa: E402

ORIGIN = server.ORIGIN
P = '/api/platform'


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.main_path = os.path.join(cls.tmp.name, 'main.db')
        server.open_db(cls.main_path)
        cosmo.REGISTRY_DIR = ROOT / 'data/registry'
        server.ADMINS.add('dev@example.com')
        cls.httpd = server.make_server(0, '127.0.0.1')
        cls.base = f'http://127.0.0.1:{cls.httpd.server_address[1]}'
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()
        cls.users = {}
        for name in ('dev', 'ana', 'bia', 'caio', 'duda', 'edu'):
            cls.users[name] = cls.signup(name)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        server.db.close()
        cosmo.conn.close()
        cosmo.main.close()
        cls.tmp.cleanup()

    @classmethod
    def raw(cls, method, path, body=None, cookie=None, origin=ORIGIN):
        req = urllib.request.Request(cls.base + path, method=method, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
        if origin:
            req.add_header('Origin', origin)
        if cookie:
            req.add_header('Cookie', cookie)
        try:
            r = urllib.request.urlopen(req)
        except HTTPError as e:
            r = e
        data = r.read()
        return r.status, json.loads(data) if data else None, r.headers.get('Set-Cookie') or ''

    @classmethod
    def signup(cls, name):
        email = f'{name}@example.com'
        server.db.execute('insert or ignore into invites values (?, 0)', (email,))
        st, _, cookie = cls.raw('POST', '/api/auth/register', {'email': email, 'name': name.title(), 'username': name.title() + '_x', 'country': 'BR', 'password': 'x' * 12, 'accept_terms': True})
        assert st == 201, st
        return cookie.split(';')[0]

    def as_(self, who, method, path, body=None):
        return self.raw(method, P + path, body, cookie=self.users.get(who))

    def deck(self, who, deck_id='d1', name='Athena Control', cards=None):
        st, _, _ = self.raw('PUT', f'/api/decks/{deck_id}', {'data': {'name': name, 'god': 'Athena', 'main_deck': cards or ['a', 'b']}, 'revision': 0}, cookie=self.users[who])
        self.assertIn(st, (200, 201))


class Isolation(Base):
    def main_digest(self):
        rows = {}
        for table in ('decks', 'coin_ledger', 'collection', 'duels'):
            rows[table] = [tuple(r) for r in server.db.execute(f'select * from {table}')]
        return rows

    def test_banco_de_contas_e_so_leitura(self):
        with self.assertRaises(sqlite3.OperationalError):
            cosmo.main.execute("update users set email = 'x'")
        self.assertNotEqual(Path(self.main_path), Path(self.main_path).with_name(f'platform-{cosmo.ENV}.db'))
        with self.assertRaises(RuntimeError):
            cosmo.open_db(self.main_path, self.main_path)

    def test_plataforma_nao_altera_dados_reais(self):
        self.deck('ana', 'iso')
        before = self.main_digest()
        st, shared, _ = self.as_('ana', 'POST', '/decks', {'deck_id': 'iso', 'visibility': 'public'})
        self.assertEqual(st, 200)
        self.as_('bia', 'POST', f'/decks/{shared["id"]}/rate', {'stars': 5})
        st, g, _ = self.as_('edu', 'POST', '/guilds', {'name': 'Iso', 'tag': 'ISO'})
        self.as_('dev', 'POST', f'/guilds/{g["id"]}/xp', {'key': 'iso-1', 'amount': 10, 'reason': 'teste'})
        st, t, _ = self.as_('ana', 'POST', '/tournaments', {'name': 'Iso', 'format': 'swiss'})
        self.as_('ana', 'POST', f'/tournaments/{t["id"]}/register', {'deck_id': 'iso'})
        self.assertEqual(self.main_digest(), before)

    def test_ambiente_fora_do_playtest_fecha(self):
        env, cosmo.ENV = cosmo.ENV, 'official'
        try:
            self.assertEqual(self.raw('GET', P + '/health')[0], 503)
        finally:
            cosmo.ENV = env
        self.assertEqual(self.raw('GET', P + '/health')[1]['environment'], 'playtest')

    def test_meta_oficial_nao_recebe_playtest(self):
        server.db.execute("insert into duels (challenge_id, winner, a_god, b_god, finished_at) values (900, 'a', 'Athena', 'Hades', 1)")
        st, body, _ = self.as_('ana', 'GET', '/meta')
        self.assertEqual((st, body['official'], body['environment']), (200, None, 'playtest'))
        athena = next(g for g in body['gods'] if g['god'] == 'Athena')
        self.assertIsNone(athena['win_rate'])  # amostra pequena não vira conclusão
        self.assertFalse(athena['sample_ok'])


class Permissions(Base):
    def test_ninguem_se_promove(self):
        self.assertEqual(self.as_('ana', 'POST', '/roles', {'username': 'Ana_x', 'role': 'publisher'})[0], 403)
        self.assertEqual(self.as_('ana', 'GET', '/console')[0], 403)
        self.assertEqual(self.as_('ana', 'GET', '/audit')[0], 403)
        self.assertEqual(self.raw('GET', P + '/console')[0], 401)
        self.assertEqual(self.as_('ana', 'POST', '/content', {'kind': 'news', 'slug': 'x-1', 'title': 't', 'body': 'b'})[0], 403)
        self.assertEqual(self.as_('ana', 'POST', '/tournaments', {'name': 'X', 'format': 'swiss', 'category': 'official'})[0], 403)
        st, g, _ = self.as_('dev', 'POST', '/guilds', {'name': 'Perm', 'tag': 'PERM'})
        self.assertEqual(self.as_('ana', 'POST', f'/guilds/{g["id"]}/xp', {'key': 'k', 'amount': 1, 'reason': 'r'})[0], 403)

    def test_origem_estranha_barrada(self):
        st, _, _ = self.raw('POST', P + '/comments', {'target': 'deck:x', 'body': 'x'}, cookie=self.users['ana'], origin='https://evil.test')
        self.assertEqual(st, 403)

    def test_console_e_auditoria(self):
        st, body, _ = self.as_('dev', 'GET', '/console')
        self.assertEqual((st, body['environment'], body['database'], body['official']['promotion']), (200, 'playtest', 'ok', 'blocked'))
        self.assertEqual(self.as_('dev', 'POST', '/roles', {'username': 'Bia_x', 'role': 'moderator'})[0], 200)
        entries = self.as_('dev', 'GET', '/audit')[1]['entries']
        self.assertTrue(any(e['action'] == 'role.grant' for e in entries))


class Cms(Base):
    def test_rascunho_e_home(self):
        st, c, _ = self.as_('dev', 'POST', '/content', {'kind': 'news', 'slug': 'hello-cosmo', 'title': 'Hello', 'body': 'Texto', 'featured': True})
        self.assertEqual(st, 201)
        self.assertEqual(self.raw('GET', P + '/content/hello-cosmo')[0], 404)  # rascunho não vaza
        self.assertEqual(self.raw('GET', P + '/content?all=1')[0], 403)
        self.assertEqual(self.raw('GET', P + '/home')[1]['news'], [])
        self.assertEqual(self.as_('dev', 'POST', f'/content/{c["id"]}/publish', {})[0], 200)
        home = self.raw('GET', P + '/home')[1]
        self.assertEqual(home['news'][0]['slug'], 'hello-cosmo')
        self.assertEqual(self.as_('dev', 'PATCH', f'/content/{c["id"]}', {'title': 'Hello 2'})[1]['revision'], 2)
        self.assertEqual(len(self.raw('GET', P + '/content/hello-cosmo')[1]['revisions']), 2)

    def test_agendado_nao_aparece(self):
        st, c, _ = self.as_('dev', 'POST', '/content', {'kind': 'news', 'slug': 'futuro', 'title': 'F', 'body': 'B'})
        self.as_('dev', 'POST', f'/content/{c["id"]}/publish', {'publish_at': 4102444800})
        self.assertEqual(self.raw('GET', P + '/content/futuro')[0], 404)

    def test_ruling_valida_referencia_canonica(self):
        st, c, _ = self.as_('dev', 'POST', '/content', {'kind': 'ruling', 'slug': 'ruling-falso', 'title': 'R', 'body': 'B', 'meta': {'rule_refs': ['R-999']}})
        self.assertEqual(self.as_('dev', 'POST', f'/content/{c["id"]}/publish', {})[0], 400)
        st, c, _ = self.as_('dev', 'POST', '/content', {'kind': 'ruling', 'slug': 'ruling-ok', 'title': 'R', 'body': 'B', 'meta': {'rule_refs': ['R-12']}})
        self.assertEqual(self.as_('dev', 'POST', f'/content/{c["id"]}/publish', {})[0], 200)

    def test_registro_ilegivel_bloqueia_publicacao(self):
        st, c, _ = self.as_('dev', 'POST', '/content', {'kind': 'ruling', 'slug': 'sem-registro', 'title': 'R', 'body': 'B', 'meta': {'rule_refs': ['R-12']}})
        saved, cosmo.REGISTRY_DIR = cosmo.REGISTRY_DIR, Path('/nao/existe')
        try:
            self.assertEqual(self.as_('dev', 'POST', f'/content/{c["id"]}/publish', {})[0], 503)
        finally:
            cosmo.REGISTRY_DIR = saved

    def test_publisher_nao_publica_ruling(self):
        self.as_('dev', 'POST', '/roles', {'username': 'Caio_x', 'role': 'publisher'})
        st, c, _ = self.as_('caio', 'POST', '/content', {'kind': 'ruling', 'slug': 'ruling-caio', 'title': 'R', 'body': 'B', 'meta': {'rule_refs': ['R-12']}})
        self.assertEqual(self.as_('caio', 'POST', f'/content/{c["id"]}/publish', {})[0], 403)

    def test_balance_exige_campos(self):
        st, c, _ = self.as_('dev', 'POST', '/content', {'kind': 'balance', 'slug': 'nerf-x', 'title': 'N', 'body': 'B', 'meta': {'card_refs': ['athena-v6-001']}})
        self.assertEqual(self.as_('dev', 'POST', f'/content/{c["id"]}/publish', {})[0], 400)


class Decks(Base):
    def test_visibilidade(self):
        self.deck('ana', 'priv')
        sid = self.as_('ana', 'POST', '/decks', {'deck_id': 'priv', 'visibility': 'private'})[1]['id']
        self.assertEqual(self.as_('ana', 'GET', f'/decks/{sid}')[0], 200)
        for who in ('bia', None):
            self.assertEqual(self.as_(who, 'GET', f'/decks/{sid}')[0], 404)
        self.assertEqual(self.as_('bia', 'POST', f'/decks/{sid}/rate', {'stars': 1})[0], 404)
        self.assertEqual(self.as_('bia', 'POST', f'/decks/{sid}/fork')[0], 404)
        self.assertEqual(self.as_('bia', 'POST', '/comments', {'target': f'deck:{sid}', 'body': 'oi'})[0], 404)
        self.assertEqual(self.as_('bia', 'PATCH', f'/decks/{sid}', {'visibility': 'public'})[0], 404)
        self.as_('ana', 'PATCH', f'/decks/{sid}', {'visibility': 'unlisted'})
        self.assertEqual(self.as_('bia', 'GET', f'/decks/{sid}')[0], 200)
        self.assertEqual(self.as_('bia', 'PATCH', f'/decks/{sid}', {'visibility': 'public'})[0], 403)
        self.assertNotIn(sid, [d['id'] for d in self.raw('GET', P + '/decks')[1]['decks']])
        self.as_('ana', 'PATCH', f'/decks/{sid}', {'visibility': 'public'})
        self.assertIn(sid, [d['id'] for d in self.raw('GET', P + '/decks')[1]['decks']])

    def test_deck_de_outro_nao_compartilha(self):
        self.deck('ana', 'so-ana')
        self.assertEqual(self.as_('bia', 'POST', '/decks', {'deck_id': 'so-ana', 'visibility': 'public'})[0], 404)

    def test_mesma_lista_web_e_jogo_e_historico(self):
        # O jogo e o site usam o mesmo /api/decks; a versão pública é cópia e guarda histórico.
        self.deck('caio', 'sync', cards=['a'])
        sid = self.as_('caio', 'POST', '/decks', {'deck_id': 'sync', 'visibility': 'public'})[1]['id']
        games = self.raw('GET', '/api/decks', cookie=self.users['caio'])[1]['decks']
        self.assertEqual([d['id'] for d in games], ['sync'])
        rev = games[0]['revision']
        self.raw('PUT', '/api/decks/sync', {'data': {'name': 'Athena Control', 'main_deck': ['a', 'z']}, 'revision': rev}, cookie=self.users['caio'])
        self.assertEqual(self.as_('bia', 'GET', f'/decks/{sid}')[1]['data']['main_deck'], ['a'])
        self.assertEqual(self.as_('caio', 'POST', '/decks', {'deck_id': 'sync', 'visibility': 'public'})[1]['version'], 2)
        body = self.as_('bia', 'GET', f'/decks/{sid}')[1]
        self.assertEqual((body['data']['main_deck'], len(body['versions'])), (['a', 'z'], 2))
        self.assertEqual(self.as_('bia', 'GET', f'/decks/{sid}?version=1')[1]['data']['main_deck'], ['a'])

    def test_publico_no_jogo_vai_sozinho_ao_hub_com_winrate(self):
        # Botão Public do builder (autor, 08/11/2026): salvar com public=true publica; lista nova vira versão; desligar esconde.
        put = lambda data, rev: self.raw('PUT', '/api/decks/auto', {'data': data, 'revision': rev}, cookie=self.users['edu'])[1]
        v1 = {'nome': 'Edu Aggro', 'god': 'god-ares', 'domain_id': 'x', 'main_deck': [{'card_id': 'a', 'quantity': 3}], 'public': True}
        put(v1, 0)
        mine = [d for d in self.as_('edu', 'GET', '/decks?mine=1')[1]['decks'] if d['name'].startswith('Edu')]
        self.assertEqual([(d['name'], d['visibility'], d['version']) for d in mine], [('Edu Aggro', 'public', 1)])
        sid = mine[0]['id']
        put({**v1, 'nome': 'Edu Aggro!'}, 1)  # só o nome mudou: mesma versão
        self.assertEqual(self.as_('bia', 'GET', f'/decks/{sid}')[1]['version'], 1)
        v2 = {**v1, 'main_deck': [{'card_id': 'a', 'quantity': 2}]}
        put(v2, 2)
        self.assertEqual(self.as_('bia', 'GET', f'/decks/{sid}')[1]['version'], 2)
        edu = server.db.execute("select id from users where email = 'edu@example.com'").fetchone()[0]
        h1, h2 = cosmo.deck_hash(v1), cosmo.deck_hash(v2)
        for i, (side_hash, winner) in enumerate([(h1, 'a'), (h2, 'a'), (h2, 'b')]):
            server.db.execute('insert into duels (challenge_id, a_id, b_id, winner, a_god, b_god, finished_at, a_hash, b_hash) values (?, ?, 0, ?, ?, ?, 1, ?, ?)',
                              (800 + i, edu, winner, 'god-ares', 'god-hades', side_hash, 'outro'))
        stats = self.raw('GET', f'{P}/decks/{sid}')[1]['stats']  # sem login: o Hub é público
        self.assertEqual((stats['matches'], stats['wins'], stats['current_version']['matches'], stats['current_version']['wins']), (3, 2, 2, 1))
        put({**v2, 'public': False}, 3)
        self.assertEqual(self.raw('GET', f'{P}/decks/{sid}')[0], 404)
        put(v2 | {'public': True}, 4)
        self.raw('DELETE', '/api/decks/auto', cookie=self.users['edu'])
        self.assertEqual(self.raw('GET', f'{P}/decks/{sid}')[0], 404)

    def test_comunidade(self):
        self.deck('duda', 'pub')
        sid = self.as_('duda', 'POST', '/decks', {'deck_id': 'pub', 'visibility': 'public'})[1]['id']
        self.assertEqual(self.as_('duda', 'POST', f'/decks/{sid}/rate', {'stars': 5})[0], 400)
        self.assertEqual(self.as_('bia', 'POST', f'/decks/{sid}/rate', {'stars': 9})[0], 400)
        self.as_('bia', 'POST', f'/decks/{sid}/rate', {'stars': 4})
        self.assertTrue(self.as_('bia', 'POST', f'/decks/{sid}/favorite')[1]['favorite'])
        self.assertEqual(self.as_('bia', 'POST', f'/decks/{sid}/fork')[1]['forked_from'], sid)
        target = f'deck:{sid}'
        top = self.as_('bia', 'POST', '/comments', {'target': target, 'body': 'Boa lista'})[1]['id']
        reply = self.as_('duda', 'POST', '/comments', {'target': target, 'body': 'Valeu', 'parent_id': top})[1]['id']
        self.assertEqual(self.as_('duda', 'POST', '/comments', {'target': target, 'body': 'x', 'parent_id': 99999})[0], 400)
        self.assertEqual(self.as_('bia', 'POST', f'/comments/{top}/vote', {'value': 1})[0], 400)
        self.as_('duda', 'POST', f'/comments/{top}/vote', {'value': 1})
        self.as_('edu', 'POST', f'/comments/{top}/vote', {'value': 1})
        self.as_('edu', 'POST', f'/comments/{top}/vote', {'value': -1})
        rows = self.raw('GET', P + f'/comments?target={target}&sort=top')[1]['comments']
        self.assertEqual({r['id']: r['score'] for r in rows}[top], 0)
        self.assertEqual({r['id']: r['parent_id'] for r in rows}[reply], top)
        self.assertEqual(self.as_('bia', 'GET', '/notifications')[1]['notifications'][0]['kind'], 'reply')
        self.assertEqual(self.as_('edu', 'DELETE', f'/comments/{reply}')[0], 403)
        self.as_('edu', 'POST', f'/comments/{reply}/report', {'reason': 'spam'})
        self.as_('dev', 'POST', '/roles', {'username': 'Caio_x', 'role': 'moderator'})
        self.assertEqual(len(self.as_('caio', 'GET', '/reports')[1]['reports']), 1)
        self.assertEqual(self.as_('edu', 'GET', '/reports')[0], 403)
        self.assertEqual(self.as_('caio', 'DELETE', f'/comments/{reply}')[0], 200)
        hidden = {r['id']: r for r in self.raw('GET', P + f'/comments?target={target}')[1]['comments']}[reply]
        self.assertEqual((hidden['body'], hidden['author']), (None, None))

    def test_limite_de_comentarios(self):
        self.deck('edu', 'rl')
        sid = self.as_('edu', 'POST', '/decks', {'deck_id': 'rl', 'visibility': 'public'})[1]['id']
        codes = [self.as_('edu', 'POST', '/comments', {'target': f'deck:{sid}', 'body': 'spam'})[0] for _ in range(11)]
        self.assertEqual(codes[-1], 429)


class Guilds(Base):
    def test_papeis_e_ledger(self):
        gid = self.as_('ana', 'POST', '/guilds', {'name': 'Pegasus', 'tag': 'peg'})[1]['id']
        self.assertEqual(self.as_('ana', 'POST', '/guilds', {'name': 'Outra', 'tag': 'OUT'})[0], 409)  # uma guilda por jogador
        self.assertEqual(self.as_('bia', 'POST', '/guilds', {'name': 'pegasus', 'tag': 'ZZZ'})[0], 409)
        rid = self.as_('bia', 'POST', f'/guilds/{gid}/apply', {'message': 'oi'})[1]['id']
        self.assertEqual(self.as_('bia', 'POST', f'/guilds/requests/{rid}/accept')[0], 403)  # não se aprova sozinha
        self.assertEqual(self.as_('ana', 'POST', f'/guilds/requests/{rid}/accept')[0], 200)
        self.assertEqual(self.as_('bia', 'POST', f'/guilds/{gid}/announcements', {'body': 'x'})[0], 403)
        self.assertEqual(self.as_('bia', 'POST', f'/guilds/{gid}/members/Bia_x/role', {'role': 'leader'})[0], 403)
        self.assertEqual(self.as_('bia', 'DELETE', f'/guilds/{gid}/members/Ana_x')[0], 403)
        self.assertEqual(self.as_('ana', 'POST', f'/guilds/{gid}/announcements', {'body': 'Bem-vindos'})[0], 201)
        self.assertEqual(self.as_('caio', 'GET', f'/guilds/{gid}')[1]['announcements'], [])
        self.assertEqual(self.as_('dev', 'POST', f'/guilds/{gid}/members/Bia_x/role', {'role': 'officer'})[0], 403)  # developer não vira líder
        self.assertEqual(self.as_('ana', 'POST', f'/guilds/{gid}/leave')[0], 409)
        team = self.as_('ana', 'POST', f'/guilds/{gid}/teams', {'name': 'Bronze', 'captain': 'Bia_x'})[1]['id']
        self.assertEqual(self.as_('caio', 'POST', f'/guilds/teams/{team}/members', {'username': 'Bia_x'})[0], 403)
        self.assertEqual(self.as_('ana', 'POST', f'/guilds/{gid}/teams', {'name': 'Fora', 'captain': 'Caio_x'})[0], 400)
        first = self.as_('dev', 'POST', f'/guilds/{gid}/xp', {'key': 'missao:1', 'amount': 100, 'reason': 'missão'})[1]
        again = self.as_('dev', 'POST', f'/guilds/{gid}/xp', {'key': 'missao:1', 'amount': 100, 'reason': 'missão'})[1]
        self.assertEqual((first['applied'], first['xp'], again['applied'], again['xp']), (True, 100, False, 100))
        self.assertEqual(self.as_('dev', 'POST', f'/guilds/{gid}/xp', {'key': 'missao:2', 'amount': 1000, 'reason': 'farm'})[0], 429)
        self.as_('ana', 'POST', f'/guilds/{gid}/members/Bia_x/role', {'role': 'leader'})
        roster = {m['name']: m['role'] for m in self.as_('ana', 'GET', f'/guilds/{gid}')[1]['members']}
        self.assertEqual(roster, {'Ana_x': 'officer', 'Bia_x': 'leader'})

    def test_guilda_privada(self):
        gid = self.as_('caio', 'POST', '/guilds', {'name': 'Sombra', 'tag': 'SOM', 'visibility': 'private'})[1]['id']
        self.assertEqual(self.as_('duda', 'GET', f'/guilds/{gid}')[0], 404)
        self.assertEqual(self.as_('duda', 'POST', f'/guilds/{gid}/apply')[0], 404)
        self.assertNotIn(gid, [g['id'] for g in self.raw('GET', P + '/guilds')[1]['guilds']])
        rid = self.as_('caio', 'POST', f'/guilds/{gid}/invites', {'username': 'Duda_x'})[1]['id']
        self.assertEqual(self.as_('edu', 'POST', f'/guilds/requests/{rid}/accept')[0], 403)
        self.assertEqual(self.as_('duda', 'GET', f'/guilds/{gid}')[0], 200)
        self.assertEqual(self.as_('duda', 'POST', f'/guilds/requests/{rid}/accept')[0], 200)


class Tournaments(Base):
    def event(self, players, **options):
        tid = self.as_('dev', 'POST', '/tournaments', {'name': 'Copa', **options})[1]['id']
        for p in players:
            self.assertEqual(self.as_(p, 'POST', f'/tournaments/{tid}/register', {})[0], 201)
        return tid

    def play_round(self, tid, names):
        info = self.as_('dev', 'GET', f'/tournaments/{tid}')[1]
        for m in info['matches']:
            if m['b'] and m['status'] == 'pending':
                self.assertEqual(self.as_(names[m['a']], 'POST', f'/matches/{m["id"]}/report', {'a_score': 2, 'b_score': 0})[1]['status'], 'reported')
                self.assertEqual(self.as_(names[m['b']], 'POST', f'/matches/{m["id"]}/report', {'a_score': 2, 'b_score': 0})[1]['status'], 'confirmed')

    NAMES = {'Ana_x': 'ana', 'Bia_x': 'bia', 'Caio_x': 'caio', 'Duda_x': 'duda', 'Edu_x': 'edu'}

    def test_swiss_fisico_sem_motor(self):
        tid = self.event(['ana', 'bia', 'caio', 'duda', 'edu'], format='swiss', mode='physical', location='Loja X')
        self.assertEqual(self.as_('ana', 'POST', f'/tournaments/{tid}/start')[0], 403)
        self.assertEqual(self.as_('dev', 'POST', f'/tournaments/{tid}/start')[1]['total_rounds'], 3)
        self.assertEqual(self.as_('dev', 'POST', f'/tournaments/{tid}/next-round')[0], 409)  # rodada aberta
        for round_no in range(3):
            self.play_round(tid, self.NAMES)
            if round_no < 2:
                self.assertEqual(self.as_('dev', 'POST', f'/tournaments/{tid}/next-round')[0], 200)
        self.assertEqual(self.as_('dev', 'POST', f'/tournaments/{tid}/next-round')[0], 409)
        self.assertEqual(self.as_('dev', 'POST', f'/tournaments/{tid}/close')[0], 200)
        info = self.raw('GET', P + f'/tournaments/{tid}')[1]
        self.assertEqual(info['policy']['status'], 'awaiting-author-approval')
        self.assertFalse(info['sanctioned'])
        self.assertEqual(len(info['standings']), 5)
        self.assertEqual(sum(1 for m in info['matches'] if m['b'] is None), 3)  # um bye por rodada
        byes = [m['a'] for m in info['matches'] if m['b'] is None]
        self.assertEqual(len(set(byes)), 3)  # ninguém repete bye
        pairs = [frozenset((m['a'], m['b'])) for m in info['matches'] if m['b']]
        self.assertEqual(len(pairs), len(set(pairs)))  # sem revanche
        actions = [e['action'] for e in self.as_('dev', 'GET', f'/tournaments/{tid}/audit')[1]['entries']]
        self.assertIn('match.confirmed', actions)
        self.assertEqual(self.as_('ana', 'GET', f'/tournaments/{tid}/audit')[0], 403)

    def test_disputa_e_snapshot(self):
        self.deck('ana', 'torneio', cards=['x'])
        tid = self.as_('dev', 'POST', '/tournaments', {'name': 'Snap', 'format': 'single_elimination', 'deck_required': True})[1]['id']
        self.assertEqual(self.as_('bia', 'POST', f'/tournaments/{tid}/register', {'deck_id': 'nao-existe'})[0], 404)
        st, reg, _ = self.as_('ana', 'POST', f'/tournaments/{tid}/register', {'deck_id': 'torneio'})
        self.assertEqual(st, 201)
        self.assertEqual(self.as_('ana', 'POST', f'/tournaments/{tid}/register', {'deck_id': 'torneio'})[0], 409)
        self.deck('bia', 'dela')
        self.as_('bia', 'POST', f'/tournaments/{tid}/register', {'deck_id': 'dela'})
        rev = self.raw('GET', '/api/decks', cookie=self.users['ana'])[1]['decks'][0]['revision']
        self.raw('PUT', '/api/decks/torneio', {'data': {'main_deck': ['mudou']}, 'revision': rev}, cookie=self.users['ana'])
        seat = next(p for p in self.as_('ana', 'GET', f'/tournaments/{tid}')[1]['participants'] if p['name'] == 'Ana_x')
        self.assertEqual((seat['deck']['main_deck'], seat['deck_hash']), (['x'], reg['deck_hash']))
        other = next(p for p in self.as_('bia', 'GET', f'/tournaments/{tid}')[1]['participants'] if p['name'] == 'Ana_x')
        self.assertNotIn('deck', other)  # lista fechada só para o dono e a organização
        self.as_('dev', 'POST', f'/tournaments/{tid}/start')
        m = self.as_('dev', 'GET', f'/tournaments/{tid}')[1]['matches'][0]
        self.assertEqual(self.as_('caio', 'POST', f'/matches/{m["id"]}/report', {'a_score': 9, 'b_score': 0})[0], 403)
        self.assertEqual(self.as_('ana', 'POST', f'/matches/{m["id"]}/report', {'a_score': 2, 'b_score': 0})[1]['status'], 'reported')
        self.assertEqual(self.as_('ana', 'POST', f'/matches/{m["id"]}/report', {'a_score': 2, 'b_score': 0})[0], 409)
        self.assertEqual(self.as_('bia', 'POST', f'/matches/{m["id"]}/report', {'a_score': 0, 'b_score': 2})[1]['status'], 'disputed')
        self.assertEqual(self.as_('dev', 'POST', f'/tournaments/{tid}/close')[0], 409)
        self.assertEqual(self.as_('ana', 'POST', f'/matches/{m["id"]}/resolve', {'a_score': 2, 'b_score': 0})[0], 403)
        self.assertEqual(self.as_('dev', 'POST', f'/matches/{m["id"]}/resolve', {'a_score': 2, 'b_score': 1})[1]['status'], 'confirmed')
        self.assertEqual(self.as_('dev', 'POST', f'/tournaments/{tid}/next-round')[0], 409)  # final já jogada
        winner = self.raw('GET', P + f'/tournaments/{tid}')[1]['standings'][0]
        self.assertEqual(winner['wins'], 1)

    def test_round_robin(self):
        tid = self.event(['ana', 'bia', 'caio', 'duda'], format='round_robin')
        self.assertEqual(self.as_('dev', 'POST', f'/tournaments/{tid}/start')[1]['total_rounds'], 3)
        for round_no in range(3):
            self.play_round(tid, self.NAMES)
            if round_no < 2:
                self.as_('dev', 'POST', f'/tournaments/{tid}/next-round')
        table = self.raw('GET', P + f'/tournaments/{tid}')[1]['standings']
        self.assertEqual(sum(r['wins'] for r in table), 6)


class PairingUnit(unittest.TestCase):
    def test_round_robin_todos_contra_todos(self):
        for n in (2, 3, 4, 5, 8):
            rounds = pairing.round_robin_schedule(list(range(n)))
            games = [frozenset(p) for r in rounds for p in r if p[1] is not None]
            self.assertEqual(len(games), n * (n - 1) // 2)
            self.assertEqual(len(set(games)), len(games))

    def test_chave_por_semente(self):
        self.assertEqual(pairing.elimination_first_round([1, 2, 3, 4]), [(1, 4), (2, 3)])
        first = pairing.elimination_first_round(list('abcde'))
        self.assertEqual(sum(1 for _, b in first if b is None), 3)
        self.assertIn(('a', None), first)

    def test_swiss_deterministico_sem_revanche_ou_bloqueia(self):
        players = [1, 2, 3, 4]
        played = [{'a': 1, 'b': 2, 'a_score': 2, 'b_score': 0}, {'a': 3, 'b': 4, 'a_score': 2, 'b_score': 0}]
        first = pairing.swiss_pairings(players, played)
        self.assertEqual(first, pairing.swiss_pairings(players, played))
        self.assertEqual(first, [(1, 3), (2, 4)])  # mesma pontuação se enfrenta
        all_played = played + [{'a': 1, 'b': 3, 'a_score': 2, 'b_score': 0}, {'a': 2, 'b': 4, 'a_score': 2, 'b_score': 0},
                               {'a': 1, 'b': 4, 'a_score': 2, 'b_score': 0}, {'a': 2, 'b': 3, 'a_score': 2, 'b_score': 0}]
        self.assertIsNone(pairing.swiss_pairings(players, all_played))  # esgotado: não sorteia nem repete

    def test_desempate(self):
        rows = pairing.standings(['a', 'b'], [{'a': 'a', 'b': 'b', 'a_score': 1, 'b_score': 1}])
        self.assertEqual([r['player'] for r in rows], ['a', 'b'])  # empate total cai na semente


class ReleaseAndGuards(unittest.TestCase):
    def run_tool(self, *cmd):
        return subprocess.run([sys.executable, *cmd], cwd=ROOT, capture_output=True, text=True)

    def test_guarda_recusa_official_e_ambiguidade(self):
        site = '/home/dev/saintseiyatcg'
        base = ('tools/deploy-guard.py', 'check')
        self.assertEqual(self.run_tool(*base, '--env', 'playtest', '--host', 'mamaco-dev', '--path', f'{site}/playtest').returncode, 0)
        for args in (('--env', 'official', '--host', 'mamaco-dev', '--path', f'{site}/alpha'),
                     ('--env', 'playtest', '--host', 'mamaco-dev', '--path', f'{site}/alpha/data'),
                     ('--env', 'playtest', '--host', 'mamaco-dev', '--path', f'{site}/playtest/../alpha'),
                     ('--env', 'playtest', '--host', 'outro', '--path', f'{site}/playtest'),
                     ('--env', 'playtest', '--host', 'mamaco-dev', '--path', '/home/dev/casamamaco'),
                     ('--env', 'playtest', '--host', 'mamaco-dev'),
                     ('--env', 'staging', '--host', 'mamaco-dev', '--path', f'{site}/playtest')):
            self.assertEqual(self.run_tool(*base, *args).returncode, 2, args)

    def test_config_ausente_falha_fechado(self):
        self.assertEqual(self.run_tool('tools/deploy-guard.py', 'check', '--env', 'playtest', '--host', 'mamaco-dev', '--path', '/x', '--config', '/nao/existe.json').returncode, 2)

    def test_promocao_bloqueada(self):
        r = self.run_tool('tools/release.py', 'promote')
        self.assertEqual(r.returncode, 3)

    def test_registro_em_dia_com_as_fontes(self):
        self.assertEqual(self.run_tool('tools/build-registry.py', '--check').returncode, 0)
        cards = json.loads((ROOT / 'data/cards.json').read_text())['cartas']
        index = json.loads((ROOT / 'data/registry/index.json').read_text())['current']
        registry = json.loads((ROOT / f'data/registry/cards-{index["catalog"]}.json').read_text())
        self.assertEqual([c['id'] for c in cards], [c['id'] for c in registry])
        self.assertFalse(any('notas_pt' in c for c in registry))

    def test_mudanca_de_carta_propaga_e_preserva_historico(self):
        with tempfile.TemporaryDirectory() as tmp:
            out, cards_path = Path(tmp) / 'reg', Path(tmp) / 'cards.json'
            source = json.loads((ROOT / 'data/cards.json').read_text())
            cards_path.write_text(json.dumps(source))
            self.assertEqual(self.run_tool('tools/build-registry.py', '--cards', str(cards_path), '--out', str(out)).returncode, 0)
            old = json.loads((out / 'index.json').read_text())['current']['catalog']
            old_bytes = (out / f'cards-{old}.json').read_bytes()
            source['cartas'][0]['power'] = 99
            cards_path.write_text(json.dumps(source))
            self.assertEqual(self.run_tool('tools/build-registry.py', '--check', '--cards', str(cards_path), '--out', str(out)).returncode, 1)  # fora de sincronia até regerar
            self.run_tool('tools/build-registry.py', '--cards', str(cards_path), '--out', str(out))
            index = json.loads((out / 'index.json').read_text())
            new = index['current']['catalog']
            self.assertNotEqual(old, new)
            self.assertEqual(json.loads((out / f'cards-{new}.json').read_text())[0]['attack'], 99)
            self.assertEqual((out / f'cards-{old}.json').read_bytes(), old_bytes)  # versão antiga intacta
            self.assertEqual(len(index['history']), 2)


if __name__ == '__main__':
    unittest.main()
