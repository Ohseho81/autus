# Supabase 연동 실패 진단 & 해결

"등록된 학생이 없습니다" / KPI 0 표시 시 확인 순서

## 1. 환경변수 확인

### Vercel (autus-ai.com)

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_SUPABASE_URL` | ✅ | `https://pphzvnaedmzcvpxjulti.supabase.co` (atb_* 데이터 있음) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase Dashboard → Settings → API → anon public |

- [Vercel Dashboard](https://vercel.com) → 프로젝트 → Settings → Environment Variables
- Production, Preview 모두 체크
- 변경 후 **Redeploy** 필수

### 로컬 (kraton-v2)

`kraton-v2/.env` 또는 프로젝트 루트 `.env`:
```
VITE_SUPABASE_URL=https://pphzvnaedmzcvpxjulti.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 모바일 앱 (Expo)

`mobile-app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://dcobyicibvhpwcjqkmgw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

- `.env.example` 참고: `mobile-app/.env.example`
- 앱 재시작 필요: `npx expo start --clear`

## 2. 스키마 적용 여부

Supabase SQL Editor에서 실행:

```sql
-- atb_* 테이블 존재 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'atb_%'
ORDER BY table_name;
```

**결과가 없으면** `supabase/migrations/001_allthatbasket_complete.sql` 전체를 SQL Editor에 붙여넣어 실행하세요.

## 3. 데이터 존재 여부

```sql
SELECT
  (SELECT COUNT(*) FROM atb_students) as students,
  (SELECT COUNT(*) FROM atb_classes) as classes,
  (SELECT COUNT(*) FROM atb_coaches) as coaches;
```

모두 0이면 아래 **최소 시드 데이터** 실행

## 4. 최소 시드 데이터 (테스트용)

Supabase SQL Editor에서 실행 (마이그레이션 적용 후):

```sql
-- 1. 학원
INSERT INTO atb_academies (id, name, owner_name, phone)
VALUES ('a0000000-0000-0000-0000-000000000001', '올댓바스켓 농구교실', 'seho 원장님', '010-0000-0000')
ON CONFLICT (id) DO NOTHING;

-- 2. 강사
INSERT INTO atb_coaches (id, academy_id, name, is_active)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '김코치',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 3. 수업 (월요일 16:00)
INSERT INTO atb_classes (id, academy_id, name, day_of_week, start_time, end_time, coach_id, is_active)
VALUES (
  'x0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '주니어반',
  1,
  '16:00',
  '17:30',
  'c0000000-0000-0000-0000-000000000001',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 4. 학생 1명 (이미 있으면 스킵)
INSERT INTO atb_students (academy_id, name, grade, enrollment_status, attendance_rate, total_outstanding)
SELECT 'a0000000-0000-0000-0000-000000000001', '테스트 학생', '초3', 'active', 100, 0
WHERE NOT EXISTS (SELECT 1 FROM atb_students LIMIT 1);

-- 5. 수업 등록
INSERT INTO atb_enrollments (student_id, class_id, status)
SELECT s.id, 'x0000000-0000-0000-0000-000000000001'::uuid, 'active'
FROM atb_students s WHERE s.name = '테스트 학생'
ON CONFLICT (student_id, class_id) DO NOTHING;
```

## 5. CLI로 확인

```bash
# .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정 후
python scripts/check_atb_data.py
```

## 6. Supabase 프로젝트 구분

| 프로젝트 | 용도 |
|----------|------|
| `pphzvnaedmzcvpxjulti` | ✅ **atb_* 데이터 위치** (학생 802명, 결제 116건, 출석 52건) |
| `dcobyicibvhpwcjqkmgw` | Ohseho81's Project - atb_* 없음 |

둘 중 **atb_* 데이터가 있는 프로젝트**의 URL과 anon key를 Vercel/앱에 설정해야 합니다.
