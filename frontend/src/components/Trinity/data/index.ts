/**
 * AUTUS Trinity Data Module
 * ==========================
 * 
 * 72 Human Types × 72 Forces × 72 Nodes 통합 데이터 레이어
 * 
 * 사용법:
 * import { ALL_72_TYPES, ALL_72_FORCES, calculateTransformation } from '../Trinity/data';
 */

// ═══════════════════════════════════════════════════════════════════════════
// 72 Human Types (T/B/L)
// ═══════════════════════════════════════════════════════════════════════════
export {
  type NodeType,
  INVESTOR_TYPES,
  BUSINESS_TYPES,
  LABOR_TYPES,
  ALL_72_TYPES,
  getTypeById,
  getTypesByCategory,
} from './node72Types';

// ═══════════════════════════════════════════════════════════════════════════
// 72 Forces (6 Physics × 12 Actions)
// ═══════════════════════════════════════════════════════════════════════════
export {
  type ForceType,
  PHYSICS_NODES,
  ACTION_TYPES,
  ALL_72_FORCES,
  getForceById,
  getForcesByNode,
  getForcesByAction,
  getForcesByRarity,
} from './forceTypes';

// Type aliases for convenience
export type PhysicsNodeKey = keyof typeof import('./forceTypes').PHYSICS_NODES;
export type ActionTypeKey = keyof typeof import('./forceTypes').ACTION_TYPES;

// ═══════════════════════════════════════════════════════════════════════════
// Transformation Matrix (Human Type + Force → Result)
// ═══════════════════════════════════════════════════════════════════════════
export {
  type TransformationResult,
  calculateTransformation,
} from './transformationMatrix';

// ═══════════════════════════════════════════════════════════════════════════
// Type ↔ Node Mapping (Frontend ↔ Backend Bridge)
// ═══════════════════════════════════════════════════════════════════════════
export {
  type Node72,
  type TypeNodeMapping,
  type Event72_4,
  ALL_72_NODES,
  CORE_NODES,
  TYPE_NODE_MAPPINGS,
  getActiveNodesForType,
  getPrimaryNodeForType,
  getPhysicsNodeForType,
  getNodeById,
  isNodeActiveForType,
  getActiveNodeDetailsForType,
  getSharedActiveNodes,
  getNodeActivationStats,
  filterEventsForType,
  calculateEventImportance,
  MAPPING_STATS,
} from './typeNodeMapping';

// ═══════════════════════════════════════════════════════════════════════════
// 통합 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════

import { ALL_72_TYPES, getTypeById } from './node72Types';
import { ALL_72_FORCES, getForceById } from './forceTypes';
import { calculateTransformation, TransformationResult } from './transformationMatrix';
import { 
  getActiveNodesForType, 
  getPrimaryNodeForType,
  getPhysicsNodeForType,
  Node72,
  ALL_72_NODES,
  getNodeById
} from './typeNodeMapping';

/**
 * Human Type에게 Force를 적용한 결과와 활성 노드 정보를 함께 반환
 */
export function applyForceToType(
  humanTypeId: string,
  forceId: string
): {
  transformation: TransformationResult | null;
  activeNodes: Node72[];
  primaryNode: Node72 | undefined;
  physicsNode: string;
} {
  const humanType = getTypeById(humanTypeId);
  const force = getForceById(forceId);
  
  if (!humanType || !force) {
    return {
      transformation: null,
      activeNodes: [],
      primaryNode: undefined,
      physicsNode: 'CAPITAL'
    };
  }
  
  const transformation = calculateTransformation(humanType.id, force.id);
  const activeNodeIds = getActiveNodesForType(humanTypeId);
  const activeNodes = activeNodeIds
    .map(id => getNodeById(id))
    .filter((n): n is Node72 => n !== undefined);
  const primaryNodeId = getPrimaryNodeForType(humanTypeId);
  const primaryNode = getNodeById(primaryNodeId);
  const physicsNode = getPhysicsNodeForType(humanTypeId);
  
  return {
    transformation,
    activeNodes,
    primaryNode,
    physicsNode
  };
}

/**
 * 두 Human Type 간의 호환성 계산
 * (공유 노드 수 기반)
 */
export function calculateTypeCompatibility(
  typeIdA: string,
  typeIdB: string
): {
  compatibility: number;
  sharedNodes: string[];
  sharedNodeDetails: Node72[];
} {
  const nodesA = getActiveNodesForType(typeIdA);
  const nodesB = getActiveNodesForType(typeIdB);
  const sharedNodes = nodesA.filter(n => nodesB.includes(n));
  const sharedNodeDetails = sharedNodes
    .map(id => getNodeById(id))
    .filter((n): n is Node72 => n !== undefined);
  
  // 12개 중 공유 노드 비율
  const compatibility = sharedNodes.length / 12;
  
  return {
    compatibility,
    sharedNodes,
    sharedNodeDetails
  };
}

/**
 * 특정 Node가 어떤 Human Types에서 활성화되는지 조회
 */
export function getTypesForNode(nodeId: string): string[] {
  return ALL_72_TYPES
    .filter(type => getActiveNodesForType(type.id).includes(nodeId))
    .map(type => type.id);
}

/**
 * 특정 카테고리(T/B/L)의 Human Types와 그들의 활성 노드 통계
 */
export function getCategoryNodeStats(category: 'T' | 'B' | 'L'): {
  types: string[];
  nodeFrequency: Record<string, number>;
  mostCommonNodes: string[];
} {
  const types = ALL_72_TYPES
    .filter(t => t.id.startsWith(category))
    .map(t => t.id);
  
  const nodeFrequency: Record<string, number> = {};
  
  for (const typeId of types) {
    const activeNodes = getActiveNodesForType(typeId);
    for (const nodeId of activeNodes) {
      nodeFrequency[nodeId] = (nodeFrequency[nodeId] || 0) + 1;
    }
  }
  
  const sortedNodes = Object.entries(nodeFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([nodeId]) => nodeId);
  
  return {
    types,
    nodeFrequency,
    mostCommonNodes: sortedNodes.slice(0, 12)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 통계 정보
// ═══════════════════════════════════════════════════════════════════════════

export const AUTUS_STATS = {
  humanTypes: 72,
  forces: 72,
  nodes: 72,
  eventSpace: 72 ** 4,  // 26,873,856
  
  categories: {
    T: { name: '투자자', count: 24 },
    B: { name: '사업가', count: 24 },
    L: { name: '근로자', count: 24 },
  },
  
  physicsNodes: ['BIO', 'CAPITAL', 'NETWORK', 'KNOWLEDGE', 'TIME', 'EMOTION'],
  
  laws: [
    { id: 'L1', name: 'Conservation', nameKr: '보존' },
    { id: 'L2', name: 'Flow', nameKr: '흐름' },
    { id: 'L3', name: 'Inertia', nameKr: '관성' },
    { id: 'L4', name: 'Acceleration', nameKr: '가속' },
    { id: 'L5', name: 'Friction', nameKr: '마찰' },
    { id: 'L6', name: 'Gravity', nameKr: '중력' },
  ],
};
