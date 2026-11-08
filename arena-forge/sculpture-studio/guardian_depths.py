"""Guardião das Profundezas (POS-MON-V10-002) · prévia em argila para revisão de silhueta.

Rodar:
  "~/Applications/Blender 4.5 LTS.app/Contents/MacOS/Blender" -b --factory-startup \
      --python arena-forge/sculpture-studio/guardian_depths.py               (argila + vistas)
  ... guardian_depths.py -- tides     (só leitura: renderiza a V14.1 das Marés com a mesma câmera)
  python3 arena-forge/sculpture-studio/sheet_ab.py docs/img/sculpture-studio/guardian-depths tides depths
Grava WORK/guardian-depths-clay.blend e as imagens em docs/img/sculpture-studio/guardian-depths/.

Fonte: docs/art-bible/POSEIDON_V11_SCULPTURE_BIBLE.md (Guardian B) e POSEIDON_V10_GUARDIAN_ART_PRODUCTION.md.
Os artboards citados na bíblia não estão no repositório; a prévia segue o texto aprovado.
  - lado direito do mundo; figura firme, defensiva: joelho da frente dobrado, tronco em contrarrotação
  - tridente do lado de fora, na diagonal, com a ponteira apoiada no pedestal
  - a outra mão estendida para fora, calma e de comando
  - mandíbula mais larga, cabelo curto preso por uma faixa e um nó atrás, mais jovem, sem barba longa
  - capa marinha dobrada sobre as costas e a cintura, ombreira com concha entalhada
  - pedestal próprio: tambor elíptico, volutas de náutilo que sobem, onda em serpente, concha na frente
  - silhueta em triângulo largo, diferente da vertical do Guardião das Marés; nada espelhado dele
Só a forma (argila). Rosto fino, dobras finas, materiais e LODs vêm depois da revisão de silhueta.
Não toca em nenhum arquivo do Guardião das Marés: usa o kit genérico (sculpt_kit.py) e funções de leitura.
"""
import json
import math
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bmesh
import bpy
import numpy as np
from mathutils import Vector

from common import ROOT, apply_modifiers, mesh_from_bm, reset
import sculpt_kit as K

WORK = Path.home() / 'worktrees/sstcg-tools/sculpt-work'
DST = WORK / 'guardian-depths-clay.blend'
IMG = ROOT / 'docs/img/sculpture-studio/guardian-depths'
P = 'DEPTHS'
LOG = {}

# ───────────────────────── corpo: mais pesado e mais jovem; mandíbula larga ─────────────────────────
BODY = [
    {'c': (0.19, 0.0, 1.36), 's': (0.05, 0.08, 0.06), 'mover': (0.010, 0, 0.0)},          # ombros largos
    {'c': (0.09, 0.01, 1.42), 's': (0.05, 0.05, 0.03), 'mover': (0.004, 0, 0.012)},       # trapézio alto (pescoço de touro)
    {'c': (0.0, -0.01, 1.45), 's': (0.055, 0.055, 0.035), 'normal': 0.007, 'espelho': False},   # pescoço grosso
    {'c': (0.07, -0.10, 1.27), 's': (0.065, 0.04, 0.055), 'mover': (0.002, -0.012, 0.0)},  # peitoral cheio
    {'c': (0.10, -0.06, 1.06), 's': (0.07, 0.06, 0.06), 'normal': 0.004},                 # oblíquos: cintura firme
    {'c': (0.13, -0.02, 0.72), 's': (0.05, 0.06, 0.12), 'normal': 0.006},                 # coxas pesadas
]
FACE = [
    {'c': (0.056, -0.085, 1.475), 's': (0.018, 0.03, 0.02), 'mover': (0.007, 0, -0.002)},   # ângulo da mandíbula para fora
    {'c': (0.03, -0.125, 1.46), 's': (0.02, 0.025, 0.012), 'mover': (0.003, -0.003, -0.002)},  # linha da mandíbula
    {'c': (0.0, -0.15, 1.462), 's': (0.03, 0.03, 0.014), 'normal': 0.004, 'espelho': False},   # queixo largo e quadrado
    {'c': (0.0, -0.165, 1.545), 's': (0.008, 0.02, 0.025), 'mover': (0, -0.002, 0), 'espelho': False},  # dorso do nariz reto
    {'c': (0.035, -0.14, 1.598), 's': (0.024, 0.02, 0.008), 'mover': (0, -0.002, 0.001)},   # sobrancelha reta, sem carranca
]

# ───────────────────────── pose (dados, para o kit) ─────────────────────────
SHAFT = Vector((0.42, 0.06, 0.91)).normalized()       # tridente: ponteira no pedestal, topo inclinado para fora (+X)
POSE = [
    {'rot': 'root', 'eixo': (0, 0, 1), 'graus': 8},     # quadril para fora (+X)
    {'rot': 'root', 'eixo': (0, 1, 0), 'graus': 3},
    {'rot': 'spine', 'eixo': (1, 0, 0), 'graus': 5},    # tronco um pouco à frente: guarda
    {'rot': 'chest', 'eixo': (0, 0, 1), 'graus': -24},  # contrarrotação: peito para a escadaria (-X)
    {'rot': 'neck', 'eixo': (0, 0, 1), 'graus': -8},
    {'rot': 'head', 'eixo': (0, 0, 1), 'graus': -6},
    {'rot': 'head', 'eixo': (1, 0, 0), 'graus': 4},     # queixo um pouco baixo: vigilante
    # perna da frente (fora, +X): joelho dobrado, pé plantado num degrau de onda
    {'mira': 'thigh.L', 'dir': (0.20, -0.72, -0.66)}, {'mira': 'shin.L', 'dir': (0.05, 0.06, -1.0)}, {'mira': 'foot.L', 'dir': (0.15, -1.0, -0.05)},
    # perna de trás (dentro, -X): estendida para trás e para o lado, base larga
    {'mira': 'thigh.R', 'dir': (-0.30, 0.40, -0.87)}, {'mira': 'shin.R', 'dir': (-0.18, 0.42, -0.89)}, {'mira': 'foot.R', 'dir': (-0.22, -0.85, -0.48)},
    # braço do tridente (fora): cotovelo baixo, antebraço à frente; o punho fecha em volta do cabo diagonal
    {'mira': 'upper_arm.L', 'dir': (0.52, -0.05, -0.85)}, {'mira': 'forearm.L', 'dir': (0.40, -0.75, 0.15)},
    # braço de comando (dentro): estendido para fora e à frente, na altura do peito, mão aberta e calma
    {'mira': 'upper_arm.R', 'dir': (-0.62, -0.62, -0.20)}, {'mira': 'forearm.R', 'dir': (-0.50, -0.85, 0.06)},
    {'mira': 'hand.R', 'dir': (-0.45, -0.88, -0.12)},
]


def hand_on_shaft(arm):
    d = Vector((0, -1, 0)); d = (d - SHAFT * d.dot(SHAFT)).normalized()
    K.aim(arm, 'hand.L', d, up=SHAFT)


# ───────────────────────── cabelo preso, sem barba longa ─────────────────────────

def hair(body, arm):
    import guardian_tides_hair as GH
    from guardian_tides_trident import tube_along
    build_hair = GH.build_hair
    GH.mustache = lambda tree: []          # sem bigode: troca só nesta execução, o módulo do Guardião das Marés não muda
    arm.data.pose_position = 'REST'; bpy.context.view_layer.update()
    # sem barba: build_hair exige uma área de barba não vazia; usa um retalho da nuca que o cabelo já cobre
    h = build_hair(body, seed=21, hair_count=90, beard_count=0, beard_test=lambda p: p.y > 0.03 and 1.52 < p.z < 1.58 and abs(p.x) < 0.03, hairline=1.632, shell_thick=0.005,
                   keep_lock=lambda l: l[0][-1].z > 1.50,
                   lock_kw=dict(length=(0.07, 0.11), lift=(0.004, 0.003), radius=0.011, wave=(0.25, 0.45)),
                   carve_kw=dict(locks=22, depth=0.004))
    h.name = f'{P}__HAIR'
    # faixa que prende o cabelo (um pouco acima da testa, desce atrás) e o nó na nuca
    tree = K.BVHTree.FromObject(h, bpy.context.evaluated_depsgraph_get())
    c = Vector((0, -0.03, 1.60)); ring = []
    for k in range(49):
        a = 2 * math.pi * k / 48
        d = Vector((math.cos(a), math.sin(a), 0.0)); z = 1.648 - 0.05 * (0.5 + 0.5 * math.sin(a))   # frente (−Y) alta, nuca baixa
        o = Vector((c.x, c.y, z)) + d * 0.2
        hit = tree.ray_cast(o, -d, 0.25)
        ring.append((hit[0] if hit[0] is not None else o - d * 0.12) + d * 0.002)
    bm = tube_along(ring, [0.0055] * len(ring), segs=8)
    knot = [Vector((0, 0.075, 1.585)), Vector((0, 0.10, 1.57)), Vector((0, 0.115, 1.545)), Vector((0.005, 0.112, 1.515)), Vector((0.01, 0.10, 1.49))]
    bk = tube_along(knot, [0.026, 0.028, 0.022, 0.016, 0.009], segs=12)
    me = bpy.data.meshes.new('tmp'); bk.to_mesh(me); bk.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    band = mesh_from_bm(f'{P}__BAND', bm)
    for o in (h, band):
        mw = o.matrix_world.copy(); o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = 'head'
        bpy.context.view_layer.update(); o.matrix_world = mw
    arm.data.pose_position = 'POSE'; bpy.context.view_layer.update()
    return h, band


# ───────────────────────── vestimenta ─────────────────────────

def garments(body, arm):
    pb, M = arm.pose.bones, arm.matrix_world
    W = lambda b, t=0.0: M @ pb[b].head.lerp(pb[b].tail, t)
    root = W('root'); knee_back = W('shin.R')
    top = root.z + 0.06
    bottom = (W('thigh.L').z + W('shin.L').z) / 2 - 0.02          # meia coxa da perna da frente
    keep = lambda co: (np.abs(co[:, 0] - root.x) < 0.24) & (co[:, 2] < top + 0.05)
    kilt = K.envelope_skirt(f'{P}__KILT', body, top, bottom, rows=36, nb=96, ease=0.014, flare=0.07, folds=(13, 0.008),
                            center=(root.x, root.y + 0.01), keep=keep)
    # capa: do ombro de dentro ao de fora pelas costas, cai e abre para fora e para trás (vento do mar)
    sR, sL = W('upper_arm.R'), W('upper_arm.L'); ch = W('chest', 0.6)
    top_pts = []
    for k in range(25):
        t = k / 24
        p = sR.lerp(sL, t) + Vector((0, 0.07 + 0.03 * math.sin(math.pi * t), 0.035 * math.sin(math.pi * t)))
        top_pts.append(p.lerp(Vector((p.x, ch.y + 0.09, p.z)), 0.4))
    cape = K.sheet(f'{P}__CAPE', top_pts, down=(0.10, 0.22, -1.0), length=0.95, rows=56, spread=0.42, back=(0.16, 0.24, 0.0),
                   folds=(9, 0.028), body=body, gap=0.018)
    # faixa da capa dobrada na cintura (o pano volta pela frente e entra no cinto)
    sash_pts = [Vector(p) for p in ((sL.x + 0.02, sL.y + 0.02, sL.z - 0.02), (0.10, -0.12, 1.15), (0.0, -0.13, 1.02), (-0.12, -0.10, top - 0.01))]
    sash = K.sheet(f'{P}__SASH', [p + Vector((0, 0, 0.03 * k)) for k, p in enumerate(sash_pts)], down=(0, 0, -1), length=0.07, rows=6,
                   spread=0.0, back=(0, -0.01, 0), folds=(5, 0.006), body=body, gap=0.014)
    # ombreira de concha no ombro de fora (lado do tridente)
    sh = W('upper_arm.L', 0.12)
    n = (sh - Vector((ch.x, ch.y, sh.z - 0.05))).normalized()
    pauldron = K.scallop_cap(f'{P}__PAULDRON', sh + n * 0.035, n, 0.085, ribs=13, depth=0.45)
    LOG['saia'] = [round(top, 3), round(bottom, 3)]
    return [kilt, cape, sash, pauldron]


# ───────────────────────── pedestal próprio ─────────────────────────
CX, CY, RX, RY, H = 0.04, -0.14, 0.52, 0.43, 0.55


def ellipse_ring(bm, z, rx, ry, n=96):
    return [bm.verts.new((CX + rx * math.cos(2 * math.pi * k / n), CY + ry * math.sin(2 * math.pi * k / n), z)) for k in range(n)]


def drum():
    """Tambor elíptico com perfil de molduras (plinto, toro, fuste, cornija, laje): perfil (z, acréscimo do raio)."""
    prof = [(-H, 0.04), (-H + 0.07, 0.04), (-H + 0.075, 0.025), (-H + 0.10, 0.045), (-H + 0.13, 0.02), (-H + 0.14, 0.0),
            (-0.13, 0.0), (-0.12, 0.015), (-0.08, 0.035), (-0.035, 0.045), (-0.03, 0.03), (0.0, 0.03)]
    bm = bmesh.new()
    rings = [ellipse_ring(bm, z, RX + dr, RY + dr) for z, dr in prof]
    for a, b in zip(rings, rings[1:]):
        n = len(a)
        for k in range(n): bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    ob = mesh_from_bm(f'{P}__PEDESTAL', bm)
    bv = ob.modifiers.new('chanfro', 'BEVEL'); bv.width = 0.004; bv.segments = 2; bv.limit_method = 'ANGLE'
    apply_modifiers(ob)
    from guardian_tides_pedestal import scallop
    bm = bmesh.new()
    scallop(bm, Vector((CX, CY - RY - 0.002, -0.33)), 0.11, facing=Vector((0, -1, 0)), ribs=15)   # concha na frente
    for sx in (1, -1):                                                                              # náutilos menores nos lados
        nautilus_relief(bm, Vector((CX + sx * (RX + 0.002), CY, -0.33)), Vector((sx, 0, 0)), 0.075)
    gold = mesh_from_bm(f'{P}__PEDESTAL_ORN', bm)
    return ob, gold


def nautilus_relief(bm, c, facing, r):
    from guardian_tides_trident import tube_along
    up = Vector((0, 0, 1)); side = facing.cross(up).normalized()
    pts, rad = [], []
    for k in range(60):
        t = k / 59 * 2.6 * math.pi
        rr = r * math.exp(-0.18 * t)
        pts.append(c + (side * math.cos(t) + up * math.sin(t)) * rr + facing * 0.012)
        rad.append(0.016 * math.exp(-0.15 * t) + 0.003)
    t = tube_along(pts, rad, segs=8)
    me = bpy.data.meshes.new('tmp'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)


def volute(bm, base, out, height, r0, turns=1.6, tube=0.06):
    """Onda em voluta de náutilo: sobe do topo e enrola para fora (plano vertical que contém `out`)."""
    from guardian_tides_trident import tube_along
    up = Vector((0, 0, 1)); out = Vector(out).normalized()
    pts, rad = [], []
    n = 80
    for k in range(n):
        s = k / (n - 1)
        if s < 0.35:                                       # pescoço que sobe da água
            q = s / 0.35
            p = base + up * height * q - out * r0 * 0.3 * math.sin(q * math.pi / 2)
        else:                                              # cabeça da onda: espiral que enrola para fora e para baixo
            t = (s - 0.35) / 0.65 * turns * 2 * math.pi
            rr = r0 * math.exp(-0.22 * t)
            cc = base + up * (height - r0) - out * r0 * 0.3
            p = cc + (up * math.cos(t) + out * math.sin(t)) * rr
        pts.append(p); rad.append(tube * (1.0 if s < 0.35 else math.exp(-0.25 * (s - 0.35) / 0.65 * turns * 2 * math.pi)) + 0.006)
    t = tube_along(pts, rad, segs=14)
    me = bpy.data.meshes.new('tmp'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)


def waves(front_foot, step):
    """Topo do pedestal: ondulação baixa, degrau de onda sob o pé da frente, serpente d'água em volta dos pés,
    volutas de náutilo atrás (fora) e na frente (dentro)."""
    from guardian_tides_pedestal import CREST, sweep
    from guardian_tides_trident import tube_along
    bm = bmesh.new()
    # superfície baixa ondulada dentro da elipse
    n, grid = 40, []
    for i in range(n + 1):
        row = []
        for j in range(n + 1):
            u, v = -1 + 2 * i / n, -1 + 2 * j / n
            e = min(1.0, math.hypot(u, v))
            x, y = CX + (RX - 0.03) * u * (1 if e <= 1 else 1 / e), CY + (RY - 0.03) * v * (1 if e <= 1 else 1 / e)
            h = (0.02 + 0.015 * math.sin(x * 19 + y * 7) * math.cos(y * 13 - x * 4)) * (1 - e ** 6)
            row.append(bm.verts.new((x, y, h - 0.004)))
        grid.append(row)
    for i in range(n):
        for j in range(n):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.02)
    # degrau sob o pé da frente: crista curta, topo na altura da sola
    fx, fy = front_foot.x, front_foot.y
    sweep(bm, [(fx + 0.16, fy + 0.10), (fx, fy + 0.02), (fx - 0.14, fy - 0.06)], CREST, scale=0.55, zscale=step / 0.16, n=36, wobble=0.02)
    # serpente d'água: corre em volta dos pés, sobe e desce
    path = []
    for k in range(70):
        s = k / 69
        a = math.pi * (0.15 + 1.45 * s)
        path.append(Vector((CX + (RX - 0.09) * math.cos(a) * -1, CY + (RY - 0.08) * math.sin(a), 0.03 + 0.05 * math.sin(s * math.pi * 3) ** 2)))
    path = [p - Vector((0, 0, 0.012)) for p in path]       # meio enterrada: lê como dorso d'água, não como mangueira
    t = tube_along(path, [0.028 + 0.012 * math.sin(k / 69 * math.pi * 3) for k in range(70)], segs=12)
    me = bpy.data.meshes.new('tmp'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    # volutas: a grande atrás e fora (moldura da ponteira do tridente), a menor na frente e dentro
    volute(bm, Vector((CX + RX * 0.72, CY + RY * 0.62, 0.0)), (0.75, 0.66, 0), height=0.30, r0=0.13, turns=1.8, tube=0.065)
    volute(bm, Vector((CX - RX * 0.66, CY - RY * 0.45, 0.0)), (-0.7, -0.7, 0), height=0.20, r0=0.08, turns=1.7, tube=0.05)
    ob = mesh_from_bm(f'{P}__WAVES', bm)
    rm = ob.modifiers.new('fundir', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.004
    sm = ob.modifiers.new('polir', 'SMOOTH'); sm.factor = 0.7; sm.iterations = 4
    apply_modifiers(ob)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


# ───────────────────────── etapa ─────────────────────────

def stage_clay():
    t0 = time.time()
    reset()
    body, eyes, arm, frames = K.figure(P)
    LOG['corpo_mm'] = round(K.sculpt_rest(body, BODY) * 3300, 1)
    LOG['rosto_mm'] = round(K.sculpt_rest(body, FACE) * 3300, 1)
    hr, band = hair(body, arm)
    K.attach_eyes(eyes, arm)
    K.pose(arm, POSE)
    hand_on_shaft(arm)
    c, a, r = K.grip(arm, 'L', frames['L'])
    K.curl_fingers(arm, 'R', frames['R'], angles=(4, 6, 4), thumb=(8, 4))      # mão de comando: aberta, calma
    dz = K.ground(arm, body, 0.0)
    pb, M = arm.pose.bones, arm.matrix_world
    feet = {s: M @ pb[f'foot.{s}'].head.lerp(pb[f'foot.{s}'].tail, 0.5) for s in 'LR'}
    co = K.posed_mesh([body])
    front = co[np.linalg.norm(co - np.array(feet['L']), axis=1) < 0.14]
    step = float(front[:, 2].min())
    LOG.update(descida=round(dz, 3), degrau=round(step, 3), eixo_punho=[round(x, 3) for x in a])
    c, a, r = K.grip_axis(arm, 'L')
    from guardian_tides_trident import build_trident
    tri = build_trident(c, a); tri.name = f'{P}__TRIDENT'
    clothes = garments(body, arm)
    ped, orn = drum()
    wv = waves(feet['L'], step)
    LOG['segundos'] = round(time.time() - t0, 1)
    bpy.context.scene['depths_clay'] = json.dumps(LOG)
    WORK.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(DST))
    print('DEPTHS ok', LOG)


def stage_shots(blend=DST, tag='depths'):
    """Argila e silhueta nas 5 vistas, mesma câmera e escala para qualquer escultura (para a folha A × B)."""
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    s = bpy.context.scene; s.frame_set(s.frame_end)
    IMG.mkdir(parents=True, exist_ok=True)
    show = [o for o in bpy.data.objects if o.type == 'MESH' and 'COLLIDER' not in o.name]
    K.silhouette_shots(show, IMG / tag, size=(900, 1350), scale=3.3, focus=(0.0, -0.15, 0.95))


CLAY_OUT = ROOT / 'arena-forge/assets/poseidon-depths-clay'
GROUPS = {   # parte do GLB → objetos da cena (prefixo DEPTHS__)
    'BODY': ['BODY'], 'HAIR': ['HAIR', 'BAND'], 'CLOTH': ['KILT', 'CAPE', 'SASH'], 'DETAILS': ['PAULDRON', 'PEDESTAL_ORN'],
    'TRIDENT': ['TRIDENT'], 'PEDESTAL': ['PEDESTAL'], 'WAVES': ['WAVES'],
}
SHARE = {'BODY': 0.30, 'HAIR': 0.12, 'CLOTH': 0.18, 'DETAILS': 0.08, 'TRIDENT': 0.06, 'PEDESTAL': 0.08, 'WAVES': 0.18}


def stage_glb(total=24000):
    """GLB de argila só para composição no palácio (DEV): um material claro, sem texturas, escala de mundo,
    Y para cima, frente +Z, pivô no centro da base. Não é o asset final."""
    from mathutils import Matrix
    from common import link, select_only, tris
    from guardian_tides_build import SCALE, _decimate
    bpy.ops.wm.open_mainfile(filepath=str(DST))
    O = bpy.data.objects
    mat = bpy.data.materials.new('DEV_CLAY'); mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.78, 0.76, 0.72, 1); bsdf.inputs['Roughness'].default_value = 0.8
    M = Matrix.Scale(SCALE, 4) @ Matrix.Translation(Vector((-CX, -CY, H)))
    root = link(bpy.data.objects.new('GUARDIAN_DEPTHS_CLAY_DEV', None)); parts = []
    dg = bpy.context.evaluated_depsgraph_get()
    eyes = [o for o in O if o.name.startswith('GEO-body_male_realistic.eye')]
    for g, names in GROUPS.items():
        objs = [O[f'{P}__{n}'] for n in names] + (eyes if g == 'BODY' else [])
        bm = bmesh.new()
        for o in objs:
            me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg); me.transform(o.matrix_world)
            bm.from_mesh(me); bpy.data.meshes.remove(me)
        e = mesh_from_bm(f'DEPTHS__{g}', bm)
        _decimate(e, int(total * SHARE[g]))
        e.data.transform(M); e.data.materials.clear(); e.data.materials.append(mat)
        e.parent = root; parts.append(e)
    CLAY_OUT.mkdir(parents=True, exist_ok=True)
    out = CLAY_OUT / 'guardian-depths-clay.glb'
    select_only(root, *parts, active=root)
    bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True, export_yup=True,
                              export_materials='EXPORT', export_extras=False, export_animations=False)
    LOG['glb_tri'] = sum(tris(e) for e in parts)
    print('DEPTHS glb', out, LOG)


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if 'glb' in argv:
        stage_glb()
    elif 'tides' in argv:   # só leitura: renderiza a V14.1 do Guardião das Marés com a mesma câmera, para a folha A × B
        stage_shots(WORK / 'guardian-tides-v14-1-sculpt.blend', 'tides')
    else:
        if 'shots' not in argv: stage_clay()
        if 'clay' not in argv: stage_shots()
