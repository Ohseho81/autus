/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Type Definitions
 * 
 * V = P × Λ × e^(σt)
 * "META가 연결을 팔았다면, AUTUS는 시간을 증식한다"
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// 노드 타입
// ═══════════════════════════════════════════════════════════════════════════

export type NodeType = 'staff' | 'student' | 'parent';

export interface NodeLambda {
  id?: string;
  org_id: string;
  node_id: string;
  node_type: NodeType;
  name?: string;
  
  // λ 값
  lambda: number;          // 0.5 ~ 10.0
  lambda_base: number;     // 역할 기반 기본값
  
  // λ 구성요소
  components: {
    replaceability: number;  // R: 대체 가능성 (0~1)
    influence: number;       // I: 영향력 (0~1)
    expertise: number;       // E: 전문성 (0~1)
    network_position: number; // N: 네트워크 위치 (0~1)
  };
  
  role: string;            // owner, teacher, student 등
  calculated_at?: string;
  version?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 관계 타입
// ═══════════════════════════════════════════════════════════════════════════

export type MeasurementType = 'estimated' | 'measured' | 'ai_predicted';

export interface RelationSigma {
  id?: string;
  org_id: string;
  
  // 관계 당사자
  node_a_id: string;
  node_a_type: NodeType;
  node_b_id: string;
  node_b_type: NodeType;
  
  // σ 값
  sigma: number;           // -1.0 ~ +1.0
  
  // σ 구성요소
  components: {
    compatibility: number;   // C: 스타일 호환 (-1~+1)
    goal_alignment: number;  // G: 목표 일치 (-1~+1)
    value_match: number;     // V: 가치관 일치 (-1~+1)
    rhythm_sync: number;     // R: 리듬 동기화 (-1~+1)
  };
  
  measurement_type: MeasurementType;
  confidence: number;        // 0~1
  relation_started_at: string;
  relation_duration_months: number;
}

export interface RelationDensity {
  id?: string;
  org_id: string;
  
  node_a_id: string;
  node_b_id: string;
  
  // P 값
  density: number;           // 0 ~ 1
  
  // P 구성요소
  components: {
    frequency: number;       // F: 접촉 빈도 (0~1)
    depth: number;           // D: 관계 깊이 (0~1)
    quality: number;         // Q: 품질 보정 (0~1)
  };
  
  period_start: string;
  period_end: string;
  interaction_count: number;
  total_duration_minutes: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 시간 타입
// ═══════════════════════════════════════════════════════════════════════════

export type TimeType = 't1_input' | 't2_saved' | 't3_created';

export interface TimeRecord {
  id?: string;
  org_id: string;
  
  from_node_id: string;
  from_node_type: NodeType;
  to_node_id: string;
  to_node_type: NodeType;
  
  time_type: TimeType;
  real_minutes: number;
  lambda_adjusted_stu: number;
  
  activity_type?: string;    // class, consult, call, message
  activity_id?: string;
  description?: string;
  recorded_date: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 가치 타입
// ═══════════════════════════════════════════════════════════════════════════

export interface RelationValue {
  node_a_id: string;
  node_a_name?: string;
  node_b_id: string;
  node_b_name?: string;
  
  value_stu: number;
  value_krw: number;
  
  components: {
    lambda_a: number;
    lambda_b: number;
    time_a_to_b: number;     // hours
    time_b_to_a: number;     // hours
    density: number;
    sigma: number;
    synergy_multiplier: number;
  };
}

export interface NodeValue {
  node_id: string;
  node_type: NodeType;
  name: string;
  role: string;
  lambda: number;
  total_value_stu: number;
  total_value_krw: number;
  relation_count: number;
}

export type SnapshotType = 'daily' | 'weekly' | 'monthly';

export interface ValueSnapshot {
  id?: string;
  org_id: string;
  snapshot_type: SnapshotType;
  snapshot_date: string;
  
  total_value_stu: number;
  total_value_krw: number;
  
  total_lambda_weighted_time: number;
  avg_density: number;
  avg_sigma: number;
  omega: number;             // ₩/STU
  
  node_count: number;
  relation_count: number;
  
  node_breakdown?: NodeValue[];
  relation_breakdown?: RelationValue[];
  
  prev_value_stu?: number;
  value_change_pct?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 조직 가치 요약
// ═══════════════════════════════════════════════════════════════════════════

export interface OrgValueSnapshot {
  org_id: string;
  
  // 총 가치
  total_value_stu: number;
  total_value_krw: number;
  
  // 통계
  node_count: number;
  relation_count: number;
  avg_lambda: number;
  avg_sigma: number;
  avg_density: number;
  omega: number;
  
  // 순위
  top_nodes: NodeValue[];
  top_relations: RelationValue[];
  risk_relations: RelationValue[];
  
  // 트렌드
  prev_value_stu?: number;
  value_change_pct?: number;
  
  // 메타
  calculated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 기본값 상수
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 역할별 기본 λ 값 (AUTUS Spec v1.0)
 */
export const DEFAULT_LAMBDAS: Record<string, number> = {
  // 내부 역할
  owner: 5.0,              // 원장/대표
  director: 3.5,           // 실장/부원장
  senior_teacher: 3.0,     // 수석 강사
  teacher: 2.0,            // 일반 강사
  junior_teacher: 1.5,     // 신입 강사
  admin: 1.5,              // 행정 직원
  
  // 외부 역할
  student: 1.0,            // 학생 (기준 노드)
  parent: 1.2,             // 학부모
  
  // KRATON 역할 매핑
  c_level: 5.0,
  fsd: 3.5,
  optimus: 2.0,
  consumer: 1.0,
  regulatory: 2.0,
  partner: 2.5,
};

/**
 * 빈도 스케일 (F)
 */
export const FREQUENCY_SCALE: Record<string, number> = {
  daily: 1.0,
  '3_per_week': 0.8,
  weekly: 0.6,
  biweekly: 0.4,
  monthly: 0.2,
  rarely: 0.1,
};

/**
 * 깊이 스케일 (D)
 */
export const DEPTH_SCALE: Record<string, number> = {
  partner: 1.0,     // 파트너
  dependent: 0.8,   // 의존
  trust: 0.6,       // 신뢰
  familiar: 0.4,    // 친숙
  aware: 0.2,       // 인지
  stranger: 0.0,    // 생면부지
};

/**
 * λ 제약
 */
export const LAMBDA_CONSTRAINTS = {
  min: 0.5,
  max: 10.0,
  base: 1.0,
};

/**
 * σ 가중치 (v1.0)
 */
export const SIGMA_WEIGHTS = {
  compatibility: 0.3,   // C
  goal_alignment: 0.3,  // G
  value_match: 0.2,     // V
  rhythm_sync: 0.2,     // R
};

/**
 * 포화 함수 파라미터
 */
export const SATURATION_PARAMS = {
  s_max: 50,   // 최대 배율
  tau: 24,     // 포화 시간상수 (개월)
};

// ═══════════════════════════════════════════════════════════════════════════
// 자산 포트폴리오 타입 (NEW)
// ═══════════════════════════════════════════════════════════════════════════

export type AssetType = 'equity' | 'ip' | 'data' | 'standard' | 'partnership';

export interface Asset {
  id?: string;
  org_id: string;
  asset_type: AssetType;
  
  // 가치 요소
  t_value: number;           // T (투입 가치 시간)
  sigma_value: number;       // σ (관계 시너지)
  a_value: number;           // A (증폭된 가치)
  a_krw?: number;            // ₩ 환산
  
  // 메타
  source_name: string;       // 출처 (고객사, 파트너 등)
  source_id?: string;
  description?: string;
  acquired_at: string;
  
  // 상태
  status: 'active' | 'pending' | 'realized';
}

export interface AssetPortfolio {
  org_id: string;
  
  // 총 가치
  total_a_value: number;
  total_a_krw: number;
  
  // 자산 유형별 분포
  distribution: {
    equity: { count: number; value: number; percentage: number };
    ip: { count: number; value: number; percentage: number };
    data: { count: number; value: number; percentage: number };
    standard: { count: number; value: number; percentage: number };
    partnership: { count: number; value: number; percentage: number };
  };
  
  // 자산 목록
  assets: Asset[];
  
  // 성장률
  growth_rate_monthly?: number;
  
  calculated_at: string;
}

/**
 * 자산 유형별 기본 σ
 */
export const ASSET_TYPE_SIGMA_DEFAULTS: Record<AssetType, number> = {
  equity: 0.25,       // 지분 - 높은 시너지
  ip: 0.20,           // IP 공동소유
  data: 0.15,         // 데이터 권한
  standard: 0.10,     // 표준 기여
  partnership: 0.30,  // 파트너십 - 가장 높은 시너지
};

/**
 * 자산 유형 설명
 */
export const ASSET_TYPE_DESCRIPTIONS: Record<AssetType, { label: string; icon: string; description: string }> = {
  equity: { label: '지분', icon: '📈', description: '고객사/파트너 지분 수취' },
  ip: { label: 'IP', icon: '💡', description: 'IP 공동 소유/라이선스' },
  data: { label: '데이터', icon: '📊', description: '데이터 권한/접근권' },
  standard: { label: '표준', icon: '📋', description: '표준/프로토콜 기여' },
  partnership: { label: '파트너십', icon: '🤝', description: '전략적 파트너 관계' },
};

// ═══════════════════════════════════════════════════════════════════════════
// 효율 메트릭 타입 (NEW)
// ═══════════════════════════════════════════════════════════════════════════

export interface EfficiencyMetrics {
  org_id: string;
  period_start: string;
  period_end: string;
  
  // 투입
  total_input_stu: number;
  total_input_krw: number;
  
  // 산출
  total_output_stu: number;
  total_output_krw: number;
  
  // 효율
  efficiency_ratio: number;     // E = output / input
  efficiency_level: 'excellent' | 'good' | 'break_even' | 'loss';
  
  // 상세
  by_activity_type?: Record<string, { input: number; output: number; efficiency: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// σ 프록시 지표 타입 (NEW)
// ═══════════════════════════════════════════════════════════════════════════

export interface SigmaProxyData {
  relation_id: string;
  measured_at: string;
  
  // 프록시 지표
  response_speed: number;      // 0-1
  engagement_rate: number;     // 0-1
  completion_rate: number;     // 0-1
  sentiment_score: number;     // -1 ~ +1
  renewal_history: number;     // 0-1
  
  // 산출값
  predicted_sigma: number;
  confidence: number;
}

export interface SigmaHistory {
  relation_id: string;
  entries: Array<{
    date: string;
    sigma_predicted: number;
    sigma_measured?: number;
    sigma_adjusted: number;
    source: 'proxy' | 'measured' | 'manual';
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// 이탈 위험 타입 (NEW)
// ═══════════════════════════════════════════════════════════════════════════

export type ChurnRiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'critical';

export interface ChurnRiskAssessment {
  relation_id: string;
  node_id: string;
  node_name: string;
  
  risk_level: ChurnRiskLevel;
  probability: number;
  days_to_action: number;
  recommendation: string;
  
  // 요인
  factors: {
    sigma_current: number;
    sigma_trend: 'improving' | 'stable' | 'declining';
    duration_months: number;
    recent_activity_drop: number;
    last_interaction_days: number;
  };
  
  assessed_at: string;
}
