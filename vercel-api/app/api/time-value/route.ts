/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⏱️ AUTUS Time Value API
 * 
 * V = P × Λ × e^(σt)
 * NRV = P × (T₃ - T₁ + T₂) × e^(σt)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

// Supabase 클라이언트

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions (TypeScript 버전 - 서버사이드)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * λ 계산: λ = (1/R) × I × E × N × k
 */
function calculateLambda(
  replaceability: number,
  influence: number,
  expertise: number,
  network: number,
  industryK: number = 0.3
): number {
  const rInverse = 1 / Math.max(0.05, replaceability);
  const rawLambda = rInverse * influence * expertise * network * industryK;
  return Math.max(1.0, rawLambda);
}

/**
 * σ 계산: σ = w₁C + w₂G + w₃V + w₄R
 */
function calculateSigma(
  compatibility: number,
  goalAlignment: number,
  valueMatch: number,
  rhythmSync: number,
  weights = { c: 0.3, g: 0.3, v: 0.2, r: 0.2 }
): number {
  return (
    weights.c * compatibility +
    weights.g * goalAlignment +
    weights.v * valueMatch +
    weights.r * rhythmSync
  );
}

/**
 * P 계산: P = F × Q × D
 */
function calculateDensity(frequency: number, quality: number, depth: number): number {
  return frequency * quality * depth;
}

/**
 * 시너지 배율: e^(σt)
 */
function calculateSynergyMultiplier(sigma: number, timeMonths: number): number {
  const years = timeMonths / 12;
  return Math.exp(sigma * years);
}

/**
 * 관계 가치: V = P × Λ × e^(σt)
 */
function calculateRelationshipValue(
  density: number,
  mutualTimeValue: number,
  sigma: number,
  timeMonths: number
): number {
  const synergyMultiplier = calculateSynergyMultiplier(sigma, timeMonths);
  return density * mutualTimeValue * synergyMultiplier;
}

/**
 * 관계 건강도 평가
 */
function assessRelationshipHealth(
  density: number,
  sigma: number,
  synergyMultiplier: number
): { health_score: number; status: string; recommendations: string[] } {
  const densityScore = density * 40;
  const sigmaScore = ((sigma + 1) / 2) * 30;
  const multiplierScore = Math.min(30, synergyMultiplier * 5);
  
  const healthScore = Math.round(densityScore + sigmaScore + multiplierScore);
  
  let status: string;
  if (healthScore >= 80) status = 'excellent';
  else if (healthScore >= 60) status = 'good';
  else if (healthScore >= 40) status = 'fair';
  else if (healthScore >= 20) status = 'poor';
  else status = 'critical';
  
  const recommendations: string[] = [];
  if (density < 0.3) recommendations.push('접촉 빈도를 높이세요');
  if (sigma < 0) recommendations.push('관계 시너지 개선이 필요합니다');
  if (sigma > 0 && density < 0.5) recommendations.push('좋은 시너지를 활용하여 관계를 더 깊게 만드세요');
  if (healthScore < 40) recommendations.push('관계 재정립이 필요합니다');
  
  return { health_score: healthScore, status, recommendations };
}

// 역할별 기본 λ
const DEFAULT_LAMBDA_BY_ROLE: Record<string, number> = {
  c_level: 5.0,
  fsd: 3.0,
  optimus: 1.5,
  consumer: 1.0,
  regulatory: 2.0,
  partner: 2.5,
  senior_teacher: 2.5,
  teacher: 2.0,
  junior_teacher: 1.5,
  admin: 1.5,
  student: 1.0,
  parent: 1.2,
};

// ═══════════════════════════════════════════════════════════════════════════
// GET: 시간 가치 대시보드 조회
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');
  const action = searchParams.get('action') || 'dashboard';
  const nodeId = searchParams.get('node_id');

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'dashboard':
        return await getDashboard(orgId);
      
      case 'node_lambda':
        return await getNodeLambda(orgId, nodeId);
      
      case 'relationships':
        return await getRelationshipValues(orgId);
      
      case 'time_metrics':
        return await getTimeMetrics(orgId, nodeId);
      
      case 'omega':
        return await getOrgOmega(orgId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Time Value API GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST: 시간 가치 업데이트/계산
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, org_id } = body;

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 });
    }

    switch (action) {
      case 'update_lambda':
        return await updateNodeLambda(body);
      
      case 'update_sigma':
        return await updateRelationshipSigma(body);
      
      case 'update_density':
        return await updateRelationshipDensity(body);
      
      case 'record_activity':
        return await recordTimeActivity(body);
      
      case 'calculate_relationship_value':
        return await calculateAndSaveRelationshipValue(body);
      
      case 'update_omega':
        return await updateOrgOmega(body);
      
      case 'recalculate_all':
        return await recalculateAllValues(org_id);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Time Value API POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════════════════
async function getDashboard(orgId: string) {
  // 조직 ω 조회
  const { data: omegaData } = await getSupabaseAdmin()
    .from('org_omega')
    .select('*')
    .eq('org_id', orgId)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  const omega = omegaData?.omega || 30000;

  // 노드 λ 조회
  const { data: lambdaNodes } = await getSupabaseAdmin()
    .from('node_lambda')
    .select(`
      *,
      node:relational_nodes(id, name, role)
    `)
    .eq('org_id', orgId)
    .order('lambda', { ascending: false });

  // 시간 메트릭스 조회 (월간)
  const { data: timeMetrics } = await getSupabaseAdmin()
    .from('time_metrics')
    .select('*')
    .eq('org_id', orgId)
    .eq('period', 'monthly')
    .order('period_start', { ascending: false })
    .limit(30);

  // 관계 가치 조회
  const { data: relationships } = await getSupabaseAdmin()
    .from('relationship_value')
    .select(`
      *,
      node_a:relational_nodes!node_a_id(id, name, role),
      node_b:relational_nodes!node_b_id(id, name, role)
    `)
    .eq('org_id', orgId)
    .order('value_stu', { ascending: false });

  // 집계
  const totalT1 = timeMetrics?.reduce((sum, m) => sum + (m.t1_invested || 0), 0) || 0;
  const totalT2 = timeMetrics?.reduce((sum, m) => sum + (m.t2_saved || 0), 0) || 0;
  const totalT3 = timeMetrics?.reduce((sum, m) => sum + (m.t3_created || 0), 0) || 0;
  const totalNTV = totalT3 - totalT1 + totalT2;
  const totalRelValue = relationships?.reduce((sum, r) => sum + (r.value_stu || 0), 0) || 0;

  // 효율성 점수 (0-100)
  const efficiencyScore = totalT1 > 0 
    ? Math.min(100, Math.round(((totalT2 + totalT3) / totalT1) * 25))
    : 0;

  // 상위 λ 노드
  const topLambdaNodes = (lambdaNodes || []).slice(0, 5).map(n => ({
    id: n.node_id,
    name: n.node?.name || 'Unknown',
    role: n.node?.role || 'unknown',
    lambda: n.lambda,
  }));

  // 시너지 정렬된 관계
  const sortedByValue = [...(relationships || [])];
  const strongestRelationships = sortedByValue.slice(0, 5).map(r => ({
    node_a: r.node_a?.name || r.node_a_id,
    node_b: r.node_b?.name || r.node_b_id,
    sigma: r.sigma,
    value: r.value_stu,
  }));
  
  const weakestRelationships = sortedByValue.slice(-5).reverse().map(r => ({
    node_a: r.node_a?.name || r.node_a_id,
    node_b: r.node_b?.name || r.node_b_id,
    sigma: r.sigma,
    value: r.value_stu,
  }));

  return NextResponse.json({
    org_id: orgId,
    omega,
    total_t1: totalT1,
    total_t2: totalT2,
    total_t3: totalT3,
    org_ntv: totalNTV,
    org_ntv_money: totalNTV * omega,
    total_relationship_value: totalRelValue,
    total_relationship_value_money: totalRelValue * omega,
    efficiency_score: efficiencyScore,
    node_count: lambdaNodes?.length || 0,
    relationship_count: relationships?.length || 0,
    avg_lambda: lambdaNodes?.length 
      ? lambdaNodes.reduce((sum, n) => sum + n.lambda, 0) / lambdaNodes.length 
      : 1,
    top_lambda_nodes: topLambdaNodes,
    strongest_relationships: strongestRelationships,
    weakest_relationships: weakestRelationships,
    formulas: {
      lambda: 'λ = (1/R) × I × E × N × k',
      sigma: 'σ = w₁C + w₂G + w₃V + w₄R',
      density: 'P = F × Q × D',
      value: 'V = P × Λ × e^(σt)',
      nrv: 'NRV = P × (T₃ - T₁ + T₂) × e^(σt)',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Node Lambda
// ═══════════════════════════════════════════════════════════════════════════
async function getNodeLambda(orgId: string, nodeId: string | null) {
  let query = getSupabaseAdmin()
    .from('node_lambda')
    .select(`
      *,
      node:relational_nodes(id, name, role)
    `)
    .eq('org_id', orgId);

  if (nodeId) {
    query = query.eq('node_id', nodeId);
  }

  const { data, error } = await query.order('lambda', { ascending: false });

  if (error) throw error;

  return NextResponse.json({
    nodes: data || [],
    default_lambdas: DEFAULT_LAMBDA_BY_ROLE,
  });
}

async function updateNodeLambda(body: any) {
  const {
    org_id,
    node_id,
    replaceability,
    influence,
    expertise,
    network,
    industry_k = 0.3,
    manual_lambda,
    reason = 'manual',
  } = body;

  // λ 계산
  const calculatedLambda = manual_lambda || calculateLambda(
    replaceability,
    influence,
    expertise,
    network,
    industry_k
  );

  // Upsert
  const { data, error } = await getSupabaseAdmin()
    .from('node_lambda')
    .upsert({
      node_id,
      org_id,
      lambda: calculatedLambda,
      replaceability: replaceability || 0.5,
      influence: influence || 0.5,
      expertise: expertise || 0.5,
      network: network || 0.5,
      industry_k,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'node_id' })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    node_lambda: data,
    calculation: {
      formula: 'λ = (1/R) × I × E × N × k',
      factors: { replaceability, influence, expertise, network, industry_k },
      result: calculatedLambda,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Relationship Sigma
// ═══════════════════════════════════════════════════════════════════════════
async function updateRelationshipSigma(body: any) {
  const {
    org_id,
    node_a_id,
    node_b_id,
    compatibility,
    goal_alignment,
    value_match,
    rhythm_sync,
    weights = { c: 0.3, g: 0.3, v: 0.2, r: 0.2 },
    measurement_basis = 'behavior',
  } = body;

  // σ 계산
  const sigma = calculateSigma(
    compatibility,
    goal_alignment,
    value_match,
    rhythm_sync,
    weights
  );

  // 시너지 상태
  let synergyStatus = 'neutral';
  if (sigma > 0.1) synergyStatus = 'positive';
  else if (sigma < -0.1) synergyStatus = 'negative';

  // Upsert (방향 무관 - 항상 작은 ID가 node_a)
  const [sortedA, sortedB] = node_a_id < node_b_id 
    ? [node_a_id, node_b_id] 
    : [node_b_id, node_a_id];

  const { data, error } = await getSupabaseAdmin()
    .from('relationship_sigma')
    .upsert({
      org_id,
      node_a_id: sortedA,
      node_b_id: sortedB,
      sigma,
      compatibility,
      goal_alignment,
      value_match,
      rhythm_sync,
      weight_c: weights.c,
      weight_g: weights.g,
      weight_v: weights.v,
      weight_r: weights.r,
      synergy_status: synergyStatus,
      measurement_basis,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'node_a_id,node_b_id' })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    relationship_sigma: data,
    calculation: {
      formula: 'σ = w₁C + w₂G + w₃V + w₄R',
      factors: { compatibility, goal_alignment, value_match, rhythm_sync },
      weights,
      result: sigma,
      synergy_multiplier_1year: calculateSynergyMultiplier(sigma, 12),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Relationship Density
// ═══════════════════════════════════════════════════════════════════════════
async function updateRelationshipDensity(body: any) {
  const {
    org_id,
    node_a_id,
    node_b_id,
    frequency,
    quality,
    depth,
    depth_level = 'familiarity',
    decay_rate = 0.01,
  } = body;

  // P 계산
  const density = calculateDensity(frequency, quality, depth);

  // 방향 정렬
  const [sortedA, sortedB] = node_a_id < node_b_id 
    ? [node_a_id, node_b_id] 
    : [node_b_id, node_a_id];

  const { data, error } = await getSupabaseAdmin()
    .from('relationship_density')
    .upsert({
      org_id,
      node_a_id: sortedA,
      node_b_id: sortedB,
      density,
      frequency,
      quality,
      depth,
      depth_level,
      decay_rate,
      density_decayed: density, // 초기값은 감쇠 없음
      last_interaction_at: new Date().toISOString(),
      idle_days: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'node_a_id,node_b_id' })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    relationship_density: data,
    calculation: {
      formula: 'P = F × Q × D',
      factors: { frequency, quality, depth },
      result: density,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Time Activity
// ═══════════════════════════════════════════════════════════════════════════
async function recordTimeActivity(body: any) {
  const {
    org_id,
    node_id,
    activity_type,
    real_time_hours,
    time_nature,
    target_id,
    target_type,
    meta,
  } = body;

  // 노드의 현재 λ 조회
  const { data: lambdaData } = await getSupabaseAdmin()
    .from('node_lambda')
    .select('lambda')
    .eq('node_id', node_id)
    .single();

  const lambda = lambdaData?.lambda || DEFAULT_LAMBDA_BY_ROLE['optimus'] || 1.0;
  const stuValue = real_time_hours * lambda;

  // 활동 기록
  const { data, error } = await getSupabaseAdmin()
    .from('time_activities')
    .insert({
      node_id,
      org_id,
      activity_type,
      real_time_hours,
      lambda_at_time: lambda,
      stu_value: stuValue,
      time_nature,
      target_id,
      target_type,
      meta,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    activity: data,
    conversion: {
      formula: 't_STU = t_real × λ',
      real_time_hours,
      lambda,
      stu_value: stuValue,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Time Metrics
// ═══════════════════════════════════════════════════════════════════════════
async function getTimeMetrics(orgId: string, nodeId: string | null) {
  let query = getSupabaseAdmin()
    .from('time_metrics')
    .select('*')
    .eq('org_id', orgId)
    .order('period_start', { ascending: false });

  if (nodeId) {
    query = query.eq('node_id', nodeId);
  }

  const { data, error } = await query.limit(50);

  if (error) throw error;

  return NextResponse.json({ metrics: data || [] });
}

// ═══════════════════════════════════════════════════════════════════════════
// Relationship Values
// ═══════════════════════════════════════════════════════════════════════════
async function getRelationshipValues(orgId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('relationship_value')
    .select(`
      *,
      node_a:relational_nodes!node_a_id(id, name, role),
      node_b:relational_nodes!node_b_id(id, name, role)
    `)
    .eq('org_id', orgId)
    .order('value_stu', { ascending: false });

  if (error) throw error;

  return NextResponse.json({ relationships: data || [] });
}

async function calculateAndSaveRelationshipValue(body: any) {
  const { org_id, node_a_id, node_b_id } = body;

  // 방향 정렬
  const [sortedA, sortedB] = node_a_id < node_b_id 
    ? [node_a_id, node_b_id] 
    : [node_b_id, node_a_id];

  // λ 조회
  const { data: lambdaA } = await getSupabaseAdmin()
    .from('node_lambda')
    .select('lambda')
    .eq('node_id', sortedA)
    .single();

  const { data: lambdaB } = await getSupabaseAdmin()
    .from('node_lambda')
    .select('lambda')
    .eq('node_id', sortedB)
    .single();

  // σ 조회
  const { data: sigmaData } = await getSupabaseAdmin()
    .from('relationship_sigma')
    .select('sigma')
    .eq('node_a_id', sortedA)
    .eq('node_b_id', sortedB)
    .single();

  // P 조회
  const { data: densityData } = await getSupabaseAdmin()
    .from('relationship_density')
    .select('density_decayed, last_interaction_at')
    .eq('node_a_id', sortedA)
    .eq('node_b_id', sortedB)
    .single();

  // ω 조회
  const { data: omegaData } = await getSupabaseAdmin()
    .from('org_omega')
    .select('omega')
    .eq('org_id', org_id)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  // 기본값 설정
  const lambdaAVal = lambdaA?.lambda || 1.0;
  const lambdaBVal = lambdaB?.lambda || 1.0;
  const sigma = sigmaData?.sigma || 0;
  const density = densityData?.density_decayed || 0.5;
  const omega = omegaData?.omega || 30000;

  // 관계 기간 계산 (최초 상호작용부터)
  const firstInteraction = densityData?.last_interaction_at 
    ? new Date(densityData.last_interaction_at)
    : new Date();
  const timeMonths = Math.max(1, Math.floor(
    (Date.now() - firstInteraction.getTime()) / (1000 * 60 * 60 * 24 * 30)
  ));

  // Λ = λ_A + λ_B (상호 시간가치)
  const mutualTimeValue = lambdaAVal + lambdaBVal;

  // V = P × Λ × e^(σt)
  const synergyMultiplier = calculateSynergyMultiplier(sigma, timeMonths);
  const valueSTU = calculateRelationshipValue(density, mutualTimeValue, sigma, timeMonths);
  const valueMoney = valueSTU * omega;

  // 건강도 평가
  const assessment = assessRelationshipHealth(density, sigma, synergyMultiplier);

  // 예측
  const predict = (months: number) => calculateRelationshipValue(
    density, mutualTimeValue, sigma, timeMonths + months
  );

  // 저장
  const { data, error } = await getSupabaseAdmin()
    .from('relationship_value')
    .upsert({
      org_id,
      node_a_id: sortedA,
      node_b_id: sortedB,
      value_stu: valueSTU,
      value_money: valueMoney,
      density,
      mutual_time_value: mutualTimeValue,
      sigma,
      time_months: timeMonths,
      synergy_multiplier: synergyMultiplier,
      health_score: assessment.health_score,
      health_status: assessment.status,
      prediction_3months: predict(3),
      prediction_6months: predict(6),
      prediction_12months: predict(12),
      recommendations: assessment.recommendations,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'node_a_id,node_b_id' })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    relationship_value: data,
    calculation: {
      formula: 'V = P × Λ × e^(σt)',
      components: {
        P: density,
        lambda_A: lambdaAVal,
        lambda_B: lambdaBVal,
        mutual_time_value: mutualTimeValue,
        sigma,
        time_months: timeMonths,
        synergy_multiplier: synergyMultiplier,
      },
      result: {
        value_stu: valueSTU,
        value_money: valueMoney,
      },
    },
    assessment,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Org Omega
// ═══════════════════════════════════════════════════════════════════════════
async function getOrgOmega(orgId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('org_omega')
    .select('*')
    .eq('org_id', orgId)
    .order('period_start', { ascending: false })
    .limit(12);

  if (error) throw error;

  return NextResponse.json({
    current: data?.[0] || null,
    history: data || [],
    formula: 'ω = 총 매출 / 총 투입 STU',
  });
}

async function updateOrgOmega(body: any) {
  const {
    org_id,
    total_revenue,
    total_stu_invested,
    period_start,
    period_end,
    industry_benchmark,
  } = body;

  // ω 계산
  const omega = total_stu_invested > 0 
    ? total_revenue / total_stu_invested 
    : 30000;

  const { data, error } = await getSupabaseAdmin()
    .from('org_omega')
    .upsert({
      org_id,
      omega,
      total_revenue,
      total_stu_invested,
      calculation_period: 'monthly',
      period_start: period_start || new Date().toISOString(),
      period_end: period_end || new Date().toISOString(),
      industry_benchmark,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id,period_start' })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    org_omega: data,
    calculation: {
      formula: 'ω = 총 매출 / 총 투입 STU',
      total_revenue,
      total_stu_invested,
      omega,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Recalculate All
// ═══════════════════════════════════════════════════════════════════════════
async function recalculateAllValues(orgId: string) {
  // 모든 관계 조회
  const { data: relationships } = await getSupabaseAdmin()
    .from('relationship_sigma')
    .select('node_a_id, node_b_id')
    .eq('org_id', orgId);

  if (!relationships?.length) {
    return NextResponse.json({
      success: true,
      message: 'No relationships to recalculate',
      processed: 0,
    });
  }

  let processed = 0;
  const errors: any[] = [];

  for (const rel of relationships) {
    try {
      await calculateAndSaveRelationshipValue({
        org_id: orgId,
        node_a_id: rel.node_a_id,
        node_b_id: rel.node_b_id,
      });
      processed++;
    } catch (err: any) {
      errors.push({ relationship: rel, error: err.message });
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    message: `Recalculated ${processed} relationships`,
    processed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
