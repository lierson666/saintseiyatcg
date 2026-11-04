#!/usr/bin/env python3
"""Registro central de animações (VFX Forge 2.0): gera data/vfx-inventario.json lendo o repositório inteiro.

`--check` falha se apareceu ou sumiu animação sem o registro ser refeito, se houver id repetido ou evento sem grupo.
Refazer o registro não basta para animação nova: sem controle no Forge ela precisa de um motivo em data/vfx-excecoes.json.
data/vfx-pendentes.json lista a dívida antiga; essa lista só encolhe, ninguém acrescenta.
Não detecta animação feita à mão com setInterval: não dá para distinguir de um temporizador comum.
Exceção precisa de motivo em data/vfx-excecoes.json ({"id": "motivo"}). Fora da varredura: tools/, docs/ e vendor/, que não são telas do jogo.
Uso: python3 tools/vfx-inventario.py [--check]

O id não leva linha nem contagem: editar um arquivo não muda o registro, só criar ou apagar uma animação.
Critério de MIGRADA: os três primeiros (inventariada, id e aparecer no Forge) valem ao entrar aqui; os outros cinco ficam em `criterios`.
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data/vfx-inventario.json'
EXCEPTIONS = ROOT / 'data/vfx-excecoes.json'
PENDING = ROOT / 'data/vfx-pendentes.json'
DIRECTOR = 'playtest/divine/director.js'
FX_CALL = re.compile(r'(?:fx\(\)\?|\bf\??)\.(burst|shockwave|charge|projectile|beam|flash)\(')
SKIP = re.compile(r'^(tools|docs|card-forge/projects|node_modules)/|/vendor/|\.backup|(^|/)test')
SCENE = [('ceu', 'Céu', 'const sky'), ('chao', 'Chão de mármore', 'const floor'), ('zodiaco', 'Anel do zodíaco', 'const zodiac'), ('colunas', 'Colunas', 'const shaft'), ('raios', 'Raios de luz', 'const ray'), ('poeira', 'Poeira de Cosmo', 'function buildDust')]
ORIGINS = [(r'^playtest/divine/', 'Olympus Arena'), (r'^playtest/engine', 'Engine 3.0'), (r'^playtest/(economy|booster|collection|pack)', 'Boosters e coleção'), (r'^playtest/deck', 'Deck Builder'), (r'^playtest/', 'Lobby e plataforma'),
           (r'^star-hill/', 'Star Hill'), (r'^card-forge/', 'Card Forge'), (r'^shared/', 'Compartilhado')]
CATEGORIES = [('Morte dos Gods', r'^(die|ruin)'), ('Cosmo nas cartas', r'^(cosmo-|fx-|flame|base-burn)'), ('Awaken e God', r'^(awaken|god|power-|heart)')]
LIBS = [('WebGL (Three.js)', r'new THREE\.|createScene\(', 'webgl'), ('WebGL (Pixi)', r'new PIXI\.|pixi-fx', 'pixi'), ('Lottie', r'dotlottie|DotLottie', 'lottie'), ('GSAP ou anime.js', r'\bgsap\.|\banime\(', 'lib')]
ALL = ('edita', 'aplica', 'preview', 'restaura', 'testes')
LEGACY = 'Sem controle no Forge: precisa de adapter'
ADAPTER_PAGES = (('playtest/divine/index.html', 'mesa'), ('playtest/index.html', 'lobby'))  # páginas que carregam shared/anim-css-adapter.js
# Laços com controle próprio em Star Hill, Animações, Céu e moeda.
LOOP_CONTROLS = {'shared-kv-sky-js': (['ligado', 'estrelas'], 'Constelações, cores e brilho ficam fixos no código'),
                 'playtest-divine-coin3d-js': (['ligado', 'duracao', 'giros'], 'A moeda em CSS, para quem não tem WebGL, não recebe duração nem giros')}
LIMITS = {'mesa': 'Ajusta ligar, desligar e velocidade. O teste é uma amostra numa carta, não o gatilho real. Forma e cor seguem no CSS; o atraso não escala',
          'lobby': 'Ajusta ligar, desligar e velocidade, mas roda no lobby e não tem teste na mesa. Forma e cor seguem no CSS; o atraso não escala'}


def origin_of(path):
    return next((name for pattern, name in ORIGINS if re.search(pattern, path)), 'Site')


def slug(path):
    return re.sub(r'[^a-z0-9]+', '-', path.lower()).strip('-')


def row(rid, nome, categoria, tecnologia, arquivos, gatilho='', parametros=(), estado='legado', aba=None, limite='', ok=()):
    entry = {'id': rid, 'nome': nome, 'categoria': categoria, 'tecnologia': tecnologia, 'origem': origin_of(arquivos[0]), 'arquivos': list(arquivos), 'gatilho': gatilho, 'parametros': list(parametros), 'estado': estado,
             'criterios': {'forge': bool(aba), **{key: key in ok for key in ALL}}, 'migrada': bool(aba) and set(ok) == set(ALL)}
    if aba:
        entry['aba'] = aba
    if limite or estado == 'legado':
        entry['limite'] = limite or LEGACY
    return entry


def managed():
    rows = []
    vfx = (ROOT / 'playtest/divine/pixel-vfx.js').read_text(encoding='utf-8')
    span = lambda name: vfx[vfx.index(f'export const {name}'):vfx.index('];', vfx.index(f'export const {name}'))]
    testable = {'golpe', 'impacto', 'impacto_deus', 'carga', 'declarar', 'strike', 'dano', 'entrada'}  # star-hill/criador.js
    for key, nome, quando in re.findall(r"\['(\w+)', '([^']+)', '([^']+)'\]", span('ANIM_MOMENTS')):
        ok = ('edita', 'aplica', 'restaura', 'testes', *(('preview',) if key in testable else ()))
        rows.append(row(f'momento:{key}', nome, 'Momentos', 'Vínculo', ['playtest/divine/director.js', 'data/card-animations.json'], quando, ['efeito por padrão, facção, carta e linha'], 'editavel', 'padroes', '' if key in testable else 'A mesa de teste ainda não simula este momento', ok))
    for key, nome in re.findall(r"\['(\w+)', '([^']+)'\]", span('EFFECTS')):
        rows.append(row(f'pixel:{key}', nome, 'Sprite Fusion', 'Canvas 2D (Sprite Fusion)', ['playtest/divine/pixel-vfx.js'], 'Quando escolhido num momento', ['ligado', 'tamanho', 'velocidade', 'cor'], 'editavel', 'efeitos', '', ALL))
    rows.append(row('gerador:sprite-fusion', 'Gerador Sprite Fusion: 14 tipos de combate', 'Sprite Fusion', 'Canvas 2D (Sprite Fusion)', ['playtest/divine/pixel-vfx.js', 'star-hill/criador.js'], 'Quando o rascunho for escolhido num momento', ['tipo', 'cor', 'escala', 'velocidade', 'posicao', 'camadas', 'atraso'], 'editavel', 'sprite', 'Tipos sem efeito próprio no Sprite Fusion são composições aproximadas. Sem arquivo, quadros e dimensões não se aplicam. O teste entra no impacto do Strike', ALL))
    rows.append(row('gerador:combate', 'Combat Composer: coreografia do Strike', 'Combate', 'Timeline (efeitos do banco)', ['playtest/divine/director.js', 'star-hill/criador.js'], 'Golpe do Strike, se escolhida', ['fases', 'inicio', 'hit', 'hit stop', 'knockback', 'som'], 'editavel', 'combate', 'Uma faixa por fase. Em área e fora do Strike toca só o Impact', ALL))
    rows.append(row('banco', 'Banco de efeitos', 'Banco de efeitos', 'Sprite sheet', ['playtest/divine/pixel-vfx.js', 'data/vfx-catalog.json'], 'Quando escolhido num momento', ['ligado', 'tamanho', 'velocidade', 'posição'], 'editavel', 'efeitos', 'Restaurar volta o ajuste; a folha importada não muda. Só rascunho pode ser descartado', ALL))
    for rid, nome, aba, tecnologia in (('composer', 'Composições, shaders e Lottie', 'composer', 'WebGL (Pixi) e Lottie'), ('holo', 'Holográfico por raridade', 'holo', 'WebGL (Pixi)')):
        rows.append(row(rid, nome, 'Composições e cartas vivas', tecnologia, ['shared/vfx/composer.js', 'data/vfx-studio.json'], 'Quando escolhidos', ['camadas e efeitos'], 'editavel', aba, 'Efeito no jogo real ainda não verificado nesta auditoria; falta restaurar', ('edita', 'testes')))
    return rows


def director():
    text = (ROOT / DIRECTOR).read_text(encoding='utf-8')
    groups = re.findall(r"\['([\w-]+)', '([^']+)', '([^']+)'\]", (ROOT / 'playtest/divine/particle-tune.js').read_text(encoding='utf-8'))
    named = {key for key, _, _ in groups}
    rows = [row(f'particula:{key}', nome, 'Recuo e impacto' if key == 'recuo' else 'Partículas da partida', 'CSS animation' if key == 'recuo' else 'WebGL (partículas)', ['playtest/divine/particle-tune.js', DIRECTOR], quando,
                ['ligado', 'tamanho', 'duração'] if key == 'recuo' else ['ligado', 'quantidade', 'tamanho', 'duração', 'cor'], 'editavel', 'particulas', '', ALL) for key, nome, quando in groups]
    current = None
    for line in text[text.index('export function createDirector'):].split('\n'):
        head = re.match(r'\s*async (\w+)\(e\) \{', line)
        current = head.group(1) if head else current
        if current and FX_CALL.search(line) and current not in named and "fx('" not in line:
            sys.exit(f'{DIRECTOR}: o evento {current} tem partícula sem grupo em particle-tune.js')
    rows.append(row('tempo:impacto', 'Espera até o impacto, por efeito', 'Tempos', 'JavaScript', [DIRECTOR], 'Entre o golpe e o dano', limite='Exige mudar o director para ler do Forge'))
    rows.append(row('tempo:pausas', 'Pausas da sequência', 'Tempos', 'JavaScript', [DIRECTOR], 'Entre os passos de cada evento', ['velocidade do grupo'], 'parcial', 'telas', 'Só a velocidade do grupo, em Telas e som'))
    return rows


def scene():
    text = (ROOT / 'playtest/divine/scene.js').read_text(encoding='utf-8')
    return [row(f'cena:{key}', nome, 'Fundo 3D', 'WebGL (Three.js)', ['playtest/divine/scene.js'], 'Sempre na partida', ['qualidade gráfica', 'cor do tema'], 'parcial', 'telas', 'Só qualidade e tema; forma e movimento estão no código')
            for key, nome, needle in SCENE if re.search(rf'{needle}\b', text)]


def adapter_sheets():
    """Folha de estilo de cada página com o adapter: o que ela linka é o que o adapter alcança."""
    sheets = {}
    for page, name in ADAPTER_PAGES:
        for href in re.findall(r'href="(\.[^"?]+\.css)', (ROOT / page).read_text(encoding='utf-8')):
            sheets.setdefault(os.path.normpath(os.path.join(os.path.dirname(page), href)), name)
    return sheets


def source(files):
    """Tudo o que anima em CSS, JS, Canvas, WebGL e bibliotecas. CSS dentro de HTML ou de JS conta igual."""
    rows, counts, sheets = [], {}, adapter_sheets()
    for rel in files:
        if not rel.endswith(('.css', '.js', '.mjs', '.html', '.svg')) or rel in (DIRECTOR, 'playtest/divine/scene.js'):
            continue
        text = (ROOT / rel).read_text(encoding='utf-8', errors='ignore')
        used = {}
        for match in re.finditer(r'animation(?:-name)?:\s*([^;}]+)', text):
            brace = text.rfind('{', 0, match.start())  # o seletor fica antes da chave do bloco
            selector = text[max(text.rfind('}', 0, brace), text.rfind(';', 0, brace), brace - 300) + 1:brace]
            for name in re.findall(r'[\w-]+', match.group(1)):
                used.setdefault(name, re.sub(r'\s+', ' ', selector.split('*/')[-1]).strip()[:70])
        area = 'Interface da partida' if rel.startswith('playtest/divine/') else 'Interface fora da partida'
        for name in dict.fromkeys(re.findall(r'@keyframes\s+([\w-]+)', text)):
            categoria = next((c for c, pattern in CATEGORIES if re.search(pattern, name)), area)
            rid, gatilho = f'css:{slug(rel)}:{name}', used.get(name, 'Usada pelo código')
            if name in ('hit', 'hit-calm'):  # um controle só para o recuo
                rows.append(row(rid, name, categoria, 'CSS animation', [rel], gatilho, ['ligado', 'tamanho', 'duracao'], 'parcial', 'particulas', 'Ajuste em Partículas: Recuo da carta'))
            elif rel in sheets:
                rows.append({**row(rid, name, categoria, 'CSS animation', [rel], gatilho, ['ligado', 'velocidade'], 'parcial', 'interface', LIMITS[sheets[rel]], ('edita', 'aplica', 'restaura', 'testes')), 'pagina': sheets[rel]})
            else:
                rows.append(row(rid, name, categoria, 'CSS animation', [rel], gatilho))
            counts['CSS animation'] = counts.get('CSS animation', 0) + 1
        total = len(re.findall(r'(?<![-\w])transition\s*:|\.style\.(?:transition|animation)\s*=', text))
        if total:
            rows.append(row(f'transicao:{slug(rel)}', f'Transições de {rel.split("/")[-1]}', 'Hover e interação', 'CSS transition', [rel], 'Hover, foco e mudança de estado', limite='Agrupadas por arquivo; sem controle no Forge'))
            counts['CSS transition'] = counts.get('CSS transition', 0) + total
        if rel.endswith(('.js', '.mjs', '.html', '.svg')):
            for pattern, nome, tecnologia, rid in ((r'requestAnimationFrame\(', 'Laço de animação', 'JavaScript (requestAnimationFrame)', 'raf'), (r'\.animate\(', 'Web Animations', 'JavaScript (Web Animations)', 'waapi'), (r"getContext\(\s*['\"]2d", 'Desenho em Canvas', 'Canvas 2D', 'canvas'), (r'<animate\w*\b', 'Animação SVG', 'SVG (SMIL)', 'smil'), (r'startViewTransition\(', 'Transição de tela', 'View Transitions', 'view')):
                found = len(re.findall(pattern, text))
                if found:
                    rows.append(row(f'{rid}:{slug(rel)}', f'{nome} em {rel.split("/")[-1]}', 'Código de animação', tecnologia, [rel], 'Definido no código', limite='Pode ser desenho parado: confirmar ao migrar' if rid == 'canvas' else ''))
                    counts[tecnologia] = counts.get(tecnologia, 0) + found
            for tecnologia, pattern, rid in LIBS:
                if re.search(pattern, text):
                    rows.append(row(f'{rid}:{slug(rel)}', f'{tecnologia} em {rel.split("/")[-1]}', 'Bibliotecas', tecnologia, [rel], 'Definido no código'))
                    counts[tecnologia] = counts.get(tecnologia, 0) + 1
    return rows, counts


def assets(files):
    """Arquivos que já são animados: GIF, vídeo, APNG e WebP com animação. Um por pasta e formato."""
    groups = {}
    for rel in files:
        suffix = Path(rel).suffix.lower()
        kind = {'.gif': 'GIF', '.mp4': 'Vídeo', '.webm': 'Vídeo', '.apng': 'APNG'}.get(suffix)
        if suffix in ('.webp', '.png') and (ROOT / rel).exists():
            with (ROOT / rel).open('rb') as image:  # só o cabeçalho: ler a imagem inteira deixa a verificação lenta
                head = image.read(128)
            kind = 'WebP animado' if suffix == '.webp' and head[:4] == b'RIFF' and head[12:16] == b'VP8X' and head[20] & 2 else 'APNG' if suffix == '.png' and b'acTL' in head else None
        if kind:
            groups.setdefault((str(Path(rel).parent), kind), []).append(rel)
    return [row(f'arquivo:{slug(folder)}:{slug(kind)}', f'{kind} em {folder}', 'Arquivos animados', kind, sorted(paths), 'Onde o arquivo é usado', limite='Arquivo pronto: só dá para trocar, não ajustar') for (folder, kind), paths in sorted(groups.items())]


def build():
    listed = subprocess.run(['git', 'ls-files', '-co', '--exclude-standard'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\n')
    files = sorted(f for f in listed if f and not SKIP.search(f))
    coded, counts = source(files)
    rows = managed() + director() + scene() + coded + assets(files)
    exceptions = json.loads(EXCEPTIONS.read_text(encoding='utf-8')) if EXCEPTIONS.exists() else {}
    for entry in rows:
        kind, _, where = entry['id'].partition(':')
        if kind in ('raf', 'canvas', 'webgl') and where in LOOP_CONTROLS:
            params, limit = LOOP_CONTROLS[where]
            entry.update(parametros=params, estado='editavel', aba='cena', limite=limit, criterios={'forge': True, **{key: True for key in ALL}}, migrada=True)
        if entry['id'] in exceptions:
            entry.update(estado='excecao', limite=exceptions[entry['id']])
    ids = [entry['id'] for entry in rows]
    repeated = {i for i in ids if ids.count(i) > 1}
    if repeated:
        sys.exit(f'Id repetido no registro: {sorted(repeated)[:5]}')
    unknown = set(exceptions) - set(ids)
    if unknown:
        sys.exit(f'Exceção sem animação: {sorted(unknown)[:5]}')
    summary = {'total': len(rows), 'migradas': sum(r['migrada'] for r in rows), **{state: sum(r['estado'] == state for r in rows) for state in ('editavel', 'parcial', 'legado', 'excecao')},
               'criterios': {key: sum(r['criterios'][key] for r in rows) for key in ('forge', *ALL)}}
    return {'versao': 1, 'gerado_por': 'tools/vfx-inventario.py', 'resumo': summary, 'animacoes': rows}, counts


def undecided(rows, pending):
    """Animação sem controle e sem motivo escrito, fora da dívida antiga."""
    return sorted(r['id'] for r in rows if r['estado'] == 'legado' and r['id'] not in pending)


def main():
    data, counts = build()
    text = json.dumps(data, ensure_ascii=False, indent=1) + '\n'
    pending = json.loads(PENDING.read_text(encoding='utf-8'))
    legacy = {r['id'] for r in data['animacoes'] if r['estado'] == 'legado'}
    new = undecided(data['animacoes'], pending)
    refused = f'Animação sem controle no VFX Forge: {new[:8]}. Ligue ao Forge ou escreva o motivo em data/vfx-excecoes.json.'
    if '--check' in sys.argv:
        if set(pending) - legacy:
            sys.exit(f'Já resolvidas: {sorted(set(pending) - legacy)[:8]}. Rode python3 tools/vfx-inventario.py para tirá-las de data/vfx-pendentes.json.')
        if new:
            sys.exit(refused)
        if not OUT.exists() or OUT.read_text(encoding='utf-8') != text:
            old = {r['id'] for r in json.loads(OUT.read_text(encoding='utf-8'))['animacoes']} if OUT.exists() else set()
            new = {r['id'] for r in data['animacoes']}
            sys.exit(f'Registro de animações velho. Novas: {sorted(new - old)[:8]}. Sumiram: {sorted(old - new)[:8]}. Rode python3 tools/vfx-inventario.py ou documente em data/vfx-excecoes.json.')
        print('ok')
        return
    OUT.write_text(text, encoding='utf-8')
    PENDING.write_text(json.dumps(sorted(set(pending) & legacy), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps({'resumo': data['resumo'], 'ocorrencias': counts}, ensure_ascii=False))
    if new:
        sys.exit(refused)


if __name__ == '__main__':
    main()
