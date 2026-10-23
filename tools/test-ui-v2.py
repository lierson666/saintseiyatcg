"""Verificação local de HUD, cosméticos e Card Forge; nunca grava o catálogo."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:8765')
args = parser.parse_args()
output = ROOT / 'card-forge/out/qa-v2'
output.mkdir(parents=True, exist_ok=True)
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='chrome')
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/api/card', lambda r: r.abort())
    page.route('**/api/cards', lambda r: r.abort())
    page.add_init_script("localStorage.setItem('ssTcgSanctuary',JSON.stringify({autoPass:false,hotseatPrivacy:false,aiSpeed:'fast'}))")
    page.goto(args.url + '/playtest/')
    page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='Press to begin').click()
    page.get_by_role('button', name='Options', exact=False).click()
    page.locator('[data-setting="tokenSkin"]').select_option('lunar')
    page.locator('[data-setting="sleeveSkin"]').select_option('ocean')
    assert page.evaluate('JSON.parse(localStorage.ssTcgSanctuary).tokenSkin') == 'lunar'
    page.get_by_role('button', name='Main menu', exact=True).click()
    page.get_by_role('button', name='Local battle').click()
    page.select_option('#setup-first', 'A')
    page.get_by_role('button', name='Begin duel').click()
    page.get_by_role('button', name='Keep hand', exact=True).click()
    page.get_by_role('button', name='Keep hand', exact=True).click()
    assert page.locator('.advantage-token--lunar').get_attribute('data-owner') == 'A'
    assert page.locator('.card-sleeve--ocean').count() == 7
    card = page.evaluate('sstcg.game.state.players.A.zones.hand.find(i=>sstcg.game.canBase("A",i.uid))')
    assert card
    page.locator(f'[data-action="select"][data-uid="{card["uid"]}"]').click()
    page.get_by_role('button', name='Cosmo Base', exact=True).click()
    assert page.evaluate('sstcg.game.actingPlayer') == 'A'
    assert page.evaluate('sstcg.game.state.players.A.zones.cosmo_base.length') == 1
    page.get_by_role('button', name='Pass opportunity').click()
    page.get_by_role('button', name='Pass opportunity').click()
    assert page.evaluate('sstcg.game.state.round') == 2
    assert page.locator('.advantage-token').get_attribute('data-owner') == 'B'
    page.get_by_role('button', name='God emotes', exact=True).click()
    page.get_by_role('button', name='Let your Cosmo burn!', exact=True).click()
    assert page.locator('.god-emote').inner_text().endswith('Let your Cosmo burn!')
    page.screenshot(path=str(output / 'arena-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.get_by_role('button', name='Pass opportunity').scroll_into_view_if_needed()
    assert page.get_by_role('button', name='Pass opportunity').is_visible()
    page.screenshot(path=str(output / 'arena-mobile.png'), full_page=True)
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.goto(args.url + '/card-forge/?card=sst-01-011')
    page.wait_for_function('typeof window.forge?.checkCatalog==="function"')
    try:
        page.wait_for_load_state('networkidle', timeout=4000)
    except TimeoutError:
        # Arquivos opcionais ausentes no Drive podem manter uma consulta pendente.
        page.wait_for_function('document.querySelector("[name=id]").value==="sst-01-011"')
    page.evaluate('document.fonts.ready')
    assert page.evaluate('forge.checkCatalog()') == []
    assert page.evaluate('forge.layoutReport().filter(c=>c.overflow||c.size<32)') == []
    page.evaluate('forge.render()')
    page.screenshot(path=str(output / 'print-equipment.png'), full_page=True)
    page.select_option('#representation', 'live')
    assert page.locator('#livePreview .live-card__equip').inner_text() == 'EQUIP\n1'
    assert page.locator('#livePreview .rule-block--owner').count() == 1
    assert page.locator('#livePreview .rule-block--evolution').count() == 1
    page.screenshot(path=str(output / 'forge-equipment.png'), full_page=True)
    page.locator('#batch').evaluate('(e)=>e.open=true')
    page.locator('#batchFile').set_input_files(ROOT / 'CARDS/TABELA/SSTCG_300_cartas_playtest.xlsx')
    page.wait_for_function('document.querySelectorAll("#batchList li").length===300')
    page.locator('#batchSave').click()
    assert 'nada muda' in page.locator('#status').inner_text()
    page.locator('#batch').evaluate('(e)=>e.open=false')
    page.select_option('#cardSelect', 'sst-01-001')
    page.wait_for_function('document.querySelector("[name=id]").value==="sst-01-001"')
    page.locator('#previewDamage').fill('1')
    assert page.locator('#livePreview [data-stat="hp"]').inner_text() == '2'
    page.locator('[name=rules]').fill('When played: Draw 2 cards.')
    page.wait_for_function('forge.buildCard().motor_revisao_pendente===true')
    page.locator('#saveCards').click()
    assert page.locator('#diffDialog').is_visible()
    assert 'motor_revisao_pendente' in page.locator('#diffBody').inner_text()
    page.locator('#diffCancel').click()
    assert errors == [], errors
    browser.close()
print(json.dumps({'ok': True, 'erros_js': errors, 'capturas': str(output)}, ensure_ascii=False))
