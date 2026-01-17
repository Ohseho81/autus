/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS K/I React Query Hooks
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * K/I 상태, 48노드, 144슬롯, 예측, 자동화, 경고를 위한 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { 
  kiApi, automationApi, alertsApi,
  EntityState, NodesResponse, SlotsResponse, PredictionResponse,
  TasksResponse, AlertsResponse, HistoryResponse,
  EntityType, LoopPhase, TaskStatus, AlertSeverity
} from '../api/ki';

// ═══════════════════════════════════════════════════════════════════════════════
// Query Keys
// ═══════════════════════════════════════════════════════════════════════════════

export const kiQueryKeys = {
  state: (entityId: string) => ['ki', 'state', entityId] as const,
  nodes: (entityId: string) => ['ki', 'nodes', entityId] as const,
  slots: (entityId: string) => ['ki', 'slots', entityId] as const,
  prediction: (entityId: string, days: number) => ['ki', 'prediction', entityId, days] as const,
  history: (entityId: string, days: number) => ['ki', 'history', entityId, days] as const,
  tasks: (entityId: string) => ['automation', 'tasks', entityId] as const,
  alerts: (entityId: string) => ['alerts', entityId] as const,
  phaseInfo: () => ['ki', 'phase-info'] as const,
  relationTypes: () => ['ki', 'relation-types'] as const,
  automationPhases: () => ['automation', 'phases'] as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// K/I State Hook
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseEntityStateOptions {
  entityType?: EntityType;
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * 엔티티 K/I 상태 훅
 * 
 * @example
 * const { data, isLoading } = useEntityState('user-123');
 * console.log(data?.k, data?.i);
 */
export function useEntityState(entityId: string, options: UseEntityStateOptions = {}) {
  const { entityType = 'INDIVIDUAL', refetchInterval = 30000, enabled = true } = options;

  return useQuery({
    queryKey: kiQueryKeys.state(entityId),
    queryFn: () => kiApi.getState(entityId, entityType),
    refetchInterval,
    enabled: enabled && !!entityId,
    staleTime: 10000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 48 Nodes Hook
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 48노드 상세 훅
 * 
 * 4 메타카테고리 × 4 도메인 × 3 노드타입(A/D/E) = 48노드
 */
export function useNodes48(entityId: string, enabled = true) {
  return useQuery({
    queryKey: kiQueryKeys.nodes(entityId),
    queryFn: () => kiApi.getNodes(entityId),
    enabled: enabled && !!entityId,
    staleTime: 30000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 144 Slots Hook
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 144슬롯 상세 훅
 * 
 * 12 관계유형 × 12 슬롯 = 144슬롯
 */
export function useSlots144(entityId: string, enabled = true) {
  return useQuery({
    queryKey: kiQueryKeys.slots(entityId),
    queryFn: () => kiApi.getSlots(entityId),
    enabled: enabled && !!entityId,
    staleTime: 30000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Prediction Hook
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 궤적 예측 훅
 * 
 * @param days 예측 기간 (1~365일)
 */
export function usePrediction(entityId: string, days = 30, enabled = true) {
  return useQuery({
    queryKey: kiQueryKeys.prediction(entityId, days),
    queryFn: () => kiApi.predict(entityId, days),
    enabled: enabled && !!entityId,
    staleTime: 60000, // 1분
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// History Hook
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * K/I 히스토리 훅
 */
export function useKIHistory(entityId: string, days = 30, enabled = true) {
  return useQuery({
    queryKey: kiQueryKeys.history(entityId, days),
    queryFn: () => kiApi.getHistory(entityId, days),
    enabled: enabled && !!entityId,
    staleTime: 60000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Calculate Mutation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * K/I 재계산 뮤테이션
 */
export function useCalculateKI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      entityId, 
      nodeValues, 
      slotValues 
    }: { 
      entityId: string; 
      nodeValues?: Record<string, number>; 
      slotValues?: Record<string, number>; 
    }) => kiApi.calculate(entityId, nodeValues, slotValues),
    
    onSuccess: (data, variables) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.state(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.nodes(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.slots(variables.entityId) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Automation Hooks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 자동화 태스크 목록 훅
 */
export function useAutomationTasks(
  entityId: string, 
  phase?: LoopPhase, 
  status?: TaskStatus,
  enabled = true
) {
  return useQuery({
    queryKey: [...kiQueryKeys.tasks(entityId), phase, status],
    queryFn: () => automationApi.getTasks(entityId, phase, status),
    enabled: enabled && !!entityId,
    staleTime: 30000,
  });
}

/**
 * 태스크 승인 뮤테이션
 */
export function useApproveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, entityId }: { taskId: string; entityId: string }) => 
      automationApi.approveTask(taskId, entityId),
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.tasks(variables.entityId) });
    },
  });
}

/**
 * 태스크 거절 뮤테이션
 */
export function useRejectTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, entityId, reason }: { taskId: string; entityId: string; reason?: string }) => 
      automationApi.rejectTask(taskId, entityId, reason),
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.tasks(variables.entityId) });
    },
  });
}

/**
 * DAROE 5단계 정보 훅
 */
export function useAutomationPhases() {
  return useQuery({
    queryKey: kiQueryKeys.automationPhases(),
    queryFn: () => automationApi.getPhases(),
    staleTime: Infinity, // 정적 데이터
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Alerts Hooks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 경고 목록 훅
 */
export function useAlerts(
  entityId: string,
  severity?: AlertSeverity,
  acknowledged?: boolean,
  enabled = true
) {
  return useQuery({
    queryKey: [...kiQueryKeys.alerts(entityId), severity, acknowledged],
    queryFn: () => alertsApi.getAlerts(entityId, severity, acknowledged),
    enabled: enabled && !!entityId,
    refetchInterval: 30000, // 30초마다 갱신
  });
}

/**
 * 경고 확인 뮤테이션
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, entityId }: { alertId: string; entityId: string }) => 
      alertsApi.acknowledge(alertId, entityId),
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: kiQueryKeys.alerts(variables.entityId) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Meta Data Hooks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 임계점 상태 정보 훅
 */
export function usePhaseInfo() {
  return useQuery({
    queryKey: kiQueryKeys.phaseInfo(),
    queryFn: () => kiApi.getPhaseInfo(),
    staleTime: Infinity,
  });
}

/**
 * 12가지 관계 유형 정보 훅
 */
export function useRelationTypes() {
  return useQuery({
    queryKey: kiQueryKeys.relationTypes(),
    queryFn: () => kiApi.getRelationTypes(),
    staleTime: Infinity,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Combined Dashboard Hook
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 대시보드 전체 데이터 훅
 * 
 * K/I 상태, 예측, 태스크, 경고를 한번에 로드
 */
export function useDashboard(entityId: string, enabled = true) {
  const state = useEntityState(entityId, { enabled });
  const prediction = usePrediction(entityId, 30, enabled);
  const tasks = useAutomationTasks(entityId, undefined, undefined, enabled);
  const alerts = useAlerts(entityId, undefined, undefined, enabled);

  return {
    state: state.data,
    prediction: prediction.data,
    tasks: tasks.data,
    alerts: alerts.data,
    
    isLoading: state.isLoading || prediction.isLoading || tasks.isLoading || alerts.isLoading,
    isError: state.isError || prediction.isError || tasks.isError || alerts.isError,
    
    refetch: () => {
      state.refetch();
      prediction.refetch();
      tasks.refetch();
      alerts.refetch();
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Hook (WebSocket/SSE)
// ═══════════════════════════════════════════════════════════════════════════════

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

/**
 * 실시간 K/I 상태 훅 (WebSocket)
 */
export function useRealtimeKI(entityId: string, enabled = true) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  useEffect(() => {
    if (!enabled || !entityId) return;

    let ws: WebSocket | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(`${WS_BASE}/ws/ki/${entityId}`);

        ws.onopen = () => {
          setConnected(true);
          console.log('[K/I WS] Connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastEvent(data);

            // React Query 캐시 업데이트
            if (data.type === 'k_update' || data.type === 'i_update' || data.type === 'state_update') {
              queryClient.setQueryData(kiQueryKeys.state(entityId), (old: EntityState | undefined) => {
                if (!old) return old;
                return {
                  ...old,
                  k: data.k ?? old.k,
                  i: data.i ?? old.i,
                  dk_dt: data.dk_dt ?? old.dk_dt,
                  di_dt: data.di_dt ?? old.di_dt,
                  phase: data.phase ?? old.phase,
                  updated_at: data.timestamp ?? old.updated_at,
                };
              });
            }

            // 경고 알림
            if (data.type === 'alert') {
              queryClient.invalidateQueries({ queryKey: kiQueryKeys.alerts(entityId) });
            }
          } catch (e) {
            console.error('[K/I WS] Parse error:', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          console.log('[K/I WS] Disconnected');
          // 재연결 시도
          setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
          console.error('[K/I WS] Error:', error);
        };
      } catch (e) {
        console.error('[K/I WS] Connection error:', e);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [entityId, enabled, queryClient]);

  return { connected, lastEvent };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  useEntityState,
  useNodes48,
  useSlots144,
  usePrediction,
  useKIHistory,
  useCalculateKI,
  useAutomationTasks,
  useApproveTask,
  useRejectTask,
  useAutomationPhases,
  useAlerts,
  useAcknowledgeAlert,
  usePhaseInfo,
  useRelationTypes,
  useDashboard,
  useRealtimeKI,
};
