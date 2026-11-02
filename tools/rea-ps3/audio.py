#!/usr/bin/env python3
"""Extrai áudio HCA de ACB/AWB (AFS2) para MP3 mono, numerado na ordem do banco.

Uso: audio.py <arquivo.acb|.awb> <pasta de saída> [--ffmpeg caminho]
Fora do Git e só para uso atrás do login: o áudio é da Bandai Namco e da Toei (docs/rea-soldiers-soul.md).
"""
import argparse, os, struct, subprocess, sys, tempfile


def streams(data):
    """Streams HCA do primeiro cabeçalho AFS2; o ACB de efeitos traz o AWB embutido."""
    base = data.find(b'AFS2')
    if base < 0:
        return []
    size, count, align = data[base + 5], *struct.unpack('<IH', data[base + 8:base + 14])
    align = align or 32
    table = base + 16 + 2 * count
    fmt = {2: '<H', 4: '<I'}[size]
    offsets = [struct.unpack(fmt, data[table + i * size:table + (i + 1) * size])[0] for i in range(count + 1)]
    out = []
    for i in range(count):
        start = base + offsets[i] + (align - offsets[i] % align) % align
        out.append(data[start:base + offsets[i + 1]])
    return [s for s in out if s[:3] == b'HCA' or s[:3] == bytes(b & 0x7f for b in b'HCA')]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('source')
    ap.add_argument('out')
    ap.add_argument('--ffmpeg', default=os.path.expanduser('~/.local/bin/ffmpeg'))
    args = ap.parse_args()
    items = streams(open(args.source, 'rb').read())
    os.makedirs(args.out, exist_ok=True)
    failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        for i, hca in enumerate(items):
            src = os.path.join(tmp, f'{i}.hca')
            with open(src, 'wb') as f:
                f.write(hca)
            r = subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-i', src, '-ac', '1', '-b:a', '96k', os.path.join(args.out, f'{i:03d}.mp3')], capture_output=True)
            failed += r.returncode != 0
    print(f'{os.path.basename(args.source)}: {len(items)} streams, {failed} falhas')
    return 1 if failed or not items else 0


if __name__ == '__main__':
    sys.exit(main())
