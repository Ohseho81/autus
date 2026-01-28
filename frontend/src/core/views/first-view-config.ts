/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS First View Configuration
 * 
 * 각 역할의 핵심 질문과 First View 우선순위 설정
 * "사용자가 앱을 열었을 때 가장 먼저 봐야 할 것"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { MotivationRole } from '../motivation';

// ═══════════════════════════════════════════════════════════════════════════════
// First View 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface FirstViewConfig {
  role: MotivationRole;
  coreQuestion: string;        // 핵심 질문
  coreQuestionKo: string;
  priorities: FirstViewPriority[];
  greeting: (name: string) => string;
  emptyState: string;          // 데이터 없을 때 메시지
}

export interface FirstViewPriority {
  order: number;
  component: string;
  label: string;
  description: string;
  dataRequired: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 역할별 First View 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const FIRST_VIEW_CONFIGS: Record<MotivationRole, FirstViewConfig> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // 🔨 실무자 (선생님)
  // ─────────────────────────────────────────────────────────────────────────────
  EXECUTOR: {
    role: 'EXECUTOR',
    coreQuestion: 'What should I do now?',
    coreQuestionKo: '지금 뭐 해야 해요?',
    priorities: [
      {
        order: 1,
        component: 'AttentionNeeded',
        label: '🚨 지금 바로',
        description: '관심 필요 학생 목록',
        dataRequired: ['riskQueue'],
      },
      {
        order: 2,
        component: 'TodaySchedule',
        label: '📅 오늘 수업',
        description: '오늘 수업 일정',
        dataRequired: ['schedule'],
      },
      {
        order: 3,
        component: 'QuickTagButton',
        label: '✏️ 바로 기록',
        description: '플로팅 기록 버튼',
        dataRequired: [],
      },
      {
        order: 4,
        component: 'StreakBadge',
        label: '🔥 연속 기록',
        description: '연속 기록 현황',
        dataRequired: ['streak'],
      },
    ],
    greeting: (name) => `좋은 아침이에요, ${name} 선생님!`,
    emptyState: '오늘 케어할 학생이 없어요 😊',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ⚙️ 관리자 (실장)
  // ─────────────────────────────────────────────────────────────────────────────
  OPERATOR: {
    role: 'OPERATOR',
    coreQuestion: 'How is the overall situation?',
    coreQuestionKo: '전체 상황이 어때요?',
    priorities: [
      {
        order: 1,
        component: 'KPICards',
        label: '📊 핵심 지표',
        description: '전체/관심필요/평균온도/이탈',
        dataRequired: ['kpi'],
      },
      {
        order: 2,
        component: 'WeeklyChange',
        label: '📈 이번 주 변화',
        description: '주요 지표 변화량',
        dataRequired: ['weeklyStats'],
      },
      {
        order: 3,
        component: 'RiskQueuePanel',
        label: '🚨 관심 필요',
        description: '관심 필요 학생 목록',
        dataRequired: ['riskQueue'],
      },
      {
        order: 4,
        component: 'TeacherStatus',
        label: '👥 선생님별 현황',
        description: '선생님별 기록 현황',
        dataRequired: ['teacherStats'],
      },
    ],
    greeting: (name) => `좋은 아침입니다, ${name} 실장님`,
    emptyState: '모든 상황이 정상이에요 ✨',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 👑 오너 (원장)
  // ─────────────────────────────────────────────────────────────────────────────
  OWNER: {
    role: 'OWNER',
    coreQuestion: 'What will happen in the future?',
    coreQuestionKo: '앞으로 어떻게 될까요?',
    priorities: [
      {
        order: 1,
        component: 'GoalProgress',
        label: '🎯 목표 달성률',
        description: '분기/연간 목표 게이지',
        dataRequired: ['goals'],
      },
      {
        order: 2,
        component: 'PredictionGraph',
        label: '📈 30일 예측',
        description: '향후 30일 예측 그래프',
        dataRequired: ['prediction'],
      },
      {
        order: 3,
        component: 'DecisionQueue',
        label: '⚖️ 결정 필요',
        description: '승인 대기 항목',
        dataRequired: ['decisions'],
      },
      {
        order: 4,
        component: 'RevenueStatus',
        label: '💰 매출 현황',
        description: '매출 현황 및 예상',
        dataRequired: ['revenue'],
      },
    ],
    greeting: (name) => `원장님, 좋은 아침입니다`,
    emptyState: '결정할 사항이 없습니다',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 👨‍👩‍👧 학부모
  // ─────────────────────────────────────────────────────────────────────────────
  PARENT: {
    role: 'PARENT',
    coreQuestion: 'How much has my child grown?',
    coreQuestionKo: '우리 아이가 얼마나 성장했나요?',
    priorities: [
      {
        order: 1,
        component: 'GrowthCurve',
        label: '📈 성장 곡선',
        description: '과거→현재→미래 성장 그래프',
        dataRequired: ['growth'],
      },
      {
        order: 2,
        component: 'CurrentStatus',
        label: '⭐ 현재 상태',
        description: '별점 기반 현재 상태',
        dataRequired: ['status'],
      },
      {
        order: 3,
        component: 'WeeklyReport',
        label: '📊 이번 주 리포트',
        description: '주간 성과 요약',
        dataRequired: ['weeklyReport'],
      },
      {
        order: 4,
        component: 'PraiseMessages',
        label: '💬 선생님 칭찬',
        description: '선생님 칭찬 메시지',
        dataRequired: ['messages'],
      },
    ],
    greeting: (name) => `${name}의 성장 이야기`,
    emptyState: '이번 주 업데이트를 기다려주세요',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 🎒 학생
  // ─────────────────────────────────────────────────────────────────────────────
  STUDENT: {
    role: 'STUDENT',
    coreQuestion: 'What should I do, why, and how?',
    coreQuestionKo: '내가 뭘 왜 어떻게 해야 해?',
    priorities: [
      {
        order: 1,
        component: 'LevelXPBar',
        label: '🎮 레벨 & XP',
        description: '현재 레벨과 경험치',
        dataRequired: ['level', 'xp'],
      },
      {
        order: 2,
        component: 'StreakBadge',
        label: '🔥 연속 기록',
        description: '연속 출석/학습 기록',
        dataRequired: ['streak'],
      },
      {
        order: 3,
        component: 'TodayMission',
        label: '🎯 오늘의 미션',
        description: 'What/How/Why 미션 카드',
        dataRequired: ['mission'],
      },
      {
        order: 4,
        component: 'DreamRoadmap',
        label: '🌟 꿈 로드맵',
        description: '현재→꿈 연결 로드맵',
        dataRequired: ['dream', 'roadmap'],
      },
    ],
    greeting: (name) => `안녕 ${name}야!`,
    emptyState: '오늘의 미션이 곧 도착해요!',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

export function getFirstViewConfig(role: MotivationRole): FirstViewConfig {
  return FIRST_VIEW_CONFIGS[role];
}

export function getGreeting(role: MotivationRole, name: string): string {
  return FIRST_VIEW_CONFIGS[role].greeting(name);
}

export function getTopPriorities(role: MotivationRole, count = 4): FirstViewPriority[] {
  return FIRST_VIEW_CONFIGS[role].priorities
    .slice(0, count)
    .sort((a, b) => a.order - b.order);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 플로우 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface UserFlow {
  id: string;
  name: string;
  description: string;
  trigger: string;           // 언제 시작?
  steps: FlowStep[];
  dopaminePoints: string[];  // 도파민 포인트
  meaningProvided: string;   // 의미 부여
}

export interface FlowStep {
  order: number;
  action: string;
  uiElement?: string;
  autoTrigger?: boolean;
}

// 역할별 주요 플로우 정의
export const USER_FLOWS: Record<MotivationRole, UserFlow[]> = {
  EXECUTOR: [
    {
      id: 'morning-check',
      name: '아침 점검',
      description: '출근 후 관심 필요 학생 확인',
      trigger: '아침 출근 시',
      steps: [
        { order: 1, action: '앱 열기' },
        { order: 2, action: '인사 + 연속 기록 확인' },
        { order: 3, action: '지금 바로 섹션 확인' },
        { order: 4, action: '학생 카드 터치', uiElement: 'AttentionCard' },
        { order: 5, action: '조치 선택 (메시지/기록)' },
        { order: 6, action: '완료 체크', autoTrigger: true },
      ],
      dopaminePoints: ['연속 기록 숫자', '완료 체크 애니메이션', '진행률 증가'],
      meaningProvided: '내가 이 아이들을 변화시켰다',
    },
    {
      id: 'quick-tag',
      name: '수업 후 기록',
      description: '수업 종료 후 Quick Tag 입력',
      trigger: '수업 종료 후',
      steps: [
        { order: 1, action: '플로팅 버튼 터치' },
        { order: 2, action: '학생 선택' },
        { order: 3, action: '감정 슬라이더 조절' },
        { order: 4, action: '유대 관계 선택' },
        { order: 5, action: '이슈 태그 선택' },
        { order: 6, action: '메모 입력 (선택)' },
        { order: 7, action: '바로 기록 터치' },
      ],
      dopaminePoints: ['XP 획득 애니메이션', '연속 기록 증가', '완료 사운드'],
      meaningProvided: '내 기록이 학생을 지킨다',
    },
  ],
  OPERATOR: [
    {
      id: 'morning-dashboard',
      name: '아침 점검',
      description: '출근 후 전체 현황 파악',
      trigger: '아침 출근 시',
      steps: [
        { order: 1, action: '앱 열기' },
        { order: 2, action: '핵심 지표 4개 확인', uiElement: 'KPICards' },
        { order: 3, action: '변화량 확인' },
        { order: 4, action: '관심 필요 목록 스캔' },
        { order: 5, action: '담당 선생님 확인' },
        { order: 6, action: '조치 결정' },
      ],
      dopaminePoints: ['숫자 변화량 시각화', '전체 상황 파악 완료'],
      meaningProvided: '내가 이 조직을 돌아가게 한다',
    },
  ],
  OWNER: [
    {
      id: 'strategic-check',
      name: '전략적 점검',
      description: '목표 달성률과 예측 확인',
      trigger: '앱 열기',
      steps: [
        { order: 1, action: '앱 열기' },
        { order: 2, action: '인사 + 결정 성공률 확인' },
        { order: 3, action: '목표 달성률 확인', uiElement: 'GoalProgress' },
        { order: 4, action: '30일 예측 그래프 확인' },
        { order: 5, action: '결정 필요 항목 확인' },
        { order: 6, action: '의사결정' },
      ],
      dopaminePoints: ['목표 달성률 게이지', '예측 그래프', '결정 성공률'],
      meaningProvided: '내가 만든 것이 지속된다',
    },
  ],
  PARENT: [
    {
      id: 'daily-check',
      name: '일상 확인',
      description: '우리 아이 성장 확인',
      trigger: '앱 열기',
      steps: [
        { order: 1, action: '앱 열기' },
        { order: 2, action: '칭찬 메시지 확인' },
        { order: 3, action: '성장 곡선 확인', uiElement: 'GrowthCurve' },
        { order: 4, action: '현재 상태 확인' },
        { order: 5, action: '안심 메시지 확인' },
      ],
      dopaminePoints: ['숫자 상승 확인', '칭찬 메시지', '별점 시각화'],
      meaningProvided: '나는 좋은 부모다',
    },
  ],
  STUDENT: [
    {
      id: 'today-mission',
      name: '오늘의 미션',
      description: '오늘 할 일 확인하고 시작',
      trigger: '앱 열기',
      steps: [
        { order: 1, action: '앱 열기' },
        { order: 2, action: '레벨 & XP 확인', uiElement: 'XPBar' },
        { order: 3, action: '연속 기록 확인', uiElement: 'StreakBadge' },
        { order: 4, action: '오늘의 미션 확인', uiElement: 'MissionCard' },
        { order: 5, action: '시작하기 터치' },
      ],
      dopaminePoints: ['레벨업 근접', '연속 기록 유지', '뱃지 보상'],
      meaningProvided: '나는 매일 성장하고 있다',
    },
  ],
};
