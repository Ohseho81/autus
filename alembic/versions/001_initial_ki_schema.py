"""Initial K/I Schema

Revision ID: 001
Revises: 
Create Date: 2026-01-08

K/I Physics 테이블 생성:
- entities: 엔티티 (사용자/조직)
- ki_states: K/I 상태
- node_definitions: 48노드 정의
- node_values: 노드 값
- slot_types: 슬롯 타입
- slot_values: 144슬롯 값
- automation_tasks: DAROE 자동화
- alerts: 경고
- event_ledger: 이벤트 원장
- prediction_cache: 예측 캐시
- data_sources: OAuth 데이터 소스
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQL 파일에서 스키마 로드
    # backend/db/ki_schema.sql 참조
    
    # 1. Entities (엔티티)
    op.execute("""
    CREATE TABLE IF NOT EXISTS entities (
        entity_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type     VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        metadata        JSONB DEFAULT '{}'
    );
    """)
    
    # 2. K/I States (K/I 상태)
    op.execute("""
    CREATE TABLE IF NOT EXISTS ki_states (
        id              BIGSERIAL PRIMARY KEY,
        entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
        k_index         FLOAT NOT NULL DEFAULT 0.0,
        i_index         FLOAT NOT NULL DEFAULT 0.0,
        dk_dt           FLOAT DEFAULT 0.0,
        di_dt           FLOAT DEFAULT 0.0,
        phase           VARCHAR(20) DEFAULT 'STABLE',
        measured_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(entity_id, measured_at)
    );
    CREATE INDEX IF NOT EXISTS idx_ki_states_entity ON ki_states(entity_id, measured_at DESC);
    """)
    
    # 3. Node Definitions (48노드 정의)
    op.execute("""
    CREATE TABLE IF NOT EXISTS node_definitions (
        node_id         VARCHAR(20) PRIMARY KEY,
        domain          VARCHAR(20) NOT NULL,
        node_type       VARCHAR(10) NOT NULL,
        display_name    VARCHAR(50),
        description     TEXT,
        weight          FLOAT DEFAULT 1.0,
        is_active       BOOLEAN DEFAULT TRUE
    );
    """)
    
    # 4. Node Values (노드 값)
    op.execute("""
    CREATE TABLE IF NOT EXISTS node_values (
        id              BIGSERIAL PRIMARY KEY,
        entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
        node_id         VARCHAR(20) NOT NULL REFERENCES node_definitions(node_id),
        value           FLOAT NOT NULL DEFAULT 0.0,
        measured_at     TIMESTAMPTZ DEFAULT NOW(),
        source          VARCHAR(50) DEFAULT 'manual',
        UNIQUE(entity_id, node_id, measured_at)
    );
    CREATE INDEX IF NOT EXISTS idx_node_values_entity ON node_values(entity_id, measured_at DESC);
    """)
    
    # 5. Slot Types (슬롯 타입)
    op.execute("""
    CREATE TABLE IF NOT EXISTS slot_types (
        slot_type       VARCHAR(20) PRIMARY KEY,
        max_slots       INTEGER NOT NULL,
        weight          FLOAT DEFAULT 1.0,
        description     TEXT
    );
    """)
    
    # 6. Slot Values (144슬롯)
    op.execute("""
    CREATE TABLE IF NOT EXISTS slot_values (
        id              BIGSERIAL PRIMARY KEY,
        entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
        slot_type       VARCHAR(20) NOT NULL REFERENCES slot_types(slot_type),
        slot_index      INTEGER NOT NULL,
        filled          BOOLEAN DEFAULT FALSE,
        person_id       UUID,
        strength        FLOAT DEFAULT 0.0,
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(entity_id, slot_type, slot_index)
    );
    CREATE INDEX IF NOT EXISTS idx_slot_values_entity ON slot_values(entity_id);
    """)
    
    # 7. Automation Tasks (DAROE)
    op.execute("""
    CREATE TABLE IF NOT EXISTS automation_tasks (
        task_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
        stage           VARCHAR(20) NOT NULL,
        status          VARCHAR(20) DEFAULT 'PENDING',
        priority        INTEGER DEFAULT 5,
        title           VARCHAR(200) NOT NULL,
        description     TEXT,
        target_node     VARCHAR(20),
        expected_impact FLOAT DEFAULT 0.0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        executed_at     TIMESTAMPTZ,
        result          JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_automation_entity ON automation_tasks(entity_id, status);
    """)
    
    # 8. Alerts (경고)
    op.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        alert_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
        severity        VARCHAR(20) NOT NULL DEFAULT 'INFO',
        title           VARCHAR(200) NOT NULL,
        message         TEXT,
        source          VARCHAR(50),
        acknowledged    BOOLEAN DEFAULT FALSE,
        resolved        BOOLEAN DEFAULT FALSE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        acknowledged_at TIMESTAMPTZ,
        resolved_at     TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_id, resolved, created_at DESC);
    """)
    
    # 9. Event Ledger (이벤트 원장)
    op.execute("""
    CREATE TABLE IF NOT EXISTS event_ledger (
        event_id        BIGSERIAL PRIMARY KEY,
        entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
        event_type      VARCHAR(50) NOT NULL,
        event_data      JSONB NOT NULL,
        delta_k         FLOAT DEFAULT 0.0,
        delta_i         FLOAT DEFAULT 0.0,
        source          VARCHAR(50),
        created_at      TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_events_entity ON event_ledger(entity_id, created_at DESC);
    """)
    
    # 10. Prediction Cache
    op.execute("""
    CREATE TABLE IF NOT EXISTS prediction_cache (
        id              BIGSERIAL PRIMARY KEY,
        entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
        horizon_days    INTEGER NOT NULL,
        trajectory      JSONB NOT NULL,
        confidence      FLOAT DEFAULT 0.8,
        risk_level      VARCHAR(20) DEFAULT 'MEDIUM',
        predicted_phase VARCHAR(20),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        expires_at      TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_prediction_entity ON prediction_cache(entity_id, expires_at);
    """)
    
    # 11. Data Sources (OAuth)
    op.execute("""
    CREATE TABLE IF NOT EXISTS data_sources (
        id              BIGSERIAL PRIMARY KEY,
        entity_id       UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
        source_type     VARCHAR(30) NOT NULL,
        connected       BOOLEAN DEFAULT FALSE,
        access_token    TEXT,
        refresh_token   TEXT,
        expires_at      TIMESTAMPTZ,
        last_sync       TIMESTAMPTZ,
        sync_status     VARCHAR(20) DEFAULT 'NEVER',
        metadata        JSONB DEFAULT '{}',
        UNIQUE(entity_id, source_type)
    );
    """)
    
    # 초기 데이터: 노드 정의
    op.execute("""
    INSERT INTO node_definitions (node_id, domain, node_type, display_name) VALUES
    ('CASH_A', 'SURVIVE', 'A', '현금 축적'),
    ('CASH_B', 'SURVIVE', 'B', '현금 보호'),
    ('CASH_C', 'SURVIVE', 'C', '현금 성장'),
    ('CASH_D', 'SURVIVE', 'D', '현금 순환'),
    ('TIME_A', 'SURVIVE', 'A', '시간 축적'),
    ('TIME_D', 'SURVIVE', 'D', '시간 활용'),
    ('TIME_E', 'SURVIVE', 'E', '시간 효율'),
    ('HEALTH_A', 'SURVIVE', 'A', '건강 유지'),
    ('SKILL_A', 'GROW', 'A', '스킬 습득'),
    ('SKILL_D', 'GROW', 'D', '스킬 활용'),
    ('KNOWLEDGE_A', 'GROW', 'A', '지식 축적'),
    ('NET_A', 'RELATE', 'A', '네트워크 확장'),
    ('NET_D', 'RELATE', 'D', '네트워크 활성화'),
    ('NET_E', 'RELATE', 'E', '네트워크 심화'),
    ('FAMILY_A', 'RELATE', 'A', '가족 유대'),
    ('FAMILY_B', 'RELATE', 'B', '가족 안전'),
    ('TEAM_A', 'RELATE', 'A', '팀 협력'),
    ('TEAM_D', 'RELATE', 'D', '팀 성과'),
    ('BRAND_A', 'EXPRESS', 'A', '브랜드 구축'),
    ('BRAND_C', 'EXPRESS', 'C', '브랜드 성장'),
    ('LEGACY_A', 'EXPRESS', 'A', '레거시 축적'),
    ('LEGACY_D', 'EXPRESS', 'D', '레거시 전파'),
    ('WORK_A', 'GROW', 'A', '업무 수행'),
    ('WORK_D', 'GROW', 'D', '업무 완료')
    ON CONFLICT (node_id) DO NOTHING;
    """)
    
    # 초기 데이터: 슬롯 타입
    op.execute("""
    INSERT INTO slot_types (slot_type, max_slots, weight, description) VALUES
    ('FAMILY', 12, 2.0, '가족 관계'),
    ('FRIEND', 24, 1.5, '친구 관계'),
    ('COLLEAGUE', 36, 1.0, '동료 관계'),
    ('MENTOR', 6, 2.5, '멘토 관계'),
    ('MENTEE', 12, 1.5, '멘티 관계'),
    ('PARTNER', 6, 3.0, '파트너 관계'),
    ('COMMUNITY', 48, 0.5, '커뮤니티 관계')
    ON CONFLICT (slot_type) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS data_sources CASCADE;")
    op.execute("DROP TABLE IF EXISTS prediction_cache CASCADE;")
    op.execute("DROP TABLE IF EXISTS event_ledger CASCADE;")
    op.execute("DROP TABLE IF EXISTS alerts CASCADE;")
    op.execute("DROP TABLE IF EXISTS automation_tasks CASCADE;")
    op.execute("DROP TABLE IF EXISTS slot_values CASCADE;")
    op.execute("DROP TABLE IF EXISTS slot_types CASCADE;")
    op.execute("DROP TABLE IF EXISTS node_values CASCADE;")
    op.execute("DROP TABLE IF EXISTS node_definitions CASCADE;")
    op.execute("DROP TABLE IF EXISTS ki_states CASCADE;")
    op.execute("DROP TABLE IF EXISTS entities CASCADE;")
