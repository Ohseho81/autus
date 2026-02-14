#!/usr/bin/env python3
"""Upload students data to Supabase"""
import csv
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://pphzvnaedmzcvpxjulti.supabase.co"
SUPABASE_KEY = "your-supabase-service-role-key-here"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_students():
    """Upload students from CSV to Supabase"""
    students = []

    # Read CSV file
    with open('students.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            student = {
                'name': row['name'],
                'parent_phone': row['parent_phone'],
                'birth_date': row['birth_date'] if row['birth_date'] else None,
                'school': row['school'] if row['school'] else None,
                'shuttle_required': row['shuttle_required'].lower() == 'true',
                'status': row['status']
            }
            students.append(student)

    print(f"📊 총 {len(students)}명의 학생 데이터 읽기 완료")

    # Upload in batches of 50
    batch_size = 50
    total_uploaded = 0

    for i in range(0, len(students), batch_size):
        batch = students[i:i+batch_size]
        try:
            result = supabase.table('students').insert(batch).execute()
            total_uploaded += len(batch)
            print(f"✅ Batch {i//batch_size + 1}: {len(batch)}명 업로드 성공 (누적: {total_uploaded}/{len(students)})")
        except Exception as e:
            print(f"❌ Batch {i//batch_size + 1} 업로드 실패: {e}")
            import traceback
            print(traceback.format_exc())
            break  # Stop on first error to see details

    print(f"\n🎉 업로드 완료! 총 {total_uploaded}/{len(students)}명 성공")

    # Verify upload
    try:
        count = supabase.table('students').select('id', count='exact').execute()
        print(f"📈 현재 DB에 저장된 학생 수: {count.count}")
    except Exception as e:
        print(f"검증 중 오류: {e}")

if __name__ == "__main__":
    upload_students()
