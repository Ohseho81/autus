-- ============================================
-- 🏀 온리쌤 강사앱 세션 이벤트 스키마
-- Spec v3.0 FREEZE - 3 Events Only
-- ============================================

-- 1. 코치 테이블 (기본 정보)
CREATE TABLE IF NOT EXISTS atb_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  profile_image TEXT,
  specialty VARCHAR(50)[],  -- ['드리블', '슈팅', '전술']
  status VARCHAR(20) DEFAULT 'active',  -- active, inactive, on_leave
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 레슨 세션 테이블 (오늘의 수업)
CREATE TABLE IF NOT EXISTS atb_lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 수업 정보
  class_id UUID REFERENCES atb_classes(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES atb_coaches(id) ON DELETE SET NULL,

  name VARCHAR(100) NOT NULL,           -- 수업명 (예: '유소년 A반')
  location VARCHAR(100),                 -- 장소 (예: '대치 Red Court')

  -- 일정
  session_date DATE NOT NULL,            -- 수업 날짜
  start_time TIME NOT NULL,              -- 시작 시간
  end_time TIME,                         -- 종료 시간

  -- 학생
  student_count INTEGER DEFAULT 0,       -- 등록 학생 수
  attendance_count INTEGER DEFAULT 0,    -- 출석 학생 수

  -- 상태 머신 (Spec v3.0)
  -- SCHEDULED → IN_PROGRESS → COMPLETED
  status VARCHAR(20) DEFAULT 'SCHEDULED',  -- SCHEDULED, IN_PROGRESS, COMPLETED

  -- 시간 기록
  actual_start_time TIMESTAMPTZ,         -- 실제 시작 시간
  actual_end_time TIMESTAMPTZ,           -- 실제 종료 시간
  elapsed_minutes INTEGER DEFAULT 0,     -- 경과 시간 (분)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(class_id, session_date)
);

-- 3. 세션 이벤트 테이블 (Spec v3.0 FREEZE)
-- 오직 3가지 이벤트만: SESSION_START, SESSION_END, INCIDENT_FLAG
CREATE TABLE IF NOT EXISTS atb_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이벤트 타입 (Spec v3.0 - 3종만)
  event_type VARCHAR(20) NOT NULL CHECK (
    event_type IN ('SESSION_START', 'SESSION_END', 'INCIDENT_FLAG')
  ),

  -- 참조
  session_id UUID REFERENCES atb_lesson_sessions(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES atb_coaches(id) ON DELETE SET NULL,

  -- 멱등성 보장
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,

  -- 메타데이터
  metadata JSONB,  -- 사고 신고 시: { "incident_type": "부상", "description": "..." }

  -- 기록
  actor_type VARCHAR(20) DEFAULT 'COACH',  -- COACH, ADMIN, SYSTEM
  occurred_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 오프라인 큐 테이블 (Local Outbox 동기화용)
CREATE TABLE IF NOT EXISTS atb_offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_type VARCHAR(20) NOT NULL,
  session_id UUID,
  coach_id UUID,
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,

  payload JSONB NOT NULL,

  -- 동기화 상태
  synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 사고 신고 테이블 (상세 기록)
CREATE TABLE IF NOT EXISTS atb_incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id UUID REFERENCES atb_session_events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES atb_lesson_sessions(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES atb_coaches(id) ON DELETE SET NULL,

  -- 사고 정보
  incident_type VARCHAR(50) NOT NULL,  -- '부상 발생', '시설 문제', '학생 분쟁', '기타 긴급상황'
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical

  -- 조치
  action_taken TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,

  -- 알림
  admin_notified BOOLEAN DEFAULT FALSE,
  parent_notified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_date ON atb_lesson_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_coach ON atb_lesson_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_status ON atb_lesson_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_events_session ON atb_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON atb_session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_occurred ON atb_session_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_offline_queue_synced ON atb_offline_queue(synced);
CREATE INDEX IF NOT EXISTS idx_incident_reports_session ON atb_incident_reports(session_id);

-- ============================================
-- RLS 정책
-- ============================================
ALTER TABLE atb_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_offline_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_incident_reports ENABLE ROW LEVEL SECURITY;

-- 익명 사용자도 읽기 가능 (앱 테스트용)
CREATE POLICY "Allow all reads for anon" ON atb_coaches FOR SELECT USING (true);
CREATE POLICY "Allow all reads for anon" ON atb_lesson_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all reads for anon" ON atb_session_events FOR SELECT USING (true);

-- 인증 사용자 전체 권한
CREATE POLICY "Authenticated full access coaches" ON atb_coaches FOR ALL USING (true);
CREATE POLICY "Authenticated full access sessions" ON atb_lesson_sessions FOR ALL USING (true);
CREATE POLICY "Authenticated full access events" ON atb_session_events FOR ALL USING (true);
CREATE POLICY "Authenticated full access queue" ON atb_offline_queue FOR ALL USING (true);
CREATE POLICY "Authenticated full access incidents" ON atb_incident_reports FOR ALL USING (true);

-- ============================================
-- 트리거: 세션 이벤트 처리
-- ============================================

-- SESSION_START 시 세션 상태 변경
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

-- SESSION_END 시 세션 상태 변경
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

CREATE TRIGGER trigger_session_start
AFTER INSERT ON atb_session_events
FOR EACH ROW
EXECUTE FUNCTION handle_session_start();

CREATE TRIGGER trigger_session_end
AFTER INSERT ON atb_session_events
FOR EACH ROW
EXECUTE FUNCTION handle_session_end();

-- ============================================
-- 함수: 오늘의 수업 조회 (강사용)
-- ============================================
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

-- ============================================
-- 초기 테스트 데이터
-- ============================================

-- 테스트 코치
INSERT INTO atb_coaches (id, name, phone, specialty) VALUES
  ('11111111-1111-1111-1111-111111111111', '김코치', '010-1234-5678', ARRAY['드리블', '슈팅'])
ON CONFLICT DO NOTHING;

-- 오늘의 테스트 수업
INSERT INTO atb_lesson_sessions (id, coach_id, name, location, session_date, start_time, student_count, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '유소년 A반', '대치 Red Court', CURRENT_DATE, '16:00:00', 10, 'SCHEDULED'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '중등 심화반', '강남 Blue Court', CURRENT_DATE, '18:00:00', 8, 'SCHEDULED'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '고등 엘리트', '송파 Main Court', CURRENT_DATE, '20:00:00', 6, 'SCHEDULED')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE atb_session_events IS 'Spec v3.0 FREEZE - 강사앱 이벤트 (SESSION_START, SESSION_END, INCIDENT_FLAG 3종만)';
