"""End-to-end V7 Poseidon GLB loading and procedural fallback.
Usage: uv run -q --with playwright python tools/test-poseidon-v7-glb.py 8791
Requires a temporary HTTP server at that port serving project root.
"""
from playwright.sync_api import sync_playwright
import json,sys,time
port=sys.argv[1] if len(sys.argv)>1 else '8791'
URL=f'http://127.0.0.1:{port}/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&noIntro=1'
def load(browser,block):
    p=browser.new_page(viewport={'width':1600,'height':900})
    errors=[];p.on('pageerror',lambda error:errors.append(str(error)))
    if block:p.route('**/poseidon-sacred-trident.glb',lambda route:route.abort())
    p.goto(URL,wait_until='commit')
    frame=None
    for _ in range(220):
        for f in p.frames:
            try:
                if f.evaluate('!!window.__divine?.scene'):frame=f;break
            except Exception:pass
        if frame:break
        time.sleep(.1)
    assert frame,'game unavailable'
    data=frame.evaluate("""async()=>{
      const scene=window.__divine.scene,env=scene.environment;
      await env.glbV7Ready;
      const art=env.groups.landmark;
      let meshes=0,triangles=0;
      art.traverse(o=>{
        if((o.name||'').includes('POS-MON-V7-001')){meshes++;triangles=o.geometry.index.count/3;}
      });
      return {state:env.group.userData.glbV7,meshes,triangles,camera:scene.composition().camera};
    }""")
    assert not errors,errors
    p.close()
    return data
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',args=['--use-angle=metal','--enable-gpu'])
    okay=load(browser,False)
    failed=load(browser,True)
    browser.close()
assert okay['state']=='ready' and okay['meshes']==1 and okay['triangles']==1732,okay
assert failed['state']=='fallback' and failed['meshes']==0,failed
for result in (okay,failed):
    assert result['camera']['fov']==42
    assert result['camera']['position']==[0,13.5,13]
    assert result['camera']['lookAt']==[0,0,-.6]
print(json.dumps({'ok':True,'assetLoaded':okay,'missingAssetFallback':failed},ensure_ascii=False,indent=2))
