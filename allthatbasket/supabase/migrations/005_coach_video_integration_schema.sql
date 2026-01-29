-- ============================================
-- 올댓바스켓 강사 출석-영상 통합 시스템
-- Supabase Migration 005
--
-- 핵심 컨셉:
-- 1. 강사 출석(QR) = 세션 시작 = 영상 업로드 활성화
-- 2. 개인별 영상이 개인에게 직접 전달 (팀 무관)
-- 3. 학부모 앱으로 실시간 알림
-- ============================================

-- ────────────────────────────────────────────
-- 코치 세션 테이블 (출석 + 영상 통합)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  court_id UUID REFERENCES courts(id) ON DELETE SET NULL,

  -- 세션 시간
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- QR 출근 시간
  ended_at TIMESTAMPTZ,                             -- QR 퇴근 시간

  -- 세션 정보
  session_type TEXT DEFAULT 'regular',              -- 'regular' | 'makeup' | 'trial' | 'special'
  title TEXT,                                       -- '주니어 드리블 기초 - 오전반'

  -- 출석 학생
  expected_students UUID[] DEFAULT '{}',            -- 예정 학생 목록
  attended_students UUID[] DEFAULT '{}',            -- 실제 출석 학생

  -- 영상 업로드 상태
  video_upload_enabled BOOLEAN DEFAULT TRUE,
  total_videos_uploaded INT DEFAULT 0,

  -- GPS
  gps_start JSONB,                                  -- {lat, lng}
  gps_end JSONB,

  status TEXT DEFAULT 'active',                     -- 'active' | 'completed' | 'cancelled'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 개인별 영상 테이블 (팀 무관, 1:1 전달)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연결
  session_id UUID REFERENCES coach_sessions(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  -- 영상 정보
  video_url TEXT NOT NULL,                          -- Supabase Storage URL
  thumbnail_url TEXT,
  duration_seconds INT,                             -- 영상 길이
  file_size_mb DECIMAL(8,2),

  -- 메타데이터
  title TEXT,                                       -- '민준이 드리블 연습'
  description TEXT,                                 -- 코치 코멘트
  skill_tags TEXT[],                                -- ['dribble', 'crossover']
  skill_category skill_category,                    -- 주요 스킬

  -- 평가 (선택)
  skill_rating INT CHECK (skill_rating BETWEEN 1 AND 10),
  coach_feedback TEXT,

  -- 전달 상태
  is_public BOOLEAN DEFAULT FALSE,                  -- 다른 학생에게 공개 여부
  delivered_at TIMESTAMPTZ,                         -- 학부모에게 전달된 시간
  delivery_method TEXT DEFAULT 'app',               -- 'app' | 'kakao' | 'sms'

  -- 부모 확인
  parent_viewed BOOLEAN DEFAULT FALSE,
  parent_viewed_at TIMESTAMPTZ,
  parent_reaction TEXT,                             -- 'like' | 'love' | 'clap' | NULL

  -- 업로드 정보
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  upload_device TEXT,                               -- 'iphone' | 'android' | 'web'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 영상 전달 알림 테이블
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES student_videos(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  -- 수신자
  recipient_type TEXT NOT NULL,                     -- 'parent' | 'student'
  recipient_phone TEXT,
  recipient_email TEXT,

  -- 알림
  notification_type TEXT NOT NULL,                  -- 'push' | 'kakao' | 'sms' | 'email'
  message_template TEXT,
  message_sent TEXT,

  -- 상태
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',                    -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 영상 컬렉션 (성장 앨범)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_video_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                               -- '2026년 1월 성장 기록'
  description TEXT,
  cover_thumbnail_url TEXT,

  -- 기간
  period_start DATE,
  period_end DATE,

  -- 포함 영상
  video_ids UUID[] DEFAULT '{}',
  video_count INT DEFAULT 0,

  -- 공유
  is_shareable BOOLEAN DEFAULT FALSE,
  share_link TEXT,
  share_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 인덱스
-- ────────────────────────────────────────────
CREATE INDEX idx_coach_sessions_coach ON coach_sessions(coach_id);
CREATE INDEX idx_coach_sessions_date ON coach_sessions(session_date);
CREATE INDEX idx_coach_sessions_status ON coach_sessions(status);

CREATE INDEX idx_student_videos_session ON student_videos(session_id);
CREATE INDEX idx_student_videos_student ON student_videos(student_id);
CREATE INDEX idx_student_videos_coach ON student_videos(coach_id);
CREATE INDEX idx_student_videos_date ON student_videos(uploaded_at);
CREATE INDEX idx_student_videos_delivered ON student_videos(delivered_at);

CREATE INDEX idx_video_notifications_video ON video_notifications(video_id);
CREATE INDEX idx_video_notifications_status ON video_notifications(status);

-- ────────────────────────────────────────────
-- 세션 시작 시 자동 처리 (QR 출근)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION start_coach_session(
  p_coach_id UUID,
  p_branch_id UUID,
  p_program_id UUID DEFAULT NULL,
  p_gps JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_expected_students UUID[];
BEGIN
  -- 예정 학생 조회 (프로그램 등록 학생)
  IF p_program_id IS NOT NULL THEN
    SELECT ARRAY_AGG(se.student_id)
    INTO v_expected_students
    FROM student_enrollments se
    WHERE se.program_id = p_program_id
      AND se.status = 'active';
  END IF;

  -- 세션 생성
  INSERT INTO coach_sessions (
    coach_id, branch_id, program_id,
    expected_students, gps_start, status
  )
  VALUES (
    p_coach_id, p_branch_id, p_program_id,
    COALESCE(v_expected_students, '{}'), p_gps, 'active'
  )
  RETURNING id INTO v_session_id;

  -- 코치 근무 로그도 생성
  INSERT INTO coach_work_logs (coach_id, work_date, clock_in_time, status)
  VALUES (p_coach_id, CURRENT_DATE, NOW(), 'active')
  ON CONFLICT (coach_id, work_date) DO NOTHING;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- 영상 업로드 시 자동 처리
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_video_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_coach_name TEXT;
  v_parent_phone TEXT;
BEGIN
  -- 학생/코치 정보 조회
  SELECT name INTO v_student_name FROM students WHERE id = NEW.student_id;
  SELECT name INTO v_coach_name FROM users WHERE id = NEW.coach_id;
  SELECT parent_phone INTO v_parent_phone FROM students WHERE id = NEW.student_id;

  -- 세션 영상 카운트 업데이트
  UPDATE coach_sessions
  SET total_videos_uploaded = total_videos_uploaded + 1,
      updated_at = NOW()
  WHERE id = NEW.session_id;

  -- 부모 알림 생성 (자동 전달)
  IF v_parent_phone IS NOT NULL THEN
    INSERT INTO video_notifications (
      video_id, student_id, recipient_type, recipient_phone,
      notification_type, message_template, status
    )
    VALUES (
      NEW.id, NEW.student_id, 'parent', v_parent_phone,
      'kakao',
      '🏀 ' || v_student_name || ' 학생의 오늘 연습 영상이 도착했습니다!\n\n코치: ' || v_coach_name || '\n\n앱에서 확인해주세요.',
      'pending'
    );

    -- 전달 시간 기록
    UPDATE student_videos
    SET delivered_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_video_upload
AFTER INSERT ON student_videos
FOR EACH ROW
EXECUTE FUNCTION process_video_upload();

-- ────────────────────────────────────────────
-- 세션 종료 시 자동 처리 (QR 퇴근)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION end_coach_session(
  p_session_id UUID,
  p_gps JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_session coach_sessions%ROWTYPE;
  v_duration_hours DECIMAL;
  v_result JSONB;
BEGIN
  -- 세션 조회
  SELECT * INTO v_session FROM coach_sessions WHERE id = p_session_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Session not found');
  END IF;

  -- 세션 종료
  UPDATE coach_sessions
  SET
    ended_at = NOW(),
    gps_end = p_gps,
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_session_id;

  -- 근무 시간 계산
  v_duration_hours := EXTRACT(EPOCH FROM (NOW() - v_session.started_at)) / 3600;

  -- 근무 로그 업데이트
  UPDATE coach_work_logs
  SET
    clock_out_time = NOW(),
    total_hours = v_duration_hours,
    lessons_completed = 1,
    students_attended = array_length(v_session.attended_students, 1),
    status = 'completed'
  WHERE coach_id = v_session.coach_id AND work_date = CURRENT_DATE;

  -- 결과 반환
  v_result := jsonb_build_object(
    'session_id', p_session_id,
    'duration_hours', ROUND(v_duration_hours::NUMERIC, 2),
    'videos_uploaded', v_session.total_videos_uploaded,
    'students_attended', array_length(v_session.attended_students, 1)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- 학생별 영상 히스토리 뷰
-- ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_student_video_history AS
SELECT
  s.id AS student_id,
  s.name AS student_name,
  sv.id AS video_id,
  sv.video_url,
  sv.thumbnail_url,
  sv.title,
  sv.skill_tags,
  sv.skill_category,
  sv.skill_rating,
  sv.coach_feedback,
  sv.duration_seconds,
  sv.uploaded_at,
  sv.parent_viewed,
  sv.parent_viewed_at,
  sv.parent_reaction,
  u.name AS coach_name,
  cs.session_date,
  p.name AS program_name
FROM students s
JOIN student_videos sv ON s.id = sv.student_id
LEFT JOIN users u ON sv.coach_id = u.id
LEFT JOIN coach_sessions cs ON sv.session_id = cs.id
LEFT JOIN programs p ON cs.program_id = p.id
ORDER BY sv.uploaded_at DESC;

-- ────────────────────────────────────────────
-- 코치 세션 요약 뷰
-- ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_coach_session_summary AS
SELECT
  cs.id AS session_id,
  cs.coach_id,
  u.name AS coach_name,
  cs.session_date,
  cs.started_at,
  cs.ended_at,
  EXTRACT(EPOCH FROM (COALESCE(cs.ended_at, NOW()) - cs.started_at)) / 3600 AS duration_hours,
  array_length(cs.expected_students, 1) AS expected_count,
  array_length(cs.attended_students, 1) AS attended_count,
  cs.total_videos_uploaded,
  cs.status,
  p.name AS program_name,
  b.name AS branch_name
FROM coach_sessions cs
JOIN users u ON cs.coach_id = u.id
LEFT JOIN programs p ON cs.program_id = p.id
LEFT JOIN branches b ON cs.branch_id = b.id
ORDER BY cs.started_at DESC;

-- ────────────────────────────────────────────
-- 학부모용 미확인 영상 함수
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_unwatched_videos(p_student_id UUID)
RETURNS TABLE (
  video_id UUID,
  video_url TEXT,
  thumbnail_url TEXT,
  title TEXT,
  coach_name TEXT,
  uploaded_at TIMESTAMPTZ,
  skill_tags TEXT[],
  duration_seconds INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sv.id,
    sv.video_url,
    sv.thumbnail_url,
    sv.title,
    u.name,
    sv.uploaded_at,
    sv.skill_tags,
    sv.duration_seconds
  FROM student_videos sv
  LEFT JOIN users u ON sv.coach_id = u.id
  WHERE sv.student_id = p_student_id
    AND sv.parent_viewed = FALSE
  ORDER BY sv.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- 영상 시청 완료 처리
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_video_viewed(
  p_video_id UUID,
  p_reaction TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE student_videos
  SET
    parent_viewed = TRUE,
    parent_viewed_at = NOW(),
    parent_reaction = p_reaction
  WHERE id = p_video_id;

  -- 알림도 읽음 처리
  UPDATE video_notifications
  SET
    read_at = NOW(),
    status = 'read'
  WHERE video_id = p_video_id AND status != 'read';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- RLS 정책
-- ────────────────────────────────────────────

ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_notifications ENABLE ROW LEVEL SECURITY;

-- 코치는 자신의 세션만
CREATE POLICY "코치는 자신의 세션만 관리" ON coach_sessions
  FOR ALL USING (
    coach_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR
    branch_id IN (
      SELECT branch_id FROM users
      WHERE auth_id = auth.uid() AND role IN ('owner', 'director', 'admin')
    )
  );

-- 영상은 관련자만 (코치, 학생, 부모)
CREATE POLICY "영상은 관련자만 조회" ON student_videos
  FOR SELECT USING (
    coach_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR
    student_id IN (SELECT id FROM students WHERE parent_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

-- 코치만 영상 업로드
CREATE POLICY "코치만 영상 업로드" ON student_videos
  FOR INSERT WITH CHECK (
    coach_id IN (SELECT id FROM users WHERE auth_id = auth.uid() AND role = 'coach')
  );
