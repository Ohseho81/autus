// ============================================
// AUTUS Physics API - V Engine v2.3
// V = (Motions - Threats) × (1 + InteractionExponent × Relations)^t × Base
// 
// 용어 통일 (v2.3):
// - Mint → Motions (M: 생성 가치)
// - Tax → Threats (T: 비용/위험)
// - Synergy → Relations (s: 관계 계수)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { captureError } from '../../../lib/monitoring';
import { 
  calculateV, 
  calculateVGrowth, 
  applyImpulse, 
  recommendImpulse,
  summarizeState,
  ImpulseType,
  PHYSICS
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

    // 각 유기체의 V 계산 (v2.3: 용어 통일 적용)
    const withPhysics = organisms.map(org => {
      // 새 용어와 레거시 용어 모두 지원
      const motions = org.motions ?? org.mint ?? 0;
      const threats = org.threats ?? org.tax ?? 0;
      const relations = org.relations ?? org.synergy ?? 0.5;
      const base = org.base ?? PHYSICS.DEFAULT_BASE;
      const interactionExponent = org.interaction_exponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT;
      
      return {
        ...org,
        // v2.3 새 필드
        motions,
        threats,
        relations,
        base,
        interaction_exponent: interactionExponent,
        computed_v: calculateV(motions, threats, relations, 1, base, interactionExponent),
        summary: summarizeState({
          motions,
          threats,
          relations,
          entropy: org.entropy ?? 0,
          velocity: org.velocity ?? 0,
          friction: org.friction ?? 0,
          base,
          interactionExponent
        }),
        recommended_impulse: recommendImpulse({
          motions,
          threats,
          relations,
          entropy: org.entropy ?? 0,
          velocity: org.velocity ?? 0,
          friction: org.friction ?? 0,
          base,
          interactionExponent
        })
      };
    });

    // 전체 통계
    const totalV = withPhysics.reduce((sum, org) => sum + org.computed_v, 0);
    const avgRelations = organisms.length > 0 
      ? withPhysics.reduce((sum, org) => sum + org.relations, 0) / organisms.length 
      : 0;
    const urgentCount = withPhysics.filter(org => org.summary.status === 'urgent').length;

    return NextResponse.json({
      success: true,
      data: {
        organisms: withPhysics,
        summary: {
          total_v: totalV,
          avg_relations: avgRelations,  // v2.3: synergy → relations
          avg_synergy: avgRelations,    // Legacy alias
          organism_count: organisms.length,
          urgent_count: urgentCount
        },
        version: '2.3',
        terminology: {
          motions: 'M (생성 가치, 이전: mint)',
          threats: 'T (비용/위험, 이전: tax)',
          relations: 's (관계 계수, 이전: synergy)'
        }
      }
    }, { status: 200, headers: corsHeaders });

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error, { context: 'physics.GET' });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Demo data (v2.3: 새로운 용어 적용)
const DEMO_PHYSICS = {
  organism: {
    id: 'demo-001',
    name: '강남점',
    // v2.3 새 용어
    motions: 12750000,
    threats: 9820000,
    relations: 0.892,
    base: 1.0,
    interaction_exponent: 0.15,
    // 공통
    entropy: 0.12,
    velocity: 0.08,
    friction: 0.05,
    // Legacy aliases
    mint: 12750000,
    tax: 9820000,
    synergy: 0.892
  }
};

// POST /api/physics (Impulse 적용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, organismId, impulseType, intensity } = body;

    // Demo mode (v2.3)
    if (action === 'calculate' || organismId === 'demo') {
      const demo = DEMO_PHYSICS.organism;
      const v = calculateV(
        demo.motions, 
        demo.threats, 
        demo.relations, 
        1, 
        demo.base, 
        demo.interaction_exponent
      );
      return NextResponse.json({
        success: true,
        data: {
          organism: demo,
          computed_v: v,
          formula: `V = (${(demo.motions/1000000).toFixed(1)}M - ${(demo.threats/1000000).toFixed(1)}M) × (1 + ${demo.interaction_exponent} × ${demo.relations})^1 × ${demo.base} = ${(v/1000000).toFixed(2)}M`,
          formula_v23: 'V = (Motions - Threats) × (1 + IE × Relations)^t × Base',
          summary: summarizeState(demo),
          recommended_impulse: recommendImpulse(demo),
          version: '2.3'
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

      // v2.3: 새로운 용어로 상태 구성
      const motions = organism.motions ?? organism.mint ?? 0;
      const threats = organism.threats ?? organism.tax ?? 0;
      const relations = organism.relations ?? organism.synergy ?? 0.5;
      const base = organism.base ?? PHYSICS.DEFAULT_BASE;
      const interactionExponent = organism.interaction_exponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT;
      
      const currentState = {
        motions,
        threats,
        relations,
        entropy: organism.entropy ?? 0,
        velocity: organism.velocity ?? 0,
        friction: organism.friction ?? 0,
        base,
        interactionExponent
      };

      // Impulse 적용
      const newState = applyImpulse(currentState, impulseType as ImpulseType, intensity || 1.0);

      // V 성장률 계산
      const vGrowth = calculateVGrowth(
        { motions: currentState.motions, threats: currentState.threats, relations: currentState.relations, base, interactionExponent },
        { motions: newState.motions!, threats: newState.threats!, relations: newState.relations!, base: newState.base, interactionExponent: newState.interactionExponent }
      );

      // DB 업데이트 (새 용어 + 레거시 모두)
      await db.updateOrganism(organismId, {
        // v2.3 새 필드
        motions: newState.motions,
        threats: newState.threats,
        relations: newState.relations,
        base: newState.base,
        interaction_exponent: newState.interactionExponent,
        // Legacy aliases
        mint: newState.motions,
        tax: newState.threats,
        synergy: newState.relations,
        // 공통
        entropy: newState.entropy,
        velocity: newState.velocity,
        friction: newState.friction,
        value_v: calculateV(newState.motions!, newState.threats!, newState.relations!, 1, newState.base, newState.interactionExponent)
      });

      return NextResponse.json({
        success: true,
        data: {
          before: currentState,
          after: newState,
          v_growth: vGrowth,
          new_v: calculateV(newState.motions!, newState.threats!, newState.relations!, 1, newState.base, newState.interactionExponent),
          summary: summarizeState(newState),
          version: '2.3'
        }
      }, { status: 200, headers: corsHeaders });
    }

    // 단순 V 계산 (v2.3: 새 용어 지원 + 레거시 호환)
    if (action === 'calculate_v') {
      // 새 용어 우선, 레거시 폴백
      const motions = body.motions ?? body.mint ?? 0;
      const threats = body.threats ?? body.tax ?? 0;
      const relations = body.relations ?? body.synergy ?? 0.5;
      const base = body.base ?? PHYSICS.DEFAULT_BASE;
      const interactionExponent = body.interaction_exponent ?? body.interactionExponent ?? PHYSICS.DEFAULT_INTERACTION_EXPONENT;
      const time = body.time ?? body.t ?? 1;
      
      const v = calculateV(motions, threats, relations, time, base, interactionExponent);
      return NextResponse.json({
        success: true,
        data: { 
          v, 
          formula: `V = (${motions} - ${threats}) × (1 + ${interactionExponent} × ${relations})^${time} × ${base}`,
          formula_v23: 'V = (Motions - Threats) × (1 + IE × Relations)^t × Base',
          inputs: { motions, threats, relations, base, interactionExponent, time },
          version: '2.3'
        }
      }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400, headers: corsHeaders }
    );

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error, { context: 'physics.POST' });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
