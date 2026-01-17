// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Causality Engine (인과관계 추적 엔진)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Alpamayo-R1 Chain of Causation 참조 구현
// - Forward Propagation: 원인 → 결과 추적
// - Backward Propagation: 결과 → 원인 역추적
// - Impact Simulation: What-if 분석
// - Explainable Output: 인간 이해 가능 설명 생성
//
// ═══════════════════════════════════════════════════════════════════════════════

import {
  CausalNode,
  CausalEdge,
  CausalChain,
  CausalGraph,
  CausalQuery,
  ReasoningOutput,
  ReasoningStep,
  ImpactMetrics,
  CausalNodeType,
  CausalRelationType,
  NodeState,
  QueryType,
  SCALE_REASONING_CONFIGS,
} from './types';
import { KScale, AutusTask, SCALE_CONFIGS } from '../schema';

// ═══════════════════════════════════════════════════════════════════════════════
// Causality Engine
// ═══════════════════════════════════════════════════════════════════════════════

export class CausalityEngine {
  private graph: CausalGraph;
  private listeners: Set<(event: CausalityEvent) => void> = new Set();
  
  constructor(graphId: string = 'main') {
    this.graph = {
      id: graphId,
      name: 'AUTUS Causal Graph',
      nodes: new Map(),
      edges: new Map(),
      chains: [],
      metadata: {
        nodeCount: 0,
        edgeCount: 0,
        maxDepth: 0,
        avgBranching: 0,
        lastUpdated: new Date(),
      },
      statistics: {
        riskHotspots: [],
        criticalPaths: [],
        bottlenecks: [],
        isolatedNodes: [],
      },
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 노드 관리
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 인과 노드 추가
   */
  addNode(node: Omit<CausalNode, 'id'>): CausalNode {
    const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullNode: CausalNode = { ...node, id };
    
    this.graph.nodes.set(id, fullNode);
    this.updateMetadata();
    this.emit({ type: 'node_added', nodeId: id, node: fullNode });
    
    return fullNode;
  }
  
  /**
   * Task → CausalNode 변환
   */
  taskToNode(task: AutusTask): CausalNode {
    return this.addNode({
      type: 'decision',
      timestamp: new Date(),
      scale: task.scale.value,
      description: task.name,
      descriptionKo: task.name,
      state: this.taskStatusToNodeState(task.execution.status),
      probability: 1,
      confidence: 0.9,
      impact: this.calculateTaskImpact(task),
      causes: [],
      effects: [],
      source: 'user',
      taskId: task.id,
    });
  }
  
  /**
   * 인과 관계 추가
   */
  addEdge(edge: Omit<CausalEdge, 'id'>): CausalEdge {
    const id = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullEdge: CausalEdge = { ...edge, id };
    
    this.graph.edges.set(id, fullEdge);
    
    // 노드 관계 업데이트
    const sourceNode = this.graph.nodes.get(edge.sourceId);
    const targetNode = this.graph.nodes.get(edge.targetId);
    
    if (sourceNode) {
      sourceNode.effects.push(edge.targetId);
    }
    if (targetNode) {
      targetNode.causes.push(edge.sourceId);
    }
    
    this.updateMetadata();
    this.emit({ type: 'edge_added', edgeId: id, edge: fullEdge });
    
    return fullEdge;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 인과 추적 (Chain of Causation)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Forward Propagation: 원인 → 결과 추적
   * "이 결정을 내리면 무슨 일이 발생하는가?"
   */
  traceForward(
    startNodeId: string,
    maxDepth: number = 5
  ): CausalChain {
    const visited = new Set<string>();
    const paths: string[][] = [];
    
    const dfs = (nodeId: string, currentPath: string[], depth: number) => {
      if (depth > maxDepth || visited.has(nodeId)) return;
      
      visited.add(nodeId);
      currentPath.push(nodeId);
      
      const node = this.graph.nodes.get(nodeId);
      if (!node || node.effects.length === 0) {
        paths.push([...currentPath]);
      } else {
        for (const effectId of node.effects) {
          dfs(effectId, currentPath, depth + 1);
        }
      }
      
      currentPath.pop();
      visited.delete(nodeId);
    };
    
    dfs(startNodeId, [], 0);
    
    return this.buildChain(startNodeId, paths, 'forward');
  }
  
  /**
   * Backward Propagation: 결과 → 원인 역추적
   * "왜 이런 일이 발생했는가?"
   */
  traceBackward(
    endNodeId: string,
    maxDepth: number = 5
  ): CausalChain {
    const visited = new Set<string>();
    const paths: string[][] = [];
    
    const dfs = (nodeId: string, currentPath: string[], depth: number) => {
      if (depth > maxDepth || visited.has(nodeId)) return;
      
      visited.add(nodeId);
      currentPath.unshift(nodeId);
      
      const node = this.graph.nodes.get(nodeId);
      if (!node || node.causes.length === 0) {
        paths.push([...currentPath]);
      } else {
        for (const causeId of node.causes) {
          dfs(causeId, currentPath, depth + 1);
        }
      }
      
      currentPath.shift();
      visited.delete(nodeId);
    };
    
    dfs(endNodeId, [], 0);
    
    return this.buildChain(endNodeId, paths, 'backward');
  }
  
  /**
   * What-If 분석
   * "만약 X를 변경하면 Y는 어떻게 되는가?"
   */
  whatIf(
    nodeId: string,
    changes: Partial<CausalNode>
  ): {
    affectedNodes: CausalNode[];
    riskChange: number;
    explanation: string;
  } {
    const originalNode = this.graph.nodes.get(nodeId);
    if (!originalNode) {
      return { affectedNodes: [], riskChange: 0, explanation: '노드를 찾을 수 없습니다.' };
    }
    
    // 시뮬레이션용 임시 변경
    const simulatedNode = { ...originalNode, ...changes };
    
    // 영향받는 노드 탐색
    const forwardChain = this.traceForward(nodeId, 10);
    const affectedNodeIds = new Set<string>();
    
    forwardChain.paths.forEach(path => {
      path.nodeIds.forEach(id => affectedNodeIds.add(id));
    });
    
    const affectedNodes = Array.from(affectedNodeIds)
      .map(id => this.graph.nodes.get(id))
      .filter((n): n is CausalNode => n !== undefined);
    
    // 리스크 변화 계산
    const originalRisk = this.calculateChainRisk(forwardChain);
    const newRisk = originalRisk * (changes.probability || 1);
    const riskChange = newRisk - originalRisk;
    
    // 설명 생성
    const explanation = this.generateWhatIfExplanation(
      originalNode,
      simulatedNode,
      affectedNodes,
      riskChange
    );
    
    return { affectedNodes, riskChange, explanation };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 질의 처리 (Query Interface)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 자연어 질의 처리
   */
  async query(query: CausalQuery): Promise<ReasoningOutput> {
    const startTime = performance.now();
    
    // 질의 유형에 따른 처리
    let chain: CausalChain | null = null;
    let steps: ReasoningStep[] = [];
    
    switch (query.type) {
      case 'why':
        chain = this.processWhyQuery(query);
        steps = this.generateWhySteps(chain);
        break;
        
      case 'what_if':
        const result = this.processWhatIfQuery(query);
        steps = this.generateWhatIfSteps(result);
        break;
        
      case 'impact':
        chain = this.processImpactQuery(query);
        steps = this.generateImpactSteps(chain);
        break;
        
      case 'risk':
        steps = this.processRiskQuery(query);
        break;
        
      case 'alternatives':
        steps = this.processAlternativesQuery(query);
        break;
        
      case 'optimal':
        steps = this.processOptimalQuery(query);
        break;
        
      default:
        steps = [this.createStep(1, 'observation', '알 수 없는 질의 유형입니다.', 0.5, [])];
    }
    
    const processingTime = performance.now() - startTime;
    
    return {
      id: `reasoning-${Date.now()}`,
      queryId: query.id,
      chain: steps,
      conclusion: this.generateConclusion(steps),
      evidence: this.gatherEvidence(steps),
      visualization: this.generateVisualization(chain, steps),
      generatedAt: new Date(),
      processingTime,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Explainable AI 출력
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 노드가 위험한 이유 설명
   */
  explainRisk(nodeId: string): string {
    const node = this.graph.nodes.get(nodeId);
    if (!node) return '노드를 찾을 수 없습니다.';
    
    const backwardChain = this.traceBackward(nodeId, 3);
    const forwardChain = this.traceForward(nodeId, 3);
    
    const causes = backwardChain.paths.map(p => {
      const rootNode = this.graph.nodes.get(p.nodeIds[0]);
      return rootNode?.descriptionKo || '알 수 없는 원인';
    });
    
    const effects = forwardChain.paths.map(p => {
      const terminalNode = this.graph.nodes.get(p.nodeIds[p.nodeIds.length - 1]);
      return terminalNode?.descriptionKo || '알 수 없는 결과';
    });
    
    return `
📍 노드: ${node.descriptionKo}
🔴 위험도: ${Math.round(node.impact.irreversibility * 100)}%

📌 원인 (${causes.length}개):
${causes.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}

📌 예상 결과 (${effects.length}개):
${effects.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

💡 권장 조치:
  ${node.impact.irreversibility > 0.7 ? '⚠️ K' + node.scale + ' 이상 승인 필요' : '✅ 진행 가능'}
    `.trim();
  }
  
  /**
   * 결정 경로 시각화 데이터 생성
   */
  getVisualizationData(rootNodeId: string): {
    nodes: Array<{ id: string; label: string; color: string; size: number }>;
    edges: Array<{ source: string; target: string; label: string; strength: number }>;
  } {
    const chain = this.traceForward(rootNodeId, 5);
    const nodeSet = new Set<string>();
    const edgeSet = new Set<string>();
    
    chain.paths.forEach(path => {
      path.nodeIds.forEach(id => nodeSet.add(id));
      path.edgeIds.forEach(id => edgeSet.add(id));
    });
    
    const nodes = Array.from(nodeSet).map(id => {
      const node = this.graph.nodes.get(id)!;
      const config = SCALE_CONFIGS[node.scale];
      
      return {
        id: node.id,
        label: node.descriptionKo,
        color: config.ui.color,
        size: 10 + (node.impact.irreversibility * 30),
      };
    });
    
    const edges = Array.from(edgeSet).map(id => {
      const edge = this.graph.edges.get(id)!;
      return {
        source: edge.sourceId,
        target: edge.targetId,
        label: edge.reasoningKo,
        strength: edge.strength,
      };
    });
    
    return { nodes, edges };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 이벤트 & 구독
  // ═══════════════════════════════════════════════════════════════════════════
  
  subscribe(listener: (event: CausalityEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private emit(event: CausalityEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 내부 헬퍼 메서드
  // ═══════════════════════════════════════════════════════════════════════════
  
  private buildChain(
    rootId: string,
    paths: string[][],
    direction: 'forward' | 'backward'
  ): CausalChain {
    const terminalIds = new Set<string>();
    paths.forEach(path => {
      if (path.length > 0) {
        terminalIds.add(direction === 'forward' ? path[path.length - 1] : path[0]);
      }
    });
    
    return {
      id: `chain-${Date.now()}`,
      name: `${direction === 'forward' ? 'Forward' : 'Backward'} Chain from ${rootId}`,
      rootNodeId: rootId,
      terminalNodeIds: Array.from(terminalIds),
      length: Math.max(...paths.map(p => p.length)),
      totalDelay: 0,
      cumulativeRisk: this.calculatePathsRisk(paths),
      paths: paths.map((nodeIds, i) => ({
        nodeIds,
        edgeIds: this.getEdgeIds(nodeIds),
        probability: this.calculatePathProbability(nodeIds),
        risk: this.calculatePathRisk(nodeIds),
        label: `Path ${i + 1}`,
      })),
      branchPoints: this.findBranchPoints(paths),
      generatedAt: new Date(),
      generatedBy: direction === 'forward' ? 'forward' : 'backward',
    };
  }
  
  private getEdgeIds(nodeIds: string[]): string[] {
    const edgeIds: string[] = [];
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const edge = Array.from(this.graph.edges.values()).find(
        e => e.sourceId === nodeIds[i] && e.targetId === nodeIds[i + 1]
      );
      if (edge) edgeIds.push(edge.id);
    }
    return edgeIds;
  }
  
  private calculatePathProbability(nodeIds: string[]): number {
    return nodeIds.reduce((prob, id) => {
      const node = this.graph.nodes.get(id);
      return prob * (node?.probability || 1);
    }, 1);
  }
  
  private calculatePathRisk(nodeIds: string[]): number {
    return nodeIds.reduce((risk, id) => {
      const node = this.graph.nodes.get(id);
      return Math.max(risk, node?.impact.irreversibility || 0);
    }, 0);
  }
  
  private calculatePathsRisk(paths: string[][]): number {
    return Math.max(...paths.map(p => this.calculatePathRisk(p)));
  }
  
  private calculateChainRisk(chain: CausalChain): number {
    return chain.cumulativeRisk;
  }
  
  private findBranchPoints(paths: string[][]): CausalChain['branchPoints'] {
    const branchPoints: CausalChain['branchPoints'] = [];
    const nodeOccurrences = new Map<string, number>();
    
    paths.forEach(path => {
      path.forEach(nodeId => {
        nodeOccurrences.set(nodeId, (nodeOccurrences.get(nodeId) || 0) + 1);
      });
    });
    
    nodeOccurrences.forEach((count, nodeId) => {
      if (count > 1) {
        const node = this.graph.nodes.get(nodeId);
        if (node && node.effects.length > 1) {
          branchPoints.push({
            nodeId,
            branches: node.effects.map(effectId => ({
              edgeId: this.getEdgeIds([nodeId, effectId])[0] || '',
              targetNodeId: effectId,
              probability: 1 / node.effects.length,
              label: this.graph.nodes.get(effectId)?.descriptionKo || '',
            })),
          });
        }
      }
    });
    
    return branchPoints;
  }
  
  private taskStatusToNodeState(status: AutusTask['execution']['status']): NodeState {
    const mapping: Record<string, NodeState> = {
      draft: 'potential',
      pending: 'imminent',
      in_progress: 'active',
      completed: 'completed',
      cancelled: 'prevented',
      failed: 'failed',
    };
    return mapping[status] || 'potential';
  }
  
  private calculateTaskImpact(task: AutusTask): ImpactMetrics {
    const config = SCALE_CONFIGS[task.scale.value];
    
    return {
      scope: task.scale.value <= 3 ? 'individual' : 
             task.scale.value <= 5 ? 'organization' :
             task.scale.value <= 7 ? 'industry' : 'society',
      irreversibility: task.irreversibility.omega,
      temporal: {
        immediate: task.scale.value <= 3 ? 0.8 : 0.3,
        shortTerm: task.scale.value <= 5 ? 0.6 : 0.4,
        longTerm: task.scale.value >= 6 ? 0.8 : 0.2,
      },
      domains: {
        financial: task.domain === 'finance' ? 0.9 : 0.3,
        operational: task.domain === 'operations' ? 0.9 : 0.3,
        legal: task.domain === 'legal' ? 0.9 : 0.3,
        reputational: 0.5,
        strategic: task.domain === 'strategy' ? 0.9 : 0.3,
      },
      stakeholders: [],
    };
  }
  
  private updateMetadata(): void {
    this.graph.metadata = {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.size,
      maxDepth: this.calculateMaxDepth(),
      avgBranching: this.calculateAvgBranching(),
      lastUpdated: new Date(),
    };
  }
  
  private calculateMaxDepth(): number {
    let maxDepth = 0;
    this.graph.nodes.forEach((node, id) => {
      if (node.causes.length === 0) {
        const chain = this.traceForward(id, 20);
        maxDepth = Math.max(maxDepth, chain.length);
      }
    });
    return maxDepth;
  }
  
  private calculateAvgBranching(): number {
    const branchCounts = Array.from(this.graph.nodes.values()).map(n => n.effects.length);
    return branchCounts.length > 0 
      ? branchCounts.reduce((a, b) => a + b, 0) / branchCounts.length 
      : 0;
  }
  
  // 질의 처리 헬퍼들
  private processWhyQuery(query: CausalQuery): CausalChain | null {
    const nodeIds = query.context?.nodeIds;
    if (!nodeIds || nodeIds.length === 0) return null;
    return this.traceBackward(nodeIds[0], query.options.maxDepth);
  }
  
  private processWhatIfQuery(query: CausalQuery): any {
    const nodeIds = query.context?.nodeIds;
    if (!nodeIds || nodeIds.length === 0) return null;
    return this.whatIf(nodeIds[0], { probability: 0.5 });
  }
  
  private processImpactQuery(query: CausalQuery): CausalChain | null {
    const nodeIds = query.context?.nodeIds;
    if (!nodeIds || nodeIds.length === 0) return null;
    return this.traceForward(nodeIds[0], query.options.maxDepth);
  }
  
  private processRiskQuery(query: CausalQuery): ReasoningStep[] {
    return [this.createStep(1, 'observation', '리스크 분석 중...', 0.8, [])];
  }
  
  private processAlternativesQuery(query: CausalQuery): ReasoningStep[] {
    return [this.createStep(1, 'observation', '대안 탐색 중...', 0.8, [])];
  }
  
  private processOptimalQuery(query: CausalQuery): ReasoningStep[] {
    return [this.createStep(1, 'observation', '최적 경로 계산 중...', 0.8, [])];
  }
  
  private generateWhySteps(chain: CausalChain | null): ReasoningStep[] {
    if (!chain) return [];
    
    return chain.paths.flatMap((path, pathIndex) => 
      path.nodeIds.map((nodeId, stepIndex) => {
        const node = this.graph.nodes.get(nodeId);
        return this.createStep(
          pathIndex * 100 + stepIndex + 1,
          stepIndex === 0 ? 'observation' : stepIndex === path.nodeIds.length - 1 ? 'conclusion' : 'inference',
          node?.description || 'Unknown',
          node?.confidence || 0.5,
          [nodeId]
        );
      })
    );
  }
  
  private generateWhatIfSteps(result: any): ReasoningStep[] {
    if (!result) return [];
    return [
      this.createStep(1, 'hypothesis', `변경 시뮬레이션: ${result.explanation}`, 0.8, []),
      this.createStep(2, 'conclusion', `리스크 변화: ${result.riskChange > 0 ? '+' : ''}${Math.round(result.riskChange * 100)}%`, 0.9, []),
    ];
  }
  
  private generateImpactSteps(chain: CausalChain | null): ReasoningStep[] {
    if (!chain) return [];
    return this.generateWhySteps(chain);
  }
  
  private createStep(
    order: number,
    type: ReasoningStep['type'],
    content: string,
    confidence: number,
    supportingNodeIds: string[]
  ): ReasoningStep {
    return {
      order,
      type,
      content,
      contentKo: content, // 실제로는 번역 필요
      confidence,
      supportingNodeIds,
    };
  }
  
  private generateConclusion(steps: ReasoningStep[]) {
    const conclusionStep = steps.find(s => s.type === 'conclusion');
    return {
      decision: conclusionStep?.content || '결론을 도출할 수 없습니다.',
      confidence: conclusionStep?.confidence || 0.5,
      alternatives: [],
    };
  }
  
  private gatherEvidence(steps: ReasoningStep[]) {
    return steps.filter(s => s.type === 'observation').map(s => ({
      type: 'data' as const,
      source: 'causal_graph',
      content: s.content,
      reliability: s.confidence,
    }));
  }
  
  private generateVisualization(chain: CausalChain | null, steps: ReasoningStep[]) {
    return {
      highlightedNodes: steps.flatMap(s => s.supportingNodeIds),
      highlightedEdges: chain?.paths.flatMap(p => p.edgeIds) || [],
      annotations: [],
    };
  }
  
  private generateWhatIfExplanation(
    original: CausalNode,
    simulated: CausalNode,
    affected: CausalNode[],
    riskChange: number
  ): string {
    return `
"${original.descriptionKo}"의 변경이 ${affected.length}개 노드에 영향을 미칩니다.
리스크 ${riskChange > 0 ? '증가' : '감소'}: ${Math.abs(Math.round(riskChange * 100))}%
    `.trim();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 이벤트 타입
// ═══════════════════════════════════════════════════════════════════════════════

export type CausalityEvent = 
  | { type: 'node_added'; nodeId: string; node: CausalNode }
  | { type: 'edge_added'; edgeId: string; edge: CausalEdge }
  | { type: 'node_updated'; nodeId: string; changes: Partial<CausalNode> }
  | { type: 'chain_generated'; chain: CausalChain }
  | { type: 'query_completed'; queryId: string; output: ReasoningOutput };

// ═══════════════════════════════════════════════════════════════════════════════
// React Hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useCausality() {
  const engine = useMemo(() => new CausalityEngine(), []);
  const [graph, setGraph] = useState<CausalGraph | null>(null);
  
  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      // 그래프 상태 업데이트 트리거
      setGraph({ ...engine['graph'] });
    });
    return unsubscribe;
  }, [engine]);
  
  const addTask = useCallback((task: AutusTask) => {
    return engine.taskToNode(task);
  }, [engine]);
  
  const traceForward = useCallback((nodeId: string, maxDepth?: number) => {
    return engine.traceForward(nodeId, maxDepth);
  }, [engine]);
  
  const traceBackward = useCallback((nodeId: string, maxDepth?: number) => {
    return engine.traceBackward(nodeId, maxDepth);
  }, [engine]);
  
  const whatIf = useCallback((nodeId: string, changes: Partial<CausalNode>) => {
    return engine.whatIf(nodeId, changes);
  }, [engine]);
  
  const query = useCallback((q: CausalQuery) => {
    return engine.query(q);
  }, [engine]);
  
  const explainRisk = useCallback((nodeId: string) => {
    return engine.explainRisk(nodeId);
  }, [engine]);
  
  return {
    engine,
    graph,
    addTask,
    traceForward,
    traceBackward,
    whatIf,
    query,
    explainRisk,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default CausalityEngine;
