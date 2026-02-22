-- ═══════════════════════════════════════════════════════════════════════════════
-- 🌐 AUTUS UNIVERSAL SCHEMA v1.0
--
-- 철학: Zero Meaning + Infinite Extensibility
-- 목표: 5개 테이블로 모든 산업 커버
--
-- 핵심 테이블:
-- 1. organizations - 조직/사업장
-- 2. entities - 모든 참여자 (학생, 강사, 고객, 직원...)
-- 3. services - 모든 서비스 (수업, 상품, 패키지...)
-- 4. events - 모든 이벤트 (출석, 결제, 예약, 피드백...)
-- 5. metadata - 무한 확장 (키-값 저장)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. ORGANIZATIONS (조직/사업장)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,  -- academy, clinic, studio, salon, gym...
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENTITIES (모든 참여자)
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,  -- student, parent, coach, staff, customer...
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  tier VARCHAR(20) DEFAULT 'standard',  -- vip, premium, standard, trial
  v_index DECIMAL(5,2) DEFAULT 50.0,  -- 가치 지수 (0-100)
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_org ON entities(org_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_phone ON entities(phone);

-- 3. SERVICES (모든 서비스)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,  -- lesson, package, product, consultation...
  name VARCHAR(100) NOT NULL,
  price INTEGER DEFAULT 0,
  unit_type VARCHAR(20) DEFAULT 'count',  -- count, time, period, unlimited
  unit_value INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_org ON services(org_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);

-- 4. EVENTS (모든 이벤트)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- attendance, payment, booking, feedback, session_start...
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  value INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'completed',
  source VARCHAR(30) DEFAULT 'manual',  -- manual, webhook, qr, iot, api, ai_infer
  confidence DECIMAL(3,2) DEFAULT 1.0,
  idempotency_key VARCHAR(100) UNIQUE,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred ON events(occurred_at);

-- 5. METADATA (무한 확장)
CREATE TABLE IF NOT EXISTS metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(30) NOT NULL,  -- organization, entity, service, event
  target_id UUID NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  source VARCHAR(30) DEFAULT 'manual',
  confidence DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_type, target_id, key)
);

CREATE INDEX IF NOT EXISTS idx_metadata_target ON metadata(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_metadata_key ON metadata(key);
CREATE INDEX IF NOT EXISTS idx_metadata_value ON metadata USING gin(value);

-- 6. RELATIONSHIPS (관계)
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL,  -- parent_of, coach_of, manages, belongs_to...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_entity_id, to_entity_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_entity_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 메타데이터 설정/업데이트
CREATE OR REPLACE FUNCTION set_metadata(
  p_target_type VARCHAR,
  p_target_id UUID,
  p_key VARCHAR,
  p_value JSONB,
  p_source VARCHAR DEFAULT 'manual',
  p_confidence DECIMAL DEFAULT 1.0
) RETURNS UUID AS \$\$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO metadata (target_type, target_id, key, value, source, confidence)
  VALUES (p_target_type, p_target_id, p_key, p_value, p_source, p_confidence)
  ON CONFLICT (target_type, target_id, key)
  DO UPDATE SET
    value = EXCLUDED.value,
    source = EXCLUDED.source,
    confidence = EXCLUDED.confidence,
    updated_at = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
\$\$ LANGUAGE plpgsql;

-- 메타데이터 값 직접 조회
CREATE OR REPLACE FUNCTION get_meta_value(
  p_target_type VARCHAR,
  p_target_id UUID,
  p_key VARCHAR
) RETURNS JSONB AS \$\$
BEGIN
  RETURN (
    SELECT value FROM metadata
    WHERE target_type = p_target_type
      AND target_id = p_target_id
      AND key = p_key
  );
END;
\$\$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMPATIBILITY VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 학생 뷰 (기존 atb_students 호환)
CREATE OR REPLACE VIEW students_view AS
SELECT
  e.id, e.org_id, e.name, e.phone, e.email, e.tier, e.v_index, e.status,
  e.created_at, e.updated_at,
  get_meta_value('entity', e.id, 'school')::TEXT AS school,
  get_meta_value('entity', e.id, 'grade')::TEXT AS grade,
  get_meta_value('entity', e.id, 'birth_year')::INTEGER AS birth_year,
  get_meta_value('entity', e.id, 'uniform_number')::INTEGER AS uniform_number,
  get_meta_value('entity', e.id, 'position')::TEXT AS position,
  get_meta_value('entity', e.id, 'shuttle_required')::BOOLEAN AS shuttle_required
FROM entities e WHERE e.type = 'student';

-- 강사/코치 뷰
CREATE OR REPLACE VIEW coaches_view AS
SELECT
  e.id, e.org_id, e.name, e.phone, e.email, e.status, e.created_at, e.updated_at,
  get_meta_value('entity', e.id, 'specialty') AS specialty,
  get_meta_value('entity', e.id, 'hourly_rate')::INTEGER AS hourly_rate
FROM entities e WHERE e.type IN ('coach', 'instructor', 'trainer');

-- 수업/서비스 뷰
CREATE OR REPLACE VIEW classes_view AS
SELECT
  s.id, s.org_id, s.name, s.price AS monthly_fee, s.unit_value AS sessions_per_week,
  s.status, s.created_at, s.updated_at,
  get_meta_value('service', s.id, 'schedule_days')::TEXT AS schedule_days,
  get_meta_value('service', s.id, 'schedule_time')::TEXT AS schedule_time,
  get_meta_value('service', s.id, 'duration_minutes')::INTEGER AS duration_minutes,
  get_meta_value('service', s.id, 'max_students')::INTEGER AS max_students
FROM services s WHERE s.type = 'lesson';

-- 결제 뷰
CREATE OR REPLACE VIEW payments_view AS
SELECT
  ev.id, ev.org_id, ev.entity_id AS student_id, ev.value AS amount,
  ev.status, ev.occurred_at AS paid_at, ev.source, ev.created_at,
  get_meta_value('event', ev.id, 'payment_month')::TEXT AS payment_month,
  get_meta_value('event', ev.id, 'payment_method')::TEXT AS payment_method
FROM events ev WHERE ev.type = 'payment';

-- 출석 뷰
CREATE OR REPLACE VIEW attendance_view AS
SELECT
  ev.id, ev.org_id, ev.entity_id AS student_id, ev.service_id AS class_id,
  ev.occurred_at::DATE AS attendance_date, ev.status, ev.source, ev.created_at,
  get_meta_value('event', ev.id, 'check_in_time')::TIMESTAMPTZ AS check_in_time
FROM events ev WHERE ev.type = 'attendance';

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON organizations FOR ALL USING (true);
CREATE POLICY "Allow all" ON entities FOR ALL USING (true);
CREATE POLICY "Allow all" ON services FOR ALL USING (true);
CREATE POLICY "Allow all" ON events FOR ALL USING (true);
CREATE POLICY "Allow all" ON metadata FOR ALL USING (true);
CREATE POLICY "Allow all" ON relationships FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA (농구아카데미)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO organizations (id, name, type) VALUES
  ('00000000-0000-0000-0000-000000000001', '온리쌤 대치점', 'academy')
ON CONFLICT DO NOTHING;

INSERT INTO entities (id, org_id, type, name, phone) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'coach', '김코치', '010-1234-5678'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'student', '이농구', '010-2222-2222'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'student', '박슛슛', '010-3333-3333')
ON CONFLICT DO NOTHING;

INSERT INTO services (id, org_id, type, name, price, unit_type, unit_value) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'lesson', '유소년 A반', 300000, 'period', 30),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'lesson', '중등 심화반', 350000, 'period', 30)
ON CONFLICT DO NOTHING;

-- 메타데이터 샘플
SELECT set_metadata('entity', '22222222-2222-2222-2222-222222222222', 'school', '"서울초등학교"');
SELECT set_metadata('entity', '22222222-2222-2222-2222-222222222222', 'grade', '"초5"');
SELECT set_metadata('entity', '22222222-2222-2222-2222-222222222222', 'uniform_number', '7');
SELECT set_metadata('entity', '22222222-2222-2222-2222-222222222222', 'position', '"가드"');

SELECT set_metadata('service', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'schedule_days', '"월,수,금"');
SELECT set_metadata('service', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'schedule_time', '"16:00"');
SELECT set_metadata('service', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'max_students', '12');

COMMENT ON TABLE organizations IS '조직/사업장 - 모든 데이터의 루트';
COMMENT ON TABLE entities IS '모든 참여자 - 학생, 강사, 고객, 직원 등';
COMMENT ON TABLE services IS '모든 서비스 - 수업, 상품, 패키지, 멤버십 등';
COMMENT ON TABLE events IS '모든 이벤트 - 출석, 결제, 예약, 피드백 등';
COMMENT ON TABLE metadata IS '무한 확장 - 모든 산업별 특화 필드를 키-값으로 저장';
