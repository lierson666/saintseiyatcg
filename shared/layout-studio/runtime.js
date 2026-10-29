import {resolveLayout,validateTemplate} from './model.js';
import {makeScene,renderScene} from './renderer.js';

let library=null,inflight=null,lastRead=0,projects={},assetRects={};
const publishedKey=value=>JSON.stringify((value?.published||[]).map(t=>[t.id,t.revision]));
const matching=(t,c,surface)=>t.scope.surface===surface&&(!t.scope.subtype||c.subtipos?.includes(t.scope.subtype))&&(t.scope.level==='global'||t.scope.value===({type:c.tipo,faction:c.faccao,rarity:c.raridade,card:c.id})[t.scope.level]);
export function layoutLibrary(){return library;}
export function visualProject(id){return projects[id]||{};}
export async function refreshCardProjects(){
  try{
    const response=await fetch(new URL('../../data/card-projects.json',import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('No published projects');
    const data=await response.json();if(data.schemaVersion!==1||!data.projects||typeof data.projects!=='object')throw Error('Invalid project manifest');
    projects=data.projects;
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('card-projects:updated'));
    return projects;
  }catch{
    // Legacy API is local-only. Static projects work on both local editor and public website.
    try{const response=await fetch(new URL('../../api/layout-studio/projects',import.meta.url),{cache:'no-store'});if(response.ok)projects=(await response.json()).projects||projects;}catch{}
    return projects;
  }
}

export function installLibrary(value,{notify=false}={}){
  if(value?.schemaVersion!==1||!Array.isArray(value.bases)||!Array.isArray(value.published)||!Array.isArray(value.drafts))throw Error('Biblioteca de layouts inválida.');
  for(const template of [...value.bases,...value.published,...value.drafts])validateTemplate(template);
  const changed=publishedKey(library)!==publishedKey(value);library=structuredClone(value);
  if(changed&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('card-layouts:published'));
  if(notify&&typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('saint-seiya-layout-studio');channel.postMessage({revision:value.revision});channel.close();}
  return library;
}
export async function refreshLayouts({force=false}={}){
  if(inflight)return inflight;if(!force&&Date.now()-lastRead<15000)return library;
  lastRead=Date.now();
  inflight=(async()=>{try{const response=await fetch(new URL('../../data/card-layouts.json',import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(4000)});if(response.ok){const next=await response.json();if(next.revision!==library?.revision)installLibrary(next);}}catch{/* Sem backend/arquivo, preservar a composição existente. */}finally{inflight=null;}return library;})();return inflight;
}
export function activeTemplates(value=library){return value?[...value.bases,...value.published]:[];}
export function draftTemplates(id,value=library){const merged=new Map(activeTemplates(value).map(t=>[t.id,t]));const draft=value?.drafts.find(t=>t.id===id);if(draft)merged.set(id,draft);return [...merged.values()];}
export function hasPublishedLayout(card,surface='card'){return Boolean(library?.published.some(t=>matching(t,card,surface)));}
export function publishedScene(card,context={},surface='card'){
  if(!hasPublishedLayout(card,surface))return null;
  const templates=activeTemplates(),layout=resolveLayout(templates,card,{surface});
  const nested=surface==='inspector'?makeScene(resolveLayout(templates,card),{card,...context},{key:`nested-${card.id}`}):null;
  return makeScene(layout,{card,...context},{key:`published-${surface}-${card.id}`,nestedCard:nested});
}
function artworkContext(card,context){const project=context.project||visualProject(card.id);return{...context,project,art:context.art&&typeof context.art==='object'?context.art:project.art||context.art,assetRects:context.assetRects||assetRects};}
export function renderPublishedCard(card,context={}){const scene=publishedScene(card,artworkContext(card,context));return scene?renderScene(scene):null;}
export function renderPublishedInspector(card,context={}){const scene=publishedScene(card,{...artworkContext(card,context),mode:'inspector'},'inspector');return scene?renderScene(scene):null;}
if(typeof window!=='undefined'){
  if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('saint-seiya-layout-studio');channel.onmessage=()=>{refreshLayouts({force:true});refreshCardProjects();};}
  window.addEventListener('focus',()=>{refreshLayouts();refreshCardProjects();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){refreshLayouts();refreshCardProjects();}});
  await Promise.all([refreshLayouts({force:true}),refreshCardProjects(),fetch(new URL('../../CARD-TEMPLATE/pieces.json',import.meta.url),{signal:AbortSignal.timeout(4000)}).then(r=>r.ok?r.json():{}).then(data=>{assetRects=data.pieces||{};}).catch(()=>{})]);
}
