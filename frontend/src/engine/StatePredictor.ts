/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS State Predictor (라플라스 결정론적 예측 엔진)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * State(t+1) = f(State(t), Action(t), Law, Params)
 * 
 * 확률이 아니라 계산.
 * 6개 법칙을 순차적으로 적용하여 다음 상태를 결정론적으로 계산.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  LAPLACE_LAWS,
  LearnableParams,
  DEFAULT_PARAMS,
  applyConservation,
  applyEntropy,
  applyInertia,
  applyFriction,
  applyGravity,
  applyThreshold,
} from './LaplaceLaws';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface StateVector {
  // 보존 (Conservation) - Stock 변화
  n01_cash: number;           // 현금 잔고
  n02_receivable: number;     // 미수금
  n03_payable: number;        // 미지급
  n04_equity: number;         // 자본
  n05_income: number;         // 총 수입
  n06_expense: number;        // 총 지출
  n09_customers: number;      // 고객 수
  n10_suppliers: number;      // 공급자 수 (강사)
  
  // 관성 (Inertia) - 유지력
  n29_income_inertia: number;     // 수입 안정성 (재등록률)
  n33_customer_inertia: number;   // 고객 충성도
  n34_supplier_inertia: number;   // 강사 근속률
  n30_expense_inertia: number;    // 고정비 비율
  
  // 가속 (Acceleration) - 변화율
  n41_income_accel: number;       // 매출 가속도
  n45_customer_accel: number;     // 고객 증가 가속
  n47_competitor_accel: number;   // 경쟁 강도
  
  // 마찰 (Friction) - 비용률
  n49_cash_friction: number;      // 결제 수수료
  n57_customer_friction: number;  // CAC
  n59_competitor_friction: number; // 경쟁 비용
  
  // 중력 (Gravity) - 집중도
  n65_income_gravity: number;     // 매출 집중도
  n69_customer_gravity: number;   // 추천율
  n70_supplier_gravity: number;   // 핵심 강사 의존도
}

export interface ActionInput {
  // 마케팅 액션
  marketing_spend: number;    // 마케팅 투입 (원)
  
  // 유지 액션
  retention_effort: number;   // 고객 유지 노력 (0~1)
  service_quality: number;    // 서비스 품질 (0~1)
  
  // 인력 액션
  salary_increase: number;    // 급여 인상률 (0~0.5)
  hiring: number;             // 신규 채용 (명)
  
  // 경쟁 액션
  competitive_response: number; // 경쟁 대응 투입 (원)
}

export interface ExternalFactors {
  market_growth: number;      // 시장 성장률 (-0.2 ~ 0.2)
  competitor_pressure: number; // 경쟁 압력 (0~1)
  seasonal_factor: number;    // 계절 요인 (0.8~1.2)
  economic_cycle: number;     // 경기 사이클 (0.9~1.1)
}

export interface PredictionResult {
  currentState: StateVector;
  nextState: StateVector;
  delta: Partial<StateVector>;
  
  // 법칙별 기여도
  lawContributions: {
    conservation: Record<string, number>;
    entropy: Record<string, number>;
    inertia: Record<string, number>;
    friction: Record<string, number>;
    gravity: Record<string, number>;
    threshold: Record<string, { crossed: boolean; severity: number }>;
  };
  
  // 경고
  alerts: Array<{
    type: 'threshold_crossed' | 'high_entropy' | 'acceleration_warning';
    node: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  
  // 예측 품질
  confidence: number;         // 예측 신뢰도 (0~1)
}

// ═══════════════════════════════════════════════════════════════════════════════
// StatePredictor 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export class StatePredictor {
  private params: LearnableParams;
  
  constructor(params: LearnableParams = DEFAULT_PARAMS) {
    this.params = params;
  }
  
  /**
   * 다음 상태 예측 (메인 함수)
   * State(t+1) = f(State(t), Action(t), Law, Params)
   */
  predict(
    currentState: StateVector,
    actions: ActionInput,
    external: ExternalFactors,
    timeStep: number = 1 // 월 단위
  ): PredictionResult {
    
    const lawContributions = {
      conservation: {} as Record<string, number>,
      entropy: {} as Record<string, number>,
      inertia: {} as Record<string, number>,
      friction: {} as Record<string, number>,
      gravity: {} as Record<string, number>,
      threshold: {} as Record<string, { crossed: boolean; severity: number }>,
    };
    
    const alerts: PredictionResult['alerts'] = [];
    const nextState = { ...currentState };
    
    // ═══════════════════════════════════════════════════════════════════════
    // Step 1: 보존 법칙 적용 (Conservation)
    // ═══════════════════════════════════════════════════════════════════════
    
    // 고객 수: Δ고객 = 신규 - 이탈
    const newCustomersFromMarketing = Math.floor(
      applyFriction(actions.marketing_spend, this.params.friction.acquisition / actions.marketing_spend || 0.5) 
      / this.params.friction.acquisition
    );
    const newCustomersFromReferral = Math.floor(
      currentState.n09_customers * currentState.n69_customer_gravity * this.params.gravity.referral
    );
    const newCustomersFromMarket = Math.floor(
      currentState.n09_customers * external.market_growth * external.seasonal_factor
    );
    const totalNewCustomers = newCustomersFromMarketing + newCustomersFromReferral + newCustomersFromMarket;
    
    // 이탈 계산 (엔트로피 + 경쟁 + 서비스)
    const baseChurnRate = 1 - currentState.n33_customer_inertia;
    const entropyChurn = this.params.entropyRate * (1 - actions.retention_effort);
    const competitionChurn = external.competitor_pressure * this.params.friction.competition;
    const serviceChurn = (1 - actions.service_quality) * 0.05;
    const totalChurnRate = Math.min(0.5, baseChurnRate + entropyChurn + competitionChurn + serviceChurn);
    const churnedCustomers = Math.floor(currentState.n09_customers * totalChurnRate);
    
    const deltaCustomers = totalNewCustomers - churnedCustomers;
    nextState.n09_customers = applyConservation(currentState.n09_customers, totalNewCustomers, churnedCustomers);
    lawContributions.conservation['n09_customers'] = deltaCustomers;
    
    // 수입: Δ수입 = 고객당 매출 × 고객 수 변화
    const revenuePerCustomer = currentState.n05_income / Math.max(1, currentState.n09_customers);
    const incomeChange = deltaCustomers * revenuePerCustomer * external.seasonal_factor;
    nextState.n05_income = applyConservation(
      currentState.n05_income * currentState.n29_income_inertia, // 관성 적용
      Math.max(0, incomeChange),
      Math.abs(Math.min(0, incomeChange))
    );
    lawContributions.conservation['n05_income'] = nextState.n05_income - currentState.n05_income;
    
    // 지출: Δ지출 = 고정비 + 변동비
    const fixedExpense = currentState.n06_expense * currentState.n30_expense_inertia;
    const variableExpense = actions.marketing_spend + actions.competitive_response;
    const salaryExpense = currentState.n10_suppliers * (1 + actions.salary_increase) * (currentState.n06_expense * 0.45 / Math.max(1, currentState.n10_suppliers));
    nextState.n06_expense = fixedExpense + variableExpense + salaryExpense;
    lawContributions.conservation['n06_expense'] = nextState.n06_expense - currentState.n06_expense;
    
    // 현금: Δ현금 = 수입 - 지출 - 마찰
    const netCashFlow = nextState.n05_income - nextState.n06_expense;
    const cashFriction = applyFriction(Math.abs(netCashFlow), currentState.n49_cash_friction);
    nextState.n01_cash = applyConservation(
      currentState.n01_cash,
      Math.max(0, netCashFlow - (netCashFlow > 0 ? cashFriction : 0)),
      Math.abs(Math.min(0, netCashFlow)) + (netCashFlow < 0 ? cashFriction : 0)
    );
    lawContributions.conservation['n01_cash'] = nextState.n01_cash - currentState.n01_cash;
    
    // 강사 수: Δ강사 = 채용 - 퇴사
    const teacherTurnover = Math.floor(currentState.n10_suppliers * (1 - currentState.n34_supplier_inertia) * (1 - actions.salary_increase * 2));
    nextState.n10_suppliers = applyConservation(currentState.n10_suppliers, actions.hiring, teacherTurnover);
    lawContributions.conservation['n10_suppliers'] = nextState.n10_suppliers - currentState.n10_suppliers;
    
    // ═══════════════════════════════════════════════════════════════════════
    // Step 2: 엔트로피 법칙 적용 (Entropy)
    // ═══════════════════════════════════════════════════════════════════════
    
    // 고객 충성도 엔트로피
    nextState.n33_customer_inertia = applyEntropy(
      currentState.n33_customer_inertia,
      this.params.entropyRate,
      actions.retention_effort * actions.service_quality
    );
    lawContributions.entropy['n33_customer_inertia'] = nextState.n33_customer_inertia - currentState.n33_customer_inertia;
    
    // 강사 근속률 엔트로피
    nextState.n34_supplier_inertia = applyEntropy(
      currentState.n34_supplier_inertia,
      this.params.entropyRate * 0.5, // 강사는 고객보다 느림
      actions.salary_increase + 0.5 // 기본 노력
    );
    lawContributions.entropy['n34_supplier_inertia'] = nextState.n34_supplier_inertia - currentState.n34_supplier_inertia;
    
    // 수입 안정성 엔트로피
    nextState.n29_income_inertia = applyEntropy(
      currentState.n29_income_inertia,
      this.params.entropyRate * 0.3,
      actions.retention_effort
    );
    lawContributions.entropy['n29_income_inertia'] = nextState.n29_income_inertia - currentState.n29_income_inertia;
    
    // ═══════════════════════════════════════════════════════════════════════
    // Step 3: 관성 법칙 적용 (Inertia)
    // ═══════════════════════════════════════════════════════════════════════
    
    // 매출 가속도
    const incomeForce = (nextState.n05_income - currentState.n05_income) / Math.max(1, currentState.n05_income);
    const incomeMass = this.params.inertia.income;
    nextState.n41_income_accel = applyInertia(currentState.n41_income_accel * 0.5, incomeForce, incomeMass);
    lawContributions.inertia['n41_income_accel'] = nextState.n41_income_accel - currentState.n41_income_accel;
    
    // 고객 증가 가속도
    const customerForce = deltaCustomers / Math.max(1, currentState.n09_customers);
    const customerMass = this.params.inertia.customer;
    nextState.n45_customer_accel = applyInertia(currentState.n45_customer_accel * 0.5, customerForce, customerMass);
    lawContributions.inertia['n45_customer_accel'] = nextState.n45_customer_accel - currentState.n45_customer_accel;
    
    // 경쟁 강도 (외부 요인 + 관성)
    const competitorForce = external.competitor_pressure - 0.1; // 기준점 10%
    nextState.n47_competitor_accel = applyInertia(currentState.n47_competitor_accel * 0.7, competitorForce, 0.8);
    lawContributions.inertia['n47_competitor_accel'] = nextState.n47_competitor_accel - currentState.n47_competitor_accel;
    
    // ═══════════════════════════════════════════════════════════════════════
    // Step 4: 마찰 법칙 적용 (Friction)
    // ═══════════════════════════════════════════════════════════════════════
    
    // CAC 계산 (마케팅 효율)
    if (totalNewCustomers > 0) {
      nextState.n57_customer_friction = actions.marketing_spend / totalNewCustomers;
    } else {
      nextState.n57_customer_friction = currentState.n57_customer_friction * 1.2; // 효율 감소
    }
    lawContributions.friction['n57_customer_friction'] = nextState.n57_customer_friction - currentState.n57_customer_friction;
    
    // 경쟁 비용률
    nextState.n59_competitor_friction = actions.competitive_response / Math.max(1, nextState.n05_income);
    lawContributions.friction['n59_competitor_friction'] = nextState.n59_competitor_friction - currentState.n59_competitor_friction;
    
    // ═══════════════════════════════════════════════════════════════════════
    // Step 5: 중력 법칙 적용 (Gravity)
    // ═══════════════════════════════════════════════════════════════════════
    
    // 추천율 (중력 효과)
    const referralAttraction = applyGravity(
      nextState.n09_customers / 100, // 정규화
      nextState.n33_customer_inertia, // 충성도가 높을수록
      1 - nextState.n33_customer_inertia, // 거리 = 1 - 충성도
      this.params.gravity.referral
    );
    nextState.n69_customer_gravity = Math.min(0.8, currentState.n69_customer_gravity * 0.9 + referralAttraction * 0.1);
    lawContributions.gravity['n69_customer_gravity'] = nextState.n69_customer_gravity - currentState.n69_customer_gravity;
    
    // 핵심 강사 의존도 (주의: 높아지면 위험)
    if (nextState.n10_suppliers > 0) {
      const topTeacherShare = currentState.n70_supplier_gravity;
      // 강사 이탈 시 의존도 변화
      if (teacherTurnover > 0) {
        // 핵심 강사 이탈 확률
        const topTeacherChance = topTeacherShare * teacherTurnover / currentState.n10_suppliers;
        nextState.n70_supplier_gravity = currentState.n70_supplier_gravity * (1 - topTeacherChance * 0.5);
      } else {
        nextState.n70_supplier_gravity = currentState.n70_supplier_gravity * 0.98; // 서서히 분산
      }
    }
    lawContributions.gravity['n70_supplier_gravity'] = nextState.n70_supplier_gravity - currentState.n70_supplier_gravity;
    
    // 매출 집중도
    nextState.n65_income_gravity = currentState.n65_income_gravity * 0.95 + 
      (1 - nextState.n69_customer_gravity) * 0.05; // 추천율 낮으면 집중도 상승
    lawContributions.gravity['n65_income_gravity'] = nextState.n65_income_gravity - currentState.n65_income_gravity;
    
    // ═══════════════════════════════════════════════════════════════════════
    // Step 6: 임계 법칙 적용 (Threshold)
    // ═══════════════════════════════════════════════════════════════════════
    
    // 충성도 임계점
    const loyaltyThreshold = applyThreshold(
      nextState.n33_customer_inertia,
      this.params.threshold.loyalty,
      'below'
    );
    lawContributions.threshold['n33_customer_inertia'] = loyaltyThreshold;
    
    if (loyaltyThreshold.crossed) {
      // 연쇄 이탈 효과
      const cascadeChurn = Math.floor(nextState.n09_customers * loyaltyThreshold.severity * 0.15);
      nextState.n09_customers = Math.max(0, nextState.n09_customers - cascadeChurn);
      
      alerts.push({
        type: 'threshold_crossed',
        node: 'n33_customer_inertia',
        message: `고객 충성도가 임계점(${(this.params.threshold.loyalty * 100).toFixed(0)}%) 이하로 하락. 연쇄 이탈 ${cascadeChurn}명 발생.`,
        severity: loyaltyThreshold.severity > 0.5 ? 'critical' : 'high',
      });
    }
    
    // 현금 임계점
    const cashThreshold = applyThreshold(
      nextState.n01_cash,
      this.params.threshold.cash,
      'below'
    );
    lawContributions.threshold['n01_cash'] = cashThreshold;
    
    if (cashThreshold.crossed) {
      alerts.push({
        type: 'threshold_crossed',
        node: 'n01_cash',
        message: `현금이 임계점(${(this.params.threshold.cash / 10000).toFixed(0)}만원) 이하로 하락. 운영 위기.`,
        severity: 'critical',
      });
    }
    
    // 핵심 강사 의존도 임계점
    const dependencyThreshold = applyThreshold(
      nextState.n70_supplier_gravity,
      this.params.threshold.dependency,
      'above'
    );
    lawContributions.threshold['n70_supplier_gravity'] = dependencyThreshold;
    
    if (dependencyThreshold.crossed) {
      alerts.push({
        type: 'threshold_crossed',
        node: 'n70_supplier_gravity',
        message: `핵심 강사 의존도가 임계점(${(this.params.threshold.dependency * 100).toFixed(0)}%) 초과. 이탈 시 붕괴 위험.`,
        severity: dependencyThreshold.severity > 0.3 ? 'high' : 'medium',
      });
    }
    
    // 성장 가속도 임계점
    const growthThreshold = applyThreshold(
      nextState.n41_income_accel,
      this.params.threshold.growth,
      'below'
    );
    lawContributions.threshold['n41_income_accel'] = growthThreshold;
    
    if (growthThreshold.crossed) {
      alerts.push({
        type: 'acceleration_warning',
        node: 'n41_income_accel',
        message: `매출 성장 가속도가 임계점(${(this.params.threshold.growth * 100).toFixed(0)}%) 이하. 급격한 하락 추세.`,
        severity: 'high',
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 결과 정리
    // ═══════════════════════════════════════════════════════════════════════
    
    // 델타 계산
    const delta: Partial<StateVector> = {};
    for (const key of Object.keys(currentState) as (keyof StateVector)[]) {
      delta[key] = nextState[key] - currentState[key];
    }
    
    // 신뢰도 계산 (데이터 완전성 기반)
    const confidence = this.calculateConfidence(currentState, actions);
    
    return {
      currentState,
      nextState,
      delta,
      lawContributions,
      alerts,
      confidence,
    };
  }
  
  /**
   * 예측 신뢰도 계산
   */
  private calculateConfidence(state: StateVector, actions: ActionInput): number {
    // 기본 신뢰도
    let confidence = 0.7;
    
    // 데이터 완전성 (빈 값 체크)
    const stateValues = Object.values(state);
    const validValues = stateValues.filter(v => v !== null && v !== undefined && !isNaN(v));
    confidence *= validValues.length / stateValues.length;
    
    // 액션 명확성
    const actionValues = Object.values(actions);
    const definedActions = actionValues.filter(v => v > 0);
    confidence *= 0.5 + (definedActions.length / actionValues.length) * 0.5;
    
    // 임계점 근처면 신뢰도 감소 (불확실성 증가)
    if (state.n33_customer_inertia < this.params.threshold.loyalty * 1.2) {
      confidence *= 0.8;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }
  
  /**
   * 다중 기간 예측
   */
  predictMultiple(
    initialState: StateVector,
    actions: ActionInput,
    external: ExternalFactors,
    periods: number
  ): PredictionResult[] {
    const results: PredictionResult[] = [];
    let currentState = initialState;
    
    for (let t = 0; t < periods; t++) {
      // 계절 요인 조정 (월별)
      const month = (new Date().getMonth() + t) % 12;
      const seasonalExternal = {
        ...external,
        seasonal_factor: this.getSeasonalFactor(month),
      };
      
      const result = this.predict(currentState, actions, seasonalExternal, 1);
      results.push(result);
      currentState = result.nextState;
    }
    
    return results;
  }
  
  /**
   * 계절 요인 (학원 도메인)
   */
  private getSeasonalFactor(month: number): number {
    // 0=1월, 1=2월, ...
    const factors: Record<number, number> = {
      0: 0.9,   // 1월: 겨울방학 끝
      1: 1.2,   // 2월: 신학기 준비
      2: 1.3,   // 3월: 신학기 시작 (피크)
      3: 1.0,   // 4월
      4: 0.95,  // 5월
      5: 0.9,   // 6월
      6: 0.8,   // 7월: 여름방학 시작
      7: 0.85,  // 8월: 여름방학
      8: 1.2,   // 9월: 2학기 시작
      9: 1.0,   // 10월
      10: 0.95, // 11월
      11: 0.9,  // 12월: 겨울방학 시작
    };
    return factors[month] || 1.0;
  }
  
  /**
   * 파라미터 업데이트 (학습)
   */
  updateParams(newParams: Partial<LearnableParams>): void {
    this.params = {
      ...this.params,
      ...newParams,
      inertia: { ...this.params.inertia, ...newParams.inertia },
      friction: { ...this.params.friction, ...newParams.friction },
      gravity: { ...this.params.gravity, ...newParams.gravity },
      threshold: { ...this.params.threshold, ...newParams.threshold },
    };
  }
  
  getParams(): LearnableParams {
    return { ...this.params };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 초기 상태 (대치영어학원)
// ═══════════════════════════════════════════════════════════════════════════════

export const SAMPLE_INITIAL_STATE: StateVector = {
  // 보존
  n01_cash: 23_000_000,
  n02_receivable: 3_200_000,
  n03_payable: 5_000_000,
  n04_equity: 18_000_000,
  n05_income: 52_000_000,
  n06_expense: 41_000_000,
  n09_customers: 127,
  n10_suppliers: 8,
  
  // 관성
  n29_income_inertia: 0.90,
  n33_customer_inertia: 0.78,
  n34_supplier_inertia: 0.75,
  n30_expense_inertia: 0.65,
  
  // 가속
  n41_income_accel: -0.03,
  n45_customer_accel: -0.01,
  n47_competitor_accel: 0.15,
  
  // 마찰
  n49_cash_friction: 0.025,
  n57_customer_friction: 45_000,
  n59_competitor_friction: 0.08,
  
  // 중력
  n65_income_gravity: 0.22,
  n69_customer_gravity: 0.35,
  n70_supplier_gravity: 0.38,
};

export const SAMPLE_ACTIONS: ActionInput = {
  marketing_spend: 2_000_000,
  retention_effort: 0.6,
  service_quality: 0.8,
  salary_increase: 0.05,
  hiring: 0,
  competitive_response: 500_000,
};

export const SAMPLE_EXTERNAL: ExternalFactors = {
  market_growth: 0.02,
  competitor_pressure: 0.15, // 시대인재 진입
  seasonal_factor: 1.0,
  economic_cycle: 1.0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const statePredictor = new StatePredictor();
export default StatePredictor;

console.log('🔮 StatePredictor Loaded');
console.log('  - State(t+1) = f(State(t), Action(t), Law, Params)');
console.log('  - 6 Laws Applied: Conservation → Entropy → Inertia → Friction → Gravity → Threshold');
