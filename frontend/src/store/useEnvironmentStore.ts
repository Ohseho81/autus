/**
 * AUTUS Environment Store
 * ========================
 * #map → #transform 데이터 흐름
 * 
 * Physics Map에서 수집한 환경 변수가
 * Transform Dashboard의 Identity Core에 영향
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ============================================
// Types
// ============================================

export interface EnvironmentData {
  // 시장 변수
  marketVolatility: number;      // 시장 변동성 (0-1)
  externalPressure: number;      // 외부 압력 (-1 ~ 1)
  globalM2C: number;             // 전역 M2C 평균
  
  // 지역 변수
  selectedRegion: string | null;
  regionValue: number;
  regionM2C: number;
  
  // 흐름 변수
  totalFlow: number;
  inflowRatio: number;           // 유입 비율 (0-1)
  flowMomentum: number;          // 흐름 모멘텀 (-1 ~ 1)
  
  // 계산된 지표
  stabilityFactor: number;       // 환경 안정성 (0-100)
  opportunityIndex: number;      // 기회 지수 (0-100)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // 메타데이터
  lastUpdated: Date;
  dataSource: 'physics_map' | 'external_api' | 'mock';
}

interface EnvironmentState extends EnvironmentData {
  // Actions
  updateFromPhysicsMap: (data: Partial<EnvironmentData>) => void;
  setSelectedRegion: (region: string | null, value: number, m2c: number) => void;
  updateMarketConditions: (volatility: number, pressure: number) => void;
  updateFlowData: (total: number, inflow: number, momentum: number) => void;
  reset: () => void;
  
  // Computed (호출 시 계산)
  getImpactOnIdentity: () => {
    entropyDelta: number;
    energyDelta: number;
    momentumDelta: number;
  };
}

// ============================================
// Initial State
// ============================================

const initialState: EnvironmentData = {
  marketVolatility: 0.3,
  externalPressure: 0,
  globalM2C: 1.6,
  
  selectedRegion: null,
  regionValue: 0,
  regionM2C: 0,
  
  totalFlow: 870,
  inflowRatio: 0.52,
  flowMomentum: 0.1,
  
  stabilityFactor: 70,
  opportunityIndex: 55,
  riskLevel: 'medium',
  
  lastUpdated: new Date(),
  dataSource: 'mock',
};

// ============================================
// Helper Functions
// ============================================

function calculateRiskLevel(volatility: number, pressure: number): 'low' | 'medium' | 'high' | 'critical' {
  const riskScore = volatility * 0.6 + Math.abs(pressure) * 0.4;
  if (riskScore < 0.25) return 'low';
  if (riskScore < 0.5) return 'medium';
  if (riskScore < 0.75) return 'high';
  return 'critical';
}

function calculateStability(volatility: number, momentum: number, m2c: number): number {
  // 낮은 변동성 + 긍정적 모멘텀 + 높은 M2C = 높은 안정성
  const volatilityScore = (1 - volatility) * 40;
  const momentumScore = ((momentum + 1) / 2) * 30;
  const m2cScore = Math.min(m2c / 2.5, 1) * 30;
  return Math.round(volatilityScore + momentumScore + m2cScore);
}

function calculateOpportunity(m2c: number, momentum: number, inflowRatio: number): number {
  // 높은 M2C + 긍정적 모멘텀 + 유입 비율 = 기회
  const m2cScore = Math.min(m2c / 2.5, 1) * 40;
  const momentumScore = ((momentum + 1) / 2) * 30;
  const inflowScore = inflowRatio * 30;
  return Math.round(m2cScore + momentumScore + inflowScore);
}

// ============================================
// Store
// ============================================

export const useEnvironmentStore = create<EnvironmentState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    updateFromPhysicsMap: (data) => {
      set((state) => {
        const newState = { ...state, ...data, lastUpdated: new Date(), dataSource: 'physics_map' as const };
        
        // 파생 지표 재계산
        newState.riskLevel = calculateRiskLevel(
          newState.marketVolatility,
          newState.externalPressure
        );
        newState.stabilityFactor = calculateStability(
          newState.marketVolatility,
          newState.flowMomentum,
          newState.globalM2C
        );
        newState.opportunityIndex = calculateOpportunity(
          newState.globalM2C,
          newState.flowMomentum,
          newState.inflowRatio
        );
        
        return newState;
      });
    },
    
    setSelectedRegion: (region, value, m2c) => {
      set({
        selectedRegion: region,
        regionValue: value,
        regionM2C: m2c,
        lastUpdated: new Date(),
      });
    },
    
    updateMarketConditions: (volatility, pressure) => {
      set((state) => ({
        marketVolatility: volatility,
        externalPressure: pressure,
        riskLevel: calculateRiskLevel(volatility, pressure),
        stabilityFactor: calculateStability(volatility, state.flowMomentum, state.globalM2C),
        lastUpdated: new Date(),
      }));
    },
    
    updateFlowData: (total, inflow, momentum) => {
      set((state) => ({
        totalFlow: total,
        inflowRatio: inflow,
        flowMomentum: momentum,
        stabilityFactor: calculateStability(state.marketVolatility, momentum, state.globalM2C),
        opportunityIndex: calculateOpportunity(state.globalM2C, momentum, inflow),
        lastUpdated: new Date(),
      }));
    },
    
    reset: () => set(initialState),
    
    getImpactOnIdentity: () => {
      const state = get();
      
      // 환경이 Identity에 미치는 영향 계산
      // 높은 변동성 → 엔트로피 증가
      // 긍정적 압력 → 에너지 증가
      // 긍정적 모멘텀 → 모멘텀 증가
      
      return {
        entropyDelta: state.marketVolatility * 0.3 - (state.stabilityFactor / 100) * 0.2,
        energyDelta: -state.externalPressure * 0.2 + (state.opportunityIndex / 100) * 0.15,
        momentumDelta: state.flowMomentum * 0.3,
      };
    },
  }))
);

// ============================================
// Selectors
// ============================================

export const selectEnvironmentSummary = (state: EnvironmentState) => ({
  stability: state.stabilityFactor,
  opportunity: state.opportunityIndex,
  risk: state.riskLevel,
  region: state.selectedRegion,
});

export const selectImpactFactors = (state: EnvironmentState) => ({
  volatility: state.marketVolatility,
  pressure: state.externalPressure,
  momentum: state.flowMomentum,
  m2c: state.globalM2C,
});

export default useEnvironmentStore;
