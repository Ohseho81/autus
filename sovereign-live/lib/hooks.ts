"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🪝 Efficiency Hooks
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 리렌더링 최소화 + 메모이제이션
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "./ledger";
import { cachedQuery, debounce, throttle } from "./performance";

// ═══════════════════════════════════════════════════════════════════════════════
// Ledger Stats (캐시됨)
// ═══════════════════════════════════════════════════════════════════════════════

export function useLedgerStats() {
  return useLiveQuery(async () => {
    return cachedQuery("ledger-stats", async () => {
      const [decisions, tasks, logs, proofs] = await Promise.all([
        ledger.decisions.count(),
        ledger.tasks.count(),
        ledger.actionLogs.count(),
        ledger.proofs.count(),
      ]);
      return { decisions, tasks, logs, proofs };
    }, 3000);
  }, []);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Recent Data (최적화)
// ═══════════════════════════════════════════════════════════════════════════════

export function useRecentDecisions(limit = 10) {
  return useLiveQuery(
    () => ledger.decisions.orderBy("created_at").reverse().limit(limit).toArray(),
    [limit]
  );
}

export function useActiveTasks() {
  return useLiveQuery(
    () => ledger.tasks.where("status").anyOf(["pending", "active"]).toArray(),
    []
  );
}

export function usePendingLogs() {
  return useLiveQuery(
    () => ledger.actionLogs.where("action_status").equals("needs_decision").toArray(),
    []
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Debounced Input
// ═══════════════════════════════════════════════════════════════════════════════

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay = 300
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay) as T,
    [delay]
  );
}

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit = 100
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => throttle((...args: Parameters<T>) => callbackRef.current(...args), limit) as T,
    [limit]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Previous Value
// ═══════════════════════════════════════════════════════════════════════════════

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Local Storage (SSR-safe)
// ═══════════════════════════════════════════════════════════════════════════════

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Intersection Observer (가시성 감지)
// ═══════════════════════════════════════════════════════════════════════════════

export function useInView(threshold = 0.1) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Media Query
// ═══════════════════════════════════════════════════════════════════════════════

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery("(max-width: 768px)");
}

export function useIsDarkMode() {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Window Size
// ═══════════════════════════════════════════════════════════════════════════════

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = throttle(() => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }, 100);

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Metrics (창업자용)
// ═══════════════════════════════════════════════════════════════════════════════

export function useFounderMetrics() {
  const decisions = useLiveQuery(() => ledger.decisions.toArray(), []);
  const tasks = useLiveQuery(() => ledger.tasks.toArray(), []);
  const logs = useLiveQuery(() => ledger.actionLogs.toArray(), []);

  return useMemo(() => {
    if (!decisions || !tasks || !logs) return null;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * dayMs;

    const thisWeekDecisions = decisions.filter((d) => d.created_at > weekAgo);
    const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "active");
    const completedLogs = logs.filter((l) => l.action_status === "completed");
    const delayedLogs = logs.filter((l) => l.action_status === "delayed");

    const executionRate = logs.length > 0
      ? Math.round((completedLogs.length / logs.length) * 100)
      : 0;

    const burnoutScore = Math.min(100, Math.max(0,
      pendingTasks.length * 5 +
      delayedLogs.length * 10 -
      completedLogs.length * 2
    ));

    const decisionsPerDay = thisWeekDecisions.length > 0
      ? (thisWeekDecisions.length / 7).toFixed(1)
      : "0";

    return {
      totalDecisions: decisions.length,
      thisWeekDecisions: thisWeekDecisions.length,
      pendingTasks: pendingTasks.length,
      completedTasks: completedLogs.length,
      delayedTasks: delayedLogs.length,
      executionRate,
      burnoutScore,
      decisionsPerDay,
    };
  }, [decisions, tasks, logs]);
}
