// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v2.0 - 570개 업무 DNA 전수 조사
// The Physicist: 업무의 물성을 학습하여 우주에 별을 점화
// ═══════════════════════════════════════════════════════════════════════════════

import { ScaleLevel } from '../physics';

// ═══════════════════════════════════════════════════════════════════════════════
// 업무 DNA 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 업무 DNA (Task DNA)
 * 
 * 각 업무의 본질적 물성을 정의하는 완전한 프로필
 */
export interface TaskDNA {
  /** 고유 식별자 (예: A-001) */
  id: string;
  
  /** 업무명 (한국어) */
  name: string;
  
  /** 업무명 (영어) */
  nameEn: string;
  
  /** 도메인 카테고리 */
  domain: TaskDomain;
  
  /** 서브 카테고리 */
  subDomain: string;
  
  /** K-Scale 고도 (K1~K10) */
  altitude: ScaleLevel;
  
  /** 물리 상수 */
  physics: TaskPhysics;
  
  /** R1 추론 통찰 */
  insight: R1Insight;
  
  /** 간섭 관계 */
  interference: InterferenceMap;
  
  /** 주기성 */
  periodicity: TaskPeriodicity;
  
  /** 자동화 가능성 */
  automation: AutomationProfile;
  
  /** 메타데이터 */
  metadata: TaskMetadata;
}

/**
 * 업무 물리 상수
 */
export interface TaskPhysics {
  /** K (질량/중요도): 1~10 */
  mass: number;
  
  /** ψ (비가역성): 0~10 */
  psi: number;
  
  /** I (간섭 지수): 0~10 */
  interference: number;
  
  /** Ω (엔트로피): 0~1 */
  omega: number;
  
  /** r (성장률): -1~1 */
  growth: number;
  
  /** 임계 시간 (시간) */
  criticalTime: number;
  
  /** 에너지 소비 (상대값) */
  energyConsumption: number;
}

/**
 * R1 추론 통찰
 */
export interface R1Insight {
  /** 핵심 통찰 (한 문장) */
  core: string;
  
  /** 위험 요소 */
  risks: string[];
  
  /** 기회 요소 */
  opportunities: string[];
  
  /** 인과관계 체인 */
  causalChain: string[];
  
  /** 최적 실행 조건 */
  optimalConditions: string[];
  
  /** 실패 시 파급 효과 */
  failureImpact: string;
  
  /** 신뢰도 (0~1) */
  confidence: number;
}

/**
 * 간섭 맵
 */
export interface InterferenceMap {
  /** 강한 양의 간섭 (이 업무가 촉진하는 업무들) */
  amplifies: string[];
  
  /** 강한 음의 간섭 (이 업무가 방해하는 업무들) */
  dampens: string[];
  
  /** 의존 관계 (선행 필수 업무) */
  dependsOn: string[];
  
  /** 피의존 관계 (이 업무에 의존하는 업무들) */
  dependedBy: string[];
  
  /** 상호 배타 (동시 수행 불가) */
  exclusive: string[];
}

/**
 * 업무 주기성
 */
export interface TaskPeriodicity {
  /** 주기 타입 */
  type: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'event_driven';
  
  /** 주기 (일 단위) */
  cycleDays?: number;
  
  /** 피크 시즌 */
  peakSeasons?: string[];
  
  /** 마감 패턴 */
  deadlinePattern?: 'hard' | 'soft' | 'rolling';
}

/**
 * 자동화 프로필
 */
export interface AutomationProfile {
  /** 자동화 가능성 (0~1) */
  potential: number;
  
  /** 현재 자동화 수준 (0~1) */
  current: number;
  
  /** 자동화 가능 부분 */
  automatable: string[];
  
  /** 반드시 인간이 해야 하는 부분 */
  humanRequired: string[];
  
  /** 권장 도구 */
  recommendedTools: string[];
}

/**
 * 업무 메타데이터
 */
export interface TaskMetadata {
  /** 글로벌 표준 참조 */
  globalStandard?: string;
  
  /** 법적 요구사항 */
  legalRequirements?: string[];
  
  /** 인증/자격 요구 */
  certifications?: string[];
  
  /** 평균 소요 시간 */
  avgDuration: string;
  
  /** 관련 KPI */
  kpis: string[];
  
  /** 태그 */
  tags: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12개 도메인 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type TaskDomain = 
  | 'LEGAL'           // 법무
  | 'FINANCE'         // 재무
  | 'HR'              // 인사
  | 'STRATEGY'        // 전략/기획
  | 'OPERATIONS'      // 운영
  | 'SALES'           // 영업
  | 'MARKETING'       // 마케팅
  | 'PRODUCT'         // 제품/서비스
  | 'TECHNOLOGY'      // 기술/IT
  | 'COMPLIANCE'      // 컴플라이언스
  | 'CUSTOMER'        // 고객
  | 'GOVERNANCE';     // 거버넌스

export const DOMAIN_INFO: Record<TaskDomain, { name: string; icon: string; color: string; taskCount: number }> = {
  LEGAL: { name: '법무', icon: '⚖️', color: '#8B5CF6', taskCount: 48 },
  FINANCE: { name: '재무', icon: '💰', color: '#10B981', taskCount: 52 },
  HR: { name: '인사', icon: '👥', color: '#F59E0B', taskCount: 45 },
  STRATEGY: { name: '전략/기획', icon: '🎯', color: '#EF4444', taskCount: 42 },
  OPERATIONS: { name: '운영', icon: '⚙️', color: '#6366F1', taskCount: 55 },
  SALES: { name: '영업', icon: '📈', color: '#EC4899', taskCount: 48 },
  MARKETING: { name: '마케팅', icon: '📣', color: '#14B8A6', taskCount: 45 },
  PRODUCT: { name: '제품/서비스', icon: '📦', color: '#F97316', taskCount: 50 },
  TECHNOLOGY: { name: '기술/IT', icon: '💻', color: '#3B82F6', taskCount: 55 },
  COMPLIANCE: { name: '컴플라이언스', icon: '🛡️', color: '#A855F7', taskCount: 40 },
  CUSTOMER: { name: '고객', icon: '🤝', color: '#22C55E', taskCount: 45 },
  GOVERNANCE: { name: '거버넌스', icon: '🏛️', color: '#FFD700', taskCount: 45 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 위험 구역 분류
// ═══════════════════════════════════════════════════════════════════════════════

export type RiskZone = 
  | 'EVENT_HORIZON'    // 사건의 지평선 (ψ ≥ 9.0)
  | 'HIGH_GRAVITY'     // 고중력 구역 (K ≥ 8.0)
  | 'INTERFERENCE_DENSE' // 간섭 조밀 구역 (I ≥ 8.0)
  | 'HIGH_ENTROPY'     // 고엔트로피 구역 (Ω ≥ 0.7)
  | 'DARK_MATTER'      // 암흑 물질 (데이터 불확실)
  | 'STABLE';          // 안정 구역

export function classifyRiskZone(physics: TaskPhysics, dataQuality: number): RiskZone {
  if (dataQuality < 0.5) return 'DARK_MATTER';
  if (physics.psi >= 9.0) return 'EVENT_HORIZON';
  if (physics.mass >= 8.0) return 'HIGH_GRAVITY';
  if (physics.interference >= 8.0) return 'INTERFERENCE_DENSE';
  if (physics.omega >= 0.7) return 'HIGH_ENTROPY';
  return 'STABLE';
}

export const RISK_ZONE_COLORS: Record<RiskZone, string> = {
  EVENT_HORIZON: '#FF0000',      // 빨강
  HIGH_GRAVITY: '#FF6B00',       // 주황
  INTERFERENCE_DENSE: '#FFD700', // 금색
  HIGH_ENTROPY: '#A855F7',       // 보라
  DARK_MATTER: '#1F1F1F',        // 암흑
  STABLE: '#22C55E',             // 녹색
};
