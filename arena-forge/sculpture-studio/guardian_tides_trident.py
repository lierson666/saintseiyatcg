"""Guardian of the Tides · tridente cerimonial de ouro antigo.
Cabo torneado (perfil girado), colar com anéis e flor de concha, travessa em crescente e três pontas farpadas.
Construído num referencial local (Z = eixo do cabo) e alinhado ao eixo medido dentro do punho (grip_axis).
Unidades do corpo base; a escala monumental entra na montagem.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

from common import link, mesh_from_bm

SHAFT_R = 0.012


def lathe(bm, profile, segs=32):
    """Gira um perfil (r, z) em volta de Z. Retorna a lista de anéis."""
    rings = []
    for r, z in profile:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)]
        if rings:
            a = rings[-1]
            for k in range(segs):
                bm.faces.new((a[k], a[(k + 1) % segs], ring[(k + 1) % segs], ring[k]))
        rings.append(ring)
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    return rings


def shaft_profile(length):
    """Ponteira em baixo, cabo liso com anéis espaçados e o colar ornamentado no alto."""
    R = SHAFT_R
    p = [(0.0, 0.0), (R * .55, 0.004), (R * 1.25, 0.03), (R * 1.5, 0.05), (R * 1.15, 0.065), (R * 1.35, 0.08), (R, 0.095)]
    z = 0.095
    collar = length - 0.20
    step = 0.32
    while z + step < collar - 0.1:
        z += step
        p += [(R, z - 0.012), (R * 1.3, z - 0.006), (R * 1.3, z + 0.006), (R, z + 0.012)]
    # colar: anéis, bulbo e flor de concha que segura a travessa
    p += [(R, collar), (R * 1.45, collar + 0.01), (R * 1.2, collar + 0.022), (R * 1.9, collar + 0.05),
          (R * 2.1, collar + 0.075), (R * 1.6, collar + 0.1), (R * 1.25, collar + 0.115), (R * 1.7, collar + 0.13),
          (R * 1.5, collar + 0.145), (R * 1.1, collar + 0.16)]
    return p, collar + 0.16


def tube_along(points, radii, segs=14, name='tube'):
    """Tubo afunilado ao longo de pontos 3D (para as pontas e a travessa)."""
    bm = bmesh.new()
    rings = []
    a = None
    for i, p in enumerate(points):
        t = (points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]).normalized()
        a = t.orthogonal().normalized() if a is None else (a - t * a.dot(t)).normalized()   # transporte paralelo: sem torção
        b = t.cross(a)
        ring = [bm.verts.new(p + (a * math.cos(2 * math.pi * k / segs) + b * math.sin(2 * math.pi * k / segs)) * radii[i]) for k in range(segs)]
        if rings:
            r0 = rings[-1]
            for k in range(segs):
                bm.faces.new((r0[k], r0[(k + 1) % segs], ring[(k + 1) % segs], ring[k]))
        rings.append(ring)
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    return bm


def _loft(bm, sections):
    """Fecha uma sequência de seções (listas de pontos com o mesmo número de vértices) num sólido."""
    rings = [[bm.verts.new(p) for p in sec] for sec in sections]
    n = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for k in range(n):
            bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    bm.faces.new(list(reversed(rings[0])))
    tip = bm.verts.new(sum((v.co for v in rings[-1]), Vector()) / n)
    for k in range(n):
        bm.faces.new((rings[-1][k], rings[-1][(k + 1) % n], tip))


def _diamond(c, side, depth, w, th):
    return [c + side * w, c + depth * th, c - side * w, c - depth * th]


def blade(bm, base, up, side, length, width, barb=True, steps=10):
    """Ponta de lança em losango (sólido), com espinha central e duas farpas voltadas para trás."""
    up, side = up.normalized(), side.normalized()
    depth = up.cross(side).normalized()
    secs = []
    for k in range(steps):
        y = length * k / steps
        f = y / length
        w = width * (0.35 + 0.65 * math.sin(min(f / 0.22, 1) * math.pi / 2)) * (1 - f) ** 0.8
        secs.append(_diamond(base + up * y, side, depth, max(w, 1e-4), width * 0.26 * (1 - f) ** 0.9 + 1e-4))
    _loft(bm, secs)
    if barb:
        for sx in (1, -1):
            root = base + up * (length * 0.14) + side * (sx * width * 0.55)
            d = (side * sx * 0.55 - up).normalized()          # farpa para fora e para trás
            dd = d.cross(depth).normalized()
            _loft(bm, [_diamond(root + d * (0.035 * k / 4), dd, depth, width * 0.22 * (1 - k / 4) + 1e-4, width * 0.12 * (1 - k / 4) + 1e-4) for k in range(4)])


def build_trident(center, axis, length=2.44, ground=0.0):
    """Monta o tridente com o cabo passando por `center` na direção `axis` e a ponteira em z = `ground`."""
    axis = Vector(axis).normalized()
    t0 = (ground - center.z) / axis.z
    butt = center + axis * t0
    bm = bmesh.new()
    prof, head_z = shaft_profile(length - 0.34)
    lathe(bm, prof)
    X, Y = Vector((1, 0, 0)), Vector((0, 1, 0))
    # travessa em crescente: sai do colar e curva para cima nas pontas laterais
    for sx in (1, -1):
        th = [math.pi / 2 * k / 15 for k in range(16)]          # quarto de elipse: sai na horizontal, termina na vertical
        pts = [Vector((sx * 0.135 * math.sin(t), 0, head_z - 0.02 + 0.09 * (1 - math.cos(t)))) for t in th]
        pts += [Vector((sx * 0.135, 0, head_z + 0.07 + 0.02 * k)) for k in range(1, 3)]
        rad = [0.016 - 0.007 * (i / (len(pts) - 1)) for i in range(len(pts))]
        side = tube_along(pts, rad)
        sm = bpy.data.meshes.new('tmp'); side.to_mesh(sm); side.free()
        bm.from_mesh(sm); bpy.data.meshes.remove(sm)
        blade(bm, pts[-1] - Vector((0, 0, 0.012)), Vector((sx * 0.08, 0, 1)), X, 0.16, 0.028)
    # haste central e a ponta maior
    mid = tube_along([Vector((0, 0, head_z - 0.03)), Vector((0, 0, head_z + 0.07)), Vector((0, 0, head_z + 0.12))], [0.017, 0.013, 0.011])
    sm = bpy.data.meshes.new('tmp'); mid.to_mesh(sm); mid.free(); bm.from_mesh(sm); bpy.data.meshes.remove(sm)
    blade(bm, Vector((0, 0, head_z + 0.12)), Vector((0, 0, 1)), X, length - head_z - 0.12, 0.034)
    bm.normal_update()
    ob = mesh_from_bm('TIDES__TRIDENT', bm)
    # alinha: Z local → eixo do cabo; X local fica o mais perto possível do X do mundo (pontas abertas para a frente)
    z = axis; x = (X - z * X.dot(z)).normalized(); y = z.cross(x)
    R = Matrix((x, y, z)).transposed().to_4x4()
    ob.matrix_world = Matrix.Translation(butt) @ R
    for p in ob.data.polygons:
        p.use_smooth = True
    es = ob.modifiers.new('arestas', 'EDGE_SPLIT'); es.split_angle = math.radians(40)   # lâminas com fio vivo, cabo liso
    return ob
