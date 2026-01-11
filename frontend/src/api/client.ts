// ═══════════════════════════════════════════════════════════════════════════
// AUTUS API Client
// ═══════════════════════════════════════════════════════════════════════════

import axios from 'axios';
import type { 
  ScaleNode, 
  Flow, 
  ScaleLevel, 
  KeymanScore, 
  KeymanImpact,
  FlowPath,
  FlowStats 
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({ 
  baseURL: API_BASE,
  timeout: 10000,
});

// ─────────────────────────────────────────────────────────────────────────────
// Scale API
// ─────────────────────────────────────────────────────────────────────────────

export const scaleApi = {
  /** 특정 레벨의 노드 조회 */
  getNodesAtLevel: async (level: ScaleLevel, bounds?: number[]): Promise<ScaleNode[]> => {
    const params = bounds ? {
      sw_lat: bounds[0],
      sw_lng: bounds[1],
      ne_lat: bounds[2],
      ne_lng: bounds[3],
    } : {};
    
    const response = await api.get<ScaleNode[]>(`/scale/${level}/nodes`, { params });
    return response.data;
  },

  /** 특정 레벨의 Top N Keyman 조회 */
  getKeymanAtLevel: async (level: ScaleLevel, n: number = 10): Promise<ScaleNode[]> => {
    const response = await api.get<ScaleNode[]>(`/scale/${level}/keyman/${n}`);
    return response.data;
  },

  /** 노드 상세 조회 */
  getNode: async (id: string): Promise<ScaleNode> => {
    const response = await api.get<ScaleNode>(`/scale/node/${id}`);
    return response.data;
  },

  /** 하위 노드 조회 (Zoom In) */
  getChildren: async (id: string): Promise<ScaleNode[]> => {
    const response = await api.get<ScaleNode[]>(`/scale/node/${id}/children`);
    return response.data;
  },

  /** 상위 노드 조회 (Zoom Out) */
  getParent: async (id: string): Promise<ScaleNode | null> => {
    try {
      const response = await api.get<ScaleNode>(`/scale/node/${id}/parent`);
      return response.data;
    } catch {
      return null;
    }
  },

  /** 최상위까지 경로 조회 */
  getPathToRoot: async (id: string): Promise<ScaleNode[]> => {
    const response = await api.get<ScaleNode[]>(`/scale/node/${id}/path-to-root`);
    return response.data;
  },

  /** 계층 트리 조회 */
  getHierarchy: async (nodeId: string = 'world'): Promise<unknown> => {
    const response = await api.get(`/scale/hierarchy/${nodeId}`);
    return response.data;
  },

  /** 지도 영역 내 노드 조회 */
  getNodesInBounds: async (
    bounds: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number },
    zoom?: number
  ): Promise<ScaleNode[]> => {
    const response = await api.post<ScaleNode[]>('/scale/bounds', { ...bounds, zoom });
    return response.data;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Flow API
// ─────────────────────────────────────────────────────────────────────────────

export const flowApi = {
  /** 모든 흐름 조회 */
  getAllFlows: async (): Promise<Flow[]> => {
    const response = await api.get<Flow[]>('/flow/all');
    return response.data;
  },

  /** 특정 노드의 모든 흐름 조회 */
  getNodeFlows: async (nodeId: string): Promise<{ inflows: Flow[]; outflows: Flow[] }> => {
    const response = await api.get<{ inflows: Flow[]; outflows: Flow[] }>(`/flow/node/${nodeId}/all`);
    return response.data;
  },

  /** 노드 흐름 통계 조회 */
  getNodeStats: async (nodeId: string): Promise<FlowStats> => {
    const response = await api.get<FlowStats>(`/flow/node/${nodeId}/stats`);
    return response.data;
  },

  /** 최단 경로 탐색 */
  findShortestPath: async (sourceId: string, targetId: string): Promise<FlowPath> => {
    const response = await api.get<FlowPath>(`/flow/path/${sourceId}/${targetId}`);
    return response.data;
  },

  /** 모든 경로 탐색 */
  findAllPaths: async (sourceId: string, targetId: string, maxDepth: number = 5): Promise<FlowPath[]> => {
    const response = await api.get<FlowPath[]>(`/flow/path/all/${sourceId}/${targetId}`, {
      params: { max_depth: maxDepth }
    });
    return response.data;
  },

  /** 병목 노드 탐색 */
  findBottlenecks: async (threshold: number = 0.1): Promise<unknown[]> => {
    const response = await api.get(`/flow/bottlenecks`, {
      params: { threshold }
    });
    return response.data;
  },

  /** Top N 흐름 조회 */
  getTopFlows: async (n: number = 10): Promise<Flow[]> => {
    const response = await api.get<Flow[]>(`/flow/top/${n}`);
    return response.data;
  },

  /** 레벨별 집계 흐름 (추후 구현) */
  getFlowsForLevel: async (level: ScaleLevel): Promise<Flow[]> => {
    // 현재는 전체 흐름 반환, 추후 레벨별 집계 구현
    const response = await api.get<Flow[]>('/flow/all');
    return response.data;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Keyman API
// ─────────────────────────────────────────────────────────────────────────────

export const keymanApi = {
  /** Top N Keyman 조회 */
  getTop: async (n: number = 10): Promise<KeymanScore[]> => {
    const response = await api.get<KeymanScore[]>(`/keyman/top/${n}`);
    return response.data;
  },

  /** 개인 Keyman Index 상세 조회 */
  getKeymanDetails: async (id: string): Promise<KeymanScore> => {
    const response = await api.get<KeymanScore>(`/keyman/${id}`);
    return response.data;
  },

  /** 네트워크 영향도 조회 */
  getImpact: async (id: string): Promise<KeymanImpact> => {
    const response = await api.get<KeymanImpact>(`/keyman/${id}/impact`);
    return response.data;
  },

  /** 유형별 Keyman 조회 */
  getByType: async (type: string): Promise<KeymanScore[]> => {
    const response = await api.get<KeymanScore[]>(`/keyman/type/${type}`);
    return response.data;
  },

  /** 섹터별 Top Keyman 조회 */
  getBySector: async (sector: string, n: number = 5): Promise<KeymanScore[]> => {
    const response = await api.get<KeymanScore[]>(`/keyman/sector/${sector}`, {
      params: { n }
    });
    return response.data;
  },

  /** 제거 시뮬레이션 */
  simulateRemoval: async (id: string): Promise<unknown> => {
    const response = await api.post(`/keyman/simulate-removal`, null, {
      params: { person_id: id }
    });
    return response.data;
  },

  /** 경로 상 필수 노드 탐색 */
  findBottleneckNodes: async (sourceId: string, targetId: string): Promise<string[]> => {
    const response = await api.get<{ bottleneck_nodes: string[] }>(`/keyman/path/${sourceId}/${targetId}`);
    return response.data.bottleneck_nodes;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Person Score API
// ─────────────────────────────────────────────────────────────────────────────

export const scoreApi = {
  /** 전체 랭킹 조회 */
  getRanking: async (): Promise<unknown[]> => {
    const response = await api.get('/score/ranking');
    return response.data;
  },

  /** 개인 점수 조회 */
  getPersonScore: async (id: string): Promise<unknown> => {
    const response = await api.get(`/score/${id}`);
    return response.data;
  },

  /** 점수 분해 조회 */
  getScoreBreakdown: async (id: string): Promise<unknown> => {
    const response = await api.get(`/score/${id}/breakdown`);
    return response.data;
  },

  /** 계급 분포 조회 */
  getRankDistribution: async (): Promise<Record<string, number>> => {
    const response = await api.get<Record<string, number>>('/score/ranks/distribution');
    return response.data;
  },
};

export default api;

