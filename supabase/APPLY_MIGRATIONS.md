# Supabase 마이그레이션 적용 가이드

## P0: atb_* 데이터 표시 확인

### 1. 마이그레이션 적용

```bash
# Supabase CLI 사용 시
cd /Users/oseho/Desktop/autus
supabase db push

# 또는 Supabase Dashboard → SQL Editor에서 순서대로 실행
# 1) supabase/migrations/001_allthatbasket_complete.sql
# 2) supabase/migrations/002_phase0_lock.sql (필요 시)
```

### 2. 데이터·뷰 확인

```bash
# mobile-app/.env 설정 후 실행
source mobile-app/.env  # 또는 export $(grep -v '^#' mobile-app/.env | xargs)
python3 scripts/check_atb_data.py
```

**기대 출력:**
- atb_students: 802명 (이상)
- atb_student_dashboard: OK
- atb_today_attendance: OK
- atb_monthly_payments: OK

### 3. RLS (Row Level Security)

현재 `001_allthatbasket_complete.sql`에서 RLS는 **주석 처리**됨:
```sql
-- ALTER TABLE atb_students ENABLE ROW LEVEL SECURITY;
```

→ anon 키로 모든 atb_* 테이블 조회 가능.  
RLS 적용 시 anon용 SELECT 정책 추가 필요.

### 4. 앱에서 연결 테스트

모바일 앱 → 설정 → 시스템 → **연결 상태 (Supabase)** 탭하여 결과 확인.
