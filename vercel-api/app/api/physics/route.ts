// ============================================
// AUTUS Physics API - V Engine
// V = (M - T) × (1 + s)^t
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { 
  calculateV, 
  calculateVGrowth, 
  applyImpulse, 
  recommendImpulse,
  summarizeState,
  ImpulseType 
} from '@/lib/physics';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET /api/physics?userId=xxx
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

    // 유기체 목록 조회
    const organisms = await db.getOrganisms(userId);

    // 각 유기체의 V 계산
    const withPhysics = organisms.map(org => ({
      ...org,
      computed_v: calculateV(org.mint, org.tax, org.synergy),
      summary: summarizeState({
        mint: org.mint,
        tax: org.tax,
        synergy: org.synergy,
        entropy: org.entropy,
        velocity: org.velocity,
        friction: org.friction
      }),
      recommended_impulse: recommendImpulse({
        mint: org.mint,
        tax: org.tax,
        synergy: org.synergy,
        entropy: org.entropy,
        velocity: org.velocity,
        friction: org.friction
      })
    }));

    // 전체 통계
    const totalV = withPhysics.reduce((sum, org) => sum + org.computed_v, 0);
    const avgSynergy = organisms.length > 0 
      ? organisms.reduce((sum, org) => sum + org.synergy, 0) / organisms.length 
      : 0;
    const urgentCount = withPhysics.filter(org => org.summary.status === 'urgent').length;

    return NextResponse.json({
      success: true,
      data: {
        organisms: withPhysics,
        summary: {
          total_v: totalV,
          avg_synergy: avgSynergy,
          organism_count: organisms.length,
          urgent_count: urgentCount
        }
      }
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Physics GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Demo data
const DEMO_PHYSICS = {
  organism: {
    id: 'demo-001',
    name: '강남점',
    mint: 12750000,
    tax: 9820000,
    synergy: 0.892,
    entropy: 0.12,
    velocity: 0.08,
    friction: 0.05
  }
};

// POST /api/physics (Impulse 적용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, organismId, impulseType, intensity } = body;

    // Demo mode
    if (action === 'calculate' || organismId === 'demo') {
      const demo = DEMO_PHYSICS.organism;
      const v = calculateV(demo.mint, demo.tax, demo.synergy);
      return NextResponse.json({
        success: true,
        data: {
          organism: demo,
          computed_v: v,
          formula: `V = (${(demo.mint/1000000).toFixed(1)}M - ${(demo.tax/1000000).toFixed(1)}M) × (1 + ${demo.synergy})^1 = ${(v/1000000).toFixed(2)}M`,
          summary: summarizeState(demo),
          recommended_impulse: recommendImpulse(demo)
        }
      }, { status: 200, headers: corsHeaders });
    }

    if (action === 'apply_impulse') {
      if (!organismId || !impulseType) {
        return NextResponse.json(
          { success: false, error: 'organismId and impulseType are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      // 현재 상태 조회
      const organism = await db.getOrganism(organismId);
      if (!organism) {
        return NextResponse.json(
          { success: false, error: 'Organism not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      const currentState = {
        mint: organism.mint,
        tax: organism.tax,
        synergy: organism.synergy,
        entropy: organism.entropy,
        velocity: organism.velocity,
        friction: organism.friction
      };

      // Impulse 적용
      const newState = applyImpulse(currentState, impulseType as ImpulseType, intensity || 1.0);

      // V 성장률 계산
      const vGrowth = calculateVGrowth(
        { mint: currentState.mint, tax: currentState.tax, synergy: currentState.synergy },
        { mint: newState.mint, tax: newState.tax, synergy: newState.synergy }
      );

      // DB 업데이트
      await db.updateOrganism(organismId, {
        mint: newState.mint,
        tax: newState.tax,
        synergy: newState.synergy,
        entropy: newState.entropy,
        velocity: newState.velocity,
        friction: newState.friction,
        value_v: calculateV(newState.mint, newState.tax, newState.synergy)
      });

      return NextResponse.json({
        success: true,
        data: {
          before: currentState,
          after: newState,
          v_growth: vGrowth,
          new_v: calculateV(newState.mint, newState.tax, newState.synergy),
          summary: summarizeState(newState)
        }
      }, { status: 200, headers: corsHeaders });
    }

    // 단순 V 계산
    if (action === 'calculate_v') {
      const { mint, tax, synergy, time } = body;
      const v = calculateV(mint, tax, synergy, time || 1);
      return NextResponse.json({
        success: true,
        data: { v, formula: `V = (${mint} - ${tax}) × (1 + ${synergy})^${time || 1}` }
      }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Physics POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
