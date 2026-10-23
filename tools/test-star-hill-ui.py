"""Verifica painel, prévias, diff e volume sem gravar configurações ou cartas reais."""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url',default='http://127.0.0.1:8765')
args=parser.parse_args()
out=ROOT/'card-forge/out/qa-star-hill'
out.mkdir(parents=True,exist_ok=True)
before={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in ['data/cards.json','data/game-settings.json','docs/guia-do-jogo.md']}
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='chrome')
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(args.url+'/star-hill/')
    page.wait_for_selector('.stats')
    assert page.locator('.stat').first.locator('b').inner_text()=='357'
    page.screenshot(path=str(out/'visao-desktop.png'),full_page=True)
    page.get_by_role('link',name='Música e FX',exact=True).click()
    page.wait_for_selector('#audio-table')
    library=page.request.get(args.url+'/api/star-hill/assets').json()
    fx=[x for x in library['arquivos'] if x['grupo']=='fx']
    assert len(fx)>=115
    page.select_option('#audio-group','fx')
    page.locator('#audio-table button').first.click()
    page.wait_for_function('document.querySelector("#audition").currentTime>0')
    page.locator('[data-config="audio.efeitos.click"]').select_option(fx[0]['arquivo'])
    page.get_by_role('button',name='Revisar alterações',exact=True).click()
    page.locator('#review').wait_for(state='visible')
    assert page.locator('#review').is_visible()
    assert fx[0]['arquivo'] in page.locator('#diff').inner_text()
    page.get_by_role('button',name='Voltar à edição').click()
    page.screenshot(path=str(out/'audio-desktop.png'),full_page=True)
    page.get_by_role('link',name='Decks iniciais',exact=True).click()
    page.wait_for_selector('#deck-select')
    page.locator('[data-deck-field="nome"]').fill('Athena · Teste sem gravação')
    page.locator('[data-deck-field="nome"]').press('Tab')
    page.get_by_role('button',name='Revisar alterações',exact=True).click()
    page.locator('#review').wait_for(state='visible')
    assert 'Teste sem gravação' in page.locator('#diff').inner_text()
    page.get_by_role('button',name='Voltar à edição').click()
    page.get_by_role('link',name='Livro de regras',exact=True).click()
    page.wait_for_selector('#rules-text')
    page.locator('#rules-text').fill(page.locator('#rules-text').input_value()+'\nNota de teste temporária.\n')
    page.locator('#rules-reason').fill('Teste de revisão, sem aprovar nem gravar.')
    page.get_by_role('button',name='Revisar alteração de regras').click()
    page.locator('#review').wait_for(state='visible')
    assert 'Nota de teste temporária' in page.locator('#diff').inner_text()
    page.get_by_role('button',name='Voltar à edição').click()
    page.get_by_role('link',name='Cartas · Card Forge',exact=True).click()
    page.wait_for_selector('#card-search')
    page.locator('#card-search').fill('SST-01-001')
    assert page.locator('#card-list tbody tr').count()==1
    page.get_by_role('button',name='Editar no Forge').click()
    assert 'sst-01-001' in page.locator('#forge').get_attribute('src')
    for width,height in [(1920,1080),(1024,768),(390,844),(375,812)]:
        page.set_viewport_size({'width':width,'height':height})
        for route in ['visao','audio','decks','visual','regras']:
            page.evaluate('(route)=>location.hash=route',route)
            page.wait_for_timeout(100)
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,route)
    page.evaluate('location.hash="audio"')
    page.wait_for_timeout(100)
    page.screenshot(path=str(out/'audio-mobile.png'),full_page=True)
    page.add_init_script("localStorage.setItem('ssTcgSanctuary',JSON.stringify({music:.28,sfx:.58,autoPass:false,hotseatPrivacy:false}));const OriginalAudio=window.Audio;window.Audio=function(...args){const a=new OriginalAudio(...args);(window.__qaAudio??=[]).push(a);return a;};")
    page.set_viewport_size({'width':1440,'height':1000})
    page.goto(args.url+'/playtest/')
    page.get_by_role('button',name='Press to begin').click()
    page.get_by_role('button',name='Audio controls',exact=True).click()
    panel=page.locator('#audio-panel')
    assert panel.is_visible()
    panel.get_by_role('slider',name='Music volume',exact=True).focus()
    page.keyboard.press('ArrowRight')
    assert page.evaluate('sstcg.settings.music')==.29
    panel.get_by_role('button',name='Mute music',exact=True).click()
    assert page.evaluate('sstcg.settings.music')==0
    panel.get_by_role('button',name='Restore music',exact=True).click()
    assert page.evaluate('sstcg.settings.music')==.29
    assert page.evaluate('sstcg.settings.sfx')==.58
    page.keyboard.press('Escape')
    assert not panel.is_visible()
    page.get_by_role('button',name='Local battle').click()
    page.select_option('#setup-first','A')
    page.get_by_role('button',name='Begin duel').click()
    page.get_by_role('button',name='Keep hand',exact=True).click()
    page.get_by_role('button',name='Keep hand',exact=True).click()
    revision=page.evaluate('sstcg.game.revision')
    page.get_by_role('button',name='Audio controls',exact=True).click()
    panel.get_by_role('slider',name='Music volume',exact=True).focus()
    page.keyboard.press('Home')
    assert page.evaluate('sstcg.settings.music')==0
    assert page.evaluate('sstcg.game.revision')==revision
    assert not page.evaluate('sstcg.game.settings.paused')
    panel.get_by_role('button',name='Restore music',exact=True).click()
    assert page.evaluate('sstcg.settings.music')==.29
    page.evaluate('sstcg.game.dispatch({type:"pass",playerKey:sstcg.game.actingPlayer})')
    assert panel.is_visible()
    page.screenshot(path=str(out/'volume-desktop.png'),full_page=True)
    page.keyboard.press('Escape')
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_role('button',name='Audio controls',exact=True).click()
    assert panel.is_visible()
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.screenshot(path=str(out/'volume-mobile.png'),full_page=True)
    assert errors==[],errors
    browser.close()
for file,checksum in before.items():
    assert hashlib.sha256((ROOT/file).read_bytes()).hexdigest()==checksum,file
print(json.dumps({'ok':True,'fx':len(fx),'erros_js':errors,'capturas':str(out)},ensure_ascii=False))
