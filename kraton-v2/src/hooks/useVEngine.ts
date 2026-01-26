// ═══════════════════════════════════════════════════════════════════════════════
// 🏛️ AUTUS V-Engine Hook
// 실시간 V 지수 및 물리 엔진 연동
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Note: Supabase client will be used when not in mock mode
// import { db, realtime } from '../lib/supabase/client.ts';
import type { VNode, VFlow, VSnapshot, VTier } from '../lib/supabase/types';

// ============================================
// TYPES
// ============================================

export interface VEngineState {
  nodes: VNode[];
  flows: VFlow[];
  snapshot: VSnapshot | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

export interface VEngineMetrics {
  totalVIndex: number;
  totalMint: number;
  totalBurn: number;
  sqValue: number;
  tierDistribution: Record<VTier, number>;
  activeNodes: number;
  ghostNodes: number;
  flowRate: number; // 분당 흐름 수
}

export interface VNodeWithFlow extends VNode {
  recentFlows: VFlow[];
  flowDirection: 'in' | 'out' | 'neutral';
  momentum: number; // 최근 변화량
}

// ============================================
// CONSTANTS
// ============================================

const TIER_THRESHOLDS = {
  T1: 1000,
  T2: 500,
  T3: 100,
  T4: 0,
  Ghost: -Infinity,
};

const SYNERGY_BASE = 1.05;
const MOCK_UPDATE_INTERVAL = 3000; // 3초

// ============================================
// MOCK DATA GENERATOR
// ============================================

const generateMockNodes = (count: number): VNode[] => {
  const nodeTypes = ['student', 'teacher', 'class', 'product', 'service'] as const;
  const tiers: VTier[] = ['T1', 'T2', 'T3', 'T4', 'Ghost'];
  
  return Array.from({ length: count }, (_, i) => {
    const vIndex = Math.random() * 1500 - 200;
    const tier = vIndex >= 1000 ? 'T1' : vIndex >= 500 ? 'T2' : vIndex >= 100 ? 'T3' : vIndex >= 0 ? 'T4' : 'Ghost';
    
    return {
      id: `node-${i}`,
      organization_id: 'org-1',
      external_id: `ext-${i}`,
      node_type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
      name: `Node ${i}`,
      v_index: vIndex,
      tier,
      mint_total: Math.random() * 10000,
      burn_total: Math.random() * 5000,
      last_activity_at: new Date().toISOString(),
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
};

const generateMockFlows = (nodes: VNode[], count: number): VFlow[] => {
  const flowTypes = ['mint', 'burn', 'transfer', 'reward'] as const;
  
  return Array.from({ length: count }, (_, i) => {
    const fromNode = nodes[Math.floor(Math.random() * nodes.length)];
    const toNode = nodes[Math.floor(Math.random() * nodes.length)];
    
    return {
      id: `flow-${i}-${Date.now()}`,
      organization_id: 'org-1',
      from_node_id: fromNode?.id || null,
      to_node_id: toNode?.id || null,
      flow_type: flowTypes[Math.floor(Math.random() * flowTypes.length)],
      amount: Math.random() * 100,
      synergy_factor: 1 + Math.random() * 0.1,
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      source: 'system',
      metadata: {},
    };
  });
};

const generateMockSnapshot = (): VSnapshot => ({
  id: 'snapshot-1',
  organization_id: 'org-1',
  snapshot_date: new Date().toISOString().split('T')[0],
  total_v_index: 45678.92,
  total_mint: 123456.78,
  total_burn: 45678.90,
  sq_value: 2.34,
  tier_distribution: { T1: 5, T2: 12, T3: 45, T4: 88, Ghost: 15 },
  metrics: {},
  created_at: new Date().toISOString(),
});

// ============================================
// MAIN HOOK
// ============================================

export function useVEngine(orgId: string = 'org-1', useMock: boolean = true) {
  const [state, setState] = useState<VEngineState>({
    nodes: [],
    flows: [],
    snapshot: null,
    isLoading: true,
    error: null,
    isConnected: false,
  });

  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // LOAD INITIAL DATA
  // ============================================

  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Mock 데이터 사용 (Supabase 연동은 추후 구현)
      const mockNodes = generateMockNodes(165);
      const mockFlows = generateMockFlows(mockNodes, 50);
      const mockSnapshot = generateMockSnapshot();

      setState({
        nodes: mockNodes,
        flows: mockFlows,
        snapshot: mockSnapshot,
        isLoading: false,
        error: null,
        isConnected: true,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
        isConnected: false,
      }));
    }
  }, [orgId, useMock]);

  // ============================================
  // REALTIME SUBSCRIPTION
  // ============================================

  const subscribeToRealtime = useCallback(() => {
    // Mock 실시간 업데이트
    mockIntervalRef.current = setInterval(() => {
      setState(prev => {
        // 랜덤 노드 업데이트
        const updatedNodes = prev.nodes.map(node => {
          if (Math.random() > 0.9) {
            const change = (Math.random() - 0.5) * 20;
            const newVIndex = node.v_index + change;
            const newTier = newVIndex >= 1000 ? 'T1' : newVIndex >= 500 ? 'T2' : newVIndex >= 100 ? 'T3' : newVIndex >= 0 ? 'T4' : 'Ghost';
            return {
              ...node,
              v_index: newVIndex,
              tier: newTier as VTier,
              mint_total: change > 0 ? node.mint_total + Math.abs(change) : node.mint_total,
              burn_total: change < 0 ? node.burn_total + Math.abs(change) : node.burn_total,
              updated_at: new Date().toISOString(),
            };
          }
          return node;
        });

        // 새 흐름 추가
        const newFlow: VFlow = {
          id: `flow-${Date.now()}`,
          organization_id: orgId,
          from_node_id: prev.nodes[Math.floor(Math.random() * prev.nodes.length)]?.id || null,
          to_node_id: prev.nodes[Math.floor(Math.random() * prev.nodes.length)]?.id || null,
          flow_type: Math.random() > 0.5 ? 'mint' : 'burn',
          amount: Math.random() * 50,
          synergy_factor: 1 + Math.random() * 0.05,
          timestamp: new Date().toISOString(),
          source: 'realtime',
          metadata: {},
        };

        return {
          ...prev,
          nodes: updatedNodes,
          flows: [newFlow, ...prev.flows.slice(0, 99)],
        };
      });
    }, MOCK_UPDATE_INTERVAL);
  }, [orgId, useMock]);

  // ============================================
  // CLEANUP
  // ============================================

  const cleanup = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    loadData();
    subscribeToRealtime();

    return cleanup;
  }, [loadData, subscribeToRealtime, cleanup]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const metrics = useMemo<VEngineMetrics>(() => {
    const { nodes, flows, snapshot } = state;

    const tierDistribution: Record<VTier, number> = {
      T1: 0, T2: 0, T3: 0, T4: 0, Ghost: 0,
    };

    let totalVIndex = 0;
    let totalMint = 0;
    let totalBurn = 0;

    nodes.forEach(node => {
      tierDistribution[node.tier]++;
      totalVIndex += node.v_index;
      totalMint += node.mint_total;
      totalBurn += node.burn_total;
    });

    // 최근 1분간 흐름 수 계산
    const oneMinuteAgo = Date.now() - 60000;
    const recentFlows = flows.filter(f => new Date(f.timestamp).getTime() > oneMinuteAgo);

    // SQ 계산: (Mint - Burn) / Time × Synergy
    const sqValue = snapshot?.sq_value || ((totalMint - totalBurn) / 30) * SYNERGY_BASE;

    return {
      totalVIndex,
      totalMint,
      totalBurn,
      sqValue,
      tierDistribution,
      activeNodes: nodes.filter(n => n.tier !== 'Ghost').length,
      ghostNodes: tierDistribution.Ghost,
      flowRate: recentFlows.length,
    };
  }, [state]);

  const nodesWithFlow = useMemo<VNodeWithFlow[]>(() => {
    const { nodes, flows } = state;
    const recentFlows = flows.slice(0, 50);

    return nodes.map(node => {
      const nodeFlows = recentFlows.filter(
        f => f.from_node_id === node.id || f.to_node_id === node.id
      );

      const inFlow = nodeFlows
        .filter(f => f.to_node_id === node.id)
        .reduce((sum, f) => sum + f.amount, 0);

      const outFlow = nodeFlows
        .filter(f => f.from_node_id === node.id)
        .reduce((sum, f) => sum + f.amount, 0);

      const momentum = inFlow - outFlow;
      const flowDirection = momentum > 0 ? 'in' : momentum < 0 ? 'out' : 'neutral';

      return {
        ...node,
        recentFlows: nodeFlows,
        flowDirection,
        momentum,
      };
    });
  }, [state]);

  const topNodes = useMemo(() => {
    return [...state.nodes]
      .sort((a, b) => b.v_index - a.v_index)
      .slice(0, 10);
  }, [state.nodes]);

  const recentActivity = useMemo(() => {
    return state.flows.slice(0, 20);
  }, [state.flows]);

  // ============================================
  // ACTIONS
  // ============================================

  const mintToNode = useCallback(async (nodeId: string, amount: number) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => 
        n.id === nodeId
          ? { ...n, mint_total: n.mint_total + amount, v_index: n.v_index + amount }
          : n
      ),
    }));
    return { success: true };
  }, []);

  const burnFromNode = useCallback(async (nodeId: string, amount: number) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => 
        n.id === nodeId
          ? { ...n, burn_total: n.burn_total + amount, v_index: n.v_index - amount }
          : n
      ),
    }));
    return { success: true };
  }, []);

  const createFlow = useCallback(async (
    fromNodeId: string | null,
    toNodeId: string | null,
    flowType: VFlow['flow_type'],
    amount: number
  ) => {
    const newFlow: VFlow = {
      id: `flow-${Date.now()}`,
      organization_id: orgId,
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      flow_type: flowType,
      amount,
      synergy_factor: SYNERGY_BASE,
      timestamp: new Date().toISOString(),
      source: 'manual',
      metadata: {},
    };

    setState(prev => ({
      ...prev,
      flows: [newFlow, ...prev.flows.slice(0, 99)],
    }));
    return { success: true, flow: newFlow };
  }, [orgId]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    ...state,
    
    // Computed
    metrics,
    nodesWithFlow,
    topNodes,
    recentActivity,
    
    // Actions
    mintToNode,
    burnFromNode,
    createFlow,
    refresh,
  };
}

// ============================================
// HELPER HOOKS
// ============================================

export function useVNode(nodeId: string) {
  const { nodes, flows } = useVEngine();
  
  const node = useMemo(() => 
    nodes.find(n => n.id === nodeId),
    [nodes, nodeId]
  );

  const nodeFlows = useMemo(() =>
    flows.filter(f => f.from_node_id === nodeId || f.to_node_id === nodeId),
    [flows, nodeId]
  );

  return { node, flows: nodeFlows };
}

export function useVMetrics() {
  const { metrics, snapshot } = useVEngine();
  return { metrics, snapshot };
}

export default useVEngine;
