"""Backend local do STAR HILL: arquivos conhecidos, revisão de diff e histórico."""
import copy
import difflib
import hashlib
import io
import json
import re
import secrets
import threading
import time
import zipfile
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
CONFIG = 'data/game-settings.json'
RULES = 'docs/guia-do-jogo.md'
SOURCES = 'data/audio-fontes.json'
FX = {'hover', 'click', 'confirm', 'back', 'play', 'impact', 'cosmo', 'turn', 'victory', 'defeat'}
PROPOSALS = {}
LOCK = threading.Lock()


def encoded(value):
    return '/' + quote(value, safe='/')


def revision(text):
    return hashlib.sha256(text.encode()).hexdigest()


def catalog(root=ROOT):
    music = root / 'MUSIC'
    result = []
    if not music.is_dir():
        return result
    for path in sorted(music.rglob('*')):
        if not path.is_file() or path.is_symlink():
            continue
        if path.suffix.lower() not in {'.wav', '.mp3', '.ogg', '.m4a', '.flac'} and path.name != 'battle':
            continue
        if not path.resolve().is_relative_to(music.resolve()):
            continue
        relative = path.relative_to(root).as_posix()
        parts = path.relative_to(music).parts
        name = re.sub(r'-[a-f0-9]{12}$', '', path.stem).rstrip('-')
        if name.startswith('BT_SYS_SE-'):
            name = name.replace('BT_SYS_SE-', 'FX ', 1).replace('--', ' · ')
        result.append({'arquivo': relative, 'url': encoded(relative), 'nome': name,
                       'grupo': 'fx' if len(parts) > 1 and parts[0] == 'fx' else 'musica',
                       'origem': parts[1] if len(parts) > 2 and parts[0] == 'fx' else 'autor',
                       'bytes': path.stat().st_size})
    visual_root = root / 'star-hill/assets'
    if visual_root.is_dir():
        for path in sorted(visual_root.rglob('*')):
            if path.is_file() and not path.is_symlink() and path.suffix.lower() in {'.png', '.webp', '.gif', '.webm', '.mp4'} and path.resolve().is_relative_to(visual_root.resolve()):
                relative = path.relative_to(root).as_posix()
                result.append({'arquivo': relative, 'url': encoded(relative), 'nome': path.stem,
                               'grupo': 'visual', 'origem': 'autor', 'bytes': path.stat().st_size})
    return result


def validate_config(value, root=ROOT):
    if not isinstance(value, dict) or set(value) != {'versao', 'audio', 'visual', 'baralhos', 'apresentacao'} or value['versao'] != 1:
        raise ValueError('Estrutura de configuração inválida.')
    audio, visual = value['audio'], value['visual']
    if not isinstance(audio, dict) or set(audio) != {'menu', 'inicio_batalha', 'playlist', 'volume_musica', 'volume_fx', 'efeitos'}:
        raise ValueError('Configuração de áudio inválida.')
    paths = {item['arquivo'] for item in catalog(root) if item['grupo'] != 'visual'}
    def media(path):
        if not isinstance(path, str) or path not in paths:
            raise ValueError('Selecione um arquivo existente da biblioteca de áudio.')
    media(audio['menu'])
    media(audio['inicio_batalha'])
    if not isinstance(audio['playlist'], list) or not 1 <= len(audio['playlist']) <= 100 or len(set(audio['playlist'])) != len(audio['playlist']):
        raise ValueError('A playlist deve conter de 1 a 100 faixas diferentes.')
    for path in audio['playlist']:
        media(path)
    if audio['inicio_batalha'] in audio['playlist']:
        raise ValueError('A faixa de abertura toca uma vez; retire-a da playlist aleatória.')
    for key in ['volume_musica', 'volume_fx']:
        if type(audio[key]) not in (int, float) or not 0 <= audio[key] <= 1:
            raise ValueError('O volume deve ficar entre 0 e 100%.')
    if not isinstance(audio['efeitos'], dict) or set(audio['efeitos']) != FX:
        raise ValueError('Lista de eventos de FX inválida.')
    for path in audio['efeitos'].values():
        if path is not None:
            media(path)
    if not isinstance(visual, dict) or set(visual) != {'hud', 'cartas', 'token', 'sleeve', 'efeitos'}:
        raise ValueError('Configuração visual inválida.')
    if any(type(visual[k]) not in (int, float) or not 75 <= visual[k] <= 125 for k in ['hud', 'cartas']):
        raise ValueError('As escalas devem ficar entre 75 e 125%.')
    if visual['token'] not in ['constellation', 'solar', 'lunar'] or visual['sleeve'] not in ['sanctuary', 'ocean', 'underworld'] or type(visual['efeitos']) is not bool:
        raise ValueError('Cosmético ou opção visual inválida.')
    if not isinstance(value['baralhos'], list) or len(value['baralhos']) > 30:
        raise ValueError('Lista de baralhos inválida.')
    cards = {c['id']: c for c in json.loads((root / 'data/cards.json').read_text())['cartas']}
    seen = set()
    for deck in value['baralhos']:
        if not isinstance(deck, dict) or set(deck) != {'id', 'nome', 'faccao', 'god_id', 'domain_id', 'main_deck'}:
            raise ValueError('Estrutura de baralho inválida.')
        if not re.fullmatch(r'rulebook2-(athena|poseidon|hades|ares|artemis|neutral)', str(deck['id'])) or deck['id'] in seen:
            raise ValueError('Identificador de baralho inválido ou repetido.')
        seen.add(deck['id'])
        if not isinstance(deck['nome'], str) or not 1 <= len(deck['nome']) <= 100:
            raise ValueError('Nome de baralho inválido.')
        if deck['faccao'] not in ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis', 'Neutral']:
            raise ValueError('Facção inválida.')
        if cards.get(deck['god_id'], {}).get('tipo') != 'God' or cards.get(deck['domain_id'], {}).get('tipo') != 'Domain':
            raise ValueError('God ou Domain inválido.')
        entries, ids, copies = deck['main_deck'], set(), {}
        if not isinstance(entries, list) or not entries:
            raise ValueError('O baralho precisa de cartas.')
        for entry in entries:
            if not isinstance(entry, dict) or set(entry) != {'card_id', 'quantity'} or entry['card_id'] in ids:
                raise ValueError('Entrada de baralho inválida ou repetida.')
            ids.add(entry['card_id'])
            card = cards.get(entry['card_id'])
            if not card or card['tipo'] in ['God', 'Domain'] or type(entry['quantity']) is not int or not 1 <= entry['quantity'] <= 4:
                raise ValueError('Carta ou quantidade inválida no baralho.')
            identity = card.get('identidade_carta') or card['id']
            copies[identity] = copies.get(identity, 0) + entry['quantity']
            if copies[identity] > 4:
                raise ValueError('Mais de 4 cópias da mesma identidade de carta.')
            allowed = {cards[deck['god_id']]['faccao'], cards[deck['domain_id']]['faccao'], 'Neutral'}
            if card['faccao'] not in allowed:
                raise ValueError('A carta não pertence às facções do baralho.')
        if sum(e['quantity'] for e in entries) != 60:
            raise ValueError('O baralho deve ter exatamente 60 cartas.')
    validate_presentation(value['apresentacao'], cards, root)
    return copy.deepcopy(value)


def validate_presentation(value, cards, root):
    schema = json.loads((root / 'data/presentation-schema.json').read_text())
    if not isinstance(value, dict) or set(value) != {'hud', 'telas', 'interacoes', 'cartas', 'pares'}:
        raise ValueError('Estrutura de apresentação inválida.')
    def mapping(obj, allowed):
        if not isinstance(obj, dict) or set(obj) - set(allowed):
            raise ValueError('Componente de apresentação desconhecido.')
    def number(v, low, high):
        if type(v) not in (int, float) or not low <= v <= high:
            raise ValueError('Valor visual fora dos limites.')
    def layout(obj):
        mapping(obj, ['posicionado', 'x', 'y', 'largura', 'altura', 'escala', 'opacidade', 'camada', 'fonte', 'tamanho', 'cor', 'fundo', 'borda', 'visivel', 'texto', 'imagem'])
        for k, v in obj.items():
            if k in ['posicionado', 'visivel']:
                if type(v) is not bool:
                    raise ValueError('Opção visual inválida.')
            elif k in ['x', 'y']:
                number(v, -100, 200)
            elif k in ['largura', 'altura']:
                number(v, 1, 200)
            elif k == 'escala':
                number(v, .25, 3)
            elif k == 'opacidade':
                number(v, 0, 1)
            elif k == 'camada':
                number(v, 0, 100)
            elif k == 'tamanho':
                number(v, 8, 100)
            elif k in ['cor', 'fundo', 'borda']:
                if not isinstance(v, str) or not re.fullmatch(r'#[a-fA-F0-9]{6}([a-fA-F0-9]{2})?', v):
                    raise ValueError('Cor inválida; use hexadecimal.')
            elif k == 'fonte' and v not in ['inherit', 'serif', 'sans-serif', 'monospace']:
                raise ValueError('Fonte inválida.')
            elif k == 'imagem':
                if v not in {a['arquivo'] for a in catalog(root) if a['grupo'] == 'visual' and Path(a['arquivo']).suffix.lower() in {'.png', '.webp', '.gif'}}:
                    raise ValueError('Imagem de fundo não encontrada.')
            elif k == 'texto' and (not isinstance(v, str) or len(v) > 300):
                raise ValueError('Texto de interface inválido.')
    def responsive(obj, components, text_allowed=False):
        mapping(obj, ['desktop', 'mobile'])
        for profile in obj.values():
            mapping(profile, components)
            for k, style in profile.items():
                layout(style)
                if 'texto' in style and (not text_allowed or not components[k].get('texto')):
                    raise ValueError('Este componente contém dados do jogo; seu texto não é substituível.')
    responsive(value['hud'], schema['hud'])
    mapping(value['telas'], schema['telas'])
    for k, obj in value['telas'].items():
        responsive(obj, {'tela': {}, **schema['telas'][k]['elementos']}, True)
    library = catalog(root)
    sounds = {a['arquivo'] for a in library if a['grupo'] != 'visual'}
    visuals = {a['arquivo'] for a in library if a['grupo'] == 'visual'}
    def binding(obj):
        mapping(obj, ['ativo', 'som', 'visual', 'animacao', 'duracao', 'intensidade', 'volume'])
        for k, v in obj.items():
            if k == 'ativo' and type(v) is not bool:
                raise ValueError('Ativação de interação inválida.')
            if k == 'som' and v is not None and v not in sounds:
                raise ValueError('Som de interação não encontrado.')
            if k == 'visual' and v is not None and v not in visuals:
                raise ValueError('FX visual não encontrado.')
            if k == 'animacao' and v not in schema['animacoes']:
                raise ValueError('Animação desconhecida.')
            if k in ['intensidade', 'volume']:
                number(v, 0, 3 if k == 'intensidade' else 1)
            if k == 'duracao':
                number(v, 100, 5000)
    def event_map(obj):
        mapping(obj, schema['eventos'])
        for b in obj.values():
            binding(b)
    event_map(value['interacoes'])
    mapping(value['cartas'], cards)
    for obj in value['cartas'].values():
        event_map(obj)
    if not isinstance(value['pares'], dict) or len(value['pares']) > 3000:
        raise ValueError('Lista de pares inválida.')
    for pair, obj in value['pares'].items():
        ids = pair.split('>')
        if len(ids) != 2 or any(i not in cards for i in ids):
            raise ValueError('Par de cartas inválido.')
        event_map(obj)


def read_document(kind, root=ROOT):
    path = CONFIG if kind == 'config' else RULES if kind == 'regras' else None
    if not path:
        raise ValueError('Documento desconhecido.')
    text = (root / path).read_text(encoding='utf-8')
    return {'arquivo': path, 'revisao': revision(text), 'conteudo': json.loads(text) if kind == 'config' else text}


def preview(body, root=ROOT):
    kind = body.get('tipo')
    current = read_document(kind, root)
    old = (root / current['arquivo']).read_text(encoding='utf-8')
    if current['revisao'] != body.get('revisao'):
        raise ValueError('O arquivo mudou. Recarregue antes de preparar o diff.')
    if kind == 'config':
        value = validate_config(body.get('conteudo'), root)
        text = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    else:
        text = body.get('conteudo')
        if not isinstance(text, str) or not 100 <= len(text) <= 500000:
            raise ValueError('Texto de regras inválido.')
        if not isinstance(body.get('motivo'), str) or not 5 <= len(body['motivo'].strip()) <= 1000:
            raise ValueError('Descreva o motivo da mudança de regra.')
    diff = ''.join(difflib.unified_diff(old.splitlines(True), text.splitlines(True), fromfile=current['arquivo'], tofile=current['arquivo']))
    if not diff:
        return {'diff': '', 'proposta': None}
    token = secrets.token_urlsafe(24)
    with LOCK:
        for key in list(PROPOSALS):
            if PROPOSALS[key]['expira'] < time.time():
                PROPOSALS.pop(key)
        PROPOSALS[token] = {'root': str(root), 'arquivo': current['arquivo'], 'anterior': current['revisao'],
                            'texto': text, 'expira': time.time() + 600, 'tipo': kind, 'motivo': body.get('motivo', '')}
    return {'diff': diff, 'proposta': token}


def apply(body, atomic_write, root=ROOT):
    if body.get('confirmar') is not True:
        raise ValueError('Aprovação explícita do diff é obrigatória.')
    with LOCK:
        proposal = PROPOSALS.get(body.get('proposta'))
        if not proposal or proposal['root'] != str(root) or proposal['expira'] < time.time():
            raise ValueError('Proposta expirada. Gere um novo diff.')
        path = root / proposal['arquivo']
        before = path.read_text(encoding='utf-8')
        if revision(before) != proposal['anterior']:
            raise ValueError('O arquivo mudou depois do diff. Recarregue e revise novamente.')
        if proposal['tipo'] == 'config':
            validate_config(json.loads(proposal['texto']), root)
        stamp = str(time.time_ns())
        backup = root / 'star-hill/historico' / (stamp + '.json')
        atomic_write(backup, (json.dumps({**proposal, 'anterior_texto': before}, ensure_ascii=False, indent=2) + '\n').encode())
        if proposal['tipo'] == 'regras':
            changelog = root / 'docs/CHANGELOG-regras.md'
            entry = '\n\n## ' + time.strftime('%d/%m/%Y') + ' — STAR HILL\n\nMotivo: ' + proposal['motivo'] + '\n\nDiff integral preservado em `star-hill/historico/' + stamp + '.json`. Mudança aprovada no painel; revisar implementação do motor antes de considerar o comportamento atualizado.\n'
            previous_log = changelog.read_bytes()
            atomic_write(changelog, previous_log + entry.encode())
            try:
                atomic_write(path, proposal['texto'].encode())
            except OSError:
                atomic_write(changelog, previous_log)
                raise
        else:
            atomic_write(path, proposal['texto'].encode())
        PROPOSALS.pop(body['proposta'])
    return {'ok': True, 'documento': read_document(proposal['tipo'], root)}


def upload(raw, filename, source, atomic_write, root=ROOT):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', source):
        raise ValueError('Origem inválida.')
    filename = unquote(filename)
    suffix = Path(filename).suffix.lower()
    if suffix in {'.png', '.webp', '.gif', '.webm', '.mp4'}:
        valid = ((suffix == '.png' and raw[:8] == b'\x89PNG\r\n\x1a\n') or
                 (suffix == '.webp' and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP') or
                 (suffix == '.gif' and raw[:6] in {b'GIF87a', b'GIF89a'}) or
                 (suffix == '.webm' and raw[:4] == b'\x1aE\xdf\xa3') or
                 (suffix == '.mp4' and raw[4:8] == b'ftyp'))
        if not valid or len(raw) > 20 * 1024 * 1024:
            raise ValueError('Use PNG, WebP, GIF, WebM ou MP4 válido, até 20 MB.')
        safe = re.sub(r'[^a-zA-Z0-9._-]', '-', Path(filename).stem)[:70] or 'visual'
        target = root / 'star-hill/assets' / (safe + '-' + hashlib.sha256(raw).hexdigest()[:12] + suffix)
        if not target.resolve().is_relative_to((root / 'star-hill/assets').resolve()) or target.is_symlink():
            raise ValueError('Destino visual inválido.')
        if not target.exists():
            atomic_write(target, raw)
        return {'ok': True, 'arquivo': target.relative_to(root).as_posix()}
    if suffix == '.zip':
        try:
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                items = [i for i in archive.infolist() if not i.is_dir() and Path(i.filename).suffix.lower() in {'.wav', '.ogg', '.mp3'}]
                if not 1 <= len(items) <= 1500 or sum(i.file_size for i in items) > 300 * 1024 * 1024 or any(i.file_size > 20 * 1024 * 1024 for i in items):
                    raise ValueError('ZIP vazio ou grande demais: até 1.500 áudios / 300 MB extraídos.')
                contents = [(Path(i.filename).name, archive.read(i)) for i in items]
            # Valida todo o pacote antes de criar o primeiro arquivo.
            for name, content in contents:
                ext = Path(name).suffix.lower()
                if not audio_signature(content, ext):
                    raise ValueError('O ZIP contém um arquivo de áudio inválido: ' + name)
            return {'ok': True, 'arquivos': [upload(content, name, source, atomic_write, root)['arquivo'] for name, content in contents]}
        except zipfile.BadZipFile as error:
            raise ValueError('Arquivo ZIP inválido.') from error
    valid = audio_signature(raw, suffix)
    if not valid or len(raw) > 20 * 1024 * 1024:
        raise ValueError('Use WAV, OGG ou MP3 válido, até 20 MB por arquivo.')
    safe = re.sub(r'[^a-zA-Z0-9._-]', '-', Path(filename).stem)[:70] or 'audio'
    target = root / 'MUSIC/fx' / source / (safe + '-' + hashlib.sha256(raw).hexdigest()[:12] + suffix)
    if not target.resolve().is_relative_to((root / 'MUSIC').resolve()) or target.is_symlink():
        raise ValueError('Destino de áudio inválido.')
    if not target.exists():
        atomic_write(target, raw)
    return {'ok': True, 'arquivo': target.relative_to(root).as_posix()}


def audio_signature(raw, suffix):
    valid = ((suffix == '.wav' and raw[:4] == b'RIFF' and raw[8:12] == b'WAVE') or
             (suffix == '.ogg' and raw[:4] == b'OggS') or
             (suffix == '.mp3' and (raw[:3] == b'ID3' or raw[:1] == b'\xff')))
    return valid


def get(handler, path):
    if path == '/api/star-hill/config':
        handler.reply(200, read_document('config'))
    elif path == '/api/star-hill/regras':
        handler.reply(200, read_document('regras'))
    elif path == '/api/star-hill/assets':
        handler.reply(200, {'arquivos': catalog(), 'fontes': json.loads((ROOT / SOURCES).read_text())})
    else:
        handler.reply(404, {'erro': 'Rota STAR HILL desconhecida.'})


def post(handler, path, raw, atomic_write):
    origin = handler.headers.get('Origin')
    host = handler.headers.get('Host', '')
    if origin != 'http://' + host or urlsplit(origin).hostname not in {'localhost', '127.0.0.1'}:
        return handler.reply(403, {'erro': 'Gravações só são aceitas pela interface local do STAR HILL.'})
    if path == '/api/star-hill/upload':
        result = upload(raw, handler.headers.get('X-File-Name', ''), handler.headers.get('X-Game-Source', 'autor'), atomic_write)
    else:
        if handler.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            raise ValueError('Envie JSON para esta operação.')
        body = json.loads(raw)
        if not isinstance(body, dict):
            raise ValueError('Pedido inválido.')
        if path == '/api/star-hill/preview':
            result = preview(body)
        elif path == '/api/star-hill/apply':
            result = apply(body, atomic_write)
        else:
            return handler.reply(404, {'erro': 'Rota STAR HILL desconhecida.'})
    handler.reply(200, result)
