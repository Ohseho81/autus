-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏀 온리쌤 종합 관리 시스템 데이터베이스 스키마
-- ═══════════════════════════════════════════════════════════════════════════════
-- 버전: 3.0
-- 작성일: 2026-02-05
-- 6대 핵심 기능 지원:
-- 1. 강사 학생관리 (출결+성과영상)
-- 2. 관리자 스케줄 관리 (상담+결제연동)
-- 3. 카카오톡 채널 알림
-- 4. 학부모 요청 실시간 처리
-- 5. 결제/수납 출석부 연동
-- 6. 오픈팀 스케줄 알고리즘
-- ═══════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 1. 코치 테이블 확장                                                          │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 코치 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS atb_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  employee_id TEXT,
  specialties TEXT[], -- 전문 분야
  color_code TEXT DEFAULT '#FF9500', -- 시간표 색상
  avatar_url TEXT,
  role TEXT DEFAULT 'coach', -- 'coach', 'head_coach', 'admin'
  duties TEXT[], -- 담당 업무 ('인포', '상담실', '코트정리' 등)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 코치 데이터 삽입 (없으면)
INSERT INTO atb_coaches (name, color_code, role) VALUES
  ('오세호', '#FF5722', 'admin'),
  ('심재혁', '#2196F3', 'head_coach'),
  ('김용우', '#4CAF50', 'coach'),
  ('윤홍규', '#9C27B0', 'coach'),
  ('최민기', '#FF9800', 'coach'),
  ('이윤우', '#00BCD4', 'coach'),
  ('정은지', '#E91E63', 'coach'),
  ('최준', '#3F51B5', 'coach'),
  ('김민정', '#8BC34A', 'coach'),
  ('박진규', '#FF5722', 'coach'),
  ('김권민', '#607D8B', 'coach'),
  ('위정우', '#795548', 'coach'),
  ('임묘희', '#009688', 'coach'),
  ('오윤혁', '#673AB7', 'coach'),
  ('오승원', '#FFC107', 'coach')
ON CONFLICT DO NOTHING;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 2. 학생 테이블 확장                                                          │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 학생 테이블 컬럼 추가 (없으면)
ALTER TABLE atb_students
  ADD COLUMN IF NOT EXISTS birth_year INT,
  ADD COLUMN IF NOT EXISTS grade_level TEXT,
  ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS team_name TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT,
  ADD COLUMN IF NOT EXISTS parent_kakao_id TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS sessions_remaining INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS memo TEXT;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 3. 수업 유형 테이블                                                          │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS atb_class_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'regular', 'player', 'open', 'team', 'private', 'rental'
  name TEXT NOT NULL,
  description TEXT,
  billing_type TEXT DEFAULT 'monthly', -- 'monthly', 'per_session', 'package'
  default_price INT,
  default_max_students INT,
  color_code TEXT,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO atb_class_types (code, name, billing_type, default_price, color_code) VALUES
  ('regular', '정규반', 'monthly', 200000, '#4CAF50'),
  ('player', '선수반', 'monthly', 300000, '#2196F3'),
  ('open', '오픈반', 'per_session', 30000, '#FF9800'),
  ('team', '팀수업', 'monthly', 250000, '#9C27B0'),
  ('private', '개인레슨', 'per_session', 80000, '#E91E63'),
  ('rental', '대관', 'per_session', 150000, '#607D8B')
ON CONFLICT (code) DO NOTHING;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 4. 클래스(반) 테이블 확장                                                    │
-- └─────────────────────────────────────────────────────────────────────────────┘

ALTER TABLE atb_classes
  ADD COLUMN IF NOT EXISTS class_type_id UUID REFERENCES atb_class_types(id),
  ADD COLUMN IF NOT EXISTS target_grades TEXT[],
  ADD COLUMN IF NOT EXISTS target_birth_years INT[],
  ADD COLUMN IF NOT EXISTS coach_ratio TEXT, -- '4:1', '3:1' 등
  ADD COLUMN IF NOT EXISTS monthly_fee INT,
  ADD COLUMN IF NOT EXISTS per_session_fee INT,
  ADD COLUMN IF NOT EXISTS schedule_pattern JSONB; -- 주간 스케줄 패턴

-- 기본 클래스 데이터 삽입
INSERT INTO atb_classes (name, max_students, status) VALUES
  ('유치,초1부', 10, 'active'),
  ('초1,2부', 12, 'active'),
  ('초2,3부', 12, 'active'),
  ('초3,4부', 15, 'active'),
  ('초4,5부', 15, 'active'),
  ('초5,6부', 15, 'active'),
  ('초6,중1', 12, 'active'),
  ('중등부', 15, 'active'),
  ('여중부', 12, 'active'),
  ('고등부', 12, 'active'),
  ('2011 선수반', 20, 'active'),
  ('2012 선수반', 20, 'active'),
  ('2013 선수반', 20, 'active'),
  ('2014 선수반', 15, 'active'),
  ('고등선수반', 15, 'active'),
  ('초2,3오픈', 15, 'active'),
  ('초4,5오픈', 15, 'active'),
  ('초5,6오픈', 15, 'active'),
  ('대표팀', 12, 'active')
ON CONFLICT DO NOTHING;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 5. 성과 기록 테이블 (영상 포함)                                               │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS atb_performance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES atb_coaches(id),
  session_id UUID REFERENCES atb_sessions(id),
  record_type TEXT NOT NULL, -- 'video', 'assessment', 'note', 'achievement'
  title TEXT,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  skill_category TEXT, -- 'dribbling', 'shooting', 'defense', 'passing', 'footwork'
  score INT CHECK (score >= 0 AND score <= 100),
  feedback TEXT,
  is_shared_to_parent BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  parent_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_student ON atb_performance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_performance_session ON atb_performance_records(session_id);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 6. 상담 관리 테이블                                                          │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS atb_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
  parent_name TEXT,
  parent_phone TEXT,
  staff_id UUID REFERENCES atb_coaches(id),
  scheduled_at TIMESTAMPTZ,
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  consultation_type TEXT NOT NULL, -- 'enrollment', 'progress', 'complaint', 'schedule', 'payment', 'other'
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
  location TEXT DEFAULT '상담실',
  summary TEXT,
  outcome TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_date ON atb_consultations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultation_status ON atb_consultations(status);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 7. 학부모 요청 테이블                                                         │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS atb_parent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
  parent_name TEXT,
  parent_phone TEXT,
  request_type TEXT NOT NULL, -- 'schedule_change', 'makeup', 'absence', 'consultation', 'payment', 'feedback', 'other'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'completed', 'rejected'
  title TEXT,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES atb_coaches(id),
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  satisfaction_rating INT CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  sla_deadline TIMESTAMPTZ, -- 24시간 내 응답 SLA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_request_status ON atb_parent_requests(status);
CREATE INDEX IF NOT EXISTS idx_parent_request_priority ON atb_parent_requests(priority);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 8. 결제/수납 테이블                                                          │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS atb_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
  parent_name TEXT,
  parent_phone TEXT,
  payment_type TEXT NOT NULL, -- 'monthly', 'per_session', 'package', 'event', 'equipment', 'refund'
  class_id UUID REFERENCES atb_classes(id),
  billing_month TEXT, -- '2026-02'
  amount INT NOT NULL,
  discount_amount INT DEFAULT 0,
  final_amount INT,
  sessions_included INT, -- 포함된 회차 수 (회차제)
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'card', 'transfer', 'cash', 'kakao_pay'
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'refunded', 'cancelled'
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_student ON atb_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON atb_payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_month ON atb_payments(billing_month);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 9. 알림 테이블 (카카오톡 연동)                                                │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS atb_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL, -- 'parent', 'coach', 'admin'
  recipient_id UUID,
  recipient_phone TEXT,
  recipient_kakao_id TEXT,
  channel TEXT DEFAULT 'kakao', -- 'kakao', 'sms', 'push', 'email'
  notification_type TEXT NOT NULL, -- 'attendance', 'schedule', 'payment', 'performance', 'announcement'
  template_code TEXT, -- 카카오 템플릿 코드
  title TEXT,
  message TEXT NOT NULL,
  variables JSONB, -- 템플릿 변수
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'read'
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_status ON atb_notifications(status);
CREATE INDEX IF NOT EXISTS idx_notification_scheduled ON atb_notifications(scheduled_at);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 10. 오픈 수업 예약 테이블                                                     │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS atb_open_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES atb_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'waitlist', 'cancelled', 'no_show'
  waitlist_position INT,
  payment_id UUID REFERENCES atb_payments(id),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  attended BOOLEAN,
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_reservation_session ON atb_open_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_reservation_status ON atb_open_reservations(status);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 11. 코트/시설 테이블                                                         │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS atb_courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- 'black', 'red', 'gate', 'gx'
  description TEXT,
  capacity INT,
  color_code TEXT,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO atb_courts (name, code, color_code, capacity) VALUES
  ('블랙코트', 'black', '#1A1A1A', 20),
  ('레드코트', 'red', '#F44336', 20),
  ('게이트코트', 'gate', '#4CAF50', 15),
  ('GX룸', 'gx', '#9C27B0', 10)
ON CONFLICT (code) DO NOTHING;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 12. 세션 테이블 확장                                                         │
-- └─────────────────────────────────────────────────────────────────────────────┘

ALTER TABLE atb_sessions
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES atb_coaches(id),
  ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES atb_courts(id),
  ADD COLUMN IF NOT EXISTS court_name TEXT, -- 빠른 조회용
  ADD COLUMN IF NOT EXISTS is_open_class BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_enrollment INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlist_count INT DEFAULT 0;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 13. 출석 기록 확장                                                           │
-- └─────────────────────────────────────────────────────────────────────────────┘

ALTER TABLE atb_session_students
  ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES atb_coaches(id),
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_deducted BOOLEAN DEFAULT false; -- 회차 차감 여부

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 14. 뷰: 오늘의 스케줄 (코치용)                                                │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW v_today_schedule AS
SELECT
  s.id,
  s.session_date,
  s.start_time,
  s.end_time,
  s.status,
  s.court_name,
  c.name as class_name,
  c.max_students,
  coach.name as coach_name,
  coach.color_code as coach_color,
  (SELECT COUNT(*) FROM atb_session_students ss WHERE ss.session_id = s.id) as enrolled_count,
  (SELECT COUNT(*) FROM atb_session_students ss WHERE ss.session_id = s.id AND ss.attendance_status = 'present') as present_count
FROM atb_sessions s
LEFT JOIN atb_classes c ON s.class_id = c.id
LEFT JOIN atb_coaches coach ON s.coach_id = coach.id
WHERE s.session_date = CURRENT_DATE
ORDER BY s.start_time;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 15. 뷰: 학생 현황 (학부모용)                                                  │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW v_student_status AS
SELECT
  st.id,
  st.name,
  st.photo_url,
  st.sessions_remaining,
  (SELECT COUNT(*) FROM atb_session_students ss
   JOIN atb_sessions s ON ss.session_id = s.id
   WHERE ss.student_id = st.id
   AND s.session_date >= DATE_TRUNC('month', CURRENT_DATE)
   AND ss.attendance_status = 'present') as monthly_attendance,
  (SELECT COUNT(*) FROM atb_performance_records pr
   WHERE pr.student_id = st.id
   AND pr.record_type = 'video'
   AND pr.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_videos,
  (SELECT p.status FROM atb_payments p
   WHERE p.student_id = st.id
   AND p.billing_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
   LIMIT 1) as payment_status
FROM atb_students st
WHERE st.status = 'active';

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 16. 함수: 오픈 수업 예약                                                      │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION fn_reserve_open_class(
  p_session_id UUID,
  p_student_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_max_students INT;
  v_current_count INT;
  v_waitlist_count INT;
  v_result JSONB;
BEGIN
  -- 정원 확인
  SELECT s.max_students, s.current_enrollment, s.waitlist_count
  INTO v_max_students, v_current_count, v_waitlist_count
  FROM atb_sessions s
  WHERE s.id = p_session_id AND s.is_open_class = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '오픈 수업이 아니거나 존재하지 않습니다');
  END IF;

  -- 중복 예약 확인
  IF EXISTS (SELECT 1 FROM atb_open_reservations WHERE session_id = p_session_id AND student_id = p_student_id AND status != 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 예약되어 있습니다');
  END IF;

  -- 정원 내 예약
  IF v_current_count < v_max_students THEN
    INSERT INTO atb_open_reservations (session_id, student_id, status, confirmed_at)
    VALUES (p_session_id, p_student_id, 'confirmed', NOW());

    UPDATE atb_sessions SET current_enrollment = current_enrollment + 1 WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'status', 'confirmed', 'position', v_current_count + 1);
  ELSE
    -- 대기자 등록
    INSERT INTO atb_open_reservations (session_id, student_id, status, waitlist_position)
    VALUES (p_session_id, p_student_id, 'waitlist', v_waitlist_count + 1);

    UPDATE atb_sessions SET waitlist_count = waitlist_count + 1 WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'status', 'waitlist', 'position', v_waitlist_count + 1);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 17. 함수: 출석 체크 및 회차 차감                                              │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION fn_check_attendance(
  p_session_id UUID,
  p_student_id UUID,
  p_status TEXT,
  p_coach_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_is_open_class BOOLEAN;
  v_sessions_remaining INT;
BEGIN
  -- 출석 상태 업데이트
  UPDATE atb_session_students
  SET
    attendance_status = p_status,
    check_in_time = CASE WHEN p_status = 'present' THEN NOW() ELSE check_in_time END,
    checked_by = p_coach_id
  WHERE session_id = p_session_id AND student_id = p_student_id;

  -- 오픈반 회차 차감 확인
  SELECT s.is_open_class INTO v_is_open_class
  FROM atb_sessions s WHERE s.id = p_session_id;

  IF v_is_open_class AND p_status = 'present' THEN
    -- 회차 차감
    UPDATE atb_students
    SET sessions_remaining = sessions_remaining - 1
    WHERE id = p_student_id AND sessions_remaining > 0;

    UPDATE atb_session_students
    SET session_deducted = true
    WHERE session_id = p_session_id AND student_id = p_student_id;

    SELECT sessions_remaining INTO v_sessions_remaining
    FROM atb_students WHERE id = p_student_id;

    -- 잔여 회차 부족 시 알림 생성
    IF v_sessions_remaining <= 2 THEN
      INSERT INTO atb_notifications (
        recipient_type, recipient_id, channel, notification_type, title, message
      )
      SELECT 'parent', st.parent_id, 'kakao', 'payment',
        '회차 부족 알림',
        st.name || '님의 잔여 수업 회차가 ' || v_sessions_remaining || '회 남았습니다. 충전이 필요합니다.'
      FROM atb_students st WHERE st.id = p_student_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', p_status,
    'sessions_remaining', v_sessions_remaining
  );
END;
$$ LANGUAGE plpgsql;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 18. 트리거: 학부모 요청 SLA 자동 설정                                         │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION fn_set_request_sla()
RETURNS TRIGGER AS $$
BEGIN
  -- 24시간 SLA 설정
  NEW.sla_deadline := NEW.created_at + INTERVAL '24 hours';

  -- 긴급 요청은 4시간 SLA
  IF NEW.priority = 'urgent' THEN
    NEW.sla_deadline := NEW.created_at + INTERVAL '4 hours';
  ELSIF NEW.priority = 'high' THEN
    NEW.sla_deadline := NEW.created_at + INTERVAL '8 hours';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_request_sla ON atb_parent_requests;
CREATE TRIGGER trg_set_request_sla
  BEFORE INSERT ON atb_parent_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_request_sla();

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 19. RLS 정책                                                                │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 모든 테이블 RLS 활성화
ALTER TABLE atb_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_performance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_parent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_open_reservations ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 인증된 사용자만 접근
CREATE POLICY IF NOT EXISTS "Authenticated users can read coaches" ON atb_coaches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can read performance" ON atb_performance_records
  FOR SELECT TO authenticated USING (true);

-- 익명 사용자도 일부 데이터 접근 가능 (개발 단계)
CREATE POLICY IF NOT EXISTS "Public read for coaches" ON atb_coaches
  FOR SELECT TO anon USING (true);

COMMENT ON TABLE atb_coaches IS '코치/강사 정보 테이블';
COMMENT ON TABLE atb_performance_records IS '학생 성과 기록 (영상 포함)';
COMMENT ON TABLE atb_consultations IS '상담 관리 테이블';
COMMENT ON TABLE atb_parent_requests IS '학부모 요청 관리 테이블';
COMMENT ON TABLE atb_payments IS '결제/수납 관리 테이블';
COMMENT ON TABLE atb_notifications IS '알림 발송 기록';
COMMENT ON TABLE atb_open_reservations IS '오픈 수업 예약 관리';
