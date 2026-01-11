/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Bayesian Prior System
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Prior + Evidence = Posterior
 * 일반 법칙 + 개인 데이터 = 너의 라플라스
 * 
 * Step 1: 세상의 데이터로 Prior 생성 (회계, 경영학, 벤치마크)
 * Step 2: 개인 데이터로 Posterior 조정
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type EvidenceSource = 
  | 'ACCOUNTING'    // 회계 원칙 (GAAP, IFRS)
  | 'RESEARCH'      // 경영학 연구
  | 'BENCHMARK'     // 산업 벤치마크
  | 'PHYSICS'       // 물리/수학 법칙
  | 'EMPIRICAL'     // 경험적 관찰
  | 'ESTIMATED';    // 추정

export interface PriorCoefficient {
  value: number;              // 계수 값
  confidence: ConfidenceLevel;
  source: EvidenceSource;
  rationale: string;          // 근거 설명
  range: [number, number];    // 불확실성 범위
}

export interface PriorMatrix {
  nodes: string[];            // 노드 ID 배열
  coefficients: Record<string, Record<string, PriorCoefficient | null>>;
  metadata: {
    domain: string;
    version: string;
    lastUpdated: Date;
    totalConnections: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 핵심 10개 노드 (학원 도메인)
// ═══════════════════════════════════════════════════════════════════════════════

export const CORE_NODES = [
  'n01', // 현금
  'n05', // 수입
  'n06', // 지출
  'n09', // 고객수
  'n17', // 수입흐름
  'n33', // 충성도
  'n34', // 강사근속
  'n41', // 수입가속
  'n57', // CAC
  'n70', // 강사의존
] as const;

export type CoreNode = typeof CORE_NODES[number];

export const CORE_NODE_NAMES: Record<CoreNode, string> = {
  n01: '현금',
  n05: '수입',
  n06: '지출',
  n09: '고객수',
  n17: '수입흐름',
  n33: '충성도',
  n34: '강사근속',
  n41: '수입가속',
  n57: 'CAC',
  n70: '강사의존',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 10×10 Prior 행렬 정의
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A[from][to] = from 노드가 to 노드에 미치는 영향 계수
 * 
 * 해석:
 * - 양수: 정의 관계 (from ↑ → to ↑)
 * - 음수: 역의 관계 (from ↑ → to ↓)
 * - 0: 직접적 관계 없음
 * - 자기자신: 관성 (다음 기간 유지율)
 */
export const ACADEMY_PRIOR_10x10: Record<CoreNode, Record<CoreNode, PriorCoefficient | null>> = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n01 (현금) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n01: {
    n01: {
      value: 1.0,
      confidence: 'HIGH',
      source: 'ACCOUNTING',
      rationale: '현금 자체 보존 (기초잔액)',
      range: [1.0, 1.0],
    },
    n05: null,  // 현금 → 수입: 직접 관계 없음
    n06: null,  // 현금 → 지출: 직접 관계 없음
    n09: null,
    n17: null,
    n33: null,
    n34: null,
    n41: null,
    n57: null,
    n70: null,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n05 (수입) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n05: {
    n01: {
      value: 0.9,
      confidence: 'HIGH',
      source: 'ACCOUNTING',
      rationale: '수입의 90%가 현금화 (미수금 10% 제외)',
      range: [0.85, 0.95],
    },
    n05: {
      value: 0.7,
      confidence: 'MEDIUM',
      source: 'EMPIRICAL',
      rationale: '수입 관성 - 작년 기준 70% 유지 경향',
      range: [0.6, 0.8],
    },
    n06: null,  // 수입 → 지출: 직접 X (간접적 있음)
    n09: null,
    n17: {
      value: 1.0,
      confidence: 'HIGH',
      source: 'ACCOUNTING',
      rationale: '수입흐름 = 현재수입 / 과거수입',
      range: [1.0, 1.0],
    },
    n33: null,
    n34: null,
    n41: null,
    n57: null,
    n70: null,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n06 (지출) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n06: {
    n01: {
      value: -1.0,
      confidence: 'HIGH',
      source: 'ACCOUNTING',
      rationale: '지출은 현금을 감소시킴 (회계 항등식)',
      range: [-1.0, -1.0],
    },
    n05: null,
    n06: {
      value: 0.8,
      confidence: 'MEDIUM',
      source: 'EMPIRICAL',
      rationale: '지출 관성 - 고정비 비중 높아 80% 유지',
      range: [0.7, 0.9],
    },
    n09: null,
    n17: null,
    n33: null,
    n34: null,
    n41: null,
    n57: {
      value: 0.3,
      confidence: 'LOW',
      source: 'ESTIMATED',
      rationale: '마케팅 지출 일부가 CAC에 반영',
      range: [0.1, 0.5],
    },
    n70: null,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n09 (고객수) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n09: {
    n01: null,
    n05: {
      value: 0.8,
      confidence: 'HIGH',
      source: 'RESEARCH',
      rationale: '고객 1% 증가 → 수입 0.8% 증가 (객단가 고려)',
      range: [0.7, 0.9],
    },
    n06: {
      value: 0.1,
      confidence: 'MEDIUM',
      source: 'EMPIRICAL',
      rationale: '학생 증가 시 변동비 소폭 증가',
      range: [0.05, 0.15],
    },
    n09: {
      value: 0.9,
      confidence: 'MEDIUM',
      source: 'BENCHMARK',
      rationale: '학원 평균 월간 유지율 90% (연 이탈 15-25%)',
      range: [0.85, 0.95],
    },
    n17: null,
    n33: null,
    n34: null,
    n41: null,
    n57: null,
    n70: null,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n17 (수입흐름/성장률) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n17: {
    n01: null,
    n05: null,
    n06: null,
    n09: {
      value: 0.3,
      confidence: 'LOW',
      source: 'ESTIMATED',
      rationale: '성장하는 학원에 학생이 몰림',
      range: [0.1, 0.5],
    },
    n17: {
      value: 0.6,
      confidence: 'MEDIUM',
      source: 'PHYSICS',
      rationale: '성장률 관성 (평균회귀 40%)',
      range: [0.4, 0.8],
    },
    n33: null,
    n34: null,
    n41: {
      value: 0.8,
      confidence: 'HIGH',
      source: 'PHYSICS',
      rationale: '흐름의 변화가 가속도 (미분 관계)',
      range: [0.7, 0.9],
    },
    n57: null,
    n70: null,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n33 (충성도) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n33: {
    n01: null,
    n05: {
      value: 0.4,
      confidence: 'MEDIUM',
      source: 'RESEARCH',
      rationale: '충성 고객이 객단가 높고 추가 구매',
      range: [0.2, 0.6],
    },
    n06: null,
    n09: {
      value: 0.5,
      confidence: 'HIGH',
      source: 'RESEARCH',
      rationale: '충성도 10% 하락 → 고객 5% 이탈 (LTV 연구)',
      range: [0.4, 0.6],
    },
    n17: {
      value: 0.3,
      confidence: 'MEDIUM',
      source: 'EMPIRICAL',
      rationale: '충성 고객은 안정적 매출 유지',
      range: [0.2, 0.4],
    },
    n33: {
      value: 0.85,
      confidence: 'MEDIUM',
      source: 'BENCHMARK',
      rationale: '충성도 관성 - 자연 감소 15%/년 (월 1.25%)',
      range: [0.8, 0.9],
    },
    n34: null,
    n41: {
      value: 0.2,
      confidence: 'LOW',
      source: 'ESTIMATED',
      rationale: '충성 고객이 추천으로 성장 가속',
      range: [0.1, 0.3],
    },
    n57: null,
    n70: null,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n34 (강사 근속률) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n34: {
    n01: null,
    n05: {
      value: 0.1,
      confidence: 'LOW',
      source: 'EMPIRICAL',
      rationale: '안정적 강사진 → 소폭 매출 상승',
      range: [0.05, 0.15],
    },
    n06: null,
    n09: null,
    n17: null,
    n33: {
      value: 0.3,
      confidence: 'MEDIUM',
      source: 'RESEARCH',
      rationale: '강사 이직 시 학생 충성도 하락',
      range: [0.2, 0.4],
    },
    n34: {
      value: 0.9,
      confidence: 'MEDIUM',
      source: 'BENCHMARK',
      rationale: '강사 근속 관성 (연 이직률 20-30%)',
      range: [0.85, 0.95],
    },
    n41: null,
    n57: null,
    n70: {
      value: -0.2,
      confidence: 'MEDIUM',
      source: 'EMPIRICAL',
      rationale: '근속률 높으면 의존도 분산 (여러 강사 성장)',
      range: [-0.3, -0.1],
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n41 (수입 가속도) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n41: {
    n01: null,
    n05: null,
    n06: null,
    n09: {
      value: 0.2,
      confidence: 'LOW',
      source: 'ESTIMATED',
      rationale: '성장 가속 중인 학원에 학생 유입',
      range: [0.1, 0.3],
    },
    n17: null,
    n33: null,
    n34: null,
    n41: {
      value: 0.5,
      confidence: 'MEDIUM',
      source: 'PHYSICS',
      rationale: '가속도 관성 (급격한 변화 후 안정화)',
      range: [0.3, 0.7],
    },
    n57: null,
    n70: null,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n57 (CAC) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n57: {
    n01: null,
    n05: null,
    n06: {
      value: 0.3,
      confidence: 'MEDIUM',
      source: 'ACCOUNTING',
      rationale: 'CAC가 마케팅 지출에 반영',
      range: [0.2, 0.4],
    },
    n09: {
      value: -0.1,
      confidence: 'LOW',
      source: 'RESEARCH',
      rationale: 'CAC 상승 → 마케팅 효율 저하 → 신규 감소',
      range: [-0.2, -0.05],
    },
    n17: null,
    n33: null,
    n34: null,
    n41: null,
    n57: {
      value: 0.7,
      confidence: 'MEDIUM',
      source: 'BENCHMARK',
      rationale: 'CAC 관성 (시장 환경에 따라 변동)',
      range: [0.5, 0.9],
    },
    n70: null,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // n70 (강사 의존도) → 다른 노드
  // ═══════════════════════════════════════════════════════════════════════════
  n70: {
    n01: null,
    n05: null,
    n06: null,
    n09: null,
    n17: null,
    n33: {
      value: -0.3,
      confidence: 'MEDIUM',
      source: 'EMPIRICAL',
      rationale: '의존도 10% 상승 → 충성도 3% 하락 (위험 인식)',
      range: [-0.4, -0.2],
    },
    n34: null,
    n41: null,
    n57: null,
    n70: {
      value: 0.95,
      confidence: 'HIGH',
      source: 'EMPIRICAL',
      rationale: '의존도는 의도적 분산 없으면 유지/증가',
      range: [0.9, 1.0],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 행렬 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prior 행렬을 숫자 배열로 변환
 */
export function priorToMatrix(prior: typeof ACADEMY_PRIOR_10x10): number[][] {
  return CORE_NODES.map(from => 
    CORE_NODES.map(to => prior[from][to]?.value ?? 0)
  );
}

/**
 * 행렬의 연결 수 계산
 */
export function countConnections(prior: typeof ACADEMY_PRIOR_10x10): number {
  let count = 0;
  for (const from of CORE_NODES) {
    for (const to of CORE_NODES) {
      if (prior[from][to] !== null) count++;
    }
  }
  return count;
}

/**
 * 특정 신뢰도 이상의 계수만 추출
 */
export function filterByConfidence(
  prior: typeof ACADEMY_PRIOR_10x10,
  minConfidence: ConfidenceLevel
): Partial<typeof ACADEMY_PRIOR_10x10> {
  const confidenceOrder: Record<ConfidenceLevel, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  
  const result: any = {};
  for (const from of CORE_NODES) {
    result[from] = {};
    for (const to of CORE_NODES) {
      const coef = prior[from][to];
      if (coef && confidenceOrder[coef.confidence] >= confidenceOrder[minConfidence]) {
        result[from][to] = coef;
      } else {
        result[from][to] = null;
      }
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 산업 벤치마크
// ═══════════════════════════════════════════════════════════════════════════════

export const ACADEMY_BENCHMARKS = {
  // 고객 관련
  churnRate: {
    annual: { min: 0.15, max: 0.25, avg: 0.20 },       // 연 이탈률 15-25%
    monthly: { min: 0.012, max: 0.021, avg: 0.017 },   // 월 이탈률
  },
  retention: {
    reenrollment: { min: 0.70, max: 0.85, avg: 0.78 }, // 재등록률
  },
  acquisition: {
    cac: { min: 30000, max: 100000, avg: 50000 },      // CAC
    referralRate: { min: 0.20, max: 0.50, avg: 0.35 }, // 추천율
  },
  
  // 인력 관련
  teacherTurnover: {
    annual: { min: 0.20, max: 0.30, avg: 0.25 },       // 강사 연 이직률
    monthly: { min: 0.017, max: 0.025, avg: 0.021 },
  },
  
  // 재무 관련
  margins: {
    gross: { min: 0.40, max: 0.60, avg: 0.50 },        // 매출총이익률
    operating: { min: 0.10, max: 0.25, avg: 0.18 },    // 영업이익률
  },
  fixedCostRatio: { min: 0.60, max: 0.75, avg: 0.65 }, // 고정비 비율
  
  // 성장 관련
  growth: {
    stable: { min: 0.00, max: 0.05, avg: 0.03 },       // 안정기 성장률
    growth: { min: 0.05, max: 0.20, avg: 0.10 },       // 성장기 성장률
    decline: { min: -0.15, max: 0.00, avg: -0.05 },    // 쇠퇴기
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Prior 메타데이터
// ═══════════════════════════════════════════════════════════════════════════════

export const ACADEMY_PRIOR_METADATA = {
  domain: 'academy',
  version: '1.0.0',
  lastUpdated: new Date('2025-01-09'),
  totalConnections: countConnections(ACADEMY_PRIOR_10x10),
  sources: {
    accounting: 4,    // 회계 원칙 기반
    research: 5,      // 경영학 연구 기반
    benchmark: 4,     // 산업 벤치마크 기반
    physics: 3,       // 물리 법칙 유추
    empirical: 6,     // 경험적 관찰
    estimated: 5,     // 추정
  },
  confidence: {
    high: 8,
    medium: 13,
    low: 6,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 행렬 시각화 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

export function printPriorMatrix(): string {
  const header = ['From↓ To→', ...CORE_NODES.map(n => n.slice(1))].join('\t');
  const rows = CORE_NODES.map(from => {
    const values = CORE_NODES.map(to => {
      const coef = ACADEMY_PRIOR_10x10[from][to];
      if (coef === null) return '·';
      return coef.value.toFixed(2);
    });
    return [from, ...values].join('\t');
  });
  
  return [header, ...rows].join('\n');
}

console.log('📊 Bayesian Prior Matrix Loaded');
console.log(`  - Domain: Academy`);
console.log(`  - Nodes: ${CORE_NODES.length}`);
console.log(`  - Connections: ${ACADEMY_PRIOR_METADATA.totalConnections}`);
console.log(`  - High Confidence: ${ACADEMY_PRIOR_METADATA.confidence.high}`);
