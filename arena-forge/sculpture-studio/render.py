"""Sculpture Studio · renders de revisão: turnaround ortográfico (frente, costas, laterais), 3/4 e closes.
Workbench com cavidade = leitura de escultura em argila; EEVEE = materiais."""
import math
from pathlib import Path

import bpy
from mathutils import Vector

from common import link

VIEWS = {  # direção de onde a câmera olha (frente da estátua = -Y)
    'frente': (0, -1, 0), 'costas': (0, 1, 0), 'esquerda': (1, 0, 0), 'direita': (-1, 0, 0), 'tres-quartos': (-0.7, -1, 0.18),
}


def bbox(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def setup(engine='clay', size=(1200, 1600)):
    s = bpy.context.scene
    s.render.resolution_x, s.render.resolution_y = size
    s.render.film_transparent = False
    if engine == 'clay':
        s.render.engine = 'BLENDER_WORKBENCH'
        sh = s.display.shading
        sh.light, sh.color_type, sh.single_color = 'STUDIO', 'SINGLE', (0.82, 0.8, 0.76)
        sh.show_cavity, sh.cavity_type, sh.show_shadows = True, 'BOTH', True
        sh.background_type = 'VIEWPORT'
        sh.background_color = (0.05, 0.07, 0.1)
    else:
        s.render.engine = 'BLENDER_EEVEE_NEXT'
        s.eevee.taa_render_samples = 32
        w = s.world or bpy.data.worlds.new('W')
        s.world = w
        w.use_nodes = True
        w.node_tree.nodes['Background'].inputs[0].default_value = (0.03, 0.08, 0.12, 1)
        w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
        if not bpy.data.objects.get('KEY'):
            for name, rot, e, c in [('KEY', (0.9, 0.2, -0.6), 4.5, (1, 0.96, 0.9)), ('RIM', (1.2, 0, 2.6), 3, (0.55, 0.85, 1)), ('FILL', (1.3, 0, -2.2), 1.2, (0.6, 0.75, 1))]:
                L = link(bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN')))
                L.data.energy, L.data.color, L.rotation_euler = e, c, rot
    return s


def camera(s):
    cam = bpy.data.objects.get('REVIEW_CAM') or link(bpy.data.objects.new('REVIEW_CAM', bpy.data.cameras.new('REVIEW_CAM')))
    s.camera = cam
    return cam


def shoot(objs, out, view, ortho=True, focus=None, scale=None, engine='clay', size=(1200, 1600)):
    s = setup(engine, size)
    cam = camera(s)
    lo, hi = bbox(objs)
    c = (lo + hi) / 2 if focus is None else Vector(focus)
    d = Vector(VIEWS[view]).normalized()
    span = scale or max(hi.z - lo.z, (hi.x - lo.x) * size[1] / size[0], (hi.y - lo.y) * size[1] / size[0]) * 1.08
    cam.data.type = 'ORTHO' if ortho else 'PERSP'
    cam.data.ortho_scale = span
    cam.data.lens = 50
    cam.data.clip_end = 1000
    cam.location = c + d * (span * 2.2)
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    s.render.filepath = str(out)
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)
    return out


def turnaround(objs, prefix, engine='clay'):
    return [shoot(objs, f'{prefix}-{v}.png', v, ortho=v != 'tres-quartos', engine=engine) for v in VIEWS]
