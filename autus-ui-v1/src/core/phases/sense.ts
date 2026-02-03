/**
 * PHASE 1: SENSE (감지)
 * 리더: Ray Dalio (Bridgewater)
 * 원칙: "약한 신호 포착" (Weak Signal Detection)
 */

import type { Signal, SenseResult } from '../workflow';

// ============================================================================
// 신호 감지 임계값
// ============================================================================

export const SIGNAL_THRESHOLDS = {
  revenueDrop: { value: -0.15, weight: 0.30, urgency: 'HIGH' as const },
  churnIncrease: { value: 0.20, weight: 0.25, urgency: 'HIGH' as const },
  attendanceDrop: { value: -0.10, weight: 0.20, urgency: 'MEDIUM' as const },
  complaintIncrease: { value: 0.30, weight: 0.15, urgency: 'MEDIUM' as const },
  competitorEvent: { value: 1, weight: 0.10, urgency: 'LOW' as const },
};

// ============================================================================
// 8대 외부환경 요소
// ============================================================================

export interface EnvironmentFactors {
  competition: number;  // 경쟁 (-5 ~ +5)
  economy: number;      // 경제 (-5 ~ +5)
  technology: number;   // 기술 (-5 ~ +5)
  society: number;      // 사회 (-5 ~ +5)
  policy: number;       // 정책 (-5 ~ +5)
  season: number;       // 계절 (-5 ~ +5)
  trend: number;        // 트렌드 (-5 ~ +5)
  customer: number;     // 고객 (-5 ~ +5)
}

// ============================================================================
// 데이터 수집 인터페이스
// ============================================================================

export interface InternalData {
  revenue: number;
  revenueChange: number;
  activeMembers: number;
  churnRate: number;
  attendanceRate: number;
}

export interface VoiceData {
  reviewScore: number;
  complaintCount: number;
  inquiryCount: number;
}

export interface ExternalData {
  marketGrowth: number;
  competitorEvents: number;
  seasonFactor: number;
}

export interface TriggerData {
  upcomingEvents: string[];
  holidays: string[];
  seasonChange: string;
}

export interface CollectedData {
  internal: InternalData;
  voice: VoiceData;
  external: ExternalData;
  trigger: TriggerData;
}

// ============================================================================
// SENSE Phase Engine
// ============================================================================

export const sensePhase = {
  /**
   * STEP 1: 데이터 수집
   */
  collectData: (brandConfig: { factors: EnvironmentFactors }): CollectedData => {
    // 실제 구현에서는 API/DB에서 데이터 수집
    // 여기서는 기본 구조만 정의
    return {
      internal: {
        revenue: 0,
        revenueChange: 0,
        activeMembers: 0,
        churnRate: 0,
        attendanceRate: 0,
      },
      voice: {
        reviewScore: 0,
        complaintCount: 0,
        inquiryCount: 0,
      },
      external: {
        marketGrowth: 0,
        competitorEvents: 0,
        seasonFactor: 1.0,
      },
      trigger: {
        upcomingEvents: [],
        holidays: [],
        seasonChange: '',
      },
    };
  },

  /**
   * STEP 2: 신호 탐지
   */
  detectSignals: (data: CollectedData): Signal[] => {
    const signals: Signal[] = [];

    // 매출 급감 신호
    if (data.internal.revenueChange < SIGNAL_THRESHOLDS.revenueDrop.value) {
      signals.push({
        type: 'THREAT',
        signal: '매출 급감 감지',
        value: data.internal.revenueChange,
        threshold: SIGNAL_THRESHOLDS.revenueDrop.value,
        urgency: 'HIGH',
        weight: 0.30,
      });
    }

    // 이탈률 증가 신호
    if (data.internal.churnRate > SIGNAL_THRESHOLDS.churnIncrease.value) {
      signals.push({
        type: 'THREAT',
        signal: '이탈률 증가 감지',
        value: data.internal.churnRate,
        threshold: SIGNAL_THRESHOLDS.churnIncrease.value,
        urgency: 'HIGH',
        weight: 0.25,
      });
    }

    // 출석률 하락 신호
    if (data.internal.attendanceRate < (1 + SIGNAL_THRESHOLDS.attendanceDrop.value)) {
      signals.push({
        type: 'THREAT',
        signal: '출석률 하락 감지',
        value: data.internal.attendanceRate,
        threshold: 1 + SIGNAL_THRESHOLDS.attendanceDrop.value,
        urgency: 'MEDIUM',
        weight: 0.20,
      });
    }

    // 불만 증가 신호
    if (data.voice.complaintCount > 5) {
      signals.push({
        type: 'THREAT',
        signal: '불만 리뷰 증가 감지',
        value: data.voice.complaintCount,
        threshold: 5,
        urgency: 'MEDIUM',
        weight: 0.15,
      });
    }

    // 경쟁사 이벤트 신호
    if (data.external.competitorEvents > 0) {
      signals.push({
        type: 'THREAT',
        signal: '경쟁사 이벤트 감지',
        value: data.external.competitorEvents,
        threshold: 1,
        urgency: 'LOW',
        weight: 0.10,
      });
    }

    // 기회 신호: 시장 성장
    if (data.external.marketGrowth > 0.05) {
      signals.push({
        type: 'OPPORTUNITY',
        signal: '시장 성장 감지',
        value: data.external.marketGrowth,
        threshold: 0.05,
        urgency: 'MEDIUM',
        weight: 0.20,
      });
    }

    // 기회 신호: 높은 리뷰 점수
    if (data.voice.reviewScore >= 4.5) {
      signals.push({
        type: 'OPPORTUNITY',
        signal: '높은 고객 만족도',
        value: data.voice.reviewScore,
        threshold: 4.5,
        urgency: 'LOW',
        weight: 0.15,
      });
    }

    return signals;
  },

  /**
   * STEP 3: 환경 지수 계산 (σ)
   */
  calculateEnvironmentIndex: (factors: EnvironmentFactors): number => {
    const sum = Object.values(factors).reduce((a, b) => a + b, 0);
    const sigma = sum / 100; // 월간 성장률로 변환
    return sigma;
  },

  /**
   * STEP 4: 미래 예측
   * R(t+n) = R(t) × (1 + σ)^n
   */
  predictFuture: (
    currentValue: number,
    sigma: number,
    months: number = 3
  ): { current: number; predicted: number; change: string; months: number; sigma: number } => {
    const predicted = currentValue * Math.pow(1 + sigma, months);
    const change = ((predicted - currentValue) / currentValue) * 100;
    return {
      current: currentValue,
      predicted: Math.round(predicted),
      change: change.toFixed(1),
      months,
      sigma,
    };
  },

  /**
   * 전체 실행
   */
  execute: (
    brandConfig: { factors: EnvironmentFactors },
    missionInput: { name: string }
  ): SenseResult => {
    const data = sensePhase.collectData(brandConfig);
    const signals = sensePhase.detectSignals(data);
    const sigma = sensePhase.calculateEnvironmentIndex(brandConfig.factors);
    const prediction = sensePhase.predictFuture(data.internal.revenue || 1000000, sigma);

    const hasHighUrgency = signals.some(s => s.urgency === 'HIGH');
    const hasMediumUrgency = signals.some(s => s.urgency === 'MEDIUM');

    return {
      phase: 'SENSE',
      status: 'COMPLETE',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      signals,
      environmentIndex: sigma,
      prediction,
      urgencyLevel: hasHighUrgency ? 'HIGH' : hasMediumUrgency ? 'MEDIUM' : 'LOW',
      nextPhase: 'ANALYZE',
    };
  },
};

export default sensePhase;
