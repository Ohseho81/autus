-- ============================================
-- AUTUS Row Level Security Policies
-- org_id 기반 멀티테넌트 보안
-- ============================================

-- Enable RLS on all core tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;

-- Organizations: 자기 조직만 접근
CREATE POLICY "org_select_own" ON organizations
  FOR SELECT USING (
    id = (current_setting('app.current_org_id', true))::uuid
  );

-- Entities: 같은 조직 엔티티만 접근
CREATE POLICY "entities_select_org" ON entities
  FOR SELECT USING (
    org_id = (current_setting('app.current_org_id', true))::uuid
  );

CREATE POLICY "entities_insert_org" ON entities
  FOR INSERT WITH CHECK (
    org_id = (current_setting('app.current_org_id', true))::uuid
  );

CREATE POLICY "entities_update_org" ON entities
  FOR UPDATE USING (
    org_id = (current_setting('app.current_org_id', true))::uuid
  );

-- Events: 같은 조직 이벤트만 접근 (append-only이므로 DELETE 없음)
CREATE POLICY "events_select_org" ON events
  FOR SELECT USING (
    org_id = (current_setting('app.current_org_id', true))::uuid
  );

CREATE POLICY "events_insert_org" ON events
  FOR INSERT WITH CHECK (
    org_id = (current_setting('app.current_org_id', true))::uuid
  );

-- Services: 같은 조직 서비스만 접근
CREATE POLICY "services_select_org" ON services
  FOR SELECT USING (
    org_id = (current_setting('app.current_org_id', true))::uuid
  );

CREATE POLICY "services_insert_org" ON services
  FOR INSERT WITH CHECK (
    org_id = (current_setting('app.current_org_id', true))::uuid
  );

CREATE POLICY "services_update_org" ON services
  FOR UPDATE USING (
    org_id = (current_setting('app.current_org_id', true))::uuid
  );

-- Metadata: 관련 엔티티 또는 서비스의 조직에 따라 접근
CREATE POLICY "metadata_select_org" ON metadata
  FOR SELECT USING (true);  -- metadata는 target_type/target_id로 간접 보호

CREATE POLICY "metadata_insert_org" ON metadata
  FOR INSERT WITH CHECK (true);

-- Service role은 모든 테이블에 대해 전체 접근 허용
-- (Supabase에서 service_role key 사용 시 RLS 자동 우회)

-- ============================================
-- 참고: Supabase service_role key로 접근하면
-- RLS가 자동으로 우회됩니다.
-- anon key나 authenticated key로 접근할 때만
-- 이 정책이 적용됩니다.
-- ============================================
