/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🤖 AI Engine — 추천 및 예측
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 로컬 AI 추론 + 클라우드 AI 폴백:
 * - 결정 추천
 * - 우선순위 제안
 * - 패턴 학습
 * - V 예측
 * 
 * 원칙:
 * - 로컬 우선 (Zero-Cloud)
 * - 추천만, 자동 실행 금지
 * - 예측 결과 내부 보관
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface AIConfig {
  apiKey?: string;
  endpoint?: string;
  useLocalFirst?: boolean;
  maxTokens?: number;
}

export interface Decision {
  id: string;
  text: string;
  delta: number;
  source: string;
  timestamp: string;
}

export interface Recommendation {
  decisionId: string;
  action: 'accept' | 'reject' | 'delay';
  confidence: number;
  reason: string;
  vImpact: {
    immediate: number;
    month3: number;
    month12: number;
  };
}

export interface PatternInsight {
  pattern: string;
  frequency: number;
  avgDelta: number;
  successRate: number;
  suggestion: string;
}

export interface UserProfile {
  avgDecisionsPerDay: number;
  preferredTime: string;
  topCategories: string[];
  acceptRate: number;
  avgDelta: number;
  synergyGrowth: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Local AI (Rule-Based + Statistics)
// ═══════════════════════════════════════════════════════════════════════════════

export class LocalAI {
  private history: Decision[] = [];
  private acceptedIds: Set<string> = new Set();

  /**
   * 히스토리 추가
   */
  addToHistory(decision: Decision, accepted: boolean): void {
    this.history.push(decision);
    if (accepted) {
      this.acceptedIds.add(decision.id);
    }
    
    // 최근 1000개만 유지
    if (this.history.length > 1000) {
      const removed = this.history.shift();
      if (removed) {
        this.acceptedIds.delete(removed.id);
      }
    }
  }

  /**
   * 결정 추천
   */
  recommend(decision: Decision): Recommendation {
    const similar = this.findSimilar(decision.text);
    const patternScore = this.calculatePatternScore(decision);
    const timeScore = this.calculateTimeScore(decision);
    const deltaScore = this.normalizeDelta(decision.delta);
    
    // 종합 점수
    const score = (
      patternScore * 0.4 +
      timeScore * 0.2 +
      deltaScore * 0.3 +
      (similar ? (similar.wasAccepted ? 0.8 : 0.2) : 0.5) * 0.1
    );
    
    const action = score > 0.6 ? 'accept' : score < 0.4 ? 'reject' : 'delay';
    
    return {
      decisionId: decision.id,
      action,
      confidence: Math.abs(score - 0.5) * 2, // 0~1
      reason: this.generateReason(action, patternScore, similar),
      vImpact: this.estimateVImpact(decision.delta, score),
    };
  }

  /**
   * 유사 결정 찾기
   */
  private findSimilar(text: string): { decision: Decision; wasAccepted: boolean } | null {
    const keywords = text.toLowerCase().split(/\s+/);
    
    for (const past of this.history.slice(-100).reverse()) {
      const pastKeywords = past.text.toLowerCase().split(/\s+/);
      const overlap = keywords.filter(k => pastKeywords.includes(k)).length;
      
      if (overlap >= 2) {
        return {
          decision: past,
          wasAccepted: this.acceptedIds.has(past.id),
        };
      }
    }
    
    return null;
  }

  /**
   * 패턴 점수 계산
   */
  private calculatePatternScore(decision: Decision): number {
    // 소스별 수락률
    const sourceDecisions = this.history.filter(d => d.source === decision.source);
    if (sourceDecisions.length === 0) return 0.5;
    
    const acceptedCount = sourceDecisions.filter(d => this.acceptedIds.has(d.id)).length;
    return acceptedCount / sourceDecisions.length;
  }

  /**
   * 시간 점수 계산
   */
  private calculateTimeScore(decision: Decision): number {
    const hour = new Date(decision.timestamp).getHours();
    
    // 업무 시간 (9-18) 선호
    if (hour >= 9 && hour <= 18) return 0.8;
    if (hour >= 7 && hour <= 21) return 0.6;
    return 0.3;
  }

  /**
   * 델타 정규화
   */
  private normalizeDelta(delta: number): number {
    // 평균 델타 대비 점수
    if (this.history.length === 0) return 0.5;
    
    const avgDelta = this.history.reduce((sum, d) => sum + d.delta, 0) / this.history.length;
    const ratio = delta / (avgDelta || 1);
    
    return Math.min(1, ratio / 2); // 평균의 2배가 1.0
  }

  /**
   * 추천 이유 생성
   */
  private generateReason(
    action: string, 
    patternScore: number, 
    similar: { decision: Decision; wasAccepted: boolean } | null
  ): string {
    const reasons: string[] = [];
    
    if (similar) {
      if (similar.wasAccepted) {
        reasons.push('유사한 결정을 수락한 적 있음');
      } else {
        reasons.push('유사한 결정을 거절한 적 있음');
      }
    }
    
    if (patternScore > 0.7) {
      reasons.push('이 유형의 결정은 주로 수락됨');
    } else if (patternScore < 0.3) {
      reasons.push('이 유형의 결정은 주로 거절됨');
    }
    
    return reasons.join('. ') || '기본 분석 기준 적용';
  }

  /**
   * V 영향 추정
   */
  private estimateVImpact(delta: number, score: number): Recommendation['vImpact'] {
    const baseGrowth = 0.03; // 3% 월 성장 가정
    
    return {
      immediate: delta,
      month3: Math.round(delta * Math.pow(1 + baseGrowth, 3) * score),
      month12: Math.round(delta * Math.pow(1 + baseGrowth, 12) * score),
    };
  }

  /**
   * 패턴 인사이트
   */
  getPatternInsights(): PatternInsight[] {
    const patterns: Map<string, { count: number; deltas: number[]; accepted: number }> = new Map();
    
    // 소스별 패턴 수집
    for (const decision of this.history) {
      const key = decision.source;
      const existing = patterns.get(key) || { count: 0, deltas: [], accepted: 0 };
      
      existing.count++;
      existing.deltas.push(decision.delta);
      if (this.acceptedIds.has(decision.id)) {
        existing.accepted++;
      }
      
      patterns.set(key, existing);
    }
    
    // 인사이트 생성
    const insights: PatternInsight[] = [];
    
    for (const [pattern, data] of patterns) {
      const avgDelta = data.deltas.reduce((a, b) => a + b, 0) / data.count;
      const successRate = data.accepted / data.count;
      
      let suggestion = '';
      if (successRate > 0.8) {
        suggestion = '높은 수락률 - 자동화 고려';
      } else if (successRate < 0.3) {
        suggestion = '낮은 수락률 - 필터링 고려';
      } else if (avgDelta > 20) {
        suggestion = '높은 V 영향 - 우선순위 상승';
      }
      
      insights.push({
        pattern,
        frequency: data.count,
        avgDelta,
        successRate,
        suggestion,
      });
    }
    
    return insights.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 사용자 프로필
   */
  getUserProfile(): UserProfile {
    if (this.history.length === 0) {
      return {
        avgDecisionsPerDay: 0,
        preferredTime: 'N/A',
        topCategories: [],
        acceptRate: 0,
        avgDelta: 0,
        synergyGrowth: 0,
      };
    }
    
    // 일별 결정 수
    const days = new Set(this.history.map(d => d.timestamp.split('T')[0])).size;
    const avgDecisionsPerDay = this.history.length / Math.max(1, days);
    
    // 선호 시간대
    const hours = this.history.map(d => new Date(d.timestamp).getHours());
    const hourCounts = new Map<number, number>();
    hours.forEach(h => hourCounts.set(h, (hourCounts.get(h) || 0) + 1));
    const preferredHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 12;
    
    // 상위 카테고리
    const sourceCounts = new Map<string, number>();
    this.history.forEach(d => sourceCounts.set(d.source, (sourceCounts.get(d.source) || 0) + 1));
    const topCategories = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
    
    // 수락률
    const acceptRate = this.acceptedIds.size / this.history.length;
    
    // 평균 델타
    const avgDelta = this.history.reduce((sum, d) => sum + d.delta, 0) / this.history.length;
    
    return {
      avgDecisionsPerDay: Math.round(avgDecisionsPerDay * 10) / 10,
      preferredTime: `${preferredHour}:00`,
      topCategories,
      acceptRate: Math.round(acceptRate * 100),
      avgDelta: Math.round(avgDelta),
      synergyGrowth: 0.03, // 기본값
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cloud AI (Fallback)
// ═══════════════════════════════════════════════════════════════════════════════

export class CloudAI {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * 클라우드 AI 호출
   */
  async analyze(prompt: string): Promise<string> {
    if (!this.config.apiKey || !this.config.endpoint) {
      throw new Error('Cloud AI not configured');
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        max_tokens: this.config.maxTokens || 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloud AI error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || data.choices?.[0]?.text || '';
  }

  /**
   * 결정 분석
   */
  async analyzeDecision(decision: Decision, context?: string): Promise<Recommendation> {
    const prompt = `
다음 결정에 대해 분석해주세요:

결정: ${decision.text}
소스: ${decision.source}
V 델타: ${decision.delta}
${context ? `컨텍스트: ${context}` : ''}

JSON 형식으로 응답:
{
  "action": "accept" | "reject" | "delay",
  "confidence": 0-1,
  "reason": "이유",
  "immediate": 숫자,
  "month3": 숫자,
  "month12": 숫자
}
`;

    try {
      const response = await this.analyze(prompt);
      const parsed = JSON.parse(response);
      
      return {
        decisionId: decision.id,
        action: parsed.action,
        confidence: parsed.confidence,
        reason: parsed.reason,
        vImpact: {
          immediate: parsed.immediate,
          month3: parsed.month3,
          month12: parsed.month12,
        },
      };
    } catch {
      throw new Error('Failed to parse Cloud AI response');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI Manager (Local + Cloud)
// ═══════════════════════════════════════════════════════════════════════════════

export class AIManager {
  private local: LocalAI;
  private cloud?: CloudAI;
  private useLocalFirst: boolean;

  constructor(config: AIConfig = {}) {
    this.local = new LocalAI();
    this.useLocalFirst = config.useLocalFirst ?? true;
    
    if (config.apiKey && config.endpoint) {
      this.cloud = new CloudAI(config);
    }
  }

  /**
   * 결정 추천
   */
  async recommend(decision: Decision): Promise<Recommendation> {
    if (this.useLocalFirst || !this.cloud) {
      return this.local.recommend(decision);
    }

    try {
      return await this.cloud.analyzeDecision(decision);
    } catch {
      // 클라우드 실패 시 로컬 폴백
      return this.local.recommend(decision);
    }
  }

  /**
   * 히스토리 기록
   */
  recordDecision(decision: Decision, accepted: boolean): void {
    this.local.addToHistory(decision, accepted);
  }

  /**
   * 인사이트 조회
   */
  getInsights(): PatternInsight[] {
    return this.local.getPatternInsights();
  }

  /**
   * 프로필 조회
   */
  getProfile(): UserProfile {
    return this.local.getUserProfile();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

export function createAIManager(config?: AIConfig): AIManager {
  return new AIManager(config);
}

export default { LocalAI, CloudAI, AIManager, createAIManager };
