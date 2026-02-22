/**
 * OnlySsamDashboard Types - All interface definitions
 */

export interface Role {
  id: 'owner' | 'director' | 'admin' | 'coach';
  name: string;
  icon: string;
  color: string;
}

export interface Branch {
  name: string;
  revenue: number;
  students: number;
  growth: number;
  status: 'excellent' | 'good' | 'warning';
}

export interface TodayClass {
  time: string;
  name: string;
  coach: string;
  students: number;
  room: string;
}

export interface Coach {
  name: string;
  classes: number;
  rating: number;
  status: 'active' | 'break';
}

export interface PendingTask {
  type: 'register' | 'payment' | 'inquiry' | 'schedule';
  title: string;
  name: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Inquiry {
  channel: string;
  message: string;
  time: string;
  status: 'new' | 'pending' | 'resolved';
}

export interface MyClass {
  time: string;
  name: string;
  students: number;
  attended: number;
  status: 'upcoming' | 'active' | 'completed';
}

export interface Student {
  name: string;
  level: '초급' | '중급' | '상급';
  attendance: number;
  progress: number;
  note: string;
}

export interface Alert {
  type: 'success' | 'warning' | 'info';
  message: string;
  time: string;
}

export interface Action {
  icon: string;
  label: string;
}

export interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
  color: string;
}

export interface MiniCardProps {
  title: string;
  value: string;
  icon: string;
  alert?: boolean;
}

export interface StatBlockProps {
  label: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}

export interface AlertPanelProps {
  title: string;
  alerts: Alert[];
}

export interface QuickActionsProps {
  title: string;
  actions: Action[];
}
