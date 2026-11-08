#!/usr/bin/env python3
"""Sculpture Studio · baixa e confere a base anatômica CC0 (fora do repositório).

python3 arena-forge/sculpture-studio/fetch_assets.py
Destino: $SSTCG_SCULPT_ASSETS (padrão ~/worktrees/sstcg-tools/downloads). Confere o SHA-256 antes de extrair.
Fonte: Blender Studio, "Human Base Meshes" v1.4.1, licença CC0 (domínio público).
"""
import hashlib
import os
import sys
import urllib.request
import zipfile
from pathlib import Path

URL = 'https://download.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip'
SHA256 = '811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515'
DEST = Path(os.environ.get('SSTCG_SCULPT_ASSETS', Path.home() / 'worktrees/sstcg-tools/downloads'))


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    z = DEST / 'human-base-meshes-bundle-v1.4.1.zip'
    if not z.exists():
        print('baixando', URL)
        urllib.request.urlretrieve(URL, z)
    h = hashlib.sha256(z.read_bytes()).hexdigest()
    if h != SHA256:
        z.unlink()
        sys.exit(f'SHA-256 não confere ({h}); arquivo apagado')
    out = DEST / 'human-base-meshes-bundle-v1.4.1'
    if not (out / 'human_base_meshes_bundle.blend').exists():
        with zipfile.ZipFile(z) as f:
            for n in f.namelist():   # extração segura: nada fora da pasta de destino
                if n.startswith('/') or '..' in Path(n).parts:
                    sys.exit(f'caminho suspeito no zip: {n}')
            f.extractall(out)
    print('ok', out)


if __name__ == '__main__':
    main()
