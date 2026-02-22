// ============================================
// AUTUS Brain API - Claude Integration
// Edge Runtime for Low Latency
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/claude';
import { db } from '@/lib/supabase';
import { captureError } from '../../../lib/monitoring';

export const runtime = 'edge';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS (CORS Preflight)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// POST /api/brain
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload, userId } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    let result: Record<string, unknown>;

    switch (action) {
      // 보상 카드 생성
      case 'generate_reward_card': {
        const { role, pain_point, orbit_distance, context_data } = payload;
        
        result = await ai.generateRewardCard({
          role: role || 'owner',
          pain_point: pain_point || 'cashflow',
          orbit_distance: orbit_distance || 0.5,
          context_data: context_data || {}
        });

        // DB에 저장
        if (userId) {
          await db.createRewardCard({
            user_id: userId,
            card_type: pain_point || 'general',
            title: result.title,
            icon: result.icon,
            message: result.message,
            actions: result.actions,
            is_read: false,
            is_acted: false
          });
        }
        break;
      }

      // 데이터 분석
      case 'analyze': {
        const { type, data } = payload;
        result = await ai.analyzeData({ type, data });
        break;
      }

      // 3지 선택 생성
      case 'generate_options': {
        const { task_description } = payload;
        result = await ai.generateThreeOptions(task_description);
        break;
      }

      // 상담 일지 생성
      case 'generate_report': {
        const { studentName, subject, attendance, performance, notes } = payload;
        result = await ai.generateConsultReport({
          studentName,
          subject,
          attendance,
          performance,
          notes
        });
        break;
      }

      // 일일 카페 콘텐츠 생성
      case 'generateDailyContent': {
        const { type, topic, context } = payload || body.data || {};
        result = await ai.generateDailyContent({
          type: type || 'cafe_post',
          topic,
          context
        });
        break;
      }

      // 보상 카드 생성 (alternative name)
      case 'generateRewardCard': {
        const cardData = payload || body.data || {};
        result = { reward_card: await ai.generateRewardCard({
          role: cardData.role || 'owner',
          pain_point: cardData.pain_point || 'cashflow',
          orbit_distance: cardData.orbit_distance || 0.5,
          context_data: cardData.context_data || {}
        })};
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400, headers: corsHeaders }
        );
    }

    return NextResponse.json(
      { success: true, data: result },
      { status: 200, headers: corsHeaders }
    );

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error, { context: 'brain.POST' });
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
