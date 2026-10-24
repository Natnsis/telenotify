#!/usr/bin/env bash
# Prints the chat id of whoever last messaged the bot. Send your backup bot /start first.
#   ./telegram-chat-id.sh <bot-token>
set -euo pipefail
TOKEN="${1:?Usage: telegram-chat-id.sh <bot-token>}"
curl -sS "https://api.telegram.org/bot${TOKEN}/getUpdates" | grep -o '"chat":{"id":-\{0,1\}[0-9]*' | tail -1 | grep -o -- '-\{0,1\}[0-9]*$' || echo "No messages yet: send /start to the bot, then run this again."
