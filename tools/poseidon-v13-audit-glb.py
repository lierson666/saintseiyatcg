#!/usr/bin/env python3
"""SSTCG V13 Professional GLB structural audit — non-destructive, no external deps.
Complements V12 quick intake. Never treats structural validity as artistic approval.
"""
import argparse,json,struct,hashlib
from pathlib import Path
SIZES={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
TYPES={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT2':4,'MAT3':9,'MAT4':16}
def audit(filename):
    path=Path(filename);raw=path.read_bytes()
    if len(raw)<20 or raw[:4]!=b'glTF' or struct.unpack_from('<I',raw,4)[0]!=2 or struct.unpack_from('<I',raw,8)[0]!=len(raw):
        raise ValueError('Not a complete binary glTF 2.0 file')
    cursor=12;g=None;binchunk=None
    while cursor<len(raw):
        if cursor+8>len(raw):raise ValueError('Bad chunk header')
        n,typ=struct.unpack_from('<I4s',raw,cursor);cursor+=8
        if n%4 or cursor+n>len(raw):raise ValueError('Bad chunk length/alignment')
        if typ==b'JSON':
            if g is not None:raise ValueError('Multiple JSON chunks')
            g=json.loads(raw[cursor:cursor+n].decode('utf8').rstrip(' \0'))
        if typ==b'BIN\0':
            if binchunk is not None:raise ValueError('Multiple BIN chunks')
            binchunk=raw[cursor:cursor+n]
        cursor+=n
    if g is None or g.get('asset',{}).get('version')!='2.0':raise ValueError('Missing valid JSON')
    buffers=g.get('buffers',[])
    if len(buffers)!=1 or binchunk is None or buffers[0].get('uri'):raise ValueError('V13 staging requires a self-contained GLB with one BIN chunk')
    if not isinstance(buffers[0].get('byteLength'),int) or len(binchunk)-buffers[0]['byteLength'] not in range(4):
        raise ValueError('BIN length mismatch')
    views=g.get('bufferViews',[]);acs=g.get('accessors',[])
    for i,v in enumerate(views):
        off=v.get('byteOffset',0);length=v.get('byteLength')
        if v.get('buffer')!=0 or not isinstance(off,int) or not isinstance(length,int) or off<0 or length<0 or off+length>len(binchunk):
            raise ValueError(f'bufferView {i} outside GLB')
        stride=v.get('byteStride')
        if stride is not None and (not isinstance(stride,int) or stride<4 or stride>252 or stride%4):
            raise ValueError(f'bufferView {i} invalid stride')
    for i,a in enumerate(acs):
        if 'bufferView' not in a: # sparse can be valid but is not supported by the lightweight runtime
            raise ValueError(f'accessor {i} sparse/no bufferView: requires extended loader')
        vi=a['bufferView']
        if not isinstance(vi,int) or not 0<=vi<len(views):raise ValueError(f'accessor {i} invalid bufferView')
        t=a.get('type');ct=a.get('componentType');count=a.get('count')
        if t not in TYPES or ct not in SIZES or not isinstance(count,int) or count<0:raise ValueError(f'accessor {i} bad type/count')
        if a.get('sparse'):raise ValueError(f'accessor {i} sparse data needs explicit review')
        off=a.get('byteOffset',0)
        if not isinstance(off,int) or off<0 or off%SIZES[ct]:raise ValueError(f'accessor {i} misaligned')
        elem=TYPES[t]*SIZES[ct]
        view=views[vi];stride=view.get('byteStride',elem)
        if stride<elem:raise ValueError(f'accessor {i} bad stride')
        required=off+(count-1)*stride+elem if count else off
        if required>view['byteLength']:raise ValueError(f'accessor {i} exceeds view')
    primitives=0;triangles=0;material_ids=set()
    for i,mesh in enumerate(g.get('meshes',[])):
        for prim in mesh.get('primitives',[]):
            primitives+=1
            a=prim.get('attributes',{})
            if 'POSITION' not in a:raise ValueError(f'mesh {i} has no position')
            if prim.get('mode',4)!=4:raise ValueError(f'mesh {i} non-triangle primitive')
            for aid in a.values():
                if not isinstance(aid,int) or aid<0 or aid>=len(acs):raise ValueError('invalid attribute accessor index')
            idx=prim.get('indices')
            if idx is not None and (not isinstance(idx,int) or idx<0 or idx>=len(acs)):raise ValueError('invalid indices accessor')
            n=acs[idx if idx is not None else a['POSITION']]['count']
            if n%3:raise ValueError('triangle count not multiple of three')
            triangles+=n//3
            if 'material' in prim:
                mi=prim['material']
                if not isinstance(mi,int) or mi<0 or mi>=len(g.get('materials',[])):raise ValueError('invalid material index')
                material_ids.add(mi)
    for i,im in enumerate(g.get('images',[])):
        if im.get('uri'):
            raise ValueError('external textures disallowed in staged GLB')
        vi=im.get('bufferView')
        if not isinstance(vi,int) or vi<0 or vi>=len(views):raise ValueError(f'image {i} missing view')
        if im.get('mimeType') not in ('image/png','image/jpeg','image/webp'):
            raise ValueError(f'image {i} unsupported mimeType')
    for i,t in enumerate(g.get('textures',[])):
        source=t.get('source')
        if source is not None and (not isinstance(source,int) or source<0 or source>=len(g.get('images',[]))):
            raise ValueError(f'texture {i} invalid image source')
    warnings=[]
    if not g.get('nodes'):warnings.append('No named nodes')
    if not g.get('images'):warnings.append('No embedded textures')
    if triangles>30000:warnings.append('Above V12 high-poly target; evaluate LOD and GPU budget')
    if g.get('skins') or g.get('animations'):warnings.append('Animated/rigged GLB requires full glTF loader')
    if g.get('extensionsRequired'):warnings.append('ExtensionsRequired: '+','.join(g['extensionsRequired']))
    return dict(file=str(path),sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),
       nodes=len(g.get('nodes',[])),meshes=len(g.get('meshes',[])),primitives=primitives,
       triangles=triangles,materials=len(g.get('materials',[])),embeddedImages=len(g.get('images',[])),
       requiredExtensions=g.get('extensionsRequired',[]),warnings=warnings,
       geometricGate='STRUCTURE_VALID_ART_REVIEW_PENDING')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('path',type=Path);p.add_argument('--out',type=Path);args=p.parse_args()
    try:r=audit(args.path)
    except (ValueError,KeyError,IndexError,struct.error) as e:raise SystemExit('GLB AUDIT FAILED: '+str(e))
    result=json.dumps(r,ensure_ascii=False,indent=2)+'\n'
    if args.out:args.out.write_text(result)
    print(result)
