/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 비선형 방정식 시스템
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 선형 모델: X(t+1) = A · X(t)  (한계 있음)
 * 비선형 모델: X(t+1) = f(X(t), params)  (현실 반영)
 * 
 * 각 노드별 비선형 방정식 정의
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CORE_NODES, ACADEMY_PRIOR_10x10, ACADEMY_BENCHMARKS } from './BayesianPrior';

// ═══════════════════════════════════════════════════════════════════════════════
// 상태 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoreState {
  n01: number;  // 현금
  n05: number;  // 수입
  n06: number;  // 지출
  n09: number;  // 고객수
  n17: number;  // 수입흐름 (ratio)
  n21: number;  // 신규율 (추가)
  n33: number;  // 충성도 (0~1)
  n34: number;  // 강사근속 (0~1)
  n41: number;  // 수입가속 (rate)
  n47: number;  // 경쟁강도 (추가)
  n57: number;  // CAC (원)
  n70: number;  // 강사의존 (0~1)
}

export interface ActionParams {
  marketing_spend: number;    // 마케팅 투입
  retention_effort: number;   // 유지 노력 (0~1)
  salary_adjustment: number;  // 급여 조정률
  hiring: number;             // 신규 채용
}

export interface ExternalParams {
  market_factor: number;      // 시장 요인 (0.8~1.2)
  competition_pressure: number; // 경쟁 압력 (0~1)
  seasonal: number;           // 계절 요인 (0.8~1.2)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 비선형 방정식 시스템
// ═══════════════════════════════════════════════════════════════════════════════

export class NonlinearSystem {
  
  /**
   * 다음 상태 계산 (전체)
   */
  nextState(
    X: CoreState,
    actions: ActionParams,
    external: ExternalParams
  ): CoreState {
    const X_next: CoreState = { ...X };
    
    // 순서 중요! 의존 관계 고려
    
    // 1. 고객수 (가장 기본)
    X_next.n09 = this.calcCustomers(X, actions, external);
    
    // 2. 수입 (고객수 기반)
    X_next.n05 = this.calcIncome(X, X_next.n09, external);
    
    // 3. 지출
    X_next.n06 = this.calcExpense(X, X_next.n09, actions);
    
    // 4. 현금 (수입 - 지출)
    X_next.n01 = this.calcCash(X, X_next.n05, X_next.n06);
    
    // 5. 수입흐름
    X_next.n17 = this.calcIncomeFlow(X, X_next.n05);
    
    // 6. 수입가속
    X_next.n41 = this.calcIncomeAccel(X, X_next.n17);
    
    // 7. 충성도
    X_next.n33 = this.calcLoyalty(X, actions, external);
    
    // 8. 강사근속
    X_next.n34 = this.calcTeacherRetention(X, actions);
    
    // 9. CAC
    X_next.n57 = this.calcCAC(X, actions, X_next.n09 - X.n09 + X.n09 * (1 - X.n33) * 0.1);
    
    // 10. 강사의존도
    X_next.n70 = this.calcDependency(X, actions);
    
    // 신규율, 경쟁강도는 외부/내부 요인으로 결정
    X_next.n21 = this.calcNewRate(X, actions, external);
    X_next.n47 = external.competition_pressure;
    
    return X_next;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 개별 방정식
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * n01: 현금 = 현금 + 수입 - 지출 (보존 법칙)
   */
  calcCash(X: CoreState, income: number, expense: number): number {
    const cashIn = income * 0.9;  // 90% 현금화 (미수금 10%)
    const cashOut = expense;
    return X.n01 + cashIn - cashOut;
  }
  
  /**
   * n05: 수입 = 고객수 × 객단가 × 계절요인
   */
  calcIncome(X: CoreState, customers: number, external: ExternalParams): number {
    const avgTuition = X.n05 / Math.max(1, X.n09);  // 현재 객단가
    const baseIncome = customers * avgTuition;
    
    // 관성 효과 (급격한 변화 방지)
    const inertia = ACADEMY_PRIOR_10x10.n05.n05?.value ?? 0.7;
    
    return baseIncome * external.seasonal * inertia + X.n05 * (1 - inertia);
  }
  
  /**
   * n06: 지출 = 고정비 + 변동비 + 마케팅
   */
  calcExpense(X: CoreState, customers: number, actions: ActionParams): number {
    const fixedRatio = ACADEMY_BENCHMARKS.fixedCostRatio.avg;
    const fixedCost = X.n06 * fixedRatio;  // 고정비 유지
    
    // 변동비 (학생 수 비례)
    const variablePerStudent = X.n06 * (1 - fixedRatio) / Math.max(1, X.n09);
    const variableCost = customers * variablePerStudent;
    
    // 급여 조정
    const salaryAdjustment = fixedCost * 0.45 * actions.salary_adjustment;
    
    // 마케팅 지출
    const marketingCost = actions.marketing_spend;
    
    return fixedCost + variableCost + salaryAdjustment + marketingCost;
  }
  
  /**
   * n09: 고객수 = 고객수 × 유지율 + 신규 - 이탈
   * 
   * 비선형 핵심: 이탈은 충성도, 경쟁, 서비스 품질의 함수
   */
  calcCustomers(X: CoreState, actions: ActionParams, external: ExternalParams): number {
    // 유지율 = 충성도 기반 (관성)
    const baseRetention = X.n33;
    
    // 이탈 요인
    const competitionEffect = external.competition_pressure * 0.1;  // 경쟁 10% 영향
    const entropyEffect = 0.02 * (1 - actions.retention_effort);    // 엔트로피 2%
    
    // 월 이탈율
    const monthlyChurnRate = (1 - baseRetention) * 0.1 + competitionEffect + entropyEffect;
    const churn = X.n09 * Math.min(0.3, monthlyChurnRate);  // 최대 30%
    
    // 신규 유입
    const fromMarketing = actions.marketing_spend / Math.max(1, X.n57);
    const fromReferral = X.n09 * X.n21 * 0.35;  // 추천 35%
    const fromMarket = X.n09 * 0.02 * external.market_factor;  // 시장 2%
    const newCustomers = fromMarketing + fromReferral + fromMarket;
    
    // 임계점 체크 (Phase Transition)
    const loyaltyThreshold = 0.65;
    let cascadeChurn = 0;
    if (X.n33 < loyaltyThreshold) {
      const severity = (loyaltyThreshold - X.n33) / loyaltyThreshold;
      cascadeChurn = X.n09 * severity * 0.15;  // 연쇄 이탈 15%
    }
    
    return Math.max(0, Math.round(X.n09 - churn - cascadeChurn + newCustomers));
  }
  
  /**
   * n17: 수입흐름 = 현재수입 / 과거수입
   */
  calcIncomeFlow(X: CoreState, income: number): number {
    if (X.n05 === 0) return 1.0;
    return income / X.n05;
  }
  
  /**
   * n41: 수입가속 = Δ(수입흐름) / Δt
   */
  calcIncomeAccel(X: CoreState, incomeFlow: number): number {
    const accelInertia = ACADEMY_PRIOR_10x10.n41.n41?.value ?? 0.5;
    const newAccel = incomeFlow - 1.0;  // 1.0 기준 변화
    
    // 관성 적용 (급격한 변화 방지)
    return X.n41 * accelInertia + newAccel * (1 - accelInertia);
  }
  
  /**
   * n33: 충성도 = 충성도 × 관성 - 엔트로피 - 경쟁 + 관리효과
   * 
   * 엔트로피 적용: 관리 안 하면 감소
   */
  calcLoyalty(X: CoreState, actions: ActionParams, external: ExternalParams): number {
    const inertia = ACADEMY_PRIOR_10x10.n33.n33?.value ?? 0.85;
    
    // 엔트로피 감소 (월 1-2%)
    const entropyDecay = 0.015 * (1 - actions.retention_effort);
    
    // 경쟁 압력 영향
    const competitionEffect = external.competition_pressure * 0.02;
    
    // 강사 의존도 영향 (높으면 위험)
    const dependencyEffect = X.n70 > 0.4 ? (X.n70 - 0.4) * 0.1 : 0;
    
    // 관리 효과
    const managementEffect = actions.retention_effort * 0.02;
    
    const nextLoyalty = X.n33 * inertia - entropyDecay - competitionEffect - dependencyEffect + managementEffect;
    
    return Math.max(0, Math.min(1, nextLoyalty));
  }
  
  /**
   * n34: 강사근속 = 근속 × 관성 - 이직압력 + 급여효과
   */
  calcTeacherRetention(X: CoreState, actions: ActionParams): number {
    const inertia = ACADEMY_PRIOR_10x10.n34.n34?.value ?? 0.9;
    
    // 자연 이직 (엔트로피)
    const turnoverPressure = 0.02;
    
    // 급여 효과 (인상 시 유지력 상승)
    const salaryEffect = actions.salary_adjustment * 0.3;
    
    const nextRetention = X.n34 * inertia - turnoverPressure + salaryEffect;
    
    return Math.max(0, Math.min(1, nextRetention));
  }
  
  /**
   * n57: CAC = 마케팅비 / 신규고객
   * 
   * 수확체감: 마케팅 늘릴수록 효율 감소
   */
  calcCAC(X: CoreState, actions: ActionParams, newCustomers: number): number {
    if (newCustomers <= 0) {
      return X.n57 * 1.1;  // 신규 없으면 CAC 상승
    }
    
    const directCAC = actions.marketing_spend / newCustomers;
    
    // 관성 (급격한 변화 방지)
    const inertia = ACADEMY_PRIOR_10x10.n57.n57?.value ?? 0.7;
    
    return X.n57 * inertia + directCAC * (1 - inertia);
  }
  
  /**
   * n21: 신규율 = 신규 / 전체
   */
  calcNewRate(X: CoreState, actions: ActionParams, external: ExternalParams): number {
    const baseRate = 0.05;  // 기본 5%
    const marketingBoost = actions.marketing_spend / (X.n05 || 1) * 0.1;
    const marketEffect = external.market_factor - 1;
    
    return Math.max(0, Math.min(0.3, baseRate + marketingBoost + marketEffect));
  }
  
  /**
   * n70: 강사의존도
   * 
   * 의도적 분산 없으면 유지/증가 경향
   */
  calcDependency(X: CoreState, actions: ActionParams): number {
    const inertia = ACADEMY_PRIOR_10x10.n70.n70?.value ?? 0.95;
    
    // 신규 채용 효과 (분산)
    const hiringEffect = actions.hiring > 0 ? -0.03 * actions.hiring : 0;
    
    // 근속률 효과 (높으면 분산)
    const retentionEffect = X.n34 > 0.8 ? -0.01 : 0;
    
    const nextDependency = X.n70 * inertia + hiringEffect + retentionEffect;
    
    return Math.max(0, Math.min(1, nextDependency));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 다중 기간 시뮬레이션
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * N개월 시뮬레이션
   */
  simulate(
    initial: CoreState,
    actions: ActionParams,
    external: ExternalParams,
    months: number
  ): CoreState[] {
    const trajectory: CoreState[] = [initial];
    let current = initial;
    
    for (let t = 0; t < months; t++) {
      // 계절 조정
      const month = (new Date().getMonth() + t) % 12;
      const seasonal = this.getSeasonalFactor(month);
      
      const adjustedExternal = {
        ...external,
        seasonal,
      };
      
      current = this.nextState(current, actions, adjustedExternal);
      trajectory.push(current);
    }
    
    return trajectory;
  }
  
  /**
   * 계절 요인 (학원)
   */
  private getSeasonalFactor(month: number): number {
    const factors = [0.9, 1.2, 1.3, 1.0, 0.95, 0.9, 0.8, 0.85, 1.2, 1.0, 0.95, 0.9];
    return factors[month] ?? 1.0;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 분석 유틸리티
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 임계점 분석
   */
  analyzeThresholds(X: CoreState): Array<{
    node: string;
    value: number;
    threshold: number;
    crossed: boolean;
    severity: number;
  }> {
    return [
      {
        node: 'n33',
        value: X.n33,
        threshold: 0.65,
        crossed: X.n33 < 0.65,
        severity: X.n33 < 0.65 ? (0.65 - X.n33) / 0.65 : 0,
      },
      {
        node: 'n70',
        value: X.n70,
        threshold: 0.50,
        crossed: X.n70 > 0.50,
        severity: X.n70 > 0.50 ? (X.n70 - 0.50) / 0.50 : 0,
      },
      {
        node: 'n01',
        value: X.n01,
        threshold: X.n06,  // 1개월 운영비
        crossed: X.n01 < X.n06,
        severity: X.n01 < X.n06 ? (X.n06 - X.n01) / X.n06 : 0,
      },
      {
        node: 'n41',
        value: X.n41,
        threshold: -0.15,
        crossed: X.n41 < -0.15,
        severity: X.n41 < -0.15 ? Math.abs(X.n41 + 0.15) / 0.15 : 0,
      },
    ];
  }
  
  /**
   * 민감도 분석 (파라미터 변화에 따른 결과 변화)
   */
  sensitivityAnalysis(
    initial: CoreState,
    baseActions: ActionParams,
    external: ExternalParams,
    paramName: keyof ActionParams,
    range: number[]
  ): Array<{ paramValue: number; result: CoreState }> {
    return range.map(value => {
      const actions = { ...baseActions, [paramName]: value };
      const result = this.nextState(initial, actions, external);
      return { paramValue: value, result };
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 데이터 (대치영어학원)
// ═══════════════════════════════════════════════════════════════════════════════

export const SAMPLE_STATE: CoreState = {
  n01: 23_000_000,   // 현금 2,300만원
  n05: 52_000_000,   // 월매출 5,200만원
  n06: 41_000_000,   // 월비용 4,100만원
  n09: 127,          // 학생 127명
  n17: 0.98,         // 전월 대비 98%
  n21: 0.05,         // 신규율 5%
  n33: 0.78,         // 충성도 78%
  n34: 0.75,         // 강사근속 75%
  n41: -0.03,        // 가속도 -3%
  n47: 0.15,         // 경쟁강도 15%
  n57: 45_000,       // CAC 4.5만원
  n70: 0.38,         // 강사의존 38%
};

export const SAMPLE_ACTIONS: ActionParams = {
  marketing_spend: 2_000_000,
  retention_effort: 0.6,
  salary_adjustment: 0.05,
  hiring: 0,
};

export const SAMPLE_EXTERNAL: ExternalParams = {
  market_factor: 1.0,
  competition_pressure: 0.15,  // 시대인재
  seasonal: 1.0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export const nonlinearSystem = new NonlinearSystem();

console.log('⚙️ Nonlinear Equations System Loaded');
console.log('  - 10 Core Nodes');
console.log('  - 10 Nonlinear Equations');
console.log('  - Ready for Simulation');
