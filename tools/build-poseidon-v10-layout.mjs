// SSTCG V10 — verifiable monument placement against current cinematic camera keys.
// A design validation script, NOT a scene renderer or installed sculpture.
import * as THREE from '../playtest/divine/vendor/three-0.160.0-slim.js';
import fs from 'node:fs';
const keys=JSON.parse(fs.readFileSync('arena-forge/cinematics/poseidon.json','utf8')).keys;
const anchors=[
  {asset_id:'POS-MON-V10-001',name:'Guardian of Tides',world:[-10.8,4.41,-34.8],height:10},
  {asset_id:'POS-MON-V10-002',name:'Guardian of Depths',world:[10.8,4.41,-34.8],height:10},
];
function project(camera,point){
  const v=new THREE.Vector3(...point).project(camera);
  return {px:[Math.round((v.x*.5+.5)*1600),Math.round((.5-v.y*.5)*900)],ndcDepth:+v.z.toFixed(4),visible:Math.abs(v.x)<=1&&Math.abs(v.y)<=1&&v.z>=-1&&v.z<=1};
}
const result={schema:1,kind:'preproduction_camera_projection',scene:'poseidon',status:'proposed_not_author_approved',
  cinemaManifest:'arena-forge/cinematics/poseidon.json',aspect:16/9,viewport:[1600,900],
  anchors:anchors.map(a=>({
    ...a,
    projections:keys.map(k=>{
      const c=new THREE.PerspectiveCamera(k.fov,16/9,.1,250);
      c.position.set(...k.pos);c.lookAt(...k.look);c.updateMatrixWorld();c.updateProjectionMatrix();
      return {stage:k.stage,foot:project(c,a.world),top:project(c,[a.world[0],a.world[1]+a.height,a.world[2]])};
    })
  })),
  warnings:['No 3D statue GLBs installed','Projection does not test occlusion','Proposed x±10.8 require structural plinth beyond x±9.2 main temple podium','Battlefield camera must stay locked; monuments are cinematic-only']};
for(const a of anchors)if(Math.abs(a.world[0])<6.6)throw Error('Statue obstructs staircase corridor');
if(result.anchors.some(a=>!a.projections.slice(0,3).some(k=>k.foot.visible||k.top.visible)))throw Error('Statue never visible in cinema');
const out='docs/art-bible/poseidon-v10-guardian-layout.json';
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log('Wrote',out,'anchors',result.anchors.length,'cameraKeys',keys.length);
console.log('Cinema coverage:',result.anchors.map(a=>[a.name,a.projections.slice(0,3).map(p=>p.stage+':'+(p.foot.visible||p.top.visible))]));
