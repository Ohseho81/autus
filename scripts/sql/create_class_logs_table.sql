-- =====================================================
-- 온리쌤 수업 결과 로그 테이블 생성
-- =====================================================
-- 용도: 수업 후 학생 상태, 코멘트 기록 → 학부모 자동 전송
-- 작성일: 2026-02-14
-- =====================================================

-- 1. class_logs 테이블 생성
CREATE TABLE IF NOT EXISTS class_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 참조
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,

  -- 수업 정보
  class_date DATE NOT NULL,
  class_time TIME,
  coach_name TEXT,

  -- 출석 정보
  attendance_status TEXT CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),

  -- 수업 내용
  skill_focus TEXT, -- 수업 중점 (예: 서브, 리시브, 스파이크)
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  performance_score INTEGER CHECK (performance_score >= 1 AND performance_score <= 10), -- 1-10점

  -- 코멘트
  coach_comment TEXT,
  student_mood TEXT CHECK (student_mood IN ('great', 'good', 'okay', 'tired', 'frustrated')),

  -- 알림 상태
  parent_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT -- 강사 이름 또는 시스템
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_class_logs_student_id ON class_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_class_logs_class_date ON class_logs(class_date DESC);
CREATE INDEX IF NOT EXISTS idx_class_logs_membership_id ON class_logs(membership_id);
CREATE INDEX IF NOT EXISTS idx_class_logs_parent_notified ON class_logs(parent_notified) WHERE parent_notified = false;

-- 3. 자동 updated_at 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_class_logs_updated_at
    BEFORE UPDATE ON class_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 정책
ALTER TABLE class_logs ENABLE ROW LEVEL SECURITY;

-- 관리자/강사만 접근 가능
CREATE POLICY "Staff can manage class logs"
ON class_logs
FOR ALL
USING (
  auth.uid() IS NOT NULL
);

-- 5. 코멘트 추가 (테이블 문서화)
COMMENT ON TABLE class_logs IS '수업 결과 로그 - 강사가 수업 후 학생 상태와 코멘트를 기록';
COMMENT ON COLUMN class_logs.attendance_status IS '출석 상태: present(출석), absent(결석), late(지각), excused(사유결석)';
COMMENT ON COLUMN class_logs.skill_level IS '현재 기술 수준: beginner, intermediate, advanced, expert';
COMMENT ON COLUMN class_logs.performance_score IS '오늘 수업 퍼포먼스 점수 (1-10)';
COMMENT ON COLUMN class_logs.parent_notified IS '학부모 알림 발송 여부';

-- =====================================================
-- 테스트 데이터 삽입 (선택사항)
-- =====================================================

-- 테스트용 샘플 데이터 (실제 student_id로 교체 필요)
/*
INSERT INTO class_logs (
  student_id,
  class_date,
  class_time,
  coach_name,
  attendance_status,
  skill_focus,
  skill_level,
  performance_score,
  coach_comment,
  student_mood,
  created_by
) VALUES (
  '학생ID',  -- 실제 UUID로 교체
  CURRENT_DATE,
  '16:00:00',
  '김코치',
  'present',
  '서브 연습',
  'intermediate',
  8,
  '오늘 서브 자세가 많이 좋아졌습니다. 계속 연습하면 실전에서도 잘 할 수 있을 것 같아요!',
  'great',
  '김코치'
);
*/

-- =====================================================
-- 완료!
-- =====================================================
-- 실행 후 확인:
-- SELECT * FROM class_logs LIMIT 10;
