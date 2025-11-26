#!/bin/bash
# AUTUS 테스트 커버리지 자동 분석 및 부족 영역 리포트
# 1. pytest-cov로 전체 커버리지 측정
# 2. 커버리지 80% 미만 파일/모듈 자동 추출
# 3. Markdown 리포트로 저장

REPORT_DIR="./reports"
DATE=$(date '+%Y-%m-%d_%H-%M-%S')
COV_REPORT_FILE="$REPORT_DIR/autus_coverage_report_$DATE.md"

mkdir -p "$REPORT_DIR"

# 1. 전체 커버리지 측정 (pytest-cov 필요)
pytest --cov=core --cov=protocols --cov=server --cov=standard --cov=packs --cov-report=term-missing:skip-covered > "$REPORT_DIR/last_cov.log" 2>&1

# 2. 80% 미만 파일 추출
deficit=$(awk '/^core\// || /^protocols\// || /^server\// || /^standard\// || /^packs\// { if ($(NF-1)+0 < 80) print $0 }' "$REPORT_DIR/last_cov.log")

# 3. Markdown 리포트 생성
echo "# AUTUS 테스트 커버리지 리포트 ($DATE)\n" > "$COV_REPORT_FILE"
echo "## 1. 전체 커버리지 결과 (80% 미만 파일만 표시)\n" >> "$COV_REPORT_FILE"
echo '\n```
'$deficit'\n```\n' >> "$COV_REPORT_FILE"
echo "\n(전체 커버리지 상세는 last_cov.log 참고)\n" >> "$COV_REPORT_FILE"

echo "[커버리지 리포트 생성 완료] $COV_REPORT_FILE"
