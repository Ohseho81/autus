/**
 * payment.ts
 * 포트원(PortOne) V2 결제 연동
 * - 카카오페이 간편결제
 * - 신용카드 결제
 * - Webhook 처리
 */

import { WebView } from 'react-native-webview';
import { supabase } from './supabase';

// PortOne V2 설정
const PORTONE_CONFIG = {
  storeId: process.env.EXPO_PUBLIC_PORTONE_STORE_ID || 'store-xxx',
  channelKey: process.env.EXPO_PUBLIC_PORTONE_CHANNEL_KEY || 'channel-xxx',
  // 카카오페이 채널
  kakaoPayChannelKey: process.env.EXPO_PUBLIC_PORTONE_KAKAOPAY_CHANNEL || 'channel-kakaopay',
};

// 결제 요청 타입
export interface PaymentRequest {
  studentId: string;
  paymentId: string;  // student_payments.id
  amount: number;
  packageName: string;
  paymentMethod: 'EASY_PAY' | 'CARD';  // 간편결제 / 카드
  easyPayProvider?: 'KAKAOPAY' | 'NAVERPAY' | 'TOSSPAY';
}

// 결제 결과 타입
export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message?: string;
  paidAt?: string;
}

/**
 * 포트원 V2 결제 URL 생성
 */
export function generatePaymentUrl(request: PaymentRequest): string {
  const { studentId, paymentId, amount, packageName, paymentMethod, easyPayProvider } = request;

  // 주문 ID 생성 (고유값)
  const orderId = `ATB-${paymentId}-${Date.now()}`;

  // PortOne V2 결제 파라미터
  const params = new URLSearchParams({
    storeId: PORTONE_CONFIG.storeId,
    channelKey: paymentMethod === 'EASY_PAY' && easyPayProvider === 'KAKAOPAY'
      ? PORTONE_CONFIG.kakaoPayChannelKey
      : PORTONE_CONFIG.channelKey,
    paymentId: orderId,
    orderName: packageName,
    totalAmount: amount.toString(),
    currency: 'KRW',
    payMethod: paymentMethod,
    ...(easyPayProvider && { easyPay: JSON.stringify({ provider: easyPayProvider }) }),
    // 커스텀 데이터 (Webhook에서 사용)
    customData: JSON.stringify({
      student_id: studentId,
      payment_id: paymentId,
      package_name: packageName,
    }),
    // 리다이렉트 URL
    redirectUrl: `atbhub://payment/complete?orderId=${orderId}`,
    // Webhook URL (Supabase Edge Function)
    noticeUrls: JSON.stringify([
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payment-webhook`,
    ]),
  });

  return `https://portone.io/v2/checkout?${params.toString()}`;
}

/**
 * 결제 상태 확인
 */
export async function checkPaymentStatus(paymentId: string): Promise<PaymentResult> {
  try {
    const { data, error } = await supabase
      .from('student_payments')
      .select('paid, paid_at, pg_transaction_id, status')
      .eq('id', paymentId)
      .single();

    if (error) throw error;

    return {
      success: data.paid,
      transactionId: data.pg_transaction_id,
      paidAt: data.paid_at,
      message: data.paid ? '결제 완료' : '결제 대기 중',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * 결제 완료 처리 (로컬)
 * Webhook으로도 처리되지만, 앱에서도 확인용으로 호출
 */
export async function confirmPayment(
  paymentId: string,
  transactionId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('student_payments')
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        pg_transaction_id: transactionId,
        status: 'paid',
        qr_active: true,
      })
      .eq('id', paymentId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * 결제 취소 요청
 */
export async function cancelPayment(
  transactionId: string,
  reason: string
): Promise<boolean> {
  try {
    // Supabase Edge Function을 통해 취소 요청
    const { data, error } = await supabase.functions.invoke('cancel-payment', {
      body: {
        transactionId,
        reason,
      },
    });

    return data?.success ?? false;
  } catch {
    return false;
  }
}

/**
 * 미납 알림 발송 + 결제 링크 생성
 */
export async function sendPaymentReminder(paymentId: string): Promise<string> {
  const { data: payment } = await supabase
    .from('student_payments')
    .select(`
      *,
      student:students(name, parent_phone)
    `)
    .eq('id', paymentId)
    .single();

  if (!payment) throw new Error('Payment not found');

  // 결제 URL 생성
  const paymentUrl = generatePaymentUrl({
    studentId: payment.student_id,
    paymentId: payment.id,
    amount: payment.amount,
    packageName: payment.package_name,
    paymentMethod: 'EASY_PAY',
    easyPayProvider: 'KAKAOPAY',
  });

  // 단축 URL 생성 (Supabase Edge Function)
  const { data: shortUrl } = await supabase.functions.invoke('shorten-url', {
    body: { url: paymentUrl },
  });

  // 알림톡 발송
  await supabase.functions.invoke('send-notification', {
    body: {
      type: 'payment_reminder',
      phone: payment.student.parent_phone,
      template: 'payment_reminder',
      variables: {
        student_name: payment.student.name,
        package_name: payment.package_name,
        amount: payment.amount.toLocaleString(),
        due_date: payment.due_date,
        payment_url: shortUrl?.url || paymentUrl,
      },
    },
  });

  return shortUrl?.url || paymentUrl;
}