/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Value Dashboard API
 * 
 * V = P × Λ × e^(σt)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// 기본값 상수
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_LAMBDAS: Record<string, number> = {
  owner: 5.0,
  director: 3.5,
  senior_teacher: 3.0,
  teacher: 2.0,
  junior_teacher: 1.5,
  admin: 1.5,
  student: 1.0,
  parent: 1.2,
};

const SATURATION_PARAMS = { s_max: 50, tau: 24 };

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function calculateSaturatedSynergyMultiplier(
  sigma: number,
  durationMonths: number
): number {
  if (sigma > 0) {
    const multiplier = SATURATION_PARAMS.s_max * (1 - Math.exp(-sigma * durationMonths / SATURATION_PARAMS.tau));
    return Math.max(1, multiplier);
  } else if (sigma < 0) {
    return Math.exp(sigma * durationMonths);
  }
  return 1;
}

function calculateOmega(totalRevenue: number, totalSTU: number): number {
  if (totalSTU <= 0) return 30000;
  return Math.round(totalRevenue / totalSTU);
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_NODES = [
  { node_id: 'owner-1', name: '김원장', role: 'owner', lambda: 5.0, node_type: 'staff' },
  { node_id: 'teacher-1', name: '박강사', role: 'teacher', lambda: 2.0, node_type: 'staff' },
  { node_id: 'teacher-2', name: '이강사', role: 'teacher', lambda: 2.0, node_type: 'staff' },
  { node_id: 'teacher-3', name: '최강사', role: 'senior_teacher', lambda: 3.0, node_type: 'staff' },
  { node_id: 'student-1', name: '학생A', role: 'student', lambda: 1.0, node_type: 'student' },
  { node_id: 'student-2', name: '학생B', role: 'student', lambda: 1.0, node_type: 'student' },
  { node_id: 'student-3', name: '학생C', role: 'student', lambda: 1.0, node_type: 'student' },
  { node_id: 'student-4', name: '학생D', role: 'student', lambda: 1.0, node_type: 'student' },
  { node_id: 'student-5', name: '학생E', role: 'student', lambda: 1.0, node_type: 'student' },
  { node_id: 'parent-1', name: '학부모A', role: 'parent', lambda: 1.2, node_type: 'parent' },
  { node_id: 'parent-2', name: '학부모B', role: 'parent', lambda: 1.2, node_type: 'parent' },
];

const MOCK_RELATIONS = [
  { node_a: 'teacher-1', node_b: 'student-1', sigma: 0.25, density: 0.72, duration: 7, time_a: 24, time_b: 16 },
  { node_a: 'teacher-1', node_b: 'student-2', sigma: 0.15, density: 0.55, duration: 4, time_a: 18, time_b: 16 },
  { node_a: 'teacher-2', node_b: 'student-3', sigma: -0.1, density: 0.40, duration: 6, time_a: 12, time_b: 12 },
  { node_a: 'teacher-2', node_b: 'student-4', sigma: 0.20, density: 0.65, duration: 8, time_a: 20, time_b: 16 },
  { node_a: 'teacher-3', node_b: 'student-5', sigma: 0.30, density: 0.80, duration: 12, time_a: 28, time_b: 20 },
  { node_a: 'owner-1', node_b: 'parent-1', sigma: 0.30, density: 0.35, duration: 12, time_a: 2, time_b: 1 },
  { node_a: 'teacher-1', node_b: 'parent-2', sigma: 0.10, density: 0.28, duration: 5, time_a: 1, time_b: 0.5 },
];

// ═══════════════════════════════════════════════════════════════════════════
// Calculate Organization Value
// ═══════════════════════════════════════════════════════════════════════════

function calculateOrgValue(orgId: string) {
  const nodeMap = new Map(MOCK_NODES.map(n => [n.node_id, n]));
  
  // 관계별 가치 계산
  const relationValues = MOCK_RELATIONS.map(rel => {
    const nodeA = nodeMap.get(rel.node_a);
    const nodeB = nodeMap.get(rel.node_b);
    if (!nodeA || !nodeB) return null;
    
    const lambdaA = nodeA.lambda;
    const lambdaB = nodeB.lambda;
    const mutualTimeValue = (lambdaA * rel.time_a) + (lambdaB * rel.time_b);
    const synergyMultiplier = calculateSaturatedSynergyMultiplier(rel.sigma, rel.duration);
    const valueSTU = rel.density * mutualTimeValue * synergyMultiplier;
    
    return {
      node_a_id: rel.node_a,
      node_a_name: nodeA.name,
      node_b_id: rel.node_b,
      node_b_name: nodeB.name,
      value_stu: Math.round(valueSTU * 100) / 100,
      value_krw: 0,
      components: {
        lambda_a: lambdaA,
        lambda_b: lambdaB,
        time_a_to_b: rel.time_a,
        time_b_to_a: rel.time_b,
        density: rel.density,
        sigma: rel.sigma,
        synergy_multiplier: Math.round(synergyMultiplier * 100) / 100,
      },
    };
  }).filter(Boolean) as any[];
  
  // 총 가치
  const totalValueSTU = relationValues.reduce((sum, r) => sum + r.value_stu, 0);
  
  // 총 투입 STU
  const totalInputSTU = MOCK_RELATIONS.reduce((sum, rel) => {
    const nodeA = nodeMap.get(rel.node_a);
    const nodeB = nodeMap.get(rel.node_b);
    if (!nodeA || !nodeB) return sum;
    return sum + (nodeA.lambda * rel.time_a) + (nodeB.lambda * rel.time_b);
  }, 0);
  
  // ω 계산 (월 매출 4500만원 가정)
  const monthlyRevenue = 45000000;
  const omega = calculateOmega(monthlyRevenue, totalInputSTU);
  const totalValueKRW = Math.round(totalValueSTU * omega);
  
  // KRW 설정
  relationValues.forEach(r => {
    r.value_krw = Math.round(r.value_stu * omega);
  });
  
  // 노드별 가치
  const nodeValueMap = new Map<string, any>();
  MOCK_NODES.forEach(n => {
    nodeValueMap.set(n.node_id, {
      node_id: n.node_id,
      name: n.name,
      role: n.role,
      lambda: n.lambda,
      node_type: n.node_type,
      total_value_stu: 0,
      total_value_krw: 0,
      relation_count: 0,
    });
  });
  
  relationValues.forEach(r => {
    const nodeA = nodeValueMap.get(r.node_a_id);
    const nodeB = nodeValueMap.get(r.node_b_id);
    if (nodeA) {
      nodeA.total_value_stu += r.value_stu / 2;
      nodeA.relation_count += 1;
    }
    if (nodeB) {
      nodeB.total_value_stu += r.value_stu / 2;
      nodeB.relation_count += 1;
    }
  });
  
  nodeValueMap.forEach(n => {
    n.total_value_krw = Math.round(n.total_value_stu * omega);
    n.total_value_stu = Math.round(n.total_value_stu * 100) / 100;
  });
  
  // 통계
  const avgLambda = MOCK_NODES.reduce((sum, n) => sum + n.lambda, 0) / MOCK_NODES.length;
  const avgSigma = MOCK_RELATIONS.reduce((sum, r) => sum + r.sigma, 0) / MOCK_RELATIONS.length;
  const avgDensity = MOCK_RELATIONS.reduce((sum, r) => sum + r.density, 0) / MOCK_RELATIONS.length;
  
  // 정렬
  const allNodes = Array.from(nodeValueMap.values());
  const topNodes = [...allNodes].sort((a, b) => b.total_value_stu - a.total_value_stu).slice(0, 10);
  const topRelations = [...relationValues].sort((a, b) => b.value_stu - a.value_stu).slice(0, 10);
  const riskRelations = relationValues.filter(r => r.components.sigma < 0).sort((a, b) => a.components.sigma - b.components.sigma).slice(0, 10);
  
  return {
    org_id: orgId,
    total_value_stu: Math.round(totalValueSTU * 100) / 100,
    total_value_krw: totalValueKRW,
    node_count: MOCK_NODES.length,
    relation_count: relationValues.length,
    avg_lambda: Math.round(avgLambda * 100) / 100,
    avg_sigma: Math.round(avgSigma * 1000) / 1000,
    avg_density: Math.round(avgDensity * 1000) / 1000,
    omega,
    top_nodes: topNodes,
    top_relations: topRelations,
    risk_relations: riskRelations,
    calculated_at: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id') || 'demo';
  
  try {
    const snapshot = calculateOrgValue(orgId);
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_value_stu: snapshot.total_value_stu,
          total_value_krw: snapshot.total_value_krw,
          node_count: snapshot.node_count,
          relation_count: snapshot.relation_count,
          omega: snapshot.omega,
        },
        averages: {
          lambda: snapshot.avg_lambda,
          sigma: snapshot.avg_sigma,
          density: snapshot.avg_density,
        },
        top_nodes: snapshot.top_nodes,
        top_relations: snapshot.top_relations,
        risk_relations: snapshot.risk_relations,
        calculated_at: snapshot.calculated_at,
        formula: 'V = P × Λ × e^(σt)',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, org_id } = body;
    
    switch (action) {
      case 'simulate_academy': {
        // 100명 학원 시뮬레이션
        const studentCount = body.student_count || 100;
        const teacherCount = body.teacher_count || 5;
        const avgMonthlyHours = 16;
        const avgSigma = 0.1;
        const avgDensity = 0.5;
        const durationMonths = 6;
        const monthlyRevenue = body.monthly_revenue || 45000000;
        
        const teacherSTU = teacherCount * (studentCount / teacherCount) * avgMonthlyHours * 2.0;
        const studentSTU = studentCount * avgMonthlyHours * 1.0;
        const totalInputSTU = teacherSTU + studentSTU;
        const omega = Math.round(monthlyRevenue / totalInputSTU);
        
        const synergyMultiplier = Math.exp(avgSigma * durationMonths);
        const mutualTimeValue = teacherSTU + studentSTU;
        const totalValueSTU = avgDensity * mutualTimeValue * synergyMultiplier;
        const totalValueKRW = Math.round(totalValueSTU * omega);
        
        // AUTUS 도입 후 시뮬레이션
        const afterSigma = 0.15;
        const afterDensity = 0.6;
        const afterSynergyMultiplier = Math.exp(afterSigma * durationMonths);
        const afterValueSTU = afterDensity * mutualTimeValue * afterSynergyMultiplier;
        const afterValueKRW = Math.round(afterValueSTU * omega);
        
        const improvement = ((afterValueSTU - totalValueSTU) / totalValueSTU) * 100;
        
        return NextResponse.json({
          success: true,
          data: {
            before: {
              total_value_stu: Math.round(totalValueSTU * 100) / 100,
              total_value_krw: totalValueKRW,
              sigma: avgSigma,
              density: avgDensity,
              synergy_multiplier: Math.round(synergyMultiplier * 100) / 100,
            },
            after: {
              total_value_stu: Math.round(afterValueSTU * 100) / 100,
              total_value_krw: afterValueKRW,
              sigma: afterSigma,
              density: afterDensity,
              synergy_multiplier: Math.round(afterSynergyMultiplier * 100) / 100,
            },
            improvement_percent: Math.round(improvement * 100) / 100,
            node_count: 1 + 1 + teacherCount + 1 + studentCount + studentCount,
            omega,
          },
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
