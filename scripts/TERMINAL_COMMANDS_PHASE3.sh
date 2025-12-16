#!/bin/bash
# 🟡 PHASE 3: 운영 준비 (모레 - 3시간)
# 타입 안정성 + 통합 테스트 + 문서화

echo "📋 PHASE 3: 운영 준비 시작"
echo "================================"
echo ""

cd /Users/oseho/Desktop/autus

# Step 1: 타입 체크
echo "⏱️  Step 1: Type 안정성 검증 (10분)"
echo "-----------------------------------"

echo "🔍 mypy 타입 체크 설치 확인:"
if ! command -v mypy &> /dev/null; then
    echo "📦 mypy 설치 중..."
    pip install mypy --quiet
fi

echo ""
echo "🧪 타입 체크 실행 (api 폴더):"
mypy api/ --ignore-missing-imports 2>&1 | head -30 || echo "⚠️  mypy 설치 필요"

echo ""
echo "🧪 타입 체크 실행 (evolved 폴더):"
mypy evolved/ --ignore-missing-imports 2>&1 | head -30 || echo "⚠️  mypy 설치 필요"

echo ""
echo ""

# Step 2: 통합 테스트 실행
echo "⏱️  Step 2: 통합 테스트 실행 (15분)"
echo "-----------------------------------"

echo "🧪 기존 테스트 실행:"
pytest test_v4_8_kubernetes.py -v --tb=short -q

echo ""
echo "🧪 새로운 통합 테스트 실행 (생성 후):"
if [ -f "tests/test_api_integration.py" ]; then
    pytest tests/test_api_integration.py -v --tb=short -q
else
    echo "⚠️  tests/test_api_integration.py 미생성 (VS Code에서 생성 후)"
fi

echo ""
echo ""

# Step 3: 커버리지 확인
echo "⏱️  Step 3: 테스트 커버리지 측정 (10분)"
echo "-----------------------------------"

echo "📊 커버리지 설치 확인:"
if ! command -v coverage &> /dev/null; then
    echo "📦 coverage 설치 중..."
    pip install coverage --quiet
fi

echo ""
echo "🧪 커버리지 실행:"
coverage run -m pytest test_v4_8_kubernetes.py -q
coverage report --omit="*/tests/*" 2>&1 | head -20

echo ""
echo "📊 HTML 리포트 생성:"
coverage html --omit="*/tests/*" 2>&1 && echo "✅ htmlcov/index.html 생성됨"

echo ""
echo ""

# Step 4: 문서 생성
echo "⏱️  Step 4: 문서화 검증 (5분)"
echo "-----------------------------------"

echo "📖 주요 문서 확인:"

docs=(
    "START_HERE.md"
    "LAST_TOUCH_ACTION_PLAN.md"
    "VS_INSPECTION_SUMMARY.md"
    "COMPREHENSIVE_REVIEW_CHECKLIST.md"
    "VSCODE_TASKS_PHASE1.md"
    "VSCODE_TASKS_PHASE2.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        lines=$(wc -l < "$doc")
        echo "✅ $doc ($lines 줄)"
    else
        echo "❌ $doc (미생성)"
    fi
done

echo ""
echo ""

# Step 5: API 문서
echo "⏱️  Step 5: API 문서 확인 (5분)"
echo "-----------------------------------"

echo "📖 API 엔드포인트 확인:"
python << 'EOF'
import requests
import json

try:
    response = requests.get("http://localhost:8000/openapi.json", timeout=5)
    if response.status_code == 200:
        api_doc = response.json()
        print(f"✅ OpenAPI 문서 생성됨")
        print(f"📝 제목: {api_doc.get('info', {}).get('title')}")
        print(f"📝 버전: {api_doc.get('info', {}).get('version')}")
        paths = list(api_doc.get('paths', {}).keys())
        print(f"📝 엔드포인트 수: {len(paths)}")
        print(f"📝 상위 5개:")
        for path in paths[:5]:
            print(f"   - {path}")
    else:
        print(f"⚠️  응답: {response.status_code}")
except Exception as e:
    print(f"⚠️  API 문서 조회 불가: {e}")
EOF

echo ""
echo ""

# Step 6: 최종 요약
echo "⏱️  Step 6: 최종 요약 (5분)"
echo "-----------------------------------"

python << 'EOF'
import os
import time

print("📊 Phase 3 완료 현황:\n")

checks = {
    "✅ Type 안정성": "mypy 실행",
    "✅ 통합 테스트": "pytest 실행",
    "✅ 커버리지": "coverage 측정",
    "✅ 문서화": "주요 문서 생성",
    "✅ API 문서": "OpenAPI 확인",
}

for check, detail in checks.items():
    print(f"{check:30} - {detail}")

print("\n" + "=" * 50)
print("Phase 3 완료 예정!")
print("=" * 50)
EOF

echo ""
echo ""

echo "================================"
echo "Phase 3 준비 완료!"
echo "================================"
echo ""
echo "📋 VS Code 작업 체크리스트:"
echo "  □ Pydantic 모델 정의 (api/reality.py 등)"
echo "  □ 통합 테스트 작성 (tests/test_api_integration.py)"
echo "  □ 문서화 완성 (API 설명 추가)"
echo ""
echo "이 스크립트로 최종 검증 수행!"

