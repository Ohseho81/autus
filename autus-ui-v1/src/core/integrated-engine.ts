/**
 * AUTUS 5단계 솔루션 루프 ↔ 9단계 워크플로우 통합 엔진
 * 
 * 5단계 루프 (AUTUS 내부):     9단계 워크플로우 (사용자 인터페이스):
 * 1. DISCOVER               → 1. SENSE + 2. ANALYZE
 * 2. ANALYZE                → 3. STRATEGIZE + 4. DESIGN
 * 3. REDESIGN               → 5. BUILD + 6. LAUNCH
 * 4. OPTIMIZE               → 7. MEASURE + 8. LEARN
 * 5. ELIMINATE              → 9. SCALE
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Mission,
  MissionStatus,
  SixW,
  PhaseResult,
  SenseResult,
  AnalyzeResult,
  StrategizeResult,
  DesignResult,
  BuildResult,
  LaunchResult,
  MeasureResult,
  LearnResult,
  ScaleResult,
  TSEL,
} from './workflow';
import { calculateTotalScore, shouldEliminate, shouldScaleUp } from './workflow';

import { sensePhase, type EnvironmentFactors } from './phases/sense';
import { analyzePhase } from './phases/analyze';
import { strategizePhase } from './phases/strategize';
import { designPhase } from './phases/design';
import { buildPhase } from './phases/build';
import { launchPhase } from './phases/launch';
import { measurePhase } from './phases/measure';
import { learnPhase } from './phases/learn';
import { scalePhase } from './phases/scale';

// ============================================================================
// K·I·Ω 지수 정의
// ============================================================================

export interface Indices {
  K: number;     // 가치 지수 (0~1)
  I: number;     // 상호작용 지수 (-1~1)
  Omega: number; // 효율 지수 (0~1)
}

// ============================================================================
// 통합 워크플로우 결과
// ============================================================================

export interface DiscoverResult {
  phase: 'DISCOVER';
  workflowPhases: ['SENSE', 'ANALYZE'];
  senseResult: SenseResult;
  analyzeResult: AnalyzeResult;
  indices: { K: number; I: number };
  recommendation: 'PROCEED' | 'ANALYZE_MORE' | 'ELIMINATE';
}

export interface AnalyzeLoopResult {
  phase: 'ANALYZE';
  workflowPhases: ['STRATEGIZE', 'DESIGN'];
  strategizeResult: StrategizeResult;
  designResult: DesignResult;
  indices: Indices;
  totalScore: number;
  verdict: 'PROCEED' | 'REDESIGN' | 'ELIMINATE';
}

export interface RedesignResult {
  phase: 'REDESIGN';
  workflowPhases: ['BUILD', 'LAUNCH'];
  buildResult: BuildResult;
  launchResult: LaunchResult;
  automationScore: number;
  buildAction: string;
  estimatedTimeSaving: string;
}

export interface OptimizeResult {
  phase: 'OPTIMIZE';
  workflowPhases: ['MEASURE', 'LEARN'];
  measureResult: MeasureResult;
  learnResult: LearnResult;
  indices: { K: number; Omega: number };
  patterns: LearnResult['patterns'];
  improvements: LearnResult['howToImprove'];
}

export interface EliminateResult {
  phase: 'ELIMINATE';
  workflowPhases: ['SCALE'];
  scaleResult: ScaleResult;
  scaleAction: 'SCALE_UP' | 'MAINTAIN' | 'ELIMINATE';
  finalIndices: Indices;
  shouldRestartLoop: boolean;
  nextCycleRecommendation?: string;
}

// ============================================================================
// 통합 엔진
// ============================================================================

export const IntegratedWorkflowEngine = {
  /**
   * K 지수 초기화 (카테고리별 템플릿)
   */
  initializeK: (category: string): number => {
    const categoryTemplates: Record<string, number> = {
      '교육서비스업': 0.6,
      '피트니스': 0.55,
      'F&B': 0.5,
      '리테일': 0.45,
    };
    return categoryTemplates[category] || 0.5;
  },

  /**
   * I 지수 계산 (긍정/부정 신호 비율)
   */
  calculateI: (signals: SenseResult['signals']): number => {
    if (signals.length === 0) return 0;
    const positive = signals.filter(s => s.type === 'OPPORTUNITY').length;
    const negative = signals.filter(s => s.type === 'THREAT').length;
    return (positive - negative) / signals.length;
  },

  /**
   * Omega 지수 계산 (효율 = 산출/투입)
   */
  calculateOmega: (estimatedTime: number, expectedOutput: number): number => {
    if (estimatedTime === 0) return 0;
    return Math.min(expectedOutput / estimatedTime, 1);
  },

  /**
   * 자동화 점수 계산
   */
  calculateAutomationScore: (designResult: DesignResult): number => {
    const factors = {
      dataAvailable: designResult.requirements.technical.length > 0 ? 20 : 0,
      patternRecognized: 25,
      lowComplexity: designResult.requirements.process.length < 5 ? 20 : 0,
      highRepetition: 25,
      toolExists: 10,
    };
    return Object.values(factors).reduce((a, b) => a + b, 0);
  },

  /**
   * 피드백 기반 K·Ω 조정
   */
  processFeedback: (actualMetrics: {
    completionRatio?: number;
    qualityScore?: number;
    feedbackScore?: number;
  }): { kAdjustment: number; omegaAdjustment: number } => {
    let kAdjustment = 0;
    let omegaAdjustment = 0;

    if (actualMetrics.completionRatio && actualMetrics.completionRatio > 1.2) {
      omegaAdjustment += 0.03;
    }
    if (actualMetrics.qualityScore && actualMetrics.qualityScore >= 0.9) {
      kAdjustment += 0.04;
    }
    if (actualMetrics.feedbackScore && actualMetrics.feedbackScore >= 4) {
      kAdjustment += 0.02;
      omegaAdjustment += 0.02;
    }

    return { kAdjustment, omegaAdjustment };
  },

  // ==========================================================================
  // 5단계 루프 메서드
  // ==========================================================================

  /**
   * 1단계: DISCOVER (9단계: SENSE + ANALYZE)
   */
  discover: async (
    missionInput: { name: string; description: string; category: string },
    brandConfig: { factors: EnvironmentFactors }
  ): Promise<DiscoverResult> => {
    // SENSE (1/9)
    const senseResult = sensePhase.execute(brandConfig, missionInput);

    // ANALYZE (2/9)
    const analyzeResult = analyzePhase.execute(senseResult, missionInput);

    // K 지수 초기화
    const K = IntegratedWorkflowEngine.initializeK(missionInput.category);

    // I 지수 계산
    const I = IntegratedWorkflowEngine.calculateI(senseResult.signals);

    // 진행 여부 결정
    let recommendation: 'PROCEED' | 'ANALYZE_MORE' | 'ELIMINATE';
    if (K >= 0.7) {
      recommendation = 'PROCEED';
    } else if (K <= 0.3) {
      recommendation = 'ELIMINATE';
    } else {
      recommendation = 'ANALYZE_MORE';
    }

    return {
      phase: 'DISCOVER',
      workflowPhases: ['SENSE', 'ANALYZE'],
      senseResult,
      analyzeResult,
      indices: { K, I },
      recommendation,
    };
  },

  /**
   * 2단계: ANALYZE (9단계: STRATEGIZE + DESIGN)
   */
  analyze: async (
    discoverResult: DiscoverResult,
    sixW: SixW
  ): Promise<AnalyzeLoopResult> => {
    const { K, I } = discoverResult.indices;

    // STRATEGIZE (3/9)
    const strategizeResult = strategizePhase.execute(discoverResult.analyzeResult, sixW);

    // DESIGN (4/9)
    const designResult = designPhase.execute(strategizeResult);

    // Omega 지수 계산
    const estimatedTime = 10; // 예상 소요 시간 (시간)
    const expectedOutput = 100; // 예상 산출 (%)
    const Omega = IntegratedWorkflowEngine.calculateOmega(estimatedTime, expectedOutput);

    // 종합 점수
    const totalScore = calculateTotalScore(K, I, Omega);

    // 판정
    let verdict: 'PROCEED' | 'REDESIGN' | 'ELIMINATE';
    if (totalScore >= 0.6) {
      verdict = 'PROCEED';
    } else if (totalScore <= 0.3) {
      verdict = 'ELIMINATE';
    } else {
      verdict = 'REDESIGN';
    }

    return {
      phase: 'ANALYZE',
      workflowPhases: ['STRATEGIZE', 'DESIGN'],
      strategizeResult,
      designResult,
      indices: { K, I, Omega },
      totalScore,
      verdict,
    };
  },

  /**
   * 3단계: REDESIGN (9단계: BUILD + LAUNCH)
   */
  redesign: async (
    analyzeResult: AnalyzeLoopResult,
    missionName: string
  ): Promise<RedesignResult> => {
    // 자동화 점수
    const automationScore = IntegratedWorkflowEngine.calculateAutomationScore(
      analyzeResult.designResult
    );

    // BUILD (5/9)
    const buildResult = buildPhase.execute(analyzeResult.designResult, missionName);

    // LAUNCH (6/9)
    const launchResult = launchPhase.execute(buildResult);

    return {
      phase: 'REDESIGN',
      workflowPhases: ['BUILD', 'LAUNCH'],
      buildResult,
      launchResult,
      automationScore,
      buildAction: buildResult.buildAction,
      estimatedTimeSaving: buildResult.estimatedTimeSaving,
    };
  },

  /**
   * 4단계: OPTIMIZE (9단계: MEASURE + LEARN)
   */
  optimize: async (
    redesignResult: RedesignResult,
    missionName: string,
    actualData: Record<string, number>,
    tselBefore: TSEL,
    tselAfter: TSEL,
    evidence: { startDate: string; endDate: string; items: string[] },
    previousIndices: { K: number; Omega: number }
  ): Promise<OptimizeResult> => {
    // MEASURE (7/9)
    const measureResult = measurePhase.execute(
      redesignResult.launchResult,
      missionName,
      actualData,
      tselBefore,
      tselAfter,
      evidence
    );

    // K·Ω 재계산
    const feedback = IntegratedWorkflowEngine.processFeedback({
      completionRatio: parseFloat(measureResult.proofPack.summary.avgOKRProgress) / 100,
      qualityScore: tselAfter.R,
      feedbackScore: tselAfter.S * 5,
    });

    const newK = Math.min(1, previousIndices.K + feedback.kAdjustment);
    const newOmega = Math.min(1, previousIndices.Omega + feedback.omegaAdjustment);

    // LEARN (8/9)
    const learnResult = learnPhase.execute(measureResult);

    return {
      phase: 'OPTIMIZE',
      workflowPhases: ['MEASURE', 'LEARN'],
      measureResult,
      learnResult,
      indices: { K: newK, Omega: newOmega },
      patterns: learnResult.patterns,
      improvements: learnResult.howToImprove,
    };
  },

  /**
   * 5단계: ELIMINATE (9단계: SCALE)
   */
  eliminate: async (
    optimizeResult: OptimizeResult,
    missionName: string,
    I: number,
    stagnantDays: number = 0
  ): Promise<EliminateResult> => {
    const { K, Omega } = optimizeResult.indices;

    // SCALE (9/9)
    const scaleResult = scalePhase.execute(
      optimizeResult.learnResult,
      missionName,
      { K, I, Omega },
      stagnantDays
    );

    return {
      phase: 'ELIMINATE',
      workflowPhases: ['SCALE'],
      scaleResult,
      scaleAction: scaleResult.scaleAction,
      finalIndices: { K, I, Omega },
      shouldRestartLoop: scaleResult.scaleAction === 'MAINTAIN',
      nextCycleRecommendation: scaleResult.nextCycleRecommendation,
    };
  },

  // ==========================================================================
  // 전체 워크플로우 실행
  // ==========================================================================

  /**
   * 미션 생성
   */
  createMission: (
    name: string,
    description: string,
    category: string,
    sixW: SixW
  ): Mission => {
    return {
      id: uuidv4(),
      name,
      description,
      category,
      sixW,
      currentPhase: 'SENSE',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      indices: { K: 0, I: 0, Omega: 0 },
      phaseResults: {},
    };
  },

  /**
   * 전체 워크플로우 실행 (DISCOVER → ANALYZE → REDESIGN까지)
   */
  runFullWorkflow: async (
    missionInput: { name: string; description: string; category: string },
    brandConfig: { factors: EnvironmentFactors },
    sixW: SixW
  ): Promise<{
    status: 'LAUNCHED' | 'ELIMINATED_EARLY' | 'ELIMINATED';
    reason?: string;
    results?: {
      discover: DiscoverResult;
      analyze: AnalyzeLoopResult;
      redesign: RedesignResult;
    };
    nextAction?: string;
  }> => {
    console.log('🚀 Starting Integrated Workflow...');

    // 1. DISCOVER
    const discoverResult = await IntegratedWorkflowEngine.discover(missionInput, brandConfig);
    if (discoverResult.recommendation === 'ELIMINATE') {
      return { status: 'ELIMINATED_EARLY', reason: 'K too low at discovery' };
    }

    // 2. ANALYZE
    const analyzeLoopResult = await IntegratedWorkflowEngine.analyze(discoverResult, sixW);
    if (analyzeLoopResult.verdict === 'ELIMINATE') {
      return { status: 'ELIMINATED', reason: 'Total score too low' };
    }

    // 3. REDESIGN
    const redesignResult = await IntegratedWorkflowEngine.redesign(
      analyzeLoopResult,
      missionInput.name
    );

    return {
      status: 'LAUNCHED',
      results: {
        discover: discoverResult,
        analyze: analyzeLoopResult,
        redesign: redesignResult,
      },
      nextAction: 'AWAIT_EXECUTION_AND_MEASURE',
    };
  },
};

export default IntegratedWorkflowEngine;
