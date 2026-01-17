/**
 * AUTUS K-Scale UI Policy System
 * 
 * 계급(K-Scale)별로 다른 UI 정책을 적용하는 시스템
 * Phase 전환은 "시간 + 계급" 트리거로 자동 적용
 */

// ============================================
// K-Scale 정의
// ============================================

export type KScale = 'K2' | 'K4' | 'K6' | 'K10';

export type Phase = 'PHASE_1' | 'PHASE_2' | 'PHASE_3' | 'PHASE_4' | 'PHASE_5';

// ============================================
// UI 정책 매트릭스
// ============================================

export interface UIPolicy {
  // 텍스트/설명
  showNumbers: boolean;
  showExplanations: boolean;
  showHelp: boolean;
  showFeedback: boolean;
  
  // Gate 체감
  gateResistance: 'none' | 'light' | 'medium' | 'heavy';
  gateFeedbackType: 'text' | 'visual' | 'physical' | 'none';
  
  // 정책 문구
  terminology: 'human' | 'system' | 'physics';
  
  // 접근 권한
  canSeeAfterimage: boolean;
  canSeeSimulation: boolean;
  canSeeGenome: boolean;
}

// ============================================
// K-Scale별 기본 정책
// ============================================

export const K_SCALE_POLICIES: Record<KScale, UIPolicy> = {
  // K2: 일반 사용자 - Phase 2 유지
  K2: {
    showNumbers: false,        // 숫자 제거
    showExplanations: true,    // 최소 설명 유지 (신뢰 구축)
    showHelp: true,           // 도움말 유지
    showFeedback: false,      // 실행 피드백 제거
    gateResistance: 'light',
    gateFeedbackType: 'visual',
    terminology: 'system',     // "시스템 조건"
    canSeeAfterimage: false,
    canSeeSimulation: false,
    canSeeGenome: false,
  },
  
  // K4: 운영자 - Phase 2.5
  K4: {
    showNumbers: false,
    showExplanations: true,    // 설명은 있으나 의미 없음
    showHelp: false,          // 도움말 제거
    showFeedback: false,
    gateResistance: 'medium',
    gateFeedbackType: 'physical',
    terminology: 'system',
    canSeeAfterimage: false,
    canSeeSimulation: true,
    canSeeGenome: false,
  },
  
  // K6: 설계자 - Phase 3
  K6: {
    showNumbers: false,
    showExplanations: false,   // 설명 제거
    showHelp: false,
    showFeedback: false,
    gateResistance: 'heavy',
    gateFeedbackType: 'physical',
    terminology: 'physics',    // "환경/조건"
    canSeeAfterimage: true,
    canSeeSimulation: true,
    canSeeGenome: true,
  },
  
  // K10: 관측자 - Phase 3/4 즉시
  K10: {
    showNumbers: false,
    showExplanations: false,
    showHelp: false,
    showFeedback: false,
    gateResistance: 'heavy',
    gateFeedbackType: 'none',  // 체감 자체가 의미 없음
    terminology: 'physics',
    canSeeAfterimage: true,
    canSeeSimulation: true,
    canSeeGenome: true,
  },
};

// ============================================
// 자동 전환 변수 (Core Metrics)
// ============================================

export interface TransitionMetrics {
  T: number;      // 사용 기간 (일)
  Gr: number;     // Gate 체감 횟수 (RING/LOCK)
  Rr: number;     // 재시도율 (0-1)
  dS: number;     // 엔트로피 변화율
  Is: number;     // 행동 안정성 (0-1)
}

// ============================================
// Phase 자동 전환 조건 (Hard Rules)
// "설명 소멸은 선택이 아니라 조건이다"
// ============================================

export interface PhaseTransitionRule {
  currentPhase: Phase;
  conditions: {
    T?: number;       // 최소 사용 일수
    Gr?: number;      // 최소 Gate 체감 횟수
    RrDecrease?: number; // 재시도율 감소 비율 (%)
    Is?: number;      // 최소 행동 안정성
    dSStable?: boolean; // 엔트로피 안정화 여부
  };
  nextPhase: Phase;
}

// K2 (일반 사용자) - 점진적 전환
export const K2_TRANSITION_RULES: PhaseTransitionRule[] = [
  {
    currentPhase: 'PHASE_2',
    conditions: { T: 30, Gr: 3 },
    nextPhase: 'PHASE_2', // Phase 2.5로 표현
  },
  {
    currentPhase: 'PHASE_2',
    conditions: { T: 90, RrDecrease: 40 },
    nextPhase: 'PHASE_3', // 부분 적용
  },
  {
    currentPhase: 'PHASE_3',
    conditions: { Is: 0.7, dSStable: true },
    nextPhase: 'PHASE_3', // 전면 적용
  },
];

// K4-K6 (운영/설계) - 빠른 전환
export const K4_K6_TRANSITION_RULES: PhaseTransitionRule[] = [
  {
    currentPhase: 'PHASE_2',
    conditions: { Gr: 1 }, // Gate 1회 경험 OR Afterimage 열람
    nextPhase: 'PHASE_3',
  },
];

// K10 (관측자) - 즉시 전환
export const K10_TRANSITION_RULES: PhaseTransitionRule[] = [
  {
    currentPhase: 'PHASE_3',
    conditions: { T: 0 }, // 최초 진입 = Phase 3
    nextPhase: 'PHASE_3',
  },
  {
    currentPhase: 'PHASE_3',
    conditions: { Gr: 5 }, // Afterimage N회 재생
    nextPhase: 'PHASE_4',
  },
];

export const PHASE_TRANSITION_RULES: Record<KScale, PhaseTransitionRule[]> = {
  K2: K2_TRANSITION_RULES,
  K4: K4_K6_TRANSITION_RULES,
  K6: K4_K6_TRANSITION_RULES,
  K10: K10_TRANSITION_RULES,
};

// ============================================
// 사용자 상태
// ============================================

export interface UserState {
  kScale: KScale;
  currentPhase: Phase;
  metrics: TransitionMetrics;
  // 내부 추적용 (사용자에게 노출 안 함)
  afterimageViews: number;
  structureModifyAttempts: number;
}

// ============================================
// Phase 자동 계산 함수
// "사람이 판단하지 않는다. AUTUS가 관측값만으로 자동 실행한다."
// ============================================

export function calculateCurrentPhase(user: UserState): Phase {
  const rules = PHASE_TRANSITION_RULES[user.kScale];
  const { T, Gr, Rr, Is, dS } = user.metrics;
  
  let targetPhase = user.currentPhase;
  
  for (const rule of rules) {
    if (rule.currentPhase !== user.currentPhase) continue;
    
    const c = rule.conditions;
    let conditionsMet = true;
    
    if (c.T !== undefined && T < c.T) conditionsMet = false;
    if (c.Gr !== undefined && Gr < c.Gr) conditionsMet = false;
    if (c.RrDecrease !== undefined && Rr > (1 - c.RrDecrease / 100)) conditionsMet = false;
    if (c.Is !== undefined && Is < c.Is) conditionsMet = false;
    if (c.dSStable && Math.abs(dS) > 0.1) conditionsMet = false;
    
    if (conditionsMet) {
      targetPhase = rule.nextPhase;
    }
  }
  
  return targetPhase;
}

// ============================================
// 전환 시 절대 하지 않는 것
// ❌ 알림 ❌ 공지 ❌ 설명 ❌ "업데이트 안내"
// ============================================

export function applyPhaseTransition(
  user: UserState,
  newPhase: Phase
): UserState {
  // 조용히 바뀐다 - 사용자는 "아, 요즘 이런 식이네" 정도로만 인식
  return {
    ...user,
    currentPhase: newPhase,
  };
}

// ============================================
// 현재 정책 가져오기
// ============================================

export function getCurrentPolicy(kScale: KScale): UIPolicy {
  return K_SCALE_POLICIES[kScale];
}

// ============================================
// 문구 변환 함수
// ============================================

export function getTerminology(
  key: string,
  terminology: UIPolicy['terminology']
): string {
  const TERMINOLOGY_MAP: Record<string, Record<string, string>> = {
    'gate_locked': {
      human: '접근이 제한되었습니다',
      system: '시스템 조건 미충족',
      physics: '',  // Phase 4: 텍스트 없음
    },
    'execute': {
      human: '실행',
      system: '처리',
      physics: '',
    },
    'blockage': {
      human: '문제 신고',
      system: '이슈 등록',
      physics: '',
    },
    'status_normal': {
      human: '정상 작동 중',
      system: '정상',
      physics: '',
    },
    'status_checking': {
      human: '시스템 점검 중',
      system: '점검',
      physics: '',
    },
    'status_locked': {
      human: '일시적으로 사용 불가',
      system: '제한',
      physics: '',
    },
  };
  
  return TERMINOLOGY_MAP[key]?.[terminology] ?? key;
}

// ============================================
// Gate 저항 설정
// ============================================

export function getGateResistanceConfig(resistance: UIPolicy['gateResistance']) {
  const configs = {
    none: {
      clickDelay: 0,
      dragResistance: 0,
      blur: 0,
      opacity: 1,
    },
    light: {
      clickDelay: 50,
      dragResistance: 0.1,
      blur: 1,
      opacity: 0.95,
    },
    medium: {
      clickDelay: 150,
      dragResistance: 0.3,
      blur: 3,
      opacity: 0.85,
    },
    heavy: {
      clickDelay: 300,
      dragResistance: 0.6,
      blur: 8,
      opacity: 0.7,
    },
  };
  
  return configs[resistance];
}
