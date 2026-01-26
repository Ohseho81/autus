/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 R(t) 이탈 예측 엔진
 * R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { RiskInput, RiskResult, PerformanceChange } from './types';

// 카테고리별 기본 가중치
const CATEGORY_WEIGHTS: Record<string, number> = {
  grade: 1.0,
  attendance: 1.2,
  engagement: 0.8,
  payment: 1.5,
};

// 시간 가중치 설정
const TIME_DECAY_HALF_LIFE_DAYS = 30; // 30일 반감기

/**
 * R(t) 이탈 위험도 계산
 * R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
 * 
 * @param input - 성과 변화 시계열, 현재 만족도
 * @returns 위험도 결과
 */
export function calculateRiskScore(input: RiskInput): RiskResult {
  const { performance_changes, current_satisfaction, alpha = 1.5 } = input;
  
  // 시간 가중치 계산 (최근 데이터에 더 높은 가중치)
  const now = Date.now();
  const weightedSum = performance_changes.reduce((sum, change) => {
    const daysSince = (now - new Date(change.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    const timeWeight = Math.exp(-daysSince / TIME_DECAY_HALF_LIFE_DAYS);
    
    const categoryWeight = CATEGORY_WEIGHTS[change.category] || 1.0;
    
    return sum + (timeWeight * categoryWeight * change.delta_m);
  }, 0);
  
  // R(t) 계산
  const satisfactionFactor = Math.pow(Math.max(0.1, current_satisfaction), alpha);
  const rawRisk = -weightedSum / satisfactionFactor; // 부정적 변화가 위험 증가
  
  // 0-100 스케일로 정규화
  const normalizedRisk = Math.min(100, Math.max(0, 50 + rawRisk * 10));
  
  // 위험 레벨 판정
  const riskLevel = getRiskLevel(normalizedRisk);
  
  // 예상 이탈 일수 계산
  const predictedChurnDays = calculateChurnDays(normalizedRisk, current_satisfaction);
  
  // 기여 요인 분석
  const contributingFactors = analyzeContributingFactors(performance_changes);
  
  // 권장 조치
  const recommendedActions = generateRecommendedActions(riskLevel, contributingFactors);
  
  // 자동 실행 예약
  const autoActuation = scheduleAutoActuation(riskLevel, recommendedActions);
  
  return {
    risk_score: Math.round(normalizedRisk),
    risk_level: riskLevel,
    predicted_churn_days: predictedChurnDays,
    contributing_factors: contributingFactors,
    recommended_actions: recommendedActions,
    auto_actuation: autoActuation,
  };
}

/**
 * 위험 레벨 판정
 */
function getRiskLevel(score: number): RiskResult['risk_level'] {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * 예상 이탈 일수 계산
 */
function calculateChurnDays(riskScore: number, satisfaction: number): number {
  // 기본 공식: 만족도가 높을수록, 위험도가 낮을수록 더 오래 유지
  const baseDays = 90;
  const riskFactor = (100 - riskScore) / 100;
  const satisfactionFactor = satisfaction;
  
  return Math.round(baseDays * riskFactor * (0.5 + satisfactionFactor));
}

/**
 * 기여 요인 분석
 */
function analyzeContributingFactors(changes: PerformanceChange[]) {
  const factors: Record<string, { sum: number; count: number }> = {};
  
  changes.forEach(change => {
    if (!factors[change.category]) {
      factors[change.category] = { sum: 0, count: 0 };
    }
    factors[change.category].sum += change.delta_m;
    factors[change.category].count += 1;
  });
  
  return Object.entries(factors)
    .map(([factor, data]) => ({
      factor,
      weight: data.count / changes.length,
      impact: data.sum / data.count,
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

/**
 * 권장 조치 생성
 */
function generateRecommendedActions(
  level: RiskResult['risk_level'],
  factors: RiskResult['contributing_factors']
): string[] {
  const actions: string[] = [];
  
  // 레벨별 기본 조치
  if (level === 'CRITICAL') {
    actions.push('즉시 1:1 상담 예약');
    actions.push('원장 직접 연락');
  } else if (level === 'HIGH') {
    actions.push('담당 선생님 특별 케어 요청');
    actions.push('긍정 리포트 발송');
  } else if (level === 'MEDIUM') {
    actions.push('학부모 앱 푸시 알림');
    actions.push('다음 상담 일정 확인');
  }
  
  // 요인별 조치
  factors.slice(0, 2).forEach(factor => {
    if (factor.factor === 'attendance' && factor.impact < 0) {
      actions.push('출석 독려 메시지 발송');
    }
    if (factor.factor === 'grade' && factor.impact < 0) {
      actions.push('맞춤 학습 플랜 제안');
    }
    if (factor.factor === 'payment' && factor.impact < 0) {
      actions.push('결제 안내 및 할인 프로모션 검토');
    }
    if (factor.factor === 'engagement' && factor.impact < 0) {
      actions.push('참여 유도 이벤트 안내');
    }
  });
  
  return [...new Set(actions)]; // 중복 제거
}

/**
 * 자동 실행 예약
 */
function scheduleAutoActuation(
  level: RiskResult['risk_level'],
  actions: string[]
): RiskResult['auto_actuation'] {
  const now = new Date();
  const scheduled: RiskResult['auto_actuation'] = [];
  
  if (level === 'CRITICAL') {
    // 즉시 실행
    scheduled.push({
      action: '긍정 리포트 자동 발송',
      scheduled_at: now,
      status: 'pending',
    });
  } else if (level === 'HIGH') {
    // 1시간 내 실행
    const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
    scheduled.push({
      action: '케어 메시지 발송',
      scheduled_at: oneHour,
      status: 'pending',
    });
  }
  
  return scheduled;
}

/**
 * Risk Score State 매핑 (1-6)
 */
export function riskScoreToState(score: number): number {
  if (score >= 80) return 6;
  if (score >= 60) return 5;
  if (score >= 40) return 4;
  if (score >= 20) return 3;
  if (score >= 10) return 2;
  return 1;
}

/**
 * 예상 손실 가치 계산
 */
export function calculateEstimatedLossValue(
  churnDays: number,
  monthlyTuition: number = 450000
): number {
  const estimatedMonths = Math.max(1, Math.ceil(churnDays / 30));
  return monthlyTuition * estimatedMonths;
}

/**
 * 일괄 위험 분석
 */
export function batchRiskAnalysis(
  students: Array<{
    id: string;
    performance_changes: PerformanceChange[];
    current_satisfaction: number;
  }>,
  alpha?: number
): Map<string, RiskResult> {
  const results = new Map<string, RiskResult>();
  
  students.forEach(student => {
    const result = calculateRiskScore({
      student_id: student.id,
      performance_changes: student.performance_changes,
      current_satisfaction: student.current_satisfaction,
      alpha,
    });
    results.set(student.id, result);
  });
  
  return results;
}

/**
 * 위험도 트렌드 분석
 */
export function analyzeRiskTrend(
  historicalScores: Array<{ date: Date; score: number }>
): {
  trend: 'improving' | 'stable' | 'worsening';
  change_rate: number;
  forecast_7days: number;
} {
  if (historicalScores.length < 2) {
    return { trend: 'stable', change_rate: 0, forecast_7days: historicalScores[0]?.score || 50 };
  }
  
  // 선형 회귀로 트렌드 계산
  const n = historicalScores.length;
  const sortedScores = [...historicalScores].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  sortedScores.forEach((s, i) => {
    sumX += i;
    sumY += s.score;
    sumXY += i * s.score;
    sumX2 += i * i;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // 7일 후 예측
  const forecast = intercept + slope * (n + 6);
  
  // 트렌드 판정
  let trend: 'improving' | 'stable' | 'worsening';
  if (slope < -1) trend = 'improving';
  else if (slope > 1) trend = 'worsening';
  else trend = 'stable';
  
  return {
    trend,
    change_rate: slope,
    forecast_7days: Math.min(100, Math.max(0, Math.round(forecast))),
  };
}
