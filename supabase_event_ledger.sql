-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS Event Ledger + V-Index 자동 계산 시스템
-- 온리쌤 앱 연동용
-- ═══════════════════════════════════════════════════════════════════════════════

-- Step 1: Event Ledger 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_ledger (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 주체
  entity_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  universal_id UUID REFERENCES universal_profiles(id) ON DELETE SET NULL,

  -- 이벤트 분류
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN ('motion', 'threat')),

  -- Physics 분류
  physics TEXT NOT NULL CHECK (physics IN ('CAPITAL', 'KNOWLEDGE', 'TIME', 'NETWORK', 'REPUTATION', 'HEALTH')),
  motion TEXT NOT NULL CHECK (motion IN ('ACQUIRE', 'SPEND', 'INVEST', 'WITHDRAW', 'LEND', 'BORROW', 'GIVE', 'RECEIVE', 'EXCHANGE', 'TRANSFORM', 'PROTECT', 'RISK')),
  domain TEXT NOT NULL CHECK (domain IN ('S', 'G', 'R', 'E')),

  -- 가치
  value DECIMAL(10, 2) NOT NULL DEFAULT 1.0,
  base_value DECIMAL(10, 2) DEFAULT 1.0,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 관계 (선택)
  related_entity_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_event_ledger_entity ON event_ledger(entity_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_universal ON event_ledger(universal_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_created ON event_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_ledger_type ON event_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_event_ledger_category ON event_ledger(event_category);

-- RLS
ALTER TABLE event_ledger ENABLE ROW LEVEL SECURITY;

-- 정책: 자신의 이벤트만 조회
DROP POLICY IF EXISTS "Users can view own events" ON event_ledger;
CREATE POLICY "Users can view own events"
  ON event_ledger FOR SELECT
  USING (
    entity_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM academy_members WHERE role IN ('owner', 'coach', 'staff')
    )
  );

-- 정책: 서비스만 삽입 가능
DROP POLICY IF EXISTS "Service role can insert events" ON event_ledger;
CREATE POLICY "Service role can insert events"
  ON event_ledger FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IN (
    SELECT user_id FROM academy_members WHERE role IN ('owner', 'coach', 'staff')
  ));

-- Step 2: Event Type Mappings
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_type_mappings (
  event_type TEXT PRIMARY KEY,
  event_category TEXT NOT NULL CHECK (event_category IN ('motion', 'threat')),
  physics TEXT NOT NULL,
  motion TEXT NOT NULL,
  domain TEXT NOT NULL,
  default_value DECIMAL(10, 2) DEFAULT 1.0,
  description TEXT
);

-- 온리쌤 기본 이벤트 타입
INSERT INTO event_type_mappings (event_type, event_category, physics, motion, domain, default_value, description) VALUES
  ('attendance', 'motion', 'TIME', 'SPEND', 'G', 1.0, '출석 체크'),
  ('absence', 'threat', 'TIME', 'RISK', 'G', 1.0, '결석'),
  ('late', 'threat', 'TIME', 'RISK', 'G', 0.5, '지각'),
  ('payment_completed', 'motion', 'CAPITAL', 'SPEND', 'S', 1.0, '결제 완료'),
  ('payment_pending', 'threat', 'CAPITAL', 'RISK', 'S', 1.0, '미납'),
  ('consultation', 'motion', 'NETWORK', 'RECEIVE', 'R', 0.5, '상담'),
  ('enrollment', 'motion', 'NETWORK', 'ACQUIRE', 'R', 2.0, '등록'),
  ('feedback_positive', 'motion', 'REPUTATION', 'ACQUIRE', 'E', 1.0, '긍정적 피드백'),
  ('feedback_negative', 'threat', 'REPUTATION', 'RISK', 'E', 0.5, '부정적 피드백'),
  ('video_upload', 'motion', 'KNOWLEDGE', 'TRANSFORM', 'E', 1.0, '영상 업로드'),
  ('class_completion', 'motion', 'KNOWLEDGE', 'ACQUIRE', 'G', 1.0, '수업 완료'),
  ('achievement', 'motion', 'REPUTATION', 'ACQUIRE', 'E', 2.0, '성취 (대회, 승급)')
ON CONFLICT (event_type) DO NOTHING;

-- Step 3: V-Index 계산 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_index_calculation AS
SELECT
  entity_id,
  universal_id,

  -- Motions (긍정적 행동)
  COALESCE(SUM(CASE WHEN event_category = 'motion' THEN value ELSE 0 END), 0) AS motions,

  -- Threats (부정적 행동)
  COALESCE(SUM(CASE WHEN event_category = 'threat' THEN value ELSE 0 END), 0) AS threats,

  -- Relations (관계 계수 - 기본 0.5)
  0.5 AS relations,

  -- Time (경과 월 수 - 최근 30일 기준, 최소 1)
  GREATEST(1, EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / (30 * 24 * 60 * 60)) AS t_months,

  -- Base (기본값 1.0)
  1.0 AS base,

  -- InteractionExponent (기본 0.10)
  0.10 AS interaction_exponent,

  -- 계산된 V-Index
  -- V = (Motions - Threats) × (1 + InteractionExponent × Relations)^t × Base
  ROUND(
    CAST(
      (
        COALESCE(SUM(CASE WHEN event_category = 'motion' THEN value ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN event_category = 'threat' THEN value ELSE 0 END), 0)
      )
      *
      POWER(
        1 + (0.10 * 0.5),
        GREATEST(1, EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / (30 * 24 * 60 * 60))
      )
      * 1.0
      AS NUMERIC
    ),
    2
  ) AS calculated_v_index,

  -- 통계
  COUNT(*) AS total_events,
  MAX(created_at) AS last_event_at

FROM event_ledger
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY entity_id, universal_id;

-- Step 4: V-Index 자동 업데이트 트리거
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_v_index_on_event()
RETURNS TRIGGER AS $$
DECLARE
  calc_v_index NUMERIC;
BEGIN
  -- universal_id가 있는 경우만 처리
  IF NEW.universal_id IS NOT NULL THEN
    -- V-Index 계산
    SELECT calculated_v_index INTO calc_v_index
    FROM v_index_calculation
    WHERE universal_id = NEW.universal_id;

    -- universal_profiles 업데이트
    UPDATE universal_profiles
    SET
      v_index = COALESCE(calc_v_index, 100),
      updated_at = NOW()
    WHERE id = NEW.universal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (기존 것 있으면 삭제 후 재생성)
DROP TRIGGER IF EXISTS trigger_update_v_index ON event_ledger;
CREATE TRIGGER trigger_update_v_index
  AFTER INSERT ON event_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_v_index_on_event();

-- Step 5: 헬퍼 함수 - 이벤트 기록
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_event(
  p_entity_id UUID,
  p_event_type TEXT,
  p_value DECIMAL DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_related_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_mapping RECORD;
  v_universal_id UUID;
  v_event_id UUID;
BEGIN
  -- 이벤트 타입 매핑 조회
  SELECT * INTO v_mapping
  FROM event_type_mappings
  WHERE event_type = p_event_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown event type: %', p_event_type;
  END IF;

  -- universal_id 조회
  SELECT universal_id INTO v_universal_id
  FROM profiles
  WHERE id = p_entity_id;

  -- 이벤트 삽입
  INSERT INTO event_ledger (
    entity_id,
    universal_id,
    event_type,
    event_category,
    physics,
    motion,
    domain,
    value,
    metadata,
    related_entity_id
  ) VALUES (
    p_entity_id,
    v_universal_id,
    p_event_type,
    v_mapping.event_category,
    v_mapping.physics,
    v_mapping.motion,
    v_mapping.domain,
    COALESCE(p_value, v_mapping.default_value),
    p_metadata,
    p_related_entity_id
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: 테스트 데이터 (선택사항)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 김민준 학생의 테스트 이벤트 (실제 사용 시 주석 해제)
/*
DO $$
DECLARE
  student_id UUID;
BEGIN
  -- 김민준 학생 ID 조회
  SELECT id INTO student_id FROM profiles WHERE name = '오은우' AND type = 'student' LIMIT 1;

  IF student_id IS NOT NULL THEN
    -- 출석 12회
    FOR i IN 1..12 LOOP
      PERFORM log_event(student_id, 'attendance', 1.0, jsonb_build_object('day', i));
    END LOOP;

    -- 결제 완료 1회
    PERFORM log_event(student_id, 'payment_completed', 1.0, jsonb_build_object('amount', 150000));

    RAISE NOTICE '테스트 이벤트 생성 완료: % (% events)', student_id, 13;
  ELSE
    RAISE NOTICE '학생을 찾을 수 없습니다';
  END IF;
END $$;
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- 완료!
-- ═══════════════════════════════════════════════════════════════════════════════

-- 확인 쿼리
SELECT
  p.name,
  p.phone,
  vc.motions,
  vc.threats,
  vc.calculated_v_index,
  vc.total_events,
  up.v_index AS current_v_index
FROM profiles p
LEFT JOIN v_index_calculation vc ON p.id = vc.entity_id
LEFT JOIN universal_profiles up ON p.universal_id = up.id
WHERE p.type = 'student'
  AND p.status = 'active'
ORDER BY vc.calculated_v_index DESC NULLS LAST
LIMIT 10;
