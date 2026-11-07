#!/usr/bin/env python3
"""Install approved Poseidon Master Artboard from a user-provided local file.
No remote downloads, no replacement without explicit --replace.
"""
from pathlib import Path
import argparse, hashlib, json, shutil
EXPECTED='731f3c622ae65d51bef658880657f0f34be0d132a30d3071816a70029ff6b624'
ROOT=Path(__file__).resolve().parent
DEST=ROOT/'references'/'poseidon-master-artboard.jpg'
MANIFEST=ROOT/'poseidon-asset-breakdown.json'
CAMERA=ROOT/'poseidon-camera-manifest.json'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('source',type=Path,help='Downloaded poseidon_master_artboard_reference.jpg')
    ap.add_argument('--replace',action='store_true')
    args=ap.parse_args()
    src=args.source.expanduser().resolve()
    if not src.is_file(): ap.error(f'Arquivo não encontrado: {src}')
    got=sha(src)
    if got!=EXPECTED: ap.error(f'Hash divergente: {got}; esperado {EXPECTED}. Não instalando.')
    if DEST.exists() and not args.replace:
        if sha(DEST)==EXPECTED: print(f'Já instalado: {DEST}'); return
        ap.error('Destino existente diferente. Use --replace explicitamente após conferir.')
    DEST.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(src,DEST)
    if sha(DEST)!=EXPECTED: raise RuntimeError('Checksum pós-cópia falhou')
    for path in (MANIFEST,CAMERA):
        if path.exists():
            data=json.loads(path.read_text())
            if path==MANIFEST:
                data['artboard']['installed']=True
            else:
                data['sourceArtboard']['status']='installed_sha256_verified'
                data['sourceArtboard']['sha256']=EXPECTED
            path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('Master Artboard instalado e validado:',DEST)
if __name__=='__main__': main()
