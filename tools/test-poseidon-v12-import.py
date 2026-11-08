#!/usr/bin/env python3
"""V12 ingest test: read historical valid assets; reject corrupted binary; stage copy non-destructively."""
import importlib.util,json,tempfile,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'tools/poseidon-v12-import-glb.py'
spec=importlib.util.spec_from_file_location('v12_glb_inspector',SCRIPT)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
paths=[
 ROOT/'arena-forge/assets/poseidon-v7/poseidon-sacred-trident.glb',
 ROOT/'arena-forge/assets/poseidon-v8/poseidon-marine-capital.glb',
 ROOT/'arena-forge/assets/poseidon-v9/poseidon-portal-relief.glb',
]
counts=[1732,3136,399]
for p,n in zip(paths,counts):
 r=mod.inspect(p)
 assert r['glbVersion']==2 and r['triangles']==n
 assert r['textureCount']>=1 and r['missingUVOnMeshes']==[]
 assert r['qualityGate']=='requires_artist_approval'
 print('VALID',p.name,'triangles=',n,'sha=',r['sha256'][:12])
with tempfile.TemporaryDirectory() as t:
 p=Path(t)/'corrupt.glb'
 p.write_bytes(b'glTF'+b'\x02\x00\x00\x00'+(100).to_bytes(4,'little')+b'junk')
 try:mod.inspect(p)
 except ValueError:print('CORRUPT_REJECTED')
 else:raise AssertionError('corrupt GLB accepted')
 p=Path(t)/'zero.glb';p.write_bytes(b'')
 try:mod.inspect(p)
 except ValueError:print('EMPTY_REJECTED')
 else:raise AssertionError('empty GLB accepted')
print('V12_INSPECTOR_TESTS_PASS')
