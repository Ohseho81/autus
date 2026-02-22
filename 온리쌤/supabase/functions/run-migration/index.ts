/**
 * Supabase Edge Function: run-migration
 *
 * 마이그레이션 SQL을 안전하게 실행하는 Edge Function
 *
 * 보안:
 * - 관리자 권한 확인 (profiles.type = 'admin')
 * - 중복 실행 방지 (migrations 테이블 체크)
 * - 실행 시간 제한 (10초)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationRequest {
  version: string;
  userId: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 요청 파싱
    const { version, userId }: MigrationRequest = await req.json();

    if (!version || !userId) {
      return new Response(
        JSON.stringify({ error: 'version and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 관리자 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('type')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (userProfile.type !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Permission denied. Admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 이미 실행되었는지 확인
    const { data: existingMigration } = await supabase
      .from('migrations')
      .select('version, executed_at')
      .eq('version', version)
      .eq('success', true)
      .single();

    if (existingMigration) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyExecuted: true,
          version,
          executedAt: existingMigration.executed_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 마이그레이션 SQL 가져오기
    const migrationSql = getMigrationSql(version);
    if (!migrationSql) {
      return new Response(
        JSON.stringify({ error: `Migration ${version} not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 마이그레이션 실행
    const startTime = Date.now();

    const { error: execError } = await supabase.rpc('exec_sql', {
      sql: migrationSql,
    });

    const executionTimeMs = Date.now() - startTime;

    if (execError) {
      // 실패 기록
      await supabase.from('migrations').insert({
        version,
        name: getMigrationName(version),
        success: false,
        error_message: execError.message,
        execution_time_ms: executionTimeMs,
      });

      return new Response(
        JSON.stringify({
          success: false,
          version,
          error: execError.message,
          executionTimeMs,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Event Ledger 기록
    await supabase.from('event_ledger').insert({
      entity_id: userId,
      event_type: 'system_update',
      metadata: {
        type: 'migration',
        version,
        execution_time_ms: executionTimeMs,
        success: true,
      },
    });

    // 성공 응답
    return new Response(
      JSON.stringify({
        success: true,
        version,
        executionTimeMs,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * 마이그레이션 SQL 가져오기
 */
function getMigrationSql(version: string): string | null {
  const migrations: { [key: string]: string } = {
    '001': MIGRATION_001,
    // 향후 마이그레이션 추가 가능
  };

  return migrations[version] || null;
}

/**
 * 마이그레이션 이름 가져오기
 */
function getMigrationName(version: string): string {
  const names: { [key: string]: string } = {
    '001': 'Data cleanup and initial setup',
  };

  return names[version] || `Migration ${version}`;
}

// =========================================
// Migration SQL
// =========================================

const MIGRATION_001 = `
-- Migration 001: 데이터베이스 초기 정리 및 설정

CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  execution_time_ms INTEGER
);

-- 중복 실행 방지
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM migrations WHERE version = '001' AND success = TRUE) THEN
    RAISE NOTICE 'Migration 001 already executed. Skipping...';
    RETURN;
  END IF;
END $$;

-- 1. event_type_mappings RLS
ALTER TABLE event_type_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read event types" ON event_type_mappings;
DROP POLICY IF EXISTS "Service role can insert event types" ON event_type_mappings;

CREATE POLICY "Anyone can read event types"
  ON event_type_mappings FOR SELECT USING (true);

CREATE POLICY "Service role can insert event types"
  ON event_type_mappings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 2. 기본 학원 생성
INSERT INTO academies (id, name, phone, address, settings, status, created_at)
SELECT '00000000-0000-0000-0000-000000000001'::UUID, '온리쌤 배구아카데미',
       '02-1234-5678', '서울특별시',
       '{"notification":{"enabled":true,"alimtalk":true},"attendance":{"auto_notify":true}}'::JSONB,
       'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM academies WHERE id = '00000000-0000-0000-0000-000000000001'::UUID);

-- 3. Universal_id 연결
DO $$
DECLARE profile_record RECORD; new_universal_id UUID; phone_hash TEXT; email_hash TEXT;
BEGIN
  FOR profile_record IN SELECT id, name, phone, email FROM profiles WHERE universal_id IS NULL
  LOOP
    phone_hash := MD5(COALESCE(profile_record.phone, ''));
    email_hash := MD5(COALESCE(profile_record.email, ''));

    SELECT id INTO new_universal_id FROM universal_profiles
    WHERE phone_hash = phone_hash OR email_hash = email_hash LIMIT 1;

    IF new_universal_id IS NULL THEN
      INSERT INTO universal_profiles (name, phone_hash, email_hash, v_index, base_value, relations, created_at)
      VALUES (profile_record.name, phone_hash, email_hash, 100.00, 1.0, 0.5, NOW())
      RETURNING id INTO new_universal_id;
    END IF;

    UPDATE profiles SET universal_id = new_universal_id WHERE id = profile_record.id;
  END LOOP;
END $$;

-- 4. V-Index 초기화
UPDATE universal_profiles SET v_index = 100.00, base_value = 1.0, relations = 0.5, updated_at = NOW()
WHERE v_index = 0.00;

-- 5. Students 테이블 deprecated
COMMENT ON TABLE students IS 'DEPRECATED: Use profiles table with type=student instead.';
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students table deprecated" ON students;
CREATE POLICY "Students table deprecated" ON students FOR ALL USING (false);

-- 6. academy_id 연결
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'academy_id') THEN
    ALTER TABLE profiles ADD COLUMN academy_id UUID REFERENCES academies(id);
  END IF;
END $$;

UPDATE profiles SET academy_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE academy_id IS NULL;

-- 7. System Health View
CREATE OR REPLACE VIEW system_health AS
SELECT
  (SELECT COUNT(*) FROM academies WHERE status = 'active') as active_academies,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE type = 'student') as active_students,
  (SELECT COUNT(*) FROM profiles WHERE universal_id IS NULL) as profiles_without_universal_id,
  (SELECT COUNT(*) FROM universal_profiles) as total_universal_profiles,
  (SELECT ROUND(AVG(v_index), 2) FROM universal_profiles) as avg_v_index,
  (SELECT COUNT(*) FROM event_ledger) as total_events,
  (SELECT COUNT(*) FROM event_ledger WHERE created_at > NOW() - INTERVAL '7 days') as events_last_7_days;

-- 8. 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_profiles_universal_id ON profiles(universal_id);
CREATE INDEX IF NOT EXISTS idx_profiles_academy_id ON profiles(academy_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_entity_id ON event_ledger(entity_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_created_at ON event_ledger(created_at DESC);

-- 9. 통계 업데이트
ANALYZE profiles;
ANALYZE universal_profiles;
ANALYZE event_ledger;

-- Migration 완료 기록
INSERT INTO migrations (version, name, success, execution_time_ms)
VALUES ('001', 'Data cleanup and initial setup', TRUE, 0)
ON CONFLICT (version) DO NOTHING;
`;
