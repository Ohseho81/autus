// ═══════════════════════════════════════════════════════════════════════════════
// 👑 AUTUS 2.0 - 오너 전용 컴포넌트
// "목표를 던지고, 예외만 승인하고, 결과를 확인한다"
// ═══════════════════════════════════════════════════════════════════════════════

export { GoalSettingPanel } from './GoalSettingPanel';
export { ExceptionApprovalPanel } from './ExceptionApprovalPanel';
export { WeeklyReportPanel } from './WeeklyReportPanel';
export { OwnerDashboard } from './OwnerDashboard';

// Types
export interface OwnerGoal {
  id: string;
  metric: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
}

export interface Exception {
  id: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  situation: string;
  analysis: string;
  churnProbabilityBefore: number;
  churnProbabilityAfter: number;
  policyReference: string;
  alternatives: ExceptionAlternative[];
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export interface ExceptionAlternative {
  id: string;
  label: string;
  description: string;
  cost: number;
  retentionProbability: number;
  recommended?: boolean;
}

export interface WeeklyStats {
  week: string;
  autoProcessed: number;
  ownerApproved: number;
  successRate: number;
  goals: OwnerGoal[];
  nextWeekForecast: string[];
}
