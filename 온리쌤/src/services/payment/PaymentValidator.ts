/**
 * PaymentValidator - Validation functions for payment processing
 */

import { supabase } from '../../lib/supabase';
import {
  PaymentRequest,
  PaymentError,
  PaymentStatus,
  FLYWHEEL_REWARDS,
  FlywheelReward,
} from './types';

export class PaymentValidator {
  async validateStudent(studentId: string): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('atb_students')
      .select('id, name, parent_id, status')
      .eq('id', studentId)
      .eq('status', 'active')
      .single();
    return data || null;
  }

  async checkDuplicatePayment(request: PaymentRequest): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('atb_payments')
      .select('id')
      .eq('student_id', request.studentId)
      .eq('amount', request.amount)
      .eq('type', request.type)
      .gte('created_at', fiveMinutesAgo)
      .in('status', [PaymentStatus.COMPLETED, PaymentStatus.PROCESSING]);

    return (data?.length || 0) > 0;
  }

  async validatePromotionCode(code: string): Promise<number> {
    const { data } = await supabase
      .from('atb_promotions')
      .select('discount_percent, max_uses, current_uses, valid_until')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (!data) return 0;
    if (data.current_uses >= data.max_uses) return 0;
    if (new Date(data.valid_until) < new Date()) return 0;

    return data.discount_percent;
  }

  async calculateLoyaltyDiscount(studentId: string): Promise<number> {
    const { data } = await supabase
      .from('atb_students')
      .select('created_at')
      .eq('id', studentId)
      .single();

    if (!data) return 0;

    const monthsEnrolled = Math.floor(
      (Date.now() - new Date(data.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );

    const tiers = FLYWHEEL_REWARDS.loyaltyTier;
    if (monthsEnrolled >= tiers.platinum.threshold) return tiers.platinum.discount;
    if (monthsEnrolled >= tiers.gold.threshold) return tiers.gold.discount;
    if (monthsEnrolled >= tiers.silver.threshold) return tiers.silver.discount;
    if (monthsEnrolled >= tiers.bronze.threshold) return tiers.bronze.discount;

    return 0;
  }

  async calculateFlywheelBonus(request: PaymentRequest): Promise<FlywheelReward> {
    if (request.type === 'new_enrollment') {
      return FLYWHEEL_REWARDS.firstPayment;
    }

    if (request.autoRenewal) {
      return FLYWHEEL_REWARDS.autoRenewal;
    }

    if (request.type === 'renewal') {
      return FLYWHEEL_REWARDS.renewal;
    }

    return {};
  }

  async checkRefundEligibility(payment: Record<string, unknown>): Promise<{
    eligible: boolean;
    error?: PaymentError;
    message?: string;
  }> {
    const daysSincePayment = Math.floor(
      (Date.now() - new Date(payment.created_at as string).getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysSincePayment > 14) {
      return {
        eligible: false,
        error: PaymentError.REFUND_PERIOD_EXPIRED,
        message: '환불 가능 기간(14일)이 지났습니다.',
      };
    }

    return { eligible: true };
  }

  calculateRefundAmount(payment: Record<string, unknown>, unusedSessions: number): number {
    const amount = (payment.amount as number) || 0;
    const sessions = (payment.sessions as number) || 1;
    const perSessionPrice = amount / sessions;
    return Math.round(unusedSessions * perSessionPrice * 0.9); // 10% 위약금
  }
}

export const paymentValidator = new PaymentValidator();
