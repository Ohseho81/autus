/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Module State Management Hook
 * 모듈 활성화 상태 관리
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MODULE_CONFIGS,
  type ModuleId,
  type PlanType,
  getDefaultEnabledModules,
  canEnableModule,
  getModuleDependencies,
} from './module-config';

// ═══════════════════════════════════════════════════════════════════════════════
// MVP 기본 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const MVP_DEFAULTS = {
  plan: 'PRO' as PlanType,
  // MVP에서 기본 활성화할 모듈
  enabledModules: [
    'CORE',           // 필수
    '4_NODE_VIEW',    // 역할별 대시보드 (테스트용)
    'AI_ASSISTANT',   // AI 기능 테스트
    'GOAL_STRATEGY',  // 목표/Monopoly 테스트
  ] as ModuleId[],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModuleState {
  plan: PlanType;
  enabledModules: ModuleId[];
  isLoading: boolean;
  error: string | null;
}

export interface UseModulesReturn extends ModuleState {
  isModuleEnabled: (moduleId: ModuleId) => boolean;
  enableModule: (moduleId: ModuleId) => void;
  disableModule: (moduleId: ModuleId) => void;
  toggleModule: (moduleId: ModuleId) => void;
  canEnable: (moduleId: ModuleId) => boolean;
  resetToDefaults: () => void;
  saveSettings: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 로컬 스토리지 키
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'autus_module_settings';

// ═══════════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════════

export function useModules(orgId?: string): UseModulesReturn {
  const [state, setState] = useState<ModuleState>({
    plan: MVP_DEFAULTS.plan,
    enabledModules: MVP_DEFAULTS.enabledModules,
    isLoading: true,
    error: null,
  });

  // 초기 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 로컬 스토리지에서 로드
        const stored = localStorage.getItem(`${STORAGE_KEY}_${orgId || 'default'}`);
        
        if (stored) {
          const parsed = JSON.parse(stored);
          setState({
            plan: parsed.plan || MVP_DEFAULTS.plan,
            enabledModules: parsed.enabledModules || MVP_DEFAULTS.enabledModules,
            isLoading: false,
            error: null,
          });
        } else {
          // MVP 기본값 사용
          setState({
            ...MVP_DEFAULTS,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: '설정을 불러오는데 실패했습니다.',
        }));
      }
    };

    loadSettings();
  }, [orgId]);

  // 모듈 활성화 여부 확인
  const isModuleEnabled = useCallback((moduleId: ModuleId): boolean => {
    return state.enabledModules.includes(moduleId);
  }, [state.enabledModules]);

  // 모듈 활성화 가능 여부
  const canEnable = useCallback((moduleId: ModuleId): boolean => {
    return canEnableModule(moduleId, state.plan);
  }, [state.plan]);

  // 모듈 활성화
  const enableModule = useCallback((moduleId: ModuleId) => {
    if (!canEnableModule(moduleId, state.plan)) {
      return;
    }

    setState(prev => {
      // 의존성 모듈도 함께 활성화
      const deps = getModuleDependencies(moduleId);
      const newModules = [...new Set([...prev.enabledModules, moduleId, ...deps])];
      
      return {
        ...prev,
        enabledModules: newModules,
      };
    });
  }, [state.plan]);

  // 모듈 비활성화
  const disableModule = useCallback((moduleId: ModuleId) => {
    const module = MODULE_CONFIGS[moduleId];
    
    // Core는 비활성화 불가
    if (module.isCore) return;

    setState(prev => {
      // 이 모듈에 의존하는 다른 모듈도 비활성화
      const dependents = Object.values(MODULE_CONFIGS)
        .filter(m => m.dependencies.includes(moduleId))
        .map(m => m.id);
      
      return {
        ...prev,
        enabledModules: prev.enabledModules.filter(
          id => id !== moduleId && !dependents.includes(id)
        ),
      };
    });
  }, []);

  // 모듈 토글
  const toggleModule = useCallback((moduleId: ModuleId) => {
    if (isModuleEnabled(moduleId)) {
      disableModule(moduleId);
    } else {
      enableModule(moduleId);
    }
  }, [isModuleEnabled, enableModule, disableModule]);

  // 기본값으로 리셋
  const resetToDefaults = useCallback(() => {
    setState({
      ...MVP_DEFAULTS,
      isLoading: false,
      error: null,
    });
  }, []);

  // 설정 저장
  const saveSettings = useCallback(async () => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY}_${orgId || 'default'}`,
        JSON.stringify({
          plan: state.plan,
          enabledModules: state.enabledModules,
        })
      );
      
      // TODO: 서버 API 연동
      // await api.saveModuleSettings(orgId, state);
      
    } catch (err) {
      throw new Error('설정 저장에 실패했습니다.');
    }
  }, [orgId, state]);

  return {
    ...state,
    isModuleEnabled,
    enableModule,
    disableModule,
    toggleModule,
    canEnable,
    resetToDefaults,
    saveSettings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 모듈별 기능 게이트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 특정 기능이 활성화된 모듈에서만 사용 가능한지 확인
 */
export function useFeatureGate(moduleId: ModuleId): {
  isEnabled: boolean;
  requiredPlan: PlanType;
  moduleName: string;
} {
  const { isModuleEnabled, plan } = useModules();
  const module = MODULE_CONFIGS[moduleId];

  return {
    isEnabled: isModuleEnabled(moduleId),
    requiredPlan: module.minPlan,
    moduleName: module.nameKo,
  };
}

/**
 * Core σ 계산 모드 (basic vs advanced)
 */
export function useSigmaMode(): 'basic' | 'advanced' {
  const { isModuleEnabled } = useModules();
  return isModuleEnabled('ADVANCED_ANALYTICS') ? 'advanced' : 'basic';
}

export default useModules;
