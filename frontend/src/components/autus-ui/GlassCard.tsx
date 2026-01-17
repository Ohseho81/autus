/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GlassCard - Imperial Glassmorphism 스타일 카드
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn, getKGlowColor } from '../../styles/autus-design-system';
import { springs } from '../../lib/animations/framer-presets';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'title'> {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  k?: number;  // K-지수에 따른 글로우
  variant?: 'default' | 'elevated' | 'sunken';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  noPadding?: boolean;
}

export function GlassCard({ 
  title, 
  subtitle, 
  children, 
  className = '', 
  k,
  variant = 'default',
  blur = 'xl',
  hoverable = true,
  noPadding = false,
  ...motionProps 
}: GlassCardProps) {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  };

  const variantClasses = {
    default: 'bg-white/[0.03]',
    elevated: 'bg-white/[0.05]',
    sunken: 'bg-black/[0.05]',
  };

  const glowColor = k !== undefined ? getKGlowColor(k) : undefined;

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-3xl',
        variantClasses[variant],
        blurClasses[blur],
        'backdrop-saturate-150',
        'border border-white/[0.08]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
        hoverable && 'hover:bg-white/[0.05] hover:border-white/[0.12] hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] transition-all duration-300',
        className
      )}
      style={glowColor ? {
        boxShadow: `0 0 60px ${glowColor}, 0 8px 32px rgba(0,0,0,0.12)`,
      } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverable ? { 
        scale: 1.01,
        boxShadow: glowColor 
          ? `0 0 80px ${glowColor}, 0 12px 40px rgba(0,0,0,0.16)`
          : undefined,
      } : undefined}
      transition={springs.gentle}
      {...motionProps}
    >
      {/* 상단 하이라이트 */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* 그라디언트 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none rounded-3xl" />
      
      {/* Content */}
      <div className={cn('relative', !noPadding && 'p-6')}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-white">{title}</h2>
              )}
              {subtitle && (
                <p className="text-sm text-white/50">{subtitle}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Children */}
        {children}
      </div>
    </motion.div>
  );
}

export default GlassCard;
