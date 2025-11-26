#!/bin/bash
echo "📊 Real-time Log Analyzer"

tail -f .autus/logs/*.log 2>/dev/null | while read line; do
    if echo "$line" | grep -q "ERROR"; then
        echo "🔴 ERROR: $line"
        ./scripts/send_slack_alert.sh "Error detected: $line"
    elif echo "$line" | grep -q "WARNING"; then
        echo "🟡 WARNING: $line"
    elif echo "$line" | grep -q "SUCCESS"; then
        echo "🟢 SUCCESS: $line"
    fi
done
