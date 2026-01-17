/**
 * AUTUS Card 컴포넌트
 * - 접근성 지원
 * - 반응형 패딩
 * - Glass morphism 스타일
 */

import React, { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  isInteractive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      isInteractive = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-slate-800/80 dark:bg-slate-900/80 border-slate-700/50',
      glass: 'bg-white/5 dark:bg-white/5 backdrop-blur-xl border-white/10',
      bordered: 'bg-transparent border-slate-600 dark:border-slate-700',
      elevated: 'bg-slate-800 dark:bg-slate-900 border-transparent shadow-xl shadow-black/20',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-5 md:p-6',
      lg: 'p-5 sm:p-6 md:p-8',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl border transition-all duration-200',
          variantStyles[variant],
          paddingStyles[padding],
          isInteractive && 'cursor-pointer hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10',
          className
        )}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header
export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('pb-4 border-b border-slate-700/50', className)}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

// Card Content
export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={clsx('py-4', className)} {...props} />
));

CardContent.displayName = 'CardContent';

// Card Footer
export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      'pt-4 border-t border-slate-700/50 flex items-center gap-3',
      className
    )}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';

export default Card;
