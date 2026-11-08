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
DST_V1 = WORK / 'guardian-depths-v1-sculpt.blend'      # V1: modelagem detalhada (fonte do build de LODs)
DST_V11 = WORK / 'guardian-depths-v1-1-sculpt.blend'   # V1.1: passada escultórica sobre a V1
VERSOES = ['argila', 'v1', 'v1-1']


def ge(v):
    """A versão em construção inclui as mudanças de `v`? (a V1.1 leva tudo da V1; a argila e a V1 não mudam.)"""
    return VERSOES.index(LOG.get('versao', 'argila')) >= VERSOES.index(v)
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
# V1.1: rosto por planos escultóricos (vigilância, autoridade); deslocamentos pequenos, na malha base, sem textura
FACE_V11 = [
    {'c': (0.030, -0.146, 1.597), 's': (0.022, 0.014, 0.007), 'mover': (0, -0.005, -0.002)},    # arco da sobrancelha forte e baixo
    {'c': (0.011, -0.149, 1.591), 's': (0.009, 0.010, 0.006), 'mover': (0, -0.002, -0.003)},    # cabeça da sobrancelha desce: severo
    {'c': (0.0, -0.150, 1.603), 's': (0.006, 0.010, 0.006), 'mover': (0, 0.002, 0), 'espelho': False},   # vinco entre as sobrancelhas
    {'c': (0.032, -0.140, 1.589), 's': (0.012, 0.006, 0.004), 'mover': (0, 0.002, 0)},          # dobra da pálpebra: olho fundo
    {'c': (0.058, -0.112, 1.566), 's': (0.016, 0.020, 0.011), 'mover': (0.004, -0.004, 0.002)}, # maçã do rosto alta
    {'c': (0.050, -0.118, 1.526), 's': (0.014, 0.016, 0.012), 'mover': (-0.002, 0.003, 0)},     # cavidade sob a maçã: plano
    {'c': (0.0, -0.158, 1.566), 's': (0.006, 0.010, 0.018), 'mover': (0, -0.003, 0), 'espelho': False},  # dorso do nariz reto, grego
    {'c': (0.014, -0.150, 1.536), 's': (0.007, 0.008, 0.006), 'mover': (0.002, 0, 0)},          # asa do nariz
    {'c': (0.030, -0.145, 1.525), 's': (0.004, 0.006, 0.012), 'mover': (0, 0.0015, 0)},         # sulco nasolabial
    {'c': (0.0, -0.156, 1.516), 's': (0.012, 0.006, 0.004), 'mover': (0, 0.0015, 0), 'espelho': False},  # lábio de cima fino, boca firme
    {'c': (0.022, -0.148, 1.512), 's': (0.006, 0.008, 0.005), 'mover': (0, 0.001, -0.002)},     # cantos da boca para baixo
    {'c': (0.0, -0.150, 1.470), 's': (0.020, 0.015, 0.012), 'mover': (0, -0.005, -0.002), 'espelho': False},  # queixo quadrado, à frente
    {'c': (0.058, -0.080, 1.480), 's': (0.015, 0.025, 0.015), 'mover': (0.005, 0, -0.003)},     # ângulo da mandíbula marcado
    {'c': (0.0, -0.140, 1.640), 's': (0.040, 0.020, 0.020), 'mover': (0, -0.002, 0), 'espelho': False},  # testa cheia
    {'c': (0.066, -0.100, 1.610), 's': (0.010, 0.014, 0.014), 'mover': (-0.002, 0.001, 0)},     # têmpora funda
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
    v11 = ge('v1-1')
    h = build_hair(body, seed=21, hair_count=84 if v11 else 90, beard_count=0, beard_test=lambda p: p.y > 0.03 and 1.52 < p.z < 1.58 and abs(p.x) < 0.03, hairline=1.632, shell_thick=0.005,
                   keep_lock=(lambda l: all(q.z > 1.54 or (q.y > 0.02 and q.z > 1.51) for q in l[0])) if v11 else (lambda l: l[0][-1].z > 1.50),
                   lock_kw=dict(length=(0.08, 0.12), lift=(0.005, 0.004), radius=0.013, wave=(0.3, 0.5)) if v11 else
                           dict(length=(0.07, 0.11), lift=(0.004, 0.003), radius=0.011, wave=(0.25, 0.45)),
                   carve_kw=dict(locks=12, depth=0.003) if v11 else dict(locks=22, depth=0.004))
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
    if v11:   # coque enrolado: mecha em espiral presa na nuca, com a ponta caindo; liso (subdivisão), sem facetas
        c0, ax = Vector((0, 0.088, 1.572)), Vector((0, 1, -0.25)).normalized()
        e1 = Vector((1, 0, 0)); e2 = ax.cross(e1)
        knot = [c0 + ax * (0.022 * s) + (e1 * math.cos(6.0 * math.pi * s) + e2 * math.sin(6.0 * math.pi * s)) * (0.024 - 0.014 * s) for s in np.linspace(0, 1, 60)]
        bk = tube_along(knot, [0.0125 - 0.005 * k / 59 for k in range(len(knot))], segs=16)
    else:
        knot = [Vector((0, 0.075, 1.585)), Vector((0, 0.10, 1.57)), Vector((0, 0.115, 1.545)), Vector((0.005, 0.112, 1.515)), Vector((0.01, 0.10, 1.49))]
        bk = tube_along(knot, [0.026, 0.028, 0.022, 0.016, 0.009], segs=12)
    me = bpy.data.meshes.new('tmp'); bk.to_mesh(me); bk.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    band = mesh_from_bm(f'{P}__BAND', bm)
    if v11:
        sd = band.modifiers.new('liso', 'SUBSURF'); sd.levels = sd.render_levels = 2; apply_modifiers(band)
        for p in band.data.polygons: p.use_smooth = True
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
    v1, v11 = ge('v1'), ge('v1-1')
    fold = None
    if v11:   # pregas de profundidades variadas, assimétricas; tensão sobre a coxa da frente; abertura sobre o joelho dobrado
        leg = W('shin.L') - Vector((root.x, root.y + 0.01, 0)); a_leg = math.atan2(leg.y, leg.x)
        rng = np.random.default_rng(5); ph = rng.uniform(0, 6.28, 4)

        def fold(a, v):
            d = math.atan2(math.sin(a - a_leg), math.cos(a - a_leg))           # distância angular até a perna da frente
            tense = math.exp(-(d / 0.55) ** 2)                                 # pano esticado sobre a coxa
            amp = 0.012 * (0.55 + 0.45 * math.sin(a + ph[0])) * (1 - 0.75 * tense)
            w = (math.sin(11 * a + 1.6 * v + 0.7 * math.sin(3 * a + ph[1])) + 0.5 * math.sin(6 * a + ph[2] + 0.8 * v)
                 + 0.22 * math.sin(23 * a + 2.4 * v + ph[3]))
            dr = amp * (0.12 + v) ** 1.3 * w - 0.003 * (1 - v) ** 2 + 0.012 * tense * v           # cintura comprimida
            dz = v ** 3 * (0.045 * math.exp(-(d / 0.35) ** 2) - 0.012 * math.sin(2 * a + ph[0]) - 0.006 * w)   # abertura e barra irregular
            return dr, dz
    kilt = K.envelope_skirt(f'{P}__KILT', body, top, bottom, rows=56 if v1 else 36, nb=160 if v1 else 96, ease=0.014, flare=0.05 if v11 else 0.07,
                            folds=(19, 0.009) if v1 else (13, 0.008),
                            center=(root.x, root.y + 0.01), keep=keep, fold_fn=fold)
    # capa: do ombro de dentro ao de fora pelas costas, cai e abre para fora e para trás (vento do mar)
    sR, sL = W('upper_arm.R'), W('upper_arm.L'); ch = W('chest', 0.6)
    top_pts = []
    for k in range(25):
        t = k / 24
        p = sR.lerp(sL, t) + Vector((0, 0.07 + 0.03 * math.sin(math.pi * t), 0.035 * math.sin(math.pi * t)))
        top_pts.append(p.lerp(Vector((p.x, ch.y + 0.09, p.z)), 0.4))
    cfold = None
    if v11:   # grandes dobras que mudam de direção; franzido curto nos pontos de fixação; espessura de lã pesada
        bk = Vector((0.16, 0.24, 0.0)).normalized(); side = (sL - sR).normalized()

        def cfold(u, v):
            big = 0.075 * v ** 0.8 * (math.sin(4.2 * math.pi * u + 2.6 * v + 0.9 * math.sin(2.5 * v)) * (0.7 + 0.3 * math.sin(3 * math.pi * u))
                                      + 0.35 * math.sin(9 * math.pi * u - 1.5 * v))
            gather = 0.008 * math.sin(16 * math.pi * u) * (1 - v) ** 3
            sway = 0.05 * v ** 2 * math.sin(math.pi * u)                       # a barra gira para fora: direção muda
            return bk * (big + gather) + side * sway
    cape = K.sheet(f'{P}__CAPE', top_pts, down=(0.10, 0.22, -1.0), length=0.95, rows=90 if v1 else 56, spread=0.42, back=(0.16, 0.24, 0.0),
                   folds=(11, 0.03) if v1 else (9, 0.028), body=body, gap=0.018, thickness=0.02 if v11 else (0.011 if v1 else 0.009), fold_fn=cfold)
    # faixa da capa dobrada na cintura (o pano volta pela frente e entra no cinto)
    sash_pts = [Vector(p) for p in ((sL.x + 0.02, sL.y + 0.02, sL.z - 0.02), (0.10, -0.12, 1.15), (0.0, -0.13, 1.02), (-0.12, -0.10, top - 0.01))]
    if v1:   # V1: faixa chata sobre a pele, a tiracolo; a da argila era uma folha curta que saía em cacos no peito
        if v11: sash_pts[0] = sash_pts[0].lerp(sash_pts[1], 0.3)
        sash = K.ribbon(f'{P}__SASH', K.posed_bvh(body), sash_pts, width=0.085 if v11 else 0.06, thick=0.006, lift=0.006,
                        n=110 if v11 else 70, smooth=0 if v11 else 2, conform=v11)
    else:
        sash = K.sheet(f'{P}__SASH', [p + Vector((0, 0, 0.03 * k)) for k, p in enumerate(sash_pts)], down=(0, 0, -1), length=0.07, rows=6,
                       spread=0.0, back=(0, -0.01, 0), folds=(5, 0.006), body=body, gap=0.014)
    # ombreira de concha no ombro de fora (lado do tridente)
    sh = W('upper_arm.L', 0.12)
    n = (sh - Vector((ch.x, ch.y, sh.z - 0.05))).normalized()
    pauldron = K.scallop_cap(f'{P}__PAULDRON', sh + n * 0.035, n, 0.085, ribs=13, depth=0.45)
    LOG['saia'] = [round(top, 3), round(bottom, 3)]
    return [kilt, cape, sash, pauldron] + (details_v1(body, arm, kilt, top) if v1 else [])


def details_v1(body, arm, kilt, top):
    """V1: cinto sobre a saia com fivela de concha, tiras de sandália nos tornozelos e braceletes."""
    pb, M = arm.pose.bones, arm.matrix_world
    W = lambda b, t=0.0: M @ pb[b].head.lerp(pb[b].tail, t)
    axis = lambda b: (W(b, 1.0) - W(b)).normalized()
    root = W('root'); up = (W('chest') - root).normalized()
    kt, bt = K.posed_bvh(kilt), K.posed_bvh(body)
    belt_c = Vector((root.x, root.y + 0.01, top - 0.018))
    v11 = ge('v1-1')   # V1.1: o cinto passa por cima das pregas (sem serrilha) e a fivela entra no cinto
    belt = K.strap(f'{P}__BELT', kt, belt_c, up, width=0.04 if v11 else 0.034, thick=0.008 if v11 else 0.007, n=192 if v11 else 96,
                   lift=0.002 if v11 else 0.001, envelope=6 if v11 else 0)
    # fivela: na frente do cinto, para onde o quadril aponta (giro do quadril: +8°)
    a = math.radians(8); fwd = Vector((math.sin(a), -math.cos(a), 0))
    hit = kt.ray_cast(belt_c + fwd * 0.3, -fwd, 0.3)
    buckle = K.scallop_cap(f'{P}__BUCKLE', (hit[0] if hit[0] is not None else belt_c + fwd * 0.17) + fwd * (0.006 if v11 else 0.008), fwd,
                           0.036 if v11 else 0.03, ribs=13 if v11 else 11, depth=0.5)
    straps = []
    for side in 'LR':                                   # sandália: duas tiras no tornozelo (a do peito do pé saía em laço)
        for t, w in ((0.88, 0.010), (0.76, 0.009)):
            straps.append(K.strap(f'{P}__SANDAL_{side}{t}', bt, W(f'shin.{side}', t), axis(f'shin.{side}'), width=w, thick=0.003))
    cuffs = [K.strap(f'{P}__CUFF_R', bt, W('forearm.R', 0.80), axis('forearm.R'), width=0.04, thick=0.005),       # mão de comando
             K.strap(f'{P}__ARMBAND_R', bt, W('upper_arm.R', 0.62), axis('upper_arm.R'), width=0.018, thick=0.004)]
    objs = [belt, buckle] + straps + cuffs
    LOG['detalhes_v1'] = len(objs)
    return objs


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
    if ge('v1-1'):
        frieze()
    return ob, gold


def frieze(z0=-0.205, z1=-0.135, n=1440, rows=32, period=0.16, depth=0.007):
    """V1.1: friso de ondas vitruvianas entalhado em volta do tambor, logo abaixo da cornija (geometria, não textura)."""
    from guardian_tides_pedestal import scroll_relief
    bm = bmesh.new(); grid = []
    per = 2 * math.pi * math.sqrt((RX ** 2 + RY ** 2) / 2)          # perímetro aproximado da elipse
    k_per = max(1, round(per / period))
    for i in range(rows + 1):
        v = i / rows; z = z0 + (z1 - z0) * v
        row = []
        for k in range(n):
            t = k / n; a = 2 * math.pi * t
            tt, vv = (t * k_per) % 1.0, 0.08 + 0.84 * v                 # média 4×4 (borda do entalhe em rampa, sem degraus)
            h = depth * sum(scroll_relief((tt + dx * 0.006) % 1.0, vv + dy * 0.02) for dx in (-1.5, -0.5, 0.5, 1.5) for dy in (-1.5, -0.5, 0.5, 1.5)) / 16
            h *= math.sin(math.pi * v) ** 0.3
            row.append(bm.verts.new((CX + (RX + 0.001 + h) * math.cos(a), CY + (RY + 0.001 + h) * math.sin(a), z)))
        grid.append(row)
    for i in range(rows):
        for k in range(n):
            bm.faces.new((grid[i][k], grid[i][(k + 1) % n], grid[i + 1][(k + 1) % n], grid[i + 1][k]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=-0.004)
    return mesh_from_bm(f'{P}__FRIEZE', bm)   # objeto próprio: o build o usa só no bake (somenteAlta), o tambor do LOD recebe o relevo na normal


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


def curl_wave(bm, base, out, height, r0, width, turns=0.62, thick=0.05, n=110, nu=28, lean=1.6, grooves=5):
    """V1.1: onda que nasce do topo, sobe e enrola sobre si como lâmina larga de água petrificada (não tubo).
    Seção em crescente côncavo (largura `width` que afina até o lábio), sulcos que seguem o movimento da água,
    espessura variada; o fim da espiral entra de volta na massa da onda."""
    up = Vector((0, 0, 1)); out = Vector(out).normalized(); lat = up.cross(out).normalized()
    cc = base + up * (height - r0)
    P0, P1, P2 = base - out * r0 * lean, base - out * r0 * lean * 0.45 + up * height * 0.75, cc + up * r0
    path = []
    for k in range(n):
        s = k / (n - 1)
        if s < 0.38:   # face da onda: sobe em arco inclinado de dentro do topo até o alto da espiral (não coluna)
            q = s / 0.38
            path.append(P0 * (1 - q) ** 2 + P1 * 2 * q * (1 - q) + P2 * q * q)
        else:
            t = (s - 0.38) / 0.62 * turns * 2 * math.pi                    # 0 no alto, π/2 para fora, π embaixo
            rr = r0 * math.exp(-0.35 * t)                                    # crista que tomba: o lábio cai sobre o vão
            path.append(cc + (up * math.cos(t) + out * math.sin(t)) * rr)
    def taper(q, u):   # crista mais alta no meio e baixa nas pontas, que se fundem no topo: onda, não disco
        f = 1 - 0.3 * u * u * u * u                                       # só as pontas baixam (encolher demais dobrava a lâmina)
        d = q - base
        return base + Vector((d.x, d.y, 0)) + Vector((0, 0, d.z * f))

    rings = []
    for k, p in enumerate(path):
        s = k / (n - 1)
        T = (path[min(k + 1, n - 1)] - path[max(k - 1, 0)]).normalized()
        L = (lat - T * lat.dot(T)).normalized(); N = T.cross(L).normalized()
        if (p - cc).dot(N) < 0 and s > 0.38: N = -N
        if s <= 0.38 and N.dot(-out) < 0: N = -N
        w = width * (1 - 0.55 * s ** 1.4) * (0.9 + 0.1 * math.sin(s * 7 + 1)); th = thick * (1 - 0.8 * s ** 0.8) + 0.016   # lábio nunca mais fino que 3 voxels do remesh
        ring = []
        for j in range(nu):
            u = -1 + 2 * j / (nu - 1)
            bow = -0.05 * w * (1 - u * u) * (1 - s)                           # face levemente côncava na subida; reta no lábio (côncava demais virava do avesso)
            g = 1 + 0.05 * math.cos(grooves * math.pi * u)                    # sulcos rasos ao longo do movimento
            ring.append(taper(p + L * (u * w / 2) + N * (bow + th * (0.45 + 0.55 * (1 - u * u) ** 0.6) * g), u))   # bordas com espessura: sem furo no remesh
        for j in reversed(range(nu)):
            u = -1 + 2 * j / (nu - 1)
            bow = -0.05 * w * (1 - u * u) * (1 - s)
            ring.append(taper(p + L * (u * w / 2) + N * (bow - th * 0.45 * (0.6 + 0.4 * (1 - u * u) ** 0.6)), u))
        rings.append([bm.verts.new(q) for q in ring])
    m = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for j in range(m):
            bm.faces.new((a[j], a[(j + 1) % m], b[(j + 1) % m], b[j]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])


DEEP = [  # perfil próprio (lateral, altura) da ondulação de trás: rampa longa, crista viva, lábio curto e vão raso
    (0.05, -0.02), (0.0, 0.02), (-0.06, 0.05), (-0.13, 0.085), (-0.19, 0.105), (-0.235, 0.11), (-0.265, 0.098),
    (-0.285, 0.075), (-0.29, 0.05), (-0.275, 0.034), (-0.255, 0.036), (-0.245, 0.02), (-0.25, -0.02),
]


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
    if ge('v1-1'):   # V1.1: sem serpente nem volutas tubulares; ondas largas que nascem do topo e voltam à massa
        sweep(bm, [(CX - RX * 0.5, CY + RY * 0.45), (CX - 0.05, CY + RY * 0.55), (CX + RX * 0.4, CY + RY * 0.45)], DEEP, scale=0.6, n=48, wobble=0.03)
        curl_wave(bm, Vector((CX + RX * 0.62, CY + RY * 0.40, -0.01)), (0.9, 0.43, 0), height=0.36, r0=0.14, width=0.46, thick=0.06)
        curl_wave(bm, Vector((CX - RX * 0.62, CY - RY * 0.30, -0.01)), (-0.85, -0.5, 0), height=0.22, r0=0.09, width=0.30, thick=0.045)
        return _fuse_waves(bm)
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
    return _fuse_waves(bm)


def _fuse_waves(bm):
    ob = mesh_from_bm(f'{P}__WAVES', bm)
    rm = ob.modifiers.new('fundir', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.0035 if ge('v1-1') else 0.004
    sm = ob.modifiers.new('polir', 'SMOOTH'); sm.factor = 0.7 if not ge('v1-1') else 0.5; sm.iterations = 4 if not ge('v1-1') else 3
    apply_modifiers(ob)
    if ge('v1'):
        # V1: a água baixa (abaixo de 6 cm) não passa da borda da laje; na argila o degrau e a ondulação saíam
        # como chapas finas para fora do tambor. As volutas (mais altas) não mudam.
        co = np.empty(len(ob.data.vertices) * 3); ob.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        e = np.hypot((co[:, 0] - CX) / (RX + 0.02), (co[:, 1] - CY) / (RY + 0.02))
        m = (co[:, 2] < 0.06) & (e > 1.0)
        co[m, 0] = CX + (co[m, 0] - CX) / e[m]; co[m, 1] = CY + (co[m, 1] - CY) / e[m]
        ob.data.vertices.foreach_set('co', co.ravel()); ob.data.update()
        LOG['agua_presa_na_borda'] = int(m.sum())
    for p in ob.data.polygons: p.use_smooth = True
    return ob


# ───────────────────────── etapa ─────────────────────────

def stage_clay():
    t0 = time.time()
    reset()
    body, eyes, arm, frames = K.figure(P)
    LOG['corpo_mm'] = round(K.sculpt_rest(body, BODY) * 3300, 1)
    LOG['rosto_mm'] = round(K.sculpt_rest(body, FACE) * 3300, 1)
    if ge('v1-1'):   # ×1,4: no primeiro gate o rosto ainda lia neutro
        face = [{**f, 'mover': tuple(1.4 * x for x in f['mover'])} for f in FACE_V11]
        LOG['rosto_v11_mm'] = round(K.sculpt_rest(body, face) * 3300, 1)
    if ge('v1'):   # partes do corpo pelo repouso (índices da malha base), como no build do Guardião das Marés
        rest = np.array([v.co[:] for v in body.data.vertices])
        for name, mask in {f'{P}__FACE': (rest[:, 2] > 1.455) & (rest[:, 1] < 0.0) & (np.abs(rest[:, 0]) < 0.1),
                           f'{P}__HAND_GRIP': (rest[:, 0] > 0.33) & (rest[:, 2] < 0.95)}.items():
            g = body.vertex_groups.new(name=name); g.add([int(i) for i in np.where(mask)[0]], 1.0, 'REPLACE')
            LOG[name] = int(mask.sum())
    hr, band = hair(body, arm)
    K.attach_eyes(eyes, arm)
    K.pose(arm, POSE)
    hand_on_shaft(arm)
    c, a, r = K.grip(arm, 'L', frames['L'])
    if ge('v1-1'):   # mão de comando: dedos juntos e levemente curvados, polegar solto: gesto de autoridade, não garra
        K.curl_fingers(arm, 'R', frames['R'], angles=(12, 16, 10), thumb=(14, 8))
    else:
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
    bpy.context.scene['tides_meta'] = json.dumps({'grip_center': list(c), 'grip_axis': list(a), 'grip_radius': r, 'seconds': LOG['segundos']})  # chave lida pelo build
    WORK.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str({'v1': DST_V1, 'v1-1': DST_V11}.get(LOG.get('versao'), DST)))
    print('DEPTHS ok', LOG)


def stage_shots(blend=DST, tag='depths'):
    """Argila e silhueta nas 5 vistas, mesma câmera e escala para qualquer escultura (para a folha A × B)."""
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    s = bpy.context.scene; s.frame_set(s.frame_end)
    IMG.mkdir(parents=True, exist_ok=True)
    show = [o for o in bpy.data.objects if o.type == 'MESH' and 'COLLIDER' not in o.name]
    K.silhouette_shots(show, IMG / tag, size=(900, 1350), scale=3.3, focus=(0.0, -0.15, 0.95))


GATE = ROOT / 'docs/img/sculpture-studio/guardian-depths/gate'
FULL = ((0.04, -0.15, 0.95), 3.3)


def stage_gate(blend, tag, outdir=GATE):
    """Quality gate de argila: 15 quadros com câmera, escala e luz fixas (não dependem da caixa do modelo),
    para comparar versões. Os focos vêm do rig, então valem para qualquer versão desta pose."""
    import render
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    O = bpy.data.objects
    show = [o for o in O if o.type == 'MESH' and 'COLLIDER' not in o.name]
    arm = O[f'{P}_RIG']; M = arm.matrix_world; pb = arm.pose.bones
    W = lambda b, t=0.0: M @ pb[b].head.lerp(pb[b].tail, t)
    hb = pb['head']
    turn = M.to_3x3() @ (hb.matrix.to_3x3() @ hb.bone.matrix_local.to_3x3().inverted())
    fwd = (turn @ Vector((0, -1, 0))).normalized()
    head = W('head', 0.45) + fwd * 0.02
    render.VIEWS.update({'rosto': tuple(fwd), 'nuca': tuple((-fwd + Vector((0, 0, 0.35))).normalized()),
                         'ondas': (0.75, 0.55, 0.45), 'mao': (-0.3, -1, 0.25)})
    root = W('root'); kilt = O.get(f'{P}__KILT')
    kz = (kilt.matrix_world @ Vector(kilt.bound_box[0])).z if kilt else root.z - 0.15
    shots = [('frente', 'frente', *FULL, True), ('costas', 'costas', *FULL, True), ('esquerda', 'esquerda', *FULL, True),
             ('direita', 'direita', *FULL, True), ('tres-quartos', 'tres-quartos', *FULL, False),
             ('rosto', 'rosto', head, 0.30, True), ('rosto-perfil', 'esquerda', head, 0.30, True), ('cabelo', 'nuca', head, 0.32, False),
             ('mao-comando', 'mao', W('hand.R', 0.5), 0.32, False), ('mao-tridente', 'tres-quartos', W('hand.L', 0.6), 0.30, False),
             ('cinto', 'frente', root + Vector((0, 0, 0.05)), 0.5, True), ('saia', 'tres-quartos', Vector((root.x, root.y, (root.z + kz) / 2)), 0.8, False),
             ('capa', 'costas', W('chest') + Vector((0.1, 0, -0.3)), 1.5, True),
             ('pedestal', 'tres-quartos', Vector((CX, CY, -0.2)), 1.5, False), ('ondas', 'ondas', Vector((CX, CY, 0.12)), 1.3, False)]
    outdir.mkdir(parents=True, exist_ok=True)
    for name, view, focus, scale, ortho in shots:
        size = (1000, 1500) if scale == FULL[1] else (900, 900)
        render.shoot(show, outdir / f'{tag}-{name}.png', view, ortho=ortho, focus=Vector(focus), scale=scale, size=size)
    K.silhouette_shots(show, outdir / tag, views=('frente',), size=(1000, 1500), scale=FULL[1], focus=FULL[0])   # 15º: silhueta
    print('GATE', tag, 'ok', [n for n, *_ in shots])


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
    if 'gate' in argv:      # -- gate <arquivo.blend> <tag>: quality gate de argila (15 quadros) em docs/img/.../guardian-depths/gate
        i = argv.index('gate'); stage_gate(Path(argv[i + 1]), argv[i + 2])
    elif 'glb' in argv:
        stage_glb()
    elif 'v1-1' in argv:    # passada escultórica sobre a V1; o build genérico faz LODs e GLB (--projeto guardian-depths --versao v1-1)
        LOG['versao'] = 'v1-1'
        stage_clay()
        stage_gate(DST_V11, 'v1-1')
    elif 'v1' in argv:      # modelagem detalhada; o build genérico faz LODs e GLB: guardian_tides_build.py -- --projeto guardian-depths --versao v1
        LOG['versao'] = 'v1'
        if 'shots' not in argv: stage_clay()
        stage_shots(DST_V1, 'v1')
    elif 'tides' in argv:   # só leitura: renderiza a V14.1 do Guardião das Marés com a mesma câmera, para a folha A × B
        stage_shots(WORK / 'guardian-tides-v14-1-sculpt.blend', 'tides')
    else:
        if 'shots' not in argv: stage_clay()
        if 'clay' not in argv: stage_shots()
