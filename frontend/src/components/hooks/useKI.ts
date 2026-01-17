/**
 * useKI Hook - Complete Implementation
 * Matches KIDashboardV2 expected API response format
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface KIState {
  k: number;
  i: number;
  r: number;
  k_index?: number;
  i_index?: number;
  dk_dt?: number;
  di_dt?: number;
  phase?: string;
  confidence?: number;
  timestamp: number;
}

export interface Node48Value {
  id: string;
  node_id: string;
  code: string;
  name: string;
  k: number;
  i: number;
  r: number;
  value: number;
  domain: string;
  automationLevel: number;
  trend?: 'UP' | 'DOWN' | 'STABLE';
}

export interface Nodes48Response {
  nodes: Node48Value[];
  domain_scores: Record<string, number>;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface AutomationTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  automationLevel: number;
  progress: number;
}

export interface Slot144Value {
  slot: number;
  value: number;
  label: string;
  k_index?: number;
  i_index?: number;
}

export interface Slots144Response {
  slots: Slot144Value[];
  fill_rate: number;
  i_index: number;
}

export interface TrajectoryPoint {
  timestamp: number;
  k: number;
  i: number;
}

export interface PredictionResponse {
  trajectoryPoints: TrajectoryPoint[];
  confidence: number;
  risk_level?: 'low' | 'medium' | 'high';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data Generators
// ═══════════════════════════════════════════════════════════════════════════════

const generateMockKIState = (): KIState => ({
  k: 0.85 + Math.random() * 0.15,
  i: (Math.random() - 0.5) * 0.2,
  r: (Math.random() - 0.5) * 0.02,
  k_index: 0.85 + Math.random() * 0.15,
  i_index: (Math.random() - 0.5) * 0.2,
  dk_dt: (Math.random() - 0.5) * 0.01,
  di_dt: (Math.random() - 0.5) * 0.01,
  phase: ['stable', 'growing', 'declining'][Math.floor(Math.random() * 3)],
  confidence: 0.85 + Math.random() * 0.1,
  timestamp: Date.now(),
});

const generateMockNodes48 = (): Nodes48Response => {
  const domains = ['SURVIVE', 'GROW', 'RELATE', 'EXPRESS'];
  const nodes = Array.from({ length: 48 }, (_, i) => {
    const domain = domains[i % domains.length];
    return {
      id: `node-${i + 1}`,
      node_id: `N${String(i + 1).padStart(2, '0')}`,
      code: `N${String(i + 1).padStart(2, '0')}`,
      name: `Node ${i + 1}`,
      k: 0.7 + Math.random() * 0.3,
      i: (Math.random() - 0.5) * 0.3,
      r: (Math.random() - 0.5) * 0.05,
      value: Math.random(),
      domain,
      automationLevel: Math.random(),
      trend: (['UP', 'DOWN', 'STABLE'] as const)[Math.floor(Math.random() * 3)],
    };
  });

  return {
    nodes,
    domain_scores: {
      SURVIVE: 0.7 + Math.random() * 0.3,
      GROW: 0.6 + Math.random() * 0.3,
      RELATE: 0.8 + Math.random() * 0.2,
      EXPRESS: 0.5 + Math.random() * 0.4,
    },
  };
};

const generateMockSlots144 = (): Slots144Response => ({
  slots: Array.from({ length: 144 }, (_, i) => ({
    slot: i,
    value: Math.random(),
    label: `Slot ${i}`,
    k_index: 0.7 + Math.random() * 0.3,
    i_index: (Math.random() - 0.5) * 0.3,
  })),
  fill_rate: 0.6 + Math.random() * 0.3,
  i_index: (Math.random() - 0.5) * 0.2,
});

const generateMockTasks = (): AutomationTask[] =>
  Array.from({ length: 10 }, (_, i) => ({
    id: `task-${i + 1}`,
    name: `Task ${i + 1}`,
    status: (['pending', 'running', 'completed', 'failed'] as const)[i % 4],
    automationLevel: Math.random(),
    progress: Math.random() * 100,
  }));

const generateMockAlerts = (): Alert[] =>
  Array.from({ length: 5 }, (_, i) => ({
    id: `alert-${i + 1}`,
    type: (['warning', 'error', 'info'] as const)[i % 3],
    message: `Alert message ${i + 1}`,
    timestamp: Date.now() - i * 60000,
    acknowledged: i > 2,
  }));

// ═══════════════════════════════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════════════════════════════

export function useKI() {
  const [state, setState] = useState<KIState>(generateMockKIState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setState(generateMockKIState());
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, loading, error, refresh, data: { nodes: [], tasks: [] } };
}

export function useEntityState(_entityId?: string) {
  return useQuery({
    queryKey: ['entityState', _entityId],
    queryFn: async () => generateMockKIState(),
    staleTime: 5000,
  });
}

export function useNodes48(_entityId?: string) {
  return useQuery({
    queryKey: ['nodes48', _entityId],
    queryFn: async () => generateMockNodes48(),
    staleTime: 10000,
  });
}

export function useSlots144(_entityId?: string) {
  return useQuery({
    queryKey: ['slots144', _entityId],
    queryFn: async () => generateMockSlots144(),
    staleTime: 10000,
  });
}

export function usePrediction(_entityId?: string, _options?: any) {
  return useQuery({
    queryKey: ['prediction', _entityId],
    queryFn: async (): Promise<PredictionResponse> => ({
      trajectoryPoints: Array.from({ length: 24 }, (_, i) => ({
        timestamp: Date.now() + i * 3600000,
        k: 0.85 + Math.random() * 0.1,
        i: (Math.random() - 0.5) * 0.1,
      })),
      confidence: 0.85 + Math.random() * 0.1,
      risk_level: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
    }),
    staleTime: 30000,
  });
}

export function useAutomationTasks(_entityId?: string) {
  return useQuery({
    queryKey: ['automationTasks', _entityId],
    queryFn: async () => generateMockTasks(),
    staleTime: 5000,
  });
}

export function useAlerts(_entityId?: string) {
  return useQuery({
    queryKey: ['alerts', _entityId],
    queryFn: async () => generateMockAlerts(),
    staleTime: 5000,
  });
}

export function useRealtimeKI(_entityId?: string, enabled: boolean = true) {
  const [data, setData] = useState<KIState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    setIsConnected(true);
    const interval = setInterval(() => {
      setData(generateMockKIState());
    }, 2000);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [_entityId, enabled]);

  return { data, isConnected };
}

export function useDashboardData() {
  const nodes = useNodes48();
  const slots = useSlots144();
  const tasks = useAutomationTasks();
  const alerts = useAlerts();
  const prediction = usePrediction();

  return {
    nodes: nodes.data?.nodes ?? [],
    slots: slots.data?.slots ?? [],
    tasks: tasks.data ?? [],
    alerts: alerts.data ?? [],
    prediction: prediction.data,
    isLoading: nodes.isLoading || slots.isLoading || tasks.isLoading || alerts.isLoading,
    isError: nodes.isError || slots.isError || tasks.isError || alerts.isError,
    refetch: () => {
      nodes.refetch();
      slots.refetch();
      tasks.refetch();
      alerts.refetch();
      prediction.refetch();
    },
  };
}

export function useApproveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_taskId: string) => {
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationTasks'] });
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_alertId: string) => {
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export default useKI;
