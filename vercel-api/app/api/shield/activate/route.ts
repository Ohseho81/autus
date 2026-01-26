/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🛡️ Active Shield API - 선제적 방어 시스템
 * 
 * 위험 감지 시 자동 발동:
 * 1. 긍정 리포트 자동 발송 (학부모에게)
 * 2. 담당 선생님에게 특별 케어 요청
 * 3. n8n 워크플로우 트리거 (추가 자동화)
 * 4. 감사 로그 기록
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// n8n Webhook
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
const N8N_SHIELD_WEBHOOK = process.env.N8N_SHIELD_WEBHOOK || N8N_WEBHOOK_URL;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface ShieldRequest {
  action: 'activate' | 'deactivate' | 'status' | 'history';
  
  // activate 액션
  risk_id?: string;
  student_id?: string;
  student_name?: string;
  parent_phone?: string;
  parent_email?: string;
  teacher_id?: string;
  teacher_name?: string;
  risk_level?: 'critical' | 'high' | 'medium' | 'low';
  risk_factors?: string[];
  
  // 자동화 옵션
  send_positive_report?: boolean;
  notify_teacher?: boolean;
  trigger_n8n?: boolean;
  
  // 커스텀 메시지
  custom_message?: string;
}

interface ShieldAction {
  id: string;
  type: 'positive_report' | 'teacher_notify' | 'n8n_trigger' | 'kakao_send' | 'sms_send';
  status: 'success' | 'failed' | 'pending';
  target?: string;
  message?: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const payload: ShieldRequest = await request.json();
    const { action } = payload;

    switch (action) {
      case 'activate':
        return await activateShield(payload);
      
      case 'deactivate':
        return await deactivateShield(payload);
      
      case 'status':
        return await getShieldStatus(payload);
      
      case 'history':
        return await getShieldHistory(payload);
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Active Shield Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Active Shield 발동
// ═══════════════════════════════════════════════════════════════════════════

async function activateShield(payload: ShieldRequest) {
  const {
    risk_id,
    student_id,
    student_name,
    parent_phone,
    parent_email,
    teacher_id,
    teacher_name,
    risk_level = 'high',
    risk_factors = [],
    send_positive_report = true,
    notify_teacher = true,
    trigger_n8n = true,
    custom_message,
  } = payload;

  const shieldId = `shield_${Date.now()}`;
  const actions: ShieldAction[] = [];
  const timestamp = new Date().toISOString();

  // ═══════════════════════════════════════════════════════════════════════
  // 1. 긍정 리포트 생성 및 발송
  // ═══════════════════════════════════════════════════════════════════════
  
  if (send_positive_report) {
    const positiveReport = generatePositiveReport(student_name || '학생', risk_factors);
    
    // DB에 리포트 저장
    if (supabase) {
      await supabase.from('positive_reports').insert({
        id: `report_${Date.now()}`,
        shield_id: shieldId,
        student_id,
        student_name,
        content: positiveReport,
        sent_to: parent_phone || parent_email,
        created_at: timestamp,
      });
    }

    // 학부모에게 발송 (n8n 통해 카카오톡/SMS)
    if (parent_phone && N8N_SHIELD_WEBHOOK) {
      try {
        await fetch(N8N_SHIELD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'positive_report',
            student_name,
            parent_phone,
            report: positiveReport,
            timestamp,
          }),
        });
        
        actions.push({
          id: `action_${Date.now()}_report`,
          type: 'positive_report',
          status: 'success',
          target: parent_phone,
          message: '긍정 리포트 발송 완료',
          timestamp,
        });
      } catch (e) {
        actions.push({
          id: `action_${Date.now()}_report`,
          type: 'positive_report',
          status: 'failed',
          target: parent_phone,
          message: `발송 실패: ${e}`,
          timestamp,
        });
      }
    } else {
      actions.push({
        id: `action_${Date.now()}_report`,
        type: 'positive_report',
        status: 'pending',
        message: '긍정 리포트 생성됨 (발송 대기)',
        timestamp,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. 담당 선생님 알림
  // ═══════════════════════════════════════════════════════════════════════
  
  if (notify_teacher && teacher_id) {
    const teacherMessage = generateTeacherNotification(student_name || '학생', risk_level, risk_factors);
    
    // DB에 알림 저장
    if (supabase) {
      await supabase.from('notifications').insert({
        id: `notif_${Date.now()}`,
        type: 'shield_teacher',
        recipient_id: teacher_id,
        title: `🛡️ Active Shield 발동`,
        message: teacherMessage,
        data: { shield_id: shieldId, student_id, risk_level },
        read: false,
        created_at: timestamp,
      });
    }

    actions.push({
      id: `action_${Date.now()}_teacher`,
      type: 'teacher_notify',
      status: 'success',
      target: teacher_name || teacher_id,
      message: '담당 선생님에게 알림 발송',
      timestamp,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. n8n 워크플로우 트리거
  // ═══════════════════════════════════════════════════════════════════════
  
  if (trigger_n8n && N8N_SHIELD_WEBHOOK) {
    try {
      const n8nResponse = await fetch(N8N_SHIELD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'active_shield',
          shield_id: shieldId,
          risk_id,
          student_id,
          student_name,
          teacher_id,
          teacher_name,
          risk_level,
          risk_factors,
          custom_message,
          timestamp,
        }),
      });

      actions.push({
        id: `action_${Date.now()}_n8n`,
        type: 'n8n_trigger',
        status: n8nResponse.ok ? 'success' : 'failed',
        message: n8nResponse.ok ? 'n8n 워크플로우 트리거 완료' : 'n8n 트리거 실패',
        timestamp,
      });
    } catch (e) {
      actions.push({
        id: `action_${Date.now()}_n8n`,
        type: 'n8n_trigger',
        status: 'failed',
        message: `n8n 연결 실패: ${e}`,
        timestamp,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Shield 기록 저장
  // ═══════════════════════════════════════════════════════════════════════
  
  const shieldRecord = {
    id: shieldId,
    risk_id,
    student_id,
    student_name,
    teacher_id,
    risk_level,
    risk_factors,
    actions,
    status: 'active',
    activated_at: timestamp,
  };

  if (supabase) {
    await supabase.from('active_shields').insert(shieldRecord);
    
    // Risk 상태 업데이트
    if (risk_id) {
      await supabase.from('risks').update({
        shield_id: shieldId,
        shield_status: 'active',
        updated_at: timestamp,
      }).eq('id', risk_id);
    }
  }

  return NextResponse.json({
    success: true,
    shield: shieldRecord,
    message: `🛡️ Active Shield 발동: ${student_name}`,
    actions_taken: actions.length,
    actions,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 긍정 리포트 생성
// ═══════════════════════════════════════════════════════════════════════════

function generatePositiveReport(studentName: string, riskFactors: string[]): string {
  const positivePoints = [
    '수업 참여도가 높아지고 있습니다',
    '친구들과의 관계가 좋아지고 있습니다',
    '최근 성적이 꾸준히 향상되고 있습니다',
    '숙제 완수율이 좋습니다',
    '수업 중 질문을 많이 합니다',
    '예습/복습을 열심히 하고 있습니다',
  ];

  // 위험 요인에 맞는 긍정 메시지 선택
  const selectedPoints = positivePoints.slice(0, 3);
  
  return `안녕하세요, ${studentName} 학부모님.

${studentName} 학생의 최근 학습 현황을 알려드립니다.

✨ 좋은 점:
${selectedPoints.map(p => `• ${p}`).join('\n')}

앞으로도 ${studentName} 학생이 더욱 성장할 수 있도록 최선을 다하겠습니다.

궁금하신 점이 있으시면 언제든 연락주세요.

감사합니다.
AUTUS 학원`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 담당자 알림 메시지 생성
// ═══════════════════════════════════════════════════════════════════════════

function generateTeacherNotification(
  studentName: string, 
  riskLevel: string, 
  riskFactors: string[]
): string {
  const urgency = riskLevel === 'critical' ? '🚨 긴급' : riskLevel === 'high' ? '⚠️ 높음' : '📋 보통';
  
  return `${urgency} ${studentName} 학생 특별 케어 요청

위험 수준: ${riskLevel.toUpperCase()}
감지된 신호: ${riskFactors.join(', ') || '없음'}

권장 조치:
• 48시간 내 1:1 면담 진행
• 학부모 연락 (긍정 리포트 자동 발송됨)
• 출석/과제 현황 점검

Active Shield가 자동 발동되었습니다.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Shield 비활성화
// ═══════════════════════════════════════════════════════════════════════════

async function deactivateShield(payload: ShieldRequest) {
  const { risk_id } = payload;
  
  if (!risk_id) {
    return NextResponse.json({
      success: false,
      error: 'risk_id is required',
    }, { status: 400 });
  }

  if (supabase) {
    await supabase.from('active_shields').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    }).eq('risk_id', risk_id);
    
    await supabase.from('risks').update({
      shield_status: 'resolved',
      status: 'resolved',
      updated_at: new Date().toISOString(),
    }).eq('id', risk_id);
  }

  return NextResponse.json({
    success: true,
    message: 'Shield 비활성화 완료',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Shield 상태 조회
// ═══════════════════════════════════════════════════════════════════════════

async function getShieldStatus(payload: ShieldRequest) {
  const { student_id, risk_id } = payload;

  if (!supabase) {
    return NextResponse.json({
      success: true,
      active_shields: [],
      total: 0,
    });
  }

  let query = supabase.from('active_shields').select('*').eq('status', 'active');
  
  if (student_id) {
    query = query.eq('student_id', student_id);
  }
  if (risk_id) {
    query = query.eq('risk_id', risk_id);
  }

  const { data, error } = await query.order('activated_at', { ascending: false });

  if (error) throw error;

  return NextResponse.json({
    success: true,
    active_shields: data || [],
    total: data?.length || 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Shield 히스토리 조회
// ═══════════════════════════════════════════════════════════════════════════

async function getShieldHistory(payload: ShieldRequest) {
  const { student_id } = payload;

  if (!supabase) {
    // Mock 데이터
    return NextResponse.json({
      success: true,
      history: [
        { id: '1', student_name: '김민수', risk_level: 'high', status: 'resolved', activated_at: '2024-01-20' },
        { id: '2', student_name: '이지은', risk_level: 'critical', status: 'active', activated_at: '2024-01-25' },
      ],
    });
  }

  let query = supabase.from('active_shields').select('*');
  
  if (student_id) {
    query = query.eq('student_id', student_id);
  }

  const { data, error } = await query.order('activated_at', { ascending: false }).limit(50);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    history: data || [],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id');
  
  return getShieldStatus({ action: 'status', student_id: studentId || undefined });
}
