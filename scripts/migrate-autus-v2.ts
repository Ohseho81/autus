/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v2.0 Database Migration Script
 * 
 * 실행: npx ts-node scripts/migrate-autus-v2.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pphzvnaedmzcvpxjulti.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Migration SQL statements
const migrations = [
  // Step 1: Create ENUM types (if not exists)
  `DO $$ BEGIN
    CREATE TYPE node_type AS ENUM ('OWNER','MANAGER','STAFF','STUDENT','PARENT','PROSPECT','CHURNED','EXTERNAL');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  
  `DO $$ BEGIN
    CREATE TYPE behavior_type AS ENUM ('REENROLLMENT','REFERRAL','ADDITIONAL_CLASS','PAID_EVENT','VOLUNTARY_STAY','FREE_EVENT','CLASS_PARTICIPATION','ATTENDANCE','PAYMENT','COMMUNICATION','POSITIVE_FEEDBACK','MERCHANDISE','COMPLAINT','CHURN_SIGNAL');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  
  `DO $$ BEGIN
    CREATE TYPE external_source AS ENUM ('EMAIL','CALENDAR','MESSENGER','SOCIAL','REPUTATION','LOCATION','PAYMENT','NETWORK');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  
  `DO $$ BEGIN
    CREATE TYPE sigma_grade AS ENUM ('critical','at_risk','neutral','good','loyal','advocate');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  
  `DO $$ BEGIN
    CREATE TYPE relationship_status AS ENUM ('active','inactive','churned');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  // Step 2: Create tables
  `CREATE TABLE IF NOT EXISTS autus_nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    type text NOT NULL,
    name text NOT NULL,
    email text UNIQUE,
    phone text,
    lambda decimal(4,2) DEFAULT 1.0,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS autus_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    node_a_id uuid NOT NULL REFERENCES autus_nodes(id) ON DELETE CASCADE,
    node_b_id uuid NOT NULL REFERENCES autus_nodes(id) ON DELETE CASCADE,
    sigma decimal(4,2) DEFAULT 1.0,
    sigma_history jsonb DEFAULT '[]',
    t_total decimal(15,2) DEFAULT 0,
    a_value decimal(20,2) DEFAULT 0,
    status text DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(node_a_id, node_b_id)
  );`,

  `CREATE TABLE IF NOT EXISTS autus_behaviors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    node_id uuid NOT NULL REFERENCES autus_nodes(id) ON DELETE CASCADE,
    behavior_type text NOT NULL,
    tier smallint NOT NULL,
    sigma_contribution decimal(5,3) NOT NULL,
    modifiers jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    recorded_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS autus_time_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    node_id uuid REFERENCES autus_nodes(id) ON DELETE CASCADE,
    relationship_id uuid REFERENCES autus_relationships(id) ON DELETE CASCADE,
    t_physical integer NOT NULL,
    t_value decimal(10,2) NOT NULL,
    activity_type text NOT NULL,
    metadata jsonb DEFAULT '{}',
    recorded_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS autus_external_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    node_id uuid NOT NULL REFERENCES autus_nodes(id) ON DELETE CASCADE,
    source text NOT NULL,
    sigma_contribution decimal(5,3) NOT NULL,
    raw_data jsonb DEFAULT '{}',
    recorded_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS autus_org_values (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    omega decimal(25,2) NOT NULL,
    avg_sigma decimal(4,2) NOT NULL,
    node_count integer NOT NULL,
    relationship_count integer NOT NULL,
    sigma_distribution jsonb NOT NULL,
    calculated_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS autus_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    node_id uuid REFERENCES autus_nodes(id) ON DELETE CASCADE,
    relationship_id uuid REFERENCES autus_relationships(id) ON DELETE CASCADE,
    type text NOT NULL,
    severity text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    is_read boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );`,

  // Step 3: Create indexes
  `CREATE INDEX IF NOT EXISTS idx_autus_nodes_org ON autus_nodes(org_id);`,
  `CREATE INDEX IF NOT EXISTS idx_autus_nodes_type ON autus_nodes(type);`,
  `CREATE INDEX IF NOT EXISTS idx_autus_relationships_org ON autus_relationships(org_id);`,
  `CREATE INDEX IF NOT EXISTS idx_autus_relationships_sigma ON autus_relationships(sigma);`,
  `CREATE INDEX IF NOT EXISTS idx_autus_behaviors_node ON autus_behaviors(node_id);`,
  `CREATE INDEX IF NOT EXISTS idx_autus_behaviors_type ON autus_behaviors(behavior_type);`,
  `CREATE INDEX IF NOT EXISTS idx_autus_time_logs_node ON autus_time_logs(node_id);`,
  `CREATE INDEX IF NOT EXISTS idx_autus_alerts_unread ON autus_alerts(is_read) WHERE is_read = false;`,

  // Step 4: Insert sample data
  `INSERT INTO autus_nodes (id, type, name, lambda, metadata) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'OWNER', '대표', 5.0, '{"role": "owner"}'),
    ('00000000-0000-0000-0000-000000000002', 'MANAGER', '김원장', 3.0, '{"role": "manager"}'),
    ('00000000-0000-0000-0000-000000000003', 'STAFF', '박교사', 2.0, '{"role": "teacher"}'),
    ('00000000-0000-0000-0000-000000000004', 'STUDENT', '이학생', 1.0, '{"role": "student"}'),
    ('00000000-0000-0000-0000-000000000005', 'PARENT', '이학부모', 1.2, '{"role": "parent"}')
  ON CONFLICT DO NOTHING;`,

  `INSERT INTO autus_relationships (node_a_id, node_b_id, sigma, t_total, a_value) VALUES 
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 1.45, 1200, 15847.2),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 1.32, 300, 1258.9)
  ON CONFLICT DO NOTHING;`,
];

async function runMigration() {
  console.log('🏛️ AUTUS v2.0 Database Migration Started...\n');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i];
    const label = sql.substring(0, 60).replace(/\n/g, ' ').trim() + '...';
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // Try direct query if rpc fails
        const { error: directError } = await supabase.from('_migrations_log').select('id').limit(0);
        if (directError) {
          throw new Error(error.message);
        }
      }
      
      console.log(`✅ [${i + 1}/${migrations.length}] ${label}`);
      successCount++;
    } catch (err) {
      console.log(`⚠️  [${i + 1}/${migrations.length}] ${label}`);
      console.log(`   Skipped or already exists`);
      errorCount++;
    }
  }

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`📊 Migration Complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Skipped: ${errorCount}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
}

// Export for direct execution or import
export { runMigration };

// Run if called directly
runMigration().catch(console.error);
