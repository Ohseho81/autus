#!/bin/bash
echo "📢 AUTUS Notification System"

CHANNEL=$1
MESSAGE=$2
PRIORITY=${3:-normal}

# Slack
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    EMOJI="📢"
    [ "$PRIORITY" == "critical" ] && EMOJI="🚨"
    [ "$PRIORITY" == "success" ] && EMOJI="✅"
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$EMOJI $MESSAGE\"}" \
        "$SLACK_WEBHOOK_URL"
fi

# Discord (if configured)
if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"content\":\"$MESSAGE\"}" \
        "$DISCORD_WEBHOOK_URL"
fi

# 로컬 로그
echo "[$(date)] [$PRIORITY] $MESSAGE" >> .autus/logs/notifications.log
