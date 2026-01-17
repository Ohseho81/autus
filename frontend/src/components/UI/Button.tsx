/**
 * AUTUS Button 컴포넌트
 * - 완전한 접근성 지원 (aria, keyboard)
 * - 반응형 크기
 * - 다양한 variant
 */

import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isFullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98]
    `;

    const variantStyles = {
      primary: `
        bg-cyan-600 hover:bg-cyan-700 text-white
        focus:ring-cyan-500
        dark:bg-cyan-500 dark:hover:bg-cyan-600
      `,
      secondary: `
        bg-slate-700 hover:bg-slate-600 text-white
        focus:ring-slate-500
        dark:bg-slate-600 dark:hover:bg-slate-500
      `,
      ghost: `
        bg-transparent hover:bg-white/10 text-slate-300
        focus:ring-white/50
        dark:hover:bg-white/5
      `,
      danger: `
        bg-red-600 hover:bg-red-700 text-white
        focus:ring-red-500
      `,
      success: `
        bg-green-600 hover:bg-green-700 text-white
        focus:ring-green-500
      `,
    };

    const sizeStyles = {
      xs: 'px-2 py-1 text-xs gap-1 min-h-[28px]',
      sm: 'px-3 py-1.5 text-sm gap-1.5 min-h-[32px]',
      md: 'px-4 py-2 text-sm gap-2 min-h-[40px]',
      lg: 'px-5 py-2.5 text-base gap-2 min-h-[44px]',
      xl: 'px-6 py-3 text-lg gap-2.5 min-h-[52px]',
    };

    // 반응형 터치 타겟 (44px 최소)
    const touchTarget = 'sm:min-h-[36px] min-h-[44px]';

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          touchTarget,
          isFullWidth && 'w-full',
          className
        )}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="sr-only">로딩 중...</span>
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
