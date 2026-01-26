/**
 * API 데이터 훅
 * 
 * 캐싱 + 자동 갱신 + Mock 폴백
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './index';

// ============================================
// Generic Data Hook
// ============================================
export function useApiData(fetchFn, deps = [], options = {}) {
  const {
    initialData = null,
    refreshInterval = 0, // 0 = 자동 갱신 없음
    enabled = true,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      const result = await fetchFn();
      
      if (mountedRef.current) {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result.data);
          setError(null);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn, enabled]);

  // 초기 fetch + deps 변경 시
  useEffect(() => {
    fetch();
  }, [fetch, ...deps]);

  // 자동 갱신
  useEffect(() => {
    if (refreshInterval > 0 && enabled) {
      const interval = setInterval(fetch, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetch, refreshInterval, enabled]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(() => {
    return fetch();
  }, [fetch]);

  return { data, loading, error, refetch };
}

// ============================================
// Students Hooks
// ============================================

// Mock 데이터
const MOCK_STUDENTS = [
  { id: 1, name: '김민수', state: 6, signals: ['연속 결석 3회', '성적 하락'], probability: 94 },
  { id: 2, name: '이지은', state: 5, signals: ['학부모 민원'], probability: 78 },
  { id: 3, name: '박서연', state: 2, signals: [], probability: 15 },
  { id: 4, name: '최준혁', state: 5, signals: ['장기 저조'], probability: 72 },
];

export function useStudents(filters = {}) {
  return useApiData(
    () => api.students.getAll(filters),
    [JSON.stringify(filters)],
    { initialData: MOCK_STUDENTS }
  );
}

export function useStudent(id) {
  return useApiData(
    () => api.students.getById(id),
    [id],
    { enabled: !!id }
  );
}

export function useRiskStudents() {
  const mockRisks = MOCK_STUDENTS.filter(s => s.state >= 5);
  
  return useApiData(
    () => api.students.getRiskStudents(),
    [],
    {
      initialData: mockRisks,
      refreshInterval: 30000, // 30초마다 갱신
    }
  );
}

// ============================================
// Activities Hooks
// ============================================

const MOCK_ACTIVITIES = [
  { id: 1, type: 'alert', message: '김민수 State 6 진입', time: '10:32', delta_v: -0.5 },
  { id: 2, type: 'success', message: '주간 리포트 자동 발송 완료', time: '10:15', delta_v: 0.3 },
  { id: 3, type: 'payment', message: '박서연 결제 완료 (₩450,000)', time: '10:08', delta_v: 0.2 },
  { id: 4, type: 'standard', message: '출석 알림 표준화 승인', time: '09:45', delta_v: 1.0 },
];

export function useRecentActivities(limit = 10) {
  return useApiData(
    () => api.activities.getRecent(limit),
    [limit],
    {
      initialData: MOCK_ACTIVITIES,
      refreshInterval: 10000, // 10초마다 갱신
    }
  );
}

// ============================================
// Dashboard Stats Hook
// ============================================

const MOCK_STATS = {
  totalStudents: 156,
  vIndex: 847.3,
  automationRate: 78.5,
  riskCount: 6,
  stateDistribution: { 1: 45, 2: 68, 3: 25, 4: 12, 5: 4, 6: 2 },
};

export function useDashboardStats() {
  const [stats, setStats] = useState(MOCK_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const result = await api.stats.getDashboard();
      if (result.data) {
        setStats(prev => ({ ...prev, ...result.data }));
      }
      setLoading(false);
    };

    fetchStats();

    // 실시간 시뮬레이션 (Supabase 미연결 시)
    if (!api.isConfigured) {
      const interval = setInterval(() => {
        setStats(prev => ({
          ...prev,
          vIndex: prev.vIndex + (Math.random() - 0.3) * 2,
          automationRate: Math.min(100, Math.max(50, prev.automationRate + (Math.random() - 0.5) * 2)),
        }));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  return { stats, loading };
}

// ============================================
// Solutions Hooks
// ============================================

const MOCK_SOLUTIONS = [
  { id: 1, task: '출석 독려', solution: '알림톡 + 전화', usageCount: 47, effectiveness: 92, status: 'standardized', createdBy: '김선생' },
  { id: 2, task: '숙제 미제출', solution: '1:1 면담 + 학부모 알림', usageCount: 38, effectiveness: 85, status: 'standardized', createdBy: '이선생' },
  { id: 3, task: '성적 하락', solution: '보충 수업 + 동기부여 카드', usageCount: 25, effectiveness: 78, status: 'proposed', createdBy: 'AI' },
];

export function useSolutions(status = null) {
  return useApiData(
    () => api.solutions.getAll(status),
    [status],
    { initialData: MOCK_SOLUTIONS }
  );
}

// ============================================
// Mutation Hooks
// ============================================

export function useMutation(mutationFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await mutationFn(...args);
      
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      
      return { success: true, data: result.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [mutationFn]);

  return { mutate, loading, error };
}

export default {
  useApiData,
  useStudents,
  useStudent,
  useRiskStudents,
  useRecentActivities,
  useDashboardStats,
  useSolutions,
  useMutation,
};
