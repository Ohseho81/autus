/**
 * AUTUS V Formula Engine
 * 
 * V 공식: V = f(M, T, s, t)
 * - M: Money (수익 영향) - 30%
 * - T: Time (시간 투자) - 25%
 * - s: Satisfaction (만족도) - 25%
 * - t: Character (인성/성장) - 20%
 */

// ============================================
// Types
// ============================================

export interface VDelta {
  m: number;  // 원 단위 (예: 350000)
  t: number;  // 분 단위 (예: 60)
  s: number;  // -100 ~ 100 (만족도 변화)
  t_char: number;  // 0 ~ 100 (인성/성장)
}

export interface VScore {
  total: number;       // 0 ~ 100
  level: VLevel;
  components: {
    m_contribution: number;
    t_contribution: number;
    s_contribution: number;
    t_char_contribution: number;
  };
  spiralGrowth: number;  // 나선형 성장률
}

export type VLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface EmotionalMessage {
  title: string;
  message: string;
  emoji: string;
  color: string;
  encouragement: string;
}

// ============================================
// Constants
// ============================================

// V 공식 가중치
const V_WEIGHTS = {
  M: 0.30,   // Money: 30%
  T: 0.25,   // Time: 25%
  S: 0.25,   // Satisfaction: 25%
  T_CHAR: 0.20,  // Character: 20%
};

// 레벨 임계값
const LEVEL_THRESHOLDS: Record<VLevel, { min: number; max: number }> = {
  bronze: { min: 0, max: 30 },
  silver: { min: 30, max: 50 },
  gold: { min: 50, max: 70 },
  platinum: { min: 70, max: 90 },
  diamond: { min: 90, max: 100 },
};

// 정규화 상수
const NORMALIZATION = {
  M_BASE: 10000000,  // 1000만원 = 100점
  T_BASE: 1000,      // 1000분 (약 16시간) = 100점
  S_BASE: 100,       // -100 ~ 100 범위
  T_CHAR_BASE: 100,  // 0 ~ 100 범위
};

// ============================================
// Core Functions
// ============================================

/**
 * 델타값으로부터 V 점수 계산
 */
export function calculateVFromLedgerDeltas(
  mDelta: number,
  tDelta: number,
  sDelta: number,
  tCharDelta: number
): number {
  // 정규화 (0 ~ 100 범위로)
  const mNorm = Math.min(Math.max((mDelta / NORMALIZATION.M_BASE) * 100, 0), 100);
  const tNorm = Math.min(Math.max((tDelta / NORMALIZATION.T_BASE) * 100, 0), 100);
  const sNorm = Math.min(Math.max(((sDelta + 100) / 200) * 100, 0), 100);
  const tCharNorm = Math.min(Math.max(tCharDelta, 0), 100);

  // 가중합
  const v = (
    mNorm * V_WEIGHTS.M +
    tNorm * V_WEIGHTS.T +
    sNorm * V_WEIGHTS.S +
    tCharNorm * V_WEIGHTS.T_CHAR
  );

  return Math.round(v * 10) / 10;
}

/**
 * V 점수로부터 상세 정보 계산
 */
export function calculateVScore(delta: VDelta): VScore {
  const mContribution = Math.min(Math.max((delta.m / NORMALIZATION.M_BASE) * 100, 0), 100) * V_WEIGHTS.M;
  const tContribution = Math.min(Math.max((delta.t / NORMALIZATION.T_BASE) * 100, 0), 100) * V_WEIGHTS.T;
  const sContribution = Math.min(Math.max(((delta.s + 100) / 200) * 100, 0), 100) * V_WEIGHTS.S;
  const tCharContribution = Math.min(Math.max(delta.t_char, 0), 100) * V_WEIGHTS.T_CHAR;

  const total = mContribution + tContribution + sContribution + tCharContribution;
  const level = getVLevel(total);

  // 나선형 성장률 계산 (시간이 지날수록 같은 행동도 더 큰 성장)
  const spiralGrowth = calculateSpiralGrowth(total, delta.t);

  return {
    total: Math.round(total * 10) / 10,
    level,
    components: {
      m_contribution: Math.round(mContribution * 10) / 10,
      t_contribution: Math.round(tContribution * 10) / 10,
      s_contribution: Math.round(sContribution * 10) / 10,
      t_char_contribution: Math.round(tCharContribution * 10) / 10,
    },
    spiralGrowth: Math.round(spiralGrowth * 100) / 100,
  };
}

/**
 * V 레벨 결정
 */
export function getVLevel(score: number): VLevel {
  if (score >= LEVEL_THRESHOLDS.diamond.min) return 'diamond';
  if (score >= LEVEL_THRESHOLDS.platinum.min) return 'platinum';
  if (score >= LEVEL_THRESHOLDS.gold.min) return 'gold';
  if (score >= LEVEL_THRESHOLDS.silver.min) return 'silver';
  return 'bronze';
}

/**
 * 나선형 성장 계산
 * - 기본 V 점수에 시간 투자에 따른 복리 효과 적용
 */
export function calculateSpiralGrowth(baseV: number, timeInvested: number): number {
  const timeMultiplier = 1 + (timeInvested / NORMALIZATION.T_BASE) * 0.1;
  return baseV * timeMultiplier;
}

// ============================================
// Emotional Message Generator
// ============================================

/**
 * V 점수에 따른 감성 메시지 생성
 */
export function generateEmotionalMessage(score: number, role: string, recentAction?: string): EmotionalMessage {
  const level = getVLevel(score);
  
  const messages: Record<VLevel, EmotionalMessage> = {
    bronze: {
      title: '여정의 시작',
      message: '당신의 첫 걸음이 기록되었습니다. 모든 위대한 성취는 작은 시작에서 비롯됩니다.',
      emoji: '🌱',
      color: 'text-amber-600',
      encouragement: '지금 시작한 당신, 이미 절반은 성공입니다.',
    },
    silver: {
      title: '성장의 조짐',
      message: '당신의 행동들이 변화를 만들고 있습니다. 학생들과 조직이 당신의 영향을 느끼고 있습니다.',
      emoji: '✨',
      color: 'text-slate-300',
      encouragement: '꾸준함이 당신의 가장 큰 무기입니다.',
    },
    gold: {
      title: '빛나는 성과',
      message: '당신의 결정과 행동이 조직에 실질적인 변화를 가져오고 있습니다.',
      emoji: '🌟',
      color: 'text-yellow-400',
      encouragement: '당신은 이미 많은 것을 이뤘습니다. 더 높이 날아오르세요.',
    },
    platinum: {
      title: '탁월한 영향력',
      message: '당신은 조직의 핵심 가치 창출자입니다. 당신의 영향력이 곳곳에서 느껴집니다.',
      emoji: '💎',
      color: 'text-cyan-300',
      encouragement: '당신의 존재가 이 조직의 가장 큰 자산입니다.',
    },
    diamond: {
      title: '전설적인 존재',
      message: '당신은 이 조직의 역사를 쓰고 있습니다. 당신의 모든 행동이 전설이 됩니다.',
      emoji: '👑',
      color: 'text-purple-400',
      encouragement: '당신의 이름은 영원히 기억될 것입니다.',
    },
  };

  // 역할별 맞춤 메시지 추가
  const roleMessages: Record<string, string> = {
    owner: '전략적 결정이 조직 전체를 움직이고 있습니다.',
    principal: '당신의 개입이 학생들의 미래를 바꾸고 있습니다.',
    teacher: '당신의 피드백이 학생들을 더 밝게 만들고 있습니다.',
    admin: '당신의 꼼꼼한 관리가 모든 것을 가능하게 합니다.',
    parent: '당신의 관심이 아이의 성장을 이끕니다.',
    student: '당신의 노력이 빛나는 미래를 만들고 있습니다.',
  };

  const baseMessage = messages[level];
  
  return {
    ...baseMessage,
    message: `${baseMessage.message} ${roleMessages[role] || ''}`,
  };
}

// ============================================
// RetroPGF Calculation
// ============================================

/**
 * RetroPGF 보상 계산
 * - V 점수와 행동 빈도에 따른 토큰 배분
 */
export function calculateRetroPGF(
  vScore: number,
  totalActions: number,
  periodDays: number = 30
): number {
  // 기본 보상: V 점수 × 행동 횟수 / 기간
  const baseReward = (vScore * totalActions) / periodDays;
  
  // 레벨 보너스
  const level = getVLevel(vScore);
  const levelMultipliers: Record<VLevel, number> = {
    bronze: 1.0,
    silver: 1.2,
    gold: 1.5,
    platinum: 2.0,
    diamond: 3.0,
  };
  
  return Math.round(baseReward * levelMultipliers[level] * 10) / 10;
}

// ============================================
// Level Visual Properties
// ============================================

export const LEVEL_VISUALS: Record<VLevel, {
  gradient: string;
  glow: string;
  badge: string;
  progressColor: string;
}> = {
  bronze: {
    gradient: 'from-amber-700 to-amber-900',
    glow: 'shadow-amber-500/20',
    badge: '🥉',
    progressColor: 'bg-amber-600',
  },
  silver: {
    gradient: 'from-slate-300 to-slate-500',
    glow: 'shadow-slate-400/30',
    badge: '🥈',
    progressColor: 'bg-slate-400',
  },
  gold: {
    gradient: 'from-yellow-400 to-amber-500',
    glow: 'shadow-yellow-500/40',
    badge: '🥇',
    progressColor: 'bg-yellow-500',
  },
  platinum: {
    gradient: 'from-cyan-300 to-blue-500',
    glow: 'shadow-cyan-400/50',
    badge: '💎',
    progressColor: 'bg-cyan-400',
  },
  diamond: {
    gradient: 'from-purple-400 via-pink-500 to-red-500',
    glow: 'shadow-purple-500/60',
    badge: '👑',
    progressColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * V 점수 변화량 포맷팅
 */
export function formatVChange(change: number): string {
  if (change > 0) return `+${change.toFixed(1)}`;
  if (change < 0) return `${change.toFixed(1)}`;
  return '0';
}

/**
 * 레벨까지 남은 점수 계산
 */
export function getProgressToNextLevel(score: number): { 
  currentLevel: VLevel;
  nextLevel: VLevel | null;
  progress: number;
  remaining: number;
} {
  const currentLevel = getVLevel(score);
  const levels: VLevel[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const currentIndex = levels.indexOf(currentLevel);
  
  if (currentIndex === levels.length - 1) {
    return {
      currentLevel,
      nextLevel: null,
      progress: 100,
      remaining: 0,
    };
  }
  
  const nextLevel = levels[currentIndex + 1];
  const currentMin = LEVEL_THRESHOLDS[currentLevel].min;
  const nextMin = LEVEL_THRESHOLDS[nextLevel].min;
  
  const progress = ((score - currentMin) / (nextMin - currentMin)) * 100;
  const remaining = nextMin - score;
  
  return {
    currentLevel,
    nextLevel,
    progress: Math.min(Math.max(progress, 0), 100),
    remaining: Math.max(remaining, 0),
  };
}
