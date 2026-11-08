"""Guardian of the Tides · pedestal arquitetônico e ondas petrificadas.
Pedestal: plinto, moldura, dado com friso de volutas (onda grega / voluta vitruviana) em relevo,
painéis rebaixados com filete de ouro e vieira central, cornija e laje do topo.
Ondas: crista que se quebra para a frente sob o pé esquerdo (com vão negativo sob o lábio), ondulações baixas
no topo do pedestal e espirais de espuma; tudo fundido por remesh e entalhado com linhas de fluxo.
Unidades do corpo base: o topo do pedestal é z = 0 (sola do pé de apoio).
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector

from common import apply_modifiers, link, mesh_from_bm
from guardian_tides_trident import tube_along

CENTER = Vector((0.0, -0.17, 0.0))
W, D, H = 0.91, 0.79, 0.59          # 3,0 m × 2,6 m × 1,94 m na escala 3,3
R_FOOT = Vector((-0.13, -0.06))      # pé de apoio (direito)


def _box(bm, cx, cy, z0, z1, w, d):
    r = bmesh.ops.create_cube(bm, size=1)
    for v in r['verts']:
        v.co = Vector((cx + v.co.x * w, cy + v.co.y * d, z0 + (v.co.z + .5) * (z1 - z0)))
    return r['verts']


def scroll_relief(t, v):
    """Voluta vitruviana num período: base ondulada que sobe e enrola numa espiral. 0..1 (altura do relevo)."""
    base = v < 0.22 + 0.06 * math.sin(t * 2 * math.pi)
    cx, cy = 0.62, 0.56
    dx, dy = (t - cx) * 1.6, v - cy
    r = math.hypot(dx, dy); a = math.atan2(dy, dx)
    spiral_r = 0.07 + 0.05 * ((a + math.pi) / (2 * math.pi))      # raio cresce com o ângulo: espiral
    ring = abs(r - spiral_r) < 0.045 or r < 0.05
    stem = abs(v - (0.22 + (t - 0.15) * 1.25)) < 0.06 and 0.15 < t < 0.5   # haste que sobe da base para a espiral
    return 1.0 if (base or ring or stem) else 0.0


def relief_band(bm, origin, along, up, length, height, depth=0.012, period=0.12, res=0.004):
    """Faixa em relevo: malha densa deslocada para fora pela voluta (o fundo fica no plano da face)."""
    out = along.cross(up).normalized()          # normal para fora da face
    nu, nv = int(length / res), int(height / res)
    grid = []
    for i in range(nu + 1):
        row = []
        for j in range(nv + 1):
            u, v = i / nu * length, j / nv
            h = scroll_relief((u / period) % 1.0, v)
            # média com vizinhos próximos dá o chanfro de cinzel nas bordas
            h = (h * 2 + scroll_relief(((u + res) / period) % 1, v) + scroll_relief(((u - res) / period) % 1, v)) / 4
            row.append(bm.verts.new(origin + along * u + up * (v * height) + out * (0.001 + depth * h)))
        grid.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))


def pedestal():
    bm = bmesh.new()
    cx, cy = CENTER.x, CENTER.y
    tiers = [  # (z0, z1, inset)
        (-H, -H + 0.07, 0.0),            # plinto
        (-H + 0.07, -H + 0.095, 0.015),  # filete
        (-H + 0.095, -H + 0.13, 0.03),   # toro
        (-H + 0.13, -0.11, 0.05),        # dado
        (-0.11, -0.085, 0.035),          # filete
        (-0.085, -0.03, 0.015),          # cornija
        (-0.03, 0.0, 0.0),               # laje do topo
    ]
    for z0, z1, ins in tiers:
        _box(bm, cx, cy, z0, z1, W - 2 * ins, D - 2 * ins)
    ped = mesh_from_bm('TIDES__PEDESTAL', bm)
    bv = ped.modifiers.new('chanfro', 'BEVEL'); bv.width = 0.006; bv.segments = 3; bv.limit_method = 'ANGLE'
    apply_modifiers(ped)
    # frisos de voluta nas quatro faces do dado e painéis
    bm = bmesh.new(); bm.from_mesh(ped.data)
    w2, d2 = (W - 0.1) / 2, (D - 0.1) / 2
    zb, zt = -0.21, -0.13
    faces = [  # origem (canto esquerdo), direção, comprimento
        (Vector((cx - w2, cy - d2, zb)), Vector((1, 0, 0)), W - 0.1),
        (Vector((cx + w2, cy + d2, zb)), Vector((-1, 0, 0)), W - 0.1),
        (Vector((cx + w2, cy - d2, zb)), Vector((0, 1, 0)), D - 0.1),
        (Vector((cx - w2, cy + d2, zb)), Vector((0, -1, 0)), D - 0.1),
    ]
    for o, a, L in faces:
        relief_band(bm, o, a, Vector((0, 0, 1)), L, zt - zb)
    ped.data.clear_geometry(); bm.to_mesh(ped.data); bm.free()
    gold = gold_panels()
    return ped, gold


def gold_panels(front_scallop=True):
    """Filete de ouro em volta do painel frontal e de trás e uma vieira no centro (TIDES__DETAILS)."""
    bm = bmesh.new()
    cx, cy = CENTER.x, CENTER.y
    for sy in (-1, 1):
        y = cy + sy * ((D - 0.1) / 2 + 0.004)
        x0, x1, z0, z1 = cx - 0.33, cx + 0.33, -H + 0.17, -0.25
        rect = [Vector((x0, y, z0)), Vector((x1, y, z0)), Vector((x1, y, z1)), Vector((x0, y, z1)), Vector((x0, y, z0))]
        pts = []
        for a, b in zip(rect, rect[1:]):
            pts += [a.lerp(b, k / 12) for k in range(12)]
        t = tube_along(pts + [rect[0]], [0.005] * (len(pts) + 1), segs=6)
        me = bpy.data.meshes.new('tmp'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
        if front_scallop or sy > 0:   # V14: na frente entra o hipocampo em relevo
            scallop(bm, Vector((cx, y + sy * 0.002, (z0 + z1) / 2 - 0.05)), 0.085, facing=Vector((0, sy, 0)))
    return mesh_from_bm('TIDES__PEDESTAL_GOLD', bm)


def scallop(bm, c, r, facing, ribs=13, res=40):
    """Vieira em leque com nervuras, em relevo sobre a face."""
    up = Vector((0, 0, 1)); side = facing.cross(up).normalized()
    hub = c - up * r * 0.45
    rows = []
    for i in range(res + 1):
        a = math.pi * (0.06 + 0.88 * i / res)
        row = []
        for k in range(6):
            s = k / 5
            rib = 0.5 + 0.5 * math.cos(i / res * ribs * 2 * math.pi)
            p = hub + (side * math.cos(a) + up * math.sin(a)) * r * s * (1 + 0.06 * rib * s)
            row.append(bm.verts.new(p + facing * (0.012 * math.sin(math.pi * s * 0.9) * (0.6 + 0.4 * rib) + 0.002)))
        rows.append(row)
    for a, b in zip(rows, rows[1:]):
        for k in range(5):
            bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))


CREST = [  # perfil da crista (y, z): costas sobem, topo largo sob o pé, lábio curva para a frente sobre um vão
    (0.04, -0.02), (-0.02, 0.04), (-0.10, 0.10), (-0.18, 0.140), (-0.25, 0.155), (-0.33, 0.160), (-0.41, 0.156),
    (-0.47, 0.140), (-0.515, 0.112), (-0.535, 0.080), (-0.525, 0.052), (-0.495, 0.040), (-0.47, 0.046),
    (-0.455, 0.030), (-0.46, -0.02),
]


def sweep(bm, path, profile, scale=1.0, n=48, wobble=0.04, zscale=None):
    """Varre um perfil (lateral, altura) ao longo de um caminho no plano do topo. A altura cresce do nada,
    culmina e se desfaz; o perfil avança e recua (a onda não é um tubo reto)."""
    from guardian_tides_drapery import _path
    pts = _path([Vector((x, y, 0)) for x, y in path], n + 1)
    rings = []
    for i, c in enumerate(pts):
        s = i / n
        t = (pts[min(i + 1, n)] - pts[max(i - 1, 0)]).normalized()
        lat = Vector((0, 0, 1)).cross(t).normalized()          # à esquerda do caminho
        env = math.sin(math.pi * s) ** 0.55
        sw = wobble * math.sin(s * math.pi * 1.7)
        zs = scale if zscale is None else zscale     # V14: largura e altura independentes (o topo sob o pé não sobe)
        ring = [bm.verts.new(c + lat * (-(y) * scale + sw * max(z, 0) / 0.16) + Vector((0, 0, max(z * zs * (0.2 + 0.8 * env), -0.02))))
                for y, z in profile]
        rings.append(ring)
    m = len(profile)
    for a, b in zip(rings, rings[1:]):
        for k in range(m):
            bm.faces.new((a[k], a[(k + 1) % m], b[(k + 1) % m], b[k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])


def crest(bm):
    """Crista sob o pé esquerdo: corre ao longo de X; o perfil se abre para a frente (-Y)."""
    sweep(bm, [(0.44, 0.0), (0.18, 0.02), (-0.02, 0.0)], CREST, scale=1.0)   # de +X para -X: a lateral esquerda é -Y (frente)


def back_wave(bm):
    """Onda longa e baixa atrás do guardião: varre da frente-direita até o canto de trás e enrola para fora."""
    sweep(bm, [(-0.27, -0.24), (-0.21, -0.02), (-0.02, 0.07), (0.20, 0.06), (0.30, -0.06)], CREST, scale=0.5, wobble=0.05)


def swells(dst, res=0.012):
    """Ondulações baixas cobrindo o topo, mais baixas perto do pé de apoio e da ponteira do tridente."""
    cx, cy = CENTER.x, CENTER.y
    xs = np.arange(cx - W / 2 + 0.03, cx + W / 2 - 0.03, res); ys = np.arange(cy - D / 2 + 0.03, cy + D / 2 - 0.03, res)
    bm = bmesh.new()
    top = []
    for x in xs:
        row = []
        for y in ys:
            h = 0.035 + 0.03 * math.sin(x * 21 + y * 9) * math.cos(y * 17 - x * 5) + 0.012 * math.sin(x * 47 - y * 31)
            dfoot = math.hypot(x - R_FOOT.x, y - R_FOOT.y)
            dtri = math.hypot(x + 0.374, y + 0.443)
            h *= min(1, max(dfoot - 0.10, 0) / 0.08) * min(1, max(dtri - 0.04, 0) / 0.06)
            edge = min(x - (cx - W / 2 + 0.03), (cx + W / 2 - 0.03) - x, y - (cy - D / 2 + 0.03), (cy + D / 2 - 0.03) - y)
            h *= min(1, edge / 0.06)
            row.append(bm.verts.new((x, y, h - 0.004)))
        top.append(row)
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            bm.faces.new((top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.03)
    me = bpy.data.meshes.new('tmp'); bm.to_mesh(me); bm.free(); dst.from_mesh(me); bpy.data.meshes.remove(me)


def foam_spirals(bm, rng):
    """Espirais de espuma em volta da crista e sobre as ondulações (volutas da onda esculpida)."""
    spots = [(0.06, -0.47, 0.05, 1), (0.34, -0.46, 0.05, -1), (0.36, -0.05, 0.02, 1), (-0.30, 0.12, 0.02, -1), (0.0, 0.15, 0.02, 1), (-0.2, -0.5, 0.02, 1)]
    for x, y, z, sg in spots:
        pts, radii = [], []
        for k in range(30):
            s = k / 29
            a = sg * s * 2.6 * math.pi
            r = 0.055 * (1 - s) + 0.008
            pts.append(Vector((x + r * math.cos(a), y + r * math.sin(a) * 0.8, z + 0.012 * math.sin(s * math.pi))))
            radii.append(0.013 * (1 - s) ** 0.5 + 0.002)
        t = tube_along(pts, radii, segs=8)
        me = bpy.data.meshes.new('tmp'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)


def carve_flow(ob, depth=0.004):
    """Linhas de fluxo entalhadas: seguem a direção da onda (de trás para a frente, abrindo em leque)."""
    me = ob.data
    co = np.array([v.co[:] for v in me.vertices]); nr = np.array([v.normal[:] for v in me.vertices])
    phase = co[:, 2] * 90 + np.sin(co[:, 0] * 25) * 2.0 + co[:, 1] * 12
    g = (1 - np.abs(np.sin(phase))) ** 5
    co += nr * (-g * depth)[:, None]
    for v, c in zip(me.vertices, co): v.co = c
    me.update()


def waves(seed=3, voxel=0.0035, v14=False):
    rng = np.random.default_rng(seed)
    bm = bmesh.new()
    if v14:
        from guardian_tides_v14 import waves_v14
        waves_v14(bm)
    else:
        crest(bm)
        back_wave(bm)
    swells(bm)
    foam_spirals(bm, rng)
    ob = mesh_from_bm('TIDES__WAVES', bm)
    rm = ob.modifiers.new('fundir', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = voxel
    sm = ob.modifiers.new('polir', 'SMOOTH'); sm.factor = 0.7; sm.iterations = 4
    apply_modifiers(ob)
    carve_flow(ob)
    for p in ob.data.polygons: p.use_smooth = True
    return ob
