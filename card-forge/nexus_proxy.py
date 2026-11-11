"""NEXUS do STAR HILL (11/11/2026): escrever, editar, publicar e despublicar os posts do blog do Cosmo Hub.

O Star Hill é local e a API do Hub fica em outro endereço (saintseiyatcg.com). O navegador não consegue falar
direto com ela (cookie SameSite e checagem de Origin), então este módulo faz a ponte. Regras de segurança:
- Destinos fixos: produção (https://saintseiyatcg.com) ou um servidor de teste no próprio Mac (http://localhost:<porta>).
- A senha passa uma vez para o login e não é guardada. O cookie de sessão fica só na memória deste processo:
  fechar o app apaga a sessão. Nada vai para disco nem para o código.
- Publicar, despublicar, apagar e editar post no ar exigem `confirmar` igual ao endereço do destino; a interface só manda isso depois
  que o autor confirma no próprio botão. Sem isso, o pedido é recusado aqui, antes de sair do Mac.
- As permissões continuam no servidor do Hub (papel publisher ou developer).
Detalhes em docs/star-hill-nexus.md.
"""
import json
import re
import threading
import urllib.error
import urllib.request
from http.cookies import SimpleCookie
from urllib.parse import quote, urlsplit

PROD = 'https://saintseiyatcg.com'
COOKIE = 'sst_session'
LOCAL_RE = re.compile(r'^http://(localhost|127\.0\.0\.1):\d{2,5}$')
FIELDS = ('kind', 'slug', 'title', 'body', 'category', 'lang', 'featured', 'meta', 'placement')
HOME, HOME_MAX = 'home', 5  # placement='home': o autor escolhe o que vai ao banner da home do jogo, até 5 por idioma
TIMEOUT = 20

lock = threading.Lock()
state = {'alvo': PROD, 'sessoes': {}}  # sessoes: alvo -> cookie (só memória)


def normalize(alvo):
    alvo = str(alvo or '').strip().rstrip('/')
    if alvo == PROD or LOCAL_RE.match(alvo):
        return alvo
    raise ValueError('Destino não permitido. Use a produção ou http://localhost:<porta>.')


def host(alvo):
    return urlsplit(alvo).netloc


def call(method, path, body=None, alvo=None, logged=False):
    """Repassa um pedido à API do Hub com o cookie guardado. Devolve (status, json). logged: exige sessão antes de sair do Mac."""
    with lock:
        alvo = alvo or state['alvo']
        cookie = state['sessoes'].get(alvo)
    if logged and not cookie:
        raise PermissionError('Entre com a conta de publisher.')
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(alvo + path, data=data, method=method)
    req.add_header('Accept', 'application/json')
    req.add_header('User-Agent', 'StarHill-Nexus/1.0')
    if data is not None:
        req.add_header('Content-Type', 'application/json')
    if method != 'GET':
        req.add_header('Origin', alvo)  # a API só aceita gravação vinda do próprio site
    if cookie:
        req.add_header('Cookie', f'{COOKIE}={cookie}')
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            raw, status, headers = r.read(), r.status, r.headers
    except urllib.error.HTTPError as e:
        raw, status, headers = e.read(), e.code, e.headers
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise ConnectionError(f'Sem conexão com {host(alvo)}: {getattr(e, "reason", e)}')
    for line in headers.get_all('Set-Cookie') or []:
        morsel = SimpleCookie(line).get(COOKIE)
        if morsel is not None:
            with lock:
                if morsel.value:
                    state['sessoes'][alvo] = morsel.value
                else:
                    state['sessoes'].pop(alvo, None)
    try:
        out = json.loads(raw or b'{}')
    except ValueError:
        out = {'error': f'Resposta inesperada de {host(alvo)} (HTTP {status}).'}
    return status, out


def ok(status, out):
    if status == 401:
        with lock:
            state['sessoes'].pop(state['alvo'], None)
        raise PermissionError('Sessão expirada ou inexistente. Entre de novo.')
    if status >= 400:
        raise ValueError(out.get('error') or out.get('erro') or f'HTTP {status}')
    return out


def estado():
    with lock:
        alvo, conectado = state['alvo'], state['alvo'] in state['sessoes']
    out = {'alvo': alvo, 'producao': alvo == PROD, 'host': host(alvo), 'conectado': conectado, 'usuario': None, 'papeis': []}
    if conectado:
        status, me = call('GET', '/api/me')
        if status == 200:
            _, roles = call('GET', '/api/platform/me')
            out.update(usuario=me.get('username_display') or me.get('username') or me.get('email'),
                       papeis=(['developer'] if roles.get('developer') else []) + list(roles.get('roles') or []))
        else:
            out['conectado'] = False
            with lock:
                state['sessoes'].pop(alvo, None)
    return out


def answer(handler, work):
    # PermissionError e ConnectionError são OSError: tratados aqui para não virar "erro ao gravar arquivo" no serve.py.
    try:
        return handler.reply(200, work())
    except PermissionError as e:
        return handler.reply(401, {'erro': str(e)})
    except ConnectionError as e:
        return handler.reply(502, {'erro': str(e)})
    except (ValueError, KeyError, TypeError) as e:
        return handler.reply(400, {'erro': str(e).strip("'")})


def get(handler, path):
    if path == '/api/star-hill/nexus/estado':
        return answer(handler, estado)
    if path == '/api/star-hill/nexus/publicos':  # sem login: só o que já está no ar
        return answer(handler, lambda: ok(*call('GET', '/api/platform/content')))
    if path == '/api/star-hill/nexus/posts':
        return answer(handler, lambda: ok(*call('GET', '/api/platform/content?all=1', logged=True)))
    return handler.reply(404, {'erro': 'Rota do Nexus desconhecida.'})


def handle_post(handler, path, body):
    return answer(handler, lambda: post(path, body))


def home_limit(lang, cid=None):
    items = ok(*call('GET', '/api/platform/content?all=1', logged=True)).get('items') or []
    if sum(1 for a in items if a.get('placement') == HOME and a.get('lang') == lang and a.get('id') != cid) >= HOME_MAX:
        raise ValueError(f'A home do jogo já tem {HOME_MAX} posts em {lang.upper()}. Tire um antes de colocar outro.')


def post(path, body):
    action = path.rsplit('/', 1)[1]
    if action == 'alvo':
        alvo = normalize(body.get('alvo'))
        with lock:
            state['alvo'] = alvo
        return estado()
    if action == 'entrar':
        email, senha = str(body.get('email') or '').strip(), str(body.get('senha') or '')
        if not email or not senha:
            raise ValueError('Informe e-mail e senha.')
        status, out = call('POST', '/api/auth/login', {'email': email, 'password': senha})
        if status == 401:
            raise ValueError('E-mail ou senha incorretos.')
        ok(status, out)
        return estado()
    if action == 'sair':
        call('POST', '/api/auth/logout', {})
        with lock:
            state['sessoes'].pop(state['alvo'], None)
        return estado()
    if action == 'salvar':
        data = {k: body[k] for k in FIELDS if k in body}
        if 'placement' in data:
            data['placement'] = HOME if data['placement'] == HOME else None
        cid = body.get('id')
        if cid:  # tipo, slug e idioma não mudam depois de criado (a API ignora)
            atual = ok(*call('GET', f'/api/platform/content/{quote(str(body.get("slug") or ""))}', logged=True))
            if atual.get('id') != int(cid):
                raise ValueError('Post não encontrado no destino. Recarregue a lista.')
            with lock:
                alvo = state['alvo']
            if atual.get('status') == 'published' and body.get('confirmar') != host(alvo):  # editar post no ar muda a página na hora
                raise ValueError(f'Este post está no ar. Confirme no botão para atualizar em {host(alvo)}.')
            if data.get('placement') == HOME:
                home_limit(atual['lang'], int(cid))
            for k in ('kind', 'slug', 'lang'):
                data.pop(k, None)
            ok(*call('PATCH', f'/api/platform/content/{int(cid)}', data, logged=True))
            return {'id': int(cid)}
        if data.get('placement') == HOME:
            home_limit(data.get('lang') or 'en')
        return ok(*call('POST', '/api/platform/content', data, logged=True))
    if action == 'apagar':  # irreversível: mesma confirmação do botão
        with lock:
            alvo = state['alvo']
        if body.get('confirmar') != host(alvo):
            raise ValueError(f'Confirme no botão para apagar em {host(alvo)}.')
        return ok(*call('DELETE', f'/api/platform/content/{int(body.get("id"))}', None, logged=True))
    if action in ('publicar', 'despublicar'):
        with lock:
            alvo = state['alvo']
        if body.get('confirmar') != host(alvo):
            raise ValueError(f'Confirme no botão para {"publicar" if action == "publicar" else "despublicar"} em {host(alvo)}.')
        verb = 'publish' if action == 'publicar' else 'unpublish'
        return ok(*call('POST', f'/api/platform/content/{int(body.get("id"))}/{verb}', {}, logged=True))
    raise KeyError('Rota do Nexus desconhecida.')
