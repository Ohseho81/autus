-- ═══════════════════════════════════════════════════════════════════════════
-- AUTUS 2.0 DATABASE SCHEMA - 11개 뷰 전체 지원
-- Supabase PostgreSQL
-- ═══════════════════════════════════════════════════════════════════════════

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CORE TABLES (핵심 테이블)
-- ═══════════════════════════════════════════════════════════════════════════

-- 조직 (학원, 식당, 헬스장 등)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    industry VARCHAR(50) NOT NULL DEFAULT 'academy',
    config JSONB DEFAULT '{}',
    location JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 (역할: owner, operator, executor, supporter, payer, receiver)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 고객 (학생, 회원, 단골 등)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    grade VARCHAR(20),
    class VARCHAR(50),
    stage VARCHAR(20) DEFAULT 'new',
    executor_id UUID REFERENCES users(id),
    payer_id UUID REFERENCES users(id),
    location JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TEMPERATURE & TSEL (온도 및 관계지수)
-- ═══════════════════════════════════════════════════════════════════════════

-- 고객 온도 (현재 상태)
CREATE TABLE IF NOT EXISTS customer_temperatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    temperature DECIMAL(5,2) NOT NULL,
    zone VARCHAR(20) NOT NULL,
    trend VARCHAR(20) DEFAULT 'stable',
    trend_value DECIMAL(5,2) DEFAULT 0,
    trust_score DECIMAL(5,2) DEFAULT 50,
    satisfaction_score DECIMAL(5,2) DEFAULT 50,
    engagement_score DECIMAL(5,2) DEFAULT 50,
    loyalty_score DECIMAL(5,2) DEFAULT 50,
    r_score DECIMAL(5,2) GENERATED ALWAYS AS (
        trust_score * 0.25 + satisfaction_score * 0.30 + 
        engagement_score * 0.25 + loyalty_score * 0.20
    ) STORED,
    sigma_total DECIMAL(4,3) DEFAULT 1.0,
    sigma_internal DECIMAL(4,3) DEFAULT 1.0,
    sigma_voice DECIMAL(4,3) DEFAULT 1.0,
    sigma_external DECIMAL(4,3) DEFAULT 1.0,
    churn_probability DECIMAL(4,3) DEFAULT 0,
    churn_predicted_date DATE,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- 온도 히스토리
CREATE TABLE IF NOT EXISTS temperature_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    temperature DECIMAL(5,2) NOT NULL,
    zone VARCHAR(20) NOT NULL,
    r_score DECIMAL(5,2),
    sigma_total DECIMAL(4,3),
    event_type VARCHAR(50),
    event_description TEXT,
    temp_change DECIMAL(5,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- TSEL 상세 요인
CREATE TABLE IF NOT EXISTS tsel_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    dimension VARCHAR(1) NOT NULL,
    factor_name VARCHAR(100) NOT NULL,
    factor_key VARCHAR(50) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'neutral',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- σ 영향 요인
CREATE TABLE IF NOT EXISTS sigma_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    source VARCHAR(20) NOT NULL,
    factor_name VARCHAR(100) NOT NULL,
    impact DECIMAL(4,3) NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. VOICE (고객 소리)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    stage VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    channel VARCHAR(20) DEFAULT 'direct',
    sentiment DECIMAL(4,3) DEFAULT 0,
    keywords JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    temperature_impact DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. EXTERNAL (외부 환경)
-- ═══════════════════════════════════════════════════════════════════════════

-- 경쟁사
CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location JSONB DEFAULT '{}',
    threat_level VARCHAR(20) DEFAULT 'medium',
    metrics JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 외부 이벤트 (날씨 뷰용)
CREATE TABLE IF NOT EXISTS external_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(200) NOT NULL,
    description TEXT,
    sigma_impact DECIMAL(4,3) DEFAULT 0,
    affected_customers JSONB DEFAULT '[]',
    source VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 외부 여론 (심전도 뷰용)
CREATE TABLE IF NOT EXISTS external_sentiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    mention_count INTEGER DEFAULT 0,
    sentiment DECIMAL(4,3) DEFAULT 0,
    trend VARCHAR(20) DEFAULT 'stable',
    source VARCHAR(50),
    source_url TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ALERTS & ACTIONS (알림 및 액션)
-- ═══════════════════════════════════════════════════════════════════════════

-- 알림
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    level VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    related_type VARCHAR(50),
    related_id UUID,
    status VARCHAR(20) DEFAULT 'active',
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 액션 (할일)
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    alert_id UUID REFERENCES alerts(id),
    priority INTEGER DEFAULT 3,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    context TEXT,
    assignee_id UUID REFERENCES users(id),
    due_date DATE,
    strategy_name VARCHAR(100),
    strategy_reasoning TEXT,
    expected_effect JSONB DEFAULT '{}',
    tips JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    result_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. NETWORK (관계망)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    from_customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    to_customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    strength DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_customer_id, to_customer_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. FUNNEL (퍼널)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    stage VARCHAR(50) NOT NULL,
    source VARCHAR(50),
    converted_to_customer_id UUID REFERENCES customers(id),
    converted_at TIMESTAMPTZ,
    dropped_at TIMESTAMPTZ,
    drop_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. CRYSTAL (시뮬레이션)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    params JSONB NOT NULL,
    predicted_customers INTEGER,
    predicted_revenue DECIMAL(12,2),
    predicted_churn_rate DECIMAL(4,3),
    is_recommended BOOLEAN DEFAULT FALSE,
    recommendation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    simulated_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. ORGANIZATION STATS (조직 통계 - 조종석용)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organization_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    total_customers INTEGER DEFAULT 0,
    healthy_customers INTEGER DEFAULT 0,
    warning_customers INTEGER DEFAULT 0,
    risk_customers INTEGER DEFAULT 0,
    avg_temperature DECIMAL(5,2) DEFAULT 50,
    sigma_external DECIMAL(4,3) DEFAULT 1.0,
    pending_consultations INTEGER DEFAULT 0,
    unresolved_voices INTEGER DEFAULT 0,
    pending_tasks INTEGER DEFAULT 0,
    status_level VARCHAR(20) DEFAULT 'normal',
    status_label VARCHAR(50) DEFAULT '양호',
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES (인덱스)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_executor ON customers(executor_id);
CREATE INDEX IF NOT EXISTS idx_customer_temperatures_customer ON customer_temperatures(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_temperatures_zone ON customer_temperatures(zone);
CREATE INDEX IF NOT EXISTS idx_temperature_history_customer ON temperature_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_temperature_history_recorded ON temperature_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_voices_org ON voices(org_id);
CREATE INDEX IF NOT EXISTS idx_voices_customer ON voices(customer_id);
CREATE INDEX IF NOT EXISTS idx_voices_status ON voices(status);
CREATE INDEX IF NOT EXISTS idx_alerts_org ON alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_actions_org ON actions(org_id);
CREATE INDEX IF NOT EXISTS idx_actions_assignee ON actions(assignee_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_external_events_org_date ON external_events(org_id, event_date);
CREATE INDEX IF NOT EXISTS idx_external_sentiments_org ON external_sentiments(org_id);
CREATE INDEX IF NOT EXISTS idx_competitors_org ON competitors(org_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (행 수준 보안)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_temperatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS (함수)
-- ═══════════════════════════════════════════════════════════════════════════

-- 온도 구간 계산
CREATE OR REPLACE FUNCTION get_temperature_zone(temp DECIMAL)
RETURNS VARCHAR(20) AS $$
BEGIN
    IF temp < 30 THEN RETURN 'critical';
    ELSIF temp < 50 THEN RETURN 'warning';
    ELSIF temp < 70 THEN RETURN 'normal';
    ELSIF temp < 85 THEN RETURN 'good';
    ELSE RETURN 'excellent';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 조직 통계 업데이트
CREATE OR REPLACE FUNCTION update_organization_stats(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO organization_stats (org_id, total_customers, healthy_customers, warning_customers, risk_customers, avg_temperature, pending_consultations, unresolved_voices, pending_tasks, status_level, status_label)
    SELECT 
        p_org_id,
        COUNT(DISTINCT c.id),
        COUNT(DISTINCT c.id) FILTER (WHERE ct.zone IN ('normal', 'good', 'excellent')),
        COUNT(DISTINCT c.id) FILTER (WHERE ct.zone = 'warning'),
        COUNT(DISTINCT c.id) FILTER (WHERE ct.zone = 'critical'),
        COALESCE(AVG(ct.temperature), 50),
        (SELECT COUNT(*) FROM actions WHERE org_id = p_org_id AND status = 'pending' AND strategy_name IS NOT NULL),
        (SELECT COUNT(*) FROM voices WHERE org_id = p_org_id AND status = 'pending'),
        (SELECT COUNT(*) FROM actions WHERE org_id = p_org_id AND status = 'pending'),
        CASE 
            WHEN COUNT(DISTINCT c.id) FILTER (WHERE ct.zone = 'critical') > 0 THEN 'red'
            WHEN COUNT(DISTINCT c.id) FILTER (WHERE ct.zone = 'warning') > 3 THEN 'yellow'
            ELSE 'green'
        END,
        CASE 
            WHEN COUNT(DISTINCT c.id) FILTER (WHERE ct.zone = 'critical') > 0 THEN '위험'
            WHEN COUNT(DISTINCT c.id) FILTER (WHERE ct.zone = 'warning') > 3 THEN '주의 필요'
            ELSE '양호'
        END
    FROM customers c
    LEFT JOIN customer_temperatures ct ON c.id = ct.customer_id
    WHERE c.org_id = p_org_id
    ON CONFLICT (org_id) DO UPDATE SET
        total_customers = EXCLUDED.total_customers,
        healthy_customers = EXCLUDED.healthy_customers,
        warning_customers = EXCLUDED.warning_customers,
        risk_customers = EXCLUDED.risk_customers,
        avg_temperature = EXCLUDED.avg_temperature,
        pending_consultations = EXCLUDED.pending_consultations,
        unresolved_voices = EXCLUDED.unresolved_voices,
        pending_tasks = EXCLUDED.pending_tasks,
        status_level = EXCLUDED.status_level,
        status_label = EXCLUDED.status_label,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS (트리거)
-- ═══════════════════════════════════════════════════════════════════════════

-- 온도 변경 시 히스토리 기록
CREATE OR REPLACE FUNCTION log_temperature_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.temperature IS DISTINCT FROM NEW.temperature THEN
        INSERT INTO temperature_history (customer_id, temperature, zone, r_score, sigma_total, temp_change)
        VALUES (NEW.customer_id, NEW.temperature, NEW.zone, NEW.r_score, NEW.sigma_total, NEW.temperature - OLD.temperature);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_temperature_change ON customer_temperatures;
CREATE TRIGGER trigger_log_temperature_change
    AFTER UPDATE ON customer_temperatures
    FOR EACH ROW EXECUTE FUNCTION log_temperature_change();

-- updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_organizations ON organizations;
DROP TRIGGER IF EXISTS trigger_update_users ON users;
DROP TRIGGER IF EXISTS trigger_update_customers ON customers;
DROP TRIGGER IF EXISTS trigger_update_voices ON voices;
DROP TRIGGER IF EXISTS trigger_update_actions ON actions;

CREATE TRIGGER trigger_update_organizations BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_voices BEFORE UPDATE ON voices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_actions BEFORE UPDATE ON actions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
