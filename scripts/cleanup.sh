#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS 자동 정리 스크립트
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "🧹 AUTUS 프로젝트 정리 시작..."

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.."

# 1. Python 캐시 삭제
echo "📦 Python 캐시 삭제..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true
find . -name ".pytest_cache" -type d -exec rm -rf {} + 2>/dev/null || true

# 2. Node.js 캐시 삭제
echo "📦 Node.js 캐시 삭제..."
find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name ".nuxt" -type d -exec rm -rf {} + 2>/dev/null || true
rm -rf frontend/node_modules/.cache 2>/dev/null || true

# 3. 임시 파일 삭제
echo "🗑️ 임시 파일 삭제..."
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "*.log" -type f -delete 2>/dev/null || true
find . -name "*.tmp" -type f -delete 2>/dev/null || true

# 4. 빈 디렉토리 삭제
echo "📁 빈 디렉토리 삭제..."
find . -type d -empty -delete 2>/dev/null || true

# 5. 빈 Python 파일 삭제 (선택적)
if [ "$1" = "--aggressive" ]; then
    echo "⚠️ Aggressive 모드: 빈 Python 파일 삭제..."
    find backend -type f -name "*.py" -size 0 -delete 2>/dev/null || true
fi

# 6. 크기 확인
echo ""
echo "📊 정리 후 크기:"
du -sh backend frontend docs monitoring 2>/dev/null || true

# 7. 파일 수 확인
echo ""
echo "📊 소스 파일 수:"
find . -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" \) ! -path "./node_modules/*" ! -path "./.git/*" ! -path "./frontend/node_modules/*" | wc -l

echo ""
echo "✅ 정리 완료!"
