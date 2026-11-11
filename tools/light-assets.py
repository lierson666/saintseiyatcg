"""Gera as versões leves (WebP) das imagens do jogo. Auditoria de performance, fase 1 (docs/auditoria-performance.md).
Rodar antes de cada deploy e depois de importar artes:  python3 tools/light-assets.py
Incremental: só reconverte o que mudou. Os originais ficam intactos (Card Forge e Layout Studio continuam usando eles).

- card-forge/art-web/*.jpg -> art-web/webp/<nome>.webp (lado maior até 1024 px, campo e mão no desktop), touch/ (640 px, toque),
  thumb/ (320 px) e zoom/ (2048 px, carta em tela cheia; só quando a arte passa de 1024 px),
  mais art-web/light.json com a lista do que existe (shared/light-art.js só troca a URL quando a versão leve existe).
- CARD-TEMPLATE/**/*.png e playtest/divine/assets/god-frames/*.png -> .webp ao lado, mesmo tamanho (molduras e peças).
- CARD-TEMPLATE/**/*.png -> .sm.webp ao lado, metade do tamanho, para aparelhos de toque.
Artes -ref (provisórias) entram também: o deploy já as filtra pelo nome."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'card-forge/art-web'
SIZES = {'webp': (1024, 82), 'touch': (640, 82), 'thumb': (320, 78), 'zoom': (2048, 84)}  # pasta: (lado maior, qualidade)


def stale(src, dst):
    return not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime


def save(src, dst, side=None, quality=88):
    img = Image.open(src)
    img = img.convert('RGBA' if img.mode in ('RGBA', 'LA', 'P') else 'RGB')
    if side and max(img.size) > side:
        img.thumbnail((side, side), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, 'WEBP', quality=quality, method=6, alpha_quality=100)


def main():
    made, before, after = 0, 0, 0
    light = {}
    for size, (side, q) in SIZES.items():
        light[size] = []
        for src in sorted(ART.glob('*.jpg')):
            if size == 'zoom' and max(Image.open(src).size) <= SIZES['webp'][0]:
                continue  # igual à webp/: shared/light-art.js fica nela
            dst = ART / size / f'{src.stem}.webp'
            if stale(src, dst):
                save(src, dst, side, q); made += 1
            light[size].append(src.stem)
            if size == 'webp':
                before += src.stat().st_size; after += dst.stat().st_size
    # Hash da arte na URL: .webp não tem Cache-Control no servidor, e o navegador segue mostrando a imagem antiga sem ele.
    light['rev'] = {src.stem: hashlib.md5(src.read_bytes()).hexdigest()[:8] for src in ART.glob('*.jpg')}
    (ART / 'light.json').write_text(json.dumps(light, separators=(',', ':')))

    frames = [*ROOT.glob('CARD-TEMPLATE/**/*.png'), *ROOT.glob('playtest/divine/assets/god-frames/*.png')]
    # Aparelho de toque: peças da carta pela metade (.sm.webp); a 1488 px cada uma, a mão trava num tablet (shared/live-card.js escolhe).
    for src in ROOT.glob('CARD-TEMPLATE/**/*.png'):
        dst = src.with_suffix('.sm.webp')
        if stale(src, dst):
            side = max(Image.open(src).size)
            save(src, dst, side // 2 if side > 600 else None); made += 1
        # Celular: mão a 114 px em tela 3x pede 342 px; um quarto do tamanho, 16 vezes menos memória (playtest/divine/app.js escolhe).
        dst = src.with_suffix('.xs.webp')
        if stale(src, dst):
            side = max(Image.open(src).size)
            save(src, dst, side // 4 if side > 1200 else side // 2 if side > 300 else None); made += 1
    for src in frames:
        dst = src.with_suffix('.webp')
        if stale(src, dst):
            save(src, dst); made += 1
        before += src.stat().st_size; after += dst.stat().st_size

    # Auto-checagem: toda arte e toda peça têm a versão leve.
    assert all((ART / s / f'{n}.webp').exists() for s in SIZES for n in light[s])
    assert all(f.with_suffix('.webp').exists() for f in frames)
    print(f'{made} convertidas · {before / 1048576:.1f} MB -> {after / 1048576:.1f} MB')


if __name__ == '__main__':
    main()
