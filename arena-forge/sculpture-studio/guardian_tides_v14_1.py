"""Guardian of the Tides · V14.1 (final sculpt polish). Parte da V14 salva; não refaz a simulação do pano.

Rodar:
  "~/Applications/Blender 4.5 LTS.app/Contents/MacOS/Blender" -b --factory-startup \
      --python arena-forge/sculpture-studio/guardian_tides_v14_1.py
Lê  WORK/guardian-tides-v14-sculpt.blend (somente leitura) e grava WORK/guardian-tides-v14-1-sculpt.blend.

Revisão localizada (docs/art-bible/POSEIDON_V14_ART_REVIEW_DECISIONS.md):
  cabelo   refeito com a mesma semente e os mesmos cachos de barba; a borda da casca desce em rampa até a pele
           (sem fresta nem degrau), nenhuma mecha nasce ou passa pela têmpora, sulcos mais finos e topo alisado.
  mão      o pano da borda do manto é enrolado dentro do punho esquerdo, encostado nos dedos (raio medido por raio
           lançado do eixo do punho), estufa entre os dedos e sai pelo lado do mindinho como uma ponta pregueada.
  onda     a onda alta atrás do pé esquerdo é refeita: nasce da crista principal, sobe de lado e enrola para fora,
           com o vão sob o lábio; sem as costelas horizontais que liam como concha.
Corpo, rosto, barba, cinto, pedestal, tridente e o resto do manto ficam como na V14.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from common import apply_modifiers, mesh_from_bm
from guardian_tides_v14 import HIP_N, MANTLE_COLS, MANTLE_ROWS, body_bvh, cloth_arrays, push_out, write

WORK = Path.home() / 'worktrees/sstcg-tools/sculpt-work'
SRC = WORK / 'guardian-tides-v14-sculpt.blend'
DST = WORK / 'guardian-tides-v14-1-sculpt.blend'
HAIRLINE = 1.624
LOG = {}


def laplace(co, e, mask, iters, f=0.5):
    deg = np.bincount(e.ravel(), minlength=len(co)).astype(float)[:, None] + 1e-9
    w = (f * mask)[:, None]
    for _ in range(iters):
        avg = np.zeros_like(co); np.add.at(avg, e[:, 0], co[e[:, 1]]); np.add.at(avg, e[:, 1], co[e[:, 0]])
        co += w * (avg / deg - co)
    return co


# ───────────────────────── cabelo ─────────────────────────

def keep_lock_v141(l):
    """Filtro da V14 (nenhuma mecha desce até o ombro) mais: nenhuma mecha passa pela têmpora ou diante da orelha."""
    pts = l[0]
    if pts[-1].z <= 1.48: return False
    return not any(abs(p.x) > 0.058 and p.z < 1.60 and p.y < -0.012 for p in pts)   # só à frente da orelha


def taper_hairline(hair, body):
    """A borda da casca era um degrau de ~1 cm acima da pele (fresta escura e tira na têmpora). Perto da linha do
    cabelo a espessura cai em rampa até zero e a borda entra 0,8 mm na pele."""
    me = hair.data
    co = np.array([v.co[:] for v in me.vertices])
    f = np.clip((co[:, 1] + 0.07) / 0.10, 0, 1)
    thr = HAIRLINE - (HAIRLINE - 1.50) * f
    k = np.clip((co[:, 2] - thr + 0.004) / 0.03, 0, 1); k = k * k * (3 - 2 * k)
    sel = np.where((k < 1) & (co[:, 1] < 0.03) & ~((co[:, 1] < -0.03) & (co[:, 2] < 1.565)))[0]   # testa e têmporas; nuca e barba não mudam
    bm = bmesh.new(); bm.from_mesh(body.data); bm.normal_update(); tree = BVHTree.FromBMesh(bm); bm.free()
    moved = np.zeros(len(co), bool)
    for i in sel:
        loc, nrm, _, _ = tree.find_nearest(Vector(co[i]), 0.05)
        if loc is None: continue
        d = (Vector(co[i]) - loc).dot(nrm)
        co[i] = np.array(loc + nrm * (d * k[i] - 0.0008 * (1 - k[i]))); moved[i] = True
    e = np.array([ed.vertices[:] for ed in me.edges])
    ring = moved.copy()
    for _ in range(3): ring[e[ring[e[:, 0]], 1]] = True; ring[e[ring[e[:, 1]], 0]] = True
    co = laplace(co, e, ring.astype(float), 4)
    for v, c in zip(me.vertices, co): v.co = c
    me.update()
    LOG['linha_cabelo_verts'] = int(moved.sum())


def soften_crown(hair, iters=5):
    """Topo: as mechas fundidas formavam placas. Alisa a massa acima da coroa, mais forte no alto."""
    me = hair.data
    co = np.array([v.co[:] for v in me.vertices])
    e = np.array([ed.vertices[:] for ed in me.edges])
    w = np.clip((co[:, 2] - 1.64) / 0.04, 0, 1) * 0.6
    co = laplace(co, e, w, iters)
    for v, c in zip(me.vertices, co): v.co = c
    me.update()


def rebuild_hair_v141(body, arm):
    from guardian_tides_hair import build_hair, laurel_crown
    for n in ('TIDES__HAIR_BEARD', 'TIDES__LAUREL'):
        o = bpy.data.objects.get(n)
        if o: bpy.data.objects.remove(o)
    arm.data.pose_position = 'REST'; bpy.context.view_layer.update()
    # mesmos parâmetros da V14 que consomem o gerador aleatório: barba e bigode saem idênticos
    hair = build_hair(body, hair_count=52, beard_count=280, hairline=HAIRLINE, shell_thick=0.006,
                      keep_lock=keep_lock_v141,
                      lock_kw=dict(length=(0.15, 0.22), lift=(0.010, 0.006), radius=0.016, wave=(0.08, 0.16)),
                      carve_kw=dict(locks=28, depth=0.005, axis=((0, -0.20, 1.40), (0, 0.20, 1.40))))
    soften_crown(hair)
    taper_hairline(hair, body)
    crown = laurel_crown(hair, body)
    for o in (hair, crown):
        mw = o.matrix_world.copy(); o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = 'head'
        bpy.context.view_layer.update(); o.matrix_world = mw
    arm.data.pose_position = 'POSE'; bpy.context.view_layer.update()
    LOG['cabelo_tris'] = sum(len(p.vertices) - 2 for p in hair.data.polygons)


# ───────────────────────── mão e pano ─────────────────────────

def grip_cloth(cloth, body, arm, rows_full=6, rows_fade=5):
    """Enrola a borda do manto dentro do punho esquerdo, em contato com os dedos.
    Eixo do punho = grip_axis. Para cada vértice das primeiras fileiras: posição ao longo do eixo (a ponta além do
    mindinho é esticada para fora), ângulo mantido, raio = distância até a pele medida por raio a partir do eixo,
    menos meia espessura do pano. Onde o raio escapa entre os dedos, o pano estufa (compressão)."""
    from guardian_tides_body import grip_axis
    c, a, _ = grip_axis(arm, 'L'); c, a = np.array(c), np.array(a)
    e1 = np.cross(a, (0, 0, 1.0)); e1 /= np.linalg.norm(e1); e2 = np.cross(a, e1)
    tree = body_bvh(body)
    co = cloth_arrays(cloth)
    rows = co[HIP_N:].reshape(MANTLE_ROWS, MANTLE_COLS, 3)
    n_rows = rows_full + rows_fade
    fist = np.zeros(len(co), bool); contact = gaps = 0
    for i in range(n_rows):
        w = 1.0 if i < rows_full else 1 - (i - rows_full + 1) / (rows_fade + 1)
        w = w * w * (3 - 2 * w)
        rank = np.argsort(np.argsort((rows[i] - c) @ a)) / (MANTLE_COLS - 1)
        for j in range(MANTLE_COLS):
            p = rows[i, j]; q = p - c; t = q @ a
            rv = q - t * a; u = rv / (np.linalg.norm(rv) + 1e-9)
            th = math.atan2(u @ e2, u @ e1)
            # a borda inteira atravessa o punho: 40 % das colunas (lado do mindinho) formam a ponta que sai
            tt = -0.095 + 0.15 * rank[j] if i < rows_full else min(t if t > -0.03 else -0.03 + (t + 0.03) * 2.2, 0.06)
            o = c + a * tt
            if abs(tt) <= 0.035:
                hit = tree.ray_cast(Vector(o), Vector(u), 0.035)
                if hit[0] is not None:
                    rho = max(hit[3] - 0.0045, 0.004); contact += 1
                else:
                    rho = 0.021 * (1 + 0.15 * math.sin(4 * th)); gaps += 1
                if i < rows_full: fist[HIP_N + i * MANTLE_COLS + j] = True
                target = o + u * rho
            elif tt < -0.035:                      # ponta que sai pelo mindinho: abre em leque pregueado e pende
                s = -0.035 - tt
                rho = (0.015 + 0.7 * s) * (1 + 0.3 * math.sin(5 * th + 0.6 * i))
                target = o + u * rho; target[2] -= 5.0 * s * s
            else:                                  # entrada do pano pelo lado do indicador
                rho = 0.017 + 0.8 * (tt - 0.035)
                target = o + u * rho
            rows[i, j] = p + w * (target - p)
    co[HIP_N:] = rows.reshape(-1, 3)
    e = np.array([ed.vertices[:] for ed in cloth.data.edges])
    band = np.zeros(len(co)); band[HIP_N + (rows_full - 2) * MANTLE_COLS: HIP_N + (n_rows + 4) * MANTLE_COLS] = 1
    band[fist] = 0
    co = laplace(co, e, band, 4)
    skip = np.ones(len(co), bool); skip[HIP_N + rows_full * MANTLE_COLS: HIP_N + (n_rows + 4) * MANTLE_COLS] = False
    co, moved = push_out(co, tree, skip=skip)
    write(cloth.data, co)
    LOG.update(punho_contato=contact, punho_estufa=gaps, pano_empurrado_mao=moved)


# ───────────────────────── onda alta ─────────────────────────

def sweep_env(bm, path, profile, scale, zscale, n, env, wobble=0.02):
    """Como pedestal.sweep, mas com envelope próprio (assimétrico) e largura que acompanha a altura."""
    from guardian_tides_drapery import _path
    pts = _path([Vector((x, y, 0)) for x, y in path], n + 1)
    rings = []
    for i, c in enumerate(pts):
        s = i / n
        t = (pts[min(i + 1, n)] - pts[max(i - 1, 0)]).normalized()
        lat = Vector((0, 0, 1)).cross(t).normalized()
        h = env(s); sc = scale * (0.55 + 0.45 * h)
        sw = wobble * math.sin(s * math.pi * 1.3)
        rings.append([bm.verts.new(c + lat * (-y * sc + sw * max(z, 0) / 0.16) + Vector((0, 0, max(z * zscale * h, -0.02))))
                      for y, z in profile])
    m = len(profile)
    for ra, rb in zip(rings, rings[1:]):
        for k in range(m):
            bm.faces.new((ra[k], ra[(k + 1) % m], rb[(k + 1) % m], rb[k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])


def tall_env(s):
    """Assimétrica: o fim de fora (+X) fecha rápido como um tubo de onda (o vão diminui até sumir), culmina a
    25 % do caminho e desce devagar até fundir na crista principal."""
    if s < 0.25:
        return 0.05 + 0.95 * math.sin(math.pi / 2 * s / 0.25) ** 0.8
    return max(0.08, 1 - ((s - 0.25) / 0.75) ** 1.3 * 0.92)


WALL = [  # (lateral, altura): costas em rampa longa, crista que tomba para a frente, lábio caído, tubo (vão), base
    (0.22, -0.02), (0.16, 0.05), (0.10, 0.12), (0.05, 0.18), (0.0, 0.235), (-0.05, 0.265), (-0.10, 0.27),
    (-0.145, 0.25), (-0.175, 0.215), (-0.185, 0.175), (-0.175, 0.14), (-0.16, 0.135), (-0.15, 0.16),
    (-0.13, 0.19), (-0.095, 0.205), (-0.06, 0.19), (-0.035, 0.155), (-0.03, 0.10), (-0.045, 0.05),
    (-0.08, 0.01), (-0.13, -0.02),
]


def waves_v141(bm):
    from guardian_tides_pedestal import CREST, sweep
    from guardian_tides_v14 import SPILL
    sweep(bm, [(0.47, 0.0), (0.18, 0.03), (-0.10, 0.0)], CREST, scale=1.3, zscale=1.0)          # = V14
    # onda alta atrás do pé esquerdo: corre de +X (borda) para o centro, o lábio cai para a frente sobre o vão;
    # de lado e de 3/4 aparece o perfil enrolado; do centro para dentro ela desce e funde na crista principal
    sweep_env(bm, [(0.43, 0.10), (0.30, 0.11), (0.15, 0.09), (-0.02, 0.05)], WALL,
              scale=0.85, zscale=1.0, n=64, env=tall_env)
    sweep(bm, [(0.40, 0.225), (0.0, 0.236), (-0.40, 0.226), (-0.457, 0.15), (-0.462, -0.10), (-0.457, -0.30)],
          SPILL, scale=1.0, n=72, wobble=0.02)                                                       # = V14


def carve_flow_v141(ob, depth=0.004):
    """Linhas de fluxo da V13/V14; na onda alta (acima de 8 cm) somem: a parede comprida
    lê pela forma, sem costelas."""
    me = ob.data
    co = np.array([v.co[:] for v in me.vertices]); nr = np.array([v.normal[:] for v in me.vertices])
    hi = np.clip((co[:, 2] - 0.08) / 0.06, 0, 1)
    g1 = (1 - np.abs(np.sin(co[:, 2] * 90 + np.sin(co[:, 0] * 25) * 2.0 + co[:, 1] * 12))) ** 5
    co += nr * (-g1 * depth * (1 - hi))[:, None]
    for v, c in zip(me.vertices, co): v.co = c
    me.update()


def rebuild_waves(seed=3, voxel=0.0035):
    from guardian_tides_pedestal import foam_spirals, swells
    O = bpy.data.objects
    O.remove(O['TIDES__WAVES'])
    rng = np.random.default_rng(seed)
    bm = bmesh.new()
    waves_v141(bm); swells(bm); foam_spirals(bm, rng)
    ob = mesh_from_bm('TIDES__WAVES', bm)
    rm = ob.modifiers.new('fundir', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = voxel
    sm = ob.modifiers.new('polir', 'SMOOTH'); sm.factor = 0.7; sm.iterations = 4
    apply_modifiers(ob)
    carve_flow_v141(ob)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


# ───────────────────────── etapa ─────────────────────────

def stage_polish():
    import time
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=str(SRC))
    s = bpy.context.scene; s.frame_set(s.frame_end)
    O = bpy.data.objects
    arm, body, cloth = O['TIDES_RIG'], O['TIDES__BODY'], O['TIDES__CLOTH']
    rebuild_hair_v141(body, arm)
    grip_cloth(cloth, body, arm)
    rebuild_waves()
    LOG['segundos'] = round(time.time() - t0, 1)
    s['tides_v14_1'] = repr(LOG)
    bpy.ops.wm.save_as_mainfile(filepath=str(DST))
    print('V14.1 ok', LOG)


if __name__ == '__main__':
    stage_polish()
