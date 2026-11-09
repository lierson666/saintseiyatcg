"""Plataforma 4.0 (docs/platform-4.0.md): Nexus, Codex CMS, decks públicos, guildas, torneios e meta, em /api/platform/*.

Isolamento: tudo que este módulo grava fica no próprio banco (platform-<ambiente>.db). O banco de contas e decks abre em
modo só leitura (mode=ro), então nada daqui consegue alterar conta, rank, moedas ou deck real. Só o ambiente playtest responde.
Permissões sempre no servidor: developer = SANCTUARY_ADMINS; publisher, moderator e judge vêm da tabela roles.
"""
import hashlib, json, os, re, secrets, sqlite3, threading, time
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import cosmo_pairing as pairing

ENV = os.environ.get('SANCTUARY_ENV', 'playtest')
SCHEMA_VERSION = 1
REGISTRY_DIR = Path(os.environ.get('COSMO_REGISTRY', '/app/data/registry'))
ROLES = ('publisher', 'moderator', 'judge')
KINDS = ('news', 'guide', 'lesson', 'ruling', 'balance')
BALANCE_KEYS = ('affected', 'previous', 'new', 'release', 'effective', 'reason', 'tests')
VISIBILITY = ('private', 'unlisted', 'public')
GUILD_ROLES = ('leader', 'officer', 'member')
FORMATS = ('round_robin', 'single_elimination', 'swiss')
MIN_SAMPLE = 30  # abaixo disso o Meta Hub mostra a contagem, mas não a taxa de vitória
GUILD_XP_DAILY_CAP = 1000
TEXT_MAX, TITLE_MAX = 20000, 120
SLUG_RE = re.compile(r'^[a-z0-9][a-z0-9-]{1,79}$')
TAG_RE = re.compile(r'^[A-Z0-9]{2,5}$')
KEY_RE = re.compile(r'^[A-Za-z0-9:_.-]{1,120}$')

SCHEMA = """
create table if not exists meta (key text primary key, value text);
create table if not exists audit (id integer primary key, at integer not null, actor integer, action text not null, target text, detail text);
create index if not exists audit_target on audit(target, id);
create table if not exists roles (user_id integer not null, role text not null, granted_by integer not null, at integer not null, primary key (user_id, role));
create table if not exists actions (user_id integer not null, action text not null, at integer not null);
create index if not exists actions_i on actions(user_id, action, at);
create table if not exists notifications (id integer primary key, user_id integer not null, kind text not null, text text not null, link text, at integer not null, read_at integer);
create index if not exists notifications_u on notifications(user_id, id);

create table if not exists content (id integer primary key, kind text not null, slug text unique not null, status text not null default 'draft', title text not null,
  body text not null, category text, lang text not null default 'en', featured integer not null default 0, placement text, publish_at integer,
  author_id integer not null, meta text not null default '{}', revision integer not null default 1, created_at integer not null, updated_at integer not null, published_at integer);
create index if not exists content_list on content(kind, status, publish_at);
create table if not exists content_revisions (content_id integer not null, revision integer not null, title text not null, body text not null, meta text not null, author_id integer not null, at integer not null, primary key (content_id, revision));

create table if not exists shared_decks (id text primary key, owner_id integer not null, deck_id text not null, visibility text not null, name text, god text, archetype text, strategy text,
  version integer not null, forked_from text, created_at integer not null, updated_at integer not null, unique (owner_id, deck_id));
create index if not exists shared_public on shared_decks(visibility, updated_at);
create table if not exists deck_versions (shared_id text not null, version integer not null, data text not null, at integer not null, primary key (shared_id, version));
create table if not exists deck_ratings (shared_id text not null, user_id integer not null, stars integer not null, at integer not null, primary key (shared_id, user_id));
create table if not exists deck_favorites (shared_id text not null, user_id integer not null, at integer not null, primary key (shared_id, user_id));

create table if not exists comments (id integer primary key, target text not null, parent_id integer, author_id integer not null, body text not null, at integer not null, deleted_at integer, hidden_at integer);
create index if not exists comments_target on comments(target, id);
create table if not exists comment_votes (comment_id integer not null, user_id integer not null, value integer not null, primary key (comment_id, user_id));
create table if not exists comment_reports (id integer primary key, comment_id integer not null, reporter_id integer not null, reason text, at integer not null, resolved_at integer, unique (comment_id, reporter_id));

create table if not exists guilds (id text primary key, name text unique collate nocase not null, tag text unique not null, description text, emblem text, visibility text not null, xp integer not null default 0, created_by integer not null, created_at integer not null);
create table if not exists guild_members (user_id integer primary key, guild_id text not null, role text not null, joined_at integer not null);
create index if not exists guild_members_g on guild_members(guild_id);
create table if not exists guild_requests (id integer primary key, guild_id text not null, user_id integer not null, kind text not null, message text, status text not null default 'pending', by_id integer not null, at integer not null);
create unique index if not exists guild_requests_open on guild_requests(guild_id, user_id) where status = 'pending';
create table if not exists guild_posts (id integer primary key, guild_id text not null, author_id integer not null, body text not null, at integer not null);
create table if not exists guild_teams (id integer primary key, guild_id text not null, name text not null, captain_id integer not null, created_at integer not null, unique (guild_id, name));
create table if not exists team_members (team_id integer not null, user_id integer not null, primary key (team_id, user_id));
create table if not exists guild_xp (id integer primary key, guild_id text not null, idem_key text unique not null, amount integer not null, reason text not null, by_id integer not null, at integer not null);

create table if not exists tournaments (id text primary key, name text not null, category text not null, format text not null, mode text not null, visibility text not null, status text not null default 'open',
  rules TEXT, deck_required integer not null default 0, decklists_public integer not null default 0, capacity integer, sanctioned integer not null default 0, organizer_id integer not null, guild_id text, location text, starts_at integer, total_rounds integer, created_at integer not null);
create table if not exists tournament_staff (tournament_id text not null, user_id integer not null, role text not null, primary key (tournament_id, user_id));
create table if not exists participants (tournament_id text not null, user_id integer not null, seed integer not null, status text not null default 'registered', checked_in integer not null default 0, deck_snapshot text, deck_hash text, at integer not null, primary key (tournament_id, user_id));
create table if not exists t_matches (id integer primary key, tournament_id text not null, round integer not null, a_id integer not null, b_id integer, a_score integer, b_score integer, status text not null, reported_by integer, table_no integer);
create index if not exists t_matches_t on t_matches(tournament_id, round);
"""

conn = main = None
lock = threading.RLock()


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def open_db(main_path, path=None):
    global conn, main
    path = path or os.environ.get('SANCTUARY_PLATFORM_DB') or str(Path(main_path).with_name(f'platform-{ENV}.db'))
    if Path(path).resolve() == Path(main_path).resolve():
        raise RuntimeError('O banco da plataforma não pode ser o banco de contas.')
    conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.executescript('pragma journal_mode=wal; pragma foreign_keys=on;' + SCHEMA)
    conn.execute('insert or ignore into meta values (?, ?)', ('schema_version', str(SCHEMA_VERSION)))
    main = sqlite3.connect(f'file:{Path(main_path).resolve()}?mode=ro', uri=True, check_same_thread=False, isolation_level=None)
    main.row_factory = sqlite3.Row


# ---------- apoio ----------
def now():
    return int(time.time())


def audit(actor, action, target=None, **detail):
    conn.execute('insert into audit (at, actor, action, target, detail) values (?, ?, ?, ?, ?)', (now(), actor, action, target, json.dumps(detail, ensure_ascii=False) if detail else None))


def rate(user, action, limit, window):
    with lock:
        since = now() - window
        conn.execute('delete from actions where at < ?', (now() - 86400,))
        if conn.execute('select count(*) from actions where user_id = ? and action = ? and at > ?', (user['id'], action, since)).fetchone()[0] >= limit:
            raise ApiError(429, 'Too many requests. Try again in a moment.')
        conn.execute('insert into actions values (?, ?, ?)', (user['id'], action, now()))


def text(body, key, maximum, required=True):
    value = str(body.get(key) or '').strip()
    if required and not value:
        raise ApiError(400, f'{key} is required.')
    if len(value) > maximum:
        raise ApiError(400, f'{key} is too long.')
    return value


def choice(body, key, options, default=None):
    value = body.get(key, default)
    if value not in options:
        raise ApiError(400, f'{key} must be one of: {", ".join(str(o) for o in options)}.')
    return value


def is_dev(h, user):
    return bool(user) and user['email'] in h.admins()


def has_role(h, user, *roles):
    if is_dev(h, user):
        return True
    if not user:
        return False
    marks = ','.join('?' * len(roles))
    return bool(conn.execute(f'select 1 from roles where user_id = ? and role in ({marks})', (user['id'], *roles)).fetchone())


def require_role(h, *roles):
    user = h.require_user()
    if not has_role(h, user, *roles):
        raise ApiError(403, 'You do not have permission for this.')
    return user


def public_names(ids):
    ids = [i for i in set(ids) if i is not None]
    if not ids:
        return {}
    marks = ','.join('?' * len(ids))
    rows = main.execute(f'select id, username, username_display from users where id in ({marks})', ids).fetchall()
    return {r['id']: r['username_display'] or r['username'] or 'Player' for r in rows}


def user_by_name(name):
    row = main.execute('select id from users where username = ? collate nocase and suspended_at is null', (str(name),)).fetchone()
    if not row:
        raise ApiError(404, 'No player with this name.')
    return row['id']


def notify(user_id, kind, message, link=None):
    conn.execute('insert into notifications (user_id, kind, text, link, at) values (?, ?, ?, ?, ?)', (user_id, kind, message[:200], link, now()))


def registry_ids():
    """Ids canônicos da versão atual; sem registro legível, a validação falha fechada."""
    try:
        index = json.loads((REGISTRY_DIR / 'index.json').read_text())['current']
        rules = json.loads((REGISTRY_DIR / f'rules-{index["rules"]}.json').read_text())
        cards = json.loads((REGISTRY_DIR / f'cards-{index["catalog"]}.json').read_text())
    except (OSError, ValueError, KeyError):
        raise ApiError(503, 'Canonical registry is unavailable; publishing is blocked.')
    return {r['id'] for r in rules}, {c['id'] for c in cards}


# ---------- saúde e console ----------
def health(h):
    h.send_json(200, {'environment': ENV, 'schema': SCHEMA_VERSION})


def me(h):
    user = h.require_user()
    roles = [r['role'] for r in conn.execute('select role from roles where user_id = ?', (user['id'],))]
    guild = conn.execute('select guild_id, role from guild_members where user_id = ?', (user['id'],)).fetchone()
    unread = conn.execute('select count(*) from notifications where user_id = ? and read_at is null', (user['id'],)).fetchone()[0]
    h.send_json(200, {'developer': is_dev(h, user), 'roles': roles, 'guild': dict(guild) if guild else None, 'unread': unread})


def console(h):
    h.require_admin()
    tables = ('content', 'shared_decks', 'comments', 'guilds', 'tournaments', 'audit')
    counts = {t: conn.execute(f'select count(*) from {t}').fetchone()[0] for t in tables}
    integrity = conn.execute('pragma quick_check').fetchone()[0]
    reports = conn.execute('select count(*) from comment_reports where resolved_at is null').fetchone()[0]
    h.send_json(200, {'environment': ENV, 'schema': SCHEMA_VERSION, 'database': integrity, 'counts': counts, 'open_reports': reports,
                      'official': {'status': 'not-created', 'promotion': 'blocked'}})


def audit_log(h):
    h.require_admin()
    q = h.query()
    target = q.get('target')
    rows = conn.execute('select * from audit where (? is null or target = ?) order by id desc limit 200', (target, target)).fetchall()
    names = public_names(r['actor'] for r in rows)
    h.send_json(200, {'entries': [{**dict(r), 'actor_name': names.get(r['actor'])} for r in rows]})


def grant_role(h):
    admin = h.require_admin()
    body = h.read_json()
    role, target = choice(body, 'role', ROLES), user_by_name(body.get('username'))
    with lock:
        conn.execute('insert or ignore into roles values (?, ?, ?, ?)', (target, role, admin['id'], now()))
        audit(admin['id'], 'role.grant', f'user:{target}', role=role)
    h.send_json(200, {'ok': True})


def revoke_role(h, name, role):
    admin = h.require_admin()
    target = user_by_name(name)
    with lock:
        conn.execute('delete from roles where user_id = ? and role = ?', (target, role))
        audit(admin['id'], 'role.revoke', f'user:{target}', role=role)
    h.send_json(200, {'ok': True})


# ---------- CMS: Nexus, Codex, Balance Center ----------
def content_row(r, names=None):
    out = {k: r[k] for k in r.keys() if k != 'meta'}
    out['meta'] = json.loads(r['meta'])
    out['featured'] = bool(r['featured'])
    if names is not None:
        out['author'] = names.get(r['author_id'])
    return out


def validate_meta(kind, meta):
    if not isinstance(meta, dict):
        raise ApiError(400, 'meta must be an object.')
    if kind not in ('ruling', 'balance'):
        return
    rules, cards = registry_ids()
    bad = [x for x in meta.get('rule_refs', []) if x not in rules] + [x for x in meta.get('card_refs', []) if x not in cards]
    if bad:
        raise ApiError(400, f'Unknown canonical references: {", ".join(map(str, bad))}.')
    if kind == 'ruling' and not meta.get('rule_refs') and not meta.get('card_refs'):
        raise ApiError(400, 'A ruling must reference a rule or a card.')
    if kind == 'balance':
        missing = [k for k in BALANCE_KEYS if not meta.get(k)]
        if missing:
            raise ApiError(400, f'Balance entry needs: {", ".join(missing)}.')
        if not meta.get('rule_refs') and not meta.get('card_refs'):
            raise ApiError(400, 'A balance entry must reference a rule or a card.')


def create_content(h):
    user = require_role(h, 'publisher')
    body = h.read_json()
    kind, slug = choice(body, 'kind', KINDS), str(body.get('slug') or '')
    if not SLUG_RE.match(slug):
        raise ApiError(400, 'slug must use lowercase letters, numbers and hyphens.')
    title, text_body, meta = text(body, 'title', TITLE_MAX), text(body, 'body', TEXT_MAX), body.get('meta', {})
    if not isinstance(meta, dict):
        raise ApiError(400, 'meta must be an object.')
    t = now()
    with lock:
        if conn.execute('select 1 from content where slug = ?', (slug,)).fetchone():
            raise ApiError(409, 'This slug is already in use.')
        cur = conn.execute('insert into content (kind, slug, title, body, category, lang, featured, placement, author_id, meta, created_at, updated_at) values (?,?,?,?,?,?,?,?,?,?,?,?)',
                           (kind, slug, title, text_body, text(body, 'category', 40, False) or None, choice(body, 'lang', ('en', 'pt'), 'en'), int(bool(body.get('featured'))),
                            text(body, 'placement', 40, False) or None, user['id'], json.dumps(meta), t, t))
        conn.execute('insert into content_revisions values (?, 1, ?, ?, ?, ?, ?)', (cur.lastrowid, title, text_body, json.dumps(meta), user['id'], t))
        audit(user['id'], 'content.create', f'content:{cur.lastrowid}', kind=kind, slug=slug)
    h.send_json(201, {'id': cur.lastrowid, 'status': 'draft'})


def get_content_row(cid):
    row = conn.execute('select * from content where id = ?', (cid,)).fetchone()
    if not row:
        raise ApiError(404, 'Not found.')
    return row


def update_content(h, cid):
    user = require_role(h, 'publisher')
    body = h.read_json()
    with lock:
        row = get_content_row(int(cid))
        if row['kind'] == 'ruling' and not is_dev(h, user):
            raise ApiError(403, 'Only developers edit official rulings.')
        title = text(body, 'title', TITLE_MAX) if 'title' in body else row['title']
        text_body = text(body, 'body', TEXT_MAX) if 'body' in body else row['body']
        meta = body['meta'] if 'meta' in body else json.loads(row['meta'])
        if not isinstance(meta, dict):
            raise ApiError(400, 'meta must be an object.')
        if row['status'] == 'published':
            validate_meta(row['kind'], meta)
        rev = row['revision'] + 1
        conn.execute('update content set title=?, body=?, meta=?, featured=?, placement=?, category=?, revision=?, updated_at=? where id=?',
                     (title, text_body, json.dumps(meta), int(bool(body.get('featured', row['featured']))), body.get('placement', row['placement']), body.get('category', row['category']), rev, now(), row['id']))
        conn.execute('insert into content_revisions values (?, ?, ?, ?, ?, ?, ?)', (row['id'], rev, title, text_body, json.dumps(meta), user['id'], now()))
        audit(user['id'], 'content.update', f'content:{row["id"]}', revision=rev)
    h.send_json(200, {'revision': rev})


def publish_content(h, cid):
    user = require_role(h, 'publisher')
    body = h.read_json()
    with lock:
        row = get_content_row(int(cid))
        if row['kind'] in ('ruling', 'balance') and not is_dev(h, user):
            raise ApiError(403, 'Only developers publish official rulings and balance entries.')
        validate_meta(row['kind'], json.loads(row['meta']))
        at = body.get('publish_at')
        if at is not None and not isinstance(at, int):
            raise ApiError(400, 'publish_at must be a timestamp.')
        conn.execute("update content set status='published', publish_at=?, published_at=?, updated_at=? where id=?", (at or now(), now(), now(), row['id']))
        audit(user['id'], 'content.publish', f'content:{row["id"]}', publish_at=at)
    h.send_json(200, {'status': 'published'})


def unpublish_content(h, cid):
    user = require_role(h, 'publisher')
    with lock:
        row = get_content_row(int(cid))
        conn.execute("update content set status='draft', updated_at=? where id=?", (now(), row['id']))
        audit(user['id'], 'content.unpublish', f'content:{row["id"]}')
    h.send_json(200, {'status': 'draft'})


def list_content(h):
    q = h.query()
    user = h.current_user()
    staff = q.get('all') == '1' and has_role(h, user, 'publisher')
    if q.get('all') == '1' and not staff:
        raise ApiError(403, 'You do not have permission for this.')
    sql, args = 'select * from content where 1=1', []
    if not staff:
        sql += " and status='published' and publish_at <= ?"
        args.append(now())
    for key in ('kind', 'placement', 'category', 'lang'):
        if q.get(key):
            sql += f' and {key} = ?'
            args.append(q[key])
    rows = conn.execute(sql + ' order by featured desc, coalesce(publish_at, updated_at) desc limit 50', args).fetchall()
    names = public_names(r['author_id'] for r in rows)
    h.send_json(200, {'items': [content_row(r, names) for r in rows]})


def read_content(h, slug):
    user = h.current_user()
    row = conn.execute('select * from content where slug = ?', (slug,)).fetchone()
    visible = row and row['status'] == 'published' and row['publish_at'] <= now()
    if not visible and not (row and has_role(h, user, 'publisher')):
        raise ApiError(404, 'Not found.')
    revisions = conn.execute('select revision, title, at from content_revisions where content_id = ? order by revision desc', (row['id'],)).fetchall()
    h.send_json(200, {**content_row(row, public_names([row['author_id']])), 'revisions': [dict(r) for r in revisions]})


def home_feed(h):
    def items(kind, n):
        rows = conn.execute("select * from content where kind=? and status='published' and publish_at<=? order by featured desc, publish_at desc limit ?", (kind, now(), n)).fetchall()
        names = public_names(r['author_id'] for r in rows)
        return [content_row(r, names) for r in rows]
    decks = conn.execute("select id, name, god, archetype, owner_id from shared_decks where visibility='public' order by (select count(*) from deck_favorites f where f.shared_id=shared_decks.id) desc, updated_at desc limit 6").fetchall()
    names = public_names(d['owner_id'] for d in decks)
    events = conn.execute("select id, name, format, category, status, starts_at from tournaments where visibility='public' and status != 'closed' order by created_at desc limit 6").fetchall()
    h.send_json(200, {'news': items('news', 6), 'balance': items('balance', 4),
                      'decks': [{'id': d['id'], 'name': d['name'], 'god': d['god'], 'archetype': d['archetype'], 'author': names.get(d['owner_id'])} for d in decks],
                      'tournaments': [dict(e) for e in events]})


# ---------- biblioteca de decks ----------
def owned_deck(user_id, deck_id):
    row = main.execute('select data, revision from decks where user_id = ? and deck_id = ? and deleted_at is null', (user_id, deck_id)).fetchone()
    if not row:
        raise ApiError(404, 'Deck not found in your account.')
    return row


def deck_hash(data):
    """Impressão da lista (God, Domain e cartas): liga o duelo à versão do deck sem guardar a lista no duelo."""
    if isinstance(data, str):
        data = json.loads(data or '{}')
    cards = sorted(json.dumps(e, sort_keys=True) for e in data.get('main_deck') or [])
    return hashlib.sha256('|'.join([str(data.get('god') or 'god-athena'), str(data.get('domain_id') or ''), *cards]).encode()).hexdigest()[:16]


def publish(user_id, deck_id, raw, visibility, archetype='', strategy=''):
    """Grava a cópia pública do deck. Versão nova só quando a lista muda (o histórico e o winrate seguem a lista)."""
    data = json.loads(raw)
    t = now()
    name, god = str(data.get('name') or data.get('alpha_nome') or data.get('nome') or deck_id)[:80], data.get('god') or data.get('deus')
    god = str(god)[:60] if god else None
    with lock:
        row = conn.execute('select * from shared_decks where owner_id = ? and deck_id = ?', (user_id, deck_id)).fetchone()
        if row:
            sid = row['id']
            last = conn.execute('select data from deck_versions where shared_id = ? and version = ?', (sid, row['version'])).fetchone()
            changed = not last or deck_hash(last['data']) != deck_hash(data)
            version = row['version'] + changed
            conn.execute('update shared_decks set visibility=?, name=?, god=?, archetype=?, strategy=?, version=?, updated_at=? where id=?',
                         (visibility, name, god, archetype or row['archetype'], strategy or row['strategy'], version, t, sid))
        else:
            sid, version, changed = secrets.token_urlsafe(12), 1, True
            conn.execute('insert into shared_decks (id, owner_id, deck_id, visibility, name, god, archetype, strategy, version, created_at, updated_at) values (?,?,?,?,?,?,?,?,?,?,?)',
                         (sid, user_id, deck_id, visibility, name, god, archetype or None, strategy or None, version, t, t))
        if changed:
            conn.execute('insert into deck_versions values (?, ?, ?, ?)', (sid, version, raw, t))
        audit(user_id, 'deck.share', f'deck:{sid}', visibility=visibility, version=version)
    return sid, version


def share_deck(h):
    user = h.require_user()
    rate(user, 'deck.share', 30, 3600)
    body = h.read_json()
    deck_id = str(body.get('deck_id') or '')
    visibility = choice(body, 'visibility', VISIBILITY, 'private')
    raw = owned_deck(user['id'], deck_id)['data']
    sid, version = publish(user['id'], deck_id, raw, visibility, text(body, 'archetype', 60, False), text(body, 'strategy', 4000, False))
    h.send_json(200, {'id': sid, 'version': version, 'visibility': visibility})


def sync_public(user_id, deck_id, data):
    """Botão Public do builder (autor, 08/11/2026): o deck público no jogo aparece sozinho no Cosmo Hub e cada lista nova vira versão.
    Só age quando o jogo manda o campo public; desligar (ou apagar o deck) deixa a cópia privada, sem perder histórico e comentários."""
    if data is not None and 'public' not in data:
        return
    if data and data.get('public'):
        publish(user_id, deck_id, json.dumps(data), 'public')
        return
    with lock:
        conn.execute("update shared_decks set visibility = 'private', updated_at = ? where owner_id = ? and deck_id = ? and visibility = 'public'", (now(), user_id, deck_id))


def shared_deck(sid, user):
    """Deck privado se comporta como inexistente para quem não é o dono: nem a existência vaza."""
    row = conn.execute('select * from shared_decks where id = ?', (sid,)).fetchone()
    if not row or (row['visibility'] == 'private' and not (user and user['id'] == row['owner_id'])):
        raise ApiError(404, 'Deck not found.')
    return row


def deck_stats(row):
    """Winrate do deck público: só duelos online (autor, 08/11/2026), do dono, com uma lista que já foi versão deste deck."""
    versions = {deck_hash(v['data']): v['version'] for v in conn.execute('select version, data from deck_versions where shared_id = ? order by version', (row['id'],))}
    current = next((h for h, v in versions.items() if v == row['version']), None)
    total, now_ = {'matches': 0, 'wins': 0}, {'matches': 0, 'wins': 0}
    for d in main.execute('select winner, a_id, b_id, a_hash, b_hash from duels where a_id = ? or b_id = ?', (row['owner_id'], row['owner_id'])):
        for side in ('a', 'b'):
            if d[f'{side}_id'] == row['owner_id'] and d[f'{side}_hash'] in versions:
                for bucket in (total, now_) if d[f'{side}_hash'] == current else (total,):
                    bucket['matches'] += 1
                    bucket['wins'] += int(str(d['winner'] or '').lower() == side)  # duels grava 'A'/'B' (settle_pair)
    for b in (total, now_):
        b['win_rate'] = round(b['wins'] / b['matches'], 4) if b['matches'] else None
        b['sample_ok'] = b['matches'] >= MIN_SAMPLE
    return {**total, 'current_version': now_}


def deck_summary(row, names):
    # conexão SQLite única entre threads: várias leituras seguidas precisam da trava (lista de decks e páginas simultâneas)
    with lock:
        rating = conn.execute('select avg(stars) a, count(*) n from deck_ratings where shared_id = ?', (row['id'],)).fetchone()
        favorites = conn.execute('select count(*) from deck_favorites where shared_id = ?', (row['id'],)).fetchone()[0]
        return {'id': row['id'], 'name': row['name'], 'god': row['god'], 'archetype': row['archetype'], 'visibility': row['visibility'], 'version': row['version'],
                'author': names.get(row['owner_id']), 'rating': round(rating['a'], 2) if rating['a'] else None, 'ratings': rating['n'], 'favorites': favorites, 'updated_at': row['updated_at'], 'forked_from': row['forked_from'], 'stats': deck_stats(row)}


DECK_SORTS = {
    'recent': lambda d: -d['updated_at'],
    # winrate só com duelos online; deck sem duelo vai para o fim, e empate desempata por volume
    'winrate': lambda d: (d['stats']['win_rate'] is None, -(d['stats']['win_rate'] or 0), -d['stats']['matches']),
    'rating': lambda d: (d['rating'] is None, -(d['rating'] or 0), -d['ratings']),
    'popular': lambda d: (-d['favorites'], -d['stats']['matches']),
}


def list_decks(h):
    """Biblioteca pública com filtro por God, ordenação e páginas (?god=&sort=&page=&limit=)."""
    q = h.query()
    sql, args = "select * from shared_decks where visibility='public'", []
    if q.get('god'):
        sql += ' and god = ?'
        args.append(q['god'])
    if q.get('author'):  # decks públicos de um jogador (página de perfil)
        owner = main.execute('select id from users where username = ? and suspended_at is null', (q['author'].lower(),)).fetchone()
        sql += ' and owner_id = ?'
        args.append(owner['id'] if owner else -1)
    if q.get('mine') == '1':
        user = h.require_user()
        sql, args = 'select * from shared_decks where owner_id = ?', [user['id']]
    # shortcut: ordena em Python sobre até 1000 decks (winrate é calculado); passar para tabela de estatística quando passar disso
    rows = conn.execute(sql + ' order by updated_at desc limit 1000', args).fetchall()
    if q.get('card'):  # decks cuja versão atual usa a carta (página da carta); God e Domain contam
        card = q['card']
        def uses(r):
            snap = conn.execute('select data from deck_versions where shared_id = ? and version = ?', (r['id'], r['version'])).fetchone()
            d = json.loads(snap['data']) if snap else {}
            return card in (d.get('god'), d.get('domain_id')) or any(isinstance(e, dict) and e.get('card_id') == card for e in d.get('main_deck') or [])
        with lock:
            rows = [r for r in rows if uses(r)]
    names = public_names(r['owner_id'] for r in rows)
    decks = sorted((deck_summary(r, names) for r in rows), key=DECK_SORTS.get(q.get('sort'), DECK_SORTS['recent']))
    limit = min(max(int(q['limit']) if q.get('limit', '').isdigit() else 24, 1), 100)
    pages = max(1, -(-len(decks) // limit))
    page = min(max(int(q['page']) if q.get('page', '').isdigit() else 1, 1), pages)
    h.send_json(200, {'decks': decks[(page - 1) * limit:page * limit], 'total': len(decks), 'page': page, 'pages': pages})


def read_deck(h, sid):
    user = h.current_user()
    row = shared_deck(sid, user)
    version = h.query().get('version')
    number = int(version) if version and version.isdigit() else row['version']
    snap = conn.execute('select data, at from deck_versions where shared_id = ? and version = ?', (sid, number)).fetchone()
    if not snap:
        raise ApiError(404, 'Version not found.')
    versions = conn.execute('select version, at from deck_versions where shared_id = ? order by version desc', (sid,)).fetchall()
    mine = None
    if user:
        s = conn.execute('select stars from deck_ratings where shared_id = ? and user_id = ?', (sid, user['id'])).fetchone()
        f = conn.execute('select 1 from deck_favorites where shared_id = ? and user_id = ?', (sid, user['id'])).fetchone()
        mine = {'stars': s['stars'] if s else None, 'favorite': bool(f), 'owner': user['id'] == row['owner_id']}
    h.send_json(200, {**deck_summary(row, public_names([row['owner_id']])), 'strategy': row['strategy'], 'data': json.loads(snap['data']), 'versions': [dict(v) for v in versions], 'mine': mine})


def patch_deck(h, sid):
    user = h.require_user()
    row = shared_deck(sid, user)
    if row['owner_id'] != user['id']:
        raise ApiError(403, 'Only the owner can change this deck.')
    body = h.read_json()
    visibility = choice(body, 'visibility', VISIBILITY, row['visibility'])
    with lock:
        conn.execute('update shared_decks set visibility=?, strategy=?, archetype=?, updated_at=? where id=?',
                     (visibility, text(body, 'strategy', 4000, False) if 'strategy' in body else row['strategy'], text(body, 'archetype', 60, False) if 'archetype' in body else row['archetype'], now(), sid))
        audit(user['id'], 'deck.update', f'deck:{sid}', visibility=visibility)
    h.send_json(200, {'visibility': visibility})


def rate_deck(h, sid):
    user = h.require_user()
    row = shared_deck(sid, user)
    if row['owner_id'] == user['id']:
        raise ApiError(400, 'You cannot rate your own deck.')
    stars = choice(h.read_json(), 'stars', (1, 2, 3, 4, 5))
    with lock:
        conn.execute('insert or replace into deck_ratings values (?, ?, ?, ?)', (sid, user['id'], stars, now()))
    h.send_json(200, {'stars': stars})


def favorite_deck(h, sid):
    user = h.require_user()
    shared_deck(sid, user)
    with lock:
        cur = conn.execute('delete from deck_favorites where shared_id = ? and user_id = ?', (sid, user['id']))
        favorite = not cur.rowcount
        if favorite:
            conn.execute('insert into deck_favorites values (?, ?, ?)', (sid, user['id'], now()))
    h.send_json(200, {'favorite': favorite})


def fork_deck(h, sid):
    """Só devolve a lista: quem grava na conta é o PUT /api/decks de sempre, com suas próprias validações."""
    user = h.require_user()
    row = shared_deck(sid, user)
    snap = conn.execute('select data from deck_versions where shared_id = ? and version = ?', (sid, row['version'])).fetchone()
    with lock:
        audit(user['id'], 'deck.fork', f'deck:{sid}', version=row['version'])
    h.send_json(200, {'data': json.loads(snap['data']), 'forked_from': sid, 'version': row['version']})


# ---------- discussões ----------
def visible_target(target, user):
    kind, _, key = str(target).partition(':')
    if kind == 'deck':
        shared_deck(key, user)
    elif kind == 'card':  # discussão na página da carta do Codex (Cosmo Hub 2.0, P2)
        if key not in registry_ids()[1]:
            raise ApiError(404, 'Not found.')
    elif kind == 'content':
        row = conn.execute("select status, publish_at from content where slug = ?", (key,)).fetchone()
        if not row or row['status'] != 'published' or row['publish_at'] > now():
            raise ApiError(404, 'Not found.')
    else:
        raise ApiError(400, 'Unknown discussion target.')


def list_comments(h):
    q = h.query()
    target = q.get('target') or ''
    visible_target(target, h.current_user())
    rows = conn.execute('select c.*, coalesce((select sum(value) from comment_votes v where v.comment_id = c.id), 0) score from comments c where target = ? order by id limit 500', (target,)).fetchall()
    names = public_names(r['author_id'] for r in rows)
    out = []
    for r in rows:
        gone = r['deleted_at'] or r['hidden_at']
        out.append({'id': r['id'], 'parent_id': r['parent_id'], 'score': r['score'], 'at': r['at'], 'body': None if gone else r['body'], 'removed': bool(gone), 'author': None if gone else names.get(r['author_id'])})
    if q.get('sort') == 'top':
        out.sort(key=lambda c: (-c['score'], c['id']))
    h.send_json(200, {'comments': out})


def add_comment(h):
    user = h.require_user()
    rate(user, 'comment', 10, 60)
    body = h.read_json()
    target, message = str(body.get('target') or ''), text(body, 'body', 2000)
    visible_target(target, user)
    parent = body.get('parent_id')
    with lock:
        if parent is not None:
            row = conn.execute('select author_id, target from comments where id = ?', (parent,)).fetchone()
            if not row or row['target'] != target:
                raise ApiError(400, 'Reply target is not in this discussion.')
            if row['author_id'] != user['id']:
                notify(row['author_id'], 'reply', 'Someone replied to your comment.', target)
        cur = conn.execute('insert into comments (target, parent_id, author_id, body, at) values (?, ?, ?, ?, ?)', (target, parent, user['id'], message, now()))
    h.send_json(201, {'id': cur.lastrowid})


def comment_row(cid):
    row = conn.execute('select * from comments where id = ?', (cid,)).fetchone()
    if not row or row['deleted_at'] or row['hidden_at']:
        raise ApiError(404, 'Comment not found.')
    return row


def vote_comment(h, cid):
    user = h.require_user()
    rate(user, 'vote', 60, 60)
    value = choice(h.read_json(), 'value', (-1, 0, 1))
    with lock:
        row = comment_row(int(cid))
        if row['author_id'] == user['id']:
            raise ApiError(400, 'You cannot vote on your own comment.')
        if value:
            conn.execute('insert or replace into comment_votes values (?, ?, ?)', (row['id'], user['id'], value))
        else:
            conn.execute('delete from comment_votes where comment_id = ? and user_id = ?', (row['id'], user['id']))
    h.send_json(200, {'value': value})


def report_comment(h, cid):
    user = h.require_user()
    rate(user, 'report', 10, 3600)
    body = h.read_json()
    with lock:
        comment_row(int(cid))
        conn.execute('insert or ignore into comment_reports (comment_id, reporter_id, reason, at) values (?, ?, ?, ?)', (int(cid), user['id'], text(body, 'reason', 300, False), now()))
    h.send_json(200, {'ok': True})


def delete_comment(h, cid):
    user = h.require_user()
    with lock:
        row = comment_row(int(cid))
        if row['author_id'] == user['id']:
            conn.execute('update comments set deleted_at = ? where id = ?', (now(), row['id']))
        elif has_role(h, user, 'moderator'):
            conn.execute('update comments set hidden_at = ? where id = ?', (now(), row['id']))
            conn.execute('update comment_reports set resolved_at = ? where comment_id = ?', (now(), row['id']))
            audit(user['id'], 'comment.hide', f'comment:{row["id"]}')
        else:
            raise ApiError(403, 'You do not have permission for this.')
    h.send_json(200, {'ok': True})


def list_reports(h):
    require_role(h, 'moderator')
    rows = conn.execute('select r.id, r.comment_id, r.reason, r.at, c.body, c.target from comment_reports r join comments c on c.id = r.comment_id where r.resolved_at is null order by r.id desc limit 100').fetchall()
    h.send_json(200, {'reports': [dict(r) for r in rows]})


def notifications(h):
    user = h.require_user()
    rows = conn.execute('select id, kind, text, link, at, read_at from notifications where user_id = ? order by id desc limit 50', (user['id'],)).fetchall()
    h.send_json(200, {'notifications': [dict(r) for r in rows]})


def notifications_read(h):
    user = h.require_user()
    with lock:
        conn.execute('update notifications set read_at = ? where user_id = ? and read_at is null', (now(), user['id']))
    h.send_json(200, {'ok': True})


# ---------- guildas ----------
def membership(user_id):
    return conn.execute('select * from guild_members where user_id = ?', (user_id,)).fetchone()


def guild_or_404(gid, user):
    row = conn.execute('select * from guilds where id = ?', (gid,)).fetchone()
    if row and row['visibility'] == 'private':
        mine = membership(user['id']) if user else None
        invited = user and conn.execute("select 1 from guild_requests where guild_id=? and user_id=? and kind='invite' and status='pending'", (gid, user['id'])).fetchone()
        if not (mine and mine['guild_id'] == gid) and not invited:
            row = None
    if not row:
        raise ApiError(404, 'Guild not found.')
    return row


def guild_role(h, gid, *allowed):
    """Papel de guilda não tem atalho: nem developer ganha liderança sem ser membro; moderação de plataforma é outra coisa."""
    user = h.require_user()
    mine = membership(user['id'])
    if not mine or mine['guild_id'] != gid or mine['role'] not in allowed:
        raise ApiError(403, 'You do not have permission in this guild.')
    return user, mine


def create_guild(h):
    user = h.require_user()
    rate(user, 'guild.create', 3, 86400)
    body = h.read_json()
    name, tag = text(body, 'name', 40), str(body.get('tag') or '').upper()
    if not TAG_RE.match(tag):
        raise ApiError(400, 'Tag must have 2 to 5 letters or numbers.')
    visibility = choice(body, 'visibility', ('public', 'private'), 'public')
    gid, t = secrets.token_urlsafe(9), now()
    with lock:
        if membership(user['id']):
            raise ApiError(409, 'You are already in a guild.')
        if conn.execute('select 1 from guilds where name = ? or tag = ?', (name, tag)).fetchone():
            raise ApiError(409, 'This name or tag is taken.')
        conn.execute('insert into guilds (id, name, tag, description, visibility, created_by, created_at) values (?,?,?,?,?,?,?)', (gid, name, tag, text(body, 'description', 2000, False), visibility, user['id'], t))
        conn.execute('insert into guild_members values (?, ?, ?, ?)', (user['id'], gid, 'leader', t))
        audit(user['id'], 'guild.create', f'guild:{gid}', name=name)
    h.send_json(201, {'id': gid})


def list_guilds(h):
    term = h.query().get('q') or ''
    rows = conn.execute("select g.id, g.name, g.tag, g.description, g.xp, (select count(*) from guild_members m where m.guild_id = g.id) members from guilds g where g.visibility='public' and g.name like ? order by g.xp desc, g.name limit 100", (f'%{term}%',)).fetchall()
    h.send_json(200, {'guilds': [dict(r) for r in rows]})


def read_guild(h, gid):
    user = h.current_user()
    row = guild_or_404(gid, user)
    members = conn.execute('select user_id, role, joined_at from guild_members where guild_id = ? order by joined_at', (gid,)).fetchall()
    names = public_names(m['user_id'] for m in members)
    mine = membership(user['id']) if user else None
    inside = mine and mine['guild_id'] == gid
    teams = conn.execute('select * from guild_teams where guild_id = ?', (gid,)).fetchall()
    team_list = []
    for team in teams:
        roster = [r['user_id'] for r in conn.execute('select user_id from team_members where team_id = ?', (team['id'],))]
        tn = public_names(roster + [team['captain_id']])
        team_list.append({'id': team['id'], 'name': team['name'], 'captain': tn.get(team['captain_id']), 'roster': [tn.get(r) for r in roster]})
    posts = conn.execute('select id, body, at, author_id from guild_posts where guild_id = ? order by id desc limit 20', (gid,)).fetchall() if inside else []
    pn = public_names(p['author_id'] for p in posts)
    requests = []
    if inside and mine['role'] in ('leader', 'officer'):
        rs = conn.execute("select id, user_id, kind, message, at from guild_requests where guild_id = ? and status = 'pending'", (gid,)).fetchall()
        rn = public_names(r['user_id'] for r in rs)
        requests = [{'id': r['id'], 'player': rn.get(r['user_id']), 'kind': r['kind'], 'message': r['message'], 'at': r['at']} for r in rs]
    h.send_json(200, {'id': row['id'], 'name': row['name'], 'tag': row['tag'], 'description': row['description'], 'visibility': row['visibility'], 'xp': row['xp'],
                      'members': [{'name': names.get(m['user_id']), 'role': m['role'], 'joined_at': m['joined_at']} for m in members], 'teams': team_list,
                      'announcements': [{'id': p['id'], 'body': p['body'], 'at': p['at'], 'author': pn.get(p['author_id'])} for p in posts],
                      'requests': requests, 'my_role': mine['role'] if inside else None})


def apply_guild(h, gid):
    user = h.require_user()
    rate(user, 'guild.apply', 10, 3600)
    row = guild_or_404(gid, user)
    if row['visibility'] == 'private':
        raise ApiError(403, 'This guild is invite only.')
    message = text(h.read_json(), 'message', 500, False)
    with lock:
        if membership(user['id']):
            raise ApiError(409, 'You are already in a guild.')
        try:
            cur = conn.execute("insert into guild_requests (guild_id, user_id, kind, message, by_id, at) values (?, ?, 'apply', ?, ?, ?)", (gid, user['id'], message, user['id'], now()))
        except sqlite3.IntegrityError:
            raise ApiError(409, 'A request is already pending.')
    h.send_json(201, {'id': cur.lastrowid})


def invite_guild(h, gid):
    user, _ = guild_role(h, gid, 'leader', 'officer')
    rate(user, 'guild.invite', 30, 3600)
    target = user_by_name(h.read_json().get('username'))
    with lock:
        if membership(target):
            raise ApiError(409, 'This player is already in a guild.')
        try:
            cur = conn.execute("insert into guild_requests (guild_id, user_id, kind, by_id, at) values (?, ?, 'invite', ?, ?)", (gid, target, user['id'], now()))
        except sqlite3.IntegrityError:
            raise ApiError(409, 'A request is already pending.')
        notify(target, 'guild', 'You were invited to a guild.', f'guild:{gid}')
        audit(user['id'], 'guild.invite', f'guild:{gid}', player=target)
    h.send_json(201, {'id': cur.lastrowid})


def answer_request(h, rid, verb):
    user = h.require_user()
    with lock:
        req = conn.execute("select * from guild_requests where id = ? and status = 'pending'", (int(rid),)).fetchone()
        if not req:
            raise ApiError(404, 'Request not found.')
        if req['kind'] == 'invite':
            if req['user_id'] != user['id']:
                raise ApiError(403, 'This invite is for another player.')
        else:
            guild_role(h, req['guild_id'], 'leader', 'officer')
        if verb == 'accept':
            if membership(req['user_id']):
                raise ApiError(409, 'This player is already in a guild.')
            conn.execute('insert into guild_members values (?, ?, ?, ?)', (req['user_id'], req['guild_id'], 'member', now()))
            conn.execute("update guild_requests set status = 'cancelled' where user_id = ? and status = 'pending' and id != ?", (req['user_id'], req['id']))
        conn.execute('update guild_requests set status = ? where id = ?', ('accepted' if verb == 'accept' else 'declined', req['id']))
        audit(user['id'], f'guild.request.{verb}', f'guild:{req["guild_id"]}', player=req['user_id'])
    h.send_json(200, {'ok': True})


def leave_guild(h, gid):
    user, mine = guild_role(h, gid, *GUILD_ROLES)
    with lock:
        others = conn.execute('select count(*) from guild_members where guild_id = ? and user_id != ?', (gid, user['id'])).fetchone()[0]
        if mine['role'] == 'leader' and others:
            raise ApiError(409, 'Pass leadership to another member before leaving.')
        conn.execute('delete from guild_members where user_id = ?', (user['id'],))
        conn.execute('delete from team_members where user_id = ? and team_id in (select id from guild_teams where guild_id = ?)', (user['id'], gid))
        audit(user['id'], 'guild.leave', f'guild:{gid}')
    h.send_json(200, {'ok': True})


def set_member_role(h, gid, name):
    user, _ = guild_role(h, gid, 'leader')
    role = choice(h.read_json(), 'role', GUILD_ROLES)
    target = user_by_name(name)
    with lock:
        them = membership(target)
        if not them or them['guild_id'] != gid:
            raise ApiError(404, 'This player is not in the guild.')
        if target == user['id']:
            raise ApiError(400, 'Pass leadership to another member instead.')
        conn.execute('update guild_members set role = ? where user_id = ?', (role, target))
        if role == 'leader':  # uma guilda tem um líder só: passar a liderança rebaixa quem passou
            conn.execute("update guild_members set role = 'officer' where user_id = ?", (user['id'],))
        audit(user['id'], 'guild.role', f'guild:{gid}', player=target, role=role)
    h.send_json(200, {'role': role})


def kick_member(h, gid, name):
    user, mine = guild_role(h, gid, 'leader', 'officer')
    target = user_by_name(name)
    with lock:
        them = membership(target)
        if not them or them['guild_id'] != gid:
            raise ApiError(404, 'This player is not in the guild.')
        if GUILD_ROLES.index(them['role']) <= GUILD_ROLES.index(mine['role']):
            raise ApiError(403, 'You can only remove members below your role.')
        conn.execute('delete from guild_members where user_id = ?', (target,))
        conn.execute('delete from team_members where user_id = ? and team_id in (select id from guild_teams where guild_id = ?)', (target, gid))
        audit(user['id'], 'guild.kick', f'guild:{gid}', player=target)
    h.send_json(200, {'ok': True})


def guild_post(h, gid):
    user, _ = guild_role(h, gid, 'leader', 'officer')
    rate(user, 'guild.post', 20, 3600)
    message = text(h.read_json(), 'body', 2000)
    with lock:
        cur = conn.execute('insert into guild_posts (guild_id, author_id, body, at) values (?, ?, ?, ?)', (gid, user['id'], message, now()))
    h.send_json(201, {'id': cur.lastrowid})


def create_team(h, gid):
    user, _ = guild_role(h, gid, 'leader', 'officer')
    body = h.read_json()
    name, captain = text(body, 'name', 40), user_by_name(body.get('captain'))
    with lock:
        them = membership(captain)
        if not them or them['guild_id'] != gid:
            raise ApiError(400, 'The captain must be a guild member.')
        try:
            cur = conn.execute('insert into guild_teams (guild_id, name, captain_id, created_at) values (?, ?, ?, ?)', (gid, name, captain, now()))
        except sqlite3.IntegrityError:
            raise ApiError(409, 'This team name is taken.')
        conn.execute('insert into team_members values (?, ?)', (cur.lastrowid, captain))
        audit(user['id'], 'guild.team.create', f'guild:{gid}', team=name)
    h.send_json(201, {'id': cur.lastrowid})


def add_team_member(h, tid):
    user = h.require_user()
    target = user_by_name(h.read_json().get('username'))
    with lock:
        team = conn.execute('select * from guild_teams where id = ?', (int(tid),)).fetchone()
        if not team:
            raise ApiError(404, 'Team not found.')
        mine = membership(user['id'])
        allowed = team['captain_id'] == user['id'] or (mine and mine['guild_id'] == team['guild_id'] and mine['role'] in ('leader', 'officer'))
        if not allowed:
            raise ApiError(403, 'You do not have permission in this team.')
        them = membership(target)
        if not them or them['guild_id'] != team['guild_id']:
            raise ApiError(400, 'This player is not in the guild.')
        conn.execute('insert or ignore into team_members values (?, ?)', (team['id'], target))
    h.send_json(200, {'ok': True})


def grant_guild_xp(h, gid):
    """Livro de XP: a chave idempotente é única, então repetir a mesma operação não soma duas vezes. Só developer lança, com teto diário."""
    admin = h.require_admin()
    body = h.read_json()
    key, amount = str(body.get('key') or ''), body.get('amount')
    if not KEY_RE.match(key) or not isinstance(amount, int) or isinstance(amount, bool) or not 0 < amount <= GUILD_XP_DAILY_CAP:
        raise ApiError(400, 'Send {key, amount, reason}.')
    reason = text(body, 'reason', 200)
    with lock:
        if not conn.execute('select 1 from guilds where id = ?', (gid,)).fetchone():
            raise ApiError(404, 'Guild not found.')
        if conn.execute('select 1 from guild_xp where idem_key = ?', (key,)).fetchone():
            return h.send_json(200, {'applied': False, 'xp': conn.execute('select xp from guilds where id = ?', (gid,)).fetchone()[0]})
        today = conn.execute('select coalesce(sum(amount), 0) from guild_xp where guild_id = ? and at > ?', (gid, now() - 86400)).fetchone()[0]
        if today + amount > GUILD_XP_DAILY_CAP:
            raise ApiError(429, 'Daily guild XP cap reached.')
        conn.execute('insert into guild_xp (guild_id, idem_key, amount, reason, by_id, at) values (?, ?, ?, ?, ?, ?)', (gid, key, amount, reason, admin['id'], now()))
        conn.execute('update guilds set xp = xp + ? where id = ?', (amount, gid))
        audit(admin['id'], 'guild.xp', f'guild:{gid}', key=key, amount=amount)
        xp = conn.execute('select xp from guilds where id = ?', (gid,)).fetchone()[0]
    h.send_json(200, {'applied': True, 'xp': xp})


# ---------- torneios ----------
def tournament_or_404(tid, user=None):
    row = conn.execute('select * from tournaments where id = ?', (tid,)).fetchone()
    if not row:
        raise ApiError(404, 'Tournament not found.')
    return row


def can_run(h, row, user):
    if not user:
        return False
    if row['organizer_id'] == user['id'] or is_dev(h, user):
        return True
    return bool(conn.execute('select 1 from tournament_staff where tournament_id = ? and user_id = ?', (row['id'], user['id'])).fetchone())


def require_runner(h, row):
    user = h.require_user()
    if not can_run(h, row, user):
        raise ApiError(403, 'Only the organizer or staff can do this.')
    return user


def create_tournament(h):
    user = h.require_user()
    rate(user, 'tournament.create', 10, 86400)
    body = h.read_json()
    category = choice(body, 'category', ('community', 'guild', 'store', 'official'), 'community')
    if category in ('store', 'official') and not is_dev(h, user):
        raise ApiError(403, 'Only developers create store or official events.')
    guild_id = None
    if category == 'guild':
        mine = membership(user['id'])
        if not mine or mine['role'] not in ('leader', 'officer'):
            raise ApiError(403, 'Only guild officers create guild events.')
        guild_id = mine['guild_id']
    capacity = body.get('capacity')
    if capacity is not None and (not isinstance(capacity, int) or not 2 <= capacity <= 1024):
        raise ApiError(400, 'capacity must be between 2 and 1024.')
    tid = secrets.token_urlsafe(9)
    with lock:
        conn.execute('insert into tournaments (id, name, category, format, mode, visibility, rules, deck_required, decklists_public, capacity, organizer_id, guild_id, location, starts_at, created_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                     (tid, text(body, 'name', 80), category, choice(body, 'format', FORMATS), choice(body, 'mode', ('digital', 'physical'), 'digital'), choice(body, 'visibility', ('public', 'unlisted'), 'public'),
                      text(body, 'rules', 40, False) or None, int(bool(body.get('deck_required'))), int(bool(body.get('decklists_public'))), capacity, user['id'], guild_id, text(body, 'location', 200, False) or None,
                      body.get('starts_at') if isinstance(body.get('starts_at'), int) else None, now()))
        audit(user['id'], 'tournament.create', f'tournament:{tid}', category=category)
    h.send_json(201, {'id': tid})


def list_tournaments(h):
    rows = conn.execute("select id, name, category, format, mode, status, sanctioned, starts_at, (select count(*) from participants p where p.tournament_id = t.id and p.status != 'dropped') players from tournaments t where visibility='public' order by created_at desc limit 100").fetchall()
    h.send_json(200, {'tournaments': [dict(r) for r in rows]})


def confirmed_matches(tid):
    rows = conn.execute("select * from t_matches where tournament_id = ? and status = 'confirmed' order by round, id", (tid,)).fetchall()
    return [{'a': m['a_id'], 'b': m['b_id'], 'a_score': m['a_score'], 'b_score': m['b_score'], 'round': m['round']} for m in rows]


def read_tournament(h, tid):
    user = h.current_user()
    row = tournament_or_404(tid)
    players = conn.execute('select * from participants where tournament_id = ? order by seed', (tid,)).fetchall()
    matches = conn.execute('select * from t_matches where tournament_id = ? order by round, id', (tid,)).fetchall()
    ids = [p['user_id'] for p in players]
    names = public_names(ids + [row['organizer_id']])
    table = pairing.standings(ids, confirmed_matches(tid))
    runner = can_run(h, row, user)

    def seat(p):
        out = {'name': names.get(p['user_id']), 'status': p['status'], 'checked_in': bool(p['checked_in']), 'deck_hash': p['deck_hash']}
        if p['deck_snapshot'] and (row['decklists_public'] or runner or (user and user['id'] == p['user_id'])):
            out['deck'] = json.loads(p['deck_snapshot'])
        return out
    h.send_json(200, {**{k: row[k] for k in ('id', 'name', 'category', 'format', 'mode', 'visibility', 'status', 'rules', 'capacity', 'location', 'starts_at', 'total_rounds')},
                      'deck_required': bool(row['deck_required']), 'sanctioned': bool(row['sanctioned']), 'organizer': names.get(row['organizer_id']), 'can_run': runner,
                      'participants': [seat(p) for p in players],
                      'matches': [{'id': m['id'], 'round': m['round'], 'a': names.get(m['a_id']), 'b': names.get(m['b_id']), 'a_score': m['a_score'], 'b_score': m['b_score'], 'status': m['status'], 'table': m['table_no']} for m in matches],
                      'standings': [{**{k: r[k] for k in r if k != 'player'}, 'name': names.get(r['player'])} for r in table],
                      'policy': pairing.POLICY})


def register(h, tid):
    user = h.require_user()
    body = h.read_json()
    with lock:
        row = tournament_or_404(tid)
        if row['status'] != 'open':
            raise ApiError(409, 'Registration is closed.')
        count = conn.execute("select count(*) from participants where tournament_id = ? and status != 'dropped'", (tid,)).fetchone()[0]
        if row['capacity'] and count >= row['capacity']:
            raise ApiError(409, 'This event is full.')
        if conn.execute('select 1 from participants where tournament_id = ? and user_id = ?', (tid, user['id'])).fetchone():
            raise ApiError(409, 'You are already registered.')
        snapshot = digest = None
        if row['deck_required'] or body.get('deck_id'):
            snapshot = owned_deck(user['id'], str(body.get('deck_id') or ''))['data']
            digest = hashlib.sha256(snapshot.encode()).hexdigest()
        seed = conn.execute('select coalesce(max(seed), -1) + 1 from participants where tournament_id = ?', (tid,)).fetchone()[0]
        conn.execute('insert into participants (tournament_id, user_id, seed, deck_snapshot, deck_hash, at) values (?,?,?,?,?,?)', (tid, user['id'], seed, snapshot, digest, now()))
        audit(user['id'], 'tournament.register', f'tournament:{tid}', deck_hash=digest)
    h.send_json(201, {'deck_hash': digest})


def checkin(h, tid):
    user = h.require_user()
    with lock:
        row = tournament_or_404(tid)
        if row['status'] != 'open':
            raise ApiError(409, 'Check-in is closed.')
        cur = conn.execute('update participants set checked_in = 1 where tournament_id = ? and user_id = ?', (tid, user['id']))
        if not cur.rowcount:
            raise ApiError(404, 'You are not registered.')
    h.send_json(200, {'ok': True})


def drop(h, tid):
    user = h.require_user()
    body = h.read_json()
    with lock:
        row = tournament_or_404(tid)
        target = user['id']
        if body.get('username'):
            require_runner(h, row)
            target = user_by_name(body['username'])
        cur = conn.execute("update participants set status = 'dropped' where tournament_id = ? and user_id = ?", (tid, target))
        if not cur.rowcount:
            raise ApiError(404, 'Not registered.')
        audit(user['id'], 'tournament.drop', f'tournament:{tid}', player=target)
    h.send_json(200, {'ok': True})


def add_staff(h, tid):
    row = tournament_or_404(tid)
    user = h.require_user()
    if row['organizer_id'] != user['id'] and not is_dev(h, user):
        raise ApiError(403, 'Only the organizer can add staff.')
    target = user_by_name(h.read_json().get('username'))
    with lock:
        conn.execute("insert or replace into tournament_staff values (?, ?, 'judge')", (tid, target))
        audit(user['id'], 'tournament.staff', f'tournament:{tid}', player=target)
    h.send_json(200, {'ok': True})


def insert_round(tid, number, pairs):
    for table, (a, b) in enumerate(pairs, 1):
        if b is None:  # bye não tem placar a confirmar
            conn.execute("insert into t_matches (tournament_id, round, a_id, b_id, a_score, b_score, status, table_no) values (?, ?, ?, null, 0, 0, 'confirmed', ?)", (tid, number, a, table))
        else:
            conn.execute("insert into t_matches (tournament_id, round, a_id, b_id, status, table_no) values (?, ?, ?, ?, 'pending', ?)", (tid, number, a, b, table))


def active_players(tid):
    return [p['user_id'] for p in conn.execute("select user_id from participants where tournament_id = ? and status != 'dropped' order by seed", (tid,))]


def start_tournament(h, tid):
    row = tournament_or_404(tid)
    user = require_runner(h, row)
    with lock:
        row = tournament_or_404(tid)
        if row['status'] != 'open':
            raise ApiError(409, 'This event has already started.')
        players = active_players(tid)
        if len(players) < 2:
            raise ApiError(409, 'At least 2 players are needed.')
        if row['format'] == 'swiss':
            total, first = pairing.swiss_rounds(len(players)), pairing.swiss_pairings(players, [])
        elif row['format'] == 'round_robin':
            schedule = pairing.round_robin_schedule(players)
            total, first = len(schedule), schedule[0]
        else:
            first = pairing.elimination_first_round(players)
            total = 0
            while 2 ** total < len(players):
                total += 1
        insert_round(tid, 1, first)
        conn.execute("update tournaments set status = 'running', total_rounds = ? where id = ?", (total, tid))
        audit(user['id'], 'tournament.start', f'tournament:{tid}', players=len(players), rounds=total)
    h.send_json(200, {'round': 1, 'total_rounds': total})


def next_round(h, tid):
    row = tournament_or_404(tid)
    user = require_runner(h, row)
    with lock:
        row = tournament_or_404(tid)
        if row['status'] != 'running':
            raise ApiError(409, 'This event is not running.')
        current = conn.execute('select max(round) from t_matches where tournament_id = ?', (tid,)).fetchone()[0]
        if conn.execute("select 1 from t_matches where tournament_id = ? and round = ? and status != 'confirmed'", (tid, current)).fetchone():
            raise ApiError(409, 'Every match of this round must be confirmed first.')
        number = current + 1
        if number > row['total_rounds']:
            raise ApiError(409, 'All rounds are done. Close the event.')
        players = active_players(tid)
        if row['format'] == 'swiss':
            pairs = pairing.swiss_pairings(players, confirmed_matches(tid))
            if pairs is None:
                raise ApiError(409, 'No pairing without a rematch exists. The organizer must end the event.')
        elif row['format'] == 'round_robin':
            everyone = [p['user_id'] for p in conn.execute('select user_id from participants where tournament_id = ? order by seed', (tid,))]
            schedule = pairing.round_robin_schedule(everyone)[number - 1]
            pairs = [(a, b if b in players else None) if a in players else (b, None) for a, b in schedule if a in players or b in players]
        else:
            previous = [m for m in confirmed_matches(tid) if m['round'] == current]
            try:
                pairs = pairing.elimination_next_round(previous)
            except ValueError:
                raise ApiError(409, 'A draw cannot advance. Resolve the match first.')
        insert_round(tid, number, pairs)
        audit(user['id'], 'tournament.next_round', f'tournament:{tid}', round=number)
    h.send_json(200, {'round': number})


def close_tournament(h, tid):
    row = tournament_or_404(tid)
    user = require_runner(h, row)
    with lock:
        if conn.execute("select 1 from t_matches where tournament_id = ? and status not in ('confirmed')", (tid,)).fetchone():
            raise ApiError(409, 'Every match must be confirmed first.')
        conn.execute("update tournaments set status = 'closed' where id = ?", (tid,))
        audit(user['id'], 'tournament.close', f'tournament:{tid}')
    h.send_json(200, {'status': 'closed'})


def scores(body):
    a, b = body.get('a_score'), body.get('b_score')
    if any(not isinstance(x, int) or isinstance(x, bool) or not 0 <= x <= 99 for x in (a, b)):
        raise ApiError(400, 'Scores must be whole numbers.')
    return a, b


def report_match(h, mid):
    user = h.require_user()
    a, b = scores(h.read_json())
    with lock:
        match = conn.execute('select * from t_matches where id = ?', (int(mid),)).fetchone()
        if not match:
            raise ApiError(404, 'Match not found.')
        if match['status'] == 'confirmed':
            raise ApiError(409, 'This match is already confirmed.')
        row = tournament_or_404(match['tournament_id'])
        if row['status'] != 'running':
            raise ApiError(409, 'This event is not running.')
        target = f'tournament:{row["id"]}'
        if user['id'] not in (match['a_id'], match['b_id']):
            raise ApiError(403, 'Only the players or the organizer can report. Organizers use resolve.')
        if match['status'] == 'disputed':
            raise ApiError(409, 'This result is disputed. The organizer decides.')
        if match['status'] == 'pending':  # primeiro relato: espera o outro jogador
            conn.execute("update t_matches set a_score=?, b_score=?, status='reported', reported_by=? where id=?", (a, b, user['id'], match['id']))
            status = 'reported'
            other = match['b_id'] if user['id'] == match['a_id'] else match['a_id']
            notify(other, 'tournament', 'Confirm your match result.', target)
        elif match['reported_by'] == user['id']:
            raise ApiError(409, 'The other player must confirm this result.')
        elif (match['a_score'], match['b_score']) == (a, b):
            conn.execute("update t_matches set status='confirmed' where id=?", (match['id'],))
            status = 'confirmed'
        else:
            conn.execute("update t_matches set status='disputed' where id=?", (match['id'],))
            status = 'disputed'
            notify(row['organizer_id'], 'tournament', 'A match result is disputed.', target)
        audit(user['id'], f'match.{status}', target, match=match['id'], a=a, b=b)
    h.send_json(200, {'status': status})


def resolve_match(h, mid):
    a, b = scores(h.read_json())
    with lock:
        match = conn.execute('select * from t_matches where id = ?', (int(mid),)).fetchone()
        if not match:
            raise ApiError(404, 'Match not found.')
        row = tournament_or_404(match['tournament_id'])
        user = require_runner(h, row)
        if match['b_id'] is None:
            raise ApiError(400, 'A bye has no result to resolve.')
        conn.execute("update t_matches set a_score=?, b_score=?, status='confirmed', reported_by=? where id=?", (a, b, user['id'], match['id']))
        audit(user['id'], 'match.resolve', f'tournament:{row["id"]}', match=match['id'], a=a, b=b, previous=[match['a_score'], match['b_score'], match['status']])
    h.send_json(200, {'status': 'confirmed'})


def tournament_audit(h, tid):
    row = tournament_or_404(tid)
    require_runner(h, row)
    rows = conn.execute('select at, actor, action, detail from audit where target = ? order by id', (f'tournament:{tid}',)).fetchall()
    names = public_names(r['actor'] for r in rows)
    h.send_json(200, {'entries': [{**dict(r), 'actor': names.get(r['actor'])} for r in rows]})


# ---------- Meta Hub ----------
def meta_hub(h):
    """Só duelos online do Playtest, só agregados. A tabela duels não guarda versão de regra nem deck, e a IA nunca entra nela."""
    gods = {}
    total = 0
    for d in main.execute('select winner, a_god, b_god from duels'):
        if not d['a_god'] or not d['b_god']:
            continue
        total += 1
        if d['a_god'] == d['b_god']:
            continue  # espelho não mede o God
        for side, god in (('a', d['a_god']), ('b', d['b_god'])):
            row = gods.setdefault(god, {'god': god, 'matches': 0, 'wins': 0})
            row['matches'] += 1
            row['wins'] += int(str(d['winner'] or '').lower() == side)  # duels grava 'A'/'B' (settle_pair)
    rows = []
    for row in sorted(gods.values(), key=lambda r: -r['matches']):
        enough = row['matches'] >= MIN_SAMPLE
        rows.append({'god': row['god'], 'matches': row['matches'], 'share': round(row['matches'] / (2 * total), 4) if total else 0, 'win_rate': round(row['wins'] / row['matches'], 4) if enough else None, 'sample_ok': enough})
    h.send_json(200, {'environment': ENV, 'official': None, 'matches': total, 'min_sample': MIN_SAMPLE, 'gods': rows, 'excluded': ['AI matches', 'tutorial', 'mirror matches (from win rate)']})


# ---------- rotas ----------
def _routes():
    table = [
        ('GET', 'health', health), ('GET', 'me', me), ('GET', 'home', home_feed), ('GET', 'meta', meta_hub),
        ('GET', 'console', console), ('GET', 'audit', audit_log), ('POST', 'roles', grant_role), ('DELETE', r'roles/([A-Za-z0-9_]{3,20})/([a-z]+)', revoke_role),
        ('GET', 'content', list_content), ('POST', 'content', create_content), ('GET', r'content/([a-z0-9-]+)', read_content),
        ('PATCH', r'content/(\d+)', update_content), ('POST', r'content/(\d+)/publish', publish_content), ('POST', r'content/(\d+)/unpublish', unpublish_content),
        ('GET', 'decks', list_decks), ('POST', 'decks', share_deck), ('GET', r'decks/([\w-]+)', read_deck), ('PATCH', r'decks/([\w-]+)', patch_deck),
        ('POST', r'decks/([\w-]+)/rate', rate_deck), ('POST', r'decks/([\w-]+)/favorite', favorite_deck), ('POST', r'decks/([\w-]+)/fork', fork_deck),
        ('GET', 'comments', list_comments), ('POST', 'comments', add_comment), ('POST', r'comments/(\d+)/vote', vote_comment), ('POST', r'comments/(\d+)/report', report_comment),
        ('DELETE', r'comments/(\d+)', delete_comment), ('GET', 'reports', list_reports), ('GET', 'notifications', notifications), ('POST', 'notifications/read', notifications_read),
        ('GET', 'guilds', list_guilds), ('POST', 'guilds', create_guild), ('GET', r'guilds/([\w-]+)', read_guild), ('POST', r'guilds/([\w-]+)/apply', apply_guild),
        ('POST', r'guilds/([\w-]+)/invites', invite_guild), ('POST', r'guilds/requests/(\d+)/(accept|decline)', answer_request), ('POST', r'guilds/([\w-]+)/leave', leave_guild),
        ('POST', r'guilds/([\w-]+)/members/([A-Za-z0-9_]{3,20})/role', set_member_role), ('DELETE', r'guilds/([\w-]+)/members/([A-Za-z0-9_]{3,20})', kick_member),
        ('POST', r'guilds/([\w-]+)/announcements', guild_post), ('POST', r'guilds/([\w-]+)/teams', create_team), ('POST', r'guilds/teams/(\d+)/members', add_team_member), ('POST', r'guilds/([\w-]+)/xp', grant_guild_xp),
        ('GET', 'tournaments', list_tournaments), ('POST', 'tournaments', create_tournament), ('GET', r'tournaments/([\w-]+)', read_tournament),
        ('POST', r'tournaments/([\w-]+)/register', register), ('POST', r'tournaments/([\w-]+)/checkin', checkin), ('POST', r'tournaments/([\w-]+)/drop', drop),
        ('POST', r'tournaments/([\w-]+)/staff', add_staff), ('POST', r'tournaments/([\w-]+)/start', start_tournament), ('POST', r'tournaments/([\w-]+)/next-round', next_round),
        ('POST', r'tournaments/([\w-]+)/close', close_tournament), ('GET', r'tournaments/([\w-]+)/audit', tournament_audit),
        ('POST', r'matches/(\d+)/report', report_match), ('POST', r'matches/(\d+)/resolve', resolve_match),
    ]
    return [(verb, re.compile('/api/platform/' + rx), fn) for verb, rx, fn in table]


ROUTES = _routes()


def route(h, method, path):
    if ENV != 'playtest':  # fecha tudo fora do Playtest: Official não recebe estes módulos sem uma promoção aprovada
        raise ApiError(503, 'The platform is not enabled in this environment.')
    for verb, rx, fn in ROUTES:
        m = rx.fullmatch(path)
        if m and verb == method:
            return fn(h, *m.groups())
    raise ApiError(404, 'Not found.')


def query_of(raw_path):
    return {k: v[0] for k, v in parse_qs(urlparse(raw_path).query).items()}
