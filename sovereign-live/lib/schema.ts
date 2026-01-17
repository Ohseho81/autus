/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📜 AUTUS Sovereign Ledger Schema
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 불변 규칙:
 * - 서버 저장 0
 * - 개인 식별 0 (Actor는 role만)
 * - 모든 데이터는 로컬 IndexedDB에만 저장
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Core Types
// ═══════════════════════════════════════════════════════════════════════════════

export type Role = "founder" | "employee" | "system";

export type NodeKind = "person" | "org" | "power" | "asset";
export type MotionKind = "money" | "value" | "time";

export type DecisionType = "do" | "delegate" | "stop";

export type TaskPriority = "low" | "medium" | "high";
export type ActionStatus = "completed" | "delayed" | "needs_decision" | "in_progress";

// ═══════════════════════════════════════════════════════════════════════════════
// Entity Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Node {
  node_id: string;
  kind: NodeKind;
  label: string;
  tier?: number;           // 1-12-144 계층
  created_at: number;
}

export interface Motion {
  motion_id: string;
  kind: MotionKind;
  source_node_id: string;
  target_node_id: string;
  amount: number;
  label: string;
  created_at: number;
}

export interface DecisionEvent {
  event_id: string;
  created_at: number;
  title: string;
  context: string;
  decision: DecisionType;
  linked_task_id?: string;   // Decision → Task 연결
  linked_proof_id?: string;  // Decision → Proof 연결
}

export interface Task {
  task_id: string;
  created_at: number;
  title: string;
  description?: string;
  priority: TaskPriority;
  due_at: number | null;
  source_decision_id?: string;  // 어떤 Decision에서 생성됨
  status: "pending" | "active" | "done" | "cancelled";
}

export interface ActionLog {
  log_id: string;
  task_id: string;
  actor_role: "employee";       // 고정: 개인 식별 금지
  action_status: ActionStatus;
  time_spent_min: number | null;
  used_tools: string[];
  note?: string;
  logged_at: number;
}

export interface Proof {
  proof_id: string;
  related_id: string;           // task_id 또는 decision event_id
  related_type: "task" | "decision";
  kind: "file" | "link" | "note" | "screenshot";
  label: string;
  payload: string;              // url 또는 메타(JSON string)
  sha256: string;               // 클라이언트 해시 (변조 방지)
  created_at: number;
}

export interface LogicConfig {
  config_id: string;
  updated_at: number;
  weights: {
    mint: number;    // V 생성 가중치
    tax: number;     // V 소비 가중치
    synergy: number; // 네트워크 효과
  };
  rules: {
    narrative_mode: "template" | "llm";
    auto_delegate_threshold: number;  // 자동 위임 기준
    proof_required: boolean;          // 증빙 필수 여부
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// P2P Sync Types (Future)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncMessage {
  message_id: string;
  type: "decision" | "task" | "proof" | "node" | "motion";
  payload: string;           // JSON serialized
  vector_clock: number;      // 충돌 해결용
  sender_id: string;
  created_at: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Decision Link Rules (불변 헌법)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decision → Task/Log/Proof 닫힘 규칙
 * 
 * DO (실행한다):
 *   → Task 생성 (status: "active")
 *   → ActionLog 기록 필요
 *   → Proof 선택적
 * 
 * DELEGATE (위임한다):
 *   → Task 생성 (status: "pending", actor: delegate target)
 *   → ActionLog (action_status: "needs_decision")
 *   → Proof 필수 (위임 대상 명시)
 * 
 * STOP (중단한다):
 *   → Task 생성 안 함
 *   → ActionLog (action_status: "cancelled" 의미)
 *   → Proof 선택적 (중단 사유)
 */
export const DECISION_RULES = {
  do: {
    creates_task: true,
    task_status: "active" as const,
    requires_log: true,
    requires_proof: false,
  },
  delegate: {
    creates_task: true,
    task_status: "pending" as const,
    requires_log: true,
    requires_proof: true,
  },
  stop: {
    creates_task: false,
    task_status: null,
    requires_log: false,
    requires_proof: false,
  },
} as const;
