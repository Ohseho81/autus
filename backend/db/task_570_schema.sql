-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS v4.0 - 570개 업무 개인화 스키마
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 핵심 상수:
--   K (개인 상수): 에너지 투입 대비 출력 효율
--   I (상호호환 상수): 노드 간 연결 시너지/갈등
--   r (지수): 쇠퇴/성장율
--
-- 레이어:
--   L1: 공통 엔진 (50개)
--   L2: 도메인 로직 (120개)
--   L3: 엣지 자동화 (400개)
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 사용자 타입 (6가지)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE user_type AS ENUM (
    'INDIVIDUAL',      -- 개인
    'SMALL_TEAM',      -- 소규모 팀 (2-10명)
    'SMB',             -- 중소기업 (11-500명)
    'ENTERPRISE',      -- 대기업 (500+명)
    'NATION',          -- 국가
    'GLOBAL'           -- 글로벌
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 업무 레이어
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE task_layer AS ENUM (
    'COMMON',          -- L1: 공통 엔진 (50개)
    'DOMAIN',          -- L2: 도메인 로직 (120개)
    'EDGE'             -- L3: 엣지 자동화 (400개)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. 업무 상태
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE task_status AS ENUM (
    'ACTIVE',          -- 활성
    'PAUSED',          -- 일시 정지
    'DECAYING',        -- 쇠퇴 중 (r < 0)
    'ELIMINATED',      -- 소멸됨
    'MANUAL_ONLY'      -- 수동만
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. 업무 정의 테이블 (570개 마스터)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_definitions (
    task_id             VARCHAR(50) PRIMARY KEY,
    layer               task_layer NOT NULL,
    category            VARCHAR(50) NOT NULL,
    subcategory         VARCHAR(50),
    
    -- 기본 정보
    name_en             VARCHAR(100) NOT NULL,
    name_ko             VARCHAR(100) NOT NULL,
    description         TEXT,
    
    -- 기본 상수 (타입별로 조정됨)
    base_k              FLOAT DEFAULT 1.0,        -- 기본 K 상수
    base_i              FLOAT DEFAULT 0.0,        -- 기본 I 상수
    base_r              FLOAT DEFAULT 0.0,        -- 기본 r 지수
    
    -- 자동화 설정
    automation_level    INTEGER DEFAULT 50,       -- 0-100 (0=수동, 100=완전자동)
    energy_cost         FLOAT DEFAULT 1.0,        -- 에너지 소비량
    
    -- 외부 툴 연결
    external_tool       VARCHAR(50),              -- databricks, uipath, zapier 등
    api_endpoint        VARCHAR(200),             -- 트리거 API
    
    -- 타입별 활성화
    enabled_types       user_type[] DEFAULT ARRAY['INDIVIDUAL', 'SMALL_TEAM', 'SMB', 'ENTERPRISE']::user_type[],
    
    -- 메타
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_layer ON task_definitions(layer);
CREATE INDEX idx_task_category ON task_definitions(category);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. 사용자별 업무 상태 (개인화)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_tasks (
    id                  BIGSERIAL PRIMARY KEY,
    entity_id           UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    task_id             VARCHAR(50) NOT NULL REFERENCES task_definitions(task_id),
    
    -- 사용자 타입
    user_type           user_type NOT NULL DEFAULT 'INDIVIDUAL',
    
    -- 개인화된 상수
    personal_k          FLOAT NOT NULL DEFAULT 1.0,    -- K: 개인 효율 상수
    personal_i          FLOAT NOT NULL DEFAULT 0.0,    -- I: 상호호환 상수
    personal_r          FLOAT NOT NULL DEFAULT 0.0,    -- r: 성장/쇠퇴 지수
    
    -- 상태
    status              task_status DEFAULT 'ACTIVE',
    automation_level    INTEGER DEFAULT 50,            -- 개인화된 자동화 레벨
    
    -- 실행 통계
    execution_count     INTEGER DEFAULT 0,
    success_count       INTEGER DEFAULT 0,
    failure_count       INTEGER DEFAULT 0,
    last_executed_at    TIMESTAMPTZ,
    
    -- 에너지 통계
    total_energy_spent  FLOAT DEFAULT 0.0,
    avg_energy_per_exec FLOAT DEFAULT 0.0,
    
    -- 메타
    enabled             BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_id, task_id)
);

CREATE INDEX idx_user_tasks_entity ON user_tasks(entity_id);
CREATE INDEX idx_user_tasks_status ON user_tasks(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. K/I/r 이력 (상수 변화 추적)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kir_history (
    id                  BIGSERIAL PRIMARY KEY,
    entity_id           UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    task_id             VARCHAR(50) NOT NULL REFERENCES task_definitions(task_id),
    
    -- 상수 스냅샷
    k_value             FLOAT NOT NULL,
    i_value             FLOAT NOT NULL,
    r_value             FLOAT NOT NULL,
    
    -- 변화량
    delta_k             FLOAT DEFAULT 0.0,
    delta_i             FLOAT DEFAULT 0.0,
    delta_r             FLOAT DEFAULT 0.0,
    
    -- 트리거 이유
    trigger_reason      VARCHAR(100),   -- 'execution', 'decay', 'synergy', 'conflict'
    
    measured_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kir_history_entity ON kir_history(entity_id, measured_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. 업무 실행 로그
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_executions (
    execution_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id           UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    task_id             VARCHAR(50) NOT NULL REFERENCES task_definitions(task_id),
    
    -- 실행 정보
    execution_type      VARCHAR(20) NOT NULL,   -- 'auto', 'manual', 'triggered'
    external_tool       VARCHAR(50),
    api_call            TEXT,
    
    -- 결과
    success             BOOLEAN NOT NULL,
    result_data         JSONB,
    error_message       TEXT,
    
    -- 에너지
    energy_consumed     FLOAT DEFAULT 0.0,
    
    -- K/I/r 영향
    k_impact            FLOAT DEFAULT 0.0,
    i_impact            FLOAT DEFAULT 0.0,
    r_impact            FLOAT DEFAULT 0.0,
    
    -- 타임스탬프
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    duration_ms         INTEGER
);

CREATE INDEX idx_task_exec_entity ON task_executions(entity_id, started_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. 외부 툴 연결 설정
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS external_tool_configs (
    id                  BIGSERIAL PRIMARY KEY,
    entity_id           UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    
    tool_name           VARCHAR(50) NOT NULL,   -- 'databricks', 'uipath', 'zapier', 'slack'
    tool_type           VARCHAR(20) NOT NULL,   -- 'automation', 'notification', 'analytics'
    
    -- 연결 정보
    api_url             VARCHAR(500),
    api_key             TEXT,                   -- 암호화 저장
    webhook_url         VARCHAR(500),
    
    -- 상태
    connected           BOOLEAN DEFAULT FALSE,
    last_sync           TIMESTAMPTZ,
    
    -- 설정
    config              JSONB DEFAULT '{}',
    
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_id, tool_name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. 자동화 규칙 (K/I/r 기반 트리거)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_rules (
    rule_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id           UUID REFERENCES entities(entity_id) ON DELETE CASCADE,  -- NULL = 글로벌 규칙
    task_id             VARCHAR(50) REFERENCES task_definitions(task_id),       -- NULL = 모든 업무
    
    -- 조건
    condition_type      VARCHAR(30) NOT NULL,   -- 'K_THRESHOLD', 'I_THRESHOLD', 'R_DECAY', 'TIME_BASED'
    condition_operator  VARCHAR(10) NOT NULL,   -- '>', '<', '>=', '<=', '=='
    condition_value     FLOAT NOT NULL,
    
    -- 액션
    action_type         VARCHAR(30) NOT NULL,   -- 'ADJUST_AUTOMATION', 'ELIMINATE', 'NOTIFY', 'TRIGGER_TOOL'
    action_params       JSONB NOT NULL,
    
    -- 우선순위
    priority            INTEGER DEFAULT 5,      -- 1(최고) ~ 10(최저)
    
    -- 상태
    enabled             BOOLEAN DEFAULT TRUE,
    last_triggered_at   TIMESTAMPTZ,
    trigger_count       INTEGER DEFAULT 0,
    
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_entity ON automation_rules(entity_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. 소멸 대기열 (r < 0 업무)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS elimination_queue (
    id                  BIGSERIAL PRIMARY KEY,
    entity_id           UUID NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
    task_id             VARCHAR(50) NOT NULL REFERENCES task_definitions(task_id),
    
    -- 소멸 조건
    reason              VARCHAR(50) NOT NULL,   -- 'R_DECAY', 'I_CONFLICT', 'K_INEFFICIENT', 'MANUAL'
    current_r           FLOAT NOT NULL,
    days_in_decay       INTEGER DEFAULT 0,
    
    -- 예상 소멸일
    estimated_elimination_at TIMESTAMPTZ,
    
    -- 상태
    status              VARCHAR(20) DEFAULT 'PENDING',  -- 'PENDING', 'APPROVED', 'ELIMINATED', 'RESCUED'
    approved_at         TIMESTAMPTZ,
    eliminated_at       TIMESTAMPTZ,
    
    created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 초기 데이터: 공통 엔진 50개 (Layer 1)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO task_definitions (task_id, layer, category, subcategory, name_en, name_ko, description, base_k, base_i, base_r, automation_level, external_tool, api_endpoint) VALUES

-- ─────────────────────────────────────────────────────────────────────────────
-- 인증 & 보안 (AUTH) - 8개
-- ─────────────────────────────────────────────────────────────────────────────
('L1_AUTH_001', 'COMMON', 'AUTH', 'TOKEN', 'OAuth2 Token Issue', 'OAuth2 토큰 발행', 'OAuth2 액세스 토큰 발행 및 갱신', 1.2, 0.0, 0.0, 95, 'internal', '/api/auth/token'),
('L1_AUTH_002', 'COMMON', 'AUTH', 'TOKEN', 'JWT Verification', 'JWT 검증', 'JWT 토큰 유효성 검증', 1.5, 0.0, 0.0, 100, 'internal', '/api/auth/verify'),
('L1_AUTH_003', 'COMMON', 'AUTH', '2FA', '2FA Setup', '2단계 인증 설정', 'TOTP/SMS 기반 2FA 설정', 1.0, 0.1, 0.0, 80, 'internal', '/api/auth/2fa/setup'),
('L1_AUTH_004', 'COMMON', 'AUTH', '2FA', '2FA Verify', '2단계 인증 검증', '2FA 코드 검증', 1.3, 0.0, 0.0, 100, 'internal', '/api/auth/2fa/verify'),
('L1_AUTH_005', 'COMMON', 'AUTH', 'SESSION', 'Session Management', '세션 관리', '사용자 세션 생성/종료/연장', 1.1, 0.0, 0.0, 90, 'redis', NULL),
('L1_AUTH_006', 'COMMON', 'AUTH', 'PERMISSION', 'Role Assignment', '역할 할당', 'RBAC 기반 역할 할당', 0.9, 0.2, 0.0, 70, 'internal', '/api/auth/roles'),
('L1_AUTH_007', 'COMMON', 'AUTH', 'PERMISSION', 'Permission Check', '권한 검사', '리소스 접근 권한 검사', 1.4, 0.0, 0.0, 100, 'internal', '/api/auth/permissions'),
('L1_AUTH_008', 'COMMON', 'AUTH', 'AUDIT', 'Security Audit Log', '보안 감사 로그', '보안 이벤트 감사 로깅', 1.0, 0.0, 0.0, 100, 'internal', '/api/audit/security'),

-- ─────────────────────────────────────────────────────────────────────────────
-- 알림 발송 (NOTIFY) - 10개
-- ─────────────────────────────────────────────────────────────────────────────
('L1_NOTIFY_001', 'COMMON', 'NOTIFY', 'EMAIL', 'Email Send', '이메일 발송', '트랜잭션 이메일 발송', 0.8, 0.1, 0.0, 95, 'sendgrid', 'https://api.sendgrid.com/v3/mail/send'),
('L1_NOTIFY_002', 'COMMON', 'NOTIFY', 'EMAIL', 'Email Template Render', '이메일 템플릿 렌더링', '동적 이메일 템플릿 생성', 1.0, 0.0, 0.0, 90, 'internal', '/api/notify/email/render'),
('L1_NOTIFY_003', 'COMMON', 'NOTIFY', 'SMS', 'SMS Send', 'SMS 발송', 'SMS/MMS 메시지 발송', 0.7, 0.0, 0.0, 90, 'twilio', 'https://api.twilio.com/2010-04-01/Messages'),
('L1_NOTIFY_004', 'COMMON', 'NOTIFY', 'PUSH', 'Push Notification', '푸시 알림', '모바일/웹 푸시 알림', 0.9, 0.1, 0.0, 95, 'firebase', 'https://fcm.googleapis.com/fcm/send'),
('L1_NOTIFY_005', 'COMMON', 'NOTIFY', 'SLACK', 'Slack Message', 'Slack 메시지', 'Slack 채널/DM 메시지', 0.8, 0.3, 0.0, 90, 'slack', 'https://slack.com/api/chat.postMessage'),
('L1_NOTIFY_006', 'COMMON', 'NOTIFY', 'SLACK', 'Slack Interactive', 'Slack 인터랙티브', 'Slack 버튼/모달 응답', 0.9, 0.2, 0.0, 85, 'slack', 'https://slack.com/api/views.open'),
('L1_NOTIFY_007', 'COMMON', 'NOTIFY', 'WEBHOOK', 'Webhook Call', '웹훅 호출', '외부 서비스 웹훅 트리거', 1.0, 0.0, 0.0, 100, 'internal', '/api/notify/webhook'),
('L1_NOTIFY_008', 'COMMON', 'NOTIFY', 'IN_APP', 'In-App Notification', '인앱 알림', '앱 내 알림 생성', 1.1, 0.1, 0.0, 95, 'internal', '/api/notify/in-app'),
('L1_NOTIFY_009', 'COMMON', 'NOTIFY', 'BATCH', 'Batch Notification', '일괄 알림', '대량 알림 일괄 발송', 0.6, 0.0, 0.0, 85, 'internal', '/api/notify/batch'),
('L1_NOTIFY_010', 'COMMON', 'NOTIFY', 'PREFERENCE', 'Notification Preference', '알림 설정 관리', '사용자 알림 선호도 관리', 0.9, 0.1, 0.0, 70, 'internal', '/api/notify/preferences'),

-- ─────────────────────────────────────────────────────────────────────────────
-- 로그 수집 (LOG) - 8개
-- ─────────────────────────────────────────────────────────────────────────────
('L1_LOG_001', 'COMMON', 'LOG', 'EVENT', 'Event Logging', '이벤트 로깅', '비즈니스 이벤트 원천 로깅', 1.2, 0.0, 0.0, 100, 'internal', '/api/log/event'),
('L1_LOG_002', 'COMMON', 'LOG', 'EVENT', 'Event Replay', '이벤트 재생', '이벤트 소싱 재생', 1.0, 0.0, 0.0, 80, 'internal', '/api/log/replay'),
('L1_LOG_003', 'COMMON', 'LOG', 'METRIC', 'Metric Collection', '메트릭 수집', '시스템/비즈니스 메트릭 수집', 1.1, 0.0, 0.0, 100, 'prometheus', 'http://prometheus:9090/api/v1/write'),
('L1_LOG_004', 'COMMON', 'LOG', 'TRACE', 'Distributed Tracing', '분산 추적', '요청 흐름 분산 추적', 1.0, 0.0, 0.0, 95, 'jaeger', 'http://jaeger:14268/api/traces'),
('L1_LOG_005', 'COMMON', 'LOG', 'ERROR', 'Error Capture', '에러 캡처', '에러/예외 자동 캡처', 1.3, 0.0, 0.0, 100, 'sentry', 'https://sentry.io/api/'),
('L1_LOG_006', 'COMMON', 'LOG', 'AUDIT', 'Audit Trail', '감사 추적', '변경 이력 감사 로그', 1.0, 0.0, 0.0, 100, 'internal', '/api/log/audit'),
('L1_LOG_007', 'COMMON', 'LOG', 'ARCHIVE', 'Log Archive', '로그 아카이브', '오래된 로그 아카이빙', 0.8, 0.0, -0.01, 90, 'databricks', 'https://databricks.com/api/archive'),
('L1_LOG_008', 'COMMON', 'LOG', 'SEARCH', 'Log Search', '로그 검색', '통합 로그 검색', 1.0, 0.0, 0.0, 85, 'elasticsearch', 'http://elasticsearch:9200/_search'),

-- ─────────────────────────────────────────────────────────────────────────────
-- 데이터 저장 (DATA) - 10개
-- ─────────────────────────────────────────────────────────────────────────────
('L1_DATA_001', 'COMMON', 'DATA', 'CRUD', 'Data Create', '데이터 생성', '엔티티 데이터 생성', 1.0, 0.0, 0.0, 95, 'postgres', NULL),
('L1_DATA_002', 'COMMON', 'DATA', 'CRUD', 'Data Read', '데이터 조회', '엔티티 데이터 조회', 1.2, 0.0, 0.0, 100, 'postgres', NULL),
('L1_DATA_003', 'COMMON', 'DATA', 'CRUD', 'Data Update', '데이터 수정', '엔티티 데이터 업데이트', 0.9, 0.0, 0.0, 90, 'postgres', NULL),
('L1_DATA_004', 'COMMON', 'DATA', 'CRUD', 'Data Delete', '데이터 삭제', '엔티티 데이터 삭제 (소프트)', 1.0, 0.0, 0.0, 85, 'postgres', NULL),
('L1_DATA_005', 'COMMON', 'DATA', 'CACHE', 'Cache Set', '캐시 저장', 'Redis 캐시 저장', 1.3, 0.0, 0.0, 100, 'redis', NULL),
('L1_DATA_006', 'COMMON', 'DATA', 'CACHE', 'Cache Invalidate', '캐시 무효화', 'Redis 캐시 무효화', 1.2, 0.0, 0.0, 100, 'redis', NULL),
('L1_DATA_007', 'COMMON', 'DATA', 'FILE', 'File Upload', '파일 업로드', 'S3/GCS 파일 업로드', 0.8, 0.0, 0.0, 90, 's3', 'https://s3.amazonaws.com/'),
('L1_DATA_008', 'COMMON', 'DATA', 'FILE', 'File Download', '파일 다운로드', 'S3/GCS 파일 다운로드', 0.9, 0.0, 0.0, 95, 's3', 'https://s3.amazonaws.com/'),
('L1_DATA_009', 'COMMON', 'DATA', 'SYNC', 'Data Sync', '데이터 동기화', '외부 시스템 데이터 동기화', 0.7, 0.2, 0.0, 80, 'internal', '/api/data/sync'),
('L1_DATA_010', 'COMMON', 'DATA', 'BACKUP', 'Data Backup', '데이터 백업', '자동 데이터 백업', 0.9, 0.0, 0.0, 95, 'databricks', 'https://databricks.com/api/backup'),

-- ─────────────────────────────────────────────────────────────────────────────
-- 스케줄링 (SCHEDULE) - 6개
-- ─────────────────────────────────────────────────────────────────────────────
('L1_SCHED_001', 'COMMON', 'SCHEDULE', 'CRON', 'Cron Job Create', '크론잡 생성', '반복 작업 스케줄 생성', 1.0, 0.0, 0.0, 85, 'internal', '/api/schedule/cron'),
('L1_SCHED_002', 'COMMON', 'SCHEDULE', 'CRON', 'Cron Job Execute', '크론잡 실행', '스케줄된 작업 실행', 1.1, 0.0, 0.0, 100, 'internal', '/api/schedule/execute'),
('L1_SCHED_003', 'COMMON', 'SCHEDULE', 'DELAY', 'Delayed Task', '지연 작업', '특정 시간 후 작업 실행', 1.0, 0.0, 0.0, 95, 'redis', NULL),
('L1_SCHED_004', 'COMMON', 'SCHEDULE', 'QUEUE', 'Task Queue', '작업 큐', '비동기 작업 큐 관리', 1.1, 0.0, 0.0, 95, 'redis', NULL),
('L1_SCHED_005', 'COMMON', 'SCHEDULE', 'WORKFLOW', 'Workflow Trigger', '워크플로 트리거', '복합 워크플로 트리거', 0.9, 0.1, 0.0, 80, 'databricks', 'https://databricks.com/api/jobs/run'),
('L1_SCHED_006', 'COMMON', 'SCHEDULE', 'RETRY', 'Retry Handler', '재시도 처리', '실패 작업 자동 재시도', 1.0, 0.0, 0.0, 95, 'internal', '/api/schedule/retry'),

-- ─────────────────────────────────────────────────────────────────────────────
-- 에너지 관리 (ENERGY) - 8개
-- ─────────────────────────────────────────────────────────────────────────────
('L1_ENERGY_001', 'COMMON', 'ENERGY', 'MEASURE', 'Energy Measure', '에너지 측정', '업무별 에너지 소비 측정', 1.0, 0.0, 0.0, 100, 'internal', '/api/energy/measure'),
('L1_ENERGY_002', 'COMMON', 'ENERGY', 'BALANCE', 'Energy Balance Check', '에너지 균형 체크', 'K 상수 기반 균형 검사', 1.2, 0.0, 0.0, 95, 'internal', '/api/energy/balance'),
('L1_ENERGY_003', 'COMMON', 'ENERGY', 'OPTIMIZE', 'Energy Optimize', '에너지 최적화', 'K < 1 시 자동 최적화', 0.9, 0.0, 0.0, 80, 'internal', '/api/energy/optimize'),
('L1_ENERGY_004', 'COMMON', 'ENERGY', 'ALERT', 'Low Energy Alert', '저에너지 경고', 'K 임계값 도달 시 알림', 1.0, 0.1, 0.0, 90, 'internal', '/api/energy/alert'),
('L1_ENERGY_005', 'COMMON', 'ENERGY', 'DECAY', 'Decay Calculator', '쇠퇴 계산기', 'r 지수 기반 쇠퇴율 계산', 1.1, 0.0, 0.0, 100, 'internal', '/api/energy/decay'),
('L1_ENERGY_006', 'COMMON', 'ENERGY', 'GROWTH', 'Growth Calculator', '성장 계산기', 'r 지수 기반 성장율 계산', 1.1, 0.0, 0.0, 100, 'internal', '/api/energy/growth'),
('L1_ENERGY_007', 'COMMON', 'ENERGY', 'SYNERGY', 'Synergy Calculator', '시너지 계산기', 'I 상수 기반 시너지 계산', 1.0, 0.2, 0.0, 95, 'internal', '/api/energy/synergy'),
('L1_ENERGY_008', 'COMMON', 'ENERGY', 'REPORT', 'Energy Report', '에너지 리포트', '일/주/월 에너지 리포트', 0.8, 0.0, 0.0, 85, 'internal', '/api/energy/report')

ON CONFLICT (task_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 초기 자동화 규칙 (글로벌)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO automation_rules (entity_id, task_id, condition_type, condition_operator, condition_value, action_type, action_params, priority) VALUES

-- K < 0.8 시 자동화 레벨 20% 감소
(NULL, NULL, 'K_THRESHOLD', '<', 0.8, 'ADJUST_AUTOMATION', '{"delta": -20, "min": 20}', 3),

-- K > 1.2 시 자동화 레벨 20% 증가
(NULL, NULL, 'K_THRESHOLD', '>', 1.2, 'ADJUST_AUTOMATION', '{"delta": 20, "max": 100}', 4),

-- I < -0.3 시 알림 발송 + 소멸 큐 추가
(NULL, NULL, 'I_THRESHOLD', '<', -0.3, 'NOTIFY', '{"type": "warning", "message": "Negative synergy detected"}', 2),

-- r < -0.05 시 소멸 큐 추가
(NULL, NULL, 'R_DECAY', '<', -0.05, 'ELIMINATE', '{"queue": true, "days_to_eliminate": 30}', 1),

-- r > 0.1 시 자동화 강화
(NULL, NULL, 'R_DECAY', '>', 0.1, 'ADJUST_AUTOMATION', '{"delta": 30, "max": 100}', 5)

ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 뷰: K/I/r 기반 업무 현황
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_task_kir_status AS
SELECT 
    ut.entity_id,
    ut.task_id,
    td.name_ko,
    td.layer,
    td.category,
    ut.user_type,
    ut.personal_k,
    ut.personal_i,
    ut.personal_r,
    ut.status,
    ut.automation_level,
    ut.execution_count,
    ut.total_energy_spent,
    -- K 상태 판정
    CASE 
        WHEN ut.personal_k >= 1.2 THEN 'THRIVING'
        WHEN ut.personal_k >= 0.8 THEN 'STABLE'
        WHEN ut.personal_k >= 0.5 THEN 'STRUGGLING'
        ELSE 'CRITICAL'
    END AS k_status,
    -- I 상태 판정
    CASE 
        WHEN ut.personal_i >= 0.3 THEN 'HIGH_SYNERGY'
        WHEN ut.personal_i >= 0 THEN 'NEUTRAL'
        WHEN ut.personal_i >= -0.3 THEN 'LOW_CONFLICT'
        ELSE 'HIGH_CONFLICT'
    END AS i_status,
    -- r 상태 판정
    CASE 
        WHEN ut.personal_r >= 0.05 THEN 'GROWING'
        WHEN ut.personal_r >= -0.02 THEN 'STABLE'
        WHEN ut.personal_r >= -0.05 THEN 'DECLINING'
        ELSE 'DECAYING'
    END AS r_status
FROM user_tasks ut
JOIN task_definitions td ON ut.task_id = td.task_id
WHERE ut.enabled = TRUE;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 함수: K/I/r 재계산
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_kir(
    p_entity_id UUID,
    p_task_id VARCHAR(50)
) RETURNS TABLE(new_k FLOAT, new_i FLOAT, new_r FLOAT) AS $$
DECLARE
    v_success_rate FLOAT;
    v_energy_efficiency FLOAT;
    v_execution_count INTEGER;
    v_current_k FLOAT;
    v_current_i FLOAT;
    v_current_r FLOAT;
BEGIN
    -- 현재 값 조회
    SELECT personal_k, personal_i, personal_r, execution_count
    INTO v_current_k, v_current_i, v_current_r, v_execution_count
    FROM user_tasks
    WHERE entity_id = p_entity_id AND task_id = p_task_id;
    
    -- 성공률 계산
    SELECT 
        CASE WHEN COUNT(*) > 0 THEN 
            SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*)
        ELSE 0.5 END
    INTO v_success_rate
    FROM task_executions
    WHERE entity_id = p_entity_id 
      AND task_id = p_task_id
      AND started_at > NOW() - INTERVAL '30 days';
    
    -- 에너지 효율 계산
    SELECT COALESCE(AVG(
        CASE WHEN energy_consumed > 0 THEN 
            CASE WHEN success THEN 1.0 / energy_consumed ELSE 0 END
        ELSE 1.0 END
    ), 1.0)
    INTO v_energy_efficiency
    FROM task_executions
    WHERE entity_id = p_entity_id 
      AND task_id = p_task_id
      AND started_at > NOW() - INTERVAL '30 days';
    
    -- K 재계산 (성공률 × 에너지 효율)
    new_k := LEAST(2.0, GREATEST(0.1, 
        v_current_k * 0.7 + (v_success_rate * v_energy_efficiency) * 0.3
    ));
    
    -- I 재계산 (연관 업무와의 시너지)
    -- 간단 버전: 현재 값 유지 (실제로는 관계 그래프 분석 필요)
    new_i := v_current_i;
    
    -- r 재계산 (최근 30일 대비 이전 30일 변화율)
    new_r := CASE 
        WHEN v_execution_count > 10 THEN
            (new_k - v_current_k) / NULLIF(v_current_k, 0)
        ELSE 0
    END;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
