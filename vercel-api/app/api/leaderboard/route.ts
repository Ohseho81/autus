// ============================================
// AUTUS Leaderboard API - V 순위 / 솔루션 랭킹
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Demo data for testing
const DEMO_LEADERBOARD = [
  { rank: 1, name: '강남점', value_v: 127.5, growth: '+12.3%', tier: 'T1' },
  { rank: 2, name: '서초점', value_v: 98.2, growth: '+8.7%', tier: 'T2' },
  { rank: 3, name: '잠실점', value_v: 87.1, growth: '+5.2%', tier: 'T2' },
  { rank: 4, name: '분당점', value_v: 72.4, growth: '+3.1%', tier: 'T3' },
  { rank: 5, name: '일산점', value_v: 65.8, growth: '+1.8%', tier: 'T3' },
];

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// POST /api/leaderboard (for demo/testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const limit = body.limit || 5;
    
    return NextResponse.json({
      success: true,
      data: {
        type: 'v_leaderboard',
        entries: DEMO_LEADERBOARD.slice(0, limit),
        total_academies: 48,
        updated_at: new Date().toISOString(),
        formula: 'V = (M - T) × (1 + s)^t'
      }
    }, { status: 200, headers: corsHeaders });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
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

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Leaderboard Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
