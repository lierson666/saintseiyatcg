"""Teste da ponte NEXUS do STAR HILL (card-forge/nexus_proxy.py) contra um sanctuary-api local. Nunca toca na produção.

Sobe um sanctuary-api com banco temporário, o tools/serve-dev.py na frente e um card-forge/serve.py de teste, todos em
portas livres, e confere: destino fora da lista, Origin de fora, login, criar, editar, publicar sem e com confirmação,
editar post no ar, despublicar e sair.
Rodar da raiz:  python3 tools/test-star-hill-nexus.py   (precisa de python3.12 em ~/.local/bin ou PYTHON312)
"""
import json, os, shutil, socket, subprocess, sys, tempfile, time, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY312 = os.environ.get('PYTHON312') or shutil.which('python3.12') or str(Path.home() / '.local/bin/python3.12')


def free():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def req(url, body=None, origin=None, method=None):
    r = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), method=method)
    r.add_header('Content-Type', 'application/json')
    if origin:
        r.add_header('Origin', origin)
    try:
        with urllib.request.urlopen(r, timeout=20) as res:
            return res.status, json.loads(res.read() or b'{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')


def wait(url):
    for _ in range(80):
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except urllib.error.HTTPError:
            return
        except OSError:
            time.sleep(0.25)
    raise SystemExit(f'servidor não subiu: {url}')


def main():
    tmp = Path(tempfile.mkdtemp(prefix='nexus-test-'))
    api, site, hill = free(), free(), free()
    site_url, hill_url = f'http://localhost:{site}', f'http://localhost:{hill}'
    env = {**os.environ, 'SANCTUARY_DB': str(tmp / 'main.db'), 'SANCTUARY_INSECURE_COOKIE': '1', 'SANCTUARY_ORIGIN': site_url,
           'SANCTUARY_INVITES': 'dev@example.com,bia@example.com', 'SANCTUARY_ADMINS': 'dev@example.com',
           'COSMO_REGISTRY': str(ROOT / 'data/registry'), 'PORT': str(api)}
    log = open(tmp / 'log.txt', 'w')
    procs = [subprocess.Popen([PY312, '-u', 'sanctuary-api/server.py'], cwd=ROOT, env=env, stdout=log, stderr=log),
             subprocess.Popen([sys.executable, '-u', 'tools/serve-dev.py', str(site)], cwd=ROOT, env={**os.environ, 'SANCTUARY_URL': f'http://127.0.0.1:{api}'}, stdout=log, stderr=log),
             subprocess.Popen([sys.executable, '-u', 'card-forge/serve.py'], cwd=ROOT, env={**os.environ, 'PORT': str(hill)}, stdout=log, stderr=log)]
    try:
        wait(f'http://127.0.0.1:{api}/api/platform/content'); wait(site_url + '/'); wait(hill_url + '/star-hill/')
        for email, name in (('dev@example.com', 'DevNexus'), ('bia@example.com', 'BiaLeitora')):
            s, out = req(site_url + '/api/auth/register', {'email': email, 'password': 'senha-de-teste-123', 'username': name, 'name': f'{name} Teste', 'country': 'BR', 'accept_terms': True}, site_url)
            assert s in (200, 201), (s, out)
        S = hill_url + '/api/star-hill/nexus/'
        post = lambda path, body, origin=hill_url: req(S + path, body, origin)

        s, out = post('alvo', {'alvo': 'https://evil.example'}); assert s == 400, out
        s, out = post('alvo', {'alvo': site_url}, origin='https://evil.example'); assert s == 403, out
        s, out = post('alvo', {'alvo': site_url}); assert s == 200 and out['host'] == f'localhost:{site}' and not out['conectado'], out
        s, out = req(S + 'posts'); assert s == 401, out
        s, out = post('entrar', {'email': 'dev@example.com', 'senha': 'errada'}); assert s == 400, out

        # conta sem papel de publisher entra, mas não cria
        s, out = post('entrar', {'email': 'bia@example.com', 'senha': 'senha-de-teste-123'}); assert s == 200 and out['conectado'] and out['papeis'] == [], out
        s, out = post('salvar', {'kind': 'news', 'slug': 'nao-pode', 'title': 'X', 'body': 'Y', 'lang': 'pt'}); assert s == 400 and 'permission' in out['erro'], out
        post('sair', {})

        s, out = post('entrar', {'email': 'dev@example.com', 'senha': 'senha-de-teste-123'}); assert s == 200 and 'developer' in out['papeis'], out
        s, out = post('salvar', {'kind': 'news', 'slug': 'teste-nexus', 'title': 'Teste Nexus', 'body': 'Corpo.', 'lang': 'pt', 'category': 'Patch', 'meta': {'cover': 'god-hades'}})
        assert s == 200 and out['status'] == 'draft', out
        cid = out['id']
        s, out = post('salvar', {'id': cid, 'slug': 'teste-nexus', 'title': 'Teste Nexus 2', 'body': 'Corpo 2.', 'meta': {'cover': 'god-hades'}}); assert s == 200, out
        s, out = req(S + 'posts'); assert s == 200 and out['items'][0]['title'] == 'Teste Nexus 2' and out['items'][0]['status'] == 'draft', out

        s, out = post('publicar', {'id': cid}); assert s == 400, out  # sem confirmação, não sai do Mac
        s, out = post('publicar', {'id': cid, 'confirmar': 'saintseiyatcg.com'}); assert s == 400, out  # confirmação de outro destino
        s, out = post('publicar', {'id': cid, 'confirmar': f'localhost:{site}'}); assert s == 200 and out['status'] == 'published', out
        s, pub = req(site_url + '/api/platform/content?kind=news,guide,lesson'); assert [a['slug'] for a in pub['items']] == ['teste-nexus'], pub

        s, out = post('salvar', {'id': cid, 'slug': 'teste-nexus', 'title': 'No ar', 'body': 'Corpo 3.'}); assert s == 400 and 'no ar' in out['erro'], out
        s, out = post('salvar', {'id': cid, 'slug': 'teste-nexus', 'title': 'No ar', 'body': 'Corpo 3.', 'confirmar': f'localhost:{site}'}); assert s == 200, out
        s, out = post('despublicar', {'id': cid}); assert s == 400, out
        s, out = post('despublicar', {'id': cid, 'confirmar': f'localhost:{site}'}); assert s == 200 and out['status'] == 'draft', out
        s, pub = req(site_url + '/api/platform/content'); assert pub['items'] == [], pub

        # home do jogo: até 5 por idioma (placement 'home'); o 6º é recusado; EN conta à parte
        ids = [post('salvar', {'kind': 'news', 'slug': f'home-{i}', 'title': f'Home {i}', 'body': 'x', 'lang': 'pt', 'placement': 'home'})[1]['id'] for i in range(5)]
        s, out = post('salvar', {'kind': 'news', 'slug': 'home-6', 'title': 'Home 6', 'body': 'x', 'lang': 'pt', 'placement': 'home'}); assert s == 400 and '5' in out['erro'], out
        s, out = post('salvar', {'id': cid, 'slug': 'teste-nexus', 'placement': 'home'}); assert s == 400, out  # teste-nexus é PT
        s, out = post('salvar', {'kind': 'news', 'slug': 'home-en', 'title': 'Home EN', 'body': 'x', 'lang': 'en', 'placement': 'home'}); assert s == 200, out
        s, out = post('salvar', {'id': ids[0], 'slug': 'home-0', 'placement': None}); assert s == 200, out
        s, out = post('salvar', {'id': cid, 'slug': 'teste-nexus', 'placement': 'home'}); assert s == 200, out
        s, out = req(S + 'posts'); assert sorted(a['slug'] for a in out['items'] if a['placement'] == 'home') == ['home-1', 'home-2', 'home-3', 'home-4', 'home-en', 'teste-nexus'], out
        for a in out['items']:
            if a['slug'] != 'teste-nexus':
                assert post('apagar', {'id': a['id'], 'confirmar': f'localhost:{site}'})[0] == 200
        s, out = post('publicar', {'id': cid, 'confirmar': f'localhost:{site}'}); assert s == 200, out
        s, pub = req(S + 'publicos'); assert [a['slug'] for a in pub['items']] == ['teste-nexus'], pub  # lista pública, sem login
        s, out = post('apagar', {'id': cid}); assert s == 400, out
        s, out = post('apagar', {'id': cid, 'confirmar': f'localhost:{site}'}); assert s == 200, out
        s, out = req(S + 'posts'); assert out['items'] == [], out
        s, pub = req(site_url + '/api/platform/content'); assert pub['items'] == [], pub
        s, out = post('sair', {}); assert s == 200 and not out['conectado'], out
        s, out = req(S + 'posts'); assert s == 401, out
        print('ok: nexus_proxy (destino, origin, login, papel, criar, editar, publicar, editar no ar, despublicar, apagar, home até 5, lista pública, sair)')
    finally:
        for p in procs:
            p.terminate()
        log.close()
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    main()
