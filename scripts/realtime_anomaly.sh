#!/bin/bash
echo "🔍 Real-time Anomaly Detection"
echo "=============================="

LOG_FILE="${1:-/var/log/autus.log}"
ALERT_THRESHOLD=5

while true; do
    # 에러 카운트
    ERROR_COUNT=$(tail -100 "$LOG_FILE" 2>/dev/null | grep -c "ERROR" || echo 0)
    
    if [ "$ERROR_COUNT" -gt "$ALERT_THRESHOLD" ]; then
        echo "⚠️  ALERT: $ERROR_COUNT errors detected!"
        ./scripts/send_slack_alert.sh "High error rate: $ERROR_COUNT errors"
        ./scripts/self_heal.sh
    fi
    
    # 메모리/CPU 체크
    MEM_USAGE=$(ps aux | awk '{sum += $4} END {print int(sum)}')
    if [ "$MEM_USAGE" -gt 80 ]; then
        echo "⚠️  High memory usage: ${MEM_USAGE}%"
    fi
    
    sleep 10
done
