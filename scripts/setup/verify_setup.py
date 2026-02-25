#!/usr/bin/env python3
"""
AUTUS 설정 검증 스크립트
Supabase 연결, 테이블 상태, 데이터 확인을 자동으로 수행
"""

import os
import sys
from datetime import datetime
from supabase import create_client

# 색상 코드
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    """헤더 출력"""
    print("\n" + "=" * 60)
    print(f"{BLUE}{text}{RESET}")
    print("=" * 60)

def print_success(text):
    """성공 메시지"""
    print(f"{GREEN}✅ {text}{RESET}")

def print_error(text):
    """오류 메시지"""
    print(f"{RED}❌ {text}{RESET}")

def print_warning(text):
    """경고 메시지"""
    print(f"{YELLOW}⚠️  {text}{RESET}")

def print_info(text):
    """정보 메시지"""
    print(f"   {text}")

# ===== Supabase 설정 =====
SUPABASE_URL = "https://pphzvnaedmzcvpxjulti.supabase.co"
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def check_environment():
    """환경 변수 확인"""
    print_header("1. 환경 변수 확인")

    if SUPABASE_SERVICE_KEY:
        print_success("SUPABASE_SERVICE_KEY 설정됨")
        print_info(f"   길이: {len(SUPABASE_SERVICE_KEY)} 문자")
        return True
    else:
        print_error("SUPABASE_SERVICE_KEY 환경 변수가 없습니다")
        print_info("   해결: export SUPABASE_SERVICE_KEY='your-key'")
        return False

def check_connection():
    """Supabase 연결 확인"""
    print_header("2. Supabase 연결 확인")

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print_success("Supabase 클라이언트 생성 성공")
        print_info(f"   URL: {SUPABASE_URL}")
        return supabase
    except Exception as e:
        print_error(f"연결 실패: {e}")
        return None

def check_tables(supabase):
    """테이블 존재 확인"""
    print_header("3. 테이블 상태 확인")

    required_tables = [
        'profiles',
        'payments',
        'schedules',
        'bookings',
        'notifications'
    ]

    results = {}

    for table_name in required_tables:
        try:
            # 테이블 쿼리 시도
            result = supabase.table(table_name).select('id').limit(1).execute()
            print_success(f"{table_name} 테이블 존재")
            results[table_name] = True
        except Exception as e:
            print_error(f"{table_name} 테이블 없음")
            print_info(f"   오류: {str(e)[:100]}")
            results[table_name] = False

    # 요약
    success_count = sum(results.values())
    total_count = len(required_tables)

    print_info(f"\n   생성됨: {success_count}/{total_count} 테이블")

    if success_count == 0:
        print_warning("   → supabase_schema_v1.sql 실행 필요")
        return False
    elif success_count < total_count:
        print_warning("   → 일부 테이블 누락")
        return False
    else:
        print_success("   → 모든 테이블 정상")
        return True

def check_data(supabase):
    """데이터 확인"""
    print_header("4. 데이터 확인")

    # 학생 수
    try:
        students = supabase.table('profiles').select('id').eq('type', 'student').execute()
        student_count = len(students.data)

        if student_count > 0:
            print_success(f"학생 데이터: {student_count}명")
        else:
            print_warning("학생 데이터 없음")
            print_info("   → upload_students_secure.py 실행 필요")
    except Exception as e:
        print_error(f"학생 데이터 조회 실패: {e}")

    # 결제 데이터
    try:
        payments = supabase.table('payments').select('id').execute()
        payment_count = len(payments.data)

        if payment_count > 0:
            print_success(f"결제 데이터: {payment_count}건")
        else:
            print_info("결제 데이터 없음 (정상)")
    except Exception as e:
        print_error(f"결제 데이터 조회 실패: {e}")

    # 미수금
    try:
        unpaid = supabase.table('unpaid_payments').select('*').execute()
        unpaid_count = len(unpaid.data)

        if unpaid_count > 0:
            total_unpaid = sum(p['unpaid_amount'] for p in unpaid.data)
            print_warning(f"미수금: {unpaid_count}건 (총 {total_unpaid:,}원)")
        else:
            print_success("미수금 없음")
    except Exception as e:
        print_info(f"미수금 조회: 데이터 없음 (정상)")

def check_api():
    """FastAPI 서버 확인"""
    print_header("5. FastAPI 서버 확인")

    try:
        import requests
        response = requests.get("http://localhost:8000/", timeout=2)

        if response.status_code == 200:
            print_success("FastAPI 서버 실행 중")
            print_info(f"   http://localhost:8000/docs")
        else:
            print_warning(f"서버 응답 이상: {response.status_code}")
    except ImportError:
        print_warning("requests 패키지 없음")
        print_info("   pip3 install requests --break-system-packages")
    except Exception as e:
        print_warning("FastAPI 서버 미실행")
        print_info("   시작: python3 main.py")

def main():
    """메인 실행"""
    print("\n" + "=" * 60)
    print(f"{BLUE}🔍 AUTUS 설정 검증 스크립트{RESET}")
    print(f"{BLUE}   실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{RESET}")
    print("=" * 60)

    # 1. 환경 변수
    if not check_environment():
        print("\n" + "=" * 60)
        print_error("검증 중단: 환경 변수 설정 필요")
        print("=" * 60 + "\n")
        sys.exit(1)

    # 2. 연결
    supabase = check_connection()
    if not supabase:
        print("\n" + "=" * 60)
        print_error("검증 중단: Supabase 연결 실패")
        print("=" * 60 + "\n")
        sys.exit(1)

    # 3. 테이블
    tables_ok = check_tables(supabase)

    # 4. 데이터 (테이블이 있을 때만)
    if tables_ok:
        check_data(supabase)

    # 5. API 서버
    check_api()

    # 최종 요약
    print_header("검증 완료")

    if tables_ok:
        print_success("Supabase 설정 완료!")
        print_info("   다음 단계:")
        print_info("   1. 학생 데이터 업로드 (아직 안 했다면)")
        print_info("   2. FastAPI 서버 실행: python3 main.py")
        print_info("   3. API 테스트: http://localhost:8000/docs")
    else:
        print_warning("Supabase 테이블 생성 필요")
        print_info("   Supabase → SQL Editor → supabase_schema_v1.sql 실행")

    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
