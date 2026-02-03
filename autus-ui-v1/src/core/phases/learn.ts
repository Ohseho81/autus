/**
 * PHASE 8: LEARN (학습)
 * 리더: Ray Dalio (Bridgewater)
 * 원칙: "Blameless Post-Mortem" (비난 없는 회고)
 */

import type { LearnResult, MeasureResult, Pattern } from '../workflow';

// ============================================================================
// Helper Functions
// ============================================================================

function suggestImprovementHelper(kr: string, insight: string): string {
  const suggestions: Record<string, string> = {
    '복귀율': '개인화 메시지 강화 + 복귀 시점 최적화',
    '재이탈률': '복귀 후 3일 내 추가 케어 + 만족도 조사',
    '휴면발생률': '위험 신호 조기 감지 + 선제적 개입',
    '재등록률': '만료 30일 전 조기 상담 + 혜택 강화',
    '전환율': '체험 프로그램 품질 향상 + 즉시 등록 혜택',
  };

  for (const [key, value] of Object.entries(suggestions)) {
    if (insight.includes(key)) {
      return value;
    }
  }

  return '데이터 기반 분석 후 맞춤 개선안 도출';
}

// ============================================================================
// Type Definitions
// ============================================================================

interface ExtractFactsReturn {
  objective: string;
  targetOKR: string[];
  actualOKR: string[];
  timeline: { start: string; end: string };
}

interface RootCauseAnalysis {
  kr: string;
  gap: string;
  possibleCauses: string[];
  rootCause: string;
}

interface Improvement {
  area: string;
  current: string;
  proposed: string;
  expectedImpact: string;
}

interface PatternsResult {
  successPatterns: Pattern[];
  failurePatterns: Pattern[];
  shadowRuleCandidates: string[];
}

// ============================================================================
// LEARN Phase Engine
// ============================================================================

function extractFacts(measureResult: MeasureResult): ExtractFactsReturn {
  return {
    objective: measureResult.proofPack.mission,
    targetOKR: measureResult.okrProgress.map(
      kr => `${kr.metric}: ${kr.target}${kr.unit}`
    ),
    actualOKR: measureResult.okrProgress.map(
      kr => `${kr.metric}: ${kr.actual}${kr.unit} (${kr.progress}%)`
    ),
    timeline: measureResult.proofPack.period,
  };
}

function analyzeRootCause(measureResult: MeasureResult): RootCauseAnalysis[] {
  const underperformed = measureResult.okrProgress.filter(
    kr => parseFloat(kr.progress || '0') < 100
  );

  return underperformed.map(kr => ({
    kr: kr.id,
    gap: `${kr.target} - ${kr.actual} = ${kr.target - (kr.actual || kr.baseline)}${kr.unit}`,
    possibleCauses: [
      '타겟 선정 기준 부적절',
      '메시지 타이밍 미스',
      '혜택 매력도 부족',
      '경쟁사 대응',
      '외부 환경 변화',
    ],
    rootCause: '추가 분석 필요',
  }));
}

function generateImprovements(measureResult: MeasureResult): Improvement[] {
  const improvements: Improvement[] = [];

  measureResult.proofPack.learningPoints.forEach(point => {
    if (point.type === 'IMPROVE') {
      improvements.push({
        area: point.kr,
        current: point.insight,
        proposed: suggestImprovementHelper(point.kr, point.insight),
        expectedImpact: '+5~10%',
      });
    }
  });

  return improvements;
}

function identifyPatterns(measureResult: MeasureResult): PatternsResult {
  const successPatterns: Pattern[] = [];
  const failurePatterns: Pattern[] = [];
  const shadowRuleCandidates: string[] = [];

  // 성공 패턴 추출
  const successes = measureResult.okrProgress.filter(
    kr => parseFloat(kr.progress || '0') >= 100
  );
  successes.forEach(kr => {
    successPatterns.push({
      condition: `${kr.metric} 관련 액션 실행`,
      result: `목표 달성 (${kr.progress}%)`,
      confidence: parseFloat(kr.progress || '0') / 100,
    });
  });

  // 실패 패턴 추출
  const failures = measureResult.okrProgress.filter(
    kr => parseFloat(kr.progress || '0') < 70
  );
  failures.forEach(kr => {
    failurePatterns.push({
      condition: `${kr.metric} 기존 방식 유지`,
      result: `목표 미달 (${kr.progress}%)`,
      avoidAction: `${kr.metric} 전략 재검토 필요`,
    });

    // Shadow Rule 후보
    shadowRuleCandidates.push(
      `IF ${kr.metric} < ${kr.target * 0.7}${kr.unit} THEN 자동 에스컬레이션`
    );
  });

  return { successPatterns, failurePatterns, shadowRuleCandidates };
}

function postMortem(measureResult: MeasureResult) {
  return {
    whatHappened: extractFacts(measureResult),
    whyItHappened: analyzeRootCause(measureResult),
    howToImprove: generateImprovements(measureResult),
    patterns: identifyPatterns(measureResult),
    principle: '모든 결과는 학습 기회. 비난 X, 분석 O',
  };
}

function execute(measureResult: MeasureResult): LearnResult {
  const result = postMortem(measureResult);

  return {
    phase: 'LEARN',
    status: 'COMPLETE',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    whatHappened: result.whatHappened,
    whyItHappened: result.whyItHappened,
    howToImprove: result.howToImprove,
    patterns: result.patterns,
    nextPhase: 'SCALE',
  };
}

export const learnPhase = {
  extractFacts,
  analyzeRootCause,
  generateImprovements,
  suggestImprovement: suggestImprovementHelper,
  identifyPatterns,
  postMortem,
  execute,
};

export default learnPhase;
