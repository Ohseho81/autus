/**
 * ===========================================================================
 * PaySSAM Service - 결제선생 Integration (Invoice Lifecycle)
 * Architecture v3 - IOO trace, dedupe, offline-aware
 * ===========================================================================
 *
 * Flow: createInvoice (pending) -> sendInvoice (sent) -> confirmPayment (paid)
 *
 * Patterns:
 *   - IOO trace logging for full audit trail
 *   - Idempotency via dedupe_key (PAYSSAM-{orgId}-{studentId}-{YYYYMM})
 *   - Stubbed API calls (partner registration pending)
 *   - try/catch with __DEV__ console logging
 */

import { supabase } from './supabase';

// ===========================================================================
// Types
// ===========================================================================

export type PaySSAMInvoiceStatus = 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'failed';

type IOOPhase = 'INPUT' | 'OPERATION' | 'OUTPUT';
type IOOResult = 'pending' | 'success' | 'failure' | 'skipped';

export interface CreateInvoiceParams {
  orgId: string;
  studentId: string;
  parentPhone: string;
  amount: number;
  description: string;
  dueDate?: string;  // YYYY-MM-DD, defaults to 7 days from now
  traceId?: string;
}

export interface PaymentInvoice {
  id: string;
  org_id: string;
  student_id: string | null;
  parent_phone: string;
  amount: number;
  description: string;
  due_date: string | null;
  payssam_invoice_id: string | null;
  status: PaySSAMInvoiceStatus;
  sent_at: string | null;
  paid_at: string | null;
  callback_received_at: string | null;
  point_cost: number;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  raw_response: Record<string, unknown> | null;
  dedupe_key: string;
  trace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceStats {
  total: number;
  paid: number;
  unpaid: number;
  paidAmount: number;
  unpaidAmount: number;
  pointCost: number;
}

// ===========================================================================
// Utilities
// ===========================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

function formatYYYYMM(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ===========================================================================
// IOO Trace Logger (same pattern as encounterService.ts)
// ===========================================================================

async function logIOO(p: {
  trace_id: string; phase: IOOPhase; actor: string; action: string;
  target_type: string; target_id: string; payload: Record<string, unknown>;
  result: IOOResult; error_message?: string; duration_ms?: number;
}): Promise<void> {
  try {
    const { error } = await supabase.from('ioo_trace').insert({
      id: generateUUID(), ...p,
      error_message: p.error_message ?? null,
      duration_ms: p.duration_ms ?? null,
    });
    if (error && __DEV__) console.warn('[PaySSAMService] IOO trace failed:', error.message);
  } catch (err: unknown) {
    if (__DEV__) console.warn('[PaySSAMService] IOO trace error:', err);
  }
}

async function getActor(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? 'system';
  } catch { return 'system'; }
}

// ===========================================================================
// Stubbed 결제선생 API (TODO: replace after partner registration)
// Contact: poqdev@payletter.com | Endpoint: https://api.payssam.kr/v1
// ===========================================================================

async function stubSendInvoice(_p: {
  parentPhone: string; amount: number; description: string;
  dueDate: string; metadata: Record<string, unknown>;
}): Promise<{ invoiceId: string; remainingPoints: number }> {
  // TODO: 결제선생 파트너 등록 후 실제 API 호출로 교체
  if (__DEV__) console.log('[PaySSAMService] STUB: sendInvoice', _p);
  return { invoiceId: `STUB-${generateUUID().slice(0, 8)}`, remainingPoints: 9945 };
}

async function stubCancelInvoice(_id: string): Promise<boolean> {
  // TODO: 결제선생 파트너 등록 후 실제 API 호출로 교체
  if (__DEV__) console.log('[PaySSAMService] STUB: cancelInvoice', _id);
  return true;
}

// ===========================================================================
// PaySSAMService
// ===========================================================================

export const PaySSAMService = {
  /** 청구서 생성 (DB에 pending 상태로 저장) */
  async createInvoice(params: CreateInvoiceParams): Promise<string | null> {
    const traceId = params.traceId ?? generateUUID();
    const dedupeKey = `PAYSSAM-${params.orgId}-${params.studentId}-${formatYYYYMM(new Date())}`;
    const dueDate = params.dueDate ?? defaultDueDate();
    const actor = await getActor();

    if (__DEV__) console.log('[PaySSAMService] createInvoice:', { ...params, dedupeKey, traceId });

    try {
      // IOO INPUT
      await logIOO({
        trace_id: traceId, phase: 'INPUT', actor,
        action: 'create_invoice', target_type: 'payment_invoice', target_id: params.studentId,
        payload: { org_id: params.orgId, student_id: params.studentId, amount: params.amount, dedupe_key: dedupeKey },
        result: 'pending',
      });

      const { data, error } = await supabase
        .from('payment_invoices')
        .insert({
          org_id: params.orgId, student_id: params.studentId,
          parent_phone: params.parentPhone, amount: params.amount,
          description: params.description, due_date: dueDate,
          status: 'pending' as PaySSAMInvoiceStatus,
          point_cost: 55, dedupe_key: dedupeKey, trace_id: traceId, retry_count: 0,
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          if (__DEV__) console.warn('[PaySSAMService] Duplicate dedupe_key:', dedupeKey);
          await logIOO({ trace_id: traceId, phase: 'OUTPUT', actor, action: 'create_invoice',
            target_type: 'payment_invoice', target_id: params.studentId,
            payload: { dedupe_key: dedupeKey }, result: 'skipped', error_message: 'Duplicate invoice' });
          return null;
        }
        throw error;
      }

      if (__DEV__) console.log('[PaySSAMService] Invoice created:', data.id);
      return data.id as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await logIOO({ trace_id: traceId, phase: 'OUTPUT', actor, action: 'create_invoice',
        target_type: 'payment_invoice', target_id: params.studentId,
        payload: { dedupe_key: dedupeKey }, result: 'failure', error_message: msg });
      if (__DEV__) console.warn('[PaySSAMService] createInvoice error:', msg);
      return null;
    }
  },

  /** 청구서 발송 (결제선생 API 호출 -> sent 상태) */
  async sendInvoice(invoiceId: string): Promise<boolean> {
    const actor = await getActor();
    const t0 = Date.now();

    try {
      const { data: inv, error: fe } = await supabase
        .from('payment_invoices').select('*').eq('id', invoiceId).single();

      if (fe || !inv) { if (__DEV__) console.warn('[PaySSAMService] Not found:', invoiceId); return false; }
      const r = inv as PaymentInvoice;

      if (r.status !== 'pending' && r.status !== 'failed') {
        if (__DEV__) console.warn('[PaySSAMService] Cannot send, status:', r.status);
        return false;
      }

      const traceId = r.trace_id ?? generateUUID();

      // IOO OPERATION
      await logIOO({ trace_id: traceId, phase: 'OPERATION', actor, action: 'send_invoice',
        target_type: 'payment_invoice', target_id: invoiceId,
        payload: { parent_phone: r.parent_phone, amount: r.amount }, result: 'pending' });

      // TODO: Replace stub with real 결제선생 API
      const api = await stubSendInvoice({
        parentPhone: r.parent_phone, amount: r.amount, description: r.description,
        dueDate: r.due_date ?? defaultDueDate(),
        metadata: { org_id: r.org_id, student_id: r.student_id, invoice_id: invoiceId },
      });

      const ms = Date.now() - t0;

      const { error: ue } = await supabase.from('payment_invoices').update({
        status: 'sent' as PaySSAMInvoiceStatus,
        payssam_invoice_id: api.invoiceId, sent_at: new Date().toISOString(),
        raw_response: { stub: true, ...api }, error_code: null, error_message: null,
      }).eq('id', invoiceId);

      if (ue) {
        await logIOO({ trace_id: traceId, phase: 'OUTPUT', actor, action: 'send_invoice',
          target_type: 'payment_invoice', target_id: invoiceId,
          payload: { payssam_invoice_id: api.invoiceId }, result: 'failure',
          error_message: ue.message, duration_ms: ms });
        if (__DEV__) console.warn('[PaySSAMService] Update failed:', ue.message);
        return false;
      }

      // IOO OUTPUT
      await logIOO({ trace_id: traceId, phase: 'OUTPUT', actor, action: 'send_invoice',
        target_type: 'payment_invoice', target_id: invoiceId,
        payload: { payssam_invoice_id: api.invoiceId, remaining_points: api.remainingPoints },
        result: 'success', duration_ms: ms });

      if (__DEV__) console.log('[PaySSAMService] Sent:', invoiceId, `(${ms}ms)`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown send error';
      await supabase.from('payment_invoices').update({
        status: 'failed' as PaySSAMInvoiceStatus,
        error_code: 'SEND_ERROR', error_message: msg,
      }).eq('id', invoiceId);
      if (__DEV__) console.warn('[PaySSAMService] sendInvoice error:', msg);
      return false;
    }
  },

  /** 청구서 상태 조회 */
  async getInvoice(invoiceId: string): Promise<PaymentInvoice | null> {
    try {
      const { data, error } = await supabase
        .from('payment_invoices').select('*').eq('id', invoiceId).single();
      if (error || !data) { if (__DEV__) console.warn('[PaySSAMService] getInvoice:', error?.message); return null; }
      return data as PaymentInvoice;
    } catch (err: unknown) {
      if (__DEV__) console.warn('[PaySSAMService] getInvoice error:', err);
      return null;
    }
  },

  /** 학생별 청구서 목록 (최신순) */
  async getStudentInvoices(studentId: string): Promise<PaymentInvoice[]> {
    try {
      const { data, error } = await supabase
        .from('payment_invoices').select('*')
        .eq('student_id', studentId).order('created_at', { ascending: false });
      if (error) { if (__DEV__) console.warn('[PaySSAMService] getStudentInvoices:', error.message); return []; }
      return (data as PaymentInvoice[]) ?? [];
    } catch (err: unknown) {
      if (__DEV__) console.warn('[PaySSAMService] getStudentInvoices error:', err);
      return [];
    }
  },

  /** 미납 청구서 목록 (sent/overdue + due_date past) */
  async getOverdueInvoices(orgId?: string): Promise<PaymentInvoice[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      let q = supabase.from('payment_invoices').select('*')
        .in('status', ['sent', 'overdue']).lt('due_date', today)
        .order('due_date', { ascending: true });
      if (orgId) q = q.eq('org_id', orgId);

      const { data, error } = await q;
      if (error) { if (__DEV__) console.warn('[PaySSAMService] getOverdueInvoices:', error.message); return []; }
      return (data as PaymentInvoice[]) ?? [];
    } catch (err: unknown) {
      if (__DEV__) console.warn('[PaySSAMService] getOverdueInvoices error:', err);
      return [];
    }
  },

  /** 수납 확인 처리 (webhook callback) */
  async confirmPayment(paySSAMInvoiceId: string, rawResponse: object): Promise<boolean> {
    const t0 = Date.now();
    try {
      const { data: inv, error: fe } = await supabase.from('payment_invoices')
        .select('id, trace_id, student_id, status')
        .eq('payssam_invoice_id', paySSAMInvoiceId).single();

      if (fe || !inv) {
        if (__DEV__) console.warn('[PaySSAMService] Not found for payssam_id:', paySSAMInvoiceId);
        return false;
      }
      if (inv.status !== 'sent' && inv.status !== 'overdue') {
        if (__DEV__) console.warn('[PaySSAMService] Cannot confirm, status:', inv.status);
        return false;
      }

      const traceId = (inv.trace_id as string) ?? generateUUID();
      const now = new Date().toISOString();

      const { error: ue } = await supabase.from('payment_invoices').update({
        status: 'paid' as PaySSAMInvoiceStatus,
        paid_at: now, callback_received_at: now,
        raw_response: rawResponse as Record<string, unknown>,
      }).eq('id', inv.id);

      const ms = Date.now() - t0;

      if (ue) {
        await logIOO({ trace_id: traceId, phase: 'OUTPUT', actor: 'webhook', action: 'confirm_payment',
          target_type: 'payment_invoice', target_id: inv.id as string,
          payload: { payssam_invoice_id: paySSAMInvoiceId }, result: 'failure',
          error_message: ue.message, duration_ms: ms });
        if (__DEV__) console.warn('[PaySSAMService] confirmPayment failed:', ue.message);
        return false;
      }

      // IOO OUTPUT
      await logIOO({ trace_id: traceId, phase: 'OUTPUT', actor: 'webhook', action: 'confirm_payment',
        target_type: 'payment_invoice', target_id: inv.id as string,
        payload: { payssam_invoice_id: paySSAMInvoiceId, student_id: inv.student_id, paid_at: now },
        result: 'success', duration_ms: ms });

      if (__DEV__) console.log('[PaySSAMService] Payment confirmed:', inv.id, `(${ms}ms)`);
      return true;
    } catch (err: unknown) {
      if (__DEV__) console.warn('[PaySSAMService] confirmPayment error:', err);
      return false;
    }
  },

  /** 월별 통계 */
  async getMonthlyStats(orgId: string, month?: Date): Promise<InvoiceStats> {
    const empty: InvoiceStats = { total: 0, paid: 0, unpaid: 0, paidAmount: 0, unpaidAmount: 0, pointCost: 0 };
    try {
      const m = month ?? new Date();
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase.from('payment_invoices')
        .select('status, amount, point_cost').eq('org_id', orgId)
        .gte('created_at', start.toISOString()).lte('created_at', end.toISOString());

      if (error) { if (__DEV__) console.warn('[PaySSAMService] getMonthlyStats:', error.message); return empty; }
      if (!data || data.length === 0) return empty;

      const s: InvoiceStats = { total: data.length, paid: 0, unpaid: 0, paidAmount: 0, unpaidAmount: 0, pointCost: 0 };
      for (const row of data) {
        const amt = (row.amount as number) ?? 0;
        s.pointCost += (row.point_cost as number) ?? 0;
        if (row.status === 'paid') { s.paid++; s.paidAmount += amt; }
        else if (row.status === 'sent' || row.status === 'overdue') { s.unpaid++; s.unpaidAmount += amt; }
      }
      return s;
    } catch (err: unknown) {
      if (__DEV__) console.warn('[PaySSAMService] getMonthlyStats error:', err);
      return empty;
    }
  },

  /** 청구서 취소 (pending/sent only; sent -> also calls 결제선생 cancel API) */
  async cancelInvoice(invoiceId: string, reason?: string): Promise<boolean> {
    const actor = await getActor();
    try {
      const { data: inv, error: fe } = await supabase.from('payment_invoices')
        .select('id, trace_id, status, payssam_invoice_id')
        .eq('id', invoiceId).single();

      if (fe || !inv) { if (__DEV__) console.warn('[PaySSAMService] Not found:', invoiceId); return false; }
      if (inv.status !== 'pending' && inv.status !== 'sent') {
        if (__DEV__) console.warn('[PaySSAMService] Cannot cancel, status:', inv.status);
        return false;
      }

      const traceId = (inv.trace_id as string) ?? generateUUID();

      // If sent, call 결제선생 cancel API (STUBBED)
      if (inv.status === 'sent' && inv.payssam_invoice_id) {
        const ok = await stubCancelInvoice(inv.payssam_invoice_id as string);
        if (!ok) { if (__DEV__) console.warn('[PaySSAMService] External cancel failed'); return false; }
      }

      const { error: ue } = await supabase.from('payment_invoices').update({
        status: 'cancelled' as PaySSAMInvoiceStatus, error_message: reason ?? null,
      }).eq('id', invoiceId);

      if (ue) { if (__DEV__) console.warn('[PaySSAMService] Cancel update failed:', ue.message); return false; }

      await logIOO({ trace_id: traceId, phase: 'OUTPUT', actor, action: 'cancel_invoice',
        target_type: 'payment_invoice', target_id: invoiceId,
        payload: { reason: reason ?? 'none' }, result: 'success' });

      if (__DEV__) console.log('[PaySSAMService] Cancelled:', invoiceId);
      return true;
    } catch (err: unknown) {
      if (__DEV__) console.warn('[PaySSAMService] cancelInvoice error:', err);
      return false;
    }
  },
};
