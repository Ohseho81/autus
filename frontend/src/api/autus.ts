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
};
