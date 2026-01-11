/**
 * AUTUS Trinity Engine API
 * ========================
 * 
 * 백엔드 Trinity Engine과 연동하는 API 서비스
 */

import api from './client';

// ============================================
// Types - 백엔드 데이터 모델과 동기화
// ============================================

export type DesireCategory = 
  | 'WEALTH'      // 부자가 되고 싶다
  | 'HEALTH'      // 건강하게 살고 싶다
  | 'FREEDOM'     // 자유롭게 살고 싶다
  | 'INFLUENCE'   // 영향력을 갖고 싶다
  | 'MASTERY'     // 전문가가 되고 싶다
  | 'PEACE'       // 평화롭게 살고 싶다
  | 'LEGACY';     // 무언가를 남기고 싶다

export type PainType = 
  | 'FINANCIAL'   // 재무적 절제
  | 'PHYSICAL'    // 신체적 노력
  | 'COGNITIVE'   // 인지적 집중
  | 'EMOTIONAL'   // 감정적 인내
  | 'TEMPORAL';   // 시간적 희생

export type ERTAction = 'ELIMINATE' | 'REPLACE' | 'TRANSFORM' | 'PRESERVE';

export interface TargetNode {
  id: string;
  name: string;
  current: number;
  target: number;
}

export interface PainBreakdown {
  financial: number;
  cognitive: number;
  temporal: number;
  emotional: number;
  physical?: number;
}

// 1. Crystallization (결정질화) 데이터
export interface CrystallizationData {
  rawDesire: string;
  category: DesireCategory;
  targetNodes: TargetNode[];
  requiredMonths: number;
  requiredHours: number;
  feasibility: number;
  totalPain: number;
  painBreakdown: PainBreakdown;
  activationEnergy: number;
  entropyCost: number;
}

// 2. Environment (최적 환경) 데이터
export interface ERTItem {
  id: string;
  task: string;
  action: ERTAction;
  reason: string;
  impact: number;
}

export interface EnvironmentData {
  eliminated: number;
  automated: number;
  parallelized: number;
  preserved: number;
  energyEfficiency: number;
  cognitiveLeakage: number;
  friction: number;
  environmentScore: number;
  ertItems?: ERTItem[];
}

// 3. Progress (진행 현황) 데이터
export interface Checkpoint {
  id: number;
  name: string;
  targetDate: string;
  progress: number;
  isPassed: boolean;
  isCurrent: boolean;
}

export interface ProgressData {
  progress: number;
  currentCheckpoint: number;
  totalCheckpoints: number;
  checkpoints?: Checkpoint[];
  remainingDays: number;
  remainingHours: number;
  painEndDate: string;
  uncertainty: number;
  confidence: number;
  onTrack: boolean;
  deviation: number;
}

// 통합 Trinity 데이터
export interface TrinityEngineData {
  crystallization: CrystallizationData;
  environment: EnvironmentData;
  progress: ProgressData;
  actions: string[];
  lastUpdated: string;
}

// API 요청/응답 타입
export interface ProcessDesireRequest {
  rawDesire: string;
  scale?: number;
  category?: DesireCategory;
}

export interface OptimizeEnvironmentRequest {
  tasks?: Array<{
    id: string;
    name: string;
    frequency: string;
    duration: number;
    importance: number;
  }>;
}

export interface UpdateProgressRequest {
  elapsedDays: number;
  completedTasks?: string[];
  achievements?: Record<string, number>;
}

// ============================================
// API Functions
// ============================================

const BASE_PATH = '/trinity';

/**
 * 전체 Trinity 분석 실행
 */
export async function runFullAnalysis(
  rawDesire: string, 
  scale: number = 1.0,
  elapsedDays: number = 0
): Promise<TrinityEngineData> {
  try {
    const response = await api.post<TrinityEngineData>(
      `${BASE_PATH}/analyze`,
      { rawDesire, scale, elapsedDays }
    );
    return response.data;
  } catch (error) {
    console.error('[Trinity API] Full analysis failed:', error);
    throw error;
  }
}

/**
 * 욕망을 목표로 결정질화
 */
export async function processDesire(
  request: ProcessDesireRequest
): Promise<CrystallizationData> {
  try {
    const response = await api.post<CrystallizationData>(
      `${BASE_PATH}/crystallize`,
      request
    );
    return response.data;
  } catch (error) {
    console.error('[Trinity API] Process desire failed:', error);
    throw error;
  }
}

/**
 * 환경 최적화 (ERT 분류)
 */
export async function optimizeEnvironment(
  request?: OptimizeEnvironmentRequest
): Promise<EnvironmentData> {
  try {
    const response = await api.post<EnvironmentData>(
      `${BASE_PATH}/optimize`,
      request || {}
    );
    return response.data;
  } catch (error) {
    console.error('[Trinity API] Optimize environment failed:', error);
    throw error;
  }
}

/**
 * 진행 상황 스캔
 */
export async function scanProgress(
  request: UpdateProgressRequest
): Promise<ProgressData> {
  try {
    const response = await api.post<ProgressData>(
      `${BASE_PATH}/progress`,
      request
    );
    return response.data;
  } catch (error) {
    console.error('[Trinity API] Scan progress failed:', error);
    throw error;
  }
}

/**
 * 현재 상태 조회
 */
export async function getTrinityState(): Promise<TrinityEngineData | null> {
  try {
    const response = await api.get<TrinityEngineData>(
      `${BASE_PATH}/state`
    );
    return response.data;
  } catch (error) {
    console.warn('[Trinity API] Get state failed, returning null:', error);
    return null;
  }
}

/**
 * Top-N 액션 추천 받기
 */
export async function getRecommendedActions(
  limit: number = 3
): Promise<string[]> {
  try {
    const response = await api.get<{ actions: string[] }>(
      `${BASE_PATH}/actions?limit=${limit}`
    );
    return response.data.actions;
  } catch (error) {
    console.error('[Trinity API] Get actions failed:', error);
    return [];
  }
}

// ============================================
// Mock Data (백엔드 연결 전 테스트용)
// ============================================

export const MOCK_TRINITY_DATA: TrinityEngineData = {
  crystallization: {
    rawDesire: '부자가 되고 싶다',
    category: 'WEALTH',
    targetNodes: [
      { id: 'n01', name: '현금', current: 55, target: 10 },
      { id: 'n03', name: '런웨이', current: 60, target: 5 },
      { id: 'n05', name: '부채', current: 40, target: 10 },
      { id: 'n07', name: '수익', current: 45, target: 20 },
    ],
    requiredMonths: 63,
    requiredHours: 2520,
    feasibility: 68,
    totalPain: 35,
    painBreakdown: {
      financial: 49,
      cognitive: 42,
      temporal: 35,
      emotional: 14,
    },
    activationEnergy: 0.72,
    entropyCost: 0.35,
  },
  environment: {
    eliminated: 30,
    automated: 40,
    parallelized: 20,
    preserved: 10,
    energyEfficiency: 82,
    cognitiveLeakage: 18,
    friction: 11,
    environmentScore: 84,
  },
  progress: {
    progress: 10.4,
    currentCheckpoint: 1,
    totalCheckpoints: 5,
    remainingDays: 1279,
    remainingHours: 1705,
    painEndDate: '2029-07-13',
    uncertainty: 37,
    confidence: 63,
    onTrack: false,
    deviation: -166,
  },
  actions: [
    '63개월간 인내할 결심',
    '10건의 핵심 업무에만 집중',
    '다음 체크포인트까지 255일 견디기',
  ],
  lastUpdated: new Date().toISOString(),
};

/**
 * Mock API (백엔드 없이 테스트)
 */
export const mockTrinityAPI = {
  async runFullAnalysis(): Promise<TrinityEngineData> {
    await new Promise(resolve => setTimeout(resolve, 500)); // 시뮬레이션 딜레이
    return MOCK_TRINITY_DATA;
  },
  
  async processDesire(desire: string): Promise<CrystallizationData> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      ...MOCK_TRINITY_DATA.crystallization,
      rawDesire: desire,
    };
  },
  
  async optimizeEnvironment(): Promise<EnvironmentData> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_TRINITY_DATA.environment;
  },
  
  async scanProgress(): Promise<ProgressData> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_TRINITY_DATA.progress;
  },
};

export default {
  runFullAnalysis,
  processDesire,
  optimizeEnvironment,
  scanProgress,
  getTrinityState,
  getRecommendedActions,
  mockTrinityAPI,
  MOCK_TRINITY_DATA,
};
