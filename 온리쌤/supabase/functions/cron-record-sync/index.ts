/**
 * cron-record-sync
 * 기록선생 -- 출석 기록 -> lesson_records 동기화 (누락 방지 안전망)
 *
 * 스케줄: 매일 23:00 KST
 *
 * IOO Trace:
 *   Input: attendance_records (지난 30일 중 lesson_records 없는 건)
 *   Operation: lesson_records 자동 생성 (빈도 로그)
 *   Output: 누락된 기록 보충 + events 로그
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_NAME = 'cron-record-sync';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(message: string, data?: unknown) {
  console.log(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, data !== undefined ? data : '');
}

function logError(message: string, error?: unknown) {
  console.error(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, error !== undefined ? error : '');
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Method validation -- cron jobs accept POST (Supabase cron) or GET (manual trigger)
  if (req.method !== 'POST' && req.method !== 'GET') {
    log(`Rejected method: ${req.method}`);
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      logError('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ ok: false, error: 'Server misconfiguration', code: 'ENV_MISSING' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

    log('Record sync started');

    // 지난 30일 출석 기록 조회
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const { data: attendanceRecords, error: fetchError } = await supabase
      .from('attendance_records')
      .select('id, student_id, attendance_date, status, daily_revenue, verified_by')
      .in('status', ['present', 'late'])
      .gte('attendance_date', thirtyDaysAgo);

    if (fetchError) {
      logError('Failed to fetch attendance_records:', fetchError);
      return new Response(
        JSON.stringify({ ok: false, error: `Failed to fetch attendance records: ${fetchError.message}`, code: 'DB_QUERY_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      log('No records to sync');
      return new Response(
        JSON.stringify({ ok: true, data: { synced: 0, skipped: 0, total_attendance: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 기존 lesson_records의 dedupe_key 목록 조회
    const { data: existingRecords, error: existingError } = await supabase
      .from('lesson_records')
      .select('dedupe_key')
      .gte('lesson_date', thirtyDaysAgo);

    if (existingError) {
      logError('Failed to fetch existing lesson_records:', existingError);
      // Non-fatal: proceed without deduplication cache (insert will catch via unique constraint)
    }

    const existingKeys = new Set((existingRecords || []).map(r => r.dedupe_key));

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const att of attendanceRecords) {
      const dateStr = att.attendance_date.replace(/-/g, '');
      const dedupeKey = `RECORD-${DEFAULT_ORG_ID}-${att.student_id}-${dateStr}-frequency`;

      // 이미 존재하면 스킵
      if (existingKeys.has(dedupeKey)) {
        skipped++;
        continue;
      }

      // lesson_record 생성
      const { error } = await supabase
        .from('lesson_records')
        .insert({
          student_id: att.student_id,
          org_id: DEFAULT_ORG_ID,
          lesson_date: att.attendance_date,
          log_type: 'frequency',
          metadata: {
            source: 'cron_record_sync',
            attendance_status: att.status,
            daily_revenue: att.daily_revenue,
            verified_by: att.verified_by,
          },
          dedupe_key: dedupeKey,
        });

      if (error) {
        // 중복 키 에러는 무시 (idempotency)
        if (error.code === '23505') {
          skipped++;
        } else {
          errors.push(`${att.student_id}/${att.attendance_date}: ${error.message}`);
        }
      } else {
        synced++;

        // IOO Trace 이벤트 로그
        await supabase.from('events').insert({
          org_id: DEFAULT_ORG_ID,
          type: 'lesson_record_created',
          entity_id: att.student_id,
          value: 0,
          status: 'completed',
          source: 'system',
          idempotency_key: `RECORD-EVENT-SYNC-${dedupeKey}`,
        });
      }
    }

    const summary = {
      synced_at: new Date().toISOString(),
      total_attendance: attendanceRecords.length,
      synced,
      skipped,
      errors: errors.length,
      error_details: errors.length > 0 ? errors.slice(0, 10) : undefined, // Cap error details at 10
    };

    log('Sync complete:', JSON.stringify(summary));

    return new Response(
      JSON.stringify({ ok: true, data: summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logError('Unhandled error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: message, code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
