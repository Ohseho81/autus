/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ✨ GlassCard - Awwwards 스타일 글래스모피즘 카드
 * 고급스러운 반투명 + 네온 글로우 + 마우스 추적 효과
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
  variant?: 'default' | 'highlight' | 'danger';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = '#14b8a6',
  onClick,
  variant = 'default',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const variantColors = {
    default: glowColor,
    highlight: '#10b981',
    danger: '#ef4444',
  };

  const color = variantColors[variant];

  const background = useMotionTemplate`
    radial-gradient(
      300px circle at ${mouseXSpring}px ${mouseYSpring}px,
      ${color}15,
      transparent 80%
    )
  `;

  return (
    <motion.div
      ref={ref}
      className={`
        relative overflow-hidden rounded-2xl
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onMouseMove={handleMouseMove}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={onClick ? { scale: 0.99 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(30, 41, 59, 0.8) 0%, 
            rgba(15, 23, 42, 0.9) 100%
          )
        `,
        boxShadow: isHovered
          ? `
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 40px ${color}20,
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `
          : `
            0 10px 30px -10px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
        border: `1px solid ${isHovered ? `${color}40` : 'rgba(255, 255, 255, 0.1)'}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* 마우스 추적 글로우 */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background }}
      />

      {/* 상단 하이라이트 */}
      <div 
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, ${isHovered ? 0.2 : 0.1}), 
            transparent
          )`,
        }}
      />

      {/* 컨텐츠 */}
      <div className="relative z-10">
        {children}
      </div>

      {/* 코너 악센트 */}
      <motion.div
        className="absolute top-0 right-0 w-20 h-20"
        style={{
          background: `radial-gradient(circle at 100% 0%, ${color}15, transparent 70%)`,
        }}
        animate={{ opacity: isHovered ? 1 : 0.5 }}
      />
    </motion.div>
  );
};

// 프리셋 카드들
export const HighlightCard: React.FC<Omit<GlassCardProps, 'variant'>> = (props) => (
  <GlassCard variant="highlight" {...props} />
);

export const DangerCard: React.FC<Omit<GlassCardProps, 'variant'>> = (props) => (
  <GlassCard variant="danger" {...props} />
);

export default GlassCard;
