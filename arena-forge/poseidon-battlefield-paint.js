// Painterly Poseidon battlefield surface; decorative-only overlay with no collision.
// Single 1536px authored art atlas projected with standard CircleGeometry UVs.
// The gameplay floor remains in playtest/divine/scene.js and is never moved.
export function attachPoseidonBattlefieldPainting(THREE,parent,{quality='high'}={}) {
  if(typeof document==='undefined'||typeof Image==='undefined')return {dispose(){},ready:Promise.resolve(false)};
  const size=quality==='phone'||quality==='low'?512:quality==='medium'?768:1536;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#0f3550';ctx.fillRect(0,0,size,size);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace='srgb';
  const geometry=new THREE.CircleGeometry(15.98,quality==='phone'?64:128);
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.86,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.009;mesh.name='Poseidon · Hand-painted ceremonial battlefield V5';
  parent.add(mesh);
  let disposed=false;
  const ready=new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      if(disposed)return resolve(false);
      ctx.drawImage(img,0,0,size,size);texture.needsUpdate=true;
      resolve(true);
    };
    img.onerror=()=>resolve(false);
    img.src=new URL('./assets/poseidon-painterly/ceremonial-battlefield.png',import.meta.url).href;
  });
  return {ready,dispose(){disposed=true;parent.remove(mesh);geometry.dispose();material.dispose();texture.dispose();}};
}
