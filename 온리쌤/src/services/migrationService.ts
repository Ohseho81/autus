/**
 * 데이터베이스 마이그레이션 실행 서비스
 *
 * 기능:
 * - SQL 마이그레이션 파일 실행
 * - 중복 실행 방지 (migrations 테이블)
 * - 실행 결과 로깅 및 Event Ledger 기록
 * - 관리자 권한 확인
 */

import { supabase } from '../lib/supabase';
import { eventService } from './eventService';

export interface Migration {
  version: string;
  name: string;
  sql: string;
}

export interface MigrationResult {
  success: boolean;
  version: string;
  name: string;
  executionTimeMs: number;
  errorMessage?: string;
  alreadyExecuted?: boolean;
}

class MigrationService {
  /**
   * 마이그레이션 목록 가져오기
   */
  async getMigrations(): Promise<Migration[]> {
    // 실제 앱에서는 동적으로 로드할 수 있지만,
    // React Native에서는 정적으로 정의
    return [
      {
        version: '001',
        name: 'Data cleanup and initial setup',
        sql: MIGRATION_001_SQL,
      },
      // 향후 마이그레이션 추가 가능
    ];
  }

  /**
   * 실행된 마이그레이션 확인
   */
  async getExecutedMigrations(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('migrations')
        .select('version')
        .eq('success', true)
        .order('version');

      if (error) throw error;

      return data?.map((m) => m.version) || [];
    } catch (error: unknown) {
      console.error('[MigrationService] Failed to get executed migrations:', error);
      return [];
    }
  }

  /**
   * 특정 마이그레이션 실행 여부 확인
   */
  async isMigrationExecuted(version: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('migrations')
        .select('version')
        .eq('version', version)
        .eq('success', true)
        .single();

      return !!data && !error;
    } catch {
      return false;
    }
  }

  /**
   * 마이그레이션 실행
   */
  async runMigration(migration: Migration, userId: string): Promise<MigrationResult> {
    const startTime = Date.now();

    console.log(`[MigrationService] Running migration ${migration.version}: ${migration.name}`);

    try {
      // 이미 실행되었는지 확인
      const executed = await this.isMigrationExecuted(migration.version);
      if (executed) {
        console.log(`[MigrationService] Migration ${migration.version} already executed. Skipping...`);
        return {
          success: true,
          version: migration.version,
          name: migration.name,
          executionTimeMs: Date.now() - startTime,
          alreadyExecuted: true,
        };
      }

      // Edge Function 호출
      const { data, error } = await supabase.functions.invoke('run-migration', {
        body: {
          version: migration.version,
          userId: userId,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Migration failed');
      }

      const executionTimeMs = Date.now() - startTime;

      // Event Ledger 기록
      await eventService.logEvent({
        entity_id: userId,
        event_type: 'system_update',
        metadata: {
          type: 'migration',
          version: migration.version,
          name: migration.name,
          execution_time_ms: executionTimeMs,
          success: true,
        },
      });

      if (__DEV__) console.log(`[MigrationService] Migration ${migration.version} completed in ${executionTimeMs}ms`);

      return {
        success: true,
        version: migration.version,
        name: migration.name,
        executionTimeMs,
      };
    } catch (error: unknown) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (__DEV__) console.warn(`[MigrationService] Migration ${migration.version} failed:`, errorMessage);

      // 실패 기록
      await eventService.logEvent({
        entity_id: userId,
        event_type: 'system_update',
        metadata: {
          type: 'migration',
          version: migration.version,
          name: migration.name,
          execution_time_ms: executionTimeMs,
          success: false,
          error: errorMessage,
        },
      });

      return {
        success: false,
        version: migration.version,
        name: migration.name,
        executionTimeMs,
        errorMessage,
      };
    }
  }

  /**
   * 모든 대기 중인 마이그레이션 실행
   */
  async runPendingMigrations(userId: string): Promise<MigrationResult[]> {
    console.log('[MigrationService] Checking for pending migrations...');

    const allMigrations = await this.getMigrations();
    const executedVersions = await this.getExecutedMigrations();

    const pendingMigrations = allMigrations.filter(
      (m) => !executedVersions.includes(m.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('[MigrationService] No pending migrations.');
      return [];
    }

    console.log(`[MigrationService] Found ${pendingMigrations.length} pending migrations.`);

    const results: MigrationResult[] = [];

    for (const migration of pendingMigrations) {
      const result = await this.runMigration(migration, userId);
      results.push(result);

      // 실패 시 중단
      if (!result.success) {
        console.error(`[MigrationService] Stopping due to migration failure: ${migration.version}`);
        break;
      }
    }

    return results;
  }

  /**
   * 시스템 상태 확인
   */
  async getSystemHealth() {
    try {
      const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .single();

      if (error) throw error;

      return data;
    } catch (error: unknown) {
      console.error('[MigrationService] Failed to get system health:', error);
      return null;
    }
  }
}

// =========================================
// Migration SQL 정의
// =========================================

const MIGRATION_001_SQL = `
-- 이 SQL은 src/migrations/001_data_cleanup.sql의 내용입니다.
-- 실제로는 파일을 읽어오는 것이 좋지만, React Native에서는 정적으로 포함합니다.

-- Migration 실행 여부 확인용 테이블
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  execution_time_ms INTEGER
);

-- 이미 실행되었는지 확인
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM migrations WHERE version = '001') THEN
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
  (SELECT COUNT(*) FROM academies) as total_academies,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE type = 'student') as active_students,
  (SELECT COUNT(*) FROM profiles WHERE type = 'coach') as active_coaches,
  (SELECT COUNT(*) FROM profiles WHERE universal_id IS NULL) as profiles_without_universal_id,
  (SELECT COUNT(*) FROM universal_profiles) as total_universal_profiles,
  (SELECT ROUND(AVG(v_index), 2) FROM universal_profiles) as avg_v_index,
  (SELECT COUNT(*) FROM event_ledger) as total_events,
  (SELECT COUNT(*) FROM event_ledger WHERE created_at > NOW() - INTERVAL '7 days') as events_last_7_days,
  (SELECT COUNT(*) FROM tasks) as total_tasks,
  (SELECT COUNT(*) FROM tasks WHERE status = 'pending') as pending_tasks;

-- 8. 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_profiles_universal_id ON profiles(universal_id);
CREATE INDEX IF NOT EXISTS idx_profiles_academy_id ON profiles(academy_id);
CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);
CREATE INDEX IF NOT EXISTS idx_event_ledger_entity_id ON event_ledger(entity_id);
CREATE INDEX IF NOT EXISTS idx_event_ledger_created_at ON event_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_universal_profiles_phone_hash ON universal_profiles(phone_hash);
CREATE INDEX IF NOT EXISTS idx_universal_profiles_email_hash ON universal_profiles(email_hash);

-- 9. 통계 업데이트
ANALYZE profiles;
ANALYZE universal_profiles;
ANALYZE event_ledger;
ANALYZE academies;

-- Migration 완료 기록
INSERT INTO migrations (version, name, success) VALUES ('001', 'Data cleanup and initial setup', TRUE);

SELECT '✅ Migration 001 completed!' as status;
`;

// 싱글톤 인스턴스
export const migrationService = new MigrationService();

export default migrationService;
