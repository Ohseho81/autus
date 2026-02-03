#!/bin/bash
# MoltBot v2 시작 스크립트

echo "🤖 MoltBot v2 시작..."

# 기존 프로세스 종료
pkill -f "node.*moltbot-bridge" 2>/dev/null

# 잠시 대기
sleep 1

# 디렉토리 이동
cd "$(dirname "$0")"

# 시작
node index.js
