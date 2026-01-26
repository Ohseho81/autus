// ═══════════════════════════════════════════════════════════════════════════════
// 🏛️ AUTUS Database Types
// ═══════════════════════════════════════════════════════════════════════════════

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================
// ENUMS
// ============================================

export type UserRole = 
  | 'c_level' 
  | 'fsd' 
  | 'optimus' 
  | 'consumer' 
  | 'regulatory' 
  | 'partner';

export type UserTier = 1 | 2 | 3 | null;

export type NodeType = 
  | 'student' 
  | 'teacher' 
  | 'class' 
  | 'product' 
  | 'service'
  | 'transaction' 
  | 'event' 
  | 'entity' 
  | 'metric';

export type VTier = 'T1' | 'T2' | 'T3' | 'T4' | 'Ghost';

export type FlowType = 'mint' | 'burn' | 'transfer' | 'reward' | 'penalty' | 'fee';

export type DecisionType = 
  | 'fight' | 'absorb' | 'ignore'
  | 'invest' | 'divest' | 'hold'
  | 'pivot' | 'expand' | 'contract';

export type RiskType = 
  | 'churn' 
  | 'turnover' 
  | 'financial' 
  | 'operational' 
  | 'regulatory' 
  | 'reputational';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type CrisisType = 
  | 'negative_review' 
  | 'social_media' 
  | 'news_article' 
  | 'complaint'
  | 'legal_issue' 
  | 'pr_crisis' 
  | 'misinformation';

export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';

export type KratonTeam = 
  | 'kraton_alpha' 
  | 'kraton_beta' 
  | 'kraton_gamma' 
  | 'kraton_delta' 
  | 'kraton_omega';

export type TaskStatus = 
  | 'queued' 
  | 'assigned' 
  | 'in_progress' 
  | 'review' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

// ============================================
// CORE TABLES
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  auth_id: string | null;
  organization_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  tier: UserTier;
  is_active: boolean;
  approved_by: string | null;
  approved_at: string | null;
  last_login_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ApprovalCode {
  id: string;
  code: string;
  issuer_id: string;
  target_role: UserRole;
  target_email: string | null;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

// ============================================
// V-ENGINE TABLES
// ============================================

export interface VNode {
  id: string;
  organization_id: string;
  external_id: string | null;
  node_type: NodeType;
  name: string | null;
  v_index: number;
  tier: VTier;
  mint_total: number;
  burn_total: number;
  last_activity_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface VFlow {
  id: string;
  organization_id: string;
  from_node_id: string | null;
  to_node_id: string | null;
  flow_type: FlowType;
  amount: number;
  synergy_factor: number;
  timestamp: string;
  source: string | null;
  metadata: Json;
}

export interface VSnapshot {
  id: string;
  organization_id: string;
  snapshot_date: string;
  total_v_index: number;
  total_mint: number;
  total_burn: number;
  sq_value: number;
  tier_distribution: {
    T1: number;
    T2: number;
    T3: number;
    T4: number;
    Ghost: number;
  };
  metrics: Json;
  created_at: string;
}

// ============================================
// C-LEVEL MODULE
// ============================================

export interface StrategicDecision {
  id: string;
  organization_id: string;
  decision_type: DecisionType;
  title: string;
  description: string | null;
  target_entity: string | null;
  impact_score: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled';
  decided_by: string | null;
  decided_at: string | null;
  executed_at: string | null;
  results: Json;
  created_at: string;
  updated_at: string;
}

export interface ResourceAllocation {
  id: string;
  organization_id: string;
  allocation_type: 'budget' | 'headcount' | 'equipment' | 'time' | 'attention';
  department: string | null;
  amount: number | null;
  period_start: string | null;
  period_end: string | null;
  priority: number;
  status: string;
  approved_by: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ============================================
// FSD MODULE
// ============================================

export interface MarketAnalysis {
  id: string;
  organization_id: string;
  analysis_type: 'competitor' | 'trend' | 'community' | 'regulation' | 'technology';
  title: string;
  summary: string | null;
  sentiment_score: number | null;
  confidence_score: number | null;
  data_sources: Json[];
  insights: Json[];
  recommendations: Json[];
  analyzed_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface CapitalJudgment {
  id: string;
  organization_id: string;
  judgment_type: 'investor_demand' | 'capital_flow' | 'pressure_index' | 'funding_round';
  entity_name: string | null;
  pressure_level: number | null;
  capital_amount: number | null;
  expected_return: number | null;
  risk_level: RiskLevel | null;
  assessment: string | null;
  action_required: boolean;
  deadline: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface RiskPrediction {
  id: string;
  organization_id: string;
  risk_type: RiskType;
  target_entity: string | null;
  target_node_id: string | null;
  probability: number;
  impact_score: number;
  predicted_date: string | null;
  early_indicators: Json[];
  mitigation_actions: Json[];
  status: 'active' | 'mitigated' | 'realized' | 'expired';
  created_at: string;
  updated_at: string;
}

// ============================================
// OPTIMUS MODULE
// ============================================

export interface CrisisResponse {
  id: string;
  organization_id: string;
  crisis_type: CrisisType;
  severity: CrisisSeverity;
  source: string | null;
  source_url: string | null;
  original_content: string | null;
  sentiment_score: number | null;
  reach_estimate: number | null;
  response_status: 'pending' | 'analyzing' | 'drafting' | 'reviewing' | 'responded' | 'monitoring' | 'resolved';
  response_content: string | null;
  response_channel: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  outcome: 'positive' | 'neutral' | 'negative' | 'escalated' | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface CSRInitiative {
  id: string;
  organization_id: string;
  initiative_type: 'community_support' | 'environmental' | 'education' | 'health' | 'disaster_relief' | 'volunteer' | 'donation' | 'partnership';
  title: string;
  description: string | null;
  target_community: string | null;
  budget: number | null;
  impact_metrics: Json;
  start_date: string | null;
  end_date: string | null;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  visibility: 'internal' | 'public' | 'stakeholders';
  created_at: string;
  updated_at: string;
}

export interface IRCommunication {
  id: string;
  organization_id: string;
  communication_type: 'quarterly_report' | 'annual_report' | 'press_release' | 'investor_meeting' | 'earnings_call' | 'ad_hoc_update';
  title: string;
  content: string | null;
  target_audience: string[];
  scheduled_at: string | null;
  published_at: string | null;
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  engagement_metrics: Json;
  created_at: string;
  updated_at: string;
}

export interface ExecutionTask {
  id: string;
  organization_id: string;
  task_type: string;
  priority: number;
  assigned_team: KratonTeam | null;
  title: string;
  description: string | null;
  source_module: string | null;
  source_id: string | null;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  results: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ============================================
// EXTERNAL USER TABLES
// ============================================

export interface ConsumerProfile {
  id: string;
  user_id: string;
  organization_id: string;
  consumer_type: 'student' | 'parent' | 'individual' | 'business' | null;
  v_node_id: string | null;
  subscription_plan: string | null;
  subscription_status: string;
  total_spent: number;
  loyalty_points: number;
  preferences: Json;
  created_at: string;
  updated_at: string;
}

export interface RegulatoryRecord {
  id: string;
  organization_id: string;
  user_id: string | null;
  record_type: 'permit' | 'license' | 'certification' | 'inspection' | 'compliance_report' | 'audit' | 'violation' | 'fine';
  issuing_authority: string | null;
  reference_number: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'renewed' | 'revoked';
  issued_at: string | null;
  expires_at: string | null;
  documents: Json[];
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PartnerProfile {
  id: string;
  user_id: string;
  organization_id: string;
  partner_type: 'supplier' | 'distributor' | 'technology' | 'marketing' | 'consulting' | null;
  company_name: string | null;
  contract_status: string;
  contract_start: string | null;
  contract_end: string | null;
  transaction_volume: number;
  performance_score: number | null;
  api_key: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ============================================
// INTEGRATION TABLES
// ============================================

export interface ERPSyncLog {
  id: string;
  organization_id: string;
  erp_type: string;
  sync_type: 'full' | 'incremental' | 'webhook';
  status: 'running' | 'completed' | 'failed' | 'partial';
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_details: Json[];
  started_at: string;
  completed_at: string | null;
}

export interface WebhookEvent {
  id: string;
  organization_id: string;
  source: string;
  event_type: string;
  payload: Json;
  processed: boolean;
  processed_at: string | null;
  error: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: 'alert' | 'warning' | 'info' | 'success' | 'action_required';
  channel: 'in_app' | 'email' | 'sms' | 'slack' | 'kakao';
  title: string;
  message: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string | null;
  created_at: string;
}

// ============================================
// DATABASE SCHEMA TYPE
// ============================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id'>>;
      };
      approval_codes: {
        Row: ApprovalCode;
        Insert: Omit<ApprovalCode, 'id' | 'created_at'>;
        Update: Partial<Omit<ApprovalCode, 'id'>>;
      };
      v_nodes: {
        Row: VNode;
        Insert: Omit<VNode, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<VNode, 'id'>>;
      };
      v_flows: {
        Row: VFlow;
        Insert: Omit<VFlow, 'id'>;
        Update: Partial<Omit<VFlow, 'id'>>;
      };
      v_snapshots: {
        Row: VSnapshot;
        Insert: Omit<VSnapshot, 'id' | 'created_at'>;
        Update: Partial<Omit<VSnapshot, 'id'>>;
      };
      strategic_decisions: {
        Row: StrategicDecision;
        Insert: Omit<StrategicDecision, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<StrategicDecision, 'id'>>;
      };
      resource_allocations: {
        Row: ResourceAllocation;
        Insert: Omit<ResourceAllocation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ResourceAllocation, 'id'>>;
      };
      market_analyses: {
        Row: MarketAnalysis;
        Insert: Omit<MarketAnalysis, 'id' | 'created_at'>;
        Update: Partial<Omit<MarketAnalysis, 'id'>>;
      };
      capital_judgments: {
        Row: CapitalJudgment;
        Insert: Omit<CapitalJudgment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CapitalJudgment, 'id'>>;
      };
      risk_predictions: {
        Row: RiskPrediction;
        Insert: Omit<RiskPrediction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<RiskPrediction, 'id'>>;
      };
      crisis_responses: {
        Row: CrisisResponse;
        Insert: Omit<CrisisResponse, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CrisisResponse, 'id'>>;
      };
      csr_initiatives: {
        Row: CSRInitiative;
        Insert: Omit<CSRInitiative, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CSRInitiative, 'id'>>;
      };
      ir_communications: {
        Row: IRCommunication;
        Insert: Omit<IRCommunication, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<IRCommunication, 'id'>>;
      };
      execution_tasks: {
        Row: ExecutionTask;
        Insert: Omit<ExecutionTask, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ExecutionTask, 'id'>>;
      };
      consumer_profiles: {
        Row: ConsumerProfile;
        Insert: Omit<ConsumerProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ConsumerProfile, 'id'>>;
      };
      regulatory_records: {
        Row: RegulatoryRecord;
        Insert: Omit<RegulatoryRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<RegulatoryRecord, 'id'>>;
      };
      partner_profiles: {
        Row: PartnerProfile;
        Insert: Omit<PartnerProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PartnerProfile, 'id'>>;
      };
      erp_sync_logs: {
        Row: ERPSyncLog;
        Insert: Omit<ERPSyncLog, 'id'>;
        Update: Partial<Omit<ERPSyncLog, 'id'>>;
      };
      webhook_events: {
        Row: WebhookEvent;
        Insert: Omit<WebhookEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<WebhookEvent, 'id'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id'>>;
      };
    };
    Functions: {
      calculate_v_index: {
        Args: { node_id: string };
        Returns: number;
      };
      calculate_sq: {
        Args: { org_id: string; days?: number };
        Returns: number;
      };
      classify_tier: {
        Args: { v_index: number };
        Returns: VTier;
      };
    };
  };
}
