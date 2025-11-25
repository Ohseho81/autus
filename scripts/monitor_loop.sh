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
