#!/bin/bash
# AUTUS Self-Healing Automation Script
# 1. 장애 감지 (테스트/운영)
# 2. 자동 진단 및 원인 분석
# 3. 롤백/재시작/복구
# 4. 관리자 알림 (슬랙/이메일/로컬 로그)
# 5. 리포트 자동화

LOG_DIR="./logs"
RECOVERY_DIR="./recovery"
ALERT_EMAIL="admin@example.com"  # 실제 운영시 이메일/슬랙 Hook 등으로 교체
SELF_HEAL_LOG="$LOG_DIR/self_heal.log"

mkdir -p "$LOG_DIR" "$RECOVERY_DIR"

echo "[SELF-HEAL] $(date) :: Self-healing process started." | tee -a "$SELF_HEAL_LOG"

# 1. 장애 감지 (테스트 실패, 프로세스 다운 등)
pytest > "$LOG_DIR/last_test.log" 2>&1
if grep -E "(ImportError|SyntaxError|FileNotFoundError|Segmentation fault|Exception)" "$LOG_DIR/last_test.log"; then
    echo "[SELF-HEAL] Critical error detected!" | tee -a "$SELF_HEAL_LOG"
    # 2. 자동 진단/원인 분석 (에러 로그 요약)
    tail -20 "$LOG_DIR/last_test.log" | tee -a "$SELF_HEAL_LOG"
    # 3. 롤백/복구 (스냅샷/롤백 스크립트 활용)
    if [ -f ./scripts/rollback.sh ]; then
        echo "[SELF-HEAL] Running rollback..." | tee -a "$SELF_HEAL_LOG"
        ./scripts/rollback.sh | tee -a "$SELF_HEAL_LOG"
    fi
    # 4. 관리자 알림 (로컬 로그/슬랙)
    if [ -f ./scripts/send_slack_alert.sh ]; then
        ./scripts/send_slack_alert.sh "[AUTUS][SELF-HEAL] 장애 감지 및 롤백 수행!" | tee -a "$SELF_HEAL_LOG"
    fi
    # 5. 무한루프 재시작
    if [ -f ./scripts/autus_infinite_loop.sh ]; then
        echo "[SELF-HEAL] Restarting infinite loop..." | tee -a "$SELF_HEAL_LOG"
        ./scripts/autus_infinite_loop.sh &
    fi
    exit 1
else
    echo "[SELF-HEAL] No critical errors detected. System healthy." | tee -a "$SELF_HEAL_LOG"
fi
