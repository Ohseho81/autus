// ============================================
// API Utils Test Suite
// Tests for response helpers, validation, caching
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  optionsResponse,
  validateRequest,
  checkRateLimit,
  getCached,
  setCache,
  cachedResponse,
  CORS_HEADERS,
} from '@/lib/api-utils';
import { parseNextResponse } from './test-utils';

describe('API Utils - Response Helpers', () => {
  it('should create a success response with correct structure', async () => {
    const testData = { id: 1, name: 'Test' };
    const response = successResponse(testData, 'Success message');
    const parsed = await parseNextResponse(response);

    expect(parsed.status).toBe(200);
    expect(parsed.data.success).toBe(true);
    expect(parsed.data.data).toEqual(testData);
    expect(parsed.data.message).toBe('Success message');
    expect(parsed.data.meta).toBeDefined();
    expect(parsed.data.meta.timestamp).toBeDefined();
    expect(parsed.data.meta.version).toBe('v1.0');
  });

  it('should include CORS headers in success response', async () => {
    const response = successResponse({ test: true });
    const parsed = await parseNextResponse(response);

    expect(parsed.headers['access-control-allow-origin']).toBe('*');
    expect(parsed.headers['access-control-allow-methods']).toBeDefined();
  });

  it('should create an error response with correct structure', async () => {
    const response = errorResponse('Something went wrong', 400);
    const parsed = await parseNextResponse(response);

    expect(parsed.status).toBe(400);
    expect(parsed.data.success).toBe(false);
    expect(parsed.data.error).toBe('Something went wrong');
    expect(parsed.data.meta).toBeDefined();
  });

  it('should create a server error response', async () => {
    const error = new Error('Database connection failed');
    const response = serverErrorResponse(error, 'DB Context');
    const parsed = await parseNextResponse(response);

    expect(parsed.status).toBe(500);
    expect(parsed.data.success).toBe(false);
    expect(parsed.data.error).toBe('Database connection failed');
  });

  it('should handle non-Error objects in serverErrorResponse', async () => {
    const response = serverErrorResponse('String error');
    const parsed = await parseNextResponse(response);

    expect(parsed.status).toBe(500);
    expect(parsed.data.error).toBe('Internal server error');
  });

  it('should create an unauthorized response', async () => {
    const response = unauthorizedResponse('Invalid token');
    const parsed = await parseNextResponse(response);

    expect(parsed.status).toBe(401);
    expect(parsed.data.error).toBe('Invalid token');
  });

  it('should create a not found response', async () => {
    const response = notFoundResponse('User');
    const parsed = await parseNextResponse(response);

    expect(parsed.status).toBe(404);
    expect(parsed.data.error).toBe('User not found');
  });

  it('should create a validation error response', async () => {
    const errors = { email: 'Invalid email format', name: 'Name is required' };
    const response = validationErrorResponse(errors);
    const parsed = await parseNextResponse(response);

    expect(parsed.status).toBe(422);
    expect(parsed.data.error).toBe('Validation failed');
    expect(parsed.data.data.errors).toEqual(errors);
  });

  it('should create an OPTIONS response', async () => {
    const response = optionsResponse();

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('API Utils - Request Validation', () => {
  it('should validate required fields', () => {
    const data = { name: 'John' };
    const schema = {
      name: { required: true, type: 'string' as const },
      email: { required: true, type: 'string' as const },
    };

    const result = validateRequest(data, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('should validate field types', () => {
    const data = { age: 'not a number' };
    const schema = {
      age: { type: 'number' as const },
    };

    const result = validateRequest(data, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.age).toContain('must be a number');
  });

  it('should validate string min/max length', () => {
    const data = { password: '123' };
    const schema = {
      password: { type: 'string' as const, min: 8, max: 20 },
    };

    const result = validateRequest(data, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.password).toContain('at least 8 characters');
  });

  it('should validate number min/max values', () => {
    const data = { score: 150 };
    const schema = {
      score: { type: 'number' as const, min: 0, max: 100 },
    };

    const result = validateRequest(data, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.score).toContain('at most 100');
  });

  it('should validate pattern matching', () => {
    const data = { email: 'invalid-email' };
    const schema = {
      email: {
        type: 'string' as const,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
    };

    const result = validateRequest(data, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.email).toContain('format is invalid');
  });

  it('should validate with custom validator', () => {
    const data = { age: 15 };
    const schema = {
      age: {
        type: 'number' as const,
        custom: (value: unknown) => typeof value === 'number' && value >= 18,
        message: 'Must be 18 or older',
      },
    };

    const result = validateRequest(data, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.age).toBe('Must be 18 or older');
  });

  it('should pass validation with valid data', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
    };
    const schema = {
      name: { required: true, type: 'string' as const },
      email: { required: true, type: 'string' as const },
      age: { type: 'number' as const, min: 18 },
    };

    const result = validateRequest(data, schema);

    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it('should handle array type validation', () => {
    const data = { tags: ['one', 'two'] };
    const schema = {
      tags: { type: 'array' as const },
    };

    const result = validateRequest(data, schema);

    expect(result.valid).toBe(true);
  });

  it('should skip validation for undefined non-required fields', () => {
    const data = { name: 'John' };
    const schema = {
      name: { required: true, type: 'string' as const },
      nickname: { type: 'string' as const }, // Not required, not provided
    };

    const result = validateRequest(data, schema);

    expect(result.valid).toBe(true);
  });
});

describe('API Utils - Rate Limiting', () => {
  it('should allow requests within limit', () => {
    const identifier = 'test-user-1';
    const result = checkRateLimit(identifier, 10, 60000);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.resetTime).toBeGreaterThan(Date.now());
  });

  it('should block requests over limit', () => {
    const identifier = 'test-user-2';
    const limit = 3;

    // Make requests up to limit
    for (let i = 0; i < limit; i++) {
      checkRateLimit(identifier, limit, 60000);
    }

    // Next request should be blocked
    const result = checkRateLimit(identifier, limit, 60000);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', () => {
    const identifier = 'test-user-3';
    const windowMs = 100; // Very short window for testing

    // Make a request
    checkRateLimit(identifier, 5, windowMs);

    // Wait for window to expire
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = checkRateLimit(identifier, 5, windowMs);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
        resolve(undefined);
      }, windowMs + 10);
    });
  });
});

describe('API Utils - Caching', () => {
  beforeEach(() => {
    // Clear any existing cache
    const key = 'test-key';
    getCached(key); // Just to ensure we're starting fresh
  });

  it('should cache and retrieve data', () => {
    const key = 'user-123';
    const data = { id: 123, name: 'Test User' };

    setCache(key, data, 5000);
    const cached = getCached<typeof data>(key);

    expect(cached).toEqual(data);
  });

  it('should return null for non-existent cache key', () => {
    const result = getCached('non-existent-key');
    expect(result).toBeNull();
  });

  it('should expire cached data after TTL', () => {
    const key = 'temp-data';
    const data = { temp: true };
    const ttl = 50; // 50ms

    setCache(key, data, ttl);

    return new Promise((resolve) => {
      setTimeout(() => {
        const cached = getCached(key);
        expect(cached).toBeNull();
        resolve(undefined);
      }, ttl + 10);
    });
  });

  it('should create cached response with proper headers', async () => {
    const data = { cached: true };
    const response = cachedResponse(data, 'Cached data', {
      maxAge: 120,
      staleWhileRevalidate: 240,
    });
    const parsed = await parseNextResponse(response);

    expect(parsed.data.data).toEqual(data);
    expect(parsed.headers['cache-control']).toContain('s-maxage=120');
    expect(parsed.headers['cache-control']).toContain('stale-while-revalidate=240');
  });

  it('should create private cached response', async () => {
    const response = cachedResponse({ test: true }, undefined, { isPrivate: true });
    const parsed = await parseNextResponse(response);

    expect(parsed.headers['cache-control']).toContain('private');
  });

  it('should create public cached response by default', async () => {
    const response = cachedResponse({ test: true });
    const parsed = await parseNextResponse(response);

    expect(parsed.headers['cache-control']).toContain('public');
    expect(parsed.headers['cache-control']).toContain('s-maxage');
  });
});

describe('API Utils - CORS Headers', () => {
  it('should have correct CORS headers defined', () => {
    expect(CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
    expect(CORS_HEADERS['Access-Control-Allow-Methods']).toContain('GET');
    expect(CORS_HEADERS['Access-Control-Allow-Methods']).toContain('POST');
    expect(CORS_HEADERS['Access-Control-Allow-Headers']).toContain('Content-Type');
    expect(CORS_HEADERS['Access-Control-Allow-Headers']).toContain('Authorization');
  });
});
