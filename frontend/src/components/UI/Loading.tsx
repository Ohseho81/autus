/**
 * AUTUS Loading 컴포넌트
 * - 다양한 로딩 스타일
 * - 접근성 지원
 */

import React from 'react';
import { clsx } from 'clsx';

// Spinner 로딩
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'cyan' | 'white' | 'slate';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'cyan',
  className,
}) => {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-4',
  };

  const colorStyles = {
    cyan: 'border-cyan-500/30 border-t-cyan-500',
    white: 'border-white/30 border-t-white',
    slate: 'border-slate-500/30 border-t-slate-400',
  };

  return (
    <div
      className={clsx(
        'rounded-full animate-spin',
        sizeStyles[size],
        colorStyles[color],
        className
      )}
      role="status"
      aria-label="로딩 중"
    >
      <span className="sr-only">로딩 중...</span>
    </div>
  );
};

// Dots 로딩
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'white' | 'slate';
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  color = 'cyan',
  className,
}) => {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const colorStyles = {
    cyan: 'bg-cyan-500',
    white: 'bg-white',
    slate: 'bg-slate-400',
  };

  return (
    <div
      className={clsx('flex items-center gap-1', className)}
      role="status"
      aria-label="로딩 중"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={clsx(
            'rounded-full animate-bounce',
            dotSizes[size],
            colorStyles[color]
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
      <span className="sr-only">로딩 중...</span>
    </div>
  );
};

// Bar 로딩 (프로그레스 바 스타일)
interface LoadingBarProps {
  progress?: number; // 0-100, undefined = indeterminate
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'green' | 'amber';
  className?: string;
  showLabel?: boolean;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({
  progress,
  size = 'md',
  color = 'cyan',
  className,
  showLabel = false,
}) => {
  const isIndeterminate = progress === undefined;

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorStyles = {
    cyan: 'bg-cyan-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className={className}>
      <div
        className={clsx(
          'w-full bg-slate-700/50 rounded-full overflow-hidden',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={isIndeterminate ? '로딩 중' : `${progress}% 완료`}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            colorStyles[color],
            isIndeterminate && 'animate-indeterminate'
          )}
          style={{
            width: isIndeterminate ? '30%' : `${progress}%`,
          }}
        />
      </div>
      {showLabel && !isIndeterminate && (
        <p className="text-xs text-slate-400 mt-1 text-right">{progress}%</p>
      )}
    </div>
  );
};

// CSS for indeterminate animation (add to tailwind.config.js)
// @keyframes indeterminate {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(400%); }
// }

export default LoadingSpinner;
