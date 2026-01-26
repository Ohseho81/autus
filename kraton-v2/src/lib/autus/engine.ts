/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Physics Engine
 * 
 * V = P × Λ × e^(σt)
 * 
 * 핵심 계산:
 * - λ (Lambda): 노드 시간상수
 * - σ (Sigma): 시너지 계수
 * - P (Density): 관계 밀도
 * - V (Value): 관계 가치
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  DEFAULT_LAMBDAS,
  SIGMA_WEIGHTS,
  LAMBDA_CONSTRAINTS,
  SATURATION_PARAMS,
  type RelationValue,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// λ (Lambda) 계산
// ═══════════════════════════════════════════════════════════════════════════

/**
 * λ 계산
 * λ = λ_base × (1/R) × I × E × N
 * 
 * @param role - 역할 (역할 기반 기본값 사용)
 * @param components - 구성요소 (없으면 역할 기본값만 사용)
 */
export function calculateLambda(
  role: string,
  components?: {
    replaceability?: number;   // R: 0~1
    influence?: number;        // I: 0~1
    expertise?: number;        // E: 0~1
    network_position?: number; // N: 0~1
  }
): number {
  // 역할 기반 기본값
  const baseLambda = DEFAULT_LAMBDAS[role] || 1.0;
  
  // 구성요소 없으면 기본값 반환 (MVP 버전)
  if (!components) {
    return baseLambda;
  }
  
  const {
    replaceability = 0.5,
    influence = 0.5,
    expertise = 0.5,
    network_position = 0.5,
  } = components;
  
  // R factor (대체 가능성의 역수)
  const rFactor = replaceability > 0 ? 1 / replaceability : 10;
  
  // Raw 계산
  const rawLambda = rFactor * influence * expertise * network_position;
  
  // 정규화 및 범위 제한 (0.5 ~ 10.0)
  const normalizedLambda = Math.min(
    LAMBDA_CONSTRAINTS.max,
    Math.max(LAMBDA_CONSTRAINTS.min, rawLambda * 0.5)
  );
  
  return Math.round(normalizedLambda * 100) / 100;
}

/**
 * 역할 기반 기본 λ 조회
 */
export function getDefaultLambda(role: string): number {
  return DEFAULT_LAMBDAS[role] || 1.0;
}

/**
 * λ 범위 제한 적용
 */
export function clampLambda(lambda: number): number {
  return Math.min(LAMBDA_CONSTRAINTS.max, Math.max(LAMBDA_CONSTRAINTS.min, lambda));
}

// ═══════════════════════════════════════════════════════════════════════════
// σ (Sigma) 계산
// ═══════════════════════════════════════════════════════════════════════════

/**
 * σ 계산
 * σ = w₁C + w₂G + w₃V + w₄R
 * 
 * @param components - CGVR 구성요소 (각 -1 ~ +1)
 */
export function calculateSigma(components: {
  compatibility: number;    // C: 스타일 호환
  goal_alignment: number;   // G: 목표 일치
  value_match: number;      // V: 가치관 일치
  rhythm_sync: number;      // R: 리듬 동기화
}): number {
  const sigma =
    SIGMA_WEIGHTS.compatibility * components.compatibility +
    SIGMA_WEIGHTS.goal_alignment * components.goal_alignment +
    SIGMA_WEIGHTS.value_match * components.value_match +
    SIGMA_WEIGHTS.rhythm_sync * components.rhythm_sync;
  
  // 범위 제한 (-1 ~ +1)
  const clampedSigma = Math.min(1, Math.max(-1, sigma));
  
  return Math.round(clampedSigma * 1000) / 1000;
}

/**
 * σ 효과 해석
 */
export function interpretSigma(sigma: number): {
  level: 'excellent' | 'good' | 'neutral' | 'poor' | 'toxic';
  multiplier12m: number;
  description: string;
} {
  const multiplier12m = calculateSynergyMultiplier(sigma, 12);
  
  if (sigma >= 0.2) {
    return { level: 'excellent', multiplier12m, description: '탁월한 시너지' };
  } else if (sigma >= 0.1) {
    return { level: 'good', multiplier12m, description: '좋은 시너지' };
  } else if (sigma >= -0.1) {
    return { level: 'neutral', multiplier12m, description: '중립' };
  } else if (sigma >= -0.2) {
    return { level: 'poor', multiplier12m, description: '낮은 시너지' };
  } else {
    return { level: 'toxic', multiplier12m, description: '독성 관계' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// P (Density) 계산
// ═══════════════════════════════════════════════════════════════════════════

/**
 * P 계산
 * P = √(F × D) × Q
 * 
 * @param components - FDQ 구성요소 (각 0 ~ 1)
 */
export function calculateDensity(components: {
  frequency: number;   // F: 접촉 빈도 (0~1)
  depth: number;       // D: 관계 깊이 (0~1)
  quality?: number;    // Q: 품질 보정 (0~1, 기본 1.0)
}): number {
  const { frequency, depth, quality = 1.0 } = components;
  
  const density = Math.sqrt(frequency * depth) * quality;
  
  // 범위 제한 (0 ~ 1)
  const clampedDensity = Math.min(1, Math.max(0, density));
  
  return Math.round(clampedDensity * 1000) / 1000;
}

/**
 * P 해석
 */
export function interpretDensity(density: number): {
  level: 'strong' | 'moderate' | 'weak' | 'dormant';
  description: string;
} {
  if (density >= 0.7) {
    return { level: 'strong', description: '강한 관계' };
  } else if (density >= 0.4) {
    return { level: 'moderate', description: '보통 관계' };
  } else if (density >= 0.2) {
    return { level: 'weak', description: '약한 관계' };
  } else {
    return { level: 'dormant', description: '휴면 관계' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 시너지 배율 계산
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 시너지 배율 계산 (기본 버전)
 * 배율 = e^(σt)
 * 
 * @param sigma - 시너지 계수
 * @param durationMonths - 관계 지속 기간 (개월)
 */
export function calculateSynergyMultiplier(
  sigma: number,
  durationMonths: number
): number {
  return Math.exp(sigma * durationMonths);
}

/**
 * 시너지 배율 계산 (포화 버전 - 발산 방지)
 * S(t) = S_max × (1 - e^(-σt/τ)) for σ > 0
 * S(t) = e^(σt) for σ ≤ 0
 * 
 * @param sigma - 시너지 계수
 * @param durationMonths - 관계 지속 기간 (개월)
 * @param sMax - 최대 배율 (기본 50)
 * @param tau - 포화 시간상수 (기본 24개월)
 */
export function calculateSaturatedSynergyMultiplier(
  sigma: number,
  durationMonths: number,
  sMax: number = SATURATION_PARAMS.s_max,
  tau: number = SATURATION_PARAMS.tau
): number {
  if (sigma > 0) {
    // 양의 시너지: 포화 함수 적용
    const multiplier = sMax * (1 - Math.exp(-sigma * durationMonths / tau));
    return Math.max(1, multiplier);
  } else if (sigma < 0) {
    // 음의 시너지: 지수 감소
    return Math.exp(sigma * durationMonths);
  }
  
  // σ = 0: 배율 1
  return 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// 가치 (V) 계산
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MVP 가치 계산
 * V = λ × T × P
 * 
 * 시너지(σ) 없이 간단하게 계산
 */
export function calculateValueMVP(
  lambda: number,
  timeHours: number,
  density: number
): number {
  return Math.round(lambda * timeHours * density * 100) / 100;
}

/**
 * Full 가치 계산
 * V = P × Λ × S(t)
 * Λ = λ_A × t_A + λ_B × t_B (상호 시간가치)
 * 
 * @param params - 계산 파라미터
 * @param useSaturation - 포화 함수 사용 여부 (기본 true)
 */
export function calculateValueFull(
  params: {
    density: number;            // P
    lambda_a: number;           // λ_A
    lambda_b: number;           // λ_B
    time_a_to_b_hours: number;  // A가 B에게 투입한 시간
    time_b_to_a_hours: number;  // B가 A에게 투입한 시간
    sigma: number;              // σ
    duration_months: number;    // t
  },
  useSaturation: boolean = true
): Omit<RelationValue, 'node_a_id' | 'node_b_id'> {
  const {
    density,
    lambda_a,
    lambda_b,
    time_a_to_b_hours,
    time_b_to_a_hours,
    sigma,
    duration_months,
  } = params;
  
  // Λ = 상호 시간가치
  const mutualTimeValue = (lambda_a * time_a_to_b_hours) + (lambda_b * time_b_to_a_hours);
  
  // 시너지 배율
  const synergyMultiplier = useSaturation
    ? calculateSaturatedSynergyMultiplier(sigma, duration_months)
    : calculateSynergyMultiplier(sigma, duration_months);
  
  // V = P × Λ × S(t)
  const valueSTU = density * mutualTimeValue * synergyMultiplier;
  
  return {
    value_stu: Math.round(valueSTU * 100) / 100,
    value_krw: 0,  // ω 적용 후 설정
    components: {
      lambda_a,
      lambda_b,
      time_a_to_b: time_a_to_b_hours,
      time_b_to_a: time_b_to_a_hours,
      density,
      sigma,
      synergy_multiplier: Math.round(synergyMultiplier * 100) / 100,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ω (Omega) 계산
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 시간 단가 (ω) 계산
 * ω = 총 매출 / 총 투입 STU
 * 
 * @param totalRevenue - 총 매출 (₩)
 * @param totalSTU - 총 투입 STU
 * @param defaultOmega - 기본값 (기본 ₩30,000/STU)
 */
export function calculateOmega(
  totalRevenue: number,
  totalSTU: number,
  defaultOmega: number = 30000
): number {
  if (totalSTU <= 0) return defaultOmega;
  return Math.round(totalRevenue / totalSTU);
}

/**
 * STU → KRW 변환
 */
export function stuToKRW(stu: number, omega: number): number {
  return Math.round(stu * omega);
}

/**
 * 실제 시간 → STU 변환
 */
export function realTimeToSTU(realHours: number, lambda: number): number {
  return Math.round(realHours * lambda * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// NTV (순시간가치) 계산
// ═══════════════════════════════════════════════════════════════════════════

/**
 * NTV 계산
 * NTV = T₃ - T₁ + T₂
 * 
 * @param t1 - 투입 시간 (Cost)
 * @param t2 - 절약 시간 (Save)
 * @param t3 - 창출 시간 (Create)
 */
export function calculateNTV(t1: number, t2: number, t3: number): number {
  return Math.round((t3 - t1 + t2) * 100) / 100;
}

/**
 * NTV 해석
 */
export function interpretNTV(ntv: number): {
  status: 'positive' | 'neutral' | 'negative';
  description: string;
} {
  if (ntv > 10) {
    return { status: 'positive', description: '가치 창출 중' };
  } else if (ntv >= 0) {
    return { status: 'neutral', description: '균형 상태' };
  } else {
    return { status: 'negative', description: '가치 소모 중' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// σ 역산 (결과에서 측정) - NEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * σ 역산 - 결과(A)와 투입(T)에서 실제 σ 측정
 * σ = log(A) / log(T)
 * 
 * 사용: 관계 종료 후 실제 성과로부터 σ 정확도 검증
 */
export function calculateSigmaFromResults(
  resultValue: number,  // A: 실제 얻은 가치 (매출, 성과 등)
  inputValue: number    // T: 투입한 가치 시간
): number {
  if (inputValue <= 0 || inputValue === 1 || resultValue <= 0) {
    return 0;
  }
  
  const sigma = Math.log(resultValue) / Math.log(inputValue);
  
  // 범위 제한 (비정상적 값 방지)
  return Math.min(3.0, Math.max(-1.0, Math.round(sigma * 1000) / 1000));
}

/**
 * σ 예측 vs 실측 비교
 */
export function compareSigma(
  predicted: number,
  measured: number
): {
  accuracy: number;      // 0-1 (1이 완벽)
  deviation: number;     // 편차
  assessment: 'accurate' | 'overestimate' | 'underestimate';
} {
  const deviation = measured - predicted;
  const accuracy = 1 - Math.min(1, Math.abs(deviation));
  
  let assessment: 'accurate' | 'overestimate' | 'underestimate';
  if (Math.abs(deviation) < 0.1) {
    assessment = 'accurate';
  } else if (deviation < 0) {
    assessment = 'overestimate';
  } else {
    assessment = 'underestimate';
  }
  
  return {
    accuracy: Math.round(accuracy * 100) / 100,
    deviation: Math.round(deviation * 1000) / 1000,
    assessment,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 효율 (E) 계산 - NEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 효율 계산
 * E = A_out / A_in
 * 
 * @param outputValue - 산출 가치 (얻은 것)
 * @param inputValue - 투입 가치 (쓴 것)
 */
export function calculateEfficiency(
  outputValue: number,
  inputValue: number
): number {
  if (inputValue <= 0) return 0;
  return Math.round((outputValue / inputValue) * 100) / 100;
}

/**
 * 효율 해석
 */
export function interpretEfficiency(efficiency: number): {
  level: 'excellent' | 'good' | 'break_even' | 'loss';
  description: string;
  color: string;
} {
  if (efficiency >= 3.0) {
    return { level: 'excellent', description: '탁월한 효율 (3x+)', color: '#22c55e' };
  } else if (efficiency >= 1.5) {
    return { level: 'good', description: '좋은 효율 (1.5x+)', color: '#3b82f6' };
  } else if (efficiency >= 1.0) {
    return { level: 'break_even', description: '손익분기', color: '#eab308' };
  } else {
    return { level: 'loss', description: '손실 구간', color: '#ef4444' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// σ 프록시 지표 기반 예측 - ENHANCED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * σ 프록시 지표
 */
export interface SigmaProxyIndicators {
  responseSpeed: number;     // 응답 속도 (0-1, 1=즉시)
  engagementRate: number;    // 참여도 (0-1)
  completionRate: number;    // 완료율 (0-1)
  sentimentScore: number;    // 감정 점수 (-1 ~ +1)
  renewalHistory: number;    // 재등록/갱신 이력 (0-1)
}

/**
 * 프록시 지표 가중치
 */
export const SIGMA_PROXY_WEIGHTS = {
  responseSpeed: 0.15,
  engagementRate: 0.25,
  completionRate: 0.20,
  sentimentScore: 0.20,
  renewalHistory: 0.20,
};

/**
 * σ 프록시 기반 예측 (강화 버전)
 * 
 * 사용: 초기 데이터 부족 시 행동 지표로 σ 추정
 */
export function predictSigmaFromProxy(indicators: SigmaProxyIndicators): number {
  // 감정 점수 정규화 (-1~+1 → 0~1)
  const normalizedSentiment = (indicators.sentimentScore + 1) / 2;
  
  // 가중 평균 계산
  const score =
    SIGMA_PROXY_WEIGHTS.responseSpeed * indicators.responseSpeed +
    SIGMA_PROXY_WEIGHTS.engagementRate * indicators.engagementRate +
    SIGMA_PROXY_WEIGHTS.completionRate * indicators.completionRate +
    SIGMA_PROXY_WEIGHTS.sentimentScore * normalizedSentiment +
    SIGMA_PROXY_WEIGHTS.renewalHistory * indicators.renewalHistory;
  
  // 0~1 score를 σ로 변환
  // 기존 σ 범위 (-1 ~ +1) 유지
  const sigma = (score * 2) - 1;
  
  return Math.round(sigma * 1000) / 1000;
}

/**
 * 프록시 지표 품질 평가
 */
export function assessProxyQuality(indicators: SigmaProxyIndicators): {
  confidence: number;
  missingIndicators: string[];
  recommendation: string;
} {
  const missing: string[] = [];
  let dataPoints = 0;
  
  if (indicators.responseSpeed > 0) dataPoints++; else missing.push('응답속도');
  if (indicators.engagementRate > 0) dataPoints++; else missing.push('참여도');
  if (indicators.completionRate > 0) dataPoints++; else missing.push('완료율');
  if (indicators.sentimentScore !== 0) dataPoints++; else missing.push('감정분석');
  if (indicators.renewalHistory > 0) dataPoints++; else missing.push('재등록이력');
  
  const confidence = dataPoints / 5;
  
  let recommendation: string;
  if (confidence >= 0.8) {
    recommendation = 'σ 예측 신뢰도 높음';
  } else if (confidence >= 0.6) {
    recommendation = 'σ 예측 가능, 추가 데이터 권장';
  } else if (confidence >= 0.4) {
    recommendation = 'σ 예측 불확실, 수동 평가 권장';
  } else {
    recommendation = '데이터 부족, 역할 기반 기본값 사용';
  }
  
  return {
    confidence: Math.round(confidence * 100) / 100,
    missingIndicators: missing,
    recommendation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 이탈 위험 (5단계) - ENHANCED
// ═══════════════════════════════════════════════════════════════════════════

export type ChurnRiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'critical';

/**
 * 이탈 위험 계산 (5단계)
 */
export function calculateChurnRisk(
  sigma: number,
  durationMonths: number,
  recentActivityDrop?: number  // 최근 활동 감소율 (0-1)
): {
  level: ChurnRiskLevel;
  probability: number;
  daysToAction: number;
  recommendation: string;
} {
  // 기본 확률 계산
  let baseProbability: number;
  
  if (sigma >= 0.3) {
    baseProbability = 0.05;
  } else if (sigma >= 0.15) {
    baseProbability = 0.15;
  } else if (sigma >= 0) {
    baseProbability = 0.30;
  } else if (sigma >= -0.1) {
    baseProbability = 0.50;
  } else {
    baseProbability = 0.70;
  }
  
  // 기간 보정 (신규일수록 위험)
  const durationFactor = durationMonths < 3 ? 1.3 : durationMonths < 6 ? 1.1 : 1.0;
  
  // 활동 감소 보정
  const activityFactor = recentActivityDrop ? 1 + recentActivityDrop : 1.0;
  
  const probability = Math.min(0.95, baseProbability * durationFactor * activityFactor);
  
  // 레벨 결정
  let level: ChurnRiskLevel;
  let daysToAction: number;
  let recommendation: string;
  
  if (probability < 0.1) {
    level = 'minimal';
    daysToAction = 90;
    recommendation = '현 상태 유지';
  } else if (probability < 0.25) {
    level = 'low';
    daysToAction = 60;
    recommendation = '정기 체크인 권장';
  } else if (probability < 0.45) {
    level = 'moderate';
    daysToAction = 30;
    recommendation = '관계 강화 활동 필요';
  } else if (probability < 0.65) {
    level = 'high';
    daysToAction = 14;
    recommendation = '즉시 개입 권장';
  } else {
    level = 'critical';
    daysToAction = 7;
    recommendation = '긴급 복구 필요';
  }
  
  return {
    level,
    probability: Math.round(probability * 100) / 100,
    daysToAction,
    recommendation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 두 날짜 사이의 개월 수 계산
 */
export function getMonthsDiff(startDate: string | Date, endDate: Date = new Date()): number {
  const start = new Date(startDate);
  const months =
    (endDate.getFullYear() - start.getFullYear()) * 12 +
    (endDate.getMonth() - start.getMonth());
  return Math.max(1, months);
}

/**
 * 관계 키 생성 (정렬된 노드 ID 조합)
 */
export function getRelationKey(nodeAId: string, nodeBId: string): string {
  return [nodeAId, nodeBId].sort().join(':');
}

/**
 * 관계 가치 비교 정렬 함수
 */
export function sortByValue(a: { value_stu: number }, b: { value_stu: number }): number {
  return b.value_stu - a.value_stu;
}

/**
 * 시그마 기준 정렬 (위험 관계 먼저)
 */
export function sortBySigma(a: { components: { sigma: number } }, b: { components: { sigma: number } }): number {
  return a.components.sigma - b.components.sigma;
}
