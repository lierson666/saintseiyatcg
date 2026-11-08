"""Sculpture Studio · renders do quality gate (argila, sem material): frente, costas, laterais, 3/4, rosto e mãos.
Rodar: Blender -b --factory-startup --python arena-forge/sculpture-studio/gate_renders.py
Lê WORK/guardian-tides-sculpt.blend (high poly) e grava em docs/img/sculpture-studio/.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from mathutils import Vector

from common import PREVIEW
from guardian_tides_build import WORK
from guardian_tides_drapery import SETTLE
from render import VIEWS, shoot

bpy.ops.wm.open_mainfile(filepath=str(WORK / 'guardian-tides-sculpt.blend'))
s = bpy.context.scene; s.frame_set(SETTLE)
O = bpy.data.objects
body = O['TIDES__BODY']
mr = next(m for m in body.modifiers if m.type == 'MULTIRES'); mr.levels = 2
for n in ('TIDES_COLLIDER', 'REVIEW_CAM'):
    if O.get(n): O[n].hide_render = True
show = [o for o in O if o.type == 'MESH' and o.name != 'TIDES_COLLIDER']
PREVIEW.mkdir(parents=True, exist_ok=True)
for v in VIEWS:
    shoot(show, PREVIEW / f'clay-{v}.png', v, ortho=v != 'tres-quartos', size=(1200, 1800))
arm = O['TIDES_RIG']; M = arm.matrix_world; pb = arm.pose.bones
head = M @ pb['head'].head + Vector((0, -0.03, 0.07))
shoot(show, PREVIEW / 'clay-rosto-frente.png', 'frente', focus=head, scale=0.36, size=(1000, 1000))
shoot(show, PREVIEW / 'clay-rosto-tres-quartos.png', 'tres-quartos', ortho=False, focus=head, scale=0.36, size=(1000, 1000))
import json
meta = json.loads(s['tides_meta'])
g = Vector(meta['grip_center'])
shoot(show, PREVIEW / 'clay-mao-tridente.png', 'tres-quartos', ortho=False, focus=g, scale=0.32, size=(1000, 1000))
shoot(show, PREVIEW / 'clay-mao-tridente-frente.png', 'frente', focus=g, scale=0.32, size=(1000, 1000))
hl = M @ pb['hand.L'].head
shoot(show, PREVIEW / 'clay-mao-manto.png', 'tres-quartos', ortho=False, focus=hl, scale=0.36, size=(1000, 1000))
print('GATE ok', PREVIEW)
