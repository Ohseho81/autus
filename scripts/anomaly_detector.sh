#!/bin/bash
# AUTUS 실시간 이상 탐지 스크립트
# - 로그/메트릭 기반 실시간 이상 탐지 및 관리자 알림
# - 결과: ./logs/anomaly_$(date +"%Y-%m-%d_%H-%M-%S").log

LOG_DIR="./logs"
ALERT_SCRIPT="./scripts/send_slack_alert.sh"
ANOMALY_LOG="$LOG_DIR/anomaly_$(date +"%Y-%m-%d_%H-%M-%S").log"

mkdir -p "$LOG_DIR"

echo "[ANOMALY DETECTOR] $(date) :: Monitoring started." | tee -a "$ANOMALY_LOG"

# 최근 에러/경고 패턴 탐지 (예: ERROR, Exception, Traceback)
LATEST_LOG=$(ls -t $LOG_DIR/*.log 2>/dev/null | head -1)
if [ -z "$LATEST_LOG" ]; then
    echo "[ANOMALY DETECTOR] No logs found." | tee -a "$ANOMALY_LOG"
    exit 0
fi

if grep -E "(ERROR|Exception|Traceback|Segmentation fault|CRITICAL)" "$LATEST_LOG"; then
    echo "[ANOMALY DETECTOR] Anomaly detected in $LATEST_LOG!" | tee -a "$ANOMALY_LOG"
    if [ -f "$ALERT_SCRIPT" ]; then
        $ALERT_SCRIPT "[AUTUS][ANOMALY] 이상 탐지: $LATEST_LOG" | tee -a "$ANOMALY_LOG"
    fi
else
    echo "[ANOMALY DETECTOR] No anomaly detected." | tee -a "$ANOMALY_LOG"
fi
