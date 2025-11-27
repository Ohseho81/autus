"""
AUTUS 보안/운영/배포 자동화 시나리오 테스트
- 5개 주요 기능(권한, 감사, 장애감지, 스냅샷/롤백, 알림) 자동 검증
"""
import os
from security_ops import check_permission, audit_log, detect_and_recover, create_snapshot, rollback_to_snapshot, notify_slack, AUDIT_PATH, SNAPSHOT_DIR

def test_permission():
    assert check_permission('admin', 'DEPLOY')
    assert not check_permission('user1', 'DEPLOY')
    print('권한 체크 테스트 통과')

def test_audit_log():
    audit_log({'user': 'test', 'action': 'TEST', 'result': 'ok'})
    assert os.path.exists(AUDIT_PATH)
    print('감사 로그 테스트 통과')

def test_detect_and_recover():
    # 실패 3회 로그 생성
    from datetime import datetime
    import json
    log_path = os.path.join(os.path.dirname(__file__), '../.vscode/autus-vs-command-log.json')
    logs = [{"status": "실패", "timestamp": datetime.now().isoformat()} for _ in range(3)]
    json.dump(logs, open(log_path, 'w'), indent=2, ensure_ascii=False)
    assert detect_and_recover()
    print('장애감지/복구 테스트 통과')

def test_snapshot_and_rollback():
    from datetime import datetime
    import json
    log_path = os.path.join(os.path.dirname(__file__), '../.vscode/autus-vs-command-log.json')
    logs = [{"status": "성공", "timestamp": datetime.now().isoformat()}]
    json.dump(logs, open(log_path, 'w'), indent=2, ensure_ascii=False)
    create_snapshot()
    snaps = [f for f in os.listdir(SNAPSHOT_DIR) if f.endswith('.json')]
    assert snaps
    snap_path = os.path.join(SNAPSHOT_DIR, snaps[-1])
    rollback_to_snapshot(snap_path)
    print('스냅샷/롤백 테스트 통과')

def test_notify_slack():
    notify_slack('테스트 알림')
    print('알림 테스트 통과')

if __name__ == '__main__':
    test_permission()
    test_audit_log()
    test_detect_and_recover()
    test_snapshot_and_rollback()
    test_notify_slack()
    print('모든 보안/운영/배포 자동화 테스트 통과')
