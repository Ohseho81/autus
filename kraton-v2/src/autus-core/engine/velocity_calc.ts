/**
 * 📊 AUTUS Velocity Calculator
 *
 * V = Velocity (속도)
 * VV = Σ(outcome × weight) / (time × CLF)
 *
 * 방향성 가중치 적용으로 역설 해결
 */

import outcomeRules from '../rules/outcome_rules.json';
import thresholds from '../rules/thresholds.json';
import { OutcomeFact, FactLedger } from './fact_ledger';

// ============================================
// Types
// ============================================

export interface VelocityResult {
  vv: number;                    // Value Velocity
  direction: 'positive' | 'negative' | 'neutral';
  status: 'green' | 'yellow' | 'red';
  label: string;                 // UI용 라벨
  components: {
    weightedSum: number;
    timeHours: number;
    clf: number;
  };
}

export interface CLFInput {
  studentCount: number;
  ageGroups: number;            // 연령대 수 (1-5)
  simultaneousPrograms: number; // 동시 프로그램 수
}

export interface CoachEfficiency {
  closedLoops: number;
  totalHours: number;
  ce: number;                   // Coach Efficiency = closedLoops / totalHours
}

// ============================================
// Core Calculations
// ============================================

/**
 * CLF (Court Load Factor) 계산
 * CLF = 학생밀도 × 연령분산 × 동시프로그램수
 */
export function calculateCLF(input: CLFInput): number {
  const { studentCount, ageGroups, simultaneousPrograms } = input;

  // 정규화된 값 사용
  const densityFactor = Math.min(studentCount / 10, 3);      // 최대 3
  const ageFactor = Math.min(ageGroups, 5);                  // 최대 5
  const programFactor = Math.min(simultaneousPrograms, 3);   // 최대 3

  const clf = densityFactor * ageFactor * programFactor;

  return Math.max(clf, 1); // 최소 1 (0으로 나누기 방지)
}

/**
 * CLF를 UI 라벨로 변환
 */
export function getCLFLabel(clf: number): { label: string; level: 'low' | 'medium' | 'high' } {
  const { clf_thresholds } = thresholds;

  if (clf <= clf_thresholds.low.max) {
    return { label: '낮음', level: 'low' };
  } else if (clf <= clf_thresholds.medium.max) {
    return { label: '보통', level: 'medium' };
  } else {
    return { label: '높음', level: 'high' };
  }
}

/**
 * 가중치 합계 계산
 */
export function calculateWeightedSum(facts: OutcomeFact[]): number {
  return facts.reduce((sum, fact) => {
    const weight = outcomeRules.outcomes[fact.type]?.weight || 0;
    return sum + weight;
  }, 0);
}

/**
 * VV (Value Velocity) 계산
 * VV = Σ(outcome × weight) / (time × CLF)
 */
export function calculateVV(
  facts: OutcomeFact[],
  timeHours: number,
  clf: number
): VelocityResult {
  const weightedSum = calculateWeightedSum(facts);

  // 시간과 CLF로 정규화
  const normalizedTime = Math.max(timeHours, 1);  // 최소 1시간
  const normalizedCLF = Math.max(clf, 1);         // 최소 1

  const vv = weightedSum / (normalizedTime * normalizedCLF);

  // 방향 결정
  let direction: 'positive' | 'negative' | 'neutral';
  if (vv > 0.1) direction = 'positive';
  else if (vv < -0.1) direction = 'negative';
  else direction = 'neutral';

  // 상태 결정
  const { velocity_thresholds } = thresholds;
  let status: 'green' | 'yellow' | 'red';
  let label: string;

  if (vv >= velocity_thresholds.green.min) {
    status = 'green';
    label = velocity_thresholds.green.action;
  } else if (vv >= velocity_thresholds.yellow.min) {
    status = 'yellow';
    label = velocity_thresholds.yellow.action;
  } else {
    status = 'red';
    label = velocity_thresholds.red.action;
  }

  return {
    vv: Math.round(vv * 100) / 100, // 소수점 2자리
    direction,
    status,
    label,
    components: {
      weightedSum,
      timeHours: normalizedTime,
      clf: normalizedCLF,
    },
  };
}

/**
 * 세션별 VV 계산 (강사용)
 */
export function calculateSessionVV(
  sessionFacts: OutcomeFact[],
  sessionHours: number,
  clfInput: CLFInput
): VelocityResult {
  const clf = calculateCLF(clfInput);
  return calculateVV(sessionFacts, sessionHours, clf);
}

/**
 * 기간별 VV 계산 (원장용)
 */
export function calculatePeriodVV(
  startDate: Date,
  endDate: Date,
  clfInput: CLFInput
): VelocityResult {
  const facts = FactLedger.getFactsInPeriod(startDate, endDate);
  const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const clf = calculateCLF(clfInput);

  return calculateVV(facts, hours, clf);
}

/**
 * Coach Efficiency (CE) 계산
 * CE = 닫힌 순환 수 / 수업 시간
 */
export function calculateCE(closedLoops: number, totalHours: number): CoachEfficiency {
  const ce = totalHours > 0 ? closedLoops / totalHours : 0;

  return {
    closedLoops,
    totalHours,
    ce: Math.round(ce * 100) / 100,
  };
}

/**
 * CE를 별점으로 변환 (UI용)
 */
export function getCEStars(ce: number): { stars: number; label: string } {
  if (ce >= 2.0) return { stars: 5, label: '⭐⭐⭐⭐⭐' };
  if (ce >= 1.5) return { stars: 4, label: '⭐⭐⭐⭐☆' };
  if (ce >= 1.0) return { stars: 3, label: '⭐⭐⭐☆☆' };
  if (ce >= 0.5) return { stars: 2, label: '⭐⭐☆☆☆' };
  return { stars: 1, label: '⭐☆☆☆☆' };
}

/**
 * VV 상태 색상 반환
 */
export function getVVColor(status: 'green' | 'yellow' | 'red'): string {
  const { velocity_thresholds } = thresholds;
  return velocity_thresholds[status].color;
}

// ============================================
// Export
// ============================================

export const VelocityCalc = {
  calculateCLF,
  getCLFLabel,
  calculateWeightedSum,
  calculateVV,
  calculateSessionVV,
  calculatePeriodVV,
  calculateCE,
  getCEStars,
  getVVColor,
};

export default VelocityCalc;
