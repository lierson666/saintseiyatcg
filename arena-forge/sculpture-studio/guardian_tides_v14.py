"""Guardian of the Tides · V14 (hero sculpt polish). Parte da escultura V13 salva e NÃO refaz a simulação do pano.

Rodar:
  "~/Applications/Blender 4.5 LTS.app/Contents/MacOS/Blender" -b --factory-startup \
      --python arena-forge/sculpture-studio/guardian_tides_v14.py
Lê  WORK/guardian-tides-v13-sculpt.blend (somente leitura) e grava WORK/guardian-tides-v14-sculpt.blend.

O que muda (tudo geometria, nada de textura):
  corpo    multires aplicado no nível 2 (malha densa ainda presa à armadura) e volumes em repouso: ombros e deltoides,
           peito, dorsais, trapézio, pescoço e braços. Valores contidos: mármore heroico, não fisiculturismo.
  rosto    mais maduro e severo: arco da sobrancelha baixo e projetado, sulcos verticais entre as sobrancelhas,
           pálpebra funda, maçãs altas, face encovada, linhas de tensão na testa, queixo mais forte.
  cabelo   menos mechas soltas e mais longas, coladas à massa; sulcos em volta de um eixo testa → nuca;
           costeletas ligando cabelo e barba.
  manto    a malha simulada é editada: sai de dentro do corpo novo, a aba das costas deixa de ser tubo,
           e o pano é recolhido dentro do punho esquerdo, que fecha mais.
  detalhes cinto de escamas em relevo no alto do himátion; hipocampo em relevo no painel da frente.
  ondas    crista maior sob o pé (o topo continua na altura da sola), uma onda que quebra atrás do pé
           e uma onda que transborda pela borda do pedestal (costas e lado direito).
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bmesh
import bpy
import numpy as np
from mathutils import Quaternion, Matrix, Vector
from mathutils.bvhtree import BVHTree

from common import apply_modifiers, link, mesh_from_bm, rot_about, select_only
from guardian_tides_trident import tube_along

WORK = Path.home() / 'worktrees/sstcg-tools/sculpt-work'
SRC = WORK / 'guardian-tides-v13-sculpt.blend'
DST = WORK / 'guardian-tides-v14-sculpt.blend'
LOG = {}


# ───────────────────────── utilidades de escultura ─────────────────────────

def gauss(co, c, s):
    d = (co - np.array(c)) / np.array(s)
    return np.exp(-0.5 * (d * d).sum(1))


def sculpt(co, nr, c, s, move=(0, 0, 0), normal=0.0, mirror=True):
    """Deslocamento suave (gaussiano) em repouso. `move` em metros do corpo base; `normal` ao longo da normal.
    Com mirror, aplica também do outro lado (x espelhado, move.x invertido)."""
    out = np.zeros_like(co)
    for sx in ((1, -1) if mirror and c[0] != 0 else (1,)):
        w = gauss(co, (c[0] * sx, c[1], c[2]), s)[:, None]
        out += w * (np.array((move[0] * sx, move[1], move[2])) + nr * normal)
    return out


def apply_multires(body, level=2):
    mr = next((m for m in body.modifiers if m.type == 'MULTIRES'), None)
    if mr is None: return
    mr.levels = mr.render_levels = level
    select_only(body)
    bpy.ops.object.modifier_apply(modifier=mr.name)


def rest_arrays(me):
    co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co)
    nr = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('normal', nr)
    return co.reshape(-1, 3).astype(np.float64), nr.reshape(-1, 3).astype(np.float64)


def write(me, co):
    me.vertices.foreach_set('co', co.astype(np.float32).ravel()); me.update()


def group_weights(ob, names):
    w = np.zeros(len(ob.data.vertices))
    idx = {ob.vertex_groups[n].index: n for n in names if n in ob.vertex_groups}
    for v in ob.data.vertices:
        for g in v.groups:
            if g.group in idx: w[v.index] = max(w[v.index], g.weight)
    return w


# ───────────────────────── corpo e rosto ─────────────────────────

def sculpt_body(body):
    me = body.data
    co, nr = rest_arrays(me)
    d = np.zeros_like(co)
    d += sculpt(co, nr, (0.19, -0.005, 1.37), (0.05, 0.08, 0.06), move=(0.012, 0, 0.002))       # ombros mais largos
    d += sculpt(co, nr, (0.20, 0.0, 1.33), (0.035, 0.05, 0.05), normal=0.006)                    # deltoide
    d += sculpt(co, nr, (0.07, -0.10, 1.29), (0.06, 0.04, 0.05), move=(0.003, -0.010, 0.003))   # peitoral
    d += sculpt(co, nr, (0.14, 0.02, 1.22), (0.03, 0.06, 0.07), move=(0.008, 0, 0))            # dorsal: tronco em V
    d += sculpt(co, nr, (0.08, 0.01, 1.43), (0.045, 0.05, 0.025), move=(0.003, 0, 0.010))      # trapézio
    d += sculpt(co, nr, (0.0, -0.01, 1.455), (0.05, 0.05, 0.03), normal=0.004, mirror=False)   # pescoço
    arms = group_weights(body, ['upper_arm.L', 'upper_arm.R', 'forearm.L', 'forearm.R'])
    d += nr * (arms * 0.005)[:, None]                                                          # braços
    LOG['corpo_mm_max'] = round(float(np.linalg.norm(d, axis=1).max() * 3300), 1)   # mm na escala de mundo
    write(me, co + d)


def sculpt_face(body):
    me = body.data
    co, nr = rest_arrays(me)
    front = 1 / (1 + np.exp((co[:, 1] + 0.08) / 0.01))          # só a frente do rosto
    d = np.zeros_like(co)
    d += sculpt(co, nr, (0.03, -0.14, 1.598), (0.022, 0.02, 0.008), move=(0, -0.004, -0.0025))  # arco da sobrancelha
    d += sculpt(co, nr, (0.015, -0.145, 1.597), (0.01, 0.02, 0.007), move=(0, 0, -0.003))      # ponta interna baixa
    d += sculpt(co, nr, (0.007, -0.15, 1.594), (0.0022, 0.02, 0.009), normal=-0.0025)          # sulcos entre as sobrancelhas
    d += sculpt(co, nr, (0.032, -0.135, 1.585), (0.016, 0.02, 0.005), normal=-0.002)           # pálpebra funda
    d += sculpt(co, nr, (0.055, -0.115, 1.555), (0.015, 0.025, 0.01), normal=0.004)            # maçãs
    d += sculpt(co, nr, (0.05, -0.12, 1.525), (0.015, 0.025, 0.012), normal=-0.003)            # face encovada
    d += sculpt(co, nr, (0.03, -0.14, 1.565), (0.014, 0.02, 0.004), normal=0.0012)             # bolsa sob o olho
    d += sculpt(co, nr, (0.028, -0.145, 1.52), (0.006, 0.02, 0.015), normal=-0.002)            # sulco nasolabial
    d += sculpt(co, nr, (0.0, -0.15, 1.47), (0.025, 0.03, 0.015), normal=0.003, mirror=False)  # queixo
    # linhas de tensão na testa: três sulcos rasos e horizontais
    band = np.clip((co[:, 2] - 1.607) / 0.006, 0, 1) * np.clip((1.626 - co[:, 2]) / 0.006, 0, 1) * np.exp(-0.5 * (co[:, 0] / 0.04) ** 2)
    lines = (1 - np.abs(np.sin(math.pi * (co[:, 2] - 1.607) / 0.013))) ** 3
    d += nr * (-0.0009 * band * lines)[:, None]
    d *= front[:, None]
    LOG['rosto_mm_max'] = round(float(np.linalg.norm(d, axis=1).max() * 3300), 1)
    write(me, co + d)


def in_beard_v14(p):
    """Barba V14: a mesma área da V13 mais as costeletas, que ligam a barba ao cabelo diante da orelha."""
    from guardian_tides_hair import in_beard
    side = abs(p.x) > 0.062 and 1.50 < p.z < 1.59 and -0.075 < p.y < 0.0
    return in_beard(p) or side


def rebuild_hair(body, arm):
    from guardian_tides_hair import build_hair, laurel_crown
    for n in ('TIDES__HAIR_BEARD', 'TIDES__LAUREL'):
        o = bpy.data.objects.get(n)
        if o: bpy.data.objects.remove(o)
    arm.data.pose_position = 'REST'; bpy.context.view_layer.update()   # cabelo nasce na cabeça em repouso; o osso aplica a pose
    hair = build_hair(body, hair_count=52, beard_count=280, hairline=1.624, shell_thick=0.006,
                      keep_lock=lambda l: l[0][-1].z > 1.48,      # nenhuma mecha do couro desce até o ombro beard_test=in_beard_v14,
                      lock_kw=dict(length=(0.15, 0.22), lift=(0.010, 0.006), radius=0.016, wave=(0.08, 0.16)),
                      carve_kw=dict(locks=18, depth=0.0075, axis=((0, -0.20, 1.40), (0, 0.20, 1.40))))
    soften_hairline(hair)
    crown = laurel_crown(hair, body)
    for o in (hair, crown):          # presos ao osso da cabeça na pose de repouso: a pose leva junto
        mw = o.matrix_world.copy(); o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = 'head'
        bpy.context.view_layer.update(); o.matrix_world = mw
    arm.data.pose_position = 'POSE'; bpy.context.view_layer.update()
    LOG['cabelo_tris'] = sum(len(p.vertices) - 2 for p in hair.data.polygons)
    return hair, crown


def soften_hairline(hair, iters=12):
    """A casca com espessura deixa um degrau na linha do cabelo (cara de capacete): suaviza só a faixa da borda."""
    me = hair.data
    co = np.array([v.co[:] for v in me.vertices])
    e = np.array([ed.vertices[:] for ed in me.edges])
    band = (co[:, 1] < -0.04) & (co[:, 2] > 1.60) & (co[:, 2] < 1.66)
    w = np.clip(1 - np.abs(co[:, 2] - 1.628) / 0.02, 0, 1) * band
    deg = np.bincount(e.ravel(), minlength=len(co)).astype(float)[:, None] + 1e-9
    for _ in range(iters):
        avg = np.zeros_like(co); np.add.at(avg, e[:, 0], co[e[:, 1]]); np.add.at(avg, e[:, 1], co[e[:, 0]])
        co += (0.5 * w)[:, None] * (avg / deg - co)
    for v, c in zip(me.vertices, co): v.co = c
    me.update()


def close_left_hand(arm, factor=1.7):
    """A mão esquerda fecha mais (segura o pano): cada falange mantém o eixo local da V13 e gira 1,7× o ângulo.
    Só rotação local: não depende da ordem de atualização dos ossos."""
    for k in range(4):
        for j in (1, 2, 3):
            b = arm.pose.bones[f'f{k}_{j}.L']
            b.rotation_mode = 'QUATERNION'
            axis, ang = b.matrix_basis.to_quaternion().to_axis_angle()
            b.rotation_quaternion = Quaternion(axis, ang * factor)
    bpy.context.view_layer.update()
    LOG['mao_esq_fator'] = factor


# ───────────────────────── manto ─────────────────────────

HIPPO_ON = False
HIP_N = 66 * 128      # vértices do himátion na malha simulada (ordem preservada desde a criação)
MANTLE_ROWS, MANTLE_COLS = 110, 34


def cloth_arrays(cloth):
    co = np.empty(len(cloth.data.vertices) * 3, np.float32); cloth.data.vertices.foreach_get('co', co)
    return co.reshape(-1, 3).astype(np.float64)


def body_bvh(body):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(body.matrix_world); bm.normal_update()
    tree = BVHTree.FromBMesh(bm); bm.free(); ev.to_mesh_clear()
    return tree


def flatten_back_flap(co):
    """A aba das costas enrolou em tubo na simulação. Cada fileira da aba é trazida para perto do seu eixo
    principal (mantém 35 % do desvio: as dobras ficam, o tubo some) e alargada 15 %."""
    rows = co[HIP_N:].reshape(MANTLE_ROWS, MANTLE_COLS, 3)
    for i in range(MANTLE_ROWS):
        w = np.clip((i - 52) / 14, 0, 1) ** 1.5
        if w <= 0: continue
        r = rows[i]; c = r.mean(0)
        a = np.linalg.svd(r - c)[2][0]
        t = (r - c) @ a
        along = c + np.outer(t * (1.0 if abs(a[2]) > 0.5 else 1.15), a)
        wz = np.clip((1.30 - r[:, 2]) / 0.06, 0, 1)                 # o ombro fica como a simulação deixou
        dv = (along + (r - along) * 0.35) - r
        nd = np.linalg.norm(dv, axis=1, keepdims=True)
        dv *= np.minimum(1, 0.025 / (nd + 1e-9))                    # nunca mais que 2,5 cm (base) por vértice
        rows[i] = r + (w * wz)[:, None] * dv
    # da fileira 88 em diante a barra voltava para as pernas (a bolsa): agora cai a prumo e abre de leve
    yc = rows[:, :, 1].mean(1)
    for i in range(88, MANTLE_ROWS):
        rows[i, :, 1] += max(0.0, yc[88] + 0.0006 * (i - 88) - yc[i])
    co[HIP_N:] = rows.reshape(-1, 3)
    return co


def push_out(co, tree, gap=0.005, reach=0.03, skip=None):
    """Tira o pano de dentro do corpo novo (mais largo): cada vértice dentro ou rente à pele vai para fora."""
    moved = 0
    for i, p in enumerate(co):
        if skip is not None and skip[i]: continue
        loc, nrm, _, dist = tree.find_nearest(Vector(p), reach)
        if loc is None: continue
        depth = (Vector(p) - loc).dot(nrm)
        if depth < gap:
            co[i] = np.array(loc + nrm * gap); moved += 1
    return co, moved


def gather_in_fist(co, arm, radius=0.14):
    """Recolhe o pano dentro do punho esquerdo: o tecido perto da mão é puxado para um feixe no eixo do punho."""
    from guardian_tides_body import grip_axis
    c, a, r = grip_axis(arm, 'L')
    c, a = np.array(c), np.array(a)
    q = co - c
    t = np.clip(q @ a, -0.035, 0.035)
    radial = q - np.outer(q @ a, a)
    rl = np.linalg.norm(radial, axis=1, keepdims=True) + 1e-9
    target = c + np.outer(t, a) + radial / rl * 0.011
    d = np.linalg.norm(q, axis=1)
    w = np.clip(1 - d / radius, 0, 1) ** 1.5
    w = w * w * (3 - 2 * w)
    w[:HIP_N] = 0                                   # só a ponta do manto, nunca o himátion
    LOG['pano_no_punho'] = int((w > 0.5).sum())
    return co + w[:, None] * (target - co), w > 0.2


def fix_cloth(cloth, body, arm):
    co = cloth_arrays(cloth)
    co = flatten_back_flap(co)
    co, in_fist = gather_in_fist(co, arm)
    tree = body_bvh(body)
    before = co.copy()
    co, moved = push_out(co, tree, skip=in_fist)
    # o empurrão vinca a malha (e o solidify estoura no vinco): suaviza a vizinhança do que andou e empurra de novo
    e = np.array([ed.vertices[:] for ed in cloth.data.edges])
    hit = np.linalg.norm(co - before, axis=1) > 1e-6
    for _ in range(2): hit[e[hit[e[:, 0]], 1]] = True; hit[e[hit[e[:, 1]], 0]] = True
    deg = np.bincount(e.ravel(), minlength=len(co)).astype(float)[:, None]
    for _ in range(4):
        avg = np.zeros_like(co); np.add.at(avg, e[:, 0], co[e[:, 1]]); np.add.at(avg, e[:, 1], co[e[:, 0]])
        h = hit & ~in_fist; co[h] += 0.5 * (avg[h] / deg[h] - co[h])
        co, _ = push_out(co, tree, skip=in_fist)
    LOG['pano_empurrado'] = moved
    write(cloth.data, co)
    for m in cloth.modifiers:      # o feixe no punho cria faces quase planas; sem limite o solidify gera lanças
        if m.type == 'SOLIDIFY': m.use_even_offset = False


# ───────────────────────── detalhes ─────────────────────────

def scale_belt(cloth, height=0.034, lift=0.010, res=0.0012):
    """Cinto de escamas sobre a borda do himátion: escamas em fileiras desencontradas, bordas arredondadas."""
    co = cloth_arrays(cloth)
    ring = co[:128]                                  # fileira de cima do tubo (cintura), já na pose
    c = ring.mean(0)
    pts = [Vector(p) for p in ring] + [Vector(ring[0])]
    L = np.cumsum([0] + [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)])
    nu, nv = int(L[-1] / res), int(height / res)
    bm = bmesh.new(); grid = []
    for i in range(nu + 1):
        s = L[-1] * i / nu
        k = min(int(np.searchsorted(L, s, side='right')) - 1, len(pts) - 2)
        f = (s - L[k]) / max(L[k + 1] - L[k], 1e-9)
        p = pts[k].lerp(pts[k + 1], f)
        out = Vector((p.x - c[0], p.y - c[1], 0)).normalized()
        row = []
        for j in range(nv + 1):
            v = j / nv
            # escamas: células 1,4 × 1,1 cm, fileiras desencontradas; cúpula aberta para baixo
            cu, cv = s / 0.014, (1 - v) * height / 0.011
            fx = (cu + 0.5 * (int(cv) % 2)) % 1 - 0.5; fy = cv % 1
            dome = max(0.0, 1 - (fx / 0.5) ** 2 - (fy * 0.95) ** 2) ** 0.5
            rim = math.exp(-((v - 0.03) / 0.05) ** 2) + math.exp(-((v - 0.97) / 0.05) ** 2)
            h = 0.0035 * dome * (0.15 < v < 0.85) + 0.004 * rim
            row.append(bm.verts.new(p + out * (lift + h) + Vector((0, 0, (v - 0.35) * height))))
        grid.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=-0.004)
    belt = mesh_from_bm('TIDES__BELT', bm)
    for p in belt.data.polygons: p.use_smooth = True
    return belt


HIPPO = {   # hipocampo de perfil, virado para a direita (x no painel, y para cima), em metros do corpo base
    'spine': ([(0.095, 0.072), (0.07, 0.07), (0.05, 0.055), (0.03, 0.03), (0.0, 0.015), (-0.03, 0.012), (-0.055, 0.0),
               (-0.075, -0.02), (-0.08, -0.045), (-0.065, -0.065), (-0.045, -0.067), (-0.036, -0.052), (-0.046, -0.04), (-0.056, -0.047)],
              [0.013, 0.015, 0.018, 0.024, 0.024, 0.02, 0.016, 0.012, 0.009, 0.007, 0.005, 0.004, 0.003, 0.0015]),
    'head': ([(0.093, 0.074), (0.112, 0.06), (0.128, 0.046), (0.137, 0.037)], [0.013, 0.011, 0.008, 0.006]),
    'ear': ([(0.088, 0.08), (0.084, 0.095)], [0.004, 0.0012]),
    'leg1': ([(0.045, 0.018), (0.068, 0.0), (0.078, -0.02), (0.094, -0.028)], [0.008, 0.006, 0.0045, 0.003]),
    'leg2': ([(0.03, 0.012), (0.052, -0.012), (0.06, -0.032), (0.078, -0.042)], [0.007, 0.0055, 0.004, 0.0025]),
}


def hippocampus(cx, y_face, zc, depth=0.4):
    """Relevo do hipocampo: tubos afunilados no plano do painel, crina em leque, achatados e fundidos por remesh."""
    bm = bmesh.new()
    def add(pts2, radii):
        pts = [Vector((cx + x, 0.0, zc + y)) for x, y in pts2]
        from guardian_tides_drapery import _path
        dense = _path(pts, max(12, len(pts) * 6))
        rr = np.interp(np.linspace(0, 1, len(dense)), np.linspace(0, 1, len(radii)), radii)
        t = tube_along(dense, list(rr), segs=12)
        me = bpy.data.meshes.new('tmp'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    for pts, radii in HIPPO.values():
        add(pts, radii)
    for k in range(7):                                    # crina: leque de pontas ao longo do pescoço
        s = 0.15 + 0.1 * k
        x0, y0 = 0.095 - 0.065 * s, 0.072 - 0.02 * s + 0.01
        add([(x0, y0), (x0 - 0.012, y0 + 0.016 - 0.002 * k)], [0.004, 0.0008])
    for k in range(5):                                    # nadadeira da cauda
        a = -0.6 + 0.3 * k
        add([(-0.07, -0.02), (-0.07 - 0.025 * math.cos(a), -0.02 + 0.025 * math.sin(a))], [0.003, 0.0008])
    ob = mesh_from_bm('TIDES__HIPPOCAMPUS', bm)
    rm = ob.modifiers.new('fundir', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.0014
    sm = ob.modifiers.new('polir', 'SMOOTH'); sm.factor = 0.6; sm.iterations = 4
    apply_modifiers(ob)
    co = cloth_arrays(ob)
    # achata em relevo: o fundo (lado +Y dos tubos) encosta na face do dado (1 mm para dentro); a frente sai para -Y
    co[:, 1] = y_face + 0.001 - (co[:, 1].max() - co[:, 1]) * depth
    write(ob.data, co)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


# ───────────────────────── ondas ─────────────────────────

TALL = [(y * 0.85, z * 2.15) for y, z in [(0.04, -0.02), (-0.02, 0.04), (-0.10, 0.10), (-0.18, 0.140), (-0.25, 0.155),
        (-0.33, 0.160), (-0.41, 0.156), (-0.47, 0.140), (-0.515, 0.112), (-0.535, 0.080), (-0.525, 0.052),
        (-0.495, 0.040), (-0.47, 0.046), (-0.455, 0.030), (-0.46, -0.02)]]
SPILL = [(-0.06, 0.0), (-0.02, 0.05), (0.03, 0.065), (0.07, 0.035), (0.088, -0.03), (0.078, -0.10), (0.064, -0.15),
         (0.046, -0.115), (0.04, -0.05), (0.02, -0.012), (-0.03, -0.022)]   # (para fora da borda, altura)


def waves_v14(bm):
    from guardian_tides_pedestal import CREST, sweep
    # crista maior sob o pé: 30 % mais larga e mais longa; a altura do topo continua a da sola
    sweep(bm, [(0.47, 0.0), (0.18, 0.03), (-0.10, 0.0)], CREST, scale=1.3, zscale=1.0)
    # onda alta que quebra atrás do pé esquerdo, enrolando para dentro (sobre o pedestal, longe da perna)
    sweep(bm, [(0.41, -0.10), (0.42, 0.05), (0.40, 0.20)], TALL, scale=0.85, zscale=1.0, n=36, wobble=0.03)
    # onda que transborda pela borda: costas e lado direito, descendo pela cornija (espaços negativos sob o lábio)
    sweep(bm, [(0.40, 0.225), (0.0, 0.236), (-0.40, 0.226), (-0.457, 0.15), (-0.462, -0.10), (-0.457, -0.30)],
          SPILL, scale=1.0, n=72, wobble=0.02)


# ───────────────────────── etapa ─────────────────────────

def stage_polish():
    import time
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=str(SRC))
    s = bpy.context.scene; s.frame_set(s.frame_end)
    O = bpy.data.objects
    arm, body, cloth = O['TIDES_RIG'], O['TIDES__BODY'], O['TIDES__CLOTH']
    arm.animation_data_clear()                      # a pose fica como está; a animação só servia ao pano (já aplicado)
    if O.get('TIDES_COLLIDER'): O.remove(O['TIDES_COLLIDER'])
    apply_multires(body, 2)
    LOG['corpo_verts'] = len(body.data.vertices)
    sculpt_body(body)
    sculpt_face(body)
    rebuild_hair(body, arm)
    close_left_hand(arm)
    fix_cloth(cloth, body, arm)
    scale_belt(cloth)
    from guardian_tides_pedestal import CENTER, D, H, gold_panels, waves
    O.remove(O['TIDES__WAVES']); waves(v14=True, voxel=0.0035)
    # Hipocampo fica de fora: na revisão de argila leu como lagarto (sem qualidade). A vieira da V13 volta.
    if HIPPO_ON:
        O.remove(O['TIDES__PEDESTAL_GOLD']); gold_panels(front_scallop=False)
        hippocampus(CENTER.x, CENTER.y - (D - 0.1) / 2, (-H + 0.17 - 0.25) / 2)
    LOG['segundos'] = round(time.time() - t0, 1)
    s['tides_v14'] = repr(LOG)
    bpy.ops.wm.save_as_mainfile(filepath=str(DST))
    print('V14 ok', LOG)


if __name__ == '__main__':
    stage_polish()
