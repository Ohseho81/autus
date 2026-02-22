/**
 * Personal AI Factory - React Hook
 */

import { useState, useEffect, useCallback } from 'react';
import personalAIService from '../services/PersonalAIService';
import { captureError } from '../lib/sentry';
import type {
  PersonalAI,
  LifeLog,
  Pattern,
  Connector,
  Permission,
  ActionLog,
} from '../types/personalAI';

interface UsePersonalAIReturn {
  // State
  ai: PersonalAI | null;
  logs: LifeLog[];
  patterns: Pattern[];
  connectors: Connector[];
  permissions: Permission[];
  actions: ActionLog[];
  loading: boolean;
  error: string | null;

  // Actions
  logEvent: (eventType: string, rawData?: Record<string, unknown>) => Promise<LifeLog | null>;
  refreshAI: () => Promise<void>;
  refreshLogs: (limit?: number) => Promise<void>;
  refreshPatterns: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export function usePersonalAI(): UsePersonalAIReturn {
  const [ai, setAI] = useState<PersonalAI | null>(null);
  const [logs, setLogs] = useState<LifeLog[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAI = useCallback(async () => {
    try {
      const data = await personalAIService.getOrCreateMyAI();
      setAI(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch AI');
    }
  }, []);

  const refreshLogs = useCallback(async (limit = 20) => {
    try {
      const data = await personalAIService.getRecentLogs(limit);
      setLogs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    }
  }, []);

  const refreshPatterns = useCallback(async () => {
    try {
      const data = await personalAIService.getActivePatterns();
      setPatterns(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patterns');
    }
  }, []);

  const refreshConnectors = useCallback(async () => {
    try {
      const data = await personalAIService.getConnectors();
      setConnectors(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch connectors');
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    try {
      const data = await personalAIService.getPermissions();
      setPermissions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
    }
  }, []);

  const refreshActions = useCallback(async () => {
    try {
      const data = await personalAIService.getRecentActions();
      setActions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch actions');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        refreshAI(),
        refreshLogs(),
        refreshPatterns(),
        refreshConnectors(),
        refreshPermissions(),
        refreshActions(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [refreshAI, refreshLogs, refreshPatterns, refreshConnectors, refreshPermissions, refreshActions]);

  const logEvent = useCallback(async (
    eventType: string,
    rawData: Record<string, unknown> = {}
  ): Promise<LifeLog | null> => {
    try {
      const log = await personalAIService.logEvent(eventType, rawData);
      if (log) {
        setLogs(prev => [log, ...prev]);
        await refreshAI();
      }
      return log;
    } catch (err: unknown) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'logEvent', eventType });
      return null;
    }
  }, [refreshAI]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return {
    ai,
    logs,
    patterns,
    connectors,
    permissions,
    actions,
    loading,
    error,
    logEvent,
    refreshAI,
    refreshLogs,
    refreshPatterns,
    refreshAll,
  };
}

// Lightweight hook for just logging events
export function useLogEvent() {
  const logEvent = useCallback(async (
    eventType: string,
    rawData: Record<string, unknown> = {},
    options?: { source?: string; context?: Record<string, unknown> }
  ) => {
    return personalAIService.logEvent(eventType, rawData, options);
  }, []);

  return { logEvent };
}

// Hook for checking AI status
export function useAIStatus() {
  const [ai, setAI] = useState<PersonalAI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    personalAIService.getMyAI()
      .then(setAI)
      .catch((err) => captureError(err instanceof Error ? err : new Error(String(err)), { context: 'useAIStatus' }))
      .finally(() => setLoading(false));
  }, []);

  return { ai, loading };
}

export default usePersonalAI;
