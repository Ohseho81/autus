/**
 * GlassCard.jsx
 * 네온 글래스모피즘 카드 컴포넌트 (GPU 최적화 버전)
 * 
 * 딥 다크 + 반투명 글래스 + 네온 테두리
 * CSS transform으로 GPU 가속 hover 효과
 */

import { memo, useMemo } from 'react';

const GLOW_COLORS = {
  default: 'rgba(139, 92, 246, 0.3)',
  purple: 'rgba(139, 92, 246, 0.4)',
  cyan: 'rgba(34, 211, 238, 0.4)',
  emerald: 'rgba(34, 197, 94, 0.4)',
  yellow: 'rgba(234, 179, 8, 0.4)',
  red: 'rgba(239, 68, 68, 0.4)',
  blue: 'rgba(59, 130, 246, 0.4)',
  pink: 'rgba(236, 72, 153, 0.4)',
};

const BORDER_COLORS = {
  default: 'rgba(255, 255, 255, 0.1)',
  purple: 'rgba(139, 92, 246, 0.3)',
  cyan: 'rgba(34, 211, 238, 0.3)',
  emerald: 'rgba(34, 197, 94, 0.3)',
  yellow: 'rgba(234, 179, 8, 0.3)',
  red: 'rgba(239, 68, 68, 0.3)',
  blue: 'rgba(59, 130, 246, 0.3)',
  pink: 'rgba(236, 72, 153, 0.3)',
};

// CSS 클래스 생성 (동적 스타일 최소화)
const getHoverClass = (hoverable) => hoverable 
  ? 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer' 
  : '';

const GlassCard = memo(function GlassCard({
  children,
  className = '',
  glowColor = 'default',
  hoverable = false,
  shimmer = false,
  onClick,
  ...props
}) {
  const glow = GLOW_COLORS[glowColor] || GLOW_COLORS.default;
  const border = BORDER_COLORS[glowColor] || BORDER_COLORS.default;

  // 스타일 메모이제이션
  const cardStyle = useMemo(() => ({
    borderColor: border,
    '--glow-color': glow,
    willChange: hoverable ? 'transform, box-shadow' : 'auto',
  }), [border, glow, hoverable]);

  const gradientStyle = useMemo(() => ({
    background: `radial-gradient(ellipse at top left, ${glow} 0%, transparent 50%)`,
  }), [glow]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        bg-gray-900/60 backdrop-blur-xl
        border border-white/10
        transition-all duration-200 ease-out
        ${getHoverClass(hoverable)}
        ${hoverable ? 'hover:shadow-[0_0_30px_var(--glow-color)]' : ''}
        ${className}
      `}
      style={cardStyle}
      onClick={onClick}
      {...props}
    >
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={gradientStyle}
      />

      {/* Shimmer effect - CSS 애니메이션으로 변경 */}
      {shimmer && (
        <div
          className="absolute inset-0 pointer-events-none shimmer-effect"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* CSS Shimmer Animation */}
      <style>{`
        .shimmer-effect {
          animation: shimmer 5s ease-in-out infinite;
          transform: translateX(-100%);
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          20% { transform: translateX(200%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
});

export default GlassCard;

/**
 * GlassButton - 글래스모피즘 버튼 (GPU 최적화)
 */
export const GlassButton = memo(function GlassButton({
  children,
  className = '',
  variant = 'default',
  size = 'default',
  glowColor = 'purple',
  ...props
}) {
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
  };

  const variants = {
    default: 'bg-gray-800/60',
    primary: 'bg-purple-600/30',
    success: 'bg-emerald-600/30',
    danger: 'bg-red-600/30',
  };

  const glow = GLOW_COLORS[glowColor] || GLOW_COLORS.default;

  return (
    <button
      className={`
        relative overflow-hidden rounded-lg
        ${variants[variant]} backdrop-blur-sm
        border border-white/10
        font-medium
        ${sizes[size]}
        transition-all duration-200 ease-out
        hover:scale-[1.02] active:scale-[0.98]
        ${className}
      `}
      style={{
        '--glow-color': glow,
        willChange: 'transform',
      }}
      {...props}
    >
      {children}
    </button>
  );
});

/**
 * GlassInput - 글래스모피즘 입력 필드 (GPU 최적화)
 */
export const GlassInput = memo(function GlassInput({
  className = '',
  glowColor = 'cyan',
  ...props
}) {
  const glow = GLOW_COLORS[glowColor] || GLOW_COLORS.default;
  const border = BORDER_COLORS[glowColor] || BORDER_COLORS.default;

  return (
    <input
      className={`
        w-full px-4 py-3 rounded-lg
        bg-gray-900/60 backdrop-blur-sm
        border border-white/10
        text-white placeholder-gray-500
        focus:outline-none focus:border-opacity-50
        transition-all duration-200
        ${className}
      `}
      style={{
        '--focus-glow': glow,
        '--focus-border': border,
      }}
      {...props}
    />
  );
});
