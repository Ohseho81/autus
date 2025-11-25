#!/bin/bash

echo "🔄 AUTUS Infinite Loop Starting..."
echo "Press Ctrl+C to stop"

API_KEY=$(grep OPENAI_API_KEY .env | cut -d'=' -f2)
export OPENAI_API_KEY=$API_KEY
export PYTHONPATH=$(pwd)

MAX_ITERATIONS=100
ITERATION=0
SUCCESS_COUNT=0
FAIL_COUNT=0

# 실패 테스트 목록 가져오기
echo "📊 Getting failed tests..."
python -m pytest --collect-only -q 2>&1 | grep "FAILED" | head -20 > .autus/failed_tests.txt

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo ""
    echo "======================================"
    echo "🔄 Iteration $ITERATION/$MAX_ITERATIONS"
    echo "✅ Success: $SUCCESS_COUNT | ❌ Failed: $FAIL_COUNT"
    echo "======================================"
    
    # 실패 테스트 하나 선택
    TEST_NAME=$(head -1 .autus/failed_tests.txt 2>/dev/null || echo "")
    
    if [ -z "$TEST_NAME" ]; then
        echo "🎉 No more failed tests!"
        break
    fi
    
    echo "🎯 Target: $TEST_NAME"
    
    # 최대 3회 시도
    for ATTEMPT in {1..3}; do
        echo "  📍 Attempt $ATTEMPT/3"
        
        # 1. 테스트 실행
        ERROR_OUTPUT=$($PYTHON_BIN -m pytest "$TEST_NAME" --tb=short 2>&1)
        
        if echo "$ERROR_OUTPUT" | grep -q "passed"; then
            echo "  ✅ Test passed!"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            sed -i '' '1d' .autus/failed_tests.txt
            git add -A
            git commit -m "Auto-fix: $TEST_NAME" || true
            break
        fi
        
        # 2. 에러 분석
        echo "  📊 Analyzing..."
        $PYTHON_BIN core/pack/openai_runner.py analyzer_pack "{\n            \"pytest_output\": \"$(echo "$ERROR_OUTPUT" | head -50)\"\n        }" > .autus/logs/analysis_${ITERATION}_${ATTEMPT}.json 2>&1
        
        # 3. 수정 시도 (여기서는 로그만 - 실제 수정은 수동)
        echo "  🔧 Fix analysis saved to .autus/logs/analysis_${ITERATION}_${ATTEMPT}.json"
        
        # 실패로 카운트
        if [ $ATTEMPT -eq 3 ]; then
            echo "  ❌ Max attempts reached"
            FAIL_COUNT=$((FAIL_COUNT + 1))
            sed -i '' '1d' .autus/failed_tests.txt
        fi
        
        # 비용 절약: 짧은 대기
        sleep 2
    done
    
    # 10회마다 전체 테스트
    if [ $((ITERATION % 10)) -eq 0 ]; then
        echo "🧪 Running full test suite..."
        $PYTHON_BIN -m pytest -q --tb=no 2>&1 | tee .autus/logs/full_test_$ITERATION.log
    fi
done

echo ""
echo "======================================"
echo "🏁 Loop Complete"
echo "✅ Success: $SUCCESS_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo "======================================"
