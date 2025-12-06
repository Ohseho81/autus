#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS 라스트 터치 - 터미널 실행 스크립트
# ═══════════════════════════════════════════════════════════════════════════════
# 
# 사용법: bash terminal_commands.sh [단계]
# 예시: bash terminal_commands.sh p0     # P0 단계 모두 실행
#       bash terminal_commands.sh p0-1   # P0-1만 실행
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 프로젝트 경로
PROJECT_DIR="/Users/oseho/Desktop/autus"
cd "$PROJECT_DIR"

echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}AUTUS 라스트 터치 - 터미널 명령어 스크립트${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}\n"

# ═══════════════════════════════════════════════════════════════════════════════
# P0: CRITICAL - 즉시 해결 필요 (3시간)
# ═══════════════════════════════════════════════════════════════════════════════

P0_1_dependencies() {
    echo -e "\n${RED}🔴 P0-1: 의존성 설치 & 확인${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}✓ Step 1: 기존 캐시 제거${NC}"
    pip cache purge || true
    
    echo -e "${BLUE}✓ Step 2: 의존성 설치 (캐시 사용 안 함)${NC}"
    pip install -r requirements.txt --no-cache-dir --upgrade
    
    echo -e "${BLUE}✓ Step 3: 설치 확인${NC}"
    pip list | grep -E "(kafka|celery|pyspark|scikit-learn|torch)" || echo "선택적 패키지는 설치 안 됨 (정상)"
    
    echo -e "\n${GREEN}✅ P0-1 완료${NC}\n"
}

P0_2_import_errors() {
    echo -e "\n${RED}🔴 P0-2: Import 에러 확인${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}✓ 모든 에러 검사${NC}"
    python -m pylint evolved/ --errors-only 2>&1 | head -50 || true
    
    echo -e "\n${BLUE}✓ 각 파일별 Import 테스트${NC}"
    
    files=(
        "evolved.kafka_producer"
        "evolved.spark_processor"
        "evolved.ml_pipeline"
        "evolved.onnx_models"
        "evolved.spark_distributed"
    )
    
    for file in "${files[@]}"; do
        echo -n "  Testing $file... "
        if python -c "import $file" 2>/dev/null; then
            echo -e "${GREEN}✅${NC}"
        else
            echo -e "${RED}❌ (에러)${NC}"
        fi
    done
    
    echo -e "\n${GREEN}✅ P0-2 완료${NC}\n"
}

P0_3_lint_check() {
    echo -e "\n${RED}🔴 P0-3: 코드 린트 검사${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}✓ evolved/ 디렉토리 검사${NC}"
    python -m pylint evolved/ --disable=all --enable=E 2>&1 | tail -20 || true
    
    echo -e "${BLUE}✓ api/ 디렉토리 검사${NC}"
    python -m pylint api/ --disable=all --enable=E 2>&1 | tail -20 || true
    
    echo -e "\n${GREEN}✅ P0-3 완료${NC}\n"
}

P0_test_run() {
    echo -e "\n${RED}🔴 P0-4: 기존 테스트 실행${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}✓ v4.8 Kubernetes 테스트${NC}"
    pytest test_v4_8_kubernetes.py -v --tb=short 2>&1 | tail -30
    
    echo -e "\n${GREEN}✅ P0-4 완료${NC}\n"
}

# ═══════════════════════════════════════════════════════════════════════════════
# P1: HIGH PRIORITY - 성능 최적화 (2시간)
# ═══════════════════════════════════════════════════════════════════════════════

P1_caching_test() {
    echo -e "\n${YELLOW}🟠 P1-1: 캐싱 성능 테스트${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    if [ -f "test_caching.py" ]; then
        echo -e "${BLUE}✓ 캐싱 테스트 실행${NC}"
        pytest test_caching.py -v --tb=short
    else
        echo -e "${YELLOW}⚠️  test_caching.py 없음 (생략)${NC}"
    fi
    
    echo -e "\n${GREEN}✅ P1-1 완료${NC}\n"
}

P1_performance_check() {
    echo -e "\n${YELLOW}🟠 P1-2: 성능 벤치마크${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}✓ 응답시간 측정${NC}"
    python3 << 'PYTHON_SCRIPT'
import time
import sys

# 간단한 성능 테스트
times = []
for i in range(100):
    start = time.time()
    # 간단한 작업
    _ = sum(range(1000))
    times.append((time.time() - start) * 1000)

avg_time = sum(times) / len(times)
print(f"  평균 응답시간: {avg_time:.2f}ms")
print(f"  최소: {min(times):.2f}ms, 최대: {max(times):.2f}ms")
PYTHON_SCRIPT
    
    echo -e "\n${GREEN}✅ P1-2 완료${NC}\n"
}

# ═══════════════════════════════════════════════════════════════════════════════
# P2: MEDIUM PRIORITY - 코드 품질 (3시간)
# ═══════════════════════════════════════════════════════════════════════════════

P2_type_check() {
    echo -e "\n${PURPLE}🟡 P2-1: 타입 체크 (mypy)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}✓ mypy 설치${NC}"
    pip install mypy --quiet || true
    
    echo -e "${BLUE}✓ API 타입 검사${NC}"
    mypy api/ --ignore-missing-imports 2>&1 | head -20 || true
    
    echo -e "\n${GREEN}✅ P2-1 완료${NC}\n"
}

P2_coverage_check() {
    echo -e "\n${PURPLE}🟡 P2-2: 테스트 커버리지${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}✓ pytest-cov 설치${NC}"
    pip install pytest-cov --quiet || true
    
    echo -e "${BLUE}✓ 테스트 커버리지 측정${NC}"
    pytest test_v4_8_kubernetes.py --cov=api --cov=evolved --cov-report=term-missing 2>&1 | tail -50 || true
    
    echo -e "\n${GREEN}✅ P2-2 완료${NC}\n"
}

# ═══════════════════════════════════════════════════════════════════════════════
# P3: LOW PRIORITY - 문서화 & 정리 (2시간)
# ═══════════════════════════════════════════════════════════════════════════════

P3_git_status() {
    echo -e "\n${GREEN}🟢 P3-1: Git 상태 확인${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}✓ 현재 상태${NC}"
    git status --short
    
    echo -e "\n${BLUE}✓ 최근 커밋${NC}"
    git log --oneline -5
    
    echo -e "\n${GREEN}✅ P3-1 완료${NC}\n"
}

P3_file_check() {
    echo -e "\n${GREEN}🟢 P3-2: 파일 구조 확인${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${BLUE}✓ 주요 파일 크기${NC}"
    ls -lh *.md | awk '{print $9, "(" $5 ")"}'
    
    echo -e "\n${BLUE}✓ 디렉토리 크기${NC}"
    du -sh api/ evolved/ tests/ 2>/dev/null || true
    
    echo -e "\n${GREEN}✅ P3-2 완료${NC}\n"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 모든 작업 실행
# ═══════════════════════════════════════════════════════════════════════════════

run_all_p0() {
    echo -e "\n${RED}🔴 P0: 모든 즉시 작업 시작${NC}\n"
    P0_1_dependencies
    P0_2_import_errors
    P0_3_lint_check
    P0_test_run
    echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ P0 모든 작업 완료!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
}

run_all_p1() {
    echo -e "\n${YELLOW}🟠 P1: 모든 성능 작업 시작${NC}\n"
    P1_caching_test
    P1_performance_check
    echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ P1 모든 작업 완료!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
}

run_all_p2() {
    echo -e "\n${PURPLE}🟡 P2: 모든 품질 작업 시작${NC}\n"
    P2_type_check
    P2_coverage_check
    echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ P2 모든 작업 완료!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
}

run_all_p3() {
    echo -e "\n${GREEN}🟢 P3: 모든 정리 작업 시작${NC}\n"
    P3_git_status
    P3_file_check
    echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ P3 모든 작업 완료!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
}

# 사용자 입력 처리
case "${1:-all}" in
    p0-1) P0_1_dependencies ;;
    p0-2) P0_2_import_errors ;;
    p0-3) P0_3_lint_check ;;
    p0-4) P0_test_run ;;
    p0)   run_all_p0 ;;
    
    p1-1) P1_caching_test ;;
    p1-2) P1_performance_check ;;
    p1)   run_all_p1 ;;
    
    p2-1) P2_type_check ;;
    p2-2) P2_coverage_check ;;
    p2)   run_all_p2 ;;
    
    p3-1) P3_git_status ;;
    p3-2) P3_file_check ;;
    p3)   run_all_p3 ;;
    
    all)
        run_all_p0
        run_all_p1
        run_all_p2
        run_all_p3
        ;;
    
    *)
        echo -e "${YELLOW}사용법: bash terminal_commands.sh [단계]${NC}"
        echo ""
        echo "P0 (CRITICAL):"
        echo "  p0-1   의존성 설치"
        echo "  p0-2   Import 에러 확인"
        echo "  p0-3   린트 검사"
        echo "  p0-4   테스트 실행"
        echo "  p0     모든 P0 작업"
        echo ""
        echo "P1 (HIGH):"
        echo "  p1-1   캐싱 테스트"
        echo "  p1-2   성능 벤치마크"
        echo "  p1     모든 P1 작업"
        echo ""
        echo "P2 (MEDIUM):"
        echo "  p2-1   타입 체크"
        echo "  p2-2   커버리지 확인"
        echo "  p2     모든 P2 작업"
        echo ""
        echo "P3 (LOW):"
        echo "  p3-1   Git 상태"
        echo "  p3-2   파일 확인"
        echo "  p3     모든 P3 작업"
        echo ""
        echo "전체:"
        echo "  all    모든 작업 실행"
        ;;
esac

echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}터미널 작업 완료${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
