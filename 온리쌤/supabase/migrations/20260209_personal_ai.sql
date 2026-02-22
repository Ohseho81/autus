-- ═══════════════════════════════════════════════════════════════
-- Personal AI Factory - Full Migration
-- Created: 2026-02-09
-- ═══════════════════════════════════════════════════════════════

-- 1. personal_ai
CREATE TABLE IF NOT EXISTS personal_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'embryo' CHECK (status IN ('embryo','infant','growing','mature','elder')),
  total_logs INT DEFAULT 0,
  total_patterns INT DEFAULT 0,
  total_connections INT DEFAULT 0,
  born_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id)
);

-- 2. life_log
CREATE TABLE IF NOT EXISTS life_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id UUID NOT NULL REFERENCES personal_ai(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  raw_data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  auto BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. pattern
CREATE TABLE IF NOT EXISTS pattern (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id UUID NOT NULL REFERENCES personal_ai(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('routine','change','anomaly','preference')),
  description TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.0,
  observation_count INT DEFAULT 1,
  related_log_ids UUID[] DEFAULT '{}',
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. growth_snapshot
CREATE TABLE IF NOT EXISTS growth_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id UUID NOT NULL REFERENCES personal_ai(id) ON DELETE CASCADE,
  window_size INT NOT NULL DEFAULT 10,
  signals JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. connector
CREATE TABLE IF NOT EXISTS connector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id UUID NOT NULL REFERENCES personal_ai(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  service_name TEXT,
  auth_type TEXT NOT NULL DEFAULT 'internal' CHECK (auth_type IN ('internal','oauth','api_key','webhook','bluetooth')),
  auth_data JSONB DEFAULT '{}',
  log_types TEXT[] DEFAULT '{}',
  refresh_rate TEXT DEFAULT 'realtime' CHECK (refresh_rate IN ('realtime','hourly','daily','manual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disconnected','error')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(ai_id, service)
);

-- 6. permission
CREATE TABLE IF NOT EXISTS permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id UUID NOT NULL REFERENCES personal_ai(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  action_name TEXT,
  level TEXT NOT NULL DEFAULT 'ASK_EVERY_TIME' CHECK (level IN ('ALWAYS_AUTO','ASK_FIRST_TIME','ASK_EVERY_TIME','NEVER')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by TEXT DEFAULT 'owner',
  auto_approved_count INT DEFAULT 0,
  UNIQUE(ai_id, action)
);

-- 7. action_log
CREATE TABLE IF NOT EXISTS action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id UUID NOT NULL REFERENCES personal_ai(id) ON DELETE CASCADE,
  trigger_event TEXT,
  action TEXT NOT NULL,
  target_service TEXT,
  result JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','executed','rejected','failed')),
  approved BOOLEAN,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════
-- RLS Enable (all 7 tables)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE personal_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on these tables first
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['personal_ai','life_log','pattern','growth_snapshot','connector','permission','action_log'])
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- RLS Policies: owner can access their own AI's data

CREATE POLICY "owner_all_personal_ai" ON personal_ai
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "owner_all_life_log" ON life_log
  FOR ALL USING (ai_id IN (SELECT id FROM personal_ai WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_pattern" ON pattern
  FOR ALL USING (ai_id IN (SELECT id FROM personal_ai WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_growth_snapshot" ON growth_snapshot
  FOR ALL USING (ai_id IN (SELECT id FROM personal_ai WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_connector" ON connector
  FOR ALL USING (ai_id IN (SELECT id FROM personal_ai WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_permission" ON permission
  FOR ALL USING (ai_id IN (SELECT id FROM personal_ai WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_action_log" ON action_log
  FOR ALL USING (ai_id IN (SELECT id FROM personal_ai WHERE owner_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_life_log_ai_created ON life_log(ai_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_ai_active ON pattern(ai_id, is_active);
CREATE INDEX IF NOT EXISTS idx_action_log_ai_created ON action_log(ai_id, created_at DESC);
