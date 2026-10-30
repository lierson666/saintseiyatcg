#!/bin/sh
# Publica as cartas do Card Forge no jogo online (saintseiyatcg.com), chamado pelo botão "Publicar no site" do Star Hill.
# 1. Gera o export leve (tools/forge-art-web.sh).
# 2. Monta uma cópia sem as artes provisórias <id>-ref (material de terceiros: nunca vão ao servidor).
# 3. Envia por rsync ao mamaco-dev e confere: nenhuma -ref no remoto e cards.json idêntico.
# A arena online recarrega cards.json sozinha na próxima partida (arena-server/server.mjs).
# Também leva as telas e sons do Star Hill (data/olympus-telas.json e os arquivos que ele usa).
# Mudanças de motor (código em playtest/ ou arena-server/) não vão por aqui.
set -e
ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
HOST="${SSTCG_HOST:-mamaco-dev}"
REMOTE=/home/dev/saintseiyatcg/card-forge/art-web
sh "$ROOT/tools/forge-art-web.sh" "$ROOT" >/dev/null
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
rsync -a --exclude='*-ref.*' "$ROOT/card-forge/art-web/" "$STAGE/"
python3 - "$STAGE/cards.json" <<'EOF'
import json, sys
path = sys.argv[1]
data = json.load(open(path))
# tira campos que apontam para arte -ref: a carta cai na arte padrão ou fica sem arte
def clean(v):
    if isinstance(v, dict):
        return {k: clean(x) for k, x in v.items() if not (isinstance(x, str) and '-ref.' in x)}
    if isinstance(v, list):
        return [clean(x) for x in v]
    return v
data = clean(data)
for c in data['cartas']:
    if 'ilustracao' not in c: c.pop('ilustracao_enquadramento', None)
assert '-ref.' not in json.dumps(data)
json.dump(data, open(path, 'w'), ensure_ascii=False)
EOF
rsync -az --checksum "$STAGE/" "$HOST:$REMOTE/"
# Telas e som do Star Hill: o JSON e só as imagens/áudios que ele usa (nada de -ref).
python3 - "$ROOT" > "$STAGE/.telas-files" <<'EOF2'
import json, sys, pathlib
root = pathlib.Path(sys.argv[1])
t = json.loads((root / 'data/olympus-telas.json').read_text())
paths = {'data/olympus-telas.json'}
def walk(v):
    if isinstance(v, dict): [walk(x) for x in v.values()]
    elif isinstance(v, list): [walk(x) for x in v]
    elif isinstance(v, str) and not v.startswith('card:') and '/' in v and (root / v).is_file(): paths.add(v)
walk(t)
assert not any('-ref.' in p for p in paths)
print('\n'.join(sorted(paths)))
EOF2
rsync -az --checksum --files-from="$STAGE/.telas-files" "$ROOT/" "$HOST:/home/dev/saintseiyatcg/"
ssh "$HOST" "cd /home/dev/saintseiyatcg && tr '\\n' '\\0' | xargs -0 chmod a+rX" < "$STAGE/.telas-files"
LOCAL_SHA="$(shasum -a 256 "$STAGE/cards.json" | cut -d' ' -f1)"
OUT="$(ssh "$HOST" "chmod -R a+rX $REMOTE && find $REMOTE -name '*-ref.*' | wc -l && sha256sum $REMOTE/cards.json | cut -d' ' -f1")"
REFS="$(echo "$OUT" | sed -n 1p | tr -d ' ')"
SHA="$(echo "$OUT" | sed -n 2p)"
[ "$REFS" = 0 ] || { echo "Há $REFS artes -ref no servidor." >&2; exit 1; }
[ "$SHA" = "$LOCAL_SHA" ] || { echo "cards.json no servidor não confere." >&2; exit 1; }
echo "Cartas publicadas no site: $(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1]))['cartas']))" "$STAGE/cards.json") cartas."
