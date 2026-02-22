-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏀 Session Students (수업-학생 매핑 테이블)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. 세션-학생 매핑 테이블
CREATE TABLE IF NOT EXISTS atb_session_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES atb_lesson_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'present', 'absent', 'late'
  checked_at TIMESTAMPTZ,
  checked_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_session_students_session ON atb_session_students(session_id);
CREATE INDEX IF NOT EXISTS idx_session_students_student ON atb_session_students(student_id);

-- 2. RLS 활성화
ALTER TABLE atb_session_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for testing" ON atb_session_students FOR ALL USING (true);

-- 3. 테스트 데이터: 오늘 수업에 학생 배정
-- 유소년 A반 (세션 aaaaaaaa-...)에 학생 배정
INSERT INTO atb_session_students (session_id, student_id, attendance_status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'pending'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'pending'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'pending')
ON CONFLICT (session_id, student_id) DO NOTHING;

-- 중등 심화반에 학생 배정
INSERT INTO atb_session_students (session_id, student_id, attendance_status) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'pending'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'pending')
ON CONFLICT (session_id, student_id) DO NOTHING;

-- 고등 엘리트에 학생 배정
INSERT INTO atb_session_students (session_id, student_id, attendance_status) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'pending'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'pending')
ON CONFLICT (session_id, student_id) DO NOTHING;

-- 4. 긴급 신고 테이블
CREATE TABLE IF NOT EXISTS atb_emergency_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES atb_lesson_sessions(id) ON DELETE SET NULL,
  staff_id VARCHAR(100),
  message TEXT,
  location TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'acknowledged', 'resolved'
  notification_sent BOOLEAN DEFAULT FALSE,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_reports_status ON atb_emergency_reports(status);

ALTER TABLE atb_emergency_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for testing" ON atb_emergency_reports FOR ALL USING (true);

-- 5. 알림 로그 테이블
CREATE TABLE IF NOT EXISTS atb_notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'emergency', 'attendance', 'payment', etc.
  recipients UUID[],
  message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE atb_notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for testing" ON atb_notification_logs FOR ALL USING (true);

-- 6. 완료 메시지
SELECT '✅ Session Students 테이블 생성 완료!' as result;
SELECT '👥 테스트 학생 3명이 오늘 수업에 배정됨' as info;
