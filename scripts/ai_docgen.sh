#!/bin/bash
# AUTUS AI 기반 문서/주석 자동 생성 스크립트
# - Python 코드에서 docstring, 주석, API 문서 자동 생성
# - OpenAI API 활용 (core/pack/openai_runner.py)
# - 결과: ./reports/ai_docgen_$(date +"%Y-%m-%d_%H-%M-%S").md

TARGET=${1:-"."}
REPORT_FILE="./reports/ai_docgen_$(date +"%Y-%m-%d_%H-%M-%S").md"
PYTHON_BIN="./.venv/bin/python"

mkdir -p ./reports

echo "[AI DOCGEN] Target: $TARGET"

# 대상 Python 파일 목록 추출 (변경 파일 또는 전체)
PY_FILES=$(find $TARGET -name '*.py' | grep -v '__pycache__')

if [ -z "$PY_FILES" ]; then
    echo "[AI DOCGEN] No Python files found."
    exit 0
fi

echo "[AI DOCGEN] Files: $PY_FILES"

for FILE in $PY_FILES; do
    CODE_CONTENT=$(cat "$FILE")
    JSON_INPUT=$(jq -nc --arg code "$CODE_CONTENT" --arg file "$FILE" '{file: $file, code: $code}')
    $PYTHON_BIN core/pack/openai_runner.py docgen_pack "$JSON_INPUT" >> "$REPORT_FILE"
    echo -e "\n---\n" >> "$REPORT_FILE"
done

echo "[AI DOCGEN] Report generated: $REPORT_FILE"
