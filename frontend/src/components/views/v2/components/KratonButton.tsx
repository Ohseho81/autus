/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🦎 KratonButton - Kraton이 생성한 버튼 컴포넌트
 * 그라데이션 + 애니메이션 + 로딩 상태 지원
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface KratonButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 shadow-lg shadow-emerald-500/20',
  secondary: 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
  ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export const KratonButton: React.FC<KratonButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  onClick,
  type = 'button',
}) => {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={isDisabled ? {} : { scale: 1.02 }}
      whileTap={isDisabled ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        rounded-lg font-medium transition-all duration-200 
        flex items-center justify-center
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      disabled={isDisabled}
    >
      {loading && (
        <Loader2 
          size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} 
          className="animate-spin" 
        />
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </motion.button>
  );
};

// 프리셋 버튼들
export const PrimaryButton: React.FC<Omit<KratonButtonProps, 'variant'>> = (props) => (
  <KratonButton variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<KratonButtonProps, 'variant'>> = (props) => (
  <KratonButton variant="secondary" {...props} />
);

export const DangerButton: React.FC<Omit<KratonButtonProps, 'variant'>> = (props) => (
  <KratonButton variant="danger" {...props} />
);

export const GhostButton: React.FC<Omit<KratonButtonProps, 'variant'>> = (props) => (
  <KratonButton variant="ghost" {...props} />
);

export default KratonButton;
