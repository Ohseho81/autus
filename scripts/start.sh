#!/bin/bash
# ============================================
# 🚀 AUTUS 서비스 시작 스크립트
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUTUS_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔═══════════════════════════════════════════╗"
echo "║         🚀 AUTUS 서비스 시작              ║"
echo "╚═══════════════════════════════════════════╝"

# 환경변수 로드
if [ -f "$AUTUS_DIR/.env" ]; then
    export $(cat "$AUTUS_DIR/.env" | grep -v '^#' | xargs)
fi

# 1. MoltBot Brain 서버 시작
echo ""
echo "🧠 1/2. MoltBot Brain 시작..."
cd "$AUTUS_DIR/moltbot-brain"
npm install --silent
npm start &
BRAIN_PID=$!
echo "   PID: $BRAIN_PID"

# Brain 시작 대기
sleep 2

# 2. MoltBot Bridge (Telegram) 시작
echo ""
echo "🤖 2/2. MoltBot Bridge 시작..."
cd "$AUTUS_DIR/moltbot-bridge"
npm install --silent
node index.js &
BRIDGE_PID=$!
echo "   PID: $BRIDGE_PID"

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║         ✅ 서비스 시작 완료!              ║"
echo "╠═══════════════════════════════════════════╣"
echo "║  🧠 Brain:  http://localhost:3030         ║"
echo "║  🤖 Bot:    @autus_seho_bot               ║"
echo "╠═══════════════════════════════════════════╣"
echo "║  종료: Ctrl+C 또는 ./scripts/stop.sh      ║"
echo "╚═══════════════════════════════════════════╝"

# PID 저장
echo "$BRAIN_PID $BRIDGE_PID" > "$AUTUS_DIR/.running_pids"

# 종료 시 정리
trap 'echo ""; echo "🛑 서비스 종료 중..."; kill $BRAIN_PID $BRIDGE_PID 2>/dev/null; rm -f "$AUTUS_DIR/.running_pids"; exit' INT TERM

# 대기
wait
