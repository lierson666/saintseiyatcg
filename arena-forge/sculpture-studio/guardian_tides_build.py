"""Guardian of the Tides · montagem, LODs, bake de texturas e exportação GLB.

Rodar (Blender 4.5 LTS, sem interface):
  "~/Applications/Blender 4.5 LTS.app/Contents/MacOS/Blender" -b --factory-startup \
      --python arena-forge/sculpture-studio/guardian_tides_build.py -- [--stage all|sculpt|game] [--quick]

Etapas:
  sculpt  corpo + rig + pose + punho + tridente + cabelo/barba/coroa + manto (simulação) + pedestal/ondas.
          Salva WORK/guardian-tides-sculpt.blend (high poly, fora do repositório).
  game    congela o high poly, gera LOD0/1/2 por decimação, atlas UV por material, bake de normal e AO
          (high → low), textura base pintada (mármore + AO + luz de aresta), ORM, e exporta os GLB:
          OUT/guardian-tides-lod0.glb (texturas desktop), -lod1.glb, -lod2.glb, -mobile.glb (LOD1 + 512²).
Saída em escala de mundo (1 unidade = 1 m), Y para cima, frente +Z, pivô no centro da base do plinto.
"""
import json
import math
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

from common import OUT, apply_modifiers, link, reset, select_only, tris
from guardian_tides_body import (attach_eyes, build_rig, curl_fingers, finger_chains, finger_weights, grip_axis,
                                 load_body, pose_guardian)
from guardian_tides_drapery import SETTLE, bake_pose_animation, build_cloth, collision_proxy, finish_cloth
from guardian_tides_hair import build_hair, laurel_crown
from guardian_tides_pedestal import CENTER, H, pedestal, waves
from guardian_tides_trident import build_trident

WORK = Path(os.environ.get('SSTCG_SCULPT_WORK', Path.home() / 'worktrees/sstcg-tools/sculpt-work'))
SCALE = 3.3                     # corpo base 1,68 m → figura 5,56 m; plinto 1,94 m; tridente até 10,0 m
MATERIALS = {
    'STATUE_AGED_IVORY': ['TIDES__BODY', 'TIDES__FACE', 'TIDES__HAND_GRIP', 'TIDES__HAIR_BEARD', 'TIDES__CLOTH'],
    'STATUE_DEEP_MARBLE': ['TIDES__PEDESTAL', 'TIDES__WAVES'],
    'STATUE_ANCIENT_GOLD': ['TIDES__TRIDENT', 'TIDES__DETAILS'],
}
TEX = {'STATUE_AGED_IVORY': 2048, 'STATUE_DEEP_MARBLE': 2048, 'STATUE_ANCIENT_GOLD': 1024}
LOD0 = {  # orçamento de triângulos por parte (LOD0 ~29k); LOD1 = 30 %, LOD2 = 9 %
    'TIDES__BODY': 6000, 'TIDES__FACE': 2600, 'TIDES__HAND_GRIP': 1600, 'TIDES__HAIR_BEARD': 4400,
    'TIDES__CLOTH': 5200, 'TIDES__TRIDENT': 1800, 'TIDES__DETAILS': 1400, 'TIDES__PEDESTAL': 1600, 'TIDES__WAVES': 4000,
}
LOD_FACTORS = {0: 1.0, 1: 0.30, 2: 0.085}


# ───────────────────────────── etapa 1: escultura ─────────────────────────────

def stage_sculpt(quick=False):
    t0 = time.time()
    reset()
    body, eyes = load_body()
    hair = build_hair(body, voxel=0.0024 if quick else 0.0018)
    crown = laurel_crown(hair, body)
    rest = np.array([v.co[:] for v in body.data.vertices])
    chR, frR = finger_chains(body, 1); chL, frL = finger_chains(body, -1)
    arm, _ = build_rig(body, {'R': chR, 'L': chL})
    finger_weights(body, 1, chR, frR); finger_weights(body, -1, chL, frL)
    attach_eyes(eyes + [hair, crown], arm)
    curl_fingers(arm, 'R', frR)
    curl_fingers(arm, 'L', frL, angles=(30, 45, 35), thumb=(15, 15))
    pose_guardian(arm)
    c, a, r = grip_axis(arm)
    trident = build_trident(c, a)
    bake_pose_animation(arm)
    collision_proxy(body, arm)
    cloth = build_cloth(body, arm)
    finish_cloth(cloth)
    ped, gold = pedestal()
    wv = waves(voxel=0.0045 if quick else 0.0035)
    # partes do corpo pelo repouso (índices da malha base): rosto e mão do tridente
    parts = {
        'TIDES__FACE': ((rest[:, 2] > 1.455) & (rest[:, 1] < 0.0) & (np.abs(rest[:, 0]) < 0.1)),
        'TIDES__HAND_GRIP': ((rest[:, 0] < -0.33) & (rest[:, 2] < 0.95)),
    }
    for name, mask in parts.items():
        g = body.vertex_groups.new(name=name)
        g.add([int(i) for i in np.where(mask)[0]], 1.0, 'REPLACE')
    meta = {'grip_center': list(c), 'grip_axis': list(a), 'grip_radius': r, 'seconds': round(time.time() - t0, 1)}
    bpy.context.scene['tides_meta'] = json.dumps(meta)
    WORK.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'guardian-tides-sculpt.blend'))
    print('SCULPT ok', meta)


# ───────────────────────────── etapa 2: jogo ─────────────────────────────

def _copy(o, name):
    n = o.copy(); n.data = o.data.copy(); n.name = name; n.data.name = name
    for c in o.users_collection: c.objects.link(n)
    return n


def _freeze(o):
    """Aplica modificadores e o parentesco (osso da cabeça) mantendo a posição do mundo."""
    mw = o.matrix_world.copy()
    apply_modifiers(o)
    o.parent = None; o.matrix_world = mw
    o.data.transform(mw); o.matrix_world = Matrix.Identity(4)
    for g in o.vertex_groups[:]:
        if not g.name.startswith('TIDES__'): o.vertex_groups.remove(g)
    return o


def _join(objs, name):
    select_only(*objs, active=objs[0])
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name; o.data.name = name
    return o


def _split(o, groups):
    """Separa as partes nomeadas (grupos de vértices) de um objeto; o resto fica no original."""
    out = {}
    for name in groups:
        g = o.vertex_groups.get(name)
        if g is None: continue
        n = _copy(o, name)
        bm = bmesh.new(); bm.from_mesh(n.data)
        dl = bm.verts.layers.deform.active
        keep = lambda v: dl is not None and g.index in v[dl] and v[dl][g.index] > 0.5
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v)], context='VERTS')
        bm.to_mesh(n.data); bm.free()
        out[name] = n
    bm = bmesh.new(); bm.from_mesh(o.data)
    dl = bm.verts.layers.deform.active
    idx = [o.vertex_groups[n].index for n in groups if o.vertex_groups.get(n)]
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if dl is not None and any(i in v[dl] and v[dl][i] > 0.5 for i in idx)], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    return out


def _protect_extremes(o, k=8):
    """Grupo com os k vértices mais extremos em cada ponta de cada eixo da peça. A decimação não mexe neles:
    sem isso o LOD2 perdia a base do plinto (8 cm acima do chão), a ponta do tridente e o alto do cabelo.
    Poucos vértices de propósito: uma faixa inteira travava a decimação nas malhas densas."""
    co = np.array([v.co[:] for v in o.data.vertices])
    if len(co) < 8 * k: return None
    ids = set()
    for a in range(3):
        order = np.argsort(co[:, a]); ids.update(order[:k].tolist()); ids.update(order[-k:].tolist())
    g = o.vertex_groups.new(name='EXTREMOS'); g.add([int(i) for i in ids], 1.0, 'REPLACE')
    return g.name


def _decimate(o, target):
    keep = _protect_extremes(o)
    for _ in range(4):   # malhas muito densas (cinto, cabelo no LOD2) não chegam à meta numa passada só
        t = tris(o)
        if t <= target * 1.05: break
        m = o.modifiers.new('lod', 'DECIMATE'); m.ratio = max(target / t, 0.02); m.use_collapse_triangulate = True
        if keep: m.vertex_group = keep; m.invert_vertex_group = True   # decima tudo menos as pontas
        apply_modifiers(o)
    m = o.modifiers.new('tri', 'TRIANGULATE'); apply_modifiers(o)
    if tris(o) > target * 1.15:
        # peças pequenas soltas (folhas da coroa) não colapsam: no LOD distante saem as menores até caber
        bm = bmesh.new(); bm.from_mesh(o.data)
        dl = bm.verts.layers.deform.active
        ki = o.vertex_groups[keep].index if keep else -1
        pinned = (lambda f: any(ki in v[dl] for v in f.verts)) if (keep and dl) else (lambda f: False)
        isl, seen = [], set()
        for f in bm.faces:
            if f.index in seen: continue
            stack, part = [f], []
            seen.add(f.index)
            while stack:
                x = stack.pop(); part.append(x)
                for e in x.edges:
                    for y in e.link_faces:
                        if y.index not in seen: seen.add(y.index); stack.append(y)
            isl.append(part)
        isl.sort(key=lambda p: sum(f.calc_area() for f in p))
        total = sum(len(p) for p in isl); drop = []
        for p in isl[:-1]:                    # a maior ilha (a peça em si) nunca sai, nem ilha que segura uma ponta
            if total <= target: break
            if any(pinned(f) for f in p): continue
            drop += p; total -= len(p)
        bmesh.ops.delete(bm, geom=drop, context='FACES'); bm.to_mesh(o.data); bm.free()
    if keep: o.vertex_groups.remove(o.vertex_groups[keep])
    for p in o.data.polygons: p.use_smooth = True
    return o


def _decimate_keep_shape(o, target, tol=0.03, tries=3):
    """Decima e confere a caixa da peça: se alguma ponta encolher mais que `tol` (3 cm no corpo base, ~10 cm no
    mundo), volta à malha original e decima de novo com 60 % mais triângulos. O LOD2 perdia as pontas do tridente."""
    ext = lambda ob: (lambda c: (c.min(0), c.max(0)))(np.array([v.co[:] for v in ob.data.vertices]))
    src = o.data.copy(); lo0, hi0 = ext(o)
    for k in range(tries):
        _decimate(o, target)
        lo, hi = ext(o)
        if max(np.abs(lo - lo0).max(), np.abs(hi - hi0).max()) <= tol or k == tries - 1: break
        old = o.data; o.data = src.copy(); bpy.data.meshes.remove(old); target = int(target * 1.6)
    bpy.data.meshes.remove(src)
    return o


def hi_poly():
    """Congela todas as peças no quadro final (pose + pano assentado). Retorna {parte: [objetos high]}."""
    s = bpy.context.scene; s.frame_set(SETTLE)
    O = bpy.data.objects
    body = O['TIDES__BODY']
    mr = next((m for m in body.modifiers if m.type == 'MULTIRES'), None)
    low_body = _copy(body, 'LOW_BODY_BASE')
    if mr:
        mr.levels = 2; _freeze(body)
        low_mr = next(m for m in low_body.modifiers if m.type == 'MULTIRES'); low_mr.levels = 0; _freeze(low_body)
    else:   # V14: multires já aplicado no corpo; a base do low poly é a mesma malha, decimada depois
        _freeze(body); _freeze(low_body)
    hi = {}
    split = _split(body, ['TIDES__FACE', 'TIDES__HAND_GRIP'])
    hi['TIDES__BODY'] = [body]; hi['TIDES__FACE'] = [split['TIDES__FACE']]; hi['TIDES__HAND_GRIP'] = [split['TIDES__HAND_GRIP']]
    eyes = [o for o in O if o.name.startswith('GEO-body_male_realistic.eye')]
    for e in eyes:
        _freeze(e); hi['TIDES__FACE'].append(e)
    for name in ('TIDES__HAIR_BEARD', 'TIDES__CLOTH', 'TIDES__TRIDENT', 'TIDES__PEDESTAL', 'TIDES__WAVES'):
        hi[name] = [_freeze(O[name])]
    hi['TIDES__DETAILS'] = [_freeze(O['TIDES__LAUREL']), _freeze(O['TIDES__PEDESTAL_GOLD'])]
    if O.get('TIDES__BELT'): hi['TIDES__DETAILS'].append(_freeze(O['TIDES__BELT']))            # V14
    if O.get('TIDES__HIPPOCAMPUS'): hi['TIDES__PEDESTAL'].append(_freeze(O['TIDES__HIPPOCAMPUS']))
    for n in ('TIDES_COLLIDER',):
        if O.get(n): bpy.data.objects.remove(O[n])
    return hi, low_body


def low_poly(hi, low_body, lod):
    f = LOD_FACTORS[lod]
    low = {}
    lb = _copy(low_body, f'L{lod}_BODY')
    parts = _split(lb, ['TIDES__FACE', 'TIDES__HAND_GRIP'])
    src = {'TIDES__BODY': [lb], 'TIDES__FACE': [parts['TIDES__FACE']], 'TIDES__HAND_GRIP': [parts['TIDES__HAND_GRIP']]}
    for name, objs in hi.items():
        if name in src:
            if name == 'TIDES__FACE':
                src[name] += [_copy(e, f'L{lod}_{e.name}') for e in objs if 'eye' in e.name]
            continue
        src[name] = [_copy(o, f'L{lod}_{o.name}') for o in objs]
    for name, objs in src.items():
        if name == 'TIDES__DETAILS' and any('BELT' in x.name for x in objs):
            # V14: cada peça com a sua cota; juntas, o corte de ilhas jogava fora a coroa e os ouros
            share = {'BELT': 0.35, 'LAUREL': 0.45, 'GOLD': 0.20}
            parts = []
            for x in objs:
                key = next(k for k in share if k in x.name)
                if key == 'BELT':   # o cinto (escamas + solidify) não é manifold e não decima; o remesh fecha a malha
                    rm = x.modifiers.new('fechar', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.003; apply_modifiers(x)
                parts.append(_decimate(x, max(int(LOD0[name] * f * share[key]), 60)))
            o = _join(parts, f'L{lod}_{name}')
            for g in o.vertex_groups[:]: o.vertex_groups.remove(g)
            o.name = f'L{lod}_{name}'
            low[name] = o
            continue
        o = objs[0] if len(objs) == 1 else _join(objs, f'L{lod}_{name}')
        for g in o.vertex_groups[:]: o.vertex_groups.remove(g)
        o.name = f'L{lod}_{name}'
        low[name] = _decimate_keep_shape(o, max(int(LOD0[name] * f), 150))
    return low


def marble_shader(mat, kind):
    """Shader procedural usado só como fonte do bake de cor (o GLB leva as texturas assadas)."""
    mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bs.outputs[0], out.inputs[0])
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 14 if kind != 'gold' else 30
    noise.inputs['Detail'].default_value = 12; noise.inputs['Distortion'].default_value = 3.5
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(noise.outputs['Fac'], ramp.inputs[0])
    E = ramp.color_ramp.elements
    if kind == 'ivory':        # marfim envelhecido com veios verde-mar finos
        # base quase uniforme; o veio é uma faixa estreita no meio do ruído (linha fina, não mancha)
        E[0].position, E[0].color = 0.0, (0.86, 0.81, 0.70, 1)
        E[1].position, E[1].color = 1.0, (0.93, 0.89, 0.80, 1)
        for pos, col in ((0.497, (0.88, 0.84, 0.74, 1)), (0.5, (0.70, 0.77, 0.70, 1)), (0.503, (0.89, 0.85, 0.75, 1))):
            e = E.new(pos); e.color = col
    elif kind == 'marble':     # pedra oceânica: azul-esverdeado profundo com veios claros
        E[0].position, E[0].color = 0.0, (0.15, 0.25, 0.29, 1)
        E[1].position, E[1].color = 1.0, (0.22, 0.34, 0.38, 1)
        for pos, col in ((0.49, (0.17, 0.28, 0.32, 1)), (0.5, (0.62, 0.70, 0.68, 1)), (0.51, (0.18, 0.29, 0.33, 1))):
            e = E.new(pos); e.color = col
    else:                      # ouro antigo: variação suave, sem amarelo chapado
        E[0].position, E[0].color = 0.3, (0.55, 0.38, 0.13, 1)
        E[1].position, E[1].color = 0.7, (0.78, 0.60, 0.26, 1)
    nt.links.new(ramp.outputs[0], bs.inputs['Base Color'])
    return mat


def _image(name, size, data=False):
    im = bpy.data.images.get(name) or bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    if data: im.colorspace_settings.name = 'Non-Color'
    return im


def _bake(kind, low, his, img, extrusion=0.012, margin=8):
    s = bpy.context.scene
    for o in [low] + his: o.hide_render = False
    nt = low.active_material.node_tree
    node = nt.nodes.new('ShaderNodeTexImage'); node.image = img; nt.nodes.active = node
    select_only(*his, low, active=low)
    b = s.render.bake
    b.use_selected_to_active = bool(his); b.cage_extrusion = extrusion; b.max_ray_distance = extrusion * 3; b.margin = margin
    if kind == 'DIFFUSE':
        b.use_pass_direct = b.use_pass_indirect = False; b.use_pass_color = True
    bpy.ops.object.bake(type=kind)
    nt.nodes.remove(node)


def _px(img):
    a = np.empty(img.size[0] * img.size[1] * 4, np.float32); img.pixels.foreach_get(a)
    return a.reshape(img.size[1], img.size[0], 4)


def _set(img, arr):
    img.pixels.foreach_set(arr.astype(np.float32).ravel()); img.update()


def painterly(base, ao, nrm, kind):
    """Acabamento pintado (não fotorrealista): AO tinge as cavidades de azul-marinho, arestas convexas
    ganham luz quente (curvatura tirada do mapa de normais) e a cor é levemente posterizada."""
    A = ao[..., :1]
    n = nrm[..., :3] * 2 - 1
    curv = np.gradient(n[..., 0], axis=1) + np.gradient(n[..., 1], axis=0)
    curv = np.clip(curv * 6, -1, 1)[..., None]
    cav = np.array([0.10, 0.20, 0.27]) if kind != 'gold' else np.array([0.18, 0.10, 0.03])
    col = base[..., :3] * (0.7 + 0.3 * A) + cav * (1 - A) * 0.18
    col += np.clip(curv, 0, 1) * (0.10 if kind != 'gold' else 0.18) * np.array([1.0, 0.92, 0.75])
    col = np.round(col * 24) / 24 * 0.5 + col * 0.5          # posterização leve: pinceladas
    out = base.copy(); out[..., :3] = np.clip(col, 0, 1)
    return out


def bake_group(mat_name, low, hi, size, lods):
    """Atlas por material: junta as partes low, desdobra UV, assa normal/AO/cor do high e devolve as partes."""
    kind = {'STATUE_AGED_IVORY': 'ivory', 'STATUE_DEEP_MARBLE': 'marble', 'STATUE_ANCIENT_GOLD': 'gold'}[mat_name]
    src = bpy.data.materials.get('SRC_' + mat_name) or marble_shader(bpy.data.materials.new('SRC_' + mat_name), kind)
    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
    names = MATERIALS[mat_name]
    his = [o for n in names for o in hi[n]]
    for o in his:
        o.data.materials.clear(); o.data.materials.append(src)
    imgs = {}
    for lod in lods:
        parts = [low[lod][n] for n in names]
        for p in parts:
            g = p.vertex_groups.new(name=p.name.split('_', 1)[1]); g.add(list(range(len(p.data.vertices))), 1.0, 'REPLACE')
            p.data.materials.clear(); p.data.materials.append(mat)
        j = _join(parts, f'ATLAS_{mat_name}_{lod}')
        # uma só camada UV, ativa no bake e no render: a base CC0 traz as próprias UVs e o glTF exporta a de render
        while j.data.uv_layers: j.data.uv_layers.remove(j.data.uv_layers[0])
        uv = j.data.uv_layers.new(name='UVMap'); uv.active = True; uv.active_render = True
        select_only(j); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004); bpy.ops.object.mode_set(mode='OBJECT')
        if lod == lods[0]:       # texturas assadas uma vez (LOD0) e reaproveitadas: as UVs dos LODs diferem,
            pass                 # então cada LOD assa as suas (normal + AO + cor), mesmo tamanho
        sz = size if lod == 0 else max(size // 2, 512)
        mat.use_nodes = True
        im_c, im_n, im_a = _image(f'{mat_name}_L{lod}_base', sz), _image(f'{mat_name}_L{lod}_normal', sz, True), _image(f'{mat_name}_L{lod}_ao', sz, True)
        _bake('NORMAL', j, his, im_n, extrusion=0.02)
        _bake('DIFFUSE', j, his, im_c, extrusion=0.02)
        base, nrm = _px(im_c), _px(im_n)
        bad = nrm[..., 2] < 0.5                       # raio que errou o high: normal virada para dentro vira plana
        nrm[bad, 0], nrm[bad, 1], nrm[bad, 2] = 0.5, 0.5, 1.0
        _set(im_n, nrm)
        # AO assado não é confiável aqui (cascas finas do pano e emendas rosto/corpo se ocluem na malha decimada):
        # a oclusão vem da curvatura côncava do mapa de normais — cavidades de cinzel, não sombra de contato
        n3 = nrm[..., :3] * 2 - 1
        curv = np.gradient(n3[..., 0], axis=1) + np.gradient(n3[..., 1], axis=0)
        ao = np.ones_like(base); ao[..., 0] = np.clip(1 + np.minimum(curv * 6, 0) * 0.8, 0.45, 1)
        ao[base[..., :3].sum(-1) == 0] = 1                       # fundo do atlas
        _set(im_a, ao)
        print(f'BAKE {mat_name} L{lod}: normais corrigidas {float(bad.mean()):.1%}, cavidade média {ao[..., 0].mean():.2f}')
        _set(im_c, painterly(base, ao, nrm, kind))
        orm = np.ones_like(base)
        rough = {'ivory': 0.62, 'marble': 0.55, 'gold': 0.38}[kind] + 0.12 * (1 - ao[..., 0])
        orm[..., 0], orm[..., 1], orm[..., 2] = ao[..., 0], np.clip(rough, 0, 1), (0.9 if kind == 'gold' else 0.0)
        im_o = _image(f'{mat_name}_L{lod}_orm', sz, True); _set(im_o, orm)
        lm = bpy.data.materials.new(f'{mat_name}') if lod else mat
        lm.name = mat_name if lod == 0 else f'{mat_name}__L{lod}'
        gltf_material(lm, im_c, im_n, im_o)
        j.data.materials.clear(); j.data.materials.append(lm)
        back = _split(j, [n for n in names])
        for n, o in back.items():
            o.name = f'L{lod}_{n}'; low[lod][n] = o
        bpy.data.objects.remove(j)
        imgs[lod] = (im_c, im_n, im_o)
    return imgs


def gltf_material(mat, im_c, im_n, im_o):
    """Material que o exportador glTF entende: base color, normal, ORM (R=AO no glTF Material Output, G=rough, B=metal)."""
    mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bs.outputs[0], out.inputs[0])
    c = nt.nodes.new('ShaderNodeTexImage'); c.image = im_c; nt.links.new(c.outputs[0], bs.inputs['Base Color'])
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = im_n
    nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(n.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], bs.inputs['Normal'])
    o = nt.nodes.new('ShaderNodeTexImage'); o.image = im_o
    sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(o.outputs[0], sep.inputs[0])
    nt.links.new(sep.outputs[1], bs.inputs['Roughness']); nt.links.new(sep.outputs[2], bs.inputs['Metallic'])
    grp = bpy.data.node_groups.get('glTF Material Output')
    if grp is None:
        grp = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        grp.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    g = nt.nodes.new('ShaderNodeGroup'); g.node_tree = grp; nt.links.new(sep.outputs[0], g.inputs['Occlusion'])
    return mat


def world_transform():
    """Unidades do corpo → metros; pivô no centro da base do plinto."""
    return Matrix.Scale(SCALE, 4) @ Matrix.Translation(Vector((-CENTER.x, -CENTER.y, H)))


def export_lod(parts, path, tex_size=None):
    """Monta GUARDIAN_TIDES > TIDES__* em escala de mundo e exporta GLB (só esses objetos)."""
    M = world_transform()
    root = link(bpy.data.objects.new('GUARDIAN_TIDES', None))
    objs = []
    for name, o in parts.items():
        e = _copy(o, name + '_EXPORT')
        e.data.transform(M); e.matrix_world = Matrix.Identity(4)
        for coll in (bpy.data.objects, bpy.data.meshes):          # o nome limpo fica livre (high poly vira HI_*)
            old = coll.get(name)
            if old is not None and old != e and old != e.data: old.name = 'HI_' + name
        e.name = name; e.data.name = name
        e.parent = root; objs.append(e)
    resized = []
    if tex_size:
        for o in objs:
            for m in o.data.materials:
                for nd in m.node_tree.nodes:
                    if nd.type == 'TEX_IMAGE' and nd.image and nd.image.size[0] > tex_size:
                        cp = nd.image.copy(); cp.scale(tex_size, tex_size); cp.name = nd.image.name + f'_{tex_size}'
                        resized.append((nd, nd.image)); nd.image = cp
    select_only(root, *objs, active=root)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=False, export_image_format='JPEG', export_jpeg_quality=90,
                              export_materials='EXPORT', export_extras=False, export_animations=False)
    for nd, im in resized: nd.image = im
    for o in objs: bpy.data.objects.remove(o)
    bpy.data.objects.remove(root)
    return path


def stage_game(lods=(0, 1, 2), src=None, out=None, game_blend=None):
    src = src or WORK / 'guardian-tides-sculpt.blend'
    out = out or OUT
    game_blend = game_blend or WORK / 'guardian-tides-game.blend'
    bpy.ops.wm.open_mainfile(filepath=str(src))
    if bpy.data.objects.get('TIDES__BELT'): LOD0['TIDES__DETAILS'] = 2400   # V14: cinto de escamas divide o orçamento com a coroa
    s = bpy.context.scene
    s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.cycles.samples = 24
    s.world = s.world or bpy.data.worlds.new('BAKE')
    s.world.light_settings.distance = 0.04     # AO só das cavidades da escultura (4 cm no corpo base ≈ 13 cm no mundo)
    hi, low_body = hi_poly()
    low = {lod: low_poly(hi, low_body, lod) for lod in lods}
    report = {'hiPoly': {n: sum(tris(o) for o in objs) for n, objs in hi.items()}}
    for mat_name in MATERIALS:
        bake_group(mat_name, low, hi, TEX[mat_name], lods)
    out.mkdir(parents=True, exist_ok=True)
    for lod in lods:
        report[f'lod{lod}'] = {n: tris(o) for n, o in low[lod].items()}
        report[f'lod{lod}']['total'] = sum(report[f'lod{lod}'].values())
        export_lod(low[lod], out / f'guardian-tides-lod{lod}.glb')
    export_lod(low[1], out / 'guardian-tides-mobile.glb', tex_size=512)
    meta = json.loads(s.get('tides_meta', '{}'))
    report.update(scale=SCALE, grip=meta, generated=time.strftime('%Y-%m-%d %H:%M'))
    (out / 'guardian-tides-build.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
    bpy.ops.wm.save_as_mainfile(filepath=str(game_blend))
    print('GAME ok', json.dumps({k: v.get('total') for k, v in report.items() if isinstance(v, dict) and 'total' in v}))


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    stage = argv[argv.index('--stage') + 1] if '--stage' in argv else 'all'
    quick = '--quick' in argv
    if stage in ('all', 'sculpt'): stage_sculpt(quick)
    if stage in ('all', 'game'): stage_game()
    if stage == 'game-v14':
        stage_game(src=WORK / 'guardian-tides-v14-sculpt.blend', out=OUT.parent / 'poseidon-v14',
                   game_blend=WORK / 'guardian-tides-v14-game.blend')
    if stage == 'game-v14-1':
        stage_game(src=WORK / 'guardian-tides-v14-1-sculpt.blend', out=OUT.parent / 'poseidon-v14-1',
                   game_blend=WORK / 'guardian-tides-v14-1-game.blend')
