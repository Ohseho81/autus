/**
 * AUTUS Input 컴포넌트
 * - 접근성 완전 지원 (label 연결, 에러 메시지)
 * - 반응형
 * - 다양한 상태 표시
 */

import React, { forwardRef, InputHTMLAttributes, useId } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isRequired?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      leftIcon,
      rightIcon,
      isRequired,
      disabled,
      className,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm min-h-[36px]',
      md: 'px-4 py-2 text-base min-h-[44px]',
      lg: 'px-4 py-3 text-lg min-h-[52px]',
    };

    const iconPadding = {
      sm: leftIcon ? 'pl-9' : '',
      md: leftIcon ? 'pl-10' : '',
      lg: leftIcon ? 'pl-12' : '',
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className={clsx(
              'block mb-1.5 text-sm font-medium',
              error ? 'text-red-400' : 'text-slate-300 dark:text-slate-400'
            )}
          >
            {label}
            {isRequired && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span
              className={clsx(
                'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400',
                size === 'lg' && 'left-4'
              )}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
            }
            aria-required={isRequired}
            className={clsx(
              'w-full rounded-lg border transition-all duration-200',
              'bg-slate-800/50 dark:bg-slate-900/50',
              'text-white placeholder-slate-500',
              'focus:outline-none focus:ring-2',
              sizeStyles[size],
              iconPadding[size],
              rightIcon && 'pr-10',
              error
                ? 'border-red-500 focus:ring-red-500/50'
                : 'border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/50',
              disabled && 'opacity-50 cursor-not-allowed bg-slate-900',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-red-400 flex items-center gap-1"
            role="alert"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
