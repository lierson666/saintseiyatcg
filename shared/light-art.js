// Versões leves das artes do Card Forge (tools/light-assets.py): 'webp' (até 1024 px) e 'thumb' (até 320 px).
// Só troca a URL quando a versão existe em art-web/light.json; arte nova ainda não convertida segue no JPG original.
const list = await fetch(new URL('../card-forge/art-web/light.json', import.meta.url)).then(r => r.ok ? r.json() : {}).catch(() => ({}));
const have = {webp: new Set(list.webp), thumb: new Set(list.thumb)};

export function lightArt(url, size = 'webp') {
  const m = typeof url === 'string' && url.match(/^(.*art-web\/)([^/?#]+)\.jpg$/);
  return m && have[size]?.has(m[2]) ? `${m[1]}${size}/${m[2]}.webp` : url;
}
