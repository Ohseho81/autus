-- ============================================
-- 🏀 올댓바스켓 (AllThatBasket) 스키마
-- AUTUS V-Index + Risk Engine 통합
-- ============================================

-- 1. 학생 테이블
CREATE TABLE IF NOT EXISTS atb_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  parent_name VARCHAR(100),
  parent_phone VARCHAR(20) NOT NULL,

  -- 학교 정보
  school VARCHAR(100),
  birth_year INTEGER,
  grade VARCHAR(20),

  -- 수업 정보
  class_id UUID REFERENCES atb_classes(id),
  class_name VARCHAR(100),
  schedule_days VARCHAR(50),
  schedule_time VARCHAR(20),
  sessions_per_week INTEGER DEFAULT 2,

  -- 선수 정보
  position VARCHAR(10) DEFAULT 'PG',
  uniform_number INTEGER,
  shuttle_required BOOLEAN DEFAULT false,

  -- 수납 정보
  monthly_fee INTEGER DEFAULT 350000,
  payment_status VARCHAR(20) DEFAULT 'pending',

  -- 성과 지표 (V-Index용)
  skill_score INTEGER DEFAULT 50,
  game_performance INTEGER DEFAULT 50,
  engagement_score INTEGER DEFAULT 50,
  parent_nps INTEGER DEFAULT 7,

  -- 메모
  notes TEXT,

  -- 상태
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. 수업 테이블
CREATE TABLE IF NOT EXISTS atb_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  schedule_days VARCHAR(50),
  schedule_time VARCHAR(20),
  sessions_per_week INTEGER DEFAULT 2,
  monthly_fee INTEGER DEFAULT 350000,
  max_students INTEGER DEFAULT 15,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. 출석 테이블
CREATE TABLE IF NOT EXISTS atb_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES atb_students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES atb_classes(id),
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  daily_revenue INTEGER DEFAULT 0,
  recorded_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- 중복 방지
  UNIQUE(student_id, class_id, attendance_date)
);

-- 4. 수납 테이블
CREATE TABLE IF NOT EXISTS atb_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES atb_students(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_month VARCHAR(7) NOT NULL, -- YYYY-MM
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'refunded')),
  paid_amount INTEGER DEFAULT 0,
  outstanding INTEGER DEFAULT 0,
  payment_method VARCHAR(50),
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_atb_students_class ON atb_students(class_id);
CREATE INDEX IF NOT EXISTS idx_atb_students_status ON atb_students(status);
CREATE INDEX IF NOT EXISTS idx_atb_attendance_student ON atb_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_atb_attendance_date ON atb_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_atb_payments_student ON atb_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_atb_payments_month ON atb_payments(payment_month);
CREATE INDEX IF NOT EXISTS idx_atb_payments_status ON atb_payments(status);

-- ============================================
-- 6. 통합 대시보드 뷰 (V-Index 계산용)
-- ============================================
CREATE OR REPLACE VIEW atb_student_dashboard AS
SELECT
  s.*,

  -- 출석 통계
  COALESCE(att.total_sessions, 0) AS total_sessions,
  COALESCE(att.present_count, 0) AS present_count,
  COALESCE(att.absent_count, 0) AS absent_count,
  COALESCE(att.late_count, 0) AS late_count,
  CASE
    WHEN COALESCE(att.total_sessions, 0) > 0
    THEN ROUND((att.present_count::NUMERIC / att.total_sessions) * 100)
    ELSE 0
  END AS attendance_rate,

  -- 분기 출석률 (최근 3개월)
  COALESCE(qatt.quarterly_attendance_rate, 0) AS quarterly_attendance_rate,

  -- 수납 통계
  COALESCE(pay.total_paid, 0) AS total_paid,
  COALESCE(pay.total_outstanding, 0) AS total_outstanding,

  -- 일별 매출 누적
  COALESCE(att.total_daily_revenue, 0) AS total_daily_revenue,

  -- 등록 개월 수
  EXTRACT(MONTH FROM AGE(now(), s.created_at))::INTEGER AS months_enrolled

FROM atb_students s

-- 출석 통계 조인
LEFT JOIN (
  SELECT
    student_id,
    COUNT(*) AS total_sessions,
    COUNT(*) FILTER (WHERE status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
    COUNT(*) FILTER (WHERE status = 'late') AS late_count,
    SUM(daily_revenue) AS total_daily_revenue
  FROM atb_attendance
  GROUP BY student_id
) att ON s.id = att.student_id

-- 분기 출석률 조인 (최근 3개월)
LEFT JOIN (
  SELECT
    student_id,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'present')::NUMERIC / COUNT(*)) * 100)
      ELSE 0
    END AS quarterly_attendance_rate
  FROM atb_attendance
  WHERE attendance_date >= CURRENT_DATE - INTERVAL '3 months'
  GROUP BY student_id
) qatt ON s.id = qatt.student_id

-- 수납 통계 조인
LEFT JOIN (
  SELECT
    student_id,
    SUM(paid_amount) AS total_paid,
    SUM(outstanding) AS total_outstanding
  FROM atb_payments
  GROUP BY student_id
) pay ON s.id = pay.student_id

WHERE s.status = 'active';

-- ============================================
-- 7. 샘플 데이터 (개발용)
-- ============================================

-- 수업 샘플
INSERT INTO atb_classes (id, name, schedule_days, schedule_time, sessions_per_week, monthly_fee, max_students) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'A반 (주니어)', '월,수,금', '16:00', 3, 450000, 15),
  ('a0000000-0000-0000-0000-000000000002', 'B반 (키즈)', '화,목', '16:00', 2, 350000, 12),
  ('a0000000-0000-0000-0000-000000000003', '엘리트반', '월,수,금,토', '18:00', 4, 600000, 10)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. RLS 정책 (Row Level Security)
-- ============================================

-- RLS 활성화
ALTER TABLE atb_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_payments ENABLE ROW LEVEL SECURITY;

-- 기본 정책 (모든 인증된 사용자 접근 허용 - 개발용)
-- 실서비스에서는 역할 기반 정책 적용 필요
CREATE POLICY "Allow all for authenticated" ON atb_students
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated" ON atb_classes
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated" ON atb_attendance
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated" ON atb_payments
  FOR ALL USING (true);

-- ============================================
-- 9. 함수: 출석률 업데이트 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_student_attendance_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- 트리거에서 학생의 payment_status 업데이트
  -- (실제 로직은 애플리케이션 레벨에서 처리)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_attendance_update
AFTER INSERT OR UPDATE ON atb_attendance
FOR EACH ROW EXECUTE FUNCTION update_student_attendance_rate();

-- ============================================
-- 완료!
-- ============================================
COMMENT ON TABLE atb_students IS '올댓바스켓 선수 마스터 테이블';
COMMENT ON TABLE atb_classes IS '올댓바스켓 수업 마스터 테이블';
COMMENT ON TABLE atb_attendance IS '올댓바스켓 출석 기록 테이블 (Immortal Ledger)';
COMMENT ON TABLE atb_payments IS '올댓바스켓 수납 기록 테이블';
COMMENT ON VIEW atb_student_dashboard IS 'V-Index 계산을 위한 통합 대시보드 뷰';
