-- ═══════════════════════════════════════════════════════════════
-- 온리쌤 v2 패치 — 기존 앱 코드 호환성
-- Supabase Dashboard SQL Editor에서 실행
-- ═══════════════════════════════════════════════════════════════

-- profiles: 기존 코드가 사용하는 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- students: 기존 코드가 사용하는 컬럼 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS team TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- academies: 기존 코드가 사용하는 컬럼 추가
ALTER TABLE academies ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS business_number TEXT;

-- team_invites: 기존 코드가 사용하는 컬럼 추가
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id);
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- attendance_records: 간편 출석 (스케줄 없이 직접 체크) 지원
ALTER TABLE attendance_records ALTER COLUMN schedule_id DROP NOT NULL;
ALTER TABLE attendance_records ALTER COLUMN coach_id DROP NOT NULL;

-- schedule_id 없는 출석에 대한 unique constraint 보완
-- 기존 unique(schedule_id, student_id, date) 유지하되 NULL schedule_id 허용
DROP INDEX IF EXISTS attendance_records_schedule_id_student_id_date_key;
CREATE UNIQUE INDEX idx_attendance_unique ON attendance_records (
  COALESCE(schedule_id, '00000000-0000-0000-0000-000000000000'),
  student_id,
  date
);

-- ═══════════════════════════════════════════════════════════════
-- 완료!
-- ═══════════════════════════════════════════════════════════════
