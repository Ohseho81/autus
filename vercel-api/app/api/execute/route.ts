// ============================================
// AUTUS Execute API - 에이전트 실행 엔드포인트
// ============================================
// 
// "말한 대로 이루어지리라" - 실행형 에이전트
// 사용자 승인 → n8n 웹훅 → 외부 시스템 실행
//

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// n8n Webhook URL (환경변수로 설정)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

// 실행 가능한 액션 타입 정의
type ActionType = 
  | 'send_sms'           // 문자 발송 (알리고)
  | 'send_kakao'         // 카카오 알림톡
  | 'update_erp'         // ERP 업데이트 (학원나라)
  | 'issue_reward'       // 리워드 발급
  | 'generate_report'    // 보고서 생성
  | 'schedule_meeting'   // 상담 예약
  | 'sync_data';         // 데이터 동기화

interface ExecuteRequest {
  action_type: ActionType;
  payload: {
    target?: string;      // 대상 (전화번호, 이메일 등)
    message?: string;     // 메시지 내용
    template_id?: string; // 템플릿 ID
    organism_id?: string; // 관련 유기체 ID
    metadata?: Record<string, any>;
  };
  requires_approval?: boolean;
  approved_by?: string;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET: 실행 가능한 액션 목록 조회
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      available_actions: [
        { type: 'send_sms', name: '문자 발송', provider: 'aligo', status: 'ready' },
        { type: 'send_kakao', name: '카카오 알림톡', provider: 'bizm', status: 'ready' },
        { type: 'update_erp', name: 'ERP 업데이트', provider: 'hagnara', status: 'pending' },
        { type: 'issue_reward', name: '리워드 발급', provider: 'autus', status: 'ready' },
        { type: 'generate_report', name: '보고서 생성', provider: 'autus', status: 'ready' },
        { type: 'schedule_meeting', name: '상담 예약', provider: 'autus', status: 'pending' },
        { type: 'sync_data', name: '데이터 동기화', provider: 'autus', status: 'ready' },
      ],
      n8n_status: N8N_WEBHOOK_URL ? 'configured' : 'not_configured'
    }
  }, { status: 200, headers: corsHeaders });
}

// POST: 액션 실행
export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json();
    const { action_type, payload, requires_approval, approved_by } = body;

    // Validation
    if (!action_type || !payload) {
      return NextResponse.json(
        { success: false, error: 'action_type and payload are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 승인 필요한 액션인데 승인자가 없는 경우
    if (requires_approval && !approved_by) {
      return NextResponse.json({
        success: false,
        error: 'This action requires approval',
        requires_approval: true,
        action_type,
        payload
      }, { status: 403, headers: corsHeaders });
    }

    // 실행 로그 생성
    const executionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // n8n이 설정되어 있으면 실제 실행
    if (N8N_WEBHOOK_URL) {
      try {
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-AUTUS-Execution-ID': executionId
          },
          body: JSON.stringify({
            origin: 'AUTUS_BRAIN',
            execution_id: executionId,
            action: action_type,
            data: payload,
            approved_by,
            timestamp
          })
        });

        const n8nResult = await n8nResponse.json();

        return NextResponse.json({
          success: true,
          data: {
            execution_id: executionId,
            action_type,
            status: 'executed',
            n8n_response: n8nResult,
            timestamp
          }
        }, { status: 200, headers: corsHeaders });

      } catch (n8nError: any) {
        return NextResponse.json({
          success: false,
          error: 'n8n execution failed',
          details: n8nError.message,
          execution_id: executionId
        }, { status: 500, headers: corsHeaders });
      }
    }

    // n8n 미설정 시 시뮬레이션 모드
    const simulatedResult = simulateAction(action_type, payload);

    return NextResponse.json({
      success: true,
      data: {
        execution_id: executionId,
        action_type,
        status: 'simulated',
        mode: 'demo',
        simulated_result: simulatedResult,
        message: 'n8n not configured - running in simulation mode',
        timestamp
      }
    }, { status: 200, headers: corsHeaders });

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Execute API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 시뮬레이션 함수
function simulateAction(actionType: ActionType, payload: any) {
  const simulations: Record<ActionType, any> = {
    send_sms: {
      status: 'sent',
      recipient: payload.target || '010-****-****',
      message_preview: (payload.message || '').substring(0, 20) + '...',
      estimated_cost: 15,
      delivery_time: '1-3초'
    },
    send_kakao: {
      status: 'sent',
      recipient: payload.target,
      template: payload.template_id || 'default',
      estimated_cost: 8
    },
    update_erp: {
      status: 'updated',
      target_system: 'hagnara',
      records_affected: 1
    },
    issue_reward: {
      status: 'issued',
      reward_type: 'badge',
      recipient: payload.target
    },
    generate_report: {
      status: 'generated',
      report_type: payload.metadata?.type || 'weekly',
      pages: 3
    },
    schedule_meeting: {
      status: 'scheduled',
      datetime: payload.metadata?.datetime,
      participants: 2
    },
    sync_data: {
      status: 'synced',
      records: 150,
      source: 'hagnara',
      destination: 'supabase'
    }
  };

  return simulations[actionType] || { status: 'unknown_action' };
}
