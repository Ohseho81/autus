/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎮 AUTUS 게이미피케이션 상세 설계
 * 
 * 핵심 원칙:
 * 1. 의미 있는 보상 - 행동 → 결과 연결
 * 2. 적절한 난이도 - 플로우 상태 유지
 * 3. 사회적 인정 - 순위/비교 적절히 활용
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// XP 시스템
// ═══════════════════════════════════════════════════════════════════════════════

export interface XPAction {
  id: string;
  name: string;
  description: string;
  baseXP: number;
  maxDailyCount?: number;       // 하루 최대 획득 횟수
  bonusMultiplier?: number;     // 연속 시 보너스 배율
  targetRoles: ('STUDENT' | 'EXECUTOR')[];
}

export const XP_ACTIONS: XPAction[] = [
  // 🎒 학생 액션
  {
    id: 'homework_complete',
    name: '숙제 완료',
    description: '숙제를 완료하면 XP 획득',
    baseXP: 30,
    maxDailyCount: 5,
    targetRoles: ['STUDENT'],
  },
  {
    id: 'class_attendance',
    name: '수업 출석',
    description: '수업에 출석하면 XP 획득',
    baseXP: 20,
    maxDailyCount: 3,
    targetRoles: ['STUDENT'],
  },
  {
    id: 'on_time_attendance',
    name: '지각 없이 출석',
    description: '시간 내 출석하면 보너스 XP',
    baseXP: 10,
    maxDailyCount: 3,
    targetRoles: ['STUDENT'],
  },
  {
    id: 'quiz_correct',
    name: '퀴즈 정답',
    description: '퀴즈 정답 시 XP 획득',
    baseXP: 15,
    maxDailyCount: 10,
    targetRoles: ['STUDENT'],
  },
  {
    id: 'test_improvement',
    name: '성적 향상',
    description: '테스트 점수가 오르면 XP 획득',
    baseXP: 50,
    bonusMultiplier: 1.5, // 5점당 +50%
    targetRoles: ['STUDENT'],
  },
  {
    id: 'daily_login',
    name: '출석 체크',
    description: '매일 앱에 접속하면 XP 획득',
    baseXP: 10,
    maxDailyCount: 1,
    targetRoles: ['STUDENT'],
  },
  
  // 🔨 선생님 액션
  {
    id: 'student_record',
    name: '학생 기록',
    description: '학생 상태를 기록하면 XP 획득',
    baseXP: 50,
    maxDailyCount: 20,
    targetRoles: ['EXECUTOR'],
  },
  {
    id: 'risk_resolved',
    name: '위험 학생 안정화',
    description: '관심 필요 학생을 안정시키면 XP 획득',
    baseXP: 100,
    targetRoles: ['EXECUTOR'],
  },
  {
    id: 'parent_message',
    name: '학부모 소통',
    description: '학부모에게 메시지를 보내면 XP 획득',
    baseXP: 30,
    maxDailyCount: 10,
    targetRoles: ['EXECUTOR'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 레벨 시스템
// ═══════════════════════════════════════════════════════════════════════════════

export interface Level {
  level: number;
  name: string;
  requiredXP: number;
  totalXP: number;       // 이 레벨까지 필요한 총 XP
  perks: string[];       // 레벨 달성 시 해금되는 것들
  badge?: string;        // 레벨 배지
}

export const STUDENT_LEVELS: Level[] = [
  { level: 1, name: '새싹', requiredXP: 0, totalXP: 0, perks: [], badge: '🌱' },
  { level: 2, name: '초보', requiredXP: 100, totalXP: 100, perks: ['프로필 테두리'], badge: '🌿' },
  { level: 3, name: '학습자', requiredXP: 200, totalXP: 300, perks: ['이모지 반응'], badge: '📚' },
  { level: 4, name: '열심이', requiredXP: 300, totalXP: 600, perks: ['커스텀 아바타'], badge: '💪' },
  { level: 5, name: '성실한', requiredXP: 400, totalXP: 1000, perks: ['칭호 선택'], badge: '⭐' },
  { level: 6, name: '우수', requiredXP: 500, totalXP: 1500, perks: ['특별 이펙트'], badge: '🌟' },
  { level: 7, name: '인정받는', requiredXP: 600, totalXP: 2100, perks: ['순위 보기'], badge: '🏅' },
  { level: 8, name: '뛰어난', requiredXP: 700, totalXP: 2800, perks: ['주간 리포트'], badge: '🎖️' },
  { level: 9, name: '모범', requiredXP: 800, totalXP: 3600, perks: ['멘토 자격'], badge: '👑' },
  { level: 10, name: '마스터', requiredXP: 1000, totalXP: 4600, perks: ['명예의 전당'], badge: '🏆' },
  { level: 11, name: '레전드', requiredXP: 1500, totalXP: 6100, perks: ['레전드 이펙트'], badge: '💎' },
  { level: 12, name: '전설', requiredXP: 2000, totalXP: 8100, perks: ['전설 칭호'], badge: '🔥' },
];

export const TEACHER_LEVELS: Level[] = [
  { level: 1, name: '신규', requiredXP: 0, totalXP: 0, perks: [], badge: '🌱' },
  { level: 2, name: '적응 중', requiredXP: 500, totalXP: 500, perks: ['기록 통계'], badge: '📝' },
  { level: 3, name: '익숙한', requiredXP: 1000, totalXP: 1500, perks: ['효과 분석'], badge: '📊' },
  { level: 4, name: '능숙한', requiredXP: 1500, totalXP: 3000, perks: ['AI 추천'], badge: '🎯' },
  { level: 5, name: '베테랑', requiredXP: 2000, totalXP: 5000, perks: ['멘토 자격'], badge: '⭐' },
  { level: 6, name: '마스터', requiredXP: 3000, totalXP: 8000, perks: ['팀 통계'], badge: '🏆' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 뱃지 시스템
// ═══════════════════════════════════════════════════════════════════════════════

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'attendance' | 'achievement' | 'social' | 'streak' | 'special';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  condition: string;          // 획득 조건 설명
  conditionType: string;      // 프로그래밍 조건
  conditionValue: number;     // 조건 값
  xpReward: number;           // 획득 시 XP 보상
  targetRoles: ('STUDENT' | 'EXECUTOR')[];
}

export const BADGES: BadgeDefinition[] = [
  // 🔥 Streak 뱃지
  {
    id: 'streak_7',
    name: '일주일의 시작',
    description: '7일 연속 출석',
    icon: '🔥',
    rarity: 'common',
    category: 'streak',
    condition: '7일 연속 출석하기',
    conditionType: 'streak_days',
    conditionValue: 7,
    xpReward: 100,
    targetRoles: ['STUDENT', 'EXECUTOR'],
  },
  {
    id: 'streak_14',
    name: '2주 연속!',
    description: '14일 연속 출석',
    icon: '🔥',
    rarity: 'rare',
    category: 'streak',
    condition: '14일 연속 출석하기',
    conditionType: 'streak_days',
    conditionValue: 14,
    xpReward: 200,
    targetRoles: ['STUDENT', 'EXECUTOR'],
  },
  {
    id: 'streak_30',
    name: '한 달의 기적',
    description: '30일 연속 출석',
    icon: '🏆',
    rarity: 'epic',
    category: 'streak',
    condition: '30일 연속 출석하기',
    conditionType: 'streak_days',
    conditionValue: 30,
    xpReward: 500,
    targetRoles: ['STUDENT', 'EXECUTOR'],
  },
  {
    id: 'streak_100',
    name: '100일의 기적',
    description: '100일 연속 출석',
    icon: '💎',
    rarity: 'legendary',
    category: 'streak',
    condition: '100일 연속 출석하기',
    conditionType: 'streak_days',
    conditionValue: 100,
    xpReward: 1000,
    targetRoles: ['STUDENT', 'EXECUTOR'],
  },
  
  // 📚 Achievement 뱃지 (학생)
  {
    id: 'homework_master',
    name: '숙제왕',
    description: '숙제 100개 완료',
    icon: '📝',
    rarity: 'rare',
    category: 'achievement',
    condition: '숙제 100개 완료하기',
    conditionType: 'homework_count',
    conditionValue: 100,
    xpReward: 300,
    targetRoles: ['STUDENT'],
  },
  {
    id: 'perfect_attendance',
    name: '개근상',
    description: '한 달 동안 결석 0',
    icon: '🏅',
    rarity: 'epic',
    category: 'attendance',
    condition: '한 달 동안 결석 없이 출석하기',
    conditionType: 'monthly_full_attendance',
    conditionValue: 1,
    xpReward: 400,
    targetRoles: ['STUDENT'],
  },
  {
    id: 'score_improver',
    name: '성장의 증거',
    description: '테스트 점수 20점 향상',
    icon: '📈',
    rarity: 'rare',
    category: 'achievement',
    condition: '테스트 점수 20점 이상 향상',
    conditionType: 'score_improvement',
    conditionValue: 20,
    xpReward: 250,
    targetRoles: ['STUDENT'],
  },
  
  // 🔨 Achievement 뱃지 (선생님)
  {
    id: 'record_master',
    name: '기록왕',
    description: '기록 100개 작성',
    icon: '✏️',
    rarity: 'rare',
    category: 'achievement',
    condition: '학생 기록 100개 작성',
    conditionType: 'record_count',
    conditionValue: 100,
    xpReward: 300,
    targetRoles: ['EXECUTOR'],
  },
  {
    id: 'risk_defender',
    name: '이탈 방어자',
    description: '위험 학생 10명 안정화',
    icon: '🛡️',
    rarity: 'epic',
    category: 'achievement',
    condition: '관심 필요 학생 10명 안정화',
    conditionType: 'risk_resolved',
    conditionValue: 10,
    xpReward: 500,
    targetRoles: ['EXECUTOR'],
  },
  {
    id: 'parent_friend',
    name: '소통왕',
    description: '학부모 메시지 50개 발송',
    icon: '💬',
    rarity: 'rare',
    category: 'social',
    condition: '학부모에게 메시지 50개 발송',
    conditionType: 'parent_message_count',
    conditionValue: 50,
    xpReward: 200,
    targetRoles: ['EXECUTOR'],
  },
  
  // 🌟 Special 뱃지
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'AUTUS 초기 사용자',
    icon: '🚀',
    rarity: 'legendary',
    category: 'special',
    condition: 'AUTUS 베타 테스터',
    conditionType: 'special',
    conditionValue: 1,
    xpReward: 500,
    targetRoles: ['STUDENT', 'EXECUTOR'],
  },
  {
    id: 'top_scorer',
    name: '1등!',
    description: '주간 순위 1등 달성',
    icon: '🥇',
    rarity: 'epic',
    category: 'social',
    condition: '주간 XP 순위 1등 달성',
    conditionType: 'weekly_rank',
    conditionValue: 1,
    xpReward: 300,
    targetRoles: ['STUDENT', 'EXECUTOR'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 퀘스트/미션 시스템
// ═══════════════════════════════════════════════════════════════════════════════

export type QuestType = 'daily' | 'weekly' | 'achievement' | 'story';

export interface Quest {
  id: string;
  type: QuestType;
  name: string;
  description: string;
  icon: string;
  tasks: QuestTask[];
  rewards: QuestReward;
  expiresAt?: Date;
  targetRoles: ('STUDENT' | 'EXECUTOR')[];
}

export interface QuestTask {
  id: string;
  description: string;
  target: number;
  current: number;
  isCompleted: boolean;
}

export interface QuestReward {
  xp: number;
  badge?: string;
  title?: string;
  other?: string;
}

export const DAILY_QUESTS: Omit<Quest, 'expiresAt'>[] = [
  {
    id: 'daily_attendance',
    type: 'daily',
    name: '오늘의 출석',
    description: '오늘 수업에 모두 출석하기',
    icon: '📅',
    tasks: [
      { id: 't1', description: '수업 출석하기', target: 1, current: 0, isCompleted: false },
    ],
    rewards: { xp: 30 },
    targetRoles: ['STUDENT'],
  },
  {
    id: 'daily_homework',
    type: 'daily',
    name: '오늘의 숙제',
    description: '오늘 숙제를 완료하기',
    icon: '📝',
    tasks: [
      { id: 't1', description: '숙제 완료하기', target: 1, current: 0, isCompleted: false },
    ],
    rewards: { xp: 50 },
    targetRoles: ['STUDENT'],
  },
  {
    id: 'daily_record',
    type: 'daily',
    name: '오늘의 기록',
    description: '학생 3명 이상 기록하기',
    icon: '✏️',
    tasks: [
      { id: 't1', description: '학생 기록하기', target: 3, current: 0, isCompleted: false },
    ],
    rewards: { xp: 100 },
    targetRoles: ['EXECUTOR'],
  },
];

export const WEEKLY_QUESTS: Omit<Quest, 'expiresAt'>[] = [
  {
    id: 'weekly_perfect',
    type: 'weekly',
    name: '완벽한 한 주',
    description: '이번 주 모든 수업 출석 + 숙제 완료',
    icon: '⭐',
    tasks: [
      { id: 't1', description: '수업 5회 출석', target: 5, current: 0, isCompleted: false },
      { id: 't2', description: '숙제 5개 완료', target: 5, current: 0, isCompleted: false },
    ],
    rewards: { xp: 200, badge: 'weekly_perfect' },
    targetRoles: ['STUDENT'],
  },
  {
    id: 'weekly_care',
    type: 'weekly',
    name: '케어 마스터',
    description: '이번 주 관심 필요 학생 전원 조치',
    icon: '🛡️',
    tasks: [
      { id: 't1', description: '관심 필요 학생 조치', target: 5, current: 0, isCompleted: false },
    ],
    rewards: { xp: 300 },
    targetRoles: ['EXECUTOR'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 순위 시스템
// ═══════════════════════════════════════════════════════════════════════════════

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  isMe: boolean;
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';
export type LeaderboardScope = 'class' | 'academy' | 'global';

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

export function getLevelFromXP(totalXP: number, levels: Level[]): Level {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXP >= levels[i].totalXP) {
      return levels[i];
    }
  }
  return levels[0];
}

export function getNextLevel(currentLevel: number, levels: Level[]): Level | null {
  const nextIndex = levels.findIndex(l => l.level === currentLevel + 1);
  return nextIndex >= 0 ? levels[nextIndex] : null;
}

export function getXPProgress(totalXP: number, levels: Level[]): { 
  current: number; 
  required: number; 
  percentage: number;
} {
  const currentLevel = getLevelFromXP(totalXP, levels);
  const nextLevel = getNextLevel(currentLevel.level, levels);
  
  if (!nextLevel) {
    return { current: 0, required: 0, percentage: 100 };
  }
  
  const currentLevelXP = totalXP - currentLevel.totalXP;
  const percentage = (currentLevelXP / nextLevel.requiredXP) * 100;
  
  return {
    current: currentLevelXP,
    required: nextLevel.requiredXP,
    percentage: Math.min(percentage, 100),
  };
}

export function getBadgesByCategory(category: BadgeCategory): BadgeDefinition[] {
  return BADGES.filter(b => b.category === category);
}

export function getRarityColor(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common': return 'text-slate-400 border-slate-500';
    case 'rare': return 'text-blue-400 border-blue-500';
    case 'epic': return 'text-purple-400 border-purple-500';
    case 'legendary': return 'text-yellow-400 border-yellow-500';
  }
}

export function getRarityGlow(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common': return '';
    case 'rare': return 'shadow-blue-500/20';
    case 'epic': return 'shadow-purple-500/30';
    case 'legendary': return 'shadow-yellow-500/40';
  }
}
