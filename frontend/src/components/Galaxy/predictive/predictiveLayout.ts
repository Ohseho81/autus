// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - 예측형 레이아웃 시스템 (Predictive Layout)
// ═══════════════════════════════════════════════════════════════════════════════
//
// 사용자가 조작하기 전에 시스템이 먼저 반응
// - K·I·Ω 변화 추이 예측
// - 선제적 UI 경고
// - 자동 레이아웃 재배치
// - 갈등 관계 조기 감지
//
// ═══════════════════════════════════════════════════════════════════════════════

import { Vector3 } from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetricHistory {
  timestamp: number;
  k: number;
  i: number;
  omega: number;
  r: number;
}

export interface NodePrediction {
  nodeId: string;
  currentK: number;
  currentI: number;
  currentOmega: number;
  
  predictedK: number;
  predictedI: number;
  predictedOmega: number;
  
  kTrend: 'rising' | 'stable' | 'falling';
  iTrend: 'rising' | 'stable' | 'falling';
  omegaTrend: 'rising' | 'stable' | 'falling';
  
  confidence: number;       // 예측 신뢰도 (0-1)
  timeHorizon: number;      // 예측 시간 (ms)
  
  alerts: PredictiveAlert[];
}

export interface PredictiveAlert {
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  affectedNodeIds: string[];
  suggestedAction?: string;
  expiresAt: number;
}

export type AlertType = 
  | 'conflict_predicted'      // 갈등 예측 (I 하락)
  | 'efficiency_drop'         // 효율 하락 (K 하락)
  | 'entropy_spike'          // 엔트로피 급등 (Ω 상승)
  | 'extinction_imminent'     // 소멸 임박 (K < 0.3)
  | 'overload_warning'        // 과부하 경고 (동시 긴급 업무)
  | 'synergy_opportunity'     // 시너지 기회 (I 상승)
  | 'growth_acceleration';    // 성장 가속 (r 상승)

export interface LayoutRecommendation {
  nodeId: string;
  currentPosition: Vector3;
  recommendedPosition: Vector3;
  priority: number;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 예측 엔진
// ═══════════════════════════════════════════════════════════════════════════════

export class PredictiveEngine {
  private historySize: number = 100;
  private predictionHorizon: number = 60000; // 1분 후 예측
  private nodeHistories: Map<string, MetricHistory[]> = new Map();
  private alerts: PredictiveAlert[] = [];
  private alertListeners: ((alert: PredictiveAlert) => void)[] = [];
  
  constructor(
    private config: {
      conflictThreshold: number;    // I 갈등 임계값
      efficiencyDropThreshold: number; // K 하락 임계값
      entropyThreshold: number;     // Ω 경고 임계값
      extinctionThreshold: number;  // K 소멸 임계값
    } = {
      conflictThreshold: -0.2,
      efficiencyDropThreshold: 0.5,
      entropyThreshold: 0.7,
      extinctionThreshold: 0.3,
    }
  ) {}
  
  /**
   * 메트릭 히스토리 기록
   */
  recordMetrics(nodeId: string, metrics: Omit<MetricHistory, 'timestamp'>): void {
    const history = this.nodeHistories.get(nodeId) || [];
    
    history.push({
      ...metrics,
      timestamp: Date.now(),
    });
    
    // 히스토리 크기 제한
    if (history.length > this.historySize) {
      history.shift();
    }
    
    this.nodeHistories.set(nodeId, history);
    
    // 즉시 예측 실행
    this.analyzeNode(nodeId);
  }
  
  /**
   * 단일 노드 분석 및 예측
   */
  private analyzeNode(nodeId: string): NodePrediction | null {
    const history = this.nodeHistories.get(nodeId);
    if (!history || history.length < 5) return null;
    
    // 최근 데이터
    const recent = history.slice(-10);
    const current = recent[recent.length - 1];
    
    // 추세 계산 (선형 회귀 간소화)
    const kTrend = this.calculateTrend(recent.map(h => h.k));
    const iTrend = this.calculateTrend(recent.map(h => h.i));
    const omegaTrend = this.calculateTrend(recent.map(h => h.omega));
    
    // 미래 값 예측
    const predictedK = this.extrapolate(recent.map(h => h.k), 10);
    const predictedI = this.extrapolate(recent.map(h => h.i), 10);
    const predictedOmega = this.extrapolate(recent.map(h => h.omega), 10);
    
    // 경고 생성
    const alerts = this.generateAlerts(nodeId, {
      current,
      predicted: { k: predictedK, i: predictedI, omega: predictedOmega },
      trends: { k: kTrend, i: iTrend, omega: omegaTrend },
    });
    
    return {
      nodeId,
      currentK: current.k,
      currentI: current.i,
      currentOmega: current.omega,
      predictedK,
      predictedI,
      predictedOmega,
      kTrend,
      iTrend,
      omegaTrend,
      confidence: Math.min(0.9, history.length / this.historySize),
      timeHorizon: this.predictionHorizon,
      alerts,
    };
  }
  
  /**
   * 추세 계산
   */
  private calculateTrend(values: number[]): 'rising' | 'stable' | 'falling' {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 0.05) return 'rising';
    if (diff < -0.05) return 'falling';
    return 'stable';
  }
  
  /**
   * 미래 값 외삽
   */
  private extrapolate(values: number[], steps: number): number {
    if (values.length < 2) return values[values.length - 1] || 0;
    
    // 단순 선형 외삽
    const n = values.length;
    const lastValue = values[n - 1];
    const prevValue = values[n - 2];
    const slope = lastValue - prevValue;
    
    return lastValue + slope * steps * 0.1;
  }
  
  /**
   * 경고 생성
   */
  private generateAlerts(
    nodeId: string,
    data: {
      current: MetricHistory;
      predicted: { k: number; i: number; omega: number };
      trends: { k: string; i: string; omega: string };
    }
  ): PredictiveAlert[] {
    const alerts: PredictiveAlert[] = [];
    const now = Date.now();
    
    // 1. 갈등 예측 (I 하락)
    if (data.predicted.i < this.config.conflictThreshold && data.trends.i === 'falling') {
      alerts.push({
        type: 'conflict_predicted',
        severity: data.predicted.i < -0.5 ? 'critical' : 'warning',
        message: `노드 ${nodeId}: 협업 지수(I) 하락 예측 (${data.current.i.toFixed(2)} → ${data.predicted.i.toFixed(2)})`,
        affectedNodeIds: [nodeId],
        suggestedAction: '관련 팀과 커뮤니케이션 점검 필요',
        expiresAt: now + this.predictionHorizon,
      });
    }
    
    // 2. 효율 하락 (K 하락)
    if (data.predicted.k < this.config.efficiencyDropThreshold && data.trends.k === 'falling') {
      alerts.push({
        type: 'efficiency_drop',
        severity: data.predicted.k < 0.3 ? 'critical' : 'warning',
        message: `노드 ${nodeId}: 효율성(K) 급락 예측 (${data.current.k.toFixed(2)} → ${data.predicted.k.toFixed(2)})`,
        affectedNodeIds: [nodeId],
        suggestedAction: '업무 프로세스 점검 또는 자동화 검토',
        expiresAt: now + this.predictionHorizon,
      });
    }
    
    // 3. 엔트로피 급등 (Ω 상승)
    if (data.predicted.omega > this.config.entropyThreshold && data.trends.omega === 'rising') {
      alerts.push({
        type: 'entropy_spike',
        severity: data.predicted.omega > 0.85 ? 'critical' : 'warning',
        message: `노드 ${nodeId}: 엔트로피(Ω) 급등 예측 (${data.current.omega.toFixed(2)} → ${data.predicted.omega.toFixed(2)})`,
        affectedNodeIds: [nodeId],
        suggestedAction: '휴식 권고 또는 업무 재분배',
        expiresAt: now + this.predictionHorizon,
      });
    }
    
    // 4. 소멸 임박
    if (data.predicted.k < this.config.extinctionThreshold) {
      alerts.push({
        type: 'extinction_imminent',
        severity: 'critical',
        message: `⚠️ 노드 ${nodeId}: 자연 소멸 임박 (K=${data.predicted.k.toFixed(2)})`,
        affectedNodeIds: [nodeId],
        suggestedAction: '업무 통폐합 또는 자동화 전환 검토',
        expiresAt: now + this.predictionHorizon,
      });
    }
    
    // 5. 시너지 기회 (I 상승)
    if (data.predicted.i > 0.7 && data.trends.i === 'rising') {
      alerts.push({
        type: 'synergy_opportunity',
        severity: 'info',
        message: `✨ 노드 ${nodeId}: 시너지 기회 감지 (I=${data.predicted.i.toFixed(2)})`,
        affectedNodeIds: [nodeId],
        suggestedAction: '협업 확대 권장',
        expiresAt: now + this.predictionHorizon,
      });
    }
    
    // 리스너에 알림
    alerts.forEach(alert => {
      this.alerts.push(alert);
      this.alertListeners.forEach(listener => listener(alert));
    });
    
    return alerts;
  }
  
  /**
   * 경고 리스너 등록
   */
  onAlert(listener: (alert: PredictiveAlert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      const idx = this.alertListeners.indexOf(listener);
      if (idx >= 0) this.alertListeners.splice(idx, 1);
    };
  }
  
  /**
   * 활성 경고 조회
   */
  getActiveAlerts(): PredictiveAlert[] {
    const now = Date.now();
    this.alerts = this.alerts.filter(a => a.expiresAt > now);
    return this.alerts;
  }
  
  /**
   * 특정 노드 경고 조회
   */
  getAlertsForNode(nodeId: string): PredictiveAlert[] {
    return this.getActiveAlerts().filter(a => a.affectedNodeIds.includes(nodeId));
  }
  
  /**
   * 전체 노드 예측 실행
   */
  analyzeAll(): Map<string, NodePrediction> {
    const predictions = new Map<string, NodePrediction>();
    
    for (const nodeId of this.nodeHistories.keys()) {
      const prediction = this.analyzeNode(nodeId);
      if (prediction) {
        predictions.set(nodeId, prediction);
      }
    }
    
    return predictions;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 레이아웃 추천 시스템
// ═══════════════════════════════════════════════════════════════════════════════

export class LayoutRecommender {
  constructor(private predictiveEngine: PredictiveEngine) {}
  
  /**
   * 노드 위치 재배치 추천
   */
  getRecommendations(
    nodes: { id: string; position: Vector3; k: number; i: number; omega: number }[]
  ): LayoutRecommendation[] {
    const recommendations: LayoutRecommendation[] = [];
    const predictions = this.predictiveEngine.analyzeAll();
    
    for (const node of nodes) {
      const prediction = predictions.get(node.id);
      if (!prediction) continue;
      
      // 위치 조정이 필요한 경우
      let recommendedPosition = node.position.clone();
      let priority = 0;
      let reason = '';
      
      // 1. 갈등 예측 → 중심에서 멀리
      if (prediction.iTrend === 'falling' && prediction.predictedI < 0) {
        const distance = node.position.length();
        recommendedPosition = node.position.clone().normalize().multiplyScalar(distance * 1.3);
        priority = 3;
        reason = '갈등 예측: 다른 노드들과 거리 두기';
      }
      
      // 2. 효율 하락 → 가장자리로
      if (prediction.kTrend === 'falling' && prediction.predictedK < 1.0) {
        recommendedPosition.multiplyScalar(1.2);
        priority = Math.max(priority, 2);
        reason = reason || '효율 하락: 가장자리로 이동';
      }
      
      // 3. 소멸 임박 → 암흑 물질 영역
      if (prediction.predictedK < 0.3) {
        recommendedPosition.multiplyScalar(1.5);
        recommendedPosition.y -= 3; // 아래로
        priority = Math.max(priority, 4);
        reason = '소멸 임박: 암흑 물질 영역으로 이동';
      }
      
      // 4. 시너지 기회 → 중심 가까이
      if (prediction.iTrend === 'rising' && prediction.predictedI > 0.5) {
        recommendedPosition.multiplyScalar(0.8);
        priority = Math.max(priority, 1);
        reason = reason || '시너지 기회: 중심 가까이 배치';
      }
      
      if (priority > 0) {
        recommendations.push({
          nodeId: node.id,
          currentPosition: node.position,
          recommendedPosition,
          priority,
          reason,
        });
      }
    }
    
    // 우선순위 정렬
    return recommendations.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * 클러스터 병합 추천
   */
  getMergeRecommendations(
    nodes: { id: string; clusterId: string; urgency: number }[]
  ): { sourceCluster: string; targetCluster: string; reason: string }[] {
    const clusterUrgencies = new Map<string, number[]>();
    
    for (const node of nodes) {
      const urgencies = clusterUrgencies.get(node.clusterId) || [];
      urgencies.push(node.urgency);
      clusterUrgencies.set(node.clusterId, urgencies);
    }
    
    const recommendations: { sourceCluster: string; targetCluster: string; reason: string }[] = [];
    
    // 높은 긴급도 클러스터 찾기
    const highUrgencyClusters: string[] = [];
    for (const [clusterId, urgencies] of clusterUrgencies) {
      const avgUrgency = urgencies.reduce((a, b) => a + b, 0) / urgencies.length;
      if (avgUrgency > 0.7) {
        highUrgencyClusters.push(clusterId);
      }
    }
    
    // 2개 이상이면 병합 추천
    if (highUrgencyClusters.length >= 2) {
      for (let i = 1; i < highUrgencyClusters.length; i++) {
        recommendations.push({
          sourceCluster: highUrgencyClusters[i],
          targetCluster: highUrgencyClusters[0],
          reason: '동시 마감 충돌: 라그랑주 점으로 병합 권장',
        });
      }
    }
    
    return recommendations;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 선제적 UI 반응 시스템
// ═══════════════════════════════════════════════════════════════════════════════

export interface UIReaction {
  type: 'color_change' | 'scale_change' | 'glow_pulse' | 'shake' | 'fade' | 'highlight';
  nodeIds: string[];
  params: Record<string, number | string>;
  duration: number;
}

export class PreemptiveUISystem {
  private reactions: UIReaction[] = [];
  
  constructor(
    private predictiveEngine: PredictiveEngine,
    private onReaction: (reaction: UIReaction) => void
  ) {
    // 경고 발생 시 자동 반응
    this.predictiveEngine.onAlert((alert) => {
      this.triggerReaction(alert);
    });
  }
  
  /**
   * 경고에 따른 UI 반응 트리거
   */
  private triggerReaction(alert: PredictiveAlert): void {
    let reaction: UIReaction;
    
    switch (alert.type) {
      case 'conflict_predicted':
        reaction = {
          type: 'color_change',
          nodeIds: alert.affectedNodeIds,
          params: {
            fromColor: '#4488ff',
            toColor: '#ff4444',
            pulseSpeed: alert.severity === 'critical' ? 3 : 1,
          },
          duration: 5000,
        };
        break;
      
      case 'efficiency_drop':
        reaction = {
          type: 'fade',
          nodeIds: alert.affectedNodeIds,
          params: {
            targetOpacity: alert.severity === 'critical' ? 0.3 : 0.6,
          },
          duration: 3000,
        };
        break;
      
      case 'entropy_spike':
        reaction = {
          type: 'shake',
          nodeIds: alert.affectedNodeIds,
          params: {
            intensity: alert.severity === 'critical' ? 0.3 : 0.1,
            frequency: 5,
          },
          duration: 2000,
        };
        break;
      
      case 'extinction_imminent':
        reaction = {
          type: 'glow_pulse',
          nodeIds: alert.affectedNodeIds,
          params: {
            color: '#ff0000',
            intensity: 20,
            speed: 5,
          },
          duration: 10000,
        };
        break;
      
      case 'synergy_opportunity':
        reaction = {
          type: 'highlight',
          nodeIds: alert.affectedNodeIds,
          params: {
            color: '#00ff88',
            intensity: 15,
          },
          duration: 5000,
        };
        break;
      
      default:
        return;
    }
    
    this.reactions.push(reaction);
    this.onReaction(reaction);
  }
  
  /**
   * 활성 반응 조회
   */
  getActiveReactions(): UIReaction[] {
    return this.reactions;
  }
  
  /**
   * 반응 완료 처리
   */
  completeReaction(reaction: UIReaction): void {
    const idx = this.reactions.indexOf(reaction);
    if (idx >= 0) {
      this.reactions.splice(idx, 1);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 내보내기
// ═══════════════════════════════════════════════════════════════════════════════

export default PredictiveEngine;
