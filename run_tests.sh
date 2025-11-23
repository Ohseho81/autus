#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 AUTUS 테스트 실행 - 현재 상태 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 기존 테스트 실행
echo "1️⃣  기존 테스트 실행 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pytest tests/ -v --tb=short -x 2>&1 | tee test_results.txt
EXISTING_STATUS=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  새로운 통합 테스트 실행 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 2. Memory OS 통합 테스트
echo ""
echo "📦 Memory OS 통합 테스트..."
pytest tests/protocols/memory/test_memory_integration_comprehensive.py -v --tb=short

# 3. Identity 통합 테스트
echo ""
echo "🆔 Identity 통합 테스트..."
pytest tests/protocols/identity/test_identity_integration_comprehensive.py -v --tb=short

# 4. Auth 통합 테스트
echo ""
echo "🔐 Auth 통합 테스트..."
pytest tests/protocols/auth/test_auth_integration_comprehensive.py -v --tb=short

# 5. Workflow 통합 테스트
echo ""
echo "🔄 Workflow 통합 테스트..."
pytest tests/protocols/workflow/test_workflow_integration_comprehensive.py -v --tb=short

# 6. ARMP 리스크 테스트
echo ""
echo "🛡️  ARMP 전체 리스크 테스트..."
pytest tests/armp/test_all_risks_comprehensive.py -v --tb=short

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  성능 벤치마크 (optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "벤치마크를 실행하려면:"
echo "pytest tests/performance/test_benchmarks.py --benchmark-only"
echo ""

# 4. 테스트 커버리지
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  테스트 커버리지 계산 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pytest tests/ --cov=protocols --cov=core --cov-report=term-missing --cov-report=html

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 테스트 요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 테스트 통계 추출
python << 'PYTHON'
import re

try:
    with open('test_results.txt', 'r') as f:
        content = f.read()

    # pytest 결과 파싱
    passed = len(re.findall(r'PASSED', content))
    failed = len(re.findall(r'FAILED', content))
    skipped = len(re.findall(r'SKIPPED', content))
    errors = len(re.findall(r'ERROR', content))

    total = passed + failed + skipped + errors

    print(f"총 테스트: {total}")
    print(f"✅ 통과: {passed}")
    print(f"❌ 실패: {failed}")
    print(f"⏭️  스킵: {skipped}")
    print(f"💥 에러: {errors}")
    print()

    if total > 0:
        success_rate = (passed / total) * 100
        print(f"성공률: {success_rate:.1f}%")

        if success_rate == 100:
            print("🎉 모든 테스트 통과!")
        elif success_rate >= 90:
            print("👍 대부분의 테스트 통과")
        elif success_rate >= 70:
            print("⚠️  일부 테스트 실패")
        else:
            print("❗ 많은 테스트 실패 - 수정 필요")

except FileNotFoundError:
    print("테스트 결과 파일을 찾을 수 없습니다.")
except Exception as e:
    print(f"결과 파싱 중 오류: {e}")
PYTHON

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 생성된 파일:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "- test_results.txt (테스트 결과)"
echo "- htmlcov/ (커버리지 리포트)"
echo ""
echo "커버리지 리포트 보기:"
echo "open htmlcov/index.html (Mac)"
echo "xdg-open htmlcov/index.html (Linux)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
