-- ============================================
-- 온리쌤 아카데미 조직/역할 관리 스키마
-- Supabase Migration 003
--
-- 역할 계층:
-- 오너(Owner) → 원장(Director) → 관리자(Admin) → 강사(Coach)
-- ============================================

-- ────────────────────────────────────────────
-- 사용자 역할 Enum
-- ────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('owner', 'director', 'admin', 'coach');
CREATE TYPE branch_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE class_level AS ENUM ('beginner', 'intermediate', 'advanced', 'pro');
CREATE TYPE day_of_week AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

-- ────────────────────────────────────────────
-- 조직/아카데미 테이블 (오너 레벨)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                           -- '온리쌤 아카데미'
  business_number TEXT UNIQUE,                  -- 사업자등록번호
  ceo_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  theme_color TEXT DEFAULT '#FF6B00',           -- 브랜드 컬러

  -- 구독 정보
  subscription_plan TEXT DEFAULT 'basic',       -- 'basic' | 'pro' | 'enterprise'
  subscription_expires_at TIMESTAMPTZ,

  -- 설정
  settings JSONB DEFAULT '{
    "attendance_reminder": true,
    "payment_reminder": true,
    "auto_deduct_lesson": true,
    "parent_notification": true
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 지점 테이블 (원장 레벨)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- '대치점', '분당점'
  code TEXT UNIQUE,                             -- 'ATB-DC', 'ATB-BD'
  address TEXT,
  phone TEXT,

  -- 지점 정보
  director_id UUID,                             -- 원장 (users.id 참조)
  court_count INT DEFAULT 1,                    -- 코트 수
  max_capacity INT DEFAULT 50,                  -- 최대 수용 인원

  -- 운영 시간
  operating_hours JSONB DEFAULT '{
    "mon": {"open": "09:00", "close": "21:00"},
    "tue": {"open": "09:00", "close": "21:00"},
    "wed": {"open": "09:00", "close": "21:00"},
    "thu": {"open": "09:00", "close": "21:00"},
    "fri": {"open": "09:00", "close": "21:00"},
    "sat": {"open": "09:00", "close": "18:00"},
    "sun": {"open": "10:00", "close": "17:00"}
  }'::jsonb,

  status branch_status DEFAULT 'active',

  -- 통계 캐시 (성능 최적화)
  stats_cache JSONB DEFAULT '{
    "total_students": 0,
    "active_students": 0,
    "total_coaches": 0,
    "monthly_revenue": 0
  }'::jsonb,
  stats_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 코트 테이블
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- 'A코트', 'Red Court'
  code TEXT,                                    -- 'COURT-A'
  court_type TEXT DEFAULT 'indoor',             -- 'indoor' | 'outdoor' | 'half'
  size TEXT,                                    -- 'full' | 'half' | '3on3'
  surface TEXT DEFAULT 'wood',                  -- 'wood' | 'rubber' | 'outdoor'
  max_players INT DEFAULT 10,

  -- 시설
  facilities JSONB DEFAULT '{
    "scoreboard": true,
    "shot_clock": false,
    "camera": false,
    "ac": true
  }'::jsonb,

  status TEXT DEFAULT 'available',              -- 'available' | 'in_use' | 'maintenance'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 사용자/계정 테이블 (역할 통합)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,                          -- Supabase Auth ID
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,

  -- 기본 정보
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  profile_image TEXT,

  -- 역할 정보
  role user_role NOT NULL DEFAULT 'coach',
  permissions JSONB DEFAULT '{}'::jsonb,        -- 세부 권한 설정

  -- QR 코드
  qr_code TEXT UNIQUE,

  -- 코치 전용 필드 (role = 'coach'일 때)
  specialty TEXT[],                             -- ['드리블', '슈팅', '전술']
  hourly_rate INT,                              -- 시급
  bonus_per_student INT DEFAULT 500,            -- 학생당 보너스
  employment_type TEXT,                         -- 'full_time' | 'part_time' | 'freelance'

  -- 급여 정보 (코치/관리자)
  bank_name TEXT,
  bank_account TEXT,

  -- 상태
  status TEXT DEFAULT 'active',                 -- 'active' | 'inactive' | 'pending' | 'on_leave'
  last_login_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 프로그램/반 테이블
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                           -- '주니어 드리블 기초반'
  description TEXT,
  level class_level DEFAULT 'beginner',

  -- 대상
  age_group TEXT,                               -- 'U-10', 'U-12', 'Adult'
  min_age INT,
  max_age INT,

  -- 수업 정보
  duration_minutes INT DEFAULT 60,              -- 수업 시간
  max_students INT DEFAULT 12,
  min_students INT DEFAULT 4,

  -- 가격
  price_per_lesson INT,                         -- 1회 가격
  package_options JSONB DEFAULT '[
    {"name": "4회권", "lessons": 4, "price": 120000, "validity_days": 30},
    {"name": "8회권", "lessons": 8, "price": 220000, "validity_days": 60},
    {"name": "월정액", "lessons": -1, "price": 250000, "validity_days": 30}
  ]'::jsonb,

  -- 커리큘럼
  curriculum JSONB,                             -- 주차별 커리큘럼
  skills_focus TEXT[],                          -- ['드리블', '패스', '슈팅']

  status TEXT DEFAULT 'active',                 -- 'active' | 'inactive' | 'full'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 정규 스케줄 테이블 (시간표 템플릿)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES users(id) ON DELETE SET NULL,

  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(program_id, day_of_week, start_time)
);

-- ────────────────────────────────────────────
-- 학생 테이블 확장 (지점 연결)
-- ────────────────────────────────────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS level class_level DEFAULT 'beginner';
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS uniform_size TEXT;

-- 학생-프로그램 등록 (다대다)
CREATE TABLE IF NOT EXISTS student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES student_payments(id),

  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',                 -- 'active' | 'expired' | 'suspended' | 'cancelled'

  UNIQUE(student_id, program_id)
);

-- ────────────────────────────────────────────
-- 대시보드 통계 뷰 (오너용)
-- ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_owner_dashboard AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,

  -- 지점 통계
  COUNT(DISTINCT b.id) AS total_branches,
  COUNT(DISTINCT CASE WHEN b.status = 'active' THEN b.id END) AS active_branches,

  -- 학생 통계
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT CASE WHEN sp.status = 'paid' AND sp.qr_active = TRUE THEN s.id END) AS active_students,

  -- 코치 통계
  COUNT(DISTINCT CASE WHEN u.role = 'coach' AND u.status = 'active' THEN u.id END) AS total_coaches,

  -- 매출 통계 (이번 달)
  COALESCE(SUM(
    CASE WHEN sp.paid = TRUE
         AND sp.paid_at >= DATE_TRUNC('month', CURRENT_DATE)
    THEN sp.amount ELSE 0 END
  ), 0) AS monthly_revenue,

  -- 출석 통계 (이번 달)
  COUNT(DISTINCT CASE
    WHEN ar.check_in_time >= DATE_TRUNC('month', CURRENT_DATE)
    THEN ar.id END
  ) AS monthly_attendance

FROM organizations o
LEFT JOIN branches b ON o.id = b.organization_id
LEFT JOIN students s ON b.id = s.branch_id
LEFT JOIN student_payments sp ON s.id = sp.student_id
LEFT JOIN users u ON b.id = u.branch_id
LEFT JOIN attendance_records ar ON s.id = ar.student_id
GROUP BY o.id, o.name;

-- ────────────────────────────────────────────
-- 대시보드 통계 뷰 (원장용)
-- ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_director_dashboard AS
SELECT
  b.id AS branch_id,
  b.name AS branch_name,
  b.organization_id,

  -- 학생 통계
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT CASE WHEN sp.qr_active = TRUE THEN s.id END) AS active_students,
  COUNT(DISTINCT CASE WHEN sp.status = 'overdue' THEN s.id END) AS overdue_students,

  -- 코치 통계
  COUNT(DISTINCT CASE WHEN u.role = 'coach' AND u.status = 'active' THEN u.id END) AS active_coaches,

  -- 오늘 출석
  COUNT(DISTINCT CASE
    WHEN ar.check_in_time >= CURRENT_DATE
    THEN ar.id END
  ) AS today_attendance,

  -- 이번 주 매출
  COALESCE(SUM(
    CASE WHEN sp.paid = TRUE
         AND sp.paid_at >= DATE_TRUNC('week', CURRENT_DATE)
    THEN sp.amount ELSE 0 END
  ), 0) AS weekly_revenue,

  -- 수업 통계 (오늘)
  (SELECT COUNT(*) FROM lesson_slots ls
   WHERE ls.location LIKE '%' || b.name || '%'
   AND ls.date = CURRENT_DATE) AS today_lessons

FROM branches b
LEFT JOIN students s ON b.id = s.branch_id
LEFT JOIN student_payments sp ON s.id = sp.student_id
LEFT JOIN users u ON b.id = u.branch_id
LEFT JOIN attendance_records ar ON s.id = ar.student_id
GROUP BY b.id, b.name, b.organization_id;

-- ────────────────────────────────────────────
-- 대시보드 통계 뷰 (관리자용)
-- ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_admin_dashboard AS
SELECT
  b.id AS branch_id,
  u.id AS admin_id,

  -- 오늘 할 일
  (SELECT COUNT(*) FROM student_payments sp2
   JOIN students s2 ON sp2.student_id = s2.id
   WHERE s2.branch_id = b.id
   AND sp2.status = 'pending'
   AND sp2.due_date <= CURRENT_DATE + INTERVAL '3 days') AS pending_payments,

  -- 오늘 수업
  (SELECT COUNT(*) FROM lesson_slots ls
   WHERE ls.date = CURRENT_DATE) AS today_classes,

  -- 미출석 학생 (오늘 예정된 학생 중)
  0 AS absent_students,

  -- 신규 문의
  0 AS new_inquiries

FROM branches b
JOIN users u ON b.id = u.branch_id AND u.role = 'admin';

-- ────────────────────────────────────────────
-- 인덱스
-- ────────────────────────────────────────────
CREATE INDEX idx_branches_org ON branches(organization_id);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_programs_branch ON programs(branch_id);
CREATE INDEX idx_courts_branch ON courts(branch_id);
CREATE INDEX idx_students_branch ON students(branch_id);
CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_program ON student_enrollments(program_id);

-- ────────────────────────────────────────────
-- 사용자 QR 코드 생성 트리거
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_user_qr()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_code := UPPER(NEW.role::TEXT) || '-' || NEW.id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_user_qr
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION generate_user_qr();

-- ────────────────────────────────────────────
-- 지점 통계 자동 업데이트 트리거
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_branch_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  -- 변경된 학생의 지점 ID 결정
  IF TG_OP = 'DELETE' THEN
    v_branch_id := OLD.branch_id;
  ELSE
    v_branch_id := NEW.branch_id;
  END IF;

  IF v_branch_id IS NOT NULL THEN
    UPDATE branches
    SET
      stats_cache = jsonb_build_object(
        'total_students', (SELECT COUNT(*) FROM students WHERE branch_id = v_branch_id),
        'active_students', (SELECT COUNT(DISTINCT s.id) FROM students s
                           JOIN student_payments sp ON s.id = sp.student_id
                           WHERE s.branch_id = v_branch_id AND sp.qr_active = TRUE),
        'total_coaches', (SELECT COUNT(*) FROM users WHERE branch_id = v_branch_id AND role = 'coach'),
        'monthly_revenue', (SELECT COALESCE(SUM(sp.amount), 0) FROM student_payments sp
                           JOIN students s ON sp.student_id = s.id
                           WHERE s.branch_id = v_branch_id
                           AND sp.paid = TRUE
                           AND sp.paid_at >= DATE_TRUNC('month', CURRENT_DATE))
      ),
      stats_updated_at = NOW()
    WHERE id = v_branch_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_branch_stats
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW
EXECUTE FUNCTION update_branch_stats();

-- ────────────────────────────────────────────
-- Row Level Security (RLS) 정책
-- ────────────────────────────────────────────

-- organizations 테이블 RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "오너는 자신의 조직만 볼 수 있음" ON organizations
  FOR ALL USING (
    id IN (
      SELECT organization_id FROM users
      WHERE auth_id = auth.uid() AND role = 'owner'
    )
  );

-- branches 테이블 RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 조직 지점만 볼 수 있음" ON branches
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "원장 이상만 지점 수정 가능" ON branches
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth_id = auth.uid() AND role IN ('owner', 'director')
    )
  );

-- students 테이블 RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "같은 지점 사용자만 학생 조회 가능" ON students
  FOR SELECT USING (
    branch_id IN (
      SELECT branch_id FROM users WHERE auth_id = auth.uid()
    )
    OR
    branch_id IN (
      SELECT id FROM branches WHERE organization_id IN (
        SELECT organization_id FROM users
        WHERE auth_id = auth.uid() AND role IN ('owner', 'director')
      )
    )
  );

-- users 테이블 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "같은 조직 사용자만 조회 가능" ON users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────
-- 역할별 권한 체크 함수
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_permission TEXT,
  p_target_branch_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id;

  -- 오너는 모든 권한
  IF v_user.role = 'owner' THEN
    RETURN TRUE;
  END IF;

  -- 원장은 자기 조직 내 모든 권한
  IF v_user.role = 'director' THEN
    IF p_target_branch_id IS NULL THEN
      RETURN TRUE;
    END IF;
    RETURN EXISTS (
      SELECT 1 FROM branches
      WHERE id = p_target_branch_id
      AND organization_id = v_user.organization_id
    );
  END IF;

  -- 관리자는 자기 지점 내 권한
  IF v_user.role = 'admin' THEN
    IF p_target_branch_id IS NULL OR p_target_branch_id = v_user.branch_id THEN
      RETURN p_permission IN ('view', 'edit_student', 'manage_attendance', 'manage_payment');
    END IF;
    RETURN FALSE;
  END IF;

  -- 코치는 출석/피드백만
  IF v_user.role = 'coach' THEN
    RETURN p_permission IN ('view', 'manage_attendance', 'add_feedback');
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 샘플 데이터 (개발용)
-- ────────────────────────────────────────────
-- INSERT INTO organizations (name, business_number, ceo_name)
-- VALUES ('온리쌤 아카데미', '123-45-67890', '홍길동');
