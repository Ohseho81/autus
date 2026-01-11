/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 72×72 학습 루프 (Learning Loop)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Prior + Evidence = Posterior
 * 
 * 학습 루프:
 * 1. 현재 상태 측정: X(t)
 * 2. 인과 행렬로 예측: X̂(t+1) = A × X(t)
 * 3. 실제 관측: X(t+1)
 * 4. 오차 계산: E = X(t+1) - X̂(t+1)
 * 5. 계수 조정: A' = A + η × E × X(t)ᵀ
 * 6. 반복
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  NODE_IDS,
  NODE_NAMES,
  CAUSAL_LINKS,
  CausalMatrix72,
  causalMatrix72,
  CausalLink,
  getEffects,
} from './CausalMatrix72';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface State72 {
  timestamp: Date;
  values: Record<string, number>;  // n01 ~ n72
}

export interface Prediction72 {
  timestamp: Date;
  predicted: Record<string, number>;
  actual?: Record<string, number>;
  errors?: Record<string, number>;
}

export interface LearningStep {
  step: number;
  timestamp: Date;
  
  // 상태
  previousState: State72;
  predictedState: Record<string, number>;
  actualState: Record<string, number>;
  
  // 오차
  errors: Record<string, number>;
  mse: number;
  mae: number;
  
  // 조정
  adjustments: Array<{
    from: string;
    to: string;
    oldCoef: number;
    newCoef: number;
    delta: number;
  }>;
}

export interface LearningConfig {
  learningRate: number;           // η (0.01 ~ 0.5)
  minConfidenceToAdjust: 'HIGH' | 'MEDIUM' | 'LOW';
  maxAdjustmentPerStep: number;   // 한 번에 최대 조정량
  momentumFactor: number;         // 이전 조정 반영 (0 ~ 0.9)
  regularization: number;         // L2 정규화 (0 ~ 0.1)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 기본 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  learningRate: 0.1,
  minConfidenceToAdjust: 'LOW',
  maxAdjustmentPerStep: 0.05,
  momentumFactor: 0.3,
  regularization: 0.01,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 학습 루프 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export class LearningLoop72 {
  private matrix: CausalMatrix72;
  private config: LearningConfig;
  private history: LearningStep[] = [];
  private momentum: Record<string, number> = {};
  
  constructor(
    matrix: CausalMatrix72 = causalMatrix72,
    config: Partial<LearningConfig> = {}
  ) {
    this.matrix = matrix;
    this.config = { ...DEFAULT_LEARNING_CONFIG, ...config };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 예측
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 다음 상태 예측: X̂(t+1) = f(X(t), A)
   */
  predict(currentState: State72): Record<string, number> {
    const predicted: Record<string, number> = {};
    const X = currentState.values;
    
    for (const nodeId of NODE_IDS) {
      // 자기 자신 (관성)
      const selfCoef = this.matrix.get(nodeId, nodeId);
      let value = (X[nodeId] || 0) * selfCoef;
      
      // 다른 노드로부터의 영향
      for (const link of CAUSAL_LINKS) {
        if (link.to === nodeId && link.from !== nodeId) {
          const fromValue = X[link.from] || 0;
          value += fromValue * link.coefficient;
        }
      }
      
      // 정규화 (음수 방지, 비율은 0~1)
      predicted[nodeId] = this.normalizeValue(nodeId, value);
    }
    
    return predicted;
  }
  
  /**
   * 값 정규화 (노드 타입에 따라)
   */
  private normalizeValue(nodeId: string, value: number): number {
    const idx = parseInt(nodeId.slice(1));
    
    // 비율 노드 (13-24: Flow, 25-36: Inertia, 49-60: Friction, 61-72: Gravity)
    if ((idx >= 13 && idx <= 36) || (idx >= 49 && idx <= 72)) {
      return Math.max(0, Math.min(1, value));
    }
    
    // 가속도 노드 (37-48: Acceleration)
    if (idx >= 37 && idx <= 48) {
      return Math.max(-1, Math.min(1, value));
    }
    
    // 절대값 노드 (01-12: Conservation) - 음수 가능 (변화량)
    return value;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 학습
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 단일 학습 스텝
   */
  learn(
    previousState: State72,
    actualState: State72
  ): LearningStep {
    const step = this.history.length + 1;
    
    // 1. 예측
    const predicted = this.predict(previousState);
    
    // 2. 오차 계산
    const errors: Record<string, number> = {};
    let sumSquaredError = 0;
    let sumAbsError = 0;
    let count = 0;
    
    for (const nodeId of NODE_IDS) {
      const pred = predicted[nodeId] || 0;
      const actual = actualState.values[nodeId];
      
      if (actual !== undefined) {
        const error = actual - pred;
        errors[nodeId] = error;
        sumSquaredError += error * error;
        sumAbsError += Math.abs(error);
        count++;
      }
    }
    
    const mse = count > 0 ? sumSquaredError / count : 0;
    const mae = count > 0 ? sumAbsError / count : 0;
    
    // 3. 계수 조정
    const adjustments = this.adjustCoefficients(
      previousState.values,
      errors
    );
    
    // 4. 기록
    const learningStep: LearningStep = {
      step,
      timestamp: new Date(),
      previousState,
      predictedState: predicted,
      actualState: actualState.values,
      errors,
      mse,
      mae,
      adjustments,
    };
    
    this.history.push(learningStep);
    
    return learningStep;
  }
  
  /**
   * 계수 조정 (Gradient Descent with Momentum)
   */
  private adjustCoefficients(
    X: Record<string, number>,
    errors: Record<string, number>
  ): LearningStep['adjustments'] {
    const adjustments: LearningStep['adjustments'] = [];
    const { learningRate, maxAdjustmentPerStep, momentumFactor, regularization } = this.config;
    
    for (const link of CAUSAL_LINKS) {
      // 신뢰도 체크
      if (!this.shouldAdjust(link)) continue;
      
      const error = errors[link.to];
      if (error === undefined) continue;
      
      const fromValue = X[link.from] || 0;
      if (fromValue === 0) continue;
      
      // Gradient: ∂E/∂w = -error × x
      const gradient = -error * fromValue;
      
      // Momentum
      const key = `${link.from}->${link.to}`;
      const prevMomentum = this.momentum[key] || 0;
      const momentum = momentumFactor * prevMomentum + (1 - momentumFactor) * gradient;
      this.momentum[key] = momentum;
      
      // L2 Regularization
      const reg = regularization * link.coefficient;
      
      // Delta
      let delta = learningRate * (momentum + reg);
      
      // Clamp
      delta = Math.max(-maxAdjustmentPerStep, Math.min(maxAdjustmentPerStep, delta));
      
      if (Math.abs(delta) > 0.001) {
        const oldCoef = link.coefficient;
        const newCoef = Math.max(-1, Math.min(1, oldCoef + delta));
        
        // 행렬 업데이트
        this.matrix.update(link.from, link.to, newCoef);
        
        adjustments.push({
          from: link.from,
          to: link.to,
          oldCoef,
          newCoef,
          delta: newCoef - oldCoef,
        });
      }
    }
    
    return adjustments;
  }
  
  /**
   * 조정 가능 여부 확인
   */
  private shouldAdjust(link: CausalLink): boolean {
    const { minConfidenceToAdjust } = this.config;
    const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    
    // HIGH 신뢰도는 조정 안 함 (회계 원칙)
    if (link.confidence === 'HIGH' && minConfidenceToAdjust !== 'HIGH') {
      return false;
    }
    
    return confidenceOrder[link.confidence] <= confidenceOrder[minConfidenceToAdjust];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 배치 학습
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 시계열 데이터로 배치 학습
   */
  batchLearn(states: State72[]): LearningStep[] {
    const results: LearningStep[] = [];
    
    for (let i = 0; i < states.length - 1; i++) {
      const step = this.learn(states[i], states[i + 1]);
      results.push(step);
    }
    
    return results;
  }
  
  /**
   * 에포크 학습 (여러 번 반복)
   */
  epochLearn(states: State72[], epochs: number = 10): {
    epochResults: Array<{ epoch: number; avgMse: number; avgMae: number }>;
    finalMse: number;
  } {
    const epochResults = [];
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      const steps = this.batchLearn(states);
      
      const avgMse = steps.reduce((sum, s) => sum + s.mse, 0) / steps.length;
      const avgMae = steps.reduce((sum, s) => sum + s.mae, 0) / steps.length;
      
      epochResults.push({ epoch: epoch + 1, avgMse, avgMae });
      
      // 조기 종료 (수렴)
      if (avgMse < 0.001) {
        console.log(`🎯 Early stopping at epoch ${epoch + 1} (MSE: ${avgMse.toFixed(6)})`);
        break;
      }
    }
    
    const finalMse = epochResults[epochResults.length - 1]?.avgMse || 0;
    
    return { epochResults, finalMse };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 분석
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 학습 진행 분석
   */
  analyzeProgress(): {
    totalSteps: number;
    mseTrend: number[];
    improvementRate: number;
    topAdjustedLinks: Array<{ link: string; totalDelta: number }>;
  } {
    if (this.history.length === 0) {
      return {
        totalSteps: 0,
        mseTrend: [],
        improvementRate: 0,
        topAdjustedLinks: [],
      };
    }
    
    // MSE 추세
    const mseTrend = this.history.map(h => h.mse);
    
    // 개선율
    const firstMse = mseTrend[0];
    const lastMse = mseTrend[mseTrend.length - 1];
    const improvementRate = firstMse > 0 ? (firstMse - lastMse) / firstMse : 0;
    
    // 가장 많이 조정된 연결
    const linkDelta: Record<string, number> = {};
    for (const step of this.history) {
      for (const adj of step.adjustments) {
        const key = `${adj.from}->${adj.to}`;
        linkDelta[key] = (linkDelta[key] || 0) + Math.abs(adj.delta);
      }
    }
    
    const topAdjustedLinks = Object.entries(linkDelta)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([link, totalDelta]) => ({ link, totalDelta }));
    
    return {
      totalSteps: this.history.length,
      mseTrend,
      improvementRate,
      topAdjustedLinks,
    };
  }
  
  /**
   * 예측 정확도 평가
   */
  evaluate(testStates: State72[]): {
    mse: number;
    mae: number;
    r2: number;
    nodeAccuracy: Record<string, { mse: number; mae: number }>;
  } {
    const allErrors: Record<string, number[]> = {};
    const allActuals: Record<string, number[]> = {};
    
    for (let i = 0; i < testStates.length - 1; i++) {
      const predicted = this.predict(testStates[i]);
      const actual = testStates[i + 1].values;
      
      for (const nodeId of NODE_IDS) {
        if (actual[nodeId] !== undefined) {
          if (!allErrors[nodeId]) allErrors[nodeId] = [];
          if (!allActuals[nodeId]) allActuals[nodeId] = [];
          
          allErrors[nodeId].push(actual[nodeId] - predicted[nodeId]);
          allActuals[nodeId].push(actual[nodeId]);
        }
      }
    }
    
    // 전체 MSE, MAE
    let totalSquaredError = 0;
    let totalAbsError = 0;
    let totalCount = 0;
    
    const nodeAccuracy: Record<string, { mse: number; mae: number }> = {};
    
    for (const [nodeId, errors] of Object.entries(allErrors)) {
      const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
      const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;
      
      nodeAccuracy[nodeId] = { mse, mae };
      
      totalSquaredError += errors.reduce((sum, e) => sum + e * e, 0);
      totalAbsError += errors.reduce((sum, e) => sum + Math.abs(e), 0);
      totalCount += errors.length;
    }
    
    const mse = totalCount > 0 ? totalSquaredError / totalCount : 0;
    const mae = totalCount > 0 ? totalAbsError / totalCount : 0;
    
    // R² 계산
    let ssTot = 0;
    let ssRes = 0;
    
    for (const [nodeId, actuals] of Object.entries(allActuals)) {
      const mean = actuals.reduce((sum, a) => sum + a, 0) / actuals.length;
      const errors = allErrors[nodeId];
      
      for (let i = 0; i < actuals.length; i++) {
        ssTot += (actuals[i] - mean) ** 2;
        ssRes += errors[i] ** 2;
      }
    }
    
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    
    return { mse, mae, r2, nodeAccuracy };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 유틸리티
  // ═══════════════════════════════════════════════════════════════════════════
  
  getHistory(): LearningStep[] {
    return [...this.history];
  }
  
  getConfig(): LearningConfig {
    return { ...this.config };
  }
  
  setConfig(config: Partial<LearningConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  reset(): void {
    this.history = [];
    this.momentum = {};
  }
  
  /**
   * 현재 행렬 상태 저장
   */
  exportMatrix(): Record<string, Record<string, number>> {
    const exported: Record<string, Record<string, number>> = {};
    
    for (const from of NODE_IDS) {
      exported[from] = {};
      for (const to of NODE_IDS) {
        const coef = this.matrix.get(from, to);
        if (coef !== 0) {
          exported[from][to] = coef;
        }
      }
    }
    
    return exported;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 데이터 (학원 12개월)
// ═══════════════════════════════════════════════════════════════════════════════

export const SAMPLE_ACADEMY_STATES: State72[] = [
  // 1월
  {
    timestamp: new Date('2025-01-01'),
    values: {
      n01: 23_000_000, n05: 52_000_000, n06: 41_000_000, n09: 127,
      n17: 0.98, n21: 0.05, n33: 0.78, n34: 0.75,
      n41: -0.03, n45: -0.01, n47: 0.15,
      n57: 45_000, n69: 0.35, n70: 0.38,
    },
  },
  // 2월
  {
    timestamp: new Date('2025-02-01'),
    values: {
      n01: 26_000_000, n05: 55_000_000, n06: 42_000_000, n09: 132,
      n17: 1.06, n21: 0.08, n33: 0.79, n34: 0.76,
      n41: 0.08, n45: 0.04, n47: 0.14,
      n57: 42_000, n69: 0.37, n70: 0.37,
    },
  },
  // 3월 (피크)
  {
    timestamp: new Date('2025-03-01'),
    values: {
      n01: 32_000_000, n05: 62_000_000, n06: 44_000_000, n09: 145,
      n17: 1.13, n21: 0.12, n33: 0.82, n34: 0.78,
      n41: 0.07, n45: 0.10, n47: 0.12,
      n57: 38_000, n69: 0.42, n70: 0.35,
    },
  },
  // 4월
  {
    timestamp: new Date('2025-04-01'),
    values: {
      n01: 38_000_000, n05: 60_000_000, n06: 45_000_000, n09: 142,
      n17: 0.97, n21: 0.06, n33: 0.81, n34: 0.77,
      n41: -0.16, n45: -0.02, n47: 0.13,
      n57: 40_000, n69: 0.40, n70: 0.36,
    },
  },
  // 5월
  {
    timestamp: new Date('2025-05-01'),
    values: {
      n01: 41_000_000, n05: 58_000_000, n06: 44_000_000, n09: 140,
      n17: 0.97, n21: 0.05, n33: 0.80, n34: 0.76,
      n41: 0.00, n45: -0.01, n47: 0.14,
      n57: 43_000, n69: 0.38, n70: 0.37,
    },
  },
  // 6월
  {
    timestamp: new Date('2025-06-01'),
    values: {
      n01: 43_000_000, n05: 55_000_000, n06: 43_000_000, n09: 135,
      n17: 0.95, n21: 0.04, n33: 0.78, n34: 0.75,
      n41: -0.02, n45: -0.04, n47: 0.15,
      n57: 46_000, n69: 0.36, n70: 0.38,
    },
  },
  // 7월 (방학)
  {
    timestamp: new Date('2025-07-01'),
    values: {
      n01: 40_000_000, n05: 48_000_000, n06: 40_000_000, n09: 128,
      n17: 0.87, n21: 0.03, n33: 0.76, n34: 0.74,
      n41: -0.08, n45: -0.05, n47: 0.16,
      n57: 52_000, n69: 0.33, n70: 0.40,
    },
  },
  // 8월
  {
    timestamp: new Date('2025-08-01'),
    values: {
      n01: 38_000_000, n05: 50_000_000, n06: 41_000_000, n09: 130,
      n17: 1.04, n21: 0.04, n33: 0.77, n34: 0.75,
      n41: 0.17, n45: 0.02, n47: 0.15,
      n57: 48_000, n69: 0.35, n70: 0.39,
    },
  },
  // 9월 (2학기)
  {
    timestamp: new Date('2025-09-01'),
    values: {
      n01: 42_000_000, n05: 58_000_000, n06: 43_000_000, n09: 140,
      n17: 1.16, n21: 0.09, n33: 0.80, n34: 0.77,
      n41: 0.12, n45: 0.08, n47: 0.13,
      n57: 42_000, n69: 0.38, n70: 0.36,
    },
  },
  // 10월
  {
    timestamp: new Date('2025-10-01'),
    values: {
      n01: 46_000_000, n05: 56_000_000, n06: 43_000_000, n09: 138,
      n17: 0.97, n21: 0.05, n33: 0.79, n34: 0.76,
      n41: -0.19, n45: -0.01, n47: 0.14,
      n57: 44_000, n69: 0.37, n70: 0.37,
    },
  },
  // 11월
  {
    timestamp: new Date('2025-11-01'),
    values: {
      n01: 48_000_000, n05: 54_000_000, n06: 42_000_000, n09: 135,
      n17: 0.96, n21: 0.04, n33: 0.78, n34: 0.75,
      n41: -0.01, n45: -0.02, n47: 0.15,
      n57: 46_000, n69: 0.35, n70: 0.38,
    },
  },
  // 12월
  {
    timestamp: new Date('2025-12-01'),
    values: {
      n01: 45_000_000, n05: 50_000_000, n06: 41_000_000, n09: 130,
      n17: 0.93, n21: 0.03, n33: 0.76, n34: 0.74,
      n41: -0.03, n45: -0.04, n47: 0.16,
      n57: 50_000, n69: 0.33, n70: 0.40,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export const learningLoop72 = new LearningLoop72();

console.log('🔄 Learning Loop 72×72 Loaded');
console.log('  - Gradient Descent with Momentum');
console.log('  - L2 Regularization');
console.log('  - Ready for Training');
