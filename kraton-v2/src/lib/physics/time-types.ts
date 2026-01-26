/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⏱️ AUTUS 시간 측정 체계 - 타입 정의
 * 
 * V = P × Λ × e^(σt)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// 기본 시간 타입
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 시간 방향에 따른 분류
 */
export type TimeDirection = 'past' | 'present' | 'future';

/**
 * 시간 흐름에 따른 분류
 */
export type TimeFlow = 'input' | 'output';

/**
 * 시간 성격에 따른 분류 (T₁, T₂, T₃)
 */
export type TimeNature = 't1_invested' | 't2_saved' | 't3_created';

// ═══════════════════════════════════════════════════════════════════════════
// λ (Lambda) - 노드 시간상수
// ═══════════════════════════════════════════════════════════════════════════

/**
 * λ 계산 입력 요소
 */
export interface LambdaFactors {
  /** R: 대체 가능성 (0~1, 낮을수록 대체 어려움) */
  replaceability: number;
  /** I: 영향력 (0~1) */
  influence: number;
  /** E: 전문성 (0~1) */
  expertise: number;
  /** N: 네트워크 위치 (0~1) */
  network: number;
}

/**
 * 노드의 λ 정보
 */
export interface NodeLambda {
  node_id: string;
  org_id: string;
  
  /** 현재 λ 값 */
  lambda: number;
  
  /** λ 구성 요소 */
  factors: LambdaFactors;
  
  /** 산업별 보정 상수 */
  industry_k: number;
  
  /** γ: 성장률 (연간) */
  growth_rate: number;
  
  /** 기준 시점 */
  base_date: Date;
  
  /** 역할 기반 기본값 */
  role_default_lambda: number;
  
  /** 최근 업데이트 */
  updated_at: Date;
}

/**
 * λ 변화 이력
 */
export interface LambdaHistory {
  id: string;
  node_id: string;
  lambda_before: number;
  lambda_after: number;
  change_reason: 'performance' | 'learning' | 'network' | 'role_change' | 'manual';
  change_details: Record<string, unknown>;
  recorded_at: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// σ (Sigma) - 시너지 계수
// ═══════════════════════════════════════════════════════════════════════════

/**
 * σ 계산 입력 요소
 */
export interface SigmaFactors {
  /** C: 스타일 호환성 (-1 ~ +1) */
  compatibility: number;
  /** G: 목표 일치도 (-1 ~ +1) */
  goalAlignment: number;
  /** V: 가치관 일치도 (-1 ~ +1) */
  valueMatch: number;
  /** R: 리듬 동기화 (-1 ~ +1) */
  rhythmSync: number;
}

/**
 * 관계별 σ 정보
 */
export interface RelationshipSigma {
  relationship_id: string;
  node_a_id: string;
  node_b_id: string;
  
  /** 현재 σ 값 */
  sigma: number;
  
  /** σ 구성 요소 */
  factors: SigmaFactors;
  
  /** 가중치 */
  weights: {
    c: number;
    g: number;
    v: number;
    r: number;
  };
  
  /** σ > 0: 시너지, σ < 0: 역시너지 */
  synergy_status: 'positive' | 'neutral' | 'negative';
  
  /** 측정 기반 */
  measurement_basis: 'survey' | 'ai_analysis' | 'behavior' | 'combined';
  
  /** 최근 업데이트 */
  updated_at: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// P (Density) - 관계 밀도
// ═══════════════════════════════════════════════════════════════════════════

/**
 * P 계산 입력 요소
 */
export interface DensityFactors {
  /** F: 접촉 빈도 (0~1) */
  frequency: number;
  /** Q: 상호작용 품질 (0~1) */
  quality: number;
  /** D: 관계 깊이 (0~1) */
  depth: number;
}

/**
 * 관계 깊이 단계
 */
export type RelationshipDepthLevel = 
  | 'awareness'    // 인지 (0.2)
  | 'familiarity'  // 친숙 (0.4)
  | 'trust'        // 신뢰 (0.6)
  | 'dependence'   // 의존 (0.8)
  | 'partnership'; // 파트너 (1.0)

/**
 * 관계별 밀도 정보
 */
export interface RelationshipDensity {
  relationship_id: string;
  node_a_id: string;
  node_b_id: string;
  
  /** 현재 P 값 */
  density: number;
  
  /** P 구성 요소 */
  factors: DensityFactors;
  
  /** 관계 깊이 단계 */
  depth_level: RelationshipDepthLevel;
  
  /** 마지막 상호작용 */
  last_interaction_at: Date;
  
  /** 유휴 일수 */
  idle_days: number;
  
  /** 감쇠율 (δ) */
  decay_rate: number;
  
  /** 감쇠 적용 후 P */
  density_decayed: number;
  
  /** 최근 업데이트 */
  updated_at: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// 시간 측정 (T₁, T₂, T₃)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 시간 활동 기록
 */
export interface TimeActivity {
  id: string;
  node_id: string;
  org_id: string;
  
  /** 활동 유형 */
  activity_type: string;
  
  /** 실제 시간 (시간) */
  real_time_hours: number;
  
  /** 활동 시점의 λ */
  lambda_at_time: number;
  
  /** STU 값 */
  stu_value: number;
  
  /** 시간 성격 */
  time_nature: TimeNature;
  
  /** 관련 대상 */
  target_id?: string;
  target_type?: string;
  
  /** 메타데이터 */
  meta?: Record<string, unknown>;
  
  /** 기록 시점 */
  recorded_at: Date;
}

/**
 * 노드별 시간 메트릭스
 */
export interface TimeMetrics {
  node_id: string;
  org_id: string;
  period: 'daily' | 'weekly' | 'monthly';
  period_start: Date;
  period_end: Date;
  
  /** T₁: 투입 시간 (STU) */
  t1_invested: number;
  
  /** T₂: 절약 시간 (STU) */
  t2_saved: number;
  
  /** T₃: 창출 시간 (STU) */
  t3_created: number;
  
  /** NTV: 순시간가치 */
  net_time_value: number;
  
  /** 효율성 비율 */
  efficiency_ratio: number;
  
  /** 시간 ROI */
  time_roi: number;
  
  /** 세부 내역 */
  breakdown: {
    t1_by_activity: Record<string, number>;
    t2_by_automation: Record<string, number>;
    t3_by_projection: Record<string, number>;
  };
  
  updated_at: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// STU 변환
// ═══════════════════════════════════════════════════════════════════════════

/**
 * STU 변환 결과
 */
export interface STUConversion {
  /** 실제 시간 (시간) */
  real_time_hours: number;
  
  /** λ (시간 상수) */
  lambda: number;
  
  /** 표준 시간 (STU) */
  stu: number;
  
  /** ω (시간 단가) */
  omega: number;
  
  /** 화폐 가치 (원) */
  monetary_value: number;
}

/**
 * 조직별 ω (시간 단가) 정보
 */
export interface OrgOmega {
  org_id: string;
  
  /** 현재 ω 값 */
  omega: number;
  
  /** 계산 기반 */
  calculation_basis: {
    total_revenue: number;
    total_stu_invested: number;
    period: string;
  };
  
  /** ω 추이 */
  history: {
    date: Date;
    omega: number;
  }[];
  
  /** 업계 평균 대비 */
  industry_benchmark?: number;
  
  updated_at: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// 순시간가치 (NTV)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 순시간가치 결과
 */
export interface NetTimeValue {
  /** T₁: 투입 시간 */
  t1_invested: number;
  
  /** T₂: 절약 시간 */
  t2_saved: number;
  
  /** T₃: 창출 시간 */
  t3_created: number;
  
  /** NTV = T₃ - T₁ + T₂ */
  net_time_value: number;
  
  /** 효율성 비율 = (T₂ + T₃) / T₁ */
  efficiency_ratio: number;
  
  /** 시간 ROI = NTV / T₁ */
  roi_time: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 관계 가치 (V)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 관계 가치 계산 결과
 * V = P × Λ × e^(σt)
 */
export interface TimeValueResult {
  /** 가치 (STU) */
  value_stu: number;
  
  /** 구성 요소 */
  components: {
    density: number;            // P
    mutual_time_value: number;  // Λ
    sigma: number;              // σ
    time_months: number;        // t
    synergy_multiplier: number; // e^(σt)
  };
  
  /** 예측 */
  prediction: {
    value_3months: number;
    value_6months: number;
    value_12months: number;
  };
  
  /** 관계 건강도 평가 */
  assessment: {
    health_score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    recommendations: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 대시보드 타입
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 시간 가치 대시보드 데이터
 */
export interface TimeValueDashboard {
  org_id: string;
  period: string;
  
  /** 조직 ω (시간 단가) */
  omega: number;
  
  /** 총 T₁, T₂, T₃ */
  total_t1: number;
  total_t2: number;
  total_t3: number;
  
  /** 조직 NTV */
  org_ntv: number;
  
  /** 조직 NTV (화폐) */
  org_ntv_money: number;
  
  /** 총 관계 가치 */
  total_relationship_value: number;
  
  /** 효율성 점수 (0-100) */
  efficiency_score: number;
  
  /** 상위 λ 노드 */
  top_lambda_nodes: {
    id: string;
    name: string;
    role: string;
    lambda: number;
  }[];
  
  /** 가장 강한 시너지 관계 */
  strongest_relationships: {
    node_a: string;
    node_b: string;
    sigma: number;
    value: number;
  }[];
  
  /** 가장 약한 시너지 관계 */
  weakest_relationships: {
    node_a: string;
    node_b: string;
    sigma: number;
    value: number;
  }[];
  
  /** 시간 흐름 트렌드 */
  trends: {
    date: Date;
    t1: number;
    t2: number;
    t3: number;
    ntv: number;
  }[];
  
  /** 생성 시점 */
  generated_at: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// API 요청/응답 타입
// ═══════════════════════════════════════════════════════════════════════════

/**
 * λ 업데이트 요청
 */
export interface UpdateLambdaRequest {
  node_id: string;
  factors?: Partial<LambdaFactors>;
  manual_lambda?: number;
  reason: string;
}

/**
 * σ 측정 요청
 */
export interface MeasureSigmaRequest {
  node_a_id: string;
  node_b_id: string;
  survey_data?: {
    compatibility_responses: number[];
    goal_alignment_responses: number[];
    value_match_responses: number[];
    rhythm_sync_responses: number[];
  };
  use_ai_analysis?: boolean;
}

/**
 * 시간 활동 기록 요청
 */
export interface RecordTimeActivityRequest {
  node_id: string;
  activity_type: string;
  real_time_hours: number;
  time_nature: TimeNature;
  target_id?: string;
  target_type?: string;
  meta?: Record<string, unknown>;
}

/**
 * 관계 가치 계산 요청
 */
export interface CalculateRelationshipValueRequest {
  node_a_id: string;
  node_b_id: string;
  include_prediction?: boolean;
  include_assessment?: boolean;
}
