"""Regressão do seletor de keywords, sem gravar cartas ou projetos."""
import argparse
import hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://localhost:8765')
args = parser.parse_args()
protected = ['data/cards.json', 'data/card-layouts.json']
hashes = {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in protected}
out = ROOT / 'card-forge/out/qa-keywords'
out.mkdir(exist_ok=True)
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True, args=['--mute-audio'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/api/**', lambda route: route.continue_() if route.request.method == 'GET' else route.abort())
    page.goto(args.url + '/card-forge/?card=athena-v6-003')
    page.wait_for_load_state('networkidle')
    field, rules = page.locator('[name="keywords"]'), page.locator('[name="rules"]')
    expect(field).to_have_value('Guardian')
    original = rules.input_value()
    abilities = page.evaluate('JSON.stringify(forge.buildCard().habilidades_en)')
    expect(page.locator('#keywordEditor #kwSelect')).to_be_visible()
    expect(page.locator('#symbar #kwSelect')).to_have_count(0)
    rules.focus()
    page.select_option('#kwSelect', 'Pierce')
    expect(field).to_have_value('Guardian, Pierce')
    expect(rules).to_have_value(original)
    assert page.evaluate('JSON.stringify(forge.buildCard().habilidades_en)') == abilities
    page.select_option('#kwSelect', 'Pierce')
    page.select_option('#kwSelect', 'Guardian')
    expect(field).to_have_value('Guardian, Pierce')
    expect(rules).to_have_value(original)
    # Símbolos ainda vão ao cursor, mas o seletor de keyword não vai.
    rules.focus()
    page.get_by_role('button', name='Inserir Cosmo', exact=True).click()
    assert '{C}' in rules.input_value()
    rules.fill(original + '\n\n**GUARDIAN**')
    page.select_option('#representation', 'live')
    expect(page.locator('#livePreview .live-card__keywords')).to_contain_text('GUARDIAN')
    expect(page.locator('#livePreview .live-card__keywords')).to_contain_text('PIERCE')
    expect(page.locator('#livePreview .rule-block').get_by_text('GUARDIAN', exact=True)).to_have_count(0)
    expect(page.locator('#livePreview')).to_contain_text('Dragon Shield')
    assert '**GUARDIAN**' in rules.input_value()
    page.select_option('#representation', 'print')
    page.locator('#keywordEditor').scroll_into_view_if_needed()
    page.screenshot(path=str(out / 'keywords-separadas.png'))
    assert not errors, errors
    browser.close()
for file, digest in hashes.items():
    assert hashlib.sha256((ROOT / file).read_bytes()).hexdigest() == digest, file
print('OK: seleção separada, sem repetição, regras intactas, símbolos funcionais e catálogo preservado; zero erros JS.')
