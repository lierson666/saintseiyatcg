"""Cenários da mesa, inspeção, arrastar, guia e histórico; sem gravar dados."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:8765')
args = parser.parse_args()
out = ROOT / 'card-forge/out/qa-arena'
out.mkdir(parents=True, exist_ok=True)
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='chrome')
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script("Math.random=()=>.41;localStorage.setItem('ssTcgSanctuary',JSON.stringify({autoPass:false,hotseatPrivacy:false,aiSpeed:'fast'}))")
    page.goto(args.url + '/playtest/')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Press to begin').click()
    page.get_by_role('button', name='Local battle').click()
    page.select_option('#setup-first', 'A')
    page.get_by_role('button', name='Begin duel').click()
    page.get_by_role('button', name='Keep hand', exact=True).click()
    page.get_by_role('button', name='Keep hand', exact=True).click()
    assert page.locator('.arena-hand-slot').count() == 7
    assert page.locator('.arena-journal').is_visible()
    assert 'One ACTION' in page.locator('.arena-guidance').inner_text()
    hand = page.evaluate('sstcg.game.state.players.A.zones.hand')
    uid = hand[0]['uid']
    first = page.locator(f'.arena-card[data-uid="{uid}"]')
    first.focus()
    page.wait_for_selector('.arena-card-preview')
    assert page.locator('.arena-card-preview .live-card__state').count() == 0
    first.press('Enter')
    assert page.locator('.arena-inspector').is_visible()
    assert page.locator('.arena-journal').is_visible()
    assert not page.locator('#game-root').evaluate('(e)=>e.inert')
    page.get_by_role('button', name='Next card', exact=True).click()
    page.get_by_role('button', name='Close card', exact=True).click()
    hand_card = page.locator('.arena-hand-slot .arena-card').last
    revision = page.evaluate('sstcg.game.revision')
    hand_card.hover()
    hand_card.click()
    assert page.locator('.arena-inspector').is_visible()
    assert page.evaluate('sstcg.game.revision') == revision
    page.get_by_role('button', name='Close card', exact=True).click()
    base = page.evaluate('sstcg.game.state.players.A.zones.hand.find(i=>sstcg.game.canBase("A",i.uid))')
    page.get_by_role('button', name='Your hand').click()
    page.locator(f'[role=dialog] [data-action="select"][data-uid="{base["uid"]}"]').click()
    page.wait_for_timeout(200)
    assert page.locator('.arena-inspector .live-card').evaluate('(e)=>e.scrollHeight<=e.clientHeight+2')
    page.screenshot(path=str(out / 'card-open.png'), full_page=True)
    page.get_by_role('button', name='Cosmo Base', exact=True).click()
    assert page.evaluate('sstcg.game.actingPlayer') == 'A'
    playable = page.evaluate('sstcg.game.state.players.A.zones.hand.find(i=>sstcg.game.canPlay("A",i.uid))')
    assert playable
    card = page.locator(f'.arena-card[data-uid="{playable["uid"]}"]')
    card.focus()
    card.drag_to(page.locator('.arena-combat'))
    page.wait_for_function('sstcg.game.stack.length>0')
    assert 'Response' in page.locator('.arena-step-track [aria-current]').inner_text()
    assert 'priority passes' in page.locator('.arena-guidance').inner_text()
    page.get_by_role('button', name='Pass priority').click()
    page.get_by_role('button', name='Pass priority').click()
    assert page.evaluate('sstcg.game.stack.length') == 0
    expected_zone = page.evaluate('(uid)=>["Moment","Technique"].includes(sstcg.game.locate(uid).cardData.tipo)?"tartarus":"battlefield"', playable['uid'])
    assert page.evaluate('(uid)=>sstcg.game.locate(uid).zone', playable['uid']) == expected_zone
    page.evaluate('()=>{for(let i=0;i<80&&!sstcg.game.state.victory;i++)sstcg.game.stepAI();while(sstcg.game.choice)sstcg.game.stepAI()}')
    page.wait_for_timeout(220)
    log = page.locator('.arena-log')
    log.evaluate('(e)=>{e.scrollTop=0;e.focus({preventScroll:true})}')
    page.wait_for_timeout(60)
    first_entry = page.locator('.arena-log-entry').first.get_attribute('data-log-index')
    page.evaluate('()=>{for(let i=0;i<85&&!sstcg.game.state.victory;i++)sstcg.game.stepAI();while(sstcg.game.choice)sstcg.game.stepAI()}')
    page.wait_for_timeout(100)
    assert page.locator('.arena-log-entry').first.get_attribute('data-log-index') == first_entry
    assert page.locator('.arena-log').evaluate('(e)=>e.scrollTop') < 5
    page.get_by_role('button', name='Jump to latest action').click()
    assert page.locator('.arena-log').evaluate('(e)=>e.scrollHeight-e.clientHeight-e.scrollTop') < 30
    page.screenshot(path=str(out / 'desktop-playing.png'), full_page=True)
    for width, height, scale in [(1920,1080,100),(1440,900,125),(1280,800,100),(1024,768,100),(844,390,100),(768,1024,100),(390,844,100),(375,812,100),(390,740,100)]:
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate('(s)=>document.documentElement.style.setProperty("--hud-scale",s/100)',scale)
        page.wait_for_timeout(180)
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'), (width,height)
        assert page.evaluate('()=>[...document.querySelectorAll(".arena-unit")].every(e=>{const r=e.getBoundingClientRect(),f=e.closest(".arena-battlefield").getBoundingClientRect();return r.top>=f.top&&r.bottom<=f.bottom})'), (width,height,'campo cortado')
        if width > 1000:
            assert page.locator('.arena-journal').is_visible()
            assert page.locator('.arena-log').evaluate('(e)=>e.clientHeight') >= 60
        else:
            assert page.locator('.arena-journal').is_hidden()
        if width < 701:
            assert page.evaluate('()=>{const z=document.querySelector(".arena-player--local .arena-zones").getBoundingClientRect(),a=document.querySelector(".arena-action-dock").getBoundingClientRect();return z.bottom<=a.top}'), (width,height,'zonas sobrepostas')
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(100)
    page.screenshot(path=str(out / 'mobile-playing.png'), full_page=True)
    page.get_by_role('button', name='Open battle guide and log').click()
    page.wait_for_timeout(220)
    assert page.locator('.arena-table').evaluate('(e)=>e.inert')
    assert page.locator('.arena-journal').is_visible()
    revision = page.evaluate('sstcg.game.revision')
    page.locator('.arena-log').focus()
    page.keyboard.press('Space')
    assert page.evaluate('sstcg.game.revision') == revision
    page.screenshot(path=str(out / 'mobile-guide.png'), full_page=True)
    page.set_viewport_size({'width':1440,'height':1000})
    page.wait_for_timeout(180)
    assert not page.locator('.arena-table').evaluate('(e)=>e.inert')
    assert page.locator('.arena-journal').get_attribute('role') == 'complementary'
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(180)
    assert page.locator('.arena-table').evaluate('(e)=>e.inert')
    page.locator('.arena-journal').get_by_role('button', name='Close battle guide', exact=True).click()
    assert not page.locator('.arena-table').evaluate('(e)=>e.inert')
    page.get_by_role('button', name='Duel options', exact=True).click()
    page.get_by_role('button', name='Concede', exact=True).click()
    page.get_by_role('button', name='View battle history', exact=True).click()
    assert page.locator('.arena-journal').is_visible()
    assert 'Duel complete' in page.locator('.arena-guidance').inner_text()
    assert errors == [], errors
    browser.close()
print(json.dumps({'ok':True,'erros_js':errors,'capturas':str(out)},ensure_ascii=False))
