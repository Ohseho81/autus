#!/bin/bash
# AUTUS 커버리지 부족 파일 기반 신규 테스트/팩 자동 생성 제안
# 1. 커버리지 리포트에서 80% 미만 파일 추출
# 2. 각 파일별 테스트 템플릿 자동 생성 (제안)
# 3. Markdown 제안서로 저장

REPORT_DIR="./reports"
DATE=$(date '+%Y-%m-%d_%H-%M-%S')
COV_LOG="$REPORT_DIR/last_cov.log"
SUGGEST_FILE="$REPORT_DIR/autus_test_suggestion_$DATE.md"

mkdir -p "$REPORT_DIR"

# 1. 80% 미만 파일 추출
deficit_files=$(awk '/^core\// || /^protocols\// || /^server\// || /^standard\// || /^packs\// { if ($(NF-1)+0 < 80) print $1 }' "$COV_LOG")

# 2. 각 파일별 테스트 템플릿 제안
{
  echo "# AUTUS 신규 테스트/팩 자동 생성 제안 ($DATE)\n"
  echo "## 1. 커버리지 부족 파일 목록 (80% 미만)\n"
  echo '\n```
'$deficit_files'\n```\n'
  echo "## 2. 파일별 테스트/팩 템플릿 제안\n"
  for f in $deficit_files; do
    base=$(basename "$f" .py)
    test_file="tests/$(echo $f | sed 's/\//_/g')"
    echo "### $f"
    echo '\n```python'
    echo "# 자동 생성 제안: $test_file"
    echo "import pytest"
    echo "from $f import *"
    echo "def test_placeholder():"
    echo "    assert True  # TODO: 실제 테스트 구현"
    echo '```'
    echo
  done
} > "$SUGGEST_FILE"

echo "[신규 테스트/팩 제안서 생성 완료] $SUGGEST_FILE"
