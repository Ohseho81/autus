// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galactic Command Center Types
// ═══════════════════════════════════════════════════════════════════════════════

import { Vector3 } from 'three';

// 8개 Galaxy Cluster (업무 도메인)
export type GalaxyClusterType = 
  | 'finance'      // 재무/회계
  | 'hr'           // 인사/노무
  | 'sales'        // 영업/마케팅
  | 'operations'   // 운영/물류
  | 'legal'        // 법무/컴플라이언스
  | 'it'           // IT/시스템
  | 'strategy'     // 전략/기획
  | 'service';     // 고객 서비스

// 노드 상태
export type NodeStatus = 'active' | 'pending' | 'warning' | 'critical' | 'dormant';

// 단일 업무 노드
export interface TaskNode {
  id: string;
  name: string;
  cluster: GalaxyClusterType;
  
  // K·I·Ω·r 메트릭
  kEfficiency: number;    // 0.1 ~ 3.0
  iInteraction: number;   // -1.0 ~ +1.0
  omegaEntropy: number;   // 0.0 ~ 1.0
  rGrowth: number;        // 가변
  
  // 상태
  status: NodeStatus;
  lastExecuted?: Date;
  executionCount: number;
  
  // 3D 위치 (공전 궤도)
  position: Vector3;
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;     // 초기 위상
  
  // 시각화
  size: number;
  emissiveIntensity: number;
}

// Galaxy Cluster (8개 성단)
export interface GalaxyCluster {
  id: GalaxyClusterType;
  name: string;
  nameKo: string;
  color: string;
  emissiveColor: string;
  nodeCount: number;
  
  // 중심 위치 (중앙 User Node 기준)
  centerPosition: Vector3;
  orbitRadius: number;
  
  // 클러스터 메트릭
  avgK: number;
  avgI: number;
  avgOmega: number;
  totalNodes: number;
  activeNodes: number;
}

// 노드 간 연결
export interface NodeConnection {
  sourceId: string;
  targetId: string;
  strength: number;       // 연결 강도
  iIndex: number;         // 상호작용 지수
  isConflict: boolean;    // 갈등 여부
}

// 시스템 전체 상태
export interface GalaxySystemState {
  // 중앙 User Node
  userNode: {
    kValue: number;
    hierarchyLevel: 1 | 12 | 144;
    tierName: string;
    gravityScore: number;
  };
  
  // 전체 통계
  totalNodes: number;
  activeNodes: number;
  pendingExtinction: number;
  totalReward: number;
  
  // 실시간 메트릭
  avgK: number;
  avgI: number;
  avgOmega: number;
  avgR: number;
  
  // 시스템 상태
  pipelineStatus: 'running' | 'paused' | 'error';
  lastUpdate: Date;
}

// 카메라 상태
export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  zoom: number;
}

// 선택된 노드
export interface SelectedNode {
  node: TaskNode | null;
  cluster: GalaxyCluster | null;
}
