// SSTCG V11 preflight: distinguishes approved art from missing GLBs.
// This script intentionally does not fabricate sculptures.
import fs from 'node:fs';
import path from 'node:path';
const base='arena-forge/assets/poseidon-v11';
const expected=[
  {id:'POS-MON-V10-001',filename:'guardian-tides.glb',position:[-10.8,4.41,-34.8]},
  {id:'POS-MON-V10-002',filename:'guardian-depths.glb',position:[10.8,4.41,-34.8]}
];
const results=expected.map(a=>{
  const p=path.join(base,a.filename);
  const exists=fs.existsSync(p);
  const bin=exists?fs.readFileSync(p):null;
  const validGLB=!!bin&&bin.length>=20&&bin.subarray(0,4).toString()==='glTF'&&bin.readUInt32LE(4)===2&&bin.readUInt32LE(8)===bin.length;
  return {...a,exists,validGLB,modelStatus:validGLB?'ready_for_visual_review':exists?'invalid_binary':'not_started'};
});
const camera=JSON.parse(fs.readFileSync('docs/art-bible/poseidon-v10-guardian-layout.json','utf8'));
const allInEarlyCinema=camera.anchors.every(a=>a.projections.slice(0,3).some(p=>p.top.visible||p.foot.visible));
const allOutsideBattle=camera.anchors.every(a=>a.projections.find(p=>p.stage==='GAMEPLAY START')?.foot.visible===false);
const output={schema:1,subject:'poseidon-v11-guardian-sculpture',artBibleVersion:2,concept:'illustrations_created_not_author_approved',
  orthographicTechnicalSheets:'not_authored', models:results, earlyCinematicFrustumValid:allInEarlyCinema,
  absentInBattleFrustum:allOutsideBattle,officialPublished:false,
  notes:['Frustum checks are projected anchor points only; no occlusion tests.','GLB header checks are preliminary; successful decode and art approval are additional gates.']};
if(!allInEarlyCinema||!allOutsideBattle)throw Error('V10 camera proposal contradicted');
fs.mkdirSync(base,{recursive:true});
fs.writeFileSync(path.join(base,'preflight.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
