/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Shell Components
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export { RoleShell, useRole } from './RoleShell';
export { RoleHeader } from './RoleHeader';
export { BottomNav } from './BottomNav';
export { StatusIndicator } from './StatusIndicator';
export { RoleRouter } from './RoleRouter';

export {
  type RoleType,
  type StatusType,
  type EngineType,
  type RoleConfig,
  type RolePermissions,
  ROLE_CONFIGS,
  STATUS_CONFIGS,
  getRoleConfig,
  getStatusConfig,
  getRoleByKLevel,
  canSwitchRole,
  getRolePermissions,
} from './role-config';

// Views
export * from './views';
