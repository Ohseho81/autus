/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTUS CORE KERNEL - 절대 불변 헌법
 * 이 파일은 수정 금지. 수정 시 전체 시스템 무효화.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================
// K1. 표준 승격은 점수로만
// ============================================
export const K1_PROMOTION_BY_SCORE_ONLY = {
  id: 'K1',
  name: 'PROMOTION_BY_SCORE_ONLY',
  rule: '어떤 앱/모듈도 Score ≥ Threshold 일 때만 승격 가능',
  forbidden: [
    '좋아 보인다',
    '대표가 원한다',
    '전략적으로 필요하다',
    '급하다',
    '경쟁사가 한다',
  ],
  allowed: ['Score ≥ Threshold'],
  enforce: (score: number, threshold: number): boolean => score >= threshold,
} as const;

// ============================================
// K2. 사용자 의견은 신호이지 결정이 아니다
// ============================================
export const K2_USER_INPUT_IS_SIGNAL = {
  id: 'K2',
  name: 'USER_INPUT_IS_SIGNAL',
  rule: '사용자 피드백 = 입력값, 판단 = 공식',
  formula: 'Decision = f(UserSignal, FailureRate, ReuseRate, RiskScore)',
  enforce: (input: {
    userSignal: number;      // 0-100
    failureRate: number;     // 0-100
    reuseRate: number;       // 0-100
    riskScore: number;       // 0-100
  }): number => {
    // 가중치 적용된 결정 점수
    return (
      input.userSignal * 0.25 +
      (100 - input.failureRate) * 0.25 +
      input.reuseRate * 0.25 +
      (100 - input.riskScore) * 0.25
    );
  },
} as const;

// ============================================
// K3. Proof 없는 결과는 존재하지 않는다
// ============================================
export const K3_NO_PROOF_NO_RESULT = {
  id: 'K3',
  name: 'NO_PROOF_NO_RESULT',
  rule: 'Proof Pack 5종 미완성 → 자동 탈락',
  requiredProofs: [
    'INPUT_LOG',        // 입력 기록
    'PROCESS_TRACE',    // 처리 과정
    'OUTPUT_HASH',      // 결과 해시
    'TIMESTAMP',        // 시간 증명
    'VALIDATOR_SIG',    // 검증자 서명
  ] as const,
  enforce: (proofs: Record<string, unknown>): boolean => {
    const required = K3_NO_PROOF_NO_RESULT.requiredProofs;
    return required.every(proof =>
      proofs[proof] !== undefined && proofs[proof] !== null
    );
  },
} as const;

// ============================================
// K4. Core는 직접 반응하지 않는다
// ============================================
export const K4_CORE_NEVER_REACTS_DIRECTLY = {
  id: 'K4',
  name: 'CORE_NEVER_REACTS_DIRECTLY',
  rule: '모든 변화는: 입력 → 대기 → 평가 → 적용',
  pipeline: ['INPUT', 'QUEUE', 'EVALUATE', 'APPLY'] as const,
  forbidden: ['즉각 수정', '핫픽스 (안전/법적 리스크 제외)'],
  allowedHotfix: ['SECURITY_CRITICAL', 'LEGAL_COMPLIANCE'],
  minWaitPeriod: 24 * 60 * 60 * 1000, // 24시간 (ms)
  enforce: (
    changeType: string,
    requestedAt: number,
    currentTime: number
  ): { allowed: boolean; reason: string } => {
    // 안전/법적 리스크는 즉시 허용
    if (K4_CORE_NEVER_REACTS_DIRECTLY.allowedHotfix.includes(changeType)) {
      return { allowed: true, reason: 'HOTFIX_ALLOWED' };
    }
    // 대기 기간 확인
    const waited = currentTime - requestedAt;
    if (waited < K4_CORE_NEVER_REACTS_DIRECTLY.minWaitPeriod) {
      return {
        allowed: false,
        reason: `WAIT_REQUIRED: ${Math.ceil((K4_CORE_NEVER_REACTS_DIRECTLY.minWaitPeriod - waited) / 3600000)}h remaining`
      };
    }
    return { allowed: true, reason: 'WAIT_PERIOD_PASSED' };
  },
} as const;

// ============================================
// K5. Standard는 극소수만
// ============================================
export const K5_STANDARD_IS_RARE = {
  id: 'K5',
  name: 'STANDARD_IS_RARE',
  rule: 'Standard ≤ 10% of total modules',
  maxStandardRatio: 0.10,
  tiers: ['EXPERIMENTAL', 'STABLE', 'STANDARD', 'HIDDEN'] as const,
  enforce: (
    totalModules: number,
    standardModules: number
  ): { allowed: boolean; currentRatio: number; maxAllowed: number } => {
    const currentRatio = standardModules / totalModules;
    const maxAllowed = Math.floor(totalModules * K5_STANDARD_IS_RARE.maxStandardRatio);
    return {
      allowed: currentRatio <= K5_STANDARD_IS_RARE.maxStandardRatio,
      currentRatio,
      maxAllowed,
    };
  },
} as const;

// ============================================
// Quality Score (고정 공식)
// ============================================
export const QUALITY_SCORE = {
  name: 'QUALITY_SCORE',
  formula: 'Q = 0.4*UserSatisfaction + 0.2*ReuseRate + 0.2*(100-FailureRate) + 0.2*OutcomeImpact',
  weights: {
    userSatisfaction: 0.4,
    reuseRate: 0.2,
    reliability: 0.2,  // 100 - FailureRate
    outcomeImpact: 0.2,
  },
  calculate: (input: {
    userSatisfaction: number;  // 0-100
    reuseRate: number;         // 0-100
    failureRate: number;       // 0-100
    outcomeImpact: number;     // 0-100
  }): number => {
    return (
      input.userSatisfaction * 0.4 +
      input.reuseRate * 0.2 +
      (100 - input.failureRate) * 0.2 +
      input.outcomeImpact * 0.2
    );
  },
  thresholds: {
    EXPERIMENTAL: 0,
    STABLE: 60,
    STANDARD: 85,
  },
} as const;

// ============================================
// Trust Weight (사용자 신뢰도 가중치)
// ============================================
export const TRUST_WEIGHT = {
  name: 'TRUST_WEIGHT',
  formula: 'WeightedScore = UserScore * TrustScore',
  calculate: (userScore: number, trustScore: number): number => {
    return userScore * (trustScore / 100);
  },
  trustFactors: {
    accountAge: 0.2,      // 계정 기간
    accuracy: 0.4,        // 과거 제안 정확도
    engagement: 0.2,      // 참여도
    consistency: 0.2,     // 일관성
  },
} as const;

// ============================================
// 헌법 전체 내보내기
// ============================================
export const AUTUS_CONSTITUTION = {
  version: '1.0.0',
  createdAt: '2026-01-31',
  immutable: true,
  laws: {
    K1: K1_PROMOTION_BY_SCORE_ONLY,
    K2: K2_USER_INPUT_IS_SIGNAL,
    K3: K3_NO_PROOF_NO_RESULT,
    K4: K4_CORE_NEVER_REACTS_DIRECTLY,
    K5: K5_STANDARD_IS_RARE,
  },
  formulas: {
    QUALITY_SCORE,
    TRUST_WEIGHT,
  },
  validate: (): boolean => {
    // 헌법 무결성 검증
    const laws = Object.values(AUTUS_CONSTITUTION.laws);
    return laws.every(law =>
      law.id && law.name && law.rule && typeof law.enforce === 'function'
    );
  },
} as const;

// ============================================
// 타입 정의
// ============================================
export type ConstitutionLaw = typeof K1_PROMOTION_BY_SCORE_ONLY;
export type ModuleTier = typeof K5_STANDARD_IS_RARE.tiers[number];
export type ProofType = typeof K3_NO_PROOF_NO_RESULT.requiredProofs[number];
export type PipelineStage = typeof K4_CORE_NEVER_REACTS_DIRECTLY.pipeline[number];

export default AUTUS_CONSTITUTION;
