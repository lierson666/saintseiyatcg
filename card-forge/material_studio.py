# ARENA FORGE · Texture Library e Material Studio (autor, 07/11/2026).
# Busca real nas APIs do Poly Haven (api.polyhaven.com) e do ambientCG (ambientcg.com/api/v3), download pelo servidor local
# (sem depender de CORS), validação e instalação em playtest/assets/materials/<fonte>/<id>/<res>/ (fora do Git, ver .gitignore).
# Registro em data/material-library.json (materiais, presets por facção e projetos de material). MATERIAL_DATA_DIR troca a raiz nos testes.
# Segurança: só hosts dos provedores (inclusive nos redirecionamentos), limite de tamanho e tempo, MIME e assinatura dos arquivos,
# md5 do Poly Haven, zip lido em memória sem extrair caminhos (só mapas de imagem conhecidos), nada é executado.
import hashlib
import io
import json
import os
import re
import struct
import threading
import time
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlencode, urlsplit
import urllib.request

LIBRARY = 'data/material-library.json'
ASSETS = 'playtest/assets/materials'
UA = 'SSTCG-ArenaForge/1.0 (Saint Seiya TCG fan project; local editor)'
HOSTS = {'api.polyhaven.com', 'dl.polyhaven.org', 'cdn.polyhaven.com', 'ambientcg.com', 'acg-download.struffelproductions.com', 'f003.backblazeb2.com'}
RES = ['1k', '2k', '4k', '8k']
LIMIT = {'1k': 40 << 20, '2k': 120 << 20, '4k': 400 << 20, '8k': 1200 << 20}  # teto do pacote inteiro por resolução
FILE_LIMIT = 300 << 20
TIMEOUT = 60
LICENSES = {
    'polyhaven': {'tipo': 'CC0-1.0', 'url': 'https://polyhaven.com/license', 'atribuicao': 'Poly Haven (polyhaven.com)'},
    'ambientcg': {'tipo': 'CC0-1.0', 'url': 'https://docs.ambientcg.com/license/', 'atribuicao': 'ambientCG (ambientcg.com)'},
}
MANUAL_LICENSES = {'CC0-1.0', 'CC-BY-4.0'}  # outras licenças não entram sem decisão do autor
SEMANTIC = ['color', 'normal', 'roughness', 'metalness', 'ao', 'arm', 'height', 'opacity', 'emissive']
PH_KEYS = {'Diffuse': 'color', 'nor_gl': 'normal', 'Rough': 'roughness', 'Metal': 'metalness', 'AO': 'ao', 'arm': 'arm', 'Displacement': 'height',
           'Opacity': 'opacity', 'alpha': 'opacity', 'Emission': 'emissive'}
ACG_RE = re.compile(r'_(Color|NormalGL|Roughness|Metalness|AmbientOcclusion|Displacement|Opacity|Emission)\.(jpg|jpeg|png)$', re.I)
ACG_KEYS = {'color': 'color', 'normalgl': 'normal', 'roughness': 'roughness', 'metalness': 'metalness', 'ambientocclusion': 'ao',
            'displacement': 'height', 'opacity': 'opacity', 'emission': 'emissive'}
# Busca em português: só traduz o termo; o resultado vem sempre da API.
PT = {'marmore': 'marble', 'mármore': 'marble', 'pedra': 'stone', 'rocha': 'rock', 'metal': 'metal', 'ouro': 'gold', 'dourado': 'gold', 'concreto': 'concrete',
      'madeira': 'wood', 'chao': 'ground', 'chão': 'ground', 'terra': 'ground', 'piso': 'floor', 'azulejo': 'tiles', 'ladrilho': 'tiles', 'areia': 'sand',
      'tecido': 'fabric', 'antigo': 'ancient', 'antiga': 'ancient', 'ruina': 'ruins', 'ruína': 'ruins', 'ruinas': 'ruins', 'ruínas': 'ruins',
      'musgo': 'moss', 'organico': 'organic', 'orgânico': 'organic', 'ferro': 'iron', 'bronze': 'bronze', 'prata': 'silver', 'obsidiana': 'obsidian',
      'basalto': 'basalt', 'calcario': 'limestone', 'calcário': 'limestone', 'vulcanica': 'volcanic', 'vulcânica': 'volcanic', 'ferrugem': 'rust',
      'oxidado': 'rust', 'escuro': 'dark', 'branco': 'white', 'preto': 'black', 'negra': 'black', 'molhada': 'wet', 'umida': 'wet', 'úmida': 'wet', 'parede': 'wall'}
FILTERS = {'marble': ['marble'], 'stone': ['stone'], 'rock': ['rock'], 'metal': ['metal'], 'gold': ['gold'], 'concrete': ['concrete'], 'wood': ['wood'],
           'ground': ['ground'], 'tiles': ['tiles'], 'sand': ['sand'], 'fabric': ['fabric'], 'ancient': ['ancient'], 'ruins': ['ruins'],
           'organic': ['moss'], 'fantasy': ['marble', 'gold']}  # "fantasy-compatible" = materiais nobres; só filtra, não inventa

JOBS = {}
LOCK = threading.Lock()
_ph_cache = {}


def root_of(default):
    return Path(os.environ['MATERIAL_DATA_DIR']) if os.environ.get('MATERIAL_DATA_DIR') else default


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


class Cancelled(Exception):
    pass


class _Redirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urlsplit(newurl).hostname not in HOSTS:
            raise ValueError(f'Redirecionamento para host não confiável: {urlsplit(newurl).hostname}')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_Redirect)


def http_get(url, limit=FILE_LIMIT, cancel=None, progress=None):
    """GET de um host confiável, com teto de bytes e cancelamento. Devolve (bytes, content-type). Os testes trocam esta função."""
    if urlsplit(url).scheme != 'https' or urlsplit(url).hostname not in HOSTS:
        raise ValueError(f'URL fora dos provedores configurados: {url}')
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with _opener.open(req, timeout=TIMEOUT) as r:
        size = int(r.headers.get('Content-Length') or 0)
        if size > limit:
            raise ValueError(f'Arquivo grande demais ({size >> 20} MB).')
        buf, got = io.BytesIO(), 0
        while True:
            if cancel is not None and cancel.is_set():
                raise Cancelled()
            chunk = r.read(1 << 16)
            if not chunk:
                break
            got += len(chunk)
            if got > limit:
                raise ValueError('Arquivo maior que o limite durante o download.')
            buf.write(chunk)
            if progress:
                progress(len(chunk))
        return buf.getvalue(), r.headers.get('Content-Type', '')


def get_json(url):
    data, ctype = http_get(url, limit=40 << 20)
    if 'json' not in ctype:
        raise ValueError(f'Resposta inesperada do provedor ({ctype}).')
    return json.loads(data)


def kind_of(data):
    if data[:3] == b'\xff\xd8\xff':
        return 'jpg'
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if data[:10] in (b'#?RADIANCE', b'#?RGBE\n\x00\x00\x00'[:10]) or data.startswith(b'#?RGBE'):
        return 'hdr'
    return None


def image_size(data):
    """(largura, altura) de JPEG ou PNG sem decodificar a imagem."""
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', data[16:24])
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', data[i + 5:i + 9])
            return w, h
        i += 2 + struct.unpack('>H', data[i + 2:i + 4])[0]
    return None, None


# ---------------- Biblioteca ----------------

def empty():
    return {'schema': 1, 'materiais': [], 'presets': {}, 'projetos': {}}


def read(root):
    root = root_of(root)
    try:
        return json.loads((root / LIBRARY).read_text(encoding='utf-8'))
    except FileNotFoundError:
        return empty()


def write_lib(root, lib, atomic_write):
    root = root_of(root)
    atomic_write(root / LIBRARY, (json.dumps(lib, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    (root / LIBRARY).chmod(0o644)


def validate_lib(lib):
    if not isinstance(lib, dict) or lib.get('schema') != 1 or not isinstance(lib.get('materiais'), list):
        raise ValueError('Biblioteca de materiais: schema 1 esperado.')
    ids = {m['id'] for m in lib['materiais']}
    for faction, items in (lib.get('presets') or {}).items():
        for it in items:
            for k in ('material', 'substituto'):
                if it.get(k) and it[k] not in ids:
                    raise ValueError(f'Preset {faction}/{it.get("nome")}: material {it[k]} não está instalado.')
    for name, proj in (lib.get('projetos') or {}).items():
        if not re.match(r'^[a-z0-9-]{2,60}$', name):
            raise ValueError(f'Projeto com nome inválido: {name}')
        for slot, ap in [*(proj.get('slots') or {}).items(), *(proj.get('objetos') or {}).items()]:
            if ap.get('material') and ap['material'] not in ids:
                raise ValueError(f'Projeto {name}, {slot}: material {ap["material"]} não está instalado.')
            for k, v in (ap.get('params') or {}).items():
                if not isinstance(v, (int, float, bool, str)) or isinstance(v, str) and len(v) > 20:
                    raise ValueError(f'Projeto {name}, {slot}: parâmetro {k} inválido.')


def save_lib(root, body, atomic_write):
    """Grava presets e projetos. Os materiais em si só mudam por instalar/remover (o cliente não inventa arquivo instalado)."""
    lib = body.get('biblioteca')
    current = read(root)
    if not isinstance(lib, dict):
        raise ValueError('Envie {biblioteca}.')
    lib = {**current, 'presets': lib.get('presets', {}), 'projetos': lib.get('projetos', {})}
    validate_lib(lib)
    write_lib(root, lib, atomic_write)
    return {'ok': True, 'biblioteca': lib}


def installed(lib, fonte, pid, res):
    return next((m for m in lib['materiais'] if m['fonte'] == fonte and m['provider_id'] == pid and m['resolucao'] == res), None)


def intact(root, m):
    root = root_of(root)
    for f in m['arquivos'].values():
        p = root / f['caminho'].lstrip('/')
        if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest() != f['sha256']:
            return False
    return True


# ---------------- Busca ----------------

def terms(q):
    words = [w for w in re.split(r'[\s,]+', (q or '').strip().lower()) if w]
    return [PT.get(w, w) for w in words]


def ph_assets(tipo='textures'):
    hit = _ph_cache.get(tipo)
    if hit and time.time() - hit[0] < 3600:
        return hit[1]
    data = get_json(f'https://api.polyhaven.com/assets?t={tipo}')
    _ph_cache[tipo] = (time.time(), data)
    return data


def search(root, params):
    fonte = params.get('fonte', 'todas')
    tipo = 'hdris' if params.get('tipo') == 'hdri' else 'textures'
    words = terms(params.get('q'))
    filtro = FILTERS.get(params.get('filtro') or '', [])
    offset, limit = max(0, int(params.get('offset', 0))), min(48, max(1, int(params.get('limit', 24))))
    lib = read(root)
    have = {(m['fonte'], m['provider_id']) for m in lib['materiais']}
    out, totals, erros = [], {}, {}
    if fonte in ('todas', 'polyhaven'):
        try:
            assets = ph_assets(tipo)
            rows = []
            for pid, a in assets.items():
                hay = ' '.join([pid, a.get('name', ''), *a.get('tags', []), *a.get('categories', []), a.get('category', '')]).lower()
                score = sum(w in hay for w in words)
                if (score or not words) and (not filtro or any(f in hay for f in filtro)):
                    rows.append((score, a.get('download_count', 0), pid, a))
            rows.sort(key=lambda r: (-r[0], -r[1]))  # mais termos encontrados primeiro, depois os mais baixados
            totals['polyhaven'] = len(rows)
            for _, _, pid, a in rows[offset:offset + limit]:
                out.append({'fonte': 'polyhaven', 'id': pid, 'nome': a.get('name', pid), 'tipo': 'hdri' if tipo == 'hdris' else 'material',
                            'thumb': f'https://cdn.polyhaven.com/asset_img/thumbs/{quote(pid)}.png?width=256&height=256',
                            'tags': a.get('tags', [])[:8], 'categoria': a.get('category') or ', '.join(a.get('categories', [])[:3]),
                            'resolucoes': [r for r in RES if a.get('max_resolution', [0])[0] >= int(r[:-1]) * 1024 or r == '1k'],
                            'licenca': LICENSES['polyhaven']['tipo'], 'pagina': f'https://polyhaven.com/a/{quote(pid)}',
                            'instalado': ('polyhaven', pid) in have})
        except (OSError, ValueError) as error:
            erros['polyhaven'] = f'Poly Haven indisponível: {error}'
    if fonte in ('todas', 'ambientcg') and tipo == 'textures':
        q = ' '.join(words + filtro)
        try:
            url = 'https://ambientcg.com/api/v3/assets?' + urlencode({'type': 'material', 'q': q, 'limit': limit, 'offset': offset, 'include': 'title,tags,previews,downloads'})
            d = get_json(url)
            totals['ambientcg'] = d.get('totalResults', 0)
            for a in d.get('assets', []):
                prev = next((p['url'] for p in a.get('previews', []) if p.get('type') == 'pbr-one-material-maps'), '')
                m = re.search(r'texture_url=([^&#,]+)', prev)
                res = sorted({x['attributes'].split('-')[0].lower() for x in a.get('downloads', []) if x.get('attributes', '').endswith('-JPG')}, key=lambda r: int(r[:-1]))
                out.append({'fonte': 'ambientcg', 'id': a['id'], 'nome': a.get('title') or a['id'], 'tipo': 'material',
                            'thumb': m.group(1) if m and urlsplit(m.group(1)).hostname in HOSTS else '',
                            'tags': a.get('tags', [])[:8], 'categoria': '', 'resolucoes': res, 'licenca': LICENSES['ambientcg']['tipo'],
                            'pagina': f'https://ambientcg.com/view?id={quote(a["id"])}', 'instalado': ('ambientcg', a['id']) in have})
        except (OSError, ValueError) as error:
            erros['ambientcg'] = f'ambientCG indisponível: {error}'
    return {'resultados': out, 'totais': totals, 'erros': erros, 'offset': offset, 'limit': limit, 'termos': words + filtro}


# ---------------- Instalação ----------------

def _ph_plan(pid, res, tipo):
    files = get_json(f'https://api.polyhaven.com/files/{quote(pid)}')
    if tipo == 'hdri':
        f = files.get('hdri', {}).get(res, {}).get('hdr')
        if not f:
            raise ValueError(f'HDRI {pid} não tem {res} em .hdr.')
        return [('hdri', f['url'], f.get('size', 0), f.get('md5'))]
    plan = []
    use_arm = 'arm' in files
    for key, sem in PH_KEYS.items():
        if sem in {p[0] for p in plan} or (use_arm and sem in ('roughness', 'metalness', 'ao')):
            continue
        f = files.get(key, {}).get(res, {}).get('jpg') or files.get(key, {}).get(res, {}).get('png')
        if f:
            plan.append((sem, f['url'], f.get('size', 0), f.get('md5')))
    if not any(p[0] == 'color' for p in plan):
        raise ValueError(f'{pid} não tem mapa de cor em {res}.')
    return plan


def _install(root, job, fonte, pid, res, tipo, nome, tags, atomic_write):
    root_dir = root_of(root)
    cancel = job['cancel']

    def tick(n):
        job['bytes'] += n

    files = {}
    if fonte == 'polyhaven':
        plan = _ph_plan(pid, res, tipo)
        job['total'] = sum(p[2] for p in plan)
        if job['total'] > LIMIT[res]:
            raise ValueError(f'Pacote de {job["total"] >> 20} MB passa do limite de {res}.')
        for sem, url, _, md5 in plan:
            data, _ = http_get(url, cancel=cancel, progress=tick)
            if md5 and hashlib.md5(data).hexdigest() != md5:
                raise ValueError(f'{sem}: arquivo corrompido (md5 não confere).')
            files[sem] = data
    elif fonte == 'ambientcg':
        d = get_json('https://ambientcg.com/api/v3/assets?' + urlencode({'id': pid, 'include': 'downloads,title,tags', 'limit': 1}))
        a = next((x for x in d.get('assets', []) if x.get('id') == pid), None)
        dl = a and next((x for x in a.get('downloads', []) if x.get('attributes') == f'{res.upper()}-JPG'), None)
        if not dl:
            raise ValueError(f'{pid} não tem pacote {res.upper()}-JPG.')
        if dl.get('size', 0) > LIMIT[res]:
            raise ValueError(f'Pacote de {dl["size"] >> 20} MB passa do limite de {res}.')
        job['total'] = dl.get('size', 0)
        blob, ctype = http_get(dl['url'], limit=LIMIT[res], cancel=cancel, progress=tick)
        if 'zip' not in ctype and blob[:4] != b'PK\x03\x04':
            raise ValueError('O ambientCG não devolveu um zip.')
        try:
            z = zipfile.ZipFile(io.BytesIO(blob))
        except zipfile.BadZipFile:
            raise ValueError('Zip corrompido.')
        for info in z.infolist():
            m = ACG_RE.search(info.filename)
            if not m or info.file_size > FILE_LIMIT:
                continue  # .blend, .usdc, .mtlx e qualquer outro arquivo ficam de fora; nada é extraído pelo nome do zip
            sem = ACG_KEYS[m.group(1).lower()]
            files[sem] = z.read(info)
        if 'color' not in files:
            raise ValueError('O pacote não tem mapa de cor.')
        nome = nome or (a.get('title') or pid)
        tags = tags or a.get('tags', [])
    else:
        raise ValueError('Fonte desconhecida.')
    if cancel.is_set():
        raise Cancelled()
    base = f'/{ASSETS}/{fonte}/{pid}/{res}'
    arquivos = {}
    for sem, data in files.items():
        ext = kind_of(data)
        if ext is None or (sem == 'hdri') != (ext == 'hdr'):
            raise ValueError(f'{sem}: o arquivo não é uma imagem válida.')
        path = root_dir / base.lstrip('/') / f'{sem}.{ext}'
        atomic_write(path, data)
        path.chmod(0o644)
        w, h = image_size(data) if ext != 'hdr' else (None, None)
        arquivos[sem] = {'caminho': f'{base}/{sem}.{ext}', 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'largura': w, 'altura': h}
    entry = {'id': f'{fonte}-{pid}-{res}'.lower(), 'fonte': fonte, 'provider_id': pid, 'nome': nome or pid, 'tipo': tipo,
             'url_origem': f'https://polyhaven.com/a/{pid}' if fonte == 'polyhaven' else f'https://ambientcg.com/view?id={pid}',
             'licenca': LICENSES[fonte], 'resolucao': res, 'arquivos': arquivos, 'mapas': sorted(arquivos),
             'tamanho': sum(f['bytes'] for f in arquivos.values()), 'instalado_em': now(), 'tags': list(tags or [])[:12], 'versao': 1}
    with LOCK:
        lib = read(root)
        lib['materiais'] = [m for m in lib['materiais'] if m['id'] != entry['id']] + [entry]
        write_lib(root, lib, atomic_write)
    return entry


def start_install(root, body, atomic_write):
    fonte, pid, res = body.get('fonte'), str(body.get('id', '')), str(body.get('resolucao', '2k')).lower()
    tipo = 'hdri' if body.get('tipo') == 'hdri' else 'material'
    if fonte not in LICENSES or not re.match(r'^[A-Za-z0-9_.-]{1,80}$', pid) or res not in RES:
        raise ValueError('Fonte, id ou resolução inválidos.')
    if res == '8k' and not body.get('confirmar_8k'):
        raise ValueError('8K precisa ser escolhido de propósito (confirmar_8k).')
    lib = read(root)
    have = installed(lib, fonte, pid, res)
    if have and intact(root, have):
        return {'estado': 'pronto', 'material': have, 'cache': True}
    job = {'id': uuid.uuid4().hex[:12], 'estado': 'baixando', 'bytes': 0, 'total': 0, 'erro': '', 'material': None, 'cancel': threading.Event(),
           'pedido': {'fonte': fonte, 'id': pid, 'resolucao': res, 'tipo': tipo}}
    JOBS[job['id']] = job

    def run():
        try:
            job['material'] = _install(root, job, fonte, pid, res, tipo, body.get('nome'), body.get('tags'), atomic_write)
            job['estado'] = 'pronto'
        except Cancelled:
            job['estado'] = 'cancelado'
        except (OSError, ValueError, KeyError) as error:
            job['estado'], job['erro'] = 'erro', str(error)
    threading.Thread(target=run, daemon=True).start()
    return status(job['id'])


def status(job_id):
    job = JOBS.get(job_id)
    if not job:
        raise ValueError('Trabalho desconhecido.')
    return {k: v for k, v in job.items() if k != 'cancel'}


def cancel(job_id):
    JOBS[job_id]['cancel'].set() if job_id in JOBS else None
    return status(job_id)


def remove(root, body, atomic_write):
    mid = body.get('id')
    with LOCK:
        lib = read(root)
        m = next((x for x in lib['materiais'] if x['id'] == mid), None)
        if not m:
            raise ValueError('Material não instalado.')
        users = [f'{f}/{p.get("nome")}' for f, items in lib.get('presets', {}).items() for p in items if p.get('material') == mid]
        users += [f'{f}/{p.get("nome")} (substituto)' for f, items in lib.get('presets', {}).items() for p in items if p.get('substituto') == mid]
        users += [f'{n}/{s}' for n, pr in lib.get('projetos', {}).items() for k in ('slots', 'objetos') for s, ap in pr.get(k, {}).items() if ap.get('material') == mid]
        if users and not body.get('forcar'):
            raise ValueError(f'Em uso: {", ".join(users[:5])}. Troque o material antes de remover.')
        r = root_of(root)
        base = (r / ASSETS).resolve()
        for f in m['arquivos'].values():
            p = r / f['caminho'].lstrip('/')
            if p.exists() and p.resolve().is_relative_to(base):
                p.unlink()
                d = p.resolve().parent
                while d != base and d.is_relative_to(base) and not any(d.iterdir()):  # apaga pastas que ficaram vazias
                    d.rmdir()
                    d = d.parent
        lib['materiais'] = [x for x in lib['materiais'] if x['id'] != mid]
        write_lib(root, lib, atomic_write)
    return {'ok': True, 'biblioteca': lib}


def manual_import(root, body, atomic_write):
    """Importação manual (cgbookcase, TextureCan, 3DTextures.me e outros sem API): o autor envia os mapas e declara licença e origem."""
    name, lic, src = str(body.get('nome', '')).strip(), body.get('licenca'), str(body.get('url_origem', ''))
    if not name or lic not in MANUAL_LICENSES or not src.startswith('https://'):
        raise ValueError(f'Informe nome, origem https e uma licença permitida: {", ".join(sorted(MANUAL_LICENSES))}.')
    if lic == 'CC-BY-4.0' and not str(body.get('atribuicao', '')).strip():
        raise ValueError('CC BY exige o texto de atribuição.')
    maps = body.get('mapas') or {}
    if 'color' not in maps:
        raise ValueError('Envie pelo menos o mapa de cor.')
    pid = re.sub(r'[^a-z0-9-]+', '-', name.lower()).strip('-')[:60] or 'material'
    base = f'/{ASSETS}/imported/{pid}/manual'
    arquivos, r = {}, root_of(root)
    import base64
    for sem, url in maps.items():
        if sem not in SEMANTIC:
            raise ValueError(f'Mapa desconhecido: {sem}')
        m = re.match(r'^data:image/(jpeg|png);base64,(.+)$', str(url))
        data = base64.b64decode(m.group(2), validate=True) if m else b''
        ext = kind_of(data)
        if ext not in ('jpg', 'png') or len(data) > 40 << 20:
            raise ValueError(f'{sem}: envie JPG ou PNG de até 40 MB.')
        path = r / base.lstrip('/') / f'{sem}.{ext}'
        atomic_write(path, data)
        path.chmod(0o644)
        w, h = image_size(data)
        arquivos[sem] = {'caminho': f'{base}/{sem}.{ext}', 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'largura': w, 'altura': h}
    entry = {'id': f'imported-{pid}', 'fonte': 'imported', 'provider_id': pid, 'nome': name, 'tipo': 'material', 'url_origem': src,
             'licenca': {'tipo': lic, 'url': src, 'atribuicao': str(body.get('atribuicao', '')).strip()}, 'resolucao': 'manual',
             'arquivos': arquivos, 'mapas': sorted(arquivos), 'tamanho': sum(f['bytes'] for f in arquivos.values()), 'instalado_em': now(),
             'tags': [t for t in body.get('tags', []) if isinstance(t, str)][:12], 'versao': 1}
    with LOCK:
        lib = read(root)
        lib['materiais'] = [m for m in lib['materiais'] if m['id'] != entry['id']] + [entry]
        write_lib(root, lib, atomic_write)
    return {'ok': True, 'material': entry}


def get(handler, path, root):
    from urllib.parse import parse_qs
    query = {k: v[0] for k, v in parse_qs(urlsplit(handler.path).query).items()}
    if path == '/api/star-hill/materiais':
        return handler.reply(200, read(root))
    if path == '/api/star-hill/materiais/busca':
        return handler.reply(200, search(root, query))
    if path.startswith('/api/star-hill/materiais/trabalhos/'):
        return handler.reply(200, status(path.rsplit('/', 1)[1]))
    return handler.reply(404, {'erro': 'Rota de materiais desconhecida.'})


def post(path, body, root, atomic_write):
    if path == '/api/star-hill/materiais':
        return save_lib(root, body, atomic_write)
    if path == '/api/star-hill/materiais/instalar':
        return start_install(root, body, atomic_write)
    if path == '/api/star-hill/materiais/cancelar':
        return cancel(str(body.get('trabalho')))
    if path == '/api/star-hill/materiais/remover':
        return remove(root, body, atomic_write)
    if path == '/api/star-hill/materiais/importar':
        return manual_import(root, body, atomic_write)
    raise ValueError('Rota de materiais desconhecida.')
