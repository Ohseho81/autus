/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS RoleShell - 역할 기반 공통 쉘
 * 카드 1장 규칙 / 역할별 깊이 차등
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { RoleType, StatusType, getRoleConfig, getStatusConfig, ROLE_CONFIGS } from './role-config';
import { RoleHeader } from './RoleHeader';
import { BottomNav } from './BottomNav';
import { StatusIndicator } from './StatusIndicator';

// ═══════════════════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════════════════

interface RoleContextType {
  currentRole: RoleType;
  status: StatusType;
  setRole: (role: RoleType) => void;
  setStatus: (status: StatusType) => void;
  isRoleSelectorOpen: boolean;
  setRoleSelectorOpen: (open: boolean) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleShell');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════════════════

interface RoleShellProps {
  children: ReactNode;
  initialRole?: RoleType;
  initialStatus?: StatusType;
  onRoleChange?: (role: RoleType) => void;
  onStatusChange?: (status: StatusType) => void;
  showBottomNav?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export function RoleShell({
  children,
  initialRole = 'EXECUTOR',
  initialStatus = 'NORMAL',
  onRoleChange,
  onStatusChange,
  showBottomNav = true,
  className = '',
}: RoleShellProps) {
  const [currentRole, setCurrentRole] = useState<RoleType>(initialRole);
  const [status, setStatusState] = useState<StatusType>(initialStatus);
  const [isRoleSelectorOpen, setRoleSelectorOpen] = useState(false);

  const setRole = useCallback((role: RoleType) => {
    setCurrentRole(role);
    onRoleChange?.(role);
  }, [onRoleChange]);

  const setStatus = useCallback((newStatus: StatusType) => {
    setStatusState(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const roleConfig = getRoleConfig(currentRole);
  const statusConfig = getStatusConfig(status);

  return (
    <RoleContext.Provider 
      value={{ 
        currentRole, 
        status, 
        setRole, 
        setStatus,
        isRoleSelectorOpen,
        setRoleSelectorOpen,
      }}
    >
      <div 
        className={`
          role-shell min-h-screen flex flex-col
          bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
          text-white
          ${className}
        `}
        style={{
          '--role-color': roleConfig.color,
          '--status-color': statusConfig.color,
        } as React.CSSProperties}
      >
        {/* Header */}
        <RoleHeader />

        {/* Main Content - 카드 1장 */}
        <main className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="w-full max-w-lg">
            {children}
          </div>
        </main>

        {/* Bottom Navigation */}
        {showBottomNav && <BottomNav />}

        {/* Role Selector Modal */}
        {isRoleSelectorOpen && (
          <RoleSelectorModal
            currentRole={currentRole}
            onSelect={(role) => {
              setRole(role);
              setRoleSelectorOpen(false);
            }}
            onClose={() => setRoleSelectorOpen(false)}
          />
        )}
      </div>
    </RoleContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Role Selector Modal
// ═══════════════════════════════════════════════════════════════════════════════

interface RoleSelectorModalProps {
  currentRole: RoleType;
  onSelect: (role: RoleType) => void;
  onClose: () => void;
}

function RoleSelectorModal({ currentRole, onSelect, onClose }: RoleSelectorModalProps) {
  const roles = Object.values(ROLE_CONFIGS);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-center">역할 선택</h2>
        
        <div className="space-y-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelect(role.id)}
              className={`
                w-full p-4 rounded-xl flex items-center gap-4
                transition-all duration-200
                ${currentRole === role.id 
                  ? 'bg-white/10 border-2' 
                  : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700'
                }
              `}
              style={{
                borderColor: currentRole === role.id ? role.color : undefined,
              }}
            >
              <span className="text-2xl">{role.icon}</span>
              <div className="text-left flex-1">
                <div className="font-semibold">{role.nameKo}</div>
                <div className="text-sm text-gray-400">{role.kLevel}</div>
              </div>
              {currentRole === role.id && (
                <span className="text-green-400">✓</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

export default RoleShell;
