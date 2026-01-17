-- ═══════════════════════════════════════════════════════════════════════════════
--
--                     AUTUS K/I DB 스키마
--                     
--                     PostgreSQL 스키마 정의
--                     - K/I 상태 시계열
--                     - 48노드 값
--                     - 144슬롯 관계
--                     - 자동화 태스크
--                     - 경고
--                     - 불변 이벤트 원장
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- 확장 설치
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. 엔티티 (사용자/조직)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,  -- Clerk user_id 등 외부 ID
    entity_type VARCHAR(50) NOT NULL DEFAULT 'INDIVIDUAL',  -- INDIVIDUAL, ORGANIZATION, TEAM
    name VARCHAR(255),
    email VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_entities_external_id ON entities(external_id);
CREATE INDEX idx_entities_type ON entities(entity_type);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. K/I 상태 (시계열)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE ki_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    
    -- K/I 값
    k_index DECIMAL(10, 6) NOT NULL CHECK (k_index >= -1 AND k_index <= 1),
    i_index DECIMAL(10, 6) NOT NULL CHECK (i_index >= -1 AND i_index <= 1),
    
    -- 변화율
    dk_dt DECIMAL(10, 6) DEFAULT 0,  -- K 변화율 (per day)
    di_dt DECIMAL(10, 6) DEFAULT 0,  -- I 변화율 (per day)
    
    -- 메타데이터
    phase VARCHAR(20) DEFAULT 'STABLE',  -- GROWTH, STABLE, DECLINE, CRISIS
    confidence DECIMAL(5, 4) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- 계산 소스
    calculation_method VARCHAR(50) DEFAULT 'PHYSICS_ENGINE',
    source_nodes JSONB DEFAULT '[]',  -- 어떤 노드가 기여했는지
    
    -- 타임스탬프
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 (시계열 쿼리 최적화)
CREATE INDEX idx_ki_states_entity_time ON ki_states(entity_id, recorded_at DESC);
CREATE INDEX idx_ki_states_phase ON ki_states(phase);

-- 파티셔닝 (월별 - 대량 데이터 대비)
-- CREATE TABLE ki_states_y2026m01 PARTITION OF ki_states
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. 48노드 정의 (메타데이터)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE node_definitions (
    node_id VARCHAR(20) PRIMARY KEY,  -- e.g., "CASH_A", "TIME_D"
    
    -- 구조
    meta VARCHAR(20) NOT NULL,    -- RESOURCE, RELATION, ACTION, FLOW
    domain VARCHAR(20) NOT NULL,  -- SURVIVE, GROW, RELATE, EXPRESS
    node_type CHAR(1) NOT NULL,   -- A(Asset), D(Delta), E(Efficiency)
    
    -- 설명
    name_ko VARCHAR(100),
    name_en VARCHAR(100),
    description TEXT,
    
    -- 가중치 기본값
    default_weight DECIMAL(5, 4) DEFAULT 0.25,
    
    -- 데이터 소스 힌트
    data_sources JSONB DEFAULT '[]',  -- ["gmail", "calendar", "slack"]
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 48노드 초기 데이터 삽입
INSERT INTO node_definitions (node_id, meta, domain, node_type, name_ko, name_en) VALUES
-- SURVIVE 도메인
('CASH_A', 'RESOURCE', 'SURVIVE', 'A', '현금 자산', 'Cash Asset'),
('CASH_D', 'RESOURCE', 'SURVIVE', 'D', '현금 변화', 'Cash Delta'),
('CASH_E', 'RESOURCE', 'SURVIVE', 'E', '현금 효율', 'Cash Efficiency'),
('BODY_A', 'RESOURCE', 'SURVIVE', 'A', '신체 상태', 'Body State'),
('BODY_D', 'RESOURCE', 'SURVIVE', 'D', '신체 변화', 'Body Delta'),
('BODY_E', 'RESOURCE', 'SURVIVE', 'E', '신체 효율', 'Body Efficiency'),
('SPACE_A', 'RESOURCE', 'SURVIVE', 'A', '공간 자산', 'Space Asset'),
('SPACE_D', 'RESOURCE', 'SURVIVE', 'D', '공간 변화', 'Space Delta'),
('SPACE_E', 'RESOURCE', 'SURVIVE', 'E', '공간 효율', 'Space Efficiency'),
('LEGAL_A', 'RESOURCE', 'SURVIVE', 'A', '법적 상태', 'Legal State'),
('LEGAL_D', 'RESOURCE', 'SURVIVE', 'D', '법적 변화', 'Legal Delta'),
('LEGAL_E', 'RESOURCE', 'SURVIVE', 'E', '법적 효율', 'Legal Efficiency'),

-- GROW 도메인
('TIME_A', 'RELATION', 'GROW', 'A', '시간 자산', 'Time Asset'),
('TIME_D', 'RELATION', 'GROW', 'D', '시간 변화', 'Time Delta'),
('TIME_E', 'RELATION', 'GROW', 'E', '시간 효율', 'Time Efficiency'),
('KNOW_A', 'RELATION', 'GROW', 'A', '지식 자산', 'Knowledge Asset'),
('KNOW_D', 'RELATION', 'GROW', 'D', '지식 변화', 'Knowledge Delta'),
('KNOW_E', 'RELATION', 'GROW', 'E', '지식 효율', 'Knowledge Efficiency'),
('SKILL_A', 'RELATION', 'GROW', 'A', '기술 자산', 'Skill Asset'),
('SKILL_D', 'RELATION', 'GROW', 'D', '기술 변화', 'Skill Delta'),
('SKILL_E', 'RELATION', 'GROW', 'E', '기술 효율', 'Skill Efficiency'),
('WORK_A', 'RELATION', 'GROW', 'A', '작업 자산', 'Work Asset'),
('WORK_D', 'RELATION', 'GROW', 'D', '작업 변화', 'Work Delta'),
('WORK_E', 'RELATION', 'GROW', 'E', '작업 효율', 'Work Efficiency'),

-- RELATE 도메인
('NET_A', 'ACTION', 'RELATE', 'A', '네트워크 자산', 'Network Asset'),
('NET_D', 'ACTION', 'RELATE', 'D', '네트워크 변화', 'Network Delta'),
('NET_E', 'ACTION', 'RELATE', 'E', '네트워크 효율', 'Network Efficiency'),
('CUST_A', 'ACTION', 'RELATE', 'A', '고객 자산', 'Customer Asset'),
('CUST_D', 'ACTION', 'RELATE', 'D', '고객 변화', 'Customer Delta'),
('CUST_E', 'ACTION', 'RELATE', 'E', '고객 효율', 'Customer Efficiency'),
('PART_A', 'ACTION', 'RELATE', 'A', '파트너 자산', 'Partner Asset'),
('PART_D', 'ACTION', 'RELATE', 'D', '파트너 변화', 'Partner Delta'),
('PART_E', 'ACTION', 'RELATE', 'E', '파트너 효율', 'Partner Efficiency'),
('TEAM_A', 'ACTION', 'RELATE', 'A', '팀 자산', 'Team Asset'),
('TEAM_D', 'ACTION', 'RELATE', 'D', '팀 변화', 'Team Delta'),
('TEAM_E', 'ACTION', 'RELATE', 'E', '팀 효율', 'Team Efficiency'),

-- EXPRESS 도메인
('BRAND_A', 'FLOW', 'EXPRESS', 'A', '브랜드 자산', 'Brand Asset'),
('BRAND_D', 'FLOW', 'EXPRESS', 'D', '브랜드 변화', 'Brand Delta'),
('BRAND_E', 'FLOW', 'EXPRESS', 'E', '브랜드 효율', 'Brand Efficiency'),
('PROD_A', 'FLOW', 'EXPRESS', 'A', '제품 자산', 'Product Asset'),
('PROD_D', 'FLOW', 'EXPRESS', 'D', '제품 변화', 'Product Delta'),
('PROD_E', 'FLOW', 'EXPRESS', 'E', '제품 효율', 'Product Efficiency'),
('EMOTE_A', 'FLOW', 'EXPRESS', 'A', '감정 자산', 'Emotion Asset'),
('EMOTE_D', 'FLOW', 'EXPRESS', 'D', '감정 변화', 'Emotion Delta'),
('EMOTE_E', 'FLOW', 'EXPRESS', 'E', '감정 효율', 'Emotion Efficiency'),
('MEAN_A', 'FLOW', 'EXPRESS', 'A', '의미 자산', 'Meaning Asset'),
('MEAN_D', 'FLOW', 'EXPRESS', 'D', '의미 변화', 'Meaning Delta'),
('MEAN_E', 'FLOW', 'EXPRESS', 'E', '의미 효율', 'Meaning Efficiency');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. 노드 값 (시계열)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE node_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    node_id VARCHAR(20) NOT NULL REFERENCES node_definitions(node_id),
    
    -- 값
    value DECIMAL(10, 6) NOT NULL CHECK (value >= -1 AND value <= 1),
    weight DECIMAL(5, 4) DEFAULT 0.25,
    trend VARCHAR(10) DEFAULT 'STABLE',  -- UP, DOWN, STABLE
    
    -- 소스
    source VARCHAR(50),  -- 어디서 온 데이터? (gmail, calendar, manual, etc.)
    raw_data JSONB DEFAULT '{}',
    
    -- 타임스탬프
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_node_values_entity_node_time ON node_values(entity_id, node_id, recorded_at DESC);
CREATE INDEX idx_node_values_source ON node_values(source);

-- 현재 노드 값 뷰 (최신 값만)
CREATE VIEW current_node_values AS
SELECT DISTINCT ON (entity_id, node_id)
    entity_id,
    node_id,
    value,
    weight,
    trend,
    source,
    recorded_at
FROM node_values
ORDER BY entity_id, node_id, recorded_at DESC;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. 144슬롯 정의 (관계 유형)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE slot_types (
    type_id VARCHAR(20) PRIMARY KEY,
    name_ko VARCHAR(50),
    name_en VARCHAR(50),
    max_slots INT DEFAULT 12,
    description TEXT,
    i_weight DECIMAL(5, 4) DEFAULT 0.0833,  -- 1/12
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO slot_types (type_id, name_ko, name_en, description) VALUES
('FAMILY', '가족', 'Family', '혈연 또는 법적 가족 관계'),
('COLLEAGUE', '동료', 'Colleague', '직장 내 동료'),
('PARTNER', '파트너', 'Partner', '비즈니스 또는 프로젝트 파트너'),
('MENTOR', '멘토', 'Mentor', '조언과 지도를 제공하는 관계'),
('MENTEE', '멘티', 'Mentee', '조언과 지도를 받는 관계'),
('FRIEND', '친구', 'Friend', '개인적 친구'),
('CLIENT', '고객', 'Client', '서비스/제품 고객'),
('VENDOR', '벤더', 'Vendor', '서비스/제품 공급자'),
('COMPETITOR', '경쟁자', 'Competitor', '경쟁 관계'),
('COMMUNITY', '커뮤니티', 'Community', '커뮤니티 멤버'),
('ACQUAINTANCE', '지인', 'Acquaintance', '일반적 지인'),
('OTHER', '기타', 'Other', '기타 관계');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. 144슬롯 값 (관계 데이터)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE slot_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    slot_type VARCHAR(20) NOT NULL REFERENCES slot_types(type_id),
    slot_number INT NOT NULL CHECK (slot_number >= 1 AND slot_number <= 12),
    
    -- 관계 대상
    target_name VARCHAR(255),
    target_entity_id UUID REFERENCES entities(id),  -- 다른 엔티티와 연결
    
    -- I-지수 기여
    i_score DECIMAL(10, 6) DEFAULT 0 CHECK (i_score >= -1 AND i_score <= 1),
    interaction_count INT DEFAULT 0,
    last_interaction TIMESTAMP WITH TIME ZONE,
    
    -- 상태
    fill_status VARCHAR(20) DEFAULT 'EMPTY',  -- FILLED, EMPTY, PARTIAL
    relationship_strength DECIMAL(5, 4) DEFAULT 0,  -- 0 ~ 1
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 유니크 제약: 엔티티당 유형별 슬롯 번호 유일
    UNIQUE(entity_id, slot_type, slot_number)
);

CREATE INDEX idx_slot_values_entity ON slot_values(entity_id);
CREATE INDEX idx_slot_values_target ON slot_values(target_entity_id);
CREATE INDEX idx_slot_values_status ON slot_values(fill_status);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. 자동화 태스크 (DAROE)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE automation_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    
    -- DAROE 단계
    stage VARCHAR(20) NOT NULL,  -- DISCOVERY, ANALYSIS, REDESIGN, OPTIMIZATION, ELIMINATION
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, EXECUTING, COMPLETED, FAILED
    
    -- 내용
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 예상 영향
    impact_k DECIMAL(10, 6) DEFAULT 0,
    impact_i DECIMAL(10, 6) DEFAULT 0,
    confidence DECIMAL(5, 4) DEFAULT 0.5,
    
    -- 실행 정보
    execution_plan JSONB DEFAULT '{}',
    execution_result JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- 자동 승인 설정
    auto_approve BOOLEAN DEFAULT FALSE,
    approval_threshold DECIMAL(5, 4) DEFAULT 0.8,  -- confidence >= threshold면 자동 승인
    
    -- 승인 정보
    approved_by UUID REFERENCES entities(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_comment TEXT,
    
    -- 타임스탬프
    deadline TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_tasks_entity ON automation_tasks(entity_id);
CREATE INDEX idx_automation_tasks_stage_status ON automation_tasks(stage, status);
CREATE INDEX idx_automation_tasks_deadline ON automation_tasks(deadline);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. 경고 (Alerts)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    
    -- 심각도 및 카테고리
    severity VARCHAR(20) NOT NULL,  -- INFO, WARNING, CRITICAL, EMERGENCY
    category VARCHAR(50) NOT NULL,  -- K_DECLINE, I_IMBALANCE, NODE_CRITICAL, etc.
    
    -- 내용
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- 관련 노드/슬롯
    related_nodes VARCHAR(20)[] DEFAULT '{}',
    related_slots VARCHAR(50)[] DEFAULT '{}',
    
    -- 트리거 조건
    trigger_condition JSONB DEFAULT '{}',  -- 어떤 조건으로 발생했는지
    
    -- 상태
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES entities(id),
    
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES entities(id),
    resolution_note TEXT,
    
    -- 타임스탬프
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_entity ON alerts(entity_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_unacknowledged ON alerts(entity_id) WHERE NOT acknowledged;
CREATE INDEX idx_alerts_unresolved ON alerts(entity_id) WHERE NOT resolved;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. 불변 이벤트 원장 (Event Ledger)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE event_ledger (
    id BIGSERIAL PRIMARY KEY,
    
    -- 이벤트 식별
    event_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    entity_id UUID REFERENCES entities(id),
    
    -- 이벤트 데이터 (불변)
    payload JSONB NOT NULL,
    
    -- 무결성 검증
    checksum VARCHAR(64) NOT NULL,  -- SHA-256 해시
    previous_checksum VARCHAR(64),  -- 이전 이벤트의 체크섬 (체인)
    
    -- 메타데이터
    source VARCHAR(50),  -- 이벤트 소스 (api, webhook, automation, etc.)
    version INT DEFAULT 1,
    
    -- 타임스탬프 (불변)
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이벤트는 삭제/수정 불가 (정책으로 강제)
CREATE INDEX idx_event_ledger_entity ON event_ledger(entity_id);
CREATE INDEX idx_event_ledger_type ON event_ledger(event_type);
CREATE INDEX idx_event_ledger_time ON event_ledger(occurred_at);

-- 체크섬 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_event_checksum()
RETURNS TRIGGER AS $$
DECLARE
    prev_checksum VARCHAR(64);
BEGIN
    -- 이전 이벤트의 체크섬 가져오기
    SELECT checksum INTO prev_checksum
    FROM event_ledger
    WHERE entity_id = NEW.entity_id
    ORDER BY id DESC
    LIMIT 1;
    
    NEW.previous_checksum := prev_checksum;
    NEW.checksum := encode(
        digest(
            COALESCE(prev_checksum, '') || 
            NEW.event_type || 
            NEW.payload::text || 
            NEW.occurred_at::text,
            'sha256'
        ),
        'hex'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_checksum
    BEFORE INSERT ON event_ledger
    FOR EACH ROW
    EXECUTE FUNCTION calculate_event_checksum();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. 예측 결과 캐시
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE prediction_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    
    -- 예측 파라미터
    horizon_days INT NOT NULL,
    scenarios INT DEFAULT 100,
    
    -- 예측 결과
    trajectory JSONB NOT NULL,  -- TrajectoryPoint 배열
    predicted_phase VARCHAR(20),
    risk_level VARCHAR(20),
    key_factors TEXT[],
    
    -- 캐시 메타
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(entity_id, horizon_days)
);

CREATE INDEX idx_prediction_cache_entity ON prediction_cache(entity_id);
CREATE INDEX idx_prediction_cache_expiry ON prediction_cache(expires_at);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. 데이터 수집 소스 연결
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    
    -- 소스 정보
    source_type VARCHAR(50) NOT NULL,  -- gmail, calendar, slack, github, etc.
    source_name VARCHAR(100),
    
    -- OAuth 토큰 (암호화 저장)
    access_token_encrypted BYTEA,
    refresh_token_encrypted BYTEA,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- 동기화 상태
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(20),  -- SUCCESS, FAILED, PARTIAL
    last_error TEXT,
    
    -- 수집 설정
    sync_interval_minutes INT DEFAULT 60,
    node_mappings JSONB DEFAULT '{}',  -- 어떤 데이터 → 어떤 노드
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(entity_id, source_type)
);

CREATE INDEX idx_data_sources_entity ON data_sources(entity_id);
CREATE INDEX idx_data_sources_type ON data_sources(source_type);
CREATE INDEX idx_data_sources_sync ON data_sources(last_sync_at);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. 유용한 뷰
-- ═══════════════════════════════════════════════════════════════════════════════

-- 엔티티별 최신 K/I 상태
CREATE VIEW latest_ki_states AS
SELECT DISTINCT ON (entity_id)
    entity_id,
    k_index,
    i_index,
    dk_dt,
    di_dt,
    phase,
    confidence,
    recorded_at
FROM ki_states
ORDER BY entity_id, recorded_at DESC;

-- 도메인별 점수 집계
CREATE VIEW domain_scores AS
SELECT
    nv.entity_id,
    nd.domain,
    AVG(nv.value) as avg_value,
    SUM(nv.value * nv.weight) / NULLIF(SUM(nv.weight), 0) as weighted_avg
FROM current_node_values nv
JOIN node_definitions nd ON nv.node_id = nd.node_id
GROUP BY nv.entity_id, nd.domain;

-- 슬롯 채움률
CREATE VIEW slot_fill_rates AS
SELECT
    entity_id,
    slot_type,
    COUNT(*) FILTER (WHERE fill_status = 'FILLED') as filled_count,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE fill_status = 'FILLED')::DECIMAL / 12 as fill_rate
FROM slot_values
GROUP BY entity_id, slot_type;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. 함수: K/I 계산
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_k_index(p_entity_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    k_value DECIMAL;
BEGIN
    SELECT SUM(nv.value * nv.weight) / NULLIF(SUM(nv.weight), 0)
    INTO k_value
    FROM current_node_values nv
    WHERE nv.entity_id = p_entity_id;
    
    RETURN COALESCE(k_value, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_i_index(p_entity_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    i_value DECIMAL;
BEGIN
    SELECT 
        AVG(sv.i_score) * 
        (COUNT(*) FILTER (WHERE sv.fill_status = 'FILLED')::DECIMAL / 144)
    INTO i_value
    FROM slot_values sv
    WHERE sv.entity_id = p_entity_id;
    
    RETURN COALESCE(i_value, 0);
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 권한 설정 (예시)
-- ═══════════════════════════════════════════════════════════════════════════════

-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO autus_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO autus_app;
-- REVOKE DELETE ON event_ledger FROM autus_app;  -- 이벤트는 삭제 불가
