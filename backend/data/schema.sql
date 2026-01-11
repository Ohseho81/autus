-- ============================================
-- AUTUS Database Schema
-- ============================================
-- 
-- Charter 준수:
-- - 최소 수집: 계산에 필요한 숫자만
-- - 휘발성: 사용자가 떠나면 삭제
-- - 단방향: 제3자 공유 없음
--
-- ============================================

-- Users 테이블
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    type_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted'))
);

-- User Variables 테이블
CREATE TABLE IF NOT EXISTS user_variables (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    variable TEXT NOT NULL,
    prior DOUBLE PRECISION NOT NULL,
    posterior DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, variable)
);

-- User Interactions 테이블
CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    state JSONB NOT NULL,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_variables_user_id ON user_variables(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(user_id, timestamp);

-- ============================================
-- 함수: 사용자 완전 삭제
-- ============================================

CREATE OR REPLACE FUNCTION delete_user_completely(p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM users WHERE user_id = p_user_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 함수: 데이터 내보내기
-- ============================================

CREATE OR REPLACE FUNCTION export_user_data(p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user', (SELECT row_to_json(u) FROM users u WHERE user_id = p_user_id),
        'variables', (SELECT jsonb_agg(row_to_json(v)) FROM user_variables v WHERE user_id = p_user_id),
        'interactions', (SELECT jsonb_agg(row_to_json(i)) FROM user_interactions i WHERE user_id = p_user_id)
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 뷰: 사용자 요약
-- ============================================

CREATE OR REPLACE VIEW user_summary AS
SELECT 
    u.user_id,
    u.type_id,
    u.created_at,
    COUNT(DISTINCT v.variable) as variable_count,
    COUNT(DISTINCT i.id) as interaction_count,
    MAX(v.confidence) as max_confidence,
    MAX(i.timestamp) as last_interaction
FROM users u
LEFT JOIN user_variables v ON u.user_id = v.user_id
LEFT JOIN user_interactions i ON u.user_id = i.user_id
WHERE u.status = 'active'
GROUP BY u.user_id, u.type_id, u.created_at;

-- ============================================
-- 트리거: 자동 업데이트 시간
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_variables_updated_at
    BEFORE UPDATE ON user_variables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
