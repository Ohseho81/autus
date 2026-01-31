/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTUS CORE PIPELINE - 전체 흐름 오케스트레이터
 *
 * 흐름: UserInput → MoltBot Filter → Enforcer → Verdict → Execution
 *
 * 핵심 원칙:
 * - 사람의 개입 없음
 * - 모든 결정은 공식으로
 * - 90% 이상 버림
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { moltBotFilter, RawUserInput, Proposal, FilterStats } from './MoltBotFilter';
import { coreEnforcer, EnforcerProposal, Verdict } from './Enforcer';
import { AUTUS_CONSTITUTION, ProofType } from './CONSTITUTION';

// ============================================
// 타입 정의
// ============================================
export interface PipelineInput {
  inputs: RawUserInput[];
  context: {
    totalModules: number;
    standardModules: number;
  };
}

export interface PipelineResult {
  // 필터링 결과
  filterStats: FilterStats;

  // 승인된 Proposal들
  approvedProposals: ApprovedProposal[];

  // 거부된 Proposal들
  rejectedProposals: RejectedProposal[];

  // 대기 중인 Proposal들
  pendingProposals: PendingProposal[];

  // 전체 통계
  summary: PipelineSummary;
}

export interface ApprovedProposal {
  proposal: Proposal;
  verdict: Verdict;
  proofPack: ProofPack;
  executionOrder: number;
}

export interface RejectedProposal {
  proposal: Proposal;
  verdict: Verdict;
  reason: string;
}

export interface PendingProposal {
  proposal: Proposal;
  verdict: Verdict;
  waitTimeRemaining: number; // ms
}

export interface PipelineSummary {
  totalInputs: number;
  noiseRemoved: number;
  proposalsGenerated: number;
  approved: number;
  rejected: number;
  pending: number;
  discardRate: number;
  constitutionVersion: string;
}

export interface ProofPack {
  INPUT_LOG: string;
  PROCESS_TRACE: string;
  OUTPUT_HASH: string;
  TIMESTAMP: number;
  VALIDATOR_SIG: string;
}

// ============================================
// Pipeline Class
// ============================================
export class CorePipeline {
  private executionQueue: ApprovedProposal[] = [];

  // ----------------------------------------
  // 전체 파이프라인 실행
  // ----------------------------------------
  process(input: PipelineInput): PipelineResult {
    const startTime = Date.now();

    // Reset filter for fresh processing
    moltBotFilter.reset();

    // Stage 1: MoltBot 필터링 (90% 버림)
    const { proposals, stats: filterStats } = moltBotFilter.process(input.inputs);

    // Stage 2: Enforcer 평가
    const approvedProposals: ApprovedProposal[] = [];
    const rejectedProposals: RejectedProposal[] = [];
    const pendingProposals: PendingProposal[] = [];

    let executionOrder = 0;

    for (const proposal of proposals) {
      // Proposal을 Enforcer 형식으로 변환
      const enforcerProposal = this.toEnforcerProposal(proposal, input.context);

      // 헌법에 따라 평가
      const verdict = coreEnforcer.evaluate(enforcerProposal);

      if (verdict.status === 'APPROVED') {
        // ProofPack 생성 (K3 준수)
        const proofPack = this.generateProofPack(proposal, verdict, startTime);

        approvedProposals.push({
          proposal,
          verdict,
          proofPack,
          executionOrder: executionOrder++,
        });
      } else if (verdict.status === 'PENDING') {
        // K4 대기 중
        pendingProposals.push({
          proposal,
          verdict,
          waitTimeRemaining: this.calculateWaitTime(enforcerProposal.requestedAt),
        });
      } else {
        // 거부됨
        rejectedProposals.push({
          proposal,
          verdict,
          reason: verdict.violations.join('; '),
        });
      }
    }

    // 승인된 Proposal을 실행 큐에 추가
    this.executionQueue.push(...approvedProposals);

    // Summary 생성
    const summary: PipelineSummary = {
      totalInputs: input.inputs.length,
      noiseRemoved: filterStats.noiseRemoved + filterStats.duplicatesMerged,
      proposalsGenerated: filterStats.proposalsCreated,
      approved: approvedProposals.length,
      rejected: rejectedProposals.length,
      pending: pendingProposals.length,
      discardRate: filterStats.discardRate,
      constitutionVersion: AUTUS_CONSTITUTION.version,
    };

    return {
      filterStats,
      approvedProposals,
      rejectedProposals,
      pendingProposals,
      summary,
    };
  }

  // ----------------------------------------
  // Proposal 변환
  // ----------------------------------------
  private toEnforcerProposal(
    proposal: Proposal,
    context: { totalModules: number; standardModules: number }
  ): EnforcerProposal {
    return {
      id: proposal.id,
      moduleId: proposal.moduleId,
      proposalType: proposal.type,
      qualityMetrics: {
        userSatisfaction: proposal.expectedImpact,
        reuseRate: 50, // 기본값 (실제로는 모듈에서 가져옴)
        failureRate: 10, // 기본값
        outcomeImpact: proposal.expectedImpact,
      },
      proofs: this.generatePartialProofs(proposal),
      requestedAt: proposal.createdAt,
      currentTime: Date.now(),
      systemContext: {
        totalModules: context.totalModules,
        standardModules: context.standardModules,
      },
    };
  }

  // ----------------------------------------
  // ProofPack 생성 (K3 준수)
  // ----------------------------------------
  private generateProofPack(
    proposal: Proposal,
    verdict: Verdict,
    processStartTime: number
  ): ProofPack {
    const timestamp = Date.now();

    return {
      INPUT_LOG: JSON.stringify({
        proposalId: proposal.id,
        painSignalId: proposal.painSignalId,
        type: proposal.type,
        receivedAt: proposal.createdAt,
      }),
      PROCESS_TRACE: JSON.stringify({
        stages: ['FILTER', 'EVALUATE', 'APPROVE'],
        filterDuration: processStartTime - proposal.createdAt,
        evaluationResult: verdict.lawResults,
        approvedAt: timestamp,
      }),
      OUTPUT_HASH: this.generateHash(proposal, verdict),
      TIMESTAMP: timestamp,
      VALIDATOR_SIG: this.generateSignature(proposal.id, timestamp),
    };
  }

  // ----------------------------------------
  // 부분 증거 생성 (평가용)
  // ----------------------------------------
  private generatePartialProofs(proposal: Proposal): Record<ProofType, unknown> {
    return {
      INPUT_LOG: { proposalId: proposal.id, createdAt: proposal.createdAt },
      PROCESS_TRACE: { stage: 'PENDING_EVALUATION' },
      OUTPUT_HASH: null, // 아직 생성 안됨
      TIMESTAMP: Date.now(),
      VALIDATOR_SIG: null, // 승인 후 생성
    };
  }

  // ----------------------------------------
  // 대기 시간 계산 (K4)
  // ----------------------------------------
  private calculateWaitTime(requestedAt: number): number {
    const minWait = 24 * 60 * 60 * 1000; // 24시간
    const elapsed = Date.now() - requestedAt;
    return Math.max(0, minWait - elapsed);
  }

  // ----------------------------------------
  // 해시 생성 (간단 버전)
  // ----------------------------------------
  private generateHash(proposal: Proposal, verdict: Verdict): string {
    const data = JSON.stringify({ proposal, verdict });
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `HASH_${Math.abs(hash).toString(16).toUpperCase()}`;
  }

  // ----------------------------------------
  // 서명 생성 (간단 버전)
  // ----------------------------------------
  private generateSignature(proposalId: string, timestamp: number): string {
    return `SIG_AUTUS_${proposalId.slice(-8)}_${timestamp}`;
  }

  // ----------------------------------------
  // 실행 큐 조회
  // ----------------------------------------
  getExecutionQueue(): ApprovedProposal[] {
    return [...this.executionQueue];
  }

  // ----------------------------------------
  // 실행 큐에서 다음 Proposal 가져오기
  // ----------------------------------------
  dequeueNext(): ApprovedProposal | null {
    return this.executionQueue.shift() || null;
  }

  // ----------------------------------------
  // 파이프라인 상태 리셋
  // ----------------------------------------
  reset(): void {
    this.executionQueue = [];
    moltBotFilter.reset();
  }
}

// 싱글톤 인스턴스
export const corePipeline = new CorePipeline();
export default CorePipeline;
