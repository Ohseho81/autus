-- ═══════════════════════════════════════════════════════════════
-- 온리쌤 코어 스키마 v2 — Supabase Dashboard SQL Editor에 붙여넣기용
--
-- 적용 방법:
--   1. Supabase Dashboard → SQL Editor 열기
--   2. 이 파일 전체 복사 후 붙여넣기
--   3. RUN 클릭
--
-- 주의: 기존 테이블이 있으면 DROP 후 재생성합니다.
--       기존 데이터가 있다면 백업 먼저 하세요!
-- ═══════════════════════════════════════════════════════════════

-- 기존 테이블 정리 (의존성 역순)
DROP TABLE IF EXISTS team_invites CASCADE;
DROP TABLE IF EXISTS session_records CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS lesson_schedules CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS academies CASCADE;

-- 기존 함수 정리
DROP FUNCTION IF EXISTS my_academy_id() CASCADE;
DROP FUNCTION IF EXISTS generate_attendance_for_schedule(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- 테이블 생성
-- ═══════════════════════════════════════════════════════════════

-- 0. 학원
CREATE TABLE academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 0-1. 프로필 (역할: owner / manager / coach)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'coach' CHECK (role IN ('owner', 'manager', 'coach')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. 학생
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,
  school TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 레슨 스케줄 (반 단위 시간표)
CREATE TABLE lesson_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,               -- '초등A반 수업'
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=월 ~ 6=일
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_ids UUID[] NOT NULL DEFAULT '{}',
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 출석 기록
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES lesson_schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused')),
  check_in_time TIMESTAMPTZ,
  late_minutes INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(schedule_id, student_id, date)
);

-- 4. 세션 기록 (출석 1:1 = 영상 + 로그)
CREATE TABLE session_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE UNIQUE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  video_youtube_id TEXT,
  video_thumbnail TEXT,
  log_text TEXT,
  tags TEXT[] DEFAULT '{}',
  skill_ratings JSONB DEFAULT '{}',
  parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
  parent_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 팀 초대
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coach' CHECK (role IN ('manager', 'coach')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  matched_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

-- ═══════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Helper: 내 학원 ID
CREATE OR REPLACE FUNCTION my_academy_id()
RETURNS UUID AS $$
  SELECT academy_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Academies
CREATE POLICY "academy_member_select" ON academies
  FOR SELECT USING (id = my_academy_id());

-- Profiles
CREATE POLICY "profile_self_all" ON profiles
  FOR ALL USING (id = auth.uid());
CREATE POLICY "profile_same_academy" ON profiles
  FOR SELECT USING (academy_id = my_academy_id());

-- Students
CREATE POLICY "students_academy_select" ON students
  FOR SELECT USING (academy_id = my_academy_id());
CREATE POLICY "students_academy_insert" ON students
  FOR INSERT WITH CHECK (academy_id = my_academy_id());
CREATE POLICY "students_academy_update" ON students
  FOR UPDATE USING (academy_id = my_academy_id());

-- Schedules
CREATE POLICY "schedules_academy_select" ON lesson_schedules
  FOR SELECT USING (academy_id = my_academy_id());
CREATE POLICY "schedules_academy_insert" ON lesson_schedules
  FOR INSERT WITH CHECK (academy_id = my_academy_id());
CREATE POLICY "schedules_academy_update" ON lesson_schedules
  FOR UPDATE USING (academy_id = my_academy_id());

-- Attendance
CREATE POLICY "attendance_coach_select" ON attendance_records
  FOR SELECT USING (
    coach_id = auth.uid() OR
    schedule_id IN (SELECT id FROM lesson_schedules WHERE academy_id = my_academy_id())
  );
CREATE POLICY "attendance_coach_insert" ON attendance_records
  FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "attendance_coach_update" ON attendance_records
  FOR UPDATE USING (coach_id = auth.uid());

-- Session Records
CREATE POLICY "session_coach_select" ON session_records
  FOR SELECT USING (
    coach_id = auth.uid() OR
    student_id IN (SELECT id FROM students WHERE academy_id = my_academy_id())
  );
CREATE POLICY "session_coach_insert" ON session_records
  FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "session_coach_update" ON session_records
  FOR UPDATE USING (coach_id = auth.uid());

-- Team Invites
CREATE POLICY "invites_academy_select" ON team_invites
  FOR SELECT USING (academy_id = my_academy_id());
CREATE POLICY "invites_manager_insert" ON team_invites
  FOR INSERT WITH CHECK (academy_id = my_academy_id());

-- ═══════════════════════════════════════════════════════════════
-- Functions
-- ═══════════════════════════════════════════════════════════════

-- 스케줄 기반 출석부 자동 생성
CREATE OR REPLACE FUNCTION generate_attendance_for_schedule(
  p_schedule_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS SETOF attendance_records AS $$
DECLARE
  v_schedule lesson_schedules%ROWTYPE;
  v_student_id UUID;
BEGIN
  SELECT * INTO v_schedule FROM lesson_schedules WHERE id = p_schedule_id;

  IF NOT FOUND OR NOT v_schedule.is_active THEN
    RETURN;
  END IF;

  FOREACH v_student_id IN ARRAY v_schedule.student_ids
  LOOP
    INSERT INTO attendance_records (schedule_id, student_id, coach_id, date, status)
    VALUES (p_schedule_id, v_student_id, v_schedule.coach_id, p_date, 'absent')
    ON CONFLICT (schedule_id, student_id, date) DO NOTHING;
  END LOOP;

  RETURN QUERY
    SELECT * FROM attendance_records
    WHERE schedule_id = p_schedule_id AND date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER academies_updated_at BEFORE UPDATE ON academies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON lesson_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER session_records_updated_at BEFORE UPDATE ON session_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX idx_profiles_academy ON profiles(academy_id);
CREATE INDEX idx_students_academy ON students(academy_id);
CREATE INDEX idx_schedules_academy ON lesson_schedules(academy_id);
CREATE INDEX idx_schedules_coach ON lesson_schedules(coach_id);
CREATE INDEX idx_schedules_day ON lesson_schedules(day_of_week);
CREATE INDEX idx_attendance_schedule_date ON attendance_records(schedule_id, date);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_coach_date ON attendance_records(coach_id, date);
CREATE INDEX idx_session_attendance ON session_records(attendance_id);
CREATE INDEX idx_session_student ON session_records(student_id);
CREATE INDEX idx_session_date ON session_records(date);
CREATE INDEX idx_invites_academy ON team_invites(academy_id);
CREATE INDEX idx_invites_phone ON team_invites(phone);

-- ═══════════════════════════════════════════════════════════════
-- 완료!
-- 다음 단계: .env 파일에 아래 설정 추가
--   EXPO_PUBLIC_SUPABASE_URL=https://[프로젝트ID].supabase.co
--   EXPO_PUBLIC_SUPABASE_ANON_KEY=[anon key]
-- ═══════════════════════════════════════════════════════════════
