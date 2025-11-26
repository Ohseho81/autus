#!/bin/bash
# AUTUS Emergency Recovery & Alert System
# 1. 치명적 오류 감지 (ImportError, SyntaxError, 파일 손상 등)
# 2. 자동 복구 시도 (백업/롤백)
# 3. 관리자 알림 (슬랙/이메일/로컬 로그)
# 4. 무한루프 재시작 또는 안전모드 진입

LOG_DIR="./logs"
RECOVERY_DIR="./recovery"
ALERT_EMAIL="admin@example.com"  # 실제 운영시 이메일/슬랙 Hook 등으로 교체

mkdir -p "$LOG_DIR" "$RECOVERY_DIR"

# 1. 최근 테스트 실행 및 에러 감지
echo "[RECOVERY] Running pytest for error detection..."
pytest > "$LOG_DIR/last_test.log" 2>&1

if grep -E "(ImportError|SyntaxError|FileNotFoundError)" "$LOG_DIR/last_test.log"; then
    echo "[RECOVERY] Critical error detected!"
    # 2. 손상 파일 자동 백업 및 롤백 시도 (예시: pattern_tracker.py)
    if grep -q "pattern_tracker.py" "$LOG_DIR/last_test.log"; then
        echo "[RECOVERY] Attempting to restore pattern_tracker.py from last known good version..."
        if [ -f "$RECOVERY_DIR/pattern_tracker.py.bak" ]; then
            cp "$RECOVERY_DIR/pattern_tracker.py.bak" ./protocols/identity/pattern_tracker.py
            echo "[RECOVERY] pattern_tracker.py restored from backup." >> "$LOG_DIR/recovery.log"
        else
            echo "[RECOVERY] No backup found for pattern_tracker.py! Manual intervention required." >> "$LOG_DIR/recovery.log"
        fi
    fi
    # 3. 관리자 알림 (로컬 로그/이메일)
    echo "[ALERT] Critical error detected. See $LOG_DIR/last_test.log" | tee -a "$LOG_DIR/alert.log"
    # 실제 운영시 메일/슬랙 연동 가능
    # mail -s "AUTUS Critical Error" $ALERT_EMAIL < "$LOG_DIR/last_test.log"
    # 4. 무한루프 재시작 (옵션)
    echo "[RECOVERY] Restarting infinite loop..."
    ./scripts/autus_infinite_loop.sh &
    exit 1
else
    echo "[RECOVERY] No critical errors detected. System healthy."
fi
