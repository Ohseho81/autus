/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS K/I API Client
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * K/I 물리 엔진, 48노드, 144슬롯, 자동화, 경고 API
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityType = 'INDIVIDUAL' | 'STARTUP' | 'SMB' | 'ENTERPRISE' | 'CITY' | 'NATION';
export type LoopPhase = 'DISCOVERY' | 'ANALYSIS' | 'REDESIGN' | 'OPTIMIZE' | 'ELIMINATE';
export type TaskStatus = 'OBSERVED' | 'ANALYZED' | 'SUGGESTED' | 'AUTOMATING' | 'AUTOMATED' | 'ELIMINATED' | 'REJECTED';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EntityState {
  entity_id: string;
  entity_type: EntityType;
  k: number;
  i: number;
  dk_dt: number;
  di_dt: number;
  omega: number;
  phase: string;
  updated_at: string;
}

export interface NodeValue {
  id: string;
  domain: string;
  node_type: string;
  value: number;
  delta: number;
  label: string;
  meta_category: string;
}

export interface NodesResponse {
  entity_id: string;
  total_nodes: number;
  meta_categories: string[];
  domains: string[];
  nodes: NodeValue[];
  k_calculated: number;
}

export interface SlotValue {
  id: string;
  type: string;
  slot_index: number;
  source: string;
  target: string;
  strength: number;
  i_score: number;
  is_empty: boolean;
  last_interaction?: string;
}

export interface SlotsResponse {
  entity_id: string;
  total_slots: number;
  relation_types: string[];
  slots: SlotValue[];
  i_calculated: number;
  fill_rate: number;
}

export interface PredictionPoint {
  day: number;
  k: number;
  i: number;
  confidence: number;
}

export interface PredictionResponse {
  entity_id: string;
  current_k: number;
  current_i: number;
  dk_dt: number;
  di_dt: number;
  predictions: PredictionPoint[];
  warning?: string;
}

export interface Task {
  id: string;
  entity_id: string;
  name: string;
  description: string;
  phase: LoopPhase;
  status: TaskStatus;
  automation_score: number;
  savings: number;
  frequency: number;
  avg_duration: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface TasksResponse {
  entity_id: string;
  total_tasks: number;
  by_phase: Record<string, number>;
  by_status: Record<string, number>;
  total_savings: number;
  tasks: Task[];
}

export interface Alert {
  id: string;
  entity_id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  metric?: string;
  current_value?: number;
  threshold?: number;
  acknowledged: boolean;
  created_at: string;
  acknowledged_at?: string;
}

export interface AlertsResponse {
  entity_id: string;
  total_alerts: number;
  unacknowledged: number;
  by_severity: Record<string, number>;
  alerts: Alert[];
}

export interface HistoryPoint {
  date: string;
  k: number;
  i: number;
}

export interface HistoryResponse {
  entity_id: string;
  days: number;
  history: HistoryPoint[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// K/I State API
// ═══════════════════════════════════════════════════════════════════════════════

export const kiApi = {
  /**
   * 엔티티 K/I 상태 조회
   */
  getState: async (entityId: string, entityType: EntityType = 'INDIVIDUAL'): Promise<EntityState> => {
    const res = await fetch(`${API_BASE}/ki/state/${entityId}?entity_type=${entityType}`);
    if (!res.ok) throw new Error('Failed to fetch entity state');
    return res.json();
  },

  /**
   * 48노드 상세 조회
   */
  getNodes: async (entityId: string): Promise<NodesResponse> => {
    const res = await fetch(`${API_BASE}/ki/nodes/${entityId}`);
    if (!res.ok) throw new Error('Failed to fetch nodes');
    return res.json();
  },

  /**
   * 144슬롯 상세 조회
   */
  getSlots: async (entityId: string): Promise<SlotsResponse> => {
    const res = await fetch(`${API_BASE}/ki/slots/${entityId}`);
    if (!res.ok) throw new Error('Failed to fetch slots');
    return res.json();
  },

  /**
   * K/I 재계산
   */
  calculate: async (
    entityId: string, 
    nodeValues?: Record<string, number>,
    slotValues?: Record<string, number>
  ): Promise<EntityState> => {
    const res = await fetch(`${API_BASE}/ki/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_id: entityId,
        node_values: nodeValues,
        slot_values: slotValues,
      }),
    });
    if (!res.ok) throw new Error('Failed to calculate K/I');
    return res.json();
  },

  /**
   * 궤적 예측
   */
  predict: async (entityId: string, days: number = 30): Promise<PredictionResponse> => {
    const res = await fetch(`${API_BASE}/ki/predict/${entityId}?days=${days}`);
    if (!res.ok) throw new Error('Failed to predict trajectory');
    return res.json();
  },

  /**
   * K/I 히스토리 조회
   */
  getHistory: async (entityId: string, days: number = 30): Promise<HistoryResponse> => {
    const res = await fetch(`${API_BASE}/ki/history/${entityId}?days=${days}`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  /**
   * 임계점 상태 정보
   */
  getPhaseInfo: async () => {
    const res = await fetch(`${API_BASE}/ki/phase-info`);
    if (!res.ok) throw new Error('Failed to fetch phase info');
    return res.json();
  },

  /**
   * 관계 유형 정보
   */
  getRelationTypes: async () => {
    const res = await fetch(`${API_BASE}/ki/relation-types`);
    if (!res.ok) throw new Error('Failed to fetch relation types');
    return res.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Automation API
// ═══════════════════════════════════════════════════════════════════════════════

export const automationApi = {
  /**
   * 자동화 태스크 목록
   */
  getTasks: async (entityId: string, phase?: LoopPhase, status?: TaskStatus): Promise<TasksResponse> => {
    const params = new URLSearchParams();
    if (phase) params.append('phase', phase);
    if (status) params.append('status', status);
    
    const res = await fetch(`${API_BASE}/automation/tasks/${entityId}?${params}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  /**
   * 태스크 승인
   */
  approveTask: async (taskId: string, entityId: string): Promise<{ success: boolean; task: Task }> => {
    const res = await fetch(`${API_BASE}/automation/approve/${taskId}?entity_id=${entityId}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to approve task');
    return res.json();
  },

  /**
   * 태스크 거절
   */
  rejectTask: async (taskId: string, entityId: string, reason?: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/automation/reject/${taskId}?entity_id=${entityId}&reason=${reason || ''}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reject task');
    return res.json();
  },

  /**
   * DAROE 5단계 정보
   */
  getPhases: async () => {
    const res = await fetch(`${API_BASE}/automation/phases`);
    if (!res.ok) throw new Error('Failed to fetch phases');
    return res.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Alerts API
// ═══════════════════════════════════════════════════════════════════════════════

export const alertsApi = {
  /**
   * 경고 목록
   */
  getAlerts: async (entityId: string, severity?: AlertSeverity, acknowledged?: boolean): Promise<AlertsResponse> => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (acknowledged !== undefined) params.append('acknowledged', String(acknowledged));
    
    const res = await fetch(`${API_BASE}/alerts/${entityId}?${params}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  /**
   * 경고 확인
   */
  acknowledge: async (alertId: string, entityId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/alerts/acknowledge/${alertId}?entity_id=${entityId}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
  },

  /**
   * 경고 생성
   */
  create: async (
    entityId: string,
    severity: AlertSeverity,
    title: string,
    message: string
  ): Promise<{ success: boolean; alert: Alert }> => {
    const params = new URLSearchParams({
      entity_id: entityId,
      severity,
      title,
      message,
    });
    
    const res = await fetch(`${API_BASE}/alerts/create?${params}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to create alert');
    return res.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Combined Export
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  ki: kiApi,
  automation: automationApi,
  alerts: alertsApi,
};
