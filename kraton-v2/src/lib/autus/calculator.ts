/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Org Value Calculator
 * 
 * 조직 전체의 관계 가치를 계산하는 Calculator
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  calculateValueFull,
  calculateOmega,
  getMonthsDiff,
  getRelationKey,
  sortByValue,
  sortBySigma,
} from './engine';
import type {
  NodeLambda,
  RelationSigma,
  RelationDensity,
  TimeRecord,
  RelationValue,
  NodeValue,
  OrgValueSnapshot,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data (실제 Supabase 연동 전)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_LAMBDAS: NodeLambda[] = [
  { org_id: 'demo', node_id: 'owner-1', node_type: 'staff', name: '김원장', role: 'owner', lambda: 5.0, lambda_base: 5.0, components: { replaceability: 0.1, influence: 0.9, expertise: 0.9, network_position: 0.9 } },
  { org_id: 'demo', node_id: 'teacher-1', node_type: 'staff', name: '박강사', role: 'teacher', lambda: 2.0, lambda_base: 2.0, components: { replaceability: 0.5, influence: 0.6, expertise: 0.7, network_position: 0.5 } },
  { org_id: 'demo', node_id: 'teacher-2', node_type: 'staff', name: '이강사', role: 'teacher', lambda: 2.0, lambda_base: 2.0, components: { replaceability: 0.5, influence: 0.5, expertise: 0.6, network_position: 0.4 } },
  { org_id: 'demo', node_id: 'student-1', node_type: 'student', name: '학생A', role: 'student', lambda: 1.0, lambda_base: 1.0, components: { replaceability: 1.0, influence: 0.1, expertise: 0.1, network_position: 0.1 } },
  { org_id: 'demo', node_id: 'student-2', node_type: 'student', name: '학생B', role: 'student', lambda: 1.0, lambda_base: 1.0, components: { replaceability: 1.0, influence: 0.1, expertise: 0.1, network_position: 0.1 } },
  { org_id: 'demo', node_id: 'student-3', node_type: 'student', name: '학생C', role: 'student', lambda: 1.0, lambda_base: 1.0, components: { replaceability: 1.0, influence: 0.2, expertise: 0.2, network_position: 0.2 } },
  { org_id: 'demo', node_id: 'parent-1', node_type: 'parent', name: '학부모A', role: 'parent', lambda: 1.2, lambda_base: 1.2, components: { replaceability: 0.8, influence: 0.3, expertise: 0.1, network_position: 0.2 } },
  { org_id: 'demo', node_id: 'parent-2', node_type: 'parent', name: '학부모B', role: 'parent', lambda: 1.2, lambda_base: 1.2, components: { replaceability: 0.8, influence: 0.4, expertise: 0.1, network_position: 0.3 } },
];

const MOCK_SIGMAS: RelationSigma[] = [
  { org_id: 'demo', node_a_id: 'teacher-1', node_a_type: 'staff', node_b_id: 'student-1', node_b_type: 'student', sigma: 0.25, components: { compatibility: 0.3, goal_alignment: 0.4, value_match: 0.2, rhythm_sync: 0.1 }, measurement_type: 'measured', confidence: 0.8, relation_started_at: '2024-06-01', relation_duration_months: 7 },
  { org_id: 'demo', node_a_id: 'teacher-1', node_a_type: 'staff', node_b_id: 'student-2', node_b_type: 'student', sigma: 0.15, components: { compatibility: 0.2, goal_alignment: 0.2, value_match: 0.1, rhythm_sync: 0.1 }, measurement_type: 'estimated', confidence: 0.6, relation_started_at: '2024-09-01', relation_duration_months: 4 },
  { org_id: 'demo', node_a_id: 'teacher-2', node_a_type: 'staff', node_b_id: 'student-3', node_b_type: 'student', sigma: -0.1, components: { compatibility: -0.2, goal_alignment: 0.1, value_match: -0.1, rhythm_sync: -0.1 }, measurement_type: 'measured', confidence: 0.7, relation_started_at: '2024-07-01', relation_duration_months: 6 },
  { org_id: 'demo', node_a_id: 'owner-1', node_a_type: 'staff', node_b_id: 'parent-1', node_b_type: 'parent', sigma: 0.3, components: { compatibility: 0.4, goal_alignment: 0.3, value_match: 0.3, rhythm_sync: 0.2 }, measurement_type: 'measured', confidence: 0.9, relation_started_at: '2024-01-01', relation_duration_months: 12 },
  { org_id: 'demo', node_a_id: 'teacher-1', node_a_type: 'staff', node_b_id: 'parent-2', node_b_type: 'parent', sigma: 0.1, components: { compatibility: 0.1, goal_alignment: 0.2, value_match: 0.1, rhythm_sync: 0.0 }, measurement_type: 'estimated', confidence: 0.5, relation_started_at: '2024-08-01', relation_duration_months: 5 },
];

const MOCK_DENSITIES: RelationDensity[] = [
  { org_id: 'demo', node_a_id: 'teacher-1', node_b_id: 'student-1', density: 0.72, components: { frequency: 0.8, depth: 0.6, quality: 0.9 }, period_start: '2025-01-01', period_end: '2025-01-31', interaction_count: 16, total_duration_minutes: 1440 },
  { org_id: 'demo', node_a_id: 'teacher-1', node_b_id: 'student-2', density: 0.55, components: { frequency: 0.6, depth: 0.4, quality: 0.95 }, period_start: '2025-01-01', period_end: '2025-01-31', interaction_count: 12, total_duration_minutes: 1080 },
  { org_id: 'demo', node_a_id: 'teacher-2', node_b_id: 'student-3', density: 0.4, components: { frequency: 0.4, depth: 0.4, quality: 0.85 }, period_start: '2025-01-01', period_end: '2025-01-31', interaction_count: 8, total_duration_minutes: 720 },
  { org_id: 'demo', node_a_id: 'owner-1', node_b_id: 'parent-1', density: 0.35, components: { frequency: 0.2, depth: 0.6, quality: 1.0 }, period_start: '2025-01-01', period_end: '2025-01-31', interaction_count: 4, total_duration_minutes: 120 },
  { org_id: 'demo', node_a_id: 'teacher-1', node_b_id: 'parent-2', density: 0.28, components: { frequency: 0.2, depth: 0.4, quality: 0.95 }, period_start: '2025-01-01', period_end: '2025-01-31', interaction_count: 4, total_duration_minutes: 60 },
];

const MOCK_TIME_RECORDS: Array<{ relation_key: string; time_a_to_b: number; time_b_to_a: number }> = [
  { relation_key: 'student-1:teacher-1', time_a_to_b: 16, time_b_to_a: 24 },  // 학생→강사: 16h, 강사→학생: 24h
  { relation_key: 'student-2:teacher-1', time_a_to_b: 16, time_b_to_a: 18 },
  { relation_key: 'student-3:teacher-2', time_a_to_b: 12, time_b_to_a: 12 },
  { relation_key: 'owner-1:parent-1', time_a_to_b: 2, time_b_to_a: 1 },
  { relation_key: 'parent-2:teacher-1', time_a_to_b: 0.5, time_b_to_a: 1 },
];

// ═══════════════════════════════════════════════════════════════════════════
// Calculator
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 조직 전체 가치 스냅샷 계산
 */
export async function calculateOrgValue(orgId: string): Promise<OrgValueSnapshot> {
  // Mock 데이터 사용 (실제로는 Supabase에서 조회)
  const lambdas = MOCK_LAMBDAS.filter(l => l.org_id === 'demo');
  const sigmas = MOCK_SIGMAS.filter(s => s.org_id === 'demo');
  const densities = MOCK_DENSITIES.filter(d => d.org_id === 'demo');
  const timeRecords = MOCK_TIME_RECORDS;
  
  // 월 매출 (Mock)
  const monthlyRevenue = 45000000;
  
  // Lambda Map
  const lambdaMap = new Map<string, NodeLambda>();
  lambdas.forEach(l => lambdaMap.set(l.node_id, l));
  
  // Sigma Map
  const sigmaMap = new Map<string, RelationSigma>();
  sigmas.forEach(s => {
    const key = getRelationKey(s.node_a_id, s.node_b_id);
    sigmaMap.set(key, s);
  });
  
  // Density Map
  const densityMap = new Map<string, RelationDensity>();
  densities.forEach(d => {
    const key = getRelationKey(d.node_a_id, d.node_b_id);
    densityMap.set(key, d);
  });
  
  // Time Map
  const timeMap = new Map<string, { time_a_to_b: number; time_b_to_a: number }>();
  timeRecords.forEach(t => {
    timeMap.set(t.relation_key, { time_a_to_b: t.time_a_to_b, time_b_to_a: t.time_b_to_a });
  });
  
  // 노드별 가치 Map
  const nodeValueMap = new Map<string, NodeValue>();
  lambdas.forEach(l => {
    nodeValueMap.set(l.node_id, {
      node_id: l.node_id,
      node_type: l.node_type,
      name: l.name || l.node_id,
      role: l.role,
      lambda: l.lambda,
      total_value_stu: 0,
      total_value_krw: 0,
      relation_count: 0,
    });
  });
  
  // 관계별 가치 계산
  const relationValues: RelationValue[] = [];
  let totalValueSTU = 0;
  let totalInputSTU = 0;
  
  timeMap.forEach((time, key) => {
    const [nodeAId, nodeBId] = key.split(':');
    
    const lambdaA = lambdaMap.get(nodeAId)?.lambda || 1.0;
    const lambdaB = lambdaMap.get(nodeBId)?.lambda || 1.0;
    const density = densityMap.get(key)?.density || 0.5;
    const sigmaData = sigmaMap.get(key);
    const sigma = sigmaData?.sigma || 0;
    const durationMonths = sigmaData?.relation_duration_months || 3;
    
    // 가치 계산
    const valueResult = calculateValueFull({
      density,
      lambda_a: lambdaA,
      lambda_b: lambdaB,
      time_a_to_b_hours: time.time_a_to_b,
      time_b_to_a_hours: time.time_b_to_a,
      sigma,
      duration_months: durationMonths,
    });
    
    const relationValue: RelationValue = {
      node_a_id: nodeAId,
      node_a_name: lambdaMap.get(nodeAId)?.name || nodeAId,
      node_b_id: nodeBId,
      node_b_name: lambdaMap.get(nodeBId)?.name || nodeBId,
      ...valueResult,
    };
    
    relationValues.push(relationValue);
    totalValueSTU += relationValue.value_stu;
    totalInputSTU += (lambdaA * time.time_a_to_b) + (lambdaB * time.time_b_to_a);
    
    // 노드별 가치 합산
    const nodeA = nodeValueMap.get(nodeAId);
    const nodeB = nodeValueMap.get(nodeBId);
    if (nodeA) {
      nodeA.total_value_stu += relationValue.value_stu / 2;
      nodeA.relation_count += 1;
    }
    if (nodeB) {
      nodeB.total_value_stu += relationValue.value_stu / 2;
      nodeB.relation_count += 1;
    }
  });
  
  // ω 계산
  const omega = calculateOmega(monthlyRevenue, totalInputSTU);
  const totalValueKRW = Math.round(totalValueSTU * omega);
  
  // KRW 값 설정
  relationValues.forEach(r => {
    r.value_krw = Math.round(r.value_stu * omega);
  });
  nodeValueMap.forEach(n => {
    n.total_value_krw = Math.round(n.total_value_stu * omega);
  });
  
  // 통계 계산
  const avgLambda = lambdas.length > 0
    ? lambdas.reduce((sum, l) => sum + l.lambda, 0) / lambdas.length
    : 1.0;
  const avgSigma = sigmas.length > 0
    ? sigmas.reduce((sum, s) => sum + s.sigma, 0) / sigmas.length
    : 0;
  const avgDensity = densities.length > 0
    ? densities.reduce((sum, d) => sum + d.density, 0) / densities.length
    : 0.5;
  
  // 정렬
  const allNodes = Array.from(nodeValueMap.values());
  const topNodes = [...allNodes].sort(sortByValue).slice(0, 10);
  const topRelations = [...relationValues].sort(sortByValue).slice(0, 10);
  const riskRelations = [...relationValues]
    .filter(r => r.components.sigma < 0)
    .sort(sortBySigma)
    .slice(0, 10);
  
  return {
    org_id: orgId,
    total_value_stu: Math.round(totalValueSTU * 100) / 100,
    total_value_krw: totalValueKRW,
    node_count: lambdas.length,
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

/**
 * 100명 학원 시뮬레이션
 */
export function simulateAcademy(): OrgValueSnapshot {
  // 시뮬레이션 파라미터
  const studentCount = 100;
  const teacherCount = 5;
  const avgMonthlyHours = 16;  // 학생당 월 수업 시간
  const avgSigma = 0.1;        // 평균 시너지
  const avgDensity = 0.5;      // 평균 밀도
  const durationMonths = 6;    // 평균 관계 기간
  const monthlyRevenue = 45000000;
  
  // λ 설정
  const lambdas = {
    owner: 5.0,
    manager: 3.5,
    teacher: 2.0,
    admin: 1.5,
    student: 1.0,
    parent: 1.2,
  };
  
  // 총 투입 STU 계산
  // 강사 → 학생: teacherCount × (studentCount / teacherCount) × avgMonthlyHours × λ_teacher
  const teacherSTU = teacherCount * (studentCount / teacherCount) * avgMonthlyHours * lambdas.teacher;
  // 학생 → 강사: studentCount × avgMonthlyHours × λ_student
  const studentSTU = studentCount * avgMonthlyHours * lambdas.student;
  const totalInputSTU = teacherSTU + studentSTU;
  
  // ω 계산
  const omega = Math.round(monthlyRevenue / totalInputSTU);
  
  // 시너지 배율
  const synergyMultiplier = Math.exp(avgSigma * durationMonths);
  
  // 총 가치 (V = P × Λ × S(t))
  const mutualTimeValue = teacherSTU + studentSTU;  // Λ
  const totalValueSTU = avgDensity * mutualTimeValue * synergyMultiplier;
  const totalValueKRW = Math.round(totalValueSTU * omega);
  
  return {
    org_id: 'simulation',
    total_value_stu: Math.round(totalValueSTU * 100) / 100,
    total_value_krw: totalValueKRW,
    node_count: 1 + 1 + teacherCount + 1 + studentCount + studentCount,  // 원장 + 실장 + 강사 + 행정 + 학생 + 학부모
    relation_count: teacherCount * (studentCount / teacherCount) + studentCount,  // 강사-학생 + 강사-학부모
    avg_lambda: 1.15,
    avg_sigma: avgSigma,
    avg_density: avgDensity,
    omega,
    top_nodes: [],
    top_relations: [],
    risk_relations: [],
    calculated_at: new Date().toISOString(),
  };
}
