/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚨 Supabase Edge Function: emergency-alert
 * 긴급 신고 시 관리자에게 즉시 알림 발송
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyPayload {
  session_id?: string;
  staff_id: string;
  message: string;
  location?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: EmergencyPayload = await req.json();
    const { session_id, staff_id, message, location } = payload;

    // 1. 담당자(코치) 정보 조회
    const { data: staff } = await supabase
      .from('atb_staff')
      .select('name, phone')
      .eq('id', staff_id)
      .single();

    // 2. 세션 정보 조회 (있는 경우)
    let sessionInfo = null;
    if (session_id) {
      const { data: session } = await supabase
        .from('atb_sessions')
        .select(`
          name, 
          session_date,
          atb_classes(name, location)
        `)
        .eq('id', session_id)
        .single();
      sessionInfo = session;
    }

    // 3. 모든 관리자 조회
    const { data: admins } = await supabase
      .from('atb_staff')
      .select('id, name, phone, fcm_token')
      .eq('role', 'admin');

    // 4. 긴급 알림 메시지 구성
    const alertMessage = `🚨 [긴급 신고]
━━━━━━━━━━━━━━━
📍 신고자: ${staff?.name || '알 수 없음'}
${sessionInfo ? `📚 수업: ${sessionInfo.name}` : ''}
${location ? `📌 위치: ${location}` : ''}
💬 내용: ${message || '긴급 상황 발생'}
⏰ 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
━━━━━━━━━━━━━━━
즉시 확인이 필요합니다!`;

    const results: Array<{ admin: string; channel: string; success: boolean }> = [];

    // 5. 각 관리자에게 알림 발송
    for (const admin of admins || []) {
      // 카카오 알림톡 발송
      if (admin.phone) {
        const kakaoResult = await sendKakaoAlert(admin.phone, alertMessage);
        results.push({ admin: admin.name, channel: 'kakao', success: kakaoResult });
      }

      // FCM Push 발송
      if (admin.fcm_token) {
        const fcmResult = await sendFCMAlert(admin.fcm_token, {
          title: '🚨 긴급 신고',
          body: `${staff?.name || '담당자'}님이 긴급 상황을 신고했습니다.`,
          data: { session_id, staff_id, type: 'emergency' },
        });
        results.push({ admin: admin.name, channel: 'fcm', success: fcmResult });
      }
    }

    // 6. 긴급 신고 기록 저장
    await supabase.from('atb_emergency_reports').insert({
      session_id,
      staff_id,
      message,
      location,
      status: 'pending',
      reported_at: new Date().toISOString(),
      notification_sent: results.some(r => r.success),
    });

    // 7. 알림 로그 저장
    await supabase.from('atb_notification_logs').insert({
      type: 'emergency',
      recipients: admins?.map(a => a.id) || [],
      message: alertMessage,
      sent_at: new Date().toISOString(),
      results: JSON.stringify(results),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          message: '긴급 알림이 발송되었습니다.',
          notified_admins: results.length,
          results,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('Emergency alert error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
        code: 'EMERGENCY_ALERT_ERROR',
      }),
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

/**
 * 카카오 알림톡 발송
 */
async function sendKakaoAlert(phone: string, message: string): Promise<boolean> {
  const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY');
  const SOLAPI_API_SECRET = Deno.env.get('SOLAPI_API_SECRET');
  const SOLAPI_PFID = Deno.env.get('SOLAPI_PFID');

  if (!SOLAPI_API_KEY) {
    console.log('Solapi API key not configured, skipping...');
    return false;
  }

  try {
    // Solapi (구 CoolSMS) API 사용
    const timestamp = Date.now().toString();
    const signature = await generateSignature(timestamp, SOLAPI_API_SECRET || '');

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${timestamp}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: phone.replace(/-/g, ''),
          from: Deno.env.get('SOLAPI_SENDER_NUMBER') || '01000000000',
          kakaoOptions: {
            pfId: SOLAPI_PFID,
            templateId: 'emergency_alert',
            variables: {
              '#{message}': message,
            },
          },
        },
      }),
    });

    return response.ok;
  } catch (error: unknown) {
    console.error('Kakao alert error:', error);

    // 알림톡 실패 시 SMS 발송 시도
    return await sendSMS(phone, message);
  }
}

/**
 * SMS 발송 (알림톡 실패 시 fallback)
 */
async function sendSMS(phone: string, message: string): Promise<boolean> {
  const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY');
  const SOLAPI_API_SECRET = Deno.env.get('SOLAPI_API_SECRET');

  if (!SOLAPI_API_KEY) return false;

  try {
    const timestamp = Date.now().toString();
    const signature = await generateSignature(timestamp, SOLAPI_API_SECRET || '');

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${timestamp}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: phone.replace(/-/g, ''),
          from: Deno.env.get('SOLAPI_SENDER_NUMBER') || '01000000000',
          text: message.substring(0, 90), // SMS 글자수 제한
          type: 'SMS',
        },
      }),
    });

    return response.ok;
  } catch (error: unknown) {
    console.error('SMS error:', error);
    return false;
  }
}

/**
 * FCM Push 발송
 */
async function sendFCMAlert(
  token: string,
  notification: { title: string; body: string; data?: Record<string, unknown> }
): Promise<boolean> {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');

  if (!FCM_SERVER_KEY) {
    console.log('FCM server key not configured, skipping...');
    return false;
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
        priority: 'high',
        notification: {
          title: notification.title,
          body: notification.body,
          sound: 'emergency',
          badge: 1,
        },
        data: notification.data,
      }),
    });

    return response.ok;
  } catch (error: unknown) {
    console.error('FCM error:', error);
    return false;
  }
}

/**
 * HMAC-SHA256 서명 생성
 */
async function generateSignature(timestamp: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(timestamp)
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
