#!/bin/bash
# ============================================
# 🚀 AUTUS 배포 스크립트
# ============================================

set -e

echo "╔═══════════════════════════════════════════╗"
echo "║         🚀 AUTUS 배포 시작                ║"
echo "╚═══════════════════════════════════════════╝"

# 환경변수 체크
if [ ! -f ".env" ]; then
    echo "❌ .env 파일이 없습니다. .env.example을 참고하세요."
    exit 1
fi

# 1. KRATON V2 빌드
echo ""
echo "📦 1/4. KRATON V2 빌드..."
cd kraton-v2
npm install
npm run build
cd ..

# 2. Git 커밋 & 푸시
echo ""
echo "📤 2/4. Git 푸시..."
git add -A
git commit -m "deploy: $(date +%Y%m%d-%H%M%S)" || true
git push origin main

# 3. Supabase Edge Functions 배포 (선택 - supabase link 필요)
if command -v supabase &> /dev/null; then
    echo ""
    echo "☁️  3/4. Supabase Functions 배포..."
    (cd supabase && supabase functions deploy attendance-chain --no-verify-jwt) || echo "   (supabase link 미설정, Functions 건너뜀)"
else
    echo ""
    echo "⚠️  3/4. Supabase CLI 없음, Functions 배포 건너뜀"
fi

# 4. Vercel 배포 (자동 트리거됨)
echo ""
echo "🌐 4/4. Vercel 배포 자동 트리거..."

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║         ✅ 배포 완료!                     ║"
echo "╠═══════════════════════════════════════════╣"
echo "║  🌐 https://autus-ai.com                  ║"
echo "║  🏀 https://autus-ai.com/#allthatbasket   ║"
echo "╚═══════════════════════════════════════════╝"
