#!/bin/bash
echo "📝 AUTUS Feedback Collector"
echo "============================"

FEEDBACK_FILE=".autus/feedback/$(date +%Y%m%d).json"
mkdir -p .autus/feedback

# 자동 피드백 수집
cat > "$FEEDBACK_FILE" << JSON
{
    "timestamp": "$(date -Iseconds)",
    "test_results": "$(python -m pytest -q --tb=no 2>&1 | tail -1)",
    "error_count": $(grep -c "ERROR" .autus/logs/*.log 2>/dev/null || echo 0),
    "success_rate": "$(python -m pytest -q --tb=no 2>&1 | grep -oP '\d+(?= passed)' || echo 0)",
    "suggestions": []
}
JSON

echo "✅ Feedback collected: $FEEDBACK_FILE"
