#!/usr/bin/env python3
"""
AUTUS QA 테스트 스크립트

실행: python tests/qa_test.py

테스트 항목:
1. API 엔드포인트 테스트
2. 상태 변화 테스트
3. 응답 시간 테스트
4. 에러 핸들링 테스트
"""

import requests
import time
import json
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════

BASE_URL = "https://autus-production.up.railway.app"
LOCAL_URL = "http://localhost:8000"

# 테스트할 URL (배포 환경)
API_URL = BASE_URL

# 테스트 결과
results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

# ═══════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════

def log_test(name: str, passed: bool, details: str = ""):
    """테스트 결과 로깅"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {name}")
    if details:
        print(f"       └─ {details}")
    
    results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details,
        "timestamp": datetime.now().isoformat()
    })
    
    if passed:
        results["passed"] += 1
    else:
        results["failed"] += 1

def measure_time(func):
    """응답 시간 측정 데코레이터"""
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = (time.time() - start) * 1000  # ms
        return result, elapsed
    return wrapper

# ═══════════════════════════════════════════════════════════════════════════
# 1️⃣ API 엔드포인트 테스트
# ═══════════════════════════════════════════════════════════════════════════

def test_health_check():
    """서버 상태 확인"""
    try:
        res = requests.get(f"{API_URL}/", timeout=10)
        log_test("서버 상태 확인", res.status_code == 200, f"Status: {res.status_code}")
    except Exception as e:
        log_test("서버 상태 확인", False, str(e))

def test_state_endpoint():
    """GET /api/v1/state 테스트"""
    try:
        start = time.time()
        res = requests.get(f"{API_URL}/api/v1/state", timeout=10)
        elapsed = (time.time() - start) * 1000
        
        passed = res.status_code == 200
        data = res.json() if passed else {}
        
        # 필수 필드 확인
        has_engine = "engine" in data
        
        log_test(
            "GET /api/v1/state 응답",
            passed and has_engine,
            f"Status: {res.status_code}, Time: {elapsed:.0f}ms, Has engine: {has_engine}"
        )
        
        # 응답 시간 테스트
        log_test(
            "GET /api/v1/state 응답 시간 (<1000ms)",
            elapsed < 1000,
            f"{elapsed:.0f}ms"
        )
        
    except Exception as e:
        log_test("GET /state 응답", False, str(e))

def test_execute_endpoint():
    """POST /api/v1/execute 테스트"""
    try:
        payload = {"action": "recover"}
        start = time.time()
        res = requests.post(
            f"{API_URL}/api/v1/execute",
            json=payload,
            timeout=10
        )
        elapsed = (time.time() - start) * 1000
        
        passed = res.status_code == 200
        
        log_test(
            "POST /execute 응답",
            passed,
            f"Status: {res.status_code}, Time: {elapsed:.0f}ms"
        )
        
    except Exception as e:
        log_test("POST /execute 응답", False, str(e))

def test_commit_endpoints():
    """Commit API 테스트"""
    try:
        # 데모 학생 생성
        res = requests.post(f"{API_URL}/api/v1/commit/demo/student", timeout=10)
        log_test(
            "POST /api/v1/commit/demo/student",
            res.status_code == 200,
            f"Status: {res.status_code}"
        )
        
        # 대시보드 조회
        res = requests.get(f"{API_URL}/api/v1/commit/person/STU_001", timeout=10)
        passed = res.status_code == 200
        data = res.json() if passed else {}
        
        log_test(
            "GET /api/v1/commit/person/{id}",
            passed and "person" in data,
            f"Status: {res.status_code}, Has person: {'person' in data}"
        )
        
    except Exception as e:
        log_test("Commit API", False, str(e))

def test_role_endpoints():
    """Role API 테스트"""
    roles = ["subject", "operator", "sponsor", "employer", "institution"]
    
    for role in roles:
        try:
            res = requests.get(f"{API_URL}/api/v1/role/ui/{role}", timeout=10)
            passed = res.status_code == 200
            
            log_test(
                f"GET /api/v1/role/ui/{role}",
                passed,
                f"Status: {res.status_code}"
            )
        except Exception as e:
            log_test(f"GET /api/v1/role/ui/{role}", False, str(e))

def test_onboarding_flow():
    """온보딩 플로우 테스트"""
    try:
        # Step 1
        res = requests.post(
            f"{API_URL}/api/v1/onboarding/step1",
            json={
                "email": "test@example.com",
                "name": "테스트 학생",
                "country": "KR"
            },
            timeout=10
        )
        passed = res.status_code == 200
        data = res.json() if passed else {}
        person_id = data.get("person_id", "")
        
        log_test(
            "온보딩 Step 1",
            passed and person_id,
            f"person_id: {person_id}"
        )
        
        if not person_id:
            return
        
        # Step 2
        res = requests.post(
            f"{API_URL}/api/v1/onboarding/step2",
            json={
                "person_id": person_id,
                "university": "테스트대학교",
                "major": "컴퓨터공학",
                "enrollment_date": "2025-03-01",
                "tuition_amount": 5000000
            },
            timeout=10
        )
        log_test("온보딩 Step 2", res.status_code == 200)
        
        # Step 3
        res = requests.post(
            f"{API_URL}/api/v1/onboarding/step3",
            json={
                "person_id": person_id,
                "employer": "테스트기업",
                "job_title": "인턴",
                "wage_amount": 2000000,
                "start_date": "2025-03-01"
            },
            timeout=10
        )
        log_test("온보딩 Step 3", res.status_code == 200)
        
        # Step 4
        res = requests.post(
            f"{API_URL}/api/v1/onboarding/step4",
            json={"person_id": person_id},
            timeout=10
        )
        passed = res.status_code == 200
        data = res.json() if passed else {}
        
        log_test(
            "온보딩 Step 4 (완료)",
            passed and data.get("completed"),
            f"completed: {data.get('completed')}"
        )
        
    except Exception as e:
        log_test("온보딩 플로우", False, str(e))

def test_auth_endpoints():
    """인증 API 테스트"""
    try:
        # Magic Link 요청
        res = requests.post(
            f"{API_URL}/api/v1/auth/magic-link/request",
            json={"email": "test@example.com"},
            timeout=10
        )
        passed = res.status_code == 200
        data = res.json() if passed else {}
        
        log_test(
            "POST /api/v1/auth/magic-link/request",
            passed and data.get("success"),
            f"success: {data.get('success')}"
        )
        
        # 토큰 검증 (개발용 토큰 사용)
        token = data.get("_dev_token", "")
        if token:
            res = requests.get(
                f"{API_URL}/api/v1/auth/magic-link/verify",
                params={"token": token},
                timeout=10
            )
            passed = res.status_code == 200
            
            log_test(
                "GET /api/v1/auth/magic-link/verify",
                passed,
                f"Status: {res.status_code}"
            )
        
    except Exception as e:
        log_test("인증 API", False, str(e))

def test_contract_endpoint():
    """계약서 API 테스트"""
    try:
        res = requests.get(f"{API_URL}/api/v1/contract/generate/STU_001", timeout=10)
        passed = res.status_code == 200
        data = res.json() if passed else {}
        
        log_test(
            "GET /api/v1/contract/generate/{id}",
            passed,
            f"contracts: {len(data.get('contracts', []))}"
        )
        
    except Exception as e:
        log_test("계약서 API", False, str(e))

# ═══════════════════════════════════════════════════════════════════════════
# 2️⃣ 응답 시간 테스트
# ═══════════════════════════════════════════════════════════════════════════

def test_response_times():
    """주요 엔드포인트 응답 시간"""
    endpoints = [
        ("GET", "/api/v1/state"),
        ("GET", "/api/v1/commit/person/STU_001"),
        ("GET", "/api/v1/role/ui/subject"),
    ]
    
    for method, path in endpoints:
        try:
            start = time.time()
            if method == "GET":
                res = requests.get(f"{API_URL}{path}", timeout=10)
            elapsed = (time.time() - start) * 1000
            
            # 기준: 1초 이내
            log_test(
                f"응답 시간 {method} {path}",
                elapsed < 1000,
                f"{elapsed:.0f}ms"
            )
        except Exception as e:
            log_test(f"응답 시간 {method} {path}", False, str(e))

# ═══════════════════════════════════════════════════════════════════════════
# 3️⃣ 에러 핸들링 테스트
# ═══════════════════════════════════════════════════════════════════════════

def test_error_handling():
    """에러 응답 테스트"""
    
    # 존재하지 않는 person
    try:
        res = requests.get(f"{API_URL}/api/v1/commit/person/INVALID_ID", timeout=10)
        log_test(
            "존재하지 않는 ID 조회",
            res.status_code in [200, 404],  # 404 또는 빈 응답
            f"Status: {res.status_code}"
        )
    except Exception as e:
        log_test("존재하지 않는 ID 조회", False, str(e))
    
    # 잘못된 역할
    try:
        res = requests.get(f"{API_URL}/api/v1/role/ui/invalid_role", timeout=10)
        log_test(
            "잘못된 역할 조회",
            res.status_code in [200, 400, 404],
            f"Status: {res.status_code}"
        )
    except Exception as e:
        log_test("잘못된 역할 조회", False, str(e))
    
    # 잘못된 JSON
    try:
        res = requests.post(
            f"{API_URL}/execute",
            data="invalid json",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        log_test(
            "잘못된 JSON 요청",
            res.status_code == 422,  # Validation Error
            f"Status: {res.status_code}"
        )
    except Exception as e:
        log_test("잘못된 JSON 요청", False, str(e))

# ═══════════════════════════════════════════════════════════════════════════
# 4️⃣ 프론트엔드 접근 테스트
# ═══════════════════════════════════════════════════════════════════════════

def test_frontend_access():
    """프론트엔드 파일 접근"""
    pages = [
        "/frontend/solar.html",
        "/frontend/solar-pure.html",
        "/frontend/solar-three.html"
    ]
    
    for page in pages:
        try:
            res = requests.get(f"{API_URL}{page}", timeout=10)
            log_test(
                f"프론트엔드 {page}",
                res.status_code == 200,
                f"Status: {res.status_code}"
            )
        except Exception as e:
            log_test(f"프론트엔드 {page}", False, str(e))

# ═══════════════════════════════════════════════════════════════════════════
# 메인 실행
# ═══════════════════════════════════════════════════════════════════════════

def run_all_tests():
    """모든 테스트 실행"""
    print("=" * 60)
    print("AUTUS QA 테스트 시작")
    print(f"API URL: {API_URL}")
    print(f"시작 시간: {datetime.now().isoformat()}")
    print("=" * 60)
    print()
    
    # 1. API 엔드포인트
    print("─" * 40)
    print("1️⃣ API 엔드포인트 테스트")
    print("─" * 40)
    test_health_check()
    test_state_endpoint()
    test_execute_endpoint()
    test_commit_endpoints()
    test_role_endpoints()
    test_onboarding_flow()
    test_auth_endpoints()
    test_contract_endpoint()
    print()
    
    # 2. 응답 시간
    print("─" * 40)
    print("2️⃣ 응답 시간 테스트")
    print("─" * 40)
    test_response_times()
    print()
    
    # 3. 에러 핸들링
    print("─" * 40)
    print("3️⃣ 에러 핸들링 테스트")
    print("─" * 40)
    test_error_handling()
    print()
    
    # 4. 프론트엔드
    print("─" * 40)
    print("4️⃣ 프론트엔드 접근 테스트")
    print("─" * 40)
    test_frontend_access()
    print()
    
    # 결과 요약
    print("=" * 60)
    print("테스트 결과 요약")
    print("=" * 60)
    total = results["passed"] + results["failed"]
    print(f"✅ PASSED: {results['passed']}/{total}")
    print(f"❌ FAILED: {results['failed']}/{total}")
    print(f"성공률: {(results['passed']/total*100):.1f}%")
    print()
    
    # 실패한 테스트 목록
    failed_tests = [t for t in results["tests"] if not t["passed"]]
    if failed_tests:
        print("❌ 실패한 테스트:")
        for t in failed_tests:
            print(f"   • {t['name']}: {t['details']}")
    else:
        print("🎉 모든 테스트 통과!")
    
    print()
    print(f"종료 시간: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # 결과 JSON 저장
    with open("tests/qa_results.json", "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("결과 저장: tests/qa_results.json")
    
    return results["failed"] == 0

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
