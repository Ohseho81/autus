-- ═══════════════════════════════════════════════════════════════════════════════
-- 📅 구글 캘린더 연동 테이블
-- OAuth 토큰 저장 및 동기화 로그
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 OAuth 토큰 저장 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth 제공자 정보
  provider VARCHAR(50) NOT NULL, -- 'google_calendar', 'slack', etc.

  -- 토큰
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,

  -- 추가 정보
  scope TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 사용자당 제공자별 하나의 토큰만
  UNIQUE(user_id, provider)
);

-- 인덱스
CREATE INDEX idx_oauth_tokens_user ON user_oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_provider ON user_oauth_tokens(provider);
CREATE INDEX idx_oauth_tokens_expires ON user_oauth_tokens(expires_at);

-- RLS
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자 본인만 자신의 토큰 접근 가능
CREATE POLICY "Users can manage own tokens"
  ON user_oauth_tokens FOR ALL
  USING (auth.uid() = user_id);

-- 코멘트
COMMENT ON TABLE user_oauth_tokens IS '외부 서비스 OAuth 토큰 저장';
COMMENT ON COLUMN user_oauth_tokens.provider IS 'OAuth 제공자 (google_calendar, slack 등)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔄 캘린더 동기화 로그 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 연관 데이터
  lesson_slot_id UUID REFERENCES lesson_slots(id) ON DELETE CASCADE,
  google_event_id VARCHAR(255),

  -- 동기화 정보
  action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
  success BOOLEAN NOT NULL DEFAULT false,
  error TEXT,

  -- 동기화 주체
  synced_by UUID REFERENCES auth.users(id),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_calendar_sync_lesson ON calendar_sync_logs(lesson_slot_id);
CREATE INDEX idx_calendar_sync_event ON calendar_sync_logs(google_event_id);
CREATE INDEX idx_calendar_sync_success ON calendar_sync_logs(success);
CREATE INDEX idx_calendar_sync_created ON calendar_sync_logs(created_at DESC);

-- RLS
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능
CREATE POLICY "Admins can view sync logs"
  ON calendar_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'manager', 'coach')
    )
  );

-- 시스템에서 삽입 가능
CREATE POLICY "System can insert sync logs"
  ON calendar_sync_logs FOR INSERT
  WITH CHECK (true);

-- 코멘트
COMMENT ON TABLE calendar_sync_logs IS '구글 캘린더 동기화 기록';
COMMENT ON COLUMN calendar_sync_logs.action IS '동기화 액션 (create, update, delete)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 캘린더 연동 상태 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW calendar_sync_status AS
SELECT
  ls.id as lesson_slot_id,
  ls.name as lesson_name,
  ls.date,
  ls.start_time,
  csl.google_event_id,
  csl.success as last_sync_success,
  csl.created_at as last_synced_at,
  CASE
    WHEN csl.google_event_id IS NOT NULL AND csl.success = true THEN 'synced'
    WHEN csl.google_event_id IS NOT NULL AND csl.success = false THEN 'error'
    ELSE 'not_synced'
  END as sync_status
FROM lesson_slots ls
LEFT JOIN LATERAL (
  SELECT google_event_id, success, created_at
  FROM calendar_sync_logs
  WHERE lesson_slot_id = ls.id
  ORDER BY created_at DESC
  LIMIT 1
) csl ON true
WHERE ls.date >= CURRENT_DATE;

COMMENT ON VIEW calendar_sync_status IS '수업별 캘린더 동기화 상태';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ⚡ 자동 동기화 트리거 (선택)
-- 수업 생성/수정 시 자동 동기화 플래그 설정
-- ═══════════════════════════════════════════════════════════════════════════════

-- lesson_slots에 동기화 필요 플래그 추가
ALTER TABLE lesson_slots
ADD COLUMN IF NOT EXISTS needs_calendar_sync BOOLEAN DEFAULT true;

-- 수업 변경 시 동기화 필요 플래그 설정
CREATE OR REPLACE FUNCTION flag_calendar_sync_needed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.needs_calendar_sync = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lesson_sync_flag
  BEFORE UPDATE ON lesson_slots
  FOR EACH ROW
  WHEN (
    OLD.date IS DISTINCT FROM NEW.date OR
    OLD.start_time IS DISTINCT FROM NEW.start_time OR
    OLD.end_time IS DISTINCT FROM NEW.end_time OR
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.location IS DISTINCT FROM NEW.location
  )
  EXECUTE FUNCTION flag_calendar_sync_needed();

COMMENT ON COLUMN lesson_slots.needs_calendar_sync IS '캘린더 동기화 필요 여부';
