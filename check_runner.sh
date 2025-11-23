#!/bin/bash

echo "🔍 어떤 Runner를 사용해야 할까?"
echo "=" * 60

# ANTHROPIC_API_KEY 확인
if grep -q "ANTHROPIC_API_KEY" .env 2>/dev/null; then
    echo "✅ ANTHROPIC_API_KEY 발견"
    echo "   → runner.py 사용 가능!"
else
    echo "❌ ANTHROPIC_API_KEY 없음"
fi

# OPENAI_API_KEY 확인
if grep -q "OPENAI_API_KEY" .env 2>/dev/null; then
    echo "✅ OPENAI_API_KEY 발견"
    
    # openai 모듈 확인
    if python3 -c "import openai" 2>/dev/null; then
        echo "   ✅ openai 모듈 설치됨"
        echo "   → openai_runner.py 사용 가능!"
    else
        echo "   ❌ openai 모듈 없음"
        echo "   → pip install openai 필요"
    fi
else
    echo "❌ OPENAI_API_KEY 없음"
fi

echo ""
echo "📦 Pack 설정:"
grep "provider:" packs/development/*.yaml | head -1

echo ""
echo "💡 추천:"
echo "  모든 팩이 'anthropic'으로 설정됨"
echo "  → python3 core/pack/runner.py 사용!"
