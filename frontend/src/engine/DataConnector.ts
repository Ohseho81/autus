/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 데이터 연결 (Supabase)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 실제 데이터 수집 → 학습 루프 → 결과 저장
 * 
 * 테이블:
 * - node_snapshots: 72개 노드의 시점별 스냅샷
 * - learning_history: 학습 히스토리
 * - causal_coefficients: 학습된 계수
 * - predictions: 예측 기록
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { State72, LearningStep, LearningLoop72 } from './LearningLoop72';
import { NODE_IDS } from './CausalMatrix72';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface NodeSnapshot {
  id?: string;
  entity_id: string;
  entity_type: 'ACADEMY' | 'RETAIL' | 'FREELANCER' | 'GENERAL';
  timestamp: string;
  period: string;  // '2025-01' 형식
  values: Record<string, number>;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface LearningRecord {
  id?: string;
  entity_id: string;
  step: number;
  timestamp: string;
  mse: number;
  mae: number;
  adjustments_count: number;
  adjustments: any[];
  created_at?: string;
}

export interface CoefficientRecord {
  id?: string;
  entity_id: string;
  from_node: string;
  to_node: string;
  prior_value: number;
  current_value: number;
  total_adjustment: number;
  adjustment_count: number;
  last_updated: string;
}

export interface PredictionRecord {
  id?: string;
  entity_id: string;
  prediction_date: string;
  target_period: string;
  predicted_values: Record<string, number>;
  actual_values?: Record<string, number>;
  mse?: number;
  verified: boolean;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 데이터 연결 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export class DataConnector {
  private supabaseUrl: string;
  private supabaseKey: string;
  private entityId: string;
  private entityType: NodeSnapshot['entity_type'];
  
  constructor(
    config: SupabaseConfig,
    entityId: string,
    entityType: NodeSnapshot['entity_type'] = 'ACADEMY'
  ) {
    this.supabaseUrl = config.url;
    this.supabaseKey = config.anonKey;
    this.entityId = entityId;
    this.entityType = entityType;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HTTP Helper
  // ═══════════════════════════════════════════════════════════════════════════
  
  private async fetch<T>(
    table: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
    query?: string
  ): Promise<T> {
    const url = `${this.supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase Error: ${response.status} - ${error}`);
    }
    
    if (method === 'DELETE' || (method === 'PATCH' && response.status === 204)) {
      return {} as T;
    }
    
    return response.json();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Node Snapshots
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 스냅샷 저장
   */
  async saveSnapshot(state: State72, period: string): Promise<NodeSnapshot> {
    const snapshot: NodeSnapshot = {
      entity_id: this.entityId,
      entity_type: this.entityType,
      timestamp: state.timestamp.toISOString(),
      period,
      values: state.values,
    };
    
    const result = await this.fetch<NodeSnapshot[]>(
      'node_snapshots',
      'POST',
      snapshot
    );
    
    return result[0];
  }
  
  /**
   * 스냅샷 조회 (기간별)
   */
  async getSnapshots(
    startPeriod?: string,
    endPeriod?: string
  ): Promise<NodeSnapshot[]> {
    let query = `entity_id=eq.${this.entityId}&order=timestamp.asc`;
    
    if (startPeriod) {
      query += `&period=gte.${startPeriod}`;
    }
    if (endPeriod) {
      query += `&period=lte.${endPeriod}`;
    }
    
    return this.fetch<NodeSnapshot[]>('node_snapshots', 'GET', undefined, query);
  }
  
  /**
   * 최신 스냅샷
   */
  async getLatestSnapshot(): Promise<NodeSnapshot | null> {
    const query = `entity_id=eq.${this.entityId}&order=timestamp.desc&limit=1`;
    const result = await this.fetch<NodeSnapshot[]>('node_snapshots', 'GET', undefined, query);
    return result[0] || null;
  }
  
  /**
   * 스냅샷을 State72로 변환
   */
  snapshotToState(snapshot: NodeSnapshot): State72 {
    return {
      timestamp: new Date(snapshot.timestamp),
      values: snapshot.values,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Learning History
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 학습 스텝 저장
   */
  async saveLearningStep(step: LearningStep): Promise<LearningRecord> {
    const record: LearningRecord = {
      entity_id: this.entityId,
      step: step.step,
      timestamp: step.timestamp.toISOString(),
      mse: step.mse,
      mae: step.mae,
      adjustments_count: step.adjustments.length,
      adjustments: step.adjustments,
    };
    
    const result = await this.fetch<LearningRecord[]>(
      'learning_history',
      'POST',
      record
    );
    
    return result[0];
  }
  
  /**
   * 학습 히스토리 조회
   */
  async getLearningHistory(limit: number = 100): Promise<LearningRecord[]> {
    const query = `entity_id=eq.${this.entityId}&order=step.desc&limit=${limit}`;
    return this.fetch<LearningRecord[]>('learning_history', 'GET', undefined, query);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Causal Coefficients
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 계수 저장/업데이트
   */
  async saveCoefficient(
    fromNode: string,
    toNode: string,
    priorValue: number,
    currentValue: number
  ): Promise<CoefficientRecord> {
    // Upsert 로직
    const existing = await this.getCoefficient(fromNode, toNode);
    
    if (existing) {
      const updated: Partial<CoefficientRecord> = {
        current_value: currentValue,
        total_adjustment: existing.total_adjustment + Math.abs(currentValue - existing.current_value),
        adjustment_count: existing.adjustment_count + 1,
        last_updated: new Date().toISOString(),
      };
      
      await this.fetch(
        'causal_coefficients',
        'PATCH',
        updated,
        `id=eq.${existing.id}`
      );
      
      return { ...existing, ...updated };
    }
    
    const record: CoefficientRecord = {
      entity_id: this.entityId,
      from_node: fromNode,
      to_node: toNode,
      prior_value: priorValue,
      current_value: currentValue,
      total_adjustment: Math.abs(currentValue - priorValue),
      adjustment_count: 1,
      last_updated: new Date().toISOString(),
    };
    
    const result = await this.fetch<CoefficientRecord[]>(
      'causal_coefficients',
      'POST',
      record
    );
    
    return result[0];
  }
  
  /**
   * 특정 계수 조회
   */
  async getCoefficient(fromNode: string, toNode: string): Promise<CoefficientRecord | null> {
    const query = `entity_id=eq.${this.entityId}&from_node=eq.${fromNode}&to_node=eq.${toNode}`;
    const result = await this.fetch<CoefficientRecord[]>('causal_coefficients', 'GET', undefined, query);
    return result[0] || null;
  }
  
  /**
   * 모든 학습된 계수 조회
   */
  async getAllCoefficients(): Promise<CoefficientRecord[]> {
    const query = `entity_id=eq.${this.entityId}`;
    return this.fetch<CoefficientRecord[]>('causal_coefficients', 'GET', undefined, query);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Predictions
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 예측 저장
   */
  async savePrediction(
    targetPeriod: string,
    predictedValues: Record<string, number>
  ): Promise<PredictionRecord> {
    const record: PredictionRecord = {
      entity_id: this.entityId,
      prediction_date: new Date().toISOString(),
      target_period: targetPeriod,
      predicted_values: predictedValues,
      verified: false,
    };
    
    const result = await this.fetch<PredictionRecord[]>(
      'predictions',
      'POST',
      record
    );
    
    return result[0];
  }
  
  /**
   * 예측 검증 (실제값과 비교)
   */
  async verifyPrediction(
    predictionId: string,
    actualValues: Record<string, number>
  ): Promise<PredictionRecord> {
    // 기존 예측 조회
    const query = `id=eq.${predictionId}`;
    const existing = await this.fetch<PredictionRecord[]>('predictions', 'GET', undefined, query);
    
    if (!existing[0]) {
      throw new Error(`Prediction not found: ${predictionId}`);
    }
    
    // MSE 계산
    const predicted = existing[0].predicted_values;
    let sumSquaredError = 0;
    let count = 0;
    
    for (const nodeId of NODE_IDS) {
      if (predicted[nodeId] !== undefined && actualValues[nodeId] !== undefined) {
        const error = actualValues[nodeId] - predicted[nodeId];
        sumSquaredError += error * error;
        count++;
      }
    }
    
    const mse = count > 0 ? sumSquaredError / count : 0;
    
    // 업데이트
    const updated: Partial<PredictionRecord> = {
      actual_values: actualValues,
      mse,
      verified: true,
    };
    
    await this.fetch('predictions', 'PATCH', updated, query);
    
    return { ...existing[0], ...updated };
  }
  
  /**
   * 검증된 예측 조회 (학습 데이터로 사용)
   */
  async getVerifiedPredictions(): Promise<PredictionRecord[]> {
    const query = `entity_id=eq.${this.entityId}&verified=eq.true&order=target_period.asc`;
    return this.fetch<PredictionRecord[]>('predictions', 'GET', undefined, query);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 통합 학습 워크플로우
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 전체 학습 루프 실행
   */
  async runLearningLoop(
    learningLoop: LearningLoop72,
    newState?: State72
  ): Promise<{
    snapshotsSaved: number;
    learningSteps: number;
    finalMse: number;
  }> {
    // 1. 기존 스냅샷 로드
    const snapshots = await this.getSnapshots();
    const states = snapshots.map(s => this.snapshotToState(s));
    
    // 2. 새 상태 추가
    if (newState) {
      states.push(newState);
      await this.saveSnapshot(newState, this.getPeriod(newState.timestamp));
    }
    
    // 3. 학습 실행
    if (states.length < 2) {
      return { snapshotsSaved: states.length, learningSteps: 0, finalMse: 0 };
    }
    
    const steps = learningLoop.batchLearn(states);
    
    // 4. 학습 결과 저장
    for (const step of steps) {
      await this.saveLearningStep(step);
      
      // 조정된 계수 저장
      for (const adj of step.adjustments) {
        await this.saveCoefficient(
          adj.from,
          adj.to,
          adj.oldCoef,
          adj.newCoef
        );
      }
    }
    
    const finalMse = steps[steps.length - 1]?.mse || 0;
    
    return {
      snapshotsSaved: states.length,
      learningSteps: steps.length,
      finalMse,
    };
  }
  
  /**
   * 다음 기간 예측 및 저장
   */
  async predictAndSave(
    learningLoop: LearningLoop72,
    targetPeriod: string
  ): Promise<PredictionRecord> {
    const latest = await this.getLatestSnapshot();
    
    if (!latest) {
      throw new Error('No snapshot data available');
    }
    
    const currentState = this.snapshotToState(latest);
    const predicted = learningLoop.predict(currentState);
    
    return this.savePrediction(targetPeriod, predicted);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 유틸리티
  // ═══════════════════════════════════════════════════════════════════════════
  
  private getPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  
  /**
   * 학습 상태 요약
   */
  async getSummary(): Promise<{
    snapshotCount: number;
    learningStepCount: number;
    coefficientCount: number;
    predictionCount: number;
    latestMse: number;
    averageMse: number;
  }> {
    const [snapshots, history, coefficients, predictions] = await Promise.all([
      this.getSnapshots(),
      this.getLearningHistory(100),
      this.getAllCoefficients(),
      this.getVerifiedPredictions(),
    ]);
    
    const latestMse = history[0]?.mse || 0;
    const averageMse = history.length > 0
      ? history.reduce((sum, h) => sum + h.mse, 0) / history.length
      : 0;
    
    return {
      snapshotCount: snapshots.length,
      learningStepCount: history.length,
      coefficientCount: coefficients.length,
      predictionCount: predictions.length,
      latestMse,
      averageMse,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SQL 스키마 (Supabase에서 실행)
// ═══════════════════════════════════════════════════════════════════════════════

export const SUPABASE_SCHEMA = `
-- 노드 스냅샷
CREATE TABLE IF NOT EXISTS node_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ACADEMY', 'RETAIL', 'FREELANCER', 'GENERAL')),
  timestamp TIMESTAMPTZ NOT NULL,
  period TEXT NOT NULL,
  values JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_snapshots_entity ON node_snapshots(entity_id, timestamp);
CREATE INDEX idx_snapshots_period ON node_snapshots(period);

-- 학습 히스토리
CREATE TABLE IF NOT EXISTS learning_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  mse DECIMAL(10,8) NOT NULL,
  mae DECIMAL(10,8) NOT NULL,
  adjustments_count INTEGER NOT NULL,
  adjustments JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_learning_entity ON learning_history(entity_id, step);

-- 인과 계수
CREATE TABLE IF NOT EXISTS causal_coefficients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id TEXT NOT NULL,
  from_node TEXT NOT NULL,
  to_node TEXT NOT NULL,
  prior_value DECIMAL(10,6) NOT NULL,
  current_value DECIMAL(10,6) NOT NULL,
  total_adjustment DECIMAL(10,6) NOT NULL,
  adjustment_count INTEGER NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL,
  UNIQUE(entity_id, from_node, to_node)
);

CREATE INDEX idx_coef_entity ON causal_coefficients(entity_id);

-- 예측
CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id TEXT NOT NULL,
  prediction_date TIMESTAMPTZ NOT NULL,
  target_period TEXT NOT NULL,
  predicted_values JSONB NOT NULL,
  actual_values JSONB,
  mse DECIMAL(10,8),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pred_entity ON predictions(entity_id, target_period);
CREATE INDEX idx_pred_verified ON predictions(verified) WHERE verified = true;

-- RLS 정책 (선택사항)
ALTER TABLE node_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_coefficients ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
`;

console.log('📊 Data Connector Loaded');
console.log('  - Supabase Integration');
console.log('  - Learning History Storage');
