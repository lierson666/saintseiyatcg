"""Testes do ACHIEVEMENTS FORGE V1.0: python3.12 -m unittest sanctuary-api/test_achievements.py (na pasta sanctuary-api ou na raiz)."""
import calendar, copy, importlib.util, json, os, sys, tempfile, threading, time, unittest, urllib.request
from pathlib import Path
from urllib.error import HTTPError

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
os.environ.setdefault('SANCTUARY_INSECURE_COOKIE', '1')
sys.path.insert(0, str(HERE))
import achievements as A  # noqa: E402

server = None  # importado só na hora de rodar: test_server.py lê ADMINS e convites do ambiente no import
_spec = importlib.util.spec_from_file_location('ach_forge_test', ROOT / 'card-forge/achievements_forge.py')
F = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(F)
DRAFT = json.loads((ROOT / 'data/achievements.json').read_text(encoding='utf-8'))


def write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def item(cat, aid):
    return next(a for a in cat['achievements'] if a['id'] == aid)


class Catalogo(unittest.TestCase):
    def test_catalogo_inicial_tem_50_titulos_validos(self):
        self.assertEqual(A.check(DRAFT), [])
        rar = [a['rarity'] for a in DRAFT['achievements']]
        self.assertEqual([rar.count(r) for r in A.RARITIES], [10, 10, 10, 10, 4, 6])
        self.assertEqual([a['id'] for a in DRAFT['achievements']], [f'ach-{n:03d}' for n in range(1, 51)])
        self.assertEqual([a['target'] for a in DRAFT['achievements'][44:]], [100, 50, 20, 10, 3, 1])  # variantes TOP

    def test_pendente_vem_do_registro_e_nao_do_catalogo(self):
        cat = copy.deepcopy(DRAFT)
        item(cat, 'ach-012')['tracking'] = 'server'  # alguém tenta "liberar" métrica sem telemetria
        self.assertEqual(item(A.normalized(cat), 'ach-012')['tracking'], 'pending')
        self.assertEqual(list(A.unlockable(A.normalized(cat), {'strikes': {'value': 10 ** 6}})), [])

    def test_rejeita_id_repetido_e_formato(self):
        cat = copy.deepcopy(DRAFT)
        cat['achievements'][1]['id'] = 'ach-001'
        cat['achievements'][2]['id'] = 'x'
        errs = ' '.join(A.check(cat))
        self.assertIn('ID repetido', errs)
        self.assertIn('ach-000', errs)

    def test_rejeita_metrica_raridade_e_efeito_desconhecidos(self):
        cat = copy.deepcopy(DRAFT)
        a = cat['achievements'][0]
        a.update(metric='kills', rarity='Mythic')
        a['visual']['effect'] = 'laser'
        errs = ' '.join(A.check(cat))
        for word in ('métrica', 'raridade', 'efeito'):
            self.assertIn(word, errs)

    def test_moedas_so_em_metrica_do_servidor(self):
        cat = copy.deepcopy(DRAFT)
        item(cat, 'ach-003')['reward']['coins'] = 50  # ai_wins vem do navegador
        item(cat, 'ach-012')['reward']['coins'] = 50  # pendente
        self.assertEqual(sum('Cosmo Coins' in e for e in A.check(cat)), 2)
        cat = copy.deepcopy(DRAFT)
        item(cat, 'ach-004')['reward']['coins'] = 50
        self.assertEqual(A.check(cat), [])

    def test_publicado_nao_some(self):
        cat = copy.deepcopy(DRAFT)
        cat['achievements'] = cat['achievements'][:-1]
        self.assertTrue(any('ach-050' in e for e in A.check(cat, DRAFT)))

    def test_top_e_sim_nao(self):
        cat = copy.deepcopy(DRAFT)
        item(cat, 'ach-045')['target'] = 7
        item(cat, 'ach-043')['target'] = 2
        errs = ' '.join(A.check(cat))
        self.assertIn('TOP precisa', errs)
        self.assertIn('sim/não', errs)

    def test_diff_campo_a_campo(self):
        new = copy.deepcopy(DRAFT)
        item(new, 'ach-002')['target'] = 3
        new['achievements'].append({**copy.deepcopy(item(new, 'ach-001')), 'id': 'ach-051', 'title': 'Extra'})
        d = A.diff(DRAFT, new)
        self.assertIn({'id': 'ach-002', 'change': 'changed', 'field': 'target', 'before': 1, 'after': 3}, d)
        self.assertIn({'id': 'ach-051', 'change': 'added'}, d)

    def test_data_do_desbloqueio_e_a_da_n_esima_vez(self):
        a = {'metric': 'wins', 'target': 3}
        self.assertEqual(A.reached(a, {'value': 4, 'times': [10, 20, 30, 40]}), (True, 30))
        self.assertEqual(A.reached(a, {'value': 4}), (True, None))  # sem data conhecida: fica vazia, nunca inventada
        self.assertEqual(A.reached(a, {'value': 2, 'times': [10, 20]}), (False, None))
        self.assertEqual(A.reached({'metric': 'season_top', 'target': 10}, {'value': 4, 'at': 99}), (True, 99))
        self.assertEqual(A.reached({'metric': 'season_top', 'target': 3}, {'value': 4, 'at': 99})[0], False)

    def test_desativada_nao_desbloqueia(self):
        cat = copy.deepcopy(DRAFT)
        item(cat, 'ach-004')['enabled'] = False
        got = {a['id'] for a, _ in A.unlockable(cat, {'wins': {'value': 1, 'times': [5]}})}
        self.assertNotIn('ach-004', got)

    def test_desempate_deterministico(self):
        rows = [{'user_id': 9, 'key': (2, -4, 3), 'wins': 5}, {'user_id': 4, 'key': (2, -4, 3), 'wins': 5},
                {'user_id': 1, 'key': (2, -4, 3), 'wins': 2}, {'user_id': 7, 'key': (3, -4, 0), 'wins': 1}]
        self.assertEqual([r['user_id'] for r in A.award_order(rows)], [7, 4, 9, 1])
        self.assertEqual(A.award_order(rows), A.award_order(list(reversed(rows))))


class Forge(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        write(self.root / F.DRAFT, (json.dumps(DRAFT, ensure_ascii=False, indent=2) + '\n').encode())

    def tearDown(self):
        self.tmp.cleanup()

    def test_publicar_cria_versao_e_nao_repete(self):
        r = F.publish(self.root, {'revisao': F.read(self.root)['revisao']}, write)
        self.assertEqual((r['estado'], r['publicado']['version']), ('published', 1))
        self.assertTrue((self.root / F.HISTORY / 'v1.json').exists())
        with self.assertRaisesRegex(ValueError, 'Nada mudou'):
            F.publish(self.root, {'revisao': r['revisao']}, write)

    def test_revisao_velha_nao_grava(self):
        with self.assertRaisesRegex(ValueError, 'mudou'):
            F.save(self.root, {'revisao': 'velha', 'conteudo': DRAFT}, write)

    def test_rascunho_invalido_nao_grava(self):
        bad = copy.deepcopy(DRAFT)
        bad['achievements'][0]['title'] = ''
        before = (self.root / F.DRAFT).read_text()
        with self.assertRaises(ValueError):
            F.save(self.root, {'revisao': F.read(self.root)['revisao'], 'conteudo': bad}, write)
        self.assertEqual((self.root / F.DRAFT).read_text(), before)

    def test_editar_vira_draft_e_rollback_cria_versao_nova(self):
        r = F.publish(self.root, {'revisao': F.read(self.root)['revisao']}, write)
        v1 = (self.root / F.HISTORY / 'v1.json').read_text()
        cat = copy.deepcopy(r['rascunho'])
        item(cat, 'ach-002')['target'] = 2
        r = F.save(self.root, {'revisao': r['revisao'], 'conteudo': cat}, write)
        self.assertEqual(r['estado'], 'draft')
        self.assertEqual([d['field'] for d in r['diff']], ['target'])
        r = F.publish(self.root, {'revisao': r['revisao']}, write)
        r = F.rollback(self.root, {'versao': 1}, write)
        self.assertEqual((r['publicado']['version'], r['publicado']['rollback_of'], r['estado']), (3, 1, 'published'))
        self.assertEqual((self.root / F.HISTORY / 'v1.json').read_text(), v1)  # histórico nunca reescrito
        self.assertEqual(item(json.loads((self.root / F.PUBLISHED).read_text()), 'ach-002')['target'], 1)


class Motor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        global server
        import server
        server.ADMINS.add('achadm@example.com')
        cls.tmp = tempfile.TemporaryDirectory()
        server.open_db(os.path.join(cls.tmp.name, 'ach.db'))
        cls.cat_path = Path(cls.tmp.name) / 'achievements.json'
        cls.old_path = server.ACH_PATH
        server.ACH_PATH = cls.cat_path
        cls.httpd = server.make_server(0, '127.0.0.1')
        cls.base = f'http://127.0.0.1:{cls.httpd.server_address[1]}'
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        server.db.close()
        server.ACH_PATH = cls.old_path
        server._ach_cache.update(mtime=None, catalog={'version': 0, 'achievements': []})
        cls.tmp.cleanup()

    def setUp(self):
        self.publish(DRAFT)

    def publish(self, cat, version=1):
        data = {**A.normalized(cat), 'version': version}
        self.cat_path.write_text(json.dumps(data))
        os.utime(self.cat_path, (time.time(), time.time() + version + len(json.dumps(data)) % 1000))
        server._ach_cache.update(mtime=None)

    def call(self, method, path, body=None, cookie=None):
        req = urllib.request.Request(self.base + path, method=method, data=None if body is None else json.dumps(body).encode())
        req.add_header('Origin', server.ORIGIN)
        if cookie:
            req.add_header('Cookie', cookie)
        try:
            r = urllib.request.urlopen(req)
        except HTTPError as e:
            r = e
        raw = r.read()
        return r.status, json.loads(raw) if raw else None, (r.headers.get('Set-Cookie') or '').split(';')[0]

    n = 0

    def reg(self, email=None):
        Motor.n += 1
        email = email or f'ach{Motor.n}@example.com'
        server.db.execute('insert or ignore into invites values (?, 1)', (email,))
        st, _, cookie = self.call('POST', '/api/auth/register', {'email': email, 'name': 'Ach Player', 'username': f'Ach_{Motor.n}', 'country': 'BR', 'password': 'x' * 12, 'accept_terms': True})
        self.assertEqual(st, 201)
        return cookie, server.db.execute('select id from users where email = ?', (email,)).fetchone()[0]

    def admin(self):
        self.user('achadm@example.com')
        return self.call('POST', '/api/auth/login', {'email': 'achadm@example.com', 'password': 'x' * 12})[2]

    def user(self, email):  # conta já criada por outro teste da classe, ou nova
        row = server.db.execute('select id from users where email = ?', (email,)).fetchone()
        return row[0] if row else self.reg(email)[1]

    def duel(self, a, b, winner, ts, god='god-athena', a_hash='h1'):
        cid = server.db.execute('select coalesce(max(challenge_id), 0) + 1 from duels').fetchone()[0]
        server.db.execute('insert into duels (challenge_id, a_id, b_id, winner, a_god, b_god, rounds, finished_at, a_hash, b_hash) values (?, ?, ?, ?, ?, ?, 5, ?, ?, ?)',
                          (cid, a, b, winner, god, 'god-hades', ts, a_hash, 'hb'))

    def unlocks(self, uid):
        return {r['ach_id']: dict(r) for r in server.db.execute('select * from achievement_unlocks where user_id = ?', (uid,))}

    def sync(self, uid):
        with server.lock:
            return server.sync_achievements(uid)

    def test_migracao_retroativa_com_datas_reais(self):
        _, a = self.reg()
        _, b = self.reg()
        for i in range(5):
            self.duel(a, b, 'A', 1_700_000_000 + i * 86400)
        self.sync(a)
        got = self.unlocks(a)
        self.assertEqual((got['ach-004']['unlocked_at'], got['ach-008']['unlocked_at']), (1_700_000_000, 1_700_000_000 + 4 * 86400))
        self.assertEqual({got[k]['source'] for k in got}, {'migration'})
        self.assertNotIn('ach-005', got)  # tutorial da Marin: pendente, nunca desbloqueia
        self.duel(a, b, 'A', 1_700_000_000 + 9 * 86400)
        self.sync(a)
        self.assertEqual(self.unlocks(a)['ach-004']['source'], 'migration')  # já existia: não muda

    def test_idempotente_e_paga_uma_vez(self):
        cat = copy.deepcopy(DRAFT)
        item(cat, 'ach-004')['reward']['coins'] = 100
        self.publish(cat, 2)
        _, a = self.reg()
        _, b = self.reg()
        self.duel(a, b, 'A', 1_700_000_000)
        coins = server.coins_of(a)
        for _ in range(3):
            self.sync(a)
        self.assertEqual(server.coins_of(a) - coins, 100)
        self.assertEqual(server.db.execute("select count(*) from coin_ledger where user_id = ? and reason = 'achievement:ach-004'", (a,)).fetchone()[0], 1)
        self.assertEqual(server.db.execute('select count(*) from achievement_unlocks where user_id = ? and ach_id = ?', (a, 'ach-004')).fetchone()[0], 1)

    def test_catalogo_invalido_no_servidor_e_ignorado(self):
        good = server.ach_catalog()
        self.cat_path.write_text(json.dumps({'version': 9, 'achievements': [{'id': 'bad'}]}))
        os.utime(self.cat_path, (time.time(), time.time() + 5000))
        self.assertIs(server.ach_catalog(), good)

    def test_anti_farm_mesmo_adversario_no_dia(self):
        _, a = self.reg()
        _, b = self.reg()
        _, c = self.reg()
        day = 1_700_006_400
        for i in range(5):
            self.duel(a, b, 'A', day + i)
        self.duel(a, c, 'A', day + 10)
        with server.lock:
            m = server.measure(a)
        self.assertEqual((m['wins']['value'], m['played']['value'], m['win_streak']['value']), (4, 6, 4))

    def test_sequencia_quebra_na_derrota(self):
        _, a = self.reg()
        _, b = self.reg()
        for i, w in enumerate('AABAAA'):
            self.duel(a, b, w, 1_700_000_000 + i * 86400)
        with server.lock:
            m = server.measure(a)
        self.assertEqual(m['win_streak'], {'value': 3, 'times': [1_700_000_000, 1_700_086_400, 1_700_000_000 + 5 * 86400]})

    def test_vitorias_com_cada_deus_e_decks_vencedores(self):
        _, a = self.reg()
        _, b = self.reg()
        for i, g in enumerate(A.GODS):
            self.duel(a, b, 'A', 1_700_000_000 + i * 86400, god=f'god-{g}', a_hash=f'deck{i % 2}')
        with server.lock:
            m = server.measure(a)
        self.assertEqual(m['faction_wins_each'], {'value': 1, 'times': [1_700_000_000 + 4 * 86400]})
        self.assertEqual((m['athena_wins']['value'], m['winning_decks']['value']), (1, 2))

    def test_cartas_novas_nao_contam_a_colecao_inicial(self):
        _, a = self.reg()
        starter = next(iter(server.CATALOG['starter']))
        extra = next(c for ids in server.CATALOG['booster'].values() for c in ids if c not in server.CATALOG['starter'])
        server.db.executemany('insert into collection values (?, ?, 1)', [(a, starter), (a, extra)])
        with server.lock:
            self.assertEqual(server.measure(a)['new_cards']['value'], 1)

    def test_ouro_i_e_kamui_pela_escalada_e_conta_fixada_nao_ganha(self):
        _, a = self.reg()
        _, b = self.reg()
        fixed = self.user('limattenhauer@gmail.com')
        t0 = int(time.time()) - 400
        for i in range(108):  # Steel 12 + Iron/Bronze/Silver 72 + Ouro IV→I 18 = 102; +6 = Kamui
            self.duel(a, b, 'A', t0 + i)
        with server.lock:
            m = server.measure(a)
            mf = server.measure(fixed)
        self.assertEqual((m['gold_i']['value'], m['season_gold_i']['value'], m['kamui']['value']), (1, 1, 1))
        self.assertEqual((m['gold_i']['times'], m['kamui']['times']), ([t0 + 101], [t0 + 107]))
        self.assertEqual((mf['kamui']['value'], mf['gold_i']['value']), (0, 0))

    def test_api_lista_e_exige_login(self):
        self.assertEqual(self.call('GET', '/api/achievements')[0], 401)
        cookie, _ = self.reg()
        st, body, _ = self.call('GET', '/api/achievements', cookie=cookie)
        self.assertEqual((st, len(body['achievements']), body['title'], body['catalog_version']), (200, 50, None, 1))
        pend = {a['id'] for a in body['achievements'] if a['pending']}
        self.assertEqual(len(pend), 12)
        self.assertIn('ach-005', pend)

    def test_equipar_so_titulo_conquistado(self):
        cookie, a = self.reg()
        _, b = self.reg()
        self.assertEqual(self.call('POST', '/api/me/title', {'id': 'ach-004'}, cookie)[0], 403)
        self.assertEqual(self.call('POST', '/api/me/title', {'id': 'ach-999'}, cookie)[0], 400)
        self.assertEqual(self.call('POST', '/api/me/title', {'id': 5}, cookie)[0], 400)
        self.duel(a, b, 'A', 1_700_000_000)
        st, body, _ = self.call('POST', '/api/me/title', {'id': 'ach-004'}, cookie)
        self.assertEqual((st, body['title']['name'], body['title']['name_pt'], body['title']['rarity']), (200, 'First Blood', 'Primeiro Sangue', 'Common'))
        self.assertEqual(self.call('GET', '/api/me', cookie=cookie)[1]['title']['id'], 'ach-004')
        user = server.db.execute('select username from users where id = ?', (a,)).fetchone()[0]
        self.assertEqual(self.call('GET', f'/api/profile/{user}', cookie=cookie)[1]['title']['id'], 'ach-004')
        self.assertEqual(self.call('GET', f'/api/players/{user}')[1]['title']['id'], 'ach-004')
        self.assertIsNone(self.call('POST', '/api/me/title', {'id': None}, cookie)[1]['title'])

    def test_titulo_desativado_some_da_placa(self):
        cookie, a = self.reg()
        _, b = self.reg()
        self.duel(a, b, 'A', 1_700_000_000)
        self.assertEqual(self.call('POST', '/api/me/title', {'id': 'ach-004'}, cookie)[0], 200)
        cat = copy.deepcopy(DRAFT)
        item(cat, 'ach-004')['enabled'] = False
        self.publish(cat, 3)
        self.assertIsNone(self.call('GET', '/api/me', cookie=cookie)[1]['title'])

    def test_booster_aberto_conta_e_desbloqueia(self):
        cookie, a = self.reg()
        self.assertEqual(self.call('GET', '/api/economy', cookie=cookie)[0], 200)  # boas-vindas: 3 boosters
        self.assertEqual(self.call('POST', '/api/boosters/open', {'count': 2}, cookie)[0], 200)
        self.assertEqual(server.counter(a, 'boosters_opened'), 2)
        self.assertIn('ach-010', self.unlocks(a))

    def test_ia_desbloqueia_sem_moedas(self):
        cookie, a = self.reg()
        self.call('POST', '/api/xp/ai', {'result': 'win'}, cookie)
        got = self.unlocks(a)
        self.assertEqual(got['ach-003']['coins'], 0)

    def test_premiacao_da_temporada(self):
        admin = self.admin()
        players = [self.reg()[1] for _ in range(3)]
        fixed = self.user('limattenhauer@gmail.com')
        t = calendar.timegm((2026, 9, 10, 0, 0, 0))  # temporada 2026-09, já encerrada
        x, y, z = players
        for i in range(3):
            self.duel(x, z, 'A', t + i)
            self.duel(y, z, 'A', t + 100 + i)
        self.duel(fixed, z, 'A', t + 500)
        st, _, _ = self.call('POST', '/api/admin/season-awards', {'season': '2026-09'}, self.reg()[0])
        self.assertEqual(st, 403)
        cur = time.strftime('%Y-%m', time.gmtime())
        self.assertEqual(self.call('POST', '/api/admin/season-awards', {'season': cur}, admin)[0], 400)
        st, body, _ = self.call('POST', '/api/admin/season-awards', {'season': '2026-09'}, admin)
        self.assertEqual(st, 201)
        self.assertEqual([a['user_id'] for a in body['awards']], [min(x, y), max(x, y), z])  # empate de rank e vitórias: conta mais antiga
        self.assertNotIn(fixed, [a['user_id'] for a in body['awards']])
        st, again, _ = self.call('POST', '/api/admin/season-awards', {'season': '2026-09'}, admin)
        self.assertEqual((st, again['created'], [a['snapshot_hash'] for a in again['awards']][0]), (200, False, body['awards'][0]['snapshot_hash']))
        with self.assertRaises(Exception):
            server.db.execute("update season_awards set place = 9 where season = '2026-09'")
        with self.assertRaises(Exception):
            server.db.execute("delete from season_awards where season = '2026-09'")
        first = self.unlocks(min(x, y))
        self.assertTrue({'ach-045', 'ach-046', 'ach-047', 'ach-048', 'ach-049', 'ach-050'} <= set(first))
        self.assertNotIn('ach-050', self.unlocks(z))
        self.assertIn('ach-049', self.unlocks(z))

    def test_apagar_conta_tira_conquistas_e_mantem_historico(self):
        cookie, a = self.reg()
        _, b = self.reg()
        self.duel(a, b, 'A', calendar.timegm((2026, 8, 3, 0, 0, 0)))
        with server.lock:
            server.certify_season('2026-08')
        self.assertTrue(self.unlocks(a))
        self.assertEqual(self.call('DELETE', '/api/me', {'password': 'x' * 12}, cookie)[0], 200)
        self.assertEqual(self.unlocks(a), {})
        rows = server.db.execute("select user_id from season_awards where season = '2026-08' order by place").fetchall()
        self.assertEqual([r[0] for r in rows], [None, b] if rows[0][0] is None else [b, None])

    def test_analytics_admin_so_com_dados_reais(self):
        admin = self.admin()
        st, body, _ = self.call('GET', '/api/admin/achievements', cookie=admin)
        self.assertEqual((st, len(body['achievements'])), (200, 50))
        real = server.db.execute("select count(*) from achievement_unlocks where ach_id = 'ach-004'").fetchone()[0]
        self.assertEqual(next(a for a in body['achievements'] if a['id'] == 'ach-004')['unlocked'], real)


if __name__ == '__main__':
    unittest.main()
