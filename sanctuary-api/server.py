"""sanctuary-api: contas e decks do Saint Seiya TCG (docs/arquitetura-area-do-usuario.md, aprovada em 29/10/2026).

Só biblioteca padrão: http.server + sqlite3 + hashlib.scrypt. Roda atrás do Caddy, que também usa
GET /api/auth/check (forward_auth) para liberar o /playtest só a quem está logado.
Cadastro só para emails convidados (tabela invites; SANCTUARY_INVITES semeia na partida).
"""
import hashlib, hmac, json, os, re, secrets, sqlite3, threading, time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

DB_PATH = os.environ.get('SANCTUARY_DB', '/data/sanctuary.db')
ORIGIN = os.environ.get('SANCTUARY_ORIGIN', 'https://saintseiyatcg.com')
SECURE_COOKIE = os.environ.get('SANCTUARY_INSECURE_COOKIE') != '1'  # só testes locais desligam o Secure
COOKIE = 'sst_session'
SESSION_DAYS = 30
MAX_BODY = 64 * 1024
LOGIN_LIMIT, LOGIN_WINDOW = 5, 15 * 60
EMAIL_RE = re.compile(r'^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$')
DECK_ID_RE = re.compile(r'^[A-Za-z0-9_-]{1,80}$')
BAD_LOGIN = 'Email or password is incorrect.'
# Cadastro completo (docs/contas-amigos-chat.md, aprovado em 29/10/2026): sem CPF; telefone opcional.
USERNAME_RE = re.compile(r'^[A-Za-z0-9_]{3,20}$')
PHONE_RE = re.compile(r'^\+?[0-9 ()-]{7,20}$')
COUNTRY_RE = re.compile(r'^[A-Z]{2}$')
ONLINE_WINDOW = 45  # segundos sem batimento para virar offline (o navegador bate a cada 20 s)
NO_PLAYER = 'No player with this friend code.'

SCHEMA = """
create table if not exists users (id integer primary key, email text unique not null, display_name text not null,
  password_hash text not null, created_at integer not null);
create table if not exists sessions (token_hash text primary key, user_id integer not null references users(id),
  created_at integer not null, expires_at integer not null, last_seen integer not null);
create table if not exists invites (email text primary key, created_at integer not null);
create table if not exists decks (user_id integer not null references users(id), deck_id text not null, data text not null,
  revision integer not null, updated_at integer not null, deleted_at integer, primary key (user_id, deck_id));
create table if not exists login_attempts (email text not null, ip text not null, at integer not null);
create table if not exists friend_requests (id integer primary key, from_id integer not null, to_id integer not null,
  created_at integer not null, unique (from_id, to_id));
create table if not exists friendships (user_a integer not null, user_b integer not null, created_at integer not null,
  primary key (user_a, user_b), check (user_a < user_b));
create table if not exists blocks (user_id integer not null, blocked_id integer not null, created_at integer not null,
  primary key (user_id, blocked_id));
"""

lock = threading.Lock()
db = None


def open_db(path=DB_PATH):
    global db
    db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.executescript('pragma journal_mode=wal; pragma foreign_keys=on;' + SCHEMA)
    # Migração do cadastro completo: colunas novas em contas antigas (ficam vazias até o perfil ser completado).
    have = {r['name'] for r in db.execute('pragma table_info(users)')}
    for col in ('username', 'username_display', 'country', 'phone', 'friend_code', 'avatar_card', 'accepted_terms_at', 'last_seen', 'status'):
        if col not in have:
            db.execute(f'alter table users add column {col}')
    db.execute('create unique index if not exists users_username on users(username)')
    db.execute('create unique index if not exists users_friend_code on users(friend_code)')
    for email in filter(None, (e.strip().lower() for e in os.environ.get('SANCTUARY_INVITES', '').split(','))):
        db.execute('insert or ignore into invites values (?, ?)', (email, int(time.time())))
    return db


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    key = hashlib.scrypt(password.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return f'scrypt${salt.hex()}${key.hex()}'


def check_password(password, stored):
    _, salt, key = stored.split('$')
    return hmac.compare_digest(hash_password(password, bytes.fromhex(salt)).split('$')[2], key)


def new_friend_code(display):  # Nome#1234, único
    while True:
        code = f'{display}#{secrets.randbelow(9000) + 1000}'
        if not db.execute('select 1 from users where friend_code = ?', (code,)).fetchone():
            return code


def profile(u):  # dados que o próprio jogador vê
    return {'email': u['email'], 'name': u['display_name'], 'username': u['username_display'], 'friend_code': u['friend_code'],
            'country': u['country'], 'phone': u['phone'], 'avatar_card': u['avatar_card'], 'complete': bool(u['username'])}


def clean_profile(body, partial=False):
    """Valida os campos do perfil. partial=True: só os enviados (edição)."""
    out = {}
    if not partial or 'name' in body:
        name = ' '.join(str(body.get('name', '')).split())
        if not 2 <= len(name) <= 80:
            raise ApiError(400, 'Enter your full name.')
        out['display_name'] = name
    if not partial or 'country' in body:
        country = str(body.get('country', '')).strip().upper()
        if not COUNTRY_RE.match(country):
            raise ApiError(400, 'Choose your country.')
        out['country'] = country
    if not partial or 'phone' in body:
        phone = str(body.get('phone') or '').strip()
        if phone and not PHONE_RE.match(phone):
            raise ApiError(400, 'Enter the phone with country code, like +55 11 91234-5678.')
        out['phone'] = phone or None
    if 'avatar_card' in body:
        out['avatar_card'] = str(body.get('avatar_card') or '')[:80] or None
    return out


def check_username(username):
    if not USERNAME_RE.match(username):
        raise ApiError(400, 'Username: 3 to 20 letters, numbers or _.')
    if db.execute('select 1 from users where username = ?', (username.lower(),)).fetchone():
        raise ApiError(409, 'This username is taken.')


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


class Handler(BaseHTTPRequestHandler):
    server_version = 'sanctuary'

    def log_message(self, fmt, *args):  # sem corpo nem cookie no log
        print(f'{self.address_string()} {self.command} {urlparse(self.path).path} {args[1] if len(args) > 1 else ""}', flush=True)

    # ---------- utilidades ----------
    def client_ip(self):
        return (self.headers.get('X-Forwarded-For') or self.client_address[0]).split(',')[0].strip()

    def send_json(self, status, body, cookie=None):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        if cookie is not None:
            self.send_header('Set-Cookie', cookie)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def session_cookie(self, token, max_age):
        flags = '; Secure' if SECURE_COOKIE else ''
        return f'{COOKIE}={token}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Lax{flags}'

    def read_json(self):
        size = int(self.headers.get('Content-Length') or 0)
        if size > MAX_BODY:
            raise ApiError(413, 'Request is too large.')
        try:
            body = json.loads(self.rfile.read(size) or b'{}')
        except ValueError:
            raise ApiError(400, 'Request is not valid JSON.')
        if not isinstance(body, dict):
            raise ApiError(400, 'Request must be a JSON object.')
        return body

    def current_user(self):
        token = SimpleCookie(self.headers.get('Cookie', '')).get(COOKIE)
        if not token:
            return None
        now = int(time.time())
        with lock:
            row = db.execute('select u.* from sessions s join users u on u.id = s.user_id '
                             'where s.token_hash = ? and s.expires_at > ?', (token_hash(token.value), now)).fetchone()
            if row:
                db.execute('update sessions set last_seen = ? where token_hash = ?', (now, token_hash(token.value)))
        return row

    def require_user(self):
        user = self.current_user()
        if not user:
            raise ApiError(401, 'Sign in to continue.')
        return user

    def check_origin(self):  # CSRF: gravações só a partir do próprio site
        origin = self.headers.get('Origin')
        if origin != ORIGIN:
            raise ApiError(403, 'Request origin is not allowed.')

    def start_session(self, user_id):
        token, now = secrets.token_urlsafe(32), int(time.time())
        with lock:
            db.execute('insert into sessions values (?, ?, ?, ?, ?)', (token_hash(token), user_id, now, now + SESSION_DAYS * 86400, now))
        return self.session_cookie(token, SESSION_DAYS * 86400)

    # ---------- rotas ----------
    def dispatch(self, method):
        path = urlparse(self.path).path.rstrip('/')
        try:
            if method != 'GET':
                self.check_origin()
            if method == 'GET' and path == '/api/auth/check':
                return self.auth_check()
            if method == 'POST' and path == '/api/auth/register':
                return self.register()
            if method == 'POST' and path == '/api/auth/login':
                return self.login()
            if method == 'POST' and path == '/api/auth/logout':
                return self.logout()
            if method == 'GET' and path == '/api/username-available':
                return self.username_available()
            if path == '/api/me':
                if method == 'GET':
                    return self.send_json(200, profile(self.require_user()))
                if method == 'PATCH':
                    return self.update_me()
                if method == 'DELETE':
                    return self.delete_me()
            if method == 'POST' and path == '/api/me/password':
                return self.change_password()
            if method == 'POST' and path == '/api/presence':
                return self.presence()
            if method == 'GET' and path == '/api/friends':
                return self.friends()
            if method == 'POST' and path == '/api/friends/requests':
                return self.friend_request()
            m = re.fullmatch(r'/api/friends/requests/(\d+)(?:/(accept|decline))?', path)
            if m and (method == 'POST') == bool(m[2]) and method in ('POST', 'DELETE'):
                return self.answer_request(int(m[1]), m[2] or 'cancel')
            m = re.fullmatch(r'/api/(friends|blocks)/([A-Za-z0-9_]{3,20})', path)
            if m and method == 'DELETE':
                return self.remove_friend(m[2]) if m[1] == 'friends' else self.unblock(m[2])
            if method == 'POST' and path == '/api/blocks':
                return self.block()
            if path == '/api/decks' and method == 'GET':
                return self.list_decks()
            m = re.fullmatch(r'/api/decks/([^/]+)(/restore)?', path)
            if m and DECK_ID_RE.match(m[1]):
                if method == 'PUT' and not m[2]:
                    return self.put_deck(m[1])
                if method == 'DELETE' and not m[2]:
                    return self.delete_deck(m[1])
                if method == 'POST' and m[2]:
                    return self.restore_deck(m[1])
            raise ApiError(404, 'Not found.')
        except ApiError as e:
            self.send_json(e.status, {'error': e.message})

    def do_GET(self): self.dispatch('GET')
    def do_POST(self): self.dispatch('POST')
    def do_PUT(self): self.dispatch('PUT')
    def do_DELETE(self): self.dispatch('DELETE')
    def do_PATCH(self): self.dispatch('PATCH')

    def auth_check(self):
        # forward_auth do Caddy: 2xx libera; senão o Caddy devolve esta resposta ao navegador (vai para o login).
        if self.current_user():
            self.send_response(204)
            self.end_headers()
            return
        target = self.headers.get('X-Forwarded-Uri') or '/playtest/'
        self.send_response(302)
        self.send_header('Location', '/login/?next=' + quote(target, safe='/'))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()

    def register(self):
        body = self.read_json()
        email = str(body.get('email', '')).strip().lower()
        username = str(body.get('username', '')).strip()
        password = str(body.get('password', ''))
        if not EMAIL_RE.match(email):
            raise ApiError(400, 'Enter a valid email.')
        fields = clean_profile(body)
        if len(password) < 10:
            raise ApiError(400, 'Use at least 10 characters for the password.')
        if body.get('accept_terms') is not True:
            raise ApiError(400, 'Please accept the privacy terms.')
        now = int(time.time())
        with lock:
            if not db.execute('select 1 from invites where email = ?', (email,)).fetchone():
                raise ApiError(403, 'This email is not on the beta list yet.')
            if db.execute('select 1 from users where email = ?', (email,)).fetchone():
                raise ApiError(409, 'This email already has an account. Sign in instead.')
            check_username(username)
            cur = db.execute('insert into users (email, display_name, password_hash, created_at, username, username_display, country, phone, '
                             'friend_code, accepted_terms_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                             (email, fields['display_name'], hash_password(password), now, username.lower(), username,
                              fields['country'], fields['phone'], new_friend_code(username), now))
            user = db.execute('select * from users where id = ?', (cur.lastrowid,)).fetchone()
        self.send_json(201, profile(user), self.start_session(user['id']))

    def username_available(self):
        u = (parse_qs(urlparse(self.path).query).get('u') or [''])[0].strip()
        try:
            with lock:
                check_username(u)
        except ApiError as e:
            return self.send_json(200, {'available': False, 'reason': e.message})
        self.send_json(200, {'available': True})

    def update_me(self):
        user = self.require_user()
        body = self.read_json()
        fields = clean_profile(body, partial=True)
        with lock:
            if 'username' in body and not user['username']:  # conta antiga completando o perfil: escolhe o nome uma vez
                username = str(body['username']).strip()
                check_username(username)
                fields.update(username=username.lower(), username_display=username, friend_code=new_friend_code(username))
            if body.get('accept_terms') is True and not user['accepted_terms_at']:
                fields['accepted_terms_at'] = int(time.time())
            if fields:
                db.execute(f'update users set {", ".join(k + " = ?" for k in fields)} where id = ?', (*fields.values(), user['id']))
            fresh = db.execute('select * from users where id = ?', (user['id'],)).fetchone()
        self.send_json(200, profile(fresh))

    def change_password(self):
        user = self.require_user()
        body = self.read_json()
        if not check_password(str(body.get('current', '')), user['password_hash']):
            raise ApiError(403, 'Current password is incorrect.')
        new = str(body.get('new', ''))
        if len(new) < 10:
            raise ApiError(400, 'Use at least 10 characters for the password.')
        with lock:
            db.execute('update users set password_hash = ? where id = ?', (hash_password(new), user['id']))
            db.execute('delete from sessions where user_id = ?', (user['id'],))  # derruba os outros aparelhos
        self.send_json(200, {'ok': True}, self.start_session(user['id']))

    def delete_me(self):  # LGPD: o jogador apaga a própria conta, com a senha
        user = self.require_user()
        body = self.read_json()
        if not check_password(str(body.get('password', '')), user['password_hash']):
            raise ApiError(403, 'Password is incorrect.')
        with lock:
            for table in ('sessions', 'decks'):
                db.execute(f'delete from {table} where user_id = ?', (user['id'],))
            uid = user['id']
            db.execute('delete from friend_requests where from_id = ? or to_id = ?', (uid, uid))
            db.execute('delete from friendships where user_a = ? or user_b = ?', (uid, uid))
            db.execute('delete from blocks where user_id = ? or blocked_id = ?', (uid, uid))
            db.execute('delete from users where id = ?', (user['id'],))
        self.send_json(200, {'ok': True}, self.session_cookie('', 0))

    # ---------- amigos (etapa 2) ----------
    def presence(self):  # batimento: online no lobby ou em partida
        user = self.require_user()
        status = 'match' if self.read_json().get('status') == 'match' else 'online'
        with lock:
            db.execute('update users set last_seen = ?, status = ? where id = ?', (int(time.time()), status, user['id']))
        self.send_json(200, {'ok': True})

    def friends(self):
        me = self.require_user()['id']
        now = int(time.time())
        card = lambda u: {'username': u['username_display'], 'friend_code': u['friend_code'], 'avatar_card': u['avatar_card']}
        with lock:
            friends = db.execute('select u.* from friendships f join users u on u.id = case when f.user_a = ? then f.user_b else f.user_a end '
                                 'where ? in (f.user_a, f.user_b)', (me, me)).fetchall()
            incoming = db.execute('select r.id as request_id, u.* from friend_requests r join users u on u.id = r.from_id where r.to_id = ?', (me,)).fetchall()
            outgoing = db.execute('select r.id as request_id, u.* from friend_requests r join users u on u.id = r.to_id where r.from_id = ?', (me,)).fetchall()
            blocked = db.execute('select u.* from blocks b join users u on u.id = b.blocked_id where b.user_id = ?', (me,)).fetchall()
        status = lambda u: (u['status'] or 'online') if (u['last_seen'] or 0) > now - ONLINE_WINDOW else 'offline'
        order = {'online': 0, 'match': 1, 'offline': 2}
        self.send_json(200, {
            'friends': sorted(({**card(u), 'status': status(u)} for u in friends), key=lambda f: (order[f['status']], f['username'].lower())),
            'incoming': [{**card(u), 'id': u['request_id']} for u in incoming],
            'outgoing': [{**card(u), 'id': u['request_id']} for u in outgoing],
            'blocked': [card(u) for u in blocked]})

    def by_username(self, username):
        user = db.execute('select * from users where username = ?', (username.lower(),)).fetchone()
        if not user:
            raise ApiError(404, 'Player not found.')
        return user

    def blocked_between(self, a, b):
        return db.execute('select 1 from blocks where (user_id = ? and blocked_id = ?) or (user_id = ? and blocked_id = ?)', (a, b, b, a)).fetchone()

    def befriend(self, a, b):
        db.execute('insert or ignore into friendships values (?, ?, ?)', (min(a, b), max(a, b), int(time.time())))
        db.execute('delete from friend_requests where (from_id = ? and to_id = ?) or (from_id = ? and to_id = ?)', (a, b, b, a))

    def friend_request(self):
        me = self.require_user()
        code = str(self.read_json().get('code', '')).strip()
        with lock:
            other = db.execute('select * from users where lower(friend_code) = lower(?)', (code,)).fetchone()
            # bloqueio nos dois sentidos responde igual a código inexistente (não revela quem bloqueou)
            if not other or self.blocked_between(me['id'], other['id']):
                raise ApiError(404, NO_PLAYER)
            if other['id'] == me['id']:
                raise ApiError(400, 'That is your own friend code.')
            a, b = sorted((me['id'], other['id']))
            if db.execute('select 1 from friendships where user_a = ? and user_b = ?', (a, b)).fetchone():
                raise ApiError(409, f"{other['username_display']} is already your friend.")
            if db.execute('select 1 from friend_requests where from_id = ? and to_id = ?', (other['id'], me['id'])).fetchone():
                self.befriend(me['id'], other['id'])  # o outro já tinha pedido: vira amizade
                return self.send_json(200, {'friend': other['username_display']})
            db.execute('insert or ignore into friend_requests (from_id, to_id, created_at) values (?, ?, ?)', (me['id'], other['id'], int(time.time())))
        self.send_json(201, {'sent': other['username_display']})

    def answer_request(self, request_id, answer):
        me = self.require_user()['id']
        with lock:
            r = db.execute('select * from friend_requests where id = ?', (request_id,)).fetchone()
            mine = r and (r['to_id'] == me if answer in ('accept', 'decline') else r['from_id'] == me)
            if not mine:
                raise ApiError(404, 'Request not found.')
            if answer == 'accept':
                self.befriend(r['from_id'], r['to_id'])
            else:
                db.execute('delete from friend_requests where id = ?', (request_id,))
        self.send_json(200, {'ok': True})

    def remove_friend(self, username):
        me = self.require_user()['id']
        with lock:
            other = self.by_username(username)['id']
            db.execute('delete from friendships where user_a = ? and user_b = ?', (min(me, other), max(me, other)))
        self.send_json(200, {'ok': True})

    def block(self):
        me = self.require_user()['id']
        username = str(self.read_json().get('username', ''))
        with lock:
            other = self.by_username(username)['id']
            if other == me:
                raise ApiError(400, 'You cannot block yourself.')
            db.execute('insert or ignore into blocks values (?, ?, ?)', (me, other, int(time.time())))
            db.execute('delete from friendships where user_a = ? and user_b = ?', (min(me, other), max(me, other)))
            db.execute('delete from friend_requests where (from_id = ? and to_id = ?) or (from_id = ? and to_id = ?)', (me, other, other, me))
        self.send_json(200, {'ok': True})

    def unblock(self, username):
        me = self.require_user()['id']
        with lock:
            db.execute('delete from blocks where user_id = ? and blocked_id = ?', (me, self.by_username(username)['id']))
        self.send_json(200, {'ok': True})

    def login(self):
        body = self.read_json()
        email = str(body.get('email', '')).strip().lower()
        password = str(body.get('password', ''))
        ip, now = self.client_ip(), int(time.time())
        with lock:
            db.execute('delete from login_attempts where at < ?', (now - LOGIN_WINDOW,))
            tries = db.execute('select count(*) from login_attempts where email = ? or ip = ?', (email, ip)).fetchone()[0]
            if tries >= LOGIN_LIMIT:
                raise ApiError(429, 'Too many attempts. Wait 15 minutes and try again.')
            user = db.execute('select * from users where email = ?', (email,)).fetchone()
        if not user or not check_password(password, user['password_hash']):
            with lock:
                db.execute('insert into login_attempts values (?, ?, ?)', (email, ip, now))
            raise ApiError(401, BAD_LOGIN)
        self.send_json(200, profile(user), self.start_session(user['id']))

    def logout(self):
        token = SimpleCookie(self.headers.get('Cookie', '')).get(COOKIE)
        if token:
            with lock:
                db.execute('delete from sessions where token_hash = ?', (token_hash(token.value),))
        self.send_json(200, {'ok': True}, self.session_cookie('', 0))

    def list_decks(self):
        user = self.require_user()
        with lock:
            rows = db.execute('select deck_id, data, revision, updated_at from decks where user_id = ? and deleted_at is null', (user['id'],)).fetchall()
        self.send_json(200, {'decks': [{'id': r['deck_id'], 'data': json.loads(r['data']), 'revision': r['revision'], 'updated_at': r['updated_at']} for r in rows]})

    def put_deck(self, deck_id):
        user = self.require_user()
        body = self.read_json()
        data, revision = body.get('data'), body.get('revision', 0)
        if not isinstance(data, dict) or not isinstance(revision, int):
            raise ApiError(400, 'Send {data, revision}.')
        now = int(time.time())
        with lock:
            row = db.execute('select data, revision from decks where user_id = ? and deck_id = ?', (user['id'], deck_id)).fetchone()
            current = row['revision'] if row else 0
            if revision != current:  # mudou em outro aparelho: o jogador escolhe a versão
                server = {'data': json.loads(row['data']), 'revision': current} if row else None
                self.send_json(409, {'error': 'This deck changed on another device.', 'server': server})
                return
            db.execute('insert into decks values (?, ?, ?, ?, ?, null) on conflict(user_id, deck_id) do update set '
                       'data = excluded.data, revision = excluded.revision, updated_at = excluded.updated_at, deleted_at = null',
                       (user['id'], deck_id, json.dumps(data), current + 1, now))
        self.send_json(200, {'id': deck_id, 'revision': current + 1})

    def delete_deck(self, deck_id):  # exclusão lógica: 30 dias para desfazer
        user = self.require_user()
        with lock:
            db.execute('update decks set deleted_at = ? where user_id = ? and deck_id = ?', (int(time.time()), user['id'], deck_id))
        self.send_json(200, {'ok': True})

    def restore_deck(self, deck_id):
        user = self.require_user()
        with lock:
            cur = db.execute('update decks set deleted_at = null where user_id = ? and deck_id = ? and deleted_at > ?',
                             (user['id'], deck_id, int(time.time()) - 30 * 86400))
        if not cur.rowcount:
            raise ApiError(404, 'Deck not found in the trash.')
        self.send_json(200, {'ok': True})


def make_server(port=8080, host='0.0.0.0'):
    return ThreadingHTTPServer((host, port), Handler)


if __name__ == '__main__':
    open_db()
    print(f'sanctuary-api on :{os.environ.get("PORT", 8080)}', flush=True)
    make_server(int(os.environ.get('PORT', 8080))).serve_forever()
