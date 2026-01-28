/**
 * AUTUS 통합 API 클라이언트
 * Backend 285개 엔드포인트 연동
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// System API
// ═══════════════════════════════════════════════════════════════════════════

export const systemApi = {
  /** 서버 정보 */
  getInfo: async () => {
    const response = await api.get('/');
    return response.data;
  },

  /** 헬스 체크 */
  health: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  /** 시스템 상태 */
  getState: async () => {
    const response = await api.get('/state');
    return response.data;
  },

  /** 메트릭 */
  getMetrics: async () => {
    const response = await api.get('/metrics');
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// K/I Physics API
// ═══════════════════════════════════════════════════════════════════════════

export const kiApi = {
  /** K/I 상태 조회 */
  getState: async (entityId?: string) => {
    const params = entityId ? { entity_id: entityId } : {};
    const response = await api.get('/api/ki/state', { params });
    return response.data;
  },

  /** K/I 업데이트 */
  update: async (entityId: string, delta: { k?: number; i?: number; r?: number }) => {
    const response = await api.post('/api/ki/update', { entity_id: entityId, ...delta });
    return response.data;
  },

  /** K/I 히스토리 */
  getHistory: async (entityId: string, days: number = 30) => {
    const response = await api.get(`/api/ki/history/${entityId}`, { params: { days } });
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 570 Tasks API
// ═══════════════════════════════════════════════════════════════════════════

export const tasksApi = {
  /** 570개 업무 정의 조회 */
  getDefinitions: async () => {
    const response = await api.get('/api/tasks/570/definitions');
    return response.data;
  },

  /** 그룹별 업무 조회 */
  getByGroup: async (groupId: string) => {
    const response = await api.get(`/api/tasks/570/group/${groupId}`);
    return response.data;
  },

  /** 업무 실행 */
  execute: async (taskId: string, params?: Record<string, unknown>) => {
    const response = await api.post(`/api/tasks/570/execute/${taskId}`, params || {});
    return response.data;
  },

  /** 업무 요약 */
  getSummary: async (entityId: string) => {
    const response = await api.get('/api/tasks/570/summary', { params: { entity_id: entityId } });
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS Core API
// ═══════════════════════════════════════════════════════════════════════════

export const autusApi = {
  /** 노드 목록 */
  getNodes: async () => {
    const response = await api.get('/api/autus/nodes');
    return response.data;
  },

  /** 노드 상세 */
  getNode: async (nodeId: string) => {
    const response = await api.get(`/api/autus/nodes/${nodeId}`);
    return response.data;
  },

  /** 모션 실행 */
  executeMotion: async (nodeId: string, motion: string, delta: number) => {
    const response = await api.post('/api/autus/motion', { node_id: nodeId, motion, delta });
    return response.data;
  },

  /** 상태 조회 */
  getState: async () => {
    const response = await api.get('/api/autus/state');
    return response.data;
  },

  /** UI 개요 */
  getUIOverview: async () => {
    const response = await api.get('/api/autus/ui/overview');
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Edge API
// ═══════════════════════════════════════════════════════════════════════════

export const edgeApi = {
  /** 엣지 함수 목록 */
  getFunctions: async () => {
    const response = await api.get('/api/edge/functions');
    return response.data;
  },

  /** 엣지 실행 */
  execute: async (functionName: string, params?: Record<string, unknown>) => {
    const response = await api.post('/api/edge/execute', { function: functionName, params });
    return response.data;
  },

  /** 히트맵 */
  getHeatmap: async () => {
    const response = await api.get('/api/edge/heatmap');
    return response.data;
  },

  /** 통계 */
  getStats: async () => {
    const response = await api.get('/api/edge/stats');
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Audit API
// ═══════════════════════════════════════════════════════════════════════════

export const auditApi = {
  /** 감사 대시보드 */
  getDashboard: async () => {
    const response = await api.get('/api/audit/dashboard');
    return response.data;
  },

  /** 위험 점수 */
  getRiskScore: async () => {
    const response = await api.get('/api/audit/risk-score');
    return response.data;
  },

  /** 발견 사항 */
  getFindings: async () => {
    const response = await api.get('/api/audit/findings');
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// OAuth API
// ═══════════════════════════════════════════════════════════════════════════

export const oauthApi = {
  /** OAuth 상태 */
  getStatus: async () => {
    const response = await api.get('/api/oauth/status');
    return response.data;
  },

  /** Google OAuth URL */
  getGoogleAuthUrl: async () => {
    const response = await api.get('/api/oauth/google/url');
    return response.data;
  },

  /** Slack OAuth URL */
  getSlackAuthUrl: async () => {
    const response = await api.get('/api/oauth/slack/url');
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Reference API
// ═══════════════════════════════════════════════════════════════════════════

export const refApi = {
  /** Physics 레퍼런스 */
  getPhysics: async () => {
    const response = await api.get('/ref/physics');
    return response.data;
  },

  /** Motion 레퍼런스 */
  getMotions: async () => {
    const response = await api.get('/ref/motions');
    return response.data;
  },

  /** 48노드 레퍼런스 */
  getNodes48: async () => {
    const response = await api.get('/ref/nodes48');
    return response.data;
  },

  /** 144슬롯 레퍼런스 */
  getSlots144: async () => {
    const response = await api.get('/ref/slots144');
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Quick Tag API (Optimus - 현장 데이터 입력)
// ═══════════════════════════════════════════════════════════════════════════

const VERCEL_API = import.meta.env.VITE_AUTUS_API_URL || import.meta.env.VITE_VERCEL_API_URL || 'https://autus-ai.com';

export const quickTagApi = {
  /** Quick Tag 등록 */
  create: async (data: {
    org_id: string;
    tagger_id: string;
    target_id: string;
    target_type: 'student' | 'parent' | 'teacher';
    emotion_delta: number; // -20 ~ +20
    bond_strength: 'strong' | 'normal' | 'cold';
    issue_triggers?: string[];
    voice_insight?: string;
  }) => {
    const response = await fetch(`${VERCEL_API}/api/quick-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /** 최근 태그 조회 */
  getRecent: async (orgId: string, limit = 20) => {
    const response = await fetch(`${VERCEL_API}/api/quick-tag?org_id=${orgId}&limit=${limit}`);
    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Risk Queue API (FSD - 이탈 위험 관리)
// ═══════════════════════════════════════════════════════════════════════════

export const riskApi = {
  /** 위험 목록 조회 */
  getList: async (orgId: string, status = 'open', minPriority = 'LOW') => {
    const response = await fetch(
      `${VERCEL_API}/api/risks?org_id=${orgId}&status=${status}&min_priority=${minPriority}`
    );
    return response.json();
  },

  /** 위험도 재계산 */
  recalculate: async (orgId: string, alpha = 1.5) => {
    const response = await fetch(`${VERCEL_API}/api/risks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, recalculate: true, alpha }),
    });
    return response.json();
  },

  /** 위험 상태 업데이트 */
  updateStatus: async (
    riskId: string,
    action: 'resolve' | 'escalate' | 'assign' | 'dismiss',
    options?: { notes?: string; assigned_to?: string }
  ) => {
    const response = await fetch(`${VERCEL_API}/api/risks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ risk_id: riskId, action, ...options }),
    });
    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Goals API (전체 역할 - 목표 관리)
// ═══════════════════════════════════════════════════════════════════════════

export const goalsApi = {
  /** 목표 목록 조회 */
  getList: async (orgId: string, filters?: { type?: string; status?: string; timeframe?: string }) => {
    const params = new URLSearchParams({ org_id: orgId, ...filters });
    const response = await fetch(`${VERCEL_API}/api/goals?${params}`);
    return response.json();
  },

  /** 목표 생성 */
  create: async (data: {
    org_id: string;
    type: string;
    title: string;
    target: number | string;
    start_date: string;
    end_date: string;
    description?: string;
    unit?: string;
    timeframe?: string;
    milestones?: any[];
    strategies?: string[];
    kpis?: any[];
  }) => {
    const response = await fetch(`${VERCEL_API}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...data }),
    });
    return response.json();
  },

  /** 목표 업데이트 */
  update: async (goalId: string, updates: Record<string, any>) => {
    const response = await fetch(`${VERCEL_API}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', goal_id: goalId, ...updates }),
    });
    return response.json();
  },

  /** 진행률 업데이트 */
  updateProgress: async (goalId: string, current: number, milestoneUpdates?: any[]) => {
    const response = await fetch(`${VERCEL_API}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_progress',
        goal_id: goalId,
        current,
        milestone_updates: milestoneUpdates,
      }),
    });
    return response.json();
  },

  /** 자동 계획 생성 (AI) */
  generatePlan: async (goalId: string) => {
    const response = await fetch(`${VERCEL_API}/api/goals/auto-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: goalId }),
    });
    return response.json();
  },

  /** 목표 궤적 분석 */
  getTrajectory: async (goalId: string) => {
    const response = await fetch(`${VERCEL_API}/api/goals/trajectory?goal_id=${goalId}`);
    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Monopoly API (C-Level - 독점 체제 모니터링)
// ═══════════════════════════════════════════════════════════════════════════

export const monopolyApi = {
  /** 독점 현황 조회 */
  getStatus: async (orgId: string) => {
    const response = await fetch(`${VERCEL_API}/api/monopoly?org_id=${orgId}`);
    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Churn API (FSD - 이탈 분석)
// ═══════════════════════════════════════════════════════════════════════════

export const churnApi = {
  /** 이탈 위험 분석 */
  analyze: async (orgId: string) => {
    const response = await fetch(`${VERCEL_API}/api/churn?org_id=${orgId}`);
    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Rewards API (Consumer - V-포인트)
// ═══════════════════════════════════════════════════════════════════════════

export const rewardsApi = {
  /** 리워드 현황 조회 */
  getStatus: async (nodeId: string) => {
    const response = await fetch(`${VERCEL_API}/api/rewards?node_id=${nodeId}`);
    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Notify API (전체 - 알림 시스템)
// ═══════════════════════════════════════════════════════════════════════════

export const notifyApi = {
  /** 알림 발송 */
  send: async (data: {
    org_id: string;
    type: 'risk_alert' | 'goal_update' | 'system';
    recipients: string[];
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  }) => {
    const response = await fetch(`${VERCEL_API}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Shield API (FSD - 방어 시스템)
// ═══════════════════════════════════════════════════════════════════════════

export const shieldApi = {
  /** Active Shield 활성화 */
  activate: async (orgId: string, targetId: string, actions: string[]) => {
    const response = await fetch(`${VERCEL_API}/api/shield/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, target_id: targetId, actions }),
    });
    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Time Value API (Core - A = T^σ)
// ═══════════════════════════════════════════════════════════════════════════

export const timeValueApi = {
  /** 시간 가치 계산 */
  calculate: async (nodeId: string) => {
    const response = await fetch(`${VERCEL_API}/api/time-value?node_id=${nodeId}`);
    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════

export default {
  system: systemApi,
  ki: kiApi,
  tasks: tasksApi,
  autus: autusApi,
  edge: edgeApi,
  audit: auditApi,
  oauth: oauthApi,
  ref: refApi,
  // 새로 추가된 API
  quickTag: quickTagApi,
  risk: riskApi,
  goals: goalsApi,
  monopoly: monopolyApi,
  churn: churnApi,
  rewards: rewardsApi,
  notify: notifyApi,
  shield: shieldApi,
  timeValue: timeValueApi,
};
