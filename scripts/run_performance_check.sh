#!/bin/bash
# AUTUS v4.8 성능 대시보드 빠른 시작
# [M1] + [T2] + [D1] 통합 실행

set -e

echo "🚀 AUTUS v4.8 성능 분석 도구"
echo "================================"
echo ""

# 필수 패키지 확인
echo "✅ 환경 확인..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python3이 설치되어 있지 않습니다"
    exit 1
fi

# httpx 설치 확인
python3 -c "import httpx" 2>/dev/null || {
    echo "📦 httpx 설치 중..."
    pip install httpx asyncio
}

echo ""
echo "================================"
echo "🎯 실행 옵션:"
echo "================================"
echo ""
echo "1️⃣  전체 실행 (기본)"
echo "2️⃣  대시보드 만 [M1]"
echo "3️⃣  캐시 검증 만 [T2]"
echo "4️⃣  프로파일링 만 [D1]"
echo ""

# 명령행 인자 처리
if [ $# -eq 0 ]; then
    MODE="all"
    echo "💡 팁: python performance_dashboard.py --help"
    echo ""
else
    MODE="$1"
fi

case $MODE in
    1|all)
        echo "🔵 전체 분석 시작..."
        python3 performance_dashboard.py --all
        ;;
    2|dashboard)
        echo "🎯 [M1] 성능 대시보드 시작..."
        python3 performance_dashboard.py --dashboard
        ;;
    3|cache)
        echo "💾 [T2] 캐시 검증 시작..."
        python3 performance_dashboard.py --cache
        ;;
    4|profile)
        echo "⚡ [D1] 성능 프로파일링 시작..."
        python3 performance_dashboard.py --profile
        ;;
    *)
        echo "❌ 알 수 없는 옵션: $MODE"
        echo ""
        echo "사용법: $0 [1|2|3|4|all|dashboard|cache|profile]"
        exit 1
        ;;
esac

echo ""
echo "✅ 완료!"
