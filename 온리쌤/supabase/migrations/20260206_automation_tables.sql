-- ═══════════════════════════════════════════════════════════════════════════════
-- 자동화 시스템 테이블 (입력 제로화 + 산출 자동화)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. 세션 리포트 테이블 (AI 감동 리포트)
CREATE TABLE IF NOT EXISTS session_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES atb_lesson_sessions(id) ON DELETE CASCADE,
  session_name VARCHAR(255),
  session_date DATE,
  coach_feedback TEXT,
  total_students INTEGER DEFAULT 0,
  present_count INTEGER DEFAULT 0,
  reports JSONB, -- 학생별 AI 메시지 배열
  status VARCHAR(20) DEFAULT 'ready', -- ready, sent, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_reports_session ON session_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_date ON session_reports(session_date DESC);

-- 2. 분석 로그 테이블 (V-Index 분석 이력)
CREATE TABLE IF NOT EXISTS analysis_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- vindex_daily, attendance_weekly, payment_monthly
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  total_students INTEGER DEFAULT 0,
  updated_students INTEGER DEFAULT 0,
  risk_students INTEGER DEFAULT 0,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_logs_type ON analysis_logs(type);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_date ON analysis_logs(analyzed_at DESC);

-- 3. 하이라이트 클립 테이블 (음성 감지 영상)
CREATE TABLE IF NOT EXISTS highlight_clips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES atb_lesson_sessions(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  
  -- 트리거 정보
  trigger_type VARCHAR(50) NOT NULL, -- voice_praise, manual, ai_detected
  trigger_keyword VARCHAR(100), -- "나이스!", "굿!" 등
  trigger_timestamp TIMESTAMPTZ,
  
  -- 영상 정보
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 15,
  start_offset_seconds INTEGER DEFAULT 0,
  
  -- 상태
  status VARCHAR(20) DEFAULT 'processing', -- processing, ready, sent, failed
  processed_at TIMESTAMPTZ,
  sent_to_parent BOOLEAN DEFAULT FALSE,
  
  -- 메타데이터
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_highlight_clips_session ON highlight_clips(session_id);
CREATE INDEX IF NOT EXISTS idx_highlight_clips_student ON highlight_clips(student_id);
CREATE INDEX IF NOT EXISTS idx_highlight_clips_status ON highlight_clips(status);

-- 4. 음성 트리거 키워드 설정 테이블
CREATE TABLE IF NOT EXISTS voice_trigger_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  category VARCHAR(50) DEFAULT 'praise', -- praise, action, highlight
  buffer_before_seconds INTEGER DEFAULT 10,
  buffer_after_seconds INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 칭찬 키워드 삽입
INSERT INTO voice_trigger_keywords (org_id, keyword, category) VALUES
  ('00000000-0000-0000-0000-000000000001', '나이스', 'praise'),
  ('00000000-0000-0000-0000-000000000001', '굿', 'praise'),
  ('00000000-0000-0000-0000-000000000001', '좋아', 'praise'),
  ('00000000-0000-0000-0000-000000000001', '잘했어', 'praise'),
  ('00000000-0000-0000-0000-000000000001', '최고', 'praise'),
  ('00000000-0000-0000-0000-000000000001', '완벽', 'praise'),
  ('00000000-0000-0000-0000-000000000001', '대박', 'praise'),
  ('00000000-0000-0000-0000-000000000001', '슛', 'action'),
  ('00000000-0000-0000-0000-000000000001', '골', 'action'),
  ('00000000-0000-0000-0000-000000000001', '3점', 'action')
ON CONFLICT DO NOTHING;

-- 5. staff 테이블에 FCM 토큰 필드 추가 (없는 경우)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 6. students 테이블에 분석 관련 필드 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_analysis_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;

-- 7. atb_lesson_sessions 테이블에 리포트 필드 추가
ALTER TABLE atb_lesson_sessions ADD COLUMN IF NOT EXISTS report_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE atb_lesson_sessions ADD COLUMN IF NOT EXISTS report_id UUID;

-- 8. payment_records 테이블에 웹훅 필드 추가
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS payment_key VARCHAR(255);
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS order_id VARCHAR(255);
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 9. RLS 정책
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_trigger_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "세션 리포트 조회" ON session_reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "분석 로그 조회" ON analysis_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "하이라이트 조회" ON highlight_clips FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "키워드 조회" ON voice_trigger_keywords FOR SELECT USING (auth.uid() IS NOT NULL);

-- 10. pg_cron 스케줄 (V-Index 분석 - 매일 오전 9시)
-- 주의: pg_cron 확장이 필요합니다. Supabase Dashboard에서 활성화 필요.
-- SELECT cron.schedule(
--   'vindex-daily-analysis',
--   '0 9 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/vindex-analyzer',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body := '{}'::jsonb
--   )
--   $$
-- );

SELECT '자동화 시스템 테이블 생성 완료' AS result;
