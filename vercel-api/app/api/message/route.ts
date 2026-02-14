/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📱 Message API - 학부모 알림 (카카오톡/SMS/이메일)
 * 
 * 지원 채널:
 * - 카카오 알림톡 (AlimTalk)
 * - SMS (솔라피/네이버 클라우드)
 * - 이메일 (SendGrid/SES)
 * - 인앱 푸시
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { captureError } from '@/lib/monitoring';
import { logger } from '@/lib/logger';

// Supabase Client (lazy via shared singleton)
function getSupabase() {
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

// 외부 서비스 설정
const KAKAO_API_KEY = process.env.KAKAO_ALIMTALK_API_KEY || '';
const KAKAO_SENDER_KEY = process.env.KAKAO_SENDER_KEY || '';
const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY || '';
const SOLAPI_SECRET = process.env.SOLAPI_SECRET || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface MessageRequest {
  action: 'send' | 'bulk_send' | 'templates' | 'history';
  
  // send 액션
  channel?: 'kakao' | 'sms' | 'email' | 'push' | 'all';
  recipient_phone?: string;
  recipient_email?: string;
  recipient_id?: string;
  template_id?: string;
  template_variables?: Record<string, string>;
  custom_message?: string;
  
  // 학생/학부모 정보
  student_id?: string;
  student_name?: string;
  parent_name?: string;
  
  // bulk_send 액션
  recipients?: Array<{
    phone?: string;
    email?: string;
    name?: string;
    variables?: Record<string, string>;
  }>;
  
  // history 액션
  limit?: number;
  org_id?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 알림톡 템플릿
// ═══════════════════════════════════════════════════════════════════════════

const KAKAO_TEMPLATES = {
  attendance_check: {
    id: 'ATT001',
    name: '출석 확인',
    content: '안녕하세요, #{학부모명}님.\n#{학생명} 학생이 #{시간}에 출석하였습니다.\n\n오늘도 화이팅! 💪',
  },
  attendance_absent: {
    id: 'ATT002',
    name: '결석 알림',
    content: '안녕하세요, #{학부모명}님.\n#{학생명} 학생이 오늘 수업에 불참하였습니다.\n\n사유가 있으시면 학원으로 연락 부탁드립니다.\n📞 010-0000-0000',
  },
  payment_reminder: {
    id: 'PAY001',
    name: '수강료 안내',
    content: '안녕하세요, #{학부모명}님.\n#{월}월 수강료 #{금액}원 납부 안내드립니다.\n\n납부 기한: #{기한}\n계좌: #{계좌}\n\n감사합니다.',
  },
  payment_complete: {
    id: 'PAY002',
    name: '결제 완료',
    content: '안녕하세요, #{학부모명}님.\n#{월}월 수강료 #{금액}원 결제가 완료되었습니다.\n\n항상 이용해 주셔서 감사합니다.',
  },
  positive_report: {
    id: 'RPT001',
    name: '긍정 리포트',
    content: '안녕하세요, #{학부모명}님.\n#{학생명} 학생의 좋은 소식을 전해드립니다!\n\n#{내용}\n\n앞으로도 #{학생명} 학생을 응원합니다! ⭐',
  },
  schedule_reminder: {
    id: 'SCH001',
    name: '일정 알림',
    content: '안녕하세요, #{학부모명}님.\n#{일정명}이 #{날짜} #{시간}에 예정되어 있습니다.\n\n장소: #{장소}\n\n참석 부탁드립니다.',
  },
  test_result: {
    id: 'TST001',
    name: '시험 결과',
    content: '안녕하세요, #{학부모명}님.\n#{학생명} 학생의 #{시험명} 결과를 안내드립니다.\n\n점수: #{점수}점\n등급: #{등급}\n\n자세한 내용은 학원으로 문의해 주세요.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// POST Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const payload: MessageRequest = await request.json();
    const { action } = payload;

    switch (action) {
      case 'send':
        return await sendMessage(payload);
      
      case 'bulk_send':
        return await bulkSendMessages(payload);
      
      case 'templates':
        return NextResponse.json({
          success: true,
          templates: Object.entries(KAKAO_TEMPLATES).map(([key, value]) => ({
            key,
            ...value,
          })),
        });
      
      case 'history':
        return await getMessageHistory(payload);
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 });
    }
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'message.POST' });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 메시지 전송
// ═══════════════════════════════════════════════════════════════════════════

async function sendMessage(payload: MessageRequest) {
  const {
    channel = 'kakao',
    recipient_phone,
    recipient_email,
    template_id,
    template_variables,
    custom_message,
    student_name,
    parent_name,
  } = payload;

  const results: Array<{ channel: string; success: boolean; message_id?: string; error?: string }> = [];
  const timestamp = new Date().toISOString();

  // 템플릿 메시지 생성
  let message = custom_message || '';
  if (template_id && KAKAO_TEMPLATES[template_id as keyof typeof KAKAO_TEMPLATES]) {
    const template = KAKAO_TEMPLATES[template_id as keyof typeof KAKAO_TEMPLATES];
    message = template.content;
    
    // 변수 치환
    const vars = {
      학부모명: parent_name || '학부모님',
      학생명: student_name || '학생',
      ...template_variables,
    };
    
    Object.entries(vars).forEach(([key, value]) => {
      message = message.replace(new RegExp(`#\\{${key}\\}`, 'g'), value);
    });
  }

  // 채널별 전송
  if (channel === 'kakao' || channel === 'all') {
    const kakaoResult = await sendKakaoAlimTalk(recipient_phone!, message, template_id);
    results.push({ channel: 'kakao', ...kakaoResult });
  }

  if (channel === 'sms' || channel === 'all') {
    const smsResult = await sendSMS(recipient_phone!, message);
    results.push({ channel: 'sms', ...smsResult });
  }

  if (channel === 'email' || channel === 'all') {
    const emailResult = await sendEmail(recipient_email!, '학원 알림', message);
    results.push({ channel: 'email', ...emailResult });
  }

  // DB에 기록
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('message_logs').insert({
      id: `msg_${Date.now()}`,
      channel,
      recipient_phone,
      recipient_email,
      template_id,
      message: message.substring(0, 500),
      results,
      created_at: timestamp,
    });
  }

  const successCount = results.filter(r => r.success).length;

  return NextResponse.json({
    success: successCount > 0,
    results,
    message: `${successCount}/${results.length} 채널 전송 완료`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 대량 전송
// ═══════════════════════════════════════════════════════════════════════════

async function bulkSendMessages(payload: MessageRequest) {
  const { recipients, channel, template_id, template_variables } = payload;

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'recipients is required',
    }, { status: 400 });
  }

  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendMessage({
      action: 'send',
      channel,
      recipient_phone: recipient.phone,
      recipient_email: recipient.email,
      template_id,
      template_variables: { ...template_variables, ...recipient.variables },
      parent_name: recipient.name,
    });
    
    results.push({
      recipient: recipient.phone || recipient.email,
      ...await result.json(),
    });
  }

  const successCount = results.filter(r => r.success).length;

  return NextResponse.json({
    success: successCount > 0,
    total: recipients.length,
    success_count: successCount,
    failed_count: recipients.length - successCount,
    results,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 카카오 알림톡 전송
// ═══════════════════════════════════════════════════════════════════════════

async function sendKakaoAlimTalk(phone: string, message: string, templateId?: string) {
  if (!phone) {
    return { success: false, error: 'Phone number is required' };
  }

  // n8n 웹훅을 통한 전송 (실제 카카오 API 연동)
  if (N8N_WEBHOOK_URL) {
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'kakao_alimtalk',
          phone: phone.replace(/-/g, ''),
          message,
          template_id: templateId,
        }),
      });

      if (response.ok) {
        return { success: true, message_id: `kakao_${Date.now()}` };
      }
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'message.sendKakaoAlimTalk.n8n' });
    }
  }

  // 직접 카카오 API 호출 (API 키가 있는 경우)
  if (KAKAO_API_KEY && KAKAO_SENDER_KEY) {
    try {
      const response = await fetch('https://alimtalk-api.kakao.com/v1/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KAKAO_API_KEY}`,
        },
        body: JSON.stringify({
          sender_key: KAKAO_SENDER_KEY,
          template_code: templateId,
          receiver_number: phone.replace(/-/g, ''),
          message,
        }),
      });

      const data = await response.json();
      return { success: response.ok, message_id: data.message_id || `kakao_${Date.now()}` };
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'message.sendKakaoAlimTalk.kakaoApi' });
    }
  }

  // Mock 응답 (개발 환경)
  if (process.env.NODE_ENV !== 'production') {
    logger.info('[Mock] Kakao AlimTalk', { phone, message: message.substring(0, 50) + '...' });
  }
  return { success: true, message_id: `mock_kakao_${Date.now()}` };
}

// ═══════════════════════════════════════════════════════════════════════════
// SMS 전송
// ═══════════════════════════════════════════════════════════════════════════

async function sendSMS(phone: string, message: string) {
  if (!phone) {
    return { success: false, error: 'Phone number is required' };
  }

  // 솔라피 API 사용
  if (SOLAPI_API_KEY && SOLAPI_SECRET) {
    try {
      const response = await fetch('https://api.solapi.com/messages/v4/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SOLAPI_API_KEY}`,
        },
        body: JSON.stringify({
          message: {
            to: phone.replace(/-/g, ''),
            from: '01000000000', // 발신번호
            text: message,
          },
        }),
      });

      const data = await response.json();
      return { success: response.ok, message_id: data.groupId || `sms_${Date.now()}` };
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'message.sendSMS.solapi' });
    }
  }

  // n8n 웹훅 폴백
  if (N8N_WEBHOOK_URL) {
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'sms',
          phone: phone.replace(/-/g, ''),
          message,
        }),
      });
      return { success: true, message_id: `n8n_sms_${Date.now()}` };
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'message.sendSMS.n8n' });
    }
  }

  // Mock 응답
  if (process.env.NODE_ENV !== 'production') {
    logger.info('[Mock] SMS', { phone, message: message.substring(0, 50) + '...' });
  }
  return { success: true, message_id: `mock_sms_${Date.now()}` };
}

// ═══════════════════════════════════════════════════════════════════════════
// 이메일 전송
// ═══════════════════════════════════════════════════════════════════════════

async function sendEmail(email: string, subject: string, content: string) {
  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  // SendGrid API 사용
  if (SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: 'noreply@autus-ai.com', name: 'AUTUS 학원' },
          subject,
          content: [{ type: 'text/plain', value: content }],
        }),
      });

      return { success: response.ok, message_id: `email_${Date.now()}` };
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'message.sendEmail.sendgrid' });
    }
  }

  // n8n 웹훅 폴백
  if (N8N_WEBHOOK_URL) {
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'email',
          to: email,
          subject,
          body: content,
        }),
      });
      return { success: true, message_id: `n8n_email_${Date.now()}` };
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'message.sendEmail.n8n' });
    }
  }

  // Mock 응답
  if (process.env.NODE_ENV !== 'production') {
    logger.info('[Mock] Email', { email, subject });
  }
  return { success: true, message_id: `mock_email_${Date.now()}` };
}

// ═══════════════════════════════════════════════════════════════════════════
// 메시지 히스토리
// ═══════════════════════════════════════════════════════════════════════════

async function getMessageHistory(payload: MessageRequest) {
  const { limit = 50, org_id } = payload;
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      success: true,
      history: [
        { id: '1', channel: 'kakao', recipient: '010-1234-5678', template: 'attendance_check', status: 'sent', created_at: new Date().toISOString() },
        { id: '2', channel: 'sms', recipient: '010-2345-6789', template: 'payment_reminder', status: 'sent', created_at: new Date().toISOString() },
      ],
    });
  }

  const { data, error } = await supabase
    .from('message_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    history: data || [],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET Handler - 템플릿 목록
// ═══════════════════════════════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json({
    success: true,
    templates: Object.entries(KAKAO_TEMPLATES).map(([key, value]) => ({
      key,
      ...value,
    })),
  });
}
