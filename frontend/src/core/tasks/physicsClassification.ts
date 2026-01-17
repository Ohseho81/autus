// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v2.0 - 물리 법칙 기반 업무 분류
// "의미가 아니라 물성으로 분류한다"
// ═══════════════════════════════════════════════════════════════════════════════

import { ScaleLevel } from '../physics';

// ═══════════════════════════════════════════════════════════════════════════════
// 물리 법칙 기반 업무 분류 (7대 물리 법칙)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 7대 물리 법칙 (업무의 본질적 분류)
 * 
 * 인간적 의미(법무, 재무)가 아닌 물리적 특성으로 분류
 */
export type PhysicsLaw = 
  | 'GRAVITY'      // 중력: 다른 업무를 끌어당기는 힘
  | 'INERTIA'      // 관성: 현상 유지 경향
  | 'ENTROPY'      // 엔트로피: 무질서도 증가
  | 'MOMENTUM'     // 운동량: 속도 × 질량
  | 'WAVE'         // 파동: 주기적 반복
  | 'FRICTION'     // 마찰: 저항력
  | 'RESONANCE';   // 공명: 동조 현상

/**
 * 물리 법칙별 정의
 */
export const PHYSICS_LAW_DEFINITIONS: Record<PhysicsLaw, {
  name: string;
  nameKr: string;
  symbol: string;
  formula: string;
  description: string;
  characteristics: string[];
  color: string;
}> = {
  GRAVITY: {
    name: 'Gravity',
    nameKr: '중력',
    symbol: 'G',
    formula: 'F = G × (m₁ × m₂) / r²',
    description: '다른 업무를 끌어당기는 힘. 질량이 클수록 강함.',
    characteristics: [
      '주변 업무에 영향을 미침',
      '의존 관계를 형성',
      '중심이 되는 업무',
      '방치 시 블랙홀화',
    ],
    color: '#FFD700', // 금색
  },
  INERTIA: {
    name: 'Inertia',
    nameKr: '관성',
    symbol: 'I',
    formula: 'F = m × a (관성 = 변화 저항)',
    description: '현상 유지 경향. 시작하기 어렵고 멈추기도 어려움.',
    characteristics: [
      '시작에 큰 에너지 필요',
      '일단 시작하면 계속됨',
      '방향 전환이 어려움',
      '관성 부채 축적',
    ],
    color: '#6366F1', // 보라
  },
  ENTROPY: {
    name: 'Entropy',
    nameKr: '엔트로피',
    symbol: 'Ω',
    formula: 'ΔS ≥ 0 (무질서도 증가)',
    description: '무질서도 증가 법칙. 방치하면 혼란이 커짐.',
    characteristics: [
      '시간에 따라 복잡도 증가',
      '지속적 관리 필요',
      '비가역적 변화',
      '정보 손실 위험',
    ],
    color: '#EF4444', // 빨강
  },
  MOMENTUM: {
    name: 'Momentum',
    nameKr: '운동량',
    symbol: 'p',
    formula: 'p = m × v (운동량 = 질량 × 속도)',
    description: '일단 움직이면 멈추기 어려운 업무. 속도와 질량의 곱.',
    characteristics: [
      '빠르게 진행됨',
      '멈추면 충격 발생',
      '방향성이 중요',
      '충돌 시 큰 피해',
    ],
    color: '#F97316', // 주황
  },
  WAVE: {
    name: 'Wave',
    nameKr: '파동',
    symbol: 'λ',
    formula: 'f = 1/T (주기적 반복)',
    description: '주기적으로 반복되는 업무. 예측 가능한 리듬.',
    characteristics: [
      '일정한 주기로 반복',
      '예측 가능한 패턴',
      '자동화 적합',
      '진폭 관리 가능',
    ],
    color: '#22C55E', // 녹색
  },
  FRICTION: {
    name: 'Friction',
    nameKr: '마찰',
    symbol: 'μ',
    formula: 'f = μ × N (저항력)',
    description: '진행을 방해하는 저항력. 필수적이나 과하면 해로움.',
    characteristics: [
      '속도를 늦춤',
      '에너지 소모',
      '안정성 제공',
      '과도하면 정체',
    ],
    color: '#A855F7', // 보라
  },
  RESONANCE: {
    name: 'Resonance',
    nameKr: '공명',
    symbol: 'ω₀',
    formula: 'A_max at ω = ω₀ (공명 주파수)',
    description: '다른 업무와 동조하여 증폭되는 현상.',
    characteristics: [
      '시너지 효과 발생',
      '타이밍이 핵심',
      '올바른 조합 시 폭발적 효과',
      '잘못된 조합 시 파괴적',
    ],
    color: '#EC4899', // 핑크
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 물리 기반 업무 DNA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 물리 기반 업무 (PhysicsTask)
 * 
 * 도메인이 아닌 물리 법칙으로 분류된 업무
 */
export interface PhysicsTask {
  /** 업무 ID (숫자만) */
  id: number;
  
  /** 주요 물리 법칙 */
  primaryLaw: PhysicsLaw;
  
  /** 부차 물리 법칙 */
  secondaryLaws: PhysicsLaw[];
  
  /** K-Scale 고도 */
  altitude: ScaleLevel;
  
  /** 물리 상수 */
  constants: PhysicsConstants;
  
  /** 궤도 특성 */
  orbit: OrbitCharacteristics;
  
  /** 에너지 상태 */
  energy: EnergyState;
  
  /** 간섭 패턴 */
  interference: InterferencePattern;
  
  /** 인간 해석 (선택적 - UI용) */
  humanLabel?: string;
}

/**
 * 물리 상수
 */
export interface PhysicsConstants {
  /** m: 질량 (0~10) */
  mass: number;
  
  /** ψ: 비가역성 (0~10) */
  psi: number;
  
  /** I: 간섭 지수 (0~10) */
  interferenceIndex: number;
  
  /** Ω: 엔트로피 (0~1) */
  omega: number;
  
  /** r: 성장률 (-1~1) */
  growthRate: number;
  
  /** v: 속도 (0~10) */
  velocity: number;
  
  /** μ: 마찰 계수 (0~1) */
  friction: number;
  
  /** T: 주기 (시간, 0 = 비주기적) */
  period: number;
}

/**
 * 궤도 특성
 */
export interface OrbitCharacteristics {
  /** 궤도 반경 (고도에서의 거리) */
  radius: number;
  
  /** 이심률 (0 = 원, 1 = 포물선) */
  eccentricity: number;
  
  /** 궤도 경사 (도) */
  inclination: number;
  
  /** 공전 주기 (일) */
  orbitalPeriod: number;
  
  /** 근점 (가장 가까운 점) */
  periapsis: number;
  
  /** 원점 (가장 먼 점) */
  apoapsis: number;
}

/**
 * 에너지 상태
 */
export interface EnergyState {
  /** 운동 에너지 (활동 중) */
  kinetic: number;
  
  /** 위치 에너지 (잠재력) */
  potential: number;
  
  /** 총 에너지 */
  total: number;
  
  /** 에너지 소비율 (시간당) */
  consumptionRate: number;
  
  /** 에너지 임계점 (이 이하면 위험) */
  criticalThreshold: number;
}

/**
 * 간섭 패턴
 */
export interface InterferencePattern {
  /** 보강 간섭 (증폭) */
  constructive: number[];
  
  /** 상쇄 간섭 (감쇄) */
  destructive: number[];
  
  /** 공명 가능 업무 */
  resonantWith: number[];
  
  /** 중력권 내 업무 */
  gravitationallyBound: number[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 물리 법칙 분류 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 물리 상수로부터 주요 물리 법칙 결정
 */
export function determinePrimaryLaw(constants: PhysicsConstants): PhysicsLaw {
  const scores: Record<PhysicsLaw, number> = {
    GRAVITY: constants.mass * 0.4 + constants.interferenceIndex * 0.3,
    INERTIA: constants.mass * 0.3 + (1 - constants.velocity / 10) * 0.4 + constants.psi * 0.3,
    ENTROPY: constants.omega * 10 * 0.5 + constants.psi * 0.3,
    MOMENTUM: constants.mass * 0.4 + constants.velocity * 0.4,
    WAVE: constants.period > 0 ? 8 + (1 / constants.period) : 0,
    FRICTION: constants.friction * 10 * 0.5 + (10 - constants.velocity) * 0.3,
    RESONANCE: constants.interferenceIndex * 0.5,
  };
  
  let maxLaw: PhysicsLaw = 'GRAVITY';
  let maxScore = 0;
  
  for (const [law, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxLaw = law as PhysicsLaw;
    }
  }
  
  return maxLaw;
}

/**
 * 물리 법칙 분포 계산
 */
export function calculateLawDistribution(constants: PhysicsConstants): Record<PhysicsLaw, number> {
  const raw: Record<PhysicsLaw, number> = {
    GRAVITY: constants.mass * 0.4 + constants.interferenceIndex * 0.3,
    INERTIA: constants.mass * 0.3 + (1 - constants.velocity / 10) * 0.4,
    ENTROPY: constants.omega * 10 * 0.5 + constants.psi * 0.2,
    MOMENTUM: constants.mass * 0.4 + constants.velocity * 0.4,
    WAVE: constants.period > 0 ? 5 : 0,
    FRICTION: constants.friction * 10 * 0.5,
    RESONANCE: constants.interferenceIndex * 0.3,
  };
  
  const total = Object.values(raw).reduce((sum, v) => sum + v, 0);
  
  const normalized: Record<PhysicsLaw, number> = {} as Record<PhysicsLaw, number>;
  for (const [law, value] of Object.entries(raw)) {
    normalized[law as PhysicsLaw] = total > 0 ? value / total : 0;
  }
  
  return normalized;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 570개 물리 업무 생성
// ═══════════════════════════════════════════════════════════════════════════════

function createPhysicsTask(
  id: number,
  primaryLaw: PhysicsLaw,
  altitude: ScaleLevel,
  constants: Partial<PhysicsConstants>,
  humanLabel?: string
): PhysicsTask {
  const fullConstants: PhysicsConstants = {
    mass: constants.mass ?? 5,
    psi: constants.psi ?? 5,
    interferenceIndex: constants.interferenceIndex ?? 5,
    omega: constants.omega ?? 0.5,
    growthRate: constants.growthRate ?? 0,
    velocity: constants.velocity ?? 5,
    friction: constants.friction ?? 0.3,
    period: constants.period ?? 0,
  };
  
  const altNum = parseInt(altitude.substring(1));
  
  return {
    id,
    primaryLaw,
    secondaryLaws: [],
    altitude,
    constants: fullConstants,
    orbit: {
      radius: (10 - altNum) * 10,
      eccentricity: fullConstants.omega,
      inclination: fullConstants.interferenceIndex * 9,
      orbitalPeriod: fullConstants.period || 30,
      periapsis: (10 - altNum) * 8,
      apoapsis: (10 - altNum) * 12,
    },
    energy: {
      kinetic: fullConstants.velocity * fullConstants.mass / 2,
      potential: altNum * fullConstants.mass,
      total: fullConstants.velocity * fullConstants.mass / 2 + altNum * fullConstants.mass,
      consumptionRate: fullConstants.friction * fullConstants.velocity,
      criticalThreshold: fullConstants.mass * 2,
    },
    interference: {
      constructive: [],
      destructive: [],
      resonantWith: [],
      gravitationallyBound: [],
    },
    humanLabel,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 570개 업무 (물리 법칙 기반)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 중력 업무 (GRAVITY) - 80개
 * 다른 업무를 끌어당기는 중심 업무
 */
const GRAVITY_TASKS: PhysicsTask[] = [
  createPhysicsTask(1, 'GRAVITY', 'K9', { mass: 9.8, psi: 9.5, interferenceIndex: 8.0, velocity: 3 }, '핵심 기술 특허'),
  createPhysicsTask(2, 'GRAVITY', 'K8', { mass: 9.5, psi: 9.0, interferenceIndex: 7.5, velocity: 4 }, 'M&A'),
  createPhysicsTask(3, 'GRAVITY', 'K8', { mass: 9.0, psi: 8.5, interferenceIndex: 7.0, velocity: 4 }, '사업 전략'),
  createPhysicsTask(4, 'GRAVITY', 'K7', { mass: 8.5, psi: 8.0, interferenceIndex: 6.5, velocity: 5 }, '자본 구조'),
  createPhysicsTask(5, 'GRAVITY', 'K7', { mass: 8.5, psi: 7.5, interferenceIndex: 7.0, velocity: 5 }, '핵심 인재'),
  createPhysicsTask(6, 'GRAVITY', 'K8', { mass: 9.0, psi: 9.0, interferenceIndex: 5.0, velocity: 3 }, '거버넌스'),
  createPhysicsTask(7, 'GRAVITY', 'K6', { mass: 8.0, psi: 7.0, interferenceIndex: 7.5, velocity: 5 }, '제품 로드맵'),
  createPhysicsTask(8, 'GRAVITY', 'K6', { mass: 8.0, psi: 7.5, interferenceIndex: 6.0, velocity: 5 }, '예산'),
  // ... 72개 더 (총 80개)
  ...Array.from({ length: 72 }, (_, i) => 
    createPhysicsTask(9 + i, 'GRAVITY', 
      (['K5', 'K6', 'K7'] as ScaleLevel[])[i % 3],
      { 
        mass: 6.5 + Math.random() * 2.5,
        psi: 5.5 + Math.random() * 3,
        interferenceIndex: 5 + Math.random() * 3,
        velocity: 3 + Math.random() * 4,
      }
    )
  ),
];

/**
 * 관성 업무 (INERTIA) - 85개
 * 시작하기 어렵고 멈추기도 어려운 업무
 */
const INERTIA_TASKS: PhysicsTask[] = [
  createPhysicsTask(81, 'INERTIA', 'K8', { mass: 9.0, psi: 9.5, velocity: 2, friction: 0.7 }, '조직 문화'),
  createPhysicsTask(82, 'INERTIA', 'K7', { mass: 8.5, psi: 8.5, velocity: 2, friction: 0.6 }, '레거시 시스템'),
  createPhysicsTask(83, 'INERTIA', 'K6', { mass: 7.5, psi: 7.5, velocity: 3, friction: 0.5 }, '프로세스 개선'),
  createPhysicsTask(84, 'INERTIA', 'K5', { mass: 7.0, psi: 7.0, velocity: 3, friction: 0.5 }, '습관적 업무'),
  createPhysicsTask(85, 'INERTIA', 'K8', { mass: 9.0, psi: 9.0, velocity: 2, friction: 0.8 }, '규제 대응'),
  // ... 80개 더 (총 85개)
  ...Array.from({ length: 80 }, (_, i) => 
    createPhysicsTask(86 + i, 'INERTIA',
      (['K4', 'K5', 'K6'] as ScaleLevel[])[i % 3],
      {
        mass: 5.5 + Math.random() * 3,
        psi: 5 + Math.random() * 4,
        velocity: 1 + Math.random() * 3,
        friction: 0.4 + Math.random() * 0.4,
      }
    )
  ),
];

/**
 * 엔트로피 업무 (ENTROPY) - 75개
 * 방치하면 무질서가 증가하는 업무
 */
const ENTROPY_TASKS: PhysicsTask[] = [
  createPhysicsTask(166, 'ENTROPY', 'K7', { omega: 0.9, psi: 9.0, mass: 8.0 }, '위기 관리'),
  createPhysicsTask(167, 'ENTROPY', 'K6', { omega: 0.85, psi: 8.0, mass: 7.0 }, '데이터 품질'),
  createPhysicsTask(168, 'ENTROPY', 'K5', { omega: 0.8, psi: 7.0, mass: 6.5 }, '문서 관리'),
  createPhysicsTask(169, 'ENTROPY', 'K6', { omega: 0.85, psi: 8.5, mass: 8.0 }, '보안'),
  createPhysicsTask(170, 'ENTROPY', 'K5', { omega: 0.75, psi: 7.0, mass: 6.0 }, '기술 부채'),
  // ... 70개 더 (총 75개)
  ...Array.from({ length: 70 }, (_, i) =>
    createPhysicsTask(171 + i, 'ENTROPY',
      (['K4', 'K5', 'K6'] as ScaleLevel[])[i % 3],
      {
        omega: 0.6 + Math.random() * 0.35,
        psi: 5 + Math.random() * 4,
        mass: 5 + Math.random() * 3,
      }
    )
  ),
];

/**
 * 운동량 업무 (MOMENTUM) - 80개
 * 빠르게 진행되며 멈추면 충격이 큰 업무
 */
const MOMENTUM_TASKS: PhysicsTask[] = [
  createPhysicsTask(241, 'MOMENTUM', 'K7', { velocity: 9.5, mass: 9.0, psi: 8.5 }, '제품 출시'),
  createPhysicsTask(242, 'MOMENTUM', 'K6', { velocity: 9.0, mass: 8.0, psi: 7.5 }, '캠페인'),
  createPhysicsTask(243, 'MOMENTUM', 'K5', { velocity: 8.5, mass: 7.0, psi: 6.5 }, '영업 활동'),
  createPhysicsTask(244, 'MOMENTUM', 'K6', { velocity: 9.0, mass: 8.5, psi: 8.0 }, '프로젝트 마감'),
  createPhysicsTask(245, 'MOMENTUM', 'K5', { velocity: 8.0, mass: 7.5, psi: 7.0 }, '이벤트'),
  // ... 75개 더 (총 80개)
  ...Array.from({ length: 75 }, (_, i) =>
    createPhysicsTask(246 + i, 'MOMENTUM',
      (['K3', 'K4', 'K5'] as ScaleLevel[])[i % 3],
      {
        velocity: 6 + Math.random() * 4,
        mass: 4 + Math.random() * 4,
        psi: 4 + Math.random() * 4,
      }
    )
  ),
];

/**
 * 파동 업무 (WAVE) - 90개
 * 주기적으로 반복되는 업무
 */
const WAVE_TASKS: PhysicsTask[] = [
  createPhysicsTask(321, 'WAVE', 'K4', { period: 1, mass: 6.0, velocity: 6 }, '일일 정산'),
  createPhysicsTask(322, 'WAVE', 'K4', { period: 7, mass: 6.5, velocity: 5 }, '주간 보고'),
  createPhysicsTask(323, 'WAVE', 'K5', { period: 30, mass: 7.5, velocity: 4 }, '월간 마감'),
  createPhysicsTask(324, 'WAVE', 'K6', { period: 90, mass: 8.0, velocity: 4 }, '분기 결산'),
  createPhysicsTask(325, 'WAVE', 'K7', { period: 365, mass: 8.5, velocity: 3 }, '연간 감사'),
  createPhysicsTask(326, 'WAVE', 'K3', { period: 1, mass: 5.0, velocity: 7 }, '일일 스탠드업'),
  createPhysicsTask(327, 'WAVE', 'K4', { period: 14, mass: 6.0, velocity: 5 }, '스프린트'),
  // ... 83개 더 (총 90개)
  ...Array.from({ length: 83 }, (_, i) =>
    createPhysicsTask(328 + i, 'WAVE',
      (['K2', 'K3', 'K4'] as ScaleLevel[])[i % 3],
      {
        period: [1, 7, 14, 30, 90][i % 5],
        mass: 3 + Math.random() * 4,
        velocity: 4 + Math.random() * 4,
      }
    )
  ),
];

/**
 * 마찰 업무 (FRICTION) - 80개
 * 진행을 방해하는 저항력을 가진 업무
 */
const FRICTION_TASKS: PhysicsTask[] = [
  createPhysicsTask(411, 'FRICTION', 'K5', { friction: 0.9, mass: 7.0, velocity: 2 }, '컴플라이언스'),
  createPhysicsTask(412, 'FRICTION', 'K6', { friction: 0.85, mass: 7.5, velocity: 2 }, '법적 검토'),
  createPhysicsTask(413, 'FRICTION', 'K4', { friction: 0.8, mass: 6.0, velocity: 3 }, '승인 프로세스'),
  createPhysicsTask(414, 'FRICTION', 'K5', { friction: 0.85, mass: 7.0, velocity: 2 }, '감사 대응'),
  createPhysicsTask(415, 'FRICTION', 'K4', { friction: 0.75, mass: 5.5, velocity: 3 }, '품질 검수'),
  // ... 75개 더 (총 80개)
  ...Array.from({ length: 75 }, (_, i) =>
    createPhysicsTask(416 + i, 'FRICTION',
      (['K3', 'K4', 'K5'] as ScaleLevel[])[i % 3],
      {
        friction: 0.5 + Math.random() * 0.4,
        mass: 4 + Math.random() * 3,
        velocity: 1 + Math.random() * 3,
      }
    )
  ),
];

/**
 * 공명 업무 (RESONANCE) - 80개
 * 다른 업무와 동조하여 증폭되는 업무
 */
const RESONANCE_TASKS: PhysicsTask[] = [
  createPhysicsTask(491, 'RESONANCE', 'K5', { interferenceIndex: 9.5, mass: 7.0, velocity: 6 }, '협업 프로젝트'),
  createPhysicsTask(492, 'RESONANCE', 'K4', { interferenceIndex: 9.0, mass: 6.0, velocity: 7 }, '온보딩'),
  createPhysicsTask(493, 'RESONANCE', 'K6', { interferenceIndex: 8.5, mass: 7.5, velocity: 5 }, '전사 이니셔티브'),
  createPhysicsTask(494, 'RESONANCE', 'K5', { interferenceIndex: 9.0, mass: 7.0, velocity: 6 }, '파트너십'),
  createPhysicsTask(495, 'RESONANCE', 'K4', { interferenceIndex: 8.5, mass: 6.5, velocity: 6 }, '교육/훈련'),
  // ... 75개 더 (총 80개)
  ...Array.from({ length: 75 }, (_, i) =>
    createPhysicsTask(496 + i, 'RESONANCE',
      (['K3', 'K4', 'K5'] as ScaleLevel[])[i % 3],
      {
        interferenceIndex: 6 + Math.random() * 4,
        mass: 4 + Math.random() * 4,
        velocity: 4 + Math.random() * 4,
      }
    )
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// 570개 전체 통합
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_PHYSICS_TASKS: PhysicsTask[] = [
  ...GRAVITY_TASKS,     // 80
  ...INERTIA_TASKS,     // 85
  ...ENTROPY_TASKS,     // 75
  ...MOMENTUM_TASKS,    // 80
  ...WAVE_TASKS,        // 90
  ...FRICTION_TASKS,    // 80
  ...RESONANCE_TASKS,   // 80
]; // = 570

// 법칙별 그룹화
export const TASKS_BY_LAW: Record<PhysicsLaw, PhysicsTask[]> = {
  GRAVITY: GRAVITY_TASKS,
  INERTIA: INERTIA_TASKS,
  ENTROPY: ENTROPY_TASKS,
  MOMENTUM: MOMENTUM_TASKS,
  WAVE: WAVE_TASKS,
  FRICTION: FRICTION_TASKS,
  RESONANCE: RESONANCE_TASKS,
};

// 통계
export const PHYSICS_STATISTICS = {
  totalCount: ALL_PHYSICS_TASKS.length,
  byLaw: {
    GRAVITY: GRAVITY_TASKS.length,
    INERTIA: INERTIA_TASKS.length,
    ENTROPY: ENTROPY_TASKS.length,
    MOMENTUM: MOMENTUM_TASKS.length,
    WAVE: WAVE_TASKS.length,
    FRICTION: FRICTION_TASKS.length,
    RESONANCE: RESONANCE_TASKS.length,
  },
  avgMass: ALL_PHYSICS_TASKS.reduce((acc, t) => acc + t.constants.mass, 0) / ALL_PHYSICS_TASKS.length,
  avgVelocity: ALL_PHYSICS_TASKS.reduce((acc, t) => acc + t.constants.velocity, 0) / ALL_PHYSICS_TASKS.length,
  highGravityCount: GRAVITY_TASKS.filter(t => t.constants.mass >= 8.0).length,
  highEntropyCount: ENTROPY_TASKS.filter(t => t.constants.omega >= 0.8).length,
};

console.log(`[AUTUS] 570개 물리 기반 업무 로드 완료`);
console.log(`[AUTUS] 분포: G=${GRAVITY_TASKS.length} I=${INERTIA_TASKS.length} Ω=${ENTROPY_TASKS.length} p=${MOMENTUM_TASKS.length} λ=${WAVE_TASKS.length} μ=${FRICTION_TASKS.length} ω=${RESONANCE_TASKS.length}`);
