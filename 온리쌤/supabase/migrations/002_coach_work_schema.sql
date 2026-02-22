-- ============================================
-- ATB Hub 코치 근태/급여 관리 스키마
-- Supabase Migration 002
-- ============================================

-- 코치 테이블
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  qr_code TEXT UNIQUE,  -- 코치 개인 QR (COACH-{id}-{timestamp})
  profile_image TEXT,
  specialty TEXT[],  -- ['드리블', '슈팅', '전술']
  hourly_rate INT DEFAULT 30000,  -- 시급
  bonus_per_student INT DEFAULT 500,  -- 학생당 보너스
  employment_type TEXT DEFAULT 'part_time',  -- 'full_time' | 'part_time' | 'freelance'
  bank_name TEXT,
  bank_account TEXT,
  status TEXT DEFAULT 'active',  -- 'active' | 'inactive' | 'on_leave'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 코치 근무 로그 (일일)
CREATE TABLE IF NOT EXISTS coach_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  total_hours DECIMAL(4,2),  -- 총 근무 시간
  lessons_completed INT DEFAULT 0,
  students_attended INT DEFAULT 0,
  location TEXT,  -- 근무 지점
  gps_clock_in JSONB,  -- { lat, lng }
  gps_clock_out JSONB,
  status TEXT DEFAULT 'active',  -- 'active' | 'completed' | 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(coach_id, work_date)  -- 하루에 하나의 근무 로그
);

-- 코치 급여 기록 (월별)
CREATE TABLE IF NOT EXISTS coach_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  salary_month DATE NOT NULL,  -- 급여 월 (YYYY-MM-01)
  total_hours DECIMAL(6,2) DEFAULT 0,
  total_lessons INT DEFAULT 0,
  total_students INT DEFAULT 0,
  base_salary INT DEFAULT 0,  -- 기본급 (시급 × 시간)
  attendance_bonus INT DEFAULT 0,  -- 출석 보너스
  performance_bonus INT DEFAULT 0,  -- 성과 보너스
  deductions INT DEFAULT 0,  -- 공제액
  net_salary INT DEFAULT 0,  -- 실수령액
  status TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'paid'
  paid_at TIMESTAMPTZ,
  payment_ref TEXT,  -- 이체 참조번호
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(coach_id, salary_month)
);

-- 코치 레슨 기록 (세션별)
CREATE TABLE IF NOT EXISTS coach_lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  work_log_id UUID REFERENCES coach_work_logs(id) ON DELETE CASCADE,
  lesson_slot_id UUID REFERENCES lesson_slots(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  students_count INT DEFAULT 0,
  feedback_completed BOOLEAN DEFAULT FALSE,
  video_uploaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_work_logs_coach ON coach_work_logs(coach_id);
CREATE INDEX idx_work_logs_date ON coach_work_logs(work_date);
CREATE INDEX idx_salaries_coach ON coach_salaries(coach_id);
CREATE INDEX idx_salaries_month ON coach_salaries(salary_month);
CREATE INDEX idx_lesson_sessions_coach ON coach_lesson_sessions(coach_id);

-- 코치 QR 코드 생성 트리거
CREATE OR REPLACE FUNCTION generate_coach_qr()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_code := 'COACH-' || NEW.id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_coach_qr
BEFORE INSERT ON coaches
FOR EACH ROW
EXECUTE FUNCTION generate_coach_qr();

-- 퇴근 시 급여 자동 계산 트리거
CREATE OR REPLACE FUNCTION calculate_daily_salary()
RETURNS TRIGGER AS $$
DECLARE
  v_hourly_rate INT;
  v_bonus_per_student INT;
  v_base_salary INT;
  v_attendance_bonus INT;
  v_salary_month DATE;
BEGIN
  -- 퇴근 시에만 실행
  IF NEW.clock_out_time IS NOT NULL AND OLD.clock_out_time IS NULL THEN
    -- 코치 급여 정보 조회
    SELECT hourly_rate, bonus_per_student
    INTO v_hourly_rate, v_bonus_per_student
    FROM coaches WHERE id = NEW.coach_id;

    -- 급여 계산
    v_base_salary := ROUND(NEW.total_hours * v_hourly_rate);
    v_attendance_bonus := NEW.students_attended * v_bonus_per_student;
    v_salary_month := DATE_TRUNC('month', NEW.work_date)::DATE;

    -- 월별 급여 레코드 업데이트 또는 생성
    INSERT INTO coach_salaries (
      coach_id, salary_month, total_hours, total_lessons, total_students,
      base_salary, attendance_bonus, net_salary
    )
    VALUES (
      NEW.coach_id, v_salary_month, NEW.total_hours, NEW.lessons_completed,
      NEW.students_attended, v_base_salary, v_attendance_bonus,
      v_base_salary + v_attendance_bonus
    )
    ON CONFLICT (coach_id, salary_month)
    DO UPDATE SET
      total_hours = coach_salaries.total_hours + NEW.total_hours,
      total_lessons = coach_salaries.total_lessons + NEW.lessons_completed,
      total_students = coach_salaries.total_students + NEW.students_attended,
      base_salary = coach_salaries.base_salary + v_base_salary,
      attendance_bonus = coach_salaries.attendance_bonus + v_attendance_bonus,
      net_salary = coach_salaries.net_salary + v_base_salary + v_attendance_bonus,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_daily_salary
AFTER UPDATE ON coach_work_logs
FOR EACH ROW
EXECUTE FUNCTION calculate_daily_salary();

-- 월별 급여 조회 뷰
CREATE OR REPLACE VIEW v_coach_monthly_summary AS
SELECT
  c.id AS coach_id,
  c.name AS coach_name,
  DATE_TRUNC('month', wl.work_date) AS month,
  COUNT(DISTINCT wl.work_date) AS work_days,
  SUM(wl.total_hours) AS total_hours,
  SUM(wl.lessons_completed) AS total_lessons,
  SUM(wl.students_attended) AS total_students,
  SUM(wl.total_hours * c.hourly_rate) AS base_salary,
  SUM(wl.students_attended * c.bonus_per_student) AS attendance_bonus,
  SUM(wl.total_hours * c.hourly_rate + wl.students_attended * c.bonus_per_student) AS total_salary
FROM coaches c
JOIN coach_work_logs wl ON c.id = wl.coach_id
WHERE wl.status = 'completed'
GROUP BY c.id, c.name, DATE_TRUNC('month', wl.work_date);

-- 오늘 코치 현황 조회 함수
CREATE OR REPLACE FUNCTION get_today_coach_status(p_coach_id UUID)
RETURNS TABLE (
  is_clocked_in BOOLEAN,
  clock_in_time TIMESTAMPTZ,
  work_hours DECIMAL,
  lessons_today INT,
  students_today INT,
  estimated_salary INT
) AS $$
DECLARE
  v_work_log coach_work_logs%ROWTYPE;
  v_hourly_rate INT;
  v_bonus_per_student INT;
BEGIN
  SELECT * INTO v_work_log
  FROM coach_work_logs
  WHERE coach_id = p_coach_id
    AND work_date = CURRENT_DATE;

  SELECT hourly_rate, bonus_per_student
  INTO v_hourly_rate, v_bonus_per_student
  FROM coaches WHERE id = p_coach_id;

  is_clocked_in := v_work_log.clock_in_time IS NOT NULL AND v_work_log.clock_out_time IS NULL;
  clock_in_time := v_work_log.clock_in_time;
  work_hours := COALESCE(v_work_log.total_hours, 0);
  lessons_today := COALESCE(v_work_log.lessons_completed, 0);
  students_today := COALESCE(v_work_log.students_attended, 0);

  IF is_clocked_in THEN
    work_hours := EXTRACT(EPOCH FROM (NOW() - v_work_log.clock_in_time)) / 3600;
  END IF;

  estimated_salary := ROUND(work_hours * v_hourly_rate + students_today * v_bonus_per_student);

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;