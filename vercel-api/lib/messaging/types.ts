export type MessageStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'DEAD_LETTER';
export type MessagePriority = 'SAFETY' | 'HIGH' | 'NORMAL' | 'LOW';
export type RecipientType = 'PARENT' | 'TEACHER' | 'DIRECTOR';

export interface MessageOutbox {
  id: string;
  org_id: string;
  recipient_type: RecipientType;
  recipient_id: string;
  phone: string;
  template_code: string;
  payload_json: Record<string, unknown>;
  idempotency_key: string;
  status: MessageStatus;
  priority: MessagePriority;
  retry_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

export type InboundResponseType = 'ATTEND' | 'ABSENT' | 'CONSENT' | 'SIGNATURE' | 'NONE';

export interface InboundCallback {
  message_id: string;
  response_type: InboundResponseType;
  button_key?: string;
  user_phone?: string;
  timestamp: string;
  raw_payload?: Record<string, unknown>;
}

export type ConsentType = 'SERVICE_TERMS' | 'PRIVACY' | 'MARKETING' | 'CHANNEL_ADD';

export interface ConsentRecord {
  id: string;
  org_id: string;
  parent_id: string;
  student_id: string | null;
  consent_type: ConsentType;
  consent_version: string;
  consented_at: string;
  channel: string;
  is_active: boolean;
  revoked_at: string | null;
}

export type GoalTargetType = 'DESTINATION' | 'NEXT_MOVE';

export interface GoalChangeRecord {
  id: string;
  org_id: string;
  student_id: string;
  target_type: GoalTargetType;
  from_text: string;
  to_text: string;
  reason_code: string;
  decided_by_role: string;
  decided_by_id: string;
  effective_from: string;
  created_at: string;
}

export type MessageEventType = 'DELIVERED' | 'OPENED' | 'CLICKED' | 'RESPONDED';
export type SafetyLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
export type TriggerType = 'STAGNATION_4W' | 'DECLINE_2W' | 'NEAR_GOAL' | 'VIEW_SPIKE';
