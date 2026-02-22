/**
 * Personal AI Factory - Type Definitions
 */

export type AIStatus = 'embryo' | 'infant' | 'growing' | 'mature' | 'elder';
export type PatternType = 'routine' | 'change' | 'anomaly' | 'preference';
export type AuthType = 'internal' | 'oauth' | 'api_key' | 'webhook' | 'bluetooth';
export type RefreshRate = 'realtime' | 'hourly' | 'daily' | 'manual';
export type ConnectorStatus = 'active' | 'paused' | 'disconnected' | 'error';
export type PermissionLevel = 'ALWAYS_AUTO' | 'ASK_FIRST_TIME' | 'ASK_EVERY_TIME' | 'NEVER';
export type ActionStatus = 'pending' | 'approved' | 'executed' | 'rejected' | 'failed';

export interface PersonalAI {
  id: string;
  owner_id: string;
  display_name?: string;
  status: AIStatus;
  total_logs: number;
  total_patterns: number;
  total_connections: number;
  born_at: string;
  last_active_at?: string;
}

export interface LifeLog {
  id: string;
  ai_id: string;
  source: string;
  event_type: string;
  raw_data: Record<string, unknown>;
  context: Record<string, unknown>;
  auto: boolean;
  created_at: string;
}

export interface Pattern {
  id: string;
  ai_id: string;
  pattern_type: PatternType;
  description: string;
  confidence: number;
  observation_count: number;
  related_log_ids: string[];
  first_seen: string;
  last_seen: string;
  is_active: boolean;
  created_at: string;
}

export interface GrowthSnapshot {
  id: string;
  ai_id: string;
  window_size: number;
  signals: unknown[];
  generated_at: string;
}

export interface Connector {
  id: string;
  ai_id: string;
  service: string;
  service_name?: string;
  auth_type: AuthType;
  auth_data: Record<string, unknown>;
  log_types: string[];
  refresh_rate: RefreshRate;
  status: ConnectorStatus;
  connected_at: string;
  last_sync_at?: string;
}

export interface Permission {
  id: string;
  ai_id: string;
  action: string;
  action_name?: string;
  level: PermissionLevel;
  granted_at?: string;
  granted_by: string;
  auto_approved_count: number;
}

export interface ActionLog {
  id: string;
  ai_id: string;
  trigger_event?: string;
  action: string;
  target_service?: string;
  result: Record<string, unknown>;
  status: ActionStatus;
  approved?: boolean;
  approved_at?: string;
  created_at: string;
  executed_at?: string;
}

// Input types for creating/updating
export interface CreateLifeLogInput {
  source: string;
  event_type: string;
  raw_data?: Record<string, unknown>;
  context?: Record<string, unknown>;
  auto?: boolean;
}

export interface CreatePatternInput {
  pattern_type: PatternType;
  description: string;
  confidence?: number;
  related_log_ids?: string[];
}

export interface CreateConnectorInput {
  service: string;
  service_name?: string;
  auth_type?: AuthType;
  auth_data?: Record<string, unknown>;
  log_types?: string[];
  refresh_rate?: RefreshRate;
}

export interface CreatePermissionInput {
  action: string;
  action_name?: string;
  level?: PermissionLevel;
}

export interface CreateActionLogInput {
  trigger_event?: string;
  action: string;
  target_service?: string;
  result?: Record<string, unknown>;
  status?: ActionStatus;
}
