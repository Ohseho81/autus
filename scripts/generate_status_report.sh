#!/bin/bash
# AUTUS 상태 리포트 자동 생성 스크립트
# 1. 전체 테스트 결과 요약
# 2. 최근 자동수정/복구 이력 요약
# 3. 시스템 상태(에러, 복구, 무한루프 등) 요약
# 4. Markdown 리포트로 저장

REPORT_DIR="./reports"
LOG_DIR="./logs"
RECOVERY_DIR="./recovery"
DATE=$(date '+%Y-%m-%d_%H-%M-%S')
REPORT_FILE="$REPORT_DIR/autus_status_report_$DATE.md"

mkdir -p "$REPORT_DIR"

# 1. 전체 테스트 결과
pytest --maxfail=5 --disable-warnings > "$LOG_DIR/last_test_full.log" 2>&1
TEST_SUMMARY=$(tail -20 "$LOG_DIR/last_test_full.log")

# 2. 최근 복구/알림/수정 이력
ALERT_LOG=$(tail -20 "$LOG_DIR/alert.log" 2>/dev/null)
RECOVERY_LOG=$(tail -20 "$LOG_DIR/recovery.log" 2>/dev/null)

# 3. 시스템 상태
INFINITE_LOOP_STATUS=$(ps aux | grep autus_infinite_loop.sh | grep -v grep)

# 4. Markdown 리포트 생성
echo "# AUTUS 시스템 상태 리포트 ($DATE)\n" > "$REPORT_FILE"
echo "## 1. 테스트 결과 요약\n" >> "$REPORT_FILE"
echo '\n```
'$TEST_SUMMARY'\n```\n' >> "$REPORT_FILE"
echo "## 2. 최근 복구/알림/수정 이력\n" >> "$REPORT_FILE"
echo '\n**[Alert Log]**\n' >> "$REPORT_FILE"
echo '\n```
'$ALERT_LOG'\n```\n' >> "$REPORT_FILE"
echo '\n**[Recovery Log]**\n' >> "$REPORT_FILE"
echo '\n```
'$RECOVERY_LOG'\n```\n' >> "$REPORT_FILE"
echo "## 3. 무한루프/프로세스 상태\n" >> "$REPORT_FILE"
echo '\n```
'$INFINITE_LOOP_STATUS'\n```\n' >> "$REPORT_FILE"

echo "[리포트 생성 완료] $REPORT_FILE"
