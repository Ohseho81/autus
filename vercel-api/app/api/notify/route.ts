/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔔 Notification API - 실시간 알림 시스템
 * 
 * 기능:
 * - 위험 학생 알림
 * - 결제/출석 알림
 * - 카카오톡/SMS 알림 (n8n 연동)
 * - 브라우저 푸시 알림
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { captureError } from '../../../lib/monitoring';
import { logger } from '../../../lib/logger';

// Supabase Admin Client (lazy via shared singleton)
function getSupabase() {
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

// n8n Webhook URL
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

// ═══════════════════════════════════════════════════════════════════════════
// 알림 타입
// ═══════════════════════════════════════════════════════════════════════════

interface NotificationPayload {
  action: 'send' | 'broadcast' | 'risk_alert' | 'payment' | 'attendance' | 'list';
  
  // send 액션
  type?: 'push' | 'kakao' | 'sms' | 'email' | 'slack';
  recipient_id?: string;
  recipient_phone?: string;
  recipient_email?: string;
  title?: string;
  message?: string;
  data?: Record<string, any>;
  
  // risk_alert 액션
  student_id?: string;
  student_name?: string;
  state?: number;
  signals?: string[];
  
  // broadcast 액션
  role?: string; // c_level, fsd, optimus
  
  // list 액션
  org_id?: string;
  limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const payload: NotificationPayload = await request.json();
    const { action } = payload;

    switch (action) {
      case 'send':
        return await sendNotification(payload);
      
      case 'broadcast':
        return await broadcastNotification(payload);
      
      case 'risk_alert':
        return await sendRiskAlert(payload);
      
      case 'payment':
        return await sendPaymentNotification(payload);
      
      case 'attendance':
        return await sendAttendanceNotification(payload);
      
      case 'list':
        return await listNotifications(payload);
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 });
    }
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'notify.POST' });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 알림 전송
// ═══════════════════════════════════════════════════════════════════════════

async function sendNotification(payload: NotificationPayload) {
  const { type, recipient_id, title, message, data } = payload;
  const supabase = getSupabase();

  // DB에 알림 저장
  const notification = {
    id: `notif_${Date.now()}`,
    type: type || 'push',
    recipient_id,
    title,
    message,
    data,
    read: false,
    created_at: new Date().toISOString(),
  };
  
  if (supabase) {
    await supabase.from('notifications').insert(notification);
  }
  
  // 채널별 처리
  switch (type) {
    case 'kakao':
      await sendKakaoAlimTalk(payload);
      break;
    
    case 'sms':
      await sendSMS(payload);
      break;
    
    case 'slack':
      await sendSlackMessage(payload);
      break;
    
    case 'email':
      await sendEmail(payload);
      break;
    
    default:
      // push - Supabase Realtime으로 자동 전달됨
      break;
  }
  
  return NextResponse.json({
    success: true,
    notification,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 위험 알림 (Risk Alert)
// ═══════════════════════════════════════════════════════════════════════════

async function sendRiskAlert(payload: NotificationPayload) {
  const { student_id, student_name, state, signals } = payload;
  const supabase = getSupabase();

  const alert = {
    id: `risk_${Date.now()}`,
    student_id,
    student_name,
    state,
    signals,
    priority: state && state >= 5 ? 'critical' : 'high',
    status: 'open',
    created_at: new Date().toISOString(),
  };
  
  // DB에 위험 알림 저장
  if (supabase) {
    await supabase.from('risks').insert(alert);

    // 관련 담당자에게 알림 전송
    await supabase.from('notifications').insert({
      id: `notif_${Date.now()}`,
      type: 'risk_alert',
      title: `🚨 위험 학생 알림`,
      message: `${student_name} 학생이 State ${state}로 변경되었습니다.`,
      data: alert,
      read: false,
      created_at: new Date().toISOString(),
    });
  }
  
  // n8n 웹훅 트리거 (Active Shield 연동)
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'risk_alert',
        ...alert,
      }),
    });
  } catch (e) {
    logger.warn('n8n webhook failed:', e);
  }
  
  return NextResponse.json({
    success: true,
    alert,
    message: `위험 알림이 발송되었습니다: ${student_name}`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 결제 알림
// ═══════════════════════════════════════════════════════════════════════════

async function sendPaymentNotification(payload: NotificationPayload) {
  const { data } = payload;
  const supabase = getSupabase();

  const notification = {
    id: `notif_${Date.now()}`,
    type: 'payment',
    title: data?.status === 'overdue' ? '⚠️ 미납 알림' : '💳 결제 완료',
    message: data?.message || '결제 관련 알림입니다.',
    data,
    read: false,
    created_at: new Date().toISOString(),
  };
  
  if (supabase) {
    await supabase.from('notifications').insert(notification);
  }
  
  return NextResponse.json({
    success: true,
    notification,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 출석 알림
// ═══════════════════════════════════════════════════════════════════════════

async function sendAttendanceNotification(payload: NotificationPayload) {
  const { student_name, data } = payload;
  const supabase = getSupabase();

  const notification = {
    id: `notif_${Date.now()}`,
    type: 'attendance',
    title: data?.status === 'absent' ? '❌ 결석 알림' : '✅ 출석 확인',
    message: `${student_name} 학생이 ${data?.status === 'absent' ? '결석' : '출석'}하였습니다.`,
    data,
    read: false,
    created_at: new Date().toISOString(),
  };
  
  if (supabase) {
    await supabase.from('notifications').insert(notification);
  }
  
  return NextResponse.json({
    success: true,
    notification,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 브로드캐스트 (역할 전체에게)
// ═══════════════════════════════════════════════════════════════════════════

async function broadcastNotification(payload: NotificationPayload) {
  const { role, title, message, data } = payload;
  const supabase = getSupabase();

  const notification = {
    id: `broadcast_${Date.now()}`,
    type: 'broadcast',
    target_role: role || 'all',
    title,
    message,
    data,
    read: false,
    created_at: new Date().toISOString(),
  };
  
  if (supabase) {
    await supabase.from('notifications').insert(notification);
  }
  
  return NextResponse.json({
    success: true,
    notification,
    message: `브로드캐스트 발송됨: ${role || 'all'}`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 알림 목록 조회
// ═══════════════════════════════════════════════════════════════════════════

async function listNotifications(payload: NotificationPayload) {
  const { org_id, limit = 50 } = payload;
  const supabase = getSupabase();

  if (!supabase) {
    // Mock 데이터
    return NextResponse.json({
      success: true,
      notifications: [
        { id: '1', type: 'risk_alert', title: '🚨 위험 학생', message: '김민수 학생 State 5', read: false, created_at: new Date().toISOString() },
        { id: '2', type: 'payment', title: '💳 결제 완료', message: '이지은 학부모 결제', read: true, created_at: new Date().toISOString() },
        { id: '3', type: 'attendance', title: '✅ 출석', message: '박서연 학생 출석', read: true, created_at: new Date().toISOString() },
      ],
      unread_count: 1,
    });
  }
  
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  
  return NextResponse.json({
    success: true,
    notifications: notifications || [],
    unread_count: unreadCount,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 외부 서비스 연동
// ═══════════════════════════════════════════════════════════════════════════

async function sendKakaoAlimTalk(payload: NotificationPayload) {
  // n8n을 통한 카카오 알림톡 전송
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'kakao_alimtalk',
        phone: payload.recipient_phone,
        template: 'risk_alert',
        variables: {
          student_name: payload.student_name,
          message: payload.message,
        },
      }),
    });
    return { success: true };
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'notify.sendKakaoAlimTalk' });
    return { success: false, error };
  }
}

async function sendSMS(payload: NotificationPayload) {
  // n8n을 통한 SMS 전송
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'sms',
        phone: payload.recipient_phone,
        message: `[AUTUS] ${payload.title}: ${payload.message}`,
      }),
    });
    return { success: true };
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'notify.sendSMS' });
    return { success: false, error };
  }
}

async function sendSlackMessage(payload: NotificationPayload) {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) return { success: false, error: 'Slack not configured' };
  
  try {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `*${payload.title}*\n${payload.message}`,
        channel: '#autus-alerts',
      }),
    });
    return { success: true };
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'notify.sendSlackMessage' });
    return { success: false, error };
  }
}

async function sendEmail(payload: NotificationPayload) {
  // n8n을 통한 이메일 전송
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'email',
        to: payload.recipient_email,
        subject: payload.title,
        body: payload.message,
      }),
    });
    return { success: true };
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'notify.sendEmail' });
    return { success: false, error };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET Handler - 알림 조회
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const unreadOnly = searchParams.get('unread') === 'true';
  
  return listNotifications({ action: 'list', limit });
}
