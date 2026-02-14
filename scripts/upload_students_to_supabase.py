#!/usr/bin/env python3
"""
온리쌤 학생 데이터 업로드
students.csv → atb_students 테이블
"""

import csv
from datetime import datetime
from supabase import create_client
import sys

# Supabase 설정
SUPABASE_URL = "https://pphzvnaedmzcvpxjulti.supabase.co"
SUPABASE_SERVICE_KEY = "your-supabase-service-role-key-here"

# Supabase 클라이언트 생성
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def parse_birth_year(birth_date_str):
    """birth_date에서 연도만 추출"""
    if not birth_date_str or birth_date_str.strip() == '':
        return None
    try:
        # 2016-01-01 형식
        return int(birth_date_str.split('-')[0])
    except:
        return None

def parse_shuttle(shuttle_str):
    """shuttle_required를 boolean으로 변환"""
    if not shuttle_str:
        return False
    return shuttle_str.lower() in ['true', '1', 'yes', 't']

def load_students_from_csv(csv_path):
    """CSV 파일에서 학생 데이터 로드"""
    students = []

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            student = {
                'name': row['name'].strip(),
                'parent_phone': row['parent_phone'].strip() if row['parent_phone'] else None,
                'school': row['school'].strip() if row['school'] and row['school'].strip() else None,
                'birth_year': parse_birth_year(row['birth_date']),
                'needs_shuttle': parse_shuttle(row['shuttle_required']),
                'status': row['status'].strip() if row['status'] else 'active'
            }
            students.append(student)

    return students

def upload_students(students, batch_size=50):
    """학생 데이터를 Supabase에 업로드"""
    total = len(students)
    success_count = 0
    error_count = 0

    print(f"\n{'='*60}")
    print(f"📊 총 {total}건의 학생 데이터 업로드 시작")
    print(f"{'='*60}\n")

    for i in range(0, total, batch_size):
        batch = students[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size

        try:
            print(f"[배치 {batch_num}/{total_batches}] {len(batch)}건 업로드 중...", end=' ')

            result = supabase.table('atb_students').insert(batch).execute()

            success_count += len(batch)
            print(f"✅ 성공")

        except Exception as e:
            error_count += len(batch)
            print(f"❌ 실패")
            print(f"   오류: {str(e)[:100]}")

            # 개별 업로드 시도
            print(f"   개별 재시도 중...")
            for student in batch:
                try:
                    supabase.table('atb_students').insert([student]).execute()
                    success_count += 1
                    error_count -= 1
                    print(f"      ✅ {student['name']}")
                except Exception as e2:
                    print(f"      ❌ {student['name']}: {str(e2)[:50]}")

    return success_count, error_count

def check_existing_data():
    """기존 데이터 확인"""
    try:
        result = supabase.table('atb_students').select('id, name').execute()
        return len(result.data)
    except Exception as e:
        print(f"❌ 기존 데이터 확인 실패: {e}")
        return None

def main():
    print("\n" + "="*60)
    print("📚 온리쌤 학생 데이터 업로드 시스템")
    print("="*60)

    # 1. 기존 데이터 확인
    print("\n🔍 기존 데이터 확인 중...")
    existing_count = check_existing_data()
    if existing_count is not None:
        print(f"   현재 atb_students 테이블: {existing_count}건")

        if existing_count > 0:
            answer = input(f"\n⚠️  {existing_count}건의 기존 데이터가 있습니다. 계속 진행하시겠습니까? (y/n): ")
            if answer.lower() != 'y':
                print("❌ 업로드 취소")
                sys.exit(0)

    # 2. CSV 파일 로드
    print("\n📂 students.csv 파일 로드 중...")
    try:
        students = load_students_from_csv('students.csv')
        print(f"   ✅ {len(students)}건 로드 완료")
    except Exception as e:
        print(f"   ❌ 파일 로드 실패: {e}")
        sys.exit(1)

    # 3. 데이터 미리보기
    print("\n📋 데이터 미리보기 (처음 3건):")
    for i, student in enumerate(students[:3], 1):
        print(f"   {i}. {student['name']} - {student['parent_phone']} - {student['school'] or '학교미정'}")

    # 4. 업로드 확인
    answer = input(f"\n✅ {len(students)}건의 데이터를 업로드하시겠습니까? (y/n): ")
    if answer.lower() != 'y':
        print("❌ 업로드 취소")
        sys.exit(0)

    # 5. 업로드 실행
    success, error = upload_students(students)

    # 6. 결과 출력
    print(f"\n{'='*60}")
    print("🎉 업로드 완료!")
    print(f"{'='*60}")
    print(f"✅ 성공: {success}/{len(students)}건")
    print(f"❌ 실패: {error}/{len(students)}건")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
