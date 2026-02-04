-- ============================================
-- 🏀 올댓바스켓 세션 & 이벤트 스키마
-- 강사 앱 완성을 위한 확장 테이블
-- ============================================

-- 1. 수업 세션 (Sessions) 테이블 - 개별 수업 인스턴스
CREATE TABLE IF NOT EXISTS atb_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  class_id UUID REFERENCES atb_classes(id) ON DELETE CASCADE,
  coach_id UUID,                              -- 담당 강사 ID (추후 coaches 테이블 연결)
  
  -- 세션 정보
  session_date DATE NOT NULL,                 -- 수업 날짜
  start_time TIME NOT NULL,                   -- 시작 시간
  end_time TIME,                              -- 종료 시간
  duration_minutes INTEGER,                   -- 실제 수업 시간 (분)
  
  -- 상태
  status VARCHAR(20) DEFAULT 'scheduled',     -- scheduled, in_progress, completed, cancelled, flagged
  
  -- 출석 요약 (캐시)
  total_students INTEGER DEFAULT 0,           -- 총 학생 수
  present_count INTEGER DEFAULT 0,            -- 출석 수
  absent_count INTEGER DEFAULT 0,             -- 결석 수
  
  -- 타임스탬프
  started_at TIMESTAMPTZ,                     -- 실제 시작 시간
  ended_at TIMESTAMPTZ,                       -- 실제 종료 시간
  
  -- 녹화 상태
  recording_status VARCHAR(20),               -- null, recording, saved, error
  recording_url TEXT,                         -- 영상 URL
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(class_id, session_date, start_time)
);

-- 2. 세션 이벤트 (Session Events) 테이블 - 모든 행동 기록
CREATE TABLE IF NOT EXISTS atb_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID REFERENCES atb_sessions(id) ON DELETE CASCADE,
  
  -- 이벤트 타입
  event_type VARCHAR(30) NOT NULL,            -- session_start, session_end, flag_report, attendance_update
  
  -- 이벤트 데이터 (JSON)
  event_data JSONB DEFAULT '{}',              -- 유연한 데이터 저장
  
  -- 메타데이터
  created_by VARCHAR(100),                    -- 강사 이름 또는 ID
  device_info JSONB DEFAULT '{}',             -- 디바이스 정보
  
  -- Idempotency (중복 방지)
  idempotency_key VARCHAR(100),               -- 클라이언트 생성 키
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(idempotency_key)
);

-- 3. 이상 보고 (Flag Reports) 테이블 - 결석/조퇴/부상 등
CREATE TABLE IF NOT EXISTS atb_flag_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id UUID REFERENCES atb_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES atb_students(id) ON DELETE CASCADE,
  
  -- 보고 유형
  flag_type VARCHAR(30) NOT NULL,             -- absent, late, early_leave, injury, other
  
  -- 상세
  note TEXT,                                  -- 메모 (선택)
  
  -- 처리 상태
  status VARCHAR(20) DEFAULT 'pending',       -- pending, processed, dismissed
  processed_by VARCHAR(100),                  -- 처리자
  processed_at TIMESTAMPTZ,                   -- 처리 시간
  
  -- 알림 상태
  notification_sent BOOLEAN DEFAULT false,    -- 학부모 알림 발송 여부
  notification_sent_at TIMESTAMPTZ,           -- 알림 발송 시간
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 알림 기록 (Notifications) 테이블
CREATE TABLE IF NOT EXISTS atb_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 대상
  recipient_phone VARCHAR(20) NOT NULL,       -- 수신자 전화번호
  recipient_name VARCHAR(50),                 -- 수신자 이름
  student_id UUID REFERENCES atb_students(id) ON DELETE SET NULL,
  
  -- 알림 내용
  notification_type VARCHAR(30) NOT NULL,     -- attendance, payment, overdue, announcement, flag
  template_id VARCHAR(50),                    -- 알림톡 템플릿 ID
  message TEXT NOT NULL,                      -- 발송 메시지
  
  -- 발송 상태
  status VARCHAR(20) DEFAULT 'pending',       -- pending, sent, failed, delivered
  sent_at TIMESTAMPTZ,                        -- 발송 시간
  delivered_at TIMESTAMPTZ,                   -- 수신 확인 시간
  
  -- 실패 정보
  error_message TEXT,                         -- 실패 메시지
  retry_count INTEGER DEFAULT 0,              -- 재시도 횟수
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}',                -- 추가 데이터
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 강사 (Coaches) 테이블
CREATE TABLE IF NOT EXISTS atb_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 기본 정보
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  
  -- 인증
  pin_code VARCHAR(6),                        -- 간단 인증용 PIN
  
  -- 상태
  status VARCHAR(20) DEFAULT 'active',        -- active, inactive
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 오프라인 이벤트 큐 (Offline Queue) 테이블
CREATE TABLE IF NOT EXISTS atb_offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 이벤트 정보
  event_type VARCHAR(30) NOT NULL,
  event_data JSONB NOT NULL,
  
  -- 클라이언트 정보
  client_id VARCHAR(100),                     -- 디바이스 ID
  idempotency_key VARCHAR(100) UNIQUE,        -- 중복 방지 키
  
  -- 처리 상태
  status VARCHAR(20) DEFAULT 'pending',       -- pending, processed, failed
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- 생성 시간 (클라이언트 기준)
  client_created_at TIMESTAMPTZ,              -- 클라이언트에서 생성된 시간
  created_at TIMESTAMPTZ DEFAULT NOW()        -- 서버 수신 시간
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_class ON atb_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON atb_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON atb_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_coach ON atb_sessions(coach_id);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON atb_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON atb_session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_created ON atb_session_events(created_at);

CREATE INDEX IF NOT EXISTS idx_flag_reports_session ON atb_flag_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_flag_reports_student ON atb_flag_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_flag_reports_status ON atb_flag_reports(status);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON atb_notifications(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON atb_notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON atb_notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON atb_offline_queue(status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_client ON atb_offline_queue(client_id);

-- ============================================
-- RLS 정책
-- ============================================
ALTER TABLE atb_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_flag_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE atb_offline_queue ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 인증된 사용자
CREATE POLICY "Authenticated users can manage sessions" ON atb_sessions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage events" ON atb_session_events
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage flags" ON atb_flag_reports
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage notifications" ON atb_notifications
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage coaches" ON atb_coaches
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage offline queue" ON atb_offline_queue
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 트리거
-- ============================================
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON atb_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON atb_coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 뷰: 오늘의 세션 (강사 앱용)
-- ============================================
CREATE OR REPLACE VIEW atb_today_sessions AS
SELECT
  s.id,
  s.session_date,
  s.start_time,
  s.end_time,
  s.status,
  s.recording_status,
  s.started_at,
  s.ended_at,
  
  -- 수업 정보
  c.id AS class_id,
  c.name AS class_name,
  c.duration_minutes AS default_duration,
  
  -- 출석 현황
  s.total_students,
  s.present_count,
  s.absent_count,
  
  -- 코치 정보
  co.id AS coach_id,
  co.name AS coach_name
  
FROM atb_sessions s
JOIN atb_classes c ON s.class_id = c.id
LEFT JOIN atb_coaches co ON s.coach_id = co.id
WHERE s.session_date = CURRENT_DATE
ORDER BY s.start_time;

-- ============================================
-- 뷰: 세션별 학생 목록
-- ============================================
CREATE OR REPLACE VIEW atb_session_students AS
SELECT
  s.id AS session_id,
  s.session_date,
  s.class_id,
  
  st.id AS student_id,
  st.name AS student_name,
  st.grade,
  st.position,
  st.parent_phone,
  
  -- 출석 상태
  COALESCE(a.status, 'pending') AS attendance_status,
  a.check_in_time,
  a.check_out_time,
  
  -- 이상 보고
  fr.flag_type,
  fr.note AS flag_note

FROM atb_sessions s
JOIN atb_enrollments e ON s.class_id = e.class_id AND e.status = 'active'
JOIN atb_students st ON e.student_id = st.id AND st.status = 'active'
LEFT JOIN atb_attendance a ON st.id = a.student_id AND a.class_id = s.class_id AND a.attendance_date = s.session_date
LEFT JOIN atb_flag_reports fr ON s.id = fr.session_id AND st.id = fr.student_id;
