// =============================================================================
// AUTUS v1.0 - Risk Detection Worker
// Cron-driven worker that detects student risk signals every 15 minutes
// and triggers the 3-way chain: 출석 → 결제 → 상담
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

type RiskTriggerType =
  | 'absent_streak'
  | 'overdue_payment'
  | 'low_attendance_rate';

interface RiskFlag {
  id?: string;
  org_id: string;
  student_id: string;
  trigger_type: RiskTriggerType;
  severity: RiskSeverity;
  details: Record<string, unknown>;
  dedupe_key: string;
  status: 'open' | 'resolved' | 'expired';
  expires_at: string;
  created_at?: string;
}

interface PresenceRow {
  id: string;
  org_id: string;
  student_id: string;
  encounter_id: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  marked_at: string;
  created_at: string;
}

interface PaymentInvoiceRow {
  id: string;
  org_id: string;
  student_id: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  amount: number;
  payssam_invoice_id?: string;
  created_at: string;
}

interface ActionQueueInsert {
  action_type: string;
  priority: number;
  status: 'PENDING';
  payload: Record<string, unknown>;
  max_retries: number;
  dedupe_key: string;
  trace_id: string;
  expires_at: string;
}

interface IOOTraceParams {
  trace_id: string;
  phase: 'INPUT' | 'OPERATION' | 'OUTPUT';
  actor: string;
  action: string;
  target_type?: string;
  target_id?: string;
  payload?: Record<string, unknown>;
  result: 'pending' | 'success' | 'failure' | 'skipped';
  error_message?: string;
  duration_ms?: number;
}

interface PipelineStats {
  absent_streak_flags: number;
  overdue_payment_flags: number;
  low_attendance_flags: number;
  escalations_enqueued: number;
  expired_flags: number;
  total_new_flags: number;
}

// -----------------------------------------------------------------------------
// Supabase client (lazy, service-role for full access)
// -----------------------------------------------------------------------------

function getSupabase() {
  return getSupabaseAdmin();
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function generateTraceId(): string {
  return `risk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildDedupeKey(
  orgId: string,
  studentId: string,
  triggerType: RiskTriggerType,
): string {
  return `RISK-${orgId}-${studentId}-${triggerType}-${todayDateString()}`;
}

function severityFromStreak(streak: number): RiskSeverity {
  if (streak >= 7) return 'critical';
  if (streak >= 5) return 'high';
  if (streak >= 3) return 'medium';
  return 'low';
}

function severityFromAttendanceRate(rate: number): RiskSeverity {
  if (rate < 0.3) return 'critical';
  if (rate < 0.45) return 'high';
  if (rate < 0.6) return 'medium';
  return 'low';
}

function priorityFromSeverity(severity: RiskSeverity): number {
  switch (severity) {
    case 'critical': return 1;
    case 'high': return 2;
    case 'medium': return 3;
    case 'low': return 4;
  }
}

// TTL for risk flags: critical=14d, high=10d, medium=7d, low=5d
function ttlDaysFromSeverity(severity: RiskSeverity): number {
  switch (severity) {
    case 'critical': return 14;
    case 'high': return 10;
    case 'medium': return 7;
    case 'low': return 5;
  }
}

// -----------------------------------------------------------------------------
// IOO Trace Helper
// -----------------------------------------------------------------------------

async function logTrace(params: IOOTraceParams): Promise<void> {
  try {
    const { error } = await getSupabase().from('ioo_trace').insert(params);
    if (error) {
      console.error('[RiskDetection] Failed to insert IOO trace:', error.message);
    }
  } catch (err) {
    console.error('[RiskDetection] IOO trace insert threw:', err);
  }
}

// -----------------------------------------------------------------------------
// Deduplication: check if a flag already exists for today
// -----------------------------------------------------------------------------

async function flagExistsToday(dedupeKey: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('risk_flags')
    .select('id')
    .eq('dedupe_key', dedupeKey)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// -----------------------------------------------------------------------------
// Insert risk flag (with dedupe)
// -----------------------------------------------------------------------------

async function insertRiskFlag(
  flag: Omit<RiskFlag, 'id' | 'created_at'>,
  traceId: string,
): Promise<{ inserted: boolean; id?: string }> {
  const exists = await flagExistsToday(flag.dedupe_key);
  if (exists) {
    await logTrace({
      trace_id: traceId,
      phase: 'OPERATION',
      actor: 'risk-detection-worker',
      action: 'insert_risk_flag',
      target_type: 'risk_flags',
      payload: { dedupe_key: flag.dedupe_key, reason: 'duplicate_skipped' },
      result: 'skipped',
    });
    return { inserted: false };
  }

  const { data, error } = await getSupabase()
    .from('risk_flags')
    .insert({
      ...flag,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[RiskDetection] Failed to insert risk flag:', error.message);
    await logTrace({
      trace_id: traceId,
      phase: 'OPERATION',
      actor: 'risk-detection-worker',
      action: 'insert_risk_flag',
      target_type: 'risk_flags',
      payload: { dedupe_key: flag.dedupe_key },
      result: 'failure',
      error_message: error.message,
    });
    return { inserted: false };
  }

  await logTrace({
    trace_id: traceId,
    phase: 'OPERATION',
    actor: 'risk-detection-worker',
    action: 'insert_risk_flag',
    target_type: 'risk_flags',
    target_id: data?.id,
    payload: {
      trigger_type: flag.trigger_type,
      severity: flag.severity,
      student_id: flag.student_id,
    },
    result: 'success',
  });

  return { inserted: true, id: data?.id };
}

// -----------------------------------------------------------------------------
// Detection 1: Absent Streak (3+ consecutive ABSENT in last 14 days)
// -----------------------------------------------------------------------------

async function detectAbsentStreaks(traceId: string): Promise<number> {
  const supabase = getSupabase();
  const cutoff = daysAgo(14);
  let flagCount = 0;

  await logTrace({
    trace_id: traceId,
    phase: 'INPUT',
    actor: 'risk-detection-worker',
    action: 'detect_absent_streaks',
    payload: { cutoff, lookback_days: 14, threshold: 3 },
    result: 'pending',
  });

  // Fetch all ABSENT records in the last 14 days, ordered per student
  const { data: absences, error } = await supabase
    .from('presence')
    .select('id, org_id, student_id, status, marked_at')
    .eq('status', 'ABSENT')
    .gte('marked_at', cutoff)
    .order('student_id', { ascending: true })
    .order('marked_at', { ascending: true });

  if (error) {
    console.error('[RiskDetection] Failed to query absences:', error.message);
    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'risk-detection-worker',
      action: 'detect_absent_streaks',
      result: 'failure',
      error_message: error.message,
    });
    return 0;
  }

  if (!absences || absences.length === 0) {
    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'risk-detection-worker',
      action: 'detect_absent_streaks',
      payload: { absences_found: 0 },
      result: 'success',
    });
    return 0;
  }

  // Group by student_id and count consecutive absences
  // We count total absences per student in the window as a proxy for streaks.
  // A more precise approach would check encounter dates, but this is effective
  // for the cron cadence -- 3+ absences in 14 days is already a strong signal.
  const studentAbsences = new Map<string, { org_id: string; count: number; dates: string[] }>();

  for (const row of absences as PresenceRow[]) {
    const existing = studentAbsences.get(row.student_id);
    if (existing) {
      existing.count++;
      existing.dates.push(row.marked_at);
    } else {
      studentAbsences.set(row.student_id, {
        org_id: row.org_id,
        count: 1,
        dates: [row.marked_at],
      });
    }
  }

  // Create risk flags for students with 3+ absences
  for (const [studentId, info] of Array.from(studentAbsences.entries())) {
    if (info.count < 3) continue;

    const severity = severityFromStreak(info.count);
    const dedupeKey = buildDedupeKey(info.org_id, studentId, 'absent_streak');

    const result = await insertRiskFlag(
      {
        org_id: info.org_id,
        student_id: studentId,
        trigger_type: 'absent_streak',
        severity,
        details: {
          absent_count: info.count,
          lookback_days: 14,
          absent_dates: info.dates.slice(-7), // keep last 7 for brevity
        },
        dedupe_key: dedupeKey,
        status: 'open',
        expires_at: daysFromNow(ttlDaysFromSeverity(severity)),
      },
      traceId,
    );

    if (result.inserted) {
      flagCount++;
      await enqueueEscalation(
        info.org_id,
        studentId,
        'absent_streak',
        severity,
        result.id!,
        traceId,
      );
    }
  }

  await logTrace({
    trace_id: traceId,
    phase: 'OUTPUT',
    actor: 'risk-detection-worker',
    action: 'detect_absent_streaks',
    payload: { students_checked: studentAbsences.size, flags_created: flagCount },
    result: 'success',
  });

  return flagCount;
}

// -----------------------------------------------------------------------------
// Detection 2: Overdue Payment (sent invoices past due_date + 7 days)
// -----------------------------------------------------------------------------

async function detectOverduePayments(traceId: string): Promise<number> {
  const supabase = getSupabase();
  const overdueThreshold = daysAgo(7);
  let flagCount = 0;

  await logTrace({
    trace_id: traceId,
    phase: 'INPUT',
    actor: 'risk-detection-worker',
    action: 'detect_overdue_payments',
    payload: { overdue_threshold: overdueThreshold, grace_days: 7 },
    result: 'pending',
  });

  const { data: overdueInvoices, error } = await supabase
    .from('payment_invoices')
    .select('id, org_id, student_id, due_date, amount, status')
    .eq('status', 'sent')
    .lt('due_date', overdueThreshold);

  if (error) {
    console.error('[RiskDetection] Failed to query overdue invoices:', error.message);
    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'risk-detection-worker',
      action: 'detect_overdue_payments',
      result: 'failure',
      error_message: error.message,
    });
    return 0;
  }

  if (!overdueInvoices || overdueInvoices.length === 0) {
    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'risk-detection-worker',
      action: 'detect_overdue_payments',
      payload: { overdue_found: 0 },
      result: 'success',
    });
    return 0;
  }

  for (const invoice of overdueInvoices as PaymentInvoiceRow[]) {
    const daysPastDue = Math.floor(
      (Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Severity based on days overdue: 7-14=medium, 14-30=high, 30+=critical
    let severity: RiskSeverity = 'medium';
    if (daysPastDue >= 30) severity = 'critical';
    else if (daysPastDue >= 14) severity = 'high';

    const dedupeKey = buildDedupeKey(invoice.org_id, invoice.student_id, 'overdue_payment');

    const result = await insertRiskFlag(
      {
        org_id: invoice.org_id,
        student_id: invoice.student_id,
        trigger_type: 'overdue_payment',
        severity,
        details: {
          invoice_id: invoice.id,
          amount: invoice.amount,
          due_date: invoice.due_date,
          days_past_due: daysPastDue,
        },
        dedupe_key: dedupeKey,
        status: 'open',
        expires_at: daysFromNow(ttlDaysFromSeverity(severity)),
      },
      traceId,
    );

    if (result.inserted) {
      flagCount++;
      await enqueueEscalation(
        invoice.org_id,
        invoice.student_id,
        'overdue_payment',
        severity,
        result.id!,
        traceId,
      );
    }
  }

  await logTrace({
    trace_id: traceId,
    phase: 'OUTPUT',
    actor: 'risk-detection-worker',
    action: 'detect_overdue_payments',
    payload: { invoices_checked: overdueInvoices.length, flags_created: flagCount },
    result: 'success',
  });

  return flagCount;
}

// -----------------------------------------------------------------------------
// Detection 3: Low Attendance Rate (< 60% in last 30 days)
// -----------------------------------------------------------------------------

async function detectLowAttendanceRate(traceId: string): Promise<number> {
  const supabase = getSupabase();
  const cutoff = daysAgo(30);
  let flagCount = 0;

  await logTrace({
    trace_id: traceId,
    phase: 'INPUT',
    actor: 'risk-detection-worker',
    action: 'detect_low_attendance_rate',
    payload: { cutoff, lookback_days: 30, threshold: 0.6 },
    result: 'pending',
  });

  // Fetch all presence records in the last 30 days
  const { data: records, error } = await supabase
    .from('presence')
    .select('id, org_id, student_id, status, marked_at')
    .gte('marked_at', cutoff)
    .order('student_id', { ascending: true });

  if (error) {
    console.error('[RiskDetection] Failed to query attendance records:', error.message);
    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'risk-detection-worker',
      action: 'detect_low_attendance_rate',
      result: 'failure',
      error_message: error.message,
    });
    return 0;
  }

  if (!records || records.length === 0) {
    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'risk-detection-worker',
      action: 'detect_low_attendance_rate',
      payload: { records_found: 0 },
      result: 'success',
    });
    return 0;
  }

  // Group by student and calculate attendance rate
  const studentStats = new Map<
    string,
    { org_id: string; total: number; attended: number }
  >();

  for (const row of records as PresenceRow[]) {
    const existing = studentStats.get(row.student_id);
    const isAttended = row.status === 'PRESENT' || row.status === 'LATE';

    if (existing) {
      existing.total++;
      if (isAttended) existing.attended++;
    } else {
      studentStats.set(row.student_id, {
        org_id: row.org_id,
        total: 1,
        attended: isAttended ? 1 : 0,
      });
    }
  }

  for (const [studentId, stats] of Array.from(studentStats.entries())) {
    // Need at least 3 records to be meaningful
    if (stats.total < 3) continue;

    const rate = stats.attended / stats.total;
    if (rate >= 0.6) continue;

    const severity = severityFromAttendanceRate(rate);
    const dedupeKey = buildDedupeKey(stats.org_id, studentId, 'low_attendance_rate');

    const result = await insertRiskFlag(
      {
        org_id: stats.org_id,
        student_id: studentId,
        trigger_type: 'low_attendance_rate',
        severity,
        details: {
          attendance_rate: Math.round(rate * 100) / 100,
          total_sessions: stats.total,
          attended_sessions: stats.attended,
          lookback_days: 30,
        },
        dedupe_key: dedupeKey,
        status: 'open',
        expires_at: daysFromNow(ttlDaysFromSeverity(severity)),
      },
      traceId,
    );

    if (result.inserted) {
      flagCount++;
      await enqueueEscalation(
        stats.org_id,
        studentId,
        'low_attendance_rate',
        severity,
        result.id!,
        traceId,
      );
    }
  }

  await logTrace({
    trace_id: traceId,
    phase: 'OUTPUT',
    actor: 'risk-detection-worker',
    action: 'detect_low_attendance_rate',
    payload: { students_checked: studentStats.size, flags_created: flagCount },
    result: 'success',
  });

  return flagCount;
}

// -----------------------------------------------------------------------------
// Auto-Escalation: enqueue actions based on severity
// 3-way chain: 출석 → 결제 → 상담
// medium  → SEND_MESSAGE (부모 알림)
// high    → SEND_MESSAGE + auto-schedule consultation
// critical→ SEND_MESSAGE + consultation + ESCALATE_TO_OWNER
// -----------------------------------------------------------------------------

async function enqueueEscalation(
  orgId: string,
  studentId: string,
  triggerType: RiskTriggerType,
  severity: RiskSeverity,
  riskFlagId: string,
  traceId: string,
): Promise<number> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const priority = priorityFromSeverity(severity);
  let enqueued = 0;

  const triggerLabel: Record<RiskTriggerType, string> = {
    absent_streak: '출석 경고',
    overdue_payment: '미납 알림',
    low_attendance_rate: '출석률 저하',
  };

  // --- Step 1 (all severities >= medium): SEND_MESSAGE to parent ---
  if (severity === 'medium' || severity === 'high' || severity === 'critical') {
    const messageAction: ActionQueueInsert = {
      action_type: 'SEND_MESSAGE',
      priority,
      status: 'PENDING',
      payload: {
        org_id: orgId,
        student_id: studentId,
        risk_flag_id: riskFlagId,
        trigger_type: triggerType,
        template: `risk_alert_${triggerType}`,
        variables: {
          trigger_label: triggerLabel[triggerType],
          severity,
        },
      },
      max_retries: 3,
      dedupe_key: `MSG-${orgId}-${studentId}-${triggerType}-${todayDateString()}`,
      trace_id: traceId,
      expires_at: daysFromNow(2),
    };

    const { error: msgError } = await supabase
      .from('action_queue')
      .insert(messageAction);

    if (msgError) {
      console.error('[RiskDetection] Failed to enqueue SEND_MESSAGE:', msgError.message);
    } else {
      enqueued++;
    }
  }

  // --- Step 2 (high + critical): Auto-schedule consultation ---
  if (severity === 'high' || severity === 'critical') {
    const consultAction: ActionQueueInsert = {
      action_type: 'SCHEDULE_CONSULTATION',
      priority,
      status: 'PENDING',
      payload: {
        org_id: orgId,
        student_id: studentId,
        risk_flag_id: riskFlagId,
        trigger_type: triggerType,
        reason: `자동 상담 예약: ${triggerLabel[triggerType]} (${severity})`,
        severity,
      },
      max_retries: 3,
      dedupe_key: `CONSULT-${orgId}-${studentId}-${triggerType}-${todayDateString()}`,
      trace_id: traceId,
      expires_at: daysFromNow(3),
    };

    const { error: consultError } = await supabase
      .from('action_queue')
      .insert(consultAction);

    if (consultError) {
      console.error('[RiskDetection] Failed to enqueue SCHEDULE_CONSULTATION:', consultError.message);
    } else {
      enqueued++;
    }
  }

  // --- Step 3 (critical only): ESCALATE_TO_OWNER ---
  if (severity === 'critical') {
    const escalateAction: ActionQueueInsert = {
      action_type: 'ESCALATE_TO_OWNER',
      priority: 1, // highest priority
      status: 'PENDING',
      payload: {
        org_id: orgId,
        student_id: studentId,
        risk_flag_id: riskFlagId,
        trigger_type: triggerType,
        reason: `긴급 에스컬레이션: ${triggerLabel[triggerType]} (critical)`,
        severity: 'critical',
      },
      max_retries: 3,
      dedupe_key: `ESCALATE-${orgId}-${studentId}-${triggerType}-${todayDateString()}`,
      trace_id: traceId,
      expires_at: daysFromNow(1),
    };

    const { error: escError } = await supabase
      .from('action_queue')
      .insert(escalateAction);

    if (escError) {
      console.error('[RiskDetection] Failed to enqueue ESCALATE_TO_OWNER:', escError.message);
    } else {
      enqueued++;
    }
  }

  if (enqueued > 0) {
    await logTrace({
      trace_id: traceId,
      phase: 'OPERATION',
      actor: 'risk-detection-worker',
      action: 'enqueue_escalation',
      target_type: 'action_queue',
      target_id: riskFlagId,
      payload: {
        severity,
        trigger_type: triggerType,
        actions_enqueued: enqueued,
      },
      result: 'success',
    });
  }

  return enqueued;
}

// -----------------------------------------------------------------------------
// Expire old risk flags past their TTL
// -----------------------------------------------------------------------------

async function expireOldRiskFlags(traceId: string): Promise<number> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('risk_flags')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'open')
    .lt('expires_at', now)
    .select('id');

  if (error) {
    console.error('[RiskDetection] Failed to expire old risk flags:', error.message);
    return 0;
  }

  const expiredCount = data?.length ?? 0;

  if (expiredCount > 0) {
    console.log(`[RiskDetection] Expired ${expiredCount} risk flag(s)`);
    await logTrace({
      trace_id: traceId,
      phase: 'OPERATION',
      actor: 'risk-detection-worker',
      action: 'expire_old_flags',
      payload: { expired_count: expiredCount },
      result: 'success',
    });
  }

  return expiredCount;
}

// -----------------------------------------------------------------------------
// GET Handler (Vercel Cron entry point) -- runs every 15 minutes
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const traceId = generateTraceId();
  const startMs = Date.now();

  const stats: PipelineStats = {
    absent_streak_flags: 0,
    overdue_payment_flags: 0,
    low_attendance_flags: 0,
    escalations_enqueued: 0,
    expired_flags: 0,
    total_new_flags: 0,
  };

  try {
    // Log pipeline start
    await logTrace({
      trace_id: traceId,
      phase: 'INPUT',
      actor: 'risk-detection-worker',
      action: 'pipeline_start',
      payload: { timestamp: new Date().toISOString() },
      result: 'pending',
    });

    // Step 1: Expire old risk flags
    stats.expired_flags = await expireOldRiskFlags(traceId);

    // Step 2: Absent streak detection (출석)
    stats.absent_streak_flags = await detectAbsentStreaks(traceId);

    // Step 3: Overdue payment detection (결제)
    stats.overdue_payment_flags = await detectOverduePayments(traceId);

    // Step 4: Low attendance rate detection (상담 trigger)
    stats.low_attendance_flags = await detectLowAttendanceRate(traceId);

    // Summarize
    stats.total_new_flags =
      stats.absent_streak_flags +
      stats.overdue_payment_flags +
      stats.low_attendance_flags;

    const durationMs = Date.now() - startMs;

    // Log pipeline completion
    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'risk-detection-worker',
      action: 'pipeline_complete',
      payload: { ...stats },
      result: 'success',
      duration_ms: durationMs,
    });

    console.log(
      `[RiskDetection] Cycle complete in ${durationMs}ms: ` +
      `${stats.total_new_flags} new flags, ` +
      `${stats.expired_flags} expired, ` +
      `absent=${stats.absent_streak_flags}, ` +
      `overdue=${stats.overdue_payment_flags}, ` +
      `low_att=${stats.low_attendance_flags}`,
    );

    return NextResponse.json(
      { ok: true, trace_id: traceId, duration_ms: durationMs, ...stats },
      { status: 200 },
    );
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[RiskDetection] Fatal error:', errorMessage);

    await logTrace({
      trace_id: traceId,
      phase: 'OUTPUT',
      actor: 'risk-detection-worker',
      action: 'pipeline_error',
      result: 'failure',
      error_message: errorMessage,
      duration_ms: durationMs,
    });

    return NextResponse.json(
      { ok: false, error: errorMessage, trace_id: traceId, ...stats },
      { status: 500 },
    );
  }
}
