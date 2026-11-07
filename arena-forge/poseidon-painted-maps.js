// Poseidon Painterly Material Pack V1 — locally authored texture maps.
// Works with the SSTCG slim Three.js runtime (no TextureLoader in the bundle).
// Three PNGs are ORIGINAL deterministic brush studies. More refined hand-painted
// asset-specific maps can replace them without changing scene geometry.
const PACK = {
  marble: new URL('./assets/poseidon-painterly/temple-marble.png', import.meta.url).href,
  ivory: new URL('./assets/poseidon-painterly/ceremonial-ivory.png', import.meta.url).href,
  rock: new URL('./assets/poseidon-painterly/seabed-rock.png', import.meta.url).href,
};
export function attachPoseidonPaintedMaps(THREE, materials) {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return {dispose(){}, loaded:Promise.resolve(false)};
  let destroyed=false;
  const promises=[], textures=[];
  const tex={};
  for(const [kind,url] of Object.entries(PACK)){
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=8;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,8,8);
    const t=new THREE.CanvasTexture(canvas);
    t.wrapS=t.wrapT=1000; // RepeatWrapping in the slim build
    t.colorSpace='srgb';
    t.anisotropy=4;
    tex[kind]=t;textures.push(t);
    promises.push(new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{
        if(destroyed)return resolve(false);
        canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        canvas.getContext('2d').drawImage(img,0,0);
        t.needsUpdate=true;resolve(true);
      };
      img.onerror=()=>resolve(false);
      img.src=url;
    }));
  }
  const use=(mat,k)=>{
    if(!mat)return;
    mat.map=tex[k];mat.color.set(0xffffff);mat.needsUpdate=true;
  };
  for(const m of [materials.wall,materials.column,materials.capital,materials.entab,materials.pediment,materials.stairs,materials.pillar])use(m,'marble');
  for(const m of [materials.platform,materials.plinth,materials.tympanum])use(m,'ivory');
  for(const m of [materials.rock,materials.rockLite])use(m,'rock');
  return {loaded:Promise.all(promises).then(r=>r.every(Boolean)),dispose(){destroyed=true;textures.forEach(t=>t.dispose());},textures};
}
