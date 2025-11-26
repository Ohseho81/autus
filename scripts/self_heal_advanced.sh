#!/bin/bash
echo "🔧 AUTUS Advanced Self-Healing"
echo "==============================="

MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "🔄 Attempt $((RETRY_COUNT + 1))/$MAX_RETRIES"
    
    # 1. 문제 감지
    HEALTH=$(curl -s http://localhost:8000/health || echo "DOWN")
    
    if [ "$HEALTH" == "DOWN" ]; then
        echo "❌ Service down, attempting recovery..."
        
        # 2. 프로세스 재시작
        pkill -f "uvicorn.*8000" || true
        sleep 2
        uvicorn server.main:app --port 8000 &
        sleep 5
        
        # 3. 재확인
        if curl -s http://localhost:8000/health > /dev/null; then
            echo "✅ Service recovered!"
            exit 0
        fi
    else
        echo "✅ Service healthy"
        exit 0
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

echo "❌ Self-healing failed after $MAX_RETRIES attempts"
./scripts/send_slack_alert.sh "CRITICAL: Self-healing failed!"
exit 1
