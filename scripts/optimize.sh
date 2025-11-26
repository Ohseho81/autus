#!/bin/bash
echo "⚡ AUTUS Performance Optimizer"
echo "==============================="

# 1. 캐시 정리
echo "🧹 Cleaning caches..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

# 2. 메모리 사용량 분석
echo "📊 Memory analysis..."
python << 'PY'
import sys
import os
total = 0
for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith('.py'):
            total += os.path.getsize(os.path.join(root, f))
print(f"Total Python code: {total / 1024:.1f} KB")
PY

# 3. API 비용 추정
echo "💰 API cost estimate..."
if [ -f ".autus/cost_log.json" ]; then
    cat .autus/cost_log.json | python -c "import json,sys; data=json.load(sys.stdin); print(f'Total cost: \${sum(d.get(\"cost\",0) for d in data):.2f}')"
fi

# 4. 최적화 제안
echo "💡 Optimization suggestions:"
echo "  - Use caching for repeated LLM calls"
echo "  - Batch similar operations"
echo "  - Use smaller models for simple tasks"
