/**
 * PaymentHelpers - Utility functions, formatters, and helper methods
 */

import { supabase } from '../../lib/supabase';
import {
  PaymentReceipt,
  PaymentType,
  PaymentMethod,
  RefundRequest,
  RefundResult,
  PaymentError,
  PRICING_TABLE,
  FLYWHEEL_REWARDS,
} from './types';

export class PaymentHelpers {
  async addSessions(
    studentId: string,
    sessions: number,
    classId?: string
  ): Promise<{ remainingSessions: number }> {
    const { data: current } = await supabase
      .from('atb_enrollments')
      .select('remaining_sessions')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .single();

    const currentSessions = current?.remaining_sessions || 0;
    const newTotal = currentSessions + sessions;

    await supabase
      .from('atb_enrollments')
      .upsert({
        student_id: studentId,
        class_id: classId,
        remaining_sessions: newTotal,
        updated_at: new Date().toISOString(),
      });

    return { remainingSessions: newTotal };
  }

  async updateEnrollmentStatus(studentId: string, classId?: string): Promise<void> {
    await supabase
      .from('atb_enrollments')
      .update({
        status: 'active',
        last_payment_date: new Date().toISOString(),
      })
      .eq('student_id', studentId)
      .eq('class_id', classId);
  }

  async setValidityPeriod(studentId: string, programId?: string): Promise<string> {
    const program = PRICING_TABLE[programId || 'regular_8'];
    const validDays = program?.validDays || 35;
    const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('atb_enrollments')
      .update({ valid_until: validUntil })
      .eq('student_id', studentId);

    return validUntil;
  }

  async setupAutoRenewal(
    studentId: string,
    method: PaymentMethod,
    programId?: string
  ): Promise<void> {
    await supabase
      .from('atb_auto_renewals')
      .upsert({
        student_id: studentId,
        payment_method: method,
        program_id: programId,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
  }

  async generateReceipt(
    paymentId: string,
    student: Record<string, unknown>,
    sessions: number,
    remainingSessions: number,
    validUntil: string
  ): Promise<PaymentReceipt> {
    const { data: payment } = await supabase
      .from('atb_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    const receipt: PaymentReceipt = {
      receiptId: `RCP_${Date.now()}`,
      studentName: student.name as string,
      paymentType: payment.type,
      amount: payment.amount,
      sessions,
      remainingSessions,
      paymentDate: new Date().toISOString(),
      validUntil,
    };

    await supabase
      .from('atb_receipts')
      .insert({
        payment_id: paymentId,
        receipt_data: receipt,
      });

    return receipt;
  }

  async sendPaymentNotification(
    parentId: string,
    receipt: PaymentReceipt,
    bonusMessage?: string
  ): Promise<void> {
    const message = `
[온리쌤] 결제 완료

학생: ${receipt.studentName}
결제금액: ${receipt.amount.toLocaleString()}원
구매횟수: ${receipt.sessions}회
잔여횟수: ${receipt.remainingSessions}회
유효기간: ${new Date(receipt.validUntil).toLocaleDateString()}

${bonusMessage || ''}

감사합니다! 🏀
    `.trim();

    await supabase
      .from('atb_notifications')
      .insert({
        user_id: parentId,
        type: 'payment',
        title: '결제 완료',
        message,
        channel: 'kakao',
      });
  }

  async notifyCoachOfPayment(classId: string, studentName: string): Promise<void> {
    const { data: classInfo } = await supabase
      .from('atb_classes')
      .select('coach_id')
      .eq('id', classId)
      .single();

    if (classInfo?.coach_id) {
      await supabase
        .from('atb_notifications')
        .insert({
          user_id: classInfo.coach_id,
          type: 'payment',
          title: '결제 알림',
          message: `${studentName} 학생이 결제를 완료했습니다.`,
          channel: 'push',
        });
    }
  }

  async updateAdminDashboard(type: PaymentType, amount: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await supabase.rpc('increment_daily_stats', {
      stat_date: today,
      payment_type: type,
      payment_amount: amount,
    });
  }

  async recordFlywheelMetric(
    studentId: string,
    type: PaymentType,
    amount: number
  ): Promise<void> {
    await supabase
      .from('atb_flywheel_metrics')
      .insert({
        student_id: studentId,
        event_type: type,
        amount,
        timestamp: new Date().toISOString(),
      });
  }

  async processReferralReward(studentId: string): Promise<void> {
    const { data: referral } = await supabase
      .from('atb_referrals')
      .select('referrer_id')
      .eq('referred_id', studentId)
      .single();

    if (referral?.referrer_id) {
      const bonus = FLYWHEEL_REWARDS.referral.bonusSessions;
      await this.addBonusSessions(referral.referrer_id, bonus, '추천인 보상');
      await this.addBonusSessions(studentId, bonus, '추천 가입 보상');
    }
  }

  async addBonusSessions(
    studentId: string,
    sessions: number,
    reason: string
  ): Promise<void> {
    await supabase.rpc('add_bonus_sessions', {
      p_student_id: studentId,
      p_sessions: sessions,
      p_reason: reason,
    });
  }

  async createAuditLog(data: Record<string, unknown>): Promise<void> {
    await supabase
      .from('atb_audit_logs')
      .insert({
        action: data.action,
        entity_type: 'payment',
        entity_id: data.paymentId,
        details: data,
        created_at: new Date().toISOString(),
      });
  }

  async logPaymentEvent(event: string, data: unknown): Promise<void> {
    if (__DEV__) console.log(`[PaymentService] ${event}:`, JSON.stringify(data));

    await supabase
      .from('atb_payment_events')
      .insert({
        event_type: event,
        event_data: data as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
  }

  // Refund helpers
  async getPaymentById(paymentId: string): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('atb_payments')
      .select('*')
      .eq('id', paymentId)
      .single();
    return data || null;
  }

  async getUsedSessions(studentId: string, paymentId: string): Promise<number> {
    const paymentData = await this.getPaymentById(paymentId);
    const { count } = await supabase
      .from('atb_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', (paymentData?.created_at as string) || new Date(0).toISOString());

    return count || 0;
  }

  async requestPgRefund(
    transactionId: string,
    amount: number
  ): Promise<{ success: boolean }> {
    // PG사 환불 요청 (시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true };
  }

  async deductSessions(studentId: string, sessions: number): Promise<void> {
    await supabase.rpc('deduct_sessions', {
      p_student_id: studentId,
      p_sessions: sessions,
    });
  }

  async createRefundRecord(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data: refund, error } = await supabase
      .from('atb_refunds')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return refund;
  }

  async sendRefundNotification(
    parentId: string,
    amount: number,
    refundId: string
  ): Promise<void> {
    await supabase
      .from('atb_notifications')
      .insert({
        user_id: parentId,
        type: 'refund',
        title: '환불 처리 완료',
        message: `환불 금액 ${amount.toLocaleString()}원이 처리되었습니다. (환불번호: ${refundId})`,
        channel: 'kakao',
      });
  }

  /**
   * Process refund with full logic
   */
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    try {
      const payment = await this.getPaymentById(request.paymentId);
      if (!payment) {
        return { success: false, error: PaymentError.INVALID_AMOUNT, message: '결제 정보를 찾을 수 없습니다.' };
      }

      // Check refund eligibility (would need validator but avoiding circular dependency)
      const daysSincePayment = Math.floor(
        (Date.now() - new Date(payment.created_at as string).getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysSincePayment > 14) {
        return {
          success: false,
          error: PaymentError.REFUND_PERIOD_EXPIRED,
          message: '환불 가능 기간(14일)이 지났습니다.'
        };
      }

      const usedSessions = await this.getUsedSessions(payment.student_id as string, payment.id as string);
      const unusedSessions = (payment.sessions as number) - usedSessions;

      // Calculate refund amount
      const amount = (payment.amount as number) || 0;
      const sessions = (payment.sessions as number) || 1;
      const perSessionPrice = amount / sessions;
      const refundAmount = request.amount || Math.round(unusedSessions * perSessionPrice * 0.9);

      const pgRefundResult = await this.requestPgRefund(payment.transaction_id as string, refundAmount);
      if (!pgRefundResult.success) {
        return { success: false, error: PaymentError.PG_CONNECTION_ERROR, message: 'PG사 환불 처리 실패' };
      }

      await this.deductSessions(payment.student_id as string, unusedSessions);

      const refundRecord = await this.createRefundRecord({
        paymentId: request.paymentId,
        amount: refundAmount,
        reason: request.reason,
        sessionsDeducted: usedSessions,
        processedBy: request.requestedBy,
      }) as Record<string, unknown>;

      await this.sendRefundNotification(payment.parent_id as string, refundAmount, refundRecord.id);

      await this.createAuditLog({
        action: 'REFUND_PROCESSED',
        paymentId: payment.id,
        refundId: refundRecord.id,
        amount: refundAmount,
        reason: request.reason,
      });

      return {
        success: true,
        refundId: refundRecord.id,
        refundAmount,
        sessionsDeducted: usedSessions,
      };

    } catch (error: unknown) {
      return { success: false, error: PaymentError.SYSTEM_ERROR, message: '환불 처리 중 오류' };
    }
  }
}

export const paymentHelpers = new PaymentHelpers();
