-- ═══════════════════════════════════════════════════════════════
-- AUTUS PostgreSQL 초기화 스크립트
-- ═══════════════════════════════════════════════════════════════
-- 
-- Docker 컨테이너 최초 실행 시 자동 실행됨
-- docker-compose.yml에서 마운트됨

-- ═══════════════════════════════════════════════════════════════
-- persons 테이블
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS persons (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    level VARCHAR(10) DEFAULT 'L4',
    lat FLOAT DEFAULT 0.0,
    lng FLOAT DEFAULT 0.0,
    ki_score FLOAT DEFAULT 0.0,
    rank VARCHAR(50) DEFAULT 'Terminal',
    sector VARCHAR(100) DEFAULT '',
    parent_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_persons_level ON persons(level);
CREATE INDEX IF NOT EXISTS idx_persons_ki_score ON persons(ki_score DESC);
CREATE INDEX IF NOT EXISTS idx_persons_parent ON persons(parent_id);
CREATE INDEX IF NOT EXISTS idx_persons_level_ki ON persons(level, ki_score DESC);

-- ═══════════════════════════════════════════════════════════════
-- flows 테이블
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS flows (
    id VARCHAR(100) PRIMARY KEY,
    source_id VARCHAR(100) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    amount FLOAT NOT NULL DEFAULT 0.0,
    flow_type VARCHAR(50) DEFAULT 'trade',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT DEFAULT '',
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flows_source ON flows(source_id);
CREATE INDEX IF NOT EXISTS idx_flows_target ON flows(target_id);
CREATE INDEX IF NOT EXISTS idx_flows_source_target ON flows(source_id, target_id);
CREATE INDEX IF NOT EXISTS idx_flows_amount ON flows(amount DESC);
CREATE INDEX IF NOT EXISTS idx_flows_type ON flows(flow_type);

-- ═══════════════════════════════════════════════════════════════
-- scale_nodes 테이블
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS scale_nodes (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    level VARCHAR(10) NOT NULL,
    lat FLOAT DEFAULT 0.0,
    lng FLOAT DEFAULT 0.0,
    bounds_sw_lat FLOAT,
    bounds_sw_lng FLOAT,
    bounds_ne_lat FLOAT,
    bounds_ne_lng FLOAT,
    parent_id VARCHAR(100),
    total_mass FLOAT DEFAULT 0.0,
    total_flow FLOAT DEFAULT 0.0,
    node_count INTEGER DEFAULT 0,
    ki_score FLOAT DEFAULT 0.0,
    top_keyman_id VARCHAR(100),
    sector VARCHAR(100) DEFAULT '',
    flag VARCHAR(10) DEFAULT '',
    icon VARCHAR(10) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scale_nodes_level ON scale_nodes(level);
CREATE INDEX IF NOT EXISTS idx_scale_nodes_ki ON scale_nodes(ki_score DESC);
CREATE INDEX IF NOT EXISTS idx_scale_nodes_parent ON scale_nodes(parent_id);

-- ═══════════════════════════════════════════════════════════════
-- 샘플 데이터 (옵션)
-- ═══════════════════════════════════════════════════════════════

-- L0 World 노드
INSERT INTO scale_nodes (id, name, level, lat, lng, ki_score, flag) VALUES
    ('usa', 'USA', 'L0', 39.8, -98.5, 0.95, '🇺🇸'),
    ('china', 'China', 'L0', 35.8, 104.1, 0.89, '🇨🇳'),
    ('korea', 'Korea', 'L0', 36.5, 127.9, 0.55, '🇰🇷')
ON CONFLICT (id) DO NOTHING;

-- 샘플 Person
INSERT INTO persons (id, name, level, lat, lng, ki_score, rank, sector) VALUES
    ('larry_fink', 'Larry Fink', 'L4', 40.706, -74.009, 0.88, 'Sovereign', 'finance'),
    ('jerome_powell', 'Jerome Powell', 'L4', 38.893, -77.045, 0.85, 'Sovereign', 'central_bank'),
    ('xi_jinping', 'Xi Jinping', 'L4', 39.912, 116.38, 0.95, 'Sovereign', 'government')
ON CONFLICT (id) DO NOTHING;

-- 샘플 Flow
INSERT INTO flows (id, source_id, target_id, amount, flow_type) VALUES
    ('f1', 'usa', 'china', 500000000000, 'trade'),
    ('f2', 'china', 'usa', 450000000000, 'trade'),
    ('f3', 'larry_fink', 'jerome_powell', 200000000000, 'investment')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 완료 메시지
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE 'AUTUS 데이터베이스 초기화 완료';
END $$;

