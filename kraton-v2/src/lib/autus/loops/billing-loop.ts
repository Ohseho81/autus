/**
 * ============================================================================
 * AUTUS 3 - Billing Loop (L2)
 *
 * Aggregate attendance -> calculate invoice -> send -> track payment
 *
 * Trigger:  Monthly billing cycle (scheduler) or manual invoice request
 * Close:    renewal.succeeded (A-Tier) on successful payment
 * Escalate: renewal.failed   (S-Tier) on payment failure -> retention_process
 * ============================================================================
 */

import { getSupabase } from '../../supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvoiceStatus = 'pending' | 'sent' | 'paid' | 'overdue' | 'failed';

export interface Invoice {
  id: string;
  student_id: string;
  parent_id: string;
  organization_id: string;
  month: string;                // YYYY-MM
  session_count: number;
  base_amount: number;          // KRW before discount
  discount_rate: number;        // 0.0 - 1.0
  discount_amount: number;      // KRW discount
  total_amount: number;         // KRW final
  status: InvoiceStatus;
  due_date: string;             // ISO date
  paid_at: string | null;
  created_at: string;
}

export interface AttendanceSummary {
  student_id: string;
  month: string;
  total_sessions: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  billable_sessions: number;    // present + late
}

export interface OverdueInvoice {
  invoice_id: string;
  student_id: string;
  parent_id: string;
  student_name: string;
  total_amount: number;
  due_date: string;
  days_overdue: number;
}

export interface PaymentData {
  invoiceId: string;
  amount: number;
  status: 'paid' | 'failed';
  transactionId?: string;
  paymentMethod?: string;
}

interface EventLedgerEntry {
  event_type: string;
  event_category: string;
  entity_id: string;
  entity_type: string;
  state_from: string | null;
  state_to: string;
  payload: Record<string, unknown>;
  actor_type: 'system';
  source: 'autus_loop';
  occurred_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sessions per month that qualify for the bulk discount */
const DISCOUNT_SESSION_THRESHOLD = 8;

/** Discount percentage for 8+ sessions */
const DISCOUNT_RATE = 0.10;

/** Days before due date to send a reminder */
const REMINDER_DAYS_BEFORE = 7;

/** Days after due date before marking overdue */
const OVERDUE_GRACE_DAYS = 0;

// ---------------------------------------------------------------------------
// BillingLoop
// ---------------------------------------------------------------------------

export class BillingLoop {
  // -------------------------------------------------------------------------
  // Public: generate monthly invoice
  // -------------------------------------------------------------------------

  /**
   * Generate a monthly invoice for a student.
   *
   * 1. Aggregate attendance for the billing period
   * 2. Calculate session fees and discount
   * 3. Persist the invoice
   * 4. Log the event
   */
  async generateInvoice(studentId: string, month: string): Promise<Invoice> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase client unavailable');
      }

      // 1. Fetch student + org data for pricing
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, parent_id, organization_id, name')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        throw new Error(`Student not found: ${studentId}`);
      }

      // 2. Aggregate attendance
      const summary = await this.aggregateAttendance(studentId, month);

      // 3. Fetch per-session price from organization settings
      const perSessionPrice = await this.getPerSessionPrice(student.organization_id);

      // 4. Calculate amounts
      const baseAmount = summary.billable_sessions * perSessionPrice;
      const discountRate = this.calculateDiscount(summary.billable_sessions);
      const discountAmount = Math.round(baseAmount * discountRate);
      const totalAmount = baseAmount - discountAmount;

      // 5. Determine due date (last day of billing month)
      const dueDate = this.calculateDueDate(month);

      // 6. Insert invoice
      const { data: invoice, error: insertError } = await supabase
        .from('invoices')
        .insert({
          student_id: studentId,
          parent_id: student.parent_id,
          organization_id: student.organization_id,
          month,
          session_count: summary.billable_sessions,
          base_amount: baseAmount,
          discount_rate: discountRate,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          status: 'pending' as InvoiceStatus,
          due_date: dueDate,
          paid_at: null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError || !invoice) {
        throw new Error(`Failed to create invoice: ${insertError?.message}`);
      }

      // 7. Log event
      await this.logEvent({
        event_type: 'invoice.created',
        event_category: 'billing',
        entity_id: invoice.id,
        entity_type: 'invoice',
        state_from: null,
        state_to: 'pending',
        payload: {
          student_id: studentId,
          month,
          session_count: summary.billable_sessions,
          total_amount: totalAmount,
          discount_rate: discountRate,
          loop: 'L2_billing',
        },
        actor_type: 'system',
        source: 'autus_loop',
        occurred_at: new Date().toISOString(),
      });

      return invoice as Invoice;
    } catch (error) {
      console.error('[BillingLoop] generateInvoice failed:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Public: send invoice notification
  // -------------------------------------------------------------------------

  /**
   * Send an invoice notification to the parent (D-7 reminder or D-day charge).
   * Queues an event that the notification service picks up.
   */
  async sendInvoiceNotification(invoiceId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Fetch invoice with student name
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('id, student_id, parent_id, total_amount, due_date, month, status')
        .eq('id', invoiceId)
        .single();

      if (error || !invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      const { data: student } = await supabase
        .from('students')
        .select('name')
        .eq('id', invoice.student_id)
        .single();

      const studentName = student?.name ?? '학생';

      // Determine if this is a D-7 reminder or D-day notification
      const dueDate = new Date(invoice.due_date);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isReminder = daysUntilDue > 0;

      const notificationPayload: Record<string, unknown> = {
        type: isReminder ? 'invoice_reminder' : 'invoice_due',
        invoice_id: invoiceId,
        student_name: studentName,
        total_amount: invoice.total_amount,
        due_date: invoice.due_date,
        month: invoice.month,
        channel: 'kakao_alimtalk',
        message: isReminder
          ? `[수납 안내] ${studentName} 학생의 ${invoice.month} 수업료 ${invoice.total_amount.toLocaleString()}원이 ${daysUntilDue}일 후 결제 예정입니다.`
          : `[수납 안내] ${studentName} 학생의 ${invoice.month} 수업료 ${invoice.total_amount.toLocaleString()}원이 오늘 결제됩니다.`,
      };

      // Insert notification event
      await supabase.from('events').insert({
        event_type: 'notification.queued',
        event_category: 'billing',
        entity_id: invoice.parent_id,
        entity_type: 'parent',
        state_from: null,
        state_to: 'pending',
        payload: notificationPayload,
        actor_type: 'system',
        source: 'autus_loop',
        occurred_at: new Date().toISOString(),
      });

      // Update invoice status to 'sent' if still pending
      if (invoice.status === 'pending') {
        await supabase
          .from('invoices')
          .update({ status: 'sent' })
          .eq('id', invoiceId);

        await this.logEvent({
          event_type: 'invoice.sent',
          event_category: 'billing',
          entity_id: invoiceId,
          entity_type: 'invoice',
          state_from: 'pending',
          state_to: 'sent',
          payload: { parent_id: invoice.parent_id, channel: 'kakao_alimtalk', loop: 'L2_billing' },
          actor_type: 'system',
          source: 'autus_loop',
          occurred_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[BillingLoop] sendInvoiceNotification failed:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Public: process payment webhook (from Toss Payments)
  // -------------------------------------------------------------------------

  /**
   * Process a payment callback.
   *
   * - paid   -> mark invoice as paid, log renewal.succeeded (A-Tier)
   * - failed -> mark invoice as failed, log renewal.failed (S-Tier),
   *             trigger retention_process
   */
  async processPayment(paymentData: PaymentData): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { invoiceId, amount, status, transactionId, paymentMethod } = paymentData;

      // Fetch current invoice
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('id, student_id, parent_id, total_amount, status')
        .eq('id', invoiceId)
        .single();

      if (error || !invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      const previousStatus = invoice.status;

      if (status === 'paid') {
        // Successful payment
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);

        // A-Tier: renewal.succeeded
        await this.logEvent({
          event_type: 'renewal.succeeded',
          event_category: 'billing',
          entity_id: invoice.student_id,
          entity_type: 'student',
          state_from: previousStatus,
          state_to: 'paid',
          payload: {
            invoice_id: invoiceId,
            amount,
            transaction_id: transactionId,
            payment_method: paymentMethod,
            tier: 'A',
            loop: 'L2_billing',
          },
          actor_type: 'system',
          source: 'autus_loop',
          occurred_at: new Date().toISOString(),
        });
      } else {
        // Payment failed
        await supabase
          .from('invoices')
          .update({ status: 'failed' })
          .eq('id', invoiceId);

        // S-Tier: renewal.failed -> retention_process
        await this.logEvent({
          event_type: 'renewal.failed',
          event_category: 'billing',
          entity_id: invoice.student_id,
          entity_type: 'student',
          state_from: previousStatus,
          state_to: 'failed',
          payload: {
            invoice_id: invoiceId,
            amount,
            transaction_id: transactionId,
            tier: 'S',
            trigger: 'retention_process',
            loop: 'L2_billing',
          },
          actor_type: 'system',
          source: 'autus_loop',
          occurred_at: new Date().toISOString(),
        });

        // Notify parent of failed payment
        await supabase.from('events').insert({
          event_type: 'notification.queued',
          event_category: 'billing',
          entity_id: invoice.parent_id,
          entity_type: 'parent',
          state_from: null,
          state_to: 'pending',
          payload: {
            type: 'payment_failed',
            invoice_id: invoiceId,
            amount,
            channel: 'kakao_alimtalk',
            message: `[결제 실패] 수업료 ${amount.toLocaleString()}원 결제가 실패하였습니다. 결제 수단을 확인해 주세요.`,
          },
          actor_type: 'system',
          source: 'autus_loop',
          occurred_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[BillingLoop] processPayment failed:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Public: check overdue invoices
  // -------------------------------------------------------------------------

  /**
   * Find all invoices that are past their due date and not yet paid.
   * Updates their status to 'overdue' and returns the list.
   */
  async checkOverdue(): Promise<OverdueInvoice[]> {
    try {
      const supabase = getSupabase();
      if (!supabase) return [];

      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - OVERDUE_GRACE_DAYS);

      // Fetch unpaid invoices past due date
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, student_id, parent_id, total_amount, due_date, status')
        .in('status', ['pending', 'sent'])
        .lt('due_date', cutoffDate.toISOString());

      if (error || !invoices || invoices.length === 0) return [];

      const overdueList: OverdueInvoice[] = [];

      for (const inv of invoices) {
        // Update status to overdue
        await supabase
          .from('invoices')
          .update({ status: 'overdue' })
          .eq('id', inv.id);

        // Fetch student name
        const { data: student } = await supabase
          .from('students')
          .select('name')
          .eq('id', inv.student_id)
          .single();

        const daysOverdue = Math.ceil(
          (now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24),
        );

        overdueList.push({
          invoice_id: inv.id,
          student_id: inv.student_id,
          parent_id: inv.parent_id,
          student_name: student?.name ?? 'Unknown',
          total_amount: inv.total_amount,
          due_date: inv.due_date,
          days_overdue: daysOverdue,
        });

        // Log overdue event
        await this.logEvent({
          event_type: 'invoice.overdue',
          event_category: 'billing',
          entity_id: inv.id,
          entity_type: 'invoice',
          state_from: inv.status,
          state_to: 'overdue',
          payload: {
            student_id: inv.student_id,
            parent_id: inv.parent_id,
            total_amount: inv.total_amount,
            days_overdue: daysOverdue,
            loop: 'L2_billing',
          },
          actor_type: 'system',
          source: 'autus_loop',
          occurred_at: new Date().toISOString(),
        });
      }

      return overdueList;
    } catch (error) {
      console.error('[BillingLoop] checkOverdue failed:', error);
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Public: auto-charge (D-day with billing key)
  // -------------------------------------------------------------------------

  /**
   * Attempt automatic charge for invoices due today when a billing key exists.
   * Called by the daily scheduler.
   */
  async autoChargeDueInvoices(): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const today = new Date().toISOString().split('T')[0];

      const { data: dueInvoices, error } = await supabase
        .from('invoices')
        .select('id, parent_id, total_amount')
        .in('status', ['pending', 'sent'])
        .eq('due_date', today);

      if (error || !dueInvoices) return;

      for (const inv of dueInvoices) {
        // Check if parent has a billing key
        const { data: billingKey } = await supabase
          .from('billing_keys')
          .select('id, key')
          .eq('parent_id', inv.parent_id)
          .eq('is_active', true)
          .single();

        if (billingKey) {
          // Queue auto-charge event (payment gateway service picks this up)
          await supabase.from('events').insert({
            event_type: 'payment.auto_charge_requested',
            event_category: 'billing',
            entity_id: inv.id,
            entity_type: 'invoice',
            state_from: 'sent',
            state_to: 'charging',
            payload: {
              invoice_id: inv.id,
              amount: inv.total_amount,
              billing_key_id: billingKey.id,
              loop: 'L2_billing',
            },
            actor_type: 'system',
            source: 'autus_loop',
            occurred_at: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('[BillingLoop] autoChargeDueInvoices failed:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Private: aggregate attendance for billing period
  // -------------------------------------------------------------------------

  private async aggregateAttendance(studentId: string, month: string): Promise<AttendanceSummary> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        student_id: studentId,
        month,
        total_sessions: 0,
        present_count: 0,
        late_count: 0,
        absent_count: 0,
        billable_sessions: 0,
      };
    }

    // Parse month boundaries
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1).toISOString();
    const endDate = new Date(year, mon, 0, 23, 59, 59, 999).toISOString();

    const { data: records, error } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate);

    if (error || !records) {
      return {
        student_id: studentId,
        month,
        total_sessions: 0,
        present_count: 0,
        late_count: 0,
        absent_count: 0,
        billable_sessions: 0,
      };
    }

    const presentCount = records.filter((r: { status: string }) => r.status === 'present').length;
    const lateCount = records.filter((r: { status: string }) => r.status === 'late').length;
    const absentCount = records.filter((r: { status: string }) => r.status === 'absent').length;

    return {
      student_id: studentId,
      month,
      total_sessions: records.length,
      present_count: presentCount,
      late_count: lateCount,
      absent_count: absentCount,
      billable_sessions: presentCount + lateCount, // absent sessions are not billed
    };
  }

  // -------------------------------------------------------------------------
  // Private: calculate discount
  // -------------------------------------------------------------------------

  /**
   * 8+ sessions/month = 10% discount.
   */
  private calculateDiscount(sessionCount: number): number {
    return sessionCount >= DISCOUNT_SESSION_THRESHOLD ? DISCOUNT_RATE : 0;
  }

  // -------------------------------------------------------------------------
  // Private: get per-session price from org settings
  // -------------------------------------------------------------------------

  private async getPerSessionPrice(organizationId: string): Promise<number> {
    try {
      const supabase = getSupabase();
      if (!supabase) return 0;

      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (error || !data?.settings) return 50000; // Default: 50,000 KRW

      const settings = data.settings as Record<string, unknown>;
      return (settings.per_session_price as number) ?? 50000;
    } catch {
      return 50000;
    }
  }

  // -------------------------------------------------------------------------
  // Private: calculate due date
  // -------------------------------------------------------------------------

  /**
   * Due date = last day of the billing month.
   */
  private calculateDueDate(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0); // day 0 of next month = last day of this month
    return lastDay.toISOString().split('T')[0];
  }

  // -------------------------------------------------------------------------
  // Private: log event to ledger (append-only)
  // -------------------------------------------------------------------------

  private async logEvent(entry: EventLedgerEntry): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await supabase.from('events').insert(entry);

      if (error) {
        console.error('[BillingLoop] logEvent insert failed:', error.message);
      }
    } catch (error) {
      console.error('[BillingLoop] logEvent failed:', error);
    }
  }
}
