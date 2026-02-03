/**
 * PHASE 5: BUILD (구축)
 * 리더: Jeff Bezos (Amazon)
 * 원칙: "Two-Pizza Team" (2피자 팀)
 */

import type { BuildResult, BuildTask, TeamMember, DesignResult } from '../workflow';

// ============================================================================
// 자동화 수준 결정
// ============================================================================

export type BuildAction = 'AUTOMATE' | 'COMPRESS' | 'DELEGATE' | 'KEEP';

export const BUILD_ACTION_SAVINGS: Record<BuildAction, string> = {
  AUTOMATE: '80-95%',
  COMPRESS: '40%',
  DELEGATE: '95%',
  KEEP: '0%',
};

// ============================================================================
// 조직 역할 정의
// ============================================================================

export const ORGANIZATION_ROLES: TeamMember[] = [
  {
    id: 'ceo',
    name: '오세호',
    role: '대표',
    task: '',
    priority: 0,
    color: '#F97316',
  },
  {
    id: 'coo',
    name: '김민수',
    role: 'COO',
    task: '',
    priority: 0,
    color: '#3B82F6',
  },
  {
    id: 'cmo',
    name: '이지현',
    role: 'CMO',
    task: '',
    priority: 0,
    color: '#EC4899',
  },
  {
    id: 'coach1',
    name: '박성준',
    role: '수석코치',
    task: '',
    priority: 0,
    color: '#10B981',
  },
  {
    id: 'coach2',
    name: '최영호',
    role: '코치',
    task: '',
    priority: 0,
    color: '#10B981',
  },
  {
    id: 'cs',
    name: '정수연',
    role: 'CS담당',
    task: '',
    priority: 0,
    color: '#06B6D4',
  },
  {
    id: 'dev',
    name: '한동훈',
    role: '개발',
    task: '',
    priority: 0,
    color: '#8B5CF6',
  },
];

// ============================================================================
// 미션별 역할 배정 규칙
// ============================================================================

export const ROLE_ASSIGNMENT_RULES: Record<string, Array<{ roleId: string; task: string; priority: number }>> = {
  '휴면고객 재활성화': [
    { roleId: 'cmo', task: '재활성화 캠페인 기획', priority: 1 },
    { roleId: 'cs', task: '타겟 고객 리스트 추출', priority: 2 },
    { roleId: 'dev', task: '자동 발송 시스템 설정', priority: 3 },
    { roleId: 'coach1', task: '복귀 혜택 프로그램 설계', priority: 4 },
  ],
  '재등록률 향상': [
    { roleId: 'cs', task: '만료 예정 회원 분석', priority: 1 },
    { roleId: 'cmo', task: '리텐션 혜택 설계', priority: 2 },
    { roleId: 'coach1', task: '맞춤 프로그램 제안', priority: 3 },
    { roleId: 'ceo', task: '할인 정책 최종 승인', priority: 4 },
  ],
  '신규 회원 확보': [
    { roleId: 'cmo', task: '체험 마케팅 캠페인', priority: 1 },
    { roleId: 'coach2', task: '체험 프로그램 운영', priority: 2 },
    { roleId: 'cs', task: '체험 → 정규 전환 상담', priority: 3 },
    { roleId: 'coo', task: '수용 인원 조정', priority: 4 },
  ],
};

// ============================================================================
// BUILD Phase Engine
// ============================================================================

export const buildPhase = {
  /**
   * 자동화 점수 계산
   */
  calculateAutomationScore: (designResult: DesignResult): number => {
    const factors = {
      dataAvailable: designResult.requirements.technical.length > 0 ? 20 : 0,
      patternRecognized: 25, // 기본 패턴 인식
      lowComplexity: designResult.requirements.process.length < 5 ? 20 : 0,
      highRepetition: 25, // 반복 작업 가정
      toolExists: designResult.requirements.technical.includes('API 연동') ? 10 : 5,
    };
    return Object.values(factors).reduce((a, b) => a + b, 0);
  },

  /**
   * 자동화 수준 결정
   */
  determineAutomation: (automationScore: number): BuildAction => {
    if (automationScore >= 80) return 'AUTOMATE';
    if (automationScore >= 60) return 'COMPRESS';
    if (automationScore >= 40) return 'DELEGATE';
    return 'KEEP';
  },

  /**
   * Two-Pizza Team 구성 (6-8명)
   */
  formTeam: (
    requirements: DesignResult['requirements'],
    missionName: string
  ): TeamMember[] => {
    const MAX_TEAM_SIZE = 8;
    const team: TeamMember[] = [];

    // 미션별 역할 배정 규칙 찾기
    const rules = ROLE_ASSIGNMENT_RULES[missionName] || [];

    if (rules.length > 0) {
      rules.forEach(rule => {
        const member = ORGANIZATION_ROLES.find(r => r.id === rule.roleId);
        if (member && team.length < MAX_TEAM_SIZE) {
          team.push({
            ...member,
            task: rule.task,
            priority: rule.priority,
          });
        }
      });
    } else {
      // 기본 팀 구성
      const defaultRoles = ['ceo', 'coo', 'cmo', 'cs'];
      defaultRoles.forEach((roleId, idx) => {
        const member = ORGANIZATION_ROLES.find(r => r.id === roleId);
        if (member) {
          team.push({
            ...member,
            task: `${requirements.team[idx] || '미션 참여'}`,
            priority: idx + 1,
          });
        }
      });
    }

    return team.sort((a, b) => a.priority - b.priority);
  },

  /**
   * 태스크 배정
   */
  assignTasks: (
    requirements: DesignResult['requirements'],
    team: TeamMember[]
  ): BuildTask[] => {
    const tasks: BuildTask[] = [];
    const today = new Date();

    // Technical tasks
    requirements.technical.forEach((task, idx) => {
      const dev = team.find(m => m.role === '개발');
      tasks.push({
        assignee: dev?.name || '미배정',
        task,
        deadline: new Date(today.getTime() + (idx + 1) * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'PENDING',
      });
    });

    // Content tasks
    requirements.content.forEach((task, idx) => {
      const cmo = team.find(m => m.role === 'CMO');
      tasks.push({
        assignee: cmo?.name || '미배정',
        task,
        deadline: new Date(today.getTime() + (idx + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'PENDING',
      });
    });

    // Process tasks
    requirements.process.forEach((task, idx) => {
      const coo = team.find(m => m.role === 'COO');
      tasks.push({
        assignee: coo?.name || '미배정',
        task,
        deadline: new Date(today.getTime() + (idx + 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'PENDING',
      });
    });

    return tasks;
  },

  /**
   * 전체 실행
   */
  execute: (designResult: DesignResult, missionName: string): BuildResult => {
    const automationScore = buildPhase.calculateAutomationScore(designResult);
    const buildAction = buildPhase.determineAutomation(automationScore);
    const team = buildPhase.formTeam(designResult.requirements, missionName);
    const tasks = buildPhase.assignTasks(designResult.requirements, team);

    return {
      phase: 'BUILD',
      status: 'COMPLETE',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      team,
      automationScore,
      buildAction,
      tasks,
      estimatedTimeSaving: BUILD_ACTION_SAVINGS[buildAction],
      nextPhase: 'LAUNCH',
    };
  },
};

export default buildPhase;
