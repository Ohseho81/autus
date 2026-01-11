/**
 * AUTUS 72⁴ HyperCube 시스템
 * ===========================
 *
 * 72 노드 × 72 모션 × 72 업무 × 72 시간 = 26,873,856 경우의 수
 *
 * 글로벌에서 발생하는 모든 경제 상황이 이 조합으로 매핑됩니다.
 * 각 타입의 특성은 자동 수집된 데이터로 AUTUS가 스스로 학습합니다.
 * 타입은 상황과 노력에 따라 동적으로 변합니다.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 상수
// ═══════════════════════════════════════════════════════════════════════════════

export const DIMENSIONS = {
  NODE: 72,
  MOTION: 72,
  WORK: 72,
  TIME: 72,
} as const;

export const TOTAL_COMBINATIONS = 72 ** 4; // 26,873,856

// ═══════════════════════════════════════════════════════════════════════════════
// 노드 (Node) - 72가지 상태 변수
// ═══════════════════════════════════════════════════════════════════════════════

export type NodeCategory = 'CAPITAL' | 'NETWORK' | 'TIME' | 'KNOWLEDGE' | 'BIO' | 'EMOTION';

export interface NodeDefinition {
  name: string;
  nameEn: string;
  category: NodeCategory;
  unit: string;
}

export const NODES_72: Record<string, NodeDefinition> = {
  // CAPITAL (자본) - n01~n12
  n01: { name: '현금', nameEn: 'Cash', category: 'CAPITAL', unit: '원' },
  n02: { name: '투자자산', nameEn: 'Investments', category: 'CAPITAL', unit: '원' },
  n03: { name: '부채', nameEn: 'Debt', category: 'CAPITAL', unit: '원' },
  n04: { name: '자본효율', nameEn: 'Capital Efficiency', category: 'CAPITAL', unit: '%' },
  n05: { name: '매출', nameEn: 'Revenue', category: 'CAPITAL', unit: '원/월' },
  n06: { name: '비용', nameEn: 'Cost', category: 'CAPITAL', unit: '원/월' },
  n07: { name: '마진율', nameEn: 'Margin', category: 'CAPITAL', unit: '%' },
  n08: { name: '현금흐름', nameEn: 'Cash Flow', category: 'CAPITAL', unit: '원/월' },
  n09: { name: '고객수', nameEn: 'Customers', category: 'CAPITAL', unit: '명' },
  n10: { name: '단가', nameEn: 'Unit Price', category: 'CAPITAL', unit: '원' },
  n11: { name: 'CAC', nameEn: 'CAC', category: 'CAPITAL', unit: '원' },
  n12: { name: 'LTV', nameEn: 'LTV', category: 'CAPITAL', unit: '원' },

  // NETWORK (네트워크) - n13~n24
  n13: { name: '연결수', nameEn: 'Connections', category: 'NETWORK', unit: '개' },
  n14: { name: '영향력', nameEn: 'Influence', category: 'NETWORK', unit: '점' },
  n15: { name: '신뢰도', nameEn: 'Trust', category: 'NETWORK', unit: '%' },
  n16: { name: '추천율', nameEn: 'Referral Rate', category: 'NETWORK', unit: '%' },
  n17: { name: '파트너수', nameEn: 'Partners', category: 'NETWORK', unit: '개' },
  n18: { name: '커뮤니티', nameEn: 'Community', category: 'NETWORK', unit: '명' },
  n19: { name: '도달률', nameEn: 'Reach', category: 'NETWORK', unit: '%' },
  n20: { name: '참여율', nameEn: 'Engagement', category: 'NETWORK', unit: '%' },
  n21: { name: '신규율', nameEn: 'New Rate', category: 'NETWORK', unit: '%' },
  n22: { name: '이탈률', nameEn: 'Churn Rate', category: 'NETWORK', unit: '%' },
  n23: { name: '충성도', nameEn: 'Loyalty', category: 'NETWORK', unit: '%' },
  n24: { name: '의존도', nameEn: 'Dependency', category: 'NETWORK', unit: '%' },

  // TIME (시간) - n25~n36
  n25: { name: '가용시간', nameEn: 'Available Time', category: 'TIME', unit: '시간/주' },
  n26: { name: '생산시간', nameEn: 'Productive Time', category: 'TIME', unit: '시간/주' },
  n27: { name: '낭비시간', nameEn: 'Wasted Time', category: 'TIME', unit: '시간/주' },
  n28: { name: '학습시간', nameEn: 'Learning Time', category: 'TIME', unit: '시간/주' },
  n29: { name: '회복시간', nameEn: 'Recovery Time', category: 'TIME', unit: '시간/주' },
  n30: { name: '시간효율', nameEn: 'Time Efficiency', category: 'TIME', unit: '%' },
  n31: { name: '리드타임', nameEn: 'Lead Time', category: 'TIME', unit: '일' },
  n32: { name: '사이클타임', nameEn: 'Cycle Time', category: 'TIME', unit: '일' },
  n33: { name: '응답시간', nameEn: 'Response Time', category: 'TIME', unit: '시간' },
  n34: { name: '근속기간', nameEn: 'Tenure', category: 'TIME', unit: '월' },
  n35: { name: '경력기간', nameEn: 'Experience', category: 'TIME', unit: '년' },
  n36: { name: '런웨이', nameEn: 'Runway', category: 'TIME', unit: '월' },

  // KNOWLEDGE (지식) - n37~n48
  n37: { name: '전문성', nameEn: 'Expertise', category: 'KNOWLEDGE', unit: '점' },
  n38: { name: '경험치', nameEn: 'Experience Points', category: 'KNOWLEDGE', unit: '점' },
  n39: { name: '학습률', nameEn: 'Learning Rate', category: 'KNOWLEDGE', unit: '%' },
  n40: { name: '적용률', nameEn: 'Application Rate', category: 'KNOWLEDGE', unit: '%' },
  n41: { name: '혁신지수', nameEn: 'Innovation Index', category: 'KNOWLEDGE', unit: '점' },
  n42: { name: '문제해결', nameEn: 'Problem Solving', category: 'KNOWLEDGE', unit: '점' },
  n43: { name: '의사결정', nameEn: 'Decision Making', category: 'KNOWLEDGE', unit: '점' },
  n44: { name: '창의성', nameEn: 'Creativity', category: 'KNOWLEDGE', unit: '점' },
  n45: { name: '분석력', nameEn: 'Analysis', category: 'KNOWLEDGE', unit: '점' },
  n46: { name: '실행력', nameEn: 'Execution', category: 'KNOWLEDGE', unit: '점' },
  n47: { name: '리더십', nameEn: 'Leadership', category: 'KNOWLEDGE', unit: '점' },
  n48: { name: '커뮤니케이션', nameEn: 'Communication', category: 'KNOWLEDGE', unit: '점' },

  // BIO (건강) - n49~n60
  n49: { name: '체력', nameEn: 'Stamina', category: 'BIO', unit: '점' },
  n50: { name: '에너지', nameEn: 'Energy', category: 'BIO', unit: '%' },
  n51: { name: '수면질', nameEn: 'Sleep Quality', category: 'BIO', unit: '점' },
  n52: { name: '운동량', nameEn: 'Exercise', category: 'BIO', unit: '시간/주' },
  n53: { name: '영양상태', nameEn: 'Nutrition', category: 'BIO', unit: '점' },
  n54: { name: '면역력', nameEn: 'Immunity', category: 'BIO', unit: '점' },
  n55: { name: '회복력', nameEn: 'Resilience', category: 'BIO', unit: '점' },
  n56: { name: '지구력', nameEn: 'Endurance', category: 'BIO', unit: '점' },
  n57: { name: '집중력', nameEn: 'Focus', category: 'BIO', unit: '점' },
  n58: { name: '컨디션', nameEn: 'Condition', category: 'BIO', unit: '%' },
  n59: { name: '연령보정', nameEn: 'Age Factor', category: 'BIO', unit: '점' },
  n60: { name: '수명지표', nameEn: 'Life Expectancy', category: 'BIO', unit: '년' },

  // EMOTION (감정) - n61~n72
  n61: { name: '행복도', nameEn: 'Happiness', category: 'EMOTION', unit: '점' },
  n62: { name: '스트레스', nameEn: 'Stress', category: 'EMOTION', unit: '점' },
  n63: { name: '동기부여', nameEn: 'Motivation', category: 'EMOTION', unit: '%' },
  n64: { name: '자신감', nameEn: 'Confidence', category: 'EMOTION', unit: '%' },
  n65: { name: '불안도', nameEn: 'Anxiety', category: 'EMOTION', unit: '점' },
  n66: { name: '만족도', nameEn: 'Satisfaction', category: 'EMOTION', unit: '점' },
  n67: { name: '몰입도', nameEn: 'Flow', category: 'EMOTION', unit: '%' },
  n68: { name: '성취감', nameEn: 'Achievement', category: 'EMOTION', unit: '점' },
  n69: { name: '소속감', nameEn: 'Belonging', category: 'EMOTION', unit: '점' },
  n70: { name: '자율성', nameEn: 'Autonomy', category: 'EMOTION', unit: '점' },
  n71: { name: '목적의식', nameEn: 'Purpose', category: 'EMOTION', unit: '점' },
  n72: { name: '희망지수', nameEn: 'Hope', category: 'EMOTION', unit: '점' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 모션 (Motion) - 72가지 변화/행동 유형
// ═══════════════════════════════════════════════════════════════════════════════

export type MotionCategory = 'INCREASE' | 'DECREASE' | 'TRANSFORM' | 'CONNECT' | 'DISCONNECT' | 'STABILIZE';

export interface MotionDefinition {
  name: string;
  nameEn: string;
  category: MotionCategory;
  intensity: number; // -5 ~ +5
}

export const MOTIONS_72: Record<string, MotionDefinition> = {
  // INCREASE (증가) - m01~m12
  m01: { name: '급성장', nameEn: 'Rapid Growth', category: 'INCREASE', intensity: 5 },
  m02: { name: '점진적성장', nameEn: 'Gradual Growth', category: 'INCREASE', intensity: 3 },
  m03: { name: '확장', nameEn: 'Expansion', category: 'INCREASE', intensity: 4 },
  m04: { name: '축적', nameEn: 'Accumulation', category: 'INCREASE', intensity: 2 },
  m05: { name: '강화', nameEn: 'Strengthen', category: 'INCREASE', intensity: 3 },
  m06: { name: '증폭', nameEn: 'Amplify', category: 'INCREASE', intensity: 4 },
  m07: { name: '복제', nameEn: 'Replicate', category: 'INCREASE', intensity: 3 },
  m08: { name: '스케일업', nameEn: 'Scale Up', category: 'INCREASE', intensity: 5 },
  m09: { name: '레버리지', nameEn: 'Leverage', category: 'INCREASE', intensity: 4 },
  m10: { name: '가속', nameEn: 'Accelerate', category: 'INCREASE', intensity: 4 },
  m11: { name: '투자', nameEn: 'Invest', category: 'INCREASE', intensity: 3 },
  m12: { name: '획득', nameEn: 'Acquire', category: 'INCREASE', intensity: 3 },

  // DECREASE (감소) - m13~m24
  m13: { name: '급감', nameEn: 'Rapid Decline', category: 'DECREASE', intensity: -5 },
  m14: { name: '점진적감소', nameEn: 'Gradual Decline', category: 'DECREASE', intensity: -3 },
  m15: { name: '축소', nameEn: 'Shrink', category: 'DECREASE', intensity: -4 },
  m16: { name: '소진', nameEn: 'Deplete', category: 'DECREASE', intensity: -4 },
  m17: { name: '약화', nameEn: 'Weaken', category: 'DECREASE', intensity: -3 },
  m18: { name: '손실', nameEn: 'Loss', category: 'DECREASE', intensity: -4 },
  m19: { name: '퇴화', nameEn: 'Regress', category: 'DECREASE', intensity: -3 },
  m20: { name: '포기', nameEn: 'Abandon', category: 'DECREASE', intensity: -5 },
  m21: { name: '정리', nameEn: 'Clean Up', category: 'DECREASE', intensity: -2 },
  m22: { name: '감속', nameEn: 'Decelerate', category: 'DECREASE', intensity: -2 },
  m23: { name: '비용절감', nameEn: 'Cost Cut', category: 'DECREASE', intensity: -2 },
  m24: { name: '매각', nameEn: 'Divest', category: 'DECREASE', intensity: -3 },

  // TRANSFORM (변환) - m25~m36
  m25: { name: '피벗', nameEn: 'Pivot', category: 'TRANSFORM', intensity: 4 },
  m26: { name: '리브랜딩', nameEn: 'Rebrand', category: 'TRANSFORM', intensity: 3 },
  m27: { name: '전환', nameEn: 'Convert', category: 'TRANSFORM', intensity: 3 },
  m28: { name: '재구성', nameEn: 'Restructure', category: 'TRANSFORM', intensity: 3 },
  m29: { name: '혁신', nameEn: 'Innovate', category: 'TRANSFORM', intensity: 5 },
  m30: { name: '디지털화', nameEn: 'Digitize', category: 'TRANSFORM', intensity: 4 },
  m31: { name: '자동화', nameEn: 'Automate', category: 'TRANSFORM', intensity: 4 },
  m32: { name: '표준화', nameEn: 'Standardize', category: 'TRANSFORM', intensity: 2 },
  m33: { name: '개인화', nameEn: 'Personalize', category: 'TRANSFORM', intensity: 3 },
  m34: { name: '현지화', nameEn: 'Localize', category: 'TRANSFORM', intensity: 3 },
  m35: { name: '글로벌화', nameEn: 'Globalize', category: 'TRANSFORM', intensity: 4 },
  m36: { name: '플랫폼화', nameEn: 'Platformize', category: 'TRANSFORM', intensity: 5 },

  // CONNECT (연결) - m37~m48
  m37: { name: '파트너십', nameEn: 'Partnership', category: 'CONNECT', intensity: 3 },
  m38: { name: '인수합병', nameEn: 'M&A', category: 'CONNECT', intensity: 5 },
  m39: { name: '제휴', nameEn: 'Alliance', category: 'CONNECT', intensity: 3 },
  m40: { name: '네트워킹', nameEn: 'Networking', category: 'CONNECT', intensity: 2 },
  m41: { name: '통합', nameEn: 'Integrate', category: 'CONNECT', intensity: 4 },
  m42: { name: '협업', nameEn: 'Collaborate', category: 'CONNECT', intensity: 2 },
  m43: { name: '채용', nameEn: 'Hire', category: 'CONNECT', intensity: 3 },
  m44: { name: '아웃소싱', nameEn: 'Outsource', category: 'CONNECT', intensity: 2 },
  m45: { name: '투자유치', nameEn: 'Fundraise', category: 'CONNECT', intensity: 4 },
  m46: { name: '고객확보', nameEn: 'Customer Acquisition', category: 'CONNECT', intensity: 3 },
  m47: { name: '커뮤니티', nameEn: 'Community', category: 'CONNECT', intensity: 2 },
  m48: { name: '생태계구축', nameEn: 'Build Ecosystem', category: 'CONNECT', intensity: 5 },

  // DISCONNECT (분리) - m49~m60
  m49: { name: '분사', nameEn: 'Spin Off', category: 'DISCONNECT', intensity: 4 },
  m50: { name: '해고', nameEn: 'Layoff', category: 'DISCONNECT', intensity: -3 },
  m51: { name: '계약해지', nameEn: 'Terminate', category: 'DISCONNECT', intensity: -2 },
  m52: { name: '철수', nameEn: 'Withdraw', category: 'DISCONNECT', intensity: -3 },
  m53: { name: '독립', nameEn: 'Independence', category: 'DISCONNECT', intensity: 3 },
  m54: { name: '분리', nameEn: 'Separate', category: 'DISCONNECT', intensity: 2 },
  m55: { name: '경계설정', nameEn: 'Boundary', category: 'DISCONNECT', intensity: 1 },
  m56: { name: '거리두기', nameEn: 'Distance', category: 'DISCONNECT', intensity: 1 },
  m57: { name: '정리해고', nameEn: 'Downsizing', category: 'DISCONNECT', intensity: -4 },
  m58: { name: '사업정리', nameEn: 'Wind Down', category: 'DISCONNECT', intensity: -3 },
  m59: { name: '관계종료', nameEn: 'End Relation', category: 'DISCONNECT', intensity: -2 },
  m60: { name: '청산', nameEn: 'Liquidate', category: 'DISCONNECT', intensity: -5 },

  // STABILIZE (안정) - m61~m72
  m61: { name: '유지', nameEn: 'Maintain', category: 'STABILIZE', intensity: 0 },
  m62: { name: '보존', nameEn: 'Preserve', category: 'STABILIZE', intensity: 1 },
  m63: { name: '방어', nameEn: 'Defend', category: 'STABILIZE', intensity: 1 },
  m64: { name: '보호', nameEn: 'Protect', category: 'STABILIZE', intensity: 1 },
  m65: { name: '복구', nameEn: 'Restore', category: 'STABILIZE', intensity: 2 },
  m66: { name: '회복', nameEn: 'Recover', category: 'STABILIZE', intensity: 2 },
  m67: { name: '재정비', nameEn: 'Regroup', category: 'STABILIZE', intensity: 2 },
  m68: { name: '최적화', nameEn: 'Optimize', category: 'STABILIZE', intensity: 2 },
  m69: { name: '균형', nameEn: 'Balance', category: 'STABILIZE', intensity: 1 },
  m70: { name: '안정화', nameEn: 'Stabilize', category: 'STABILIZE', intensity: 1 },
  m71: { name: '리스크관리', nameEn: 'Risk Manage', category: 'STABILIZE', intensity: 1 },
  m72: { name: '지속가능성', nameEn: 'Sustainability', category: 'STABILIZE', intensity: 2 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 72⁴ 좌표계
// ═══════════════════════════════════════════════════════════════════════════════

export interface HyperCoordinate {
  node: string;   // n01-n72
  motion: string; // m01-m72
  work: string;   // w01-w72
  time: string;   // t01-t72
}

export function coordinateToIndex(coord: HyperCoordinate): number {
  const n = parseInt(coord.node.slice(1)) - 1;
  const m = parseInt(coord.motion.slice(1)) - 1;
  const w = parseInt(coord.work.slice(1)) - 1;
  const t = parseInt(coord.time.slice(1)) - 1;
  return n * (72 ** 3) + m * (72 ** 2) + w * 72 + t;
}

export function indexToCoordinate(index: number): HyperCoordinate {
  const t = index % 72;
  index = Math.floor(index / 72);
  const w = index % 72;
  index = Math.floor(index / 72);
  const m = index % 72;
  index = Math.floor(index / 72);
  const n = index;
  
  return {
    node: `n${String(n + 1).padStart(2, '0')}`,
    motion: `m${String(m + 1).padStart(2, '0')}`,
    work: `w${String(w + 1).padStart(2, '0')}`,
    time: `t${String(t + 1).padStart(2, '0')}`,
  };
}

export function coordinateToHash(coord: HyperCoordinate): string {
  return `${coord.node}-${coord.motion}-${coord.work}-${coord.time}`;
}

export function hashToCoordinate(hash: string): HyperCoordinate {
  const [node, motion, work, time] = hash.split('-');
  return { node, motion, work, time };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 동적 타입 시스템 (자동 학습)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TypeCharacteristics {
  coordinate: HyperCoordinate;
  probability: number;
  averageDuration: number;
  successRate: number;
  volatility: number;
  observationCount: number;
  lastObserved: string | null;
  confidence: number;
}

export interface Observation {
  coordinate: HyperCoordinate;
  success: boolean;
  duration: number;
  timestamp: string;
}

export class HyperCubeEngine {
  private learnedTypes: Map<string, TypeCharacteristics> = new Map();
  private transitionMatrix: Map<string, Map<string, number>> = new Map();
  private observationBuffer: Observation[] = [];

  observe(coord: HyperCoordinate, outcome: { success: boolean; duration: number }): TypeCharacteristics {
    const hash = coordinateToHash(coord);

    if (!this.learnedTypes.has(hash)) {
      this.learnedTypes.set(hash, {
        coordinate: coord,
        probability: 0,
        averageDuration: 0,
        successRate: 0,
        volatility: 0,
        observationCount: 0,
        lastObserved: null,
        confidence: 0,
      });
    }

    const typeChar = this.learnedTypes.get(hash)!;
    typeChar.observationCount++;

    // 가중 평균 업데이트
    const alpha = 1.0 / typeChar.observationCount;
    typeChar.averageDuration = (1 - alpha) * typeChar.averageDuration + alpha * outcome.duration;
    typeChar.successRate = (1 - alpha) * typeChar.successRate + alpha * (outcome.success ? 1 : 0);
    typeChar.confidence = 1 - 1 / (1 + Math.sqrt(typeChar.observationCount));
    typeChar.lastObserved = new Date().toISOString();

    // 버퍼에 추가
    this.observationBuffer.push({
      coordinate: coord,
      success: outcome.success,
      duration: outcome.duration,
      timestamp: new Date().toISOString(),
    });

    // 전이 확률 업데이트
    if (this.observationBuffer.length >= 2) {
      const prev = coordinateToHash(this.observationBuffer[this.observationBuffer.length - 2].coordinate);
      
      if (!this.transitionMatrix.has(prev)) {
        this.transitionMatrix.set(prev, new Map());
      }
      
      const transitions = this.transitionMatrix.get(prev)!;
      transitions.set(hash, (transitions.get(hash) || 0) + 1);
    }

    return typeChar;
  }

  predictNext(current: HyperCoordinate, topK: number = 5): Array<{ hash: string; probability: number }> {
    const hash = coordinateToHash(current);
    const transitions = this.transitionMatrix.get(hash);

    if (!transitions) return [];

    const total = Array.from(transitions.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const predictions = Array.from(transitions.entries())
      .map(([nextHash, count]) => ({ hash: nextHash, probability: count / total }))
      .sort((a, b) => b.probability - a.probability);

    return predictions.slice(0, topK);
  }

  getTypeInfo(coord: HyperCoordinate): {
    coordinate: HyperCoordinate;
    node: NodeDefinition | undefined;
    motion: MotionDefinition | undefined;
    learned: TypeCharacteristics | undefined;
    description: string;
  } {
    const hash = coordinateToHash(coord);
    const node = NODES_72[coord.node];
    const motion = MOTIONS_72[coord.motion];
    const learned = this.learnedTypes.get(hash);

    const nodeName = node?.name || coord.node;
    const motionName = motion?.name || coord.motion;

    return {
      coordinate: coord,
      node,
      motion,
      learned,
      description: `${nodeName}에 대해 ${motionName} 모션 수행`,
    };
  }

  getStats(): {
    totalCombinations: number;
    observedTypes: number;
    coverage: number;
    totalObservations: number;
    transitionsLearned: number;
  } {
    const totalObservations = Array.from(this.learnedTypes.values())
      .reduce((sum, t) => sum + t.observationCount, 0);
    
    const transitionsLearned = Array.from(this.transitionMatrix.values())
      .reduce((sum, m) => sum + m.size, 0);

    return {
      totalCombinations: TOTAL_COMBINATIONS,
      observedTypes: this.learnedTypes.size,
      coverage: (this.learnedTypes.size / TOTAL_COMBINATIONS) * 100,
      totalObservations,
      transitionsLearned,
    };
  }
}

// 글로벌 인스턴스
export const hypercube = new HyperCubeEngine();

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

export function getNodesByCategory(category: NodeCategory): Array<[string, NodeDefinition]> {
  return Object.entries(NODES_72).filter(([_, def]) => def.category === category);
}

export function getMotionsByCategory(category: MotionCategory): Array<[string, MotionDefinition]> {
  return Object.entries(MOTIONS_72).filter(([_, def]) => def.category === category);
}

// 카테고리 색상
export const NODE_CATEGORY_COLORS: Record<NodeCategory, string> = {
  CAPITAL: '#FFD700',    // 금색
  NETWORK: '#00AAFF',    // 파랑
  TIME: '#00CC66',       // 초록
  KNOWLEDGE: '#FF6B6B',  // 빨강
  BIO: '#9B59B6',        // 보라
  EMOTION: '#FF9500',    // 주황
};

export const MOTION_CATEGORY_COLORS: Record<MotionCategory, string> = {
  INCREASE: '#00CC66',   // 초록
  DECREASE: '#FF4444',   // 빨강
  TRANSFORM: '#9B59B6',  // 보라
  CONNECT: '#00AAFF',    // 파랑
  DISCONNECT: '#888888', // 회색
  STABILIZE: '#FFD700',  // 금색
};
