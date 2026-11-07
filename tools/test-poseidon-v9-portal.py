"""Poseidon V9 marine portal GLB: browser smoke, instancing, fallback & cinematic capture."""
from playwright.sync_api import sync_playwright
import json,time,base64
URL='http://127.0.0.1:8791/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&noIntro=1'
def check(browser,block=False):
 p=browser.new_page(viewport={'width':1600,'height':900})
 errors=[];p.on('pageerror',lambda err:errors.append(str(err)))
 if block:p.route('**/poseidon-portal-relief.glb',lambda route:route.abort())
 p.goto(URL,wait_until='commit')
 fr=None
 for _ in range(180):
  for f in p.frames:
   try:
    if f.evaluate('!!window.__divine?.scene'):fr=f;break
   except Exception:pass
  if fr:break
  time.sleep(.10)
 assert fr,'game scene unavailable'
 obj=fr.evaluate("""async()=>{
   const sc=window.__divine.scene,env=sc.environment;
   await env.portalV9Ready;
   let count=0,instances=0;
   env.groups.landmark.traverse(o=>{if(o.name?.includes('POS-ARC-V9-001')){count++;instances=o.count;}});
   return {status:env.group.userData.portalV9,count,instances,camera:sc.composition().camera,stats:sc.stats()};
 }""")
 if not block:
  keys=fr.evaluate('window.__divine.scene.cinematicKeys')
  fr.evaluate('key=>window.__divine.scene.poseCinematic(key)',keys[2])
  time.sleep(.5)
  data=fr.evaluate('window.__divine.scene.snapshot(1600)')
  open('docs/img/arena-cinematic/v9-portal-cinematic.webp','wb').write(base64.b64decode(data.split(',')[1]))
 assert not errors,errors
 p.close()
 return obj
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',args=['--use-angle=metal','--enable-gpu'])
 yes=check(b)
 no=check(b,True)
 b.close()
assert yes['status']=='ready' and yes['count']==1 and yes['instances']==2,yes
assert no['status']=='fallback' and no['count']==0,no
for a in [yes,no]:
 assert a['camera']['fov']==42 and a['camera']['position']==[0,13.5,13] and a['camera']['lookAt']==[0,0,-.6]
print(json.dumps({'passed':True,'loaded':yes,'fallback':no},ensure_ascii=False,indent=2))
