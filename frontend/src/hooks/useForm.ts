/**
 * AUTUS Form Hook
 * - 간단한 폼 상태 관리
 * - 유효성 검사
 * - react-hook-form 없이 사용 가능
 */

import { useState, useCallback, ChangeEvent, FormEvent } from 'react';

// 검증 규칙 타입
interface ValidationRule<T> {
  validate: (value: T, formData: Record<string, unknown>) => boolean;
  message: string;
}

interface ValidationRules<T> {
  required?: { value: boolean; message: string };
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  custom?: ValidationRule<T>[];
}

type FormRules<T extends Record<string, unknown>> = {
  [K in keyof T]?: ValidationRules<T[K]>;
};

interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  rules?: FormRules<T>;
  onSubmit?: (values: T) => void | Promise<void>;
}

interface UseFormReturn<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  
  // 핸들러
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (e?: FormEvent) => Promise<void>;
  
  // 유틸리티
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  setError: (name: keyof T, message: string) => void;
  clearError: (name: keyof T) => void;
  reset: (values?: Partial<T>) => void;
  validate: (name?: keyof T) => boolean;
  
  // 필드 프롭 생성
  getFieldProps: (name: keyof T) => {
    name: keyof T;
    value: T[keyof T];
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  };
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  rules = {},
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 단일 필드 검증
  const validateField = useCallback(
    (name: keyof T, value: T[keyof T]): string | undefined => {
      const fieldRules = rules[name];
      if (!fieldRules) return undefined;

      // required
      if (fieldRules.required?.value) {
        const isEmpty = value === undefined || value === null || value === '';
        if (isEmpty) return fieldRules.required.message;
      }

      // 문자열 검증
      if (typeof value === 'string') {
        if (fieldRules.minLength && value.length < fieldRules.minLength.value) {
          return fieldRules.minLength.message;
        }
        if (fieldRules.maxLength && value.length > fieldRules.maxLength.value) {
          return fieldRules.maxLength.message;
        }
        if (fieldRules.pattern && !fieldRules.pattern.value.test(value)) {
          return fieldRules.pattern.message;
        }
      }

      // 숫자 검증
      if (typeof value === 'number') {
        if (fieldRules.min && value < fieldRules.min.value) {
          return fieldRules.min.message;
        }
        if (fieldRules.max && value > fieldRules.max.value) {
          return fieldRules.max.message;
        }
      }

      // 커스텀 검증
      if (fieldRules.custom) {
        for (const rule of fieldRules.custom) {
          if (!rule.validate(value, values as Record<string, unknown>)) {
            return rule.message;
          }
        }
      }

      return undefined;
    },
    [rules, values]
  );

  // 전체 폼 검증
  const validate = useCallback(
    (name?: keyof T): boolean => {
      if (name) {
        const error = validateField(name, values[name]);
        setErrors((prev) => ({ ...prev, [name]: error }));
        return !error;
      }

      const newErrors: Partial<Record<keyof T, string>> = {};
      let isValid = true;

      for (const key of Object.keys(values) as (keyof T)[]) {
        const error = validateField(key, values[key]);
        if (error) {
          newErrors[key] = error;
          isValid = false;
        }
      }

      setErrors(newErrors);
      return isValid;
    },
    [validateField, values]
  );

  // 값 변경 핸들러
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const fieldName = name as keyof T;

      let parsedValue: unknown = value;
      if (type === 'number') {
        parsedValue = value === '' ? '' : Number(value);
      } else if (type === 'checkbox') {
        parsedValue = (e.target as HTMLInputElement).checked;
      }

      setValues((prev) => ({ ...prev, [fieldName]: parsedValue as T[keyof T] }));

      // 터치된 필드만 실시간 검증
      if (touched[fieldName]) {
        const error = validateField(fieldName, parsedValue as T[keyof T]);
        setErrors((prev) => ({ ...prev, [fieldName]: error }));
      }
    },
    [touched, validateField]
  );

  // 블러 핸들러
  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;
      const fieldName = name as keyof T;

      setTouched((prev) => ({ ...prev, [fieldName]: true }));

      const error = validateField(fieldName, values[fieldName]);
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    },
    [validateField, values]
  );

  // 제출 핸들러
  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();

      // 모든 필드 터치 처리
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof T, boolean>>
      );
      setTouched(allTouched);

      // 전체 검증
      const isValid = validate();
      if (!isValid) return;

      setIsSubmitting(true);
      try {
        await onSubmit?.(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit]
  );

  // 값 직접 설정
  const setValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // 에러 설정
  const setError = useCallback((name: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  // 에러 제거
  const clearError = useCallback((name: keyof T) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  // 폼 리셋
  const reset = useCallback(
    (newValues?: Partial<T>) => {
      setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
      setErrors({});
      setTouched({});
    },
    [initialValues]
  );

  // 필드 프롭 생성
  const getFieldProps = useCallback(
    (name: keyof T) => ({
      name,
      value: values[name],
      onChange: handleChange,
      onBlur: handleBlur,
      'aria-invalid': !!errors[name],
      'aria-describedby': errors[name] ? `${String(name)}-error` : undefined,
    }),
    [values, errors, handleChange, handleBlur]
  );

  // 유효성 상태
  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    setError,
    clearError,
    reset,
    validate,
    getFieldProps,
  };
}

// 이메일 검증 패턴
export const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// 전화번호 검증 패턴 (한국)
export const phonePattern = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;

// URL 검증 패턴
export const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

export default useForm;
