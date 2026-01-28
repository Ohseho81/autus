/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ✨ GlassCard - 글래스모피즘 카드 (Cycle 5)
 * Awwwards 스타일 반투명 카드
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: string | null;
  onClick?: () => void;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = null,
  onClick,
  hover = true,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl
        ${hover ? 'transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: glow ? `0 0 30px ${glow}` : '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
