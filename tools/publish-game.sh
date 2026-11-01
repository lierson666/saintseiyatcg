#!/usr/bin/env bash
# Publica o jogo no mamaco-dev e reinicia o arena-server só se algo mudou.
# Envia inclusive as artes -ref (autor, 01/11/2026); /card-forge e /playtest ficam atrás do login.
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE=mamaco-dev
SITE=/home/dev/saintseiyatcg
OPTS=(-az --checksum --itemize-changes --exclude='*.backup*' --exclude='node_modules' --exclude='.DS_Store')

changes=$(rsync "${OPTS[@]}" card-forge/art-web/ "$REMOTE:$SITE/card-forge/art-web/")
for d in playtest shared data; do
  changes+=$'\n'$(rsync "${OPTS[@]}" "$d/" "$REMOTE:$SITE/$d/")
done
ssh "$REMOTE" "chmod -R a+rX $SITE/playtest $SITE/shared $SITE/data $SITE/card-forge/art-web"

# Só arquivos contam: o rsync também lista diretórios com data alterada.
sent=$(grep -c '^<f' <<<"$changes" || true)
if [ "$sent" -eq 0 ]; then
  echo "Nada mudou; arena-server não reiniciado."
  exit 0
fi
echo "$sent arquivo(s) enviados"
ssh "$REMOTE" sudo docker restart arena-arena-server-1
echo OK
