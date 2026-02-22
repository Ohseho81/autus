-- ═══════════════════════════════════════════════════════════════════════════════
-- 🚀 온리쌤 통합 스키마 - 한 번에 실행
-- 
-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor
-- 2. 이 파일 전체 복사 → 붙여넣기
-- 3. Run 클릭
-- ═══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 1: UNIVERSAL SCHEMA (무한 확장 아키텍처)
-- ════════════════════════════════════════════════════════════════════════════════

-- 1.1 Organizations (조직)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  industry VARCHAR(50) NOT NULL DEFAULT 'basketball',
  phone VARCHAR(20),
  email VARCHAR(200),
  address TEXT,
  settings JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Entities (모든 참여자)
CREATE TABLE IF NOT EXISTS entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- 'student', 'parent', 'coach', 'customer', 'staff'
  name VARCHAR(100),
  phone VARCHAR(20),
  parent_entity_id UUID REFERENCES entities(id),
  external_ids JSONB DEFAULT '{}',
  tier VARCHAR(10) DEFAULT 'T4',
  v_index DECIMAL(10,2) DEFAULT 50.0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_org ON entities(org_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_phone ON entities(phone);
CREATE INDEX IF NOT EXISTS idx_entities_tier ON entities(tier);

-- 1.3 Services (모든 서비스/상품)
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  name VARCHAR(200),
  price INTEGER DEFAULT 0,
  duration_type VARCHAR(20),
  duration_value INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_org ON services(org_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);

-- 1.4 Events (모든 이벤트 - Append Only)
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id),
  entity_ids UUID[],
  service_id UUID REFERENCES services(id),
  event_type VARCHAR(50) NOT NULL,
  value INTEGER,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  source_ref VARCHAR(200),
  status VARCHAR(30) DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(event_at DESC);

-- 1.5 Metadata (무한 확장)
CREATE TABLE IF NOT EXISTS metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type VARCHAR(30) NOT NULL,
  target_id UUID NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  value_type VARCHAR(20) DEFAULT 'string',
  source VARCHAR(30) DEFAULT 'manual',
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_type, target_id, key)
);

CREATE INDEX IF NOT EXISTS idx_metadata_target ON metadata(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_metadata_key ON metadata(key);

-- 1.6 Relationships (관계 그래프)
CREATE TABLE IF NOT EXISTS relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  from_type VARCHAR(30) NOT NULL,
  from_id UUID NOT NULL,
  to_type VARCHAR(30) NOT NULL,
  to_id UUID NOT NULL,
  relation_type VARCHAR(50) NOT NULL,
  weight DECIMAL(5,2) DEFAULT 1.0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rel_from ON relationships(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_rel_to ON relationships(to_type, to_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 2: LEGACY COMPATIBILITY (기존 앱 호환)
-- ════════════════════════════════════════════════════════════════════════════════

-- 2.1 Students (학생 - 레거시 호환)
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  parent_name VARCHAR(100),
  parent_phone VARCHAR(20),
  parent_email VARCHAR(200),
  parent_id UUID,
  school VARCHAR(100),
  birth_date DATE,
  grade VARCHAR(20),
  uniform_number VARCHAR(10),
  shuttle_required BOOLEAN DEFAULT false,
  profile_image TEXT,
  tier VARCHAR(10) DEFAULT 'T4',
  v_index DECIMAL(10,2) DEFAULT 50.0,
  risk_level VARCHAR(20) DEFAULT 'low',
  status VARCHAR(20) DEFAULT 'active',
  smartfit_id VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_parent_phone ON students(parent_phone);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- 2.2 Profiles (사용자 프로필)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email VARCHAR(200),
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user', -- 'owner', 'manager', 'coach', 'parent', 'user'
  phone VARCHAR(20),
  org_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Classes (수업 - 코치앱 의존성)
CREATE TABLE IF NOT EXISTS atb_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  coach_id UUID,
  day_of_week INTEGER[], -- [1,3,5] = 월수금
  start_time TIME,
  duration_minutes INTEGER DEFAULT 90,
  max_students INTEGER DEFAULT 20,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Lesson Slots (수업 일정)
CREATE TABLE IF NOT EXISTS lesson_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES atb_classes(id),
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  coach_id UUID,
  status VARCHAR(20) DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_slots_date ON lesson_slots(lesson_date);

-- 2.5 Attendance Records (출석 기록)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_slot_id UUID REFERENCES lesson_slots(id),
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'present',
  verified_by VARCHAR(50),
  daily_revenue INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 3: COACH APP (코치앱 v3.0 FREEZE)
-- ════════════════════════════════════════════════════════════════════════════════

-- 3.1 Coaches (코치)
CREATE TABLE IF NOT EXISTS atb_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  profile_image TEXT,
  specialty VARCHAR(50)[],
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 Lesson Sessions (오늘의 수업)
CREATE TABLE IF NOT EXISTS atb_lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES atb_classes(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES atb_coaches(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  student_count INTEGER DEFAULT 0,
  attendance_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'SCHEDULED',
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  elapsed_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_sessions_date ON atb_lesson_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_coach ON atb_lesson_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_status ON atb_lesson_sessions(status);

-- 3.3 Session Events (Spec v3.0 - 3종만)
CREATE TABLE IF NOT EXISTS atb_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(20) NOT NULL CHECK (
    event_type IN ('SESSION_START', 'SESSION_END', 'INCIDENT_FLAG')
  ),
  session_id UUID REFERENCES atb_lesson_sessions(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES atb_coaches(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  metadata JSONB,
  actor_type VARCHAR(20) DEFAULT 'COACH',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON atb_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON atb_session_events(event_type);

-- 3.4 Offline Queue (오프라인 지원)
CREATE TABLE IF NOT EXISTS atb_offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(20) NOT NULL,
  session_id UUID,
  coach_id UUID,
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 Incident Reports (사고 신고)
CREATE TABLE IF NOT EXISTS atb_incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES atb_session_events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES atb_lesson_sessions(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES atb_coaches(id) ON DELETE SET NULL,
  incident_type VARCHAR(50) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  action_taken TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  admin_notified BOOLEAN DEFAULT FALSE,
  parent_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 4: PAYMENTS (토스페이먼츠)
-- ════════════════════════════════════════════════════════════════════════════════

-- 4.1 Payment Records
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_key VARCHAR(200) UNIQUE,
  order_id VARCHAR(100) NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'READY',
  method VARCHAR(30),
  billing_key VARCHAR(200),
  approved_at TIMESTAMPTZ,
  receipt_url TEXT,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  cancel_amount INTEGER,
  error_code VARCHAR(50),
  error_message TEXT,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  parent_id UUID,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_student ON payment_records(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_created ON payment_records(created_at DESC);

-- 4.2 Billing Keys (정기결제)
CREATE TABLE IF NOT EXISTS billing_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_key VARCHAR(100) NOT NULL UNIQUE,
  parent_id UUID,
  billing_key VARCHAR(200) NOT NULL UNIQUE,
  card_company VARCHAR(50),
  card_number VARCHAR(20),
  card_type VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.3 Lesson Packages (수업권 상품)
CREATE TABLE IF NOT EXISTS lesson_packages (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  lesson_count INTEGER NOT NULL,
  validity_days INTEGER DEFAULT 30,
  price INTEGER NOT NULL,
  price_per_lesson INTEGER,
  discount_rate INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.4 Student Lesson Credits (수업권 잔여)
CREATE TABLE IF NOT EXISTS student_lesson_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  package_id VARCHAR(50) REFERENCES lesson_packages(id),
  payment_id UUID REFERENCES payment_records(id),
  total_lessons INTEGER NOT NULL,
  used_lessons INTEGER NOT NULL DEFAULT 0,
  remaining_lessons INTEGER GENERATED ALWAYS AS (total_lessons - used_lessons) STORED,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_credits_student ON student_lesson_credits(student_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 5: KAKAO ALIMTALK
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS alimtalk_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_code VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  message_id VARCHAR(100),
  error TEXT,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  attendance_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lesson_slots(id) ON DELETE SET NULL,
  variables JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_template ON alimtalk_logs(template_code);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_phone ON alimtalk_logs(phone);

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 6: TRIGGERS & FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════════

-- 6.1 Session Start Handler
CREATE OR REPLACE FUNCTION handle_session_start()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'SESSION_START' THEN
    UPDATE atb_lesson_sessions
    SET
      status = 'IN_PROGRESS',
      actual_start_time = NEW.occurred_at,
      updated_at = NOW()
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_session_start ON atb_session_events;
CREATE TRIGGER trigger_session_start
AFTER INSERT ON atb_session_events
FOR EACH ROW
EXECUTE FUNCTION handle_session_start();

-- 6.2 Session End Handler
CREATE OR REPLACE FUNCTION handle_session_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'SESSION_END' THEN
    UPDATE atb_lesson_sessions
    SET
      status = 'COMPLETED',
      actual_end_time = NEW.occurred_at,
      elapsed_minutes = EXTRACT(EPOCH FROM (NEW.occurred_at - actual_start_time)) / 60,
      updated_at = NOW()
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_session_end ON atb_session_events;
CREATE TRIGGER trigger_session_end
AFTER INSERT ON atb_session_events
FOR EACH ROW
EXECUTE FUNCTION handle_session_end();

-- 6.3 Metadata Helper Functions
CREATE OR REPLACE FUNCTION get_metadata(
  p_target_type VARCHAR,
  p_target_id UUID,
  p_key VARCHAR DEFAULT NULL
)
RETURNS TABLE(key VARCHAR, value JSONB, source VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT m.key, m.value, m.source
  FROM metadata m
  WHERE m.target_type = p_target_type
    AND m.target_id = p_target_id
    AND (p_key IS NULL OR m.key = p_key);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_metadata(
  p_target_type VARCHAR,
  p_target_id UUID,
  p_key VARCHAR,
  p_value JSONB,
  p_source VARCHAR DEFAULT 'manual'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO metadata (target_type, target_id, key, value, source)
  VALUES (p_target_type, p_target_id, p_key, p_value, p_source)
  ON CONFLICT (target_type, target_id, key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    source = EXCLUDED.source,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 6.4 오늘의 수업 조회 함수
CREATE OR REPLACE FUNCTION get_today_sessions(p_coach_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  location VARCHAR,
  start_time TIME,
  status VARCHAR,
  student_count INTEGER,
  attendance_count INTEGER,
  elapsed_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.id,
    ls.name,
    ls.location,
    ls.start_time,
    ls.status,
    ls.student_count,
    ls.attendance_count,
    COALESCE(ls.elapsed_minutes, 0)
  FROM atb_lesson_sessions ls
  WHERE ls.session_date = CURRENT_DATE
    AND (p_coach_id IS NULL OR ls.coach_id = p_coach_id)
  ORDER BY ls.start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 7: RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_offline_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE alimtalk_logs ENABLE ROW LEVEL SECURITY;

-- 테스트/개발용: 모든 접근 허용
CREATE POLICY "Allow all for testing" ON organizations FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON entities FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON services FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON events FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON metadata FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON students FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON attendance_records FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON atb_coaches FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON atb_lesson_sessions FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON atb_session_events FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON atb_offline_queue FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON payment_records FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON alimtalk_logs FOR ALL USING (true);

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 8: V-INDEX FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════════

-- V-Index 가중치 테이블
CREATE TABLE IF NOT EXISTS v_index_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  trust_weight DECIMAL(3,2) DEFAULT 0.25,
  satisfaction_weight DECIMAL(3,2) DEFAULT 0.30,
  engagement_weight DECIMAL(3,2) DEFAULT 0.25,
  loyalty_weight DECIMAL(3,2) DEFAULT 0.20,
  high_risk_threshold DECIMAL(5,2) DEFAULT 40.0,
  medium_risk_threshold DECIMAL(5,2) DEFAULT 60.0,
  low_risk_threshold DECIMAL(5,2) DEFAULT 80.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id)
);

-- 출석률 계산
CREATE OR REPLACE FUNCTION calculate_attendance_rate(p_student_id UUID, p_days INTEGER DEFAULT 30)
RETURNS DECIMAL AS $$
DECLARE
  v_attended INTEGER;
  v_expected INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_attended
  FROM events WHERE entity_id = p_student_id AND event_type = 'attendance' 
    AND status = 'completed' AND event_at >= NOW() - (p_days || ' days')::INTERVAL;
  v_expected := GREATEST((p_days / 7) * 2, 1);
  RETURN LEAST(ROUND((v_attended::DECIMAL / v_expected) * 100, 1), 100);
END;
$$ LANGUAGE plpgsql;

-- 결제율 계산
CREATE OR REPLACE FUNCTION calculate_payment_rate(p_student_id UUID, p_days INTEGER DEFAULT 90)
RETURNS DECIMAL AS $$
DECLARE
  v_success INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) FILTER (WHERE status = 'completed'), COUNT(*) INTO v_success, v_total
  FROM events WHERE entity_id = p_student_id AND event_type = 'payment'
    AND event_at >= NOW() - (p_days || ' days')::INTERVAL;
  IF v_total = 0 THEN RETURN 100; END IF;
  RETURN ROUND((v_success::DECIMAL / v_total) * 100, 1);
END;
$$ LANGUAGE plpgsql;

-- V-Index 계산
CREATE OR REPLACE FUNCTION calculate_v_index(p_student_id UUID, p_org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS TABLE (v_index DECIMAL, risk_level VARCHAR, attendance_rate DECIMAL, payment_rate DECIMAL, engagement_score DECIMAL, loyalty_score DECIMAL) AS $$
DECLARE
  v_attendance DECIMAL;
  v_payment DECIMAL;
  v_engagement DECIMAL := 50;
  v_loyalty DECIMAL;
  v_idx DECIMAL;
  v_risk VARCHAR;
  v_days INTEGER;
BEGIN
  v_attendance := calculate_attendance_rate(p_student_id);
  v_payment := calculate_payment_rate(p_student_id);
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_days FROM students WHERE id = p_student_id;
  v_loyalty := LEAST((COALESCE(v_days, 0)::DECIMAL / 365) * 100, 100);
  v_idx := v_attendance * 0.30 + v_payment * 0.25 + v_engagement * 0.25 + v_loyalty * 0.20;
  IF v_idx < 40 THEN v_risk := 'high';
  ELSIF v_idx < 60 THEN v_risk := 'medium';
  ELSIF v_idx < 80 THEN v_risk := 'low';
  ELSE v_risk := 'safe'; END IF;
  RETURN QUERY SELECT ROUND(v_idx, 1), v_risk, v_attendance, v_payment, v_engagement, ROUND(v_loyalty, 1);
END;
$$ LANGUAGE plpgsql;

-- 대시보드 요약
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_total INTEGER;
  v_avg_v DECIMAL;
  v_high INTEGER;
  v_alerts JSON;
BEGIN
  SELECT COUNT(*), COALESCE(AVG(v_index), 50), COUNT(*) FILTER (WHERE risk_level = 'high')
  INTO v_total, v_avg_v, v_high FROM students WHERE status = 'active';
  
  SELECT COALESCE(json_agg(json_build_object('id', id, 'student_id', id, 'name', name, 'v_index', v_index, 
    'risk_level', risk_level, 'message', name || ' 학생의 이탈 위험이 높습니다.', 'type', 'risk')), '[]'::json)
  INTO v_alerts FROM students WHERE status = 'active' AND risk_level = 'high' LIMIT 5;
  
  v_result := json_build_object('total_students', v_total, 'v_index', ROUND(v_avg_v, 1), 'v_change', -2.3,
    'attendance_rate', 85.0, 'payment_rate', 92.0, 'high_risk_count', v_high, 'overdue_count', v_high,
    'urgent_alerts', v_alerts, 'today_attendance', 0, 'today_lessons', 3);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 위험 학생 목록
CREATE OR REPLACE FUNCTION get_at_risk_students(p_risk_level VARCHAR DEFAULT 'all', p_limit INTEGER DEFAULT 50)
RETURNS JSON AS $$
BEGIN
  RETURN (SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'phone', phone, 'parent_phone', parent_phone,
    'v_index', v_index, 'risk_level', risk_level, 'grade', grade, 'school', school, 'created_at', created_at) ORDER BY v_index ASC), '[]'::json)
  FROM students WHERE status = 'active' AND (p_risk_level = 'all' OR risk_level = p_risk_level) LIMIT p_limit);
END;
$$ LANGUAGE plpgsql;

-- 학생 상세
CREATE OR REPLACE FUNCTION get_student_detail(p_student_id UUID)
RETURNS JSON AS $$
DECLARE
  v_student RECORD;
  v_idx RECORD;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF v_student IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_idx FROM calculate_v_index(p_student_id);
  RETURN json_build_object('id', v_student.id, 'name', v_student.name, 'phone', v_student.phone,
    'parent_name', v_student.parent_name, 'parent_phone', v_student.parent_phone,
    'school', v_student.school, 'grade', v_student.grade, 'status', v_student.status,
    'v_index', v_idx.v_index, 'risk_level', v_idx.risk_level,
    'attendance_rate', v_idx.attendance_rate, 'payment_rate', v_idx.payment_rate,
    'engagement_score', v_idx.engagement_score, 'loyalty_score', v_idx.loyalty_score);
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 9: SAMPLE DATA
-- ════════════════════════════════════════════════════════════════════════════════

-- 8.1 기본 조직
INSERT INTO organizations (id, name, industry) VALUES
  ('00000000-0000-0000-0000-000000000001', '온리쌤', 'basketball')
ON CONFLICT DO NOTHING;

-- 8.2 테스트 코치
INSERT INTO atb_coaches (id, name, phone, specialty) VALUES
  ('11111111-1111-1111-1111-111111111111', '김코치', '010-1234-5678', ARRAY['드리블', '슈팅'])
ON CONFLICT DO NOTHING;

-- 8.3 오늘의 테스트 수업
INSERT INTO atb_lesson_sessions (id, coach_id, name, location, session_date, start_time, student_count, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '유소년 A반', '대치 Red Court', CURRENT_DATE, '16:00:00', 10, 'SCHEDULED'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '중등 심화반', '강남 Blue Court', CURRENT_DATE, '18:00:00', 8, 'SCHEDULED'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '고등 엘리트', '송파 Main Court', CURRENT_DATE, '20:00:00', 6, 'SCHEDULED')
ON CONFLICT DO NOTHING;

-- 8.4 수업권 패키지
INSERT INTO lesson_packages (id, name, description, lesson_count, price, price_per_lesson, is_popular, display_order) VALUES
  ('trial', '체험 수업', '첫 체험 할인가', 1, 30000, 30000, false, 1),
  ('basic_4', '기본반 4회', '주 1회 수업', 4, 160000, 40000, false, 2),
  ('standard_8', '정규반 8회', '주 2회 수업 추천', 8, 280000, 35000, true, 3),
  ('intensive_12', '집중반 12회', '주 3회 집중 훈련', 12, 360000, 30000, false, 4),
  ('monthly', '월정액 무제한', '한 달 무제한 수업', -1, 450000, NULL, false, 5)
ON CONFLICT (id) DO NOTHING;

-- 8.5 테스트 학생
INSERT INTO students (id, name, phone, parent_name, parent_phone, school, grade, uniform_number) VALUES
  ('22222222-2222-2222-2222-222222222222', '이농구', '010-2222-2222', '이부모', '010-2222-0000', '서울초등학교', '5학년', '7'),
  ('33333333-3333-3333-3333-333333333333', '박슛팅', '010-3333-3333', '박부모', '010-3333-0000', '강남중학교', '2학년', '23'),
  ('44444444-4444-4444-4444-444444444444', '최드리블', '010-4444-4444', '최부모', '010-4444-0000', '송파고등학교', '1학년', '11')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 10: CATEGORY HIERARCHY (무한 확장 카테고리 시스템)
-- ════════════════════════════════════════════════════════════════════════════════

-- 10.1 카테고리 테이블
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,              -- 'SERVICE.EDU.SPORTS.BASKETBALL'
  name VARCHAR(200) NOT NULL,                     -- '농구교육서비스'
  name_en VARCHAR(200),                           -- 'Basketball Education'
  
  -- 계층 구조
  level INTEGER NOT NULL DEFAULT 0,               -- 0=대분류, 1, 2, 3, 4
  parent_id UUID REFERENCES categories(id),
  path VARCHAR(500),                              -- '/서비스/교육서비스/스포츠교육서비스/농구교육서비스'
  
  -- 메타데이터
  icon VARCHAR(50),
  color VARCHAR(20),
  description TEXT,
  
  -- AUTUS 확장
  default_entity_types TEXT[] DEFAULT '{}',       -- ['student', 'coach', 'parent']
  default_event_types TEXT[] DEFAULT '{}',        -- ['attendance', 'payment']
  tsel_weights JSONB DEFAULT '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}',
  
  -- 상태
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);

-- 10.2 Organizations에 카테고리 연결
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS category_path VARCHAR(500);

-- 10.3 기본 카테고리 데이터
-- L0: 대분류
INSERT INTO categories (code, name, name_en, level, path, icon) VALUES
('SERVICE', '서비스', 'Service', 0, '/서비스', 'briefcase')
ON CONFLICT (code) DO NOTHING;

-- L1: 중분류
INSERT INTO categories (code, name, name_en, level, parent_id, path, icon, default_entity_types) VALUES
('SERVICE.EDU', '교육서비스', 'Education', 1, 
  (SELECT id FROM categories WHERE code = 'SERVICE'),
  '/서비스/교육서비스', 'school', ARRAY['student', 'teacher', 'parent']),
('SERVICE.HEALTH', '헬스케어서비스', 'Healthcare', 1,
  (SELECT id FROM categories WHERE code = 'SERVICE'),
  '/서비스/헬스케어서비스', 'heart', ARRAY['patient', 'doctor', 'caregiver']),
('SERVICE.RETAIL', '리테일서비스', 'Retail', 1,
  (SELECT id FROM categories WHERE code = 'SERVICE'),
  '/서비스/리테일서비스', 'cart', ARRAY['customer', 'staff']),
('SERVICE.FNB', 'F&B서비스', 'F&B', 1,
  (SELECT id FROM categories WHERE code = 'SERVICE'),
  '/서비스/F&B서비스', 'restaurant', ARRAY['customer', 'staff']),
('SERVICE.CONSTRUCTION', '건축서비스', 'Construction', 1,
  (SELECT id FROM categories WHERE code = 'SERVICE'),
  '/서비스/건축서비스', 'build', ARRAY['client', 'architect', 'contractor'])
ON CONFLICT (code) DO NOTHING;

-- L2: 소분류 (건축서비스)
INSERT INTO categories (code, name, name_en, level, parent_id, path, icon, default_entity_types) VALUES
('SERVICE.CONSTRUCTION.RESIDENTIAL', '주거건축', 'Residential', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.CONSTRUCTION'),
  '/서비스/건축서비스/주거건축', 'home', ARRAY['client', 'architect', 'contractor']),
('SERVICE.CONSTRUCTION.COMMERCIAL', '상업건축', 'Commercial', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.CONSTRUCTION'),
  '/서비스/건축서비스/상업건축', 'business', ARRAY['client', 'architect', 'contractor']),
('SERVICE.CONSTRUCTION.INTERIOR', '인테리어', 'Interior', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.CONSTRUCTION'),
  '/서비스/건축서비스/인테리어', 'brush', ARRAY['client', 'designer', 'contractor'])
ON CONFLICT (code) DO NOTHING;

-- L3: 세부분류 (주거건축)
INSERT INTO categories (code, name, name_en, level, parent_id, path, icon, color, default_entity_types, default_event_types, tsel_weights) VALUES
('SERVICE.CONSTRUCTION.RESIDENTIAL.HOUSE', '단독주택', 'House', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.CONSTRUCTION.RESIDENTIAL'),
  '/서비스/건축서비스/주거건축/단독주택',
  'home', '#8B4513', ARRAY['client', 'architect', 'contractor'],
  ARRAY['consultation', 'quote', 'contract', 'milestone', 'inspection', 'payment'],
  '{"T":0.35,"S":0.25,"E":0.25,"L":0.15}'),
('SERVICE.CONSTRUCTION.RESIDENTIAL.REMODEL', '리모델링', 'Remodeling', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.CONSTRUCTION.RESIDENTIAL'),
  '/서비스/건축서비스/주거건축/리모델링',
  'construct', '#CD853F', ARRAY['client', 'designer', 'contractor'],
  ARRAY['consultation', 'quote', 'contract', 'milestone', 'inspection', 'payment'],
  '{"T":0.30,"S":0.30,"E":0.25,"L":0.15}'),
('SERVICE.CONSTRUCTION.INTERIOR.HOME', '홈인테리어', 'Home Interior', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.CONSTRUCTION.INTERIOR'),
  '/서비스/건축서비스/인테리어/홈인테리어',
  'brush', '#DEB887', ARRAY['client', 'designer', 'contractor'],
  ARRAY['consultation', 'quote', 'contract', 'milestone', 'inspection', 'payment'],
  '{"T":0.30,"S":0.35,"E":0.20,"L":0.15}')
ON CONFLICT (code) DO NOTHING;

-- L2: 소분류 (교육서비스)
INSERT INTO categories (code, name, name_en, level, parent_id, path, icon, default_entity_types) VALUES
('SERVICE.EDU.SPORTS', '스포츠교육', 'Sports Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/스포츠교육', 'fitness', ARRAY['student', 'coach', 'parent']),
('SERVICE.EDU.MUSIC', '음악교육', 'Music Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/음악교육', 'musical-notes', ARRAY['student', 'instructor', 'parent']),
('SERVICE.EDU.LANGUAGE', '어학교육', 'Language Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/어학교육', 'language', ARRAY['student', 'teacher', 'parent']),
('SERVICE.EDU.ACADEMIC', '입시교육', 'Academic Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/입시교육', 'book', ARRAY['student', 'teacher', 'parent']),
('SERVICE.EDU.ART', '예술교육', 'Art Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/예술교육', 'color-palette', ARRAY['student', 'instructor', 'parent']),
('SERVICE.EDU.CODING', '코딩교육', 'Coding Education', 2,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU'),
  '/서비스/교육서비스/코딩교육', 'code', ARRAY['student', 'instructor', 'parent'])
ON CONFLICT (code) DO NOTHING;

-- L3: 세부분류 (스포츠교육)
INSERT INTO categories (code, name, name_en, level, parent_id, path, icon, color, default_entity_types, default_event_types, tsel_weights) VALUES
('SERVICE.EDU.SPORTS.BASKETBALL', '농구교육', 'Basketball', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육/농구교육', 
  'basketball', '#FF6B00', ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'consultation', 'skill_assessment', 'match'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.SOCCER', '축구교육', 'Soccer', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육/축구교육',
  'football', '#00AA55', ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'consultation', 'match'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.SWIMMING', '수영교육', 'Swimming', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육/수영교육',
  'water', '#0088CC', ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'level_test'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.TENNIS', '테니스교육', 'Tennis', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육/테니스교육',
  'tennisball', '#AADD00', ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'match'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.GOLF', '골프교육', 'Golf', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육/골프교육',
  'golf', '#228B22', ARRAY['student', 'coach', 'parent'],
  ARRAY['attendance', 'payment', 'round'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.TAEKWONDO', '태권도교육', 'Taekwondo', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육/태권도교육',
  'fitness', '#FF0000', ARRAY['student', 'master', 'parent'],
  ARRAY['attendance', 'payment', 'belt_test'],
  '{"T":0.25,"S":0.30,"E":0.25,"L":0.20}'),
('SERVICE.EDU.SPORTS.FITNESS', '피트니스', 'Fitness', 3,
  (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS'),
  '/서비스/교육서비스/스포츠교육/피트니스',
  'barbell', '#FF4500', ARRAY['member', 'trainer'],
  ARRAY['attendance', 'payment', 'pt_session', 'inbody'],
  '{"T":0.20,"S":0.35,"E":0.25,"L":0.20}')
ON CONFLICT (code) DO NOTHING;

-- 10.4 온리쌤 카테고리 연결
UPDATE organizations
SET
  category_id = (SELECT id FROM categories WHERE code = 'SERVICE.EDU.SPORTS.BASKETBALL'),
  category_path = '/서비스/교육서비스/스포츠교육/농구교육'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 10.5 카테고리 조회 함수
CREATE OR REPLACE FUNCTION get_category_path(p_code VARCHAR)
RETURNS TABLE (level INTEGER, code VARCHAR, name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    SELECT c.id, c.code, c.name, c.level, c.parent_id
    FROM categories c WHERE c.code = p_code
    UNION ALL
    SELECT p.id, p.code, p.name, p.level, p.parent_id
    FROM categories p JOIN category_tree ct ON p.id = ct.parent_id
  )
  SELECT ct.level, ct.code, ct.name FROM category_tree ct ORDER BY ct.level;
END;
$$ LANGUAGE plpgsql;

-- 10.6 카테고리 트리 뷰
CREATE OR REPLACE VIEW v_category_tree AS
WITH RECURSIVE tree AS (
  SELECT id, code, name, level, parent_id, path, name as full_name
  FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.code, c.name, c.level, c.parent_id, c.path, t.full_name || ' > ' || c.name
  FROM categories c JOIN tree t ON c.parent_id = t.id
)
SELECT * FROM tree ORDER BY path;

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 11: ENCOUNTER KERNEL (Phase 1 — 4개 핵심 테이블)
-- ════════════════════════════════════════════════════════════════════════════════

-- 11.1 Encounters (수업/만남 커널 — Single Truth)
CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  encounter_type VARCHAR(30) NOT NULL DEFAULT 'lesson',
  title VARCHAR(200),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 90,
  location VARCHAR(200),
  coach_id UUID REFERENCES atb_coaches(id) ON DELETE SET NULL,
  class_id UUID REFERENCES atb_classes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  expected_count INTEGER DEFAULT 0,
  actual_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  legacy_session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounters_org ON encounters(org_id);
CREATE INDEX IF NOT EXISTS idx_encounters_scheduled ON encounters(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_encounters_coach ON encounters(coach_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status);
CREATE INDEX IF NOT EXISTS idx_encounters_legacy ON encounters(legacy_session_id);

-- 11.2 Presence (불변 출석 로그 — INSERT only)
CREATE TABLE IF NOT EXISTS presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,
  subject_type VARCHAR(20) NOT NULL DEFAULT 'student',
  status VARCHAR(20) NOT NULL DEFAULT 'PRESENT'
    CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
  recorded_by UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  dedupe_key VARCHAR(200) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_presence_encounter ON presence(encounter_id);
CREATE INDEX IF NOT EXISTS idx_presence_subject ON presence(subject_id);
CREATE INDEX IF NOT EXISTS idx_presence_status ON presence(status);
CREATE INDEX IF NOT EXISTS idx_presence_recorded ON presence(recorded_at DESC);

-- 11.3 IOO Trace (Input-Operation-Output 감사추적 — append-only)
CREATE TABLE IF NOT EXISTS ioo_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  phase VARCHAR(20) NOT NULL
    CHECK (phase IN ('INPUT', 'OPERATION', 'OUTPUT')),
  actor VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  payload JSONB DEFAULT '{}',
  result VARCHAR(20) DEFAULT 'pending'
    CHECK (result IN ('pending', 'success', 'failure', 'skipped')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ioo_trace_id ON ioo_trace(trace_id);
CREATE INDEX IF NOT EXISTS idx_ioo_phase ON ioo_trace(phase);
CREATE INDEX IF NOT EXISTS idx_ioo_action ON ioo_trace(action);
CREATE INDEX IF NOT EXISTS idx_ioo_created ON ioo_trace(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ioo_result ON ioo_trace(result);

-- 11.4 Action Queue (비동기 작업 큐 — retry + TTL + dedupe)
CREATE TABLE IF NOT EXISTS action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED')),
  payload JSONB NOT NULL DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  dedupe_key VARCHAR(200),
  trace_id UUID,
  result JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_action_queue_status ON action_queue(status);
CREATE INDEX IF NOT EXISTS idx_action_queue_priority ON action_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_action_queue_next_retry ON action_queue(next_retry_at)
  WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX IF NOT EXISTS idx_action_queue_expires ON action_queue(expires_at)
  WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_action_queue_trace ON action_queue(trace_id);
CREATE INDEX IF NOT EXISTS idx_action_queue_type ON action_queue(action_type);

-- 11.5 Encounter Kernel RLS
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ioo_trace ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY encounters_select ON encounters FOR SELECT TO authenticated USING (true);
CREATE POLICY encounters_insert ON encounters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY encounters_update ON encounters FOR UPDATE TO authenticated USING (true);

CREATE POLICY presence_select ON presence FOR SELECT TO authenticated USING (true);
CREATE POLICY presence_insert ON presence FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY ioo_trace_select ON ioo_trace FOR SELECT TO authenticated USING (true);
CREATE POLICY ioo_trace_insert ON ioo_trace FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY action_queue_select ON action_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY action_queue_insert ON action_queue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY action_queue_update ON action_queue FOR UPDATE TO authenticated USING (true);

CREATE POLICY encounters_service ON encounters FOR ALL TO service_role USING (true);
CREATE POLICY presence_service ON presence FOR ALL TO service_role USING (true);
CREATE POLICY ioo_trace_service ON ioo_trace FOR ALL TO service_role USING (true);
CREATE POLICY action_queue_service ON action_queue FOR ALL TO service_role USING (true);

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 12: ENCOUNTER BRIDGE (레거시 호환 뷰 + 함수)
-- ════════════════════════════════════════════════════════════════════════════════

-- 12.1 레거시 세션 → Encounter 뷰
CREATE OR REPLACE VIEW v_legacy_sessions_as_encounters AS
SELECT
  e.id, e.org_id, e.encounter_type, e.title,
  e.scheduled_at, e.duration_minutes, e.location,
  e.coach_id, e.class_id, e.status,
  e.expected_count, e.actual_count,
  e.started_at, e.ended_at, e.legacy_session_id,
  NULL::VARCHAR AS legacy_name,
  NULL::DATE AS legacy_date,
  NULL::TIME AS legacy_start_time,
  NULL::TIME AS legacy_end_time,
  NULL::INTEGER AS legacy_student_count,
  NULL::INTEGER AS legacy_attendance_count,
  e.created_at, e.updated_at
FROM encounters e;

-- 12.2 레거시 출석 → Presence 뷰
CREATE OR REPLACE VIEW v_legacy_attendance_as_presence AS
SELECT
  p.id, p.encounter_id, p.subject_id, p.subject_type,
  p.status, p.recorded_by, p.recorded_at, p.source, p.dedupe_key,
  NULL::UUID AS legacy_student_id,
  NULL::UUID AS legacy_lesson_slot_id,
  NULL::DATE AS legacy_date,
  NULL::TIMESTAMPTZ AS legacy_check_in,
  NULL::TIMESTAMPTZ AS legacy_check_out,
  NULL::VARCHAR AS legacy_status,
  NULL::NUMERIC AS legacy_revenue,
  p.created_at
FROM presence p;

-- 12.3 Dual Write: Encounter + 레거시 세션 동시 생성
CREATE OR REPLACE FUNCTION create_encounter_with_legacy(
  p_org_id UUID, p_title VARCHAR, p_scheduled_at TIMESTAMPTZ,
  p_duration_minutes INTEGER DEFAULT 90, p_location VARCHAR DEFAULT NULL,
  p_coach_id UUID DEFAULT NULL, p_class_id UUID DEFAULT NULL,
  p_expected_count INTEGER DEFAULT 0
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_encounter_id UUID;
  v_session_id UUID;
BEGIN
  BEGIN
    EXECUTE format(
      'INSERT INTO atb_lesson_sessions (class_id, coach_id, name, location, session_date, start_time, end_time, student_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id'
    )
    USING p_class_id, p_coach_id, p_title, p_location,
      (p_scheduled_at AT TIME ZONE 'Asia/Seoul')::DATE,
      (p_scheduled_at AT TIME ZONE 'Asia/Seoul')::TIME,
      ((p_scheduled_at + (p_duration_minutes || ' minutes')::INTERVAL) AT TIME ZONE 'Asia/Seoul')::TIME,
      p_expected_count, 'SCHEDULED'
    INTO v_session_id;
  EXCEPTION WHEN undefined_table THEN
    v_session_id := NULL;
  END;

  INSERT INTO encounters (
    org_id, encounter_type, title, scheduled_at,
    duration_minutes, location, coach_id, class_id,
    status, expected_count, legacy_session_id
  ) VALUES (
    p_org_id, 'lesson', p_title, p_scheduled_at,
    p_duration_minutes, p_location, p_coach_id, p_class_id,
    'SCHEDULED', p_expected_count, v_session_id
  )
  RETURNING id INTO v_encounter_id;

  RETURN v_encounter_id;
END;
$$;

-- 12.4 Dual Write: Presence + 레거시 출석 동시 기록
CREATE OR REPLACE FUNCTION record_presence_with_legacy(
  p_encounter_id UUID, p_subject_id UUID,
  p_status VARCHAR DEFAULT 'PRESENT',
  p_recorded_by UUID DEFAULT NULL,
  p_source VARCHAR DEFAULT 'manual'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_presence_id UUID;
  v_dedupe_key VARCHAR;
  v_encounter RECORD;
  v_legacy_status VARCHAR;
BEGIN
  SELECT * INTO v_encounter FROM encounters WHERE id = p_encounter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encounter not found: %', p_encounter_id;
  END IF;

  v_dedupe_key := 'presence:' || p_encounter_id || ':' || p_subject_id;

  INSERT INTO presence (
    encounter_id, subject_id, subject_type, status,
    recorded_by, source, dedupe_key
  ) VALUES (
    p_encounter_id, p_subject_id, 'student', p_status,
    p_recorded_by, p_source, v_dedupe_key
  )
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO v_presence_id;

  IF v_presence_id IS NULL THEN
    SELECT id INTO v_presence_id FROM presence WHERE dedupe_key = v_dedupe_key;
    RETURN v_presence_id;
  END IF;

  v_legacy_status := LOWER(p_status);
  BEGIN
    INSERT INTO attendance_records (
      student_id, attendance_date, check_in_time, status, verified_by
    ) VALUES (
      p_subject_id,
      (v_encounter.scheduled_at AT TIME ZONE 'Asia/Seoul')::DATE,
      CASE WHEN p_status IN ('PRESENT', 'LATE') THEN NOW() ELSE NULL END,
      v_legacy_status, 'manual'
    )
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN undefined_table OR check_violation THEN
    NULL;
  END;

  UPDATE encounters
  SET actual_count = (
    SELECT COUNT(*) FROM presence
    WHERE encounter_id = p_encounter_id AND status IN ('PRESENT', 'LATE')
  ), updated_at = NOW()
  WHERE id = p_encounter_id;

  RETURN v_presence_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 13: PHASE 2 — 결제선생 + 상담선생 + 위험감지
-- ════════════════════════════════════════════════════════════════════════════════

-- 13.1 ENUM 타입
DO $$ BEGIN
  CREATE TYPE risk_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_trigger_type AS ENUM (
    'overdue_payment', 'low_vindex', 'failed_payment',
    'absent_streak', 'no_response'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE consultation_status AS ENUM (
    'scheduled', 'reminded', 'in_progress',
    'completed', 'cancelled', 'follow_up'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payssam_invoice_status AS ENUM (
    'pending', 'sent', 'paid', 'overdue', 'cancelled', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 13.2 risk_flags — 위험 신호 감지
CREATE TABLE IF NOT EXISTS risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  trigger_type risk_trigger_type NOT NULL,
  severity risk_severity NOT NULL DEFAULT 'medium',
  snapshot JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED', 'EXPIRED')),
  action_taken VARCHAR(100),
  action_queue_id UUID,
  consultation_id UUID,
  dedupe_key VARCHAR(200) UNIQUE NOT NULL,
  trace_id UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_flags_student ON risk_flags(student_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_org ON risk_flags(org_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_status ON risk_flags(status);
CREATE INDEX IF NOT EXISTS idx_risk_flags_severity ON risk_flags(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_flags_trigger ON risk_flags(trigger_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_flags_open ON risk_flags(status, expires_at)
  WHERE status IN ('OPEN', 'ACKNOWLEDGED');
CREATE INDEX IF NOT EXISTS idx_risk_flags_trace ON risk_flags(trace_id);

-- 13.3 payment_invoices — 결제선생 청구서
CREATE TABLE IF NOT EXISTS payment_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID,
  parent_phone VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  description VARCHAR(200) NOT NULL,
  due_date DATE,
  payssam_invoice_id VARCHAR(100),
  status payssam_invoice_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  callback_received_at TIMESTAMPTZ,
  point_cost INTEGER DEFAULT 55,
  error_code VARCHAR(50),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  raw_response JSONB,
  dedupe_key VARCHAR(200) UNIQUE NOT NULL,
  trace_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_invoices_student ON payment_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_status ON payment_invoices(status);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_org ON payment_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_created ON payment_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_overdue ON payment_invoices(status, due_date)
  WHERE status IN ('sent', 'overdue');
CREATE INDEX IF NOT EXISTS idx_payment_invoices_trace ON payment_invoices(trace_id);

-- 13.4 consultation_sessions — 상담선생
CREATE TABLE IF NOT EXISTS consultation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  parent_phone VARCHAR(20) NOT NULL,
  status consultation_status NOT NULL DEFAULT 'scheduled',
  trigger_type risk_trigger_type NOT NULL,
  trigger_snapshot JSONB DEFAULT '{}',
  risk_flag_id UUID REFERENCES risk_flags(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  reminded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  coach_notes TEXT,
  follow_up_actions JSONB DEFAULT '[]',
  dedupe_key VARCHAR(200) UNIQUE NOT NULL,
  trace_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_student ON consultation_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_consultation_status ON consultation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_consultation_org ON consultation_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_consultation_created ON consultation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_scheduled ON consultation_sessions(scheduled_at)
  WHERE status IN ('scheduled', 'reminded');
CREATE INDEX IF NOT EXISTS idx_consultation_trigger ON consultation_sessions(trigger_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_risk ON consultation_sessions(risk_flag_id);

-- 13.5 Phase 2 자동 갱신 트리거
DO $$ BEGIN
  CREATE TRIGGER risk_flags_updated_at BEFORE UPDATE ON risk_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER payment_invoices_updated_at BEFORE UPDATE ON payment_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER consultation_sessions_updated_at BEFORE UPDATE ON consultation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 13.6 Phase 2 RLS
ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY risk_flags_select ON risk_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY risk_flags_insert ON risk_flags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY risk_flags_update ON risk_flags FOR UPDATE TO authenticated USING (true);
CREATE POLICY risk_flags_service ON risk_flags FOR ALL TO service_role USING (true);

CREATE POLICY payment_invoices_select ON payment_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY payment_invoices_insert ON payment_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY payment_invoices_update ON payment_invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY payment_invoices_service ON payment_invoices FOR ALL TO service_role USING (true);

CREATE POLICY consultation_select ON consultation_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY consultation_insert ON consultation_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY consultation_update ON consultation_sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY consultation_service ON consultation_sessions FOR ALL TO service_role USING (true);

-- 13.7 Phase 2 뷰
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT pi.*, CURRENT_DATE - pi.due_date AS days_overdue
FROM payment_invoices pi
WHERE pi.status IN ('sent', 'overdue') AND pi.due_date < CURRENT_DATE
ORDER BY pi.due_date ASC;

CREATE OR REPLACE VIEW pending_consultations AS
SELECT cs.*,
  CASE
    WHEN cs.trigger_type = 'overdue_payment' THEN '미납'
    WHEN cs.trigger_type = 'low_vindex' THEN 'V-Index 낮음'
    WHEN cs.trigger_type = 'failed_payment' THEN '결제 실패'
    WHEN cs.trigger_type = 'absent_streak' THEN '연속 결석'
    WHEN cs.trigger_type = 'no_response' THEN '무응답'
  END AS trigger_label,
  CASE WHEN cs.status = 'scheduled' AND cs.scheduled_at < NOW() THEN true ELSE false END AS is_overdue
FROM consultation_sessions cs
WHERE cs.status IN ('scheduled', 'reminded')
ORDER BY cs.scheduled_at ASC;

CREATE OR REPLACE VIEW active_risk_flags AS
SELECT rf.*,
  CASE
    WHEN rf.severity = 'critical' THEN 1
    WHEN rf.severity = 'high' THEN 2
    WHEN rf.severity = 'medium' THEN 3
    WHEN rf.severity = 'low' THEN 4
  END AS severity_order
FROM risk_flags rf
WHERE rf.status IN ('OPEN', 'ACKNOWLEDGED') AND rf.expires_at > NOW()
ORDER BY severity_order ASC, rf.created_at DESC;

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 14: STORAGE RLS — 영상/사진/문서 버킷 보안
-- ════════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_videos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY storage_videos_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY storage_videos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY storage_videos_service ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'videos');

CREATE POLICY storage_photos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY storage_photos_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY storage_photos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY storage_photos_service ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'photos');

CREATE POLICY storage_documents_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY storage_documents_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY storage_documents_service ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'documents');

-- ════════════════════════════════════════════════════════════════════════════════
-- ✅ 완료!
-- ════════════════════════════════════════════════════════════════════════════════

SELECT '✅ 온리쌤 스키마 설치 완료!' as result;
SELECT '📊 Part 1-10: Universal, Legacy, Coach, Payments, V-Index, Categories' as base_tables;
SELECT '🧬 Part 11-12: Encounter Kernel + Bridge (encounters, presence, ioo_trace, action_queue)' as encounter;
SELECT '⚡ Part 13: Phase 2 (risk_flags, payment_invoices, consultation_sessions)' as phase2;
SELECT '🔒 Part 14: Storage RLS (videos, photos, documents)' as storage;
