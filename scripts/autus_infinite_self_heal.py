"""
AUTUS 무한 순환/자가치유 자동화 루프
- 어댑터/테스트/보안/정책/배포 등 전체 파이프라인을 무한 루프로 순환
- 오류/실패 감지 시 자동 수정/복구/재실행/고도화
"""
import time
import subprocess
import os

LOOP_INTERVAL = 10  # 초 단위, 필요시 조정

while True:
    print("[AUTUS] 무한 순환/자가치유 루프 시작")
    # 1. 어댑터/테스트 자동화
    subprocess.run(['python3', 'adapters/adapter_test_runner.py'])
    # 2. 보안/운영/배포 자동화 테스트
    subprocess.run(['python3', 'core/security_ops_test.py'])
    # 3. AI/정책 추천/고도화(예시: 정책 추천만 출력)
    subprocess.run(['python3', 'adapters/ai_policy_recommender.py'])
    # 4. 오류/실패/이상 감지 및 자동 복구(보안/운영 정책 활용)
    from core.security_ops import detect_and_recover
    if detect_and_recover():
        print('[AUTUS] 연속 실패/이상 감지! 자동 복구/고도화 시도')
        # 예시: 스냅샷 롤백, Slack 알림, 정책 강화 등
        from core.security_ops import create_snapshot, rollback_to_snapshot, SNAPSHOT_DIR
        snaps = [f for f in os.listdir(SNAPSHOT_DIR) if f.endswith('.json')]
        if snaps:
            rollback_to_snapshot(os.path.join(SNAPSHOT_DIR, snaps[-1]))
    print("[AUTUS] 루프 1회 완료. {}초 후 재시작...".format(LOOP_INTERVAL))
    time.sleep(LOOP_INTERVAL)
