#!/usr/bin/env python3
"""
AUTUS 학생 데이터 업로드 (환경 변수 버전)
보안 강화: Service Role Key를 환경 변수로 관리
"""

import os
import csv
from datetime import datetime
from supabase import create_client

# ===== Supabase 설정 =====
SUPABASE_URL = "https://pphzvnaedmzcvpxjulti.supabase.co"

# 환경 변수에서 Service Role Key 읽기
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_SERVICE_KEY:
    print("❌ 오류: SUPABASE_SERVICE_KEY 환경 변수가 설정되지 않았습니다.")
    print("\n💡 해결 방법:")
    print("   export SUPABASE_SERVICE_KEY='your-service-role-key'")
    print("   python3 upload_students_secure.py")
    exit(1)

# Supabase 클라이언트 생성
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("✅ Supabase 연결 성공")
except Exception as e:
    print(f"❌ Supabase 연결 실패: {e}")
    exit(1)

# ===== CSV 파일 경로 =====
CSV_FILE = "/sessions/modest-bold-einstein/mnt/autus/students.csv"

def validate_connection():
    """Supabase 연결 및 테이블 존재 확인"""
    try:
        # profiles 테이블 쿼리 테스트
        result = supabase.table('profiles').select('id').limit(1).execute()
        print("✅ profiles 테이블 접근 가능")
        return True
    except Exception as e:
        print(f"❌ 테이블 접근 실패: {e}")
        print("\n💡 해결 방법:")
        print("   1. Supabase 대시보드 → SQL Editor")
        print("   2. supabase_schema_v1.sql 실행")
        return False

def load_students_from_csv():
    """CSV에서 학생 데이터 로드"""
    students = []

    try:
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                # 생년월일 → birth_year 변환
                birth_year = None
                if row.get('birth_date'):
                    try:
                        birth_year = int(row['birth_date'][:4])
                    except:
                        pass

                student = {
                    'type': 'student',
                    'name': row['name'],
                    'phone': row.get('parent_phone'),
                    'metadata': {
                        'birth_year': birth_year,
                        'school': row.get('school'),
                        'needs_shuttle': row.get('shuttle_required') == '필요',
                        'original_status': row.get('status')
                    },
                    'status': 'active' if row.get('status') == '재원' else 'inactive'
                }

                students.append(student)

        print(f"✅ CSV 로드 완료: {len(students)}명")
        return students

    except FileNotFoundError:
        print(f"❌ 파일을 찾을 수 없습니다: {CSV_FILE}")
        return []
    except Exception as e:
        print(f"❌ CSV 로드 실패: {e}")
        return []

def upload_students_batch(students, batch_size=50):
    """학생 데이터 배치 업로드"""
    total = len(students)
    success = 0
    failed = 0

    print(f"\n📤 {total}명 학생 데이터 업로드 시작...")
    print(f"   배치 크기: {batch_size}명")
    print("=" * 60)

    # 배치로 나누기
    for i in range(0, total, batch_size):
        batch = students[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(f"\n[Batch {batch_num}/{total_batches}] {len(batch)}명 업로드 중...")

        try:
            # 배치 업로드
            result = supabase.table('profiles').insert(batch).execute()

            if result.data:
                success += len(result.data)
                print(f"  ✅ 성공: {len(result.data)}명")
            else:
                print(f"  ⚠️  경고: 응답 데이터 없음")

        except Exception as e:
            print(f"  ❌ 배치 실패: {e}")

            # 개별 재시도
            print(f"  🔄 개별 재시도 중...")
            for student in batch:
                try:
                    supabase.table('profiles').insert(student).execute()
                    success += 1
                    print(f"    ✅ {student['name']}")
                except Exception as e2:
                    failed += 1
                    print(f"    ❌ {student['name']}: {e2}")

    # 최종 결과
    print("\n" + "=" * 60)
    print(f"✅ 성공: {success}/{total}명")
    print(f"❌ 실패: {failed}/{total}명")

    if failed > 0:
        print("\n💡 실패한 경우:")
        print("   - 중복 데이터인 경우: 이미 업로드되었을 수 있음")
        print("   - 테이블 없음: supabase_schema_v1.sql 실행 필요")

    return success, failed

def main():
    """메인 실행"""
    print("\n" + "=" * 60)
    print("🚀 AUTUS 학생 데이터 업로드 (환경 변수 버전)")
    print("=" * 60)

    # 1. 연결 확인
    if not validate_connection():
        exit(1)

    # 2. CSV 로드
    students = load_students_from_csv()
    if not students:
        exit(1)

    # 3. 업로드
    success, failed = upload_students_batch(students)

    # 4. 완료
    print("\n" + "=" * 60)
    if failed == 0:
        print("✅ 모든 학생 데이터 업로드 완료!")
        print("\n📊 다음 단계:")
        print("   1. Supabase 대시보드에서 데이터 확인")
        print("   2. FastAPI 서버 실행: python3 main.py")
        print("   3. API 테스트: http://localhost:8000/docs")
    else:
        print("⚠️  일부 업로드 실패")
        print("\n💡 FIX_401_ERROR.md 참고하여 해결")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
