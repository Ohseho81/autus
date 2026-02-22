/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS RoleHeader - 역할 헤더
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useRole } from './RoleShell';
import { getRoleConfig } from './role-config';
import { StatusIndicator } from './StatusIndicator';

export function RoleHeader() {
  const { currentRole, status, setRoleSelectorOpen } = useRole();
  const roleConfig = getRoleConfig(currentRole);

  return (
    <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: roleConfig.color }}
          >
            A
          </div>
          <span className="font-semibold text-lg hidden sm:inline">온리쌤</span>
        </div>

        {/* Role Selector */}
        <button
          onClick={() => setRoleSelectorOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
        >
          <span className="text-lg">{roleConfig.icon}</span>
          <span className="font-medium">{roleConfig.nameKo}</span>
          <svg 
            className="w-4 h-4 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Status */}
        <StatusIndicator status={status} />
      </div>
    </header>
  );
}

export default RoleHeader;
