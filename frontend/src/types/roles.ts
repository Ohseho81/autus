/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Role-Based Permission System
 * 5개 역할 × 7개 뷰 권한 매트릭스
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// Role Types
// ─────────────────────────────────────────────────────────────────────────────

export type RoleId = 'owner' | 'manager' | 'teacher' | 'parent' | 'student';

export interface Role {
  id: RoleId;
  name: string;
  nameKo: string;
  icon: string;
  description: string;
  theme: ThemeConfig;
  devicePriority: 'desktop' | 'tablet' | 'mobile';
}

export interface ThemeConfig {
  id: string;
  mode: 'dark' | 'light';
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// View Types
// ─────────────────────────────────────────────────────────────────────────────

export type ViewId = 
  | 'map' | 'map_limited' | 'map_location'
  | 'weather' | 'weather_limited' | 'weather_child' | 'weather_schedule'
  | 'radar' | 'radar_limited'
  | 'scoreboard' | 'scoreboard_contribution' | 'scoreboard_ranking'
  | 'tide' | 'tide_summary'
  | 'heartbeat' | 'heartbeat_limited' | 'heartbeat_voice'
  | 'cockpit' | 'cockpit_simple' | 'cockpit_child' | 'cockpit_gamified';

export interface View {
  id: ViewId;
  name: string;
  nameKo: string;
  icon: string;
  description: string;
  baseView: string; // Parent view category
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Types
// ─────────────────────────────────────────────────────────────────────────────

export type ActionId = 
  // Owner actions
  | 'approve' | 'decide' | 'delegate' | 'view_financials'
  // Manager actions
  | 'assign' | 'instruct' | 'adjust' | 'report'
  // Teacher actions
  | 'execute' | 'record' | 'communicate'
  // Parent actions
  | 'feedback' | 'schedule'
  // Student actions
  | 'check_mission' | 'submit'
  // Common
  | 'view' | 'edit' | 'create' | 'delete';

export type DataScope = 'all' | 'assigned_students' | 'own_child' | 'self';

export interface Permission {
  views: ViewId[];
  dataScope: DataScope;
  actions: ActionId[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES: Record<RoleId, Role> = {
  owner: {
    id: 'owner',
    name: 'Owner',
    nameKo: '오너',
    icon: '👑',
    description: '전략적 의사결정 및 전체 운영 관리',
    theme: {
      id: 'dark-professional',
      mode: 'dark',
      primaryColor: '#fbbf24', // Gold
      accentColor: '#f59e0b',
      backgroundColor: '#0a0a0f',
      cardBackground: 'rgba(255,255,255,0.05)',
      textPrimary: '#ffffff',
      textSecondary: '#a0aec0',
    },
    devicePriority: 'desktop',
  },
  manager: {
    id: 'manager',
    name: 'Manager',
    nameKo: '관리자',
    icon: '⚙️',
    description: '운영 관리 및 강사 조율',
    theme: {
      id: 'dark-professional',
      mode: 'dark',
      primaryColor: '#3b82f6', // Blue
      accentColor: '#60a5fa',
      backgroundColor: '#0f172a',
      cardBackground: 'rgba(255,255,255,0.05)',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
    },
    devicePriority: 'desktop',
  },
  teacher: {
    id: 'teacher',
    name: 'Teacher',
    nameKo: '강사',
    icon: '🔨',
    description: '학생 관리 및 수업 진행',
    theme: {
      id: 'light-friendly',
      mode: 'light',
      primaryColor: '#10b981', // Emerald
      accentColor: '#34d399',
      backgroundColor: '#f8fafc',
      cardBackground: '#ffffff',
      textPrimary: '#1e293b',
      textSecondary: '#64748b',
    },
    devicePriority: 'tablet',
  },
  parent: {
    id: 'parent',
    name: 'Parent',
    nameKo: '학부모',
    icon: '👨‍👩‍👧',
    description: '자녀 학습 현황 확인 및 소통',
    theme: {
      id: 'light-warm',
      mode: 'light',
      primaryColor: '#f97316', // Orange
      accentColor: '#fb923c',
      backgroundColor: '#fffaf5',
      cardBackground: '#ffffff',
      textPrimary: '#292524',
      textSecondary: '#78716c',
    },
    devicePriority: 'mobile',
  },
  student: {
    id: 'student',
    name: 'Student',
    nameKo: '학생',
    icon: '🎒',
    description: '미션 수행 및 학습 활동',
    theme: {
      id: 'light-playful',
      mode: 'light',
      primaryColor: '#8b5cf6', // Purple
      accentColor: '#a78bfa',
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      cardBackground: '#ffffff',
      textPrimary: '#1f2937',
      textSecondary: '#6b7280',
    },
    devicePriority: 'mobile',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Permission Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const PERMISSIONS: Record<RoleId, Permission> = {
  owner: {
    views: [
      'map', 'weather', 'radar', 'scoreboard', 
      'tide', 'heartbeat', 'cockpit'
    ],
    dataScope: 'all',
    actions: ['approve', 'decide', 'delegate', 'view_financials', 'view', 'edit', 'create', 'delete'],
  },
  manager: {
    views: [
      'map', 'weather', 'radar', 'scoreboard', 
      'tide_summary', 'heartbeat', 'cockpit'
    ],
    dataScope: 'all',
    actions: ['assign', 'instruct', 'adjust', 'report', 'view', 'edit', 'create'],
  },
  teacher: {
    views: [
      'map_limited', 'weather_limited', 'radar_limited', 
      'scoreboard_contribution', 'heartbeat_limited', 'cockpit_simple'
    ],
    dataScope: 'assigned_students',
    actions: ['execute', 'record', 'communicate', 'view', 'edit'],
  },
  parent: {
    views: [
      'map_location', 'weather_child', 
      'heartbeat_voice', 'cockpit_child'
    ],
    dataScope: 'own_child',
    actions: ['feedback', 'schedule', 'communicate', 'view'],
  },
  student: {
    views: [
      'weather_schedule', 'scoreboard_ranking', 'cockpit_gamified'
    ],
    dataScope: 'self',
    actions: ['check_mission', 'submit', 'feedback', 'view'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// View Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const VIEWS: Record<ViewId, View> = {
  // Map Views
  map: { id: 'map', name: 'Map', nameKo: '지도', icon: '🗺️', description: '전체 시장 현황', baseView: 'map' },
  map_limited: { id: 'map_limited', name: 'Limited Map', nameKo: '지도(제한)', icon: '🗺️', description: '담당 학생 위치', baseView: 'map' },
  map_location: { id: 'map_location', name: 'Location', nameKo: '위치', icon: '📍', description: '자녀 통학 경로', baseView: 'map' },
  
  // Weather Views
  weather: { id: 'weather', name: 'Weather', nameKo: '날씨', icon: '🌤️', description: '전체 예보', baseView: 'weather' },
  weather_limited: { id: 'weather_limited', name: 'Weather Limited', nameKo: '날씨(제한)', icon: '🌤️', description: '수업 일정 영향', baseView: 'weather' },
  weather_child: { id: 'weather_child', name: 'Child Weather', nameKo: '자녀 일정', icon: '📅', description: '자녀 일정 + 날씨', baseView: 'weather' },
  weather_schedule: { id: 'weather_schedule', name: 'Schedule', nameKo: '시간표', icon: '📚', description: '내 시간표', baseView: 'weather' },
  
  // Radar Views
  radar: { id: 'radar', name: 'Radar', nameKo: '레이더', icon: '📡', description: '전체 위협 탐지', baseView: 'radar' },
  radar_limited: { id: 'radar_limited', name: 'Radar Limited', nameKo: '레이더(제한)', icon: '📡', description: '담당 학생 위험', baseView: 'radar' },
  
  // Scoreboard Views
  scoreboard: { id: 'scoreboard', name: 'Scoreboard', nameKo: '스코어보드', icon: '🏆', description: '전체 성과', baseView: 'scoreboard' },
  scoreboard_contribution: { id: 'scoreboard_contribution', name: 'Contribution', nameKo: '기여도', icon: '📊', description: '내 기여도', baseView: 'scoreboard' },
  scoreboard_ranking: { id: 'scoreboard_ranking', name: 'Ranking', nameKo: '랭킹', icon: '🏅', description: '반 랭킹', baseView: 'scoreboard' },
  
  // Tide Views
  tide: { id: 'tide', name: 'Tide', nameKo: '조류', icon: '🌊', description: '시장 흐름', baseView: 'tide' },
  tide_summary: { id: 'tide_summary', name: 'Tide Summary', nameKo: '조류(요약)', icon: '🌊', description: '시장 요약', baseView: 'tide' },
  
  // Heartbeat Views
  heartbeat: { id: 'heartbeat', name: 'Heartbeat', nameKo: '심장박동', icon: '💓', description: '전체 건강도', baseView: 'heartbeat' },
  heartbeat_limited: { id: 'heartbeat_limited', name: 'Heartbeat Limited', nameKo: '심장박동(제한)', icon: '💓', description: '담당 학생 건강도', baseView: 'heartbeat' },
  heartbeat_voice: { id: 'heartbeat_voice', name: 'Voice', nameKo: '소통', icon: '💬', description: '학원 소통', baseView: 'heartbeat' },
  
  // Cockpit Views
  cockpit: { id: 'cockpit', name: 'Cockpit', nameKo: '조종석', icon: '🎛️', description: '전체 컨트롤', baseView: 'cockpit' },
  cockpit_simple: { id: 'cockpit_simple', name: 'Simple Cockpit', nameKo: '간편 조종석', icon: '🎛️', description: '간편 컨트롤', baseView: 'cockpit' },
  cockpit_child: { id: 'cockpit_child', name: 'Child View', nameKo: '자녀 현황', icon: '👶', description: '자녀 대시보드', baseView: 'cockpit' },
  cockpit_gamified: { id: 'cockpit_gamified', name: 'Gamified', nameKo: '게임', icon: '🎮', description: '게임화 대시보드', baseView: 'cockpit' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Navigation Configuration per Role
// ─────────────────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  viewId?: ViewId;
}

export const ROLE_NAVIGATION: Record<RoleId, NavItem[]> = {
  owner: [
    { id: 'cockpit', label: '조종석', icon: '🎛️', path: '/owner', viewId: 'cockpit' },
    { id: 'map', label: '지도', icon: '🗺️', path: '/owner/map', viewId: 'map' },
    { id: 'weather', label: '날씨', icon: '🌤️', path: '/owner/weather', viewId: 'weather' },
    { id: 'radar', label: '레이더', icon: '📡', path: '/owner/radar', viewId: 'radar' },
    { id: 'scoreboard', label: '스코어보드', icon: '🏆', path: '/owner/scoreboard', viewId: 'scoreboard' },
    { id: 'tide', label: '조류', icon: '🌊', path: '/owner/tide', viewId: 'tide' },
    { id: 'heartbeat', label: '심장박동', icon: '💓', path: '/owner/heartbeat', viewId: 'heartbeat' },
    { id: 'reports', label: '리포트', icon: '📊', path: '/owner/reports' },
    { id: 'settings', label: '설정', icon: '⚙️', path: '/owner/settings' },
  ],
  manager: [
    { id: 'cockpit', label: '조종석', icon: '🎛️', path: '/manager', viewId: 'cockpit' },
    { id: 'teachers', label: '강사관리', icon: '👥', path: '/manager/teachers' },
    { id: 'tasks', label: '태스크', icon: '📋', path: '/manager/tasks' },
    { id: 'map', label: '지도', icon: '🗺️', path: '/manager/map', viewId: 'map' },
    { id: 'weather', label: '날씨', icon: '🌤️', path: '/manager/weather', viewId: 'weather' },
    { id: 'radar', label: '레이더', icon: '📡', path: '/manager/radar', viewId: 'radar' },
    { id: 'heartbeat', label: '심장박동', icon: '💓', path: '/manager/heartbeat', viewId: 'heartbeat' },
  ],
  teacher: [
    { id: 'home', label: '홈', icon: '🏠', path: '/teacher' },
    { id: 'students', label: '학생', icon: '👤', path: '/teacher/students' },
    { id: 'classes', label: '수업', icon: '📚', path: '/teacher/classes' },
    { id: 'consultations', label: '상담', icon: '💬', path: '/teacher/consultations' },
    { id: 'tasks', label: '할일', icon: '✅', path: '/teacher/tasks' },
    { id: 'performance', label: '성과', icon: '📈', path: '/teacher/performance' },
  ],
  parent: [
    { id: 'home', label: '홈', icon: '🏠', path: '/parent' },
    { id: 'growth', label: '성장', icon: '📊', path: '/parent/growth' },
    { id: 'communication', label: '소통', icon: '💬', path: '/parent/communication' },
    { id: 'schedule', label: '일정', icon: '📅', path: '/parent/schedule' },
    { id: 'payment', label: '결제', icon: '💳', path: '/parent/payment' },
  ],
  student: [
    { id: 'home', label: '홈', icon: '🏠', path: '/student' },
    { id: 'missions', label: '미션', icon: '🎯', path: '/student/missions' },
    { id: 'badges', label: '뱃지', icon: '🏅', path: '/student/badges' },
    { id: 'ranking', label: '랭킹', icon: '🏆', path: '/student/ranking' },
    { id: 'shop', label: '상점', icon: '🎁', path: '/student/shop' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Types
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  avatar?: string;
  permissions?: Permission;
  metadata?: Record<string, unknown>;
}

export interface RoleContextType {
  currentRole: RoleId;
  user: User | null;
  permissions: Permission;
  theme: ThemeConfig;
  navigation: NavItem[];
  setRole: (role: RoleId) => void;
  hasPermission: (action: ActionId) => boolean;
  canAccessView: (view: ViewId) => boolean;
  isLoading: boolean;
}
