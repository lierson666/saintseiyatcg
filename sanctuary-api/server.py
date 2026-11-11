"""sanctuary-api: contas e decks do Saint Seiya TCG (docs/arquitetura-area-do-usuario.md, aprovada em 29/10/2026).

Só biblioteca padrão: http.server + sqlite3 + hashlib.scrypt. Roda atrás do Caddy, que também usa
GET /api/auth/check (forward_auth) para liberar o /playtest só a quem está logado.
Cadastro só para emails convidados (tabela invites; SANCTUARY_INVITES semeia na partida).
"""
import calendar, hashlib, hmac, json, os, re, secrets, sqlite3, threading, time, urllib.request, urllib.error
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

import cosmo
import achievements as ach_core
import flags
import identity
import payments
import economy as eco_core

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
# Age gate deployado somente com verificador externo integrado.
# Em modo obrigatório, falha fechado para TODAS as contas sem prova verificada no servidor.
# Gate 18+ e chaves do servidor: flags.py (SANCTUARY_<CHAVE>=1). Maioridade em identity.py; pagamentos em payments.py.
# Termos e Privacidade v2 (11/11/2026): entram compra de Cosmo Coins, reembolso e chargeback. Aceite gravado em legal_acceptances.
TERMS_VERSION = '2026-11-11-v2'
PUBLIC_URL = os.environ.get('SANCTUARY_PUBLIC_URL', '').rstrip('/')
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
# Contas fixadas em Kamui (pedido do autor, 31/10/2026): começam em Kamui e não caem dele, nem na virada da temporada.
KAMUI_FIXED = {'limattenhauer@gmail.com'}
ARENA_SECRET = os.environ.get('ARENA_SECRET', '')
# Economia (docs/economia.md, autor 31/10/2026): Cosmo Coins, coleção e boosters, tudo decidido aqui no servidor.
# catalog.json vem de tools/economy-catalog.py (cartas do booster por raridade e coleção inicial); Gods e Domains são de todos.
CATALOG = json.loads(Path(__file__).with_name('catalog.json').read_text())
BOOSTER = 'booster-olympus'
# Números da economia (ECONOMY FORGE, autor 11/11/2026): o publicado pelo STAR HILL (economy.json ao lado deste arquivo),
# lido ao iniciar. Sem arquivo ou inválido, valem os valores de docs/economia.md (economy.DEFAULTS).
ECO = eco_core.load(os.environ.get('SANCTUARY_ECONOMY') or Path(__file__).with_name('economy.json'))
PRICES = {BOOSTER: ECO['booster_price']}
# Pacotes da loja (autor, 31/10/2026, estilo MTG Arena): quantidade -> desconto em %. Edição pelo Star Hill fica para depois.
BUNDLES = {b['qty']: b['off'] for b in ECO['bundles']}
MAX_OPEN = 10  # abrir de uma vez: 1 ou até 10


def bundle_price(qty):
    return PRICES[BOOSTER] * qty * (100 - BUNDLES[qty]) // 100


# Cosméticos (autor, 31/10/2026): avatar (rosto), sleeve (verso das cartas) e moeda (cara ou coroa, 01/11/2026) por personagem. Deck box saiu (a capa do deck já faz isso).
# Só personagens com arte final; arte -ref (provisória) nunca vai à loja. Deuses custam o dobro; avatar de Deus é grátis.
# Item no inventário: 'avatar:<id>', 'sleeve:<id>', 'coin:<id>'. O id é o da carta (Deus: 'god-<nome>').
COSMETIC_GROUPS = (
    ('Gods', [('god-athena', 'Athena'), ('god-poseidon', 'Poseidon'), ('god-hades', 'Hades'), ('god-ares', 'Ares'), ('god-artemis', 'Artemis')]),
    ('Bronze Saints', [('athena-v6-001', 'Pegasus Seiya'), ('athena-v6-003', 'Dragon Shiryu'), ('athena-v6-005', 'Cygnus Hyoga'),
                       ('athena-v6-007', 'Andromeda Shun'), ('athena-v6-009', 'Phoenix Ikki')]),
    ('Gold Saints', [('athena-v6-011', 'Aries Mu'), ('athena-v6-013', 'Gemini Saga'), ('athena-v6-015', 'Leo Aiolia'),
                     ('athena-v6-017', 'Aquarius Camus'), ('hades-v6-197', 'Aries Shion'), ('hades-v6-253', 'Capricorn Shura')]),
    ('Judges of the Underworld', [('hades-v6-181', 'Wyvern Rhadamanthys'), ('hades-v6-183', 'Griffon Minos'), ('hades-v6-185', 'Garuda Aiacos')]),
)
COSMETIC_KINDS = dict(ECO['cosmetics'])  # preço da moeda: autor, 01/11/2026
SET_KINDS = ('avatar', 'sleeve')  # a moeda fica fora do set
SET_OFF = ECO['set_off']  # avatar + sleeve do mesmo personagem
COSMETICS = {cid: name for _, chars in COSMETIC_GROUPS for cid, name in chars}


def cosmetic_price(kind, cid):
    if kind == 'avatar' and cid.startswith('god-'):
        return 0
    return COSMETIC_KINDS[kind] * (ECO['god_multiplier'] if cid.startswith('god-') else 1)


def set_price(cid):
    return sum(cosmetic_price(k, cid) for k in SET_KINDS) * (100 - SET_OFF) // 100


def owns_cosmetic(uid, kind, cid):
    if cid not in COSMETICS or kind not in COSMETIC_KINDS:
        return False
    if cosmetic_price(kind, cid) == 0:
        return True
    return bool(db.execute('select full_access from users where id = ?', (uid,)).fetchone()[0]) or item_count(uid, f'{kind}:{cid}') > 0
WELCOME_BOOSTERS = ECO['welcome_boosters']
STARTER_GRANT = 'starter-v2'  # Onboarding 2.0; trocar os starters de novo pede outra versão
COSMO_GODS = ('athena', 'poseidon', 'hades', 'ares', 'artemis')
CHRONICLE_MISSIONS = ('1-1', '1-2', '2-1', '2-2', '2-3', '2-4', '3-1', '3-2', '4-1', '4-2', '4-3', '4-4', '4-5')  # missões do Cosmo Chronicles que existem; progresso só acrescenta
# Prêmio do Cosmo Chronicles (autor, 11/11/2026; docs/economia.md): só na 1ª vitória de cada missão. 250 coins + 1 booster; chefe paga 3 boosters.
CHRONICLE_COINS = ECO['chronicle_coins']
CHRONICLE_BOSSES = ('1-2', '2-3', '4-5')
CHRONICLE_BOOSTERS = lambda m: ECO['chronicle_boss_boosters'] if m in CHRONICLE_BOSSES else ECO['chronicle_boosters']


def chronicle_reward(uid, mission):
    """Paga uma vez por missão (marca 'chronicle:<id>' no livro-razão). Devolve o prêmio pago ou None."""
    reason = f'chronicle:{mission}'
    if db.execute('select 1 from coin_ledger where user_id = ? and reason = ?', (uid, reason)).fetchone():
        return None
    add_coins(uid, CHRONICLE_COINS, reason)
    add_item(uid, BOOSTER, CHRONICLE_BOOSTERS(mission))
    return {'mission': mission, 'coins': CHRONICLE_COINS, 'boosters': CHRONICLE_BOOSTERS(mission)}
COPY_LIMIT = 3
DUPLICATE_COINS = dict(ECO['duplicate_coins'])
# Criar carta direto com coins (autor, 11/11/2026): 250 coins = R$1; o Curinga da raridade, se houver, vem antes.
CRAFT_COINS = dict(ECO['craft_coins'])
WIN_COINS = tuple(ECO['win_coins'])  # vitórias online do dia (docs/economia.md); só o duelo é confirmado pelo servidor, a IA vem do navegador
# Booster de 15 cartas (autor, 07/11/2026): 9 Common, 5 Uncommon e 1 Legendary, que vira Divine em 1 de 8.
# Em 1 de 10 pacotes, uma Uncommon dá lugar a uma segunda Legendary.
PACK = (('Common', 9), ('Uncommon', 5))
DIVINE_ODDS = ECO['divine_odds']
DOUBLE_LEGENDARY_ODDS = ECO['double_legendary_odds']
# Wildcard estilo MTG Arena: às vezes ocupa a vaga de uma carta da mesma raridade (o pacote segue com 15)
# e depois vira qualquer carta daquela raridade na Coleção. Chance por pacote, 1 em N.
WILDCARD_ODDS = dict(ECO['wildcard_odds'])
WILDCARD = {r: f'wildcard-{r.lower()}' for r in WILDCARD_ODDS}
RARITY = {cid: r for r, ids in CATALOG['booster'].items() for cid in ids}
roll = secrets.SystemRandom()
# Conquistas e títulos (ACHIEVEMENTS FORGE V1.0, autor 11/11/2026): o catálogo é o publicado pelo STAR HILL
# (achievements.json ao lado deste arquivo); regras de métrica e validação em achievements.py. Substitui as 17 conquistas
# derivadas de 31/10/2026. Desbloqueio guardado em achievement_unlocks: uma vez só por jogador e conquista.
ACH_PATH = Path(os.environ.get('SANCTUARY_ACHIEVEMENTS') or Path(__file__).with_name('achievements.json'))
_ach_cache = {'mtime': None, 'catalog': {'version': 0, 'achievements': []}}


def ach_catalog():
    """Catálogo publicado; relido quando o arquivo muda (publicar no STAR HILL vale sem reiniciar o servidor local)."""
    try:
        mtime = ACH_PATH.stat().st_mtime
    except OSError:
        return _ach_cache['catalog']
    if mtime != _ach_cache['mtime']:
        data = json.loads(ACH_PATH.read_text(encoding='utf-8'))
        if not ach_core.check(data):  # catálogo inválido não entra: segue o último bom
            _ach_cache.update(mtime=mtime, catalog=data)
    return _ach_cache['catalog']


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
create table if not exists coin_ledger (id integer primary key, user_id integer not null, delta integer not null, reason text not null,
  created_at integer not null);
create index if not exists coin_ledger_user on coin_ledger(user_id);
create table if not exists collection (user_id integer not null, card_id text not null, qty integer not null, primary key (user_id, card_id));
create table if not exists inventory (user_id integer not null, item text not null, qty integer not null, primary key (user_id, item));
create table if not exists blocks (user_id integer not null, blocked_id integer not null, created_at integer not null,
  primary key (user_id, blocked_id));
create table if not exists achievement_unlocks (user_id integer not null, ach_id text not null, unlocked_at integer, recorded_at integer not null,
  source text not null, catalog_version integer not null, coins integer not null default 0, primary key (user_id, ach_id));
create table if not exists achievement_counters (user_id integer not null, key text not null, value integer not null, primary key (user_id, key));
create table if not exists season_awards (season text not null, user_id integer, place integer not null, tier text not null, score integer not null,
  wins integer not null, awarded_at integer not null, snapshot_hash text not null, unique (season, place));
create trigger if not exists season_awards_fixed before update of season, place, tier, score, wins, awarded_at, snapshot_hash on season_awards
  begin select raise(abort, 'season awards are immutable'); end;
create trigger if not exists season_awards_kept before delete on season_awards begin select raise(abort, 'season awards are immutable'); end;
"""

lock = threading.Lock()
db = None


def open_db(path=DB_PATH):
    global db
    db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.executescript('pragma journal_mode=wal; pragma foreign_keys=on;' + SCHEMA)
    cosmo.open_db(path)
    # Aceites legais versionados: tabela separada para preservar contas e snapshots antigos.
    db.execute('''create table if not exists legal_acceptances (
        id integer primary key autoincrement, user_id integer not null,
        document_version text not null, accepted_at integer not null,
        source text not null, foreign key (user_id) references users(id) on delete cascade
    )''')
    db.execute('''create table if not exists age_verifications (
        user_id integer primary key references users(id) on delete cascade,
        provider text not null, verified_at integer not null,
        assurance text not null, reference text not null
    )''')
    # Migração do cadastro completo: colunas novas em contas antigas (ficam vazias até o perfil ser completado).
    have = {r['name'] for r in db.execute('pragma table_info(users)')}
    for col in ('username', 'username_display', 'country', 'phone', 'friend_code', 'avatar_card', 'sleeve', 'coin', 'accepted_terms_at', 'last_seen', 'status', 'suspended_at', 'full_access', 'onboarding_cosmo', 'chronicles', 'title_equipped'):
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
    have = {r['name'] for r in db.execute('pragma table_info(duels)')}
    for col in ('a_hash', 'b_hash'):  # impressão da lista de cada lado (cosmo.deck_hash): winrate por deck no Cosmo Hub
        if col not in have:
            db.execute(f'alter table duels add column {col}')
    identity.migrate(db)  # contas sem estado de identidade viram UNVERIFIED, com evento de auditoria
    payments.migrate(db)
    db.execute('create unique index if not exists users_username on users(username)')
    db.execute('create unique index if not exists users_friend_code on users(friend_code)')
    for email in filter(None, (e.strip().lower() for e in os.environ.get('SANCTUARY_INVITES', '').split(','))):
        db.execute('insert or ignore into invites values (?, ?)', (email, int(time.time())))
    return db


def age_verified(uid):
    row = db.execute('select provider, assurance, reference from age_verifications where user_id = ?', (uid,)).fetchone()
    return bool(row and row['provider'] != 'self-declared' and row['assurance'] == 'adult-verified' and row['reference'])


def validate_dob(value):
    # Autodeclaração: filtro preliminar. NÃO comprova identidade nem maioridade.
    from datetime import date
    try:
        born = date.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise ApiError(400, 'Informe uma data de nascimento válida.')
    today = date.today()
    if born > today or born.year < today.year - 120:
        raise ApiError(400, 'Data de nascimento inválida.')
    if (today.year - born.year - ((today.month, today.day) < (born.month, born.day))) < 18:
        raise ApiError(403, 'Saint Seiya TCG é exclusivo para maiores de 18 anos.')
    return True


valid_cpf = identity.valid_cpf  # só a matemática dos dígitos; não confirma titularidade nem idade


def legal_ok(uid):
    return bool(db.execute('select 1 from legal_acceptances where user_id = ? and document_version = ?', (uid, TERMS_VERSION)).fetchone())


def gate_ok(uid):
    """Gate 18+: maioridade (autodeclarada, ou por provedor se IDENTITY_VERIFICATION_ENABLED) e termos atuais aceitos."""
    return identity.adult(db, uid, require_provider=flags.on('IDENTITY_VERIFICATION_ENABLED')) and legal_ok(uid)


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
            'country': u['country'], 'phone': u['phone'], 'avatar_card': u['avatar_card'], 'sleeve': u['sleeve'], 'coin': u['coin'], 'complete': bool(u['username']),
            'admin': u['email'] in ADMINS, 'onboarding_cosmo': json.loads(u['onboarding_cosmo'] or '{}'),
            'chronicles': json.loads(u['chronicles'] or '{}'), 'title': equipped_title(u),
            'identity': identity.public(db, u['id']), 'terms_version': TERMS_VERSION, 'terms_accepted': legal_ok(u['id'])}


def season_of(ts):  # temporada = mês do calendário (UTC)
    t = time.gmtime(ts)
    return t.tm_year * 12 + t.tm_mon - 1


def season_name(n):
    return f'{n // 12}-{n % 12 + 1:02d}'


def climb(results, now=None, floor=0, on_step=None):
    """Refaz a escalada a partir dos duelos online [(finished_at, 'win'|'loss'|'draw')] em ordem.
    Steel: vitória +2 pips, derrota 0. Demais: +1/-1. 6 pips por divisão (IV→I); não cai de tier.
    Kamui não tem divisão: pontos (+1/-1, mínimo 0). Virada do mês: um tier abaixo, divisão IV, sem pips."""
    now = time.time() if now is None else now
    base = lambda t: {'tier': t, 'division': None if t == KAMUI else 4, 'pips': 0, 'points': 0}
    r = base(floor)
    season, best, last = season_of(now), None, None
    key = lambda r: (r['tier'], -(r['division'] or 0), r['pips'] + r['points'])
    cur = None
    for ts, res in list(results) + [(now, None)]:
        s = season_of(ts)
        if cur is not None and s > cur:
            last = best if s - cur == 1 else None
            for _ in range(min(s - cur, KAMUI)):
                r = base(max(floor, r['tier'] - 1))
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
        if on_step:
            on_step(ts, cur, r)
    show = lambda r: r and {'tier': TIERS[r['tier']], 'division': r['division']}
    return {**r, 'tier': TIERS[r['tier']], 'season': season_name(season), 'season_ends': calendar.timegm(((season + 1) // 12, (season + 1) % 12 + 1, 1, 0, 0, 0)), 'best': show(best), 'last_season': show(last) if last else None}


def coins_of(uid):
    return db.execute('select coalesce(sum(delta), 0) from coin_ledger where user_id = ?', (uid,)).fetchone()[0]


def add_coins(uid, delta, reason):
    db.execute('insert into coin_ledger (user_id, delta, reason, created_at) values (?, ?, ?, ?)', (uid, delta, reason, int(time.time())))
    payments.on_spend(db, uid, delta, reason)  # gasto consome primeiro os coins comprados (exceto booster)


def duel_wins_paid(uid):
    day = int(time.time()) // 86400 * 86400
    return db.execute("select count(*), coalesce(sum(delta), 0) from coin_ledger where user_id = ? and reason like 'duel-win:%' and created_at >= ?", (uid, day)).fetchone()


def pay_duel_win(uid, challenge_id):
    paid = duel_wins_paid(uid)[0]
    if paid < len(WIN_COINS):
        add_coins(uid, WIN_COINS[paid], f'duel-win:{challenge_id}')


def add_item(uid, item, qty):
    db.execute('insert into inventory values (?, ?, ?) on conflict(user_id, item) do update set qty = qty + excluded.qty', (uid, item, qty))


def item_count(uid, item):
    row = db.execute('select qty from inventory where user_id = ? and item = ?', (uid, item)).fetchone()
    return row[0] if row else 0


def welcome(uid):
    """Primeira visita à economia: coleção dos 5 decks iniciais + boosters de boas-vindas (uma vez; marca no livro-razão)."""
    seen = {r[0] for r in db.execute("select reason from coin_ledger where user_id = ? and reason in ('welcome', ?)", (uid, STARTER_GRANT))}
    if 'welcome' not in seen:
        add_item(uid, BOOSTER, WELCOME_BOOSTERS)
        add_coins(uid, 0, 'welcome')
    if STARTER_GRANT not in seen:  # só completa o que falta: nunca tira nem soma cópia de quem já tem
        db.executemany('insert into collection values (?, ?, ?) on conflict(user_id, card_id) do update set qty = max(qty, excluded.qty)', [(uid, cid, n) for cid, n in CATALOG['starter'].items()])
        add_coins(uid, 0, STARTER_GRANT)


def gain_card(uid, cid):
    """Põe a carta na coleção; acima de 3 cópias vira Cosmo Coins. Devolve (era nova, coins da cópia extra)."""
    row = db.execute('select qty from collection where user_id = ? and card_id = ?', (uid, cid)).fetchone()
    have = row[0] if row else 0
    if have >= COPY_LIMIT:
        coins = DUPLICATE_COINS[RARITY[cid]]
        add_coins(uid, coins, f'duplicate:{cid}')
        return False, coins
    db.execute('insert into collection values (?, ?, 1) on conflict(user_id, card_id) do update set qty = qty + 1', (uid, cid))
    return have == 0, 0


def pack_slots():
    """Raridade de cada uma das 15 vagas e quais viram wildcard. Sem banco: só o sorteio."""
    counts = dict(PACK)
    tops = ['Divine' if roll.randrange(DIVINE_ODDS) == 0 else 'Legendary']
    if roll.randrange(DOUBLE_LEGENDARY_ODDS) == 0:
        counts['Uncommon'] -= 1
        tops.append('Legendary')
    slots = [[r, False] for r, n in counts.items() for _ in range(n)] + [[r, False] for r in tops]
    for rarity, odds in WILDCARD_ODDS.items():
        if roll.randrange(odds):
            continue
        # Vaga da mesma raridade; sem ela (Divine num pacote com Legendary, por exemplo), a vaga de cima.
        same = [s for s in slots if s[0] == rarity and not s[1]]
        slot = same[0] if same else slots[-1]
        slot[0], slot[1] = rarity, True
    return slots


def open_pack(uid):
    slots = pack_slots()
    picks = {r: iter(roll.sample(CATALOG['booster'][r], sum(1 for s in slots if s[0] == r and not s[1]))) for r in WILDCARD}
    out = []
    for rarity, wild in slots:
        if wild:
            add_item(uid, WILDCARD[rarity], 1)
            out.append({'id': WILDCARD[rarity], 'rarity': rarity, 'wildcard': True, 'new': True, 'coins': 0})
            continue
        cid = next(picks[rarity])
        new, coins = gain_card(uid, cid)
        out.append({'id': cid, 'rarity': rarity, 'new': new, 'coins': coins})
    return out


def missing_cards(uid, deck):
    """Cartas do deck além das que o jogador tem (duelo online; acesso total ignora). Gods e Domains não contam."""
    if db.execute('select full_access from users where id = ?', (uid,)).fetchone()[0]:
        return []
    welcome(uid)
    have = dict(db.execute('select card_id, qty from collection where user_id = ?', (uid,)).fetchall())
    need = {}
    for e in deck.get('main_deck', []):
        cid = str(e.get('card_id', ''))
        if cid in RARITY:
            need[cid] = need.get(cid, 0) + int(e.get('quantity') or 0)
    return [cid for cid, n in need.items() if n > have.get(cid, 0)]


def economy_of(uid):
    u = db.execute('select full_access from users where id = ?', (uid,)).fetchone()
    return {'coins': coins_of(uid), 'boosters': item_count(uid, BOOSTER), 'full_access': bool(u['full_access']),
            'wildcards': {r: item_count(uid, item) for r, item in WILDCARD.items()},
            'collection': {r['card_id']: r['qty'] for r in db.execute('select card_id, qty from collection where user_id = ?', (uid,))},
            'prices': {'booster': PRICES[BOOSTER], 'craft': CRAFT_COINS, 'bundles': [{'qty': q, 'off': off, 'price': bundle_price(q)} for q, off in BUNDLES.items()]},
            'cosmetics': [{'group': g, 'items': [{'id': cid, 'name': name, 'set': set_price(cid),
                                                   **{k: {'price': cosmetic_price(k, cid), 'owned': owns_cosmetic(uid, k, cid)} for k in COSMETIC_KINDS}}
                                                  for cid, name in chars]} for g, chars in COSMETIC_GROUPS],
            'set_off': SET_OFF}


def level_of(xp):
    level = xp // XP_LEVEL + 1
    return {'xp': xp, 'level': level, 'xp_in_level': xp % XP_LEVEL, 'xp_level_size': XP_LEVEL,
            'title': next((t for lv, t in TITLES if level >= lv), None)}


def online_results(uid):
    rows = db.execute('select * from duels where a_id = ? or b_id = ? order by finished_at, challenge_id', (uid, uid)).fetchall()
    side = lambda d: 'A' if d['a_id'] == uid else 'B'
    return [(d['finished_at'], 'draw' if not d['winner'] else 'win' if d['winner'] == side(d) else 'loss') for d in rows]


def floor_of(uid):
    email = db.execute('select email from users where id = ?', (uid,)).fetchone()
    return KAMUI if email and email[0].lower() in KAMUI_FIXED else 0


def rank_of(uid):
    results = online_results(uid)
    ai = db.execute('select coalesce(sum(xp), 0) from ai_xp where user_id = ?', (uid,)).fetchone()[0]
    return {**climb(results, floor=floor_of(uid)), **level_of(ai + sum(XP_ONLINE[r] for _, r in results))}


def kamui_board(limit=20):
    # shortcut: refaz a escalada de todo jogador com duelo a cada pedido; trocar por tabela de rank quando houver centenas de jogadores.
    ids = [r[0] for r in db.execute('select distinct id from users join duels on id in (a_id, b_id) where suspended_at is null')]
    ids += [r[0] for r in db.execute(f"select id from users where suspended_at is null and lower(email) in ({','.join('?' * len(KAMUI_FIXED))})", tuple(KAMUI_FIXED)) if r[0] not in ids]
    board = []
    for uid in ids:
        r = climb(online_results(uid), floor=floor_of(uid))
        if r['tier'] == TIERS[KAMUI]:
            name = db.execute('select username_display from users where id = ?', (uid,)).fetchone()[0]
            board.append({'username': name, 'points': r['points']})
    board.sort(key=lambda b: -b['points'])
    return board[:limit]


# ---------- conquistas (ACHIEVEMENTS FORGE V1.0) ----------
# Chamadores seguram o lock. Medidas só do que o servidor guarda; ver achievements.METRICS.
GOLD_I = lambda r: r['tier'] > 4 or (r['tier'] == 4 and r['division'] == 1)


def ach_count(times):
    return {'value': len(times), 'times': sorted(times)}


def counter(uid, key):
    row = db.execute('select value from achievement_counters where user_id = ? and key = ?', (uid, key)).fetchone()
    return row[0] if row else 0


def bump(uid, key, n=1):
    db.execute('insert into achievement_counters values (?, ?, ?) on conflict(user_id, key) do update set value = value + excluded.value', (uid, key, n))


def measure(uid):
    """{métrica: {value, times, at}} de um jogador. times[i] = quando a contagem chegou a i + 1 (data real ou nenhuma)."""
    cap = int(ach_catalog().get('anti_farm', {}).get('max_wins_per_opponent_day', 3))
    rows = db.execute('select * from duels where a_id = ? or b_id = ? order by finished_at, challenge_id', (uid, uid)).fetchall()
    played, wins, streak_t, per_god, decks, per_opp = [], [], [], {g: [] for g in ach_core.GODS}, {}, {}
    streak = 0
    for d in rows:
        a = d['a_id'] == uid
        ts, opp = d['finished_at'], d['b_id'] if a else d['a_id']
        played.append(ts)
        if not d['winner'] or d['winner'] != ('A' if a else 'B'):
            streak = 0
            continue
        key = (opp, ts // 86400)
        per_opp[key] = per_opp.get(key, 0) + 1
        if per_opp[key] > cap:  # anti-farm: vitória repetida contra o mesmo adversário no dia não conta nem quebra a sequência
            continue
        wins.append(ts)
        streak += 1
        if streak > len(streak_t):
            streak_t.append(ts)
        god = str((d['a_god'] if a else d['b_god']) or '').removeprefix('god-')
        if god in per_god:
            per_god[god].append(ts)
        deck = d['a_hash'] if a else d['b_hash']
        if deck and deck not in decks:
            decks[deck] = ts
    each = min(len(t) for t in per_god.values())
    out = {'played': ach_count(played), 'wins': ach_count(wins), 'win_streak': {'value': len(streak_t), 'times': streak_t},
           **{f'{g}_wins': ach_count(t) for g, t in per_god.items()},
           'faction_wins_each': {'value': each, 'times': [max(t[i] for t in per_god.values()) for i in range(each)]},
           'winning_decks': ach_count(list(decks.values()))}
    gold, kamui = {}, {}
    if floor_of(uid) != KAMUI:  # conta fixada em Kamui não subiu: não ganha título de rank
        def step(ts, season, r):
            if GOLD_I(r):
                gold.setdefault(season, ts)
            if r['tier'] == KAMUI:
                kamui.setdefault(season, ts)
        climb(online_results(uid), floor=0, on_step=step)
    out.update({'gold_i': {'value': int(bool(gold)), 'times': sorted(gold.values())[:1]}, 'season_gold_i': ach_count(list(gold.values())),
                'kamui': {'value': int(bool(kamui)), 'times': sorted(kamui.values())[:1]}, 'season_kamui': ach_count(list(kamui.values()))})
    best = db.execute('select place, awarded_at from season_awards where user_id = ? order by place, awarded_at limit 1', (uid,)).fetchone()
    out['season_top'] = {'value': best['place'] if best else 0, 'at': best['awarded_at'] if best else None}
    out['ai_wins'] = ach_count([r[0] for r in db.execute("select created_at from ai_xp where user_id = ? and result = 'win'", (uid,))])
    out['decks_created'] = {'value': db.execute('select count(*) from decks where user_id = ?', (uid,)).fetchone()[0]}
    out['new_cards'] = {'value': sum(1 for r in db.execute('select card_id from collection where user_id = ? and qty > 0', (uid,)) if r[0] not in CATALOG['starter'])}
    out['boosters_opened'] = {'value': counter(uid, 'boosters_opened')}
    u = db.execute('select onboarding_cosmo, chronicles from users where id = ?', (uid,)).fetchone()
    out['cosmo_discovered'] = {'value': int(json.loads(u['onboarding_cosmo'] or '{}').get('seen') is True)}
    out['chronicles_missions'] = {'value': len(json.loads(u['chronicles'] or '{}').get('completed', []))}
    return out


def sync_achievements(uid):
    """Desbloqueia o que o jogador já cumpriu. Idempotente: a chave (jogador, conquista) impede duas linhas e dois pagamentos.
    Desbloqueio e Cosmo Coins na mesma transação. Primeira vez do jogador = migração (datas só quando dá para saber)."""
    cat = ach_catalog()
    values = measure(uid)
    now, new = int(time.time()), []
    source = 'live' if counter(uid, 'synced') else 'migration'
    db.execute('savepoint ach')
    try:
        for a, at in ach_core.unlockable(cat, values):
            coins = a['reward']['coins'] if ach_core.tracking(a['metric']) == 'server' else 0
            cur = db.execute('insert or ignore into achievement_unlocks values (?, ?, ?, ?, ?, ?, ?)', (uid, a['id'], at, now, source, cat.get('version', 0), coins))
            if cur.rowcount == 1:
                if coins:
                    add_coins(uid, coins, f"achievement:{a['id']}")
                new.append(a['id'])
        if source == 'migration':
            bump(uid, 'synced')
        db.execute('release ach')
    except Exception:
        db.execute('rollback to ach')
        db.execute('release ach')
        raise
    return values, new


def achievements_of(uid, public=False):
    values, new = sync_achievements(uid)
    unlocked = {r['ach_id']: r['unlocked_at'] for r in db.execute('select ach_id, unlocked_at from achievement_unlocks where user_id = ?', (uid,))}
    items = ach_core.progress(ach_catalog(), values, unlocked)
    if public:  # para os outros: só o que tem e quando; nada do tamanho da coleção
        items = [{k: v for k, v in i.items() if k not in ('value', 'metric')} for i in items]
    return items, new


def equipped_title(u):
    tid = u['title_equipped'] if 'title_equipped' in u.keys() else None
    if not tid or not db.execute('select 1 from achievement_unlocks where user_id = ? and ach_id = ?', (u['id'], tid)).fetchone():
        return None
    return ach_core.title_of(ach_catalog(), tid)


def season_bounds(name):
    m = re.fullmatch(r'(\d{4})-(\d{2})', str(name or ''))
    if not m or not 1 <= int(m[2]) <= 12:
        raise ApiError(400, 'Season must look like 2026-10.')
    n = int(m[1]) * 12 + int(m[2]) - 1
    return n, calendar.timegm(((n + 1) // 12, (n + 1) % 12 + 1, 1, 0, 0, 0))


def certify_season(name, now=None):
    """Season Awards: foto do fim da temporada, só de temporada encerrada. Uma vez só (gravada, depois nunca muda).
    Entra quem jogou duelo online na temporada, sem suspensão e sem conta fixada em Kamui. TOP 100 por rank no fim do mês."""
    now = time.time() if now is None else now
    n, end = season_bounds(name)
    if n >= season_of(now):
        raise ApiError(400, 'This season has not ended yet.')
    done = db.execute('select place, user_id, tier, score, wins, snapshot_hash from season_awards where season = ? order by place', (name,)).fetchall()
    if done:
        return [dict(r) for r in done], False
    start = calendar.timegm((n // 12, n % 12 + 1, 1, 0, 0, 0))
    ids = [r[0] for r in db.execute('select distinct u.id from users u join duels d on u.id in (d.a_id, d.b_id) '
                                     'where u.suspended_at is null and d.finished_at >= ? and d.finished_at < ?', (start, end))]
    rows = []
    for uid in ids:
        if floor_of(uid) == KAMUI:
            continue
        res = [x for x in online_results(uid) if x[0] < end]
        r = climb(res, now=end - 1)
        t = TIERS.index(r['tier'])
        rows.append({'user_id': uid, 'tier': r['tier'], 'score': r['pips'] + r['points'], 'key': (t, -(r['division'] or 0), r['pips'] + r['points']),
                     'wins': sum(1 for ts, x in res if x == 'win' and ts >= start)})
    top = ach_core.award_order(rows)[:100]
    snap = [{'place': i, 'user_id': r['user_id'], 'tier': r['tier'], 'score': r['score'], 'wins': r['wins']} for i, r in enumerate(top, 1)]
    digest = hashlib.sha256(json.dumps({'season': name, 'top': snap}, sort_keys=True).encode()).hexdigest()
    db.execute('savepoint awards')
    try:
        for e in snap:
            db.execute('insert into season_awards values (?, ?, ?, ?, ?, ?, ?, ?)', (name, e['user_id'], e['place'], e['tier'], e['score'], e['wins'], int(now), digest))
        db.execute('release awards')
    except Exception:
        db.execute('rollback to awards')
        db.execute('release awards')
        raise
    for e in snap:
        sync_achievements(e['user_id'])
    return [{**e, 'snapshot_hash': digest} for e in snap], True


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
    if 'sleeve' in body:
        out['sleeve'] = str(body.get('sleeve') or '')[:80] or None
    if 'coin' in body:
        out['coin'] = str(body.get('coin') or '')[:80] or None
    return out


def check_username(username):
    if not USERNAME_RE.match(username):
        raise ApiError(400, 'Username: 3 to 20 letters, numbers or _.')
    if db.execute('select 1 from users where username = ?', (username.lower(),)).fetchone():
        raise ApiError(409, 'This username is taken.')


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


ApiError = cosmo.ApiError


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

    def require_user(self, gate=True):
        user = self.current_user()
        if not user:
            raise ApiError(401, 'Sign in to continue.')
        if gate and flags.on('AGE_GATE_REQUIRED') and not gate_ok(user['id']):
            raise ApiError(403, 'Confirm your age and accept the current terms to continue.')  # a tela de regularização trata
        return user

    def admins(self):
        return ADMINS

    def query(self):
        return cosmo.query_of(self.path)

    def require_admin(self):
        user = self.require_user(gate=False)  # o gate 18+ é para jogar; o admin precisa do painel até para regularizar a própria conta
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
            m = re.fullmatch(r'/api/payments/webhook/([a-z]+)', path)  # vem do provedor: sem Origin; autenticado pela assinatura
            if m and method == 'POST':
                return self.payment_webhook(m[1])
            m = re.fullmatch(r'/api/identity/callback/([a-z]+)', path)
            if m and method == 'POST':
                return self.identity_callback(m[1])
            if method != 'GET':
                self.check_origin()
            if method == 'GET' and path == '/api/flags':
                return self.send_json(200, flags.snapshot())
            if method == 'POST' and path == '/api/me/identity':
                return self.declare_identity()
            if method == 'POST' and path == '/api/me/legal':
                return self.accept_legal()
            if method == 'GET' and path == '/api/payments/packs':
                return self.payment_packs()
            if method == 'POST' and path == '/api/payments/orders':
                return self.payment_order()
            if method == 'GET' and path == '/api/payments/orders':
                return self.payment_history()
            m = re.fullmatch(r'/api/payments/orders/(ord_[0-9a-f]{24})', path)
            if m and method == 'GET':
                return self.payment_order_status(m[1])
            m = re.fullmatch(r'/api/payments/orders/(ord_[0-9a-f]{24})/withdraw', path)
            if m and method == 'POST':
                return self.payment_withdraw(m[1])
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
                if method == 'GET':  # sem gate: a tela de regularização precisa do estado da conta
                    return self.send_json(200, profile(self.require_user(gate=False)))
                if method == 'PATCH':
                    return self.update_me()
                if method == 'DELETE':
                    return self.delete_me()
            if method == 'POST' and path == '/api/me/password':
                return self.change_password()
            if method == 'GET' and path == '/api/achievements':
                return self.my_achievements()
            if method == 'POST' and path == '/api/me/title':
                return self.equip_title()
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
            m = re.fullmatch(r'/api/players/([A-Za-z0-9_]{3,20})', path)
            if m and method == 'GET':
                return self.public_profile(m[1])
            if method == 'POST' and path == '/api/challenges':
                return self.challenge()
            if method == 'GET' and path == '/api/challenges/pending':
                return self.challenges_pending()
            m = re.fullmatch(r'/api/challenges/(\d+)/(accept|decline|cancel)', path)
            if m and method == 'POST':
                return self.challenge_answer(int(m[1]), m[2])
            if method == 'GET' and path == '/api/economy':
                return self.economy()
            if method == 'POST' and path == '/api/store/buy':
                return self.store_buy()
            if method == 'POST' and path == '/api/boosters/open':
                return self.booster_open()
            if method == 'POST' and path == '/api/wildcards/redeem':
                return self.wildcard_redeem()
            if method == 'GET' and path == '/api/rank':
                return self.rank()
            if method == 'POST' and path == '/api/xp/ai':
                return self.ai_xp()
            if method == 'POST' and path == '/api/access-requests':
                return self.access_request()
            if path.startswith('/api/platform/'):
                return cosmo.route(self, method, path)
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
        user = self.current_user()
        if user and (not flags.on('AGE_GATE_REQUIRED') or gate_ok(user['id'])):
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
        declared = body.get('birth_date') is not None
        if declared or flags.on('AGE_GATE_REQUIRED'):  # autodeclaração 18+ (identity.py); menor de idade não abre conta
            try:
                adult, *_ = identity.check_declaration(body)
            except identity.IdentityError as e:
                raise ApiError(e.status, e.message)
            if not adult:
                raise ApiError(403, 'Saint Seiya TCG is for adults 18 or older.')
        if body.get('accept_terms') is not True:
            raise ApiError(400, 'Please accept the privacy terms.')
        supplied_version = body.get('terms_version')
        if supplied_version is not None and supplied_version != TERMS_VERSION:
            raise ApiError(400, 'Please update the registration page and review the current terms.')
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
            db.execute('insert into legal_acceptances (user_id, document_version, accepted_at, source) values (?, ?, ?, ?)',
                       (cur.lastrowid, supplied_version or 'legacy-unversioned', now, 'registration'))
            identity.migrate(db)  # a conta nova nasce UNVERIFIED, com evento
            if declared:
                try:
                    identity.self_declare(db, cur.lastrowid, body)
                except identity.IdentityError as e:  # ex.: CPF já ligado a outra conta: desfaz o cadastro
                    for t in ('identity_events', 'identity_status', 'legal_acceptances'):
                        db.execute(f'delete from {t} where user_id = ?', (cur.lastrowid,))
                    db.execute('delete from users where id = ?', (cur.lastrowid,))
                    raise ApiError(e.status, e.message)
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
        rewards = []
        with lock:
            if 'username' in body and not user['username']:  # conta antiga completando o perfil: escolhe o nome uma vez
                username = str(body['username']).strip()
                check_username(username)
                fields.update(username=username.lower(), username_display=username, friend_code=new_friend_code(username))
            if body.get('accept_terms') is True and not user['accepted_terms_at']:
                fields['accepted_terms_at'] = int(time.time())
            for kind, col in (('avatar', 'avatar_card'), ('sleeve', 'sleeve'), ('coin', 'coin')):  # cosmético só se for do jogador
                if fields.get(col) and not owns_cosmetic(user['id'], kind, fields[col]):
                    raise ApiError(400, 'Get this in the Store first.')
            if isinstance(body.get('onboarding_cosmo'), dict):  # progresso de Descubra seu Cosmo: só campos e Deuses conhecidos
                o = body['onboarding_cosmo']
                fields['onboarding_cosmo'] = json.dumps({'seen': o.get('seen') is True, 'last': o.get('last') if o.get('last') in COSMO_GODS else None,
                                                         'tried': [g for g in COSMO_GODS if g in (o.get('tried') if isinstance(o.get('tried'), list) else [])]})
            if isinstance(body.get('chronicles'), dict):  # Cosmo Chronicles: só IDs conhecidos, nunca apaga missão já concluída
                sent = body['chronicles'].get('completed')
                have = set(json.loads(user['chronicles'] or '{}').get('completed', []))
                before = set(have)
                have |= {m for m in CHRONICLE_MISSIONS if m in (sent if isinstance(sent, list) else [])}
                fields['chronicles'] = json.dumps({'completed': [m for m in CHRONICLE_MISSIONS if m in have]})
                rewards = [r for r in (chronicle_reward(user['id'], m) for m in CHRONICLE_MISSIONS if m in have - before) if r]
            if fields:
                db.execute(f'update users set {", ".join(k + " = ?" for k in fields)} where id = ?', (*fields.values(), user['id']))
            fresh = db.execute('select * from users where id = ?', (user['id'],)).fetchone()
        out = profile(fresh)
        if rewards:
            out['chronicle_rewards'] = rewards  # a tela de desfecho mostra o que entrou
        self.send_json(200, out)

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
            for table in ('sessions', 'decks', 'coin_ledger', 'collection', 'inventory'):
                db.execute(f'delete from {table} where user_id = ?', (user['id'],))
            uid = user['id']
            db.execute('delete from friend_requests where from_id = ? or to_id = ?', (uid, uid))
            db.execute('delete from friendships where user_a = ? or user_b = ?', (uid, uid))
            db.execute('delete from blocks where user_id = ? or blocked_id = ?', (uid, uid))
            db.execute('delete from messages where from_id = ? or to_id = ?', (uid, uid))
            db.execute('delete from challenges where from_id = ? or to_id = ?', (uid, uid))
            db.execute('delete from reports where reporter_id = ?', (uid,))
            db.execute('delete from ai_xp where user_id = ?', (uid,))
            db.execute('delete from achievement_unlocks where user_id = ?', (uid,))
            db.execute('delete from achievement_counters where user_id = ?', (uid,))
            db.execute('update season_awards set user_id = null where user_id = ?', (uid,))  # o lugar fica no histórico, sem a conta
            db.execute('delete from access_requests where email = ?', (user['email'],))
            db.execute('delete from login_attempts where email = ?', (user['email'],))
            # duelos: o histórico do adversário fica, o apagado vira "Deleted player" (id nulo)
            db.execute('update duels set a_id = null where a_id = ?', (uid,))
            db.execute('update duels set b_id = null where b_id = ?', (uid,))
            db.execute('update payment_orders set user_id = null where user_id = ?', (uid,))  # registro do pagamento fica, sem a conta
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
        cosmo.sync_public(user['id'], deck_id, data)  # deck marcado Public no jogo aparece no Cosmo Hub
        self.send_json(200, {'id': deck_id, 'revision': current + 1})

    def delete_deck(self, deck_id):  # exclusão lógica: 30 dias para desfazer
        user = self.require_user()
        with lock:
            db.execute('update decks set deleted_at = ? where user_id = ? and deck_id = ?', (int(time.time()), user['id'], deck_id))
        cosmo.sync_public(user['id'], deck_id, None)  # deck apagado sai do Cosmo Hub (fica privado)
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
            if missing_cards(me['id'], deck):
                raise ApiError(400, 'This deck uses cards you do not own yet.')
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
            if missing_cards(me['id'], deck):
                raise ApiError(400, 'This deck uses cards you do not own yet.')
            names = dict(db.execute('select id, username_display from users where id in (?, ?)', (c['from_id'], c['to_id'])).fetchall())
        # fora do lock: chamada de rede ao arena-server (quem desafiou é A; quem aceitou é B)
        match_id = self.arena_create({'A': names[c['from_id']], 'B': names[c['to_id']]}, {'A': json.loads(c['deck']), 'B': deck})
        with lock:
            cur = db.execute("update challenges set status = 'accepted', match_id = ?, deck_b = ? where id = ? and status = 'pending'",
                             (match_id, json.dumps({'god': deck.get('god'), 'hash': cosmo.deck_hash(deck)}), cid))
            if not cur.rowcount:
                raise ApiError(409, 'This challenge is no longer open.')
        self.send_json(200, {'match': match_id})

    def player_profile(self, username):  # perfil público entre jogadores logados; bloqueados e suspensos aparecem como inexistentes
        me = self.require_user()
        with lock:
            u = db.execute('select * from users where username = ?', (username.lower(),)).fetchone()
            if not u or u['suspended_at'] or (u['id'] != me['id'] and self.blocked_between(me['id'], u['id'])):
                raise ApiError(404, 'Player not found.')
        self.send_json(200, {k: v for k, v in self.profile_data(u).items() if k != 'recent_all'})

    def public_profile(self, username):
        """Perfil no Cosmo Hub, aberto sem login (autor, 08/11/2026): só o que já é público no Hub. Sem país, moedas, verso de carta
        nem nome dos adversários; perfil incompleto ou suspenso não existe."""
        with lock:
            u = db.execute('select * from users where username = ?', (str(username).lower(),)).fetchone()
        if not u or u['suspended_at'] or not u['username']:
            raise ApiError(404, 'Player not found.')
        full = self.profile_data(u)
        gods = {}
        for d in full['recent_all']:
            if d['god']:
                gods[d['god']] = gods.get(d['god'], 0) + 1
        self.send_json(200, {'username': full['username'], 'joined': full['joined'], 'avatar_card': full['avatar_card'], 'rank': full['rank'],
                             'achievements': full['achievements'], 'title': full['title'], 'stats': full['stats'], 'favorite_god': max(gods, key=gods.get) if gods else None,
                             'recent': [{k: d[k] for k in ('result', 'god', 'opponent_god', 'date')} for d in full['recent']]})

    def profile_data(self, u):
        with lock:
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
                               'god': d['a_god'] if side == 'A' else d['b_god'], 'opponent_god': d['b_god'] if side == 'A' else d['a_god'], 'date': d['finished_at']})
        played = len(rows)
        r = rank_of(uid)
        with lock:
            achievements, _ = achievements_of(uid, public=True)
            title = equipped_title(u)
        return {'rank': {k: r[k] for k in ('tier', 'division', 'pips', 'points', 'level', 'title')}, 'achievements': achievements, 'title': title, 'username': u['username_display'], 'country': u['country'], 'joined': u['created_at'],
                'avatar_card': u['avatar_card'], 'sleeve': u['sleeve'], 'coin': u['coin'], 'stats': {'played': played, 'wins': wins, 'losses': losses,
                'winrate': round(100 * wins / played) if played else 0}, 'recent': recent,
                'recent_all': [{'god': d['a_god'] if d['a_id'] == uid else d['b_god']} for d in rows]}

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
            self.send_json(200, {**rank_of(uid), 'kamui': kamui_board(), **self.ai_today(uid), 'duel_coins_today': duel_wins_paid(uid)[1]})

    def my_achievements(self):
        uid = self.require_user()['id']
        with lock:
            items, new = achievements_of(uid)
            u = db.execute('select * from users where id = ?', (uid,)).fetchone()
            self.send_json(200, {'achievements': items, 'new': new, 'title': equipped_title(u), 'catalog_version': ach_catalog().get('version', 0)})

    def equip_title(self):
        """Equipa um título conquistado (ou tira, com id null). Só conquista publicada, ativa e desbloqueada por este jogador."""
        uid = self.require_user()['id']
        tid = self.read_json().get('id')
        with lock:
            if tid is not None:
                sync_achievements(uid)
                if not isinstance(tid, str) or not ach_core.title_of(ach_catalog(), tid):
                    raise ApiError(400, 'Unknown title.')
                if not db.execute('select 1 from achievement_unlocks where user_id = ? and ach_id = ?', (uid, tid)).fetchone():
                    raise ApiError(403, 'Earn this title first.')
            db.execute('update users set title_equipped = ? where id = ?', (tid, uid))
            u = db.execute('select * from users where id = ?', (uid,)).fetchone()
            self.send_json(200, {'title': equipped_title(u)})

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
                sync_achievements(uid)
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
                db.execute('insert or ignore into duels (challenge_id, a_id, b_id, winner, a_god, b_god, rounds, finished_at, a_hash, b_hash) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                           (c['id'], c['from_id'], c['to_id'], victory.get('winner') if winner else None, god(c['deck']), god(c['deck_b'] or '{}'),
                            rounds if isinstance(rounds, int) else None, now, cosmo.deck_hash(c['deck']), json.loads(c['deck_b'] or '{}').get('hash')))
                cosmo.record_online_duel(c['from_id'], c['to_id'], winner)  # torneio digital em andamento: resultado sai do duelo
                if winner:
                    pay_duel_win(winner, c['id'])
                for player in (c['from_id'], c['to_id']):
                    sync_achievements(player)
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

    # ---------- economia (docs/economia.md) ----------
    def economy(self):
        uid = self.require_user()['id']
        with lock:
            welcome(uid)
            state = economy_of(uid)
        state['coin_store'] = flags.on('PAYMENTS_ENABLED') and flags.on('MERCADO_PAGO_ENABLED')  # aba Cosmo Coins na Store
        self.send_json(200, state)

    def store_buy(self):
        uid = self.require_user()['id']
        body = self.read_json()
        if body.get('item') in COSMETIC_KINDS or body.get('item') == 'set':
            return self.buy_cosmetic(uid, body.get('item'), str(body.get('id', '')))
        if body.get('item') != 'booster':
            raise ApiError(400, 'Unknown item.')
        try:
            qty = int(body.get('qty', 1))
        except (TypeError, ValueError):
            qty = 0
        if qty not in BUNDLES:
            raise ApiError(400, 'Unknown bundle.')
        price = bundle_price(qty)
        with lock:
            welcome(uid)
            if coins_of(uid) < price:
                raise ApiError(400, 'Not enough Cosmo Coins.')
            if payments.booster_spendable(db, uid, coins_of(uid)) < price:
                raise ApiError(400, 'Boosters can only be bought with Cosmo Coins earned by playing.')
            add_coins(uid, -price, f'buy:{BOOSTER}x{qty}')
            add_item(uid, BOOSTER, qty)
            state = economy_of(uid)
        self.send_json(200, state)

    def buy_cosmetic(self, uid, kind, cid):
        if cid not in COSMETICS:
            raise ApiError(400, 'Unknown item.')
        with lock:
            kinds = [k for k in SET_KINDS if not owns_cosmetic(uid, k, cid)] if kind == 'set' else [kind]
            if not kinds or kind != 'set' and owns_cosmetic(uid, kind, cid):
                raise ApiError(400, 'You already have this.')
            # set: desconto só com tudo por comprar; com parte já comprada, paga só o que falta
            paid = [k for k in SET_KINDS if cosmetic_price(k, cid)]
            if kind == 'set' and len(paid) < 2:  # Deus: avatar grátis, não há set
                raise ApiError(400, 'Unknown item.')
            price = set_price(cid) if kind == 'set' and kinds == paid else sum(cosmetic_price(k, cid) for k in kinds)
            if coins_of(uid) < price:
                raise ApiError(400, 'Not enough Cosmo Coins.')
            add_coins(uid, -price, f'buy:{kind}:{cid}')
            for k in kinds:
                add_item(uid, f'{k}:{cid}', 1)
            state = economy_of(uid)
        self.send_json(200, state)

    def booster_open(self):
        uid = self.require_user()['id']
        try:
            want = int(self.read_json().get('count', 1))
        except (TypeError, ValueError):
            want = 0
        if not 1 <= want <= MAX_OPEN:
            raise ApiError(400, f'Open 1 to {MAX_OPEN} boosters at a time.')
        with lock:
            welcome(uid)
            n = min(want, item_count(uid, BOOSTER))  # "Open all (N)": abre o que houver, até o pedido
            if n < 1:
                raise ApiError(400, 'You have no boosters to open.')
            add_item(uid, BOOSTER, -n)
            packs = [open_pack(uid) for _ in range(n)]
            bump(uid, 'boosters_opened', n)  # conta desde o Achievements V1.0; antes disso o servidor não guardava
            sync_achievements(uid)
            state = economy_of(uid)
        self.send_json(200, {'cards': [c for p in packs for c in p], 'packs': packs, **state})

    def wildcard_redeem(self):
        """Cria uma cópia da carta escolhida: usa a wildcard da raridade ou, sem ela, paga CRAFT_COINS. Não passa de 3 cópias."""
        uid = self.require_user()['id']
        body = self.read_json()
        cid, pay = str(body.get('card', '')), body.get('pay')  # pay: 'wildcard', 'coins' ou vazio (wildcard antes, se houver)
        if cid not in RARITY:
            raise ApiError(400, 'This card is not in the booster pool.')
        item = WILDCARD[RARITY[cid]]
        with lock:
            welcome(uid)
            row = db.execute('select qty from collection where user_id = ? and card_id = ?', (uid, cid)).fetchone()
            if row and row[0] >= COPY_LIMIT:
                raise ApiError(400, f'You already have {COPY_LIMIT} copies of this card.')
            if pay != 'coins' and item_count(uid, item) > 0:
                add_item(uid, item, -1)
            elif pay == 'wildcard':
                raise ApiError(400, f'You have no {RARITY[cid]} wildcard.')
            elif coins_of(uid) >= CRAFT_COINS[RARITY[cid]]:
                add_coins(uid, -CRAFT_COINS[RARITY[cid]], f'craft:{cid}')
            else:
                raise ApiError(400, 'Not enough Cosmo Coins.')
            gain_card(uid, cid)
            state = economy_of(uid)
        self.send_json(200, {'card': cid, **state})

    # ---------- painel do sistema (/admin/, aberto pelo Star Hill) ----------
    # ---------- Identity & Payment Forge V1.0 (autor, 11/11/2026) ----------
    def read_raw(self):
        size = int(self.headers.get('Content-Length') or 0)
        if size > MAX_BODY:
            raise ApiError(413, 'Request is too large.')
        return self.rfile.read(size) or b'{}'

    def declare_identity(self):  # autodeclaração 18+ (tela de cadastro e de regularização)
        user = self.require_user(gate=False)
        body = self.read_json()
        with lock:
            try:
                identity.self_declare(db, user['id'], body)
            except identity.IdentityError as e:
                raise ApiError(e.status, e.message)
            fresh = db.execute('select * from users where id = ?', (user['id'],)).fetchone()
        self.send_json(200, profile(fresh))

    def accept_legal(self):  # aceite dos Termos e da Privacidade da versão atual
        user = self.require_user(gate=False)
        body = self.read_json()
        if body.get('accept') is not True or body.get('version') != TERMS_VERSION:
            raise ApiError(400, 'Please review and accept the current terms.')
        with lock:
            if not legal_ok(user['id']):
                db.execute('insert into legal_acceptances (user_id, document_version, accepted_at, source) values (?, ?, ?, ?)',
                           (user['id'], TERMS_VERSION, int(time.time()), 'reacceptance'))
            fresh = db.execute('select * from users where id = ?', (user['id'],)).fetchone()
        self.send_json(200, profile(fresh))

    def payment_packs(self):
        user = self.require_user()
        on = flags.on('PAYMENTS_ENABLED') and flags.on('MERCADO_PAGO_ENABLED')
        with lock:
            adult = identity.adult(db, user['id'], require_provider=flags.on('IDENTITY_VERIFICATION_ENABLED'))
            out = {'enabled': on, 'adult': adult, 'terms_accepted': legal_ok(user['id']), 'terms_version': TERMS_VERSION,
                   'held': bool(db.execute('select 1 from payment_holds where user_id = ?', (user['id'],)).fetchone()),
                   'packs': [{k: p[k] for k in ('id', 'name', 'price_cents', 'coins')} for p in ECO['coin_packs']]}
        self.send_json(200, out)

    def payment_order(self):
        user = self.require_user()
        if not flags.on('PAYMENTS_ENABLED'):
            raise ApiError(503, 'Purchases are not available yet.')
        body = self.read_json()
        # shortcut: a chamada ao provedor roda dentro do lock global (bloqueia o servidor ~1 s); separar quando houver volume
        with lock:
            if not identity.adult(db, user['id'], require_provider=flags.on('IDENTITY_VERIFICATION_ENABLED')):
                raise ApiError(403, 'Confirm that you are 18 or older before buying.')
            if not legal_ok(user['id']):
                raise ApiError(403, 'Please accept the current terms before buying.')
            try:
                out = payments.create_order(db, user['id'], str(body.get('pack', '')), ECO['coin_packs'],
                                            str(body.get('provider') or 'mercadopago'), PUBLIC_URL or ORIGIN)
            except payments.PaymentError as e:
                raise ApiError(e.status, e.message)
        self.send_json(201, out)

    def payment_order_status(self, order_id):
        user = self.require_user()
        with lock:
            row = db.execute('select * from payment_orders where id = ? and user_id = ?', (order_id, user['id'])).fetchone()
            if not row:
                raise ApiError(404, 'Order not found.')
            out = payments.order_view(row) | {'coins_balance': coins_of(user['id'])}
        self.send_json(200, out)

    def payment_history(self):
        user = self.require_user()
        with lock:
            out = {'orders': payments.my_orders(db, user['id'], coins_of), 'withdraw_days': payments.WITHDRAW_DAYS}
        self.send_json(200, out)

    def payment_withdraw(self, order_id):  # arrependimento em 7 dias, pacote intacto (autor, 11/11/2026)
        user = self.require_user()
        with lock:
            try:
                status = payments.withdraw(db, order_id, user['id'], add_coins, coins_of)
            except payments.PaymentError as e:
                raise ApiError(e.status, e.message)
            out = {'status': status, 'coins': coins_of(user['id'])}
        self.send_json(200, out)

    def payment_webhook(self, provider):
        raw = self.read_raw()
        try:
            body = json.loads(raw)
        except ValueError:
            body = {}
        headers = {k.lower(): v for k, v in self.headers.items()}
        query = {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}
        try:
            with lock:
                result = payments.webhook(db, provider, headers, query, body if isinstance(body, dict) else {}, add_coins, coins_of)
        except payments.PaymentError as e:
            # 401/404: recusa; erro do provedor (502): 500 para o Mercado Pago reenviar
            return self.send_json(e.status if e.status in (401, 404) else 500, {'error': e.message})
        self.send_json(200, {'ok': True, 'result': result})

    def identity_callback(self, provider):
        if not flags.on('IDENTITY_VERIFICATION_ENABLED') or provider not in identity.PROVIDERS:
            raise ApiError(404, 'Not found.')
        raw = self.read_raw()
        try:
            result = identity.PROVIDERS[provider].parse_callback(dict(self.headers.items()), raw)
            with lock:
                state = identity.provider_result(db, provider, result)
        except identity.IdentityError as e:
            raise ApiError(e.status, e.message)
        except (ValueError, KeyError, TypeError):
            raise ApiError(400, 'Bad provider payload.')
        self.send_json(200, {'ok': True, 'state': state})

    def admin_compliance(self, method, path, admin):
        """IDENTITY & COMPLIANCE FORGE no STAR HILL. Nunca devolve CPF completo (nem é guardado). Toda ação fica em admin_audit."""
        who = admin['email']
        with lock:
            try:
                if method == 'GET' and path == '/api/admin/compliance':
                    return self.send_json(200, {'flags': flags.snapshot(), 'terms_version': TERMS_VERSION, 'payments_env': payments.env(),
                                                'identity': identity.summary(db), 'payments': payments.summary(db),
                                                'packs': ECO['coin_packs'], 'audit': [dict(r) for r in db.execute('select * from admin_audit order by id desc limit 50')]})
                m = re.fullmatch(r'/api/admin/identity/([A-Za-z0-9_]{3,20})', path)
                if m and method == 'POST':
                    u = db.execute('select id from users where username = ?', (m[1].lower(),)).fetchone()
                    if not u:
                        raise ApiError(404, 'No such player.')
                    body = self.read_json()
                    state = identity.admin_action(db, u['id'], str(body.get('action', '')), who, body.get('evidence'))
                    payments.audit(db, who, f'identity:{body.get("action")}', m[1].lower())
                    return self.send_json(200, {'state': state})
                m = re.fullmatch(r'/api/admin/payments/(ord_[0-9a-f]{24})/refund', path)
                if m and method == 'POST':
                    return self.send_json(200, {'status': payments.refund(db, m[1], who, add_coins, coins_of)})
                if method == 'POST' and path == '/api/admin/payments/reconcile':
                    return self.send_json(200, {'changed': payments.reconcile(db, who, add_coins, coins_of)})
                m = re.fullmatch(r'/api/admin/payments/holds/([A-Za-z0-9_]{3,20})', path)
                if m and method == 'DELETE':
                    db.execute('delete from payment_holds where user_id = (select id from users where username = ?)', (m[1].lower(),))
                    payments.audit(db, who, 'release-hold', m[1].lower())
                    return self.send_json(200, {'ok': True})
            except identity.IdentityError as e:
                raise ApiError(e.status, e.message)
            except payments.PaymentError as e:
                raise ApiError(e.status, e.message)
        raise ApiError(404, 'Not found.')

    def admin(self, method, path):
        admin = self.require_admin()
        now = int(time.time())
        if path.startswith('/api/admin/identity') or path.startswith('/api/admin/payments') or path == '/api/admin/compliance':
            return self.admin_compliance(method, path, admin)
        if method == 'POST' and path == '/api/admin/season-awards':  # premiação certificada de temporada encerrada
            with lock:
                awards, created = certify_season(self.read_json().get('season'), now)
            return self.send_json(201 if created else 200, {'awards': awards, 'created': created})
        if method == 'GET' and path == '/api/admin/achievements':  # analytics só com desbloqueios reais
            with lock:
                players = db.execute('select count(*) from users where suspended_at is null').fetchone()[0]
                counts = dict(db.execute('select ach_id, count(*) from achievement_unlocks group by ach_id').fetchall())
                equipped = dict(db.execute('select title_equipped, count(*) from users where title_equipped is not null group by title_equipped').fetchall())
            return self.send_json(200, {'players': players, 'catalog_version': ach_catalog().get('version', 0),
                                        'achievements': [{'id': a['id'], 'title': a['title'], 'rarity': a['rarity'], 'tracking': ach_core.tracking(a['metric']),
                                                          'unlocked': counts.get(a['id'], 0), 'equipped': equipped.get(a['id'], 0)} for a in ach_catalog()['achievements']]})
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
        m = re.fullmatch(r'/api/admin/users/([A-Za-z0-9_]{3,20})/economy', path)
        if m and method == 'POST':  # Star Hill: acesso total, dar/tirar coins (com motivo) e boosters
            body = self.read_json()
            coins, boosters = int(body.get('coins') or 0), int(body.get('boosters') or 0)
            reason = str(body.get('reason') or '').strip()[:120]
            if coins and not reason:
                raise ApiError(400, 'Say why the coins change.')
            with lock:
                user = self.by_username(m[1])
                welcome(user['id'])
                if 'full_access' in body:
                    db.execute('update users set full_access = ? where id = ?', (1 if body['full_access'] else None, user['id']))
                if coins:
                    add_coins(user['id'], coins, f'admin:{reason}')
                if boosters:
                    add_item(user['id'], BOOSTER, max(boosters, -item_count(user['id'], BOOSTER)))
                for rarity, qty in (body.get('wildcards') or {}).items():  # {"Legendary": 1}: dar ou tirar wildcards
                    if rarity in WILDCARD and int(qty):
                        add_item(user['id'], WILDCARD[rarity], max(int(qty), -item_count(user['id'], WILDCARD[rarity])))
                state = economy_of(user['id'])
            return self.send_json(200, {k: state[k] for k in ('coins', 'boosters', 'full_access', 'wildcards')})
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
                       'admin': u['email'] in ADMINS, 'full_access': bool(u['full_access']), 'coins': coins_of(u['id']),
                       'boosters': item_count(u['id'], BOOSTER)} for u in users],
            'reports': [{'id': r['id'], 'reporter': r['reporter'], 'reported': r['reported'], 'at': r['created_at'],
                         'messages': [{'from': names.get(m['from_id'], '?'), 'body': m['body'], 'at': m['created_at']}
                                      for m in reversed(json.loads(r['excerpt']))]} for r in reports]})


def make_server(port=8080, host='0.0.0.0'):
    return ThreadingHTTPServer((host, port), Handler)


if __name__ == '__main__':
    open_db()
    print(f'sanctuary-api on :{os.environ.get("PORT", 8080)}', flush=True)
    make_server(int(os.environ.get('PORT', 8080))).serve_forever()
