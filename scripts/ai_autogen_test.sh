#!/bin/bash
# AUTUS AI 기반 테스트/코드 자동 생성 스크립트
# 1. 커버리지 부족 파일/함수 자동 탐지
# 2. OpenAI API로 테스트 코드 자동 생성 요청
# 3. 결과를 tests/autogen/에 저장

OPENAI_API_KEY=${OPENAI_API_KEY:-"sk-..."}  # 환경변수 또는 직접 입력
REPORT_DIR="./reports"
AUTOGEN_DIR="./tests/autogen"
DATE=$(date '+%Y-%m-%d_%H-%M-%S')
COV_LOG="$REPORT_DIR/last_cov.log"
LOG_FILE="$REPORT_DIR/ai_autogen_test_$DATE.log"

mkdir -p "$AUTOGEN_DIR" "$REPORT_DIR"

deficit_files=$(awk '/^core\// || /^protocols\// || /^server\// || /^standard\// || /^packs\// { if ($(NF-1)+0 < 80) print $1 }' "$COV_LOG")

# python 경로 고정
PYTHON="/Users/ohseho/Desktop/autus/.venv/bin/python"
for f in $deficit_files; do
  abs_path="$(pwd)/$f"
  base=$(basename "$f" .py)
  test_file="$AUTOGEN_DIR/test_${base}_autogen.py"
  code=$(cat "$f")
  prompt="다음 Python 코드의 테스트 코드를 pytest 스타일로 생성해줘.\n\n$code"
  echo "[AI 요청] $f → $test_file" | tee -a "$LOG_FILE"
  response=$(curl https://api.openai.com/v1/chat/completions \
    -sS \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
      "model": "gpt-4o",
      "messages": [
        {"role": "system", "content": "You are a helpful Python test code generator."},
        {"role": "user", "content": "'$prompt'"}
      ],
      "max_tokens": 800
    }' | jq -r '.choices[0].message.content')
  echo "$response" > "$test_file"
  echo "[생성 완료] $test_file" | tee -a "$LOG_FILE"
done

echo "[AI 기반 테스트 자동 생성 완료] 결과: $AUTOGEN_DIR, 로그: $LOG_FILE"
