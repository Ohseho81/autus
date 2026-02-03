/**
 * PHASE 6: LAUNCH (출시)
 * 리더: Reid Hoffman (LinkedIn)
 * 원칙: "MVP Rule" (창피하지 않으면 너무 늦은 것)
 */

import type { LaunchResult, LaunchPhase, BuildResult } from '../workflow';

// ============================================================================
// 출시 체크리스트
// ============================================================================

export interface LaunchChecklistItem {
  item: string;
  required: boolean;
  completed: boolean;
}

export const LAUNCH_CHECKLIST: LaunchChecklistItem[] = [
  { item: '타겟 리스트 확정', required: true, completed: false },
  { item: '메시지 콘텐츠 승인', required: true, completed: false },
  { item: '발송 시스템 테스트', required: true, completed: false },
  { item: '모니터링 대시보드 준비', required: true, completed: false },
  { item: '롤백 계획 수립', required: true, completed: false },
  { item: '담당자 연락망 확보', required: true, completed: false },
];

// ============================================================================
// LAUNCH Phase Engine
// ============================================================================

export const launchPhase = {
  /**
   * MVP 정의
   * "완벽한 제품"이 아닌 "학습 가능한 최소 제품"
   */
  defineMVP: (fullFeatures: string[]): {
    mustHave: string[];
    niceToHave: string[];
    future: string[];
  } => {
    // 우선순위 기반 분류
    // 실제로는 비즈니스 로직에 따라 분류
    const prioritized = fullFeatures.map((f, idx) => ({
      feature: f,
      priority: idx < Math.ceil(fullFeatures.length * 0.3) ? 'P0' :
                idx < Math.ceil(fullFeatures.length * 0.6) ? 'P1' : 'P2',
    }));

    return {
      mustHave: prioritized.filter(p => p.priority === 'P0').map(p => p.feature),
      niceToHave: prioritized.filter(p => p.priority === 'P1').map(p => p.feature),
      future: prioritized.filter(p => p.priority === 'P2').map(p => p.feature),
    };
  },

  /**
   * 단계적 출시 계획
   */
  createLaunchPhases: (): LaunchPhase[] => {
    return [
      {
        name: 'Alpha',
        audience: '내부 테스트 (팀원 10명)',
        duration: '3일',
        goal: '기본 기능 검증',
      },
      {
        name: 'Beta',
        audience: '파일럿 고객 (50명)',
        duration: '1주',
        goal: '실제 사용성 검증',
      },
      {
        name: 'GA (General Availability)',
        audience: '전체 타겟',
        duration: '지속',
        goal: '성과 측정',
      },
    ];
  },

  /**
   * 롤백 계획 수립
   */
  createRollbackPlan: (): { trigger: string; action: string } => {
    return {
      trigger: '심각한 오류 또는 부정 피드백 30%+',
      action: '이전 버전으로 롤백 + 원인 분석 + 재출시',
    };
  },

  /**
   * 체크리스트 검증
   */
  validateChecklist: (checklist: LaunchChecklistItem[]): boolean => {
    return checklist
      .filter(item => item.required)
      .every(item => item.completed);
  },

  /**
   * MVP 출시
   */
  mvpLaunch: (buildResult: BuildResult): {
    mvpFeatures: string[];
    launchPhases: LaunchPhase[];
    rollbackPlan: { trigger: string; action: string };
    checklistCompleted: boolean;
  } => {
    // Build 결과에서 MVP 기능 추출
    const allFeatures = buildResult.tasks.map(t => t.task);
    const { mustHave } = launchPhase.defineMVP(allFeatures);

    const launchPhases = launchPhase.createLaunchPhases();
    const rollbackPlan = launchPhase.createRollbackPlan();

    // 체크리스트 자동 완료 (실제로는 수동 체크 필요)
    const checklist = LAUNCH_CHECKLIST.map(item => ({
      ...item,
      completed: true, // 시뮬레이션에서는 자동 완료
    }));

    return {
      mvpFeatures: mustHave,
      launchPhases,
      rollbackPlan,
      checklistCompleted: launchPhase.validateChecklist(checklist),
    };
  },

  /**
   * 전체 실행
   */
  execute: (buildResult: BuildResult): LaunchResult => {
    const {
      mvpFeatures,
      launchPhases,
      rollbackPlan,
      checklistCompleted,
    } = launchPhase.mvpLaunch(buildResult);

    return {
      phase: 'LAUNCH',
      status: 'COMPLETE',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      mvpFeatures,
      launchPhases,
      rollbackPlan,
      checklistCompleted,
      nextPhase: 'MEASURE',
    };
  },
};

export default launchPhase;
