-- ============================================
-- AUTUS Core v1 - System of Learning (SoL)
-- 기존 SaaS 위에 레이어링되는 학습 시스템
-- ============================================

-- ============================================
-- 1. FACT 테이블 (자동, 원장급) - APPEND ONLY
-- ============================================

-- 결제 Fact
CREATE TABLE IF NOT EXISTS autus_fact_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,                    -- 'allthatbasket', 'groton'
    external_id TEXT,                       -- SoR 시스템 ID
    member_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'refunded')),
    payment_method TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'webhook'  -- 'webhook', 'manual_import'
);

-- 출석/방문 Fact
CREATE TABLE IF NOT EXISTS autus_fact_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,
    external_id TEXT,
    member_id UUID NOT NULL,
    location_id UUID,
    class_id UUID,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    check_in_method TEXT CHECK (check_in_method IN ('qr', 'nfc', 'manual', 'auto')),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'webhook'
);

-- 수업/세션 Fact
CREATE TABLE IF NOT EXISTS autus_fact_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,
    external_id TEXT,
    class_id UUID NOT NULL,
    instructor_id UUID,
    status TEXT NOT NULL CHECK (status IN ('started', 'ended', 'cancelled')),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'webhook'
);

-- 등록/해지 Fact
CREATE TABLE IF NOT EXISTS autus_fact_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,
    external_id TEXT,
    member_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('registered', 'cancelled', 'paused', 'resumed')),
    reason TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'webhook'
);

-- ============================================
-- 2. INTERVENTION 테이블 (사람 개입) - APPEND ONLY
-- ============================================

CREATE TABLE IF NOT EXISTS autus_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,

    -- 누가
    actor_id UUID NOT NULL,
    actor_role TEXT NOT NULL,               -- 'owner', 'manager', 'instructor'

    -- 무엇을
    action_type TEXT NOT NULL CHECK (action_type IN (
        'reminder_sent',                    -- 리마인드 발송
        'makeup_assigned',                  -- 보강 배정
        'discount_approved',                -- 할인 승인
        'refund_approved',                  -- 환불 승인
        'instructor_changed',               -- 강사/트레이너 교체
        'exception_allowed',                -- 예외 허용
        'exception_denied',                 -- 예외 거절
        'manual_override',                  -- 수동 오버라이드
        'outbound_call',                    -- 아웃바운드 전화
        'custom_message'                    -- 커스텀 메시지
    )),

    -- 대상
    target_type TEXT NOT NULL,              -- 'member', 'class', 'payment'
    target_id UUID NOT NULL,

    -- 컨텍스트 (JSON, 설명 없음)
    context JSONB DEFAULT '{}',

    -- 시간
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. OUTCOME 테이블 (평가) - APPEND ONLY
-- ============================================

CREATE TABLE IF NOT EXISTS autus_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,

    -- 연결
    intervention_id UUID REFERENCES autus_interventions(id),
    member_id UUID NOT NULL,

    -- 결과
    outcome_type TEXT NOT NULL CHECK (outcome_type IN (
        'retained',                         -- 유지
        'churned',                          -- 이탈
        'payment_recovered',                -- 결제 회복
        'payment_failed',                   -- 결제 실패
        'attendance_recovered',             -- 출석 회복
        'attendance_failed'                 -- 출석 미회복
    )),

    -- 측정
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    measurement_window_days INTEGER DEFAULT 30,

    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. APPROVAL CARD 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS autus_approval_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,

    -- 요청
    requested_by TEXT NOT NULL,             -- 'system', 'moltbot', actor_id
    request_type TEXT NOT NULL CHECK (request_type IN (
        'discount',                         -- 할인
        'refund',                           -- 환불
        'instructor_change',                -- 강사 교체
        'policy_exception',                 -- 정책 예외
        'rule_promotion'                    -- 규칙 승급 (Shadow → Auto)
    )),

    -- 대상
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,

    -- 컨텍스트
    context JSONB DEFAULT '{}',

    -- 결정
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    decided_by UUID,
    decided_at TIMESTAMPTZ,

    -- 시간
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ============================================
-- 5. RULE 테이블 (Shadow → Auto 승급)
-- ============================================

CREATE TABLE IF NOT EXISTS autus_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,

    -- 규칙 정의
    name TEXT NOT NULL,
    trigger_condition JSONB NOT NULL,       -- 트리거 조건
    action_type TEXT NOT NULL,              -- 실행할 액션
    action_params JSONB DEFAULT '{}',

    -- 상태
    mode TEXT NOT NULL DEFAULT 'shadow' CHECK (mode IN ('shadow', 'auto', 'disabled')),
    risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),

    -- Shadow 성과
    shadow_executions INTEGER DEFAULT 0,
    shadow_matches INTEGER DEFAULT 0,       -- 사람과 일치한 횟수
    shadow_accuracy DECIMAL(5,2) DEFAULT 0,

    -- 승급 조건
    promotion_threshold DECIMAL(5,2) DEFAULT 70.00,  -- 70% 이상이면 Auto 후보
    min_shadow_executions INTEGER DEFAULT 30,

    -- Kill-switch
    kill_switch_enabled BOOLEAN DEFAULT TRUE,
    last_killed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. DERIVED STATE 뷰 (계산된 상태)
-- ============================================

CREATE OR REPLACE VIEW autus_member_state AS
SELECT
    m.member_id,
    m.brand,

    -- 결제 상태
    COALESCE(p.last_payment_status, 'unknown') as payment_status,
    p.last_payment_at,
    p.total_paid,
    p.failed_count as payment_failed_count,

    -- 출석 상태
    COALESCE(v.attendance_rate, 0) as attendance_rate,
    v.last_visit_at,
    v.consecutive_absences,

    -- 위험도 (계산)
    CASE
        WHEN v.consecutive_absences >= 3 OR p.failed_count >= 2 THEN 'critical'
        WHEN v.consecutive_absences >= 2 OR p.failed_count >= 1 THEN 'warning'
        ELSE 'normal'
    END as risk_level

FROM (
    SELECT DISTINCT member_id, brand
    FROM autus_fact_visits
    UNION
    SELECT DISTINCT member_id, brand
    FROM autus_fact_payments
) m
LEFT JOIN (
    SELECT
        member_id,
        brand,
        (SELECT status FROM autus_fact_payments p2
         WHERE p2.member_id = p.member_id AND p2.brand = p.brand
         ORDER BY occurred_at DESC LIMIT 1) as last_payment_status,
        MAX(occurred_at) as last_payment_at,
        SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as total_paid,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
    FROM autus_fact_payments p
    GROUP BY member_id, brand
) p ON m.member_id = p.member_id AND m.brand = p.brand
LEFT JOIN (
    SELECT
        member_id,
        brand,
        COUNT(CASE WHEN status = 'present' THEN 1 END)::DECIMAL /
            NULLIF(COUNT(*), 0) * 100 as attendance_rate,
        MAX(occurred_at) as last_visit_at,
        (SELECT COUNT(*) FROM autus_fact_visits v2
         WHERE v2.member_id = v.member_id
         AND v2.brand = v.brand
         AND v2.status = 'absent'
         AND v2.occurred_at > COALESCE(
             (SELECT MAX(occurred_at) FROM autus_fact_visits v3
              WHERE v3.member_id = v.member_id
              AND v3.brand = v.brand
              AND v3.status = 'present'),
             '1970-01-01'
         )
        ) as consecutive_absences
    FROM autus_fact_visits v
    GROUP BY member_id, brand
) v ON m.member_id = v.member_id AND m.brand = v.brand;

-- ============================================
-- 7. 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_fact_payments_member ON autus_fact_payments(member_id, brand);
CREATE INDEX IF NOT EXISTS idx_fact_payments_occurred ON autus_fact_payments(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fact_visits_member ON autus_fact_visits(member_id, brand);
CREATE INDEX IF NOT EXISTS idx_fact_visits_occurred ON autus_fact_visits(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_target ON autus_interventions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_interventions_actor ON autus_interventions(actor_id);
CREATE INDEX IF NOT EXISTS idx_approval_cards_status ON autus_approval_cards(status, brand);
CREATE INDEX IF NOT EXISTS idx_rules_mode ON autus_rules(mode, brand);

-- ============================================
-- 8. RLS (Row Level Security)
-- ============================================

ALTER TABLE autus_fact_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_fact_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_fact_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_fact_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_approval_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE autus_rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AUTUS Core v1 완료
-- 수정/삭제 없음 - Append Only
-- ============================================
