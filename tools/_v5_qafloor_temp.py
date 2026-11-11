from playwright.sync_api import sync_playwright
import time,json
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',args=['--use-angle=metal','--enable-gpu'])
 page=b.new_page(viewport={'width':1600,'height':900})
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.goto('http://127.0.0.1:8791/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none&noIntro=1',wait_until='commit')
 f=None
 for i in range(160):
  for fr in page.frames:
   try:
    if fr.evaluate('!!window.__divine?.scene'):
     f=fr;break
   except Exception:pass
  if f:break
  time.sleep(.1)
 print('gameFrameFound',bool(f),'frames',len(page.frames))
 if f:
  time.sleep(3)
  page.screenshot(path='docs/img/arena-cinematic/v5-painted-floor-game.png')
  print('scene',json.dumps(f.evaluate('window.__divine.scene.composition()')))
  print('perf',json.dumps(f.evaluate('window.__divine.scene.stats()')))
  print('paintingMesh',f.evaluate("""(()=>{let n=0;window.__divine.scene.environment?.groups?.battlefield?.traverse(o=>{if((o.name||'').includes('Hand-painted ceremonial'))n++});return n})()"""))
 print('errors',errors[:5])
 b.close()
