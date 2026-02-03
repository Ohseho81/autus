-- ============================================
-- AUTUS Shadow Rules v1
-- 2개의 초기 Shadow 규칙
-- ============================================

-- ============================================
-- Rule 1: 결제 실패 안내 메시지
-- 트리거: 결제 실패 발생
-- 액션: 보호자에게 안내 메시지 발송
-- 위험도: LOW (정보 제공만)
-- ============================================

INSERT INTO autus_rules (
    brand,
    name,
    trigger_condition,
    action_type,
    action_params,
    mode,
    risk_level,
    promotion_threshold,
    min_shadow_executions
) VALUES (
    'allthatbasket',
    '결제 실패 안내',
    '{
        "event_type": "payment",
        "conditions": [
            {"field": "status", "operator": "eq", "value": "failed"}
        ],
        "cooldown_hours": 24
    }'::jsonb,
    'send_notification',
    '{
        "channel": "kakao",
        "template": "payment_failed_notice",
        "recipient": "parent",
        "message_type": "info"
    }'::jsonb,
    'shadow',
    'low',
    70.00,
    30
);

-- ============================================
-- Rule 2: 연속 결석 보호자 알림
-- 트리거: 2회 연속 결석
-- 액션: 보호자에게 알림 발송
-- 위험도: LOW (정보 제공만)
-- ============================================

INSERT INTO autus_rules (
    brand,
    name,
    trigger_condition,
    action_type,
    action_params,
    mode,
    risk_level,
    promotion_threshold,
    min_shadow_executions
) VALUES (
    'allthatbasket',
    '연속 결석 알림',
    '{
        "event_type": "visit",
        "conditions": [
            {"field": "status", "operator": "eq", "value": "absent"},
            {"field": "consecutive_count", "operator": "gte", "value": 2}
        ],
        "cooldown_hours": 168
    }'::jsonb,
    'send_notification',
    '{
        "channel": "kakao",
        "template": "consecutive_absence_notice",
        "recipient": "parent",
        "message_type": "alert"
    }'::jsonb,
    'shadow',
    'low',
    70.00,
    30
);

-- ============================================
-- Shadow Rule 실행 로그 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS autus_rule_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES autus_rules(id),
    brand TEXT NOT NULL,

    -- 트리거 정보
    trigger_event_type TEXT NOT NULL,
    trigger_event_id UUID,
    target_member_id UUID NOT NULL,

    -- 실행 정보
    mode TEXT NOT NULL,                     -- 'shadow' or 'auto'
    action_type TEXT NOT NULL,
    action_params JSONB,

    -- Shadow 비교 (Shadow 모드일 때)
    predicted_action JSONB,                 -- 시스템 예측
    human_action JSONB,                     -- 사람 실제 행동
    match_result BOOLEAN,                   -- 일치 여부

    -- 결과
    execution_status TEXT DEFAULT 'pending',-- 'pending', 'executed', 'skipped', 'failed'
    execution_result JSONB,
    executed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rule_executions_rule ON autus_rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_mode ON autus_rule_executions(mode, brand);
CREATE INDEX IF NOT EXISTS idx_rule_executions_match ON autus_rule_executions(match_result) WHERE mode = 'shadow';

-- ============================================
-- Shadow 정확도 업데이트 함수
-- ============================================

CREATE OR REPLACE FUNCTION update_rule_shadow_accuracy()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mode = 'shadow' AND NEW.match_result IS NOT NULL THEN
        UPDATE autus_rules
        SET
            shadow_executions = shadow_executions + 1,
            shadow_matches = shadow_matches + CASE WHEN NEW.match_result THEN 1 ELSE 0 END,
            shadow_accuracy = (shadow_matches + CASE WHEN NEW.match_result THEN 1 ELSE 0 END)::DECIMAL /
                              NULLIF(shadow_executions + 1, 0) * 100,
            updated_at = NOW()
        WHERE id = NEW.rule_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shadow_accuracy
    AFTER INSERT ON autus_rule_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_rule_shadow_accuracy();

-- ============================================
-- Rule 승급 체크 뷰
-- ============================================

CREATE OR REPLACE VIEW autus_rules_promotion_candidates AS
SELECT
    id,
    brand,
    name,
    mode,
    risk_level,
    shadow_executions,
    shadow_matches,
    shadow_accuracy,
    promotion_threshold,
    min_shadow_executions,
    CASE
        WHEN shadow_accuracy >= promotion_threshold
         AND shadow_executions >= min_shadow_executions
         AND risk_level = 'low'
        THEN true
        ELSE false
    END as ready_for_promotion
FROM autus_rules
WHERE mode = 'shadow';

-- ============================================
-- 완료
-- Shadow Rules 2개 생성됨:
-- 1. 결제 실패 안내 (allthatbasket)
-- 2. 연속 결석 알림 (allthatbasket)
-- ============================================
