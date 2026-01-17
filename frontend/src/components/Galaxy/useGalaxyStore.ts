// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galaxy State Management (Zustand)
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { Vector3 } from 'three';
import type { 
  TaskNode, 
  GalaxyCluster, 
  NodeConnection, 
  GalaxySystemState,
  CameraState,
  SelectedNode,
  GalaxyClusterType,
  NodeStatus
} from './types';
import { GALAXY_CLUSTERS, TASK_NAMES, CLUSTER_MAP, VISUAL_CONFIG } from './constants';

interface GalaxyStore {
  // 데이터
  nodes: TaskNode[];
  clusters: GalaxyCluster[];
  connections: NodeConnection[];
  systemState: GalaxySystemState;
  
  // UI 상태
  selectedNode: SelectedNode;
  hoveredCluster: GalaxyClusterType | null;
  cameraState: CameraState;
  isPaused: boolean;
  showConnections: boolean;
  showLabels: boolean;
  
  // 필터
  filterByStatus: NodeStatus | 'all';
  filterByCluster: GalaxyClusterType | 'all';
  
  // 액션
  setSelectedNode: (node: TaskNode | null, cluster: GalaxyCluster | null) => void;
  setHoveredCluster: (cluster: GalaxyClusterType | null) => void;
  setCameraState: (state: Partial<CameraState>) => void;
  togglePause: () => void;
  toggleConnections: () => void;
  toggleLabels: () => void;
  setFilterByStatus: (status: NodeStatus | 'all') => void;
  setFilterByCluster: (cluster: GalaxyClusterType | 'all') => void;
  updateNodeMetrics: (nodeId: string, metrics: Partial<TaskNode>) => void;
  triggerExtinction: (nodeId: string) => void;
  
  // 초기화
  initializeNodes: () => void;
}

// 노드 생성 함수
function generateNodes(): TaskNode[] {
  const nodes: TaskNode[] = [];
  let nodeIndex = 0;
  
  for (const cluster of GALAXY_CLUSTERS) {
    const taskNames = TASK_NAMES[cluster.id];
    
    for (let i = 0; i < cluster.nodeCount; i++) {
      // 클러스터 중심 기준 랜덤 위치
      const angle = (i / cluster.nodeCount) * Math.PI * 2;
      const radius = 2 + Math.random() * 3; // 클러스터 내 반지름
      const height = (Math.random() - 0.5) * 2;
      
      const position = new Vector3(
        cluster.centerPosition.x + Math.cos(angle) * radius,
        cluster.centerPosition.y + height,
        cluster.centerPosition.z + Math.sin(angle) * radius
      );
      
      // K·I·Ω·r 메트릭 랜덤 생성 (클러스터 평균 기준)
      const kEfficiency = Math.max(0.1, Math.min(3.0, 
        cluster.avgK + (Math.random() - 0.5) * 0.8
      ));
      const iInteraction = Math.max(-1, Math.min(1, 
        cluster.avgI + (Math.random() - 0.5) * 0.4
      ));
      const omegaEntropy = Math.max(0, Math.min(1, 
        cluster.avgOmega + (Math.random() - 0.5) * 0.2
      ));
      
      // 상태 결정 (K 값 기준)
      let status: NodeStatus = 'active';
      if (kEfficiency < 0.5) status = 'critical';
      else if (kEfficiency < 0.8) status = 'warning';
      else if (omegaEntropy > 0.7) status = 'dormant';
      else if (Math.random() < 0.1) status = 'pending';
      
      // 크기와 발광 강도 (K 값 기준)
      const size = VISUAL_CONFIG.nodeMinSize + 
        (kEfficiency / 3.0) * (VISUAL_CONFIG.nodeMaxSize - VISUAL_CONFIG.nodeMinSize);
      const emissiveIntensity = VISUAL_CONFIG.emissiveMinIntensity +
        (kEfficiency / 3.0) * (VISUAL_CONFIG.emissiveMaxIntensity - VISUAL_CONFIG.emissiveMinIntensity);
      
      const taskName = taskNames[i % taskNames.length];
      
      nodes.push({
        id: `node-${nodeIndex}`,
        name: `${taskName} ${Math.floor(i / taskNames.length) + 1}`,
        cluster: cluster.id,
        kEfficiency,
        iInteraction,
        omegaEntropy,
        rGrowth: (Math.random() - 0.3) * 0.5,
        status,
        lastExecuted: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        executionCount: Math.floor(Math.random() * 1000),
        position,
        orbitRadius: radius,
        orbitSpeed: VISUAL_CONFIG.orbitSpeedMin + 
          Math.random() * (VISUAL_CONFIG.orbitSpeedMax - VISUAL_CONFIG.orbitSpeedMin),
        orbitPhase: angle,
        size,
        emissiveIntensity,
      });
      
      nodeIndex++;
    }
  }
  
  return nodes;
}

// 연결 생성 함수
function generateConnections(nodes: TaskNode[]): NodeConnection[] {
  const connections: NodeConnection[] = [];
  const connectionCount = Math.floor(nodes.length * 0.15); // 15% 연결
  
  for (let i = 0; i < connectionCount; i++) {
    const sourceIdx = Math.floor(Math.random() * nodes.length);
    let targetIdx = Math.floor(Math.random() * nodes.length);
    
    // 같은 노드 피하기
    while (targetIdx === sourceIdx) {
      targetIdx = Math.floor(Math.random() * nodes.length);
    }
    
    const source = nodes[sourceIdx];
    const target = nodes[targetIdx];
    
    // I-Index 계산 (두 노드의 상호작용)
    const iIndex = (source.iInteraction + target.iInteraction) / 2;
    const isConflict = iIndex < -0.3;
    
    connections.push({
      sourceId: source.id,
      targetId: target.id,
      strength: Math.abs(iIndex),
      iIndex,
      isConflict,
    });
  }
  
  return connections;
}

// 시스템 상태 계산
function calculateSystemState(nodes: TaskNode[]): GalaxySystemState {
  const activeNodes = nodes.filter(n => n.status === 'active').length;
  const pendingExtinction = nodes.filter(n => 
    n.kEfficiency < 0.5 || n.omegaEntropy > 0.8
  ).length;
  
  const avgK = nodes.reduce((sum, n) => sum + n.kEfficiency, 0) / nodes.length;
  const avgI = nodes.reduce((sum, n) => sum + n.iInteraction, 0) / nodes.length;
  const avgOmega = nodes.reduce((sum, n) => sum + n.omegaEntropy, 0) / nodes.length;
  const avgR = nodes.reduce((sum, n) => sum + n.rGrowth, 0) / nodes.length;
  
  // 사용자 K 값 (전체 평균 기반)
  const userK = avgK * 1.2;
  
  return {
    userNode: {
      kValue: userK,
      hierarchyLevel: userK >= 2.5 ? 1 : userK >= 1.8 ? 12 : 144,
      tierName: userK >= 2.5 ? 'Core' : userK >= 1.8 ? 'Synapse' : 'General',
      gravityScore: userK * (1 + avgI) * (1 - avgOmega),
    },
    totalNodes: nodes.length,
    activeNodes,
    pendingExtinction,
    totalReward: nodes.reduce((sum, n) => sum + n.kEfficiency * 100, 0),
    avgK,
    avgI,
    avgOmega,
    avgR,
    pipelineStatus: 'running',
    lastUpdate: new Date(),
  };
}

export const useGalaxyStore = create<GalaxyStore>((set, get) => ({
  // 초기 데이터
  nodes: [],
  clusters: GALAXY_CLUSTERS,
  connections: [],
  systemState: {
    userNode: { kValue: 2.1, hierarchyLevel: 12, tierName: 'Synapse', gravityScore: 2.5 },
    totalNodes: 570,
    activeNodes: 534,
    pendingExtinction: 12,
    totalReward: 84700,
    avgK: 1.82,
    avgI: 0.47,
    avgOmega: 0.24,
    avgR: 0.12,
    pipelineStatus: 'running',
    lastUpdate: new Date(),
  },
  
  // UI 상태
  selectedNode: { node: null, cluster: null },
  hoveredCluster: null,
  cameraState: {
    position: [0, 15, 35],
    target: [0, 0, 0],
    fov: 60,
    zoom: 1,
  },
  isPaused: false,
  showConnections: true,
  showLabels: false,
  
  // 필터
  filterByStatus: 'all',
  filterByCluster: 'all',
  
  // 액션
  setSelectedNode: (node, cluster) => set({ 
    selectedNode: { node, cluster } 
  }),
  
  setHoveredCluster: (cluster) => set({ hoveredCluster: cluster }),
  
  setCameraState: (state) => set((s) => ({ 
    cameraState: { ...s.cameraState, ...state } 
  })),
  
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  
  toggleConnections: () => set((s) => ({ showConnections: !s.showConnections })),
  
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  
  setFilterByStatus: (status) => set({ filterByStatus: status }),
  
  setFilterByCluster: (cluster) => set({ filterByCluster: cluster }),
  
  updateNodeMetrics: (nodeId, metrics) => set((s) => ({
    nodes: s.nodes.map(n => n.id === nodeId ? { ...n, ...metrics } : n),
  })),
  
  triggerExtinction: (nodeId) => set((s) => ({
    nodes: s.nodes.filter(n => n.id !== nodeId),
    systemState: {
      ...s.systemState,
      totalNodes: s.systemState.totalNodes - 1,
      pendingExtinction: s.systemState.pendingExtinction - 1,
    },
  })),
  
  // 초기화
  initializeNodes: () => {
    const nodes = generateNodes();
    const connections = generateConnections(nodes);
    const systemState = calculateSystemState(nodes);
    
    set({ nodes, connections, systemState });
  },
}));
