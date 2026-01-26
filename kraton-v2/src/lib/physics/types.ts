/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔬 KRATON Physics Engine - Type Definitions
 * 
 * V = (M - T) × (1 + s)^t
 * R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
 * ═══════════════════════════════════════════════════════════════════════════
 */

// V-Index 계산 입력
export interface VIndexInput {
  M: number;           // Mint (매출)
  T: number;           // Tax (비용)
  s: number;           // Satisfaction (만족도, 0-1)
  t: number;           // Time (개월)
}

// V-Index 결과
export interface VIndexResult {
  v_index: number;
  net_value: number;   // M - T
  compound_multiplier: number;  // (1 + s)^t
  breakdown: {
    mint: number;
    tax: number;
    satisfaction: number;
    time_months: number;
  };
  prediction: {
    v_3months: number;
    v_6months: number;
    v_12months: number;
  };
}

// R(t) 이탈 위험도 입력
export interface RiskInput {
  student_id: string;
  performance_changes: PerformanceChange[];  // ΔM 시계열
  current_satisfaction: number;              // s(t)
  alpha?: number;                            // 민감도 (기본 1.5)
}

export interface PerformanceChange {
  timestamp: Date;
  delta_m: number;     // 성과 변화량
  category: 'grade' | 'attendance' | 'engagement' | 'payment';
}

// R(t) 결과
export interface RiskResult {
  risk_score: number;           // 0-100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predicted_churn_days: number; // 예상 이탈까지 일수
  contributing_factors: {
    factor: string;
    weight: number;
    impact: number;
  }[];
  recommended_actions: string[];
  auto_actuation: {
    action: string;
    scheduled_at: Date;
    status: 'pending' | 'executed' | 'cancelled';
  }[];
}

// Quick Tag 입력
export interface QuickTagInput {
  target_id: string;
  target_type: 'student' | 'parent' | 'teacher';
  tagger_id: string;
  emotion_delta: number;    // -20 to +20
  bond_strength: 'strong' | 'normal' | 'cold';
  issue_triggers: string[];
  voice_insight?: string;   // AI 분석용 음성 텍스트
  meta?: Record<string, unknown>;
}

// Chemistry 매칭
export interface ChemistryInput {
  teacher_id: string;
  student_id: string;
}

export interface ChemistryResult {
  compatibility_score: number;  // 0-100
  predicted_v_creation: number; // 예상 V 창출 (원)
  recommendation: 'excellent' | 'good' | 'neutral' | 'poor';
  analysis: {
    teaching_style: string;
    learning_style: string;
    synergy_points: string[];
    risk_points: string[];
  };
  similar_cases: {
    success_rate: number;
    avg_duration_months: number;
  };
}

// 3-Tier 역할
export type TierRole = 'c_level' | 'fsd' | 'optimus';
export type ExternalRole = 'consumer' | 'regulatory' | 'partner';
export type AllRoles = TierRole | ExternalRole;

export interface TierAccess {
  role: TierRole;
  automation_rate: number;
  modules: string[];
  approval_code?: string;
  approved_by?: string;
}

export interface TierConfig {
  role: TierRole;
  label: string;
  emoji: string;
  automation_rate: number;
  description: string;
  access_method: 'master_password' | 'approval_code';
  approved_by?: TierRole;
  modules: string[];
}

export const TIER_CONFIGS: Record<TierRole, TierConfig> = {
  c_level: {
    role: 'c_level',
    label: 'C-Level',
    emoji: '👑',
    automation_rate: 20,
    description: 'Vision & Resource Director',
    access_method: 'master_password',
    modules: ['monopoly', 'analytics', 'accel', 'global', 'viral', 'auto', 'audit'],
  },
  fsd: {
    role: 'fsd',
    label: 'FSD',
    emoji: '🎯',
    automation_rate: 80,
    description: 'Judgment & Allocation Lead',
    access_method: 'approval_code',
    approved_by: 'c_level',
    modules: ['judgment', 'principal', 'retention', 'risk_queue', 'chemistry', 'mirror'],
  },
  optimus: {
    role: 'optimus',
    label: 'Optimus',
    emoji: '⚡',
    automation_rate: 98,
    description: 'Execution Operator',
    access_method: 'approval_code',
    approved_by: 'fsd',
    modules: ['execution', 'quick_tag', 'script_ai', 'students', 'attendance', 'calendar'],
  },
};

export interface ApprovalCode {
  code: string;
  issued_by: string;
  issued_at: Date;
  target_role: TierRole;
  expires_at: Date;
  used: boolean;
  used_by?: string;
  used_at?: Date;
}

export interface AuthSession {
  user_id: string;
  org_id: string;
  role: AllRoles;
  tier?: TierRole;
  modules: string[];
  automation_rate: number;
  approved_by?: string;
  expires_at: Date;
}

// Monopoly 데이터
export interface MonopolyData {
  v_index: VIndexResult;
  perception: {
    tags_today: number;
    tag_rate: string;
    recent_tags: any[];
  };
  judgment: {
    accuracy: number;
    active_predictions: number;
  };
  structure: {
    sync_latency: string;
    nodes_connected: number;
  };
  global: {
    korea: { v_index: number; currency: string };
    philippines: { v_index: number; currency: string };
  };
  recent_events: any[];
}

// Performance 물리 공식
export interface PerformanceFormula {
  M: number;  // Node Mass (개인 역량)
  I: number;  // Interaction Vector (상호작용)
  A: number;  // Acceleration (시스템 가속도)
  R: number;  // Resistance (환경 마찰)
}
