/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Cloud API Client
 * autus-ai.com 연동 전용 클라이언트
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const AUTUS_CLOUD_URL = import.meta.env.VITE_AUTUS_API_URL || 'https://autus-ai.com';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base Request Function
// ─────────────────────────────────────────────────────────────────────────────

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, timeout = 15000 } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${AUTUS_CLOUD_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}`,
      };
    }
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: '요청 시간 초과' };
      }
      return { success: false, error: error.message };
    }
    
    return { success: false, error: '알 수 없는 오류' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

export const healthApi = {
  /** 서버 상태 확인 */
  check: () => request<{ status: string; version: string }>('/api/health'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Academy API (학원 관리)
// ─────────────────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  grade: string;
  temperature: number;
  status: 'danger' | 'warning' | 'good';
  metrics: {
    attendance: number;
    homework: number;
    gradeChange: number;
  };
}

export interface Teacher {
  id: string;
  name: string;
  performance: number;
  assignedStudents: number;
  status: 'available' | 'teaching' | 'consulting' | 'off';
}

export interface AcademyDashboard {
  totalStudents: number;
  atRiskCount: number;
  revenue: number;
  revenueTarget: number;
  teacherCount: number;
  todayClasses: number;
}

export const academyApi = {
  /** 대시보드 데이터 */
  getDashboard: (orgId: string) => 
    request<AcademyDashboard>(`/api/autus/academy/dashboard?org_id=${orgId}`),
  
  /** 학생 목록 */
  getStudents: (orgId: string, filters?: { status?: string; grade?: string }) => {
    const params = new URLSearchParams({ org_id: orgId, ...filters });
    return request<{ students: Student[] }>(`/api/autus/academy/students?${params}`);
  },
  
  /** 학생 상세 */
  getStudent: (studentId: string) =>
    request<Student>(`/api/autus/academy/students/${studentId}`),
  
  /** 학생 온도 업데이트 */
  updateStudentTemperature: (studentId: string, delta: number, reason: string) =>
    request<Student>(`/api/autus/academy/students/${studentId}/temperature`, {
      method: 'POST',
      body: { delta, reason },
    }),
  
  /** 강사 목록 */
  getTeachers: (orgId: string) =>
    request<{ teachers: Teacher[] }>(`/api/autus/academy/teachers?org_id=${orgId}`),
  
  /** 강사 상세 */
  getTeacher: (teacherId: string) =>
    request<Teacher>(`/api/autus/academy/teachers/${teacherId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Risk Management API (이탈 위험 관리)
// ─────────────────────────────────────────────────────────────────────────────

export interface RiskItem {
  id: string;
  targetId: string;
  targetName: string;
  targetType: 'student' | 'parent';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  factors: string[];
  recommendedActions: string[];
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export const riskApi = {
  /** 위험 목록 조회 */
  getList: (orgId: string, options?: { status?: string; minPriority?: string }) => {
    const params = new URLSearchParams({ 
      org_id: orgId, 
      status: options?.status || 'open',
      min_priority: options?.minPriority || 'LOW',
    });
    return request<{ risks: RiskItem[]; total: number }>(`/api/risks?${params}`);
  },
  
  /** 위험도 재계산 */
  recalculate: (orgId: string, alpha: number = 1.5) =>
    request<{ recalculated: number }>('/api/risks', {
      method: 'POST',
      body: { org_id: orgId, recalculate: true, alpha },
    }),
  
  /** 위험 상태 업데이트 */
  updateStatus: (
    riskId: string, 
    action: 'resolve' | 'escalate' | 'assign' | 'dismiss',
    options?: { notes?: string; assigned_to?: string }
  ) =>
    request<RiskItem>('/api/risks', {
      method: 'PATCH',
      body: { risk_id: riskId, action, ...options },
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Goals API (목표 관리)
// ─────────────────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  type: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
  milestones?: GoalMilestone[];
}

export interface GoalMilestone {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
}

export const goalsApi = {
  /** 목표 목록 */
  getList: (orgId: string, filters?: { type?: string; status?: string }) => {
    const params = new URLSearchParams({ org_id: orgId, ...filters });
    return request<{ goals: Goal[] }>(`/api/goals?${params}`);
  },
  
  /** 목표 생성 */
  create: (data: {
    org_id: string;
    type: string;
    title: string;
    target: number;
    unit: string;
    start_date: string;
    end_date: string;
    description?: string;
  }) =>
    request<Goal>('/api/goals', {
      method: 'POST',
      body: { action: 'create', ...data },
    }),
  
  /** 진행률 업데이트 */
  updateProgress: (goalId: string, current: number) =>
    request<Goal>('/api/goals', {
      method: 'POST',
      body: { action: 'update_progress', goal_id: goalId, current },
    }),
  
  /** AI 자동 계획 생성 */
  generatePlan: (goalId: string) =>
    request<{ plan: string[]; milestones: GoalMilestone[] }>('/api/goals/auto-plan', {
      method: 'POST',
      body: { goal_id: goalId },
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Quick Tag API (현장 데이터 입력)
// ─────────────────────────────────────────────────────────────────────────────

export interface QuickTag {
  id: string;
  orgId: string;
  taggerId: string;
  targetId: string;
  targetType: 'student' | 'parent' | 'teacher';
  emotionDelta: number;
  bondStrength: 'strong' | 'normal' | 'cold';
  issueTriggers?: string[];
  voiceInsight?: string;
  createdAt: string;
}

export const quickTagApi = {
  /** Quick Tag 등록 */
  create: (data: {
    org_id: string;
    tagger_id: string;
    target_id: string;
    target_type: 'student' | 'parent' | 'teacher';
    emotion_delta: number;
    bond_strength: 'strong' | 'normal' | 'cold';
    issue_triggers?: string[];
    voice_insight?: string;
  }) =>
    request<QuickTag>('/api/quick-tag', {
      method: 'POST',
      body: data,
    }),
  
  /** 최근 태그 조회 */
  getRecent: (orgId: string, limit: number = 20) =>
    request<{ tags: QuickTag[] }>(`/api/quick-tag?org_id=${orgId}&limit=${limit}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Churn Analysis API (이탈 분석)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChurnAnalysis {
  summary: {
    totalAtRisk: number;
    criticalCount: number;
    projectedLoss: number;
  };
  byCategory: Record<string, number>;
  topFactors: string[];
  recommendations: string[];
}

export const churnApi = {
  /** 이탈 분석 */
  analyze: (orgId: string) =>
    request<ChurnAnalysis>(`/api/churn?org_id=${orgId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification API (알림)
// ─────────────────────────────────────────────────────────────────────────────

export const notifyApi = {
  /** 알림 발송 */
  send: (data: {
    org_id: string;
    type: 'risk_alert' | 'goal_update' | 'system' | 'message';
    recipients: string[];
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    channel?: 'push' | 'sms' | 'kakao' | 'email';
  }) =>
    request<{ sent: number; failed: number }>('/api/notify', {
      method: 'POST',
      body: data,
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Reports API (리포트)
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportData {
  period: string;
  kpis: Record<string, { value: number; change: number; target?: number }>;
  charts: Record<string, { labels: string[]; data: number[] }>;
  insights: string[];
}

export const reportsApi = {
  /** 리포트 생성 */
  generate: (orgId: string, type: 'daily' | 'weekly' | 'monthly', options?: { format?: 'json' | 'pdf' }) =>
    request<ReportData>('/api/report/generate', {
      method: 'POST',
      body: { org_id: orgId, type, ...options },
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Sync API (데이터 동기화)
// ─────────────────────────────────────────────────────────────────────────────

export const syncApi = {
  /** 전체 동기화 */
  all: (orgId: string) =>
    request<{ synced: Record<string, number> }>('/api/sync/all', {
      method: 'POST',
      body: { org_id: orgId },
    }),
  
  /** Classting 동기화 */
  classting: (orgId: string) =>
    request<{ students: number; attendance: number }>('/api/sync/classting', {
      method: 'POST',
      body: { org_id: orgId },
    }),
  
  /** Narakhub 동기화 */
  narakhub: (orgId: string) =>
    request<{ members: number; payments: number }>('/api/sync/narakhub', {
      method: 'POST',
      body: { org_id: orgId },
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Rewards API (V-포인트 / 보상)
// ─────────────────────────────────────────────────────────────────────────────

export interface RewardStatus {
  balance: number;
  lifetime: number;
  level: number;
  nextLevelProgress: number;
  recentActivity: { type: string; amount: number; date: string }[];
}

export const rewardsApi = {
  /** 보상 현황 */
  getStatus: (nodeId: string) =>
    request<RewardStatus>(`/api/rewards?node_id=${nodeId}`),
  
  /** 포인트 지급 */
  grant: (nodeId: string, amount: number, reason: string) =>
    request<{ newBalance: number }>('/api/rewards', {
      method: 'POST',
      body: { node_id: nodeId, action: 'grant', amount, reason },
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard API (리더보드)
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  nodeId: string;
  name: string;
  score: number;
  level: number;
  avatar?: string;
}

export const leaderboardApi = {
  /** 리더보드 조회 */
  get: (orgId: string, scope: 'class' | 'grade' | 'academy' = 'class', limit: number = 10) =>
    request<{ entries: LeaderboardEntry[]; myRank?: number }>(`/api/leaderboard?org_id=${orgId}&scope=${scope}&limit=${limit}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Brain API (AI 분석)
// ─────────────────────────────────────────────────────────────────────────────

export const brainApi = {
  /** V-Pulse 분석 */
  vPulse: (orgId: string) =>
    request<{ pulse: number; trend: string; insights: string[] }>(`/api/brain/v-pulse?org_id=${orgId}`),
  
  /** AI 스크립트 생성 */
  script: (context: { target_type: string; situation: string; goal: string }) =>
    request<{ script: string; tips: string[] }>('/api/brain/script', {
      method: 'POST',
      body: context,
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Export All
// ─────────────────────────────────────────────────────────────────────────────

export const autusCloud = {
  health: healthApi,
  academy: academyApi,
  risk: riskApi,
  goals: goalsApi,
  quickTag: quickTagApi,
  churn: churnApi,
  notify: notifyApi,
  reports: reportsApi,
  sync: syncApi,
  rewards: rewardsApi,
  leaderboard: leaderboardApi,
  brain: brainApi,
};

export default autusCloud;

// ─────────────────────────────────────────────────────────────────────────────
// React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';

export function useAutusCloud<T>(
  apiCall: () => Promise<ApiResponse<T>>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiCall();
    
    setLoading(false);
    
    if (response.success && response.data) {
      setData(response.data);
      return response.data;
    } else {
      setError(response.error || '요청 실패');
      return null;
    }
  }, [apiCall]);
  
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);
  
  return { data, loading, error, execute, reset };
}
