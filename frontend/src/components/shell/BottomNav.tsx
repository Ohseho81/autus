/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS BottomNav - 하단 네비게이션
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { useRole } from './RoleShell';
import { getRolePermissions } from './role-config';

type NavItem = 'record' | 'proof' | 'help';

interface BottomNavProps {
  onItemClick?: (item: NavItem) => void;
}

export function BottomNav({ onItemClick }: BottomNavProps) {
  const { currentRole } = useRole();
  const permissions = getRolePermissions(currentRole);
  const [activeItem, setActiveItem] = useState<NavItem | null>(null);

  const navItems: Array<{
    id: NavItem;
    icon: string;
    label: string;
    requiredPermission?: keyof typeof permissions;
  }> = [
    { id: 'record', icon: 'ⓘ', label: '기록' },
    { id: 'proof', icon: '✓', label: '증명' },
    { id: 'help', icon: '?', label: '도움말' },
  ];

  const handleClick = (item: NavItem) => {
    setActiveItem(activeItem === item ? null : item);
    onItemClick?.(item);
  };

  return (
    <nav className="sticky bottom-0 z-40 bg-gray-900/90 backdrop-blur-md border-t border-gray-700/50">
      <div className="flex items-center justify-around py-3 px-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`
              flex flex-col items-center gap-1 px-6 py-2 rounded-xl
              transition-all duration-200
              ${activeItem === item.id 
                ? 'bg-white/10 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }
            `}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Expandable Panels */}
      {activeItem && (
        <BottomPanel 
          type={activeItem} 
          onClose={() => setActiveItem(null)} 
        />
      )}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bottom Panel
// ═══════════════════════════════════════════════════════════════════════════════

interface BottomPanelProps {
  type: NavItem;
  onClose: () => void;
}

function BottomPanel({ type, onClose }: BottomPanelProps) {
  const panelContent = {
    record: {
      title: '기록',
      content: '최근 활동 기록이 여기에 표시됩니다.',
    },
    proof: {
      title: '증명',
      content: '작업 증명 및 검증 내역입니다.',
    },
    help: {
      title: '도움말',
      content: '사용 방법 및 FAQ입니다.',
    },
  };

  const { title, content } = panelContent[type];

  return (
    <div className="absolute bottom-full left-0 right-0 bg-gray-800 border-t border-gray-700 rounded-t-2xl shadow-2xl animate-slide-up">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="text-gray-400 text-sm min-h-[100px]">
          {content}
        </div>
      </div>
    </div>
  );
}

export default BottomNav;
