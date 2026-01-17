/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS RoleDashboard - 역할 기반 통합 대시보드
 * 5대 역할 × 2대 엔진 UI 시스템
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { RoleShell, RoleRouter, RoleType } from '../components/shell';

interface RoleDashboardProps {
  initialRole?: RoleType;
  onRoleChange?: (role: RoleType) => void;
}

export function RoleDashboard({ 
  initialRole = 'EXECUTOR',
  onRoleChange,
}: RoleDashboardProps) {
  return (
    <RoleShell 
      initialRole={initialRole}
      onRoleChange={onRoleChange}
    >
      <RoleRouter />
    </RoleShell>
  );
}

export default RoleDashboard;
