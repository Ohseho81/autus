/**
 * PaymentProcessor - Core payment processing logic (25-step process)
 */

import { supabase } from '../../lib/supabase';
import {
  PaymentRequest,
  PaymentResult,
  PaymentError,
  PaymentStatus,
  PaymentMethod,
  StepMetric,
  PRICING_TABLE,
} from './types';
import { paymentValidator } from './PaymentValidator';
import { paymentHelpers } from './PaymentHelpers';

export class PaymentProcessor {
  private metrics: StepMetric[] = [];
  private startTime: number = 0;

  /**
   * 결제 처리 - 25단계 프로세스
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    this.startTime = Date.now();
    this.metrics = [];

    try {
      // ======== 1단계: 요청 수신 및 로깅 ========
      await this.recordStep(1, '요청 수신', async () => {
        await paymentHelpers.logPaymentEvent('PAYMENT_INITIATED', request);
      });

      // ======== 2단계: 학생 정보 검증 ========
      const student = await this.recordStep(2, '학생 검증', async () => {
        return await paymentValidator.validateStudent(request.studentId);
      });
      if (!student) {
        return this.createError(PaymentError.INVALID_STUDENT, '학생 정보를 찾을 수 없습니다.');
      }

      // ======== 3단계: 중복 결제 검사 ========
      const isDuplicate = await this.recordStep(3, '중복 결제 검사', async () => {
        return await paymentValidator.checkDuplicatePayment(request);
      });
      if (isDuplicate) {
        return this.createError(PaymentError.DUPLICATE_PAYMENT, '이미 처리된 결제입니다.');
      }

      // ======== 4단계: 프로모션 코드 검증 ========
      let discount = 0;
      if (request.promotionCode) {
        discount = await this.recordStep(4, '프로모션 검증', async () => {
          return await paymentValidator.validatePromotionCode(request.promotionCode!);
        });
      } else {
        this.metrics.push({ step: 4, name: '프로모션 검증', durationMs: 0, success: true });
      }

      // ======== 5단계: 로열티 등급 확인 ========
      const loyaltyDiscount = await this.recordStep(5, '로열티 등급 확인', async () => {
        return await paymentValidator.calculateLoyaltyDiscount(request.studentId);
      });

      // ======== 6단계: 플라이휠 보너스 계산 ========
      const flywheel = await this.recordStep(6, '플라이휠 보너스', async () => {
        return await paymentValidator.calculateFlywheelBonus(request);
      });

      // ======== 7단계: 최종 금액 계산 ========
      const finalAmount = await this.recordStep(7, '최종 금액 계산', async () => {
        const totalDiscount = discount + loyaltyDiscount + (flywheel.discountPercent || 0);
        return Math.round(request.amount * (1 - totalDiscount / 100));
      });

      // ======== 8단계: 금액 유효성 검증 ========
      const isValidAmount = await this.recordStep(8, '금액 유효성', async () => {
        return finalAmount > 0 && finalAmount <= 10000000;
      });
      if (!isValidAmount) {
        return this.createError(PaymentError.INVALID_AMOUNT, '유효하지 않은 결제 금액입니다.');
      }

      // ======== 9단계: 결제 레코드 생성 ========
      const paymentRecord = (await this.recordStep(9, '결제 레코드 생성', async () => {
        return await this.createPaymentRecord(request, finalAmount, discount + loyaltyDiscount);
      })) as Record<string, unknown>;

      // ======== 10-12단계: PG 처리 ========
      const pgStartTime = Date.now();
      await this.recordStep(10, 'PG 연동 시작', async () => {
        await paymentHelpers.logPaymentEvent('PG_PROCESSING_START', { paymentId: paymentRecord.id });
      });

      let pgResult: unknown;
      try {
        pgResult = await this.recordStep(11, '결제 수단 처리', async () => {
          return await this.processPaymentMethod(request.method, finalAmount, paymentRecord.id);
        });
      } catch (pgError: unknown) {
        await this.handlePaymentFailure(paymentRecord.id, pgError);
        return this.createError(PaymentError.CARD_DECLINED, '결제가 거절되었습니다.');
      }

      const isValidPgResponse = await this.recordStep(12, 'PG 응답 검증', async () => {
        const result = pgResult as Record<string, unknown>;
        return pgResult && result.success && result.transactionId;
      });
      if (!isValidPgResponse) {
        await this.handlePaymentFailure(paymentRecord.id, 'Invalid PG response');
        return this.createError(PaymentError.PG_CONNECTION_ERROR, 'PG사 응답 오류');
      }

      const pgProcessingTime = Date.now() - pgStartTime;

      // ======== 13-17단계: 세션 및 등록 처리 ========
      await this.recordStep(13, '결제 상태 업데이트', async () => {
        await this.updatePaymentStatus(paymentRecord.id, PaymentStatus.COMPLETED, (pgResult as Record<string, unknown>).transactionId);
      });

      const totalSessions = (request.sessions || 0) + (flywheel.bonusSessions || 0);
      const sessionResult = (await this.recordStep(14, '세션 추가', async () => {
        return await paymentHelpers.addSessions(request.studentId, totalSessions, request.classId);
      })) as Record<string, unknown>;

      await this.recordStep(15, '등록 상태 업데이트', async () => {
        await paymentHelpers.updateEnrollmentStatus(request.studentId, request.classId);
      });

      const validUntil = (await this.recordStep(16, '유효기간 설정', async () => {
        return await paymentHelpers.setValidityPeriod(request.studentId, request.programId);
      })) as string;

      if (request.autoRenewal) {
        await this.recordStep(17, '자동결제 설정', async () => {
          await paymentHelpers.setupAutoRenewal(request.studentId, request.method, request.programId);
        });
      } else {
        this.metrics.push({ step: 17, name: '자동결제 설정', durationMs: 0, success: true });
      }

      // ======== 18-21단계: 알림 및 리포트 ========
      const receipt = (await this.recordStep(18, '영수증 생성', async () => {
        return await paymentHelpers.generateReceipt(
          paymentRecord.id,
          student,
          totalSessions,
          sessionResult.remainingSessions || 0,
          validUntil
        );
      })) as Record<string, unknown>;

      const notificationStartTime = Date.now();
      await this.recordStep(19, '학부모 알림', async () => {
        await paymentHelpers.sendPaymentNotification(request.parentId, receipt, flywheel.message);
      });

      await this.recordStep(20, '코치 알림', async () => {
        if (request.classId) {
          await paymentHelpers.notifyCoachOfPayment(request.classId, student.name as string);
        }
      });

      await this.recordStep(21, '대시보드 업데이트', async () => {
        await paymentHelpers.updateAdminDashboard(request.type, finalAmount);
      });

      const notificationTime = Date.now() - notificationStartTime;

      // ======== 22-24단계: 메트릭 및 감사 로그 ========
      await this.recordStep(22, '플라이휠 메트릭', async () => {
        await paymentHelpers.recordFlywheelMetric(request.studentId, request.type, finalAmount);
      });

      if (request.type === 'new_enrollment') {
        await this.recordStep(23, '추천인 보상', async () => {
          await paymentHelpers.processReferralReward(request.studentId);
        });
      } else {
        this.metrics.push({ step: 23, name: '추천인 보상', durationMs: 0, success: true });
      }

      await this.recordStep(24, '감사 로그', async () => {
        await paymentHelpers.createAuditLog({
          action: 'PAYMENT_COMPLETED',
          paymentId: paymentRecord.id,
          studentId: request.studentId,
          amount: finalAmount,
          sessions: totalSessions,
          method: request.method,
        });
      });

      // ======== 25단계: 결과 반환 ========
      const totalDuration = Date.now() - this.startTime;

      return {
        success: true,
        paymentId: paymentRecord.id,
        transactionId: (pgResult as Record<string, unknown>).transactionId,
        receipt,
        metrics: {
          totalDurationMs: totalDuration,
          steps: this.metrics,
          validationTimeMs: this.metrics.slice(0, 8).reduce((sum, m) => sum + m.durationMs, 0),
          pgProcessingTimeMs: pgProcessingTime,
          sessionUpdateTimeMs: this.metrics[13]?.durationMs || 0,
          notificationTimeMs: notificationTime,
        },
      };

    } catch (error: unknown) {
      await paymentHelpers.logPaymentEvent('PAYMENT_ERROR', { error: String(error) });
      return this.createError(PaymentError.SYSTEM_ERROR, '결제 처리 중 오류가 발생했습니다.');
    }
  }

  private async recordStep<T>(
    stepNumber: number,
    stepName: string,
    action: () => Promise<T>
  ): Promise<T> {
    const stepStart = Date.now();
    try {
      const result = await action();
      this.metrics.push({
        step: stepNumber,
        name: stepName,
        durationMs: Date.now() - stepStart,
        success: true,
      });
      return result;
    } catch (error: unknown) {
      this.metrics.push({
        step: stepNumber,
        name: stepName,
        durationMs: Date.now() - stepStart,
        success: false,
      });
      throw error;
    }
  }

  private createError(error: PaymentError, message: string): PaymentResult {
    return {
      success: false,
      error,
      message,
      metrics: {
        totalDurationMs: Date.now() - this.startTime,
        steps: this.metrics,
        validationTimeMs: 0,
        pgProcessingTimeMs: 0,
        sessionUpdateTimeMs: 0,
        notificationTimeMs: 0,
      },
    };
  }

  private async createPaymentRecord(
    request: PaymentRequest,
    finalAmount: number,
    discount: number
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('atb_payments')
      .insert({
        student_id: request.studentId,
        parent_id: request.parentId,
        type: request.type,
        method: request.method,
        amount: finalAmount,
        original_amount: request.amount,
        discount_amount: request.amount - finalAmount,
        discount_percent: discount,
        sessions: request.sessions,
        program_id: request.programId,
        class_id: request.classId,
        status: PaymentStatus.PROCESSING,
        promotion_code: request.promotionCode,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async processPaymentMethod(
    method: PaymentMethod,
    amount: number,
    paymentId: string
  ): Promise<{ success: boolean; transactionId: string }> {
    // 실제 PG사 연동 로직 (여기서는 시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  private async handlePaymentFailure(paymentId: string, error: unknown): Promise<void> {
    await supabase
      .from('atb_payments')
      .update({
        status: PaymentStatus.FAILED,
        error_message: String(error),
        failed_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    await paymentHelpers.logPaymentEvent('PAYMENT_FAILED', { paymentId, error: String(error) });
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    transactionId?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    if (transactionId) {
      updateData.transaction_id = transactionId;
      updateData.completed_at = new Date().toISOString();
    }

    await supabase
      .from('atb_payments')
      .update(updateData)
      .eq('id', paymentId);
  }
}

export const paymentProcessor = new PaymentProcessor();
