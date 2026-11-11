// Versões leves das artes do Card Forge (tools/light-assets.py): 'webp' (até 1024 px) e 'thumb' (até 320 px).
// Só troca a URL quando a versão existe em art-web/light.json; arte nova ainda não convertida segue no JPG original.
const list = await fetch(new URL('../card-forge/art-web/light.json', import.meta.url)).then(r => r.ok ? r.json() : {}).catch(() => ({}));
const have = {webp: new Set(list.webp), touch: new Set(list.touch), thumb: new Set(list.thumb), zoom: new Set(list.zoom)};
const normal = globalThis.matchMedia?.('(pointer: coarse)').matches && have.touch.size ? 'touch' : 'webp'; // toque: 640 px, para não pesar no celular

const rev = name => list.rev?.[name] ? `?v=${list.rev[name]}` : ''; // arte trocada no Forge ganha URL nova; sem isso o navegador usa a do cache

export function lightArt(url, size = normal) {
  const m = typeof url === 'string' && url.match(/^(.*art-web\/)([^/?#]+)\.jpg$/);
  return m && have[size]?.has(m[2]) ? `${m[1]}${size}/${m[2]}.webp${rev(m[2])}` : url;
}

// Carta em tela cheia: mostra já a arte que está em cache e troca pela de 2048 px quando ela terminar de chegar.
export function upgradeArt(root) {
  for (const img of root?.querySelectorAll('img') || []) {
    const m = img.src.match(/^(.*art-web\/)(?:webp|touch)\/([^/?#]+)\.webp(?:\?v=\w+)?$/);
    if (!m) continue;
    const src = `${m[1]}${have.zoom.has(m[2]) ? 'zoom' : 'webp'}/${m[2]}.webp${rev(m[2])}`, next = new Image();
    if (src === img.src) continue;
    next.src = src;
    next.decode().then(() => { if (img.isConnected) img.src = src; }).catch(() => {});
  }
}
