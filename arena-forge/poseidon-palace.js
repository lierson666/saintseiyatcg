// Poseidon Palace — procedural architectural scene study based on supplied Saint Seiya references.
// Environment-only, located behind the protected battlefield. No gameplay/camera mutations.
// Beauty pass V1 (autor, 07/11/2026): encaixes exatos (coluna toca o entablamento), frontão triangular de verdade no eixo,
// mármore procedural com veios e cáusticas no shader, ouro antigo, luz submarina própria, oceano suspenso em camadas,
// feixes de luz leves e sombras de contato. Só usa classes do Three.js enxuto da partida (sem textura nem pós-processamento).
// PAINTERLY V1 (autor, 07/11/2026): estilo pintado à mão selecionável (shared/painterly.js); 'classic' mantém o mármore do beauty pass.
// opts: {quality: 'phone'|'low'|'medium'|'high'|'ultra', reduceMotion, style: 'painterly'|'classic', painterly: preset}. Sem opts = 'high', pintado (editor).
import {painterlyUniforms, PAINT_UNIFORMS_GLSL, PAINT_COLOR_GLSL, PAINT_OUTPUT_GLSL} from '../shared/painterly.js';
import {addPoseidonV4Detail} from './poseidon-v4-detail.js';
import {attachPoseidonPaintedMaps} from './poseidon-painted-maps.js';
import {attachPoseidonBattlefieldPainting} from './poseidon-battlefield-paint.js';
import {addPoseidonV6Sculptures} from './poseidon-v6-sculpture.js';
import {loadPoseidonSculptGLB} from './poseidon-v7-glb-loader.js';
import {GUARDIAN_DEPTHS,depthsClayFlag,depthsUrl,guardianFlag,guardianUrl, loadGuardianTides} from './poseidon-v13-guardian.js';
import * as V15 from './poseidon-v15-architecture.js';
// Abertura padrão de Poseidon (editável no Arena Forge → Produção → Cinemática; o jogo lê arena-forge/cinematics/poseidon.json).
// Cada chave: pos, look (ponto focal), fov, roll (°), dur (ms até chegar nela; na primeira, tempo parado no plano de abertura), ease, stage, light (1 = luz da partida), vfx, sound.
// A última chave é sempre a câmera competitiva (bloqueada): a cinemática termina exatamente nela.
export const COMPETITIVE_KEY = {stage: 'GAMEPLAY START', pos: [0, 13.5, 13], look: [0, 0, -.6], fov: 42, roll: 0, dur: 600, ease: 'easeOut', light: 1, vfx: null, sound: null, locked: true};
export const CINEMATIC_POSEIDON = [
  {stage: 'ESTABLISHING SHOT', pos: [36, 28, -4], look: [0, 18, -58], fov: 55, roll: 0, dur: 900, ease: 'linear', light: .55, vfx: null, sound: 'oceano'},
  {stage: 'ENVIRONMENT REVEAL', pos: [10, 17, -6], look: [0, 13, -45], fov: 50, roll: -2, dur: 2800, ease: 'easeInOut', light: 1.1, vfx: null, sound: null},
  {stage: 'CAMERA TRAVEL', pos: [0, 10, 6], look: [0, 5, -32], fov: 46, roll: 0, dur: 2200, ease: 'linear', light: 1, vfx: null, sound: null},
  {stage: 'BATTLEFIELD ARRIVAL', pos: [0, 17, 19], look: [0, 0, -3], fov: 44, roll: 0, dur: 1800, ease: 'easeInOut', light: 1, vfx: 'dust', sound: null},
  {stage: 'GOD REVEAL', pos: [0, 14.2, 14.2], look: [0, 0, -1.2], fov: 42.5, roll: 0, dur: 1100, ease: 'easeOut', light: 1, vfx: 'shockwave', sound: null},
  COMPETITIVE_KEY,
];
export function createPoseidonPalace(THREE, {quality = 'high', reduceMotion = false, style = 'painterly', painterly = 'poseidon', v15 = V15.palaceV15Flag(), art = {}} = {}) {
  const root=new THREE.Mesh(new THREE.BoxGeometry(.001,.001,.001),new THREE.MeshBasicMaterial({visible:false}));
  root.name='WorldRoot · POSEIDON — Fortaleza Submarina';
  // IMMERSIVE WORLD V1 (autor, 07/11/2026): um mundo contínuo nas coordenadas da partida (campo protegido = círculo r=16 em y=0).
  // A câmera competitiva não tenta enquadrar o templo: ela vê o campo emoldurado (BattlefieldEnvironment); o palácio aparece
  // inteiro na cinemática de abertura (CINEMATIC_POSEIDON), feita por outra câmera na mesma cena.
  const node=name=>{const g=new THREE.Mesh(new THREE.BoxGeometry(.001,.001,.001),root.material);g.name=name;root.add(g);return g;}; // o build enxuto não tem Group
  const G={distant:node('DistantEnvironment'),landmark:node('LandmarkArchitecture'),battlefield:node('BattlefieldEnvironment'),
    props:node('EnvironmentalProps'),lighting:node('LightingRig'),fx:node('AtmosphericFX')};
  let into=G.landmark; // grupo que recebe as peças criadas a seguir
  const paint=style==='painterly'?painterlyUniforms(THREE,painterly):null;

  const tier={phone:0,low:0,medium:1,high:2,ultra:3}[quality] ?? 2;
  const shared={uTime:{value:0},uCaustic:{value:[.3,.3,.55,.8][tier]}};
  const owned=[]; // materiais e geometrias criados aqui: o dispose solta tudo
  // V15 (só com ?palaceV15=1): arte de material compartilhada por todos os mármores e pelo ouro (Arena Forge → Material Studio).
  const artU=v15?V15.artUniforms(art):null;

  // ---------------- Materiais ----------------
  const NOISE=`
    float msH(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
    float msN(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(mix(msH(i),msH(i+vec3(1,0,0)),f.x),mix(msH(i+vec3(0,1,0)),msH(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(msH(i+vec3(0,0,1)),msH(i+vec3(1,0,1)),f.x),mix(msH(i+vec3(0,1,1)),msH(i+vec3(1,1,1)),f.x),f.y),f.z); }
    float msF(vec3 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*msN(p); p*=2.07; a*=.5; } return v; }
    float msCaustic(vec2 p, float t){ vec2 i=p; float c=1.;
      for(int n=0;n<3;n++){ float tt=t*(1.-(3.5/float(n+1))); i=p+vec2(cos(tt-i.x)+sin(tt+i.y), sin(tt-i.y)+cos(tt+i.x));
        c+=1./length(vec2(p.x/(sin(i.x+tt)/.005), p.y/(cos(i.y+tt)/.005))); }
      c/=3.; c=1.17-pow(c,1.4); return pow(clamp(c,0.,1.),8.); }`;
  // Mármore/pedra: veios suaves, rugosidade variável, caneluras opcionais e cáusticas que caem do oceano (mais forte no que olha para cima).
  function marble(name,color,{rough=.55,vein=.35,scale=.32,flute=0,caustic=1,metal=.02,emissive=0,emissiveIntensity=0,isGold=0}={}){
    const m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,emissive,emissiveIntensity});
    m.name=name;
    m.onBeforeCompile=sh=>{
      Object.assign(sh.uniforms,{uTime:shared.uTime,uCaustic:shared.uCaustic,uVein:{value:vein},uScale:{value:scale},uFlute:{value:flute},uCk:{value:caustic}},paint||{},artU?{...artU,uA_isGold:{value:isGold}}:{});
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP; varying vec3 vLP; varying vec3 vWN;')
        .replace('#include <begin_vertex>',`#include <begin_vertex>
          vLP=position; mat4 msM=modelMatrix;
          #ifdef USE_INSTANCING
            msM=modelMatrix*instanceMatrix;
          #endif
          vWP=(msM*vec4(transformed,1.)).xyz; vWN=normalize(mat3(msM)*objectNormal);`);
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
          varying vec3 vWP; varying vec3 vLP; varying vec3 vWN; uniform float uTime, uCaustic, uVein, uScale, uFlute, uCk;${NOISE}${paint?PAINT_UNIFORMS_GLSL:''}${artU?V15.ART_UNIFORMS_GLSL:''}`)
        .replace('#include <color_fragment>',`#include <color_fragment>
          float msn=msF(vWP*uScale);
          float msv=1.-smoothstep(0.,.2,abs(sin((vWP.x*.7+vWP.y*1.3+vWP.z*.4)*uScale*1.6+msn*4.)));
          float msc2=msF(vWP*uScale*.35+7.);
          diffuseColor.rgb*=1.-uVein*${artU?'uA_veins*':''}msv*.16-(msn-.5)*.06-(msc2-.5)*.08;
          ${artU?V15.ART_COLOR_GLSL:''}
          ${paint?PAINT_COLOR_GLSL:''}

          if(uFlute>.5){ float a=atan(vLP.z,vLP.x); diffuseColor.rgb*=.9+.1*smoothstep(-.3,.7,cos(a*20.)); }`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=clamp(roughnessFactor+(msn-.5)*.28,.08,1.);${artU?V15.ART_ROUGH_GLSL:''}`)
        .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          ${artU&&tier>0?V15.ART_NORMAL_GLSL:''}`)
        .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
          float msc=msCaustic(vWP.xz*.16+vec2(vWP.y*.05,0.), uTime*.22+23.);
          totalEmissiveRadiance+=vec3(.42,.86,1.)*msc*uCaustic*uCk*(.28+.72*max(vWN.y,0.))*(.55+.45*msn);
          ${artU?V15.ART_EMISSIVE_GLSL:''}`)
        .replace('#include <opaque_fragment>',`${paint?PAINT_OUTPUT_GLSL:''}
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey=()=>`poseidon-marble-${paint?'painterly':'classic'}${artU?'-v15-'+(tier>0?'n':'l'):''}`;
    owned.push(m);return m;
  }
  const M={
    wall:marble('Paredes',0xe3eaee,{rough:.66,vein:.3}),
    column:marble('Colunas',0xf5f4ef,{rough:.42,vein:.22,flute:v15?0:1,scale:.5}),
    capital:marble('Capitéis',0xf7f5ee,{rough:.5,vein:.15}),
    entab:marble('Entablamento',0xf2f0ea,{rough:.52,vein:.2}),
    pediment:marble('Frontão',0xf4f2ec,{rough:.55,vein:.22}),
    tympanum:marble('Tímpano',0xc9d8e2,{rough:.7,vein:.12,caustic:.5}),
    stairs:marble('Escadaria',0xeef2f3,{rough:.48,vein:.28,scale:.45}),
    platform:marble('Plataformas',0xe1e9ed,{rough:.34,vein:.32}),
    plinth:marble('Pedestais',0xc7d3da,{rough:.74,vein:.1,caustic:.7}),
    dark:marble('Recessos escuros',0x0d2034,{rough:.86,vein:0,caustic:.25}),
    pillar:marble('Grande Pilar',0xb8cbd6,{rough:.6,vein:.25,flute:1,scale:.12,caustic:.6}),
    rock:marble('Rochas submarinas',0x3d6272,{rough:.95,vein:0,scale:.6,caustic:v15?.4:.8}),
    rockLite:marble('Rochas claras',0x7c98a0,{rough:.92,vein:0,scale:.6,caustic:v15?.45:.8}),
  };
  // V5: original brush-authored PNG pigments, layered over Three.js PBR and
  // the reusable painterly shader. The slim game bundle has no TextureLoader.
  // Load only for painterly mode; classic preserves its existing material colors.
  const paintedMaps=style==='painterly'?attachPoseidonPaintedMaps(THREE,M):null;
  // V15: rocha de leito marinho escura (o mapa pintado claro lia como neve); o mapa continua, só a cor muda.
  if(v15){M.rock.color.set(0x4f6f7a);M.rockLite.color.set(0x7a959b);}

  // Ouro antigo: metal de verdade (não amarelo puro) com um calor próprio para ler sob a luz azul.
  const gold=marble('Tridente e frisos de ouro',0xd8b465,{rough:.32,metal:.62,vein:0,caustic:.35,emissive:0x5a3a0c,emissiveIntensity:.6,isGold:1});
  // Sombra de contato: mancha escura e suave sob bases, degraus e paredes (sem shadow map).
  const contactMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; mat4 m=modelMatrix;\n#ifdef USE_INSTANCING\n m=modelMatrix*instanceMatrix;\n#endif\n gl_Position=projectionMatrix*viewMatrix*m*vec4(position,1.); }',
    fragmentShader:'varying vec2 vUv; void main(){ vec2 d=abs(vUv-.5)*2.; float a=1.-smoothstep(.3,1.,max(d.x,d.y)); gl_FragColor=vec4(.01,.04,.09,a*a*.5); }'});
  owned.push(contactMat);

  // ---------------- Construção ----------------
  function part(geo,mat,x,y,z,sx=1,sy=1,sz=1){
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);into.add(m);owned.push(geo);return m;
  }
  const unitBox=new THREE.BoxGeometry(1,1,1);owned.push(unitBox);
  const box=(x,y,z,w,h,d,mat=M.wall)=>{const m=new THREE.Mesh(unitBox,mat);m.position.set(x,y,z);m.scale.set(w,h,d);into.add(m);return m;};
  // bloco pela base e pelo topo (y0, y1): evita erro de meia altura nos encaixes
  const slab=(x,y0,y1,z,w,d,mat)=>box(x,(y0+y1)/2,z,w,y1-y0,d,mat);
  const contacts=[];
  const contact=(x,y,z,w,d)=>contacts.push([x,y+.015,z,w,d]);

  // Colunas instanciadas: plinto, base, fuste com caneluras, equino e ábaco. O ábaco termina EXATAMENTE em y0+h,
  // que é a face de baixo da arquitrave: nenhuma coluna fica curta nem atravessa o entablamento.
  let colRows=[];
  const column=(x,z,y0,h,r)=>colRows.push({x,z,y0,h,r});
  function buildColumns(){
    if(!colRows.length) return;
    // V15: base ática, fuste com êntase e caneluras e equino torneados, num perfil contínuo (sem degrau entre as peças).
    const lo=tier===0,seg=lo?10:16;
    const parts=v15?[
      [new THREE.BoxGeometry(1,1,1),M.plinth,c=>[c.x,c.y0+c.r*.22,c.z,c.r*2.9,c.r*.44,c.r*2.9]],
      [V15.lathe(THREE,V15.ATTIC_BASE,seg),M.capital,c=>[c.x,c.y0+c.r*.44,c.z,c.r,c.r,c.r]],
      [V15.flutedShaft(THREE,lo?{segs:16,flutes:0,rows:[0,.5,1]}:{}),M.column,c=>{const b=c.y0+c.r*.78,t=c.y0+c.h-c.r*1.05;return [c.x,b,c.z,c.r,t-b,c.r];}],
      [V15.lathe(THREE,V15.ECHINUS,seg),M.capital,c=>[c.x,c.y0+c.h-c.r*1.05,c.z,c.r,c.r,c.r]],
      [new THREE.BoxGeometry(1,1,1),M.capital,c=>[c.x,c.y0+c.h-c.r*.31,c.z,c.r*2.75,c.r*.62,c.r*2.75]],
    ]:[
      [new THREE.BoxGeometry(1,1,1),M.plinth,c=>[c.x,c.y0+c.r*.22,c.z,c.r*2.9,c.r*.44,c.r*2.9]],
      [new THREE.CylinderGeometry(1,1.08,1,32),M.capital,c=>[c.x,c.y0+c.r*.61,c.z,c.r*1.32,c.r*.34,c.r*1.32]],
      [new THREE.CylinderGeometry(.86,1,1,32,1),M.column,c=>{const b=c.y0+c.r*.78,t=c.y0+c.h-c.r*1.05;return [c.x,(b+t)/2,c.z,c.r,t-b,c.r];}],
      [new THREE.CylinderGeometry(1.32,.88,1,32),M.capital,c=>[c.x,c.y0+c.h-c.r*.835,c.z,c.r,c.r*.43,c.r]],
      [new THREE.BoxGeometry(1,1,1),M.capital,c=>[c.x,c.y0+c.h-c.r*.31,c.z,c.r*2.75,c.r*.62,c.r*2.75]],
    ];
    const mx=new THREE.Matrix4();
    for(const [geo,mat,fn] of parts){
      const inst=new THREE.InstancedMesh(geo,mat,colRows.length);owned.push(geo);
      colRows.forEach((c,i)=>{const [x,y,z,sx,sy,sz]=fn(c);mx.makeScale(sx,sy,sz).setPosition(x,y,z);inst.setMatrixAt(i,mx);});
      inst.name=mat.name;into.add(inst);
    }
    colRows.forEach(c=>contact(c.x,c.y0,c.z,c.r*4.6,c.r*4.6));
    colRows=[];
  }

  // Níveis (unidades da cena da partida; o campo protegido é o círculo de raio 16 em y=0).
  const STEP_N=14,STEP_D=1.27,STEP_R=.29,STAIR_Z=-19.2,STAIR_W=12;
  const P=.35+STEP_N*STEP_R;                        // topo do pódio = topo do último degrau (4.41)
  const ENT=P+12.2;                                  // face de baixo da arquitrave central
  const FRONT=STAIR_Z-(STEP_N-1)*STEP_D-STEP_D/2;    // frente do pódio, encostada no último degrau
  const PZ=-41.6;                                    // centro do pódio (z)

  // Pátio de entrada e escadaria central (eixo x=0), com laterais inclinadas e pedestais na base.
  slab(0,0,.26,-26.6,34,14,M.platform);
  slab(0,0,.18,-18.3,13,3.2,M.platform); // caminho processional: do campo ao primeiro degrau
  const stepParts=[]; // V15: degraus com focinho moldurado (bocel e sombra sob a quina), numa malha só
  for(let i=0;i<STEP_N;i++){
    const z=STAIR_Z-i*STEP_D,top=.35+(i+1)*STEP_R;
    if(v15){
      const D=STEP_D+.01,f=D;
      stepParts.push([V15.sweep(THREE,[[0,f-.02],[top-.11,f-.02],[top-.085,f+.02],[top-.05,f+.06],[top-.02,f+.065],[top,f+.03]],STAIR_W,0),[0,0,z-D/2]]);
    } else {
    slab(0,0,top,z,STAIR_W,STEP_D+.01,M.stairs);
    box(0,top-.02,z+STEP_D*.47,STAIR_W+.02,.04,.07,M.plinth); // quina do degrau levemente gasta
    }
    contact(0,top,z-STEP_D*.36,STAIR_W*.98,STEP_D*.55);
  }
  if(stepParts.length) part(V15.merge(THREE,stepParts),M.stairs,0,0,0).name='V15 · Escadaria';
  const run=(STEP_N-1)*STEP_D,rise=(STEP_N-1)*STEP_R,ang=Math.atan2(rise,run),len=Math.hypot(run,rise)+1.6;
  for(const side of [-1,1]){
    const cheek=box(side*(STAIR_W/2+.6),(.64+P)/2+.55,STAIR_Z-run/2,1.2,1.5,len,M.entab);
    cheek.rotation.x=ang;
    slab(side*(STAIR_W/2+.6),0,2.1,STAIR_Z+.9,1.9,1.9,M.plinth);
    slab(side*(STAIR_W/2+.6),2.1,2.38,STAIR_Z+.9,2.2,2.2,M.entab);
    part(new THREE.SphereGeometry(.5,20,12),gold,side*(STAIR_W/2+.6),2.85,STAIR_Z+.9);
  }

  // Pódio do templo e lábio dourado.
  slab(0,0,P,PZ,18.4,2*(FRONT-PZ),M.platform);
  slab(0,P,P+.16,FRONT-.25,18.8,.5,M.entab);
  box(0,P+.17,FRONT-.25,18.8,.04,.52,gold);

  // Cela: parede do fundo, portal escuro e o trono com o tridente.
  const backZ=PZ-4.9;
  slab(0,P,ENT,backZ,16.6,1.4,M.wall);
  slab(0,P,P+10.4,backZ+.72,6.6,.12,M.dark);
  for(const side of [-1,1]) slab(side*3.45,P,P+10.4,backZ+.8,.3,.25,gold); // batentes do portal
  slab(0,P+10.4,P+10.75,backZ+.8,7.2,.25,gold);
  // V15 · Portal profundo: três molduras encaixadas que avançam da parede (a de fora mais à frente), dando embrasadura real.
  if(v15) for(let k=0;k<3;k++){
    const hw=3.62+k*.3,top=P+10.82+k*.3,zf=backZ+1.02+k*.24,z0=backZ+.7,zc=(z0+zf)/2,dd=zf-z0;
    for(const side of [-1,1]) slab(side*(hw+.15),P,top,zc,.3,dd,k===1?M.capital:M.entab);
    slab(0,top-.3,top,zc,2*hw+.6,dd,k===1?M.capital:M.entab);
  }
  slab(0,P,P+.9,backZ+2,3.4,2,M.platform); // trono
  slab(0,P+.9,P+1.15,backZ+2,3.6,2.2,gold);
  // Tridente dourado (redondo, lê como metal): haste, travessa, três dentes com pontas.
  const tridentFallbackStart=G.landmark.children.length;
  const tz=backZ+.95,ty=P+1.5;
  part(new THREE.CylinderGeometry(.15,.15,6.4,16),gold,0,ty+3.2,tz);
  part(new THREE.CylinderGeometry(.16,.16,2.8,16),gold,0,ty+6.2,tz).rotation.z=Math.PI/2;
  for(const x of [-1.25,0,1.25]){
    part(new THREE.CylinderGeometry(.13,.13,1.9,14),gold,x,ty+7.15,tz);
    part(new THREE.ConeGeometry(.3,.95,4),gold,x,ty+8.55,tz).rotation.y=Math.PI/4;
  }

  // V7 GLB replaces only the ceremonial trident in the inner shrine. If the
  // asset is unavailable, the original procedural sculpture remains visible.
  const tridentFallback=G.landmark.children.slice(tridentFallbackStart);
  let glbV7=null,v7Disposed=false;
  root.userData.glbV7='loading';
  const glbV7Ready=(typeof document!=='undefined'&&typeof fetch==='function')?
    loadPoseidonSculptGLB(THREE,{
      parent:G.landmark,
      url:new URL('./assets/poseidon-v7/poseidon-sacred-trident.glb',import.meta.url).href,
      position:[0,P+5.5,backZ+.95],scale:2,
      onReady(){if(!v7Disposed)for(const part of tridentFallback)part.visible=false;}
    }).then(v=>{if(v7Disposed){v?.dispose();return null;}glbV7=v;root.userData.glbV7=v?'ready':'unavailable';return v;})
      .catch(err=>{root.userData.glbV7='fallback';console.warn('[POSEIDON V7] GLB not loaded: retaining procedural trident',err);return null;})
    :Promise.resolve(null);

  // V13 (só desenvolvimento): Guardian of the Tides em (-10.8, 4.41, -34.8) com apoio sob o pedestal, apenas com ?sculptV13=1.
  let guardianV13=null,guardianV13Disposed=false;
  if(guardianFlag()){
    root.userData.guardianV13='loading';
    loadGuardianTides(THREE,{parent:G.landmark,material:M.platform,baseUrl:import.meta.url,url:guardianUrl()})
      .then(v=>{if(guardianV13Disposed){v.dispose();return;}guardianV13=v;root.userData.guardianV13='ready';})
      .catch(err=>{root.userData.guardianV13='unavailable';console.warn('[POSEIDON V13] guardian GLB not loaded',err);});
  }
  // Posição B (só desenvolvimento): Guardião das Profundezas, apenas com ?sculptDepthsClay=1 (argila), ?sculptDepthsV1=1 (V1) ou ?sculptDepthsV11=1 (V1.1).
  let guardianB=null,guardianBDisposed=false;
  if(depthsClayFlag()){
    root.userData.guardianB='loading';
    loadGuardianTides(THREE,{parent:G.landmark,material:M.platform,baseUrl:import.meta.url,...GUARDIAN_DEPTHS,url:depthsUrl()})
      .then(v=>{if(guardianBDisposed){v.dispose();return;}v.root.name=depthsUrl()===GUARDIAN_DEPTHS.url?'GUARDIAN_DEPTHS_CLAY_DEV':depthsUrl().includes('-v1-1/')?'GUARDIAN_DEPTHS_V11_DEV':'GUARDIAN_DEPTHS_V1_DEV';guardianB=v;root.userData.guardianB='ready';})
      .catch(err=>{root.userData.guardianB='unavailable';console.warn('[POSEIDON] guardian B not loaded',err);});
  }

  // V15 · Pedestais dos guardiões presos à arquitetura: cornija de coroamento e moldura de base nos quatro lados,
  // faixa de ouro e painel rebaixado com moldura dourada na frente. Envolve o apoio de mármore (3,8 × 4,4 m) sem mexer no GLB.
  if(v15) for(const [on,x] of [[guardianFlag(),-10.8],[depthsClayFlag(),10.8]]){
    if(!on) continue;
    const cz=-34.8-.5,W=3.8,D=4.4,BASE=[[0,.55],[.12,.5],[.18,.38],[.26,.34],[.32,.2],[.42,.12],[.5,0]].map(([y,z])=>[y,z]);
    for(const [rot,len,ox,oz] of [[0,W,0,D/2],[Math.PI,W,0,-D/2],[Math.PI/2,D,W/2,0],[-Math.PI/2,D,-W/2,0]]){
      const top=part(V15.sweep(THREE,V15.CORNICE,len+1.24),M.entab,x+ox,P-.48,cz+oz);top.rotation.y=rot;
      const bot=part(V15.sweep(THREE,BASE.map(([y,z])=>[y,z*.9]),len+.9),M.entab,x+ox,.4,cz+oz);bot.rotation.y=rot;
    }
    box(x,P-.62,cz+D/2+.03,W+.02,.12,.06,gold);
    box(x,2.35,cz+D/2+.02,2.4,2.5,.04,M.tympanum);
    for(const [w,h,dx,dy] of [[2.6,.08,0,1.27],[2.6,.08,0,-1.27],[.08,2.62,1.27,0],[.08,2.62,-1.27,0]]) box(x+dx,2.35+dy,cz+D/2+.07,w,h,.08,gold);
  }

  // Pórtico: 2 fileiras de 4 colunas, simétricas no eixo x=0 (vão central largo para a escadaria).
  const CR=.62,ZF=FRONT-1.15,ZB=PZ-1.3;
  for(const z of [ZF,ZB]) for(const x of [-7.6,-4.7,4.7,7.6]) column(x,z,P,ENT-P,CR);
  // Entablamento: arquitrave, friso com faixa de ouro, cornija. A arquitrave nasce em ENT, onde os ábacos terminam.
  const ez=(ZF+ZB)/2,ed=ZF-ZB+CR*2.75+.2;
  slab(0,ENT,ENT+1.05,ez,17.9,ed,M.entab);
  slab(0,ENT+1.05,ENT+1.95,ez,17.5,ed-.3,M.entab);
  box(0,ENT+1.5,ez+(ed-.3)/2+.01,17.52,.16,.02,gold);
  const C=ENT+2.38;
  slab(0,ENT+1.95,C,ez,18.9,ed+.6,M.entab);

  // Frontão: prisma triangular de verdade (base horizontal, duas águas iguais), centrado em x=0.
  const PW=18.9,PH=3.15,PD=ed+.6;
  function prism(w,h,d){
    const hw=w/2,hd=d/2,v=[],uv=[];
    const tri=(a,b,c)=>{for(const p of [a,b,c]){v.push(...p);uv.push(p[0]/w+.5,p[1]/h);}};
    const quad=(a,b,c,dd)=>{tri(a,b,c);tri(a,c,dd);};
    const FL=[-hw,0,hd],FR=[hw,0,hd],FT=[0,h,hd],BL=[-hw,0,-hd],BR=[hw,0,-hd],BT=[0,h,-hd];
    tri(FL,FR,FT);tri(BR,BL,BT);quad(FR,BR,BT,FT);quad(BL,FL,FT,BT);quad(BL,BR,FR,FL);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(v),3));
    g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(uv),2));
    g.computeVertexNormals();return g;
  }
  part(prism(PW,PH,PD),M.pediment,0,C,ez);
  // Tímpano recuado e cornijas inclinadas (mesmo ângulo das águas), fechando o triângulo sem fresta.
  const tw=PW-1.6,th=PH*(tw/PW);
  part(prism(tw,th,.3),M.tympanum,0,C+.28,ez+PD/2-.1);
  const rake=Math.atan2(PH,PW/2),rl=Math.hypot(PW/2,PH)+.05;
  if(!v15){
  for(const side of [-1,1]){
    const r=box(side*PW/4,C+PH/2+.12,ez+PD/2+.12,rl,.34,.5,M.entab);
    r.rotation.z=-side*rake;
  }
  box(0,C+.17,ez+PD/2+.12,PW+.3,.34,.5,M.entab);
  // Acrotérios de ouro: topo e cantos.
  part(new THREE.ConeGeometry(.42,1.1,4),gold,0,C+PH+.75,ez+PD/2-.2).rotation.y=Math.PI/4;
  for(const side of [-1,1]) part(new THREE.ConeGeometry(.32,.8,4),gold,side*(PW/2-.2),C+.75,ez+PD/2-.2).rotation.y=Math.PI/4;
  // Tridente em relevo no tímpano.
  const ry=C+.55,rz=ez+PD/2+.08;
  box(0,ry+.95,rz,.16,1.9,.08,gold);
  box(0,ry+1.2,rz,1.5,.12,.08,gold);
  for(const x of [-.7,0,.7]) box(x,ry+1.6,rz,.12,.75,.08,gold);

  } else {
    // V15 · Frontão esculpido: cornijas molduradas (geison + sima), dentículos, palmetas de ouro e relevo no tímpano
    // (tridente central de ouro e ondas que enrolam em direção aos cantos, simétricas). Mesmas medidas do frontão.
    const fz=ez+PD/2-.1;
    for(const side of [-1,1]){
      const r=part(V15.sweep(THREE,V15.CORNICE,rl+.5),M.entab,side*PW/4,C+PH/2-.12,fz);
      r.rotation.z=-side*rake;
    }
    part(V15.sweep(THREE,V15.CORNICE,PW+.6),M.entab,0,C-.02,fz);
    // dentículos sob a cornija reta (frente do friso)
    const dz=ez+(ed-.3)/2,nD=Math.floor(17.2/.36),dInst=new THREE.InstancedMesh(unitBox,M.entab,nD),dm=new THREE.Matrix4();
    for(let i=0;i<nD;i++){dm.makeScale(.19,.24,.2).setPosition(-8.6+.18+i*.36,ENT+1.82,dz+.09);dInst.setMatrixAt(i,dm);}
    dInst.name='V15 · Dentículos';into.add(dInst);
    // palmetas (acrotérios) de ouro
    const palm=[]; // anthemion de 5 lóbulos arredondados
    for(let k=0;k<=48;k++){const a=Math.PI*(.08+.84*k/48),r=.62+.38*Math.pow(Math.abs(Math.cos(5.95*(a-Math.PI/2))),1.6);palm.push([Math.cos(a)*r*.6,.25+Math.sin(a)*r*.75]);}
    const palmOutline=[[.18,0],...palm,[-.18,0]].map(([x,y])=>[x,y]);
    part(V15.extrudePoly(THREE,palmOutline,.16,.04),gold,0,C+PH+.05,fz+.12,1.5,1.5,1);
    for(const side of [-1,1]) part(V15.extrudePoly(THREE,palmOutline,.14,.035),gold,side*(PW/2-.35),C+.42,fz+.3,1,1,1);
    // tímpano: tridente
    const tz=fz+.15,tb=C+.42,T=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
    const tri=[[T(-.09,0,.09,1.55),[0,tb,tz]],[T(-.95,1.38,.95,1.52),[0,tb,tz]]];
    for(const x of [-.82,0,.82]){
      tri.push([T(-.075,1.45,.075,2.05),[x,tb,tz]]);
      tri.push([[[-.22,1.98],[.22,1.98],[0,2.42]],[x,tb,tz]]);
      tri.push([[[-.2,1.98],[-.06,1.98],[-.16,1.78]],[x,tb,tz]]);
      tri.push([[[.06,1.98],[.2,1.98],[.16,1.78]],[x,tb,tz]]);
    }
    tri.push([[[-.3,0],[.3,0],[.14,.22],[-.14,.22]],[0,tb,tz]]);
    part(V15.merge(THREE,tri.map(([o,[x,y,z]])=>[V15.extrudePoly(THREE,o,.18,.04),[x,y,z]])),gold,0,0,0);
    // ondas: três de cada lado, menores em direção aos cantos (cabem sob as águas do frontão)
    const wave=V15.waveOutline(),wl=[...wave].map(([x,y])=>[-x,y]).reverse(),waves=[];
    // fileira contínua de ondas: cada uma cabe sob a água do frontão; uma faixa de mar liga as bases
    const hAt=x=>th*(1-x/(tw/2))-.3;
    for(const side of [-1,1]){
      let x0=1.05;
      while(x0<tw/2-1.1){
        const sc=Math.max(.32,Math.min(1.45,hAt(x0+1.15)/1.08));
        waves.push([V15.extrudePoly(THREE,side>0?wave:wl,.24,.055),[side*x0,tb-.05,tz,sc*1.3,sc,1]]);
        x0+=sc*1.3*1.18;
      }
    }
    waves.push([V15.extrudePoly(THREE,[[-tw/2+.5,0],[tw/2-.5,0],[tw/2-.7,.16],[-tw/2+.7,.16]],.2,.04),[0,tb-.12,tz]]);
    part(V15.merge(THREE,waves),M.capital,0,0,0);
  }
  // Alas laterais: pódio, stoa de 5 colunas encaixadas, entablamento, pavilhão com telhado piramidal.
  for(const side of [-1,1]){
    const top=5.8,sz=PZ+.6,sy=top+.3,sh=7.2,sr=.48,cz=sz-2.4;
    slab(side*17.6,0,top,sz+1.5,16.8,12.6,M.platform);
    slab(side*17.6,top,sy,sz+1.5,17.2,13.2,M.entab);
    box(side*17.6,sy+.01,sz+1.5+6.6,17.2,.04,.04,gold);
    for(let j=0;j<5;j++) column(side*(11.6+j*2.7),cz,sy,sh,sr);
    slab(side*16.7,sy,sy+sh,cz-1.6,12.2,.6,M.wall);
    slab(side*16.7,sy+sh,sy+sh+.85,cz-.6,12.2,2.8,M.entab);
    slab(side*16.9,sy+sh+.85,sy+sh+1.2,cz-.6,12.8,3.3,M.entab);
    box(side*16.7,sy+sh+.5,cz+.81,12.22,.12,.02,gold);
    const px=side*24.4;
    slab(px,sy,sy+sh+1.2,cz-.6,3.2,3.2,M.wall);
    part(new THREE.ConeGeometry(2.5,2.3,4),M.pediment,px,sy+sh+1.2+1.15,cz-.6).rotation.y=Math.PI/4;
    part(new THREE.ConeGeometry(.22,.6,4),gold,px,sy+sh+1.2+2.6,cz-.6);
    contact(side*16.7,sy,cz,12.6,2.2);
    // Terraço baixo diante da ala, com borda.
    slab(side*18.5,0,1.1,-29,11,10,M.plinth);
    slab(side*18.5,1.1,1.3,-29,11.4,10.4,M.entab);
    contact(side*18.5,.26,-23.6,11,1.6);
  }
  contact(0,P,ZF,18,1.6);

  buildColumns(); // colunas do palácio ficam na arquitetura
  into=G.distant;
  // Leito marinho: o chão do mundo em volta do campo e do palácio (a cinemática atravessa tudo; nada de fundo 2D).
  part(new THREE.RingGeometry(15.4,200,96,1),M.rock,0,-.04,0).rotation.x=-Math.PI/2; // anel: não desenha de novo embaixo do campo
  // Reino ao fundo: Grande Pilar Principal com anéis de ouro e pilares distantes (a névoa da cena dá a profundidade).
  const pillarShaft=v15?V15.flutedShaft(THREE,{segs:tier?72:24,flutes:tier?24:0,depth:.035,top:.79}):null;
  const main=v15?part(pillarShaft,M.pillar,0,0,-74,5.3,91,5.3):part(new THREE.CylinderGeometry(4.2,5.3,91,24),M.pillar,0,45.5,-74);
  main.rotation.y=Math.PI/24;
  if(v15) part(V15.lathe(THREE,V15.ATTIC_BASE,32),M.capital,0,2.2,-74,5.4,4.2,5.4); // base ática do Grande Pilar
  for(const y of [6,22,38]){ const r=5.3-(y/91)*1.1+.06; part(new THREE.CylinderGeometry(r,r,.7,24),gold,0,y,-74); }
  slab(0,0,2.2,-74,15,15,M.plinth);
  for(const side of [-1,1]) for(let j=0;j<3;j++){
    const x=side*(36+j*13),z=-62-j*16,h=27+j*10;
    if(v15){part(pillarShaft.clone(),M.pillar,x,0,z,1.5,h,1.5);part(V15.lathe(THREE,V15.ATTIC_BASE,16),M.capital,x,1.5,z,1.55,1.2,1.55);}
    else part(new THREE.CylinderGeometry(1.1,1.5,h,16),M.pillar,x,h/2,z);
    slab(x,0,1.5,z,5,5,M.rockLite);
  }

  into=G.fx;
  // Oceano suspenso: ondas em camadas, zonas turquesa, brilhos do sol e bordas mais fundas (não inunda o palácio).
  const ceilingMat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uTime:shared.uTime,...(paint||{uBrush:{value:null},uPaintOn:{value:0}})},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float uTime;varying vec2 vUv;uniform sampler2D uBrush;uniform float uPaintOn;${NOISE}
      void main(){
        vec2 p=vUv*60.; float t=uTime*.05;
        ${v15?'p+=(vec2(msN(vec3(p*.07,t*.6)),msN(vec3(p*.07+9.,t*.6)))-.5)*5.;':''}
        float n=msF(vec3(p*.18,t*2.))*.6+msF(vec3(p*.55+vec2(t*3.,-t*2.),t))*.4;
        if(uPaintOn>.5){ // ondulação pintada: faixas de cor suaves e pinceladas no lugar do ruído contínuo
          vec3 bs=texture2D(uBrush,p*.035+vec2(t*.4,0.)).rgb-.5;
          n=mix(n,floor(n*5.+.5)/5.,.55)+bs.r*.18+bs.g*.08;
        }
        float w=sin(p.x*.45+n*4.+t*6.)*sin(p.y*.38-n*3.-t*4.);
        float c=msCaustic(p*.35,t*14.+11.);
        float glint=pow(max(0.,w),10.)*.6+c*.5;
        float r=length(vUv-vec2(.5,.62))*2.;
        vec3 deep=vec3(.008,.07,.2),mid=vec3(.02,.27,.48),tq=vec3(.12,.66,.78);
        vec3 col=mix(deep,mid,smoothstep(.15,.85,n));
        col=mix(col,tq,smoothstep(.55,.95,n)*(1.-r*.6));
        col+=vec3(.75,.95,1.)*glint*(1.-smoothstep(.2,1.,r));
        col*=1.-smoothstep(.5,1.15,r)*.75;
        gl_FragColor=vec4(col,.9);
      }`
  });
  owned.push(ceilingMat);
  const canopy=part(new THREE.PlaneGeometry(280,280,1,1),ceilingMat,0,37,-55);
  canopy.rotation.x=-Math.PI/2;
  // V15 · Oceano em profundidade: segunda camada muito mais alta, escura e lenta, que cobre o horizonte (o mar não acaba numa linha).
  if(v15){
    const deepMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,uniforms:{uTime:shared.uTime},
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform float uTime;varying vec2 vUv;${NOISE}
        void main(){ vec2 p=vUv*40.; float t=uTime*.02; float n=msN(vec3(p*.12+vec2(t,-t*.6),t))*.65+msN(vec3(p*.4-vec2(t*.5,0.),t))*.35;
          float r=length(vUv-vec2(.5,.56))*2.; // só ruído barato: em tela cheia, fBm + cáusticas custavam ~4 ms (benchmark V15)
          vec3 col=mix(vec3(.005,.04,.12),vec3(.02,.2,.36),smoothstep(.25,.8,n));
          gl_FragColor=vec4(col*(1.-smoothstep(.55,1.,r)*.6),.92); }`});
    owned.push(deepMat);
    const deep=part(new THREE.PlaneGeometry(900,900,1,1),deepMat,0,62,-80);deep.rotation.x=-Math.PI/2;deep.renderOrder=-2;canopy.renderOrder=-1;
  }


  // Feixes de luz do oceano: poucos, larguras diferentes, distribuição assimétrica, quase parados. Nenhum cruza o pórtico.
  const beamMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{uTime:shared.uTime},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float uTime; varying vec2 vUv; void main(){ float a=pow(vUv.y,1.6)*.55+pow(vUv.y,4.)*.45; a*=.55+.45*sin(vUv.x*18.85+uTime*.15); gl_FragColor=vec4(vec3(.55,.9,1.)*a*.16,1.); }'});
  owned.push(beamMat);
  const beams=[];
  const beamSet=[[-31,-58,3.4,.08],[-20,-66,2.2,.05],[19,-60,4.2,-.07],[33,-70,2.6,-.04],[-44,-48,2.9,.1],[46,-52,3.1,-.09]].slice(0,[0,3,5,6][tier]);
  for(const [x,z,r,tilt] of beamSet){
    const b=part(new THREE.CylinderGeometry(r*.55,r,36,18,1,true),beamMat,x,18,z);
    b.rotation.z=tilt;b.userData.tilt=tilt;beams.push(b);
  }

  into=G.props;
  // Rochas do primeiro plano: emolduram o tabuleiro sem tocar o círculo protegido.
  if(v15){
    // V15 · Rochas facetadas (quatro formas por ruído, instanciadas por material): mesmas posições e escalas, 66 malhas → 8 draw calls.
    const shapes=[1,2,3,4].map(k=>{const g=V15.rockGeo(THREE,k,tier?10:7,tier?8:5);owned.push(g);return g;});
    const slots=new Map(),put=(mat,k,x,y,z,sx,sy,sz,ry)=>{const key=mat.name+k;if(!slots.has(key))slots.set(key,{mat,k,m:[]});
      slots.get(key).m.push(new THREE.Matrix4().makeRotationY(ry).premultiply(new THREE.Matrix4().makeTranslation(x,y,z)).multiply(new THREE.Matrix4().makeScale(sx,sy,sz)));};
    for(const side of [-1,1]){
      for(let j=0;j<15;j++){
        const row=Math.floor(j/5),x=side*((row?26:17)+j%5*5),z=-16-row*9;
        put(j%2?M.rock:M.rockLite,j%4,x,.5,z,2.5+(j%3)*.9,1.2+(j%4)*.5,2.2,j*1.1);
      }
      for(let i=0;i<18;i++){
        const a=i*.42,x=side*(25+(i%3)*5+Math.sin(a)*4),z=12-(i%9)*9;
        put(i%3===0?M.rockLite:M.rock,(i+2)%4,x,-1.5,z,4+(i%4),2+(i%3),4+(i%5),i*.7);
      }
    }
    for(const {mat,k,m} of slots.values()){const inst=new THREE.InstancedMesh(shapes[k],mat,m.length);m.forEach((x,i)=>inst.setMatrixAt(i,x));inst.name='V15 · '+mat.name;into.add(inst);}
  } else {
  for(const side of [-1,1]){
    for(let j=0;j<15;j++){
      const row=Math.floor(j/5),x=side*((row?26:17)+j%5*5),z=-16-row*9; // fileiras de trás passam por fora dos terraços
      const b=part(new THREE.SphereGeometry(1,9,7),j%2?M.rock:M.rockLite,x,.5,z,2.5+(j%3)*.9,1.2+(j%4)*.5,2.2);
      b.rotation.y=j*1.1;
    }
    for(let i=0;i<18;i++){
      const a=i*.42;
      const x=side*(25+(i%3)*5+Math.sin(a)*4),z=12-(i%9)*9;
      part(new THREE.SphereGeometry(1,8,6),i%3===0?M.rockLite:M.rock,x,-1.5,z,4+(i%4),2+(i%3),4+(i%5));
    }
  }

  }
  into=G.battlefield;
  // Moldura do campo (BattlefieldEnvironment): o que a câmera competitiva vê em volta do círculo protegido.
  // Balaustrada no anel externo com vão no eixo da escadaria, colunata de mármore com lintéis quebrados, braseiros de ouro.
  const polar=(r,deg)=>[Math.sin(deg*Math.PI/180)*r,-Math.cos(deg*Math.PI/180)*r]; // 0° = fundo do campo (eixo do palácio)
  const posts=[],cm0=new THREE.Matrix4();
  for(let a=-118;a<=118;a+=6){ if(Math.abs(a)<14) continue; posts.push(a); }
  const postGeo=v15?V15.lathe(THREE,V15.BALUSTER,tier?8:6):new THREE.CylinderGeometry(.16,.2,1,8);owned.push(postGeo);
  const balInst=new THREE.InstancedMesh(postGeo,M.capital,posts.length);
  posts.forEach((a,i)=>{const [x,z]=polar(17.3,a);if(v15)cm0.makeScale(1,.78,1).setPosition(x,.16,z);else cm0.makeScale(1,.95,1).setPosition(x,.5,z);balInst.setMatrixAt(i,cm0);});
  balInst.name='Balaustrada';into.add(balInst);
  for(const [a0,a1] of [[-118,-14],[14,118]]) for(let a=a0;a<a1;a+=12){
    const b=Math.min(a+12,a1),[x0,z0]=polar(17.3,a),[x1,z1]=polar(17.3,b),L=Math.hypot(x1-x0,z1-z0);
    const rail=box((x0+x1)/2,1.02,(z0+z1)/2,L+.08,.16,.42,M.entab);rail.rotation.y=-Math.atan2(z1-z0,x1-x0);
    const base=box((x0+x1)/2,.08,(z0+z1)/2,L+.08,.16,.6,M.plinth);base.rotation.y=rail.rotation.y;
  }
  for(const side of [-1,1]){ const [x,z]=polar(17.3,side*14); slab(x,0,1.35,z,.9,.9,M.plinth); part(new THREE.SphereGeometry(.32,14,10),gold,x,1.62,z); }
  // Colunata: na câmera competitiva ela sobe pelas laterais da tela, recortada pela moldura; na abertura, cerca o campo.
  const ring=[38,56,74,92,110];
  for(const side of [-1,1]) ring.forEach((a,i)=>{
    const [x,z]=polar(19.4,side*a),h=i%3===2?5.2:9.4; // uma em cada três está partida
    column(x,z,0,h,.58);
    if(i%3===1){ // lintel quebrado apoiado em duas colunas vizinhas
      const [x0,z0]=polar(19.4,side*ring[i-1]),[x1,z1]=polar(19.4,side*a),L=Math.hypot(x1-x0,z1-z0);
      const l=slab((x0+x1)/2,9.4,10.3,(z0+z1)/2,L+1.6,1.5,M.entab);l.rotation.y=-Math.atan2(z1-z0,x1-x0);
    }
  });
  buildColumns();
  const flameMat=new THREE.MeshBasicMaterial({color:0x7fe9ff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});owned.push(flameMat);
  const flames=[];
  // V15: chama pintada em gota (dois planos cruzados), no lugar do cone que lia como cristal.
  const flameV15=v15?new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false,uniforms:{uTime:shared.uTime},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:V15.FLAME_FRAG}):null;
  if(flameV15) owned.push(flameV15);
  for(const a of [-47,-25,25,47]){
    const [x,z]=polar(18.4,a);
    if(v15) part(V15.lathe(THREE,V15.BRAZIER,tier?20:10),gold,x,0,z); // V15: braseiro torneado (pé, nós e taça)
    else { part(new THREE.CylinderGeometry(.12,.3,2.2,10),gold,x,1.1,z);
    part(new THREE.CylinderGeometry(.85,.35,.5,16),gold,x,2.4,z); }
    const f=v15?Object.assign(part(V15.flameGeo(THREE),flameV15,x,2.48,z,1.15,1.9,1.15),{userData:{s:[1.15,1.9]}}):part(new THREE.ConeGeometry(.55,1.5,12),flameMat,x,3.3,z);flames.push(f);
    contact(x,0,z,2,2);
  }
  // Sombras de contato numa malha só (instanciada).
  const cGeo=new THREE.PlaneGeometry(1,1);cGeo.rotateX(-Math.PI/2);owned.push(cGeo);
  const cInst=new THREE.InstancedMesh(cGeo,contactMat,contacts.length);
  const cm=new THREE.Matrix4();
  contacts.forEach(([x,y,z,w,d],i)=>{cm.makeScale(w,1,d).setPosition(x,y,z);cInst.setMatrixAt(i,cm);});
  cInst.renderOrder=1;G.fx.add(cInst);

  // V5 original painted ceremonial floor. It is a visual-only overlay;
  // underlying game floor remains where gameplay expects it.
  const battlePainting=style==='painterly'?
    attachPoseidonBattlefieldPainting(THREE,G.battlefield,{quality}):null;

  // V4 additive art pass: maritime ornament, architectural relief and faceted rock edges.
  // Materials are shared with the main world; no camera or gameplay coordinates modified.
  const detailV4=addPoseidonV4Detail(THREE,{
    root, groups:G, materials:{gold,stone:M.entab,accent:M.tympanum,rock:M.rock},quality
  });

  // V6: original sculptural ornament, independent of the cinematic and gameplay.
  const sculptureV6=addPoseidonV6Sculptures(THREE,{
    landmark:G.landmark,quality,materials:{capital:M.capital,gold,deep:M.tympanum}
  });

  // V8: one authentic authored GLB capital with painterly material, instanced
  // across the 18 column locations. No repeated GLB downloads or draw calls.
  // Safe fallback to V6 sculptural collars on any loading/validation failure.
  const v8Sources=[];
  G.landmark.traverse(o=>{if(o.name==='Poseidon sculpted marine acanthus capital collars' ||
    o.name==='Poseidon marine capital gilded bosses') v8Sources.push(o);});
  const capitalRows=[];
  const v8P=.35+14*.29,v8ENT=v8P+12.2;
  const v8Front=-19.2-(14-1)*1.27-1.27/2;
  const v8ZF=v8Front-1.15,v8ZB=-41.6-1.3;
  for(const z of [v8ZF,v8ZB])for(const x of [-7.6,-4.7,4.7,7.6])
    capitalRows.push({x,y:v8ENT,z,r:.62});
  const v8Sy=6.1,v8Sh=7.2,v8Sz=-41.6+.6,v8Cz=v8Sz-2.4;
  for(const side of [-1,1])for(let j=0;j<5;j++)
    capitalRows.push({x:side*(11.6+j*2.7),y:v8Sy+v8Sh,z:v8Cz,r:.48});
  let capV8=null,capInstances=null,capV8Disposed=false;
  const capV8Ready=(style==='painterly'&&tier>=1&&typeof document!=='undefined')?
    loadPoseidonSculptGLB(THREE,{
      parent:G.landmark,
      url:new URL('./assets/poseidon-v8/poseidon-marine-capital.glb',import.meta.url).href
    }).then(asset=>{
      if(capV8Disposed){asset?.dispose();return null;}
      if(!asset)return null;
      capV8=asset;
      const original=asset.mesh;
      const inst=new THREE.InstancedMesh(original.geometry,original.material,capitalRows.length);
      inst.name='POS-ARC-V8-001 · Painted marine capitals · 18 instances';
      const mtx=new THREE.Matrix4();
      capitalRows.forEach((row,i)=>{
        mtx.makeScale(row.r,row.r,row.r).setPosition(row.x,row.y,row.z);
        inst.setMatrixAt(i,mtx);
      });
      inst.instanceMatrix.needsUpdate=true;
      G.landmark.add(inst);capInstances=inst;original.visible=false;
      v8Sources.forEach(o=>o.visible=false);
      root.userData.capitalV8='ready';
      return asset;
    }).catch(err=>{root.userData.capitalV8='fallback';
      console.warn('[POSEIDON V8] capital GLB unavailable, retaining V6 geometry',err);return null;})
    :Promise.resolve(null);
  root.userData.capitalV8=(style==='painterly'&&tier>=1)?'loading':'disabled';

  // V9 ceremonial portal relief: two mirrored stone plaques in the shrine wall.
  // Assets belong to the real world and are visible on cinematic approaches,
  // without moving the competitive camera or entering the battlefield.
  let portalV9=null,portalInstances=null,portalV9Disposed=false;
  root.userData.portalV9='disabled';
  const portalV9Ready=(style==='painterly'&&tier>=1&&typeof document!=='undefined')?
    loadPoseidonSculptGLB(THREE,{
      parent:G.landmark,
      url:new URL('./assets/poseidon-v9/poseidon-portal-relief.glb',import.meta.url).href
    }).then(asset=>{
      if(portalV9Disposed){asset?.dispose();return null;}
      if(!asset)return null;
      portalV9=asset;
      const mesh=asset.mesh;mesh.visible=false;
      const instances=new THREE.InstancedMesh(mesh.geometry,mesh.material,2);
      const mtx=new THREE.Matrix4();
      for(let i=0;i<2;i++){
        const sign=i===0?-1:1;
        mtx.makeScale(sign*1.48,1.48,1.48);
        mtx.setPosition(sign*5.22,P+7.1,backZ+1.59);
        instances.setMatrixAt(i,mtx);
      }
      instances.instanceMatrix.needsUpdate=true;
      instances.name='POS-ARC-V9-001 · Twin marine portal reliefs · 2 instances';
      G.landmark.add(instances);portalInstances=instances;
      root.userData.portalV9='ready';
      return asset;
    }).catch(err=>{
      root.userData.portalV9='fallback';
      console.warn('[POSEIDON V9] relief GLB unavailable; original wall remains',err);
      return null;
    }) :Promise.resolve(null);
  if(style==='painterly'&&tier>=1)root.userData.portalV9='loading';

  // Luz do palácio: chave fria filtrada pelo oceano, preenchimento turquesa, contraluz nos contornos, calor discreto no ouro.
  // Ficam no grupo: entram e saem junto com o palácio (só no preview de desenvolvimento).
  const hemi=new THREE.HemisphereLight(0x8fdcff,0x08223a,.55);
  const key=new THREE.DirectionalLight(0xe2f6ff,1.05);key.position.set(-14,60,-8);
  const rim=new THREE.DirectionalLight(0x67e4ff,.9);rim.position.set(10,26,-120);
  const warm=new THREE.DirectionalLight(0xffd59a,.18);warm.position.set(0,8,30);
  const front=new THREE.DirectionalLight(0xbfe9ff,.55);front.position.set(-10,22,70); // preenchimento frontal: a fachada lê de longe
  // V15 · Luz rasante da esquerda: desenha o relevo do frontão e das caneluras na abertura (sem halo nem emissivo).
  const rakeL=new THREE.DirectionalLight(0xe8f8ff,v15?.42:0);rakeL.position.set(-46,30,18);
  G.lighting.add(hemi,key,rim,warm,front,rakeL);
  if(v15){hemi.intensity*=.82;front.intensity*=.8;} // V15: menos luz chapada, mais forma
  const base={hemi:hemi.intensity,key:key.intensity,rim:rim.intensity,warm:warm.intensity,front:front.intensity,rake:rakeL.intensity};
  root.userData={...root.userData,preset:'poseidon-palace-canonical-v1',beauty:'v7-glb-pipeline',source:'Saint Seiya reference study',protectedGameplay:false,quality,detailObjects:detailV4.count,sculptureObjects:sculptureV6.count};
  root.userData.palaceV15=v15?'on':'off';
  return {group:root,paint,glbV7Ready,capV8Ready,portalV9Ready,v15,
    // V15: arte de material (uniformes compartilhados); null sem ?palaceV15=1.
    art:artU,setArt(p){if(artU)V15.applyArt(artU,p);},readArt(){return artU?V15.readArt(artU):null;},
    groups:G,
    // Transição de luz da cinemática: multiplica a iluminação do mundo (1 = luz da partida).
    setLight(k){ hemi.intensity=base.hemi*k; key.intensity=base.key*k; rim.intensity=base.rim*k; warm.intensity=base.warm*k; front.intensity=base.front*k; rakeL.intensity=base.rake*k; },
    update(t){ if(reduceMotion) return; shared.uTime.value=t; beams.forEach((b,i)=>{b.rotation.z=b.userData.tilt+Math.sin(t*.07+i*1.7)*.012;});
      flames.forEach((f,i)=>{const k=1+Math.sin(t*5+i*2.1)*.08+Math.sin(t*11.3+i)*.04;const u=f.userData.s||[1,1];f.scale.set(u[0],k*u[1],u[0]);}); },
    dispose(){ guardianV13Disposed=true;guardianV13?.dispose(); guardianBDisposed=true;guardianB?.dispose(); portalV9Disposed=true;if(portalInstances)G.landmark.remove(portalInstances);portalV9?.dispose();capV8Disposed=true;if(capInstances)G.landmark.remove(capInstances);capV8?.dispose();v7Disposed=true;glbV7?.dispose();paintedMaps?.dispose();battlePainting?.dispose();root.traverse(n=>{ if(n.isMesh && n.geometry!==unitBox) n.geometry.dispose(); }); new Set(owned).forEach(o=>o.dispose()); root.material.dispose(); }};
}
