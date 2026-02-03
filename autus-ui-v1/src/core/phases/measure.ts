/**
 * PHASE 7: MEASURE (측정)
 * 리더: Andy Grove (Intel)
 * 원칙: "OKR & Input Metrics"
 */

import type {
  MeasureResult,
  OKR,
  KeyResult,
  TSEL,
  ProofPack,
  LearningPoint,
  LaunchResult,
} from '../workflow';

// ============================================================================
// OKR 템플릿
// ============================================================================

export const OKR_TEMPLATES: Record<string, OKR> = {
  '휴면고객 재활성화': {
    objective: '30일+ 미방문 고객의 복귀율 향상',
    keyResults: [
      { id: 'KR1', metric: '복귀율', baseline: 15, target: 30, unit: '%', period: '2주' },
      { id: 'KR2', metric: '재이탈률', baseline: 50, target: 25, unit: '%', period: '1개월' },
      { id: 'KR3', metric: '휴면발생률', baseline: 20, target: 15, unit: '%', period: '1개월' },
    ],
  },
  '재등록률 향상': {
    objective: '만료 예정 회원의 재등록 전환율 향상',
    keyResults: [
      { id: 'KR1', metric: '재등록률', baseline: 60, target: 80, unit: '%', period: '1개월' },
      { id: 'KR2', metric: '조기재등록률', baseline: 20, target: 40, unit: '%', period: '1개월' },
      { id: 'KR3', metric: '평균등록기간', baseline: 3, target: 6, unit: '개월', period: '1개월' },
    ],
  },
  '신규 회원 확보': {
    objective: '체험 → 정규 전환율 극대화',
    keyResults: [
      { id: 'KR1', metric: '전환율', baseline: 30, target: 50, unit: '%', period: '1개월' },
      { id: 'KR2', metric: '체험신청', baseline: 20, target: 40, unit: '건', period: '1개월' },
      { id: 'KR3', metric: '3개월유지율', baseline: 70, target: 85, unit: '%', period: '3개월' },
    ],
  },
};

// ============================================================================
// TSEL 가중치 (교육서비스업)
// ============================================================================

export const TSEL_WEIGHTS = {
  T: 0.25, // Trust (신뢰)
  S: 0.30, // Satisfaction (만족)
  E: 0.25, // Engagement (참여)
  L: 0.20, // Loyalty (충성)
};

// ============================================================================
// MEASURE Phase Engine
// ============================================================================

export const measurePhase = {
  /**
   * STEP 1: OKR 자동 생성
   */
  generateOKR: (missionType: string): OKR => {
    const template = OKR_TEMPLATES[missionType];
    if (template) {
      return template;
    }

    // 커스텀 미션의 경우 기본 템플릿 사용
    return {
      objective: `${missionType} 목표 달성`,
      keyResults: [
        { id: 'KR1', metric: '목표달성률', baseline: 0, target: 100, unit: '%', period: '1개월' },
      ],
    };
  },

  /**
   * STEP 2: TSEL 지수 계산
   */
  calculateTSEL: (data: {
    trustScore: number;
    satisfactionScore: number;
    engagementScore: number;
    loyaltyScore: number;
  }): TSEL => {
    const T = data.trustScore || 0;
    const S = data.satisfactionScore || 0;
    const E = data.engagementScore || 0;
    const L = data.loyaltyScore || 0;

    const R = (T * TSEL_WEIGHTS.T) + (S * TSEL_WEIGHTS.S) + (E * TSEL_WEIGHTS.E) + (L * TSEL_WEIGHTS.L);

    return {
      T: parseFloat(T.toFixed(2)),
      S: parseFloat(S.toFixed(2)),
      E: parseFloat(E.toFixed(2)),
      L: parseFloat(L.toFixed(2)),
      R: parseFloat(R.toFixed(2)),
    };
  },

  /**
   * STEP 3: OKR 달성률 계산
   */
  calculateOKRProgress: (
    okr: OKR,
    actualData: Record<string, number>
  ): KeyResult[] => {
    return okr.keyResults.map(kr => {
      const actual = actualData[kr.id] ?? kr.baseline;
      let progress: number;

      if (kr.target > kr.baseline) {
        // 증가 목표 (예: 복귀율 15% → 30%)
        progress = ((actual - kr.baseline) / (kr.target - kr.baseline)) * 100;
      } else {
        // 감소 목표 (예: 이탈률 50% → 25%)
        progress = ((kr.baseline - actual) / (kr.baseline - kr.target)) * 100;
      }

      // 0~150% 범위로 제한
      progress = Math.min(Math.max(progress, 0), 150);

      return {
        ...kr,
        actual,
        progress: progress.toFixed(0),
        status: progress >= 100 ? '✅' : progress >= 70 ? '⚠️' : '❌',
      };
    });
  },

  /**
   * STEP 4: 학습 포인트 추출
   */
  extractLearningPoints: (okrProgress: KeyResult[]): LearningPoint[] => {
    const points: LearningPoint[] = [];

    okrProgress.forEach(kr => {
      const progress = parseFloat(kr.progress || '0');
      
      if (progress >= 120) {
        points.push({
          type: 'SUCCESS',
          kr: kr.id,
          insight: `${kr.metric} 목표 초과 달성 (${kr.progress}%) - 성공 패턴 기록`,
        });
      } else if (progress < 70) {
        points.push({
          type: 'IMPROVE',
          kr: kr.id,
          insight: `${kr.metric} 목표 미달 (${kr.progress}%) - 원인 분석 필요`,
        });
      }
    });

    return points;
  },

  /**
   * STEP 5: Proof Pack 생성
   */
  generateProofPack: (
    missionType: string,
    okrProgress: KeyResult[],
    tselBefore: TSEL,
    tselAfter: TSEL,
    evidence: { startDate: string; endDate: string; items: string[] }
  ): ProofPack => {
    const avgProgress = okrProgress.reduce(
      (sum, kr) => sum + parseFloat(kr.progress || '0'),
      0
    ) / okrProgress.length;

    const tselChange = (tselAfter.R - tselBefore.R).toFixed(2);
    const tselChangePercent = ((tselAfter.R - tselBefore.R) / tselBefore.R * 100).toFixed(0);

    return {
      mission: missionType,
      period: {
        start: evidence.startDate,
        end: evidence.endDate,
      },
      status: avgProgress >= 100 ? 'ACHIEVED' : avgProgress >= 70 ? 'PARTIAL' : 'FAILED',
      summary: {
        avgOKRProgress: avgProgress.toFixed(0) + '%',
        tselBefore: tselBefore.R.toString(),
        tselAfter: tselAfter.R.toString(),
        tselChange: `+${tselChange} (+${tselChangePercent}%)`,
      },
      okrResults: okrProgress,
      tselBreakdown: {
        before: tselBefore,
        after: tselAfter,
      },
      evidence: evidence.items,
      learningPoints: measurePhase.extractLearningPoints(okrProgress),
    };
  },

  /**
   * 전체 실행
   */
  execute: (
    launchResult: LaunchResult,
    missionType: string,
    actualData: Record<string, number>,
    tselBefore: TSEL,
    tselAfter: TSEL,
    evidence: { startDate: string; endDate: string; items: string[] }
  ): MeasureResult => {
    const okr = measurePhase.generateOKR(missionType);
    const okrProgress = measurePhase.calculateOKRProgress(okr, actualData);
    const proofPack = measurePhase.generateProofPack(
      missionType,
      okrProgress,
      tselBefore,
      tselAfter,
      evidence
    );

    return {
      phase: 'MEASURE',
      status: 'COMPLETE',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      okr,
      okrProgress,
      tsel: {
        before: tselBefore,
        after: tselAfter,
      },
      proofPack,
      nextPhase: 'LEARN',
    };
  },
};

export default measurePhase;
