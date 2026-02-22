/**
 * ===========================================================================
 * Consultation Service - 상담선생 (Consultation Teacher)
 * Automated consultation scheduling triggered by risk detection
 * ===========================================================================
 *
 * Flow: risk_flags -> scheduleFromRisk -> consultation_sessions -> reminder -> complete
 *
 * IOO Trace:
 *   Input:  risk_flag detected (overdue_payment / low_vindex / absent_streak)
 *   Operation: create consultation_session + link risk_flag
 *   Output: enqueue reminder to action_queue + IOO audit trail
 *
 * Patterns: dedupe_key, IOO trace, action_queue, try/catch + __DEV__ logging
 */

import { supabase } from './supabase';

// ===========================================================================
// Types
// ===========================================================================

export type RiskTriggerType =
  | 'overdue_payment' | 'low_vindex' | 'failed_payment'
  | 'absent_streak' | 'no_response';

export type ConsultationStatusType =
  | 'scheduled' | 'reminded' | 'in_progress'
  | 'completed' | 'cancelled' | 'follow_up';

export interface ScheduleParams {
  orgId: string;
  studentId: string;
  parentPhone: string;
  triggerType: RiskTriggerType;
  triggerSnapshot: Record<string, unknown>;
  scheduledAt?: string;
}

export interface ManualScheduleParams extends ScheduleParams {
  reason: string;
}

export interface FollowUpAction {
  action: string;
  dueDate: string;
  status: 'pending' | 'done';
}

export interface ConsultationSession {
  id: string;
  org_id: string;
  student_id: string;
  parent_phone: string;
  status: ConsultationStatusType;
  trigger_type: RiskTriggerType;
  trigger_snapshot: Record<string, unknown>;
  risk_flag_id: string | null;
  scheduled_at: string | null;
  reminded_at: string | null;
  completed_at: string | null;
  coach_notes: string | null;
  follow_up_actions: FollowUpAction[] | null;
  dedupe_key: string;
  trace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultationStats {
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  followUp: number;
  byTrigger: Record<string, number>;
}

// ===========================================================================
// Utilities
// ===========================================================================

const uuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const dedupeKey = (orgId: string, studentId: string): string => {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `CONSULT-${orgId}-${studentId}-${ds}`;
};

const defaultSchedule = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
};

const now = () => new Date().toISOString();

// ===========================================================================
// IOO Trace + Action Queue (compact helpers matching encounterService pattern)
// ===========================================================================

type Phase = 'INPUT' | 'OPERATION' | 'OUTPUT';
type Result = 'pending' | 'success' | 'failure' | 'skipped';

async function trace(
  traceId: string, phase: Phase, action: string,
  targetId: string, payload: Record<string, unknown>,
  result: Result, extra?: { error?: string; ms?: number },
): Promise<void> {
  try {
    await supabase.from('ioo_trace').insert({
      id: uuid(), trace_id: traceId, phase, actor: 'consultation_service',
      action, target_type: 'consultation_session', target_id: targetId,
      payload, result, error_message: extra?.error ?? null,
      duration_ms: extra?.ms ?? null,
    });
  } catch (err: unknown) {
    if (__DEV__) console.warn('[ConsultationService] IOO trace error:', err);
  }
}

async function enqueue(
  actionType: string, payload: Record<string, unknown>,
  dedupeStr: string, traceId: string, priority = 5,
): Promise<void> {
  try {
    const { error } = await supabase.from('action_queue').insert({
      id: uuid(), action_type: actionType, priority, status: 'PENDING',
      payload, retry_count: 0, max_retries: 3, next_retry_at: null,
      last_error: null, expires_at: null, dedupe_key: dedupeStr,
      trace_id: traceId, result: null, processed_at: null,
    });
    if (error && __DEV__) console.warn('[ConsultationService] enqueue fail:', error.message);
  } catch (err: unknown) {
    if (__DEV__) console.warn('[ConsultationService] enqueue error:', err);
  }
}

// ===========================================================================
// ConsultationService
// ===========================================================================

export const ConsultationService = {

  /**
   * 자동 상담 예약 (risk_flag에서 트리거)
   * 1. Read risk_flag -> 2. Dedupe check -> 3. Insert session
   * 4. Link risk_flag -> 5. IOO trace -> 6. Enqueue reminder
   */
  async scheduleFromRisk(riskFlagId: string, p: ScheduleParams): Promise<string | null> {
    const tid = uuid();
    const t0 = Date.now();
    try {
      // 1. Read risk_flag
      const { data: flag, error: flagErr } = await supabase
        .from('risk_flags').select('*').eq('id', riskFlagId).single();
      if (flagErr || !flag) {
        if (__DEV__) console.warn('[ConsultationService] Risk flag not found:', riskFlagId);
        return null;
      }

      await trace(tid, 'INPUT', 'schedule_from_risk', riskFlagId,
        { risk_flag_id: riskFlagId, trigger_type: p.triggerType, student_id: p.studentId }, 'pending');

      // 2. Dedupe
      const dk = dedupeKey(p.orgId, p.studentId);
      const { data: dup } = await supabase
        .from('consultation_sessions').select('id').eq('dedupe_key', dk).single();
      if (dup) {
        if (__DEV__) console.log('[ConsultationService] Duplicate skipped:', dk);
        await trace(tid, 'OUTPUT', 'schedule_from_risk', dup.id, { dedupe_key: dk }, 'skipped', { ms: Date.now() - t0 });
        return dup.id;
      }

      // 3. Insert consultation_session
      const schedAt = p.scheduledAt || defaultSchedule();
      const { data: session, error: insErr } = await supabase
        .from('consultation_sessions')
        .insert({
          org_id: p.orgId, student_id: p.studentId, parent_phone: p.parentPhone,
          status: 'scheduled', trigger_type: p.triggerType,
          trigger_snapshot: p.triggerSnapshot, risk_flag_id: riskFlagId,
          scheduled_at: schedAt, dedupe_key: dk, trace_id: tid,
        })
        .select('id').single();

      if (insErr || !session) {
        if (__DEV__) console.error('[ConsultationService] Insert failed:', insErr?.message);
        await trace(tid, 'OUTPUT', 'schedule_from_risk', riskFlagId,
          { error: insErr?.message }, 'failure', { error: insErr?.message, ms: Date.now() - t0 });
        return null;
      }

      // 4. Link risk_flag
      const { error: linkErr } = await supabase.from('risk_flags')
        .update({ consultation_id: session.id, action_taken: 'consultation_scheduled' })
        .eq('id', riskFlagId);
      if (linkErr && __DEV__) console.warn('[ConsultationService] Link risk_flag failed:', linkErr.message);

      // 5. IOO trace
      await trace(tid, 'OPERATION', 'schedule_from_risk', session.id,
        { consultation_id: session.id, risk_flag_id: riskFlagId, dedupe_key: dk }, 'success', { ms: Date.now() - t0 });

      // 6. Enqueue reminder
      await enqueue('SEND_CONSULTATION_REMINDER', {
        consultation_id: session.id, student_id: p.studentId,
        parent_phone: p.parentPhone, scheduled_at: schedAt, trigger_type: p.triggerType,
      }, `REMIND-${dk}`, tid);

      await trace(tid, 'OUTPUT', 'schedule_from_risk', session.id,
        { consultation_id: session.id, reminder_enqueued: true }, 'success', { ms: Date.now() - t0 });

      if (__DEV__) console.log('[ConsultationService] Scheduled from risk:', session.id);
      return session.id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (__DEV__) console.error('[ConsultationService] scheduleFromRisk error:', msg);
      await trace(tid, 'OUTPUT', 'schedule_from_risk', riskFlagId, { error: msg }, 'failure', { error: msg, ms: Date.now() - t0 });
      return null;
    }
  },

  /**
   * 수동 상담 예약
   * Same flow without risk_flag; reason stored in trigger_snapshot.
   */
  async scheduleManual(p: ManualScheduleParams): Promise<string | null> {
    const tid = uuid();
    const t0 = Date.now();
    try {
      const dk = dedupeKey(p.orgId, p.studentId);
      const { data: dup } = await supabase
        .from('consultation_sessions').select('id').eq('dedupe_key', dk).single();
      if (dup) {
        if (__DEV__) console.log('[ConsultationService] Manual duplicate skipped:', dk);
        return dup.id;
      }

      const schedAt = p.scheduledAt || defaultSchedule();
      const { data: session, error } = await supabase
        .from('consultation_sessions')
        .insert({
          org_id: p.orgId, student_id: p.studentId, parent_phone: p.parentPhone,
          status: 'scheduled', trigger_type: p.triggerType,
          trigger_snapshot: { ...p.triggerSnapshot, manual_reason: p.reason },
          risk_flag_id: null, scheduled_at: schedAt, dedupe_key: dk, trace_id: tid,
        })
        .select('id').single();

      if (error || !session) {
        if (__DEV__) console.error('[ConsultationService] Manual insert failed:', error?.message);
        return null;
      }

      await trace(tid, 'OPERATION', 'schedule_manual', session.id,
        { consultation_id: session.id, reason: p.reason, dedupe_key: dk }, 'success', { ms: Date.now() - t0 });

      await enqueue('SEND_CONSULTATION_REMINDER', {
        consultation_id: session.id, student_id: p.studentId,
        parent_phone: p.parentPhone, scheduled_at: schedAt,
        trigger_type: p.triggerType, manual_reason: p.reason,
      }, `REMIND-${dk}`, tid);

      if (__DEV__) console.log('[ConsultationService] Manual scheduled:', session.id);
      return session.id;
    } catch (err: unknown) {
      if (__DEV__) console.error('[ConsultationService] scheduleManual error:', err);
      return null;
    }
  },

  /**
   * 상담 시작 — scheduled | reminded -> in_progress
   */
  async startConsultation(sessionId: string): Promise<boolean> {
    const tid = uuid();
    try {
      const { data, error } = await supabase
        .from('consultation_sessions')
        .update({ status: 'in_progress', updated_at: now() })
        .eq('id', sessionId)
        .in('status', ['scheduled', 'reminded'])
        .select('id, trace_id').single();

      if (error || !data) {
        if (__DEV__) console.warn('[ConsultationService] Start failed:', error?.message);
        return false;
      }

      await trace(data.trace_id || tid, 'OPERATION', 'start_consultation', sessionId,
        { status: 'in_progress' }, 'success');

      if (__DEV__) console.log('[ConsultationService] Started:', sessionId);
      return true;
    } catch (err: unknown) {
      if (__DEV__) console.error('[ConsultationService] startConsultation error:', err);
      return false;
    }
  },

  /**
   * 상담 완료 + 후속 조치 기록
   * follow_up actions -> status='follow_up'; else -> 'completed' + resolve risk_flag
   */
  async completeConsultation(
    sessionId: string, notes: string, followUpActions?: FollowUpAction[],
  ): Promise<boolean> {
    const tid = uuid();
    const t0 = Date.now();
    try {
      const hasFollowUp = followUpActions && followUpActions.length > 0;
      const newStatus: ConsultationStatusType = hasFollowUp ? 'follow_up' : 'completed';

      const { data, error } = await supabase
        .from('consultation_sessions')
        .update({
          status: newStatus, completed_at: now(), coach_notes: notes,
          follow_up_actions: followUpActions?.map(a => ({
            action: a.action, dueDate: a.dueDate, status: a.status || 'pending',
          })) ?? null,
          updated_at: now(),
        })
        .eq('id', sessionId)
        .in('status', ['scheduled', 'reminded', 'in_progress'])
        .select('id, org_id, student_id, risk_flag_id, trace_id').single();

      if (error || !data) {
        if (__DEV__) console.error('[ConsultationService] Complete failed:', error?.message);
        return false;
      }

      // Update linked risk_flag
      if (data.risk_flag_id) {
        const rfUpdate = hasFollowUp
          ? { status: 'follow_up', action_taken: 'consultation_follow_up' }
          : { status: 'resolved', action_taken: 'consultation_completed' };
        const { error: rfErr } = await supabase.from('risk_flags')
          .update(rfUpdate).eq('id', data.risk_flag_id);
        if (rfErr && __DEV__) console.warn('[ConsultationService] risk_flag update failed:', rfErr.message);
      }

      await trace(data.trace_id || tid, 'OUTPUT', 'complete_consultation', sessionId, {
        status: newStatus, has_follow_up: !!hasFollowUp,
        follow_up_count: followUpActions?.length ?? 0,
      }, 'success', { ms: Date.now() - t0 });

      if (__DEV__) console.log('[ConsultationService] Completed:', sessionId, newStatus);
      return true;
    } catch (err: unknown) {
      if (__DEV__) console.error('[ConsultationService] completeConsultation error:', err);
      return false;
    }
  },

  /**
   * 상담 취소 — any active status -> cancelled
   */
  async cancelConsultation(sessionId: string, reason?: string): Promise<boolean> {
    const tid = uuid();
    try {
      const payload: Record<string, unknown> = { status: 'cancelled', updated_at: now() };
      if (reason) payload.coach_notes = reason;

      const { data, error } = await supabase
        .from('consultation_sessions')
        .update(payload).eq('id', sessionId)
        .in('status', ['scheduled', 'reminded', 'in_progress', 'follow_up'])
        .select('id, risk_flag_id, trace_id').single();

      if (error || !data) {
        if (__DEV__) console.warn('[ConsultationService] Cancel failed:', error?.message);
        return false;
      }

      if (data.risk_flag_id) {
        await supabase.from('risk_flags')
          .update({ status: 'expired', action_taken: 'consultation_cancelled' })
          .eq('id', data.risk_flag_id);
      }

      await trace(data.trace_id || tid, 'OUTPUT', 'cancel_consultation', sessionId,
        { reason: reason || 'no reason' }, 'success');

      if (__DEV__) console.log('[ConsultationService] Cancelled:', sessionId);
      return true;
    } catch (err: unknown) {
      if (__DEV__) console.error('[ConsultationService] cancelConsultation error:', err);
      return false;
    }
  },

  /**
   * 대기 중 상담 목록 (scheduled/reminded/in_progress/follow_up)
   */
  async getPendingConsultations(orgId?: string): Promise<ConsultationSession[]> {
    try {
      let query = supabase.from('consultation_sessions').select('*')
        .in('status', ['scheduled', 'reminded', 'in_progress', 'follow_up'])
        .order('scheduled_at', { ascending: true });
      if (orgId) query = query.eq('org_id', orgId);

      const { data, error } = await query;
      if (error) {
        if (__DEV__) console.warn('[ConsultationService] getPending failed:', error.message);
        return [];
      }
      return (data as ConsultationSession[]) ?? [];
    } catch (err: unknown) {
      if (__DEV__) console.error('[ConsultationService] getPendingConsultations error:', err);
      return [];
    }
  },

  /**
   * 학생별 상담 이력 (newest first)
   */
  async getStudentConsultations(studentId: string): Promise<ConsultationSession[]> {
    try {
      const { data, error } = await supabase.from('consultation_sessions').select('*')
        .eq('student_id', studentId).order('created_at', { ascending: false });
      if (error) {
        if (__DEV__) console.warn('[ConsultationService] getStudent failed:', error.message);
        return [];
      }
      return (data as ConsultationSession[]) ?? [];
    } catch (err: unknown) {
      if (__DEV__) console.error('[ConsultationService] getStudentConsultations error:', err);
      return [];
    }
  },

  /**
   * 월별 통계 — counts by status and trigger type for current month
   */
  async getMonthlyStats(orgId: string): Promise<ConsultationStats> {
    const empty: ConsultationStats = { total: 0, completed: 0, cancelled: 0, pending: 0, followUp: 0, byTrigger: {} };
    try {
      const d = new Date();
      const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const { data, error } = await supabase.from('consultation_sessions')
        .select('status, trigger_type').eq('org_id', orgId)
        .gte('created_at', from).lte('created_at', to);

      if (error || !data?.length) {
        if (error && __DEV__) console.warn('[ConsultationService] getMonthlyStats failed:', error.message);
        return empty;
      }

      const stats: ConsultationStats = { total: data.length, completed: 0, cancelled: 0, pending: 0, followUp: 0, byTrigger: {} };
      for (const r of data) {
        if (r.status === 'completed') stats.completed++;
        else if (r.status === 'cancelled') stats.cancelled++;
        else if (r.status === 'follow_up') stats.followUp++;
        else stats.pending++;
        if (r.trigger_type) stats.byTrigger[r.trigger_type] = (stats.byTrigger[r.trigger_type] || 0) + 1;
      }
      if (__DEV__) console.log('[ConsultationService] Monthly stats:', stats);
      return stats;
    } catch (err: unknown) {
      if (__DEV__) console.error('[ConsultationService] getMonthlyStats error:', err);
      return empty;
    }
  },

  /**
   * 리마인드 발송 — scheduled -> reminded + enqueue SEND_MESSAGE to action_queue
   */
  async sendReminder(sessionId: string): Promise<boolean> {
    const tid = uuid();
    try {
      const { data, error } = await supabase
        .from('consultation_sessions')
        .update({ status: 'reminded', reminded_at: now(), updated_at: now() })
        .eq('id', sessionId).eq('status', 'scheduled')
        .select('id, student_id, parent_phone, scheduled_at, trigger_type, trace_id, dedupe_key')
        .single();

      if (error || !data) {
        if (__DEV__) console.warn('[ConsultationService] Reminder update failed:', error?.message);
        return false;
      }

      await enqueue('SEND_MESSAGE', {
        consultation_id: data.id, student_id: data.student_id,
        parent_phone: data.parent_phone, scheduled_at: data.scheduled_at,
        trigger_type: data.trigger_type, message_type: 'consultation_reminder',
      }, `SEND_MSG-REMIND-${data.dedupe_key}`, data.trace_id || tid, 3);

      await trace(data.trace_id || tid, 'OUTPUT', 'send_reminder', sessionId,
        { parent_phone: data.parent_phone, scheduled_at: data.scheduled_at }, 'success');

      if (__DEV__) console.log('[ConsultationService] Reminder sent:', sessionId);
      return true;
    } catch (err: unknown) {
      if (__DEV__) console.error('[ConsultationService] sendReminder error:', err);
      return false;
    }
  },
};

export default ConsultationService;
