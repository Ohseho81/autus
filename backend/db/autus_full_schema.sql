-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS Full Database Schema v13.0
-- The Stealth Standard - EP10
-- 
-- Supabase에서 실행: SQL Editor → New Query → 붙여넣기 → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ABL-R KERNEL (The Stealth Standard)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1.1 Organizations (조직)
CREATE TABLE IF NOT EXISTS organizations (
    org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name TEXT NOT NULL,
    org_type VARCHAR(10) CHECK (org_type IN ('SMB', 'GOV')) NOT NULL,
    dna_locked BOOLEAN DEFAULT FALSE,
    dna_locked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 1.2 Entities (개체: 사람, 봇, 부서)
CREATE TABLE IF NOT EXISTS entities (
    entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
    entity_name TEXT NOT NULL,
    entity_type VARCHAR(20) CHECK (entity_type IN ('HUMAN', 'BOT', 'DEPARTMENT')) DEFAULT 'HUMAN',
    role_type VARCHAR(20) CHECK (role_type IN ('DRAFTER', 'APPROVER', 'AUDITOR', 'MASTER')) NOT NULL,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 1.3 Authority Constraints (권한 제약 - 불변)
CREATE TABLE IF NOT EXISTS authority_constraints (
    constraint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(entity_id) ON DELETE CASCADE,
    constraint_key VARCHAR(50) NOT NULL,
    constraint_value VARCHAR(100) NOT NULL,
    is_immutable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_id, constraint_key)
);

-- 1.4 Budget Exponents (예산 한도 - 가변)
CREATE TABLE IF NOT EXISTS budget_exponents (
    exponent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(entity_id) ON DELETE CASCADE,
    motion_type VARCHAR(10) NOT NULL,
    limit_key VARCHAR(50) NOT NULL,
    limit_value NUMERIC NOT NULL DEFAULT 0,
    current_usage NUMERIC DEFAULT 0,
    reset_period VARCHAR(20) DEFAULT 'MONTHLY',
    last_reset_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_id, motion_type, limit_key)
);

-- 1.5 Reference Sources (판단 근거)
CREATE TABLE IF NOT EXISTS reference_sources (
    ref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(org_id),
    org_type VARCHAR(10) CHECK (org_type IN ('SMB', 'GOV')),
    -- SMB용
    market_standard_data JSONB,
    -- GOV용
    legal_basis_id VARCHAR(100),
    legal_basis_text TEXT,
    precedent_case_id UUID,
    precedent_summary TEXT,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. PROOF PACKS (증빙 패키지)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS proof_packs (
    proof_id VARCHAR(64) PRIMARY KEY,
    org_id UUID REFERENCES organizations(org_id),
    entity_id UUID REFERENCES entities(entity_id),
    motion_type VARCHAR(10) NOT NULL,
    
    -- Intent
    intent_summary TEXT NOT NULL,
    intent_purpose TEXT,
    
    -- Logic
    basis_type VARCHAR(20) CHECK (basis_type IN ('GAP_ANALYSIS', 'LEGAL_BASIS', 'PRECEDENT', 'USER_OVERRIDE')),
    basis_content TEXT,
    decision TEXT,
    confidence NUMERIC DEFAULT 1.0,
    
    -- Execution
    action_performed TEXT,
    status VARCHAR(20) CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING', 'CANCELLED')),
    result_data JSONB,
    
    -- Signature
    system_signature VARCHAR(64),
    entity_signature VARCHAR(64),
    
    -- Meta
    rule_applied VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. FEEDBACK LEARNING (자가발전 피드백)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 3.1 Feedback Actions (제출/수정/폐기)
CREATE TABLE IF NOT EXISTS feedback_actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(entity_id),
    task_id VARCHAR(100) NOT NULL,
    task_type VARCHAR(50),
    
    action_type VARCHAR(20) CHECK (action_type IN ('SUBMIT', 'EDIT', 'DISCARD')) NOT NULL,
    score NUMERIC NOT NULL, -- +1.0, +0.5, -1.0
    
    -- Edit 전용
    original_content TEXT,
    modified_content TEXT,
    diff_analysis JSONB,
    
    -- Discard 전용
    discard_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3.2 Gold Standards (제출된 우수 사례)
CREATE TABLE IF NOT EXISTS gold_standards (
    gold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(entity_id),
    task_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3.3 Negative Patterns (차단된 패턴)
CREATE TABLE IF NOT EXISTS negative_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(entity_id),
    pattern_description TEXT,
    blocked_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3.4 User Preferences (사용자 선호도)
CREATE TABLE IF NOT EXISTS user_preferences (
    pref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(entity_id) UNIQUE,
    tone VARCHAR(20) DEFAULT 'neutral', -- formal, casual, neutral
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    currency VARCHAR(10) DEFAULT 'KRW',
    language VARCHAR(10) DEFAULT 'ko',
    custom_rules JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3.5 Task Streaks (연속 성공 기록)
CREATE TABLE IF NOT EXISTS task_streaks (
    streak_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(entity_id),
    task_type VARCHAR(50) NOT NULL,
    current_streak INT DEFAULT 0,
    max_streak INT DEFAULT 0,
    is_auto_mode BOOLEAN DEFAULT FALSE,
    auto_mode_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_id, task_type)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SMART ROUTER (헌법 규칙)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS router_rules (
    rule_id VARCHAR(50) PRIMARY KEY,
    org_id UUID REFERENCES organizations(org_id), -- NULL = 글로벌 규칙
    rule_name TEXT NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    action VARCHAR(30) CHECK (action IN ('AUTO_EXECUTE', 'FORCE_ROUTE', 'REQUEST_APPROVAL', 'BLOCK')),
    target VARCHAR(50),
    message TEXT,
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. EVOLUTION LOGS (자기 진화 기록)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evolution_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_number INT NOT NULL,
    detected_gaps JSONB,
    generated_features JSONB,
    code_diff TEXT,
    deploy_status VARCHAR(20) CHECK (deploy_status IN ('SUCCESS', 'FAILED', 'SKIPPED')),
    score_before NUMERIC,
    score_after NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Feature Registry (기능 레지스트리)
CREATE TABLE IF NOT EXISTS feature_registry (
    feature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name VARCHAR(100) NOT NULL UNIQUE,
    feature_type VARCHAR(50),
    status VARCHAR(20) CHECK (status IN ('MISSING', 'GENERATING', 'DEPLOYED', 'FAILED')),
    priority INT DEFAULT 0,
    impact_score NUMERIC DEFAULT 0,
    deployed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. TASKS & MOTIONS (업무 정의)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS task_definitions (
    task_id VARCHAR(20) PRIMARY KEY, -- e.g., "T001"
    module_code VARCHAR(10) NOT NULL, -- e.g., "HR", "FIN"
    task_name_ko TEXT NOT NULL,
    task_name_en TEXT,
    motion_type VARCHAR(10), -- M01 ~ M10
    k_value NUMERIC DEFAULT 0.5, -- 지식 계수
    i_value NUMERIC DEFAULT 0.5, -- 관계 계수
    omega NUMERIC DEFAULT 0.5, -- 위기 지수
    required_inputs JSONB,
    expected_outputs JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_entities_org ON entities(org_id);
CREATE INDEX IF NOT EXISTS idx_entities_role ON entities(role_type);
CREATE INDEX IF NOT EXISTS idx_budget_entity ON budget_exponents(entity_id);
CREATE INDEX IF NOT EXISTS idx_budget_motion ON budget_exponents(motion_type);
CREATE INDEX IF NOT EXISTS idx_proofs_org ON proof_packs(org_id);
CREATE INDEX IF NOT EXISTS idx_proofs_entity ON proof_packs(entity_id);
CREATE INDEX IF NOT EXISTS idx_proofs_motion ON proof_packs(motion_type);
CREATE INDEX IF NOT EXISTS idx_proofs_created ON proof_packs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_entity ON feedback_actions(entity_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_streaks_entity ON task_streaks(entity_id);
CREATE INDEX IF NOT EXISTS idx_evolution_cycle ON evolution_logs(cycle_number);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 학습 점수 계산
CREATE OR REPLACE FUNCTION get_learning_score(p_entity_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_score NUMERIC;
BEGIN
    SELECT COALESCE(SUM(score * 10), 0) INTO total_score
    FROM feedback_actions
    WHERE entity_id = p_entity_id;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Trust Level 계산
CREATE OR REPLACE FUNCTION get_trust_level(p_entity_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    submits INT;
    edits INT;
    discards INT;
    trust NUMERIC;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE action_type = 'SUBMIT'),
        COUNT(*) FILTER (WHERE action_type = 'EDIT'),
        COUNT(*) FILTER (WHERE action_type = 'DISCARD')
    INTO submits, edits, discards
    FROM feedback_actions
    WHERE entity_id = p_entity_id;
    
    -- 기본 50 + 제출*2 + 수정*1 - 폐기*1 (최대 100)
    trust := 50 + (submits * 2) + (edits * 1) - (discards * 1);
    
    RETURN LEAST(100, GREATEST(0, trust));
END;
$$ LANGUAGE plpgsql;

-- Streak 업데이트
CREATE OR REPLACE FUNCTION update_task_streak(
    p_entity_id UUID,
    p_task_type VARCHAR(50),
    p_action_type VARCHAR(20)
)
RETURNS INT AS $$
DECLARE
    current_streak INT;
BEGIN
    -- 기존 streak 조회 또는 생성
    INSERT INTO task_streaks (entity_id, task_type, current_streak)
    VALUES (p_entity_id, p_task_type, 0)
    ON CONFLICT (entity_id, task_type) DO NOTHING;
    
    IF p_action_type = 'SUBMIT' THEN
        UPDATE task_streaks 
        SET current_streak = current_streak + 1,
            max_streak = GREATEST(max_streak, current_streak + 1),
            updated_at = NOW()
        WHERE entity_id = p_entity_id AND task_type = p_task_type
        RETURNING current_streak INTO current_streak;
    ELSIF p_action_type = 'DISCARD' THEN
        UPDATE task_streaks 
        SET current_streak = 0, updated_at = NOW()
        WHERE entity_id = p_entity_id AND task_type = p_task_type;
        current_streak := 0;
    END IF;
    
    -- 3연속 성공시 AUTO 모드 제안
    IF current_streak >= 3 THEN
        UPDATE task_streaks 
        SET is_auto_mode = TRUE, auto_mode_at = NOW()
        WHERE entity_id = p_entity_id AND task_type = p_task_type;
    END IF;
    
    RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 엔티티별 통계 뷰
CREATE OR REPLACE VIEW entity_stats AS
SELECT 
    e.entity_id,
    e.entity_name,
    e.role_type,
    o.org_name,
    o.org_type,
    get_learning_score(e.entity_id) as learning_score,
    get_trust_level(e.entity_id) as trust_level,
    (SELECT COUNT(*) FROM feedback_actions fa WHERE fa.entity_id = e.entity_id AND fa.action_type = 'SUBMIT') as total_submits,
    (SELECT COUNT(*) FROM feedback_actions fa WHERE fa.entity_id = e.entity_id AND fa.action_type = 'EDIT') as total_edits,
    (SELECT COUNT(*) FROM feedback_actions fa WHERE fa.entity_id = e.entity_id AND fa.action_type = 'DISCARD') as total_discards,
    (SELECT COUNT(*) FROM task_streaks ts WHERE ts.entity_id = e.entity_id AND ts.is_auto_mode = TRUE) as auto_tasks
FROM entities e
LEFT JOIN organizations o ON e.org_id = o.org_id;

-- 조직별 통계 뷰
CREATE OR REPLACE VIEW org_stats AS
SELECT 
    o.org_id,
    o.org_name,
    o.org_type,
    o.dna_locked,
    COUNT(DISTINCT e.entity_id) as entity_count,
    COUNT(DISTINCT pp.proof_id) as proof_count,
    SUM(CASE WHEN fa.action_type = 'SUBMIT' THEN 1 ELSE 0 END) as total_submits,
    SUM(CASE WHEN fa.action_type = 'EDIT' THEN 1 ELSE 0 END) as total_edits,
    SUM(CASE WHEN fa.action_type = 'DISCARD' THEN 1 ELSE 0 END) as total_discards
FROM organizations o
LEFT JOIN entities e ON o.org_id = e.org_id
LEFT JOIN proof_packs pp ON o.org_id = pp.org_id
LEFT JOIN feedback_actions fa ON e.entity_id = fa.entity_id
GROUP BY o.org_id, o.org_name, o.org_type, o.dna_locked;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. DEFAULT DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- 기본 라우팅 규칙
INSERT INTO router_rules (rule_id, rule_name, description, conditions, action, target, message, priority) VALUES
('SMB_PRICE_GAP', 'SMB 가격 초과', '글로벌 표준 대비 10% 이상 비싸면 사장 승인', '{"org_type": "SMB", "motion_type": "M08", "gap_threshold": 0.10}', 'FORCE_ROUTE', 'BOSS_APPROVAL', '🚨 글로벌 최저가 대비 10% 이상 비쌉니다. 사장님 승인이 필요합니다.', 10),
('GOV_NO_LEGAL', 'GOV 법적 근거 없음', '신규 시도에 법적 근거 없으면 감사실 검토', '{"org_type": "GOV", "is_new_attempt": true, "legal_basis_found": false}', 'FORCE_ROUTE', 'AUDIT_REVIEW', '⚠️ 법적 근거가 불명확합니다. 감사실 사전 검토가 필요합니다.', 20),
('GOV_PRECEDENT', 'GOV 성공 사례 일치', '성공 사례 99% 일치시 자동 실행', '{"org_type": "GOV", "is_repeated": true, "precedent_match": {">=": 0.99}}', 'AUTO_EXECUTE', NULL, '✅ 표준 성공 사례에 근거하여 자동 처리합니다.', 15),
('CONTRACT_LEGAL', '계약 법무 검토', '모든 계약은 법무 검토 필수', '{"motion_type": "M05"}', 'REQUEST_APPROVAL', 'LEGAL_REVIEW', '📝 계약 체결은 법무 검토가 필요합니다.', 50),
('AUTH_SUPERIOR', '위임 상위자 승인', '권한 위임은 상위자 승인 필요', '{"motion_type": "M10"}', 'REQUEST_APPROVAL', 'SUPERIOR', '🔐 권한 위임은 상위자 승인이 필요합니다.', 50)
ON CONFLICT (rule_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! 
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'AUTUS Schema v13.0 설치 완료!' as message;
