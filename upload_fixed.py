#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase REST API 업로드 (UTF-8 인코딩 수정)
"""

import json
import os
import sys
import locale

# UTF-8 환경 설정
os.environ['LANG'] = 'en_US.UTF-8'
os.environ['LC_ALL'] = 'en_US.UTF-8'

# Python 3.7+ 기본 인코딩 확인
if sys.version_info >= (3, 7):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from supabase import create_client, Client

# 환경 변수
SUPABASE_URL = "https://dcobyicibvhpwcjqkmgw.supabase.co"
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_KEY:
    print("❌ SUPABASE_SERVICE_KEY 환경 변수를 설정하세요")
    sys.exit(1)

def main():
    print("\n" + "="*60)
    print("🚀 AUTUS API 업로드 (UTF-8 Fixed)")
    print("="*60 + "\n")

    # Locale 확인
    print(f"📍 현재 인코딩: {sys.getdefaultencoding()}")
    print(f"📍 stdout 인코딩: {sys.stdout.encoding}")
    print(f"📍 locale: {locale.getpreferredencoding()}\n")

    # Supabase 클라이언트
    print("🔌 Supabase API 연결 중...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ 연결 성공!\n")
    except Exception as e:
        print(f"❌ 연결 실패: {e}")
        sys.exit(1)

    # 학생 데이터 로드 (UTF-8 명시)
    print("📂 학생 데이터 로드 중...")
    with open('students_data.json', 'r', encoding='utf-8') as f:
        students = json.load(f)
    print(f"✅ {len(students)}명 데이터 로드 완료")

    # 샘플 확인
    print(f"📋 첫 번째 학생: {students[0]['name']}\n")

    # 업로드
    print("📊 업로드 시작...")
    print("="*60 + "\n")

    batch_size = 50
    success = 0
    errors = []

    for i in range(0, len(students), batch_size):
        batch = students[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(students) + batch_size - 1) // batch_size

        try:
            records = []
            for student in batch:
                record = {
                    'type': student['type'],
                    'name': str(student['name']),  # 명시적 문자열 변환
                    'phone': student.get('phone'),
                    'metadata': student.get('metadata', {}),
                    'status': student.get('status', 'active')
                }
                records.append(record)

            # API 호출
            result = supabase.table('profiles').insert(records).execute()

            success += len(batch)
            print(f"[배치 {batch_num}/{total_batches}] {success}/{len(students)}명 완료 ✅")

        except Exception as e:
            error_msg = f"배치 {batch_num}: {str(e)[:150]}"
            errors.append(error_msg)
            print(f"❌ {error_msg}")

            # 첫 번째 오류는 자세히 출력
            if len(errors) == 1:
                import traceback
                print("\n상세 오류:")
                traceback.print_exc()
                print()

    # 결과
    print("\n" + "="*60)
    print(f"🎉 업로드 완료: {success}/{len(students)}명")

    if errors:
        print(f"\n⚠️  오류: {len(errors)}개 배치 실패")
        for err in errors[:5]:
            print(f"  - {err}")
        if len(errors) > 5:
            print(f"  ... 외 {len(errors)-5}개")

    # 검증
    if success > 0:
        print("\n" + "="*60)
        print("🔍 검증 중...")
        print("="*60 + "\n")

        try:
            result = supabase.table('profiles').select('*', count='exact').eq('type', 'student').execute()
            print(f"✅ profiles (student): {result.count}명")

            result = supabase.table('universal_profiles').select('*', count='exact').execute()
            print(f"✅ universal_profiles: {result.count}명")

            result = supabase.table('profiles').select('name,phone,metadata').eq('type', 'student').limit(5).execute()
            print(f"\n📋 샘플 데이터:")
            for row in result.data:
                class_name = row.get('metadata', {}).get('class', 'N/A')
                print(f"  - {row['name']} | {row.get('phone', 'N/A')} | {class_name}")

        except Exception as e:
            print(f"⚠️  검증 중 오류: {e}")

    print("\n" + "="*60)
    print("✅ 완료!")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
