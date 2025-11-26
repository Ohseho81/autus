#!/bin/bash
# AUTUS 보안/품질 점검 자동화 스크립트
# 1. lint (flake8)
# 2. SAST (bandit)
# 3. dependency check (pip-audit)
# 4. 결과 리포트 저장

REPORT_DIR="./reports"
DATE=$(date '+%Y-%m-%d_%H-%M-%S')
LINT_LOG="$REPORT_DIR/lint_report_$DATE.log"
SAST_LOG="$REPORT_DIR/sast_report_$DATE.log"
DEP_LOG="$REPORT_DIR/dependency_report_$DATE.log"

mkdir -p "$REPORT_DIR"

# 1. Lint (flake8)
flake8 . --exclude=.venv,snapshots,__pycache__,.git > "$LINT_LOG" || true

# 2. SAST (bandit)
bandit -r . -x .venv,snapshots,__pycache__,.git > "$SAST_LOG" || true

# 3. Dependency check (pip-audit)
pip-audit > "$DEP_LOG" || true

echo "[보안/품질 점검 완료] 리포트: $LINT_LOG, $SAST_LOG, $DEP_LOG"
