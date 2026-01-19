#!/bin/bash

# ============================================
# AUTUS API 테스트 스크립트
# Vercel Edge Functions 전체 검증
# ============================================

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# API URL 설정
API_URL="${AUTUS_API_URL:-https://vercel-api-two-rust.vercel.app}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}🧪 AUTUS API 전체 테스트${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "API URL: ${YELLOW}${API_URL}${NC}"
echo ""

# 테스트 카운터
PASSED=0
FAILED=0

# 테스트 함수
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -e "${YELLOW}▶ 테스트: ${name}${NC}"
    
    START_TIME=$(date +%s%N)
    
    if [ "$method" == "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}${endpoint}" 2>/dev/null)
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}" 2>/dev/null)
    fi
    
    END_TIME=$(date +%s%N)
    ELAPSED=$(( (END_TIME - START_TIME) / 1000000 ))
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # success:true 체크
    if [[ "$BODY" == *'"success":true'* ]]; then
        echo -e "  ${GREEN}✅ 성공${NC} (${ELAPSED}ms)"
        echo -e "  ${CYAN}응답: ${BODY:0:100}...${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ 실패${NC} (${ELAPSED}ms) - HTTP ${HTTP_CODE}"
        echo -e "  ${RED}응답: ${BODY:0:200}${NC}"
        ((FAILED++))
    fi
    echo ""
}

# ============================================
# 1. Physics Engine 테스트
# ============================================
echo -e "${CYAN}[1/4] Physics Engine 테스트${NC}"
echo "────────────────────────────────────────────"

test_endpoint \
    "V 계산 (기본)" \
    "POST" \
    "/api/physics" \
    '{"action":"calculate_v","mint":1000000,"tax":300000,"synergy":0.15,"time":1}'

# ============================================
# 2. Organisms API 테스트
# ============================================
echo -e "${CYAN}[2/4] Organisms API 테스트${NC}"
echo "────────────────────────────────────────────"

test_endpoint \
    "유기체 목록 조회" \
    "GET" \
    "/api/organisms?userId=550e8400-e29b-41d4-a716-446655440001" \
    ""

# ============================================
# 3. Physics 통합 테스트
# ============================================
echo -e "${CYAN}[3/4] Physics 통합 테스트${NC}"
echo "────────────────────────────────────────────"

test_endpoint \
    "Physics 상태 조회" \
    "GET" \
    "/api/physics?userId=550e8400-e29b-41d4-a716-446655440001" \
    ""

# ============================================
# 4. Claude Brain 테스트
# ============================================
echo -e "${CYAN}[4/4] Claude Brain 테스트${NC}"
echo "────────────────────────────────────────────"

test_endpoint \
    "보상 카드 생성" \
    "POST" \
    "/api/brain" \
    '{"action":"generate_reward_card","payload":{"role":"owner","context":"테스트"}}'

# ============================================
# 결과 요약
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}📊 테스트 결과 요약${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${GREEN}✅ 성공: ${PASSED}개${NC}"
echo -e "  ${RED}❌ 실패: ${FAILED}개${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 테스트 통과! Phase 2 준비 완료!${NC}"
else
    echo -e "${YELLOW}⚠️ 일부 테스트 실패 (Claude API 키 미설정 가능)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
