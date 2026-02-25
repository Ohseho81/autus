#!/usr/bin/env python3
"""
강사(atb_coaches) + 수업(atb_classes) 업로드
- coaches.json 또는 coaches.csv → atb_coaches
- classes.json 또는 classes.csv → atb_classes (coach_id 매핑)
"""

import json
import os
import sys

# mobile-app/.env 호환 (check_atb_data.py와 동일)
def _load_env(path: str) -> None:
    try:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        full = os.path.join(base, path) if not os.path.isabs(path) else path
        is_mobile = "mobile-app" in path
        with open(full, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip().strip("'\"").strip()
                    is_placeholder = "your-project" in (v or "")
                    if v and (is_mobile or not is_placeholder):
                        (os.environ.__setitem__ if is_mobile else os.environ.setdefault)(k, v)
    except OSError:
        pass

for p in ["mobile-app/.env", ".env"]:
    _load_env(p)

SUPABASE_URL = (
    os.getenv("SUPABASE_URL")
    or os.getenv("VITE_SUPABASE_URL")
    or os.getenv("EXPO_PUBLIC_SUPABASE_URL")
    or "https://pphzvnaedmzcvpxjulti.supabase.co"
)
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_SERVICE_KEY")
    or os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    or os.getenv("VITE_SUPABASE_ANON_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
)

try:
    from supabase import create_client
except ImportError:
    print("❌ supabase 패키지 필요: pip install supabase")
    sys.exit(1)

if not SUPABASE_KEY:
    print("❌ 환경변수 필요: SUPABASE_SERVICE_ROLE_KEY 또는 VITE_SUPABASE_ANON_KEY")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 기본 강사 예시 (academy_id 없으면 null)
DEFAULT_COACHES = [
    {"name": "김코치", "phone": "010-0000-0001", "role": "head_coach"},
    {"name": "박코치", "phone": "010-0000-0002", "role": "coach"},
    {"name": "이코치", "phone": "010-0000-0003", "role": "coach"},
]

# 기본 수업 예시 (day_of_week: 0=일요일..6=토요일)
DEFAULT_CLASSES = [
    {"name": "U-12 주니어반", "day_of_week": 1, "start_time": "16:00", "end_time": "17:30", "max_students": 15, "monthly_fee": 120000, "coach_index": 0},
    {"name": "U-15 중등반", "day_of_week": 3, "start_time": "18:00", "end_time": "19:30", "max_students": 12, "monthly_fee": 140000, "coach_index": 1},
    {"name": "성인 취미반", "day_of_week": 5, "start_time": "20:00", "end_time": "21:30", "max_students": 10, "monthly_fee": 100000, "coach_index": 0},
]

def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def upload_coaches(coaches: list, academy_id=None) -> dict:
    """강사 업로드 → id 매핑 반환 (academy_id는 스키마에 있으면 포함)"""
    rows = []
    for c in coaches:
        row = {"name": c["name"], "phone": c.get("phone"), "role": c.get("role", "coach")}
        if academy_id:
            row["academy_id"] = academy_id
        rows.append(row)
    inserted = supabase.table("atb_coaches").insert(rows).execute()
    return {i: r["id"] for i, r in enumerate(inserted.data)}

def upload_classes(classes: list, coach_ids: dict, academy_id=None) -> int:
    """수업 업로드 (coach_id 매핑)"""
    rows = []
    for c in classes:
        coach_idx = c.get("coach_index", 0)
        coach_id = coach_ids.get(coach_idx) if isinstance(coach_ids, dict) else None
        row = {
            "name": c["name"],
            "day_of_week": c.get("day_of_week", 1),
            "start_time": c.get("start_time", "16:00"),
            "end_time": c.get("end_time", "17:30"),
            "max_students": c.get("max_students", 15),
            "monthly_fee": c.get("monthly_fee", 100000),
            "coach_id": coach_id,
            "academy_id": academy_id,
        }
        rows.append(row)
    supabase.table("atb_classes").insert(rows).execute()
    return len(rows)

def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--coaches", default=None, help="coaches.json 경로")
    p.add_argument("--classes", default=None, help="classes.json 경로")
    p.add_argument("--default", action="store_true", help="기본 예시 데이터로 업로드")
    args = p.parse_args()

    print("\n" + "="*60)
    print("👨‍🏫 강사 + 수업 업로드")
    print("="*60)

    if args.default:
        coaches_data = DEFAULT_COACHES
        classes_data = DEFAULT_CLASSES
    elif args.coaches or args.classes:
        coaches_data = load_json(args.coaches) if args.coaches else []
        classes_data = load_json(args.classes) if args.classes else []
    else:
        print("사용법:")
        print("  python upload_coaches_classes.py --default")
        print("  python upload_coaches_classes.py --coaches coaches.json --classes classes.json")
        sys.exit(1)

    if not coaches_data and not classes_data:
        print("❌ 업로드할 데이터 없음")
        sys.exit(1)

    coach_ids = {}
    if coaches_data:
        print(f"\n📤 강사 {len(coaches_data)}명 업로드 중...")
        coach_ids = upload_coaches(coaches_data)
        print(f"   ✅ 완료")

    if classes_data:
        print(f"\n📤 수업 {len(classes_data)}개 업로드 중...")
        n = upload_classes(classes_data, coach_ids)
        print(f"   ✅ {n}개 완료 (강사 배정 포함)")

    print("\n" + "="*60)
    print("🎉 업로드 완료")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
