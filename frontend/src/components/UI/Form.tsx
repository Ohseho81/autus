/**
 * AUTUS Form 컴포넌트
 * - react-hook-form 통합
 * - 접근성 지원
 * - 에러 표시
 */

import React, { createContext, useContext, useId } from 'react';
import { clsx } from 'clsx';

// Form Field Context
interface FormFieldContextValue {
  id: string;
  name: string;
  error?: string;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export interface FormFieldProps {
  name: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  error,
  children,
  className,
}) => {
  const id = useId();

  return (
    <FormFieldContext.Provider value={{ id, name, error }}>
      <div className={clsx('space-y-1.5', className)}>{children}</div>
    </FormFieldContext.Provider>
  );
};

// Form Label
interface FormLabelProps {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  children,
  required,
  className,
}) => {
  const context = useContext(FormFieldContext);

  return (
    <label
      htmlFor={context?.id}
      className={clsx(
        'block text-sm font-medium',
        context?.error ? 'text-red-400' : 'text-slate-300',
        className
      )}
    >
      {children}
      {required && (
        <span className="text-red-500 ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
};

// Form Error
interface FormErrorProps {
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ className }) => {
  const context = useContext(FormFieldContext);

  if (!context?.error) return null;

  return (
    <p
      id={`${context.id}-error`}
      className={clsx('text-sm text-red-400 flex items-center gap-1', className)}
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
      {context.error}
    </p>
  );
};

// Form Description
interface FormDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const FormDescription: React.FC<FormDescriptionProps> = ({
  children,
  className,
}) => {
  const context = useContext(FormFieldContext);

  return (
    <p
      id={`${context?.id}-description`}
      className={clsx('text-sm text-slate-500', className)}
    >
      {children}
    </p>
  );
};

// Hook for form field context
export const useFormField = () => {
  const context = useContext(FormFieldContext);
  if (!context) {
    throw new Error('useFormField must be used within a FormField');
  }

  return {
    id: context.id,
    name: context.name,
    error: context.error,
    errorId: `${context.id}-error`,
    descriptionId: `${context.id}-description`,
    'aria-invalid': !!context.error,
    'aria-describedby': context.error ? `${context.id}-error` : undefined,
  };
};
