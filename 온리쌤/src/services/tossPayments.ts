/**
 * tossPayments.ts
 * 토스페이먼츠 결제 연동 서비스
 * - 수업료 일반 결제
 * - 정기 결제 (자동 결제)
 * - 결제 취소/환불
 * - 빌링키 관리
 */

import { supabase } from '../lib/supabase';
import { env } from '../config/env';
import { EXTERNAL_APIS } from '../config/api-endpoints';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerEmail?: string;
  customerMobilePhone?: string;
  successUrl: string;
  failUrl: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface PaymentResult {
  success: boolean;
  paymentKey?: string;
  orderId?: string;
  status?: PaymentStatus;
  method?: string;
  totalAmount?: number;
  approvedAt?: string;
  receipt?: {
    url: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export type PaymentStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DEPOSIT'
  | 'DONE'
  | 'CANCELED'
  | 'PARTIAL_CANCELED'
  | 'ABORTED'
  | 'EXPIRED';

export interface BillingKeyRequest {
  customerKey: string;
  cardNumber: string;
  cardExpirationYear: string;
  cardExpirationMonth: string;
  cardPassword: string; // 앞 2자리
  customerIdentityNumber: string; // 생년월일 6자리 또는 사업자번호 10자리
  customerName?: string;
  customerEmail?: string;
}

export interface BillingKeyResult {
  success: boolean;
  billingKey?: string;
  customerKey?: string;
  card?: {
    company: string;
    number: string;
    cardType: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface AutoPaymentRequest {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
}

export interface RefundRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number; // 미입력 시 전액 환불
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ 설정
// ═══════════════════════════════════════════════════════════════════════════════

const TOSS_API_BASE = EXTERNAL_APIS.toss.base;
const CLIENT_KEY = env.payment.toss.clientKey;
const SECRET_KEY = env.payment.toss.secretKey;

// Base64 인코딩된 시크릿 키
const getAuthHeader = () => {
  const encoded = btoa(`${SECRET_KEY}:`);
  return `Basic ${encoded}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 API 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

const tossApiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${TOSS_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw {
      code: data.code || 'UNKNOWN_ERROR',
      message: data.message || '결제 처리 중 오류가 발생했습니다.',
    };
  }

  return data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 💳 일반 결제
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 결제 승인 요청
 * SDK에서 결제 완료 후 서버에서 호출
 */
export const confirmPayment = async (
  request: PaymentConfirmRequest
): Promise<PaymentResult> => {
  try {
    const result = await tossApiFetch('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        paymentKey: request.paymentKey,
        orderId: request.orderId,
        amount: request.amount,
      }),
    });

    // 결제 기록 저장
    await savePaymentRecord({
      payment_key: result.paymentKey as string | undefined,
      order_id: result.orderId as string | undefined,
      amount: result.totalAmount as number | undefined,
      status: result.status as PaymentStatus | undefined,
      method: result.method as string | undefined,
      approved_at: result.approvedAt as string | undefined,
      receipt_url: result.receipt?.url as string | undefined,
      raw_response: result,
    });

    return {
      success: true,
      paymentKey: result.paymentKey as string,
      orderId: result.orderId as string,
      status: result.status as PaymentStatus,
      method: result.method as string,
      totalAmount: result.totalAmount as number,
      approvedAt: result.approvedAt as string,
      receipt: result.receipt as { url: string } | undefined,
    };
  } catch (error: unknown) {
    if (__DEV__) console.error('결제 승인 실패:', error);

    const errorObj = error as Record<string, unknown>;
    await savePaymentRecord({
      order_id: request.orderId,
      amount: request.amount,
      status: 'FAILED',
      error_code: errorObj.code as string | undefined,
      error_message: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: {
        code: errorObj.code as string,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

/**
 * 결제 정보 조회
 */
export const getPayment = async (paymentKey: string): Promise<PaymentResult> => {
  try {
    const result = await tossApiFetch(`/payments/${paymentKey}`);
    return {
      success: true,
      paymentKey: result.paymentKey as string,
      orderId: result.orderId as string,
      status: result.status as PaymentStatus,
      method: result.method as string,
      totalAmount: result.totalAmount as number,
      approvedAt: result.approvedAt as string,
      receipt: result.receipt as { url: string } | undefined,
    };
  } catch (error: unknown) {
    const errorObj = error as Record<string, unknown>;
    return {
      success: false,
      error: {
        code: errorObj.code as string,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 정기 결제 (빌링)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 빌링키 발급 (카드 등록)
 */
export const issueBillingKey = async (
  request: BillingKeyRequest
): Promise<BillingKeyResult> => {
  try {
    const result = await tossApiFetch('/billing/authorizations/card', {
      method: 'POST',
      body: JSON.stringify({
        customerKey: request.customerKey,
        cardNumber: request.cardNumber,
        cardExpirationYear: request.cardExpirationYear,
        cardExpirationMonth: request.cardExpirationMonth,
        cardPassword: request.cardPassword,
        customerIdentityNumber: request.customerIdentityNumber,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
      }),
    });

    // 빌링키 저장
    await saveBillingKey({
      customer_key: result.customerKey as string | undefined,
      billing_key: result.billingKey as string | undefined,
      card_company: result.card?.company as string | undefined,
      card_number: result.card?.number as string | undefined,
      card_type: result.card?.cardType as string | undefined,
    });

    return {
      success: true,
      billingKey: result.billingKey as string,
      customerKey: result.customerKey as string,
      card: result.card as { company: string; number: string; cardType: string } | undefined,
    };
  } catch (error: unknown) {
    if (__DEV__) console.error('빌링키 발급 실패:', error);
    const errorObj = error as Record<string, unknown>;
    return {
      success: false,
      error: {
        code: errorObj.code as string,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

/**
 * 빌링키로 자동 결제
 */
export const chargeWithBillingKey = async (
  request: AutoPaymentRequest
): Promise<PaymentResult> => {
  try {
    const result = await tossApiFetch(`/billing/${request.billingKey}`, {
      method: 'POST',
      body: JSON.stringify({
        customerKey: request.customerKey,
        amount: request.amount,
        orderId: request.orderId,
        orderName: request.orderName,
        customerEmail: request.customerEmail,
        customerName: request.customerName,
      }),
    });

    // 결제 기록 저장
    await savePaymentRecord({
      payment_key: result.paymentKey as string | undefined,
      order_id: result.orderId as string | undefined,
      amount: result.totalAmount as number | undefined,
      status: result.status as PaymentStatus | undefined,
      method: 'BILLING', // 자동결제
      billing_key: request.billingKey,
      approved_at: result.approvedAt as string | undefined,
      receipt_url: result.receipt?.url as string | undefined,
      raw_response: result,
    });

    return {
      success: true,
      paymentKey: result.paymentKey as string,
      orderId: result.orderId as string,
      status: result.status as PaymentStatus,
      totalAmount: result.totalAmount as number,
      approvedAt: result.approvedAt as string,
      receipt: result.receipt as { url: string } | undefined,
    };
  } catch (error: unknown) {
    if (__DEV__) console.error('자동 결제 실패:', error);
    const errorObj = error as Record<string, unknown>;
    return {
      success: false,
      error: {
        code: errorObj.code as string,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

/**
 * 빌링키 삭제 (카드 해지)
 */
export const deleteBillingKey = async (
  billingKey: string,
  customerKey: string
): Promise<{ success: boolean; error?: unknown }> => {
  try {
    await tossApiFetch(`/billing/authorizations/${billingKey}`, {
      method: 'DELETE',
      body: JSON.stringify({ customerKey }),
    });

    // DB에서도 삭제
    await supabase
      .from('billing_keys')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('billing_key', billingKey);

    return { success: true };
  } catch (error: unknown) {
    const errorObj = error as Record<string, unknown>;
    return {
      success: false,
      error: {
        code: errorObj.code as string,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ❌ 결제 취소/환불
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 결제 취소
 */
export const cancelPayment = async (
  request: RefundRequest
): Promise<PaymentResult> => {
  try {
    const body: Record<string, unknown> = {
      cancelReason: request.cancelReason,
    };

    if (request.cancelAmount) {
      body.cancelAmount = request.cancelAmount;
    }

    if (request.refundReceiveAccount) {
      body.refundReceiveAccount = request.refundReceiveAccount;
    }

    const result = await tossApiFetch(
      `/payments/${request.paymentKey}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    // 취소 기록 업데이트
    await supabase
      .from('payment_records')
      .update({
        status: result.status,
        canceled_at: new Date().toISOString(),
        cancel_reason: request.cancelReason,
        cancel_amount: request.cancelAmount || result.totalAmount,
      })
      .eq('payment_key', request.paymentKey);

    return {
      success: true,
      paymentKey: result.paymentKey as string,
      orderId: result.orderId as string,
      status: result.status as PaymentStatus,
      totalAmount: result.totalAmount as number,
    };
  } catch (error: unknown) {
    if (__DEV__) console.error('결제 취소 실패:', error);
    const errorObj = error as Record<string, unknown>;
    return {
      success: false,
      error: {
        code: errorObj.code as string,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 💾 DB 저장 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

const savePaymentRecord = async (data: Record<string, unknown>) => {
  const { error } = await supabase.from('payment_records').insert(data);
  if (error && __DEV__) console.error('결제 기록 저장 실패:', error);
};

const saveBillingKey = async (data: Record<string, unknown>) => {
  const { error } = await supabase.from('billing_keys').upsert(data, {
    onConflict: 'customer_key',
  });
  if (error && __DEV__) console.error('빌링키 저장 실패:', error);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏀 온리쌤 전용 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 수업료 결제 주문 생성
 */
export const createLessonPaymentOrder = (params: {
  studentId: string;
  studentName: string;
  parentName: string;
  lessonPackage: {
    name: string;
    lessonCount: number;
    price: number;
  };
}) => {
  const timestamp = Date.now();
  const orderId = `ATB_${params.studentId.slice(0, 8)}_${timestamp}`;

  return {
    orderId,
    orderName: `[온리쌤] ${params.lessonPackage.name} (${params.lessonPackage.lessonCount}회)`,
    amount: params.lessonPackage.price,
    customerName: params.parentName,
    metadata: {
      studentId: params.studentId,
      studentName: params.studentName,
      lessonCount: params.lessonPackage.lessonCount,
      packageName: params.lessonPackage.name,
    },
  };
};

/**
 * 정기 결제 (월 수업료)
 */
export const processMonthlyPayment = async (params: {
  studentId: string;
  billingKey: string;
  customerKey: string;
  amount: number;
  month: string; // '2026-02'
}) => {
  const orderId = `ATB_MONTHLY_${params.studentId.slice(0, 8)}_${params.month.replace('-', '')}`;

  const result = await chargeWithBillingKey({
    billingKey: params.billingKey,
    customerKey: params.customerKey,
    amount: params.amount,
    orderId,
    orderName: `[온리쌤] ${params.month} 월 수업료`,
  });

  if (result.success) {
    // 학생 결제 상태 업데이트
    await supabase
      .from('student_payments')
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        payment_key: result.paymentKey,
      })
      .eq('student_id', params.studentId)
      .eq('payment_month', params.month);

    // 알림톡 발송 (영수증)
    // await sendPaymentConfirmation(...)
  }

  return result;
};

/**
 * 수업료 환불 (남은 수업 기준)
 */
export const refundRemainingLessons = async (params: {
  paymentKey: string;
  totalLessons: number;
  usedLessons: number;
  totalAmount: number;
  reason: string;
}) => {
  const remainingLessons = params.totalLessons - params.usedLessons;
  const refundAmount = Math.floor(
    (params.totalAmount / params.totalLessons) * remainingLessons
  );

  return await cancelPayment({
    paymentKey: params.paymentKey,
    cancelReason: params.reason,
    cancelAmount: refundAmount,
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 수업권 패키지 정의
// ═══════════════════════════════════════════════════════════════════════════════

export const LESSON_PACKAGES = [
  {
    id: 'trial',
    name: '체험 수업',
    lessonCount: 1,
    price: 30000,
    description: '첫 체험 할인가',
    popular: false,
  },
  {
    id: 'basic_4',
    name: '기본반 4회',
    lessonCount: 4,
    price: 160000,
    pricePerLesson: 40000,
    description: '주 1회 수업',
    popular: false,
  },
  {
    id: 'standard_8',
    name: '정규반 8회',
    lessonCount: 8,
    price: 280000,
    pricePerLesson: 35000,
    description: '주 2회 수업 추천',
    popular: true,
  },
  {
    id: 'intensive_12',
    name: '집중반 12회',
    lessonCount: 12,
    price: 360000,
    pricePerLesson: 30000,
    description: '주 3회 집중 훈련',
    popular: false,
  },
  {
    id: 'monthly',
    name: '월정액 무제한',
    lessonCount: -1, // 무제한
    price: 450000,
    description: '한 달 무제한 수업',
    popular: false,
  },
];

export default {
  confirmPayment,
  getPayment,
  issueBillingKey,
  chargeWithBillingKey,
  deleteBillingKey,
  cancelPayment,
  createLessonPaymentOrder,
  processMonthlyPayment,
  refundRemainingLessons,
  LESSON_PACKAGES,
  CLIENT_KEY,
};
