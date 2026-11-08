"""Sculpture Studio · quality gate em argila, V13 × V14 com a MESMA câmera, escala e luz.

Rodar uma vez por versão (o enquadramento é fixo, não depende da caixa do modelo):
  Blender -b --factory-startup --python arena-forge/sculpture-studio/gate_compare.py -- <arquivo.blend> <tag>
Grava docs/img/sculpture-studio/v14/compare/<tag>-<vista>.png. Depois, fora do Blender:
  python3 arena-forge/sculpture-studio/gate_compare.py --sheet   (monta as folhas lado a lado)
V14.1: acrescente a pasta de saída e, nas folhas, as duas versões:
  ... gate_compare.py -- <arquivo.blend> v14-1 docs/img/sculpture-studio/v14-1/compare
  python3 ... gate_compare.py --sheet v14 v14-1 docs/img/sculpture-studio/v14-1/compare
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUTDIR = HERE.parents[1] / 'docs/img/sculpture-studio/v14/compare'
# (vista, foco em unidades do corpo base, escala ortográfica; None = perspectiva 3/4 com o mesmo foco)
FULL_FOCUS, FULL_SCALE = (-0.03, -0.17, 0.92), 3.3
SHOTS = [
    ('frente', 'frente', FULL_FOCUS, FULL_SCALE, True), ('costas', 'costas', FULL_FOCUS, FULL_SCALE, True),
    ('esquerda', 'esquerda', FULL_FOCUS, FULL_SCALE, True), ('direita', 'direita', FULL_FOCUS, FULL_SCALE, True),
    ('tres-quartos', 'tres-quartos', FULL_FOCUS, FULL_SCALE, False),
    ('torso-frente', 'frente', (0.0, -0.05, 1.28), 0.75, True),
    ('rosto-frente', 'frente', None, 0.30, True), ('rosto-tres-quartos', 'tres-quartos', None, 0.30, False),
    ('rosto-perfil', 'direita', None, 0.30, True),
    ('mao-direita', 'tres-quartos', 'gripR', 0.30, False), ('mao-esquerda', 'tres-quartos', 'handL', 0.30, False),
    ('pedestal', 'tres-quartos', (0.0, -0.17, -0.2), 1.5, False), ('pedestal-frente', 'frente', (0.0, -0.17, -0.25), 1.2, True),
    # V14.1: nuca, mão esquerda de frente e onda alta de lado e de trás
    ('rosto-costas', 'costas', None, 0.30, True), ('mao-esquerda-frente', 'frente', 'handL', 0.30, True),
    ('onda-lado', 'esquerda', (0.3, -0.05, 0.12), 0.6, True), ('onda-costas', 'costas', (0.3, -0.05, 0.12), 0.6, True),
]


def render(blend, tag, outdir=OUTDIR):
    sys.path.insert(0, str(HERE))
    import bpy
    from mathutils import Vector
    from render import shoot
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    s = bpy.context.scene; s.frame_set(s.frame_end)
    O = bpy.data.objects
    body = O['TIDES__BODY']
    mr = next((m for m in body.modifiers if m.type == 'MULTIRES'), None)
    if mr: mr.levels = 2                                 # V13: mesmo nível do multires que a V14 aplicou
    if O.get('TIDES_COLLIDER'): O['TIDES_COLLIDER'].hide_render = True
    show = [o for o in O if o.type == 'MESH' and o.name != 'TIDES_COLLIDER']
    arm = O['TIDES_RIG']; M = arm.matrix_world; pb = arm.pose.bones
    head = M @ pb['head'].head + Vector((0, -0.04, 0.06))
    from guardian_tides_body import grip_axis
    foci = {None: head, 'gripR': grip_axis(arm, 'R')[0], 'handL': M @ pb['hand.L'].head.lerp(pb['hand.L'].tail, 0.6)}
    outdir.mkdir(parents=True, exist_ok=True)
    for name, view, focus, scale, ortho in SHOTS:
        f = foci[focus] if (focus is None or isinstance(focus, str)) else Vector(focus)
        size = (1000, 1500) if scale == FULL_SCALE else (900, 900)
        shoot(show, outdir / f'{tag}-{name}.png', view, ortho=ortho, focus=f, scale=scale, size=size)
    print('GATE', tag, 'ok')


def sheet(va='v13', vb='v14', outdir=OUTDIR):
    from PIL import Image, ImageDraw
    names = [n for n, *_ in SHOTS]
    for n in names:
        if not (outdir / f'{va}-{n}.png').exists(): continue      # quadros acrescentados depois (V14.1)
        a, b = Image.open(outdir / f'{va}-{n}.png'), Image.open(outdir / f'{vb}-{n}.png')
        o = Image.new('RGB', (a.width * 2 + 10, a.height + 44), (12, 14, 20))
        o.paste(a, (0, 44)); o.paste(b, (a.width + 10, 44))
        d = ImageDraw.Draw(o)
        d.text((12, 12), f'{va.upper()} · {n}', fill=(214, 181, 116)); d.text((a.width + 22, 12), f'{vb.upper()} · {n}', fill=(214, 181, 116))
        o.save(outdir.parent / f'compare-{n}.png')
    # folha geral (5 vistas inteiras, V13 em cima, V14 embaixo)
    full = names[:5]
    ims = [[Image.open(outdir / f'{t}-{n}.png').resize((400, 600)) for n in full] for t in (va, vb)]
    o = Image.new('RGB', (400 * 5, 1200), (12, 14, 20))
    for r, row in enumerate(ims):
        for c, im in enumerate(row): o.paste(im, (c * 400, r * 600))
    o.save(outdir.parent / 'compare-folha-corpo.png')
    print('folhas em', outdir.parent)


if __name__ == '__main__':
    if '--sheet' in sys.argv:
        a = sys.argv[sys.argv.index('--sheet') + 1:]
        sheet(*a[:2], Path(a[2]).resolve()) if a else sheet()
    else:
        argv = sys.argv[sys.argv.index('--') + 1:]
        render(Path(argv[0]), argv[1], *(Path(argv[2]).resolve(),) if len(argv) > 2 else ())
