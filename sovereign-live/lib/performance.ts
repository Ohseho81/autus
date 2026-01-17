/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚡ Performance Optimization
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * AUTUS 효율 극대화:
 * - 배치 처리
 * - 디바운싱
 * - 메모이제이션
 * - 프리페칭
 */

import { ledger } from "./ledger";
import type { DecisionEvent, Task, ActionLog, Proof } from "./schema";

// ═══════════════════════════════════════════════════════════════════════════════
// Batch Processing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 대량 결정 일괄 처리
 */
export async function batchCommitDecisions(
  decisions: Array<{
    title: string;
    context: string;
    decision: "do" | "delegate" | "stop";
  }>
): Promise<string[]> {
  const eventIds: string[] = [];
  const now = Date.now();

  await ledger.transaction("rw", [ledger.decisions, ledger.tasks], async () => {
    for (const d of decisions) {
      const eventId = `evt_${now}_${Math.random().toString(36).slice(2, 8)}`;
      eventIds.push(eventId);

      await ledger.decisions.add({
        event_id: eventId,
        created_at: now,
        title: d.title,
        context: d.context,
        decision: d.decision,
      });

      if (d.decision !== "stop") {
        const taskId = `tsk_${now}_${Math.random().toString(36).slice(2, 8)}`;
        await ledger.tasks.add({
          task_id: taskId,
          created_at: now,
          title: d.title,
          description: d.context,
          priority: "medium",
          due_at: null,
          source_decision_id: eventId,
          status: d.decision === "do" ? "active" : "pending",
        });
      }
    }
  });

  return eventIds;
}

/**
 * 대량 로그 일괄 기록
 */
export async function batchLogActions(
  logs: Array<{
    taskId: string;
    status: "completed" | "delayed" | "needs_decision" | "in_progress";
  }>
): Promise<void> {
  const now = Date.now();

  await ledger.transaction("rw", [ledger.actionLogs, ledger.tasks], async () => {
    for (const log of logs) {
      await ledger.actionLogs.add({
        log_id: `log_${now}_${Math.random().toString(36).slice(2, 8)}`,
        task_id: log.taskId,
        actor_role: "employee",
        action_status: log.status,
        time_spent_min: null,
        used_tools: [],
        logged_at: now,
      });

      if (log.status === "completed") {
        await ledger.tasks.update(log.taskId, { status: "done" });
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Debounce & Throttle
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 디바운스
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 쓰로틀
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Memoization Cache
// ═══════════════════════════════════════════════════════════════════════════════

const cache = new Map<string, { value: any; expiry: number }>();

/**
 * 캐시된 쿼리
 */
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttlMs = 5000
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiry > now) {
    return cached.value;
  }

  const value = await queryFn();
  cache.set(key, { value, expiry: now + ttlMs });
  return value;
}

/**
 * 캐시 무효화
 */
export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      cache.delete(key);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Prefetching
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 핵심 데이터 프리페치
 */
export async function prefetchCriticalData(): Promise<void> {
  await Promise.all([
    cachedQuery("stats", () => import("./ledger").then(m => m.getLedgerStats())),
    cachedQuery("recentDecisions", () => 
      ledger.decisions.orderBy("created_at").reverse().limit(10).toArray()
    ),
    cachedQuery("activeTasks", () =>
      ledger.tasks.where("status").anyOf(["pending", "active"]).toArray()
    ),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Metrics
// ═══════════════════════════════════════════════════════════════════════════════

interface PerformanceMetrics {
  pageLoadTime: number;
  dbQueryTime: number;
  renderTime: number;
  memoryUsage: number;
}

const metrics: PerformanceMetrics = {
  pageLoadTime: 0,
  dbQueryTime: 0,
  renderTime: 0,
  memoryUsage: 0,
};

/**
 * 쿼리 시간 측정
 */
export async function measureQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await queryFn();
  const duration = performance.now() - start;

  metrics.dbQueryTime = duration;
  
  if (duration > 100) {
    console.warn(`[Perf] Slow query: ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * 메트릭 조회
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  if (typeof window !== "undefined" && "performance" in window) {
    const memory = (performance as any).memory;
    if (memory) {
      metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    }
  }
  return { ...metrics };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Lazy Loading
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 컴포넌트 지연 로딩
 */
export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  const LazyComponent = React.lazy(factory);
  
  return {
    Component: LazyComponent,
    preload: factory,
  };
}

import React from "react";
