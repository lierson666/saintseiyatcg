"""Backend local do STAR HILL: arquivos conhecidos, revisão de diff e histórico."""
import copy
import difflib
import hashlib
import io
import importlib.util
import json
import os
import re
import secrets
import shutil
import subprocess
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
_engine_spec = importlib.util.spec_from_file_location('star_hill_engine_updates', Path(__file__).with_name('engine_updates.py'))
engine_updates = importlib.util.module_from_spec(_engine_spec)
_engine_spec.loader.exec_module(engine_updates)


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
            if path.is_file() and not path.is_symlink() and path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.webm', '.mp4'} and path.resolve().is_relative_to(visual_root.resolve()):
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
    if suffix in {'.png', '.webp', '.gif', '.webm', '.mp4', '.jpg', '.jpeg'}:
        valid = ((suffix == '.png' and raw[:8] == b'\x89PNG\r\n\x1a\n') or
                 (suffix in {'.jpg', '.jpeg'} and raw[:3] == b'\xff\xd8\xff') or
                 (suffix == '.webp' and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP') or
                 (suffix == '.gif' and raw[:6] in {b'GIF87a', b'GIF89a'}) or
                 (suffix == '.webm' and raw[:4] == b'\x1aE\xdf\xa3') or
                 (suffix == '.mp4' and raw[4:8] == b'ftyp'))
        if not valid or len(raw) > 20 * 1024 * 1024:
            raise ValueError('Use PNG, JPG, WebP, GIF, WebM ou MP4 válido, até 20 MB.')
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


# Olympus Arena (autor, 29/10/2026): o jogo lê as cartas do export card-forge/art-web/, não de data/cards.json.
# "Publicar" roda tools/forge-art-web.sh; o status compara as datas do Forge com as do export.
EXPORT = 'card-forge/art-web/cards.json'


def game_status(root=ROOT):
    export = root / EXPORT
    sources = [root / 'data/cards.json', *(root / 'card-forge/projects').glob('*.json'), *(root / 'card-forge/art').glob('*.*')]
    newest = max((f.stat().st_mtime for f in sources if f.exists()), default=0)
    done = export.stat().st_mtime if export.exists() else 0
    return {'publicado_em': done, 'pendente': newest > done}


def publish(root=ROOT):
    with LOCK:
        run = subprocess.run(['/bin/sh', str(root / 'tools/forge-art-web.sh'), str(root)], capture_output=True, text=True, timeout=900)
    if run.returncode:
        raise ValueError('Falha ao publicar as cartas: ' + (run.stderr.strip().splitlines() or ['erro desconhecido'])[-1])
    return {'mensagem': (run.stdout.strip().splitlines() or ['Cartas publicadas.'])[-1], **game_status(root)}


# Jogo online (autor, 30/10/2026): tools/publish-site.sh gera o export e envia ao servidor, inclusive as artes -ref (autor, 01/11/2026).
def publish_site(root=ROOT):
    with LOCK:
        run = subprocess.run(['/bin/sh', str(root / 'tools/publish-site.sh'), str(root)], capture_output=True, text=True, timeout=1800)
    if run.returncode:
        raise ValueError('Falha ao publicar no site: ' + (run.stderr.strip().splitlines() or ['erro desconhecido'])[-1])
    return {'mensagem': (run.stdout.strip().splitlines() or ['Cartas publicadas no site.'])[-1], **game_status(root)}


# Telas do Olympus Arena (autor, 30/10/2026): home, fundos, cores, textos, animações e áudio que o jogo lê em playtest/telas.js.
TELAS = 'data/olympus-telas.json'
ANIM_GROUPS = {'compra', 'conjurar', 'cosmo', 'gatilho', 'ataque', 'dano', 'morte', 'turno', 'ultimate'}
SOUND_EVENTS = {'ultimate', 'clique', 'play', 'voltar', 'turno', 'compra', 'conjurar', 'equipar_armadura', 'equipar_arma', 'cosmo', 'gatilho', 'ataque', 'dano', 'morte', 'vitoria', 'derrota',
                'hover', 'hover_mao', 'hover_base', 'passar_turno', 'receber_turno',
                'declarar_ataque', 'carga', 'impacto', 'impacto_deus', 'dano_deus', 'poder_divino', 'poder_dominio', 'awaken'}
IMAGE_DIRS = ('card-forge/art-web/', 'star-hill/assets/', 'playtest/assets/', 'LOGO/')


def validate_telas(value, root=ROOT):
    def fail(msg):
        raise ValueError(msg)
    def text(v, limit=200, empty=True):
        if not isinstance(v, str) or len(v) > limit or (not empty and not v.strip()):
            fail('Texto inválido ou longo demais.')
    def image(v, optional=False):
        if v is None and optional:
            return
        if not isinstance(v, str) or '-ref.' in v:
            fail('Imagem inválida (artes -ref não podem ir para o jogo).')
        if v.startswith('card:'):
            if not re.fullmatch(r'card:[a-z0-9-]{3,40}', v):
                fail('Carta inválida: ' + v)
            return
        if not v.startswith(IMAGE_DIRS) or '..' in v or not (root / v).is_file():
            fail('Imagem não encontrada: ' + v)
    if not isinstance(value, dict) or value.get('versao') != 1 or set(value) != {'versao', 'home', 'fundos', 'cores', 'textos', 'animacoes', 'audio'}:
        fail('Estrutura das telas inválida.')
    home = value['home']
    if not isinstance(home, dict) or set(home) != {'slides', 'blocos', 'botao_play'}:
        fail('Home inválida.')
    if not isinstance(home['slides'], list) or not 1 <= len(home['slides']) <= 12:
        fail('O carrossel precisa de 1 a 12 slides.')
    for slide in home['slides']:
        if not isinstance(slide, dict) or set(slide) != {'imagem', 'carimbo', 'linha1', 'linha2', 'texto'}:
            fail('Slide inválido.')
        image(slide['imagem'])
        for k in ('carimbo', 'linha1', 'linha2', 'texto'):
            text(slide[k])
    if not isinstance(home['blocos'], list) or len(home['blocos']) > 6:
        fail('A home aceita até 6 blocos.')
    for bloco in home['blocos']:
        if not isinstance(bloco, dict) or set(bloco) != {'imagem', 'rotulo', 'titulo', 'destino'} or bloco['destino'] not in {'decks', 'profile', 'options', 'play'}:
            fail('Bloco inválido.')
        image(bloco['imagem'])
        text(bloco['rotulo']); text(bloco['titulo'])
    text(home['botao_play'], 30, False)
    fundos = value['fundos']
    if not isinstance(fundos, dict) or set(fundos) != {'lobby', 'duelo', 'duelo_opacidade'}:
        fail('Fundos inválidos.')
    image(fundos['lobby'], True); image(fundos['duelo'], True)
    if type(fundos['duelo_opacidade']) not in (int, float) or not 0 <= fundos['duelo_opacidade'] <= 1:
        fail('Opacidade do fundo do duelo deve ficar entre 0 e 100%.')
    cores = value['cores']
    if not isinstance(cores, dict) or set(cores) != {'lobby', 'duelo'}:
        fail('Cores inválidas.')
    for tela in cores.values():
        if not isinstance(tela, dict) or len(tela) > 60:
            fail('Cores inválidas.')
        for k, v in tela.items():
            if not re.fullmatch(r'--[a-z0-9-]{1,40}', k) or not isinstance(v, str) or not re.fullmatch(r'#[0-9a-fA-F]{3,8}|rgba?\([0-9., %]{5,40}\)', v):
                fail('Cor inválida: ' + str(k))
    textos = value['textos']
    if not isinstance(textos, dict) or len(textos) > 500:
        fail('Textos inválidos.')
    for k, v in textos.items():
        text(k, 300, False); text(v, 300)
    anims = value['animacoes']
    if not isinstance(anims, dict) or set(anims) != ANIM_GROUPS:
        fail('Animações inválidas.')
    for a in anims.values():
        if not isinstance(a, dict) or set(a) != {'ligada', 'velocidade'} or type(a['ligada']) is not bool or type(a['velocidade']) not in (int, float) or not 0.25 <= a['velocidade'] <= 3:
            fail('Animação inválida: velocidade entre 0,25× e 3×.')
    audio = value['audio']
    if not isinstance(audio, dict) or set(audio) - {'vozes'} != {'menu', 'inicio_batalha', 'playlist', 'efeitos'}:
        fail('Áudio inválido.')
    paths = {item['arquivo'] for item in catalog(root) if item['grupo'] != 'visual'}
    def media(p, optional=False):
        if (p is None and optional) or p in paths:
            return
        fail('Áudio não encontrado na biblioteca: ' + str(p))
    media(audio['menu']); media(audio['inicio_batalha'])
    if not isinstance(audio['playlist'], list) or not 1 <= len(audio['playlist']) <= 100:
        fail('A playlist da batalha precisa de 1 a 100 faixas.')
    for p in audio['playlist']:
        media(p)
    if not isinstance(audio['efeitos'], dict) or set(audio['efeitos']) - SOUND_EVENTS:  # evento novo ainda sem som pode faltar
        fail('Sons por evento inválidos.')
    for p in audio['efeitos'].values():
        media(p, True)
    for v in audio.get('vozes', []):
        if not isinstance(v, dict) or set(v) != {'nome', 'codigo', 'golpe', 'ultimate'} or not re.fullmatch(r'[A-Z]+', v['nome']) or not re.fullmatch(r'[A-Z0-9]{3}', v['codigo']):
            fail('Voz inválida.')
        if not all(isinstance(i, str) and re.fullmatch(r'\d{3,4}', i) for i in v['golpe'] + v['ultimate']):
            fail('Fala inválida.')
    return copy.deepcopy(value)


CARD_VOICES = 'data/card-voices.json'
VOICE_LINE = re.compile(r'[A-Za-z0-9_]{3,40}/\d{3,4}')
VOICE_LANGS = ('jp', 'pt', 'es')
VOICE_MOMENTS = ('cast', 'entrada', 'declarar', 'golpe', 'strike', 'morte', 'retorno', 'habilidade', 'ultimate', 'carga', 'impacto', 'impacto_deus', 'poder_divino', 'poder_dominio', 'awaken')
LIBRARY = Path(os.environ.get('SSTCG_BIBLIOTECA', Path.home() / 'worktrees/sstcg-biblioteca-sons'))  # tools/rea-ps3/biblioteca-sons.py


def library_file(line, lang):
    """MP3 da fala no idioma pedido; som sem esse idioma (FX, falas só em japonês) usa o que houver."""
    banco = LIBRARY / 'banco' / f'{line}.mp3'  # efeitos de terceiros: mesmo arquivo nos 3 idiomas (tools/banco-sons.py)
    return banco if banco.is_file() else next((p for l in (lang, *VOICE_LANGS) if (p := LIBRARY / l / f'{line}.mp3').is_file()), None)


def install_voice(line, root=ROOT):
    """Põe a fala onde o duelo a procura, nos 3 idiomas (o duelo fica atrás do login)."""
    for lang in VOICE_LANGS:
        dest, source = root / 'playtest/divine/assets/vozes' / lang / f'{line}.mp3', library_file(line, lang)
        if dest.exists():
            continue
        if not source:
            raise ValueError(f'Som não encontrado na biblioteca: {line}.')
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, dest)


def import_library_sound(body, root=ROOT):
    """Som da biblioteca escolhido no Star Hill: vira arquivo de MUSIC/fx, que é o que o catálogo e o olympus-telas.json aceitam."""
    line, lang, kind = body.get('id'), body.get('lang'), body.get('tipo')
    if not isinstance(line, str) or not VOICE_LINE.fullmatch(line) or lang not in VOICE_LANGS or kind not in ('voz', 'se'):
        raise ValueError('Som inválido.')
    source = library_file(line, lang)
    if not source:
        raise ValueError(f'Som não encontrado na biblioteca: {line}.')
    bank, fala = line.split('/')
    folder = f'ps3-{kind}-{bank}-{lang}'
    for dest in (root / 'MUSIC/fx' / folder / f'{fala}.mp3', root / 'playtest/divine/assets/sons' / folder / f'{fala}.mp3'):
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, dest)
    return {'ok': True, 'arquivo': f'MUSIC/fx/{folder}/{fala}.mp3'}


def save_card_voice(body, atomic_write, root=ROOT):
    """Sons de uma carta (ou de uma facção, id faccao-<nome>): um por momento e um por linha de habilidade; vale para os 3 idiomas."""
    card = body.get('id') if isinstance(body, dict) else None
    if not isinstance(card, str) or not re.fullmatch(r'[a-z0-9-]{1,60}', card) or set(body) - {'id', 'linhas', *VOICE_MOMENTS} or not isinstance(body.get('linhas'), list):
        raise ValueError('Voz da carta inválida.')
    lines = [*(body.get(k) for k in VOICE_MOMENTS), *body['linhas']]
    for line in lines:
        if line is not None and line is not False and not (isinstance(line, str) and VOICE_LINE.fullmatch(line)):  # False: sem som de propósito
            raise ValueError('Fala inválida.')
    for line in filter(None, lines):
        install_voice(line, root)
    path = root / CARD_VOICES
    voices = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    old = voices.get(card, {})
    voices[card] = {**{k: body[k] if k in body else old.get(k) for k in VOICE_MOMENTS}, 'linhas': body['linhas']}  # momento ausente: página antiga aberta não apaga o que ela não conhece
    if all(line is None for line in [*(voices[card][k] for k in VOICE_MOMENTS), *body['linhas']]):
        del voices[card]
    atomic_write(path, (json.dumps(voices, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8'))
    return voices


CARD_ANIMS = 'data/card-animations.json'
ANIM_EFFECTS = ('slash', 'impact', 'ice', 'fire', 'lightning', 'poison', 'light', 'dark', 'explosion', 'energy', 'shield', 'heal', 'power',
                'muzzle', 'blood', 'pickup', 'dash', 'blink', 'sparkle', 'rain', 'snow', 'fog', 'embers', 'fireflies', 'leaves', 'bubbles')  # playtest/divine/pixel-vfx.js
ANIM_MOMENTS = ('golpe', 'impacto', 'impacto_deus', 'strike', 'carga', 'declarar', 'cast', 'entrada', 'retorno', 'morte', 'dano', 'soul', 'escudo', 'cura', 'habilidade', 'ultimate', 'poder_divino', 'poder_dominio', 'awaken')


def _anim_tuning(value):
    """Ajustes do gestor por efeito: ligado, tamanho, velocidade e cor."""
    if not isinstance(value, dict) or set(value) - set(ANIM_EFFECTS):
        raise ValueError('Efeito inválido.')
    for tune in value.values():
        if not isinstance(tune, dict) or set(tune) != {'ligado', 'tamanho', 'velocidade', 'cor'} or not isinstance(tune['ligado'], bool):
            raise ValueError('Ajuste de efeito inválido.')
        for key, low, high in (('tamanho', 0.5, 2), ('velocidade', 0.25, 2)):
            if isinstance(tune[key], bool) or not isinstance(tune[key], (int, float)) or not low <= tune[key] <= high:
                raise ValueError('Ajuste de efeito inválido.')
        if tune['cor'] is not None and not (isinstance(tune['cor'], str) and re.fullmatch(r'#[0-9a-fA-F]{6}', tune['cor'])):
            raise ValueError('Cor inválida.')
    return value


def save_card_anim(body, atomic_write, root=ROOT):
    """Animações de uma carta, de uma facção (faccao-<nome>) ou do jogo (padrao): uma por momento e uma por linha de habilidade. id "efeitos": ajustes."""
    card = body.get('id') if isinstance(body, dict) else None
    if not isinstance(card, str) or not re.fullmatch(r'[a-z0-9-]{1,60}', card):
        raise ValueError('Animação inválida.')
    path = root / CARD_ANIMS
    anims = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    if card == 'efeitos':
        if set(body) != {'id', 'efeitos'}:
            raise ValueError('Animação inválida.')
        anims['efeitos'] = _anim_tuning(body['efeitos'])
    else:
        if set(body) - {'id', 'linhas', *ANIM_MOMENTS} or not isinstance(body.get('linhas'), list):
            raise ValueError('Animação inválida.')
        chosen = [*(body.get(k) for k in ANIM_MOMENTS), *body['linhas']]
        if any(v is not None and v is not False and v not in ANIM_EFFECTS and not NEW_FX.fullmatch(str(v)) for v in chosen):  # False: sem animação de propósito
            raise ValueError('Efeito inválido.')
        entry = {k: body[k] for k in ANIM_MOMENTS if body.get(k) is not None}
        lines = body['linhas']
        while lines and lines[-1] is None:
            lines = lines[:-1]
        if entry or lines:
            anims[card] = {**entry, 'linhas': lines}
        else:
            anims.pop(card, None)
    atomic_write(path, (json.dumps(anims, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8'))
    return anims


# VFX Forge V3: shaders, Lottie e composições (shared/vfx/). Só apresentação; o id da carta é o vínculo, nunca o nome.
VFX_STUDIO = 'data/vfx-studio.json'
NEW_FX = re.compile(r'(shader|lottie|comp):[a-z0-9-]{1,60}')
SAFE_ID = re.compile(r'[a-z0-9-]{1,60}')
LAYER_TYPES = ('carta', 'camera', 'shader', 'particulas', 'lottie', 'audio', 'ui')
LAYER_NUMBERS = {'inicio': (0, 6000), 'duracao': (1, 6000), 'x': (-800, 800), 'y': (-800, 800), 'escala': (0.1, 4), 'rotacao': (-360, 360),
                 'opacidade': (0, 1), 'forca': (0, 1), 'velocidade': (0.1, 4), 'volume': (0, 1)}
LAYER_TEXT = {'shader': SAFE_ID, 'lottie': SAFE_ID, 'efeito': re.compile(r'[a-z0-9-]{1,60}'), 'alvo': re.compile(r'carta|mesa'),
              'cor': re.compile(r'#[0-9a-fA-F]{6}'), 'easing': re.compile(r'linear|ease|ease-in|ease-out|ease-in-out'),
              'som': re.compile(r'[A-Za-z0-9_./-]{1,200}\.(ogg|mp3|wav|m4a)')}


def _number(value, low, high):
    return not isinstance(value, bool) and isinstance(value, (int, float)) and low <= value <= high


def _vfx_card(value):
    if not isinstance(value, dict) or set(value) - {'idle', 'inspecao', 'holo', 'forca', 'velocidade', 'cor'}:
        raise ValueError('Efeito de carta inválido.')
    for key in ('idle', 'inspecao', 'holo'):
        if value.get(key) is not None and not (isinstance(value[key], str) and SAFE_ID.fullmatch(value[key])):
            raise ValueError('Efeito de carta inválido.')
    if 'forca' in value and not _number(value['forca'], 0, 1) or 'velocidade' in value and not _number(value['velocidade'], 0.1, 4):
        raise ValueError('Efeito de carta inválido.')
    if value.get('cor') is not None and not (isinstance(value['cor'], str) and LAYER_TEXT['cor'].fullmatch(value['cor'])):
        raise ValueError('Cor inválida.')
    return {k: v for k, v in value.items() if v is not None}


def _vfx_composition(value):
    if not isinstance(value, dict) or set(value) - {'nome', 'faccao', 'camadas'} or not isinstance(value.get('nome'), str) or not 0 < len(value['nome']) <= 60:
        raise ValueError('Composição inválida.')
    layers = value.get('camadas')
    if not isinstance(layers, list) or len(layers) > 24:
        raise ValueError('Composição inválida.')
    for layer in layers:
        if not isinstance(layer, dict) or layer.get('tipo') not in LAYER_TYPES or not {'inicio', 'duracao'} <= set(layer):
            raise ValueError('Camada inválida.')
        for key, item in layer.items():
            if key == 'tipo':
                continue
            if key == 'ativa' or key == 'loop':
                ok = isinstance(item, bool)
            elif key in LAYER_NUMBERS:
                ok = _number(item, *LAYER_NUMBERS[key])
            else:
                ok = key in LAYER_TEXT and isinstance(item, str) and LAYER_TEXT[key].fullmatch(item)
            if not ok:
                raise ValueError(f'Camada inválida: {key}.')
    return value


def save_vfx_studio(body, atomic_write, root=ROOT):
    """Uma alteração por vez: {tipo: carta|raridade|composicao, id, valor}. valor null tira a entrada."""
    kind, key, value = body.get('tipo'), body.get('id'), body.get('valor')
    path = root / VFX_STUDIO
    data = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'versao': 1, 'raridades': {}, 'cartas': {}, 'composicoes': {}}
    if kind == 'raridade':
        known = {card.get('raridade') for card in json.loads((root / 'data/cards.json').read_text(encoding='utf-8'))['cartas']}
        if key not in known:  # o vínculo nunca cria raridade nova
            raise ValueError('Raridade desconhecida.')
        if value is not None and not (isinstance(value, str) and SAFE_ID.fullmatch(value)):
            raise ValueError('Holográfico inválido.')
        group = 'raridades'
    elif kind == 'carta' and isinstance(key, str) and SAFE_ID.fullmatch(key):
        value = _vfx_card(value) if value is not None else None
        value = value or None
        group = 'cartas'
    elif kind == 'composicao' and isinstance(key, str) and SAFE_ID.fullmatch(key):
        value = _vfx_composition(value) if value is not None else None
        group = 'composicoes'
    else:
        raise ValueError('Pedido de VFX inválido.')
    if value is None:
        data[group].pop(key, None)
    else:
        data[group][key] = value
    atomic_write(path, (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    return data


def save_telas(body, atomic_write, root=ROOT):
    current = (root / TELAS).read_text(encoding='utf-8')
    if body.get('revisao') != revision(current):
        raise ValueError('As telas mudaram em outra janela. Recarregue antes de salvar.')
    value = validate_telas(body.get('conteudo'), root)
    text = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    atomic_write(root / TELAS, text.encode('utf-8'))
    return {'ok': True, 'revisao': revision(text)}


def get(handler, path):
    if path == '/api/star-hill/motor':
        handler.reply(200, engine_updates.manager(ROOT).info())
    elif path.startswith('/api/star-hill/motor/trabalhos/'):
        handler.reply(200, engine_updates.manager(ROOT).status(path.rsplit('/', 1)[1]))
    elif path == '/api/star-hill/config':
        handler.reply(200, read_document('config'))
    elif path == '/api/star-hill/regras':
        handler.reply(200, read_document('regras'))
    elif path == '/api/star-hill/telas':
        text = (ROOT / TELAS).read_text(encoding='utf-8')
        handler.reply(200, {'arquivo': TELAS, 'revisao': revision(text), 'conteudo': json.loads(text)})
    elif path == '/api/star-hill/jogo':
        handler.reply(200, game_status())
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
        if path == '/api/star-hill/card-voice':
            return handler.reply(200, {'vozes': save_card_voice(body, atomic_write)})
        if path == '/api/star-hill/card-anim':
            return handler.reply(200, {'animacoes': save_card_anim(body, atomic_write)})
        if path == '/api/star-hill/vfx-studio':
            return handler.reply(200, {'studio': save_vfx_studio(body, atomic_write)})
        if path == '/api/star-hill/som-biblioteca':
            return handler.reply(200, import_library_sound(body))
        if path.startswith('/api/star-hill/motor/'):
            motor = engine_updates.manager(ROOT, atomic_write)
            action = path.rsplit('/', 1)[1]
            if action == 'gerar':
                result = motor.start(body)
            elif action == 'validar':
                result = motor.validate(body.get('trabalho'))
            elif action == 'aplicar':
                result = motor.apply(body.get('trabalho'), body.get('confirmar'))
            elif action == 'cancelar':
                result = motor.cancel(body.get('trabalho'))
            else:
                return handler.reply(404, {'erro': 'Operação do motor desconhecida.'})
        elif path == '/api/star-hill/publicar':
            result = publish()
        elif path == '/api/star-hill/publicar-site':
            result = publish_site()
        elif path == '/api/star-hill/telas':
            result = save_telas(body, atomic_write)
        elif path == '/api/star-hill/preview':
            result = preview(body)
        elif path == '/api/star-hill/apply':
            result = apply(body, atomic_write)
        else:
            return handler.reply(404, {'erro': 'Rota STAR HILL desconhecida.'})
    handler.reply(200, result)
