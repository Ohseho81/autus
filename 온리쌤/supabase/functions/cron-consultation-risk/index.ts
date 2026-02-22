/**
 * cron-consultation-risk
 * 상담선생 — 일일 위험 감지 + 자동 상담 예약
 *
 * 스케줄: 매일 09:00 KST
 *
 * IOO Trace:
 *   Input: payment_invoices (미납) + students (V-Index) + attendance_records (결석)
 *   Operation: 위험 감지 → 상담 자동 예약
 *   Output: consultation_sessions INSERT + events 로그
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
  const OVERDUE_DAYS = 3;
  const ABSENT_THRESHOLD = 3;
  const VINDEX_THRESHOLD = 60;

  try {
    console.log('[상담선생] 일일 위험 감지 시작');
    const risks: Array<{
      studentId: string;
      parentPhone: string;
      triggerType: string;
      snapshot: Record<string, unknown>;
      severity: string;
    }> = [];

    // ─── 1) 미납 청구서 ───
    const overdueDate = new Date(Date.now() - OVERDUE_DAYS * 86400000).toISOString().split('T')[0];
    const { data: overdueInvoices } = await supabase
      .from('payment_invoices')
      .select('student_id, parent_phone, amount, due_date, status')
      .eq('org_id', DEFAULT_ORG_ID)
      .in('status', ['sent', 'overdue'])
      .lt('due_date', overdueDate);

    for (const inv of overdueInvoices || []) {
      risks.push({
        studentId: inv.student_id,
        parentPhone: inv.parent_phone,
        triggerType: 'overdue_payment',
        snapshot: { overdueAmount: inv.amount, paymentStatus: inv.status },
        severity: 'high',
      });
    }

    // ─── 2) V-Index 낮은 학생 ───
    const { data: lowVIndex } = await supabase
      .from('students')
      .select('id, parent_phone, v_index, risk_level')
      .eq('status', 'active')
      .lt('v_index', VINDEX_THRESHOLD);

    for (const s of lowVIndex || []) {
      if (risks.some(r => r.studentId === s.id)) continue;
      risks.push({
        studentId: s.id,
        parentPhone: s.parent_phone || '',
        triggerType: 'low_vindex',
        snapshot: { vIndex: s.v_index, riskLevel: s.risk_level },
        severity: (s.v_index ?? 50) < 40 ? 'high' : 'medium',
      });
    }

    // ─── 3) 연속 결석 ───
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const { data: absences } = await supabase
      .from('attendance_records')
      .select('student_id')
      .eq('status', 'absent')
      .gte('attendance_date', sevenDaysAgo);

    const absentCounts: Record<string, number> = {};
    for (const a of absences || []) {
      absentCounts[a.student_id] = (absentCounts[a.student_id] || 0) + 1;
    }

    for (const [studentId, count] of Object.entries(absentCounts)) {
      if (count >= ABSENT_THRESHOLD && !risks.some(r => r.studentId === studentId)) {
        const { data: student } = await supabase
          .from('students')
          .select('parent_phone')
          .eq('id', studentId)
          .single();

        risks.push({
          studentId,
          parentPhone: student?.parent_phone || '',
          triggerType: 'absent_streak',
          snapshot: { absentCount: count },
          severity: count >= 5 ? 'high' : 'medium',
        });
      }
    }

    // ─── 4) 상담 자동 예약 ───
    let scheduled = 0;
    const errors: string[] = [];

    for (const risk of risks) {
      if (risk.severity === 'low') continue;

      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const dedupeKey = `CONSULT-${DEFAULT_ORG_ID}-${risk.studentId}-${today}`;

      // 중복 체크
      const { data: existing } = await supabase
        .from('consultation_sessions')
        .select('id')
        .eq('dedupe_key', dedupeKey)
        .maybeSingle();

      if (existing) continue;

      // 상담 생성
      const { error } = await supabase
        .from('consultation_sessions')
        .insert({
          org_id: DEFAULT_ORG_ID,
          student_id: risk.studentId,
          parent_phone: risk.parentPhone,
          status: 'scheduled',
          trigger_type: risk.triggerType,
          trigger_snapshot: risk.snapshot,
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          dedupe_key: dedupeKey,
        });

      if (error) {
        errors.push(`${risk.studentId}: ${error.message}`);
      } else {
        scheduled++;

        // IOO Trace 이벤트 로그
        await supabase.from('events').insert({
          org_id: DEFAULT_ORG_ID,
          type: 'consultation_scheduled',
          entity_id: risk.studentId,
          value: 0,
          status: 'completed',
          source: 'system',
          idempotency_key: `CONSULT-EVENT-${dedupeKey}`,
        });
      }
    }

    const summary = {
      scanned_at: new Date().toISOString(),
      risks_detected: risks.length,
      consultations_scheduled: scheduled,
      errors: errors.length,
    };

    console.log('[상담선생] 완료:', JSON.stringify(summary));

    return new Response(JSON.stringify({ ok: true, data: summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[상담선생] 실패:', errMsg);
    return new Response(JSON.stringify({ ok: false, error: errMsg, code: 'CONSULTATION_RISK_ERROR' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
