/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📈 V-Index 계산 엔진
 * V = (M - T) × (1 + s)^t
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { VIndexInput, VIndexResult } from './types';

/**
 * V-Index 계산
 * V = (M - T) × (1 + s)^t
 * 
 * @param input - 매출, 비용, 만족도, 시간
 * @returns V-Index 결과
 */
export function calculateVIndex(input: VIndexInput): VIndexResult {
  const { M, T, s, t } = input;
  
  // 기본 계산
  const netValue = M - T;
  const compoundMultiplier = Math.pow(1 + s, t);
  const vIndex = netValue * compoundMultiplier;
  
  // 미래 예측 (만족도 유지 가정)
  const predict = (months: number) => netValue * Math.pow(1 + s, months);
  
  return {
    v_index: Math.round(vIndex),
    net_value: netValue,
    compound_multiplier: compoundMultiplier,
    breakdown: {
      mint: M,
      tax: T,
      satisfaction: s,
      time_months: t,
    },
    prediction: {
      v_3months: Math.round(predict(t + 3)),
      v_6months: Math.round(predict(t + 6)),
      v_12months: Math.round(predict(t + 12)),
    },
  };
}

/**
 * 만족도 지수 계산 (0-1 범위)
 * 여러 요소의 가중 평균
 */
export function calculateSatisfactionIndex(factors: {
  nps_score?: number;        // 0-10
  retention_rate?: number;   // 0-100%
  engagement_rate?: number;  // 0-100%
  payment_punctuality?: number; // 0-100%
  feedback_sentiment?: number;  // -1 to 1
}): number {
  const weights = {
    nps_score: 0.25,
    retention_rate: 0.25,
    engagement_rate: 0.20,
    payment_punctuality: 0.15,
    feedback_sentiment: 0.15,
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  if (factors.nps_score !== undefined) {
    weightedSum += (factors.nps_score / 10) * weights.nps_score;
    totalWeight += weights.nps_score;
  }
  
  if (factors.retention_rate !== undefined) {
    weightedSum += (factors.retention_rate / 100) * weights.retention_rate;
    totalWeight += weights.retention_rate;
  }
  
  if (factors.engagement_rate !== undefined) {
    weightedSum += (factors.engagement_rate / 100) * weights.engagement_rate;
    totalWeight += weights.engagement_rate;
  }
  
  if (factors.payment_punctuality !== undefined) {
    weightedSum += (factors.payment_punctuality / 100) * weights.payment_punctuality;
    totalWeight += weights.payment_punctuality;
  }
  
  if (factors.feedback_sentiment !== undefined) {
    // -1~1을 0~1로 변환
    const normalized = (factors.feedback_sentiment + 1) / 2;
    weightedSum += normalized * weights.feedback_sentiment;
    totalWeight += weights.feedback_sentiment;
  }
  
  if (totalWeight === 0) return 0.5; // 기본값
  
  return Math.min(1, Math.max(0, weightedSum / totalWeight));
}

/**
 * 시나리오별 V-Index 시뮬레이션
 */
export function simulateVIndex(
  base: VIndexInput,
  scenarios: Array<{ name: string; modifications: Partial<VIndexInput> }>
): Array<{ name: string; result: VIndexResult; delta: number }> {
  const baseResult = calculateVIndex(base);
  
  return scenarios.map(scenario => {
    const modifiedInput = { ...base, ...scenario.modifications };
    const result = calculateVIndex(modifiedInput);
    const delta = result.v_index - baseResult.v_index;
    
    return {
      name: scenario.name,
      result,
      delta,
    };
  });
}

/**
 * V-Index 성장률 계산
 */
export function calculateVGrowthRate(
  previous: number,
  current: number,
  periodMonths: number
): { total: number; monthly: number; annualized: number } {
  const totalGrowth = (current - previous) / previous;
  const monthlyGrowth = Math.pow(current / previous, 1 / periodMonths) - 1;
  const annualizedGrowth = Math.pow(1 + monthlyGrowth, 12) - 1;
  
  return {
    total: totalGrowth,
    monthly: monthlyGrowth,
    annualized: annualizedGrowth,
  };
}

/**
 * Exit Valuation 계산
 * 기업 가치 = V-Index × 멀티플
 */
export function calculateExitValuation(
  vIndex: number,
  multiple: number = 3.5,
  discountRate: number = 0.15,
  yearsToExit: number = 3
): {
  current_valuation: number;
  exit_valuation: number;
  present_value: number;
} {
  const currentValuation = vIndex * multiple;
  const exitValuation = currentValuation * Math.pow(1.2, yearsToExit); // 연 20% 성장 가정
  const presentValue = exitValuation / Math.pow(1 + discountRate, yearsToExit);
  
  return {
    current_valuation: Math.round(currentValuation),
    exit_valuation: Math.round(exitValuation),
    present_value: Math.round(presentValue),
  };
}

/**
 * 글로벌 V-Index 통합
 */
export function consolidateGlobalVIndex(
  regions: Array<{
    region: string;
    v_index: number;
    currency: string;
    exchange_rate: number; // KRW 기준
    synergy_factor?: number;
  }>
): {
  total_v_krw: number;
  by_region: Record<string, number>;
  synergy_bonus: number;
} {
  let totalV = 0;
  const byRegion: Record<string, number> = {};
  
  regions.forEach(r => {
    const vInKRW = r.v_index * r.exchange_rate;
    totalV += vInKRW;
    byRegion[r.region] = vInKRW;
  });
  
  // 시너지 보너스 (멀티 리전 운영 시)
  const avgSynergy = regions.reduce((sum, r) => sum + (r.synergy_factor || 1), 0) / regions.length;
  const synergyBonus = totalV * (avgSynergy - 1);
  
  return {
    total_v_krw: Math.round(totalV + synergyBonus),
    by_region: byRegion,
    synergy_bonus: Math.round(synergyBonus),
  };
}
