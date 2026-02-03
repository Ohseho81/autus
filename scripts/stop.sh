#!/bin/bash
# ============================================
# 🛑 AUTUS 서비스 중지 스크립트
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUTUS_DIR="$(dirname "$SCRIPT_DIR")"

echo "🛑 AUTUS 서비스 중지..."

# 저장된 PID로 종료
if [ -f "$AUTUS_DIR/.running_pids" ]; then
    PIDS=$(cat "$AUTUS_DIR/.running_pids")
    kill $PIDS 2>/dev/null || true
    rm -f "$AUTUS_DIR/.running_pids"
fi

# Node 프로세스 정리
pkill -f "moltbot-brain" 2>/dev/null || true
pkill -f "moltbot-bridge" 2>/dev/null || true

echo "✅ 서비스 종료 완료"
