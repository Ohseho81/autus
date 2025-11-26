#!/bin/bash
# AUTUS CHANGELOG/문서 자동 생성 스크립트
# 1. 최근 git 커밋 로그 기반 CHANGELOG.md 자동 생성
# 2. docs/ 디렉토리 내 주요 문서 자동 갱신

CHANGELOG_FILE="./CHANGELOG.md"
DOCS_DIR="./docs"
DATE=$(date '+%Y-%m-%d')

# 1. CHANGELOG.md 자동 생성 (최근 50개 커밋)
echo "# AUTUS CHANGELOG (자동 생성)\n" > "$CHANGELOG_FILE"
git log -50 --pretty=format:"* %ad [%h] %s (%an)" --date=short >> "$CHANGELOG_FILE"

echo "[CHANGELOG 자동 생성 완료] $CHANGELOG_FILE"

# 2. docs/ 주요 문서 자동 갱신 (예시: 리포트/상태 요약 복사)
LATEST_REPORT=$(ls -t ./reports/autus_status_report_*.md 2>/dev/null | head -1)
if [ -n "$LATEST_REPORT" ]; then
  cp "$LATEST_REPORT" "$DOCS_DIR/last_status_report.md"
  echo "[문서 갱신] $DOCS_DIR/last_status_report.md"
fi
