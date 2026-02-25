/**
 * Supabase 연결·환경변수 검증 API
 * GET /api/health/supabase
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TABLES_TO_TRY = ['atb_students', 'atb_classes', 'academies', 'profiles', 'students', 'users', 'autus_nodes'];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: !!url,
    SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey,
  };

  const missing = Object.entries(envStatus)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: '환경변수 미설정',
        env: envStatus,
        missing,
        hint: 'Vercel/로컬 .env에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정 필요',
      },
      { status: 503 }
    );
  }

  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, message: 'Supabase credentials incomplete', env: envStatus },
      { status: 503 }
    );
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let connected = false;
  let latencyMs = 0;
  let workingTable: string | null = null;
  let errorMessage: string | null = null;

  const start = Date.now();
  for (const table of TABLES_TO_TRY) {
    try {
      const { error } = await client.from(table).select('id').limit(1);
      if (!error) {
        connected = true;
        workingTable = table;
        break;
      }
    } catch {
      continue;
    }
  }
  latencyMs = Date.now() - start;

  if (!connected) {
    try {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      if (res.ok) {
        connected = true;
        workingTable = '(rest ping ok)';
      } else {
        errorMessage = `REST ping: ${res.status}`;
      }
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    ok: connected,
    env: envStatus,
    url: url.replace(/^(https?:\/\/[^/]+).*/, '$1'),
    latency_ms: latencyMs,
    working_table: workingTable,
    error: errorMessage,
    hint: connected
      ? undefined
      : 'Supabase URL·Service Key 확인. 프로젝트 대시보드 → Settings → API',
  });
}
