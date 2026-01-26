-- ============================================
-- KRATON v2.0 Supabase Schema
-- ============================================

-- 학생 테이블
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(20),
  parent_phone VARCHAR(20),
  parent_name VARCHAR(100),
  teacher_id UUID,
  state INTEGER DEFAULT 2 CHECK (state >= 1 AND state <= 6),
  attendance_rate DECIMAL(5,2) DEFAULT 100,
  assignment_rate DECIMAL(5,2) DEFAULT 100,
  attendance_streak INTEGER DEFAULT 0,
  score_improvement DECIMAL(5,2) DEFAULT 0,
  v_growth DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제 테이블
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_key VARCHAR(255) UNIQUE,
  student_id UUID REFERENCES students(id),
  order_id VARCHAR(255),
  amount INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  method VARCHAR(50),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 출결 테이블
CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'present',
  check_in_time TIME,
  check_out_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- 위험 큐 테이블
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  state INTEGER CHECK (state >= 1 AND state <= 6),
  signals JSONB DEFAULT '[]',
  probability INTEGER DEFAULT 50,
  suggested_action TEXT,
  estimated_value INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- V 점수 히스토리
CREATE TABLE IF NOT EXISTS v_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  value DECIMAL(10,2) NOT NULL,
  t_factor DECIMAL(5,2),
  m_factor DECIMAL(5,2),
  s_factor DECIMAL(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 액션 실행 기록
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  type VARCHAR(50) NOT NULL,
  title TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  automation_rate INTEGER DEFAULT 0,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 피드백 테이블
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  notification_id UUID,
  card_type VARCHAR(50),
  feedback_type VARCHAR(50),
  feedback_score INTEGER,
  feedback_label VARCHAR(100),
  feedback_comment TEXT,
  action_required BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 표준 합의 테이블
CREATE TABLE IF NOT EXISTS standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  conditions JSONB,
  actions JSONB,
  execution_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 보상 테이블
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  type VARCHAR(50) NOT NULL,
  value INTEGER DEFAULT 0,
  reason TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 발송 기록
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  type VARCHAR(50),
  channel VARCHAR(20) DEFAULT 'kakao',
  status VARCHAR(20) DEFAULT 'sent',
  feedback_received BOOLEAN DEFAULT FALSE,
  feedback_score INTEGER,
  effectiveness VARCHAR(20),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 감사 로그
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  details JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE risks;
ALTER PUBLICATION supabase_realtime ADD TABLE v_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE actions;
ALTER PUBLICATION supabase_realtime ADD TABLE feedbacks;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_students_state ON students(state);
CREATE INDEX IF NOT EXISTS idx_risks_student ON risks(student_id);
CREATE INDEX IF NOT EXISTS idx_risks_resolved ON risks(resolved);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_v_scores_student ON v_scores(student_id);

-- 샘플 데이터 (테스트용)
INSERT INTO students (name, grade, state, attendance_rate, assignment_rate, attendance_streak) VALUES
  ('김민수', '중2', 6, 65, 40, 0),
  ('이지은', '중1', 5, 78, 60, 2),
  ('박준혁', '중3', 4, 85, 75, 5),
  ('최서연', '중2', 2, 95, 92, 12),
  ('정민호', '중1', 2, 98, 95, 18)
ON CONFLICT DO NOTHING;
