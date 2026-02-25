#!/bin/bash
# Supabase 환경변수·연결 검증 스크립트
# 사용법: ./scripts/verify-supabase-env.sh
# 또는: source .env 2>/dev/null; ./scripts/verify-supabase-env.sh

set -e

echo "════════════════════════════════════════"
echo " Supabase 연결·환경변수 검증"
echo "════════════════════════════════════════"
echo ""

# 1. 로컬 .env 체크
if [ -f "vercel-api/.env.local" ]; then
  echo "✓ vercel-api/.env.local 존재"
  source vercel-api/.env.local 2>/dev/null || true
elif [ -f ".env" ]; then
  echo "✓ .env 존재"
  source .env 2>/dev/null || true
else
  echo "⚠ .env 파일 없음 (vercel-api/.env.local 또는 .env)"
fi

echo ""

# 2. 환경변수 존재 여부 (값은 노출 안 함)
check_var() {
  local name=$1
  if [ -n "${!name}" ]; then
    echo "✓ $name 설정됨"
    return 0
  else
    echo "✗ $name 미설정"
    return 1
  fi
}

check_var "NEXT_PUBLIC_SUPABASE_URL" || true
check_var "SUPABASE_SERVICE_ROLE_KEY" || true
check_var "VITE_SUPABASE_URL" || true
check_var "VITE_SUPABASE_ANON_KEY" || true

echo ""

# 3. API로 연결 테스트 (vercel-api 실행 중이면)
if command -v curl &>/dev/null; then
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health/supabase" 2>/dev/null | grep -q 200; then
    echo "→ 로컬 API 연결 테스트:"
    curl -s "http://localhost:3000/api/health/supabase" | head -c 500
    echo ""
  else
    echo "→ 로컬 API 미실행. 검증하려면: cd vercel-api && npm run dev"
    echo "  이후 https://autus-ai.com/api/health/supabase 로 프로덕션 확인"
  fi
fi

echo ""
echo "════════════════════════════════════════"
