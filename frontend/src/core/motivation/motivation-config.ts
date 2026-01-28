/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 동기부여 설계
 * 
 * 원칙: "생물학적 보상(도파민)으로 즉각 동기를, 인문학적 의미로 지속 동기를 만든다"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 역할 타입
// ═══════════════════════════════════════════════════════════════════════════════

export type MotivationRole = 
  | 'EXECUTOR'   // 🔨 실무자 (선생님)
  | 'OPERATOR'   // ⚙️ 관리자 (실장)
  | 'OWNER'      // 👑 오너 (원장)
  | 'PARENT'     // 👨‍👩‍👧 학부모
  | 'STUDENT';   // 🎒 학생

// ═══════════════════════════════════════════════════════════════════════════════
// 도파민 트리거 타입
// ═══════════════════════════════════════════════════════════════════════════════

export type DopamineTrigger = 
  | 'completion'     // 완료 체크
  | 'progress'       // 진행률 증가
  | 'streak'         // 연속 기록
  | 'prediction'     // 예측 적중
  | 'improvement'    // 숫자 개선
  | 'recognition'    // 인정/칭찬
  | 'comparison'     // 비교 우위
  | 'collection'     // 뱃지 수집
  | 'levelup'        // 레벨업
  | 'ranking';       // 순위 상승

// ═══════════════════════════════════════════════════════════════════════════════
// 의미 부여 타입
// ═══════════════════════════════════════════════════════════════════════════════

export type MeaningType = 
  | 'purpose'     // 목적 (Purpose)
  | 'mastery'     // 숙련 (Mastery)
  | 'autonomy'    // 자율 (Autonomy)
  | 'belonging'   // 연결 (Belonging)
  | 'legacy';     // 유산 (Legacy)

// ═══════════════════════════════════════════════════════════════════════════════
// 역할별 동기부여 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoleMotivation {
  role: MotivationRole;
  name: string;
  nameKo: string;
  icon: string;
  coreNeeds: string[];           // 핵심 욕구
  dopamineTriggers: DopamineTriggerConfig[];
  meaningProviders: MeaningConfig[];
  uiElements: string[];          // UI 핵심 요소
}

export interface DopamineTriggerConfig {
  type: DopamineTrigger;
  name: string;
  description: string;
  example: string;
  priority: number; // 1 = 최우선
}

export interface MeaningConfig {
  type: MeaningType;
  name: string;
  description: string;
  example: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 역할별 동기부여 설정 데이터
// ═══════════════════════════════════════════════════════════════════════════════

export const ROLE_MOTIVATIONS: Record<MotivationRole, RoleMotivation> = {
  // ─────────────────────────────────────────────────────────────────────────
  // 🔨 실무자 (선생님)
  // ─────────────────────────────────────────────────────────────────────────
  EXECUTOR: {
    role: 'EXECUTOR',
    name: 'Executor',
    nameKo: '선생님',
    icon: '🔨',
    coreNeeds: ['유능감', '즉각적 피드백', '감사받음'],
    dopamineTriggers: [
      {
        type: 'completion',
        name: '즉각적 완료감',
        description: '체크하는 순간 도파민 (완료의 쾌감)',
        example: '✅ 김민수 기록 완료! 오늘 할 일: 4/5 완료',
        priority: 1,
      },
      {
        type: 'progress',
        name: '내 행동 → 결과 연결',
        description: '"내가 한 일이 효과가 있었다" = 유능감 도파민',
        example: '선생님이 챙긴 학생 3명: 김민수 36° → 68° (+32°)',
        priority: 2,
      },
      {
        type: 'streak',
        name: '연속 기록',
        description: '끊기 싫은 심리 = 유지 동기',
        example: '🔥 15일 연속 기록 중! 20일 달성하면 🏆 성실왕 뱃지!',
        priority: 3,
      },
    ],
    meaningProviders: [
      {
        type: 'purpose',
        name: '변화의 증인',
        description: '"내가 이 아이들을 변화시켰다" = 존재 의미',
        example: '올해 선생님 반 학생 32명 중 성적 향상: 28명 (87%)',
      },
      {
        type: 'mastery',
        name: '전문가 인정',
        description: '숙련도 시각화 = 전문가 정체성',
        example: '학생 케어: ⭐⭐⭐⭐⭐ (상위 10%)',
      },
    ],
    uiElements: ['진행률 바', '연속 기록 🔥', '효과 시각화', '감사 메시지 알림'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ⚙️ 관리자 (실장)
  // ─────────────────────────────────────────────────────────────────────────
  OPERATOR: {
    role: 'OPERATOR',
    name: 'Operator',
    nameKo: '실장님',
    icon: '⚙️',
    coreNeeds: ['통제감', '문제 해결', '시스템 최적화'],
    dopamineTriggers: [
      {
        type: 'improvement',
        name: '숫자 개선',
        description: '숫자가 좋아지는 것 = 관리 능력 확인 = 도파민',
        example: '관심필요 5명→3명 ↓2 🎉 / 기록률 65%→82% ↑17% 🔥',
        priority: 1,
      },
      {
        type: 'completion',
        name: '문제 해결 완료',
        description: '문제 → 해결의 완결감 = 통제감 도파민',
        example: '이번 주 발생 12건 → 해결 10건 (83%)',
        priority: 2,
      },
      {
        type: 'prediction',
        name: '예측 적중',
        description: '예측 → 확인 = 도파민의 기본 메커니즘',
        example: '이탈 예측 5명 → 실제 이탈 4명 (80% 적중)',
        priority: 3,
      },
    ],
    meaningProviders: [
      {
        type: 'purpose',
        name: '조직의 심장',
        description: '"내가 이 조직을 돌아가게 한다" = 존재 의미',
        example: '이번 달 실장님이 막은 이탈: 8명 → 예상 매출 손실 방지: ₩3,200,000',
      },
      {
        type: 'mastery',
        name: '시스템 설계자',
        description: '시스템을 설계하고 최적화하는 쾌감 = 엔지니어 정체성',
        example: '자동화로 절약한 시간: 월 12시간',
      },
      {
        type: 'belonging',
        name: '팀 리더십',
        description: '팀을 이끄는 리더로서의 정체성',
        example: '"실장님 덕분에 저희가 편하게 일해요" - 김선생님',
      },
    ],
    uiElements: ['변화량 표시 (↑↓)', '해결률 %', '예측 정확도', '자동화 카운터'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 👑 오너 (원장)
  // ─────────────────────────────────────────────────────────────────────────
  OWNER: {
    role: 'OWNER',
    name: 'Owner',
    nameKo: '원장님',
    icon: '👑',
    coreNeeds: ['성장', '유산', '의사결정 성공'],
    dopamineTriggers: [
      {
        type: 'progress',
        name: '목표 달성',
        description: '큰 목표 달성 = 강력한 도파민',
        example: '재원 150명 ████████████████████ 100% 달성! 🎉',
        priority: 1,
      },
      {
        type: 'prediction',
        name: '의사결정 성공',
        description: '내 판단이 맞았다 = 자기효능감 도파민',
        example: '"신규 반 개설" 결정 → 18명 등록, 매출 +₩720만 → 🎯 좋은 결정!',
        priority: 2,
      },
      {
        type: 'improvement',
        name: '성장 그래프',
        description: '우상향 그래프 = 성취감 도파민',
        example: '5년간 150% 성장! 60명 → 150명',
        priority: 3,
      },
    ],
    meaningProviders: [
      {
        type: 'legacy',
        name: '유산',
        description: '"내가 만든 것이 지속된다" = 불멸의 욕구',
        example: '지난 10년간 배출한 학생: 1,247명 / SKY 진학: 89명',
      },
      {
        type: 'purpose',
        name: '영향력',
        description: '사회적 영향력 = 자기 존재의 확장',
        example: '직접 고용: 12명 (12가정의 생계에 기여)',
      },
      {
        type: 'mastery',
        name: '통찰력',
        description: '경험에서 온 지혜 인정 = 원로로서의 정체성',
        example: '"원장님의 직관이 데이터와 87% 일치합니다"',
      },
    ],
    uiElements: ['목표 게이지', '결정 결과 리포트', '장기 타임라인', '졸업생 성과 아카이브'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 👨‍👩‍👧 학부모
  // ─────────────────────────────────────────────────────────────────────────
  PARENT: {
    role: 'PARENT',
    name: 'Parent',
    nameKo: '학부모',
    icon: '👨‍👩‍👧',
    coreNeeds: ['안심', '투자 확인', '좋은 부모 정체성'],
    dopamineTriggers: [
      {
        type: 'progress',
        name: '성장 확인',
        description: '숫자 상승 확인 = 투자 보상 도파민',
        example: '민수 수학: 78점 → 88점 +10점 ↑ 🎉 상위 25% 진입!',
        priority: 1,
      },
      {
        type: 'recognition',
        name: '칭찬 받기',
        description: '내 아이 칭찬 = 대리 도파민 (부모의 뇌는 자녀 성공을 자기 성공처럼)',
        example: '"민수가 오늘 수업에서 정말 잘했어요! 집에서 칭찬 많이 해주세요 😊"',
        priority: 2,
      },
      {
        type: 'comparison',
        name: '비교 우위',
        description: '비교 우위 확인 = 경쟁 본능 도파민',
        example: '민수 88점 | 평균 75점 (+13) ✨ 민수는 또래보다 앞서가고 있어요!',
        priority: 3,
      },
    ],
    meaningProviders: [
      {
        type: 'purpose',
        name: '좋은 부모',
        description: '"나는 좋은 부모다" = 정체성 확인',
        example: '💝 부모님의 좋은 선택이 민수를 바꿨습니다',
      },
      {
        type: 'autonomy',
        name: '안심',
        description: '"걱정 안 해도 된다" = 불안 해소 = 안도감',
        example: '현재 상태: 🟢 안정적 / 😌 걱정하지 않으셔도 돼요',
      },
      {
        type: 'legacy',
        name: '미래 비전',
        description: '미래 가능성 시각화 = 희망',
        example: '"이 속도면 원하시는 고등학교 충분히 갈 수 있어요"',
      },
    ],
    uiElements: ['성장 곡선', '칭찬 알림', '상위 N%', '예상 경로'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 🎒 학생
  // ─────────────────────────────────────────────────────────────────────────
  STUDENT: {
    role: 'STUDENT',
    name: 'Student',
    nameKo: '학생',
    icon: '🎒',
    coreNeeds: ['재미', '성취', '인정', '자율성', '연결'],
    dopamineTriggers: [
      {
        type: 'levelup',
        name: 'XP & 레벨업',
        description: '조금만 더 하면 레벨업 = 지속 동기',
        example: 'Level 12 → 13 ████████████████░░░░ 1,850/2,000 XP',
        priority: 1,
      },
      {
        type: 'collection',
        name: '뱃지 수집',
        description: '희귀 뱃지 수집 = 포켓몬 심리',
        example: '🎖️ 분수 마스터 뱃지 획득! 보유 뱃지: 12개',
        priority: 2,
      },
      {
        type: 'streak',
        name: '연속 기록',
        description: '끊기 싫은 심리 (손실 회피)',
        example: '🔥 25일 연속 출석! ⚠️ 내일 안 오면 처음부터!',
        priority: 3,
      },
      {
        type: 'ranking',
        name: '순위 경쟁',
        description: '적절한 경쟁 = 동기부여',
        example: '🥇 박지민 +320XP / 🥈 김민수 +280XP ← 나!',
        priority: 4,
      },
    ],
    meaningProviders: [
      {
        type: 'purpose',
        name: '성장 스토리',
        description: '내 인생의 주인공 = 영웅 서사',
        example: 'Chapter 1: 시작 → Chapter 4: 지금 "분수? 이제 쉬워!" 🎉',
      },
      {
        type: 'autonomy',
        name: 'Why (왜 해야 하는지)',
        description: '의미 연결 = 내적 동기',
        example: '🎮 게임에서: 아이템 분배할 때 필요해',
      },
      {
        type: 'legacy',
        name: '꿈 연결',
        description: '현재 노력 = 미래 꿈 연결',
        example: '게임 개발자가 되려면: ✅ 수학 기초 (지금 하는 중!)',
      },
      {
        type: 'belonging',
        name: '인정 & 소속',
        description: '의미있는 타인의 인정 = 사회적 보상',
        example: '"민수야, 오늘 네가 스스로 문제 풀이법을 찾아낸 거 정말 대단했어!"',
      },
    ],
    uiElements: ['XP 게이지', '뱃지 컬렉션', '🔥 연속기록', '순위표', 'Why 설명', '꿈 로드맵'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 용어 한국어화 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const TERMINOLOGY = {
  // 시스템 용어 → 일상 표현
  system: {
    'risk_queue': '관심 필요',
    'sigma': '관계 온도',
    'active_shield': '먼저 챙기기',
    'quick_tag': '바로 기록',
    'churn': '이탈',
    'dashboard': '한눈에 보기',
    'playbook': '자동 규칙',
    'notification': '알림',
    'behavior': '행위',
    'streak': '연속 기록',
    'xp': '경험치',
    'level': '레벨',
    'badge': '뱃지',
  },

  // 아이콘
  icons: {
    student: '🎒',
    parent: '👨‍👩‍👧',
    teacher: '🧑‍🏫',
    message: '💬',
    phone: '📱',
    growth: '🌱',
    temperature: '🌡️',
    fire: '🔥',
    trophy: '🏆',
    star: '⭐',
    check: '✅',
    warning: '⚠️',
    heart: '❤️',
  },

  // 온도 상태
  temperature: {
    hot: { min: 80, label: '따뜻함 🔥', color: '#FF6B6B' },
    warm: { min: 60, label: '좋음 😊', color: '#FFD93D' },
    cool: { min: 40, label: '주의 😐', color: '#6BCB77' },
    cold: { min: 0, label: '위험 🥶', color: '#4D96FF' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

export function getTerminology(key: string): string {
  return TERMINOLOGY.system[key as keyof typeof TERMINOLOGY.system] || key;
}

export function getTemperatureLabel(value: number): string {
  const { hot, warm, cool, cold } = TERMINOLOGY.temperature;
  if (value >= hot.min) return hot.label;
  if (value >= warm.min) return warm.label;
  if (value >= cool.min) return cool.label;
  return cold.label;
}

export function getTemperatureColor(value: number): string {
  const { hot, warm, cool, cold } = TERMINOLOGY.temperature;
  if (value >= hot.min) return hot.color;
  if (value >= warm.min) return warm.color;
  if (value >= cool.min) return cool.color;
  return cold.color;
}

export function getRoleMotivation(role: MotivationRole): RoleMotivation {
  return ROLE_MOTIVATIONS[role];
}

export function getPrimaryDopamineTrigger(role: MotivationRole): DopamineTriggerConfig {
  const motivation = ROLE_MOTIVATIONS[role];
  return motivation.dopamineTriggers.find(t => t.priority === 1) || motivation.dopamineTriggers[0];
}
