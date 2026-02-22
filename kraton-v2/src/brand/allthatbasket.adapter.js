/**
 * 온리쌤 Brand Adapter
 *
 * Core는 불변, UI는 어댑터로 분리 (Shopify DNA)
 *
 * 역할:
 * - OutcomeFact → 역할별 화면 라우팅
 * - 라벨/색상/아이콘 브랜드화
 */

// ============================================
// 브랜드 설정
// ============================================

export const BRAND = {
  id: 'allthatbasket',
  name: '온리쌤',
  emoji: '🏀',
  colors: {
    primary: '#F97316',    // orange-500
    secondary: '#3B82F6',  // blue-500
    success: '#22C55E',    // green-500
    warning: '#F59E0B',    // amber-500
    danger: '#EF4444',     // red-500
    muted: '#6B7280',      // gray-500
  }
};

// ============================================
// 역할 정의 (4개 고정)
// ============================================

export const ROLES = {
  owner: {
    id: 'owner',
    label: '원장님',
    emoji: '👔',
    permissions: ['approve', 'kill', 'view_all'],
    homeScreen: 'dashboard',
  },
  admin: {
    id: 'admin',
    label: '관리자',
    emoji: '💼',
    permissions: ['monitor', 'escalate', 'view_all'],
    homeScreen: 'dashboard',
  },
  coach: {
    id: 'coach',
    label: '코치',
    emoji: '🏃',
    permissions: ['attendance', 'feedback'],
    homeScreen: 'classes',
  },
  parent: {
    id: 'parent',
    label: '학부모',
    emoji: '👨‍👩‍👧',
    permissions: ['view_own'],
    homeScreen: 'status',
  },
};

// ============================================
// 라우팅 테이블 (8줄 - 핵심)
// ============================================

export const ROUTING_TABLE = {
  // OutcomeFact → { screen, role, priority }
  'inquiry.created':           { screen: 'dashboard', role: 'admin',  priority: 'normal' },
  'renewal.failed':            { screen: 'dashboard', role: 'owner',  priority: 'high' },
  'renewal.succeeded':         { screen: null,        role: null,     priority: 'none' },  // 알림만
  'attendance.drop':           { screen: 'classes',   role: 'coach',  priority: 'normal' },
  'payment.friction':          { screen: 'payments',  role: 'admin',  priority: 'high' },
  'makeup.requested':          { screen: 'classes',   role: 'admin',  priority: 'normal' },
  'discount.requested':        { screen: 'payments',  role: 'owner',  priority: 'high' },
  'teacher.change_requested':  { screen: 'dashboard', role: 'owner',  priority: 'high' },
  'complaint.mismatch':        { screen: 'students',  role: 'admin',  priority: 'medium' },
  'notification.ignored':      { screen: null,        role: null,     priority: 'none' },  // 알림만
};

// ============================================
// 화면 정의 (4개 고정)
// ============================================

export const SCREENS = {
  dashboard: {
    path: '/',
    label: '대시보드',
    icon: '📊',
    roles: ['owner', 'admin'],
  },
  students: {
    path: '/students',
    label: '학생관리',
    icon: '👥',
    roles: ['owner', 'admin', 'coach'],
  },
  classes: {
    path: '/classes',
    label: '수업관리',
    icon: '📅',
    roles: ['owner', 'admin', 'coach'],
  },
  payments: {
    path: '/payments',
    label: '결제관리',
    icon: '💳',
    roles: ['owner', 'admin'],
  },
};

// ============================================
// OutcomeFact 라벨 브랜드화
// ============================================

export const OUTCOME_LABELS = {
  'inquiry.created':           { label: '문의 접수', emoji: '❓', color: 'primary' },
  'renewal.failed':            { label: '이탈 감지', emoji: '🚨', color: 'danger' },
  'renewal.succeeded':         { label: '재등록 완료', emoji: '✅', color: 'success' },
  'attendance.drop':           { label: '출석률 하락', emoji: '📉', color: 'warning' },
  'payment.friction':          { label: '결제 이슈', emoji: '💳', color: 'danger' },
  'makeup.requested':          { label: '보충 요청', emoji: '🔄', color: 'primary' },
  'discount.requested':        { label: '할인 요청', emoji: '💰', color: 'warning' },
  'teacher.change_requested':  { label: '강사 변경', emoji: '👨‍🏫', color: 'warning' },
  'complaint.mismatch':        { label: '불만 접수', emoji: '😤', color: 'danger' },
  'notification.ignored':      { label: '연락 불통', emoji: '📵', color: 'muted' },
};

// ============================================
// 유틸리티 함수
// ============================================

/**
 * OutcomeFact → 라우팅 정보
 */
export function getRouting(outcomeType) {
  return ROUTING_TABLE[outcomeType] || { screen: 'dashboard', role: 'admin', priority: 'low' };
}

/**
 * OutcomeFact → 브랜드 라벨
 */
export function getLabel(outcomeType) {
  return OUTCOME_LABELS[outcomeType] || { label: outcomeType, emoji: '📋', color: 'muted' };
}

/**
 * 역할별 볼 수 있는 화면 목록
 */
export function getScreensForRole(roleId) {
  return Object.entries(SCREENS)
    .filter(([_, screen]) => screen.roles.includes(roleId))
    .map(([id, screen]) => ({ id, ...screen }));
}

/**
 * 역할별 처리해야 할 OutcomeFact 타입 목록
 */
export function getOutcomeTypesForRole(roleId) {
  return Object.entries(ROUTING_TABLE)
    .filter(([_, routing]) => routing.role === roleId)
    .map(([type]) => type);
}

/**
 * DecisionCard용 스타일 반환
 */
export function getCardStyle(outcomeType, priority) {
  const label = getLabel(outcomeType);
  const color = BRAND.colors[label.color] || BRAND.colors.muted;

  return {
    borderColor: color,
    backgroundColor: priority === 'high' ? `${color}10` : 'white',
    emoji: label.emoji,
    label: label.label,
  };
}

// ============================================
// Export
// ============================================

export default {
  BRAND,
  ROLES,
  ROUTING_TABLE,
  SCREENS,
  OUTCOME_LABELS,
  getRouting,
  getLabel,
  getScreensForRole,
  getOutcomeTypesForRole,
  getCardStyle,
};
