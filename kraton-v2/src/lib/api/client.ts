// ============================================
// AUTUS API Client
// 표준화된 API 호출 유틸리티
// ============================================

// ============================================
// Types
// ============================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    timestamp: string;
    version: string;
  };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

// ============================================
// Configuration
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// ============================================
// Auth Token Management
// ============================================
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('autus_token', token);
  } else {
    localStorage.removeItem('autus_token');
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  authToken = localStorage.getItem('autus_token');
  return authToken;
}

// ============================================
// API Client
// ============================================
class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = this.defaultTimeout,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // 표준 응답 형식 확인
      if (typeof data.success === 'boolean') {
        return data as ApiResponse<T>;
      }

      // 비표준 응답 변환
      if (response.ok) {
        return {
          success: true,
          data: data as T,
        };
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  // HTTP Methods
  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// ============================================
// Singleton Instance
// ============================================
export const api = new ApiClient();

// ============================================
// Domain-Specific API Functions
// ============================================

// Auth
export const authApi = {
  verify: (role: string, credential: string, type: 'master_password' | 'approval_code') =>
    api.post<{ verified: boolean; sessionToken?: string }>('/auth/verify', { role, credential, type }),
  
  generateApprovalCode: (approverRole: string, targetRole: string, expiresInHours?: number) =>
    api.post<{ code: string; expiresAt: string }>('/auth/approval-code', { approverRole, targetRole, expiresInHours }),
  
  getApprovalCodes: (role?: string) =>
    api.get<{ codes: Array<{ id: string; code: string; targetRole: string; expiresAt: string }> }>(`/auth/approval-code${role ? `?role=${role}` : ''}`),
};

// Physics
export const physicsApi = {
  getState: (orgId?: string) =>
    api.get<{ v_index: number; total_nodes: number; metrics: unknown }>(`/physics${orgId ? `?org_id=${orgId}` : ''}`),
  
  updateMetrics: (nodeId: string, metrics: Record<string, number>) =>
    api.post<{ updated: boolean }>('/physics/update', { node_id: nodeId, metrics }),
};

// Value
export const valueApi = {
  getDashboard: (orgId?: string) =>
    api.get<{ total_value: number; nodes: unknown[]; relationships: unknown[] }>(`/autus/value${orgId ? `?org_id=${orgId}` : ''}`),
  
  calculateValue: (params: { lambda: number; time_stu: number; density: number }) =>
    api.post<{ value: number; formula: string }>('/autus/value', { action: 'calculate', ...params }),
};

// Lambda
export const lambdaApi = {
  getNodeLambda: (nodeId: string) =>
    api.get<{ lambda: number; factors: Record<string, number> }>(`/autus/lambda?node_id=${nodeId}`),
  
  updateLambda: (nodeId: string, factors: { replaceability?: number; influence?: number; expertise?: number; network?: number }) =>
    api.post<{ lambda: number }>('/autus/lambda', { node_id: nodeId, factors }),
};

// Risk Queue
export const riskApi = {
  getQueue: (status?: string, limit?: number) =>
    api.get<{ items: unknown[]; total: number }>(`/risks?status=${status || 'pending'}&limit=${limit || 20}`),
  
  updateStatus: (riskId: string, status: 'in_progress' | 'resolved' | 'escalated', notes?: string) =>
    api.patch<{ updated: boolean }>(`/risks/${riskId}`, { status, resolution_notes: notes }),
  
  escalate: (riskId: string, reason: string) =>
    api.post<{ escalated: boolean }>(`/risks/${riskId}/escalate`, { reason }),
};

// Time Value
export const timeApi = {
  getDashboard: (nodeId?: string) =>
    api.get<{ t1: number; t2: number; t3: number; ntv: number }>(`/time-value${nodeId ? `?node_id=${nodeId}` : ''}`),
  
  recordActivity: (activity: { from_node_id: string; time_type: string; real_minutes: number; activity_type: string }) =>
    api.post<{ recorded: boolean; stu_value: number }>('/time-value', activity),
};

// Efficiency
export const efficiencyApi = {
  getMetrics: (orgId?: string) =>
    api.get<{ efficiency_ratio: number; level: string }>(`/autus/efficiency${orgId ? `?org_id=${orgId}` : ''}`),
  
  calculate: (inputValue: number, outputValue: number) =>
    api.post<{ efficiency: number; level: string }>('/autus/efficiency', { input_value: inputValue, output_value: outputValue }),
};

// Sigma Proxy
export const sigmaApi = {
  predict: (indicators: { responseSpeed: number; engagementRate: number; completionRate: number; sentimentScore: number; renewalHistory: number }) =>
    api.post<{ sigma: number; confidence: number }>('/autus/sigma-proxy', { action: 'predict', indicators }),
  
  reverse: (resultValue: number, inputValue: number) =>
    api.post<{ sigma: number }>('/autus/sigma-proxy', { action: 'reverse', result_value: resultValue, input_value: inputValue }),
};

// Assets
export const assetsApi = {
  getPortfolio: (orgId?: string) =>
    api.get<{ assets: unknown[]; total_value: number }>(`/autus/assets${orgId ? `?org_id=${orgId}` : ''}`),
  
  addAsset: (asset: { asset_type: string; source_name: string; t_value: number; sigma_value: number }) =>
    api.post<{ asset: unknown; a_value: number }>('/autus/assets', { action: 'add', ...asset }),
};

// Quick Tag
export const quickTagApi = {
  submit: (tag: { node_id: string; tag_type: string; tag_value: string; emoji?: string; sentiment?: number }) =>
    api.post<{ recorded: boolean }>('/quick-tag', tag),
  
  getRecent: (nodeId: string, limit?: number) =>
    api.get<{ tags: unknown[] }>(`/quick-tag?node_id=${nodeId}&limit=${limit || 10}`),
};

// Global Consolidation
export const globalApi = {
  getConsolidation: () =>
    api.get<{ korea_v: number; philippines_v: number; consolidated_v: number; exit_value: number }>('/global/consolidate'),
  
  runConsolidation: () =>
    api.post<{ consolidated: boolean; result: unknown }>('/global/consolidate'),
};

// Leaderboard
export const leaderboardApi = {
  getVRanking: (limit?: number) =>
    api.get<{ rankings: unknown[] }>(`/leaderboard?limit=${limit || 10}`),
};

// Notify
export const notifyApi = {
  send: (notification: { type: string; target: string; message: string; channel?: string }) =>
    api.post<{ sent: boolean; cost?: number }>('/notify', notification),
};

// ============================================
// AUTUS v2.1 APIs (A = T^σ)
// ============================================

// Nodes (노드 관리)
export const nodesApi = {
  getAll: (orgId?: string, type?: string) =>
    api.get<{ nodes: unknown[]; stats: unknown }>(`/autus/nodes?${orgId ? `orgId=${orgId}&` : ''}${type ? `type=${type}` : ''}`),
  
  getById: (nodeId: string) =>
    api.get<{ node: unknown }>(`/autus/nodes?id=${nodeId}`),
  
  create: (node: { orgId: string; type: string; name: string; email?: string; phone?: string; lambda?: number }) =>
    api.post<{ node: unknown }>('/autus/nodes', { action: 'create', ...node }),
  
  update: (nodeId: string, updates: { name?: string; email?: string; phone?: string; lambda?: number }) =>
    api.post<{ node: unknown }>('/autus/nodes', { action: 'update', id: nodeId, ...updates }),
  
  updateLambda: (nodeId: string, lambda?: number, performanceFactor?: number) =>
    api.post<{ node: unknown }>('/autus/nodes', { action: 'update_lambda', id: nodeId, lambda, performanceFactor }),
  
  changeType: (nodeId: string, newType: string, reason?: string) =>
    api.post<{ node: unknown; change: unknown }>('/autus/nodes', { action: 'change_type', id: nodeId, newType, reason }),
  
  delete: (nodeId: string) =>
    api.delete<{ deleted: unknown }>(`/autus/nodes?id=${nodeId}`),
};

// Relationships (관계 관리)
export const relationshipsApi = {
  getAll: (orgId?: string, nodeId?: string, status?: string) =>
    api.get<{ relationships: unknown[]; stats: unknown }>(`/autus/relationships?${orgId ? `orgId=${orgId}&` : ''}${nodeId ? `nodeId=${nodeId}&` : ''}${status ? `status=${status}` : ''}`),
  
  getById: (relationshipId: string) =>
    api.get<{ relationship: unknown; grade: string }>(`/autus/relationships?id=${relationshipId}`),
  
  create: (relationship: { orgId: string; nodeAId: string; nodeBId: string; nodeAName?: string; nodeBName?: string; sigma?: number }) =>
    api.post<{ relationship: unknown }>('/autus/relationships', { action: 'create', ...relationship }),
  
  updateSigma: (relationshipId: string, sigma: number, reason?: string) =>
    api.post<{ relationship: unknown; change: unknown }>('/autus/relationships', { action: 'update_sigma', id: relationshipId, sigma, reason }),
  
  addTime: (relationshipId: string, tPhysical: number, lambdaAvg?: number) =>
    api.post<{ relationship: unknown; added: unknown }>('/autus/relationships', { action: 'add_time', id: relationshipId, tPhysical, lambdaAvg }),
  
  changeStatus: (relationshipId: string, status: 'active' | 'inactive' | 'churned', reason?: string) =>
    api.post<{ relationship: unknown }>('/autus/relationships', { action: 'change_status', id: relationshipId, status, reason }),
  
  calculateOmega: (orgId?: string) =>
    api.post<{ omega: number; avgSigma: number; relationshipCount: number }>('/autus/relationships', { action: 'calculate_omega', orgId }),
  
  delete: (relationshipId: string) =>
    api.delete<{ deleted: unknown }>(`/autus/relationships?id=${relationshipId}`),
};

// Time Logs (시간 기록)
export const timeLogsApi = {
  getAll: (nodeId?: string, relationshipId?: string, activityType?: string) =>
    api.get<{ timeLogs: unknown[]; stats: unknown }>(`/autus/time-logs?${nodeId ? `nodeId=${nodeId}&` : ''}${relationshipId ? `relationshipId=${relationshipId}&` : ''}${activityType ? `activityType=${activityType}` : ''}`),
  
  create: (log: { orgId: string; nodeId?: string; relationshipId?: string; tPhysical: number; activityType: string; lambda?: number }) =>
    api.post<{ timeLog: unknown; calculation: unknown }>('/autus/time-logs', { action: 'create', ...log }),
  
  bulkCreate: (logs: Array<{ orgId: string; nodeId?: string; relationshipId?: string; tPhysical: number; activityType: string; lambda?: number }>) =>
    api.post<{ created: unknown[]; count: number }>('/autus/time-logs', { action: 'bulk_create', logs }),
  
  calculateTotal: (nodeId?: string, relationshipId?: string, startDate?: string, endDate?: string) =>
    api.post<{ totalTPhysical: number; totalTValue: number }>('/autus/time-logs', { action: 'calculate_total', nodeId, relationshipId, startDate, endDate }),
};

// Behaviors (행위 기록)
export const behaviorsApi = {
  getConfig: () =>
    api.get<{ behaviors: unknown[]; tierSummary: unknown }>('/autus/behavior'),
  
  getByNode: (nodeId: string, tier?: number) =>
    api.get<{ behaviors: unknown[]; totalSigma: number }>(`/autus/behavior?nodeId=${nodeId}${tier ? `&tier=${tier}` : ''}`),
  
  record: (behavior: { nodeId: string; behaviorType: string; modifiers?: Record<string, boolean | number> }) =>
    api.post<{ behavior: unknown; sigmaContribution: number }>('/autus/behavior', behavior),
};

// Sigma History (σ 이력)
export const sigmaHistoryApi = {
  getHistory: (nodeId?: string, relationshipId?: string, days?: number) =>
    api.get<{ history: unknown[]; analysis: unknown }>(`/autus/sigma-history?${nodeId ? `nodeId=${nodeId}` : `relationshipId=${relationshipId}`}${days ? `&days=${days}` : ''}`),
};

// Alerts (알림)
export const alertsApi = {
  getAll: (level?: string, unreadOnly?: boolean) =>
    api.get<{ alerts: unknown[]; stats: unknown }>(`/autus/alerts?${level ? `level=${level}&` : ''}${unreadOnly ? 'unread=true' : ''}`),
  
  getByNode: (nodeId: string) =>
    api.get<{ alerts: unknown[] }>(`/autus/alerts?nodeId=${nodeId}`),
  
  create: (alert: { nodeId?: string; level: string; type: string; message: string }) =>
    api.post<{ alert: unknown }>('/autus/alerts', { action: 'create', ...alert }),
  
  markRead: (alertId: string) =>
    api.post<{ markedCount: number }>('/autus/alerts', { action: 'mark_read', alertId }),
  
  markAllRead: (level?: string) =>
    api.post<{ markedCount: number }>('/autus/alerts', { action: 'mark_all_read', level }),
  
  check: (nodeId: string, currentSigma: number, previousSigma: number, daysDelta: number) =>
    api.post<{ alerts: unknown[]; triggered: number }>('/autus/alerts', { action: 'check', nodeId, currentSigma, previousSigma, daysDelta }),
  
  delete: (alertId: string) =>
    api.delete<{ message: string }>(`/autus/alerts?id=${alertId}`),
};

// Dashboard (대시보드)
export const dashboardApi = {
  getOwner: () =>
    api.get<{ role: string; data: unknown }>('/autus/dashboard?role=OWNER'),
  
  getManager: () =>
    api.get<{ role: string; data: unknown }>('/autus/dashboard?role=MANAGER'),
  
  getStaff: (userId?: string) =>
    api.get<{ role: string; data: unknown }>(`/autus/dashboard?role=STAFF${userId ? `&userId=${userId}` : ''}`),
};

// Calculate (계산 API)
export const calculateApi = {
  calculateA: (t: number, lambda?: number, sigma?: number) =>
    api.post<{ t: number; lambda: number; T: number; sigma: number; A: number; formula: string }>('/autus/calculate', { action: 'calculate_a', t, lambda, sigma }),
  
  measureSigma: (a: number, t: number, lambda?: number) =>
    api.post<{ sigma: number; grade: unknown; formula: string }>('/autus/calculate', { action: 'measure_sigma', a, t, lambda }),
  
  calculateOmega: (relationships: Array<{ tTotal: number; sigma: number; lambdaAvg: number }>) =>
    api.post<{ omega: number; avgSigma: number; distribution: unknown }>('/autus/calculate', { action: 'calculate_omega', relationships }),
  
  predict: (currentA: number, currentSigma: number, tRemaining: number, lambda?: number) =>
    api.post<{ predictedA: number; formula: string }>('/autus/calculate', { action: 'predict', currentA, currentSigma, tRemaining, lambda }),
};

// ============================================
// Hook for React Components
// ============================================
import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<ApiResponse<T>>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall();

      if (response.success && response.data) {
        setState({ data: response.data, loading: false, error: null });
        return response.data;
      } else {
        setState({ data: null, loading: false, error: response.error || 'Unknown error' });
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ data: null, loading: false, error: errorMessage });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// ============================================
// Export All
// ============================================
export default api;
