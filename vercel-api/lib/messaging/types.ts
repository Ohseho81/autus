export type MessageStatus = 'pending' | 'sent' | 'failed' | 'cancelled';
export type MessagePriority = 'SAFETY' | 'URGENT' | 'NORMAL' | 'LOW';
export type RecipientType = 'PARENT' | 'TEACHER' | 'DIRECTOR';

export interface MessageOutbox {
  id: string;
  message_id: string;           // NOT NULL - unique message identifier (e.g. uuid v4)
  app_id: string;               // NOT NULL - application identifier (e.g. 'onlyssam')
  tenant_id: string;            // was org_id
  event_id: string | null;
  decision_id: string | null;
  rule_id: string | null;
  channel: string | null;       // e.g. 'KAKAO'
  recipient_type: RecipientType;
  recipient_id: string;
  recipient_phone: string;      // was phone
  recipient_email: string | null;
  template_id: string;          // was template_code
  variables: Record<string, unknown>;  // was payload_json
  rendered_content: string | null;
  idempotency_key: string;
  status: MessageStatus;
  priority: MessagePriority;
  retry_count: number;
  next_retry_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  failure_reason: string | null; // was last_error
  scheduled_send_at: string | null;
  rate_limit_bucket: string | null;
  external_message_id: string | null;
  delivery_status: string | null;
  delivery_confirmed_at: string | null;
  created_at: string;
  updated_at: string | null;
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
