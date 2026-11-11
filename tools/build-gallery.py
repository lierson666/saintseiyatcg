"""Refaz as imagens da galeria pública (gallery/img e gallery/thumb) com o renderizador atual das cartas.

Renderiza cada carta de gallery/cards.json com shared/live-card.js em 1488 x 2091 (resolução nativa do layout)
e gera a miniatura em 560 px. Precisa do servidor do Card Forge/Star Hill em http://localhost:8765.
Uso: uv run --no-project --with playwright --with pillow python tools/build-gallery.py [id ...]
"""
import io, json, sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = 'http://localhost:8765'
WIDTH, THUMB = 744, 560  # 744 CSS px com escala 2 = 1488 px, a largura nativa
PAGE = """<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Jost:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="/shared/live-card.css">
<style>html,body{margin:0;background:transparent}#c{width:%dpx}</style><div id="c"></div>
<script type="module">
import {renderLiveCard} from '/shared/live-card.js';
const {cartas} = await fetch('/card-forge/art-web/cards.json', {cache: 'no-store'}).then(r => r.json());
window.render = async id => {
  const card = cartas.find(c => c.id === id);
  if (!card) return false;
  const box = document.getElementById('c');
  box.innerHTML = renderLiveCard(card, {art: card.ilustracao ? `/card-forge/art-web/${card.ilustracao}` : undefined});
  await document.fonts.ready;
  await Promise.all([...box.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  await Promise.all([...box.querySelectorAll('img')].map(i => i.decode().catch(() => 0)));
  return true;
};
window.ready = true;
</script>""" % WIDTH


def main(ids):
    cards = json.loads((ROOT / 'gallery/cards.json').read_text(encoding='utf-8'))
    wanted = [c['id'] for c in cards if not ids or c['id'] in ids]
    missing = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': WIDTH + 40, 'height': 1200}, device_scale_factor=2)
        page.route(f'{BASE}/__galeria', lambda r: r.fulfill(status=200, content_type='text/html', body=PAGE))
        page.goto(f'{BASE}/__galeria')
        page.wait_for_function('window.ready === true', timeout=60000)
        for id_ in wanted:
            if not page.evaluate('id => window.render(id)', id_):
                missing.append(id_)
                continue
            png = page.locator('#c > *').first.screenshot(type='png', omit_background=True)
            big = Image.open(io.BytesIO(png)).convert('RGB')
            big.save(ROOT / f'gallery/img/{id_}.jpg', quality=84, optimize=True, progressive=True)
            small = big.resize((THUMB, round(big.height * THUMB / big.width)), Image.LANCZOS)
            small.save(ROOT / f'gallery/thumb/{id_}.jpg', quality=86, optimize=True, progressive=True)
            print(id_, big.size)
        browser.close()
    if missing:
        sys.exit(f'Sem carta no export: {missing}')


if __name__ == '__main__':
    main(set(sys.argv[1:]))
