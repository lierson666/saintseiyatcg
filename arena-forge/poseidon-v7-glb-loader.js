// SSTCG Arena Forge V7 — intentionally limited binary GLB 2.0 runtime bridge.
// Supports approved authoring profile: one mesh, POSITION/NORMAL/UV, indices,
// embedded PNG, PBR material. Rejects unexpected structures (no silent geometry).
// The game's slim THREE build does NOT ship GLTFLoader.
// Broader glTF features should use a maintained loader in a future pipeline revision.
export async function loadPoseidonSculptGLB(THREE,{parent,url,position=[0,0,0],scale=1,onReady=()=>{}}={}){
  if(typeof fetch!=='function'||typeof document==='undefined'||typeof Image==='undefined')return null;
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw Error('Poseidon GLB HTTP '+response.status);
  const raw=await response.arrayBuffer(),data=new DataView(raw),u8=new Uint8Array(raw);
  if(data.getUint32(0,true)!==0x46546c67 || data.getUint32(4,true)!==2 || data.getUint32(8,true)!==raw.byteLength)throw Error('Invalid glTF 2 GLB');
  let offset=12,json=null,binary=null;
  const decoder=new TextDecoder();
  while(offset<raw.byteLength){
    if(offset+8>raw.byteLength)throw Error('Truncated GLB chunk');
    const n=data.getUint32(offset,true),type=data.getUint32(offset+4,true),begin=offset+8,end=begin+n;
    if(end>raw.byteLength)throw Error('GLB chunk overrun');
    if(type===0x4e4f534a)json=JSON.parse(decoder.decode(u8.subarray(begin,end)));
    if(type===0x004e4942)binary=u8.subarray(begin,end);
    offset=end;
  }
  if(!json||!binary||json.asset?.version!=='2.0')throw Error('Missing glTF JSON or binary');
  if(json.meshes?.length!==1||json.meshes[0].primitives?.length!==1||json.nodes?.length!==1)throw Error('GLB profile unsupported');
  const primitive=json.meshes[0].primitives[0];
  if(primitive.mode!==4||primitive.attributes?.POSITION===undefined||primitive.attributes?.NORMAL===undefined||primitive.attributes?.TEXCOORD_0===undefined||primitive.indices===undefined)throw Error('GLB attributes unsupported');
  const view=idx=>{
    const v=json.bufferViews?.[idx];
    if(!v||v.buffer!==0||!Number.isInteger(v.byteOffset)||!Number.isInteger(v.byteLength)||v.byteOffset<0||v.byteLength<0||v.byteOffset+v.byteLength>binary.length)throw Error('Invalid bufferView');
    return binary.subarray(v.byteOffset,v.byteOffset+v.byteLength);
  };
  const attr=(idx,expected,components)=>{
    const a=json.accessors?.[idx];if(!a||a.type!==expected||!Number.isInteger(a.count)||a.count>100000||a.byteOffset||a.sparse)throw Error('Unsupported accessor');
    if((expected==='VEC3'||expected==='VEC2')&&a.componentType!==5126)throw Error('Unsupported vertex format');
    if(expected==='SCALAR'&&a.componentType!==5125)throw Error('Unsupported index format');
    const b=view(a.bufferView),n=a.count*components;
    const bytes=n*4;if(bytes>b.byteLength)throw Error('Accessor exceeds buffer');
    // Copy from potentially unaligned GLB chunk before creating typed view.
    const arr=b.slice(0,bytes);
    return {a,values:expected==='SCALAR'?new Uint32Array(arr.buffer):new Float32Array(arr.buffer)};
  };
  const pos=attr(primitive.attributes.POSITION,'VEC3',3),nor=attr(primitive.attributes.NORMAL,'VEC3',3),uv=attr(primitive.attributes.TEXCOORD_0,'VEC2',2),ind=attr(primitive.indices,'SCALAR',1);
  if(pos.a.count!==nor.a.count||pos.a.count!==uv.a.count||ind.values.some(i=>i>=pos.a.count))throw Error('GLB vertex/index mismatch');
  const image=json.images?.[0];
  if(image?.mimeType!=='image/png'||image.bufferView===undefined)throw Error('Only embedded PNG textures supported');
  const bytes=view(image.bufferView);
  const blobUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
  const img=new Image();
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Embedded glTF image decode failed'));img.src=blobUrl;});
  }finally{URL.revokeObjectURL(blobUrl);}
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  canvas.getContext('2d').drawImage(img,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace='srgb';texture.wrapS=texture.wrapT=1000;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(pos.values,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(nor.values,3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv.values,2));
  geometry.setIndex(new THREE.BufferAttribute(ind.values,1));
  const m=json.materials?.[primitive.material]?.pbrMetallicRoughness||{};
  const material=new THREE.MeshStandardMaterial({map:texture,color:0xffffff,metalness:m.metallicFactor??.6,roughness:m.roughnessFactor??.39,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='POS-MON-V7-001 · Sacred Trident · imported GLB';
  mesh.position.set(...position);mesh.scale.setScalar(scale);parent.add(mesh);onReady(mesh);
  return {mesh,triangles:ind.values.length/3,dispose(){parent.remove(mesh);geometry.dispose();material.dispose();texture.dispose();}};
}
