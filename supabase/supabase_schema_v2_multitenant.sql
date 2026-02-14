-- ============================================================
-- AUTUS Supabase Schema v2.0 - Multi-Tenant Architecture
-- 병렬 확장 대응: 학원 증가 + 종목 확장 + 로그 통합
-- 실행 순서: v1 이후 실행 (기존 테이블 위에 추가)
-- ============================================================

-- ===== 1. organizations 테이블 (신규) =====
-- 학원, 사업장, 조직 단위

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 기본 정보
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'academy' CHECK (type IN ('academy', 'club', 'school', 'company')),

  -- 사업자 정보
  business_number TEXT,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,

  -- 결제 설정 (기존 business_settings를 통합)
  pg_provider TEXT,
  pg_merchant_id TEXT,
  pg_api_key_encrypted TEXT,
  card_fee_rate DECIMAL(5,2) DEFAULT 0.8,
  cash_fee_rate DECIMAL(5,2) DEFAULT 0.0,

  -- 자동화 설정
  auto_send_invoice BOOLEAN DEFAULT false,
  auto_send_day INTEGER DEFAULT 1,
  auto_reminder_enabled BOOLEAN DEFAULT true,
  reminder_days_before_due INTEGER DEFAULT 3,

  -- 상태
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_tier ON organizations(tier);

COMMENT ON TABLE organizations IS '학원, 사업장 등 조직 단위 (멀티 테넌트)';

-- 자동 업데이트 트리거
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== 2. programs 테이블 (신규) =====
-- 종목, 과목, 프로그램 구조화

CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 조직 연결
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 프로그램 정보
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- volleyball, soccer, basketball, chinese, english, coding, etc
  level TEXT,              -- beginner, intermediate, advanced
  description TEXT,

  -- 운영 정보
  monthly_fee INTEGER,
  capacity INTEGER DEFAULT 20,
  min_age INTEGER,
  max_age INTEGER,

  -- 상태
  is_active BOOLEAN DEFAULT true,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 제약 조건
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_programs_organization ON programs(organization_id);
CREATE INDEX idx_programs_category ON programs(category);
CREATE INDEX idx_programs_active ON programs(is_active);
CREATE INDEX idx_programs_org_category ON programs(organization_id, category);

COMMENT ON TABLE programs IS '종목, 과목 등 프로그램 (구조화)';

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== 3. universal_profiles 테이블 (신규) =====
-- AUTUS Universal ID - 조직 경계를 넘는 개인 식별

CREATE TABLE IF NOT EXISTS universal_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 개인 식별 정보 (해싱)
  phone_hash TEXT UNIQUE,
  email_hash TEXT,

  -- AUTUS 메타데이터
  v_index DECIMAL(10,2) DEFAULT 0,
  total_services INTEGER DEFAULT 0,
  total_interactions BIGINT DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_universal_profiles_phone_hash ON universal_profiles(phone_hash);
CREATE INDEX idx_universal_profiles_email_hash ON universal_profiles(email_hash);
CREATE INDEX idx_universal_profiles_v_index ON universal_profiles(v_index);

COMMENT ON TABLE universal_profiles IS 'AUTUS Universal ID - 모든 서비스 통합 개인 식별';

CREATE TRIGGER update_universal_profiles_updated_at
  BEFORE UPDATE ON universal_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== 4. 기존 테이블에 organization_id 추가 =====

-- profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS universal_id UUID REFERENCES universal_profiles(id);

CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_universal ON profiles(universal_id);

-- payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_payments_organization ON payments(organization_id);

-- schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id);
CREATE INDEX IF NOT EXISTS idx_schedules_organization ON schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedules_program ON schedules(program_id);

-- bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_bookings_organization ON bookings(organization_id);

-- notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization ON notifications(organization_id);

-- invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);

-- payment_transactions
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_organization ON payment_transactions(organization_id);

-- cash_receipts
ALTER TABLE cash_receipts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_organization ON cash_receipts(organization_id);

-- ===== 5. Universal ID 자동 연결 함수 =====

CREATE OR REPLACE FUNCTION link_to_universal_profile(
  p_phone TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_phone_hash TEXT;
  v_email_hash TEXT;
  v_universal_id UUID;
BEGIN
  -- 전화번호 해싱
  IF p_phone IS NOT NULL THEN
    v_phone_hash := encode(digest(p_phone, 'sha256'), 'hex');
  END IF;

  -- 이메일 해싱
  IF p_email IS NOT NULL THEN
    v_email_hash := encode(digest(p_email, 'sha256'), 'hex');
  END IF;

  -- 기존 universal_profile 찾기
  SELECT id INTO v_universal_id
  FROM universal_profiles
  WHERE (v_phone_hash IS NOT NULL AND phone_hash = v_phone_hash)
     OR (v_email_hash IS NOT NULL AND email_hash = v_email_hash)
  LIMIT 1;

  -- 없으면 생성
  IF v_universal_id IS NULL THEN
    INSERT INTO universal_profiles (phone_hash, email_hash)
    VALUES (v_phone_hash, v_email_hash)
    RETURNING id INTO v_universal_id;
  END IF;

  -- V-Index 업데이트
  UPDATE universal_profiles
  SET total_services = (
        SELECT COUNT(DISTINCT organization_id)
        FROM profiles
        WHERE universal_id = v_universal_id
      ),
      last_interaction_at = now(),
      updated_at = now()
  WHERE id = v_universal_id;

  RETURN v_universal_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION link_to_universal_profile IS '전화번호/이메일로 Universal ID 찾기 또는 생성';

-- ===== 6. profiles에 Universal ID 자동 연결 트리거 =====

CREATE OR REPLACE FUNCTION auto_link_universal_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'student' AND (NEW.phone IS NOT NULL OR NEW.email IS NOT NULL) THEN
    NEW.universal_id := link_to_universal_profile(NEW.phone, NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_auto_link_universal
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_universal_profile();

COMMENT ON TRIGGER profiles_auto_link_universal ON profiles IS '학생 생성/수정 시 자동으로 Universal ID 연결';

-- ===== 7. RLS 정책 (멀티 테넌트) =====

-- organizations 테이블 RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_organizations"
  ON organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "users_view_own_organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  );

-- profiles 테이블 RLS (조직별 격리)
DROP POLICY IF EXISTS "users_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "coaches_view_students" ON profiles;

CREATE POLICY "users_view_same_org_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  );

-- payments 테이블 RLS (조직별 격리)
DROP POLICY IF EXISTS "users_view_own_payments" ON payments;

CREATE POLICY "users_view_same_org_payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  );

-- bookings 테이블 RLS (조직별 격리)
DROP POLICY IF EXISTS "users_manage_own_bookings" ON bookings;

CREATE POLICY "users_manage_same_org_bookings"
  ON bookings
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  );

-- invoices 테이블 RLS
DROP POLICY IF EXISTS "users_view_own_invoices" ON invoices;

CREATE POLICY "users_view_same_org_invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  );

-- ===== 8. 초기 데이터 (기본 조직) =====

-- 온리쌤 기본 조직 생성
INSERT INTO organizations (name, slug, type, status, tier)
VALUES ('온리쌤배구아카데미', 'onlyssam', 'academy', 'active', 'pro')
ON CONFLICT (slug) DO NOTHING;

-- ===== 9. VIEW 업데이트 (조직별) =====

-- 미수금 현황 (조직별)
DROP VIEW IF EXISTS unpaid_payments CASCADE;
CREATE VIEW unpaid_payments AS
SELECT
  p.id,
  p.organization_id,
  o.name as organization_name,
  p.student_id,
  prof.name as student_name,
  prof.phone as parent_phone,
  p.total_amount,
  p.paid_amount,
  (p.total_amount - p.paid_amount) as unpaid_amount,
  p.due_date,
  CASE
    WHEN p.due_date < CURRENT_DATE THEN (CURRENT_DATE - p.due_date)
    ELSE 0
  END as overdue_days,
  p.payment_status
FROM payments p
JOIN profiles prof ON p.student_id = prof.id
JOIN organizations o ON p.organization_id = o.id
WHERE p.paid_amount < p.total_amount
  AND p.payment_status != 'cancelled';

-- ===== 10. 기본 프로그램 데이터 (온리쌤) =====

DO $$
DECLARE
  onlyssam_org_id UUID;
BEGIN
  -- 온리쌤 조직 ID 가져오기
  SELECT id INTO onlyssam_org_id FROM organizations WHERE slug = 'onlyssam';

  IF onlyssam_org_id IS NOT NULL THEN
    -- 배구 프로그램
    INSERT INTO programs (organization_id, name, category, level, monthly_fee, capacity)
    VALUES
      (onlyssam_org_id, '배구 초급반', 'volleyball', 'beginner', 200000, 20),
      (onlyssam_org_id, '배구 중급반', 'volleyball', 'intermediate', 250000, 20),
      (onlyssam_org_id, '배구 고급반', 'volleyball', 'advanced', 300000, 15)
    ON CONFLICT (organization_id, name) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- 완료! Multi-Tenant Architecture 준비 완료
--
-- ✅ organizations 테이블 생성
-- ✅ programs 테이블 생성
-- ✅ universal_profiles 테이블 생성
-- ✅ 기존 테이블에 organization_id 추가
-- ✅ Universal ID 자동 연결 트리거
-- ✅ RLS 정책 조직별 격리
-- ✅ 기본 조직 데이터
--
-- 다음 단계:
-- 1. 기존 데이터 마이그레이션 (migration_to_multitenant.sql)
-- 2. 두 번째 조직 추가 테스트
-- 3. Universal ID 통합 테스트
-- ============================================================
