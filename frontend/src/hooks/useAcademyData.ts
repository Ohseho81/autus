/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Academy Data Hook
 * autus-ai.com 연동 학원 관리 데이터 훅
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  autusCloud, 
  useAutusCloud,
  type Student,
  type Teacher,
  type RiskItem,
  type Goal,
  type ChurnAnalysis,
  type AcademyDashboard,
} from '../api/autus-cloud';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UseAcademyDataOptions {
  orgId: string;
  autoFetch?: boolean;
  refreshInterval?: number; // ms, 0 = no auto refresh
}

interface AcademyDataState {
  dashboard: AcademyDashboard | null;
  students: Student[];
  teachers: Teacher[];
  risks: RiskItem[];
  goals: Goal[];
  churnAnalysis: ChurnAnalysis | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAcademyData(options: UseAcademyDataOptions) {
  const { orgId, autoFetch = true, refreshInterval = 0 } = options;
  
  const [state, setState] = useState<AcademyDataState>({
    dashboard: null,
    students: [],
    teachers: [],
    risks: [],
    goals: [],
    churnAnalysis: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });
  
  // Fetch all data
  const fetchAll = useCallback(async () => {
    if (!orgId) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Parallel fetch
      const [dashboardRes, studentsRes, teachersRes, risksRes, goalsRes, churnRes] = await Promise.all([
        autusCloud.academy.getDashboard(orgId),
        autusCloud.academy.getStudents(orgId),
        autusCloud.academy.getTeachers(orgId),
        autusCloud.risk.getList(orgId),
        autusCloud.goals.getList(orgId),
        autusCloud.churn.analyze(orgId),
      ]);
      
      setState({
        dashboard: dashboardRes.success ? dashboardRes.data || null : null,
        students: studentsRes.success ? studentsRes.data?.students || [] : [],
        teachers: teachersRes.success ? teachersRes.data?.teachers || [] : [],
        risks: risksRes.success ? risksRes.data?.risks || [] : [],
        goals: goalsRes.success ? goalsRes.data?.goals || [] : [],
        churnAnalysis: churnRes.success ? churnRes.data || null : null,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '데이터 로드 실패',
      }));
    }
  }, [orgId]);
  
  // Auto fetch on mount
  useEffect(() => {
    if (autoFetch && orgId) {
      fetchAll();
    }
  }, [autoFetch, orgId, fetchAll]);
  
  // Auto refresh
  useEffect(() => {
    if (refreshInterval > 0 && orgId) {
      const interval = setInterval(fetchAll, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, orgId, fetchAll]);
  
  // Computed values
  const computed = useMemo(() => {
    const atRiskStudents = state.students.filter(s => s.status === 'danger' || s.status === 'warning');
    const criticalRisks = state.risks.filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH');
    const activeGoals = state.goals.filter(g => g.status !== 'achieved');
    const averageTemperature = state.students.length > 0
      ? state.students.reduce((sum, s) => sum + s.temperature, 0) / state.students.length
      : 0;
    
    return {
      atRiskStudents,
      atRiskCount: atRiskStudents.length,
      criticalRisks,
      criticalRiskCount: criticalRisks.length,
      activeGoals,
      activeGoalCount: activeGoals.length,
      averageTemperature: Math.round(averageTemperature),
      totalStudents: state.students.length,
      totalTeachers: state.teachers.length,
    };
  }, [state.students, state.risks, state.goals]);
  
  // Actions
  const actions = useMemo(() => ({
    refresh: fetchAll,
    
    updateStudentTemperature: async (studentId: string, delta: number, reason: string) => {
      const result = await autusCloud.academy.updateStudentTemperature(studentId, delta, reason);
      if (result.success) {
        fetchAll(); // Refresh after update
      }
      return result;
    },
    
    resolveRisk: async (riskId: string, notes?: string) => {
      const result = await autusCloud.risk.updateStatus(riskId, 'resolve', { notes });
      if (result.success) {
        fetchAll();
      }
      return result;
    },
    
    createGoal: async (data: Parameters<typeof autusCloud.goals.create>[0]) => {
      const result = await autusCloud.goals.create(data);
      if (result.success) {
        fetchAll();
      }
      return result;
    },
    
    updateGoalProgress: async (goalId: string, current: number) => {
      const result = await autusCloud.goals.updateProgress(goalId, current);
      if (result.success) {
        fetchAll();
      }
      return result;
    },
    
    submitQuickTag: async (data: Parameters<typeof autusCloud.quickTag.create>[0]) => {
      return autusCloud.quickTag.create(data);
    },
    
    sendNotification: async (data: Parameters<typeof autusCloud.notify.send>[0]) => {
      return autusCloud.notify.send(data);
    },
    
    syncData: async () => {
      const result = await autusCloud.sync.all(orgId);
      if (result.success) {
        fetchAll();
      }
      return result;
    },
  }), [orgId, fetchAll]);
  
  return {
    ...state,
    ...computed,
    ...actions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Data Hooks
// ─────────────────────────────────────────────────────────────────────────────

/** 학생 목록 전용 훅 */
export function useStudents(orgId: string, filters?: { status?: string; grade?: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    
    const result = await autusCloud.academy.getStudents(orgId, filters);
    
    setLoading(false);
    if (result.success && result.data) {
      setStudents(result.data.students);
    } else {
      setError(result.error || '학생 목록 로드 실패');
    }
  }, [orgId, filters?.status, filters?.grade]);
  
  useEffect(() => {
    fetch();
  }, [fetch]);
  
  return { students, loading, error, refresh: fetch };
}

/** 위험 목록 전용 훅 */
export function useRisks(orgId: string, options?: { status?: string; minPriority?: string }) {
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    
    const result = await autusCloud.risk.getList(orgId, options);
    
    setLoading(false);
    if (result.success && result.data) {
      setRisks(result.data.risks);
    } else {
      setError(result.error || '위험 목록 로드 실패');
    }
  }, [orgId, options?.status, options?.minPriority]);
  
  useEffect(() => {
    fetch();
  }, [fetch]);
  
  const resolve = useCallback(async (riskId: string, notes?: string) => {
    const result = await autusCloud.risk.updateStatus(riskId, 'resolve', { notes });
    if (result.success) {
      fetch();
    }
    return result;
  }, [fetch]);
  
  return { risks, loading, error, refresh: fetch, resolve };
}

/** 목표 전용 훅 */
export function useGoals(orgId: string, filters?: { type?: string; status?: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    
    const result = await autusCloud.goals.getList(orgId, filters);
    
    setLoading(false);
    if (result.success && result.data) {
      setGoals(result.data.goals);
    } else {
      setError(result.error || '목표 목록 로드 실패');
    }
  }, [orgId, filters?.type, filters?.status]);
  
  useEffect(() => {
    fetch();
  }, [fetch]);
  
  const updateProgress = useCallback(async (goalId: string, current: number) => {
    const result = await autusCloud.goals.updateProgress(goalId, current);
    if (result.success) {
      fetch();
    }
    return result;
  }, [fetch]);
  
  return { goals, loading, error, refresh: fetch, updateProgress };
}

/** 리더보드 전용 훅 */
export function useLeaderboard(orgId: string, scope: 'class' | 'grade' | 'academy' = 'class') {
  const [entries, setEntries] = useState<{ rank: number; nodeId: string; name: string; score: number; level: number }[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    
    const result = await autusCloud.leaderboard.get(orgId, scope);
    
    setLoading(false);
    if (result.success && result.data) {
      setEntries(result.data.entries);
      setMyRank(result.data.myRank || null);
    }
  }, [orgId, scope]);
  
  useEffect(() => {
    fetch();
  }, [fetch]);
  
  return { entries, myRank, loading, refresh: fetch };
}

/** 보상 현황 전용 훅 */
export function useRewards(nodeId: string) {
  const [rewards, setRewards] = useState<{
    balance: number;
    lifetime: number;
    level: number;
    nextLevelProgress: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fetch = useCallback(async () => {
    if (!nodeId) return;
    setLoading(true);
    
    const result = await autusCloud.rewards.getStatus(nodeId);
    
    setLoading(false);
    if (result.success && result.data) {
      setRewards(result.data);
    }
  }, [nodeId]);
  
  useEffect(() => {
    fetch();
  }, [fetch]);
  
  return { rewards, loading, refresh: fetch };
}

export default useAcademyData;
