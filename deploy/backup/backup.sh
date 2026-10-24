#!/usr/bin/env bash
# Nightly Telenotify backup: Postgres dump + the server's .env.production (it holds
# ENCRYPTION_KEY), packed and encrypted with BACKUP_PASSPHRASE. Kept on the server
# for KEEP_DAYS and, when configured, sent to a private Telegram chat so a copy
# survives if the server is lost. Restore with restore.sh.
set -euo pipefail
umask 077

HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/backup.env" ] && set -a && . "$HERE/backup.env" && set +a

CONTAINER="${PG_CONTAINER:-telenotify-postgres-1}"
BACKUP_DIR="${BACKUP_DIR:-/opt/telenotify/backups}"
ENV_FILE="${ENV_FILE:-$HERE/../.env.production}"
KEEP_DAYS="${KEEP_DAYS:-14}"
: "${BACKUP_PASSPHRASE:?Set BACKUP_PASSPHRASE in backup.env}"

log() { echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') $*"; }

telegram() {
  [ -n "${BACKUP_TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${BACKUP_TELEGRAM_CHAT_ID:-}" ] || return 0
  curl -sS -m 120 "https://api.telegram.org/bot${BACKUP_TELEGRAM_BOT_TOKEN}/$1" -F "chat_id=${BACKUP_TELEGRAM_CHAT_ID}" "${@:2}"
}

on_error() {
  log "Backup FAILED (line $1)"
  telegram sendMessage -F "text=⚠️ Telenotify backup FAILED on $(hostname) at $(date -u '+%Y-%m-%d %H:%M UTC'). Check /var/log/telenotify-backup.log" >/dev/null || true
}
trap 'on_error $LINENO' ERR

STAMP="$(date -u +%Y%m%d-%H%M%S)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$BACKUP_DIR"

log "Dumping database from $CONTAINER"
docker exec "$CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$WORK/telenotify.dump"
[ -s "$WORK/telenotify.dump" ] || { log "Empty dump"; false; }

if [ -f "$ENV_FILE" ]; then cp "$ENV_FILE" "$WORK/env.production"; else log "No $ENV_FILE, backing up the database only"; fi
echo "$STAMP" > "$WORK/created-at.txt"

OUT="$BACKUP_DIR/telenotify-$STAMP.tar.gz.enc"
tar -czf - -C "$WORK" . | openssl enc -aes-256-cbc -md sha256 -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -out "$OUT"
SIZE="$(du -h "$OUT" | cut -f1)"
log "Wrote $OUT ($SIZE)"

# Keep the last KEEP_DAYS days on the server.
find "$BACKUP_DIR" -name 'telenotify-*.tar.gz.enc' -type f -mtime +"$KEEP_DAYS" -print -delete | sed 's/^/Removed old backup: /'

if [ -n "${BACKUP_TELEGRAM_BOT_TOKEN:-}" ]; then
  RESPONSE="$(telegram sendDocument -F "document=@$OUT" -F "caption=Telenotify backup $STAMP ($SIZE). Encrypted; restore with deploy/backup/restore.sh")"
  echo "$RESPONSE" | grep -q '"ok":true' || { log "Telegram upload failed: $RESPONSE"; false; }
  log "Sent to Telegram"
fi
log "Backup done"
