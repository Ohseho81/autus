-- ============================================
-- 올댓바스켓 MoltBot 부모 챗봇 통합 스키마
-- Supabase Migration 006
--
-- 전체 플로우:
-- 부모 문의 → 수납 조회 → 미납시 결제 → QR 활성화 →
-- 출석 + 영상 → 피드백 → 알림톡 → 상담 티켓
-- ============================================

-- ────────────────────────────────────────────
-- Enum Types
-- ────────────────────────────────────────────
CREATE TYPE conversation_status AS ENUM ('active', 'waiting', 'resolved', 'escalated');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE payment_method AS ENUM ('kakaopay', 'naverpay', 'card', 'transfer', 'cash');
CREATE TYPE notification_channel AS ENUM ('kakao', 'push', 'sms', 'email');

-- ────────────────────────────────────────────
-- 부모 사용자 테이블
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,                              -- Supabase Auth ID

  -- 기본 정보
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  kakao_id TEXT,                                    -- 카카오 연동 ID

  -- 자녀 연결
  student_ids UUID[] DEFAULT '{}',                  -- 연결된 자녀들

  -- 알림 설정
  notification_settings JSONB DEFAULT '{
    "lesson_start": true,
    "lesson_end": true,
    "video_uploaded": true,
    "payment_reminder": true,
    "schedule_change": true,
    "preferred_channel": "kakao"
  }'::jsonb,

  -- 결제 정보
  default_payment_method payment_method,
  payment_token TEXT,                               -- 간편결제 토큰

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- MoltBot 대화 세션
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moltbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,

  -- 세션 정보
  channel notification_channel NOT NULL DEFAULT 'kakao',
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,

  -- 대화 컨텍스트
  intent TEXT,                                      -- 'payment_inquiry' | 'schedule_check' | 'video_request' | 'feedback' | 'complaint'
  context JSONB DEFAULT '{}'::jsonb,                -- 대화 컨텍스트 저장

  -- 상태
  status conversation_status DEFAULT 'active',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),

  -- 에스컬레이션
  escalated_to UUID REFERENCES users(id),           -- 상담 담당자
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- MoltBot 메시지 로그
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moltbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES moltbot_conversations(id) ON DELETE CASCADE,

  -- 메시지 정보
  sender_type TEXT NOT NULL,                        -- 'parent' | 'bot' | 'staff'
  sender_id UUID,
  message_type TEXT DEFAULT 'text',                 -- 'text' | 'image' | 'button' | 'carousel' | 'payment' | 'qr'
  content TEXT NOT NULL,

  -- 버튼/액션
  buttons JSONB,                                    -- [{label, action, data}]
  action_taken TEXT,                                -- 사용자가 선택한 액션

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,

  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 간편 결제 요청
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES student_payments(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES moltbot_conversations(id),

  -- 결제 정보
  amount INT NOT NULL,
  description TEXT,
  payment_method payment_method,

  -- 결제 링크
  payment_url TEXT,                                 -- 카카오페이/네이버페이 결제 URL
  payment_key TEXT,                                 -- PG사 결제 키
  expires_at TIMESTAMPTZ,

  -- 상태
  status TEXT DEFAULT 'pending',                    -- 'pending' | 'sent' | 'clicked' | 'completed' | 'failed' | 'expired'

  -- 완료 정보
  paid_at TIMESTAMPTZ,
  receipt_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- QR 활성화 로그
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_activation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES student_payments(id),

  -- 활성화 정보
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_by TEXT,                                -- 'payment' | 'admin' | 'auto'

  -- QR 정보
  qr_code TEXT NOT NULL,
  valid_until DATE,
  lessons_remaining INT,

  -- 알림 발송
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ
);

-- ────────────────────────────────────────────
-- 레슨 피드백 (강사 → 자동 변환)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coach_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
  video_id UUID REFERENCES student_videos(id),

  -- 피드백 날짜
  feedback_date DATE DEFAULT CURRENT_DATE,

  -- 수업 내용 (강사 입력)
  lesson_summary TEXT,                              -- '오늘 드리블 기초 연습'
  skills_practiced TEXT[],                          -- ['dribble', 'passing']

  -- 평가
  participation_score INT CHECK (participation_score BETWEEN 1 AND 5),
  skill_progress TEXT,                              -- 'improving' | 'stable' | 'needs_work'

  -- 상세 피드백
  strengths TEXT[],                                 -- 잘한 점
  improvements TEXT[],                              -- 개선할 점
  homework TEXT,                                    -- 집에서 연습할 것

  -- 자동 생성 메시지 (MoltBot용)
  auto_message TEXT,                                -- AI가 생성한 부모용 메시지

  -- 전달 상태
  sent_to_parent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  parent_read BOOLEAN DEFAULT FALSE,
  parent_read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 부모 알림 발송 테이블
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),

  -- 알림 유형
  notification_type TEXT NOT NULL,                  -- 'lesson_start' | 'lesson_end' | 'video' | 'payment' | 'schedule' | 'feedback'

  -- 연결 엔티티
  reference_type TEXT,                              -- 'session' | 'video' | 'payment' | 'feedback'
  reference_id UUID,

  -- 메시지
  channel notification_channel NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,

  -- 액션 버튼
  action_url TEXT,
  action_label TEXT,

  -- 발송 상태
  status TEXT DEFAULT 'pending',                    -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 상담 티켓 (MoltBot 에스컬레이션)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultation_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES moltbot_conversations(id),
  parent_id UUID REFERENCES parent_users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),

  -- 티켓 정보
  ticket_number TEXT UNIQUE,                        -- 'TKT-20260129-001'
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT,                                    -- 'payment' | 'schedule' | 'feedback' | 'complaint' | 'other'

  -- 우선순위
  priority ticket_priority DEFAULT 'medium',

  -- 담당자
  assigned_to UUID REFERENCES users(id),            -- 강사 또는 관리자
  assigned_at TIMESTAMPTZ,

  -- 상태
  status TEXT DEFAULT 'open',                       -- 'open' | 'in_progress' | 'waiting_reply' | 'resolved' | 'closed'

  -- 해결
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),

  -- 평가
  satisfaction_score INT CHECK (satisfaction_score BETWEEN 1 AND 5),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 인덱스
-- ────────────────────────────────────────────
CREATE INDEX idx_parent_users_phone ON parent_users(phone);
CREATE INDEX idx_parent_users_kakao ON parent_users(kakao_id);
CREATE INDEX idx_conversations_parent ON moltbot_conversations(parent_id);
CREATE INDEX idx_conversations_status ON moltbot_conversations(status);
CREATE INDEX idx_messages_conversation ON moltbot_messages(conversation_id);
CREATE INDEX idx_payment_requests_parent ON payment_requests(parent_id);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_feedbacks_student ON lesson_feedbacks(student_id);
CREATE INDEX idx_feedbacks_date ON lesson_feedbacks(feedback_date);
CREATE INDEX idx_notifications_parent ON parent_notifications(parent_id);
CREATE INDEX idx_notifications_status ON parent_notifications(status);
CREATE INDEX idx_tickets_assigned ON consultation_tickets(assigned_to);
CREATE INDEX idx_tickets_status ON consultation_tickets(status);

-- ────────────────────────────────────────────
-- 수납 조회 함수 (MoltBot용)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_student_payment_status(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_student students%ROWTYPE;
  v_payment student_payments%ROWTYPE;
  v_result JSONB;
BEGIN
  -- 학생 정보
  SELECT * INTO v_student FROM students WHERE id = p_student_id;

  -- 최신 결제 정보
  SELECT * INTO v_payment
  FROM student_payments
  WHERE student_id = p_student_id
  ORDER BY due_date DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'student_id', p_student_id,
    'student_name', v_student.name,
    'has_unpaid', NOT v_payment.paid,
    'unpaid_amount', CASE WHEN NOT v_payment.paid THEN v_payment.amount ELSE 0 END,
    'due_date', v_payment.due_date,
    'days_overdue', CASE
      WHEN NOT v_payment.paid AND v_payment.due_date < CURRENT_DATE
      THEN CURRENT_DATE - v_payment.due_date
      ELSE 0
    END,
    'qr_active', v_payment.qr_active,
    'lessons_remaining', v_payment.lessons_remaining,
    'payment_id', v_payment.id
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- 결제 완료 시 QR 자동 활성화
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION activate_qr_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- student_payments 업데이트
    UPDATE student_payments
    SET
      paid = TRUE,
      paid_at = NOW(),
      qr_active = TRUE,
      status = 'paid'
    WHERE id = NEW.payment_id;

    -- QR 활성화 로그
    INSERT INTO qr_activation_log (
      student_id, payment_id, activated_by, qr_code, valid_until, lessons_remaining
    )
    SELECT
      NEW.student_id,
      NEW.payment_id,
      'payment',
      sp.qr_code,
      sp.due_date + INTERVAL '30 days',
      sp.total_lessons
    FROM student_payments sp
    WHERE sp.id = NEW.payment_id;

    -- 부모 알림 생성
    INSERT INTO parent_notifications (
      parent_id, student_id, notification_type, reference_type, reference_id,
      channel, title, body, action_label
    )
    SELECT
      pu.id,
      NEW.student_id,
      'payment',
      'payment',
      NEW.payment_id,
      COALESCE((pu.notification_settings->>'preferred_channel')::notification_channel, 'kakao'),
      '✅ 결제 완료',
      s.name || ' 학생의 수강권이 활성화되었습니다. 이제 QR 출석이 가능합니다!',
      'QR 코드 확인'
    FROM parent_users pu
    JOIN students s ON s.id = NEW.student_id
    WHERE NEW.student_id = ANY(pu.student_ids);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_activate_qr_on_payment
AFTER UPDATE ON payment_requests
FOR EACH ROW
EXECUTE FUNCTION activate_qr_on_payment();

-- ────────────────────────────────────────────
-- 레슨 종료 시 자동 알림 생성
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_parent_on_lesson_end()
RETURNS TRIGGER AS $$
DECLARE
  v_student_ids UUID[];
  v_student_id UUID;
  v_coach_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'active' THEN
    -- 코치 이름
    SELECT name INTO v_coach_name FROM users WHERE id = NEW.coach_id;

    -- 출석한 학생들
    v_student_ids := NEW.attended_students;

    -- 각 학생의 부모에게 알림
    FOREACH v_student_id IN ARRAY v_student_ids
    LOOP
      INSERT INTO parent_notifications (
        parent_id, student_id, notification_type, reference_type, reference_id,
        channel, title, body, action_url, action_label
      )
      SELECT
        pu.id,
        v_student_id,
        'lesson_end',
        'session',
        NEW.id,
        COALESCE((pu.notification_settings->>'preferred_channel')::notification_channel, 'kakao'),
        '🏀 레슨 종료',
        s.name || ' 학생의 오늘 레슨이 종료되었습니다. 영상과 피드백을 확인해주세요!',
        '/student/' || v_student_id || '/today',
        '오늘 결과 확인'
      FROM parent_users pu
      JOIN students s ON s.id = v_student_id
      WHERE v_student_id = ANY(pu.student_ids);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_parent_on_lesson_end
AFTER UPDATE ON coach_sessions
FOR EACH ROW
EXECUTE FUNCTION notify_parent_on_lesson_end();

-- ────────────────────────────────────────────
-- 피드백 자동 메시지 생성
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_feedback_message()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_coach_name TEXT;
  v_message TEXT;
BEGIN
  -- 이름 조회
  SELECT name INTO v_student_name FROM students WHERE id = NEW.student_id;
  SELECT name INTO v_coach_name FROM users WHERE id = NEW.coach_id;

  -- 자동 메시지 생성
  v_message := '안녕하세요! ' || v_student_name || ' 학생의 오늘 레슨 결과입니다 🏀\n\n';
  v_message := v_message || '📝 수업 내용: ' || COALESCE(NEW.lesson_summary, '농구 기초 훈련') || '\n';

  IF NEW.strengths IS NOT NULL AND array_length(NEW.strengths, 1) > 0 THEN
    v_message := v_message || '✨ 잘한 점: ' || array_to_string(NEW.strengths, ', ') || '\n';
  END IF;

  IF NEW.improvements IS NOT NULL AND array_length(NEW.improvements, 1) > 0 THEN
    v_message := v_message || '📈 개선할 점: ' || array_to_string(NEW.improvements, ', ') || '\n';
  END IF;

  IF NEW.homework IS NOT NULL THEN
    v_message := v_message || '🏠 숙제: ' || NEW.homework || '\n';
  END IF;

  v_message := v_message || '\n담당 코치: ' || v_coach_name;

  -- 자동 메시지 저장
  NEW.auto_message := v_message;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_feedback_message
BEFORE INSERT ON lesson_feedbacks
FOR EACH ROW
EXECUTE FUNCTION generate_feedback_message();

-- ────────────────────────────────────────────
-- 상담 티켓 자동 번호 생성
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(ticket_number FROM 'TKT-\d{8}-(\d+)')::INT), 0) + 1
  INTO v_seq
  FROM consultation_tickets
  WHERE ticket_number LIKE 'TKT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';

  NEW.ticket_number := 'TKT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ticket_number
BEFORE INSERT ON consultation_tickets
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();

-- ────────────────────────────────────────────
-- 티켓 생성 시 강사에게 알림
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_coach_on_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    -- 강사에게 푸시 알림 (별도 알림 시스템 연동)
    -- 여기서는 로그만 남김
    RAISE NOTICE 'Ticket % assigned to coach %', NEW.ticket_number, NEW.assigned_to;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_coach_on_ticket
AFTER INSERT OR UPDATE OF assigned_to ON consultation_tickets
FOR EACH ROW
EXECUTE FUNCTION notify_coach_on_ticket();

-- ────────────────────────────────────────────
-- MoltBot 대화 처리 함수
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION moltbot_process_inquiry(
  p_parent_phone TEXT,
  p_message TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_parent parent_users%ROWTYPE;
  v_student students%ROWTYPE;
  v_payment_status JSONB;
  v_conversation_id UUID;
  v_response JSONB;
BEGIN
  -- 부모 조회
  SELECT * INTO v_parent FROM parent_users WHERE phone = p_parent_phone;

  IF v_parent.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'not_found',
      'message', '등록된 정보가 없습니다. 아카데미에 문의해주세요.'
    );
  END IF;

  -- 첫 번째 자녀 정보
  SELECT * INTO v_student
  FROM students
  WHERE id = v_parent.student_ids[1];

  -- 수납 상태 확인
  v_payment_status := check_student_payment_status(v_student.id);

  -- 대화 세션 생성
  INSERT INTO moltbot_conversations (parent_id, student_id, intent)
  VALUES (v_parent.id, v_student.id, 'payment_inquiry')
  RETURNING id INTO v_conversation_id;

  -- 응답 생성
  IF (v_payment_status->>'has_unpaid')::BOOLEAN THEN
    -- 미납 상태 → 결제 유도
    v_response := jsonb_build_object(
      'conversation_id', v_conversation_id,
      'student_name', v_student.name,
      'status', 'unpaid',
      'amount', v_payment_status->>'unpaid_amount',
      'days_overdue', v_payment_status->>'days_overdue',
      'message', v_student.name || ' 학생의 미납 금액이 있습니다.',
      'action', 'payment',
      'buttons', jsonb_build_array(
        jsonb_build_object('label', '💳 카카오페이 결제', 'action', 'pay_kakao'),
        jsonb_build_object('label', '📞 상담 요청', 'action', 'consult')
      )
    );
  ELSE
    -- 정상 → QR/스케줄 안내
    v_response := jsonb_build_object(
      'conversation_id', v_conversation_id,
      'student_name', v_student.name,
      'status', 'active',
      'qr_active', v_payment_status->>'qr_active',
      'lessons_remaining', v_payment_status->>'lessons_remaining',
      'message', v_student.name || ' 학생의 수강권이 활성화되어 있습니다.',
      'buttons', jsonb_build_array(
        jsonb_build_object('label', '📱 QR 코드 보기', 'action', 'show_qr'),
        jsonb_build_object('label', '📅 스케줄 확인', 'action', 'show_schedule'),
        jsonb_build_object('label', '🎬 영상 보기', 'action', 'show_videos')
      )
    );
  END IF;

  -- 메시지 로그
  INSERT INTO moltbot_messages (conversation_id, sender_type, content)
  VALUES (v_conversation_id, 'parent', p_message);

  INSERT INTO moltbot_messages (conversation_id, sender_type, message_type, content, buttons)
  VALUES (
    v_conversation_id,
    'bot',
    'button',
    v_response->>'message',
    v_response->'buttons'
  );

  RETURN v_response;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- 오늘의 레슨 결과 조회 (부모용)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_today_lesson_result(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'student_id', s.id,
    'student_name', s.name,
    'session', jsonb_build_object(
      'program_name', p.name,
      'coach_name', u.name,
      'started_at', cs.started_at,
      'ended_at', cs.ended_at,
      'duration_minutes', EXTRACT(EPOCH FROM (cs.ended_at - cs.started_at)) / 60
    ),
    'videos', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', sv.id,
        'thumbnail_url', sv.thumbnail_url,
        'video_url', sv.video_url,
        'skill_tags', sv.skill_tags,
        'duration_seconds', sv.duration_seconds
      ))
      FROM student_videos sv
      WHERE sv.student_id = p_student_id
        AND sv.session_id = cs.id
    ),
    'feedback', jsonb_build_object(
      'summary', lf.lesson_summary,
      'strengths', lf.strengths,
      'improvements', lf.improvements,
      'homework', lf.homework,
      'participation', lf.participation_score
    ),
    'next_schedule', (
      SELECT jsonb_build_object(
        'date', st.day_of_week,
        'time', st.start_time,
        'program', p2.name
      )
      FROM schedule_templates st
      JOIN programs p2 ON st.program_id = p2.id
      JOIN student_enrollments se ON se.program_id = p2.id
      WHERE se.student_id = p_student_id AND se.status = 'active'
      ORDER BY st.day_of_week
      LIMIT 1
    )
  )
  INTO v_result
  FROM students s
  JOIN coach_sessions cs ON s.id = ANY(cs.attended_students)
  LEFT JOIN programs p ON cs.program_id = p.id
  LEFT JOIN users u ON cs.coach_id = u.id
  LEFT JOIN lesson_feedbacks lf ON lf.session_id = cs.id AND lf.student_id = s.id
  WHERE s.id = p_student_id
    AND cs.session_date = CURRENT_DATE
    AND cs.status = 'completed'
  ORDER BY cs.ended_at DESC
  LIMIT 1;

  RETURN COALESCE(v_result, jsonb_build_object('error', 'no_lesson_today'));
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- RLS 정책
-- ────────────────────────────────────────────

ALTER TABLE parent_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE moltbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE moltbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_tickets ENABLE ROW LEVEL SECURITY;

-- 부모는 자신의 데이터만
CREATE POLICY "부모는 자신의 데이터만" ON parent_users
  FOR ALL USING (auth_id = auth.uid());

-- 대화는 당사자만
CREATE POLICY "대화는 당사자만" ON moltbot_conversations
  FOR SELECT USING (
    parent_id IN (SELECT id FROM parent_users WHERE auth_id = auth.uid())
    OR
    escalated_to IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- 알림은 수신자만
CREATE POLICY "알림은 수신자만" ON parent_notifications
  FOR SELECT USING (
    parent_id IN (SELECT id FROM parent_users WHERE auth_id = auth.uid())
  );

-- 티켓은 관련자만
CREATE POLICY "티켓은 관련자만" ON consultation_tickets
  FOR SELECT USING (
    parent_id IN (SELECT id FROM parent_users WHERE auth_id = auth.uid())
    OR
    assigned_to IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );
