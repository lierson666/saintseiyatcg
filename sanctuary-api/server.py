"""sanctuary-api: contas e decks do Saint Seiya TCG (docs/arquitetura-area-do-usuario.md, aprovada em 29/10/2026).

Só biblioteca padrão: http.server + sqlite3 + hashlib.scrypt. Roda atrás do Caddy, que também usa
GET /api/auth/check (forward_auth) para liberar o /playtest só a quem está logado.
Cadastro só para emails convidados (tabela invites; SANCTUARY_INVITES semeia na partida).
"""
import calendar, hashlib, hmac, json, os, re, secrets, sqlite3, threading, time, urllib.request, urllib.error
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

DB_PATH = os.environ.get('SANCTUARY_DB', '/data/sanctuary.db')
ORIGIN = os.environ.get('SANCTUARY_ORIGIN', 'https://saintseiyatcg.com')
SECURE_COOKIE = os.environ.get('SANCTUARY_INSECURE_COOKIE') != '1'  # só testes locais desligam o Secure
COOKIE = 'sst_session'
SESSION_DAYS = 30
MAX_BODY = 64 * 1024
MAX_DECKS = 100
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
# Chat (etapa 3): só entre amigos; 500 caracteres; 20 mensagens por minuto; histórico de 90 dias.
MSG_MAX, MSG_PER_MIN, MSG_KEEP_DAYS, MSG_PAGE = 500, 20, 90, 50
# Versão da página de login no link de redirecionamento: muda a URL e o navegador não reaproveita a página velha do cache.
LOGIN_VERSION = '3'
# Painel do sistema (Star Hill → /admin/, autor 29/10/2026): admins por email; pedidos de acesso vêm da home.
ADMINS = {e.strip().lower() for e in os.environ.get('SANCTUARY_ADMINS', '').split(',') if e.strip()}
REQUESTS_PER_HOUR = 5
# Duelo online (docs/duelo-online.md, etapa 4): desafio pelo chat, expira em 60 s; a partida roda no arena-server.
ARENA_URL = os.environ.get('ARENA_URL', 'http://arena-server:8090')
# Ranking e XP (docs/ranking-xp.md, aprovado em 31/10/2026): rank só no duelo online; contra a IA só XP, com teto diário.
TIERS = ('Steel', 'Iron', 'Bronze', 'Silver', 'Gold', 'Kamui')
KAMUI, PIPS, XP_LEVEL, AI_XP_DAY = len(TIERS) - 1, 6, 1000, 500
XP_ONLINE = {'win': 100, 'loss': 50, 'draw': 50}
XP_AI = {'win': 50, 'loss': 25, 'draw': 25}
TITLES = ((50, 'Seventh Sense'), (30, 'Cosmo Awakened'), (20, 'Cloth Bearer'), (10, 'Saint'), (5, 'Trainee'))
ARENA_SECRET = os.environ.get('ARENA_SECRET', '')
CHALLENGE_SECONDS = 60
SUSPENDED = 'This account is suspended.'
OLD_FORM = 'Please reload this page to see the new sign-up form.'

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
create table if not exists messages (id integer primary key, from_id integer not null, to_id integer not null,
  body text not null, created_at integer not null, seen_at integer);
create index if not exists messages_pair on messages(from_id, to_id, id);
create table if not exists reports (id integer primary key, reporter_id integer not null, reported_id integer not null,
  created_at integer not null, excerpt text not null);
create table if not exists access_requests (id integer primary key, email text unique not null, name text not null,
  news integer not null, ip text not null, created_at integer not null, status text not null default 'pending', decided_at integer);
create table if not exists challenges (id integer primary key, from_id integer not null, to_id integer not null, deck text not null,
  created_at integer not null, status text not null default 'pending', match_id text, winner_id integer, settled_at integer);
create table if not exists duels (challenge_id integer primary key, a_id integer, b_id integer, winner text, a_god text, b_god text,
  rounds integer, finished_at integer not null);
create index if not exists duels_a on duels(a_id, finished_at);
create index if not exists duels_b on duels(b_id, finished_at);
create table if not exists ai_xp (id integer primary key, user_id integer not null, result text not null, xp integer not null,
  created_at integer not null);
create index if not exists ai_xp_user on ai_xp(user_id, created_at);
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
    for col in ('username', 'username_display', 'country', 'phone', 'friend_code', 'avatar_card', 'accepted_terms_at', 'last_seen', 'status', 'suspended_at'):
        if col not in have:
            db.execute(f'alter table users add column {col}')
    have = {r['name'] for r in db.execute('pragma table_info(messages)')}
    for col in ('kind', 'ref'):  # mensagem especial do chat: 'challenge' (ref = id do desafio) e 'result'
        if col not in have:
            db.execute(f'alter table messages add column {col}')
    if 'resolved_at' not in {r['name'] for r in db.execute('pragma table_info(reports)')}:
        db.execute('alter table reports add column resolved_at')
    if 'deck_b' not in {r['name'] for r in db.execute('pragma table_info(challenges)')}:
        db.execute('alter table challenges add column deck_b')  # deck de quem aceitou (só o God aparece no perfil)
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
            'country': u['country'], 'phone': u['phone'], 'avatar_card': u['avatar_card'], 'complete': bool(u['username']),
            'admin': u['email'] in ADMINS}


def season_of(ts):  # temporada = mês do calendário (UTC)
    t = time.gmtime(ts)
    return t.tm_year * 12 + t.tm_mon - 1


def season_name(n):
    return f'{n // 12}-{n % 12 + 1:02d}'


def climb(results, now=None):
    """Refaz a escalada a partir dos duelos online [(finished_at, 'win'|'loss'|'draw')] em ordem.
    Steel: vitória +2 pips, derrota 0. Demais: +1/-1. 6 pips por divisão (IV→I); não cai de tier.
    Kamui não tem divisão: pontos (+1/-1, mínimo 0). Virada do mês: um tier abaixo, divisão IV, sem pips."""
    now = time.time() if now is None else now
    r = {'tier': 0, 'division': 4, 'pips': 0, 'points': 0}
    season, best, last = season_of(now), None, None
    key = lambda r: (r['tier'], -(r['division'] or 0), r['pips'] + r['points'])
    cur = None
    for ts, res in list(results) + [(now, None)]:
        s = season_of(ts)
        if cur is not None and s > cur:
            last = best if s - cur == 1 else None
            for _ in range(min(s - cur, KAMUI)):
                r = {'tier': max(0, r['tier'] - 1), 'division': 4, 'pips': 0, 'points': 0}
            best = None
        cur = s
        if res is None:
            break
        t = r['tier']
        if t == KAMUI:
            r['points'] = max(0, r['points'] + {'win': 1, 'loss': -1}.get(res, 0))
        elif res == 'win':
            r['pips'] += 2 if t == 0 else 1
            if r['pips'] >= PIPS:
                r['pips'] -= PIPS
                if r['division'] > 1:
                    r['division'] -= 1
                else:
                    r = {'tier': t + 1, 'division': None if t + 1 == KAMUI else 4, 'pips': 0, 'points': 0}
        elif res == 'loss' and t > 0:
            if r['pips']:
                r['pips'] -= 1
            elif r['division'] < 4:
                r['division'] += 1
                r['pips'] = PIPS - 1
        best = dict(r) if best is None or key(r) > key(best) else best
    show = lambda r: r and {'tier': TIERS[r['tier']], 'division': r['division']}
    return {**r, 'tier': TIERS[r['tier']], 'season': season_name(season), 'season_ends': calendar.timegm(((season + 1) // 12, (season + 1) % 12 + 1, 1, 0, 0, 0)), 'best': show(best), 'last_season': show(last) if last else None}


def level_of(xp):
    level = xp // XP_LEVEL + 1
    return {'xp': xp, 'level': level, 'xp_in_level': xp % XP_LEVEL, 'xp_level_size': XP_LEVEL,
            'title': next((t for lv, t in TITLES if level >= lv), None)}


def online_results(uid):
    rows = db.execute('select * from duels where a_id = ? or b_id = ? order by finished_at, challenge_id', (uid, uid)).fetchall()
    side = lambda d: 'A' if d['a_id'] == uid else 'B'
    return [(d['finished_at'], 'draw' if not d['winner'] else 'win' if d['winner'] == side(d) else 'loss') for d in rows]


def rank_of(uid):
    results = online_results(uid)
    ai = db.execute('select coalesce(sum(xp), 0) from ai_xp where user_id = ?', (uid,)).fetchone()[0]
    return {**climb(results), **level_of(ai + sum(XP_ONLINE[r] for _, r in results))}


def kamui_board(limit=20):
    # shortcut: refaz a escalada de todo jogador com duelo a cada pedido; trocar por tabela de rank quando houver centenas de jogadores.
    ids = [r[0] for r in db.execute('select distinct id from users join duels on id in (a_id, b_id) where suspended_at is null')]
    board = []
    for uid in ids:
        r = climb(online_results(uid))
        if r['tier'] == TIERS[KAMUI]:
            name = db.execute('select username_display from users where id = ?', (uid,)).fetchone()[0]
            board.append({'username': name, 'points': r['points']})
    board.sort(key=lambda b: -b['points'])
    return board[:limit]


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
                             'where s.token_hash = ? and s.expires_at > ? and u.suspended_at is null', (token_hash(token.value), now)).fetchone()
            if row:
                db.execute('update sessions set last_seen = ? where token_hash = ?', (now, token_hash(token.value)))
        return row

    def require_user(self):
        user = self.current_user()
        if not user:
            raise ApiError(401, 'Sign in to continue.')
        return user

    def require_admin(self):
        user = self.require_user()
        if user['email'] not in ADMINS:
            raise ApiError(403, 'Admins only.')
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
            m = re.fullmatch(r'/api/chat/([A-Za-z0-9_]{3,20})(/report)?', path)
            if m:
                if method == 'GET' and not m[2]:
                    return self.chat_read(m[1])
                if method == 'POST':
                    return self.chat_report(m[1]) if m[2] else self.chat_send(m[1])
            m = re.fullmatch(r'/api/profile/([A-Za-z0-9_]{3,20})', path)
            if m and method == 'GET':
                return self.player_profile(m[1])
            if method == 'POST' and path == '/api/challenges':
                return self.challenge()
            if method == 'GET' and path == '/api/challenges/pending':
                return self.challenges_pending()
            m = re.fullmatch(r'/api/challenges/(\d+)/(accept|decline|cancel)', path)
            if m and method == 'POST':
                return self.challenge_answer(int(m[1]), m[2])
            if method == 'GET' and path == '/api/rank':
                return self.rank()
            if method == 'POST' and path == '/api/xp/ai':
                return self.ai_xp()
            if method == 'POST' and path == '/api/access-requests':
                return self.access_request()
            if path.startswith('/api/admin/'):
                return self.admin(method, path)
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
        self.send_header('Location', f'/login/?v={LOGIN_VERSION}&next=' + quote(target, safe='/'))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()

    def register(self):
        body = self.read_json()
        email = str(body.get('email', '')).strip().lower()
        username = str(body.get('username', '')).strip()
        password = str(body.get('password', ''))
        if 'username' not in body:  # formulário antigo em cache (sem usuário e país)
            raise ApiError(400, OLD_FORM)
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
            db.execute('delete from messages where from_id = ? or to_id = ?', (uid, uid))
            db.execute('delete from challenges where from_id = ? or to_id = ?', (uid, uid))
            db.execute('delete from reports where reporter_id = ?', (uid,))
            db.execute('delete from ai_xp where user_id = ?', (uid,))
            db.execute('delete from access_requests where email = ?', (user['email'],))
            db.execute('delete from login_attempts where email = ?', (user['email'],))
            # duelos: o histórico do adversário fica, o apagado vira "Deleted player" (id nulo)
            db.execute('update duels set a_id = null where a_id = ?', (uid,))
            db.execute('update duels set b_id = null where b_id = ?', (uid,))
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
            unread = dict(db.execute('select from_id, count(*) from messages where to_id = ? and seen_at is null group by from_id', (me,)).fetchall())
        status = lambda u: (u['status'] or 'online') if (u['last_seen'] or 0) > now - ONLINE_WINDOW else 'offline'
        order = {'online': 0, 'match': 1, 'offline': 2}
        self.send_json(200, {
            'friends': sorted(({**card(u), 'status': status(u), 'unread': unread.get(u['id'], 0)} for u in friends), key=lambda f: (order[f['status']], f['username'].lower())),
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

    # ---------- chat (etapa 3) ----------
    def friend_by_username(self, me, username):  # o outro precisa ser amigo (e não bloqueado)
        other = self.by_username(username)
        a, b = sorted((me, other['id']))
        if not db.execute('select 1 from friendships where user_a = ? and user_b = ?', (a, b)).fetchone():
            raise ApiError(403, 'You can only chat with friends.')
        return other

    def chat_read(self, username):
        me = self.require_user()['id']
        after = (parse_qs(urlparse(self.path).query).get('after') or ['0'])[0]
        after = int(after) if after.isdigit() else 0
        with lock:
            other = self.friend_by_username(me, username)
            self.settle_pair(me, other['id'])
            rows = db.execute('select * from (select * from messages where ((from_id = ? and to_id = ?) or (from_id = ? and to_id = ?)) and id > ? '
                              'order by id desc limit ?) order by id', (me, other['id'], other['id'], me, after, MSG_PAGE)).fetchall()
            db.execute('update messages set seen_at = ? where from_id = ? and to_id = ? and seen_at is null', (int(time.time()), other['id'], me))
            # "Seen" da minha última mensagem: o outro já leu?
            last_seen = db.execute('select max(id) from messages where from_id = ? and to_id = ? and seen_at is not null', (me, other['id'])).fetchone()[0]
            refs = [r['ref'] for r in rows if r['ref']]
            challenges = {c['id']: c for c in db.execute(f"select * from challenges where id in ({','.join('?' * len(refs))})", refs).fetchall()} if refs else {}
            recent = self.open_challenges(me, other['id'])
        out = []
        for r in rows:
            m = {'id': r['id'], 'mine': r['from_id'] == me, 'body': r['body'], 'at': r['created_at'], 'kind': r['kind'] or 'text'}
            c = challenges.get(r['ref'])
            if c:
                m['challenge'] = self.challenge_view(c, me)
            out.append(m)
        self.send_json(200, {'messages': out, 'seen_up_to': last_seen or 0,
                             'challenges': recent})

    def chat_send(self, username):
        me = self.require_user()['id']
        body = ' '.join(str(self.read_json().get('body', '')).split(' ')).strip()
        if not body:
            raise ApiError(400, 'Write a message.')
        if len(body) > MSG_MAX:
            raise ApiError(400, f'Messages can have up to {MSG_MAX} characters.')
        now = int(time.time())
        with lock:
            other = self.friend_by_username(me, username)
            if db.execute('select count(*) from messages where from_id = ? and created_at > ?', (me, now - 60)).fetchone()[0] >= MSG_PER_MIN:
                raise ApiError(429, 'You are sending messages too fast. Wait a moment.')
            cur = db.execute('insert into messages (from_id, to_id, body, created_at) values (?, ?, ?, ?)', (me, other['id'], body, now))
            db.execute('delete from messages where created_at < ?', (now - MSG_KEEP_DAYS * 86400,))
        self.send_json(201, {'id': cur.lastrowid, 'mine': True, 'body': body, 'at': now})

    def chat_report(self, username):  # guarda as últimas 20 mensagens da conversa para o autor revisar
        me = self.require_user()['id']
        with lock:
            other = self.by_username(username)
            rows = db.execute('select from_id, body, created_at from messages where (from_id = ? and to_id = ?) or (from_id = ? and to_id = ?) '
                              'order by id desc limit 20', (me, other['id'], other['id'], me)).fetchall()
            db.execute('insert into reports (reporter_id, reported_id, created_at, excerpt) values (?, ?, ?, ?)',
                       (me, other['id'], int(time.time()), json.dumps([dict(r) for r in rows])))
        self.send_json(201, {'ok': True})

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
        if user['suspended_at']:
            raise ApiError(403, SUSPENDED)
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
        main = data.get('main_deck', [])
        if not isinstance(main, list) or len(main) > 200:
            raise ApiError(400, 'This deck is not valid.')
        now = int(time.time())
        with lock:
            if not db.execute('select 1 from decks where user_id = ? and deck_id = ?', (user['id'], deck_id)).fetchone() and \
                    db.execute('select count(*) from decks where user_id = ? and deleted_at is null', (user['id'],)).fetchone()[0] >= MAX_DECKS:
                raise ApiError(400, f'You can keep up to {MAX_DECKS} decks.')
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

    # ---------- desafios (duelo online, etapa 4) ----------
    @staticmethod
    def challenge_status(c, now=None):
        now = now or int(time.time())
        return 'expired' if c['status'] == 'pending' and c['created_at'] < now - CHALLENGE_SECONDS else c['status']

    def challenge_view(self, c, me):
        return {'id': c['id'], 'status': self.challenge_status(c), 'mine': c['from_id'] == me, 'match': c['match_id'],
                'expires_at': c['created_at'] + CHALLENGE_SECONDS}

    def open_challenges(self, me, other):  # estado atual dos desafios recentes da conversa (a mensagem já mostrada muda de estado)
        rows = db.execute('select * from challenges where ((from_id = ? and to_id = ?) or (from_id = ? and to_id = ?)) and created_at > ?',
                          (me, other, other, me, int(time.time()) - 3600)).fetchall()
        return [self.challenge_view(c, me) for c in rows]

    def challenge(self):
        me = self.require_user()
        body = self.read_json()
        deck = body.get('deck')
        if not isinstance(deck, dict) or not isinstance(deck.get('main_deck'), list):
            raise ApiError(400, 'Choose a deck.')
        now = int(time.time())
        with lock:
            other = self.friend_by_username(me['id'], str(body.get('to', '')))
            if (other['last_seen'] or 0) <= now - ONLINE_WINDOW:
                raise ApiError(409, f"{other['username_display']} is offline.")
            if db.execute("select 1 from challenges where from_id = ? and to_id = ? and status = 'pending' and created_at > ?",
                          (me['id'], other['id'], now - CHALLENGE_SECONDS)).fetchone():
                raise ApiError(409, 'You already challenged this friend. Wait for the answer.')
            cur = db.execute('insert into challenges (from_id, to_id, deck, created_at) values (?, ?, ?, ?)', (me['id'], other['id'], json.dumps(deck), now))
            db.execute("insert into messages (from_id, to_id, body, created_at, kind, ref) values (?, ?, ?, ?, 'challenge', ?)",
                       (me['id'], other['id'], f"⚔ {me['username_display']} challenged you to a duel", now, cur.lastrowid))
        self.send_json(201, {'id': cur.lastrowid, 'expires_at': now + CHALLENGE_SECONDS})

    def challenges_pending(self):  # aviso no lobby: desafios recebidos ainda abertos e os meus que viraram partida
        me = self.require_user()['id']
        now = int(time.time())
        with lock:
            rows = db.execute('select c.*, u.username_display as from_name from challenges c join users u on u.id = c.from_id '
                              "where (c.to_id = ? and c.status = 'pending' and c.created_at > ?) "
                              "or (c.from_id = ? and c.status = 'accepted' and c.created_at > ?)", (me, now - CHALLENGE_SECONDS, me, now - 300)).fetchall()
        self.send_json(200, {'challenges': [{**self.challenge_view(c, me), 'from': c['from_name']} for c in rows]})

    def challenge_answer(self, cid, answer):
        me = self.require_user()
        body = self.read_json()
        now = int(time.time())
        with lock:
            c = db.execute('select * from challenges where id = ?', (cid,)).fetchone()
            if not c or me['id'] not in (c['from_id'], c['to_id']) or (answer == 'cancel') != (c['from_id'] == me['id']):
                raise ApiError(404, 'Challenge not found.')
            if self.challenge_status(c, now) != 'pending':
                raise ApiError(409, 'This challenge is no longer open.')
            if answer != 'accept':
                db.execute('update challenges set status = ? where id = ?', (answer + 'd' if answer == 'decline' else 'cancelled', cid))
                return self.send_json(200, {'ok': True})
            deck = body.get('deck')
            if not isinstance(deck, dict) or not isinstance(deck.get('main_deck'), list):
                raise ApiError(400, 'Choose a deck.')
            names = dict(db.execute('select id, username_display from users where id in (?, ?)', (c['from_id'], c['to_id'])).fetchall())
        # fora do lock: chamada de rede ao arena-server (quem desafiou é A; quem aceitou é B)
        match_id = self.arena_create({'A': names[c['from_id']], 'B': names[c['to_id']]}, {'A': json.loads(c['deck']), 'B': deck})
        with lock:
            cur = db.execute("update challenges set status = 'accepted', match_id = ?, deck_b = ? where id = ? and status = 'pending'",
                             (match_id, json.dumps({'god': deck.get('god')}), cid))
            if not cur.rowcount:
                raise ApiError(409, 'This challenge is no longer open.')
        self.send_json(200, {'match': match_id})

    def player_profile(self, username):  # perfil público entre jogadores logados; bloqueados e suspensos aparecem como inexistentes
        me = self.require_user()
        with lock:
            u = db.execute('select * from users where username = ?', (username.lower(),)).fetchone()
            if not u or u['suspended_at'] or (u['id'] != me['id'] and self.blocked_between(me['id'], u['id'])):
                raise ApiError(404, 'Player not found.')
            uid = u['id']
            rows = db.execute('select d.*, a.username_display as a_name, b.username_display as b_name from duels d '
                              'left join users a on a.id = d.a_id left join users b on b.id = d.b_id '
                              'where d.a_id = ? or d.b_id = ? order by d.finished_at desc, d.challenge_id desc', (uid, uid)).fetchall()
        wins = losses = 0
        recent = []
        for d in rows:
            side = 'A' if d['a_id'] == uid else 'B'
            result = 'draw' if not d['winner'] else 'win' if d['winner'] == side else 'loss'
            wins += result == 'win'
            losses += result == 'loss'
            if len(recent) < 10:
                recent.append({'opponent': (d['b_name'] if side == 'A' else d['a_name']) or 'Deleted player', 'result': result,
                               'god': d['a_god'] if side == 'A' else d['b_god'], 'date': d['finished_at']})
        played = len(rows)
        r = rank_of(uid)
        self.send_json(200, {'rank': {k: r[k] for k in ('tier', 'division', 'points', 'level', 'title')}, 'username': u['username_display'], 'country': u['country'], 'joined': u['created_at'],
                             'avatar_card': u['avatar_card'], 'stats': {'played': played, 'wins': wins, 'losses': losses,
                             'winrate': round(100 * wins / played) if played else 0}, 'recent': recent})

    def arena_create(self, players, decks):
        req = urllib.request.Request(f'{ARENA_URL}/arena/matches', json.dumps({'players': players, 'decks': decks}).encode(),
                                     {'Content-Type': 'application/json', 'X-Arena-Secret': ARENA_SECRET})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return json.load(r)['id']
        except urllib.error.HTTPError as e:
            msg = json.loads(e.read() or b'{}').get('error') if e.code == 400 else None
            raise ApiError(400 if msg else 502, msg or 'The duel server is not available. Try again in a moment.')
        except (urllib.error.URLError, OSError):
            raise ApiError(502, 'The duel server is not available. Try again in a moment.')

    # ---------- ranking e XP ----------
    def rank(self):
        uid = self.require_user()['id']
        with lock:
            self.settle_pair(uid)  # duelo recém-terminado entra no rank sem esperar o chat
            self.send_json(200, {**rank_of(uid), 'kamui': kamui_board(), **self.ai_today(uid)})

    def ai_today(self, uid):
        day = int(time.time()) // 86400 * 86400
        used = db.execute('select coalesce(sum(xp), 0) from ai_xp where user_id = ? and created_at >= ?', (uid, day)).fetchone()[0]
        return {'ai_xp_today': used, 'ai_xp_cap': AI_XP_DAY}

    def ai_xp(self):  # resultado contra a IA vem do navegador: só XP, com teto diário
        uid = self.require_user()['id']
        result = self.read_json().get('result')
        if result not in XP_AI:
            raise ApiError(400, 'Invalid result.')
        with lock:
            gained = max(0, min(XP_AI[result], AI_XP_DAY - self.ai_today(uid)['ai_xp_today']))
            if gained:
                db.execute('insert into ai_xp (user_id, result, xp, created_at) values (?, ?, ?, ?)', (uid, result, gained, int(time.time())))
            self.send_json(200, {**rank_of(uid), 'gained': gained, **self.ai_today(uid)})

    def settle_pair(self, a, b=None):  # resultado das partidas da conversa (ou de todas do jogador, sem b): vira mensagem no chat
        pair = ('((from_id = ? and to_id = ?) or (from_id = ? and to_id = ?))', (a, b, b, a)) if b else ('(from_id = ? or to_id = ?)', (a, a))
        rows = db.execute("select * from challenges where status = 'accepted' and settled_at is null and " + pair[0], pair[1]).fetchall()
        for c in rows:
            try:
                req = urllib.request.Request(f"{ARENA_URL}/arena/matches/{c['match_id']}/result", headers={'X-Arena-Secret': ARENA_SECRET})
                with urllib.request.urlopen(req, timeout=3) as r:
                    victory = json.load(r).get('victory')
            except urllib.error.HTTPError as e:
                victory = {'winner': None, 'reason': 'gone'} if e.code == 404 else None
            except (urllib.error.URLError, OSError):
                continue
            if not victory:
                continue
            winner = {'A': c['from_id'], 'B': c['to_id']}.get(victory.get('winner'))
            name = db.execute('select username_display from users where id = ?', (winner,)).fetchone() if winner else None
            text = f"🏆 {name[0]} won the duel." if name else ('The duel ended.' if victory.get('reason') == 'gone' else 'The duel ended in a draw.')
            now = int(time.time())
            db.execute('update challenges set winner_id = ?, settled_at = ? where id = ?', (winner, now, c['id']))
            rounds = victory.get('rounds')
            if victory.get('reason') != 'gone':  # partida que sumiu do arena-server não conta como duelo jogado
                god = lambda d: str((json.loads(d) if isinstance(d, str) else d).get('god') or '')[:40] or None
                db.execute('insert or ignore into duels values (?, ?, ?, ?, ?, ?, ?, ?)',
                           (c['id'], c['from_id'], c['to_id'], victory.get('winner') if winner else None, god(c['deck']), god(c['deck_b'] or '{}'),
                            rounds if isinstance(rounds, int) else None, now))
            db.execute("insert into messages (from_id, to_id, body, created_at, kind, ref, seen_at) values (?, ?, ?, ?, 'result', ?, ?)",
                       (c['from_id'], c['to_id'], text, now, c['id'], None))

    # ---------- pedidos de acesso (home) ----------
    def access_request(self):  # resposta igual para email novo ou repetido: não revela quem já pediu
        body = self.read_json()
        email = str(body.get('email', '')).strip().lower()
        name = ' '.join(str(body.get('name', '')).split())[:80]
        if not EMAIL_RE.match(email):
            raise ApiError(400, 'Enter a valid email.')
        if len(name) < 2:
            raise ApiError(400, 'Enter your name.')
        ip, now = self.client_ip(), int(time.time())
        with lock:
            if db.execute('select count(*) from access_requests where ip = ? and created_at > ?', (ip, now - 3600)).fetchone()[0] >= REQUESTS_PER_HOUR:
                raise ApiError(429, 'Too many requests. Try again later.')
            db.execute('insert or ignore into access_requests (email, name, news, ip, created_at) values (?, ?, ?, ?, ?)',
                       (email, name, 1 if body.get('news') is True else 0, ip, now))
        self.send_json(201, {'ok': True})

    # ---------- painel do sistema (/admin/, aberto pelo Star Hill) ----------
    def admin(self, method, path):
        self.require_admin()
        now = int(time.time())
        if method == 'GET' and path == '/api/admin/overview':
            return self.admin_overview(now)
        m = re.fullmatch(r'/api/admin/requests/(\d+)/(approve|decline)', path)
        if m and method == 'POST':
            with lock:
                r = db.execute("select * from access_requests where id = ? and status = 'pending'", (int(m[1]),)).fetchone()
                if not r:
                    raise ApiError(404, 'Request not found.')
                if m[2] == 'approve':
                    db.execute('insert or ignore into invites values (?, ?)', (r['email'], now))
                db.execute('update access_requests set status = ?, decided_at = ? where id = ?', (m[2] + 'd', now, r['id']))
            return self.send_json(200, {'ok': True})
        if path == '/api/admin/invites' and method == 'POST':
            email = str(self.read_json().get('email', '')).strip().lower()
            if not EMAIL_RE.match(email):
                raise ApiError(400, 'Enter a valid email.')
            with lock:
                db.execute('insert or ignore into invites values (?, ?)', (email, now))
            return self.send_json(201, {'ok': True})
        m = re.fullmatch(r'/api/admin/invites/([^/]+)', path)
        if m and method == 'DELETE':  # tira o convite; conta já criada continua
            with lock:
                db.execute('delete from invites where email = ?', (m[1].lower(),))
            return self.send_json(200, {'ok': True})
        m = re.fullmatch(r'/api/admin/users/([A-Za-z0-9_]{3,20})/(suspend|restore)', path)
        if m and method == 'POST':
            with lock:
                user = self.by_username(m[1])
                if user['email'] in ADMINS:
                    raise ApiError(400, 'Admins cannot be suspended here.')
                db.execute('update users set suspended_at = ? where id = ?', (now if m[2] == 'suspend' else None, user['id']))
                if m[2] == 'suspend':
                    db.execute('delete from sessions where user_id = ?', (user['id'],))  # sai de todos os aparelhos
            return self.send_json(200, {'ok': True})
        m = re.fullmatch(r'/api/admin/reports/(\d+)/resolve', path)
        if m and method == 'POST':
            with lock:
                db.execute('update reports set resolved_at = ? where id = ?', (now, int(m[1])))
            return self.send_json(200, {'ok': True})
        raise ApiError(404, 'Not found.')

    def admin_overview(self, now):
        with lock:
            requests = db.execute("select r.*, exists(select 1 from users u where u.email = r.email) as has_account from access_requests r "
                                  "where status = 'pending' order by created_at").fetchall()
            invites = db.execute('select i.email, i.created_at, u.username_display, u.friend_code from invites i left join users u on u.email = i.email '
                                 'order by i.created_at desc').fetchall()
            users = db.execute('select * from users order by created_at desc').fetchall()
            reports = db.execute('select r.*, a.username_display as reporter, b.username_display as reported, b.id as reported_id '
                                 'from reports r join users a on a.id = r.reporter_id join users b on b.id = r.reported_id '
                                 'where r.resolved_at is null order by r.created_at').fetchall()
        names = {u['id']: u['username_display'] for u in users}
        online = lambda u: (u['status'] or 'online') if (u['last_seen'] or 0) > now - ONLINE_WINDOW else 'offline'
        self.send_json(200, {
            'requests': [{'id': r['id'], 'email': r['email'], 'name': r['name'], 'news': bool(r['news']), 'at': r['created_at'],
                          'has_account': bool(r['has_account'])} for r in requests],
            'invites': [{'email': i['email'], 'at': i['created_at'], 'username': i['username_display'], 'friend_code': i['friend_code']} for i in invites],
            'users': [{'username': u['username_display'], 'friend_code': u['friend_code'], 'name': u['display_name'], 'email': u['email'], 'country': u['country'],
                       'created_at': u['created_at'], 'last_seen': u['last_seen'], 'status': online(u), 'suspended': bool(u['suspended_at']),
                       'admin': u['email'] in ADMINS} for u in users],
            'reports': [{'id': r['id'], 'reporter': r['reporter'], 'reported': r['reported'], 'at': r['created_at'],
                         'messages': [{'from': names.get(m['from_id'], '?'), 'body': m['body'], 'at': m['created_at']}
                                      for m in reversed(json.loads(r['excerpt']))]} for r in reports]})


def make_server(port=8080, host='0.0.0.0'):
    return ThreadingHTTPServer((host, port), Handler)


if __name__ == '__main__':
    open_db()
    print(f'sanctuary-api on :{os.environ.get("PORT", 8080)}', flush=True)
    make_server(int(os.environ.get('PORT', 8080))).serve_forever()
