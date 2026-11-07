import fs from 'node:fs';
import * as THREE from '../../playtest/divine/vendor/three-0.160.0-slim.js';

const FOV = 42;
const aspect = 1656 / 950;
const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 200);
camera.position.set(0, 13.5, 13);
camera.lookAt(0, 0, -0.6);
camera.updateMatrixWorld();
camera.updateProjectionMatrix();
const project = ([x,y,z]) => {
  const p = new THREE.Vector3(x,y,z).project(camera);
  return {normalized:[+(0.5 + p.x*0.5).toFixed(5), +(0.5-p.y*0.5).toFixed(5)], pixel:[Math.round((0.5+p.x*0.5)*1656),Math.round((0.5-p.y*0.5)*950)], visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1};
};
const anchors = {
  battlefield_center:[0,0,0],
  battlefield_far_edge:[0,0,-16],
  battlefield_near_edge:[0,0,16],
  battlefield_left_edge:[-16,0,0],
  battlefield_right_edge:[16,0,0],
  temple_architectural_source_front:[0,0,-19],
  temple_architectural_source_center:[0,15,-42],
  palace_staged_front:[0,-5+0.23*0,-5+0.23*-19],
  palace_staged_portico:[0,-5+0.23*15,-5+0.23*-42],
  palace_staged_main_pillar:[0,-5+0.23*45,-5+0.23*-74],
};
const out = {
  schema:1, source:'playtest/divine/scene.js', purpose:'artboard composition reference only; no camera mutation',
  sourceArtboard:{path:'docs/art-bible/references/poseidon-master-artboard.jpg', expectedResolution:[1656,950], status:'pending_binary_installation'},
  render:{width:1656,height:950,aspect},
  camera:{type:'PerspectiveCamera',fovDegrees:FOV,near:0.1,far:200,position:[0,13.5,13],lookAt:[0,0,-0.6]},
  battlefield:{radius:16,worldPlaneY:0,locked:true},
  anchors:Object.fromEntries(Object.entries(anchors).map(([id,point])=>[id,{world:point,...project(point)}])),
  notes:['Projection is reference only. HUD masks must be captured from DOM at runtime rather than inferred from 3D positions.','Original temple at z≈-42 projects off screen. Environment transforms must be optimized for locked gameplay camera.']
};
const dest = 'docs/art-bible/poseidon-camera-manifest.json';
// Preserve V2 metadata when recalculating competitive anchor projections.
if (fs.existsSync(dest)) {
  const previous=JSON.parse(fs.readFileSync(dest,'utf8'));
  for(const field of ['artBibleVersion','cameraRoles','notes']) if(field in previous) out[field]=previous[field];
  if(previous.sourceArtboard?.status) out.sourceArtboard={...out.sourceArtboard,...previous.sourceArtboard};
}
fs.writeFileSync(dest, JSON.stringify(out,null,2)+'\n');
console.log(dest);console.log(Object.entries(out.anchors).map(([id,a])=>id+': '+a.pixel.join(',')+' visible='+a.visible).join('\n'));
