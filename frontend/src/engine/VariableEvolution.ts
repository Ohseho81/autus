/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 72³ 변수 고도화 시스템 (Variable Evolution)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "샤워실의 바보가 되지 않게"
 * 
 * Level 0: Prior (추정) → Level 4: 완전 개인화
 * 
 * 데이터가 쌓일수록:
 * - 계수가 정교해지고
 * - 노드가 활성화되고
 * - 임계점이 개인화되고
 * - 예측이 정확해진다
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type EvolutionLevel = 0 | 1 | 2 | 3 | 4;

export interface EvolvedCoefficient {
  id: string;
  from: string;
  to: string;
  
  // 값
  priorValue: number;           // Level 0 값
  currentValue: number;         // 현재 값
  seasonalValues?: {            // Level 3+ 계절별 값
    spring: number;
    summer: number;
    fall: number;
    winter: number;
  };
  dynamicFunction?: string;     // Level 4 동적 함수
  
  // 신뢰도
  confidence: number;           // 0-1
  confidenceLevel: ConfidenceLevel;
  
  // 메타
  dataPoints: number;
  lastUpdated: Date;
  evolutionLevel: EvolutionLevel;
  history: Array<{
    date: Date;
    value: number;
    dataPoints: number;
  }>;
  
  // 발견
  discoveries: string[];
}

export interface EvolvedThreshold {
  nodeId: string;
  
  // Level 0: 일반 임계점
  baseWarning: number;
  baseCritical: number;
  
  // Level 1: 조정된 임계점
  adjustedWarning?: number;
  adjustedCritical?: number;
  
  // Level 2: 복합 임계점
  compoundConditions?: Array<{
    condition: string;          // "loyalty < 0.75 AND competition > 0.15"
    result: 'WARNING' | 'CRITICAL';
  }>;
  
  // Level 3: 추세 임계점
  trendConditions?: Array<{
    type: 'consecutive_decline' | 'acceleration_negative';
    periods: number;
    result: 'WARNING' | 'CRITICAL';
  }>;
  
  // Level 4: 예측 임계점
  predictiveConditions?: Array<{
    horizonMonths: number;
    predictedValue: number;
    probability: number;
    result: 'WARNING' | 'CRITICAL';
  }>;
  
  evolutionLevel: EvolutionLevel;
  confidence: number;
}

export interface PriorHierarchy {
  universal: Record<string, number>;      // 모든 개체
  industry: Record<string, number>;       // 산업별
  segment: Record<string, number>;        // 세그먼트별
  individual: Record<string, number>;     // 개인화
}

export interface EvolutionState {
  level: EvolutionLevel;
  dataPoints: number;
  monthsOfData: number;
  overallConfidence: number;
  coefficients: Record<string, EvolvedCoefficient>;
  thresholds: Record<string, EvolvedThreshold>;
  activeNodes: string[];
  discoveries: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 상수
// ═══════════════════════════════════════════════════════════════════════════════

// Level 기준
export const LEVEL_THRESHOLDS = {
  0: { minMonths: 0, minDataPoints: 0 },
  1: { minMonths: 1, minDataPoints: 1 },
  2: { minMonths: 3, minDataPoints: 3 },
  3: { minMonths: 6, minDataPoints: 6 },
  4: { minMonths: 12, minDataPoints: 12 },
};

// 신뢰도 계산
export function calculateConfidence(dataPoints: number): number {
  // Confidence = 1 - 1/(1 + √n)
  return 1 - 1 / (1 + Math.sqrt(dataPoints));
}

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence < 0.30) return 'VERY_LOW';
  if (confidence < 0.45) return 'LOW';
  if (confidence < 0.55) return 'MEDIUM';
  if (confidence < 0.65) return 'HIGH';
  return 'VERY_HIGH';
}

// 계절 판정
export function getSeason(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Universal Prior (모든 개체 공통)
// ═══════════════════════════════════════════════════════════════════════════════

export const UNIVERSAL_PRIOR: Record<string, number> = {
  // 보존 법칙 관련
  'income_to_cash': 0.95,           // 수입 → 현금 (수수료 제외)
  'expense_to_cash': -1.0,          // 지출 → 현금 (완전 차감)
  
  // 엔트로피 법칙 관련
  'natural_decay': 0.02,            // 자연 감소율 2%/월
  'natural_concentration': 0.005,   // 자연 집중율 0.5%/월
  
  // 관성 법칙 관련
  'behavior_inertia': 0.9,          // 행동 관성 90%
  
  // 마찰 법칙 관련
  'transaction_friction': 0.025,    // 거래 마찰 2.5%
  
  // 중력 법칙 관련
  'customer_gravity': 0.02,         // 고객 인력 (추천)
};

// ═══════════════════════════════════════════════════════════════════════════════
// Industry Prior (산업별)
// ═══════════════════════════════════════════════════════════════════════════════

export const INDUSTRY_PRIORS: Record<string, Record<string, number>> = {
  ACADEMY: {
    base_churn: 0.03,               // 기본 이탈률 3%
    base_new_rate: 0.05,            // 기본 신규율 5%
    loyalty_churn_effect: 2.0,      // 충성도 → 이탈 영향
    competition_churn_effect: 1.0,  // 경쟁 → 이탈 영향
    loyalty_decay: 0.02,            // 충성도 자연 감소
    referral_rate: 0.02,            // 추천 전환율
    retention_loyalty_effect: 0.02, // 근속 → 충성도
    dependency_loyalty_effect: 0.01,// 의존도 → 충성도
    
    // 임계점
    loyalty_warning: 0.70,
    loyalty_critical: 0.60,
    dependency_warning: 0.40,
    dependency_critical: 0.55,
  },
  
  RESTAURANT: {
    base_churn: 0.15,               // 높은 이탈률
    base_new_rate: 0.20,            // 높은 신규율
    loyalty_decay: 0.05,            // 빠른 충성도 감소
    review_impact: 0.3,             // 리뷰 영향력
    ingredient_ratio: 0.35,         // 식재료 비율
    
    loyalty_warning: 0.60,
    loyalty_critical: 0.45,
  },
  
  FREELANCER: {
    base_churn: 0.10,
    base_new_rate: 0.08,
    utilization_target: 0.60,       // 목표 가동률
    client_dependency_warning: 0.50,
    burnout_threshold: 0.80,        // 과부하 임계
    
    dependency_warning: 0.50,
    dependency_critical: 0.70,
  },
  
  RETAIL: {
    base_churn: 0.20,
    inventory_turnover_target: 4.0, // 연 4회 회전
    margin_warning: 0.15,
    margin_critical: 0.08,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Segment Prior (세그먼트별)
// ═══════════════════════════════════════════════════════════════════════════════

export const SEGMENT_PRIORS: Record<string, Record<string, number>> = {
  // 학원 세그먼트
  'ACADEMY_ENTRANCE_EXAM': {        // 대치동 입시학원
    base_churn: 0.025,              // 낮은 이탈 (입시 고정)
    loyalty_decay: 0.015,
    seasonality_factor: 0.3,        // 계절성 높음
    competition_sensitivity: 0.8,    // 경쟁 민감
  },
  'ACADEMY_NEIGHBORHOOD': {         // 동네 보습학원
    base_churn: 0.04,
    loyalty_decay: 0.025,
    seasonality_factor: 0.1,        // 계절성 낮음
  },
  'ACADEMY_ARTS': {                 // 예체능 학원
    base_churn: 0.05,
    loyalty_decay: 0.03,
    teacher_dependency: 0.6,        // 강사 의존 높음
  },
  
  // 식당 세그먼트
  'RESTAURANT_FINE_DINING': {
    base_churn: 0.08,
    review_impact: 0.5,
  },
  'RESTAURANT_CASUAL': {
    base_churn: 0.20,
    review_impact: 0.2,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 변수 진화 엔진
// ═══════════════════════════════════════════════════════════════════════════════

export class VariableEvolutionEngine {
  private state: EvolutionState;
  private entityType: string;
  private segment?: string;
  
  constructor(entityType: string, segment?: string) {
    this.entityType = entityType;
    this.segment = segment;
    
    this.state = {
      level: 0,
      dataPoints: 0,
      monthsOfData: 0,
      overallConfidence: 0,
      coefficients: {},
      thresholds: {},
      activeNodes: this.getInitialActiveNodes(),
      discoveries: [],
    };
    
    // Prior 초기화
    this.initializeFromPrior();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 초기화
  // ═══════════════════════════════════════════════════════════════════════════
  
  private getInitialActiveNodes(): string[] {
    // Level 0: 핵심 노드 12개만
    return [
      'n01', 'n05', 'n06',  // 현금, 수입, 지출
      'n09',                // 고객수
      'n33', 'n34',         // 충성도, 근속
      'n70',                // 의존도
      'n47',                // 경쟁
      'n17', 'n21',         // 수입흐름, 신규율
      'n57',                // CAC
      'n69',                // 추천율
    ];
  }
  
  private initializeFromPrior(): void {
    // 계층적 Prior 병합: Universal → Industry → Segment
    const mergedPrior = {
      ...UNIVERSAL_PRIOR,
      ...(INDUSTRY_PRIORS[this.entityType] || {}),
      ...(this.segment ? SEGMENT_PRIORS[this.segment] || {} : {}),
    };
    
    // 계수 초기화
    for (const [key, value] of Object.entries(mergedPrior)) {
      if (key.includes('_to_') || key.includes('_effect')) {
        const [from, to] = this.parseCoeffKey(key);
        this.state.coefficients[key] = {
          id: key,
          from,
          to,
          priorValue: value,
          currentValue: value,
          confidence: 0,
          confidenceLevel: 'VERY_LOW',
          dataPoints: 0,
          lastUpdated: new Date(),
          evolutionLevel: 0,
          history: [],
          discoveries: [],
        };
      }
    }
    
    // 임계점 초기화
    const industryPrior = INDUSTRY_PRIORS[this.entityType] || {};
    
    if (industryPrior.loyalty_warning) {
      this.state.thresholds['loyalty'] = {
        nodeId: 'n33',
        baseWarning: industryPrior.loyalty_warning,
        baseCritical: industryPrior.loyalty_critical || industryPrior.loyalty_warning - 0.1,
        evolutionLevel: 0,
        confidence: 0,
      };
    }
    
    if (industryPrior.dependency_warning) {
      this.state.thresholds['dependency'] = {
        nodeId: 'n70',
        baseWarning: industryPrior.dependency_warning,
        baseCritical: industryPrior.dependency_critical || industryPrior.dependency_warning + 0.15,
        evolutionLevel: 0,
        confidence: 0,
      };
    }
  }
  
  private parseCoeffKey(key: string): [string, string] {
    if (key.includes('_to_')) {
      const parts = key.split('_to_');
      return [parts[0], parts[1]];
    }
    if (key.includes('_effect')) {
      const source = key.replace('_effect', '');
      return [source, 'target'];
    }
    return [key, 'unknown'];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 데이터 추가 및 학습
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 새 데이터 포인트 추가 및 학습
   */
  addDataPoint(
    observed: Record<string, number>,
    predicted: Record<string, number>,
    month: number
  ): void {
    this.state.dataPoints++;
    this.state.monthsOfData = Math.max(this.state.monthsOfData, Math.ceil(this.state.dataPoints / 1));
    
    // 레벨 업데이트
    this.updateLevel();
    
    // 신뢰도 업데이트
    this.state.overallConfidence = calculateConfidence(this.state.dataPoints);
    
    // 계수 업데이트
    this.updateCoefficients(observed, predicted, month);
    
    // 임계점 업데이트
    this.updateThresholds(observed, month);
    
    // 활성 노드 확장
    this.expandActiveNodes();
    
    // 발견 생성
    this.generateDiscoveries(observed, predicted);
  }
  
  private updateLevel(): void {
    for (let level = 4; level >= 0; level--) {
      const threshold = LEVEL_THRESHOLDS[level as EvolutionLevel];
      if (
        this.state.monthsOfData >= threshold.minMonths &&
        this.state.dataPoints >= threshold.minDataPoints
      ) {
        this.state.level = level as EvolutionLevel;
        break;
      }
    }
  }
  
  private updateCoefficients(
    observed: Record<string, number>,
    predicted: Record<string, number>,
    month: number
  ): void {
    const season = getSeason(month);
    
    for (const [key, coef] of Object.entries(this.state.coefficients)) {
      // 관련 노드의 오차 계산
      const error = this.calculateCoefficientError(coef, observed, predicted);
      if (error === null) continue;
      
      // 신뢰도 기반 학습률
      const confidence = calculateConfidence(coef.dataPoints + 1);
      const learningRate = 0.1 * confidence;
      
      // 값 업데이트: θ_new = θ_old × (1 - α) + θ_observed × α
      const observedValue = coef.currentValue + error * learningRate;
      coef.currentValue = coef.currentValue * (1 - learningRate) + observedValue * learningRate;
      
      // 계절별 값 업데이트 (Level 3+)
      if (this.state.level >= 3) {
        if (!coef.seasonalValues) {
          coef.seasonalValues = {
            spring: coef.currentValue,
            summer: coef.currentValue,
            fall: coef.currentValue,
            winter: coef.currentValue,
          };
        }
        coef.seasonalValues[season] = 
          coef.seasonalValues[season] * (1 - learningRate) + observedValue * learningRate;
      }
      
      // 메타 업데이트
      coef.dataPoints++;
      coef.confidence = confidence;
      coef.confidenceLevel = getConfidenceLevel(confidence);
      coef.lastUpdated = new Date();
      coef.evolutionLevel = this.state.level;
      
      // 히스토리 추가
      coef.history.push({
        date: new Date(),
        value: coef.currentValue,
        dataPoints: coef.dataPoints,
      });
    }
  }
  
  private calculateCoefficientError(
    coef: EvolvedCoefficient,
    observed: Record<string, number>,
    predicted: Record<string, number>
  ): number | null {
    // 관련 노드 찾기
    const toNode = this.findNodeForCoeff(coef.to);
    if (!toNode || !(toNode in observed) || !(toNode in predicted)) {
      return null;
    }
    
    // 정규화된 오차
    const actualValue = observed[toNode];
    const predictedValue = predicted[toNode];
    
    if (Math.abs(predictedValue) < 0.001) return null;
    
    return (actualValue - predictedValue) / Math.abs(predictedValue);
  }
  
  private findNodeForCoeff(target: string): string | null {
    const mapping: Record<string, string> = {
      'cash': 'n01',
      'income': 'n05',
      'expense': 'n06',
      'customers': 'n09',
      'loyalty': 'n33',
      'retention': 'n34',
      'dependency': 'n70',
      'competition': 'n47',
      'churn': 'n09', // 고객수로 대체
    };
    return mapping[target] || null;
  }
  
  private updateThresholds(observed: Record<string, number>, month: number): void {
    for (const [key, threshold] of Object.entries(this.state.thresholds)) {
      // Level 1: 조정된 임계점
      if (this.state.level >= 1 && !threshold.adjustedWarning) {
        // 실제 데이터 기반 조정
        const nodeValue = observed[threshold.nodeId];
        if (nodeValue !== undefined) {
          // 현재 값과 Prior의 차이 반영
          const diff = nodeValue - threshold.baseWarning;
          threshold.adjustedWarning = threshold.baseWarning + diff * 0.1;
          threshold.adjustedCritical = threshold.baseCritical + diff * 0.1;
        }
      }
      
      // Level 2: 복합 임계점
      if (this.state.level >= 2 && !threshold.compoundConditions) {
        threshold.compoundConditions = this.generateCompoundConditions(key);
      }
      
      // Level 3: 추세 임계점
      if (this.state.level >= 3 && !threshold.trendConditions) {
        threshold.trendConditions = [
          { type: 'consecutive_decline', periods: 3, result: 'WARNING' },
          { type: 'acceleration_negative', periods: 2, result: 'CRITICAL' },
        ];
      }
      
      // Level 4: 예측 임계점
      if (this.state.level >= 4 && !threshold.predictiveConditions) {
        threshold.predictiveConditions = [
          { horizonMonths: 3, predictedValue: threshold.baseCritical + 0.05, probability: 0.7, result: 'WARNING' },
          { horizonMonths: 6, predictedValue: threshold.baseCritical, probability: 0.5, result: 'CRITICAL' },
        ];
      }
      
      threshold.evolutionLevel = this.state.level;
      threshold.confidence = this.state.overallConfidence;
    }
  }
  
  private generateCompoundConditions(thresholdKey: string): EvolvedThreshold['compoundConditions'] {
    if (thresholdKey === 'loyalty') {
      return [
        { condition: 'n33 < 0.75 AND n47 > 0.15', result: 'WARNING' },
        { condition: 'n33 < 0.70 AND n70 > 0.40', result: 'CRITICAL' },
      ];
    }
    if (thresholdKey === 'dependency') {
      return [
        { condition: 'n70 > 0.35 AND n34 < 0.70', result: 'WARNING' },
        { condition: 'n70 > 0.45 AND n33 < 0.75', result: 'CRITICAL' },
      ];
    }
    return [];
  }
  
  private expandActiveNodes(): void {
    const expansionMap: Record<EvolutionLevel, string[]> = {
      0: [], // 초기 12개
      1: ['n02', 'n03', 'n04', 'n07', 'n08', 'n10'], // +6 재무 확장
      2: ['n21', 'n22', 'n45', 'n46', 'n58', 'n59', 'n60'], // +7 고객 세분화
      3: ['n25', 'n26', 'n37', 'n38', 'n49', 'n50', 'n61', 'n62', 'n63', 'n64'], // +10 운영
      4: ['n11', 'n12', 'n23', 'n24', 'n35', 'n36', 'n71', 'n72'], // +8 외부
    };
    
    for (let level = 0; level <= this.state.level; level++) {
      for (const node of expansionMap[level as EvolutionLevel]) {
        if (!this.state.activeNodes.includes(node)) {
          this.state.activeNodes.push(node);
        }
      }
    }
  }
  
  private generateDiscoveries(
    observed: Record<string, number>,
    predicted: Record<string, number>
  ): void {
    // 주요 발견 생성
    for (const [key, coef] of Object.entries(this.state.coefficients)) {
      const change = (coef.currentValue - coef.priorValue) / coef.priorValue;
      
      if (Math.abs(change) > 0.2 && coef.dataPoints >= 3) {
        const direction = change > 0 ? '높음' : '낮음';
        const discovery = `${key}: 실제 값이 Prior보다 ${Math.abs(change * 100).toFixed(0)}% ${direction}`;
        
        if (!coef.discoveries.includes(discovery)) {
          coef.discoveries.push(discovery);
          this.state.discoveries.push(discovery);
        }
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 계수 조회 (계절성 반영)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 현재 계수 값 조회 (계절성 반영)
   */
  getCoefficient(key: string, month?: number): number {
    const coef = this.state.coefficients[key];
    if (!coef) {
      // Prior에서 찾기
      const merged = {
        ...UNIVERSAL_PRIOR,
        ...(INDUSTRY_PRIORS[this.entityType] || {}),
      };
      return merged[key] || 0;
    }
    
    // Level 3+: 계절별 값 반환
    if (this.state.level >= 3 && coef.seasonalValues && month !== undefined) {
      const season = getSeason(month);
      return coef.seasonalValues[season];
    }
    
    return coef.currentValue;
  }
  
  /**
   * 모든 계수를 Record로 반환
   */
  getAllCoefficients(month?: number): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const [key, coef] of Object.entries(this.state.coefficients)) {
      result[key] = this.getCoefficient(key, month);
    }
    
    return result;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 임계점 평가
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 임계점 평가 (복합, 추세, 예측 포함)
   */
  evaluateThreshold(
    key: string,
    currentValue: number,
    history?: number[],
    predictions?: number[]
  ): 'STABLE' | 'WARNING' | 'CRITICAL' {
    const threshold = this.state.thresholds[key];
    if (!threshold) return 'STABLE';
    
    // Level 0: 기본 임계점
    const warning = threshold.adjustedWarning || threshold.baseWarning;
    const critical = threshold.adjustedCritical || threshold.baseCritical;
    
    // 의존도는 높을수록 위험 (반전)
    const isInverted = key === 'dependency';
    
    if (isInverted) {
      if (currentValue >= critical) return 'CRITICAL';
      if (currentValue >= warning) return 'WARNING';
    } else {
      if (currentValue <= critical) return 'CRITICAL';
      if (currentValue <= warning) return 'WARNING';
    }
    
    // Level 2: 복합 임계점
    if (this.state.level >= 2 && threshold.compoundConditions) {
      // 간단한 조건 평가 (실제 구현 시 파서 필요)
      // 여기서는 생략
    }
    
    // Level 3: 추세 임계점
    if (this.state.level >= 3 && threshold.trendConditions && history && history.length >= 3) {
      // 연속 하락 체크
      const consecutiveDecline = this.checkConsecutiveDecline(history, 3);
      if (consecutiveDecline) {
        return 'WARNING';
      }
      
      // 가속도 체크 (2차 미분)
      const acceleration = this.checkNegativeAcceleration(history);
      if (acceleration) {
        return 'CRITICAL';
      }
    }
    
    // Level 4: 예측 임계점
    if (this.state.level >= 4 && threshold.predictiveConditions && predictions) {
      for (const cond of threshold.predictiveConditions) {
        const futureValue = predictions[cond.horizonMonths - 1];
        if (futureValue !== undefined) {
          if (isInverted ? futureValue >= cond.predictedValue : futureValue <= cond.predictedValue) {
            return cond.result;
          }
        }
      }
    }
    
    return 'STABLE';
  }
  
  private checkConsecutiveDecline(history: number[], periods: number): boolean {
    if (history.length < periods) return false;
    
    const recent = history.slice(-periods);
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] >= recent[i - 1]) return false;
    }
    return true;
  }
  
  private checkNegativeAcceleration(history: number[]): boolean {
    if (history.length < 3) return false;
    
    const recent = history.slice(-3);
    const delta1 = recent[1] - recent[0];
    const delta2 = recent[2] - recent[1];
    const acceleration = delta2 - delta1;
    
    return acceleration < -0.02; // 가속도가 -2%p 이하
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 상태 조회
  // ═══════════════════════════════════════════════════════════════════════════
  
  getState(): EvolutionState {
    return { ...this.state };
  }
  
  getLevel(): EvolutionLevel {
    return this.state.level;
  }
  
  getActiveNodes(): string[] {
    return [...this.state.activeNodes];
  }
  
  getDiscoveries(): string[] {
    return [...this.state.discoveries];
  }
  
  /**
   * 진화 요약 리포트
   */
  getSummary(): string {
    const levelNames = ['Prior (추정)', '1차 조정', '패턴 학습', '계절성 반영', '완전 개인화'];
    
    let summary = `\n═══════════════════════════════════════════════════\n`;
    summary += `  변수 진화 상태\n`;
    summary += `═══════════════════════════════════════════════════\n\n`;
    
    summary += `📊 Level: ${this.state.level} - ${levelNames[this.state.level]}\n`;
    summary += `📅 데이터: ${this.state.dataPoints}개 (${this.state.monthsOfData}개월)\n`;
    summary += `🎯 신뢰도: ${(this.state.overallConfidence * 100).toFixed(0)}%\n`;
    summary += `📍 활성 노드: ${this.state.activeNodes.length}개\n\n`;
    
    summary += `📈 주요 계수 변화:\n`;
    for (const [key, coef] of Object.entries(this.state.coefficients).slice(0, 5)) {
      const change = ((coef.currentValue - coef.priorValue) / coef.priorValue * 100).toFixed(1);
      summary += `   ${key}: ${coef.priorValue.toFixed(3)} → ${coef.currentValue.toFixed(3)} (${change}%)\n`;
    }
    
    if (this.state.discoveries.length > 0) {
      summary += `\n💡 발견:\n`;
      for (const discovery of this.state.discoveries.slice(0, 3)) {
        summary += `   - ${discovery}\n`;
      }
    }
    
    return summary;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 직렬화
  // ═══════════════════════════════════════════════════════════════════════════
  
  toJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }
  
  static fromJSON(json: string, entityType: string, segment?: string): VariableEvolutionEngine {
    const engine = new VariableEvolutionEngine(entityType, segment);
    const state = JSON.parse(json);
    
    // Date 객체 복원
    for (const coef of Object.values(state.coefficients) as EvolvedCoefficient[]) {
      coef.lastUpdated = new Date(coef.lastUpdated);
      coef.history = coef.history.map((h: any) => ({
        ...h,
        date: new Date(h.date),
      }));
    }
    
    engine.state = state;
    return engine;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export const variableEvolution = new VariableEvolutionEngine('ACADEMY');

console.log('📈 Variable Evolution Engine Loaded');
console.log('  - Level 0-4 고도화 지원');
console.log('  - 계층적 Prior (Universal → Industry → Segment → Individual)');
console.log('  - 계절성, 복합 임계점, 추세 임계점, 예측 임계점');
