#!/usr/bin/env bash
# Publica o sanctuary-api no mamaco-dev e reconstrói o container, só se algum arquivo mudou (o login cai por instantes).
# Precisa de deploy/sanctuary-install.sh instalado no servidor. compose.yml não vai por aqui: mudá-lo exige reinstalar como root.
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE=mamaco-dev
API=/home/dev/sanctuary-api
python3 tools/deploy-guard.py check --env playtest --host "$REMOTE" --path /home/dev/saintseiyatcg/data

changes=$(cd sanctuary-api && rsync -az --checksum --itemize-changes server.py cosmo.py cosmo_pairing.py achievements.py achievements.json catalog.json Dockerfile "$REMOTE:$API/")
if ! grep -q '^<f' <<<"$changes"; then
  echo "Nada mudou; API não reconstruída."
  exit 0
fi
ssh "$REMOTE" sudo -n /usr/local/bin/sanctuary-deploy
echo OK
