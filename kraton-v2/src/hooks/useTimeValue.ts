/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⏱️ useTimeValue Hook - AUTUS 시간 측정 체계 통합 훅
 * 
 * Quick Tag, Risk Queue 등 기존 모듈에서 시간 가치 측정을 쉽게 사용
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useMemo } from 'react';
import {
  calculateLambda,
  calculateSigma,
  calculateDensity,
  calculateSynergyMultiplier,
  calculateRelationshipValue,
  calculateNetTimeValue,
  toSTU,
  stuToMoney,
  DEFAULT_LAMBDA_BY_ROLE,
  RELATIONSHIP_DEPTH_LEVELS,
} from '../lib/physics/time-value';
import type {
  LambdaFactors,
  SigmaFactors,
  DensityFactors,
  TimeValueResult,
  NetTimeValue,
  STUConversion,
} from '../lib/physics/time-types';

// ═══════════════════════════════════════════════════════════════════════════
// Hook Interface
// ═══════════════════════════════════════════════════════════════════════════

interface UseTimeValueOptions {
  orgId?: string;
  defaultOmega?: number;
  autoSync?: boolean;
}

interface TimeActivity {
  activityType: string;
  realTimeHours: number;
  timeNature: 't1_invested' | 't2_saved' | 't3_created';
  targetId?: string;
  targetType?: string;
}

interface RecordedActivity extends TimeActivity {
  id: string;
  lambda: number;
  stuValue: number;
  recordedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════

export function useTimeValue(options: UseTimeValueOptions = {}) {
  const { orgId = 'demo-org', defaultOmega = 30000, autoSync = false } = options;

  // State
  const [omega, setOmega] = useState(defaultOmega);
  const [activities, setActivities] = useState<RecordedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // λ (Lambda) 계산
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 역할 기반 λ 가져오기
   */
  const getLambdaByRole = useCallback((role: string): number => {
    return DEFAULT_LAMBDA_BY_ROLE[role] || 1.0;
  }, []);

  /**
   * 커스텀 λ 계산
   */
  const computeLambda = useCallback((factors: LambdaFactors, industryK = 0.3): number => {
    return calculateLambda(factors, industryK);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // σ (Sigma) 계산
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 시너지 계수 계산
   */
  const computeSigma = useCallback((factors: SigmaFactors): number => {
    return calculateSigma(factors);
  }, []);

  /**
   * 시너지 배율 계산 (시간 경과에 따른)
   */
  const getSynergyMultiplier = useCallback((sigma: number, timeMonths: number): number => {
    return calculateSynergyMultiplier(sigma, timeMonths);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // P (Density) 계산
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 관계 밀도 계산
   */
  const computeDensity = useCallback((factors: DensityFactors): number => {
    return calculateDensity(factors);
  }, []);

  /**
   * 관계 깊이 단계 점수 가져오기
   */
  const getDepthScore = useCallback((level: keyof typeof RELATIONSHIP_DEPTH_LEVELS): number => {
    return RELATIONSHIP_DEPTH_LEVELS[level] || 0.2;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STU 변환
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 실제 시간 → STU 변환
   */
  const convertToSTU = useCallback((realTimeHours: number, lambda: number): number => {
    return toSTU(realTimeHours, lambda);
  }, []);

  /**
   * STU → 화폐 가치 변환
   */
  const convertToMoney = useCallback((stu: number): number => {
    return stuToMoney(stu, omega);
  }, [omega]);

  /**
   * 전체 변환 (실제 시간 → STU → 화폐)
   */
  const fullConversion = useCallback((realTimeHours: number, lambda: number): STUConversion => {
    const stu = toSTU(realTimeHours, lambda);
    const monetaryValue = stuToMoney(stu, omega);
    return {
      real_time_hours: realTimeHours,
      lambda,
      stu,
      omega,
      monetary_value: monetaryValue,
    };
  }, [omega]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 활동 기록
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 시간 활동 기록 (Quick Tag 연동용)
   */
  const recordActivity = useCallback(async (
    activity: TimeActivity,
    role: string = 'optimus'
  ): Promise<RecordedActivity> => {
    const lambda = getLambdaByRole(role);
    const stuValue = toSTU(activity.realTimeHours, lambda);

    const recordedActivity: RecordedActivity = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lambda,
      stuValue,
      recordedAt: new Date(),
    };

    setActivities(prev => [...prev, recordedActivity]);

    // API 동기화 (autoSync 활성화 시)
    if (autoSync) {
      try {
        await fetch('/api/time-value', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'record_activity',
            org_id: orgId,
            node_id: 'current-user', // 실제로는 세션에서 가져옴
            ...activity,
            real_time_hours: activity.realTimeHours,
            time_nature: activity.timeNature,
          }),
        });
      } catch (err) {
        console.error('Failed to sync activity:', err);
      }
    }

    return recordedActivity;
  }, [orgId, autoSync, getLambdaByRole]);

  /**
   * Quick Tag에서 상담 시간 자동 기록
   */
  const recordQuickTagTime = useCallback(async (
    targetId: string,
    targetType: 'student' | 'parent',
    durationMinutes: number,
    role: string = 'optimus'
  ): Promise<RecordedActivity> => {
    return recordActivity({
      activityType: 'quick_tag',
      realTimeHours: durationMinutes / 60,
      timeNature: 't1_invested',
      targetId,
      targetType,
    }, role);
  }, [recordActivity]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 관계 가치 계산
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 관계 가치 계산
   */
  const computeRelationshipValue = useCallback((
    density: number,
    mutualTimeValue: number,
    sigma: number,
    timeMonths: number
  ): TimeValueResult => {
    return calculateRelationshipValue(density, mutualTimeValue, sigma, timeMonths);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // NTV 계산
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 현재 세션의 NTV 계산
   */
  const sessionNTV = useMemo((): NetTimeValue => {
    const t1 = activities
      .filter(a => a.timeNature === 't1_invested')
      .reduce((sum, a) => sum + a.stuValue, 0);
    
    const t2 = activities
      .filter(a => a.timeNature === 't2_saved')
      .reduce((sum, a) => sum + a.stuValue, 0);
    
    const t3 = activities
      .filter(a => a.timeNature === 't3_created')
      .reduce((sum, a) => sum + a.stuValue, 0);

    return calculateNetTimeValue(t1, t2, t3);
  }, [activities]);

  /**
   * 커스텀 NTV 계산
   */
  const computeNTV = useCallback((t1: number, t2: number, t3: number): NetTimeValue => {
    return calculateNetTimeValue(t1, t2, t3);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Quick Tag 통합 헬퍼
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Quick Tag 완료 시 시간 가치 계산 (감정 델타 → σ 업데이트)
   */
  const processQuickTag = useCallback(async (params: {
    taggerRole: string;
    targetId: string;
    targetType: 'student' | 'parent';
    emotionDelta: number;  // -20 ~ +20
    bondStrength: 'strong' | 'normal' | 'cold';
    durationMinutes: number;
  }) => {
    const { taggerRole, targetId, targetType, emotionDelta, bondStrength, durationMinutes } = params;

    // 1. 시간 활동 기록
    const activity = await recordQuickTagTime(targetId, targetType, durationMinutes, taggerRole);

    // 2. σ 영향 계산 (감정 델타 기반)
    const compatibilityChange = emotionDelta / 40; // -0.5 ~ +0.5
    const bondFactor = bondStrength === 'strong' ? 0.2 : bondStrength === 'cold' ? -0.2 : 0;

    // 3. 결과 반환
    return {
      activity,
      timeValue: {
        realTimeHours: durationMinutes / 60,
        lambda: activity.lambda,
        stuValue: activity.stuValue,
        monetaryValue: stuToMoney(activity.stuValue, omega),
      },
      relationshipImpact: {
        compatibilityDelta: compatibilityChange,
        bondFactor,
        estimatedSigmaChange: (compatibilityChange + bondFactor) / 2,
      },
    };
  }, [recordQuickTagTime, omega]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Return
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // State
    omega,
    setOmega,
    activities,
    sessionNTV,
    isLoading,
    error,

    // λ functions
    getLambdaByRole,
    computeLambda,

    // σ functions
    computeSigma,
    getSynergyMultiplier,

    // P functions
    computeDensity,
    getDepthScore,

    // STU conversion
    convertToSTU,
    convertToMoney,
    fullConversion,

    // Activity recording
    recordActivity,
    recordQuickTagTime,

    // Value calculation
    computeRelationshipValue,
    computeNTV,

    // Quick Tag integration
    processQuickTag,

    // Constants
    DEFAULT_LAMBDA_BY_ROLE,
    RELATIONSHIP_DEPTH_LEVELS,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Quick Tag에 표시할 시간 가치 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

export function TimeValueBadge({ 
  stuValue, 
  omega = 30000,
  showMoney = true 
}: { 
  stuValue: number; 
  omega?: number;
  showMoney?: boolean;
}) {
  const monetaryValue = stuValue * omega;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-sm">
      <span className="text-amber-400">⏱️</span>
      <span className="text-white font-mono">{stuValue.toFixed(2)} STU</span>
      {showMoney && (
        <>
          <span className="text-gray-500">≈</span>
          <span className="text-emerald-400">₩{monetaryValue.toLocaleString()}</span>
        </>
      )}
    </div>
  );
}
