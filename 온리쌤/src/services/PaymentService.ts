/**
 * PaymentService - 베이조스 스타일 결제 플라이휠
 *
 * 핵심 원칙:
 * 1. 플라이휠 효과: 결제 → 출석 → 만족 → 재등록 → 결제 (선순환)
 * 2. 25단계 결제 프로세스 (모든 단계 측정)
 * 3. 자동 갱신으로 이탈 방지
 * 4. 던닝(Dunning) 프로세스로 미납 최소화
 * 5. 실시간 재고(잔여 횟수) 관리
 */

import { supabase } from '../lib/supabase';

// ============================================================
// 1. 타입 정의
// ============================================================

export enum PaymentType {
  NEW_ENROLLMENT = 'new_enrollment',      // 신규 등록
  RENEWAL = 'renewal',                     // 재등록/갱신
  ADDITIONAL = 'additional',               // 추가 구매
  MAKEUP = 'makeup',                       // 보강 구매
  PRIVATE_LESSON = 'private_lesson',       // 개인레슨
  OPEN_CLASS = 'open_class',               // 오픈반
  RENTAL = 'rental',                       // 대관
  REFUND = 'refund',                       // 환불
}

export enum PaymentMethod {
  CARD = 'card',                           // 카드
  TRANSFER = 'transfer',                   // 계좌이체
  CASH = 'cash',                           // 현금
  AUTO_BILLING = 'auto_billing',           // 자동결제
  NAVER_PAY = 'naver_pay',                 // 네이버페이
  KAKAO_PAY = 'kakao_pay',                 // 카카오페이
}

export enum PaymentStatus {
  PENDING = 'pending',                     // 결제 대기
  PROCESSING = 'processing',               // 처리 중
  COMPLETED = 'completed',                 // 완료
  FAILED = 'failed',                       // 실패
  CANCELLED = 'cancelled',                 // 취소
  REFUNDED = 'refunded',                   // 환불완료
  PARTIALLY_REFUNDED = 'partial_refund',   // 부분환불
}

export enum PaymentError {
  INVALID_AMOUNT = 'E101',                 // 금액 오류
  INVALID_STUDENT = 'E102',                // 학생 정보 오류
  CARD_DECLINED = 'E103',                  // 카드 거절
  INSUFFICIENT_BALANCE = 'E104',           // 잔액 부족
  DUPLICATE_PAYMENT = 'E105',              // 중복 결제
  SESSION_ALREADY_USED = 'E106',           // 이미 사용된 세션 환불 불가
  REFUND_PERIOD_EXPIRED = 'E107',          // 환불 기간 만료
  AUTO_BILLING_FAILED = 'E108',            // 자동결제 실패
  PG_CONNECTION_ERROR = 'E109',            // PG사 연결 오류
  SYSTEM_ERROR = 'E199',                   // 시스템 오류
}

export enum DunningLevel {
  LEVEL_1 = 1,   // D+1: 카카오톡 알림
  LEVEL_2 = 2,   // D+3: SMS + 푸시
  LEVEL_3 = 3,   // D+7: 전화 알림
  LEVEL_4 = 4,   // D+14: 출석 제한 경고
  LEVEL_5 = 5,   // D+30: 수강 중지
}

interface PaymentRequest {
  studentId: string;
  parentId: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  sessions?: number;          // 구매 횟수
  programId?: string;         // 프로그램 ID
  classId?: string;           // 수업 ID
  promotionCode?: string;     // 프로모션 코드
  autoRenewal?: boolean;      // 자동 갱신 설정
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  error?: PaymentError;
  message?: string;
  metrics?: PaymentMetrics;
  receipt?: PaymentReceipt;
}

interface PaymentMetrics {
  totalDurationMs: number;
  steps: StepMetric[];
  validationTimeMs: number;
  pgProcessingTimeMs: number;
  sessionUpdateTimeMs: number;
  notificationTimeMs: number;
}

interface StepMetric {
  step: number;
  name: string;
  durationMs: number;
  success: boolean;
}

interface PaymentReceipt {
  receiptId: string;
  studentName: string;
  paymentType: string;
  amount: number;
  sessions: number;
  remainingSessions: number;
  paymentDate: string;
  validUntil: string;
}

interface RefundRequest {
  paymentId: string;
  reason: string;
  amount?: number;            // 부분환불 금액
  requestedBy: string;        // 요청자 ID
}

interface RefundResult {
  success: boolean;
  refundId?: string;
  refundAmount?: number;
  sessionsDeducted?: number;
  error?: PaymentError;
  message?: string;
}

interface DunningAction {
  studentId: string;
  level: DunningLevel;
  dueAmount: number;
  overduedays: number;
  actions: string[];
}

// ============================================================
// 2. 플라이휠 설정
// ============================================================

// 플라이휠 단계별 보상
const FLYWHEEL_REWARDS = {
  firstPayment: {
    bonusSessions: 1,
    message: '첫 등록 감사합니다! 보너스 1회가 추가되었습니다.',
  },
  renewal: {
    discountPercent: 5,
    bonusSessions: 2,
    message: '재등록 할인 5% + 보너스 2회가 적용되었습니다.',
  },
  autoRenewal: {
    discountPercent: 10,
    bonusSessions: 3,
    message: '자동결제 할인 10% + 보너스 3회가 적용되었습니다.',
  },
  referral: {
    bonusSessions: 2,
    referrerBonus: 2,
    message: '추천인 보너스! 양측 모두 2회가 추가되었습니다.',
  },
  loyaltyTier: {
    bronze: { threshold: 6, discount: 3 },    // 6개월 이상
    silver: { threshold: 12, discount: 5 },   // 1년 이상
    gold: { threshold: 24, discount: 8 },     // 2년 이상
    platinum: { threshold: 36, discount: 10 }, // 3년 이상
  },
};

// 던닝 스케줄
const DUNNING_SCHEDULE: Record<DunningLevel, {
  daysOverdue: number;
  channels: string[];
  restrictAccess: boolean;
  autoRetry: boolean;
}> = {
  [DunningLevel.LEVEL_1]: {
    daysOverdue: 1,
    channels: ['kakao'],
    restrictAccess: false,
    autoRetry: true,
  },
  [DunningLevel.LEVEL_2]: {
    daysOverdue: 3,
    channels: ['sms', 'push'],
    restrictAccess: false,
    autoRetry: true,
  },
  [DunningLevel.LEVEL_3]: {
    daysOverdue: 7,
    channels: ['phone', 'kakao'],
    restrictAccess: false,
    autoRetry: false,
  },
  [DunningLevel.LEVEL_4]: {
    daysOverdue: 14,
    channels: ['phone', 'email', 'push'],
    restrictAccess: true,
    autoRetry: false,
  },
  [DunningLevel.LEVEL_5]: {
    daysOverdue: 30,
    channels: ['registered_mail'],
    restrictAccess: true,
    autoRetry: false,
  },
};

// 프로그램별 가격표
const PRICING_TABLE: Record<string, {
  name: string;
  sessions: number;
  basePrice: number;
  validDays: number;
}> = {
  'regular_4': { name: '정규반 주1회', sessions: 4, basePrice: 120000, validDays: 35 },
  'regular_8': { name: '정규반 주2회', sessions: 8, basePrice: 220000, validDays: 35 },
  'regular_12': { name: '정규반 주3회', sessions: 12, basePrice: 300000, validDays: 35 },
  'athlete_12': { name: '선수반 주3회', sessions: 12, basePrice: 350000, validDays: 35 },
  'athlete_20': { name: '선수반 주5회', sessions: 20, basePrice: 500000, validDays: 35 },
  'private_1': { name: '개인레슨 1회', sessions: 1, basePrice: 80000, validDays: 30 },
  'private_4': { name: '개인레슨 4회', sessions: 4, basePrice: 280000, validDays: 60 },
  'open_1': { name: '오픈반 1회', sessions: 1, basePrice: 15000, validDays: 1 },
  'open_10': { name: '오픈반 10회권', sessions: 10, basePrice: 130000, validDays: 90 },
};

// ============================================================
// 3. 결제 서비스 클래스
// ============================================================

export class PaymentService {
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
        await this.logPaymentEvent('PAYMENT_INITIATED', request);
      });

      // ======== 2단계: 학생 정보 검증 ========
      const student = await this.recordStep(2, '학생 검증', async () => {
        return await this.validateStudent(request.studentId);
      });
      if (!student) {
        return this.createError(PaymentError.INVALID_STUDENT, '학생 정보를 찾을 수 없습니다.');
      }

      // ======== 3단계: 중복 결제 검사 ========
      const isDuplicate = await this.recordStep(3, '중복 결제 검사', async () => {
        return await this.checkDuplicatePayment(request);
      });
      if (isDuplicate) {
        return this.createError(PaymentError.DUPLICATE_PAYMENT, '이미 처리된 결제입니다.');
      }

      // ======== 4단계: 프로모션 코드 검증 ========
      let discount = 0;
      if (request.promotionCode) {
        discount = await this.recordStep(4, '프로모션 검증', async () => {
          return await this.validatePromotionCode(request.promotionCode!);
        });
      } else {
        this.metrics.push({ step: 4, name: '프로모션 검증', durationMs: 0, success: true });
      }

      // ======== 5단계: 로열티 등급 확인 ========
      const loyaltyDiscount = await this.recordStep(5, '로열티 등급 확인', async () => {
        return await this.calculateLoyaltyDiscount(request.studentId);
      });

      // ======== 6단계: 플라이휠 보너스 계산 ========
      const flywheel = await this.recordStep(6, '플라이휠 보너스', async () => {
        return await this.calculateFlywheelBonus(request);
      });

      // ======== 7단계: 최종 금액 계산 ========
      const finalAmount = await this.recordStep(7, '최종 금액 계산', async () => {
        const totalDiscount = discount + loyaltyDiscount + (flywheel.discountPercent || 0);
        return Math.round(request.amount * (1 - totalDiscount / 100));
      });

      // ======== 8단계: 금액 유효성 검증 ========
      const isValidAmount = await this.recordStep(8, '금액 유효성', async () => {
        return finalAmount > 0 && finalAmount <= 10000000; // 최대 1000만원
      });
      if (!isValidAmount) {
        return this.createError(PaymentError.INVALID_AMOUNT, '유효하지 않은 결제 금액입니다.');
      }

      // ======== 9단계: 결제 레코드 생성 ========
      const paymentRecord = (await this.recordStep(9, '결제 레코드 생성', async () => {
        return await this.createPaymentRecord(request, finalAmount, discount + loyaltyDiscount);
      })) as Record<string, unknown>;

      // ======== 10단계: PG사 연동 시작 ========
      const pgStartTime = Date.now();
      await this.recordStep(10, 'PG 연동 시작', async () => {
        await this.logPaymentEvent('PG_PROCESSING_START', { paymentId: paymentRecord.id as string });
      });

      // ======== 11단계: 결제 수단별 처리 ========
      let pgResult: unknown;
      try {
        pgResult = await this.recordStep(11, '결제 수단 처리', async () => {
          return await this.processPaymentMethod(request.method, finalAmount, paymentRecord.id as string);
        });
      } catch (pgError: unknown) {
        await this.handlePaymentFailure(paymentRecord.id as string, pgError);
        return this.createError(PaymentError.CARD_DECLINED, '결제가 거절되었습니다.');
      }

      // ======== 12단계: PG 응답 검증 ========
      const isValidPgResponse = await this.recordStep(12, 'PG 응답 검증', async () => {
        const result = pgResult as Record<string, unknown>;
        return pgResult && result.success && result.transactionId;
      });
      if (!isValidPgResponse) {
        await this.handlePaymentFailure(paymentRecord.id as string, 'Invalid PG response');
        return this.createError(PaymentError.PG_CONNECTION_ERROR, 'PG사 응답 오류');
      }

      const pgProcessingTime = Date.now() - pgStartTime;

      // ======== 13단계: 결제 상태 업데이트 ========
      await this.recordStep(13, '결제 상태 업데이트', async () => {
        await this.updatePaymentStatus(paymentRecord.id as string, PaymentStatus.COMPLETED, (pgResult as Record<string, unknown>).transactionId as string);
      });

      // ======== 14단계: 세션(횟수) 추가 ========
      const totalSessions = (request.sessions || 0) + (flywheel.bonusSessions || 0);
      const sessionResult = (await this.recordStep(14, '세션 추가', async () => {
        return await this.addSessions(request.studentId, totalSessions, request.classId);
      })) as Record<string, unknown>;

      // ======== 15단계: 등록 상태 업데이트 ========
      await this.recordStep(15, '등록 상태 업데이트', async () => {
        await this.updateEnrollmentStatus(request.studentId, request.classId);
      });

      // ======== 16단계: 유효기간 설정 ========
      const validUntil = (await this.recordStep(16, '유효기간 설정', async () => {
        return await this.setValidityPeriod(request.studentId, request.programId);
      })) as string | undefined;

      // ======== 17단계: 자동결제 설정 ========
      if (request.autoRenewal) {
        await this.recordStep(17, '자동결제 설정', async () => {
          await this.setupAutoRenewal(request.studentId, request.method, request.programId);
        });
      } else {
        this.metrics.push({ step: 17, name: '자동결제 설정', durationMs: 0, success: true });
      }

      // ======== 18단계: 영수증 생성 ========
      const receipt = (await this.recordStep(18, '영수증 생성', async () => {
        return await this.generateReceipt(paymentRecord.id as string, student, totalSessions, (sessionResult.remainingSessions as number) || 0, validUntil || new Date().toISOString());
      })) as Record<string, unknown>;

      // ======== 19단계: 학부모 알림 전송 ========
      const notificationStartTime = Date.now();
      await this.recordStep(19, '학부모 알림', async () => {
        await this.sendPaymentNotification(request.parentId, receipt, flywheel.message);
      });

      // ======== 20단계: 코치 알림 전송 ========
      await this.recordStep(20, '코치 알림', async () => {
        if (request.classId) {
          await this.notifyCoachOfPayment(request.classId, student.name as string);
        }
      });

      // ======== 21단계: 관리자 대시보드 업데이트 ========
      await this.recordStep(21, '대시보드 업데이트', async () => {
        await this.updateAdminDashboard(request.type, finalAmount);
      });

      const notificationTime = Date.now() - notificationStartTime;

      // ======== 22단계: 플라이휠 메트릭 기록 ========
      await this.recordStep(22, '플라이휠 메트릭', async () => {
        await this.recordFlywheelMetric(request.studentId, request.type, finalAmount);
      });

      // ======== 23단계: 추천인 보상 처리 ========
      if (request.type === PaymentType.NEW_ENROLLMENT) {
        await this.recordStep(23, '추천인 보상', async () => {
          await this.processReferralReward(request.studentId);
        });
      } else {
        this.metrics.push({ step: 23, name: '추천인 보상', durationMs: 0, success: true });
      }

      // ======== 24단계: 감사 로그 기록 ========
      await this.recordStep(24, '감사 로그', async () => {
        await this.createAuditLog({
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
        paymentId: paymentRecord.id as string,
        transactionId: (pgResult as Record<string, unknown>).transactionId as string,
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
      await this.logPaymentEvent('PAYMENT_ERROR', { error: String(error) });
      return this.createError(PaymentError.SYSTEM_ERROR, '결제 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * 환불 처리
   */
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    try {
      // 1. 결제 정보 조회
      const payment = await this.getPaymentById(request.paymentId);
      if (!payment) {
        return { success: false, error: PaymentError.INVALID_AMOUNT, message: '결제 정보를 찾을 수 없습니다.' };
      }

      // 2. 환불 가능 여부 확인
      const refundCheck = await this.checkRefundEligibility(payment);
      if (!refundCheck.eligible) {
        return { success: false, error: refundCheck.error, message: refundCheck.message };
      }

      // 3. 사용된 세션 계산
      const usedSessions = await this.getUsedSessions(payment.student_id as string, payment.id as string);
      const unusedSessions = (payment.sessions as number) - usedSessions;

      // 4. 환불 금액 계산 (학원법 기준)
      const refundAmount = request.amount || this.calculateRefundAmount(payment, unusedSessions);

      // 5. PG사 환불 요청
      const pgRefundResult = await this.requestPgRefund(payment.transaction_id as string, refundAmount);
      if (!pgRefundResult.success) {
        return { success: false, error: PaymentError.PG_CONNECTION_ERROR, message: 'PG사 환불 처리 실패' };
      }

      // 6. 세션 차감
      await this.deductSessions(payment.student_id as string, unusedSessions);

      // 7. 결제 상태 업데이트
      const newStatus = refundAmount < (payment.amount as number)
        ? PaymentStatus.PARTIALLY_REFUNDED
        : PaymentStatus.REFUNDED;
      await this.updatePaymentStatus(payment.id as string, newStatus);

      // 8. 환불 레코드 생성
      const refundRecord = (await this.createRefundRecord({
        paymentId: request.paymentId,
        amount: refundAmount,
        reason: request.reason,
        sessionsDeducted: usedSessions,
        processedBy: request.requestedBy,
      })) as Record<string, unknown>;

      // 9. 알림 전송
      await this.sendRefundNotification(payment.parent_id as string, refundAmount, refundRecord.id as string);

      // 10. 감사 로그
      await this.createAuditLog({
        action: 'REFUND_PROCESSED',
        paymentId: payment.id as string,
        refundId: refundRecord.id as string,
        amount: refundAmount,
        reason: request.reason,
      });

      return {
        success: true,
        refundId: refundRecord.id as string,
        refundAmount,
        sessionsDeducted: usedSessions,
      };

    } catch (error: unknown) {
      return { success: false, error: PaymentError.SYSTEM_ERROR, message: '환불 처리 중 오류' };
    }
  }

  /**
   * 던닝 프로세스 - 미납 관리
   */
  async runDunningProcess(): Promise<DunningAction[]> {
    const actions: DunningAction[] = [];

    try {
      // 미납자 조회
      const overdueStudents = await this.getOverdueStudents();

      for (const student of overdueStudents) {
        const daysOverdue = this.calculateDaysOverdue(student.due_date);
        const level = this.determineDunningLevel(daysOverdue);

        if (level) {
          const dunningConfig = DUNNING_SCHEDULE[level];
          const actionsTaken: string[] = [];

          // 알림 채널별 처리
          for (const channel of dunningConfig.channels) {
            await this.sendDunningNotification(student, channel, level);
            actionsTaken.push(`${channel} 알림 전송`);
          }

          // 자동 재시도 (자동결제 등록자)
          if (dunningConfig.autoRetry && student.auto_billing_enabled) {
            const retryResult = await this.retryAutoBilling(student);
            actionsTaken.push(retryResult ? '자동결제 재시도 성공' : '자동결제 재시도 실패');
          }

          // 출석 제한 설정
          if (dunningConfig.restrictAccess) {
            await this.setAttendanceRestriction(student.id, true);
            actionsTaken.push('출석 제한 설정');
          }

          // 던닝 기록
          await this.recordDunningAction(student.id, level, actionsTaken);

          actions.push({
            studentId: student.id,
            level,
            dueAmount: student.overdue_amount,
            overduedays: daysOverdue,
            actions: actionsTaken,
          });
        }
      }

      // 일일 던닝 리포트 생성
      await this.generateDunningReport(actions);

      return actions;

    } catch (error: unknown) {
      if (__DEV__) console.error('Dunning process error:', error);
      return actions;
    }
  }

  /**
   * 자동 갱신 처리
   */
  async processAutoRenewals(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      // 갱신 대상자 조회 (유효기간 7일 전)
      const renewalCandidates = await this.getAutoRenewalCandidates();

      for (const candidate of renewalCandidates) {
        // 7일 전 사전 알림
        if (candidate.days_until_expiry === 7) {
          await this.sendRenewalReminder(candidate);
          continue;
        }

        // 만료일에 자동 결제
        if (candidate.days_until_expiry <= 0) {
          const result = await this.processPayment({
            studentId: candidate.student_id,
            parentId: candidate.parent_id,
            type: PaymentType.RENEWAL,
            method: PaymentMethod.AUTO_BILLING,
            amount: candidate.renewal_amount,
            sessions: candidate.sessions,
            programId: candidate.program_id,
            classId: candidate.class_id,
            autoRenewal: true,
          });

          if (result.success) {
            processed++;
          } else {
            failed++;
            await this.handleAutoRenewalFailure(candidate, result.error);
          }
        }
      }

      // 갱신 처리 리포트
      await this.generateRenewalReport(processed, failed);

      return { processed, failed };

    } catch (error: unknown) {
      if (__DEV__) console.error('Auto renewal error:', error);
      return { processed, failed };
    }
  }

  /**
   * 잔여 횟수 체크 (플라이휠 유지)
   */
  async checkLowSessions(): Promise<void> {
    try {
      // 잔여 횟수 3회 이하 학생 조회
      const lowSessionStudents = await this.getLowSessionStudents(3);

      for (const student of lowSessionStudents) {
        // 추천 패키지 계산
        const recommendation = this.getPackageRecommendation(student);

        // 알림 전송
        await this.sendLowSessionAlert(student, recommendation);

        // AI 기반 이탈 예측
        const churnRisk = await this.predictChurnRisk(student.id);
        if (churnRisk > 0.7) {
          // 고위험 학생 - 관리자 알림
          await this.alertAdminHighChurnRisk(student, churnRisk);
        }
      }

    } catch (error: unknown) {
      if (__DEV__) console.error('Low session check error:', error);
    }
  }

  // ============================================================
  // 4. 내부 헬퍼 메서드
  // ============================================================

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

  private async validateStudent(studentId: string): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('atb_students')
      .select('id, name, parent_id, status')
      .eq('id', studentId)
      .eq('status', 'active')
      .single();
    return data || null;
  }

  private async checkDuplicatePayment(request: PaymentRequest): Promise<boolean> {
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

  private async validatePromotionCode(code: string): Promise<number> {
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

  private async calculateLoyaltyDiscount(studentId: string): Promise<number> {
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

  private async calculateFlywheelBonus(request: PaymentRequest): Promise<{
    bonusSessions?: number;
    discountPercent?: number;
    message?: string;
  }> {
    if (request.type === PaymentType.NEW_ENROLLMENT) {
      return FLYWHEEL_REWARDS.firstPayment;
    }

    if (request.autoRenewal) {
      return FLYWHEEL_REWARDS.autoRenewal;
    }

    if (request.type === PaymentType.RENEWAL) {
      return FLYWHEEL_REWARDS.renewal;
    }

    return {};
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
    // 실제 구현 시: NicePay, KCP, 이니시스 등 연동

    await new Promise(resolve => setTimeout(resolve, 100)); // PG 처리 시뮬레이션

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

    await this.logPaymentEvent('PAYMENT_FAILED', { paymentId, error: String(error) });
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

  private async addSessions(
    studentId: string,
    sessions: number,
    classId?: string
  ): Promise<{ remainingSessions: number }> {
    // 현재 세션 조회
    const { data: current } = await supabase
      .from('atb_enrollments')
      .select('remaining_sessions')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .single();

    const currentSessions = current?.remaining_sessions || 0;
    const newTotal = currentSessions + sessions;

    // 세션 업데이트
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

  private async updateEnrollmentStatus(studentId: string, classId?: string): Promise<void> {
    await supabase
      .from('atb_enrollments')
      .update({
        status: 'active',
        last_payment_date: new Date().toISOString(),
      })
      .eq('student_id', studentId)
      .eq('class_id', classId);
  }

  private async setValidityPeriod(studentId: string, programId?: string): Promise<string> {
    const program = PRICING_TABLE[programId || 'regular_8'];
    const validDays = program?.validDays || 35;
    const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('atb_enrollments')
      .update({ valid_until: validUntil })
      .eq('student_id', studentId);

    return validUntil;
  }

  private async setupAutoRenewal(
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

  private async generateReceipt(
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
      paymentType: payment.type as string,
      amount: payment.amount as number,
      sessions,
      remainingSessions,
      paymentDate: new Date().toISOString(),
      validUntil,
    };

    // 영수증 저장
    await supabase
      .from('atb_receipts')
      .insert({
        payment_id: paymentId,
        receipt_data: receipt,
      });

    return receipt;
  }

  private async sendPaymentNotification(
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

  private async notifyCoachOfPayment(classId: string, studentName: string): Promise<void> {
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

  private async updateAdminDashboard(type: PaymentType, amount: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await supabase.rpc('increment_daily_stats', {
      stat_date: today,
      payment_type: type,
      payment_amount: amount,
    });
  }

  private async recordFlywheelMetric(
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

  private async processReferralReward(studentId: string): Promise<void> {
    // 추천인 조회
    const { data: referral } = await supabase
      .from('atb_referrals')
      .select('referrer_id')
      .eq('referred_id', studentId)
      .single();

    if (referral?.referrer_id) {
      // 양측에 보너스 세션 추가
      const bonus = FLYWHEEL_REWARDS.referral.bonusSessions;

      await this.addBonusSessions(referral.referrer_id, bonus, '추천인 보상');
      await this.addBonusSessions(studentId, bonus, '추천 가입 보상');
    }
  }

  private async addBonusSessions(
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

  private async createAuditLog(data: Record<string, unknown>): Promise<void> {
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

  private async logPaymentEvent(event: string, data: unknown): Promise<void> {
    if (__DEV__) console.log(`[PaymentService] ${event}:`, JSON.stringify(data));

    await supabase
      .from('atb_payment_events')
      .insert({
        event_type: event,
        event_data: data as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
  }

  // 환불 관련 메서드
  private async getPaymentById(paymentId: string): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('atb_payments')
      .select('*')
      .eq('id', paymentId)
      .single();
    return data || null;
  }

  private async checkRefundEligibility(payment: Record<string, unknown>): Promise<{
    eligible: boolean;
    error?: PaymentError;
    message?: string;
  }> {
    // 환불 기간 확인 (결제 후 14일)
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

  private async getUsedSessions(studentId: string, paymentId: string): Promise<number> {
    const paymentData = await this.getPaymentById(paymentId);
    const { count } = await supabase
      .from('atb_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', (paymentData?.created_at as string) || new Date(0).toISOString());

    return count || 0;
  }

  private calculateRefundAmount(payment: Record<string, unknown>, unusedSessions: number): number {
    // 학원법 기준 환불 계산
    const amount = (payment.amount as number) || 0;
    const sessions = (payment.sessions as number) || 1;
    const perSessionPrice = amount / sessions;
    return Math.round(unusedSessions * perSessionPrice * 0.9); // 10% 위약금
  }

  private async requestPgRefund(
    transactionId: string,
    amount: number
  ): Promise<{ success: boolean }> {
    // PG사 환불 요청 (시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true };
  }

  private async deductSessions(studentId: string, sessions: number): Promise<void> {
    await supabase.rpc('deduct_sessions', {
      p_student_id: studentId,
      p_sessions: sessions,
    });
  }

  private async createRefundRecord(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data: refund, error } = await supabase
      .from('atb_refunds')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return refund;
  }

  private async sendRefundNotification(
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

  // 던닝 관련 메서드
  private async getOverdueStudents(): Promise<any[]> {
    const { data } = await supabase
      .from('atb_students')
      .select(`
        id,
        name,
        parent_id,
        auto_billing_enabled,
        atb_enrollments!inner(
          due_date,
          overdue_amount
        )
      `)
      .lt('atb_enrollments.due_date', new Date().toISOString())
      .gt('atb_enrollments.overdue_amount', 0);

    return data || [];
  }

  private calculateDaysOverdue(dueDate: string): number {
    return Math.floor(
      (Date.now() - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000)
    );
  }

  private determineDunningLevel(daysOverdue: number): DunningLevel | null {
    if (daysOverdue >= 30) return DunningLevel.LEVEL_5;
    if (daysOverdue >= 14) return DunningLevel.LEVEL_4;
    if (daysOverdue >= 7) return DunningLevel.LEVEL_3;
    if (daysOverdue >= 3) return DunningLevel.LEVEL_2;
    if (daysOverdue >= 1) return DunningLevel.LEVEL_1;
    return null;
  }

  private async sendDunningNotification(
    student: Record<string, unknown>,
    channel: string,
    level: DunningLevel
  ): Promise<void> {
    const messages: Record<DunningLevel, string> = {
      [DunningLevel.LEVEL_1]: `[온리쌤] ${student.name} 학생의 수강료 납부일이 지났습니다. 빠른 납부 부탁드립니다.`,
      [DunningLevel.LEVEL_2]: `[온리쌤] ${student.name} 학생 수강료 미납 안내 (3일 경과)`,
      [DunningLevel.LEVEL_3]: `[온리쌤] ${student.name} 학생 수강료 미납 안내 - 담당자가 연락드릴 예정입니다.`,
      [DunningLevel.LEVEL_4]: `[온리쌤] ${student.name} 학생 수강료 미납으로 출석이 제한될 수 있습니다.`,
      [DunningLevel.LEVEL_5]: `[온리쌤] ${student.name} 학생 수강료 장기 미납 - 수강 중지 예정`,
    };

    await supabase
      .from('atb_notifications')
      .insert({
        user_id: student.parent_id,
        type: 'dunning',
        title: '수강료 안내',
        message: messages[level],
        channel,
      });
  }

  private async retryAutoBilling(student: Record<string, unknown>): Promise<boolean> {
    // 자동결제 재시도 로직
    try {
      const result = await this.processPaymentMethod(
        PaymentMethod.AUTO_BILLING,
        (student.overdue_amount as number) || 0,
        `RETRY_${student.id as string}`
      );
      return result.success;
    } catch {
      return false;
    }
  }

  private async setAttendanceRestriction(studentId: string, restricted: boolean): Promise<void> {
    await supabase
      .from('atb_students')
      .update({ attendance_restricted: restricted })
      .eq('id', studentId);
  }

  private async recordDunningAction(
    studentId: string,
    level: DunningLevel,
    actions: string[]
  ): Promise<void> {
    await supabase
      .from('atb_dunning_history')
      .insert({
        student_id: studentId,
        level,
        actions,
        processed_at: new Date().toISOString(),
      });
  }

  private async generateDunningReport(actions: DunningAction[]): Promise<void> {
    await supabase
      .from('atb_daily_reports')
      .insert({
        report_type: 'dunning',
        report_date: new Date().toISOString().split('T')[0],
        data: { actions, total: actions.length },
      });
  }

  // 자동 갱신 관련 메서드
  private async getAutoRenewalCandidates(): Promise<any[]> {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('atb_auto_renewals')
      .select(`
        *,
        atb_students!inner(id, parent_id, name),
        atb_enrollments!inner(valid_until, remaining_sessions)
      `)
      .eq('is_active', true)
      .lte('atb_enrollments.valid_until', sevenDaysFromNow);

    return (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      days_until_expiry: Math.ceil(
        (new Date((item.atb_enrollments as Record<string, unknown>).valid_until as string).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      ),
    }));
  }

  private async sendRenewalReminder(candidate: Record<string, unknown>): Promise<void> {
    const students = candidate.atb_students as Record<string, unknown>;
    await supabase
      .from('atb_notifications')
      .insert({
        user_id: candidate.parent_id as string,
        type: 'renewal_reminder',
        title: '자동 갱신 안내',
        message: `${students.name} 학생의 수강권이 7일 후 자동 갱신됩니다. 변경을 원하시면 설정에서 해제해주세요.`,
        channel: 'kakao',
      });
  }

  private async handleAutoRenewalFailure(candidate: Record<string, unknown>, error?: PaymentError): Promise<void> {
    const students = candidate.atb_students as Record<string, unknown>;
    await supabase
      .from('atb_notifications')
      .insert({
        user_id: candidate.parent_id as string,
        type: 'renewal_failed',
        title: '자동 갱신 실패',
        message: `${students.name} 학생의 자동 갱신이 실패했습니다. 결제 수단을 확인해주세요.`,
        channel: 'kakao',
      });

    // 관리자 알림
    await supabase
      .from('atb_admin_alerts')
      .insert({
        type: 'auto_renewal_failed',
        student_id: candidate.student_id,
        error: error,
        processed: false,
      });
  }

  private async generateRenewalReport(processed: number, failed: number): Promise<void> {
    await supabase
      .from('atb_daily_reports')
      .insert({
        report_type: 'auto_renewal',
        report_date: new Date().toISOString().split('T')[0],
        data: { processed, failed, total: processed + failed },
      });
  }

  // 저세션 알림 관련 메서드
  private async getLowSessionStudents(threshold: number): Promise<Record<string, unknown>[]> {
    const { data } = await supabase
      .from('atb_enrollments')
      .select(`
        *,
        atb_students!inner(id, name, parent_id)
      `)
      .lte('remaining_sessions', threshold)
      .eq('status', 'active');

    return data || [];
  }

  private getPackageRecommendation(student: Record<string, unknown>): {
    programId: string;
    name: string;
    price: number;
    sessions: number;
  } {
    // 사용 패턴 기반 추천 (간단한 로직)
    return {
      programId: 'regular_8',
      name: '정규반 주2회',
      price: 220000,
      sessions: 8,
    };
  }

  private async sendLowSessionAlert(student: Record<string, unknown>, recommendation: Record<string, unknown>): Promise<void> {
    const students = student.atb_students as Record<string, unknown>;
    await supabase
      .from('atb_notifications')
      .insert({
        user_id: students.parent_id as string,
        type: 'low_sessions',
        title: '잔여 횟수 안내',
        message: `${students.name} 학생의 잔여 횟수가 ${student.remaining_sessions}회 남았습니다. ${recommendation.name}(${(recommendation.price as number).toLocaleString()}원/${recommendation.sessions}회) 추천드립니다.`,
        channel: 'push',
      });
  }

  private async predictChurnRisk(studentId: string): Promise<number> {
    // AI 기반 이탈 예측 (간단한 로직)
    const { data } = await supabase
      .from('atb_attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data || data.length < 5) return 0.5;

    const recentAttendanceRate = data.filter((a: Record<string, unknown>) => a.status === 'present').length / data.length;
    return 1 - recentAttendanceRate; // 낮은 출석률 = 높은 이탈 위험
  }

  private async alertAdminHighChurnRisk(student: Record<string, unknown>, risk: number): Promise<void> {
    const students = student.atb_students as Record<string, unknown>;
    await supabase
      .from('atb_admin_alerts')
      .insert({
        type: 'high_churn_risk',
        student_id: students.id as string,
        risk_score: risk,
        message: `${students.name} 학생 이탈 위험 (${(risk * 100).toFixed(0)}%)`,
        processed: false,
      });
  }
}

// ============================================================
// 5. 싱글톤 인스턴스 & 내보내기
// ============================================================

export const paymentService = new PaymentService();

// 스케줄링용 함수들
export const runDailyDunning = () => paymentService.runDunningProcess();
export const runAutoRenewals = () => paymentService.processAutoRenewals();
export const runLowSessionCheck = () => paymentService.checkLowSessions();
