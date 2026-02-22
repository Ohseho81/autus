/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Bayesian Laplace Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "Prior + Evidence = Posterior"
 * "일반 법칙 + 개인 데이터 = 너의 라플라스"
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 학습 루프:
 * 1. Prior 예측: X(t+1) = f(X(t), Prior)
 * 2. 실제 관측: X(t+1)_actual
 * 3. 오차 계산: Error = X(t+1)_actual - X(t+1)_predicted
 * 4. 계수 조정: Posterior = Prior + learning_rate × Error
 * 5. 반복
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  CORE_NODES,
  ACADEMY_PRIOR_10x10,
  PriorCoefficient,
  ConfidenceLevel,
  priorToMatrix,
  CoreNode,
} from './BayesianPrior';

import {
  CoreState,
  ActionParams,
  ExternalParams,
  NonlinearSystem,
  nonlinearSystem,
} from './NonlinearEquations';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface Observation {
  timestamp: Date;
  state: Partial<CoreState>;
  actions?: ActionParams;
  external?: ExternalParams;
}

export interface PredictionError {
  node: string;
  predicted: number;
  actual: number;
  error: number;         // actual - predicted
  errorRate: number;     // error / actual (%)
}

export interface LearningResult {
  iteration: number;
  timestamp: Date;
  predictions: Partial<CoreState>;
  actuals: Partial<CoreState>;
  errors: PredictionError[];
  totalMSE: number;       // Mean Squared Error
  adjustments: Array<{
    from: string;
    to: string;
    oldValue: number;
    newValue: number;
  }>;
}

export interface PosteriorMatrix {
  coefficients: Record<string, Record<string, number>>;
  confidence: Record<string, Record<string, ConfidenceLevel>>;
  updateCount: Record<string, Record<string, number>>;
  lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bayesian Laplace Engine
// ═══════════════════════════════════════════════════════════════════════════════

export class BayesianLaplace {
  private posterior: PosteriorMatrix;
  private learningRate: number;
  private history: LearningResult[] = [];
  private observations: Observation[] = [];
  
  constructor(learningRate: number = 0.1) {
    this.learningRate = learningRate;
    this.posterior = this.initializePosterior();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 초기화
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Prior로 Posterior 초기화
   */
  private initializePosterior(): PosteriorMatrix {
    const coefficients: Record<string, Record<string, number>> = {};
    const confidence: Record<string, Record<string, ConfidenceLevel>> = {};
    const updateCount: Record<string, Record<string, number>> = {};
    
    for (const from of CORE_NODES) {
      coefficients[from] = {};
      confidence[from] = {};
      updateCount[from] = {};
      
      for (const to of CORE_NODES) {
        const prior = ACADEMY_PRIOR_10x10[from][to];
        coefficients[from][to] = prior?.value ?? 0;
        confidence[from][to] = prior?.confidence ?? 'LOW';
        updateCount[from][to] = 0;
      }
    }
    
    return {
      coefficients,
      confidence,
      updateCount,
      lastUpdated: new Date(),
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 예측
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 현재 Posterior로 다음 상태 예측
   */
  predict(
    current: CoreState,
    actions: ActionParams,
    external: ExternalParams
  ): CoreState {
    // 비선형 시스템 사용 (Posterior 반영)
    return nonlinearSystem.nextState(current, actions, external);
  }
  
  /**
   * N개월 예측
   */
  predictTrajectory(
    initial: CoreState,
    actions: ActionParams,
    external: ExternalParams,
    months: number
  ): CoreState[] {
    return nonlinearSystem.simulate(initial, actions, external, months);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 학습 (Bayesian Update)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 관측값 추가
   */
  addObservation(obs: Observation): void {
    this.observations.push(obs);
  }
  
  /**
   * 단일 학습 스텝
   * Prior + Evidence = Posterior
   */
  learn(
    predicted: CoreState,
    actual: Partial<CoreState>,
    actions?: ActionParams
  ): LearningResult {
    const errors: PredictionError[] = [];
    const adjustments: LearningResult['adjustments'] = [];
    
    // 1. 오차 계산
    for (const node of CORE_NODES) {
      if (actual[node] !== undefined) {
        const pred = predicted[node];
        const act = actual[node]!;
        const error = act - pred;
        const errorRate = act !== 0 ? error / act : 0;
        
        errors.push({
          node,
          predicted: pred,
          actual: act,
          error,
          errorRate,
        });
      }
    }
    
    // 2. 계수 조정 (Bayesian Update)
    for (const err of errors) {
      const toNode = err.node as CoreNode;
      
      // 이 노드에 영향을 주는 모든 노드의 계수 조정
      for (const fromNode of CORE_NODES) {
        const currentCoef = this.posterior.coefficients[fromNode][toNode];
        if (currentCoef === 0) continue;  // 연결 없는 곳은 건너뜀
        
        // 신뢰도에 따른 학습률 조정
        const conf = this.posterior.confidence[fromNode][toNode];
        const confMultiplier = conf === 'HIGH' ? 0.1 : conf === 'MEDIUM' ? 0.5 : 1.0;
        const effectiveLR = this.learningRate * confMultiplier;
        
        // Gradient 근사: error * sign(coefficient)
        const gradient = err.errorRate * Math.sign(currentCoef);
        const adjustment = effectiveLR * gradient;
        
        const newCoef = currentCoef + adjustment;
        
        // 범위 제한
        const prior = ACADEMY_PRIOR_10x10[fromNode][toNode];
        const clampedCoef = prior 
          ? Math.max(prior.range[0], Math.min(prior.range[1], newCoef))
          : Math.max(-1, Math.min(1, newCoef));
        
        if (Math.abs(clampedCoef - currentCoef) > 0.001) {
          this.posterior.coefficients[fromNode][toNode] = clampedCoef;
          this.posterior.updateCount[fromNode][toNode]++;
          
          // 신뢰도 상향 (데이터로 검증됨)
          if (this.posterior.updateCount[fromNode][toNode] >= 10) {
            this.posterior.confidence[fromNode][toNode] = 'HIGH';
          } else if (this.posterior.updateCount[fromNode][toNode] >= 5) {
            this.posterior.confidence[fromNode][toNode] = 'MEDIUM';
          }
          
          adjustments.push({
            from: fromNode,
            to: toNode,
            oldValue: currentCoef,
            newValue: clampedCoef,
          });
        }
      }
    }
    
    // 3. MSE 계산
    const totalMSE = errors.reduce((sum, e) => sum + e.error ** 2, 0) / errors.length;
    
    this.posterior.lastUpdated = new Date();
    
    const result: LearningResult = {
      iteration: this.history.length + 1,
      timestamp: new Date(),
      predictions: predicted,
      actuals: actual,
      errors,
      totalMSE,
      adjustments,
    };
    
    this.history.push(result);
    
    return result;
  }
  
  /**
   * 배치 학습 (여러 관측값)
   */
  batchLearn(
    observations: Array<{ predicted: CoreState; actual: Partial<CoreState> }>
  ): LearningResult[] {
    return observations.map(obs => this.learn(obs.predicted, obs.actual));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 분석
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 예측 정확도 분석
   */
  analyzeAccuracy(): {
    overallMSE: number;
    byNode: Record<string, { mse: number; bias: number; count: number }>;
    trend: 'improving' | 'stable' | 'degrading';
  } {
    if (this.history.length === 0) {
      return {
        overallMSE: 0,
        byNode: {},
        trend: 'stable',
      };
    }
    
    // 노드별 오차 집계
    const byNode: Record<string, { errors: number[]; sum: number }> = {};
    for (const node of CORE_NODES) {
      byNode[node] = { errors: [], sum: 0 };
    }
    
    for (const result of this.history) {
      for (const err of result.errors) {
        byNode[err.node].errors.push(err.error);
        byNode[err.node].sum += err.error;
      }
    }
    
    // 분석 결과
    const analysis: Record<string, { mse: number; bias: number; count: number }> = {};
    for (const node of CORE_NODES) {
      const errs = byNode[node].errors;
      if (errs.length === 0) {
        analysis[node] = { mse: 0, bias: 0, count: 0 };
        continue;
      }
      
      const mse = errs.reduce((sum, e) => sum + e ** 2, 0) / errs.length;
      const bias = byNode[node].sum / errs.length;
      analysis[node] = { mse, bias, count: errs.length };
    }
    
    // 전체 MSE
    const overallMSE = this.history.reduce((sum, r) => sum + r.totalMSE, 0) / this.history.length;
    
    // 추세 분석 (최근 5개 vs 이전 5개)
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (this.history.length >= 10) {
      const recent = this.history.slice(-5);
      const previous = this.history.slice(-10, -5);
      
      const recentMSE = recent.reduce((sum, r) => sum + r.totalMSE, 0) / 5;
      const previousMSE = previous.reduce((sum, r) => sum + r.totalMSE, 0) / 5;
      
      if (recentMSE < previousMSE * 0.9) trend = 'improving';
      else if (recentMSE > previousMSE * 1.1) trend = 'degrading';
    }
    
    return { overallMSE, byNode: analysis, trend };
  }
  
  /**
   * Prior vs Posterior 비교
   */
  comparePriorPosterior(): Array<{
    from: string;
    to: string;
    prior: number;
    posterior: number;
    change: number;
    changePercent: number;
    confidence: ConfidenceLevel;
    updates: number;
  }> {
    const comparison = [];
    
    for (const from of CORE_NODES) {
      for (const to of CORE_NODES) {
        const priorCoef = ACADEMY_PRIOR_10x10[from][to];
        if (!priorCoef) continue;
        
        const priorValue = priorCoef.value;
        const posteriorValue = this.posterior.coefficients[from][to];
        const change = posteriorValue - priorValue;
        
        comparison.push({
          from,
          to,
          prior: priorValue,
          posterior: posteriorValue,
          change,
          changePercent: priorValue !== 0 ? (change / priorValue) * 100 : 0,
          confidence: this.posterior.confidence[from][to],
          updates: this.posterior.updateCount[from][to],
        });
      }
    }
    
    return comparison.filter(c => c.change !== 0);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Getter/Setter
  // ═══════════════════════════════════════════════════════════════════════════
  
  getPosterior(): PosteriorMatrix {
    return { ...this.posterior };
  }
  
  getHistory(): LearningResult[] {
    return [...this.history];
  }
  
  setLearningRate(rate: number): void {
    this.learningRate = Math.max(0.01, Math.min(1.0, rate));
  }
  
  /**
   * Posterior 리셋 (Prior로 복원)
   */
  reset(): void {
    this.posterior = this.initializePosterior();
    this.history = [];
    this.observations = [];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 시뮬레이션 with Learning
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 시뮬레이션 + 학습 루프
   */
  simulateWithLearning(
    initial: CoreState,
    actualHistory: Partial<CoreState>[],
    actions: ActionParams,
    external: ExternalParams
  ): {
    predictions: CoreState[];
    learningResults: LearningResult[];
    finalAccuracy: { overallMSE: number; byNode: Record<string, { mse: number; bias: number; count: number }>; trend: 'improving' | 'stable' | 'degrading' };
  } {
    const predictions: CoreState[] = [initial];
    const learningResults: LearningResult[] = [];
    
    let current = initial;
    
    for (const actual of actualHistory) {
      // 1. 예측
      const predicted = this.predict(current, actions, external);
      predictions.push(predicted);
      
      // 2. 학습
      const result = this.learn(predicted, actual);
      learningResults.push(result);
      
      // 3. 다음 상태로 이동 (실제 값 사용)
      current = { ...predicted, ...actual } as CoreState;
    }
    
    return {
      predictions,
      learningResults,
      finalAccuracy: this.analyzeAccuracy(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 예시: 12개월 학습 시뮬레이션
// ═══════════════════════════════════════════════════════════════════════════════

export const SAMPLE_12_MONTHS_ACTUAL: Partial<CoreState>[] = [
  // 1월 (겨울방학 끝)
  { n01: 24_000_000, n05: 50_000_000, n09: 125, n33: 0.77 },
  // 2월 (신학기 준비)
  { n01: 26_000_000, n05: 55_000_000, n09: 130, n33: 0.79 },
  // 3월 (피크)
  { n01: 32_000_000, n05: 62_000_000, n09: 142, n33: 0.82 },
  // 4월
  { n01: 35_000_000, n05: 60_000_000, n09: 140, n33: 0.81 },
  // 5월
  { n01: 36_000_000, n05: 58_000_000, n09: 138, n33: 0.80 },
  // 6월
  { n01: 34_000_000, n05: 54_000_000, n09: 132, n33: 0.78 },
  // 7월 (여름방학)
  { n01: 30_000_000, n05: 48_000_000, n09: 125, n33: 0.76 },
  // 8월
  { n01: 28_000_000, n05: 50_000_000, n09: 128, n33: 0.77 },
  // 9월 (2학기)
  { n01: 33_000_000, n05: 58_000_000, n09: 138, n33: 0.80 },
  // 10월
  { n01: 35_000_000, n05: 56_000_000, n09: 135, n33: 0.79 },
  // 11월
  { n01: 34_000_000, n05: 54_000_000, n09: 132, n33: 0.78 },
  // 12월 (겨울방학)
  { n01: 32_000_000, n05: 50_000_000, n09: 128, n33: 0.76 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export const bayesianLaplace = new BayesianLaplace();

console.log('🧠 Bayesian Laplace Engine Loaded');
console.log('  - Prior + Evidence = Posterior');
console.log('  - Learning Rate: 0.1 (default)');
console.log('  - Ready for Bayesian Updates');
