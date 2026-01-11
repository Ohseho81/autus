/**
 * AUTUS Mobile - useNodes Hook
 * 노드 관련 계산을 메모이제이션하여 최적화
 */

import { useMemo } from 'react';
import { useAutusStore } from '../stores/autusStore';
import { Node, NodeFilter, LayerId } from '../types';
import { LAYERS, LAYER_ORDER } from '../constants/layers';
import {
  getTop1Node,
  getDangerNodes,
  getActiveNodes,
  calculateEquilibrium,
  calculateStability,
} from '../utils/calculations';

export const useNodes = () => {
  const nodes = useAutusStore(state => state.nodes);
  
  const activeNodes = useMemo(() => getActiveNodes(nodes), [nodes]);
  const activeCount = useMemo(() => activeNodes.length, [activeNodes]);
  const topNode = useMemo(() => getTop1Node(nodes), [nodes]);
  const dangerNodes = useMemo(() => getDangerNodes(nodes), [nodes]);
  const equilibrium = useMemo(() => calculateEquilibrium(nodes), [nodes]);
  const stability = useMemo(() => calculateStability(nodes), [nodes]);
  
  return {
    nodes,
    activeNodes,
    activeCount,
    topNode,
    dangerNodes,
    equilibrium,
    stability,
  };
};

export const useFilteredNodes = (filter: NodeFilter) => {
  const nodes = useAutusStore(state => state.nodes);
  
  const filteredByLayer = useMemo(() => {
    const result: Record<LayerId, Node[]> = {
      L1: [], L2: [], L3: [], L4: [], L5: []
    };
    
    LAYER_ORDER.forEach(layerId => {
      const layer = LAYERS[layerId];
      let layerNodes = layer.nodeIds.map(id => nodes[id]);
      
      if (filter === 'active') {
        layerNodes = layerNodes.filter(n => n.active);
      } else if (filter === 'danger') {
        layerNodes = layerNodes.filter(n => n.state !== 'IGNORABLE');
      }
      
      result[layerId] = layerNodes;
    });
    
    return result;
  }, [nodes, filter]);
  
  return filteredByLayer;
};
