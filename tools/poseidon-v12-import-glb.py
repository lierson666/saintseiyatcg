#!/usr/bin/env python3
"""SSTCG Poseidon sculpture asset inspector / non-destructive ingest (no runtime changes).
Supports multi-node/multi-material glTF2 GLBs; reads metadata and dimensions without Blender.
Does not approve art automatically.
"""
import argparse,hashlib,json,struct,sys,shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'arena-forge/assets/poseidon-v12'
CANDIDATES={'tides':'POS-MON-V10-001','depths':'POS-MON-V10-002'}
def inspect(path):
    raw=Path(path).read_bytes()
    if len(raw)<20 or raw[:4]!=b'glTF':raise ValueError('Missing GLB signature')
    version,length=struct.unpack_from('<II',raw,4)
    if version!=2 or length!=len(raw):raise ValueError('Invalid GLB version/length')
    idx=12;js=None;chunks=[]
    while idx<len(raw):
        if idx+8>len(raw):raise ValueError('Truncated chunk header')
        n,typ=struct.unpack_from('<I4s',raw,idx)
        idx+=8
        if n%4 or idx+n>len(raw):raise ValueError('Chunk size/position invalid')
        chunk=raw[idx:idx+n];idx+=n;chunks.append({'type':typ.decode('latin1'),'bytes':n})
        if typ==b'JSON':
            if js is not None:raise ValueError('Duplicate JSON')
            js=json.loads(chunk.decode('utf8').rstrip(' \x00'))
    if not js or js.get('asset',{}).get('version')!='2.0':raise ValueError('No glTF2 JSON chunk')
    meshes=js.get('meshes',[]);accessors=js.get('accessors',[])
    nodes=js.get('nodes',[]);materials=js.get('materials',[])
    total=0;no_uv=[];bad_meshes=[]
    for mi,m in enumerate(meshes):
        for prim in m.get('primitives',[]):
            attrs=prim.get('attributes',{})
            if 'POSITION' not in attrs or not isinstance(attrs['POSITION'],int) or attrs['POSITION']>=len(accessors):
                bad_meshes.append(mi);continue
            if 'TEXCOORD_0' not in attrs:no_uv.append(mi)
            if prim.get('mode',4)!=4:bad_meshes.append(mi);continue
            if 'indices' in prim:
                a=accessors[prim['indices']];count=a.get('count',0)
            else:count=accessors[attrs['POSITION']].get('count',0)
            if count%3:bad_meshes.append(mi)
            total+=count//3
    images=js.get('images',[])
    image_formats=[im.get('mimeType','external_or_unknown') for im in images]
    entries=[]
    for n in nodes:entries.append(n.get('name','unnamed'))
    return {
        'file':str(path),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
        'glbVersion':version,'meshCount':len(meshes),'nodeCount':len(nodes),
        'materialCount':len(materials),'textureCount':len(js.get('textures',[])),
        'imageCount':len(images),'imageFormats':image_formats,'triangles':total,
        'nodeNames':entries[:80],'extensionsRequired':js.get('extensionsRequired',[]),
        'hasAnimations':bool(js.get('animations')),'hasSkins':bool(js.get('skins')),
        'missingUVOnMeshes':no_uv,'unsupportedPrimitiveMeshes':bad_meshes,
        'qualityGate':'requires_artist_approval',
    }

def run():
    ap=argparse.ArgumentParser()
    ap.add_argument('glb',type=Path)
    ap.add_argument('--guardian',choices=tuple(CANDIDATES))
    ap.add_argument('--install',action='store_true',help='Store in V12 staging only (not active gameplay)')
    args=ap.parse_args()
    if args.install and not args.guardian:ap.error('--install requires --guardian')
    if not args.glb.is_file():ap.error('GLB not found')
    result=inspect(args.glb)
    # Safety: no arbitrary upper cap for source mesh, but never accidentally promote huge content.
    max_bytes=180*1024*1024
    if args.install and result['bytes']>max_bytes:ap.error('GLB over 180MB staging limit')
    if args.install:
        OUT.mkdir(parents=True,exist_ok=True)
        target=OUT/f'guardian-{args.guardian}.glb'
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()!=result['sha256']:
            ap.error(f'{target} exists with different hash; never overwrite automatically')
        if not target.exists():shutil.copyfile(args.glb,target)
        result['stagedPath']=str(target)
        result['guardianId']=CANDIDATES[args.guardian]
        result['status']='imported_for_review_not_published'
        report=OUT/f'guardian-{args.guardian}-inspection.json'
        report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':
    try:run()
    except (ValueError,IndexError,KeyError,struct.error) as e:
        print(f'GLB inspection failed: {e}',file=sys.stderr);raise SystemExit(2)
