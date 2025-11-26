#!/bin/bash
# AUTUS 외부 알림(슬랙) 연동 예시 스크립트
# 1. 치명적 오류/복구/상태 리포트 발생 시 슬랙 Webhook으로 알림 전송

SLACK_WEBHOOK_URL="https://hooks.slack.com/services/your/webhook/url"  # 실제 Webhook URL로 교체 필요
REPORT_DIR="./reports"
LOG_DIR="./logs"

# 1. 최근 상태 리포트/알림/복구 로그 추출
REPORT_FILE=$(ls -t $REPORT_DIR/autus_status_report_*.md 2>/dev/null | head -1)
ALERT_LOG=$(tail -10 "$LOG_DIR/alert.log" 2>/dev/null)
RECOVERY_LOG=$(tail -10 "$LOG_DIR/recovery.log" 2>/dev/null)

# 2. 슬랙 메시지 생성 (최대 2000자)
MSG="*AUTUS 시스템 알림*\n\n최근 상태 리포트: $REPORT_FILE\n\n[Alert Log]\n$ALERT_LOG\n\n[Recovery Log]\n$RECOVERY_LOG"
MSG_SHORT=$(echo "$MSG" | head -c 2000)

# 3. 슬랙 Webhook 전송
curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"$MSG_SHORT\"}" "$SLACK_WEBHOOK_URL"

echo "[슬랙 알림 전송 완료] $REPORT_FILE"
