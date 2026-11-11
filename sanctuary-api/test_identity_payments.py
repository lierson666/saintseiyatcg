"""Identity & Payment Forge V1.0: maioridade autodeclarada, provedor simulado, gate 18+, pedidos, webhook, reembolso,
chargeback, conciliação e booster só com coins ganhos. Nada sai para a internet: o Mercado Pago é um falso em memória.
Rode sozinho: uv run --no-project --python 3.12 python -m unittest test_identity_payments
"""
import hashlib
import hmac
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.request
from datetime import date
from unittest.mock import patch
from urllib.error import HTTPError

os.environ['SANCTUARY_INVITES'] = ','.join(f'p{i}@example.com' for i in range(30)) + ',adm@example.com'
os.environ['SANCTUARY_INSECURE_COOKIE'] = '1'
os.environ['SANCTUARY_ADMINS'] = 'adm@example.com'
sys.path.insert(0, os.path.dirname(__file__))
import identity  # noqa: E402
import payments  # noqa: E402
import server  # noqa: E402

ORIGIN = server.ORIGIN
CPF_A, CPF_B = '529.982.247-25', '111.444.777-35'
ADULT = {'birth_date': date(date.today().year - 30, 1, 1).isoformat(), 'country': 'BR', 'cpf': CPF_A, 'confirm_adult': True}
MP_SECRET, IDP_SECRET = 'whsec-test', 'idp-test'
ON = {'SANCTUARY_PAYMENTS_ENABLED': '1', 'SANCTUARY_MERCADO_PAGO_ENABLED': '1', 'MP_ACCESS_TOKEN': 'TEST-token', 'MP_WEBHOOK_SECRET': MP_SECRET}


class FakeMP:
    """Responde como a API do Mercado Pago para preferência, pagamento, reembolso e chargeback."""
    def __init__(self):
        self.payments, self.calls, self.down = {}, [], False

    def __call__(self, method, url, token, body=None, headers=None):
        self.calls.append((method, url, body, headers))
        if self.down:
            return 500, {}
        if url.endswith('/checkout/preferences'):
            return 201, {'id': 'pref-1', 'init_point': 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1'}
        if '/refunds' in url:
            pid = url.split('/payments/')[1].split('/')[0]
            self.payments[pid]['status'] = 'refunded'
            return 201, {'id': 1, 'payment_id': int(pid)}
        if '/v1/payments/' in url:
            pid = url.rsplit('/', 1)[1]
            return (200, self.payments[pid]) if pid in self.payments else (404, {})
        if '/v1/chargebacks/' in url:
            return 200, {'id': url.rsplit('/', 1)[1], 'payments': [int(p) for p in self.payments]}
        return 404, {}


def sign(data_id, request_id, ts='1704908010'):
    manifest = f'id:{str(data_id).lower()};request-id:{request_id};ts:{ts};'
    return f'ts={ts},v1=' + hmac.new(MP_SECRET.encode(), manifest.encode(), hashlib.sha256).hexdigest()


class Base(unittest.TestCase):
    n = 0

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

    def setUp(self):
        self.mp = FakeMP()
        payments.ADAPTERS['mercadopago'].http = self.mp

    def call(self, method, path, body=None, cookie=None, origin=ORIGIN, headers=None, raw=None):
        data = raw if raw is not None else (None if body is None else json.dumps(body).encode())
        req = urllib.request.Request(self.base + path, method=method, data=data)
        if origin:
            req.add_header('Origin', origin)
        if cookie:
            req.add_header('Cookie', cookie)
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        try:
            r = urllib.request.urlopen(req)
        except HTTPError as e:
            r = e
        out = r.read()
        return r.status, (json.loads(out) if out else None), (r.headers.get('Set-Cookie') or '').split(';')[0]

    def player(self, declare=ADULT, email=None):
        Base.n += 1
        email = email or f'p{Base.n}@example.com'
        body = {'email': email, 'name': 'Player', 'username': f'player{Base.n}', 'country': 'BR', 'password': 'x' * 12,
                'accept_terms': True, 'terms_version': server.TERMS_VERSION, **(declare or {})}
        st, data, cookie = self.call('POST', '/api/auth/register', body)
        self.assertEqual(st, 201, data)
        uid = server.db.execute('select id from users where email = ?', (email,)).fetchone()[0]
        return cookie, uid

    def webhook(self, data_id, request_id='req-1', topic='payment', signature=None):
        return self.call('POST', f'/api/payments/webhook/mercadopago?data.id={data_id}&type={topic}', {'type': topic, 'data': {'id': str(data_id)}},
                         origin=None, headers={'x-signature': signature or sign(data_id, request_id), 'x-request-id': request_id})


class Identity(Base):
    def test_migration_marks_old_accounts_unverified(self):
        with server.lock:
            server.db.execute("insert into users (email, display_name, password_hash, created_at) values ('old@example.com', 'Old', 'x', 0)")
            server.db.execute("insert into users (email, display_name, password_hash, created_at) values ('adm2@example.com', 'Adm', 'x', 0)")
            identity.migrate(server.db)
            identity.migrate(server.db)  # idempotente
        for email in ('old@example.com', 'adm2@example.com'):
            uid = server.db.execute('select id from users where email = ?', (email,)).fetchone()[0]
            self.assertEqual(identity.status(server.db, uid), identity.UNVERIFIED)
            self.assertEqual(server.db.execute('select count(*) from identity_events where user_id = ?', (uid,)).fetchone()[0], 1)

    def test_self_declared_adult_br_and_no_full_cpf_stored(self):
        cookie, uid = self.player()
        self.assertEqual(identity.status(server.db, uid), identity.SELF_DECLARED)
        dump = '\n'.join(server.db.iterdump())
        self.assertNotIn('52998224725', dump)
        self.assertNotIn('529.982.247-25', dump)
        self.assertNotIn(ADULT['birth_date'], dump)
        me = self.call('GET', '/api/me', cookie=cookie)[1]
        self.assertEqual((me['identity']['state'], me['identity']['cpf_mask']), ('SELF_DECLARED_ADULT', '***.***.***-25'))

    def test_signup_rejections(self):
        Base.n += 1
        base = {'email': f'p{Base.n}@example.com', 'name': 'Player One', 'username': f'player{Base.n}', 'country': 'BR', 'password': 'x' * 12, 'accept_terms': True}
        minor = date(date.today().year - 17, 6, 1).isoformat()
        self.assertEqual(self.call('POST', '/api/auth/register', {**base, **ADULT, 'birth_date': minor})[0], 403)
        self.assertEqual(self.call('POST', '/api/auth/register', {**base, **ADULT, 'cpf': '111.111.111-11'})[0], 400)
        self.assertEqual(self.call('POST', '/api/auth/register', {**base, **ADULT, 'confirm_adult': False})[0], 400)
        self.assertIsNone(server.db.execute('select 1 from users where email = ?', (base['email'],)).fetchone())  # nada criado

    def test_foreign_player_without_cpf(self):
        _, uid = self.player({**ADULT, 'country': 'PT', 'cpf': None})
        self.assertEqual(identity.status(server.db, uid), identity.SELF_DECLARED)

    def test_underage_declaration_locks_account(self):
        cookie, uid = self.player(declare=None)
        st, _, _ = self.call('POST', '/api/me/identity', {**ADULT, 'birth_date': date(date.today().year - 15, 1, 1).isoformat()}, cookie=cookie)
        self.assertEqual((st, identity.status(server.db, uid)), (403, identity.UNDERAGE))
        self.assertEqual(self.call('POST', '/api/me/identity', ADULT, cookie=cookie)[0], 409)  # não dá para declarar de novo

    def test_same_cpf_twice_with_pii_key(self):
        with patch.dict(os.environ, {'SANCTUARY_PII_KEY': 'k'}):
            self.player({**ADULT, 'cpf': CPF_B})
            Base.n += 1
            body = {'email': f'p{Base.n}@example.com', 'name': 'Player One', 'username': f'player{Base.n}', 'country': 'BR', 'password': 'x' * 12,
                    'accept_terms': True, **ADULT, 'cpf': CPF_B}
            self.assertEqual(self.call('POST', '/api/auth/register', body)[0], 409)
            self.assertIsNone(server.db.execute('select 1 from users where email = ?', (body['email'],)).fetchone())

    def test_gate_blocks_unverified_and_regularizes(self):
        cookie, uid = self.player(declare=None)
        with patch.dict(os.environ, {'SANCTUARY_AGE_GATE_REQUIRED': '1'}):
            self.assertEqual(self.call('GET', '/api/economy', cookie=cookie)[0], 403)
            self.assertEqual(self.call('GET', '/api/me', cookie=cookie)[0], 200)  # a tela de regularização lê o estado
            self.assertEqual(self.call('POST', '/api/me/identity', ADULT, cookie=cookie)[0], 200)
            self.assertEqual(self.call('GET', '/api/economy', cookie=cookie)[0], 200)
            # termos novos: precisa aceitar de novo
            with patch.object(server, 'TERMS_VERSION', '2099-01-01-v9'):
                self.assertEqual(self.call('GET', '/api/economy', cookie=cookie)[0], 403)
                self.assertEqual(self.call('POST', '/api/me/legal', {'accept': True, 'version': '2099-01-01-v9'}, cookie=cookie)[0], 200)
                self.assertEqual(self.call('GET', '/api/economy', cookie=cookie)[0], 200)
            # com provedor exigido, autodeclaração não basta
            with patch.dict(os.environ, {'SANCTUARY_IDENTITY_VERIFICATION_ENABLED': '1'}):
                self.assertEqual(self.call('GET', '/api/economy', cookie=cookie)[0], 403)

    def test_provider_callback_and_admin_rules(self):
        _, uid = self.player()
        _, admin_uid = self.player(email='adm@example.com')
        cookie_admin = self.call('POST', '/api/auth/login', {'email': 'adm@example.com', 'password': 'x' * 12})[2]
        raw = json.dumps({'user_id': uid, 'verification_id': 'v-1', 'adult_verified': True, 'verified_at': 1}).encode()
        good = hmac.new(IDP_SECRET.encode(), raw, hashlib.sha256).hexdigest()
        self.assertEqual(self.call('POST', '/api/identity/callback/mock', raw=raw, origin=None, headers={'X-Mock-Signature': good})[0], 404)  # chave desligada
        with patch.dict(os.environ, {'SANCTUARY_IDENTITY_VERIFICATION_ENABLED': '1', 'SANCTUARY_MOCK_IDP_SECRET': IDP_SECRET}):
            self.assertEqual(self.call('POST', '/api/identity/callback/mock', raw=raw, origin=None, headers={'X-Mock-Signature': 'bad'})[0], 401)
            self.assertEqual(identity.status(server.db, uid), identity.SELF_DECLARED)
            for live in ('production', 'playtest'):
                with patch.dict(os.environ, {'SANCTUARY_ENV': live}):
                    self.assertEqual(self.call('POST', '/api/identity/callback/mock', raw=raw, origin=None, headers={'X-Mock-Signature': good})[0], 503)
            self.assertEqual(self.call('POST', '/api/identity/callback/mock', raw=raw, origin=None, headers={'X-Mock-Signature': good})[0], 200)
            self.assertEqual(self.call('POST', '/api/identity/callback/mock', raw=raw, origin=None, headers={'X-Mock-Signature': good})[0], 200)  # replay
        self.assertEqual(identity.status(server.db, uid), identity.VERIFIED)
        self.assertEqual(server.db.execute('select count(*) from provider_results where user_id = ?', (uid,)).fetchone()[0], 1)
        # admin: não aprova sem prova de provedor
        name = server.db.execute('select username from users where id = ?', (admin_uid,)).fetchone()[0]
        self.assertEqual(self.call('POST', f'/api/admin/identity/{name}', {'action': 'review'}, cookie=cookie_admin)[0], 200)
        self.assertEqual(self.call('POST', f'/api/admin/identity/{name}', {'action': 'approve', 'evidence': 'v-1'}, cookie=cookie_admin)[0], 400)
        self.assertEqual(identity.status(server.db, admin_uid), identity.REVIEW)
        self.assertTrue(server.db.execute("select 1 from admin_audit where action = 'identity:review'").fetchone())
        st, data, _ = self.call('GET', '/api/admin/compliance', cookie=cookie_admin)
        self.assertEqual(st, 200)
        self.assertNotIn('529982', json.dumps(data))
        with patch.dict(os.environ, {'SANCTUARY_AGE_GATE_REQUIRED': '1'}):  # admin em revisão ainda abre o painel
            self.assertEqual(self.call('GET', '/api/admin/compliance', cookie=cookie_admin)[0], 200)
            self.assertEqual(self.call('GET', '/api/economy', cookie=cookie_admin)[0], 403)

    def test_events_are_append_only(self):
        _, uid = self.player()
        with self.assertRaises(Exception):
            server.db.execute('update identity_events set reason = ? where user_id = ?', ('x', uid))


class Payments(Base):
    def order(self, cookie, pack='bronze'):
        with patch.dict(os.environ, ON):
            return self.call('POST', '/api/payments/orders', {'pack': pack, 'price_cents': 1, 'coins': 999999}, cookie=cookie)

    def approve(self, order_id, pid='9001', amount='4.99', live=False, **extra):
        self.mp.payments[pid] = {'id': int(pid), 'status': 'approved', 'currency_id': 'BRL', 'transaction_amount': amount,
                                 'external_reference': order_id, 'live_mode': live, **extra}
        return pid

    def test_flags_off_by_default(self):
        cookie, _ = self.player()
        self.assertEqual(self.call('GET', '/api/flags')[1], {f: False for f in server.flags.FLAGS})
        self.assertEqual(self.call('POST', '/api/payments/orders', {'pack': 'bronze'}, cookie=cookie)[0], 503)
        self.assertEqual(self.webhook('1')[0], 404)
        packs = self.call('GET', '/api/payments/packs', cookie=cookie)[1]
        self.assertEqual([(p['id'], p['price_cents'], p['coins']) for p in packs['packs']][0], ('bronze', 499, 1250))
        self.assertFalse(packs['enabled'])

    def test_purchase_requires_adult_and_terms(self):
        cookie, uid = self.player(declare=None)
        self.assertEqual(self.order(cookie)[0], 403)
        self.call('POST', '/api/me/identity', ADULT, cookie=cookie)
        server.db.execute('delete from legal_acceptances where user_id = ?', (uid,))
        self.assertEqual(self.order(cookie)[0], 403)

    def test_full_purchase_is_idempotent_and_price_from_server(self):
        cookie, uid = self.player()
        st, data, _ = self.order(cookie)
        self.assertEqual(st, 201, data)
        oid = data['order']['id']
        self.assertEqual((data['order']['price_cents'], data['order']['coins']), (499, 1250))  # o navegador mandou 1 centavo
        pref = self.mp.calls[0][2]
        self.assertEqual((pref['items'][0]['unit_price'], pref['external_reference']), (4.99, oid))
        before = server.coins_of(uid)
        pid = self.approve(oid)
        with patch.dict(os.environ, ON):
            self.assertEqual(self.webhook(pid, 'r1', signature='ts=1,v1=bad')[0], 401)
            self.assertEqual(server.coins_of(uid), before)
            self.assertEqual(self.webhook(pid, 'r1')[0], 200)
            self.assertEqual(self.webhook(pid, 'r1')[1]['result'], 'duplicate')
            self.assertEqual(self.webhook(pid, 'r2')[0], 200)  # reentrega com outro id: confere de novo e não credita
        self.assertEqual(server.coins_of(uid), before + 1250)
        self.assertEqual(server.db.execute("select count(*) from coin_ledger where reason = ?", (f'purchase:{oid}',)).fetchone()[0], 1)
        st, mine, _ = self.call('GET', f'/api/payments/orders/{oid}', cookie=cookie)
        self.assertEqual(mine['status'], 'APPROVED')
        other, _ = self.player()
        self.assertEqual(self.call('GET', f'/api/payments/orders/{oid}', cookie=other)[0], 404)

    def test_amount_currency_env_mismatch_never_credits(self):
        for kind in ({'amount': '0.01'}, {'currency_id': 'USD'}, {'live': True}):
            cookie, uid = self.player()
            oid = self.order(cookie)[1]['order']['id']
            before = server.coins_of(uid)
            pid = self.approve(oid, pid=str(9100 + Base.n), **kind)
            with patch.dict(os.environ, ON):
                self.webhook(pid, f'm{pid}')
            self.assertEqual(server.coins_of(uid), before, kind)
            self.assertEqual(server.db.execute('select status from payment_orders where id = ?', (oid,)).fetchone()[0], 'FAILED')

    def test_pending_rejected_and_provider_down(self):
        cookie, uid = self.player()
        oid = self.order(cookie)[1]['order']['id']
        pid = self.approve(oid, pid='9201')
        self.mp.payments[pid]['status'] = 'pending'
        with patch.dict(os.environ, ON):
            self.webhook(pid, 'p1')
            self.mp.down = True
            self.assertEqual(self.webhook(pid, 'p2')[0], 500)  # Mercado Pago reenvia
            self.mp.down = False
            self.mp.payments[pid]['status'] = 'rejected'
            self.webhook(pid, 'p2')
        self.assertEqual(server.db.execute('select status from payment_orders where id = ?', (oid,)).fetchone()[0], 'REJECTED')

    def test_refund_and_chargeback_take_coins_back(self):
        cookie, uid = self.player()
        self.player(email='adm@example.com') if not server.db.execute("select 1 from users where email='adm@example.com'").fetchone() else None
        admin = self.call('POST', '/api/auth/login', {'email': 'adm@example.com', 'password': 'x' * 12})[2]
        oid = self.order(cookie)[1]['order']['id']
        pid = self.approve(oid, pid='9301')
        with patch.dict(os.environ, ON):
            self.webhook(pid, 'c1')
            before = server.coins_of(uid)
            st, data, _ = self.call('POST', f'/api/admin/payments/{oid}/refund', {}, cookie=admin)
            self.assertEqual((st, data['status']), (200, 'REFUNDED'))
            self.assertEqual(self.mp.calls[-2][3]['X-Idempotency-Key'], f'refund-{oid}')
        self.assertEqual(server.coins_of(uid), before - 1250)
        self.assertEqual(self.order(cookie)[0], 403)  # conta em pausa depois do estorno
        self.assertTrue(server.db.execute("select 1 from admin_audit where action = 'refund' and target = ?", (oid,)).fetchone())
        # chargeback com saldo já gasto: tira o que der e anota a diferença
        cookie2, uid2 = self.player()
        oid2 = self.order(cookie2)[1]['order']['id']
        pid2 = self.approve(oid2, pid='9302')
        self.mp.payments.pop('9301')
        with patch.dict(os.environ, ON):
            self.webhook(pid2, 'c2')
            with server.lock:
                server.add_coins(uid2, -(server.coins_of(uid2) - 100), 'test:spend')
            self.webhook('cb-1', 'c3', topic='chargebacks')
        row = server.db.execute('select status, shortfall from payment_orders where id = ?', (oid2,)).fetchone()
        self.assertEqual((row[0], row[1], server.coins_of(uid2)), ('CHARGED_BACK', 1150, 0))

    def test_reconcile_picks_up_missed_webhook(self):
        cookie, uid = self.player()
        self.player(email='adm@example.com') if not server.db.execute("select 1 from users where email='adm@example.com'").fetchone() else None
        admin = self.call('POST', '/api/auth/login', {'email': 'adm@example.com', 'password': 'x' * 12})[2]
        oid = self.order(cookie)[1]['order']['id']
        pid = self.approve(oid, pid='9401')
        with patch.dict(os.environ, ON):
            self.webhook(pid, 'z1')
            self.mp.payments[pid]['status'] = 'refunded'  # o aviso do reembolso não chegou
            st, data, _ = self.call('POST', '/api/admin/payments/reconcile', {}, cookie=admin)
        self.assertIn({'order': oid, 'from': 'APPROVED', 'to': 'REFUNDED'}, data['changed'])

    def test_rate_limit(self):
        cookie, _ = self.player()
        codes = [self.order(cookie)[0] for _ in range(payments.ORDERS_PER_HOUR + 1)]
        self.assertEqual(codes[-1], 429)

    def test_paid_coins_cannot_buy_boosters_when_flag_off(self):
        cookie, uid = self.player()
        with server.lock:
            server.welcome(uid)
            server.add_coins(uid, -server.coins_of(uid), 'test:zero')
        oid = self.order(cookie)[1]['order']['id']
        pid = self.approve(oid, pid='9501')
        with patch.dict(os.environ, ON):
            self.webhook(pid, 'b1')
        self.assertEqual(server.coins_of(uid), 1250)
        self.assertEqual(self.call('POST', '/api/store/buy', {'item': 'booster', 'qty': 1}, cookie=cookie)[0], 400)
        with patch.dict(os.environ, {'SANCTUARY_RANDOM_BOOSTERS_PURCHASABLE': '1'}):
            self.assertEqual(self.call('POST', '/api/store/buy', {'item': 'booster', 'qty': 1}, cookie=cookie)[0], 200)

    def test_account_deletion_keeps_payment_record(self):
        cookie, uid = self.player()
        oid = self.order(cookie)[1]['order']['id']
        self.assertEqual(self.call('DELETE', '/api/me', {'password': 'x' * 12}, cookie=cookie)[0], 200)
        self.assertIsNone(server.db.execute('select user_id from payment_orders where id = ?', (oid,)).fetchone()[0])

    def test_signature_manifest(self):
        h = {'x-signature': sign('ABC', 'rq'), 'x-request-id': 'rq'}
        self.assertTrue(payments.MercadoPago.verify_signature(h, 'ABC', MP_SECRET))
        self.assertFalse(payments.MercadoPago.verify_signature(h, 'ABD', MP_SECRET))
        self.assertFalse(payments.MercadoPago.verify_signature(h, 'ABC', ''))


if __name__ == '__main__':
    unittest.main()
