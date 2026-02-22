/**
 * 🔌 useSupabaseData - 전역 Supabase 데이터 훅
 *
 * 모든 페이지에서 사용하는 실시간 데이터 레이어
 * Supabase 연결 시 실데이터, 실패 시 graceful fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';

const supabase = getSupabase();

// ============================================
// 캐시 레이어 (전역 싱글톤)
// ============================================
const cache = {
  data: {},
  timestamps: {},
  TTL: 30000, // 30초 캐시

  get(key) {
    const now = Date.now();
    if (this.data[key] && (now - this.timestamps[key]) < this.TTL) {
      return this.data[key];
    }
    return null;
  },

  set(key, value) {
    this.data[key] = value;
    this.timestamps[key] = Date.now();
  },

  invalidate(key) {
    delete this.data[key];
    delete this.timestamps[key];
  },

  invalidateAll() {
    this.data = {};
    this.timestamps = {};
  }
};

// ============================================
// 기본 쿼리 훅
// ============================================
export function useSupabaseQuery(table, options = {}) {
  const {
    select = '*',
    filter,
    order,
    limit,
    single = false,
    enabled = true,
    fallback = null,
    cacheKey = null,
  } = options;

  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured || !supabase) {
      setData(fallback);
      setLoading(false);
      return;
    }

    const key = cacheKey || `${table}:${select}:${JSON.stringify(filter)}:${JSON.stringify(order)}:${limit}`;
    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from(table).select(select);

      if (filter) {
        Object.entries(filter).forEach(([col, val]) => {
          if (Array.isArray(val)) {
            query = query.in(col, val);
          } else if (typeof val === 'object' && val !== null) {
            if (val.gt !== undefined) query = query.gt(col, val.gt);
            if (val.gte !== undefined) query = query.gte(col, val.gte);
            if (val.lt !== undefined) query = query.lt(col, val.lt);
            if (val.lte !== undefined) query = query.lte(col, val.lte);
            if (val.neq !== undefined) query = query.neq(col, val.neq);
          } else {
            query = query.eq(col, val);
          }
        });
      }

      if (order) {
        const { column, ascending = true } = typeof order === 'string'
          ? { column: order }
          : order;
        query = query.order(column, { ascending });
      }

      if (limit) query = query.limit(limit);
      if (single) query = query.single();

      const { data: result, error: queryError } = await query;

      if (!mountedRef.current) return;

      if (queryError) {
        console.warn(`[Supabase] ${table} 쿼리 실패:`, queryError.message);
        setData(fallback);
        setError(queryError);
      } else {
        cache.set(key, result);
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.warn(`[Supabase] ${table} 에러:`, e.message);
      setData(fallback);
      setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [table, select, JSON.stringify(filter), JSON.stringify(order), limit, single, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, isLive: isSupabaseConfigured && !error };
}

// ============================================
// 특화 훅: 학생 데이터
// ============================================
export function useStudents(options = {}) {
  const { limit: lim, withMetrics = false } = options;

  const result = useSupabaseQuery('atb_students', {
    select: '*',
    order: { column: 'name', ascending: true },
    limit: lim,
    fallback: [],
  });

  // 학생 데이터에 계산 메트릭 추가
  const enriched = (result.data || []).map(s => ({
    ...s,
    // V-Index 계산: V = (M - T) × (1 + σ)^t
    vIndex: calculateStudentVIndex(s),
    // 리스크 레벨 계산
    riskLevel: calculateRiskLevel(s),
    // 상태 분류
    stateLabel: getStateLabel(s),
  }));

  return { ...result, data: enriched };
}

// ============================================
// 특화 훅: V-Engine 메트릭
// ============================================
export function useVEngine() {
  return useSupabaseQuery('v_engine_metrics', {
    single: true,
    fallback: {
      minting: 24500000, taxation: 1200000, synergy: 1.42,
      time_months: 12, total_value: 1240000000,
      minting_change: 12.3, taxation_change: -5.2, synergy_change: 0.08,
    },
  });
}

// ============================================
// 특화 훅: AUTUS 노드 & 관계
// ============================================
export function useAutusNodes() {
  const nodes = useSupabaseQuery('autus_nodes', {
    select: '*',
    order: { column: 'lambda', ascending: false },
    fallback: [],
  });

  const relationships = useSupabaseQuery('autus_relationships', {
    select: '*',
    fallback: [],
  });

  return {
    nodes: nodes.data,
    relationships: relationships.data,
    loading: nodes.loading || relationships.loading,
    isLive: nodes.isLive,
  };
}

// ============================================
// 특화 훅: 이벤트 로그
// ============================================
export function useEvents(options = {}) {
  const { limit: lim = 20, eventType } = options;

  return useSupabaseQuery('events', {
    select: '*',
    filter: eventType ? { event_type: eventType } : undefined,
    order: { column: 'occurred_at', ascending: false },
    limit: lim,
    fallback: [],
  });
}

// ============================================
// 특화 훅: 감사 로그
// ============================================
export function useAuditLogs(options = {}) {
  const { limit: lim = 20, action } = options;

  return useSupabaseQuery('audit_logs', {
    select: '*',
    filter: action ? { action } : undefined,
    order: { column: 'changed_at', ascending: false },
    limit: lim,
    fallback: [],
  });
}

// ============================================
// 특화 훅: 조직 정보
// ============================================
export function useOrganization() {
  return useSupabaseQuery('organizations', {
    single: true,
    fallback: {
      name: 'onlyssam volleyball academy',
      slug: 'onlyssam',
      type: 'academy',
      status: 'active',
      tier: 'pro',
    },
  });
}

// ============================================
// 특화 훅: HUD 상태
// ============================================
export function useHudState() {
  const result = useSupabaseQuery('hud_state', {
    single: true,
    fallback: null,
  });

  // DB schema: { mode, confidence, safety, state (string: "WATCH"), next_action }
  // Map string state to numeric system_state for HUD compatibility
  const stateMap = {
    'OPTIMAL': 1, 'STABLE': 2, 'WATCH': 3,
    'ALERT': 4, 'RISK': 5, 'CRITICAL': 6,
  };

  const mapped = result.data ? {
    system_state: stateMap[result.data.state] || 2,
    confidence: result.data.confidence || 94.2,
    mode: result.data.mode || 'ASSISTED',
    safety: result.data.safety || 'NORMAL',
    next_action: result.data.next_action || '',
    v_index: 847,
  } : {
    system_state: 2,
    confidence: 94.2,
    v_index: 847,
  };

  return { ...result, data: mapped };
}

// ============================================
// 특화 훅: 자동화 로그
// ============================================
export function useAutomationLogs(options = {}) {
  const { limit: lim = 20 } = options;

  return useSupabaseQuery('automation_logs', {
    select: '*',
    order: { column: 'created_at', ascending: false },
    limit: lim,
    fallback: [],
  });
}

// ============================================
// 특화 훅: 코치 데이터
// ============================================
export function useCoaches() {
  return useSupabaseQuery('atb_coaches', {
    select: '*',
    fallback: [],
  });
}

// ============================================
// Realtime 구독 훅
// ============================================
export function useRealtimeTable(table, callback) {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel(`realtime-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        console.log(`[Realtime] ${table} 변경:`, payload.eventType);
        cache.invalidate(table);
        callback?.(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback]);
}

// ============================================
// 복합 훅: 대시보드 전체 데이터
// ============================================
export function useDashboardData() {
  const students = useStudents();
  const vEngine = useVEngine();
  const events = useEvents({ limit: 10 });
  const auditLogs = useAuditLogs({ limit: 10 });
  const org = useOrganization();
  const nodes = useAutusNodes();

  const loading = students.loading || vEngine.loading || events.loading;
  const isLive = students.isLive;

  // 집계 통계
  const stats = {
    totalStudents: (students.data || []).length,
    activeStudents: (students.data || []).filter(s => s.status === 'active').length,
    warningStudents: (students.data || []).filter(s => s.riskLevel === 'warning' || s.riskLevel === 'high').length,
    dangerStudents: (students.data || []).filter(s => s.riskLevel === 'critical').length,
    totalEvents: (events.data || []).length,
    // V-Index
    vTotal: vEngine.data?.total_value || 0,
    vMinting: vEngine.data?.minting || 0,
    vTaxation: vEngine.data?.taxation || 0,
    vSynergy: vEngine.data?.synergy || 0,
    // 조직
    orgName: org.data?.name || '',
    orgTier: org.data?.tier || 'free',
  };

  return {
    students: students.data,
    vEngine: vEngine.data,
    events: events.data,
    auditLogs: auditLogs.data,
    organization: org.data,
    nodes: nodes.nodes,
    relationships: nodes.relationships,
    stats,
    loading,
    isLive,
    refetch: () => {
      cache.invalidateAll();
      students.refetch();
      vEngine.refetch();
      events.refetch();
      auditLogs.refetch();
    },
  };
}

// ============================================
// 유틸리티 함수
// ============================================

function calculateStudentVIndex(student) {
  if (!student) return 0;
  const engagement = student.engagement_score || 70;
  const skill = student.skill_score || 50;
  const game = student.game_performance || 50;
  const nps = student.parent_nps || 50;

  // Mint = engagement × 10 + skill × 5 + game × 3
  const mint = engagement * 10 + skill * 5 + game * 3;
  // Tax = (100 - engagement) × 2
  const tax = (100 - engagement) * 2;
  // Synergy from NPS: σ = (nps - 50) / 100
  const sigma = (nps - 50) / 100;
  // Time factor (months active, estimate from created_at)
  const months = student.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(student.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)))
    : 6;

  // V = (M - T) × (1 + σ)^t
  const v = (mint - tax) * Math.pow(1 + sigma, Math.min(months, 24) / 12);
  return Math.round(v);
}

function calculateRiskLevel(student) {
  if (!student) return 'unknown';
  const engagement = student.engagement_score || 70;
  const nps = student.parent_nps || 50;

  if (engagement < 40 || nps < 20) return 'critical';
  if (engagement < 60 || nps < 35) return 'high';
  if (engagement < 75 || nps < 50) return 'warning';
  return 'normal';
}

function getStateLabel(student) {
  const risk = calculateRiskLevel(student);
  const map = {
    normal: { state: 1, label: 'OPTIMAL', color: '#22c55e' },
    warning: { state: 3, label: 'WATCH', color: '#eab308' },
    high: { state: 4, label: 'ALERT', color: '#f97316' },
    critical: { state: 5, label: 'RISK', color: '#ef4444' },
    unknown: { state: 2, label: 'STABLE', color: '#3b82f6' },
  };
  return map[risk] || map.unknown;
}

// ============================================
// Export
// ============================================
export { cache, isSupabaseConfigured };
export default useDashboardData;
