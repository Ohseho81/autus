-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏛️ AUTUS Database Schema
-- Supabase PostgreSQL
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================
-- 1. CORE TABLES - 핵심 테이블
-- ============================================

-- 조직 (Organization)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 (Users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- Supabase Auth ID
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        -- Internal Tiers
        'c_level',      -- Tier 1: Vision & Resource Director
        'fsd',          -- Tier 2: Judgment & Allocation Lead
        'optimus',      -- Tier 3: Execution Operator
        -- External Users
        'consumer',     -- Primary Service Consumer
        'regulatory',   -- Regulatory Participant
        'partner'       -- Partner Collaborator
    )),
    tier INTEGER CHECK (tier IN (1, 2, 3, NULL)), -- Internal: 1-3, External: NULL
    is_active BOOLEAN DEFAULT TRUE,
    approved_by UUID REFERENCES users(id), -- 상위 티어 승인자
    approved_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 승인 코드 (Approval Codes) - 상위 티어가 하위 티어에게 발급
CREATE TABLE IF NOT EXISTS approval_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    issuer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_role VARCHAR(50) NOT NULL,
    target_email VARCHAR(255), -- 특정 이메일용 (선택)
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES users(id),
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. V-ENGINE TABLES - V엔진 테이블
-- ============================================

-- V-Node (기본 단위)
CREATE TABLE IF NOT EXISTS v_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- 외부 시스템 ID
    node_type VARCHAR(50) NOT NULL CHECK (node_type IN (
        'student', 'teacher', 'class', 'product', 'service',
        'transaction', 'event', 'entity', 'metric'
    )),
    name VARCHAR(255),
    v_index DECIMAL(10, 4) DEFAULT 0, -- V 지수
    tier VARCHAR(10) CHECK (tier IN ('T1', 'T2', 'T3', 'T4', 'Ghost')),
    mint_total DECIMAL(15, 2) DEFAULT 0,
    burn_total DECIMAL(15, 2) DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- V-Flow (흐름 기록)
CREATE TABLE IF NOT EXISTS v_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    from_node_id UUID REFERENCES v_nodes(id),
    to_node_id UUID REFERENCES v_nodes(id),
    flow_type VARCHAR(50) NOT NULL CHECK (flow_type IN (
        'mint', 'burn', 'transfer', 'reward', 'penalty', 'fee'
    )),
    amount DECIMAL(15, 2) NOT NULL,
    synergy_factor DECIMAL(5, 4) DEFAULT 1.0,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    source VARCHAR(100), -- 데이터 소스 (ERP, webhook 등)
    metadata JSONB DEFAULT '{}'
);

-- V-Snapshot (일별 스냅샷)
CREATE TABLE IF NOT EXISTS v_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_v_index DECIMAL(15, 4),
    total_mint DECIMAL(15, 2),
    total_burn DECIMAL(15, 2),
    sq_value DECIMAL(15, 4), -- SQ = (Mint - Burn) / Time × Synergy
    tier_distribution JSONB, -- { T1: 5, T2: 12, T3: 45, T4: 100, Ghost: 30 }
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, snapshot_date)
);

-- ============================================
-- 3. C-LEVEL MODULE TABLES - C레벨 모듈
-- ============================================

-- 전략적 결정 (Strategic Decisions)
CREATE TABLE IF NOT EXISTS strategic_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    decision_type VARCHAR(50) NOT NULL CHECK (decision_type IN (
        'fight', 'absorb', 'ignore', -- 외부 영향 대응
        'invest', 'divest', 'hold',  -- 자원 배분
        'pivot', 'expand', 'contract' -- 전략 방향
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_entity VARCHAR(255), -- 대상 (경쟁사, 시장 등)
    impact_score DECIMAL(5, 2), -- 영향도 0-100
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'executed', 'cancelled'
    )),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자원 배분 (Resource Allocation)
CREATE TABLE IF NOT EXISTS resource_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    allocation_type VARCHAR(50) NOT NULL CHECK (allocation_type IN (
        'budget', 'headcount', 'equipment', 'time', 'attention'
    )),
    department VARCHAR(100),
    amount DECIMAL(15, 2),
    period_start DATE,
    period_end DATE,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    status VARCHAR(20) DEFAULT 'planned',
    approved_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. FSD MODULE TABLES - FSD 모듈 (판단/배분)
-- ============================================

-- 시장 분석 (Market Analysis) - Ecosystem Observer 흡수
CREATE TABLE IF NOT EXISTS market_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN (
        'competitor', 'trend', 'community', 'regulation', 'technology'
    )),
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    sentiment_score DECIMAL(5, 4), -- -1 to 1
    confidence_score DECIMAL(5, 4), -- 0 to 1
    data_sources JSONB DEFAULT '[]',
    insights JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 투자자/자본 판단 (Capital Judgment) - Capital & Pressure Enabler 흡수 (판단부)
CREATE TABLE IF NOT EXISTS capital_judgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    judgment_type VARCHAR(50) NOT NULL CHECK (judgment_type IN (
        'investor_demand', 'capital_flow', 'pressure_index', 'funding_round'
    )),
    entity_name VARCHAR(255),
    pressure_level INTEGER CHECK (pressure_level BETWEEN 1 AND 10),
    capital_amount DECIMAL(15, 2),
    expected_return DECIMAL(10, 4),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    assessment TEXT,
    action_required BOOLEAN DEFAULT FALSE,
    deadline TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 리스크 예측 (Risk Predictions)
CREATE TABLE IF NOT EXISTS risk_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    risk_type VARCHAR(50) NOT NULL CHECK (risk_type IN (
        'churn', 'turnover', 'financial', 'operational', 'regulatory', 'reputational'
    )),
    target_entity VARCHAR(255),
    target_node_id UUID REFERENCES v_nodes(id),
    probability DECIMAL(5, 4), -- 0 to 1
    impact_score DECIMAL(5, 2), -- 0 to 100
    predicted_date DATE,
    early_indicators JSONB DEFAULT '[]',
    mitigation_actions JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'mitigated', 'realized', 'expired'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. OPTIMUS MODULE TABLES - 옵티머스 모듈 (실행)
-- ============================================

-- 여론/위기 대응 (Public Opinion & Crisis) - Opinion Shaper 흡수
CREATE TABLE IF NOT EXISTS crisis_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    crisis_type VARCHAR(50) NOT NULL CHECK (crisis_type IN (
        'negative_review', 'social_media', 'news_article', 'complaint', 
        'legal_issue', 'pr_crisis', 'misinformation'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN (
        'low', 'medium', 'high', 'critical'
    )),
    source VARCHAR(255),
    source_url TEXT,
    original_content TEXT,
    sentiment_score DECIMAL(5, 4),
    reach_estimate INTEGER, -- 영향 범위 추정
    response_status VARCHAR(20) DEFAULT 'pending' CHECK (response_status IN (
        'pending', 'analyzing', 'drafting', 'reviewing', 'responded', 'monitoring', 'resolved'
    )),
    response_content TEXT,
    response_channel VARCHAR(100),
    responded_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    outcome VARCHAR(20) CHECK (outcome IN (
        'positive', 'neutral', 'negative', 'escalated'
    )),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CSR/사회적 영향 (CSR & Social Impact) - Indirect Affected Party 흡수
CREATE TABLE IF NOT EXISTS csr_initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    initiative_type VARCHAR(50) NOT NULL CHECK (initiative_type IN (
        'community_support', 'environmental', 'education', 'health',
        'disaster_relief', 'volunteer', 'donation', 'partnership'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_community VARCHAR(255),
    budget DECIMAL(15, 2),
    impact_metrics JSONB DEFAULT '{}',
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN (
        'planned', 'active', 'completed', 'cancelled'
    )),
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN (
        'internal', 'public', 'stakeholders'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IR 실행 (Investor Relations Execution) - Capital & Pressure Enabler 흡수 (실행부)
CREATE TABLE IF NOT EXISTS ir_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN (
        'quarterly_report', 'annual_report', 'press_release', 
        'investor_meeting', 'earnings_call', 'ad_hoc_update'
    )),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    target_audience JSONB DEFAULT '[]', -- ['investors', 'analysts', 'media']
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'review', 'approved', 'published', 'archived'
    )),
    engagement_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 실행 큐 (Execution Queue) - KRATON Teams
CREATE TABLE IF NOT EXISTS execution_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    assigned_team VARCHAR(50) CHECK (assigned_team IN (
        'kraton_alpha', 'kraton_beta', 'kraton_gamma', 'kraton_delta', 'kraton_omega'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source_module VARCHAR(50), -- 'fsd_judgment', 'c_level_decision', 'auto_trigger'
    source_id UUID,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN (
        'queued', 'assigned', 'in_progress', 'review', 'completed', 'failed', 'cancelled'
    )),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    results JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. EXTERNAL USER TABLES - 외부 이용자 테이블
-- ============================================

-- 서비스 소비자 (Primary Service Consumer)
CREATE TABLE IF NOT EXISTS consumer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    consumer_type VARCHAR(50) CHECK (consumer_type IN (
        'student', 'parent', 'individual', 'business'
    )),
    v_node_id UUID REFERENCES v_nodes(id),
    subscription_plan VARCHAR(50),
    subscription_status VARCHAR(20) DEFAULT 'active',
    total_spent DECIMAL(15, 2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 규제 참여자 (Regulatory Participant)
CREATE TABLE IF NOT EXISTS regulatory_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- 담당자
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN (
        'permit', 'license', 'certification', 'inspection', 
        'compliance_report', 'audit', 'violation', 'fine'
    )),
    issuing_authority VARCHAR(255),
    reference_number VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'expired', 'renewed', 'revoked'
    )),
    issued_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    documents JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 파트너 협력자 (Partner Collaborator)
CREATE TABLE IF NOT EXISTS partner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    partner_type VARCHAR(50) CHECK (partner_type IN (
        'supplier', 'distributor', 'technology', 'marketing', 'consulting'
    )),
    company_name VARCHAR(255),
    contract_status VARCHAR(20) DEFAULT 'active',
    contract_start DATE,
    contract_end DATE,
    transaction_volume DECIMAL(15, 2) DEFAULT 0,
    performance_score DECIMAL(5, 2),
    api_key VARCHAR(255) UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. INTEGRATION TABLES - 통합 테이블
-- ============================================

-- ERP 동기화 기록
CREATE TABLE IF NOT EXISTS erp_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    erp_type VARCHAR(50) NOT NULL, -- 'naver_smartstore', 'coupang', 'shopify', etc.
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN (
        'full', 'incremental', 'webhook'
    )),
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN (
        'running', 'completed', 'failed', 'partial'
    )),
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Webhook 이벤트
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL, -- 'stripe', 'toss', 'shopify', etc.
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'alert', 'warning', 'info', 'success', 'action_required'
    )),
    channel VARCHAR(50) NOT NULL CHECK (channel IN (
        'in_app', 'email', 'sms', 'slack', 'kakao'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. INDEXES - 인덱스
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- V-Nodes
CREATE INDEX IF NOT EXISTS idx_v_nodes_org ON v_nodes(organization_id);
CREATE INDEX IF NOT EXISTS idx_v_nodes_type ON v_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_v_nodes_tier ON v_nodes(tier);
CREATE INDEX IF NOT EXISTS idx_v_nodes_external ON v_nodes(external_id);

-- V-Flows
CREATE INDEX IF NOT EXISTS idx_v_flows_org ON v_flows(organization_id);
CREATE INDEX IF NOT EXISTS idx_v_flows_from ON v_flows(from_node_id);
CREATE INDEX IF NOT EXISTS idx_v_flows_to ON v_flows(to_node_id);
CREATE INDEX IF NOT EXISTS idx_v_flows_time ON v_flows(timestamp);

-- Risk Predictions
CREATE INDEX IF NOT EXISTS idx_risk_org ON risk_predictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_type ON risk_predictions(risk_type);
CREATE INDEX IF NOT EXISTS idx_risk_status ON risk_predictions(status);

-- Execution Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_org ON execution_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON execution_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON execution_tasks(assigned_team);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS) - 행 수준 보안
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (예시 - 조직별 접근 제어)
CREATE POLICY org_isolation ON users
    FOR ALL USING (organization_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation ON v_nodes
    FOR ALL USING (organization_id = current_setting('app.current_org_id')::uuid);

-- ============================================
-- 10. FUNCTIONS - 함수
-- ============================================

-- V-Index 계산 함수
CREATE OR REPLACE FUNCTION calculate_v_index(node_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    mint_val DECIMAL;
    burn_val DECIMAL;
    synergy DECIMAL;
    time_factor DECIMAL;
    v_result DECIMAL;
BEGIN
    SELECT mint_total, burn_total INTO mint_val, burn_val
    FROM v_nodes WHERE id = node_id;
    
    -- V = (M - T) × (1 + s)^t
    synergy := 1.05; -- 기본 시너지 팩터
    time_factor := 1.0;
    v_result := (mint_val - burn_val) * POWER(synergy, time_factor);
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- SQ 계산 함수
CREATE OR REPLACE FUNCTION calculate_sq(org_id UUID, days INTEGER DEFAULT 30)
RETURNS DECIMAL AS $$
DECLARE
    total_mint DECIMAL;
    total_burn DECIMAL;
    synergy_avg DECIMAL;
    sq_result DECIMAL;
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN flow_type = 'mint' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN flow_type = 'burn' THEN amount ELSE 0 END), 0),
        COALESCE(AVG(synergy_factor), 1.0)
    INTO total_mint, total_burn, synergy_avg
    FROM v_flows
    WHERE organization_id = org_id
      AND timestamp > NOW() - (days || ' days')::interval;
    
    -- SQ = (Mint - Burn) / Time × Synergy_Factor
    sq_result := ((total_mint - total_burn) / days) * synergy_avg;
    
    RETURN sq_result;
END;
$$ LANGUAGE plpgsql;

-- 티어 자동 분류 함수
CREATE OR REPLACE FUNCTION classify_tier(v_index DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
    IF v_index >= 1000 THEN RETURN 'T1';
    ELSIF v_index >= 500 THEN RETURN 'T2';
    ELSIF v_index >= 100 THEN RETURN 'T3';
    ELSIF v_index >= 0 THEN RETURN 'T4';
    ELSE RETURN 'Ghost';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. TRIGGERS - 트리거
-- ============================================

-- V-Node 업데이트 시 V-Index 재계산
CREATE OR REPLACE FUNCTION update_v_node_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW.v_index := calculate_v_index(NEW.id);
    NEW.tier := classify_tier(NEW.v_index);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_v_index
    BEFORE UPDATE OF mint_total, burn_total ON v_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_v_node_index();

-- Updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_decisions_updated BEFORE UPDATE ON strategic_decisions FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON execution_tasks FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
