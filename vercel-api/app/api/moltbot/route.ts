// ═══════════════════════════════════════════════════════════════════════════════
// 🦞 AUTUS × Moltbot API Route
// Moltbot Gateway 연동 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import moltbot, {
  sendToMoltbot,
  checkMoltbotHealth,
  analyzeChurnRisk,
  generateDailyBriefing,
  type MoltbotRole
} from '@/lib/moltbot';
import type { ActionType } from '@/lib/types-agent';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface ChatRequest {
  action: 'chat' | 'health' | 'analyze_churn' | 'daily_briefing' | 'execute_action';
  prompt?: string;
  role?: MoltbotRole;
  userId?: string;
  customerId?: string;
  actionType?: string;
  actionParams?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/moltbot
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { action, prompt, role = 'assistant', userId, customerId, actionType, actionParams } = body;

    switch (action) {
      // ───────────────────────────────────────────────────────
      // 일반 채팅
      // ───────────────────────────────────────────────────────
      case 'chat': {
        if (!prompt) {
          return NextResponse.json(
            { success: false, error: 'prompt is required' },
            { status: 400 }
          );
        }

        const response = await sendToMoltbot({
          prompt,
          role,
          context: { userId, customerId },
        });

        return NextResponse.json(response);
      }

      // ───────────────────────────────────────────────────────
      // 헬스 체크
      // ───────────────────────────────────────────────────────
      case 'health': {
        const health = await checkMoltbotHealth();
        return NextResponse.json({
          success: health.healthy,
          data: health,
          message: health.healthy ? 'Moltbot 정상 작동 중' : 'Moltbot 연결 실패',
        });
      }

      // ───────────────────────────────────────────────────────
      // 이탈 위험 분석
      // ───────────────────────────────────────────────────────
      case 'analyze_churn': {
        if (!userId || !customerId) {
          return NextResponse.json(
            { success: false, error: 'userId and customerId are required' },
            { status: 400 }
          );
        }

        const response = await analyzeChurnRisk(userId, customerId);
        return NextResponse.json(response);
      }

      // ───────────────────────────────────────────────────────
      // 일일 브리핑
      // ───────────────────────────────────────────────────────
      case 'daily_briefing': {
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'userId is required' },
            { status: 400 }
          );
        }

        const response = await generateDailyBriefing(userId);
        return NextResponse.json(response);
      }

      // ───────────────────────────────────────────────────────
      // 액션 실행
      // ───────────────────────────────────────────────────────
      case 'execute_action': {
        if (!actionType || !actionParams || !userId) {
          return NextResponse.json(
            { success: false, error: 'actionType, actionParams, and userId are required' },
            { status: 400 }
          );
        }

        const response = await moltbot.executeAction(
          actionType as ActionType,
          actionParams,
          userId
        );
        return NextResponse.json(response);
      }

      // ───────────────────────────────────────────────────────
      // 알 수 없는 액션
      // ───────────────────────────────────────────────────────
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Moltbot API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/moltbot (Health Check)
// ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const health = await checkMoltbotHealth();
  
  return NextResponse.json({
    service: 'moltbot',
    status: health.healthy ? 'healthy' : 'unhealthy',
    latency: health.latency,
    error: health.error,
    timestamp: new Date().toISOString(),
    endpoints: {
      chat: 'POST /api/moltbot { action: "chat", prompt: "...", role: "owner" }',
      health: 'POST /api/moltbot { action: "health" }',
      analyzeChurn: 'POST /api/moltbot { action: "analyze_churn", userId: "...", customerId: "..." }',
      dailyBriefing: 'POST /api/moltbot { action: "daily_briefing", userId: "..." }',
      executeAction: 'POST /api/moltbot { action: "execute_action", actionType: "...", actionParams: {...} }',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Runtime Config
// ─────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
