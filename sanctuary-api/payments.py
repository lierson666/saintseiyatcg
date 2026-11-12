"""Venda de Cosmo Coins com dinheiro real (Identity & Payment Forge V1.0, autor 11/11/2026). Tudo desligado por padrão.

Regras:
- Só se vende a moeda que já existe (Cosmo Coins), em pacotes do Economy Forge (economy.json → coin_packs). 250 coins = R$1.
- O pedido nasce no servidor; preço e coins vêm do pacote publicado, nunca do navegador.
- Crédito só depois que o servidor confirma o pagamento direto no provedor (GET do pagamento), com valor, moeda,
  referência e ambiente conferidos. Entrada no livro-razão 'purchase:<pedido>' com índice único: crédito uma vez só.
- Reembolso e chargeback tiram os coins de volta ('refund:<pedido>' / 'chargeback:<pedido>'); o que faltar de saldo fica
  anotado no pedido e a conta entra em payment_hold (não compra mais até o admin resolver).
- Coins comprados ficam marcados (paid_coins). Com RANDOM_BOOSTERS_PURCHASABLE desligado, booster (item aleatório) só sai
  de coins ganhos jogando; os outros gastos consomem primeiro os coins comprados.
- Segredos só por variável de ambiente: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET. Ambiente: SANCTUARY_PAYMENTS_ENV
  (sandbox, padrão; production aceita só pagamento live_mode).
Endpoints do Mercado Pago usados (docs oficiais, conferidos em 11/11/2026):
  POST https://api.mercadopago.com/checkout/preferences      (Checkout Pro; Pix e cartão ficam na tela do Mercado Pago)
  GET  https://api.mercadopago.com/v1/payments/{id}
  POST https://api.mercadopago.com/v1/payments/{id}/refunds   (cabeçalho X-Idempotency-Key obrigatório)
  GET  https://api.mercadopago.com/v1/chargebacks/{id}
  Webhook: cabeçalhos x-signature (ts=…,v1=…) e x-request-id; HMAC-SHA256 do manifesto id:…;request-id:…;ts:…;
"""
import hashlib
import hmac
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request

import flags

MP_API = 'https://api.mercadopago.com'
ORDER_STATES = ('CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'CHARGED_BACK', 'FAILED')
ORDERS_PER_HOUR = 10

SCHEMA = """
create table if not exists payment_orders (id text primary key, user_id integer,
  pack_id text not null, coins integer not null, price_cents integer not null, currency text not null, provider text not null,
  env text not null, status text not null, provider_ref text, checkout_url text, shortfall integer not null default 0,
  created_at integer not null, updated_at integer not null);
create index if not exists payment_orders_user on payment_orders(user_id, created_at);
create table if not exists payment_events (id integer primary key, order_id text not null, from_status text, to_status text not null,
  source text not null, detail text, at integer not null);
create table if not exists webhook_receipts (provider text not null, request_id text not null, topic text, data_id text,
  received_at integer not null, primary key (provider, request_id));
create table if not exists paid_coins (user_id integer primary key references users(id) on delete cascade, remaining integer not null);
create table if not exists payment_holds (user_id integer primary key references users(id) on delete cascade, reason text not null, at integer not null);
create table if not exists admin_audit (id integer primary key, admin text not null, action text not null, target text, detail text, at integer not null);
create unique index if not exists coin_ledger_money_once on coin_ledger(reason)
  where reason like 'purchase:%' or reason like 'refund:%' or reason like 'chargeback:%';
"""


class PaymentError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def migrate(db):
    db.executescript(SCHEMA)


def env():
    return 'production' if os.environ.get('SANCTUARY_PAYMENTS_ENV') == 'production' else 'sandbox'


def audit(db, admin, action, target, detail=None):
    db.execute('insert into admin_audit (admin, action, target, detail, at) values (?, ?, ?, ?, ?)',
               (admin, action, target, json.dumps(detail) if detail is not None else None, int(time.time())))


# ---------- coins comprados x coins ganhos ----------
def paid_remaining(db, uid):
    row = db.execute('select remaining from paid_coins where user_id = ?', (uid,)).fetchone()
    return row['remaining'] if row else 0


def _paid_add(db, uid, delta):
    db.execute('insert into paid_coins (user_id, remaining) values (?, max(0, ?)) on conflict(user_id) do update set remaining = max(0, remaining + ?)',
               (uid, delta, delta))


def on_spend(db, uid, delta, reason):
    """Chamado em cada lançamento negativo do livro-razão. Gasto que não é booster consome primeiro os coins comprados."""
    if delta < 0 and not reason.startswith('buy:booster'):
        _paid_add(db, uid, delta)


def booster_spendable(db, uid, balance):
    """Quanto do saldo pode virar booster. Com a chave desligada, só coins ganhos jogando."""
    return balance if flags.on('RANDOM_BOOSTERS_PURCHASABLE') else max(0, balance - paid_remaining(db, uid))


# ---------- Mercado Pago ----------
def _http(method, url, token, body=None, headers=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')


class MercadoPago:
    name = 'mercadopago'

    def __init__(self, http=None):
        self.http = http or _http  # os testes trocam por um falso; nunca há chamada real nos testes

    def token(self):
        t = os.environ.get('MP_ACCESS_TOKEN', '')
        if not t:
            raise PaymentError(503, 'Payments are not configured.')
        return t

    def create_checkout(self, order, pack, public_url):
        back = f'{public_url}/playtest/?purchase={order["id"]}'
        body = {'items': [{'id': pack['id'], 'title': f'{pack["coins"]} Cosmo Coins ({pack["name"]})', 'quantity': 1,
                           'currency_id': 'BRL', 'unit_price': pack['price_cents'] / 100}],
                'external_reference': order['id'],
                'notification_url': f'{public_url}/api/payments/webhook/mercadopago',
                'back_urls': {'success': back, 'pending': back, 'failure': back}, 'auto_return': 'approved'}
        status, data = self.http('POST', f'{MP_API}/checkout/preferences', self.token(), body, {'X-Idempotency-Key': order['id']})
        if status not in (200, 201) or not data.get('init_point'):
            raise PaymentError(502, 'Could not start the payment. Try again later.')
        return data['id'], data['init_point']

    def get_payment(self, payment_id):
        status, data = self.http('GET', f'{MP_API}/v1/payments/{int(payment_id)}', self.token())
        if status != 200:
            raise PaymentError(502, f'Payment lookup failed ({status}).')
        return data

    def refund(self, payment_id, idempotency_key):
        status, data = self.http('POST', f'{MP_API}/v1/payments/{int(payment_id)}/refunds', self.token(), {}, {'X-Idempotency-Key': idempotency_key})
        if status not in (200, 201):
            raise PaymentError(502, f'Refund failed ({status}): {data.get("message", "")}')
        return data

    def get_chargeback(self, chargeback_id):
        status, data = self.http('GET', f'{MP_API}/v1/chargebacks/{chargeback_id}', self.token())
        if status != 200:
            raise PaymentError(502, f'Chargeback lookup failed ({status}).')
        return data

    @staticmethod
    def verify_signature(headers, data_id, secret):
        """x-signature: 'ts=<ts>,v1=<hex>'. Manifesto 'id:<data.id>;request-id:<x-request-id>;ts:<ts>;' (partes ausentes saem)."""
        if not secret:
            return False
        parts = dict(p.split('=', 1) for p in str(headers.get('x-signature') or '').split(',') if '=' in p)
        ts, v1 = parts.get('ts', '').strip(), parts.get('v1', '').strip()
        if not ts or not v1:
            return False
        manifest = ''
        if data_id:
            manifest += f'id:{str(data_id).lower()};'
        if headers.get('x-request-id'):
            manifest += f'request-id:{headers.get("x-request-id")};'
        manifest += f'ts:{ts};'
        return hmac.compare_digest(hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest(), v1)


class GooglePlay:
    """Reservado. O jogo hoje roda só no navegador (autor, 11/11/2026). Antes de ligar: produtos no Play Console, Digital Goods
    API no TWA e conferência do purchaseToken no servidor pela Google Play Developer API. Sem isso, recusa tudo."""
    name = 'googleplay'

    def create_checkout(self, *a):
        raise PaymentError(503, 'Google Play Billing is not available yet.')


ADAPTERS = {'mercadopago': MercadoPago(), 'googleplay': GooglePlay()}
FLAG_OF = {'mercadopago': 'MERCADO_PAGO_ENABLED', 'googleplay': 'GOOGLE_PLAY_BILLING_ENABLED'}


# ---------- pedidos ----------
def _set_status(db, order_id, to, source, detail=None, **cols):
    row = db.execute('select status from payment_orders where id = ?', (order_id,)).fetchone()
    cols = {'status': to, 'updated_at': int(time.time()), **cols}
    db.execute(f'update payment_orders set {", ".join(k + " = ?" for k in cols)} where id = ?', (*cols.values(), order_id))
    db.execute('insert into payment_events (order_id, from_status, to_status, source, detail, at) values (?, ?, ?, ?, ?, ?)',
               (order_id, row['status'] if row else None, to, source, json.dumps(detail) if detail is not None else None, int(time.time())))


def order_view(row):
    return {k: row[k] for k in ('id', 'pack_id', 'coins', 'price_cents', 'currency', 'provider', 'status', 'created_at', 'updated_at')}


def create_order(db, uid, pack_id, packs, provider, public_url):
    """Cria o pedido e a tela de pagamento. Quem chama já conferiu login, maioridade, termos e chaves."""
    if provider not in ADAPTERS or not flags.on(FLAG_OF[provider]):
        raise PaymentError(503, 'This payment method is not available.')
    pack = next((p for p in packs if p['id'] == pack_id), None)
    if not pack:
        raise PaymentError(400, 'Unknown pack.')
    if db.execute('select 1 from payment_holds where user_id = ?', (uid,)).fetchone():
        raise PaymentError(403, 'Purchases are paused on this account. Contact support.')
    since = int(time.time()) - 3600
    if db.execute('select count(*) from payment_orders where user_id = ? and created_at > ?', (uid, since)).fetchone()[0] >= ORDERS_PER_HOUR:
        raise PaymentError(429, 'Too many purchase attempts. Try again later.')
    now, oid = int(time.time()), 'ord_' + secrets.token_hex(12)
    db.execute('insert into payment_orders (id, user_id, pack_id, coins, price_cents, currency, provider, env, status, created_at, updated_at) '
               'values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (oid, uid, pack['id'], pack['coins'], pack['price_cents'], 'BRL', provider, env(), 'CREATED', now, now))
    db.execute('insert into payment_events (order_id, from_status, to_status, source, at) values (?, null, ?, ?, ?)', (oid, 'CREATED', 'server', now))
    order = db.execute('select * from payment_orders where id = ?', (oid,)).fetchone()
    try:
        ref, url = ADAPTERS[provider].create_checkout(order, pack, public_url)
    except PaymentError as e:
        _set_status(db, oid, 'FAILED', 'server', {'error': e.message})
        raise
    _set_status(db, oid, 'PENDING', 'server', {'preference': ref}, checkout_url=url)
    return {'order': order_view(db.execute('select * from payment_orders where id = ?', (oid,)).fetchone()), 'checkout_url': url}


def _clawback(db, order, kind, add_coins, coins_of):
    """Tira de volta os coins do pedido (até o saldo) e pausa as compras da conta."""
    reason = f'{kind}:{order["id"]}'
    if db.execute('select 1 from coin_ledger where reason = ?', (reason,)).fetchone():
        return
    take = min(order['coins'], max(0, coins_of(order['user_id'])))
    if take:
        add_coins(order['user_id'], -take, reason)
    _paid_add(db, order['user_id'], -order['coins'])
    db.execute('insert or ignore into payment_holds (user_id, reason, at) values (?, ?, ?)', (order['user_id'], reason, int(time.time())))
    _set_status(db, order['id'], 'REFUNDED' if kind == 'refund' else 'CHARGED_BACK', 'provider', {'taken': take},
                shortfall=order['coins'] - take)


def apply_payment(db, payment, add_coins, coins_of, source='webhook'):
    """Aplica um pagamento LIDO DO PROVEDOR. Confere pedido, valor, moeda e ambiente. Atômico e idempotente."""
    order = db.execute('select * from payment_orders where id = ?', (str(payment.get('external_reference') or ''),)).fetchone()
    if not order:
        raise PaymentError(404, 'Unknown order.')
    status = payment.get('status')
    try:
        amount_ok = round(float(payment.get('transaction_amount')) * 100) == order['price_cents']
    except (TypeError, ValueError):
        amount_ok = False
    live = payment.get('live_mode')
    env_ok = live is None or bool(live) == (order['env'] == 'production')
    db.execute('savepoint pay')
    try:
        if status == 'approved':
            if not (amount_ok and payment.get('currency_id') == order['currency'] and env_ok):
                _set_status(db, order['id'], 'FAILED', source, {'mismatch': True, 'payment': payment.get('id')})
            elif order['status'] not in ('APPROVED', 'REFUNDED', 'CHARGED_BACK'):
                add_coins(order['user_id'], order['coins'], f'purchase:{order["id"]}')
                _paid_add(db, order['user_id'], order['coins'])
                _set_status(db, order['id'], 'APPROVED', source, {'payment': payment.get('id')}, provider_ref=str(payment.get('id')))
        elif status == 'refunded' and order['status'] == 'APPROVED':
            _clawback(db, order, 'refund', add_coins, coins_of)
        elif status == 'charged_back' and order['status'] == 'APPROVED':  # já reembolsado: os coins já voltaram
            _clawback(db, order, 'chargeback', add_coins, coins_of)
        elif status in ('rejected', 'cancelled') and order['status'] in ('CREATED', 'PENDING'):
            _set_status(db, order['id'], 'REJECTED' if status == 'rejected' else 'CANCELLED', source, {'payment': payment.get('id')})
        db.execute('release pay')
    except Exception:
        db.execute('rollback to pay')
        db.execute('release pay')
        raise
    return db.execute('select status from payment_orders where id = ?', (order['id'],)).fetchone()['status']


def webhook(db, provider, headers, query, body, add_coins, coins_of):
    """Webhook do Mercado Pago: assinatura, anti-replay por x-request-id e consulta do pagamento no provedor."""
    if provider != 'mercadopago' or not (flags.on('PAYMENTS_ENABLED') and flags.on('MERCADO_PAGO_ENABLED')):
        raise PaymentError(404, 'Not found.')
    mp = ADAPTERS['mercadopago']
    data_id = query.get('data.id') or (body.get('data') or {}).get('id')
    if not mp.verify_signature(headers, data_id, os.environ.get('MP_WEBHOOK_SECRET', '')):
        # diagnóstico sem segredo: o que veio para montar o manifesto
        print('webhook bad signature:', json.dumps({'data_id': data_id, 'query': sorted(query), 'x-request-id': headers.get('x-request-id'),
              'x-signature-ts': str(headers.get('x-signature') or '').split(',')[0], 'headers': sorted(headers)}), file=sys.stderr, flush=True)
        raise PaymentError(401, 'Bad signature.')
    request_id = headers.get('x-request-id') or f'no-id:{data_id}:{headers.get("x-signature")}'
    topic = body.get('type') or query.get('type') or query.get('topic')
    if db.execute('select 1 from webhook_receipts where provider = ? and request_id = ?', (provider, request_id)).fetchone():
        return 'duplicate'  # mesma notificação de novo: já tratada
    result = 'ignored'
    if topic == 'payment' and data_id:
        result = apply_payment(db, mp.get_payment(data_id), add_coins, coins_of)
    elif topic in ('chargebacks', 'topic_chargebacks_wh') and data_id:
        cb = mp.get_chargeback(data_id)
        for pid in cb.get('payments') or []:  # se a lista não vier, a conciliação pega pelo status do pagamento
            apply_payment(db, mp.get_payment(pid) | {'status': 'charged_back'}, add_coins, coins_of)
        result = 'chargeback'
    # só depois de tratar: se a consulta ao provedor falhar, a reentrega do Mercado Pago tenta de novo
    db.execute('insert or ignore into webhook_receipts (provider, request_id, topic, data_id, received_at) values (?, ?, ?, ?, ?)',
               (provider, request_id, topic, str(data_id), int(time.time())))
    return result


WITHDRAW_DAYS = 7  # arrependimento (CDC art. 49; autor, 11/11/2026): 7 dias, só com o pacote intacto


def approved_at(db, order_id):
    row = db.execute("select min(at) from payment_events where order_id = ? and to_status = 'APPROVED'", (order_id,)).fetchone()
    return row[0]


def withdraw_block(db, order, coins_of):
    """Motivo de o pedido não poder ser desfeito pelo jogador, ou None. Intacto = coins comprados ainda não gastos."""
    if order['status'] != 'APPROVED' or not order['provider_ref']:
        return 'Only completed purchases can be cancelled.'
    at = approved_at(db, order['id'])
    if not at or time.time() - at > WITHDRAW_DAYS * 86400:
        return f'The {WITHDRAW_DAYS}-day cancellation period has ended.'
    if paid_remaining(db, order['user_id']) < order['coins'] or coins_of(order['user_id']) < order['coins']:
        return 'Coins from this purchase were already used.'
    return None


def my_orders(db, uid, coins_of):
    out = []
    for r in db.execute('select * from payment_orders where user_id = ? order by created_at desc limit 50', (uid,)).fetchall():
        block = withdraw_block(db, r, coins_of)
        at = approved_at(db, r['id'])
        out.append(order_view(r) | {'withdrawable': block is None, 'withdraw_until': at + WITHDRAW_DAYS * 86400 if at else None})
    return out


def withdraw(db, order_id, uid, add_coins, coins_of):
    """Arrependimento pedido pelo jogador: reembolso total no provedor e as coins saem. Não pausa a conta."""
    order = db.execute('select * from payment_orders where id = ? and user_id = ?', (order_id, uid)).fetchone()
    if not order:
        raise PaymentError(404, 'Order not found.')
    block = withdraw_block(db, order, coins_of)
    if block:
        raise PaymentError(400, block)
    ADAPTERS[order['provider']].refund(order['provider_ref'], f'refund-{order_id}')
    status = apply_payment(db, ADAPTERS[order['provider']].get_payment(order['provider_ref']), add_coins, coins_of, source='withdraw:user')
    db.execute('delete from payment_holds where user_id = ? and reason = ?', (uid, f'refund:{order_id}'))  # direito do jogador, não suspeita
    return status


def refund(db, order_id, admin, add_coins, coins_of):
    order = db.execute('select * from payment_orders where id = ?', (order_id,)).fetchone()
    if not order or order['status'] != 'APPROVED' or not order['provider_ref']:
        raise PaymentError(400, 'Only approved orders can be refunded.')
    ADAPTERS[order['provider']].refund(order['provider_ref'], f'refund-{order_id}')
    audit(db, admin, 'refund', order_id)
    payment = ADAPTERS[order['provider']].get_payment(order['provider_ref'])
    return apply_payment(db, payment, add_coins, coins_of, source=f'admin:{admin}')


def reconcile(db, admin, add_coins, coins_of, days=30):
    """Relê no provedor os pedidos dos últimos dias e aplica o estado real. Devolve o que mudou."""
    changed = []
    since = int(time.time()) - days * 86400
    for order in db.execute("select * from payment_orders where provider = 'mercadopago' and created_at > ? and status in ('PENDING', 'APPROVED')", (since,)).fetchall():
        if not order['provider_ref']:
            continue  # sem pagamento conhecido; o webhook traz quando houver
        before = order['status']
        try:
            after = apply_payment(db, ADAPTERS['mercadopago'].get_payment(order['provider_ref']), add_coins, coins_of, source='reconcile')
        except PaymentError as e:  # um pedido com erro não para a conciliação dos outros
            changed.append({'order': order['id'], 'error': e.message})
            continue
        if after != before:
            changed.append({'order': order['id'], 'from': before, 'to': after})
    audit(db, admin, 'reconcile', None, {'changed': len(changed)})
    return changed


def summary(db):
    by = {r['status']: {'orders': r['n'], 'cents': r['cents']} for r in
          db.execute('select status, count(*) n, coalesce(sum(price_cents), 0) cents from payment_orders group by status')}
    recent = [order_view(r) | {'username': r['username']} for r in
              db.execute('select o.*, u.username from payment_orders o left join users u on u.id = o.user_id order by o.created_at desc limit 50')]
    holds = db.execute('select count(*) from payment_holds').fetchone()[0]
    return {'by_status': by, 'recent': recent, 'holds': holds, 'env': env()}
