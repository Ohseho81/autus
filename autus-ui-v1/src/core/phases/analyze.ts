/**
 * PHASE 2: ANALYZE (분석)
 * 리더: Elon Musk (Tesla/SpaceX)
 * 원칙: "제1원리 사고" (First Principles Thinking)
 */

import type { AnalyzeResult, FirstPrinciple, SenseResult } from '../workflow';

// ============================================================================
// ANALYZE Phase Engine
// ============================================================================

export const analyzePhase = {
  /**
   * 제1원리로 분해
   * 현상 → 원인 → 근본 원인
   */
  decomposeToFirstPrinciples: (problem: {
    description: string;
    context?: Record<string, unknown>;
  }): {
    phenomenon: string;
    causes: FirstPrinciple[];
    rootCause: string;
    assumptions: string[];
    validatedAssumptions: string[];
  } => {
    const whys = analyzePhase.applyFiveWhys(problem.description);
    const rootCause = whys.length > 0 ? whys[whys.length - 1].answer : '추가 분석 필요';

    return {
      phenomenon: problem.description,
      causes: whys,
      rootCause,
      assumptions: analyzePhase.listAssumptions(problem.description),
      validatedAssumptions: [],
    };
  },

  /**
   * 5 Whys 기법 적용
   */
  applyFiveWhys: (problem: string): FirstPrinciple[] => {
    // 교육서비스업 기본 5 Whys 템플릿
    const templates: Record<string, FirstPrinciple[]> = {
      '휴면': [
        { level: 1, question: '왜 미방문?', answer: '시간이 안 맞아서' },
        { level: 2, question: '왜 시간이 안 맞아?', answer: '학업/학원 일정 충돌' },
        { level: 3, question: '왜 일정 충돌?', answer: '수업 시간대가 제한적' },
        { level: 4, question: '왜 시간대가 제한적?', answer: '코치 수 부족' },
        { level: 5, question: '왜 코치 부족?', answer: '채용/유지 어려움' },
      ],
      '이탈': [
        { level: 1, question: '왜 이탈?', answer: '만족도 저하' },
        { level: 2, question: '왜 만족도 저하?', answer: '기대와 실제 차이' },
        { level: 3, question: '왜 기대와 차이?', answer: '프로그램 품질 미흡' },
        { level: 4, question: '왜 품질 미흡?', answer: '개인화 부족' },
        { level: 5, question: '왜 개인화 부족?', answer: '데이터 기반 피드백 시스템 없음' },
      ],
      '재등록': [
        { level: 1, question: '왜 재등록 안함?', answer: '가격 대비 가치 의문' },
        { level: 2, question: '왜 가치 의문?', answer: '성장 체감 어려움' },
        { level: 3, question: '왜 성장 체감 어려움?', answer: '객관적 지표 부재' },
        { level: 4, question: '왜 지표 부재?', answer: '평가 시스템 미구축' },
        { level: 5, question: '왜 미구축?', answer: '표준화된 레벨 체계 없음' },
      ],
      '신규': [
        { level: 1, question: '왜 등록 안함?', answer: '체험 후 확신 부족' },
        { level: 2, question: '왜 확신 부족?', answer: '차별화 인식 부족' },
        { level: 3, question: '왜 차별화 인식 부족?', answer: '혜택 전달 미흡' },
        { level: 4, question: '왜 전달 미흡?', answer: '세일즈 포인트 정립 안됨' },
        { level: 5, question: '왜 정립 안됨?', answer: '고객 니즈 분석 부족' },
      ],
    };

    // 문제 유형에 맞는 템플릿 찾기
    for (const [key, whys] of Object.entries(templates)) {
      if (problem.includes(key)) {
        return whys;
      }
    }

    // 기본 템플릿
    return [
      { level: 1, question: `왜 ${problem}?`, answer: '원인 분석 필요' },
      { level: 2, question: '왜 이 원인이?', answer: '추가 분석 필요' },
      { level: 3, question: '왜 그럴까?', answer: '데이터 수집 필요' },
      { level: 4, question: '근본 원인은?', answer: '가설 검증 필요' },
      { level: 5, question: '최종 원인은?', answer: '심층 분석 필요' },
    ];
  },

  /**
   * 가정 목록화
   */
  listAssumptions: (problem: string): string[] => {
    const commonAssumptions = [
      '고객은 가격에 민감하다',
      '경쟁사보다 품질이 낮다',
      '마케팅이 부족하다',
      '위치가 불편하다',
      '시간대가 맞지 않는다',
    ];

    // 문제 유형별 추가 가정
    if (problem.includes('휴면')) {
      return [
        '회원이 바빠서 못 온다',
        '프로그램에 흥미를 잃었다',
        '다른 활동으로 대체했다',
        ...commonAssumptions,
      ];
    }

    if (problem.includes('재등록')) {
      return [
        '가격이 부담된다',
        '성과가 없다고 느낀다',
        '다른 학원을 알아보고 있다',
        ...commonAssumptions,
      ];
    }

    return commonAssumptions;
  },

  /**
   * 가정 검증 (실제로는 데이터 기반)
   */
  validateAssumptions: (
    assumptions: string[],
    data?: Record<string, unknown>
  ): string[] => {
    // 데이터가 있으면 검증, 없으면 빈 배열
    if (!data) return [];
    
    // 실제 구현에서는 데이터와 가정을 비교하여 검증
    return assumptions.filter((_, i) => i < 2); // 예시: 처음 2개만 검증됨
  },

  /**
   * 전체 실행
   */
  execute: (
    senseResult: SenseResult,
    missionInput: { name: string; description: string }
  ): AnalyzeResult => {
    const decomposition = analyzePhase.decomposeToFirstPrinciples({
      description: missionInput.description,
    });

    return {
      phase: 'ANALYZE',
      status: 'COMPLETE',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      phenomenon: decomposition.phenomenon,
      whys: decomposition.causes,
      rootCause: decomposition.rootCause,
      assumptions: decomposition.assumptions,
      validatedAssumptions: decomposition.validatedAssumptions,
      nextPhase: 'STRATEGIZE',
    };
  },
};

export default analyzePhase;
