#!/bin/bash
echo "🤖 AUTUS 테스트 스크립트 자동 생성"
echo "===================================="

export $(cat .env | grep OPENAI_API_KEY)

# 5개 핵심 스크립트만 생성
scripts=(
    "benchmark_performance.py:Performance benchmark - Identity 1000x, Workflow 1000x, timing and ops/sec"
    "demo_identity.py:Identity demo - 5 random identities with 3D coords and reproducibility test"
    "demo_workflow.py:Workflow demo - morning routine and email automation examples"
    "demo_complete.py:Complete demo - Zero Identity, Workflow, Privacy check, Constitution compliance"
    "final_checklist.py:Validation checklist - files, protocols, packs, docs. Save to JSON"
)

count=0
for script in "${scripts[@]}"; do
    count=$((count + 1))
    file="${script%%:*}"
    purpose="${script#*:}"
    
    echo ""
    echo "[$count/5] 생성: $file"
    
    python core/pack/runner.py codegen_pack "{\"file_path\":\"$file\",\"purpose\":\"$purpose\"}" --provider openai
    
    [ -f "$file" ] && echo "✅ 완료!" || echo "❌ 실패"
    [ $count -lt 5 ] && sleep 3
done

echo ""
echo "✅ 생성 완료!"
ls -lh *.py 2>/dev/null | grep -E "benchmark|demo|final"
