#!/bin/bash
# =============================================================================
# AUTUS 모니터링 스택 시작 스크립트
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🏛️ AUTUS 모니터링 스택 시작..."
echo ""

# 디렉토리 생성 (없으면)
mkdir -p prometheus alertmanager grafana/provisioning/datasources grafana/provisioning/dashboards grafana/dashboards

# Docker Compose 실행
echo "📦 Docker Compose 시작..."
docker compose -f docker-compose.monitoring.yml up -d

echo ""
echo "⏳ 서비스 시작 대기 중..."
sleep 5

# 상태 확인
echo ""
echo "📊 서비스 상태:"
echo "─────────────────────────────────────"
docker compose -f docker-compose.monitoring.yml ps

echo ""
echo "✅ 모니터링 스택 시작 완료!"
echo ""
echo "🔗 접속 URL:"
echo "  • Prometheus:   http://localhost:9090"
echo "  • Grafana:      http://localhost:3001 (admin / autus2026)"
echo "  • Alertmanager: http://localhost:9093"
echo ""
echo "📈 AUTUS 메트릭을 수집하려면 백엔드에서 Prometheus exporter를 시작하세요:"
echo "  python -c 'from backend.monitoring import init_prometheus; init_prometheus()'"
echo ""
echo "📝 로그 확인:"
echo "  docker compose -f docker-compose.monitoring.yml logs -f"
echo ""
