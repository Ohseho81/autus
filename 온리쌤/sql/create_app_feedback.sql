-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 승원봇 피드백 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  user_role VARCHAR(50),
  user_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 피드백 작성 가능
CREATE POLICY "Anyone can insert feedback" ON app_feedback
  FOR INSERT WITH CHECK (true);

-- 인덱스
CREATE INDEX idx_app_feedback_status ON app_feedback(status);
CREATE INDEX idx_app_feedback_created_at ON app_feedback(created_at DESC);

-- 코멘트
COMMENT ON TABLE app_feedback IS '승원봇을 통한 앱 피드백/수정요청';
