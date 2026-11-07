"""ARENA FORGE · Produção de arena (autor, 07/11/2026): pipeline CONCEPT → PUBLICATION, Artboard Studio, Asset Breakdown,
materiais da arena, Scene Manifest e pacote ZIP (exportar/reimportar). Projeto piloto: Palácio de Poseidon.

Rotas (servidor local do STAR HILL, só localhost):
  GET  /api/star-hill/producao?id=<projeto>            projeto (cria a semente na primeira vez)
  GET  /api/star-hill/producao/manifesto?id=<projeto>  Scene Manifest derivado do projeto
  GET  /api/star-hill/producao/exportar?id=<projeto>   pacote ZIP
  POST /api/star-hill/producao                         {projeto}  grava (validado)
  POST /api/star-hill/producao/arquivo                 {id, tipo, nome, dados: dataURL}  imagem (png/jpg/webp) ou modelo GLB
  POST /api/star-hill/producao/importar                {zip: base64}  reimporta um pacote

Nada aqui publica no jogo oficial: a etapa PUBLICATION só registra a decisão; o deploy é separado e depende do autor.
"""
import base64
import hashlib
import io
import json
import os
import re
import struct
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import parse_qs, urlsplit

DATA = 'data/arena-production'
FILES = 'playtest/assets/arena-production'
STAGES = ['concept', 'art-direction', 'master-artboard', 'asset-breakdown', 'asset-production', 'material-production',
          'scene-assembly', 'visual-matching', 'gameplay-preview', 'validation', 'approval', 'publication']
STATUS = ['pendente', 'em andamento', 'concluida', 'aprovada']
CATEGORIES = ['architecture', 'monuments', 'terrain', 'battlefield', 'atmosphere', 'lighting']
ASSET_STATES = ['reference', 'concept', 'model', 'uv', 'texture', 'material', 'preview', 'approval']
FILE_KINDS = {'artboard': 'artboards', 'referencia': 'references', 'asset': 'assets', 'thumb': 'thumbnails', 'template': 'artboards'}
MAX_FILE = 30 << 20
ID_RE = re.compile(r'^[a-z0-9][a-z0-9-]{1,60}$')
PACKAGE_DIRS = ['artboards', 'references', 'assets', 'materials', 'textures', 'shaders', 'animations', 'thumbnails', 'manifests', 'reports']


def root_of(default):
    return Path(os.environ['ARENA_PRODUCTION_DIR']) if os.environ.get('ARENA_PRODUCTION_DIR') else Path(default)


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def kind_of(data):
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if data[:3] == b'\xff\xd8\xff':
        return 'jpg'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    if data[:4] == b'glTF' and len(data) >= 20 and struct.unpack('<I', data[4:8])[0] == 2 and struct.unpack('<I', data[8:12])[0] == len(data):
        return 'glb'  # glTF binário 2.0 com tamanho declarado igual ao arquivo
    return None


def image_size(data):
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', data[16:24])
    if data[:4] == b'RIFF' and data[12:16] == b'VP8X':
        return 1 + int.from_bytes(data[24:27], 'little'), 1 + int.from_bytes(data[27:30], 'little')
    i = 2
    while data[:2] == b'\xff\xd8' and i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        if data[i + 1] in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', data[i + 5:i + 9])
            return w, h
        i += 2 + struct.unpack('>H', data[i + 2:i + 4])[0]
    return None, None


# ---------------- Semente do projeto piloto ----------------

def _asset(aid, nome, cat, pos, dims, material, deps=(), estado='model', lod='procedural', nota=''):
    return {'id': aid, 'nome': nome, 'categoria': cat, 'referencia': None, 'dimensoes': dims, 'posicao': pos, 'escala': [1, 1, 1],
            'material': material, 'lod': lod, 'estado': estado, 'dependencias': list(deps), 'glb': None, 'thumb': None, 'versao': 1, 'nota': nota}


def seed(pid='poseidon-palace'):
    """Assets reais do Palácio de Poseidon como estão em arena-forge/poseidon-palace.js (coordenadas da cena, metros)."""
    A = [
        _asset('palace', 'Palace', 'architecture', [0, 0, -42], [52, 23.4, 30], 'POSEIDON_WHITE_MARBLE', estado='material', nota='Conjunto: pórtico, alas, cela.'),
        _asset('main-portico', 'Main Portico', 'architecture', [0, 4.41, -40.2], [18.9, 14.6, 8], 'POSEIDON_WHITE_MARBLE', ['palace']),
        _asset('pediment', 'Pediment', 'architecture', [0, 19, -40.2], [18.9, 3.15, 8], 'POSEIDON_WHITE_MARBLE', ['main-portico'], 'material', nota='Prisma triangular simétrico, tímpano recuado.'),
        _asset('staircase', 'Staircase', 'architecture', [0, 0, -27.5], [12, 4.41, 17.8], 'POSEIDON_WHITE_MARBLE', ['palace'], 'material', nota='14 degraus de 0,29 m.'),
        _asset('columns', 'Columns', 'architecture', [0, 4.41, -40.2], [0.62, 12.2, 0.62], 'POSEIDON_LIMESTONE', ['main-portico'], 'material', 'instanced', '8 no pórtico + 10 nas alas (InstancedMesh).'),
        _asset('capitals', 'Capitals', 'architecture', [0, 16.6, -40.2], [1.7, 0.9, 1.7], 'POSEIDON_WHITE_MARBLE', ['columns'], 'model', 'instanced'),
        _asset('entablature', 'Entablature', 'architecture', [0, 16.6, -40.2], [18.9, 2.38, 8], 'POSEIDON_WHITE_MARBLE', ['main-portico']),
        _asset('terrace', 'Terrace', 'architecture', [0, 0, -41.6], [18.4, 4.41, 10.5], 'POSEIDON_BLUE_MARBLE', ['palace']),
        _asset('wall', 'Wall', 'architecture', [0, 4.41, -46.5], [16.6, 12.2, 1.4], 'POSEIDON_WHITE_MARBLE', ['palace']),
        _asset('balustrade', 'Balustrade', 'architecture', [0, 0, -18], [12, 1.2, 0.4], 'POSEIDON_WHITE_MARBLE', ['staircase'], 'reference', nota='Ainda não existe na cena.'),
        _asset('main-pillar', 'Main Pillar', 'monuments', [0, 0, -74], [10.6, 91, 10.6], 'POSEIDON_BLUE_MARBLE', estado='material', nota='Grande Pilar Principal com anéis de ouro.'),
        _asset('distant-pillars', 'Distant Pillars', 'monuments', [0, 0, -78], [3, 47, 3], 'POSEIDON_BLUE_MARBLE', ['main-pillar'], 'model', nota='6 pilares (36..62 m para cada lado).'),
        _asset('statues', 'Statues', 'monuments', [0, 0, -30], [2, 5, 2], 'POSEIDON_WHITE_MARBLE', estado='reference', lod='glb', nota='Escultura humana: precisa de GLB modelado fora; não será feita com primitivas.'),
        _asset('trident', 'Trident', 'monuments', [0, 5.9, -45.55], [2.8, 9.2, 0.3], 'POSEIDON_ANCIENT_GOLD', ['wall'], 'material'),
        _asset('pedestals', 'Pedestals', 'monuments', [0, 0, -18.3], [2.2, 2.4, 2.2], 'POSEIDON_LIMESTONE', ['staircase']),
        _asset('rocks', 'Rocks', 'terrain', [0, 0, -16], [60, 4, 30], 'POSEIDON_SEABED_ROCK', estado='model', nota='Primitivas suavizadas; candidatas a GLB.'),
        _asset('cliffs', 'Cliffs', 'terrain', [0, 0, -120], [300, 60, 40], 'POSEIDON_SEABED_ROCK', estado='reference', nota='Ainda não existe na cena.'),
        _asset('stone-paths', 'Stone Paths', 'terrain', [0, 0, -26.6], [34, 0.26, 14], 'POSEIDON_BLUE_MARBLE', ['staircase']),
        _asset('ground', 'Ground', 'terrain', [0, 0, 0], [200, 0, 200], 'POSEIDON_CEREMONIAL_FLOOR', estado='concept'),
        _asset('circular-platform', 'Circular Platform', 'battlefield', [0, 0, 0], [32, 0, 32], 'POSEIDON_CEREMONIAL_FLOOR', estado='material', lod='protegido', nota='Zona competitiva: geometria protegida (scene.js).'),
        _asset('marble-tiles', 'Marble Tiles', 'battlefield', [0, 0, 0], [32, 0, 32], 'POSEIDON_CEREMONIAL_FLOOR', ['circular-platform'], 'texture', 'protegido'),
        _asset('decorative-rings', 'Decorative Rings', 'battlefield', [0, 0, 0], [29.8, 0, 29.8], 'POSEIDON_ANCIENT_GOLD', ['circular-platform'], 'material', 'protegido'),
        _asset('gold-inlays', 'Gold Inlays', 'battlefield', [0, 0, 0], [32, 0, 32], 'POSEIDON_ANCIENT_GOLD', ['circular-platform'], 'reference', 'protegido'),
        _asset('ocean-ceiling', 'Ocean Ceiling', 'atmosphere', [0, 37, -55], [280, 0, 280], 'POSEIDON_OCEAN_CEILING', estado='material'),
        _asset('fog', 'Fog', 'atmosphere', [0, 0, 0], [0, 0, 0], None, estado='material', nota='Névoa perto (abertura) e longe (fundo).'),
        _asset('light-shafts', 'Light Shafts', 'atmosphere', [0, 18, -60], [8, 36, 8], None, estado='material', nota='0/3/5/6 feixes por perfil.'),
        _asset('caustics', 'Caustics', 'atmosphere', [0, 0, 0], [0, 0, 0], None, estado='material', nota='No shader do mármore.'),
        _asset('particles', 'Particles', 'atmosphere', [0, 0, 0], [0, 0, 0], None, estado='material', nota='Poeira da cena da partida.'),
        _asset('light-key', 'Key', 'lighting', [-14, 60, -8], [0, 0, 0], None, estado='approval'),
        _asset('light-fill', 'Fill', 'lighting', [-10, 22, 70], [0, 0, 0], None, estado='approval'),
        _asset('light-rim', 'Rim', 'lighting', [10, 26, -120], [0, 0, 0], None, estado='approval'),
        _asset('light-ambient', 'Ambient', 'lighting', [0, 0, 0], [0, 0, 0], None, estado='approval', nota='Hemisfério turquesa/abissal.'),
        _asset('light-accent', 'Accent', 'lighting', [0, 8, 30], [0, 0, 0], None, estado='approval', nota='Calor discreto no ouro.'),
    ]
    mat = lambda mid, nome, base, **k: {'id': mid, 'nome': nome, 'baseColor': base, 'roughness': k.get('roughness', .55), 'metalness': k.get('metalness', .02),
                                         'normal': k.get('normal', 1), 'brushTexture': 'shared/painterly.js#brushCanvas', 'pigment': k.get('pigment', .45),
                                         'edge': k.get('edge', .45), 'painterly': k.get('painterly', 1), 'lightResponse': k.get('light', 1), 'caustic': k.get('caustic', 1),
                                         'pbr': k.get('pbr')}
    return {
        'schema': 1, 'id': pid, 'nome': 'POSEIDON — UNDERSEA SANCTUARY / FORTALEZA SUBMARINA', 'faccao': 'Poseidon', 'versao': 1, 'criado_em': now(), 'atualizado_em': now(),
        'direcao': 'PAINTERLY CINEMATIC 3D',
        'etapas': {s: {'status': 'pendente', 'versao': 0, 'historico': []} for s in STAGES},
        'artboards': [], 'referencias': [], 'anotacoes': [], 'assets': A,
        'materiais': [
            mat('POSEIDON_WHITE_MARBLE', 'Mármore branco', '#e3eaee', pbr='polyhaven-marble_01-2k'),
            mat('POSEIDON_BLUE_MARBLE', 'Mármore azulado', '#c7d8e2', roughness=.4, pbr='ambientcg-marble021-2k'),
            mat('POSEIDON_ANCIENT_GOLD', 'Ouro antigo', '#d8b465', roughness=.32, metalness=.62, pigment=.25, caustic=.35, pbr='ambientcg-metal048a-2k'),
            mat('POSEIDON_LIMESTONE', 'Calcário claro', '#f5f4ef', roughness=.42, pbr='ambientcg-travertine009-2k'),
            mat('POSEIDON_SEABED_ROCK', 'Rocha do leito marinho', '#3d6272', roughness=.95, caustic=.8, pbr='polyhaven-rock_face_03-2k'),
            mat('POSEIDON_OCEAN_CEILING', 'Oceano suspenso', '#0f6f8f', roughness=1, caustic=1),
            mat('POSEIDON_CEREMONIAL_FLOOR', 'Piso cerimonial', '#3d8fa6', roughness=.6, caustic=.6),
        ],
        'cena': {'modulo': 'arena-forge/poseidon-palace.js', 'estilo': 'painterly', 'painterly': {'preset': 'poseidon', 'params': None}},
    }


# ---------------- Leitura, validação e gravação ----------------

def path_of(root, pid):
    if not ID_RE.match(pid or ''):
        raise ValueError('Id de projeto inválido.')
    return root_of(root) / DATA / f'{pid}.json'


def read(root, pid):
    p = path_of(root, pid)
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return seed(pid)


def _file_ok(root, rel):
    if rel is None:
        return True
    rel = str(rel).lstrip('/')
    return rel.startswith(FILES + '/') and '..' not in rel and (root_of(root) / rel).is_file()


def validate(root, proj, old=None):
    if not isinstance(proj, dict) or proj.get('schema') != 1 or not ID_RE.match(str(proj.get('id', ''))):
        raise ValueError('Projeto de arena: schema 1 e id válido.')
    if set(proj.get('etapas', {})) != set(STAGES):
        raise ValueError('As 12 etapas do pipeline são obrigatórias.')
    for s, e in proj['etapas'].items():
        if e.get('status') not in STATUS or not isinstance(e.get('historico'), list):
            raise ValueError(f'Etapa {s}: status inválido.')
    if proj['etapas']['publication']['status'] in ('concluida', 'aprovada'):
        raise ValueError('Publicação no jogo oficial não é feita pelo Arena Forge: o deploy é separado e depende do autor.')
    ids = set()
    for a in proj.get('assets', []):
        if not ID_RE.match(str(a.get('id', ''))) or a['id'] in ids:
            raise ValueError(f'Asset com id inválido ou repetido: {a.get("id")}')
        ids.add(a['id'])
        if a.get('categoria') not in CATEGORIES or a.get('estado') not in ASSET_STATES:
            raise ValueError(f'Asset {a["id"]}: categoria ou estado inválido.')
        for k in ('posicao', 'dimensoes', 'escala'):
            v = a.get(k)
            if not (isinstance(v, list) and len(v) == 3 and all(isinstance(x, (int, float)) for x in v)):
                raise ValueError(f'Asset {a["id"]}: {k} precisa de 3 números.')
        for k in ('glb', 'thumb'):
            if not _file_ok(root, a.get(k)):
                raise ValueError(f'Asset {a["id"]}: arquivo {k} não existe.')
        r = a.get('referencia')
        if r is not None and not (isinstance(r, dict) and all(isinstance(r.get(k), (int, float)) and 0 <= r[k] <= 1 for k in 'xywh')):
            raise ValueError(f'Asset {a["id"]}: região do artboard inválida (x, y, w, h entre 0 e 1).')
    for a in proj.get('assets', []):
        for d in a.get('dependencias', []):
            if d not in ids:
                raise ValueError(f'Asset {a["id"]}: dependência ausente {d}.')
    for b in proj.get('artboards', []) + proj.get('referencias', []):
        if not _file_ok(root, b.get('arquivo')):
            raise ValueError(f'Imagem ausente: {b.get("arquivo")}')
    # Artboard aprovado é referência congelada: arquivo e anotações não mudam mais.
    if old:
        before = {b['id']: b for b in old.get('artboards', [])}
        for b in proj.get('artboards', []):
            o = before.get(b['id'])
            if o and o.get('congelado') and (b.get('arquivo') != o.get('arquivo') or b.get('anotacoes') != o.get('anotacoes') or not b.get('congelado')):
                raise ValueError(f'Artboard {b["id"]} está aprovado e congelado: crie uma nova versão.')
        gone = set(before) - {b['id'] for b in proj.get('artboards', [])}
        if any(before[g].get('congelado') for g in gone):
            raise ValueError('Artboard congelado não pode ser apagado.')
    return proj


def write(root, proj, atomic_write):
    p = path_of(root, proj['id'])
    atomic_write(p, (json.dumps(proj, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    p.chmod(0o644)


def save(root, body, atomic_write):
    proj = body.get('projeto')
    old = None
    try:
        old = json.loads(path_of(root, proj.get('id')).read_text(encoding='utf-8'))
    except (FileNotFoundError, AttributeError):
        pass
    validate(root, proj, old)
    proj['atualizado_em'] = now()
    write(root, proj, atomic_write)
    return {'ok': True, 'projeto': proj, 'manifesto': manifest(root, proj)}


def upload(root, body, atomic_write):
    pid, kind, name = str(body.get('id', '')), body.get('tipo'), str(body.get('nome', 'arquivo'))
    path_of(root, pid)
    if kind not in FILE_KINDS:
        raise ValueError('Tipo de arquivo desconhecido.')
    m = re.match(r'^data:[\w/.+-]+;base64,(.+)$', str(body.get('dados', '')), re.S)
    data = base64.b64decode(m.group(1), validate=True) if m else b''
    ext = kind_of(data)
    if not data or len(data) > MAX_FILE:
        raise ValueError('Arquivo vazio ou maior que 30 MB.')
    if ext is None or (kind != 'asset' and ext == 'glb'):
        raise ValueError('Envie PNG, JPG ou WEBP (ou GLB 2.0 para modelos).')
    sha = hashlib.sha256(data).hexdigest()
    slug = re.sub(r'[^a-z0-9-]+', '-', Path(name).stem.lower()).strip('-')[:40] or kind
    rel = f'{FILES}/{pid}/{FILE_KINDS[kind]}/{slug}-{sha[:10]}.{ext}'  # nome versionado pelo conteúdo: nunca sobrescreve outra versão
    dest = root_of(root) / rel
    if not dest.exists():
        atomic_write(dest, data)
        dest.chmod(0o644)
    w, h = image_size(data) if ext != 'glb' else (None, None)
    return {'caminho': '/' + rel, 'sha256': sha, 'bytes': len(data), 'largura': w, 'altura': h, 'formato': ext}


# ---------------- Scene Manifest ----------------

def manifest(root, proj):
    """O mesmo manifesto alimenta o editor e o jogo (scene.js lê painterly/estilo daqui)."""
    approved = next((b for b in proj.get('artboards', []) if b.get('congelado')), None)
    groups = {}
    for a in proj.get('assets', []):
        groups.setdefault(a['categoria'], []).append({k: a[k] for k in ('id', 'nome', 'posicao', 'escala', 'dimensoes', 'material', 'lod', 'estado', 'dependencias', 'glb', 'versao')})
    return {
        'schema': 1, 'id': proj['id'], 'versao': proj.get('versao', 1), 'gerado_em': now(), 'direcao': proj.get('direcao'),
        'camera': {'tipo': 'PerspectiveCamera', 'fov': 42, 'position': [0, 13.5, 13], 'lookAt': [0, 0, -0.6], 'somenteLeitura': True},
        'cena': proj.get('cena'), 'artboard': approved and {'id': approved['id'], 'versao': approved['versao'], 'arquivo': approved['arquivo']},
        'grupos': groups, 'materiais': proj.get('materiais', []),
        'iluminacao': [a['id'] for a in proj.get('assets', []) if a['categoria'] == 'lighting'],
        'efeitos': [a['id'] for a in proj.get('assets', []) if a['categoria'] == 'atmosphere'],
        'perfis': {'phone': {'feixes': 0, 'causticas': 'estaticas'}, 'low': {'feixes': 0, 'causticas': 'estaticas'},
                   'medium': {'feixes': 3, 'causticas': 'leves'}, 'high': {'feixes': 5, 'causticas': 'animadas'}, 'ultra': {'feixes': 6, 'causticas': 'animadas'}},
        'zonasProtegidas': ['circular-platform', 'marble-tiles', 'decorative-rings', 'gold-inlays'],
        'dependencias': sorted({a['glb'] for a in proj.get('assets', []) if a.get('glb')} | {proj['cena']['modulo'], 'shared/painterly.js'}),
    }


# ---------------- Pacote ZIP ----------------

def export_zip(root, pid):
    proj = read(root, pid)
    r = root_of(root)
    buf = io.BytesIO()
    report = {'projeto': pid, 'exportado_em': now(), 'arquivos': [], 'faltando': []}
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('project.json', json.dumps(proj, ensure_ascii=False, indent=2))
        z.writestr('manifests/scene-manifest.json', json.dumps(manifest(root, proj), ensure_ascii=False, indent=2))
        z.writestr('materials/materials.json', json.dumps(proj.get('materiais', []), ensure_ascii=False, indent=2))
        for d in PACKAGE_DIRS:
            z.writestr(f'{d}/', '')
        files = [b['arquivo'] for b in proj.get('artboards', []) + proj.get('referencias', [])]
        files += [a[k] for a in proj.get('assets', []) for k in ('glb', 'thumb') if a.get(k)]
        for rel in files:
            src = r / rel.lstrip('/')
            if not src.is_file():
                report['faltando'].append(rel)
                continue
            folder = rel.lstrip('/').split('/')[4]  # playtest/assets/arena-production/<id>/<pasta>/arquivo
            z.write(src, f'{folder}/{src.name}')
            report['arquivos'].append(f'{folder}/{src.name}')
        for code in ('shared/painterly.js', proj['cena']['modulo']):
            p = Path(__file__).resolve().parents[1] / code
            if p.is_file():
                z.write(p, f'shaders/{p.name}')
        z.writestr('reports/export-report.json', json.dumps(report, ensure_ascii=False, indent=2))
    return buf.getvalue()


def import_zip(root, body, atomic_write):
    try:
        z = zipfile.ZipFile(io.BytesIO(base64.b64decode(str(body.get('zip', '')), validate=True)))
    except (zipfile.BadZipFile, ValueError):
        raise ValueError('Pacote ZIP inválido.')
    names = z.namelist()
    if sum(i.file_size for i in z.infolist()) > 200 << 20:
        raise ValueError('Pacote grande demais (mais de 200 MB descompactado).')
    for n in names:
        p = PurePosixPath(n)
        if p.is_absolute() or '..' in p.parts or (p.parts and p.parts[0] not in PACKAGE_DIRS + ['project.json']):
            raise ValueError(f'Caminho não permitido no pacote: {n}')
    if 'project.json' not in names:
        raise ValueError('O pacote não tem project.json.')
    proj = json.loads(z.read('project.json'))
    pid = proj.get('id')
    path_of(root, pid)
    r = root_of(root)
    restored = []
    for n in names:
        parts = PurePosixPath(n).parts
        if len(parts) != 2 or parts[0] not in ('artboards', 'references', 'assets', 'thumbnails') or not parts[1]:
            continue
        data = z.read(n)
        if kind_of(data) is None:
            raise ValueError(f'{n}: não é imagem nem GLB válido.')
        dest = r / FILES / pid / parts[0] / parts[1]
        atomic_write(dest, data)
        dest.chmod(0o644)
        restored.append(n)
    old = None
    try:
        old = json.loads(path_of(root, pid).read_text(encoding='utf-8'))
    except FileNotFoundError:
        pass
    validate(root, proj, None)  # os arquivos referenciados precisam ter voltado ao lugar; congelados do pacote valem como estão
    write(root, proj, atomic_write)
    return {'ok': True, 'projeto': proj, 'restaurados': restored, 'substituiu': bool(old)}


# ---------------- Rotas ----------------

def get(handler, path, root):
    q = {k: v[0] for k, v in parse_qs(urlsplit(handler.path).query).items()}
    pid = q.get('id', 'poseidon-palace')
    try:
        if path == '/api/star-hill/producao':
            return handler.reply(200, read(root, pid))
        if path == '/api/star-hill/producao/manifesto':
            return handler.reply(200, manifest(root, read(root, pid)))
        if path == '/api/star-hill/producao/exportar':
            data = export_zip(root, pid)
            handler.send_response(200)
            handler.send_header('Content-Type', 'application/zip')
            handler.send_header('Content-Disposition', f'attachment; filename="{pid.upper().replace("-", "_")}_PACKAGE.zip"')
            handler.send_header('Content-Length', str(len(data)))
            handler.end_headers()
            handler.wfile.write(data)
            return
    except ValueError as error:
        return handler.reply(400, {'erro': str(error)})
    return handler.reply(404, {'erro': 'Rota de produção desconhecida.'})


def post(path, body, root, atomic_write):
    if path == '/api/star-hill/producao':
        return save(root, body, atomic_write)
    if path == '/api/star-hill/producao/arquivo':
        return upload(root, body, atomic_write)
    if path == '/api/star-hill/producao/importar':
        return import_zip(root, body, atomic_write)
    raise ValueError('Rota de produção desconhecida.')
