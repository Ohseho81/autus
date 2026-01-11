/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Pressure Calculator v2.5
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Pressure = Delay_Time × Exposure × Recovery_Difficulty
 * 
 * ML 없음, 확률 없음, 명확한 조건문
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  Node72,
  ALL_72_NODES,
  COST_TYPES,
  COST_TYPE_LIST,
  CostType,
  IRREVERSIBILITY_HORIZONS,
  IRREVERSIBILITY_LIST,
  IrreversibilityHorizon,
  PRESSURE_STATES,
  PressureState,
  PressureCell,
} from './Physics72Definition';

// ═══════════════════════════════════════════════════════════════════════════════
// 임계값 인터페이스
// ═══════════════════════════════════════════════════════════════════════════════

export interface NodeThreshold {
  warning: number;           // 이 값 이하면 PRESSURING
  critical: number;          // 이 값 이하면 IRREVERSIBLE
  direction?: 'below' | 'above'; // 'below' = 낮으면 위험, 'above' = 높으면 위험
  deadlineWarningDays?: number;  // 마감 N일 전이면 PRESSURING
  duration?: number;         // N개월 연속이면 적용
  unit?: string;             // 단위 (KRW, %, days 등)
}

export interface ThresholdConfig {
  [nodeId: string]: NodeThreshold;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pressure 항목 인터페이스
// ═══════════════════════════════════════════════════════════════════════════════

export interface PressureItem {
  node: Node72;
  nodeId: string;
  value: number;
  state: PressureState;
  threshold: NodeThreshold;
  
  // Pressure 계산 요소
  delayTime: number;         // 마감까지 남은 일수
  exposure: number;          // 시스템 내 비중 (0~1)
  recoveryDifficulty: number; // 복구 난이도 (0~1)
  pressure: number;          // 최종 Pressure 값
  
  // 비용 정보
  costTypes: CostType[];     // 관련 비용 유형들
  horizon: IrreversibilityHorizon; // 비가역성 시간대
  estimatedLoss: number;     // 예상 손실액
  
  // 표시용
  title: string;
  message: string;
  deadline: string;
  recommendations: string[];
}

export interface PressureResult {
  timestamp: Date;
  entityId: string;
  entityType: string;
  
  // 통계
  totalNodes: number;
  ignorableCount: number;
  pressuringCount: number;
  irreversibleCount: number;
  
  // 상세 항목
  items: PressureItem[];
  pressuringItems: PressureItem[];
  irreversibleItems: PressureItem[];
  
  // 요약
  totalEstimatedLoss: number;
  urgentDeadlines: Array<{ item: PressureItem; daysLeft: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 기본 임계값 (전문가 설정)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  // 재무 노드
  n01_cash_balance: {
    warning: 10_000_000,     // 1천만원 이하 PRESSURING
    critical: 5_000_000,     // 5백만원 이하 IRREVERSIBLE
    direction: 'below',
    unit: 'KRW',
  },
  n05_income_total: {
    warning: 30_000_000,
    critical: 20_000_000,
    direction: 'below',
    unit: 'KRW',
  },
  n17_income_flow: {
    warning: 0.95,           // 전월 대비 95% 이하 PRESSURING
    critical: 0.85,          // 85% 이하 IRREVERSIBLE
    direction: 'below',
    duration: 2,             // 2개월 연속
  },
  n41_income_accel: {
    warning: -0.05,          // -5% PRESSURING
    critical: -0.15,         // -15% IRREVERSIBLE
    direction: 'below',
    duration: 3,             // 3개월 연속
  },
  
  // 고객 노드
  n09_customer_count: {
    warning: -3,             // 월 -3명 PRESSURING
    critical: -5,            // 월 -5명 IRREVERSIBLE
    direction: 'below',
  },
  n21_customer_flow: {
    warning: 0.03,           // 신규 유입률 3% 이하 PRESSURING
    critical: 0.01,          // 1% 이하 IRREVERSIBLE
    direction: 'below',
  },
  n33_customer_inertia: {
    warning: 0.80,           // 재등록률 80% 이하 PRESSURING
    critical: 0.65,          // 65% 이하 IRREVERSIBLE
    direction: 'below',
    deadlineWarningDays: 30, // 재등록 시즌 30일 전
  },
  n45_customer_accel: {
    warning: -0.02,          // -2% PRESSURING
    critical: -0.05,         // -5% IRREVERSIBLE
    direction: 'below',
  },
  n57_customer_friction: {
    warning: 50_000,         // CAC 5만원 이상 PRESSURING
    critical: 100_000,       // 10만원 이상 IRREVERSIBLE
    direction: 'above',
    unit: 'KRW',
  },
  n65_income_gravity: {
    warning: 0.30,           // 상위 고객 집중도 30% 이상 PRESSURING
    critical: 0.50,          // 50% 이상 IRREVERSIBLE
    direction: 'above',
  },
  n69_customer_gravity: {
    warning: 0.20,           // 추천율 20% 이하 PRESSURING
    critical: 0.10,          // 10% 이하 IRREVERSIBLE
    direction: 'below',
  },
  
  // 인력 노드
  n10_supplier_count: {
    warning: -1,             // 강사 -1명 PRESSURING
    critical: -2,            // -2명 IRREVERSIBLE
    direction: 'below',
  },
  n34_supplier_inertia: {
    warning: 0.70,           // 근속률 70% 이하 PRESSURING
    critical: 0.50,          // 50% 이하 IRREVERSIBLE
    direction: 'below',
  },
  n46_supplier_accel: {
    warning: -0.10,          // 변동 가속 -10% PRESSURING
    critical: -0.20,         // -20% IRREVERSIBLE
    direction: 'below',
  },
  n70_supplier_gravity: {
    warning: 0.30,           // 핵심 강사 의존도 30% 이상 PRESSURING
    critical: 0.50,          // 50% 이상 IRREVERSIBLE
    direction: 'above',
  },
  n30_expense_inertia: {
    warning: 0.70,           // 고정비 비율 70% 이상 PRESSURING
    critical: 0.85,          // 85% 이상 IRREVERSIBLE
    direction: 'above',
  },
  
  // 경쟁 노드
  n11_competitor_count: {
    warning: 1,              // 경쟁자 +1 PRESSURING
    critical: 2,             // +2 IRREVERSIBLE
    direction: 'above',
  },
  n47_competitor_accel: {
    warning: 0.10,           // 경쟁 강도 +10% PRESSURING
    critical: 0.25,          // +25% IRREVERSIBLE
    direction: 'above',
  },
  n59_competitor_friction: {
    warning: 0.10,           // 마케팅 비용률 10% 이상 PRESSURING
    critical: 0.20,          // 20% 이상 IRREVERSIBLE
    direction: 'above',
  },
  
  // 미수금/미지급
  n02_receivable_balance: {
    warning: 2_000_000,      // 미수금 200만원 이상 PRESSURING
    critical: 5_000_000,     // 500만원 이상 IRREVERSIBLE
    direction: 'above',
    unit: 'KRW',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 노드-비용유형 매핑
// ═══════════════════════════════════════════════════════════════════════════════

const NODE_COST_MAPPING: Record<string, string[]> = {
  // 재무 노드 → 금전 손실
  n01: ['FINANCIAL'],
  n05: ['FINANCIAL'],
  n06: ['FINANCIAL'],
  n17: ['FINANCIAL', 'OPPORTUNITY'],
  n41: ['FINANCIAL', 'OPPORTUNITY'],
  
  // 고객 노드 → 금전 + 평판
  n09: ['FINANCIAL', 'REPUTATION'],
  n21: ['FINANCIAL', 'OPPORTUNITY'],
  n33: ['FINANCIAL', 'REPUTATION', 'TRUST'],
  n45: ['FINANCIAL', 'OPPORTUNITY'],
  n57: ['FINANCIAL'],
  n65: ['FINANCIAL', 'OPPORTUNITY'],
  n69: ['REPUTATION', 'OPPORTUNITY'],
  
  // 인력 노드 → 인재 + 금전
  n10: ['TALENT', 'FINANCIAL'],
  n34: ['TALENT'],
  n46: ['TALENT', 'FINANCIAL'],
  n70: ['TALENT', 'FINANCIAL', 'OPPORTUNITY'],
  n30: ['FINANCIAL'],
  
  // 경쟁 노드 → 기회 + 금전
  n11: ['OPPORTUNITY', 'FINANCIAL'],
  n47: ['OPPORTUNITY', 'FINANCIAL'],
  n59: ['FINANCIAL'],
  
  // 미수금 → 금전
  n02: ['FINANCIAL'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PressureCalculator 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export class PressureCalculator {
  private thresholds: ThresholdConfig;
  private exposureWeights: Record<string, number>;
  
  constructor(
    thresholds: ThresholdConfig = DEFAULT_THRESHOLDS,
    exposureWeights: Record<string, number> = {}
  ) {
    this.thresholds = thresholds;
    this.exposureWeights = exposureWeights;
  }
  
  /**
   * 상태 판정 (규칙 기반, ML ❌)
   */
  classifyState(
    nodeId: string,
    value: number,
    trend?: number,
    deadlineDays?: number
  ): PressureState {
    const threshold = this.thresholds[nodeId];
    if (!threshold) return 'IGNORABLE';
    
    const direction = threshold.direction || 'below';
    const isBelow = direction === 'below';
    
    // IRREVERSIBLE: 이미 늦음
    if (deadlineDays !== undefined && deadlineDays <= 0) {
      return 'IRREVERSIBLE';
    }
    
    if (isBelow) {
      if (value < threshold.critical) return 'IRREVERSIBLE';
      if (value < threshold.warning) return 'PRESSURING';
    } else {
      if (value > threshold.critical) return 'IRREVERSIBLE';
      if (value > threshold.warning) return 'PRESSURING';
    }
    
    // 트렌드 + 마감일 조합
    if (trend !== undefined && deadlineDays !== undefined) {
      const deadlineWarning = threshold.deadlineWarningDays || 14;
      if (trend < 0 && deadlineDays < deadlineWarning) {
        return 'PRESSURING';
      }
    }
    
    return 'IGNORABLE';
  }
  
  /**
   * Pressure 값 계산
   * Pressure = Delay_Time × Exposure × Recovery_Difficulty
   */
  calculatePressure(
    delayTime: number,       // 마감까지 남은 일수
    exposure: number,        // 시스템 내 비중 (0~1)
    recoveryDifficulty: number // 복구 난이도 (0~1)
  ): number {
    // 마감일이 가까울수록 Pressure 높음 (역수)
    const urgencyFactor = delayTime > 0 ? 30 / delayTime : 30;
    
    return urgencyFactor * exposure * recoveryDifficulty;
  }
  
  /**
   * 비가역성 시간대 결정
   */
  getHorizon(deadlineDays: number): IrreversibilityHorizon {
    if (deadlineDays < 1) return IRREVERSIBILITY_HORIZONS.IMMEDIATE;
    if (deadlineDays <= 7) return IRREVERSIBILITY_HORIZONS.DAYS;
    if (deadlineDays <= 28) return IRREVERSIBILITY_HORIZONS.WEEKS;
    if (deadlineDays <= 180) return IRREVERSIBILITY_HORIZONS.MONTHS;
    return IRREVERSIBILITY_HORIZONS.PERMANENT;
  }
  
  /**
   * 비용 유형 가져오기
   */
  getCostTypes(nodeId: string): CostType[] {
    const costIds = NODE_COST_MAPPING[nodeId] || ['FINANCIAL'];
    return costIds.map(id => COST_TYPES[id]);
  }
  
  /**
   * 예상 손실액 계산 (단순화)
   */
  estimateLoss(
    nodeId: string,
    currentValue: number,
    threshold: NodeThreshold,
    monthlyRevenue: number = 50_000_000
  ): number {
    // 노드별 손실 영향도
    const impactRates: Record<string, number> = {
      n33: 0.15,  // 재등록률 하락 → 매출의 15%
      n70: 0.30,  // 핵심 강사 의존도 → 매출의 30%
      n47: 0.10,  // 경쟁 강도 → 매출의 10%
      n09: 0.08,  // 학생 수 변화 → 매출의 8%/명
      n41: 0.12,  // 매출 가속도 → 매출의 12%
    };
    
    const impactRate = impactRates[nodeId] || 0.05;
    
    // 임계값 대비 심각도
    const direction = threshold.direction || 'below';
    let severity = 0;
    
    if (direction === 'below') {
      if (currentValue < threshold.critical) {
        severity = 1.0;
      } else if (currentValue < threshold.warning) {
        severity = (threshold.warning - currentValue) / (threshold.warning - threshold.critical);
      }
    } else {
      if (currentValue > threshold.critical) {
        severity = 1.0;
      } else if (currentValue > threshold.warning) {
        severity = (currentValue - threshold.warning) / (threshold.critical - threshold.warning);
      }
    }
    
    return Math.round(monthlyRevenue * impactRate * severity);
  }
  
  /**
   * 전체 분석 실행
   */
  analyze(
    nodeValues: Record<string, number>,
    entityId: string = '',
    entityType: string = 'academy',
    deadlines: Record<string, number> = {},
    monthlyRevenue: number = 50_000_000
  ): PressureResult {
    const items: PressureItem[] = [];
    let ignorableCount = 0;
    let pressuringCount = 0;
    let irreversibleCount = 0;
    let totalEstimatedLoss = 0;
    
    // 각 노드 분석
    for (const [nodeId, value] of Object.entries(nodeValues)) {
      const threshold = this.thresholds[nodeId];
      if (!threshold) continue;
      
      const node = ALL_72_NODES.find(n => n.id === nodeId);
      if (!node) continue;
      
      const deadlineDays = deadlines[nodeId] || 30;
      const state = this.classifyState(nodeId, value, undefined, deadlineDays);
      
      // 상태 카운트
      if (state === 'IGNORABLE') ignorableCount++;
      else if (state === 'PRESSURING') pressuringCount++;
      else irreversibleCount++;
      
      // IGNORABLE이 아닌 경우만 상세 계산
      if (state !== 'IGNORABLE') {
        const exposure = this.exposureWeights[nodeId] || 0.1;
        const recoveryDifficulty = state === 'IRREVERSIBLE' ? 0.9 : 0.5;
        const pressure = this.calculatePressure(deadlineDays, exposure, recoveryDifficulty);
        const costTypes = this.getCostTypes(nodeId);
        const horizon = this.getHorizon(deadlineDays);
        const estimatedLoss = this.estimateLoss(nodeId, value, threshold, monthlyRevenue);
        
        totalEstimatedLoss += estimatedLoss;
        
        const item: PressureItem = {
          node,
          nodeId,
          value,
          state,
          threshold,
          delayTime: deadlineDays,
          exposure,
          recoveryDifficulty,
          pressure,
          costTypes,
          horizon,
          estimatedLoss,
          title: node.nameKo,
          message: this.generateMessage(node, value, threshold, state, deadlineDays),
          deadline: this.formatDeadline(deadlineDays),
          recommendations: this.generateRecommendations(nodeId, state),
        };
        
        items.push(item);
      }
    }
    
    // Pressure 순으로 정렬
    items.sort((a, b) => b.pressure - a.pressure);
    
    // 긴급 마감 추출
    const urgentDeadlines = items
      .filter(item => item.delayTime <= 14)
      .map(item => ({ item, daysLeft: item.delayTime }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
    
    return {
      timestamp: new Date(),
      entityId,
      entityType,
      totalNodes: Object.keys(nodeValues).length,
      ignorableCount,
      pressuringCount,
      irreversibleCount,
      items,
      pressuringItems: items.filter(i => i.state === 'PRESSURING'),
      irreversibleItems: items.filter(i => i.state === 'IRREVERSIBLE'),
      totalEstimatedLoss,
      urgentDeadlines,
    };
  }
  
  /**
   * 메시지 생성
   */
  private generateMessage(
    node: Node72,
    value: number,
    threshold: NodeThreshold,
    state: PressureState,
    deadlineDays: number
  ): string {
    const direction = threshold.direction || 'below';
    const compareWord = direction === 'below' ? '이하' : '이상';
    const thresholdValue = state === 'IRREVERSIBLE' ? threshold.critical : threshold.warning;
    
    const valueStr = threshold.unit === 'KRW' 
      ? `${(value / 10000).toFixed(0)}만원`
      : typeof value === 'number' && value < 1 
        ? `${(value * 100).toFixed(1)}%`
        : value.toString();
    
    const thresholdStr = threshold.unit === 'KRW'
      ? `${(thresholdValue / 10000).toFixed(0)}만원`
      : typeof thresholdValue === 'number' && thresholdValue < 1
        ? `${(thresholdValue * 100).toFixed(1)}%`
        : thresholdValue.toString();
    
    if (state === 'IRREVERSIBLE') {
      return `${node.nameKo}이(가) ${thresholdStr} ${compareWord}입니다. 즉각적인 조치가 필요합니다.`;
    } else {
      return `${node.nameKo}이(가) ${valueStr}로 ${thresholdStr} ${compareWord} 접근 중입니다. ${deadlineDays}일 이내 결정이 필요합니다.`;
    }
  }
  
  /**
   * 마감일 포맷
   */
  private formatDeadline(days: number): string {
    if (days <= 0) return '이미 지남';
    if (days === 1) return '내일';
    if (days <= 7) return `${days}일 후`;
    if (days <= 14) return `${Math.ceil(days / 7)}주 후`;
    if (days <= 30) return `약 ${Math.ceil(days / 7)}주 후`;
    return `${Math.ceil(days / 30)}개월 후`;
  }
  
  /**
   * 권장 사항 생성
   */
  private generateRecommendations(nodeId: string, state: PressureState): string[] {
    const recommendations: Record<string, string[]> = {
      n33: [
        '재등록 의향 미확인 학생 리스트 확인',
        '최근 상담 기록 검토',
        '출석률 하락 학생 파악',
      ],
      n70: [
        '핵심 강사 계약 상태 확인',
        '경쟁 학원 스카우트 동향 파악',
        '백업 강사 확보 현황 점검',
      ],
      n47: [
        '경쟁자 가격 정책 파악',
        '차별화 포인트 정리',
        '연합 학원 협력 상황 확인',
      ],
      n09: [
        '최근 이탈 학생 사유 분석',
        '상담 대기 학생 리스트 확인',
        '등록 전환률 점검',
      ],
      n41: [
        '매출 감소 원인 분석',
        '신규 수익 채널 검토',
        '비용 절감 가능 항목 파악',
      ],
    };
    
    return recommendations[nodeId] || [
      '현재 상황 상세 분석',
      '관련 데이터 추가 수집',
      '전문가 상담 고려',
    ];
  }
  
  /**
   * 임계값 업데이트 (Phase 3 사후 보정)
   */
  adjustThreshold(
    nodeId: string,
    failureValues: number[]
  ): NodeThreshold | null {
    if (failureValues.length < 10) return null;
    
    // 손실 발생 값의 90분위 → 새 warning
    const sorted = [...failureValues].sort((a, b) => a - b);
    const p90Index = Math.floor(sorted.length * 0.9);
    const p50Index = Math.floor(sorted.length * 0.5);
    
    const newWarning = sorted[p90Index];
    const newCritical = sorted[p50Index];
    
    const current = this.thresholds[nodeId];
    if (!current) return null;
    
    return {
      ...current,
      warning: newWarning,
      critical: newCritical,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const pressureCalculator = new PressureCalculator();
export default PressureCalculator;

console.log('⚡ PressureCalculator v2.5 Loaded');
console.log('  - Formula: Pressure = Delay_Time × Exposure × Recovery_Difficulty');
console.log('  - States: IGNORABLE / PRESSURING / IRREVERSIBLE');
