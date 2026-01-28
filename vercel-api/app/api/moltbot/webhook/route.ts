// ═══════════════════════════════════════════════════════════════════════════════
// 🦞 AUTUS × Moltbot Webhook Receiver
// Moltbot에서 AUTUS로 이벤트/액션 전달
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface MoltbotWebhookPayload {
  event: 'message_received' | 'action_completed' | 'approval_request' | 'error';
  agentId: string;
  timestamp: string;
  data: {
    conversationId?: string;
    userId?: string;
    message?: string;
    actionType?: string;
    actionResult?: Record<string, any>;
    error?: string;
    metadata?: Record<string, any>;
  };
  signature?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Webhook Handler
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const payload: MoltbotWebhookPayload = await request.json();
    const { event, agentId, timestamp, data } = payload;

    // 시그니처 검증 (프로덕션에서 활성화)
    // const signature = request.headers.get('x-moltbot-signature');
    // if (!verifySignature(payload, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    console.log(`[Moltbot Webhook] Event: ${event}, Agent: ${agentId}`);

    const supabase = getSupabaseAdmin();

    switch (event) {
      // ───────────────────────────────────────────────────────
      // 메시지 수신
      // ───────────────────────────────────────────────────────
      case 'message_received': {
        // 대화 로그 저장
        await supabase.from('moltbot_conversations').insert({
          conversation_id: data.conversationId,
          user_id: data.userId,
          agent_id: agentId,
          message: data.message,
          direction: 'inbound',
          metadata: data.metadata,
          created_at: timestamp,
        });

        return NextResponse.json({ 
          success: true, 
          message: 'Message logged' 
        });
      }

      // ───────────────────────────────────────────────────────
      // 액션 완료
      // ───────────────────────────────────────────────────────
      case 'action_completed': {
        // 액션 결과 저장
        await supabase.from('moltbot_actions').insert({
          agent_id: agentId,
          action_type: data.actionType,
          result: data.actionResult,
          user_id: data.userId,
          status: 'completed',
          created_at: timestamp,
        });

        // 관련 태스크 상태 업데이트
        if (data.metadata?.taskId) {
          await supabase
            .from('tasks')
            .update({ 
              status: 'completed',
              completed_at: timestamp,
              result: data.actionResult 
            })
            .eq('id', data.metadata.taskId);
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Action logged' 
        });
      }

      // ───────────────────────────────────────────────────────
      // 승인 요청
      // ───────────────────────────────────────────────────────
      case 'approval_request': {
        // 승인 큐에 추가
        const { data: approval, error } = await supabase
          .from('approval_queue')
          .insert({
            source: 'moltbot',
            agent_id: agentId,
            action_type: data.actionType,
            params: data.actionResult,
            user_id: data.userId,
            status: 'pending',
            urgency: data.metadata?.urgency || 'medium',
            created_at: timestamp,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create approval request:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to create approval request' 
          }, { status: 500 });
        }

        // Owner에게 알림 전송 (향후 구현)
        // await notifyOwner(approval);

        return NextResponse.json({ 
          success: true, 
          message: 'Approval request created',
          approvalId: approval.id 
        });
      }

      // ───────────────────────────────────────────────────────
      // 에러 발생
      // ───────────────────────────────────────────────────────
      case 'error': {
        // 에러 로그 저장
        await supabase.from('moltbot_errors').insert({
          agent_id: agentId,
          error_message: data.error,
          context: data.metadata,
          created_at: timestamp,
        });

        console.error(`[Moltbot Error] Agent: ${agentId}, Error: ${data.error}`);

        return NextResponse.json({ 
          success: true, 
          message: 'Error logged' 
        });
      }

      // ───────────────────────────────────────────────────────
      // 알 수 없는 이벤트
      // ───────────────────────────────────────────────────────
      default:
        console.warn(`Unknown Moltbot event: ${event}`);
        return NextResponse.json({ 
          success: true, 
          message: `Unknown event: ${event}` 
        });
    }
  } catch (error) {
    console.error('Moltbot webhook error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook processing failed' 
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// GET (Webhook 상태 확인)
// ─────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    service: 'moltbot-webhook',
    status: 'ready',
    supportedEvents: [
      'message_received',
      'action_completed', 
      'approval_request',
      'error'
    ],
    timestamp: new Date().toISOString(),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
