/**
 * PaymentService Types - All interfaces, types, and enums
 */

// ============================================================
// 1. Enums
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

// ============================================================
// 2. Interfaces
// ============================================================

export interface PaymentRequest {
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

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  error?: PaymentError;
  message?: string;
  metrics?: PaymentMetrics;
  receipt?: PaymentReceipt;
}

export interface PaymentMetrics {
  totalDurationMs: number;
  steps: StepMetric[];
  validationTimeMs: number;
  pgProcessingTimeMs: number;
  sessionUpdateTimeMs: number;
  notificationTimeMs: number;
}

export interface StepMetric {
  step: number;
  name: string;
  durationMs: number;
  success: boolean;
}

export interface PaymentReceipt {
  receiptId: string;
  studentName: string;
  paymentType: string;
  amount: number;
  sessions: number;
  remainingSessions: number;
  paymentDate: string;
  validUntil: string;
}

export interface RefundRequest {
  paymentId: string;
  reason: string;
  amount?: number;            // 부분환불 금액
  requestedBy: string;        // 요청자 ID
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundAmount?: number;
  sessionsDeducted?: number;
  error?: PaymentError;
  message?: string;
}

export interface DunningAction {
  studentId: string;
  level: DunningLevel;
  dueAmount: number;
  overduedays: number;
  actions: string[];
}

// ============================================================
// 3. Configuration Types
// ============================================================

export interface FlywheelReward {
  bonusSessions?: number;
  discountPercent?: number;
  message?: string;
}

export interface FlywheelConfig {
  firstPayment: FlywheelReward;
  renewal: FlywheelReward;
  autoRenewal: FlywheelReward;
  referral: FlywheelReward & { referrerBonus: number };
  loyaltyTier: {
    bronze: { threshold: number; discount: number };
    silver: { threshold: number; discount: number };
    gold: { threshold: number; discount: number };
    platinum: { threshold: number; discount: number };
  };
}

export interface DunningSchedule {
  daysOverdue: number;
  channels: string[];
  restrictAccess: boolean;
  autoRetry: boolean;
}

export interface PricingItem {
  name: string;
  sessions: number;
  basePrice: number;
  validDays: number;
}

// ============================================================
// 4. Constants Export
// ============================================================

export const FLYWHEEL_REWARDS: FlywheelConfig = {
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

export const DUNNING_SCHEDULE: Record<DunningLevel, DunningSchedule> = {
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

export const PRICING_TABLE: Record<string, PricingItem> = {
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
