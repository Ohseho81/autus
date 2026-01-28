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
import QuickHelp from '../help/QuickHelp';

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

        {/* Quick Help Button */}
        <QuickHelp currentRole={currentRole} />

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

  // KRATON 명세서 기준 역할 매핑
  const roleMapping: Record<RoleType, { tier: string; label: string; features: string[] }> = {
    DECIDER: { 
      tier: 'C-Level', 
      label: '👑 Tier 1', 
      features: ['Monopoly 대시보드', '목표 설정', '자산 현황'] 
    },
    OPERATOR: { 
      tier: 'FSD', 
      label: '🎯 Tier 2', 
      features: ['Risk Queue', '이탈 알림', '업무 재정의'] 
    },
    EXECUTOR: { 
      tier: 'Optimus', 
      label: '⚡ Tier 3', 
      features: ['Quick Tag', '작업 실행', '자동 보고서'] 
    },
    CONSUMER: { 
      tier: 'Consumer', 
      label: '🛒 외부', 
      features: ['V-포인트', '품질 증명', '진행 현황'] 
    },
    APPROVER: { 
      tier: 'Regulatory', 
      label: '✅ 외부', 
      features: ['승인 패키지', '감사 로그'] 
    },
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MVP Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold">
            🧪 MVP 모드
          </span>
          <span className="text-xs text-slate-400">모든 역할 전환 가능</span>
        </div>

        <h2 className="text-xl font-bold mb-4 text-center">역할 선택</h2>
        
        <div className="space-y-3">
          {roles.map((role) => {
            const mapping = roleMapping[role.id];
            return (
              <button
                key={role.id}
                onClick={() => onSelect(role.id)}
                className={`
                  w-full p-4 rounded-xl text-left
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
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{role.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{role.nameKo}</span>
                      <span className="px-2 py-0.5 bg-slate-600 rounded text-xs">{mapping.tier}</span>
                    </div>
                    <div className="text-xs text-gray-400">{mapping.label} · {role.kLevel}</div>
                  </div>
                  {currentRole === role.id && (
                    <span className="text-green-400 text-xl">✓</span>
                  )}
                </div>
                {/* 기능 태그 */}
                <div className="flex flex-wrap gap-1 ml-9">
                  {mapping.features.map((feature, i) => (
                    <span 
                      key={i}
                      className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <a
            href="https://github.com/autus-ai/autus/blob/main/docs/USER_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 text-center bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
          >
            📖 사용자 가이드
          </a>
          <button
            onClick={onClose}
            className="flex-1 py-3 text-gray-400 hover:text-white transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleShell;
