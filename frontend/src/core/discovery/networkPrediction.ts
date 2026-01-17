// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Discovery System - 네트워크 예측
// ═══════════════════════════════════════════════════════════════════════════════
//
// 5. 개체 네트워크 해석에 따른 미래 예측
//
// ═══════════════════════════════════════════════════════════════════════════════

import { UserType, GrowthConstantR, InteractionConstantI, EntropyConstantOmega } from './constants';

// ═══════════════════════════════════════════════════════════════════════════════
// 네트워크 구조 정의
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 네트워크 노드 (개체)
 */
export interface NetworkNode {
  id: string;
  
  /** 개체 타입 */
  entityType: 'user' | 'task' | 'resource' | 'organization' | 'external';
  
  /** 사용자 타입 (entityType이 user인 경우) */
  userType?: UserType;
  
  /** K·I·Ω·r 값 */
  metrics: {
    K: number;
    I: number;
    Omega: number;
    r: number;
  };
  
  /** 노드 질량 (영향력) */
  mass: number;
  
  /** 노드 속도 (변화율) */
  velocity: { x: number; y: number; z: number };
  
  /** 메타데이터 */
  metadata: Record<string, unknown>;
  
  /** 생성 시간 */
  createdAt: Date;
  
  /** 마지막 활동 */
  lastActiveAt: Date;
}

/**
 * 네트워크 엣지 (관계)
 */
export interface NetworkEdge {
  id: string;
  sourceId: string;
  targetId: string;
  
  /** 관계 타입 */
  relationType: 
    | 'reports_to'      // 보고 관계
    | 'collaborates'    // 협업 관계
    | 'depends_on'      // 의존 관계
    | 'influences'      // 영향 관계
    | 'competes'        // 경쟁 관계
    | 'owns'            // 소유 관계
    | 'consumes'        // 소비 관계
    | 'produces';       // 생산 관계
  
  /** 관계 강도 (0~1) */
  strength: number;
  
  /** 관계 방향성 (양방향 여부) */
  bidirectional: boolean;
  
  /** 활성 상태 */
  active: boolean;
  
  /** 에너지 흐름 방향 (-1: 역방향, 0: 균형, 1: 정방향) */
  energyFlow: number;
  
  /** 마지막 상호작용 */
  lastInteraction: Date;
}

/**
 * 네트워크 그래프
 */
export interface NetworkGraph {
  nodes: Map<string, NetworkNode>;
  edges: Map<string, NetworkEdge>;
  
  /** 그래프 메트릭스 */
  metrics: {
    totalNodes: number;
    totalEdges: number;
    density: number;           // 밀도 (실제 엣지 / 가능한 엣지)
    averageK: number;          // 평균 K값
    averageI: number;          // 평균 I값
    averageOmega: number;      // 평균 엔트로피
    averageR: number;          // 평균 성장률
    clusteringCoefficient: number; // 클러스터링 계수
    averagePathLength: number;     // 평균 경로 길이
  };
  
  /** 허브 노드들 (상위 영향력) */
  hubs: string[];
  
  /** 고립 노드들 */
  isolates: string[];
  
  /** 브릿지 노드들 (클러스터 연결자) */
  bridges: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 예측 결과 타입
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 예측 시간 범위
 */
export type PredictionHorizon = 'week' | 'month' | 'quarter' | 'year';

/**
 * 예측 결과
 */
export interface NetworkPrediction {
  /** 예측 ID */
  id: string;
  
  /** 예측 생성 시간 */
  generatedAt: Date;
  
  /** 예측 대상 */
  targetNodeId?: string;
  
  /** 예측 범위 */
  horizon: PredictionHorizon;
  
  /** 예측 신뢰도 (0~1) */
  confidence: number;
  
  /** 구조적 예측 */
  structural: StructuralPrediction;
  
  /** 행동 예측 */
  behavioral: BehavioralPrediction;
  
  /** 리스크 예측 */
  risk: RiskPrediction;
  
  /** 기회 예측 */
  opportunity: OpportunityPrediction;
  
  /** 시나리오별 결과 */
  scenarios: PredictionScenario[];
}

/**
 * 구조적 예측 (네트워크 형태 변화)
 */
export interface StructuralPrediction {
  /** 노드 수 변화 예측 */
  nodeCountChange: {
    predicted: number;
    change: number;
    direction: 'growth' | 'decline' | 'stable';
  };
  
  /** 연결 밀도 변화 */
  densityChange: {
    predicted: number;
    change: number;
    direction: 'densifying' | 'fragmenting' | 'stable';
  };
  
  /** 새로운 허브 출현 예측 */
  emergingHubs: {
    nodeId: string;
    probability: number;
    timeToHub: string;
  }[];
  
  /** 쇠퇴 허브 예측 */
  decliningHubs: {
    nodeId: string;
    probability: number;
    reason: string;
  }[];
  
  /** 클러스터 형성/해체 예측 */
  clusterChanges: {
    type: 'formation' | 'dissolution' | 'merge' | 'split';
    involvedNodes: string[];
    probability: number;
    impact: 'low' | 'medium' | 'high';
  }[];
}

/**
 * 행동 예측 (개체 행동 변화)
 */
export interface BehavioralPrediction {
  /** K 변화 예측 */
  kTrajectory: {
    nodeId: string;
    currentK: number;
    predictedK: number;
    probability: number;
    factors: string[];
  }[];
  
  /** 이탈 위험 노드 */
  churnRisk: {
    nodeId: string;
    probability: number;
    signals: string[];
    preventionActions: string[];
  }[];
  
  /** 급성장 예측 노드 */
  growthStars: {
    nodeId: string;
    currentR: number;
    predictedR: number;
    catalysts: string[];
  }[];
  
  /** 역할 전환 예측 */
  roleTransitions: {
    nodeId: string;
    currentType: UserType;
    predictedType: UserType;
    probability: number;
    trigger: string;
  }[];
  
  /** 협업 패턴 변화 */
  collaborationShifts: {
    from: { nodeId: string; strength: number };
    to: { nodeId: string; strength: number };
    reason: string;
  }[];
}

/**
 * 리스크 예측
 */
export interface RiskPrediction {
  /** 전체 리스크 수준 */
  overallRiskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  
  /** 리스크 스코어 (0~100) */
  riskScore: number;
  
  /** 시스템 취약점 */
  systemicVulnerabilities: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedNodes: string[];
    mitigation: string;
  }[];
  
  /** 충돌 예측 */
  conflictPredictions: {
    between: [string, string];
    probability: number;
    type: 'resource' | 'authority' | 'priority' | 'relationship';
    resolution: string;
  }[];
  
  /** 병목 예측 */
  bottleneckPredictions: {
    nodeId: string;
    probability: number;
    impact: string;
    alternatives: string[];
  }[];
  
  /** 캐스케이드 실패 예측 */
  cascadeRisks: {
    triggerNode: string;
    affectedNodes: string[];
    probability: number;
    totalImpact: number;
    preventionCost: number;
  }[];
}

/**
 * 기회 예측
 */
export interface OpportunityPrediction {
  /** 전체 기회 수준 */
  overallOpportunityLevel: 'low' | 'moderate' | 'promising' | 'high' | 'exceptional';
  
  /** 기회 스코어 (0~100) */
  opportunityScore: number;
  
  /** 시너지 기회 */
  synergyOpportunities: {
    nodes: string[];
    potential: number;
    description: string;
    requiredAction: string;
    timeWindow: string;
  }[];
  
  /** 성장 촉매 */
  growthCatalysts: {
    catalyst: string;
    affectedNodes: string[];
    potentialGain: number;
    probability: number;
  }[];
  
  /** 효율성 개선 */
  efficiencyGains: {
    area: string;
    currentEfficiency: number;
    potentialEfficiency: number;
    investment: string;
    roi: number;
  }[];
  
  /** 미개척 연결 */
  untappedConnections: {
    between: [string, string];
    potentialValue: number;
    barriers: string[];
    recommendation: string;
  }[];
}

/**
 * 예측 시나리오
 */
export interface PredictionScenario {
  name: string;
  nameKo: string;
  probability: number;
  
  /** 시나리오 조건 */
  conditions: string[];
  
  /** 시나리오 결과 */
  outcomes: {
    metric: string;
    value: number;
    change: number;
  }[];
  
  /** 추천 행동 */
  recommendedActions: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 네트워크 분석 및 예측 엔진
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 네트워크 예측 엔진
 */
export class NetworkPredictionEngine {
  private graph: NetworkGraph;
  private history: Map<string, NetworkNode[]>;  // 노드 히스토리
  
  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      metrics: {
        totalNodes: 0,
        totalEdges: 0,
        density: 0,
        averageK: 0,
        averageI: 0,
        averageOmega: 0,
        averageR: 0,
        clusteringCoefficient: 0,
        averagePathLength: 0,
      },
      hubs: [],
      isolates: [],
      bridges: [],
    };
    this.history = new Map();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 네트워크 구축
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 노드 추가
   */
  addNode(node: NetworkNode): void {
    this.graph.nodes.set(node.id, node);
    this.updateHistory(node);
    this.recalculateMetrics();
  }
  
  /**
   * 엣지 추가
   */
  addEdge(edge: NetworkEdge): void {
    this.graph.edges.set(edge.id, edge);
    this.recalculateMetrics();
  }
  
  /**
   * 노드 업데이트
   */
  updateNode(nodeId: string, updates: Partial<NetworkNode>): void {
    const node = this.graph.nodes.get(nodeId);
    if (node) {
      const updated = { ...node, ...updates };
      this.graph.nodes.set(nodeId, updated);
      this.updateHistory(updated);
      this.recalculateMetrics();
    }
  }
  
  private updateHistory(node: NetworkNode): void {
    const history = this.history.get(node.id) || [];
    history.push({ ...node });
    // 최근 100개만 유지
    if (history.length > 100) history.shift();
    this.history.set(node.id, history);
  }
  
  private recalculateMetrics(): void {
    const nodes = Array.from(this.graph.nodes.values());
    const edges = Array.from(this.graph.edges.values());
    
    this.graph.metrics.totalNodes = nodes.length;
    this.graph.metrics.totalEdges = edges.length;
    
    if (nodes.length > 0) {
      // 평균 메트릭 계산
      const sumMetrics = nodes.reduce(
        (acc, node) => ({
          K: acc.K + node.metrics.K,
          I: acc.I + node.metrics.I,
          Omega: acc.Omega + node.metrics.Omega,
          r: acc.r + node.metrics.r,
        }),
        { K: 0, I: 0, Omega: 0, r: 0 }
      );
      
      this.graph.metrics.averageK = sumMetrics.K / nodes.length;
      this.graph.metrics.averageI = sumMetrics.I / nodes.length;
      this.graph.metrics.averageOmega = sumMetrics.Omega / nodes.length;
      this.graph.metrics.averageR = sumMetrics.r / nodes.length;
      
      // 밀도 계산
      const maxEdges = nodes.length * (nodes.length - 1) / 2;
      this.graph.metrics.density = maxEdges > 0 ? edges.length / maxEdges : 0;
    }
    
    // 허브, 고립, 브릿지 식별
    this.identifySpecialNodes();
  }
  
  private identifySpecialNodes(): void {
    const connectionCounts = new Map<string, number>();
    
    // 연결 수 계산
    this.graph.edges.forEach(edge => {
      connectionCounts.set(
        edge.sourceId,
        (connectionCounts.get(edge.sourceId) || 0) + 1
      );
      connectionCounts.set(
        edge.targetId,
        (connectionCounts.get(edge.targetId) || 0) + 1
      );
    });
    
    const avgConnections = Array.from(connectionCounts.values())
      .reduce((a, b) => a + b, 0) / connectionCounts.size || 0;
    
    // 허브: 평균의 2배 이상 연결
    this.graph.hubs = Array.from(connectionCounts.entries())
      .filter(([_, count]) => count >= avgConnections * 2)
      .map(([id]) => id);
    
    // 고립: 연결 없음
    this.graph.isolates = Array.from(this.graph.nodes.keys())
      .filter(id => !connectionCounts.has(id) || connectionCounts.get(id) === 0);
    
    // 브릿지 식별 (간소화된 버전)
    this.graph.bridges = [];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 예측 생성
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 전체 네트워크 예측 생성
   */
  generatePrediction(horizon: PredictionHorizon = 'quarter'): NetworkPrediction {
    const prediction: NetworkPrediction = {
      id: `pred_${Date.now()}`,
      generatedAt: new Date(),
      horizon,
      confidence: this.calculateConfidence(),
      structural: this.predictStructure(horizon),
      behavioral: this.predictBehavior(horizon),
      risk: this.predictRisk(horizon),
      opportunity: this.predictOpportunity(horizon),
      scenarios: this.generateScenarios(horizon),
    };
    
    return prediction;
  }
  
  /**
   * 특정 노드에 대한 예측
   */
  generateNodePrediction(nodeId: string, horizon: PredictionHorizon = 'month'): NetworkPrediction | null {
    const node = this.graph.nodes.get(nodeId);
    if (!node) return null;
    
    const prediction: NetworkPrediction = {
      id: `pred_${nodeId}_${Date.now()}`,
      generatedAt: new Date(),
      targetNodeId: nodeId,
      horizon,
      confidence: this.calculateNodeConfidence(nodeId),
      structural: this.predictNodeStructure(nodeId, horizon),
      behavioral: this.predictNodeBehavior(nodeId, horizon),
      risk: this.predictNodeRisk(nodeId, horizon),
      opportunity: this.predictNodeOpportunity(nodeId, horizon),
      scenarios: this.generateNodeScenarios(nodeId, horizon),
    };
    
    return prediction;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 예측 계산 함수들
  // ═══════════════════════════════════════════════════════════════════════════
  
  private calculateConfidence(): number {
    const dataPoints = this.graph.metrics.totalNodes;
    const historyDepth = Math.min(...Array.from(this.history.values()).map(h => h.length));
    
    // 데이터가 많을수록, 히스토리가 길수록 신뢰도 증가
    const dataScore = Math.min(1, dataPoints / 100);
    const historyScore = Math.min(1, historyDepth / 30);
    
    return (dataScore * 0.5 + historyScore * 0.5) * 0.8 + 0.2; // 20% 기본값
  }
  
  private calculateNodeConfidence(nodeId: string): number {
    const history = this.history.get(nodeId) || [];
    return Math.min(1, history.length / 30) * 0.8 + 0.2;
  }
  
  private predictStructure(horizon: PredictionHorizon): StructuralPrediction {
    const horizonFactor = this.getHorizonFactor(horizon);
    const currentNodes = this.graph.metrics.totalNodes;
    const avgGrowth = this.graph.metrics.averageR;
    
    return {
      nodeCountChange: {
        predicted: Math.round(currentNodes * (1 + avgGrowth * horizonFactor)),
        change: Math.round(currentNodes * avgGrowth * horizonFactor),
        direction: avgGrowth > 0.1 ? 'growth' : avgGrowth < -0.1 ? 'decline' : 'stable',
      },
      densityChange: {
        predicted: Math.min(1, this.graph.metrics.density * (1 + avgGrowth * 0.5 * horizonFactor)),
        change: this.graph.metrics.density * avgGrowth * 0.5 * horizonFactor,
        direction: avgGrowth > 0 ? 'densifying' : avgGrowth < 0 ? 'fragmenting' : 'stable',
      },
      emergingHubs: this.identifyEmergingHubs(horizonFactor),
      decliningHubs: this.identifyDecliningHubs(horizonFactor),
      clusterChanges: [],
    };
  }
  
  private predictBehavior(horizon: PredictionHorizon): BehavioralPrediction {
    const horizonFactor = this.getHorizonFactor(horizon);
    
    return {
      kTrajectory: this.predictKTrajectories(horizonFactor),
      churnRisk: this.identifyChurnRisk(horizonFactor),
      growthStars: this.identifyGrowthStars(horizonFactor),
      roleTransitions: this.predictRoleTransitions(horizonFactor),
      collaborationShifts: [],
    };
  }
  
  private predictRisk(horizon: PredictionHorizon): RiskPrediction {
    const riskScore = this.calculateRiskScore();
    
    return {
      overallRiskLevel: this.getRiskLevel(riskScore),
      riskScore,
      systemicVulnerabilities: this.identifyVulnerabilities(),
      conflictPredictions: this.predictConflicts(),
      bottleneckPredictions: this.predictBottlenecks(),
      cascadeRisks: this.predictCascades(),
    };
  }
  
  private predictOpportunity(horizon: PredictionHorizon): OpportunityPrediction {
    const opportunityScore = this.calculateOpportunityScore();
    
    return {
      overallOpportunityLevel: this.getOpportunityLevel(opportunityScore),
      opportunityScore,
      synergyOpportunities: this.identifySynergies(),
      growthCatalysts: this.identifyGrowthCatalysts(),
      efficiencyGains: this.identifyEfficiencyGains(),
      untappedConnections: this.identifyUntappedConnections(),
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 유틸리티 함수들
  // ═══════════════════════════════════════════════════════════════════════════
  
  private getHorizonFactor(horizon: PredictionHorizon): number {
    switch (horizon) {
      case 'week': return 0.25;
      case 'month': return 1;
      case 'quarter': return 3;
      case 'year': return 12;
    }
  }
  
  private identifyEmergingHubs(horizonFactor: number): StructuralPrediction['emergingHubs'] {
    const emerging: StructuralPrediction['emergingHubs'] = [];
    
    this.graph.nodes.forEach((node, id) => {
      if (!this.graph.hubs.includes(id) && node.metrics.r > 0.3 && node.metrics.I > 50) {
        emerging.push({
          nodeId: id,
          probability: Math.min(1, node.metrics.r * node.metrics.I / 100),
          timeToHub: `${Math.round(6 / (node.metrics.r + 0.1))}개월`,
        });
      }
    });
    
    return emerging.slice(0, 5);
  }
  
  private identifyDecliningHubs(horizonFactor: number): StructuralPrediction['decliningHubs'] {
    const declining: StructuralPrediction['decliningHubs'] = [];
    
    this.graph.hubs.forEach(hubId => {
      const node = this.graph.nodes.get(hubId);
      if (node && node.metrics.r < 0) {
        declining.push({
          nodeId: hubId,
          probability: Math.min(1, Math.abs(node.metrics.r) * 2),
          reason: node.metrics.Omega > 0.7 ? '높은 엔트로피' : '성장률 감소',
        });
      }
    });
    
    return declining;
  }
  
  private predictKTrajectories(horizonFactor: number): BehavioralPrediction['kTrajectory'] {
    const trajectories: BehavioralPrediction['kTrajectory'] = [];
    
    this.graph.nodes.forEach((node, id) => {
      if (node.entityType === 'user') {
        const predictedK = Math.min(10, Math.max(1, 
          node.metrics.K + node.metrics.r * horizonFactor
        ));
        
        if (Math.abs(predictedK - node.metrics.K) >= 0.5) {
          trajectories.push({
            nodeId: id,
            currentK: node.metrics.K,
            predictedK: Math.round(predictedK),
            probability: 0.6 + node.metrics.r * 0.3,
            factors: this.getKChangeFactors(node),
          });
        }
      }
    });
    
    return trajectories.slice(0, 10);
  }
  
  private getKChangeFactors(node: NetworkNode): string[] {
    const factors: string[] = [];
    
    if (node.metrics.r > 0.3) factors.push('높은 성장률');
    if (node.metrics.I > 70) factors.push('활발한 네트워크 활동');
    if (node.metrics.Omega < 0.3) factors.push('안정적인 운영');
    if (node.metrics.r < 0) factors.push('성장률 감소');
    if (node.metrics.Omega > 0.7) factors.push('높은 불확실성');
    
    return factors;
  }
  
  private identifyChurnRisk(horizonFactor: number): BehavioralPrediction['churnRisk'] {
    const risks: BehavioralPrediction['churnRisk'] = [];
    
    this.graph.nodes.forEach((node, id) => {
      const daysSinceActive = (Date.now() - node.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceActive > 14 || (node.metrics.r < -0.3 && node.metrics.I < 30)) {
        risks.push({
          nodeId: id,
          probability: Math.min(1, (daysSinceActive / 30) + Math.abs(node.metrics.r)),
          signals: this.getChurnSignals(node, daysSinceActive),
          preventionActions: ['재참여 유도', '1:1 미팅', '새 프로젝트 배정'],
        });
      }
    });
    
    return risks.slice(0, 10);
  }
  
  private getChurnSignals(node: NetworkNode, inactiveDays: number): string[] {
    const signals: string[] = [];
    
    if (inactiveDays > 14) signals.push(`${Math.round(inactiveDays)}일 비활성`);
    if (node.metrics.r < -0.3) signals.push('마이너스 성장률');
    if (node.metrics.I < 30) signals.push('낮은 상호작용');
    if (node.metrics.Omega > 0.8) signals.push('높은 혼란도');
    
    return signals;
  }
  
  private identifyGrowthStars(horizonFactor: number): BehavioralPrediction['growthStars'] {
    const stars: BehavioralPrediction['growthStars'] = [];
    
    this.graph.nodes.forEach((node, id) => {
      if (node.metrics.r > 0.5 && node.metrics.I > 60) {
        stars.push({
          nodeId: id,
          currentR: node.metrics.r,
          predictedR: Math.min(1, node.metrics.r * (1 + 0.2 * horizonFactor)),
          catalysts: ['높은 네트워크 활동', '빠른 역량 습득', '긍정적 피드백 루프'],
        });
      }
    });
    
    return stars.slice(0, 5);
  }
  
  private predictRoleTransitions(horizonFactor: number): BehavioralPrediction['roleTransitions'] {
    // 간소화된 역할 전환 예측
    return [];
  }
  
  private calculateRiskScore(): number {
    let score = 0;
    
    // 고립 노드 비율
    score += (this.graph.isolates.length / Math.max(1, this.graph.metrics.totalNodes)) * 20;
    
    // 높은 엔트로피
    score += this.graph.metrics.averageOmega * 30;
    
    // 마이너스 성장
    if (this.graph.metrics.averageR < 0) {
      score += Math.abs(this.graph.metrics.averageR) * 30;
    }
    
    // 낮은 밀도 (단절 위험)
    score += (1 - this.graph.metrics.density) * 20;
    
    return Math.min(100, score);
  }
  
  private getRiskLevel(score: number): RiskPrediction['overallRiskLevel'] {
    if (score < 20) return 'low';
    if (score < 40) return 'moderate';
    if (score < 60) return 'elevated';
    if (score < 80) return 'high';
    return 'critical';
  }
  
  private calculateOpportunityScore(): number {
    let score = 0;
    
    // 높은 성장률
    score += Math.max(0, this.graph.metrics.averageR) * 30;
    
    // 활발한 상호작용
    score += (this.graph.metrics.averageI / 100) * 30;
    
    // 낮은 엔트로피 (안정성)
    score += (1 - this.graph.metrics.averageOmega) * 20;
    
    // 네트워크 밀도
    score += this.graph.metrics.density * 20;
    
    return Math.min(100, score);
  }
  
  private getOpportunityLevel(score: number): OpportunityPrediction['overallOpportunityLevel'] {
    if (score < 20) return 'low';
    if (score < 40) return 'moderate';
    if (score < 60) return 'promising';
    if (score < 80) return 'high';
    return 'exceptional';
  }
  
  private identifyVulnerabilities(): RiskPrediction['systemicVulnerabilities'] {
    const vulnerabilities: RiskPrediction['systemicVulnerabilities'] = [];
    
    // 단일 실패점 (허브 의존도)
    if (this.graph.hubs.length < 3 && this.graph.metrics.totalNodes > 10) {
      vulnerabilities.push({
        type: '허브 집중',
        severity: 'high',
        affectedNodes: this.graph.hubs,
        mitigation: '대체 연결 경로 구축',
      });
    }
    
    // 높은 전체 엔트로피
    if (this.graph.metrics.averageOmega > 0.7) {
      vulnerabilities.push({
        type: '시스템 혼란',
        severity: 'high',
        affectedNodes: Array.from(this.graph.nodes.values())
          .filter(n => n.metrics.Omega > 0.7)
          .map(n => n.id),
        mitigation: '프로세스 표준화 및 안정화',
      });
    }
    
    return vulnerabilities;
  }
  
  private predictConflicts(): RiskPrediction['conflictPredictions'] {
    return [];
  }
  
  private predictBottlenecks(): RiskPrediction['bottleneckPredictions'] {
    const bottlenecks: RiskPrediction['bottleneckPredictions'] = [];
    
    this.graph.hubs.forEach(hubId => {
      const node = this.graph.nodes.get(hubId);
      if (node && node.metrics.I > 80) {
        bottlenecks.push({
          nodeId: hubId,
          probability: 0.7,
          impact: '처리 지연 및 품질 저하',
          alternatives: ['업무 분산', '자동화 도입', '대리자 지정'],
        });
      }
    });
    
    return bottlenecks;
  }
  
  private predictCascades(): RiskPrediction['cascadeRisks'] {
    return [];
  }
  
  private identifySynergies(): OpportunityPrediction['synergyOpportunities'] {
    return [];
  }
  
  private identifyGrowthCatalysts(): OpportunityPrediction['growthCatalysts'] {
    const catalysts: OpportunityPrediction['growthCatalysts'] = [];
    
    if (this.graph.metrics.averageI > 50 && this.graph.metrics.averageR > 0.2) {
      catalysts.push({
        catalyst: '네트워크 효과',
        affectedNodes: this.graph.hubs,
        potentialGain: 0.3,
        probability: 0.7,
      });
    }
    
    return catalysts;
  }
  
  private identifyEfficiencyGains(): OpportunityPrediction['efficiencyGains'] {
    return [];
  }
  
  private identifyUntappedConnections(): OpportunityPrediction['untappedConnections'] {
    return [];
  }
  
  private generateScenarios(horizon: PredictionHorizon): PredictionScenario[] {
    return [
      {
        name: 'Optimistic',
        nameKo: '낙관적',
        probability: 0.25,
        conditions: ['성장률 유지', '새 연결 형성', '낮은 이탈률'],
        outcomes: [
          { metric: '노드 수', value: this.graph.metrics.totalNodes * 1.3, change: 0.3 },
          { metric: '평균 K', value: this.graph.metrics.averageK * 1.1, change: 0.1 },
        ],
        recommendedActions: ['확장 준비', '인프라 투자', '인재 영입'],
      },
      {
        name: 'Baseline',
        nameKo: '기본',
        probability: 0.5,
        conditions: ['현재 추세 유지'],
        outcomes: [
          { metric: '노드 수', value: this.graph.metrics.totalNodes * 1.1, change: 0.1 },
          { metric: '평균 K', value: this.graph.metrics.averageK, change: 0 },
        ],
        recommendedActions: ['현재 전략 유지', '점진적 개선'],
      },
      {
        name: 'Pessimistic',
        nameKo: '비관적',
        probability: 0.25,
        conditions: ['성장률 감소', '높은 이탈률', '외부 충격'],
        outcomes: [
          { metric: '노드 수', value: this.graph.metrics.totalNodes * 0.8, change: -0.2 },
          { metric: '평균 K', value: this.graph.metrics.averageK * 0.9, change: -0.1 },
        ],
        recommendedActions: ['핵심 유지', '비용 절감', '위기 대응 계획'],
      },
    ];
  }
  
  // 노드별 예측 함수들 (간소화)
  private predictNodeStructure(nodeId: string, horizon: PredictionHorizon): StructuralPrediction {
    return this.predictStructure(horizon);
  }
  
  private predictNodeBehavior(nodeId: string, horizon: PredictionHorizon): BehavioralPrediction {
    return this.predictBehavior(horizon);
  }
  
  private predictNodeRisk(nodeId: string, horizon: PredictionHorizon): RiskPrediction {
    return this.predictRisk(horizon);
  }
  
  private predictNodeOpportunity(nodeId: string, horizon: PredictionHorizon): OpportunityPrediction {
    return this.predictOpportunity(horizon);
  }
  
  private generateNodeScenarios(nodeId: string, horizon: PredictionHorizon): PredictionScenario[] {
    return this.generateScenarios(horizon);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 예측 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 예측 요약 생성
 */
export function summarizePrediction(prediction: NetworkPrediction): string {
  const lines: string[] = [];
  
  lines.push(`[${prediction.horizon} 예측] 신뢰도: ${Math.round(prediction.confidence * 100)}%`);
  lines.push('');
  
  // 구조
  lines.push(`📊 구조: ${prediction.structural.nodeCountChange.direction}`);
  lines.push(`   노드 변화: ${prediction.structural.nodeCountChange.change > 0 ? '+' : ''}${prediction.structural.nodeCountChange.change}`);
  
  // 리스크
  lines.push(`⚠️ 리스크: ${prediction.risk.overallRiskLevel} (${prediction.risk.riskScore}/100)`);
  
  // 기회
  lines.push(`✨ 기회: ${prediction.opportunity.overallOpportunityLevel} (${prediction.opportunity.opportunityScore}/100)`);
  
  return lines.join('\n');
}

/**
 * 예측 기반 추천 액션 생성
 */
export function getRecommendedActions(prediction: NetworkPrediction): string[] {
  const actions: string[] = [];
  
  // 리스크 기반
  if (prediction.risk.overallRiskLevel === 'high' || prediction.risk.overallRiskLevel === 'critical') {
    actions.push('⚠️ 즉각적인 위험 완화 조치 필요');
    prediction.risk.systemicVulnerabilities.forEach(v => {
      actions.push(`   - ${v.mitigation}`);
    });
  }
  
  // 이탈 위험
  if (prediction.behavioral.churnRisk.length > 0) {
    actions.push(`👥 이탈 위험 ${prediction.behavioral.churnRisk.length}명 관리 필요`);
  }
  
  // 성장 스타
  if (prediction.behavioral.growthStars.length > 0) {
    actions.push(`🌟 고성장 인재 ${prediction.behavioral.growthStars.length}명 육성 기회`);
  }
  
  // 기회 활용
  if (prediction.opportunity.overallOpportunityLevel === 'high' || prediction.opportunity.overallOpportunityLevel === 'exceptional') {
    actions.push('🚀 성장 기회 적극 활용 권장');
  }
  
  return actions;
}
