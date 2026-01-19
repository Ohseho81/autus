-- ============================================
-- AUTUS Supabase Schema v1.0
-- V = (M - T) × (1 + s)^t
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS (사용자)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Kernel Constants (상수)
    role_id TEXT NOT NULL CHECK (role_id IN ('owner', 'director', 'teacher', 'staff', 'parent', 'student')),
    affiliation_map JSONB DEFAULT '{}',  -- {academy_name, branch_name, subject, etc.}
    base_capacity INTEGER DEFAULT 0,      -- 담당 학생/자녀 수
    
    -- Kernel Indices (지수)
    pain_point_top1 TEXT,                 -- admin, churn, anxiety, etc.
    sync_orbit DECIMAL(3,2) DEFAULT 0.50, -- 0.20 ~ 0.80
    current_energy DECIMAL(3,2) DEFAULT 0.50
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_academy ON users USING GIN (affiliation_map);

-- ============================================
-- 2. ORGANISMS (유기체 - 관리 대상 엔티티)
-- ============================================
CREATE TABLE organisms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('teacher', 'student', 'parent', 'branch', 'class')),
    emoji TEXT DEFAULT '👤',
    
    -- V Formula Components
    mint DECIMAL(15,2) DEFAULT 0,        -- M: 아웃풋 가치 (월 기준)
    tax DECIMAL(15,2) DEFAULT 0,         -- T: 인풋 비용 (월 기준)
    synergy DECIMAL(5,4) DEFAULT 0.1000, -- s: 시너지 계수 (0.0000 ~ 1.0000)
    
    -- Derived Values (계산값)
    value_v DECIMAL(15,2) GENERATED ALWAYS AS ((mint - tax) * POWER(1 + synergy, 1)) STORED,
    
    -- Physics State (v2.2 Kernel)
    entropy DECIMAL(5,4) DEFAULT 0.5000,    -- 엔트로피 (0~1)
    velocity DECIMAL(5,4) DEFAULT 0.5000,   -- 속도 (0~1)
    friction DECIMAL(5,4) DEFAULT 0.3000,   -- 마찰 (0~1)
    sync_rate DECIMAL(5,4) DEFAULT 0.5000,  -- 동기화율 (0~1)
    
    -- Status
    status TEXT DEFAULT 'stable' CHECK (status IN ('urgent', 'warning', 'stable', 'opportunity')),
    urgency DECIMAL(3,2) DEFAULT 0.50,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organisms_user ON organisms(user_id);
CREATE INDEX idx_organisms_status ON organisms(status);
CREATE INDEX idx_organisms_type ON organisms(type);

-- ============================================
-- 3. ORGANISM_VITALS (바이탈 히스토리)
-- ============================================
CREATE TABLE organism_vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organism_id UUID REFERENCES organisms(id) ON DELETE CASCADE,
    
    -- Snapshot
    mint DECIMAL(15,2),
    tax DECIMAL(15,2),
    synergy DECIMAL(5,4),
    value_v DECIMAL(15,2),
    
    -- Physics
    entropy DECIMAL(5,4),
    velocity DECIMAL(5,4),
    friction DECIMAL(5,4),
    sync_rate DECIMAL(5,4),
    
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vitals_organism ON organism_vitals(organism_id);
CREATE INDEX idx_vitals_time ON organism_vitals(recorded_at DESC);

-- ============================================
-- 4. TASKS (업무 유형)
-- ============================================
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,  -- e.g., 'weekly_report', 'parent_consult'
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,        -- 'admin', 'teaching', 'communication', etc.
    
    -- Default M/T impact
    default_mint_impact DECIMAL(5,2) DEFAULT 0,
    default_tax_impact DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SOLUTIONS (솔루션)
-- ============================================
CREATE TABLE solutions (
    id TEXT PRIMARY KEY,  -- e.g., 'auto_template', 'ai_draft'
    task_id TEXT REFERENCES tasks(id),
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Expected effects
    expected_m_delta DECIMAL(5,2) DEFAULT 0,  -- M 증가율
    expected_t_delta DECIMAL(5,2) DEFAULT 0,  -- T 감소율
    expected_s_delta DECIMAL(5,4) DEFAULT 0,  -- s 증가율
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_solutions_task ON solutions(task_id);

-- ============================================
-- 6. USAGE_LOGS (활용 로그 - 합의 엔진 핵심)
-- ============================================
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    task_id TEXT REFERENCES tasks(id),
    solution_id TEXT REFERENCES solutions(id),
    user_id UUID REFERENCES users(id),
    
    -- Before state
    before_m DECIMAL(15,2),
    before_t DECIMAL(15,2),
    before_s DECIMAL(5,4),
    
    -- After state
    after_m DECIMAL(15,2),
    after_t DECIMAL(15,2),
    after_s DECIMAL(5,4),
    
    -- Computed
    effectiveness_score DECIMAL(5,4),  -- 실효성 점수 (0~1)
    v_growth DECIMAL(5,4),             -- V 증가율
    duration_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_task ON usage_logs(task_id);
CREATE INDEX idx_usage_solution ON usage_logs(solution_id);
CREATE INDEX idx_usage_user ON usage_logs(user_id);
CREATE INDEX idx_usage_time ON usage_logs(created_at DESC);

-- ============================================
-- 7. SOLUTION_STATS (솔루션 통계 - 실시간 집계)
-- ============================================
CREATE TABLE solution_stats (
    solution_id TEXT PRIMARY KEY REFERENCES solutions(id),
    task_id TEXT REFERENCES tasks(id),
    
    usage_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    
    total_score DECIMAL(10,4) DEFAULT 0,
    avg_score DECIMAL(5,4) DEFAULT 0,
    
    total_v_growth DECIMAL(10,4) DEFAULT 0,
    avg_v_growth DECIMAL(5,4) DEFAULT 0,
    
    first_used TIMESTAMPTZ,
    last_used TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. STANDARDS (표준 솔루션)
-- ============================================
CREATE TABLE standards (
    task_id TEXT PRIMARY KEY REFERENCES tasks(id),
    solution_id TEXT REFERENCES solutions(id),
    
    -- Qualification metrics
    avg_score DECIMAL(5,4),
    usage_count INTEGER,
    avg_v_growth DECIMAL(5,4),
    
    standardized_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. RETRO_PGF (분기 보상 기록)
-- ============================================
CREATE TABLE retro_pgf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    total_reward DECIMAL(15,2),
    total_contribution DECIMAL(10,4),
    participant_count INTEGER,
    
    distributions JSONB,  -- [{user_id, contribution, reward, ...}]
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_retro_period ON retro_pgf(period_start, period_end);

-- ============================================
-- 10. REWARD_CARDS (보상 카드)
-- ============================================
CREATE TABLE reward_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    
    card_type TEXT NOT NULL,  -- 'cashflow', 'churn', 'admin', etc.
    title TEXT NOT NULL,
    icon TEXT,
    
    message TEXT,
    actions JSONB,  -- [{label, type, requires_approval}]
    
    is_read BOOLEAN DEFAULT FALSE,
    is_acted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_rewards_user ON reward_cards(user_id);
CREATE INDEX idx_rewards_unread ON reward_cards(user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- 11. IMPULSE_LOGS (Impulse 액션 기록)
-- ============================================
CREATE TABLE impulse_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organism_id UUID REFERENCES organisms(id),
    user_id UUID REFERENCES users(id),
    
    impulse_type TEXT NOT NULL CHECK (impulse_type IN ('RECOVER', 'DEFRICTION', 'SHOCK_DAMP')),
    
    -- Before state
    before_entropy DECIMAL(5,4),
    before_velocity DECIMAL(5,4),
    before_friction DECIMAL(5,4),
    before_sync_rate DECIMAL(5,4),
    
    -- After state
    after_entropy DECIMAL(5,4),
    after_velocity DECIMAL(5,4),
    after_friction DECIMAL(5,4),
    after_sync_rate DECIMAL(5,4),
    
    -- Audit
    verdict TEXT CHECK (verdict IN ('GO', 'NOGO', 'PENDING')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_impulse_organism ON impulse_logs(organism_id);
CREATE INDEX idx_impulse_type ON impulse_logs(impulse_type);

-- ============================================
-- 12. CONNECTIONS (유기체 간 연결)
-- ============================================
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_organism_id UUID REFERENCES organisms(id) ON DELETE CASCADE,
    to_organism_id UUID REFERENCES organisms(id) ON DELETE CASCADE,
    
    strength DECIMAL(3,2) DEFAULT 0.50,  -- 연결 강도 (0~1)
    connection_type TEXT,                 -- 'teaches', 'parents', 'manages', etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(from_organism_id, to_organism_id)
);

CREATE INDEX idx_connections_from ON connections(from_organism_id);
CREATE INDEX idx_connections_to ON connections(to_organism_id);

-- ============================================
-- 13. GATE_WARNINGS (Gate 경고 로그)
-- ============================================
CREATE TABLE gate_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    gate_level INTEGER NOT NULL CHECK (gate_level IN (0, 1, 2)),
    warning_type TEXT NOT NULL,
    
    affected_entity_id UUID,
    affected_entity_type TEXT,
    
    message TEXT,
    estimated_impact JSONB,
    
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gate_unresolved ON gate_warnings(resolved) WHERE resolved = FALSE;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Update organism status based on physics
CREATE OR REPLACE FUNCTION update_organism_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate urgency based on entropy and sync_rate
    NEW.urgency := LEAST(1.0, GREATEST(0.0, 
        (NEW.entropy * 0.4) + 
        ((1 - NEW.sync_rate) * 0.3) + 
        (NEW.friction * 0.3)
    ));
    
    -- Determine status
    IF NEW.urgency > 0.7 THEN
        NEW.status := 'urgent';
    ELSIF NEW.urgency > 0.5 THEN
        NEW.status := 'warning';
    ELSIF NEW.sync_rate > 0.8 AND NEW.velocity > 0.6 THEN
        NEW.status := 'opportunity';
    ELSE
        NEW.status := 'stable';
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organism_status
    BEFORE UPDATE ON organisms
    FOR EACH ROW
    EXECUTE FUNCTION update_organism_status();

-- Function: Update solution stats after usage log
CREATE OR REPLACE FUNCTION update_solution_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO solution_stats (solution_id, task_id, usage_count, total_score, avg_score, 
                                total_v_growth, avg_v_growth, first_used, last_used)
    VALUES (NEW.solution_id, NEW.task_id, 1, NEW.effectiveness_score, NEW.effectiveness_score,
            NEW.v_growth, NEW.v_growth, NOW(), NOW())
    ON CONFLICT (solution_id) DO UPDATE SET
        usage_count = solution_stats.usage_count + 1,
        total_score = solution_stats.total_score + NEW.effectiveness_score,
        avg_score = (solution_stats.total_score + NEW.effectiveness_score) / (solution_stats.usage_count + 1),
        total_v_growth = solution_stats.total_v_growth + NEW.v_growth,
        avg_v_growth = (solution_stats.total_v_growth + NEW.v_growth) / (solution_stats.usage_count + 1),
        last_used = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_solution_stats
    AFTER INSERT ON usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_solution_stats();

-- Function: Check and create standard
CREATE OR REPLACE FUNCTION check_standardization()
RETURNS TRIGGER AS $$
DECLARE
    current_stats RECORD;
BEGIN
    SELECT * INTO current_stats FROM solution_stats WHERE solution_id = NEW.solution_id;
    
    -- Standard threshold: score >= 0.80, usage >= 50, v_growth >= 0.15
    IF current_stats.avg_score >= 0.80 
       AND current_stats.usage_count >= 50 
       AND current_stats.avg_v_growth >= 0.15 THEN
        
        INSERT INTO standards (task_id, solution_id, avg_score, usage_count, avg_v_growth)
        VALUES (NEW.task_id, NEW.solution_id, current_stats.avg_score, 
                current_stats.usage_count, current_stats.avg_v_growth)
        ON CONFLICT (task_id) DO UPDATE SET
            solution_id = NEW.solution_id,
            avg_score = current_stats.avg_score,
            usage_count = current_stats.usage_count,
            avg_v_growth = current_stats.avg_v_growth,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_standardization
    AFTER INSERT ON usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION check_standardization();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Default tasks
INSERT INTO tasks (id, name, category) VALUES
    ('weekly_report', '주간 보고서 작성', 'admin'),
    ('invoice_processing', '청구서 처리', 'admin'),
    ('parent_consult', '학부모 상담 일지', 'communication'),
    ('schedule_coord', '일정 조율', 'admin'),
    ('student_progress', '학생 진도 관리', 'teaching'),
    ('attendance_check', '출결 관리', 'admin'),
    ('performance_review', '성과 리뷰', 'management');

-- Default solutions
INSERT INTO solutions (id, task_id, name, expected_m_delta, expected_t_delta, expected_s_delta) VALUES
    ('auto_template', 'weekly_report', '자동 템플릿 생성', 0.10, -0.30, 0.05),
    ('ai_draft', 'weekly_report', 'AI 초안 작성', 0.25, -0.50, 0.10),
    ('manual_standard', 'weekly_report', '수동 표준 양식', 0.05, -0.10, 0.02),
    ('hybrid_assist', 'weekly_report', '하이브리드 보조', 0.20, -0.40, 0.08),
    ('auto_calc', 'invoice_processing', '자동 계산 시스템', 0.15, -0.60, 0.05),
    ('ai_summary', 'parent_consult', 'AI 상담 요약', 0.30, -0.70, 0.15),
    ('smart_schedule', 'schedule_coord', '스마트 일정 조율', 0.10, -0.50, 0.10);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE organism_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE impulse_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Organisms belong to users
CREATE POLICY "Users can manage own organisms" ON organisms
    FOR ALL USING (user_id = auth.uid());

-- Usage logs belong to users
CREATE POLICY "Users can view own usage logs" ON usage_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own usage logs" ON usage_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Reward cards belong to users
CREATE POLICY "Users can manage own reward cards" ON reward_cards
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- VIEWS
-- ============================================

-- V Leaderboard
CREATE VIEW v_leaderboard AS
SELECT 
    o.id,
    o.name,
    o.type,
    o.emoji,
    o.value_v,
    o.mint,
    o.tax,
    o.synergy,
    o.status,
    u.role_id,
    u.affiliation_map->>'academy_name' as academy_name,
    RANK() OVER (ORDER BY o.value_v DESC) as rank
FROM organisms o
JOIN users u ON o.user_id = u.id;

-- Solution effectiveness ranking
CREATE VIEW solution_ranking AS
SELECT 
    s.id as solution_id,
    s.name as solution_name,
    t.name as task_name,
    ss.avg_score,
    ss.usage_count,
    ss.avg_v_growth,
    ss.unique_users,
    CASE WHEN st.solution_id = s.id THEN TRUE ELSE FALSE END as is_standard,
    RANK() OVER (PARTITION BY s.task_id ORDER BY ss.avg_score DESC) as rank_in_task
FROM solutions s
LEFT JOIN solution_stats ss ON s.id = ss.solution_id
LEFT JOIN standards st ON s.task_id = st.task_id
JOIN tasks t ON s.task_id = t.id
ORDER BY ss.avg_score DESC NULLS LAST;

-- Daily physics snapshot
CREATE VIEW daily_physics_snapshot AS
SELECT 
    DATE(recorded_at) as date,
    organism_id,
    AVG(entropy) as avg_entropy,
    AVG(velocity) as avg_velocity,
    AVG(friction) as avg_friction,
    AVG(sync_rate) as avg_sync_rate,
    AVG(value_v) as avg_value_v
FROM organism_vitals
GROUP BY DATE(recorded_at), organism_id;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'AUTUS 사용자 - Kernel 6 Fields 저장';
COMMENT ON TABLE organisms IS '관리 대상 엔티티 - V 공식 + Physics Kernel v2.2';
COMMENT ON TABLE usage_logs IS '활용 로그 - 합의 엔진의 핵심 데이터';
COMMENT ON TABLE standards IS '표준 솔루션 - 자동 합의 결과';
COMMENT ON COLUMN organisms.value_v IS 'V = (M - T) × (1 + s)^t (자동 계산)';
COMMENT ON COLUMN usage_logs.effectiveness_score IS '실효성 점수 = 0.4×ΔM + 0.4×ΔT + 0.1×Usage + 0.1×Δs';
