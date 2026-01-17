// ═══════════════════════════════════════════════════════════════════════════════
//
//                     AUTUS React Query 훅
//                     
//                     K/I API 엔드포인트 소비
//                     - useEntityState: K/I 현재 상태
//                     - useNodes48: 48노드 데이터
//                     - useSlots144: 144슬롯 데이터
//                     - usePrediction: 궤적 예측
//                     - useAutomationTasks: DAROE 자동화
//                     - useAlerts: 경고
//                     - useRealtimeKI: SSE 실시간
//
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions 
} from '@tanstack/react-query';
import { useEffect, useRef, useCallback, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type Phase = 'GROWTH' | 'STABLE' | 'DECLINE' | 'CRISIS';
export type NodeType = 'A' | 'D' | 'E';
export type Meta = 'RESOURCE' | 'RELATION' | 'ACTION' | 'FLOW';
export type Domain = 'SURVIVE' | 'GROW' | 'RELATE' | 'EXPRESS';
export type Trend = 'UP' | 'DOWN' | 'STABLE';
export type FillStatus = 'FILLED' | 'EMPTY' | 'PARTIAL';
export type TaskStage = 'DISCOVERY' | 'ANALYSIS' | 'REDESIGN' | 'OPTIMIZATION' | 'ELIMINATION';
export type TaskStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface KIState {
  entity_id: string;
  k_index: number;
  i_index: number;
  dk_dt: number;
  di_dt: number;
  phase: Phase;
  last_updated: string;
  confidence: number;
}

export interface Node48Value {
  node_id: string;
  meta: Meta;
  domain: Domain;
  type: NodeType;
  value: number;
  weight: number;
  trend: Trend;
  last_updated: string;
}

export interface Nodes48Response {
  entity_id: string;
  nodes: Node48Value[];
  k_index: number;
  domain_scores: Record<Domain, number>;
}

export interface Slot144Value {
  slot_id: string;
  relation_type: string;
  slot_number: number;
  entity_name: string | null;
  i_score: number;
  interaction_count: number;
  last_interaction: string | null;
  fill_status: FillStatus;
}

export interface Slots144Response {
  entity_id: string;
  slots: Slot144Value[];
  i_index: number;
  fill_rate: number;
  type_distribution: Record<string, number>;
}

export interface TrajectoryPoint {
  timestamp: string;
  k_predicted: number;
  i_predicted: number;
  k_lower: number;
  k_upper: number;
  i_lower: number;
  i_upper: number;
  confidence: number;
}

export interface PredictionResponse {
  entity_id: string;
  current: KIState;
  trajectory: TrajectoryPoint[];
  horizon_days: number;
  predicted_phase: string;
  risk_level: RiskLevel;
  key_factors: string[];
}

export interface AutomationTask {
  task_id: string;
  entity_id: string;
  stage: TaskStage;
  status: TaskStatus;
  title: string;
  description: string;
  impact_k: number;
  impact_i: number;
  confidence: number;
  created_at: string;
  deadline: string | null;
  auto_approve: boolean;
}

export interface Alert {
  alert_id: string;
  entity_id: string;
  severity: Severity;
  category: string;
  title: string;
  message: string;
  triggered_at: string;
  acknowledged: boolean;
  resolved: boolean;
  related_nodes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// API 클라이언트
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Query Keys (캐시 키 관리)
// ═══════════════════════════════════════════════════════════════════════════════

export const kiQueryKeys = {
  all: ['ki'] as const,
  
  // K/I State
  state: (entityId: string) => [...kiQueryKeys.all, 'state', entityId] as const,
  stateHistory: (entityId: string, days: number) => 
    [...kiQueryKeys.state(entityId), 'history', days] as const,
  
  // 48 Nodes
  nodes: (entityId: string) => [...kiQueryKeys.all, 'nodes', entityId] as const,
  nodeDetail: (entityId: string, nodeId: string) => 
    [...kiQueryKeys.nodes(entityId), nodeId] as const,
  
  // 144 Slots
  slots: (entityId: string) => [...kiQueryKeys.all, 'slots', entityId] as const,
  slotDetail: (entityId: string, slotId: string) => 
    [...kiQueryKeys.slots(entityId), slotId] as const,
  
  // Prediction
  prediction: (entityId: string, days: number) => 
    [...kiQueryKeys.all, 'prediction', entityId, days] as const,
  
  // Automation
  tasks: (entityId: string) => [...kiQueryKeys.all, 'tasks', entityId] as const,
  
  // Alerts
  alerts: (entityId: string) => [...kiQueryKeys.all, 'alerts', entityId] as const,
  
  // Meta
  meta: () => [...kiQueryKeys.all, 'meta'] as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. useEntityState - K/I 현재 상태
// ═══════════════════════════════════════════════════════════════════════════════

export function useEntityState(
  entityId: string,
  options?: Omit<UseQueryOptions<KIState>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: kiQueryKeys.state(entityId),
    queryFn: () => fetchAPI<KIState>(`/api/ki/state/${entityId}`),
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 자동 리프레시
    ...options,
  });
}

export function useEntityStateHistory(
  entityId: string,
  days: number = 30,
  interval: 'hour' | 'day' | 'week' = 'day'
) {
  return useQuery({
    queryKey: kiQueryKeys.stateHistory(entityId, days),
    queryFn: () => fetchAPI<{ data: Array<{ timestamp: string; k: number; i: number }> }>(
      `/api/ki/state/${entityId}/history?days=${days}&interval=${interval}`
    ),
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. useNodes48 - 48노드 데이터
// ═══════════════════════════════════════════════════════════════════════════════

export function useNodes48(
  entityId: string,
  options?: Omit<UseQueryOptions<Nodes48Response>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: kiQueryKeys.nodes(entityId),
    queryFn: () => fetchAPI<Nodes48Response>(`/api/ki/nodes/${entityId}`),
    staleTime: 60 * 1000, // 1분
    ...options,
  });
}

export function useNodeDetail(entityId: string, nodeId: string) {
  return useQuery({
    queryKey: kiQueryKeys.nodeDetail(entityId, nodeId),
    queryFn: () => fetchAPI<Node48Value & { history: any[]; contributing_sources: any[] }>(
      `/api/ki/nodes/${entityId}/${nodeId}`
    ),
    enabled: !!nodeId,
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ entityId, nodeId, value }: { entityId: string; nodeId: string; value: number }) =>
      fetchAPI(`/api/ki/nodes/${entityId}/${nodeId}?value=${value}`, { method: 'PATCH' }),
    onSuccess: (_, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.nodes(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.state(variables.entityId) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. useSlots144 - 144슬롯 데이터
// ═══════════════════════════════════════════════════════════════════════════════

export function useSlots144(
  entityId: string,
  options?: Omit<UseQueryOptions<Slots144Response>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: kiQueryKeys.slots(entityId),
    queryFn: () => fetchAPI<Slots144Response>(`/api/ki/slots/${entityId}`),
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useSlotDetail(entityId: string, slotId: string) {
  return useQuery({
    queryKey: kiQueryKeys.slotDetail(entityId, slotId),
    queryFn: () => fetchAPI(`/api/ki/slots/${entityId}/${slotId}`),
    enabled: !!slotId,
  });
}

export function useUpdateSlot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      entityId, 
      slotId, 
      entityName, 
      iScore 
    }: { 
      entityId: string; 
      slotId: string; 
      entityName: string; 
      iScore: number 
    }) =>
      fetchAPI(`/api/ki/slots/${entityId}/${slotId}?entity_name=${entityName}&i_score=${iScore}`, { 
        method: 'PUT' 
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.slots(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.state(variables.entityId) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. usePrediction - 궤적 예측
// ═══════════════════════════════════════════════════════════════════════════════

export function usePrediction(
  entityId: string,
  horizonDays: number = 30,
  scenarios: number = 100,
  options?: Omit<UseQueryOptions<PredictionResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: kiQueryKeys.prediction(entityId, horizonDays),
    queryFn: () => fetchAPI<PredictionResponse>(
      `/api/ki/predict/${entityId}?horizon_days=${horizonDays}&scenarios=${scenarios}`
    ),
    staleTime: 5 * 60 * 1000, // 5분 (예측은 자주 바뀌지 않음)
    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. useAutomationTasks - DAROE 자동화
// ═══════════════════════════════════════════════════════════════════════════════

export function useAutomationTasks(
  entityId: string,
  filters?: { stage?: TaskStage; status?: TaskStatus; limit?: number }
) {
  const params = new URLSearchParams();
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.limit) params.set('limit', String(filters.limit));
  
  return useQuery({
    queryKey: kiQueryKeys.tasks(entityId),
    queryFn: () => fetchAPI<AutomationTask[]>(
      `/api/ki/automation/tasks/${entityId}?${params.toString()}`
    ),
    staleTime: 30 * 1000,
  });
}

export function useApproveTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ taskId, approved, comment }: { taskId: string; approved: boolean; comment?: string }) =>
      fetchAPI('/api/ki/automation/approve', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, approved, comment }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.all });
    },
  });
}

export function useExecuteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (taskId: string) =>
      fetchAPI(`/api/ki/automation/execute/${taskId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. useAlerts - 경고
// ═══════════════════════════════════════════════════════════════════════════════

export function useAlerts(
  entityId: string,
  filters?: { severity?: Severity; acknowledged?: boolean; limit?: number }
) {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.acknowledged !== undefined) params.set('acknowledged', String(filters.acknowledged));
  if (filters?.limit) params.set('limit', String(filters.limit));
  
  return useQuery({
    queryKey: kiQueryKeys.alerts(entityId),
    queryFn: () => fetchAPI<Alert[]>(
      `/api/ki/alerts/${entityId}?${params.toString()}`
    ),
    staleTime: 15 * 1000, // 15초 (경고는 자주 업데이트)
    refetchInterval: 30 * 1000,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (alertId: string) =>
      fetchAPI(`/api/ki/alerts/${alertId}/acknowledge`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.all });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (alertId: string) =>
      fetchAPI(`/api/ki/alerts/${alertId}/resolve`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. useRealtimeKI - SSE 실시간 연동
// ═══════════════════════════════════════════════════════════════════════════════

interface RealtimeKIData {
  entity_id: string;
  k_index: number;
  i_index: number;
  timestamp: string;
}

export function useRealtimeKI(entityId: string, enabled: boolean = true) {
  const [data, setData] = useState<RealtimeKIData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!enabled) return;
    
    // 기존 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${API_BASE}/api/ki/stream/${entityId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const newData: RealtimeKIData = JSON.parse(event.data);
        setData(newData);
        
        // React Query 캐시도 업데이트 (옵티미스틱)
        queryClient.setQueryData(kiQueryKeys.state(entityId), (old: KIState | undefined) => {
          if (!old) return old;
          return {
            ...old,
            k_index: newData.k_index,
            i_index: newData.i_index,
            last_updated: newData.timestamp,
          };
        });
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = (e) => {
      setIsConnected(false);
      setError(new Error('SSE connection lost'));
      
      // 자동 재연결 (5초 후)
      setTimeout(connect, 5000);
    };
  }, [entityId, enabled, queryClient]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    data,
    isConnected,
    error,
    reconnect: connect,
    disconnect,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. useCalculateKI - K/I 재계산
// ═══════════════════════════════════════════════════════════════════════════════

interface CalculateRequest {
  entityId: string;
  nodeUpdates?: Record<string, number>;
  slotUpdates?: Record<string, number>;
  recalculateAll?: boolean;
}

export function useCalculateKI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ entityId, nodeUpdates, slotUpdates, recalculateAll }: CalculateRequest) =>
      fetchAPI<KIState>('/api/ki/calculate', {
        method: 'POST',
        body: JSON.stringify({
          entity_id: entityId,
          node_updates: nodeUpdates,
          slot_updates: slotUpdates,
          recalculate_all: recalculateAll,
        }),
      }),
    onSuccess: (data, variables) => {
      // 캐시 직접 업데이트
      queryClient.setQueryData(kiQueryKeys.state(variables.entityId), data);
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.nodes(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.slots(variables.entityId) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. useMeta - 메타데이터
// ═══════════════════════════════════════════════════════════════════════════════

export function useNodesMeta() {
  return useQuery({
    queryKey: [...kiQueryKeys.meta(), 'nodes'],
    queryFn: () => fetchAPI('/api/ki/meta/nodes'),
    staleTime: Infinity, // 메타데이터는 변하지 않음
    gcTime: Infinity,
  });
}

export function useSlotsMeta() {
  return useQuery({
    queryKey: [...kiQueryKeys.meta(), 'slots'],
    queryFn: () => fetchAPI('/api/ki/meta/slots'),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function usePhasesMeta() {
  return useQuery({
    queryKey: [...kiQueryKeys.meta(), 'phases'],
    queryFn: () => fetchAPI('/api/ki/meta/phases'),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. 조합 훅 - 대시보드용
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 대시보드에서 필요한 모든 데이터를 한번에 가져오기
 */
export function useDashboardData(entityId: string) {
  const state = useEntityState(entityId);
  const nodes = useNodes48(entityId);
  const slots = useSlots144(entityId);
  const prediction = usePrediction(entityId, 30);
  const tasks = useAutomationTasks(entityId, { limit: 5 });
  const alerts = useAlerts(entityId, { acknowledged: false, limit: 10 });
  const realtime = useRealtimeKI(entityId);

  return {
    // 로딩 상태
    isLoading: state.isLoading || nodes.isLoading || slots.isLoading,
    isError: state.isError || nodes.isError || slots.isError,
    
    // 데이터
    state: state.data,
    nodes: nodes.data,
    slots: slots.data,
    prediction: prediction.data,
    tasks: tasks.data,
    alerts: alerts.data,
    
    // 실시간
    realtime: realtime.data,
    isRealtimeConnected: realtime.isConnected,
    
    // 리프레시 함수
    refetch: () => {
      state.refetch();
      nodes.refetch();
      slots.refetch();
      prediction.refetch();
      tasks.refetch();
      alerts.refetch();
    },
  };
}

// 타입은 위에서 이미 export됨
