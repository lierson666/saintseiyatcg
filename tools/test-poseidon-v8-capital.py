"""SSTCG Poseidon V8 GLB capital instances: load, failover, camera preservation.
Usage: uv run -q --with playwright python tools/test-poseidon-v8-capital.py 8791
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import time,json,base64,sys
port=sys.argv[1] if len(sys.argv)>1 else '8791'
url=f'http://127.0.0.1:{port}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&noIntro=1'
def run(browser,block=False):
 p=browser.new_page(viewport={'width':1600,'height':900})
 errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 if block:p.route('**/poseidon-marine-capital.glb',lambda route:route.abort())
 p.goto(url,wait_until='commit')
 fr=None
 for _ in range(200):
  for frame in p.frames:
   try:
    if frame.evaluate('!!window.__divine?.scene'):fr=frame;break
   except Exception:pass
  if fr:break
  time.sleep(.1)
 assert fr,'missing frame'
 result=fr.evaluate("""async ()=>{
  const scene=window.__divine.scene,env=scene.environment;
  await env.capV8Ready;
  let count=0,instances=0,visibleFallback=0,hiddenFallback=0;
  env.groups.landmark.traverse(o=>{
    if((o.name||'').includes('POS-ARC-V8-001')){count++;instances=o.count||0;}
    if(o.name==='Poseidon sculpted marine acanthus capital collars'){if(o.visible)visibleFallback++;else hiddenFallback++;}
  });
  return {status:env.group.userData.capitalV8, count,instances,visibleFallback,hiddenFallback,camera:scene.composition().camera,stats:scene.stats()};
 }""")
 if not block:
  keys=fr.evaluate('window.__divine.scene.cinematicKeys')
  fr.evaluate('key=>window.__divine.scene.poseCinematic(key)',keys[2])
  time.sleep(.4)
  data=fr.evaluate('window.__divine.scene.snapshot(1600)')
  Path('docs/img/arena-cinematic/v8-capitals-cinematic.webp').write_bytes(base64.b64decode(data.split(',')[1]))
 assert not errors,errors
 p.close()
 return result
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chrome',args=['--use-angle=metal','--enable-gpu'])
 ok=run(browser)
 fallback=run(browser,True)
 browser.close()
assert ok['status']=='ready' and ok['count']==1 and ok['instances']==18 and ok['hiddenFallback']==1,ok
assert fallback['status']=='fallback' and fallback['count']==0 and fallback['visibleFallback']==1,fallback
for r in (ok,fallback):
 assert r['camera']['position']==[0,13.5,13]
 assert r['camera']['lookAt']==[0,0,-.6]
 assert r['camera']['fov']==42
print(json.dumps({'pass':True,'loaded':ok,'fallback':fallback},ensure_ascii=False,indent=2))
