/**
 * PHASE 4: DESIGN (설계)
 * 리더: Jeff Bezos (Amazon)
 * 원칙: "Working Backwards" (역순 사고)
 */

import type { DesignResult, PressRelease, FAQ, StrategizeResult } from '../workflow';

// ============================================================================
// DESIGN Phase Engine
// ============================================================================

export const designPhase = {
  /**
   * Press Release 작성 (미래 보도자료)
   */
  writePressRelease: (strategy: { name: string; id: string }): PressRelease => {
    const templates: Record<string, PressRelease> = {
      ai_growth_report: {
        headline: '올댓바스켓, "AI 성장 리포트" 도입으로 고객 복귀율 2배 달성',
        subheadline: '업계 최초 AI 기반 개인화 성장 분석 서비스',
        date: 'YYYY-MM-DD',
        body: `올댓바스켓이 AI 성장 리포트 서비스를 도입하여 휴면 고객 복귀율을 기존 15%에서 30%로 2배 향상시켰습니다.

이 서비스는 각 회원의 출석 패턴, 실력 변화, 참여도를 AI가 분석하여 개인화된 성장 리포트를 제공합니다.

"아이의 성장을 객관적으로 확인할 수 있어서 좋아요" - 학부모 김OO

지금 바로 자녀의 성장 리포트를 확인하세요.`,
        callToAction: '무료 성장 리포트 받기',
      },
      level_certification: {
        headline: '올댓바스켓, 국내 최초 "농구 레벨 인증" 시스템 도입',
        subheadline: '객관적 실력 평가로 재등록률 80% 달성',
        date: 'YYYY-MM-DD',
        body: `올댓바스켓이 자체 개발한 농구 레벨 인증 시스템을 통해 재등록률을 60%에서 80%로 향상시켰습니다.

이 시스템은 드리블, 슈팅, 패스, 게임 이해도 등 12개 항목을 체계적으로 평가합니다.

"레벨이 올라갈 때마다 아이가 성취감을 느껴요" - 학부모 이OO`,
        callToAction: '레벨 테스트 신청하기',
      },
      school_partnership: {
        headline: '올댓바스켓, 지역 초등학교 10곳과 방과후 협력 체결',
        subheadline: '학교 내 농구 교실로 신규 회원 200% 증가',
        date: 'YYYY-MM-DD',
        body: `올댓바스켓이 지역 초등학교와 방과후 프로그램 협력을 통해 신규 가입이 3배 증가했습니다.

학교에서 먼저 체험한 후 정규반으로 전환하는 학생이 급증하고 있습니다.`,
        callToAction: '학교 협력 프로그램 문의',
      },
    };

    return templates[strategy.id] || {
      headline: `올댓바스켓, "${strategy.name}" 도입으로 목표 달성`,
      subheadline: '혁신적인 서비스로 고객 만족도 향상',
      date: 'YYYY-MM-DD',
      body: `올댓바스켓이 ${strategy.name}을(를) 도입하여 핵심 목표를 달성했습니다.

이 서비스는 [핵심 가치]를 제공하며, [차별화 포인트]로 경쟁사와 구별됩니다.

고객 반응: "[고객 인용문]"`,
      callToAction: '자세히 알아보기',
    };
  },

  /**
   * FAQ 작성
   */
  writeFAQ: (strategy: { name: string; id: string }): FAQ[] => {
    const commonFAQ: FAQ[] = [
      { q: '이 서비스는 무엇인가요?', a: `${strategy.name}은(는) 고객 경험을 향상시키는 새로운 서비스입니다.` },
      { q: '기존 서비스와 뭐가 다른가요?', a: '데이터 기반의 개인화된 경험을 제공합니다.' },
      { q: '얼마나 걸리나요?', a: '서비스 도입 후 2주 내에 효과를 체감할 수 있습니다.' },
      { q: '비용은 얼마인가요?', a: '기존 수강료에 포함되어 추가 비용이 없습니다.' },
      { q: '어떻게 시작하나요?', a: '앱에서 바로 신청하거나 상담을 통해 안내받으실 수 있습니다.' },
    ];

    const specificFAQ: Record<string, FAQ[]> = {
      ai_growth_report: [
        { q: 'AI가 어떻게 분석하나요?', a: '출석, 실력 평가, 참여도 데이터를 종합 분석합니다.' },
        { q: '리포트는 얼마나 자주 받나요?', a: '매월 1회 자동으로 발송됩니다.' },
        { q: '개인정보는 안전한가요?', a: '데이터는 암호화되어 저장되며 분석 목적으로만 사용됩니다.' },
      ],
      level_certification: [
        { q: '레벨은 몇 단계인가요?', a: '초급-중급-고급-마스터 4단계로 구성됩니다.' },
        { q: '테스트는 어떻게 진행되나요?', a: '코치가 12개 항목을 직접 평가합니다.' },
        { q: '인증서가 발급되나요?', a: '네, 레벨 통과 시 공식 인증서가 발급됩니다.' },
      ],
    };

    return [...commonFAQ, ...(specificFAQ[strategy.id] || [])];
  },

  /**
   * 요구사항 도출 (PR/FAQ에서 역추론)
   */
  deriveRequirements: (pr: PressRelease, faq: FAQ[]): {
    technical: string[];
    content: string[];
    process: string[];
    team: string[];
  } => {
    return {
      technical: [
        '데이터 분석 대시보드',
        '자동 알림 발송 시스템',
        '고객 세그먼트 관리',
        'API 연동',
      ],
      content: [
        '캠페인 메시지 템플릿',
        '안내 문서',
        '학부모용 가이드',
        '코치용 매뉴얼',
      ],
      process: [
        '타겟 선정 기준',
        '발송 일정',
        '피드백 수집 프로세스',
        '성과 측정 방법',
      ],
      team: [
        '마케팅 담당 (CMO)',
        'CS 담당',
        '개발 담당',
        '코칭 담당',
      ],
    };
  },

  /**
   * Working Backwards 실행
   */
  workingBackwards: (selectedStrategy: { name: string; id: string }): {
    pressRelease: PressRelease;
    faq: FAQ[];
    requirements: {
      technical: string[];
      content: string[];
      process: string[];
      team: string[];
    };
  } => {
    const pressRelease = designPhase.writePressRelease(selectedStrategy);
    const faq = designPhase.writeFAQ(selectedStrategy);
    const requirements = designPhase.deriveRequirements(pressRelease, faq);

    return { pressRelease, faq, requirements };
  },

  /**
   * 전체 실행
   */
  execute: (strategizeResult: StrategizeResult): DesignResult => {
    const { pressRelease, faq, requirements } = designPhase.workingBackwards(
      strategizeResult.selected
    );

    return {
      phase: 'DESIGN',
      status: 'COMPLETE',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      pressRelease,
      faq,
      requirements,
      nextPhase: 'BUILD',
    };
  },
};

export default designPhase;
