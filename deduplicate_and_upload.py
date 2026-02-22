#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
중복 제거 후 재업로드
한 학생당 1개 profile, classes는 배열로 저장
"""

import json
import os
import sys
from collections import defaultdict

# UTF-8 설정
os.environ['LANG'] = 'en_US.UTF-8'
os.environ['LC_ALL'] = 'en_US.UTF-8'
if sys.version_info >= (3, 7):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from supabase import create_client, Client

SUPABASE_URL = "https://dcobyicibvhpwcjqkmgw.supabase.co"
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_KEY:
    print("❌ SUPABASE_SERVICE_KEY 환경 변수를 설정하세요")
    sys.exit(1)

def normalize_phone(phone):
    """전화번호 정규화"""
    if not phone:
        return None
    return ''.join(filter(str.isdigit, phone))

def deduplicate_students(students):
    """
    중복 제거: 같은 전화번호 + 이름 = 같은 학생
    여러 클래스는 배열로 통합
    """
    # 전화번호 + 이름으로 그룹화
    groups = defaultdict(lambda: {
        'type': 'student',
        'name': '',
        'phone': '',
        'classes': [],
        'status': 'active',
        'metadata': {}
    })

    for student in students:
        phone = normalize_phone(student.get('phone'))
        name = student['name']
        key = (phone, name)

        # 첫 등록 시 기본 정보 설정
        if not groups[key]['name']:
            groups[key].update({
                'type': student['type'],
                'name': name,
                'phone': student.get('phone'),
                'status': student.get('status', 'active')
            })

        # 클래스 추가
        class_name = student['metadata'].get('class', 'Unknown')
        if class_name not in groups[key]['classes']:
            groups[key]['classes'].append(class_name)

        # needs_shuttle 통합
        if student['metadata'].get('needs_shuttle'):
            groups[key]['metadata']['needs_shuttle'] = True

    # 결과 변환
    result = []
    for (phone_norm, name), data in groups.items():
        # metadata에 classes 배열 저장
        data['metadata']['classes'] = data['classes']
        del data['classes']  # 임시 필드 제거
        result.append(data)

    return result

def main():
    print("\n" + "="*60)
    print("🔄 중복 제거 및 재업로드")
    print("="*60 + "\n")

    # 1. 기존 데이터 로드
    print("📂 기존 데이터 로드 중...")
    with open('students_data.json', 'r', encoding='utf-8') as f:
        students = json.load(f)
    print(f"✅ 원본: {len(students)}명\n")

    # 2. 중복 제거
    print("🔄 중복 제거 중...")
    deduplicated = deduplicate_students(students)
    print(f"✅ 중복 제거 후: {len(deduplicated)}명")
    print(f"📉 제거된 중복: {len(students) - len(deduplicated)}건\n")

    # 샘플 확인
    print("📋 중복 제거 샘플:")
    for student in deduplicated[:3]:
        classes = student['metadata'].get('classes', [])
        print(f"  - {student['name']}: {', '.join(classes)}")
    print()

    # 3. Supabase 연결
    print("🔌 Supabase 연결 중...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ 연결 성공!\n")

    # 4. 기존 데이터 삭제
    print("🗑️  기존 profiles 삭제 중...")
    try:
        result = supabase.table('profiles').delete().eq('type', 'student').execute()
        print("✅ 기존 데이터 삭제 완료\n")
    except Exception as e:
        print(f"⚠️  삭제 중 오류 (무시): {e}\n")

    # 5. 재업로드
    print("📊 재업로드 시작...")
    print("="*60 + "\n")

    batch_size = 50
    success = 0
    errors = []

    for i in range(0, len(deduplicated), batch_size):
        batch = deduplicated[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(deduplicated) + batch_size - 1) // batch_size

        try:
            records = []
            for student in batch:
                records.append({
                    'type': student['type'],
                    'name': student['name'],
                    'phone': student.get('phone'),
                    'metadata': student['metadata'],
                    'status': student.get('status', 'active')
                })

            result = supabase.table('profiles').insert(records).execute()
            success += len(batch)
            print(f"[배치 {batch_num}/{total_batches}] {success}/{len(deduplicated)}명 완료 ✅")

        except Exception as e:
            error_msg = f"배치 {batch_num}: {str(e)[:100]}"
            errors.append(error_msg)
            print(f"❌ {error_msg}")

    # 6. 결과
    print("\n" + "="*60)
    print(f"🎉 재업로드 완료: {success}/{len(deduplicated)}명")

    if errors:
        print(f"\n⚠️  오류: {len(errors)}개")

    # 7. 검증
    print("\n" + "="*60)
    print("🔍 검증 중...")
    print("="*60 + "\n")

    try:
        result = supabase.table('profiles').select('*', count='exact').eq('type', 'student').execute()
        print(f"✅ profiles (student): {result.count}명")

        result = supabase.table('universal_profiles').select('*', count='exact').execute()
        print(f"✅ universal_profiles: {result.count}명")

        # 여러 클래스 수강하는 학생 확인
        result = supabase.table('profiles').select('name,phone,metadata').eq('type', 'student').execute()

        multi_class_students = [
            s for s in result.data
            if len(s.get('metadata', {}).get('classes', [])) > 1
        ]

        print(f"✅ 여러 클래스 수강: {len(multi_class_students)}명")

        print(f"\n📋 여러 클래스 수강 샘플:")
        for student in multi_class_students[:5]:
            classes = student['metadata'].get('classes', [])
            print(f"  - {student['name']}: {', '.join(classes)}")

    except Exception as e:
        print(f"⚠️  검증 중 오류: {e}")

    print("\n" + "="*60)
    print("✅ 완료!")
    print("="*60 + "\n")

    # 8. 중복 제거된 데이터 저장
    print("💾 중복 제거된 데이터 저장 중...")
    with open('students_data_deduplicated.json', 'w', encoding='utf-8') as f:
        json.dump(deduplicated, f, ensure_ascii=False, indent=2)
    print("✅ students_data_deduplicated.json 저장 완료")

if __name__ == '__main__':
    main()
