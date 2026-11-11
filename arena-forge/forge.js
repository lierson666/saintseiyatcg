// Arena Forge V0.1 · isolated Three.js scene editor. No gameplay mutation.
import * as THREE from '../playtest/divine/vendor/three-0.160.0-slim.js';
import {THEMES} from '../playtest/divine/scene.js';
import {createPoseidonPalace} from './poseidon-palace.js';
const $=id=>document.getElementById(id);
const data={version:1,name:'Palácio de Poseidon — Fortaleza Submarina',faction:'poseidon',description:'Palácio canônico de mármore branco; escadaria central; salão do trono com tridente dourado; Grande Pilar Principal atrás do templo; oceano suspenso como céu líquido.',atmosphere:'submerso',fog:18,environmentPreset:'poseidon-palace-canonical-v1',objects:[]};
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.domElement.setAttribute('aria-label','Preview tridimensional da arena');
$('view').prepend(renderer.domElement);
const world=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(42,1,.1,200);
camera.position.set(0,13.5,13);camera.lookAt(new THREE.Vector3(0,0,-.6));
const light=new THREE.DirectionalLight(0xffffff,2.3);light.position.set(-8,20,10);world.add(light);
world.add(new THREE.HemisphereLight(0xaaccff,0x273045,1.25));
const env=new THREE.Scene(); // semantic root is group: only environment objects are editable
const environmentRoot=new THREE.Mesh(new THREE.BoxGeometry(.001,.001,.001),new THREE.MeshBasicMaterial({visible:false}));
environmentRoot.name='Environment Root';world.add(environmentRoot);
const props=new Map();
let palace=null;
function syncArchitecturalPreset(){
  if(palace){world.remove(palace.group);palace.dispose();palace=null}
  if(data.environmentPreset==='poseidon-palace-canonical-v1'&&data.faction==='poseidon'){palace=createPoseidonPalace(THREE);world.add(palace.group)}
}
const floorMat=new THREE.MeshStandardMaterial({color:0x28334f,metalness:.28,roughness:.7});
const floor=new THREE.Mesh(new THREE.CircleGeometry(16,96),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.04;world.add(floor);floor.name='Locked Battlefield Floor';
const boundary=new THREE.Mesh(new THREE.RingGeometry(15.87,16.02,96),new THREE.MeshBasicMaterial({color:0xceb477,side:THREE.DoubleSide}));boundary.rotation.x=-Math.PI/2;boundary.position.y=.012;world.add(boundary);
const inner=new THREE.Mesh(new THREE.RingGeometry(8.2,8.26,96),new THREE.MeshBasicMaterial({color:0xbba16c,side:THREE.DoubleSide,transparent:true,opacity:.7}));inner.rotation.x=-Math.PI/2;inner.position.y=.015;world.add(inner);
const sky=new THREE.Mesh(new THREE.SphereGeometry(87,32,20),new THREE.MeshBasicMaterial({color:0x07172c,side:THREE.BackSide,depthWrite:false}));world.add(sky);
let selected=null;
const types=['column','statue','rock','altar','obelisk','orb'];
const labels={column:'Coluna',statue:'Estátua',rock:'Rocha',altar:'Altar',obelisk:'Obelisco',orb:'Orbe'};
const palettes={poseidon:['#7499a4','#142f44','#071a32'],athena:['#e8d6b2','#6b5544','#17132a'],hades:['#534454','#22131f','#0b0515'],ares:['#99603f','#42221d','#1b080b'],artemis:['#a1a9b3','#304d45','#081b25'],olympus:['#adb2c9','#25335e','#050719']};
const material=(color,metalness=.25)=>new THREE.MeshStandardMaterial({color,roughness:.63,metalness});
function mesh(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);return m}
function makeProp(o){
 const group=new THREE.Mesh(new THREE.BoxGeometry(.01,.01,.01),new THREE.MeshBasicMaterial({visible:false}));
 const [stone]=palettes[data.faction]||palettes.olympus,mat=material(o.color||stone);
 const add=m=>group.add(m);
 switch(o.type){
 case 'column':
 add(mesh(new THREE.CylinderGeometry(.65,.78,7.2,12),mat,0,3.6,0));
 add(mesh(new THREE.CylinderGeometry(1,1,.35,12),material('#c7b78e'),0,7.35,0));
 add(mesh(new THREE.CylinderGeometry(1.05,1.05,.42,12),mat,0,.21,0));break;
 case 'statue':
 add(mesh(new THREE.BoxGeometry(1.4,1.6,1.4),mat,0,.8,0));
 add(mesh(new THREE.CylinderGeometry(.54,.7,3,7),mat,0,3.05,0));
 add(mesh(new THREE.SphereGeometry(.58,12,8),mat,0,4.9,0));break;
 case 'rock':
 add(mesh(new THREE.SphereGeometry(1.5,7,5),mat,0,.8,0));break;
 case 'altar':
 add(mesh(new THREE.CylinderGeometry(1.9,2.3,.75,8),mat,0,.38,0));
 add(mesh(new THREE.BoxGeometry(2.4,1.1,2.4),mat,0,1.35,0));break;
 case 'obelisk':
 add(mesh(new THREE.CylinderGeometry(.05,.95,7,4),mat,0,3.5,0));break;
 case 'orb':
 add(mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshBasicMaterial({color:o.color||'#9ccfff'}),0,3,0));break;
 }
 group.position.set(...o.position);group.rotation.y=o.rotationY||0;group.scale.set(...o.scale);
 group.name=o.name;environmentRoot.add(group);props.set(o.id,group);
}
function removeAll(){for(const g of props.values()){g.traverse(node=>{if(node.geometry)node.geometry.dispose();if(node.material)node.material.dispose()});environmentRoot.remove(g)}props.clear()}
function applyTheme(){
 const p=palettes[data.faction]||palettes.olympus;
 sky.material.color.set(p[2]);floorMat.color.set(p[1]);boundary.material.color.set(THEMES[data.faction]?.line||'#ccae6e');
 light.color.set(THEMES[data.faction]?.light||'#ffffff');
 world.fog=data.fog?new THREE.Fog(p[2],32,Math.max(52,170-data.fog*1.05)):null;
}
function redraw(){removeAll();data.objects.forEach(makeProp);syncArchitecturalPreset();applyTheme();renderList();updateInspector();updatePrompt()}
function renderList(){
 $('count').textContent=data.objects.length+' objetos';
 $('objects').replaceChildren();
 data.objects.forEach(o=>{
 const li=document.createElement('li'),btn=document.createElement('button');
 btn.textContent=o.name;btn.className=o.id===selected?'active':'';btn.onclick=()=>{selected=o.id;renderList();updateInspector()};li.append(btn);$('objects').append(li);
 });
}
function propInput(label,value,callback,step='.1'){
 const wrapper=document.createElement('label');wrapper.textContent=label;
 const inp=document.createElement('input');inp.type='number';inp.step=step;inp.value=String(value);
 inp.onchange=()=>{const v=Number(inp.value);if(Number.isFinite(v))callback(v)};
 wrapper.append(inp);return wrapper;
}
function updateInspector(){
 const panel=$('inspector');panel.replaceChildren();
 const o=data.objects.find(x=>x.id===selected);if(!o){panel.textContent='Selecione um objeto no Scene Outliner.';return}
 const title=document.createElement('h3');title.textContent=o.name;panel.append(title);
 const name=document.createElement('input');name.value=o.name;name.setAttribute('aria-label','Nome do objeto');name.onchange=()=>{o.name=name.value;props.get(o.id).name=o.name;renderList();updatePrompt()};panel.append(name);
 function row(title,arr,change){const lab=document.createElement('p');lab.textContent=title;panel.append(lab);const div=document.createElement('div');div.className='cols3';arr.forEach((v,i)=>div.append(propInput(['X','Y','Z'][i],v,x=>{change(i,x);updatePrompt()})));panel.append(div)}
 row('Posição',o.position,(i,v)=>{o.position[i]=v;props.get(o.id).position.set(...o.position)});
 row('Escala',o.scale,(i,v)=>{o.scale[i]=Math.max(.05,v);props.get(o.id).scale.set(...o.scale)});
 panel.append(propInput('Rotação Y (graus)',Math.round((o.rotationY||0)*180/Math.PI),v=>{o.rotationY=v*Math.PI/180;props.get(o.id).rotation.y=o.rotationY},'1'));
 const color=document.createElement('input');color.type='color';color.value=o.color||palettes[data.faction][0];color.onchange=()=>{o.color=color.value;redraw()};panel.append(color);
 const buttons=document.createElement('div');buttons.className='buttons';
 const duplicate=document.createElement('button');duplicate.textContent='Duplicar';duplicate.onclick=()=>{add(o.type,{...o,position:[o.position[0]+2,o.position[1],o.position[2]+2]})};
 const del=document.createElement('button');del.textContent='Excluir';del.onclick=()=>{data.objects=data.objects.filter(x=>x.id!==o.id);selected=null;redraw()};
 buttons.append(duplicate,del);panel.append(buttons);
}
function add(type,overrides={}){
 if(!types.includes(type))return;
 const n=data.objects.length,angle=(n*2.39996);
 const o={id:globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random()),name:labels[type]+' '+(n+1),type,position:[Math.round(Math.cos(angle)*21*10)/10,0,Math.round(Math.sin(angle)*21*10)/10],scale:[1,1,1],rotationY:0,color:palettes[data.faction][0],...overrides};
 data.objects.push(o);selected=o.id;redraw();
}
function updatePrompt(){
 const prompt=`SAINT SEIYA TCG — ARENA FORGE V0.1
Arena: ${data.name}
Faction: ${data.faction.toUpperCase()}
Environment: ${data.description}
Atmosphere: ${data.atmosphere}; intensity ${data.fog}%
Style: cinematic mythological anime 3D environment, monumental Greek architecture.
CAMERA LOCK: Three.js PerspectiveCamera FOV 42°, position (0,13.5,13), lookAt (0,0,-0.6).
BATTLEFIELD LOCK: original horizontal circular battlefield radius 16 at world origin; no geometry intersections with playable cards or HUD.
Generate environment meshes, GLB asset descriptions, architecture, material suggestions, lighting and atmospheric VFX.
Keep all objects editable and independent. Do not generate card art, UI, readable text or altered gameplay coordinates.
Canonical architectural preset: ${data.environmentPreset||'none'}.
Objects: ${data.objects.map(o=>`${o.name} [${o.type}] at ${o.position.join(',')}, scale ${o.scale.join(',')}`).join('; ')||'none'}.
Output structured editable scene manifest; request real GLB assets for complex sculptures.`;
 $('prompt').value=prompt;
}
function syncForm(){const old=data.faction;data.name=$('name').value;data.faction=$('faction').value;data.description=$('description').value;data.atmosphere=$('atmosphere').value;data.fog=Number($('fog').value);$('fogValue').textContent=data.fog+'%';if(old!==data.faction){data.environmentPreset=data.faction==='poseidon'?'poseidon-palace-canonical-v1':null;syncArchitecturalPreset()}applyTheme();updatePrompt()}
for(const id of ['name','faction','description','atmosphere','fog'])$(id).addEventListener('input',syncForm);
$('canonicalOn').onclick=()=>{data.faction='poseidon';$('faction').value='poseidon';data.environmentPreset='poseidon-palace-canonical-v1';redraw();$('status').textContent='Palácio canônico restaurado'};
$('canonicalOff').onclick=()=>{data.environmentPreset=null;redraw();$('status').textContent='Palácio ocultado'};
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));
$('generate').onclick=()=>{syncForm();if(!data.objects.length){const preset=data.faction==='artemis'?['column','rock','orb']:data.faction==='ares'?['obelisk','rock','column']:['column','statue','column'];for(const type of preset)add(type)}updatePrompt();$('status').textContent='Preset gerado no editor'};
$('copyPrompt').onclick=async()=>{try{await navigator.clipboard.writeText($('prompt').value);$('status').textContent='Prompt copiado'}catch{$('prompt').select();$('status').textContent='Selecione e copie o prompt'}};
function snapshot(){syncForm();return JSON.stringify(data,null,2)}
$('save').onclick=()=>{localStorage.setItem('sstcg-arena-forge-v1',snapshot());$('status').textContent='Projeto salvo neste navegador'};
$('load').onclick=()=>{const saved=localStorage.getItem('sstcg-arena-forge-v1');if(saved)restore(JSON.parse(saved));else $('status').textContent='Nenhum projeto salvo'};
$('export').onclick=()=>{const blob=new Blob([snapshot()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='arena-'+data.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)};
$('import').onclick=()=>$('file').click();
$('file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{restore(JSON.parse(await file.text()))}catch(err){$('status').textContent='JSON inválido: '+err.message}e.target.value=''};
function restore(incoming){
 if(!incoming||incoming.version!==1||!Array.isArray(incoming.objects)||incoming.objects.length>300)throw Error('Manifest incompatível');
 for(const o of incoming.objects){if(!types.includes(o.type)||!Array.isArray(o.position)||o.position.length!==3||!o.position.every(Number.isFinite)||!Array.isArray(o.scale)||o.scale.length!==3||!o.scale.every(v=>Number.isFinite(v)&&v>.0))throw Error('Objeto inválido')}
 data.name=String(incoming.name||'Arena').slice(0,100);data.faction=palettes[incoming.faction]?incoming.faction:'olympus';data.description=String(incoming.description||'').slice(0,5000);data.atmosphere=String(incoming.atmosphere||'mistico').slice(0,40);data.fog=Math.max(0,Math.min(100,Number(incoming.fog)||0));
 data.environmentPreset=incoming.environmentPreset==='poseidon-palace-canonical-v1'?'poseidon-palace-canonical-v1':null;
 data.objects=incoming.objects.map((o,i)=>({...o,id:String(o.id||i),name:String(o.name||labels[o.type]).slice(0,100),rotationY:Number.isFinite(o.rotationY)?o.rotationY:0,color:/^#[0-9a-fA-F]{6}$/.test(o.color)?o.color:palettes[data.faction][0]}));
 for(const field of ['name','faction','description','atmosphere','fog'])if($(field))$(field).value=data[field];
 selected=null;redraw();$('fogValue').textContent=data.fog+'%';$('status').textContent='Projeto carregado';
}
function resize(){const box=$('view').getBoundingClientRect();if(box.width<1||box.height<1)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();renderer.render(world,camera)}
new ResizeObserver(resize).observe($('view'));
function frame(t){palace?.update(t*.001);renderer.render(world,camera);requestAnimationFrame(frame)}applyTheme();
$('name').value=data.name;$('description').value=data.description;$('fog').value=data.fog;
syncArchitecturalPreset();
syncForm();resize();requestAnimationFrame(frame);
