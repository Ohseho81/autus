/**
 * PHASE 3: STRATEGIZE (전략)
 * 리더: Peter Thiel (PayPal/Palantir)
 * 원칙: "독점 가능성" (Monopoly Question)
 */

import type { Strategy, StrategizeResult, AnalyzeResult, SixW } from '../workflow';

// ============================================================================
// Peter Thiel의 4가지 질문
// ============================================================================

export interface ThielQuestions {
  technology: number;  // 10배 나은 기술? (0~1)
  timing: number;      // 적절한 타이밍? (0~1)
  monopoly: number;    // 작은 시장 독점 가능? (0~1)
  team: number;        // 실행할 팀? (0~1)
}

// ============================================================================
// 전략 템플릿 (교육서비스업)
// ============================================================================

export const STRATEGY_TEMPLATES: Record<string, Strategy[]> = {
  '휴면고객 재활성화': [
    {
      id: 'discount_coupon',
      name: '할인 쿠폰 캠페인',
      thielScore: 0.35,
      monopolyPotential: 0.2,
      recommendation: 'AVOID',
    },
    {
      id: 'personalized_consultation',
      name: '개인화 1:1 상담',
      thielScore: 0.65,
      monopolyPotential: 0.7,
      recommendation: 'PURSUE',
    },
    {
      id: 'ai_growth_report',
      name: 'AI 성장 리포트',
      thielScore: 0.85,
      monopolyPotential: 0.9,
      recommendation: 'STRONG_PURSUE',
    },
  ],
  '재등록률 향상': [
    {
      id: 'early_bird_discount',
      name: '조기 재등록 할인',
      thielScore: 0.40,
      monopolyPotential: 0.3,
      recommendation: 'CONSIDER',
    },
    {
      id: 'level_certification',
      name: '레벨 인증 시스템',
      thielScore: 0.75,
      monopolyPotential: 0.8,
      recommendation: 'STRONG_PURSUE',
    },
    {
      id: 'parent_engagement',
      name: '학부모 참여 프로그램',
      thielScore: 0.60,
      monopolyPotential: 0.6,
      recommendation: 'PURSUE',
    },
  ],
  '신규 회원 확보': [
    {
      id: 'trial_marketing',
      name: '체험 마케팅 강화',
      thielScore: 0.45,
      monopolyPotential: 0.4,
      recommendation: 'CONSIDER',
    },
    {
      id: 'referral_program',
      name: '친구 추천 프로그램',
      thielScore: 0.55,
      monopolyPotential: 0.5,
      recommendation: 'PURSUE',
    },
    {
      id: 'school_partnership',
      name: '학교 협력 프로그램',
      thielScore: 0.80,
      monopolyPotential: 0.85,
      recommendation: 'STRONG_PURSUE',
    },
  ],
};

// ============================================================================
// STRATEGIZE Phase Engine
// ============================================================================

export const strategizePhase = {
  /**
   * Thiel 4가지 질문 평가
   */
  evaluateThielQuestions: (strategy: string): ThielQuestions => {
    const scores: Record<string, ThielQuestions> = {
      discount: { technology: 0.2, timing: 0.8, monopoly: 0.1, team: 0.9 },
      consultation: { technology: 0.5, timing: 0.7, monopoly: 0.6, team: 0.8 },
      ai_report: { technology: 0.9, timing: 0.9, monopoly: 0.9, team: 0.6 },
      certification: { technology: 0.7, timing: 0.8, monopoly: 0.8, team: 0.7 },
      referral: { technology: 0.4, timing: 0.7, monopoly: 0.5, team: 0.8 },
      partnership: { technology: 0.6, timing: 0.7, monopoly: 0.85, team: 0.6 },
    };

    // 전략 이름에서 키워드 추출
    for (const [key, value] of Object.entries(scores)) {
      if (strategy.toLowerCase().includes(key)) {
        return value;
      }
    }

    // 기본값
    return { technology: 0.5, timing: 0.5, monopoly: 0.5, team: 0.5 };
  },

  /**
   * Thiel 점수 계산
   */
  calculateThielScore: (questions: ThielQuestions): number => {
    const { technology, timing, monopoly, team } = questions;
    return (technology + timing + monopoly + team) / 4;
  },

  /**
   * 전략 옵션 생성
   */
  generateStrategies: (
    analyzeResult: AnalyzeResult,
    sixW: SixW
  ): { strategies: Strategy[]; selected: Strategy } => {
    // 미션 유형에 맞는 템플릿 찾기
    let strategies: Strategy[] = [];
    
    for (const [missionType, templates] of Object.entries(STRATEGY_TEMPLATES)) {
      if (analyzeResult.phenomenon.includes(missionType.replace('률 향상', '').replace(' 확보', ''))) {
        strategies = templates.map(t => ({
          ...t,
          thielScore: strategizePhase.calculateThielScore(
            strategizePhase.evaluateThielQuestions(t.name)
          ),
        }));
        break;
      }
    }

    // 기본 전략 (템플릿이 없는 경우)
    if (strategies.length === 0) {
      strategies = [
        {
          id: 'default_optimize',
          name: '현재 프로세스 최적화',
          thielScore: 0.5,
          monopolyPotential: 0.4,
          recommendation: 'CONSIDER',
        },
        {
          id: 'default_innovate',
          name: '신규 솔루션 도입',
          thielScore: 0.7,
          monopolyPotential: 0.7,
          recommendation: 'PURSUE',
        },
      ];
    }

    // 최고 점수 전략 선택
    const sorted = [...strategies].sort(
      (a, b) => b.monopolyPotential - a.monopolyPotential
    );
    const selected = sorted[0];

    return { strategies, selected };
  },

  /**
   * 추천 등급 결정
   */
  getRecommendation: (
    monopolyPotential: number
  ): 'STRONG_PURSUE' | 'PURSUE' | 'CONSIDER' | 'AVOID' => {
    if (monopolyPotential >= 0.8) return 'STRONG_PURSUE';
    if (monopolyPotential >= 0.6) return 'PURSUE';
    if (monopolyPotential >= 0.4) return 'CONSIDER';
    return 'AVOID';
  },

  /**
   * 전체 실행
   */
  execute: (
    analyzeResult: AnalyzeResult,
    sixW: SixW
  ): StrategizeResult => {
    const { strategies, selected } = strategizePhase.generateStrategies(analyzeResult, sixW);
    const thielQuestions = strategizePhase.evaluateThielQuestions(selected.name);

    return {
      phase: 'STRATEGIZE',
      status: 'COMPLETE',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      strategies,
      selected,
      thielQuestions,
      nextPhase: 'DESIGN',
    };
  },
};

export default strategizePhase;
