"""Create a studio preview of the V8 sculptural capital in the actual slim Three.js runtime.
Usage: uv run -q --with playwright python tools/preview-poseidon-v8-asset.py 8791
"""
from playwright.sync_api import sync_playwright
import sys
port=sys.argv[1] if len(sys.argv)>1 else '8791'
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chrome',args=['--use-angle=metal','--enable-gpu'])
 page=browser.new_page(viewport={'width':1200,'height':900})
 page.goto(f'http://127.0.0.1:{port}/playtest/divine/',wait_until='commit')
 result=page.evaluate("""async()=>{
  const T=await import('/playtest/divine/vendor/three-0.160.0-slim.js');
  const {loadPoseidonSculptGLB}=await import('/arena-forge/poseidon-v7-glb-loader.js');
  const scene=new T.Scene();scene.background=new T.Color(0x132a40);
  const camera=new T.PerspectiveCamera(32,1200/900,.1,100);
  camera.position.set(1.6,0,7.3);camera.lookAt(0,0,0);
  const hemi=new T.HemisphereLight(0xc9e8fc,0x0b2840,2.1);
  const key=new T.DirectionalLight(0xffe4b8,2.0);key.position.set(-3,5,5);
  const rim=new T.DirectionalLight(0x3bd0ec,2.7);rim.position.set(4,3,-2);
  scene.add(hemi,key,rim);
  const r=await loadPoseidonSculptGLB(T,{parent:scene,url:'/arena-forge/assets/poseidon-v9/poseidon-portal-relief.glb'});
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(1200,900);renderer.setPixelRatio(1);
  renderer.outputColorSpace='srgb';
  renderer.toneMapping=T.ACESFilmicToneMapping ?? 0;
  document.body.appendChild(renderer.domElement);
  renderer.domElement.style.cssText='position:fixed;inset:0;width:1200px;height:900px;z-index:2147483647';
  renderer.render(scene,camera);
  return {triangles:r.triangles};
}""")
 page.wait_for_timeout(300)
 page.screenshot(path='docs/img/arena-cinematic/v9-relief-asset-preview.png')
 print(result)
 browser.close()
