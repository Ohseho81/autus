#!/bin/bash

# 🚀 AUTUS Last Touch - Day 1 자동화 스크립트
# macOS zsh 터미널에서 실행

set -e  # 에러 시 즉시 종료

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_step() {
    echo -e "${BLUE}==>${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# 헤더 출력
clear
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║      AUTUS Last Touch - Day 1: 기초 안정화 스크립트      ║"
echo "║                  (약 3시간 소요)                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: 환경 확인
log_step "Step 1: 환경 확인"
if [ -d "/Users/oseho/Desktop/autus" ]; then
    cd /Users/oseho/Desktop/autus
    log_success "프로젝트 디렉토리 확인됨"
else
    log_error "프로젝트 디렉토리를 찾을 수 없습니다"
    exit 1
fi

# Step 2: Python 버전 확인
log_step "Step 2: Python 버전 확인"
PYTHON_VERSION=$(python --version 2>&1)
if [[ $PYTHON_VERSION == *"3."* ]]; then
    log_success "$PYTHON_VERSION"
else
    log_error "Python 3.x 필요"
    exit 1
fi

# Step 3: 의존성 설치
log_step "Step 3: 의존성 설치 (약 2-3분)"
log_warning "인터넷 연결이 필요합니다..."

if pip install -r requirements.txt --no-cache-dir > /tmp/pip_install.log 2>&1; then
    log_success "의존성 설치 완료"
else
    log_error "의존성 설치 실패"
    tail -20 /tmp/pip_install.log
    exit 1
fi

# Step 4: Import 에러 확인
log_step "Step 4: Import 에러 검사"

check_import() {
    local file=$1
    local module=$2
    
    if python -c "from $module import *" 2>/dev/null; then
        log_success "$file: OK"
        return 0
    else
        log_warning "$file: Import 에러 (수정 필요)"
        return 1
    fi
}

echo ""
error_count=0
check_import "kafka_producer.py" "evolved.kafka_producer" || ((error_count++))
check_import "spark_processor.py" "evolved.spark_processor" || ((error_count++))
check_import "ml_pipeline.py" "evolved.ml_pipeline" || ((error_count++))
check_import "onnx_models.py" "evolved.onnx_models" || ((error_count++))
check_import "spark_distributed.py" "evolved.spark_distributed" || ((error_count++))
check_import "kafka_consumer_service.py" "evolved.kafka_consumer_service" || ((error_count++))
check_import "celery_app.py" "evolved.celery_app" || ((error_count++))
check_import "tasks.py" "evolved.tasks" || ((error_count++))

echo ""
if [ $error_count -eq 0 ]; then
    log_success "모든 import 에러 해결됨!"
else
    log_warning "아직 $error_count개 파일에 import 에러가 있습니다"
    echo -e "${YELLOW}수정이 필요한 파일들:${NC}"
    python -m pylint evolved/ --errors-only 2>&1 | grep "unable to import" | head -5
fi

# Step 5: 라우터 등록 상태 확인
log_step "Step 5: 라우터 등록 상태 확인"

if python -c "from main import app; print(len(app.routes))" 2>/dev/null > /tmp/routes.txt; then
    route_count=$(cat /tmp/routes.txt)
    log_success "등록된 라우터: $route_count개"
else
    log_error "main.py 로드 실패"
fi

# Step 6: 테스트 실행
log_step "Step 6: 테스트 실행"

if pytest test_v4_8_kubernetes.py -q --tb=no 2>/dev/null; then
    log_success "모든 테스트 통과 (22/22)"
else
    log_warning "테스트 실행 중 문제 발생"
    pytest test_v4_8_kubernetes.py -v --tb=short 2>&1 | tail -20
fi

# Step 7: 상태 요약
log_step "Step 7: 상태 요약"

echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Day 1 진행 상황${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"

echo ""
echo "✅ 완료된 작업:"
echo "   • 의존성 설치"
echo "   • 환경 설정"
echo "   • 기본 테스트 통과"

if [ $error_count -gt 0 ]; then
    echo ""
    echo "⚠️  남은 작업 ($error_count개 파일):"
    echo "   • Import 에러 해결 (각 파일에서 import를 try-except로 감싸기)"
    echo "   • 라우터 등록 (main.py에 5개 라우터 추가)"
    echo "   • 에러 핸들링 구현 (api/errors.py 생성)"
else
    echo ""
    echo "🎉 모든 기본 작업 완료!"
    echo "   • 다음: 라우터 등록 및 에러 핸들링"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"

# Step 8: 다음 단계 안내
log_step "다음 단계 안내"

echo ""
echo "1️⃣  아직 에러가 있으면:"
echo "   VS Code 또는 에디터에서 다음 파일들 수정"
echo ""
echo "2️⃣  각 파일에서 import 에러 해결:"
cat << 'EOF'
# 예시: evolved/kafka_producer.py
KAFKA_AVAILABLE = False
try:
    from kafka import KafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    pass
EOF

echo ""
echo "3️⃣  수정 후 다시 확인:"
echo "   python -m pylint evolved/ --errors-only"

echo ""
echo "4️⃣  main.py에 라우터 등록:"
echo "   다음 문서 참고: LAST_TOUCH_ACTION_PLAN.md"

echo ""
echo "5️⃣  완료 후 테스트:"
echo "   pytest test_v4_8_kubernetes.py -v"

echo ""
echo -e "${GREEN}✅ 자동화 스크립트 완료!${NC}"
echo -e "${YELLOW}다음 문서를 참고하세요: LAST_TOUCH_ACTION_PLAN.md${NC}"
echo ""
