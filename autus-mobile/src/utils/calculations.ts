/**
 * AUTUS Mobile - Calculation Utilities
 */

import { Node, Circuit, NodeState } from '../types';

/**
 * 활성 노드 필터링
 */
export const getActiveNodes = (nodes: Record<string, Node>): Node[] => {
  return Object.values(nodes).filter(n => n.active);
};

/**
 * 위험 노드 필터링 (PRESSURING 또는 IRREVERSIBLE)
 */
export const getDangerNodes = (nodes: Record<string, Node>): Node[] => {
  return Object.values(nodes)
    .filter(n => n.state !== 'IGNORABLE')
    .sort((a, b) => b.pressure - a.pressure);
};

/**
 * Top-1 노드 추출 (가장 높은 압력)
 */
export const getTop1Node = (nodes: Record<string, Node>): Node | null => {
  const sorted = Object.values(nodes).sort((a, b) => b.pressure - a.pressure);
  return sorted[0] || null;
};

/**
 * 평형점 계산 (활성 노드 평균 압력)
 */
export const calculateEquilibrium = (nodes: Record<string, Node>): number => {
  const activeNodes = getActiveNodes(nodes);
  if (activeNodes.length === 0) return 0;
  const sum = activeNodes.reduce((acc, n) => acc + n.pressure, 0);
  return sum / activeNodes.length;
};

/**
 * 안정성 계산 (1 - 위험노드/활성노드)
 */
export const calculateStability = (nodes: Record<string, Node>): number => {
  const activeNodes = getActiveNodes(nodes);
  if (activeNodes.length === 0) return 1;
  const dangerNodes = activeNodes.filter(n => n.state !== 'IGNORABLE');
  return 1 - (dangerNodes.length / activeNodes.length);
};

/**
 * 회로값 계산 (구성 노드 평균 압력)
 */
export const calculateCircuitValue = (
  nodes: Record<string, Node>,
  circuit: Circuit
): number => {
  const circuitNodes = circuit.nodeIds
    .map(id => nodes[id])
    .filter(n => n !== undefined);
  
  if (circuitNodes.length === 0) return 0;
  const sum = circuitNodes.reduce((acc, n) => acc + n.pressure, 0);
  return sum / circuitNodes.length;
};

/**
 * 노드 상태 결정 (압력에 따라)
 */
export const determineNodeState = (pressure: number): NodeState => {
  if (pressure >= 0.7) return 'IRREVERSIBLE';
  if (pressure >= 0.3) return 'PRESSURING';
  return 'IGNORABLE';
};

/**
 * 압력에 따른 색상 반환
 */
export const getPressureColor = (pressure: number): string => {
  if (pressure >= 0.7) return '#ff3b3b';
  if (pressure >= 0.3) return '#ffa500';
  return '#00d46a';
};

/**
 * 상태에 따른 색상 반환
 */
export const getStateColor = (state: NodeState): string => {
  switch (state) {
    case 'IRREVERSIBLE': return '#ff3b3b';
    case 'PRESSURING': return '#ffa500';
    case 'IGNORABLE': return '#00d46a';
  }
};

/**
 * 상태에 따른 아이콘 반환
 */
export const getStateIcon = (state: NodeState): string => {
  switch (state) {
    case 'IRREVERSIBLE': return '🔴';
    case 'PRESSURING': return '🟡';
    case 'IGNORABLE': return '🟢';
  }
};
