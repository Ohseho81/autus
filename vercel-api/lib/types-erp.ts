// =============================================================================
// AUTUS v1.0 - ERP Integration Types
// =============================================================================

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export type ERPProvider = 
  | 'classting' 
  | 'narakhub' 
  | 'tongtong' 
  | 'aca2000' 
  | 'smartfit';

export type RiskBand = 'critical' | 'high' | 'medium' | 'low';

export type CardType = 'EMERGENCY' | 'ATTENTION' | 'INSIGHT' | 'OPPORTUNITY';

export type CardTone = 'calm' | 'urgent' | 'friendly';

export type SyncStatus = 'pending' | 'syncing' | 'success' | 'error';

// -----------------------------------------------------------------------------
// Student Data (Normalized)
// -----------------------------------------------------------------------------

export interface StudentData {
  id?: string;
  academy_id: string;
  external_id: string;
  provider: ERPProvider;
  
  // Basic Info
  name: string;
  grade?: string;
  grade_band?: string;
  class_name?: string;
  subject?: string;
  
  // Parent Info
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  
  // Financial
  monthly_fee?: number;
  unpaid_amount?: number;
  payment_status?: 'paid' | 'unpaid' | 'partial';
  
  // Academic
  attendance_rate?: number;
  homework_completion?: number;
  recent_score?: number;
  score_change?: number;
  
  // Risk
  risk_score?: number;
  risk_band?: RiskBand;
  confidence_score?: number;
  
  // Metadata
  enrolled_at?: string;
  synced_at?: string;
  metadata?: Record<string, any>;
}

// -----------------------------------------------------------------------------
// Student Signals
// -----------------------------------------------------------------------------

export interface StudentSignals {
  id?: string;
  student_id: string;
  academy_id: string;
  
  // Risk Signals
  attendance_drop: boolean;
  homework_missed: number;
  unpaid_amount: number;
  recent_score_change: number;
  
  // Raw Signals
  recent_signals: string[];
  
  updated_at?: string;
}

// -----------------------------------------------------------------------------
// Academy Integration
// -----------------------------------------------------------------------------

export interface AcademyIntegration {
  id?: string;
  academy_id: string;
  provider: ERPProvider;
  provider_school_id?: string;
  
  // OAuth Tokens
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  
  // Settings
  settings?: {
    sync_interval?: number;
    webhook_enabled?: boolean;
    csv_path?: string;
    sheet_url?: string;
  };
  
  // Status
  status: 'active' | 'inactive' | 'error';
  last_sync?: string;
  sync_count?: number;
  error_message?: string;
  
  metadata?: Record<string, any>;
}

// -----------------------------------------------------------------------------
// Card Types
// -----------------------------------------------------------------------------

export interface RewardCard {
  id?: string;
  student_id: string;
  academy_id: string;
  
  card_type: CardType;
  tone: CardTone;
  
  // Content
  title: string;
  message: string;
  suggested_actions: string[];
  
  // Predictions
  success_probability: number;
  estimated_roi: number;
  confidence: number;
  
  // Status
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'completed';
  
  created_at?: string;
  sent_at?: string;
}

export interface CardDispatch {
  id?: string;
  student_id: string;
  academy_id: string;
  card_id?: string;
  
  card_type: CardType;
  tone: CardTone;
  content: string;
  
  // Delivery
  channel: 'sms' | 'kakao' | 'email';
  recipient: string;
  
  // Status
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  error?: string;
  
  created_at?: string;
}

export interface CardOutcome {
  id?: string;
  student_id: string;
  academy_id: string;
  dispatch_id?: string;
  card_id?: string;
  
  card_type: CardType;
  template_id?: string;
  
  // Result
  outcome: 'success' | 'partial' | 'failure' | 'unknown';
  retention_result: boolean;
  
  // Feedback
  notes?: string;
  parent_response?: string;
  
  recorded_at?: string;
}

// -----------------------------------------------------------------------------
// V-Pulse Types
// -----------------------------------------------------------------------------

export interface VPulseInput {
  student_id: string;
  academy_id: string;
  
  // Current Data
  attendance_rate?: number;
  homework_completion?: number;
  recent_score?: number;
  score_change?: number;
  unpaid_amount?: number;
  
  // Historical
  previous_risk_score?: number;
  days_enrolled?: number;
}

export interface VPulseOutput {
  student_id: string;
  academy_id: string;
  
  // Risk Assessment
  risk_score: number;  // 0-300
  risk_band: RiskBand;
  confidence: number;  // 0-1
  
  // Detected Signals
  signals: {
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }[];
  
  // Recommendation
  suggested_card?: {
    type: CardType;
    priority: number;
    reason: string;
  };
  
  calculated_at: string;
}

// -----------------------------------------------------------------------------
// Sync Types
// -----------------------------------------------------------------------------

export interface SyncRequest {
  academy_id: string;
  provider: ERPProvider;
  
  // Optional filters
  since?: string;
  student_ids?: string[];
  
  // Options
  force?: boolean;
  dry_run?: boolean;
}

export interface SyncResult {
  academy_id: string;
  provider: ERPProvider;
  
  status: SyncStatus;
  
  // Stats
  total_records: number;
  synced_records: number;
  created_records: number;
  updated_records: number;
  skipped_records: number;
  failed_records: number;
  
  // Timing
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  
  // Errors
  errors?: {
    record_id?: string;
    message: string;
  }[];
}

export interface SyncLog {
  id?: string;
  academy_id: string;
  provider: ERPProvider;
  
  total_records: number;
  synced_records: number;
  status: SyncStatus;
  
  error?: string;
  
  created_at?: string;
}

// -----------------------------------------------------------------------------
// ERP-Specific Types
// -----------------------------------------------------------------------------

// Classting
export interface ClasstingStudent {
  id: string;
  name: string;
  class_id: string;
  class_name: string;
  grade: string;
  
  attendance_rate?: number;
  assignment_completion?: number;
  
  parent?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface ClasstingWebhookEvent {
  event_type: 'attendance' | 'assignment' | 'grade' | 'feedback' | 'message';
  school_id: string;
  class_id: string;
  student_id: string;
  
  data: Record<string, any>;
  
  timestamp: string;
  signature: string;
}

// Narakhub
export interface NarakhubCSVRow {
  학생ID: string;
  학생명: string;
  학년: string;
  반: string;
  학부모명: string;
  연락처: string;
  이메일?: string;
  등록금: string;
  미납금: string;
  출석률: string;
  상담메모?: string;
}

// Tongtong
export interface TongtongCSVRow {
  student_code: string;
  student_name: string;
  grade: string;
  class: string;
  parent_name: string;
  parent_phone: string;
  monthly_fee: string;
  unpaid: string;
  attendance_pct: string;
  last_score: string;
  memo?: string;
}

// ACA2000
export interface ACA2000Row {
  학번: string;
  성명: string;
  학년: string;
  과목: string;
  월수강료: number;
  미납액: number;
  출석률: number;
  최근점수: number;
  학부모연락처: string;
  비고?: string;
}

// Smartfit
export interface SmartfitCSVRow {
  회원코드: string;
  회원명: string;
  등급: string;
  학부모명: string;
  연락처: string;
  월회비: string;
  미납금: string;
  출석률: string;
  메모?: string;
}

// -----------------------------------------------------------------------------
// Feature Weights (Self-Learning)
// -----------------------------------------------------------------------------

export interface FeatureWeights {
  attendance: number;
  homework: number;
  grade: number;
  payment: number;
  parent_engagement: number;
  
  // Metadata
  version: number;
  updated_at: string;
}

export const DEFAULT_FEATURE_WEIGHTS: FeatureWeights = {
  attendance: 0.30,
  homework: 0.25,
  grade: 0.20,
  payment: 0.15,
  parent_engagement: 0.10,
  version: 1,
  updated_at: new Date().toISOString(),
};

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface APIResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
