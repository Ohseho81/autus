/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎭 역할별 설정 (Role Configuration) - AUTUS 2.0
 * 각 역할에 따른 UI/UX, 데이터 범위, 권한 정의
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type RoleId = 'owner' | 'operator' | 'executor' | 'supporter' | 'payer' | 'receiver';

export interface RoleConfig {
  id: RoleId;
  name: {
    ko: string;
    en: string;
  };
  industry: {
    academy: string; // 학원 예시
    generic: string; // 일반 예시
  };
  views: {
    allowed: string[];      // 접근 가능한 뷰
    defaultView: string;    // 기본 화면
    hiddenViews: string[];  // 숨겨진 뷰
  };
  dataScope: {
    type: 'full' | 'assigned' | 'leads' | 'children' | 'self';
    filter?: string;  // 추가 필터
    description: string;
  };
  permissions: {
    canCreateAction: boolean;
    canAssignAction: boolean;
    canViewAllCustomers: boolean;
    canViewCompetitors: boolean;
    canViewFinancials: boolean;
    canRunSimulation: boolean;
    canExportData: boolean;
    canViewNetwork: boolean;
  };
  ui: {
    navPosition: 'bottom' | 'side';
    showRoleBadge: boolean;
    simplifiedMode: boolean;
    theme: 'full' | 'simplified' | 'minimal';
    greeting: string;
  };
}

// ─────────────────────────────────────────────────────────────────────
// Role Configurations
// ─────────────────────────────────────────────────────────────────────

export const ROLE_CONFIGS: Record<RoleId, RoleConfig> = {
  owner: {
    id: 'owner',
    name: { ko: '오너', en: 'Owner' },
    industry: { academy: '원장', generic: '대표' },
    views: {
      allowed: ['cockpit', 'forecast', 'pulse', 'microscope', 'timeline', 'actions', 'map', 'funnel', 'network', 'crystal'],
      defaultView: 'cockpit',
      hiddenViews: [],
    },
    dataScope: {
      type: 'full',
      description: '모든 데이터 접근 가능',
    },
    permissions: {
      canCreateAction: true,
      canAssignAction: true,
      canViewAllCustomers: true,
      canViewCompetitors: true,
      canViewFinancials: true,
      canRunSimulation: true,
      canExportData: true,
      canViewNetwork: true,
    },
    ui: {
      navPosition: 'bottom',
      showRoleBadge: false,
      simplifiedMode: false,
      theme: 'full',
      greeting: '원장님, 오늘의 현황입니다',
    },
  },

  operator: {
    id: 'operator',
    name: { ko: '운영자', en: 'Operator' },
    industry: { academy: '실장', generic: '팀장' },
    views: {
      allowed: ['cockpit', 'forecast', 'pulse', 'microscope', 'timeline', 'actions', 'map', 'funnel'],
      defaultView: 'cockpit',
      hiddenViews: ['network', 'crystal'],
    },
    dataScope: {
      type: 'full',
      description: '모든 운영 데이터 접근 가능',
    },
    permissions: {
      canCreateAction: true,
      canAssignAction: true,
      canViewAllCustomers: true,
      canViewCompetitors: true,
      canViewFinancials: true,
      canRunSimulation: false,
      canExportData: true,
      canViewNetwork: false,
    },
    ui: {
      navPosition: 'bottom',
      showRoleBadge: true,
      simplifiedMode: false,
      theme: 'full',
      greeting: '실장님, 오늘의 현황입니다',
    },
  },

  executor: {
    id: 'executor',
    name: { ko: '실행자', en: 'Executor' },
    industry: { academy: '강사', generic: '담당자' },
    views: {
      allowed: ['cockpit', 'forecast', 'pulse', 'microscope', 'actions'],
      defaultView: 'actions',
      hiddenViews: ['map', 'funnel', 'network', 'crystal', 'timeline'],
    },
    dataScope: {
      type: 'assigned',
      filter: 'assignedTo:me',
      description: '담당 고객만 접근 가능',
    },
    permissions: {
      canCreateAction: true,
      canAssignAction: false,
      canViewAllCustomers: false,
      canViewCompetitors: false,
      canViewFinancials: false,
      canRunSimulation: false,
      canExportData: false,
      canViewNetwork: false,
    },
    ui: {
      navPosition: 'bottom',
      showRoleBadge: true,
      simplifiedMode: false,
      theme: 'full',
      greeting: '선생님, 오늘의 할 일입니다',
    },
  },

  supporter: {
    id: 'supporter',
    name: { ko: '지원자', en: 'Supporter' },
    industry: { academy: '상담사', generic: '어시스턴트' },
    views: {
      allowed: ['funnel', 'microscope', 'actions'],
      defaultView: 'funnel',
      hiddenViews: ['cockpit', 'forecast', 'pulse', 'map', 'network', 'crystal', 'timeline'],
    },
    dataScope: {
      type: 'leads',
      filter: 'stage:lead',
      description: '리드/문의 고객만 접근 가능',
    },
    permissions: {
      canCreateAction: true,
      canAssignAction: false,
      canViewAllCustomers: false,
      canViewCompetitors: false,
      canViewFinancials: false,
      canRunSimulation: false,
      canExportData: false,
      canViewNetwork: false,
    },
    ui: {
      navPosition: 'bottom',
      showRoleBadge: true,
      simplifiedMode: false,
      theme: 'full',
      greeting: '상담사님, 문의 현황입니다',
    },
  },

  payer: {
    id: 'payer',
    name: { ko: '결제자', en: 'Payer' },
    industry: { academy: '학부모', generic: '고객' },
    views: {
      allowed: ['microscope', 'timeline'],
      defaultView: 'microscope',
      hiddenViews: ['cockpit', 'forecast', 'pulse', 'map', 'funnel', 'network', 'crystal', 'actions'],
    },
    dataScope: {
      type: 'children',
      filter: 'parentOf:children',
      description: '자녀 정보만 접근 가능',
    },
    permissions: {
      canCreateAction: false,
      canAssignAction: false,
      canViewAllCustomers: false,
      canViewCompetitors: false,
      canViewFinancials: false,
      canRunSimulation: false,
      canExportData: false,
      canViewNetwork: false,
    },
    ui: {
      navPosition: 'bottom',
      showRoleBadge: false,
      simplifiedMode: true,
      theme: 'simplified',
      greeting: '학부모님, 자녀 현황입니다',
    },
  },

  receiver: {
    id: 'receiver',
    name: { ko: '수혜자', en: 'Receiver' },
    industry: { academy: '학생', generic: '사용자' },
    views: {
      allowed: ['microscope', 'timeline'],
      defaultView: 'microscope',
      hiddenViews: ['cockpit', 'forecast', 'pulse', 'map', 'funnel', 'network', 'crystal', 'actions'],
    },
    dataScope: {
      type: 'self',
      filter: 'userId:me',
      description: '본인 정보만 접근 가능',
    },
    permissions: {
      canCreateAction: false,
      canAssignAction: false,
      canViewAllCustomers: false,
      canViewCompetitors: false,
      canViewFinancials: false,
      canRunSimulation: false,
      canExportData: false,
      canViewNetwork: false,
    },
    ui: {
      navPosition: 'bottom',
      showRoleBadge: false,
      simplifiedMode: true,
      theme: 'minimal',
      greeting: '안녕하세요, 오늘의 학습 현황입니다',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────

export function getRoleConfig(roleId: RoleId): RoleConfig {
  return ROLE_CONFIGS[roleId] || ROLE_CONFIGS.receiver;
}

export function canAccessView(roleId: RoleId, viewId: string): boolean {
  const config = getRoleConfig(roleId);
  return config.views.allowed.includes(viewId);
}

export function hasPermission(roleId: RoleId, permission: keyof RoleConfig['permissions']): boolean {
  const config = getRoleConfig(roleId);
  return config.permissions[permission];
}

export function getDataFilter(roleId: RoleId, userId?: string): string | null {
  const config = getRoleConfig(roleId);
  if (!config.dataScope.filter) return null;
  return config.dataScope.filter.replace(':me', `:${userId || 'unknown'}`);
}

export function getRoleGreeting(roleId: RoleId): string {
  return getRoleConfig(roleId).ui.greeting;
}

export function getRoleDisplayName(roleId: RoleId, industry: 'academy' | 'generic' = 'academy'): string {
  const config = getRoleConfig(roleId);
  return config.industry[industry];
}

// ─────────────────────────────────────────────────────────────────────
// View Labels by Role (학부모/학생은 다른 라벨 사용)
// ─────────────────────────────────────────────────────────────────────

export const VIEW_LABELS_BY_ROLE: Record<RoleId, Partial<Record<string, string>>> = {
  owner: {},  // 기본 라벨 사용
  operator: {},
  executor: {},
  supporter: {},
  payer: {
    microscope: '자녀 현황',
    timeline: '성장 기록',
  },
  receiver: {
    microscope: '나의 현황',
    timeline: '나의 기록',
  },
};

export function getViewLabel(roleId: RoleId, viewId: string, defaultLabel: string): string {
  return VIEW_LABELS_BY_ROLE[roleId]?.[viewId] || defaultLabel;
}
