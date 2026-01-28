/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 역할 시스템 설정
 * 5대 역할 × 2대 엔진 구조
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 역할 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type RoleType = 'DECIDER' | 'OPERATOR' | 'EXECUTOR' | 'CONSUMER' | 'APPROVER';

export type StatusType = 'NORMAL' | 'ALERT' | 'CRITICAL';

export type EngineType = 'ENGINE_A' | 'ENGINE_B';

// ═══════════════════════════════════════════════════════════════════════════════
// 역할 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoleConfig {
  id: RoleType;
  name: string;
  nameKo: string;
  description: string;
  kLevel: string;        // K1~K7 매핑
  color: string;
  icon: string;
  // ENGINE A 설정
  engineA: {
    primaryUI: string;
    hiddenFeatures: string[];
  };
  // ENGINE B 설정
  engineB: {
    showPrediction: boolean;
    showConclusion: boolean;
    showWarning: boolean;
  };
  // K/I/r 기본값
  physics: {
    baseK: number;
    baseI: number;
    baseR: number;
  };
}

export const ROLE_CONFIGS: Record<RoleType, RoleConfig> = {
  DECIDER: {
    id: 'DECIDER',
    name: 'Decider',
    nameKo: '결정자',
    description: '결정만 한다. 과정·설계·자동화는 보이지 않는다.',
    kLevel: 'K5~K7',
    color: '#FFD700',  // Gold
    icon: '👑',
    engineA: {
      primaryUI: 'AssetStatusCard',
      hiddenFeatures: ['modules', 'generation_logic', 'user_type_detail'],
    },
    engineB: {
      showPrediction: false,
      showConclusion: true,
      showWarning: false,
    },
    physics: {
      baseK: 1.1,
      baseI: 0.1,
      baseR: -0.01,
    },
  },

  OPERATOR: {
    id: 'OPERATOR',
    name: 'Operator',
    nameKo: '운영자',
    description: '관리의 기준을 설명에서 증거로 바꾼다.',
    kLevel: 'K3~K5',
    color: '#00AAFF',  // Blue
    icon: '⚙️',
    engineA: {
      primaryUI: 'TaskRedefinitionMatrix',
      hiddenFeatures: ['execution_buttons', 'approval_buttons'],
    },
    engineB: {
      showPrediction: true,
      showConclusion: false,
      showWarning: false,
    },
    physics: {
      baseK: 1.0,
      baseI: 0.15,
      baseR: 0.0,
    },
  },

  EXECUTOR: {
    id: 'EXECUTOR',
    name: 'Executor',
    nameKo: '실행자',
    description: '생각하지 않게 한다. 다음 행동만 보여준다.',
    kLevel: 'K1~K2',
    color: '#00CC66',  // Green
    icon: '🔨',
    engineA: {
      primaryUI: 'NextActionCard',
      hiddenFeatures: ['user_type', 'redefinition_logic', 'asset_concept'],
    },
    engineB: {
      showPrediction: false,
      showConclusion: false,
      showWarning: true,
    },
    physics: {
      baseK: 0.8,
      baseI: 0.1,
      baseR: 0.02,
    },
  },

  CONSUMER: {
    id: 'CONSUMER',
    name: 'Consumer',
    nameKo: '소비자',
    description: '신뢰와 에너지를 공급받는다.',
    kLevel: 'External',
    color: '#9966FF',  // Purple
    icon: '🛒',
    engineA: {
      primaryUI: 'ProofViewer',
      hiddenFeatures: ['internal_data', 'prediction_info'],
    },
    engineB: {
      showPrediction: false,
      showConclusion: false,
      showWarning: false,
    },
    physics: {
      baseK: 0.9,
      baseI: 0.2,
      baseR: 0.01,
    },
  },

  APPROVER: {
    id: 'APPROVER',
    name: 'Approver',
    nameKo: '승인자',
    description: '책임 없는 승인을 가능하게 한다.',
    kLevel: 'K7+',
    color: '#FF6600',  // Orange
    icon: '✅',
    engineA: {
      primaryUI: 'ApprovalPackage',
      hiddenFeatures: ['recommendations', 'judgment_assist'],
    },
    engineB: {
      showPrediction: false,
      showConclusion: false,
      showWarning: false,
    },
    physics: {
      baseK: 1.2,
      baseI: 0.05,
      baseR: -0.02,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 상태 설정
// ═══════════════════════════════════════════════════════════════════════════════

export interface StatusConfig {
  id: StatusType;
  name: string;
  nameKo: string;
  color: string;
  bgColor: string;
}

export const STATUS_CONFIGS: Record<StatusType, StatusConfig> = {
  NORMAL: {
    id: 'NORMAL',
    name: 'Normal',
    nameKo: '정상',
    color: '#00CC66',
    bgColor: 'rgba(0, 204, 102, 0.1)',
  },
  ALERT: {
    id: 'ALERT',
    name: 'Alert',
    nameKo: '주의',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.1)',
  },
  CRITICAL: {
    id: 'CRITICAL',
    name: 'Critical',
    nameKo: '위험',
    color: '#FF4444',
    bgColor: 'rgba(255, 68, 68, 0.1)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

export function getRoleConfig(role: RoleType): RoleConfig {
  return ROLE_CONFIGS[role];
}

export function getStatusConfig(status: StatusType): StatusConfig {
  return STATUS_CONFIGS[status];
}

export function getRoleByKLevel(kLevel: number): RoleType {
  if (kLevel >= 7) return 'APPROVER';
  if (kLevel >= 5) return 'DECIDER';
  if (kLevel >= 3) return 'OPERATOR';
  if (kLevel >= 1) return 'EXECUTOR';
  return 'CONSUMER';
}

export function canSwitchRole(currentRole: RoleType, targetRole: RoleType): boolean {
  // MVP 단계: 모든 역할 전환 허용 (테스트/점검 용)
  // TODO: Production에서는 역할 계층 제한 적용
  return true;
  
  // Production용 역할 전환 권한 로직 (나중에 활성화)
  // const roleHierarchy: Record<RoleType, number> = {
  //   CONSUMER: 0,
  //   EXECUTOR: 1,
  //   OPERATOR: 2,
  //   DECIDER: 3,
  //   APPROVER: 4,
  // };
  // return roleHierarchy[targetRole] <= roleHierarchy[currentRole];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 역할별 권한
// ═══════════════════════════════════════════════════════════════════════════════

export interface RolePermissions {
  canApprove: boolean;
  canReject: boolean;
  canDelegate: boolean;
  canViewLogs: boolean;
  canViewPredictions: boolean;
  canModifyAutomation: boolean;
  canAccessAdmin: boolean;
}

export function getRolePermissions(role: RoleType): RolePermissions {
  const permissions: Record<RoleType, RolePermissions> = {
    DECIDER: {
      canApprove: true,
      canReject: true,
      canDelegate: true,
      canViewLogs: true,
      canViewPredictions: true,
      canModifyAutomation: false,
      canAccessAdmin: false,
    },
    OPERATOR: {
      canApprove: false,
      canReject: false,
      canDelegate: false,
      canViewLogs: true,
      canViewPredictions: true,
      canModifyAutomation: true,
      canAccessAdmin: false,
    },
    EXECUTOR: {
      canApprove: false,
      canReject: false,
      canDelegate: false,
      canViewLogs: false,
      canViewPredictions: false,
      canModifyAutomation: false,
      canAccessAdmin: false,
    },
    CONSUMER: {
      canApprove: false,
      canReject: false,
      canDelegate: false,
      canViewLogs: false,
      canViewPredictions: false,
      canModifyAutomation: false,
      canAccessAdmin: false,
    },
    APPROVER: {
      canApprove: true,
      canReject: true,
      canDelegate: true,
      canViewLogs: true,
      canViewPredictions: false,
      canModifyAutomation: false,
      canAccessAdmin: true,
    },
  };
  
  return permissions[role];
}
