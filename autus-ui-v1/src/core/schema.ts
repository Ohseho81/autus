/**
 * AUTUS Core Schema
 * LOCKED: Do not modify without LOCK review
 * 
 * Types: State, Eligibility, Approval, Fact
 * Rule: Fact is append-only (no update/delete)
 */

// ============================================================================
// Enums
// ============================================================================

export type SubjectType = 
  | 'student' 
  | 'payment' 
  | 'attendance' 
  | 'exception' 
  | 'rule' 
  | 'intervention';

export type ActionType = 
  | 'approve' 
  | 'deny' 
  | 'defer' 
  | 'kill' 
  | 'restart';

export type DecisionResult = 'APPROVED' | 'DENIED' | 'DEFERRED' | 'PENDING';

export type DecisionCost = 'LOW' | 'MED' | 'HIGH';

export type Reversibility = 'easy' | 'hard';

export type BlastRadius = 'local' | 'segment' | 'global';

export type LongTermDirection = 'UP' | 'DOWN' | 'UNKNOWN';

// ============================================================================
// Core Types
// ============================================================================

/**
 * State - Current status of a subject
 */
export interface State {
  readonly subject_type: SubjectType;
  readonly status: string;
  readonly computed_at: string; // ISO timestamp
}

/**
 * Eligibility - YES/NO only, no scores exposed
 */
export interface Eligibility {
  readonly subject_type: SubjectType;
  readonly action_type: ActionType;
  readonly eligible: boolean; // YES/NO only
  readonly evaluated_at: string; // ISO timestamp
}

/**
 * Approval - Decision requiring human approval
 */
export interface Approval {
  readonly id: string;
  readonly subject_id: string;
  readonly action_type: ActionType;
  readonly decision: DecisionResult;
  readonly decided_at: string | null; // null if pending
  readonly decision_cost: DecisionCost;
  readonly reversibility: Reversibility;
  readonly blast_radius: BlastRadius;
  readonly deadline: string; // TTL expiry ISO timestamp
  readonly long_term_direction?: LongTermDirection;
}

/**
 * Fact - Append-only event record
 * RULE: NO updates, NO deletes
 */
export interface Fact {
  readonly event_type: string;
  readonly subject_id: string;
  readonly value: Record<string, unknown>;
  readonly timestamp: string; // ISO timestamp
  readonly source: string;
}

// ============================================================================
// Decision Card (UI View Model)
// ============================================================================

export interface DecisionCard {
  readonly id: string;
  readonly subject_id: string;
  readonly subject_type: SubjectType;
  readonly action_type: ActionType;
  readonly decision_cost: DecisionCost;
  readonly reversibility: Reversibility;
  readonly blast_radius: BlastRadius;
  readonly deadline: string;
  readonly created_at: string;
  readonly summary: string; // Short description
}

// ============================================================================
// Rule (for Kill Board)
// ============================================================================

export interface Rule {
  readonly id: string;
  readonly name: string;
  readonly status: 'running' | 'killed' | 'cooldown';
  readonly started_at: string;
  readonly killed_at: string | null;
  readonly cooldown_until: string | null; // 30min after kill
}

// ============================================================================
// Friction Delta (P2)
// ============================================================================

export interface FrictionDelta {
  readonly questions: number;
  readonly interventions: number;
  readonly exceptions: number;
  readonly escalations: number;
  readonly computed_at: string;
}

// ============================================================================
// Budget (P8)
// ============================================================================

export interface WeeklyBudget {
  readonly high_decisions_used: number;
  readonly high_decisions_cap: number; // Fixed at 1
  readonly week_start: string;
  readonly week_end: string;
}

// ============================================================================
// Input Channel (P9)
// ============================================================================

export interface InputSchema {
  readonly version: string;
  readonly allowed_events: readonly string[];
  readonly required_fields: readonly string[];
}

export interface IgnoredInput {
  readonly id: string;
  readonly raw_input: string;
  readonly reason: 'invalid_format' | 'unknown_event' | 'missing_field';
  readonly timestamp: string;
}

// ============================================================================
// Constants
// ============================================================================

export const CONSTANTS = {
  TTL_DEFAULT_HOURS: 24,
  KILL_COOLDOWN_MINUTES: 30,
  HIGH_DECISION_WEEKLY_CAP: 1,
  DECISION_P95_TARGET_SECONDS: 10,
  DEFER_RATE_TARGET_PERCENT: 5,
} as const;
