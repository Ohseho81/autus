-- ============================================
-- AUTUS v1.0 Afterimage Schema (Physics-Only)
-- 결정론 보증 · 감사/재생 전용 · 우회 불가 증거
-- ============================================

-- Drop existing table if exists (개발 환경용)
-- DROP TABLE IF EXISTS afterimage_v1;

CREATE TABLE IF NOT EXISTS afterimage_v1 (
    -- ========================================
    -- 기본 식별자
    -- ========================================
    id SERIAL PRIMARY KEY,
    hash VARCHAR(64) NOT NULL UNIQUE,  -- 결정 해시 (불변, SHA-256)
    previous_hash VARCHAR(64),          -- 체인 연결 (첫 레코드는 NULL)
    
    -- ========================================
    -- 시간 & 행위자
    -- ========================================
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- ISO8601 서버 시간
    actor_scope VARCHAR(10) NOT NULL CHECK (actor_scope IN ('K2', 'K4', 'K6', 'K10', 'AUDIT')),
    
    -- ========================================
    -- 입력 (Input) - JSONB
    -- ========================================
    input_constants JSONB NOT NULL,
    -- 구조: { "M": float, "Psi": float, "R": float, "F0": float }
    
    input_env JSONB NOT NULL,
    -- 구조: { "time_density": float, "spatial_density": float, "context_risk": float }
    
    -- ========================================
    -- 버전 (결정론 재생용)
    -- ========================================
    weights_version VARCHAR(32) NOT NULL,     -- 예: "phys-w1.0"
    thresholds_version VARCHAR(32) NOT NULL,  -- 예: "phys-t1.0"
    
    -- ========================================
    -- 결과 (Output)
    -- ========================================
    score_s DECIMAL(10, 6) NOT NULL,  -- 물리 점수 S
    gate_result VARCHAR(10) NOT NULL CHECK (gate_result IN ('PASS', 'RING', 'BOUNCE', 'LOCK')),
    cooldown_applied DECIMAL(10, 4) NOT NULL DEFAULT 0,  -- 회복 지연 (초)
    
    -- ========================================
    -- UI 효과 (체감 메타, 텍스트 없음)
    -- ========================================
    ui_effects VARCHAR(50),  -- 예: "blur:0.3,delay:150ms"
    
    -- ========================================
    -- 스키마 버전
    -- ========================================
    schema_v VARCHAR(10) NOT NULL DEFAULT '1.0',
    
    -- ========================================
    -- 제약조건
    -- ========================================
    CONSTRAINT valid_score CHECK (score_s >= 0),
    CONSTRAINT valid_cooldown CHECK (cooldown_applied >= 0)
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_afterimage_ts ON afterimage_v1(ts DESC);
CREATE INDEX IF NOT EXISTS idx_afterimage_actor ON afterimage_v1(actor_scope);
CREATE INDEX IF NOT EXISTS idx_afterimage_gate ON afterimage_v1(gate_result);
CREATE INDEX IF NOT EXISTS idx_afterimage_hash ON afterimage_v1(hash);

-- ============================================
-- Append-Only 보장: UPDATE/DELETE 금지 트리거
-- ============================================
CREATE OR REPLACE FUNCTION prevent_afterimage_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Afterimage records are immutable. UPDATE/DELETE not allowed.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS afterimage_immutable_update ON afterimage_v1;
CREATE TRIGGER afterimage_immutable_update
    BEFORE UPDATE ON afterimage_v1
    FOR EACH ROW
    EXECUTE FUNCTION prevent_afterimage_modification();

DROP TRIGGER IF EXISTS afterimage_immutable_delete ON afterimage_v1;
CREATE TRIGGER afterimage_immutable_delete
    BEFORE DELETE ON afterimage_v1
    FOR EACH ROW
    EXECUTE FUNCTION prevent_afterimage_modification();

-- ============================================
-- 해시 체이닝 자동화 트리거
-- ============================================
CREATE OR REPLACE FUNCTION set_previous_hash()
RETURNS TRIGGER AS $$
DECLARE
    last_hash VARCHAR(64);
BEGIN
    SELECT hash INTO last_hash 
    FROM afterimage_v1 
    ORDER BY id DESC 
    LIMIT 1;
    
    NEW.previous_hash := last_hash;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS afterimage_chain ON afterimage_v1;
CREATE TRIGGER afterimage_chain
    BEFORE INSERT ON afterimage_v1
    FOR EACH ROW
    EXECUTE FUNCTION set_previous_hash();

-- ============================================
-- 뷰: K10/Audit 전용 조회
-- ============================================
CREATE OR REPLACE VIEW afterimage_audit_view AS
SELECT 
    hash,
    ts,
    actor_scope,
    gate_result,
    score_s,
    weights_version,
    thresholds_version,
    schema_v
FROM afterimage_v1
ORDER BY ts DESC;

-- ============================================
-- 통계 뷰 (내부 분석용)
-- ============================================
CREATE OR REPLACE VIEW afterimage_stats AS
SELECT 
    gate_result,
    COUNT(*) as count,
    AVG(score_s) as avg_score,
    AVG(cooldown_applied) as avg_cooldown
FROM afterimage_v1
GROUP BY gate_result;

-- ============================================
-- 코멘트
-- ============================================
COMMENT ON TABLE afterimage_v1 IS 'AUTUS v1.0 Afterimage - Immutable decision ledger (Physics-Only)';
COMMENT ON COLUMN afterimage_v1.hash IS 'Deterministic hash of decision (immutable)';
COMMENT ON COLUMN afterimage_v1.gate_result IS 'Gate outcome: PASS, RING, BOUNCE, LOCK';
COMMENT ON COLUMN afterimage_v1.ui_effects IS 'Physical sensation metadata (no text)';
