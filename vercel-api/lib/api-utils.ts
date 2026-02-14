// ============================================
// AUTUS API Utilities
// 공통 API 응답 형식, CORS 헤더, 에러 처리
// ============================================

import { NextResponse } from 'next/server';
import { generateRequestId, captureError } from './monitoring';
import { logger } from './logger';

// ============================================
// 기본 조직 ID (환경변수로 설정 가능)
// ============================================
export const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || '';

// ============================================
// 표준 API 응답 타입
// ============================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

// ============================================
// CORS 헤더 (공통)
// ============================================
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

// ============================================
// 환경변수 검증
// ============================================
export interface EnvConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabaseAnonKey?: string;
  claudeApiKey?: string;
}

export function getEnvConfig(): EnvConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const claudeApiKey = process.env.ANTHROPIC_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Required environment variables not configured: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
    supabaseAnonKey,
    claudeApiKey,
  };
}

export function isEnvConfigured(): boolean {
  try {
    getEnvConfig();
    return true;
  } catch {
    return false;
  }
}

// ============================================
// 표준 응답 헬퍼 함수
// ============================================

/**
 * 성공 응답 생성
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200,
  requestId?: string
): NextResponse<ApiResponse<T>> {
  const reqId = requestId || generateRequestId();
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1.0',
        requestId: reqId,
      },
    },
    {
      status,
      headers: {
        ...CORS_HEADERS,
        'X-Request-ID': reqId,
      }
    }
  );
}

/**
 * 에러 응답 생성
 */
export function errorResponse(
  error: string,
  status: number = 400,
  data?: unknown,
  requestId?: string
): NextResponse<ApiResponse> {
  const reqId = requestId || generateRequestId();
  return NextResponse.json(
    {
      success: false,
      error,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1.0',
        requestId: reqId,
      },
    },
    {
      status,
      headers: {
        ...CORS_HEADERS,
        'X-Request-ID': reqId,
      }
    }
  );
}

/**
 * 서버 에러 응답 생성
 */
export function serverErrorResponse(
  error: unknown,
  context?: string,
  requestId?: string
): NextResponse<ApiResponse> {
  const reqId = requestId || generateRequestId();
  const errorMessage = error instanceof Error ? error.message : 'Internal server error';
  captureError(error instanceof Error ? error : new Error(String(error)), { context: `api-utils.serverErrorResponse${context ? ` - ${context}` : ''}` });

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1.0',
        requestId: reqId,
      },
    },
    {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'X-Request-ID': reqId,
      }
    }
  );
}

/**
 * OPTIONS 요청 핸들러 (CORS preflight)
 */
export function optionsResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * 인증 실패 응답
 */
export function unauthorizedResponse(
  message: string = 'Unauthorized',
  requestId?: string
): NextResponse<ApiResponse> {
  return errorResponse(message, 401, undefined, requestId);
}

/**
 * Not Found 응답
 */
export function notFoundResponse(
  resource: string = 'Resource',
  requestId?: string
): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found`, 404, undefined, requestId);
}

/**
 * 유효성 검사 실패 응답
 */
export function validationErrorResponse(
  errors: Record<string, string>,
  requestId?: string
): NextResponse<ApiResponse> {
  const reqId = requestId || generateRequestId();
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      data: { errors },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1.0',
        requestId: reqId,
      },
    },
    {
      status: 422,
      headers: {
        ...CORS_HEADERS,
        'X-Request-ID': reqId,
      }
    }
  );
}

// ============================================
// 요청 유효성 검사
// ============================================

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean;
  message?: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export function validateRequest(
  data: Record<string, unknown>,
  schema: ValidationSchema
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = rules.message || `${field} is required`;
      continue;
    }

    if (value === undefined || value === null) continue;

    // Type check
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors[field] = rules.message || `${field} must be a ${rules.type}`;
        continue;
      }
    }

    // Min/Max for numbers
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors[field] = rules.message || `${field} must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && value > rules.max) {
        errors[field] = rules.message || `${field} must be at most ${rules.max}`;
      }
    }

    // Min/Max for strings (length)
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.min !== undefined && value.length < rules.min) {
        errors[field] = rules.message || `${field} must be at least ${rules.min} characters`;
      }
      if (rules.max !== undefined && value.length > rules.max) {
        errors[field] = rules.message || `${field} must be at most ${rules.max} characters`;
      }
    }

    // Pattern check
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors[field] = rules.message || `${field} format is invalid`;
    }

    // Custom validation
    if (rules.custom && !rules.custom(value)) {
      errors[field] = rules.message || `${field} is invalid`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// Mock 데이터 생성 헬퍼
// ============================================
export function generateMockId(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================
// Rate Limiting (간단한 인메모리 구현)
// ============================================
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || record.resetTime < now) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

// ============================================
// 로깅 유틸리티
// ============================================
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(JSON.stringify(logEntry));
      }
      break;
    case 'info':
      console.info(JSON.stringify(logEntry));
      break;
    case 'warn':
      logger.warn(message, context);
      break;
    case 'error':
      logger.error(message, undefined, context);
      break;
  }
}

// ============================================
// Response Caching Helpers
// ============================================

/**
 * GET 응답에 Cache-Control 헤더 추가
 */
export function cachedResponse<T>(
  data: T,
  message?: string,
  options: { maxAge?: number; staleWhileRevalidate?: number; isPrivate?: boolean; requestId?: string } = {}
): NextResponse<ApiResponse<T>> {
  const { maxAge = 60, staleWhileRevalidate = 120, isPrivate = false, requestId } = options;
  const reqId = requestId || generateRequestId();
  const cacheControl = isPrivate
    ? `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    : `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;

  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1.0',
        requestId: reqId,
      },
    },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': cacheControl,
        'X-Request-ID': reqId,
      }
    }
  );
}

// ============================================
// Simple In-Memory Cache
// ============================================
const memoryCache = new Map<string, { data: unknown; expires: number }>();

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs: number = 60000): void {
  memoryCache.set(key, { data, expires: Date.now() + ttlMs });
  // Prevent unbounded growth
  if (memoryCache.size > 100) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
}
