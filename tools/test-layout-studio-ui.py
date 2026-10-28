"""Aceitação do Layout Studio em servidor isolado, com publicação só na cópia de QA."""
import hashlib
import importlib.util
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'card-forge/out/qa-layout-studio'
OUT.mkdir(exist_ok=True)
spec = importlib.util.spec_from_file_location('studio_qa', ROOT / 'tools/serve-layout-studio-qa.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
server = qa.make_server()
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://localhost:{server.server_port}'
protected = ['data/cards.json', 'data/game-settings.json', 'docs/guia-do-jogo.md', 'playtest/engine-v2.js', 'data/card-layouts.json']
hashes = {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in protected}
errors, evidence = [], []


def prop(page, key):
    return page.locator('#propertyControls [data-prop=\'' + json.dumps(key if isinstance(key, list) else [key], separators=(',', ':')) + '\']')


def layer(page, key):
    return page.locator(f'#sceneRoot > svg > [data-layer="{key}"]')


def select(page, key):
    page.locator(f'[data-select-layer="{key}"]').click()


def save(page):
    page.locator('#saveDraft').click()
    expect(page.locator('#studioStatus')).to_contain_text('Rascunho v')


def publish(page):
    page.locator('#publish').click()
    page.locator('#confirmPublish').click()
    expect(page.locator('#studioStatus')).to_contain_text('Layout publicado')


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel='chrome', args=['--mute-audio'])
        context = browser.new_context(viewport={'width': 1600, 'height': 1100}, accept_downloads=True)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL + '/card-forge/studio.html')
        page.wait_for_load_state('networkidle')
        expect(page.locator('#studioStatus')).to_contain_text('Studio pronto')
        expect(page.locator('#selectedCardName')).to_contain_text('PEGASUS CLOTH V2')
        expect(layer(page, 'armor-hp')).to_have_count(0)
        expect(layer(page, 'equip')).to_have_count(0)
        expect(layer(page, 'equipment-power-bonus')).to_contain_text('+1')
        select(page, 'armor-hp')
        prop(page, 'visible').check()
        expect(layer(page, 'armor-hp')).to_contain_text('4')
        assert page.locator('[data-layer-row]').count() >= 24
        assert not page.locator('#warnings').inner_text()
        evidence.append('Biblioteca real de 95 cartas; Pegasus Cloth V2 lê Armor HP 4 sem avisos.')

        select(page, 'name')
        prop(page, 'x').fill('480')
        expect(layer(page, 'name')).to_have_attribute('data-x', '480')
        page.locator('#undo').click()
        expect(layer(page, 'name')).to_have_attribute('data-x', '320')
        page.locator('#redo').click()
        expect(layer(page, 'name')).to_have_attribute('data-x', '480')
        page.get_by_role('button', name='Restaurar X herdado', exact=True).click()
        expect(layer(page, 'name')).to_have_attribute('data-x', '320')
        page.locator('#snapGrid').uncheck()
        page.locator('#smartGuides').uncheck()
        rect = layer(page, 'name').bounding_box()
        page.mouse.move(rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2)
        page.mouse.down()
        page.mouse.move(rect['x'] + rect['width'] / 2 + 36, rect['y'] + rect['height'] / 2 + 12, steps=8)
        page.mouse.up()
        assert float(layer(page, 'name').get_attribute('data-x')) > 320
        page.locator('#undo').click()
        expect(layer(page, 'name')).to_have_attribute('data-x', '320')
        prop(page, 'x').fill('360')
        evidence.append('Nome movido por drag e Inspector; undo, redo e restauração herdada verificados.')

        select(page, 'cost')
        handle = page.locator('[data-handle="se"]').bounding_box()
        page.mouse.move(handle['x'] + handle['width'] / 2, handle['y'] + handle['height'] / 2)
        page.mouse.down()
        page.mouse.move(handle['x'] + 30, handle['y'] + 30, steps=6)
        page.mouse.up()
        assert float(prop(page, 'width').input_value()) > 232
        page.locator('#undo').click()
        expect(layer(page, 'cost')).to_have_attribute('data-width', '232')
        prop(page, 'x').fill('110')
        prop(page, ['style', 'fontSize']).fill('130')
        select(page, 'rules')
        prop(page, 'height').fill('430')
        select(page, 'armor-hp')
        prop(page, 'x').fill('1090')
        expect(layer(page, 'armor-hp')).to_have_attribute('data-x', '1090')
        select(page, 'resonance')
        prop(page, 'height').fill('190')
        select(page, 'equip')
        prop(page, 'x').fill('100')
        evidence.append('Resize visual do custo; regras, Armor HP, Equip e Resonance editados independentemente.')

        select(page, 'name')
        page.locator('[data-select-layer="cost"]').click(modifiers=['Shift'])
        expect(page.locator('#selectionCount')).to_contain_text('2 layers')
        select(page, 'name')
        count = page.locator('[data-layer-row]').count()
        page.locator('#duplicateLayer').click()
        expect(page.locator('[data-layer-row]')).to_have_count(count + 1)
        page.locator('#removeLayer').click()
        expect(page.locator('[data-layer-row]')).to_have_count(count)
        page.locator('[data-toggle-layer="visible"][data-layer-id="tagline"]').click()
        expect(layer(page, 'tagline')).to_have_count(0)
        page.locator('#undo').click()
        expect(layer(page, 'tagline')).to_have_count(1)
        select(page, 'name')
        prop(page, 'name').fill('Nome de QA')
        expect(page.locator('[data-select-layer="name"]')).to_contain_text('Nome de QA')
        page.locator('[data-toggle-layer="locked"][data-layer-id="name"]').click()
        expect(prop(page, 'locked')).to_be_checked()
        page.locator('[data-toggle-layer="locked"][data-layer-id="name"]').click()
        old_order = page.locator('[data-layer-row]').evaluate_all("rows=>rows.map(r=>r.dataset.layerRow).indexOf('name')")
        page.locator('#layerUp').click()
        page.wait_for_function("old=>[...document.querySelectorAll('[data-layer-row]')].map(r=>r.dataset.layerRow).indexOf('name')!==old", arg=old_order)
        page.locator('#undo').click()
        select(page, 'tagline')
        page.locator('#propertyControls summary').filter(has_text='Visibilidade condicional').click()
        page.locator('[data-cond-field="binding"]').select_option('card.faction')
        page.locator('[data-cond-field="op"]').select_option('eq')
        page.locator('[data-cond-field="value"]').fill('Poseidon')
        page.locator('[data-cond-field="value"]').press('Tab')
        expect(layer(page, 'tagline')).to_have_count(0)
        page.locator('[data-cond-field="value"]').fill('Athena')
        page.locator('[data-cond-field="value"]').press('Tab')
        expect(layer(page, 'tagline')).to_have_count(1)
        evidence.append('Renomeação, bloqueio, ordem e condições declarativas editados pelos controles visuais.')
        save(page)
        library = page.request.get(URL + '/api/layout-studio').json()
        assert not library['published']
        page.reload()
        page.wait_for_load_state('networkidle')
        expect(layer(page, 'armor-hp')).to_have_attribute('data-x', '1090')
        publish(page)
        first_version = page.request.get(URL + '/api/layout-studio').json()['revision']
        page.screenshot(path=str(OUT / 'studio-desktop.png'), full_page=True)
        evidence.append('Layers, seleção múltipla, duplicação, ocultação e remoção; rascunho reaberto e publicado em QA.')

        forge = context.new_page()
        forge.on('pageerror', lambda error: errors.append(str(error)))
        forge.goto(URL + '/card-forge/?card=athena-v6-002')
        forge.wait_for_load_state('networkidle')
        expect(forge.locator('#layoutStudioLink')).to_be_visible()
        forge.select_option('#representation', 'live')
        expect(forge.locator('#livePreview .studio-live-card')).to_be_visible()
        expect(forge.locator('#livePreview [data-layer="armor-hp"]')).to_contain_text('4')
        forge.locator('#previewDamage').fill('2')
        expect(forge.locator('#livePreview [data-layer="armor-hp"]')).to_contain_text('2')
        assert float(forge.locator('#livePreview [data-layer="armor-hp"]').get_attribute('data-x')) == 1090
        evidence.append('Card Forge usa publicação e engine na prévia; Armor HP 4 → 2 com dano simulado.')

        page.locator('[data-page="preview"]').click()
        for fmt in ['png', 'png-transparent', 'svg', 'pdf']:
            page.select_option('#exportFormat', fmt)
            with page.expect_download(timeout=30000) as info:
                page.locator('#exportCard').click()
            download = info.value
            target = OUT / ('pegasus-cloth.' + ('png' if fmt.startswith('png') else fmt))
            if fmt == 'png-transparent':
                target = OUT / 'pegasus-cloth-transparent.png'
            download.save_as(target)
            assert target.stat().st_size > 300
        evidence.append('PNG nativo, PNG transparente, SVG com assets incorporados e PDF exportados.')

        page.locator('[data-page="cards"]').click()
        page.locator('[data-card="athena-v6-001"]').click()
        page.locator('[data-page="preview"]').click()
        page.select_option('#labMode', 'battlefield')
        page.locator('#labDamage').fill('1')
        page.locator('#labPower').fill('2')
        page.locator('#labHP').fill('1')
        page.locator('#labSeal').fill('2')
        page.locator('#labAwakened').check()
        page.locator('#labPrepared').uncheck()
        page.locator('#labKeywords').fill('Pierce, Long Range')
        page.select_option('#labEquipment', ['athena-v6-002'])
        expect(page.locator('#engineReport')).to_contain_text('5 ATK')
        expect(page.locator('#engineReport')).to_contain_text('4/5 HP')
        expect(layer(page, 'keywords')).to_contain_text('Pierce')
        expect(layer(page, 'status')).to_contain_text('Unprepared')
        page.screenshot(path=str(OUT / 'engine-preview.png'), full_page=True)
        page.locator('#resetLab').click()
        evidence.append('Laboratório usa game.stats(): Seiya com Cloth, bônus, dano, counters e keywords resulta em 5 ATK / 4 de 5 HP.')

        page.locator('[data-page="themes"]').click()
        expect(page.locator('#templateSelect')).to_have_value('layout-faction-athena')
        page.locator('#themeInk').fill('#ffe2a0')
        save(page)
        page.select_option('#themeFaction', 'Poseidon')
        expect(page.locator('#selectedCardName')).to_contain_text('POSEIDON')
        page.locator('#themeInk').fill('#b0eeff')
        save(page)
        page.screenshot(path=str(OUT / 'poseidon-theme.png'), full_page=True)
        evidence.append('Temas Athena e Poseidon independentes, descobertos da biblioteca.')

        page.select_option('#surfaceSelect', 'inspector')
        expect(page.locator('#templateSelect')).to_have_value('layout-inspector')
        select(page, 'current')
        prop(page, 'y').fill('460')
        save(page)
        publish(page)
        page.screenshot(path=str(OUT / 'inspector-layout.png'), full_page=True)
        page.select_option('#surfaceSelect', 'card')

        arena = context.new_page()
        arena.on('pageerror', lambda error: errors.append(str(error)))
        arena.add_init_script("localStorage.setItem('ssTcgSanctuary',JSON.stringify({autoPass:false,hotseatPrivacy:false,aiSpeed:'slow'}))")
        arena.goto(URL + '/playtest/')
        arena.wait_for_load_state('networkidle')
        arena.get_by_role('button', name='Press to begin', exact=False).click()
        arena.get_by_role('button', name='Local battle', exact=False).click()
        arena.select_option('#setup-first', 'A')
        arena.select_option('#setup-deck-A', 'rulebook2-athena')
        arena.select_option('#setup-deck-B', 'rulebook2-athena')
        arena.get_by_role('button', name='Begin duel', exact=True).click()
        expect(arena.locator('[role="dialog"] .dialog-close')).to_be_disabled()
        for _ in range(2):
            keep = arena.get_by_role('button', name='Keep hand', exact=True)
            if keep.is_visible():
                keep.click()
        expect(arena.locator('.arena-hand .studio-live-card').first).to_be_visible()
        arena.locator('.arena-hand .arena-card').last.click(button='right')
        expect(arena.locator('[data-layout-scene^="published-inspector-"]')).to_be_visible()
        expect(arena.get_by_role('button', name='Close popup', exact=True)).to_be_visible()
        arena.screenshot(path=str(OUT / 'playtest-inspector.png'), full_page=True)
        arena.get_by_role('button', name='Close popup', exact=True).click()
        evidence.append('Partida real no Playtest de QA: layouts publicados na mão, botão direito abre Inspector publicado e X continua funcional; mulligan obrigatório mantém X bloqueado.')
        arena.close()

        # Segunda publicação e rollback, sem modificar a primeira versão salva.
        page.select_option('#templateSelect', 'layout-global')
        page.locator('[data-page="cards"]').click()
        page.locator('[data-card="athena-v6-002"]').click()
        select(page, 'armor-hp')
        prop(page, 'x').fill('1120')
        save(page)
        publish(page)
        page.locator('#historyButton').click()
        page.locator(f'[data-history-action="rollback"][data-version="{first_version}"]').click()
        page.locator('#confirmRollback').click()
        expect(page.locator('#studioStatus')).to_contain_text('Publicação anterior restaurada')
        expect(layer(page, 'armor-hp')).to_have_attribute('data-x', '1090')
        evidence.append('Segunda publicação e rollback real em biblioteca isolada.')

        # Escopo de raridade e override individual, sem alterar as demais cartas.
        page.select_option('#templateSelect', 'layout-rarity-uncommon')
        select(page, 'rarity')
        prop(page, 'y').fill('2010')
        save(page)
        publish(page)
        expect(layer(page, 'rarity')).to_have_attribute('data-y', '2010')
        page.locator('#newTemplate').click()
        page.locator('#newTemplateName').fill('QA · Pegasus individual')
        page.select_option('#newTemplateLevel', 'card')
        page.locator('#confirmNewTemplate').click()
        select(page, 'name')
        prop(page, 'x').fill('420')
        save(page)
        publish(page)
        page.locator('[data-page="cards"]').click()
        page.locator('[data-card="athena-v6-004"]').click()
        expect(layer(page, 'name')).to_have_attribute('data-x', '360')
        page.locator('[data-card="athena-v6-002"]').click()
        expect(layer(page, 'name')).to_have_attribute('data-x', '420')
        evidence.append('Variação Uncommon publicada; override da Pegasus não modifica a Dragon Cloth.')

        page.locator('[data-page="layouts"]').click()
        with page.expect_download() as info:
            page.locator('#exportJSON').click()
        template_file = OUT / 'template-exportado.json'
        info.value.save_as(template_file)
        imported = json.loads(template_file.read_text())
        imported['id'] = 'qa-roundtrip-json'
        imported['name'] = 'QA · JSON reimportado'
        page.locator('#importJSON').set_input_files({'name': 'template.json', 'mimeType': 'application/json', 'buffer': json.dumps(imported).encode()})
        expect(page.locator('#templateSelect')).to_have_value('qa-roundtrip-json')
        save(page)
        evidence.append('Exportação e reimportação JSON pelo seletor de arquivos; template reaberto como rascunho.')

        # Casos obrigatórios, descobertos do catálogo existente.
        catalog = json.loads((ROOT / 'data/cards.json').read_text())['cartas']
        for kind in ['God', 'Devotee', 'Spell', 'Domain']:
            target = next(c for c in catalog if c['tipo'] == kind)
            page.locator('[data-page="cards"]').click()
            page.locator(f'[data-card="{target["id"]}"]').click()
            expect(layer(page, 'name')).to_contain_text(target['nome_exibicao_en'])
            page.screenshot(path=str(OUT / f'caso-{kind.lower()}.png'), full_page=True)
        evidence.append('God, Devotee, Spell e Domain reais revisados no mesmo editor, além de Pegasus Cloth V2.')

        for width, height, name in [(1024, 1366, 'tablet'), (768, 1024, 'tablet-768')]:
            page.set_viewport_size({'width': width, 'height': height})
            page.locator('#fitCanvas').click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            expect(page.locator('#canvasPaper')).to_be_visible()
            page.screenshot(path=str(OUT / f'studio-{name}.png'), full_page=True)
        page.emulate_media(reduced_motion='reduce')
        expect(page.locator('#canvasPaper')).to_be_visible()
        evidence.append('Desktop e tablets 1024/768 sem overflow horizontal; reduced motion.')
        assert not errors, errors
        browser.close()
    for file, digest in hashes.items():
        assert hashlib.sha256((ROOT / file).read_bytes()).hexdigest() == digest, 'Arquivo real alterado: ' + file
    (OUT / 'resultado.json').write_text(json.dumps({'ok': True, 'evidencias': evidence, 'erros_js': errors, 'hashes_preservados': hashes}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'ok': True, 'evidencias': evidence, 'erros_js': errors}, ensure_ascii=False))
finally:
    server.shutdown()
    server.server_close()
    server.qa_temp.cleanup()
