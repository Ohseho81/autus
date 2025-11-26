#!/bin/bash
# AUTUS 장애 예측 스크립트 (간단 버전)
# - 최근 로그/메트릭 기반 장애 예측 (에러 빈도, 경고 패턴 등)
# - 결과: ./logs/predict_failure_$(date +"%Y-%m-%d_%H-%M-%S").log

LOG_DIR="./logs"
PREDICT_LOG="$LOG_DIR/predict_failure_$(date +"%Y-%m-%d_%H-%M-%S").log"

mkdir -p "$LOG_DIR"

echo "[PREDICT FAILURE] $(date) :: Prediction started." | tee -a "$PREDICT_LOG"

LATEST_LOG=$(ls -t $LOG_DIR/*.log 2>/dev/null | head -1)
if [ -z "$LATEST_LOG" ]; then
    echo "[PREDICT FAILURE] No logs found." | tee -a "$PREDICT_LOG"
    exit 0
fi

# 최근 100줄에서 에러/경고 빈도 측정
ERROR_COUNT=$(tail -100 "$LATEST_LOG" | grep -E "(ERROR|Exception|Traceback|CRITICAL)" | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -ge 5 ]; then
    echo "[PREDICT FAILURE] 장애 가능성 높음! 최근 에러 $ERROR_COUNT건" | tee -a "$PREDICT_LOG"
else
    echo "[PREDICT FAILURE] 장애 가능성 낮음. 최근 에러 $ERROR_COUNT건" | tee -a "$PREDICT_LOG"
fi
