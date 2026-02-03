/**
 * PHASE 9: SCALE (확장)
 * 리더: Jeff Bezos (Amazon)
 * 원칙: "Flywheel Effect" (플라이휠 효과)
 */

import type {
  ScaleResult,
  ScaleAction,
  Flywheel,
  FlywheelStep,
  LearnResult,
} from '../workflow';
import { shouldEliminate, shouldScaleUp } from '../workflow';

// ============================================================================
// 플라이휠 템플릿 (교육서비스업)
// ============================================================================

export const EDUCATION_FLYWHEEL: Flywheel = {
  elements: [
    { step: 1, action: '만족한 회원', metric: 'NPS 70+' },
    { step: 2, action: '추천 증가', metric: '추천률 30%' },
    { step: 3, action: '신규 회원 증가', metric: '월 +10명' },
    { step: 4, action: '수익 증가', metric: '월 +300만원' },
    { step: 5, action: '프로그램 투자', metric: '신규 클래스 개설' },
    { step: 6, action: '품질 향상', metric: '만족도 +5%' },
    // → 1번으로 돌아감
  ],
  accelerators: [
    '개인화 서비스 강화',
    '자동화로 운영 효율화',
    '데이터 기반 의사결정',
    'AI 성장 리포트',
  ],
  decelerators: [
    '수동 프로세스',
    '고객 불만 미처리',
    '경쟁사 대응 지연',
    '인력 부족',
  ],
};

// ============================================================================
// 다음 미션 추천 매핑
// ============================================================================

export const NEXT_MISSION_MAP: Record<string, string[]> = {
  '휴면고객 재활성화': ['재등록률 향상', '추천 프로그램 도입'],
  '재등록률 향상': ['장기 회원 혜택', '프리미엄 프로그램 출시'],
  '신규 회원 확보': ['온보딩 강화', '첫달 경험 최적화'],
};

// ============================================================================
// SCALE Phase Engine
// ============================================================================

export const scalePhase = {
  /**
   * 플라이휠 설계
   */
  designFlywheel: (missionName: string): Flywheel => {
    // 기본 교육서비스업 플라이휠 사용
    // 미션별 커스터마이징 가능
    return EDUCATION_FLYWHEEL;
  },

  /**
   * 확장 액션 결정
   */
  determineScaleAction: (
    K: number,
    I: number,
    Omega: number,
    stagnantDays: number
  ): ScaleAction => {
    if (shouldEliminate(K, I, Omega, stagnantDays)) {
      return 'ELIMINATE';
    }
    if (shouldScaleUp(K, Omega)) {
      return 'SCALE_UP';
    }
    return 'MAINTAIN';
  },

  /**
   * 다음 미션 추천
   */
  suggestNextMissions: (currentMission: string): string[] => {
    return NEXT_MISSION_MAP[currentMission] || ['데이터 분석 강화', '고객 만족도 조사'];
  },

  /**
   * 삭제 시 절감 효과
   */
  calculateEliminationSavings: (estimatedTime: number): {
    savedTime: string;
    savedEnergy: string;
    freedSlot: string;
  } => {
    return {
      savedTime: `${estimatedTime}시간/월`,
      savedEnergy: '100%',
      freedSlot: '새 미션 수용 가능',
    };
  },

  /**
   * 확장 리소스 계획
   */
  planResources: (flywheel: Flywheel): {
    requiredInvestment: string;
    expectedReturn: string;
    timeline: string;
  } => {
    return {
      requiredInvestment: '월 50만원 (마케팅 + 시스템)',
      expectedReturn: '월 300만원 (신규 매출)',
      timeline: '3개월 후 ROI 달성',
    };
  },

  /**
   * 다음 사이클 추천
   */
  recommendNextCycle: (learnResult: LearnResult): string => {
    const hasImprovements = learnResult.howToImprove.length > 0;
    const hasSuccessPatterns = learnResult.patterns.successPatterns.length > 0;

    if (hasImprovements && hasSuccessPatterns) {
      return '성공 패턴 확대 적용 + 개선 포인트 반영';
    }
    if (hasImprovements) {
      return '개선 포인트 우선 반영 후 재측정';
    }
    if (hasSuccessPatterns) {
      return '성공 패턴 다른 세그먼트로 확대';
    }
    return '추가 데이터 수집 후 재분석';
  },

  /**
   * 전체 실행
   */
  execute: (
    learnResult: LearnResult,
    missionName: string,
    indices: { K: number; I: number; Omega: number },
    stagnantDays: number = 0,
    estimatedTime: number = 10
  ): ScaleResult => {
    const { K, I, Omega } = indices;
    const scaleAction = scalePhase.determineScaleAction(K, I, Omega, stagnantDays);

    let result: ScaleResult = {
      phase: 'SCALE',
      status: 'COMPLETE',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      scaleAction,
    };

    if (scaleAction === 'SCALE_UP') {
      const flywheel = scalePhase.designFlywheel(missionName);
      result = {
        ...result,
        flywheel,
        nextMissions: scalePhase.suggestNextMissions(missionName),
      };
    } else if (scaleAction === 'ELIMINATE') {
      const savings = scalePhase.calculateEliminationSavings(estimatedTime);
      result = {
        ...result,
        savedTime: savings.savedTime,
        savedEnergy: savings.savedEnergy,
      };
    } else {
      result = {
        ...result,
        nextCycleRecommendation: scalePhase.recommendNextCycle(learnResult),
      };
    }

    return result;
  },
};

export default scalePhase;
