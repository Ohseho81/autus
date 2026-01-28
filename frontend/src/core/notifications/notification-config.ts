/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔔 AUTUS 알림 시스템 설계
 * 
 * 핵심 원칙:
 * 1. 적시성 - 행동이 필요한 순간에만 알림
 * 2. 개인화 - 역할별 다른 알림 우선순위
 * 3. 도파민 연계 - 긍정적 알림으로 습관 형성
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { MotivationRole } from '../motivation';

// ═══════════════════════════════════════════════════════════════════════════════
// 알림 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type NotificationType = 
  | 'risk_alert'          // 🚨 위험 감지
  | 'action_required'     // ⚡ 조치 필요
  | 'praise'              // 👏 칭찬/인정
  | 'milestone'           // 🏆 마일스톤 달성
  | 'reminder'            // ⏰ 리마인더
  | 'report'              // 📊 리포트 도착
  | 'message'             // 💬 메시지
  | 'system';             // ⚙️ 시스템

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export type NotificationChannel = 'push' | 'in_app' | 'email' | 'sms';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  targetRoles: MotivationRole[];
  
  // 콘텐츠
  title: string;
  body: string;
  icon: string;
  
  // 액션
  actionLabel?: string;
  actionUrl?: string;
  
  // 타이밍
  delay?: number;              // 지연 시간 (ms)
  expiresIn?: number;          // 만료 시간 (ms)
  quietHoursRespect?: boolean; // 방해금지 시간 존중
  
  // 그룹핑
  groupKey?: string;
  collapseKey?: string;
  
  // 도파민 연계
  celebrationTrigger?: boolean;
  soundEffect?: 'success' | 'alert' | 'message' | 'none';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 역할별 알림 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoleNotificationConfig {
  role: MotivationRole;
  quietHours: { start: number; end: number }; // 24시간 형식
  maxDailyPush: number;
  priorityThreshold: NotificationPriority;    // 이 우선순위 이상만 푸시
  preferredChannels: NotificationChannel[];
  enabledTypes: NotificationType[];
}

export const ROLE_NOTIFICATION_CONFIGS: Record<MotivationRole, RoleNotificationConfig> = {
  // 🔨 선생님 - 수업 시간 중심
  EXECUTOR: {
    role: 'EXECUTOR',
    quietHours: { start: 22, end: 7 },
    maxDailyPush: 15,
    priorityThreshold: 'medium',
    preferredChannels: ['push', 'in_app'],
    enabledTypes: ['risk_alert', 'action_required', 'praise', 'milestone', 'message'],
  },
  
  // ⚙️ 실장 - 업무 시간 중심
  OPERATOR: {
    role: 'OPERATOR',
    quietHours: { start: 21, end: 8 },
    maxDailyPush: 20,
    priorityThreshold: 'medium',
    preferredChannels: ['push', 'in_app', 'email'],
    enabledTypes: ['risk_alert', 'action_required', 'report', 'milestone', 'system'],
  },
  
  // 👑 원장 - 핵심만
  OWNER: {
    role: 'OWNER',
    quietHours: { start: 22, end: 8 },
    maxDailyPush: 5,
    priorityThreshold: 'high',
    preferredChannels: ['push', 'email'],
    enabledTypes: ['risk_alert', 'action_required', 'report', 'milestone'],
  },
  
  // 👨‍👩‍👧 학부모 - 저녁/주말 선호
  PARENT: {
    role: 'PARENT',
    quietHours: { start: 22, end: 9 },
    maxDailyPush: 3,
    priorityThreshold: 'high',
    preferredChannels: ['push', 'in_app'],
    enabledTypes: ['praise', 'report', 'message', 'milestone'],
  },
  
  // 🎒 학생 - 게임처럼
  STUDENT: {
    role: 'STUDENT',
    quietHours: { start: 21, end: 7 },
    maxDailyPush: 10,
    priorityThreshold: 'medium',
    preferredChannels: ['push', 'in_app'],
    enabledTypes: ['reminder', 'praise', 'milestone', 'message'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 알림 템플릿
// ═══════════════════════════════════════════════════════════════════════════════

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 🚨 위험 감지 (Risk Alert)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'risk_student_cold',
    type: 'risk_alert',
    priority: 'critical',
    channels: ['push', 'in_app'],
    targetRoles: ['EXECUTOR', 'OPERATOR'],
    title: '🥶 {studentName} 학생 관심 필요',
    body: '온도가 {temperature}°로 떨어졌어요. {reason}',
    icon: '🚨',
    actionLabel: '확인하기',
    actionUrl: '/students/{studentId}',
    soundEffect: 'alert',
  },
  {
    id: 'risk_churn_prediction',
    type: 'risk_alert',
    priority: 'high',
    channels: ['push', 'in_app', 'email'],
    targetRoles: ['OPERATOR', 'OWNER'],
    title: '⚠️ 이탈 예측: {count}명',
    body: '이번 달 이탈 예상 학생이 {count}명이에요. 지금 조치하면 막을 수 있어요.',
    icon: '⚠️',
    actionLabel: '목록 보기',
    actionUrl: '/risk-queue',
    soundEffect: 'alert',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ⚡ 조치 필요 (Action Required)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'action_record_reminder',
    type: 'action_required',
    priority: 'medium',
    channels: ['push', 'in_app'],
    targetRoles: ['EXECUTOR'],
    title: '✏️ 오늘 기록 아직 안 했어요',
    body: '🔥 {streak}일 연속 기록 중! 오늘도 기록해서 유지하세요.',
    icon: '✏️',
    actionLabel: '기록하기',
    actionUrl: '/quick-tag',
    delay: 1000 * 60 * 60 * 2, // 2시간 후
    quietHoursRespect: true,
  },
  {
    id: 'action_decision_pending',
    type: 'action_required',
    priority: 'high',
    channels: ['push', 'in_app'],
    targetRoles: ['OWNER'],
    title: '⚖️ 결정 대기 중',
    body: '"{decisionTitle}" 승인이 필요해요.',
    icon: '⚖️',
    actionLabel: '결정하기',
    actionUrl: '/decisions/{decisionId}',
  },
  {
    id: 'action_unresolved_risk',
    type: 'action_required',
    priority: 'high',
    channels: ['push', 'in_app'],
    targetRoles: ['OPERATOR'],
    title: '🔴 미조치 {count}건',
    body: '관심 필요 학생 중 {count}건이 아직 조치되지 않았어요.',
    icon: '🔴',
    actionLabel: '처리하기',
    actionUrl: '/risk-queue?status=pending',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 👏 칭찬/인정 (Praise)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'praise_teacher_to_parent',
    type: 'praise',
    priority: 'high',
    channels: ['push', 'in_app'],
    targetRoles: ['PARENT'],
    title: '🧑‍🏫 {teacherName}님의 메시지',
    body: '{message}',
    icon: '💬',
    actionLabel: '답장하기',
    actionUrl: '/messages/{messageId}',
    soundEffect: 'message',
    celebrationTrigger: false,
  },
  {
    id: 'praise_student_achievement',
    type: 'praise',
    priority: 'medium',
    channels: ['push', 'in_app'],
    targetRoles: ['STUDENT'],
    title: '👏 선생님이 칭찬했어요!',
    body: '"{praise}" - {teacherName} 선생님',
    icon: '🌟',
    celebrationTrigger: true,
    soundEffect: 'success',
  },
  {
    id: 'praise_teacher_effect',
    type: 'praise',
    priority: 'medium',
    channels: ['push', 'in_app'],
    targetRoles: ['EXECUTOR'],
    title: '✨ 선생님 효과!',
    body: '{studentName} 학생 온도가 +{change}° 올랐어요. 선생님 덕분이에요!',
    icon: '📈',
    celebrationTrigger: true,
    soundEffect: 'success',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🏆 마일스톤 (Milestone)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'milestone_streak',
    type: 'milestone',
    priority: 'medium',
    channels: ['push', 'in_app'],
    targetRoles: ['EXECUTOR', 'STUDENT'],
    title: '🔥 {streak}일 연속 달성!',
    body: '대단해요! 꾸준함이 실력이에요.',
    icon: '🔥',
    celebrationTrigger: true,
    soundEffect: 'success',
  },
  {
    id: 'milestone_level_up',
    type: 'milestone',
    priority: 'high',
    channels: ['push', 'in_app'],
    targetRoles: ['STUDENT'],
    title: '🎉 레벨 업!',
    body: 'Level {level} 달성! 축하해요!',
    icon: '🎉',
    celebrationTrigger: true,
    soundEffect: 'success',
  },
  {
    id: 'milestone_badge_earned',
    type: 'milestone',
    priority: 'medium',
    channels: ['push', 'in_app'],
    targetRoles: ['STUDENT'],
    title: '🎖️ 새 뱃지 획득!',
    body: '"{badgeName}" 뱃지를 얻었어요!',
    icon: '🎖️',
    celebrationTrigger: true,
    soundEffect: 'success',
  },
  {
    id: 'milestone_goal_achieved',
    type: 'milestone',
    priority: 'high',
    channels: ['push', 'in_app', 'email'],
    targetRoles: ['OWNER'],
    title: '🎯 목표 달성!',
    body: '"{goalName}" 목표를 달성했어요!',
    icon: '🎯',
    celebrationTrigger: true,
    soundEffect: 'success',
  },
  {
    id: 'milestone_defense_success',
    type: 'milestone',
    priority: 'high',
    channels: ['push', 'in_app'],
    targetRoles: ['OPERATOR'],
    title: '🛡️ 이탈 방어 성공!',
    body: '{studentName} 학생이 안정됐어요. 실장님 덕분이에요!',
    icon: '🛡️',
    celebrationTrigger: true,
    soundEffect: 'success',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ⏰ 리마인더 (Reminder)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'reminder_homework',
    type: 'reminder',
    priority: 'medium',
    channels: ['push', 'in_app'],
    targetRoles: ['STUDENT'],
    title: '📚 숙제 리마인더',
    body: '오늘 숙제가 있어요! 완료하면 +{xp} XP!',
    icon: '📚',
    actionLabel: '숙제 보기',
    actionUrl: '/homework',
    quietHoursRespect: true,
  },
  {
    id: 'reminder_class_soon',
    type: 'reminder',
    priority: 'low',
    channels: ['push'],
    targetRoles: ['STUDENT'],
    title: '⏰ 수업 30분 전',
    body: '{className} 수업이 곧 시작해요!',
    icon: '⏰',
    delay: -1000 * 60 * 30, // 30분 전
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 리포트 (Report)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'report_weekly_parent',
    type: 'report',
    priority: 'high',
    channels: ['push', 'in_app'],
    targetRoles: ['PARENT'],
    title: '📊 {childName}의 주간 리포트',
    body: '이번 주 {childName}는 {summary}',
    icon: '📊',
    actionLabel: '자세히 보기',
    actionUrl: '/reports/weekly',
  },
  {
    id: 'report_weekly_teacher',
    type: 'report',
    priority: 'medium',
    channels: ['in_app', 'email'],
    targetRoles: ['EXECUTOR'],
    title: '📊 이번 주 리포트',
    body: '이번 주 기록 {recordCount}건, 효과 확인 {effectCount}명',
    icon: '📊',
    actionLabel: '확인하기',
    actionUrl: '/reports/my-effect',
  },
  {
    id: 'report_monthly_owner',
    type: 'report',
    priority: 'high',
    channels: ['push', 'email'],
    targetRoles: ['OWNER'],
    title: '📈 월간 경영 리포트',
    body: '{month}월 결산: 재원 {studentCount}명, 이탈 {churnCount}명',
    icon: '📈',
    actionLabel: '상세 보기',
    actionUrl: '/reports/monthly',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 알림 트리거 이벤트
// ═══════════════════════════════════════════════════════════════════════════════

export type NotificationTriggerEvent = 
  | 'student_temperature_drop'
  | 'student_temperature_rise'
  | 'churn_prediction'
  | 'record_streak_at_risk'
  | 'decision_created'
  | 'unresolved_risk'
  | 'teacher_message_sent'
  | 'praise_received'
  | 'streak_milestone'
  | 'level_up'
  | 'badge_earned'
  | 'goal_achieved'
  | 'defense_success'
  | 'homework_due'
  | 'class_reminder'
  | 'weekly_report_ready'
  | 'monthly_report_ready';

export interface NotificationTrigger {
  event: NotificationTriggerEvent;
  templateId: string;
  conditions?: Record<string, unknown>;
}

export const NOTIFICATION_TRIGGERS: NotificationTrigger[] = [
  { event: 'student_temperature_drop', templateId: 'risk_student_cold', conditions: { temperatureThreshold: 50 } },
  { event: 'churn_prediction', templateId: 'risk_churn_prediction' },
  { event: 'record_streak_at_risk', templateId: 'action_record_reminder', conditions: { hoursUntilBreak: 2 } },
  { event: 'decision_created', templateId: 'action_decision_pending' },
  { event: 'unresolved_risk', templateId: 'action_unresolved_risk', conditions: { hoursSinceCreated: 24 } },
  { event: 'teacher_message_sent', templateId: 'praise_teacher_to_parent' },
  { event: 'praise_received', templateId: 'praise_student_achievement' },
  { event: 'student_temperature_rise', templateId: 'praise_teacher_effect', conditions: { changeThreshold: 10 } },
  { event: 'streak_milestone', templateId: 'milestone_streak', conditions: { milestones: [7, 14, 30, 60, 100] } },
  { event: 'level_up', templateId: 'milestone_level_up' },
  { event: 'badge_earned', templateId: 'milestone_badge_earned' },
  { event: 'goal_achieved', templateId: 'milestone_goal_achieved' },
  { event: 'defense_success', templateId: 'milestone_defense_success' },
  { event: 'homework_due', templateId: 'reminder_homework', conditions: { hoursBefore: 2 } },
  { event: 'class_reminder', templateId: 'reminder_class_soon' },
  { event: 'weekly_report_ready', templateId: 'report_weekly_parent' },
  { event: 'monthly_report_ready', templateId: 'report_monthly_owner' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

export function getTemplateById(templateId: string): NotificationTemplate | undefined {
  return NOTIFICATION_TEMPLATES.find(t => t.id === templateId);
}

export function getTemplatesForRole(role: MotivationRole): NotificationTemplate[] {
  return NOTIFICATION_TEMPLATES.filter(t => t.targetRoles.includes(role));
}

export function getRoleConfig(role: MotivationRole): RoleNotificationConfig {
  return ROLE_NOTIFICATION_CONFIGS[role];
}

export function isInQuietHours(role: MotivationRole): boolean {
  const config = getRoleConfig(role);
  const now = new Date().getHours();
  const { start, end } = config.quietHours;
  
  if (start > end) {
    // 예: 22~7 (밤새 조용)
    return now >= start || now < end;
  }
  return now >= start && now < end;
}

export function shouldSendPush(role: MotivationRole, priority: NotificationPriority): boolean {
  const config = getRoleConfig(role);
  const priorityOrder: NotificationPriority[] = ['low', 'medium', 'high', 'critical'];
  const threshold = priorityOrder.indexOf(config.priorityThreshold);
  const current = priorityOrder.indexOf(priority);
  
  return current >= threshold;
}

export function interpolateTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? `{${key}}`));
}
