#!/usr/bin/env node
/**
 * cleanup-and-status.sql 실행
 * DATABASE_URL 또는 SUPABASE_DB_URL 필요 (postgresql://...)
 */
const fs = require('fs');
const path = require('path');

// .env 로드 (dotenv 없으면 수동 파싱)
const root = path.join(__dirname, '..');
for (const f of ['.env.keys', '.env', 'vercel-api/.env.local']) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^(\w+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const sqlPath = path.join(__dirname, 'cleanup-and-status.sql');
const raw = fs.readFileSync(sqlPath, 'utf8');
const statements = raw
  .split(/;\s*\n/)
  .map(s => s.replace(/--[^\n]*/g, '').trim())
  .filter(Boolean);

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL 또는 SUPABASE_DB_URL 필요');
    console.error('   Supabase Dashboard → Settings → Database → Connection string (URI)');
    process.exit(1);
  }

  let pg;
  try {
    pg = require('pg');
  } catch {
    console.error('❌ pg 패키지 필요: npm install pg (프로젝트 루트에서)');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: dbUrl });
  try {
    await client.connect();
    for (const stmt of statements) {
      const res = await client.query(stmt + ';');
      if (res.rows?.length) {
        console.table(res.rows);
      } else if (res.rowCount != null && res.command === 'DELETE') {
        console.log(`Deleted ${res.rowCount} rows`);
      }
    }
    console.log('✅ Done');
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
