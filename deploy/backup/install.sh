#!/usr/bin/env bash
# One-time setup on the server: nightly cron at 02:30 server time, then a first backup.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
chmod 700 "$HERE"/*.sh
if [ ! -f "$HERE/backup.env" ]; then
  cp "$HERE/backup.env.example" "$HERE/backup.env"
  chmod 600 "$HERE/backup.env"
  echo "Created $HERE/backup.env: set BACKUP_PASSPHRASE (and the Telegram settings), then run this again."
  exit 1
fi
chmod 600 "$HERE/backup.env"
echo "30 2 * * * root $HERE/backup.sh >> /var/log/telenotify-backup.log 2>&1" > /etc/cron.d/telenotify-backup
chmod 644 /etc/cron.d/telenotify-backup
echo "Installed /etc/cron.d/telenotify-backup (every night at 02:30). Running a first backup now..."
"$HERE/backup.sh"
