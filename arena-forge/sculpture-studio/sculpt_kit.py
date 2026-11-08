"""Sculpture Studio · kit genérico de figura (qualquer escultura do jogo, não só o Guardião das Marés).

Junta, com nomes neutros, as peças do pipeline que já existiam e que não dependem do personagem:
  figure(prefix)            corpo base CC0 + multires aplicado + rig por script + pesos dos dedos
  pose(arm, spec)           pose declarada como dados (lista de giros e miras por osso)
  sculpt_rest(body, spec)   escultura suave em repouso (gaussianas por região, com espelho)
  grip(arm, side, frame)    fecha a mão e mede o eixo do punho (para cabo, lança, rédea)
  ground(arm, body, z)      apoia o pé mais baixo em z (o pedestal começa em z = 0)
  posed_mesh(objs)          malha avaliada (pose aplicada) em arrays, para medir e colidir
  envelope_skirt(...)       saia ou faixa por envelope da malha posada (não vira bermuda entre as pernas)
  sheet(...)                folha de pano paramétrica (capa, faixa) com dobras e colisão simples com o corpo
  scallop_cap(...)          calota de concha com nervuras (ombreira, ornamento)
  strap(...)                tira chata em volta de membro ou quadril (sandália, bracelete, cinto)
  ribbon(...)               faixa chata que corre sobre a pele (a tiracolo)
  silhouette_shots(...)     renders de silhueta preta e de argila, mesma câmera para todas as esculturas
Nada aqui escreve arquivos de outro projeto. Cada escultura tem o seu script (ex.: guardian_depths.py).
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from common import apply_modifiers, link, mesh_from_bm, rot_about, select_only
from guardian_tides_body import aim, attach_eyes, build_rig, curl_fingers, finger_chains, finger_weights, grip_axis, load_body
from guardian_tides_v14 import rest_arrays, sculpt, write


def figure(prefix, multires=2):
    """Corpo base com rig. O multires fica como modificador (nível `multires` na vista e no render): os pesos
    automáticos são calculados na malha base. Aplicar o multires antes deixava pernas sem peso (bone heat falha)."""
    body, eyes = load_body()
    body.name = f'{prefix}__BODY'
    mr = next((m for m in body.modifiers if m.type == 'MULTIRES'), None)
    if mr: mr.levels = mr.render_levels = multires
    chR, frR = finger_chains(body, 1); chL, frL = finger_chains(body, -1)
    arm, _ = build_rig(body, {'R': chR, 'L': chL})
    arm.name = arm.data.name = f'{prefix}_RIG'
    finger_weights(body, 1, chR, frR); finger_weights(body, -1, chL, frL)
    return body, eyes, arm, {'R': frR, 'L': frL}


def pose(arm, spec):
    """spec: lista de passos. {'rot': osso, 'eixo': (x, y, z), 'graus': g} gira em volta de um eixo do mundo pela
    cabeça do osso; {'mira': osso, 'dir': (x, y, z), 'cima': (x, y, z) opcional} aponta o osso."""
    pb = arm.pose.bones
    for p in spec:
        if 'rot' in p:
            rot_about(pb[p['rot']], arm.matrix_world @ pb[p['rot']].head, p['eixo'], p['graus'], arm)
        else:
            aim(arm, p['mira'], p['dir'], up=p.get('cima'))
    bpy.context.view_layer.update()


def sculpt_rest(body, spec):
    """spec: lista de {'c': centro, 's': sigma, 'mover': (x, y, z), 'normal': n, 'espelho': bool} em repouso."""
    co, nr = rest_arrays(body.data)
    d = np.zeros_like(co)
    for p in spec:
        d += sculpt(co, nr, p['c'], p['s'], move=p.get('mover', (0, 0, 0)), normal=p.get('normal', 0.0), mirror=p.get('espelho', True))
    write(body.data, co + d)
    return float(np.linalg.norm(d, axis=1).max())


def grip(arm, side, frame, angles=(82, 100, 78), thumb=(55, 30)):
    curl_fingers(arm, side, frame, angles=angles, thumb=thumb)
    return grip_axis(arm, side)


def posed_mesh(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    cos = []
    for o in objs:
        ev = o.evaluated_get(dg); me = ev.to_mesh()
        co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co)
        M = np.array(o.matrix_world)
        co = co.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
        ev.to_mesh_clear(); cos.append(co.astype(np.float64))
    return np.vstack(cos)


def posed_bvh(o):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(dg); me = ev.to_mesh()
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(o.matrix_world); bm.normal_update()
    tree = BVHTree.FromBMesh(bm); bm.free(); ev.to_mesh_clear()
    return tree


def ground(arm, body, z=0.0, feet=('foot.L', 'foot.R')):
    """Desce (ou sobe) a figura inteira até o ponto mais baixo dos pés tocar z. Devolve o deslocamento."""
    co = posed_mesh([body])
    pb = arm.pose.bones
    near = np.zeros(len(co), bool)
    for f in feet:
        h = np.array(arm.matrix_world @ pb[f].head); t = np.array(arm.matrix_world @ pb[f].tail)
        near |= np.linalg.norm(co - (h + t) / 2, axis=1) < 0.16
    assert near.any(), f'pés não achados: malha {co.min(0)}..{co.max(0)}, pés {[tuple(arm.matrix_world @ pb[f].head) for f in feet]}'
    dz = z - co[near, 2].min()
    arm.location.z += dz; bpy.context.view_layer.update()
    return dz


def envelope_skirt(name, body, top, bottom, rows=40, nb=96, ease=0.012, flare=0.10, folds=(11, 0.010), hem_wave=0.02, center=None, keep=None):
    """Saia por envelope da malha posada: a cada altura, o contorno visto de cima (raio máximo por ângulo,
    fechado entre as pernas) + folga + dobras verticais. `keep(co)` filtra que vértices do corpo contam."""
    co = posed_mesh([body])
    if keep is not None: co = co[keep(co)]
    bm = bmesh.new(); grid = []
    cx, cy = (center or (co[:, 0].mean(), co[:, 1].mean()))
    for i in range(rows + 1):
        v = i / rows
        z = top + (bottom - top) * v
        s = co[np.abs(co[:, 2] - z) < 0.025]
        ang = np.arctan2(s[:, 1] - cy, s[:, 0] - cx); r = np.hypot(s[:, 0] - cx, s[:, 1] - cy)
        env = np.zeros(nb); np.maximum.at(env, ((ang + math.pi) / (2 * math.pi) * nb).astype(int) % nb, r)
        for _ in range(6): env = np.maximum(env, (np.roll(env, 1) + np.roll(env, -1)) / 2)
        if i: env = np.maximum(env, prev)   # nunca estreita para baixo (cai como pano)
        prev = env
        row = []
        for k in range(nb):
            a = -math.pi + 2 * math.pi * (k + 0.5) / nb
            rr = env[k] + ease + flare * v ** 1.5 + folds[1] * (0.3 + v) * math.sin(folds[0] * a + 1.7 * v)
            zz = z - (hem_wave * v ** 3 * math.sin(3 * a)) if i == rows else z
            row.append(bm.verts.new((cx + rr * math.cos(a), cy + rr * math.sin(a), zz)))
        grid.append(row)
    for i in range(rows):
        for k in range(nb):
            bm.faces.new((grid[i][k], grid[i][(k + 1) % nb], grid[i + 1][(k + 1) % nb], grid[i + 1][k]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.008)
    ob = mesh_from_bm(name, bm)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def sheet(name, top, down, length, rows=50, spread=0.25, back=0.18, folds=(7, 0.02), body=None, gap=0.012, thickness=0.009):
    """Folha de pano: borda de cima em `top` (lista de pontos), cai na direção `down` por `length`, abrindo para os
    lados (`spread`, ao longo da borda) e para trás (`back`, vetor). Dobras ao longo da largura crescem para baixo.
    Com `body`, o pano é empurrado para fora da pele (colisão simples, sem simulação)."""
    top = [Vector(p) for p in top]; n = len(top)
    down = Vector(down).normalized(); back = Vector(back)
    mid = sum(top, Vector()) / n
    tree = posed_bvh(body) if body else None
    bm = bmesh.new(); grid = []
    for i in range(rows + 1):
        v = i / rows
        row = []
        for j, p in enumerate(top):
            u = j / (n - 1) - 0.5
            q = p + (p - mid) * spread * v * 2 + down * length * v + back * v ** 1.2
            q += back.normalized() * folds[1] * v * math.sin(folds[0] * math.pi * (u + 0.5) + 2 * v)
            if tree:
                hit = tree.find_nearest(q, 0.08)
                if hit[0] is not None:
                    d = (q - hit[0]).dot(hit[1])
                    if d < gap: q = hit[0] + hit[1] * gap
            row.append(bm.verts.new(q))
        grid.append(row)
    for i in range(rows):
        for j in range(n - 1):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=thickness)
    ob = mesh_from_bm(name, bm)
    sm = ob.modifiers.new('suave', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 3
    apply_modifiers(ob)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def strap(name, tree, center, axis, width=0.014, thick=0.004, n=64, lift=0.0015, reach=0.3, max_ratio=1.3):
    """Tira chata em volta de um membro ou do quadril (sandália, bracelete, cinto). Raios saem de fora e vão até o
    eixo, no plano perpendicular a `axis`, contra a malha `tree` (posed_bvh). A tira segue a superfície tocada; um
    raio que erra ou acerta longe demais (peito do pé no plano do tornozelo) fica no raio mediano × `max_ratio`."""
    axis = Vector(axis).normalized(); c = Vector(center)
    a = axis.orthogonal().normalized(); b = axis.cross(a)
    dirs = [a * math.cos(2 * math.pi * k / n) + b * math.sin(2 * math.pi * k / n) for k in range(n)]
    rad = []
    for d in dirs:
        hit = tree.ray_cast(c + d * reach, -d, reach)
        rad.append((hit[0] - c).dot(d) if hit[0] is not None else None)
    ok = [r for r in rad if r is not None and r > 0]
    med = float(np.median(ok)) if ok else 0.05
    rad = [min(r, med * max_ratio) if (r is not None and r > 0) else med for r in rad]
    for _ in range(2): rad = [(rad[k - 1] + 2 * rad[k] + rad[(k + 1) % n]) / 4 for k in range(n)]
    bm = bmesh.new(); lo, hi = [], []
    for d, r in zip(dirs, rad):
        p = c + d * (r + lift)
        lo.append(bm.verts.new(p - axis * width / 2)); hi.append(bm.verts.new(p + axis * width / 2))
    for k in range(n):
        j = (k + 1) % n
        bm.faces.new((lo[k], lo[j], hi[j], hi[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=thick)
    ob = mesh_from_bm(name, bm)
    bv = ob.modifiers.new('chanfro', 'BEVEL'); bv.width = thick * 0.35; bv.segments = 2; apply_modifiers(ob)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def ribbon(name, tree, pts, width, thick=0.004, lift=0.004, n=60):
    """Faixa chata que corre sobre a pele (talabarte, faixa a tiracolo): a linha por `pts` é reamostrada, cada ponto
    vai à superfície mais próxima de `tree` (posed_bvh) e a largura fica no plano tangente."""
    pts = [Vector(p) for p in pts]
    seg = [(b - a).length for a, b in zip(pts, pts[1:])]; total = sum(seg)
    line = []
    for k in range(n):
        s, i = total * k / (n - 1), 0
        while i < len(seg) - 1 and s > seg[i]: s -= seg[i]; i += 1
        line.append(pts[i].lerp(pts[i + 1], min(s / seg[i], 1.0)))
    surf, nrm = [], []
    for p in line:
        h = tree.find_nearest(p, 0.3)
        surf.append(h[0] if h[0] is not None else p); nrm.append(h[1] if h[0] is not None else Vector((0, -1, 0)))
    for _ in range(3):   # normais suaves ao longo da faixa: sem torção nas emendas de faces
        nrm = [(nrm[max(i - 1, 0)] + nrm[i] * 2 + nrm[min(i + 1, n - 1)]).normalized() for i in range(n)]
    bm = bmesh.new(); L, R = [], []
    for i, (q, nn) in enumerate(zip(surf, nrm)):
        t = (surf[min(i + 1, n - 1)] - surf[max(i - 1, 0)]).normalized()
        side = t.cross(nn).normalized(); q = q + nn * lift
        L.append(bm.verts.new(q - side * width / 2)); R.append(bm.verts.new(q + side * width / 2))
    for i in range(n - 1):
        bm.faces.new((L[i], R[i], R[i + 1], L[i + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=thick)
    ob = mesh_from_bm(name, bm)
    sm = ob.modifiers.new('suave', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 2; apply_modifiers(ob)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def scallop_cap(name, center, normal, radius, ribs=11, depth=0.35, res=24):
    """Calota de concha (vieira): cúpula rasa com nervuras radiais, aberta em leque para baixo."""
    nrm = Vector(normal).normalized()
    t1 = nrm.orthogonal().normalized(); t2 = nrm.cross(t1)
    bm = bmesh.new(); rows = []
    for i in range(res + 1):
        s = i / res
        row = []
        for k in range(res * 2):
            a = 2 * math.pi * k / (res * 2)
            rib = 0.5 + 0.5 * math.cos(ribs * a)
            h = radius * depth * (1 - s * s) + radius * 0.06 * rib * s
            p = Vector(center) + (t1 * math.cos(a) + t2 * math.sin(a)) * radius * s * (1 + 0.05 * rib) + nrm * h
            row.append(bm.verts.new(p))
        rows.append(row)
    for a, b in zip(rows, rows[1:]):
        m = len(a)
        for k in range(m):
            bm.faces.new((a[k], a[(k + 1) % m], b[(k + 1) % m], b[k]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=-radius * 0.08)
    ob = mesh_from_bm(name, bm)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def silhouette_shots(objs, out_prefix, views=('frente', 'costas', 'esquerda', 'direita', 'tres-quartos'), size=(900, 1350), scale=None, focus=None):
    """Mesma câmera (render.shoot) em dois modos: argila com cavidade e silhueta preta sobre fundo claro."""
    from render import shoot
    s = bpy.context.scene
    for v in views:
        shoot(objs, f'{out_prefix}-argila-{v}.png', v, ortho=True, size=size, scale=scale, focus=focus)
    sh = s.display.shading
    sh.light, sh.color_type, sh.single_color = 'FLAT', 'SINGLE', (0.0, 0.0, 0.0)
    sh.show_cavity = sh.show_shadows = False
    w = s.world or bpy.data.worlds.new('W'); s.world = w; w.use_nodes = False
    w.color = (0.92, 0.9, 0.86)              # no render o Workbench pinta o fundo com a cor do World
    for v in views:
        shoot_flat(objs, f'{out_prefix}-silhueta-{v}.png', v, size, scale, focus)


def shoot_flat(objs, out, view, size, scale, focus):
    """Igual a render.shoot, sem refazer o sombreamento (mantém a silhueta preta)."""
    from render import VIEWS, bbox, camera
    s = bpy.context.scene
    s.render.resolution_x, s.render.resolution_y = size
    cam = camera(s)
    lo, hi = bbox(objs)
    c = (lo + hi) / 2 if focus is None else Vector(focus)
    d = Vector(VIEWS[view]).normalized()
    span = scale or max(hi.z - lo.z, (hi.x - lo.x) * size[1] / size[0], (hi.y - lo.y) * size[1] / size[0]) * 1.08
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = span; cam.data.clip_end = 1000
    cam.location = c + d * (span * 2.2)
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    s.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)
