/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 72³ Cube Interpreter (v2.0 - 실체화된 구조)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 72 = 6 물리법칙 × 12 개체성질
 * 
 * X축 (나의 상태):     72개 노드 = 내 비즈니스의 현재 상태
 * Y축 (상대방/환경):   72개 노드 = 시장/경쟁자/환경의 상태
 * Z축 (시간):          T = 주/월 단위
 * 
 * coords = [35, 47, 12] 
 * → "나의 [관성×경쟁자] vs 환경의 [가속×협력자] at T=12월"
 * → "경쟁자의 관성(점유율 유지력) vs 시장의 협력 가속화"
 * → 예측: 협력 강화 전략 필요
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PHYSICS_LAWS,
  PHYSICS_LAW_LIST,
  ENTITY_PROPERTIES,
  ENTITY_PROPERTY_LIST,
  ALL_72_NODES,
  Node72,
  PhysicsLaw,
  EntityProperty,
  calculateInteraction,
  CubeCell,
} from './Physics72Definition';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type CubeCoords = [number, number, number]; // [x(나), y(환경), z(시간)]

export interface InterpreterResult {
  coords: CubeCoords;
  
  // 나의 상태 (X축)
  myNode: {
    index: number;
    id: string;           // N01-N72
    name: string;         // "cash_balance"
    nameKo: string;       // "현금 잔고 변화"
    law: PhysicsLaw;
    property: EntityProperty;
    definition: string;
    formula: string;
  };
  
  // 환경/상대방 상태 (Y축)
  envNode: {
    index: number;
    id: string;
    name: string;
    nameKo: string;
    law: PhysicsLaw;
    property: EntityProperty;
    definition: string;
    formula: string;
  };
  
  // 시간 (Z축)
  time: {
    index: number;
    label: string;        // "2024년 1월" or "Week 12"
    periodType: 'week' | 'month';
  };
  
  // 상호작용 분석
  interaction: {
    description: string;  // "현금 보존 vs 경쟁자 인력"
    forceDirection: 'positive' | 'negative' | 'neutral';
    forceIntensity: number; // 0-100
    prediction: string;
  };
  
  // 전체 해석
  interpretation: string;
  
  // 권장 액션
  recommendedAction: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 인덱스(0-71)를 [법칙인덱스, 성질인덱스]로 분해
 */
function decompose72(index: number): [number, number] {
  const safeIndex = Math.max(0, Math.min(71, index));
  const lawIndex = Math.floor(safeIndex / 12);
  const propIndex = safeIndex % 12;
  return [lawIndex, propIndex];
}

/**
 * [법칙인덱스, 성질인덱스]를 0-71 인덱스로 합성
 */
function compose72(lawIndex: number, propIndex: number): number {
  return lawIndex * 12 + propIndex;
}

/**
 * 시간 인덱스를 레이블로 변환
 */
function timeIndexToLabel(index: number, periodType: 'week' | 'month' = 'month'): string {
  if (periodType === 'month') {
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                        '7월', '8월', '9월', '10월', '11월', '12월'];
    return monthNames[index % 12] || `${index + 1}월`;
  } else {
    return `Week ${(index % 52) + 1}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Interpreter Class
// ═══════════════════════════════════════════════════════════════════════════════

export class CubeInterpreter72 {
  private periodType: 'week' | 'month' = 'month';
  
  constructor(periodType: 'week' | 'month' = 'month') {
    this.periodType = periodType;
  }
  
  /**
   * 좌표 → 의미 해석 (메인 함수)
   */
  interpret(coords: CubeCoords): InterpreterResult {
    const [x, y, z] = coords;
    
    // 범위 정규화
    const safeX = Math.max(0, Math.min(71, x));
    const safeY = Math.max(0, Math.min(71, y));
    const safeZ = Math.max(0, Math.min(this.periodType === 'month' ? 11 : 51, z));
    
    // 노드 조회
    const myNode = ALL_72_NODES[safeX];
    const envNode = ALL_72_NODES[safeY];
    
    // 상호작용 계산
    const interaction = calculateInteraction(safeX, safeY);
    
    // 시간 레이블
    const timeLabel = timeIndexToLabel(safeZ, this.periodType);
    
    // 해석 생성
    const interpretation = this.generateInterpretation(myNode, envNode, interaction, timeLabel);
    const recommendedAction = this.generateRecommendation(myNode, envNode, interaction);
    
    return {
      coords: [safeX, safeY, safeZ],
      myNode: {
        index: safeX,
        id: myNode.id,
        name: myNode.name,
        nameKo: myNode.nameKo,
        law: myNode.law,
        property: myNode.property,
        definition: myNode.definition,
        formula: myNode.formula,
      },
      envNode: {
        index: safeY,
        id: envNode.id,
        name: envNode.name,
        nameKo: envNode.nameKo,
        law: envNode.law,
        property: envNode.property,
        definition: envNode.definition,
        formula: envNode.formula,
      },
      time: {
        index: safeZ,
        label: timeLabel,
        periodType: this.periodType,
      },
      interaction: {
        description: interaction.interaction,
        forceDirection: interaction.resultForce > 10 ? 'positive' : 
                       interaction.resultForce < -10 ? 'negative' : 'neutral',
        forceIntensity: Math.abs(interaction.resultForce),
        prediction: this.generatePrediction(interaction.resultForce),
      },
      interpretation,
      recommendedAction,
    };
  }
  
  /**
   * 예측 텍스트 생성
   */
  private generatePrediction(force: number): string {
    if (force >= 50) return '🚀 강한 성장 기회';
    if (force >= 20) return '📈 긍정적 기대';
    if (force >= -20) return '➡️ 현상 유지';
    if (force >= -50) return '📉 주의 필요';
    return '⚠️ 위기 대응 필요';
  }
  
  /**
   * 통합 해석 생성
   */
  private generateInterpretation(
    myNode: Node72, 
    envNode: Node72, 
    interaction: CubeCell,
    timeLabel: string
  ): string {
    const myLaw = myNode.law.name;
    const myProp = myNode.property.name;
    const envLaw = envNode.law.name;
    const envProp = envNode.property.name;
    
    const forceDesc = interaction.resultForce > 20 ? '시너지' :
                     interaction.resultForce > 0 ? '약한 협력' :
                     interaction.resultForce > -20 ? '약한 충돌' : '격렬한 충돌';
    
    const prediction = this.generatePrediction(interaction.resultForce);
    
    return `[${timeLabel}] 나의 "${myProp} ${myLaw}" vs 환경의 "${envProp} ${envLaw}" = ${forceDesc}\n` +
           `→ ${prediction}`;
  }
  
  /**
   * 권장 액션 생성
   */
  private generateRecommendation(myNode: Node72, envNode: Node72, interaction: CubeCell): string {
    // 특수 상황별 권장 액션
    const recommendations: Record<string, Record<string, string>> = {
      // 환경이 경쟁자 관련일 때
      COMPETITOR: {
        positive: '경쟁 우위 활용: 시장 확대 기회 포착',
        negative: '방어 전략: 차별화 또는 틈새 시장 공략',
        neutral: '모니터링: 경쟁 상황 주시',
      },
      // 환경이 고객 관련일 때
      CUSTOMER: {
        positive: '성장 가속: 고객 확보 투자 확대',
        negative: '리텐션 강화: 이탈 방지 프로그램 시행',
        neutral: '고객 피드백 청취',
      },
      // 환경이 공급자 관련일 때
      SUPPLIER: {
        positive: '협상력 활용: 유리한 조건 협상',
        negative: '대체 공급원 확보: 리스크 분산',
        neutral: '관계 유지',
      },
      // 환경이 협력자 관련일 때
      PARTNER: {
        positive: '시너지 극대화: 공동 프로젝트 확대',
        negative: '관계 재정립: 파트너십 조건 재협상',
        neutral: '협력 기회 탐색',
      },
    };
    
    const envPropId = envNode.property.id;
    const direction = interaction.resultForce > 10 ? 'positive' : 
                     interaction.resultForce < -10 ? 'negative' : 'neutral';
    
    const propRecommendations = recommendations[envPropId];
    if (propRecommendations) {
      return propRecommendations[direction];
    }
    
    // 일반 권장 액션
    if (interaction.resultForce > 20) {
      return '기회 활용: 현재 상황을 성장 동력으로 전환';
    } else if (interaction.resultForce > 0) {
      return '점진적 확대: 안정적으로 우위 확보';
    } else if (interaction.resultForce > -20) {
      return '리스크 모니터링: 상황 변화 주시';
    } else {
      return '위기 대응: 즉각적인 방어/전환 전략 실행';
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 노드 ID로 인덱스 찾기
   */
  getIndexById(nodeId: string): number {
    const node = ALL_72_NODES.find(n => n.id === nodeId);
    return node ? node.index : -1;
  }
  
  /**
   * 법칙과 성질로 인덱스 찾기
   */
  getIndexByLawAndProperty(lawId: string, propId: string): number {
    const lawIndex = PHYSICS_LAW_LIST.findIndex(l => l.id === lawId);
    const propIndex = ENTITY_PROPERTY_LIST.findIndex(p => p.id === propId);
    
    if (lawIndex === -1 || propIndex === -1) return -1;
    return compose72(lawIndex, propIndex);
  }
  
  /**
   * 인덱스에서 법칙과 성질 추출
   */
  getLawAndProperty(index: number): { law: PhysicsLaw; property: EntityProperty } | null {
    const node = ALL_72_NODES[index];
    if (!node) return null;
    return { law: node.law, property: node.property };
  }
  
  /**
   * 특정 법칙의 모든 노드 인덱스
   */
  getIndicesByLaw(lawId: string): number[] {
    return ALL_72_NODES
      .filter(n => n.law.id === lawId)
      .map(n => n.index);
  }
  
  /**
   * 특정 성질의 모든 노드 인덱스
   */
  getIndicesByProperty(propId: string): number[] {
    return ALL_72_NODES
      .filter(n => n.property.id === propId)
      .map(n => n.index);
  }
  
  /**
   * 랜덤 좌표 생성
   */
  generateRandomCoords(): CubeCoords {
    return [
      Math.floor(Math.random() * 72),
      Math.floor(Math.random() * 72),
      Math.floor(Math.random() * (this.periodType === 'month' ? 12 : 52)),
    ];
  }
  
  /**
   * 조건부 좌표 생성
   */
  generateCoordsByCondition(options: {
    myLaw?: string;
    myProperty?: string;
    envLaw?: string;
    envProperty?: string;
    timeIndex?: number;
  }): CubeCoords {
    let x = Math.floor(Math.random() * 72);
    let y = Math.floor(Math.random() * 72);
    let z = Math.floor(Math.random() * (this.periodType === 'month' ? 12 : 52));
    
    // X축 조건
    if (options.myLaw && options.myProperty) {
      x = this.getIndexByLawAndProperty(options.myLaw, options.myProperty);
    } else if (options.myLaw) {
      const indices = this.getIndicesByLaw(options.myLaw);
      x = indices[Math.floor(Math.random() * indices.length)];
    } else if (options.myProperty) {
      const indices = this.getIndicesByProperty(options.myProperty);
      x = indices[Math.floor(Math.random() * indices.length)];
    }
    
    // Y축 조건
    if (options.envLaw && options.envProperty) {
      y = this.getIndexByLawAndProperty(options.envLaw, options.envProperty);
    } else if (options.envLaw) {
      const indices = this.getIndicesByLaw(options.envLaw);
      y = indices[Math.floor(Math.random() * indices.length)];
    } else if (options.envProperty) {
      const indices = this.getIndicesByProperty(options.envProperty);
      y = indices[Math.floor(Math.random() * indices.length)];
    }
    
    // Z축 조건
    if (options.timeIndex !== undefined) {
      z = options.timeIndex;
    }
    
    return [x, y, z];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Analytics Methods
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 72x72 상호작용 매트릭스 생성 (한 시점)
   */
  generateInteractionMatrix(): number[][] {
    const matrix: number[][] = [];
    
    for (let x = 0; x < 72; x++) {
      matrix[x] = [];
      for (let y = 0; y < 72; y++) {
        const interaction = calculateInteraction(x, y);
        matrix[x][y] = interaction.resultForce;
      }
    }
    
    return matrix;
  }
  
  /**
   * 핫스팟 분석: 가장 강한 상호작용 찾기
   */
  findHotspots(limit: number = 10): Array<{ coords: [number, number]; force: number; desc: string }> {
    const results: Array<{ coords: [number, number]; force: number; desc: string }> = [];
    
    for (let x = 0; x < 72; x++) {
      for (let y = 0; y < 72; y++) {
        const interaction = calculateInteraction(x, y);
        results.push({
          coords: [x, y],
          force: interaction.resultForce,
          desc: interaction.interaction,
        });
      }
    }
    
    // 절대값 기준 정렬 (강한 상호작용 우선)
    results.sort((a, b) => Math.abs(b.force) - Math.abs(a.force));
    
    return results.slice(0, limit);
  }
  
  /**
   * 위기/기회 스캔
   */
  scanThreatsAndOpportunities(myIndices: number[]): {
    threats: Array<{ envIndex: number; force: number; desc: string }>;
    opportunities: Array<{ envIndex: number; force: number; desc: string }>;
  } {
    const threats: Array<{ envIndex: number; force: number; desc: string }> = [];
    const opportunities: Array<{ envIndex: number; force: number; desc: string }> = [];
    
    for (const myIndex of myIndices) {
      for (let envIndex = 0; envIndex < 72; envIndex++) {
        const interaction = calculateInteraction(myIndex, envIndex);
        
        if (interaction.resultForce < -30) {
          threats.push({
            envIndex,
            force: interaction.resultForce,
            desc: interaction.interaction,
          });
        } else if (interaction.resultForce > 30) {
          opportunities.push({
            envIndex,
            force: interaction.resultForce,
            desc: interaction.interaction,
          });
        }
      }
    }
    
    threats.sort((a, b) => a.force - b.force); // 가장 위험한 것 먼저
    opportunities.sort((a, b) => b.force - a.force); // 가장 좋은 것 먼저
    
    return { threats, opportunities };
  }
  
  /**
   * 시뮬레이션: 시간에 따른 상호작용 변화 예측
   */
  simulateTimeline(
    myIndex: number, 
    envIndex: number, 
    periods: number = 12
  ): Array<{ time: number; force: number; trend: 'up' | 'down' | 'stable' }> {
    const results: Array<{ time: number; force: number; trend: 'up' | 'down' | 'stable' }> = [];
    const baseInteraction = calculateInteraction(myIndex, envIndex);
    let prevForce = baseInteraction.resultForce;
    
    for (let t = 0; t < periods; t++) {
      // 시간에 따른 변동 시뮬레이션 (관성/가속 법칙 적용)
      const myNode = ALL_72_NODES[myIndex];
      const envNode = ALL_72_NODES[envIndex];
      
      // 관성 효과: 이전 상태 유지 경향
      const inertiaFactor = myNode.law.id === 'INERTIA' ? 0.9 : 0.7;
      
      // 가속 효과: 변화 증폭
      const accelFactor = myNode.law.id === 'ACCELERATION' || envNode.law.id === 'ACCELERATION' 
        ? 1.2 : 1.0;
      
      // 마찰 효과: 힘 감소
      const frictionFactor = myNode.law.id === 'FRICTION' || envNode.law.id === 'FRICTION'
        ? 0.95 : 1.0;
      
      // 노이즈
      const noise = (Math.random() - 0.5) * 10;
      
      // 힘 계산
      const force = prevForce * inertiaFactor * accelFactor * frictionFactor + noise;
      const boundedForce = Math.max(-100, Math.min(100, force));
      
      const trend = boundedForce > prevForce + 5 ? 'up' :
                   boundedForce < prevForce - 5 ? 'down' : 'stable';
      
      results.push({ time: t, force: boundedForce, trend });
      prevForce = boundedForce;
    }
    
    return results;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const cubeInterpreter72 = new CubeInterpreter72('month');
export default CubeInterpreter72;

// ═══════════════════════════════════════════════════════════════════════════════
// Quick Reference (개발/디버깅용)
// ═══════════════════════════════════════════════════════════════════════════════

export const QUICK_REFERENCE = {
  // 법칙별 인덱스 범위
  lawRanges: {
    CONSERVATION: [0, 11],   // N01-N12: 보존
    FLOW: [12, 23],          // N13-N24: 흐름
    INERTIA: [24, 35],       // N25-N36: 관성
    ACCELERATION: [36, 47],  // N37-N48: 가속
    FRICTION: [48, 59],      // N49-N60: 마찰
    GRAVITY: [60, 71],       // N61-N72: 인력
  },
  
  // 성질별 인덱스 (각 법칙 내에서)
  propertyOffsets: {
    CASH: 0,
    RECEIVABLE: 1,
    PAYABLE: 2,
    EQUITY: 3,
    INCOME: 4,
    EXPENSE: 5,
    INVESTMENT: 6,
    RETURN: 7,
    CUSTOMER: 8,
    SUPPLIER: 9,
    COMPETITOR: 10,
    PARTNER: 11,
  },
  
  // 주요 비즈니스 시나리오 좌표
  scenarios: {
    // 내 현금 보존 vs 경쟁자 점유율 가속
    cashVsCompetitor: [0, 46], // N01 vs N47
    
    // 내 고객 인력 vs 환경의 협력 인력
    customerVsPartner: [68, 71], // N69 vs N72
    
    // 내 매출 가속 vs 경쟁자 매출 가속
    incomeRace: [40, 40], // N41 vs N41 (같은 상태 비교)
    
    // 내 비용 마찰 vs 공급자 협상력
    costVsSupplier: [53, 69], // N54 vs N70
  },
  
  // 학원 비즈니스 핵심 노드
  academyKeyNodes: {
    monthlyRevenue: 4,    // N05: 보존 × 수입
    monthlyCost: 5,       // N06: 보존 × 지출
    studentChange: 8,     // N09: 보존 × 고객
    revenueGrowth: 40,    // N41: 가속 × 수입
    studentRetention: 32, // N33: 관성 × 고객
    wordOfMouth: 68,      // N69: 인력 × 고객
  },
};

console.log('🎯 CubeInterpreter72 Loaded');
console.log(`  - 72 nodes (6 laws × 12 properties)`);
console.log(`  - ${72 * 72} possible interactions`);
