/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v2.1 - 가치의 법칙 (The Law of Value)
 * 
 * 핵심 공식: A = T^σ
 * - A: 증폭된 시간 (Amplified Time) = 가치
 * - T: 가치 시간 (Value Time) = λ × t
 * - σ: 시너지 계수 (0.5 ~ 3.0)
 * 
 * v2.1 수정사항:
 * - λ 계산: 순환참조 제거, 기본값 + 성과보정 방식
 * - σ 계산: 시간 감쇠(Time Decay) 추가
 * - 주체별 가중치: 학부모 1.5×, 학생 1.0×
 * - 데이터 가용성 정규화
 * - Alert 다층 기준
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================
// 1. 타입 정의
// ============================================

export type NodeType = 
  | 'OWNER' | 'MANAGER' | 'STAFF' | 'STUDENT' | 'PARENT' 
  | 'PROSPECT' | 'CHURNED' | 'EXTERNAL';

export type SigmaGrade = 
  | 'critical' | 'at_risk' | 'neutral' | 'good' | 'loyal' | 'advocate';

export type BehaviorTier = 1 | 2 | 3 | 4 | 5 | 6;

export type BehaviorType =
  | 'REENROLLMENT' | 'REFERRAL'
  | 'ADDITIONAL_CLASS' | 'PAID_EVENT'
  | 'VOLUNTARY_STAY' | 'FREE_EVENT' | 'CLASS_PARTICIPATION'
  | 'ATTENDANCE' | 'PAYMENT' | 'COMMUNICATION'
  | 'POSITIVE_FEEDBACK' | 'MERCHANDISE'
  | 'COMPLAINT' | 'CHURN_SIGNAL';

export type ExternalSource =
  | 'EMAIL' | 'CALENDAR' | 'MESSENGER' | 'SOCIAL' 
  | 'REPUTATION' | 'LOCATION' | 'PAYMENT' | 'NETWORK';

export type SubjectType = 'PARENT' | 'STUDENT' | 'STAFF_OBSERVED';

export type AlertLevel = 'critical' | 'warning' | 'positive' | 'info';

export type ChurnReason = 'graduation' | 'relocation' | 'complaint' | 'competitor' | 'other';

// ============================================
// 2. 상수 정의
// ============================================

/** 노드 타입별 기본 λ (고정값) */
export const NODE_LAMBDA: Record<NodeType, number> = {
  OWNER: 5.0,
  MANAGER: 3.0,
  STAFF: 2.0,
  STUDENT: 1.0,
  PARENT: 1.2,
  PROSPECT: 0.8,
  CHURNED: 0.5,
  EXTERNAL: 1.0,
};

/** σ 등급 임계값 */
export const SIGMA_THRESHOLDS: Record<SigmaGrade, { min: number; max: number }> = {
  critical: { min: 0, max: 0.7 },
  at_risk: { min: 0.7, max: 1.0 },
  neutral: { min: 1.0, max: 1.3 },
  good: { min: 1.3, max: 1.6 },
  loyal: { min: 1.6, max: 2.0 },
  advocate: { min: 2.0, max: 3.0 },
};

/** σ 등급별 색상 */
export const SIGMA_COLORS: Record<SigmaGrade, string> = {
  critical: '#000000',
  at_risk: '#ef4444',
  neutral: '#eab308',
  good: '#22c55e',
  loyal: '#3b82f6',
  advocate: '#a855f7',
};

/** σ 등급별 라벨 */
export const SIGMA_LABELS: Record<SigmaGrade, string> = {
  critical: '⚫ 위험',
  at_risk: '🔴 주의',
  neutral: '🟡 보통',
  good: '🟢 양호',
  loyal: '🔵 충성',
  advocate: '💜 팬',
};

/** 주체별 가중치 */
export const SUBJECT_WEIGHTS: Record<SubjectType, number> = {
  PARENT: 1.5,        // 의사결정권자
  STUDENT: 1.0,       // 기본
  STAFF_OBSERVED: 0.8 // 간접 측정
};

/** Tier별 시간 감쇠 반감기 (일) */
export const TIER_DECAY_HALFLIFE: Record<BehaviorTier, number> = {
  1: 365,  // 결정적: 1년
  2: 180,  // 확장: 6개월
  3: 90,   // 참여: 3개월
  4: 60,   // 유지: 2개월
  5: 120,  // 표현: 4개월
  6: 30,   // 부정: 1개월 (빨리 회복 기회)
};

/** 이탈 사유별 반감기 (일) */
export const CHURN_DECAY_HALFLIFE: Record<ChurnReason, number> = {
  graduation: 365,
  relocation: 180,
  complaint: 60,
  competitor: 90,
  other: 180,
};

/** 외부 데이터 가중치 */
export const EXTERNAL_WEIGHTS: Record<ExternalSource, number> = {
  EMAIL: 0.10,
  CALENDAR: 0.15,
  MESSENGER: 0.20,
  SOCIAL: 0.15,
  REPUTATION: 0.15,
  LOCATION: 0.10,
  PAYMENT: 0.10,
  NETWORK: 0.05,
};

// ============================================
// 3. 핵심 공식 함수
// ============================================

/**
 * 공식 1: 가치 시간 T = λ × t
 */
export function calculateT(lambda: number, t: number): number {
  return lambda * t;
}

/**
 * 공식 2: 가치 계산 A = T^σ
 */
export function calculateA(t: number, lambda: number, sigma: number): number {
  const T = calculateT(lambda, t);
  if (T <= 0) return 0;
  return Math.pow(T, sigma);
}

/**
 * 공식 3: 조직 가치 Ω = Σ(T^σ)
 */
export function calculateOmega(
  relationships: Array<{ tTotal: number; sigma: number; lambdaAvg: number }>
): number {
  return relationships.reduce((omega, rel) => {
    const A = calculateA(rel.tTotal, rel.lambdaAvg, rel.sigma);
    return omega + A;
  }, 0);
}

/**
 * 공식 4: σ 역산 σ = log(A) / log(T)
 */
export function measureSigma(a: number, t: number, lambda: number = 1): number {
  const T = calculateT(lambda, t);
  if (T <= 1 || a <= 0) return 1.0;
  const sigma = Math.log(a) / Math.log(T);
  return clampSigma(sigma);
}

/**
 * 공식 5: σ 범위 제한 (0.5 ~ 3.0)
 */
export function clampSigma(sigma: number): number {
  return Math.max(0.5, Math.min(3.0, sigma));
}

// ============================================
// 4. λ 계산 (순환참조 제거)
// ============================================

/**
 * λ 계산: 기본값 + 성과 보정
 * λ = λ_base × (1 + performance_factor)
 * 
 * @param nodeType 노드 타입
 * @param performanceFactor 성과 보정 계수 (-0.2 ~ +0.3)
 */
export function calculateLambda(
  nodeType: NodeType,
  performanceFactor: number = 0
): number {
  const lambdaBase = NODE_LAMBDA[nodeType];
  const clampedFactor = Math.max(-0.2, Math.min(0.3, performanceFactor));
  return lambdaBase * (1 + clampedFactor);
}

/**
 * 성과 계수 계산 (과거 데이터 기반)
 */
export function calculatePerformanceFactor(
  avgSigmaHistory: number,    // 평균 σ 이력
  retentionRate: number,      // 유지율 (STAFF의 경우 담당 학생)
  tenureMonths: number        // 재직 기간
): number {
  // 평균 σ 기여: 높은 σ → 높은 λ
  const sigmaFactor = (avgSigmaHistory - 1.0) * 0.1;  // ±0.1
  
  // 유지율 기여: 높은 유지율 → 높은 λ
  const retentionFactor = (retentionRate - 0.8) * 0.2;  // ±0.04
  
  // 경력 기여: 오래될수록 약간 높음 (최대 0.1)
  const tenureFactor = Math.min(tenureMonths / 120, 1) * 0.1;  // 10년에 최대
  
  return sigmaFactor + retentionFactor + tenureFactor;
}

// ============================================
// 5. 시간 감쇠 (Time Decay)
// ============================================

/**
 * 시간 감쇠 계수 계산
 * decay(t) = e^(-t/τ)
 * 
 * @param daysSince 경과 일수
 * @param halflife 반감기 (일)
 */
export function calculateDecay(daysSince: number, halflife: number): number {
  const tau = halflife / Math.LN2;  // τ = halflife / ln(2)
  return Math.exp(-daysSince / tau);
}

/**
 * Tier별 시간 감쇠 적용
 */
export function applyTierDecay(
  sigmaContribution: number,
  tier: BehaviorTier,
  daysSince: number
): number {
  const halflife = TIER_DECAY_HALFLIFE[tier];
  const decay = calculateDecay(daysSince, halflife);
  return sigmaContribution * decay;
}

/**
 * 이탈 고객 σ 감쇠
 */
export function calculateChurnedSigma(
  finalSigma: number,
  daysSinceChurn: number,
  churnReason: ChurnReason
): number {
  const halflife = CHURN_DECAY_HALFLIFE[churnReason];
  const decay = calculateDecay(daysSinceChurn, halflife);
  return finalSigma * decay;
}

// ============================================
// 6. 행위별 σ 설정
// ============================================

interface BehaviorConfig {
  tier: BehaviorTier;
  base: number;
  modifiers: Record<string, number>;
  range: [number, number];
}

export const BEHAVIOR_SIGMA_CONFIG: Record<BehaviorType, BehaviorConfig> = {
  // Tier 1: 결정적
  REENROLLMENT: {
    tier: 1,
    base: 0.30,
    modifiers: { early: 0.10, consecutive: 0.10, expansion: 0.10, reduction: -0.05 },
    range: [-0.15, 0.60],
  },
  REFERRAL: {
    tier: 1,
    base: 0.20,
    modifiers: { converted: 0.30, multiple: 0.10, retained: 0.10 },
    range: [0, 0.70],
  },
  // Tier 2: 확장
  ADDITIONAL_CLASS: {
    tier: 2,
    base: 0.15,
    modifiers: { parentInitiated: 0.15, converted: 0.20, multiSubject: 0.10, sibling: 0.20 },
    range: [0, 0.65],
  },
  PAID_EVENT: {
    tier: 2,
    base: 0.15,
    modifiers: { highValue: 0.10, consecutive: 0.05 },
    range: [0, 0.30],
  },
  // Tier 3: 참여
  VOLUNTARY_STAY: {
    tier: 3,
    base: 0.10,
    modifiers: { studyRoom: 0.10, extraStay: 0.05 },
    range: [0, 0.25],
  },
  FREE_EVENT: {
    tier: 3,
    base: 0.10,
    modifiers: { parentAttend: 0.10, active: 0.05 },
    range: [0, 0.25],
  },
  CLASS_PARTICIPATION: {
    tier: 3,
    base: 0.05,
    modifiers: { questions: 0.05, homework: 0.05, interaction: 0.05 },
    range: [0, 0.15],
  },
  // Tier 4: 유지
  ATTENDANCE: {
    tier: 4,
    base: 0,
    modifiers: { perfect: 0.10, noUnexcused: 0.05, latePenalty: -0.10 },
    range: [-0.10, 0.15],
  },
  PAYMENT: {
    tier: 4,
    base: 0,
    modifiers: { early: 0.10, auto: 0.05, late: -0.15, discount: -0.05 },
    range: [-0.20, 0.15],
  },
  COMMUNICATION: {
    tier: 4,
    base: 0,
    modifiers: { readRate: 0.05, responseRate: 0.05, compliance: 0.05 },
    range: [0, 0.15],
  },
  // Tier 5: 표현
  POSITIVE_FEEDBACK: {
    tier: 5,
    base: 0.10,
    modifiers: { onlineReview: 0.15, highSatisfaction: 0.05 },
    range: [0, 0.30],
  },
  MERCHANDISE: {
    tier: 5,
    base: 0.05,
    modifiers: { sns: 0.10, uniform: 0.05 },
    range: [0, 0.20],
  },
  // Tier 6: 부정
  COMPLAINT: {
    tier: 6,
    base: -0.10,
    modifiers: { severe: -0.20, negativeReview: -0.30, teacherChange: -0.10 },
    range: [-0.70, 0],
  },
  CHURN_SIGNAL: {
    tier: 6,
    base: -0.20,
    modifiers: { attendanceDrop: -0.20, noResponse: -0.15, paymentDelay: -0.15, competitor: -0.30 },
    range: [-0.80, 0],
  },
};

/**
 * 행위 σ 기여 계산 (시간 감쇠 + 주체 가중치 적용)
 */
export function calculateBehaviorSigma(
  behaviorType: BehaviorType,
  modifiers: Record<string, boolean | number> = {},
  subject: SubjectType = 'STUDENT',
  daysSince: number = 0
): { sigma: number; rawSigma: number; decay: number; subjectWeight: number } {
  const config = BEHAVIOR_SIGMA_CONFIG[behaviorType];
  
  // 기본 σ 계산
  let sigma = config.base;
  for (const [key, value] of Object.entries(modifiers)) {
    const modifier = config.modifiers[key];
    if (modifier !== undefined) {
      if (typeof value === 'boolean' && value) {
        sigma += modifier;
      } else if (typeof value === 'number') {
        sigma += modifier * value;
      }
    }
  }
  
  // 범위 제한
  const [min, max] = config.range;
  const rawSigma = Math.max(min, Math.min(max, sigma));
  
  // 주체 가중치 적용
  const subjectWeight = SUBJECT_WEIGHTS[subject];
  sigma = rawSigma * subjectWeight;
  
  // 시간 감쇠 적용
  const decay = calculateDecay(daysSince, TIER_DECAY_HALFLIFE[config.tier]);
  sigma = sigma * decay;
  
  return { sigma, rawSigma, decay, subjectWeight };
}

// ============================================
// 7. σ 통합 계산
// ============================================

interface BehaviorRecord {
  type: BehaviorType;
  modifiers?: Record<string, boolean | number>;
  subject?: SubjectType;
  recordedAt: Date;
}

interface ExternalRecord {
  source: ExternalSource;
  sigmaContribution: number;
}

/**
 * 내부 σ 계산 (행위 기반, 시간 감쇠 적용)
 */
export function calculateInternalSigma(
  behaviors: BehaviorRecord[],
  referenceDate: Date = new Date()
): { sigma: number; normalized: number; dataRatio: number } {
  const TOTAL_BEHAVIOR_TYPES = 14;
  const uniqueTypes = new Set(behaviors.map(b => b.type)).size;
  const dataRatio = uniqueTypes / TOTAL_BEHAVIOR_TYPES;
  
  const sigma = behaviors.reduce((sum, b) => {
    const daysSince = Math.floor(
      (referenceDate.getTime() - new Date(b.recordedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const result = calculateBehaviorSigma(b.type, b.modifiers, b.subject, daysSince);
    return sum + result.sigma;
  }, 0);
  
  // 정규화: 데이터 비율에 따라 조정
  const normalized = sigma * Math.max(dataRatio, 0.3);  // 최소 30% 보장
  
  return { sigma, normalized, dataRatio };
}

/**
 * 외부 σ 계산 (데이터 가용성 정규화)
 */
export function calculateExternalSigma(
  data: ExternalRecord[]
): { sigma: number; normalized: number; dataRatio: number } {
  const TOTAL_SOURCES = 8;
  const availableSources = new Set(data.map(d => d.source)).size;
  const dataRatio = availableSources / TOTAL_SOURCES;
  
  // 외부 데이터 없으면 σ_external = 0
  if (data.length === 0) {
    return { sigma: 0, normalized: 0, dataRatio: 0 };
  }
  
  const sigma = data.reduce((total, item) => {
    const weight = EXTERNAL_WEIGHTS[item.source];
    return total + (weight * item.sigmaContribution);
  }, 0);
  
  // 정규화: 데이터 비율에 따라 조정
  const normalized = sigma * dataRatio;
  
  return { sigma, normalized, dataRatio };
}

/**
 * 전체 σ 계산
 * σ_total = σ_base + σ_internal_norm + σ_external_norm
 */
export function calculateTotalSigma(
  sigmaBase: number,
  sigmaInternal: number,
  sigmaExternal: number
): number {
  const total = sigmaBase + sigmaInternal + sigmaExternal;
  return clampSigma(total);
}

/**
 * 관계 σ 종합 계산
 */
export function calculateRelationshipSigma(
  behaviors: BehaviorRecord[],
  externalData: ExternalRecord[],
  sigmaBase: number = 1.0
): {
  sigmaTotal: number;
  sigmaInternal: number;
  sigmaExternal: number;
  grade: SigmaGrade;
  internalDataRatio: number;
  externalDataRatio: number;
} {
  const internal = calculateInternalSigma(behaviors);
  const external = calculateExternalSigma(externalData);
  const sigmaTotal = calculateTotalSigma(sigmaBase, internal.normalized, external.normalized);
  
  return {
    sigmaTotal,
    sigmaInternal: internal.normalized,
    sigmaExternal: external.normalized,
    grade: getSigmaGrade(sigmaTotal),
    internalDataRatio: internal.dataRatio,
    externalDataRatio: external.dataRatio,
  };
}

// ============================================
// 8. σ 등급 판정
// ============================================

export function getSigmaGrade(sigma: number): SigmaGrade {
  if (sigma < 0.7) return 'critical';
  if (sigma < 1.0) return 'at_risk';
  if (sigma < 1.3) return 'neutral';
  if (sigma < 1.6) return 'good';
  if (sigma < 2.0) return 'loyal';
  return 'advocate';
}

// ============================================
// 9. Alert 시스템
// ============================================

interface AlertTrigger {
  level: AlertLevel;
  type: string;
  message: string;
  nodeId?: string;
}

/**
 * Alert 트리거 검사
 */
export function checkAlerts(
  currentSigma: number,
  previousSigma: number,
  daysDelta: number,
  behaviors: BehaviorRecord[]
): AlertTrigger[] {
  const alerts: AlertTrigger[] = [];
  const sigmaDelta = currentSigma - previousSigma;
  const sigmaDeltaPerDay = sigmaDelta / Math.max(daysDelta, 1);
  const sigmaDelta30d = sigmaDeltaPerDay * 30;
  
  // Critical Alerts
  if (currentSigma < 0.7) {
    alerts.push({
      level: 'critical',
      type: 'churn_imminent',
      message: `σ < 0.7 이탈 임박 (현재: ${currentSigma.toFixed(2)})`,
    });
  }
  
  if (sigmaDelta30d < -0.3) {
    alerts.push({
      level: 'critical',
      type: 'sigma_crash',
      message: `σ 급락 감지 (30일 예상 변화: ${sigmaDelta30d.toFixed(2)})`,
    });
  }
  
  // Tier 6 행위 발생 체크
  const tier6Behaviors = behaviors.filter(b => 
    ['COMPLAINT', 'CHURN_SIGNAL'].includes(b.type) &&
    new Date(b.recordedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  );
  if (tier6Behaviors.length > 0) {
    alerts.push({
      level: 'critical',
      type: 'negative_behavior',
      message: `부정 행위 감지 (${tier6Behaviors.map(b => b.type).join(', ')})`,
    });
  }
  
  // Warning Alerts
  if (currentSigma >= 0.7 && currentSigma < 1.0) {
    alerts.push({
      level: 'warning',
      type: 'churn_risk',
      message: `이탈 위험 (σ: ${currentSigma.toFixed(2)})`,
    });
  }
  
  if (sigmaDelta30d < -0.15 && sigmaDelta30d >= -0.3) {
    alerts.push({
      level: 'warning',
      type: 'sigma_declining',
      message: `σ 하락 추세 (30일 예상: ${sigmaDelta30d.toFixed(2)})`,
    });
  }
  
  // Positive Alerts
  if (currentSigma >= 2.0 && previousSigma < 2.0) {
    alerts.push({
      level: 'positive',
      type: 'advocate_achieved',
      message: `💜 Advocate 등급 달성! (σ: ${currentSigma.toFixed(2)})`,
    });
  }
  
  const referralBehaviors = behaviors.filter(b => 
    b.type === 'REFERRAL' &&
    new Date(b.recordedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  );
  if (referralBehaviors.length > 0) {
    alerts.push({
      level: 'positive',
      type: 'referral',
      message: `소개 등록 발생!`,
    });
  }
  
  return alerts;
}

// ============================================
// 10. 유틸리티 함수
// ============================================

export function formatValue(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

export function calculateSigmaDistribution(
  sigmas: number[]
): Record<SigmaGrade, number> {
  const dist: Record<SigmaGrade, number> = {
    critical: 0, at_risk: 0, neutral: 0, good: 0, loyal: 0, advocate: 0,
  };
  sigmas.forEach(s => dist[getSigmaGrade(s)]++);
  return dist;
}

/** 건강한 조직 목표 분포 */
export const TARGET_SIGMA_DISTRIBUTION: Record<SigmaGrade, number> = {
  critical: 0.05, at_risk: 0.10, neutral: 0.30, good: 0.35, loyal: 0.15, advocate: 0.05,
};

/**
 * 이탈 위험도 계산 (0~1)
 */
export function calculateChurnRisk(
  sigma: number,
  sigmaTrend: number = 0  // 일간 변화율
): number {
  const baseRisk = Math.max(0, 1.5 - sigma) / 1.0;
  const trendFactor = sigmaTrend < 0 ? Math.abs(sigmaTrend) * 2 : 0;
  return Math.min(1, baseRisk + trendFactor);
}

/**
 * 잠재 고객 σ 계산
 */
export function calculateProspectSigma(
  consultationCount: number,
  webVisitCount: number,
  daysSinceFirstContact: number
): number {
  const sigmaInitial = 1.0;
  const engagementFactor = consultationCount * 0.1 + webVisitCount * 0.05;
  
  // 90일 초과 시 관심 감소
  const interestDecay = daysSinceFirstContact > 90 
    ? 0.7 
    : 1 - (daysSinceFirstContact / 90) * 0.3;
  
  return sigmaInitial * (1 + engagementFactor) * interestDecay;
}

// ============================================
// 11. 타입 내보내기
// ============================================

export interface Node {
  id: string;
  type: NodeType;
  name: string;
  lambda: number;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Relationship {
  id: string;
  nodeAId: string;
  nodeBId: string;
  sigmaAB: number;  // A→B 방향 σ
  sigmaBA: number;  // B→A 방향 σ (비대칭 허용)
  sigma: number;    // 대표 σ (평균 또는 단방향)
  sigmaHistory: Array<{ date: string; sigma: number }>;
  tTotal: number;
  aValue: number;
  status: 'active' | 'inactive' | 'churned';
  createdAt: Date;
  updatedAt: Date;
}

export interface Behavior {
  id: string;
  nodeId: string;
  relationshipId?: string;
  behaviorType: BehaviorType;
  tier: BehaviorTier;
  sigmaContribution: number;
  subject: SubjectType;
  modifiers?: Record<string, boolean | number>;
  metadata?: Record<string, unknown>;
  recordedAt: Date;
}

export interface TimeLog {
  id: string;
  nodeId?: string;
  relationshipId?: string;
  tPhysical: number;
  tValue: number;
  activityType: string;
  lambdaMultiplier: number;  // 활동 유형별 가중치 (1:1=1.5, 소그룹=1.0, 대그룹=0.5)
  metadata?: Record<string, unknown>;
  recordedAt: Date;
}

export interface Alert {
  id: string;
  nodeId?: string;
  relationshipId?: string;
  level: AlertLevel;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}
