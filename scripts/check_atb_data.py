#!/usr/bin/env python3
"""
atb_* 테이블 데이터 현황 확인
- 앱 데이터 업로드 여부
- 강사별 수업 업로드 여부
"""

import os
import sys

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "https://pphzvnaedmzcvpxjulti.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

try:
    from supabase import create_client
except ImportError:
    print("❌ supabase 패키지 필요: pip install supabase")
    sys.exit(1)

if not SUPABASE_KEY:
    print("❌ 환경변수 필요: SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_ANON_KEY")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def count(table: str) -> int:
    try:
        r = supabase.table(table).select("id", count="exact", head=True).execute()
        return r.count or 0
    except Exception as e:
        print(f"   ⚠️ {table}: {e}")
        return -1

def main():
    print("\n" + "="*60)
    print("📊 atb_* 데이터 현황 확인")
    print("="*60)

    # 1. 앱 핵심 데이터
    print("\n🔹 앱 데이터")
    students = count("atb_students")
    coaches = count("atb_coaches")
    classes = count("atb_classes")
    payments = count("atb_payments")
    attendance = count("atb_attendance")

    print(f"   atb_students  : {students:>6}명" if students >= 0 else "   atb_students  : 테이블 없음/에러")
    print(f"   atb_coaches   : {coaches:>6}명" if coaches >= 0 else "   atb_coaches   : 테이블 없음/에러")
    print(f"   atb_classes   : {classes:>6}개" if classes >= 0 else "   atb_classes   : 테이블 없음/에러")
    print(f"   atb_payments  : {payments:>6}건" if payments >= 0 else "   atb_payments  : 테이블 없음/에러")
    print(f"   atb_attendance: {attendance:>6}건" if attendance >= 0 else "   atb_attendance: 테이블 없음/에러")

    # 2. 강사별 수업 (atb_classes.coach_id)
    print("\n🔹 강사별 수업")
    try:
        r = supabase.table("atb_classes").select("id, name, coach_id").execute()
        rows = r.data or []
        with_coach = sum(1 for c in rows if c.get("coach_id"))
        print(f"   총 수업: {len(rows)}개")
        print(f"   강사 배정됨: {with_coach}개")
        if rows and with_coach == 0:
            print("   ⚠️ 강사 배정 필요 - coach_id가 비어있음")
        elif rows:
            print("   ✅ 강사별 수업 데이터 있음")
    except Exception as e:
        print(f"   ⚠️ 조회 실패: {e}")

    # 3. 요약
    print("\n" + "="*60)
    if students > 0 and classes > 0 and coaches > 0:
        print("✅ 앱 데이터 + 강사별 수업 업로드 완료")
    elif students > 0:
        print("⚠️ 학생만 업로드됨. 강사/수업 업로드 필요")
        print("   → scripts/upload_coaches_classes.py 실행")
    else:
        print("⚠️ 데이터 없음. 업로드 필요")
        print("   - 학생: scripts/upload_students_to_supabase.py")
        print("   - 강사/수업: scripts/upload_coaches_classes.py")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
