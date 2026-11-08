"""Guardian of the Tides · corpo: base anatômica CC0, punho no cabo do tridente, rig por script e pose do guardião.
Tudo em unidades do corpo base (1,68 m); a escala monumental entra na montagem (guardian_tides_build.py).
"""
import math

import bpy
import numpy as np
from mathutils import Matrix, Vector

from common import BASE_BLEND, link, select_only, rot_about

# Juntas medidas no corpo base (lado direito do personagem = -X; frente = -Y). Ver tools de medição no README.
J = {
    'root': (0, -0.01, 0.95), 'spine': (0, -0.01, 1.08), 'chest': (0, -0.015, 1.26), 'neck': (0, -0.02, 1.43), 'head': (0, -0.035, 1.52), 'top': (0, -0.035, 1.70),
    'clav': (-0.03, -0.02, 1.40), 'shoulder': (-0.185, -0.005, 1.36), 'elbow': (-0.292, 0.0, 1.09), 'wrist': (-0.37, -0.06, 0.89), 'tip': (-0.43, -0.12, 0.76),
    'hip': (-0.095, -0.01, 0.91), 'knee': (-0.135, 0.01, 0.47), 'ankle': (-0.17, 0.06, 0.09), 'toe': (-0.20, -0.13, 0.02),
}
KNUCKLE_T = 0.105  # distância pulso→nós dos dedos ao longo do eixo da mão


def mirror(p, side):
    return Vector((p[0] * side, p[1], p[2]))


def load_body():
    with bpy.data.libraries.load(str(BASE_BLEND)) as (_, dst):
        dst.objects = ['GEO-body_male_realistic', 'GEO-body_male_realistic.eye.L', 'GEO-body_male_realistic.eye.R']
    body, *eyes = dst.objects
    for o in dst.objects:
        link(o)
        o.animation_data_clear()
    body.location = (0, 0, 0)  # os olhos já são filhos do corpo na biblioteca e acompanham; ficam lisos, como na estatuária clássica
    bpy.context.view_layer.update()
    body.name = 'TIDES__BODY'
    return body, eyes


def hand_frame(side):
    W, T = np.array(mirror(J['wrist'], side)), np.array(mirror(J['tip'], side))
    u = (T - W) / np.linalg.norm(T - W)
    n = np.array([float(side), 0.0, 0.0])      # palma voltada para o corpo (lado direito fica em -X)
    n = n - (n @ u) * u; n /= np.linalg.norm(n)
    w = np.cross(u, n)
    return W, u, n, w


def finger_chains(body, side):
    """Acha os 4 dedos e o polegar na malha base (dedos unidos pela membrana não formam ilhas): agrupa as pontas
    pela coordenada transversal da mão (k-means 1D) e devolve cadeias raiz→ponta para os ossos das falanges."""
    W, u, n, w = hand_frame(side)
    co = np.array([v.co[:] for v in body.data.vertices])
    t, q = (co - W) @ u, (co - W) @ w
    hand = (co[:, 0] * side < -0.33) & (co[:, 2] < 0.93) & (t > -0.02)
    thumb = hand & (co[:, 1] < -0.115) & (co[:, 0] * side > -0.405) & (t > 0.02) & (t < 0.16)
    distal = np.where(hand & ~thumb & (t > 0.15))[0]
    c = np.percentile(q[distal], [12, 37, 63, 88])
    for _ in range(30):
        lab = np.argmin(np.abs(q[distal][:, None] - c[None]), 1)
        c = np.array([q[distal][lab == k].mean() for k in range(4)])
    chains = []
    near = np.where(hand & ~thumb & (t > KNUCKLE_T - 0.01) & (t < KNUCKLE_T + 0.012))[0]
    for k in range(4):
        ids = distal[lab == k]
        tip = co[ids[np.argmax(t[ids])]]
        rn = near[np.abs(q[near] - c[k]) < 0.012]
        root = co[rn].mean(0) if len(rn) else W + u * KNUCKLE_T + w * c[k]
        root = root + n * ((co[ids] - root) @ n).mean()   # raiz no meio da espessura do dedo
        chains.append((f'f{k}', root, tip))
    tz = co[thumb]
    ttip = tz[np.argmax(np.linalg.norm(tz - W, axis=1))]
    tbase = W + u * 0.025 + n * 0.005 + (tz.mean(0) - W - u * 0.025) * 0.35
    chains.append(('thumb', tbase, ttip))
    return chains, (W, u, n, w)


def build_rig(body, fingers=None):
    fingers = fingers or {}
    arm_data = bpy.data.armatures.new('TIDES_RIG')
    arm = link(bpy.data.objects.new('TIDES_RIG', arm_data))
    select_only(arm)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones

    def bone(name, a, b, parent=None, connect=False):
        x = eb.new(name); x.head = a; x.tail = b
        if parent: x.parent = eb[parent]; x.use_connect = connect
        return x
    bone('root', J['root'], J['spine'])
    bone('spine', J['spine'], J['chest'], 'root', True)
    bone('chest', J['chest'], J['neck'], 'spine', True)
    bone('neck', J['neck'], J['head'], 'chest', True)
    bone('head', J['head'], J['top'], 'neck', True)
    for side, sx in (('R', 1), ('L', -1)):
        m = lambda k: mirror(J[k], sx)
        bone(f'clav.{side}', m('clav'), m('shoulder'), 'chest')
        bone(f'upper_arm.{side}', m('shoulder'), m('elbow'), f'clav.{side}', True)
        bone(f'forearm.{side}', m('elbow'), m('wrist'), f'upper_arm.{side}', True)
        bone(f'hand.{side}', m('wrist'), m('tip'), f'forearm.{side}', True)
        for name, root, tip in fingers.get(side, []):   # falanges: 45% / 30% / 25% do comprimento
            pts = [Vector(root.tolist()) + (Vector(tip.tolist()) - Vector(root.tolist())) * f for f in (0, .45, .75, 1)]
            if name == 'thumb': pts = [pts[0], pts[0].lerp(pts[3], .5), pts[3]]
            for j in range(len(pts) - 1):
                bone(f'{name}_{j + 1}.{side}', pts[j], pts[j + 1], f'hand.{side}' if j == 0 else f'{name}_{j}.{side}', j > 0)
        bone(f'thigh.{side}', m('hip'), m('knee'), 'root')
        bone(f'shin.{side}', m('knee'), m('ankle'), f'thigh.{side}', True)
        bone(f'foot.{side}', m('ankle'), m('toe'), f'shin.{side}', True)
    bpy.ops.object.mode_set(mode='OBJECT')
    # pesos automáticos (bone heat) na malha base; o multires acompanha a base
    mr = [m for m in body.modifiers if m.type == 'MULTIRES']
    select_only(body, arm, active=arm)
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    assert not mr or body.modifiers[0] == mr[0], 'multires precisa vir antes da armadura'
    return arm, body.modifiers[-1]


def aim(arm, name, direction, up=None, rest_up=(0, -1, 0)):
    """Aponta o osso para uma direção do mundo. Com `up`, gira o osso em volta do próprio eixo até que o vetor
    `rest_up` (direção no repouso, ex.: o polegar) fique o mais perto possível de `up`."""
    pb = arm.pose.bones[name]
    head = arm.matrix_world @ pb.head
    cur = (arm.matrix_world @ pb.tail - head).normalized()
    q = cur.rotation_difference(Vector(direction).normalized())
    axis, ang = q.to_axis_angle()
    if ang > 1e-5:
        rot_about(pb, head, axis, math.degrees(ang), arm)
    if up is not None:
        pb = arm.pose.bones[name]
        head = arm.matrix_world @ pb.head
        along = (arm.matrix_world @ pb.tail - head).normalized()
        rest = (arm.matrix_world @ pb.bone.matrix_local).to_3x3()
        now = (arm.matrix_world @ pb.matrix).to_3x3()
        zb = (now @ rest.inverted() @ Vector(rest_up)).normalized()
        zb = (zb - along * zb.dot(along)).normalized()
        want = Vector(up) - along * Vector(up).dot(along)
        a = zb.angle(want.normalized())
        if zb.cross(want).dot(along) < 0:
            a = -a
        rot_about(pb, head, along, math.degrees(a), arm)


def pose_guardian(arm):
    """Pose do guardião (V11): peso na perna direita; a esquerda sobe na crista da onda; tridente vertical
    perto do ombro de fora (mão direita); a mão esquerda segura o manto; peito ~10° para a escadaria (+X)."""
    pb = arm.pose.bones
    W = lambda n: arm.matrix_world @ pb[n].head
    rot_about(pb['root'], W('root'), (0, 0, 1), 10, arm)        # gira para a entrada do templo
    rot_about(pb['root'], W('root'), (0, 1, 0), -3, arm)        # contrapposto: quadril cai para o lado livre
    rot_about(pb['chest'], W('chest'), (0, 1, 0), 4, arm)
    rot_about(pb['chest'], W('chest'), (1, 0, 0), -4, arm)      # peito aberto
    rot_about(pb['neck'], W('neck'), (0, 0, 1), 8, arm)
    rot_about(pb['head'], W('head'), (1, 0, 0), -6, arm)        # queixo um pouco erguido
    # perna esquerda (lado +X) sobe na crista
    aim(arm, 'thigh.L', (0.12, -0.75, -0.62))
    aim(arm, 'shin.L', (0.08, 0.16, -1.0))
    aim(arm, 'foot.L', (0.05, -1.0, -0.05))
    aim(arm, 'thigh.R', (-0.05, 0.08, -1.0))
    aim(arm, 'shin.R', (-0.04, 0.06, -1.0))
    # braço do tridente: cotovelo ao lado do corpo, antebraço à frente, punho vertical (polegar para cima)
    aim(arm, 'upper_arm.R', (-0.42, -0.18, -0.88))
    aim(arm, 'forearm.R', (-0.2, -0.95, 0.24))
    aim(arm, 'hand.R', (-0.25, -0.97, 0.0), up=(0, 0, 1))
    # braço do manto: baixo e para fora, mão segurando a borda
    aim(arm, 'upper_arm.L', (0.45, 0.05, -0.89))
    aim(arm, 'forearm.L', (0.35, -0.55, -0.76))
    aim(arm, 'hand.L', (0.2, -0.5, -0.84))
    bpy.context.view_layer.update()


def curl_fingers(arm, side, frame, angles=(82, 100, 78), thumb=(55, 30)):
    """Fecha a mão: cada falange gira em volta do eixo transversal do próprio dedo, em direção à palma.
    O polegar primeiro cruza por cima dos dedos (gira no eixo longo da mão, para o lado que o aproxima
    do dedo médio) e depois dobra a ponta."""
    W, u, n, w = frame
    pb = arm.pose.bones
    nv = Vector(n.tolist())
    for k in range(4):
        for j, ang in enumerate(angles, 1):
            b = pb[f'f{k}_{j}.{side}']
            head = arm.matrix_world @ b.head
            d = (arm.matrix_world @ b.tail - head).normalized()
            rot_about(b, head, d.cross(nv).normalized(), ang, arm)
    t1 = pb[f'thumb_1.{side}']
    head = arm.matrix_world @ t1.head
    target = arm.matrix_world @ pb[f'f1_2.{side}'].head
    tip = lambda: arm.matrix_world @ pb[f'thumb_2.{side}'].tail
    best = None
    for sg in (1, -1):
        saved = t1.matrix.copy()
        rot_about(t1, head, Vector(u.tolist()), sg * thumb[0], arm)
        dist = (tip() - target).length
        if best is None or dist < best[0]: best = (dist, sg)
        t1.matrix = saved; bpy.context.view_layer.update()
    rot_about(t1, head, Vector(u.tolist()), best[1] * thumb[0], arm)
    b = pb[f'thumb_2.{side}']
    hd = arm.matrix_world @ b.head
    d = (arm.matrix_world @ b.tail - hd).normalized()
    rot_about(b, hd, d.cross(nv).normalized(), thumb[1], arm)


def attach_eyes(eyes, arm):
    """Olhos seguem o osso da cabeça (mantendo a posição do mundo)."""
    bpy.context.view_layer.update()
    for e in eyes:
        mw = e.matrix_world.copy()
        e.parent = arm; e.parent_type = 'BONE'; e.parent_bone = 'head'
        bpy.context.view_layer.update()
        e.matrix_world = mw


def finger_weights(body, side, chains, frame, blend=0.007):
    """Troca os pesos automáticos dos 4 dedos por pesos geométricos: cada vértice pertence ao dedo mais próximo
    (coordenada transversal) e às falanges pela distância ao longo do dedo, com transição suave nas juntas."""
    W, u, n, w = frame
    tag = 'R' if side == 1 else 'L'
    co = np.array([v.co[:] for v in body.data.vertices])
    t, q = (co - W) @ u, (co - W) @ w
    hand = (co[:, 0] * side < -0.33) & (co[:, 2] < 0.93) & (t > -0.02)
    thumb = hand & (co[:, 1] < -0.115) & (co[:, 0] * side > -0.405) & (t > 0.02) & (t < 0.16)
    fingers = [c for c in chains if c[0] != 'thumb']
    qc = np.array([((root + tip) / 2 - W) @ w for _, root, tip in fingers])
    zone = np.where(hand & ~thumb & (t > KNUCKLE_T - 0.02))[0]
    G = body.vertex_groups
    names = [f'{f}_{j}.{tag}' for f, _, _ in fingers for j in (1, 2, 3)] + [f'hand.{tag}']
    groups = {nm: G[nm] for nm in names}
    smooth = lambda x: np.clip(x, 0, 1) ** 2 * (3 - 2 * np.clip(x, 0, 1))
    for i in zone:
        k = int(np.argmin(np.abs(qc - q[i])))
        name, root, tip = fingers[k]
        L = np.linalg.norm(tip - root); d = (tip - root) / L
        s = (co[i] - root) @ d / L                       # 0 = nó, 1 = ponta
        cuts = [0.0, .45, .75]
        wts = {f'hand.{tag}': 1 - smooth((s - cuts[0]) / (blend / L * 2) + .5)}
        prev = 1 - wts[f'hand.{tag}']
        for j in (1, 2):
            nxt = smooth((s - cuts[j]) / (blend / L * 2) + .5)
            wts[f'{name}_{j}.{tag}'] = prev * (1 - nxt)
            prev = prev * nxt
        wts[f'{name}_3.{tag}'] = prev
        for nm, g in groups.items():
            g.remove([int(i)])
        for nm, val in wts.items():
            if val > 1e-3:
                groups[nm].add([int(i)], float(val), 'REPLACE')


def grip_axis(arm, side='R'):
    """Eixo do cabo dentro do punho: o centróide das juntas de cada dedo dobrado é um ponto do eixo.
    Os 4 pontos dão o eixo (PCA); o raio livre é a menor distância do centro às juntas."""
    pb, M = arm.pose.bones, arm.matrix_world
    centers, radii = [], []
    for k in range(4):
        pts = [M @ pb[f'f{k}_{j}.{side}'].head for j in (1, 2, 3)] + [M @ pb[f'f{k}_3.{side}'].tail]
        cc = sum(pts, Vector()) / 4                      # o dedo fecha ~260°: o centróide da volta é o centro do vão
        centers.append(cc); radii.append(min((p - cc).length for p in pts))
    P = np.array([c[:] for c in centers]); mid = P.mean(0)
    axis = np.linalg.svd(P - mid)[2][0]
    if axis[2] < 0: axis = -axis
    return Vector(mid.tolist()), Vector(axis.tolist()).normalized(), float(np.mean(radii))
