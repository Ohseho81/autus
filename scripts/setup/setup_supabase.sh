#!/bin/bash
# Supabase 연동 원클릭 설정
# .env 또는 mobile-app/.env에 Supabase URL과 ANON_KEY 설정 후 실행

set -e
cd "$(dirname "$0")/.."

echo "╔═══════════════════════════════════════════╗"
echo "║  📊 Supabase 연동 설정                    ║"
echo "╚═══════════════════════════════════════════╝"

# .env 로드
[ -f .env ] && set -a && source .env && set +a
[ -f mobile-app/.env ] && set -a && source mobile-app/.env && set +a
# EXPO_PUBLIC_ 우선 (mobile-app/.env) → check_atb_data.py가 VITE_ 사용
export VITE_SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-$VITE_SUPABASE_URL}"
export VITE_SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-$VITE_SUPABASE_ANON_KEY}"

echo ""
echo "1️⃣ atb_* 데이터 현황 확인..."
# mobile-app/.env에서 EXPO 키 가져와 python에 전달 (루트 .env의 placeholder 덮어쓰기)
source mobile-app/.env 2>/dev/null || true
export VITE_SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-$VITE_SUPABASE_URL}"
export VITE_SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-$VITE_SUPABASE_ANON_KEY}"
source .env 2>/dev/null || true
# EXPO가 있으면 다시 적용 (루트 .env가 덮어썼을 수 있음)
export VITE_SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-$VITE_SUPABASE_URL}"
export VITE_SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-$VITE_SUPABASE_ANON_KEY}"
python3 scripts/check_atb_data.py || true

echo ""
echo "2️⃣ 강사/수업 업로드 (SERVICE_ROLE_KEY 필요)..."
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -n "$SUPABASE_SERVICE_KEY" ]; then
  python3 scripts/upload_coaches_classes.py --default 2>/dev/null || echo "   (RLS로 실패 시 Supabase Dashboard에서 service_role 키 확인)"
else
  echo "   ⏭️ SUPABASE_SERVICE_ROLE_KEY 미설정, 건너뜀"
fi

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║  🌐 Vercel 환경변수 설정                 ║"
echo "╠═══════════════════════════════════════════╣"
echo "║  Vercel Dashboard → Settings → Env Vars  ║"
echo "║  VITE_SUPABASE_URL=https://pphzvnaedmzcvpxjulti.supabase.co"
echo "║  VITE_SUPABASE_ANON_KEY=(anon key)       ║"
echo "║  → Redeploy                              ║"
echo "╚═══════════════════════════════════════════╝"
