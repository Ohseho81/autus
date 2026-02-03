/**
 * 📊 AllThatBasket Metrics Adapter
 *
 * AUTUS 내부 지표 → 사용자 친화적 UI 변환
 * 내부 지표 직접 노출 금지
 */

import brandConfig from './brand_config.json';
import { VelocityResult, CLFInput } from '../../engine/velocity_calc';

// ============================================
// Types
// ============================================

export interface UIMetrics {
  efficiency: {
    color: string;
    label: string;
    emoji: string;
  };
  complexity: {
    level: 'low' | 'medium' | 'high';
    label: string;
    description: string;
  };
  coachScore: {
    stars: number;
    display: string;
  };
  outcomeRate: {
    percentage: number;
    display: string;
  };
}

export interface OwnerDashboardData {
  weeklyEfficiency: UIMetrics['efficiency'];
  recommendations: Recommendation[];
  timeslotHeatmap: TimeslotData[];
}

export interface CoachViewData {
  sessionEfficiency: UIMetrics['efficiency'];
  currentComplexity: UIMetrics['complexity'];
  myScore: UIMetrics['coachScore'];
  actionButton: ActionButton | null;
}

export interface Recommendation {
  id: string;
  type: 'expand' | 'reduce' | 'restructure' | 'kill';
  target: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TimeslotData {
  day: string;
  hour: number;
  efficiency: 'green' | 'yellow' | 'red';
  studentCount: number;
}

export interface ActionButton {
  label: string;
  action: string;
  style: 'primary' | 'secondary' | 'danger';
}

// ============================================
// Adapters
// ============================================

/**
 * VV → UI 효율 점수 변환
 */
export function adaptVVToUI(vv: VelocityResult): UIMetrics['efficiency'] {
  const { status, label } = vv;
  const { theme, status_labels } = brandConfig;

  const colorMap = {
    green: theme.success,
    yellow: theme.warning,
    red: theme.danger,
  };

  const emojiMap = {
    green: '🟢',
    yellow: '🟡',
    red: '🔴',
  };

  return {
    color: colorMap[status],
    label: status_labels[status],
    emoji: emojiMap[status],
  };
}

/**
 * CLF → UI 복잡도 변환
 */
export function adaptCLFToUI(clf: number): UIMetrics['complexity'] {
  let level: 'low' | 'medium' | 'high';
  let label: string;
  let description: string;

  if (clf <= 15) {
    level = 'low';
    label = '낮음';
    description = '여유로운 수업 환경';
  } else if (clf <= 40) {
    level = 'medium';
    label = '보통';
    description = '적정 수업 환경';
  } else {
    level = 'high';
    label = '높음';
    description = '집중 관리 필요';
  }

  return { level, label, description };
}

/**
 * CE → UI 강사 점수 변환 (별점)
 */
export function adaptCEToUI(ce: number): UIMetrics['coachScore'] {
  let stars: number;

  if (ce >= 2.0) stars = 5;
  else if (ce >= 1.5) stars = 4;
  else if (ce >= 1.0) stars = 3;
  else if (ce >= 0.5) stars = 2;
  else stars = 1;

  const display = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

  return { stars, display };
}

/**
 * Outcome Yield → UI 결과율 변환
 */
export function adaptOYToUI(oy: number): UIMetrics['outcomeRate'] {
  const percentage = Math.round(oy * 100);
  return {
    percentage,
    display: `${percentage}%`,
  };
}

/**
 * 원장 대시보드 데이터 생성
 */
export function generateOwnerDashboard(
  weeklyVV: VelocityResult,
  timeslots: Array<{ day: string; hour: number; vv: VelocityResult; students: number }>
): OwnerDashboardData {
  const weeklyEfficiency = adaptVVToUI(weeklyVV);

  // 권고 사항 생성
  const recommendations: Recommendation[] = [];

  // Red 시간대 → Kill 권고
  const redSlots = timeslots.filter(t => t.vv.status === 'red');
  redSlots.forEach(slot => {
    recommendations.push({
      id: `rec_${slot.day}_${slot.hour}`,
      type: 'kill',
      target: `${slot.day} ${slot.hour}시`,
      reason: '효율 점수 지속 하락',
      priority: 'high',
    });
  });

  // Green 시간대 → 확장 권고
  const greenSlots = timeslots.filter(t => t.vv.status === 'green' && t.students < 15);
  greenSlots.forEach(slot => {
    recommendations.push({
      id: `rec_${slot.day}_${slot.hour}`,
      type: 'expand',
      target: `${slot.day} ${slot.hour}시`,
      reason: '효율 높음, 인원 확대 가능',
      priority: 'medium',
    });
  });

  // 히트맵 데이터
  const timeslotHeatmap: TimeslotData[] = timeslots.map(t => ({
    day: t.day,
    hour: t.hour,
    efficiency: t.vv.status,
    studentCount: t.students,
  }));

  return {
    weeklyEfficiency,
    recommendations,
    timeslotHeatmap,
  };
}

/**
 * 강사 뷰 데이터 생성
 */
export function generateCoachView(
  sessionVV: VelocityResult,
  clf: number,
  ce: number,
  hasUrgentTask: boolean
): CoachViewData {
  const sessionEfficiency = adaptVVToUI(sessionVV);
  const currentComplexity = adaptCLFToUI(clf);
  const myScore = adaptCEToUI(ce);

  // 긴급 작업 버튼
  let actionButton: ActionButton | null = null;
  if (hasUrgentTask) {
    actionButton = {
      label: '출석 체크',
      action: 'check_attendance',
      style: 'primary',
    };
  }

  return {
    sessionEfficiency,
    currentComplexity,
    myScore,
    actionButton,
  };
}

/**
 * 라벨 조회 유틸리티
 */
export function getOutcomeLabel(outcomeType: string): string {
  return brandConfig.outcome_labels[outcomeType as keyof typeof brandConfig.outcome_labels] || outcomeType;
}

export function getShadowLabel(category: string): string {
  return brandConfig.shadow_labels[category as keyof typeof brandConfig.shadow_labels] || category;
}

export function getRoleInfo(roleId: string) {
  return brandConfig.roles[roleId as keyof typeof brandConfig.roles] || null;
}

// ============================================
// Export
// ============================================

export const MetricsAdapter = {
  vvToUI: adaptVVToUI,
  clfToUI: adaptCLFToUI,
  ceToUI: adaptCEToUI,
  oyToUI: adaptOYToUI,
  ownerDashboard: generateOwnerDashboard,
  coachView: generateCoachView,
  getOutcomeLabel,
  getShadowLabel,
  getRoleInfo,
};

export default MetricsAdapter;
