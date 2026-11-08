"""Sculpture Studio · utilidades compartilhadas (Blender 4.5 LTS, bpy). Rodar sempre dentro do Blender:
  "~/Applications/Blender 4.5 LTS.app/Contents/MacOS/Blender" -b --factory-startup --python <script> -- [args]
Unidades em metros, Blender Z-up com a frente da estátua em -Y (o exportador glTF converte para Y-up, frente +Z).
"""
import math
import os
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / 'arena-forge' / 'assets' / 'poseidon-v13'
PREVIEW = ROOT / 'docs' / 'img' / 'sculpture-studio'
# Base anatômica CC0 (Blender Studio, "Human Base Meshes" v1.4.1). Fica fora do repositório; fetch_assets.py baixa e confere.
ASSETS = Path(os.environ.get('SSTCG_SCULPT_ASSETS', Path.home() / 'worktrees/sstcg-tools/downloads'))
BASE_BLEND = ASSETS / 'human-base-meshes-bundle-v1.4.1' / 'human_base_meshes_bundle.blend'


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.unit_settings.system = 'METRIC'
    return s


def link(o, coll=None):
    (coll or bpy.context.scene.collection).objects.link(o)
    return o


def collection(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c


def select_only(*objs, active=None):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active or (objs[0] if objs else None)


def apply_modifiers(o):
    """Aplica a pilha inteira avaliada (inclui armadura e multires no nível de render)."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    o.modifiers.clear()
    old = o.data
    o.data = me
    bpy.data.meshes.remove(old)
    return o


def mesh_from_bm(name, bm, coll=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me), coll)


def smooth(o, auto=True):
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def rot_about(pb, head_world, axis, deg, arm):
    """Gira um osso (e filhos) em volta de um eixo do mundo passando pela cabeça do osso."""
    R = Matrix.Translation(head_world) @ Matrix.Rotation(math.radians(deg), 4, Vector(axis).normalized()) @ Matrix.Translation(-head_world)
    inv = arm.matrix_world.inverted()
    pb.matrix = inv @ R @ arm.matrix_world @ pb.matrix
    bpy.context.view_layer.update()
