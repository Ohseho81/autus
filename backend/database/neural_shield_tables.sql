-- ═══════════════════════════════════════════════════════════════════════════
-- 🧠 KRATON Neural Pipeline & Active Shield Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================
-- 1. Neural Pipeline Tables
-- ============================================

-- 상호작용 로그 (원본 데이터 + 벡터화 결과)
CREATE TABLE IF NOT EXISTS interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_pair_id TEXT NOT NULL,
    source_node UUID NOT NULL,
    target_node UUID NOT NULL,
    interaction_type TEXT NOT NULL,
    raw_content TEXT,
    sentiment_score DECIMAL(5,2),
    tags TEXT[] DEFAULT '{}',
    vectorized_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interaction_logs_target ON interaction_logs(target_node);
CREATE INDEX idx_interaction_logs_created ON interaction_logs(created_at DESC);

-- 물리 메트릭 (실시간 Physics 변수)
CREATE TABLE IF NOT EXISTS physics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID UNIQUE NOT NULL,
    s_index DECIMAL(5,2) DEFAULT 50,
    m_score DECIMAL(5,2) DEFAULT 50,
    v_value DECIMAL(15,2) DEFAULT 0,
    bond_strength DECIMAL(5,2) DEFAULT 50,
    risk_indicators TEXT[] DEFAULT '{}',
    mint_total DECIMAL(15,2) DEFAULT 0,
    tax_total DECIMAL(15,2) DEFAULT 0,
    tenure_months INTEGER DEFAULT 0,
    last_interaction TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_physics_metrics_node ON physics_metrics(node_id);
CREATE INDEX idx_physics_metrics_risk ON physics_metrics(s_index) WHERE s_index < 40;

-- ============================================
-- 2. Active Shield Tables
-- ============================================

-- 위험 큐 (FSD 판단 대기열)
CREATE TABLE IF NOT EXISTS risk_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_node UUID NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL,
    risk_indicators TEXT[] DEFAULT '{}',
    priority TEXT NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SHIELD_ACTIVATED', 'RESOLVED', 'DISMISSED')),
    analysis_summary TEXT,
    recommended_action TEXT,
    shield_activated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_queue_status ON risk_queue(status, priority);
CREATE INDEX idx_risk_queue_target ON risk_queue(target_node);

-- Safety Mirror 리포트
CREATE TABLE IF NOT EXISTS safety_mirror_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    parent_id UUID,
    report_type TEXT NOT NULL DEFAULT 'growth_report',
    report_content JSONB NOT NULL,
    trigger_source TEXT,
    risk_score DECIMAL(5,2),
    risk_priority TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_mirror_student ON safety_mirror_reports(student_id);
CREATE INDEX idx_safety_mirror_unread ON safety_mirror_reports(student_id) WHERE read_at IS NULL;

-- Shield 활성화 로그
CREATE TABLE IF NOT EXISTS shield_activation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL,
    priority TEXT NOT NULL,
    report_generated JSONB,
    notification_method TEXT,
    push_result JSONB,
    activated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shield_logs_node ON shield_activation_logs(node_id);
CREATE INDEX idx_shield_logs_activated ON shield_activation_logs(activated_at DESC);

-- ============================================
-- 3. Global V-Consolidation Tables
-- ============================================

-- 글로벌 통합 결과
CREATE TABLE IF NOT EXISTS global_consolidation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    korea_v_index DECIMAL(15,2),
    philippines_v_index DECIMAL(15,2),
    consolidated_v DECIMAL(15,2),
    compounded_v DECIMAL(15,2),
    synergy_factor DECIMAL(5,4),
    exit_value DECIMAL(15,2),
    growth_trajectory TEXT,
    reinvestment_capacity DECIMAL(15,2),
    full_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consolidation_created ON global_consolidation(created_at DESC);

-- Owner Console 상태 (실시간 업데이트용)
CREATE TABLE IF NOT EXISTS owner_console_state (
    id TEXT PRIMARY KEY,
    consolidated_v DECIMAL(15,2),
    compounded_v DECIMAL(15,2),
    exit_value DECIMAL(15,2),
    growth_trajectory TEXT,
    additional_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 재무 트랜잭션 (원본 데이터)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region TEXT NOT NULL CHECK (region IN ('korea', 'philippines')),
    node_id UUID,
    type TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KRW',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_region ON financial_transactions(region);
CREATE INDEX idx_financial_type ON financial_transactions(type);
CREATE INDEX idx_financial_created ON financial_transactions(created_at DESC);

-- 통합 로그
CREATE TABLE IF NOT EXISTS consolidation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consolidated_v DECIMAL(15,2),
    compounded_v DECIMAL(15,2),
    exit_value DECIMAL(15,2),
    growth_trajectory TEXT,
    synergy_factor DECIMAL(5,4),
    alerts JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. Realtime Triggers
-- ============================================

-- physics_metrics 변경 시 risk_queue 자동 체크
CREATE OR REPLACE FUNCTION check_risk_on_metrics_update()
RETURNS TRIGGER AS $$
BEGIN
    -- s_index가 40 미만으로 떨어지면 자동으로 risk_queue에 추가
    IF NEW.s_index < 40 AND (OLD.s_index IS NULL OR OLD.s_index >= 40) THEN
        INSERT INTO risk_queue (target_node, risk_score, priority, status, analysis_summary)
        VALUES (
            NEW.node_id,
            100 - NEW.s_index,
            CASE 
                WHEN NEW.s_index < 20 THEN 'CRITICAL'
                WHEN NEW.s_index < 30 THEN 'HIGH'
                ELSE 'MEDIUM'
            END,
            'OPEN',
            'Auto-detected: s_index dropped below threshold'
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_risk_check
    AFTER INSERT OR UPDATE ON physics_metrics
    FOR EACH ROW
    EXECUTE FUNCTION check_risk_on_metrics_update();

-- V-Index 자동 계산
CREATE OR REPLACE FUNCTION calculate_v_index()
RETURNS TRIGGER AS $$
BEGIN
    -- V = (M - T) × (1 + s)^t
    NEW.v_value := (NEW.mint_total - NEW.tax_total) * POWER(1 + NEW.s_index / 100, NEW.tenure_months / 12.0);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_v_calculation
    BEFORE INSERT OR UPDATE ON physics_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_v_index();

-- ============================================
-- 5. RLS Policies
-- ============================================

ALTER TABLE interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE physics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_mirror_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shield_activation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_consolidation ENABLE ROW LEVEL SECURITY;

-- Service role은 모든 접근 허용
CREATE POLICY "Service role full access" ON interaction_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON physics_metrics FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON risk_queue FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON safety_mirror_reports FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON shield_activation_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON global_consolidation FOR ALL TO service_role USING (true);

-- ============================================
-- 6. Views for Dashboard
-- ============================================

-- 실시간 리스크 현황
CREATE OR REPLACE VIEW v_risk_dashboard AS
SELECT 
    rq.id,
    rq.target_node,
    rq.risk_score,
    rq.priority,
    rq.status,
    rq.analysis_summary,
    pm.s_index,
    pm.m_score,
    pm.v_value,
    rq.created_at,
    EXTRACT(EPOCH FROM (NOW() - rq.created_at)) / 3600 as hours_open
FROM risk_queue rq
LEFT JOIN physics_metrics pm ON rq.target_node = pm.node_id
WHERE rq.status IN ('OPEN', 'SHIELD_ACTIVATED')
ORDER BY 
    CASE rq.priority 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
    END,
    rq.created_at DESC;

-- 글로벌 V-Index 추이
CREATE OR REPLACE VIEW v_global_trend AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    AVG(consolidated_v) as avg_consolidated_v,
    AVG(compounded_v) as avg_compounded_v,
    AVG(synergy_factor) as avg_synergy,
    MAX(exit_value) as max_exit_value
FROM global_consolidation
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
