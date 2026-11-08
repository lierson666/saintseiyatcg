"""Sculpture Studio · folha lado a lado de duas esculturas (mesma câmera e escala), fora do Blender.

  python3 arena-forge/sculpture-studio/sheet_ab.py <pasta> <tag-esquerda> <tag-direita> [vistas...]
Lê <pasta>/<tag>-<modo>-<vista>.png (modo = silhueta e argila, como sculpt_kit.silhouette_shots grava) e grava
<pasta>/folha-ab-<modo>-<vista>.png. No palácio, a escultura da esquerda do mundo vai à esquerda da folha.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main(folder, a, b, views=('frente', 'tres-quartos', 'esquerda', 'costas')):
    folder = Path(folder)
    for mode in ('silhueta', 'argila'):
        for v in views:
            ia, ib = Image.open(folder / f'{a}-{mode}-{v}.png').convert('RGB'), Image.open(folder / f'{b}-{mode}-{v}.png').convert('RGB')
            o = Image.new('RGB', (ia.width + ib.width, ia.height + 40), (12, 14, 20))
            o.paste(ia, (0, 40)); o.paste(ib, (ia.width, 40))
            d = ImageDraw.Draw(o)
            d.text((12, 12), f'{a} · {mode} · {v}', fill=(214, 181, 116)); d.text((ia.width + 12, 12), f'{b} · {mode} · {v}', fill=(214, 181, 116))
            o.save(folder / f'folha-ab-{mode}-{v}.png')
    print('folhas em', folder)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], *([sys.argv[4:]] if len(sys.argv) > 4 else []))
