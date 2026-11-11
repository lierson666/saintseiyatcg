"""Identidade e maioridade (Identity & Payment Forge V1.0, autor 11/11/2026). Separado de pagamentos.

Decisões do autor (11/11/2026):
- Sem provedor contratado, a maioridade é AUTODECLARADA: Brasil = data de nascimento + CPF com dígitos verificadores
  corretos; fora do Brasil = data de nascimento + confirmação de 18+. O estado é SELF_DECLARED_ADULT, nunca VERIFIED_ADULT.
  O CPF não codifica a data de nascimento: a checagem só diz que o número é bem formado.
- VERIFIED_ADULT só nasce de um resultado AUTENTICADO de provedor (adaptador abaixo), gravado em provider_results.
  Nem o admin aprova sem essa prova.
- Nunca guardar nem registrar CPF completo, documento ou data de nascimento. Fica: estado, país, CPF mascarado
  (***.***.***-25) e, se houver chave SANCTUARY_PII_KEY, um HMAC do CPF para impedir o mesmo CPF em duas contas.
- Contas antigas entram como UNVERIFIED (ninguém é verificado automaticamente, admins inclusive; nada é apagado).
"""
import hashlib
import hmac
import json
import os
import re
import time
from datetime import date

UNVERIFIED, PENDING, SELF_DECLARED, VERIFIED = 'UNVERIFIED', 'PENDING_VERIFICATION', 'SELF_DECLARED_ADULT', 'VERIFIED_ADULT'
UNDERAGE, FAILED, EXPIRED, REVIEW = 'REJECTED_UNDERAGE', 'FAILED_VERIFICATION', 'EXPIRED_VERIFICATION', 'MANUAL_REVIEW'
STATES = (UNVERIFIED, PENDING, SELF_DECLARED, VERIFIED, UNDERAGE, FAILED, EXPIRED, REVIEW)
ADULT_STATES = (SELF_DECLARED, VERIFIED)

# Quem pode levar a conta de um estado a outro. 'provider' = resultado autenticado; 'system' = rotina do servidor.
TRANSITIONS = {
    'user': {UNVERIFIED: {SELF_DECLARED, UNDERAGE}, FAILED: {SELF_DECLARED, UNDERAGE}, EXPIRED: {SELF_DECLARED, UNDERAGE}},
    'provider': {s: {VERIFIED, UNDERAGE, FAILED} for s in (UNVERIFIED, PENDING, SELF_DECLARED, FAILED, EXPIRED, REVIEW)},
    'start': {s: {PENDING} for s in (UNVERIFIED, SELF_DECLARED, FAILED, EXPIRED)},
    'system': {PENDING: {EXPIRED}, VERIFIED: {EXPIRED}},
    'admin': {**{s: {REVIEW} for s in STATES if s != REVIEW}, REVIEW: {UNVERIFIED, UNDERAGE, VERIFIED}},
}

SCHEMA = """
create table if not exists identity_status (user_id integer primary key references users(id) on delete cascade,
  state text not null, method text, provider text, verification_id text, country text, cpf_mask text, cpf_hmac text,
  updated_at integer not null);
create unique index if not exists identity_cpf_once on identity_status(cpf_hmac) where cpf_hmac is not null;
create table if not exists identity_events (id integer primary key, user_id integer not null references users(id) on delete cascade,
  from_state text, to_state text not null, actor text not null, reason text not null, evidence text, at integer not null);
create trigger if not exists identity_events_fixed before update on identity_events
  begin select raise(abort, 'identity events are append-only'); end;
create table if not exists provider_results (id integer primary key, provider text not null, verification_id text not null,
  user_id integer not null references users(id) on delete cascade, adult_verified integer not null, verified_at integer not null,
  received_at integer not null, unique (provider, verification_id));
"""


class IdentityError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def migrate(db):
    """Cria as tabelas e põe toda conta sem estado como UNVERIFIED, com evento de auditoria. Idempotente."""
    db.executescript(SCHEMA)
    now = int(time.time())
    for (uid,) in db.execute('select id from users where id not in (select user_id from identity_status)').fetchall():
        db.execute('insert into identity_status (user_id, state, updated_at) values (?, ?, ?)', (uid, UNVERIFIED, now))
        db.execute('insert into identity_events (user_id, from_state, to_state, actor, reason, at) values (?, null, ?, ?, ?, ?)',
                   (uid, UNVERIFIED, 'system', 'migration-v1', now))


def valid_cpf(value):
    """Só a matemática dos dígitos verificadores. Não confirma titularidade nem idade."""
    digits = re.sub(r'\D', '', str(value))
    if len(digits) != 11 or len(set(digits)) == 1:
        return False
    for n in (9, 10):
        check = (sum(int(digits[i]) * (n + 1 - i) for i in range(n)) * 10) % 11 % 10
        if check != int(digits[n]):
            return False
    return True


def age_years(born, today=None):
    today = today or date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def parse_dob(value):
    try:
        born = date.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise IdentityError(400, 'Enter a valid birth date.')
    today = date.today()
    if born > today or born.year < today.year - 120:
        raise IdentityError(400, 'Enter a valid birth date.')
    return born


def cpf_mask(cpf):
    d = re.sub(r'\D', '', cpf)
    return f'***.***.***-{d[-2:]}'


def cpf_hmac(cpf):
    key = os.environ.get('SANCTUARY_PII_KEY', '')
    if not key:
        return None  # sem chave, não há como guardar uma marca do CPF que não seja reversível por força bruta
    return hmac.new(key.encode(), re.sub(r'\D', '', cpf).encode(), hashlib.sha256).hexdigest()


def status(db, uid):
    row = db.execute('select * from identity_status where user_id = ?', (uid,)).fetchone()
    return row['state'] if row else UNVERIFIED


def public(db, uid):
    row = db.execute('select state, method, provider, country, cpf_mask, updated_at from identity_status where user_id = ?', (uid,)).fetchone()
    return dict(row) if row else {'state': UNVERIFIED}


def adult(db, uid, require_provider=False):
    s = status(db, uid)
    return s == VERIFIED if require_provider else s in ADULT_STATES


def transition(db, uid, to, actor_kind, actor, reason, evidence=None, **fields):
    current = status(db, uid)
    if to not in TRANSITIONS[actor_kind].get(current, set()):
        raise IdentityError(409, f'Identity change not allowed: {current} -> {to}.')
    now = int(time.time())
    cols = {'state': to, 'updated_at': now, **fields}
    if db.execute('select 1 from identity_status where user_id = ?', (uid,)).fetchone():
        db.execute(f'update identity_status set {", ".join(k + " = ?" for k in cols)} where user_id = ?', (*cols.values(), uid))
    else:
        db.execute(f'insert into identity_status (user_id, {", ".join(cols)}) values (?, {", ".join("?" * len(cols))})', (uid, *cols.values()))
    db.execute('insert into identity_events (user_id, from_state, to_state, actor, reason, evidence, at) values (?, ?, ?, ?, ?, ?, ?)',
               (uid, current, to, actor, reason, evidence, now))
    return to


def check_declaration(body):
    """Valida a autodeclaração sem gravar nada. Devolve (adulto?, país, cpf_mask, cpf_hmac). Menor de idade: adulto=False."""
    country = str(body.get('country', '')).strip().upper()
    if not re.fullmatch(r'[A-Z]{2}', country):
        raise IdentityError(400, 'Choose your country.')
    born = parse_dob(body.get('birth_date'))
    if body.get('confirm_adult') is not True:
        raise IdentityError(400, 'Confirm that you are 18 or older.')
    mask = mark = None
    if country == 'BR':
        cpf = str(body.get('cpf') or '')
        if not valid_cpf(cpf):
            raise IdentityError(400, 'Enter a valid CPF.')
        mask, mark = cpf_mask(cpf), cpf_hmac(cpf)
    return age_years(born) >= 18, country, mask, mark


def self_declare(db, uid, body):
    """Grava SELF_DECLARED_ADULT ou REJECTED_UNDERAGE. A data de nascimento e o CPF completo não são guardados."""
    is_adult, country, mask, mark = check_declaration(body)
    if not is_adult:
        transition(db, uid, UNDERAGE, 'user', 'user', 'self-declared-underage', country=country)
        raise IdentityError(403, 'Saint Seiya TCG is for adults 18 or older.')
    if mark and db.execute('select 1 from identity_status where cpf_hmac = ? and user_id != ?', (mark, uid)).fetchone():
        raise IdentityError(409, 'This CPF is already linked to another account.')
    transition(db, uid, SELF_DECLARED, 'user', 'user', 'self-declared-adult', method='self-declaration', country=country, cpf_mask=mask, cpf_hmac=mark)
    return public(db, uid)


# ---------- provedores de verificação (desligados até o autor contratar um) ----------
class Provider:
    """Adaptador de provedor. Só devolve: usuário, id da verificação, adult_verified e data. Nada de documento."""
    name = 'base'

    def parse_callback(self, headers, raw):
        raise IdentityError(503, 'Identity provider not configured.')


class MockProvider(Provider):
    """Provedor de teste: corpo JSON assinado com HMAC-SHA256 (cabeçalho X-Mock-Signature). Recusado no servidor no ar."""
    name = 'mock'

    def parse_callback(self, headers, raw):
        secret = os.environ.get('SANCTUARY_MOCK_IDP_SECRET', '')
        if os.environ.get('SANCTUARY_ENV') in ('production', 'playtest') or not secret:  # 'playtest' é o servidor no ar (compose.yml)
            raise IdentityError(503, 'Mock provider disabled.')
        sig = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, headers.get('X-Mock-Signature', '')):
            raise IdentityError(401, 'Bad provider signature.')
        body = json.loads(raw)
        return {'user_id': int(body['user_id']), 'verification_id': str(body['verification_id']),
                'adult_verified': body['adult_verified'] is True, 'verified_at': int(body['verified_at'])}


PROVIDERS = {'mock': MockProvider()}


def provider_result(db, provider, result):
    """Aplica um resultado autenticado. Idempotente por (provedor, verification_id)."""
    if db.execute('select 1 from provider_results where provider = ? and verification_id = ?', (provider, result['verification_id'])).fetchone():
        return status(db, result['user_id'])
    if not db.execute('select 1 from users where id = ?', (result['user_id'],)).fetchone():
        raise IdentityError(404, 'Unknown user.')
    db.execute('insert into provider_results (provider, verification_id, user_id, adult_verified, verified_at, received_at) values (?, ?, ?, ?, ?, ?)',
               (provider, result['verification_id'], result['user_id'], int(result['adult_verified']), result['verified_at'], int(time.time())))
    to = VERIFIED if result['adult_verified'] else UNDERAGE
    return transition(db, result['user_id'], to, 'provider', f'provider:{provider}', 'provider-result', result['verification_id'],
                      method='provider', provider=provider, verification_id=result['verification_id'])


def admin_action(db, uid, action, admin_email, evidence=None):
    """Admin: pôr em revisão, rejeitar, liberar (volta a UNVERIFIED) ou aprovar SÓ com prova de provedor já recebida."""
    if action == 'review':
        return transition(db, uid, REVIEW, 'admin', f'admin:{admin_email}', 'manual-review')
    if action == 'reject':
        return transition(db, uid, UNDERAGE, 'admin', f'admin:{admin_email}', 'manual-reject')
    if action == 'release':
        return transition(db, uid, UNVERIFIED, 'admin', f'admin:{admin_email}', 'manual-release')
    if action == 'approve':
        row = db.execute('select provider from provider_results where verification_id = ? and user_id = ? and adult_verified = 1',
                         (str(evidence or ''), uid)).fetchone()
        if not row:
            raise IdentityError(400, 'Approval needs an authenticated provider verification for this account.')
        return transition(db, uid, VERIFIED, 'admin', f'admin:{admin_email}', 'manual-approve-with-provider-evidence', str(evidence),
                          method='provider', provider=row['provider'], verification_id=str(evidence))
    raise IdentityError(400, 'Unknown action.')


def summary(db):
    counts = {s: 0 for s in STATES}
    for r in db.execute('select state, count(*) n from identity_status group by state'):
        counts[r['state']] = r['n']
    events = [dict(r) for r in db.execute('select e.at, u.username, e.from_state, e.to_state, e.actor, e.reason from identity_events e '
                                           'left join users u on u.id = e.user_id order by e.id desc limit 50')]
    return {'counts': counts, 'events': events}
