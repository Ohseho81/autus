/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧭 NavButton - 네비게이션 버튼
 * 하단 네비게이션 아이템
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { COLORS } from '../design-system';

interface NavButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export const NavButton: React.FC<NavButtonProps> = ({
  icon: Icon,
  label,
  active = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all
        ${active ? 'scale-105' : 'hover:bg-white/5'}
      `}
      style={{
        background: active ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
        color: active ? COLORS.safe.primary : COLORS.textMuted,
      }}
    >
      <Icon size={20} />
      <span className="text-xs">{label}</span>
    </button>
  );
};

export default NavButton;
