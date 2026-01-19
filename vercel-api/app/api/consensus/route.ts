// ============================================
// AUTUS Consensus API - 활용 기반 자동 합의
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { calculateEffectiveness, checkStandardQualification, calculateVGrowth } from '@/lib/physics';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET /api/consensus?taskId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    // 솔루션 랭킹 조회
    const ranking = await db.getSolutionRanking(taskId || undefined);

    // 표준 솔루션 조회
    const standard = taskId ? await db.getStandard(taskId) : null;

    return NextResponse.json({
      success: true,
      data: {
        ranking,
        standard,
        criteria: {
          effectiveness_threshold: 0.80,
          usage_count_threshold: 50,
          v_growth_threshold: 0.15
        }
      }
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Consensus GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/consensus (활용 기록)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action === 'log_usage') {
      const {
        task_id,
        solution_id,
        user_id,
        before,    // { m, t, s }
        after,     // { m, t, s }
        duration_minutes
      } = payload;

      // Validation
      if (!task_id || !solution_id || !user_id || !before || !after) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400, headers: corsHeaders }
        );
      }

      // 실효성 점수 계산
      const deltaM = before.m > 0 ? (after.m - before.m) / before.m : 0;
      const deltaT = before.t > 0 ? (before.t - after.t) / before.t : 0;
      const deltaS = before.s > 0 ? (after.s - before.s) / before.s : 0;
      
      // 사용 빈도 정규화 (간단히 0.5 고정, 실제론 전체 대비 비율)
      const usageNorm = 0.5;
      
      const effectivenessScore = calculateEffectiveness(deltaM, deltaT, usageNorm, deltaS);
      
      // V 성장률
      const vGrowth = calculateVGrowth(
        { mint: before.m, tax: before.t, synergy: before.s },
        { mint: after.m, tax: after.t, synergy: after.s }
      );

      // 로그 저장
      const log = await db.createUsageLog({
        task_id,
        solution_id,
        user_id,
        before_m: before.m,
        before_t: before.t,
        before_s: before.s,
        after_m: after.m,
        after_t: after.t,
        after_s: after.s,
        effectiveness_score: effectivenessScore,
        v_growth: vGrowth,
        duration_minutes: duration_minutes || 0
      });

      return NextResponse.json({
        success: true,
        data: {
          log,
          effectiveness_score: effectivenessScore,
          v_growth: vGrowth,
          is_effective: effectivenessScore >= 0.8
        }
      }, { status: 200, headers: corsHeaders });
    }

    if (action === 'check_standard') {
      const { solution_id } = payload;
      
      // 솔루션 통계 조회
      const ranking = await db.getSolutionRanking();
      const solution = ranking.find((s: any) => s.solution_id === solution_id);
      
      if (!solution) {
        return NextResponse.json(
          { success: false, error: 'Solution not found in ranking' },
          { status: 404, headers: corsHeaders }
        );
      }

      const qualifies = checkStandardQualification(
        solution.avg_score,
        solution.usage_count,
        solution.avg_v_growth
      );

      return NextResponse.json({
        success: true,
        data: {
          solution_id,
          current_stats: {
            effectiveness: solution.avg_score,
            usage_count: solution.usage_count,
            avg_v_growth: solution.avg_v_growth
          },
          qualifies_for_standard: qualifies,
          missing: {
            effectiveness: Math.max(0, 0.80 - solution.avg_score),
            usage: Math.max(0, 50 - solution.usage_count),
            v_growth: Math.max(0, 0.15 - solution.avg_v_growth)
          }
        }
      }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Consensus POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
