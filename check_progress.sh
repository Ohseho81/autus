#!/bin/bash
echo "📊 AUTUS 자동 개발 진행 상황"
echo "========================================"
echo ""

# 생성 예정 파일 목록
declare -a critical=(
    "protocols/identity/viewer.py"
    "protocols/identity/surface.py"
    "protocols/auth/qr_generator.py"
    "protocols/auth/sync.py"
    "protocols/memory/query.py"
    "protocols/workflow/executor.py"
)

declare -a important=(
    "server/api/identity.py"
    "server/api/workflow.py"
    "server/api/memory.py"
    "core/pack/validator.py"
    "core/pack/registry.py"
)

declare -a nice=(
    "sdk/python/autus_sdk/__init__.py"
    "examples/dashboard/app.py"
    "tools/deployment/docker/Dockerfile"
)

# Critical 체크
echo "🔴 Critical (Week 4):"
critical_done=0
for file in "${critical[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "  ✅ $file ($lines lines)"
        critical_done=$((critical_done + 1))
    else
        echo "  ⏳ $file (대기 중)"
    fi
done
echo "  진행률: $critical_done/${#critical[@]} ($(( critical_done * 100 / ${#critical[@]} ))%)"

# Important 체크
echo ""
echo "🟡 Important (Week 5-6):"
important_done=0
for file in "${important[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "  ✅ $file ($lines lines)"
        important_done=$((important_done + 1))
    else
        echo "  ⏳ $file (대기 중)"
    fi
done
echo "  진행률: $important_done/${#important[@]} ($(( important_done * 100 / ${#important[@]} ))%)"

# Nice to Have 체크
echo ""
echo "🟢 Nice to Have (Week 7-8):"
nice_done=0
for file in "${nice[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "  ✅ $file ($lines lines)"
        nice_done=$((nice_done + 1))
    else
        echo "  ⏳ $file (대기 중)"
    fi
done
echo "  진행률: $nice_done/${#nice[@]} ($(( nice_done * 100 / ${#nice[@]} ))%)"

# 전체 통계
total=$((${#critical[@]} + ${#important[@]} + ${#nice[@]}))
done=$((critical_done + important_done + nice_done))
percentage=$(( done * 100 / total ))

echo ""
echo "========================================"
echo "📈 전체 진행률: $done/$total ($percentage%)"
echo ""

# 최근 생성된 파일
echo "🕐 최근 생성된 파일 (5개):"
find protocols server core sdk examples tools -name "*.py" -type f 2>/dev/null | \
    xargs ls -lt 2>/dev/null | head -5 | \
    awk '{print "  " $9 " (" $5 " bytes, " $6 " " $7 " " $8 ")"}'

echo ""
echo "💡 Tip: 실시간 모니터링 → watch -n 5 ./check_progress.sh"
