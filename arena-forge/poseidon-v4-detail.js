// SSTCG — Poseidon Environment Art Pass V4 · supplemental detail layer
// Additive painterly architectural accents. Never touches camera, HUD, cards or gameplay.
export function addPoseidonV4Detail(THREE, {root, groups, materials, quality='high'}={}) {
  const {battlefield,landmark,props}=groups;
  const gold=materials.gold,stone=materials.stone,accent=materials.accent,rock=materials.rock;
  const owned=[];const objs=[];
  const add=(parent,geometry,material,x,y,z)=>{
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);owned.push(geometry);objs.push(m);return m;
  };
  // Hand-made ornamental sea-wave motif, low frequency and kept in the outer rim.
  // Mirrored double crests read as ocean waves even at the locked battle camera.
  const detailLevel=quality==='phone'||quality==='low'?0:quality==='medium'?1:2;
  const waveCount=detailLevel===0?0:detailLevel===1?24:40;
  if(waveCount){
    // Batch the whole ornamental ring into ONE BufferGeometry + ONE draw call.
    // No per-wave gizmos/meshes: a decorative border must not hurt battle FPS.
    const vertices=[],normals=[];
    const points=[[-.75,0],[-.55,.04],[-.34,.20],[-.08,.22],[.1,.1],[.11,-.06],[.02,-.17],[-.12,-.15],[-.17,-.05],[-.1,.04],[.02,.05]];
    const push=(x,z)=>{vertices.push(x,.036,z);normals.push(0,1,0);};
    const segment=(ax,az,bx,bz,w)=>{
      const l=Math.hypot(bx-ax,bz-az)||1,dx=(bx-ax)/l,dz=(bz-az)/l,nx=-dz*w/2,nz=dx*w/2;
      const p0=[ax+nx,az+nz],p1=[ax-nx,az-nz],p2=[bx+nx,bz+nz],p3=[bx-nx,bz-nz];
      for(const p of [p0,p2,p1,p1,p2,p3])push(...p);
    };
    const scale=detailLevel===1?.75:.85;
    for(let i=0;i<waveCount;i++){
      const angle=i*2*Math.PI/waveCount,c=Math.cos(angle),si=Math.sin(angle),cx=Math.sin(angle)*16.35,cz=-Math.cos(angle)*16.35;
      const turn=([x,z],mirror)=>[cx+(c*x-si*z)*scale*mirror,cz+(si*x+c*z)*scale*mirror];
      for(const mirror of [1,-.8])for(let j=1;j<points.length;j++){
        const pa=turn(points[j-1],mirror),pb=turn(points[j],mirror);
        segment(pa[0],pa[1],pb[0],pb[1],.035*scale);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices),3));
    geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(normals),3));
    const ring=add(battlefield,geo,gold,0,0,0);
    ring.name='Ocean-wave painted gold ornament · batched';
  }
  // Architectural frieze is manually readable at cinematic framing: carved intervals,
  // inset blue plaques and gold framing, no random texture repetition.
  const reliefMat=accent;
  const plaque=(x,y,z,w,h,d)=>{
    const b=add(landmark,new THREE.BoxGeometry(w,h,d),reliefMat,x,y,z);
    const top=add(landmark,new THREE.BoxGeometry(w+.12,.045,d+.08),gold,x,y+h/2,z);
    top.name='Gilded cornice line';
    return b;
  };
  // Two wings: decorative tablets below roof on both wings, placed on front facade.
  const P=.35+14*.29,sz=-41.6+.6,cz=sz-2.4,sy=5.8+.3,sh=7.2;
  const wRoofY=sy+sh+.51;
  for(const side of [-1,1]) for(let i=0;i<5;i++){
    const x=side*(11.7+i*2.7);
    plaque(x,wRoofY,cz+1.42,1.45,.42,.12);
    if(detailLevel>0){
      const m=add(landmark,new THREE.SphereGeometry(.12,9,6),gold,x,wRoofY,cz+1.51);
      m.scale.set(1.35,.57,.4);
    }
  }
  // Central entablature: uninterrupted contrasting carved band.
  const stepN=14, stepD=1.27, stairZ=-19.2;
  const front=stairZ-(stepN-1)*stepD-stepD/2;
  const ent=P+12.2,zf=front-1.15,zb=-41.6-1.3,ez=(zf+zb)/2,ed=zf-zb+.62*2.75+.2;
  const frontFace=ez+(ed-.3)/2+.07;
  add(landmark,new THREE.BoxGeometry(16.6,.45,.1),accent,0,ent+1.48,frontFace);
  for(let i=-7;i<=7;i++){
    const x=i*1.05;
    // alternation of deep incisions and low relief rosettes
    const g=new THREE.BoxGeometry(.055,.3,.12);
    add(landmark,g,gold,x,ent+1.46,frontFace+.055);
  }
  // Gold wave engraved below fronton, deliberately subtle.
  for(const side of [-1,1])for(let j=0;j<3;j++){
    const m=add(landmark,new THREE.BoxGeometry(.64,.07,.09),gold,side*(1.5+j*1.5),ent+1.42,frontFace+.12);
    m.rotation.z=side*.15;
  }
  // Shattered seam stones on far perimeter: irregular faceted shapes, never smooth spheres.
  // Seeded and outside gameplay collision radius 16.
  const fragments=detailLevel===0?6:detailLevel===1?15:28;
  const rockMat=rock;
  for(let i=0;i<fragments;i++){
    const a=(i*137.507764)*Math.PI/180;
    const r=21+(i%5)*1.6, x=Math.sin(a)*r,z=-Math.cos(a)*r;
    const verts=new THREE.SphereGeometry(.8+(i%4)*.22,7,5);
    const p=verts.attributes.position;
    for(let k=0;k<p.count;k++){
      let xx=p.getX(k),yy=p.getY(k),zz=p.getZ(k);
      const e=1+ .13*Math.sin(i*12.7+k*1.81);
      p.setXYZ(k,xx*e,yy*(.45+(i%3)*.12),zz*(.7+(i%2)*.2));
    }
    verts.computeVertexNormals();
    const m=add(props,verts,rockMat,x,-.12,z);
    m.rotation.y=i*2.4;
  }
  return {name:'POSEIDON_V4_ART_DETAILS',count:objs.length,dispose(){
    for(const m of objs) m.parent?.remove(m);
    new Set(owned).forEach(a=>a.dispose?.());
  }};
}
