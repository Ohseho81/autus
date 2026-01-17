/**
 * AUTUS Skeleton 로더 컴포넌트
 * - 다양한 형태 지원
 * - 접근성 (aria-busy, aria-label)
 * - 반응형
 */

import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  variant?: 'rectangular' | 'circular' | 'text';
  animation?: 'pulse' | 'wave' | 'none';
}

// 기본 Skeleton
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  variant = 'rectangular',
  animation = 'pulse',
  className,
  ...props
}) => {
  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%]',
    none: '',
  };

  const variantStyles = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded',
  };

  return (
    <div
      className={clsx(
        'bg-slate-700/60 dark:bg-slate-800/60',
        animationStyles[animation],
        variantStyles[variant],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-busy="true"
      aria-label="로딩 중"
      role="status"
      {...props}
    />
  );
};

// 텍스트 Skeleton (여러 줄)
interface SkeletonTextProps {
  lines?: number;
  spacing?: number;
  lastLineWidth?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  spacing = 8,
  lastLineWidth = '60%',
}) => (
  <div className="space-y-2" role="status" aria-label="텍스트 로딩 중">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height={16}
        width={i === lines - 1 ? lastLineWidth : '100%'}
        variant="text"
        style={{ marginTop: i > 0 ? spacing : 0 }}
      />
    ))}
  </div>
);

// 원형 Skeleton (아바타 등)
interface SkeletonCircleProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({ size = 'md' }) => {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  const pixelSize = typeof size === 'number' ? size : sizes[size];

  return <Skeleton width={pixelSize} height={pixelSize} variant="circular" />;
};

// 카드 Skeleton
interface SkeletonCardProps {
  hasImage?: boolean;
  hasTitle?: boolean;
  hasDescription?: boolean;
  hasFooter?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasImage = true,
  hasTitle = true,
  hasDescription = true,
  hasFooter = false,
}) => (
  <div
    className="bg-slate-800/50 dark:bg-slate-900/50 rounded-xl border border-slate-700/50 p-4 sm:p-5 space-y-4"
    role="status"
    aria-label="카드 로딩 중"
  >
    {hasImage && (
      <Skeleton height={160} className="w-full rounded-lg" />
    )}
    
    {hasTitle && (
      <Skeleton height={24} width="70%" />
    )}
    
    {hasDescription && (
      <SkeletonText lines={2} />
    )}
    
    {hasFooter && (
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <Skeleton width={80} height={32} />
        <Skeleton width={100} height={32} />
      </div>
    )}
  </div>
);

// 테이블 Skeleton
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
}) => (
  <div
    className="w-full overflow-hidden rounded-lg border border-slate-700/50"
    role="status"
    aria-label="테이블 로딩 중"
  >
    {/* Header */}
    <div className="bg-slate-800/80 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height={20} />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className="px-4 py-3 grid gap-4 border-t border-slate-700/30"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} height={16} />
        ))}
      </div>
    ))}
  </div>
);

// CSS for wave animation (add to tailwind.config.js or global CSS)
// @keyframes shimmer {
//   0% { background-position: -200% 0; }
//   100% { background-position: 200% 0; }
// }

export default Skeleton;
