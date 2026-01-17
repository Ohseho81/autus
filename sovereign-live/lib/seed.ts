/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌱 Seed Data Injection
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 초기 데이터 주입 (빈 Ledger일 때만 실행)
 */

import { nanoid } from "nanoid";
import { ledger } from "./ledger";
import type { Node, LogicConfig, Task } from "./schema";

export async function seedIfEmpty(): Promise<boolean> {
  const count = await ledger.nodes.count();
  if (count > 0) return false;

  const now = Date.now();

  // ═══════════════════════════════════════════════════════════════════════════
  // 기본 노드 (1-12-144 구조)
  // ═══════════════════════════════════════════════════════════════════════════

  const nodes: Node[] = [
    // Tier 1: 핵심 (1인)
    { node_id: nanoid(), kind: "person", label: "Master", tier: 1, created_at: now },
    
    // Tier 2: 조직 (12)
    { node_id: nanoid(), kind: "org", label: "X City / Clark SPC", tier: 2, created_at: now },
    { node_id: nanoid(), kind: "org", label: "AUTUS Corp", tier: 2, created_at: now },
    
    // Tier 2: 핵심 인력
    { node_id: nanoid(), kind: "person", label: "Yeon-woo", tier: 2, created_at: now },
    { node_id: nanoid(), kind: "person", label: "Son", tier: 2, created_at: now },
    { node_id: nanoid(), kind: "person", label: "Philippine Managers", tier: 2, created_at: now },
    
    // 자산/부채 노드
    { node_id: nanoid(), kind: "asset", label: "Capital: 300M KRW", tier: 3, created_at: now },
    { node_id: nanoid(), kind: "asset", label: "Debt: 800M KRW (1.5%/mo)", tier: 3, created_at: now },
    { node_id: nanoid(), kind: "power", label: "Decision Authority", tier: 1, created_at: now },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // 초기 설정
  // ═══════════════════════════════════════════════════════════════════════════

  const logic: LogicConfig = {
    config_id: nanoid(),
    updated_at: now,
    weights: {
      mint: 1.0,
      tax: 1.0,
      synergy: 1.0,
    },
    rules: {
      narrative_mode: "template",
      auto_delegate_threshold: 80,
      proof_required: false,
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 샘플 태스크
  // ═══════════════════════════════════════════════════════════════════════════

  const sampleTasks: Task[] = [
    {
      task_id: nanoid(),
      created_at: now,
      title: "Q1 재무 보고서 검토",
      description: "분기별 재무 현황 분석 및 이사회 보고 자료 준비",
      priority: "high",
      due_at: now + 7 * 24 * 60 * 60 * 1000, // 7일 후
      status: "pending",
    },
    {
      task_id: nanoid(),
      created_at: now,
      title: "신규 직원 온보딩 프로세스 정비",
      description: "표준 온보딩 체크리스트 및 교육 자료 업데이트",
      priority: "medium",
      due_at: now + 14 * 24 * 60 * 60 * 1000, // 14일 후
      status: "pending",
    },
    {
      task_id: nanoid(),
      created_at: now,
      title: "월간 운영 비용 최적화 분석",
      description: "불필요한 SaaS 구독 정리 및 비용 절감 방안 도출",
      priority: "medium",
      due_at: null,
      status: "active",
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // 트랜잭션으로 일괄 저장
  // ═══════════════════════════════════════════════════════════════════════════

  await ledger.transaction(
    "rw",
    [ledger.nodes, ledger.logic, ledger.tasks],
    async () => {
      await ledger.nodes.bulkAdd(nodes);
      await ledger.logic.add(logic);
      await ledger.tasks.bulkAdd(sampleTasks);
    }
  );

  console.log("[Seed] Initial data injected:", {
    nodes: nodes.length,
    tasks: sampleTasks.length,
  });

  return true;
}
