#!/usr/bin/env python3
"""Biblioteca de sons do Alma dos Soldados: todo ACB/AWB de resource/sound vira MP3 mono + index.json.

Uso: biblioteca-sons.py <pasta resource/sound extraída> <pasta de saída> [--ffmpeg caminho] [--jobs N]
A saída fica fora do repositório e do MUSIC/: o áudio é da Bandai Namco e da Toei (docs/rea-soldiers-soul.md).
Número da fala igual ao de ps3-voz-*: stream do AWB = 000…, memória do ACB = 5000…; banco BT_<COD>_VC = <COD>.
"""
import argparse, concurrent.futures as cf, json, os, re, struct, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cpk import crilayla, read_utf

LANGS = {'BR': 'pt', 'NS': 'es'}  # raiz = japonês
SKIP = re.compile(r'^(BGM|GALA5_BGM)')  # música de fundo não é voz nem FX
# Nomes deduzidos do código e dos golpes de cada banco; o que não foi possível deduzir aparece só pelo código.
NOMES = {'SEY': 'Seiya', 'SRU': 'Shiryu', 'HYG': 'Hyoga', 'SYN': 'Shun', 'IKI': 'Ikki', 'ATG': 'Athena', 'ATN': 'Athena', 'SIT': 'Seiya de Sagitário',
         'MUU': 'Mu', 'ARD': 'Aldebaran', 'SGA': 'Saga', 'JMN': 'Gêmeos', 'KNN': 'Kanon', 'DTH': 'Máscara da Morte', 'IOR': 'Aiolia', 'IOS': 'Aiolos', 'SHK': 'Shaka',
         'DOK': 'Dohko', 'MIR': 'Milo', 'SRA': 'Shura', 'KMU': 'Camus', 'AFR': 'Afrodite', 'SON': 'Shion', 'MRN': 'Marin', 'JAB': 'Jabu', 'MST': 'Misty',
         'PSD': 'Poseidon', 'KSA': 'Kasa', 'KRS': 'Krishna', 'IIO': 'Io', 'BIA': 'Bian', 'SRE': 'Sorento', 'HDS': 'Hades', 'TNT': 'Thanatos', 'HPN': 'Hypnos',
         'RDA': 'Radamanthys', 'AIA': 'Aiacos', 'MNS': 'Minos', 'ORF': 'Orfeu', 'HLD': 'Hilda', 'SID': 'Syd', 'BAD': 'Bado', 'HGN': 'Hagen', 'ALB': 'Alberich',
         'FNR': 'Fenrir', 'TOR': 'Thor', 'MIM': 'Mime', 'SFD': 'Siegfried', 'SYS': 'Sistema'}
ESTILOS = [('Entrada', r'start|entry'), ('Vitória', r'win'), ('Derrota', r'^C_'), ('Provocação', r'CH_'), ('História', r'^S\d+_'), ('Grito', r'^B_')]


def estilo(cue, secs):
    if 'DUMMY' in cue or 'DAMMY' in cue:
        return 'Sem nome'
    for name, pattern in ESTILOS:
        if re.search(pattern, cue):
            return name
    return 'Grito' if secs < 1 else 'Frase'


def codigo(text):
    """Primeiro código de personagem conhecido dentro do nome da cue ou do banco."""
    return next((c for c in re.findall(r'(?<![A-Z])[A-Z0-9]{3}(?![A-Z])', text) if c in NOMES), '')


def classificar(banco, cue, secs):
    """(seção, personagem, grupo) de um som."""
    if banco in ('BT_SYS_SE', 'SYS_SE', 'EVENT', 'TITTLE'):
        return 'fx-sistema', '', banco
    m = re.fullmatch(r'BBA_([A-Z0-9]{3})_(.+)_VC', banco)
    if m:
        return 'voz-golpe', m[1], f'Golpe {m[2]}'
    if re.fullmatch(r'[A-Z0-9]{3}', banco):
        return 'voz-batalha', banco, estilo(cue, secs)
    if re.search(r'_SYSTEM_VC$', banco):
        return 'voz-batalha', banco[3:6], 'Sistema'
    m = re.match(r'(EVE|BTL)_(\d+)_(\d+)_(\d+)_?([A-Z0-9]*)', banco)
    if m:
        return 'voz-historia', codigo(cue) or m[5], f"{'Evento' if m[1] == 'EVE' else 'Luta'} {m[2]}-{m[3]}-{m[4]}"
    m = re.fullmatch(r'BBA_([A-Z0-9]{3})_(.+)', banco)
    if m:
        return 'fx-golpe', m[1], f'Golpe {m[2]}'
    m = re.fullmatch(r'(?:BT_([A-Z0-9]{3})_SE|AWAKE_([A-Z0-9]{3}))', banco)
    if m:
        return 'fx-golpe', m[1] or m[2], 'Personagem' if m[1] else 'Despertar'
    if banco.lower().startswith('bba_'):
        return 'fx-golpe', '', banco
    if re.match(r'AMB_|GALA5_AMBIENT', banco):
        return 'fx-ambiente', '', banco
    return 'voz-narracao', codigo(cue), banco


def indice(bancos, falas):
    sons = []
    for banco, info in bancos.items():
        for fala, item in info['falas'].items():
            secao, cod, grupo = classificar(banco, item['cue'], item['s'])
            sons.append([f'{banco}/{fala}', secao, cod, grupo, item['cue'], item['s'], item['langs'], falas.get(banco, {}).get(fala, '')])
    jogo = {'id': 'soldiers-soul', 'nome': 'Alma dos Soldados (PS3)'}
    return {'jogos': [jogo], 'nomes': NOMES, 'sons': sons}


def itoc(data):
    """AWB em formato CPK com índice por ID: arquivos em ordem de ID a partir de ContentOffset."""
    head = read_utf(data[0x10:])[0]
    table = read_utf(data[head['ItocOffset'] + 0x10:])[0]
    rows = [r for k in ('DataL', 'DataH') if table.get(k) for r in read_utf(table[k])]
    pos, align, out = head['ContentOffset'], head.get('Align') or 2048, {}
    for r in sorted(rows, key=lambda r: r['ID']):
        raw = data[pos:pos + r['FileSize']]
        out[r['ID']] = raw if r['FileSize'] == r['ExtractSize'] else crilayla(raw)
        pos += r['FileSize'] + (align - r['FileSize'] % align) % align
    return out


def afs2(data):
    """{id da AWB: bytes do áudio}."""
    if data[:4] == b'CPK ':
        return itoc(data)
    if data[:4] != b'AFS2':
        return {}
    size, count, align = data[5], *struct.unpack('<IH', data[8:14])
    align = align or 32
    ids = struct.unpack(f'<{count}H', data[16:16 + 2 * count])
    table, fmt = 16 + 2 * count, {2: '<H', 4: '<I'}[size]
    offs = [struct.unpack(fmt, data[table + i * size:table + (i + 1) * size])[0] for i in range(count + 1)]
    return {ids[i]: data[offs[i] + (align - offs[i] % align) % align:offs[i + 1]] for i in range(count)}


def tlv_refs(cmd):
    """Alvos (tipo, índice) dos note-on de uma trilha do ACB."""
    pos, out = 0, []
    while pos + 3 <= len(cmd):
        code, size = struct.unpack_from('>HB', cmd, pos)
        if code in (2000, 2003) and size >= 4:
            out.append(struct.unpack_from('>HH', cmd, pos + 3))
        pos += 3 + size
    return out


def cue_waves(row):
    """{(índice do waveform): nome da cue}; a primeira cue que alcança o waveform dá o nome."""
    table = lambda k: read_utf(row[k]) if row.get(k) else []
    names = {n['CueIndex']: n['CueName'] for n in table('CueNameTable')}
    cues, synths, seqs, tracks, cmds = table('CueTable'), table('SynthTable'), table('SequenceTable'), table('TrackTable'), table('CommandTable')
    events = table('TrackEventTable') or cmds

    def walk(kind, i, seen):
        if (kind, i) in seen:
            return
        seen.add((kind, i))
        if kind == 1:
            yield i
        elif kind == 2 and i < len(synths):
            items = synths[i]['ReferenceItems'] or b''
            for k in range(0, len(items) - 3, 4):
                yield from walk(*struct.unpack_from('>HH', items, k), seen)
        elif kind == 3 and i < len(seqs):
            ids = seqs[i]['TrackIndex'] or b''
            for k in range(0, len(ids) - 1, 2):
                t = struct.unpack_from('>H', ids, k)[0]
                e = tracks[t].get('EventIndex', 0xFFFF) if t < len(tracks) else 0xFFFF
                if e < len(events):
                    for ref in tlv_refs(events[e].get('Command') or b''):
                        yield from walk(*ref, seen)

    out = {}
    for c, cue in enumerate(cues):
        for w in walk(cue['ReferenceType'], cue['ReferenceIndex'], set()):
            out.setdefault(w, names.get(c, ''))
    return out


def bank_lines(acb_path):
    """[(fala, cue, segundos, hca)] de um banco."""
    data = open(acb_path, 'rb').read()
    row = read_utf(data[data.find(b'@UTF'):])[0]
    memory = afs2(row['AwbFile'] or b'')
    awb = acb_path[:-4] + '.awb'
    stream = afs2(open(awb, 'rb').read()) if os.path.exists(awb) else {}
    waves = read_utf(row['WaveformTable']) if row['WaveformTable'] else []
    cues = cue_waves(row)
    used, out = set(), []
    for i, w in enumerate(waves):
        streaming = w.get('Streaming')
        wid = w.get('Id') if 'Id' in w else (w.get('StreamAwbId') if streaming else w.get('MemoryAwbId'))
        key = (bool(streaming), wid)
        if key in used:  # o mesmo áudio referido por dois waveforms
            continue
        used.add(key)
        hca = (stream if streaming else memory).get(wid)
        fala = f'{wid:03d}' if streaming else str(5000 + wid)
        secs = round(w['NumSamples'] / w['SamplingRate'], 2) if w.get('SamplingRate') else 0
        out.append((fala, cues.get(i, ''), secs, hca))
    return out


def bank_id(name):
    m = re.fullmatch(r'BT_([A-Z0-9]{3})_VC', name)
    return m[1] if m else name


def convert(job):
    hca, dest, ffmpeg = job
    if os.path.exists(dest) and os.path.getsize(dest):
        return None
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.adx' if hca[:1] == b'\x80' else '.hca') as f:
        f.write(hca)
        f.flush()
        tmp = dest + '.tmp.mp3'
        r = subprocess.run([ffmpeg, '-v', 'error', '-y', '-i', f.name, '-af', 'aresample=44100,asetnsamples=1152', '-ac', '1', '-b:a', '96k', tmp] if hca[:1] == b'\x80' else
                           [ffmpeg, '-v', 'error', '-y', '-i', f.name, '-ac', '1', '-b:a', '96k', tmp], capture_output=True)
    if r.returncode or not os.path.exists(tmp):
        if os.path.exists(tmp):
            os.remove(tmp)
        return dest, r.stderr.decode('utf-8', 'replace')[:200]
    os.replace(tmp, dest)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sound')
    ap.add_argument('out')
    ap.add_argument('--ffmpeg', default=os.path.expanduser('~/.local/bin/ffmpeg'))
    ap.add_argument('--jobs', type=int, default=os.cpu_count() or 4)
    ap.add_argument('--falas', help='ps3-voz-falas.json: texto das falas já transcritas')
    args = ap.parse_args()
    bancos, falhas, ignorados = {}, [], []
    jobs = []
    for base, _, files in os.walk(args.sound):
        rel = os.path.relpath(base, args.sound).split(os.sep)
        lang = LANGS.get(rel[0], 'jp')
        for file in sorted(f for f in files if f.endswith('.acb')):
            name = file[:-4]
            if SKIP.match(name):
                ignorados.append(name)
                continue
            try:
                lines = bank_lines(os.path.join(base, file))
            except Exception as e:
                falhas.append({'banco': os.path.join(*rel, file), 'erro': repr(e)[:200]})
                continue
            bank = bancos.setdefault(bank_id(name), {'pasta': rel[1] if lang != 'jp' and len(rel) > 1 else (rel[0] if rel[0] != '.' else ''), 'falas': {}})
            for fala, cue, secs, hca in lines:
                if hca is None or hca[:3] not in (b'HCA', b'\xc8\xc3\xc1') and hca[:1] != b'\x80':  # HCA (com ou sem máscara) ou ADX
                    falhas.append({'banco': name, 'lingua': lang, 'fala': fala, 'erro': 'stream ausente no disco' if hca is None else 'formato desconhecido'})
                    continue
                item = bank['falas'].setdefault(fala, {'cue': cue, 's': secs, 'langs': []})
                item['langs'].append(lang)
                item['cue'] = item['cue'] or cue
                jobs.append((hca, os.path.join(args.out, lang, bank_id(name), f'{fala}.mp3'), args.ffmpeg))
    with cf.ThreadPoolExecutor(args.jobs) as pool:
        for r in pool.map(convert, jobs, chunksize=16):
            if r:
                falhas.append({'arquivo': os.path.relpath(r[0], args.out), 'erro': r[1]})
    json.dump({'bancos': bancos}, open(os.path.join(args.out, 'bancos.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    falas = json.load(open(args.falas, encoding='utf-8')) if args.falas and os.path.exists(args.falas) else {}
    json.dump(indice(bancos, falas), open(os.path.join(args.out, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'arquivos': len(jobs), 'falhas': falhas, 'ignorados': sorted(set(ignorados))}, open(os.path.join(args.out, 'relatorio.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(bancos)} bancos, {len(jobs)} arquivos, {len(falhas)} falhas')
    return 1 if not jobs else 0


if __name__ == '__main__':
    sys.exit(main())
