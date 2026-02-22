/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Payment Webhook - 결제->감사 금융 워크플로우
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 철학: "결제 발생 = 감동의 순간 = 감사 유도의 최적 타이밍"
 *
 * 트리거: 토스페이먼트 웹훅 (결제 완료 시)
 *
 * 워크플로우:
 * 1. 결제 정보 수신 -> payment_records 저장
 * 2. 학생 정보 조회 -> 코치 매칭
 * 3. 코치에게 Push 알림 ("김승현 학생 결제 완료!")
 * 4. 학부모에게 감사 링크 포함 알림톡 발송
 * 5. V-Index 업데이트 (결제 = 긍정 신호)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_NAME = 'payment-webhook';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(message: string, data?: unknown) {
  console.log(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, data !== undefined ? data : '');
}

function logError(message: string, error?: unknown) {
  console.error(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, error !== undefined ? error : '');
}

// 토스페이먼트 웹훅 페이로드 타입
interface TossPaymentWebhook {
  eventType: 'PAYMENT_STATUS_CHANGED' | 'DEPOSIT_CALLBACK';
  createdAt: string;
  data: {
    paymentKey: string;
    orderId: string;
    status: 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'WAITING_FOR_DEPOSIT';
    approvedAt?: string;
    method: string;
    totalAmount: number;
    suppliedAmount: number;
    vat: number;
    card?: {
      number: string;
      installmentPlanMonths: number;
      approveNo: string;
    };
    virtualAccount?: {
      accountNumber: string;
      bankCode: string;
      dueDate: string;
    };
    // 커스텀 메타데이터
    metadata?: {
      studentId?: string;
      studentName?: string;
      parentPhone?: string;
      serviceName?: string;
    };
  };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Method validation -- webhooks are POST only
  if (req.method !== 'POST') {
    log(`Rejected method: ${req.method}`);
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Content-Type validation
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      log(`Invalid content-type: ${contentType}`);
      return new Response(
        JSON.stringify({ ok: false, error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      logError('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ ok: false, error: 'Server misconfiguration', code: 'ENV_MISSING' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse payload
    let payload: TossPaymentWebhook;
    try {
      payload = await req.json();
    } catch (_parseError) {
      log('Failed to parse JSON body');
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body', code: 'INVALID_JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Required field validation
    if (!payload.eventType) {
      log('Missing required field: eventType');
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required field: eventType', code: 'MISSING_FIELD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.data || !payload.data.paymentKey || !payload.data.orderId) {
      log('Missing required fields: data.paymentKey or data.orderId');
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields: data.paymentKey, data.orderId', code: 'MISSING_FIELD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof payload.data.totalAmount !== 'number' || payload.data.totalAmount < 0) {
      log(`Invalid totalAmount: ${payload.data.totalAmount}`);
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid totalAmount: must be a non-negative number', code: 'INVALID_FIELD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log(`Received: ${payload.eventType}, status=${payload.data.status}, paymentKey=${payload.data.paymentKey}`);

    // 결제 완료만 처리
    if (payload.data.status !== 'DONE') {
      log(`Skipping non-DONE status: ${payload.data.status}`);
      return new Response(
        JSON.stringify({ ok: true, data: { skipped: true, reason: `Status is ${payload.data.status}, not DONE` } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { data } = payload;
    const metadata = data.metadata || {};

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. payment_records 저장
    // ═══════════════════════════════════════════════════════════════════════════

    const paymentRecord = {
      id: crypto.randomUUID(),
      payment_key: data.paymentKey,
      order_id: data.orderId,
      student_id: metadata.studentId || null,
      amount: data.totalAmount,
      status: data.status,
      method: data.method,
      approved_at: data.approvedAt,
      metadata: {
        studentName: metadata.studentName,
        parentPhone: metadata.parentPhone,
        serviceName: metadata.serviceName,
        card: data.card,
        virtualAccount: data.virtualAccount,
      },
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('payment_records').insert(paymentRecord);
    if (insertError) {
      logError('payment_records insert failed:', insertError);
      // Continue processing -- don't fail the entire webhook for a logging error
    } else {
      log(`Payment saved: ${paymentRecord.id}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. 학생 정보 조회
    // ═══════════════════════════════════════════════════════════════════════════

    let student = null;
    if (metadata.studentId) {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', metadata.studentId)
        .single();
      student = studentData;
    } else if (metadata.studentName) {
      // 이름으로 검색
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .ilike('name', `%${metadata.studentName}%`)
        .limit(1)
        .single();
      student = studentData;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. 코치에게 Push 알림
    // ═══════════════════════════════════════════════════════════════════════════

    const coachNotification = {
      title: '결제 완료!',
      body: `${metadata.studentName || '학생'} - ${data.totalAmount.toLocaleString()}원 결제`,
      data: {
        type: 'payment_received',
        paymentId: paymentRecord.id,
        studentId: metadata.studentId,
        amount: data.totalAmount,
      },
    };

    // 코치 FCM 토큰 조회 및 Push 발송
    try {
      const { data: coaches } = await supabase
        .from('staff')
        .select('fcm_token')
        .eq('role', 'coach')
        .not('fcm_token', 'is', null);

      if (coaches && coaches.length > 0) {
        for (const coach of coaches) {
          if (coach.fcm_token) {
            await sendFCMPush(coach.fcm_token, coachNotification);
          }
        }
        log(`Coach notifications sent to ${coaches.length} coaches`);
      }
    } catch (fcmError) {
      logError('Coach FCM notification failed (non-fatal):', fcmError);
      // Non-fatal: don't fail the webhook for notification errors
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. 학부모에게 감사 링크 포함 알림톡 발송
    // ═══════════════════════════════════════════════════════════════════════════

    const parentPhone = metadata.parentPhone || student?.parent_phone;
    if (parentPhone) {
      try {
        const gratitudeLink = `${Deno.env.get('APP_URL') || 'https://autus.app'}/gratitude?payment=${paymentRecord.id}`;

        await sendKakaoAlimtalk(parentPhone, 'payment_complete', {
          studentName: metadata.studentName || student?.name || '',
          amount: data.totalAmount.toLocaleString(),
          serviceName: metadata.serviceName || '수업료',
          gratitudeLink,
        });

        log('Parent alimtalk sent');
      } catch (alimtalkError) {
        logError('Parent alimtalk failed (non-fatal):', alimtalkError);
        // Non-fatal: don't fail the webhook for notification errors
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. V-Index 업데이트 (결제 = 긍정 신호)
    // ═══════════════════════════════════════════════════════════════════════════

    if (student) {
      try {
        // 결제 시 V-Index +3 (최대 100)
        const newVIndex = Math.min((student.v_index || 50) + 3, 100);

        await supabase
          .from('students')
          .update({
            v_index: newVIndex,
            last_payment_at: new Date().toISOString(),
          })
          .eq('id', student.id);

        log(`V-Index updated: ${student.id} -> ${newVIndex}`);
      } catch (vindexError) {
        logError('V-Index update failed (non-fatal):', vindexError);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. 알림 로그 저장
    // ═══════════════════════════════════════════════════════════════════════════

    try {
      await supabase.from('atb_notification_logs').insert({
        type: 'payment_complete',
        recipients: [parentPhone].filter(Boolean),
        message: `결제 완료: ${data.totalAmount.toLocaleString()}원`,
        metadata: {
          paymentId: paymentRecord.id,
          studentId: metadata.studentId,
        },
        status: 'sent',
      });
    } catch (logInsertError) {
      logError('Notification log insert failed (non-fatal):', logInsertError);
    }

    const workflow = ['payment_saved', 'coach_notified', 'parent_alimtalk', 'vindex_updated'];
    log(`Workflow complete: ${workflow.join(' -> ')}`);

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          paymentId: paymentRecord.id,
          workflow,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logError('Unhandled error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: message, code: 'INTERNAL_ERROR' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFCMPush(token: string, notification: { title: string; body: string; data?: Record<string, unknown> }) {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
  if (!FCM_SERVER_KEY) {
    console.log('[PaymentWebhook] FCM key not configured');
    return { sent: false };
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: { title: notification.title, body: notification.body },
        data: notification.data,
      }),
    });
    return { sent: response.ok };
  } catch (error: unknown) {
    console.error('[PaymentWebhook] FCM error:', error);
    return { sent: false };
  }
}

async function sendKakaoAlimtalk(phone: string, templateCode: string, variables: Record<string, string>) {
  const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY');
  const SOLAPI_API_SECRET = Deno.env.get('SOLAPI_API_SECRET');
  const SOLAPI_PFID = Deno.env.get('SOLAPI_PFID');

  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET) {
    console.log('[PaymentWebhook] Solapi not configured');
    return { sent: false };
  }

  try {
    const timestamp = new Date().toISOString();
    const signature = await generateSignature(timestamp, SOLAPI_API_SECRET);

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${timestamp}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: phone.replace(/-/g, ''),
          from: Deno.env.get('SOLAPI_SENDER') || '01000000000',
          kakaoOptions: {
            pfId: SOLAPI_PFID,
            templateId: templateCode,
            variables,
          },
        },
      }),
    });

    return { sent: response.ok };
  } catch (error: unknown) {
    console.error('[PaymentWebhook] Alimtalk error:', error);
    return { sent: false };
  }
}

async function generateSignature(timestamp: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
