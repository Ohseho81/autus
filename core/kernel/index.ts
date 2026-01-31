/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTUS CORE KERNEL - 메인 진입점
 *
 * "사람의 판단이 개입되는 순간, 시스템은 오염된다"
 *
 * 이 커널은 AUTUS의 절대 불변 헌법을 구현합니다.
 * - 5개의 헌법 (K1-K5)
 * - MoltBot 압력 정제기
 * - Core Enforcer
 * - Pipeline 오케스트레이터
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================
// 헌법 (CONSTITUTION)
// ============================================
export {
  // 5대 헌법
  K1_PROMOTION_BY_SCORE_ONLY,
  K2_USER_INPUT_IS_SIGNAL,
  K3_NO_PROOF_NO_RESULT,
  K4_CORE_NEVER_REACTS_DIRECTLY,
  K5_STANDARD_IS_RARE,

  // 공식
  QUALITY_SCORE,
  TRUST_WEIGHT,

  // 전체 헌법 객체
  AUTUS_CONSTITUTION,

  // 타입
  type ConstitutionLaw,
  type ModuleTier,
  type ProofType,
  type PipelineStage,
} from './CONSTITUTION';

// ============================================
// MoltBot 필터 (압력 정제기)
// ============================================
export {
  MoltBotFilter,
  moltBotFilter,

  // 타입
  type RawUserInput,
  type PainSignal,
  type Proposal,
  type FilterStats,
} from './MoltBotFilter';

// ============================================
// Core Enforcer (헌법 집행자)
// ============================================
export {
  CoreEnforcer,
  coreEnforcer,

  // 타입
  type EnforcerProposal,
  type Verdict,
  type LawResult,
  type VerdictStatus,
} from './Enforcer';

// ============================================
// Pipeline (오케스트레이터)
// ============================================
export {
  CorePipeline,
  corePipeline,

  // 타입
  type PipelineInput,
  type PipelineResult,
  type ApprovedProposal,
  type RejectedProposal,
  type PendingProposal,
  type PipelineSummary,
  type ProofPack,
} from './Pipeline';

// ============================================
// ProofPack (K3 증거 생성)
// ============================================
export {
  ProofPackBuilder,
  ProofPackValidator,
  createQuickProofPack,
  validateProofPack,

  // 타입
  type InputLog,
  type ProcessTrace,
  type ProcessStage,
  type CompleteProofPack,
} from './ProofPack';

// ============================================
// 편의 함수
// ============================================

/**
 * AUTUS Core를 통해 사용자 입력 처리
 *
 * @example
 * const result = processUserInputs([
 *   { id: '1', userId: 'user1', type: 'COMPLAINT', content: '...' }
 * ]);
 * console.log(result.summary.discardRate); // 0.9+ 목표
 */
export function processUserInputs(
  inputs: import('./MoltBotFilter').RawUserInput[],
  context: { totalModules: number; standardModules: number } = { totalModules: 100, standardModules: 8 }
): import('./Pipeline').PipelineResult {
  const { corePipeline } = require('./Pipeline');
  return corePipeline.process({ inputs, context });
}

/**
 * Quality Score 계산
 */
export function calculateQualityScore(metrics: {
  userSatisfaction: number;
  reuseRate: number;
  failureRate: number;
  outcomeImpact: number;
}): number {
  const { QUALITY_SCORE } = require('./CONSTITUTION');
  return QUALITY_SCORE.calculate(metrics);
}

/**
 * 모듈 승격 가능 여부 확인
 */
export function canPromote(
  score: number,
  targetTier: 'STABLE' | 'STANDARD'
): boolean {
  const { QUALITY_SCORE, K1_PROMOTION_BY_SCORE_ONLY } = require('./CONSTITUTION');
  const threshold = QUALITY_SCORE.thresholds[targetTier];
  return K1_PROMOTION_BY_SCORE_ONLY.enforce(score, threshold);
}

/**
 * Standard 비율 검증 (K5)
 */
export function validateStandardRatio(
  totalModules: number,
  standardModules: number
): { allowed: boolean; currentRatio: number; maxAllowed: number } {
  const { K5_STANDARD_IS_RARE } = require('./CONSTITUTION');
  return K5_STANDARD_IS_RARE.enforce(totalModules, standardModules);
}

// ============================================
// 커널 정보
// ============================================
export const KERNEL_INFO = {
  name: 'AUTUS Core Kernel',
  version: '1.0.0',
  createdAt: '2026-01-31',
  philosophy: '사람의 판단이 개입되는 순간, 시스템은 오염된다',
  laws: 5,
  moltBotKPI: '버린 비율 (높을수록 좋음)',
  targetDiscardRate: 0.90, // 90%
} as const;
