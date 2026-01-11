/**
 * AUTUS Physics API Client
 * ========================
 * 
 * 백엔드 Physics 엔진과 통신
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ════════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════════

export interface PhysicsState {
  id: number;
  name: string;
  energy: number;
  decay_rate: number;
  half_life: number;
  inertia: number;
  color: string;
  motion_count: number;
}

export interface UIPort {
  id: string;
  name: string;
  nameKo: string;
  value: number;
  color: string;
}

export interface Motion {
  id: string;
  physics: number;
  motion: number;
  delta: number;
  timestamp: string;
  source?: string;
}

export interface MotionRequest {
  physics: number | string;
  motion: number | string;
  delta: number;
  friction?: number;
  source?: string;
}

export interface ServerInfo {
  name: string;
  version: string;
  description: string;
  nodes: number;
  physics: number;
  motions: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// API Functions
// ════════════════════════════════════════════════════════════════════════════════

/**
 * 서버 정보 조회
 */
export async function getServerInfo(): Promise<ServerInfo> {
  const response = await fetch(`${API_BASE}/`);
  if (!response.ok) throw new Error('Failed to fetch server info');
  return response.json();
}

/**
 * 헬스 체크
 */
export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}

/**
 * 전체 Physics 상태 조회
 */
export async function getState(): Promise<PhysicsState[]> {
  const response = await fetch(`${API_BASE}/state`);
  if (!response.ok) throw new Error('Failed to fetch state');
  return response.json();
}

/**
 * 단일 Physics 상태 조회
 */
export async function getPhysicsState(physicsId: number): Promise<PhysicsState> {
  const response = await fetch(`${API_BASE}/state/${physicsId}`);
  if (!response.ok) throw new Error(`Failed to fetch physics ${physicsId}`);
  return response.json();
}

/**
 * 노드 목록 조회
 */
export async function getNodes(): Promise<PhysicsState[]> {
  const response = await fetch(`${API_BASE}/nodes`);
  if (!response.ok) throw new Error('Failed to fetch nodes');
  return response.json();
}

/**
 * UI 포트 조회
 */
export async function getPorts(): Promise<UIPort[]> {
  const response = await fetch(`${API_BASE}/project`);
  if (!response.ok) throw new Error('Failed to fetch ports');
  return response.json();
}

/**
 * 게이트 상태 조회
 */
export async function getGates(): Promise<Record<string, any>> {
  const response = await fetch(`${API_BASE}/gates`);
  if (!response.ok) throw new Error('Failed to fetch gates');
  return response.json();
}

/**
 * 최근 Motion 로그
 */
export async function getMotions(limit: number = 20): Promise<Motion[]> {
  const response = await fetch(`${API_BASE}/motions?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch motions');
  return response.json();
}

/**
 * 최근 Motion 로그 (별칭)
 */
export async function getRecentMotions(limit: number = 20): Promise<{ motions: any[] }> {
  try {
    const response = await fetch(`${API_BASE}/api/kernel/log?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch motions');
    const data = await response.json();
    return { motions: data };
  } catch {
    return { motions: [] };
  }
}

/**
 * Motion 적용
 */
export async function applyMotion(request: MotionRequest): Promise<any> {
  const response = await fetch(`${API_BASE}/motion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to apply motion');
  return response.json();
}

/**
 * 시간 경과 (Tick)
 */
export async function tick(hours: number = 1): Promise<any> {
  const response = await fetch(`${API_BASE}/tick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hours }),
  });
  if (!response.ok) throw new Error('Failed to tick');
  return response.json();
}

/**
 * 상태 초기화
 */
export async function reset(): Promise<any> {
  const response = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to reset');
  return response.json();
}

/**
 * 엔진 정보
 */
export async function getInfo(): Promise<any> {
  const response = await fetch(`${API_BASE}/info`);
  if (!response.ok) throw new Error('Failed to fetch info');
  return response.json();
}

// ════════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ════════════════════════════════════════════════════════════════════════════════

/**
 * API 연결 테스트
 */
export async function testConnection(): Promise<boolean> {
  try {
    await healthCheck();
    return true;
  } catch {
    return false;
  }
}

/**
 * 전체 대시보드 데이터 한번에 로드
 */
export async function loadDashboardData(): Promise<{
  state: PhysicsState[];
  ports: UIPort[];
  motions: Motion[];
  gates: Record<string, any>;
}> {
  const [state, ports, motions, gates] = await Promise.all([
    getState(),
    getPorts(),
    getMotions(10),
    getGates(),
  ]);
  return { state, ports, motions, gates };
}

