#!/usr/bin/env bash
# Restore a backup made by backup.sh into the Postgres container.
#   ./restore.sh /opt/telenotify/backups/telenotify-20261024-023000.tar.gz.enc
# Stop the API first (docker compose ... stop api) so nothing writes during the restore.
set -euo pipefail
umask 077

HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/backup.env" ] && set -a && . "$HERE/backup.env" && set +a

FILE="${1:?Usage: restore.sh <backup.tar.gz.enc>}"
CONTAINER="${PG_CONTAINER:-telenotify-postgres-1}"
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  read -r -s -p "Backup passphrase: " BACKUP_PASSPHRASE; echo
  export BACKUP_PASSPHRASE
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
openssl enc -d -aes-256-cbc -md sha256 -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "$FILE" | tar -xzf - -C "$WORK"
echo "Backup from $(cat "$WORK/created-at.txt" 2>/dev/null || echo unknown), contains: $(ls "$WORK" | tr '\n' ' ')"

if [ "${RESTORE_YES:-}" != "1" ]; then
  read -r -p "This REPLACES all data in $CONTAINER. Type RESTORE to continue: " answer
  [ "$answer" = "RESTORE" ] || { echo "Cancelled."; exit 1; }
fi

# RESTORE_DB restores into another database instead (e.g. to inspect a backup safely).
docker exec -i -e RESTORE_DB="${RESTORE_DB:-}" "$CONTAINER" sh -c 'pg_restore -U "$POSTGRES_USER" -d "${RESTORE_DB:-$POSTGRES_DB}" --clean --if-exists --no-owner' < "$WORK/telenotify.dump"
echo "Database restored."

if [ -f "$WORK/env.production" ]; then
  KEEP="$(dirname "$FILE")/env.production.restored"
  cp "$WORK/env.production" "$KEEP"
  echo "The backed-up .env.production is in $KEEP (compare it with the current one; ENCRYPTION_KEY must match for bot tokens to work)."
fi
