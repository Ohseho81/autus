// ============================================
// Test Utilities for AUTUS API
// Mock helpers for Supabase, NextRequest/NextResponse
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// Mock Supabase Client
// ============================================

export interface MockSupabaseClient {
  from: (table: string) => MockQueryBuilder;
  auth: {
    getUser: () => Promise<{ data: { user: MockUser | null }; error: Error | null }>;
  };
}

export interface MockQueryBuilder {
  select: (columns?: string) => MockQueryBuilder;
  insert: (data: unknown) => MockQueryBuilder;
  update: (data: unknown) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  neq: (column: string, value: unknown) => MockQueryBuilder;
  gt: (column: string, value: unknown) => MockQueryBuilder;
  lt: (column: string, value: unknown) => MockQueryBuilder;
  gte: (column: string, value: unknown) => MockQueryBuilder;
  lte: (column: string, value: unknown) => MockQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => MockQueryBuilder;
  limit: (count: number) => MockQueryBuilder;
  single: () => Promise<{ data: unknown; error: Error | null }>;
  then: (onfulfilled: (result: { data: unknown; error: Error | null }) => unknown) => Promise<unknown>;
}

export interface MockUser {
  id: string;
  email: string;
  role?: string;
}

export function createMockSupabaseClient(
  mockData: Record<string, unknown[]> = {},
  options: {
    shouldError?: boolean;
    errorMessage?: string;
    authUser?: MockUser | null;
  } = {}
): MockSupabaseClient {
  const { shouldError = false, errorMessage = 'Mock error', authUser = null } = options;

  let currentTable = '';
  let currentData: unknown[] = [];

  const mockQueryBuilder: MockQueryBuilder = {
    select: function(columns?: string) {
      currentData = mockData[currentTable] || [];
      return this;
    },
    insert: function(data: unknown) {
      if (!shouldError) {
        currentData = [data];
      }
      return this;
    },
    update: function(data: unknown) {
      if (!shouldError) {
        currentData = [data];
      }
      return this;
    },
    delete: function() {
      if (!shouldError) {
        currentData = [];
      }
      return this;
    },
    eq: function(column: string, value: unknown) {
      if (!shouldError) {
        currentData = currentData.filter((item: any) => item[column] === value);
      }
      return this;
    },
    neq: function(column: string, value: unknown) {
      if (!shouldError) {
        currentData = currentData.filter((item: any) => item[column] !== value);
      }
      return this;
    },
    gt: function(column: string, value: unknown) {
      if (!shouldError) {
        currentData = currentData.filter((item: any) => item[column] > value);
      }
      return this;
    },
    lt: function(column: string, value: unknown) {
      if (!shouldError) {
        currentData = currentData.filter((item: any) => item[column] < value);
      }
      return this;
    },
    gte: function(column: string, value: unknown) {
      if (!shouldError) {
        currentData = currentData.filter((item: any) => item[column] >= value);
      }
      return this;
    },
    lte: function(column: string, value: unknown) {
      if (!shouldError) {
        currentData = currentData.filter((item: any) => item[column] <= value);
      }
      return this;
    },
    order: function(column: string, options?: { ascending?: boolean }) {
      const ascending = options?.ascending ?? true;
      if (!shouldError) {
        currentData.sort((a: any, b: any) => {
          if (a[column] < b[column]) return ascending ? -1 : 1;
          if (a[column] > b[column]) return ascending ? 1 : -1;
          return 0;
        });
      }
      return this;
    },
    limit: function(count: number) {
      if (!shouldError) {
        currentData = currentData.slice(0, count);
      }
      return this;
    },
    single: async function() {
      if (shouldError) {
        return { data: null, error: new Error(errorMessage) };
      }
      return { data: currentData[0] || null, error: null };
    },
    then: async function(onfulfilled: (result: { data: unknown; error: Error | null }) => unknown) {
      const result = shouldError
        ? { data: null, error: new Error(errorMessage) }
        : { data: currentData, error: null };
      return onfulfilled(result);
    },
  };

  return {
    from: (table: string) => {
      currentTable = table;
      currentData = mockData[table] || [];
      return mockQueryBuilder;
    },
    auth: {
      getUser: async () => {
        if (shouldError) {
          return { data: { user: null }, error: new Error(errorMessage) };
        }
        return { data: { user: authUser }, error: null };
      },
    },
  };
}

// ============================================
// Mock NextRequest Helper
// ============================================

export function createMockNextRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body, searchParams = {} } = options;

  const baseUrl = url.includes('://') ? url : `http://localhost:3000${url}`;
  const urlObj = new URL(baseUrl);

  // Add search params
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), requestInit);
}

// ============================================
// Response Parser Helper
// ============================================

export async function parseNextResponse<T = unknown>(
  response: NextResponse
): Promise<{ status: number; data: T; headers: Record<string, string> }> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    data: data as T,
    headers,
  };
}

// ============================================
// Common Test Fixtures
// ============================================

export const MOCK_ORG_ID = 'test-org-123';
export const MOCK_USER_ID = 'test-user-456';

export const MOCK_USER: MockUser = {
  id: MOCK_USER_ID,
  email: 'test@example.com',
  role: 'admin',
};

export const MOCK_NODE = {
  node_id: 'node-1',
  org_id: MOCK_ORG_ID,
  name: 'Test Node',
  type: 'customer',
  layer: 0,
  x: 100,
  y: 100,
  v_index: 75.5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const MOCK_EDGE = {
  edge_id: 'edge-1',
  org_id: MOCK_ORG_ID,
  source: 'node-1',
  target: 'node-2',
  relation_type: 'positive',
  strength: 0.8,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const MOCK_EVENT = {
  event_id: 'event-1',
  org_id: MOCK_ORG_ID,
  node_id: 'node-1',
  event_type: 'motion',
  description: 'Test event',
  created_at: '2024-01-01T00:00:00Z',
};

// ============================================
// Environment Variable Mocking
// ============================================

export function mockEnvVars(vars: Record<string, string>): () => void {
  const original: Record<string, string | undefined> = {};

  Object.entries(vars).forEach(([key, value]) => {
    original[key] = process.env[key];
    process.env[key] = value;
  });

  // Return cleanup function
  return () => {
    Object.entries(original).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  };
}

// ============================================
// Mock Anthropic Client
// ============================================

export interface MockAnthropicClient {
  messages: {
    create: (params: unknown) => Promise<{ content: Array<{ text: string }> }>;
  };
}

export function createMockAnthropicClient(
  responseText: string = 'Mock AI response',
  shouldError: boolean = false
): MockAnthropicClient {
  return {
    messages: {
      create: async (params: unknown) => {
        if (shouldError) {
          throw new Error('Mock Anthropic error');
        }
        return {
          content: [{ text: responseText }],
        };
      },
    },
  };
}

// ============================================
// Time Mocking Helpers
// ============================================

export function mockDate(isoString: string): () => void {
  const realDate = Date;
  const mockDate = new Date(isoString);

  global.Date = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(mockDate.getTime());
      } else {
        super(...args);
      }
    }

    static now() {
      return mockDate.getTime();
    }
  } as any;

  // Return cleanup function
  return () => {
    global.Date = realDate;
  };
}
