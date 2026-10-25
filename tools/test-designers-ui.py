"""Verifica prévias, arraste, perfis, interações e mulligan; nenhum diff é aplicado."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL='http://127.0.0.1:8765'
out=ROOT/'card-forge/out/qa-star-hill'
out.mkdir(parents=True,exist_ok=True)
files=['data/cards.json','data/game-settings.json','docs/guia-do-jogo.md']
before={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files}
errors=[];reviewed=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,channel='chrome')
 page=browser.new_page(viewport={'width':1680,'height':1100})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:reviewed.append(r.post_data_json['conteudo']) if r.url.endswith('/api/star-hill/preview') and r.method=='POST' else None)
 def ready():
  page.wait_for_function('document.querySelector("#game-preview")?.contentWindow?.starHillPreview')
  page.wait_for_function('document.querySelector("#preview-status")?.textContent!=="Carregando…"')
 def frame():return page.locator('#game-preview').content_frame
 def review():
  page.locator('[data-action="preview-config"]').click();page.locator('#review').wait_for(state='visible')
  text=page.locator('#diff').inner_text();page.get_by_role('button',name='Voltar à edição').click();return text
 page.goto(URL+'/star-hill/#hud');ready()
 assert page.locator('[data-outline]').count()==44
 page.locator('[data-layout="escala"]').fill('1.2');page.locator('[data-layout="escala"]').press('Tab')
 assert frame().locator('.advantage-token').evaluate('(el)=>getComputedStyle(el).scale')=='1.2'
 # Arraste real da seleção, conservando o contêiner de referência.
 token=page.locator('[data-outline="vantagem"]');box=token.bounding_box()
 page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
 page.mouse.down();page.mouse.move(box['x']+box['width']/2+35,box['y']+box['height']/2+25,steps=8);page.mouse.up()
 assert page.locator('[data-layout="posicionado"]').is_checked()
 assert frame().locator('.advantage-token').evaluate('(el)=>el.style.position')=='absolute'
 assert '"posicionado": true' in review()
 page.select_option('#designer-profile','mobile');ready()
 assert page.locator('[data-layout="escala"]').input_value()==''
 page.locator('[data-layout="escala"]').fill('1.1');page.locator('[data-layout="escala"]').press('Tab')
 assert frame().locator('.advantage-token').evaluate('(el)=>getComputedStyle(el).scale')=='1.1'
 page.screenshot(path=str(out/'hud-editor-mobile-preview.png'),full_page=True)
 page.select_option('#designer-profile','desktop');ready()
 assert page.locator('[data-layout="escala"]').input_value()=='1.2'
 page.locator('[data-designer="reset"]').click()
 assert frame().locator('.advantage-token').evaluate('(el)=>el.style.scale')==''
 page.locator('a[href="#telas"]').click();ready()
 page.select_option('#designer-component','subtitulo')
 page.locator('[data-layout="texto"]').fill('<b>Burn your Cosmo</b>')
 assert frame().locator('.title-subtitle').inner_text()=='<b>Burn your Cosmo</b>'
 assert frame().locator('.title-subtitle b').count()==0
 assert 'Burn your Cosmo' in review()
 page.locator('[data-designer="reset"]').click()
 assert frame().locator('.title-subtitle').inner_text()=='A battle written in the stars'
 for scene in ['title','home','setup','decks','collection','options','opening','inspector','pause','victory','help','privacy','hand','pile','emotes']:
  page.select_option('#designer-scene',scene);ready()
  assert page.locator('[data-outline="tela"]').count()==1,scene
 page.select_option('#designer-scene','opening');ready()
 assert frame().locator('.opening-card').count()==7
 page.screenshot(path=str(out/'screen-editor-opening.png'),full_page=True)
 page.locator('a[href="#interacoes"]').click();ready()
 page.select_option('#interaction-event','acao:pass')
 ready();page.select_option('[data-interaction="animacao"]','pulse')
 page.select_option('#interaction-scope','pair');ready()
 page.select_option('[data-interaction="animacao"]','shake')
 assert '"pares"' in review()
 page.select_option('#interaction-scope','global');ready()
 assert page.locator('[data-interaction="animacao"]').input_value()=='pulse'
 page.locator('[data-designer="effect"]').click()
 assert frame().locator('.arena-player--local .arena-god').evaluate('(el)=>el.getAnimations().length')>0
 # Movimento reduzido suprime o efeito de prévia.
 page.emulate_media(reduced_motion='reduce')
 page.wait_for_timeout(700);page.locator('[data-designer="effect"]').click()
 assert frame().locator('.arena-player--local .arena-god').evaluate('(el)=>el.getAnimations().length')==0
 page.emulate_media(reduced_motion='no-preference')
 page.screenshot(path=str(out/'interaction-editor.png'),full_page=True)
 runtime=reviewed[-1]
 # Nova abertura real do jogo recebe o rascunho revisado em memória, sem gravá-lo.
 page.route('**/data/game-settings.json*',lambda r:r.fulfill(json=runtime))
 page.add_init_script("localStorage.setItem('ssTcgSanctuary',JSON.stringify({autoPass:false,hotseatPrivacy:false,music:0,sfx:0}));")
 page.goto(URL+'/playtest/');page.get_by_role('button',name='Press to begin').click()
 page.get_by_role('button',name='Local battle').click();page.select_option('#setup-first','A');page.get_by_role('button',name='Begin duel').click()
 assert page.locator('.opening-card').count()==7
 page.locator('.opening-card').first.click();assert page.locator('.arena-inspector').is_visible()
 page.get_by_role('button',name='Close card',exact=True).click();assert page.locator('.opening-card').count()==7
 old=page.evaluate('sstcg.game.state.players.A.zones.hand.map(c=>c.uid)')
 page.get_by_role('button',name='Choose cards to exchange',exact=True).click()
 page.locator('.opening-card').first.click()
 assert page.locator('.opening-card.is-marked').count()==1
 page.get_by_role('button',name='Exchange 1 cards',exact=True).click()
 hand=page.evaluate('sstcg.game.state.players.A.zones.hand.map(c=>c.uid)')
 assert len(hand)==7 and old[0] not in hand
 page.set_viewport_size({'width':390,'height':844})
 assert page.locator('.opening-card').count()==7
 page.screenshot(path=str(out/'opening-hand-mobile.png'),full_page=True)
 page.get_by_role('button',name='Keep hand',exact=True).click()
 page.set_viewport_size({'width':1440,'height':1000})
 page.locator('.primary-action').click()
 page.wait_for_function('document.querySelector(".arena-combat").getAnimations().length>0')
 assert page.evaluate('sstcg.game.state.currentPlayer')=='B'
 assert not page.evaluate('sstcg.game.settings.paused')
 for width,height in [(1920,1080),(1024,768),(390,844),(375,812)]:
  page.set_viewport_size({'width':width,'height':height})
  for route in ['hud','telas','interacoes']:
   page.goto(URL+'/star-hill/#'+route);ready()
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,route)
 page.screenshot(path=str(out/'screen-editor-mobile.png'),full_page=True)
 assert errors==[],errors
 browser.close()
for f in files:assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==before[f],f
print(json.dumps({'ok':True,'telas':15,'hud':44,'erros_js':errors,'gravacoes_reais':0},ensure_ascii=False))
