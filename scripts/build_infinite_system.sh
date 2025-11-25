#!/bin/bash
set -e

echo "🏗️  AUTUS Infinite Loop System Builder"
echo "===================================="

# 1. 필요한 디렉토리 생성
echo "📁 Creating directories..."
mkdir -p .autus/analysis
mkdir -p .autus/fixes
mkdir -p .autus/logs
mkdir -p .autus/history

# 2. 환경 변수 확인
echo "🔑 Checking API keys..."
if ! grep -q "OPENAI_API_KEY" .env; then
    echo "❌ OPENAI_API_KEY not found in .env"
    exit 1
fi

# 3. Python 의존성 확인
echo "🐍 Checking Python dependencies..."
PYTHON_BIN="/Users/ohseho/Desktop/autus/.venv/bin/python"
$PYTHON_BIN -c "import openai; from dotenv import load_dotenv" || {
    echo "❌ Missing dependencies"
    exit 1
}

# 4. 핵심 루프 스크립트 생성
echo "🔄 Creating infinite loop script..."
cat > scripts/autus_infinite_loop.sh << 'LOOP_EOF'
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
LOOP_EOF

chmod +x scripts/autus_infinite_loop.sh

# 5. 모니터링 스크립트 생성
echo "📊 Creating monitoring script..."
cat > scripts/monitor_loop.sh << 'MONITOR_EOF'
#!/bin/bash

echo "📊 AUTUS Loop Monitor"
echo "===================="

while true; do
    clear
    echo "📊 AUTUS Loop Monitor - $(date)"
    echo "======================================"
    
    # Git 커밋 수
    COMMITS=$(git log --oneline --since="1 hour ago" | wc -l | tr -d ' ')
    echo "📝 Commits (last hour): $COMMITS"
    
    # 테스트 상태
    if [ -f .autus/logs/full_test_*.log ]; then
        LATEST_LOG=$(ls -t .autus/logs/full_test_*.log | head -1)
        echo ""
        echo "🧪 Latest Test Results:"
        tail -3 "$LATEST_LOG"
    fi
    
    # 실패 테스트 수
    if [ -f .autus/failed_tests.txt ]; then
        REMAINING=$(wc -l < .autus/failed_tests.txt | tr -d ' ')
        echo ""
        echo "⏳ Remaining failed tests: $REMAINING"
    fi
    
    # 분석 로그 수
    ANALYSIS_COUNT=$(ls .autus/logs/analysis_*.json 2>/dev/null | wc -l | tr -d ' ')
    echo "📊 Analysis runs: $ANALYSIS_COUNT"
    
    echo ""
    echo "Press Ctrl+C to stop monitoring"
    sleep 5
done
MONITOR_EOF

chmod +x scripts/monitor_loop.sh

# 6. 긴급 중단 스크립트
echo "🛑 Creating emergency stop script..."
cat > scripts/emergency_stop.sh << 'STOP_EOF'
#!/bin/bash

echo "🛑 Emergency Stop"
echo "================="

# 실행 중인 Python 프로세스 찾기
PIDS=$(ps aux | grep "openai_runner.py\|pytest" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
    echo "✅ No processes running"
else
    echo "🛑 Killing processes: $PIDS"
    echo "$PIDS" | xargs kill -9
    echo "✅ Stopped"
fi

# Git 상태 확인
echo ""
echo "📊 Git Status:"
git status --short

echo ""
echo "💡 To rollback: git reset --hard HEAD~1"
STOP_EOF

chmod +x scripts/emergency_stop.sh

# 7. 완성 확인
echo ""
echo "✅ Build Complete!"
echo ""
echo "📋 Available Commands:"
echo "  ./scripts/autus_infinite_loop.sh   - Start infinite loop"
echo "  ./scripts/monitor_loop.sh          - Monitor progress"
echo "  ./scripts/emergency_stop.sh        - Emergency stop"
echo ""
echo "🎯 Next Steps:"
echo "  1. Review scripts in ./scripts/"
echo "  2. Run: ./scripts/autus_infinite_loop.sh"
echo "  3. In another terminal: ./scripts/monitor_loop.sh"
echo ""
