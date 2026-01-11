/**
 * AUTUS Trinity Engine Store
 * ==========================
 * 
 * Trinity Engine 상태 관리 (Zustand)
 * - 목표 결정질화 (Crystallization)
 * - 환경 최적화 (Environment)
 * - 진행 추적 (Progress)
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  TrinityEngineData,
  CrystallizationData,
  EnvironmentData,
  ProgressData,
  DesireCategory,
  mockTrinityAPI,
  MOCK_TRINITY_DATA,
} from '../api/trinity';

// ============================================
// Types
// ============================================

export interface TrinityEngineState {
  // 데이터
  data: TrinityEngineData | null;
  isLoading: boolean;
  error: string | null;
  
  // 사용자 입력
  userDesire: string;
  selectedCategory: DesireCategory | null;
  scale: number;  // 목표 스케일 (1.0 = 기본)
  elapsedDays: number;
  
  // UI 상태
  activeStep: 1 | 2 | 3;  // 현재 활성화된 Trinity 단계
  isExpanded: boolean;
  showInputModal: boolean;
  
  // 액션
  setUserDesire: (desire: string) => void;
  setCategory: (category: DesireCategory | null) => void;
  setScale: (scale: number) => void;
  setElapsedDays: (days: number) => void;
  setActiveStep: (step: 1 | 2 | 3) => void;
  toggleExpanded: () => void;
  toggleInputModal: () => void;
  
  // API 액션
  runAnalysis: () => Promise<void>;
  refreshData: () => Promise<void>;
  updateProgress: (achievements?: Record<string, number>) => Promise<void>;
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState = {
  data: null,
  isLoading: false,
  error: null,
  userDesire: '',
  selectedCategory: null as DesireCategory | null,
  scale: 1.0,
  elapsedDays: 0,
  activeStep: 1 as const,
  isExpanded: false,
  showInputModal: false,
};

// ============================================
// Store
// ============================================

export const useTrinityEngineStore = create<TrinityEngineState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // 기본 세터
          setUserDesire: (desire) => set((state) => {
            state.userDesire = desire;
          }),
          
          setCategory: (category) => set((state) => {
            state.selectedCategory = category;
          }),
          
          setScale: (scale) => set((state) => {
            state.scale = Math.max(0.1, Math.min(10, scale));
          }),
          
          setElapsedDays: (days) => set((state) => {
            state.elapsedDays = Math.max(0, days);
          }),
          
          setActiveStep: (step) => set((state) => {
            state.activeStep = step;
          }),
          
          toggleExpanded: () => set((state) => {
            state.isExpanded = !state.isExpanded;
          }),
          
          toggleInputModal: () => set((state) => {
            state.showInputModal = !state.showInputModal;
          }),
          
          // API 액션
          runAnalysis: async () => {
            const { userDesire, scale, elapsedDays } = get();
            
            if (!userDesire.trim()) {
              set((state) => {
                state.error = '목표를 입력해주세요';
              });
              return;
            }
            
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });
            
            try {
              // TODO: 실제 API 연결 시 주석 해제
              // const result = await trinityAPI.runFullAnalysis(userDesire, scale, elapsedDays);
              
              // Mock API 사용 (테스트용)
              const result = await mockTrinityAPI.runFullAnalysis();
              result.crystallization.rawDesire = userDesire;
              
              set((state) => {
                state.data = result;
                state.isLoading = false;
                state.showInputModal = false;
              });
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : '분석 실패';
                state.isLoading = false;
              });
            }
          },
          
          refreshData: async () => {
            set((state) => {
              state.isLoading = true;
            });
            
            try {
              // Mock 데이터로 새로고침
              const result = await mockTrinityAPI.runFullAnalysis();
              
              set((state) => {
                state.data = result;
                state.isLoading = false;
              });
            } catch (error) {
              set((state) => {
                state.isLoading = false;
              });
            }
          },
          
          updateProgress: async (achievements) => {
            const { elapsedDays, data } = get();
            
            if (!data) return;
            
            set((state) => {
              state.isLoading = true;
            });
            
            try {
              const result = await mockTrinityAPI.scanProgress();
              
              set((state) => {
                if (state.data) {
                  state.data.progress = result;
                }
                state.isLoading = false;
              });
            } catch (error) {
              set((state) => {
                state.isLoading = false;
              });
            }
          },
          
          reset: () => set((state) => {
            Object.assign(state, initialState);
          }),
        }))
      ),
      {
        name: 'trinity-engine-store',
        partialize: (state) => ({
          userDesire: state.userDesire,
          selectedCategory: state.selectedCategory,
          scale: state.scale,
          elapsedDays: state.elapsedDays,
          data: state.data,
        }),
      }
    ),
    { name: 'TrinityEngine' }
  )
);

// ============================================
// Selectors
// ============================================

// 기본 셀렉터
export const selectTrinityData = (state: TrinityEngineState) => state.data;
export const selectIsLoading = (state: TrinityEngineState) => state.isLoading;
export const selectError = (state: TrinityEngineState) => state.error;
export const selectActiveStep = (state: TrinityEngineState) => state.activeStep;

// 파생 셀렉터
export const selectCrystallization = (state: TrinityEngineState) => 
  state.data?.crystallization ?? null;

export const selectEnvironment = (state: TrinityEngineState) => 
  state.data?.environment ?? null;

export const selectProgress = (state: TrinityEngineState) => 
  state.data?.progress ?? null;

export const selectActions = (state: TrinityEngineState) => 
  state.data?.actions ?? [];

export const selectOptimizationRate = (state: TrinityEngineState) => {
  const env = state.data?.environment;
  if (!env) return 0;
  
  const total = env.eliminated + env.automated + env.parallelized + env.preserved;
  const ert = env.eliminated + env.automated + env.parallelized;
  return total > 0 ? Math.round((ert / total) * 100) : 0;
};

export const selectIsOnTrack = (state: TrinityEngineState) => 
  state.data?.progress?.onTrack ?? false;

export const selectHasData = (state: TrinityEngineState) => 
  state.data !== null;

// ============================================
// Hooks
// ============================================

/**
 * Trinity Engine 데이터 훅 (컴포넌트용)
 */
export function useTrinityEngineData() {
  return useTrinityEngineStore((state) => ({
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    hasData: state.data !== null,
  }));
}

/**
 * Trinity Engine 액션 훅
 */
export function useTrinityEngineActions() {
  return useTrinityEngineStore((state) => ({
    runAnalysis: state.runAnalysis,
    refreshData: state.refreshData,
    updateProgress: state.updateProgress,
    reset: state.reset,
    setUserDesire: state.setUserDesire,
    toggleInputModal: state.toggleInputModal,
  }));
}

/**
 * Trinity Engine UI 상태 훅
 */
export function useTrinityEngineUI() {
  return useTrinityEngineStore((state) => ({
    activeStep: state.activeStep,
    isExpanded: state.isExpanded,
    showInputModal: state.showInputModal,
    userDesire: state.userDesire,
    setActiveStep: state.setActiveStep,
    toggleExpanded: state.toggleExpanded,
    toggleInputModal: state.toggleInputModal,
  }));
}

export default useTrinityEngineStore;
