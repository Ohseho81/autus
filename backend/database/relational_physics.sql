-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏛️ KRATON Relational Physics Database Schema
-- 관계성 데이터 독점을 위한 핵심 테이블
-- ═══════════════════════════════════════════════════════════════════════════════

-- ============================================
-- 1. RELATIONAL NODES - 노드 간 연결 정의
-- ============================================

CREATE TABLE IF NOT EXISTS relational_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- 관계 정의
    source_id UUID NOT NULL,  -- 관계 시작 노드 (예: 선생님)
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'teacher', 'student', 'parent', 'organization', 'class', 'community'
    )),
    target_id UUID NOT NULL,  -- 관계 대상 노드 (예: 학생)
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN (
        'teacher', 'student', 'parent', 'organization', 'class', 'community'
    )),
    
    -- 관계 유형
    relation_type VARCHAR(50) NOT NULL CHECK (relation_type IN (
        'T-S',  -- Teacher-Student
        'T-P',  -- Teacher-Parent
        'S-P',  -- Student-Parent
        'O-C',  -- Organization-Community
        'T-T',  -- Teacher-Teacher (동료)
        'S-S'   -- Student-Student (또래)
    )),
    
    -- 관계 메타데이터
    bond_strength DECIMAL(5,2) DEFAULT 50.0 CHECK (bond_strength BETWEEN 0 AND 100),
    chemistry_score DECIMAL(5,4) DEFAULT 0.5, -- -1 to 1, 상성 점수
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, source_id, target_id, relation_type)
);

-- ============================================
-- 2. INTERACTION LOGS - 현장의 생생한 반응
-- ============================================

CREATE TABLE IF NOT EXISTS interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    node_pair_id UUID REFERENCES relational_nodes(id) ON DELETE CASCADE,
    
    -- 상호작용 정보
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN (
        'consultation',  -- 상담
        'class',         -- 수업
        'call',          -- 전화
        'message',       -- 메시지
        'meeting',       -- 미팅
        'event',         -- 이벤트
        'feedback',      -- 피드백
        'complaint'      -- 불만
    )),
    
    -- Quick-Tag 시스템 (Teacher Console)
    sentiment_tag VARCHAR(20) CHECK (sentiment_tag IN (
        'satisfied',  -- 😊 만족
        'neutral',    -- 😐 보통
        'anxious',    -- 😟 불안
        'angry'       -- 😡 불만
    )),
    bond_tag VARCHAR(20) CHECK (bond_tag IN (
        'strong',     -- 🔗 강함
        'normal',     -- ⛓️ 보통
        'cold'        -- 🧊 차가움
    )),
    issue_trigger VARCHAR(50) CHECK (issue_trigger IN (
        'academic',   -- 학업
        'cost',       -- 비용
        'career',     -- 진로
        'attitude',   -- 태도
        'schedule',   -- 일정
        'other'       -- 기타
    )),
    
    -- AI 분석 결과
    sentiment_score DECIMAL(5,4), -- -1 to 1, AI가 산출한 감정 점수
    confidence_score DECIMAL(5,4), -- 0 to 1, AI 신뢰도
    
    -- Voice-to-Insight
    voice_transcript TEXT,
    ai_extracted_tags JSONB DEFAULT '[]',
    
    -- 원본 데이터
    content TEXT,
    duration_minutes INTEGER,
    
    logged_by UUID REFERENCES users(id),
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    
    metadata JSONB DEFAULT '{}'
);

-- ============================================
-- 3. PHYSICS METRICS - 실시간 물리 변수
-- ============================================

CREATE TABLE IF NOT EXISTS physics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    node_id UUID NOT NULL, -- relational_nodes.id 또는 v_nodes.id
    node_type VARCHAR(20) NOT NULL CHECK (node_type IN ('relation', 'entity')),
    
    -- 핵심 물리 변수
    m_score DECIMAL(10,4) DEFAULT 0,      -- M: 성과/성적 점수
    s_index DECIMAL(5,4) DEFAULT 0.5,     -- s: 만족도 지수 (0-1)
    v_value DECIMAL(15,4) DEFAULT 0,      -- V: 현재 가치
    t_saved DECIMAL(10,2) DEFAULT 0,      -- T: 절약된 시간 (분)
    
    -- 파생 변수
    r_score DECIMAL(10,4),                -- R: 관계 점수 (M × s × e^(-t/τ))
    churn_probability DECIMAL(5,4),       -- 이탈 확률 (0-1)
    predicted_lifespan_months INTEGER,    -- 예측 수명 (개월)
    
    -- 트렌드
    s_index_trend VARCHAR(10) CHECK (s_index_trend IN ('up', 'down', 'stable')),
    m_score_trend VARCHAR(10) CHECK (m_score_trend IN ('up', 'down', 'stable')),
    
    -- 마지막 접촉
    last_interaction_at TIMESTAMPTZ,
    days_since_contact INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM NOW() - last_interaction_at)
    ) STORED,
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, node_id, node_type)
);

-- ============================================
-- 4. RISK QUEUE - FSD가 판단한 위기 목록
-- ============================================

CREATE TABLE IF NOT EXISTS risk_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- 위험 대상
    target_node_id UUID NOT NULL,
    target_node_type VARCHAR(50) NOT NULL,
    target_name VARCHAR(255),
    
    -- 위험 분류
    risk_type VARCHAR(50) NOT NULL CHECK (risk_type IN (
        'churn_imminent',      -- 임박한 이탈
        'satisfaction_drop',   -- 만족도 급락
        'performance_decline', -- 성과 하락
        'bond_weakening',      -- 관계 약화
        'payment_risk',        -- 결제 위험
        'complaint_escalation' -- 불만 확대
    )),
    priority VARCHAR(20) NOT NULL CHECK (priority IN (
        'CRITICAL',  -- 즉시 대응
        'HIGH',      -- 24시간 내
        'MEDIUM',    -- 48시간 내
        'LOW'        -- 1주일 내
    )),
    
    -- 상태 관리
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN (
        'OPEN',        -- 신규
        'ASSIGNED',    -- 담당자 배정
        'IN_PROGRESS', -- 처리 중
        'RESOLVED',    -- 해결됨
        'ESCALATED',   -- 상위 보고
        'CLOSED'       -- 종료
    )),
    
    -- FSD 분석
    trigger_reason TEXT NOT NULL,
    trigger_metrics JSONB DEFAULT '{}', -- { s_index: 0.35, m_score_drop: -15 }
    recommended_action TEXT,
    auto_action_taken BOOLEAN DEFAULT FALSE,
    
    -- 담당자
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,
    
    -- 해결
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ASSET VALUATION - 복리 증식 가치 추적
-- ============================================

CREATE TABLE IF NOT EXISTS asset_valuation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- 대상 노드
    node_id UUID NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    node_name VARCHAR(255),
    
    -- 가치 계산
    base_v DECIMAL(15,4) DEFAULT 0,         -- 기본 V 값
    compounded_v DECIMAL(15,4) DEFAULT 0,   -- 복리 적용 V 값
    synergy_factor DECIMAL(5,4) DEFAULT 1.0, -- 시너지 계수
    compound_rate DECIMAL(5,4) DEFAULT 0.05, -- 복리 이율 (기본 5%)
    
    -- 기간 정보
    valuation_date DATE NOT NULL,
    days_active INTEGER DEFAULT 0,
    
    -- 글로벌 통합 (필리핀-한국)
    region VARCHAR(20) CHECK (region IN ('KR', 'PH', 'GLOBAL')),
    tax_credit DECIMAL(15,2) DEFAULT 0,      -- PEZA 세금 감면 등
    currency VARCHAR(3) DEFAULT 'KRW',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0,
    
    -- 인센티브 포인트 (관계 보상)
    relational_bonus_points INTEGER DEFAULT 0,
    bonus_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, node_id, valuation_date)
);

-- ============================================
-- 6. ATTENTION METRICS - Safety Mirror 추적
-- ============================================

CREATE TABLE IF NOT EXISTS attention_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 사용 패턴
    session_date DATE NOT NULL,
    app_opens INTEGER DEFAULT 0,
    total_dwell_time_seconds INTEGER DEFAULT 0,
    
    -- 페이지별 체류 시간
    page_dwell_times JSONB DEFAULT '{}', -- { "report": 120, "schedule": 45 }
    
    -- 반응 지표
    notification_response_rate DECIMAL(5,4), -- 알림 반응률
    avg_response_time_seconds INTEGER,        -- 평균 반응 시간
    
    -- Dopamine Loop
    encouragement_messages_sent INTEGER DEFAULT 0, -- 응원 메시지 발송 수
    positive_interactions INTEGER DEFAULT 0,
    
    -- Trust Score
    trust_score DECIMAL(5,4),
    attention_mass DECIMAL(10,4), -- 정신적 점유율
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, user_id, session_date)
);

-- ============================================
-- 7. WORKFLOW EXECUTION LOGS - n8n 실행 기록
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- 워크플로우 정보
    workflow_id VARCHAR(100) NOT NULL,
    workflow_name VARCHAR(255) NOT NULL,
    workflow_type VARCHAR(50) CHECK (workflow_type IN (
        'churn_detection',     -- 이탈 감지
        'relational_incentive', -- 관계 보상
        'global_consolidation', -- 글로벌 통합
        'risk_notification',    -- 위험 알림
        'auto_actuation'        -- 자동 실행
    )),
    
    -- 실행 정보
    execution_id VARCHAR(100),
    trigger_type VARCHAR(50), -- 'webhook', 'cron', 'manual'
    trigger_data JSONB DEFAULT '{}',
    
    -- 결과
    status VARCHAR(20) CHECK (status IN (
        'started', 'running', 'success', 'failed', 'partial'
    )),
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- 영향
    nodes_processed INTEGER DEFAULT 0,
    risks_created INTEGER DEFAULT 0,
    actions_triggered INTEGER DEFAULT 0,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

-- ============================================
-- 8. INDEXES
-- ============================================

-- Relational Nodes
CREATE INDEX IF NOT EXISTS idx_rel_nodes_org ON relational_nodes(organization_id);
CREATE INDEX IF NOT EXISTS idx_rel_nodes_source ON relational_nodes(source_id);
CREATE INDEX IF NOT EXISTS idx_rel_nodes_target ON relational_nodes(target_id);
CREATE INDEX IF NOT EXISTS idx_rel_nodes_type ON relational_nodes(relation_type);

-- Interaction Logs
CREATE INDEX IF NOT EXISTS idx_interactions_node ON interaction_logs(node_pair_id);
CREATE INDEX IF NOT EXISTS idx_interactions_time ON interaction_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_interactions_sentiment ON interaction_logs(sentiment_score);

-- Physics Metrics
CREATE INDEX IF NOT EXISTS idx_physics_node ON physics_metrics(node_id);
CREATE INDEX IF NOT EXISTS idx_physics_churn ON physics_metrics(churn_probability);
CREATE INDEX IF NOT EXISTS idx_physics_s_index ON physics_metrics(s_index);

-- Risk Queue
CREATE INDEX IF NOT EXISTS idx_risk_org ON risk_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_status ON risk_queue(status);
CREATE INDEX IF NOT EXISTS idx_risk_priority ON risk_queue(priority);
CREATE INDEX IF NOT EXISTS idx_risk_target ON risk_queue(target_node_id);

-- Asset Valuation
CREATE INDEX IF NOT EXISTS idx_asset_node ON asset_valuation(node_id);
CREATE INDEX IF NOT EXISTS idx_asset_date ON asset_valuation(valuation_date);

-- ============================================
-- 9. FUNCTIONS - 물리 계산 함수
-- ============================================

-- R Score 계산: R = M × s × e^(-t/τ)
CREATE OR REPLACE FUNCTION calculate_r_score(
    m_score DECIMAL,
    s_index DECIMAL,
    days_since_contact INTEGER,
    decay_constant DECIMAL DEFAULT 30.0 -- τ = 30일
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN m_score * s_index * EXP(-days_since_contact::DECIMAL / decay_constant);
END;
$$ LANGUAGE plpgsql;

-- 이탈 확률 계산: f(M, s, t)
CREATE OR REPLACE FUNCTION calculate_churn_probability(
    m_score DECIMAL,
    s_index DECIMAL,
    days_since_contact INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
    base_risk DECIMAL;
    time_factor DECIMAL;
    satisfaction_factor DECIMAL;
BEGIN
    -- 기본 위험도 (성과 기반)
    base_risk := GREATEST(0, (100 - m_score) / 100);
    
    -- 시간 팩터 (접촉 없는 기간이 길수록 증가)
    time_factor := 1 + (days_since_contact::DECIMAL / 30) * 0.1;
    
    -- 만족도 팩터 (낮을수록 위험)
    satisfaction_factor := GREATEST(0, (1 - s_index) * 2);
    
    -- 최종 이탈 확률 (0-1 범위로 제한)
    RETURN LEAST(1, GREATEST(0, base_risk * time_factor * satisfaction_factor));
END;
$$ LANGUAGE plpgsql;

-- 복리 V 계산: V = (M - T) × (1 + s)^t
CREATE OR REPLACE FUNCTION calculate_compounded_v(
    base_v DECIMAL,
    synergy_factor DECIMAL,
    days_active INTEGER
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN base_v * POWER(1 + synergy_factor, days_active::DECIMAL / 365);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- 상호작용 로그 추가 시 물리 메트릭 업데이트
CREATE OR REPLACE FUNCTION update_physics_on_interaction()
RETURNS TRIGGER AS $$
DECLARE
    current_metrics RECORD;
    new_s_index DECIMAL;
    sentiment_delta DECIMAL;
BEGIN
    -- 현재 메트릭 조회
    SELECT * INTO current_metrics 
    FROM physics_metrics 
    WHERE node_id = NEW.node_pair_id AND node_type = 'relation';
    
    -- 감정 점수에 따른 s_index 조정
    sentiment_delta := CASE NEW.sentiment_tag
        WHEN 'satisfied' THEN 0.05
        WHEN 'neutral' THEN 0
        WHEN 'anxious' THEN -0.05
        WHEN 'angry' THEN -0.10
        ELSE 0
    END;
    
    IF current_metrics IS NOT NULL THEN
        -- 기존 메트릭 업데이트
        new_s_index := GREATEST(0, LEAST(1, current_metrics.s_index + sentiment_delta));
        
        UPDATE physics_metrics SET
            s_index = new_s_index,
            s_index_trend = CASE 
                WHEN sentiment_delta > 0 THEN 'up'
                WHEN sentiment_delta < 0 THEN 'down'
                ELSE 'stable'
            END,
            last_interaction_at = NEW.logged_at,
            r_score = calculate_r_score(m_score, new_s_index, 0),
            churn_probability = calculate_churn_probability(m_score, new_s_index, 0),
            calculated_at = NOW()
        WHERE node_id = NEW.node_pair_id AND node_type = 'relation';
    ELSE
        -- 새 메트릭 생성
        INSERT INTO physics_metrics (
            organization_id, node_id, node_type, s_index, 
            last_interaction_at, calculated_at
        ) VALUES (
            NEW.organization_id, NEW.node_pair_id, 'relation',
            0.5 + sentiment_delta, NEW.logged_at, NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interaction_physics
    AFTER INSERT ON interaction_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_physics_on_interaction();

-- 물리 메트릭 변경 시 위험 감지
CREATE OR REPLACE FUNCTION check_risk_on_physics_update()
RETURNS TRIGGER AS $$
BEGIN
    -- 이탈 확률 40% 이상이면 리스크 큐에 추가
    IF NEW.churn_probability >= 0.4 AND (
        OLD.churn_probability IS NULL OR OLD.churn_probability < 0.4
    ) THEN
        INSERT INTO risk_queue (
            organization_id, target_node_id, target_node_type,
            risk_type, priority, trigger_reason, trigger_metrics
        ) VALUES (
            NEW.organization_id, NEW.node_id, NEW.node_type,
            'churn_imminent',
            CASE 
                WHEN NEW.churn_probability >= 0.7 THEN 'CRITICAL'
                WHEN NEW.churn_probability >= 0.5 THEN 'HIGH'
                ELSE 'MEDIUM'
            END,
            'Churn probability exceeded threshold',
            jsonb_build_object(
                's_index', NEW.s_index,
                'churn_probability', NEW.churn_probability,
                'days_since_contact', NEW.days_since_contact
            )
        );
    END IF;
    
    -- s_index 급락 시 (10% 이상)
    IF OLD.s_index IS NOT NULL AND (OLD.s_index - NEW.s_index) >= 0.10 THEN
        INSERT INTO risk_queue (
            organization_id, target_node_id, target_node_type,
            risk_type, priority, trigger_reason, trigger_metrics
        ) VALUES (
            NEW.organization_id, NEW.node_id, NEW.node_type,
            'satisfaction_drop',
            'HIGH',
            'Satisfaction index dropped by 10% or more',
            jsonb_build_object(
                'previous_s_index', OLD.s_index,
                'current_s_index', NEW.s_index,
                'drop_percentage', (OLD.s_index - NEW.s_index) * 100
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_physics_risk_check
    AFTER UPDATE ON physics_metrics
    FOR EACH ROW
    EXECUTE FUNCTION check_risk_on_physics_update();

-- ═══════════════════════════════════════════════════════════════════════════════
-- END OF RELATIONAL PHYSICS SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
