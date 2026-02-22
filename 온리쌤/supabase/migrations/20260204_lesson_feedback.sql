-- ═══════════════════════════════════════════════════════════════════════════════
-- 📱 수업 피드백 & 보충수업 시스템
-- 카카오톡 양방향 응답 처리용 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎫 응답 토큰 테이블
-- 알림톡 버튼 클릭 시 사용되는 일회성 토큰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS attendance_response_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 토큰 정보
  token VARCHAR(500) NOT NULL UNIQUE,
  
  -- 연관 정보
  lesson_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_phone VARCHAR(20) NOT NULL,
  
  -- 상태
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, ATTEND, ABSENT, EXPIRED
  
  -- 응답 시간
  responded_at TIMESTAMPTZ,
  
  -- 만료 시간
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_response_tokens_token ON attendance_response_tokens(token);
CREATE INDEX idx_response_tokens_lesson ON attendance_response_tokens(lesson_id);
CREATE INDEX idx_response_tokens_student ON attendance_response_tokens(student_id);
CREATE INDEX idx_response_tokens_status ON attendance_response_tokens(status);
CREATE INDEX idx_response_tokens_expires ON attendance_response_tokens(expires_at);

COMMENT ON TABLE attendance_response_tokens IS '알림톡 응답 토큰 (출석/결석 확인용)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 출석 응답 테이블
-- 학부모 응답 기록
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS attendance_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 연관 정보
  lesson_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- 응답 정보
  response_type VARCHAR(20) NOT NULL, -- ATTEND, ABSENT
  
  -- 타임스탬프
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_attendance_responses_lesson ON attendance_responses(lesson_id);
CREATE INDEX idx_attendance_responses_student ON attendance_responses(student_id);
CREATE INDEX idx_attendance_responses_type ON attendance_responses(response_type);

COMMENT ON TABLE attendance_responses IS '학부모 출석 응답 기록';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ❌ 결석 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS absences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 연관 정보
  lesson_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- 결석 정보
  reason TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_MAKEUP',
  -- PENDING_MAKEUP: 보충 대기
  -- MAKEUP_SCHEDULED: 보충 확정
  -- MAKEUP_COMPLETED: 보충 완료
  -- NO_MAKEUP: 보충 없음
  -- CANCELLED: 취소됨
  
  -- 보충수업 정보
  makeup_slot_id UUID REFERENCES makeup_slots(id),
  makeup_scheduled_at TIMESTAMPTZ,
  makeup_completed_at TIMESTAMPTZ,
  
  -- 타임스탬프
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_absences_lesson ON absences(lesson_id);
CREATE INDEX idx_absences_student ON absences(student_id);
CREATE INDEX idx_absences_status ON absences(status);
CREATE INDEX idx_absences_makeup ON absences(makeup_slot_id);

COMMENT ON TABLE absences IS '결석 및 보충수업 관리';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📅 보충수업 슬롯 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS makeup_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 일정 정보
  date DATE NOT NULL,
  time VARCHAR(10) NOT NULL, -- '16:00'
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  
  -- 장소 정보
  location VARCHAR(100) NOT NULL,
  
  -- 코치 정보
  coach_id UUID,
  coach_name VARCHAR(100),
  
  -- 수용 인원
  max_spots INTEGER NOT NULL DEFAULT 4,
  available_spots INTEGER NOT NULL DEFAULT 4,
  
  -- 상태
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_makeup_slots_date ON makeup_slots(date);
CREATE INDEX idx_makeup_slots_coach ON makeup_slots(coach_id);
CREATE INDEX idx_makeup_slots_available ON makeup_slots(available_spots) WHERE available_spots > 0;
CREATE INDEX idx_makeup_slots_active ON makeup_slots(is_active) WHERE is_active = true;

-- Unique constraint: 같은 시간/장소에 중복 슬롯 방지
CREATE UNIQUE INDEX idx_makeup_slots_unique 
  ON makeup_slots(date, time, location) 
  WHERE is_active = true;

COMMENT ON TABLE makeup_slots IS '보충수업 가능 슬롯';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 뷰: 결석 현황
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW absence_dashboard AS
SELECT
  a.id,
  a.lesson_id,
  a.student_id,
  s.name as student_name,
  s.parent_phone,
  s.parent_name,
  a.reason,
  a.status,
  a.requested_at,
  ms.date as makeup_date,
  ms.time as makeup_time,
  ms.location as makeup_location
FROM absences a
JOIN students s ON s.id = a.student_id
LEFT JOIN makeup_slots ms ON ms.id = a.makeup_slot_id
ORDER BY a.requested_at DESC;

COMMENT ON VIEW absence_dashboard IS '결석 현황 대시보드';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 뷰: 보충수업 현황
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW makeup_slot_status AS
SELECT
  ms.id,
  ms.date,
  ms.time,
  ms.location,
  ms.coach_name,
  ms.max_spots,
  ms.available_spots,
  ms.max_spots - ms.available_spots as booked_count,
  ROUND((ms.max_spots - ms.available_spots)::numeric / ms.max_spots * 100, 1) as occupancy_rate
FROM makeup_slots ms
WHERE ms.is_active = true
  AND ms.date >= CURRENT_DATE
ORDER BY ms.date, ms.time;

COMMENT ON VIEW makeup_slot_status IS '보충수업 슬롯 현황';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ⚡ 트리거: 만료 토큰 자동 정리
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION expire_old_tokens()
RETURNS void AS $$
BEGIN
  UPDATE attendance_response_tokens
  SET status = 'EXPIRED'
  WHERE status = 'PENDING'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 1시간마다 실행 (pg_cron 또는 외부 cron 필요)
-- SELECT cron.schedule('expire_tokens', '0 * * * *', 'SELECT expire_old_tokens()');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 샘플 보충수업 슬롯 데이터
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO makeup_slots (date, time, location, coach_name, max_spots, available_spots) VALUES
  (CURRENT_DATE + INTERVAL '1 day', '16:00', '대치 코트 A', '박코치', 4, 4),
  (CURRENT_DATE + INTERVAL '1 day', '17:30', '대치 코트 B', '김코치', 4, 3),
  (CURRENT_DATE + INTERVAL '2 days', '15:00', '대치 코트 A', '박코치', 4, 4),
  (CURRENT_DATE + INTERVAL '2 days', '16:30', '대치 코트 A', '이코치', 4, 2),
  (CURRENT_DATE + INTERVAL '3 days', '14:00', '대치 코트 B', '김코치', 4, 4)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 RLS 정책
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE attendance_response_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE makeup_slots ENABLE ROW LEVEL SECURITY;

-- 토큰: 시스템만 접근
CREATE POLICY "System access tokens" ON attendance_response_tokens FOR ALL USING (true);

-- 응답: 관리자 조회
CREATE POLICY "Staff view responses" ON attendance_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager', 'coach')
  ));

-- 결석: 관리자 전체, 학부모 자녀만
CREATE POLICY "Staff view absences" ON absences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager', 'coach')
  ));

CREATE POLICY "Parents view own absences" ON absences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM students WHERE id = student_id AND parent_id = auth.uid()
  ));

-- 보충 슬롯: 모두 조회 가능
CREATE POLICY "Anyone view makeup slots" ON makeup_slots FOR SELECT USING (true);
