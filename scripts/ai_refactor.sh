#!/bin/bash
# AUTUS AI Refactor Script
# - 변경된 파일/PR/커밋에 대해 AI 기반 코드 리팩터링 자동화
# - OpenAI API 활용 (core/pack/openai_runner.py)
# - 결과: ./reports/ai_refactor_$(date +"%Y-%m-%d_%H-%M-%S").md

REFACTOR_TARGET=${1:-"."}
REPORT_FILE="./reports/ai_refactor_$(date +"%Y-%m-%d_%H-%M-%S").md"
PYTHON_BIN="./.venv/bin/python"

mkdir -p ./reports

echo "[AI REFACTOR] Target: $REFACTOR_TARGET"

# 변경 파일 목록 추출 (git diff, PR 등)
CHANGED_FILES=$(git diff --name-only HEAD~1 $REFACTOR_TARGET | grep -E '\.py$')

if [ -z "$CHANGED_FILES" ]; then
    echo "[AI REFACTOR] No Python files changed."
    exit 0
fi

echo "[AI REFACTOR] Files: $CHANGED_FILES"

for FILE in $CHANGED_FILES; do
    CODE_CONTENT=$(cat "$FILE")
    JSON_INPUT=$(jq -nc --arg code "$CODE_CONTENT" --arg file "$FILE" '{file: $file, code: $code}')
    $PYTHON_BIN core/pack/openai_runner.py refactor_pack "$JSON_INPUT" >> "$REPORT_FILE"
    echo -e "\n---\n" >> "$REPORT_FILE"
done

echo "[AI REFACTOR] Report generated: $REPORT_FILE"
