// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Discovery System - 발견 상수 정의
// ═══════════════════════════════════════════════════════════════════════════════
//
// AUTUS에서 발견할 수 있는 5가지 핵심 요소:
// 1. 사용자 상수 K (User Constant)
// 2. 상호 상수 I, Ω, r (Interaction Constants)
// 3. 사용자 타입 (User Types)
// 4. 업무 타입 (Task Types)
// 5. 네트워크 예측 (Network Prediction)
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 사용자 상수 K (User Constant K)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * K (책임 반경 상수)
 * 
 * 개인이 감당할 수 있는 의사결정의 최대 고도
 * - 타고난 특성 + 경험 + 역할에 의해 결정
 * - 시간이 지남에 따라 천천히 변화
 */
export interface UserConstantK {
  /** 현재 K 값 (1~10) */
  current: number;
  
  /** 잠재 K 값 (성장 가능한 최대치) */
  potential: number;
  
  /** K 결정 요인 */
  factors: {
    /** 타고난 역량 (0~1) */
    innate: number;
    
    /** 경험치 (누적 결정 수) */
    experience: number;
    
    /** 실패 학습 (실패 후 회복 횟수) */
    resilience: number;
    
    /** 책임 이력 (성공적으로 완료한 고도별 결정 수) */
    trackRecord: Record<number, number>;
  };
  
  /** K 성장 속도 (월간 예상 변화량) */
  growthRate: number;
  
  /** 안정 구간 (편안하게 운영 가능한 K 범위) */
  comfortZone: { min: number; max: number };
}

/**
 * K 값 계산 공식
 * K = 0.3×Innate + 0.3×log(Experience) + 0.2×Resilience + 0.2×TrackScore
 */
export function calculateK(factors: UserConstantK['factors']): number {
  const innateScore = factors.innate * 3;  // 0~3
  const expScore = Math.min(3, Math.log10(factors.experience + 1));  // 0~3
  const resScore = Math.min(2, factors.resilience * 0.1);  // 0~2
  
  // 트랙 레코드 점수 (가중 평균)
  let trackScore = 0;
  let trackWeight = 0;
  Object.entries(factors.trackRecord).forEach(([k, count]) => {
    const level = parseInt(k);
    trackScore += level * count;
    trackWeight += count;
  });
  trackScore = trackWeight > 0 ? Math.min(2, (trackScore / trackWeight) / 5) : 0;
  
  return Math.min(10, Math.max(1, Math.round(innateScore + expScore + resScore + trackScore)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 상호 상수 I, Ω, r (Interaction Constants)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * I (상호작용 지수)
 * 
 * 개체 간 상호작용의 강도와 빈도
 */
export interface InteractionConstantI {
  /** 현재 I 값 (0~100) */
  value: number;
  
  /** I 구성 요소 */
  components: {
    /** 연결 수 (직접 연결된 개체 수) */
    connectionCount: number;
    
    /** 상호작용 빈도 (일간 평균) */
    frequency: number;
    
    /** 상호작용 깊이 (평균 대화/거래 복잡도) */
    depth: number;
    
    /** 양방향성 (주고받기 균형, 0~1) */
    reciprocity: number;
  };
  
  /** 트렌드 (증가/감소/안정) */
  trend: 'increasing' | 'decreasing' | 'stable';
  
  /** 이상 징후 */
  anomalies: InteractionAnomaly[];
}

export interface InteractionAnomaly {
  type: 'sudden_drop' | 'sudden_spike' | 'isolation' | 'over_connection';
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
  description: string;
}

/**
 * Ω (엔트로피)
 * 
 * 시스템/개체의 무질서도 및 비가역성
 */
export interface EntropyConstantOmega {
  /** 현재 Ω 값 (0~1) */
  value: number;
  
  /** Ω 구성 요소 */
  components: {
    /** 결정 복잡도 (평균 분기 수) */
    decisionComplexity: number;
    
    /** 되돌림 불가 비율 */
    irreversibilityRatio: number;
    
    /** 정보 손실률 */
    informationLoss: number;
    
    /** 상태 변화 빈도 */
    stateChangeFrequency: number;
  };
  
  /** 엔트로피 구간 */
  zone: 'low' | 'optimal' | 'high' | 'critical';
  
  /** 경고 */
  warnings: EntropyWarning[];
}

export interface EntropyWarning {
  type: 'approaching_irreversibility' | 'high_chaos' | 'decision_fatigue' | 'system_stress';
  threshold: number;
  currentValue: number;
  message: string;
}

/**
 * r (성장률)
 * 
 * 개체의 성장/쇠퇴 속도
 */
export interface GrowthConstantR {
  /** 현재 r 값 (-1 ~ +1) */
  value: number;
  
  /** r 구성 요소 */
  components: {
    /** 가치 증가율 (월간) */
    valueGrowth: number;
    
    /** 역량 증가율 */
    capabilityGrowth: number;
    
    /** 영향력 증가율 */
    influenceGrowth: number;
    
    /** 네트워크 확장률 */
    networkExpansion: number;
  };
  
  /** 성장 단계 */
  phase: 'declining' | 'stagnant' | 'growing' | 'accelerating' | 'explosive';
  
  /** 예상 궤적 (6개월) */
  trajectory: {
    month: number;
    projectedR: number;
    confidence: number;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 사용자 타입 (User Types)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 사용자 타입 정의
 * K, I, Ω, r 조합에 따른 16가지 기본 타입
 */
export type UserType = 
  // 높은 K (리더형)
  | 'ARCHITECT'      // 높은K + 높은I + 낮은Ω + 높은r → 시스템 설계자
  | 'COMMANDER'      // 높은K + 높은I + 높은Ω + 높은r → 위기 지휘관
  | 'STRATEGIST'     // 높은K + 낮은I + 낮은Ω + 높은r → 은둔 전략가
  | 'GUARDIAN'       // 높은K + 낮은I + 낮은Ω + 낮은r → 시스템 수호자
  
  // 중간 K (전문가형)
  | 'CONNECTOR'      // 중간K + 높은I + 낮은Ω + 높은r → 네트워크 허브
  | 'CATALYST'       // 중간K + 높은I + 높은Ω + 높은r → 변화 촉매
  | 'SPECIALIST'     // 중간K + 낮은I + 낮은Ω + 높은r → 깊은 전문가
  | 'MAINTAINER'     // 중간K + 낮은I + 낮은Ω + 낮은r → 안정 유지자
  
  // 낮은 K (실행가형)
  | 'EXECUTOR'       // 낮은K + 높은I + 낮은Ω + 높은r → 빠른 실행자
  | 'ADAPTER'        // 낮은K + 높은I + 높은Ω + 높은r → 유연한 적응자
  | 'CRAFTSMAN'      // 낮은K + 낮은I + 낮은Ω + 높은r → 장인
  | 'SUPPORTER'      // 낮은K + 낮은I + 낮은Ω + 낮은r → 조용한 지원자
  
  // 특수 타입
  | 'PHOENIX'        // 높은Ω에서 회복 중인 타입
  | 'DORMANT'        // 모든 지표 낮음 (잠복기)
  | 'VOLATILE'       // 모든 지표 불안정
  | 'EMERGING';      // 빠르게 K 성장 중

export interface UserTypeProfile {
  type: UserType;
  name: string;
  nameKo: string;
  
  /** K·I·Ω·r 기준 범위 */
  criteria: {
    K: { min: number; max: number };
    I: { min: number; max: number };
    Omega: { min: number; max: number };
    r: { min: number; max: number };
  };
  
  /** 특징 */
  characteristics: string[];
  characteristicsKo: string[];
  
  /** 강점 */
  strengths: string[];
  strengthsKo: string[];
  
  /** 주의점 */
  watchOuts: string[];
  watchOutsKo: string[];
  
  /** 최적 업무 타입 */
  optimalTaskTypes: string[];
  
  /** 시너지 타입 (협업 추천) */
  synergyTypes: UserType[];
  
  /** 충돌 타입 (주의 필요) */
  conflictTypes: UserType[];
}

export const USER_TYPE_PROFILES: Record<UserType, UserTypeProfile> = {
  ARCHITECT: {
    type: 'ARCHITECT',
    name: 'Architect',
    nameKo: '설계자',
    criteria: {
      K: { min: 7, max: 10 },
      I: { min: 60, max: 100 },
      Omega: { min: 0, max: 0.4 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Designs complex systems',
      'Long-term vision',
      'Balances multiple stakeholders',
    ],
    characteristicsKo: [
      '복잡한 시스템을 설계함',
      '장기적 비전 보유',
      '다양한 이해관계자 균형 조절',
    ],
    strengths: ['Strategic thinking', 'System design', 'Risk management'],
    strengthsKo: ['전략적 사고', '시스템 설계', '위험 관리'],
    watchOuts: ['Over-engineering', 'Detachment from execution'],
    watchOutsKo: ['과잉 설계', '실행과의 괴리'],
    optimalTaskTypes: ['SYSTEM_DESIGN', 'STRATEGIC_PLANNING', 'GOVERNANCE'],
    synergyTypes: ['EXECUTOR', 'CONNECTOR', 'SPECIALIST'],
    conflictTypes: ['VOLATILE', 'ADAPTER'],
  },
  COMMANDER: {
    type: 'COMMANDER',
    name: 'Commander',
    nameKo: '지휘관',
    criteria: {
      K: { min: 7, max: 10 },
      I: { min: 60, max: 100 },
      Omega: { min: 0.5, max: 1 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Thrives in crisis',
      'Quick decisive action',
      'High pressure tolerance',
    ],
    characteristicsKo: [
      '위기 상황에서 빛남',
      '빠른 결단력',
      '높은 압박 내성',
    ],
    strengths: ['Crisis management', 'Quick decisions', 'Team mobilization'],
    strengthsKo: ['위기 관리', '빠른 결정', '팀 동원'],
    watchOuts: ['Burnout risk', 'May create unnecessary urgency'],
    watchOutsKo: ['번아웃 위험', '불필요한 긴급성 조성 가능'],
    optimalTaskTypes: ['CRISIS_RESPONSE', 'TURNAROUND', 'EMERGENCY'],
    synergyTypes: ['EXECUTOR', 'ADAPTER', 'SUPPORTER'],
    conflictTypes: ['STRATEGIST', 'MAINTAINER'],
  },
  STRATEGIST: {
    type: 'STRATEGIST',
    name: 'Strategist',
    nameKo: '전략가',
    criteria: {
      K: { min: 7, max: 10 },
      I: { min: 0, max: 40 },
      Omega: { min: 0, max: 0.4 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Deep analytical thinking',
      'Works in isolation',
      'Long-term planning',
    ],
    characteristicsKo: [
      '깊은 분석적 사고',
      '독립적 작업 선호',
      '장기 계획 수립',
    ],
    strengths: ['Deep analysis', 'Pattern recognition', 'Future prediction'],
    strengthsKo: ['심층 분석', '패턴 인식', '미래 예측'],
    watchOuts: ['May miss social dynamics', 'Implementation disconnect'],
    watchOutsKo: ['사회적 역학 놓칠 수 있음', '실행과의 단절'],
    optimalTaskTypes: ['RESEARCH', 'LONG_TERM_PLANNING', 'COMPETITIVE_ANALYSIS'],
    synergyTypes: ['CONNECTOR', 'EXECUTOR', 'CATALYST'],
    conflictTypes: ['COMMANDER', 'ADAPTER'],
  },
  GUARDIAN: {
    type: 'GUARDIAN',
    name: 'Guardian',
    nameKo: '수호자',
    criteria: {
      K: { min: 7, max: 10 },
      I: { min: 0, max: 40 },
      Omega: { min: 0, max: 0.4 },
      r: { min: -0.2, max: 0.3 },
    },
    characteristics: [
      'Protects system integrity',
      'Risk averse',
      'Stability focused',
    ],
    characteristicsKo: [
      '시스템 무결성 보호',
      '위험 회피 성향',
      '안정성 중시',
    ],
    strengths: ['Risk prevention', 'Quality assurance', 'Compliance'],
    strengthsKo: ['위험 예방', '품질 보증', '규정 준수'],
    watchOuts: ['May block innovation', 'Over-cautious'],
    watchOutsKo: ['혁신 차단 가능', '과도한 신중함'],
    optimalTaskTypes: ['COMPLIANCE', 'AUDIT', 'QUALITY_CONTROL'],
    synergyTypes: ['CATALYST', 'ARCHITECT', 'SPECIALIST'],
    conflictTypes: ['VOLATILE', 'PHOENIX'],
  },
  CONNECTOR: {
    type: 'CONNECTOR',
    name: 'Connector',
    nameKo: '연결자',
    criteria: {
      K: { min: 4, max: 7 },
      I: { min: 60, max: 100 },
      Omega: { min: 0, max: 0.4 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Network hub',
      'Information bridge',
      'Relationship builder',
    ],
    characteristicsKo: [
      '네트워크 허브',
      '정보 가교',
      '관계 구축자',
    ],
    strengths: ['Networking', 'Communication', 'Collaboration facilitation'],
    strengthsKo: ['네트워킹', '커뮤니케이션', '협업 촉진'],
    watchOuts: ['May spread thin', 'Information overload'],
    watchOutsKo: ['분산 위험', '정보 과부하'],
    optimalTaskTypes: ['PARTNERSHIP', 'TEAM_COORDINATION', 'SALES'],
    synergyTypes: ['ARCHITECT', 'STRATEGIST', 'SPECIALIST'],
    conflictTypes: ['CRAFTSMAN', 'DORMANT'],
  },
  CATALYST: {
    type: 'CATALYST',
    name: 'Catalyst',
    nameKo: '촉매자',
    criteria: {
      K: { min: 4, max: 7 },
      I: { min: 60, max: 100 },
      Omega: { min: 0.5, max: 1 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Drives change',
      'Disrupts status quo',
      'High energy',
    ],
    characteristicsKo: [
      '변화 주도',
      '현상 타파',
      '높은 에너지',
    ],
    strengths: ['Change management', 'Innovation', 'Energy injection'],
    strengthsKo: ['변화 관리', '혁신', '에너지 주입'],
    watchOuts: ['May destabilize', 'Resistance creation'],
    watchOutsKo: ['불안정화 가능', '저항 유발'],
    optimalTaskTypes: ['TRANSFORMATION', 'INNOVATION', 'CULTURE_CHANGE'],
    synergyTypes: ['GUARDIAN', 'MAINTAINER', 'EXECUTOR'],
    conflictTypes: ['GUARDIAN', 'MAINTAINER'],
  },
  SPECIALIST: {
    type: 'SPECIALIST',
    name: 'Specialist',
    nameKo: '전문가',
    criteria: {
      K: { min: 4, max: 7 },
      I: { min: 0, max: 40 },
      Omega: { min: 0, max: 0.4 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Deep domain expertise',
      'Focused intensity',
      'Quality obsessed',
    ],
    characteristicsKo: [
      '깊은 도메인 전문성',
      '집중적 몰입',
      '품질 집착',
    ],
    strengths: ['Technical excellence', 'Deep knowledge', 'Problem solving'],
    strengthsKo: ['기술적 탁월함', '깊은 지식', '문제 해결'],
    watchOuts: ['Tunnel vision', 'May miss bigger picture'],
    watchOutsKo: ['터널 시야', '큰 그림 놓칠 수 있음'],
    optimalTaskTypes: ['TECHNICAL', 'RESEARCH', 'DEVELOPMENT'],
    synergyTypes: ['ARCHITECT', 'CONNECTOR', 'EXECUTOR'],
    conflictTypes: ['CATALYST', 'VOLATILE'],
  },
  MAINTAINER: {
    type: 'MAINTAINER',
    name: 'Maintainer',
    nameKo: '유지자',
    criteria: {
      K: { min: 4, max: 7 },
      I: { min: 0, max: 40 },
      Omega: { min: 0, max: 0.4 },
      r: { min: -0.2, max: 0.3 },
    },
    characteristics: [
      'Keeps systems running',
      'Reliable and consistent',
      'Process oriented',
    ],
    characteristicsKo: [
      '시스템 가동 유지',
      '신뢰성과 일관성',
      '프로세스 지향',
    ],
    strengths: ['Reliability', 'Consistency', 'Operational excellence'],
    strengthsKo: ['신뢰성', '일관성', '운영 탁월함'],
    watchOuts: ['May resist change', 'Complacency risk'],
    watchOutsKo: ['변화 저항 가능', '안주 위험'],
    optimalTaskTypes: ['OPERATIONS', 'MAINTENANCE', 'SUPPORT'],
    synergyTypes: ['CATALYST', 'ARCHITECT', 'SPECIALIST'],
    conflictTypes: ['CATALYST', 'PHOENIX'],
  },
  EXECUTOR: {
    type: 'EXECUTOR',
    name: 'Executor',
    nameKo: '실행자',
    criteria: {
      K: { min: 1, max: 4 },
      I: { min: 60, max: 100 },
      Omega: { min: 0, max: 0.4 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Gets things done',
      'Action oriented',
      'Fast execution',
    ],
    characteristicsKo: [
      '일을 완수함',
      '행동 지향',
      '빠른 실행',
    ],
    strengths: ['Execution speed', 'Delivery', 'Practical problem solving'],
    strengthsKo: ['실행 속도', '딜리버리', '실용적 문제 해결'],
    watchOuts: ['May skip planning', 'Quality trade-offs'],
    watchOutsKo: ['계획 생략 가능', '품질 타협'],
    optimalTaskTypes: ['IMPLEMENTATION', 'DELIVERY', 'DAILY_OPERATIONS'],
    synergyTypes: ['ARCHITECT', 'COMMANDER', 'SPECIALIST'],
    conflictTypes: ['STRATEGIST', 'GUARDIAN'],
  },
  ADAPTER: {
    type: 'ADAPTER',
    name: 'Adapter',
    nameKo: '적응자',
    criteria: {
      K: { min: 1, max: 4 },
      I: { min: 60, max: 100 },
      Omega: { min: 0.5, max: 1 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Highly flexible',
      'Quick learner',
      'Thrives in chaos',
    ],
    characteristicsKo: [
      '높은 유연성',
      '빠른 학습',
      '혼란 속에서 성장',
    ],
    strengths: ['Adaptability', 'Learning speed', 'Resilience'],
    strengthsKo: ['적응력', '학습 속도', '회복탄력성'],
    watchOuts: ['May lack consistency', 'Direction uncertainty'],
    watchOutsKo: ['일관성 부족 가능', '방향 불확실'],
    optimalTaskTypes: ['STARTUP', 'CRISIS', 'NEW_TERRITORY'],
    synergyTypes: ['COMMANDER', 'CATALYST', 'CONNECTOR'],
    conflictTypes: ['ARCHITECT', 'STRATEGIST'],
  },
  CRAFTSMAN: {
    type: 'CRAFTSMAN',
    name: 'Craftsman',
    nameKo: '장인',
    criteria: {
      K: { min: 1, max: 4 },
      I: { min: 0, max: 40 },
      Omega: { min: 0, max: 0.4 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Mastery through practice',
      'Quiet excellence',
      'Skill focused',
    ],
    characteristicsKo: [
      '연습을 통한 숙달',
      '조용한 탁월함',
      '기술 집중',
    ],
    strengths: ['Skill mastery', 'Quality work', 'Patient improvement'],
    strengthsKo: ['기술 숙달', '품질 높은 작업', '인내심 있는 개선'],
    watchOuts: ['May avoid collaboration', 'Slow adaptation'],
    watchOutsKo: ['협업 회피 가능', '느린 적응'],
    optimalTaskTypes: ['CRAFT', 'PRODUCTION', 'DETAILED_WORK'],
    synergyTypes: ['CONNECTOR', 'EXECUTOR', 'MAINTAINER'],
    conflictTypes: ['CONNECTOR', 'CATALYST'],
  },
  SUPPORTER: {
    type: 'SUPPORTER',
    name: 'Supporter',
    nameKo: '지원자',
    criteria: {
      K: { min: 1, max: 4 },
      I: { min: 0, max: 40 },
      Omega: { min: 0, max: 0.4 },
      r: { min: -0.2, max: 0.3 },
    },
    characteristics: [
      'Enables others',
      'Behind the scenes',
      'Steady and reliable',
    ],
    characteristicsKo: [
      '다른 사람을 가능하게 함',
      '무대 뒤에서 활동',
      '안정적이고 신뢰할 수 있음',
    ],
    strengths: ['Support', 'Reliability', 'Team cohesion'],
    strengthsKo: ['지원', '신뢰성', '팀 결속'],
    watchOuts: ['May be overlooked', 'Undervalued contributions'],
    watchOutsKo: ['간과될 수 있음', '기여 저평가'],
    optimalTaskTypes: ['SUPPORT', 'ASSISTANCE', 'BACKGROUND_OPERATIONS'],
    synergyTypes: ['COMMANDER', 'ARCHITECT', 'SPECIALIST'],
    conflictTypes: ['VOLATILE', 'CATALYST'],
  },
  PHOENIX: {
    type: 'PHOENIX',
    name: 'Phoenix',
    nameKo: '불사조',
    criteria: {
      K: { min: 1, max: 10 },
      I: { min: 0, max: 100 },
      Omega: { min: 0.7, max: 1 },
      r: { min: 0.3, max: 1 },
    },
    characteristics: [
      'Rising from failure',
      'Transformation in progress',
      'High growth potential',
    ],
    characteristicsKo: [
      '실패에서 부활 중',
      '변신 진행 중',
      '높은 성장 잠재력',
    ],
    strengths: ['Resilience', 'Learning from failure', 'Transformation'],
    strengthsKo: ['회복력', '실패에서 학습', '변신'],
    watchOuts: ['Fragile state', 'May need support'],
    watchOutsKo: ['취약한 상태', '지원 필요할 수 있음'],
    optimalTaskTypes: ['RECOVERY', 'REBUILD', 'LEARNING'],
    synergyTypes: ['GUARDIAN', 'SUPPORTER', 'MAINTAINER'],
    conflictTypes: ['COMMANDER', 'CATALYST'],
  },
  DORMANT: {
    type: 'DORMANT',
    name: 'Dormant',
    nameKo: '잠복기',
    criteria: {
      K: { min: 1, max: 4 },
      I: { min: 0, max: 30 },
      Omega: { min: 0, max: 0.3 },
      r: { min: -0.5, max: 0.1 },
    },
    characteristics: [
      'Low activity',
      'Energy conservation',
      'Waiting for trigger',
    ],
    characteristicsKo: [
      '낮은 활동',
      '에너지 보존',
      '트리거 대기 중',
    ],
    strengths: ['Potential energy', 'Observation', 'Reserve capacity'],
    strengthsKo: ['잠재 에너지', '관찰', '예비 용량'],
    watchOuts: ['Disengagement risk', 'May need activation'],
    watchOutsKo: ['이탈 위험', '활성화 필요할 수 있음'],
    optimalTaskTypes: ['OBSERVATION', 'RESEARCH', 'PREPARATION'],
    synergyTypes: ['CATALYST', 'CONNECTOR', 'EXECUTOR'],
    conflictTypes: ['COMMANDER', 'ADAPTER'],
  },
  VOLATILE: {
    type: 'VOLATILE',
    name: 'Volatile',
    nameKo: '변동성',
    criteria: {
      K: { min: 1, max: 10 },
      I: { min: 0, max: 100 },
      Omega: { min: 0.5, max: 1 },
      r: { min: -1, max: 1 },
    },
    characteristics: [
      'Unpredictable patterns',
      'High variance',
      'Needs stabilization',
    ],
    characteristicsKo: [
      '예측 불가 패턴',
      '높은 편차',
      '안정화 필요',
    ],
    strengths: ['Unexpected insights', 'Breaking patterns', 'Creativity'],
    strengthsKo: ['예상치 못한 통찰', '패턴 파괴', '창의성'],
    watchOuts: ['Reliability issues', 'Team disruption'],
    watchOutsKo: ['신뢰성 문제', '팀 혼란'],
    optimalTaskTypes: ['CREATIVE', 'BRAINSTORM', 'EXPLORATION'],
    synergyTypes: ['GUARDIAN', 'MAINTAINER', 'SUPPORTER'],
    conflictTypes: ['ARCHITECT', 'SPECIALIST'],
  },
  EMERGING: {
    type: 'EMERGING',
    name: 'Emerging',
    nameKo: '성장형',
    criteria: {
      K: { min: 1, max: 6 },
      I: { min: 30, max: 70 },
      Omega: { min: 0.2, max: 0.5 },
      r: { min: 0.5, max: 1 },
    },
    characteristics: [
      'Rapid K growth',
      'Learning phase',
      'High potential',
    ],
    characteristicsKo: [
      '빠른 K 성장',
      '학습 단계',
      '높은 잠재력',
    ],
    strengths: ['Growth rate', 'Learning capacity', 'Energy'],
    strengthsKo: ['성장률', '학습 능력', '에너지'],
    watchOuts: ['May overreach', 'Experience gaps'],
    watchOutsKo: ['과욕 가능', '경험 부족'],
    optimalTaskTypes: ['LEARNING', 'STRETCH_ASSIGNMENT', 'MENTORED_WORK'],
    synergyTypes: ['ARCHITECT', 'SPECIALIST', 'GUARDIAN'],
    conflictTypes: ['COMMANDER', 'VOLATILE'],
  },
};

/**
 * K·I·Ω·r 값으로 사용자 타입 판별
 */
export function determineUserType(
  K: number,
  I: number,
  Omega: number,
  r: number
): UserType {
  // 특수 타입 우선 체크
  if (Omega > 0.7 && r > 0.3) return 'PHOENIX';
  if (I < 30 && r < 0.1 && Omega < 0.3) return 'DORMANT';
  if (Math.abs(r) > 0.8 && Omega > 0.5) return 'VOLATILE';
  if (r > 0.5 && K < 6) return 'EMERGING';
  
  // 일반 타입 판별
  const isHighK = K >= 7;
  const isMidK = K >= 4 && K < 7;
  const isHighI = I >= 60;
  const isHighOmega = Omega >= 0.5;
  const isHighR = r >= 0.3;
  
  if (isHighK) {
    if (isHighI) {
      return isHighOmega ? 'COMMANDER' : 'ARCHITECT';
    } else {
      return isHighR ? 'STRATEGIST' : 'GUARDIAN';
    }
  } else if (isMidK) {
    if (isHighI) {
      return isHighOmega ? 'CATALYST' : 'CONNECTOR';
    } else {
      return isHighR ? 'SPECIALIST' : 'MAINTAINER';
    }
  } else {
    if (isHighI) {
      return isHighOmega ? 'ADAPTER' : 'EXECUTOR';
    } else {
      return isHighR ? 'CRAFTSMAN' : 'SUPPORTER';
    }
  }
}
