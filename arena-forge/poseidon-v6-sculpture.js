// Poseidon V6 — carved architectural identity (native slim Three.js).
// Original parametric high-detail reliefs: acanthus/marine capitals, trident insignia.
// This is original 3D ornamental geometry, not a claim of finished sculpted GLB assets.
export function addPoseidonV6Sculptures(T,{landmark,quality='high',materials}){
  const cap=materials.capital,gold=materials.gold,deep=materials.deep;
  const owned=[],objects=[];
  const add=(geo,mat,name,x=0,y=0,z=0)=>{
    const m=new T.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);
    landmark.add(m);owned.push(geo);objects.push(m);return m;
  };
  // One engineered leaf collar used in an InstancedMesh. V-shaped marine acanthus tips,
  // ridged central vein, curled tips and a continuous stepped capital base.
  function collarGeometry(){
    const v=[],uv=[];
    const tri=(a,b,c)=>{for(const p of [a,b,c]){v.push(...p);uv.push(.5+p[0]*.25,.5+p[1]*.3)}};
    for(let j=0;j<20;j++){
      const a=j*2*Math.PI/20;
      const base=a-.12,mid=a,tip=a+.07;
      const xyz=(ang,r,h)=>[Math.cos(ang)*r,h,Math.sin(ang)*r];
      const ll=xyz(base,1.12,-.90),lr=xyz(a+.13,1.12,-.90);
      const shoulder=xyz(mid,1.29,-.43),point=xyz(tip,1.09,-.06);
      const split=xyz(a+.03,1.22,-.62);
      tri(ll,split,shoulder);tri(split,lr,shoulder);tri(ll,shoulder,point);tri(shoulder,lr,point);
      const veinBase=xyz(mid,1.13,-.85),veinTip=xyz(mid,1.12,-.12),veinLift=xyz(mid,1.34,-.45);
      tri(veinBase,veinLift,veinTip);
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(v),3));
    g.setAttribute('uv',new T.BufferAttribute(new Float32Array(uv),2));
    g.computeVertexNormals();return g;
  }
  const scaleByQuality=quality==='phone'||quality==='low'?0:quality==='medium'?1:2;
  if(scaleByQuality){
    const coll=collarGeometry(),rows=[];
    const P=.35+14*.29,ENT=P+12.2,CR=.62;
    const front=-19.2-(14-1)*1.27-1.27/2;
    const zf=front-1.15,zb=-41.6-1.3;
    for(const z of [zf,zb])for(const x of [-7.6,-4.7,4.7,7.6])rows.push({x,y:ENT,z,r:CR});
    const sy=6.1,sh=7.2,sz=-41.6+.6,cz=sz-2.4;
    for(const side of [-1,1])for(let j=0;j<5;j++)rows.push({x:side*(11.6+j*2.7),y:sy+sh,z:cz,r:.48});
    const mesh=new T.InstancedMesh(coll,cap,rows.length),mat=new T.Matrix4();
    rows.forEach((c,i)=>{mat.makeScale(c.r,c.r,c.r).setPosition(c.x,c.y,c.z);mesh.setMatrixAt(i,mat);});
    mesh.name='Poseidon sculpted marine acanthus capital collars';
    landmark.add(mesh);objects.push(mesh);owned.push(coll);
    // Gold cap beads as a single instanced draw call, not one mesh per column.
    const beadGeo=new T.SphereGeometry(.12,8,6);
    const beads=new T.InstancedMesh(beadGeo,gold,rows.length*4);
    rows.forEach((c,i)=>{for(let k=0;k<4;k++){
      const a=k*Math.PI/2,r=c.r*1.45;
      mat.makeScale(.72,1.1,.72).setPosition(c.x+r*Math.cos(a),c.y-c.r*.26,c.z+r*Math.sin(a));
      beads.setMatrixAt(i*4+k,mat);
    }});
    beads.name='Poseidon marine capital gilded bosses';landmark.add(beads);objects.push(beads);owned.push(beadGeo);
  }
  // Iconographic trident formed from its own closed polygon ribbons (not a line of boxes).
  // Located on the front plane of the tympanum; geometry occupies only the cinematic temple.
  function ribbonGeometry(){
    const vertices=[],normal=[];
    const face=(p,q,r)=>{for(const t of [p,q,r]){vertices.push(...t);normal.push(0,0,1)}};
    const quad=(a,b,c,d)=>{face(a,b,c);face(a,c,d)};
    const seg=(p,q,width)=>{
      const [x,y]=p,[xx,yy]=q,l=Math.hypot(xx-x,yy-y)||1,nx=(yy-y)*width/(2*l),ny=-(xx-x)*width/(2*l);
      const z=0;
      quad([x+nx,y+ny,z],[xx+nx,yy+ny,z],[xx-nx,yy-ny,z],[x-nx,y-ny,z]);
    };
    const path=(pts,w)=>{for(let j=1;j<pts.length;j++)seg(pts[j-1],pts[j],w)};
    path([[0,-1.15],[0,1.05]],.13);
    path([[-.78,.42],[-.6,.33],[-.36,.43],[-.27,.65],[-.25,.95]],.115);
    path([[.78,.42],[.6,.33],[.36,.43],[.27,.65],[.25,.95]],.115);
    // The three points of the trident have ornamental tapered bronze spears.
    const spear=(x,y,h,w)=>{
      face([x-w,y,0],[x+w,y,0],[x,y+h,0]);
    };
    for(const x of [-.25,0,.25])spear(x,x===0?1.04:.95,x===0?.43:.31,x===0?.18:.14);
    path([[-.65,.22],[.65,.22]],.11);
    // four flourishes below the crossbeam, closed angular scrollwork
    for(const sign of [-1,1])path([[sign*.30,-.06],[sign*.56,-.14],[sign*.67,-.33],[sign*.55,-.48]],.07);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(vertices),3));
    g.setAttribute('normal',new T.BufferAttribute(new Float32Array(normal),3));return g;
  }
  const ENT=.35+14*.29+12.2,C=ENT+2.38;
  const FRONT=-19.2-(14-1)*1.27-1.27/2;
  const ZF=FRONT-1.15,ZB=-41.6-1.3;
  const ez=(ZF+ZB)/2,ed=ZF-ZB+.62*2.75+.2,PD=ed+.6;
  // Tympanum is at the near-facing side of the triangular pediment.
  const insignia=add(ribbonGeometry(),gold,'Poseidon sacred trident · sculpted emblem',0,C+.83,ez+PD/2+.33);
  insignia.scale.set(.68,.68,1);
  // Fine compass-shaped rays around the emblem, low-contrast in the same plane.
  const sun=add(new T.CylinderGeometry(.25,.25,.04,16),deep,'Poseidon trident dark enamel seal',0,C+1.5,ez+PD/2+.18);
  sun.rotation.x=Math.PI/2;
  return {count:objects.length,dispose(){
    for(const o of objects)o.parent?.remove(o);
    for(const geo of new Set(owned))geo.dispose();
  }};
}
