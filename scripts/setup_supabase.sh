#!/bin/bash
# Supabase 연동 원클릭 설정
# .env에 SUPABASE_* 또는 VITE_SUPABASE_* 설정 후 실행

set -e
cd "$(dirname "$0")/.."

echo "╔═══════════════════════════════════════════╗"
echo "║  📊 Supabase 연동 설정                    ║"
echo "╚═══════════════════════════════════════════╝"

# .env 로드
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo ""
echo "1️⃣ atb_* 데이터 현황 확인..."
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
