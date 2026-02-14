/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 Risk Queue API
 * FSD Console - R(t) 기반 이탈 예측 관리
 * R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';


// 카테고리별 가중치
const CATEGORY_WEIGHTS: Record<string, number> = {
  grade: 1.0,
  attendance: 1.2,
  engagement: 0.8,
  payment: 1.5,
};

// GET: 위험 학생 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');
  const status = searchParams.get('status') || 'open';
  const minPriority = searchParams.get('min_priority') || 'LOW';

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 });
  }

  const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const minPriorityIndex = priorityOrder.indexOf(minPriority);

  const { data: risks, error } = await getSupabaseAdmin()
    .from('risk_queue')
    .select(`
      *,
      node:relational_nodes (
        id, node_type, name, meta
      )
    `)
    .eq('org_id', orgId)
    .eq('status', status)
    .order('risk_score', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 우선순위 필터링
  const filteredRisks = risks?.filter(r => 
    priorityOrder.indexOf(r.priority) >= minPriorityIndex
  ) || [];

  // 레벨별 카운트
  const stats = {
    critical: risks?.filter(r => r.priority === 'CRITICAL').length || 0,
    high: risks?.filter(r => r.priority === 'HIGH').length || 0,
    medium: risks?.filter(r => r.priority === 'MEDIUM').length || 0,
    low: risks?.filter(r => r.priority === 'LOW').length || 0,
    total: risks?.length || 0,
  };

  // 총 예상 손실 가치 계산
  const totalEstimatedLoss = filteredRisks.reduce((sum, r) => sum + (r.estimated_value || 0), 0);

  return NextResponse.json({ 
    risks: filteredRisks, 
    stats,
    total_estimated_loss: totalEstimatedLoss,
  });
}

// POST: 위험 재계산 및 업데이트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { org_id, recalculate, alpha = 1.5 } = body;

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 });
    }

    if (recalculate) {
      // 모든 학생의 최근 상호작용 데이터 조회
      const { data: students } = await getSupabaseAdmin()
        .from('relational_nodes')
        .select('id, name, meta')
        .eq('org_id', org_id)
        .eq('node_type', 'student');

      if (!students) {
        return NextResponse.json({ error: 'No students found' }, { status: 404 });
      }

      const processedResults: Array<{ student_id: string; student_name: string; risk_score: number; priority: string }> = [];

      for (const student of students) {
        // 최근 30일 상호작용 로그 조회
        const { data: interactions } = await getSupabaseAdmin()
          .from('interaction_logs')
          .select('*')
          .eq('target_id', student.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        // R(t) 계산
        const riskResult = calculateRiskScore(interactions || [], student.meta?.s_index || 50, alpha);

        // Risk Queue 업데이트
        if (riskResult.risk_score >= 40) {
          await getSupabaseAdmin().from('risk_queue').upsert({
            org_id,
            target_node: student.id,
            priority: riskResult.priority,
            risk_score: riskResult.risk_score,
            signals: riskResult.signals,
            suggested_action: riskResult.recommended_actions[0] || '모니터링',
            predicted_churn_days: riskResult.predicted_churn_days,
            estimated_value: riskResult.estimated_value,
            status: 'open',
            meta: {
              contributing_factors: riskResult.contributing_factors,
              auto_actuation: riskResult.auto_actuation,
            },
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'target_node',
          });

          processedResults.push({
            student_id: student.id,
            student_name: student.name,
            risk_score: riskResult.risk_score,
            priority: riskResult.priority,
          });
        } else {
          // 위험도가 낮아진 경우 해결 처리
          await getSupabaseAdmin()
            .from('risk_queue')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString(),
              resolution_notes: '위험도 자동 감소',
            })
            .eq('target_node', student.id)
            .eq('status', 'open');
        }
      }

      return NextResponse.json({
        success: true,
        processed: students.length,
        high_risk_count: processedResults.filter(r => r.priority === 'HIGH' || r.priority === 'CRITICAL').length,
        results: processedResults,
        message: '위험도 재계산 완료',
      });
    }

    return NextResponse.json({ error: 'recalculate=true required' }, { status: 400 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: 개별 위험 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { risk_id, action, notes, assigned_to } = body;

    if (!risk_id || !action) {
      return NextResponse.json({ error: 'risk_id and action required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case 'resolve':
        updates.status = 'resolved';
        updates.resolved_at = new Date().toISOString();
        updates.resolution_notes = notes || '수동 해결';
        break;
      
      case 'escalate':
        updates.priority = 'CRITICAL';
        updates.escalated_at = new Date().toISOString();
        updates.escalation_notes = notes;
        break;
      
      case 'assign':
        updates.assigned_to = assigned_to;
        updates.assigned_at = new Date().toISOString();
        break;
      
      case 'dismiss':
        updates.status = 'dismissed';
        updates.dismiss_notes = notes || '오탐 처리';
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('risk_queue')
      .update(updates)
      .eq('id', risk_id)
      .select()
      .single();

    if (error) throw error;

    // Immortal Ledger에 기록
    await getSupabaseAdmin().from('immortal_events').insert({
      org_id: data.org_id,
      user_id: assigned_to || 'system',
      role: 'fsd',
      action_type: `risk_${action}`,
      entity_type: 'risk',
      entity_id: risk_id,
      content_redacted: `위험 ${action}: ${data.target_node}`,
      meta: { action, notes, previous_status: data.status },
    });

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// R(t) 계산 함수
function calculateRiskScore(
  interactions: Array<Record<string, unknown>>,
  currentSatisfaction: number,
  alpha: number
): {
  risk_score: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: string[];
  recommended_actions: string[];
  contributing_factors: Array<{ factor: string; weight: number; impact: number }>;
  predicted_churn_days: number;
  estimated_value: number;
  auto_actuation: Array<{ action: string; scheduled_at: Date; status: string }>;
} {
  const now = Date.now();
  
  // 시간 가중치를 적용한 성과 변화 합계
  let weightedSum = 0;
  const factorSums: Record<string, { sum: number; count: number }> = {};
  const signals: string[] = [];

  interactions.forEach(interaction => {
    const daysSince = (now - new Date(interaction.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const timeWeight = Math.exp(-daysSince / 30); // 30일 반감기
    
    const data = interaction.vectorized_data || {};
    const emotionDelta = data.emotion_delta || 0;
    const category = data.issue_triggers?.[0] || 'engagement';
    const categoryWeight = CATEGORY_WEIGHTS[category] || 1.0;
    
    weightedSum += timeWeight * categoryWeight * emotionDelta;
    
    // 요인별 집계
    if (!factorSums[category]) {
      factorSums[category] = { sum: 0, count: 0 };
    }
    factorSums[category].sum += emotionDelta;
    factorSums[category].count += 1;
    
    // 신호 감지
    if (emotionDelta <= -15) {
      signals.push(`강한 부정 감정 (${emotionDelta})`);
    }
    if (data.bond_strength === 'cold') {
      signals.push('유대 관계 냉각');
    }
  });

  // R(t) = -weightedSum / s(t)^alpha
  const satisfactionFactor = Math.pow(Math.max(0.1, currentSatisfaction / 100), alpha);
  const rawRisk = -weightedSum / satisfactionFactor;
  const riskScore = Math.min(100, Math.max(0, 50 + rawRisk * 10));

  // 우선순위 결정
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (riskScore >= 80) priority = 'CRITICAL';
  else if (riskScore >= 60) priority = 'HIGH';
  else if (riskScore >= 40) priority = 'MEDIUM';
  else priority = 'LOW';

  // 기여 요인 분석
  const contributingFactors = Object.entries(factorSums)
    .map(([factor, data]) => ({
      factor,
      weight: data.count / interactions.length,
      impact: data.sum / data.count,
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  // 권장 조치
  const recommendedActions: string[] = [];
  if (priority === 'CRITICAL') {
    recommendedActions.push('즉시 1:1 상담 예약');
    recommendedActions.push('원장 직접 연락');
  } else if (priority === 'HIGH') {
    recommendedActions.push('담당 선생님 특별 케어 요청');
    recommendedActions.push('긍정 리포트 발송');
  } else if (priority === 'MEDIUM') {
    recommendedActions.push('학부모 앱 푸시 알림');
  }

  // 예상 이탈 일수
  const baseDays = 90;
  const riskFactor = (100 - riskScore) / 100;
  const satisfactionBonus = currentSatisfaction / 100;
  const predictedChurnDays = Math.round(baseDays * riskFactor * (0.5 + satisfactionBonus));

  // 예상 손실 가치
  const monthlyTuition = 450000;
  const estimatedValue = monthlyTuition * Math.max(1, Math.ceil(predictedChurnDays / 30));

  // 자동 실행 예약
  const autoActuation: Array<{ action: string; scheduled_at: Date; status: string }> = [];
  if (priority === 'CRITICAL') {
    autoActuation.push({
      action: '긍정 리포트 자동 발송',
      scheduled_at: new Date(),
      status: 'pending',
    });
  }

  return {
    risk_score: Math.round(riskScore),
    priority,
    signals: Array.from(new Set(signals)),
    recommended_actions: recommendedActions,
    contributing_factors: contributingFactors,
    predicted_churn_days: predictedChurnDays,
    estimated_value: estimatedValue,
    auto_actuation: autoActuation,
  };
}
