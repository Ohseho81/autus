/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🗄️ AUTUS Sovereign Ledger (Dexie IndexedDB)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 서버 저장 0 원칙:
 * - 모든 데이터는 클라이언트 IndexedDB에만 저장
 * - API Route 없음, DB 커넥터 없음
 * - WebRTC DataChannel만 허용 (선택적 P2P)
 */

import Dexie, { type Table } from "dexie";
import type {
  Node,
  Motion,
  DecisionEvent,
  Task,
  ActionLog,
  Proof,
  LogicConfig,
  SyncMessage,
} from "./schema";

// ═══════════════════════════════════════════════════════════════════════════════
// Ledger Class
// ═══════════════════════════════════════════════════════════════════════════════

export class AutusLedger extends Dexie {
  // Tables
  nodes!: Table<Node, string>;
  motions!: Table<Motion, string>;
  decisions!: Table<DecisionEvent, string>;
  tasks!: Table<Task, string>;
  actionLogs!: Table<ActionLog, string>;
  proofs!: Table<Proof, string>;
  logic!: Table<LogicConfig, string>;
  syncMessages!: Table<SyncMessage, string>;

  constructor() {
    super("autus_sovereign_ledger");

    this.version(1).stores({
      // Primary key, then indexed fields
      nodes: "node_id, kind, tier, created_at",
      motions: "motion_id, kind, source_node_id, target_node_id, created_at",
      decisions: "event_id, decision, created_at, linked_task_id",
      tasks: "task_id, status, priority, source_decision_id, created_at, due_at",
      actionLogs: "log_id, task_id, action_status, logged_at",
      proofs: "proof_id, related_id, related_type, kind, created_at",
      logic: "config_id, updated_at",
      syncMessages: "message_id, type, sender_id, created_at",
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

export const ledger = new AutusLedger();

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 최근 N개 결정 조회
 */
export async function getRecentDecisions(limit = 10): Promise<DecisionEvent[]> {
  return ledger.decisions
    .orderBy("created_at")
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * 활성 태스크 조회
 */
export async function getActiveTasks(): Promise<Task[]> {
  return ledger.tasks
    .where("status")
    .anyOf(["pending", "active"])
    .toArray();
}

/**
 * 태스크별 로그 조회
 */
export async function getLogsForTask(taskId: string): Promise<ActionLog[]> {
  return ledger.actionLogs
    .where("task_id")
    .equals(taskId)
    .toArray();
}

/**
 * 증빙 조회
 */
export async function getProofsForRelated(relatedId: string): Promise<Proof[]> {
  return ledger.proofs
    .where("related_id")
    .equals(relatedId)
    .toArray();
}

/**
 * 통계 계산
 */
export async function getLedgerStats() {
  const [decisions, tasks, logs, proofs] = await Promise.all([
    ledger.decisions.count(),
    ledger.tasks.count(),
    ledger.actionLogs.count(),
    ledger.proofs.count(),
  ]);

  const delayedLogs = await ledger.actionLogs
    .where("action_status")
    .equals("delayed")
    .count();

  const needsDecisionLogs = await ledger.actionLogs
    .where("action_status")
    .equals("needs_decision")
    .count();

  const completedLogs = await ledger.actionLogs
    .where("action_status")
    .equals("completed")
    .count();

  return {
    decisions,
    tasks,
    logs,
    proofs,
    delayedLogs,
    needsDecisionLogs,
    completedLogs,
  };
}

/**
 * 전체 데이터 내보내기 (백업)
 */
export async function exportLedger(): Promise<string> {
  const data = {
    version: 1,
    exported_at: Date.now(),
    nodes: await ledger.nodes.toArray(),
    motions: await ledger.motions.toArray(),
    decisions: await ledger.decisions.toArray(),
    tasks: await ledger.tasks.toArray(),
    actionLogs: await ledger.actionLogs.toArray(),
    proofs: await ledger.proofs.toArray(),
    logic: await ledger.logic.toArray(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * 데이터 가져오기 (복원)
 */
export async function importLedger(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);

  await ledger.transaction(
    "rw",
    [
      ledger.nodes,
      ledger.motions,
      ledger.decisions,
      ledger.tasks,
      ledger.actionLogs,
      ledger.proofs,
      ledger.logic,
    ],
    async () => {
      // 기존 데이터 삭제
      await Promise.all([
        ledger.nodes.clear(),
        ledger.motions.clear(),
        ledger.decisions.clear(),
        ledger.tasks.clear(),
        ledger.actionLogs.clear(),
        ledger.proofs.clear(),
        ledger.logic.clear(),
      ]);

      // 새 데이터 추가
      if (data.nodes?.length) await ledger.nodes.bulkAdd(data.nodes);
      if (data.motions?.length) await ledger.motions.bulkAdd(data.motions);
      if (data.decisions?.length) await ledger.decisions.bulkAdd(data.decisions);
      if (data.tasks?.length) await ledger.tasks.bulkAdd(data.tasks);
      if (data.actionLogs?.length) await ledger.actionLogs.bulkAdd(data.actionLogs);
      if (data.proofs?.length) await ledger.proofs.bulkAdd(data.proofs);
      if (data.logic?.length) await ledger.logic.bulkAdd(data.logic);
    }
  );
}
