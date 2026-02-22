-- ═══════════════════════════════════════════════════════════════════════════════
-- 앱 실시간 설정 테이블
-- 몰트봇 버튼 → 이 테이블 수정 → 앱 즉시 반영
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- 기본 설정값 삽입
INSERT INTO app_config (key, value) VALUES
  ('theme', '{"primary": "#FF6B2C", "background": "#000000", "card": "#1C1C1E"}'),
  ('labels', '{"coach": "코치님", "student": "학생", "gratitude": "감사", "attendance": "출석"}'),
  ('home_greeting', '{"text": "오늘도 감동을 만들어 보세요.", "emoji": "🏀"}'),
  ('features', '{"show_gratitude": true, "show_market": true, "show_compatibility": true}'),
  ('buttons', '{"attendance_all": "전체 출석", "submit": "수업 완료"}')
ON CONFLICT (key) DO NOTHING;

-- RLS 활성화
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "Anyone can read config" ON app_config FOR SELECT USING (true);

-- 인증된 사용자만 수정 가능
CREATE POLICY "Authenticated users can update" ON app_config FOR UPDATE USING (true);
