/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;










/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;










/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;










/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;










/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;




















/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;










/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;










/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;










/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;










/**
 * AUTUS Local Agent - SQ Service
 * ================================
 * 
 * 시너지 지수(SQ) 계산 서비스
 * 
 * 모든 계산은 로컬에서 실행
 * 가중치만 서버에서 수신
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SQWeights {
  w_money: number;
  w_synergy: number;
  w_entropy: number;
  money_normalizer: number;
  synergy_normalizer: number;
  entropy_normalizer: number;
  negative_keywords: Record<string, number>;
  positive_keywords: Record<string, number>;
  version: string;
}

export interface Node {
  id: string;
  name: string;
  phone: string;
  studentName?: string;
  
  // SQ 구성 요소
  moneyTotal: number;      // M: 총 입금액
  synergyScore: number;    // S: 시너지 점수
  entropyScore: number;    // T: 엔트로피 점수
  
  // 계산 결과
  sqScore: number;
  tier: NodeTier;
  
  // 메타
  source: string;
  updatedAt: number;
}

export type NodeTier = 'iron' | 'steel' | 'gold' | 'platinum' | 'diamond' | 'sovereign';

export interface TierBoundaries {
  iron_max: number;
  steel_max: number;
  gold_max: number;
  platinum_max: number;
  diamond_max: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: SQWeights = {
  w_money: 0.4,
  w_synergy: 0.4,
  w_entropy: 0.2,
  money_normalizer: 1000000,
  synergy_normalizer: 100,
  entropy_normalizer: 60,
  negative_keywords: {
    '환불': 0.3,
    '취소': 0.25,
    '죄송': 0.15,
    '불만': 0.2,
    '그만': 0.2,
  },
  positive_keywords: {
    '감사': 0.2,
    '추천': 0.25,
    '좋아': 0.15,
    '최고': 0.2,
    '만족': 0.2,
  },
  version: '1.0.0',
};

const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  iron_max: 30,
  steel_max: 50,
  gold_max: 75,
  platinum_max: 90,
  diamond_max: 99,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  WEIGHTS: '@autus/sq_weights',
  NODES: '@autus/nodes',
  TIER_BOUNDARIES: '@autus/tier_boundaries',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              SQ SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class SQService {
  private weights: SQWeights = DEFAULT_WEIGHTS;
  private tierBoundaries: TierBoundaries = DEFAULT_TIER_BOUNDARIES;
  private nodes: Map<string, Node> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  //                         INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // 로컬 저장소에서 로드
    await this.loadWeights();
    await this.loadNodes();
  }

  private async loadWeights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (stored) {
        this.weights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load weights:', error);
    }
  }

  private async loadNodes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const nodesArray: Node[] = JSON.parse(stored);
        this.nodes = new Map(nodesArray.map(n => [n.id, n]));
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  async saveNodes(): Promise<void> {
    try {
      const nodesArray = Array.from(this.nodes.values());
      await AsyncStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodesArray));
    } catch (error) {
      console.error('Failed to save nodes:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         WEIGHTS UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async updateWeights(newWeights: SQWeights): Promise<void> {
    this.weights = newWeights;
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(newWeights));
    
    // 모든 노드 재계산
    await this.recalculateAllNodes();
  }

  getWeights(): SQWeights {
    return this.weights;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         SQ CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 단일 노드 SQ 계산
   * 
   * SQ = (W_m × M_norm) + (W_s × S_norm) - (W_t × T_norm)
   */
  calculateSQ(node: Partial<Node>): number {
    const { moneyTotal = 0, synergyScore = 0, entropyScore = 0 } = node;

    // 정규화
    const mNorm = Math.min(1, moneyTotal / this.weights.money_normalizer);
    const sNorm = Math.min(1, synergyScore / this.weights.synergy_normalizer);
    const tNorm = Math.min(1, entropyScore / this.weights.entropy_normalizer);

    // SQ 계산
    const sq =
      this.weights.w_money * mNorm +
      this.weights.w_synergy * sNorm -
      this.weights.w_entropy * tNorm;

    // 0~100 스케일
    return Math.max(0, Math.min(100, sq * 100));
  }

  /**
   * 백분위로 티어 결정
   */
  getTierFromPercentile(percentile: number): NodeTier {
    if (percentile <= this.tierBoundaries.iron_max) return 'iron';
    if (percentile <= this.tierBoundaries.steel_max) return 'steel';
    if (percentile <= this.tierBoundaries.gold_max) return 'gold';
    if (percentile <= this.tierBoundaries.platinum_max) return 'platinum';
    if (percentile <= this.tierBoundaries.diamond_max) return 'diamond';
    return 'sovereign';
  }

  /**
   * 백분위 계산
   */
  calculatePercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         NODE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 노드 추가/업데이트
   */
  upsertNode(nodeData: Partial<Node> & { id: string; name: string; phone: string }): Node {
    const existing = this.nodes.get(nodeData.id);
    
    const node: Node = {
      ...existing,
      ...nodeData,
      sqScore: 0,
      tier: 'iron',
      updatedAt: Date.now(),
    } as Node;

    // SQ 계산
    node.sqScore = this.calculateSQ(node);

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * 전체 노드 재계산 (티어 포함)
   */
  async recalculateAllNodes(): Promise<Node[]> {
    const nodesArray = Array.from(this.nodes.values());
    
    // 1. 모든 SQ 계산
    for (const node of nodesArray) {
      node.sqScore = this.calculateSQ(node);
    }

    // 2. 백분위 계산 및 티어 할당
    const allScores = nodesArray.map(n => n.sqScore);
    
    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      node.tier = this.getTierFromPercentile(percentile);
      node.updatedAt = Date.now();
    }

    // 3. 저장
    await this.saveNodes();

    return nodesArray;
  }

  /**
   * 모든 노드 조회
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 노드 조회
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * 티어별 노드 조회
   */
  getNodesByTier(tier: NodeTier): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.tier === tier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 티어 분포
   */
  getTierDistribution(): Record<NodeTier, number> {
    const distribution: Record<NodeTier, number> = {
      iron: 0,
      steel: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
      sovereign: 0,
    };

    for (const node of this.nodes.values()) {
      distribution[node.tier]++;
    }

    return distribution;
  }

  /**
   * 통계 요약
   */
  getStatistics(): {
    totalNodes: number;
    avgSQ: number;
    totalMoney: number;
    tierDistribution: Record<NodeTier, number>;
  } {
    const nodesArray = Array.from(this.nodes.values());
    
    if (nodesArray.length === 0) {
      return {
        totalNodes: 0,
        avgSQ: 0,
        totalMoney: 0,
        tierDistribution: this.getTierDistribution(),
      };
    }

    const totalSQ = nodesArray.reduce((sum, n) => sum + n.sqScore, 0);
    const totalMoney = nodesArray.reduce((sum, n) => sum + n.moneyTotal, 0);

    return {
      totalNodes: nodesArray.length,
      avgSQ: totalSQ / nodesArray.length,
      totalMoney,
      tierDistribution: this.getTierDistribution(),
    };
  }

  /**
   * 승급 가능 노드
   */
  getUpgradeCandidates(limit: number = 10): Array<{ node: Node; reason: string }> {
    const nodesArray = Array.from(this.nodes.values());
    const allScores = nodesArray.map(n => n.sqScore);
    
    const candidates: Array<{ node: Node; reason: string }> = [];

    for (const node of nodesArray) {
      const percentile = this.calculatePercentile(node.sqScore, allScores);
      
      // 티어 경계에 가까운 노드
      if (node.tier === 'iron' && percentile >= 25) {
        candidates.push({ node, reason: 'Steel 승급까지 5% 이내' });
      } else if (node.tier === 'steel' && percentile >= 45) {
        candidates.push({ node, reason: 'Gold 승급까지 5% 이내' });
      } else if (node.tier === 'gold' && percentile >= 70) {
        candidates.push({ node, reason: 'Platinum 승급까지 5% 이내' });
      }
    }

    return candidates.slice(0, limit);
  }

  /**
   * 이탈 위험 노드
   */
  getChurnRisks(): Array<{ node: Node; reason: string }> {
    const risks: Array<{ node: Node; reason: string }> = [];

    for (const node of this.nodes.values()) {
      const eRatio = node.entropyScore / this.weights.entropy_normalizer;
      const sRatio = node.synergyScore / this.weights.synergy_normalizer;

      if (eRatio > 0.5) {
        risks.push({ node, reason: `통화 시간 과다 (${node.entropyScore.toFixed(0)}분)` });
      } else if (sRatio < 0.3 && node.moneyTotal > 0) {
        risks.push({ node, reason: '시너지 저하 (출석/성적 하락 의심)' });
      }
    }

    return risks;
  }
}

// 싱글톤 인스턴스
export const sqService = new SQService();
export default sqService;

























