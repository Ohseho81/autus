// ============================================
// AUTUS Rewards API - 보상 카드 관리
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { ai } from '@/lib/claude';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET /api/rewards?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const unread = await db.getUnreadRewards(userId);

    return NextResponse.json({
      success: true,
      data: {
        unread_count: unread.length,
        cards: unread
      }
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Rewards GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/rewards (새 보상 카드 생성)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, payload } = body;

    if (action === 'generate') {
      // 사용자 정보 조회
      const user = await db.getUser(userId);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      // AI로 보상 카드 생성
      const cardContent = await ai.generateRewardCard({
        role: user.role_id,
        pain_point: user.pain_point_top1 || 'general',
        orbit_distance: user.sync_orbit,
        context_data: payload?.context || {}
      });

      // DB에 저장
      const card = await db.createRewardCard({
        user_id: userId,
        card_type: user.pain_point_top1 || 'general',
        title: cardContent.title,
        icon: cardContent.icon,
        message: cardContent.message,
        actions: cardContent.actions,
        is_read: false,
        is_acted: false
      });

      return NextResponse.json({
        success: true,
        data: card
      }, { status: 201, headers: corsHeaders });
    }

    if (action === 'mark_read') {
      const { cardId } = payload;
      
      const { supabaseAdmin } = await import('@/lib/supabase');
      await supabaseAdmin
        .from('reward_cards')
        .update({ is_read: true })
        .eq('id', cardId);

      return NextResponse.json({
        success: true,
        data: { card_id: cardId, is_read: true }
      }, { status: 200, headers: corsHeaders });
    }

    if (action === 'mark_acted') {
      const { cardId, actionType } = payload;
      
      const { supabaseAdmin } = await import('@/lib/supabase');
      await supabaseAdmin
        .from('reward_cards')
        .update({ is_acted: true })
        .eq('id', cardId);

      return NextResponse.json({
        success: true,
        data: { card_id: cardId, is_acted: true, action_type: actionType }
      }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Rewards POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
