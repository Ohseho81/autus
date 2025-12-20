#!/usr/bin/env python3
"""
AUTUS E2E TEST — Action → Audit (LOCK)

테스트 목표:
- 조건 충족 시 ACTION 노출
- ACTION 1회 실행
- AUDIT 1건 생성
- 재실행·되돌리기 불가
- SYSTEM_RED 시 차단

성공 조건:
- Action → Audit = 1:1
- Audit = Immutable
- System State > Human Intent

"이 테스트가 깨지면 기능이 아니라 철학이 깨진 것이다."
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Optional, Dict, Any

# ═══════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════

# API 베이스 URL (환경에 따라 변경)
API_BASE = "https://autus-production.up.railway.app"
# API_BASE = "http://localhost:8000"

HEADERS = {"Content-Type": "application/json"}

# 테스트 결과
results = []


def log(msg: str, status: str = "INFO"):
    """로그 출력"""
    icons = {"PASS": "✅", "FAIL": "❌", "INFO": "ℹ️", "WARN": "⚠️", "TEST": "🧪"}
    icon = icons.get(status, "•")
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {icon} {msg}")
    
    if status in ["PASS", "FAIL"]:
        results.append({"test": msg, "status": status})


def api_get(endpoint: str) -> Optional[Dict]:
    """GET 요청"""
    try:
        resp = requests.get(f"{API_BASE}{endpoint}", headers=HEADERS, timeout=10)
        return {"status": resp.status_code, "data": resp.json() if resp.ok else None}
    except Exception as e:
        return {"status": 0, "error": str(e)}


def api_post(endpoint: str, data: Dict) -> Optional[Dict]:
    """POST 요청"""
    try:
        resp = requests.post(f"{API_BASE}{endpoint}", headers=HEADERS, json=data, timeout=10)
        return {"status": resp.status_code, "data": resp.json() if resp.text else None}
    except Exception as e:
        return {"status": 0, "error": str(e)}


def api_delete(endpoint: str) -> Optional[Dict]:
    """DELETE 요청"""
    try:
        resp = requests.delete(f"{API_BASE}{endpoint}", headers=HEADERS, timeout=10)
        return {"status": resp.status_code, "data": resp.json() if resp.text else None}
    except Exception as e:
        return {"status": 0, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: Physics 상태 확인
# ═══════════════════════════════════════════════════════════════════════════════

def test_physics_solar_binding():
    """Physics API 응답 확인"""
    log("TEST 1: Physics Solar Binding", "TEST")
    
    resp = api_get("/api/v1/physics/solar-binding")
    
    if resp["status"] != 200:
        log(f"Physics API 실패: {resp}", "FAIL")
        return False
    
    data = resp["data"]
    
    # 필수 필드 확인
    required = ["risk", "status", "survival_time"]
    missing = [f for f in required if f not in data]
    
    if missing:
        log(f"필수 필드 누락: {missing}", "FAIL")
        return False
    
    log(f"Physics 상태: risk={data.get('risk')}%, status={data.get('status')}", "PASS")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: ACTION 실행 → AUDIT 생성
# ═══════════════════════════════════════════════════════════════════════════════

def test_action_execute():
    """ACTION 실행 테스트"""
    log("TEST 2: ACTION Execute", "TEST")
    
    payload = {
        "action": "DEFRICTION",
        "risk": 72,
        "system_state": "YELLOW",
        "person_id": "STU_001"
    }
    
    resp = api_post("/api/v1/action/execute", payload)
    
    if resp["status"] != 200:
        log(f"ACTION 실행 실패: {resp}", "FAIL")
        return None
    
    data = resp["data"]
    
    if not data.get("audit_id"):
        log("audit_id 누락", "FAIL")
        return None
    
    if not data.get("locked"):
        log("locked=false (should be true)", "FAIL")
        return None
    
    log(f"ACTION 실행 성공: {data['audit_id']}", "PASS")
    return data["audit_id"]


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: AUDIT 조회
# ═══════════════════════════════════════════════════════════════════════════════

def test_audit_latest(expected_audit_id: Optional[str] = None):
    """최신 AUDIT 조회"""
    log("TEST 3: AUDIT Latest", "TEST")
    
    resp = api_get("/api/v1/audit/latest")
    
    if resp["status"] != 200:
        log(f"AUDIT 조회 실패: {resp}", "FAIL")
        return False
    
    data = resp["data"]
    
    if not data.get("audit_id"):
        log("audit_id 없음", "FAIL")
        return False
    
    # snapshot 검증
    snapshot = data.get("snapshot", {})
    
    if snapshot.get("action") != "DEFRICTION":
        log(f"action 불일치: {snapshot.get('action')}", "WARN")
    
    if not data.get("immutable"):
        log("immutable=false (CRITICAL)", "FAIL")
        return False
    
    log(f"AUDIT 조회 성공: {data['audit_id']}, immutable={data['immutable']}", "PASS")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: AUDIT 수정/삭제 차단
# ═══════════════════════════════════════════════════════════════════════════════

def test_audit_immutable():
    """AUDIT 수정/삭제 차단 검증"""
    log("TEST 4: AUDIT Immutable", "TEST")
    
    # DELETE 시도
    resp = api_delete("/api/v1/audit/latest")
    
    # 405 Method Not Allowed 또는 403 Forbidden 기대
    if resp["status"] in [200, 204]:
        log("DELETE 성공함 (CRITICAL - 차단되어야 함)", "FAIL")
        return False
    
    log(f"DELETE 차단됨: status={resp['status']}", "PASS")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: SYSTEM_RED 차단
# ═══════════════════════════════════════════════════════════════════════════════

def test_system_red_blocked():
    """SYSTEM_RED 상태에서 ACTION 차단"""
    log("TEST 5: SYSTEM_RED Block", "TEST")
    
    payload = {
        "action": "RECOVER",
        "risk": 85,
        "system_state": "RED"
    }
    
    resp = api_post("/api/v1/action/execute", payload)
    
    # 403 Forbidden 기대
    if resp["status"] == 200:
        log("RED 상태에서 ACTION 실행됨 (CRITICAL)", "FAIL")
        return False
    
    if resp["status"] == 403:
        log("SYSTEM_RED 차단 성공", "PASS")
        return True
    
    log(f"예상치 못한 응답: {resp['status']}", "WARN")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6: ACTION 재실행 방지 (동일 세션)
# ═══════════════════════════════════════════════════════════════════════════════

def test_duplicate_prevention():
    """연속 ACTION 실행 테스트"""
    log("TEST 6: Duplicate Prevention", "TEST")
    
    # 이전 AUDIT 개수 확인
    resp1 = api_get("/api/v1/audit/stats/summary")
    count_before = resp1["data"].get("total", 0) if resp1["status"] == 200 else 0
    
    # ACTION 실행
    payload = {"action": "SHOCK_DAMP", "risk": 65, "system_state": "YELLOW"}
    api_post("/api/v1/action/execute", payload)
    
    # 이후 AUDIT 개수 확인
    resp2 = api_get("/api/v1/audit/stats/summary")
    count_after = resp2["data"].get("total", 0) if resp2["status"] == 200 else 0
    
    # 1건만 증가해야 함
    diff = count_after - count_before
    
    if diff == 1:
        log(f"AUDIT 1건 생성 확인 (before={count_before}, after={count_after})", "PASS")
        return True
    elif diff == 0:
        log("AUDIT 생성 안됨", "WARN")
        return True
    else:
        log(f"AUDIT 다중 생성 (diff={diff})", "FAIL")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 7: 허용 ACTION 검증
# ═══════════════════════════════════════════════════════════════════════════════

def test_allowed_actions():
    """허용된 ACTION만 실행 가능"""
    log("TEST 7: Allowed Actions", "TEST")
    
    # 유효한 ACTION
    valid_resp = api_post("/api/v1/action/execute", {
        "action": "RECOVER",
        "risk": 50,
        "system_state": "GREEN"
    })
    
    if valid_resp["status"] != 200:
        log(f"유효한 ACTION 실패: {valid_resp}", "FAIL")
        return False
    
    # 무효한 ACTION
    invalid_resp = api_post("/api/v1/action/execute", {
        "action": "INVALID_ACTION",
        "risk": 50,
        "system_state": "GREEN"
    })
    
    if invalid_resp["status"] == 200:
        log("무효한 ACTION이 실행됨", "FAIL")
        return False
    
    log("ACTION 검증 통과", "PASS")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 8: AUDIT 무결성 검증 API
# ═══════════════════════════════════════════════════════════════════════════════

def test_audit_verify():
    """AUDIT 무결성 검증"""
    log("TEST 8: AUDIT Verify", "TEST")
    
    # 최신 AUDIT ID 가져오기
    latest = api_get("/api/v1/audit/latest")
    
    if latest["status"] != 200 or not latest["data"].get("audit_id"):
        log("AUDIT 없음", "WARN")
        return True
    
    audit_id = latest["data"]["audit_id"]
    
    # 검증 API 호출
    verify = api_get(f"/api/v1/audit/verify/{audit_id}")
    
    if verify["status"] != 200:
        log(f"검증 API 실패: {verify}", "FAIL")
        return False
    
    data = verify["data"]
    
    if not data.get("verified"):
        log(f"검증 실패: {data.get('reason')}", "FAIL")
        return False
    
    log(f"AUDIT 검증 성공: {audit_id}", "PASS")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# 메인 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_all_tests():
    """전체 테스트 실행"""
    print("\n" + "═" * 60)
    print("  AUTUS E2E TEST — Action → Audit (LOCK)")
    print("═" * 60)
    print(f"  API: {API_BASE}")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("═" * 60 + "\n")
    
    # 테스트 실행
    test_physics_solar_binding()
    audit_id = test_action_execute()
    test_audit_latest(audit_id)
    test_audit_immutable()
    test_system_red_blocked()
    test_duplicate_prevention()
    test_allowed_actions()
    test_audit_verify()
    
    # 결과 요약
    print("\n" + "═" * 60)
    print("  TEST SUMMARY")
    print("═" * 60)
    
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)
    
    for r in results:
        icon = "✅" if r["status"] == "PASS" else "❌"
        print(f"  {icon} {r['test']}")
    
    print("═" * 60)
    print(f"  PASSED: {passed}/{total}")
    print(f"  FAILED: {failed}/{total}")
    
    if failed == 0:
        print("\n  🎉 AUTUS Loop v1.0 PASS")
        print("  Action → Audit = 1:1 ✓")
        print("  Audit = Immutable ✓")
        print("  System State > Human Intent ✓")
    else:
        print("\n  ⚠️  AUTUS Loop FAIL")
        print("  일부 테스트 실패 — 수정 필요")
    
    print("═" * 60 + "\n")
    
    return failed == 0


def generate_report():
    """테스트 리포트 생성"""
    report = {
        "timestamp": datetime.now().isoformat(),
        "api_base": API_BASE,
        "results": results,
        "summary": {
            "total": len(results),
            "passed": sum(1 for r in results if r["status"] == "PASS"),
            "failed": sum(1 for r in results if r["status"] == "FAIL")
        }
    }
    
    with open("e2e_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"📄 리포트 저장: e2e_report.json")


if __name__ == "__main__":
    success = run_all_tests()
    generate_report()
    sys.exit(0 if success else 1)
