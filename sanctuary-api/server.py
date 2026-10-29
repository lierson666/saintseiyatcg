"""sanctuary-api: contas e decks do Saint Seiya TCG (docs/arquitetura-area-do-usuario.md, aprovada em 29/10/2026).

Só biblioteca padrão: http.server + sqlite3 + hashlib.scrypt. Roda atrás do Caddy, que também usa
GET /api/auth/check (forward_auth) para liberar o /playtest só a quem está logado.
Cadastro só para emails convidados (tabela invites; SANCTUARY_INVITES semeia na partida).
"""
import hashlib, hmac, json, os, re, secrets, sqlite3, threading, time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote, urlparse

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

SCHEMA = """
create table if not exists users (id integer primary key, email text unique not null, display_name text not null,
  password_hash text not null, created_at integer not null);
create table if not exists sessions (token_hash text primary key, user_id integer not null references users(id),
  created_at integer not null, expires_at integer not null, last_seen integer not null);
create table if not exists invites (email text primary key, created_at integer not null);
create table if not exists decks (user_id integer not null references users(id), deck_id text not null, data text not null,
  revision integer not null, updated_at integer not null, deleted_at integer, primary key (user_id, deck_id));
create table if not exists login_attempts (email text not null, ip text not null, at integer not null);
"""

lock = threading.Lock()
db = None


def open_db(path=DB_PATH):
    global db
    db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.executescript('pragma journal_mode=wal; pragma foreign_keys=on;' + SCHEMA)
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
            row = db.execute('select u.id, u.email, u.display_name from sessions s join users u on u.id = s.user_id '
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
            if method == 'GET' and path == '/api/me':
                u = self.require_user()
                return self.send_json(200, {'email': u['email'], 'name': u['display_name']})
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
        name = str(body.get('name', '')).strip()[:60]
        password = str(body.get('password', ''))
        if not EMAIL_RE.match(email):
            raise ApiError(400, 'Enter a valid email.')
        if not name:
            raise ApiError(400, 'Enter your name.')
        if len(password) < 10:
            raise ApiError(400, 'Use at least 10 characters for the password.')
        with lock:
            if not db.execute('select 1 from invites where email = ?', (email,)).fetchone():
                raise ApiError(403, 'This email is not on the beta list yet.')
            if db.execute('select 1 from users where email = ?', (email,)).fetchone():
                raise ApiError(409, 'This email already has an account. Sign in instead.')
            cur = db.execute('insert into users (email, display_name, password_hash, created_at) values (?, ?, ?, ?)',
                             (email, name, hash_password(password), int(time.time())))
        self.send_json(201, {'email': email, 'name': name}, self.start_session(cur.lastrowid))

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
            user = db.execute('select id, password_hash, display_name from users where email = ?', (email,)).fetchone()
        if not user or not check_password(password, user['password_hash']):
            with lock:
                db.execute('insert into login_attempts values (?, ?, ?)', (email, ip, now))
            raise ApiError(401, BAD_LOGIN)
        self.send_json(200, {'email': email, 'name': user['display_name']}, self.start_session(user['id']))

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
