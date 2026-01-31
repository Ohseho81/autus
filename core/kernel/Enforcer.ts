/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTUS CORE ENFORCER - 헌법 집행자
 * Core Kernel의 실행 레이어. 판단만 하고 실행은 하지 않는다.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  AUTUS_CONSTITUTION,
  QUALITY_SCORE,
  TRUST_WEIGHT,
  ModuleTier,
  ProofType,
} from './CONSTITUTION';

// ============================================
// 타입 정의
// ============================================
export interface Module {
  id: string;
  name: string;
  tier: ModuleTier;
  metrics: {
    userSatisfaction: number;
    reuseRate: number;
    failureRate: number;
    outcomeImpact: number;
  };
  proofs: Record<ProofType, unknown>;
  createdAt: number;
  lastEvaluatedAt: number;
}

export interface Proposal {
  id: string;
  moduleId: string;
  type: 'PROMOTE' | 'DEMOTE' | 'MODIFY' | 'DELETE';
  requestedBy: string;
  requestedAt: number;
  userScore: number;
  trustScore: number;
  reason: string;
}

// Pipeline에서 사용하는 Proposal 형식
export interface EnforcerProposal {
  id: string;
  moduleId: string;
  proposalType: 'PROMOTE' | 'DEMOTE' | 'MODIFY' | 'DELETE' | 'CREATE';
  qualityMetrics: {
    userSatisfaction: number;
    reuseRate: number;
    failureRate: number;
    outcomeImpact: number;
  };
  proofs: Record<ProofType, unknown>;
  requestedAt: number;
  currentTime: number;
  systemContext: {
    totalModules: number;
    standardModules: number;
  };
}

export type VerdictStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

export interface LawResult {
  law: string;
  passed: boolean;
  reason: string;
  details?: Record<string, unknown>;
}

export interface Verdict {
  proposalId: string;
  status: VerdictStatus;
  decision: VerdictStatus; // 하위 호환
  reason: string;
  score: number;
  threshold: number;
  checkedAt: number;
  violatedLaws: string[];
  violations: string[];  // 하위 호환
  lawResults: LawResult[];
}

// ============================================
// Core Enforcer Class
// ============================================
export class CoreEnforcer {
  private modules: Map<string, Module> = new Map();
  private proposals: Map<string, Proposal> = new Map();
  private verdicts: Map<string, Verdict> = new Map();

  // ----------------------------------------
  // K1: 점수 기반 승격 검증
  // ----------------------------------------
  checkK1(module: Module, targetTier: ModuleTier): {
    passed: boolean;
    score: number;
    threshold: number;
    reason: string;
  } {
    const score = QUALITY_SCORE.calculate(module.metrics);
    const threshold = QUALITY_SCORE.thresholds[targetTier] || 0;
    const passed = AUTUS_CONSTITUTION.laws.K1.enforce(score, threshold);

    return {
      passed,
      score,
      threshold,
      reason: passed
        ? `Score ${score.toFixed(1)} >= Threshold ${threshold}`
        : `Score ${score.toFixed(1)} < Threshold ${threshold}`,
    };
  }

  // ----------------------------------------
  // K2: 사용자 입력 신호 처리
  // ----------------------------------------
  checkK2(proposal: Proposal, module: Module): {
    passed: boolean;
    decisionScore: number;
    weightedScore: number;
    reason: string;
  } {
    const decisionScore = AUTUS_CONSTITUTION.laws.K2.enforce({
      userSignal: proposal.userScore,
      failureRate: module.metrics.failureRate,
      reuseRate: module.metrics.reuseRate,
      riskScore: 100 - module.metrics.outcomeImpact, // 높은 impact = 낮은 risk
    });

    const weightedScore = TRUST_WEIGHT.calculate(
      proposal.userScore,
      proposal.trustScore
    );

    // 결정 점수가 50 이상이면 통과
    const passed = decisionScore >= 50;

    return {
      passed,
      decisionScore,
      weightedScore,
      reason: passed
        ? `Decision score ${decisionScore.toFixed(1)} >= 50`
        : `Decision score ${decisionScore.toFixed(1)} < 50 (signal weak)`,
    };
  }

  // ----------------------------------------
  // K3: Proof 검증
  // ----------------------------------------
  checkK3(module: Module): {
    passed: boolean;
    missingProofs: ProofType[];
    reason: string;
  } {
    const passed = AUTUS_CONSTITUTION.laws.K3.enforce(module.proofs);
    const missingProofs: ProofType[] = [];

    for (const proof of AUTUS_CONSTITUTION.laws.K3.requiredProofs) {
      if (!module.proofs[proof]) {
        missingProofs.push(proof);
      }
    }

    return {
      passed,
      missingProofs,
      reason: passed
        ? 'All proofs present'
        : `Missing proofs: ${missingProofs.join(', ')}`,
    };
  }

  // ----------------------------------------
  // K4: 대기 기간 검증
  // ----------------------------------------
  checkK4(
    proposal: Proposal,
    changeType: string = 'NORMAL'
  ): {
    passed: boolean;
    waitRemaining: number;
    reason: string;
  } {
    const now = Date.now();
    const result = AUTUS_CONSTITUTION.laws.K4.enforce(
      changeType,
      proposal.requestedAt,
      now
    );

    const waited = now - proposal.requestedAt;
    const waitRemaining = Math.max(
      0,
      AUTUS_CONSTITUTION.laws.K4.minWaitPeriod - waited
    );

    return {
      passed: result.allowed,
      waitRemaining,
      reason: result.reason,
    };
  }

  // ----------------------------------------
  // K5: Standard 비율 검증
  // ----------------------------------------
  checkK5(): {
    passed: boolean;
    currentRatio: number;
    maxAllowed: number;
    standardCount: number;
    totalCount: number;
    reason: string;
  } {
    const allModules = Array.from(this.modules.values());
    const totalCount = allModules.length;
    const standardCount = allModules.filter(m => m.tier === 'STANDARD').length;

    const result = AUTUS_CONSTITUTION.laws.K5.enforce(totalCount, standardCount);

    return {
      passed: result.allowed,
      currentRatio: result.currentRatio,
      maxAllowed: result.maxAllowed,
      standardCount,
      totalCount,
      reason: result.allowed
        ? `Standard ratio ${(result.currentRatio * 100).toFixed(1)}% <= 10%`
        : `Standard ratio ${(result.currentRatio * 100).toFixed(1)}% > 10% (limit exceeded)`,
    };
  }

  // ----------------------------------------
  // 종합 판정 (기존 Proposal 형식)
  // ----------------------------------------
  evaluateLegacy(proposal: Proposal): Verdict {
    const module = this.modules.get(proposal.moduleId);
    if (!module) {
      return this.createRejectedVerdict(proposal.id, 'Module not found');
    }

    const violatedLaws: string[] = [];
    const lawResults: LawResult[] = [];
    let finalScore = 0;
    let threshold = 0;

    // K1 검증
    if (proposal.type === 'PROMOTE') {
      const targetTier = this.getNextTier(module.tier);
      const k1Result = this.checkK1(module, targetTier);
      lawResults.push({ law: 'K1', passed: k1Result.passed, reason: k1Result.reason });
      if (!k1Result.passed) violatedLaws.push('K1');
      finalScore = k1Result.score;
      threshold = k1Result.threshold;
    }

    // K2 검증
    const k2Result = this.checkK2(proposal, module);
    lawResults.push({ law: 'K2', passed: k2Result.passed, reason: k2Result.reason });
    if (!k2Result.passed) violatedLaws.push('K2');

    // K3 검증
    const k3Result = this.checkK3(module);
    lawResults.push({ law: 'K3', passed: k3Result.passed, reason: k3Result.reason });
    if (!k3Result.passed) violatedLaws.push('K3');

    // K4 검증
    const k4Result = this.checkK4(proposal);
    lawResults.push({ law: 'K4', passed: k4Result.passed, reason: k4Result.reason });
    if (!k4Result.passed) violatedLaws.push('K4');

    // K5 검증 (승격 시)
    if (proposal.type === 'PROMOTE' && this.getNextTier(module.tier) === 'STANDARD') {
      const k5Result = this.checkK5();
      lawResults.push({ law: 'K5', passed: k5Result.passed, reason: k5Result.reason });
      if (!k5Result.passed) violatedLaws.push('K5');
    }

    return this.createVerdict(proposal.id, violatedLaws, lawResults, finalScore, threshold, k4Result);
  }

  // ----------------------------------------
  // 종합 판정 (EnforcerProposal 형식 - Pipeline용)
  // ----------------------------------------
  evaluate(proposal: EnforcerProposal): Verdict {
    const lawResults: LawResult[] = [];
    const violatedLaws: string[] = [];

    // 가상 모듈 생성 (EnforcerProposal에서)
    const virtualModule: Module = {
      id: proposal.moduleId,
      name: proposal.moduleId,
      tier: 'EXPERIMENTAL',
      metrics: proposal.qualityMetrics,
      proofs: proposal.proofs,
      createdAt: proposal.requestedAt,
      lastEvaluatedAt: Date.now(),
    };

    // K1 검증 - Quality Score
    const score = QUALITY_SCORE.calculate(proposal.qualityMetrics);
    const threshold = proposal.proposalType === 'CREATE' ? 0 : QUALITY_SCORE.thresholds.STABLE;
    const k1Passed = score >= threshold;
    lawResults.push({
      law: 'K1',
      passed: k1Passed,
      reason: k1Passed
        ? `Score ${score.toFixed(1)} >= Threshold ${threshold}`
        : `Score ${score.toFixed(1)} < Threshold ${threshold}`,
      details: { score, threshold },
    });
    if (!k1Passed && proposal.proposalType === 'PROMOTE') violatedLaws.push('K1');

    // K2 검증 - 사용자 신호는 자동 통과 (Pipeline에서 이미 필터링됨)
    lawResults.push({
      law: 'K2',
      passed: true,
      reason: 'Filtered by MoltBot',
    });

    // K3 검증 - Proof
    const k3Result = AUTUS_CONSTITUTION.laws.K3.enforce(proposal.proofs);
    lawResults.push({
      law: 'K3',
      passed: k3Result,
      reason: k3Result ? 'All proofs present' : 'Missing required proofs',
    });
    if (!k3Result) violatedLaws.push('K3');

    // K4 검증 - 대기 기간
    const waited = proposal.currentTime - proposal.requestedAt;
    const minWait = AUTUS_CONSTITUTION.laws.K4.minWaitPeriod;
    const k4Passed = waited >= minWait;
    lawResults.push({
      law: 'K4',
      passed: k4Passed,
      reason: k4Passed
        ? 'Wait period passed'
        : `${Math.ceil((minWait - waited) / 3600000)}h remaining`,
      details: { waited, minWait },
    });
    if (!k4Passed) violatedLaws.push('K4');

    // K5 검증 - Standard 비율
    const k5Result = AUTUS_CONSTITUTION.laws.K5.enforce(
      proposal.systemContext.totalModules,
      proposal.systemContext.standardModules
    );
    lawResults.push({
      law: 'K5',
      passed: k5Result.allowed,
      reason: k5Result.allowed
        ? `Standard ratio ${(k5Result.currentRatio * 100).toFixed(1)}% <= 10%`
        : `Standard ratio ${(k5Result.currentRatio * 100).toFixed(1)}% > 10%`,
      details: k5Result,
    });
    if (!k5Result.allowed && proposal.proposalType === 'PROMOTE') violatedLaws.push('K5');

    return this.createVerdict(
      proposal.id,
      violatedLaws,
      lawResults,
      score,
      threshold,
      { passed: k4Passed, waitRemaining: Math.max(0, minWait - waited), reason: '' }
    );
  }

  // ----------------------------------------
  // Verdict 생성 헬퍼
  // ----------------------------------------
  private createVerdict(
    proposalId: string,
    violatedLaws: string[],
    lawResults: LawResult[],
    score: number,
    threshold: number,
    k4Result: { passed: boolean; waitRemaining: number; reason: string }
  ): Verdict {
    let status: VerdictStatus;
    let reason: string;

    if (violatedLaws.length === 0) {
      status = 'APPROVED';
      reason = 'All constitution checks passed';
    } else if (violatedLaws.includes('K4') && violatedLaws.length === 1) {
      status = 'PENDING';
      reason = `Waiting period: ${Math.ceil(k4Result.waitRemaining / 3600000)}h remaining`;
    } else {
      status = 'REJECTED';
      reason = `Constitution violated: ${violatedLaws.join(', ')}`;
    }

    const verdict: Verdict = {
      proposalId,
      status,
      decision: status, // 하위 호환
      reason,
      score,
      threshold,
      checkedAt: Date.now(),
      violatedLaws,
      violations: violatedLaws.map(law => `${law}: ${lawResults.find(r => r.law === law)?.reason}`),
      lawResults,
    };

    this.verdicts.set(proposalId, verdict);
    return verdict;
  }

  private createRejectedVerdict(proposalId: string, reason: string): Verdict {
    return {
      proposalId,
      status: 'REJECTED',
      decision: 'REJECTED',
      reason,
      score: 0,
      threshold: 0,
      checkedAt: Date.now(),
      violatedLaws: [],
      violations: [reason],
      lawResults: [],
    };
  }

  // ----------------------------------------
  // 헬퍼 메서드
  // ----------------------------------------
  private getNextTier(currentTier: ModuleTier): ModuleTier {
    const tiers = AUTUS_CONSTITUTION.laws.K5.tiers;
    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex < tiers.length - 1 && currentTier !== 'HIDDEN') {
      return tiers[currentIndex + 1] as ModuleTier;
    }
    return currentTier;
  }

  registerModule(module: Module): void {
    this.modules.set(module.id, module);
  }

  submitProposal(proposal: Proposal): Verdict {
    this.proposals.set(proposal.id, proposal);
    return this.evaluate(proposal);
  }

  getStats(): {
    totalModules: number;
    byTier: Record<ModuleTier, number>;
    pendingProposals: number;
    approvedVerdicts: number;
    rejectedVerdicts: number;
  } {
    const allModules = Array.from(this.modules.values());
    const allVerdicts = Array.from(this.verdicts.values());

    return {
      totalModules: allModules.length,
      byTier: {
        EXPERIMENTAL: allModules.filter(m => m.tier === 'EXPERIMENTAL').length,
        STABLE: allModules.filter(m => m.tier === 'STABLE').length,
        STANDARD: allModules.filter(m => m.tier === 'STANDARD').length,
        HIDDEN: allModules.filter(m => m.tier === 'HIDDEN').length,
      },
      pendingProposals: allVerdicts.filter(v => v.decision === 'PENDING').length,
      approvedVerdicts: allVerdicts.filter(v => v.decision === 'APPROVED').length,
      rejectedVerdicts: allVerdicts.filter(v => v.decision === 'REJECTED').length,
    };
  }
}

// 싱글톤 인스턴스
export const coreEnforcer = new CoreEnforcer();
export default CoreEnforcer;
