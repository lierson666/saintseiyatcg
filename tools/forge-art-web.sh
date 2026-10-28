#!/bin/sh
# Gera o material leve do Card Forge para o Olympus Arena em card-forge/art-web/ (fora do git):
#   <id>.jpg    arte de fundo em 640 px (JPEG q82)
#   cards.json  metadados das cartas do Forge (data/cards.json + subtítulo/flavour do projeto), desenhadas ao vivo por shared/live-card.js
# Uso: tools/forge-art-web.sh [checkout com o Card Forge]  (padrão: este checkout)
# Rode de novo quando uma arte ou carta mudar no Forge; as artes só são refeitas se estiverem desatualizadas.
set -e
ROOT="${1:-$(dirname "$0")/..}"
DEST="$(dirname "$0")/../card-forge/art-web"
mkdir -p "$DEST"
for f in "$ROOT"/card-forge/art/*.png "$ROOT"/card-forge/art/*.jpg; do
  [ -e "$f" ] || continue
  out="$DEST/$(basename "${f%.*}").jpg"
  [ "$out" -nt "$f" ] && continue
  sips -Z 640 -s format jpeg -s formatOptions 82 "$f" --out "$out" >/dev/null
done
python3 - "$ROOT" "$DEST" <<'EOF'
import json, sys, pathlib
root, dest = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
cards = json.loads((root / 'data/cards.json').read_text())['cartas']
for c in cards:
    p = root / f"card-forge/projects/{c['id']}.json"
    proj = json.loads(p.read_text()) if p.exists() else {}
    if proj.get('subtitle'): c['subtitulo_en'] = proj['subtitle']
    if proj.get('flavour'): c['flavour_en'] = proj['flavour']
    if (dest / f"{c['id']}.jpg").exists(): c['ilustracao'] = f"{c['id']}.jpg"
(dest / 'cards.json').write_text(json.dumps({'cartas': cards}, ensure_ascii=False))
print(f"cartas: {len(cards)}, com arte: {sum('ilustracao' in c for c in cards)}")
EOF
