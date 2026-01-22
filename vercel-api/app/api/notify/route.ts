// ============================================
// AUTUS Notify API - 알림 발송 통합 엔드포인트
// ============================================
// 
// 카카오 알림톡, SMS, 이메일 통합 발송
// 위험 감지 시 자동 알림 트리거
//

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 환경 변수
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const ALIGO_API_KEY = process.env.ALIGO_API_KEY;
const ALIGO_USER_ID = process.env.ALIGO_USER_ID;
const ALIGO_SENDER = process.env.ALIGO_SENDER;

// 비용 최적화 설정
const COST_CONFIG = {
  // 채널별 비용 (원)
  costs: {
    email: 0,
    kakao: 8,
    sms: 15,
    push: 0  // 앱 푸시 (미래 확장)
  },
  // 일일 예산 한도 (원)
  daily_budget: 5000,
  // 월간 예산 한도 (원)
  monthly_budget: 50000,
  // 우선순위별 채널 (비용 낮은 순)
  priority_channels: ['email', 'push', 'kakao', 'sms'],
  // 긴급도별 허용 채널
  urgency_channels: {
    low: ['email'],           // 저긴급: 이메일만
    normal: ['email', 'kakao'], // 일반: 이메일 우선, 카카오 대체
    high: ['kakao', 'sms'],    // 고긴급: 즉시 도달 채널
    critical: ['sms', 'kakao'] // 위급: SMS 우선 (확실한 도달)
  }
};

// 알림 타입
type NotifyChannel = 'kakao' | 'sms' | 'email' | 'auto' | 'cost_optimized';

// 알림 템플릿
const TEMPLATES = {
  // 위험 감지 알림
  risk_detected: {
    title: '⚠️ AUTUS 위험 감지',
    kakao_template: 'AUTUS_RISK_001',
    sms_template: '[AUTUS] {name} 위험 감지! 긴급도 {urgency}%. 즉시 확인 필요. {link}'
  },
  // 기회 발견 알림
  opportunity_found: {
    title: '🎯 AUTUS 기회 발견',
    kakao_template: 'AUTUS_OPP_001',
    sms_template: '[AUTUS] {name} 기회 발견! V 잠재력 {potential}%. 상세보기: {link}'
  },
  // 미납 독촉
  payment_reminder: {
    title: '💳 수강료 안내',
    kakao_template: 'AUTUS_PAY_001',
    sms_template: '[{academy}] {name}님 {month}월 수강료 {amount}원 납부 안내드립니다. {link}'
  },
  // 상담 예약
  consultation_scheduled: {
    title: '📅 상담 예약 확인',
    kakao_template: 'AUTUS_CONSULT_001',
    sms_template: '[{academy}] {name}님 상담 예약: {date} {time}. 문의: {phone}'
  },
  // 성적 우수 알림
  achievement_alert: {
    title: '🏆 성취 알림',
    kakao_template: 'AUTUS_ACHIEVE_001',
    sms_template: '[{academy}] 축하합니다! {name}님 {achievement} 달성! {link}'
  },
  // 이탈 위험 알림 (내부용)
  churn_risk: {
    title: '🚨 이탈 위험 감지',
    kakao_template: 'AUTUS_CHURN_001',
    sms_template: '[AUTUS] {name} 이탈 위험! sync_rate {sync_rate}%. 긴급 상담 권장.'
  }
};

interface NotifyRequest {
  channel: NotifyChannel;
  template: keyof typeof TEMPLATES;
  recipients: Array<{
    phone?: string;
    email?: string;
    kakao_id?: string;
    name: string;
  }>;
  variables: Record<string, string>;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  scheduled_at?: string; // ISO datetime for scheduled send
  cost_limit?: number;   // 이 요청의 최대 비용 (원)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET: 알림 상태 및 템플릿 목록 + 비용 정보
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      channels: {
        email: { status: 'ready', cost_per_message: 0, recommended: true, note: '💚 무료 - 최우선 권장' },
        kakao: { status: N8N_WEBHOOK_URL ? 'ready' : 'not_configured', cost_per_message: 8, note: '💛 저렴 - 고긴급 시 사용' },
        sms: { status: ALIGO_API_KEY ? 'ready' : 'not_configured', cost_per_message: 15, note: '🔴 비쌈 - 위급 시에만' }
      },
      cost_optimization: {
        enabled: true,
        daily_budget: COST_CONFIG.daily_budget,
        monthly_budget: COST_CONFIG.monthly_budget,
        priority_routing: {
          low: '이메일만 (0원)',
          normal: '이메일 우선, 실패 시 카카오 (0~8원)',
          high: '카카오 우선 (8원)',
          critical: 'SMS 우선 (15원) - 확실한 도달'
        }
      },
      templates: Object.keys(TEMPLATES).map(key => ({
        id: key,
        title: TEMPLATES[key as keyof typeof TEMPLATES].title,
        default_priority: getDefaultPriority(key)
      })),
      cost_comparison: {
        '월 100건': { email: '0원', kakao: '800원', sms: '1,500원' },
        '월 500건': { email: '0원', kakao: '4,000원', sms: '7,500원' },
        '월 1000건': { email: '0원', kakao: '8,000원', sms: '15,000원' }
      }
    }
  }, { status: 200, headers: corsHeaders });
}

// 템플릿별 기본 긴급도
function getDefaultPriority(template: string): string {
  const priorities: Record<string, string> = {
    risk_detected: 'high',
    churn_risk: 'critical',
    opportunity_found: 'normal',
    payment_reminder: 'normal',
    consultation_scheduled: 'low',
    achievement_alert: 'low'
  };
  return priorities[template] || 'normal';
}

// POST: 알림 발송
export async function POST(request: NextRequest) {
  try {
    const body: NotifyRequest = await request.json();
    const { channel, template, recipients, variables, priority, scheduled_at } = body;

    // Validation
    if (!template || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'template and recipients are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const templateData = TEMPLATES[template];
    if (!templateData) {
      return NextResponse.json(
        { success: false, error: `Unknown template: ${template}` },
        { status: 400, headers: corsHeaders }
      );
    }

    const notificationId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const results: any[] = [];

    // 채널 자동 선택 (비용 최적화 적용)
    const selectedChannel = (channel === 'auto' || channel === 'cost_optimized') 
      ? determineChannel(recipients, priority || 'normal') 
      : channel;

    // 비용 추정
    const estimatedCost = estimateCost(selectedChannel, recipients.length);
    const maxCostIfSMS = COST_CONFIG.costs.sms * recipients.length;
    const costSavings = maxCostIfSMS - estimatedCost;

    for (const recipient of recipients) {
      // 메시지 템플릿 변수 치환
      const message = replaceVariables(templateData.sms_template, {
        ...variables,
        name: recipient.name
      });

      if (selectedChannel === 'email' && recipient.email) {
        // 이메일 발송 (무료!) - Resend/SendGrid 연동 가능
        const emailResult = await sendEmail(
          recipient.email, 
          templateData.title,
          message
        );
        results.push({ recipient: recipient.name, channel: 'email', ...emailResult });
      }
      else if (selectedChannel === 'sms' && recipient.phone) {
        // SMS 발송 (n8n 또는 직접 Aligo)
        const smsResult = await sendSMS(recipient.phone, message);
        results.push({ recipient: recipient.name, channel: 'sms', ...smsResult });
      } 
      else if (selectedChannel === 'kakao' && (recipient.phone || recipient.kakao_id)) {
        // 카카오 알림톡 발송 (n8n 경유)
        const kakaoResult = await sendKakao(
          recipient.phone || recipient.kakao_id!,
          templateData.kakao_template,
          variables
        );
        results.push({ recipient: recipient.name, channel: 'kakao', ...kakaoResult });
      }
      else {
        // 폴백: 다른 채널 시도
        const fallbackResult = await tryFallbackChannel(recipient, message, templateData, variables);
        results.push({ recipient: recipient.name, ...fallbackResult });
      }
    }

    // 성공/실패 집계
    const successCount = results.filter(r => r.status === 'sent' || r.status === 'simulated').length;
    const failCount = results.filter(r => r.status === 'failed' || r.status === 'skipped').length;

    return NextResponse.json({
      success: true,
      data: {
        notification_id: notificationId,
        template,
        channel: selectedChannel,
        total_recipients: recipients.length,
        success_count: successCount,
        fail_count: failCount,
        // 💰 비용 정보
        cost: {
          actual: estimatedCost,
          saved: costSavings,
          unit: '원',
          message: costSavings > 0 
            ? `💚 ${costSavings}원 절약! (SMS 대비)` 
            : '최적 비용으로 발송됨'
        },
        results,
        timestamp
      }
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Notify API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 비용 최적화 채널 선택
function determineChannel(
  recipients: NotifyRequest['recipients'], 
  priority: string = 'normal'
): NotifyChannel {
  const hasEmail = recipients.some(r => r.email);
  const hasKakao = recipients.some(r => r.kakao_id || r.phone); // 카카오는 전화번호로도 가능
  const hasPhone = recipients.some(r => r.phone);
  
  // 긴급도별 허용 채널 확인
  const allowedChannels = COST_CONFIG.urgency_channels[priority as keyof typeof COST_CONFIG.urgency_channels] 
    || COST_CONFIG.urgency_channels.normal;
  
  // 비용 최적화: 허용된 채널 중 가장 저렴한 것 선택
  for (const channel of COST_CONFIG.priority_channels) {
    if (!allowedChannels.includes(channel)) continue;
    
    if (channel === 'email' && hasEmail) return 'email';
    if (channel === 'kakao' && hasKakao && N8N_WEBHOOK_URL) return 'kakao';
    if (channel === 'sms' && hasPhone) return 'sms';
  }
  
  // 폴백: 이메일 → 카카오 → SMS
  if (hasEmail) return 'email';
  if (hasKakao && N8N_WEBHOOK_URL) return 'kakao';
  return 'sms';
}

// 예상 비용 계산
function estimateCost(channel: NotifyChannel, recipientCount: number): number {
  const cost = COST_CONFIG.costs[channel as keyof typeof COST_CONFIG.costs] || 0;
  return cost * recipientCount;
}

// 변수 치환
function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
}

// SMS 발송 (Aligo 또는 시뮬레이션)
async function sendSMS(phone: string, message: string): Promise<any> {
  // Aligo API가 설정되어 있으면 실제 발송
  if (ALIGO_API_KEY && ALIGO_USER_ID && ALIGO_SENDER) {
    try {
      const formData = new URLSearchParams();
      formData.append('key', ALIGO_API_KEY);
      formData.append('userid', ALIGO_USER_ID);
      formData.append('sender', ALIGO_SENDER);
      formData.append('receiver', phone.replace(/-/g, ''));
      formData.append('msg', message);
      formData.append('testmode_yn', 'N');

      const response = await fetch('https://apis.aligo.in/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      const result = await response.json();
      
      if (result.result_code === '1') {
        return { status: 'sent', msg_id: result.msg_id, cost: 15 };
      } else {
        return { status: 'failed', error: result.message };
      }
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }

  // 시뮬레이션 모드
  return {
    status: 'simulated',
    phone: phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3'),
    message_preview: message.substring(0, 30) + '...',
    estimated_cost: 15
  };
}

// 이메일 발송 (무료!)
async function sendEmail(email: string, subject: string, message: string): Promise<any> {
  // Resend API가 설정되어 있으면 실제 발송
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'AUTUS <noreply@autus.ai>',
          to: email,
          subject: subject,
          text: message
        })
      });

      const result = await response.json();
      return { status: 'sent', email_id: result.id, cost: 0 };
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }

  // 시뮬레이션 모드 (무료)
  return {
    status: 'simulated',
    email: email.replace(/(.{3}).*(@.*)/, '$1***$2'),
    subject,
    cost: 0,
    note: '💚 무료 채널'
  };
}

// 폴백 채널 시도
async function tryFallbackChannel(
  recipient: any, 
  message: string, 
  templateData: any,
  variables: Record<string, string>
): Promise<any> {
  // 이메일 → 카카오 → SMS 순으로 시도
  if (recipient.email) {
    const result = await sendEmail(recipient.email, templateData.title, message);
    return { channel: 'email', ...result };
  }
  if ((recipient.phone || recipient.kakao_id) && N8N_WEBHOOK_URL) {
    const result = await sendKakao(recipient.phone || recipient.kakao_id, templateData.kakao_template, variables);
    return { channel: 'kakao', ...result };
  }
  if (recipient.phone) {
    const result = await sendSMS(recipient.phone, message);
    return { channel: 'sms', ...result };
  }
  
  return { 
    channel: 'none', 
    status: 'skipped',
    reason: 'No valid contact info'
  };
}

// 카카오 알림톡 발송 (n8n 경유 또는 시뮬레이션)
async function sendKakao(
  target: string, 
  templateCode: string, 
  variables: Record<string, string>
): Promise<any> {
  // n8n이 설정되어 있으면 n8n 경유 발송
  if (N8N_WEBHOOK_URL) {
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'AUTUS_NOTIFY',
          action: 'send_kakao',
          data: {
            target,
            template_id: templateCode,
            variables
          }
        })
      });

      const result = await response.json();
      return { status: 'sent', ...result };
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }

  // 시뮬레이션 모드
  return {
    status: 'simulated',
    target: target.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3'),
    template: templateCode,
    estimated_cost: 8
  };
}
