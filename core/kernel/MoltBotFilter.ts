/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOLTBOT FILTER - 압력 정제기
 *
 * MoltBot의 진짜 임무:
 * ❌ 고도화
 * ✅ 압력 정제기
 *
 * 성공 KPI: "얼마나 많은 제안을 버렸는가"
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================
// 타입 정의
// ============================================
export interface RawUserInput {
  id: string;
  userId: string;
  type: 'COMPLAINT' | 'SUGGESTION' | 'BUG_REPORT' | 'FEATURE_REQUEST' | 'EMOTION' | 'QUESTION';
  content: string;
  timestamp: number;
  moduleId?: string;
  sentiment: number;       // -100 ~ 100
  urgency: number;         // 0 ~ 100
  specificity: number;     // 0 ~ 100 (구체성)
}

export interface PainSignal {
  id: string;
  sourceInputIds: string[];
  category: string;
  intensity: number;       // 0 ~ 100
  frequency: number;       // 발생 빈도
  affectedUsers: number;   // 영향받는 사용자 수
  actionability: number;   // 0 ~ 100 (실행 가능성)
  priority: number;        // 계산된 우선순위
}

export interface Proposal {
  id: string;
  painSignalId: string;
  moduleId: string;
  type: 'PROMOTE' | 'DEMOTE' | 'MODIFY' | 'DELETE' | 'CREATE';
  description: string;
  expectedImpact: number;
  createdAt: number;
}

export interface FilterStats {
  totalReceived: number;
  noiseRemoved: number;
  duplicatesMerged: number;
  signalsGenerated: number;
  proposalsCreated: number;
  discardRate: number;     // 버린 비율 (높을수록 좋음)
}

// ============================================
// MoltBot Filter Class
// ============================================
export class MoltBotFilter {
  private inputs: Map<string, RawUserInput> = new Map();
  private painSignals: Map<string, PainSignal> = new Map();
  private proposals: Map<string, Proposal> = new Map();

  private stats: FilterStats = {
    totalReceived: 0,
    noiseRemoved: 0,
    duplicatesMerged: 0,
    signalsGenerated: 0,
    proposalsCreated: 0,
    discardRate: 0,
  };

  // 필터링 임계값
  private readonly NOISE_THRESHOLD = 30;           // 이 이하는 노이즈
  private readonly PROPOSAL_THRESHOLD = 70;        // 이 이상만 Proposal
  private readonly MAX_PROPOSAL_RATE = 0.10;       // 최대 10%만 통과

  // ----------------------------------------
  // Stage 1: 노이즈 제거
  // ----------------------------------------
  removeNoise(input: RawUserInput): boolean {
    this.stats.totalReceived++;

    // 1. 감정 배출만 있는 입력 (구체성 < 20)
    if (input.type === 'EMOTION' && input.specificity < 20) {
      this.stats.noiseRemoved++;
      return false;
    }

    // 2. 너무 모호한 불평 (구체성 < 30, sentiment < -50)
    if (input.type === 'COMPLAINT' && input.specificity < 30 && input.sentiment < -50) {
      this.stats.noiseRemoved++;
      return false;
    }

    // 3. 중복 체크 (같은 사용자가 24시간 내 유사 내용)
    const existingSimilar = Array.from(this.inputs.values()).find(existing =>
      existing.userId === input.userId &&
      existing.type === input.type &&
      input.timestamp - existing.timestamp < 24 * 60 * 60 * 1000 &&
      this.similarity(existing.content, input.content) > 0.8
    );

    if (existingSimilar) {
      this.stats.duplicatesMerged++;
      return false;
    }

    // 4. 노이즈 점수 계산
    const noiseScore = this.calculateNoiseScore(input);
    if (noiseScore < this.NOISE_THRESHOLD) {
      this.stats.noiseRemoved++;
      return false;
    }

    this.inputs.set(input.id, input);
    return true;
  }

  // ----------------------------------------
  // Stage 2: Pain Signal 수치화
  // ----------------------------------------
  generatePainSignal(categoryInputs: RawUserInput[]): PainSignal | null {
    if (categoryInputs.length === 0) return null;

    // 평균 강도 계산
    const avgIntensity = categoryInputs.reduce((sum, i) =>
      sum + Math.abs(i.sentiment) + i.urgency, 0
    ) / (categoryInputs.length * 2);

    // 빈도
    const frequency = categoryInputs.length;

    // 영향받는 사용자 수
    const uniqueUsers = new Set(categoryInputs.map(i => i.userId)).size;

    // 실행 가능성 (구체성 평균)
    const actionability = categoryInputs.reduce((sum, i) =>
      sum + i.specificity, 0
    ) / categoryInputs.length;

    // 우선순위 계산
    const priority = this.calculatePriority({
      intensity: avgIntensity,
      frequency,
      affectedUsers: uniqueUsers,
      actionability,
    });

    // 임계값 미달 시 null
    if (priority < 50) return null;

    const signal: PainSignal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceInputIds: categoryInputs.map(i => i.id),
      category: this.detectCategory(categoryInputs[0]),
      intensity: avgIntensity,
      frequency,
      affectedUsers: uniqueUsers,
      actionability,
      priority,
    };

    this.painSignals.set(signal.id, signal);
    this.stats.signalsGenerated++;
    return signal;
  }

  // ----------------------------------------
  // Stage 3: 중복 병합
  // ----------------------------------------
  mergeSignals(): PainSignal[] {
    const signals = Array.from(this.painSignals.values());
    const merged: Map<string, PainSignal> = new Map();

    for (const signal of signals) {
      const existing = merged.get(signal.category);
      if (existing) {
        // 병합: 더 높은 우선순위 유지
        existing.sourceInputIds.push(...signal.sourceInputIds);
        existing.intensity = Math.max(existing.intensity, signal.intensity);
        existing.frequency += signal.frequency;
        existing.affectedUsers = Math.max(existing.affectedUsers, signal.affectedUsers);
        existing.actionability = Math.max(existing.actionability, signal.actionability);
        existing.priority = this.calculatePriority(existing);
      } else {
        merged.set(signal.category, { ...signal });
      }
    }

    return Array.from(merged.values());
  }

  // ----------------------------------------
  // Stage 4: 상위 5-10%만 Proposal 생성
  // ----------------------------------------
  generateProposals(): Proposal[] {
    const mergedSignals = this.mergeSignals();

    // 우선순위로 정렬
    mergedSignals.sort((a, b) => b.priority - a.priority);

    // 상위 10%만 선택
    const maxProposals = Math.max(1, Math.ceil(mergedSignals.length * this.MAX_PROPOSAL_RATE));
    const topSignals = mergedSignals.slice(0, maxProposals);

    // Proposal 생성
    const proposals: Proposal[] = [];
    for (const signal of topSignals) {
      if (signal.priority < this.PROPOSAL_THRESHOLD) continue;

      const proposal: Proposal = {
        id: `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        painSignalId: signal.id,
        moduleId: this.detectAffectedModule(signal),
        type: this.determineProposalType(signal),
        description: this.generateDescription(signal),
        expectedImpact: signal.priority,
        createdAt: Date.now(),
      };

      this.proposals.set(proposal.id, proposal);
      proposals.push(proposal);
      this.stats.proposalsCreated++;
    }

    // 버린 비율 계산
    this.stats.discardRate = 1 - (this.stats.proposalsCreated / this.stats.totalReceived);

    return proposals;
  }

  // ----------------------------------------
  // 전체 파이프라인 실행
  // ----------------------------------------
  process(inputs: RawUserInput[]): {
    proposals: Proposal[];
    stats: FilterStats;
  } {
    // Stage 1: 노이즈 제거
    const cleanInputs = inputs.filter(input => this.removeNoise(input));

    // Stage 2: 카테고리별 그룹화 및 Signal 생성
    const byCategory = this.groupByCategory(cleanInputs);
    for (const [_, categoryInputs] of byCategory) {
      this.generatePainSignal(categoryInputs);
    }

    // Stage 3 & 4: 병합 및 Proposal 생성
    const proposals = this.generateProposals();

    return {
      proposals,
      stats: this.getStats(),
    };
  }

  // ----------------------------------------
  // 헬퍼 메서드
  // ----------------------------------------
  private calculateNoiseScore(input: RawUserInput): number {
    // 노이즈 점수 = 구체성 * 0.4 + (100 - |감정|) * 0.3 + 긴급도 * 0.3
    return (
      input.specificity * 0.4 +
      (100 - Math.abs(input.sentiment)) * 0.3 +
      input.urgency * 0.3
    );
  }

  private calculatePriority(params: {
    intensity: number;
    frequency: number;
    affectedUsers: number;
    actionability: number;
  }): number {
    // 우선순위 = 강도 * 0.25 + log(빈도) * 15 + log(영향자수) * 15 + 실행가능성 * 0.35
    return (
      params.intensity * 0.25 +
      Math.log10(params.frequency + 1) * 15 +
      Math.log10(params.affectedUsers + 1) * 15 +
      params.actionability * 0.35
    );
  }

  private similarity(a: string, b: string): number {
    // 간단한 유사도 계산 (실제로는 더 정교한 알고리즘 사용)
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  }

  private detectCategory(input: RawUserInput): string {
    // 카테고리 감지 (실제로는 ML 모델 사용)
    if (input.type === 'BUG_REPORT') return 'BUG';
    if (input.type === 'FEATURE_REQUEST') return 'FEATURE';
    if (input.type === 'COMPLAINT') return 'UX';
    return 'GENERAL';
  }

  private detectAffectedModule(signal: PainSignal): string {
    // 영향받는 모듈 감지 (실제로는 더 정교한 로직)
    return signal.category === 'BUG' ? 'core' : 'ui';
  }

  private determineProposalType(signal: PainSignal): Proposal['type'] {
    if (signal.category === 'BUG') return 'MODIFY';
    if (signal.category === 'FEATURE') return 'CREATE';
    if (signal.intensity > 80) return 'MODIFY';
    return 'MODIFY';
  }

  private generateDescription(signal: PainSignal): string {
    return `[${signal.category}] Priority ${signal.priority.toFixed(0)} - ` +
      `${signal.frequency} occurrences affecting ${signal.affectedUsers} users`;
  }

  private groupByCategory(inputs: RawUserInput[]): Map<string, RawUserInput[]> {
    const grouped = new Map<string, RawUserInput[]>();
    for (const input of inputs) {
      const category = this.detectCategory(input);
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(input);
    }
    return grouped;
  }

  getStats(): FilterStats {
    return { ...this.stats };
  }

  // KPI: 버린 비율 (높을수록 좋음)
  getDiscardRate(): number {
    return this.stats.discardRate;
  }

  reset(): void {
    this.inputs.clear();
    this.painSignals.clear();
    this.proposals.clear();
    this.stats = {
      totalReceived: 0,
      noiseRemoved: 0,
      duplicatesMerged: 0,
      signalsGenerated: 0,
      proposalsCreated: 0,
      discardRate: 0,
    };
  }
}

// 싱글톤 인스턴스
export const moltBotFilter = new MoltBotFilter();
export default MoltBotFilter;
