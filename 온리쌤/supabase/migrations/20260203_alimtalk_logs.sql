-- ═══════════════════════════════════════════════════════════════════════════════
-- 📱 알림톡 로그 테이블
-- 카카오 알림톡 발송 기록 저장
-- ═══════════════════════════════════════════════════════════════════════════════

-- 알림톡 로그 테이블
CREATE TABLE IF NOT EXISTS alimtalk_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 발송 정보
  template_code VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,

  -- 결과
  success BOOLEAN NOT NULL DEFAULT false,
  message_id VARCHAR(100),
  error TEXT,

  -- 연관 데이터 (선택적)
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  attendance_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lesson_slots(id) ON DELETE SET NULL,

  -- 메타데이터
  variables JSONB DEFAULT '{}',

  -- 타임스탬프
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_alimtalk_logs_template ON alimtalk_logs(template_code);
CREATE INDEX idx_alimtalk_logs_phone ON alimtalk_logs(phone);
CREATE INDEX idx_alimtalk_logs_student ON alimtalk_logs(student_id);
CREATE INDEX idx_alimtalk_logs_sent_at ON alimtalk_logs(sent_at DESC);
CREATE INDEX idx_alimtalk_logs_success ON alimtalk_logs(success);

-- RLS (Row Level Security)
ALTER TABLE alimtalk_logs ENABLE ROW LEVEL SECURITY;

-- 정책: 관리자만 조회/생성 가능
CREATE POLICY "Admins can view alimtalk logs"
  ON alimtalk_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "System can insert alimtalk logs"
  ON alimtalk_logs FOR INSERT
  WITH CHECK (true);

-- 코멘트
COMMENT ON TABLE alimtalk_logs IS '카카오 알림톡 발송 로그';
COMMENT ON COLUMN alimtalk_logs.template_code IS '알림톡 템플릿 코드 (ATB_ATTENDANCE 등)';
COMMENT ON COLUMN alimtalk_logs.phone IS '수신자 전화번호';
COMMENT ON COLUMN alimtalk_logs.success IS '발송 성공 여부';
COMMENT ON COLUMN alimtalk_logs.message_id IS '발송 API 응답 메시지 ID';
COMMENT ON COLUMN alimtalk_logs.error IS '실패 시 에러 메시지';
COMMENT ON COLUMN alimtalk_logs.variables IS '템플릿에 사용된 변수들 (JSON)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 통계 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW alimtalk_stats AS
SELECT
  template_code,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as fail_count,
  ROUND(
    (COUNT(*) FILTER (WHERE success = true)::numeric / NULLIF(COUNT(*), 0) * 100),
    2
  ) as success_rate,
  DATE_TRUNC('day', sent_at) as date
FROM alimtalk_logs
GROUP BY template_code, DATE_TRUNC('day', sent_at)
ORDER BY date DESC, template_code;

COMMENT ON VIEW alimtalk_stats IS '알림톡 발송 통계 (일별, 템플릿별)';
