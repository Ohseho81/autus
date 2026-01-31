-- ============================================
-- 🏀 올댓바스켓 통합 관리 시스템
-- 수납/출석 일체화 스키마
-- ============================================

-- 1. 학생 (Students) 테이블
CREATE TABLE IF NOT EXISTS atb_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  name VARCHAR(50) NOT NULL,                    -- 이름
  phone VARCHAR(20),                            -- 연락처
  parent_name VARCHAR(50),                      -- 학부모이름
  parent_phone VARCHAR(20),                     -- 학부모 연락처

  -- 학교/학년 정보
  school VARCHAR(100),                          -- 학교
  birth_year INTEGER,                           -- 연생 (예: 2015)
  grade VARCHAR(20),                            -- 학년 (예: '초3', '중1')

  -- 수업 관련
  shuttle_required BOOLEAN DEFAULT false,       -- 셔틀유무
  uniform_number INTEGER,                       -- 유니폼 백넘버
  position VARCHAR(10),                         -- 포지션 (PG, SG, SF, PF, C)

  -- AUTUS 메트릭스
  skill_score INTEGER DEFAULT 50,               -- 스킬 점수 (0-100)
  game_performance INTEGER DEFAULT 50,          -- 경기 성과 (0-100)
  parent_nps INTEGER DEFAULT 8,                 -- 학부모 NPS (0-10)
  engagement_score INTEGER DEFAULT 70,          -- 참여도 (0-100)

  -- 상태
  status VARCHAR(20) DEFAULT 'active',          -- active, inactive, graduated, dropped
  memo TEXT,                                    -- 메모

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 수업 (Classes) 테이블
CREATE TABLE IF NOT EXISTS atb_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,                   -- 수업명 (예: 'A반 주니어')
  description TEXT,                             -- 수업 설명

  -- 일정
  schedule_days VARCHAR(50),                    -- 수업 요일 (예: '월,수,금')
  schedule_time TIME,                           -- 수업 시간 (예: '16:00')
  duration_minutes INTEGER DEFAULT 90,          -- 수업 시간 (분)
  sessions_per_week INTEGER DEFAULT 3,          -- 주 수업 횟수

  -- 비용
  monthly_fee INTEGER DEFAULT 0,                -- 월 수강료

  -- 상태
  status VARCHAR(20) DEFAULT 'active',          -- active, inactive
  max_students INTEGER DEFAULT 20,              -- 최대 인원

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 수강 등록 (Enrollments) 테이블 - 학생 ↔ 수업 연결
CREATE TABLE IF NOT EXISTS atb_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES atb_classes(id) ON DELETE CASCADE,

  enrolled_at DATE DEFAULT CURRENT_DATE,        -- 등록일
  dropped_at DATE,                              -- 퇴원일

  status VARCHAR(20) DEFAULT 'active',          -- active, paused, dropped

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, class_id)
);

-- 4. 수납 (Payments) 테이블
CREATE TABLE IF NOT EXISTS atb_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,

  -- 결제 정보
  amount INTEGER NOT NULL,                      -- 결제 금액
  payment_month VARCHAR(7) NOT NULL,            -- 결제 대상 월 (예: '2026-01')

  -- 상태
  status VARCHAR(20) DEFAULT 'pending',         -- pending, paid, partial, overdue, refunded
  paid_amount INTEGER DEFAULT 0,                -- 납부 금액
  outstanding INTEGER DEFAULT 0,                -- 미수금

  -- 결제 상세
  payment_method VARCHAR(30),                   -- 결제 방법 (card, transfer, cash)
  paid_at TIMESTAMPTZ,                          -- 결제일시
  due_date DATE,                                -- 납부 기한

  memo TEXT,                                    -- 메모

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 출석 (Attendance) 테이블
CREATE TABLE IF NOT EXISTS atb_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES atb_classes(id) ON DELETE CASCADE,

  -- 출석 정보
  attendance_date DATE NOT NULL,                -- 출석 날짜
  status VARCHAR(20) DEFAULT 'present',         -- present, absent, late, excused

  -- 일별 매출 연동
  daily_revenue INTEGER DEFAULT 0,              -- 개인일별매출 (해당 수업 1회 비용)

  -- 기록
  check_in_time TIMESTAMPTZ,                    -- 체크인 시간
  check_out_time TIMESTAMPTZ,                   -- 체크아웃 시간
  recorded_by VARCHAR(50),                      -- 기록자 (코치 이름)

  memo TEXT,                                    -- 메모

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, class_id, attendance_date)
);

-- 6. 출석률 통계 뷰 (View)
CREATE OR REPLACE VIEW atb_attendance_stats AS
SELECT
  s.id AS student_id,
  s.name AS student_name,
  c.id AS class_id,
  c.name AS class_name,

  -- 전체 출석률
  COUNT(a.id) FILTER (WHERE a.status = 'present') AS total_present,
  COUNT(a.id) AS total_sessions,
  ROUND(
    COUNT(a.id) FILTER (WHERE a.status = 'present')::DECIMAL /
    NULLIF(COUNT(a.id), 0) * 100, 1
  ) AS attendance_rate,

  -- 분기별 출석률 (최근 3개월)
  COUNT(a.id) FILTER (
    WHERE a.status = 'present'
    AND a.attendance_date >= CURRENT_DATE - INTERVAL '3 months'
  ) AS quarterly_present,
  COUNT(a.id) FILTER (
    WHERE a.attendance_date >= CURRENT_DATE - INTERVAL '3 months'
  ) AS quarterly_sessions,
  ROUND(
    COUNT(a.id) FILTER (
      WHERE a.status = 'present'
      AND a.attendance_date >= CURRENT_DATE - INTERVAL '3 months'
    )::DECIMAL /
    NULLIF(COUNT(a.id) FILTER (
      WHERE a.attendance_date >= CURRENT_DATE - INTERVAL '3 months'
    ), 0) * 100, 1
  ) AS quarterly_attendance_rate,

  -- 일별 매출 합계
  SUM(a.daily_revenue) AS total_daily_revenue

FROM atb_students s
LEFT JOIN atb_enrollments e ON s.id = e.student_id
LEFT JOIN atb_classes c ON e.class_id = c.id
LEFT JOIN atb_attendance a ON s.id = a.student_id AND c.id = a.class_id
GROUP BY s.id, s.name, c.id, c.name;

-- 7. 수납 현황 뷰 (View)
CREATE OR REPLACE VIEW atb_payment_status AS
SELECT
  s.id AS student_id,
  s.name AS student_name,

  -- 현재 월 수납
  COALESCE(
    (SELECT status FROM atb_payments
     WHERE student_id = s.id
     AND payment_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
     LIMIT 1),
    'no_record'
  ) AS current_month_status,

  -- 총 미수금
  COALESCE(
    SUM(p.outstanding) FILTER (WHERE p.status IN ('pending', 'partial', 'overdue')),
    0
  ) AS total_outstanding,

  -- 연체 횟수
  COUNT(p.id) FILTER (WHERE p.status = 'overdue') AS overdue_count,

  -- 최근 결제일
  MAX(p.paid_at) AS last_payment_date

FROM atb_students s
LEFT JOIN atb_payments p ON s.id = p.student_id
GROUP BY s.id, s.name;

-- 8. 학생 종합 현황 뷰 (통합 대시보드용)
CREATE OR REPLACE VIEW atb_student_dashboard AS
SELECT
  s.*,

  -- 수업 정보
  c.name AS class_name,
  c.schedule_days,
  c.schedule_time,
  c.sessions_per_week,
  c.monthly_fee,

  -- 등록 정보
  e.enrolled_at,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.enrolled_at))::INTEGER AS months_enrolled,

  -- 출석 통계
  ast.attendance_rate,
  ast.quarterly_attendance_rate,
  ast.total_daily_revenue,

  -- 수납 현황
  ps.current_month_status AS payment_status,
  ps.total_outstanding,
  ps.overdue_count

FROM atb_students s
LEFT JOIN atb_enrollments e ON s.id = e.student_id AND e.status = 'active'
LEFT JOIN atb_classes c ON e.class_id = c.id
LEFT JOIN atb_attendance_stats ast ON s.id = ast.student_id AND c.id = ast.class_id
LEFT JOIN atb_payment_status ps ON s.id = ps.student_id
WHERE s.status = 'active';

-- ============================================
-- 인덱스 (성능 최적화)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_status ON atb_students(status);
CREATE INDEX IF NOT EXISTS idx_students_school ON atb_students(school);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON atb_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON atb_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON atb_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_month ON atb_payments(payment_month);
CREATE INDEX IF NOT EXISTS idx_payments_status ON atb_payments(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON atb_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON atb_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON atb_attendance(class_id, attendance_date);

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================
ALTER TABLE atb_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_attendance ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 인증된 사용자만 접근 가능
CREATE POLICY "Authenticated users can view students" ON atb_students
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage students" ON atb_students
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view classes" ON atb_classes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage classes" ON atb_classes
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view enrollments" ON atb_enrollments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage enrollments" ON atb_enrollments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view payments" ON atb_payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage payments" ON atb_payments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view attendance" ON atb_attendance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage attendance" ON atb_attendance
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 트리거: updated_at 자동 갱신
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON atb_students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON atb_classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON atb_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
