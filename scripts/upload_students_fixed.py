#!/usr/bin/env python3
"""
온리쌤 학생 데이터 업로드 (수정판)
students.csv → profiles 테이블 (type='student')
"""

import csv
import os
from datetime import datetime
from supabase import create_client
import sys

# Supabase 설정 (환경 변수 사용)
SUPABASE_URL = "https://dcobyicibvhpwcjqkmgw.supabase.co"
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_SERVICE_KEY:
    print("❌ 오류: SUPABASE_SERVICE_KEY 환경 변수가 설정되지 않았습니다.")
    print("다음 명령어를 실행하세요:")
    print('export SUPABASE_SERVICE_KEY="your-service-role-key"')
    sys.exit(1)

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
            # metadata에 추가 정보 저장
            metadata = {
                'birth_year': parse_birth_year(row['birth_date']),
                'school': row['school'].strip() if row['school'] and row['school'].strip() else None,
                'needs_shuttle': parse_shuttle(row['shuttle_required'])
            }

            student = {
                'type': 'student',  # 필수: profiles 테이블 체크 제약
                'name': row['name'].strip(),
                'phone': row['parent_phone'].strip() if row['parent_phone'] else None,
                'metadata': metadata,
                'status': row['status'].strip() if row['status'] else 'active'
            }
            students.append(student)

    return students

def upload_students(students, batch_size=50):
    """학생 데이터를 Supabase에 업로드 (품질 우선)"""
    total = len(students)
    success_count = 0
    error_count = 0
    errors = []

    print(f"\n{'='*60}")
    print(f"📊 총 {total}건의 학생 데이터 업로드 시작")
    print(f"{'='*60}\n")

    for i in range(0, total, batch_size):
        batch = students[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size

        try:
            print(f"[배치 {batch_num}/{total_batches}] {len(batch)}건 업로드 중...", end=' ')

            result = supabase.table('profiles').insert(batch).execute()

            success_count += len(batch)
            print(f"✅ 성공")

        except Exception as e:
            error_count += len(batch)
            print(f"❌ 실패")
            print(f"   오류: {str(e)[:100]}")

            # 개별 업로드 시도 (품질 우선)
            print(f"   개별 재시도 중...")
            for student in batch:
                try:
                    supabase.table('profiles').insert([student]).execute()
                    success_count += 1
                    error_count -= 1
                    print(f"      ✅ {student['name']}")
                except Exception as e2:
                    error_msg = f"{student['name']}: {str(e2)}"
                    errors.append(error_msg)
                    print(f"      ❌ {error_msg[:80]}")

    return success_count, error_count, errors

def check_existing_data():
    """기존 데이터 확인"""
    try:
        result = supabase.table('profiles').select('id, name, type').eq('type', 'student').execute()
        return len(result.data)
    except Exception as e:
        print(f"❌ 기존 데이터 확인 실패: {e}")
        return None

def verify_data_quality(students):
    """데이터 품질 검증 (품질 우선)"""
    print("\n🔍 데이터 품질 검증 중...")

    issues = []

    # 1. 필수 필드 체크
    no_name = [s for s in students if not s['name'] or not s['name'].strip()]
    if no_name:
        issues.append(f"⚠️  이름 없음: {len(no_name)}건")

    # 2. 전화번호 형식 체크
    invalid_phone = [s for s in students if s['phone'] and not s['phone'].startswith('010-')]
    if invalid_phone:
        issues.append(f"⚠️  전화번호 형식 오류: {len(invalid_phone)}건")

    # 3. 중복 확인
    names = [s['name'] for s in students]
    duplicates = [n for n in names if names.count(n) > 1]
    if duplicates:
        issues.append(f"⚠️  중복 이름: {len(set(duplicates))}개 ({', '.join(set(duplicates)[:3])}...)")

    if issues:
        print("   발견된 문제:")
        for issue in issues:
            print(f"   {issue}")
        return False
    else:
        print("   ✅ 모든 검증 통과!")
        return True

def main():
    print("\n" + "="*60)
    print("📚 온리쌤 학생 데이터 업로드 시스템 v2.0")
    print("="*60)

    # 1. 기존 데이터 확인
    print("\n🔍 기존 데이터 확인 중...")
    existing_count = check_existing_data()
    if existing_count is not None:
        print(f"   현재 profiles 테이블 (type=student): {existing_count}건")

        if existing_count > 0:
            answer = input(f"\n⚠️  {existing_count}건의 기존 학생이 있습니다. 계속 진행하시겠습니까? (y/n): ")
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

    # 3. 데이터 품질 검증
    verify_data_quality(students)

    # 4. 데이터 미리보기
    print("\n📋 데이터 미리보기 (처음 3건):")
    for i, student in enumerate(students[:3], 1):
        school = student['metadata'].get('school') or '학교미정'
        birth = student['metadata'].get('birth_year') or '생년미정'
        print(f"   {i}. {student['name']} - {student['phone']} - {school} ({birth}년생)")

    # 5. 업로드 확인
    answer = input(f"\n✅ {len(students)}건의 데이터를 업로드하시겠습니까? (y/n): ")
    if answer.lower() != 'y':
        print("❌ 업로드 취소")
        sys.exit(0)

    # 6. 업로드 실행
    success, error, error_list = upload_students(students)

    # 7. 결과 출력
    print(f"\n{'='*60}")
    print("🎉 업로드 완료!")
    print(f"{'='*60}")
    print(f"✅ 성공: {success}/{len(students)}건 ({success/len(students)*100:.1f}%)")
    print(f"❌ 실패: {error}/{len(students)}건")

    if error > 0:
        print(f"\n실패 상세:")
        for err in error_list[:10]:
            print(f"  - {err}")
        if len(error_list) > 10:
            print(f"  ... 외 {len(error_list)-10}건")

    print(f"{'='*60}\n")

    # 8. 검증
    if success > 0:
        print("🔍 업로드 검증 중...")
        final_count = check_existing_data()
        if final_count:
            print(f"   ✅ profiles 테이블 학생 수: {final_count}건")

if __name__ == '__main__':
    main()
