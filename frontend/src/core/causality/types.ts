// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Chain of Causation (CoC) Types
// ═══════════════════════════════════════════════════════════════════════════════
//
// Alpamayo-R1 참조 구조:
// - Chain of Causation: 사건 간 인과관계 추적
// - Physical Reasoning: 결정의 물리적 파급 효과
// - Explainable AI: 인간이 이해할 수 있는 추론 설명
//
// ═══════════════════════════════════════════════════════════════════════════════

import { KScale, AutusTask } from '../schema';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 인과 노드 (Causal Node)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 인과 관계의 기본 단위
 * 모든 결정/사건/상태는 CausalNode로 표현
 */
export interface CausalNode {
  id: string;
  type: CausalNodeType;
  
  // 시공간 좌표
  timestamp: Date;
  scale: KScale;            // 발생 고도
  
  // 내용
  description: string;
  descriptionKo: string;
  
  // 상태
  state: NodeState;
  probability: number;      // 발생 확률 (0~1)
  confidence: number;       // 추론 신뢰도 (0~1)
  
  // 메트릭스
  impact: ImpactMetrics;
  
  // 관계
  causes: string[];         // 이 노드의 원인 노드 IDs
  effects: string[];        // 이 노드가 야기한 결과 노드 IDs
  
  // 메타데이터
  source?: 'user' | 'system' | 'ai' | 'external';
  taskId?: string;          // 연결된 Task ID
}

export type CausalNodeType = 
  | 'decision'      // 의사결정
  | 'event'         // 사건
  | 'state'         // 상태
  | 'constraint'    // 제약조건
  | 'risk'          // 리스크
  | 'opportunity'   // 기회
  | 'resource'      // 자원
  | 'actor';        // 행위자

export type NodeState = 
  | 'potential'     // 잠재적
  | 'imminent'      // 임박
  | 'active'        // 진행중
  | 'completed'     // 완료
  | 'prevented'     // 방지됨
  | 'failed';       // 실패

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 인과 간선 (Causal Edge)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 두 노드 간의 인과 관계
 */
export interface CausalEdge {
  id: string;
  sourceId: string;
  targetId: string;
  
  // 관계 유형
  type: CausalRelationType;
  
  // 강도
  strength: number;         // 인과 강도 (0~1)
  delay: number;            // 지연 시간 (ms)
  
  // 조건
  conditions?: CausalCondition[];
  
  // 설명
  reasoning: string;        // AI가 생성한 추론 근거
  reasoningKo: string;
}

export type CausalRelationType = 
  | 'causes'          // A → B (직접 원인)
  | 'enables'         // A가 B를 가능하게 함
  | 'prevents'        // A가 B를 방지함
  | 'amplifies'       // A가 B를 증폭함
  | 'dampens'         // A가 B를 약화함
  | 'correlates'      // A와 B가 상관관계
  | 'conflicts'       // A와 B가 충돌
  | 'requires'        // A가 B를 필요로 함
  | 'excludes';       // A와 B가 상호배타적

export interface CausalCondition {
  type: 'threshold' | 'timing' | 'context' | 'probability';
  operator: '>' | '<' | '=' | '!=' | 'contains' | 'within';
  value: any;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 임팩트 메트릭스
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImpactMetrics {
  // 범위
  scope: ImpactScope;
  
  // 비가역성
  irreversibility: number;  // 0~1
  
  // 시간적 영향
  temporal: {
    immediate: number;      // 즉각 영향 (0~1)
    shortTerm: number;      // 단기 영향 (0~1)
    longTerm: number;       // 장기 영향 (0~1)
  };
  
  // 도메인별 영향
  domains: {
    financial: number;
    operational: number;
    legal: number;
    reputational: number;
    strategic: number;
  };
  
  // 이해관계자
  stakeholders: StakeholderImpact[];
}

export type ImpactScope = 
  | 'individual'
  | 'team'
  | 'department'
  | 'organization'
  | 'industry'
  | 'market'
  | 'society'
  | 'civilization';

export interface StakeholderImpact {
  role: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number;        // 0~1
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 인과 체인 (Causal Chain)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 연결된 인과 노드들의 체인
 * 하나의 결정이 어떤 경로로 파급되는지 표현
 */
export interface CausalChain {
  id: string;
  name: string;
  
  // 시작과 끝
  rootNodeId: string;       // 원인 노드
  terminalNodeIds: string[]; // 최종 결과 노드들
  
  // 체인 메트릭스
  length: number;           // 체인 길이 (노드 수)
  totalDelay: number;       // 총 지연 시간
  cumulativeRisk: number;   // 누적 리스크
  
  // 경로
  paths: CausalPath[];
  
  // 분기점
  branchPoints: BranchPoint[];
  
  // 생성 정보
  generatedAt: Date;
  generatedBy: 'forward' | 'backward' | 'bidirectional';
}

export interface CausalPath {
  nodeIds: string[];
  edgeIds: string[];
  probability: number;
  risk: number;
  label: string;
}

export interface BranchPoint {
  nodeId: string;
  branches: {
    edgeId: string;
    targetNodeId: string;
    probability: number;
    label: string;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 인과 그래프 (전체 구조)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 전체 인과 관계 그래프
 */
export interface CausalGraph {
  id: string;
  name: string;
  
  nodes: Map<string, CausalNode>;
  edges: Map<string, CausalEdge>;
  chains: CausalChain[];
  
  // 메타데이터
  metadata: {
    nodeCount: number;
    edgeCount: number;
    maxDepth: number;
    avgBranching: number;
    lastUpdated: Date;
  };
  
  // 통계
  statistics: GraphStatistics;
}

export interface GraphStatistics {
  riskHotspots: string[];           // 고위험 노드 IDs
  criticalPaths: CausalPath[];      // 결정적 경로들
  bottlenecks: string[];            // 병목 노드 IDs
  isolatedNodes: string[];          // 고립 노드 IDs
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 추론 결과 (Reasoning Output)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AI 추론 결과
 * Explainable AI를 위한 구조화된 설명
 */
export interface ReasoningOutput {
  id: string;
  queryId: string;
  
  // 추론 체인
  chain: ReasoningStep[];
  
  // 결론
  conclusion: {
    decision: string;
    confidence: number;
    alternatives: AlternativeDecision[];
  };
  
  // 근거
  evidence: Evidence[];
  
  // 시각화 데이터
  visualization: {
    highlightedNodes: string[];
    highlightedEdges: string[];
    annotations: Annotation[];
  };
  
  // 생성 정보
  generatedAt: Date;
  processingTime: number;   // ms
}

export interface ReasoningStep {
  order: number;
  type: 'observation' | 'inference' | 'hypothesis' | 'conclusion';
  content: string;
  contentKo: string;
  confidence: number;
  supportingNodeIds: string[];
}

export interface AlternativeDecision {
  decision: string;
  probability: number;
  pros: string[];
  cons: string[];
}

export interface Evidence {
  type: 'data' | 'rule' | 'pattern' | 'precedent';
  source: string;
  content: string;
  reliability: number;
}

export interface Annotation {
  nodeId?: string;
  edgeId?: string;
  text: string;
  textKo: string;
  type: 'warning' | 'info' | 'suggestion' | 'highlight';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. 쿼리 인터페이스
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 인과관계 질의
 */
export interface CausalQuery {
  id: string;
  type: QueryType;
  
  // 쿼리 내용
  question: string;         // 자연어 질문
  context?: {
    taskIds?: string[];
    nodeIds?: string[];
    timeRange?: { start: Date; end: Date };
    scaleRange?: { min: KScale; max: KScale };
  };
  
  // 옵션
  options: {
    maxDepth: number;       // 최대 추적 깊이
    includeAlternatives: boolean;
    explainLevel: 'brief' | 'detailed' | 'comprehensive';
  };
}

export type QueryType = 
  | 'why'           // 왜 이것이 발생했는가?
  | 'what_if'       // 만약 ~하면?
  | 'how'           // 어떻게 ~에 도달할 수 있는가?
  | 'impact'        // 이것의 영향은?
  | 'risk'          // 리스크는 무엇인가?
  | 'alternatives'  // 대안은 무엇인가?
  | 'optimal';      // 최적 경로는?

// ═══════════════════════════════════════════════════════════════════════════════
// 8. K-Scale별 인과 추론 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScaleReasoningConfig {
  scale: KScale;
  
  // 추론 깊이
  maxCausalDepth: number;
  
  // 시간 범위
  temporalHorizon: {
    past: number;           // 과거 분석 범위 (ms)
    future: number;         // 미래 예측 범위 (ms)
  };
  
  // 활성화된 추론 유형
  enabledQueryTypes: QueryType[];
  
  // 자동 트리거
  autoTriggers: {
    onDecision: boolean;    // 결정 시 자동 분석
    onRiskThreshold: number; // 리스크 임계값 초과 시
    onConflict: boolean;    // 충돌 감지 시
  };
  
  // 설명 수준
  explanationLevel: 'brief' | 'detailed' | 'comprehensive';
}

export const SCALE_REASONING_CONFIGS: Record<KScale, ScaleReasoningConfig> = {
  1: {
    scale: 1,
    maxCausalDepth: 2,
    temporalHorizon: { past: 3600000, future: 86400000 }, // 1시간 과거, 1일 미래
    enabledQueryTypes: ['why', 'how'],
    autoTriggers: { onDecision: false, onRiskThreshold: 0.8, onConflict: true },
    explanationLevel: 'brief',
  },
  2: {
    scale: 2,
    maxCausalDepth: 3,
    temporalHorizon: { past: 86400000, future: 604800000 }, // 1일 과거, 1주 미래
    enabledQueryTypes: ['why', 'how', 'impact'],
    autoTriggers: { onDecision: false, onRiskThreshold: 0.7, onConflict: true },
    explanationLevel: 'brief',
  },
  3: {
    scale: 3,
    maxCausalDepth: 4,
    temporalHorizon: { past: 604800000, future: 2592000000 }, // 1주 과거, 1달 미래
    enabledQueryTypes: ['why', 'how', 'impact', 'risk'],
    autoTriggers: { onDecision: true, onRiskThreshold: 0.6, onConflict: true },
    explanationLevel: 'detailed',
  },
  4: {
    scale: 4,
    maxCausalDepth: 5,
    temporalHorizon: { past: 2592000000, future: 7776000000 }, // 1달 과거, 3달 미래
    enabledQueryTypes: ['why', 'how', 'what_if', 'impact', 'risk'],
    autoTriggers: { onDecision: true, onRiskThreshold: 0.5, onConflict: true },
    explanationLevel: 'detailed',
  },
  5: {
    scale: 5,
    maxCausalDepth: 6,
    temporalHorizon: { past: 7776000000, future: 31536000000 }, // 3달 과거, 1년 미래
    enabledQueryTypes: ['why', 'how', 'what_if', 'impact', 'risk', 'alternatives'],
    autoTriggers: { onDecision: true, onRiskThreshold: 0.4, onConflict: true },
    explanationLevel: 'detailed',
  },
  6: {
    scale: 6,
    maxCausalDepth: 7,
    temporalHorizon: { past: 31536000000, future: 94608000000 }, // 1년 과거, 3년 미래
    enabledQueryTypes: ['why', 'how', 'what_if', 'impact', 'risk', 'alternatives', 'optimal'],
    autoTriggers: { onDecision: true, onRiskThreshold: 0.3, onConflict: true },
    explanationLevel: 'comprehensive',
  },
  7: {
    scale: 7,
    maxCausalDepth: 8,
    temporalHorizon: { past: 94608000000, future: 315360000000 }, // 3년 과거, 10년 미래
    enabledQueryTypes: ['why', 'how', 'what_if', 'impact', 'risk', 'alternatives', 'optimal'],
    autoTriggers: { onDecision: true, onRiskThreshold: 0.2, onConflict: true },
    explanationLevel: 'comprehensive',
  },
  8: {
    scale: 8,
    maxCausalDepth: 10,
    temporalHorizon: { past: 315360000000, future: 946080000000 }, // 10년 과거, 30년 미래
    enabledQueryTypes: ['why', 'how', 'what_if', 'impact', 'risk', 'alternatives', 'optimal'],
    autoTriggers: { onDecision: true, onRiskThreshold: 0.1, onConflict: true },
    explanationLevel: 'comprehensive',
  },
  9: {
    scale: 9,
    maxCausalDepth: 12,
    temporalHorizon: { past: 946080000000, future: 3153600000000 }, // 30년 과거, 100년 미래
    enabledQueryTypes: ['why', 'how', 'what_if', 'impact', 'risk', 'alternatives', 'optimal'],
    autoTriggers: { onDecision: true, onRiskThreshold: 0.05, onConflict: true },
    explanationLevel: 'comprehensive',
  },
  10: {
    scale: 10,
    maxCausalDepth: 15,
    temporalHorizon: { past: 3153600000000, future: Infinity }, // 100년 과거, 무한 미래
    enabledQueryTypes: ['why', 'how', 'what_if', 'impact', 'risk', 'alternatives', 'optimal'],
    autoTriggers: { onDecision: true, onRiskThreshold: 0.01, onConflict: true },
    explanationLevel: 'comprehensive',
  },
};
