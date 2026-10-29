#!/bin/sh
# Backup diário do sanctuary.db (contas, decks, chat, duelos). Roda como root no mamaco-dev, pelo cron:
#   15 4 * * * /home/dev/sanctuary-api/backup.sh >> /var/log/sanctuary-backup.log 2>&1
# Usa a API de backup do SQLite dentro do container (cópia consistente com o servidor rodando)
# e guarda 14 dias em /var/backups/sanctuary, fora do volume do Docker.
set -eu
CONTAINER="${SANCTUARY_CONTAINER:-sanctuary-sanctuary-api-1}"
DEST="${SANCTUARY_BACKUP_DIR:-/var/backups/sanctuary}"
KEEP_DAYS="${SANCTUARY_BACKUP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M)"

mkdir -p "$DEST"
chmod 700 "$DEST"
docker exec "$CONTAINER" python3 -c "
import sqlite3
src = sqlite3.connect('/data/sanctuary.db')
dst = sqlite3.connect('/tmp/backup.db')
src.backup(dst)
dst.execute('pragma integrity_check').fetchone()[0] == 'ok' or exit('integrity_check falhou')
dst.close(); src.close()
"
docker cp "$CONTAINER:/tmp/backup.db" "$DEST/sanctuary-$STAMP.db"
docker exec "$CONTAINER" rm -f /tmp/backup.db
gzip -f "$DEST/sanctuary-$STAMP.db"
chmod 600 "$DEST/sanctuary-$STAMP.db.gz"
find "$DEST" -name 'sanctuary-*.db.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Iseconds) ok $DEST/sanctuary-$STAMP.db.gz $(du -h "$DEST/sanctuary-$STAMP.db.gz" | cut -f1)"
