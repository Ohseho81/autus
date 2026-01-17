-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏛️ AUTUS AFTERIMAGE SCHEMA
-- Append-Only Ledger Database Design
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 규칙:
-- - UPDATE/DELETE 권한 제거
-- - Hash chaining (이전 해시 포함)
-- - 동일 입력 → 동일 해시
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- AFTERIMAGE TABLE (Append-Only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS afterimage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기록 내용
    node_id VARCHAR(64) NOT NULL,
    gate_state VARCHAR(16) NOT NULL CHECK (gate_state IN ('OBSERVE', 'RING', 'LOCK', 'AFTERIMAGE')),
    entropy_delta DECIMAL(18, 8) NOT NULL,
    inertia_delta DECIMAL(18, 8) NOT NULL,
    lat DECIMAL(10, 6) NOT NULL,
    lng DECIMAL(11, 6) NOT NULL,
    
    -- Hash Chaining
    replay_hash VARCHAR(64) NOT NULL UNIQUE,
    previous_hash VARCHAR(64) NOT NULL,
    
    -- 환경 버전 (Reproducibility)
    environment_version VARCHAR(32) NOT NULL,
    runtime_version VARCHAR(32) NOT NULL,
    geo_data_version VARCHAR(32) NOT NULL,
    preset_version VARCHAR(32) NOT NULL,
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sequence_number BIGSERIAL NOT NULL,
    
    -- 제약 조건
    CONSTRAINT valid_coordinates CHECK (
        lat >= -90 AND lat <= 90 AND
        lng >= -180 AND lng <= 180
    ),
    CONSTRAINT hash_not_empty CHECK (
        LENGTH(replay_hash) > 0 AND
        LENGTH(previous_hash) > 0
    )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_afterimage_node_id ON afterimage(node_id);
CREATE INDEX IF NOT EXISTS idx_afterimage_gate_state ON afterimage(gate_state);
CREATE INDEX IF NOT EXISTS idx_afterimage_created_at ON afterimage(created_at);
CREATE INDEX IF NOT EXISTS idx_afterimage_replay_hash ON afterimage(replay_hash);
CREATE INDEX IF NOT EXISTS idx_afterimage_previous_hash ON afterimage(previous_hash);
CREATE INDEX IF NOT EXISTS idx_afterimage_sequence ON afterimage(sequence_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- GENESIS RECORD (최초 기록)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO afterimage (
    id,
    node_id,
    gate_state,
    entropy_delta,
    inertia_delta,
    lat,
    lng,
    replay_hash,
    previous_hash,
    environment_version,
    runtime_version,
    geo_data_version,
    preset_version
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'GENESIS',
    'OBSERVE',
    0.0,
    0.0,
    0.0,
    0.0,
    '0000000000000000000000000000000000000000000000000000000000000000',
    'GENESIS',
    '1.0.0',
    '1.0.0',
    '1.0.0',
    '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: Hash Chain Validation
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_hash_chain()
RETURNS TRIGGER AS $$
DECLARE
    last_hash VARCHAR(64);
BEGIN
    -- 이전 레코드의 해시 조회
    SELECT replay_hash INTO last_hash
    FROM afterimage
    ORDER BY sequence_number DESC
    LIMIT 1;
    
    -- Genesis가 아닌 경우 체인 검증
    IF last_hash IS NOT NULL AND NEW.previous_hash != last_hash THEN
        RAISE EXCEPTION 'Hash chain broken. Expected previous_hash: %, Got: %', 
            last_hash, NEW.previous_hash;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_hash_chain
    BEFORE INSERT ON afterimage
    FOR EACH ROW
    EXECUTE FUNCTION validate_hash_chain();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: Prevent UPDATE/DELETE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'FORBIDDEN: Afterimage records are immutable. % operation not allowed.', TG_OP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_update
    BEFORE UPDATE ON afterimage
    FOR EACH ROW
    EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER trigger_prevent_delete
    BEFORE DELETE ON afterimage
    FOR EACH ROW
    EXECUTE FUNCTION prevent_modification();

-- ─────────────────────────────────────────────────────────────────────────────
-- VIEW: Afterimage Chain (Read-Only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW afterimage_chain AS
SELECT 
    a.id,
    a.node_id,
    a.gate_state,
    a.entropy_delta,
    a.inertia_delta,
    a.lat,
    a.lng,
    a.replay_hash,
    a.previous_hash,
    a.environment_version,
    a.created_at,
    a.sequence_number,
    -- Chain 검증 정보
    LAG(a.replay_hash) OVER (ORDER BY a.sequence_number) AS expected_previous,
    CASE 
        WHEN a.previous_hash = LAG(a.replay_hash) OVER (ORDER BY a.sequence_number) 
             OR a.previous_hash = 'GENESIS'
        THEN TRUE 
        ELSE FALSE 
    END AS chain_valid
FROM afterimage a
ORDER BY a.sequence_number;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: Verify Chain Integrity
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION verify_afterimage_chain()
RETURNS TABLE (
    total_records BIGINT,
    valid_records BIGINT,
    invalid_records BIGINT,
    chain_integrity BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH chain_check AS (
        SELECT 
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE chain_valid = TRUE) AS valid,
            COUNT(*) FILTER (WHERE chain_valid = FALSE) AS invalid
        FROM afterimage_chain
    )
    SELECT 
        total,
        valid,
        invalid,
        (invalid = 0) AS chain_integrity
    FROM chain_check;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT LOG TABLE (비노출)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id VARCHAR(64) NOT NULL,
    k_scale INTEGER NOT NULL CHECK (k_scale IN (2, 4, 5, 6, 10)),
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(256) NOT NULL,
    result VARCHAR(16) NOT NULL,
    metadata JSONB,
    
    -- Audit log도 Append-only
    CONSTRAINT audit_immutable CHECK (TRUE)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);

-- Audit log도 수정 금지
CREATE TRIGGER trigger_prevent_audit_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER trigger_prevent_audit_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION prevent_modification();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLE: Read-Only Access
-- ─────────────────────────────────────────────────────────────────────────────

-- 읽기 전용 역할 생성
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'autus_readonly') THEN
        CREATE ROLE autus_readonly;
    END IF;
END
$$;

GRANT SELECT ON afterimage TO autus_readonly;
GRANT SELECT ON afterimage_chain TO autus_readonly;

-- K10 전용 역할 (Afterimage 접근)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'autus_k10') THEN
        CREATE ROLE autus_k10;
    END IF;
END
$$;

GRANT autus_readonly TO autus_k10;
GRANT SELECT ON audit_log TO autus_k10;
GRANT EXECUTE ON FUNCTION verify_afterimage_chain() TO autus_k10;

-- 앱 역할 (INSERT만 허용)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'autus_app') THEN
        CREATE ROLE autus_app;
    END IF;
END
$$;

GRANT autus_readonly TO autus_app;
GRANT INSERT ON afterimage TO autus_app;
GRANT INSERT ON audit_log TO autus_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO autus_app;

-- UPDATE/DELETE 권한 명시적 제거
REVOKE UPDATE, DELETE ON afterimage FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
