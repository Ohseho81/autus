#!/bin/bash
# =============================================================================
# AUTUS 모니터링 스택 중지 스크립트
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 AUTUS 모니터링 스택 중지..."
docker compose -f docker-compose.monitoring.yml down

echo "✅ 모니터링 스택 중지 완료"
