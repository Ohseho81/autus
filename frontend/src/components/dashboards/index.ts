// 역할별 대시보드
export { default as TeacherDashboard } from './TeacherDashboard';
export { default as ManagerDashboard } from './ManagerDashboard';
export { default as OwnerDashboard } from './OwnerDashboard';
export { default as ParentDashboard } from './ParentDashboard';
export { default as RoleDemoApp } from './RoleDemoApp';

// 타입 재export
export type { AttentionStudent, ClassSchedule } from './TeacherDashboard';
export type { KPIStat, WeeklyChange, AttentionStudentManager, TeacherStatus } from './ManagerDashboard';
export type { Goal, Decision, PastDecision, Legacy } from './OwnerDashboard';
export type { GrowthData, StatusItem, WeeklyReport, TeacherMessage } from './ParentDashboard';
