"""Guardian of the Tides · manto grego por simulação de pano (Blender Cloth).
Duas peças numa malha só (TIDES__CLOTH): o himátion enrolado no quadril e a aba sobre o ombro esquerdo,
que desce pelas costas e termina na mão esquerda, que segura a borda.
O corpo anima do repouso até a pose durante a simulação; assim o pano nunca nasce dentro do corpo
e as dobras saem da gravidade, do contato e do movimento — não de desenho manual.
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector

from common import link, mesh_from_bm, select_only

POSE_FRAMES = 40   # repouso → pose
SETTLE = 140       # quadro final (pano assentado)


def bake_pose_animation(arm):
    """Guarda a pose atual como chave no quadro POSE_FRAMES e o repouso no quadro 1."""
    s = bpy.context.scene
    s.frame_start, s.frame_end = 1, SETTLE
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        final = pb.matrix_basis.copy()
        loc, rot, _ = final.decompose()
        pb.location, pb.rotation_quaternion = (0, 0, 0), (1, 0, 0, 0)
        pb.keyframe_insert('location', frame=1); pb.keyframe_insert('rotation_quaternion', frame=1)
        pb.location, pb.rotation_quaternion = loc, rot
        pb.keyframe_insert('location', frame=POSE_FRAMES); pb.keyframe_insert('rotation_quaternion', frame=POSE_FRAMES)
    for fc in arm.animation_data.action.fcurves:
        for k in fc.keyframe_points:
            k.interpolation = 'BEZIER'; k.easing = 'EASE_IN_OUT'


def collision_proxy(body, arm):
    """Cópia leve do corpo (sem multires) que deforma com a armadura e serve de colisor."""
    me = body.data.copy()
    proxy = link(bpy.data.objects.new('TIDES_COLLIDER', me))
    for g in body.vertex_groups:
        proxy.vertex_groups.new(name=g.name)
    # vertex groups vêm junto com a malha (dados por vértice), só os nomes precisam existir no objeto
    m = proxy.modifiers.new('arm', 'ARMATURE'); m.object = arm
    c = proxy.modifiers.new('col', 'COLLISION')
    proxy.collision.thickness_outer = 0.006
    proxy.collision.cloth_friction = 8.0
    proxy.hide_render = True
    return proxy


def _envelope(co, z, nb=72, band=0.02, cx=0.0, cy=0.0):
    """Raio máximo do corpo por ângulo numa faixa de altura (o contorno visto de cima)."""
    s = co[(np.abs(co[:, 2] - z) < band) & (np.abs(co[:, 0]) < 0.21)]   # só tronco e pernas (braços em A ficam fora)
    ang = np.arctan2(s[:, 1] - cy, s[:, 0] - cx)
    r = np.hypot(s[:, 0] - cx, s[:, 1] - cy)
    out = np.zeros(nb)
    idx = ((ang + math.pi) / (2 * math.pi) * nb).astype(int) % nb
    np.maximum.at(out, idx, r)
    for _ in range(3):  # fecha buracos e suaviza
        out = np.maximum(out, (np.roll(out, 1) + np.roll(out, -1)) / 2 * 0.98)
    return out


def hip_wrap(bm, co, groups, top=1.0, bottom=0.36, rows=66, nb=128):
    """Tubo do himátion: anel justo na cintura, abrindo para baixo sem nunca estreitar (cai como saia)."""
    env = None
    ring_prev = None
    first = []
    for i in range(rows):
        z = top - (top - bottom) * i / (rows - 1)
        e = _envelope(co, z, nb, cy=0.0)
        env = e if env is None else np.maximum(env, e)
        depth = (top - z) / (top - bottom)
        r = env + 0.014 + 0.22 * depth ** 1.0          # pano sobrando para dobrar
        ring = []
        for j in range(nb):
            a = -math.pi + (j + .5) * 2 * math.pi / nb
            v = bm.verts.new((r[j] * math.cos(a), r[j] * math.sin(a), z))
            ring.append(v)
            if i < 2: groups.setdefault('root', []).append(v)
        if ring_prev:
            for j in range(nb):
                bm.faces.new((ring_prev[j], ring_prev[(j + 1) % nb], ring[(j + 1) % nb], ring[j]))
        ring_prev = ring


def _path(points, n):
    """Reamostra uma polilinha suavizada (Catmull-Rom) em n pontos de passo igual."""
    P = [Vector(p) for p in points]
    dense = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)]
        for k in range(20):
            t = k / 20
            dense.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    dense.append(P[-1])
    L = np.cumsum([0] + [(dense[i + 1] - dense[i]).length for i in range(len(dense) - 1)])
    out = []
    for s in np.linspace(0, L[-1], n):
        i = min(int(np.searchsorted(L, s, side='right')) - 1, len(dense) - 2)
        f = (s - L[i]) / max(L[i + 1] - L[i], 1e-9)
        out.append(dense[i].lerp(dense[i + 1], f))
    return out


SHOULDER_PATH = [  # da mão esquerda (frente), sobe ao ombro, desce pelas costas em diagonal até a panturrilha direita
    (0.43, -0.15, 0.80), (0.33, -0.15, 1.08), (0.20, -0.13, 1.36), (0.16, -0.02, 1.50),
    (0.13, 0.11, 1.40), (0.05, 0.17, 1.10), (-0.04, 0.19, 0.75), (-0.10, 0.21, 0.42),
]


def shoulder_mantle(bm, groups, width=0.40, rows=110, cols=34, hand=(0.40, -0.10, 0.84)):
    pts = _path(SHOULDER_PATH, rows)
    side = Vector((1, 0, 0))
    grid = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, rows - 1)] - pts[max(i - 1, 0)]).normalized()
        w = (side - t * side.dot(t)).normalized()
        row = []
        for j in range(cols):
            f = j / (cols - 1) - 0.42           # assimétrico: mais pano para fora (braço) que para o pescoço
            v = bm.verts.new(p + w * (f * width))
            row.append(v)
            q = v.co
            if (q - Vector((0.12, 0.0, 1.47))).length < 0.05 and q.z > 1.42:
                groups.setdefault('chest', []).append(v)
            if i < 4 and (q - Vector(hand)).length < 0.07:
                groups.setdefault('hand.L', []).append(v)
        grid.append(row)
    for i in range(rows - 1):
        for j in range(cols - 1):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))


def build_cloth(body, arm, frames=SETTLE):
    """Cria e simula o manto. Retorna o objeto final (já aplicado, sem modificadores)."""
    co = np.array([v.co[:] for v in body.data.vertices])  # repouso
    bm = bmesh.new()
    groups = {}
    hip_wrap(bm, co, groups)
    shoulder_mantle(bm, groups)
    bm.verts.index_update()
    pins = {name: [v.index for v in vs] for name, vs in groups.items()}
    cloth = mesh_from_bm('TIDES__CLOTH', bm)
    for g in cloth.vertex_groups[:]:
        cloth.vertex_groups.remove(g)
    pin = cloth.vertex_groups.new(name='pin')
    allv = list(range(len(cloth.data.vertices)))
    # todos os vértices seguem a raiz na armadura (só os presos importam: os livres são simulados)
    follow = {n: cloth.vertex_groups.new(name=n) for n in ('root', 'chest', 'hand.L')}
    pinned = set()
    for name, idx in pins.items():
        follow[name].add(idx, 1.0, 'REPLACE'); pin.add(idx, 1.0, 'REPLACE'); pinned.update(idx)
    follow['root'].add([i for i in allv if i not in pinned], 1.0, 'REPLACE')
    am = cloth.modifiers.new('arm', 'ARMATURE'); am.object = arm
    cm = cloth.modifiers.new('cloth', 'CLOTH')
    st = cm.settings
    st.quality = 10
    st.mass = 0.6
    st.tension_stiffness = st.compression_stiffness = 20
    st.shear_stiffness = 8
    st.bending_stiffness = 0.12         # lã pesada: dobras largas e fundas
    st.air_damping = 2.0
    st.vertex_group_mass = 'pin'
    st.pin_stiffness = 3.0
    cs = cm.collision_settings
    cs.collision_quality = 5
    cs.distance_min = 0.005
    cs.use_self_collision = True
    cs.self_distance_min = 0.004
    cs.self_friction = 8
    cm.point_cache.frame_start, cm.point_cache.frame_end = 1, frames
    s = bpy.context.scene
    for f in range(1, frames + 1):
        s.frame_set(f)
    return cloth


def finish_cloth(cloth, thickness=0.009):
    """Aplica a simulação, dá espessura de pedra esculpida e suaviza a superfície."""
    from common import apply_modifiers
    apply_modifiers(cloth)
    for g in cloth.vertex_groups[:]:
        cloth.vertex_groups.remove(g)
    sm = cloth.modifiers.new('relax', 'CORRECTIVE_SMOOTH'); sm.iterations = 4; sm.use_only_smooth = True
    so = cloth.modifiers.new('solid', 'SOLIDIFY'); so.thickness = thickness; so.offset = 1; so.use_rim = True; so.use_even_offset = True
    sd = cloth.modifiers.new('sub', 'SUBSURF'); sd.levels = sd.render_levels = 1
    return cloth
