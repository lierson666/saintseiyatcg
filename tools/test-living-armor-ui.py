"""Prévia de HP/Broken em cópia HTTP; nenhum valor é gravado no catálogo real."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'card-forge/out/qa-living-armor';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,channel='chrome');page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def cards(route):
  data=route.fetch().json()
  next(c for c in data['cartas'] if c['id']=='sst-01-011')['vida']=4
  route.fulfill(json=data)
 page.route('**/data/cards.json*',cards)
 page.goto('http://127.0.0.1:8765/card-forge/?card=sst-01-011');page.wait_for_function('window.forge?.S().id==="sst-01-011"');page.select_option('#representation','live');page.locator('#previewDamage').fill('4');assert page.locator('[data-armor-state="broken"]').is_visible();assert 'ARMOR HP 0 / 4' in page.locator('[data-armor-state="broken"]').inner_text();page.screenshot(path=str(out/'broken-desktop.png'),full_page=True)
 page.locator('#previewDamage').fill('2');assert page.locator('[data-armor-state="active"]').is_visible();assert 'ARMOR HP 2 / 4' in page.locator('[data-armor-state="active"]').inner_text();page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(out/'repair-mobile.png'),full_page=True);assert errors==[],errors
 browser.close()
print(json.dumps({'ok':True,'erros_js':errors,'catalogo_real_alterado':False}))
