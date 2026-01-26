/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⏱️ AUTUS 시간 측정 체계 (Time Value Engine)
 * 
 * 핵심 공식:
 * - V = P × Λ × e^(σt)
 * - t_STU = t_real × λ
 * - NRV = P × (T₃ - T₁ + T₂) × e^(σt)
 * 
 * 공리:
 * 1. 모든 가치는 시간이다 (All Value is Time)
 * 2. 동일한 시간도 노드마다 가치가 다르다 (t_표준 = t_실제 × λ)
 * 3. 관계의 시너지는 시간에 지수로 작용한다 (V ∝ e^(σt))
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
  NodeLambda,
  TimeMetrics,
  RelationshipSigma,
  RelationshipDensity,
  TimeValueResult,
  STUConversion,
  LambdaFactors,
  SigmaFactors,
  DensityFactors,
  NetTimeValue,
} from './time-types';

// ═══════════════════════════════════════════════════════════════════════════
// λ (Lambda): 노드 시간상수
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 노드의 λ (시간상수) 계산
 * λ = (1/R) × I × E × N × k
 * 
 * @param factors - 대체가능성, 영향력, 전문성, 네트워크 위치
 * @param industryK - 산업별 보정상수 (기본 0.3)
 * @returns λ 값 (최소 1.0)
 */
export function calculateLambda(factors: LambdaFactors, industryK: number = 0.3): number {
  const {
    replaceability,  // R: 0~1 (0.1 = 대체 어려움)
    influence,       // I: 0~1
    expertise,       // E: 0~1
    network,         // N: 0~1
  } = factors;

  // 대체가능성의 역수 (최소 1)
  const replaceabilityInverse = 1 / Math.max(0.05, replaceability);
  
  // λ 계산
  const rawLambda = replaceabilityInverse * influence * expertise * network * industryK;
  
  // 최소값 보정 (모든 시간은 최소 1 STU 가치)
  return Math.max(1.0, rawLambda);
}

/**
 * 역할 기반 기본 λ 값 (AUTUS Spec v1.0)
 * 
 * λ_min = 0.5, λ_max = 10.0
 */
export const DEFAULT_LAMBDA_BY_ROLE: Record<string, number> = {
  // ═══════════ AUTUS 내부 역할 (Tier) ═══════════
  c_level: 5.0,           // 원장/대표 - 대체 불가, 최대 영향력
  owner: 5.0,             // alias
  ceo: 5.0,               // alias
  
  fsd: 3.5,               // 실장/부원장 - 낮은 대체성, 높은 영향력
  manager: 3.5,           // alias
  
  optimus: 2.0,           // 일반 실무자
  
  // ═══════════ 교육 도메인 역할 ═══════════
  head_teacher: 3.5,      // 실장급
  senior_teacher: 3.0,    // 수석 강사 - 전문성 높음
  teacher: 2.0,           // 일반 강사 - 중간 전문성
  junior_teacher: 1.5,    // 신입 강사 - 학습 중
  
  // ═══════════ 지원 역할 ═══════════
  admin: 1.5,             // 행정 직원 - 대체 가능
  
  // ═══════════ 외부 이용자 역할 ═══════════
  student: 1.0,           // 학생 - 기준 노드 (λ = 1.0)
  consumer: 1.0,          // alias
  
  parent: 1.2,            // 학부모 - 의사결정권 보유
  
  regulatory: 2.0,        // 규제기관
  partner: 2.5,           // 파트너
};

/**
 * λ 제약 조건
 */
export const LAMBDA_CONSTRAINTS = {
  min: 0.5,
  max: 10.0,
  base: 1.0,  // 기준 노드의 λ
};

/**
 * λ 값 범위 제한 적용
 */
export function clampLambda(lambda: number): number {
  return Math.min(LAMBDA_CONSTRAINTS.max, Math.max(LAMBDA_CONSTRAINTS.min, lambda));
}

/**
 * λ 동적 성장 계산
 * λ(t) = λ₀ × e^(γt)
 * 
 * @param baseLambda - 초기 λ 값
 * @param growthRate - γ (연간 성장률)
 * @param years - 경과 연수
 */
export function calculateLambdaGrowth(
  baseLambda: number,
  growthRate: number,
  years: number
): number {
  return baseLambda * Math.exp(growthRate * years);
}

/**
 * 성과 기반 λ 조정
 */
export function adjustLambdaByPerformance(
  baseLambda: number,
  performanceScore: number, // 0-100
  learningProgress: number, // 0-1
  networkGrowth: number     // 연결 노드 증가율
): number {
  const performanceFactor = 0.5 + (performanceScore / 100);
  const learningFactor = 1 + (learningProgress * 0.3);
  const networkFactor = 1 + (networkGrowth * 0.2);
  
  return baseLambda * performanceFactor * learningFactor * networkFactor;
}

// ═══════════════════════════════════════════════════════════════════════════
// σ (Sigma): 시너지 계수
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 두 노드 간 시너지 계수 계산
 * σ = w₁C + w₂G + w₃V + w₄R
 * 
 * @param factors - 호환성, 목표일치, 가치관일치, 리듬동기화
 * @param weights - 가중치 (합 = 1)
 */
export function calculateSigma(
  factors: SigmaFactors,
  weights: { c: number; g: number; v: number; r: number } = { c: 0.3, g: 0.3, v: 0.2, r: 0.2 }
): number {
  const {
    compatibility,    // C: -1 ~ +1 (스타일 호환)
    goalAlignment,    // G: -1 ~ +1 (목표 일치)
    valueMatch,       // V: -1 ~ +1 (가치관 일치)
    rhythmSync,       // R: -1 ~ +1 (리듬 동기화)
  } = factors;

  return (
    weights.c * compatibility +
    weights.g * goalAlignment +
    weights.v * valueMatch +
    weights.r * rhythmSync
  );
}

/**
 * 스타일 호환성 매트릭스
 */
export const STYLE_COMPATIBILITY_MATRIX: Record<string, Record<string, number>> = {
  strict: {
    self_directed: 0.4,
    guided: 0.2,
    visual: 0.0,
    hands_on: -0.2,
    mixed: 0.1,
  },
  supportive: {
    self_directed: -0.1,
    guided: 0.5,
    visual: 0.2,
    hands_on: 0.3,
    mixed: 0.2,
  },
  analytical: {
    self_directed: 0.5,
    guided: 0.1,
    visual: 0.1,
    hands_on: -0.1,
    mixed: 0.2,
  },
  creative: {
    self_directed: 0.2,
    guided: 0.1,
    visual: 0.5,
    hands_on: 0.4,
    mixed: 0.3,
  },
  balanced: {
    self_directed: 0.2,
    guided: 0.3,
    visual: 0.2,
    hands_on: 0.2,
    mixed: 0.4,
  },
};

/**
 * 스타일 기반 호환성 점수 계산
 */
export function getStyleCompatibility(
  teachingStyle: string,
  learningStyle: string
): number {
  return STYLE_COMPATIBILITY_MATRIX[teachingStyle]?.[learningStyle] ?? 0;
}

/**
 * 목표 벡터 간 유사도 계산 (코사인 유사도)
 */
export function calculateGoalAlignment(goalA: number[], goalB: number[]): number {
  if (goalA.length !== goalB.length || goalA.length === 0) return 0;
  
  const dotProduct = goalA.reduce((sum, a, i) => sum + a * goalB[i], 0);
  const magnitudeA = Math.sqrt(goalA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(goalB.reduce((sum, b) => sum + b * b, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * 시너지 배율 계산 (기본 버전)
 * 배율 = e^(σt)
 */
export function calculateSynergyMultiplier(sigma: number, timeMonths: number): number {
  // 연 단위로 변환 (시너지는 연간 복리로 작용)
  const years = timeMonths / 12;
  return Math.exp(sigma * years);
}

/**
 * 시너지 배율 계산 (포화 버전 - 발산 방지)
 * S(t) = S_max × (1 - e^(-σt/τ))
 * 
 * @param sigma - 시너지 계수
 * @param timeMonths - 관계 지속 기간 (개월)
 * @param sMax - 최대 배율 (기본 50)
 * @param tau - 포화 시간상수 (기본 24개월)
 */
export function calculateSaturatedSynergyMultiplier(
  sigma: number,
  timeMonths: number,
  sMax: number = 50,
  tau: number = 24
): number {
  if (sigma <= 0) {
    // 역시너지는 지수 감소 (발산 없음)
    return Math.exp(sigma * timeMonths / 12);
  }
  
  // 포화 함수: t→∞ 여도 sMax 이하로 수렴
  return sMax * (1 - Math.exp(-sigma * timeMonths / tau));
}

// ═══════════════════════════════════════════════════════════════════════════
// P (Density): 관계 밀도
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 관계 밀도 계산
 * P = F × Q × D
 * 
 * @param factors - 빈도, 품질, 깊이
 */
export function calculateDensity(factors: DensityFactors): number {
  const {
    frequency,  // F: 0~1 (접촉 빈도)
    quality,    // Q: 0~1 (상호작용 품질)
    depth,      // D: 0~1 (관계 깊이)
  } = factors;

  return frequency * quality * depth;
}

/**
 * 접촉 빈도 점수화
 */
export function frequencyToScore(
  actualContacts: number,
  expectedContacts: number
): number {
  if (expectedContacts === 0) return 0;
  return Math.min(1, actualContacts / expectedContacts);
}

/**
 * 관계 깊이 단계
 */
export const RELATIONSHIP_DEPTH_LEVELS: Record<string, number> = {
  awareness: 0.2,    // 인지
  familiarity: 0.4,  // 친숙
  trust: 0.6,        // 신뢰
  dependence: 0.8,   // 의존
  partnership: 1.0,  // 파트너
};

/**
 * 관계 밀도 감쇠 (상호작용 없을 때)
 * P_decayed = P × e^(-δ × Δt_idle)
 */
export function applyDensityDecay(
  currentDensity: number,
  idleDays: number,
  decayRate: number = 0.01 // δ: 일별 감쇠율
): number {
  const decayFactor = Math.exp(-decayRate * idleDays);
  return currentDensity * decayFactor;
}

// ═══════════════════════════════════════════════════════════════════════════
// STU (Standard Time Unit) 변환
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 실제 시간 → 표준 시간 (STU) 변환
 * t_STU = t_real × λ
 */
export function toSTU(realTimeHours: number, lambda: number): number {
  return realTimeHours * lambda;
}

/**
 * 표준 시간 (STU) → 화폐 가치 변환
 * V_₩ = t_STU × ω
 */
export function stuToMoney(stu: number, omega: number): number {
  return stu * omega;
}

/**
 * 실제 시간 → 화폐 가치 직접 변환
 * V_₩ = t_real × λ × ω
 */
export function realTimeToMoney(
  realTimeHours: number,
  lambda: number,
  omega: number
): number {
  return realTimeHours * lambda * omega;
}

/**
 * 조직의 ω (시간 단가) 계산
 * ω = 총 매출 / 총 투입 STU
 */
export function calculateOmega(
  totalRevenue: number,
  totalSTUInvested: number
): number {
  if (totalSTUInvested === 0) return 0;
  return totalRevenue / totalSTUInvested;
}

/**
 * 전체 변환 수행
 */
export function convertTime(input: {
  realTimeHours: number;
  lambda: number;
  omega: number;
}): STUConversion {
  const { realTimeHours, lambda, omega } = input;
  const stu = toSTU(realTimeHours, lambda);
  const monetaryValue = stuToMoney(stu, omega);
  
  return {
    real_time_hours: realTimeHours,
    lambda,
    stu,
    omega,
    monetary_value: monetaryValue,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// T₁, T₂, T₃ 시간 측정
// ═══════════════════════════════════════════════════════════════════════════

/**
 * T₁ (투입 시간) 계산
 * 관계 유지에 쓴 시간
 */
export function calculateT1(activities: {
  type: string;
  hours: number;
  lambda: number;
}[]): number {
  return activities.reduce((sum, act) => sum + (act.hours * act.lambda), 0);
}

/**
 * T₂ (절약 시간) 계산
 * 자동화/효율화로 절약된 시간
 */
export function calculateT2(efficiencies: {
  task: string;
  before_hours: number;
  after_hours: number;
  lambda: number;
}[]): number {
  return efficiencies.reduce((sum, eff) => {
    const saved = eff.before_hours - eff.after_hours;
    return sum + (saved * eff.lambda);
  }, 0);
}

/**
 * T₃ (창출 시간) 계산
 * 관계로 확보된 미래 시간
 */
export function calculateT3(projections: {
  type: string;
  expected_months: number;
  probability: number;
  monthly_hours: number;
  lambda: number;
}[]): number {
  return projections.reduce((sum, proj) => {
    const expectedHours = proj.expected_months * proj.monthly_hours * proj.probability;
    return sum + (expectedHours * proj.lambda);
  }, 0);
}

/**
 * 순시간가치 (Net Time Value) 계산
 * NTV = T₃ - T₁ + T₂
 */
export function calculateNetTimeValue(
  t1: number,  // 투입
  t2: number,  // 절약
  t3: number   // 창출
): NetTimeValue {
  const ntv = t3 - t1 + t2;
  
  return {
    t1_invested: t1,
    t2_saved: t2,
    t3_created: t3,
    net_time_value: ntv,
    efficiency_ratio: t1 > 0 ? (t2 + t3) / t1 : 0,
    roi_time: t1 > 0 ? ntv / t1 : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MVP 단순화 공식 (v1.0)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MVP 공식: V = λ × T × P
 * 시너지(σ) 없이 간단하게 시작
 * 
 * @param lambda - 역할별 λ 고정값
 * @param timeHours - 월간 상호작용 시간
 * @param density - P (출석률 × 참여도)
 */
export function calculateSimpleValue(
  lambda: number,
  timeHours: number,
  density: number
): number {
  return lambda * timeHours * density;
}

/**
 * MVP 관계 가치 계산 (상세)
 */
export function calculateMVPValue(input: {
  role: string;
  monthlyInteractionHours: number;
  attendanceRate: number;  // 0-1
  engagementRate: number;  // 0-1
}): {
  lambda: number;
  time: number;
  density: number;
  value: number;
  interpretation: string;
} {
  const lambda = DEFAULT_LAMBDA_BY_ROLE[input.role] || 1.0;
  const density = input.attendanceRate * input.engagementRate;
  const value = calculateSimpleValue(lambda, input.monthlyInteractionHours, density);
  
  // 해석
  let interpretation: string;
  if (value >= 50) interpretation = '핵심 관계';
  else if (value >= 20) interpretation = '활성 관계';
  else if (value >= 10) interpretation = '유지 관계';
  else if (value >= 5) interpretation = '약한 관계';
  else interpretation = '유령 관계';
  
  return {
    lambda,
    time: input.monthlyInteractionHours,
    density,
    value,
    interpretation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 최종 관계 가치 계산
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 관계 가치 계산 (AUTUS 최종 공식)
 * V = P × Λ × e^(σt)
 * 
 * @param density - P (관계 밀도)
 * @param mutualTimeValue - Λ (상호 시간가치 = λ_A·t_A + λ_B·t_B)
 * @param sigma - σ (시너지 계수)
 * @param timeMonths - t (관계 지속 기간, 개월)
 */
export function calculateRelationshipValue(
  density: number,
  mutualTimeValue: number,
  sigma: number,
  timeMonths: number
): TimeValueResult {
  const synergyMultiplier = calculateSynergyMultiplier(sigma, timeMonths);
  const rawValue = density * mutualTimeValue * synergyMultiplier;
  
  // 예측 (시너지 유지 가정)
  const predict = (futureMonths: number) => 
    density * mutualTimeValue * calculateSynergyMultiplier(sigma, timeMonths + futureMonths);
  
  return {
    value_stu: rawValue,
    components: {
      density,
      mutual_time_value: mutualTimeValue,
      sigma,
      time_months: timeMonths,
      synergy_multiplier: synergyMultiplier,
    },
    prediction: {
      value_3months: predict(3),
      value_6months: predict(6),
      value_12months: predict(12),
    },
    assessment: assessRelationshipHealth(density, sigma, synergyMultiplier),
  };
}

/**
 * 관계 건강도 평가
 */
function assessRelationshipHealth(
  density: number,
  sigma: number,
  synergyMultiplier: number
): {
  health_score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
} {
  // 건강 점수 계산 (0-100)
  const densityScore = density * 40;                           // 최대 40점
  const sigmaScore = (sigma + 1) / 2 * 30;                     // 최대 30점
  const multiplierScore = Math.min(30, synergyMultiplier * 5); // 최대 30점
  
  const healthScore = Math.round(densityScore + sigmaScore + multiplierScore);
  
  // 상태 판정
  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (healthScore >= 80) status = 'excellent';
  else if (healthScore >= 60) status = 'good';
  else if (healthScore >= 40) status = 'fair';
  else if (healthScore >= 20) status = 'poor';
  else status = 'critical';
  
  // 권장 사항
  const recommendations: string[] = [];
  if (density < 0.3) {
    recommendations.push('접촉 빈도를 높이세요');
  }
  if (sigma < 0) {
    recommendations.push('관계 시너지 개선이 필요합니다');
  }
  if (sigma > 0 && density < 0.5) {
    recommendations.push('좋은 시너지를 활용하여 관계를 더 깊게 만드세요');
  }
  if (healthScore < 40) {
    recommendations.push('관계 재정립이 필요합니다');
  }
  
  return { health_score: healthScore, status, recommendations };
}

/**
 * 순관계가치 (Net Relationship Value) 계산
 * NRV = P × (T₃ - T₁ + T₂) × e^(σt)
 */
export function calculateNetRelationshipValue(
  density: number,
  ntv: NetTimeValue,
  sigma: number,
  timeMonths: number,
  omega: number
): {
  nrv_stu: number;
  nrv_money: number;
  breakdown: {
    density: number;
    net_time_value: number;
    synergy_multiplier: number;
    omega: number;
  };
} {
  const synergyMultiplier = calculateSynergyMultiplier(sigma, timeMonths);
  const nrvSTU = density * ntv.net_time_value * synergyMultiplier;
  const nrvMoney = nrvSTU * omega;
  
  return {
    nrv_stu: nrvSTU,
    nrv_money: nrvMoney,
    breakdown: {
      density,
      net_time_value: ntv.net_time_value,
      synergy_multiplier: synergyMultiplier,
      omega,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 집계 및 분석 함수
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 노드의 총 시간 가치 집계
 */
export function aggregateNodeTimeValue(
  nodeId: string,
  relationships: {
    partner_id: string;
    density: number;
    sigma: number;
    time_months: number;
    partner_lambda: number;
    partner_time_invested: number;
  }[],
  nodeLambda: number,
  nodeTimeInvested: number
): {
  total_value_stu: number;
  relationship_count: number;
  avg_density: number;
  avg_sigma: number;
  best_relationship: string | null;
  worst_relationship: string | null;
} {
  if (relationships.length === 0) {
    return {
      total_value_stu: 0,
      relationship_count: 0,
      avg_density: 0,
      avg_sigma: 0,
      best_relationship: null,
      worst_relationship: null,
    };
  }

  let totalValue = 0;
  let totalDensity = 0;
  let totalSigma = 0;
  let best = { id: '', value: -Infinity };
  let worst = { id: '', value: Infinity };

  for (const rel of relationships) {
    const mutualTimeValue = 
      (nodeLambda * nodeTimeInvested) + 
      (rel.partner_lambda * rel.partner_time_invested);
    
    const result = calculateRelationshipValue(
      rel.density,
      mutualTimeValue,
      rel.sigma,
      rel.time_months
    );
    
    totalValue += result.value_stu;
    totalDensity += rel.density;
    totalSigma += rel.sigma;
    
    if (result.value_stu > best.value) {
      best = { id: rel.partner_id, value: result.value_stu };
    }
    if (result.value_stu < worst.value) {
      worst = { id: rel.partner_id, value: result.value_stu };
    }
  }

  return {
    total_value_stu: totalValue,
    relationship_count: relationships.length,
    avg_density: totalDensity / relationships.length,
    avg_sigma: totalSigma / relationships.length,
    best_relationship: best.id || null,
    worst_relationship: worst.id || null,
  };
}

/**
 * 조직 전체 시간 가치 대시보드 데이터
 */
export function generateTimeValueDashboard(
  orgData: {
    total_revenue_monthly: number;
    total_stu_invested_monthly: number;
    nodes: {
      id: string;
      role: string;
      lambda: number;
      t1_monthly: number;
      t2_monthly: number;
      t3_projected: number;
    }[];
    relationships: {
      node_a_id: string;
      node_b_id: string;
      density: number;
      sigma: number;
      duration_months: number;
    }[];
  }
): {
  omega: number;
  total_t1: number;
  total_t2: number;
  total_t3: number;
  org_ntv: number;
  total_relationship_value: number;
  efficiency_score: number;
  top_lambda_nodes: { id: string; lambda: number }[];
  strongest_relationships: { node_a: string; node_b: string; sigma: number }[];
  weakest_relationships: { node_a: string; node_b: string; sigma: number }[];
} {
  const omega = calculateOmega(
    orgData.total_revenue_monthly,
    orgData.total_stu_invested_monthly
  );

  let totalT1 = 0;
  let totalT2 = 0;
  let totalT3 = 0;

  // 노드별 시간 집계
  for (const node of orgData.nodes) {
    totalT1 += node.t1_monthly * node.lambda;
    totalT2 += node.t2_monthly * node.lambda;
    totalT3 += node.t3_projected * node.lambda;
  }

  const orgNTV = totalT3 - totalT1 + totalT2;

  // 관계 가치 계산
  let totalRelValue = 0;
  const relWithValues = orgData.relationships.map(rel => {
    const nodeA = orgData.nodes.find(n => n.id === rel.node_a_id);
    const nodeB = orgData.nodes.find(n => n.id === rel.node_b_id);
    
    if (!nodeA || !nodeB) return { ...rel, value: 0 };
    
    const mutualValue = (nodeA.lambda * nodeA.t1_monthly) + (nodeB.lambda * nodeB.t1_monthly);
    const result = calculateRelationshipValue(
      rel.density,
      mutualValue,
      rel.sigma,
      rel.duration_months
    );
    
    totalRelValue += result.value_stu;
    return { ...rel, value: result.value_stu };
  });

  // 상위 λ 노드
  const topLambdaNodes = [...orgData.nodes]
    .sort((a, b) => b.lambda - a.lambda)
    .slice(0, 5)
    .map(n => ({ id: n.id, lambda: n.lambda }));

  // 시너지 정렬
  const sortedRels = [...orgData.relationships].sort((a, b) => b.sigma - a.sigma);
  const strongestRels = sortedRels.slice(0, 5).map(r => ({
    node_a: r.node_a_id,
    node_b: r.node_b_id,
    sigma: r.sigma,
  }));
  const weakestRels = sortedRels.slice(-5).reverse().map(r => ({
    node_a: r.node_a_id,
    node_b: r.node_b_id,
    sigma: r.sigma,
  }));

  // 효율성 점수 (0-100)
  const efficiencyScore = totalT1 > 0 
    ? Math.min(100, Math.round(((totalT2 + totalT3) / totalT1) * 25))
    : 0;

  return {
    omega,
    total_t1: totalT1,
    total_t2: totalT2,
    total_t3: totalT3,
    org_ntv: orgNTV,
    total_relationship_value: totalRelValue,
    efficiency_score: efficiencyScore,
    top_lambda_nodes: topLambdaNodes,
    strongest_relationships: strongestRels,
    weakest_relationships: weakestRels,
  };
}
