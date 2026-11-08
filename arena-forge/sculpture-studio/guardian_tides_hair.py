"""Guardian of the Tides · cabelo, barba e coroa de louros marinha.
Mechas geradas por script como tubos afunilados que seguem a superfície da cabeça (cabelo) ou caem em
cachos espiralados (barba, estilo clássico). Uma casca sobre o couro cabeludo e as mechas são fundidas por
remesh de voxel: o resultado é uma massa esculpida com sulcos fundos entre as mechas, como em mármore.
Feito na pose de repouso; o objeto segue o osso da cabeça.
"""
import math
import random

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

from common import link, mesh_from_bm
from guardian_tides_trident import tube_along

FLOW_ORIGIN = Vector((0, -0.21, 1.60))  # mechas nascem da testa aberta e correm para trás e para os lados


def in_scalp(p, temple=True, front=1.638):
    """Couro cabeludo: testa aberta na frente (z > 1.638), desce até a nuca atrás (z > 1.50).
    As têmporas recebem mechas, mas não a casca (a borda da casca ali formava degraus)."""
    f = min(max((p.y + 0.07) / 0.10, 0), 1)       # 0 = frente, 1 = trás
    t = temple and abs(p.x) > 0.066 and p.z > 1.585 and p.y < 0.03   # têmporas até o alto da orelha
    return (p.z > front - (front - 1.50) * f or t) and abs(p.x) < 0.10 and p.y > -0.15


def in_beard(p):
    if not (p.y < -0.03 and 1.44 < p.z < 1.552): return False
    if abs(p.x) < 0.032 and 1.478 < p.z < 1.522: return False        # lábios livres
    if abs(p.x) < 0.022 and p.z > 1.522: return False                 # nariz
    if p.z > 1.535 and abs(p.x) < 0.055: return False                 # bochecha alta livre (olhos e maçãs)
    return abs(p.x) < 0.092


def _bvh(body):
    bm = bmesh.new(); bm.from_mesh(body.data); bm.normal_update()
    tree = BVHTree.FromBMesh(bm)
    return tree, bm


def _seeds(bm, test, count, rng):
    faces = [f for f in bm.faces if test(f.calc_center_median())]
    areas = np.array([f.calc_area() for f in faces]); areas /= areas.sum()
    pick = rng.choice(len(faces), size=count, p=areas)
    out = []
    for i in pick:
        f = faces[i]
        a, b = rng.random(2)
        if a + b > 1: a, b = 1 - a, 1 - b
        v = f.verts
        out.append((v[0].co + (v[1].co - v[0].co) * a + (v[2].co - v[0].co) * b, f.normal.copy()))
    return out


def hair_lock(tree, p, n, rng, steps=14, length=(0.12, 0.18), lift=(0.015, 0.010), radius=0.013, wave=(0.15, 0.3)):
    """Mecha que corre colada à cabeça, levanta um pouco e termina num cacho."""
    length = rng.uniform(*length) * (1.3 if p.y > 0.0 else 1.0)
    pts, radii = [], []
    wave = rng.uniform(*wave) * rng.choice((-1, 1))
    lift0, lift1 = lift
    d = (p - FLOW_ORIGIN); d = (d - n * d.dot(n)).normalized()
    d = (d + Vector((0, 0, -0.35))).normalized()
    cur = p.copy(); turn = rng.choice((-1, 1)) * rng.uniform(1.5, 2.6)
    for k in range(steps):
        s = k / (steps - 1)
        hit = tree.find_nearest(cur)
        if hit[0] is not None:
            base, nn = hit[0], hit[1]
            lift = lift0 + lift1 * s
            pts.append(base + nn * lift)
            d = (d - nn * d.dot(nn)).normalized()
        else:
            pts.append(cur.copy()); nn = n
        radii.append(radius * (1 - s) ** 0.6 + 0.0008)          # ponta fina: sem toco
        d = (Matrix.Rotation(wave * math.cos(s * math.pi * 2) * 0.35, 3, nn) @ d).normalized()   # onda em S
        if s > 0.6:  # cacho na ponta: gira em volta da normal
            d = (Matrix.Rotation(turn * (s - 0.55) / 0.45 * 0.6, 3, nn) @ d).normalized()
        cur = pts[-1] - nn * 0.012 + d * (length / steps)
    travel = sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))
    span = (pts[-1] - pts[0]).length
    if travel < 0.6 * length or span < 0.4 * length:   # mecha presa numa concavidade: anéis empilhados viram bloco
        return None
    return pts, radii


def beard_curl(p, n, rng, steps=16):
    """Cacho espiralado: desce e avança, enrolando (barba volumosa de escultura grega)."""
    length = rng.uniform(0.045, 0.09) * (1.35 if p.z < 1.48 else 1.0)
    down = Vector((0, -0.45, -1)).normalized()
    out = (n + Vector((0, -0.4, 0))).normalized()
    axis = (down + out * 0.35).normalized()
    a = axis.orthogonal().normalized(); b = axis.cross(a)
    turns = rng.uniform(1.2, 2.0); R = rng.uniform(0.006, 0.009); ph = rng.uniform(0, 6.28)
    pts, radii = [], []
    for k in range(steps):
        s = k / (steps - 1)
        ang = ph + turns * 2 * math.pi * s
        c = p + n * 0.012 + axis * (length * s) + out * (0.012 * math.sin(s * math.pi))
        pts.append(c + (a * math.cos(ang) + b * math.sin(ang)) * R * min(s * 3, 1))
        radii.append(0.0105 * (1 - s) ** 0.45 + 0.0015)
    return pts, radii


def mustache(tree):
    """Bigode: mechas grossas que saem sob o nariz, deitadas no lábio, e descem pelos cantos da boca."""
    locks = []
    for sx in (1, -1):
        for k in range(4):
            pts, radii = [], []
            for s in np.linspace(0, 1, 12):
                q = Vector((sx * (0.019 + 0.002 * k + 0.03 * s), -0.17, 1.519 - 0.003 * k - 0.03 * s ** 2))
                hit = tree.find_nearest(q)
                pts.append(hit[0] + hit[1] * (0.006 + 0.004 * math.sin(math.pi * s)))
                radii.append(0.0055 * (1 - s) ** 0.5 + 0.0008)
            locks.append((pts, radii))
    return locks


def scalp_shell(bm_body, test, offset=0.007):
    """Casca sob as mechas, para o cabelo ser uma massa (sem ver couro entre os fios)."""
    bm = bmesh.new()
    vmap = {}
    for f in bm_body.faces:
        if not test(f.calc_center_median()): continue
        vs = []
        for v in f.verts:
            if v.index not in vmap:
                vmap[v.index] = bm.verts.new(v.co + v.normal * offset)
            vs.append(vmap[v.index])
        bm.faces.new(vs)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.014)
    return bm


def build_hair(body, seed=7, hair_count=80, beard_count=230, voxel=0.0018, beard_test=None, lock_kw=None, carve_kw=None, hairline=1.638, keep_lock=None, shell_thick=0.0, shell_offset=0.004):
    beard_test = beard_test or in_beard
    rng = np.random.default_rng(seed)
    tree, bmb = _bvh(body)
    out = scalp_shell(bmb, lambda p: in_scalp(p, False, hairline), offset=shell_offset)
    if shell_thick:   # V14: casca com espessura; sem ela o remesh apaga a casca onde não há mecha encostada
        out.normal_update()
        bmesh.ops.solidify(out, geom=out.faces[:], thickness=shell_thick)
    beard_shell = scalp_shell(bmb, beard_test, offset=0.012)
    me = bpy.data.meshes.new('tmp'); beard_shell.to_mesh(me); beard_shell.free(); out.from_mesh(me); bpy.data.meshes.remove(me)
    locks = [l for l in (hair_lock(tree, p, n, rng, **(lock_kw or {})) for p, n in _seeds(bmb, lambda q: in_scalp(q, False, hairline), hair_count, rng)) if l and (keep_lock is None or keep_lock(l))]
    locks += [beard_curl(p, n, rng) for p, n in _seeds(bmb, beard_test, beard_count, rng)]
    locks += mustache(tree)
    for pts, radii in locks:
        t = tube_along(pts, radii, segs=8)
        me = bpy.data.meshes.new('tmp'); t.to_mesh(me); t.free(); out.from_mesh(me); bpy.data.meshes.remove(me)
    bmb.free()
    hair = mesh_from_bm('TIDES__HAIR_BEARD', out)
    rm = hair.modifiers.new('fundir', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = voxel; rm.adaptivity = 0
    sm = hair.modifiers.new('polir', 'SMOOTH'); sm.factor = 0.6; sm.iterations = 3
    from common import apply_modifiers
    apply_modifiers(hair)
    carve_grooves(hair, **(carve_kw or {}))
    sm = hair.modifiers.new('polir', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 2
    apply_modifiers(hair)
    for p in hair.data.polygons: p.use_smooth = True
    return hair


def carve_grooves(hair, locks=15, depth=0.0055, axis=None):
    """Sulcos de cinzel no cabelo: faixas onduladas penteadas da testa para trás (longitude em volta do eixo Y
    que passa pela testa). O fundo do sulco é estreito e a crista larga, como cabelo entalhado em mármore."""
    me = hair.data
    co = np.array([v.co[:] for v in me.vertices]); nr = np.array([v.normal[:] for v in me.vertices])
    scalp = (co[:, 2] > 1.575) | ((co[:, 1] > 0.0) & (co[:, 2] > 1.47))
    phi = np.arctan2(co[:, 2] - 1.585, co[:, 0])
    y = co[:, 1]
    if axis is not None:   # V14: faixas em volta de um eixo testa → nuca; o redemoinho cai sob o cabelo, não no alto da nuca
        O, A = np.array(axis[0], float), np.array(axis[1], float) - np.array(axis[0], float); A /= np.linalg.norm(A)
        e1 = np.array([1.0, 0, 0]) - A * A[0]; e1 /= np.linalg.norm(e1); e2 = np.cross(A, e1)
        q = co - O; y = q @ A
        phi = np.arctan2(q @ e2, q @ e1)
    g = np.abs(np.sin(locks * phi + 0.9 * np.sin(y * 38 + phi * 3)))
    groove = (1 - g) ** 4                                   # 1 no fundo do sulco, cai rápido para a crista
    ripple = 0.25 * (1 - np.abs(np.sin(y * 70 + phi * 9)))  # ondulação fina ao longo da mecha
    disp = -(groove + ripple * (1 - groove)) * depth * scalp
    co += nr * disp[:, None]
    for v, c in zip(me.vertices, co): v.co = c
    me.update()


def laurel_crown(hair, body=None, leaves=26):
    """Coroa de louros marinha: aro trançado e folhas em pares, com uma concha (vieira) na frente."""
    bm = bmesh.new()
    hb = bmesh.new(); hb.from_mesh(hair.data); tree = BVHTree.FromBMesh(hb); hb.free()
    btree = _bvh(body)[0] if body is not None else None
    ring = []
    for k in range(64):
        a = 2 * math.pi * k / 64
        z = 1.655 - 0.028 * (1 - math.cos(a)) / 2                # sobre o cabelo; mais baixa atrás
        q = Vector((0.2 * math.sin(a), -0.052 - 0.2 * math.cos(a), z))
        hit = tree.ray_cast(q, (Vector((0, -0.052, z)) - q).normalized())   # de fora para o centro: primeira superfície
        if hit[0] is None and body is not None:                 # sem cabelo nesse ponto: apoia na pele
            hit = btree.ray_cast(q, (Vector((0, -0.052, z)) - q).normalized())
        ring.append(hit[0] + hit[1] * 0.003 if hit[0] is not None else q)
    band = tube_along(ring + [ring[0]], [0.0035] * 65, segs=8)
    me = bpy.data.meshes.new('tmp'); band.to_mesh(me); band.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    center = Vector((0, -0.052, 1.62))
    for k in range(leaves):
        if k in (0, leaves - 1): continue                      # frente aberta para a concha
        u = (k + 0.5) / leaves
        a = math.pi * (1 - 2 * u) * 0.98                       # da frente-esquerda até a frente-direita, passando por trás
        i = int((a % (2 * math.pi)) / (2 * math.pi) * 64) % 64
        base = ring[i]
        tang = (ring[(i + 1) % 64] - ring[i - 1]).normalized()
        if a < 0: tang = -tang                                 # folhas apontam para a frente dos dois lados
        out = Vector((base.x, base.y - center.y, 0)).normalized()
        for side in (1, -1):
            up = (tang * 0.75 + Vector((0, 0, 1)) * 0.35 * side + out * 0.15).normalized()
            _leaf(bm, base + out * 0.003, up, out, 0.03 if k in (1, leaves - 2) else 0.034, 0.009)
    _scallop(bm, ring[0] + Vector((0, -0.006, 0.006)), 0.018)
    crown = mesh_from_bm('TIDES__LAUREL', bm)
    for p in crown.data.polygons: p.use_smooth = True
    return crown


def _leaf(bm, base, up, normal, length, width, steps=8):
    side = up.cross(normal).normalized()
    nrm = side.cross(up).normalized()
    rows = []
    for k in range(steps + 1):
        s = k / steps
        w = width * math.sin(math.pi * s) ** 0.8
        c = base + up * (length * s) + nrm * (0.004 * math.sin(math.pi * s))   # folha arqueada
        rows.append([bm.verts.new(c - side * w), bm.verts.new(c + nrm * 0.0012), bm.verts.new(c + side * w), bm.verts.new(c - nrm * 0.0012)])
    for a, b in zip(rows, rows[1:]):
        for j in range(4):
            q = (a[j], a[(j + 1) % 4], b[(j + 1) % 4], b[j])
            bm.faces.new(q)


def _scallop(bm, c, r, ribs=9):
    """Vieira com nervuras radiais (leque), virada para a frente."""
    fwd, up, side = Vector((0, -1, 0.25)).normalized(), Vector((0, 0, 1)), Vector((1, 0, 0))
    hub = bm.verts.new(c - up * r * 0.5)
    prev = None
    n = ribs * 4
    for k in range(n + 1):
        a = math.pi * (0.1 + 0.8 * k / n)
        rib = 1 + 0.12 * math.cos(k / n * ribs * 2 * math.pi)
        p = c - up * r * 0.5 + (side * math.cos(a) + up * math.sin(a)) * r * rib + fwd * (0.004 * rib)
        v = bm.verts.new(p)
        if prev: bm.faces.new((hub, prev, v))
        prev = v
