// ============================================
// AUTUS Leaderboard API - V 순위 / 솔루션 랭킹
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET /api/leaderboard?type=v|solution&limit=10
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'v';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (type === 'v') {
      // V 리더보드
      const leaderboard = await db.getLeaderboard(limit);
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'v_leaderboard',
          entries: leaderboard,
          updated_at: new Date().toISOString()
        }
      }, { status: 200, headers: corsHeaders });
    }

    if (type === 'solution') {
      // 솔루션 랭킹
      const ranking = await db.getSolutionRanking();
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'solution_ranking',
          entries: ranking.slice(0, limit),
          standard_criteria: {
            effectiveness: 0.80,
            usage_count: 50,
            v_growth: 0.15
          }
        }
      }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid type. Use "v" or "solution"' },
      { status: 400, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Leaderboard Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
