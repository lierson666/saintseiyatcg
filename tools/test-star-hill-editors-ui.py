"""Testa histórico, montagem de decks e responsividade sem aprovar gravações reais."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
URL='http://127.0.0.1:8765'
OUT=ROOT/'card-forge/out/qa-deck-editor'
OUT.mkdir(parents=True,exist_ok=True)
FILES=['data/cards.json','data/game-settings.json','docs/guia-do-jogo.md']
before={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in FILES}
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,channel='chrome')
 page=browser.new_page(viewport={'width':1600,'height':1000})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL+'/star-hill/#decks');page.wait_for_selector('.collection-grid')
 expect(page.locator('.deck-total')).to_have_text('60 / 60')
 page.locator('#deck-search').fill('sst-01-001')
 expect(page.locator('.collection-card')).to_have_count(1)
 page.locator('.collection-add').click()
 expect(page.locator('.deck-total')).to_have_text('61 / 60')
 expect(page.locator('.copy-pips')).to_have_attribute('aria-label','4 de 4 cópias no deck')
 page.get_by_role('button',name='↶ Desfazer',exact=True).click()
 expect(page.locator('.deck-total')).to_have_text('60 / 60')
 page.keyboard.press('Control+Shift+z');expect(page.locator('.deck-total')).to_have_text('61 / 60')
 page.locator('.collection-add').click(force=True);expect(page.locator('.deck-total')).to_have_text('61 / 60')
 expect(page.locator('#notice')).to_contain_text('4 cópias')
 page.keyboard.press('Control+z');expect(page.locator('.deck-total')).to_have_text('60 / 60')
 page.locator('.collection-card-actions [data-db=inspect]').click()
 expect(page.locator('#deck-preview')).to_be_visible()
 assert page.locator('#deck-preview .live-card__heading').inner_text().lower().startswith('pegasus seiya')
 assert page.locator('#deck-preview .live-card__rules').inner_text()
 page.keyboard.press('Escape')
 page.locator('.collection-add').click(button='right');expect(page.locator('#deck-preview')).to_be_visible();page.keyboard.press('Escape')
 # Arraste entre as áreas altera exatamente uma cópia, com um único passo no histórico.
 page.locator('.collection-card').drag_to(page.locator('.deck-panel-heading'))
 expect(page.locator('.deck-total')).to_have_text('61 / 60')
 page.locator('#undo').click();expect(page.locator('.deck-total')).to_have_text('60 / 60')
 row=page.locator('.deck-row[data-drag-card="sst-01-001"]')
 row.drag_to(page.locator('.collection-tools'));expect(page.locator('.deck-total')).to_have_text('59 / 60')
 page.locator('#undo').click();expect(page.locator('.deck-total')).to_have_text('60 / 60')
 # Importação/exportação usa os mesmos IDs e passa pela validação oficial.
 with page.expect_download() as download:
  page.locator('[data-db=export]').click()
 text=Path(download.value.path()).read_text()
 page.locator('[data-db=import]').click()
 page.locator('#deck-import-text').fill(text.replace('3 sst-01-001','9 sst-01-001'))
 page.locator('[data-db=apply-import]').click();expect(page.locator('#deck-import-error')).to_contain_text('4 cópias')
 page.locator('#deck-import-text').fill(text.replace('3 sst-01-001','2 sst-01-001').replace('3 sst-01-002','4 sst-01-002'))
 page.locator('[data-db=apply-import]').click();expect(page.locator('#deck-import')).not_to_be_visible()
 expect(page.locator('.deck-total')).to_have_text('60 / 60')
 expect(page.locator('.deck-row[data-drag-card="sst-01-001"] .deck-quantity')).to_have_text('2')
 page.locator('#undo').click();expect(page.locator('.deck-row[data-drag-card="sst-01-001"] .deck-quantity')).to_have_text('3')
 page.locator('[data-db=clear]').click()
 page.locator('#deck-filter-all').check();page.locator('[data-db-faction=Hades]').click()
 assert page.locator('.collection-card.is-illegal').count()>0
 page.locator('.collection-add').first.click(force=True);expect(page.locator('.deck-total')).to_have_text('60 / 60')
 page.locator('[data-db=clear]').click()
 page.locator('#deck-filter-type').select_option('Equipment')
 assert page.locator('.collection-card').count()>0
 assert all('EQUIP' in s for s in page.locator('.collection-card .live-card__equip').all_text_contents())
 page.locator('[data-db=clear]').click()
 page.locator('#deck-search').fill('When this Devotee survives')
 assert page.locator('.collection-card').count()>0
 page.locator('[data-db=clear]').click()
 page.screenshot(path=str(OUT/'decks-desktop.png'),full_page=True)
 page.locator('[data-db=horizontal]').click();expect(page.locator('.deck-cost-column').first).to_be_visible()
 page.screenshot(path=str(OUT/'decks-horizontal.png'),full_page=True)
 page.locator('[data-db=vertical]').click()
 # Histórico compartilhado de configuração e histórico próprio do livro de regras.
 page.locator('#deck-name').fill('Athena · rascunho de teste');page.locator('#deck-name').press('Tab')
 page.locator('#undo').click();expect(page.locator('#deck-name')).not_to_have_value('Athena · rascunho de teste')
 page.locator('#redo').click();expect(page.locator('#deck-name')).to_have_value('Athena · rascunho de teste')
 page.locator('a[href="#audio"]').click();page.wait_for_selector('[data-config="audio.volume_musica"]')
 volume=page.locator('[data-config="audio.volume_musica"]').input_value()
 page.locator('[data-config="audio.volume_musica"]').focus();page.keyboard.press('ArrowRight')
 page.locator('#undo').click();expect(page.locator('[data-config="audio.volume_musica"]')).to_have_value(volume)
 page.locator('a[href="#hud"]').click()
 def ready():
  page.wait_for_function('document.querySelector("#game-preview")?.contentWindow?.starHillPreview')
  page.wait_for_function('document.querySelector("#preview-status")?.textContent!=="Carregando…"')
 ready();page.locator('[data-layout="escala"]').fill('1.2');page.locator('[data-layout="escala"]').press('Tab')
 token=page.locator('[data-outline="vantagem"]')
 token.drag_to(token,source_position={'x':15,'y':15},target_position={'x':40,'y':35})
 assert page.locator('[data-layout="posicionado"]').is_checked()
 page.locator('#undo').click();ready();expect(page.locator('[data-layout="escala"]')).to_have_value('1.2')
 assert not page.locator('[data-layout="posicionado"]').is_checked()
 page.locator('#redo').click();ready();assert page.locator('[data-layout="posicionado"]').is_checked()
 page.locator('a[href="#telas"]').click();ready();page.select_option('#designer-component','subtitulo')
 page.locator('[data-layout="texto"]').fill('Texto temporário');page.locator('[data-layout="texto"]').press('Tab')
 page.locator('#undo').click();ready();expect(page.locator('[data-layout="texto"]')).not_to_have_value('Texto temporário')
 page.locator('a[href="#interacoes"]').click();ready();page.select_option('#interaction-event','acao:pass');ready()
 previous=page.locator('[data-interaction="animacao"]').input_value()
 page.select_option('[data-interaction="animacao"]','shake' if previous!='shake' else 'pulse')
 page.locator('#undo').click();ready();expect(page.locator('[data-interaction="animacao"]')).to_have_value(previous)
 page.locator('a[href="#regras"]').click();page.wait_for_selector('#rules-text')
 original=page.locator('#rules-text').input_value();page.locator('#rules-text').fill(original+'\nNota temporária de teste.')
 page.locator('#undo').click();expect(page.locator('#rules-text')).to_have_value(original)
 page.locator('#redo').click();expect(page.locator('#rules-text')).to_have_value(original+'\nNota temporária de teste.')
 page.locator('a[href="#decks"]').click();page.wait_for_selector('.deck-builder')
 expect(page.locator('#deck-name')).to_have_value('Athena · rascunho de teste')
 page.get_by_role('button',name='Revisar alterações',exact=True).click();expect(page.locator('#review')).to_be_visible()
 expect(page.locator('#diff')).to_contain_text('Athena · rascunho de teste')
 page.get_by_role('button',name='Voltar à edição').click()
 for width,height in [(1920,1080),(1024,768),(840,620),(390,844),(375,812)]:
  page.set_viewport_size({'width':width,'height':height})
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),width
  if width<700:
   page.locator('[data-db=deck]').click();expect(page.locator('.deck-panel')).to_be_visible()
   page.screenshot(path=str(OUT/f'deck-mobile-{width}.png'),full_page=True)
   page.locator('[data-db=collection]').click();expect(page.locator('.deck-collection')).to_be_visible()
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),width
   page.screenshot(path=str(OUT/f'collection-mobile-{width}.png'),full_page=True)
 # Card Forge embutido compartilha os botões do aplicativo e mantém seu estado próprio.
 page.set_viewport_size({'width':1600,'height':1000})
 page.locator('a[href="#cartas"]').click()
 page.wait_for_function('document.querySelector("#forge")?.contentWindow?.forge?.history')
 forge=page.locator('#forge').content_frame
 forge.locator('#cardSelect').select_option('sst-01-001',force=True)
 forge.locator('[name="custo"]').wait_for()
 page.wait_for_function('document.querySelector("#forge").contentWindow.forge.S().id==="sst-01-001"')
 old=forge.locator('[name="custo"]').input_value()
 forge.locator('[name="custo"]').fill('9');forge.locator('[name="custo"]').press('Tab')
 page.locator('#undo').click();expect(forge.locator('[name="custo"]')).to_have_value(old)
 page.locator('#redo').click();expect(forge.locator('[name="custo"]')).to_have_value('9')
 forge.locator('[name="custo"]').press('Control+z');expect(forge.locator('[name="custo"]')).to_have_value(old)
 art=page.evaluate('structuredClone(document.querySelector("#forge").contentWindow.forge.S().art)')
 assert art and art['w']>0
 forge.locator('#artZoom').fill('1.25')
 page.locator('#undo').click()
 assert page.evaluate('document.querySelector("#forge").contentWindow.forge.S().art')==art
 forge.locator('#cardSelect').select_option('sst-01-011',force=True)
 page.wait_for_function('document.querySelector("#forge").contentWindow.forge.S().id==="sst-01-011"')
 stages=page.evaluate('document.querySelector("#forge").contentWindow.forge.S().estagios.length')
 forge.locator('#addStage').click();page.locator('#undo').click()
 assert page.evaluate('document.querySelector("#forge").contentWindow.forge.S().estagios.length')==stages
 assert page.evaluate('document.querySelector("#forge").contentWindow.forge.checkCatalog().length')==0
 assert errors==[],errors
 browser.close()
for f in FILES:assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==before[f],f
print(json.dumps({'ok':True,'gravacoes_reais':0,'erros_js':errors,'capturas':str(OUT)},ensure_ascii=False))
