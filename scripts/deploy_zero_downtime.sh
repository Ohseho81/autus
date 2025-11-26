#!/bin/bash
echo "🚀 Zero-Downtime Deployment"
echo "==========================="

VERSION=$1
PORT_A=8000
PORT_B=8001

# 현재 활성 포트 확인
CURRENT=$(curl -s http://localhost:$PORT_A/health && echo $PORT_A || echo $PORT_B)

if [ "$CURRENT" == "$PORT_A" ]; then
    NEW_PORT=$PORT_B
else
    NEW_PORT=$PORT_A
fi

echo "📍 Current: $CURRENT, New: $NEW_PORT"

# 새 버전 시작
echo "🔄 Starting new version on port $NEW_PORT..."
uvicorn server.main:app --port $NEW_PORT &
NEW_PID=$!
sleep 5

# 헬스체크
if curl -s http://localhost:$NEW_PORT/health > /dev/null; then
    echo "✅ Health check passed"
    
    # 트래픽 전환 (실제로는 로드밸런서 설정)
    echo "🔄 Switching traffic..."
    
    # 이전 버전 종료
    pkill -f "port $CURRENT" || true
    
    echo "✅ Deployment complete!"
else
    echo "❌ Health check failed, rolling back..."
    kill $NEW_PID
    exit 1
fi
